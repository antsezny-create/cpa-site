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
//  MESSAGES
// ══════════════════════════════════════

let conversations = {
  sarah: {
    name: "Sarah Mitchell",
    type: "Individual · 2025 Return",
    avatar: "SM",
    color: "blue",
    messages: [
      { from: "client", name: "Sarah Mitchell", time: "Mar 4, 9:00 AM", text: "Hi Anthony, I just uploaded my W-2. Should I upload bank statements too or just the 1099-INT?" },
      { from: "you", name: "You", time: "Mar 4, 9:15 AM", text: "Just the 1099-INT is fine — your bank should have that available for download. I don't need the full bank statements unless you have deductible expenses." },
      { from: "client", name: "Sarah Mitchell", time: "Mar 4, 11:22 AM", text: "Hi Anthony! I'll get the 1098 from my lender's website this week. For the donations, I have receipts from two organizations — I'll scan and upload them. Should I combine them into one PDF?" },
      { from: "you", name: "You", time: "Mar 4, 12:15 PM", text: "Either way works — separate files or one combined PDF is fine. No rush, just whenever you get to it. I'll keep working on the rest of your return in the meantime." },
      { from: "client", name: "Sarah Mitchell", time: "Today, 2:15 PM", text: "Perfect, I just uploaded the 1098. Still working on getting the donation receipts together. Should have them by end of week!" },
    ]
  },
  james: {
    name: "James & Linda Park",
    type: "Joint · 2025 Return",
    avatar: "JP",
    color: "purple",
    messages: [
      { from: "client", name: "James Park", time: "Mar 6, 3:30 PM", text: "Anthony, we got a K-1 from our rental property partnership. Can you explain the K-1 distribution? We're not sure what box 1 vs box 2 means." },
      { from: "you", name: "You", time: "Mar 6, 4:00 PM", text: "Sure! Box 1 is your share of ordinary business income — that's the profit from the partnership. Box 2 is net rental real estate income. Both flow to your 1040 through Schedule E. Just upload it and I'll handle the rest." },
      { from: "client", name: "James Park", time: "Yesterday, 10:15 AM", text: "Can you explain the K-1 distribution? We got multiple ones and want to make sure they're all accounted for." },
    ]
  },
  aisha: {
    name: "Aisha Patel",
    type: "Individual · 2025 Return",
    avatar: "AP",
    color: "green",
    messages: [
      { from: "you", name: "You", time: "Mar 10, 11:00 AM", text: "Hi Aisha, I noticed your W-2 scan is a bit blurry — can you re-upload a clearer version? I want to make sure I'm reading the numbers correctly." },
      { from: "client", name: "Aisha Patel", time: "Mar 11, 9:30 AM", text: "Oh sorry about that! I'll re-scan it today and upload a better copy." },
      { from: "client", name: "Aisha Patel", time: "Mar 12, 2:00 PM", text: "Thanks Anthony, that makes sense. I just uploaded the clearer version." },
    ]
  },
  rivera: {
    name: "Rivera Holdings LLC",
    type: "Business · 2025 Return",
    avatar: "RH",
    color: "orange",
    messages: [
      { from: "client", name: "Maria Rivera", time: "Mar 8, 1:00 PM", text: "Hi Anthony, I'm uploading all the Q4 receipts now. There's about 45 of them — I put them all into one ZIP file. Is that okay?" },
      { from: "you", name: "You", time: "Mar 8, 1:30 PM", text: "That works perfectly. One ZIP is much easier to manage than 45 separate files. I'll sort through them on my end." },
      { from: "client", name: "Maria Rivera", time: "Mar 10, 10:00 AM", text: "I've uploaded all the Q4 receipts. Let me know if anything is missing." },
    ]
  },
  marcus: {
    name: "Marcus Johnson",
    type: "Individual · 2025 Return",
    avatar: "MJ",
    color: "cyan",
    messages: [
      { from: "you", name: "You", time: "Mar 5, 4:00 PM", text: "Great news Marcus — your return is ready to file. Your refund is looking like $1,247. I'll e-file it today unless you want to review anything first." },
      { from: "client", name: "Marcus Johnson", time: "Mar 5, 4:30 PM", text: "That sounds great! Go ahead and file it. Thanks for being so quick!" },
      { from: "you", name: "You", time: "Mar 5, 5:00 PM", text: "Done! Filed and accepted. You should see your refund in 10-21 days. I'll send you a copy of the return for your records." },
      { from: "client", name: "Marcus Johnson", time: "Mar 8, 9:00 AM", text: "Got it, thanks for filing so quickly!" },
    ]
  }
};

