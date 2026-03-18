// ══════════════════════════════════════
//  CHART OF ACCOUNTS — Master List
// ══════════════════════════════════════

const MASTER_COA = [
  // ASSETS
  { number:"100", name:"Cash and Cash Equivalents",    type:"asset",   subType:"current_asset",    normalBalance:"debit",  isActive:true },
  { number:"110", name:"Accounts Receivable",          type:"asset",   subType:"current_asset",    normalBalance:"debit",  isActive:true },
  { number:"120", name:"Inventory",                    type:"asset",   subType:"current_asset",    normalBalance:"debit",  isActive:true },
  { number:"130", name:"Prepaid Expenses",             type:"asset",   subType:"current_asset",    normalBalance:"debit",  isActive:true },
  { number:"140", name:"Other Current Assets",         type:"asset",   subType:"current_asset",    normalBalance:"debit",  isActive:true },
  { number:"150", name:"Property, Plant & Equipment",  type:"asset",   subType:"fixed_asset",      normalBalance:"debit",  isActive:true },
  { number:"160", name:"Accumulated Depreciation",     type:"asset",   subType:"contra_asset",     normalBalance:"credit", isActive:true },
  { number:"170", name:"Intangible Assets",            type:"asset",   subType:"other_asset",      normalBalance:"debit",  isActive:true },
  { number:"180", name:"Other Long-Term Assets",       type:"asset",   subType:"other_asset",      normalBalance:"debit",  isActive:true },
  // LIABILITIES
  { number:"200", name:"Accounts Payable",             type:"liability", subType:"current_liability",  normalBalance:"credit", isActive:true },
  { number:"210", name:"Accrued Liabilities",          type:"liability", subType:"current_liability",  normalBalance:"credit", isActive:true },
  { number:"220", name:"Notes Payable - Current",      type:"liability", subType:"current_liability",  normalBalance:"credit", isActive:true },
  { number:"230", name:"Deferred Revenue",             type:"liability", subType:"current_liability",  normalBalance:"credit", isActive:true },
  { number:"240", name:"Other Current Liabilities",    type:"liability", subType:"current_liability",  normalBalance:"credit", isActive:true },
  { number:"250", name:"Notes Payable - Long Term",    type:"liability", subType:"long_term_liability", normalBalance:"credit", isActive:true },
  { number:"260", name:"Other Long-Term Liabilities",  type:"liability", subType:"long_term_liability", normalBalance:"credit", isActive:true },
  // EQUITY
  { number:"300", name:"Common Stock",                 type:"equity",  subType:"paid_in_capital",  normalBalance:"credit", isActive:true },
  { number:"310", name:"Additional Paid-In Capital",   type:"equity",  subType:"paid_in_capital",  normalBalance:"credit", isActive:true },
  { number:"320", name:"Retained Earnings",            type:"equity",  subType:"retained_earnings",normalBalance:"credit", isActive:true },
  { number:"330", name:"Dividends / Distributions",    type:"equity",  subType:"distributions",    normalBalance:"debit",  isActive:true },
  { number:"340", name:"Treasury Stock",               type:"equity",  subType:"contra_equity",    normalBalance:"debit",  isActive:true },
  // REVENUE
  { number:"400", name:"Revenue / Sales",              type:"revenue", subType:"operating_revenue",normalBalance:"credit", isActive:true },
  { number:"410", name:"Service Revenue",              type:"revenue", subType:"operating_revenue",normalBalance:"credit", isActive:true },
  { number:"420", name:"Other Income",                 type:"revenue", subType:"other_revenue",    normalBalance:"credit", isActive:true },
  { number:"430", name:"Interest Income",              type:"revenue", subType:"other_revenue",    normalBalance:"credit", isActive:true },
  // COGS
  { number:"500", name:"Cost of Goods Sold",           type:"cogs",    subType:"cogs",             normalBalance:"debit",  isActive:true },
  { number:"510", name:"Direct Labor",                 type:"cogs",    subType:"cogs",             normalBalance:"debit",  isActive:true },
  { number:"520", name:"Manufacturing Overhead",       type:"cogs",    subType:"cogs",             normalBalance:"debit",  isActive:true },
  // OPERATING EXPENSES
  { number:"600", name:"Salaries & Wages",             type:"expense", subType:"operating_expense",normalBalance:"debit",  isActive:true },
  { number:"610", name:"Rent Expense",                 type:"expense", subType:"operating_expense",normalBalance:"debit",  isActive:true },
  { number:"620", name:"Utilities",                    type:"expense", subType:"operating_expense",normalBalance:"debit",  isActive:true },
  { number:"630", name:"Insurance",                    type:"expense", subType:"operating_expense",normalBalance:"debit",  isActive:true },
  { number:"640", name:"Depreciation Expense",         type:"expense", subType:"operating_expense",normalBalance:"debit",  isActive:true },
  { number:"650", name:"Amortization Expense",         type:"expense", subType:"operating_expense",normalBalance:"debit",  isActive:true },
  { number:"660", name:"Office Supplies",              type:"expense", subType:"operating_expense",normalBalance:"debit",  isActive:true },
  { number:"670", name:"Marketing & Advertising",      type:"expense", subType:"operating_expense",normalBalance:"debit",  isActive:true },
  { number:"680", name:"Professional Fees",            type:"expense", subType:"operating_expense",normalBalance:"debit",  isActive:true },
  { number:"690", name:"Other Operating Expenses",     type:"expense", subType:"operating_expense",normalBalance:"debit",  isActive:true },
  // OTHER EXPENSES
  { number:"700", name:"Interest Expense",             type:"expense", subType:"other_expense",    normalBalance:"debit",  isActive:true },
  { number:"710", name:"Loss on Sale of Assets",       type:"expense", subType:"other_expense",    normalBalance:"debit",  isActive:true },
  { number:"720", name:"Other Non-Operating Expenses", type:"expense", subType:"other_expense",    normalBalance:"debit",  isActive:true },
  // TAX
  { number:"800", name:"Income Tax Expense",           type:"tax",     subType:"tax",              normalBalance:"debit",  isActive:true },
];

// In-memory cache of COA from Firestore
let chartOfAccounts = [];
let coaLoaded = false;

// ══════════════════════════════════════
//  SEED / LOAD CHART OF ACCOUNTS
// ══════════════════════════════════════

async function initChartOfAccounts() {
  let snap = await db.collection("chartOfAccounts").get();
  if (snap.empty) {
    // First time — seed the master list
    let batch = db.batch();
    MASTER_COA.forEach(acct => {
      let ref = db.collection("chartOfAccounts").doc();
      batch.set(ref, { ...acct, createdAt: firebase.firestore.FieldValue.serverTimestamp() });
    });
    await batch.commit();
    snap = await db.collection("chartOfAccounts").get();
  }
  chartOfAccounts = [];
  snap.forEach(doc => { let d = doc.data(); d._id = doc.id; chartOfAccounts.push(d); });
  chartOfAccounts.sort((a,b) => parseInt(a.number) - parseInt(b.number));
  coaLoaded = true;
}

// ══════════════════════════════════════
//  FINANCIALS TAB — Main Entry Point
// ══════════════════════════════════════

let finClientId   = null;
let finClientName = "";
let finPeriodId   = null;
let finPeriodLabel= "";

function loadFinancialsTab() {
  if (!coaLoaded) initChartOfAccounts().then(() => renderFinancialsHome());
  else renderFinancialsHome();
}

function renderFinancialsHome() {
  let main = document.getElementById("financials-main");
  main.innerHTML = "";

  // Client selector
  let html = `
    <div class="fin-home">
      <div class="fin-section-header">
        <h2>Select a Client</h2>
        <p>Choose a client to manage their financial statements and journal entries.</p>
      </div>
      <div class="fin-client-grid" id="fin-client-grid">`;

  if (clients.length === 0) {
    html += `<div class="fin-empty">No clients yet.</div>`;
  } else {
    clients.forEach(c => {
      html += `
        <div class="fin-client-card" onclick="selectFinClient('${c.uid}','${c.name.replace(/'/g,"\\'")}')">
          <div class="fin-client-avatar ${c.color}">${c.initials}</div>
          <div class="fin-client-info">
            <strong>${c.name}</strong>
            <span>${c.type} · ${c.year}</span>
          </div>
          <span class="fin-arrow">→</span>
        </div>`;
    });
  }

  html += `</div>

      <div class="fin-section-header" style="margin-top:40px;">
        <h2>Chart of Accounts</h2>
        <div style="display:flex;gap:8px;">
          <button class="ghost-btn" onclick="showCOA()">View / Edit</button>
          <button class="primary-btn" onclick="openAddAccountModal()">+ Add Account</button>
        </div>
      </div>
    </div>`;

  main.innerHTML = html;
}

