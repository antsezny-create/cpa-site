// ──────────────────────────────────────────────────────────────────────
//  MODULE STATE
// ──────────────────────────────────────────────────────────────────────

let teReturns        = [];
let teActiveYear     = 2026;
let teCurrentReturn  = null;
let teActiveSection  = 'dashboard';
let teNavSource      = null;    // source section for mini-screen back button
let teNotesPanelOpen = false;
let teDirty          = false;  // true when return has unsaved changes
let teSchedCTimer    = null;   // debounce timer for Schedule C inputs (150ms)
let teSchedDTimer    = null;   // debounce timer for Schedule D inputs (150ms)
function teEmptyReturn(clientId, clientName, taxYear) {
  return {
    id:           null,
    clientId:     clientId,
    clientName:   clientName,
    taxYear:      taxYear || teActiveYear,
    returnType:   '1040',
    status:       'not_started',
    filingStatus: 'single',
    taxpayer:     { firstName: '', middleInitial: '', lastName: '', ssn: '', dob: '', blind: false },
    spouse:       { firstName: '', middleInitial: '', lastName: '', ssn: '', dob: '', blind: false },
    address:      { street: '', apt: '', city: '', state: '', zip: '' },
    canBeClaimed: false,   // IRC §63(c)(5): triggers dependent standard deduction limitation
    dependents:   [],
    w2:           [],
    deductionType: 'standard',
    educationStudents: [],
    scheduleC: {
      // Business Info
      businessInfo: { businessType:'', activityCode:'', businessName:'', ein:'',
        street:'', city:'', state:'', zip:'',
        accountingMethod:'cash', materialParticipation:true,
        startedThisYear:false, required1099:false, filed1099:false },
      // Part I — Income
      grossReceipts:'', statutoryEmployee:false, returnsAllowances:'', otherIncome:'',
      // Part II — Expenses
      expenses: { advertising:'', carTruck:'', commissions:'', contractLabor:'',
        depletion:'', depreciation:'', employeeBenefits:'', insurance:'',
        interestMortgage:'', interestOther:'', legalProfessional:'', officeExpense:'',
        pension:'', rentVehicles:'', rentProperty:'', repairs:'', supplies:'',
        taxesLicenses:'', travel:'', meals:'', utilities:'', wages:'',
        energyBuildings:'', otherExpenses:'' },
      // Lines 29-32
      homeOfficeMethod:'simplified', totalHomeSqFt:'', businessSqFt:'', homeOffice:'',
      investmentAtRisk:'32a',
      // Part III — COGS
      partIII: { inventoryMethod:'cost', inventoryChange:false,
        inventoryBegin:'', purchases:'', costOfLabor:'', materials:'', otherCosts:'',
        inventoryEnd:'' },
      // Part IV — Vehicle
      partIV: { vehicleDate:'', businessMiles:'', commutingMiles:'', otherMiles:'',
        personalUse:false, anotherVehicle:false, hasEvidence:false, writtenEvidence:false },
      // Part V — Other Expenses (dynamic rows)
      otherExpenseRows: [],
      // Computed output — written by teRecalculate from detailed form
      netProfit: ''   // IRC §162 — Schedule C net profit (gross receipts minus expenses)
    },
    alimony: {
      paid:        '',          // IRC §215 — alimony paid (pre-2019 agreements only)
      preAgreement: false       // true = agreement executed before Jan 1, 2019 → deductible
    },
    estimatedPayments: {
      q1: '', q2: '', q3: '', q4: ''  // Form 1040-ES — IRC §6654
    },
    // ── Track 4: Investment Income ─────────────────────────────────────
    schedule1099: {
      interestIncome:    '',   // 1099-INT — IRC §61(a)(4)
      ordinaryDividends: '',   // 1099-DIV Box 1a — IRC §61(a)(7)
      qualifiedDividends:'',   // 1099-DIV Box 1b — IRC §1(h)(11); must be ≤ ordinaryDividends
      taxExemptInterest: ''    // 1099-INT Box 8 — not taxable, but required for §86 provisional income calc
    },
    // ── Social Security Benefits — IRC §86 — 1040 Lines 6a/6b ────────────
    socialSecurity: {
      benefits:           '',    // SSA-1099 Box 5 — total benefits received → 1040 Line 6a
      mfsLivedWithSpouse: false  // IRC §86(c)(2): MFS filer who lived with spouse → 85% taxable on dollar one
    },
    scheduleD: {
      // Per-transaction arrays — IRC §1221, §1222
      shortTermTransactions: [
        { id: 'st-0', description: '', dateAcquired: '', dateSold: '', proceeds: '', cost: '', adjustments: '' }
      ],
      longTermTransactions: [
        { id: 'lt-0', description: '', dateAcquired: '', dateSold: '', proceeds: '', cost: '', adjustments: '' }
      ],
      // Part I additional lines
      stGainForm6252:  '',  // Line 4 — installment sales, casualties, commodities, like-kind
      stGainK1:        '',  // Line 5 — K-1 short-term
      stLossCarryover: '',  // Line 6 — prior year ST loss carryover (entered positive, applied negative) — IRC §1212(b)
      // Part II additional lines
      ltGainForm4797:  '',  // Line 11 — Form 4797 Part I, undistributed capital gains, etc.
      ltGainK1:        '',  // Line 12 — K-1 long-term
      capitalGainDistributions: '', // Line 13 — 1099-DIV Box 2a — IRC §852(b)(3)(C)
      ltLossCarryover: '',  // Line 14 — prior year LT loss carryover (entered positive, applied negative)
      // Part III special rate inputs
      rate28Gain:       '',  // Line 18 — collectibles + §1202 — IRC §1(h)(1)(E)
      unrecaptured1250: '',  // Line 19 — unrecaptured §1250 — IRC §1(h)(1)(D)
      // Top-level question
      qualifiedOpportunityFund: false, // IRC §1400Z-2(c) — dispose of QOF investment this year?
      // Legacy aggregate fields — used when no per-transaction data present (backward compat)
      netSTCG:               '', // Net short-term capital gain/(loss) — IRC §1222(5),(6)
      netLTCG:               '', // Net long-term capital gain/(loss) — IRC §1222(7),(8)
      priorYearCarryforward: ''  // Prior year combined capital loss carryforward — IRC §1212(b)
    },
    scheduleE: [],              // Array of pass-through entities — IRC §702, §1366
                                // Each: { name:'', ein:'', incomeAmount:'', isPassive:true }
    investmentInterest: {
      expense:              '',  // Investment interest expense — IRC §163(d)
      priorYearCarryforward:'', // §163(d)(2) — prior year excess carries forward
      includeQDinNII:       false // §163(d)(4)(B) election — include QDs in NII cap (rare)
    },
    agiAdjustments: {
      studentLoanInterest: '',
      hsaCoverageType:      'self',
      hsaContributions:     '',
      hsaTaxpayerAge55:     false,
      iraContributions:     '',
      iraAge50Plus:         false,
      iraActiveParticipant: false,
      iraSpouseActive:      false
    },
    scheduleA: {
      stateIncomeTax:      '',
      localIncomeTax:      '',
      realEstateTax:       '',
      personalPropertyTax: '',
      mortgageInterest:    '',
      mortgageBalance:     '',
      mortgageLoanDate:    'post2017',
      mortgagePurpose:     'acquisition',  // IRC §163(h)(3)(C): 'acquisition' or 'home_equity_personal'
      cashCharitable:      '',
      nonCashCharitable:   '',
      medicalExpenses:     '',
      mfsSpouseItemizes:   false           // IRC §63(e): if true, standard deduction overridden to $0
    },
    // ── Track 5: EIC ──────────────────────────────────────────────────────
    eic: {
      claimChildless: false  // IRC §32(c)(1)(A) — eligible worker with no QC (age/income tests apply)
                             // TODO:VERIFY OBBBA P.L. 119-21 age limit changes for childless EIC
    },
    // ── Track 5B — Child & Dependent Care Credit — IRC §21 ───────────────
    cdcc: {
      qualifyingPersons:         '',      // '1' or '2plus'
      careExpenses:              '',      // total qualifying care expenses paid
      fsaBenefits:               '',      // employer-provided dependent care FSA — §129 / Form 2441 Box 12
      spouseEarnedIncome:        '',      // MFJ: spouse's earned income (if no deemed income applies)
      spouseIsStudentOrDisabled: false,   // true → deemed earned income applies — IRC §21(d)(2)
      studentDisabledMonths:     ''       // # months condition applies (1–12) for deemed income calc
    },
    // ── Track 5C — Retirement Savings Contributions Credit — IRC §25B ────
    savers: {
      taxpayerContributions: '',    // IRA + 401k/403b/457b/SIMPLE combined — IRC §25B(d)(1)
      spouseContributions:   '',    // MFJ only — separate $2,000 cap per spouse
      taxpayerDistCurrent:   '',    // distributions received this tax year — IRC §25B(d)
      taxpayerDistPrior:     '',    // distributions received in prior 2 years — IRC §25B(d) (manual; future: auto-populated from client history)
      spouseDistCurrent:     '',    // MFJ — spouse distributions this year
      spouseDistPrior:       '',    // MFJ — spouse distributions prior 2 years
      taxpayerIsStudent:     false, // full-time student → disqualified — IRC §25B(c)(2)
      taxpayerAge:           ''     // under 18 → disqualified — IRC §25B(c)(1)
    },
    // ── Track 5D — Energy-Efficient Home Improvement Credit — IRC §25C ───
    energyImprovement: {
      windows:        '',   // exterior windows & skylights — Pool A sub-cap $600
      doors:          '',   // exterior doors — total expenditure — Pool A sub-cap $250/door, $500 max
      doorCount:      '',   // number of exterior doors installed
      energyProperty: '',   // central A/C, gas/oil water heaters, furnaces, boilers (non-heat-pump) — Pool A sub-cap $600
      audit:          '',   // home energy audit — Pool A sub-cap $150
      heatPumps:      '',   // heat pump space heating/cooling — Pool B ($2,000 separate cap)
      heatPumpWH:     '',   // heat pump water heaters — Pool B
      biomass:        ''    // biomass stoves/boilers — Pool B
    },
    // ── Step 2: IRA & Pension/Annuity Distributions — IRC §72; 1040 Lines 4a/4b, 5a/5b ─
    // Each entry: { payerName, grossDist, taxableDist, age, penaltyException }
    // taxableDist auto-syncs to grossDist on input; user can override (basis, Roth, partial rollover)
    ira1099r:     [],   // IRA distributions — IRC §408, §72; 1040 Lines 4a/4b
    pension1099r: [],   // Pension & annuity distributions — IRC §72; 1040 Lines 5a/5b

    // ── Track 6 — Alternative Minimum Tax — IRC §55 ──────────────────────
    // ISO exercise spread: spread at exercise of incentive stock options — IRC §56(b)(3)
    // This is the ONLY AMT preference item requiring user input; all other AMT adjustments
    // (SALT, standard deduction) are auto-derived from existing income/deduction data.
    isoExercise: '',        // IRC §56(b)(3) — user enters aggregate spread; $0 if none
    annotations:  [],
    completedSections: []
  };
}
function teMarkDirty() {
  if (teDirty) return;
  teDirty = true;
  let btn = document.getElementById('te-save-btn');
  if (btn) { btn.textContent = 'Save ●'; }
}
function teClearReturn() {
  if (!teCurrentReturn) return;
  showModal({
    title: 'Clear All Data',
    message: 'This will permanently erase every input on this return — income, deductions, credits, dependents, everything. The return record itself will remain. This cannot be undone. Are you sure?',
    confirmText: 'Yes, Clear Everything',
    onConfirm: () => {
      let blank = teEmptyReturn(teCurrentReturn.clientId, teCurrentReturn.clientName, teCurrentReturn.taxYear);
      // Preserve return identity and status — wipe all data fields
      Object.assign(teCurrentReturn, blank, {
        id:         teCurrentReturn.id,
        clientId:   teCurrentReturn.clientId,
        clientName: teCurrentReturn.clientName,
        taxYear:    teCurrentReturn.taxYear,
        returnType: teCurrentReturn.returnType,
        status:     teCurrentReturn.status
      });
      teMarkDirty();
      teSwitchSection('dashboard');
      teRecalculate();
      toast('Return cleared. Save to persist.', 'info');
    }
  });
}
function teClearDirty() {
  teDirty = false;
  let btn = document.getElementById('te-save-btn');
  if (btn) { btn.textContent = 'Save'; }
}
function initTaxEngine() {
  teShowReturnCenter();
  tePopulateYearSelect();
  teLoadReturnCenter();

  // Browser tab / window close guard — IRC-grade data protection
  window.addEventListener('beforeunload', function(e) {
    if (teDirty && teCurrentReturn) {
      e.preventDefault();
      e.returnValue = '';
    }
  });
}
function teShowReturnCenter() {
  document.getElementById('te-return-center').style.display  = 'block';
  document.getElementById('te-engine-wrapper').style.display = 'none';
  if (teNotesPanelOpen) teToggleNotesPanel();
}

