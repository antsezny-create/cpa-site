// ══════════════════════════════════════
//  DATA
// ══════════════════════════════════════

let clients = [];
let allDocuments = [];
let currentDocTab = "pending";

// IRS Forms library — each form has an official IRS PDF URL
// You can update the `url` for any form to point to the latest IRS PDF
let formLibrary = {
  individual: [
    { id: "1040",    name: "Form 1040",    desc: "U.S. Individual Income Tax Return",          url: "https://www.irs.gov/pub/irs-pdf/f1040.pdf" },
    { id: "1040-SR", name: "Form 1040-SR", desc: "U.S. Tax Return for Seniors",                url: "https://www.irs.gov/pub/irs-pdf/f1040s.pdf" },
    { id: "1040-ES", name: "Form 1040-ES", desc: "Estimated Tax for Individuals",              url: "https://www.irs.gov/pub/irs-pdf/f1040es.pdf" },
    { id: "1040-X",  name: "Form 1040-X",  desc: "Amended Individual Tax Return",              url: "https://www.irs.gov/pub/irs-pdf/f1040x.pdf" },
    { id: "1040-V",  name: "Form 1040-V",  desc: "Payment Voucher",                            url: "https://www.irs.gov/pub/irs-pdf/f1040v.pdf" },
  ],
  schedules: [
    { id: "Sch-1",  name: "Schedule 1",  desc: "Additional Income and Adjustments",           url: "https://www.irs.gov/pub/irs-pdf/f1040s1.pdf" },
    { id: "Sch-2",  name: "Schedule 2",  desc: "Additional Taxes",                             url: "https://www.irs.gov/pub/irs-pdf/f1040s2.pdf" },
    { id: "Sch-3",  name: "Schedule 3",  desc: "Additional Credits and Payments",             url: "https://www.irs.gov/pub/irs-pdf/f1040s3.pdf" },
    { id: "Sch-A",  name: "Schedule A",  desc: "Itemized Deductions",                         url: "https://www.irs.gov/pub/irs-pdf/f1040sa.pdf" },
    { id: "Sch-B",  name: "Schedule B",  desc: "Interest and Ordinary Dividends",             url: "https://www.irs.gov/pub/irs-pdf/f1040sb.pdf" },
    { id: "Sch-C",  name: "Schedule C",  desc: "Profit or Loss From Business",                url: "https://www.irs.gov/pub/irs-pdf/f1040sc.pdf" },
    { id: "Sch-D",  name: "Schedule D",  desc: "Capital Gains and Losses",                    url: "https://www.irs.gov/pub/irs-pdf/f1040sd.pdf" },
    { id: "Sch-E",  name: "Schedule E",  desc: "Supplemental Income and Loss",                url: "https://www.irs.gov/pub/irs-pdf/f1040se.pdf" },
    { id: "Sch-SE", name: "Schedule SE", desc: "Self-Employment Tax",                         url: "https://www.irs.gov/pub/irs-pdf/f1040sse.pdf" },
  ],
  "w-forms": [
    { id: "W-2", name: "W-2", desc: "Wage and Tax Statement",                                  url: "https://www.irs.gov/pub/irs-pdf/fw2.pdf" },
    { id: "W-4", name: "W-4", desc: "Employee's Withholding Certificate",                     url: "https://www.irs.gov/pub/irs-pdf/fw4.pdf" },
    { id: "W-9", name: "W-9", desc: "Request for Taxpayer ID Number",                         url: "https://www.irs.gov/pub/irs-pdf/fw9.pdf" },
  ],
  "1099": [
    { id: "1099-MISC", name: "1099-MISC", desc: "Miscellaneous Information",                  url: "https://www.irs.gov/pub/irs-pdf/f1099msc.pdf" },
    { id: "1099-NEC",  name: "1099-NEC",  desc: "Nonemployee Compensation",                   url: "https://www.irs.gov/pub/irs-pdf/f1099nec.pdf" },
    { id: "1099-INT",  name: "1099-INT",  desc: "Interest Income",                             url: "https://www.irs.gov/pub/irs-pdf/f1099int.pdf" },
    { id: "1099-DIV",  name: "1099-DIV",  desc: "Dividends and Distributions",                url: "https://www.irs.gov/pub/irs-pdf/f1099div.pdf" },
    { id: "1099-R",    name: "1099-R",    desc: "Distributions From Pensions, Annuities",    url: "https://www.irs.gov/pub/irs-pdf/f1099r.pdf" },
    { id: "1099-K",    name: "1099-K",    desc: "Payment Card Transactions",                  url: "https://www.irs.gov/pub/irs-pdf/f1099k.pdf" },
  ],
  business: [
    { id: "1120",   name: "Form 1120",   desc: "U.S. Corporation Income Tax Return",          url: "https://www.irs.gov/pub/irs-pdf/f1120.pdf" },
    { id: "1120-S", name: "Form 1120-S", desc: "S Corporation Income Tax Return",             url: "https://www.irs.gov/pub/irs-pdf/f1120s.pdf" },
    { id: "1065",   name: "Form 1065",   desc: "U.S. Return of Partnership Income",           url: "https://www.irs.gov/pub/irs-pdf/f1065.pdf" },
    { id: "941",    name: "Form 941",    desc: "Employer's Quarterly Federal Tax Return",     url: "https://www.irs.gov/pub/irs-pdf/f941.pdf" },
    { id: "940",    name: "Form 940",    desc: "Annual Federal Unemployment Tax Return",      url: "https://www.irs.gov/pub/irs-pdf/f940.pdf" },
  ],
};

