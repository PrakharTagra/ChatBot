(()=>{(function(){try{let S=function(e){try{c=Object.assign({},g,e),document.readyState==="loading"?document.addEventListener("DOMContentLoaded",function(){try{v()}catch(t){console.warn("[ChatWidget] Init error:",t)}}):v()}catch(t){console.warn("[ChatWidget] Init error:",t)}},v=function(){E(),T(),j(),m(c.welcomeMessage)},E=function(){let e=document.createElement("style");e.textContent=L.replace(/var\(--cw-primary\)/g,c.primaryColor),(document.head||document.documentElement).appendChild(e)},T=function(){let e=c.position==="bottom-left"?"bl":"br";p=n("button",`cw-launcher cw-launcher-${e}`),p.innerHTML=z(),p.setAttribute("aria-label","Open chat"),u=n("span","cw-badge"),u.textContent="1",u.style.display="none",p.appendChild(u),x=n("div",`cw-window cw-window-${e} cw-hidden`),x.setAttribute("role","dialog"),x.setAttribute("aria-label",c.title);let t=n("div","cw-header"),o=n("div","cw-header-left"),i=n("div","cw-avatar");i.textContent="\u{1F916}";let s=n("div",""),a=n("div","cw-title");a.textContent=c.title;let r=n("div","cw-subtitle");r.textContent="AI-powered \xB7 Online",s.append(a,r),o.append(i,s);let b=n("button","cw-close-btn");b.textContent="\u2715",b.setAttribute("aria-label","Close chat"),b.onclick=k,t.append(o,b),l=n("div","cw-messages"),l.setAttribute("aria-live","polite");let M=n("div","cw-input-row");d=n("textarea","cw-text-input"),d.placeholder="Ask me anything\u2026",d.rows=1,w=n("button","cw-send-btn"),w.innerHTML=B(),w.setAttribute("aria-label","Send"),M.append(d,w),x.append(t,l,M),document.body.append(p,x)},j=function(){p.onclick=k,w.onclick=C,d.addEventListener("keydown",e=>{e.key==="Enter"&&!e.shiftKey&&(e.preventDefault(),C())})},k=function(){f=!f,x.classList.toggle("cw-hidden",!f),p.innerHTML=f?O():z(),f&&(u.style.display="none",setTimeout(()=>d.focus(),220),h())},A=function(e){let t=n("div","cw-msg cw-msg-user"),o=n("div","cw-bubble cw-bubble-user");o.textContent=e,t.appendChild(o),l.appendChild(t),y.push({role:"user",text:e}),h()},m=function(e,t,o){let i=n("div","cw-msg"),s=n("div","cw-bubble cw-bubble-bot");if(s.textContent=e,t)try{let a=document.createElement("a");a.href=t,a.target="_blank",a.rel="noopener noreferrer",a.className="cw-source-chip";let r=new URL(t);a.textContent="\u{1F517} "+(r.pathname==="/"?r.hostname:r.pathname);let b=n("div","");b.appendChild(a),s.appendChild(b)}catch{}if(o){let a=n("div","cw-escalate"),r=document.createElement("a");r.href=o,r.target="_blank",r.rel="noopener noreferrer",r.className="cw-contact-btn",r.innerHTML="\u2709\uFE0F Contact Us",a.appendChild(r),s.appendChild(a)}return i.appendChild(s),l.appendChild(i),y.push({role:"bot",text:e,source:t}),h(),i},I=function(){let e=n("div","cw-msg"),t=n("div","cw-bubble cw-bubble-bot cw-typing");return t.innerHTML='<span class="cw-dot"></span><span class="cw-dot"></span><span class="cw-dot"></span>',e.appendChild(t),l.appendChild(e),h(),e},h=function(){requestAnimationFrame(()=>{l.scrollTop=l.scrollHeight})},n=function(e,t){let o=document.createElement(e);return t&&(o.className=t),o},z=function(){return'<svg width="24" height="24" viewBox="0 0 24 24" fill="none"><path d="M20 2H4C2.9 2 2 2.9 2 4v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z" fill="currentColor"/></svg>'},O=function(){return'<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>'},B=function(){return'<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg>'},g={websiteId:"default",apiUrl:"https://chatbot-gurp.onrender.com",title:"Website Assistant",welcomeMessage:"\u{1F44B} Hi! I can answer questions about this website. What would you like to know?",primaryColor:"#6c63ff",position:"bottom-right"},c=Object.assign({},g),L=`
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

    .cw-escalate {
      display: flex; flex-direction: column; align-items: flex-start;
      gap: 6px; margin-top: 4px;
    }
    .cw-contact-btn {
      display: inline-flex; align-items: center; gap: 6px;
      padding: 7px 14px; border-radius: 20px;
      background: var(--cw-primary); color: #fff;
      font-size: 13px; font-weight: 600;
      text-decoration: none; border: none; cursor: pointer;
      transition: opacity 0.15s;
    }
    .cw-contact-btn:hover { opacity: 0.85; }

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
      resize: none; height: 38px; transition: border-color 0.15s; box-sizing: border-box;
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
  `,f=!1,y=[],p,u,x,l,d,w;async function C(){let e=d.value.trim();if(!e)return;d.value="",w.disabled=!0,A(e);let t=I();try{let i=await(await fetch(`${c.apiUrl}/api/chat`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({message:e,websiteId:c.websiteId,history:y.slice(-6).map(s=>({role:s.role==="bot"?"assistant":"user",content:s.text}))})})).json();t.remove(),!i.confident&&i.contactUrl?m(i.answer,null,i.contactUrl):m(i.answer,i.source)}catch{t.remove(),m("Sorry, I couldn't connect to the server. Please try again.")}finally{w.disabled=!1,f||(u.style.display="flex"),h()}}window.ChatWidget={init:S}}catch(g){console.warn("[ChatWidget] Failed to load:",g)}})();})();