function teShowEngine() {
  document.getElementById('te-return-center').style.display  = 'none';
  document.getElementById('te-engine-wrapper').style.display = 'block';
}
function tePopulateYearSelect() {
  let sel = document.getElementById('te-year-select');
  if (!sel) return;
  let now = new Date().getFullYear();
  sel.innerHTML = '';
  for (let y = now; y >= now - 3; y--) {
    let opt = document.createElement('option');
    opt.value = y;
    opt.textContent = y;
    if (y === teActiveYear) opt.selected = true;
    sel.appendChild(opt);
  }
}

function teOnYearChange(year) {
  teActiveYear = parseInt(year);
  let lbl = document.getElementById('te-center-year');
  if (lbl) lbl.textContent = teActiveYear;
  teLoadReturnCenter();
}
function teLoadReturnCenter() {
  let list = document.getElementById('te-returns-list');
  if (!list) return;
  list.innerHTML = '<div class="te-loading">Loading returns...</div>';

  db.collection('taxReturns')
    .where('taxYear', '==', teActiveYear)
    .get()
    .then(snapshot => {
      teReturns = [];
      snapshot.forEach(doc => { let d = doc.data(); d.id = doc.id; teReturns.push(d); });
      teRenderReturnCenter();
    })
    .catch(e => {
      list.innerHTML = '<div class="te-loading">Failed to load returns.</div>';
    });
}

