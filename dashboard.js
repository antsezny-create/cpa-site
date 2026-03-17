// ══════════════════════════════════════
//  STATE
// ══════════════════════════════════════
let clients       = [];
let allDocuments  = [];
let currentDocTab = "pending";
let currentFormId   = null;
let currentFormUrl  = null;
let currentFormName = null;
let currentPdfDoc   = null;   // pdf-lib PDFDocument
let currentCategory = "uploaded";

let activeClientId        = null;
let activeClientName      = "";
let messageRefreshInterval = null;


// ══════════════════════════════════════
//  TAB SWITCHING
// ══════════════════════════════════════
function switchDashTab(tabName) {
  document.querySelectorAll(".dash-tab").forEach(t => t.style.display = "none");
  document.getElementById("tab-" + tabName).style.display = "block";
  document.querySelectorAll(".dash-nav-btn").forEach(b => {
    b.classList.remove("active");
    if (b.getAttribute("onclick") && b.getAttribute("onclick").includes("'" + tabName + "'"))
      b.classList.add("active");
  });
  if (tabName === "clients")     renderClients("all");
  if (tabName === "forms")       { currentCategory = "uploaded"; loadFormsFromFirebase(); }
  if (tabName === "documents")   renderDocuments();
  if (tabName === "messages")    loadFirebaseClients();
  if (tabName === "saved-forms") loadSavedForms();
  if (tabName === "returns")     loadReturnsTab();
}


// ══════════════════════════════════════
//  CLIENTS
// ══════════════════════════════════════
function renderClients(filter) {
  let tbody = document.getElementById("client-table-body");
  tbody.innerHTML = "";
  if (clients.length === 0) {
    tbody.innerHTML = '<div style="padding:24px;text-align:center;color:#6B7280;font-size:13px;">No clients yet.</div>';
    return;
  }
  clients.forEach(c => {
    if (filter !== "all" && c.status !== filter) return;
    let row = document.createElement("div");
    row.className = "client-table-row";

    let clientCell = `<div class="client-cell">
      <div class="client-cell-avatar ${c.color}">${c.initials}</div>
      <div><div class="cell-name">${c.name}</div><div class="cell-sub">${c.email||""}</div></div>
    </div>`;

    let typeOpts = ["Individual","Joint","Business","Trust","Partnership"]
      .map(o => `<option value="${o}"${c.type===o?" selected":""}>${o}</option>`).join("");
    let typeSelect = `<select class="cell-dropdown" data-uid="${c.uid}" data-field="type" onchange="handleDropdownChange(this)">${typeOpts}</select>`;

    let statusOpts = [{value:"pending",label:"Pending"},{value:"in-progress",label:"In Progress"},{value:"review",label:"Review"},{value:"filed",label:"Filed"}]
      .map(o => `<option value="${o.value}"${c.status===o.value?" selected":""}>${o.label}</option>`).join("");
    let statusSelect = `<select class="cell-dropdown status-dropdown status-${c.status}" data-uid="${c.uid}" data-field="status" onchange="handleStatusDropdownChange(this)">${statusOpts}</select>`;

    let docsCell = `<button class="docs-request-btn" onclick="openDocRequestModal('${c.uid}','${c.name}')">Requests</button>`;

    let yearOpts = "";
    for (let y = 2020; y <= 2060; y++) yearOpts += `<option value="${y}"${c.year==y?" selected":""}>${y}</option>`;
    let yearSelect = `<select class="cell-dropdown" data-uid="${c.uid}" data-field="year" onchange="handleDropdownChange(this)">${yearOpts}</select>`;

    let caseOpen  = c.caseOpen !== false;
    let caseBtn   = `<button class="case-toggle ${caseOpen?"case-btn-open":"case-btn-closed"}" data-uid="${c.uid}" onclick="toggleCase(this)">${caseOpen?"Open":"Closed"}</button>`;

    row.innerHTML = clientCell + typeSelect + statusSelect + docsCell + yearSelect + caseBtn;
    tbody.appendChild(row);
  });
}

