import { useRef, useState } from "react";

const API_BASE = (import.meta.env.VITE_API_URL || import.meta.env.VITE_API_BASE_URL || "http://localhost:3001").replace(/\/$/, "");

const LEVELS = [
  { id: "child", label: "Elementary", description: "Ages 6-10" },
  { id: "beginner", label: "Foundational", description: "No prior knowledge" },
  { id: "expert", label: "Advanced", description: "Domain expertise" },
];

const EXAMPLES = ["Quantum entanglement", "Blockchain", "Natural selection", "Machine learning", "Black holes", "Compound interest"];

export default function ExplainLikeAI() {
  const [concept, setConcept] = useState("");
  const [activeLevel, setActiveLevel] = useState("beginner");
  const [explanations, setExplanations] = useState({});
  const [loading, setLoading] = useState({});
  const [error, setError] = useState("");
  const inputRef = useRef(null);

  async function fetchExplanation(topic, level) {
    setLoading((current) => ({ ...current, [level]: true }));
    try {
      const res = await fetch(`${API_BASE}/api/explain-direct`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ concept: topic, level }),
      });
      if (!res.ok) throw new Error(`API error: ${res.status}`);
      const data = await res.json();
      setExplanations((current) => ({ ...current, [level]: data.explanation || "" }));
    } catch {
      setError("Eggzy could not connect. Please try again.");
    } finally {
      setLoading((current) => ({ ...current, [level]: false }));
    }
  }

  async function handleExplain() {
    const topic = concept.trim();
    if (!topic) return;
    setError("");
    setExplanations({});
    await Promise.all(LEVELS.map((level) => fetchExplanation(topic, level.id)));
  }

  return (
    <div style={{ minHeight: "100vh", background: "#0d1712", color: "#f6fff7", padding: 32, fontFamily: "sans-serif" }}>
      <div style={{ maxWidth: 860, margin: "0 auto" }}>
        <h1>ExplainLikeAI</h1>
        <p>Secure browser-safe concept explanations powered through the Eggzy backend.</p>
        <div style={{ display: "flex", gap: 12, marginTop: 16 }}>
          <input ref={inputRef} value={concept} onChange={(event) => setConcept(event.target.value)} onKeyDown={(event) => event.key === "Enter" && void handleExplain()} placeholder="Try blockchain, photosynthesis, or recursion" style={{ flex: 1, padding: 14, borderRadius: 12 }} />
          <button onClick={() => void handleExplain()} style={{ padding: "14px 18px", borderRadius: 12 }}>Explain</button>
        </div>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 16 }}>
          {EXAMPLES.map((item) => (
            <button key={item} onClick={() => { setConcept(item); inputRef.current?.focus(); }} style={{ padding: "8px 12px", borderRadius: 999 }}> {item} </button>
          ))}
        </div>
        {error ? <p style={{ color: "#ffb3b3", marginTop: 16 }}>{error}</p> : null}
        <div style={{ display: "grid", gap: 16, marginTop: 24 }}>
          {LEVELS.map((level) => (
            <button key={level.id} onClick={() => setActiveLevel(level.id)} style={{ textAlign: "left", padding: 18, borderRadius: 18, background: activeLevel === level.id ? "#173524" : "#12241b", color: "inherit" }}>
              <strong>{level.label}</strong>
              <div>{level.description}</div>
              <p style={{ marginTop: 12 }}>{loading[level.id] ? "Crafting explanation..." : explanations[level.id] || "No explanation yet."}</p>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}