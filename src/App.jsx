import { useState, useRef, useEffect } from "react";

const DAILY_LIMIT = 20;

// Simple markdown renderer: handles **bold**, *italic*, and line breaks
function renderMarkdown(text) {
  if (!text) return text;
  // Split by lines to handle paragraphs
  return text.split("\n").map((line, li) => {
    // Process inline markdown: **bold** and *italic*
    const parts = [];
    let remaining = line;
    let key = 0;
    while (remaining.length > 0) {
      // Bold: **text**
      const boldMatch = remaining.match(/\*\*(.+?)\*\*/);
      if (boldMatch) {
        const idx = boldMatch.index;
        if (idx > 0) parts.push(<span key={key++}>{remaining.slice(0, idx)}</span>);
        parts.push(<strong key={key++}>{boldMatch[1]}</strong>);
        remaining = remaining.slice(idx + boldMatch[0].length);
        continue;
      }
      // Italic: *text*
      const italicMatch = remaining.match(/\*(.+?)\*/);
      if (italicMatch) {
        const idx = italicMatch.index;
        if (idx > 0) parts.push(<span key={key++}>{remaining.slice(0, idx)}</span>);
        parts.push(<em key={key++}>{italicMatch[1]}</em>);
        remaining = remaining.slice(idx + italicMatch[0].length);
        continue;
      }
      parts.push(<span key={key++}>{remaining}</span>);
      break;
    }
    return <span key={li}>{parts}{li < text.split("\n").length - 1 && <br />}</span>;
  });
}

function getTodayKey() {
  return `brewmind_msgs_${new Date().toISOString().slice(0, 10)}`;
}

function getDailyCount() {
  return parseInt(localStorage.getItem(getTodayKey()) || "0", 10);
}

function incrementDailyCount() {
  const key = getTodayKey();
  const count = parseInt(localStorage.getItem(key) || "0", 10) + 1;
  localStorage.setItem(key, String(count));
  return count;
}

function getStoredAuth() {
  const raw = sessionStorage.getItem("brewmind_auth");
  if (!raw) return null;
  try { return JSON.parse(raw); } catch { return null; }
}

