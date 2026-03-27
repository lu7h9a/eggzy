import { useState, useRef } from "react";

const LEVELS = [
  {
    id: "child",
    label: "Elementary",
    sublabel: "Ages 6–10",
    accent: "#B5935A",
    description: "Simple language, vivid analogies",
  },
  {
    id: "beginner",
    label: "Foundational",
    sublabel: "No prior knowledge",
    accent: "#3D7A6B",
    description: "Structured, jargon-free clarity",
  },
  {
    id: "expert",
    label: "Advanced",
    sublabel: "Domain expertise",
    accent: "#2C3E6B",
    description: "Technical depth & nuance",
  },
];

const EXAMPLES = [
  "Quantum entanglement", "Blockchain", "Natural selection",
  "Machine learning", "Black holes", "Compound interest",
];

const SYSTEM_PROMPT = (level) => ({
  child: `You explain concepts to curious 7-year-olds. Use only simple everyday words, no jargon, one imaginative analogy involving something a child knows (toys, food, animals), write one short story or scenario around it, warm encouraging tone. Bold key words with **word**. Under 160 words. Hook then analogy then tiny story.`,
  beginner: `You explain concepts to adult beginners with zero background. Define every technical term, use real-world analogies from daily life, logical step-by-step flow, one concrete use-case example, friendly but informative. Bold key terms with **term**. Under 200 words. Core idea then analogy then example.`,
  expert: `You explain concepts to domain experts and advanced students. Use precise technical terminology, mechanistic depth, edge cases and limitations, connections to related fields or frameworks, reference models or equations in plain text. Bold key terms with **term**. Under 260 words. Mechanism then technical detail then nuances.`,
}[level]);

