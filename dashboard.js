// ══════════════════════════════════════
//  STATE
// ══════════════════════════════════════
let clients       = [];
let allDocuments  = [];
let currentDocTab = "pending";
let activeYear    = (new Date().getFullYear() - 1).toString();
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
function toggleSidebar() {
  let sidebar = document.getElementById("dash-sidebar");
  let main    = document.querySelector(".dash-main");
  let collapsed = sidebar.classList.toggle("sidebar-collapsed");
  if (main) main.classList.toggle("sidebar-collapsed-main", collapsed);
  localStorage.setItem("sidebarCollapsed", collapsed);
}

// Restore sidebar state on load
(function() {
  if (localStorage.getItem("sidebarCollapsed") === "true") {
    document.addEventListener("DOMContentLoaded", function() {
      let sidebar = document.getElementById("dash-sidebar");
      let main    = document.querySelector(".dash-main");
      if (sidebar) sidebar.classList.add("sidebar-collapsed");
      if (main)    main.classList.add("sidebar-collapsed-main");
    });
  }
})();

function switchDashTab(tabName) {
  document.querySelectorAll(".dash-tab").forEach(t => t.style.display = "none");
  document.getElementById("tab-" + tabName).style.display = "block";
  document.querySelectorAll(".dash-nav-btn").forEach(b => {
    b.classList.remove("active");
    if (b.getAttribute("onclick") && b.getAttribute("onclick").includes("'" + tabName + "'"))
      b.classList.add("active");
  });
  if (tabName === "clients")         { renderClients("all"); checkPendingApprovals(); }
  if (tabName === "forms")           { currentCategory = "uploaded"; loadFormsFromFirebase(); }
  if (tabName === "documents")       renderDocuments();
  if (tabName === "messages")        loadFirebaseClients();
  if (tabName === "saved-forms")     loadSavedForms();
  if (tabName === "returns")         loadReturnsTab();
  if (tabName === "gl")              loadGLTab();
  if (tabName === "is")              loadStatementTab("is");
  if (tabName === "bs")              loadStatementTab("bs");
  if (tabName === "scf")             loadStatementTab("scf");
  if (tabName === "sshe")            loadStatementTab("sshe");
  if (tabName === "master-accounts") loadMasterAccountsTab();
}


