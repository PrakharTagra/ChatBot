(function () {
  "use strict";

  // ─── Default config ────────────────────────────────────────────────
  const DEFAULTS = {
    websiteId: "default",
    apiUrl: "http://localhost:5000",
    title: "Website Assistant",
    welcomeMessage: "👋 Hi! I can answer questions about this website. What would you like to know?",
    primaryColor: "#6c63ff",
    position: "bottom-right",
  };

  // ─── Merge user config ─────────────────────────────────────────────
  let cfg = Object.assign({}, DEFAULTS);

  // ─── CSS (scoped under .cw- prefix to avoid host-page conflicts) ───
  const CSS = `
    .cw-launcher {
      position: fixed;
      width: 56px;
      height: 56px;
      border-radius: 50%;
      background: var(--cw-primary);
      color: #fff;
      border: none;
      cursor: pointer;
      box-shadow: 0 4px 20px rgba(0,0,0,0.25);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 2147483640;
      transition: transform 0.2s ease, box-shadow 0.2s ease;
    }
    .cw-launcher:hover { transform: scale(1.08); box-shadow: 0 6px 28px rgba(0,0,0,0.3); }
    .cw-launcher-br { bottom: 24px; right: 24px; }
    .cw-launcher-bl { bottom: 24px; left: 24px; }

    .cw-badge {
      position: absolute;
      top: -2px; right: -2px;
      width: 18px; height: 18px;
      background: #ff4757;
      border-radius: 50%;
      font-size: 10px;
      font-weight: 700;
      display: flex;
      align-items: center;
      justify-content: center;
      color: #fff;
      animation: cw-pop 0.3s ease;
    }

    .cw-window {
      position: fixed;
      width: 360px;
      height: 520px;
      background: #0f0f17;
      border-radius: 16px;
      box-shadow: 0 12px 60px rgba(0,0,0,0.45);
      display: flex;
      flex-direction: column;
      overflow: hidden;
      z-index: 2147483641;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      transition: opacity 0.22s ease, transform 0.22s ease;
    }
    .cw-window-br { bottom: 90px; right: 24px; }
    .cw-window-bl { bottom: 90px; left: 24px; }
    .cw-window.cw-hidden { opacity: 0; transform: translateY(16px) scale(0.97); pointer-events: none; }

    .cw-header {
      padding: 16px 18px;
      background: var(--cw-primary);
      display: flex;
      align-items: center;
      justify-content: space-between;
      flex-shrink: 0;
    }
    .cw-header-left { display: flex; align-items: center; gap: 10px; }
    .cw-avatar {
      width: 34px; height: 34px;
      background: rgba(255,255,255,0.25);
      border-radius: 50%;
      display: flex; align-items: center; justify-content: center;
      font-size: 16px;
    }
    .cw-title { font-size: 15px; font-weight: 700; color: #fff; }
    .cw-subtitle { font-size: 11px; color: rgba(255,255,255,0.75); margin-top: 1px; }
    .cw-close-btn {
      background: rgba(255,255,255,0.15);
      border: none;
      color: #fff;
      width: 28px; height: 28px;
      border-radius: 50%;
      cursor: pointer;
      display: flex; align-items: center; justify-content: center;
      font-size: 16px;
      transition: background 0.15s;
    }
    .cw-close-btn:hover { background: rgba(255,255,255,0.25); }

    .cw-messages {
      flex: 1;
      overflow-y: auto;
      padding: 16px;
      display: flex;
      flex-direction: column;
      gap: 12px;
      background: #0f0f17;
    }
    .cw-messages::-webkit-scrollbar { width: 4px; }
    .cw-messages::-webkit-scrollbar-track { background: transparent; }
    .cw-messages::-webkit-scrollbar-thumb { background: #2a2a3d; border-radius: 2px; }

    .cw-msg { display: flex; align-items: flex-end; gap: 8px; animation: cw-slide 0.2s ease; }
    .cw-msg-user { flex-direction: row-reverse; }
    .cw-bubble {
      max-width: 78%;
      padding: 10px 14px;
      border-radius: 16px;
      font-size: 13.5px;
      line-height: 1.55;
      word-break: break-word;
    }
    .cw-bubble-bot {
      background: #1e1e2e;
      color: #e0e0f0;
      border-bottom-left-radius: 4px;
      border: 1px solid #2a2a40;
    }
    .cw-bubble-user {
      background: var(--cw-primary);
      color: #fff;
      border-bottom-right-radius: 4px;
    }

    .cw-source {
      display: block;
      margin-top: 7px;
      font-size: 11px;
      color: #43e8d8;
      text-decoration: none;
      opacity: 0.85;
    }
    .cw-source:hover { opacity: 1; }

    .cw-typing {
      display: flex;
      align-items: center;
      gap: 5px;
      padding: 12px 14px;
    }
    .cw-dot {
      width: 7px; height: 7px;
      background: #555;
      border-radius: 50%;
      animation: cw-bounce 1.2s ease infinite;
    }
    .cw-dot:nth-child(2) { animation-delay: 0.15s; }
    .cw-dot:nth-child(3) { animation-delay: 0.3s; }

    .cw-contact-form {
      background: #16162a;
      border-top: 1px solid #2a2a40;
      padding: 14px 16px;
      flex-shrink: 0;
    }
    .cw-contact-title {
      font-size: 12px;
      font-weight: 700;
      color: #f7b731;
      margin-bottom: 10px;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }
    .cw-contact-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 7px;
      margin-bottom: 7px;
    }
    .cw-input {
      width: 100%;
      background: #0f0f17;
      border: 1px solid #2a2a40;
      border-radius: 8px;
      color: #e0e0f0;
      font-size: 12.5px;
      font-family: inherit;
      padding: 8px 10px;
      outline: none;
      box-sizing: border-box;
      transition: border-color 0.15s;
    }
    .cw-input:focus { border-color: var(--cw-primary); }
    .cw-input::placeholder { color: #555; }
    .cw-submit-btn {
      width: 100%;
      background: var(--cw-primary);
      color: #fff;
      border: none;
      border-radius: 8px;
      padding: 9px;
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
      margin-top: 7px;
      transition: opacity 0.15s;
      font-family: inherit;
    }
    .cw-submit-btn:hover { opacity: 0.88; }
    .cw-submit-btn:disabled { opacity: 0.5; cursor: not-allowed; }

    .cw-input-row {
      display: flex;
      gap: 8px;
      padding: 12px 14px;
      background: #0f0f17;
      border-top: 1px solid #1e1e2e;
      flex-shrink: 0;
    }
    .cw-text-input {
      flex: 1;
      background: #1e1e2e;
      border: 1px solid #2a2a40;
      border-radius: 10px;
      color: #e0e0f0;
      font-size: 13px;
      font-family: inherit;
      padding: 9px 12px;
      outline: none;
      resize: none;
      height: 38px;
      transition: border-color 0.15s;
      box-sizing: border-box;
    }
    .cw-text-input:focus { border-color: var(--cw-primary); }
    .cw-text-input::placeholder { color: #555; }
    .cw-send-btn {
      background: var(--cw-primary);
      color: #fff;
      border: none;
      border-radius: 10px;
      width: 38px;
      height: 38px;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      flex-shrink: 0;
      transition: opacity 0.15s;
    }
    .cw-send-btn:hover { opacity: 0.85; }
    .cw-send-btn:disabled { opacity: 0.4; cursor: not-allowed; }

    .cw-success-msg {
      font-size: 13px;
      color: #3dd68c;
      text-align: center;
      padding: 8px 0;
    }

    @keyframes cw-slide {
      from { opacity: 0; transform: translateY(8px); }
      to   { opacity: 1; transform: translateY(0); }
    }
    @keyframes cw-bounce {
      0%, 60%, 100% { transform: translateY(0); }
      30% { transform: translateY(-5px); }
    }
    @keyframes cw-pop {
      from { transform: scale(0); }
      to   { transform: scale(1); }
    }

    @media (max-width: 420px) {
      .cw-window { width: calc(100vw - 16px); right: 8px !important; left: 8px !important; }
    }
  `;

  // ─── State ─────────────────────────────────────────────────────────
  let isOpen = false;
  let hasUnread = false;
  let messages = [];         // { role: 'user'|'bot', text, source }
  let showContactForm = false;
  let contactSubmitted = false;

  // ─── DOM refs ──────────────────────────────────────────────────────
  let launcher, badge, chatWindow, msgContainer, textInput, sendBtn;
  let contactForm, contactNameEl, contactEmailEl, contactPhoneEl, contactMsgEl, submitBtn;

  // ─── Init ──────────────────────────────────────────────────────────
  function init(userConfig) {
    cfg = Object.assign({}, DEFAULTS, userConfig);
    injectCSS();
    buildDOM();
    addListeners();
    appendBotMessage(cfg.welcomeMessage);
  }

  function injectCSS() {
    const style = document.createElement("style");
    style.textContent = CSS.replace(/var\(--cw-primary\)/g, cfg.primaryColor);
    document.head.appendChild(style);
  }

  // ─── Build DOM ─────────────────────────────────────────────────────
  function buildDOM() {
    const posClass = cfg.position === "bottom-left" ? "bl" : "br";

    // Launcher button
    launcher = el("button", `cw-launcher cw-launcher-${posClass}`);
    launcher.innerHTML = iconChat();
    launcher.setAttribute("aria-label", "Open chat");

    // Unread badge
    badge = el("span", "cw-badge");
    badge.textContent = "1";
    badge.style.display = "none";
    launcher.appendChild(badge);

    // Chat window
    chatWindow = el("div", `cw-window cw-window-${posClass} cw-hidden`);
    chatWindow.setAttribute("role", "dialog");
    chatWindow.setAttribute("aria-label", cfg.title);

    // Header
    const header = el("div", "cw-header");
    header.innerHTML = `
      <div class="cw-header-left">
        <div class="cw-avatar">🤖</div>
        <div>
          <div class="cw-title">${escHtml(cfg.title)}</div>
          <div class="cw-subtitle">AI-powered · Online</div>
        </div>
      </div>
    `;
    const closeBtn = el("button", "cw-close-btn");
    closeBtn.innerHTML = "✕";
    closeBtn.setAttribute("aria-label", "Close chat");
    closeBtn.onclick = toggleChat;
    header.querySelector(".cw-header-left").after(closeBtn);

    // Messages area
    msgContainer = el("div", "cw-messages");
    msgContainer.setAttribute("aria-live", "polite");

    // Contact form (hidden by default)
    contactForm = buildContactForm();
    contactForm.style.display = "none";

    // Text input row
    const inputRow = el("div", "cw-input-row");
    textInput = el("textarea", "cw-text-input");
    textInput.placeholder = "Ask me anything…";
    textInput.rows = 1;
    sendBtn = el("button", "cw-send-btn");
    sendBtn.innerHTML = iconSend();
    sendBtn.setAttribute("aria-label", "Send");
    inputRow.append(textInput, sendBtn);

    chatWindow.append(header, msgContainer, contactForm, inputRow);
    document.body.append(launcher, chatWindow);
  }

  function buildContactForm() {
    const form = el("div", "cw-contact-form");
    form.innerHTML = `
      <div class="cw-contact-title">📋 Leave your details — we'll get back to you</div>
      <div class="cw-contact-grid">
        <input class="cw-input" placeholder="Your name *" id="cw-name" />
        <input class="cw-input" placeholder="Email *" type="email" id="cw-email" />
      </div>
      <input class="cw-input" placeholder="Phone (optional)" id="cw-phone" style="margin-bottom:7px" />
      <textarea class="cw-input" placeholder="Your question / message *" id="cw-msg" rows="2" style="resize:none;margin-bottom:7px"></textarea>
      <button class="cw-submit-btn" id="cw-submit">Send Message</button>
    `;
    return form;
  }

  // ─── Event listeners ───────────────────────────────────────────────
  function addListeners() {
    launcher.onclick = toggleChat;

    sendBtn.onclick = sendMessage;
    textInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
      }
    });

    // Contact form submit — wired after DOM inserted
    document.addEventListener("click", (e) => {
      if (e.target && e.target.id === "cw-submit") submitContact();
    });
  }

  // ─── Toggle open/close ─────────────────────────────────────────────
  function toggleChat() {
    isOpen = !isOpen;
    chatWindow.classList.toggle("cw-hidden", !isOpen);
    launcher.innerHTML = isOpen ? iconX() : iconChat();
    if (isOpen) {
      badge.style.display = "none";
      hasUnread = false;
      setTimeout(() => textInput.focus(), 220);
      scrollToBottom();
    }
  }

  // ─── Send chat message ─────────────────────────────────────────────
  async function sendMessage() {
    const text = textInput.value.trim();
    if (!text) return;
    textInput.value = "";
    sendBtn.disabled = true;

    appendUserMessage(text);
    const typingEl = appendTyping();

    try {
      const res = await fetch(`${cfg.apiUrl}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text, websiteId: cfg.websiteId }),
      });
      const data = await res.json();

      typingEl.remove();
      appendBotMessage(data.answer, data.source);

      if (!data.confident) {
        showContactForm = true;
        contactForm.style.display = "block";
        if (!contactSubmitted) scrollToBottom();
      }
    } catch (err) {
      typingEl.remove();
      appendBotMessage("Sorry, I couldn't connect to the server. Please try again.");
    } finally {
      sendBtn.disabled = false;
      if (!isOpen) {
        hasUnread = true;
        badge.style.display = "flex";
      }
      scrollToBottom();
    }
  }

  // ─── Submit contact form ───────────────────────────────────────────
  async function submitContact() {
    const name = document.getElementById("cw-name")?.value.trim();
    const email = document.getElementById("cw-email")?.value.trim();
    const phone = document.getElementById("cw-phone")?.value.trim();
    const message = document.getElementById("cw-msg")?.value.trim();

    if (!name || !email || !message) {
      alert("Please fill in your name, email, and message.");
      return;
    }

    const btn = document.getElementById("cw-submit");
    if (btn) { btn.disabled = true; btn.textContent = "Sending…"; }

    try {
      await fetch(`${cfg.apiUrl}/api/contact`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, phone, message, websiteId: cfg.websiteId }),
      });

      contactSubmitted = true;
      contactForm.innerHTML = `<div class="cw-success-msg">✅ Thanks ${escHtml(name)}! We'll be in touch shortly.</div>`;
      appendBotMessage(`Thanks ${escHtml(name)}! I've saved your message and someone will reach out to you at ${escHtml(email)}.`);
      scrollToBottom();
    } catch {
      if (btn) { btn.disabled = false; btn.textContent = "Send Message"; }
      alert("Submission failed. Please try again.");
    }
  }

  // ─── Message helpers ───────────────────────────────────────────────
  function appendUserMessage(text) {
    const wrap = el("div", "cw-msg cw-msg-user");
    const bubble = el("div", "cw-bubble cw-bubble-user");
    bubble.textContent = text;
    wrap.appendChild(bubble);
    msgContainer.appendChild(wrap);
    messages.push({ role: "user", text });
    scrollToBottom();
  }

  function appendBotMessage(text, source) {
    const wrap = el("div", "cw-msg");
    const bubble = el("div", "cw-bubble cw-bubble-bot");
    bubble.textContent = text;
    if (source) {
      const link = document.createElement("a");
      link.href = source;
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      link.className = "cw-source";
      link.textContent = "🔗 " + source;
      bubble.appendChild(link);
    }
    wrap.appendChild(bubble);
    msgContainer.appendChild(wrap);
    messages.push({ role: "bot", text, source });
    scrollToBottom();
    return wrap;
  }

  function appendTyping() {
    const wrap = el("div", "cw-msg");
    const bubble = el("div", "cw-bubble cw-bubble-bot cw-typing");
    bubble.innerHTML = `<span class="cw-dot"></span><span class="cw-dot"></span><span class="cw-dot"></span>`;
    wrap.appendChild(bubble);
    msgContainer.appendChild(wrap);
    scrollToBottom();
    return wrap;
  }

  function scrollToBottom() {
    requestAnimationFrame(() => {
      msgContainer.scrollTop = msgContainer.scrollHeight;
    });
  }

  // ─── Utility ───────────────────────────────────────────────────────
  function el(tag, className) {
    const e = document.createElement(tag);
    if (className) e.className = className;
    return e;
  }

  function escHtml(str) {
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function iconChat() {
    return `<svg width="24" height="24" viewBox="0 0 24 24" fill="none">
      <path d="M20 2H4C2.9 2 2 2.9 2 4v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z" fill="currentColor"/>
    </svg>`;
  }

  function iconX() {
    return `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
      <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
    </svg>`;
  }

  function iconSend() {
    return `<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
      <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/>
    </svg>`;
  }

  // ─── Expose global API ─────────────────────────────────────────────
  window.ChatWidget = { init };
})();