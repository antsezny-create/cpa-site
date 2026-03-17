// ══════════════════════════════════════
//  DATA
// ══════════════════════════════════════

let clients = [
  { name: "Sarah Mitchell", id: "***-**-4521", status: "in-progress", docs: 5, type: "Individual", year: "2025", color: "blue", initials: "SM" },
  { name: "James & Linda Park", id: "***-**-8903", status: "review", docs: 12, type: "Joint", year: "2025", color: "purple", initials: "JP" },
  { name: "Marcus Johnson", id: "***-**-1147", status: "filed", docs: 3, type: "Individual", year: "2025", color: "green", initials: "MJ" },
  { name: "Rivera Holdings LLC", id: "**-***7782", status: "in-progress", docs: 18, type: "Business", year: "2025", color: "orange", initials: "RH" },
  { name: "Chen Family Trust", id: "**-***3390", status: "pending", docs: 0, type: "Trust", year: "2025", color: "cyan", initials: "CF" },
  { name: "Aisha Patel", id: "***-**-6654", status: "review", docs: 7, type: "Individual", year: "2025", color: "red", initials: "AP" },
  { name: "Tom & Maria Garcia", id: "***-**-2290", status: "filed", docs: 9, type: "Joint", year: "2025", color: "green", initials: "TG" },
  { name: "Nexus Digital LLC", id: "**-***5561", status: "in-progress", docs: 14, type: "Business", year: "2025", color: "blue", initials: "ND" },
  { name: "David Kim", id: "***-**-7783", status: "filed", docs: 4, type: "Individual", year: "2025", color: "purple", initials: "DK" },
  { name: "Priya Sharma", id: "***-**-9901", status: "in-progress", docs: 6, type: "Individual", year: "2025", color: "orange", initials: "PS" },
  { name: "Oakwood Properties", id: "**-***4412", status: "review", docs: 22, type: "Business", year: "2025", color: "cyan", initials: "OP" },
  { name: "Lisa Chen", id: "***-**-3345", status: "filed", docs: 5, type: "Individual", year: "2025", color: "red", initials: "LC" },
];

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
  // Hide all tabs
  let tabs = document.querySelectorAll(".dash-tab");
  for (let i = 0; i < tabs.length; i++) {
    tabs[i].style.display = "none";
  }

  // Show selected tab
  document.getElementById("tab-" + tabName).style.display = "block";

  // Update sidebar
  let btns = document.querySelectorAll(".dash-nav-btn");
  for (let i = 0; i < btns.length; i++) {
    btns[i].classList.remove("active");
    let onclick = btns[i].getAttribute("onclick");
    if (onclick && onclick.includes(tabName)) {
      btns[i].classList.add("active");
    }
  }

  // Load data for specific tabs
  if (tabName === "clients") renderClients("all");
  if (tabName === "forms") renderForms("individual");
}


// ══════════════════════════════════════
//  CLIENTS
// ══════════════════════════════════════