// Currently open form in the viewer
let currentFormId = null;
let currentFormUrl = null;
let currentFormName = null;


// ══════════════════════════════════════
//  TAB SWITCHING
// ══════════════════════════════════════

function switchDashTab(tabName) {
  let tabs = document.querySelectorAll(".dash-tab");
  for (let i = 0; i < tabs.length; i++) { tabs[i].style.display = "none"; }
  document.getElementById("tab-" + tabName).style.display = "block";

  let btns = document.querySelectorAll(".dash-nav-btn");
  for (let i = 0; i < btns.length; i++) {
    btns[i].classList.remove("active");
    let onclick = btns[i].getAttribute("onclick");
    if (onclick && onclick.includes("'" + tabName + "'")) { btns[i].classList.add("active"); }
  }

  if (tabName === "clients") renderClients("all");
  if (tabName === "forms") renderForms("individual");
  if (tabName === "documents") renderDocuments();
  if (tabName === "messages") loadFirebaseClients();
}


// ══════════════════════════════════════
//  CLIENTS
// ══════════════════════════════════════

function renderClients(filter) {
  let tbody = document.getElementById("client-table-body");
  tbody.innerHTML = "";

  if (clients.length === 0) {
    tbody.innerHTML = '<div style="padding: 24px; text-align: center; color: #6B7280; font-size: 13px;">No clients yet. They\'ll appear here when they register.</div>';
    return;
  }

  for (let i = 0; i < clients.length; i++) {
    let c = clients[i];
    if (filter !== "all" && c.status !== filter) continue;

    let row = document.createElement("div");
    row.className = "client-table-row";

    // Client name + email
    let clientCell = '<div class="client-cell">' +
      '<div class="client-cell-avatar ' + c.color + '">' + c.initials + '</div>' +
      '<div><div class="cell-name">' + c.name + '</div><div class="cell-sub">' + (c.email || "") + '</div></div></div>';

    // Type dropdown — use data-uid attribute, no inline JS with uid concatenation
    let typeOptions = ["Individual", "Joint", "Business", "Trust", "Partnership"];
    let typeSelect = '<select class="cell-dropdown" data-uid="' + c.uid + '" data-field="type" onchange="handleDropdownChange(this)">';
    for (let t = 0; t < typeOptions.length; t++) {
      let selected = c.type === typeOptions[t] ? " selected" : "";
      typeSelect += '<option value="' + typeOptions[t] + '"' + selected + '>' + typeOptions[t] + '</option>';
    }
    typeSelect += '</select>';

    // Status dropdown
    let statusOptions = [
      { value: "pending",     label: "Pending" },
      { value: "in-progress", label: "In Progress" },
      { value: "review",      label: "Review" },
      { value: "filed",       label: "Filed" }
    ];
    let statusSelect = '<select class="cell-dropdown status-dropdown status-' + c.status + '" data-uid="' + c.uid + '" data-field="status" onchange="handleStatusDropdownChange(this)">';
    for (let s = 0; s < statusOptions.length; s++) {
      let selected = c.status === statusOptions[s].value ? " selected" : "";
      statusSelect += '<option value="' + statusOptions[s].value + '"' + selected + '>' + statusOptions[s].label + '</option>';
    }
    statusSelect += '</select>';

    // Docs count
    let docsCell = '<span class="cell-docs">' + c.docs + '</span>';

    // Year dropdown
    let yearSelect = '<select class="cell-dropdown" data-uid="' + c.uid + '" data-field="year" onchange="handleDropdownChange(this)">';
    for (let y = 2020; y <= 2060; y++) {
      let yStr = y.toString();
      let selected = c.year === yStr ? " selected" : "";
      yearSelect += '<option value="' + yStr + '"' + selected + '>' + yStr + '</option>';
    }
    yearSelect += '</select>';

    // Case toggle
    let caseOpen = c.caseOpen !== false;
    let caseClass = caseOpen ? "case-btn-open" : "case-btn-closed";
    let caseLabel = caseOpen ? "Open" : "Closed";
    let caseBtn = '<button class="case-toggle ' + caseClass + '" data-uid="' + c.uid + '" onclick="toggleCase(this)">' + caseLabel + '</button>';

    row.innerHTML = clientCell + typeSelect + statusSelect + docsCell + yearSelect + caseBtn;
    tbody.appendChild(row);
  }
}

