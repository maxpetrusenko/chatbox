import { useState } from "react";

const options = [
  {
    name: "chess.js + react-chessboard",
    desc: "Industry standard combo. chess.js owns all game logic, move validation, FEN generation. react-chessboard renders a drag-and-drop board with piece animations. Both actively maintained, huge community.",
    verdict: "Best default pick",
    scores: { fit: 9, devSpeed: 9, ui: 8, validation: 10, iframe: 8, aiSupport: 6, community: 10, bundle: 7 },
    pros: ["Fastest path to working chess with full validation", "react-chessboard supports custom themes, orientation flip, arrows/highlights", "chess.js outputs FEN natively — direct match to your state.update contract", "Both libraries are TypeScript-friendly"],
    cons: ["react-chessboard pulls in React — adds ~40KB to iframe bundle", "No built-in engine for suggest_move — LLM analyzes FEN or add Stockfish separately", "Board responsiveness at 400px needs some CSS tuning"],
    suggestMoveStrategy: "LLM reads FEN from state snapshot and suggests moves in natural language. Good enough for educational context. Add Stockfish WASM later if you want engine-grade suggestions.",
  },
  {
    name: "chess.js + cm-chessboard",
    desc: "chess.js for logic, cm-chessboard for rendering. cm-chessboard is a modern vanilla JS board — no React dependency, SVG-based, designed for embedding. Clean API, good animations.",
    verdict: "Best iframe-native option",
    scores: { fit: 8, devSpeed: 7, ui: 9, validation: 10, iframe: 10, bundle: 9, aiSupport: 6, community: 6 },
    pros: ["Zero framework dependency — ideal for sandboxed iframe", "SVG rendering scales perfectly to 400px", "Smallest meaningful bundle (~15KB board + chess.js)", "Clean separation: chess.js validates, cm-chessboard renders"],
    cons: ["Smaller community than react-chessboard, fewer examples", "No React — you wire events manually (postMessage bridge handles this anyway)", "Drag-and-drop requires explicit configuration", "Fewer pre-built themes"],
    suggestMoveStrategy: "Same as Option 1 — FEN to LLM. The board library doesn't affect engine strategy.",
  },
  {
    name: "chess.js + Stockfish WASM + react-chessboard",
    desc: "Full-stack chess: chess.js for rules, Stockfish compiled to WASM for engine analysis and AI opponent, react-chessboard for UI. The 'real chess app' approach.",
    verdict: "Most impressive demo, highest cost",
    scores: { fit: 9, devSpeed: 5, ui: 8, validation: 10, iframe: 6, bundle: 3, aiSupport: 10, community: 8 },
    pros: ["suggest_move returns engine-evaluated best move with evaluation score", "Can play as AI opponent (black side) — no LLM needed for moves", "Impressive demo: 'the chess app has a real engine'", "Stockfish analysis adds depth to chatbot's game discussion"],
    cons: ["Stockfish WASM is ~2-6MB — heavy for iframe cold start", "WASM + SharedArrayBuffer needs specific headers (COOP/COEP) — iframe sandbox complications", "Significantly more integration work: Web Worker setup, UCI protocol parsing", "Overkill for the assignment's actual testing scenarios"],
    suggestMoveStrategy: "Stockfish evaluates position, returns best move + centipawn evaluation. Platform can pass this to LLM for natural language explanation.",
  },
  {
    name: "chess.js + custom React SVG board",
    desc: "chess.js for all logic. Build the board renderer from scratch using React + SVG. Full control over every pixel, animation, and interaction pattern.",
    verdict: "Maximum control, maximum time",
    scores: { fit: 7, devSpeed: 3, ui: 10, validation: 10, iframe: 8, bundle: 8, aiSupport: 6, community: 3 },
    pros: ["Complete UI control — match ChatBridge design system exactly", "No third-party board dependency to work around", "Can build novel interactions: in-chat move highlights, animated state transitions", "Smallest possible board code if done right"],
    cons: ["Drag-and-drop on SVG is non-trivial (touch events, coordinate math, snap logic)", "2-3x development time vs react-chessboard", "You're reimplementing solved problems (piece positioning, legal move highlighting)", "Bugs in board rendering eat into time for the actual platform integration"],
    suggestMoveStrategy: "Same FEN-to-LLM approach. Custom board doesn't change the engine story.",
  },
  {
    name: "Lichess embeddable board (iframe-in-iframe)",
    desc: "Embed Lichess's board editor or analysis board directly. Lichess is open source and provides embeddable widgets. Wrap it with a thin postMessage bridge.",
    verdict: "Fastest visual result, weakest integration",
    scores: { fit: 4, devSpeed: 8, ui: 7, validation: 10, iframe: 3, bundle: 10, aiSupport: 7, community: 9 },
    pros: ["Board works immediately — zero rendering code", "Lichess has built-in Stockfish analysis", "Battle-tested UI used by millions", "No bundle size concern — it's a remote embed"],
    cons: ["Iframe-inside-iframe: sandbox restrictions compound, postMessage routing gets messy", "You don't control the UI — can't style it to match ChatBridge", "Network dependency: if Lichess is slow, your app is slow", "Graders may see it as 'just embedding someone else's app' — undermines the demo", "Hard to extract structured FEN state reliably from their embed"],
    suggestMoveStrategy: "Lichess analysis provides engine moves, but extracting them programmatically from the embed is fragile.",
  },
];