function teRenderReturnCenter() {
  let list = document.getElementById('te-returns-list');
  if (!list) return;

  let counts = { not_started: 0, in_progress: 0, under_review: 0, filed: 0 };
  teReturns.forEach(r => { if (counts[r.status] !== undefined) counts[r.status]++; });
  let ns = document.getElementById('te-stat-not-started');
  let ip = document.getElementById('te-stat-in-progress');
  let ur = document.getElementById('te-stat-under-review');
  let fi = document.getElementById('te-stat-filed');
  if (ns) ns.textContent = counts.not_started;
  if (ip) ip.textContent = counts.in_progress;
  if (ur) ur.textContent = counts.under_review;
  if (fi) fi.textContent = counts.filed;

  if (teReturns.length === 0) {
    list.innerHTML = '<div class="te-empty-center">No returns for ' + teActiveYear + '. Click "+ New Return" to get started.</div>';
    return;
  }

  let statusLabel = { not_started: 'Not Started', in_progress: 'In Progress', under_review: 'Under Review', filed: 'Filed' };
  let statusClass = { not_started: 'te-status-gray', in_progress: 'te-status-cyan', under_review: 'te-status-purple', filed: 'te-status-green' };
  let fsLabel     = { single: 'Single', mfj: 'MFJ', mfs: 'MFS', hoh: 'HOH', qss: 'QSS' };

  list.innerHTML = '';
  teReturns.forEach(r => {
    let sl  = statusLabel[r.status] || r.status;
    let sc  = statusClass[r.status] || 'te-status-gray';
    let fsl = fsLabel[r.filingStatus] || '—';
    let upd = r.updatedAt ? new Date(r.updatedAt.seconds * 1000).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—';
    let resultHtml = '—';
    let resultCls  = '';
    if (r.refundOrDue !== undefined && r.refundOrDue !== null) {
      if (r.refundOrDue >= 0) { resultHtml = 'Refund: ' + teFmt(r.refundOrDue); resultCls = 'te-result-refund'; }
      else                    { resultHtml = 'Due: '    + teFmt(Math.abs(r.refundOrDue)); resultCls = 'te-result-due'; }
    }
    let row = document.createElement('div');
    row.className = 'te-return-row';
    row.innerHTML = `
      <span class="te-col-client te-rn-name">${esc(r.clientName || '—')}</span>
      <span class="te-col-type"><span class="te-type-badge">Form ${esc(r.returnType || '1040')}</span></span>
      <span class="te-col-fs">${esc(fsl)}</span>
      <span class="te-col-status"><span class="te-status-badge ${sc}">${esc(sl)}</span></span>
      <span class="te-col-result ${resultCls}">${esc(resultHtml)}</span>
      <span class="te-col-updated">${esc(upd)}</span>
      <span class="te-col-action"><button class="te-open-btn" onclick="teOpenReturn('${esc(r.id)}')">Open</button></span>`;
    list.appendChild(row);
  });
}
function teOpenNewReturnModal() {
  let sel = document.getElementById('te-new-client-sel');
  if (!sel) return;
  sel.innerHTML = '<option value="">— Select Client —</option>';
  (clients || []).forEach(c => {
    let o = document.createElement('option');
    o.value = c.uid; o.textContent = c.name;
    sel.appendChild(o);
  });
  document.getElementById('te-new-year-input').value = teActiveYear;
  document.getElementById('te-new-return-modal').style.display = 'flex';
}

