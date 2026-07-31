let sessionId = crypto.randomUUID();
let awaitingLiveSupportTopic = false;
let activeTicketId = null;
let lastMessageId = 0;
let liveChatInterval = null;

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
  "Student Portal",
  "Talk to Live Agent",
  "Others"
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
  if (!chatBody) return;

  removeTypingIndicator();

  if (sender === "cso" || sender === "system") {
    removeEndIndicator();
  }

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

  if (sender === "bot" && !activeTicketId) {
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

  const timestamp = document.createElement("div");
  timestamp.className = "message-time bot";
  timestamp.textContent = getCurrentTime();

  wrapper.append(message, timestamp);
  chatBody.appendChild(wrapper);

  addEndIndicator();
  chatBody.scrollTop = chatBody.scrollHeight;
}

function showTypingIndicator() {
  if (!chatBody) return;

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
  if (!chatBody) return;

  chatBody
    .querySelectorAll(".quick-replies-wrapper")
    .forEach((wrapper) => wrapper.remove());
}

function initializeChat() {
  if (!chatBody) return;

  chatBody.innerHTML = "";
  addMessage(initialBotMessage, "bot");
  renderQuickReplies(initialQuickReplies);
}

/* =========================
   Restart Chat
========================= */

function restartConversation() {
  sessionId = crypto.randomUUID();

  sentMessageHistory = [];
  historyIndex = 0;
  responseCounter = 0;

  awaitingLiveSupportTopic = false;
  activeTicketId = null;
  lastMessageId = 0;

  if (liveChatInterval) {
    clearInterval(liveChatInterval);
    liveChatInterval = null;
  }

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
   Sensitive Data Masking
========================= */

function maskNamePart(namePart) {
  if (!namePart) return "";

  if (namePart.length === 1) {
    return "*";
  }

  return namePart[0] + "*".repeat(namePart.length - 1);
}

function maskSensitiveData(originalText) {
  let maskedText = String(originalText || "");
  const detectedTypes = new Set();

  // Singapore NRIC and FIN:
  // Examples: S1234567D, T1234567A, F1234567N, G1234567X
  maskedText = maskedText.replace(
    /\b([STFGM])(\d{6})(\d)([A-Z])\b/gi,
    (match, prefix, middleDigits, finalDigit, suffix) => {
      detectedTypes.add("identification number");

      return (
        prefix.toUpperCase() +
        "******" +
        finalDigit +
        suffix.toUpperCase()
      );
    }
  );

  // Email addresses
  maskedText = maskedText.replace(
    /\b([A-Z0-9._%+-]+)@([A-Z0-9.-]+\.[A-Z]{2,})\b/gi,
    (match, localPart, domain) => {
      detectedTypes.add("email address");

      const firstCharacter = localPart.charAt(0);

      return (
        firstCharacter +
        "*".repeat(Math.max(3, localPart.length - 1)) +
        "@" +
        domain
      );
    }
  );

  // Singapore mobile or landline numbers
  // Optional +65 prefix and optional spaces/hyphens
  maskedText = maskedText.replace(
    /\b(?:\+65[\s-]?)?([3689]\d{1})[\s-]?(\d{4})[\s-]?(\d{2})\b/g,
    (match, firstTwoDigits, middleDigits, finalTwoDigits) => {
      detectedTypes.add("phone number");

      return `${firstTwoDigits}****${finalTwoDigits}`;
    }
  );

  // Names explicitly introduced using "my name is"
  maskedText = maskedText.replace(
    /\b(my name is\s+)([A-Za-z][A-Za-z'-]*(?:\s+[A-Za-z][A-Za-z'-]*){0,3})/gi,
    (match, introduction, fullName) => {
      detectedTypes.add("name");

      const maskedName = fullName
        .split(/\s+/)
        .map(maskNamePart)
        .join(" ");

      return introduction + maskedName;
    }
  );

  return {
    originalText: String(originalText || ""),
    maskedText,
    containsSensitiveData: detectedTypes.size > 0,
    detectedTypes: Array.from(detectedTypes),
  };
}

