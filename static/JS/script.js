const chatLauncher = document.getElementById("chatLauncher");
const chatWindow = document.getElementById("chatWindow");
const restartChat = document.getElementById("restartChat");
const minimizeChat = document.getElementById("minimizeChat");
const sendBtn = document.getElementById("sendBtn");
const chatInput = document.getElementById("chatInput");
const chatBody = document.getElementById("chatBody");
const quickReplies = document.getElementById("quickReplies");

const noticeClose = document.querySelector(".notice-close");
const noticeBar = document.querySelector(".notice-bar");

const themeToggle = document.getElementById("themeToggle");
const themeIcon = document.querySelector(".theme-icon");

const fontSizeToggle = document.getElementById("fontSizeToggle");

const openFeedbackBtn = document.getElementById("openFeedbackBtn");
const closeFeedbackBtn = document.getElementById("closeFeedbackBtn");
const feedbackModal = document.getElementById("feedbackModal");
const feedbackTags = document.getElementById("feedbackTags");
const submitFeedbackBtn = document.getElementById("submitFeedbackBtn");
const feedbackText = document.getElementById("feedbackText");
const feedbackSuccessMsg = document.getElementById("feedbackSuccessMsg");

const feedbackReactionButtons = document.querySelectorAll(".feedback-reaction");

const initialBotMessage =
  "Hi, I’m UniHelp. I can assist with password reset, portal access, Wi-Fi issues, and common campus enquiries.";

const initialQuickReplies = [
  "Password Reset",
  "Wi-Fi Problem",
  "Student Portal Help",
  "Talk to Live Agent"
];

const feedbackOptions = {
  up: [
    "Response Relevance",
    "Response Quality",
    "Easy To Understand",
    "Helpful Guidance",
    "Fast Reply"
  ],

  down: [
    "Not Relevant",
    "Unclear Response",
    "Too Slow",
    "Did Not Solve Issue",
    "Need Human Agent"
  ]
};

let selectedFeedbackType = "";
let selectedFeedbackTags = [];



/* =========================
   Notice Bar
========================= */

if (noticeClose && noticeBar) {
  noticeClose.addEventListener("click", () => {
    noticeBar.style.display = "none";
  });
}



/* =========================
   Chat Window
========================= */

function toggleChat() {
  if (!chatWindow) return;
  chatWindow.classList.toggle("open");
}

function closeChatWindow() {
  if (!chatWindow) return;
  chatWindow.classList.remove("open");
}



/* =========================
   Chat Utilities
========================= */

function getCurrentTime() {
  return new Date().toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit"
  });
}

function removeTypingIndicator() {
  const typing = document.querySelector(".typing-indicator");
  if (typing) typing.remove();
}

function removeEndIndicator() {
  const endIndicator = document.querySelector(".end-indicator:last-child");
  if (endIndicator) endIndicator.remove();
}

function addEndIndicator() {
  removeEndIndicator();

  const indicator = document.createElement("div");
  indicator.className = "end-indicator";
  indicator.textContent = "End of response";

  chatBody.appendChild(indicator);
  chatBody.scrollTop = chatBody.scrollHeight;
}



/* =========================
   Messages
========================= */

function addMessage(text, sender = "bot") {
  removeTypingIndicator();

  const wrapper = document.createElement("div");
  wrapper.className = `message-wrapper ${sender}`;

  const message = document.createElement("div");
  message.className = `message ${sender}`;
  message.textContent = text;

  const timestamp = document.createElement("div");
  timestamp.className = `message-time ${sender}`;
  timestamp.textContent = getCurrentTime();

  wrapper.append(message, timestamp);

  chatBody.appendChild(wrapper);

  if (sender === "bot") {
    addEndIndicator();
  }

  chatBody.scrollTop = chatBody.scrollHeight;
}

function showTypingIndicator() {
  removeTypingIndicator();
  removeEndIndicator();

  const typing = document.createElement("div");

  typing.className = "typing-indicator";

  typing.innerHTML = `
    <span class="typing-bubble">
      UniHelp is typing<span class="typing-dots">...</span>
    </span>
  `;

  chatBody.appendChild(typing);

  chatBody.scrollTop = chatBody.scrollHeight;
}



/* =========================
   Quick Replies
========================= */

function renderQuickReplies(options = []) {
  if (!quickReplies) return;

  quickReplies.innerHTML = "";

  options.forEach((option) => {
    const button = document.createElement("button");

    button.type = "button";
    button.className = "quick-reply-btn";
    button.dataset.reply = option;
    button.textContent = option;

    quickReplies.appendChild(button);
  });
}



/* =========================
   Restart Chat
========================= */

function restartConversation() {
  if (!chatBody) return;

  removeTypingIndicator();
  removeEndIndicator();

  chatBody.innerHTML = "";

  addMessage(initialBotMessage, "bot");

  renderQuickReplies(initialQuickReplies);

  if (chatInput) {
    chatInput.value = "";
    chatInput.focus();
  }
}



/* =========================
   Bot Responses
========================= */

function getBotReply(userText) {
  const value = userText.toLowerCase();

  if (value.includes("password")) {
    return "You can reset your password through the university self-service portal. Would you like me to guide you to the support page?";
  }

  if (value.includes("wifi") || value.includes("wi-fi")) {
    return "I can help with Wi-Fi issues. Are you unable to connect, using the wrong password, or facing slow connection?";
  }

  if (value.includes("portal")) {
    return "For student portal help, please make sure your login details are correct. You can also access the portal support page from the Support section.";
  }

  if (value.includes("agent") || value.includes("human")) {
    return "A live support officer is available during office hours. Estimated waiting time is around 5 to 10 minutes.";
  }

  if (value.includes("timetable") || value.includes("exam")) {
    return "You can check timetable and exam-related information through the student portal.";
  }

  return "Sorry, I’m not fully sure what you mean. Please rephrase your question or choose one of the quick reply options.";
}