// ══════════════════════════════════════
//  CLIENT FINANCIALS VIEW
// ══════════════════════════════════════

function selectFinClient(uid, name) {
  finClientId   = uid;
  finClientName = name;

  let main = document.getElementById("financials-main");
  main.innerHTML = `
    <div class="fin-breadcrumb">
      <span class="breadcrumb-link" onclick="renderFinancialsHome()">Financials</span>
      <span class="breadcrumb-sep">›</span>
      <span class="breadcrumb-current">${name}</span>
    </div>

    <div class="fin-client-toolbar">
      <div class="fin-toolbar-left">
        <h2>${name}</h2>
        <p>Manage periods, journal entries, and financial statements</p>
      </div>
      <button class="primary-btn" onclick="openNewPeriodModal()">+ New Period</button>
    </div>

    <div id="fin-periods-list">
      <div style="padding:24px;color:var(--text-dim);font-size:13px;">Loading periods...</div>
    </div>`;

  loadClientPeriods(uid);
}

function loadClientPeriods(clientId) {
  db.collection("clientLedger").doc(clientId)
    .collection("periods").orderBy("createdAt","desc").get()
    .then(snap => {
      let list = document.getElementById("fin-periods-list");
      if (!list) return;
      if (snap.empty) {
        list.innerHTML = `<div class="fin-empty">No periods yet. Click "+ New Period" to get started.</div>`;
        return;
      }
      list.innerHTML = "";
      snap.forEach(doc => {
        let p = doc.data(); p._id = doc.id;
        let statusClass = p.status === "finalized" ? "filed" : "progress";
        let statusLabel = p.status === "finalized" ? "Finalized" : "Draft";
        let item = document.createElement("div");
        item.className = "fin-period-row";
        item.innerHTML = `
          <div class="fin-period-info">
            <strong>${p.periodLabel || p.period}</strong>
            <span>${p.periodType} · ${p.companyName || finClientName}</span>
          </div>
          <span class="status-pill ${statusClass}">${statusLabel}</span>
          <div class="fin-period-actions">
            <button class="ghost-btn" onclick="openAccountScopeModal('${doc.id}','${(p.periodLabel||p.period).replace(/'/g,"\\'")}')">Accounts</button>
            <button class="ghost-btn" onclick="openJournalEntries('${doc.id}','${(p.periodLabel||p.period).replace(/'/g,"\\'")}')">Journal Entries</button>
            <button class="ghost-btn" onclick="openStatements('${doc.id}','${(p.periodLabel||p.period).replace(/'/g,"\\'")}')">View Statements</button>
            ${p.status !== "finalized"
              ? `<button class="primary-btn" onclick="finalizePeriod('${doc.id}')">Finalize</button>`
              : `<button class="ghost-btn" onclick="publishStatements('${doc.id}')">Publish to Portal</button>`}
          </div>`;
        list.appendChild(item);
      });
    }).catch(() => {
      // periods subcollection may need no-index fallback
      db.collection("clientLedger").doc(clientId)
        .collection("periods").get().then(snap => {
          let list = document.getElementById("fin-periods-list");
          if (!list) return;
          if (snap.empty) { list.innerHTML = `<div class="fin-empty">No periods yet.</div>`; return; }
          list.innerHTML = "";
          snap.forEach(doc => {
            let p = doc.data(); p._id = doc.id;
            let statusClass = p.status === "finalized" ? "filed" : "progress";
            let item = document.createElement("div");
            item.className = "fin-period-row";
            item.innerHTML = `
              <div class="fin-period-info"><strong>${p.periodLabel||p.period}</strong><span>${p.periodType}</span></div>
              <span class="status-pill ${statusClass}">${p.status==="finalized"?"Finalized":"Draft"}</span>
              <div class="fin-period-actions">
                <button class="ghost-btn" onclick="openJournalEntries('${doc.id}','${(p.periodLabel||p.period).replace(/'/g,"\\'")}')">Journal Entries</button>
                <button class="ghost-btn" onclick="openStatements('${doc.id}','${(p.periodLabel||p.period).replace(/'/g,"\\'")}')">View Statements</button>
                ${p.status!=="finalized"?`<button class="primary-btn" onclick="finalizePeriod('${doc.id}')">Finalize</button>`:`<button class="ghost-btn" onclick="publishStatements('${doc.id}')">Publish to Portal</button>`}
              </div>`;
            list.appendChild(item);
          });
        });
    });
}

// ══════════════════════════════════════
//  NEW PERIOD MODAL
// ══════════════════════════════════════

function openNewPeriodModal() {
  document.getElementById("new-period-modal").style.display = "flex";
  document.getElementById("np-company").value = finClientName;
  document.getElementById("np-year").value = new Date().getFullYear() - 1;
  updatePeriodLabel();
}

function closeNewPeriodModal() {
  document.getElementById("new-period-modal").style.display = "none";
}

function updatePeriodLabel() {
  let type  = document.getElementById("np-type").value;
  let year  = document.getElementById("np-year").value;
  let month = document.getElementById("np-month").value;
  let q     = document.getElementById("np-quarter").value;
  let label = "";
  let period = "";

  if (type === "annual") {
    label  = "FY " + year;
    period = year;
    document.getElementById("np-month-row").style.display   = "none";
    document.getElementById("np-quarter-row").style.display = "none";
  } else if (type === "quarterly") {
    label  = "Q" + q + " " + year;
    period = year + "-Q" + q;
    document.getElementById("np-month-row").style.display   = "none";
    document.getElementById("np-quarter-row").style.display = "flex";
  } else {
    let months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
    label  = months[parseInt(month)-1] + " " + year;
    period = year + "-" + month.padStart(2,"0");
    document.getElementById("np-month-row").style.display   = "flex";
    document.getElementById("np-quarter-row").style.display = "none";
  }

  let preview = document.getElementById("np-label-preview");
  if (preview) preview.textContent = label;
  document.getElementById("np-label-hidden").value  = label;
  document.getElementById("np-period-hidden").value = period;
}

function saveNewPeriod() {
  let company = document.getElementById("np-company").value.trim();
  let type    = document.getElementById("np-type").value;
  let label   = document.getElementById("np-label-hidden").value;
  let period  = document.getElementById("np-period-hidden").value;

  if (!company) { alert("Please enter a company name."); return; }
  if (!label)   { alert("Please complete the period selection."); return; }

  db.collection("clientLedger").doc(finClientId)
    .collection("periods").add({
      clientId:    finClientId,
      companyName: company,
      periodType:  type,
      periodLabel: label,
      period:      period,
      status:      "draft",
      createdAt:   firebase.firestore.FieldValue.serverTimestamp()
    }).then(() => {
      closeNewPeriodModal();
      loadClientPeriods(finClientId);
    }).catch(e => alert("Failed: " + e.message));
}

// ══════════════════════════════════════
//  JOURNAL ENTRIES
// ══════════════════════════════════════

let currentPeriodId    = null;
let currentPeriodLabel = "";
let jeLines = [];

function openJournalEntries(periodId, periodLabel) {
  currentPeriodId    = periodId;
  currentPeriodLabel = periodLabel;

  let main = document.getElementById("financials-main");
  main.innerHTML = `
    <div class="fin-breadcrumb">
      <span class="breadcrumb-link" onclick="renderFinancialsHome()">Financials</span>
      <span class="breadcrumb-sep">›</span>
      <span class="breadcrumb-link" onclick="selectFinClient('${finClientId}','${finClientName.replace(/'/g,"\\'")}')">
        ${finClientName}
      </span>
      <span class="breadcrumb-sep">›</span>
      <span class="breadcrumb-current">${periodLabel} · Journal Entries</span>
    </div>

    <div class="fin-client-toolbar">
      <div>
        <h2>Journal Entries</h2>
        <p>${finClientName} · ${periodLabel}</p>
      </div>
      <button class="primary-btn" onclick="openNewJEForm()">+ New Entry</button>
    </div>

    <div id="je-new-form" style="display:none;" class="dash-card" style="margin-bottom:20px;"></div>

    <div class="dash-card" style="padding:0;overflow:hidden;">
      <div class="je-list-header">
        <span>Date</span><span>Description</span><span>Debits</span><span>Credits</span><span>Status</span><span></span>
      </div>
      <div id="je-list">
        <div style="padding:24px;text-align:center;color:var(--text-dim);font-size:13px;">Loading entries...</div>
      </div>
    </div>`;

  loadJournalEntries(periodId);
}

