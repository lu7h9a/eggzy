import { MongoClient } from "mongodb";

const mongoUri = process.env.MONGODB_URI || "";
const mongoDbName = process.env.MONGODB_DB_NAME || "eggzy";

let mongoClientPromise = null;

async function getMongoDb() {
  if (!mongoUri) {
    return null;
  }

  if (!mongoClientPromise) {
    const client = new MongoClient(mongoUri);
    mongoClientPromise = client.connect();
  }

  const client = await mongoClientPromise;
  return client.db(mongoDbName);
}

export async function recordLearningEvent(payload) {
  const db = await getMongoDb();
  if (!db) {
    return null;
  }

  const now = new Date();
  const users = db.collection("users");
  const events = db.collection("learning_events");

  if (payload.user?.uid) {
    await users.updateOne(
      { uid: payload.user.uid },
      {
        $set: {
          email: payload.user.email || null,
          displayName: payload.user.name || payload.learnerName || null,
          lastSeenAt: now,
          lastLanguage: payload.language || null,
        },
        $setOnInsert: {
          createdAt: now,
        },
      },
      { upsert: true }
    );
  }

  const eventDocument = {
    uid: payload.user?.uid || null,
    email: payload.user?.email || null,
    learnerName: payload.learnerName || null,
    eventType: payload.eventType,
    topic: payload.topic,
    topicSlug: payload.topicSlug || null,
    generationMode: payload.generationMode || "lesson",
    lessonPhase: payload.lessonPhase || null,
    learnerLevel: payload.learnerLevel,
    mood: payload.mood,
    preferredStyle: payload.preferredStyle || null,
    interest: payload.interest || null,
    language: payload.language || "English",
    slowQuestions: payload.slowQuestions || [],
    wrongQuestions: payload.wrongQuestions || [],
    missedConcepts: payload.missedConcepts || [],
    confusionArea: payload.confusionArea || null,
    overlapScore: payload.overlapScore ?? null,
    quizScore: payload.quizScore ?? null,
    totalQuestions: payload.totalQuestions ?? null,
    learnerExplanation: payload.learnerExplanation || null,
    feedbackAction: payload.feedbackAction || null,
    notes: payload.notes || null,
    createdAt: now,
    updatedAt: now,
  };

  await events.insertOne(eventDocument);

  if (payload.user?.uid) {
    const struggledTopics = [
      ...(payload.slowQuestions?.length ? [payload.topic] : []),
      ...(payload.wrongQuestions?.length ? [payload.topic] : []),
      ...(payload.missedConcepts?.length ? [payload.topic] : []),
    ].filter(Boolean);

    await users.updateOne(
      { uid: payload.user.uid },
      {
        $set: {
          lastTopic: payload.topic || null,
          lastLessonPhase: payload.lessonPhase || null,
          updatedAt: now,
        },
        $addToSet: {
          struggledTopics: { $each: [...new Set(struggledTopics)] },
          slowQuestionPrompts: { $each: payload.slowQuestions || [] },
          wrongQuestionPrompts: { $each: payload.wrongQuestions || [] },
          teachBackHighlights: { $each: payload.missedConcepts || [] },
        },
      },
      { upsert: true }
    );
  }

  return eventDocument;
}


export async function getUserDashboard(uid) {
  const db = await getMongoDb();
  if (!db || !uid) {
    return null;
  }

  const users = db.collection("users");
  const events = db.collection("learning_events");
  const user = await users.findOne({ uid });
  const recentEvents = await events.find({ uid }).sort({ createdAt: -1 }).limit(12).toArray();

  const weakTopicMap = new Map();
  for (const event of recentEvents) {
    if (!event.topic) continue;
    const current = weakTopicMap.get(event.topic) || { topic: event.topic, slowCount: 0, wrongCount: 0, teachBackMisses: 0 };
    current.slowCount += event.slowQuestions?.length || 0;
    current.wrongCount += event.wrongQuestions?.length || 0;
    current.teachBackMisses += event.missedConcepts?.length || 0;
    weakTopicMap.set(event.topic, current);
  }

  return {
    profile: user ? {
      displayName: user.displayName || null,
      email: user.email || null,
      struggledTopics: user.struggledTopics || [],
      slowQuestionPrompts: user.slowQuestionPrompts || [],
      wrongQuestionPrompts: user.wrongQuestionPrompts || [],
      teachBackHighlights: user.teachBackHighlights || [],
      lastTopic: user.lastTopic || null,
    } : null,
    weakTopics: [...weakTopicMap.values()].sort((a, b) => (b.slowCount + b.wrongCount + b.teachBackMisses) - (a.slowCount + a.wrongCount + a.teachBackMisses)),
    recentEvents,
  };
}