function handleDropdownChange(el) {
  updateClientField(el.getAttribute("data-uid"), el.getAttribute("data-field"), el.value);
}
function handleStatusDropdownChange(el) {
  el.className = "cell-dropdown status-dropdown status-" + el.value;
  updateClientField(el.getAttribute("data-uid"), "status", el.value);
}
function toggleCase(btn) {
  let uid = btn.getAttribute("data-uid");
  let newState = !btn.classList.contains("case-btn-open");
  db.collection("clients").doc(uid).update({ caseOpen: newState }).then(() => {
    let c = clients.find(x => x.uid === uid);
    if (c) c.caseOpen = newState;
    btn.className = "case-toggle " + (newState ? "case-btn-open" : "case-btn-closed");
    btn.textContent = newState ? "Open" : "Closed";
  }).catch(e => alert("Failed: " + e.message));
}
function updateClientField(uid, field, value) {
  let update = {}; update[field] = value;
  db.collection("clients").doc(uid).update(update).then(() => {
    let c = clients.find(x => x.uid === uid);
    if (c) c[field] = value;
    updateOverviewStats();
    updateRecentClientsList();
  }).catch(e => alert("Failed to update: " + e.message));
}
function updateOverviewStats() {
  let total=clients.length, pending=0, progress=0, review=0, filed=0;
  clients.forEach(c => {
    if (c.status==="pending")     pending++;
    if (c.status==="in-progress") progress++;
    if (c.status==="review")      review++;
    if (c.status==="filed")       filed++;
  });
  document.getElementById("stat-total").textContent    = total;
  document.getElementById("stat-progress").textContent = progress;
  document.getElementById("stat-review").textContent   = review;
  document.getElementById("stat-filed").textContent    = filed;
}
function updateRecentClientsList() {
  let el = document.getElementById("recent-clients-list");
  if (!el) return;
  el.innerHTML = "";
  if (!clients.length) { el.innerHTML = '<div style="padding:16px;text-align:center;color:#6B7280;font-size:13px;">No clients yet.</div>'; return; }
  clients.slice(0,5).forEach(c => {
    let sc="pending", sl="Pending";
    if (c.status==="in-progress"){sc="progress";sl="In Progress";}
    if (c.status==="review")     {sc="review";  sl="Review";}
    if (c.status==="filed")      {sc="filed";   sl="Filed";}
    let item = document.createElement("div");
    item.className = "client-mini";
    item.innerHTML = `<div class="client-avatar ${c.color}">${c.initials}</div>
      <div class="client-mini-info"><strong>${c.name}</strong><span>${c.type} · ${c.docs} docs</span></div>
      <span class="status-pill ${sc}">${sl}</span>`;
    el.appendChild(item);
  });
}
function filterClients(filter, btn) {
  document.querySelectorAll(".filter-bar .filter-btn").forEach(b => b.classList.remove("active"));
  btn.classList.add("active");
  renderClients(filter);
}


// ══════════════════════════════════════
//  FORMS — Firebase-backed library
// ══════════════════════════════════════

// Load all forms from Firestore and render
function loadFormsFromFirebase() {
  let grid = document.getElementById("forms-grid");
  if (!grid) return;
  grid.innerHTML = '<div style="padding:24px;color:#6B7280;font-size:13px;">Loading forms...</div>';

  db.collection("practitionerForms").orderBy("uploadedAt","desc").get().then(snapshot => {
    let forms = [];
    snapshot.forEach(doc => { let d = doc.data(); d._id = doc.id; forms.push(d); });
    renderFormsGrid(forms);
  }).catch(() => {
    // If index not ready yet, fall back to unordered get
    db.collection("practitionerForms").get().then(snapshot => {
      let forms = [];
      snapshot.forEach(doc => { let d = doc.data(); d._id = doc.id; forms.push(d); });
      renderFormsGrid(forms);
    });
  });
}

function renderFormsGrid(forms) {
  let grid = document.getElementById("forms-grid");
  grid.innerHTML = "";

  if (forms.length === 0) {
    grid.innerHTML = '<div style="padding:24px;color:#6B7280;font-size:13px;">No forms uploaded yet. Use the button above to upload your first IRS PDF.</div>';
  }

  forms.forEach(f => {
    let card = document.createElement("div");
    card.className = "form-card";
    card.onclick = () => openFormViewer(f._id, f.storageUrl, f.name, f.desc || "");
    card.innerHTML = `
      <div class="form-card-icon"><span>PDF</span></div>
      <div class="form-card-info" style="flex:1;">
        <strong>${f.name}</strong>
        <span>${f.desc || "Uploaded form"}</span>
        <span class="form-year-tag">${f.taxYear || ""}</span>
      </div>
      <div class="form-card-actions" onclick="event.stopPropagation()">
        <button class="form-action-btn delete" title="Delete form" onclick="deleteUploadedForm('${f._id}','${(f.storagePath||"").replace(/'/g,"\\'")}')">✕</button>
      </div>`;
    grid.appendChild(card);
  });

  // Upload new form card
  let addCard = document.createElement("div");
  addCard.className = "form-card add-form-card";
  addCard.onclick = () => document.getElementById("form-upload-input").click();
  addCard.innerHTML = `<div class="form-card-icon add-icon"><span>+</span></div>
    <div class="form-card-info"><strong>Upload Form</strong><span>Add a PDF from your computer</span></div>`;
  grid.appendChild(addCard);
}

// Upload a PDF from disk → Firebase Storage → Firestore record
function handleFormUpload(input) {
  let file = input.files[0];
  if (!file) return;
  let name  = prompt("Form name (e.g. Form 1040):", file.name.replace(".pdf","").replace(".PDF",""));
  if (!name) { input.value=""; return; }
  let desc  = prompt("Short description (e.g. U.S. Individual Income Tax Return):", "");
  let year  = prompt("Tax year (e.g. 2025):", "2025");

  let path = "practitioner-forms/" + Date.now() + "_" + file.name;
  let ref  = storage.ref(path);

  // Show uploading state
  let grid = document.getElementById("forms-grid");
  let uploading = document.createElement("div");
  uploading.className = "form-upload-progress";
  uploading.innerHTML = `<span>Uploading ${name}...</span><div class="upload-bar"><div class="upload-bar-fill" id="upload-fill"></div></div>`;
  grid.insertBefore(uploading, grid.firstChild);

  let uploadTask = ref.put(file);
  uploadTask.on("state_changed",
    snap => {
      let pct = Math.round((snap.bytesTransferred / snap.totalBytes) * 100);
      let fill = document.getElementById("upload-fill");
      if (fill) fill.style.width = pct + "%";
    },
    err => { alert("Upload failed: " + err.message); uploading.remove(); input.value=""; },
    () => {
      uploadTask.snapshot.ref.getDownloadURL().then(url => {
        return db.collection("practitionerForms").add({
          name:        name,
          desc:        desc || "",
          taxYear:     year || "2025",
          storagePath: path,
          storageUrl:  url,
          uploadedAt:  firebase.firestore.FieldValue.serverTimestamp()
        });
      }).then(() => {
        uploading.remove();
        input.value = "";
        loadFormsFromFirebase();
      }).catch(e => { alert("Error saving form record: " + e.message); uploading.remove(); input.value=""; });
    }
  );
}

