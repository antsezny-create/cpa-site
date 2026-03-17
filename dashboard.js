// ══════════════════════════════════════
//  DATA
// ══════════════════════════════════════

let clients = [];
let allDocuments = [];
let currentDocTab = "pending";

let formLibrary = {
  individual: [
    { id: "1040", name: "Form 1040", desc: "U.S. Individual Income Tax Return" },
    { id: "1040-SR", name: "Form 1040-SR", desc: "U.S. Tax Return for Seniors" },
    { id: "1040-ES", name: "Form 1040-ES", desc: "Estimated Tax for Individuals" },
    { id: "1040-X", name: "Form 1040-X", desc: "Amended Individual Tax Return" },
    { id: "1040-V", name: "Form 1040-V", desc: "Payment Voucher" },
  ],
  schedules: [
    { id: "Sch-1", name: "Schedule 1", desc: "Additional Income and Adjustments" },
    { id: "Sch-2", name: "Schedule 2", desc: "Additional Taxes" },
    { id: "Sch-3", name: "Schedule 3", desc: "Additional Credits and Payments" },
    { id: "Sch-A", name: "Schedule A", desc: "Itemized Deductions" },
    { id: "Sch-B", name: "Schedule B", desc: "Interest and Ordinary Dividends" },
    { id: "Sch-C", name: "Schedule C", desc: "Profit or Loss From Business" },
    { id: "Sch-D", name: "Schedule D", desc: "Capital Gains and Losses" },
    { id: "Sch-E", name: "Schedule E", desc: "Supplemental Income and Loss" },
    { id: "Sch-SE", name: "Schedule SE", desc: "Self-Employment Tax" },
  ],
  "w-forms": [
    { id: "W-2", name: "W-2", desc: "Wage and Tax Statement" },
    { id: "W-4", name: "W-4", desc: "Employee's Withholding Certificate" },
    { id: "W-9", name: "W-9", desc: "Request for Taxpayer ID Number" },
  ],
  "1099": [
    { id: "1099-MISC", name: "1099-MISC", desc: "Miscellaneous Information" },
    { id: "1099-NEC", name: "1099-NEC", desc: "Nonemployee Compensation" },
    { id: "1099-INT", name: "1099-INT", desc: "Interest Income" },
    { id: "1099-DIV", name: "1099-DIV", desc: "Dividends and Distributions" },
    { id: "1099-R", name: "1099-R", desc: "Distributions From Pensions, Annuities" },
    { id: "1099-K", name: "1099-K", desc: "Payment Card Transactions" },
  ],
  business: [
    { id: "1120", name: "Form 1120", desc: "U.S. Corporation Income Tax Return" },
    { id: "1120-S", name: "Form 1120-S", desc: "S Corporation Income Tax Return" },
    { id: "1065", name: "Form 1065", desc: "U.S. Return of Partnership Income" },
    { id: "941", name: "Form 941", desc: "Employer's Quarterly Federal Tax Return" },
    { id: "940", name: "Form 940", desc: "Annual Federal Unemployment Tax Return" },
  ],
};


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
    if (onclick && onclick.includes(tabName)) { btns[i].classList.add("active"); }
  }

  if (tabName === "clients") renderClients("all");
  if (tabName === "forms") renderForms("individual");
  if (tabName === "documents") renderDocuments();
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
      '<div class="client-cell-avatar ' + c.color + '" style="background: linear-gradient(135deg, var(--' + c.color + '), var(--' + c.color + '))">' + c.initials + '</div>' +
      '<div><div class="cell-name">' + c.name + '</div><div class="cell-sub">' + (c.email || "") + '</div></div></div>';

    // Type dropdown
    let typeOptions = ["Individual", "Joint", "Business", "Trust", "Partnership"];
    let typeSelect = '<select class="cell-dropdown" onchange="updateClientField(\'' + c.uid + '\', \'type\', this.value)">';
    for (let t = 0; t < typeOptions.length; t++) {
      let selected = c.type === typeOptions[t] ? " selected" : "";
      typeSelect += '<option value="' + typeOptions[t] + '"' + selected + '>' + typeOptions[t] + '</option>';
    }
    typeSelect += '</select>';

    // Status dropdown
    let statusOptions = [
      { value: "pending", label: "Pending" },
      { value: "in-progress", label: "In Progress" },
      { value: "review", label: "Review" },
      { value: "filed", label: "Filed" }
    ];
    let statusSelect = '<select class="cell-dropdown status-dropdown status-' + c.status + '" onchange="updateClientField(\'' + c.uid + '\', \'status\', this.value); this.className=\'cell-dropdown status-dropdown status-\'+this.value;">';
    for (let s = 0; s < statusOptions.length; s++) {
      let selected = c.status === statusOptions[s].value ? " selected" : "";
      statusSelect += '<option value="' + statusOptions[s].value + '"' + selected + '>' + statusOptions[s].label + '</option>';
    }
    statusSelect += '</select>';

    // Docs count
    let docsCell = '<span class="cell-docs">' + c.docs + '</span>';

    // Year dropdown (2020-2060)
    let yearSelect = '<select class="cell-dropdown" onchange="updateClientField(\'' + c.uid + '\', \'year\', this.value)">';
    for (let y = 2020; y <= 2060; y++) {
      let yStr = y.toString();
      let selected = c.year === yStr ? " selected" : "";
      yearSelect += '<option value="' + yStr + '"' + selected + '>' + yStr + '</option>';
    }
    yearSelect += '</select>';

    // Open/Close toggle button
    let caseOpen = c.caseOpen !== false; // default to open
    let caseClass = caseOpen ? "case-btn-open" : "case-btn-closed";
    let caseLabel = caseOpen ? "Open" : "Closed";
    let caseBtn = '<button class="case-toggle ' + caseClass + '" onclick="toggleCase(\'' + c.uid + '\', this)">' + caseLabel + '</button>';

    row.innerHTML = clientCell + typeSelect + statusSelect + docsCell + yearSelect + caseBtn;
    tbody.appendChild(row);
  }
}

