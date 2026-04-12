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
let teSchedS1Timer   = null;   // debounce timer for Schedule 1 Part I inputs (150ms)
let teSchedS1PiiTimer = null;  // debounce timer for Schedule 1 Part II inputs (150ms)
let teSchedATimer    = null;   // debounce timer for Schedule A inputs (150ms)
let teW2Timers = {};            // debounce timers for W-2 inputs, keyed by 'i_field'
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
    // ── Track 4: Investment Income — per-document entry ──────────────────
    // Replaces legacy schedule1099 summary fields; each entry captures all boxes from the source document.
    int1099s: [],  // 1099-INT entries — IRC §61(a)(4); each: {payer,payerTin,box1..box17,state,stateId,collapsed,advOpen}
    div1099s: [],  // 1099-DIV entries — IRC §61(a)(7); each: {payer,payerTin,box1a..box16,state,stateId,collapsed,advOpen}
    schedB: {
      line3:           '',   // Excludable Series EE/I U.S. savings bond interest — IRC §135
      intManualPayers: [],   // Manual interest entries not on a 1099 — [{payer:'',amount:''}]
      divManualPayers: [],   // Manual dividend entries not on a 1099
      line7a:          '',   // Foreign financial account (Yes/No)
      line7aFbar:      '',   // FBAR (FinCEN 114) required (Yes/No)
      line7b:          '',   // Foreign country name(s)
      line8:           ''    // Foreign trust involvement (Yes/No)
    },
    // ── Social Security Benefits — IRC §86 — 1040 Lines 6a/6b ────────────
    socialSecurity: {
      benefits:           '',    // SSA-1099 Box 5 — net benefits (Box 3 − Box 4) → 1040 Line 6a
      repaid:             '',    // SSA-1099 Box 4 — benefits repaid to SSA (reduces gross; if >3,000 may qualify IRC §1341 deduction)
      withheld:           '',    // SSA-1099 Box 6 — voluntary federal income tax withheld → 1040 Line 25b
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
    schedule1: {
      k1099Amount:           '',   // Form 1099-K — amounts in error or personal items sold at loss (informational)
      // Part I — Additional Income
      taxRefunds:            '',   // Line 1  — Taxable state/local refunds — IRC §111(a)
      alimonyReceived:       '',   // Line 2a — Pre-2019 agreements only — IRC §71 (pre-TCJA)
      alimonyDate:           '',   // Line 2b — Date of original divorce or separation agreement
      // Line 3 = Schedule C net profit/(loss) — auto from scheduleC.netProfit — IRC §162
      otherGains:            '',   // Line 4  — Form 4797 / Form 4684 gains/(losses)
      otherGainsForm4797:    false,
      otherGainsForm4684:    false,
      // Line 5 = Schedule E — auto from calc.scheduleENet — IRC §702, §1366
      // Line 6 = Farm income/(loss) — auto from scheduleSE (farmProfit + crpPayments)
      unemployment:          '',   // Line 7  — IRC §85(a): gross unemployment compensation
      unemploymentRepaid:    false,
      unemploymentRepaidAmt: '',   // Repayment amount (reduces line 7)
      // Lines 8a–8v — Other Income sub-lines
      l8a: '',   // Net operating loss (negative — subtracted from line 9)
      l8b: '',   // Gambling winnings — IRC §165(d)
      l8c: '',   // Cancellation of debt — IRC §61(a)(12)
      l8d: '',   // Foreign earned income exclusion from Form 2555 (negative — subtracted)
      l8e: '',   // Income from Form 8853 (MSA/long-term care)
      l8f: '',   // Income from Form 8889 (HSA)
      l8g: '',   // Alaska Permanent Fund dividends — IRC §643(b)
      l8h: '',   // Jury duty pay
      l8i: '',   // Prizes and awards — IRC §74(a)
      l8j: '',   // Activity not engaged in for profit — IRC §183
      l8k: '',   // Stock options
      l8l: '',   // Income from rental of personal property (for profit, not in business)
      l8m: '',   // Olympic/Paralympic medals and USOC prize money — IRC §74(d)
      l8n: '',   // Section 951(a) inclusion (Subpart F)
      l8o: '',   // Section 951A(a) inclusion (GILTI)
      l8p: '',   // Section 461(l) excess business loss adjustment
      l8q: '',   // Taxable distributions from ABLE account — IRC §529A
      l8r: '',   // Scholarship/fellowship grants not reported on W-2
      l8s: '',   // Nontaxable Medicaid waiver payments included on Form 1040 Line 1a/1d (negative — subtracted)
      l8t: '',   // Pension/annuity from nonqualified deferred comp or nongovernmental §457 plan
      l8u: '',   // Wages earned while incarcerated
      l8v: '',   // Digital assets received as ordinary income not reported elsewhere
      otherIncomeRows: [],  // Line 8z — dynamic rows: [{type:'', amount:''}]
      // ── Part II — Adjustments to Income — IRC §62 ──────────────────────
      // Lines 13 (HSA), 15 (SE tax), 19a (alimony), 20 (IRA), 21 (SLI)
      // are auto-populated from existing engine computations — no state here.
      p2L11:  '',   // Line 11 — Educator expenses — IRC §62(a)(2)(D); max $300 ($600 MFJ)
      p2L12:  '',   // Line 12 — Certain business expenses (reservists, performing artists, fee-basis govt) — Form 2106
      p2L14:  '',   // Line 14 — Moving expenses — Armed Forces only post-TCJA — IRC §217(g); Form 3903
      p2L14StorageOnly: false,  // Checkbox: claiming only storage fees (Form 3903)
      p2L16:  '',   // Line 16 — SEP, SIMPLE, and qualified plan contributions — IRC §§219, 404
      p2L17:  '',   // Line 17 — Self-employed health insurance deduction — IRC §162(l)
      p2L18:  '',   // Line 18 — Penalty on early withdrawal of savings — IRC §165; 1099-INT Box 2
      p2L19b: '',   // Line 19b — Alimony recipient's SSN (informational; alimony.paid drives computation)
      p2L19c: '',   // Line 19c — Date of original divorce or separation agreement
      p2L23:  '',   // Line 23 — Archer MSA deduction — IRC §220; Form 8853
      // Lines 24a–24k — Other Adjustments to Income
      p2L24a: '',   // Jury duty pay (amounts turned over to employer)
      p2L24b: '',   // Deductible expenses related to rental of personal property (from line 8l income)
      p2L24c: '',   // Nontaxable Olympic/Paralympic medals and USOC prize money (from line 8m)
      p2L24d: '',   // Reforestation amortization and expenses — IRC §194
      p2L24e: '',   // Repayment of supplemental unemployment benefits (Trade Act of 1974)
      p2L24f: '',   // Contributions to section 501(c)(18)(D) pension plans
      p2L24g: '',   // Contributions by certain chaplains to section 403(b) plans
      p2L24h: '',   // Attorney fees and court costs — unlawful discrimination claims — IRC §62(a)(20)
      p2L24i: '',   // Attorney fees and court costs — IRS whistleblower award — IRC §62(a)(21)
      p2L24j: '',   // Housing deduction from Form 2555 — IRC §911(c)
      p2L24k: '',   // Excess deductions of section 67(e) expenses from Schedule K-1 (Form 1041)
      p2OtherAdjRows: []  // Line 24z — dynamic rows: [{type:'', amount:''}]
    },
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
      // ── Part I — Medical ─────────────────────────────────────────────
      medicalExpenses:      '',         // IRC §213(a) — unreimbursed medical & dental
      // ── Part II — Taxes (SALT) ────────────────────────────────────────
      useSalesTax:          false,      // false = use state income tax; true = general sales tax — IRC §164(b)(5)
      salesTax:             '',         // general sales tax override (IRS tables used if blank)
      stateIncomeTax:       '',
      localIncomeTax:       '',
      realEstateTax:        '',
      personalPropertyTax:  '',
      otherTaxes:           [],         // dynamic rows: [{desc:'', amount:''}] — Line 6 other deductible taxes
      // ── Part III — Interest ───────────────────────────────────────────
      mortgageInterest:     '',         // Form 1098 Box 1 — primary mortgage
      mortgageBalance:      '',         // Form 1098 Box 2 — outstanding principal for proration
      mortgageLoanDate:     'post2017',
      mortgagePurpose:      'acquisition', // IRC §163(h)(3)(C): 'acquisition' or 'home_equity_personal'
      mortgagePoints:       '',         // deductible points not reported on Form 1098
      mortgageInterestOther:'',         // interest on other qualified loans not on Form 1098 — Line 8b
      pmiPremiums:          '',         // qualified mortgage insurance premiums — OBBBA §70108 (TY2026+)
      // ── Part IV — Charitable Contributions ───────────────────────────
      cashCharitable:       '',         // cash to 50%/60% orgs — Line 11 — IRC §170(b)(1)(G)
      nonCashCharitable:    '',         // non-cash property to 50% orgs — Line 12 — IRC §170(b)(1)(A)
      capGainCharitable30:  '',         // cap gain property to 50% orgs — 30% limit — IRC §170(b)(1)(C)
      capGainCharitable20:  '',         // cap gain property to private foundations — 20% limit — IRC §170(b)(1)(D)
      charCarryover: {                  // prior-year contribution carryovers — IRC §170(d)(1)
        cash60:    '',
        noncash50: '',
        capgain30: '',
        private20: ''
      },
      // ── Part V — Casualty & Theft Losses ─────────────────────────────
      casualtyEvents:       [],         // dynamic rows: [{desc:'', fmvBefore:'', fmvAfter:'', insurance:'', federallyDeclared:false, stateDeclared:false}]
      // ── Part VI — Other Itemized Deductions ──────────────────────────
      gamblingLosses:       '',         // IRC §165(d) — cross-referenced with schedule1.l8b (gambling winnings)
      otherDeductions:      [],         // dynamic rows: [{desc:'', amount:''}] — Line 17 other deductions
      // ── Overrides ─────────────────────────────────────────────────────
      mfsSpouseItemizes:    false,      // IRC §63(e): if true, standard deduction overridden to $0
      electToItemize:       false       // taxpayer elects itemized even when standard is higher
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
    // Unified per-document array. type:'ira' → Lines 4a/4b; type:'pension' → Lines 5a/5b.
    // Box 7 distribution code auto-derives §72(t) penalty: '1'→10%, 'S'→25%, others→none.
    // Each entry: { type, payerName, payerTin, box1, box2a, box2bNotDet, box2bTotal, box4, box7, collapsed, advOpen }
    r1099s: [],

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
  switch (schedId) {
    case 'w2':       return (r.w2 || []).length > 0 ? 'entered' : 'empty';
    case 'retirement':
    case 'ira':
    case 'pension':  return (r.r1099s || []).length > 0 ? 'entered' : 'empty';
    case 'ss':       return parseFloat((r.socialSecurity || {}).benefits) > 0 ? 'entered' : 'empty';
    case '1099-int': return (r.int1099s || []).some(e => parseFloat(e.box1) > 0 || parseFloat(e.box3) > 0 || parseFloat(e.box8) > 0) ? 'entered' : 'empty';
    case '1099-div': return (r.div1099s || []).some(e => parseFloat(e.box1a) > 0) ? 'entered' : 'empty';
    case 'sched-b': {
      let sb = r.schedB || {};
      return (r.int1099s||[]).length > 0 || (r.div1099s||[]).length > 0
        || (sb.intManualPayers||[]).length > 0 || (sb.divManualPayers||[]).length > 0
        || sb.line7a || sb.line7b || sb.line8 ? 'entered' : 'empty';
    }
    case 'sched-d': {
      let sd  = r.scheduleD || {};
      let stHas = (sd.shortTermTransactions||[]).some(tx => tx.proceeds || tx.cost || tx.description);
      let ltHas = (sd.longTermTransactions ||[]).some(tx => tx.proceeds || tx.cost || tx.description);
      return (sd.netSTCG || sd.netLTCG || sd.priorYearCarryforward || stHas || ltHas
        || sd.stGainForm6252 || sd.stGainK1 || sd.stLossCarryover
        || sd.ltGainForm4797 || sd.ltGainK1 || sd.capitalGainDistributions || sd.ltLossCarryover) ? 'entered' : 'empty';
    }
    case 'sched-c':    return parseFloat((r.scheduleC || {}).netProfit) > 0 ? 'entered' : 'empty';
    case 'sched-e':    return (r.scheduleE || []).length > 0 ? 'entered' : 'empty';
    case 'sched-1':
    case 'sched-1-pi':    // legacy alias
    case 'sched-1-pii': { // legacy alias
      let _s = r.schedule1 || {};
      let p1 = (parseFloat(_s.taxRefunds)||0) > 0 || (parseFloat(_s.alimonyReceived)||0) > 0
        || (parseFloat(_s.otherGains)||0) > 0 || (parseFloat(_s.unemployment)||0) > 0
        || ['l8a','l8b','l8c','l8d','l8e','l8f','l8g','l8h','l8i','l8j','l8k','l8l',
            'l8m','l8n','l8o','l8p','l8q','l8r','l8s','l8t','l8u','l8v'].some(k => (parseFloat(_s[k])||0) !== 0)
        || (_s.otherIncomeRows||[]).length > 0;
      let p2 = ['p2L11','p2L12','p2L14','p2L16','p2L17','p2L18','p2L23',
              'p2L24a','p2L24b','p2L24c','p2L24d','p2L24e','p2L24f',
              'p2L24g','p2L24h','p2L24i','p2L24j','p2L24k'].some(k => (parseFloat(_s[k])||0) !== 0)
        || (_s.p2OtherAdjRows||[]).length > 0;
      return (p1 || p2) ? 'entered' : 'empty';
    }
    case 'sched-a': {
      let sa = r.scheduleA || {};
      let hasData = (parseFloat(sa.stateIncomeTax)||0) > 0 || (parseFloat(sa.localIncomeTax)||0) > 0
        || (parseFloat(sa.realEstateTax)||0) > 0 || (parseFloat(sa.personalPropertyTax)||0) > 0
        || (parseFloat(sa.mortgageInterest)||0) > 0 || (parseFloat(sa.mortgageInterestOther)||0) > 0
        || (parseFloat(sa.mortgagePoints)||0) > 0 || (parseFloat(sa.pmiPremiums)||0) > 0
        || (parseFloat(sa.cashCharitable)||0) > 0 || (parseFloat(sa.nonCashCharitable)||0) > 0
        || (parseFloat(sa.capGainCharitable30)||0) > 0 || (parseFloat(sa.capGainCharitable20)||0) > 0
        || (parseFloat(sa.medicalExpenses)||0) > 0 || (parseFloat(sa.gamblingLosses)||0) > 0
        || (sa.otherTaxes||[]).length > 0 || (sa.casualtyEvents||[]).length > 0
        || (sa.otherDeductions||[]).length > 0;
      return hasData ? 'entered' : 'empty';
    }
    default:           return 'empty';
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
    int1099s:           r.int1099s           || [],
    div1099s:           r.div1099s           || [],
    schedB:             r.schedB             || { line3: '', intManualPayers: [], divManualPayers: [], line7a: '', line7aFbar: '', line7b: '', line8: '' },
    r1099s:             r.r1099s             || [],
    socialSecurity:     r.socialSecurity     || { benefits: '', repaid: '', withheld: '', mfsLivedWithSpouse: false },
    isoExercise:        r.isoExercise        || {},
    canBeClaimed:       r.canBeClaimed       !== undefined ? r.canBeClaimed : false,
    scheduleD:          r.scheduleD          || { shortTermTransactions:[{id:'st-0',description:'',dateAcquired:'',dateSold:'',proceeds:'',cost:'',adjustments:''}], longTermTransactions:[{id:'lt-0',description:'',dateAcquired:'',dateSold:'',proceeds:'',cost:'',adjustments:''}], stGainForm6252:'',stGainK1:'',stLossCarryover:'',ltGainForm4797:'',ltGainK1:'',capitalGainDistributions:'',ltLossCarryover:'',rate28Gain:'',unrecaptured1250:'',qualifiedOpportunityFund:false,netSTCG:'',netLTCG:'',priorYearCarryforward:'' },
    scheduleE:          r.scheduleE          || [],
    schedule1:          r.schedule1          || { k1099Amount:'', taxRefunds:'', alimonyReceived:'', alimonyDate:'', otherGains:'', otherGainsForm4797:false, otherGainsForm4684:false, unemployment:'', unemploymentRepaid:false, unemploymentRepaidAmt:'', l8a:'', l8b:'', l8c:'', l8d:'', l8e:'', l8f:'', l8g:'', l8h:'', l8i:'', l8j:'', l8k:'', l8l:'', l8m:'', l8n:'', l8o:'', l8p:'', l8q:'', l8r:'', l8s:'', l8t:'', l8u:'', l8v:'', otherIncomeRows:[] },
    investmentInterest: r.investmentInterest || { expense: '', priorYearCarryforward: '', includeQDinNII: false },
    deductionType:      r.deductionType      || 'standard',
    educationStudents: r.educationStudents || [],
    agiAdjustments:    r.agiAdjustments    || { studentLoanInterest: '', hsaCoverageType: 'self', hsaContributions: '', hsaTaxpayerAge55: false, iraContributions: '', iraAge50Plus: false, iraActiveParticipant: false, iraSpouseActive: false },
    scheduleA:         r.scheduleA         || { medicalExpenses: '', useSalesTax: false, salesTax: '', stateIncomeTax: '', localIncomeTax: '', realEstateTax: '', personalPropertyTax: '', otherTaxes: [], mortgageInterest: '', mortgageBalance: '', mortgageLoanDate: 'post2017', mortgagePurpose: 'acquisition', mortgagePoints: '', mortgageInterestOther: '', pmiPremiums: '', cashCharitable: '', nonCashCharitable: '', capGainCharitable30: '', capGainCharitable20: '', charCarryover: { cash60: '', noncash50: '', capgain30: '', private20: '' }, casualtyEvents: [], gamblingLosses: '', otherDeductions: [], mfsSpouseItemizes: false, electToItemize: false },
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
  // Migrate legacy W-2 entries ({ employer, wages, federalWithheld }) to full box-level structure
  r.w2 = r.w2.map(w => {
    if (w.box1 === undefined) {
      // Legacy single-field entry — lift into full W-2 object
      return {
        ssn: '', ein: '', empName: w.employer || '', empAddr: '',
        controlNum: '', eeName: '', eeMI: '', eeLastName: '', eeSuffix: '', eeAddr: '',
        box1: w.wages || '', box2: w.federalWithheld || '',
        box3: '', box4: '', box5: '', box6: '', box7: '', box8: '', box10: '', box11: '',
        box12: [{ code: '', amount: '' }, { code: '', amount: '' }, { code: '', amount: '' }, { code: '', amount: '' }],
        box13Statutory: false, box13Retirement: false, box13ThirdParty: false,
        box14: [],
        stateRows: [{ state: '', stateId: '', stateWages: '', stateTax: '', localWages: '', localTax: '', locality: '' }],
        collapsed: false
      };
    }
    // Backfill any fields missing on partially-migrated entries
    if (!w.box12)     w.box12 = [{ code: '', amount: '' }, { code: '', amount: '' }, { code: '', amount: '' }, { code: '', amount: '' }];
    else while (w.box12.length < 4) w.box12.push({ code: '', amount: '' });
    if (!w.box14)     w.box14 = [];
    if (!w.stateRows) w.stateRows = [{ state: '', stateId: '', stateWages: '', stateTax: '', localWages: '', localTax: '', locality: '' }];
    ['box3','box4','box5','box6','box7','box8','box10','box11',
     'ssn','ein','empName','empAddr','controlNum','eeName','eeMI','eeLastName','eeSuffix','eeAddr'
    ].forEach(k => { if (w[k] === undefined) w[k] = ''; });
    if (w.box13Statutory  === undefined) w.box13Statutory  = false;
    if (w.box13Retirement === undefined) w.box13Retirement = false;
    if (w.box13ThirdParty === undefined) w.box13ThirdParty = false;
    if (w.collapsed       === undefined) w.collapsed       = false;
    return w;
  });
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
  if (!r.scheduleA) r.scheduleA = {};
  // Backfill all Schedule A fields — handles existing returns that predate this update
  let _sa = r.scheduleA;
  if (_sa.medicalExpenses       === undefined) _sa.medicalExpenses       = '';
  if (_sa.useSalesTax           === undefined) _sa.useSalesTax           = false;
  if (_sa.salesTax              === undefined) _sa.salesTax              = '';
  if (_sa.stateIncomeTax        === undefined) _sa.stateIncomeTax        = '';
  if (_sa.localIncomeTax        === undefined) _sa.localIncomeTax        = '';
  if (_sa.realEstateTax         === undefined) _sa.realEstateTax         = '';
  if (_sa.personalPropertyTax   === undefined) _sa.personalPropertyTax   = '';
  if (!_sa.otherTaxes)                         _sa.otherTaxes            = [];
  if (_sa.mortgageInterest      === undefined) _sa.mortgageInterest      = '';
  if (_sa.mortgageBalance       === undefined) _sa.mortgageBalance       = '';
  if (!_sa.mortgageLoanDate)                   _sa.mortgageLoanDate      = 'post2017';
  if (!_sa.mortgagePurpose)                    _sa.mortgagePurpose       = 'acquisition';
  if (_sa.mortgagePoints        === undefined) _sa.mortgagePoints        = '';
  if (_sa.mortgageInterestOther === undefined) _sa.mortgageInterestOther = '';
  if (_sa.pmiPremiums           === undefined) _sa.pmiPremiums           = '';
  if (_sa.cashCharitable        === undefined) _sa.cashCharitable        = '';
  if (_sa.nonCashCharitable     === undefined) _sa.nonCashCharitable     = '';
  if (_sa.capGainCharitable30   === undefined) _sa.capGainCharitable30   = '';
  if (_sa.capGainCharitable20   === undefined) _sa.capGainCharitable20   = '';
  if (!_sa.charCarryover)                      _sa.charCarryover         = { cash60: '', noncash50: '', capgain30: '', private20: '' };
  else {
    if (_sa.charCarryover.cash60    === undefined) _sa.charCarryover.cash60    = '';
    if (_sa.charCarryover.noncash50 === undefined) _sa.charCarryover.noncash50 = '';
    if (_sa.charCarryover.capgain30 === undefined) _sa.charCarryover.capgain30 = '';
    if (_sa.charCarryover.private20 === undefined) _sa.charCarryover.private20 = '';
  }
  if (!_sa.casualtyEvents)                     _sa.casualtyEvents        = [];
  if (_sa.gamblingLosses        === undefined) _sa.gamblingLosses        = '';
  if (!_sa.otherDeductions)                    _sa.otherDeductions       = [];
  if (_sa.mfsSpouseItemizes     === undefined) _sa.mfsSpouseItemizes     = false;
  if (_sa.electToItemize        === undefined) _sa.electToItemize        = false;
  // Track 4 backfill — migrate legacy schedule1099 summary fields into per-document arrays
  if (!r.int1099s) {
    let old = r.schedule1099 || {};
    // Migrate: if old summary fields have values, seed one card entry from them
    if (old.interestIncome || old.taxExemptInterest) {
      r.int1099s = [{
        payer: '', payerTin: '',
        box1: old.interestIncome    || '',  // ordinary interest
        box2: '',                            // early withdrawal penalty (auto to Sch 1 L18)
        box3: old.taxExemptInterest || '',  // interest on US savings bonds
        box4: '',                            // federal tax withheld
        box5: '', box6: false, box7: '', box8: old.taxExemptInterest || '',
        box9: '', box10: '', box11: '', box12: '', box13: '', box14: '', box15: '', box16: '', box17: '',
        state: '', stateId: '',
        collapsed: false, advOpen: false
      }];
    } else {
      r.int1099s = [];
    }
  }
  if (!r.div1099s) {
    let old = r.schedule1099 || {};
    if (old.ordinaryDividends || old.qualifiedDividends) {
      r.div1099s = [{
        payer: '', payerTin: '',
        box1a: old.ordinaryDividends  || '',  // total ordinary dividends
        box1b: old.qualifiedDividends || '',  // qualified dividends
        box2a: '', box2b: '', box2c: '', box2d: '', box2e: '', box2f: '',
        box3: '', box4: '',  // box4 = federal tax withheld
        box5: '', box6: '', box7: '', box8: '', box9: '', box10: '', box11: '',
        box12: '', box13: '', box14: '', box15: '', box16: '',
        state: '', stateId: '',
        collapsed: false, advOpen: false
      }];
    } else {
      r.div1099s = [];
    }
  }
  if (!r.schedB) r.schedB = { line3: '', intManualPayers: [], divManualPayers: [], line7a: '', line7aFbar: '', line7b: '', line8: '' };
  // Track 2 backfill — migrate legacy ira1099r / pension1099r arrays into unified r1099s[]
  if (!r.r1099s) {
    let migrated = [];
    (r.ira1099r || []).forEach(e => {
      migrated.push({
        type: 'ira',
        payerName:   e.payerName  || '',
        payerTin:    '',
        box1:        e.grossDist    || '',   // gross distribution
        box2a:       e.taxableDist  || '',   // taxable amount
        box2bNotDet: false,
        box2bTotal:  false,
        box4:        '',                     // federal withholding not captured in old schema
        box7:        e.penaltyException ? '7' : (e.age && parseFloat(e.age) < 59.5 ? '1' : '7'),
        collapsed:   false,
        advOpen:     false
      });
    });
    (r.pension1099r || []).forEach(e => {
      migrated.push({
        type: 'pension',
        payerName:   e.payerName  || '',
        payerTin:    '',
        box1:        e.grossDist    || '',
        box2a:       e.taxableDist  || '',
        box2bNotDet: false,
        box2bTotal:  false,
        box4:        '',
        box7:        e.penaltyException ? '7' : (e.age && parseFloat(e.age) < 59.5 ? '1' : '7'),
        collapsed:   false,
        advOpen:     false
      });
    });
    r.r1099s = migrated;
  }
  // Backfill new SSA-1099 fields
  if (!r.socialSecurity) r.socialSecurity = {};
  if (r.socialSecurity.repaid   === undefined) r.socialSecurity.repaid   = '';
  if (r.socialSecurity.withheld === undefined) r.socialSecurity.withheld = '';
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
  // Schedule 1 Part I backfill — existing returns predate this object
  if (!r.schedule1) r.schedule1 = {};
  let _s1 = r.schedule1;
  if (_s1.k1099Amount          === undefined) _s1.k1099Amount          = '';
  if (_s1.taxRefunds           === undefined) _s1.taxRefunds           = '';
  if (_s1.alimonyReceived      === undefined) _s1.alimonyReceived      = '';
  if (_s1.alimonyDate          === undefined) _s1.alimonyDate          = '';
  if (_s1.otherGains           === undefined) _s1.otherGains           = '';
  if (_s1.otherGainsForm4797   === undefined) _s1.otherGainsForm4797   = false;
  if (_s1.otherGainsForm4684   === undefined) _s1.otherGainsForm4684   = false;
  if (_s1.unemployment         === undefined) _s1.unemployment         = '';
  if (_s1.unemploymentRepaid   === undefined) _s1.unemploymentRepaid   = false;
  if (_s1.unemploymentRepaidAmt=== undefined) _s1.unemploymentRepaidAmt= '';
  ['l8a','l8b','l8c','l8d','l8e','l8f','l8g','l8h','l8i','l8j','l8k','l8l',
   'l8m','l8n','l8o','l8p','l8q','l8r','l8s','l8t','l8u','l8v'].forEach(k => {
    if (_s1[k] === undefined) _s1[k] = '';
  });
  if (!_s1.otherIncomeRows) _s1.otherIncomeRows = [];
  // Schedule 1 Part II backfill — existing returns predate these fields
  ['p2L11','p2L12','p2L14','p2L16','p2L17','p2L18','p2L19b','p2L19c','p2L23',
   'p2L24a','p2L24b','p2L24c','p2L24d','p2L24e','p2L24f',
   'p2L24g','p2L24h','p2L24i','p2L24j','p2L24k'].forEach(k => {
    if (_s1[k] === undefined) _s1[k] = '';
  });
  if (_s1.p2L14StorageOnly === undefined) _s1.p2L14StorageOnly = false;
  if (!_s1.p2OtherAdjRows) _s1.p2OtherAdjRows = [];
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