// ══════════════════════════════════════
//  CLIENTS
// ══════════════════════════════════════
function renderClients(filter) {
  let tbody = document.getElementById("client-table-body");
  tbody.innerHTML = "";

  // Filter by active year AND status
  let filtered = clients.filter(c => {
    let yearMatch   = c.year === activeYear;
    let statusMatch = filter === "all" || c.status === filter;
    return yearMatch && statusMatch;
  });

  if (filtered.length === 0) {
    tbody.innerHTML = `<div style="padding:24px;text-align:center;color:#6B7280;font-size:13px;">No ${filter === "all" ? "" : filter + " "}clients for tax year ${activeYear}.</div>`;
    return;
  }

  filtered.forEach(c => {
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

    let docsCell  = `<button class="docs-request-btn" onclick="openDocRequestModal('${c.uid}','${c.name}')">Requests</button>`;
    let notesCell = `<button class="docs-request-btn notes-btn${c.notes ? " has-note" : ""}" onclick="openNotesModal('${c.uid}','${c.name.replace(/'/g,"\\'")}')">Notes${c.notes ? " ●" : ""}</button>`;
    let bkCell    = `<button class="docs-request-btn bk-btn${c.bookkeeping ? " bk-active" : ""}" onclick="toggleBookkeeping('${c.uid}',${c.bookkeeping||false})" title="Toggle Bookkeeping">${c.bookkeeping ? "📒 BK On" : "BK Off"}</button>`;

    let yearOpts = "";
    for (let y = 2020; y <= 2060; y++) yearOpts += `<option value="${y}"${c.year==y?" selected":""}>${y}</option>`;
    let yearSelect = `<select class="cell-dropdown" data-uid="${c.uid}" data-field="year" onchange="handleDropdownChange(this)">${yearOpts}</select>`;

    let caseOpen  = c.caseOpen !== false;
    let caseBtn   = `<button class="case-toggle ${caseOpen?"case-btn-open":"case-btn-closed"}" data-uid="${c.uid}" onclick="toggleCase(this)">${caseOpen?"Open":"Closed"}</button>`;

    row.innerHTML = clientCell + typeSelect + statusSelect + docsCell + yearSelect + notesCell + bkCell + caseBtn;
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
function toggleBookkeeping(uid, current) {
  let newVal = !current;
  db.collection("clients").doc(uid).update({ bookkeeping: newVal }).then(() => {
    let c = clients.find(x => x.uid === uid);
    if (c) c.bookkeeping = newVal;
    let activeFilter = document.querySelector(".filter-bar .filter-btn.active");
    renderClients(activeFilter ? activeFilter.textContent.toLowerCase().replace(" ","-") : "all");
  }).catch(e => alert("Failed: " + e.message));
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
  let yearClients = clients.filter(c => c.year === activeYear);
  let total=yearClients.length, pending=0, progress=0, review=0, filed=0;
  yearClients.forEach(c => {
    if (c.status==="pending")     pending++;
    if (c.status==="in-progress") progress++;
    if (c.status==="review")      review++;
    if (c.status==="filed")       filed++;
  });

  // Stat cards
  document.getElementById("stat-total").textContent    = total;
  document.getElementById("stat-pending").textContent  = pending;
  document.getElementById("stat-progress").textContent = progress;
  document.getElementById("stat-filed").textContent    = filed;

  // Filing progress bar
  let pct = total > 0 ? Math.round((filed / total) * 100) : 0;
  let fillEl = document.getElementById("filing-progress-fill");
  let pctEl  = document.getElementById("filing-progress-pct");
  let countEl= document.getElementById("filing-progress-count");
  if (fillEl)  fillEl.style.width = pct + "%";
  if (pctEl)   pctEl.textContent  = pct + "%";
  if (countEl) countEl.textContent = filed + " / " + total + " filed";

  // Greeting based on time of day
  let hour = new Date().getHours();
  let greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
  let greetEl = document.getElementById("overview-greeting-text");
  if (greetEl) greetEl.textContent = greeting + ", Anthony";

  // Activity feed
  loadOverviewActivity();
}

function loadOverviewActivity() {
  let el = document.getElementById("overview-activity-list");
  if (!el) return;

  db.collection("activity")
    .orderBy("createdAt", "desc")
    .limit(8)
    .get().then(snap => {
      if (snap.empty) {
        el.innerHTML = `<div class="overview-empty">No recent activity yet.</div>`;
        return;
      }
      el.innerHTML = "";
      snap.forEach(doc => {
        let d = doc.data();
        let timeStr = d.createdAt
          ? new Date(d.createdAt.seconds * 1000).toLocaleDateString("en-US", {month:"short", day:"numeric", hour:"2-digit", minute:"2-digit"})
          : "";
        let iconMap = { upload:"📄", message:"💬", request:"📋", account:"✅", ready:"📊", filed:"🎉" };
        let icon = iconMap[d.type] || "◆";
        let item = document.createElement("div");
        item.className = "overview-activity-item";
        item.innerHTML = `
          <span class="overview-activity-icon">${icon}</span>
          <div class="overview-activity-content">
            <span class="overview-activity-text">${d.text || "Activity recorded"}</span>
            <span class="overview-activity-time">${timeStr}</span>
          </div>`;
        el.appendChild(item);
      });
    }).catch(() => {
      el.innerHTML = `<div class="overview-empty">Unable to load activity.</div>`;
    });
}

function updateRecentClientsList() {
  // No longer used — replaced by activity feed
}
function filterClients(filter, btn) {
  document.querySelectorAll(".filter-bar .filter-btn").forEach(b => b.classList.remove("active"));
  btn.classList.add("active");
  renderClients(filter);
}

function onYearChange(year) {
  activeYear = year;
  // Keep both dropdowns in sync
  let clientsSel = document.getElementById("clients-year-select");
  if (clientsSel) clientsSel.value = year;
  updateOverviewStats();
  updateRecentClientsList();
}

function onClientsYearChange(year) {
  activeYear = year;
  // Keep both dropdowns in sync
  let overviewSel = document.getElementById("overview-year-select");
  if (overviewSel) overviewSel.value = year;
  let label = document.getElementById("clients-year-label");
  if (label) label.textContent = "Tax Year " + year;
  renderClients("all");
  // Reset status filter buttons to All
  document.querySelectorAll(".filter-bar .filter-btn").forEach((b,i) => {
    b.classList.toggle("active", i === 0);
  });
}


// ══════════════════════════════════════
//  FORMS — Category-based two-level view
// ══════════════════════════════════════

const FORM_CATEGORIES = [
  {
    id: "individual",
    label: "Individual Returns",
    icon: "1040",
    desc: "Personal income tax returns and amendments",
    color: "blue"
  },
  {
    id: "business",
    label: "Business Returns",
    icon: "1120",
    desc: "Corporate, S-Corp, and partnership returns",
    color: "purple"
  },
  {
    id: "schedules-1040",
    label: "1040 Schedules",
    icon: "SCH",
    desc: "Schedules A, B, C, D, E, F, SE, 1, 2, 3",
    color: "cyan"
  },
  {
    id: "schedules-1120",
    label: "1120 Schedules",
    icon: "SCH",
    desc: "Schedules K, L, M-1, M-2, M-3 for corporations",
    color: "blue"
  },
  {
    id: "schedules-1065",
    label: "1065 Schedules",
    icon: "SCH",
    desc: "Schedules K, K-1, L, M-1, M-2 for partnerships",
    color: "purple"
  },
  {
    id: "payroll",
    label: "Payroll & Employment",
    icon: "941",
    desc: "Payroll taxes, W-forms, and employment",
    color: "orange"
  },
  {
    id: "1099s",
    label: "1099 Series",
    icon: "1099",
    desc: "Information returns and income reporting",
    color: "green"
  },
  {
    id: "other",
    label: "Other Forms",
    icon: "etc",
    desc: "Extensions, authorizations, and more",
    color: "red"
  }
];

let currentFormsCategory = null;

function loadFormsFromFirebase() {
  currentFormsCategory = null;
  renderCategoryGrid();
}

// Level 1 — show category tiles
function renderCategoryGrid() {
  let container = document.getElementById("forms-container");
  if (!container) return;

  // Update breadcrumb
  document.getElementById("forms-breadcrumb").innerHTML =
    '<span class="breadcrumb-current">All Categories</span>';
  document.getElementById("forms-back-btn").style.display = "none";
  document.getElementById("forms-upload-btn").style.display = "none";

  container.innerHTML = "";
  let grid = document.createElement("div");
  grid.className = "category-grid";

  // Fetch all forms to get counts per category
  db.collection("practitionerForms").get().then(snapshot => {
    let countByCategory = {};
    snapshot.forEach(doc => {
      let cat = doc.data().category || "other";
      countByCategory[cat] = (countByCategory[cat] || 0) + 1;
    });

    FORM_CATEGORIES.forEach(cat => {
      let count = countByCategory[cat.id] || 0;
      let tile = document.createElement("div");
      tile.className = "category-tile category-tile-" + cat.color;
      tile.onclick = () => openCategory(cat);
      tile.innerHTML = `
        <div class="category-tile-icon">${cat.icon}</div>
        <div class="category-tile-info">
          <strong>${cat.label}</strong>
          <span>${cat.desc}</span>
          <span class="category-count">${count} form${count !== 1 ? "s" : ""}</span>
        </div>
        <div class="category-tile-arrow">→</div>`;
      grid.appendChild(tile);
    });

    container.appendChild(grid);
  });
}

// Level 2 — show forms inside a category
function openCategory(cat) {
  currentFormsCategory = cat;
  let container = document.getElementById("forms-container");

  // Update breadcrumb
  document.getElementById("forms-breadcrumb").innerHTML =
    `<span class="breadcrumb-link" onclick="loadFormsFromFirebase()">All Categories</span>
     <span class="breadcrumb-sep">›</span>
     <span class="breadcrumb-current">${cat.label}</span>`;
  document.getElementById("forms-back-btn").style.display = "inline-flex";
  document.getElementById("forms-upload-btn").style.display = "inline-flex";

  container.innerHTML = '<div style="padding:24px;color:#6B7280;font-size:13px;">Loading forms...</div>';

  db.collection("practitionerForms").get().then(snapshot => {
    let forms = [];
    snapshot.forEach(doc => {
      let d = doc.data(); d._id = doc.id;
      let formCat = d.category || "other";
      if (formCat === cat.id) forms.push(d);
    });
    renderFormsGrid(forms, cat);
  });
}

function renderFormsGrid(forms, cat) {
  let container = document.getElementById("forms-container");
  container.innerHTML = "";

  // Sort forms intelligently by form number/name
  forms.sort(function(a, b) {
    let nameA = a.name.trim();
    let nameB = b.name.trim();

    // Strip common prefixes for comparison
    let keyA = nameA.replace(/^(Schedule|Form|W-|1099-?)\s*/i, "").trim();
    let keyB = nameB.replace(/^(Schedule|Form|W-|1099-?)\s*/i, "").trim();

    // Check if keys start with a number
    let numMatchA = keyA.match(/^(\d+)(.*)/);
    let numMatchB = keyB.match(/^(\d+)(.*)/);

    let aIsNum = !!numMatchA;
    let bIsNum = !!numMatchB;

    // Pure letter keys (A, B, SE etc) come before numeric keys (1, 2, 3)
    if (!aIsNum && bIsNum) return -1;
    if (aIsNum && !bIsNum) return 1;

    // Both numeric — sort by number first, then suffix
    if (aIsNum && bIsNum) {
      let numDiff = parseInt(numMatchA[1]) - parseInt(numMatchB[1]);
      if (numDiff !== 0) return numDiff;
      // Same number, sort by suffix (e.g. 1040 vs 1040-SR vs 1040-X)
      return numMatchA[2].localeCompare(numMatchB[2]);
    }

    // Both non-numeric — alphabetical (A, B, C... SE)
    return keyA.localeCompare(keyB);
  });

  let grid = document.createElement("div");
  grid.className = "forms-grid";

  if (forms.length === 0) {
    let empty = document.createElement("div");
    empty.style.cssText = "grid-column:1/-1;padding:32px;color:#6B7280;font-size:13px;text-align:center;";
    empty.textContent = "No forms in this category yet. Click Upload Form to add one.";
    grid.appendChild(empty);
  }

  forms.forEach(f => {
    let card = document.createElement("div");
    card.className = "form-card";
    card.onclick = () => openFormViewer(f._id, f.storageUrl, f.name, f.desc || "");
    let isPinned = f.pinned === true;
    card.innerHTML = `
      <div class="form-card-icon"><span>PDF</span></div>
      <div class="form-card-info" style="flex:1;">
        <strong>${f.name}</strong>
        <span>${f.desc || "Uploaded form"}</span>
        <span class="form-year-tag">${f.taxYear || ""}</span>
      </div>
      <div class="form-card-actions" onclick="event.stopPropagation()">
        <button class="form-action-btn ${isPinned ? "pinned" : ""}" title="${isPinned ? "Unpin from Quick Access" : "Pin to Quick Access"}"
          onclick="togglePinForm('${f._id}', ${isPinned}, this)">${isPinned ? "📌" : "☆"}</button>
        <button class="form-action-btn delete" title="Delete form"
          onclick="deleteUploadedForm('${f._id}','${(f.storagePath||"").replace(/'/g,"\\'")}')">✕</button>
      </div>`;
    grid.appendChild(card);
  });

  container.appendChild(grid);
}

// Upload a PDF — now asks for category
function handleFormUpload(input) {
  let file = input.files[0];
  if (!file) return;
  let name = prompt("Form name (e.g. Form 1040):", file.name.replace(/\.pdf$/i,""));
  if (!name) { input.value=""; return; }
  let desc = prompt("Short description:", "");
  let year = prompt("Tax year:", new Date().getFullYear() - 1);

  // Category is already known from which category we're in
  let category = currentFormsCategory ? currentFormsCategory.id : "other";

  let path = "practitioner-forms/" + Date.now() + "_" + file.name;
  let ref  = storage.ref(path);

  // Show progress
  let container = document.getElementById("forms-container");
  let uploading = document.createElement("div");
  uploading.className = "form-upload-progress";
  uploading.style.marginBottom = "16px";
  uploading.innerHTML = `<span>Uploading ${name}...</span><div class="upload-bar"><div class="upload-bar-fill" id="upload-fill"></div></div>`;
  container.insertBefore(uploading, container.firstChild);

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
          name, desc: desc||"", taxYear: year||"", category,
          storagePath: path, storageUrl: url,
          uploadedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
      }).then(() => {
        uploading.remove();
        input.value = "";
        if (currentFormsCategory) openCategory(currentFormsCategory);
        else renderCategoryGrid();
      }).catch(e => { alert("Error: " + e.message); uploading.remove(); input.value=""; });
    }
  );
}

