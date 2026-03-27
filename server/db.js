import fs from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import { seedTopics } from "./seedData.js";

const defaultDbPath = path.resolve("server", "data", "learn-your-way.db");

export function createDatabase(dbPath = process.env.DB_PATH || defaultDbPath) {
  const resolvedPath = path.resolve(dbPath);
  fs.mkdirSync(path.dirname(resolvedPath), { recursive: true });

  const db = new DatabaseSync(resolvedPath);
  db.exec("PRAGMA journal_mode = WAL;");

  db.exec(`
    CREATE TABLE IF NOT EXISTS topics (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      slug TEXT UNIQUE NOT NULL,
      title TEXT NOT NULL,
      category TEXT NOT NULL,
      difficulty TEXT NOT NULL,
      short_summary TEXT NOT NULL,
      foundation TEXT NOT NULL,
      core_idea TEXT NOT NULL,
      how_it_works TEXT NOT NULL,
      real_world_example TEXT NOT NULL,
      summary TEXT NOT NULL,
      child_analogy TEXT NOT NULL,
      beginner_analogy TEXT NOT NULL,
      expert_nuance TEXT NOT NULL,
      common_confusions TEXT NOT NULL,
      reverse_prompt TEXT NOT NULL,
      keywords TEXT NOT NULL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS learner_profiles (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT,
      knowledge_level TEXT NOT NULL,
      mood TEXT NOT NULL,
      preferred_style TEXT NOT NULL,
      confusion_pattern TEXT,
      previous_behavior TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS learning_sessions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      learner_profile_id INTEGER,
      topic_id INTEGER,
      custom_topic TEXT,
      active_level TEXT NOT NULL,
      lesson_payload TEXT NOT NULL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (learner_profile_id) REFERENCES learner_profiles(id),
      FOREIGN KEY (topic_id) REFERENCES topics(id)
    );

    CREATE TABLE IF NOT EXISTS understanding_checks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      session_id INTEGER NOT NULL,
      understood INTEGER NOT NULL,
      learner_explanation TEXT,
      confusion_area TEXT,
      overlap_score REAL,
      coaching_response TEXT NOT NULL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (session_id) REFERENCES learning_sessions(id)
    );
  `);

  seedDatabase(db);
  return db;
}

function seedDatabase(db) {
  const countRow = db.prepare("SELECT COUNT(*) AS count FROM topics").get();
  if (countRow?.count > 0) {
    return;
  }

  const insertTopic = db.prepare(`
    INSERT INTO topics (
      slug, title, category, difficulty, short_summary, foundation, core_idea,
      how_it_works, real_world_example, summary, child_analogy, beginner_analogy,
      expert_nuance, common_confusions, reverse_prompt, keywords
    ) VALUES (
      @slug, @title, @category, @difficulty, @shortSummary, @foundation, @coreIdea,
      @howItWorks, @realWorldExample, @summary, @childAnalogy, @beginnerAnalogy,
      @expertNuance, @commonConfusions, @reversePrompt, @keywords
    )
  `);

  for (const topic of seedTopics) {
    insertTopic.run({
      ...topic,
      commonConfusions: JSON.stringify(topic.commonConfusions),
      keywords: JSON.stringify(topic.keywords),
    });
  }
}

export function listTopics(db) {
  return db.prepare(`
    SELECT id, slug, title, category, difficulty, short_summary AS shortSummary
    FROM topics
    ORDER BY title
  `).all();
}

export function getTopicBySlug(db, slug) {
  const topic = db.prepare("SELECT * FROM topics WHERE slug = ?").get(slug);
  return topic ? hydrateTopic(topic) : null;
}

function hydrateTopic(topic) {
  return {
    ...topic,
    shortSummary: topic.short_summary,
    coreIdea: topic.core_idea,
    howItWorks: topic.how_it_works,
    realWorldExample: topic.real_world_example,
    childAnalogy: topic.child_analogy,
    beginnerAnalogy: topic.beginner_analogy,
    expertNuance: topic.expert_nuance,
    commonConfusions: JSON.parse(topic.common_confusions),
    reversePrompt: topic.reverse_prompt,
    keywords: JSON.parse(topic.keywords),
  };
}
