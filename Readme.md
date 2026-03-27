# Eggzy

Eggzy is an adaptive AI teacher designed to make sure learners actually understand a topic, not just receive an answer.

Unlike a normal chatbot, Eggzy changes how it teaches based on the learner's mood, interest, preferred explanation style, current level, and confusion pattern. The goal is simple:

**Hatch your understanding**

## About

Eggzy is built around the idea that understanding needs guidance, not just information.

The platform teaches a chosen topic by adapting to:

- current knowledge level
- mood or mental state
- learner interest, such as `cricket lover + confused`
- preferred explanation style
- previous learning behavior
- preferred language

Instead of giving one generic answer, Eggzy teaches in layers and checks whether the learner is actually following along.

## What makes Eggzy different

- ChatGPT answers questions. Eggzy teaches until the learner understands.
- ChatGPT waits for the next question. Eggzy adapts automatically when confusion is detected.
- Eggzy changes explanation depth based on learner level.
- Eggzy can re-explain the same topic using analogy, step-by-step logic, and real-life examples.
- Eggzy uses reverse teaching to test understanding.
- Eggzy creates a question bank from weak spots.
- Eggzy can run a quiz flow with hover-time confusion hints to simulate proctored understanding checks.

## Core features

- Mood-aware topic explanation
- Interest-based explanation framing
- Multi-level concept simplification
- Analogy version, step-by-step version, and real-life example version
- Reverse teaching
- Knowledge-gap detection
- Adaptive retries
- Learner profile memory
- Quiz mode with dual-time analytics concept
- Language-aware teaching flow

## How it works

1. The learner selects a topic, mood, language, and interest.
2. Eggzy generates a structured explanation path.
3. The topic is taught through:
   Foundation, core idea, how it works, real-world example, summary
4. The learner explains the topic back.
5. Eggzy analyzes the response and builds follow-up questions.
6. A quiz can then reinforce weak areas.

## Design direction

- Blackboard-inspired classroom interface
- Chalk-style typography for key headings
- Dark classroom theme with light-mode support
- Eggzy mascot designed as a teacher-style egg character

## Tech Stack

- Frontend: React, JSX, Vite, CSS-in-JS styling
- Backend: Node.js, Express, CORS, dotenv, Groq API or Gemini API (env-based integration)
- Database: SQLite using Node's built-in `node:sqlite`
- Build and tooling: Vite, `@vitejs/plugin-react`, concurrently
- Deployment: Netlify
- Config and formats: HTML, SQL, TOML, `.env`

## Project structure

- `src/App.jsx` - main frontend experience and UI logic
- `src/main.jsx` - React entry point
- `server/index.js` - Express API
- `server/db.js` - SQLite setup and persistence helpers
- `server/seedData.js` - predefined topic dataset
- `vite.config.js` - Vite configuration
- `netlify.toml` - Netlify deployment config

## Run locally

1. Install Node.js 18+
2. Copy `.env.example` to `.env` and add your Groq or Gemini API key if you want live AI lessons
3. Install dependencies
4. Start the project

```powershell
npm.cmd install
npm.cmd run dev
```

## Deployment

The frontend is configured for Netlify.

Note:

- Static frontend deployment works on Netlify
- The Express backend is separate and may need Netlify Functions or a dedicated backend host for full online API behavior

## One-line pitch

Eggzy is an AI teacher that adapts explanations, detects confusion, and makes sure the learner understands, not just receives an answer.