function deleteUploadedForm(docId, storagePath) {
  if (!confirm("Delete this form permanently?")) return;
  db.collection("practitionerForms").doc(docId).delete().then(() => {
    if (storagePath) storage.ref(storagePath).delete().catch(()=>{});
    if (currentFormsCategory) openCategory(currentFormsCategory);
    else renderCategoryGrid();
  }).catch(e => alert("Failed: " + e.message));
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

  document.getElementById("viewer-form-title").textContent  = formName;
  document.getElementById("viewer-form-desc").textContent   = formDesc || "";
  document.getElementById("form-preview-title").textContent = formName;
  document.getElementById("form-preview-desc").textContent  = formDesc || "";
  document.getElementById("viewer-back-btn").setAttribute("onclick", "switchDashTab('forms')");

  // Populate assign dropdown
  let sel = document.getElementById("assign-client-select");
  sel.innerHTML = '<option value="">— Assign to client —</option>';
  clients.forEach(c => {
    let opt = document.createElement("option");
    opt.value = c.uid; opt.textContent = c.name;
    sel.appendChild(opt);
  });
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
  // Build year dropdowns — 2020 to current year, default to prior year
  let currentYear = new Date().getFullYear();
  let years = [];
  for (let y = currentYear; y >= 2020; y--) years.push(y);

  ["overview-year-select", "clients-year-select"].forEach(id => {
    let sel = document.getElementById(id);
    if (!sel) return;
    years.forEach(y => {
      let opt = document.createElement("option");
      opt.value = y.toString();
      opt.textContent = y.toString();
      if (y.toString() === activeYear) opt.selected = true;
      sel.appendChild(opt);
    });
  });

  // Set the clients year label to match the default active year
  let label = document.getElementById("clients-year-label");
  if (label) label.textContent = "Tax Year " + activeYear;

  // Wire up form upload input
  let inp = document.getElementById("form-upload-input");
  if (inp) inp.addEventListener("change", function(){ handleFormUpload(this); });
});