function toggleCase(uid, btn) {
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
    });
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
    })
    .catch(function(error) { alert("Failed to update: " + error.message); });
}

function updateOverviewStats() {
  let total = clients.length;
  let pending = 0, progress = 0, review = 0, filed = 0;
  for (let i = 0; i < clients.length; i++) {
    if (clients[i].status === "pending") pending++;
    if (clients[i].status === "in-progress") progress++;
    if (clients[i].status === "review") review++;
    if (clients[i].status === "filed") filed++;
  }
  document.getElementById("stat-total").textContent = total;
  document.getElementById("stat-progress").textContent = progress;
  document.getElementById("stat-review").textContent = review;
  document.getElementById("stat-filed").textContent = filed;
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
    card.onclick = function() { openFormEditor(f.id); };
    card.innerHTML = '<div class="form-card-icon"><span>IRS</span></div><div class="form-card-info"><strong>' + f.name + '</strong><span>' + f.desc + '</span></div>';
    grid.appendChild(card);
  }
}

function switchFormCategory(category, btn) {
  let btns = document.querySelectorAll(".form-categories .filter-btn");
  for (let i = 0; i < btns.length; i++) { btns[i].classList.remove("active"); }
  btn.classList.add("active");
  renderForms(category);
}


// ══════════════════════════════════════
//  FORM EDITOR
// ══════════════════════════════════════

function openFormEditor(formId) {
  let formInfo = null;
  let allCategories = Object.keys(formLibrary);
  for (let c = 0; c < allCategories.length; c++) {
    let forms = formLibrary[allCategories[c]];
    for (let f = 0; f < forms.length; f++) {
      if (forms[f].id === formId) { formInfo = forms[f]; break; }
    }
    if (formInfo) break;
  }
  if (!formInfo) return;

  let tabs = document.querySelectorAll(".dash-tab");
  for (let i = 0; i < tabs.length; i++) { tabs[i].style.display = "none"; }
  document.getElementById("tab-form-editor").style.display = "block";
  document.getElementById("editor-form-title").textContent = formInfo.name;
  document.getElementById("editor-form-desc").textContent = formInfo.desc;

  let content = document.getElementById("form-editor-content");
  if (formId === "1040") {
    content.innerHTML = build1040Editor();
  } else {
    content.innerHTML = '<div class="form-placeholder"><div class="form-placeholder-icon"><span>IRS</span></div><h2>' + formInfo.name + '</h2><p>' + formInfo.desc + '</p><p style="margin-top: 24px; color: var(--text-dim);">This form is ready for data entry.</p><button class="primary-btn" style="margin-top: 20px;" onclick="alert(\'Coming soon!\')">Begin Data Entry</button></div>';
  }

  let btns = document.querySelectorAll(".dash-nav-btn");
  for (let i = 0; i < btns.length; i++) { btns[i].classList.remove("active"); }
}