// Generic dropdown change handler — reads uid and field from data attributes
function handleDropdownChange(selectEl) {
  let uid = selectEl.getAttribute("data-uid");
  let field = selectEl.getAttribute("data-field");
  let value = selectEl.value;
  updateClientField(uid, field, value);
}

// Status dropdown also updates its own colour class
function handleStatusDropdownChange(selectEl) {
  let uid = selectEl.getAttribute("data-uid");
  let value = selectEl.value;
  selectEl.className = "cell-dropdown status-dropdown status-" + value;
  updateClientField(uid, "status", value);
}

function toggleCase(btn) {
  let uid = btn.getAttribute("data-uid");
  let isOpen = btn.classList.contains("case-btn-open");
  let newState = !isOpen;

  db.collection("clients").doc(uid).update({ caseOpen: newState })
    .then(function() {
      for (let i = 0; i < clients.length; i++) {
        if (clients[i].uid === uid) { clients[i].caseOpen = newState; break; }
      }
      if (newState) {
        btn.className = "case-toggle case-btn-open";
        btn.textContent = "Open";
      } else {
        btn.className = "case-toggle case-btn-closed";
        btn.textContent = "Closed";
      }
    })
    .catch(function(error) { alert("Failed to toggle case: " + error.message); });
}

function updateClientField(uid, field, value) {
  let update = {};
  update[field] = value;
  db.collection("clients").doc(uid).update(update)
    .then(function() {
      for (let i = 0; i < clients.length; i++) {
        if (clients[i].uid === uid) { clients[i][field] = value; break; }
      }
      updateOverviewStats();
      updateRecentClientsList();
    })
    .catch(function(error) { alert("Failed to update: " + error.message); });
}

function updateOverviewStats() {
  let total = clients.length;
  let pending = 0, progress = 0, review = 0, filed = 0;
  for (let i = 0; i < clients.length; i++) {
    if (clients[i].status === "pending")     pending++;
    if (clients[i].status === "in-progress") progress++;
    if (clients[i].status === "review")      review++;
    if (clients[i].status === "filed")       filed++;
  }
  document.getElementById("stat-total").textContent    = total;
  document.getElementById("stat-progress").textContent = progress;
  document.getElementById("stat-review").textContent   = review;
  document.getElementById("stat-filed").textContent    = filed;
}