function teCloseNewReturnModal() {
  document.getElementById('te-new-return-modal').style.display = 'none';
}

function teCreateNewReturn() {
  let clientId = document.getElementById('te-new-client-sel').value;
  let year     = parseInt(document.getElementById('te-new-year-input').value);
  let type     = document.getElementById('te-new-type-sel').value;

  if (!clientId) { toast('Please select a client.', 'warning'); return; }
  if (!year || year < 2020 || year > 2035) { toast('Please enter a valid tax year.', 'warning'); return; }

  let client     = (clients || []).find(c => c.uid === clientId);
  let clientName = client ? client.name : '';
  let docId      = clientId + '_' + year + '_' + type;

  db.collection('taxReturns').doc(docId).get().then(doc => {
    if (doc.exists) {
      showModal({
        title: 'Return Already Exists',
        message: 'A ' + year + ' ' + type + ' return already exists for ' + clientName + '. Open it?',
        confirmText: 'Open Return',
        onConfirm: () => { teCloseNewReturnModal(); teOpenReturn(docId); }
      });
    } else {
      let nr    = teEmptyReturn(clientId, clientName, year);
      nr.id     = docId;
      nr.returnType = type;
      let data  = teSerialize(nr);
      data.createdAt = firebase.firestore.FieldValue.serverTimestamp();
      data.updatedAt = firebase.firestore.FieldValue.serverTimestamp();
      db.collection('taxReturns').doc(docId).set(data).then(() => {
        teCloseNewReturnModal();
        teReturns.push({ ...data, id: docId });
        teOpenReturn(docId);
      }).catch(e => toast('Failed to create return: ' + e.message, 'error'));
    }
  });
}
function teOpenReturn(returnId) {
  db.collection('taxReturns').doc(returnId).get().then(doc => {
    if (!doc.exists) { toast('Return not found.', 'error'); return; }
    let data = doc.data(); data.id = doc.id;
    teCurrentReturn = teDeserialize(data);
    teClearDirty();  // fresh load = clean baseline
    teShowEngine();
    teUpdateBreadcrumb();
    teSwitchSection('dashboard');
    teRecalculate();
  }).catch(e => toast('Failed to load return: ' + e.message, 'error'));
}

