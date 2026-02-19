import { useState, useRef, useEffect } from "react";

export default function BrewMindChat() {
  const [messages, setMessages] = useState([
    { role: "assistant", content: "Hey there! ☕ Welcome to BrewMind support. I'm Beanbot — your friendly coffee assistant. How can I help you today?" }
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef(null);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages]);

  const sendMessage = async () => {
    if (!input.trim() || loading) return;
    const userMsg = input.trim();
    setInput("");
    setMessages(prev => [...prev, { role: "user", content: userMsg }]);
    setLoading(true);

    try {
      const resp = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [...messages, { role: "user", content: userMsg }]
        })
      });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data.error || "Something went wrong");
      setMessages(prev => [...prev, { role: "assistant", content: data.reply }]);
    } catch (err) {
      setMessages(prev => [...prev, { role: "assistant", content: `Oops! Something went wrong: ${err.message}. Please try again.` }]);
    }
    setLoading(false);
  };

  const quickQ = [
    "What plans do you offer?",
    "My brewer won't connect to Wi-Fi",
    "How do I cancel my subscription?",
    "Where's my order?"
  ];

  return (
    <div style={styles.root}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,400;9..40,500;9..40,700&display=swap" rel="stylesheet" />

      {/* Header */}
      <div style={styles.header}>
        <div style={styles.logo}>
          <span style={{ fontSize: 28 }}>☕</span>
          <div>
            <div style={{ fontSize: 20, fontWeight: 700, letterSpacing: -0.5 }}>BrewMind</div>
            <div style={{ fontSize: 11, color: "#A0785A", fontWeight: 500 }}>Smart Coffee, Delivered</div>
          </div>
        </div>
        <div style={styles.statusBadge}>
          <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#4ADE80", display: "inline-block" }}></span>
          Beanbot Online
        </div>
      </div>

      {/* Chat area */}
      <div ref={scrollRef} style={styles.chatArea}>
        {/* Welcome card */}
        {messages.length <= 1 && (
          <div style={styles.welcomeCard}>
            <div style={{ fontSize: 36, marginBottom: 8 }}>☕</div>
            <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 4 }}>Welcome to BrewMind Support</div>
            <div style={{ fontSize: 13, color: "#8B7355", marginBottom: 16 }}>
              I can help with your subscription, Smart Brewer, orders, and more.
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6, justifyContent: "center" }}>
              {quickQ.map((q, i) => (
                <button key={i} onClick={() => { setInput(q); }}
                  style={styles.quickBtn}>
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((m, i) => (
          <div key={i} style={{ display: "flex", justifyContent: m.role === "user" ? "flex-end" : "flex-start", marginBottom: 12 }}>
            {m.role === "assistant" && <div style={styles.avatar}>☕</div>}
            <div style={m.role === "user" ? styles.userBubble : styles.botBubble}>
              {m.content}
            </div>
          </div>
        ))}

        {loading && (
          <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
            <div style={styles.avatar}>☕</div>
            <div style={{ ...styles.botBubble, color: "#A0785A" }}>
              <span style={{ animation: "dotPulse 1.4s infinite" }}>●</span>
              <span style={{ animation: "dotPulse 1.4s infinite 0.2s" }}> ●</span>
              <span style={{ animation: "dotPulse 1.4s infinite 0.4s" }}> ●</span>
            </div>
          </div>
        )}
      </div>

      {/* Input */}
      <div style={styles.inputArea}>
        <div style={styles.inputRow}>
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === "Enter" && sendMessage()}
            placeholder="Ask Beanbot anything..."
            style={styles.input}
          />
          <button onClick={sendMessage} disabled={loading || !input.trim()}
            style={{ ...styles.sendBtn, opacity: (loading || !input.trim()) ? 0.4 : 1 }}>
            Send
          </button>
        </div>
        <div style={{ textAlign: "center", fontSize: 11, color: "#C4A882", marginTop: 8 }}>
          BrewMind Support Bot · Powered by AI · Responses may not always be accurate
        </div>
      </div>

      {/* API Info Banner */}
      <div style={styles.apiBanner}>
        <div style={{ fontWeight: 700, fontSize: 12, marginBottom: 4 }}>🔗 API Endpoint Available</div>
        <div style={{ fontSize: 11, color: "#8B7355" }}>
          Test this bot with SynthEvaluation using: <code style={styles.code}>{typeof window !== "undefined" ? window.location.origin : ""}/api/chat</code>
          &nbsp;· Format: <code style={styles.code}>Simple JSON</code>
        </div>
      </div>

      <style>{`
        @keyframes dotPulse { 0%,100%{opacity:0.3} 50%{opacity:1} }
      `}</style>
    </div>
  );
}