function renderClients(filter) {
  let tbody = document.getElementById("client-table-body");
  tbody.innerHTML = "";

  let statusLabels = {
    "pending": "Pending",
    "in-progress": "In Progress",
    "review": "Review",
    "filed": "Filed"
  };

  let statusClasses = {
    "pending": "pending",
    "in-progress": "progress",
    "review": "review",
    "filed": "filed"
  };

  for (let i = 0; i < clients.length; i++) {
    let c = clients[i];

    if (filter !== "all" && c.status !== filter) continue;

    let row = document.createElement("div");
    row.className = "client-table-row";
    row.innerHTML =
      '<div class="client-cell">' +
        '<div class="client-cell-avatar ' + c.color + '" style="background: linear-gradient(135deg, var(--' + c.color + '), var(--' + c.color + '))">' + c.initials + '</div>' +
        '<div><div class="cell-name">' + c.name + '</div><div class="cell-sub">' + c.id + '</div></div>' +
      '</div>' +
      '<span class="cell-type">' + c.type + '</span>' +
      '<span class="status-pill ' + statusClasses[c.status] + '">' + statusLabels[c.status] + '</span>' +
      '<span class="cell-docs">' + c.docs + '</span>' +
      '<span class="cell-year">' + c.year + '</span>' +
      '<button class="table-open-btn" onclick="openClient(\'' + c.name.replace(/'/g, "\\'") + '\')">Open</button>';

    tbody.appendChild(row);
  }
}

function filterClients(filter, btn) {
  // Update active button
  let btns = document.querySelectorAll(".filter-bar .filter-btn");
  for (let i = 0; i < btns.length; i++) {
    btns[i].classList.remove("active");
  }
  btn.classList.add("active");

  renderClients(filter);
}

function openClient(name) {
  alert("Opening client file for: " + name + "\n\nIn a full build, this would show their complete tax profile, uploaded documents, form assignments, and communication history.");
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
    card.innerHTML =
      '<div class="form-card-icon"><span>IRS</span></div>' +
      '<div class="form-card-info">' +
        '<strong>' + f.name + '</strong>' +
        '<span>' + f.desc + '</span>' +
      '</div>';

    grid.appendChild(card);
  }
}

function switchFormCategory(category, btn) {
  let btns = document.querySelectorAll(".form-categories .filter-btn");
  for (let i = 0; i < btns.length; i++) {
    btns[i].classList.remove("active");
  }
  btn.classList.add("active");

  renderForms(category);
}


// ══════════════════════════════════════
//  FORM EDITOR
// ══════════════════════════════════════

let formValues = {};

function openFormEditor(formId) {
  formValues = {};

  // Find the form info
  let formInfo = null;
  let allCategories = Object.keys(formLibrary);
  for (let c = 0; c < allCategories.length; c++) {
    let forms = formLibrary[allCategories[c]];
    for (let f = 0; f < forms.length; f++) {
      if (forms[f].id === formId) {
        formInfo = forms[f];
        break;
      }
    }
    if (formInfo) break;
  }

  if (!formInfo) return;

  // Switch to editor tab
  let tabs = document.querySelectorAll(".dash-tab");
  for (let i = 0; i < tabs.length; i++) {
    tabs[i].style.display = "none";
  }
  document.getElementById("tab-form-editor").style.display = "block";

  document.getElementById("editor-form-title").textContent = formInfo.name;
  document.getElementById("editor-form-desc").textContent = formInfo.desc;

  let content = document.getElementById("form-editor-content");

  // Build 1040 editor
  if (formId === "1040") {
    content.innerHTML = build1040Editor();
  } else {
    // Generic placeholder for other forms
    content.innerHTML =
      '<div class="form-placeholder">' +
        '<div class="form-placeholder-icon"><span>IRS</span></div>' +
        '<h2>' + formInfo.name + '</h2>' +
        '<p>' + formInfo.desc + '</p>' +
        '<p style="margin-top: 24px; color: var(--text-dim);">This form is ready for data entry. In a full build,<br>each form will have its own complete field layout<br>matching the official IRS specification.</p>' +
        '<button class="primary-btn" style="margin-top: 20px;" onclick="alert(\'Form editor coming soon!\')">Begin Data Entry</button>' +
      '</div>';
  }

  // Remove active from sidebar
  let btns = document.querySelectorAll(".dash-nav-btn");
  for (let i = 0; i < btns.length; i++) {
    btns[i].classList.remove("active");
  }
}

