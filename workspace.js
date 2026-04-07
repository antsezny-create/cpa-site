// ══════════════════════════════════════
//  RETURN ASSEMBLY WORKSPACE
//  Complete work product per client per year.
//  Replaces the basic returns tab.
// ══════════════════════════════════════

// ── Form templates by entity type ──
const RETURN_FORMS = {
  "Individual": [
    { id:"f1040",    name:"Form 1040",              required:true,  category:"core" },
    { id:"f1040sa",  name:"Schedule A — Itemized Deductions", required:false, category:"schedule" },
    { id:"f1040sb",  name:"Schedule B — Interest & Dividends", required:false, category:"schedule" },
    { id:"f1040sc",  name:"Schedule C — Business Income",      required:false, category:"schedule" },
    { id:"f1040sd",  name:"Schedule D — Capital Gains",        required:false, category:"schedule" },
    { id:"f1040se",  name:"Schedule E — Supplemental Income",  required:false, category:"schedule" },
    { id:"f1040sse", name:"Schedule SE — Self Employment Tax",  required:false, category:"schedule" },
    { id:"f1040s1",  name:"Schedule 1 — Additional Income",    required:false, category:"schedule" },
    { id:"f1040s2",  name:"Schedule 2 — Additional Taxes",     required:false, category:"schedule" },
    { id:"f1040s3",  name:"Schedule 3 — Additional Credits",   required:false, category:"schedule" },
    { id:"f1040es",  name:"Form 1040-ES — Estimated Tax",      required:false, category:"estimated" },
  ],
  "Joint": [
    { id:"f1040",    name:"Form 1040 (MFJ)",        required:true,  category:"core" },
    { id:"f1040sa",  name:"Schedule A — Itemized Deductions", required:false, category:"schedule" },
    { id:"f1040sb",  name:"Schedule B — Interest & Dividends", required:false, category:"schedule" },
    { id:"f1040sc",  name:"Schedule C — Business Income",      required:false, category:"schedule" },
    { id:"f1040sd",  name:"Schedule D — Capital Gains",        required:false, category:"schedule" },
    { id:"f1040se",  name:"Schedule E — Supplemental Income",  required:false, category:"schedule" },
    { id:"f1040sse", name:"Schedule SE — Self Employment Tax",  required:false, category:"schedule" },
    { id:"f1040s1",  name:"Schedule 1 — Additional Income",    required:false, category:"schedule" },
    { id:"f1040s2",  name:"Schedule 2 — Additional Taxes",     required:false, category:"schedule" },
    { id:"f1040s3",  name:"Schedule 3 — Additional Credits",   required:false, category:"schedule" },
    { id:"f1040es",  name:"Form 1040-ES — Estimated Tax",      required:false, category:"estimated" },
  ],
  "Business": [
    { id:"f1120",    name:"Form 1120 — C Corporation",         required:true,  category:"core" },
    { id:"f1120fm1", name:"Form 1120 M-1 — Book/Tax Diff",     required:false, category:"schedule" },
    { id:"f1040",    name:"Form 1040 — Owner Personal",        required:false, category:"personal" },
  ],
  "S-Corp": [
    { id:"f1120s",   name:"Form 1120-S — S Corporation",       required:true,  category:"core" },
    { id:"f1120ssk", name:"Schedule K-1 (1120-S)",             required:true,  category:"schedule" },
    { id:"f1040",    name:"Form 1040 — Shareholder Personal",  required:false, category:"personal" },
    { id:"f1040se",  name:"Schedule E — S-Corp Income",        required:false, category:"schedule" },
    { id:"f1040s2",  name:"Schedule 2 — Additional Taxes",     required:false, category:"schedule" },
  ],
  "Partnership": [
    { id:"f1065",    name:"Form 1065 — Partnership Return",    required:true,  category:"core" },
    { id:"f1065sk1", name:"Schedule K-1 (1065)",               required:true,  category:"schedule" },
    { id:"f1040",    name:"Form 1040 — Partner Personal",      required:false, category:"personal" },
    { id:"f1040se",  name:"Schedule E — Partnership Income",   required:false, category:"schedule" },
  ],
  "Trust": [
    { id:"f1040",    name:"Form 1040 — Grantor Trust",         required:false, category:"core" },
    { id:"f990",     name:"Form 990 — Tax-Exempt Org",         required:false, category:"core" },
  ],
};