function build1040Editor() {
  let html = '';
  html += '<div class="form-editor-top"><div class="form-editor-top-left"><span>Department of the Treasury — Internal Revenue Service</span><h2>Form 1040</h2><p>U.S. Individual Income Tax Return</p></div><div class="form-editor-top-right"><span>Tax Year</span><strong>2025</strong></div></div>';
  html += '<div class="editor-section"><div class="editor-section-title">Personal Information</div>';
  html += '<div class="editor-row"><div class="editor-field" style="flex:1.5;"><label>First name and middle initial</label><input type="text" id="f-firstName"></div><div class="editor-field" style="flex:1;"><label>Last name</label><input type="text" id="f-lastName"></div></div>';
  html += '<div class="editor-row"><div class="editor-field" style="flex:1;"><label>Social security number</label><input type="text" id="f-ssn" placeholder="XXX-XX-XXXX"></div><div class="editor-field" style="flex:1;"><label>Filing status</label><select id="f-filingStatus"><option value="">Select...</option><option>Single</option><option>Married filing jointly</option><option>Married filing separately</option><option>Head of household</option><option>Qualifying surviving spouse</option></select></div></div>';
  html += '<div class="editor-row"><div class="editor-field" style="flex:1;"><label>Home address</label><input type="text" id="f-address"></div></div>';
  html += '<div class="editor-row"><div class="editor-field" style="flex:1.5;"><label>City</label><input type="text" id="f-city"></div><div class="editor-field" style="flex:0.5;"><label>State</label><input type="text" id="f-state"></div><div class="editor-field" style="flex:0.5;"><label>ZIP</label><input type="text" id="f-zip"></div></div></div>';

  let incomeLines = [
    { num: "1", label: "Wages, salaries, tips (W-2, box 1)", key: "line1" },
    { num: "2a", label: "Tax-exempt interest", key: "line2a" },
    { num: "2b", label: "Taxable interest", key: "line2b" },
    { num: "3a", label: "Qualified dividends", key: "line3a" },
    { num: "3b", label: "Ordinary dividends", key: "line3b" },
    { num: "4a", label: "IRA distributions", key: "line4a" },
    { num: "4b", label: "Taxable amount", key: "line4b" },
    { num: "5a", label: "Pensions and annuities", key: "line5a" },
    { num: "5b", label: "Taxable amount", key: "line5b" },
    { num: "6a", label: "Social security benefits", key: "line6a" },
    { num: "6b", label: "Taxable amount", key: "line6b" },
    { num: "7", label: "Capital gain or (loss) — Schedule D", key: "line7" },
    { num: "8", label: "Other income — Schedule 1, line 10", key: "line8" },
  ];

  html += '<div class="editor-section"><div class="editor-section-title">Income</div>';
  for (let i = 0; i < incomeLines.length; i++) {
    let line = incomeLines[i];
    html += '<div class="income-line"><label>' + line.num + '  ' + line.label + '</label><div class="income-input-wrap"><span>$</span><input type="text" class="income-input" id="f-' + line.key + '" oninput="calculateTotal()"></div></div>';
  }
  html += '<div class="income-line total"><label>9  Total income (add lines 1 through 8)</label><div class="income-input-wrap"><span>$</span><input type="text" class="income-input total-field" id="f-line9" readonly></div></div></div>';
  return html;
}

function calculateTotal() {
  let keys = ["line1", "line2b", "line3b", "line4b", "line5b", "line6b", "line7", "line8"];
  let total = 0;
  for (let i = 0; i < keys.length; i++) {
    let input = document.getElementById("f-" + keys[i]);
    if (input) { total += parseFloat(input.value) || 0; }
  }
  let totalField = document.getElementById("f-line9");
  if (totalField) { totalField.value = total.toFixed(2); }
}