function build1040Editor() {
  let html = '';

  // Header
  html += '<div class="form-editor-top">';
  html += '  <div class="form-editor-top-left">';
  html += '    <span>Department of the Treasury — Internal Revenue Service</span>';
  html += '    <h2>Form 1040</h2>';
  html += '    <p>U.S. Individual Income Tax Return</p>';
  html += '  </div>';
  html += '  <div class="form-editor-top-right">';
  html += '    <span>Tax Year</span>';
  html += '    <strong>2025</strong>';
  html += '  </div>';
  html += '</div>';

  // Personal Info
  html += '<div class="editor-section">';
  html += '  <div class="editor-section-title">Personal Information</div>';
  html += '  <div class="editor-row">';
  html += '    <div class="editor-field" style="flex: 1.5;">';
  html += '      <label>First name and middle initial</label>';
  html += '      <input type="text" id="f-firstName">';
  html += '    </div>';
  html += '    <div class="editor-field" style="flex: 1;">';
  html += '      <label>Last name</label>';
  html += '      <input type="text" id="f-lastName">';
  html += '    </div>';
  html += '  </div>';
  html += '  <div class="editor-row">';
  html += '    <div class="editor-field" style="flex: 1;">';
  html += '      <label>Social security number</label>';
  html += '      <input type="text" id="f-ssn" placeholder="XXX-XX-XXXX">';
  html += '    </div>';
  html += '    <div class="editor-field" style="flex: 1;">';
  html += '      <label>Filing status</label>';
  html += '      <select id="f-filingStatus">';
  html += '        <option value="">Select...</option>';
  html += '        <option>Single</option>';
  html += '        <option>Married filing jointly</option>';
  html += '        <option>Married filing separately</option>';
  html += '        <option>Head of household</option>';
  html += '        <option>Qualifying surviving spouse</option>';
  html += '      </select>';
  html += '    </div>';
  html += '  </div>';
  html += '  <div class="editor-row">';
  html += '    <div class="editor-field" style="flex: 1;">';
  html += '      <label>Home address (number, street, apt.)</label>';
  html += '      <input type="text" id="f-address">';
  html += '    </div>';
  html += '  </div>';
  html += '  <div class="editor-row">';
  html += '    <div class="editor-field" style="flex: 1.5;">';
  html += '      <label>City, town, or post office</label>';
  html += '      <input type="text" id="f-city">';
  html += '    </div>';
  html += '    <div class="editor-field" style="flex: 0.5;">';
  html += '      <label>State</label>';
  html += '      <input type="text" id="f-state">';
  html += '    </div>';
  html += '    <div class="editor-field" style="flex: 0.5;">';
  html += '      <label>ZIP code</label>';
  html += '      <input type="text" id="f-zip">';
  html += '    </div>';
  html += '  </div>';
  html += '</div>';

  // Income
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

  html += '<div class="editor-section">';
  html += '  <div class="editor-section-title">Income</div>';

  for (let i = 0; i < incomeLines.length; i++) {
    let line = incomeLines[i];
    html += '  <div class="income-line">';
    html += '    <label>' + line.num + '  ' + line.label + '</label>';
    html += '    <div class="income-input-wrap">';
    html += '      <span>$</span>';
    html += '      <input type="text" class="income-input" id="f-' + line.key + '" oninput="calculateTotal()">';
    html += '    </div>';
    html += '  </div>';
  }

  // Total line
  html += '  <div class="income-line total">';
  html += '    <label>9  Total income (add lines 1 through 8)</label>';
  html += '    <div class="income-input-wrap">';
  html += '      <span>$</span>';
  html += '      <input type="text" class="income-input total-field" id="f-line9" readonly>';
  html += '    </div>';
  html += '  </div>';

  html += '</div>';

  return html;
}

function calculateTotal() {
  let keys = ["line1", "line2b", "line3b", "line4b", "line5b", "line6b", "line7", "line8"];
  let total = 0;

  for (let i = 0; i < keys.length; i++) {
    let input = document.getElementById("f-" + keys[i]);
    if (input) {
      let val = parseFloat(input.value) || 0;
      total += val;
    }
  }

  let totalField = document.getElementById("f-line9");
  if (totalField) {
    totalField.value = total.toFixed(2);
  }
}


// ══════════════════════════════════════
//  DOCUMENT REVIEW
// ══════════════════════════════════════

