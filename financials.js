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

  if (bestMatch) bestMatch.selected = true;
  sel.disabled = false;

  // Add "＋ Add Period" option at the bottom
  let addOpt = document.createElement("option");
  addOpt.value = "__add__";
  addOpt.textContent = "+ Add Period";
  sel.appendChild(addOpt);

  // Handle + Add Period selection
  sel.onchange = function() {
    if (sel.value === "__add__") {
      sel.value = bestMatch ? bestMatch.value : "";
      showInputModal({
        title: "Add Period",
        fields: [
          { id:"year", label:"Tax Year", type:"number", placeholder:"e.g. 2023", value: new Date().getFullYear() - 3 },
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
          // Reload the dropdown
          await loadPeriodsForClient(clientId, periodSelectId);
          // Re-fire the change event if there's a handler
          sel.dispatchEvent(new Event("change"));
        }
      });
    }
  };
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

function stmtRow(number, name, amount, indent, bold, total, editable, id) {
  let amtDisplay = amount !== null ? "$" + fmtMoney(amount) : "";
  if (editable) {
    return `<div class="stmt-row ${bold?"stmt-bold":""} ${total?"stmt-total":""}" style="padding-left:${indent}px">
      <span class="stmt-acct-num">${number||""}</span>
      <span class="stmt-acct-name">${name}</span>
      <input class="stmt-edit-input" type="number" value="${amount||0}" step="0.01"
        data-id="${id||""}" onchange="onStmtEdit(this)">
    </div>`;
  }
  return `<div class="stmt-row ${bold?"stmt-bold":""} ${total?"stmt-total":""}" style="padding-left:${indent}px">
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

  let clientOpts = clients.map(c =>
    `<option value="${c.uid}">${c.name}</option>`).join("");

  el.innerHTML = `
    <div class="acct-selectors">
      <div class="acct-selector-group">
        <label>Client</label>
        <select id="${tabId}-client" class="assign-select" onchange="onStmtClientChange('${tabId}')">
          <option value="">— Select Client —</option>
          ${clientOpts}
        </select>
      </div>
      <div class="acct-selector-group">
        <label>Period</label>
        <select id="${tabId}-period" class="assign-select" disabled onchange="onStmtPeriodChange('${tabId}')">
          <option value="">— Select Period —</option>
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
}

async function onStmtClientChange(tabId) {
  let clientSel = document.getElementById(tabId + "-client");
  let periodSel = document.getElementById(tabId + "-period");
  if (!clientSel || !periodSel) return;
  let clientId = clientSel.value;
  if (!clientId) { periodSel.disabled = true; periodSel.innerHTML = `<option value="">— Select Period —</option>`; return; }
  await loadPeriodsForClient(clientId, tabId + "-period");
  periodSel.disabled = false;
}

async function onStmtPeriodChange(tabId) {
  let clientSel = document.getElementById(tabId + "-client");
  let periodSel = document.getElementById(tabId + "-period");
  if (!clientSel || !periodSel) return;
  let clientId    = clientSel.value;
  let periodId    = periodSel.value;
  let periodLabel = periodSel.options[periodSel.selectedIndex]?.textContent || "";
  let companyName = periodSel.options[periodSel.selectedIndex]?.dataset.companyName
                 || clientSel.options[clientSel.selectedIndex]?.textContent || "";
  let periodType  = periodSel.options[periodSel.selectedIndex]?.dataset.periodType || "annual";
  if (!clientId || !periodId) return;

  stmtOverrides = {};
  stmtEditMode  = false;
  window._currentTabId = tabId;

  let output = document.getElementById(tabId + "-stmt-output");
  if (output) output.innerHTML = `<div style="padding:32px;text-align:center;color:var(--text-dim);font-size:13px;">Computing from journal entries...</div>`;

  await initChartOfAccounts();

  // Get date range for this period and filter entries accordingly
  let { from, to } = getPeriodDateRange(periodLabel, periodType);
  let accounts = await computeBalances(clientId, periodId, from, to);

  window._finData = { accounts, periodLabel, clientName: companyName, clientId, periodId, tabId };

  // Show action buttons
  ["export-btn","publish-btn"].forEach(id => {
    let btn = document.getElementById(tabId + "-" + id);
    if (btn) btn.style.display = "inline-flex";
  });

  renderCurrentStatement(tabId, accounts, periodLabel, companyName);
}