/* =========================
   Send Message
========================= */

async function sendMessage() {
  if (!chatInput) return;

  const text = chatInput.value.trim();
  if (!text) return;

  removeEndIndicator();
  addMessage(text, "user");
  chatInput.value = "";
  showTypingIndicator();

  try {
    const response = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: text })
    });

    const data = await response.json();
    removeTypingIndicator();
    addMessage(data.reply || "Sorry, no reply from server.", "bot");
  } catch (err) {
    removeTypingIndicator();
    addMessage("Error talking to server. Please try again later.", "bot");
  }
}



/* =========================
   Feedback Modal
========================= */

function renderFeedbackTags(type) {
  feedbackTags.innerHTML = "";

  selectedFeedbackTags = [];

  feedbackOptions[type]?.forEach((tagText) => {
    const tag = document.createElement("button");

    tag.type = "button";
    tag.className = "feedback-tag";
    tag.textContent = tagText;

    tag.addEventListener("click", () => {
      tag.classList.toggle("active");

      if (selectedFeedbackTags.includes(tagText)) {
        selectedFeedbackTags =
          selectedFeedbackTags.filter((item) => item !== tagText);
      } else {
        selectedFeedbackTags.push(tagText);
      }
    });

    feedbackTags.appendChild(tag);
  });
}

function resetFeedbackModal() {
  selectedFeedbackType = "";
  selectedFeedbackTags = [];

  feedbackText.value = "";

  feedbackSuccessMsg.classList.remove("show");

  feedbackReactionButtons.forEach((btn) => {
    btn.classList.remove("active");
  });

  feedbackTags.innerHTML = "";
}



/* =========================
   Theme
========================= */

function applyTheme(theme) {
  const isDark = theme === "dark";

  document.body.classList.toggle("dark-mode", isDark);

  if (themeIcon) {
    themeIcon.textContent = isDark ? "☀️" : "🌙";
  }
}



/* =========================
   Font Size
========================= */

function applyFontSizePreference() {
  const saved = localStorage.getItem("fontSizeMode");

  document.body.classList.toggle(
    "large-text",
    saved === "large"
  );
}



/* =========================
   End Chat
========================= */

function endChat() {
  if (!chatBody || !chatInput || !sendBtn) return;

  addMessage(
    "Chat ended. Thank you for using Ask UniHelp.",
    "bot"
  );

  chatInput.disabled = true;
  sendBtn.disabled = true;

  chatInput.placeholder = "Chat has ended";

  document
    .querySelectorAll(".quick-reply-btn")
    .forEach((button) => {
      button.disabled = true;
    });
}



/* =========================
   Event Listeners
========================= */

chatLauncher?.addEventListener("click", toggleChat);

restartChat?.addEventListener("click", restartConversation);

minimizeChat?.addEventListener("click", closeChatWindow);

sendBtn?.addEventListener("click", sendMessage);

chatInput?.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    sendMessage();
  }
});

quickReplies?.addEventListener("click", (event) => {
  const button = event.target.closest("button");

  if (!button) return;

  const reply = button.dataset.reply;

  removeEndIndicator();

  addMessage(reply, "user");

  showTypingIndicator();

  setTimeout(() => {
    addMessage(getBotReply(reply), "bot");
  }, 700);
});

openFeedbackBtn?.addEventListener("click", () => {
  feedbackModal?.classList.add("show");
});

closeFeedbackBtn?.addEventListener("click", () => {
  feedbackModal?.classList.remove("show");
  resetFeedbackModal();
});

feedbackModal?.addEventListener("click", (event) => {
  if (event.target === feedbackModal) {
    feedbackModal.classList.remove("show");
    resetFeedbackModal();
  }
});

feedbackReactionButtons.forEach((button) => {
  button.addEventListener("click", () => {
    feedbackReactionButtons.forEach((btn) => {
      btn.classList.remove("active");
    });

    button.classList.add("active");

    selectedFeedbackType = button.dataset.type;

    renderFeedbackTags(selectedFeedbackType);
  });
});

submitFeedbackBtn?.addEventListener("click", () => {
  if (!selectedFeedbackType) {
    alert("Please select thumbs up or thumbs down first.");
    return;
  }

  console.log("Feedback submitted:", {
    rating: selectedFeedbackType,
    tags: selectedFeedbackTags,
    comment: feedbackText.value.trim()
  });

  feedbackSuccessMsg.classList.add("show");

  setTimeout(() => {
    feedbackModal.classList.remove("show");
    resetFeedbackModal();
  }, 1200);
});

themeToggle?.addEventListener("click", () => {
  const isDark =
    document.body.classList.contains("dark-mode");

  const nextTheme = isDark ? "light" : "dark";

  applyTheme(nextTheme);

  localStorage.setItem("theme", nextTheme);
});

fontSizeToggle?.addEventListener("click", () => {
  document.body.classList.toggle("large-text");

  const isLarge =
    document.body.classList.contains("large-text");

  localStorage.setItem(
    "fontSizeMode",
    isLarge ? "large" : "normal"
  );
});



/* =========================
   Initial Load
========================= */

applyTheme(localStorage.getItem("theme") || "light");

applyFontSizePreference();