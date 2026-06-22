(() => {
  (function () {
    try {
      "use strict";

      const DEFAULTS = {
        websiteId: "default",
        apiUrl: "https://chatbot-gurp.onrender.com",
        title: "Website Assistant",
        welcomeMessage: "Hi! I can answer questions about this website. What would you like to know?",
        primaryColor: "#6c63ff",
        position: "bottom-right",
        logoUrl: "",
      };

      let cfg = Object.assign({}, DEFAULTS);

      const CSS = `
    .cw-launcher {
      position: fixed;
      width: 56px; height: 56px;
      border-radius: 50%;
      background: var(--cw-primary);
      color: #fff; border: none; cursor: pointer;
      box-shadow: 0 4px 20px rgba(0,0,0,0.25);
      display: flex; align-items: center; justify-content: center;
      z-index: 2147483640;
      transition: transform 0.2s ease, box-shadow 0.2s ease;
    }
    .cw-launcher:hover { transform: scale(1.08); box-shadow: 0 6px 28px rgba(0,0,0,0.3); }
    .cw-launcher-br { bottom: 24px; right: 24px; }
    .cw-launcher-bl { bottom: 24px; left: 24px; }

    .cw-badge {
      position: absolute; top: -2px; right: -2px;
      width: 18px; height: 18px;
      background: #ff4757; border-radius: 50%;
      font-size: 10px; font-weight: 700;
      display: flex; align-items: center; justify-content: center;
      color: #fff; animation: cw-pop 0.3s ease;
    }

    .cw-window {
      position: fixed;
      width: 360px; height: 520px;
      background: #0f0f17; border-radius: 16px;
      box-shadow: 0 12px 60px rgba(0,0,0,0.45);
      display: flex; flex-direction: column;
      overflow: hidden; z-index: 2147483641;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      transition: opacity 0.22s ease, transform 0.22s ease;
    }
    .cw-window-br { bottom: 90px; right: 24px; }
    .cw-window-bl { bottom: 90px; left: 24px; }
    .cw-window.cw-hidden { opacity: 0; transform: translateY(16px) scale(0.97); pointer-events: none; }

    .cw-header {
      padding: 14px 16px;
      background: var(--cw-primary);
      display: flex; align-items: center; justify-content: space-between;
      flex-shrink: 0;
    }
    .cw-header-left { display: flex; align-items: center; gap: 10px; }
    .cw-avatar {
      width: 32px; height: 32px;
      background: rgba(255,255,255,0.25); border-radius: 50%;
      display: flex; align-items: center; justify-content: center; font-size: 15px;
      flex-shrink: 0; overflow: hidden;
    }
    .cw-avatar img {
      width: 100%; height: 100%; object-fit: cover; border-radius: 50%;
    }
    .cw-title { font-size: 14px; font-weight: 700; color: #fff; }
    .cw-subtitle { font-size: 11px; color: rgba(255,255,255,0.75); margin-top: 1px; }
    .cw-close-btn {
      background: rgba(255,255,255,0.15); border: none; color: #fff;
      width: 28px; height: 28px; border-radius: 50%; cursor: pointer;
      display: flex; align-items: center; justify-content: center; font-size: 16px;
      transition: background 0.15s;
    }
    .cw-close-btn:hover { background: rgba(255,255,255,0.25); }

    .cw-messages {
      flex: 1; overflow-y: auto; padding: 14px;
      display: flex; flex-direction: column; gap: 10px;
      background: #0f0f17;
    }
    .cw-messages::-webkit-scrollbar { width: 4px; }
    .cw-messages::-webkit-scrollbar-track { background: transparent; }
    .cw-messages::-webkit-scrollbar-thumb { background: #2a2a3d; border-radius: 2px; }

    .cw-msg { display: flex; align-items: flex-end; gap: 8px; animation: cw-slide 0.2s ease; }
    .cw-msg-user { flex-direction: row-reverse; }
    .cw-bubble {
      max-width: 80%; padding: 9px 13px;
      border-radius: 14px; font-size: 13.5px;
      line-height: 1.55; word-break: break-word;
      white-space: pre-wrap;
    }
    .cw-bubble-bot {
      background: #1e1e2e; color: #e0e0f0;
      border-bottom-left-radius: 4px; border: 1px solid #2a2a40;
    }
    .cw-bubble-user {
      background: var(--cw-primary); color: #fff;
      border-bottom-right-radius: 4px;
    }

    .cw-source-chip {
      display: inline-flex; align-items: center; gap: 4px;
      margin-top: 6px; padding: 3px 8px;
      background: rgba(67,232,216,0.1); border: 1px solid rgba(67,232,216,0.25);
      border-radius: 20px; font-size: 11px; color: #43e8d8;
      text-decoration: none; max-width: 100%; overflow: hidden;
      white-space: nowrap; text-overflow: ellipsis;
    }
    .cw-source-chip:hover { background: rgba(67,232,216,0.18); }

    /* Lead capture inline input */
    .cw-lead-input-row {
      display: flex; gap: 6px; margin-top: 8px;
    }
    .cw-lead-input {
      flex: 1; background: #0f0f17; border: 1px solid #2a2a40;
      border-radius: 8px; color: #e0e0f0; font-size: 13px;
      font-family: inherit; padding: 7px 10px; outline: none;
    }
    .cw-lead-input:focus { border-color: var(--cw-primary); }
    .cw-lead-input::placeholder { color: #555; }
    .cw-lead-submit {
      background: var(--cw-primary); color: #fff; border: none;
      border-radius: 8px; padding: 7px 12px; cursor: pointer;
      font-size: 12px; font-weight: 600; white-space: nowrap;
      transition: opacity 0.15s;
    }
    .cw-lead-submit:hover { opacity: 0.85; }
    .cw-lead-submit:disabled { opacity: 0.4; cursor: not-allowed; }

    .cw-skip-btn {
      background: none; border: none; color: #555;
      font-size: 11px; cursor: pointer; margin-top: 6px;
      padding: 0; text-decoration: underline;
    }
    .cw-skip-btn:hover { color: #888; }

    .cw-typing {
      display: flex; align-items: center; gap: 5px; padding: 10px 13px;
    }
    .cw-dot {
      width: 7px; height: 7px; background: #555; border-radius: 50%;
      animation: cw-bounce 1.2s ease infinite;
    }
    .cw-dot:nth-child(2) { animation-delay: 0.15s; }
    .cw-dot:nth-child(3) { animation-delay: 0.3s; }

    .cw-input-row {
      display: flex; gap: 8px; padding: 10px 12px;
      background: #0f0f17; border-top: 1px solid #1e1e2e; flex-shrink: 0;
    }
    .cw-text-input {
      flex: 1; background: #1e1e2e; border: 1px solid #2a2a40;
      border-radius: 10px; color: #e0e0f0; font-size: 13px;
      font-family: inherit; padding: 9px 12px; outline: none;
      resize: none; min-height: 38px; max-height: 160px; transition: border-color 0.15s; box-sizing: border-box; overflow: hidden;
    }
    .cw-text-input:focus { border-color: var(--cw-primary); }
    .cw-text-input::placeholder { color: #555; }
    .cw-send-btn {
      background: var(--cw-primary); color: #fff; border: none;
      border-radius: 10px; width: 38px; height: 38px;
      display: flex; align-items: center; justify-content: center;
      cursor: pointer; flex-shrink: 0; transition: opacity 0.15s;
    }
    .cw-send-btn:hover { opacity: 0.85; }
    .cw-send-btn:disabled { opacity: 0.4; cursor: not-allowed; }

    @keyframes cw-slide { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
    @keyframes cw-bounce { 0%, 60%, 100% { transform: translateY(0); } 30% { transform: translateY(-5px); } }
    @keyframes cw-pop { from { transform: scale(0); } to { transform: scale(1); } }

    @media (max-width: 420px) {
      .cw-window { width: calc(100vw - 16px); right: 8px !important; left: 8px !important; }
    }
  `;

      let isOpen = false;
      let messages = [];
      let launcher, badge, chatWindow, msgContainer, textInput, sendBtn;

      // Lead capture state
      // steps: null | "name" | "email" | "mobile" | "saving" | "done"
      let leadStep = null;
      let leadData = {};
      let leadInputEl = null; // reference to the active input element

      function init(userConfig) {
        try {
          cfg = Object.assign({}, DEFAULTS, userConfig);
          if (document.readyState === "loading") {
            document.addEventListener("DOMContentLoaded", function () {
              try { _mount(); } catch (e) { console.warn("[ChatWidget] Init error:", e); }
            });
          } else {
            _mount();
          }
        } catch (e) {
          console.warn("[ChatWidget] Init error:", e);
        }
      }

      function _mount() {
        injectCSS();
        buildDOM();
        addListeners();
        appendBotMessage(cfg.welcomeMessage);
      }

      function injectCSS() {
        const style = document.createElement("style");
        style.textContent = CSS.replace(/var\(--cw-primary\)/g, cfg.primaryColor);
        (document.head || document.documentElement).appendChild(style);
      }

      function buildDOM() {
        const posClass = cfg.position === "bottom-left" ? "bl" : "br";

        launcher = el("button", `cw-launcher cw-launcher-${posClass}`);
        launcher.innerHTML = iconChat();
        launcher.setAttribute("aria-label", "Open chat");

        badge = el("span", "cw-badge");
        badge.textContent = "1";
        badge.style.display = "none";
        launcher.appendChild(badge);

        chatWindow = el("div", `cw-window cw-window-${posClass} cw-hidden`);
        chatWindow.setAttribute("role", "dialog");
        chatWindow.setAttribute("aria-label", cfg.title);

        const header = el("div", "cw-header");
        const headerLeft = el("div", "cw-header-left");

        const avatar = el("div", "cw-avatar");  // ✅ declared at outer scope
        if (cfg.logoUrl) {
          const img = document.createElement("img");
          img.src = cfg.logoUrl;
          img.alt = cfg.title;
          avatar.appendChild(img);
        } else {
          avatar.textContent = "💬";  // fallback icon when no logo provided
        }

        const titleWrap = el("div", "");
        const titleEl = el("div", "cw-title");
        titleEl.textContent = cfg.title;
        const subtitleEl = el("div", "cw-subtitle");
        subtitleEl.textContent = "Online";
        titleWrap.append(titleEl, subtitleEl);
        headerLeft.append(avatar, titleWrap);

        const closeBtn = el("button", "cw-close-btn");
        closeBtn.textContent = "✕";
        closeBtn.setAttribute("aria-label", "Close chat");
        closeBtn.onclick = toggleChat;
        header.append(headerLeft, closeBtn);

        msgContainer = el("div", "cw-messages");
        msgContainer.setAttribute("aria-live", "polite");

        const inputRow = el("div", "cw-input-row");
        textInput = el("textarea", "cw-text-input");
        textInput.placeholder = "Ask me anything…";
        textInput.rows = 1;
        textInput.style.overflow = "hidden";
        sendBtn = el("button", "cw-send-btn");
        sendBtn.innerHTML = iconSend();
        sendBtn.setAttribute("aria-label", "Send");
        inputRow.append(textInput, sendBtn);

        chatWindow.append(header, msgContainer, inputRow);
        document.body.append(launcher, chatWindow);
      }

      function adjustInputHeight() {
        if (!textInput) return;
        textInput.style.height = "auto";
        const h = Math.min(textInput.scrollHeight, 160);
        textInput.style.height = h + "px";
        textInput.style.overflowY = h >= 160 ? "auto" : "hidden";
      }

      function addListeners() {
        launcher.onclick = toggleChat;
        sendBtn.onclick = sendMessage;
        textInput.addEventListener("keydown", (e) => {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
          }
        });
        textInput.addEventListener("input", adjustInputHeight);
      }

      function toggleChat() {
        isOpen = !isOpen;
        chatWindow.classList.toggle("cw-hidden", !isOpen);
        launcher.innerHTML = isOpen ? iconX() : iconChat();
        if (isOpen) {
          badge.style.display = "none";
          setTimeout(() => {
            if (leadStep && leadInputEl) {
              leadInputEl.focus();
            } else {
              textInput.focus();
            }
          }, 220);
          scrollToBottom();
        }
      }

      async function sendMessage() {
        // If we're in lead collection mode, forward to lead handler
        if (leadStep && leadStep !== "saving" && leadStep !== "done") {
          handleLeadInput(textInput.value.trim());
          textInput.value = "";
          adjustInputHeight();
          return;
        }

        const text = textInput.value.trim();
        if (!text) return;
        textInput.value = "";
        adjustInputHeight();
        sendBtn.disabled = true;

        appendUserMessage(text);
        const typingEl = appendTyping();

        try {
          const res = await fetch(`${cfg.apiUrl}/api/chat`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              message: text,
              websiteId: cfg.websiteId,
              history: messages.slice(-6).map((m) => ({
                role: m.role === "bot" ? "assistant" : "user",
                content: m.text,
              })),
            }),
          });
          const data = await res.json();
          typingEl.remove();

          if (!data.confident && data.action === "collect_lead") {
            appendBotMessage(data.answer);
            // Kick off lead capture flow
            setTimeout(() => startLeadCapture(), 400);
          } else {
            appendBotMessage(data.answer, data.source);
          }
        } catch (err) {
          typingEl.remove();
          appendBotMessage("Sorry, I couldn't connect to the server. Please try again.");
        } finally {
          sendBtn.disabled = false;
          if (!isOpen) badge.style.display = "flex";
          scrollToBottom();
        }
      }

      // ─── Lead Capture Flow ───────────────────────────────────────────────────

      function startLeadCapture() {
        leadStep = "name";
        leadData = {};
        // Disable main input row
        setMainInputEnabled(false);
        appendLeadPrompt(
          "No problem! I can have someone from the team reach out to you. What's your name?",
          "Your name",
          (val) => {
            if (!val) return;
            appendUserMessage(val);
            leadData.name = val;
            leadStep = "email";
            appendLeadPrompt(
              `Nice to meet you, ${val}! What's your email address?`,
              "your@email.com",
              (v2) => {
                if (!v2 || !v2.includes("@")) {
                  appendBotMessage("Please enter a valid email address.");
                  appendLeadPrompt("What's your email address?", "your@email.com", handleEmailSubmit);
                  return;
                }
                handleEmailSubmit(v2);
              }
            );
          }
        );
      }

      function handleEmailSubmit(val) {
        appendUserMessage(val);
        leadData.email = val;
        leadStep = "mobile";
        appendLeadPrompt(
          "Got it! And your mobile number?",
          "e.g. 9876543210",
          (v3) => {
            if (!v3) return;
            appendUserMessage(v3);
            leadData.mobile = v3;
            submitLead();
          }
        );
      }

      function appendLeadPrompt(botText, placeholder, onSubmit) {
        appendBotMessage(botText);

        const wrap = el("div", "cw-msg");
        const bubble = el("div", "cw-bubble cw-bubble-bot");

        const row = el("div", "cw-lead-input-row");
        const input = el("input", "cw-lead-input");
        input.type = "text";
        input.placeholder = placeholder;
        leadInputEl = input;

        const submitBtn = el("button", "cw-lead-submit");
        submitBtn.textContent = "→";

        const skipBtn = el("button", "cw-skip-btn");
        skipBtn.textContent = "Skip / Cancel";
        skipBtn.onclick = cancelLeadCapture;

        function doSubmit() {
          const val = input.value.trim();
          submitBtn.disabled = true;
          input.disabled = true;
          onSubmit(val);
        }

        submitBtn.onclick = doSubmit;
        input.addEventListener("keydown", (e) => {
          if (e.key === "Enter") { e.preventDefault(); doSubmit(); }
        });

        row.append(input, submitBtn);
        bubble.append(row, skipBtn);
        wrap.appendChild(bubble);
        msgContainer.appendChild(wrap);
        scrollToBottom();

        setTimeout(() => input.focus(), 50);
      }

      async function submitLead() {
        leadStep = "saving";
        const typingEl = appendTyping();

        try {
          const res = await fetch(`${cfg.apiUrl}/api/leads/${cfg.websiteId}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(leadData),
          });
          typingEl.remove();

          if (res.ok) {
            leadStep = "done";
            appendBotMessage(
              `Thanks, ${leadData.name}! We've got your details and someone will reach out to you at ${leadData.email} soon. Is there anything else I can help you with?`
            );
          } else {
            const err = await res.json().catch(() => ({}));
            appendBotMessage(
              "Sorry, I couldn't save your details right now. Please try reaching out directly."
            );
            console.warn("[ChatWidget] Lead save failed:", err);
            leadStep = null;
          }
        } catch (e) {
          typingEl.remove();
          appendBotMessage("Network error — couldn't save your details. Please try again.");
          leadStep = null;
        } finally {
          setMainInputEnabled(true);
          leadInputEl = null;
          scrollToBottom();
        }
      }

      function cancelLeadCapture() {
        leadStep = null;
        leadData = {};
        leadInputEl = null;
        setMainInputEnabled(true);
        appendBotMessage("No worries! Feel free to ask me anything else.");
        scrollToBottom();
      }

      function setMainInputEnabled(enabled) {
        textInput.disabled = !enabled;
        sendBtn.disabled = !enabled;
        textInput.placeholder = enabled ? "Ask me anything…" : "Please fill in the form above…";
      }

      // ─── Shared helpers ──────────────────────────────────────────────────────

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
          try {
            const chip = document.createElement("a");
            chip.href = source;
            chip.target = "_blank";
            chip.rel = "noopener noreferrer";
            chip.className = "cw-source-chip";
            const u = new URL(source);
            chip.textContent = "🔗 " + (u.pathname === "/" ? u.hostname : u.pathname);
            const chipRow = el("div", "");
            chipRow.appendChild(chip);
            bubble.appendChild(chipRow);
          } catch {}
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
        requestAnimationFrame(() => { msgContainer.scrollTop = msgContainer.scrollHeight; });
      }

      function el(tag, className) {
        const e = document.createElement(tag);
        if (className) e.className = className;
        return e;
      }

      function iconChat() {
        return `<svg width="24" height="24" viewBox="0 0 24 24" fill="none"><path d="M20 2H4C2.9 2 2 2.9 2 4v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z" fill="currentColor"/></svg>`;
      }
      function iconX() {
        return `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`;
      }
      function iconSend() {
        return `<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg>`;
      }

      window.ChatWidget = { init };
    } catch (e) {
      console.warn("[ChatWidget] Failed to load:", e);
    }
  })();
})();