// ══════════════════════════════════════
//  DOCUMENTS (Firebase Real-Time)
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
  let list = document.getElementById("doc-review-list");
  let title = document.getElementById("doc-section-title");
  let countEl = document.getElementById("doc-section-count");
  list.innerHTML = "";

  let titles = { pending: "Pending Review", approved: "Approved", flagged: "Flagged" };
  title.textContent = titles[currentDocTab] || "Documents";

  let filtered = [];
  for (let i = 0; i < allDocuments.length; i++) {
    if (allDocuments[i].reviewStatus === currentDocTab) {
      filtered.push(allDocuments[i]);
    }
  }

  countEl.textContent = filtered.length + " document" + (filtered.length !== 1 ? "s" : "");

  if (filtered.length === 0) {
    list.innerHTML = '<div style="padding: 24px; text-align: center; color: #6B7280; font-size: 13px;">No ' + currentDocTab + ' documents.</div>';
    return;
  }

  // Find client names
  let clientMap = {};
  for (let i = 0; i < clients.length; i++) {
    clientMap[clients[i].uid] = clients[i].name;
  }

  for (let i = 0; i < filtered.length; i++) {
    let doc = filtered[i];
    let ext = (doc.fileName || "FILE").split(".").pop().toUpperCase();
    let clientName = clientMap[doc.clientId] || "Unknown Client";

    let timeText = "";
    if (doc.uploadedAt) {
      let date = new Date(doc.uploadedAt.seconds * 1000);
      let months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
      timeText = months[date.getMonth()] + " " + date.getDate();
    }

    let item = document.createElement("div");
    item.className = "doc-review-item";

    let iconClass = "doc-icon";
    let iconText = ext;
    if (currentDocTab === "approved") { iconClass = "doc-icon approved-icon"; iconText = "✓"; }
    if (currentDocTab === "flagged") { iconClass = "doc-icon flagged-icon"; iconText = "!"; }

    let actionsHTML = "";
    let deleteBtn = ' <button class="action-btn-delete" onclick="deleteDocumentAdmin(\'' + doc._id + '\', \'' + (doc.fileURL || '').replace(/'/g, "\\'") + '\')">Delete</button>';

    if (currentDocTab === "pending") {
      actionsHTML = '<div class="doc-actions">' +
        '<button class="action-btn approve" onclick="reviewDocument(\'' + doc._id + '\', \'approved\')">Approve</button>' +
        '<button class="action-btn flag" onclick="reviewDocument(\'' + doc._id + '\', \'flagged\')">Flag</button>' +
        deleteBtn + '</div>';
    } else if (currentDocTab === "approved") {
      actionsHTML = '<div class="doc-actions"><span class="doc-status-badge approved">Approved</span>';
      if (doc.fileURL) {
        actionsHTML += ' <a href="' + doc.fileURL + '" target="_blank" class="action-btn approve" style="text-decoration:none;margin-left:6px;">View</a>';
      }
      actionsHTML += deleteBtn + '</div>';
    } else if (currentDocTab === "flagged") {
      actionsHTML = '<div class="doc-actions"><span class="doc-status-badge flagged">Flagged</span>';
      if (doc.fileURL) {
        actionsHTML += ' <a href="' + doc.fileURL + '" target="_blank" class="action-btn flag" style="text-decoration:none;margin-left:6px;">View</a>';
      }
      actionsHTML += deleteBtn + '</div>';
    }

    item.innerHTML =
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
        if (allDocuments[i]._id === docId) {
          allDocuments[i].reviewStatus = newStatus;
          break;
        }
      }
      renderDocuments();
    })
    .catch(function(error) { alert("Failed to update document: " + error.message); });
}