function deleteUploadedForm(docId, storagePath) {
  if (!confirm("Delete this form permanently? This cannot be undone.")) return;
  db.collection("practitionerForms").doc(docId).delete().then(() => {
    if (storagePath) {
      storage.ref(storagePath).delete().catch(() => {});
    }
    loadFormsFromFirebase();
  }).catch(e => alert("Failed to delete: " + e.message));
}


// ══════════════════════════════════════
//  FORM VIEWER — pdf-lib fill + save
// ══════════════════════════════════════
async function openFormViewer(formId, formUrl, formName, formDesc) {
  currentFormId   = formId;
  currentFormUrl  = formUrl;
  currentFormName = formName;

  document.querySelectorAll(".dash-tab").forEach(t => t.style.display = "none");
  document.getElementById("tab-form-viewer").style.display = "block";
  document.querySelectorAll(".dash-nav-btn").forEach(b => b.classList.remove("active"));

  document.getElementById("viewer-form-title").textContent = formName;
  document.getElementById("viewer-form-desc").textContent  = formDesc;

  // Populate assign dropdown
  let sel = document.getElementById("assign-client-select");
  sel.innerHTML = '<option value="">— Assign to client —</option>';
  clients.forEach(c => {
    let opt = document.createElement("option");
    opt.value = c.uid; opt.textContent = c.name;
    sel.appendChild(opt);
  });

  // Load PDF into iframe for viewing/filling
  let iframe = document.getElementById("form-pdf-iframe");
  let status  = document.getElementById("viewer-status");
  status.textContent = "Loading PDF...";

  // Fetch the PDF as a blob so it works cross-origin from Firebase Storage
  try {
    let response = await fetch(formUrl);
    if (!response.ok) throw new Error("Fetch failed");
    let blob    = await response.blob();
    let blobUrl = URL.createObjectURL(blob);
    iframe.src  = blobUrl;
    status.textContent = "Fill in the form fields directly in the PDF below, then click Save.";

    // Also load into pdf-lib for saving
    let arrayBuffer = await blob.arrayBuffer();
    currentPdfDoc = await PDFLib.PDFDocument.load(arrayBuffer, { ignoreEncryption: true });
  } catch(e) {
    status.textContent = "Could not load PDF inline. Click 'Open in New Tab' to view.";
    iframe.src = "";
  }
}

async function saveFilledForm() {
  let btn = document.getElementById("save-form-btn");
  btn.textContent = "Saving...";
  btn.disabled    = true;

  try {
    // We save the PDF as-is (with whatever the user filled in the iframe)
    // Since we can't read back the iframe's filled fields directly,
    // we save the original PDF to Storage with a timestamp label.
    // For true field extraction the user fills fields in the iframe then saves.
    let iframe    = document.getElementById("form-pdf-iframe");
    let blobUrl   = iframe.src;
    let response  = await fetch(blobUrl);
    let blob      = await response.blob();
    let arrayBuffer = await blob.arrayBuffer();

    let fileName  = currentFormName.replace(/\s+/g,"-") + "_" + new Date().toISOString().slice(0,10) + ".pdf";
    let path      = "saved-forms/" + fileName;
    let ref       = storage.ref(path);

    let snap      = await ref.put(new Uint8Array(arrayBuffer));
    let url       = await snap.ref.getDownloadURL();

    await db.collection("savedForms").add({
      formId:      currentFormId,
      formName:    currentFormName,
      storagePath: path,
      storageUrl:  url,
      savedAt:     firebase.firestore.FieldValue.serverTimestamp()
    });

    btn.textContent = "Saved ✓";
    btn.disabled    = false;
    setTimeout(() => { btn.textContent = "Save Form"; }, 3000);
    document.getElementById("viewer-status").textContent = "Saved to your dashboard.";
  } catch(e) {
    alert("Save failed: " + e.message);
    btn.textContent = "Save Form";
    btn.disabled    = false;
  }
}

function openFormInNewTab() {
  if (currentFormUrl) window.open(currentFormUrl, "_blank");
}

function assignFormToClient() {
  let sel  = document.getElementById("assign-client-select");
  let uid  = sel.value;
  if (!uid) { alert("Please select a client first."); return; }
  let name = sel.options[sel.selectedIndex].text;
  if (!confirm("Assign " + currentFormName + " to " + name + "?")) return;
  db.collection("assignedForms").add({
    clientId:   uid,
    formId:     currentFormId,
    formName:   currentFormName,
    formUrl:    currentFormUrl,
    assignedAt: firebase.firestore.FieldValue.serverTimestamp()
  }).then(() => alert(currentFormName + " assigned to " + name + "."))
    .catch(e => alert("Error: " + e.message));
}