auth.onAuthStateChanged(user => {
  if (!user) {
    window.location.href = "admin.html";
    return;
  }
  db.collection("admins").doc(user.uid).get().then(doc => {
    if (!doc.exists) {
      window.location.href = "portal.html";
      return;
    }

    // ── Session firewall ──
    let localSessionId   = sessionStorage.getItem("adminSessionId");
    let firestoreSession = doc.data().activeSession;

    if (firestoreSession && localSessionId && firestoreSession !== localSessionId) {
      auth.signOut().then(() => {
        alert("Your session was ended because a new sign-in was detected.");
        window.location.href = "admin.html";
      });
      return;
    }

    let overlay = document.getElementById("auth-loading");
    if (overlay) overlay.style.display = "none";
    loadAllClientsFromFirebase();
    loadAllDocuments();
    setInterval(checkUnreadMessages, 10000);
    setInterval(checkPendingApprovals, 30000);
    checkPendingApprovals();
    setInterval(() => verifySession(user.uid), 300000);

  }).catch(err => {
    console.error("Admin check failed:", err);
    let overlay = document.getElementById("auth-loading");
    if (overlay) {
      overlay.innerHTML = `
        <div style="text-align:center;">
          <div style="width:40px;height:40px;border-radius:10px;background:linear-gradient(135deg,#3B82F6,#6366F1);display:flex;align-items:center;justify-content:center;font-weight:700;font-size:16px;color:white;margin:0 auto 16px;">S</div>
          <p style="color:#EF4444;font-size:13px;font-family:'DM Sans',sans-serif;margin-bottom:12px;">Auth check failed: ${err.message}</p>
          <button onclick="auth.signOut().then(()=>window.location.href='admin.html')"
            style="padding:8px 20px;background:#3B82F6;color:white;border:none;border-radius:8px;cursor:pointer;font-family:'DM Sans',sans-serif;font-size:13px;">
            Sign Out & Try Again
          </button>
        </div>`;
    }
  });
});

