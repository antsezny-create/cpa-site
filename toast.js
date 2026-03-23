// ══════════════════════════════════════
//  TOAST NOTIFICATION SYSTEM
//  Replaces all alert() / confirm() / prompt() calls
//  Include this file on dashboard.html before all other scripts
// ══════════════════════════════════════

// ── Toast (replaces alert) ──
// Usage: toast("Message") or toast("Message", "error"|"success"|"warning"|"info")
function toast(message, type = "info", duration = 3500) {
  let container = document.getElementById("toast-container");
  if (!container) {
    container = document.createElement("div");
    container.id = "toast-container";
    container.style.cssText = `
      position: fixed;
      bottom: 24px;
      right: 24px;
      z-index: 99999;
      display: flex;
      flex-direction: column;
      gap: 10px;
      pointer-events: none;
    `;
    document.body.appendChild(container);
  }

  let colors = {
    success: { bg: "rgba(61,214,140,0.12)", border: "rgba(61,214,140,0.3)", icon: "#3DD68C", text: "#3DD68C" },
    error:   { bg: "rgba(240,96,112,0.12)", border: "rgba(240,96,112,0.3)", icon: "#F06070", text: "#F06070" },
    warning: { bg: "rgba(240,160,80,0.12)", border: "rgba(240,160,80,0.3)", icon: "#F0A050", text: "#F0A050" },
    info:    { bg: "rgba(91,141,239,0.12)", border: "rgba(91,141,239,0.3)", icon: "#5B8DEF", text: "#E8E9EE" }
  };
  let icons = {
    success: `<svg width="16" height="16" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="7" stroke="currentColor" stroke-width="1.5"/><polyline points="5,8 7,10 11,6" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" fill="none"/></svg>`,
    error:   `<svg width="16" height="16" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="7" stroke="currentColor" stroke-width="1.5"/><line x1="5" y1="5" x2="11" y2="11" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/><line x1="11" y1="5" x2="5" y2="11" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>`,
    warning: `<svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M8 2L14 13H2L8 2Z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/><line x1="8" y1="7" x2="8" y2="10" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/><circle cx="8" cy="12" r="0.5" fill="currentColor"/></svg>`,
    info:    `<svg width="16" height="16" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="7" stroke="currentColor" stroke-width="1.5"/><line x1="8" y1="7" x2="8" y2="11" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/><circle cx="8" cy="5" r="0.5" fill="currentColor"/></svg>`
  };

  let c = colors[type] || colors.info;
  let t = document.createElement("div");
  t.style.cssText = `
    display: flex;
    align-items: center;
    gap: 10px;
    background: #1C1E27;
    border: 1px solid ${c.border};
    border-left: 3px solid ${c.icon};
    border-radius: 10px;
    padding: 12px 16px;
    min-width: 280px;
    max-width: 400px;
    pointer-events: all;
    box-shadow: 0 8px 32px rgba(0,0,0,0.4);
    opacity: 0;
    transform: translateX(20px);
    transition: all 0.25s ease;
    font-family: 'DM Sans', sans-serif;
  `;
  t.innerHTML = `
    <span style="color:${c.icon};flex-shrink:0;">${icons[type]||icons.info}</span>
    <span style="font-size:13px;color:#E8E9EE;line-height:1.4;flex:1;">${message}</span>
    <button onclick="this.parentElement.remove()" style="background:none;border:none;color:#5C6178;cursor:pointer;font-size:16px;line-height:1;padding:0;margin-left:4px;flex-shrink:0;">×</button>
  `;
  container.appendChild(t);
  requestAnimationFrame(() => {
    t.style.opacity = "1";
    t.style.transform = "translateX(0)";
  });
  setTimeout(() => {
    t.style.opacity = "0";
    t.style.transform = "translateX(20px)";
    setTimeout(() => t.remove(), 300);
  }, duration);
}

