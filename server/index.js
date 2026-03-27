
import "dotenv/config";
import express from "express";
import cors from "cors";
import { createDatabase, getTopicBySlug, listTopics } from "./db.js";

const app = express();
const port = Number(process.env.PORT || 4000);
const db = createDatabase();
const geminiApiKey = process.env.GEMINI_API_KEY || "";
const geminiModel = process.env.GEMINI_MODEL || "gemini-2.0-flash";

app.use(cors());
app.use(express.json());

app.get("/api/health", (_req, res) => {
  res.json({ ok: true, seededTopics: listTopics(db).length, aiProvider: geminiApiKey ? "gemini" : "local" });
});

app.get("/api/topics", (_req, res) => {
  res.json({ topics: listTopics(db) });
});

app.get("/api/topics/:slug", (req, res) => {
  const topic = getTopicBySlug(db, req.params.slug);
  if (!topic) {
    return res.status(404).json({ error: "Topic not found" });
  }
  return res.json({ topic });
});

app.post("/api/explain", async (req, res) => {
  const {
    topicSlug,
    customTopic = "",
    learnerName = "",
    learnerLevel = "beginner",
    mood = "focused",
    preferredStyle = "analogy",
    interest = "",
    language = "English",
    confusionPattern = "",
    previousBehavior = "",
  } = req.body || {};

  const topic = topicSlug ? getTopicBySlug(db, topicSlug) : null;
  if (!topic && !customTopic.trim()) {
    return res.status(400).json({ error: "Provide a predefined topic or a custom topic." });
  }

  const learner = {
    learnerLevel,
    mood,
    preferredStyle,
    interest,
    language,
    confusionPattern,
    previousBehavior,
  };

  const learnerProfileId = upsertLearnerProfile(db, {
    learnerName,
    learnerLevel,
    mood,
    preferredStyle,
    confusionPattern,
    previousBehavior,
  });

  const lesson = await createLesson({
    topic,
    customTopic: customTopic.trim(),
    learner,
  });

  const sessionId = db.prepare(`
    INSERT INTO learning_sessions (
      learner_profile_id, topic_id, custom_topic, active_level, lesson_payload
    ) VALUES (?, ?, ?, ?, ?)
  `).run(
    learnerProfileId,
    topic?.id ?? null,
    customTopic.trim() || null,
    learnerLevel,
    JSON.stringify(lesson)
  ).lastInsertRowid;

  return res.json({
    sessionId,
    lesson,
  });
});

app.post("/api/feedback", (req, res) => {
  const { sessionId, understood = false, learnerExplanation = "", confusionArea = "" } = req.body || {};
  const session = db.prepare("SELECT * FROM learning_sessions WHERE id = ?").get(sessionId);

  if (!session) {
    return res.status(404).json({ error: "Learning session not found" });
  }

  const lesson = JSON.parse(session.lesson_payload);
  const comparisonText = `${lesson.topic.summary} ${lesson.topic.coreIdea} ${lesson.topic.howItWorks}`;
  const overlapScore = scoreExplanation(learnerExplanation, comparisonText);
  const coachingResponse = buildCoachingResponse({
    understood,
    learnerExplanation,
    confusionArea,
    overlapScore,
    lesson,
  });

  db.prepare(`
    INSERT INTO understanding_checks (
      session_id, understood, learner_explanation, confusion_area, overlap_score, coaching_response
    ) VALUES (?, ?, ?, ?, ?, ?)
  `).run(
    sessionId,
    understood ? 1 : 0,
    learnerExplanation.trim() || null,
    confusionArea.trim() || null,
    overlapScore,
    coachingResponse
  );

  return res.json({
    overlapScore,
    coachingResponse,
    nextAction: understood ? "advance" : "reteach",
  });
});

app.listen(port, () => {
  console.log(`Eggzy API running on http://localhost:${port}`);
});

function upsertLearnerProfile(
  dbInstance,
  { learnerName, learnerLevel, mood, preferredStyle, confusionPattern, previousBehavior }
) {
  return dbInstance.prepare(`
    INSERT INTO learner_profiles (
      name, knowledge_level, mood, preferred_style, confusion_pattern, previous_behavior
    ) VALUES (?, ?, ?, ?, ?, ?)
  `).run(
    learnerName.trim() || null,
    learnerLevel,
    mood,
    preferredStyle,
    confusionPattern.trim() || null,
    previousBehavior.trim() || null
  ).lastInsertRowid;
}