function loadJournalEntries(periodId) {
  db.collection("journalEntries")
    .where("clientId",  "==", finClientId)
    .where("periodId",  "==", periodId)
    .get().then(snap => {
      let list = document.getElementById("je-list");
      if (!list) return;
      if (snap.empty) {
        list.innerHTML = `<div style="padding:24px;text-align:center;color:var(--text-dim);font-size:13px;">No entries yet. Click "+ New Entry" to add the first journal entry.</div>`;
        return;
      }
      list.innerHTML = "";
      let entries = [];
      snap.forEach(doc => { let d = doc.data(); d._id = doc.id; entries.push(d); });
      entries.sort((a,b) => (a.entryDate&&b.entryDate) ? a.entryDate.seconds - b.entryDate.seconds : 0);

      entries.forEach(e => {
        let totalDr = e.lines.reduce((s,l) => s + (parseFloat(l.debit)||0), 0);
        let totalCr = e.lines.reduce((s,l) => s + (parseFloat(l.credit)||0), 0);
        let balanced = Math.abs(totalDr - totalCr) < 0.01;
        let dateStr  = e.entryDate ? new Date(e.entryDate.seconds*1000).toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"}) : "—";

        let row = document.createElement("div");
        row.className = "je-list-row";
        row.innerHTML = `
          <span class="je-date">${dateStr}</span>
          <span class="je-desc">${e.description || "—"}${e.isAdjusting ? ' <span class="je-adj-tag">ADJ</span>' : ""}</span>
          <span class="je-amount">$${totalDr.toLocaleString("en-US",{minimumFractionDigits:2})}</span>
          <span class="je-amount">$${totalCr.toLocaleString("en-US",{minimumFractionDigits:2})}</span>
          <span class="status-pill ${balanced?"filed":"review"}">${balanced?"Balanced":"Unbalanced"}</span>
          <div style="display:flex;gap:6px;">
            <button class="ghost-btn" onclick="expandJE('${e._id}',this)">View</button>
            <button class="action-btn-delete" onclick="deleteJE('${e._id}')">Delete</button>
          </div>`;
        list.appendChild(row);
      });
    });
}

function openNewJEForm() {
  jeLines = [
    { accountId:"", accountNumber:"", accountName:"", debit:"", credit:"" },
    { accountId:"", accountNumber:"", accountName:"", debit:"", credit:"" }
  ];
  renderJEForm();
  document.getElementById("je-new-form").style.display = "block";
}

function renderJEForm() {
  let form = document.getElementById("je-new-form");
  if (!form) return;

  // Build account options
  let acctOpts = chartOfAccounts
    .filter(a => a.isActive)
    .map(a => `<option value="${a._id}" data-number="${a.number}" data-name="${a.name}">${a.number} — ${a.name}</option>`)
    .join("");

  let linesHTML = jeLines.map((line, i) => `
    <div class="je-line" id="je-line-${i}">
      <select class="je-acct-select" onchange="setJEAccount(${i},this)">
        <option value="">— Select Account —</option>
        ${acctOpts}
      </select>
      <input type="number" class="je-amount-input" placeholder="Debit"  value="${line.debit}"  oninput="setJEAmount(${i},'debit',this.value)"  step="0.01" min="0">
      <input type="number" class="je-amount-input" placeholder="Credit" value="${line.credit}" oninput="setJEAmount(${i},'credit',this.value)" step="0.01" min="0">
      <button class="form-action-btn delete" onclick="removeJELine(${i})">✕</button>
    </div>`).join("");

  let totalDr = jeLines.reduce((s,l) => s+(parseFloat(l.debit)||0),  0);
  let totalCr = jeLines.reduce((s,l) => s+(parseFloat(l.credit)||0), 0);
  let balanced = Math.abs(totalDr - totalCr) < 0.01 && totalDr > 0;
  let balClass = balanced ? "je-balanced" : "je-unbalanced";
  let balText  = balanced ? "✓ Balanced" : `Difference: $${Math.abs(totalDr-totalCr).toFixed(2)}`;

  form.innerHTML = `
    <div class="je-form-header">
      <h3>New Journal Entry</h3>
      <label class="checkbox-label" style="font-size:13px;color:var(--text-muted);">
        <input type="checkbox" id="je-is-adjusting"> <span class="checkbox-custom"></span> Adjusting Entry
      </label>
    </div>
    <div class="je-form-top">
      <div class="editor-field" style="flex:1;">
        <label>Date</label>
        <input type="date" id="je-date" value="${new Date().toISOString().slice(0,10)}">
      </div>
      <div class="editor-field" style="flex:3;">
        <label>Description</label>
        <input type="text" id="je-description" placeholder="e.g. Record monthly rent payment">
      </div>
    </div>
    <div class="je-lines-header">
      <span style="flex:3;">Account</span>
      <span style="flex:1;text-align:right;">Debit</span>
      <span style="flex:1;text-align:right;">Credit</span>
      <span style="width:32px;"></span>
    </div>
    <div id="je-lines-container">${linesHTML}</div>
    <button class="ghost-btn" style="margin-top:8px;" onclick="addJELine()">+ Add Line</button>
    <div class="je-totals">
      <span></span>
      <span class="je-total-label">Total Debits: <strong>$${totalDr.toLocaleString("en-US",{minimumFractionDigits:2})}</strong></span>
      <span class="je-total-label">Total Credits: <strong>$${totalCr.toLocaleString("en-US",{minimumFractionDigits:2})}</strong></span>
      <span class="${balClass}">${balText}</span>
    </div>
    <div class="je-form-actions">
      <button class="ghost-btn" onclick="cancelJEForm()">Cancel</button>
      <button class="primary-btn" onclick="postJournalEntry()" ${balanced?"":"disabled"} id="post-je-btn">Post Entry</button>
    </div>`;

  // Restore selected accounts
  jeLines.forEach((line, i) => {
    if (line.accountId) {
      let sel = form.querySelector(`#je-line-${i} .je-acct-select`);
      if (sel) sel.value = line.accountId;
    }
  });
}

function setJEAccount(i, sel) {
  let opt = sel.options[sel.selectedIndex];
  jeLines[i].accountId     = sel.value;
  jeLines[i].accountNumber = opt.getAttribute("data-number") || "";
  jeLines[i].accountName   = opt.getAttribute("data-name")   || "";
  renderJEForm();
  // Restore focus
  let newSel = document.querySelector(`#je-line-${i} .je-acct-select`);
  if (newSel) newSel.value = sel.value;
}

function setJEAmount(i, field, value) {
  jeLines[i][field] = value;
  // Update totals without full re-render
  let totalDr = jeLines.reduce((s,l) => s+(parseFloat(l.debit)||0),  0);
  let totalCr = jeLines.reduce((s,l) => s+(parseFloat(l.credit)||0), 0);
  let balanced = Math.abs(totalDr-totalCr) < 0.01 && totalDr > 0;
  let balEl = document.querySelector(".je-balanced,.je-unbalanced");
  if (balEl) {
    balEl.className = balanced ? "je-balanced" : "je-unbalanced";
    balEl.textContent = balanced ? "✓ Balanced" : `Difference: $${Math.abs(totalDr-totalCr).toFixed(2)}`;
  }
  let postBtn = document.getElementById("post-je-btn");
  if (postBtn) postBtn.disabled = !balanced;
}

function addJELine() {
  jeLines.push({ accountId:"", accountNumber:"", accountName:"", debit:"", credit:"" });
  renderJEForm();
}

function removeJELine(i) {
  if (jeLines.length <= 2) { alert("A journal entry needs at least 2 lines."); return; }
  jeLines.splice(i, 1);
  renderJEForm();
}

function cancelJEForm() {
  document.getElementById("je-new-form").style.display = "none";
  jeLines = [];
}

