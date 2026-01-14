const chatEl = document.getElementById("chat");
const formEl = document.getElementById("form");
const inputEl = document.getElementById("input");
const sendBtn = document.getElementById("send");
const clearBtn = document.getElementById("clearBtn");
const printBtn = document.getElementById("printBtn");
const statusPill = document.getElementById("statusPill");
const yearEl = document.getElementById("year");
const formAlert = document.getElementById("formAlert");

const DEMO_ERROR = "Sorry, I couldn't reach the OmanX service. Please try again.";

if (yearEl) {
  yearEl.textContent = new Date().getFullYear();
}

const setStatus = (state, text) => {
  if (!statusPill) return;
  statusPill.querySelector(".pill-text").textContent = text;
  statusPill.dataset.state = state;
};

const scrollToBottom = () => {
  if (!chatEl) return;
  chatEl.scrollTop = chatEl.scrollHeight;
};

const buildReferences = (references = []) => {
  if (!Array.isArray(references) || references.length === 0) return null;

  const refs = document.createElement("div");
  refs.className = "refs";

  const title = document.createElement("div");
  title.className = "refs-title";
  title.textContent = "References";
  refs.appendChild(title);

  references.forEach((ref) => {
    const link = document.createElement("a");
    if (typeof ref === "string") {
      link.href = ref;
      link.textContent = ref;
    } else {
      link.href = ref.url || "#";
      link.textContent = ref.title || ref.url || "Reference";
    }
    link.target = "_blank";
    link.rel = "noreferrer";
    refs.appendChild(link);
  });

  return refs;
};

const createMessage = (role, text, references) => {
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

  const refs = buildReferences(references);
  if (refs) {
    bubble.appendChild(refs);
  }

  return wrapper;
};

const addMessage = (role, text, references) => {
  if (!chatEl) return;
  chatEl.appendChild(createMessage(role, text, references));
  scrollToBottom();
};

const setLoading = (isLoading) => {
  if (!sendBtn) return;
  sendBtn.disabled = isLoading;
  sendBtn.querySelector(".send-text").textContent = isLoading ? "Sending…" : "Send";
};

const showAlert = (message = "") => {
  if (!formAlert) return;
  formAlert.textContent = message;
  formAlert.dataset.active = message ? "true" : "false";
};

const sendMessage = async (message) => {
  addMessage("me", message);
  setLoading(true);
  setStatus("busy", "Thinking");
  showAlert("");

  try {
    const response = await fetch("/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message }),
    });

    if (!response.ok) {
      throw new Error(`Request failed: ${response.status}`);
    }

    const payload = await response.json();
    addMessage(
      "bot",
      payload.text || "I couldn't generate a response right now.",
      payload.references
    );
    setStatus("online", "Operational");
  } catch (error) {
    console.error(error);
    addMessage("bot", DEMO_ERROR);
    setStatus("offline", "Offline");
    showAlert("Service is temporarily unavailable. Please retry in a moment.");
  } finally {
    setLoading(false);
  }
};

setStatus("online", "Operational");
showAlert("");

if (formEl && inputEl) {
  formEl.addEventListener("submit", (event) => {
    event.preventDefault();
    const message = inputEl.value.trim();
    if (!message) {
      showAlert("Please enter a question or select a playbook prompt.");
      inputEl.focus();
      return;
    }

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