function reviewDoc(button, action) {
  let item = button.closest(".doc-review-item");
  let actionsDiv = item.querySelector(".doc-actions");

  if (action === "approved") {
    actionsDiv.innerHTML = '<span class="doc-status-badge approved">Approved ✓</span>';
    item.querySelector(".doc-icon").className = "doc-icon approved-icon";
    item.querySelector(".doc-icon").textContent = "✓";
  } else {
    actionsDiv.innerHTML = '<span class="doc-status-badge flagged">Flagged !</span>';
    item.querySelector(".doc-icon").className = "doc-icon flagged-icon";
    item.querySelector(".doc-icon").textContent = "!";
  }
}


// ══════════════════════════════════════
//  GLOBAL SEARCH
// ══════════════════════════════════════

function handleGlobalSearch(query) {
  if (query.length < 2) return;

  // Check if it matches a client name
  let lowerQuery = query.toLowerCase();
  for (let i = 0; i < clients.length; i++) {
    if (clients[i].name.toLowerCase().includes(lowerQuery)) {
      // Could auto-navigate to clients tab
      return;
    }
  }
}


// ══════════════════════════════════════
//  MESSAGES (Firebase Real-Time)
// ══════════════════════════════════════

let activeClientId = null;
let activeClientName = "";
let messageUnsubscribe = null;

// Load client list for messages from Firestore
function loadFirebaseClients() {
  db.collection("clients").orderBy("createdAt", "desc").onSnapshot(function(snapshot) {
    let list = document.getElementById("msg-client-list");
    if (!list) return;
    list.innerHTML = "";

    if (snapshot.empty) {
      list.innerHTML = '<div style="padding: 20px; text-align: center; color: #6B7280; font-size: 13px;">No clients yet. Clients will appear here when they create accounts.</div>';
      return;
    }

    snapshot.forEach(function(doc) {
      let client = doc.data();
      let name = client.firstName + " " + client.lastName;
      let initials = client.firstName.charAt(0) + client.lastName.charAt(0);
      let colors = ["blue", "purple", "green", "orange", "cyan"];
      let color = colors[Math.abs(name.length) % colors.length];

      let item = document.createElement("div");
      item.className = "msg-client-item";
      item.onclick = function() { openFirebaseConversation(doc.id, name, initials, color, client.type || "Individual"); };
      item.innerHTML =
        '<div class="msg-client-avatar ' + color + '">' + initials + '</div>' +
        '<div class="msg-client-info">' +
          '<div class="msg-client-top">' +
            '<strong>' + name + '</strong>' +
          '</div>' +
          '<p class="msg-preview">' + (client.type || "Individual") + ' · ' + client.email + '</p>' +
        '</div>';

      list.appendChild(item);
    });
  });
}