function teBackToCenter() {
  if (teDirty) {
    showModal({
      title: 'Unsaved Changes',
      message: 'You have unsaved changes on this return. Save before going back?',
      confirmText: 'Save',
      cancelText: 'Discard',
      type: 'warning',
      onConfirm: () => { teSaveReturnThen(teDoBackToCenter); },
      onCancel:  () => { teClearDirty(); teDoBackToCenter(); }
    });
    return;
  }
  teDoBackToCenter();
}

function teDoBackToCenter() {
  if (teNotesPanelOpen) teToggleNotesPanel();
  teCurrentReturn = null;
  teShowReturnCenter();
  teLoadReturnCenter();
}

function teUpdateBreadcrumb() {
  if (!teCurrentReturn) return;
  let cl = document.getElementById('te-bc-client');
  let rt = document.getElementById('te-bc-return');
  if (cl) cl.textContent = teCurrentReturn.clientName || '—';
  if (rt) rt.textContent = teCurrentReturn.taxYear + ' — Form ' + teCurrentReturn.returnType;
}
function teGetScheduleStatus(schedId) {
  let r  = teCurrentReturn;
  let s1 = r.schedule1099 || {};
  switch (schedId) {
    case 'w2':       return (r.w2 || []).length > 0 ? 'entered' : 'empty';
    case 'ira':      return (r.ira1099r || []).length > 0 ? 'entered' : 'empty';
    case 'pension':  return (r.pension1099r || []).length > 0 ? 'entered' : 'empty';
    case 'ss':       return parseFloat((r.socialSecurity || {}).benefits) > 0 ? 'entered' : 'empty';
    case '1099-div': return parseFloat(s1.ordinaryDividends) > 0 ? 'entered' : 'empty';
    case '1099-int': return parseFloat(s1.interestIncome) > 0 ? 'entered' : 'empty';
    case 'sched-d': {
      let sd  = r.scheduleD || {};
      let stHas = (sd.shortTermTransactions||[]).some(tx => tx.proceeds || tx.cost || tx.description);
      let ltHas = (sd.longTermTransactions ||[]).some(tx => tx.proceeds || tx.cost || tx.description);
      return (sd.netSTCG || sd.netLTCG || sd.priorYearCarryforward || stHas || ltHas
        || sd.stGainForm6252 || sd.stGainK1 || sd.stLossCarryover
        || sd.ltGainForm4797 || sd.ltGainK1 || sd.capitalGainDistributions || sd.ltLossCarryover) ? 'entered' : 'empty';
    }
    case 'sched-c':  return parseFloat((r.scheduleC || {}).netProfit) > 0 ? 'entered' : 'empty';
    case 'sched-e':  return (r.scheduleE || []).length > 0 ? 'entered' : 'empty';
    default:         return 'empty';
  }
}

// ──────────────────────────────────────────────────────────────────────
//  STEP 8B — MENU PAGES & MINI-SCREENS
//  Income / Deductions / Credits / Payments → menu cards → mini-screens
// ──────────────────────────────────────────────────────────────────────

function teBackLabel(src) {
  return ({
    income:     '← Income',
    deductions: '← Deductions',
    credits:    '← Credits',
    payments:   '← Payments & Withholding',
    dashboard:  '← Form 1040'
  })[src] || '← Back';
}

function teNavBack() {
  teSwitchSection(teNavSource || 'dashboard');
  teNavSource = null;
}