function postJournalEntry() {
  let date        = document.getElementById("je-date").value;
  let description = document.getElementById("je-description").value.trim();
  let isAdjusting = document.getElementById("je-is-adjusting").checked;

  if (!date)        { alert("Please enter a date."); return; }
  if (!description) { alert("Please enter a description."); return; }

  let lines = jeLines.filter(l => l.accountId && (parseFloat(l.debit)||0) + (parseFloat(l.credit)||0) > 0);
  if (lines.length < 2) { alert("Please add at least 2 account lines."); return; }

  let cleanLines = lines.map(l => ({
    accountId:     l.accountId,
    accountNumber: l.accountNumber,
    accountName:   l.accountName,
    debit:         parseFloat(l.debit)  || 0,
    credit:        parseFloat(l.credit) || 0
  }));

  db.collection("journalEntries").add({
    clientId:    finClientId,
    periodId:    currentPeriodId,
    entryDate:   firebase.firestore.Timestamp.fromDate(new Date(date + "T12:00:00")),
    description: description,
    isAdjusting: isAdjusting,
    lines:       cleanLines,
    postedBy:    "Anthony Sesny",
    createdAt:   firebase.firestore.FieldValue.serverTimestamp()
  }).then(() => {
    cancelJEForm();
    loadJournalEntries(currentPeriodId);
  }).catch(e => alert("Failed to post entry: " + e.message));
}

function expandJE(id, btn) {
  // Find the row and show lines below it
  let row = btn.closest(".je-list-row");
  let existing = row.nextSibling;
  if (existing && existing.classList && existing.classList.contains("je-expand-row")) {
    existing.remove(); btn.textContent = "View"; return;
  }
  btn.textContent = "Hide";
  db.collection("journalEntries").doc(id).get().then(doc => {
    let e = doc.data();
    let expand = document.createElement("div");
    expand.className = "je-expand-row";
    let linesHTML = e.lines.map(l => `
      <div class="je-expand-line">
        <span class="je-exp-num">${l.accountNumber}</span>
        <span class="je-exp-name">${l.accountName}</span>
        <span class="je-exp-dr">${l.debit  > 0 ? "$"+l.debit.toLocaleString("en-US",{minimumFractionDigits:2})  : ""}</span>
        <span class="je-exp-cr">${l.credit > 0 ? "$"+l.credit.toLocaleString("en-US",{minimumFractionDigits:2}) : ""}</span>
      </div>`).join("");
    expand.innerHTML = linesHTML;
    row.parentNode.insertBefore(expand, row.nextSibling);
  });
}

function deleteJE(id) {
  if (!confirm("Delete this journal entry? This cannot be undone.")) return;
  db.collection("journalEntries").doc(id).delete().then(() => {
    loadJournalEntries(currentPeriodId);
  });
}

// ══════════════════════════════════════
//  STATEMENT ENGINE
// ══════════════════════════════════════

async function openStatements(periodId, periodLabel) {
  currentPeriodId    = periodId;
  currentPeriodLabel = periodLabel;

  let main = document.getElementById("financials-main");
  main.innerHTML = `
    <div class="fin-breadcrumb">
      <span class="breadcrumb-link" onclick="renderFinancialsHome()">Financials</span>
      <span class="breadcrumb-sep">›</span>
      <span class="breadcrumb-link" onclick="selectFinClient('${finClientId}','${finClientName.replace(/'/g,"\\'")}')">
        ${finClientName}
      </span>
      <span class="breadcrumb-sep">›</span>
      <span class="breadcrumb-current">${periodLabel} · Statements</span>
    </div>
    <div class="fin-client-toolbar">
      <div><h2>Financial Statements</h2><p>${finClientName} · ${periodLabel}</p></div>
      <div style="display:flex;gap:8px;">
        <button class="ghost-btn" onclick="exportStatementsExcel()">Export Excel ↓</button>
        <button class="primary-btn" onclick="publishStatements('${periodId}')">Publish to Portal</button>
      </div>
    </div>
    <div class="stmt-tab-bar">
      <button class="stmt-tab active" onclick="switchStmtTab('income',this)">Income Statement</button>
      <button class="stmt-tab" onclick="switchStmtTab('balance',this)">Balance Sheet</button>
      <button class="stmt-tab" onclick="switchStmtTab('cashflow',this)">Cash Flow</button>
      <button class="stmt-tab" onclick="switchStmtTab('equity',this)">Shareholders' Equity</button>
      <button class="stmt-tab" onclick="switchStmtTab('trial',this)">Trial Balance</button>
    </div>
    <div id="stmt-content">
      <div style="padding:32px;text-align:center;color:var(--text-dim);font-size:13px;">Computing statements from journal entries...</div>
    </div>`;

  // Fetch all journal entries for this period and compute
  await computeAndRenderStatements(periodId, periodLabel);
}

// Compute account balances from journal entries
async function computeAndRenderStatements(periodId, periodLabel) {
  let snap = await db.collection("journalEntries")
    .where("clientId", "==", finClientId)
    .where("periodId", "==", periodId)
    .get();

  // Build balance map: accountId → { number, name, type, subType, debit, credit, balance }
  let balanceMap = {};
  chartOfAccounts.forEach(a => {
    balanceMap[a._id] = {
      _id: a._id, number: a.number, name: a.name,
      type: a.type, subType: a.subType, normalBalance: a.normalBalance,
      debit: 0, credit: 0, balance: 0
    };
  });

  snap.forEach(doc => {
    let e = doc.data();
    e.lines.forEach(line => {
      if (!balanceMap[line.accountId]) {
        balanceMap[line.accountId] = {
          _id: line.accountId, number: line.accountNumber, name: line.accountName,
          type: "expense", subType: "operating_expense", normalBalance: "debit",
          debit: 0, credit: 0, balance: 0
        };
      }
      balanceMap[line.accountId].debit  += (parseFloat(line.debit)  || 0);
      balanceMap[line.accountId].credit += (parseFloat(line.credit) || 0);
    });
  });

  // Compute net balance per account
  Object.values(balanceMap).forEach(a => {
    if (a.normalBalance === "debit")  a.balance = a.debit - a.credit;
    else                               a.balance = a.credit - a.debit;
  });

  // Filter to accounts with activity
  let accounts = Object.values(balanceMap).filter(a => a.debit > 0 || a.credit > 0);
  accounts.sort((a,b) => parseInt(a.number) - parseInt(b.number));

  // Store for export
  window._finData = { accounts, periodLabel, clientName: finClientName };

  renderIncomeStatement(accounts, periodLabel);
}

function switchStmtTab(type, btn) {
  document.querySelectorAll(".stmt-tab").forEach(b => b.classList.remove("active"));
  btn.classList.add("active");
  let accounts    = window._finData ? window._finData.accounts : [];
  let periodLabel = window._finData ? window._finData.periodLabel : "";
  if (type === "income")   renderIncomeStatement(accounts, periodLabel);
  if (type === "balance")  renderBalanceSheet(accounts, periodLabel);
  if (type === "cashflow") renderCashFlow(accounts, periodLabel);
  if (type === "equity")   renderEquityStatement(accounts, periodLabel);
  if (type === "trial")    renderTrialBalance(accounts, periodLabel);
}

function fmtMoney(n) {
  if (n < 0) return `(${Math.abs(n).toLocaleString("en-US",{minimumFractionDigits:2})})`;
  return n.toLocaleString("en-US",{minimumFractionDigits:2});
}

function stmtRow(number, name, amount, indent, bold, total) {
  return `<div class="stmt-row ${bold?"stmt-bold":""} ${total?"stmt-total":""}" style="padding-left:${indent}px">
    <span class="stmt-acct-num">${number||""}</span>
    <span class="stmt-acct-name">${name}</span>
    <span class="stmt-acct-amt">${amount !== null ? "$"+fmtMoney(amount) : ""}</span>
  </div>`;
}
function stmtSection(title) {
  return `<div class="stmt-section-header">${title}</div>`;
}
function stmtDivider() {
  return `<div class="stmt-divider"></div>`;
}