// ── Secure Sign Out ──
function secureSignOut() {
  let user         = auth.currentUser;
  let sessionId    = sessionStorage.getItem("adminSessionId");
  let sessionStart = sessionStorage.getItem("adminSessionStart");

  if (user && sessionId) {
    let duration = sessionStart
      ? Math.round((Date.now() - parseInt(sessionStart)) / 1000)
      : null;

    db.collection("adminSessions").doc(sessionId).update({
      signOutAt: firebase.firestore.FieldValue.serverTimestamp(),
      duration:  duration,
      active:    false
    });

    db.collection("admins").doc(user.uid).update({ activeSession: null });
  }

  sessionStorage.removeItem("adminSessionId");
  sessionStorage.removeItem("adminSessionStart");

  auth.signOut().then(() => {
    window.location.href = "admin.html";
  });
}

// ── Session Verification (every 5 min) ──
function verifySession(uid) {
  let localSessionId = sessionStorage.getItem("adminSessionId");
  db.collection("admins").doc(uid).get().then(doc => {
    if (!doc.exists) { secureSignOut(); return; }
    let firestoreSession = doc.data().activeSession;
    if (firestoreSession && localSessionId && firestoreSession !== localSessionId) {
      alert("Your session was ended because a new sign-in was detected.");
      secureSignOut();
    }
  });
}

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
        notes:      d.notes      || "",
        bookkeeping:d.bookkeeping || false,
        color:colors[clients.length%colors.length],
        initials:(d.firstName||"?")[0]+(d.lastName||"?")[0]
      });
    });
    updateOverviewStats();
    updateRecentClientsList();
    loadQuickAccessForms();
  }).catch(e => {
    let el=document.getElementById("recent-clients-list");
    if(el) el.innerHTML=`<div style="padding:16px;text-align:center;color:#EF4444;font-size:13px;">Error: ${e.message}</div>`;
  });
}

