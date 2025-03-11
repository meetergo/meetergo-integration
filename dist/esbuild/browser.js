(()=>{var d=class{constructor(){this.lastActiveElement=null;document&&(document.readyState==="complete"||document.readyState==="interactive")?this.init():window.addEventListener("DOMContentLoaded",()=>{this.init()})}init(){this.listenToForms(),this.addFloatingButton(),this.addModal(),this.parseIframes(),this.parseButtons(),this.addListeners(),this.addGeneralCss()}addGeneralCss(){let e=document.createElement("style");e.textContent=`
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
    `,document.head.appendChild(e)}onFormSubmit(e){if(!(e.currentTarget instanceof HTMLFormElement))return;let o=e.currentTarget;if(e.preventDefault(),!o)return;let t=window.meetergoSettings?.formListeners.find(r=>o.id?o.id===r.formId:!1);if(!t)return;e.preventDefault();let n=new FormData(o),i={};for(let[r,s]of n)i[r]=s.toString();window.meetergo.openModalWithContent({link:t.link,existingParams:i})}listenToForms(){let e=document.querySelectorAll("form");for(let o of e)o.addEventListener("submit",this.onFormSubmit,!1)}addFloatingButton(){if(window.meetergoSettings?.floatingButton&&window.meetergoSettings?.floatingButton?.position&&window.meetergoSettings?.floatingButton.link){let e=window.meetergoSettings?.floatingButton.position,o=window.meetergoSettings?.floatingButton.animation||"none",t=document.createElement("button");t.classList.add("meetergo-modal-button");let n=window.meetergoSettings?.floatingButton?.text??"Book appointment";window.meetergoSettings?.floatingButton?.icon?this.loadLucideIcon(window.meetergoSettings.floatingButton.icon,t,n):t.innerHTML=n,t.setAttribute("link",window.meetergoSettings.floatingButton.link),t.style.position="fixed";let i="";e.includes("top")?t.style.top="10px":e.includes("middle")?(t.style.top="50%",i="translateY(-50%)",t.style.transform=i):t.style.bottom="10px",e.includes("left")?t.style.left="5px":e.includes("center")?(t.style.left="50%",i=i?"translate(-50%, -50%)":"translateX(-50%)",t.style.transform=i):t.style.right="5px",t=this.meetergoStyleButton(t),window.meetergoSettings?.floatingButton.backgroundColor&&(t.style.backgroundColor=window.meetergoSettings?.floatingButton.backgroundColor),window.meetergoSettings?.floatingButton.textColor&&(t.style.color=window.meetergoSettings?.floatingButton.textColor),o!=="none"&&(o==="pulse"?t.classList.add("meetergo-animation-pulse"):o==="bounce"?t.classList.add("meetergo-animation-bounce"):o==="slide-in"&&(e.includes("right")?t.classList.add("meetergo-animation-slide-in-right"):e.includes("left")?t.classList.add("meetergo-animation-slide-in-left"):e.includes("top")?t.classList.add("meetergo-animation-slide-in-top"):t.classList.add("meetergo-animation-slide-in-bottom"))),document.body.appendChild(t)}}loadLucideIcon(e,o,t){if(o.style.display="inline-flex",o.style.alignItems="center",o.style.justifyContent="center",o.innerHTML="",e){let n=document.createElement("span");n.style.display="inline-flex",n.style.alignItems="center",t&&(n.style.marginRight="8px"),o.appendChild(n),this.fetchLucideIcon(e,n)}t&&o.appendChild(document.createTextNode(t))}fetchLucideIcon(e,o){let t={CalendarPlus:'<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="18" x="3" y="4" rx="2" ry="2"/><line x1="16" x2="16" y1="2" y2="6"/><line x1="8" x2="8" y1="2" y2="6"/><line x1="3" x2="21" y1="10" y2="10"/><line x1="12" x2="12" y1="14" y2="18"/><line x1="10" x2="14" y1="16" y2="16"/></svg>',CalendarPlus2:'<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 13V6a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h8"/><line x1="16" x2="16" y1="2" y2="6"/><line x1="8" x2="8" y1="2" y2="6"/><line x1="3" x2="21" y1="10" y2="10"/><path d="M16 21v-6"/><path d="M19 18h-6"/></svg>',Calendar:'<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="18" x="3" y="4" rx="2" ry="2"/><line x1="16" x2="16" y1="2" y2="6"/><line x1="8" x2="8" y1="2" y2="6"/><line x1="3" x2="21" y1="10" y2="10"/></svg>',Clock:'<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>',User:'<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>',Video:'<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 8.5V15.5C22 15.5 20.5 14.5 19.5 14.5C18.5 14.5 17 15.5 17 15.5V8.5C17 8.5 18.5 9.5 19.5 9.5C20.5 9.5 22 8.5 22 8.5Z"/><rect width="15" height="14" x="2" y="5" rx="2"/></svg>',Mail:'<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>',Phone:'<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>',MessageSquare:'<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>',Coffee:'<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 8h1a4 4 0 1 1 0 8h-1"/><path d="M3 8h14v9a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4Z"/><line x1="6" x2="6" y1="2" y2="4"/><line x1="10" x2="10" y1="2" y2="4"/><line x1="14" x2="14" y1="2" y2="4"/></svg>',Users:'<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>',Briefcase:'<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="20" height="14" x="2" y="7" rx="2" ry="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg>',Handshake:'<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20.42 4.58a5.4 5.4 0 0 0-7.65 0l-.77.78-.77-.78a5.4 5.4 0 0 0-7.65 0C1.46 6.7 1.33 10.28 4 13l8 8 8-8c2.67-2.72 2.54-6.3.42-8.42z"/></svg>',PenTool:'<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m12 19 7-7 3 3-7 7-3-3z"/><path d="m18 13-1.5-7.5L2 2l3.5 14.5L13 18l5-5z"/><path d="m2 2 7.586 7.586"/><circle cx="11" cy="11" r="2"/></svg>',Heart:'<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/></svg>',Star:'<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>',BookOpen:'<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>'};t[e]?o.innerHTML=t[e]:(o.innerHTML=t.Calendar,console.warn(`Meetergo: Icon '${e}' not found, using default Calendar icon`))}addListeners(){try{document.body.addEventListener("click",e=>{let t=e.target.closest(".meetergo-modal-button");if(t){e.preventDefault();let n=t.getAttribute("link")||t.getAttribute("href");n?this.openModalWithContent({link:n}):console.warn("Meetergo: Button clicked without a link attribute")}}),document.addEventListener("keydown",e=>{e.key==="Escape"&&this.closeModal()}),window.onmessage=e=>{try{let o=e.data;switch(o.event){case"open-modal":{let t=this.getParamsFromMainIframe(),n=o.data;if(!n.link){console.error("Meetergo: Missing link in open-modal event");return}this.openModalWithContent({link:n.link,existingParams:{...n.params,...t}});break}case"close-modal":{window.meetergo.closeModal();break}default:break}}catch(o){console.error("Meetergo: Error handling message event",o)}}}catch(e){console.error("Meetergo: Error setting up event listeners",e)}}getParamsFromMainIframe(){let e={},o=document.querySelector(".meetergo-iframe");if(o){let t=o.getAttribute("link");if(t){let n=t.split("?")[1];n&&new URLSearchParams(n).forEach((r,s)=>{e[s]=r})}}return e}openModalWithContent(e){try{if(window.meetergoSettings?.disableModal)return;let{link:o,existingParams:t}=e;if(!o){console.error("Meetergo: Link is required for opening modal");return}let n=document.createElement("iframe");n.name="meetergo-embedded-modal";let i=this.getPrifillParams(t);n.setAttribute("src",`${o}?${i}`),n.style.width="100%",n.style.height="100%",n.style.border="none";let r=document.getElementById("meetergo-modal-content");if(!r){console.error("Meetergo: Modal content element not found");return}r.innerHTML="",r.appendChild(n),this.openModal()}catch(o){console.error("Meetergo: Error opening modal with content",o)}}addModal(){try{let e=document.createElement("div");e.id="meetergo-modal",e.setAttribute("role","dialog"),e.setAttribute("aria-modal","true"),e.setAttribute("aria-labelledby","meetergo-modal-title"),e.setAttribute("aria-describedby","meetergo-modal-description"),e.style.zIndex="999999",e.style.position="fixed",e.style.transition="visibility 0s linear 0.1s,opacity 0.3s ease",e.style.top="0",e.style.left="0",e.style.width="100%",e.style.height="100%",e.style.display="flex",e.style.justifyContent="center",e.style.alignItems="center",e.style.visibility="hidden",e.style.opacity="0";let o=document.createElement("div");o.style.zIndex="1001",o.style.position="fixed",o.style.top="0",o.style.left="0",o.style.width="100%",o.style.height="100%",o.style.backgroundColor="rgba(0,0,0,0.6)";let t=document.createElement("div");t.className="meetergo-spinner",t.setAttribute("role","status"),t.setAttribute("aria-label","Loading"),t.style.zIndex="1002",o.onclick=a=>{a.preventDefault(),window.meetergo.closeModal()};let n=document.createElement("div");n.id="meetergo-modal-content",n.style.zIndex="1003",n.style.position="relative",n.style.width="100%",n.style.height="100%",n.style.backgroundColor="rgba(0,0,0,0)",n.style.borderRadius="0.7rem",n.style.overflow="hidden",n.style.padding="16px";let i=document.createElement("h2");i.id="meetergo-modal-title",i.textContent="Meetergo Booking",i.style.position="absolute",i.style.width="1px",i.style.height="1px",i.style.padding="0",i.style.margin="-1px",i.style.overflow="hidden",i.style.clip="rect(0, 0, 0, 0)",i.style.whiteSpace="nowrap",i.style.borderWidth="0";let r=document.createElement("p");r.id="meetergo-modal-description",r.textContent="Calendar booking interface",r.style.position="absolute",r.style.width="1px",r.style.height="1px",r.style.padding="0",r.style.margin="-1px",r.style.overflow="hidden",r.style.clip="rect(0, 0, 0, 0)",r.style.whiteSpace="nowrap",r.style.borderWidth="0";let s=document.createElement("button");s.className="close-button",s.setAttribute("aria-label","Close booking modal"),s.setAttribute("type","button"),s.style.zIndex="1004",s.onclick=a=>{a.preventDefault(),window.meetergo.closeModal()},s.innerHTML=`<svg
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
      </svg>`;let l=document.createDocumentFragment();l.appendChild(o),l.appendChild(n),l.appendChild(t),l.appendChild(s),l.appendChild(i),l.appendChild(r),e.appendChild(l),document.body.appendChild(e)}catch(e){console.error("Meetergo: Error adding modal to the page",e)}}openModal(){try{this.lastActiveElement=document.activeElement;let e=document.getElementById("meetergo-modal");if(!e){console.error("Meetergo: Modal element not found");return}e.style.visibility="visible",e.style.opacity="1";let o=e.getElementsByClassName("meetergo-spinner");if(o.length>0){let n=o[0];n.style.visibility="visible",n.style.opacity="1"}let t=e.querySelector(".close-button");t&&setTimeout(()=>{t.focus()},100),document.body.style.overflow="hidden"}catch(e){console.error("Meetergo: Error opening modal",e)}}closeModal(e){try{let o=document.getElementById("meetergo-modal");if(!o){console.error("Meetergo: Modal element not found when attempting to close");return}o.style.visibility="hidden",o.style.opacity="0";let t=o.getElementsByClassName("meetergo-spinner");if(t.length>0){let n=t[0];n.style.visibility="hidden",n.style.opacity="0"}e||setTimeout(()=>{let n=document.getElementById("meetergo-modal-content");n&&(n.innerHTML="")},300),document.body.style.overflow="",this.lastActiveElement instanceof HTMLElement&&setTimeout(()=>{this.lastActiveElement.focus()},100)}catch(o){console.error("Meetergo: Error closing modal",o)}}parseIframes(){try{let e=document.getElementsByClassName("meetergo-iframe");if(!e.length)return;let o=this.getPrifillParams();Array.from(e).forEach(t=>{try{let n=document.createElement("iframe");n.title="Meetergo Booking Calendar",n.setAttribute("loading","lazy");let i=(t.getAttribute("link")||t.getAttribute("href"))??"";if(!i){console.warn("Meetergo: Iframe element missing link attribute");return}n.setAttribute("src",`${i}?${o}`),n.style.width="100%",n.style.height="100%",n.style.border="none",n.style.minHeight="690px";let r=document.createElement("div");r.className="meetergo-spinner",r.style.position="absolute",r.style.top="50%",r.style.left="50%",r.style.transform="translate(-50%, -50%)",n.addEventListener("load",()=>{r.parentNode&&r.parentNode.removeChild(r)}),t instanceof HTMLElement&&(t.style.position="relative"),t instanceof HTMLElement&&(t.innerHTML="",t.appendChild(n)),t.appendChild(r)}catch(n){console.error("Meetergo: Error processing iframe element",n)}})}catch(e){console.error("Meetergo: Error parsing iframes",e)}}postScrollHeightToParent(e){window.parent.postMessage({scrollHeight:e},"*")}sendScrollHeightToParent(){let e=document.body.scrollHeight;this.postScrollHeightToParent(e)}parseButtons(){let e=document.getElementsByClassName("meetergo-styled-button");for(let o of e)o=this.meetergoStyleButton(o)}getWindowParams(){try{let e=window.location.search;if(!e)return{};let o=new URLSearchParams(e),t={};return o.forEach((n,i)=>{n&&n.trim()!==""&&(t[i]=n)}),t}catch(e){return console.error("Meetergo: Error parsing window parameters",e),{}}}getPrifillParams(e){try{let o=[],t=this.getWindowParams();return window.meetergoSettings?.prefill&&(t={...t,...window.meetergoSettings.prefill}),e&&(t={...t,...e}),Object.entries(t).forEach(([n,i])=>{if(i!=null)try{let r=encodeURIComponent(n),s=encodeURIComponent(String(i));o.push(`${r}=${s}`)}catch(r){console.warn(`Meetergo: Error encoding parameter ${n}`,r)}}),o.join("&")}catch(o){return console.error("Meetergo: Error generating prefill parameters",o),""}}setPrefill(e){try{if(!e){console.warn("Meetergo: Attempted to set undefined or null prefill");return}window.meetergoSettings||(console.warn("Meetergo: Settings object not initialized"),window.meetergoSettings={company:"",formListeners:[],prefill:{}}),window.meetergoSettings.prefill={...e};let o=document.getElementById("meetergo-modal");o&&getComputedStyle(o).visibility==="visible"&&this.refreshModalWithNewPrefill()}catch(o){console.error("Meetergo: Error setting prefill values",o)}}refreshModalWithNewPrefill(){try{let e=document.getElementById("meetergo-modal-content");if(!e)return;let o=e.querySelector("iframe");if(!o)return;let t=o.getAttribute("src");if(!t)return;let n=t.split("?")[0],i=this.getPrifillParams();o.setAttribute("src",`${n}?${i}`)}catch(e){console.error("Meetergo: Error refreshing modal with new prefill",e)}}meetergoStyleButton(e){try{if(!e)return console.warn("Meetergo: Attempted to style undefined button"),e;let o={margin:"0.5rem",padding:"0.8rem",fontWeight:"bold",color:"white",backgroundColor:"#0A64BC",borderRadius:"0.5rem",border:"none",cursor:"pointer",zIndex:"999",transition:"background-color 0.3s ease",outline:"none",boxShadow:"0 2px 5px rgba(0,0,0,0.2)"};Object.assign(e.style,o);let t="meetergo-button-styles";if(!document.getElementById(t)){let n=document.createElement("style");n.id=t,n.textContent=`
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
        `,document.head.appendChild(n)}return e.getAttribute("role")||e.setAttribute("role","button"),e}catch(o){return console.error("Meetergo: Error styling button",o),e}}},c=new d;window.meetergo=c;})();