let activeConversation = "sarah";

function openConversation(clientId) {
  activeConversation = clientId;
  let conv = conversations[clientId];
  if (!conv) return;

  // Update active state in client list
  let items = document.querySelectorAll(".msg-client-item");
  for (let i = 0; i < items.length; i++) {
    items[i].classList.remove("active");
  }
  event.currentTarget.classList.add("active");

  // Remove unread badge
  let badge = event.currentTarget.querySelector(".msg-unread");
  if (badge) badge.remove();

  // Update header
  document.getElementById("msg-conv-header").innerHTML =
    '<div class="msg-conv-avatar ' + conv.color + '">' + conv.avatar + '</div>' +
    '<div><strong>' + conv.name + '</strong><span>' + conv.type + '</span></div>';

  // Render messages
  let thread = document.getElementById("admin-msg-thread");
  thread.innerHTML = "";

  for (let i = 0; i < conv.messages.length; i++) {
    let msg = conv.messages[i];
    let bubble = document.createElement("div");
    bubble.className = "msg-bubble " + (msg.from === "you" ? "sent" : "received");
    bubble.innerHTML =
      '<div class="msg-bubble-meta"><strong>' + msg.name + '</strong> <span>' + msg.time + '</span></div>' +
      '<div class="msg-bubble-text">' + msg.text + '</div>';
    thread.appendChild(bubble);
  }

  // Scroll to bottom
  thread.scrollTop = thread.scrollHeight;

  // Update input placeholder
  let firstName = conv.name.split(" ")[0];
  document.getElementById("admin-msg-input").placeholder = "Type a message to " + firstName + "...";

  // Update badge count
  updateMessageBadge();
}

function sendAdminMessage() {
  let input = document.getElementById("admin-msg-input");
  let text = input.value.trim();
  if (text === "") return;

  let now = new Date();
  let hours = now.getHours();
  let minutes = now.getMinutes();
  let ampm = hours >= 12 ? "PM" : "AM";
  hours = hours % 12;
  if (hours === 0) hours = 12;
  if (minutes < 10) minutes = "0" + minutes;
  let timeText = "Today, " + hours + ":" + minutes + " " + ampm;

  // Add to conversation data
  if (conversations[activeConversation]) {
    conversations[activeConversation].messages.push({
      from: "you",
      name: "You",
      time: timeText,
      text: text
    });
  }

  // Add to thread
  let thread = document.getElementById("admin-msg-thread");
  let bubble = document.createElement("div");
  bubble.className = "msg-bubble sent";
  bubble.innerHTML =
    '<div class="msg-bubble-meta"><strong>You</strong> <span>' + timeText + '</span></div>' +
    '<div class="msg-bubble-text">' + text + '</div>';
  thread.appendChild(bubble);

  input.value = "";
  thread.scrollTop = thread.scrollHeight;
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
    if (total === 0) {
      badge.style.display = "none";
    }
  }
}


// ══════════════════════════════════════
//  INIT
// ══════════════════════════════════════

// Load the clients tab data when page loads (in case someone navigates directly)
document.addEventListener("DOMContentLoaded", function() {
  // Pre-render clients so it's ready
  renderClients("all");
  renderForms("individual");
});