function loadQuickAccessForms() {
  let grid = document.getElementById("quick-forms-grid");
  if (!grid) return;

  // Load only pinned forms
  db.collection("practitionerForms").where("pinned", "==", true).get().then(snapshot => {
    grid.innerHTML = "";
    let forms = [];
    snapshot.forEach(doc => { let d = doc.data(); d._id = doc.id; forms.push(d); });

    if (forms.length === 0) {
      grid.innerHTML = '<div class="quick-form add-quick-form" onclick="switchDashTab(\'forms\')"><span class="form-num">📌</span><span>Pin forms in Forms & Schedules to show here</span></div>';
      return;
    }

    forms.slice(0, 6).forEach(f => {
      let card = document.createElement("div");
      card.className = "quick-form";
      card.onclick = () => openFormViewer(f._id, f.storageUrl, f.name, f.desc || "");
      card.innerHTML = `<span class="form-num">${getFormShortName(f.name)}</span><span>${f.desc || f.name}</span>`;
      grid.appendChild(card);
    });
  });
}

// Generate a clean short label for any form name
function getFormShortName(name) {
  return name
    .replace(/^Form\s+/i, "")
    .replace(/^Schedule\s+/i, "Sch ")
    .split(" — ")[0]
    .split(" - ")[0]
    .trim();
}