function updateRecentClientsList() {
  let recentList = document.getElementById("recent-clients-list");
  if (!recentList) return;
  recentList.innerHTML = "";
  if (clients.length === 0) {
    recentList.innerHTML = '<div style="padding: 16px; text-align: center; color: #6B7280; font-size: 13px;">No clients yet.</div>';
    return;
  }
  let showCount = Math.min(clients.length, 5);
  for (let i = 0; i < showCount; i++) {
    let c = clients[i];
    let statusClass = "pending", statusLabel = "Pending";
    if (c.status === "in-progress") { statusClass = "progress"; statusLabel = "In Progress"; }
    if (c.status === "review")      { statusClass = "review";   statusLabel = "Review"; }
    if (c.status === "filed")       { statusClass = "filed";    statusLabel = "Filed"; }

    let item = document.createElement("div");
    item.className = "client-mini";
    item.innerHTML =
      '<div class="client-avatar ' + c.color + '">' + c.initials + '</div>' +
      '<div class="client-mini-info"><strong>' + c.name + '</strong><span>' + c.type + ' · ' + c.docs + ' docs</span></div>' +
      '<span class="status-pill ' + statusClass + '">' + statusLabel + '</span>';
    recentList.appendChild(item);
  }
}

function filterClients(filter, btn) {
  let btns = document.querySelectorAll(".filter-bar .filter-btn");
  for (let i = 0; i < btns.length; i++) { btns[i].classList.remove("active"); }
  btn.classList.add("active");
  renderClients(filter);
}


// ══════════════════════════════════════
//  FORMS LIBRARY
// ══════════════════════════════════════

function renderForms(category) {
  let grid = document.getElementById("forms-grid");
  grid.innerHTML = "";
  let forms = formLibrary[category] || [];
  for (let i = 0; i < forms.length; i++) {
    let f = forms[i];
    let card = document.createElement("div");
    card.className = "form-card";
    card.onclick = (function(form) {
      return function() { openFormViewer(form.id, form.url, form.name, form.desc); };
    })(f);

    // Add/edit/delete controls
    card.innerHTML =
      '<div class="form-card-icon"><span>IRS</span></div>' +
      '<div class="form-card-info" style="flex:1;">' +
        '<strong>' + f.name + '</strong>' +
        '<span>' + f.desc + '</span>' +
      '</div>' +
      '<div class="form-card-actions" onclick="event.stopPropagation()">' +
        '<button class="form-action-btn" title="Edit URL" onclick="editFormUrl(\'' + category + '\',' + i + ')">✎</button>' +
        '<button class="form-action-btn delete" title="Remove form" onclick="deleteForm(\'' + category + '\',' + i + ')">✕</button>' +
      '</div>';

    grid.appendChild(card);
  }

  // Add new form button at the end
  let addCard = document.createElement("div");
  addCard.className = "form-card add-form-card";
  addCard.onclick = function() { addNewForm(category); };
  addCard.innerHTML =
    '<div class="form-card-icon add-icon"><span>+</span></div>' +
    '<div class="form-card-info"><strong>Add Form</strong><span>Add a new IRS form to this category</span></div>';
  grid.appendChild(addCard);
}

function switchFormCategory(category, btn) {
  let btns = document.querySelectorAll(".form-categories .filter-btn");
  for (let i = 0; i < btns.length; i++) { btns[i].classList.remove("active"); }
  btn.classList.add("active");
  renderForms(category);
}

function addNewForm(category) {
  let name = prompt("Form name (e.g. Form 8829):");
  if (!name) return;
  let desc = prompt("Short description:");
  if (!desc) return;
  let url = prompt("IRS PDF URL (from irs.gov/pub/irs-pdf/):", "https://www.irs.gov/pub/irs-pdf/");
  if (!url) return;
  let id = name.replace(/\s+/g, "-").toLowerCase();
  formLibrary[category].push({ id: id, name: name, desc: desc, url: url });
  renderForms(category);
}

function editFormUrl(category, index) {
  let form = formLibrary[category][index];
  let newUrl = prompt("Update PDF URL for " + form.name + ":", form.url);
  if (newUrl && newUrl.trim()) {
    formLibrary[category][index].url = newUrl.trim();
    // Get active category button to re-render
    let activeBtn = document.querySelector(".form-categories .filter-btn.active");
    renderForms(category);
  }
}

function deleteForm(category, index) {
  let form = formLibrary[category][index];
  if (!confirm("Remove " + form.name + " from this category?")) return;
  formLibrary[category].splice(index, 1);
  renderForms(category);
}


// ══════════════════════════════════════
//  FORM VIEWER  (IRS PDF + data panel)
// ══════════════════════════════════════