// ══════════════════════════════════════
//  SAVED FORMS tab
// ══════════════════════════════════════
function loadSavedForms() {
  let list = document.getElementById("saved-forms-list");
  list.innerHTML = '<div style="padding:16px;color:#6B7280;font-size:13px;">Loading...</div>';
  db.collection("savedForms").get().then(snapshot => {
    list.innerHTML = "";
    if (snapshot.empty) {
      list.innerHTML = '<div style="padding:16px;color:#6B7280;font-size:13px;">No saved forms yet. Fill and save a form to see it here.</div>';
      return;
    }
    let saved = [];
    snapshot.forEach(doc => { let d=doc.data(); d._id=doc.id; saved.push(d); });
    saved.sort((a,b) => (b.savedAt && a.savedAt) ? b.savedAt.seconds - a.savedAt.seconds : 0);
    saved.forEach(f => {
      let dateStr = "";
      if (f.savedAt) {
        let d = new Date(f.savedAt.seconds*1000);
        let months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
        dateStr = months[d.getMonth()]+" "+d.getDate()+", "+d.getFullYear();
      }
      let item = document.createElement("div");
      item.className = "saved-form-item";
      item.innerHTML = `
        <div class="doc-thumb doc-thumb-pdf"><span>PDF</span></div>
        <div class="doc-review-info"><strong>${f.formName}</strong><span>Saved ${dateStr}</span></div>
        <div class="doc-actions">
          <a href="${f.storageUrl}" target="_blank" class="action-btn approve" style="text-decoration:none;">Open</a>
          <button class="action-btn-delete" onclick="deleteSavedForm('${f._id}','${(f.storagePath||"").replace(/'/g,"\\'")}')">Delete</button>
        </div>`;
      list.appendChild(item);
    });
  }).catch(e => {
    list.innerHTML = '<div style="padding:16px;color:#EF4444;font-size:13px;">Error: '+e.message+'</div>';
  });
}

function deleteSavedForm(docId, storagePath) {
  if (!confirm("Delete this saved form?")) return;
  db.collection("savedForms").doc(docId).delete().then(() => {
    if (storagePath) storage.ref(storagePath).delete().catch(()=>{});
    loadSavedForms();
  }).catch(e => alert("Failed: " + e.message));
}


// ══════════════════════════════════════
//  DOCUMENTS
// ══════════════════════════════════════
function loadAllDocuments() {
  db.collection("documents").get().then(snapshot => {
    allDocuments = [];
    snapshot.forEach(doc => { let d=doc.data(); d._id=doc.id; d.reviewStatus=d.reviewStatus||"pending"; allDocuments.push(d); });
    renderDocuments();
  });
}
function switchDocTab(tab, btn) {
  currentDocTab = tab;
  document.querySelectorAll(".doc-tab-btn").forEach(b => b.classList.remove("active"));
  btn.classList.add("active");
  renderDocuments();
}
function renderDocuments() {
  let list    = document.getElementById("doc-review-list");
  let title   = document.getElementById("doc-section-title");
  let countEl = document.getElementById("doc-section-count");
  list.innerHTML = "";
  let titles = {pending:"Pending Review", approved:"Approved", flagged:"Flagged"};
  title.textContent = titles[currentDocTab] || "Documents";

  let filtered = allDocuments.filter(d => d.reviewStatus === currentDocTab);
  countEl.textContent = filtered.length + " document" + (filtered.length!==1?"s":"");

  if (!filtered.length) {
    list.innerHTML = `<div style="padding:24px;text-align:center;color:#6B7280;font-size:13px;">No ${currentDocTab} documents.</div>`;
    return;
  }
  let clientMap = {};
  clients.forEach(c => { clientMap[c.uid] = c.name; });

  filtered.forEach(doc => {
    let ext     = (doc.fileName||"FILE").split(".").pop().toUpperCase();
    let isImage = ["JPG","JPEG","PNG","GIF","WEBP"].indexOf(ext) !== -1;
    let isPdf   = ext === "PDF";
    let timeText = "";
    if (doc.uploadedAt) {
      let d = new Date(doc.uploadedAt.seconds*1000);
      let months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
      timeText = months[d.getMonth()]+" "+d.getDate();
    }
    let item = document.createElement("div");
    item.className = "doc-review-item";

    let thumbHTML = isImage && doc.fileURL
      ? `<div class="doc-thumb"><img src="${doc.fileURL}" alt="preview" class="doc-thumb-img"></div>`
      : isPdf
        ? `<div class="doc-thumb doc-thumb-pdf"><span>PDF</span></div>`
        : `<div class="doc-thumb doc-thumb-file"><span>${ext.slice(0,3)}</span></div>`;

    let iconClass = "doc-icon";
    let iconText  = ext.slice(0,3);
    if (currentDocTab==="approved"){iconClass="doc-icon approved-icon";iconText="✓";}
    if (currentDocTab==="flagged") {iconClass="doc-icon flagged-icon"; iconText="!";}

    let deleteBtn = `<button class="action-btn-delete" onclick="deleteDocumentAdmin('${doc._id}','${(doc.fileURL||"").replace(/'/g,"\\'")}')">Delete</button>`;
    let actionsHTML = "";
    if (currentDocTab==="pending") {
      actionsHTML = `<div class="doc-actions">
        <button class="action-btn approve" onclick="reviewDocument('${doc._id}','approved')">Approve</button>
        <button class="action-btn flag"    onclick="reviewDocument('${doc._id}','flagged')">Flag</button>
        ${deleteBtn}</div>`;
    } else if (currentDocTab==="approved") {
      actionsHTML = `<div class="doc-actions"><span class="doc-status-badge approved">Approved</span>
        ${doc.fileURL?`<a href="${doc.fileURL}" target="_blank" class="action-btn approve" style="text-decoration:none;margin-left:6px;">View</a>`:""}
        ${deleteBtn}</div>`;
    } else {
      actionsHTML = `<div class="doc-actions"><span class="doc-status-badge flagged">Flagged</span>
        ${doc.fileURL?`<a href="${doc.fileURL}" target="_blank" class="action-btn flag" style="text-decoration:none;margin-left:6px;">View</a>`:""}
        ${deleteBtn}</div>`;
    }

    item.innerHTML = thumbHTML +
      `<div class="${iconClass}">${iconText}</div>
       <div class="doc-review-info"><strong>${doc.fileName||"Unknown file"}</strong>
       <span>${clientMap[doc.clientId]||"Unknown Client"} · ${timeText} · ${doc.fileSize||""}</span></div>` +
      actionsHTML;
    list.appendChild(item);
  });
}
function reviewDocument(docId, newStatus) {
  db.collection("documents").doc(docId).update({reviewStatus: newStatus}).then(() => {
    let d = allDocuments.find(x => x._id===docId);
    if (d) d.reviewStatus = newStatus;
    renderDocuments();
  }).catch(e => alert("Failed: " + e.message));
}
function deleteDocumentAdmin(docId, fileURL) {
  if (!confirm("Delete this document permanently?")) return;
  db.collection("documents").doc(docId).delete().then(() => {
    allDocuments = allDocuments.filter(x => x._id !== docId);
    renderDocuments();
    if (fileURL) { try { storage.refFromURL(fileURL).delete().catch(()=>{}); } catch(e){} }
  }).catch(e => alert("Failed: " + e.message));
}