function openFirebaseConversation(clientId, name, initials, color, type) {
  activeClientId = clientId;
  activeClientName = name;

  // Update active state
  let items = document.querySelectorAll(".msg-client-item");
  for (let i = 0; i < items.length; i++) { items[i].classList.remove("active"); }
  event.currentTarget.classList.add("active");

  // Update header
  document.getElementById("msg-conv-header").innerHTML =
    '<div class="msg-conv-avatar ' + color + '">' + initials + '</div>' +
    '<div><strong>' + name + '</strong><span>' + type + ' · 2025 Return</span></div>';

  // Update input placeholder
  let firstName = name.split(" ")[0];
  document.getElementById("admin-msg-input").placeholder = "Type a message to " + firstName + "...";

  // Unsubscribe from previous listener
  if (messageUnsubscribe) messageUnsubscribe();

  // Listen for messages with this client in real time
  let thread = document.getElementById("admin-msg-thread");
  messageUnsubscribe = db.collection("messages")
    .where("clientId", "==", clientId)
    .orderBy("timestamp", "asc")
    .onSnapshot(function(snapshot) {
      thread.innerHTML = "";

      snapshot.forEach(function(doc) {
        let msg = doc.data();
        let isAdmin = msg.senderRole === "admin";

        let timeText = "";
        if (msg.timestamp) {
          let date = msg.timestamp.toDate();
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
          '<div class="msg-bubble-meta"><strong>' + msg.senderName + '</strong> <span>' + timeText + '</span></div>' +
          '<div class="msg-bubble-text">' + msg.text + '</div>';

        thread.appendChild(bubble);
      });

      thread.scrollTop = thread.scrollHeight;

      if (snapshot.empty) {
        thread.innerHTML = '<div style="text-align: center; color: #6B7280; padding: 40px; font-size: 13px;">No messages yet. Start the conversation!</div>';
      }
    }, function(error) {
      console.log("Messages error:", error);
      thread.innerHTML = '<div style="text-align: center; color: #6B7280; padding: 40px; font-size: 13px;">Could not load messages. You may need to create a Firestore index — check the browser console for a link.</div>';
    });
}

function sendAdminMessage() {
  let input = document.getElementById("admin-msg-input");
  let text = input.value.trim();
  if (text === "" || !activeClientId) return;

  db.collection("messages").add({
    clientId: activeClientId,
    senderId: auth.currentUser.uid,
    senderName: "Anthony Sesny",
    senderRole: "admin",
    text: text,
    timestamp: firebase.firestore.FieldValue.serverTimestamp()
  });

  input.value = "";
}

function filterMessageClients(query) {
  let items = document.querySelectorAll(".msg-client-item");
  let lowerQuery = query.toLowerCase();

  for (let i = 0; i < items.length; i++) {
    let name = items[i].querySelector("strong").textContent.toLowerCase();
    if (name.includes(lowerQuery)) {
      items[i].style.display = "flex";
    } else {
      items[i].style.display = "none";
    }
  }
}

function updateMessageBadge() {
  let unreadBadges = document.querySelectorAll(".msg-unread");
  let total = unreadBadges.length;
  let badge = document.getElementById("msg-badge");
  if (badge) {
    badge.textContent = total;
    if (total === 0) { badge.style.display = "none"; }
  }
}


// ══════════════════════════════════════
//  DEBUG / TEST
// ══════════════════════════════════════

function testFirebase() {
  let results = "FIREBASE TEST RESULTS:\n\n";

  // Test 1: Auth
  let user = auth.currentUser;
  if (user) {
    results += "✓ Logged in as: " + user.email + "\n";
    results += "  UID: " + user.uid + "\n\n";
  } else {
    results += "✗ NOT logged in\n\n";
    alert(results);
    return;
  }

  // Test 2: Read clients
  db.collection("clients").get()
    .then(function(snapshot) {
      results += "✓ Clients collection: " + snapshot.size + " documents found\n";
      snapshot.forEach(function(doc) {
        let d = doc.data();
        results += "  - " + d.firstName + " " + d.lastName + " (ID: " + doc.id + ")\n";
      });
      results += "\n";

      // Test 3: Read messages
      return db.collection("messages").get();
    })
    .then(function(snapshot) {
      results += "✓ Messages collection: " + snapshot.size + " documents found\n";
      snapshot.forEach(function(doc) {
        let d = doc.data();
        results += "  - From: " + d.senderName + " | Text: " + d.text.substring(0, 40) + "...\n";
        results += "    clientId: " + d.clientId + "\n";
      });
      results += "\n";

      // Test 4: Read admins
      return db.collection("admins").get();
    })
    .then(function(snapshot) {
      results += "✓ Admins collection: " + snapshot.size + " documents found\n";
      alert(results);
    })
    .catch(function(error) {
      results += "✗ ERROR: " + error.message + "\n";
      alert(results);
    });
}


// ══════════════════════════════════════
//  INIT
// ══════════════════════════════════════

document.addEventListener("DOMContentLoaded", function() {
  renderClients("all");
  renderForms("individual");
});

// Wait for Firebase auth, then load real client data
auth.onAuthStateChanged(function(user) {
  if (user) {
    loadFirebaseClients();
    loadFirebaseDocuments();
  }
  // Don't redirect if not logged in - let them stay on the page
});

// Load real documents for review
function loadFirebaseDocuments() {
  db.collection("documents").orderBy("uploadedAt", "desc").onSnapshot(function(snapshot) {
    // We could update the documents tab here in the future
  });
}