function deleteDocumentAdmin(docId, fileURL) {
  if (!confirm("Delete this document permanently?")) return;

  db.collection("documents").doc(docId).delete()
    .then(function() {
      // Remove from local array
      for (let i = 0; i < allDocuments.length; i++) {
        if (allDocuments[i]._id === docId) {
          allDocuments.splice(i, 1);
          break;
        }
      }
      renderDocuments();

      // Try to delete from Storage
      if (fileURL) {
        try {
          let fileRef = storage.refFromURL(fileURL);
          fileRef.delete().catch(function() {});
        } catch(e) {}
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
        let colors = ["blue", "purple", "green", "orange", "cyan"];
        let color = colors[name.length % colors.length];
        let clientId = doc.id;

        let item = document.createElement("div");
        item.className = "msg-client-item";
        item.setAttribute("data-clientid", clientId);
        item.onclick = function() {
          let all = document.querySelectorAll(".msg-client-item");
          for (let j = 0; j < all.length; j++) { all[j].classList.remove("active"); }
          item.classList.add("active");
          // Remove unread dot
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

      // Check for unread messages after loading clients
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
  activeClientId = clientId;
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

  // Mark messages as read
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
        if (msg.clientId === clientId) { messages.push(msg); }
      });

      messages.sort(function(a, b) {
        if (!a.timestamp || !b.timestamp) return 0;
        return a.timestamp.seconds - b.timestamp.seconds;
      });

      thread.innerHTML = "";

      if (messages.length === 0) {
        thread.innerHTML = '<div style="text-align: center; color: #6B7280; padding: 40px; font-size: 13px;">No messages yet. Start the conversation!</div>';
        return;
      }

      for (let i = 0; i < messages.length; i++) {
        let msg = messages[i];
        let isAdmin = msg.senderRole === "admin";
        let timeText = "";
        if (msg.timestamp) {
          let date = new Date(msg.timestamp.seconds * 1000);
          let hours = date.getHours();
          let minutes = date.getMinutes();
          let ampm = hours >= 12 ? "PM" : "AM";
          hours = hours % 12;
          if (hours === 0) hours = 12;
          if (minutes < 10) minutes = "0" + minutes;
          let months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
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
        '<div style="text-align: center; color: #EF4444; padding: 40px; font-size: 13px;">Error: ' + error.message + '</div>';
    });
}

function sendAdminMessage() {
  let input = document.getElementById("admin-msg-input");
  let text = input.value.trim();
  if (text === "" || !activeClientId) return;
  input.value = "";

  db.collection("messages").add({
    clientId: activeClientId,
    senderId: auth.currentUser ? auth.currentUser.uid : "admin",
    senderName: "Anthony Sesny",
    senderRole: "admin",
    text: text,
    readByAdmin: true,
    timestamp: firebase.firestore.FieldValue.serverTimestamp()
  }).then(function() {
    loadMessagesForClient(activeClientId);
  });
}

function filterMessageClients(query) {
  let items = document.querySelectorAll(".msg-client-item");
  let lowerQuery = query.toLowerCase();
  for (let i = 0; i < items.length; i++) {
    let name = items[i].querySelector("strong").textContent.toLowerCase();
    items[i].style.display = name.includes(lowerQuery) ? "flex" : "none";
  }
}

function handleGlobalSearch(query) {}


// ══════════════════════════════════════
//  INIT
// ══════════════════════════════════════

document.addEventListener("DOMContentLoaded", function() {
  renderForms("individual");
});

auth.onAuthStateChanged(function(user) {
  if (user) {
    loadAllClientsFromFirebase();
    loadFirebaseClients();
    loadAllDocuments();
    // Check for unread messages every 10 seconds
    setInterval(checkUnreadMessages, 10000);
  }
});

function loadAllClientsFromFirebase() {
  db.collection("clients").get()
    .then(function(snapshot) {
      clients = [];
      let colors = ["blue", "purple", "green", "orange", "cyan", "red"];

      snapshot.forEach(function(doc) {
        let d = doc.data();
        let name = (d.firstName || "Unknown") + " " + (d.lastName || "");
        clients.push({
          uid: doc.id,
          name: name,
          email: d.email || "",
          phone: d.phone || "",
          status: d.status || "pending",
          docs: d.documents || 0,
          type: d.type || "Individual",
          year: d.year || "2025",
          caseOpen: d.caseOpen !== false,
          color: colors[clients.length % colors.length],
          initials: (d.firstName || "?").charAt(0) + (d.lastName || "?").charAt(0)
        });
      });

      updateOverviewStats();

      // Recent clients on overview
      let recentList = document.getElementById("recent-clients-list");
      recentList.innerHTML = "";
      if (clients.length === 0) {
        recentList.innerHTML = '<div style="padding: 16px; text-align: center; color: #6B7280; font-size: 13px;">No clients yet.</div>';
      } else {
        let showCount = Math.min(clients.length, 5);
        for (let i = 0; i < showCount; i++) {
          let c = clients[i];
          let statusClass = "pending";
          let statusLabel = "Pending";
          if (c.status === "in-progress") { statusClass = "progress"; statusLabel = "In Progress"; }
          if (c.status === "review") { statusClass = "review"; statusLabel = "Review"; }
          if (c.status === "filed") { statusClass = "filed"; statusLabel = "Filed"; }

          let item = document.createElement("div");
          item.className = "client-mini";
          item.innerHTML =
            '<div class="client-avatar ' + c.color + '">' + c.initials + '</div>' +
            '<div class="client-mini-info"><strong>' + c.name + '</strong><span>' + c.type + ' · ' + c.docs + ' docs</span></div>' +
            '<span class="status-pill ' + statusClass + '">' + statusLabel + '</span>';
          recentList.appendChild(item);
        }
      }

      renderClients("all");
    })
    .catch(function(error) {
      document.getElementById("recent-clients-list").innerHTML =
        '<div style="padding: 16px; text-align: center; color: #EF4444; font-size: 13px;">Error: ' + error.message + '</div>';
    });
}
