import { useEffect, useMemo, useRef, useState } from "react";

const LEVELS = [
  { id: "child", label: "Elementary", sublabel: "Ages 6-10", accent: "#B5935A", description: "Simple language, vivid analogies" },
  { id: "beginner", label: "Foundational", sublabel: "No prior knowledge", accent: "#3D7A6B", description: "Structured, jargon-free clarity" },
  { id: "expert", label: "Advanced", sublabel: "Domain expertise", accent: "#2C3E6B", description: "Technical depth and nuance" },
];

const MOODS = ["focused", "curious", "overwhelmed", "tired"];
const STYLES = ["analogy", "story", "technical", "simple"];

export default function App() {
  const [concept, setConcept] = useState("");
  const [topics, setTopics] = useState([]);
  const [activeLevel, setActiveLevel] = useState("beginner");
  const [learnerName, setLearnerName] = useState("");
  const [mood, setMood] = useState("focused");
  const [preferredStyle, setPreferredStyle] = useState("analogy");
  const [confusionPattern, setConfusionPattern] = useState("");
  const [previousBehavior, setPreviousBehavior] = useState("");
  const [lesson, setLesson] = useState(null);
  const [sessionId, setSessionId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [feedbackLoading, setFeedbackLoading] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const [understood, setUnderstood] = useState(true);
  const [learnerExplanation, setLearnerExplanation] = useState("");
  const [confusionArea, setConfusionArea] = useState("");
  const [error, setError] = useState("");
  const [inputFocused, setInputFocused] = useState(false);
  const inputRef = useRef(null);
  const resultsRef = useRef(null);

  useEffect(() => {
    void loadTopics();
  }, []);

  async function loadTopics() {
    try {
      const res = await fetch("/api/topics");
      const data = await res.json();
      setTopics(data.topics || []);
    } catch {
      setError("Unable to load the predefined learning topics.");
    }
  }

  async function handleExplain() {
    if (!concept.trim()) return;

    setError("");
    setFeedback(null);
    setLoading(true);

    const matchedTopic = topics.find((topic) => topic.title.toLowerCase() === concept.trim().toLowerCase());

    try {
      const res = await fetch("/api/explain", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topicSlug: matchedTopic?.slug,
          customTopic: matchedTopic ? "" : concept.trim(),
          learnerName,
          learnerLevel: activeLevel,
          mood,
          preferredStyle,
          confusionPattern,
          previousBehavior,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to generate lesson");

      setSessionId(data.sessionId);
      setLesson(data.lesson);
      setLearnerExplanation("");
      setConfusionArea("");
      setTimeout(() => resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 120);
    } catch (err) {
      setError(err.message || "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  async function handleFeedbackSubmit() {
    if (!sessionId) return;

    setFeedbackLoading(true);
    try {
      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId,
          understood,
          learnerExplanation,
          confusionArea,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Unable to save feedback");
      setFeedback(data);
    } catch (err) {
      setError(err.message || "Unable to save feedback.");
    } finally {
      setFeedbackLoading(false);
    }
  }

  const currentLevel = LEVELS.find((level) => level.id === activeLevel);
  const activeLevelText = useMemo(() => lesson?.levelExplanations?.[activeLevel] || "", [lesson, activeLevel]);

  return (
    <div style={{ minHeight: "100vh", background: "radial-gradient(circle at top left, rgba(181,147,90,0.18), transparent 28%), linear-gradient(180deg, #F6F3EE 0%, #F3EEE5 100%)", color: "#0F0F1A" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500&family=DM+Sans:opsz,wght@9..40,300;9..40,400;9..40,500;9..40,700&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: #F6F3EE; }
        button, input, textarea, select { font: inherit; }
        .chip { background: rgba(255,255,255,0.72); border: 1px solid #CEC9C2; border-radius: 999px; padding: 8px 14px; font-size: 12px; color: #5C574C; cursor: pointer; transition: all 0.18s; }
        .chip:hover { background: #EDE9E2; color: #0F0F1A; border-color: #A8A099; transform: translateY(-1px); }
        .tab-btn { background: none; border: none; cursor: pointer; text-align: left; padding: 18px 0; transition: all 0.2s; flex: 1; }
        .tab-btn:hover .tab-title { color: #0F0F1A !important; }
        .fade-up { animation: fadeUp 0.45s ease forwards; }
        @keyframes fadeUp { from{opacity:0;transform:translateY(10px);} to{opacity:1;transform:translateY(0);} }
        .card-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 18px; }
        @media (max-width: 920px) { .card-grid { grid-template-columns: 1fr; } }
        @media (max-width: 720px) {
          .hero-grid { grid-template-columns: 1fr !important; }
          .levels-grid { grid-template-columns: 1fr !important; }
          .top-row { flex-direction: column; align-items: flex-start !important; gap: 14px; }
          .panel { padding: 26px !important; }
          .responsive-stack { flex-direction: column; }
        }
      `}</style>

      <div style={{ maxWidth: "1180px", margin: "0 auto", padding: "44px 24px 100px", fontFamily: "'DM Sans', sans-serif" }}>
        <nav className="top-row" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "56px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div style={{ width: "28px", height: "28px", background: "#0F0F1A", borderRadius: "4px", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <span style={{ color: "#B5935A", fontSize: "15px", fontFamily: "'Cormorant Garamond', serif" }}>L</span>
            </div>
            <span style={{ fontSize: "12px", letterSpacing: "0.14em", textTransform: "uppercase", color: "#0F0F1A", fontWeight: 700 }}>
              Learn Your <span style={{ color: "#B5935A" }}>Way</span>
            </span>
          </div>
          <span style={{ fontSize: "11px", letterSpacing: "0.12em", textTransform: "uppercase", color: "#8E877B", fontWeight: 500 }}>Understanding Engine</span>
        </nav>

        <section className="hero-grid" style={{ display: "grid", gridTemplateColumns: "1.25fr 0.95fr", gap: "28px", marginBottom: "34px" }}>
          <div style={heroLeftCard}>
            <h1 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "clamp(46px, 6vw, 78px)", fontWeight: 300, lineHeight: 1.02, letterSpacing: "-0.03em", marginBottom: "18px" }}>
              We do not just answer.
              <br />
              <em style={{ color: "#B5935A" }}>We help you understand.</em>
            </h1>
            <p style={{ fontSize: "16px", color: "#6B655A", lineHeight: 1.8, maxWidth: "620px", fontWeight: 300 }}>
              Adaptive AI-powered learning platform that explains the same concept at multiple levels, tracks confusion patterns, checks understanding, and nudges the learner like a thoughtful teacher.
            </p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "10px", marginTop: "24px" }}>
              <span className="chip" style={{ cursor: "default" }}>15 seeded topics</span>
              <span className="chip" style={{ cursor: "default" }}>Layered explanations</span>
              <span className="chip" style={{ cursor: "default" }}>Reverse teaching</span>
              <span className="chip" style={{ cursor: "default" }}>Adaptive retries</span>
            </div>
          </div>

          <div style={heroRightCard}>
            <div>
              <div style={eyebrowDark}>What makes it different</div>
              <div style={{ display: "grid", gap: "14px" }}>
                {[
                  "Diagnoses learning gaps instead of only dumping information",
                  "Learns from user mood, style preference, and past confusion patterns",
                  "Ends each lesson with a teach-back loop and coaching response",
                ].map((item) => (
                  <div key={item} style={{ display: "flex", gap: "12px", alignItems: "flex-start" }}>
                    <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#B5935A", marginTop: "7px" }} />
                    <p style={{ color: "#DDD2C4", lineHeight: 1.65, fontSize: "14px" }}>{item}</p>
                  </div>
                ))}
              </div>
            </div>
            <div style={{ marginTop: "24px", paddingTop: "20px", borderTop: "1px solid rgba(255,255,255,0.12)" }}>
              <div style={{ color: "#F6F3EE", fontSize: "24px", fontFamily: "'Cormorant Garamond', serif" }}>“We learn how the learner learns.”</div>
            </div>
          </div>
        </section>

        <section style={sectionCard}>
          <div className="card-grid" style={{ marginBottom: "18px" }}>
            <Field label="Learner name"><input value={learnerName} onChange={(event) => setLearnerName(event.target.value)} placeholder="Optional" style={inputStyle} /></Field>
            <Field label="Current mental state">
              <select value={mood} onChange={(event) => setMood(event.target.value)} style={inputStyle}>
                {MOODS.map((option) => <option key={option} value={option}>{capitalize(option)}</option>)}
              </select>
            </Field>
            <Field label="Preferred explanation style">
              <select value={preferredStyle} onChange={(event) => setPreferredStyle(event.target.value)} style={inputStyle}>
                {STYLES.map((option) => <option key={option} value={option}>{capitalize(option)}</option>)}
              </select>
            </Field>
            <Field label="Known confusion pattern"><input value={confusionPattern} onChange={(event) => setConfusionPattern(event.target.value)} placeholder="Example: loses track during multi-step processes" style={inputStyle} /></Field>
          </div>
          <Field label="Previous learning behavior">
            <textarea value={previousBehavior} onChange={(event) => setPreviousBehavior(event.target.value)} placeholder="Example: understands analogies quickly but gets lost in formulas" rows={3} style={{ ...inputStyle, resize: "vertical" }} />
          </Field>
        </section>

        <section style={sectionCard}>
          <label style={labelStyle}>Choose a concept</label>
          <div style={{ display: "flex", border: `1px solid ${inputFocused ? "#0F0F1A" : "#CEC9C2"}`, borderRadius: "16px", background: "#FFFFFF", transition: "border-color 0.2s, box-shadow 0.2s", boxShadow: inputFocused ? "0 8px 24px rgba(15,15,26,0.09)" : "0 3px 10px rgba(15,15,26,0.04)" }}>
            <input
              ref={inputRef}
              value={concept}
              onChange={(event) => setConcept(event.target.value)}
              onKeyDown={(event) => event.key === "Enter" && void handleExplain()}
              onFocus={() => setInputFocused(true)}
              onBlur={() => setInputFocused(false)}
              placeholder="Pick one of the 15 predefined topics or type your own concept"
              style={{ ...inputStyle, flex: 1, border: "none", background: "transparent", padding: "17px 18px" }}
            />
            <button onClick={() => void handleExplain()} disabled={!concept.trim() || loading} style={{ padding: "0 26px", background: concept.trim() && !loading ? "#0F0F1A" : "#EDE9E2", color: concept.trim() && !loading ? "#F6F3EE" : "#A8A099", border: "none", borderRadius: "0 15px 15px 0", fontSize: "11px", letterSpacing: "0.12em", textTransform: "uppercase", fontWeight: 700, cursor: concept.trim() && !loading ? "pointer" : "not-allowed" }}>
              {loading ? "Generating..." : "Build lesson"}
            </button>
          </div>

          <div style={{ marginTop: "16px", display: "flex", flexWrap: "wrap", gap: "8px" }}>
            {topics.map((topic) => (
              <button key={topic.slug} className="chip" onClick={() => { setConcept(topic.title); inputRef.current?.focus(); }}>
                {topic.title}
              </button>
            ))}
          </div>
        </section>

        <section className="levels-grid" style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "18px", marginBottom: lesson ? "26px" : "36px" }}>
          {LEVELS.map((level) => (
            <button key={level.id} onClick={() => setActiveLevel(level.id)} style={{ background: activeLevel === level.id ? "#FFFFFF" : "rgba(255,255,255,0.58)", border: `1px solid ${activeLevel === level.id ? level.accent : "#DDD8D0"}`, borderRadius: "20px", padding: "24px", textAlign: "left", cursor: "pointer", boxShadow: activeLevel === level.id ? "0 10px 28px rgba(15,15,26,0.08)" : "none" }}>
              <div style={{ width: "34px", height: "3px", background: level.accent, marginBottom: "16px", borderRadius: "99px" }} />
              <div style={{ fontSize: "14px", fontWeight: 700, marginBottom: "4px" }}>{level.label}</div>
              <div style={{ fontSize: "11px", color: "#8B8476", marginBottom: "10px" }}>{level.sublabel}</div>
              <div style={{ fontSize: "13px", lineHeight: 1.6, color: "#5F594F" }}>{level.description}</div>
            </button>
          ))}
        </section>

        {error ? <div style={{ padding: "14px 18px", background: "#FDF0F0", border: "1px solid #E8C4C4", borderRadius: "14px", color: "#843A3A", fontSize: "13px", marginBottom: "24px" }}>{error}</div> : null}

        {lesson ? (
          <div ref={resultsRef} className="fade-up" style={{ display: "grid", gap: "26px" }}>
            <section style={mainLessonCard}>
              <div className="responsive-stack" style={{ display: "flex", justifyContent: "space-between", gap: "20px", marginBottom: "18px" }}>
                <div>
                  <div style={{ fontSize: "11px", letterSpacing: "0.14em", textTransform: "uppercase", color: currentLevel?.accent, fontWeight: 700, marginBottom: "8px" }}>{lesson.topic.title} · {currentLevel?.label}</div>
                  <h2 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "42px", fontWeight: 400, lineHeight: 1.02, marginBottom: "12px" }}>Personalized lesson path</h2>
                  <p style={{ maxWidth: "720px", fontSize: "15px", lineHeight: 1.8, color: "#5F594F" }}>{lesson.topic.shortSummary}</p>
                </div>
                <div style={snapshotCard}>
                  <div style={sectionEyebrowStyle}>Learner snapshot</div>
                  <MetaLine label="Level" value={capitalize(lesson.learnerSnapshot.level)} />
                  <MetaLine label="Mood" value={capitalize(lesson.learnerSnapshot.mood)} />
                  <MetaLine label="Style" value={capitalize(lesson.learnerSnapshot.preferredStyle)} />
                </div>
              </div>

              <div style={{ borderTop: "1px solid #EEE7DD", paddingTop: "22px", marginTop: "10px" }}>
                <div style={{ display: "flex", borderBottom: "1px solid #DDD8D0", gap: "28px" }}>
                  {LEVELS.map((level) => {
                    const isActive = activeLevel === level.id;
                    return (
                      <button key={level.id} className="tab-btn" onClick={() => setActiveLevel(level.id)} style={{ borderBottom: isActive ? `2px solid ${level.accent}` : "2px solid transparent", marginBottom: "-1px", paddingBottom: "16px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "9px" }}>
                          <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: isActive ? level.accent : "#CFC7BD" }} />
                          <div>
                            <div className="tab-title" style={{ fontSize: "13px", fontWeight: 700, color: isActive ? "#0F0F1A" : "#A8A099" }}>{level.label}</div>
                            <div style={{ fontSize: "10px", color: "#B8B2AA", marginTop: "2px" }}>{level.sublabel}</div>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>

                <div className="panel" style={{ marginTop: "24px", background: "#FDFCFA", border: "1px solid #E6E0D6", borderLeft: `4px solid ${currentLevel?.accent}`, borderRadius: "0 20px 20px 0", padding: "34px 38px" }}>
                  <div style={{ fontSize: "11px", letterSpacing: "0.14em", textTransform: "uppercase", color: currentLevel?.accent, marginBottom: "12px", fontWeight: 700 }}>Active explanation</div>
                  <p style={{ fontSize: "16px", lineHeight: 1.95, color: "#272634", whiteSpace: "pre-wrap" }}>{activeLevelText}</p>
                </div>
              </div>
            </section>

            <section className="card-grid">
              {lesson.stages.map((stage) => (
                <div key={stage.id} style={secondaryCardStyle}>
                  <div style={sectionEyebrowStyle}>{stage.title}</div>
                  <p style={{ color: "#514C42", lineHeight: 1.8, fontSize: "15px" }}>{stage.body}</p>
                </div>
              ))}
            </section>

            <section className="card-grid">
              <div style={secondaryCardStyle}>
                <div style={sectionEyebrowStyle}>Confusion hotspots</div>
                <div style={{ display: "grid", gap: "10px" }}>{lesson.confusionHotspots.map((item) => <div key={item} style={listItemStyle}>{item}</div>)}</div>
              </div>
              <div style={secondaryCardStyle}>
                <div style={sectionEyebrowStyle}>Adaptive coaching</div>
                <div style={{ display: "grid", gap: "10px" }}>{lesson.adaptiveTips.map((item) => <div key={item} style={listItemStyle}>{item}</div>)}</div>
              </div>
            </section>

            <section style={feedbackCard}>
              <div className="card-grid">
                <div>
                  <div style={eyebrowDark}>Did you understand?</div>
                  <div style={{ display: "grid", gap: "10px", marginBottom: "20px" }}>{lesson.checkInQuestions.map((question) => <div key={question} style={{ color: "#DDD2C4", lineHeight: 1.7, fontSize: "14px" }}>{question}</div>)}</div>
                  <div style={{ display: "flex", gap: "10px", marginBottom: "16px" }}>
                    <button onClick={() => setUnderstood(true)} style={toggleButtonStyle(understood)}>Yes, mostly</button>
                    <button onClick={() => setUnderstood(false)} style={toggleButtonStyle(!understood)}>Not yet</button>
                  </div>
                </div>

                <div>
                  <div style={eyebrowDark}>Reverse teach</div>
                  <textarea value={learnerExplanation} onChange={(event) => setLearnerExplanation(event.target.value)} rows={5} placeholder="Explain the topic back in your own words." style={{ ...darkInputStyle, resize: "vertical", marginBottom: "12px" }} />
                  <input value={confusionArea} onChange={(event) => setConfusionArea(event.target.value)} placeholder="Still confused about..." style={{ ...darkInputStyle, marginBottom: "14px" }} />
                  <button onClick={() => void handleFeedbackSubmit()} disabled={feedbackLoading} style={submitFeedbackStyle}>
                    {feedbackLoading ? "Checking understanding..." : "Evaluate understanding"}
                  </button>
                </div>
              </div>

              {feedback ? (
                <div style={{ marginTop: "24px", paddingTop: "20px", borderTop: "1px solid rgba(255,255,255,0.14)" }}>
                  <div style={eyebrowDark}>AI teacher response</div>
                  <p style={{ lineHeight: 1.8, color: "#F1EADC", marginBottom: "10px" }}>{feedback.coachingResponse}</p>
                  <div style={{ color: "#BFB5A5", fontSize: "13px" }}>Concept overlap score: {feedback.overlapScore}</div>
                </div>
              ) : null}
            </section>
          </div>
        ) : (
          <section style={sectionCard}>
            <div style={sectionEyebrowStyle}>Predefined topic library</div>
            <div className="card-grid">
              {topics.slice(0, 6).map((topic) => (
                <div key={topic.slug} style={{ background: "#FDFCFA", border: "1px solid #E6E0D6", borderRadius: "20px", padding: "20px" }}>
                  <div style={{ fontSize: "12px", color: "#A0927E", marginBottom: "8px", textTransform: "uppercase", letterSpacing: "0.12em", fontWeight: 700 }}>{topic.category}</div>
                  <div style={{ fontSize: "20px", fontFamily: "'Cormorant Garamond', serif", marginBottom: "8px" }}>{topic.title}</div>
                  <p style={{ color: "#5F594F", lineHeight: 1.7, fontSize: "14px" }}>{topic.shortSummary}</p>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <label style={{ display: "grid", gap: "9px" }}>
      <span style={labelStyle}>{label}</span>
      {children}
    </label>
  );
}

function MetaLine({ label, value }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", gap: "12px", fontSize: "13px", marginBottom: "8px", color: "#4F4A40" }}>
      <span>{label}</span>
      <span style={{ fontWeight: 700 }}>{value}</span>
    </div>
  );
}

function capitalize(value) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

const heroLeftCard = { background: "rgba(255,255,255,0.7)", border: "1px solid #DDD8D0", borderRadius: "24px", padding: "38px 34px", backdropFilter: "blur(6px)" };
const heroRightCard = { background: "#0F0F1A", color: "#F6F3EE", borderRadius: "24px", padding: "30px 28px", display: "flex", flexDirection: "column", justifyContent: "space-between" };
const sectionCard = { background: "rgba(255,255,255,0.8)", border: "1px solid #DDD8D0", borderRadius: "24px", padding: "28px", marginBottom: "30px" };
const mainLessonCard = { background: "#FFFFFF", border: "1px solid #E2DDD6", borderRadius: "24px", padding: "30px", boxShadow: "0 8px 28px rgba(15,15,26,0.06)" };
const snapshotCard = { minWidth: "200px", background: "#F8F5EF", border: "1px solid #E6E0D6", borderRadius: "18px", padding: "16px 18px" };
const feedbackCard = { background: "#0F0F1A", color: "#F6F3EE", borderRadius: "24px", padding: "30px" };
const labelStyle = { display: "block", fontSize: "10px", letterSpacing: "0.16em", textTransform: "uppercase", color: "#8F8679", fontWeight: 700 };
const eyebrowDark = { fontSize: "10px", textTransform: "uppercase", letterSpacing: "0.16em", color: "#B8AA96", marginBottom: "12px", fontWeight: 700 };
const inputStyle = { width: "100%", border: "1px solid #D8D1C7", borderRadius: "14px", padding: "14px 15px", fontSize: "14px", color: "#0F0F1A", background: "#FFFDFC", outline: "none" };
const darkInputStyle = { width: "100%", border: "1px solid rgba(255,255,255,0.18)", borderRadius: "14px", padding: "13px 14px", fontSize: "14px", color: "#F6F3EE", background: "rgba(255,255,255,0.05)", outline: "none" };
const secondaryCardStyle = { background: "rgba(255,255,255,0.82)", border: "1px solid #E2DDD6", borderRadius: "22px", padding: "24px" };
const sectionEyebrowStyle = { fontSize: "10px", textTransform: "uppercase", letterSpacing: "0.14em", color: "#A0927E", marginBottom: "14px", fontWeight: 700 };
const listItemStyle = { background: "#F8F5EF", border: "1px solid #EAE3D8", borderRadius: "14px", padding: "12px 14px", color: "#534E44", lineHeight: 1.6, fontSize: "14px" };
const submitFeedbackStyle = { border: "none", borderRadius: "999px", padding: "12px 18px", background: "#F6F3EE", color: "#0F0F1A", fontWeight: 700, cursor: "pointer" };

function toggleButtonStyle(active) {
  return {
    border: "1px solid rgba(255,255,255,0.18)",
    borderRadius: "999px",
    padding: "10px 14px",
    background: active ? "#B5935A" : "rgba(255,255,255,0.06)",
    color: "#F6F3EE",
    cursor: "pointer",
  };
}