const categories = [
  { key: "fit", label: "Req Fit", desc: "How well it matches your presearch architecture (manifest, iframe, state snapshots, tools)" },
  { key: "devSpeed", label: "Dev Speed", desc: "Time to working integration within your sprint" },
  { key: "ui", label: "UI Quality", desc: "Visual polish, animations, responsiveness at 400px" },
  { key: "validation", label: "Validation", desc: "Legal move enforcement, check/checkmate/stalemate detection" },
  { key: "iframe", label: "Iframe Compat", desc: "Works cleanly in sandboxed iframe with postMessage" },
  { key: "aiSupport", label: "AI/Suggest", desc: "Quality of suggest_move tool implementation" },
  { key: "community", label: "Community", desc: "Docs, examples, maintenance, Stack Overflow presence" },
  { key: "bundle", label: "Bundle Size", desc: "Iframe payload size and cold start impact" },
];

function ScoreBadge({ score }) {
  const bg =
    score >= 9 ? "#059669" : score >= 7 ? "#0284c7" : score >= 5 ? "#d97706" : "#dc2626";
  return (
    <span
      style={{
        background: bg,
        color: "#fff",
        borderRadius: 6,
        padding: "2px 10px",
        fontWeight: 600,
        fontSize: 14,
        display: "inline-block",
        minWidth: 28,
        textAlign: "center",
      }}
    >
      {score}
    </span>
  );
}

function WeightedScore({ scores }) {
  const weights = { fit: 2, devSpeed: 1.5, ui: 1, validation: 1, iframe: 1.5, aiSupport: 1, community: 0.5, bundle: 0.5 };
  let totalWeight = 0;
  let totalScore = 0;
  for (const [key, weight] of Object.entries(weights)) {
    totalScore += (scores[key] || 0) * weight;
    totalWeight += weight;
  }
  const weighted = (totalScore / totalWeight).toFixed(1);
  const num = parseFloat(weighted);
  const bg = num >= 8 ? "#059669" : num >= 6.5 ? "#0284c7" : num >= 5 ? "#d97706" : "#dc2626";
  return (
    <span style={{ background: bg, color: "#fff", borderRadius: 8, padding: "4px 12px", fontWeight: 700, fontSize: 16 }}>
      {weighted}
    </span>
  );
}

