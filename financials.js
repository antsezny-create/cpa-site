// ══════════════════════════════════════
//  CHART OF ACCOUNTS — Master List
// ══════════════════════════════════════
const MASTER_COA = [
  { number:"100", name:"Cash and Cash Equivalents",    type:"asset",     subType:"current_asset",       normalBalance:"debit",  isActive:true },
  { number:"110", name:"Accounts Receivable",          type:"asset",     subType:"current_asset",       normalBalance:"debit",  isActive:true },
  { number:"120", name:"Inventory",                    type:"asset",     subType:"current_asset",       normalBalance:"debit",  isActive:true },
  { number:"130", name:"Prepaid Expenses",             type:"asset",     subType:"current_asset",       normalBalance:"debit",  isActive:true },
  { number:"140", name:"Other Current Assets",         type:"asset",     subType:"current_asset",       normalBalance:"debit",  isActive:true },
  { number:"150", name:"Property, Plant & Equipment",  type:"asset",     subType:"fixed_asset",         normalBalance:"debit",  isActive:true },
  { number:"160", name:"Accumulated Depreciation",     type:"asset",     subType:"contra_asset",        normalBalance:"credit", isActive:true },
  { number:"170", name:"Intangible Assets",            type:"asset",     subType:"other_asset",         normalBalance:"debit",  isActive:true },
  { number:"180", name:"Other Long-Term Assets",       type:"asset",     subType:"other_asset",         normalBalance:"debit",  isActive:true },
  { number:"200", name:"Accounts Payable",             type:"liability", subType:"current_liability",   normalBalance:"credit", isActive:true },
  { number:"210", name:"Accrued Liabilities",          type:"liability", subType:"current_liability",   normalBalance:"credit", isActive:true },
  { number:"220", name:"Notes Payable - Current",      type:"liability", subType:"current_liability",   normalBalance:"credit", isActive:true },
  { number:"230", name:"Deferred Revenue",             type:"liability", subType:"current_liability",   normalBalance:"credit", isActive:true },
  { number:"240", name:"Other Current Liabilities",    type:"liability", subType:"current_liability",   normalBalance:"credit", isActive:true },
  { number:"250", name:"Notes Payable - Long Term",    type:"liability", subType:"long_term_liability",  normalBalance:"credit", isActive:true },
  { number:"260", name:"Other Long-Term Liabilities",  type:"liability", subType:"long_term_liability",  normalBalance:"credit", isActive:true },
  { number:"300", name:"Common Stock",                 type:"equity",    subType:"paid_in_capital",     normalBalance:"credit", isActive:true },
  { number:"310", name:"Additional Paid-In Capital",   type:"equity",    subType:"paid_in_capital",     normalBalance:"credit", isActive:true },
  { number:"320", name:"Retained Earnings",            type:"equity",    subType:"retained_earnings",   normalBalance:"credit", isActive:true },
  { number:"330", name:"Dividends / Distributions",    type:"equity",    subType:"distributions",       normalBalance:"debit",  isActive:true },
  { number:"340", name:"Treasury Stock",               type:"equity",    subType:"contra_equity",       normalBalance:"debit",  isActive:true },
  { number:"400", name:"Revenue / Sales",              type:"revenue",   subType:"operating_revenue",   normalBalance:"credit", isActive:true },
  { number:"410", name:"Service Revenue",              type:"revenue",   subType:"operating_revenue",   normalBalance:"credit", isActive:true },
  { number:"420", name:"Other Income",                 type:"revenue",   subType:"other_revenue",       normalBalance:"credit", isActive:true },
  { number:"430", name:"Interest Income",              type:"revenue",   subType:"other_revenue",       normalBalance:"credit", isActive:true },
  { number:"500", name:"Cost of Goods Sold",           type:"cogs",      subType:"cogs",                normalBalance:"debit",  isActive:true },
  { number:"510", name:"Direct Labor",                 type:"cogs",      subType:"cogs",                normalBalance:"debit",  isActive:true },
  { number:"520", name:"Manufacturing Overhead",       type:"cogs",      subType:"cogs",                normalBalance:"debit",  isActive:true },
  { number:"600", name:"Salaries & Wages",             type:"expense",   subType:"operating_expense",   normalBalance:"debit",  isActive:true },
  { number:"610", name:"Rent Expense",                 type:"expense",   subType:"operating_expense",   normalBalance:"debit",  isActive:true },
  { number:"620", name:"Utilities",                    type:"expense",   subType:"operating_expense",   normalBalance:"debit",  isActive:true },
  { number:"630", name:"Insurance",                    type:"expense",   subType:"operating_expense",   normalBalance:"debit",  isActive:true },
  { number:"640", name:"Depreciation Expense",         type:"expense",   subType:"operating_expense",   normalBalance:"debit",  isActive:true },
  { number:"650", name:"Amortization Expense",         type:"expense",   subType:"operating_expense",   normalBalance:"debit",  isActive:true },
  { number:"660", name:"Office Supplies",              type:"expense",   subType:"operating_expense",   normalBalance:"debit",  isActive:true },
  { number:"670", name:"Marketing & Advertising",      type:"expense",   subType:"operating_expense",   normalBalance:"debit",  isActive:true },
  { number:"680", name:"Professional Fees",            type:"expense",   subType:"operating_expense",   normalBalance:"debit",  isActive:true },
  { number:"690", name:"Other Operating Expenses",     type:"expense",   subType:"operating_expense",   normalBalance:"debit",  isActive:true },
  { number:"700", name:"Interest Expense",             type:"expense",   subType:"other_expense",       normalBalance:"debit",  isActive:true },
  { number:"710", name:"Loss on Sale of Assets",       type:"expense",   subType:"other_expense",       normalBalance:"debit",  isActive:true },
  { number:"720", name:"Other Non-Operating Expenses", type:"expense",   subType:"other_expense",       normalBalance:"debit",  isActive:true },
  { number:"800", name:"Income Tax Expense",           type:"tax",       subType:"tax",                 normalBalance:"debit",  isActive:true },
];

let chartOfAccounts = [];
let coaLoaded = false;

// ── ENTITY BAR — global accounting context ──
const ACCOUNTING_TABS = ['gl','is','bs','scf','sshe','master-accounts','trial-balance','import','manual-stmt'];

let activeEntity = {
  clientId:    null,
  clientName:  null,
  periodId:    null,
  periodLabel: null,
  periodType:  null
};

// ══════════════════════════════════════
//  GROUPED ACCOUNT DROPDOWN BUILDER
//  Used in journal entry forms — groups by account type with optgroup labels
// ══════════════════════════════════════
function buildGroupedAccountOptions() {
  const groups = [
    { label: "── ASSETS ──",             filter: a => a.type === "asset" },
    { label: "── LIABILITIES ──",        filter: a => a.type === "liability" },
    { label: "── EQUITY ──",             filter: a => a.type === "equity" },
    { label: "── REVENUE ──",            filter: a => a.type === "revenue" },
    { label: "── COST OF GOODS SOLD ──", filter: a => a.type === "cogs" },
    { label: "── OPERATING EXPENSES ──", filter: a => a.type === "expense" && a.subType === "operating_expense" },
    { label: "── OTHER EXPENSES ──",     filter: a => a.type === "expense" && a.subType === "other_expense" },
    { label: "── INCOME TAX ──",         filter: a => a.type === "tax" },
  ];
  return groups.map(g => {
    let accts = chartOfAccounts.filter(a => a.isActive !== false && g.filter(a));
    if (!accts.length) return "";
    return `<optgroup label="${g.label}">` +
      accts.map(a => `<option value="${a._id}" data-number="${a.number}" data-name="${a.name}">${a.number} · ${a.name}</option>`).join("") +
      `</optgroup>`;
  }).join("");
}

