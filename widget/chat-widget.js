(()=>{(function(){"use strict";let x={websiteId:"default",apiUrl:"http://localhost:5000",title:"Website Assistant",welcomeMessage:"\u{1F44B} Hi! I can answer questions about this website. What would you like to know?",primaryColor:"#6c63ff",position:"bottom-right"},r=Object.assign({},x),I=`
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
  `,u=!1,h=!1,y=[],L=!1,v=!1,l,b,w,s,c,d,f,q,W,N,D,J;function B(e){r=Object.assign({},x,e),j(),H(),O(),m(r.welcomeMessage)}function j(){let e=document.createElement("style");e.textContent=I.replace(/var\(--cw-primary\)/g,r.primaryColor),document.head.appendChild(e)}function H(){let e=r.position==="bottom-left"?"bl":"br";l=o("button",`cw-launcher cw-launcher-${e}`),l.innerHTML=S(),l.setAttribute("aria-label","Open chat"),b=o("span","cw-badge"),b.textContent="1",b.style.display="none",l.appendChild(b),w=o("div",`cw-window cw-window-${e} cw-hidden`),w.setAttribute("role","dialog"),w.setAttribute("aria-label",r.title);let t=o("div","cw-header");t.innerHTML=`
      <div class="cw-header-left">
        <div class="cw-avatar">\u{1F916}</div>
        <div>
          <div class="cw-title">${g(r.title)}</div>
          <div class="cw-subtitle">AI-powered \xB7 Online</div>
        </div>
      </div>
    `;let n=o("button","cw-close-btn");n.innerHTML="\u2715",n.setAttribute("aria-label","Close chat"),n.onclick=k,t.querySelector(".cw-header-left").after(n),s=o("div","cw-messages"),s.setAttribute("aria-live","polite"),f=A(),f.style.display="none";let i=o("div","cw-input-row");c=o("textarea","cw-text-input"),c.placeholder="Ask me anything\u2026",c.rows=1,d=o("button","cw-send-btn"),d.innerHTML=F(),d.setAttribute("aria-label","Send"),i.append(c,d),w.append(t,s,f,i),document.body.append(l,w)}function A(){let e=o("div","cw-contact-form");return e.innerHTML=`
      <div class="cw-contact-title">\u{1F4CB} Leave your details \u2014 we'll get back to you</div>
      <div class="cw-contact-grid">
        <input class="cw-input" placeholder="Your name *" id="cw-name" />
        <input class="cw-input" placeholder="Email *" type="email" id="cw-email" />
      </div>
      <input class="cw-input" placeholder="Phone (optional)" id="cw-phone" style="margin-bottom:7px" />
      <textarea class="cw-input" placeholder="Your question / message *" id="cw-msg" rows="2" style="resize:none;margin-bottom:7px"></textarea>
      <button class="cw-submit-btn" id="cw-submit">Send Message</button>
    `,e}function O(){l.onclick=k,d.onclick=C,c.addEventListener("keydown",e=>{e.key==="Enter"&&!e.shiftKey&&(e.preventDefault(),C())}),document.addEventListener("click",e=>{e.target&&e.target.id==="cw-submit"&&$()})}function k(){u=!u,w.classList.toggle("cw-hidden",!u),l.innerHTML=u?Y():S(),u&&(b.style.display="none",h=!1,setTimeout(()=>c.focus(),220),p())}async function C(){let e=c.value.trim();if(!e)return;c.value="",d.disabled=!0,P(e);let t=U();try{let i=await(await fetch(`${r.apiUrl}/api/chat`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({message:e,websiteId:r.websiteId})})).json();t.remove(),m(i.answer,i.source),i.confident||(L=!0,f.style.display="block",v||p())}catch(n){t.remove(),m("Sorry, I couldn't connect to the server. Please try again.")}finally{d.disabled=!1,u||(h=!0,b.style.display="flex"),p()}}async function $(){var z,M,E,T;let e=(z=document.getElementById("cw-name"))==null?void 0:z.value.trim(),t=(M=document.getElementById("cw-email"))==null?void 0:M.value.trim(),n=(E=document.getElementById("cw-phone"))==null?void 0:E.value.trim(),i=(T=document.getElementById("cw-msg"))==null?void 0:T.value.trim();if(!e||!t||!i){alert("Please fill in your name, email, and message.");return}let a=document.getElementById("cw-submit");a&&(a.disabled=!0,a.textContent="Sending\u2026");try{await fetch(`${r.apiUrl}/api/contact`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({name:e,email:t,phone:n,message:i,websiteId:r.websiteId})}),v=!0,f.innerHTML=`<div class="cw-success-msg">\u2705 Thanks ${g(e)}! We'll be in touch shortly.</div>`,m(`Thanks ${g(e)}! I've saved your message and someone will reach out to you at ${g(t)}.`),p()}catch(K){a&&(a.disabled=!1,a.textContent="Send Message"),alert("Submission failed. Please try again.")}}function P(e){let t=o("div","cw-msg cw-msg-user"),n=o("div","cw-bubble cw-bubble-user");n.textContent=e,t.appendChild(n),s.appendChild(t),y.push({role:"user",text:e}),p()}function m(e,t){let n=o("div","cw-msg"),i=o("div","cw-bubble cw-bubble-bot");if(i.textContent=e,t){let a=document.createElement("a");a.href=t,a.target="_blank",a.rel="noopener noreferrer",a.className="cw-source",a.textContent="\u{1F517} "+t,i.appendChild(a)}return n.appendChild(i),s.appendChild(n),y.push({role:"bot",text:e,source:t}),p(),n}function U(){let e=o("div","cw-msg"),t=o("div","cw-bubble cw-bubble-bot cw-typing");return t.innerHTML='<span class="cw-dot"></span><span class="cw-dot"></span><span class="cw-dot"></span>',e.appendChild(t),s.appendChild(e),p(),e}function p(){requestAnimationFrame(()=>{s.scrollTop=s.scrollHeight})}function o(e,t){let n=document.createElement(e);return t&&(n.className=t),n}function g(e){return String(e).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;")}function S(){return`<svg width="24" height="24" viewBox="0 0 24 24" fill="none">
      <path d="M20 2H4C2.9 2 2 2.9 2 4v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z" fill="currentColor"/>
    </svg>`}function Y(){return`<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
      <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
    </svg>`}function F(){return`<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
      <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/>
    </svg>`}window.ChatWidget={init:B}})();})();