// ── INCOME STATEMENT ──
function renderIncomeStatement(accounts, periodLabel) {
  let el = document.getElementById("stmt-content");

  let revenue  = accounts.filter(a => a.type === "revenue");
  let cogs     = accounts.filter(a => a.type === "cogs");
  let opex     = accounts.filter(a => a.type === "expense" && a.subType === "operating_expense");
  let otherExp = accounts.filter(a => a.type === "expense" && a.subType === "other_expense");
  let tax      = accounts.filter(a => a.type === "tax");

  let totalRevenue  = revenue.reduce((s,a)  => s + a.balance, 0);
  let totalCOGS     = cogs.reduce((s,a)     => s + a.balance, 0);
  let grossProfit   = totalRevenue - totalCOGS;
  let totalOpEx     = opex.reduce((s,a)     => s + a.balance, 0);
  let incomeFromOps = grossProfit - totalOpEx;
  let totalOtherExp = otherExp.reduce((s,a) => s + a.balance, 0);
  let incomeBeforeTax = incomeFromOps - totalOtherExp;
  let totalTax      = tax.reduce((s,a)      => s + a.balance, 0);
  let netIncome     = incomeBeforeTax - totalTax;

  let html = `<div class="stmt-wrapper">
    <div class="stmt-header">
      <div class="stmt-company">${finClientName}</div>
      <div class="stmt-title">Income Statement</div>
      <div class="stmt-period">For the Period: ${periodLabel}</div>
    </div>`;

  html += stmtSection("REVENUE");
  revenue.forEach(a  => { html += stmtRow(a.number, a.name, a.balance, 32, false, false); });
  html += stmtRow("", "Total Revenue", totalRevenue, 32, true, true);
  html += stmtDivider();

  if (cogs.length > 0) {
    html += stmtSection("COST OF GOODS SOLD");
    cogs.forEach(a => { html += stmtRow(a.number, a.name, a.balance, 32, false, false); });
    html += stmtRow("", "Total Cost of Goods Sold", totalCOGS, 32, true, true);
    html += stmtRow("", "Gross Profit", grossProfit, 0, true, true);
    html += stmtDivider();
  }

  html += stmtSection("OPERATING EXPENSES");
  opex.forEach(a => { html += stmtRow(a.number, a.name, a.balance, 32, false, false); });
  html += stmtRow("", "Total Operating Expenses", totalOpEx, 32, true, true);
  html += stmtRow("", "Income from Operations", incomeFromOps, 0, true, true);
  html += stmtDivider();

  if (otherExp.length > 0) {
    html += stmtSection("OTHER EXPENSES");
    otherExp.forEach(a => { html += stmtRow(a.number, a.name, a.balance, 32, false, false); });
    html += stmtRow("", "Total Other Expenses", totalOtherExp, 32, true, true);
    html += stmtRow("", "Income Before Tax", incomeBeforeTax, 0, true, true);
    html += stmtDivider();
  }

  if (tax.length > 0) {
    html += stmtSection("INCOME TAX");
    tax.forEach(a => { html += stmtRow(a.number, a.name, a.balance, 32, false, false); });
    html += stmtDivider();
  }

  html += `<div class="stmt-net-income">
    <span>NET INCOME</span>
    <span>$${fmtMoney(netIncome)}</span>
  </div>`;

  html += `</div>`;
  el.innerHTML = html;

  // Store net income for equity statement
  window._netIncome = netIncome;
}

// ── BALANCE SHEET ──
function renderBalanceSheet(accounts, periodLabel) {
  let el = document.getElementById("stmt-content");

  let currAssets  = accounts.filter(a => a.type==="asset" && a.subType==="current_asset");
  let fixedAssets = accounts.filter(a => a.type==="asset" && a.subType==="fixed_asset");
  let contraAssets= accounts.filter(a => a.type==="asset" && a.subType==="contra_asset");
  let otherAssets = accounts.filter(a => a.type==="asset" && a.subType==="other_asset");
  let currLiab    = accounts.filter(a => a.type==="liability" && a.subType==="current_liability");
  let ltLiab      = accounts.filter(a => a.type==="liability" && a.subType==="long_term_liability");
  let equity      = accounts.filter(a => a.type==="equity");

  let totalCurrAssets  = currAssets.reduce((s,a)  => s+a.balance,0);
  let totalFixedAssets = fixedAssets.reduce((s,a) => s+a.balance,0);
  let totalContra      = contraAssets.reduce((s,a)=> s+a.balance,0);
  let totalOtherAssets = otherAssets.reduce((s,a) => s+a.balance,0);
  let totalAssets      = totalCurrAssets + totalFixedAssets - totalContra + totalOtherAssets;
  let totalCurrLiab    = currLiab.reduce((s,a)    => s+a.balance,0);
  let totalLTLiab      = ltLiab.reduce((s,a)      => s+a.balance,0);
  let totalLiab        = totalCurrLiab + totalLTLiab;
  let netIncome        = window._netIncome || 0;
  let totalEquity      = equity.reduce((s,a)      => s+a.balance,0) + netIncome;
  let totalLiabEquity  = totalLiab + totalEquity;

  let html = `<div class="stmt-wrapper">
    <div class="stmt-header">
      <div class="stmt-company">${finClientName}</div>
      <div class="stmt-title">Balance Sheet</div>
      <div class="stmt-period">As of ${periodLabel}</div>
    </div>
    <div class="stmt-two-col">
      <div class="stmt-col">`;

  // ASSETS
  html += stmtSection("ASSETS");
  html += stmtSection("Current Assets");
  currAssets.forEach(a  => { html += stmtRow(a.number, a.name, a.balance, 32, false, false); });
  html += stmtRow("","Total Current Assets", totalCurrAssets, 16, true, true);

  if (fixedAssets.length > 0 || contraAssets.length > 0) {
    html += stmtSection("Property, Plant & Equipment");
    fixedAssets.forEach(a  => { html += stmtRow(a.number, a.name, a.balance, 32, false, false); });
    contraAssets.forEach(a => { html += stmtRow(a.number, a.name, -a.balance, 32, false, false); });
    html += stmtRow("","Net PP&E", totalFixedAssets - totalContra, 16, true, true);
  }

  if (otherAssets.length > 0) {
    html += stmtSection("Other Assets");
    otherAssets.forEach(a => { html += stmtRow(a.number, a.name, a.balance, 32, false, false); });
  }

  html += stmtDivider();
  html += stmtRow("","TOTAL ASSETS", totalAssets, 0, true, true);

  html += `</div><div class="stmt-col">`;

  // LIABILITIES
  html += stmtSection("LIABILITIES");
  html += stmtSection("Current Liabilities");
  currLiab.forEach(a => { html += stmtRow(a.number, a.name, a.balance, 32, false, false); });
  html += stmtRow("","Total Current Liabilities", totalCurrLiab, 16, true, true);

  if (ltLiab.length > 0) {
    html += stmtSection("Long-Term Liabilities");
    ltLiab.forEach(a => { html += stmtRow(a.number, a.name, a.balance, 32, false, false); });
    html += stmtRow("","Total Long-Term Liabilities", totalLTLiab, 16, true, true);
  }

  html += stmtRow("","Total Liabilities", totalLiab, 0, true, true);
  html += stmtDivider();

  // EQUITY
  html += stmtSection("SHAREHOLDERS' EQUITY");
  equity.forEach(a => { html += stmtRow(a.number, a.name, a.balance, 32, false, false); });
  html += stmtRow("","Net Income (Current Period)", netIncome, 32, false, false);
  html += stmtRow("","Total Shareholders' Equity", totalEquity, 0, true, true);
  html += stmtDivider();
  html += stmtRow("","TOTAL LIABILITIES & EQUITY", totalLiabEquity, 0, true, true);

  // Balance check
  let diff = Math.abs(totalAssets - totalLiabEquity);
  if (diff > 0.01) {
    html += `<div class="stmt-warning">⚠ Balance sheet is out of balance by $${fmtMoney(diff)}. Check your journal entries.</div>`;
  } else {
    html += `<div class="stmt-check">✓ Balance sheet balances</div>`;
  }

  html += `</div></div></div>`;
  el.innerHTML = html;
}

