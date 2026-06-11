let hasInitializedChat = false;
let sessionId = crypto.randomUUID();


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
  "Hi, I’m UniHelp. What can I help you with today?\nI need help with...";

const initialQuickReplies = [
  "Password Reset",
  "Wi-Fi Problem",
  "Student Portal",
  "Talk to Live Agent",
  "Others"
];

const otherQuickReplies = [
  "Student Card Replacement",
  "Tuition Fees",
  "Switch Course Major",
  "Exam Information",
  "Operating Hours",
  "Back"
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

  const willOpen = !chatWindow.classList.contains("open");
  chatWindow.classList.toggle("open");

  if (willOpen && !hasInitializedChat) {
    initializeChat();
  }
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
  if (!chatBody) return;

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
  if (!chatBody) return;

  removeTypingIndicator();

  const wrapper = document.createElement("div");
  wrapper.className = "message-wrapper bot";

  const message = document.createElement("div");
  message.className = "message bot structured-bot-message";

  const responseId = `response-${++responseCounter}`;
  message.dataset.responseId = responseId;

  const summary = document.createElement("p");
  summary.className = "bot-summary";
  message.appendChild(summary);

  const timestamp = document.createElement("div");
  timestamp.className = "message-time bot";
  timestamp.textContent = getCurrentTime();

  wrapper.append(message, timestamp);
  chatBody.appendChild(wrapper);
  chatBody.scrollTop = chatBody.scrollHeight;

  const summaryText =
    data.summary || data.reply || "Sorry, no reply from server.";

  let index = 0;
  const speed = summaryText.length > 140 ? 10 : 18;
  const step = summaryText.length > 140 ? 2 : 1;

  const typingInterval = setInterval(() => {
    index = Math.min(index + step, summaryText.length);
    summary.textContent = summaryText.slice(0, index);
    chatBody.scrollTop = chatBody.scrollHeight;

    if (index >= summaryText.length) {
      clearInterval(typingInterval);
      appendStructuredDetails(message, data, responseId);
      addEndIndicator();
      chatBody.scrollTop = chatBody.scrollHeight;
    }
  }, speed);
}

function appendStructuredDetails(message, data, responseId) {
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
      if (!topic || !topic.intent) return;

      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "quick-reply-btn related-topic-btn";
      btn.dataset.reply = topic.intent;
      btn.dataset.label = topic.label || topic.intent;
      btn.textContent = topic.label || topic.intent;
      relatedWrap.appendChild(btn);
    });

    detailBox.appendChild(relatedWrap);
  }

  message.appendChild(detailBox);
}

function addWelcomeMessageWithQuickReplies(text, replies = []) {
  if (!chatBody) return;

  removeTypingIndicator();
  removeEndIndicator();

  const wrapper = document.createElement("div");
  wrapper.className = "message-wrapper bot";

  const message = document.createElement("div");
  message.className = "message bot welcome-message";
  message.textContent = text;

  const quickReplyWrap = document.createElement("div");
  quickReplyWrap.className = "quick-replies welcome-quick-replies";

  replies.forEach((reply) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "quick-reply-btn";
    btn.dataset.reply = reply;
    btn.textContent = reply;
    quickReplyWrap.appendChild(btn);
  });

  message.appendChild(quickReplyWrap);

  const timestamp = document.createElement("div");
  timestamp.className = "message-time bot";
  timestamp.textContent = getCurrentTime();

  wrapper.append(message, timestamp);
  chatBody.appendChild(wrapper);

  addEndIndicator();
  chatBody.scrollTop = chatBody.scrollHeight;
}


function typeBotMessage(text) {
  removeTypingIndicator();

  const wrapper = document.createElement("div");
  wrapper.className = "message-wrapper bot";

  const message = document.createElement("div");
  message.className = "message bot";

  const timestamp = document.createElement("div");
  timestamp.className = "message-time bot";
  timestamp.textContent = getCurrentTime();

  wrapper.append(message, timestamp);
  chatBody.appendChild(wrapper);
  chatBody.scrollTop = chatBody.scrollHeight;

  let index = 0;
  const speed = 18;

  const typingInterval = setInterval(() => {
    message.textContent = text.slice(0, index + 1);
    index++;
    chatBody.scrollTop = chatBody.scrollHeight;

    if (index >= text.length) {
      clearInterval(typingInterval);
      addEndIndicator();
    }
  }, speed);
}