function openFormViewer(formId, formUrl, formName, formDesc) {
  currentFormId  = formId;
  currentFormUrl = formUrl;
  currentFormName = formName;

  // Hide all tabs, show viewer tab
  let tabs = document.querySelectorAll(".dash-tab");
  for (let i = 0; i < tabs.length; i++) { tabs[i].style.display = "none"; }
  document.getElementById("tab-form-viewer").style.display = "block";

  // Set header
  document.getElementById("viewer-form-title").textContent = formName;
  document.getElementById("viewer-form-desc").textContent  = formDesc;

  // Load PDF in iframe
  let iframe = document.getElementById("form-pdf-iframe");
  iframe.src = formUrl;

  // Clear client assignment dropdown and repopulate
  let sel = document.getElementById("assign-client-select");
  sel.innerHTML = '<option value="">— Select client —</option>';
  for (let i = 0; i < clients.length; i++) {
    let opt = document.createElement("option");
    opt.value = clients[i].uid;
    opt.textContent = clients[i].name;
    sel.appendChild(opt);
  }

  // Remove active state from sidebar
  let btns = document.querySelectorAll(".dash-nav-btn");
  for (let i = 0; i < btns.length; i++) { btns[i].classList.remove("active"); }
}

function assignFormToClient() {
  let sel = document.getElementById("assign-client-select");
  let uid = sel.value;
  if (!uid) { alert("Please select a client first."); return; }
  let clientName = sel.options[sel.selectedIndex].text;
  if (confirm("Assign " + currentFormName + " to " + clientName + "?")) {
    db.collection("assignedForms").add({
      clientId:  uid,
      formId:    currentFormId,
      formName:  currentFormName,
      formUrl:   currentFormUrl,
      assignedAt: firebase.firestore.FieldValue.serverTimestamp()
    }).then(function() {
      alert(currentFormName + " assigned to " + clientName + ".");
    }).catch(function(e) { alert("Error: " + e.message); });
  }
}

function openFormInNewTab() {
  if (currentFormUrl) window.open(currentFormUrl, "_blank");
}


// ══════════════════════════════════════
//  DOCUMENTS (Firebase)
// ══════════════════════════════════════

function loadAllDocuments() {
  db.collection("documents").get()
    .then(function(snapshot) {
      allDocuments = [];
      snapshot.forEach(function(doc) {
        let d = doc.data();
        d._id = doc.id;
        d.reviewStatus = d.reviewStatus || "pending";
        allDocuments.push(d);
      });
      renderDocuments();
    });
}

function switchDocTab(tab, btn) {
  currentDocTab = tab;
  let btns = document.querySelectorAll(".doc-tab-btn");
  for (let i = 0; i < btns.length; i++) { btns[i].classList.remove("active"); }
  btn.classList.add("active");
  renderDocuments();
}