// ── Modal (replaces confirm) ──
// Usage: showModal({ title, message, confirmText, cancelText, type, onConfirm })
function showModal({ title, message, confirmText = "Confirm", cancelText = "Cancel", type = "default", onConfirm, onCancel }) {
  let overlay = document.createElement("div");
  overlay.style.cssText = `
    position: fixed; inset: 0; z-index: 99998;
    background: rgba(0,0,0,0.6);
    display: flex; align-items: center; justify-content: center;
    backdrop-filter: blur(4px);
    animation: fadeIn 0.15s ease;
  `;

  let btnColors = {
    danger:  "background:#F06070;color:white;",
    success: "background:#3DD68C;color:#0E0F13;",
    warning: "background:#F0A050;color:#0E0F13;",
    default: "background:#5B8DEF;color:white;"
  };
  let btnStyle = btnColors[type] || btnColors.default;

  overlay.innerHTML = `
    <div style="
      background:#16181F;
      border:1px solid #252830;
      border-radius:16px;
      padding:28px;
      max-width:420px;
      width:90%;
      box-shadow:0 24px 64px rgba(0,0,0,0.5);
      animation: slideUp 0.2s ease;
    ">
      <h3 style="font-size:16px;font-weight:700;color:#E8E9EE;margin-bottom:10px;">${title}</h3>
      <p style="font-size:13px;color:#9499AD;line-height:1.6;margin-bottom:24px;">${message}</p>
      <div style="display:flex;gap:10px;justify-content:flex-end;">
        <button id="modal-cancel" style="
          padding:10px 20px;background:transparent;
          border:1px solid #252830;border-radius:8px;
          color:#9499AD;font-size:13px;font-weight:500;
          cursor:pointer;font-family:'DM Sans',sans-serif;
          transition:all 0.15s;
        ">${cancelText}</button>
        <button id="modal-confirm" style="
          padding:10px 20px;${btnStyle}
          border:none;border-radius:8px;
          font-size:13px;font-weight:600;
          cursor:pointer;font-family:'DM Sans',sans-serif;
          transition:all 0.15s;
        ">${confirmText}</button>
      </div>
    </div>
  `;

  document.body.appendChild(overlay);

  overlay.querySelector("#modal-confirm").onclick = () => {
    overlay.remove();
    if (onConfirm) onConfirm();
  };
  overlay.querySelector("#modal-cancel").onclick = () => {
    overlay.remove();
    if (onCancel) onCancel();
  };
  overlay.onclick = (e) => {
    if (e.target === overlay) { overlay.remove(); if (onCancel) onCancel(); }
  };
}

// ── Input Modal (replaces prompt) ──
// Usage: showInputModal({ title, message, fields: [{id, label, placeholder, value}], onConfirm })
function showInputModal({ title, message, fields = [], confirmText = "Save", cancelText = "Cancel", onConfirm }) {
  let overlay = document.createElement("div");
  overlay.style.cssText = `
    position: fixed; inset: 0; z-index: 99998;
    background: rgba(0,0,0,0.6);
    display: flex; align-items: center; justify-content: center;
    backdrop-filter: blur(4px);
  `;

  let fieldsHTML = fields.map(f => `
    <div style="margin-bottom:16px;">
      <label style="display:block;font-size:12px;font-weight:600;color:#9499AD;margin-bottom:6px;text-transform:uppercase;letter-spacing:0.5px;">${f.label}</label>
      ${f.type === "textarea"
        ? `<textarea id="imodal-${f.id}" placeholder="${f.placeholder||""}" style="width:100%;padding:10px 12px;background:#12141A;border:1px solid #252830;border-radius:8px;color:#E8E9EE;font-size:13px;font-family:'DM Sans',sans-serif;resize:vertical;min-height:80px;box-sizing:border-box;">${f.value||""}</textarea>`
        : `<input type="${f.type||'text'}" id="imodal-${f.id}" placeholder="${f.placeholder||""}" value="${f.value||""}" style="width:100%;padding:10px 12px;background:#12141A;border:1px solid #252830;border-radius:8px;color:#E8E9EE;font-size:13px;font-family:'DM Sans',sans-serif;box-sizing:border-box;">`
      }
    </div>
  `).join("");

  overlay.innerHTML = `
    <div style="
      background:#16181F;border:1px solid #252830;border-radius:16px;
      padding:28px;max-width:460px;width:90%;
      box-shadow:0 24px 64px rgba(0,0,0,0.5);
    ">
      <h3 style="font-size:16px;font-weight:700;color:#E8E9EE;margin-bottom:${message?'8px':'20px'};">${title}</h3>
      ${message ? `<p style="font-size:13px;color:#9499AD;line-height:1.6;margin-bottom:20px;">${message}</p>` : ""}
      ${fieldsHTML}
      <div style="display:flex;gap:10px;justify-content:flex-end;margin-top:8px;">
        <button id="imodal-cancel" style="padding:10px 20px;background:transparent;border:1px solid #252830;border-radius:8px;color:#9499AD;font-size:13px;font-weight:500;cursor:pointer;font-family:'DM Sans',sans-serif;">${cancelText}</button>
        <button id="imodal-confirm" style="padding:10px 20px;background:#5B8DEF;color:white;border:none;border-radius:8px;font-size:13px;font-weight:600;cursor:pointer;font-family:'DM Sans',sans-serif;">${confirmText}</button>
      </div>
    </div>
  `;

  document.body.appendChild(overlay);

  // Focus first field
  setTimeout(() => {
    let first = overlay.querySelector("input, textarea");
    if (first) first.focus();
  }, 50);

  overlay.querySelector("#imodal-confirm").onclick = () => {
    let values = {};
    fields.forEach(f => {
      let el = document.getElementById("imodal-" + f.id);
      values[f.id] = el ? el.value.trim() : "";
    });
    overlay.remove();
    if (onConfirm) onConfirm(values);
  };
  overlay.querySelector("#imodal-cancel").onclick = () => overlay.remove();
  overlay.onclick = (e) => { if (e.target === overlay) overlay.remove(); };

  // Enter key submits
  overlay.addEventListener("keydown", e => {
    if (e.key === "Enter" && e.target.tagName !== "TEXTAREA") {
      overlay.querySelector("#imodal-confirm").click();
    }
    if (e.key === "Escape") overlay.remove();
  });
}