export default function BrewMindChat() {
  const [auth, setAuth] = useState(getStoredAuth);
  const [loginUser, setLoginUser] = useState("");
  const [loginPass, setLoginPass] = useState("");
  const [loginError, setLoginError] = useState("");
  const [loginLoading, setLoginLoading] = useState(false);

  const [messages, setMessages] = useState([
    { role: "assistant", content: "Hey there! ☕ Welcome to BrewMind support. I'm Beanbot — your friendly coffee assistant. How can I help you today?" }
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [msgCount, setMsgCount] = useState(getDailyCount());
  const scrollRef = useRef(null);

  const remaining = DAILY_LIMIT - msgCount;
  const limitReached = remaining <= 0;

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages]);

  const makeAuthHeader = (u, p) => "Basic " + btoa(`${u}:${p}`);

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!loginUser.trim() || !loginPass.trim()) return;
    setLoginLoading(true);
    setLoginError("");

    try {
      const resp = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": makeAuthHeader(loginUser, loginPass)
        },
        body: JSON.stringify({ message: "hello" })
      });

      if (resp.status === 401) {
        const data = await resp.json();
        setLoginError(data.error || "Invalid credentials.");
        setLoginLoading(false);
        return;
      }

      // Auth succeeded
      const creds = { username: loginUser, password: loginPass };
      sessionStorage.setItem("brewmind_auth", JSON.stringify(creds));
      setAuth(creds);
    } catch {
      setLoginError("Could not connect to server.");
    }
    setLoginLoading(false);
  };

  const handleLogout = () => {
    sessionStorage.removeItem("brewmind_auth");
    setAuth(null);
    setLoginUser("");
    setLoginPass("");
    setMessages([
      { role: "assistant", content: "Hey there! ☕ Welcome to BrewMind support. I'm Beanbot — your friendly coffee assistant. How can I help you today?" }
    ]);
  };

  const sendMessage = async () => {
    if (!input.trim() || loading || limitReached) return;
    const userMsg = input.trim();
    setInput("");
    setMessages(prev => [...prev, { role: "user", content: userMsg }]);
    setLoading(true);

    try {
      const resp = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": makeAuthHeader(auth.username, auth.password)
        },
        body: JSON.stringify({
          messages: [...messages, { role: "user", content: userMsg }]
        })
      });
      const data = await resp.json();
      if (resp.status === 401) {
        handleLogout();
        return;
      }
      if (!resp.ok) throw new Error(data.error || "Something went wrong");
      setMessages(prev => [...prev, { role: "assistant", content: data.reply }]);
      const newCount = incrementDailyCount();
      setMsgCount(newCount);
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

  // ─── Login Screen ───
  if (!auth) {
    return (
      <div style={styles.root}>
        <link href="https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,400;9..40,500;9..40,700&display=swap" rel="stylesheet" />
        <div style={styles.header}>
          <div style={styles.logo}>
            <span style={{ fontSize: 28 }}>☕</span>
            <div>
              <div style={{ fontSize: 20, fontWeight: 700, letterSpacing: -0.5 }}>BrewMind</div>
              <div style={{ fontSize: 11, color: "#A0785A", fontWeight: 500 }}>Smart Coffee, Delivered</div>
            </div>
          </div>
        </div>
        <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <form onSubmit={handleLogin} style={styles.loginCard}>
            <div style={{ fontSize: 36, marginBottom: 8 }}>☕</div>
            <div style={{ fontWeight: 700, fontSize: 18, marginBottom: 4 }}>Sign in to Beanbot</div>
            <div style={{ fontSize: 13, color: "#8B7355", marginBottom: 20 }}>
              Enter your credentials to access support chat.
            </div>
            {loginError && (
              <div style={styles.loginError}>{loginError}</div>
            )}
            <input
              value={loginUser}
              onChange={e => setLoginUser(e.target.value)}
              placeholder="Username"
              autoComplete="username"
              style={{ ...styles.input, marginBottom: 10, width: "100%" }}
            />
            <input
              type="password"
              value={loginPass}
              onChange={e => setLoginPass(e.target.value)}
              placeholder="Password"
              autoComplete="current-password"
              style={{ ...styles.input, marginBottom: 16, width: "100%" }}
            />
            <button
              type="submit"
              disabled={loginLoading || !loginUser.trim() || !loginPass.trim()}
              style={{ ...styles.sendBtn, width: "100%", padding: "12px", opacity: (loginLoading || !loginUser.trim() || !loginPass.trim()) ? 0.5 : 1 }}
            >
              {loginLoading ? "Signing in..." : "Sign In"}
            </button>
          </form>
        </div>
      </div>
    );
  }

  // ─── Chat Screen ───
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
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={styles.statusBadge}>
            <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#4ADE80", display: "inline-block" }}></span>
            {remaining}/{DAILY_LIMIT} messages
          </div>
          <button onClick={handleLogout} style={styles.logoutBtn}>Logout</button>
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
              {m.role === "assistant" ? renderMarkdown(m.content) : m.content}
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
        {limitReached ? (
          <div style={{ textAlign: "center", padding: "12px 0", color: "#A0785A", fontWeight: 600, fontSize: 14 }}>
            You've reached your daily limit of {DAILY_LIMIT} messages. Please come back tomorrow!
          </div>
        ) : (
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
        )}
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
  logoutBtn: {
    padding: "5px 14px",
    borderRadius: 20,
    border: "1px solid #6B5744",
    background: "transparent",
    color: "#C4A882",
    fontFamily: "'DM Sans'",
    fontSize: 12,
    fontWeight: 500,
    cursor: "pointer"
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
  loginCard: {
    textAlign: "center",
    background: "#fff",
    borderRadius: 16,
    padding: "36px 32px",
    width: 340,
    border: "1px solid #E8DDD0",
    boxShadow: "0 2px 8px rgba(61,46,31,0.06)"
  },
  loginError: {
    background: "#FEF2F2",
    color: "#B91C1C",
    border: "1px solid #FECACA",
    borderRadius: 8,
    padding: "8px 12px",
    fontSize: 13,
    marginBottom: 12
  },
  quickBtn: {
    padding: "7px 14px",
    borderRadius: 20,
    border: "1px solid #D4C4Ad",
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