export default function ExplainLikeAI() {
  const [concept, setConcept] = useState("");
  const [activeLevel, setActiveLevel] = useState("beginner");
  const [explanations, setExplanations] = useState({});
  const [loading, setLoading] = useState({});
  const [hasGenerated, setHasGenerated] = useState(false);
  const [error, setError] = useState(null);
  const [inputFocused, setInputFocused] = useState(false);
  const inputRef = useRef(null);
  const resultsRef = useRef(null);

  const fetchExplanation = async (topic, level) => {
    setLoading((p) => ({ ...p, [level]: true }));
    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 1000,
          system: SYSTEM_PROMPT(level),
          messages: [{ role: "user", content: `Explain: "${topic}"` }],
        }),
      });
      const data = await res.json();
      const text = data.content?.map((b) => b.text || "").join("") || "";
      setExplanations((p) => ({ ...p, [level]: text }));
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading((p) => ({ ...p, [level]: false }));
    }
  };

  const handleExplain = async () => {
    if (!concept.trim()) return;
    setError(null);
    setExplanations({});
    setHasGenerated(true);
    await Promise.all(LEVELS.map((l) => fetchExplanation(concept.trim(), l.id)));
    setTimeout(() => resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 120);
  };

  const renderText = (text) =>
    text.split(/(\*\*[^*]+\*\*)/g).map((p, i) =>
      p.startsWith("**") && p.endsWith("**")
        ? <strong key={i} style={{ fontWeight: 600, color: "#0F0F1A" }}>{p.slice(2, -2)}</strong>
        : p
    );

  const isLoading = Object.values(loading).some(Boolean);
  const currentLevel = LEVELS.find((l) => l.id === activeLevel);
  const wordCount = explanations[activeLevel]?.split(/\s+/).filter(Boolean).length;

  return (
    <div style={{
      minHeight: "100vh",
      background: "#F6F3EE",
      color: "#0F0F1A",
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;1,300;1,400&family=DM+Sans:opsz,wght@9..40,300;9..40,400;9..40,500&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: #F6F3EE; }
        ::placeholder { color: #A8A099; font-family: 'DM Sans', sans-serif; }
        .chip { background: transparent; border: 1px solid #CECA C2; border-radius: 2px; padding: 5px 13px; font-size: 12px; color: #7A7468; cursor: pointer; font-family: 'DM Sans', sans-serif; letter-spacing: 0.02em; transition: all 0.18s; }
        .chip:hover { background: #EDE9E2; color: #0F0F1A; border-color: #A8A099; }
        .tab-btn { background: none; border: none; cursor: pointer; text-align: left; padding: 18px 0; font-family: 'DM Sans', sans-serif; transition: all 0.2s; flex: 1; }
        .tab-btn:hover .tab-title { color: #0F0F1A !important; }
        .pulse-dot { animation: pulseDot 1.4s ease-in-out infinite; }
        @keyframes pulseDot { 0%,100%{opacity:1;} 50%{opacity:0.3;} }
        .shimmer { animation: shimmer 1.8s ease-in-out infinite; }
        @keyframes shimmer { 0%,100%{opacity:0.25;} 50%{opacity:0.55;} }
        .fade-up { animation: fadeUp 0.45s ease forwards; }
        @keyframes fadeUp { from{opacity:0;transform:translateY(10px);} to{opacity:1;transform:translateY(0);} }
        @keyframes spin { to{transform:rotate(360deg);} }
      `}</style>

      <div style={{ maxWidth: "800px", margin: "0 auto", padding: "52px 28px 100px", fontFamily: "'DM Sans', sans-serif" }}>

        {/* Nav */}
        <nav style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "80px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div style={{
              width: "26px", height: "26px", background: "#0F0F1A", borderRadius: "3px",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <span style={{ color: "#B5935A", fontSize: "14px", fontFamily: "'Cormorant Garamond', serif", fontWeight: 400, lineHeight: 1 }}>E</span>
            </div>
            <span style={{ fontSize: "12px", letterSpacing: "0.14em", textTransform: "uppercase", color: "#0F0F1A", fontWeight: 500 }}>
              ExplainLike<span style={{ color: "#B5935A" }}>AI</span>
            </span>
          </div>
          <span style={{ fontSize: "11px", letterSpacing: "0.12em", textTransform: "uppercase", color: "#A8A099", fontWeight: 400 }}>
            Concept Simplifier
          </span>
        </nav>

        {/* Hero */}
        <div style={{ marginBottom: "64px" }}>
          <h1 style={{
            fontFamily: "'Cormorant Garamond', serif",
            fontSize: "clamp(48px, 7vw, 80px)",
            fontWeight: 300,
            lineHeight: 1.04,
            letterSpacing: "-0.025em",
            color: "#0F0F1A",
            marginBottom: "22px",
          }}>
            Every concept,<br />
            <em style={{ color: "#B5935A" }}>explained perfectly.</em>
          </h1>
          <p style={{ fontSize: "15px", color: "#7A7468", lineHeight: 1.75, maxWidth: "420px", fontWeight: 300 }}>
            Enter any topic. Receive three tailored explanations — crafted for a child, a newcomer, and an expert — simultaneously.
          </p>
        </div>

        {/* Divider */}
        <div style={{ height: "1px", background: "#DDD8D0", marginBottom: "44px" }} />

        {/* Input */}
        <div style={{ marginBottom: "52px" }}>
          <label style={{
            display: "block", fontSize: "10px", letterSpacing: "0.16em",
            textTransform: "uppercase", color: "#A8A099", marginBottom: "14px", fontWeight: 500,
          }}>
            Enter a concept
          </label>

          <div style={{
            display: "flex",
            border: `1px solid ${inputFocused ? "#0F0F1A" : "#CEC9C2"}`,
            borderRadius: "3px",
            background: "#FFFFFF",
            transition: "border-color 0.2s, box-shadow 0.2s",
            boxShadow: inputFocused ? "0 2px 16px rgba(15,15,26,0.07)" : "0 1px 4px rgba(15,15,26,0.04)",
          }}>
            <input
              ref={inputRef}
              value={concept}
              onChange={(e) => setConcept(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleExplain()}
              onFocus={() => setInputFocused(true)}
              onBlur={() => setInputFocused(false)}
              placeholder="e.g. Photosynthesis, Compound interest, DNA replication…"
              style={{
                flex: 1, border: "none", outline: "none",
                padding: "15px 20px", fontSize: "15px", color: "#0F0F1A",
                background: "transparent", fontFamily: "'DM Sans', sans-serif", fontWeight: 300,
              }}
            />
            <button
              onClick={handleExplain}
              disabled={!concept.trim() || isLoading}
              style={{
                padding: "15px 26px",
                background: concept.trim() && !isLoading ? "#0F0F1A" : "#EDE9E2",
                color: concept.trim() && !isLoading ? "#F6F3EE" : "#A8A099",
                border: "none", borderRadius: "0 2px 2px 0",
                fontSize: "11px", letterSpacing: "0.1em", textTransform: "uppercase",
                fontWeight: 500, cursor: concept.trim() && !isLoading ? "pointer" : "not-allowed",
                fontFamily: "'DM Sans', sans-serif", whiteSpace: "nowrap",
                transition: "all 0.2s",
              }}
            >
              {isLoading ? "Generating…" : "Explain →"}
            </button>
          </div>

          {/* Example chips */}
          <div style={{ marginTop: "14px", display: "flex", flexWrap: "wrap", gap: "7px", alignItems: "center" }}>
            <span style={{ fontSize: "10px", letterSpacing: "0.1em", textTransform: "uppercase", color: "#B8B2AA", marginRight: "2px" }}>Try</span>
            {EXAMPLES.map((ex) => (
              <button key={ex} className="chip" onClick={() => { setConcept(ex); inputRef.current?.focus(); }}>
                {ex}
              </button>
            ))}
          </div>
        </div>

        {error && (
          <div style={{
            padding: "13px 18px", background: "#FDF0F0", border: "1px solid #E8C4C4",
            borderRadius: "3px", color: "#843A3A", fontSize: "13px", marginBottom: "32px",
          }}>
            {error}
          </div>
        )}

        {/* Pre-use feature grid */}
        {!hasGenerated && (
          <div style={{
            display: "grid", gridTemplateColumns: "repeat(3, 1fr)",
            border: "1px solid #DDD8D0", borderRadius: "3px", overflow: "hidden",
          }}>
            {LEVELS.map((level, i) => (
              <div key={level.id} style={{
                padding: "28px 24px",
                background: "#FDFCFA",
                borderRight: i < 2 ? "1px solid #DDD8D0" : "none",
              }}>
                <div style={{ width: "28px", height: "2px", background: level.accent, marginBottom: "18px" }} />
                <div style={{ fontSize: "13px", fontWeight: 500, color: "#0F0F1A", marginBottom: "6px" }}>
                  {level.label}
                </div>
                <div style={{ fontSize: "11px", color: "#A8A099", lineHeight: 1.65 }}>
                  {level.description}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Results */}
        {hasGenerated && (
          <div ref={resultsRef} className="fade-up">
            <div style={{ height: "1px", background: "#DDD8D0", marginBottom: "40px" }} />

            {/* Level header */}
            <div style={{ marginBottom: "10px" }}>
              <div style={{ fontSize: "10px", letterSpacing: "0.16em", textTransform: "uppercase", color: "#A8A099", marginBottom: "20px", fontWeight: 500 }}>
                Comprehension Level
              </div>

              {/* Tab row */}
              <div style={{ display: "flex", borderBottom: "1px solid #DDD8D0", gap: "32px" }}>
                {LEVELS.map((level) => {
                  const isActive = activeLevel === level.id;
                  return (
                    <button
                      key={level.id}
                      className="tab-btn"
                      onClick={() => setActiveLevel(level.id)}
                      style={{
                        borderBottom: isActive ? `2px solid ${level.accent}` : "2px solid transparent",
                        marginBottom: "-1px",
                        paddingBottom: "16px",
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: "9px" }}>
                        {loading[level.id] ? (
                          <div style={{
                            width: "7px", height: "7px", borderRadius: "50%",
                            border: `1.5px solid ${level.accent}`, borderTopColor: "transparent",
                            animation: "spin 0.7s linear infinite",
                          }} />
                        ) : (
                          <div style={{
                            width: "7px", height: "7px", borderRadius: "50%",
                            background: isActive ? level.accent : "#CECA C2",
                            transition: "background 0.2s",
                          }} />
                        )}
                        <div>
                          <div className="tab-title" style={{
                            fontSize: "13px", fontWeight: 500,
                            color: isActive ? "#0F0F1A" : "#A8A099",
                            letterSpacing: "0.01em",
                            transition: "color 0.2s",
                          }}>
                            {level.label}
                          </div>
                          <div style={{ fontSize: "10px", color: "#B8B2AA", marginTop: "2px", letterSpacing: "0.02em" }}>
                            {level.sublabel}
                          </div>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Panel */}
            {LEVELS.map((level) =>
              activeLevel === level.id ? (
                <div key={level.id} className="fade-up" style={{ marginTop: "32px" }}>
                  {/* Meta */}
                  <div style={{
                    display: "flex", justifyContent: "space-between",
                    alignItems: "flex-start", marginBottom: "20px",
                  }}>
                    <div>
                      <div style={{
                        fontSize: "10px", letterSpacing: "0.14em", textTransform: "uppercase",
                        color: level.accent, fontWeight: 500, marginBottom: "4px",
                      }}>
                        {level.label} · {level.sublabel}
                      </div>
                      <div style={{ fontSize: "12px", color: "#A8A099" }}>
                        {level.description}
                      </div>
                    </div>
                    {explanations[level.id] && (
                      <div style={{
                        fontSize: "11px", color: "#A8A099",
                        borderLeft: `2px solid ${level.accent}`,
                        paddingLeft: "10px", lineHeight: 1.4,
                      }}>
                        <span style={{ display: "block", fontWeight: 500, color: "#0F0F1A" }}>{wordCount}</span>
                        <span>words</span>
                      </div>
                    )}
                  </div>

                  {/* Content card */}
                  <div style={{
                    background: "#FFFFFF",
                    border: "1px solid #E2DDD6",
                    borderLeft: `3px solid ${level.accent}`,
                    borderRadius: "0 3px 3px 0",
                    padding: "36px 40px",
                    minHeight: "190px",
                    boxShadow: "0 1px 8px rgba(15,15,26,0.04)",
                  }}>
                    {loading[level.id] ? (
                      <div style={{ display: "flex", flexDirection: "column", gap: "13px" }}>
                        {[88, 72, 82, 58, 66].map((w, i) => (
                          <div key={i} className="shimmer" style={{
                            height: "13px", borderRadius: "2px",
                            background: "#EDE9E2", width: `${w}%`,
                            animationDelay: `${i * 0.13}s`,
                          }} />
                        ))}
                        <p style={{ marginTop: "10px", fontSize: "12px", color: "#B8B2AA", fontStyle: "italic", letterSpacing: "0.03em" }}>
                          Crafting {level.label.toLowerCase()} explanation…
                        </p>
                      </div>
                    ) : explanations[level.id] ? (
                      <p style={{
                        fontSize: "16px", lineHeight: 1.88, color: "#2A2A38",
                        fontFamily: "'DM Sans', sans-serif", fontWeight: 300,
                        whiteSpace: "pre-wrap",
                      }}>
                        {renderText(explanations[level.id])}
                      </p>
                    ) : (
                      <p style={{ color: "#C0BAB2", fontStyle: "italic", fontSize: "14px" }}>Awaiting generation…</p>
                    )}
                  </div>

                  {!isLoading && Object.keys(explanations).length === 3 && (
                    <p style={{
                      marginTop: "18px", fontSize: "11px", color: "#B8B2AA",
                      textAlign: "center", letterSpacing: "0.05em",
                    }}>
                      Switch levels above to compare all three explanations
                    </p>
                  )}
                </div>
              ) : null
            )}
          </div>
        )}

        {/* Footer */}
        <div style={{
          marginTop: "88px", paddingTop: "22px",
          borderTop: "1px solid #DDD8D0",
          display: "flex", justifyContent: "space-between", alignItems: "center",
        }}>
          <span style={{ fontSize: "10px", color: "#C0BAB2", letterSpacing: "0.1em", textTransform: "uppercase" }}>
            ExplainLikeAI
          </span>
          <span style={{ fontSize: "10px", color: "#C0BAB2", letterSpacing: "0.06em" }}>
            Powered by Claude AI
          </span>
        </div>

      </div>
    </div>
  );
}
