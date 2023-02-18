(()=>{var r=class{constructor(){window.addEventListener("DOMContentLoaded",()=>{this.init()})}init(){this.listenToForms(),this.addFloatingButton(),this.addModal(),this.parseIframes(),this.parseButtons(),this.addListeners(),this.addGeneralCss()}addGeneralCss(){let e=document.createElement("style");e.textContent=`
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
    `,document.head.appendChild(e)}onFormSubmit(e){e.preventDefault();let t=e.currentTarget;if(!t)return;let n=window.meetergoSettings?.formListeners.find(s=>t.id?t.id===s.formId:!s.formId);if(!n)return;let o=new FormData(t),i={};for(let[s,a]of o)i[s]=a.toString();window.meetergo.openModalWithContent({link:n.link,existingParams:i})}listenToForms(){let e=document.querySelectorAll("form");for(let t of e)t.addEventListener("submit",this.onFormSubmit,!1)}addFloatingButton(){if(window.meetergoSettings?.floatingButton&&window.meetergoSettings?.floatingButton?.position&&window.meetergoSettings?.floatingButton.link){let e=window.meetergoSettings.floatingButton.position,t=document.createElement("button");t.classList.add("meetergo-modal-button"),t.innerHTML=window.meetergoSettings?.floatingButton?.text??"Book appointment",t.setAttribute("link",window.meetergoSettings.floatingButton.link),t.style.position="fixed",e.includes("top")?t.style.top="0":t.style.bottom="0",e.includes("left")?t.style.left="0":t.style.right="0",t=this.meetergoStyleButton(t),window.meetergoSettings?.floatingButton.backgroundColor&&(t.style.backgroundColor=window.meetergoSettings?.floatingButton.backgroundColor),window.meetergoSettings?.floatingButton.textColor&&(t.style.color=window.meetergoSettings?.floatingButton.textColor),document.body.appendChild(t)}}addListeners(){let e=document.getElementsByClassName("meetergo-modal-button");for(let t of e)t.addEventListener("click",n=>{n.preventDefault();let o=t.getAttribute("link")||t.getAttribute("href");o&&this.openModalWithContent({link:o})});window.onmessage=t=>{let n=t.data;switch(n.event){case"open-modal":{let o=n.data;this.openModalWithContent({link:o.link,existingParams:o.params});break}case"close-modal":{window.meetergo.closeModal();break}}}}openModalWithContent(e){let{link:t,existingParams:n}=e,o=document.createElement("iframe");o.name="meetergo-embedded-modal";let i=this.getPrifillParams(n);o.setAttribute("src",`${t}?${i}`),o.style.width="100%",o.style.height="100%",o.style.border="none";let s=document.getElementById("meetergo-modal-content");s&&s.replaceChildren(o),this.openModal()}addModal(){let e=document.createElement("div");e.id="meetergo-modal",e.style.zIndex="999999",e.style.position="fixed",e.style.transition="visibility 0s linear 0.1s,opacity 0.3s ease",e.style.top="0",e.style.left="0",e.style.width="100%",e.style.height="100%",e.style.display="flex",e.style.justifyContent="center",e.style.alignItems="center",e.style.visibility="hidden",e.style.opacity="0";let t=document.createElement("div");t.style.zIndex="1001",t.style.position="fixed",t.style.top="0",t.style.left="0",t.style.width="100%",t.style.height="100%",t.style.backgroundColor="rgba(0,0,0,0.6)";let n=document.createElement("div");n.className="meetergo-spinner",n.style.zIndex="1002",t.onclick=()=>window.meetergo.closeModal();let o=document.createElement("div");o.id="meetergo-modal-content",o.style.zIndex="1003",o.style.position="relative",o.style.width="100%",o.style.height="100%",o.style.backgroundColor="rgba(0,0,0,0)",o.style.borderRadius="0.7rem",o.style.overflow="hidden",o.style.padding="16px";let i=document.createElement("button");i.className="close-button",i.style.zIndex="1004",i.onclick=()=>window.meetergo.closeModal(),i.innerHTML=`<svg
      stroke="currentColor"
      fill="currentColor"
      stroke-width="0"
      viewBox="0 0 512 512"
      height="24px"
      width="24px"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M289.94 256l95-95A24 24 0 00351 127l-95 95-95-95a24 24 0 00-34 34l95 95-95 95a24 24 0 1034 34l95-95 95 95a24 24 0 0034-34z"
      ></path>
    </svg>`,e.appendChild(t),e.appendChild(o),e.appendChild(n),e.appendChild(i),document.body.appendChild(e)}openModal(){let e=document.getElementById("meetergo-modal");if(e){e.style.visibility="visible",e.style.opacity="1";let t=e.getElementsByClassName("meetergo-spinner");if(t.length>0){let[n]=t;n instanceof HTMLElement&&(n.style.visibility="visible",n.style.opacity="1")}}}closeModal(e){let t=document.getElementById("meetergo-modal");if(t){t.style.visibility="hidden",t.style.opacity="0";let n=t.getElementsByClassName("meetergo-spinner");if(n.length>0){let[o]=n;o instanceof HTMLElement&&(o.style.visibility="hidden",o.style.opacity="0")}if(!e){let o=document.getElementById("meetergo-modal-content");o&&o.replaceChildren()}}}parseIframes(){let e=document.getElementsByClassName("meetergo-iframe"),t=this.getPrifillParams();for(let n of e){let o=document.createElement("iframe"),i=n.getAttribute("link")??"";o.setAttribute("src",`${i}?${t}`),o.style.width="100%",o.style.height="100%",o.style.border="none",o.style.minHeight="690px",n.replaceChildren(o)}}parseButtons(){let e=document.getElementsByClassName("meetergo-styled-button");for(let t of e)t=this.meetergoStyleButton(t)}getWindowParams(){let e=window.location.search,t=new URLSearchParams(e),n={};for(let o of t.keys()){let i=t.get(o);i&&(n[o]=i)}return n}getPrifillParams(e){let t=[],n={...this.getWindowParams()};return window.meetergoSettings?.prefill&&(n={...n,...window.meetergoSettings?.prefill}),n={...n,...e},Object.entries(n).forEach(([o,i])=>{t.push(`${o}=${encodeURIComponent(i)}`)}),t.join("&")}setPrefill(e){window.meetergoSettings.prefill=e}meetergoStyleButton(e){return e.style.margin="0.5rem",e.style.padding="0.8rem",e.style.fontWeight="bold",e.style.color="white",e.style.backgroundColor="#0A64BC",e.style.borderRadius="0.5rem",e.style.border="none",e.style.cursor="pointer",e.style.zIndex="999",e}},l=new r;window.meetergo=l;})();