const styles = {
  root: {
    fontFamily: "'DM Sans', sans-serif",
    height: "100vh",
    display: "flex",
    flexDirection: "column",
    background: "#FBF7F2",
    color: "#3D2E1F"
  },
  header: {
    background: "#3D2E1F",
    color: "#FBF7F2",
    padding: "14px 24px",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between"
  },
  logo: {
    display: "flex",
    alignItems: "center",
    gap: 10
  },
  statusBadge: {
    display: "flex",
    alignItems: "center",
    gap: 6,
    fontSize: 12,
    fontWeight: 500,
    color: "#C4A882",
    background: "#4A3828",
    padding: "5px 12px",
    borderRadius: 20
  },
  chatArea: {
    flex: 1,
    overflowY: "auto",
    padding: "20px 24px",
    maxWidth: 720,
    width: "100%",
    margin: "0 auto",
    boxSizing: "border-box"
  },
  welcomeCard: {
    textAlign: "center",
    background: "#fff",
    borderRadius: 16,
    padding: "28px 20px",
    marginBottom: 20,
    border: "1px solid #E8DDD0",
    boxShadow: "0 2px 8px rgba(61,46,31,0.06)"
  },
  quickBtn: {
    padding: "7px 14px",
    borderRadius: 20,
    border: "1px solid #D4C4AD",
    background: "#FBF7F2",
    color: "#6B5744",
    fontFamily: "'DM Sans'",
    fontSize: 12,
    fontWeight: 500,
    cursor: "pointer",
    transition: "all 0.2s"
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: "50%",
    background: "#3D2E1F",
    color: "#FBF7F2",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 15,
    flexShrink: 0,
    marginRight: 8
  },
  botBubble: {
    background: "#fff",
    border: "1px solid #E8DDD0",
    borderRadius: "4px 16px 16px 16px",
    padding: "10px 14px",
    maxWidth: "75%",
    fontSize: 14,
    lineHeight: 1.6,
    color: "#3D2E1F",
    boxShadow: "0 1px 3px rgba(61,46,31,0.04)"
  },
  userBubble: {
    background: "#3D2E1F",
    color: "#FBF7F2",
    borderRadius: "16px 4px 16px 16px",
    padding: "10px 14px",
    maxWidth: "75%",
    fontSize: 14,
    lineHeight: 1.6
  },
  inputArea: {
    padding: "12px 24px 16px",
    background: "#fff",
    borderTop: "1px solid #E8DDD0"
  },
  inputRow: {
    display: "flex",
    gap: 8,
    maxWidth: 720,
    margin: "0 auto"
  },
  input: {
    flex: 1,
    padding: "12px 16px",
    borderRadius: 12,
    border: "2px solid #E8DDD0",
    fontFamily: "'DM Sans'",
    fontSize: 14,
    outline: "none",
    background: "#FBF7F2",
    color: "#3D2E1F",
    boxSizing: "border-box"
  },
  sendBtn: {
    padding: "12px 24px",
    borderRadius: 12,
    border: "none",
    background: "#3D2E1F",
    color: "#FBF7F2",
    fontFamily: "'DM Sans'",
    fontSize: 14,
    fontWeight: 600,
    cursor: "pointer"
  },
  apiBanner: {
    padding: "10px 24px",
    background: "#F0E9DE",
    borderTop: "1px solid #E8DDD0",
    textAlign: "center"
  },
  code: {
    background: "#3D2E1F",
    color: "#F0E9DE",
    padding: "2px 7px",
    borderRadius: 4,
    fontFamily: "monospace",
    fontSize: 11
  }
};
