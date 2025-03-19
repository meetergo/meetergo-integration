"use strict";(()=>{var C=class{constructor(){this.boundElements=new Map;this.lastActiveElement=null;document&&(document.readyState==="complete"||document.readyState==="interactive")?this.init():window.addEventListener("DOMContentLoaded",()=>{this.init()})}init(){this.listenToForms(),this.addFloatingButton(),this.addSidebar(),this.addModal(),this.parseIframes(),this.parseButtons(),this.addListeners(),this.addGeneralCss(),window.meetergoSettings?.videoEmbed&&window.meetergoSettings.videoEmbed.videoSrc&&this.initVideoEmbed()}addGeneralCss(){let e=document.createElement("style");e.textContent=`
    .close-button {
      all: unset;
      position: absolute;
      top: 16px;
      right: 16px;
      background: #fff;
      border-radius: 100%;
      width: 40px;
      height: 40px;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: color 350ms;
      color: #9ca3af;
      cursor: pointer;
    }

    .close-button:hover{
      color: #000;
    }

    .meetergo-spinner {
      position: absolute;
      width: 48px;
      height: 48px;
      border: 6px solid #FFF;
      border-bottom-color: #d1d5db;
      border-radius: 50%;
      display: inline-block;
      box-sizing: border-box;
      animation: rotation 1s linear infinite;
    }

    @keyframes rotation {
      0% {
          transform: rotate(0deg);
      }
      100% {
          transform: rotate(360deg);
      }
    }
    
    /* Button animations */
    @keyframes meetergo-pulse {
      0% { transform: scale(1); }
      50% { transform: scale(1.05); }
      100% { transform: scale(1); }
    }
    
    @keyframes meetergo-bounce {
      0%, 20%, 50%, 80%, 100% { transform: translateY(0); }
      40% { transform: translateY(-10px); }
      60% { transform: translateY(-5px); }
    }
    
    @keyframes meetergo-slide-in-right {
      0% { transform: translateX(100%); opacity: 0; }
      100% { transform: translateX(0); opacity: 1; }
    }
    
    @keyframes meetergo-slide-in-left {
      0% { transform: translateX(-100%); opacity: 0; }
      100% { transform: translateX(0); opacity: 1; }
    }
    
    @keyframes meetergo-slide-in-top {
      0% { transform: translateY(-100%); opacity: 0; }
      100% { transform: translateY(0); opacity: 1; }
    }
    
    @keyframes meetergo-slide-in-bottom {
      0% { transform: translateY(100%); opacity: 0; }
      100% { transform: translateY(0); opacity: 1; }
    }
    
    .meetergo-animation-pulse {
      animation: meetergo-pulse 2s infinite ease-in-out;
    }
    
    .meetergo-animation-bounce {
      animation: meetergo-bounce 2s infinite;
    }
    
    .meetergo-animation-slide-in-right {
      animation: meetergo-slide-in-right 0.5s forwards;
    }
    
    .meetergo-animation-slide-in-left {
      animation: meetergo-slide-in-left 0.5s forwards;
    }
    
    .meetergo-animation-slide-in-top {
      animation: meetergo-slide-in-top 0.5s forwards;
    }
    
    .meetergo-animation-slide-in-bottom {
      animation: meetergo-slide-in-bottom 0.5s forwards;
    }

    /* Sidebar styles */
    .meetergo-sidebar {
      position: fixed;
      top: 0;
      height: 100%;
      transition: transform 0.3s ease;
      z-index: 9998;
      overflow: hidden;
      display: flex;
      flex-direction: column;
      align-items: stretch;
    }

    .meetergo-sidebar-left {
      left: 0;
      transform: translateX(-100%);
    }

    .meetergo-sidebar-right {
      right: 0;
      transform: translateX(100%);
    }

    .meetergo-sidebar.open {
      transform: translateX(0);
    }

    .meetergo-sidebar-toggle {
      position: fixed;
      z-index: 9999;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      width: auto;
      min-width: 50px;
      padding: 12px 8px;
      transition: width 0.2s ease;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
      border: none;
      outline: none;
    }

    .meetergo-sidebar-toggle-left {
      left: 0;
      border-radius: 0 8px 8px 0;
      border-left: none;
    }

    .meetergo-sidebar-toggle-right {
      right: 0;
      border-radius: 8px 0 0 8px;
      border-right: none;
    }

    .meetergo-sidebar-toggle:hover {
      background-color: #0852a8;
    }
    
    .meetergo-sidebar-toggle-left:hover {
      box-shadow: 4px 0 10px rgba(0, 0, 0, 0.15);
    }
    
    .meetergo-sidebar-toggle-right:hover {
      box-shadow: -4px 0 10px rgba(0, 0, 0, 0.15);
    }
    
    .meetergo-sidebar-toggle-hidden {
      opacity: 0;
      pointer-events: none;
    }

    .meetergo-sidebar-toggle-icon {
      width: 24px;
      height: 24px;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    
    .meetergo-sidebar-toggle-text {
      writing-mode: vertical-rl;
      text-orientation: mixed;
      margin-top: 8px;
      margin-left: 0;
      font-size: 14px;
      font-weight: 500;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .meetergo-sidebar-close {
      position: absolute;
      top: 10px;
      right: 10px;
      background: none;
      border: none;
      cursor: pointer;
      color: #666;
      padding: 5px;
      font-size: 20px;
      z-index: 10000;
    }

    .meetergo-sidebar-close:hover {
      color: #000;
    }

    .meetergo-sidebar-iframe {
      width: 100%;
      height: 100%;
      border: none;
      display: block;
      flex: 1;
      overflow: auto;
    }

    .meetergo-styled-button {
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 14px;
      font-weight: 500;
    }

    `,document.head.appendChild(e)}onFormSubmit(e){if(!(e.currentTarget instanceof HTMLFormElement))return;let o=e.currentTarget;if(e.preventDefault(),!o)return;let t=window.meetergoSettings?.formListeners.find(r=>o.id?o.id===r.formId:!1);if(!t)return;e.preventDefault();let n=new FormData(o),i={};for(let[r,s]of n)i[r]=s.toString();window.meetergo.openModalWithContent({link:t.link,existingParams:i})}listenToForms(){let e=document.querySelectorAll("form");for(let o of e)o.addEventListener("submit",this.onFormSubmit,!1)}addSidebar(){if(window.meetergoSettings?.sidebar&&window.meetergoSettings?.sidebar.link){let e=window.meetergoSettings.sidebar.position||"right",o=window.meetergoSettings.sidebar.width||"400px",t=window.meetergoSettings.sidebar.link,n=window.meetergoSettings.sidebar.buttonText||"Open Scheduler",i=window.meetergoSettings.sidebar.buttonIcon||"calendar",r=window.meetergoSettings.sidebar.buttonPosition||"middle-right",s=document.createElement("div");s.classList.add("meetergo-sidebar",`meetergo-sidebar-${e}`),s.style.width=o;let d=document.createElement("button");d.classList.add("meetergo-sidebar-close"),d.setAttribute("aria-label","Close sidebar"),d.innerHTML='<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>';let p=document.createElement("iframe");p.classList.add("meetergo-sidebar-iframe"),p.src=t,p.style.width="100%",p.style.height="100%",p.style.border="none";let l=document.createElement("button");if(l.classList.add("meetergo-sidebar-toggle",e==="left"?"meetergo-sidebar-toggle-left":"meetergo-sidebar-toggle-right"),r.includes("top")?l.style.top="120px":r.includes("middle")?(l.style.top="50%",l.style.transform="translateY(-50%)"):(l.style.bottom="120px",l.style.top=""),i){let a=document.createElement("span");a.classList.add("meetergo-sidebar-toggle-icon"),l.appendChild(a),this.fetchLucideIcon(i,a)}if(n){let a=document.createElement("span");a.classList.add("meetergo-sidebar-toggle-text"),a.textContent=n,l.appendChild(a)}l.setAttribute("aria-label",n),l.setAttribute("role","button"),window.meetergoSettings?.sidebar.backgroundColor&&(l.style.backgroundColor=window.meetergoSettings.sidebar.backgroundColor),window.meetergoSettings?.sidebar.textColor&&(l.style.color=window.meetergoSettings.sidebar.textColor),l.addEventListener("click",()=>{s.classList.toggle("open"),l.classList.toggle("meetergo-sidebar-toggle-hidden")}),d.addEventListener("click",()=>{s.classList.remove("open"),l.classList.remove("meetergo-sidebar-toggle-hidden")}),s.appendChild(d),s.appendChild(p),document.body.appendChild(s),document.body.appendChild(l)}}addFloatingButton(){if(window.meetergoSettings?.floatingButton&&window.meetergoSettings?.floatingButton?.position&&window.meetergoSettings?.floatingButton.link){let e=window.meetergoSettings?.floatingButton.position,o=window.meetergoSettings?.floatingButton.animation||"none",t=document.createElement("button");t.classList.add("meetergo-modal-button");let n=window.meetergoSettings?.floatingButton?.text??"Book appointment";window.meetergoSettings?.floatingButton?.icon?this.loadLucideIcon(window.meetergoSettings.floatingButton.icon,t,n):t.innerHTML=n,t.setAttribute("link",window.meetergoSettings.floatingButton.link),t.style.position="fixed";let i="";e.includes("top")?t.style.top="10px":e.includes("middle")?(t.style.top="50%",i="translateY(-50%)",t.style.transform=i):t.style.bottom="10px",e.includes("left")?t.style.left="5px":e.includes("center")?(t.style.left="50%",i=i?"translate(-50%, -50%)":"translateX(-50%)",t.style.transform=i):t.style.right="5px",t=this.meetergoStyleButton(t),window.meetergoSettings?.floatingButton.backgroundColor&&(t.style.backgroundColor=window.meetergoSettings?.floatingButton.backgroundColor),window.meetergoSettings?.floatingButton.textColor&&(t.style.color=window.meetergoSettings?.floatingButton.textColor),o!=="none"&&(o==="pulse"?t.classList.add("meetergo-animation-pulse"):o==="bounce"?t.classList.add("meetergo-animation-bounce"):o==="slide-in"&&(e.includes("right")?t.classList.add("meetergo-animation-slide-in-right"):e.includes("left")?t.classList.add("meetergo-animation-slide-in-left"):e.includes("top")?t.classList.add("meetergo-animation-slide-in-top"):t.classList.add("meetergo-animation-slide-in-bottom"))),document.body.appendChild(t)}}loadLucideIcon(e,o,t){if(o.style.display="inline-flex",o.style.alignItems="center",o.style.justifyContent="center",o.innerHTML="",e){let n=document.createElement("span");n.style.display="inline-flex",n.style.alignItems="center",t&&(n.style.marginRight="8px"),o.appendChild(n),this.fetchLucideIcon(e,n)}t&&o.appendChild(document.createTextNode(t))}fetchLucideIcon(e,o){let t={CalendarPlus:'<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="18" x="3" y="4" rx="2" ry="2"/><line x1="16" x2="16" y1="2" y2="6"/><line x1="8" x2="8" y1="2" y2="6"/><line x1="3" x2="21" y1="10" y2="10"/><line x1="12" x2="12" y1="14" y2="18"/><line x1="10" x2="14" y1="16" y2="16"/></svg>',CalendarPlus2:'<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 13V6a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h8"/><line x1="16" x2="16" y1="2" y2="6"/><line x1="8" x2="8" y1="2" y2="6"/><line x1="3" x2="21" y1="10" y2="10"/><path d="M16 21v-6"/><path d="M19 18h-6"/></svg>',Calendar:'<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="18" x="3" y="4" rx="2" ry="2"/><line x1="16" x2="16" y1="2" y2="6"/><line x1="8" x2="8" y1="2" y2="6"/><line x1="3" x2="21" y1="10" y2="10"/></svg>',Clock:'<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>',User:'<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v14a4 4 0 0 0 4 4z"/><circle cx="12" cy="7" r="4"/></svg>',Video:'<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 8h1a4 4 0 1 1 0 8h-1"/><path d="M3 8h14v9a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4Z"/><line x1="6" x2="6" y1="2" y2="4"/><line x1="10" x2="10" y1="2" y2="4"/><line x1="14" x2="14" y1="2" y2="4"/></svg>',Mail:'<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>',Phone:'<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>',MessageSquare:'<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>',Coffee:'<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 8h1a4 4 0 1 1 0 8h-1"/><path d="M3 8h14v9a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4Z"/><line x1="6" x2="6" y1="2" y2="4"/><line x1="10" x2="10" y1="2" y2="4"/><line x1="14" x2="14" y1="2" y2="4"/></svg>',Users:'<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>',Briefcase:'<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="20" height="14" x="2" y="7" rx="2" ry="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg>',Handshake:'<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20.42 4.58a5.4 5.4 0 0 0-7.65 0l-.77.78-.77-.78a5.4 5.4 0 0 0-7.65 0C1.46 6.7 1.33 10.28 4 13l8 8 8-8c2.67-2.72 2.54-6.3.42-8.42z"/></svg>',PenTool:'<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m12 19 7-7 3 3-7 7-3-3z"/><path d="m18 13-1.5-7.5L2 2l3.5 14.5L13 18l5-5z"/><path d="m2 2 7.586 7.586"/><circle cx="11" cy="11" r="2"/></svg>',Heart:'<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/></svg>',Star:'<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>',BookOpen:'<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>'};t[e]?o.innerHTML=t[e]:(o.innerHTML=t.Calendar,console.warn(`meetergo: Icon '${e}' not found, using default Calendar icon`))}addListeners(){try{document.body.addEventListener("click",e=>{let t=e.target.closest(".meetergo-modal-button");if(t){e.preventDefault();let n=t.getAttribute("link")||t.getAttribute("href");n?this.openModalWithContent({link:n}):console.warn("meetergo: Button clicked without a link attribute")}}),document.addEventListener("keydown",e=>{e.key==="Escape"&&this.closeModal()}),window.onmessage=e=>{try{let o=e.data;switch(o.event){case"open-modal":{let t=this.getParamsFromMainIframe(),n=o.data;if(!n.link){console.error("Meetergo: Missing link in open-modal event");return}this.openModalWithContent({link:n.link,existingParams:{...n.params,...t}});break}case"close-modal":{window.meetergo.closeModal();break}default:break}}catch(o){console.error("meetergo: Error handling message event",o)}}}catch(e){console.error("meetergo: Error setting up event listeners",e)}}getParamsFromMainIframe(){let e={},o=document.querySelector(".meetergo-iframe");if(o){let t=o.getAttribute("link");if(t){let n=t.split("?")[1];n&&new URLSearchParams(n).forEach((r,s)=>{e[s]=r})}}return e}openModalWithContent(e){try{if(window.meetergoSettings?.disableModal)return;let{link:o,existingParams:t}=e;if(!o){console.error("meetergo: Link is required for opening modal");return}let n=document.createElement("iframe");n.name="meetergo-embedded-modal";let i=this.getPrifillParams(t);n.setAttribute("src",`${o}?${i}`),n.style.width="100%",n.style.height="100%",n.style.border="none";let r=document.getElementById("meetergo-modal-content");if(!r){console.error("meetergo: Modal content element not found");return}r.innerHTML="",r.appendChild(n),this.openModal()}catch(o){console.error("meetergo: Error opening modal with content",o)}}addModal(){try{let e=document.createElement("div");e.id="meetergo-modal",e.setAttribute("role","dialog"),e.setAttribute("aria-modal","true"),e.setAttribute("aria-labelledby","meetergo-modal-title"),e.setAttribute("aria-describedby","meetergo-modal-description"),e.style.zIndex="999999",e.style.position="fixed",e.style.transition="visibility 0s linear 0.1s,opacity 0.3s ease",e.style.top="0",e.style.left="0",e.style.width="100%",e.style.height="100%",e.style.display="flex",e.style.justifyContent="center",e.style.alignItems="center",e.style.visibility="hidden",e.style.opacity="0";let o=document.createElement("div");o.style.zIndex="1001",o.style.position="fixed",o.style.top="0",o.style.left="0",o.style.width="100%",o.style.height="100%",o.style.backgroundColor="rgba(0,0,0,0.6)";let t=document.createElement("div");t.className="meetergo-spinner",t.setAttribute("role","status"),t.setAttribute("aria-label","Loading"),t.style.zIndex="1002",o.onclick=p=>{p.preventDefault(),window.meetergo.closeModal()};let n=document.createElement("div");n.id="meetergo-modal-content",n.style.zIndex="1003",n.style.position="relative",n.style.width="100%",n.style.height="100%",n.style.backgroundColor="rgba(0,0,0,0)",n.style.borderRadius="0.7rem",n.style.overflow="hidden",n.style.padding="16px";let i=document.createElement("h2");i.id="meetergo-modal-title",i.textContent="Meetergo Booking",i.style.position="absolute",i.style.width="1px",i.style.height="1px",i.style.padding="0",i.style.margin="-1px",i.style.overflow="hidden",i.style.clip="rect(0, 0, 0, 0)",i.style.whiteSpace="nowrap",i.style.borderWidth="0";let r=document.createElement("p");r.id="meetergo-modal-description",r.textContent="Calendar booking interface",r.style.position="absolute",r.style.width="1px",r.style.height="1px",r.style.padding="0",r.style.margin="-1px",r.style.overflow="hidden",r.style.clip="rect(0, 0, 0, 0)",r.style.whiteSpace="nowrap",r.style.borderWidth="0";let s=document.createElement("button");s.className="close-button",s.setAttribute("aria-label","Close booking modal"),s.setAttribute("type","button"),s.style.zIndex="1004",s.onclick=p=>{p.preventDefault(),window.meetergo.closeModal()},s.innerHTML=`<svg
        stroke="currentColor"
        fill="currentColor"
        stroke-width="0"
        viewBox="0 0 512 512"
        height="24px"
        width="24px"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        <path
          d="M289.94 256l95-95A24 24 0 00351 127l-95 95-95-95a24 24 0 00-34 34l95 95-95 95a24 24 0 1034 34l95-95 95 95a24 24 0 0034-34z"
        ></path>
      </svg>`;let d=document.createDocumentFragment();d.appendChild(o),d.appendChild(n),d.appendChild(t),d.appendChild(s),d.appendChild(i),d.appendChild(r),e.appendChild(d),document.body.appendChild(e)}catch(e){console.error("meetergo: Error adding modal to the page",e)}}bindElementToScheduler(e,o,t){try{if(t?.removeExistingListeners&&this.boundElements.has(e)){let i=this.boundElements.get(e);i&&(e.removeEventListener("click",i),this.boundElements.delete(e))}let n=i=>{i.preventDefault();let r=o||e.getAttribute("link");if(!r){console.error("meetergo: No scheduler link provided for bound element");return}this.openModalWithContent({link:r,existingParams:t?.params})};return e.addEventListener("click",n),this.boundElements.set(e,n),getComputedStyle(e).cursor!=="pointer"&&(e.style.cursor="pointer"),e.getAttribute("role")||e.setAttribute("role","button"),e}catch(n){return console.error("Meetergo: Error binding element to scheduler",n),e}}unbindElementFromScheduler(e){try{if(this.boundElements.has(e)){let o=this.boundElements.get(e);if(o)return e.removeEventListener("click",o),this.boundElements.delete(e),!0}return!1}catch(o){return console.error("meetergo: Error unbinding element from scheduler",o),!1}}launchScheduler(e,o){try{let t=e;if(!t&&window.meetergoSettings?.floatingButton?.link&&(t=window.meetergoSettings.floatingButton.link),!t){console.error("meetergo: No scheduler link provided for launch");return}this.openModalWithContent({link:t,existingParams:o})}catch(t){console.error("meetergo: Error launching scheduler programmatically",t)}}openModal(){try{this.lastActiveElement=document.activeElement;let e=document.getElementById("meetergo-modal");if(!e){console.error("meetergo: Modal element not found");return}e.style.visibility="visible",e.style.opacity="1";let o=e.getElementsByClassName("meetergo-spinner");if(o.length>0){let n=o[0];n.style.visibility="visible",n.style.opacity="1"}let t=e.querySelector(".close-button");t&&setTimeout(()=>{t.focus()},100),document.body.style.overflow="hidden"}catch(e){console.error("meetergo: Error opening modal",e)}}closeModal(e){try{let o=document.getElementById("meetergo-modal");if(!o){console.error("meetergo: Modal element not found when attempting to close");return}o.style.visibility="hidden",o.style.opacity="0";let t=o.getElementsByClassName("meetergo-spinner");if(t.length>0){let n=t[0];n.style.visibility="hidden",n.style.opacity="0"}e||setTimeout(()=>{let n=document.getElementById("meetergo-modal-content");n&&(n.innerHTML="")},300),document.body.style.overflow="",this.lastActiveElement instanceof HTMLElement&&setTimeout(()=>{this.lastActiveElement.focus()},100)}catch(o){console.error("meetergo: Error closing modal",o)}}parseIframes(){try{let e=document.getElementsByClassName("meetergo-iframe");if(!e.length)return;let o=this.getPrifillParams();Array.from(e).forEach(t=>{try{let n=document.createElement("iframe");n.title="meetergo Booking Calendar",n.setAttribute("loading","lazy");let i=(t.getAttribute("link")||t.getAttribute("href"))??"";if(!i){console.warn("meetergo: Iframe element missing link attribute");return}n.setAttribute("src",`${i}?${o}`),n.style.width="100%",n.style.height="100%",n.style.border="none",n.style.minHeight="690px";let r=document.createElement("div");r.className="meetergo-spinner",r.style.position="absolute",r.style.top="50%",r.style.left="50%",r.style.transform="translate(-50%, -50%)";let s=`meetergo-spinner-${Math.random().toString(36).substring(2,11)}`;r.id=s,n.addEventListener("load",()=>{let d=document.getElementById(s);d&&d.parentNode&&d.parentNode.removeChild(d)}),t instanceof HTMLElement&&(t.style.position="relative"),t instanceof HTMLElement&&(t.innerHTML="",t.appendChild(n)),t.appendChild(r)}catch(n){console.error("meetergo: Error processing iframe element",n)}})}catch(e){console.error("meetergo: Error parsing iframes",e)}}postScrollHeightToParent(e){window.parent.postMessage({scrollHeight:e},"*")}sendScrollHeightToParent(){let e=document.body.scrollHeight;this.postScrollHeightToParent(e)}parseButtons(){let e=document.getElementsByClassName("meetergo-styled-button");for(let o of e)if(o=this.meetergoStyleButton(o),o instanceof HTMLElement){let t=o.getAttribute("link");t&&this.bindElementToScheduler(o,t)}}getWindowParams(){try{let e=window.location.search;if(!e)return{};let o=new URLSearchParams(e),t={};return o.forEach((n,i)=>{n&&n.trim()!==""&&(t[i]=n)}),t}catch(e){return console.error("meetergo: Error parsing window parameters",e),{}}}getPrifillParams(e){try{let o=[],t=this.getWindowParams();return window.meetergoSettings?.prefill&&(t={...t,...window.meetergoSettings.prefill}),e&&(t={...t,...e}),Object.entries(t).forEach(([n,i])=>{if(i!=null)try{let r=encodeURIComponent(n),s=encodeURIComponent(String(i));o.push(`${r}=${s}`)}catch(r){console.warn(`meetergo: Error encoding parameter ${n}`,r)}}),o.join("&")}catch(o){return console.error("meetergo: Error generating prefill parameters",o),""}}setPrefill(e){try{if(!e){console.warn("meetergo: Attempted to set undefined or null prefill");return}window.meetergoSettings||(console.warn("meetergo: Settings object not initialized"),window.meetergoSettings={company:"",formListeners:[],prefill:{}}),window.meetergoSettings.prefill={...e};let o=document.getElementById("meetergo-modal");o&&getComputedStyle(o).visibility==="visible"&&this.refreshModalWithNewPrefill()}catch(o){console.error("meetergo: Error setting prefill values",o)}}refreshModalWithNewPrefill(){try{let e=document.getElementById("meetergo-modal-content");if(!e)return;let o=e.querySelector("iframe");if(!o)return;let t=o.getAttribute("src");if(!t)return;let n=t.split("?")[0],i=this.getPrifillParams();o.setAttribute("src",`${n}?${i}`)}catch(e){console.error("meetergo: Error refreshing modal with new prefill",e)}}meetergoStyleButton(e){try{if(!e)return console.warn("meetergo: Attempted to style undefined button"),e;let o={margin:"0.5rem",padding:"0.8rem",fontWeight:"bold",color:"white",backgroundColor:"#0A64BC",borderRadius:"0.5rem",border:"none",cursor:"pointer",zIndex:"999",transition:"background-color 0.3s ease",outline:"none",boxShadow:"0 2px 5px rgba(0,0,0,0.2)"};Object.assign(e.style,o);let t="meetergo-button-styles";if(!document.getElementById(t)){let n=document.createElement("style");n.id=t,n.textContent=`
          .meetergo-styled-button:hover {
            background-color: #0850A0 !important;
            box-shadow: 0 4px 8px rgba(0,0,0,0.3) !important;
          }
          .meetergo-styled-button:focus {
            outline: 2px solid #0A64BC !important;
            outline-offset: 2px !important;
          }
          .meetergo-styled-button:active {
            transform: translateY(1px) !important;
          }
        `,document.head.appendChild(n)}return e.getAttribute("role")||e.setAttribute("role","button"),e}catch(o){return console.error("meetergo: Error styling button",o),e}}initVideoEmbed(){try{let e=window.meetergoSettings?.videoEmbed;if(!e?.videoSrc||!e?.bookingLink){console.warn("meetergo: Video embed settings missing or incomplete");return}this.createVideoEmbed(e)}catch(e){console.error("meetergo: Error initializing video embed",e)}}createVideoEmbed(e){if(!e?.videoSrc||!e?.bookingLink)return;let{videoSrc:o,bookingLink:t,posterImage:n="",position:i="bottom-right",buttonColor:r="#0a64bc",bookingCta:s="Book Appointment",size:d={width:"200px",height:"158px"},isRound:p=!1}=e,l=document.createElement("div");if(Object.assign(l.style,{position:"fixed",zIndex:"1000",overflow:"hidden",boxShadow:"0 4px 12px rgba(0,0,0,0.15)",cursor:"pointer",transition:"transform 0.3s ease, box-shadow 0.3s ease, width 0.3s ease, height 0.3s ease",border:`2px solid ${r}`}),p){let c=Math.min(parseInt(d?.width||"200"),parseInt(d?.height||"158"))+"px";Object.assign(l.style,{width:c,height:c,borderRadius:"50%"})}else Object.assign(l.style,{width:d.width,height:d.height,borderRadius:"8px"});this.setPositionStyles(l,i);let{video:a,overlayContainer:E,ctaElement:x,loadingIndicator:v,closeButton:u}=this.createVideoEmbedElements(e),f=!1,w={width:l.style.width,height:l.style.height,borderRadius:l.style.borderRadius};l.appendChild(a),l.appendChild(v),E.appendChild(u),E.appendChild(x),l.appendChild(E),document.body.appendChild(l);let h=document.createElement("button");Object.assign(h.style,{position:"absolute",bottom:"10px",left:"50%",width:"90%",transform:"translateX(-50%)",padding:"10px 20px",backgroundColor:r,color:e?.bookingCtaColor||"white",border:"none",borderRadius:"4px",fontWeight:"bold",cursor:"pointer",display:"none",transition:"all 0.3s ease",boxShadow:"0 2px 8px rgba(0,0,0,0.2)",fontSize:"14px",zIndex:"10"}),h.textContent=s,l.appendChild(h);let g=document.createElement("button");Object.assign(g.style,{position:"absolute",top:"50%",left:"50%",transform:"translate(-50%, -50%)",width:"60px",height:"60px",backgroundColor:"rgba(0, 0, 0, 0.5)",color:"white",border:"none",borderRadius:"50%",display:"none",alignItems:"center",justifyContent:"center",cursor:"pointer",transition:"all 0.3s ease, opacity 0.2s ease",zIndex:"10",padding:"0",opacity:"0"}),g.innerHTML='<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="6" y="4" width="4" height="16"></rect><rect x="14" y="4" width="4" height="16"></rect></svg>',g.setAttribute("aria-label","Pause video"),l.appendChild(g);let m=document.createElement("button");Object.assign(m.style,{position:"absolute",top:"10px",left:"10px",width:"30px",height:"30px",backgroundColor:"rgba(0, 0, 0, 0.5)",color:"white",border:"none",borderRadius:"50%",display:"none",alignItems:"center",justifyContent:"center",cursor:"pointer",transition:"all 0.3s ease",zIndex:"10",padding:"0"}),m.innerHTML='<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon><path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"></path></svg>',m.setAttribute("aria-label","Mute video"),l.appendChild(m);let b=document.createElement("div");Object.assign(b.style,{position:"absolute",top:"0",left:"0",width:"100%",height:"5px",backgroundColor:"rgba(0, 0, 0, 0.3)",display:"none",zIndex:"10",overflow:"hidden"});let M=document.createElement("div");Object.assign(M.style,{width:"0%",height:"100%",backgroundColor:r,transition:"width 0.1s linear"}),b.appendChild(M),l.appendChild(b),this.setupVideoSource(a,o,n,v),a.addEventListener("canplay",()=>{v.style.display="none"});let y=!1,k=!1,L=()=>{y?(a.play(),g.innerHTML='<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="6" y="4" width="4" height="16"></rect><rect x="14" y="4" width="4" height="16"></rect></svg>',g.setAttribute("aria-label","Pause video")):(a.pause(),g.innerHTML='<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>',g.setAttribute("aria-label","Play video")),y=!y},B=()=>{k?(a.muted=!1,m.innerHTML='<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon><path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"></path></svg>',m.setAttribute("aria-label","Mute video")):(a.muted=!0,m.innerHTML='<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon><line x1="23" y1="9" x2="17" y2="15"></line><line x1="17" y1="9" x2="23" y2="15"></line></svg>',m.setAttribute("aria-label","Unmute video")),k=!k},S=()=>{if(a.duration){let c=a.currentTime/a.duration*100;M.style.width=`${c}%`}};g.addEventListener("click",c=>{c.stopPropagation(),L()}),m.addEventListener("click",c=>{c.stopPropagation(),B()}),a.addEventListener("timeupdate",S);let H=()=>{g.style.opacity="1",setTimeout(()=>{y||(g.style.opacity="0")},1500)};l.addEventListener("click",c=>{if(c.target===u||u.contains(c.target)||c.target===g||g.contains(c.target)||c.target===m||m.contains(c.target))return;if(c.target===h){L(),this.openModalWithContent({link:t});return}if(f){L(),H();return}f=!0;let A=parseInt(w.width)*2+"px",j=parseInt(w.height)*2+"px";Object.assign(l.style,{width:A,height:j,borderRadius:"12px",cursor:"pointer"}),x.style.display="none",h.style.display="block",g.style.display="flex",m.style.display="flex",b.style.display="block",a.currentTime=0,a.muted=!1,k=!1,a.play().catch(()=>{console.warn("meetergo: Couldn't play video with sound due to browser restrictions")}),y=!1,H(),S()}),u.addEventListener("click",c=>{c.stopPropagation(),f?(f=!1,Object.assign(l.style,{width:w.width,height:w.height,borderRadius:w.borderRadius,cursor:"pointer"}),x.style.display="block",h.style.display="none",g.style.display="none",m.style.display="none",b.style.display="none",a.muted=!0,a.play(),y=!1):(l.style.display="none",this.createMinimizedIndicator(l,r))}),l.addEventListener("mouseenter",()=>{this.applyHoverEffects(l,x,u),f&&h.style.display==="block"&&(h.style.transform="translateX(-50%) translateY(-2px)",h.style.boxShadow="0 4px 12px rgba(0,0,0,0.3)")}),l.addEventListener("mouseleave",()=>{this.removeHoverEffects(l,u),f&&(h.style.transform="translateX(-50%)",h.style.boxShadow="0 2px 8px rgba(0,0,0,0.2)")}),this.addAccessibilitySupport(l,u,h,t,g,m),this.addVideoLoadingTimeout(a,n,v)}createVideoEmbedElements(e){let o=document.createElement("div");Object.assign(o.style,{position:"absolute",top:"0",left:"0",width:"100%",height:"100%",display:"flex",flexDirection:"column",justifyContent:"space-between",pointerEvents:"none"});let t=document.createElement("div");Object.assign(t.style,{position:"absolute",top:"50%",left:"50%",transform:"translate(-50%, -50%)",color:"white",fontSize:"14px",textShadow:"0 2px 4px rgba(0,0,0,0.8)",fontWeight:"bold",textAlign:"center",whiteSpace:"nowrap",padding:"8px",maxWidth:"100%",overflow:"hidden",textOverflow:"ellipsis",backgroundColor:"rgba(0, 0, 0, 0.4)",borderRadius:"4px"}),t.textContent=e?.videoCta||"Click to watch";let n=this.createLoadingIndicator(),i=document.createElement("div");Object.assign(i.style,{position:"absolute",top:"10px",right:"10px",backgroundColor:"rgba(0, 0, 0, 0.5)",borderRadius:"50%",width:"20px",height:"20px",display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",opacity:"0",transition:"opacity 0.3s ease",pointerEvents:"auto",zIndex:"10",padding:"0"}),i.innerHTML='<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>';let r=document.createElement("video");return r.muted=!0,r.loop=!0,r.playsInline=!0,r.autoplay=!0,r.preload="metadata",Object.assign(r.style,{width:"100%",height:"100%",objectFit:"cover"}),e?.posterImage&&(r.poster=e.posterImage),this.ensureAnimationStylesExist(),{video:r,overlayContainer:o,ctaElement:t,loadingIndicator:n,closeButton:i}}createLoadingIndicator(){let e=document.createElement("div");return Object.assign(e.style,{position:"absolute",top:"50%",left:"50%",transform:"translate(-50%, -50%)",width:"30px",height:"30px",border:"3px solid rgba(255, 255, 255, 0.3)",borderRadius:"50%",borderTop:"3px solid #ffffff",animation:"meetergo-spin 1s linear infinite"}),e}ensureAnimationStylesExist(){if(!document.getElementById("meetergo-animations")){let e=document.createElement("style");e.id="meetergo-animations",e.textContent="@keyframes meetergo-spin { 0% { transform: translate(-50%, -50%) rotate(0deg); } 100% { transform: translate(-50%, -50%) rotate(360deg); } }",document.head.appendChild(e)}}setPositionStyles(e,o){o.includes("top")?e.style.top="20px":o.includes("middle")?(e.style.top="50%",e.style.transform="translateY(-50%)"):e.style.bottom="20px",o.includes("left")?e.style.left="20px":o.includes("center")?(e.style.left="50%",e.style.transform=e.style.transform?"translate(-50%, -50%)":"translateX(-50%)"):e.style.right="20px"}setupVideoSource(e,o,t,n){o.endsWith(".m3u8")?this.setupHlsVideo(e,o,t,n):(e.src=o,e.onerror=()=>{console.warn("meetergo: Video failed to load, using poster image instead"),this.fallbackToPoster(e,t),n.style.display="none"})}setupHlsVideo(e,o,t,n){if(typeof Hls<"u")this.initHlsPlayer(e,o,t,n);else{let i=document.createElement("script");i.src="https://cdn.jsdelivr.net/npm/hls.js@latest",i.onload=()=>this.initHlsPlayer(e,o,t,n),i.onerror=()=>{console.warn("meetergo: Failed to load Hls.js, trying direct playback"),e.src=o,n.style.display="none"},document.head.appendChild(i)}}initHlsPlayer(e,o,t,n){if(Hls.isSupported()){let i=new Hls;i.loadSource(o),i.attachMedia(e),i.on(Hls.Events.MANIFEST_PARSED,()=>{e.play().catch(()=>{n.style.display="none"})}),i.on(Hls.Events.ERROR,(r,s)=>{s.fatal&&(this.fallbackToPoster(e,t),n.style.display="none")})}else e.canPlayType("application/vnd.apple.mpegurl")?(e.src=o,e.addEventListener("loadedmetadata",()=>{e.play().catch(()=>{n.style.display="none"})})):(console.warn("meetergo: HLS is not supported in this browser"),this.fallbackToPoster(e,t),n.style.display="none")}fallbackToPoster(e,o){if(!o||!e.parentElement)return;let t=document.createElement("img");t.src=o,Object.assign(t.style,{width:"100%",height:"100%",objectFit:"cover"}),e.parentElement.replaceChild(t,e)}applyHoverEffects(e,o,t){e.style.transform.includes("translate")?e.style.transform=e.style.transform.replace(/scale\([\d.]+\)/g,"")+" scale(1.05)":e.style.transform="scale(1.05)",e.style.boxShadow="0 8px 24px rgba(0, 0, 0, 0.2)",t.style.opacity="1",o.style.display!=="none"&&(o.style.textShadow="0 1px 3px rgba(0,0,0,0.9)")}removeHoverEffects(e,o){e.style.transform.includes("translate")?e.style.transform=e.style.transform.replace(/ scale\([\d.]+\)/g,""):e.style.transform="",e.style.boxShadow="0 4px 12px rgba(0, 0, 0, 0.15)",o.style.opacity="0"}createMinimizedIndicator(e,o){let t=document.createElement("div");Object.assign(t.style,{position:"fixed",bottom:"20px",right:"20px",width:"40px",height:"40px",borderRadius:"50%",backgroundColor:o,boxShadow:"0 2px 10px rgba(0, 0, 0, 0.2)",cursor:"pointer",zIndex:"9999",display:"flex",alignItems:"center",justifyContent:"center"}),t.innerHTML='<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="white" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>',document.body.appendChild(t),t.addEventListener("click",()=>{e.style.display="block",document.body.removeChild(t)})}addAccessibilitySupport(e,o,t,n,i,r){e.setAttribute("role","button"),e.setAttribute("aria-label","Click to expand video"),e.setAttribute("tabindex","0"),t.setAttribute("role","button"),t.setAttribute("aria-label","Book an appointment"),t.setAttribute("tabindex","0"),i&&(i.setAttribute("role","button"),i.setAttribute("tabindex","0"),i.addEventListener("keydown",s=>{(s.key==="Enter"||s.key===" ")&&(s.preventDefault(),i.click())})),r&&(r.setAttribute("role","button"),r.setAttribute("tabindex","0"),r.addEventListener("keydown",s=>{(s.key==="Enter"||s.key===" ")&&(s.preventDefault(),r.click())})),e.addEventListener("keydown",s=>{s.key==="Enter"||s.key===" "?(s.preventDefault(),e.click()):s.key==="Escape"&&o.click()}),t.addEventListener("keydown",s=>{(s.key==="Enter"||s.key===" ")&&(s.preventDefault(),this.openModalWithContent({link:n}))})}addVideoLoadingTimeout(e,o,t){setTimeout(()=>{e.readyState===0&&e.error===null&&(console.warn("meetergo: Video failed to load after timeout, using poster image"),this.fallbackToPoster(e,o),t.style.display="none")},3e3)}},T=new C;window.meetergo=T;})();