function teMiniNav(src) {
  return `<div class="te-mini-nav"><button class="ghost-btn te-mini-back" onclick="teNavBack()">${teBackLabel(src)}</button></div>`;
}
// ── SECTION OPEN / ROUTING ────────────────────────────────────────────
// Category schedIds (from dashboard badges) → navigate to the menu page.
// Form-level schedIds → render a focused mini-screen.
function teOpenSchedule(schedId, source) {
  teNavSource = source || teActiveSection || 'dashboard';
  // Category badges → menu page (nav highlight stays, no back button needed)
  if (schedId === 'deductions' || schedId === 'credits' || schedId === 'payments') {
    teSwitchSection(schedId);
    return;
  }
  // All other schedIds → mini-screen
  teActiveSection = 'mini:' + schedId;
  document.querySelectorAll('.te-sec-btn:not(.te-sec-stub)').forEach(b => b.classList.remove('active'));
  let body = document.getElementById('te-interview-body');
  if (!body) return;
  body.innerHTML = teRenderMiniScreen(schedId);
  teMiniPostRender(schedId);
  if (teNotesPanelOpen) {
    let lbl = document.getElementById('te-notes-sec-lbl');
    if (lbl) lbl.textContent = 'Section: ' + schedId;
    teRenderNotesHistory();
  }
}
function teSwitchSection(section) {
  teActiveSection = section;
  document.querySelectorAll('.te-sec-btn:not(.te-sec-stub)').forEach(b => b.classList.remove('active'));
  let btn = document.getElementById('te-sec-btn-' + section);
  if (btn) btn.classList.add('active');

  let body = document.getElementById('te-interview-body');
  if (!body) return;

  if (section === 'dashboard') {
    body.innerHTML = teRenderDashboard1040();
  } else if (section === 'personal') {
    body.innerHTML = teRenderPersonal();
    teRenderDepsList();
  } else if (section === 'income') {
    body.innerHTML = teRenderIncomeMenu();
  } else if (section === 'deductions') {
    body.innerHTML = teRenderDeductionsMenu();
  } else if (section === 'credits') {
    body.innerHTML = teRenderCreditsMenu();
  } else if (section === 'payments') {
    body.innerHTML = teRenderPaymentsMenu();
  }

  if (teNotesPanelOpen) {
    let lbl = document.getElementById('te-notes-sec-lbl');
    if (lbl) lbl.textContent = 'Section: ' + section.charAt(0).toUpperCase() + section.slice(1);
    teRenderNotesHistory();
  }
}
function teUpdateSecStatus(calc) {
  let r = teCurrentReturn;
  let done = {
    personal:   !!(r.filingStatus && r.taxpayer && r.taxpayer.firstName),
    income:     (r.w2 || []).length > 0,
    deductions: true,
    credits:    true,
    payments:   calc.w2Withholding >= 0
  };
  Object.entries(done).forEach(([s, ok]) => {
    let ic = document.getElementById('te-sec-ic-' + s);
    if (ic) { ic.textContent = ok ? '✓' : '●'; ic.className = 'te-sec-ic' + (ok ? ' te-sec-done' : ''); }
  });
}
function teToggleNotesPanel() {
  teNotesPanelOpen = !teNotesPanelOpen;
  let p = document.getElementById('te-notes-panel');
  if (p) p.style.display = teNotesPanelOpen ? 'flex' : 'none';
  if (teNotesPanelOpen) {
    let lbl = document.getElementById('te-notes-sec-lbl');
    if (lbl) lbl.textContent = 'Section: ' + teActiveSection.charAt(0).toUpperCase() + teActiveSection.slice(1);
    teRenderNotesHistory();
  }
}

function teSaveNote() {
  let txt = (document.getElementById('te-notes-txt') || {}).value || '';
  txt = txt.trim();
  if (!txt) return;
  if (!teCurrentReturn.annotations) teCurrentReturn.annotations = [];
  teCurrentReturn.annotations.push({ section: teActiveSection, note: txt, createdAt: new Date().toISOString() });
  document.getElementById('te-notes-txt').value = '';
  teRenderNotesHistory();
  toast('Note saved.', 'success');
}

function teRenderNotesHistory() {
  let c = document.getElementById('te-notes-hist');
  if (!c) return;
  let notes = (teCurrentReturn.annotations || []).filter(a => a.section === teActiveSection);
  c.innerHTML = notes.length === 0
    ? '<div class="te-notes-empty">No notes for this section.</div>'
    : notes.slice().reverse().map(n => `
        <div class="te-note-entry">
          <div class="te-note-tag">${esc(n.section)}</div>
          <div class="te-note-body">${esc(n.note)}</div>
          <div class="te-note-dt">${new Date(n.createdAt).toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'})}</div>
        </div>`).join('');
}
function teSetStatus(status) {
  if (!teCurrentReturn) return;
  teCurrentReturn.status = status;
}
function teSaveReturn() {
  teSaveReturnThen(null);
}

// teSaveReturnThen(callback): saves the return, then runs callback() on success.
// Used by the unsaved-changes prompt so navigation only happens after the save completes.
function teSaveReturnThen(callback) {
  if (!teCurrentReturn || !teCurrentReturn.id) { toast('No return open.', 'warning'); return; }
  let calc = teCurrentReturn._calc || {};
  let data = teSerialize(teCurrentReturn);
  // Persist computed results for Return Center display
  data.refundOrDue = (calc.refundOrDue !== undefined) ? Math.round(calc.refundOrDue * 100) / 100 : null;
  data.agi         = calc.agi || 0;
  // Promote to in_progress if currently not_started
  if (data.status === 'not_started') data.status = 'in_progress';
  data.updatedAt   = firebase.firestore.FieldValue.serverTimestamp();

  db.collection('taxReturns').doc(teCurrentReturn.id).set(data)
    .then(() => {
      teCurrentReturn.status = data.status;
      teClearDirty();  // successful save — clear unsaved changes flag
      toast('Return saved.', 'success');
      let idx = teReturns.findIndex(r => r.id === teCurrentReturn.id);
      if (idx >= 0) teReturns[idx] = { ...data, id: teCurrentReturn.id };
      if (callback) callback();  // navigate only after confirmed save
    })
    .catch(e => toast('Save failed: ' + e.message, 'error'));
}