const REVIEW_CHECKLIST = [
  { id:"r1",  text:"All income sources accounted for" },
  { id:"r2",  text:"Deductions supported by documents" },
  { id:"r3",  text:"Prior year carryforwards applied" },
  { id:"r4",  text:"Filing status correct" },
  { id:"r5",  text:"Estimated tax payments verified" },
  { id:"r6",  text:"All schedules complete and attached" },
  { id:"r7",  text:"Numbers tie to supporting documents" },
  { id:"r8",  text:"Client signature obtained" },
  { id:"r9",  text:"E-file authorization complete" },
  { id:"r10", text:"State return prepared if applicable" },
];

// ── State ──
let wsClientId    = "";
let wsClientName  = "";
let wsClientType  = "Individual";
let wsYear        = "";
let wsWorkspaceId = "";
let wsData        = null;  // full workspace document
let wsDocuments   = [];    // client's uploaded documents

// ══════════════════════════════════════
//  TAB LOAD
// ══════════════════════════════════════

function loadWorkspaceLegacyTab() {
  let el = document.getElementById("tab-returns");
  if (!el) return;

  // Replace inner content with workspace UI
  let inner = el.querySelector(".dash-tab-inner") || el;

  let clientOpts = clients.map(c =>
    `<option value="${c.uid}" data-type="${c.type||'Individual'}" data-name="${esc(c.name)}">${esc(c.name)}</option>`
  ).join("");

  let yearOpts = "";
  for (let y = new Date().getFullYear(); y >= 2020; y--) {
    yearOpts += `<option value="${y}" ${y === new Date().getFullYear()-1 ? "selected" : ""}>${y}</option>`;
  }

  document.getElementById("tab-returns").innerHTML = `
    <div class="dash-header">
      <div><h1>Return Workspace</h1><p>Build, track, and sign off on every client return</p></div>
    </div>

    <div class="ws-selector-bar dash-card">
      <div class="acct-selector-group">
        <label>Client</label>
        <select id="ws-client-sel" class="assign-select" style="min-width:220px;" onchange="onWSClientChange()">
          <option value="">— Select Client —</option>
          ${clientOpts}
        </select>
      </div>
      <div class="acct-selector-group">
        <label>Tax Year</label>
        <select id="ws-year-sel" class="assign-select" onchange="onWSYearChange()">
          ${yearOpts}
        </select>
      </div>
      <div class="acct-selector-group" style="align-self:flex-end;">
        <button class="primary-btn" id="ws-open-btn" onclick="openWorkspace()" style="display:none;">Open Workspace →</button>
      </div>
    </div>

    <div id="ws-main" style="margin-top:20px;"></div>`;

  // Pre-select year
  wsYear = document.getElementById("ws-year-sel").value;
}

function onWSClientChange() {
  let sel = document.getElementById("ws-client-sel");
  wsClientId   = sel.value;
  wsClientName = sel.options[sel.selectedIndex]?.dataset.name || "";
  wsClientType = sel.options[sel.selectedIndex]?.dataset.type || "Individual";
  let btn = document.getElementById("ws-open-btn");
  if (btn) btn.style.display = wsClientId ? "inline-flex" : "none";
}

function onWSYearChange() {
  wsYear = document.getElementById("ws-year-sel").value;
}

// ══════════════════════════════════════
//  OPEN / LOAD WORKSPACE
// ══════════════════════════════════════

async function openWorkspace() {
  if (!wsClientId || !wsYear) return;

  let main = document.getElementById("ws-main");
  main.innerHTML = `<div style="padding:32px;text-align:center;color:var(--text-dim);font-size:13px;">Loading workspace...</div>`;

  wsWorkspaceId = wsClientId + "_" + wsYear;

  // Load or create workspace document
  let doc = await db.collection("returnWorkspaces").doc(wsWorkspaceId).get();

  if (!doc.exists) {
    // First time — create from template
    let template = buildWorkspaceTemplate();
    await db.collection("returnWorkspaces").doc(wsWorkspaceId).set(template);
    wsData = template;
  } else {
    wsData = doc.data();
  }

  // Load client documents for linking
  let docsSnap = await db.collection("documents")
    .where("clientId", "==", wsClientId)
    .get();
  wsDocuments = [];
  docsSnap.forEach(d => { let x = d.data(); x._id = d.id; wsDocuments.push(x); });

  renderWorkspace();
}