// ── CASH FLOW (Indirect Method) ──
function renderCashFlow(accounts, periodLabel) {
  let el = document.getElementById("stmt-content");

  let netIncome    = window._netIncome || 0;
  let depreciation = accounts.filter(a => a.number==="640" || a.number==="650").reduce((s,a)=>s+a.balance,0);
  let arChange     = accounts.filter(a => a.number==="110").reduce((s,a)=>s+a.balance,0);
  let invChange    = accounts.filter(a => a.number==="120").reduce((s,a)=>s+a.balance,0);
  let prepaidChg   = accounts.filter(a => a.number==="130").reduce((s,a)=>s+a.balance,0);
  let apChange     = accounts.filter(a => a.number==="200").reduce((s,a)=>s+a.balance,0);
  let accruedChg   = accounts.filter(a => a.number==="210").reduce((s,a)=>s+a.balance,0);

  let cfOperations = netIncome + depreciation - arChange - invChange - prepaidChg + apChange + accruedChg;

  let ppe          = accounts.filter(a => a.number==="150").reduce((s,a)=>s+a.balance,0);
  let intangibles  = accounts.filter(a => a.number==="170").reduce((s,a)=>s+a.balance,0);
  let cfInvesting  = -(ppe + intangibles);

  let notes        = accounts.filter(a => a.type==="liability" && (a.number==="220"||a.number==="250")).reduce((s,a)=>s+a.balance,0);
  let equity       = accounts.filter(a => a.type==="equity" && a.number!=="320").reduce((s,a)=>s+a.balance,0);
  let dividends    = accounts.filter(a => a.number==="330").reduce((s,a)=>s+a.balance,0);
  let cfFinancing  = notes + equity - dividends;

  let netCashChange = cfOperations + cfInvesting + cfFinancing;
  let begCash       = accounts.filter(a => a.number==="100").reduce((s,a)=>s+a.balance,0);
  let endCash       = begCash + netCashChange;

  let html = `<div class="stmt-wrapper">
    <div class="stmt-header">
      <div class="stmt-company">${finClientName}</div>
      <div class="stmt-title">Statement of Cash Flows</div>
      <div class="stmt-period">For the Period: ${periodLabel}</div>
      <div class="stmt-method">(Indirect Method)</div>
    </div>`;

  html += stmtSection("CASH FLOWS FROM OPERATING ACTIVITIES");
  html += stmtRow("","Net Income", netIncome, 32, false, false);
  html += stmtSection("Adjustments to reconcile net income:");
  if (depreciation) html += stmtRow("640/650","Depreciation & Amortization", depreciation, 48, false, false);
  if (arChange)     html += stmtRow("110","(Increase) in Accounts Receivable", -arChange, 48, false, false);
  if (invChange)    html += stmtRow("120","(Increase) in Inventory", -invChange, 48, false, false);
  if (apChange)     html += stmtRow("200","Increase in Accounts Payable", apChange, 48, false, false);
  if (accruedChg)   html += stmtRow("210","Increase in Accrued Liabilities", accruedChg, 48, false, false);
  html += stmtRow("","Net Cash from Operating Activities", cfOperations, 0, true, true);
  html += stmtDivider();

  html += stmtSection("CASH FLOWS FROM INVESTING ACTIVITIES");
  if (ppe)        html += stmtRow("150","Purchase of Property & Equipment", -ppe, 32, false, false);
  if (intangibles)html += stmtRow("170","Purchase of Intangible Assets", -intangibles, 32, false, false);
  html += stmtRow("","Net Cash from Investing Activities", cfInvesting, 0, true, true);
  html += stmtDivider();

  html += stmtSection("CASH FLOWS FROM FINANCING ACTIVITIES");
  if (notes)    html += stmtRow("220/250","Proceeds from Notes Payable", notes, 32, false, false);
  if (equity)   html += stmtRow("300/310","Proceeds from Equity Issuance", equity, 32, false, false);
  if (dividends)html += stmtRow("330","Dividends / Distributions Paid", -dividends, 32, false, false);
  html += stmtRow("","Net Cash from Financing Activities", cfFinancing, 0, true, true);
  html += stmtDivider();

  html += stmtRow("","Net Increase (Decrease) in Cash", netCashChange, 0, true, true);
  html += stmtRow("","Cash at Beginning of Period", begCash, 0, false, false);
  html += `<div class="stmt-net-income"><span>CASH AT END OF PERIOD</span><span>$${fmtMoney(endCash)}</span></div>`;
  html += `</div>`;
  el.innerHTML = html;
}

// ── STATEMENT OF SHAREHOLDERS' EQUITY ──
function renderEquityStatement(accounts, periodLabel) {
  let el = document.getElementById("stmt-content");
  let netIncome  = window._netIncome || 0;

  let commonStock = accounts.filter(a=>a.number==="300").reduce((s,a)=>s+a.balance,0);
  let apic        = accounts.filter(a=>a.number==="310").reduce((s,a)=>s+a.balance,0);
  let retainedEarn= accounts.filter(a=>a.number==="320").reduce((s,a)=>s+a.balance,0);
  let dividends   = accounts.filter(a=>a.number==="330").reduce((s,a)=>s+a.balance,0);
  let treasury    = accounts.filter(a=>a.number==="340").reduce((s,a)=>s+a.balance,0);

  let endingRE    = retainedEarn + netIncome - dividends;
  let totalEquity = commonStock + apic + endingRE - treasury;

  let html = `<div class="stmt-wrapper">
    <div class="stmt-header">
      <div class="stmt-company">${finClientName}</div>
      <div class="stmt-title">Statement of Shareholders' Equity</div>
      <div class="stmt-period">For the Period: ${periodLabel}</div>
    </div>
    <div class="equity-table">
      <div class="equity-header">
        <span>Component</span>
        <span>Amount</span>
      </div>`;

  html += `<div class="equity-section">PAID-IN CAPITAL</div>`;
  html += `<div class="equity-row"><span>300 Common Stock</span><span>$${fmtMoney(commonStock)}</span></div>`;
  if (apic) html += `<div class="equity-row"><span>310 Additional Paid-In Capital</span><span>$${fmtMoney(apic)}</span></div>`;
  html += `<div class="equity-row equity-subtotal"><span>Total Paid-In Capital</span><span>$${fmtMoney(commonStock+apic)}</span></div>`;

  html += `<div class="equity-section">RETAINED EARNINGS</div>`;
  html += `<div class="equity-row"><span>320 Retained Earnings (Beginning)</span><span>$${fmtMoney(retainedEarn)}</span></div>`;
  html += `<div class="equity-row"><span>Net Income (Current Period)</span><span>$${fmtMoney(netIncome)}</span></div>`;
  if (dividends) html += `<div class="equity-row"><span>330 Less: Dividends / Distributions</span><span>($${fmtMoney(dividends)})</span></div>`;
  html += `<div class="equity-row equity-subtotal"><span>Retained Earnings (Ending)</span><span>$${fmtMoney(endingRE)}</span></div>`;

  if (treasury) {
    html += `<div class="equity-section">CONTRA EQUITY</div>`;
    html += `<div class="equity-row"><span>340 Treasury Stock</span><span>($${fmtMoney(treasury)})</span></div>`;
  }

  html += `<div class="equity-total"><span>TOTAL SHAREHOLDERS' EQUITY</span><span>$${fmtMoney(totalEquity)}</span></div>`;
  html += `</div></div>`;
  el.innerHTML = html;
}

// ── TRIAL BALANCE ──
function renderTrialBalance(accounts, periodLabel) {
  let el = document.getElementById("stmt-content");

  let totalDr = 0, totalCr = 0;
  let rows = accounts.map(a => {
    let dr = a.normalBalance === "debit"  ? a.balance : 0;
    let cr = a.normalBalance === "credit" ? a.balance : 0;
    // Handle negatives (over-credits on debit accounts etc)
    if (dr < 0) { cr = Math.abs(dr); dr = 0; }
    if (cr < 0) { dr = Math.abs(cr); cr = 0; }
    totalDr += dr; totalCr += cr;
    return { number: a.number, name: a.name, dr, cr };
  });

  let balanced  = Math.abs(totalDr - totalCr) < 0.01;

  let html = `<div class="stmt-wrapper">
    <div class="stmt-header">
      <div class="stmt-company">${finClientName}</div>
      <div class="stmt-title">Trial Balance</div>
      <div class="stmt-period">As of ${periodLabel}</div>
    </div>
    <div class="tb-table">
      <div class="tb-header">
        <span>Acct #</span><span>Account Name</span><span>Debit</span><span>Credit</span>
      </div>`;

  rows.forEach(r => {
    html += `<div class="tb-row">
      <span class="tb-num">${r.number}</span>
      <span class="tb-name">${r.name}</span>
      <span class="tb-dr">${r.dr > 0 ? "$"+fmtMoney(r.dr) : ""}</span>
      <span class="tb-cr">${r.cr > 0 ? "$"+fmtMoney(r.cr) : ""}</span>
    </div>`;
  });

  html += `<div class="tb-total">
    <span></span><span>TOTALS</span>
    <span>$${fmtMoney(totalDr)}</span>
    <span>$${fmtMoney(totalCr)}</span>
  </div>`;

  html += `</div>
    <div class="${balanced?"stmt-check":"stmt-warning"}">
      ${balanced ? "✓ Trial balance is in balance" : "⚠ Out of balance by $"+fmtMoney(Math.abs(totalDr-totalCr))}
    </div>
  </div>`;
  el.innerHTML = html;
}

// ══════════════════════════════════════
//  FINALIZE & PUBLISH
// ══════════════════════════════════════

function finalizePeriod(periodId) {
  if (!confirm("Finalize this period? You can still publish to the client portal after finalizing.")) return;
  db.collection("clientLedger").doc(finClientId)
    .collection("periods").doc(periodId)
    .update({ status: "finalized", finalizedAt: firebase.firestore.FieldValue.serverTimestamp() })
    .then(() => loadClientPeriods(finClientId))
    .catch(e => alert("Failed: " + e.message));
}