function showSensitiveDataNotice(detectedTypes) {
  const types = Array.isArray(detectedTypes)
    ? detectedTypes.join(", ")
    : "personal information";

  addMessage(
    `🔒 Sensitive data detected: ${types}.\n\n` +
    "Your personal information has been masked in your chat view. " +
    "The original information is only sent to the Customer Service Officer " +
    "when you are using live support.",
    "system"
  );
}

/* =========================
   Send Message
========================= */

async function sendUserMessage(text, isIntentSelection = false, displayText = null) {
  if (!text) return;

  removeEndIndicator();

  // If connected to a live CSO, send directly to the chat API
  if (activeTicketId) {

    addMessage(displayText || text, "user");

    try {

      await fetch("/api/chat/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ticketId: activeTicketId,
          sender: "student",
          message: text
        })
      });

    } catch (err) {

      console.error(err);
      addMessage("Unable to send message to CSO.", "bot");

    }

    return;
  }

  // Normal Dialogflow chatbot
  addMessage(displayText || text, "user");
  showTypingIndicator();

  try {
    const response = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message: displayText || text,
        sessionId: sessionId,
        isIntentSelection: isIntentSelection,
        isLiveSupportTopic: awaitingLiveSupportTopic
      })
    });

    const data = await response.json();
    removeTypingIndicator();

    if (!response.ok) {
      addMessage(data.reply || "Something went wrong.", "bot");
      renderQuickReplies(initialQuickReplies);
      return;
    }

    addStructuredMessage(data);

    if (data.intent === "LiveAgentTopicSelection") {
      awaitingLiveSupportTopic = true;
    }

    if (
      data.intent === "LiveAgentEscalation" &&
      data.ticketId
    ) {
      awaitingLiveSupportTopic = false;
      clearQuickReplies();

      activeTicketId = data.ticketId;
      lastMessageId = 0;
      startLiveChat();
    }

    if (
      Array.isArray(data.quickReplies) &&
      data.quickReplies.length > 0
    ) {
      renderQuickReplies(data.quickReplies);
    } else {
      clearQuickReplies();
    }

  } catch (err) {

    console.error("sendUserMessage error:", err);

    removeTypingIndicator();

    addMessage("Error talking to server. Please try again later.", "bot");

    renderQuickReplies(initialQuickReplies);

  }
}

async function loadLiveMessages() {
  if (!activeTicketId) return;

  try {
    const response = await fetch(
      `/api/chat/${encodeURIComponent(activeTicketId)}?t=${Date.now()}`,
      {
        method: "GET",
        cache: "no-store"
      }
    );

    if (!response.ok) {
      throw new Error(
        `Unable to load live messages: ${response.status}`
      );
    }

    const messages = await response.json();

    messages.forEach((msg) => {
      if (msg.id <= lastMessageId) return;

      lastMessageId = msg.id;

      if (msg.sender === "cso") {
        addMessage(msg.message, "cso");
      } else if (msg.sender === "system") {
        addMessage(msg.message, "system");
      }
    });
  } catch (error) {
    console.error("Live-message polling error:", error);
  }
}

function startLiveChat() {
  if (liveChatInterval) {
    clearInterval(liveChatInterval);
  }

  loadLiveMessages();

  liveChatInterval = setInterval(
    loadLiveMessages,
    1000
  );
}

async function sendMessage() {
  if (!chatInput) return;

  const originalText = chatInput.value.trim();

  if (!originalText) {
    return;
  }

  const privacyResult = maskSensitiveData(originalText);

  storeSentMessage(originalText);

  chatInput.value = "";
  historyIndex = sentMessageHistory.length;

  await sendUserMessage(
    privacyResult.originalText,
    false,
    privacyResult.maskedText
  );

  if (privacyResult.containsSensitiveData) {
    showSensitiveDataNotice(
      privacyResult.detectedTypes
    );
  }
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
initializeChat();