export default function ChessComparison() {
  const [expanded, setExpanded] = useState(null);
  const [showWeights, setShowWeights] = useState(false);

  return (
    <div style={{ fontFamily: "'Inter', system-ui, sans-serif", maxWidth: 1100, margin: "0 auto", padding: 24, background: "#0f172a", color: "#e2e8f0", minHeight: "100vh" }}>
      <div style={{ marginBottom: 32 }}>
        <h1 style={{ fontSize: 28, fontWeight: 700, color: "#f1f5f9", margin: 0 }}>Chess Implementation Options</h1>
        <p style={{ color: "#94a3b8", fontSize: 14, margin: "8px 0 4px" }}>
          Rated against ChatBridge requirements: sandboxed iframe, manifest registration, FEN state snapshots, tool invocation, 400×440 widget
        </p>
        <div style={{ display: "flex", gap: 12, marginTop: 12, alignItems: "center" }}>
          <span style={{ fontSize: 12, color: "#64748b" }}>Weights (for overall):</span>
          <button
            onClick={() => setShowWeights(!showWeights)}
            style={{ background: "#1e293b", border: "1px solid #334155", color: "#94a3b8", borderRadius: 6, padding: "4px 12px", fontSize: 12, cursor: "pointer" }}
          >
            {showWeights ? "Hide" : "Show"} weights
          </button>
          {showWeights && (
            <span style={{ fontSize: 12, color: "#64748b" }}>
              Fit ×2 · Dev Speed ×1.5 · Iframe ×1.5 · UI ×1 · Validation ×1 · AI ×1 · Community ×0.5 · Bundle ×0.5
            </span>
          )}
        </div>
      </div>

      {/* Score matrix table */}
      <div style={{ overflowX: "auto", marginBottom: 32 }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
          <thead>
            <tr style={{ borderBottom: "2px solid #334155" }}>
              <th style={{ textAlign: "left", padding: "10px 12px", color: "#94a3b8", fontWeight: 500, minWidth: 200 }}>Option</th>
              {categories.map((c) => (
                <th key={c.key} style={{ textAlign: "center", padding: "10px 8px", color: "#94a3b8", fontWeight: 500, fontSize: 12 }} title={c.desc}>
                  {c.label}
                </th>
              ))}
              <th style={{ textAlign: "center", padding: "10px 8px", color: "#f59e0b", fontWeight: 600, fontSize: 12 }}>Overall</th>
            </tr>
          </thead>
          <tbody>
            {options.map((opt, i) => (
              <tr
                key={i}
                onClick={() => setExpanded(expanded === i ? null : i)}
                style={{
                  borderBottom: "1px solid #1e293b",
                  cursor: "pointer",
                  background: expanded === i ? "#1e293b" : i === 0 ? "rgba(5,150,105,0.08)" : "transparent",
                  transition: "background 0.15s",
                }}
              >
                <td style={{ padding: "12px", verticalAlign: "top" }}>
                  <div style={{ fontWeight: 600, color: "#f1f5f9", fontSize: 14 }}>{opt.name}</div>
                  <div style={{ color: i === 0 ? "#34d399" : "#64748b", fontSize: 12, marginTop: 2 }}>
                    {i === 0 ? "★ " : ""}{opt.verdict}
                  </div>
                </td>
                {categories.map((c) => (
                  <td key={c.key} style={{ textAlign: "center", padding: "12px 8px" }}>
                    <ScoreBadge score={opt.scores[c.key]} />
                  </td>
                ))}
                <td style={{ textAlign: "center", padding: "12px 8px" }}>
                  <WeightedScore scores={opt.scores} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Expanded detail */}
      {expanded !== null && (
        <div style={{ background: "#1e293b", borderRadius: 12, padding: 24, marginBottom: 24, border: "1px solid #334155" }}>
          <h2 style={{ fontSize: 20, fontWeight: 600, color: "#f1f5f9", margin: "0 0 8px" }}>{options[expanded].name}</h2>
          <p style={{ color: "#94a3b8", fontSize: 14, margin: "0 0 20px" }}>{options[expanded].desc}</p>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 20 }}>
            <div>
              <h3 style={{ fontSize: 14, fontWeight: 600, color: "#34d399", margin: "0 0 8px" }}>Pros</h3>
              {options[expanded].pros.map((p, j) => (
                <div key={j} style={{ fontSize: 13, color: "#cbd5e1", padding: "4px 0", paddingLeft: 16, position: "relative" }}>
                  <span style={{ position: "absolute", left: 0, color: "#34d399" }}>+</span> {p}
                </div>
              ))}
            </div>
            <div>
              <h3 style={{ fontSize: 14, fontWeight: 600, color: "#f87171", margin: "0 0 8px" }}>Cons</h3>
              {options[expanded].cons.map((c, j) => (
                <div key={j} style={{ fontSize: 13, color: "#cbd5e1", padding: "4px 0", paddingLeft: 16, position: "relative" }}>
                  <span style={{ position: "absolute", left: 0, color: "#f87171" }}>−</span> {c}
                </div>
              ))}
            </div>
          </div>

          <div style={{ background: "#0f172a", borderRadius: 8, padding: 16 }}>
            <h3 style={{ fontSize: 14, fontWeight: 600, color: "#f59e0b", margin: "0 0 6px" }}>suggest_move strategy</h3>
            <p style={{ fontSize: 13, color: "#94a3b8", margin: 0 }}>{options[expanded].suggestMoveStrategy}</p>
          </div>
        </div>
      )}

      {/* Recommendation */}
      <div style={{ background: "linear-gradient(135deg, #064e3b, #0f172a)", borderRadius: 12, padding: 24, border: "1px solid #059669" }}>
        <h2 style={{ fontSize: 18, fontWeight: 700, color: "#34d399", margin: "0 0 12px" }}>Recommendation</h2>
        <p style={{ color: "#e2e8f0", fontSize: 14, lineHeight: 1.6, margin: "0 0 12px" }}>
          <strong>Option 1 (chess.js + react-chessboard)</strong> is the clear pick for your sprint. It scores highest on the weighted criteria that matter most — requirement fit, dev speed, and validation — while being the most battle-tested path. The iframe bundle size is manageable at ~60KB gzipped.
        </p>
        <p style={{ color: "#94a3b8", fontSize: 13, lineHeight: 1.6, margin: "0 0 12px" }}>
          <strong>If you want to differentiate:</strong> Option 2 (cm-chessboard) is worth considering if you want a lighter, more iframe-native approach with better SVG scaling. It trades React convenience for a cleaner sandbox story.
        </p>
        <p style={{ color: "#94a3b8", fontSize: 13, lineHeight: 1.6, margin: 0 }}>
          <strong>Skip Stockfish for now.</strong> Your presearch already defines suggest_move as a tool the chatbot invokes — the LLM reading FEN and suggesting moves in natural language is the right approach for an educational context. Stockfish is a cool demo addition after the core integration works, not before.
        </p>
      </div>

      <p style={{ color: "#475569", fontSize: 11, marginTop: 16, textAlign: "center" }}>Click any row to expand details · Scores are 1–10 · Overall is weighted toward fit, dev speed, and iframe compat</p>
    </div>
  );
}