function publishStatements(periodId) {
  if (!window._finData) { alert("Please open Statements first to generate them before publishing."); return; }
  if (!confirm("Publish these statements to the client portal? The client will be able to view them immediately.")) return;

  let data  = window._finData;
  let batch = db.batch();

  ["income","balance","cashflow","equity"].forEach(type => {
    let ref = db.collection("financialStatements").doc(finClientId + "_" + periodId + "_" + type);
    batch.set(ref, {
      clientId:     finClientId,
      clientName:   finClientName,
      periodId:     periodId,
      periodLabel:  data.periodLabel,
      statementType:type,
      accounts:     data.accounts,
      netIncome:    window._netIncome || 0,
      published:    true,
      publishedAt:  firebase.firestore.FieldValue.serverTimestamp()
    });
  });

  batch.commit().then(() => {
    alert("Statements published to client portal!");
    // Log activity
    db.collection("activity").add({
      clientId:  finClientId,
      type:      "ready",
      text:      "Financial statements published for " + data.periodLabel,
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    });
  }).catch(e => alert("Failed: " + e.message));
}

// ══════════════════════════════════════
//  EXCEL EXPORT
// ══════════════════════════════════════

function exportStatementsExcel() {
  if (!window._finData) { alert("Please generate statements first."); return; }
  if (typeof XLSX === "undefined") { alert("Excel library not loaded yet. Please try again."); return; }

  let data        = window._finData;
  let accounts    = data.accounts;
  let periodLabel = data.periodLabel;
  let clientName  = data.clientName;
  let wb          = XLSX.utils.book_new();
  let netIncome   = window._netIncome || 0;

  // ── Income Statement Sheet ──
  let isData = [[clientName],[" INCOME STATEMENT"],["For the Period: " + periodLabel],[""]];
  let revenue  = accounts.filter(a=>a.type==="revenue");
  let cogs     = accounts.filter(a=>a.type==="cogs");
  let opex     = accounts.filter(a=>a.type==="expense"&&a.subType==="operating_expense");
  let otherExp = accounts.filter(a=>a.type==="expense"&&a.subType==="other_expense");
  let tax      = accounts.filter(a=>a.type==="tax");

  isData.push(["REVENUE","",""]);
  revenue.forEach(a => isData.push([a.number, a.name, a.balance]));
  isData.push(["","Total Revenue", revenue.reduce((s,a)=>s+a.balance,0)]);
  isData.push([""]);

  if (cogs.length) {
    isData.push(["COST OF GOODS SOLD","",""]);
    cogs.forEach(a => isData.push([a.number, a.name, a.balance]));
    isData.push(["","Total COGS", cogs.reduce((s,a)=>s+a.balance,0)]);
    isData.push(["","Gross Profit", revenue.reduce((s,a)=>s+a.balance,0) - cogs.reduce((s,a)=>s+a.balance,0)]);
    isData.push([""]);
  }

  isData.push(["OPERATING EXPENSES","",""]);
  opex.forEach(a => isData.push([a.number, a.name, a.balance]));
  isData.push(["","Total Operating Expenses", opex.reduce((s,a)=>s+a.balance,0)]);
  isData.push([""]);

  if (otherExp.length) {
    isData.push(["OTHER EXPENSES","",""]);
    otherExp.forEach(a => isData.push([a.number, a.name, a.balance]));
    isData.push([""]);
  }

  if (tax.length) {
    isData.push(["INCOME TAX","",""]);
    tax.forEach(a => isData.push([a.number, a.name, a.balance]));
    isData.push([""]);
  }

  isData.push(["","NET INCOME", netIncome]);

  let wsIS = XLSX.utils.aoa_to_sheet(isData);
  wsIS["!cols"] = [{wch:12},{wch:40},{wch:18}];
  XLSX.utils.book_append_sheet(wb, wsIS, "Income Statement");

  // ── Trial Balance Sheet ──
  let tbData = [[clientName],["TRIAL BALANCE"],["As of " + periodLabel],[""],
    ["Account #","Account Name","Debit","Credit"]];
  accounts.forEach(a => {
    let dr = a.normalBalance==="debit"  ? Math.max(a.balance,0) : 0;
    let cr = a.normalBalance==="credit" ? Math.max(a.balance,0) : 0;
    tbData.push([a.number, a.name, dr||"", cr||""]);
  });
  let totalDr = accounts.filter(a=>a.normalBalance==="debit").reduce((s,a)=>s+Math.max(a.balance,0),0);
  let totalCr = accounts.filter(a=>a.normalBalance==="credit").reduce((s,a)=>s+Math.max(a.balance,0),0);
  tbData.push(["","TOTALS", totalDr, totalCr]);

  let wsTB = XLSX.utils.aoa_to_sheet(tbData);
  wsTB["!cols"] = [{wch:12},{wch:40},{wch:18},{wch:18}];
  XLSX.utils.book_append_sheet(wb, wsTB, "Trial Balance");

  XLSX.writeFile(wb, clientName.replace(/\s+/g,"-") + "_" + periodLabel.replace(/\s+/g,"-") + "_Financials.xlsx");
}

// ══════════════════════════════════════
//  CHART OF ACCOUNTS UI
// ══════════════════════════════════════

function showCOA() {
  let main = document.getElementById("financials-main");
  main.innerHTML = `
    <div class="fin-breadcrumb">
      <span class="breadcrumb-link" onclick="renderFinancialsHome()">Financials</span>
      <span class="breadcrumb-sep">›</span>
      <span class="breadcrumb-current">Chart of Accounts</span>
    </div>
    <div class="fin-client-toolbar">
      <div><h2>Chart of Accounts</h2><p>Master list of all accounts</p></div>
      <button class="primary-btn" onclick="openAddAccountModal()">+ Add Account</button>
    </div>
    <div class="dash-card" style="padding:0;overflow:hidden;">
      <div class="coa-header">
        <span>Number</span><span>Account Name</span><span>Type</span><span>Normal Balance</span><span>Status</span><span></span>
      </div>
      <div id="coa-list">${renderCOARows()}</div>
    </div>`;
}

function renderCOARows() {
  if (!chartOfAccounts.length) return `<div style="padding:24px;text-align:center;color:var(--text-dim);font-size:13px;">No accounts loaded.</div>`;
  return chartOfAccounts.map(a => `
    <div class="coa-row">
      <span class="coa-num">${a.number}</span>
      <span class="coa-name">${a.name}</span>
      <span class="coa-type">${a.type}</span>
      <span class="coa-bal ${a.normalBalance}">${a.normalBalance}</span>
      <span class="status-pill ${a.isActive?"filed":"review"}">${a.isActive?"Active":"Inactive"}</span>
      <div style="display:flex;gap:6px;">
        <button class="form-action-btn" onclick="toggleAccountActive('${a._id}',${a.isActive})">${a.isActive?"Deactivate":"Activate"}</button>
      </div>
    </div>`).join("");
}

function toggleAccountActive(id, current) {
  db.collection("chartOfAccounts").doc(id).update({ isActive: !current }).then(() => {
    let a = chartOfAccounts.find(x => x._id === id);
    if (a) a.isActive = !current;
    let list = document.getElementById("coa-list");
    if (list) list.innerHTML = renderCOARows();
  });
}

function openAddAccountModal() {
  document.getElementById("add-account-modal").style.display = "flex";
}
function closeAddAccountModal() {
  document.getElementById("add-account-modal").style.display = "none";
}

function onAddAccountTypeChange() {
  let type = document.getElementById("aa-type").value;
  let ranges = {
    asset:"100-199", liability:"200-299", equity:"300-399",
    revenue:"400-499", cogs:"500-599", expense:"600-699", tax:"800-899"
  };
  let hint = document.getElementById("aa-number-hint");
  if (hint) hint.textContent = "Range: " + (ranges[type] || "");

  // Auto-suggest next number
  let existing = chartOfAccounts.filter(a => a.type === type).map(a => parseInt(a.number));
  let starts   = { asset:100, liability:200, equity:300, revenue:400, cogs:500, expense:600, tax:800 };
  let base     = starts[type] || 100;
  let next     = base;
  while (existing.includes(next)) next++;
  document.getElementById("aa-number").value = next;
}

