(()=>{(function(){try{let U=function(e){try{if(i=Object.assign({},L,e),!i.welcomeMessage){let t=i.websiteName||i.title;i.welcomeMessage=`Hi! I'm the ${t} assistant. What would you like to know?`}document.readyState==="loading"?document.addEventListener("DOMContentLoaded",function(){try{j()}catch(t){console.warn("[ChatWidget] Init error:",t)}}):j()}catch(t){console.warn("[ChatWidget] Init error:",t)}},j=function(){H(),P(),Y(),d(i.welcomeMessage)},H=function(){let e=document.createElement("style");e.textContent=B.replace(/var\(--cw-primary\)/g,i.primaryColor),(document.head||document.documentElement).appendChild(e)},P=function(){let e=i.position==="bottom-left"?"bl":"br";m=n("button",`cw-launcher cw-launcher-${e}`),m.innerHTML=$(),m.setAttribute("aria-label","Open chat"),y=n("span","cw-badge"),y.textContent="1",y.style.display="none",m.appendChild(y),v=n("div",`cw-window cw-window-${e} cw-hidden`),v.setAttribute("role","dialog"),v.setAttribute("aria-label",i.title);let t=n("div","cw-header"),o=n("div","cw-header-left"),r=n("div","cw-avatar");if(i.logoUrl){let g=document.createElement("img");g.src=i.logoUrl,g.alt=i.title,g.onerror=()=>{r.style.display="none"},r.appendChild(g)}else r.textContent="\u{1F916}";o.appendChild(r);let s=n("div",""),u=n("div","cw-title");u.textContent=i.title;let l=n("div","cw-subtitle");l.textContent="Online",s.append(u,l),o.appendChild(s);let b=n("button","cw-close-btn");b.textContent="\u2715",b.setAttribute("aria-label","Close chat"),b.onclick=N,t.append(o,b),p=n("div","cw-messages"),p.setAttribute("aria-live","polite");let k=n("div","cw-input-row");a=n("textarea","cw-text-input"),a.placeholder="Ask me anything\u2026",a.rows=1,a.style.overflow="hidden",w=n("button","cw-send-btn"),w.innerHTML=J(),w.setAttribute("aria-label","Send"),k.append(a,w),v.append(t,p,k),document.body.append(m,v)},I=function(){if(!a)return;a.style.height="auto";let e=Math.min(a.scrollHeight,160);a.style.height=e+"px",a.style.overflowY=e>=160?"auto":"hidden"},Y=function(){m.onclick=N,w.onclick=A,a.addEventListener("keydown",e=>{e.key==="Enter"&&!e.shiftKey&&(e.preventDefault(),A())}),a.addEventListener("input",I)},N=function(){x=!x,v.classList.toggle("cw-hidden",!x),m.innerHTML=x?_():$(),x&&(y.style.display="none",setTimeout(()=>{c&&C?C.focus():a.focus()},220),h())},D=function(){let e=i.websiteName||i.title;c="name",f={},T(!1),S(`No problem! Someone from the ${e} team will reach out to you. What's your name?`,"Your name",t=>{t&&(E(t),f.name=t,c="email",S(`Nice to meet you, ${t}! What's your email address?`,"your@email.com",o=>{if(!o||!o.includes("@")){d("Please enter a valid email address."),S("What's your email address?","your@email.com",W);return}W(o)}))})},W=function(e){E(e),f.email=e,c="mobile",S("Got it! And your mobile number?","e.g. 9876543210",t=>{t&&(E(t),f.mobile=t,F())})},S=function(e,t,o){d(e);let r=n("div","cw-msg"),s=n("div","cw-bubble cw-bubble-bot"),u=n("div","cw-lead-input-row"),l=n("input","cw-lead-input");l.type="text",l.placeholder=t,C=l;let b=n("button","cw-lead-submit");b.textContent="\u2192";let k=n("button","cw-skip-btn");k.textContent="Skip / Cancel",k.onclick=R;function g(){let M=l.value.trim();b.disabled=!0,l.disabled=!0,o(M)}b.onclick=g,l.addEventListener("keydown",M=>{M.key==="Enter"&&(M.preventDefault(),g())}),u.append(l,b),s.append(u,k),r.appendChild(s),p.appendChild(r),h(),setTimeout(()=>l.focus(),50)},R=function(){c=null,f={},C=null,T(!0),d("No worries! Feel free to ask me anything else."),h()},T=function(e){a.disabled=!e,w.disabled=!e,a.placeholder=e?"Ask me anything\u2026":"Please fill in the form above\u2026"},E=function(e){let t=n("div","cw-msg cw-msg-user"),o=n("div","cw-bubble cw-bubble-user");o.textContent=e,t.appendChild(o),p.appendChild(t),z.push({role:"user",text:e}),h()},d=function(e,t){let o=n("div","cw-msg"),r=n("div","cw-bubble cw-bubble-bot");if(r.textContent=e,t)try{let s=document.createElement("a");s.href=t,s.target="_blank",s.rel="noopener noreferrer",s.className="cw-source-chip";let u=new URL(t);s.textContent="\u{1F517} "+(u.pathname==="/"?u.hostname:u.pathname);let l=n("div","");l.appendChild(s),r.appendChild(l)}catch(s){}return o.appendChild(r),p.appendChild(o),z.push({role:"bot",text:e,source:t}),h(),o},O=function(){let e=n("div","cw-msg"),t=n("div","cw-bubble cw-bubble-bot cw-typing");return t.innerHTML='<span class="cw-dot"></span><span class="cw-dot"></span><span class="cw-dot"></span>',e.appendChild(t),p.appendChild(e),h(),e},h=function(){requestAnimationFrame(()=>{p.scrollTop=p.scrollHeight})},n=function(e,t){let o=document.createElement(e);return t&&(o.className=t),o},$=function(){return'<svg width="24" height="24" viewBox="0 0 24 24" fill="none"><path d="M20 2H4C2.9 2 2 2.9 2 4v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z" fill="currentColor"/></svg>'},_=function(){return'<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>'},J=function(){return'<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg>'},L={websiteId:"default",websiteName:"",apiUrl:"https://chatbot-gurp.onrender.com",title:"Website Assistant",welcomeMessage:"",primaryColor:"#6c63ff",position:"bottom-right",logoUrl:""},i=Object.assign({},L),B=`
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
  `,x=!1,z=[],m,y,v,p,a,w,c=null,f={},C=null;async function A(){if(c&&c!=="saving"&&c!=="done"){handleLeadInput(a.value.trim()),a.value="",I();return}let e=a.value.trim();if(!e)return;a.value="",I(),w.disabled=!0,E(e);let t=O();try{let r=await(await fetch(`${i.apiUrl}/api/chat`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({message:e,websiteId:i.websiteId,websiteName:i.websiteName||i.title,history:z.slice(-6).map(s=>({role:s.role==="bot"?"assistant":"user",content:s.text}))})})).json();t.remove(),r.action==="collect_lead"?(d(r.answer),setTimeout(()=>D(),400)):d(r.answer,r.source)}catch(o){t.remove(),d("Sorry, I couldn't connect to the server. Please try again.")}finally{w.disabled=!1,x||(y.style.display="flex"),h()}}async function F(){let e=i.websiteName||i.title;c="saving";let t=O();try{let o=await fetch(`${i.apiUrl}/api/leads/${i.websiteId}`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(f)});if(t.remove(),o.ok)c="done",d(`Thanks, ${f.name}! The ${e} team has your details and will reach out to you at ${f.email} soon. Is there anything else I can help you with?`);else{let r=await o.json().catch(()=>({}));d("Sorry, I couldn't save your details right now. Please try reaching out directly."),console.warn("[ChatWidget] Lead save failed:",r),c=null}}catch(o){t.remove(),d("Network error \u2014 couldn't save your details. Please try again."),c=null}finally{T(!0),C=null,h()}}window.ChatWidget={init:U}}catch(L){console.warn("[ChatWidget] Failed to load:",L)}})();})();
