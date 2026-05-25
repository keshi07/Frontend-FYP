let sessionId = crypto.randomUUID();
const chatLauncher = document.getElementById("chatLauncher");
const chatWindow = document.getElementById("chatWindow");
const restartChat = document.getElementById("restartChat");
const minimizeChat = document.getElementById("minimizeChat");
const sendBtn = document.getElementById("sendBtn");
const chatInput = document.getElementById("chatInput");
const chatBody = document.getElementById("chatBody");

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
let sentMessageHistory = [];
let historyIndex = 0;
let responseCounter = 0;

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
  if (!chatBody) return;

  removeEndIndicator();

  const indicator = document.createElement("div");
  indicator.className = "end-indicator";
  indicator.textContent = "End of response";

  chatBody.appendChild(indicator);
  chatBody.scrollTop = chatBody.scrollHeight;
}

function storeSentMessage(text) {
  const trimmed = (text || "").trim();
  if (!trimmed) return;

  sentMessageHistory.push(trimmed);
  historyIndex = sentMessageHistory.length;
}

function loadPreviousMessage() {
  if (!chatInput || !sentMessageHistory.length) return;

  if (historyIndex > 0) {
    historyIndex--;
  } else {
    historyIndex = 0;
  }

  chatInput.value = sentMessageHistory[historyIndex];
}

function loadNextMessage() {
  if (!chatInput || !sentMessageHistory.length) return;

  if (historyIndex < sentMessageHistory.length - 1) {
    historyIndex++;
    chatInput.value = sentMessageHistory[historyIndex];
  } else {
    historyIndex = sentMessageHistory.length;
    chatInput.value = "";
  }
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

function addStructuredMessage(data) {
  removeTypingIndicator();

  const wrapper = document.createElement("div");
  wrapper.className = "message-wrapper bot";

  const message = document.createElement("div");
  message.className = "message bot structured-bot-message";

  const responseId = `response-${++responseCounter}`;
  message.dataset.responseId = responseId;

  const summary = document.createElement("p");
  summary.className = "bot-summary";
  summary.textContent =
    data.summary || data.reply || "Sorry, no reply from server.";
  message.appendChild(summary);

  const hasDetails =
    (data.details && data.details.trim()) ||
    (Array.isArray(data.steps) && data.steps.length) ||
    (Array.isArray(data.relatedTopics) && data.relatedTopics.length) ||
    (Array.isArray(data.links) && data.links.length);

  if (hasDetails) {
    const toggleBtn = document.createElement("button");
    toggleBtn.type = "button";
    toggleBtn.className = "bot-details-btn";
    toggleBtn.dataset.target = responseId;
    toggleBtn.textContent = "View detailed information";
    message.appendChild(toggleBtn);
  }

  const detailBox = document.createElement("div");
  detailBox.className = "bot-detail-box";
  detailBox.hidden = true;

  if (data.details && data.details.trim()) {
    const detailsText = document.createElement("p");
    detailsText.className = "bot-details-text";
    detailsText.textContent = data.details;
    detailBox.appendChild(detailsText);
  }

  if (Array.isArray(data.steps) && data.steps.length) {
    const stepsTitle = document.createElement("div");
    stepsTitle.className = "bot-section-title";
    stepsTitle.textContent = "Steps";
    detailBox.appendChild(stepsTitle);

    const stepsList = document.createElement("ol");
    stepsList.className = "bot-steps-list";

    data.steps.forEach((step) => {
      const item = document.createElement("li");
      item.textContent = step;
      stepsList.appendChild(item);
    });

    detailBox.appendChild(stepsList);
  }

  if (Array.isArray(data.links) && data.links.length) {
    const linksTitle = document.createElement("div");
    linksTitle.className = "bot-section-title";
    linksTitle.textContent = "Useful links";
    detailBox.appendChild(linksTitle);

    const linksWrap = document.createElement("div");
    linksWrap.className = "bot-links-list";

    data.links.forEach((link) => {
      if (!link || !link.url) return;

      const a = document.createElement("a");
      a.className = "bot-link-chip";
      a.href = link.url;
      a.target = "_blank";
      a.rel = "noopener noreferrer";
      a.textContent = link.label || link.url;
      linksWrap.appendChild(a);
    });

    detailBox.appendChild(linksWrap);
  }

  if (Array.isArray(data.relatedTopics) && data.relatedTopics.length) {
    const relatedTitle = document.createElement("div");
    relatedTitle.className = "bot-section-title";
    relatedTitle.textContent = "Related topics";
    detailBox.appendChild(relatedTitle);

    const relatedWrap = document.createElement("div");
    relatedWrap.className = "bot-related-topics";

    data.relatedTopics.forEach((topic) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "quick-reply-btn related-topic-btn";
      btn.dataset.reply = topic;
      btn.textContent = topic;
      relatedWrap.appendChild(btn);
    });

    detailBox.appendChild(relatedWrap);
  }

  message.appendChild(detailBox);

  const timestamp = document.createElement("div");
  timestamp.className = "message-time bot";
  timestamp.textContent = getCurrentTime();

  wrapper.append(message, timestamp);
  chatBody.appendChild(wrapper);

  addEndIndicator();
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

if (chatBody) {
  chatBody.addEventListener("click", async (event) => {
    const quickReplyButton = event.target.closest(".quick-reply-btn");
    if (quickReplyButton) {
      const reply = quickReplyButton.dataset.reply || "";
      if (!reply.trim()) return;

      storeSentMessage(reply);
      await sendUserMessage(reply);
      return;
    }

    const detailToggle = event.target.closest(".bot-details-btn");
    if (detailToggle) {
      const responseId = detailToggle.dataset.target;
      const parent = chatBody.querySelector(`[data-response-id="${responseId}"]`);
      const detailBox = parent?.querySelector(".bot-detail-box");
      if (!detailBox) return;

      const isHidden = detailBox.hidden;
      detailBox.hidden = !isHidden;
      detailToggle.textContent = isHidden
        ? "Hide detailed information"
        : "View detailed information";

      chatBody.scrollTop = chatBody.scrollHeight;
    }
  });
}

function renderQuickReplies() {
  removeQuickReplies();
}

function removeQuickReplies() {
  const existing = chatBody.querySelector(".quick-replies");
  if (existing) existing.remove();
}

function initializeChat() {
  if (!chatBody) return;

  chatBody.innerHTML = "";
  addMessage(initialBotMessage, "bot");
}

/* =========================
   Restart Chat
========================= */

function restartConversation() {
  sessionId = crypto.randomUUID();
  sentMessageHistory = [];
  historyIndex = 0;
  responseCounter = 0;

  removeTypingIndicator();
  removeEndIndicator();
  removeQuickReplies();

  initializeChat();

  if (chatInput) {
    chatInput.disabled = false;
    chatInput.value = "";
    chatInput.placeholder = "Type your message...";
    chatInput.focus();
  }

  if (sendBtn) {
    sendBtn.disabled = false;
  }

  chatBody.scrollTop = chatBody.scrollHeight;
}

/* =========================
   Send Message
========================= */

async function sendUserMessage(text) {
  if (!text) return;

  removeQuickReplies();
  removeEndIndicator();
  addMessage(text, "user");
  showTypingIndicator();

  try {
    const response = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message: text,
        sessionId: sessionId
      })
    });

    const data = await response.json();
    removeTypingIndicator();

    if (!response.ok) {
      addMessage(data.reply || "Something went wrong.", "bot");
      return;
    }

    addStructuredMessage(data);
  } catch (err) {
    console.error("sendUserMessage error:", err);
    removeTypingIndicator();
    addMessage("Error talking to server. Please try again later.", "bot");
  }
}