function togglePinForm(docId, currentlyPinned, btn) {
  let newPinned = !currentlyPinned;
  db.collection("practitionerForms").doc(docId).update({ pinned: newPinned }).then(() => {
    btn.textContent = newPinned ? "📌" : "☆";
    btn.title = newPinned ? "Unpin from Quick Access" : "Pin to Quick Access";
    btn.classList.toggle("pinned", newPinned);
    loadQuickAccessForms();
  }).catch(e => alert("Failed: " + e.message));
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

function openReturnFormViewer(rid, formUrl, formName, formDesc) {
  currentFormId   = rid;
  currentFormUrl  = formUrl;
  currentFormName = formName;

  document.querySelectorAll(".dash-tab").forEach(t => t.style.display = "none");
  document.getElementById("tab-form-viewer").style.display = "block";
  document.querySelectorAll(".dash-nav-btn").forEach(b => b.classList.remove("active"));

  document.getElementById("viewer-form-title").textContent  = formName;
  document.getElementById("viewer-form-desc").textContent   = formDesc || "";
  document.getElementById("form-preview-title").textContent = formName;
  document.getElementById("form-preview-desc").textContent  = formDesc || "";
  document.getElementById("viewer-back-btn").setAttribute("onclick", "switchDashTab('returns')");

  let sel = document.getElementById("assign-client-select");
  sel.innerHTML = '<option value="">— Assign to client —</option>';
  clients.forEach(c => {
    let opt = document.createElement("option");
    opt.value = c.uid; opt.textContent = c.name;
    sel.appendChild(opt);
  });
}


// ══════════════════════════════════════
//  CLIENT APPROVAL SYSTEM
// ══════════════════════════════════════

function checkPendingApprovals() {
  db.collection("clients")
    .where("approvalStatus", "==", "pending-approval")
    .get().then(snapshot => {
      let count = snapshot.size;
      let badge = document.getElementById("clients-approval-badge");
      if (badge) {
        badge.textContent = count;
        badge.style.display = count > 0 ? "inline" : "none";
      }
      if (count > 0) renderPendingApprovalBanner(snapshot);
      else {
        let banner = document.getElementById("pending-approval-banner");
        if (banner) banner.style.display = "none";
      }
    });
}

function renderPendingApprovalBanner(snapshot) {
  let banner = document.getElementById("pending-approval-banner");
  if (!banner) return;
  banner.style.display = "block";
  let list = document.getElementById("pending-approval-list");
  list.innerHTML = "";

  snapshot.forEach(doc => {
    let d = doc.data();
    let name = (d.firstName || "") + " " + (d.lastName || "");
    let colors = ["blue","purple","green","orange","cyan"];
    let color  = colors[name.length % colors.length];
    let initials = (d.firstName||"?")[0] + (d.lastName||"?")[0];

    let timeText = "";
    if (d.createdAt) {
      let dt = new Date(d.createdAt.seconds * 1000);
      let months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
      timeText = months[dt.getMonth()] + " " + dt.getDate();
    }

    let row = document.createElement("div");
    row.className = "pending-client-row";
    row.innerHTML = `
      <div class="client-cell">
        <div class="client-cell-avatar ${color}">${initials}</div>
        <div>
          <div class="cell-name">${name}</div>
          <div class="cell-sub">${d.email || ""} · Registered ${timeText}</div>
        </div>
      </div>
      <div class="pending-actions">
        <button class="approve-btn" onclick="approveClient('${doc.id}','${name.replace(/'/g,"\\'")}','${d.email||""}')">✓ Approve</button>
        <button class="deny-btn"    onclick="denyClient('${doc.id}','${name.replace(/'/g,"\\'")}')">✕ Deny</button>
      </div>`;
    list.appendChild(row);
  });
}

function approveClient(uid, name, email) {
  if (!confirm("Approve " + name + "? They will get access to the portal immediately.")) return;
  db.collection("clients").doc(uid).update({
    approvalStatus: "approved",
    status: "pending"
  }).then(() => {
    // Log welcome activity
    db.collection("activity").add({
      clientId:  uid,
      type:      "account",
      text:      "Account approved — welcome to AcctgPro!",
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    });
    checkPendingApprovals();
    loadAllClientsFromFirebase();
  }).catch(e => alert("Failed: " + e.message));
}

function denyClient(uid, name) {
  if (!confirm("Deny and delete " + name + "'s account? This cannot be undone.")) return;
  // Delete from Firestore first, then Auth deletion happens via Cloud Function
  db.collection("clients").doc(uid).delete().then(() => {
    checkPendingApprovals();
  }).catch(e => alert("Failed: " + e.message));
}


// ══════════════════════════════════════
//  CLIENT NOTES
// ══════════════════════════════════════
let notesClientId   = null;
let notesClientName = "";

function openNotesModal(uid, name) {
  notesClientId   = uid;
  notesClientName = name;
  document.getElementById("notes-client-name").textContent = name;

  // Load existing note
  let client = clients.find(c => c.uid === uid);
  document.getElementById("notes-textarea").value = client && client.notes ? client.notes : "";
  document.getElementById("notes-modal").style.display = "flex";
  document.getElementById("notes-textarea").focus();
}

function closeNotesModal() {
  document.getElementById("notes-modal").style.display = "none";
  notesClientId = null;
}

function saveClientNote() {
  if (!notesClientId) return;
  let note = document.getElementById("notes-textarea").value.trim();

  db.collection("clients").doc(notesClientId).update({ notes: note }).then(() => {
    let client = clients.find(c => c.uid === notesClientId);
    if (client) client.notes = note;
    closeNotesModal();
    let activeFilter = document.querySelector(".filter-bar .filter-btn.active");
    renderClients(activeFilter ? activeFilter.textContent.toLowerCase().replace(" ", "-") : "all");
  }).catch(e => alert("Failed to save: " + e.message));
}
