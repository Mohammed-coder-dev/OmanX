// app.js — OmanX MVP (frontend)
// Goals:
// - Deterministic assistant UI with structured responses
// - Checklist flow completion tracking
// - Health check + graceful offline banner

const chatEl = document.getElementById("chat");
const formEl = document.getElementById("form");
const inputEl = document.getElementById("input");
const sendBtn = document.getElementById("send");
const clearBtn = document.getElementById("clearBtn");
const statusPill = document.getElementById("statusPill");
const statusBanner = document.getElementById("statusBanner");
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

  if (statusBanner) {
    statusBanner.hidden = state !== "offline";
  }
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
  avatar.textContent = role === "me" ? "You" : "OmanX";

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
      body: JSON.stringify({ message, mode }),
    });

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

const promptButtons = document.querySelectorAll(".flow-action[data-prompt]");
promptButtons.forEach((button) => {
  button.addEventListener("click", () => {
    if (!inputEl) return;
    inputEl.value = button.dataset.prompt || "";
    inputEl.focus();
  });
});

// -----------------------------
// Checklist tracking
// -----------------------------
const flows = document.querySelectorAll("[data-flow]");
flows.forEach((flow) => {
  const list = flow.querySelector("[data-flow-list]");
  const statusEl = flow.querySelector("[data-flow-status]");
  const stateEl = flow.querySelector("[data-flow-state]");
  if (!list || !statusEl || !stateEl) return;

  const inputs = Array.from(list.querySelectorAll("input[type='checkbox']"));

  const updateStatus = () => {
    const total = inputs.length;
    const done = inputs.filter((i) => i.checked).length;
    statusEl.textContent = `${done}/${total} complete`;

    if (done === 0) {
      stateEl.textContent = "Not started";
    } else if (done === total) {
      stateEl.textContent = "Complete";
    } else {
      stateEl.textContent = "In progress";
    }
  };

  inputs.forEach((input) => {
    input.addEventListener("change", updateStatus);
  });

  updateStatus();
});

// -----------------------------
// Boot
// -----------------------------
setMode("official");
checkHealth();

if (API_BASE) {
  console.log("[OmanX] Using API base:", API_BASE);
}