function teSerialize(r) {
  return {
    clientId:          r.clientId          || '',
    clientName:        r.clientName        || '',
    taxYear:           r.taxYear           || teActiveYear,
    returnType:        r.returnType        || '1040',
    status:            r.status            || 'not_started',
    filingStatus:      r.filingStatus      || 'single',
    taxpayer:          r.taxpayer          || {},
    spouse:            r.spouse            || {},
    dependents:        r.dependents        || [],
    w2:                r.w2                || [],
    scheduleC:          r.scheduleC          || { netProfit: '', businessInfo:{}, expenses:{}, partIII:{}, partIV:{}, otherExpenseRows:[] },
    alimony:            r.alimony            || { paid: '', preAgreement: false },
    estimatedPayments:  r.estimatedPayments  || { q1: '', q2: '', q3: '', q4: '' },
    schedule1099:       r.schedule1099       || { interestIncome: '', ordinaryDividends: '', qualifiedDividends: '' },
    scheduleD:          r.scheduleD          || { shortTermTransactions:[{id:'st-0',description:'',dateAcquired:'',dateSold:'',proceeds:'',cost:'',adjustments:''}], longTermTransactions:[{id:'lt-0',description:'',dateAcquired:'',dateSold:'',proceeds:'',cost:'',adjustments:''}], stGainForm6252:'',stGainK1:'',stLossCarryover:'',ltGainForm4797:'',ltGainK1:'',capitalGainDistributions:'',ltLossCarryover:'',rate28Gain:'',unrecaptured1250:'',qualifiedOpportunityFund:false,netSTCG:'',netLTCG:'',priorYearCarryforward:'' },
    scheduleE:          r.scheduleE          || [],
    investmentInterest: r.investmentInterest || { expense: '', priorYearCarryforward: '', includeQDinNII: false },
    deductionType:      r.deductionType      || 'standard',
    educationStudents: r.educationStudents || [],
    agiAdjustments:    r.agiAdjustments    || { studentLoanInterest: '', hsaCoverageType: 'self', hsaContributions: '', hsaTaxpayerAge55: false, iraContributions: '', iraAge50Plus: false, iraActiveParticipant: false, iraSpouseActive: false },
    scheduleA:         r.scheduleA         || { stateIncomeTax: '', localIncomeTax: '', realEstateTax: '', personalPropertyTax: '', mortgageInterest: '', mortgageBalance: '', mortgageLoanDate: 'post2017', mortgagePurpose: 'acquisition', cashCharitable: '', nonCashCharitable: '', medicalExpenses: '', mfsSpouseItemizes: false },
    eic:               r.eic               || { claimChildless: false },
    cdcc:              r.cdcc              || { qualifyingPersons: '', careExpenses: '', fsaBenefits: '', spouseEarnedIncome: '', spouseIsStudentOrDisabled: false, studentDisabledMonths: '' },
    savers:            r.savers            || { taxpayerContributions: '', spouseContributions: '', taxpayerDistCurrent: '', taxpayerDistPrior: '', spouseDistCurrent: '', spouseDistPrior: '', taxpayerIsStudent: false, taxpayerAge: '' },
    energyImprovement: r.energyImprovement || { windows: '', doors: '', doorCount: '', energyProperty: '', audit: '', heatPumps: '', heatPumpWH: '', biomass: '' },
    annotations:       r.annotations       || [],
    completedSections: r.completedSections || []
  };
}