// ══════════════════════════════════════
//  MESSAGES
// ══════════════════════════════════════
function loadFirebaseClients() {
  let list = document.getElementById("msg-client-list");
  if (!list) return;
  db.collection("clients").get().then(snapshot => {
    list.innerHTML = "";
    if (snapshot.empty) { list.innerHTML='<div style="padding:20px;text-align:center;color:#6B7280;font-size:13px;">No clients yet.</div>'; return; }
    let colors = ["blue","purple","green","orange","cyan"];
    snapshot.forEach(doc => {
      let c = doc.data();
      let name = c.firstName+" "+c.lastName;
      let color = colors[name.length % colors.length];
      let item = document.createElement("div");
      item.className = "msg-client-item";
      item.setAttribute("data-clientid", doc.id);
      item.onclick = function() {
        document.querySelectorAll(".msg-client-item").forEach(x => x.classList.remove("active"));
        item.classList.add("active");
        let dot = item.querySelector(".msg-unread-dot");
        if (dot) dot.remove();
        openConvo(doc.id, name, c.firstName[0]+c.lastName[0], color, c.type||"Individual");
      };
      item.innerHTML = `<div class="msg-client-avatar ${color}">${c.firstName[0]}${c.lastName[0]}</div>
        <div class="msg-client-info"><div class="msg-client-top"><strong>${name}</strong></div>
        <p class="msg-preview">${c.type||"Individual"} · ${c.email||""}</p></div>`;
      list.appendChild(item);
    });
    checkUnreadMessages();
  }).catch(e => { list.innerHTML=`<div style="padding:20px;text-align:center;color:#EF4444;font-size:13px;">Error: ${e.message}</div>`; });
}
function checkUnreadMessages() {
  db.collection("messages").get().then(snapshot => {
    let unread = {};
    snapshot.forEach(doc => { let m=doc.data(); if(m.senderRole==="client"&&!m.readByAdmin) unread[m.clientId]=(unread[m.clientId]||0)+1; });
    let total = 0;
    document.querySelectorAll(".msg-client-item").forEach(item => {
      let cid = item.getAttribute("data-clientid");
      let ex  = item.querySelector(".msg-unread-dot");
      if (ex) ex.remove();
      if (unread[cid]) { total+=unread[cid]; let dot=document.createElement("span"); dot.className="msg-unread-dot"; item.appendChild(dot); }
    });
    let badge = document.getElementById("msg-badge");
    badge.textContent = total; badge.style.display = total>0?"inline":"none";
  });
}
function openConvo(clientId, name, initials, color, type) {
  activeClientId=clientId; activeClientName=name;
  document.getElementById("msg-conv-header").innerHTML =
    `<div class="msg-conv-avatar ${color}">${initials}</div><div><strong>${name}</strong><span>${type} · 2025 Return</span></div>`;
  let input = document.getElementById("admin-msg-input");
  input.placeholder = "Type a message to " + name.split(" ")[0] + "...";
  input.disabled = false;
  if (messageRefreshInterval) clearInterval(messageRefreshInterval);
  loadMessagesForClient(clientId);
  messageRefreshInterval = setInterval(() => loadMessagesForClient(clientId), 3000);
  db.collection("messages").get().then(snapshot => {
    snapshot.forEach(doc => {
      let m=doc.data();
      if(m.clientId===clientId&&m.senderRole==="client"&&!m.readByAdmin)
        db.collection("messages").doc(doc.id).update({readByAdmin:true});
    });
    checkUnreadMessages();
  });
}
function loadMessagesForClient(clientId) {
  db.collection("messages").get().then(snapshot => {
    let thread = document.getElementById("admin-msg-thread");
    let msgs = [];
    snapshot.forEach(doc => { let m=doc.data(); if(m.clientId===clientId) msgs.push(m); });
    msgs.sort((a,b) => (a.timestamp&&b.timestamp) ? a.timestamp.seconds-b.timestamp.seconds : 0);
    thread.innerHTML = "";
    if (!msgs.length) { thread.innerHTML='<div style="text-align:center;color:#6B7280;padding:40px;font-size:13px;">No messages yet.</div>'; return; }
    msgs.forEach(msg => {
      let timeText="";
      if(msg.timestamp){
        let d=new Date(msg.timestamp.seconds*1000);
        let h=d.getHours(),mn=d.getMinutes(),ap=h>=12?"PM":"AM";
        h=h%12||12; if(mn<10)mn="0"+mn;
        let mo=["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
        timeText=mo[d.getMonth()]+" "+d.getDate()+", "+h+":"+mn+" "+ap;
      }
      let bubble=document.createElement("div");
      bubble.className="msg-bubble "+(msg.senderRole==="admin"?"sent":"received");
      bubble.innerHTML=`<div class="msg-bubble-meta"><strong>${msg.senderName||"Unknown"}</strong> <span>${timeText}</span></div>
        <div class="msg-bubble-text">${msg.text||""}</div>`;
      thread.appendChild(bubble);
    });
    thread.scrollTop=thread.scrollHeight;
  }).catch(e => { document.getElementById("admin-msg-thread").innerHTML=`<div style="text-align:center;color:#EF4444;padding:40px;font-size:13px;">Error: ${e.message}</div>`; });
}
function sendAdminMessage() {
  let input=document.getElementById("admin-msg-input");
  let text=input.value.trim();
  if(!text||!activeClientId) return;
  input.value="";
  db.collection("messages").add({
    clientId:activeClientId, senderId:auth.currentUser?auth.currentUser.uid:"admin",
    senderName:"Anthony Sesny", senderRole:"admin", text:text,
    readByAdmin:true, timestamp:firebase.firestore.FieldValue.serverTimestamp()
  }).then(()=>loadMessagesForClient(activeClientId));
}
function filterMessageClients(query) {
  document.querySelectorAll(".msg-client-item").forEach(item => {
    item.style.display = item.querySelector("strong").textContent.toLowerCase().includes(query.toLowerCase()) ? "flex":"none";
  });
}


// ══════════════════════════════════════
//  INIT
// ══════════════════════════════════════
document.addEventListener("DOMContentLoaded", () => {
  // Wire up form upload input
  let inp = document.getElementById("form-upload-input");
  if (inp) inp.addEventListener("change", function(){ handleFormUpload(this); });
});

auth.onAuthStateChanged(user => {
  if (user) {
    loadAllClientsFromFirebase();
    loadAllDocuments();
    setInterval(checkUnreadMessages, 10000);
  }
});

function loadAllClientsFromFirebase() {
  db.collection("clients").get().then(snapshot => {
    clients = [];
    let colors=["blue","purple","green","orange","cyan","red"];
    snapshot.forEach(doc => {
      let d=doc.data();
      clients.push({
        uid: doc.id, name:(d.firstName||"Unknown")+" "+(d.lastName||""),
        email:d.email||"", phone:d.phone||"", status:d.status||"pending",
        docs:d.documents||0, type:d.type||"Individual", year:d.year||"2025",
        caseOpen:d.caseOpen!==false,
        color:colors[clients.length%colors.length],
        initials:(d.firstName||"?")[0]+(d.lastName||"?")[0]
      });
    });
    updateOverviewStats();
    updateRecentClientsList();
  }).catch(e => {
    let el=document.getElementById("recent-clients-list");
    if(el) el.innerHTML=`<div style="padding:16px;text-align:center;color:#EF4444;font-size:13px;">Error: ${e.message}</div>`;
  });
}


// ══════════════════════════════════════
//  DOCUMENT REQUESTS
// ══════════════════════════════════════
let docRequestClientId   = null;
let docRequestClientName = null;

function openDocRequestModal(clientId, clientName) {
  docRequestClientId   = clientId;
  docRequestClientName = clientName;
  document.getElementById("doc-request-client-name").textContent = clientName;
  loadExistingRequests(clientId);
  document.getElementById("doc-request-modal").style.display = "flex";
}

function closeDocRequestModal() {
  document.getElementById("doc-request-modal").style.display = "none";
  docRequestClientId   = null;
  docRequestClientName = null;
}

function loadExistingRequests(clientId) {
  let list = document.getElementById("doc-request-list");
  list.innerHTML = '<div style="color:var(--text-dim);font-size:13px;padding:8px 0;">Loading...</div>';
  db.collection("documentRequests").where("clientId","==",clientId).get().then(snapshot => {
    list.innerHTML = "";
    if (snapshot.empty) {
      list.innerHTML = '<div style="color:var(--text-dim);font-size:13px;padding:8px 0;">No requests yet.</div>';
      return;
    }
    snapshot.forEach(doc => {
      let r = doc.data();
      let item = document.createElement("div");
      item.className = "doc-request-item";
      item.innerHTML =
        '<span class="doc-request-name">' + r.documentName + '</span>' +
        '<span class="doc-request-status ' + (r.fulfilled ? "fulfilled" : "pending") + '">' + (r.fulfilled ? "Received" : "Pending") + '</span>' +
        '<button class="form-action-btn delete" onclick="deleteDocRequest(\'' + doc.id + '\')">✕</button>';
      list.appendChild(item);
    });
  });
}

function sendDocRequest() {
  let input = document.getElementById("doc-request-input");
  let name  = input.value.trim();
  if (!name || !docRequestClientId) return;

  db.collection("documentRequests").add({
    clientId:     docRequestClientId,
    documentName: name,
    fulfilled:    false,
    requestedAt:  firebase.firestore.FieldValue.serverTimestamp()
  }).then(() => {
    // Log activity for the client
    db.collection("activity").add({
      clientId:  docRequestClientId,
      type:      "request",
      text:      "Anthony requested: " + name,
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    });
    input.value = "";
    loadExistingRequests(docRequestClientId);
  }).catch(e => alert("Failed: " + e.message));
}

function deleteDocRequest(docId) {
  if (!confirm("Remove this request?")) return;
  db.collection("documentRequests").doc(docId).delete().then(() => {
    loadExistingRequests(docRequestClientId);
  });
}

// Also log status changes as activity
const _origUpdateClientField = updateClientField;
function updateClientField(uid, field, value) {
  let update = {}; update[field] = value;
  db.collection("clients").doc(uid).update(update).then(() => {
    let c = clients.find(x => x.uid === uid);
    if (c) c[field] = value;
    updateOverviewStats();
    updateRecentClientsList();

    // Log status change as activity
    if (field === "status") {
      let textMap = {
        "pending":     "Anthony is waiting for your documents",
        "in-progress": "Anthony has started working on your return",
        "review":      "Your return is under review",
        "filed":       "Your return has been filed!"
      };
      db.collection("activity").add({
        clientId:  uid,
        type:      value,
        text:      textMap[value] || "Status updated",
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
      });
    }
  }).catch(e => alert("Failed to update: " + e.message));
}


// ══════════════════════════════════════
//  RETURNS TAB
// ══════════════════════════════════════

let returnsSelectedClientId = null;
let allPractitionerForms    = []; // cached from Firestore

function loadReturnsTab() {
  // Populate client dropdown
  let sel = document.getElementById("returns-client-select");
  sel.innerHTML = '<option value="">— Select a client —</option>';
  clients.forEach(c => {
    let opt = document.createElement("option");
    opt.value = c.uid;
    opt.textContent = c.name;
    sel.appendChild(opt);
  });

  // Cache forms library for the add-form dropdown
  db.collection("practitionerForms").get().then(snapshot => {
    allPractitionerForms = [];
    snapshot.forEach(doc => { let d = doc.data(); d._id = doc.id; allPractitionerForms.push(d); });
  });

  document.getElementById("returns-client-panel").style.display = "none";
}

function onReturnsClientChange(sel) {
  let uid = sel.value;
  if (!uid) {
    returnsSelectedClientId = null;
    document.getElementById("returns-client-panel").style.display = "none";
    return;
  }
  returnsSelectedClientId = uid;
  document.getElementById("returns-client-panel").style.display = "block";
  loadClientReturns(uid);
}

function loadClientReturns(clientId) {
  let list = document.getElementById("returns-list-admin");
  list.innerHTML = '<div style="padding:16px;color:var(--text-dim);font-size:13px;">Loading...</div>';

  db.collection("clientReturns")
    .where("clientId", "==", clientId)
    .get().then(snapshot => {
      list.innerHTML = "";
      if (snapshot.empty) {
        list.innerHTML = '<div style="padding:16px;color:var(--text-dim);font-size:13px;">No returns yet. Click + to add a form.</div>';
        return;
      }
      let returns = [];
      snapshot.forEach(doc => { let d = doc.data(); d._id = doc.id; returns.push(d); });
      returns.sort((a,b) => (b.taxYear||0) - (a.taxYear||0));
      returns.forEach(r => renderReturnRow(r, list));
    });
}

function renderReturnRow(r, container) {
  let statusColors = { "need-docs": "orange", "in-progress": "cyan", "filed": "green" };
  let statusLabels = { "need-docs": "Need Docs", "in-progress": "In Progress", "filed": "Filed" };
  let color = statusColors[r.returnStatus] || "orange";
  let label = statusLabels[r.returnStatus] || "Need Docs";

  let row = document.createElement("div");
  row.className = "return-admin-row";
  row.setAttribute("data-id", r._id);
  row.innerHTML = `
    <div class="return-admin-year">${r.taxYear || "—"}</div>
    <div class="return-admin-form">${r.formName || "Unknown Form"}</div>
    <select class="cell-dropdown return-status-select status-return-${r.returnStatus||"need-docs"}"
      data-rid="${r._id}" onchange="updateReturnStatus(this)">
      <option value="need-docs"   ${r.returnStatus==="need-docs"   ?" selected":""}>Need Docs</option>
      <option value="in-progress" ${r.returnStatus==="in-progress" ?" selected":""}>In Progress</option>
      <option value="filed"       ${r.returnStatus==="filed"       ?" selected":""}>Filed</option>
    </select>
    <div class="return-admin-actions">
      ${r.formStorageUrl
        ? `<button class="action-btn approve" onclick="openReturnFormViewer('${r._id}','${r.formStorageUrl}','${(r.formName||"").replace(/'/g,"\\'")}','')">Edit Form</button>`
        : '<span style="font-size:11px;color:var(--text-dim);">No PDF linked</span>'}
      <button class="action-btn-delete" onclick="deleteClientReturn('${r._id}')">Delete</button>
    </div>`;
  container.appendChild(row);
}

function updateReturnStatus(sel) {
  let rid    = sel.getAttribute("data-rid");
  let status = sel.value;
  sel.className = "cell-dropdown return-status-select status-return-" + status;
  db.collection("clientReturns").doc(rid).update({ returnStatus: status })
    .catch(e => alert("Failed: " + e.message));
}

function deleteClientReturn(rid) {
  if (!confirm("Remove this return entry?")) return;
  db.collection("clientReturns").doc(rid).delete().then(() => {
    if (returnsSelectedClientId) loadClientReturns(returnsSelectedClientId);
  });
}

function openAddReturnModal() {
  if (!returnsSelectedClientId) { alert("Please select a client first."); return; }

  // Populate form dropdown from cached practitioner forms
  let sel = document.getElementById("add-return-form-select");
  sel.innerHTML = '<option value="">— Select a form —</option>';
  allPractitionerForms.forEach(f => {
    let opt = document.createElement("option");
    opt.value = JSON.stringify({ id: f._id, name: f.name, url: f.storageUrl });
    opt.textContent = f.name + (f.taxYear ? " (" + f.taxYear + ")" : "");
    sel.appendChild(opt);
  });

  // Set tax year default
  document.getElementById("add-return-year").value = new Date().getFullYear();
  document.getElementById("add-return-modal").style.display = "flex";
}

function closeAddReturnModal() {
  document.getElementById("add-return-modal").style.display = "none";
}

function saveNewReturn() {
  let formVal = document.getElementById("add-return-form-select").value;
  let year    = document.getElementById("add-return-year").value;
  if (!formVal) { alert("Please select a form."); return; }
  if (!year)    { alert("Please enter a tax year."); return; }

  let formData = JSON.parse(formVal);
  let client   = clients.find(c => c.uid === returnsSelectedClientId);

  db.collection("clientReturns").add({
    clientId:       returnsSelectedClientId,
    clientName:     client ? client.name : "",
    formId:         formData.id,
    formName:       formData.name,
    formStorageUrl: formData.url || "",
    taxYear:        parseInt(year),
    returnStatus:   "need-docs",
    createdAt:      firebase.firestore.FieldValue.serverTimestamp()
  }).then(() => {
    closeAddReturnModal();
    loadClientReturns(returnsSelectedClientId);
  }).catch(e => alert("Failed to save: " + e.message));
}

// Open form viewer from the Returns tab (back button goes to returns)
function openReturnFormViewer(rid, formUrl, formName, formDesc) {
  currentFormId   = rid;
  currentFormUrl  = formUrl;
  currentFormName = formName;

  document.querySelectorAll(".dash-tab").forEach(t => t.style.display = "none");
  document.getElementById("tab-form-viewer").style.display = "block";
  document.querySelectorAll(".dash-nav-btn").forEach(b => b.classList.remove("active"));

  document.getElementById("viewer-form-title").textContent = formName;
  document.getElementById("viewer-form-desc").textContent  = formDesc || "";
  document.getElementById("viewer-back-btn").setAttribute("onclick", "switchDashTab('returns')");

  // Populate assign dropdown
  let sel = document.getElementById("assign-client-select");
  sel.innerHTML = '<option value="">— Assign to client —</option>';
  clients.forEach(c => {
    let opt = document.createElement("option");
    opt.value = c.uid; opt.textContent = c.name;
    sel.appendChild(opt);
  });

  let iframe = document.getElementById("form-pdf-iframe");
  let status = document.getElementById("viewer-status");
  status.textContent = "Loading PDF...";

  fetch(formUrl).then(r => {
    if (!r.ok) throw new Error("Fetch failed");
    return r.blob();
  }).then(blob => {
    iframe.src = URL.createObjectURL(blob);
    status.textContent = "Fill in the form fields directly, then click Save.";
  }).catch(() => {
    status.textContent = "Could not load PDF inline. Use 'Open in New Tab' to view.";
    iframe.src = "";
  });
}