function showTypingIndicator() {
  if (!chatBody) return;

  removeTypingIndicator();
  removeEndIndicator();

  const typing = document.createElement("div");
  typing.className = "typing-indicator";
  typing.innerHTML = `
    <span class="typing-label">UniHelp is typing</span>
    <span class="typing-dots" aria-hidden="true">
      <span></span><span></span><span></span>
    </span>
  `;

  chatBody.appendChild(typing);
  chatBody.scrollTop = chatBody.scrollHeight;
}

/* =========================
   Quick Replies
========================= */

function renderQuickReplies(replies = []) {
  if (!chatBody || !Array.isArray(replies) || replies.length === 0) return;

  const oldQuickReplies = chatBody.querySelector(".quick-replies-wrapper:last-child");
  if (oldQuickReplies) oldQuickReplies.remove();

  const wrapper = document.createElement("div");
  wrapper.className = "quick-replies-wrapper bot";

  const repliesContainer = document.createElement("div");
  repliesContainer.className = "quick-replies";

  replies.forEach((text) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "quick-reply-btn";
    btn.textContent = text;
    btn.dataset.reply = text;
    repliesContainer.appendChild(btn);
  });

  wrapper.appendChild(repliesContainer);
  chatBody.appendChild(wrapper);
  chatBody.scrollTop = chatBody.scrollHeight;
}

function clearQuickReplies() {
  const oldQuickReplies = chatBody?.querySelector(".quick-replies-wrapper:last-child");
  if (oldQuickReplies) oldQuickReplies.remove();
}

function initializeChat() {
  if (!chatBody) return;

  chatBody.innerHTML = "";
  showTypingIndicator();

  setTimeout(() => {
    removeTypingIndicator();
    addWelcomeMessageWithQuickReplies(initialBotMessage, initialQuickReplies);
    hasInitializedChat = true;
  }, 1000);
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

async function sendUserMessage(text, isIntentSelection = false, displayText = null) {
  if (!text) return;

  removeEndIndicator();
  addMessage(displayText || text, "user");
  showTypingIndicator();

  try {
    const response = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message: text,
        sessionId: sessionId,
        isIntentSelection: isIntentSelection
      })
    });

    const data = await response.json();
    removeTypingIndicator();

    if (!response.ok) {
      typeBotMessage(data.reply || "Something went wrong.");
      return;
    }

    addStructuredMessage(data);

    if (Array.isArray(data.quickReplies) && data.quickReplies.length > 0) {
      renderQuickReplies(data.quickReplies);
    } else {
      clearQuickReplies();
    }


  } catch (err) {
    console.error("sendUserMessage error:", err);
    removeTypingIndicator();
    typeBotMessage("Error talking to server. Please try again later.");
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

  document.querySelectorAll(".quick-reply-btn").forEach((button) => {
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

chatBody?.addEventListener("click", async (event) => {
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
    return;
  }

  const relatedTopicBtn = event.target.closest(".related-topic-btn");
  if (relatedTopicBtn) {
    const reply = relatedTopicBtn.dataset.reply || "";
    const label = relatedTopicBtn.dataset.label || reply;
    if (!reply.trim()) return;

    clearQuickReplies();
    storeSentMessage(label);
    await sendUserMessage(reply, true, label);
    return;
  }

  const quickReplyBtn = event.target.closest(".quick-reply-btn");
  if (quickReplyBtn) {
    const reply = quickReplyBtn.dataset.reply || "";
    if (!reply.trim()) return;

    const welcomeReplies = chatBody.querySelector(".welcome-quick-replies");

    if (reply === "Others") {
      if (welcomeReplies) {
        welcomeReplies.innerHTML = "";

        otherQuickReplies.forEach((item) => {
          const btn = document.createElement("button");
          btn.type = "button";
          btn.className = "quick-reply-btn";
          btn.dataset.reply = item;
          btn.textContent = item;
          welcomeReplies.appendChild(btn);
        });
      }
      return;
    }

    if (reply === "Back") {
      if (welcomeReplies) {
        welcomeReplies.innerHTML = "";

        initialQuickReplies.forEach((item) => {
          const btn = document.createElement("button");
          btn.type = "button";
          btn.className = "quick-reply-btn";
          btn.dataset.reply = item;
          btn.textContent = item;
          welcomeReplies.appendChild(btn);
        });
      }
      return;
    }

    clearQuickReplies();
    storeSentMessage(reply);
    await sendUserMessage(reply, false, reply);
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