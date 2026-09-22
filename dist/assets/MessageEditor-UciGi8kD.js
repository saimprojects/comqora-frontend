import{g as o,r as w,j as e,d as N,O as S,$ as A}from"./index-BDgkumHc.js";import{C as W}from"./check-check-BsJCWeqG.js";/**
 * @license lucide-react v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const z=o("Bold",[["path",{d:"M6 12h9a4 4 0 0 1 0 8H7a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1h7a4 4 0 0 1 0 8",key:"mg9rjx"}]]);/**
 * @license lucide-react v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const D=o("Code",[["polyline",{points:"16 18 22 12 16 6",key:"z7tu5w"}],["polyline",{points:"8 6 2 12 8 18",key:"1eg1df"}]]);/**
 * @license lucide-react v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const R=o("Italic",[["line",{x1:"19",x2:"10",y1:"4",y2:"4",key:"15jd3p"}],["line",{x1:"14",x2:"5",y1:"20",y2:"20",key:"bu0au3"}],["line",{x1:"15",x2:"9",y1:"4",y2:"20",key:"uljnxc"}]]);/**
 * @license lucide-react v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const T=o("List",[["path",{d:"M3 12h.01",key:"nlz23k"}],["path",{d:"M3 18h.01",key:"1tta3j"}],["path",{d:"M3 6h.01",key:"1rqtza"}],["path",{d:"M8 12h13",key:"1za7za"}],["path",{d:"M8 18h13",key:"1lx6n3"}],["path",{d:"M8 6h13",key:"ik3vkj"}]]);/**
 * @license lucide-react v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const q=o("RefreshCw",[["path",{d:"M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8",key:"v9h5vc"}],["path",{d:"M21 3v5h-5",key:"1q7to0"}],["path",{d:"M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16",key:"3uifl3"}],["path",{d:"M8 16H3v5",key:"1cv678"}]]);/**
 * @license lucide-react v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Y=o("Strikethrough",[["path",{d:"M16 4H9a3 3 0 0 0-2.83 4",key:"43sutm"}],["path",{d:"M14 12a4 4 0 0 1 0 8H6",key:"nlfj13"}],["line",{x1:"4",x2:"20",y1:"12",y2:"12",key:"1e0a9i"}]]),I={Signature:`*{store}*
Order update for {customer}

*Order:* {order_number}
*Status:* {status}
*Courier:* {courier}
*Tracking:* {tracking_id}

Thank you for choosing us.`,Friendly:`Hi {customer} 👋

Your order *{order_number}* is now *{status}*.
Tracking: {tracking_id}
Courier: {courier}

With thanks,
*{store}*`,Minimal:`*{store} · Order update*
{order_number} — *{status}*
Tracking: {tracking_id}`,"Care first":`Hello {customer},

*An update from {store}* 💬
Your order *{order_number}* is currently *{status}*.

*Delivery partner:* {courier}
*Tracking number:* {tracking_id}

_Questions? Reply here and our team will help._`};function f(a){return a.split(/(\*[^*\n]+\*|_[^_\n]+_|~[^~\n]+~|`[^`\n]+`)/g).map((r,l)=>r.startsWith("*")&&r.endsWith("*")?e.jsx("strong",{children:r.slice(1,-1)},l):r.startsWith("_")&&r.endsWith("_")?e.jsx("em",{children:r.slice(1,-1)},l):r.startsWith("~")&&r.endsWith("~")?e.jsx("s",{children:r.slice(1,-1)},l):r.startsWith("`")&&r.endsWith("`")?e.jsx("code",{children:r.slice(1,-1)},l):r)}const E={"New arrivals":`*Fresh arrivals are here* ✨

Discover our latest collection, selected with you in mind.

_Reply to ask about availability or place your order._`,"Product spotlight":`*Your next favourite*

Take a closer look at our featured picks.

*Interested?* Reply and our team will help you order.`,"Store announcement":`*A little update from our team*

Add your announcement here.

Thank you for being part of our community.`};function B({value:a,onChange:r,label:l="Message",name:b,order:g=!1,maxLength:d=2e3,variables:u,placeholders:v,previewStatus:M}){const h=w.useRef(null),[c,m]=w.useState(""),x=g?I:E,j={store:"Your brand",customer:"Ayesha",order_number:"CQ-1042",status:M||"out for delivery",courier:"Your courier",tracking_id:"PK123456789",...u},y=t=>t.replace(/\{(\w+)\}/g,(s,n)=>j[n]??s);function p(t,s=0){const n=h.current,i=n.selectionStart,C=n.selectionEnd,k=a.slice(0,i)+t+a.slice(C);k.length>d||(r(k),requestAnimationFrame(()=>{n.focus({preventScroll:!0}),n.setSelectionRange(i+t.length-s,i+t.length-s)}))}function _(t){const s=h.current;p(t+(a.slice(s.selectionStart,s.selectionEnd)||"text")+t)}return e.jsxs("div",{className:"wa-composer",children:[e.jsxs("div",{className:"wa-composer-heading",children:[e.jsx(N,{size:19}),e.jsxs("div",{children:[e.jsx("strong",{children:"Make it sound like your brand"}),e.jsx("p",{children:"Start with a style, or write your own. Everything below is editable."})]})]}),e.jsxs("div",{className:"wa-template-gallery","aria-label":"Message styles",children:[Object.entries(x).map(([t,s],n)=>e.jsxs("button",{type:"button",className:`wa-template-card wa-template-tone-${n%3}`,"aria-pressed":c===t,onClick:()=>m(t),children:[e.jsx("span",{children:t}),e.jsx("small",{children:y(s).replace(/[*_~]/g,"").split(`
`).filter(Boolean).slice(0,2).join(" · ")})]},t)),e.jsxs("button",{type:"button",className:"wa-template-card","aria-pressed":!c,onClick:()=>{m(""),h.current.focus({preventScroll:!0})},children:[e.jsx("span",{children:"Custom message"}),e.jsx("small",{children:"Your words. Your brand voice. Keep editing the message below."})]})]}),c&&e.jsxs("div",{className:"wa-template-choice",children:[e.jsx("div",{className:"wa-formatted",children:f(y(x[c]))}),e.jsx("button",{type:"button",className:"btn btn-secondary",onClick:()=>{const t=x[c],s=u?t.replace(/\{(\w+)\}/g,(n,i)=>u[i]??n):t;s.length<=d&&(r(s),m(""))},children:"Use this template"}),e.jsx("small",{children:"Replaces the current text. It does not send a message."})]}),e.jsxs("div",{className:"wa-composer-grid",children:[e.jsxs("div",{className:"wa-write-pane",children:[e.jsxs("div",{className:"wa-format-toolbar",role:"group","aria-label":"Message formatting",children:[[[z,"Bold","*"],[R,"Italic","_"],[Y,"Strikethrough","~"],[D,"Monospace","`"]].map(([t,s,n])=>e.jsx("button",{type:"button",title:s,"aria-label":s,onMouseDown:i=>i.preventDefault(),onClick:()=>_(n),children:e.jsx(t,{size:17})},s)),e.jsx("button",{type:"button","aria-label":"Add bullet",title:"Add bullet",onMouseDown:t=>t.preventDefault(),onClick:()=>p(`
• `),children:e.jsx(T,{size:18})}),e.jsx("button",{type:"button","aria-label":"Add sparkle emoji",title:"Add sparkle emoji",onMouseDown:t=>t.preventDefault(),onClick:()=>p("✨"),children:"✨"})]}),e.jsx(S,{label:l,children:e.jsx("textarea",{ref:h,name:b,value:a,onChange:t=>r(t.target.value),rows:"9",required:!0,maxLength:d})}),e.jsxs("div",{className:"wa-editor-meta",children:[e.jsx("small",{children:"Select words, then tap a formatting button."}),e.jsxs("small",{children:[a.length,"/",d]})]}),g&&!u&&e.jsxs("div",{className:"wa-variable-chips",children:[e.jsx("small",{children:"Insert customer / order details:"}),(v||Object.keys(j)).map(t=>e.jsx("button",{type:"button",onMouseDown:s=>s.preventDefault(),onClick:()=>p(`{${t}}`),children:t.replaceAll("_"," ")},t))]})]}),e.jsxs("aside",{className:"wa-chat-preview","aria-label":"Message preview",children:[e.jsxs("div",{className:"wa-chat-header",children:[e.jsx(A,{size:23}),e.jsxs("div",{children:[e.jsx("strong",{children:j.store}),e.jsx("small",{children:"WhatsApp-style preview · sample data"})]})]}),e.jsx("div",{className:"wa-chat-surface",children:e.jsxs("div",{className:"wa-chat-bubble",children:[e.jsx("div",{className:"wa-formatted",children:f(y(a))||"Your message preview appears here…"}),e.jsxs("span",{className:"wa-chat-time",children:["Preview ",e.jsx(W,{size:14})]})]})}),e.jsx("p",{children:"Text formatting is sent to WhatsApp; these background colours are preview styling only. Actual appearance may differ. Campaign products and media are added separately."})]})]})]})}export{B as M,q as R};
