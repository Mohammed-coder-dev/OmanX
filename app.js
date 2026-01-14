// app.js — OmanX MVP (frontend)
// Key upgrades:
// - Supports separate backend host via ?api= or window.OMANX_API_BASE or <meta name="omanx-api-base">
// - Adds health check on load to set Online/Offline accurately
// - Sends mode (official/community) if toggle exists
// - Better error surfacing (shows server error message if provided)

const chatEl = document.getElementById("chat");
const formEl = document.getElementById("form");
const inputEl = document.getElementById("input");
const sendBtn = document.getElementById("send");
const clearBtn = document.getElementById("clearBtn");
const printBtn = document.getElementById("printBtn");
const statusPill = document.getElementById("statusPill");
const yearEl = document.getElementById("year");

// Optional mode toggles (if present in your HTML)
const modeOfficialBtn = document.getElementById("modeOfficial");
const modeCommunityBtn = document.getElementById("modeCommunity");

const DEMO_ERROR = "Sorry, I couldn't reach the OmanX service. Please try again.";

if (yearEl) yearEl.textContent = new Date().getFullYear();

const setStatus = (state, text) => {
  if (!statusPill) return;
  const el = statusPill.querySelector(".pill-text");
  if (el) el.textContent = text;
  statusPill.dataset.state = state;
};

const scrollToBottom = () => {
  if (!chatEl) return;
  chatEl.scrollTop = chatEl.scrollHeight;
};

const createMessage = (role, text) => {
  const wrapper = document.createElement("div");
  wrapper.className = `msg ${role}`;

  const avatar = document.createElement("div");
  avatar.className = "avatar";
  avatar.textContent = role === "me" ? "You" : "OX";

  const bubble = document.createElement("div");
  bubble.className = "bubble";
  bubble.textContent = text;

  wrapper.appendChild(avatar);
  wrapper.appendChild(bubble);

  return wrapper;
};

const addMessage = (role, text) => {
  if (!chatEl) return;
  chatEl.appendChild(createMessage(role, text));
  scrollToBottom();
};

const setLoading = (isLoading) => {
  if (!sendBtn) return;
  sendBtn.disabled = isLoading;
  const t = sendBtn.querySelector(".send-text");
  if (t) t.textContent = isLoading ? "Sending…" : "Send";
};

// -----------------------------
// API base resolution
// Priority:
// 1) URL param ?api=https://your-backend
// 2) window.OMANX_API_BASE
// 3) <meta name="omanx-api-base" content="...">
// 4) same-origin ""
// -----------------------------
function getApiBase() {
  try {
    const url = new URL(window.location.href);
    const q = url.searchParams.get("api");
    if (q) return q.replace(/\/+$/, "");
  } catch {}

  if (typeof window !== "undefined" && window.OMANX_API_BASE) {
    return String(window.OMANX_API_BASE).replace(/\/+$/, "");
  }

  const meta = document.querySelector('meta[name="omanx-api-base"]');
  if (meta?.content) return meta.content.trim().replace(/\/+$/, "");

  return "";
}

const API_BASE = getApiBase();
const apiUrl = (p) => `${API_BASE}${p.startsWith("/") ? p : `/${p}`}`;

// -----------------------------
// Mode selection (official/community)
// -----------------------------
let mode = "official";

function setMode(next) {
  mode = next;

  if (modeOfficialBtn && modeCommunityBtn) {
    if (mode === "official") {
      modeOfficialBtn.classList.add("on");
      modeCommunityBtn.classList.remove("on");
      modeOfficialBtn.setAttribute("aria-selected", "true");
      modeCommunityBtn.setAttribute("aria-selected", "false");
    } else {
      modeCommunityBtn.classList.add("on");
      modeOfficialBtn.classList.remove("on");
      modeCommunityBtn.setAttribute("aria-selected", "true");
      modeOfficialBtn.setAttribute("aria-selected", "false");
    }
  }
}

modeOfficialBtn?.addEventListener("click", () => setMode("official"));
modeCommunityBtn?.addEventListener("click", () => setMode("community"));

// -----------------------------
// Connectivity check
// -----------------------------
async function checkHealth() {
  try {
    const r = await fetch(apiUrl("/health"), { method: "GET" });
    if (!r.ok) throw new Error(`health ${r.status}`);
    setStatus("online", "Online");
    return true;
  } catch {
    setStatus("offline", "Offline");
    return false;
  }
}

// -----------------------------
// Send message
// -----------------------------
const sendMessage = async (message) => {
  addMessage("me", message);
  setLoading(true);
  setStatus("busy", "Thinking");

  try {
    const response = await fetch(apiUrl("/chat"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      // Send mode so server can route/scope responses
      body: JSON.stringify({ message, mode }),
    });

    // Try to parse JSON error payloads too
    let payload = null;
    try {
      payload = await response.json();
    } catch {
      payload = null;
    }

    if (!response.ok) {
      const errMsg = payload?.error
        ? `${payload.error} (HTTP ${response.status})`
        : `Request failed: HTTP ${response.status}`;
      throw new Error(errMsg);
    }

    addMessage("bot", payload?.text || "I couldn't generate a response right now.");
    setStatus("online", "Online");
  } catch (error) {
    console.error(error);
    // Show more useful errors in prod debugging (but keep it clean)
    const msg = error?.message?.includes("HTTP")
      ? `Sorry — the service returned an error. ${error.message}`
      : DEMO_ERROR;

    addMessage("bot", msg);
    setStatus("offline", "Offline");
  } finally {
    setLoading(false);
  }
};

// -----------------------------
// Event handlers
// -----------------------------
if (formEl && inputEl) {
  formEl.addEventListener("submit", (event) => {
    event.preventDefault();
    const message = inputEl.value.trim();
    if (!message) return;

    inputEl.value = "";
    sendMessage(message);
  });

  inputEl.addEventListener("keydown", (event) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      formEl.requestSubmit();
    }
  });
}

if (clearBtn && chatEl) {
  clearBtn.addEventListener("click", () => {
    chatEl.innerHTML = "";
  });
}

if (printBtn) {
  printBtn.addEventListener("click", () => window.print());
}

const promptButtons = document.querySelectorAll(".item[data-prompt]");
promptButtons.forEach((button) => {
  button.addEventListener("click", () => {
    if (!inputEl) return;
    inputEl.value = button.dataset.prompt || "";
    inputEl.focus();
  });
});

// -----------------------------
// Boot
// -----------------------------
setMode("official");
checkHealth();

// Helpful debug line (safe)
if (API_BASE) {
  console.log("[OmanX] Using API base:", API_BASE);
}
