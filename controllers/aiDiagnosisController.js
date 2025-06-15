// controllers/aiAnalysisController.js

const fetch = require("node-fetch");
const AiAnalysisReport = require("../models/AiAnalysisReport");
const catchAsync = require("../utils/catchAsync");

/**
 * @route   POST /api/ai/analyze
 * @desc    Analyze user symptoms with AI, store report, and return the result
 * @access  Private
 */
exports.analyzeSymptoms = catchAsync(async (req, res) => {
  const {
    userId,
    age,
    gender,
    height,
    weight,
    bmi,
    currentMedications = "",
    medicalHistory = "",
    symptoms,
    timestamp = new Date().toISOString(),
  } = req.body;

  // 1️⃣ Basic validation
  if (!userId || !age || !gender || !height || !weight || !symptoms) {
    return res.status(400).json({ error: "Required fields are missing." });
  }

  // 2️⃣ Build a “JSON-only” prompt
  const prompt = `
You are a highly advanced AI-powered clinical decision support assistant. You have access to comprehensive medical knowledge, evidence-based diagnostic criteria, and current clinical guidelines.

You will be given structured patient data. Your task is to generate a clinical reasoning-based output that includes a concise summary, a list of the most probable conditions (differential diagnoses), an urgency assessment, and recommended follow-up actions.

PATIENT DATA:
- Age: ${age}
- Gender: ${gender}
- Height: ${height} cm
- Weight: ${weight} kg
- BMI: ${bmi}
- Current Medications: ${currentMedications || "None"}
- Medical History: ${medicalHistory || "None"}
- Reported Symptoms: ${symptoms}

OUTPUT INSTRUCTIONS:
- Use only the information provided. Do NOT hallucinate, speculate, or assume missing data.
- Base all clinical assessments on real-world prevalence, pathophysiology, pharmacology, and presentation patterns.
- Output MUST be a single valid JSON object that conforms strictly to the following schema, with no additional text, markdown, or explanation.

REQUIRED JSON SCHEMA:

{
  "summary": string,                // A medically sound, one-sentence summary of the case
  "conditions": [                   // A ranked list (max 5) of most likely conditions
    {
      "name": string,               // Full clinical name of the condition
      "probability": string,        // Estimated probability (e.g., "65%")
      "specialist": string          // Most appropriate specialist to consult (e.g., "general practitioner", "neurologist", "infectious disease specialist")
    }
  ],
  "urgency": string,                // One of the following: "low", "moderate", "high" — based on potential clinical risk
  "recommendations": [string]       // Concrete next steps: diagnostics, imaging, specialist referral, or immediate interventions
}

The response must be optimized for clinical safety, interpretability, and actionability. You must not include any extra narrative, headers, or notes outside the JSON object.
`;

  // 3️⃣ Call AvalAI
  const aiRes = await fetch("https://api.avalai.ir/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.AVALAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: "gpt-4.1",
      messages: [
        { role: "system", content: "You are an AI that outputs JSON only." },
        { role: "user", content: prompt },
      ],
    }),
  });

  if (!aiRes.ok) {
    const errText = await aiRes.text();
    throw new Error(`AI API Error: ${aiRes.status} ${errText}`);
  }

  const aiData = await aiRes.json();
  const aiContent = aiData.choices[0].message.content.trim();

  // 4️⃣ Parse JSON
  let parsed;
  try {
    parsed = JSON.parse(aiContent);
  } catch (e) {
    throw new Error(
      `Unable to parse AI response as JSON. Response was:\n${aiContent}`
    );
  }

  // 5️⃣ Build aiResponse object
  const aiResponse = {
    summary: parsed.summary || "",
    conditions: parsed.conditions || [],
    doctorType: parsed.conditions?.map((c) => c.specialist) ?? [
      "general practitioner",
    ],
    urgencyLevel: parsed.urgency || "moderate",
    recommendations: parsed.recommendations || [],
    rawResponse: aiData,
  };

  // 6️⃣ Persist to database
  const newReport = await AiAnalysisReport.create({
    userId,
    age,
    gender,
    height,
    weight,
    bmi,
    currentMedications,
    medicalHistory,
    symptoms,
    timestamp,
    aiResponse,
  });

  // 7️⃣ Return response
  res.status(201).json({
    message: "AI analysis completed and report saved.",
    report: newReport,
  });
});

exports.getAnalysisReportById = catchAsync(async (req, res) => {
  const report = await AiAnalysisReport.findById(req.params.id);
  if (!report) {
    return res.status(404).json({ error: "گزارش پیدا نشد" });
  }
  res.json(report);
});

exports.getAllUserReports = catchAsync(async (req, res) => {
  const reports = await AiAnalysisReport.find({
    userId: req.user._id,
  }).sort({ createdAt: -1 });

  res.status(200).json(reports);
});

exports.updatePublishStatus = catchAsync(async (req, res, next) => {
  const { reportId, status, message } = req.body;

  if (!reportId || typeof status !== "boolean") {
    return res.status(400).json({
      message: "reportId and status (boolean) are required",
    });
  }

  const report = await AiAnalysisReport.findOneAndUpdate(
    { _id: reportId, userId: req.user._id },
    {
      AllowedPublish: {
        Status: status,
        Message: message || "", // اگر پیغام نبود، خالی بذار
      },
    },
    { new: true }
  );

  if (!report) {
    return res
      .status(404)
      .json({ message: "Report not found or access denied" });
  }

  res.status(200).json({
    message: `Report ${status ? "published" : "unpublished"} successfully.`,
    report,
  });
});
exports.getPublishedReportsWithUser = catchAsync(async (req, res, next) => {
  const reports = await AiAnalysisReport.find({ "AllowedPublish.Status": true })
    .populate("userId", "name email")
    .sort({ createdAt: -1 });

  res.status(200).json(reports);
});