function renderCurrentStatement(tabId, accounts, periodLabel, companyName) {
  if (tabId === "is")   renderIS(accounts, periodLabel, companyName);
  if (tabId === "bs")   renderBS(accounts, periodLabel, companyName);
  if (tabId === "scf")  renderSCF(accounts, periodLabel, companyName);
  if (tabId === "sshe") renderSSHE(accounts, periodLabel, companyName);
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

function renderIS(accounts, periodLabel, companyName) {
  let el = document.getElementById("is-stmt-output");
  if (!el) return;

  let revenue  = accounts.filter(a => a.type==="revenue");
  let cogs     = accounts.filter(a => a.type==="cogs");
  let opex     = accounts.filter(a => a.type==="expense" && a.subType==="operating_expense");
  let otherExp = accounts.filter(a => a.type==="expense" && a.subType==="other_expense");
  let tax      = accounts.filter(a => a.type==="tax");

  let totalRevenue    = revenue.reduce((s,a)  => s+getBalance(a), 0);
  let totalCOGS       = cogs.reduce((s,a)     => s+getBalance(a), 0);
  let grossProfit     = totalRevenue - totalCOGS;
  let totalOpEx       = opex.reduce((s,a)     => s+getBalance(a), 0);
  let incomeFromOps   = grossProfit - totalOpEx;
  let totalOtherExp   = otherExp.reduce((s,a) => s+getBalance(a), 0);
  let incomeBeforeTax = incomeFromOps - totalOtherExp;
  let totalTax        = tax.reduce((s,a)      => s+getBalance(a), 0);
  let netIncome       = incomeBeforeTax - totalTax;
  window._netIncome   = netIncome;

  let html = `<div class="stmt-wrapper">
    <div class="stmt-header">
      <div class="stmt-company">${companyName}</div>
      <div class="stmt-title">Income Statement</div>
      <div class="stmt-period">For the Period: ${periodLabel}</div>
    </div>`;

  if (revenue.length) {
    html += stmtSection("REVENUE");
    revenue.forEach(a  => { html += stmtRow(a.number,a.name,getBalance(a),32,false,false,stmtEditMode,a._id); });
    html += stmtRow("","Total Revenue",totalRevenue,32,true,true,false,"");
    html += stmtDivider();
  }
  if (cogs.length) {
    html += stmtSection("COST OF GOODS SOLD");
    cogs.forEach(a => { html += stmtRow(a.number,a.name,getBalance(a),32,false,false,stmtEditMode,a._id); });
    html += stmtRow("","Total COGS",totalCOGS,32,true,true,false,"");
    html += stmtRow("","Gross Profit",grossProfit,0,true,true,false,"");
    html += stmtDivider();
  }
  if (opex.length) {
    html += stmtSection("OPERATING EXPENSES");
    opex.forEach(a => { html += stmtRow(a.number,a.name,getBalance(a),32,false,false,stmtEditMode,a._id); });
    html += stmtRow("","Total Operating Expenses",totalOpEx,32,true,true,false,"");
    html += stmtRow("","Income from Operations",incomeFromOps,0,true,true,false,"");
    html += stmtDivider();
  }
  if (otherExp.length) {
    html += stmtSection("OTHER EXPENSES");
    otherExp.forEach(a => { html += stmtRow(a.number,a.name,getBalance(a),32,false,false,stmtEditMode,a._id); });
    html += stmtRow("","Total Other Expenses",totalOtherExp,32,true,true,false,"");
    html += stmtRow("","Income Before Tax",incomeBeforeTax,0,true,true,false,"");
    html += stmtDivider();
  }
  if (tax.length) {
    html += stmtSection("INCOME TAX");
    tax.forEach(a => { html += stmtRow(a.number,a.name,getBalance(a),32,false,false,stmtEditMode,a._id); });
    html += stmtDivider();
  }
  html += `<div class="stmt-net-income"><span>NET INCOME</span><span>$${fmtMoney(netIncome)}</span></div></div>`;
  el.innerHTML = html;
}

// ══════════════════════════════════════
//  BALANCE SHEET
// ══════════════════════════════════════

function renderBS(accounts, periodLabel, companyName) {
  let el = document.getElementById("bs-stmt-output");
  if (!el) return;

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

  let html = `<div class="stmt-wrapper">
    <div class="stmt-header">
      <div class="stmt-company">${companyName}</div>
      <div class="stmt-title">Balance Sheet</div>
      <div class="stmt-period">As of ${periodLabel}</div>
    </div>
    <div class="stmt-two-col">
    <div class="stmt-col">`;

  html += stmtSection("ASSETS");
  if (currAssets.length) {
    html += stmtSection("Current Assets");
    currAssets.forEach(a=>{ html += stmtRow(a.number,a.name,getBalance(a),32,false,false,stmtEditMode,a._id); });
    html += stmtRow("","Total Current Assets",tCA,16,true,true,false,"");
  }
  if (fixedAssets.length||contraAssets.length) {
    html += stmtSection("Property, Plant & Equipment");
    fixedAssets.forEach(a=>{ html += stmtRow(a.number,a.name,getBalance(a),32,false,false,stmtEditMode,a._id); });
    contraAssets.forEach(a=>{ html += stmtRow(a.number,a.name,-getBalance(a),32,false,false,stmtEditMode,a._id); });
    html += stmtRow("","Net PP&E",tFA-tCon,16,true,true,false,"");
  }
  if (otherAssets.length) {
    html += stmtSection("Other Assets");
    otherAssets.forEach(a=>{ html += stmtRow(a.number,a.name,getBalance(a),32,false,false,stmtEditMode,a._id); });
  }
  html += stmtDivider();
  html += stmtRow("","TOTAL ASSETS",tA,0,true,true,false,"");

  html += `</div><div class="stmt-col">`;

  html += stmtSection("LIABILITIES");
  if (currLiab.length) {
    html += stmtSection("Current Liabilities");
    currLiab.forEach(a=>{ html += stmtRow(a.number,a.name,getBalance(a),32,false,false,stmtEditMode,a._id); });
    html += stmtRow("","Total Current Liabilities",tCL,16,true,true,false,"");
  }
  if (ltLiab.length) {
    html += stmtSection("Long-Term Liabilities");
    ltLiab.forEach(a=>{ html += stmtRow(a.number,a.name,getBalance(a),32,false,false,stmtEditMode,a._id); });
    html += stmtRow("","Total Long-Term Liabilities",tLL,16,true,true,false,"");
  }
  html += stmtRow("","Total Liabilities",tL,0,true,true,false,"");
  html += stmtDivider();

  html += stmtSection("SHAREHOLDERS' EQUITY");
  equity.forEach(a=>{ html += stmtRow(a.number,a.name,getBalance(a),32,false,false,stmtEditMode,a._id); });
  html += stmtRow("","Net Income (Current Period)",ni,32,false,false,false,"");
  html += stmtRow("","Total Shareholders' Equity",tE,0,true,true,false,"");
  html += stmtDivider();
  html += stmtRow("","TOTAL LIABILITIES & EQUITY",tLE,0,true,true,false,"");

  let diff = Math.abs(tA - tLE);
  html += diff > 0.01
    ? `<div class="stmt-warning">⚠ Out of balance by $${fmtMoney(diff)}</div>`
    : `<div class="stmt-check">✓ Balance sheet balances</div>`;

  html += `</div></div></div>`;
  el.innerHTML = html;
}

// ══════════════════════════════════════
//  CASH FLOW
// ══════════════════════════════════════

function renderSCF(accounts, periodLabel, companyName) {
  let el = document.getElementById("scf-stmt-output");
  if (!el) return;

  let ni       = window._netIncome || 0;
  let g = id  => accounts.filter(a=>a.number===id).reduce((s,a)=>s+getBalance(a),0);
  let depr     = g("640") + g("650");
  let cfOps    = ni + depr - g("110") - g("120") - g("130") + g("200") + g("210");
  let cfInv    = -(g("150") + g("170"));
  let cfFin    = g("220") + g("250") + g("300") + g("310") - g("330");
  let netCash  = cfOps + cfInv + cfFin;
  let begCash  = g("100");
  let endCash  = begCash + netCash;

  let html = `<div class="stmt-wrapper">
    <div class="stmt-header">
      <div class="stmt-company">${companyName}</div>
      <div class="stmt-title">Statement of Cash Flows</div>
      <div class="stmt-period">For the Period: ${periodLabel}</div>
      <div class="stmt-method">(Indirect Method)</div>
    </div>`;

  html += stmtSection("CASH FLOWS FROM OPERATING ACTIVITIES");
  html += stmtRow("","Net Income",ni,32,false,false,false,"");
  html += stmtSection("Adjustments:");
  if (depr)    html += stmtRow("640/650","Depreciation & Amortization",depr,48,false,false,false,"");
  if (g("110"))html += stmtRow("110","(Increase) in Accounts Receivable",-g("110"),48,false,false,false,"");
  if (g("120"))html += stmtRow("120","(Increase) in Inventory",-g("120"),48,false,false,false,"");
  if (g("200"))html += stmtRow("200","Increase in Accounts Payable",g("200"),48,false,false,false,"");
  if (g("210"))html += stmtRow("210","Increase in Accrued Liabilities",g("210"),48,false,false,false,"");
  html += stmtRow("","Net Cash from Operating Activities",cfOps,0,true,true,false,"");
  html += stmtDivider();

  html += stmtSection("CASH FLOWS FROM INVESTING ACTIVITIES");
  if (g("150"))html += stmtRow("150","Purchase of PP&E",-g("150"),32,false,false,false,"");
  if (g("170"))html += stmtRow("170","Purchase of Intangibles",-g("170"),32,false,false,false,"");
  html += stmtRow("","Net Cash from Investing Activities",cfInv,0,true,true,false,"");
  html += stmtDivider();

  html += stmtSection("CASH FLOWS FROM FINANCING ACTIVITIES");
  if (g("220")||g("250"))html += stmtRow("220/250","Proceeds from Notes Payable",g("220")+g("250"),32,false,false,false,"");
  if (g("300")||g("310"))html += stmtRow("300/310","Proceeds from Equity Issuance",g("300")+g("310"),32,false,false,false,"");
  if (g("330"))           html += stmtRow("330","Dividends / Distributions Paid",-g("330"),32,false,false,false,"");
  html += stmtRow("","Net Cash from Financing Activities",cfFin,0,true,true,false,"");
  html += stmtDivider();

  html += stmtRow("","Net Increase (Decrease) in Cash",netCash,0,true,true,false,"");
  html += stmtRow("","Cash at Beginning of Period",begCash,0,false,false,false,"");
  html += `<div class="stmt-net-income"><span>CASH AT END OF PERIOD</span><span>$${fmtMoney(endCash)}</span></div>`;
  html += `</div>`;
  el.innerHTML = html;
}

// ══════════════════════════════════════
//  SSHE
// ══════════════════════════════════════

function renderSSHE(accounts, periodLabel, companyName) {
  let el = document.getElementById("sshe-stmt-output");
  if (!el) return;

  let ni      = window._netIncome || 0;
  let g = id => accounts.filter(a=>a.number===id).reduce((s,a)=>s+getBalance(a),0);
  let cs      = g("300");
  let apic    = g("310");
  let re      = g("320");
  let div     = g("330");
  let tsy     = g("340");
  let endRE   = re + ni - div;
  let tEq     = cs + apic + endRE - tsy;

  let html = `<div class="stmt-wrapper">
    <div class="stmt-header">
      <div class="stmt-company">${companyName}</div>
      <div class="stmt-title">Statement of Shareholders' Equity</div>
      <div class="stmt-period">For the Period: ${periodLabel}</div>
    </div>
    <div class="equity-table">
      <div class="equity-header"><span>Component</span><span>Amount</span></div>
      <div class="equity-section">PAID-IN CAPITAL</div>
      <div class="equity-row"><span>300 Common Stock</span><span>$${fmtMoney(cs)}</span></div>`;
  if (apic) html += `<div class="equity-row"><span>310 Additional Paid-In Capital</span><span>$${fmtMoney(apic)}</span></div>`;
  html += `<div class="equity-row equity-subtotal"><span>Total Paid-In Capital</span><span>$${fmtMoney(cs+apic)}</span></div>
      <div class="equity-section">RETAINED EARNINGS</div>
      <div class="equity-row"><span>320 Retained Earnings (Beginning)</span><span>$${fmtMoney(re)}</span></div>
      <div class="equity-row"><span>Net Income (Current Period)</span><span>$${fmtMoney(ni)}</span></div>`;
  if (div) html += `<div class="equity-row"><span>330 Less: Dividends / Distributions</span><span>($${fmtMoney(div)})</span></div>`;
  html += `<div class="equity-row equity-subtotal"><span>Retained Earnings (Ending)</span><span>$${fmtMoney(endRE)}</span></div>`;
  if (tsy) html += `<div class="equity-section">CONTRA EQUITY</div><div class="equity-row"><span>340 Treasury Stock</span><span>($${fmtMoney(tsy)})</span></div>`;
  html += `<div class="equity-total"><span>TOTAL SHAREHOLDERS' EQUITY</span><span>$${fmtMoney(tEq)}</span></div>
    </div></div>`;
  el.innerHTML = html;
}

// ══════════════════════════════════════
//  GENERAL LEDGER
// ══════════════════════════════════════

let glClientId   = "";
let glPeriodId   = "";
let glJeLines    = [];
let glEditingId  = null;   // null = new entry, string = editing existing entry id

function loadGLTab() {
  initChartOfAccounts();
  let el = document.getElementById("gl-main");
  if (!el) return;

  let clientOpts = clients.map(c =>
    `<option value="${c.uid}">${c.name}</option>`).join("");

  el.innerHTML = `
    <div class="acct-selectors">
      <div class="acct-selector-group">
        <label>Client</label>
        <select id="gl-client-sel" class="assign-select" onchange="onGLClientChange()">
          <option value="">— Select Client —</option>
          ${clientOpts}
        </select>
      </div>
      <div class="acct-selector-group">
        <label>Period</label>
        <select id="gl-period-sel" class="assign-select" disabled onchange="onGLPeriodChange()">
          <option value="">— Select Period —</option>
        </select>
      </div>
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

    <div id="gl-new-entry-area" style="display:none;margin-top:8px;"></div>

    <div id="gl-content" style="margin-top:20px;">
      <div style="padding:32px;text-align:center;color:var(--text-dim);font-size:13px;">Select a client and period to view the general ledger.</div>
    </div>`;
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
  if (!glClientId || !glPeriodId) return;
  let content = document.getElementById("gl-content");
  content.innerHTML = `<div style="padding:24px;text-align:center;color:var(--text-dim);font-size:13px;">Loading entries...</div>`;

  let dateFrom = document.getElementById("gl-date-from")?.value;
  let dateTo   = document.getElementById("gl-date-to")?.value;

  let snap = await db.collection("journalEntries")
    .where("clientId", "==", glClientId)
    .where("periodId", "==", glPeriodId)
    .get();

  let entries = [];
  snap.forEach(doc => { let d = doc.data(); d._id = doc.id; entries.push(d); });

  // Date filter
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

  // Store for filtering
  window._glEntries = entries;

  entries.sort((a,b) => (a.entryDate&&b.entryDate) ? a.entryDate.seconds - b.entryDate.seconds : 0);

  let html = `
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;gap:12px;flex-wrap:wrap;">
      <h3 style="font-size:15px;font-weight:700;">Journal Entries (${entries.length})</h3>
      <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;">
        <select id="gl-acct-filter" class="assign-select" style="min-width:220px;" onchange="filterGLByAccount()">
          <option value="">— Filter by Account —</option>
          ${[...new Set(entries.flatMap(e=>e.lines.map(l=>l.accountNumber+"||"+l.accountName)))]
            .sort()
            .map(a => { let [num,name]=a.split("||"); return `<option value="${num}">${num} — ${name}</option>`; })
            .join("")}
        </select>
        <button class="ghost-btn" onclick="document.getElementById('gl-acct-filter').value='';filterGLByAccount()">Clear</button>
        <button class="primary-btn" onclick="openGLNewEntry()">+ New Entry</button>
      </div>
    </div>
    <div class="dash-card" style="padding:0;overflow:hidden;">
      <div class="je-list-header">
        <span>Date</span><span>Description</span><span>Debits</span><span>Credits</span><span>Status</span><span></span>
      </div>
      <div id="gl-entries-list">`;

  if (!entries.length) {
    html += `<div style="padding:24px;text-align:center;color:var(--text-dim);font-size:13px;">No entries found. Click "+ New Entry" to record the first journal entry.</div>`;
  } else {
    entries.forEach(e => {
      let totalDr = e.lines.reduce((s,l)=>s+(parseFloat(l.debit)||0),0);
      let totalCr = e.lines.reduce((s,l)=>s+(parseFloat(l.credit)||0),0);
      let balanced = Math.abs(totalDr-totalCr) < 0.01;
      let dateStr  = e.entryDate ? new Date(e.entryDate.seconds*1000).toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"}) : "—";
      html += `<div class="je-list-row">
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
    });
  }

  html += `</div></div>`;
  content.innerHTML = html;
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

  let acctOpts = chartOfAccounts.filter(a=>a.isActive)
    .map(a=>`<option value="${a._id}" data-number="${a.number}" data-name="${a.name}">${a.number} — ${a.name}</option>`).join("");

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
  if (glJeLines.length <= 2) { alert("Need at least 2 lines."); return; }
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

  if (!date) { alert("Please enter a date."); return; }
  if (!desc) { alert("Please enter a description."); return; }

  let lines = glJeLines.filter(l=>l.accountId && (parseFloat(l.debit)||0)+(parseFloat(l.credit)||0)>0);
  if (lines.length < 2) { alert("Add at least 2 account lines."); return; }

  db.collection("journalEntries").add({
    clientId:    glClientId,
    periodId:    glPeriodId,
    entryDate:   firebase.firestore.Timestamp.fromDate(new Date(date+"T12:00:00")),
    description: desc,
    isAdjusting: isAdj,
    lines: lines.map(l=>({
      accountId:l.accountId, accountNumber:l.accountNumber,
      accountName:l.accountName, debit:parseFloat(l.debit)||0, credit:parseFloat(l.credit)||0
    })),
    postedBy: "Anthony Sesny",
    createdAt: firebase.firestore.FieldValue.serverTimestamp()
  }).then(() => {
    cancelGLEntry();
    loadGLEntries();
  }).catch(e => alert("Failed: " + e.message));
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

  if (!date) { alert("Please enter a date."); return; }
  if (!desc) { alert("Please enter a description."); return; }

  let lines = glJeLines.filter(l=>l.accountId && (parseFloat(l.debit)||0)+(parseFloat(l.credit)||0)>0);
  if (lines.length < 2) { alert("Add at least 2 account lines."); return; }

  let totalDr = lines.reduce((s,l)=>s+(parseFloat(l.debit)||0),0);
  let totalCr = lines.reduce((s,l)=>s+(parseFloat(l.credit)||0),0);
  if (Math.abs(totalDr-totalCr) > 0.01) { alert("Entry is not balanced. Debits must equal credits."); return; }

  db.collection("journalEntries").doc(id).update({
    entryDate:   firebase.firestore.Timestamp.fromDate(new Date(date+"T12:00:00")),
    description: desc,
    isAdjusting: isAdj,
    lines: lines.map(l=>({
      accountId:l.accountId, accountNumber:l.accountNumber,
      accountName:l.accountName, debit:parseFloat(l.debit)||0, credit:parseFloat(l.credit)||0
    })),
    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
  }).then(() => {
    cancelGLEntry();
    loadGLEntries();
  }).catch(e => alert("Failed to update: " + e.message));
}

function deleteGLEntry(id) {
  if (!confirm("Delete this journal entry? This cannot be undone.")) return;
  db.collection("journalEntries").doc(id).delete().then(() => loadGLEntries());
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
    alert("All accounts already have correct isCore values.");
    return;
  }

  batch.commit().then(() => {
    alert(`Fixed ${count} accounts successfully.`);
    renderMasterAccounts();
  }).catch(e => alert("Failed: " + e.message));
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
  if (!confirm(`Delete account "${name}"? This cannot be undone.`)) return;
  db.collection("chartOfAccounts").doc(id).delete().then(() => {
    chartOfAccounts = chartOfAccounts.filter(a=>a._id!==id);
    let list = document.getElementById("master-coa-list");
    if (list) list.innerHTML = renderMasterCOARows();
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

  if (!number || !name) { alert("Number and name are required."); return; }

  db.collection("chartOfAccounts").doc(id).update({ number, name, type, subType: sub, normalBalance: nb })
    .then(() => {
      let a = chartOfAccounts.find(x=>x._id===id);
      if (a) { a.number=number; a.name=name; a.type=type; a.subType=sub; a.normalBalance=nb; }
      chartOfAccounts.sort((a,b)=>parseInt(a.number)-parseInt(b.number));
      closeAddAccountModal();
      let list = document.getElementById("master-coa-list");
      if (list) list.innerHTML = renderMasterCOARows();
    }).catch(e => alert("Failed: " + e.message));
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

  if (!number) { alert("Please enter an account number."); return; }
  if (!name)   { alert("Please enter an account name."); return; }
  if (chartOfAccounts.find(a=>a.number===number)) { alert("Account number " + number + " already exists."); return; }

  db.collection("chartOfAccounts").add({
    number, name, type, subType:sub, normalBalance:nb,
    isActive:true, isCore:false, createdAt:firebase.firestore.FieldValue.serverTimestamp()
  }).then(ref => {
    chartOfAccounts.push({ _id:ref.id, number, name, type, subType:sub, normalBalance:nb, isActive:true });
    chartOfAccounts.sort((a,b)=>parseInt(a.number)-parseInt(b.number));
    closeAddAccountModal();
    // Refresh master accounts list if visible
    let list = document.getElementById("master-coa-list");
    if (list) list.innerHTML = renderMasterCOARows();
  }).catch(e => alert("Failed: " + e.message));
}

// ══════════════════════════════════════
//  EXPORT & PUBLISH
// ══════════════════════════════════════

function exportCurrentStatement(tabId) {
  if (!window._finData) { alert("Please select a client and period first."); return; }
  if (typeof XLSX === "undefined") { alert("Excel library not loaded."); return; }

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
  if (!window._finData) { alert("Please select a client and period first."); return; }
  if (!confirm("Publish statements to the client portal?")) return;

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
    alert("Statements published to client portal!");
    db.collection("activity").add({
      clientId, type:"ready",
      text:"Financial statements published for " + periodLabel,
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    });
  }).catch(e => alert("Failed: " + e.message));
}