function teDeserialize(data) {
  let r = { ...data };
  if (!r.taxpayer)            r.taxpayer            = {};
  if (!r.spouse)              r.spouse              = {};
  if (!r.dependents)          r.dependents          = [];
  if (!r.w2)                  r.w2                  = [];
  if (!r.scheduleC)               r.scheduleC           = { netProfit: '' };
  if (!r.scheduleC.businessInfo)  r.scheduleC.businessInfo  = {};
  if (!r.scheduleC.expenses)      r.scheduleC.expenses      = {};
  if (!r.scheduleC.partIII)       r.scheduleC.partIII       = {};
  if (!r.scheduleC.partIV)        r.scheduleC.partIV        = {};
  if (!r.scheduleC.otherExpenseRows) r.scheduleC.otherExpenseRows = [];
  if (!r.alimony)             r.alimony             = { paid: '', preAgreement: false };
  if (!r.estimatedPayments)   r.estimatedPayments   = { q1: '', q2: '', q3: '', q4: '' };
  if (!r.educationStudents)   r.educationStudents   = [];
  if (!r.agiAdjustments)      r.agiAdjustments      = { studentLoanInterest: '', hsaCoverageType: 'self', hsaContributions: '', hsaTaxpayerAge55: false, iraContributions: '', iraAge50Plus: false, iraActiveParticipant: false, iraSpouseActive: false };
  if (!r.scheduleA)           r.scheduleA           = { stateIncomeTax: '', localIncomeTax: '', realEstateTax: '', personalPropertyTax: '', mortgageInterest: '', mortgageBalance: '', mortgageLoanDate: 'post2017', mortgagePurpose: 'acquisition', cashCharitable: '', nonCashCharitable: '', medicalExpenses: '', mfsSpouseItemizes: false };
  // Backfill fields on existing returns that predate this update
  if (!r.scheduleA.mortgagePurpose)   r.scheduleA.mortgagePurpose   = 'acquisition';
  if (r.scheduleA.mfsSpouseItemizes === undefined) r.scheduleA.mfsSpouseItemizes = false;
  // Track 4 backfill
  if (!r.schedule1099)       r.schedule1099       = { interestIncome: '', ordinaryDividends: '', qualifiedDividends: '' };
  if (!r.scheduleD) r.scheduleD = {};
  // Backfill new per-transaction arrays on old returns (had only netSTCG/netLTCG/priorYearCarryforward)
  if (!r.scheduleD.shortTermTransactions) r.scheduleD.shortTermTransactions = [{ id:'st-0',description:'',dateAcquired:'',dateSold:'',proceeds:'',cost:'',adjustments:'' }];
  if (!r.scheduleD.longTermTransactions)  r.scheduleD.longTermTransactions  = [{ id:'lt-0',description:'',dateAcquired:'',dateSold:'',proceeds:'',cost:'',adjustments:'' }];
  if (r.scheduleD.stGainForm6252          === undefined) r.scheduleD.stGainForm6252          = '';
  if (r.scheduleD.stGainK1               === undefined) r.scheduleD.stGainK1               = '';
  if (r.scheduleD.stLossCarryover        === undefined) r.scheduleD.stLossCarryover        = '';
  if (r.scheduleD.ltGainForm4797         === undefined) r.scheduleD.ltGainForm4797         = '';
  if (r.scheduleD.ltGainK1              === undefined) r.scheduleD.ltGainK1              = '';
  if (r.scheduleD.capitalGainDistributions === undefined) r.scheduleD.capitalGainDistributions = '';
  if (r.scheduleD.ltLossCarryover        === undefined) r.scheduleD.ltLossCarryover        = '';
  if (r.scheduleD.rate28Gain             === undefined) r.scheduleD.rate28Gain             = '';
  if (r.scheduleD.unrecaptured1250       === undefined) r.scheduleD.unrecaptured1250       = '';
  if (r.scheduleD.qualifiedOpportunityFund === undefined) r.scheduleD.qualifiedOpportunityFund = false;
  if (r.scheduleD.netSTCG               === undefined) r.scheduleD.netSTCG               = '';
  if (r.scheduleD.netLTCG               === undefined) r.scheduleD.netLTCG               = '';
  if (r.scheduleD.priorYearCarryforward  === undefined) r.scheduleD.priorYearCarryforward  = '';
  if (!r.scheduleE)          r.scheduleE          = [];
  if (!r.investmentInterest) r.investmentInterest = { expense: '', priorYearCarryforward: '', includeQDinNII: false };
  if (!r.annotations)        r.annotations        = [];
  // Track 5 backfill — existing returns predate EIC field
  if (!r.eic)                r.eic                = { claimChildless: false };
  // Track 5B/5C/5D backfill — existing returns predate these fields
  if (!r.cdcc)               r.cdcc               = { qualifyingPersons: '', careExpenses: '', fsaBenefits: '', spouseEarnedIncome: '', spouseIsStudentOrDisabled: false, studentDisabledMonths: '' };
  if (!r.savers)             r.savers             = { taxpayerContributions: '', spouseContributions: '', taxpayerDistCurrent: '', taxpayerDistPrior: '', spouseDistCurrent: '', spouseDistPrior: '', taxpayerIsStudent: false, taxpayerAge: '' };
  if (!r.energyImprovement)  r.energyImprovement  = { windows: '', doors: '', doorCount: '', energyProperty: '', audit: '', heatPumps: '', heatPumpWH: '', biomass: '' };
  // Backfill taxpayer/spouse new fields
  if (!r.taxpayer) r.taxpayer = {};
  if (r.taxpayer.middleInitial === undefined) r.taxpayer.middleInitial = '';
  if (r.taxpayer.ssn           === undefined) r.taxpayer.ssn = r.taxpayer.ssnLast4 || '';
  if (!r.spouse) r.spouse = {};
  if (r.spouse.middleInitial   === undefined) r.spouse.middleInitial   = '';
  if (r.spouse.ssn             === undefined) r.spouse.ssn   = r.spouse.ssnLast4   || '';
  // Backfill address block (not on older returns)
  if (!r.address) r.address = { street: '', apt: '', city: '', state: '', zip: '' };
  // Backfill dependent fields (EIC + 1040 form fields)
  (r.dependents || []).forEach(d => {
    if (d.isFullTimeStudent    === undefined) d.isFullTimeStudent    = false;
    if (d.isPermanentlyDisabled=== undefined) d.isPermanentlyDisabled= false;
    if (d.ssn                  === undefined) d.ssn                  = '';
    if (d.livedWithTaxpayer    === undefined) d.livedWithTaxpayer    = true;
    if (d.inUS                 === undefined) d.inUS                 = true;
  });
  return r;
}
(function() {
  let _orig = window.switchDashTab;
  window.switchDashTab = function(tabName) {
    if (teDirty && teCurrentReturn) {
      showModal({
        title: 'Unsaved Changes',
        message: 'You have unsaved changes on this return. Save before leaving?',
        confirmText: 'Save',
        cancelText: 'Discard',
        type: 'warning',
        onConfirm: () => { teSaveReturn(); teClearDirty(); _orig(tabName); },
        onCancel:  () => { teClearDirty(); _orig(tabName); }
      });
      return;
    }
    _orig(tabName);
  };
})();