async function initChartOfAccounts() {
  if (coaLoaded) return;
  let snap = await db.collection("chartOfAccounts").get();
  if (snap.empty) {
    let batch = db.batch();
    MASTER_COA.forEach(a => {
      let ref = db.collection("chartOfAccounts").doc();
      batch.set(ref, { ...a, isCore: true, createdAt: firebase.firestore.FieldValue.serverTimestamp() });
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
//  SHARED HELPERS
// ══════════════════════════════════════

function fmtMoney(n) {
  if (n === null || n === undefined) return "0.00";
  if (n < 0) return `(${Math.abs(n).toLocaleString("en-US",{minimumFractionDigits:2})})`;
  return n.toLocaleString("en-US",{minimumFractionDigits:2});
}

function buildClientPeriodSelectors(containerId, onChangeFn) {
  let el = document.getElementById(containerId);
  if (!el) return;

  let clientOpts = clients.map(c =>
    `<option value="${c.uid}">${c.name}</option>`).join("");

  el.innerHTML = `
    <div class="acct-selectors">
      <div class="acct-selector-group">
        <label>Client</label>
        <select id="${containerId}-client" class="assign-select" onchange="${onChangeFn}('client')">
          <option value="">— Select Client —</option>
          ${clientOpts}
        </select>
      </div>
      <div class="acct-selector-group">
        <label>Period</label>
        <select id="${containerId}-period" class="assign-select" onchange="${onChangeFn}('period')" disabled>
          <option value="">— Select Period —</option>
        </select>
      </div>
    </div>`;
}

async function loadPeriodsForClient(clientId, periodSelectId) {
  let sel = document.getElementById(periodSelectId);
  if (!sel) return;
  sel.disabled = true;
  sel.innerHTML = `<option value="">Loading...</option>`;

  let periodsRef = db.collection("clientLedger").doc(clientId).collection("periods");
  let snap = await periodsRef.get();

  // ── Auto-create standard periods if none exist ──
  if (snap.empty) {
    let now        = new Date().getFullYear();
    let client     = clients.find(c => c.uid === clientId);
    let clientName = client ? client.name : "";
    let batch      = db.batch();

    // Current year + 2 years back
    for (let y = now; y >= now - 2; y--) {
      let ref = periodsRef.doc("fy" + y);
      batch.set(ref, {
        periodLabel:  "FY " + y,
        period:       "FY " + y,
        periodType:   "annual",
        companyName:  clientName,
        taxYear:      y,
        createdAt:    firebase.firestore.FieldValue.serverTimestamp()
      });
    }
    await batch.commit();
    // Re-fetch after creation
    snap = await periodsRef.get();
  }

  let currentYear = new Date().getFullYear().toString();
  let bestMatch   = null;

  // Build sorted options — most recent year first
  let periods = [];
  snap.forEach(doc => { let d = doc.data(); d._id = doc.id; periods.push(d); });
  periods.sort((a, b) => (b.taxYear || 0) - (a.taxYear || 0));

  sel.innerHTML = `<option value="">— Select Period —</option>`;

  periods.forEach(p => {
    let opt = document.createElement("option");
    opt.value = p._id;
    opt.textContent = p.periodLabel || p.period;
    opt.dataset.companyName = p.companyName || "";
    opt.dataset.periodType  = p.periodType  || "annual";
    sel.appendChild(opt);
    // Auto-select the period matching current year
    if ((p.periodLabel || p.period || "").includes(currentYear)) {
      bestMatch = opt;
    }
  });

  // If no current-year match, auto-select the most recent
  if (!bestMatch && sel.options.length > 1) {
    bestMatch = sel.options[1]; // index 0 is the placeholder
  }

  if (bestMatch) {
    bestMatch.selected = true;
    // Fire the change event so the tab loads automatically
    setTimeout(function() {
      sel.dispatchEvent(new Event("change"));
    }, 50);
  }
  sel.disabled = false;

  // Add "+ Add Period" option at the bottom
  let addOpt = document.createElement("option");
  addOpt.value = "__add__";
  addOpt.textContent = "+ Add Period";
  sel.appendChild(addOpt);

  // Intercept + Add Period without overriding the existing onchange handler
  // We use a capturing listener that resets the value before the original fires
  sel.addEventListener("change", function handleAddPeriod(e) {
    if (sel.value !== "__add__") return;
    // Reset to previous valid value immediately
    sel.value = bestMatch ? bestMatch.value : "";
    showInputModal({
      title: "Add Period",
      fields: [
        { id:"year", label:"Tax Year", type:"number", placeholder:"e.g. 2022", value: new Date().getFullYear() - 3 },
        { id:"type", label:"Period Type", placeholder:"annual" }
      ],
      confirmText: "Add",
      onConfirm: async function(vals) {
        let year = parseInt(vals.year);
        let type = vals.type.trim() || "annual";
        if (!year || isNaN(year)) { toast("Please enter a valid year", "warning"); return; }
        let client     = clients.find(c => c.uid === clientId);
        let clientName = client ? client.name : "";
        let label      = "FY " + year;
        if (type === "quarterly") label = "Q1 " + year;
        if (type === "monthly")   label = "Jan " + year;
        let ref = periodsRef.doc("fy" + year);
        await ref.set({
          periodLabel: label,
          period:      label,
          periodType:  type,
          companyName: clientName,
          taxYear:     year,
          createdAt:   firebase.firestore.FieldValue.serverTimestamp()
        });
        toast("Period " + label + " added", "success");
        await loadPeriodsForClient(clientId, periodSelectId);
      }
    });
  }, true); // capture phase so we intercept before original handler
}

// ══════════════════════════════════════
//  ENTITY BAR FUNCTIONS
// ══════════════════════════════════════

function initEntityBar() {
  let sel = document.getElementById("entity-client-sel");
  if (!sel) return;
  let prev = sel.value;
  sel.innerHTML = `<option value="">— Select Client —</option>`;
  clients.forEach(c => {
    let opt = document.createElement("option");
    opt.value = c.uid;
    opt.textContent = c.name;
    sel.appendChild(opt);
  });
  // Restore previous selection
  if (activeEntity.clientId) {
    sel.value = activeEntity.clientId;
    _restoreEntityPeriodSel();
  } else if (prev) {
    sel.value = prev;
  }
  updateEntityBarStatus();
}

async function _restoreEntityPeriodSel() {
  if (!activeEntity.clientId) return;
  let periodSel = document.getElementById("entity-period-sel");
  if (!periodSel) return;
  // Build period options without triggering auto-load
  let snap = await db.collection("clientLedger").doc(activeEntity.clientId).collection("periods").get();
  let periods = [];
  snap.forEach(doc => { let d = doc.data(); d._id = doc.id; periods.push(d); });
  periods.sort((a, b) => (b.taxYear || 0) - (a.taxYear || 0));
  periodSel.innerHTML = `<option value="">— Select Period —</option>`;
  periods.forEach(p => {
    let opt = document.createElement("option");
    opt.value = p._id;
    opt.textContent = p.periodLabel || p.period;
    opt.dataset.periodType  = p.periodType  || "annual";
    opt.dataset.companyName = p.companyName || "";
    periodSel.appendChild(opt);
  });
  if (activeEntity.periodId) periodSel.value = activeEntity.periodId;
  periodSel.disabled = false;
}

async function onEntityClientChange() {
  let sel = document.getElementById("entity-client-sel");
  activeEntity.clientId   = sel.value;
  activeEntity.clientName = sel.options[sel.selectedIndex]?.textContent || "";
  activeEntity.periodId    = null;
  activeEntity.periodLabel = null;
  activeEntity.periodType  = null;

  let periodSel = document.getElementById("entity-period-sel");
  if (!activeEntity.clientId) {
    periodSel.disabled = true;
    periodSel.innerHTML = `<option value="">— Select Period —</option>`;
    updateEntityBarStatus();
    return;
  }
  await loadPeriodsForClient(activeEntity.clientId, "entity-period-sel");
  updateEntityBarStatus();
}

async function onEntityPeriodChange() {
  let sel = document.getElementById("entity-period-sel");
  if (!sel || sel.value === "__add__") return;
  let opt = sel.options[sel.selectedIndex];
  activeEntity.periodId    = sel.value;
  activeEntity.periodLabel = opt?.textContent || "";
  activeEntity.periodType  = opt?.dataset.periodType || "annual";
  updateEntityBarStatus();
  refreshCurrentAccountingTab();
}

function updateEntityBarStatus() {
  let el = document.getElementById("entity-bar-status");
  if (!el) return;
  if (activeEntity.clientId && activeEntity.periodId) {
    el.innerHTML = `<span class="entity-ready-badge">✓ ${esc(activeEntity.clientName)} · ${esc(activeEntity.periodLabel)}</span>`;
  } else if (activeEntity.clientId) {
    el.innerHTML = `<span style="color:var(--text-dim);font-size:12px;">Select a period →</span>`;
  } else {
    el.innerHTML = "";
  }
}

function refreshCurrentAccountingTab() {
  for (let name of ACCOUNTING_TABS) {
    let el = document.getElementById("tab-" + name);
    if (el && el.style.display !== "none") {
      if (name === "gl") {
        glClientId = activeEntity.clientId;
        glPeriodId = activeEntity.periodId;
        loadGLEntries();
      } else if (['is','bs','scf','sshe'].includes(name)) {
        onStmtPeriodChange(name);
      } else if (name === "trial-balance") {
        loadTBFromEntity();
      } else if (name === "import") {
        refreshImportForEntity();
      } else if (name === "manual-stmt") {
        refreshManualStmtForEntity();
      }
      break;
    }
  }
}

async function _loadCompareDropdown(tabId) {
  if (!activeEntity.clientId) return;
  let sel = document.getElementById(tabId + "-compare");
  if (!sel) return;
  let snap = await db.collection("clientLedger").doc(activeEntity.clientId).collection("periods").get();
  let periods = [];
  snap.forEach(doc => { let d = doc.data(); d._id = doc.id; periods.push(d); });
  periods.sort((a, b) => (b.taxYear || 0) - (a.taxYear || 0));
  sel.innerHTML = `<option value="">— No Comparison —</option>`;
  periods.forEach(p => {
    let opt = document.createElement("option");
    opt.value = p._id;
    opt.textContent = p.periodLabel || p.period;
    opt.dataset.periodType  = p.periodType  || "annual";
    opt.dataset.companyName = p.companyName || "";
    sel.appendChild(opt);
  });
  sel.disabled = false;
}

async function computeBalances(clientId, periodId, dateFrom, dateTo) {
  let snap = await db.collection("journalEntries")
    .where("clientId", "==", clientId)
    .where("periodId", "==", periodId)
    .get();

  let balMap = {};
  chartOfAccounts.forEach(a => {
    balMap[a._id] = { ...a, debit:0, credit:0, balance:0 };
  });

  snap.forEach(doc => {
    let e = doc.data();

    // Exclude drafts from financial statement calculations
    if (e.status === "draft") return;

    // Date range filter — only include entries within the period's date range
    if (e.entryDate && (dateFrom || dateTo)) {
      let entryDate = new Date(e.entryDate.seconds * 1000).toISOString().slice(0,10);
      if (dateFrom && entryDate < dateFrom) return;
      if (dateTo   && entryDate > dateTo)   return;
    }

    e.lines.forEach(line => {
      if (!balMap[line.accountId]) {
        balMap[line.accountId] = {
          _id: line.accountId, number: line.accountNumber,
          name: line.accountName, type:"expense",
          subType:"operating_expense", normalBalance:"debit",
          debit:0, credit:0, balance:0
        };
      }
      balMap[line.accountId].debit  += parseFloat(line.debit)  || 0;
      balMap[line.accountId].credit += parseFloat(line.credit) || 0;
    });
  });

  Object.values(balMap).forEach(a => {
    a.balance = a.normalBalance === "debit" ? a.debit - a.credit : a.credit - a.debit;
  });

  return Object.values(balMap)
    .filter(a => a.debit > 0 || a.credit > 0)
    .sort((a,b) => parseInt(a.number) - parseInt(b.number));
}

// Get date range for a period based on its type and label
function getPeriodDateRange(periodLabel, periodType) {
  if (!periodLabel || !periodType) return { from: null, to: null };

  let year = periodLabel.match(/\d{4}/)?.[0];
  if (!year) return { from: null, to: null };

  if (periodType === "annual") {
    return { from: `${year}-01-01`, to: `${year}-12-31` };
  }
  if (periodType === "quarterly") {
    let q = periodLabel.match(/Q(\d)/)?.[1];
    if (!q) return { from: null, to: null };
    let ranges = { "1":["01-01","03-31"], "2":["04-01","06-30"], "3":["07-01","09-30"], "4":["10-01","12-31"] };
    let r = ranges[q];
    return r ? { from:`${year}-${r[0]}`, to:`${year}-${r[1]}` } : { from:null, to:null };
  }
  if (periodType === "monthly") {
    let months = { Jan:"01",Feb:"02",Mar:"03",Apr:"04",May:"05",Jun:"06",
                   Jul:"07",Aug:"08",Sep:"09",Oct:"10",Nov:"11",Dec:"12" };
    let monthAbbr = periodLabel.match(/[A-Z][a-z]{2}/)?.[0];
    let monthNum  = months[monthAbbr];
    if (!monthNum) return { from:null, to:null };
    let daysInMonth = new Date(parseInt(year), parseInt(monthNum), 0).getDate();
    return { from:`${year}-${monthNum}-01`, to:`${year}-${monthNum}-${daysInMonth}` };
  }
  return { from: null, to: null };
}

// ══════════════════════════════════════
//  STATEMENT RENDERING HELPERS
// ══════════════════════════════════════

function stmtRow(number, name, amount, indent, bold, total, editable, id, priorAmt) {
  let yoy        = priorAmt !== undefined && priorAmt !== null;
  let cls        = `stmt-row ${bold?"stmt-bold":""} ${total?"stmt-total":""} ${yoy?"stmt-row-yoy":""}`;
  let amtDisplay = amount !== null ? "$" + fmtMoney(amount) : "";

  if (editable && !yoy) {
    return `<div class="${cls}" style="padding-left:${indent}px">
      <span class="stmt-acct-num">${number||""}</span>
      <span class="stmt-acct-name">${name}</span>
      <input class="stmt-edit-input" type="number" value="${amount||0}" step="0.01"
        data-id="${id||""}" onchange="onStmtEdit(this)">
    </div>`;
  }

  if (yoy) {
    let priorDisplay = "$" + fmtMoney(priorAmt);
    let chg = "", chgCls = "stmt-yoy-chg";
    if (priorAmt !== 0) {
      let pct = (amount - priorAmt) / Math.abs(priorAmt) * 100;
      chg    = (pct >= 0 ? "+" : "") + pct.toFixed(1) + "%";
      chgCls += pct >= 0 ? " stmt-yoy-pos" : " stmt-yoy-neg";
    } else if (amount !== 0) {
      chg = "New"; chgCls += " stmt-yoy-pos";
    }
    return `<div class="${cls}" style="padding-left:${indent}px">
      <span class="stmt-acct-num">${number||""}</span>
      <span class="stmt-acct-name">${name}</span>
      <span class="stmt-acct-amt stmt-yoy-prior">${priorDisplay}</span>
      <span class="stmt-acct-amt">${amtDisplay}</span>
      <span class="${chgCls}">${chg}</span>
    </div>`;
  }

  return `<div class="${cls}" style="padding-left:${indent}px">
    <span class="stmt-acct-num">${number||""}</span>
    <span class="stmt-acct-name">${name}</span>
    <span class="stmt-acct-amt">${amtDisplay}</span>
  </div>`;
}

function stmtSection(title) { return `<div class="stmt-section-header">${title}</div>`; }
function stmtDivider()      { return `<div class="stmt-divider"></div>`; }

let stmtEditMode = false;
let stmtOverrides = {}; // accountId → overridden balance

function toggleStmtEditMode(btn) {
  stmtEditMode = !stmtEditMode;
  btn.textContent = stmtEditMode ? "✓ Done Editing" : "Edit Numbers";
  btn.className   = stmtEditMode ? "primary-btn" : "ghost-btn";
  if (!window._finData) return;
  let { accounts, periodLabel, clientName, tabId } = window._finData;
  let activeTabId = tabId || window._currentTabId;
  if (!activeTabId) return;
  renderCurrentStatement(activeTabId, accounts, periodLabel, clientName);
}

function onStmtEdit(input) {
  let id  = input.dataset.id;
  let val = parseFloat(input.value) || 0;
  stmtOverrides[id] = val;
}

function getBalance(account) {
  return stmtOverrides[account._id] !== undefined
    ? stmtOverrides[account._id]
    : account.balance;
}

// ══════════════════════════════════════
//  STATEMENT HEADER BUILDER
// ══════════════════════════════════════

function buildStatementHeader(tabId, containerId, stmtTitle, periodHint, onLoadFn) {
  let el = document.getElementById(containerId);
  if (!el) return;

  el.innerHTML = `
    <div class="acct-selectors">
      <div class="acct-selector-group">
        <label>Compare to (optional)</label>
        <select id="${tabId}-compare" class="assign-select" disabled onchange="onStmtComparePeriodChange('${tabId}')">
          <option value="">— No Comparison —</option>
        </select>
      </div>
      <div class="acct-selector-group" style="align-self:flex-end;">
        <button class="ghost-btn" id="${tabId}-export-btn" onclick="exportCurrentStatement('${tabId}')" style="display:none;">Export Excel ↓</button>
      </div>
      <div class="acct-selector-group" style="align-self:flex-end;">
        <button class="primary-btn" id="${tabId}-publish-btn" onclick="publishCurrentStatement('${tabId}')" style="display:none;">Publish to Portal</button>
      </div>
    </div>
    <div id="${tabId}-stmt-output" style="margin-top:24px;"></div>`;

  if (activeEntity.clientId && activeEntity.periodId) {
    onStmtPeriodChange(tabId);
    _loadCompareDropdown(tabId);
  } else {
    let out = document.getElementById(tabId + "-stmt-output");
    if (out) out.innerHTML = `<div style="padding:32px;text-align:center;color:var(--text-dim);font-size:13px;">Select a client and period in the entity bar above.</div>`;
  }
}

async function onStmtClientChange(tabId) {
  let clientSel  = document.getElementById(tabId + "-client");
  let periodSel  = document.getElementById(tabId + "-period");
  let compareSel = document.getElementById(tabId + "-compare");
  if (!clientSel || !periodSel) return;
  let clientId = clientSel.value;
  if (!clientId) {
    periodSel.disabled  = true;
    periodSel.innerHTML = `<option value="">— Select Period —</option>`;
    if (compareSel) { compareSel.disabled = true; compareSel.innerHTML = `<option value="">— No Comparison —</option>`; }
    return;
  }
  await loadPeriodsForClient(clientId, tabId + "-period");
  periodSel.disabled = false;
  // Mirror periods into compare dropdown (exclude the "+ Add Period" entry)
  if (compareSel) {
    compareSel.innerHTML = `<option value="">— No Comparison —</option>`;
    Array.from(periodSel.options).forEach(opt => {
      if (opt.value && opt.value !== "__add__") {
        let o = document.createElement("option");
        o.value = opt.value;
        o.textContent = opt.textContent;
        o.dataset.companyName = opt.dataset.companyName || "";
        o.dataset.periodType  = opt.dataset.periodType  || "annual";
        compareSel.appendChild(o);
      }
    });
    compareSel.disabled = false;
  }
}

async function onStmtPeriodChange(tabId) {
  let clientId    = activeEntity.clientId;
  let periodId    = activeEntity.periodId;
  let periodLabel = activeEntity.periodLabel;
  let companyName = activeEntity.clientName;
  let periodType  = activeEntity.periodType;
  if (!clientId || !periodId) return;

  stmtOverrides = {};
  stmtEditMode  = false;
  window._currentTabId = tabId;

  // Reset comparison when current period changes
  let compareSel = document.getElementById(tabId + "-compare");
  if (compareSel) compareSel.value = "";

  let output = document.getElementById(tabId + "-stmt-output");
  if (output) output.innerHTML = `<div style="padding:32px;text-align:center;color:var(--text-dim);font-size:13px;">Computing from journal entries...</div>`;

  await initChartOfAccounts();

  // Get date range for this period and filter entries accordingly
  let { from, to } = getPeriodDateRange(periodLabel, periodType);
  let accounts = await computeBalances(clientId, periodId, from, to);

  window._finData = { accounts, periodLabel, clientName: companyName, clientId, periodId, tabId, priorAccounts: null, priorPeriodLabel: null };

  // Show action buttons
  ["export-btn","publish-btn"].forEach(id => {
    let btn = document.getElementById(tabId + "-" + id);
    if (btn) btn.style.display = "inline-flex";
  });

  renderCurrentStatement(tabId, accounts, periodLabel, companyName);
}

function renderCurrentStatement(tabId, accounts, periodLabel, companyName) {
  let prior      = window._finData?.priorAccounts    || null;
  let priorLabel = window._finData?.priorPeriodLabel || null;
  if (tabId === "is")   renderIS(accounts, periodLabel, companyName, prior, priorLabel);
  if (tabId === "bs")   renderBS(accounts, periodLabel, companyName, prior, priorLabel);
  if (tabId === "scf")  renderSCF(accounts, periodLabel, companyName, prior, priorLabel);
  if (tabId === "sshe") renderSSHE(accounts, periodLabel, companyName, prior, priorLabel);
}

async function onStmtComparePeriodChange(tabId) {
  let compareSel = document.getElementById(tabId + "-compare");
  if (!compareSel || !window._finData) return;

  let clientId      = activeEntity.clientId;
  let comparePeriod = compareSel.value;

  if (!comparePeriod) {
    window._finData.priorAccounts    = null;
    window._finData.priorPeriodLabel = null;
  } else {
    let priorLabel = compareSel.options[compareSel.selectedIndex]?.textContent || "";
    let priorType  = compareSel.options[compareSel.selectedIndex]?.dataset.periodType || "annual";
    let output = document.getElementById(tabId + "-stmt-output");
    if (output) output.innerHTML = `<div style="padding:32px;text-align:center;color:var(--text-dim);font-size:13px;">Loading comparison data...</div>`;
    let { from, to } = getPeriodDateRange(priorLabel, priorType);
    let priorAccounts = await computeBalances(clientId, comparePeriod, from, to);
    window._finData.priorAccounts    = priorAccounts;
    window._finData.priorPeriodLabel = priorLabel;
  }
  let { accounts, periodLabel, clientName } = window._finData;
  renderCurrentStatement(tabId, accounts, periodLabel, clientName);
}

// ══════════════════════════════════════
//  INCOME STATEMENT
// ══════════════════════════════════════

function loadStatementTab(tabId) {
  initChartOfAccounts();
  stmtOverrides = {}; stmtEditMode = false;
  let containerId = tabId + "-main";
  let titles = { is:"Income Statement", bs:"Balance Sheet", scf:"Statement of Cash Flows", sshe:"Statement of Shareholders' Equity" };
  buildStatementHeader(tabId, containerId, titles[tabId] || tabId, "", null);
}

function renderIS(accounts, periodLabel, companyName, priorAccs, priorLabel) {
  let el = document.getElementById("is-stmt-output");
  if (!el) return;
  let yoy = !!priorAccs;

  // Helper: find prior year balance for a given account (matched by account number)
  function pb(acct) {
    if (!priorAccs) return undefined;
    let m = priorAccs.find(a => a.number === acct.number);
    return m ? m.balance : 0;
  }
  function pbSum(type, subType) {
    if (!priorAccs) return 0;
    return priorAccs.filter(a => a.type === type && (!subType || a.subType === subType))
                    .reduce((s,a) => s + a.balance, 0);
  }

  let revenue  = accounts.filter(a => a.type==="revenue");
  let cogs     = accounts.filter(a => a.type==="cogs");
  let opex     = accounts.filter(a => a.type==="expense" && a.subType==="operating_expense");
  let otherExp = accounts.filter(a => a.type==="expense" && a.subType==="other_expense");
  let tax      = accounts.filter(a => a.type==="tax");

  let totalRevenue    = revenue.reduce((s,a)  => s+getBalance(a), 0);
  let totalCOGS       = cogs.reduce((s,a)     => s+getBalance(a), 0);
  let grossProfit     = totalRevenue - totalCOGS;
  let grossMarginPct  = totalRevenue > 0 ? (grossProfit / totalRevenue * 100).toFixed(1) : "0.0";
  let totalOpEx       = opex.reduce((s,a)     => s+getBalance(a), 0);
  let incomeFromOps   = grossProfit - totalOpEx;
  let deprAmort       = accounts.filter(a => a.number==="640"||a.number==="650").reduce((s,a)=>s+getBalance(a),0);
  let ebitda          = incomeFromOps + deprAmort;
  let totalOtherExp   = otherExp.reduce((s,a) => s+getBalance(a), 0);
  let incomeBeforeTax = incomeFromOps - totalOtherExp;
  let totalTax        = tax.reduce((s,a)      => s+getBalance(a), 0);
  let netIncome       = incomeBeforeTax - totalTax;
  let netMarginPct    = totalRevenue > 0 ? (netIncome / totalRevenue * 100).toFixed(1) : "0.0";
  window._netIncome   = netIncome;

  // Prior year totals (only computed when yoy mode is on)
  let pRevenue     = pbSum("revenue");
  let pCOGS        = pbSum("cogs");
  let pGrossProfit = pRevenue - pCOGS;
  let pOpEx        = pbSum("expense","operating_expense");
  let pIncOps      = pGrossProfit - pOpEx;
  let pOtherExp    = pbSum("expense","other_expense");
  let pIncBefTax   = pIncOps - pOtherExp;
  let pTax         = pbSum("tax");
  let pNetIncome   = pIncBefTax - pTax;
  let pDeprAmort   = yoy ? (priorAccs.filter(a=>a.number==="640"||a.number==="650").reduce((s,a)=>s+a.balance,0)) : 0;
  let pEbitda      = pIncOps + pDeprAmort;

  let netIncomeColor = netIncome >= 0 ? "var(--green)" : "var(--red)";

  let periodTitle = yoy
    ? `${priorLabel} vs. ${periodLabel}`
    : `For the Year Ended ${periodLabel}`;

  let html = `<div class="stmt-wrapper${yoy?" stmt-wrapper-wide":""}">
    <div class="stmt-header">
      <div class="stmt-firm-name">SESNY ADVISORY</div>
      <div class="stmt-company">${companyName}</div>
      <div class="stmt-title">Income Statement</div>
      <div class="stmt-period">${periodTitle}</div>
      <div class="stmt-units">All amounts in U.S. Dollars · Prepared by Sesny Advisory</div>
    </div>
    <button class="ghost-btn stmt-print-btn" onclick="printCurrentStatement('is')">Print / Export PDF ↗</button>`;

  if (yoy) {
    html += `<div class="stmt-yoy-col-header">
      <span></span><span></span>
      <span>${priorLabel}</span>
      <span>${periodLabel}</span>
      <span>Δ%</span>
    </div>`;
  }

  if (revenue.length) {
    html += stmtSection("REVENUE");
    revenue.forEach(a => { html += stmtRow(a.number,a.name,getBalance(a),32,false,false,stmtEditMode,a._id, yoy?pb(a):undefined); });
    html += stmtRow("","Total Revenue",totalRevenue,0,true,true,false,"", yoy?pRevenue:undefined);
    html += stmtDivider();
  }
  if (cogs.length) {
    html += stmtSection("COST OF GOODS SOLD");
    cogs.forEach(a => { html += stmtRow(a.number,a.name,getBalance(a),32,false,false,stmtEditMode,a._id, yoy?pb(a):undefined); });
    html += stmtRow("","Total Cost of Goods Sold",totalCOGS,0,true,true,false,"", yoy?pCOGS:undefined);
    html += stmtRow("","Gross Profit",grossProfit,0,true,true,false,"", yoy?pGrossProfit:undefined);
    html += stmtDivider();
  }
  if (opex.length) {
    html += stmtSection("OPERATING EXPENSES");
    opex.forEach(a => { html += stmtRow(a.number,a.name,getBalance(a),32,false,false,stmtEditMode,a._id, yoy?pb(a):undefined); });
    html += stmtRow("","Total Operating Expenses",totalOpEx,0,true,true,false,"", yoy?pOpEx:undefined);
    html += stmtRow("","Operating Income (EBIT)",incomeFromOps,0,true,true,false,"", yoy?pIncOps:undefined);
    if (deprAmort > 0 || pEbitda > 0) {
      html += `<div class="stmt-row stmt-ebitda-row${yoy?" stmt-row-yoy":""}">
        <span class="stmt-acct-num"></span>
        <span class="stmt-acct-name">EBITDA <span class="stmt-ebitda-hint">(EBIT + D&amp;A)</span></span>
        ${yoy?`<span class="stmt-acct-amt stmt-yoy-prior">$${fmtMoney(pEbitda)}</span>`:""}
        <span class="stmt-acct-amt">$${fmtMoney(ebitda)}</span>
        ${yoy?`<span class="stmt-yoy-chg"></span>`:""}
      </div>`;
    }
    html += stmtDivider();
  }
  if (otherExp.length) {
    html += stmtSection("OTHER INCOME / (EXPENSE)");
    otherExp.forEach(a => { html += stmtRow(a.number,a.name,getBalance(a),32,false,false,stmtEditMode,a._id, yoy?pb(a):undefined); });
    html += stmtRow("","Income Before Tax",incomeBeforeTax,0,true,true,false,"", yoy?pIncBefTax:undefined);
    html += stmtDivider();
  }
  if (tax.length) {
    html += stmtSection("INCOME TAX EXPENSE");
    tax.forEach(a => { html += stmtRow(a.number,a.name,getBalance(a),32,false,false,stmtEditMode,a._id, yoy?pb(a):undefined); });
    html += stmtDivider();
  }

  if (yoy) {
    let delta      = netIncome - pNetIncome;
    let pct        = pNetIncome !== 0 ? ((delta / Math.abs(pNetIncome)) * 100).toFixed(1) : "N/A";
    let deltaColor = delta >= 0 ? "var(--green)" : "var(--red)";
    html += `<div class="stmt-net-income stmt-net-income-yoy" style="color:${netIncomeColor};">
      <span>NET INCOME</span>
      <div class="stmt-net-yoy-amounts">
        <span class="stmt-yoy-prior-ni">$${fmtMoney(pNetIncome)}</span>
        <span>$${fmtMoney(netIncome)}</span>
        <span style="font-size:12px;color:${deltaColor};min-width:60px;text-align:right;">${delta>=0?"+":""}${pct}%</span>
      </div>
    </div>`;
  } else {
    html += `<div class="stmt-net-income" style="color:${netIncomeColor};">
      <span>NET INCOME</span>
      <div style="text-align:right;">
        <div>$${fmtMoney(netIncome)}</div>
        <div class="stmt-net-margin-pct">${netMarginPct}% net margin</div>
      </div>
    </div>`;
  }
  html += `</div>`;
  el.innerHTML = html;
}

// ══════════════════════════════════════
//  BALANCE SHEET
// ══════════════════════════════════════

function renderBS(accounts, periodLabel, companyName, priorAccs, priorLabel) {
  let el = document.getElementById("bs-stmt-output");
  if (!el) return;
  let yoy = !!priorAccs;

  function pb(acct) {
    if (!priorAccs) return undefined;
    let m = priorAccs.find(a => a.number === acct.number);
    return m ? m.balance : 0;
  }
  function pbSum(type, subType) {
    if (!priorAccs) return 0;
    return priorAccs.filter(a => a.type===type && (!subType||a.subType===subType))
                    .reduce((s,a) => s+a.balance, 0);
  }

  let currAssets   = accounts.filter(a=>a.type==="asset"&&a.subType==="current_asset");
  let fixedAssets  = accounts.filter(a=>a.type==="asset"&&a.subType==="fixed_asset");
  let contraAssets = accounts.filter(a=>a.type==="asset"&&a.subType==="contra_asset");
  let otherAssets  = accounts.filter(a=>a.type==="asset"&&a.subType==="other_asset");
  let currLiab     = accounts.filter(a=>a.type==="liability"&&a.subType==="current_liability");
  let ltLiab       = accounts.filter(a=>a.type==="liability"&&a.subType==="long_term_liability");
  let equity       = accounts.filter(a=>a.type==="equity");

  let tCA  = currAssets.reduce((s,a)  =>s+getBalance(a),0);
  let tFA  = fixedAssets.reduce((s,a) =>s+getBalance(a),0);
  let tCon = contraAssets.reduce((s,a)=>s+getBalance(a),0);
  let tOA  = otherAssets.reduce((s,a) =>s+getBalance(a),0);
  let tA   = tCA + tFA - tCon + tOA;
  let tCL  = currLiab.reduce((s,a)    =>s+getBalance(a),0);
  let tLL  = ltLiab.reduce((s,a)      =>s+getBalance(a),0);
  let tL   = tCL + tLL;
  let ni   = window._netIncome || 0;
  let tE   = equity.reduce((s,a)      =>s+getBalance(a),0) + ni;
  let tLE  = tL + tE;

  // Prior year totals
  let ptCA = pbSum("asset","current_asset");
  let ptFA = pbSum("asset","fixed_asset");
  let ptCon= pbSum("asset","contra_asset");
  let ptOA = pbSum("asset","other_asset");
  let ptA  = ptCA + ptFA - ptCon + ptOA;
  let ptCL = pbSum("liability","current_liability");
  let ptLL = pbSum("liability","long_term_liability");
  let ptL  = ptCL + ptLL;
  let ptE  = pbSum("equity") + (window._finData?.priorNetIncome || 0);
  let ptLE = ptL + ptE;

  let periodTitle = yoy ? `${priorLabel} vs. ${periodLabel}` : `As of ${periodLabel}`;

  // In YoY mode render single-column (full-width) so 5-col rows fit comfortably
  let html = `<div class="stmt-wrapper${yoy?" stmt-wrapper-wide":""}">
    <div class="stmt-header">
      <div class="stmt-firm-name">SESNY ADVISORY</div>
      <div class="stmt-company">${companyName}</div>
      <div class="stmt-title">Balance Sheet</div>
      <div class="stmt-period">${periodTitle}</div>
      <div class="stmt-units">All amounts in U.S. Dollars · Prepared by Sesny Advisory</div>
    </div>
    <button class="ghost-btn stmt-print-btn" onclick="printCurrentStatement('bs')">Print / Export PDF ↗</button>`;

  if (yoy) {
    html += `<div class="stmt-yoy-col-header">
      <span></span><span></span>
      <span>${priorLabel}</span>
      <span>${periodLabel}</span>
      <span>Δ%</span>
    </div>`;
  }

  // Assets section
  let assetsOpen = yoy ? `<div>` : `<div class="stmt-two-col"><div class="stmt-col">`;
  html += assetsOpen;
  html += stmtSection("ASSETS");
  if (currAssets.length) {
    html += stmtSection("Current Assets");
    currAssets.forEach(a=>{ html += stmtRow(a.number,a.name,getBalance(a),32,false,false,stmtEditMode,a._id, yoy?pb(a):undefined); });
    html += stmtRow("","Total Current Assets",tCA,16,true,true,false,"", yoy?ptCA:undefined);
  }
  if (fixedAssets.length||contraAssets.length) {
    html += stmtSection("Property, Plant &amp; Equipment");
    fixedAssets.forEach(a=>{ html += stmtRow(a.number,a.name,getBalance(a),32,false,false,stmtEditMode,a._id, yoy?pb(a):undefined); });
    contraAssets.forEach(a=>{ html += stmtRow(a.number,a.name,-getBalance(a),32,false,false,stmtEditMode,a._id, yoy?(0-pb(a)):undefined); });
    html += stmtRow("","Net PP&amp;E",tFA-tCon,16,true,true,false,"", yoy?(ptFA-ptCon):undefined);
  }
  if (otherAssets.length) {
    html += stmtSection("Other Assets");
    otherAssets.forEach(a=>{ html += stmtRow(a.number,a.name,getBalance(a),32,false,false,stmtEditMode,a._id, yoy?pb(a):undefined); });
  }
  html += stmtDivider();
  html += stmtRow("","TOTAL ASSETS",tA,0,true,true,false,"", yoy?ptA:undefined);

  // Liabilities & Equity section
  let midDivider = yoy
    ? `<div class="stmt-divider" style="margin:20px 0 16px;"></div>`
    : `</div><div class="stmt-col">`;
  html += midDivider;

  html += stmtSection("LIABILITIES");
  if (currLiab.length) {
    html += stmtSection("Current Liabilities");
    currLiab.forEach(a=>{ html += stmtRow(a.number,a.name,getBalance(a),32,false,false,stmtEditMode,a._id, yoy?pb(a):undefined); });
    html += stmtRow("","Total Current Liabilities",tCL,16,true,true,false,"", yoy?ptCL:undefined);
  }
  if (ltLiab.length) {
    html += stmtSection("Long-Term Liabilities");
    ltLiab.forEach(a=>{ html += stmtRow(a.number,a.name,getBalance(a),32,false,false,stmtEditMode,a._id, yoy?pb(a):undefined); });
    html += stmtRow("","Total Long-Term Liabilities",tLL,16,true,true,false,"", yoy?ptLL:undefined);
  }
  html += stmtRow("","Total Liabilities",tL,0,true,true,false,"", yoy?ptL:undefined);
  html += stmtDivider();

  html += stmtSection("SHAREHOLDERS' EQUITY");
  equity.forEach(a=>{ html += stmtRow(a.number,a.name,getBalance(a),32,false,false,stmtEditMode,a._id, yoy?pb(a):undefined); });
  html += stmtRow("","Net Income (Current Period)",ni,32,false,false,false,"");
  html += stmtRow("","Total Shareholders' Equity",tE,0,true,true,false,"", yoy?ptE:undefined);
  html += stmtDivider();
  html += stmtRow("","TOTAL LIABILITIES & EQUITY",tLE,0,true,true,false,"", yoy?ptLE:undefined);

  let diff = Math.abs(tA - tLE);
  html += diff > 0.01
    ? `<div class="stmt-warning">⚠ Out of balance by $${fmtMoney(diff)}</div>`
    : `<div class="stmt-check">✓ Balance sheet balances</div>`;

  html += yoy ? `</div></div>` : `</div></div></div>`;
  el.innerHTML = html;
}

// ══════════════════════════════════════
//  CASH FLOW
// ══════════════════════════════════════

function renderSCF(accounts, periodLabel, companyName, priorAccs, priorLabel) {
  let el = document.getElementById("scf-stmt-output");
  if (!el) return;
  let yoy = !!priorAccs;

  let ni      = window._netIncome || 0;
  let g = id => accounts.filter(a=>a.number===id).reduce((s,a)=>s+getBalance(a),0);
  let depr    = g("640") + g("650");
  let cfOps   = ni + depr - g("110") - g("120") - g("130") + g("200") + g("210");
  let cfInv   = -(g("150") + g("170"));
  let cfFin   = g("220") + g("250") + g("300") + g("310") - g("330");
  let netCash = cfOps + cfInv + cfFin;
  let begCash = g("100");
  let endCash = begCash + netCash;

  // Prior year equivalents
  let pg = id => priorAccs ? priorAccs.filter(a=>a.number===id).reduce((s,a)=>s+a.balance,0) : 0;
  let pni      = window._finData?.priorNetIncome || 0;
  let pDepr    = pg("640") + pg("650");
  let pCfOps   = yoy ? pni + pDepr - pg("110") - pg("120") - pg("130") + pg("200") + pg("210") : 0;
  let pCfInv   = yoy ? -(pg("150") + pg("170")) : 0;
  let pCfFin   = yoy ? pg("220") + pg("250") + pg("300") + pg("310") - pg("330") : 0;
  let pNetCash = pCfOps + pCfInv + pCfFin;
  let pBegCash = pg("100");
  let pEndCash = pBegCash + pNetCash;

  let periodTitle = yoy ? `${priorLabel} vs. ${periodLabel}` : `For the Year Ended ${periodLabel}`;

  let html = `<div class="stmt-wrapper${yoy?" stmt-wrapper-wide":""}">
    <div class="stmt-header">
      <div class="stmt-firm-name">SESNY ADVISORY</div>
      <div class="stmt-company">${companyName}</div>
      <div class="stmt-title">Statement of Cash Flows</div>
      <div class="stmt-period">${periodTitle}</div>
      <div class="stmt-units">All amounts in U.S. Dollars · Indirect Method · Prepared by Sesny Advisory</div>
    </div>
    <button class="ghost-btn stmt-print-btn" onclick="printCurrentStatement('scf')">Print / Export PDF ↗</button>`;

  if (yoy) {
    html += `<div class="stmt-yoy-col-header">
      <span></span><span></span>
      <span>${priorLabel}</span>
      <span>${periodLabel}</span>
      <span>Δ%</span>
    </div>`;
  }

  html += stmtSection("CASH FLOWS FROM OPERATING ACTIVITIES");
  html += stmtRow("","Net Income",ni,32,false,false,false,"", yoy?pni:undefined);
  html += stmtSection("Adjustments:");
  if (depr||pDepr)   html += stmtRow("640/650","Depreciation &amp; Amortization",depr,48,false,false,false,"", yoy?pDepr:undefined);
  if (g("110")||pg("110")) html += stmtRow("110","(Increase) in Accounts Receivable",-g("110"),48,false,false,false,"", yoy?-pg("110"):undefined);
  if (g("120")||pg("120")) html += stmtRow("120","(Increase) in Inventory",-g("120"),48,false,false,false,"", yoy?-pg("120"):undefined);
  if (g("200")||pg("200")) html += stmtRow("200","Increase in Accounts Payable",g("200"),48,false,false,false,"", yoy?pg("200"):undefined);
  if (g("210")||pg("210")) html += stmtRow("210","Increase in Accrued Liabilities",g("210"),48,false,false,false,"", yoy?pg("210"):undefined);
  html += stmtRow("","Net Cash from Operating Activities",cfOps,0,true,true,false,"", yoy?pCfOps:undefined);
  html += stmtDivider();

  html += stmtSection("CASH FLOWS FROM INVESTING ACTIVITIES");
  if (g("150")||pg("150")) html += stmtRow("150","Purchase of PP&amp;E",-g("150"),32,false,false,false,"", yoy?-pg("150"):undefined);
  if (g("170")||pg("170")) html += stmtRow("170","Purchase of Intangibles",-g("170"),32,false,false,false,"", yoy?-pg("170"):undefined);
  html += stmtRow("","Net Cash from Investing Activities",cfInv,0,true,true,false,"", yoy?pCfInv:undefined);
  html += stmtDivider();

  html += stmtSection("CASH FLOWS FROM FINANCING ACTIVITIES");
  if (g("220")||g("250")||pg("220")||pg("250")) html += stmtRow("220/250","Proceeds from Notes Payable",g("220")+g("250"),32,false,false,false,"", yoy?pg("220")+pg("250"):undefined);
  if (g("300")||g("310")||pg("300")||pg("310")) html += stmtRow("300/310","Proceeds from Equity Issuance",g("300")+g("310"),32,false,false,false,"", yoy?pg("300")+pg("310"):undefined);
  if (g("330")||pg("330")) html += stmtRow("330","Dividends / Distributions Paid",-g("330"),32,false,false,false,"", yoy?-pg("330"):undefined);
  html += stmtRow("","Net Cash from Financing Activities",cfFin,0,true,true,false,"", yoy?pCfFin:undefined);
  html += stmtDivider();

  html += stmtRow("","Net Increase (Decrease) in Cash",netCash,0,true,true,false,"", yoy?pNetCash:undefined);
  html += stmtRow("","Cash at Beginning of Period",begCash,0,false,false,false,"", yoy?pBegCash:undefined);

  if (yoy) {
    let delta = endCash - pEndCash;
    let pct   = pEndCash !== 0 ? ((delta / Math.abs(pEndCash)) * 100).toFixed(1) : "N/A";
    let dColor= delta >= 0 ? "var(--green)" : "var(--red)";
    html += `<div class="stmt-net-income stmt-net-income-yoy">
      <span>CASH AT END OF PERIOD</span>
      <div class="stmt-net-yoy-amounts">
        <span class="stmt-yoy-prior-ni">$${fmtMoney(pEndCash)}</span>
        <span>$${fmtMoney(endCash)}</span>
        <span style="font-size:12px;color:${dColor};min-width:60px;text-align:right;">${delta>=0?"+":""}${pct}%</span>
      </div>
    </div>`;
  } else {
    html += `<div class="stmt-net-income"><span>CASH AT END OF PERIOD</span><span>$${fmtMoney(endCash)}</span></div>`;
  }
  html += `</div>`;
  el.innerHTML = html;
}

// ══════════════════════════════════════
//  SSHE
// ══════════════════════════════════════

function renderSSHE(accounts, periodLabel, companyName, priorAccs, priorLabel) {
  let el = document.getElementById("sshe-stmt-output");
  if (!el) return;
  let yoy = !!priorAccs;

  let ni      = window._netIncome || 0;
  let g = id => accounts.filter(a=>a.number===id).reduce((s,a)=>s+getBalance(a),0);
  let cs      = g("300");
  let apic    = g("310");
  let re      = g("320");
  let div     = g("330");
  let tsy     = g("340");
  let endRE   = re + ni - div;
  let tEq     = cs + apic + endRE - tsy;

  // Prior year
  let pg = id => priorAccs ? priorAccs.filter(a=>a.number===id).reduce((s,a)=>s+a.balance,0) : 0;
  let pni   = window._finData?.priorNetIncome || 0;
  let pcs   = pg("300"); let papic = pg("310"); let pre = pg("320");
  let pdiv  = pg("330"); let ptsy  = pg("340");
  let pendRE= pre + pni - pdiv;
  let ptEq  = pcs + papic + pendRE - ptsy;

  // YoY column helper for equity rows
  function eqRow(label, curr, prior) {
    if (!yoy) return `<div class="equity-row"><span>${label}</span><span>$${fmtMoney(curr)}</span></div>`;
    let chg = "", chgCls = "stmt-yoy-chg";
    if (prior !== 0) {
      let pct = ((curr - prior) / Math.abs(prior) * 100);
      chg = (pct >= 0 ? "+" : "") + pct.toFixed(1) + "%";
      chgCls += pct >= 0 ? " stmt-yoy-pos" : " stmt-yoy-neg";
    }
    return `<div class="equity-row equity-row-yoy">
      <span>${label}</span>
      <span class="stmt-yoy-prior">$${fmtMoney(prior)}</span>
      <span>$${fmtMoney(curr)}</span>
      <span class="${chgCls}">${chg}</span>
    </div>`;
  }

  let periodTitle = yoy ? `${priorLabel} vs. ${periodLabel}` : `For the Year Ended ${periodLabel}`;

  let html = `<div class="stmt-wrapper${yoy?" stmt-wrapper-wide":""}">
    <div class="stmt-header">
      <div class="stmt-firm-name">SESNY ADVISORY</div>
      <div class="stmt-company">${companyName}</div>
      <div class="stmt-title">Statement of Shareholders' Equity</div>
      <div class="stmt-period">${periodTitle}</div>
      <div class="stmt-units">All amounts in U.S. Dollars · Prepared by Sesny Advisory</div>
    </div>
    <button class="ghost-btn stmt-print-btn" onclick="printCurrentStatement('sshe')">Print / Export PDF ↗</button>
    <div class="equity-table">`;

  if (yoy) {
    html += `<div class="equity-header equity-header-yoy">
      <span>Component</span>
      <span>${priorLabel}</span>
      <span>${periodLabel}</span>
      <span>Δ%</span>
    </div>`;
  } else {
    html += `<div class="equity-header"><span>Component</span><span>Amount</span></div>`;
  }

  html += `<div class="equity-section">PAID-IN CAPITAL</div>`;
  html += eqRow("300 Common Stock", cs, pcs);
  if (apic || papic) html += eqRow("310 Additional Paid-In Capital", apic, papic);
  html += eqRow("Total Paid-In Capital", cs+apic, pcs+papic).replace("equity-row","equity-row equity-subtotal");

  html += `<div class="equity-section">RETAINED EARNINGS</div>`;
  html += eqRow("320 Retained Earnings (Beginning)", re, pre);
  html += eqRow("Net Income (Current Period)", ni, pni);
  if (div || pdiv) html += eqRow("330 Less: Dividends / Distributions", -div, -pdiv);
  html += eqRow("Retained Earnings (Ending)", endRE, pendRE).replace("equity-row","equity-row equity-subtotal");

  if (tsy || ptsy) {
    html += `<div class="equity-section">CONTRA EQUITY</div>`;
    html += eqRow("340 Treasury Stock", -tsy, -ptsy);
  }

  if (yoy) {
    let delta = tEq - ptEq;
    let pct   = ptEq !== 0 ? ((delta / Math.abs(ptEq)) * 100).toFixed(1) : "N/A";
    let dColor= delta >= 0 ? "var(--green)" : "var(--red)";
    html += `<div class="equity-total equity-total-yoy">
      <span>TOTAL SHAREHOLDERS' EQUITY</span>
      <span class="stmt-yoy-prior">$${fmtMoney(ptEq)}</span>
      <span>$${fmtMoney(tEq)}</span>
      <span style="font-size:12px;color:${dColor};">${delta>=0?"+":""}${pct}%</span>
    </div>`;
  } else {
    html += `<div class="equity-total"><span>TOTAL SHAREHOLDERS' EQUITY</span><span>$${fmtMoney(tEq)}</span></div>`;
  }

  html += `</div></div>`;
  el.innerHTML = html;
}

// ══════════════════════════════════════
//  GENERAL LEDGER
// ══════════════════════════════════════

let glClientId    = "";
let glPeriodId    = "";
let glJeLines     = [];
let glEditingId   = null;   // null = new entry, string = editing existing entry id
let glCurrentView = "posted"; // "posted" or "drafts"

function loadGLTab() {
  initChartOfAccounts();
  let el = document.getElementById("gl-main");
  if (!el) return;

  el.innerHTML = `
    <div class="acct-selectors">
      <div class="acct-selector-group">
        <label>Date Range (optional)</label>
        <div style="display:flex;gap:6px;align-items:center;">
          <input type="date" id="gl-date-from" class="modal-input" style="width:140px;">
          <span style="color:var(--text-dim);">to</span>
          <input type="date" id="gl-date-to" class="modal-input" style="width:140px;">
          <button class="ghost-btn" onclick="applyGLDateFilter()">Filter</button>
        </div>
      </div>
    </div>

    <div id="depreciation-panel" style="display:none;margin-bottom:20px;"></div>

    <div id="gl-new-entry-area" style="display:none;margin-top:8px;"></div>

    <div id="gl-content" style="margin-top:20px;">
      <div style="padding:32px;text-align:center;color:var(--text-dim);font-size:13px;">Select a client and period in the entity bar above.</div>
    </div>`;

  if (activeEntity.clientId && activeEntity.periodId) {
    glClientId = activeEntity.clientId;
    glPeriodId = activeEntity.periodId;
    loadGLEntries();
  }
}

async function onGLClientChange() {
  let sel = document.getElementById("gl-client-sel");
  glClientId = sel.value;
  if (!glClientId) return;
  await loadPeriodsForClient(glClientId, "gl-period-sel");
}

async function onGLPeriodChange() {
  let periodSel = document.getElementById("gl-period-sel");
  glPeriodId = periodSel.value;
  if (!glPeriodId) return;
  loadGLEntries();
}

async function applyGLDateFilter() {
  loadGLEntries();
}

async function loadGLEntries() {
  if (activeEntity.clientId) glClientId = activeEntity.clientId;
  if (activeEntity.periodId) glPeriodId = activeEntity.periodId;
  if (!glClientId || !glPeriodId) return;
  let content = document.getElementById("gl-content");
  content.innerHTML = `<div style="padding:24px;text-align:center;color:var(--text-dim);font-size:13px;">Loading entries...</div>`;

  let dateFrom = document.getElementById("gl-date-from")?.value;
  let dateTo   = document.getElementById("gl-date-to")?.value;

  let snap = await db.collection("journalEntries")
    .where("clientId", "==", glClientId)
    .where("periodId", "==", glPeriodId)
    .get();

  let allEntries = [];
  snap.forEach(doc => { let d = doc.data(); d._id = doc.id; allEntries.push(d); });

  // Split posted vs drafts
  let postedEntries = allEntries.filter(e => e.status === "posted" || (!e.status && e.isBalanced !== false));
  let draftEntries  = allEntries.filter(e => e.status === "draft"  || (!e.status && e.isBalanced === false));

  let entries = glCurrentView === "drafts" ? draftEntries : postedEntries;

  if (dateFrom || dateTo) {
    entries = entries.filter(e => {
      if (!e.entryDate) return true;
      let d = new Date(e.entryDate.seconds * 1000);
      let ds = d.toISOString().slice(0,10);
      if (dateFrom && ds < dateFrom) return false;
      if (dateTo   && ds > dateTo)   return false;
      return true;
    });
  }

  window._glEntries = entries;
  entries.sort((a,b) => (a.entryDate&&b.entryDate) ? a.entryDate.seconds - b.entryDate.seconds : 0);

  let html = `
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;gap:12px;flex-wrap:wrap;">
      <div class="gl-view-toggle">
        <button class="gl-toggle-btn ${glCurrentView==="posted"?"active":""}" onclick="switchGLView('posted')">
          Posted Entries <span class="gl-toggle-count">${postedEntries.length}</span>
        </button>
        <button class="gl-toggle-btn ${glCurrentView==="drafts"?"active":""}" onclick="switchGLView('drafts')">
          Drafts <span class="gl-toggle-count">${draftEntries.length}</span>
        </button>
      </div>
      <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;">
        <select id="gl-acct-filter" class="assign-select" style="min-width:220px;" onchange="filterGLByAccount()">
          <option value="">— Filter by Account —</option>
          ${[...new Set(entries.flatMap(e=>e.lines.map(l=>l.accountNumber+"||"+l.accountName)))]
            .sort()
            .map(a => { let [num,name]=a.split("||"); return `<option value="${num}">${num} — ${name}</option>`; })
            .join("")}
        </select>
        <button class="ghost-btn" onclick="document.getElementById('gl-acct-filter').value='';filterGLByAccount()">Clear</button>
        <button class="ghost-btn" onclick="toggleDepreciationPanel()">Depreciation ▾</button>
        <button class="primary-btn" onclick="openGLNewEntry()">+ New Entry</button>
      </div>
    </div>
    <div class="dash-card" style="padding:0;overflow:hidden;">
      <div class="je-list-header">
        <span>Date</span><span>Description</span><span>Debits</span><span>Credits</span><span>Status</span><span></span>
      </div>
      <div id="gl-entries-list">`;

  if (!entries.length) {
    let msg = glCurrentView === "drafts"
      ? "No drafts. Use Save as Draft to save an unfinished entry."
      : 'No posted entries. Post a balanced entry to see it here.';
    html += `<div style="padding:24px;text-align:center;color:var(--text-dim);font-size:13px;">${msg}</div>`;
  } else {
    entries.forEach(e => {
      let totalDr  = e.lines.reduce((s,l)=>s+(parseFloat(l.debit)||0),0);
      let totalCr  = e.lines.reduce((s,l)=>s+(parseFloat(l.credit)||0),0);
      let balanced = Math.abs(totalDr-totalCr) < 0.01;
      let dateStr  = e.entryDate ? new Date(e.entryDate.seconds*1000).toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"}) : "—";
      let statusPill = e.status === "draft"
        ? `<span class="status-pill draft">Draft</span>`
        : `<span class="status-pill filed">Posted</span>`;
      let postBtn = e.status === "draft"
        ? `<button class="ghost-btn" onclick="postDraftEntry('${e._id}')">Post</button>`
        : "";
      html += `<div class="je-list-row">
        <span class="je-date">${dateStr}</span>
        <span class="je-desc">${e.description||"—"}${e.isAdjusting?` <span class="je-adj-tag">ADJ</span>`:""}</span>
        <span class="je-amount">$${fmtMoney(totalDr)}</span>
        <span class="je-amount">$${fmtMoney(totalCr)}</span>
        ${statusPill}
        <div style="display:flex;gap:6px;">
          <button class="ghost-btn" onclick="expandGLEntry('${e._id}',this)">View</button>
          <button class="ghost-btn" onclick="editGLEntry('${e._id}')">Edit</button>
          ${postBtn}
          <button class="action-btn-delete" onclick="deleteGLEntry('${e._id}')">Delete</button>
        </div>
      </div>`;
    });
  }

  html += `</div></div>`;
  content.innerHTML = html;
}

function switchGLView(view) {
  glCurrentView = view;
  loadGLEntries();
}

function openGLNewEntry() {
  glEditingId = null;
  glJeLines = [
    {accountId:"",accountNumber:"",accountName:"",debit:"",credit:""},
    {accountId:"",accountNumber:"",accountName:"",debit:"",credit:""}
  ];
  glFormState = { date:"", desc:"", isAdjusting:false, month:"", day:"", year:"" };
  let area = document.getElementById("gl-new-entry-area");
  area.style.display = "block";
  renderGLEntryForm();
  area.scrollIntoView({ behavior:"smooth" });
}

// Store form state separately so re-renders don't wipe it
let glFormState = { date: "", desc: "", isAdjusting: false, month: "", day: "", year: "" };

function renderGLEntryForm() {
  let area = document.getElementById("gl-new-entry-area");
  if (!area) return;

  // Save current values before re-render
  let dateEl = document.getElementById("gl-je-date-month");
  if (dateEl) {
    glFormState.month       = document.getElementById("gl-je-date-month")?.value || glFormState.month;
    glFormState.day         = document.getElementById("gl-je-date-day")?.value   || glFormState.day;
    glFormState.year        = document.getElementById("gl-je-date-year")?.value  || glFormState.year;
    glFormState.desc        = document.getElementById("gl-je-desc")?.value       || glFormState.desc;
    glFormState.isAdjusting = document.getElementById("gl-is-adjusting")?.checked || glFormState.isAdjusting;
  }

  // Set defaults if empty
  let now = new Date();
  if (!glFormState.month) glFormState.month = String(now.getMonth()+1).padStart(2,"0");
  if (!glFormState.day)   glFormState.day   = String(now.getDate()).padStart(2,"0");
  if (!glFormState.year)  glFormState.year  = String(now.getFullYear());

  // Build month options
  let months = ["01","02","03","04","05","06","07","08","09","10","11","12"];
  let monthOpts = months.map(m => `<option value="${m}" ${glFormState.month===m?"selected":""}>${m}</option>`).join("");

  // Build day options
  let dayOpts = Array.from({length:31},(_,i)=>String(i+1).padStart(2,"0"))
    .map(d => `<option value="${d}" ${glFormState.day===d?"selected":""}>${d}</option>`).join("");

  // Build year options
  let yearOpts = Array.from({length:41},(_,i)=>String(2020+i))
    .map(y => `<option value="${y}" ${glFormState.year===y?"selected":""}>${y}</option>`).join("");

  let acctOpts = buildGroupedAccountOptions();

  let linesHTML = glJeLines.map((line,i) => `
    <div class="je-line" id="gl-je-line-${i}">
      <select class="je-acct-select" onchange="setGLAccount(${i},this)">
        <option value="">— Select Account —</option>${acctOpts}
      </select>
      <input type="number" class="je-amount-input" placeholder="Debit"  value="${line.debit}"  oninput="setGLAmount(${i},'debit',this.value)"  step="0.01" min="0">
      <input type="number" class="je-amount-input" placeholder="Credit" value="${line.credit}" oninput="setGLAmount(${i},'credit',this.value)" step="0.01" min="0">
      <button class="form-action-btn delete" onclick="removeGLLine(${i})">✕</button>
    </div>`).join("");

  let totalDr  = glJeLines.reduce((s,l)=>s+(parseFloat(l.debit)||0),0);
  let totalCr  = glJeLines.reduce((s,l)=>s+(parseFloat(l.credit)||0),0);
  let balanced = Math.abs(totalDr-totalCr) < 0.01 && totalDr > 0;

  area.innerHTML = `
    <div class="dash-card" style="margin-bottom:20px;">
      <div class="je-form-header">
        <h3>New Journal Entry</h3>
        <label class="checkbox-label" style="font-size:13px;color:var(--text-muted);">
          <input type="checkbox" id="gl-is-adjusting" ${glFormState.isAdjusting?"checked":""}> <span class="checkbox-custom"></span> Adjusting Entry
        </label>
      </div>
      <div class="je-form-top">
        <div class="editor-field">
          <label>Date</label>
          <div class="date-dropdowns">
            <select id="gl-je-date-month" class="date-part-select" onchange="saveGLFormState()">${monthOpts}</select>
            <select id="gl-je-date-day"   class="date-part-select" onchange="saveGLFormState()">${dayOpts}</select>
            <select id="gl-je-date-year"  class="date-part-select" onchange="saveGLFormState()">${yearOpts}</select>
          </div>
        </div>
        <div class="editor-field" style="flex:3;">
          <label>Description</label>
          <input type="text" id="gl-je-desc" placeholder="e.g. Record monthly rent payment"
            value="${glFormState.desc}" oninput="glFormState.desc=this.value">
        </div>
      </div>
      <div class="je-lines-header">
        <span style="flex:3;">Account</span>
        <span style="flex:1;text-align:right;">Debit</span>
        <span style="flex:1;text-align:right;">Credit</span>
        <span style="width:32px;"></span>
      </div>
      <div id="gl-je-lines">${linesHTML}</div>
      <button class="ghost-btn" style="margin-top:8px;" onclick="addGLLine()">+ Add Line</button>
      <div class="je-totals">
        <span></span>
        <span class="je-total-label">Debits: <strong>$${fmtMoney(totalDr)}</strong></span>
        <span class="je-total-label">Credits: <strong>$${fmtMoney(totalCr)}</strong></span>
        <span class="${balanced?"je-balanced":"je-unbalanced"}">${balanced?"✓ Balanced":"Difference: $"+fmtMoney(Math.abs(totalDr-totalCr))}</span>
      </div>
      <div class="je-form-actions">
        <button class="ghost-btn" onclick="cancelGLEntry()">Cancel</button>
        <button class="primary-btn" id="gl-post-btn" onclick="${glEditingId ? 'updateGLEntry(\'' + glEditingId + '\')' : 'postGLEntry()'}" ${balanced?"":"disabled"}>${glEditingId ? "Update Entry" : "Post Entry"}</button>
      </div>
    </div>`;

  glJeLines.forEach((line,i) => {
    if (line.accountId) {
      let sel = area.querySelector(`#gl-je-line-${i} .je-acct-select`);
      if (sel) sel.value = line.accountId;
    }
  });
}

function saveGLFormState() {
  glFormState.month = document.getElementById("gl-je-date-month")?.value || glFormState.month;
  glFormState.day   = document.getElementById("gl-je-date-day")?.value   || glFormState.day;
  glFormState.year  = document.getElementById("gl-je-date-year")?.value  || glFormState.year;
  glFormState.desc  = document.getElementById("gl-je-desc")?.value       || glFormState.desc;
}

function setGLAccount(i, sel) {
  let opt = sel.options[sel.selectedIndex];
  glJeLines[i].accountId     = sel.value;
  glJeLines[i].accountNumber = opt.getAttribute("data-number") || "";
  glJeLines[i].accountName   = opt.getAttribute("data-name")   || "";
  renderGLEntryForm();
  let newSel = document.querySelector(`#gl-je-line-${i} .je-acct-select`);
  if (newSel) newSel.value = sel.value;
}

function setGLAmount(i, field, value) {
  glJeLines[i][field] = value;
  let totalDr  = glJeLines.reduce((s,l)=>s+(parseFloat(l.debit)||0),0);
  let totalCr  = glJeLines.reduce((s,l)=>s+(parseFloat(l.credit)||0),0);
  let balanced = Math.abs(totalDr-totalCr) < 0.01 && totalDr > 0;
  let balEl = document.querySelector("#gl-new-entry-area .je-balanced, #gl-new-entry-area .je-unbalanced");
  if (balEl) {
    balEl.className = balanced ? "je-balanced" : "je-unbalanced";
    balEl.textContent = balanced ? "✓ Balanced" : `Difference: $${fmtMoney(Math.abs(totalDr-totalCr))}`;
  }
  let postBtn = document.getElementById("gl-post-btn");
  if (postBtn) postBtn.disabled = !balanced;
}

function addGLLine() {
  glJeLines.push({accountId:"",accountNumber:"",accountName:"",debit:"",credit:""});
  renderGLEntryForm();
}

function removeGLLine(i) {
  if (glJeLines.length <= 2) { toast("Need at least 2 lines.", "warning"); return; }
  glJeLines.splice(i,1);
  renderGLEntryForm();
}

function cancelGLEntry() {
  let area = document.getElementById("gl-new-entry-area");
  if (area) { area.style.display = "none"; area.innerHTML = ""; }
  glJeLines    = [];
  glEditingId  = null;
  glFormState  = { date:"", desc:"", isAdjusting:false, month:"", day:"", year:"" };
}

function postGLEntry() {
  let month = document.getElementById("gl-je-date-month")?.value;
  let day   = document.getElementById("gl-je-date-day")?.value;
  let year  = document.getElementById("gl-je-date-year")?.value;
  let date  = `${year}-${month}-${day}`;
  let desc  = document.getElementById("gl-je-desc").value.trim();
  let isAdj = document.getElementById("gl-is-adjusting").checked;

  if (!date) { toast("Please enter a date.", "warning"); return; }
  if (!desc) { toast("Please enter a description.", "warning"); return; }

  let lines = glJeLines.filter(l=>l.accountId && (parseFloat(l.debit)||0)+(parseFloat(l.credit)||0)>0);
  if (lines.length < 2) { toast("Add at least 2 account lines.", "warning"); return; }

  db.collection("journalEntries").add({
    clientId:    glClientId,
    periodId:    glPeriodId,
    entryDate:   firebase.firestore.Timestamp.fromDate(new Date(date+"T12:00:00")),
    description: desc,
    isAdjusting: isAdj,
    status:      "posted",
    isBalanced:  true,
    lines: lines.map(l=>({
      accountId:l.accountId, accountNumber:l.accountNumber,
      accountName:l.accountName, debit:parseFloat(l.debit)||0, credit:parseFloat(l.credit)||0
    })),
    postedBy:  "Anthony Sesny",
    createdAt: firebase.firestore.FieldValue.serverTimestamp()
  }).then(() => {
    glCurrentView = "posted";
    cancelGLEntry();
    loadGLEntries();
    toast("Entry posted", "success");
  }).catch(e => toast(e.message, "error"));
}

function expandGLEntry(id, btn) {
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
    expand.innerHTML = e.lines.map(l=>`
      <div class="je-expand-line">
        <span class="je-exp-num">${l.accountNumber}</span>
        <span class="je-exp-name">${l.accountName}</span>
        <span class="je-exp-dr">${l.debit>0?"$"+fmtMoney(l.debit):""}</span>
        <span class="je-exp-cr">${l.credit>0?"$"+fmtMoney(l.credit):""}</span>
      </div>`).join("");
    row.parentNode.insertBefore(expand, row.nextSibling);
  });
}

function editGLEntry(id) {
  db.collection("journalEntries").doc(id).get().then(doc => {
    if (!doc.exists) return;
    let e = doc.data();

    // Set editing mode — renderGLEntryForm checks this to label the button correctly
    glEditingId = id;

    // Load existing lines into form state
    glJeLines = e.lines.map(l => ({
      accountId:     l.accountId,
      accountNumber: l.accountNumber,
      accountName:   l.accountName,
      debit:         l.debit  > 0 ? l.debit.toString()  : "",
      credit:        l.credit > 0 ? l.credit.toString() : ""
    }));

    // Pre-fill glFormState so dropdown date fields render with the right values
    if (e.entryDate) {
      let d = new Date(e.entryDate.seconds * 1000);
      glFormState.month = String(d.getMonth() + 1).padStart(2, "0");
      glFormState.day   = String(d.getDate()).padStart(2, "0");
      glFormState.year  = String(d.getFullYear());
    }
    glFormState.desc        = e.description || "";
    glFormState.isAdjusting = e.isAdjusting || false;

    let area = document.getElementById("gl-new-entry-area");
    area.style.display = "block";
    renderGLEntryForm();
    area.scrollIntoView({ behavior:"smooth" });
  });
}

function updateGLEntry(id) {
  // Read from the three dropdown fields, same as postGLEntry
  let month = document.getElementById("gl-je-date-month")?.value;
  let day   = document.getElementById("gl-je-date-day")?.value;
  let year  = document.getElementById("gl-je-date-year")?.value;
  let date  = year && month && day ? year + "-" + month + "-" + day : "";
  let desc  = document.getElementById("gl-je-desc").value.trim();
  let isAdj = document.getElementById("gl-is-adjusting").checked;

  if (!date) { toast("Please enter a date.", "warning"); return; }
  if (!desc) { toast("Please enter a description.", "warning"); return; }

  let lines = glJeLines.filter(l=>l.accountId && (parseFloat(l.debit)||0)+(parseFloat(l.credit)||0)>0);
  if (lines.length < 2) { toast("Add at least 2 account lines.", "warning"); return; }

  let totalDr = lines.reduce((s,l)=>s+(parseFloat(l.debit)||0),0);
  let totalCr = lines.reduce((s,l)=>s+(parseFloat(l.credit)||0),0);
  if (Math.abs(totalDr-totalCr) > 0.01) { toast("Entry is not balanced. Debits must equal credits.", "warning"); return; }

  db.collection("journalEntries").doc(id).update({
    entryDate:   firebase.firestore.Timestamp.fromDate(new Date(date+"T12:00:00")),
    description: desc,
    isAdjusting: isAdj,
    status:      "posted",
    isBalanced:  true,
    lines: lines.map(l=>({
      accountId:l.accountId, accountNumber:l.accountNumber,
      accountName:l.accountName, debit:parseFloat(l.debit)||0, credit:parseFloat(l.credit)||0
    })),
    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
  }).then(() => {
    glCurrentView = "posted";
    cancelGLEntry();
    loadGLEntries();
    toast("Entry updated", "success");
  }).catch(e => toast(e.message, "error"));
}

function deleteGLEntry(id) {
  showModal({ title:"Delete Entry", message:"Delete this journal entry? This cannot be undone.",
    confirmText:"Delete", type:"danger", onConfirm: function() {
      db.collection("journalEntries").doc(id).delete().then(() => loadGLEntries());
    }
  });
}

// ── Save as Draft ──
function saveAsDraft() {
  let month = document.getElementById("gl-je-date-month")?.value;
  let day   = document.getElementById("gl-je-date-day")?.value;
  let year  = document.getElementById("gl-je-date-year")?.value;
  let date  = (year && month && day) ? `${year}-${month}-${day}` : "";
  let desc  = document.getElementById("gl-je-desc").value.trim();
  let isAdj = document.getElementById("gl-is-adjusting").checked;
  let lines = glJeLines.filter(l => l.accountId || (parseFloat(l.debit)||0)+(parseFloat(l.credit)||0)>0);

  if (!desc) { toast("Please enter a description", "warning"); return; }
  if (lines.length < 1) { toast("Add at least one account line", "warning"); return; }

  let totalDr  = lines.reduce((s,l)=>s+(parseFloat(l.debit)||0),0);
  let totalCr  = lines.reduce((s,l)=>s+(parseFloat(l.credit)||0),0);
  let balanced = Math.abs(totalDr-totalCr) < 0.01 && totalDr > 0;

  db.collection("journalEntries").add({
    clientId:    glClientId,
    periodId:    glPeriodId,
    entryDate:   date ? firebase.firestore.Timestamp.fromDate(new Date(date+"T12:00:00")) : null,
    description: desc,
    isAdjusting: isAdj,
    status:      "draft",
    isBalanced:  balanced,
    lines: lines.map(l=>({
      accountId:     l.accountId||"",
      accountNumber: l.accountNumber||"",
      accountName:   l.accountName||"",
      debit:         parseFloat(l.debit)||0,
      credit:        parseFloat(l.credit)||0
    })),
    postedBy:  "Anthony Sesny",
    createdAt: firebase.firestore.FieldValue.serverTimestamp()
  }).then(() => {
    glCurrentView = "drafts";
    cancelGLEntry();
    loadGLEntries();
    toast("Saved as draft", "info");
  }).catch(e => toast(e.message, "error"));
}

function saveDraftUpdate(id) {
  let month = document.getElementById("gl-je-date-month")?.value;
  let day   = document.getElementById("gl-je-date-day")?.value;
  let year  = document.getElementById("gl-je-date-year")?.value;
  let date  = (year && month && day) ? year+"-"+month+"-"+day : "";
  let desc  = document.getElementById("gl-je-desc").value.trim();
  let isAdj = document.getElementById("gl-is-adjusting").checked;
  let lines = glJeLines.filter(l => l.accountId || (parseFloat(l.debit)||0)+(parseFloat(l.credit)||0)>0);

  if (!desc) { toast("Please enter a description", "warning"); return; }

  let totalDr  = lines.reduce((s,l)=>s+(parseFloat(l.debit)||0),0);
  let totalCr  = lines.reduce((s,l)=>s+(parseFloat(l.credit)||0),0);
  let balanced = Math.abs(totalDr-totalCr) < 0.01 && totalDr > 0;

  db.collection("journalEntries").doc(id).update({
    entryDate:   date ? firebase.firestore.Timestamp.fromDate(new Date(date+"T12:00:00")) : null,
    description: desc,
    isAdjusting: isAdj,
    status:      "draft",
    isBalanced:  balanced,
    lines: lines.map(l=>({
      accountId:l.accountId||"", accountNumber:l.accountNumber||"",
      accountName:l.accountName||"", debit:parseFloat(l.debit)||0, credit:parseFloat(l.credit)||0
    })),
    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
  }).then(() => {
    glCurrentView = "drafts";
    cancelGLEntry();
    loadGLEntries();
    toast("Draft saved", "info");
  }).catch(e => toast(e.message, "error"));
}

function postDraftEntry(id) {
  db.collection("journalEntries").doc(id).get().then(doc => {
    if (!doc.exists) return;
    let e = doc.data();
    let totalDr = e.lines.reduce((s,l)=>s+(parseFloat(l.debit)||0),0);
    let totalCr = e.lines.reduce((s,l)=>s+(parseFloat(l.credit)||0),0);
    if (Math.abs(totalDr-totalCr) > 0.01) {
      toast("Cannot post — entry is not balanced. Edit it first.", "warning");
      return;
    }
    showModal({ title:"Post Entry", message:"Post this draft to the General Ledger? It will be included in financial statements.",
      confirmText:"Post", type:"success", onConfirm: function() {
        db.collection("journalEntries").doc(id).update({
          status:     "posted",
          isBalanced: true,
          postedAt:   firebase.firestore.FieldValue.serverTimestamp()
        }).then(() => {
          glCurrentView = "posted";
          loadGLEntries();
          toast("Entry posted", "success");
        }).catch(e => toast(e.message, "error"));
      }
    });
  });
}

function filterGLByAccount() {
  let filterAcct = document.getElementById("gl-acct-filter")?.value;
  let entries    = window._glEntries || [];
  let filtered   = filterAcct
    ? entries.filter(e => e.lines.some(l => l.accountNumber === filterAcct))
    : entries;

  let list = document.getElementById("gl-entries-list");
  if (!list) return;

  if (!filtered.length) {
    list.innerHTML = `<div style="padding:24px;text-align:center;color:var(--text-dim);font-size:13px;">No entries found for this account.</div>`;
    return;
  }

  list.innerHTML = filtered.map(e => {
    let totalDr  = e.lines.reduce((s,l)=>s+(parseFloat(l.debit)||0),0);
    let totalCr  = e.lines.reduce((s,l)=>s+(parseFloat(l.credit)||0),0);
    let balanced = Math.abs(totalDr-totalCr) < 0.01;
    let dateStr  = e.entryDate ? new Date(e.entryDate.seconds*1000).toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"}) : "—";
    return `<div class="je-list-row">
      <span class="je-date">${dateStr}</span>
      <span class="je-desc">${e.description||"—"}${e.isAdjusting?` <span class="je-adj-tag">ADJ</span>`:""}</span>
      <span class="je-amount">$${fmtMoney(totalDr)}</span>
      <span class="je-amount">$${fmtMoney(totalCr)}</span>
      <span class="status-pill ${balanced?"filed":"review"}">${balanced?"Balanced":"Unbalanced"}</span>
      <div style="display:flex;gap:6px;">
        <button class="ghost-btn" onclick="expandGLEntry('${e._id}',this)">View</button>
        <button class="ghost-btn" onclick="editGLEntry('${e._id}')">Edit</button>
        <button class="action-btn-delete" onclick="deleteGLEntry('${e._id}')">Delete</button>
      </div>
    </div>`;
  }).join("");
}

// ══════════════════════════════════════
//  DEPRECIATION SCHEDULE
// ══════════════════════════════════════

const MACRS_TABLES = {
  "3-year":  [33.33, 44.45, 14.81, 7.41],
  "5-year":  [20.00, 32.00, 19.20, 11.52, 11.52, 5.76],
  "7-year":  [14.29, 24.49, 17.49, 12.49, 8.93, 8.92, 8.93, 4.46],
  "10-year": [10.00, 18.00, 14.40, 11.52, 9.22, 7.37, 6.55, 6.55, 6.56, 6.55, 3.28],
  "15-year": [5.00, 9.50, 8.55, 7.70, 6.93, 6.23, 5.90, 5.90, 5.91, 5.90, 5.91, 5.90, 5.91, 5.90, 5.91, 2.95]
};

function _getPeriodFraction(periodType) {
  if (periodType === "quarterly") return 1/4;
  if (periodType === "monthly")   return 1/12;
  return 1;
}

function calcPeriodDepr(asset, currentYear, periodType) {
  let purchaseYear = new Date(asset.purchaseDate + "T12:00:00").getFullYear();
  let fraction     = _getPeriodFraction(periodType);

  if (asset.method === "straight-line") {
    let life    = Math.max(parseInt(asset.usefulLife) || 5, 1);
    let salvage = parseFloat(asset.salvageValue) || 0;
    let annual  = (asset.cost - salvage) / life;
    let elapsed = currentYear - purchaseYear;
    if (elapsed < 0 || elapsed >= life) return 0;
    return annual * fraction;
  }

  if (asset.method === "macrs") {
    let table = MACRS_TABLES[asset.macrsClass];
    if (!table) return 0;
    let idx = currentYear - purchaseYear;
    if (idx < 0 || idx >= table.length) return 0;
    return (table[idx] / 100) * asset.cost * fraction;
  }

  return 0;
}

function calcAccumDepr(asset, throughYear) {
  let purchaseYear = new Date(asset.purchaseDate + "T12:00:00").getFullYear();
  let total = 0;

  if (asset.method === "straight-line") {
    let life    = Math.max(parseInt(asset.usefulLife) || 5, 1);
    let salvage = parseFloat(asset.salvageValue) || 0;
    let annual  = (asset.cost - salvage) / life;
    let years   = Math.min(throughYear - purchaseYear, life);
    if (years > 0) total = annual * years;
  } else if (asset.method === "macrs") {
    let table = MACRS_TABLES[asset.macrsClass];
    if (table) {
      let years = Math.min(throughYear - purchaseYear, table.length);
      for (let i = 0; i < years; i++) total += (table[i] / 100) * asset.cost;
    }
  }

  return Math.max(total, 0);
}

function toggleDepreciationPanel() {
  let panel = document.getElementById("depreciation-panel");
  if (!panel) return;
  if (panel.style.display === "none" || panel.style.display === "") {
    panel.style.display = "block";
    loadDepreciationAssets();
  } else {
    panel.style.display = "none";
  }
}

async function loadDepreciationAssets() {
  if (!activeEntity.clientId) return;
  let panel = document.getElementById("depreciation-panel");
  if (!panel) return;
  panel.innerHTML = `<div class="dash-card" style="padding:24px;text-align:center;color:var(--text-dim);font-size:13px;">Loading assets...</div>`;

  let snap = await db.collection("clientLedger").doc(activeEntity.clientId)
    .collection("fixedAssets").where("isActive", "==", true).get();

  let assets = [];
  snap.forEach(doc => { let d = doc.data(); d._id = doc.id; assets.push(d); });
  assets.sort((a,b) => (a.purchaseDate || "").localeCompare(b.purchaseDate || ""));
  renderDepreciationPanel(assets);
}

function renderDepreciationPanel(assets) {
  let panel = document.getElementById("depreciation-panel");
  if (!panel) return;

  let currentYear = parseInt((activeEntity.periodLabel || "").match(/\d{4}/)?.[0]) || new Date().getFullYear();
  let periodType  = activeEntity.periodType || "annual";
  let totalPeriodDepr = 0;

  let rows = assets.map(a => {
    let periodDepr = calcPeriodDepr(a, currentYear, periodType);
    let accumDepr  = calcAccumDepr(a, currentYear);
    let nbv        = a.cost - accumDepr;
    totalPeriodDepr += periodDepr;
    let methodLabel = a.method === "macrs" ? `MACRS ${a.macrsClass}` : `SL ${a.usefulLife}yr`;
    return `<div class="depr-row">
      <span class="depr-name">${esc(a.name)}</span>
      <span class="depr-cell">$${fmtMoney(a.cost)}</span>
      <span class="depr-cell">${a.purchaseDate || "—"}</span>
      <span class="depr-cell">${methodLabel}</span>
      <span class="depr-cell depr-highlight">$${fmtMoney(periodDepr)}</span>
      <span class="depr-cell">$${fmtMoney(accumDepr)}</span>
      <span class="depr-cell">$${fmtMoney(nbv)}</span>
      <button class="action-btn-delete" onclick="deleteFixedAsset('${a._id}')" title="Remove asset">×</button>
    </div>`;
  }).join("");

  if (!assets.length) {
    rows = `<div style="padding:24px;text-align:center;color:var(--text-dim);font-size:13px;">No fixed assets on file. Click "+ Add Asset" to add one.</div>`;
  }

  panel.innerHTML = `
    <div class="dash-card" style="padding:0;overflow:hidden;">
      <div class="depr-header">
        <div class="depr-header-left">
          <span class="depr-title">Depreciation Schedule</span>
          <span class="depr-period-badge">${esc(activeEntity.periodLabel || "")}</span>
        </div>
        <div class="depr-header-right">
          <button class="ghost-btn" onclick="showAddAssetForm()">+ Add Asset</button>
          <button class="primary-btn" ${totalPeriodDepr <= 0 ? "disabled" : ""}
            onclick="postDepreciationEntry(${totalPeriodDepr.toFixed(2)})">
            Post Entry ($${fmtMoney(totalPeriodDepr)})
          </button>
          <button class="ghost-btn depr-close-btn" onclick="toggleDepreciationPanel()" title="Close">✕</button>
        </div>
      </div>
      <div id="depr-add-form-area" style="display:none;"></div>
      <div class="depr-table-header">
        <span>Asset</span><span>Cost</span><span>Acquired</span>
        <span>Method</span><span>Period Depr</span><span>Accum Depr</span><span>Book Value</span><span></span>
      </div>
      <div id="depr-asset-rows">${rows}</div>
      <div class="depr-footer">
        <span>Total Period Depreciation</span>
        <span class="depr-total-amt">$${fmtMoney(totalPeriodDepr)}</span>
      </div>
    </div>`;
}

function showAddAssetForm() {
  let area = document.getElementById("depr-add-form-area");
  if (!area) return;
  if (area.style.display === "block") { area.style.display = "none"; return; }
  area.style.display = "block";
  area.innerHTML = `
    <div class="depr-add-form">
      <div class="depr-form-row">
        <div class="depr-form-group">
          <label>Asset Name</label>
          <input type="text" id="depr-f-name" class="modal-input" placeholder="e.g. Delivery Van">
        </div>
        <div class="depr-form-group">
          <label>Cost</label>
          <input type="number" id="depr-f-cost" class="modal-input" placeholder="45000" min="0" step="0.01">
        </div>
        <div class="depr-form-group">
          <label>Purchase Date</label>
          <input type="date" id="depr-f-date" class="modal-input">
        </div>
      </div>
      <div class="depr-form-row">
        <div class="depr-form-group">
          <label>Method</label>
          <select id="depr-f-method" class="assign-select" onchange="onDeprMethodChange()">
            <option value="straight-line">Straight-Line</option>
            <option value="macrs">MACRS</option>
          </select>
        </div>
        <div class="depr-form-group" id="depr-f-life-group">
          <label>Useful Life (years)</label>
          <input type="number" id="depr-f-life" class="modal-input" placeholder="5" min="1" step="1" value="5">
        </div>
        <div class="depr-form-group" id="depr-f-salvage-group">
          <label>Salvage Value</label>
          <input type="number" id="depr-f-salvage" class="modal-input" placeholder="0" min="0" step="0.01" value="0">
        </div>
        <div class="depr-form-group" id="depr-f-macrs-group" style="display:none;">
          <label>MACRS Class</label>
          <select id="depr-f-macrs" class="assign-select">
            <option value="3-year">3-Year Property</option>
            <option value="5-year" selected>5-Year Property</option>
            <option value="7-year">7-Year Property</option>
            <option value="10-year">10-Year Property</option>
            <option value="15-year">15-Year Property</option>
          </select>
        </div>
      </div>
      <div style="display:flex;gap:8px;padding:0 20px 16px;">
        <button class="primary-btn" onclick="saveFixedAsset()">Save Asset</button>
        <button class="ghost-btn" onclick="document.getElementById('depr-add-form-area').style.display='none'">Cancel</button>
      </div>
    </div>`;
}

function onDeprMethodChange() {
  let method = document.getElementById("depr-f-method")?.value;
  let show = (id, visible) => { let el = document.getElementById(id); if (el) el.style.display = visible ? "block" : "none"; };
  if (method === "macrs") {
    show("depr-f-life-group", false);
    show("depr-f-salvage-group", false);
    show("depr-f-macrs-group", true);
  } else {
    show("depr-f-life-group", true);
    show("depr-f-salvage-group", true);
    show("depr-f-macrs-group", false);
  }
}

async function saveFixedAsset() {
  let name         = document.getElementById("depr-f-name")?.value.trim();
  let cost         = parseFloat(document.getElementById("depr-f-cost")?.value);
  let purchaseDate = document.getElementById("depr-f-date")?.value;
  let method       = document.getElementById("depr-f-method")?.value;
  let usefulLife   = parseInt(document.getElementById("depr-f-life")?.value)    || 5;
  let salvageValue = parseFloat(document.getElementById("depr-f-salvage")?.value) || 0;
  let macrsClass   = document.getElementById("depr-f-macrs")?.value || "5-year";

  if (!name)              { toast("Asset name is required", "warning"); return; }
  if (!cost || cost <= 0) { toast("Enter a valid cost", "warning");     return; }
  if (!purchaseDate)      { toast("Purchase date is required", "warning"); return; }

  let data = { name, cost, purchaseDate, method, isActive: true,
               createdAt: firebase.firestore.FieldValue.serverTimestamp() };
  if (method === "straight-line") { data.usefulLife = usefulLife; data.salvageValue = salvageValue; }
  if (method === "macrs")          { data.macrsClass = macrsClass; }

  await db.collection("clientLedger").doc(activeEntity.clientId)
    .collection("fixedAssets").add(data);
  toast("Asset added", "success");
  loadDepreciationAssets();
}

async function deleteFixedAsset(id) {
  await db.collection("clientLedger").doc(activeEntity.clientId)
    .collection("fixedAssets").doc(id).update({ isActive: false });
  toast("Asset removed", "success");
  loadDepreciationAssets();
}

async function postDepreciationEntry(totalAmount) {
  if (!activeEntity.clientId || !activeEntity.periodId) { toast("No entity selected", "warning"); return; }
  if (!totalAmount || totalAmount <= 0) { toast("No depreciation to post", "warning"); return; }

  await initChartOfAccounts();
  let deprExpAcct   = chartOfAccounts.find(a => a.number === "640");
  let accumDeprAcct = chartOfAccounts.find(a => a.number === "151");

  if (!deprExpAcct || !accumDeprAcct) {
    toast("Depreciation accounts (640 / 151) not found in chart of accounts", "error"); return;
  }

  let currentYear = parseInt((activeEntity.periodLabel || "").match(/\d{4}/)?.[0]) || new Date().getFullYear();
  let entryDate   = `${currentYear}-12-31`;

  db.collection("journalEntries").add({
    clientId:    activeEntity.clientId,
    periodId:    activeEntity.periodId,
    entryDate:   firebase.firestore.Timestamp.fromDate(new Date(entryDate + "T12:00:00")),
    description: `Depreciation expense — ${activeEntity.periodLabel}`,
    isAdjusting: true,
    status:      "posted",
    isBalanced:  true,
    lines: [
      { accountId: deprExpAcct._id,   accountNumber: deprExpAcct.number,   accountName: deprExpAcct.name,
        debit: parseFloat(totalAmount.toFixed(2)), credit: 0 },
      { accountId: accumDeprAcct._id, accountNumber: accumDeprAcct.number, accountName: accumDeprAcct.name,
        debit: 0, credit: parseFloat(totalAmount.toFixed(2)) }
    ],
    postedBy:  "Anthony Sesny",
    createdAt: firebase.firestore.FieldValue.serverTimestamp()
  }).then(() => {
    toast("Depreciation entry posted", "success");
    toggleDepreciationPanel();
    loadGLEntries();
  }).catch(e => toast(e.message, "error"));
}

// ══════════════════════════════════════
//  MASTER ACCOUNTS TAB
// ══════════════════════════════════════

function loadMasterAccountsTab() {
  initChartOfAccounts().then(() => renderMasterAccounts());
}

function renderMasterAccounts() {
  let el = document.getElementById("master-accounts-main");
  if (!el) return;

  // Check if any accounts have isCore as string — show migration button if so
  let needsMigration = chartOfAccounts.some(a => a.isCore === "true" || a.isCore === "false");
  let migrationBanner = needsMigration ? `
    <div style="background:var(--orange-light);border:1px solid var(--orange);border-radius:10px;padding:14px 20px;margin-bottom:16px;display:flex;justify-content:space-between;align-items:center;">
      <span style="font-size:13px;color:var(--orange);font-weight:600;">⚠ Some accounts have isCore set as text instead of boolean. Click Fix to correct this automatically.</span>
      <button class="primary-btn" onclick="migrateIsCore()">Fix Now</button>
    </div>` : "";

  el.innerHTML = `
    ${migrationBanner}
    <div class="dash-card" style="padding:0;overflow:hidden;">
      <div class="coa-header">
        <span>Number</span>
        <span>Account Name</span>
        <span>Type</span>
        <span>Sub-Type</span>
        <span>Normal Balance</span>
        <span>Actions</span>
      </div>
      <div id="master-coa-list">${renderMasterCOARows()}</div>
    </div>`;
}

function migrateIsCore() {
  let masterNumbers = new Set(MASTER_COA.map(a => a.number));
  let batch = db.batch();
  let count = 0;

  chartOfAccounts.forEach(a => {
    // Set isCore to proper boolean based on whether it's in the master list
    let shouldBeCore = masterNumbers.has(a.number);
    if (a.isCore !== shouldBeCore) {
      let ref = db.collection("chartOfAccounts").doc(a._id);
      batch.update(ref, { isCore: shouldBeCore });
      a.isCore = shouldBeCore;
      count++;
    }
  });

  if (count === 0) {
    toast("All accounts already have correct isCore values.", "info");
    return;
  }

  batch.commit().then(() => {
    toast(`Fixed ${count} accounts successfully.`, "success");
    renderMasterAccounts();
  }).catch(e => toast("Failed: " + e.message, "error"));
}

function renderMasterCOARows() {
  if (!chartOfAccounts.length) return `<div style="padding:24px;text-align:center;color:var(--text-dim);font-size:13px;">Loading accounts...</div>`;

  let subTypeLabels = {
    current_asset:"Current Asset", fixed_asset:"Fixed Asset", contra_asset:"Contra Asset",
    other_asset:"Other Asset", current_liability:"Current Liability",
    long_term_liability:"Long-Term Liability", paid_in_capital:"Paid-In Capital",
    retained_earnings:"Retained Earnings", distributions:"Distributions",
    contra_equity:"Contra Equity", operating_revenue:"Operating Revenue",
    contra_revenue:"Contra-Revenue", other_revenue:"Other Revenue", cogs:"COGS",
    operating_expense:"Operating Expense", other_expense:"Other Expense", tax:"Tax"
  };

  return chartOfAccounts.map(a => {
    let isCore = a.isCore === true || a.isCore === "true";
    let actions = `<button class="form-action-btn" onclick="editAccountModal('${a._id}')">Edit</button>`;
    if (!isCore) {
      actions += `<button class="form-action-btn delete" onclick="deleteAccount('${a._id}','${a.name.replace(/'/g,"\\'")}')">Delete</button>`;
    }
    return `
    <div class="coa-row-full">
      <span class="coa-num">${a.number}</span>
      <span class="coa-name">${a.name}</span>
      <span class="coa-type">${a.type}</span>
      <span class="coa-subtype">${subTypeLabels[a.subType]||a.subType}</span>
      <span class="coa-bal ${a.normalBalance}">${a.normalBalance}</span>
      <div style="display:flex;gap:8px;align-items:center;">${actions}</div>
    </div>`;
  }).join("");
}

function toggleAccountActive(id, current) {
  db.collection("chartOfAccounts").doc(id).update({ isActive: !current }).then(() => {
    let a = chartOfAccounts.find(x=>x._id===id);
    if (a) a.isActive = !current;
    let list = document.getElementById("master-coa-list");
    if (list) list.innerHTML = renderMasterCOARows();
  });
}

function deleteAccount(id, name) {
  showModal({
    title: "Delete Account",
    message: `Delete account "${name}"? This cannot be undone.`,
    confirmText: "Delete",
    type: "danger",
    onConfirm: () => {
      db.collection("chartOfAccounts").doc(id).delete().then(() => {
        chartOfAccounts = chartOfAccounts.filter(a=>a._id!==id);
        let list = document.getElementById("master-coa-list");
        if (list) list.innerHTML = renderMasterCOARows();
      });
    }
  });
}

function editAccountModal(id) {
  let a = chartOfAccounts.find(x=>x._id===id);
  if (!a) return;
  // Pre-fill add account modal with existing values
  openAddAccountModal();
  setTimeout(() => {
    document.getElementById("aa-number").value = a.number;
    document.getElementById("aa-name").value   = a.name;
    document.getElementById("aa-type").value   = a.type;
    document.getElementById("aa-subtype").value= a.subType;
    document.getElementById("aa-normal").value = a.normalBalance;
    // Change save button to update
    let btn = document.querySelector("#add-account-modal .primary-btn");
    if (btn) { btn.textContent = "Save Changes"; btn.onclick = () => updateAccount(id); }
  }, 100);
}

function updateAccount(id) {
  let number = document.getElementById("aa-number").value.trim();
  let name   = document.getElementById("aa-name").value.trim();
  let type   = document.getElementById("aa-type").value;
  let sub    = document.getElementById("aa-subtype").value;
  let nb     = document.getElementById("aa-normal").value;

  if (!number || !name) { toast("Number and name are required.", "warning"); return; }

  db.collection("chartOfAccounts").doc(id).update({ number, name, type, subType: sub, normalBalance: nb })
    .then(() => {
      let a = chartOfAccounts.find(x=>x._id===id);
      if (a) { a.number=number; a.name=name; a.type=type; a.subType=sub; a.normalBalance=nb; }
      chartOfAccounts.sort((a,b)=>parseInt(a.number)-parseInt(b.number));
      closeAddAccountModal();
      let list = document.getElementById("master-coa-list");
      if (list) list.innerHTML = renderMasterCOARows();
    }).catch(e => toast("Failed: " + e.message, "error"));
}

// ══════════════════════════════════════
//  ADD ACCOUNT (shared modal)
// ══════════════════════════════════════

function openAddAccountModal() {
  let modal = document.getElementById("add-account-modal");
  if (!modal) return;
  // Reset button
  let btn = modal.querySelector(".primary-btn");
  if (btn) { btn.textContent = "Add Account"; btn.onclick = saveNewAccount; }
  modal.style.display = "flex";
  onAddAccountTypeChange();
}

function closeAddAccountModal() {
  document.getElementById("add-account-modal").style.display = "none";
}

function onAddAccountTypeChange() {
  let type   = document.getElementById("aa-type").value;
  let ranges = { asset:"100-199", liability:"200-299", equity:"300-399", revenue:"400-499", cogs:"500-599", expense:"600-699", tax:"800-899" };
  let hint   = document.getElementById("aa-number-hint");
  if (hint) hint.textContent = "(Range: " + (ranges[type]||"") + ")";

  let existing = chartOfAccounts.filter(a=>a.type===type).map(a=>parseInt(a.number));
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

  if (!number) { toast("Please enter an account number.", "warning"); return; }
  if (!name)   { toast("Please enter an account name.", "warning"); return; }
  if (chartOfAccounts.find(a=>a.number===number)) { toast("Account number " + number + " already exists.", "warning"); return; }

  db.collection("chartOfAccounts").add({
    number, name, type, subType:sub, normalBalance:nb,
    isActive:true, isCore:false, createdAt:firebase.firestore.FieldValue.serverTimestamp()
  }).then(ref => {
    chartOfAccounts.push({ _id:ref.id, number, name, type, subType:sub, normalBalance:nb, isActive:true });
    chartOfAccounts.sort((a,b)=>parseInt(a.number)-parseInt(b.number));
    closeAddAccountModal();
    let list = document.getElementById("master-coa-list");
    if (list) list.innerHTML = renderMasterCOARows();
  }).catch(e => toast("Failed: " + e.message, "error"));
}

// ══════════════════════════════════════
//  EXPORT & PUBLISH
// ══════════════════════════════════════

function exportCurrentStatement(tabId) {
  if (!window._finData) { toast("Please select a client and period first.", "warning"); return; }
  if (typeof XLSX === "undefined") { toast("Excel library not loaded.", "warning"); return; }

  let { accounts, periodLabel, clientName } = window._finData;
  let wb   = XLSX.utils.book_new();
  let ni   = window._netIncome || 0;

  // Income Statement
  let isData = [[clientName],["INCOME STATEMENT"],["Period: " + periodLabel],[""],
    ["Acct #","Account Name","Amount"]];
  accounts.filter(a=>a.type==="revenue").forEach(a=>isData.push([a.number,a.name,getBalance(a)]));
  isData.push(["","Total Revenue", accounts.filter(a=>a.type==="revenue").reduce((s,a)=>s+getBalance(a),0)]);
  accounts.filter(a=>a.type==="cogs").forEach(a=>isData.push([a.number,a.name,getBalance(a)]));
  accounts.filter(a=>a.type==="expense").forEach(a=>isData.push([a.number,a.name,getBalance(a)]));
  accounts.filter(a=>a.type==="tax").forEach(a=>isData.push([a.number,a.name,getBalance(a)]));
  isData.push(["","NET INCOME",ni]);
  let wsIS = XLSX.utils.aoa_to_sheet(isData);
  wsIS["!cols"] = [{wch:10},{wch:40},{wch:18}];
  XLSX.utils.book_append_sheet(wb, wsIS, "Income Statement");

  // Trial Balance
  let tbData = [[clientName],["TRIAL BALANCE"],["As of " + periodLabel],[""],
    ["Acct #","Account Name","Debit","Credit"]];
  accounts.forEach(a=>{
    let dr = a.normalBalance==="debit"  ? Math.max(getBalance(a),0) : 0;
    let cr = a.normalBalance==="credit" ? Math.max(getBalance(a),0) : 0;
    tbData.push([a.number,a.name,dr||"",cr||""]);
  });
  let wsTB = XLSX.utils.aoa_to_sheet(tbData);
  wsTB["!cols"] = [{wch:10},{wch:40},{wch:18},{wch:18}];
  XLSX.utils.book_append_sheet(wb, wsTB, "Trial Balance");

  XLSX.writeFile(wb, clientName.replace(/\s+/g,"-") + "_" + periodLabel.replace(/\s+/g,"-") + "_Financials.xlsx");
}

function publishCurrentStatement(tabId) {
  if (!window._finData) { toast("Please select a client and period first.", "warning"); return; }
  showModal({
    title: "Publish Statements",
    message: "Publish financial statements to the client portal?",
    confirmText: "Publish",
    type: "default",
    onConfirm: () => {
      let { accounts, periodLabel, clientId, periodId, clientName } = window._finData;
      let batch = db.batch();

      ["income","balance","cashflow","equity"].forEach(type => {
        let ref = db.collection("financialStatements").doc(clientId + "_" + periodId + "_" + type);
        batch.set(ref, {
          clientId, clientName, periodId, periodLabel,
          statementType: type, accounts,
          netIncome: window._netIncome || 0,
          published: true,
          publishedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
      });

      batch.commit().then(() => {
        toast("Statements published to client portal!", "success");
        db.collection("activity").add({
          clientId, type:"ready",
          text:"Financial statements published for " + periodLabel,
          createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });
      }).catch(e => toast("Failed: " + e.message, "error"));
    }
  });
}

// ══════════════════════════════════════
//  PRINT / PDF EXPORT
// ══════════════════════════════════════

function printCurrentStatement(tabId) {
  let outputEl = document.getElementById(tabId + "-stmt-output");
  if (!outputEl) { toast("No statement loaded to print.", "warning"); return; }
  let { periodLabel, clientName } = window._finData || {};
  let titleMap = { is:"Income Statement", bs:"Balance Sheet", scf:"Statement of Cash Flows", sshe:"Statement of Shareholders' Equity" };
  let title = titleMap[tabId] || "Financial Statement";

  let win = window.open("", "_blank");
  win.document.write(`<!DOCTYPE html><html><head>
    <title>${clientName} — ${title}</title>
    <style>
      * { box-sizing: border-box; margin: 0; padding: 0; }
      body { font-family: 'Georgia', serif; font-size: 12px; color: #111; background: #fff; padding: 48px; max-width: 900px; margin: 0 auto; }
      .stmt-firm-name { font-size: 11px; font-weight: 700; letter-spacing: 2px; text-transform: uppercase; text-align: center; color: #444; margin-bottom: 2px; }
      .stmt-company { font-size: 18px; font-weight: 700; text-align: center; margin-bottom: 4px; }
      .stmt-title { font-size: 14px; font-weight: 600; text-align: center; margin-bottom: 2px; }
      .stmt-period { font-size: 12px; text-align: center; color: #555; margin-bottom: 2px; }
      .stmt-units { font-size: 10px; text-align: center; color: #888; margin-bottom: 24px; }
      .stmt-section-header { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; color: #555; padding: 12px 0 4px; border-bottom: 1px solid #ccc; margin-bottom: 2px; }
      .stmt-row { display: flex; justify-content: space-between; padding: 3px 0 3px 16px; font-size: 12px; }
      .stmt-bold { font-weight: 700; }
      .stmt-total { border-top: 1px solid #999; padding-top: 4px; }
      .stmt-acct-num { color: #888; min-width: 40px; font-size: 11px; }
      .stmt-acct-amt { text-align: right; min-width: 120px; font-family: 'Courier New', monospace; }
      .stmt-net-income { display: flex; justify-content: space-between; font-size: 15px; font-weight: 800; padding: 12px 0; border-top: 3px double #111; margin-top: 8px; }
      .stmt-ebitda-row { display: flex; justify-content: space-between; padding: 4px 0 4px 16px; font-style: italic; color: #444; font-size: 11px; }
      .stmt-gross-profit { display: flex; justify-content: space-between; padding: 4px 0; font-weight: 700; background: #f9f9f9; }
      .stmt-divider { border-bottom: 1px solid #ddd; margin: 8px 0; }
      .stmt-two-col { display: flex; gap: 48px; }
      .stmt-col { flex: 1; }
      .equity-table { width: 100%; }
      .equity-header { display: flex; justify-content: space-between; font-weight: 700; border-bottom: 2px solid #111; padding-bottom: 4px; margin-bottom: 8px; }
      .equity-row { display: flex; justify-content: space-between; padding: 3px 0; }
      .equity-subtotal { font-weight: 700; border-top: 1px solid #999; }
      .equity-total { display: flex; justify-content: space-between; font-weight: 800; font-size: 14px; border-top: 3px double #111; padding-top: 8px; margin-top: 8px; }
      .stmt-print-btn { display: none; }
      .stmt-gp-pct { font-size: 10px; color: #555; font-style: italic; }
      .stmt-net-margin-pct { font-size: 10px; color: #555; font-style: italic; font-weight: 400; }
      .stmt-ebitda-hint { font-size: 10px; color: #888; }
      @media print { body { padding: 24px; } }
    </style>
  </head><body>
    ${outputEl.innerHTML}
  </body></html>`);
  win.document.close();
  win.focus();
  setTimeout(() => win.print(), 400);
}
