const chatLauncher = document.getElementById("chatLauncher");
const chatWindow = document.getElementById("chatWindow");
const restartChat = document.getElementById("restartChat");
const minimizeChat = document.getElementById("minimizeChat");
const closeChat = document.getElementById("closeChat");
const sendBtn = document.getElementById("sendBtn");
const chatInput = document.getElementById("chatInput");
const chatBody = document.getElementById("chatBody");
const quickReplies = document.getElementById("quickReplies");
const noticeClose = document.querySelector(".notice-close");
const noticeBar = document.querySelector(".notice-bar");

const initialBotMessage =
  "Hi, I’m UniHelp. I can assist with password reset, portal access, Wi-Fi issues, and common campus enquiries.";

const initialQuickReplies = [
  "Password Reset",
  "Wi-Fi Problem",
  "Student Portal Help",
  "Talk to Live Agent"
];

if (noticeClose && noticeBar) {
  noticeClose.addEventListener("click", () => {
    noticeBar.style.display = "none";
  });
}

function toggleChat() {
  if (!chatWindow) return;
  chatWindow.classList.toggle("open");
}

function closeChatWindow() {
  if (!chatWindow) return;
  chatWindow.classList.remove("open");
}

function getCurrentTime() {
  return new Date().toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit"
  });
}

function removeTypingIndicator() {
  if (!chatBody) return;
  const existingTyping = chatBody.querySelector(".typing-indicator");
  if (existingTyping) {
    existingTyping.remove();
  }
}

function removeEndIndicator() {
  if (!chatBody) return;
  const existingEndIndicator = chatBody.querySelector(".end-indicator:last-child");
  if (existingEndIndicator) {
    existingEndIndicator.remove();
  }
}

function addEndIndicator() {
  if (!chatBody) return;

  removeEndIndicator();

  const endIndicator = document.createElement("div");
  endIndicator.className = "end-indicator";
  endIndicator.textContent = "End of response";
  chatBody.appendChild(endIndicator);
  chatBody.scrollTop = chatBody.scrollHeight;
}

function addMessage(text, sender = "bot") {
  if (!chatBody) return;

  removeTypingIndicator();

  const messageWrapper = document.createElement("div");
  messageWrapper.className = `message-wrapper ${sender}`;

  const message = document.createElement("div");
  message.className = `message ${sender}`;
  message.textContent = text;

  const timestamp = document.createElement("div");
  timestamp.className = `message-time ${sender}`;
  timestamp.textContent = getCurrentTime();

  messageWrapper.appendChild(message);
  messageWrapper.appendChild(timestamp);
  chatBody.appendChild(messageWrapper);

  if (sender === "bot") {
    addEndIndicator();
  }

  chatBody.scrollTop = chatBody.scrollHeight;
}

function showTypingIndicator() {
  if (!chatBody) return;

  removeTypingIndicator();
  removeEndIndicator();

  const typing = document.createElement("div");
  typing.className = "typing-indicator";
  typing.innerHTML = `
    <span class="typing-bubble">UniHelp is typing<span class="typing-dots">...</span></span>
  `;

  chatBody.appendChild(typing);
  chatBody.scrollTop = chatBody.scrollHeight;
}

function renderQuickReplies(options = []) {
  if (!quickReplies) return;

  quickReplies.innerHTML = "";
  options.forEach((option) => {
    const button = document.createElement("button");
    button.type = "button";
    button.dataset.reply = option;
    button.textContent = option;
    quickReplies.appendChild(button);
  });
}

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
    return "You can check timetable and exam-related information through the student portal. I can also guide you to the relevant support section.";
  }

  return "Sorry, I’m not fully sure what you mean. Please rephrase your question or choose one of the quick reply options.";
}

function sendMessage() {
  if (!chatInput) return;

  const text = chatInput.value.trim();
  if (!text) return;

  removeEndIndicator();
  addMessage(text, "user");
  chatInput.value = "";
  showTypingIndicator();

  setTimeout(() => {
    addMessage(getBotReply(text), "bot");
  }, 900);
}

if (chatLauncher) {
  chatLauncher.addEventListener("click", toggleChat);
}

if (restartChat) {
  restartChat.addEventListener("click", restartConversation);
}

if (minimizeChat) {
  minimizeChat.addEventListener("click", closeChatWindow);
}

if (closeChat) {
  closeChat.addEventListener("click", closeChatWindow);
}

if (sendBtn) {
  sendBtn.addEventListener("click", sendMessage);
}

if (chatInput) {
  chatInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      sendMessage();
    }
  });
}

if (quickReplies) {
  quickReplies.addEventListener("click", (event) => {
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
}