async function createLesson({ topic, customTopic, learner }) {
  if (geminiApiKey) {
    try {
      return await generateLessonWithGemini({ topic, customTopic, learner });
    } catch (error) {
      console.error("Gemini generation failed, using local lesson:", error);
    }
  }

  return topic ? buildAdaptiveLesson(topic, learner) : buildCustomLesson(customTopic, learner);
}

async function generateLessonWithGemini({ topic, customTopic, learner }) {
  const subject = topic?.title || customTopic;
  const moodTone = getMoodTone(learner.mood);
  const styleLens = getStyleLens(learner.preferredStyle);
  const levelGuide = getLevelGuide(learner.learnerLevel);

  const prompt = `
You are Eggzy, an adaptive AI teacher. Return only valid JSON.

Create a personalized lesson for "${subject}".

Learner profile:
- level: ${learner.learnerLevel}
- mood: ${learner.mood}
- preferred style: ${learner.preferredStyle}
- interest: ${learner.interest || "general"}
- language: ${learner.language || "English"}
- confusion pattern: ${learner.confusionPattern || "not provided"}
- previous behavior: ${learner.previousBehavior || "not provided"}

Lesson rules:
- Teach in the learner's chosen language.
- Use the learner's interest where useful.
- Sound like a patient teacher, not a chatbot.
- Include foundation, core idea, how it works, real-world example, and summary.
- Include learning modes for analogy, stepByStep, and realLife.
- Include level explanations for child, beginner, and expert.
- Include exactly 3 adaptive tips, 3 confusion hotspots, and 3 check-in questions.

Return JSON with this exact shape:
{
  "topic": {
    "slug": null,
    "title": "string",
    "category": "string",
    "shortSummary": "string",
    "foundation": "string",
    "coreIdea": "string",
    "howItWorks": "string",
    "realWorldExample": "string",
    "summary": "string"
  },
  "learnerSnapshot": {
    "level": "string",
    "mood": "string",
    "preferredStyle": "string",
    "interest": "string",
    "language": "string",
    "confusionPattern": "string",
    "previousBehavior": "string"
  },
  "stages": [
    { "id": "foundation", "title": "Foundation", "body": "string" },
    { "id": "core", "title": "Core Idea", "body": "string" },
    { "id": "how", "title": "How It Works", "body": "string" },
    { "id": "example", "title": "Real-World Example", "body": "string" },
    { "id": "summary", "title": "Summary", "body": "string" }
  ],
  "learningModes": {
    "analogy": "string",
    "stepByStep": "string",
    "realLife": "string"
  },
  "levelExplanations": {
    "child": "string",
    "beginner": "string",
    "expert": "string"
  },
  "adaptiveTips": ["string", "string", "string"],
  "confusionHotspots": ["string", "string", "string"],
  "checkInQuestions": ["string", "string", "string"]
}

Additional teaching context:
- mood tone: ${moodTone.encouragement}
- style lens: ${styleLens.coreFraming}
- level guide: ${levelGuide.foundationLead}
`.trim();

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${geminiModel}:generateContent?key=${geminiApiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.7,
          responseMimeType: "application/json",
        },
      }),
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Gemini API error ${response.status}: ${errorText}`);
  }

  const data = await response.json();
  const text = data?.candidates?.[0]?.content?.parts?.map((part) => part.text || "").join("").trim();
  if (!text) {
    throw new Error("Gemini returned no content.");
  }

  return normalizeLesson(JSON.parse(text), { topic, customTopic, learner });
}

function normalizeLesson(rawLesson, { topic, customTopic, learner }) {
  const subject = topic?.title || customTopic || "Custom topic";
  return {
    topic: {
      slug: topic?.slug || null,
      title: rawLesson?.topic?.title || subject,
      category: topic?.category || rawLesson?.topic?.category || "Custom",
      shortSummary: rawLesson?.topic?.shortSummary || topic?.shortSummary || `A guided Eggzy lesson for ${subject}.`,
      foundation: rawLesson?.topic?.foundation || `${subject} becomes easier once you define what it is and why it matters.`,
      coreIdea: rawLesson?.topic?.coreIdea || `${subject} is easier to understand when you identify its main purpose and parts.`,
      howItWorks: rawLesson?.topic?.howItWorks || `Follow ${subject} as a sequence from input to process to output.`,
      realWorldExample: rawLesson?.topic?.realWorldExample || `Think of ${subject} in a real-world example tied to ${learner.interest || "daily life"}.`,
      summary: rawLesson?.topic?.summary || `${subject} is easiest to remember as purpose, process, and example.`,
    },
    learnerSnapshot: {
      level: learner.learnerLevel,
      mood: learner.mood,
      preferredStyle: learner.preferredStyle,
      interest: learner.interest || "",
      language: learner.language || "English",
      confusionPattern: learner.confusionPattern || "",
      previousBehavior: learner.previousBehavior || "",
    },
    stages: normalizeStages(rawLesson?.stages, subject),
    learningModes: {
      analogy: rawLesson?.learningModes?.analogy || `Explain ${subject} with an analogy linked to ${learner.interest || "daily life"}.`,
      stepByStep: rawLesson?.learningModes?.stepByStep || `Break ${subject} into clear steps and teach each one in order.`,
      realLife: rawLesson?.learningModes?.realLife || `Show ${subject} through one practical, real-world example.`,
    },
    levelExplanations: {
      child: rawLesson?.levelExplanations?.child || `Explain ${subject} in simple words with one familiar example.`,
      beginner: rawLesson?.levelExplanations?.beginner || `Explain ${subject} from zero and build up step by step.`,
      expert: rawLesson?.levelExplanations?.expert || `Explain ${subject} with deeper technical nuance and assumptions.`,
    },
    adaptiveTips: ensureTextArray(rawLesson?.adaptiveTips, 3, "Pause after each stage and explain it back in one sentence."),
    confusionHotspots: ensureTextArray(rawLesson?.confusionHotspots, 3, `Learners often remember the name of ${subject} before they understand the mechanism.`),
    checkInQuestions: ensureTextArray(rawLesson?.checkInQuestions, 3, `What is the main job of ${subject}?`),
  };
}

function normalizeStages(stages, subject) {
  const defaults = [
    { id: "foundation", title: "Foundation", body: `${subject} starts making sense once we define what it is and why it matters.` },
    { id: "core", title: "Core Idea", body: `The core idea of ${subject} becomes clearer when you focus on the main purpose and parts.` },
    { id: "how", title: "How It Works", body: `Walk through ${subject} step by step, from beginning to outcome.` },
    { id: "example", title: "Real-World Example", body: `Anchor ${subject} to one practical scenario so the process feels real.` },
    { id: "summary", title: "Summary", body: `Remember ${subject} as purpose, process, and example.` },
  ];

  if (!Array.isArray(stages) || stages.length < 5) {
    return defaults;
  }

  return defaults.map((fallback, index) => ({
    id: fallback.id,
    title: fallback.title,
    body: stages[index]?.body || fallback.body,
  }));
}

function ensureTextArray(value, count, fallback) {
  const items = Array.isArray(value) ? value.filter((item) => typeof item === "string" && item.trim()) : [];
  while (items.length < count) {
    items.push(fallback);
  }
  return items.slice(0, count);
}

function buildAdaptiveLesson(topic, learner) {
  const tone = getMoodTone(learner.mood);
  const styleLens = getStyleLens(learner.preferredStyle);
  const levelGuide = getLevelGuide(learner.learnerLevel);

  return {
    topic: {
      slug: topic.slug,
      title: topic.title,
      category: topic.category,
      shortSummary: topic.shortSummary,
      foundation: topic.foundation,
      coreIdea: topic.coreIdea,
      howItWorks: topic.howItWorks,
      realWorldExample: topic.realWorldExample,
      summary: topic.summary,
    },
    learnerSnapshot: {
      level: learner.learnerLevel,
      mood: learner.mood,
      preferredStyle: learner.preferredStyle,
      interest: learner.interest,
      language: learner.language,
      confusionPattern: learner.confusionPattern,
      previousBehavior: learner.previousBehavior,
    },
    stages: [
      { id: "foundation", title: "Foundation", body: `${levelGuide.foundationLead} ${topic.foundation}` },
      {
        id: "core",
        title: "Core Idea",
        body: `${styleLens.coreFraming} ${topic.coreIdea}${learner.interest ? ` Connect it to ${learner.interest}.` : ""}`,
      },
      { id: "how", title: "How It Works", body: `${levelGuide.processHint} ${topic.howItWorks}` },
      { id: "example", title: "Real-World Example", body: `${styleLens.exampleLead} ${topic.realWorldExample}` },
      { id: "summary", title: "Summary", body: `${tone.memoryCue} ${topic.summary}` },
    ],
    learningModes: {
      analogy: `${styleLens.beginnerLead} ${topic.beginnerAnalogy || topic.childAnalogy} Tie it to ${learner.interest || "everyday life"} so it feels familiar.`,
      stepByStep: `${levelGuide.processHint} ${topic.howItWorks}`,
      realLife: `${styleLens.exampleLead} ${topic.realWorldExample}`,
    },
    levelExplanations: {
      child: `${tone.encouragement} ${topic.title} is easiest to picture this way: ${topic.childAnalogy} ${topic.foundation} ${topic.realWorldExample}`,
      beginner: `${styleLens.beginnerLead} ${topic.coreIdea} ${topic.beginnerAnalogy} ${topic.howItWorks}`,
      expert: `${levelGuide.expertLead} ${topic.coreIdea} ${topic.expertNuance} ${topic.howItWorks}`,
    },
    adaptiveTips: [
      tone.studyTip,
      styleLens.studyAdvice,
      learner.confusionPattern
        ? `Watch for this confusion pattern: ${learner.confusionPattern}. We should slow down at that point.`
        : "Pause after each stage and ask: what changed from the previous stage?",
    ],
    confusionHotspots: topic.commonConfusions,
    checkInQuestions: [
      `In one sentence, what is the main job of ${topic.title}?`,
      "Which part still feels unclear: the idea, the process, or the example?",
      topic.reversePrompt,
    ],
  };
}

function buildCustomLesson(customTopic, learner) {
  const subject = customTopic || "this topic";
  const tone = getMoodTone(learner.mood);
  const styleLens = getStyleLens(learner.preferredStyle);
  const levelGuide = getLevelGuide(learner.learnerLevel);

  return {
    topic: {
      slug: null,
      title: subject,
      category: "Custom",
      shortSummary: `A guided explanation for ${subject}.`,
      foundation: `${subject} becomes easier once we identify what problem it solves and what basic building blocks it depends on.`,
      coreIdea: `${subject} can be understood by defining its main purpose, its inputs, and the outcome it produces.`,
      howItWorks: `Start from the smallest unit of ${subject}, then connect the steps in sequence, then observe how the system behaves in a realistic situation.`,
      realWorldExample: `Imagine using ${subject} in a classroom, project, or daily-life scenario where the result becomes visible and measurable.`,
      summary: `${subject} is best learned by moving from purpose to process to application.`,
    },
    learnerSnapshot: {
      level: learner.learnerLevel,
      mood: learner.mood,
      preferredStyle: learner.preferredStyle,
      interest: learner.interest,
      language: learner.language,
      confusionPattern: learner.confusionPattern,
      previousBehavior: learner.previousBehavior,
    },
    stages: [
      { id: "foundation", title: "Foundation", body: `${levelGuide.foundationLead} ${subject} matters because it solves a specific problem.` },
      { id: "core", title: "Core Idea", body: `${styleLens.coreFraming} First define the goal, then define the parts, then define how the parts interact.` },
      { id: "how", title: "How It Works", body: `${levelGuide.processHint} Move through it in sequence: input, transformation, output.` },
      { id: "example", title: "Real-World Example", body: `${styleLens.exampleLead} Imagine a student using ${subject} to complete a task faster or understand something better.` },
      { id: "summary", title: "Summary", body: `${tone.memoryCue} Learn the purpose, walk through the steps, then test it with an example.` },
    ],
    learningModes: {
      analogy: `${styleLens.beginnerLead} Think of ${subject} through ${learner.interest || "a familiar daily-life analogy"}.`,
      stepByStep: `${levelGuide.processHint} Move through ${subject} as input, transformation, and output.`,
      realLife: `${styleLens.exampleLead} Put ${subject} into a practical situation connected to ${learner.interest || "daily life"}.`,
    },
    levelExplanations: {
      child: `${tone.encouragement} Think of ${subject} like a tool with a special job. First we learn what job it does, then we see the steps, then we try an example.`,
      beginner: `${styleLens.beginnerLead} To understand ${subject}, start with the problem it solves, then map the process from start to finish, and finally test it with one real situation.`,
      expert: `${levelGuide.expertLead} A robust explanation of ${subject} should identify system boundaries, mechanisms, dependencies, and failure modes.`,
    },
    adaptiveTips: [
      tone.studyTip,
      styleLens.studyAdvice,
      "Use the reverse-teach box to explain it back in your own words.",
    ],
    confusionHotspots: [
      "Defining the scope too vaguely",
      "Skipping the process and jumping to the result",
      "Not testing understanding with an example",
    ],
    checkInQuestions: [
      `What problem does ${subject} solve?`,
      `What are the main steps inside ${subject}?`,
      `Teach ${subject} back as if you were helping a classmate.`,
    ],
  };
}

function getMoodTone(mood) {
  const tones = {
    focused: {
      encouragement: "You are in a strong place to go deeper.",
      memoryCue: "Memory cue:",
      studyTip: "Stay with the exact mechanism instead of only the final answer.",
    },
    overwhelmed: {
      encouragement: "We will keep this gentle and one step at a time.",
      memoryCue: "Small takeaway:",
      studyTip: "Read one stage, pause, and paraphrase it before moving on.",
    },
    curious: {
      encouragement: "Let curiosity lead and connect each idea to a question.",
      memoryCue: "Interesting takeaway:",
      studyTip: "Ask what would happen if one part of the process changed.",
    },
    tired: {
      encouragement: "We will keep the explanation compact and low-friction.",
      memoryCue: "Quick takeaway:",
      studyTip: "Focus on the foundation and summary first, then revisit details.",
    },
  };

  return tones[mood] || tones.focused;
}

function getStyleLens(style) {
  const styles = {
    analogy: {
      coreFraming: "Here is the big idea through a mental picture.",
      exampleLead: "Picture it like this in daily life.",
      beginnerLead: "Using an analogy-first explanation:",
      studyAdvice: "If you get stuck, map each analogy part to the real concept.",
    },
    story: {
      coreFraming: "Think of the concept as a sequence with characters and roles.",
      exampleLead: "Now place it inside a short story-like situation.",
      beginnerLead: "Using a story-driven explanation:",
      studyAdvice: "Retell the process as a short story with cause and effect.",
    },
    technical: {
      coreFraming: "We will define the system precisely before simplifying it.",
      exampleLead: "Now anchor the abstraction in a practical use case.",
      beginnerLead: "Using a structure-first explanation:",
      studyAdvice: "List the components, then note what each one does.",
    },
    simple: {
      coreFraming: "Strip away extra detail and keep only the essential idea.",
      exampleLead: "Use one practical example to lock it in.",
      beginnerLead: "Using the simplest clear explanation:",
      studyAdvice: "Turn each stage into one short sentence in your own words.",
    },
  };

  return styles[style] || styles.analogy;
}

function getLevelGuide(level) {
  const levels = {
    child: {
      foundationLead: "Start from zero and use familiar words.",
      processHint: "Walk through the steps slowly and visibly.",
      expertLead: "Even at a high-detail level, keep the explanation intuitive first.",
    },
    beginner: {
      foundationLead: "Assume no background and define the basic pieces first.",
      processHint: "Follow the process in a clean step-by-step order.",
      expertLead: "Add precision while still connecting each detail to the learner's mental model.",
    },
    expert: {
      foundationLead: "Use the foundation to align terminology before adding nuance.",
      processHint: "Focus on the internal mechanism, dependencies, and edge cases.",
      expertLead: "Here is the deeper technical framing.",
    },
  };

  return levels[level] || levels.beginner;
}

function scoreExplanation(learnerText, referenceText) {
  const learnerTokens = tokenize(learnerText);
  const referenceTokens = new Set(tokenize(referenceText));
  if (!learnerTokens.length) {
    return 0;
  }

  let matches = 0;
  for (const token of learnerTokens) {
    if (referenceTokens.has(token)) {
      matches += 1;
    }
  }

  return Number((matches / learnerTokens.length).toFixed(2));
}

function buildCoachingResponse({ understood, learnerExplanation, confusionArea, overlapScore, lesson }) {
  if (understood && overlapScore >= 0.35) {
    return `Nice work. Your explanation captures key ideas from ${lesson.topic.title}. Next, try comparing the foundation stage to the How It Works stage and notice how the mechanism adds detail.`;
  }

  if (!learnerExplanation.trim()) {
    return `Let's retry with one small step. Start by answering only this: ${lesson.checkInQuestions[0]}`;
  }

  if (confusionArea.trim()) {
    return `The confusion seems centered on "${confusionArea}". Re-read the "${findRelevantStage(confusionArea, lesson)}" stage first, then explain it again using only two sentences.`;
  }

  return `You are close, but the explanation is still missing some anchor ideas. Focus on this memory-friendly line: ${lesson.topic.summary}`;
}

function findRelevantStage(confusionArea, lesson) {
  const lower = confusionArea.toLowerCase();
  const stage = lesson.stages.find((item) => item.body.toLowerCase().includes(lower) || item.title.toLowerCase().includes(lower));
  return stage ? stage.title : "Core Idea";
}

function tokenize(text) {
  return String(text)
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((token) => token.length > 2);
}