async function sendMessage() {
  if (!chatInput) return;

  const text = chatInput.value.trim();
  if (!text) return;

  storeSentMessage(text);
  chatInput.value = "";
  historyIndex = sentMessageHistory.length;

  await sendUserMessage(text);
}

/* =========================
   Feedback Modal
========================= */

function renderFeedbackTags(type) {
  if (!feedbackTags) return;

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

  if (feedbackText) {
    feedbackText.value = "";
  }

  if (feedbackSuccessMsg) {
    feedbackSuccessMsg.classList.remove("show");
  }

  feedbackReactionButtons.forEach((btn) => {
    btn.classList.remove("active");
  });

  if (feedbackTags) {
    feedbackTags.innerHTML = "";
  }
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
  document.body.classList.toggle("large-text", saved === "large");
}

/* =========================
   End Chat
========================= */

function endChat() {
  if (!chatBody || !chatInput || !sendBtn) return;

  addMessage("Chat ended. Thank you for using Ask UniHelp.", "bot");

  chatInput.disabled = true;
  sendBtn.disabled = true;
  chatInput.placeholder = "Chat has ended";
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
    event.preventDefault();
    sendMessage();
    return;
  }

  if (event.key === "ArrowUp") {
    event.preventDefault();
    loadPreviousMessage();
    return;
  }

  if (event.key === "ArrowDown") {
    event.preventDefault();
    loadNextMessage();
  }
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
    comment: feedbackText?.value.trim() || ""
  });

  feedbackSuccessMsg?.classList.add("show");

  setTimeout(() => {
    feedbackModal?.classList.remove("show");
    resetFeedbackModal();
  }, 1200);
});

themeToggle?.addEventListener("click", () => {
  const isDark = document.body.classList.contains("dark-mode");
  const nextTheme = isDark ? "light" : "dark";
  applyTheme(nextTheme);
  localStorage.setItem("theme", nextTheme);
});

fontSizeToggle?.addEventListener("click", () => {
  document.body.classList.toggle("large-text");

  const isLarge = document.body.classList.contains("large-text");
  localStorage.setItem("fontSizeMode", isLarge ? "large" : "normal");
});

/* =========================
   Initial Load
========================= */

applyTheme(localStorage.getItem("theme") || "light");
applyFontSizePreference();
initializeChat();