function buildWorkspaceTemplate() {
  let forms = (RETURN_FORMS[wsClientType] || RETURN_FORMS["Individual"]).map(f => ({
    ...f,
    status:   f.required ? "pending" : "na",
    notes:    "",
    docLinks: [],
    completedAt: null,
  }));

  let review = REVIEW_CHECKLIST.map(r => ({ ...r, checked: false, checkedAt: null }));

  return {
    clientId:    wsClientId,
    clientName:  wsClientName,
    clientType:  wsClientType,
    taxYear:     wsYear,
    status:      "in-progress",  // in-progress | review | filed | locked
    forms,
    review,
    engagementNotes: "",
    createdAt:   firebase.firestore.FieldValue.serverTimestamp(),
    updatedAt:   firebase.firestore.FieldValue.serverTimestamp(),
  };
}

// ══════════════════════════════════════
//  RENDER WORKSPACE
// ══════════════════════════════════════

function renderWorkspace() {
  let main = document.getElementById("ws-main");
  if (!main || !wsData) return;

  let locked   = wsData.status === "locked";
  let forms    = wsData.forms || [];
  let review   = wsData.review || [];

  // Progress calculation
  let applicable = forms.filter(f => f.status !== "na");
  let complete   = applicable.filter(f => f.status === "complete");
  let pct        = applicable.length ? Math.round(complete.length / applicable.length * 100) : 0;

  // Status label
  let statusLabels = { "in-progress":"In Progress", "review":"Under Review", "filed":"Filed", "locked":"Locked — Filed" };
  let statusColors = { "in-progress":"var(--cyan)", "review":"var(--orange)", "filed":"var(--green)", "locked":"var(--green)" };
  let statusLabel  = statusLabels[wsData.status] || "In Progress";
  let statusColor  = statusColors[wsData.status] || "var(--cyan)";

  // Group forms by category
  let categories = { core:"Core Forms", schedule:"Schedules", estimated:"Estimated Tax", personal:"Personal Returns" };
  let grouped = {};
  forms.forEach((f,i) => {
    let cat = f.category || "core";
    if (!grouped[cat]) grouped[cat] = [];
    grouped[cat].push({ ...f, _idx: i });
  });

  let formsHTML = Object.entries(categories).map(([cat, catLabel]) => {
    let catForms = grouped[cat];
    if (!catForms || !catForms.length) return "";
    return `
      <div class="ws-form-category">
        <div class="ws-category-label">${catLabel}</div>
        ${catForms.map(f => renderFormRow(f, locked)).join("")}
      </div>`;
  }).join("");

  // Review checklist
  let reviewHTML = review.map((r, i) => `
    <label class="ws-review-item ${r.checked ? "ws-review-checked" : ""}" onclick="toggleReviewItem(${i})">
      <div class="ws-review-checkbox ${r.checked ? "checked" : ""}">
        ${r.checked ? `<svg width="12" height="12" viewBox="0 0 12 12"><polyline points="2,6 5,9 10,3" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>` : ""}
      </div>
      <span>${r.text}</span>
      ${r.checkedAt ? `<span class="ws-review-time">${new Date(r.checkedAt).toLocaleDateString("en-US",{month:"short",day:"numeric"})}</span>` : ""}
    </label>`).join("");

  let reviewComplete = review.every(r => r.checked);

  main.innerHTML = `
    <!-- Header card -->
    <div class="dash-card ws-header-card">
      <div class="ws-header-left">
        <div class="ws-client-name">${esc(wsClientName)}</div>
        <div class="ws-meta">
          <span class="ws-meta-tag">${esc(wsClientType)}</span>
          <span class="ws-meta-tag">Tax Year ${esc(wsYear)}</span>
          <span class="ws-status-badge" style="background:${statusColor}20;color:${statusColor};border-color:${statusColor}40;">${statusLabel}</span>
        </div>
      </div>
      <div class="ws-header-right">
        <div class="ws-progress-wrap">
          <div class="ws-progress-label">${complete.length} of ${applicable.length} forms complete</div>
          <div class="ws-progress-bar"><div class="ws-progress-fill" style="width:${pct}%"></div></div>
          <div class="ws-progress-pct">${pct}%</div>
        </div>
        <div class="ws-header-actions">
          ${!locked ? `
            <button class="ghost-btn" onclick="openEngagementNotes()">Notes</button>
            <button class="ghost-btn" onclick="addCustomForm()">+ Form</button>
            ${reviewComplete && wsData.status !== "locked" ? `<button class="primary-btn ws-signoff-btn" onclick="signOffWorkspace()">Sign Off & Lock →</button>` : ""}
            ${wsData.status === "in-progress" ? `<button class="ghost-btn" onclick="setWSStatus('review')">Send to Review</button>` : ""}
            ${wsData.status === "review" ? `<button class="ghost-btn" onclick="setWSStatus('filed')">Mark Filed</button>` : ""}
          ` : `
            <span style="font-size:12px;color:var(--green);font-weight:600;">✓ Signed off ${wsData.lockedAt ? new Date(wsData.lockedAt.seconds*1000).toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"}) : ""}</span>
            <button class="ghost-btn" onclick="exportWorkspacePDF()">Export Summary ↓</button>
			<button class="ghost-btn" style="color:var(--orange);border-color:var(--orange);" onclick="unlockWorkspace()">Unlock</button>
          `}
        </div>
      </div>
    </div>

    <!-- Engagement notes (collapsed by default) -->
    <div id="ws-engagement-notes" style="display:none;" class="dash-card" style="margin-bottom:16px;">
      <h4 style="font-size:13px;font-weight:700;margin-bottom:8px;">Engagement Notes</h4>
      <textarea id="ws-notes-input" class="ws-notes-textarea" placeholder="General notes about this engagement, client quirks, carryforwards, planning considerations..."
        onblur="saveEngagementNotes()">${esc(wsData.engagementNotes||"")}</textarea>
    </div>

    <div class="ws-body">

      <!-- Left: Form checklist -->
      <div class="ws-forms-panel">
        <div class="ws-panel-header">
          <span>Form Checklist</span>
          <span style="font-size:11px;color:var(--text-dim);">${applicable.length} forms · ${complete.length} complete</span>
        </div>
        ${formsHTML}
      </div>

      <!-- Right: Review + Documents -->
      <div class="ws-right-panel">

        <!-- Review checklist -->
        <div class="dash-card ws-review-panel">
          <div class="ws-panel-header" style="margin-bottom:12px;">
            <span>Pre-Filing Review</span>
            <span style="font-size:11px;color:${reviewComplete?"var(--green)":"var(--text-dim)"};">${reviewComplete ? "✓ Complete" : review.filter(r=>r.checked).length + "/" + review.length}</span>
          </div>
          <div class="ws-review-list">${reviewHTML}</div>
        </div>

        <!-- Document panel -->
        <div class="dash-card ws-docs-panel">
          <div class="ws-panel-header" style="margin-bottom:12px;">
            <span>Client Documents</span>
            <span style="font-size:11px;color:var(--text-dim);">${wsDocuments.length} uploaded</span>
          </div>
          ${wsDocuments.length ? `
            <div class="ws-doc-list">
              ${wsDocuments.map(d => `
                <div class="ws-doc-item">
                  <span class="ws-doc-icon">📄</span>
                  <span class="ws-doc-name" title="${esc(d.name||d.fileName||"Document")}">${esc((d.name||d.fileName||"Document").slice(0,30))}${(d.name||d.fileName||"").length>30?"…":""}</span>
                  ${d.fileURL ? `<a href="${d.fileURL}" target="_blank" class="ws-doc-view">View</a>` : ""}
                </div>`).join("")}
            </div>` : `
            <div style="font-size:12px;color:var(--text-dim);padding:8px 0;">No documents uploaded yet.</div>`}
        </div>

      </div>
    </div>`;
}

// ══════════════════════════════════════
//  FORM ROW RENDERER
// ══════════════════════════════════════

function renderFormRow(f, locked) {
  let statusIcons = { complete:"✓", pending:"○", na:"—", flagged:"⚠" };
  let statusLabels = { complete:"Complete", pending:"Pending", na:"N/A", flagged:"Flagged" };
  let icon  = statusIcons[f.status]  || "○";
  let label = statusLabels[f.status] || "Pending";

  return `
    <div class="ws-form-row ${f.status}" id="wsfr-${f._idx}">
      <div class="ws-form-status-icon ws-icon-${f.status}">${icon}</div>
      <div class="ws-form-info">
        <div class="ws-form-name">${esc(f.name)}</div>
        ${f.notes ? `<div class="ws-form-note-preview">${esc(f.notes.slice(0,80))}${f.notes.length>80?"…":""}</div>` : ""}
        ${f.docLinks && f.docLinks.length ? `<div class="ws-form-doc-links">${f.docLinks.length} doc${f.docLinks.length>1?"s":""} linked</div>` : ""}
      </div>
      ${!locked ? `
        <div class="ws-form-actions">
          <select class="ws-status-sel" onchange="updateFormStatus(${f._idx}, this.value)">
            <option value="pending"  ${f.status==="pending" ?"selected":""}>Pending</option>
            <option value="complete" ${f.status==="complete"?"selected":""}>Complete</option>
            <option value="flagged"  ${f.status==="flagged" ?"selected":""}>Flagged</option>
            <option value="na"       ${f.status==="na"      ?"selected":""}>N/A</option>
          </select>
          <button class="ws-note-btn" onclick="openFormNote(${f._idx})" title="Add note">✎</button>
          <button class="ws-link-btn" onclick="openDocLinker(${f._idx})" title="Link documents">🔗</button>
        </div>
      ` : `
        <div class="ws-form-status-locked ws-icon-${f.status}">${label}</div>
      `}
    </div>`;
}

// ══════════════════════════════════════
//  FORM STATUS UPDATE
// ══════════════════════════════════════

async function updateFormStatus(idx, status) {
  if (!wsData) return;
  wsData.forms[idx].status = status;
  if (status === "complete") wsData.forms[idx].completedAt = new Date().toISOString();

  await saveWorkspace();
  renderWorkspace();
}

// ══════════════════════════════════════
//  FORM NOTES MODAL
// ══════════════════════════════════════

function openFormNote(idx) {
  let f = wsData.forms[idx];
  let modal = document.getElementById("ws-note-modal");
  if (!modal) {
    modal = document.createElement("div");
    modal.id = "ws-note-modal";
    modal.className = "modal-overlay";
    modal.onclick = e => { if (e.target === modal) closeFormNote(); };
    document.body.appendChild(modal);
  }

  modal.style.display = "flex";
  modal.innerHTML = `
    <div class="modal-card" style="max-width:520px;width:100%;">
      <div class="modal-header">
        <h3 class="modal-title">Notes — ${esc(f.name)}</h3>
        <button class="modal-close" onclick="closeFormNote()">✕</button>
      </div>
      <div style="padding:20px;">
        <textarea id="ws-form-note-input" class="ws-notes-textarea" style="height:140px;"
          placeholder="Document your work, judgment calls, supporting references, audit trail...">${esc(f.notes||"")}</textarea>
        <div style="display:flex;gap:8px;margin-top:12px;justify-content:flex-end;">
          <button class="ghost-btn" onclick="closeFormNote()">Cancel</button>
          <button class="primary-btn" onclick="saveFormNote(${idx})">Save Note</button>
        </div>
      </div>
    </div>`;
}

function closeFormNote() {
  let modal = document.getElementById("ws-note-modal");
  if (modal) modal.style.display = "none";
}

async function saveFormNote(idx) {
  let note = document.getElementById("ws-form-note-input")?.value || "";
  wsData.forms[idx].notes = note;
  await saveWorkspace();
  closeFormNote();
  renderWorkspace();
}

// ══════════════════════════════════════
//  DOCUMENT LINKER MODAL
// ══════════════════════════════════════

function openDocLinker(idx) {
  let f = wsData.forms[idx];
  let modal = document.getElementById("ws-link-modal");
  if (!modal) {
    modal = document.createElement("div");
    modal.id = "ws-link-modal";
    modal.className = "modal-overlay";
    modal.onclick = e => { if (e.target === modal) closeDocLinker(); };
    document.body.appendChild(modal);
  }

  modal.style.display = "flex";

  let linked = new Set(f.docLinks || []);

  let docsHTML = wsDocuments.length ? wsDocuments.map(d => `
    <label class="ws-doc-link-item">
      <input type="checkbox" value="${d._id}" ${linked.has(d._id) ? "checked" : ""}>
      <span class="ws-doc-icon">📄</span>
      <span>${esc(d.name || d.fileName || "Document")}</span>
    </label>`).join("") : `<div style="font-size:13px;color:var(--text-dim);">No documents uploaded by client yet.</div>`;

  modal.innerHTML = `
    <div class="modal-card" style="max-width:480px;width:100%;">
      <div class="modal-header">
        <h3 class="modal-title">Link Documents — ${esc(f.name)}</h3>
        <button class="modal-close" onclick="closeDocLinker()">✕</button>
      </div>
      <div style="padding:20px;">
        <p style="font-size:13px;color:var(--text-muted);margin-bottom:16px;">Select which client documents support this form.</p>
        <div class="ws-doc-link-list">${docsHTML}</div>
        <div style="display:flex;gap:8px;margin-top:16px;justify-content:flex-end;">
          <button class="ghost-btn" onclick="closeDocLinker()">Cancel</button>
          <button class="primary-btn" onclick="saveDocLinks(${idx})">Save Links</button>
        </div>
      </div>
    </div>`;
}

function closeDocLinker() {
  let modal = document.getElementById("ws-link-modal");
  if (modal) modal.style.display = "none";
}

async function saveDocLinks(idx) {
  let checks = document.querySelectorAll("#ws-link-modal input[type=checkbox]:checked");
  wsData.forms[idx].docLinks = Array.from(checks).map(c => c.value);
  await saveWorkspace();
  closeDocLinker();
  renderWorkspace();
}

// ══════════════════════════════════════
//  REVIEW CHECKLIST
// ══════════════════════════════════════

async function toggleReviewItem(idx) {
  if (!wsData) return;
  if (wsData.status === "locked") return;
  let item = wsData.review[idx];
  item.checked   = !item.checked;
  item.checkedAt = item.checked ? new Date().toISOString() : null;
  await saveWorkspace();
  renderWorkspace();
}

// ══════════════════════════════════════
//  ENGAGEMENT NOTES
// ══════════════════════════════════════

function openEngagementNotes() {
  let el = document.getElementById("ws-engagement-notes");
  if (el) el.style.display = el.style.display === "none" ? "block" : "none";
}

async function saveEngagementNotes() {
  let val = document.getElementById("ws-notes-input")?.value || "";
  wsData.engagementNotes = val;
  await saveWorkspace();
}

// ══════════════════════════════════════
//  ADD CUSTOM FORM
// ══════════════════════════════════════

function addCustomForm() {
  showInputModal({ title:"Add Custom Form", fields:[{id:"name",label:"Form Name",placeholder:"e.g. Form 8829 — Home Office"}],
    confirmText:"Add", onConfirm: function(vals) {
      let name = vals.name.trim(); if (!name) return;
      wsData.forms.push({
    id:       "custom_" + Date.now(),
    name:     name.trim(),
    required: false,
    category: "schedule",
    status:   "pending",
    notes:    "",
    docLinks: [],
    completedAt: null,
  });
  saveWorkspace().then(() => renderWorkspace());
    }
  });
}

// ══════════════════════════════════════
//  STATUS UPDATES
// ══════════════════════════════════════

async function setWSStatus(status) {
  if (!wsData) return;
  let confirmMsg = {
    review: "Send this return for review?",
    filed:  "Mark this return as filed?"
  };
  let msg = confirmMsg[status] || "Update status?";
  showModal({ title:"Update Status", message: msg, confirmText:"Confirm", type:"default",
    onConfirm: async function() {
      wsData.status = status;
      await saveWorkspace();
      renderWorkspace();
    }
  });
}

// ══════════════════════════════════════
//  SIGN OFF & LOCK
// ══════════════════════════════════════

async function signOffWorkspace() {
  showModal({ title:"Sign Off & Lock", message:"Lock this return permanently as a permanent record? This cannot be undone.",
    confirmText:"Sign Off & Lock", type:"success", onConfirm: async function() {
  wsData.status   = "locked";
  wsData.lockedAt = firebase.firestore.FieldValue.serverTimestamp();
  wsData.lockedBy = "Anthony Sesny";

  await saveWorkspace();

  // Also update the clientReturns collection for portal visibility
  let existing = await db.collection("clientReturns")
    .where("clientId", "==", wsClientId)
    .where("taxYear",  "==", parseInt(wsYear))
    .get();

  if (!existing.empty) {
    existing.forEach(doc => {
      db.collection("clientReturns").doc(doc.id).update({ returnStatus: "filed" });
    });
  }

  // Log activity
  db.collection("activity").add({
    clientId: wsClientId,
    type:     "ready",
    text:     `${wsYear} return signed off and locked`,
    createdAt: firebase.firestore.FieldValue.serverTimestamp()
  });

  renderWorkspace();
    }
  });
}

// ══════════════════════════════════════
//  SAVE WORKSPACE
// ══════════════════════════════════════

async function saveWorkspace() {
  if (!wsWorkspaceId || !wsData) return;
  wsData.updatedAt = firebase.firestore.FieldValue.serverTimestamp();
  await db.collection("returnWorkspaces").doc(wsWorkspaceId).set(wsData, { merge: true });
}

// ══════════════════════════════════════
//  EXPORT SUMMARY PDF (text-based)
// ══════════════════════════════════════

function exportWorkspacePDF() {
  if (!wsData) return;

  let lines = [
    `RETURN ASSEMBLY SUMMARY`,
    `${"─".repeat(50)}`,
    `Client:    ${wsData.clientName}`,
    `Type:      ${wsData.clientType}`,
    `Tax Year:  ${wsData.taxYear}`,
    `Status:    ${wsData.status.toUpperCase()}`,
    wsData.lockedAt ? `Signed off: ${new Date(wsData.lockedAt.seconds*1000).toLocaleDateString("en-US",{month:"long",day:"numeric",year:"numeric"})}` : "",
    wsData.lockedBy ? `Prepared by: ${wsData.lockedBy}` : "",
    "",
    `FORMS`,
    `${"─".repeat(50)}`,
  ];

  (wsData.forms || []).forEach(f => {
    let status = f.status.toUpperCase().padEnd(10);
    lines.push(`[${status}] ${f.name}`);
    if (f.notes) lines.push(`           Note: ${f.notes}`);
    if (f.docLinks && f.docLinks.length) lines.push(`           Docs: ${f.docLinks.length} document(s) linked`);
  });

  lines.push("", `PRE-FILING REVIEW`, `${"─".repeat(50)}`);
  (wsData.review || []).forEach(r => {
    lines.push(`[${r.checked ? "✓" : " "}] ${r.text}`);
  });

  if (wsData.engagementNotes) {
    lines.push("", `ENGAGEMENT NOTES`, `${"─".repeat(50)}`, wsData.engagementNotes);
  }

  lines.push("", `Generated: ${new Date().toLocaleString("en-US")}`);

  let text    = lines.join("\n");
  let blob    = new Blob([text], { type: "text/plain" });
  let url     = URL.createObjectURL(blob);
  let a       = document.createElement("a");
  a.href      = url;
  a.download  = `${wsData.clientName.replace(/\s+/g,"-")}_${wsData.taxYear}_ReturnSummary.txt`;
  a.click();
  URL.revokeObjectURL(url);
  
}

async function unlockWorkspace() {
  showModal({ title:"Unlock Workspace", message:"Return this workspace to In Progress and make it editable again?",
    confirmText:"Unlock", type:"warning", onConfirm: async function() {
      wsData.status   = "in-progress";
      wsData.lockedAt = null;
      wsData.lockedBy = null;
      await saveWorkspace();
      renderWorkspace();
    }
  });
}
