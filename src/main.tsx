import React from "react";
import ReactDOM from "react-dom/client";
import "./index.css";
import App from "./App.tsx";

class ErrorBoundary extends React.Component<{ children: React.ReactNode }, { error: Error | null }> {
  state: { error: Error | null } = { error: null };
  static getDerivedStateFromError(error: Error) {
    return { error };
  }
  render() {
    if (this.state.error) {
      return (
        <div
          style={{
            minHeight: "100vh",
            display: "grid",
            placeItems: "center",
            background: "#071712",
            color: "#eef6f0",
            fontFamily: "JetBrains Mono, monospace",
            padding: 24,
          }}
        >
          <div style={{ maxWidth: 560 }}>
            <p style={{ marginBottom: 8, color: "#f4755c", fontWeight: 700 }}>
              Что-то сломалось при расчёте:
            </p>
            <pre style={{ whiteSpace: "pre-wrap", opacity: 0.85, fontSize: 13 }}>
              {String(this.state.error)}
            </pre>
            <button
              onClick={() => location.reload()}
              style={{
                marginTop: 16,
                padding: "10px 18px",
                borderRadius: 10,
                border: "1px solid #e9b14e",
                background: "rgba(233,177,78,0.12)",
                color: "#f3c979",
                cursor: "pointer",
                fontWeight: 600,
              }}
            >
              Перезагрузить страницу
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <ErrorBoundary>
    <App />
  </ErrorBoundary>
);