function renderDocuments() {
  let list    = document.getElementById("doc-review-list");
  let title   = document.getElementById("doc-section-title");
  let countEl = document.getElementById("doc-section-count");
  list.innerHTML = "";

  let titles = { pending: "Pending Review", approved: "Approved", flagged: "Flagged" };
  title.textContent = titles[currentDocTab] || "Documents";

  let filtered = [];
  for (let i = 0; i < allDocuments.length; i++) {
    if (allDocuments[i].reviewStatus === currentDocTab) filtered.push(allDocuments[i]);
  }

  countEl.textContent = filtered.length + " document" + (filtered.length !== 1 ? "s" : "");

  if (filtered.length === 0) {
    list.innerHTML = '<div style="padding: 24px; text-align: center; color: #6B7280; font-size: 13px;">No ' + currentDocTab + ' documents.</div>';
    return;
  }

  let clientMap = {};
  for (let i = 0; i < clients.length; i++) { clientMap[clients[i].uid] = clients[i].name; }

  for (let i = 0; i < filtered.length; i++) {
    let doc = filtered[i];
    let ext = (doc.fileName || "FILE").split(".").pop().toUpperCase();
    let clientName = clientMap[doc.clientId] || "Unknown Client";
    let isImage = ["JPG","JPEG","PNG","GIF","WEBP"].indexOf(ext) !== -1;
    let isPdf   = ext === "PDF";

    let timeText = "";
    if (doc.uploadedAt) {
      let date = new Date(doc.uploadedAt.seconds * 1000);
      let months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
      timeText = months[date.getMonth()] + " " + date.getDate();
    }

    let item = document.createElement("div");
    item.className = "doc-review-item";

    // Thumbnail
    let thumbHTML = "";
    if (isImage && doc.fileURL) {
      thumbHTML = '<div class="doc-thumb"><img src="' + doc.fileURL + '" alt="preview" class="doc-thumb-img"></div>';
    } else if (isPdf) {
      thumbHTML = '<div class="doc-thumb doc-thumb-pdf"><span>PDF</span></div>';
    } else {
      thumbHTML = '<div class="doc-thumb doc-thumb-file"><span>' + ext + '</span></div>';
    }

    // Status icon
    let iconClass = "doc-icon";
    let iconText  = ext.slice(0,3);
    if (currentDocTab === "approved") { iconClass = "doc-icon approved-icon"; iconText = "✓"; }
    if (currentDocTab === "flagged")  { iconClass = "doc-icon flagged-icon";  iconText = "!"; }

    let deleteBtn = '<button class="action-btn-delete" onclick="deleteDocumentAdmin(\'' + doc._id + '\', \'' + (doc.fileURL || '').replace(/'/g, "\\'") + '\')">Delete</button>';
    let actionsHTML = "";

    if (currentDocTab === "pending") {
      actionsHTML = '<div class="doc-actions">' +
        '<button class="action-btn approve" onclick="reviewDocument(\'' + doc._id + '\', \'approved\')">Approve</button>' +
        '<button class="action-btn flag"    onclick="reviewDocument(\'' + doc._id + '\', \'flagged\')">Flag</button>' +
        deleteBtn + '</div>';
    } else if (currentDocTab === "approved") {
      actionsHTML = '<div class="doc-actions"><span class="doc-status-badge approved">Approved</span>';
      if (doc.fileURL) { actionsHTML += ' <a href="' + doc.fileURL + '" target="_blank" class="action-btn approve" style="text-decoration:none;margin-left:6px;">View</a>'; }
      actionsHTML += deleteBtn + '</div>';
    } else if (currentDocTab === "flagged") {
      actionsHTML = '<div class="doc-actions"><span class="doc-status-badge flagged">Flagged</span>';
      if (doc.fileURL) { actionsHTML += ' <a href="' + doc.fileURL + '" target="_blank" class="action-btn flag" style="text-decoration:none;margin-left:6px;">View</a>'; }
      actionsHTML += deleteBtn + '</div>';
    }

    item.innerHTML =
      thumbHTML +
      '<div class="' + iconClass + '">' + iconText + '</div>' +
      '<div class="doc-review-info"><strong>' + (doc.fileName || "Unknown file") + '</strong><span>' + clientName + ' · ' + timeText + ' · ' + (doc.fileSize || "") + '</span></div>' +
      actionsHTML;

    list.appendChild(item);
  }
}

function reviewDocument(docId, newStatus) {
  db.collection("documents").doc(docId).update({ reviewStatus: newStatus })
    .then(function() {
      for (let i = 0; i < allDocuments.length; i++) {
        if (allDocuments[i]._id === docId) { allDocuments[i].reviewStatus = newStatus; break; }
      }
      renderDocuments();
    })
    .catch(function(error) { alert("Failed to update document: " + error.message); });
}

function deleteDocumentAdmin(docId, fileURL) {
  if (!confirm("Delete this document permanently?")) return;
  db.collection("documents").doc(docId).delete()
    .then(function() {
      for (let i = 0; i < allDocuments.length; i++) {
        if (allDocuments[i]._id === docId) { allDocuments.splice(i, 1); break; }
      }
      renderDocuments();
      if (fileURL) {
        try { storage.refFromURL(fileURL).delete().catch(function() {}); } catch(e) {}
      }
    })
    .catch(function(error) { alert("Failed to delete: " + error.message); });
}


// ══════════════════════════════════════
//  MESSAGES (Firebase)
// ══════════════════════════════════════

let activeClientId = null;
let activeClientName = "";
let messageRefreshInterval = null;

function loadFirebaseClients() {
  let list = document.getElementById("msg-client-list");
  if (!list) return;

  db.collection("clients").get()
    .then(function(snapshot) {
      list.innerHTML = "";
      if (snapshot.empty) {
        list.innerHTML = '<div style="padding: 20px; text-align: center; color: #6B7280; font-size: 13px;">No clients yet.</div>';
        return;
      }
      snapshot.forEach(function(doc) {
        let client = doc.data();
        let name = client.firstName + " " + client.lastName;
        let initials = client.firstName.charAt(0) + client.lastName.charAt(0);
        let colors = ["blue","purple","green","orange","cyan"];
        let color = colors[name.length % colors.length];
        let clientId = doc.id;

        let item = document.createElement("div");
        item.className = "msg-client-item";
        item.setAttribute("data-clientid", clientId);
        item.onclick = function() {
          let all = document.querySelectorAll(".msg-client-item");
          for (let j = 0; j < all.length; j++) { all[j].classList.remove("active"); }
          item.classList.add("active");
          let dot = item.querySelector(".msg-unread-dot");
          if (dot) dot.remove();
          openConvo(clientId, name, initials, color, client.type || "Individual");
        };
        item.innerHTML =
          '<div class="msg-client-avatar ' + color + '">' + initials + '</div>' +
          '<div class="msg-client-info"><div class="msg-client-top"><strong>' + name + '</strong></div>' +
          '<p class="msg-preview">' + (client.type || "Individual") + ' · ' + (client.email || "") + '</p></div>';
        list.appendChild(item);
      });
      checkUnreadMessages();
    })
    .catch(function(error) {
      list.innerHTML = '<div style="padding: 20px; text-align: center; color: #EF4444; font-size: 13px;">Error: ' + error.message + '</div>';
    });
}

function checkUnreadMessages() {
  db.collection("messages").get()
    .then(function(snapshot) {
      let unreadByClient = {};
      snapshot.forEach(function(doc) {
        let msg = doc.data();
        if (msg.senderRole === "client" && !msg.readByAdmin) {
          unreadByClient[msg.clientId] = (unreadByClient[msg.clientId] || 0) + 1;
        }
      });
      let totalUnread = 0;
      let items = document.querySelectorAll(".msg-client-item");
      for (let i = 0; i < items.length; i++) {
        let cid = items[i].getAttribute("data-clientid");
        let existing = items[i].querySelector(".msg-unread-dot");
        if (existing) existing.remove();
        if (unreadByClient[cid] && unreadByClient[cid] > 0) {
          totalUnread += unreadByClient[cid];
          let dot = document.createElement("span");
          dot.className = "msg-unread-dot";
          items[i].appendChild(dot);
        }
      }
      let badge = document.getElementById("msg-badge");
      if (totalUnread > 0) {
        badge.textContent = totalUnread;
        badge.style.display = "inline";
      } else {
        badge.style.display = "none";
      }
    });
}

function openConvo(clientId, name, initials, color, type) {
  activeClientId   = clientId;
  activeClientName = name;

  document.getElementById("msg-conv-header").innerHTML =
    '<div class="msg-conv-avatar ' + color + '">' + initials + '</div>' +
    '<div><strong>' + name + '</strong><span>' + type + ' · 2025 Return</span></div>';

  let input = document.getElementById("admin-msg-input");
  input.placeholder = "Type a message to " + name.split(" ")[0] + "...";
  input.disabled = false;

  if (messageRefreshInterval) clearInterval(messageRefreshInterval);
  loadMessagesForClient(clientId);
  messageRefreshInterval = setInterval(function() { loadMessagesForClient(clientId); }, 3000);

  db.collection("messages").get().then(function(snapshot) {
    snapshot.forEach(function(doc) {
      let msg = doc.data();
      if (msg.clientId === clientId && msg.senderRole === "client" && !msg.readByAdmin) {
        db.collection("messages").doc(doc.id).update({ readByAdmin: true });
      }
    });
    checkUnreadMessages();
  });
}

function loadMessagesForClient(clientId) {
  db.collection("messages").get()
    .then(function(snapshot) {
      let thread = document.getElementById("admin-msg-thread");
      let messages = [];
      snapshot.forEach(function(doc) {
        let msg = doc.data();
        if (msg.clientId === clientId) messages.push(msg);
      });
      messages.sort(function(a, b) {
        if (!a.timestamp || !b.timestamp) return 0;
        return a.timestamp.seconds - b.timestamp.seconds;
      });
      thread.innerHTML = "";
      if (messages.length === 0) {
        thread.innerHTML = '<div style="text-align:center;color:#6B7280;padding:40px;font-size:13px;">No messages yet. Start the conversation!</div>';
        return;
      }
      for (let i = 0; i < messages.length; i++) {
        let msg = messages[i];
        let isAdmin = msg.senderRole === "admin";
        let timeText = "";
        if (msg.timestamp) {
          let date = new Date(msg.timestamp.seconds * 1000);
          let hours = date.getHours(), minutes = date.getMinutes();
          let ampm = hours >= 12 ? "PM" : "AM";
          hours = hours % 12; if (hours === 0) hours = 12;
          if (minutes < 10) minutes = "0" + minutes;
          let months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
          timeText = months[date.getMonth()] + " " + date.getDate() + ", " + hours + ":" + minutes + " " + ampm;
        }
        let bubble = document.createElement("div");
        bubble.className = "msg-bubble " + (isAdmin ? "sent" : "received");
        bubble.innerHTML =
          '<div class="msg-bubble-meta"><strong>' + (msg.senderName || "Unknown") + '</strong> <span>' + timeText + '</span></div>' +
          '<div class="msg-bubble-text">' + (msg.text || "") + '</div>';
        thread.appendChild(bubble);
      }
      thread.scrollTop = thread.scrollHeight;
    })
    .catch(function(error) {
      document.getElementById("admin-msg-thread").innerHTML =
        '<div style="text-align:center;color:#EF4444;padding:40px;font-size:13px;">Error: ' + error.message + '</div>';
    });
}

function sendAdminMessage() {
  let input = document.getElementById("admin-msg-input");
  let text  = input.value.trim();
  if (text === "" || !activeClientId) return;
  input.value = "";
  db.collection("messages").add({
    clientId:   activeClientId,
    senderId:   auth.currentUser ? auth.currentUser.uid : "admin",
    senderName: "Anthony Sesny",
    senderRole: "admin",
    text:       text,
    readByAdmin: true,
    timestamp:  firebase.firestore.FieldValue.serverTimestamp()
  }).then(function() { loadMessagesForClient(activeClientId); });
}

function filterMessageClients(query) {
  let items = document.querySelectorAll(".msg-client-item");
  let lowerQuery = query.toLowerCase();
  for (let i = 0; i < items.length; i++) {
    let name = items[i].querySelector("strong").textContent.toLowerCase();
    items[i].style.display = name.includes(lowerQuery) ? "flex" : "none";
  }
}


// ══════════════════════════════════════
//  INIT
// ══════════════════════════════════════

document.addEventListener("DOMContentLoaded", function() {
  renderForms("individual");
});

auth.onAuthStateChanged(function(user) {
  if (user) {
    loadAllClientsFromFirebase();
    loadAllDocuments();
    setInterval(checkUnreadMessages, 10000);
  }
});

function loadAllClientsFromFirebase() {
  db.collection("clients").get()
    .then(function(snapshot) {
      clients = [];
      let colors = ["blue","purple","green","orange","cyan","red"];
      snapshot.forEach(function(doc) {
        let d = doc.data();
        let name = (d.firstName || "Unknown") + " " + (d.lastName || "");
        clients.push({
          uid:      doc.id,
          name:     name,
          email:    d.email || "",
          phone:    d.phone || "",
          status:   d.status || "pending",
          docs:     d.documents || 0,
          type:     d.type || "Individual",
          year:     d.year || "2025",
          caseOpen: d.caseOpen !== false,
          color:    colors[clients.length % colors.length],
          initials: (d.firstName || "?").charAt(0) + (d.lastName || "?").charAt(0)
        });
      });
      updateOverviewStats();
      updateRecentClientsList();
      renderClients("all");
    })
    .catch(function(error) {
      let recentList = document.getElementById("recent-clients-list");
      if (recentList) recentList.innerHTML = '<div style="padding: 16px; text-align: center; color: #EF4444; font-size: 13px;">Error: ' + error.message + '</div>';
    });
}