function saveNewAccount() {
  let number = document.getElementById("aa-number").value.trim();
  let name   = document.getElementById("aa-name").value.trim();
  let type   = document.getElementById("aa-type").value;
  let sub    = document.getElementById("aa-subtype").value;
  let nb     = document.getElementById("aa-normal").value;

  if (!number) { alert("Please enter an account number."); return; }
  if (!name)   { alert("Please enter an account name."); return; }
  if (chartOfAccounts.find(a => a.number === number)) {
    alert("Account number " + number + " already exists."); return;
  }

  db.collection("chartOfAccounts").add({
    number, name, type, subType: sub, normalBalance: nb,
    isActive: true, createdAt: firebase.firestore.FieldValue.serverTimestamp()
  }).then(ref => {
    chartOfAccounts.push({ _id: ref.id, number, name, type, subType: sub, normalBalance: nb, isActive: true });
    chartOfAccounts.sort((a,b) => parseInt(a.number) - parseInt(b.number));
    closeAddAccountModal();
    let list = document.getElementById("coa-list");
    if (list) list.innerHTML = renderCOARows();
  }).catch(e => alert("Failed: " + e.message));
}


// ══════════════════════════════════════
//  ACCOUNT SCOPING PER COMPANY
// ══════════════════════════════════════

let companyActiveAccounts = null; // null = all accounts active

// Open account scope selector for a period
function openAccountScopeModal(periodId, periodLabel) {
  currentPeriodId    = periodId;
  currentPeriodLabel = periodLabel;

  // Load existing scope from Firebase
  db.collection("clientLedger").doc(finClientId)
    .collection("periods").doc(periodId).get().then(doc => {
      let saved = doc.exists && doc.data().activeAccountIds
        ? doc.data().activeAccountIds
        : null;

      // Build modal content
      let modal = document.getElementById("account-scope-modal");
      let list  = document.getElementById("scope-account-list");
      list.innerHTML = "";

      // Group by type
      let groups = {};
      chartOfAccounts.forEach(a => {
        if (!groups[a.type]) groups[a.type] = [];
        groups[a.type].push(a);
      });

      let typeLabels = {
        asset:"Assets", liability:"Liabilities", equity:"Equity",
        revenue:"Revenue", cogs:"Cost of Goods Sold",
        expense:"Operating Expenses", tax:"Income Tax"
      };

      Object.keys(typeLabels).forEach(type => {
        if (!groups[type]) return;
        let section = document.createElement("div");
        section.className = "scope-section";
        section.innerHTML = `<div class="scope-section-label">${typeLabels[type]}</div>`;

        groups[type].forEach(a => {
          let checked = saved === null || saved.includes(a._id);
          let item = document.createElement("label");
          item.className = "scope-item";
          item.innerHTML = `
            <input type="checkbox" value="${a._id}" ${checked ? "checked" : ""}>
            <span class="scope-acct-num">${a.number}</span>
            <span class="scope-acct-name">${a.name}</span>`;
          section.appendChild(item);
        });

        list.appendChild(section);
      });

      modal.style.display = "flex";
    });
}

function closeAccountScopeModal() {
  document.getElementById("account-scope-modal").style.display = "none";
}

function selectAllScope(checked) {
  document.querySelectorAll("#scope-account-list input[type=checkbox]")
    .forEach(cb => cb.checked = checked);
}

function saveAccountScope() {
  let checked = Array.from(
    document.querySelectorAll("#scope-account-list input[type=checkbox]:checked")
  ).map(cb => cb.value);

  db.collection("clientLedger").doc(finClientId)
    .collection("periods").doc(currentPeriodId)
    .update({ activeAccountIds: checked })
    .then(() => {
      closeAccountScopeModal();
      alert("Account scope saved for this period.");
    }).catch(e => alert("Failed: " + e.message));
}


// ══════════════════════════════════════
//  PER-STATEMENT ACCOUNT FILTER
// ══════════════════════════════════════

let stmtHiddenAccounts = new Set(); // account IDs hidden in current statement view

function openStmtFilterPanel() {
  let panel = document.getElementById("stmt-filter-panel");
  if (!panel) return;

  let accounts = window._finData ? window._finData.accounts : [];
  if (!accounts.length) { alert("No accounts with activity to filter."); return; }

  let html = `
    <div class="filter-panel-header">
      <strong>Show / Hide Accounts</strong>
      <div style="display:flex;gap:6px;">
        <button class="ghost-btn" onclick="selectAllStmtFilter(true)">All</button>
        <button class="ghost-btn" onclick="selectAllStmtFilter(false)">None</button>
        <button class="primary-btn" onclick="applyStmtFilter()">Apply</button>
        <button class="modal-close" onclick="closeStmtFilterPanel()">✕</button>
      </div>
    </div>`;

  let groups = {};
  accounts.forEach(a => {
    let g = a.type;
    if (!groups[g]) groups[g] = [];
    groups[g].push(a);
  });

  let typeLabels = {
    asset:"Assets", liability:"Liabilities", equity:"Equity",
    revenue:"Revenue", cogs:"COGS", expense:"Expenses", tax:"Tax"
  };

  Object.keys(groups).forEach(type => {
    html += `<div class="scope-section-label">${typeLabels[type]||type}</div>`;
    groups[type].forEach(a => {
      let hidden = stmtHiddenAccounts.has(a._id);
      html += `<label class="scope-item">
        <input type="checkbox" id="sf-${a._id}" ${!hidden?"checked":""}>
        <span class="scope-acct-num">${a.number}</span>
        <span class="scope-acct-name">${a.name}</span>
        <span class="scope-acct-bal">$${fmtMoney(a.balance)}</span>
      </label>`;
    });
  });

  panel.innerHTML = html;
  panel.style.display = "block";
}

function closeStmtFilterPanel() {
  let panel = document.getElementById("stmt-filter-panel");
  if (panel) panel.style.display = "none";
}

function selectAllStmtFilter(checked) {
  document.querySelectorAll("#stmt-filter-panel input[type=checkbox]")
    .forEach(cb => cb.checked = checked);
}

function applyStmtFilter() {
  stmtHiddenAccounts = new Set();
  document.querySelectorAll("#stmt-filter-panel input[type=checkbox]")
    .forEach(cb => { if (!cb.checked) stmtHiddenAccounts.add(cb.id.replace("sf-","")); });

  closeStmtFilterPanel();

  // Re-render current statement with filter applied
  let filteredAccounts = (window._finData ? window._finData.accounts : [])
    .filter(a => !stmtHiddenAccounts.has(a._id));

  // Temp swap data, re-render, restore
  let origAccounts = window._finData.accounts;
  window._finData.accounts = filteredAccounts;

  let activeTab = document.querySelector(".stmt-tab.active");
  if (activeTab) activeTab.click();

  window._finData.accounts = origAccounts;
}


// ══════════════════════════════════════
//  PATCH: inject scope + filter buttons
//  into openStatements toolbar
// ══════════════════════════════════════

const _origOpenStatements = openStatements;
async function openStatements(periodId, periodLabel) {
  stmtHiddenAccounts = new Set(); // reset filter on new open
  await _origOpenStatements(periodId, periodLabel);

  // Inject filter button and scope button into toolbar
  let toolbar = document.querySelector(".fin-client-toolbar .editor-actions, .fin-client-toolbar div:last-child");
  if (!toolbar) {
    // Find the actions div in the toolbar
    let toolbars = document.querySelectorAll(".fin-client-toolbar");
    if (toolbars.length) {
      let lastToolbar = toolbars[toolbars.length - 1];
      let actionsDiv  = lastToolbar.querySelector("div:last-child");
      if (actionsDiv) {
        let filterBtn = document.createElement("button");
        filterBtn.className = "ghost-btn";
        filterBtn.textContent = "Filter Accounts ▾";
        filterBtn.onclick = openStmtFilterPanel;
        actionsDiv.insertBefore(filterBtn, actionsDiv.firstChild);

        let scopeBtn = document.createElement("button");
        scopeBtn.className = "ghost-btn";
        scopeBtn.textContent = "Account Scope";
        scopeBtn.onclick = () => openAccountScopeModal(periodId, periodLabel);
        actionsDiv.insertBefore(scopeBtn, actionsDiv.firstChild);
      }
    }
  }

  // Add filter panel container below stmt tabs
  let stmtContent = document.getElementById("stmt-content");
  if (stmtContent) {
    let panel = document.createElement("div");
    panel.id = "stmt-filter-panel";
    panel.className = "stmt-filter-panel";
    panel.style.display = "none";
    stmtContent.parentNode.insertBefore(panel, stmtContent);
  }
}
