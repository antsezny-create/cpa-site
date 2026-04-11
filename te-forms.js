




// ──────────────────────────────────────────────────────────────────────
//  INIT / RETURN CENTER
// ──────────────────────────────────────────────────────────────────────

// ── Dirty-state helpers ──────────────────────────────────────────────
// teMarkDirty(): called on every field change. Sets flag and updates Save button.


// teClearDirty(): called on successful save or confirmed discard.







// ──────────────────────────────────────────────────────────────────────
//  NEW RETURN MODAL
// ──────────────────────────────────────────────────────────────────────



// ──────────────────────────────────────────────────────────────────────
//  OPEN / CLOSE ENGINE
// ──────────────────────────────────────────────────────────────────────



// ──────────────────────────────────────────────────────────────────────
//  1040 DASHBOARD — Form-level read-only summary
//  Phase 3 Step 8: shell with all 1040 lines, schedule badges, live values.
//  Phase 3 Step 9+: teOpenSchedule() will render individual schedule screens.
// ──────────────────────────────────────────────────────────────────────


// Build a clickable card for the section menu pages
function teMenuCard(schedId, formNum, title, desc, hasData, amtDisplay, navSrc) {
  let dot = hasData
    ? '<span class="te-card-dot te-card-dot-on"></span>'
    : '<span class="te-card-dot te-card-dot-off"></span>';
  let amt = hasData && amtDisplay
    ? `<span class="te-card-amt te-mono">${amtDisplay}</span>`
    : `<span class="te-card-amt te-card-amt-empty">—</span>`;
  return `
    <div class="te-menu-card" onclick="teOpenSchedule('${esc(schedId)}','${esc(navSrc)}')">
      <div class="te-card-top"><div class="te-card-form">${esc(formNum)}</div>${dot}</div>
      <div class="te-card-title">${title}</div>
      <div class="te-card-desc">${desc}</div>
      <div class="te-card-footer">${amt}</div>
    </div>`;
}

// Auto card — read-only, non-clickable. Used for deductions auto-calculated by the engine.
// No onclick, no navSrc. Visually distinct via te-menu-card-auto class.
function teMenuAutoCard(formNum, title, desc, hasData, amtDisplay) {
  let dot = hasData
    ? '<span class="te-card-dot te-card-dot-on"></span>'
    : '<span class="te-card-dot te-card-dot-off"></span>';
  let amt = hasData && amtDisplay
    ? `<span class="te-card-amt te-mono">${amtDisplay}</span>`
    : `<span class="te-card-amt te-card-amt-empty">—</span>`;
  return `
    <div class="te-menu-card te-menu-card-auto">
      <div class="te-card-top"><div class="te-card-form">${esc(formNum)}</div>${dot}</div>
      <div class="te-card-title">${title}</div>
      <div class="te-card-desc">${desc}</div>
      <div class="te-card-footer">${amt}</div>
      <div class="te-card-auto-badge">Auto-calculated</div>
    </div>`;
}

// ── INCOME MENU ───────────────────────────────────────────────────────
function teRenderIncomeMenu() {
  let r  = teCurrentReturn;
  let c  = r._calc || {};
  let s1 = r.schedule1099 || {};
  let src = 'income';
  let hasDIV    = (parseFloat(s1.ordinaryDividends) || 0) > 0;
  let hasINT    = (parseFloat(s1.interestIncome) || 0) > 0;
  let hasINTDIV = hasDIV || hasINT;
  let intDivAmt = (c.interestIncome || 0) + (c.ordinaryDividends || 0);
  let sdNet     = c.scheduleDNet || 0;
  let hasSd     = !!(((r.scheduleD||{}).netSTCG)||((r.scheduleD||{}).netLTCG)||((r.scheduleD||{}).priorYearCarryforward));
  return `
    <div class="te-sec-hdr"><h2>Income</h2>
    <p class="te-sec-sub">Select a form to enter data &mdash; <span class="te-cite">IRC §61</span></p></div>
    <div class="te-menu-grid">
      ${teMenuCard('w2',         'W-2',          'Wages &amp; Salaries',
          'Box 1 wages, Box 2 federal withholding. Enter each employer separately.',
          (r.w2||[]).length > 0, teFmt(c.w2Wages||0), src)}
      ${teMenuCard('1099-intdiv','1099-INT / DIV','Interest &amp; Dividend Income',
          'Taxable interest, ordinary dividends, and qualified dividends.',
          hasINTDIV, teFmt(intDivAmt), src)}
      ${teMenuCard('retirement',  '1099-R',        'Retirement Distributions',
          'IRA, pension, 401(k), 403(b), and annuity distributions — Lines 4a/4b and 5a/5b.',
          (r.ira1099r||[]).length > 0 || (r.pension1099r||[]).length > 0,
          teFmt((c.iraGross||0) + (c.pensionGross||0)), src)}
      ${teMenuCard('ss',         'SSA-1099',      'Social Security Benefits',
          'Benefits from SSA. Taxability: 0%, 50%, or 85% of gross. IRC §86.',
          parseFloat((r.socialSecurity||{}).benefits) > 0, teFmt(c.ssBenefitsTaxable||0), src)}
      ${teMenuCard('sched-c',    'Schedule C',    'Self-Employment Income',
          'Net profit from business. Drives SE tax and QBI deduction. IRC §162.',
          parseFloat((r.scheduleC||{}).netProfit) > 0, teFmt(c.netSEIncome||0), src)}
      ${teMenuCard('sched-se',   'Schedule SE',   'Self-Employment Tax',
          'SS (12.4%) + Medicare (2.9%) on 92.35% of net SE earnings. IRC §1401.',
          (c.seTax || 0) > 0, (c.seTax || 0) > 0 ? teFmt(c.seTax) : null, src)}
      ${teMenuCard('sched-d',    'Schedule D',    'Capital Gains &amp; Losses',
          'Net short-term and long-term gains. $3,000 annual loss cap. IRC §1221.',
          hasSd, hasSd ? teFmt(Math.abs(sdNet)) : null, src)}
      ${teMenuCard('sched-e',    'Schedule E',    'Pass-Through &amp; K-1 Income',
          'Partnership, S-Corp, trust, estate K-1 income and losses. IRC §702, §1366.',
          (r.scheduleE||[]).length > 0, teFmt(c.scheduleENet||0), src)}
      ${(() => {
        let s1 = r.schedule1 || {};
        let s1Lines = (c.sched1Lines) || {};
        let hasS1 = (parseFloat(s1.taxRefunds)||0) > 0 || (parseFloat(s1.alimonyReceived)||0) > 0
          || (parseFloat(s1.otherGains)||0) > 0 || (parseFloat(s1.unemployment)||0) > 0
          || ['l8a','l8b','l8c','l8d','l8e','l8f','l8g','l8h','l8i','l8j','l8k','l8l',
              'l8m','l8n','l8o','l8p','l8q','l8r','l8s','l8t','l8u','l8v'].some(k => (parseFloat(s1[k])||0) !== 0)
          || (s1.otherIncomeRows||[]).length > 0;
        let s1Extra = c.sched1Extra || 0;
        return teMenuCard('sched-1', 'Schedule 1', 'Additional Income',
          'Taxable refunds, alimony, other gains, unemployment, other income. Sch. 1 Part I → 1040 Line 8.',
          hasS1, hasS1 ? teFmt(Math.abs(s1Extra)) : null, src);
      })()}
    </div>
    <div class="te-menu-total">
      <span>Total Gross Income <span class="te-cite">§61 / 1040 Line 9</span></span>
      <span class="te-mono te-menu-total-amt">${teFmt(c.grossIncome||0)}</span>
    </div>`;
}

// ── DEDUCTIONS MENU ───────────────────────────────────────────────────
function teRenderDeductionsMenu() {
  let r   = teCurrentReturn;
  let c   = r._calc || {};
  let src = 'deductions';
  return `
    <div class="te-sec-hdr"><h2>Deductions</h2>
    <p class="te-sec-sub">Select a schedule to enter data &mdash; <span class="te-cite">IRC §62, §63</span></p></div>
    <div class="te-menu-section-lbl">Above-the-Line Adjustments <span class="te-cite">IRC §62</span></div>
    <div class="te-menu-grid">
      ${teMenuCard('sli',     'Schedule 1', 'Student Loan Interest',
          'Up to $2,500. Phases out by MAGI. IRC §221.',
          (c.sliDeduction||0) > 0, teFmt(c.sliDeduction||0), src)}
      ${teMenuCard('hsa',     'Form 8889',  'HSA Deduction',
          'Health Savings Account contributions. Requires qualifying HDHP. IRC §223.',
          (c.hsaDeduction||0) > 0, teFmt(c.hsaDeduction||0), src)}
      ${teMenuCard('ira-ded', 'Form 1040',  'Traditional IRA Deduction',
          'Deductible IRA contributions. Phases out with employer plan coverage. IRC §219.',
          (c.iraDeduction||0) > 0, teFmt(c.iraDeduction||0), src)}
      ${teMenuCard('alimony', 'Schedule 1', 'Alimony Paid',
          'Pre-2019 divorce agreements only. Post-TCJA not deductible. IRC §215.',
          (c.alimonyDeduction||0) > 0, teFmt(c.alimonyDeduction||0), src)}
      ${teMenuAutoCard('Schedule 1', 'SE Tax Deduction',
          'Deductible half of self-employment tax. Auto-calculated from Schedule SE Line 13. IRC §164(f).',
          (c.seTaxDeduction||0) > 0, teFmt(c.seTaxDeduction||0))}
      ${teMenuAutoCard('Form 8995', 'QBI Deduction',
          'Qualified Business Income deduction. 20% of qualified business income. IRC §199A.',
          (c.qbiDeduction||0) > 0, teFmt(c.qbiDeduction||0))}
    </div>
    <div class="te-menu-section-lbl" style="margin-top:20px;">Schedule A — Itemized Deductions <span class="te-cite">IRC §63(d)</span></div>
    <div class="te-menu-grid">
      ${teMenuCard('sched-a', 'Schedule A', 'Itemized Deductions',
          'Medical, SALT, mortgage interest, charitable, casualty, gambling &amp; other. IRC §63(d).',
          (c.itemizedRaw||0) > 0,
          teFmt(c.deductionType === 'itemized' ? (c.itemizedNet||0) : (c.itemizedRaw||0)), src)}
    </div>
    <div class="te-menu-total">
      <span>${c.deductionType === 'itemized' ? 'Itemized' : 'Standard'} Deduction Applied <span class="te-cite">1040 Line 12e</span></span>
      <span class="te-mono te-menu-total-amt">${teFmt(c.deductionUsed||0)}</span>
    </div>`;
}

// ── CREDITS MENU ──────────────────────────────────────────────────────
function teRenderCreditsMenu() {
  let r     = teCurrentReturn;
  let c     = r._calc || {};
  let fs    = r.filingStatus || 'single';
  let isMFS = (fs === 'mfs');
  let src   = 'credits';
  let mfsCard = (formNum, title, cite) =>
    `<div class="te-menu-card te-menu-card-mfs">
       <div class="te-card-top"><div class="te-card-form">${formNum}</div></div>
       <div class="te-card-title">${title}</div>
       <div class="te-card-mfs-note">Not available for MFS. <span class="te-cite">${cite}</span></div>
     </div>`;
  let totalCr = (c.ctcNonRefundable||0)+(c.actcRefundable||0)+
                (c.eicCredit||0)+(c.cdccCredit||0)+
                (c.saversCredit||0)+(c.energyCredit||0)+
                (c.aocRefundable||0);
  return `
    <div class="te-sec-hdr"><h2>Tax Credits</h2>
    <p class="te-sec-sub">Select a credit to enter data &mdash; <span class="te-cite">IRC §24, §25A, §32</span></p></div>
    <div class="te-menu-grid">
      ${teMenuCard('ctc',    'Form 8812',   'Child Tax Credit',
          'CTC ($2,200 / child under 17) + ACTC refundable portion. Auto-calculated from dependents.',
          (c.ctcNonRefundable||0)+(c.actcRefundable||0) > 0,
          teFmt((c.ctcNonRefundable||0)+(c.actcRefundable||0)), src)}
      ${teMenuCard('edu',    'Form 8863',   'Education Credits',
          'American Opportunity (AOC) or Lifetime Learning (LLC) — one credit per student per year.',
          (r.educationStudents||[]).length > 0,
          teFmt((c.eduCredit||0)+(c.aocRefundable||0)), src)}
      ${isMFS
        ? mfsCard('Schedule EIC', 'Earned Income Credit', 'IRC §32(d)')
        : teMenuCard('eic', 'Schedule EIC', 'Earned Income Credit',
            'Fully refundable. Auto-calculated from earned income and qualifying children.',
            (c.eicCredit||0) > 0, teFmt(c.eicCredit||0), src)}
      ${isMFS
        ? mfsCard('Form 2441', 'Child &amp; Dependent Care Credit', 'IRC §21(e)(2)')
        : teMenuCard('cdcc', 'Form 2441', 'Child &amp; Dependent Care Credit',
            'Care expenses for qualifying persons. Non-refundable. Coordinates with FSA.',
            (c.cdccCredit||0) > 0, teFmt(c.cdccCredit||0), src)}
      ${isMFS
        ? mfsCard('Form 8880', "Saver's Credit", 'IRC §25B(g)')
        : teMenuCard('savers', 'Form 8880', "Retirement Savings (Saver's) Credit",
            'Credit for contributions to 401(k), IRA, etc. Non-refundable. IRC §25B.',
            (c.saversCredit||0) > 0, teFmt(c.saversCredit||0), src)}
      ${teMenuCard('energy', 'Form 5695',  'Energy-Efficient Home Credit',
          'Two pools: §25C general ($1,200 cap) and heat pump ($2,000 cap). Non-refundable.',
          (c.energyCredit||0) > 0, teFmt(c.energyCredit||0), src)}
    </div>
    <div class="te-menu-total">
      <span>Total Credits</span>
      <span class="te-mono te-menu-total-amt">${teFmt(totalCr)}</span>
    </div>`;
}

// ── PAYMENTS MENU ─────────────────────────────────────────────────────
function teRenderPaymentsMenu() {
  let r             = teCurrentReturn;
  let c             = r._calc || {};
  let w2Withholding = c.w2Withholding || 0;
  let estPmt        = c.estPayments   || 0;
  let src           = 'payments';
  return `
    <div class="te-sec-hdr"><h2>Payments &amp; Withholding</h2>
    <p class="te-sec-sub">Federal tax payments &mdash; <span class="te-cite">IRC §3402, §6654</span></p></div>
    <div class="te-menu-grid">
      <div class="te-menu-card te-menu-card-readonly" onclick="teOpenSchedule('w2','income')">
        <div class="te-card-top">
          <div class="te-card-form">W-2</div>
          <span class="te-card-dot ${w2Withholding > 0 ? 'te-card-dot-on' : 'te-card-dot-off'}"></span>
        </div>
        <div class="te-card-title">Federal W-2 Withholding</div>
        <div class="te-card-desc">Box 2 withholding from W-2s. Read-only — enter under Income → W-2.</div>
        <div class="te-card-footer">
          ${w2Withholding > 0 ? `<span class="te-card-amt te-mono">${teFmt(w2Withholding)}</span>` : `<span class="te-card-amt te-card-amt-empty">—</span>`}
          <span class="te-card-readonly-badge">Auto</span>
        </div>
      </div>
      ${teMenuCard('est-payments', 'Form 1040-ES', 'Estimated Tax Payments',
          'Quarterly prepayments. Enter Q1–Q4 amounts. IRC §6654.',
          estPmt > 0, teFmt(estPmt), src)}
    </div>
    <div class="te-menu-total">
      <span>Total Payments <span class="te-cite">1040 Line 33</span></span>
      <span class="te-mono te-menu-total-amt">${teFmt(c.totalPayments||0)}</span>
    </div>`;
}


// ── MINI-SCREEN SHELL ─────────────────────────────────────────────────
function teRenderMiniScreen(schedId) {
  let src = teNavSource || 'dashboard';
  let nav = teMiniNav(src);
  let r   = teCurrentReturn;
  let c   = r._calc || {};

  switch (schedId) {

    // ── INCOME ────────────────────────────────────────────────────
    case 'w2':
      return nav + `
        <div class="te-sec-hdr"><h2>W-2 — Wages &amp; Salaries</h2>
        <p class="te-sec-sub"><span class="te-cite">IRC §61(a)(1), §3401 &mdash; 1040 Lines 1a &amp; 25a</span></p></div>
        <div class="te-subsec">
          <div class="te-subsec-row">
            <div class="te-subsec-desc">Enter each employer&rsquo;s W-2 separately. All boxes from the actual form. Box 1 feeds 1040 Line 1a; Box 2 feeds Line 25a.</div>
            <button class="ghost-btn te-sm-btn" onclick="teAddW2()">+ Add W-2</button>
          </div>
          <div id="te-w2-list"></div>
          <div class="te-total-bar te-w2-total-bar-2col" id="te-w2-total-bar" style="display:none;">
            <div class="te-w2-total-item">
              <span>Total W-2 Wages <span class="te-cite">Box 1 &rarr; 1040 Line 1a</span></span>
              <span class="te-total-val te-mono" id="te-w2-total-val">$0</span>
            </div>
            <div class="te-w2-total-item">
              <span>Total Federal Withholding <span class="te-cite">Box 2 &rarr; 1040 Line 25a</span></span>
              <span class="te-total-val te-mono" id="te-w2-total-val2">$0</span>
            </div>
          </div>
        </div>`;

    case '1099-int':
    case '1099-div':
    case '1099-intdiv':
      return nav + `
        <div class="te-sec-hdr"><h2>1099-INT &amp; 1099-DIV — Interest &amp; Dividends</h2>
        <p class="te-sec-sub"><span class="te-cite">IRC §61(a)(4),(7) &mdash; 1040 Lines 2b, 3a, 3b</span></p></div>
        <div class="te-subsec">${teRender1099()}</div>`;

    case 'retirement':
      return nav + `
        <div class="te-sec-hdr"><h2>1099-R — Retirement Distributions</h2>
        <p class="te-sec-sub"><span class="te-cite">IRC §72 &mdash; 1040 Lines 4a/4b and 5a/5b</span></p></div>

        <div class="te-subsec">
          <div style="font-size:11px;font-weight:800;text-transform:uppercase;letter-spacing:0.08em;color:var(--text-dim);border-bottom:1px solid var(--border);padding-bottom:6px;margin-bottom:8px;">
            IRA Distributions &nbsp;&mdash;&nbsp; <span class="te-cite">IRC §72, §408 &nbsp;|&nbsp; Lines 4a / 4b</span>
          </div>
          <div class="te-subsec-desc">Traditional IRA, SEP-IRA, SIMPLE IRA. Taxable amount defaults to gross — adjust if after-tax basis or rollover applies (Box 2a).</div>
          <div class="te-subsec-row" style="margin-top:8px;">
            <div></div>
            <button class="ghost-btn te-sm-btn" onclick="teAdd1099R('ira')">+ Add 1099-R (IRA)</button>
          </div>
          <div id="te-ira-list"></div>
          <div class="te-total-bar" id="te-ira-total-bar" style="display:none;">
            <span>Total IRA Taxable Amount <span class="te-cite">1040 Line 4b</span></span>
            <span class="te-total-val" id="te-ira-total-val">$0</span>
          </div>
        </div>

        <div class="te-subsec" style="margin-top:20px;">
          <div style="font-size:11px;font-weight:800;text-transform:uppercase;letter-spacing:0.08em;color:var(--text-dim);border-bottom:1px solid var(--border);padding-bottom:6px;margin-bottom:8px;">
            Pensions &amp; Annuities &nbsp;&mdash;&nbsp; <span class="te-cite">IRC §72 &nbsp;|&nbsp; Lines 5a / 5b</span>
          </div>
          <div class="te-subsec-desc">401(k), 403(b), 457(b), pension plans, annuities. Taxable amount defaults to gross — adjust if after-tax basis applies.</div>
          <div class="te-subsec-row" style="margin-top:8px;">
            <div></div>
            <button class="ghost-btn te-sm-btn" onclick="teAdd1099R('pension')">+ Add 1099-R (Pension)</button>
          </div>
          <div id="te-pension-list"></div>
          <div class="te-total-bar" id="te-pension-total-bar" style="display:none;">
            <span>Total Pension Taxable Amount <span class="te-cite">1040 Line 5b</span></span>
            <span class="te-total-val" id="te-pension-total-val">$0</span>
          </div>
        </div>`;

    case 'ss':
      return nav + `
        <div class="te-sec-hdr"><h2>SSA-1099 — Social Security Benefits</h2>
        <p class="te-sec-sub"><span class="te-cite">IRC §86 &mdash; 1040 Lines 6a / 6b</span></p></div>
        <div class="te-subsec">${teRenderSSSection()}</div>`;

    case 'sched-c':
      return nav + `
        <div class="te-sec-hdr"><h2>Schedule C — Profit or Loss From Business</h2>
        <p class="te-sec-sub"><span class="te-cite">IRC §162, §61(a)(2) &mdash; Sch. 1 Line 3</span></p></div>
        <div class="te-subsec">${teRenderScheduleC()}</div>`;

    case 'sched-se':
      return nav + `
        <div class="te-sec-hdr"><h2>Schedule SE — Self-Employment Tax</h2>
        <p class="te-sec-sub"><span class="te-cite">IRC §1401, §1402 &mdash; Schedule 2, Line 4</span></p></div>
        <div class="te-subsec">${teRenderScheduleSE()}</div>`;

    case 'sched-d':
      return nav + `
        <div class="te-sec-hdr"><h2>Schedule D — Capital Gains and Losses</h2>
        <p class="te-sec-sub"><span class="te-cite">IRC §1221, §1222 &mdash; 1040 Line 7a</span></p></div>
        <div class="te-subsec">${teRenderScheduleD()}</div>`;

    case 'sched-1':
      return nav + `
        <div class="te-sec-hdr"><h2>Schedule 1 &mdash; Additional Income and Adjustments</h2>
        <p class="te-sec-sub"><span class="te-cite">IRC §61, §62 &mdash; 1040 Lines 8 &amp; 10</span></p></div>
        <div class="te-subsec">${teRenderSchedule1()}</div>`;

    case 'sched-e':
      return nav + `
        <div class="te-sec-hdr"><h2>Schedule E — Pass-Through &amp; K-1 Income</h2>
        <p class="te-sec-sub"><span class="te-cite">IRC §702, §1366 &mdash; Sch. 1 Line 5</span></p></div>
        <div class="te-subsec">
          <div class="te-subsec-desc">Partnership, S-Corp, trust, and estate K-1 income/loss. Passive losses suspended until offset by passive income. <span class="te-cite">IRC §469</span></div>
          <div class="te-subsec-row" style="margin-top:8px;">
            <div></div>
            <button class="ghost-btn te-sm-btn" onclick="teAddScheduleE()">+ Add Entity</button>
          </div>
          <div id="te-sche-list"></div>
        </div>`;

    // ── DEDUCTIONS ────────────────────────────────────────────────
    case 'sli':
    case 'hsa':
    case 'ira-ded':
    case 'alimony':
      return nav + teRenderMiniDeductionSection(schedId);

    // ── SCHEDULE A — unified form (replaces individual salt/mortgage/charitable/medical mini-screens)
    case 'sched-a':
    case 'salt':       // legacy alias — reroutes to unified screen
    case 'mortgage':   // legacy alias
    case 'charitable': // legacy alias
    case 'medical':    // legacy alias
      return nav + teRenderScheduleA();

    // ── CREDITS ───────────────────────────────────────────────────
    case 'ctc':
      return nav + `
        <div class="te-sec-hdr"><h2>Child Tax Credit &amp; Schedule 8812</h2>
        <p class="te-sec-sub"><span class="te-cite">IRC §24 — OBBBA P.L. 119-21 &mdash; 1040 Lines 19, 28</span></p></div>
        <div class="te-subsec">
          <div class="te-subsec-desc">Qualifying children are auto-identified from the Personal section. Add dependents there to generate CTC amounts here.</div>
          <div id="te-ctc-detail" style="margin-top:10px;"></div>
        </div>`;

    case 'edu':
      return nav + `
        <div class="te-sec-hdr"><h2>Education Credits (Form 8863)</h2>
        <p class="te-sec-sub"><span class="te-cite">IRC §25A &mdash; 1040 Lines 29, 27a (AOC refundable)</span></p></div>
        <div class="te-subsec">
          <div class="te-subsec-row">
            <div class="te-subsec-desc">American Opportunity (up to $2,500; 40% refundable) or Lifetime Learning (up to $2,000). One credit per student per year.</div>
            <button class="ghost-btn te-sm-btn" onclick="teAddStudent()">+ Add Student</button>
          </div>
          <div id="te-edu-list" style="margin-top:10px;"></div>
        </div>`;

    case 'eic':
      return nav + `
        <div class="te-sec-hdr"><h2>Earned Income Credit (Schedule EIC)</h2>
        <p class="te-sec-sub"><span class="te-cite">IRC §32 &mdash; 1040 Line 27a</span></p></div>
        <div class="te-subsec">
          <div class="te-subsec-desc">Fully refundable. Calculated automatically from earned income and qualifying children in the Personal section.</div>
          <div id="te-eic-section" style="margin-top:10px;"></div>
        </div>`;

    case 'cdcc':
      return nav + `
        <div class="te-sec-hdr"><h2>Child &amp; Dependent Care Credit (Form 2441)</h2>
        <p class="te-sec-sub"><span class="te-cite">IRC §21 &mdash; 1040 Line 20 via Sch. 3</span></p></div>
        <div class="te-subsec"><div id="te-cdcc-section" style="margin-top:10px;"></div></div>`;

    case 'savers':
      return nav + `
        <div class="te-sec-hdr"><h2>Retirement Savings Credit (Form 8880)</h2>
        <p class="te-sec-sub"><span class="te-cite">IRC §25B &mdash; 1040 Line 20 via Sch. 3</span></p></div>
        <div class="te-subsec"><div id="te-savers-section" style="margin-top:10px;"></div></div>`;

    case 'energy':
      return nav + `
        <div class="te-sec-hdr"><h2>Energy-Efficient Home Credit (Form 5695)</h2>
        <p class="te-sec-sub"><span class="te-cite">IRC §25C &mdash; 1040 Line 20 via Sch. 3</span></p></div>
        <div class="te-subsec"><div id="te-energy-section" style="margin-top:10px;"></div></div>`;

    // ── PAYMENTS ──────────────────────────────────────────────────
    case 'est-payments':
      return nav + `
        <div class="te-sec-hdr"><h2>Estimated Tax Payments (Form 1040-ES)</h2>
        <p class="te-sec-sub"><span class="te-cite">IRC §6654 &mdash; 1040 Line 26</span></p></div>
        <div class="te-subsec">${teRenderEstimatedPayments()}</div>`;

    default:
      return nav + `<div class="te-empty">Unknown schedule: ${esc(schedId)}</div>`;
  }
}

// ── POST-RENDER LIST CALLS FOR MINI-SCREENS ───────────────────────────
function teMiniPostRender(schedId) {
  switch (schedId) {
    case 'w2':         teRenderW2List();              break;
    case 'sched-c':    teRenderSchedCOtherExpRows();  break;  // re-render Part V rows after screen loads
    case 'sched-1': teRenderS1OtherIncomeRows(); teRenderS1PiiOtherAdjRows(); break;  // re-render 8z and 24z dynamic rows after screen loads
    case 'sched-a':
    case 'salt':
    case 'mortgage':
    case 'charitable':
    case 'medical':
      teRenderSAOtherTaxRows(); teRenderSACasualtyRows(); teRenderSAOtherDedRows(); break;
    case 'sched-d':    /* rows rendered inline on initial render — no post-render needed */ break;
    case 'sched-se':   /* all lines computed on render — no list post-render needed */ break;
    case 'retirement': teRender1099RList('ira'); teRender1099RList('pension'); break;
    case 'sched-e':    teRenderScheduleEList();        break;
    case 'ctc':        teRenderCTCDetail();            break;
    case 'edu':        teRenderEduList();              break;
    case 'eic':        teRenderEICSection();           break;
    case 'cdcc':       teRenderCDCCSection();          break;
    case 'savers':     teRenderSaversSection();        break;
    case 'energy':     teRenderEnergySection();        break;
  }
}

// ── DEDUCTION MINI-SCREEN CONTENT ─────────────────────────────────────
// Renders a single, focused deduction section (always expanded, with total bar).
// IDs match the same IDs used in teRenderDeductions() so teOnScheduleA() / teOnAgiAdj() work identically.
function teRenderMiniDeductionSection(secKey) {
  let r    = teCurrentReturn;
  let fs   = r.filingStatus || 'single';
  let yr   = r.taxYear || teActiveYear;
  let K    = TAX_CONSTANTS[yr];
  if (!K) return '<div class="te-empty">Tax constants not available for ' + yr + '.</div>';
  let a    = r.agiAdjustments || {};
  let sa   = r.scheduleA      || {};
  let calc = r._calc          || {};
  let isMFS = (fs === 'mfs');
  let isMFJ = (fs === 'mfj');

  // ── IRS line-layout row helpers (same system as Schedule SE / Schedule A) ──
  let cRow = (num, label, id, val) =>
    `<div class="te-se-row">
       <span class="te-se-num">${num}</span>
       <span class="te-se-lbl">${label}</span>
       <span class="te-se-val"${id ? ` id="${id}"` : ''}>${teFmt(val)}</span>
     </div>`;
  let iRow = (num, label, id, val, handler = 'teOnAgiAdj()') =>
    `<div class="te-se-row">
       <span class="te-se-num">${num}</span>
       <span class="te-se-lbl">${label}</span>
       <input type="number" id="${id}" class="te-input te-mono te-se-inp"
         value="${esc(String(val || ''))}" placeholder="0.00" step="0.01" min="0"
         oninput="${handler}">
     </div>`;
  let cbRow = (id, label, checked, handler = 'teOnAgiAdj()', cite = '') =>
    `<div class="te-se-row">
       <span class="te-se-num"></span>
       <span class="te-se-lbl" style="font-weight:normal;">
         <label style="display:flex;align-items:center;gap:7px;cursor:pointer;">
           <input type="checkbox" id="${id}" ${checked ? 'checked' : ''} onchange="${handler}">
           ${label}${cite ? ' <span class="te-cite">' + cite + '</span>' : ''}
         </label>
       </span>
     </div>`;
  let annot = text =>
    `<div class="te-ded-note" style="margin:2px 0 8px 2.8rem;font-size:0.82rem;">${text}</div>`;
  let wrap = (title, sub, body) =>
    `<div class="te-sch-se">
       <div class="te-se-header-bar">
         <div class="te-se-title">${title}</div>
         <div class="te-se-subtitle">${sub}</div>
       </div>
       ${body}
     </div>`;

  switch (secKey) {

    case 'sli': {
      let sliPo  = isMFJ ? K.studentLoanInterest.phaseout.mfj : K.studentLoanInterest.phaseout.single;
      let sliAmt = calc.sliDeduction || 0;
      let body   = isMFS
        ? `<div class="te-ded-note" style="margin:8px 0 0 2.8rem;">Not available for Married Filing Separately. <span class="te-cite">IRC §221(b)(2)(B)</span></div>`
        : iRow('1', `Interest paid in ${yr}`, 'te-adj-sli', a.studentLoanInterest)
          + annot(`Maximum $2,500. Phase-out: ${teFmt(sliPo.floor)}–${teFmt(sliPo.ceiling)} MAGI. <span class="te-cite">IRC §221(b)(1),(b)(2)</span>`)
          + cRow('2', 'Allowable deduction', 'te-mini-total-val', sliAmt);
      return wrap('Student Loan Interest Deduction', 'IRC §221 — Sch. 1 Line 21', body);
    }

    case 'hsa': {
      let hsaAmt    = calc.hsaDeduction || 0;
      let selectRow = `<div class="te-se-row">
        <span class="te-se-num">A</span>
        <span class="te-se-lbl">Coverage type</span>
        <select id="te-adj-hsa-type" class="te-select te-se-inp" onchange="teOnAgiAdj()">
          <option value="self"   ${a.hsaCoverageType!=='family'?'selected':''}>Self-Only (${teFmt(K.hsa.limitSelf)} limit)</option>
          <option value="family" ${a.hsaCoverageType==='family'?'selected':''}>Family (${teFmt(K.hsa.limitFamily)} limit)</option>
        </select>
      </div>`;
      let body = selectRow
        + iRow('B', `Contributions made in ${yr}`, 'te-adj-hsa-contrib', a.hsaContributions)
        + cbRow('te-adj-hsa-55', 'Age 55+ catch-up (+$1,000)', a.hsaTaxpayerAge55, 'teOnAgiAdj()', 'IRC §223(b)(3)(B)')
        + annot('No income phase-out. Requires qualifying HDHP. Taxpayer certifies eligibility. <span class="te-cite">IRC §223(b)(1)</span>')
        + cRow('C', 'Allowable deduction', 'te-mini-total-val', hsaAmt);
      return wrap('HSA Deduction (Form 8889)', 'IRC §223 — Sch. 1 Line 13', body);
    }

    case 'ira-ded': {
      let iraAmt   = calc.iraDeduction || 0;
      let iraLimit = teFmt(K.ira.limit + (a.iraAge50Plus ? K.ira.catchUp : 0));
      let body = iRow('1', `IRA contributions in ${yr}`, 'te-adj-ira-contrib', a.iraContributions)
        + cbRow('te-adj-ira-50', 'Age 50+ catch-up (+$1,000)', a.iraAge50Plus, 'teOnAgiAdj()', 'IRC §219(b)(5)(B)')
        + cbRow('te-adj-ira-active', 'Covered by employer retirement plan', a.iraActiveParticipant, 'teOnAgiAdj()', 'IRC §219(g)(2)')
        + (isMFJ ? cbRow('te-adj-ira-spouse-active', 'Spouse covered by employer plan', a.iraSpouseActive, 'teOnAgiAdj()', 'IRC §219(g)(7)') : '')
        + annot(`Contribution limit: ${iraLimit}. Deductibility phases out when covered by an employer plan. <span class="te-cite">IRC §219(g)</span>`)
        + cRow('2', 'Allowable deduction', 'te-mini-total-val', iraAmt);
      return wrap('Traditional IRA Deduction', 'IRC §219 — Sch. 1 Line 20', body);
    }

    case 'alimony': {
      let alAmt = calc.alimonyDeduction || 0;
      let al    = r.alimony || {};
      let note  = !al.preAgreement
        ? `<div class="te-ded-note" style="margin:2px 0 8px 2.8rem;font-size:0.82rem;color:var(--te-warn,#f59e0b);">Post-2018 agreements: alimony paid is NOT deductible under TCJA. <span class="te-cite">IRC §215(b)(2)</span></div>`
        : annot('Pre-2019 agreements: full amount paid is deductible. Recipient must include in gross income. <span class="te-cite">IRC §215(a), §71</span>');
      let body = iRow('1', `Alimony paid in ${yr}`, 'te-al-paid', al.paid, 'teOnAlimony()')
        + cbRow('te-al-pre', 'Divorce/separation agreement executed before Jan 1, 2019', al.preAgreement, 'teOnAlimony()', 'TCJA §11051')
        + note
        + cRow('2', 'Allowable deduction', 'te-mini-total-val', alAmt);
      return wrap('Alimony Paid', 'IRC §215 — Sch. 1 Line 19a', body);
    }

    case 'salt': {
      let saltAmt   = calc.saltDeduction || 0;
      let saltCap   = (fs === 'mfs') ? K.scheduleA.salt.mfsCap : K.scheduleA.salt.cap;
      let saltThres = (fs === 'mfs') ? K.scheduleA.salt.mfsPhaseoutThreshold : K.scheduleA.salt.phaseoutThreshold;
      return `
        <div class="te-sec-hdr"><h2>Schedule A — State &amp; Local Taxes (SALT)</h2>
        <p class="te-sec-sub"><span class="te-cite">IRC §164 &mdash; Sch. A Line 5</span></p></div>
        <div class="te-subsec">
          <div class="te-frow" style="align-items:flex-end;gap:12px;flex-wrap:wrap;">
            <div class="te-field-group" style="max-width:175px;">
              <label class="te-lbl">State Income Tax Paid</label>
              <input type="number" id="te-sa-sit" class="te-input te-mono" value="${esc(String(sa.stateIncomeTax||''))}" placeholder="0.00" step="0.01" min="0" oninput="teOnScheduleA()">
            </div>
            <div class="te-field-group" style="max-width:175px;">
              <label class="te-lbl">Local Income Tax Paid</label>
              <input type="number" id="te-sa-lit" class="te-input te-mono" value="${esc(String(sa.localIncomeTax||''))}" placeholder="0.00" step="0.01" min="0" oninput="teOnScheduleA()">
            </div>
            <div class="te-field-group" style="max-width:175px;">
              <label class="te-lbl">Real Estate Tax</label>
              <input type="number" id="te-sa-ret" class="te-input te-mono" value="${esc(String(sa.realEstateTax||''))}" placeholder="0.00" step="0.01" min="0" oninput="teOnScheduleA()">
            </div>
            <div class="te-field-group" style="max-width:175px;">
              <label class="te-lbl">Personal Property Tax (ad valorem only)</label>
              <input type="number" id="te-sa-ppt" class="te-input te-mono" value="${esc(String(sa.personalPropertyTax||''))}" placeholder="0.00" step="0.01" min="0" oninput="teOnScheduleA()">
            </div>
          </div>
          <div class="te-ded-note">Cap: ${teFmt(saltCap)} (${yr}). Phase-down: 30% of MAGI over ${teFmt(saltThres)}; floor $10,000. <span class="te-cite">OBBBA P.L. 119-21</span></div>
          <div class="te-ded-note" style="margin-top:4px;">Personal property tax: ad valorem (value-based) portion only. Flat fees or per-unit charges do not qualify. <span class="te-cite">IRC §164(a)(2)</span></div>
          <div class="te-total-bar" style="margin-top:14px;">
            <span>Allowable SALT Deduction <span class="te-cite">IRC §164</span></span>
            <span class="te-total-val" id="te-mini-total-val">${teFmt(saltAmt)}</span>
          </div>
        </div>`;
    }

    case 'mortgage': {
      let miAmt = calc.mortgageDeduction || 0;
      return `
        <div class="te-sec-hdr"><h2>Schedule A — Mortgage Interest</h2>
        <p class="te-sec-sub"><span class="te-cite">IRC §163(h) &mdash; Sch. A Line 8</span></p></div>
        <div class="te-subsec">
          <div class="te-frow" style="align-items:flex-end;gap:12px;flex-wrap:wrap;">
            <div class="te-field-group" style="max-width:185px;">
              <label class="te-lbl">Interest Paid (Form 1098)</label>
              <input type="number" id="te-sa-mi" class="te-input te-mono" value="${esc(String(sa.mortgageInterest||''))}" placeholder="0.00" step="0.01" min="0" oninput="teOnScheduleA()">
            </div>
            <div class="te-field-group" style="max-width:185px;">
              <label class="te-lbl">Outstanding Balance</label>
              <input type="number" id="te-sa-mb" class="te-input te-mono" value="${esc(String(sa.mortgageBalance||''))}" placeholder="0.00" step="1" min="0" oninput="teOnScheduleA()">
            </div>
            <div class="te-field-group" style="max-width:185px;">
              <label class="te-lbl">Loan Date</label>
              <select id="te-sa-mld" class="te-select" onchange="teOnScheduleA()">
                <option value="post2017" ${sa.mortgageLoanDate!=='pre2018'?'selected':''}>Post-12/15/2017 ($750K limit)</option>
                <option value="pre2018"  ${sa.mortgageLoanDate==='pre2018'?'selected':''}>Pre-12/16/2017 ($1M limit)</option>
              </select>
            </div>
            <div class="te-field-group" style="max-width:230px;">
              <label class="te-lbl">Debt Purpose <span class="te-cite">IRC §163(h)(3)(C)</span></label>
              <select id="te-sa-mp" class="te-select" onchange="teOnScheduleA()">
                <option value="acquisition"          ${sa.mortgagePurpose!=='home_equity_personal'?'selected':''}>Acquisition / Improvement</option>
                <option value="home_equity_personal" ${sa.mortgagePurpose==='home_equity_personal'?'selected':''}>Home Equity — Personal Use</option>
              </select>
            </div>
          </div>
          ${sa.mortgagePurpose === 'home_equity_personal'
            ? '<div class="te-ded-note" style="margin-top:4px;color:var(--te-warn,#f59e0b);">Home equity interest used for personal purposes is not deductible under TCJA. <span class="te-cite">IRC §163(h)(3)(C)</span></div>'
            : '<div class="te-ded-note">If balance exceeds debt limit, deductible interest is prorated: interest × (limit ÷ balance). <span class="te-cite">IRC §163(h)(3)(F)</span></div>'}
          <div class="te-total-bar" style="margin-top:14px;">
            <span>Allowable Mortgage Interest Deduction <span class="te-cite">IRC §163(h)</span></span>
            <span class="te-total-val" id="te-mini-total-val">${teFmt(miAmt)}</span>
          </div>
        </div>`;
    }

    case 'charitable': {
      let charAmt = calc.charitableDeduction || 0;
      return `
        <div class="te-sec-hdr"><h2>Schedule A — Charitable Contributions</h2>
        <p class="te-sec-sub"><span class="te-cite">IRC §170 &mdash; Sch. A Lines 11–12</span></p></div>
        <div class="te-subsec">
          <div class="te-frow" style="align-items:flex-end;gap:12px;flex-wrap:wrap;">
            <div class="te-field-group" style="max-width:200px;">
              <label class="te-lbl">Cash Contributions</label>
              <input type="number" id="te-sa-cc" class="te-input te-mono" value="${esc(String(sa.cashCharitable||''))}" placeholder="0.00" step="0.01" min="0" oninput="teOnScheduleA()">
            </div>
            <div class="te-field-group" style="max-width:200px;">
              <label class="te-lbl">Non-Cash Contributions</label>
              <input type="number" id="te-sa-nc" class="te-input te-mono" value="${esc(String(sa.nonCashCharitable||''))}" placeholder="0.00" step="0.01" min="0" oninput="teOnScheduleA()">
            </div>
          </div>
          <div class="te-ded-note">Cash: limited to 60% of AGI. Non-cash: 50% of AGI. Combined cannot exceed 60% of AGI. <span class="te-cite">IRC §170(b)(1)(G),(A)</span></div>
          <div class="te-total-bar" style="margin-top:14px;">
            <span>Allowable Charitable Deduction <span class="te-cite">IRC §170</span></span>
            <span class="te-total-val" id="te-mini-total-val">${teFmt(charAmt)}</span>
          </div>
        </div>`;
    }

    case 'medical': {
      let medAmt   = calc.medicalDeduction || 0;
      let agiFloor = Math.round((calc.agi || 0) * 0.075);
      return `
        <div class="te-sec-hdr"><h2>Schedule A — Medical &amp; Dental Expenses</h2>
        <p class="te-sec-sub"><span class="te-cite">IRC §213 &mdash; Sch. A Line 4</span></p></div>
        <div class="te-subsec">
          <div class="te-frow" style="align-items:flex-end;gap:12px;">
            <div class="te-field-group" style="max-width:200px;">
              <label class="te-lbl">Unreimbursed Medical Expenses</label>
              <input type="number" id="te-sa-med" class="te-input te-mono" value="${esc(String(sa.medicalExpenses||''))}" placeholder="0.00" step="0.01" min="0" oninput="teOnScheduleA()">
            </div>
            <div class="te-ded-note" style="flex:1;padding-bottom:0;">Deductible amount = expenses exceeding 7.5% of AGI. Current 7.5% floor: ${teFmt(agiFloor)}. <span class="te-cite">IRC §213(a)</span></div>
          </div>
          <div class="te-ded-note" style="margin-top:4px;">Enter unreimbursed amounts only. Do not include expenses covered by insurance, HSA distributions, employer HRA, or any third-party reimbursement. <span class="te-cite">IRC §213(a)</span></div>
          <div class="te-total-bar" style="margin-top:14px;">
            <span>Allowable Medical Deduction <span class="te-cite">IRC §213</span></span>
            <span class="te-total-val" id="te-mini-total-val">${teFmt(medAmt)}</span>
          </div>
        </div>`;
    }

    default:
      return `<div class="te-empty">Unknown deduction section: ${esc(secKey)}</div>`;
  }
}

function teRenderDashboard1040() {
  let c  = teCurrentReturn._calc || {};
  let r  = teCurrentReturn;
  let s1 = r.schedule1099 || {};

  // ── Display helpers ────────────────────────────────────────────────
  // fv: positive value or dash
  function fv(n)   { return (n || 0) !== 0 ? teFmt(Math.abs(n)) : '—'; }
  // fvNeg: shown in parentheses (deductions, credits)
  function fvNeg(n){ return (n || 0) !== 0 ? '(' + teFmt(Math.abs(n)) + ')' : '—'; }
  // fvPM: gain positive, loss in parens, zero = dash
  function fvPM(n) {
    if (!n || n === 0) return '—';
    return n < 0 ? '(' + teFmt(Math.abs(n)) + ')' : teFmt(n);
  }

  function badge(schedId, label) {
    let st  = teGetScheduleStatus(schedId);
    let cls = st === 'entered' ? 'te-dash-badge te-dash-badge-on' : 'te-dash-badge te-dash-badge-off';
    return `<span class="${cls}" onclick="teOpenSchedule('${esc(schedId)}')">${esc(label)}</span>`;
  }

  // Regular line: line# | label + optional badges | amount
  function line(num, label, amt, opts) {
    opts = opts || {};
    let cls  = 'te-dash-line' + (opts.indent ? ' te-dash-indent' : '') + (opts.sub ? ' te-dash-sub' : '');
    let bdgs = opts.badges ? ' ' + opts.badges : '';
    return `<div class="${cls}">
      <span class="te-dash-num">${num}</span>
      <span class="te-dash-lbl">${label}${bdgs}</span>
      <span class="te-dash-amt">${amt}</span>
    </div>`;
  }

  // Bold total line
  function tot(num, label, amt, opts) {
    opts = opts || {};
    let extra = opts.refund ? ' te-dash-refund' : opts.due ? ' te-dash-due' : '';
    return `<div class="te-dash-line te-dash-total${extra}">
      <span class="te-dash-num">${num}</span>
      <span class="te-dash-lbl">${label}</span>
      <span class="te-dash-amt">${amt}</span>
    </div>`;
  }

  // Section divider — uses the actual Form 1040 section labels
  function sec(label) {
    return `<div class="te-dash-sec-break"><span class="te-dash-sec-lbl">${label}</span></div>`;
  }

  // ── Derived values ─────────────────────────────────────────────────

  // 1040 Line 8 = Schedule 1, Part I, Line 10 — full additional income total
  let sched1PartI  = (c.sched1Lines && c.sched1Lines.l10 !== undefined)
    ? c.sched1Lines.l10
    : teRound((c.netSEIncome || 0) + (c.scheduleENet || 0));  // fallback for pre-calc state

  // 1040 Line 10 = Schedule 1, Part II total (all above-the-line adjustments)
  let sched1PartII = c.adjustments || 0;

  // 1040 Line 14 = 12e + 13a (total deductions reducing taxable income)
  let line14       = teRound((c.deductionUsed || 0) + (c.qbiDeduction || 0));

  // Schedule 2, Line 3 → 1040 Line 17 (AMT + other additions from Schedule 2 Part I)
  // In this engine: only AMT; additions to tax (1a-1z) not yet implemented.
  let sched2line3  = c.amt || 0;

  // Schedule 3, Line 8 → 1040 Line 20 (non-refundable credits other than CTC)
  // CDCC (§21) + Saver's (§25B) + Energy (§25C/§30D) flow through Sch 3 → 1040 Line 20
  let sched3line8  = teRound((c.cdccCredit || 0) + (c.saversCredit || 0) + (c.energyCredit || 0));

  // 1040 Line 21 = Line 19 + Line 20 (total non-refundable credits)
  let line21       = teRound((c.ctcNonRefundable || 0) + sched3line8);

  // 1040 Line 22 = Line 18 − Line 21 (tax after all non-refundable credits)
  let line22       = teRound(Math.max(0, (c.taxBeforeCredits || 0) - line21));

  // Schedule 2, Line 21 → 1040 Line 23 (other taxes: SE + NIIT + Addl Medicare + §72(t))
  let sched2line21 = teRound((c.seTax || 0) + (c.niit || 0) + (c.addlMedicareTax || 0) + (c.earlyWithdrawalPenalty || 0));

  // 1040 Line 25d = total withholding (our engine: W-2 only; 1099 withholding not yet tracked)
  let line25d      = c.w2Withholding || 0;

  // 1040 Line 32 = total other payments & refundable credits (EIC + ACTC + AOC)
  let line32       = c.totalRefundableCredits || 0;

  // 1040 Line 34 = overpayment (Line 33 > Line 24); Line 35a = amount refunded to taxpayer
  // Engine: calc.refund = max(0, totalPayments − totalTax) which equals Line 34/35a combined
  let line34       = c.refund     || 0;
  let line37       = c.balanceDue || 0;

  // Deduction type label for Line 12e
  let isItemized   = (c.itemizedTotal || 0) > (c.stdDed || 0);

  return `
    <div class="te-sec-hdr">
      <h2>Form 1040 &mdash; U.S. Individual Income Tax Return</h2>
      <p class="te-sec-sub">Tax Year ${esc(String(r.taxYear || teActiveYear))} &mdash; Read-only summary. Click any badge to jump to that schedule.</p>
    </div>

    <div class="te-dash-1040">

      ${sec('Income')}

      ${line('1a',  'Wages, salaries, tips (W-2, Box 1)',            fv(c.w2Wages),            { badges: badge('w2', 'W-2') })}
      ${line('2a',  'Tax-exempt interest',                           fv(parseFloat(s1.taxExemptInterest) || 0), { sub: true })}
      ${line('2b',  'Taxable interest',                              fv(c.interestIncome),     { badges: badge('1099-int', '1099-INT') })}
      ${line('3a',  'Qualified dividends',                           fv(c.qualifiedDividends), { sub: true })}
      ${line('3b',  'Ordinary dividends',                            fv(c.ordinaryDividends),  { badges: badge('1099-div', '1099-DIV') })}
      ${line('4a',  'IRA distributions &mdash; gross',               fv(c.iraGross),           { badges: badge('ira', '1099-R IRA') })}
      ${line('4b',  '— taxable amount',                              fv(c.iraTaxable),         { indent: true, sub: true })}
      ${line('5a',  'Pensions &amp; annuities &mdash; gross',        fv(c.pensionGross),       { badges: badge('pension', '1099-R Pen.') })}
      ${line('5b',  '— taxable amount',                              fv(c.pensionTaxable),     { indent: true, sub: true })}
      ${line('6a',  'Social security benefits &mdash; gross',        fv(c.ssBenefitsGross),    { badges: badge('ss', 'SSA-1099') })}
      ${line('6b',  '— taxable amount &nbsp;<span class="te-cite">IRC §86</span>', fv(c.ssBenefitsTaxable), { indent: true, sub: true })}
      ${line('7a',  'Capital gain or (loss) &nbsp;<span class="te-cite">Sch. D, line 16 or 21</span>', fvPM(c.scheduleDNet), { badges: badge('sched-d', 'Sch. D') })}
      ${line('8',   'Additional income &nbsp;<span class="te-cite">Sch. 1, line 10</span>',            fvPM(sched1PartI),    { badges: badge('sched-1', 'Sch. 1') })}

      ${tot('9', 'Total income &nbsp;<span class="te-cite">add lines 1z, 2b, 3b, 4b, 5b, 6b, 7a, 8</span>', fv(c.grossIncome))}

      ${line('10',  'Adjustments to income &nbsp;<span class="te-cite">Sch. 1, line 26</span>',
          sched1PartII > 0 ? fvNeg(sched1PartII) : '—',
          { badges: badge('sched-1', 'Sch. 1') })}

      ${tot('11a', 'Adjusted Gross Income', fv(c.agi))}

      ${sec('Tax and Credits')}

      ${line('11b', 'Adjusted gross income (from line 11a)',         fv(c.agi),                { sub: true })}
      ${line('12e', isItemized ? 'Itemized deductions &nbsp;<span class="te-cite">Sch. A, line 17</span>'
                               : 'Standard deduction &nbsp;<span class="te-cite">IRC §63(c)</span>',
          (c.deductionUsed || 0) > 0 ? fvNeg(c.deductionUsed) : '—',
          { badges: isItemized ? badge('deductions', 'Sch. A') : '' })}
      ${line('13a', 'Qualified business income deduction &nbsp;<span class="te-cite">§199A / Form 8995</span>',
          (c.qbiDeduction || 0) > 0 ? fvNeg(c.qbiDeduction) : '—', {})}
      ${tot('14', 'Total deductions &nbsp;<span class="te-cite">add lines 12e + 13a</span>',
          line14 > 0 ? fvNeg(line14) : '—')}
      ${tot('15', 'Taxable income &nbsp;<span class="te-cite">line 11b − line 14</span>', fv(c.taxableIncome))}

      ${line('16',  'Tax &nbsp;<span class="te-cite">IRC §1 brackets</span>',                  fv(c.regularTax),   {})}
      ${line('17',  'Schedule 2, line 3 &nbsp;<span class="te-cite">AMT / Form 6251</span>',   sched2line3 > 0 ? fv(sched2line3) : '—', {})}
      ${tot('18',   'Add lines 16 and 17',                                                     fv(c.taxBeforeCredits))}

      ${line('19',  'Child tax credit / credit for other dependents &nbsp;<span class="te-cite">Sch. 8812</span>',
          (c.ctcNonRefundable || 0) > 0 ? fvNeg(c.ctcNonRefundable) : '—',
          { badges: badge('credits', 'Credits') })}
      ${line('20',  'Schedule 3, line 8 &nbsp;<span class="te-cite">other non-refundable credits</span>',
          sched3line8 > 0 ? fvNeg(sched3line8) : '—', {})}
      ${sched3line8 > 0 ? `
        ${(c.cdccCredit   || 0) > 0 ? line('',   '— Child &amp; Dependent Care §21',         fvNeg(c.cdccCredit),   { indent: true, sub: true }) : ''}
        ${(c.saversCredit || 0) > 0 ? line('',   "— Saver's Credit §25B",                    fvNeg(c.saversCredit), { indent: true, sub: true }) : ''}
        ${(c.energyCredit || 0) > 0 ? line('',   '— Energy Credit §25C / §30D',              fvNeg(c.energyCredit), { indent: true, sub: true }) : ''}
      ` : ''}
      ${tot('21',  'Add lines 19 and 20 (total non-refundable credits)',                       line21 > 0 ? fvNeg(line21) : '—')}
      ${tot('22',  'Subtract line 21 from line 18',                                            fv(line22))}

      ${line('23',  'Other taxes &nbsp;<span class="te-cite">Sch. 2, line 21</span>',          sched2line21 > 0 ? fv(sched2line21) : '—', {})}
      ${sched2line21 > 0 ? `
        ${(c.seTax                || 0) > 0 ? line('', '— Self-employment tax §1401',             fv(c.seTax),                  { indent: true, sub: true }) : ''}
        ${(c.addlMedicareTax      || 0) > 0 ? line('', '— Additional Medicare Tax §3101(b)(2)',   fv(c.addlMedicareTax),        { indent: true, sub: true }) : ''}
        ${(c.niit                 || 0) > 0 ? line('', '— Net Investment Income Tax §1411',       fv(c.niit),                   { indent: true, sub: true }) : ''}
        ${(c.earlyWithdrawalPenalty||0) > 0 ? line('', '— Early withdrawal penalty §72(t)',       fv(c.earlyWithdrawalPenalty), { indent: true, sub: true }) : ''}
      ` : ''}

      ${tot('24', 'Total Tax &nbsp;<span class="te-cite">add lines 22 and 23</span>', fv(c.totalTax))}

      ${sec('Payments and Refundable Credits')}

      ${line('25a', 'Federal income tax withheld — Form(s) W-2',     fv(line25d),          { badges: badge('w2', 'W-2') })}
      ${line('25d', 'Add lines 25a–25c (total withholding)',          fv(line25d),          { sub: true })}
      ${line('26',  'Estimated tax payments &nbsp;<span class="te-cite">§6654</span>',
          (c.estPayments || 0) > 0 ? fv(c.estPayments) : '—',
          { badges: badge('payments', 'Est. Pmts') })}
      ${line('27a', 'Earned Income Credit (EIC) &nbsp;<span class="te-cite">§32</span>',
          (c.eicCredit || 0) > 0 ? fv(c.eicCredit) : '—',
          { badges: badge('credits', 'Credits') })}
      ${line('28',  'Additional Child Tax Credit &nbsp;<span class="te-cite">§24(d) / Sch. 8812</span>',
          (c.actcRefundable || 0) > 0 ? fv(c.actcRefundable) : '—', {})}
      ${line('29',  'American opportunity credit &nbsp;<span class="te-cite">§25A / Form 8863, line 8</span>',
          (c.aocRefundable || 0) > 0 ? fv(c.aocRefundable) : '—', {})}
      ${tot('32',   'Total other payments &amp; refundable credits &nbsp;<span class="te-cite">add 27a–31</span>',
          line32 > 0 ? fv(line32) : '—')}
      ${tot('33',   'Total payments &nbsp;<span class="te-cite">add lines 25d + 26 + 32</span>', fv(c.totalPayments))}

      ${sec('Refund / Amount You Owe')}

      ${line34 > 0
        ? tot('34',  'Overpayment &nbsp;<span class="te-cite">line 33 minus line 24</span>', teFmt(line34))
        : ''}
      ${line34 > 0
        ? tot('35a', 'Amount refunded to you',   teFmt(line34), { refund: true })
        : line37 > 0
          ? tot('37',  'Amount you owe',          teFmt(line37), { due: true })
          : tot('—',   'Enter return data to calculate', '—')}

    </div><!-- /.te-dash-1040 -->
  `;
}


// ──────────────────────────────────────────────────────────────────────
//  SECTION NAVIGATION
// ──────────────────────────────────────────────────────────────────────



// ──────────────────────────────────────────────────────────────────────
//  PERSONAL SECTION
// ──────────────────────────────────────────────────────────────────────

function teRenderPersonal() {
  let r  = teCurrentReturn;
  let fs = r.filingStatus || 'single';
  let tp = r.taxpayer || {};
  let sp = r.spouse   || {};
  let ad = r.address  || {};
  let showSpouse = (fs === 'mfj' || fs === 'mfs');

  // Helper: checkbox cell for dependent table
  function chk(id, checked, onchange, label) {
    return `<div class="te-pers-chk-cell">
      <input type="checkbox" id="${id}" ${checked?'checked':''} onchange="${onchange}">
      <label for="${id}" class="te-pers-chk-lbl">${label}</label>
    </div>`;
  }

  return `
    <div class="te-sec-hdr">
      <h2>Personal Information</h2>
      <p class="te-sec-sub">Taxpayer identification, address, and dependents &mdash; <span class="te-cite">IRC §2, §7703, §152 &mdash; Form 1040, Page 1</span></p>
    </div>

    <!-- ── Filing Status ── -->
    <div class="te-pers-block">
      <div class="te-pers-block-lbl">Filing Status <span class="te-cite">IRC §2</span></div>
      <div style="max-width:340px;">
        <select id="te-fs" class="te-select" onchange="teOnFSChange(this.value)">
          <option value="single" ${fs==='single'?'selected':''}>Single</option>
          <option value="mfj"    ${fs==='mfj'   ?'selected':''}>Married Filing Jointly (MFJ)</option>
          <option value="mfs"    ${fs==='mfs'   ?'selected':''}>Married Filing Separately (MFS)</option>
          <option value="hoh"    ${fs==='hoh'   ?'selected':''}>Head of Household (HOH)</option>
          <option value="qss"    ${fs==='qss'   ?'selected':''}>Qualifying Surviving Spouse (QSS)</option>
        </select>
      </div>
      <div class="te-pers-chk-cell" style="margin-top:10px;">
        <input type="checkbox" id="te-can-be-claimed" ${r.canBeClaimed?'checked':''} onchange="teOnField()">
        <label for="te-can-be-claimed" class="te-pers-chk-lbl">
          Someone can claim me as a dependent on their return
          <span class="te-cite">IRC §63(c)(5) — limits standard deduction</span>
        </label>
      </div>
    </div>

    <!-- ── Taxpayer ── -->
    <div class="te-pers-block">
      <div class="te-pers-block-lbl">Taxpayer</div>
      <div class="te-pers-name-row">
        <div class="te-field-group">
          <label class="te-lbl">First Name</label>
          <input type="text" id="te-tp-fn" class="te-input" value="${esc(tp.firstName||'')}" oninput="teOnField()">
        </div>
        <div class="te-field-group" style="flex:0 0 52px;min-width:0;">
          <label class="te-lbl">M.I.</label>
          <input type="text" id="te-tp-mi" class="te-input" value="${esc(tp.middleInitial||'')}" maxlength="1" oninput="teOnField()">
        </div>
        <div class="te-field-group">
          <label class="te-lbl">Last Name</label>
          <input type="text" id="te-tp-ln" class="te-input" value="${esc(tp.lastName||'')}" oninput="teOnField()">
        </div>
        <div class="te-field-group" style="flex:0 0 140px;min-width:0;">
          <label class="te-lbl">Social Security Number</label>
          <input type="text" id="te-tp-ssn" class="te-input" value="${esc(tp.ssn||'')}" maxlength="11" placeholder="XXX-XX-XXXX" oninput="teOnField()">
        </div>
        <div class="te-field-group" style="flex:0 0 140px;min-width:0;">
          <label class="te-lbl">Date of Birth <span class="te-cite" style="font-weight:400;">(engine)</span></label>
          <input type="date" lang="en-GB" id="te-tp-dob" class="te-input" value="${esc(tp.dob||'')}" onchange="teOnField()">
        </div>
        <div class="te-field-group" style="flex:0 0 auto;min-width:0;justify-content:flex-end;">
          <label class="te-lbl">&nbsp;</label>
          <div class="te-pers-chk-cell" style="margin-top:6px;">
            <input type="checkbox" id="te-tp-blind" ${tp.blind?'checked':''} onchange="teOnField()">
            <label for="te-tp-blind" class="te-pers-chk-lbl">Blind <span class="te-cite">IRC §63(f)</span></label>
          </div>
        </div>
      </div>
    </div>

    <!-- ── Spouse ── -->
    <div id="te-spouse-sec" class="te-pers-block" style="display:${showSpouse?'block':'none'};">
      <div class="te-pers-block-lbl">Spouse</div>
      <div class="te-pers-name-row">
        <div class="te-field-group">
          <label class="te-lbl">First Name</label>
          <input type="text" id="te-sp-fn" class="te-input" value="${esc(sp.firstName||'')}" oninput="teOnField()">
        </div>
        <div class="te-field-group" style="flex:0 0 52px;min-width:0;">
          <label class="te-lbl">M.I.</label>
          <input type="text" id="te-sp-mi" class="te-input" value="${esc(sp.middleInitial||'')}" maxlength="1" oninput="teOnField()">
        </div>
        <div class="te-field-group">
          <label class="te-lbl">Last Name</label>
          <input type="text" id="te-sp-ln" class="te-input" value="${esc(sp.lastName||'')}" oninput="teOnField()">
        </div>
        <div class="te-field-group" style="flex:0 0 140px;min-width:0;">
          <label class="te-lbl">Social Security Number</label>
          <input type="text" id="te-sp-ssn" class="te-input" value="${esc(sp.ssn||'')}" maxlength="11" placeholder="XXX-XX-XXXX" oninput="teOnField()">
        </div>
        <div class="te-field-group" style="flex:0 0 140px;min-width:0;">
          <label class="te-lbl">Date of Birth <span class="te-cite" style="font-weight:400;">(engine)</span></label>
          <input type="date" lang="en-GB" id="te-sp-dob" class="te-input" value="${esc(sp.dob||'')}" onchange="teOnField()">
        </div>
        <div class="te-field-group" style="flex:0 0 auto;min-width:0;justify-content:flex-end;">
          <label class="te-lbl">&nbsp;</label>
          <div class="te-pers-chk-cell" style="margin-top:6px;">
            <input type="checkbox" id="te-sp-blind" ${sp.blind?'checked':''} onchange="teOnField()">
            <label for="te-sp-blind" class="te-pers-chk-lbl">Blind <span class="te-cite">IRC §63(f)</span></label>
          </div>
        </div>
      </div>
    </div>

    <!-- ── Home Address ── -->
    <div class="te-pers-block">
      <div class="te-pers-block-lbl">Home Address</div>
      <div class="te-frow" style="margin-bottom:8px;">
        <div class="te-field-group">
          <label class="te-lbl">Street Address</label>
          <input type="text" id="te-addr-street" class="te-input" value="${esc(ad.street||'')}" placeholder="Number and street" oninput="teOnField()">
        </div>
        <div class="te-field-group" style="flex:0 0 90px;min-width:0;">
          <label class="te-lbl">Apt. No.</label>
          <input type="text" id="te-addr-apt" class="te-input" value="${esc(ad.apt||'')}" oninput="teOnField()">
        </div>
      </div>
      <div class="te-frow">
        <div class="te-field-group">
          <label class="te-lbl">City / Town</label>
          <input type="text" id="te-addr-city" class="te-input" value="${esc(ad.city||'')}" oninput="teOnField()">
        </div>
        <div class="te-field-group" style="flex:0 0 130px;min-width:0;">
          <label class="te-lbl">State</label>
          <select id="te-addr-state" class="te-select" onchange="teOnField()">
            <option value="">— Select —</option>
            ${['AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA','HI','ID','IL','IN','IA','KS','KY','LA','ME','MD','MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ','NM','NY','NC','ND','OH','OK','OR','PA','RI','SC','SD','TN','TX','UT','VT','VA','WA','WV','WI','WY'].map(s=>`<option value="${s}" ${(ad.state||'')=== s?'selected':''}>${s}</option>`).join('')}
          </select>
        </div>
        <div class="te-field-group" style="flex:0 0 110px;min-width:0;">
          <label class="te-lbl">ZIP Code</label>
          <input type="text" id="te-addr-zip" class="te-input" value="${esc(ad.zip||'')}" maxlength="10" placeholder="XXXXX" oninput="teOnField()">
        </div>
      </div>
    </div>

    <!-- ── Dependents ── -->
    <div class="te-pers-block">
      <div class="te-pers-block-lbl" style="display:flex;justify-content:space-between;align-items:center;">
        <span>Dependents <span class="te-cite">IRC §152 &mdash; Form 1040, Lines (1)–(7)</span></span>
        <button class="ghost-btn te-sm-btn" onclick="teAddDep()">+ Add Dependent</button>
      </div>
      <div id="te-deps-list"></div>
    </div>`;
}

function teOnFSChange(fs) {
  if (!teCurrentReturn) return;
  teMarkDirty();
  teCurrentReturn.filingStatus = fs;
  let sec = document.getElementById('te-spouse-sec');
  if (sec) sec.style.display = (fs === 'mfj' || fs === 'mfs') ? 'block' : 'none';
  teRecalculate();
}

function teOnField() {
  if (!teCurrentReturn) return;
  teMarkDirty();
  let g = id => { let el = document.getElementById(id); return el ? el.value : ''; };
  let fs = document.getElementById('te-fs');
  if (fs) teCurrentReturn.filingStatus = fs.value;
  // Taxpayer
  teCurrentReturn.taxpayer.firstName     = g('te-tp-fn');
  teCurrentReturn.taxpayer.middleInitial = g('te-tp-mi');
  teCurrentReturn.taxpayer.lastName      = g('te-tp-ln');
  teCurrentReturn.taxpayer.ssn           = g('te-tp-ssn');
  teCurrentReturn.taxpayer.dob           = g('te-tp-dob');
  let tpBlind = document.getElementById('te-tp-blind');
  teCurrentReturn.taxpayer.blind         = tpBlind ? tpBlind.checked : false;
  // Spouse
  teCurrentReturn.spouse.firstName       = g('te-sp-fn');
  teCurrentReturn.spouse.middleInitial   = g('te-sp-mi');
  teCurrentReturn.spouse.lastName        = g('te-sp-ln');
  teCurrentReturn.spouse.ssn             = g('te-sp-ssn');
  teCurrentReturn.spouse.dob             = g('te-sp-dob');
  let spBlind = document.getElementById('te-sp-blind');
  teCurrentReturn.spouse.blind           = spBlind ? spBlind.checked : false;
  // Dependent status (IRC §63(c)(5))
  let canBeClaimed = document.getElementById('te-can-be-claimed');
  teCurrentReturn.canBeClaimed           = canBeClaimed ? canBeClaimed.checked : false;
  // Address
  if (!teCurrentReturn.address) teCurrentReturn.address = {};
  teCurrentReturn.address.street = g('te-addr-street');
  teCurrentReturn.address.apt    = g('te-addr-apt');
  teCurrentReturn.address.city   = g('te-addr-city');
  teCurrentReturn.address.state  = g('te-addr-state');
  teCurrentReturn.address.zip    = g('te-addr-zip');
  teRecalculate();
}

function teRenderDepsList() {
  let c = document.getElementById('te-deps-list');
  if (!c) return;
  let deps = teCurrentReturn.dependents || [];
  let yr   = teCurrentReturn.taxYear;
  if (deps.length === 0) {
    c.innerHTML = '<div class="te-empty" style="margin-top:10px;">No dependents added.</div>';
    return;
  }

  // Grid: (1)First | (2)Last | (3)SSN | DOB* | (4)Rel | (5a)Lived>½ | (5b)InUS | (6a)Student | (6b)Disabled | (7)Credit | del
  let colStyle = 'display:grid;grid-template-columns:1fr 1fr 120px 112px 120px 52px 48px 56px 60px 52px 28px;gap:6px;align-items:center;';

  let hdr = `
    <div style="${colStyle}padding:0 4px 7px;font-size:9px;font-weight:800;color:var(--text-dim);text-transform:uppercase;letter-spacing:.08em;border-bottom:1px solid var(--border);">
      <span>(1) First</span>
      <span>(2) Last</span>
      <span>(3) SSN</span>
      <span>DOB <span class="te-cite" style="font-weight:400;text-transform:none;">(engine)</span></span>
      <span>(4) Relationship</span>
      <span style="text-align:center;">(5a)<br>Lived&gt;½</span>
      <span style="text-align:center;">(5b)<br>In U.S.</span>
      <span style="text-align:center;">(6a)<br>Full-time Student</span>
      <span style="text-align:center;">(6b)<br>Disabled</span>
      <span style="text-align:center;">(7)<br>Credit</span>
      <span></span>
    </div>`;

  let rows = deps.map((d, i) => {
    let isEICQC  = teIsEICQualifyingChild(d, yr);
    let isCTC    = d.isQualifyingChild && teIsUnder17(d.dob, yr);
    // Column (7): every listed dependent gets CTC or ODC — no "neither" case
    // CTC: qualifying child under 17 (IRC §24(c)(1))
    // ODC: all others — QC ≥17, or qualifying relative (IRC §24(h)(4)) — $500, not yet in engine
    let creditBadge = isCTC
      ? `<span class="te-dep-credit te-dep-credit-ctc">CTC</span>`
      : `<span class="te-dep-credit te-dep-credit-odc">ODC</span>`;
    // Column 7 shows CTC if QC under 17; otherwise ODC ($500 — not yet in engine)

    return `
      <div style="${colStyle}padding:5px 4px;border-bottom:1px solid rgba(30,45,69,0.4);">
        <input type="text" class="te-input te-dep-in" value="${esc(d.firstName||'')}" placeholder="First" oninput="teUpdDep(${i},'firstName',this.value)">
        <input type="text" class="te-input te-dep-in" value="${esc(d.lastName||'')}"  placeholder="Last"  oninput="teUpdDep(${i},'lastName',this.value)">
        <input type="text" class="te-input te-dep-in" value="${esc(d.ssn||'')}" placeholder="XXX-XX-XXXX" maxlength="11" oninput="teUpdDep(${i},'ssn',this.value)">
        <input type="date" lang="en-GB" class="te-input te-dep-in" value="${esc(d.dob||'')}" min="1900-01-01" max="${new Date().toISOString().slice(0,10)}" onchange="teUpdDep(${i},'dob',this.value)">
        <select class="te-select te-dep-in" onchange="teUpdDep(${i},'relationship',this.value)">
          <option value="child"     ${d.relationship==='child'    ?'selected':''}>Child</option>
          <option value="stepchild" ${d.relationship==='stepchild'?'selected':''}>Stepchild</option>
          <option value="sibling"   ${d.relationship==='sibling'  ?'selected':''}>Sibling</option>
          <option value="parent"    ${d.relationship==='parent'   ?'selected':''}>Parent</option>
          <option value="other"     ${d.relationship==='other'    ?'selected':''}>Other Relative</option>
        </select>
        <div class="te-pers-chk-cell">
          <input type="checkbox" id="te-lw-${i}" ${d.livedWithTaxpayer?'checked':''} onchange="teUpdDep(${i},'livedWithTaxpayer',this.checked)">
        </div>
        <div class="te-pers-chk-cell">
          <input type="checkbox" id="te-us-${i}" ${d.inUS?'checked':''} onchange="teUpdDep(${i},'inUS',this.checked)">
        </div>
        <div class="te-pers-chk-cell">
          <input type="checkbox" id="te-stu-${i}" ${d.isFullTimeStudent?'checked':''} onchange="teUpdDep(${i},'isFullTimeStudent',this.checked)">
        </div>
        <div class="te-pers-chk-cell">
          <input type="checkbox" id="te-dis-${i}" ${d.isPermanentlyDisabled?'checked':''} onchange="teUpdDep(${i},'isPermanentlyDisabled',this.checked)">
          ${isEICQC ? '<span class="te-dep-eic-dot" title="EIC qualifying child">EIC</span>' : ''}
        </div>
        <div id="te-dep-credit-${i}" style="text-align:center;">${creditBadge}</div>
        <button class="te-rm-btn" onclick="teRmDep(${i})">✕</button>
      </div>`;
  }).join('');

  c.innerHTML = `<div style="width:100%;overflow-x:auto;margin-top:4px;">${hdr}${rows}</div>`;
}

function teAddDep() {
  teMarkDirty();
  teCurrentReturn.dependents.push({
    firstName: '', lastName: '', ssn: '', dob: '', relationship: 'child',
    isQualifyingChild: true, livedWithTaxpayer: true, inUS: true,
    isFullTimeStudent: false, isPermanentlyDisabled: false
  });
  teRenderDepsList();
  teRecalculate();
}

function teUpdDep(i, field, val) {
  if (!teCurrentReturn.dependents[i]) return;
  teMarkDirty();
  teCurrentReturn.dependents[i][field] = val;

  // DOB / isQualifyingChild: update credit badge in place — do NOT re-render the whole list
  // (re-rendering destroys the date input mid-interaction on DOB changes)
  if (field === 'dob' || field === 'isQualifyingChild') {
    let d   = teCurrentReturn.dependents[i];
    let yr  = teCurrentReturn.taxYear;
    let el  = document.getElementById('te-dep-credit-' + i);
    if (el) {
      let isCTC = d.isQualifyingChild && teIsUnder17(d.dob, yr);
      el.innerHTML = isCTC
        ? `<span class="te-dep-credit te-dep-credit-ctc">CTC</span>`
        : `<span class="te-dep-credit te-dep-credit-odc">ODC</span>`;
    }
  }

  // EIC label / student / disabled: full re-render is fine (checkboxes don't have picker state)
  if (field === 'isFullTimeStudent' || field === 'isPermanentlyDisabled') {
    teFocusSafe(teRenderDepsList);
  }

  teRecalculate();
}

function teRmDep(i) {
  teMarkDirty();
  teCurrentReturn.dependents.splice(i, 1);
  teRenderDepsList();
  teRecalculate();
}


// ──────────────────────────────────────────────────────────────────────
//  INCOME SECTION
// ──────────────────────────────────────────────────────────────────────

function teRenderIncome() {
  return `
    <div class="te-sec-hdr"><h2>Income</h2>
    <p class="te-sec-sub">Gross income from all sources &mdash; <span class="te-cite">IRC §61</span></p></div>

    <div class="te-subsec">
      <div class="te-subsec-row">
        <div>
          <div class="te-subsec-lbl">W-2 Wages &amp; Salaries <span class="te-cite">IRC §61(a)(1), §3401</span></div>
          <div class="te-subsec-desc">Wages, salaries, tips, and other compensation — W-2 Box 1 / Box 2.</div>
        </div>
        <button class="ghost-btn te-sm-btn" onclick="teAddW2()">+ Add W-2</button>
      </div>
      <div id="te-w2-list"></div>
      <div class="te-total-bar te-w2-total-bar-2col" id="te-w2-total-bar" style="display:none;">
        <div class="te-w2-total-item">
          <span>Total W-2 Wages <span class="te-cite">Box 1 &rarr; 1040 Line 1a</span></span>
          <span class="te-total-val te-mono" id="te-w2-total-val">$0</span>
        </div>
        <div class="te-w2-total-item">
          <span>Total Federal Withholding <span class="te-cite">Box 2 &rarr; 1040 Line 25a</span></span>
          <span class="te-total-val te-mono" id="te-w2-total-val2">$0</span>
        </div>
      </div>
    </div>

    <div class="te-subsec" style="margin-top:20px;">
      <div class="te-subsec-lbl">Schedule C — Self-Employment Income <span class="te-cite">IRC §162, §61(a)(2)</span></div>
      <div class="te-subsec-desc">Net profit from self-employment (gross receipts minus business expenses). Loss entries reduce gross income and SE tax base.</div>
      ${teRenderScheduleC()}
    </div>

    <div class="te-subsec" style="margin-top:20px;">
      <div class="te-subsec-row">
        <div>
          <div class="te-subsec-lbl">IRA Distributions (1099-R) <span class="te-cite">IRC §72, §408; 1040 Lines 4a/4b</span></div>
          <div class="te-subsec-desc">Distributions from traditional IRAs, SEP-IRAs, and SIMPLE IRAs. Taxable amount defaults to the full gross distribution — adjust if you have after-tax basis (nondeductible contributions), Roth conversions, or a partial rollover (1099-R Box 2a).</div>
        </div>
        <button class="ghost-btn te-sm-btn" onclick="teAdd1099R('ira')">+ Add 1099-R (IRA)</button>
      </div>
      <div id="te-ira-list"></div>
      <div class="te-total-bar" id="te-ira-total-bar" style="display:none;">
        <span>Total IRA Taxable Amount <span class="te-cite">1040 Line 4b</span></span>
        <span class="te-total-val" id="te-ira-total-val">$0</span>
      </div>
    </div>

    <div class="te-subsec" style="margin-top:20px;">
      <div class="te-subsec-row">
        <div>
          <div class="te-subsec-lbl">Pensions &amp; Annuities (1099-R) <span class="te-cite">IRC §72; 1040 Lines 5a/5b</span></div>
          <div class="te-subsec-desc">Distributions from employer pension plans, 401(k)/403(b)/457(b), profit-sharing plans, and commercial annuities. Taxable amount defaults to the full gross distribution — adjust if the plan has after-tax basis (1099-R Box 2a vs. Box 1).</div>
        </div>
        <button class="ghost-btn te-sm-btn" onclick="teAdd1099R('pension')">+ Add 1099-R (Pension)</button>
      </div>
      <div id="te-pension-list"></div>
      <div class="te-total-bar" id="te-pension-total-bar" style="display:none;">
        <span>Total Pension Taxable Amount <span class="te-cite">1040 Line 5b</span></span>
        <span class="te-total-val" id="te-pension-total-val">$0</span>
      </div>
    </div>

    ${teRenderSSSection()}

    <div class="te-subsec" style="margin-top:20px;">
      <div class="te-subsec-lbl">1099-INT &amp; 1099-DIV — Interest &amp; Dividend Income <span class="te-cite">IRC §61(a)(4),(7)</span></div>
      <div class="te-subsec-desc">Interest income (1099-INT) and dividends (1099-DIV). Qualified dividends receive preferential 0%/15%/20% rates. <span class="te-cite">IRC §1(h)(11)</span></div>
      ${teRender1099()}
    </div>

    <div class="te-subsec" style="margin-top:20px;">
      <div class="te-subsec-lbl">Schedule D — Capital Gains &amp; Losses <span class="te-cite">IRC §1221, §1222</span></div>
      <div class="te-subsec-desc">Per-transaction entry with auto holding period validation, loss carryover, and QDLTCG preferential rate computation. Open via the Income card above. <span class="te-cite">IRC §1211(b), §1212(b)</span></div>
      ${(() => {
        let calc = (teCurrentReturn && teCurrentReturn._calc) || {};
        let net  = calc.scheduleDNet || 0;
        let cf   = calc.capLossCarryforward || 0;
        if (!calc.sdLines && !calc.scheduleDCombined) return '<div class="te-ded-note">No data entered yet — click the Schedule D card to open the form.</div>';
        let sign = net >= 0 ? '' : '–';
        return `<div class="te-ded-note">
          Net: <strong>${net >= 0 ? teFmt(net) : '(' + teFmt(Math.abs(net)) + ')'}</strong>
          ${net >= 0 ? '— flows to Form 1040, line 7a' : '— deductible loss ($3,000/$1,500 cap), carryforward: ' + teFmt(cf)}
          <span class="te-cite">Line 16 / 21</span>
        </div>`;
      })()}
    </div>

    <div class="te-subsec" style="margin-top:20px;">
      <div class="te-subsec-row">
        <div>
          <div class="te-subsec-lbl">Schedule E — Pass-Through &amp; K-1 Income <span class="te-cite">IRC §702, §1366</span></div>
          <div class="te-subsec-desc">Partnership, S-Corp, trust, and estate K-1 income/loss. Passive losses are suspended until offset by passive income. <span class="te-cite">IRC §469</span></div>
        </div>
        <button class="ghost-btn te-sm-btn" onclick="teAddScheduleE()">+ Add Entity</button>
      </div>
      <div id="te-sche-list"></div>
    </div>

    <div class="te-subsec" style="margin-top:20px;">
      <div class="te-subsec-lbl">ISO Exercise — AMT Preference Item <span class="te-cite">IRC §56(b)(3)</span></div>
      <div class="te-subsec-desc">Spread at exercise of incentive stock options. Not included in regular W-2/1040 income, but IS an AMT adjustment. Enter $0 or leave blank if no ISOs were exercised this year. <span class="te-cite">IRC §56(b)(3); Form 6251 Line 2</span></div>
      <div class="te-frow">
        <div class="te-field-group">
          <label class="te-lbl">ISO Exercise Spread <span class="te-cite">IRC §56(b)(3)</span></label>
          <input type="number" id="te-iso-spread" class="te-input te-mono"
            value="${esc(teCurrentReturn.isoExercise||'')}" min="0" step="1" placeholder="$0"
            oninput="teOnISOField(this.value)">
        </div>
      </div>
      <div class="te-ded-note">Spread = (Fair Market Value per share − Exercise Price per share) × shares exercised. Reported on Form 6251 Line 2. Does not appear on Form 1040 regular income. <span class="te-cite">IRC §56(b)(3)</span></div>
    </div>

    <div class="te-stub-sec" style="margin-top:8px;">
      <div class="te-stub-blk"><span class="te-stub-title">Other Income (Alimony Received, Prizes, Gambling, etc.) <span class="te-cite">IRC §61(a)</span></span><span class="te-stub-pill">Track 5</span></div>
    </div>`;
}

// ── W-2 — Full Box-Level Entry ────────────────────────────────────────────
// IRC §61(a)(1), §3401 — 1040 Lines 1a (Box 1) & 25a (Box 2)

function teW2Box12CodeOptions(selected) {
  let codes = [
    ['',   '— None —'],
    ['A',  'A \u2014 Uncollected SS/RRTA tax on tips'],
    ['B',  'B \u2014 Uncollected Medicare tax on tips'],
    ['C',  'C \u2014 Taxable cost group-term life ins >$50K'],
    ['D',  'D \u2014 Elective deferrals to 401(k)'],
    ['E',  'E \u2014 Elective deferrals to 403(b)'],
    ['F',  'F \u2014 Elective deferrals to 408(k)(6) SEP'],
    ['G',  'G \u2014 Elective deferrals to 457(b)'],
    ['H',  'H \u2014 Elective deferrals to 501(c)(18)(D)'],
    ['J',  'J \u2014 Nontaxable sick pay'],
    ['K',  'K \u2014 20% excise tax on excess golden parachute'],
    ['L',  'L \u2014 Employee business expense reimbursements'],
    ['M',  'M \u2014 Uncollected SS tax on group-term life ins'],
    ['N',  'N \u2014 Uncollected Medicare tax on group-term life ins'],
    ['P',  'P \u2014 Excludable moving expense reimbursements'],
    ['Q',  'Q \u2014 Nontaxable combat pay'],
    ['R',  'R \u2014 Employer contributions to Archer MSA'],
    ['S',  'S \u2014 Employee salary reduction to SIMPLE'],
    ['T',  'T \u2014 Adoption benefits'],
    ['V',  'V \u2014 Income from nonstatutory stock options'],
    ['W',  'W \u2014 Employer contributions to HSA'],
    ['Y',  'Y \u2014 Deferrals under \u00a7409A nonqualified deferred comp'],
    ['Z',  'Z \u2014 Income under \u00a7409A nonqualified deferred comp'],
    ['AA', 'AA \u2014 Designated Roth contributions to 401(k)'],
    ['BB', 'BB \u2014 Designated Roth contributions to 403(b)'],
    ['DD', 'DD \u2014 Cost of employer-sponsored health coverage'],
    ['EE', 'EE \u2014 Designated Roth contributions to govt 457(b)'],
    ['FF', 'FF \u2014 Benefits under qualified small employer HRA'],
    ['GG', 'GG \u2014 Income from qualified equity grants \u00a783(i)'],
    ['HH', 'HH \u2014 Aggregate deferrals under \u00a783(i) elections']
  ];
  return codes.map(([v, l]) => `<option value="${v}"${selected === v ? ' selected' : ''}>${l}</option>`).join('');
}

function teRenderW2Card(w, i) {
  let nv = v => (v !== '' && v !== undefined && v !== null) ? esc(String(v)) : '';
  let tv = v => esc(String(v || ''));
  let ck = v => v ? ' checked' : '';
  let b12Labels = ['12a', '12b', '12c', '12d'];
  let empDisplay = w.empName ? (' \u2014 ' + esc(w.empName)) : '';

  let b12Html = (w.box12 || []).slice(0, 4).map((b, s) => `
    <div class="te-w2-b12-row">
      <span class="te-w2-b12-lbl">${b12Labels[s]}</span>
      <select class="te-input te-w2-b12-code" onchange="teOnW2B12Code(${i},${s},this.value)">${teW2Box12CodeOptions(b.code || '')}</select>
      <input type="number" class="te-input te-mono te-w2-b12-amt" id="te-w2-${i}-b12amt-${s}" value="${nv(b.amount)}" placeholder="0.00" step="0.01" min="0" oninput="teOnW2B12Amt(${i},${s})">
    </div>`).join('');

  let b14Html = (w.box14 || []).map((b, j) => `
    <div class="te-w2-b14-row">
      <input type="text" class="te-input te-w2-b14-desc" id="te-w2-${i}-b14txt-${j}" value="${tv(b.desc)}" placeholder="Description (e.g. NY SDI, Union Dues)" oninput="teOnW2B14Txt(${i},${j})">
      <input type="number" class="te-input te-mono te-w2-b14-amt" id="te-w2-${i}-b14amt-${j}" value="${nv(b.amount)}" placeholder="0.00" step="0.01" oninput="teOnW2B14Amt(${i},${j})">
      <button class="te-rm-btn" onclick="teW2RmB14(${i},${j})">&#10005;</button>
    </div>`).join('');

  let srLen = (w.stateRows || []).length;
  let srHtml = (w.stateRows || []).map((sr, j) => `
    <div class="te-w2-state-row">
      <div class="te-w2-state-fields">
        <div class="te-w2-state-cell">
          <label class="te-lbl">Box 15 &mdash; State</label>
          <select class="te-select" id="te-w2-${i}-sr-${j}-state" onchange="teOnW2StateField(${i},${j},'state')">
            <option value="">—</option>
            ${['AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA','HI','ID','IL','IN','IA','KS','KY','LA','ME','MD','MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ','NM','NY','NC','ND','OH','OK','OR','PA','RI','SC','SD','TN','TX','UT','VT','VA','WA','WV','WI','WY'].map(s=>`<option value="${s}"${(sr.state||'')=== s?' selected':''}>${s}</option>`).join('')}
          </select>
        </div>
        <div class="te-w2-state-cell">
          <label class="te-lbl">Employer State ID</label>
          <input type="text" class="te-input te-mono" id="te-w2-${i}-sr-${j}-stateId" value="${tv(sr.stateId)}" placeholder="State ID #" oninput="teOnW2StateField(${i},${j},'stateId')">
        </div>
        <div class="te-w2-state-cell">
          <label class="te-lbl">Box 16 &mdash; State Wages</label>
          <input type="number" class="te-input te-mono" id="te-w2-${i}-sr-${j}-stateWages" value="${nv(sr.stateWages)}" placeholder="0.00" step="0.01" min="0" oninput="teOnW2StateField(${i},${j},'stateWages')">
        </div>
        <div class="te-w2-state-cell">
          <label class="te-lbl">Box 17 &mdash; State Tax</label>
          <input type="number" class="te-input te-mono" id="te-w2-${i}-sr-${j}-stateTax" value="${nv(sr.stateTax)}" placeholder="0.00" step="0.01" min="0" oninput="teOnW2StateField(${i},${j},'stateTax')">
        </div>
        <div class="te-w2-state-cell">
          <label class="te-lbl">Box 18 &mdash; Local Wages</label>
          <input type="number" class="te-input te-mono" id="te-w2-${i}-sr-${j}-localWages" value="${nv(sr.localWages)}" placeholder="0.00" step="0.01" min="0" oninput="teOnW2StateField(${i},${j},'localWages')">
        </div>
        <div class="te-w2-state-cell">
          <label class="te-lbl">Box 19 &mdash; Local Tax</label>
          <input type="number" class="te-input te-mono" id="te-w2-${i}-sr-${j}-localTax" value="${nv(sr.localTax)}" placeholder="0.00" step="0.01" min="0" oninput="teOnW2StateField(${i},${j},'localTax')">
        </div>
        <div class="te-w2-state-cell te-w2-state-wide">
          <label class="te-lbl">Box 20 &mdash; Locality</label>
          <input type="text" class="te-input" id="te-w2-${i}-sr-${j}-locality" value="${tv(sr.locality)}" placeholder="e.g. New York City" oninput="teOnW2StateField(${i},${j},'locality')">
        </div>
      </div>
      ${srLen > 1 ? `<button class="te-rm-btn" style="align-self:flex-start;margin-top:18px;" onclick="teW2RmState(${i},${j})">&#10005;</button>` : ''}
    </div>`).join('');

  return `
  <div class="te-w2-card" id="te-w2-card-${i}">
    <div class="te-w2-card-hdr">
      <div class="te-w2-card-title">
        <span class="te-w2-num">W-2 #${i + 1}</span>
        <span id="te-w2-hdr-name-${i}" class="te-w2-hdr-employer">${empDisplay}</span>
      </div>
      <div class="te-w2-card-btns">
        <button class="ghost-btn te-sm-btn te-w2-toggle-btn" onclick="teToggleW2Card(${i})">${w.collapsed ? '&#9658; Expand' : '&#9660; Collapse'}</button>
        <button class="te-rm-btn" onclick="teRmW2(${i})">&#10005;</button>
      </div>
    </div>
    <div class="te-w2-card-body" id="te-w2-body-${i}"${w.collapsed ? ' style="display:none;"' : ''}>

      <div class="te-w2-sect-lbl">Employee &amp; Employer Information</div>
      <div class="te-w2-info-grid">
        <div class="te-w2-info-cell">
          <label class="te-lbl">a &mdash; Employee&rsquo;s SSN</label>
          <input type="text" class="te-input te-mono" id="te-w2-${i}-ssn" value="${tv(w.ssn)}" placeholder="XXX-XX-XXXX" oninput="teOnW2Txt(${i},'ssn')">
        </div>
        <div class="te-w2-info-cell">
          <label class="te-lbl">b &mdash; Employer&rsquo;s EIN</label>
          <input type="text" class="te-input te-mono" id="te-w2-${i}-ein" value="${tv(w.ein)}" placeholder="XX-XXXXXXX" oninput="teOnW2Txt(${i},'ein')">
        </div>
        <div class="te-w2-info-cell te-w2-full">
          <label class="te-lbl">c &mdash; Employer Name, Address &amp; ZIP</label>
          <div style="display:flex;gap:6px;">
            <input type="text" class="te-input" style="flex:2;min-width:0;" id="te-w2-${i}-empName" value="${tv(w.empName)}" placeholder="Employer name" oninput="teOnW2Txt(${i},'empName')">
            <input type="text" class="te-input" style="flex:3;min-width:0;" id="te-w2-${i}-empAddr" value="${tv(w.empAddr)}" placeholder="Street, City, State ZIP" oninput="teOnW2Txt(${i},'empAddr')">
          </div>
        </div>
        <div class="te-w2-info-cell">
          <label class="te-lbl">d &mdash; Control Number <span class="te-sc-sub">(optional)</span></label>
          <input type="text" class="te-input" id="te-w2-${i}-controlNum" value="${tv(w.controlNum)}" placeholder="Optional" oninput="teOnW2Txt(${i},'controlNum')">
        </div>
        <div class="te-w2-info-cell">
          <label class="te-lbl">e &mdash; Employee Name</label>
          <div style="display:flex;gap:5px;">
            <input type="text" class="te-input" style="flex:2;min-width:0;" id="te-w2-${i}-eeName" value="${tv(w.eeName)}" placeholder="First" oninput="teOnW2Txt(${i},'eeName')">
            <input type="text" class="te-input" style="flex:0 0 34px;min-width:0;" id="te-w2-${i}-eeMI" value="${tv(w.eeMI)}" placeholder="MI" oninput="teOnW2Txt(${i},'eeMI')">
            <input type="text" class="te-input" style="flex:2;min-width:0;" id="te-w2-${i}-eeLastName" value="${tv(w.eeLastName)}" placeholder="Last" oninput="teOnW2Txt(${i},'eeLastName')">
            <input type="text" class="te-input" style="flex:0 0 44px;min-width:0;" id="te-w2-${i}-eeSuffix" value="${tv(w.eeSuffix)}" placeholder="Suf." oninput="teOnW2Txt(${i},'eeSuffix')">
          </div>
        </div>
        <div class="te-w2-info-cell te-w2-full">
          <label class="te-lbl">f &mdash; Employee Address &amp; ZIP</label>
          <input type="text" class="te-input" id="te-w2-${i}-eeAddr" value="${tv(w.eeAddr)}" placeholder="Street, City, State ZIP" oninput="teOnW2Txt(${i},'eeAddr')">
        </div>
      </div>

      <div class="te-w2-sect-lbl">Income &amp; Tax <span class="te-cite">IRC §3401</span></div>
      <div class="te-w2-box-grid">
        <div class="te-w2-box-cell">
          <label class="te-lbl">Box 1 &mdash; Wages, tips, other compensation <span class="te-cite">&rarr; 1040 Line 1a</span></label>
          <input type="number" class="te-input te-mono" id="te-w2-${i}-box1" value="${nv(w.box1)}" placeholder="0.00" step="0.01" min="0" oninput="teOnW2Num(${i},'box1')">
        </div>
        <div class="te-w2-box-cell">
          <label class="te-lbl">Box 2 &mdash; Federal income tax withheld <span class="te-cite">&rarr; 1040 Line 25a</span></label>
          <input type="number" class="te-input te-mono" id="te-w2-${i}-box2" value="${nv(w.box2)}" placeholder="0.00" step="0.01" min="0" oninput="teOnW2Num(${i},'box2')">
        </div>
        <div class="te-w2-box-cell">
          <label class="te-lbl">Box 3 &mdash; Social security wages <span class="te-cite">IRC §3121</span></label>
          <input type="number" class="te-input te-mono" id="te-w2-${i}-box3" value="${nv(w.box3)}" placeholder="0.00" step="0.01" min="0" oninput="teOnW2Num(${i},'box3')">
        </div>
        <div class="te-w2-box-cell">
          <label class="te-lbl">Box 4 &mdash; Social security tax withheld</label>
          <input type="number" class="te-input te-mono" id="te-w2-${i}-box4" value="${nv(w.box4)}" placeholder="0.00" step="0.01" min="0" oninput="teOnW2Num(${i},'box4')">
        </div>
        <div class="te-w2-box-cell">
          <label class="te-lbl">Box 5 &mdash; Medicare wages and tips <span class="te-cite">IRC §3101(b)</span></label>
          <input type="number" class="te-input te-mono" id="te-w2-${i}-box5" value="${nv(w.box5)}" placeholder="0.00" step="0.01" min="0" oninput="teOnW2Num(${i},'box5')">
        </div>
        <div class="te-w2-box-cell">
          <label class="te-lbl">Box 6 &mdash; Medicare tax withheld</label>
          <input type="number" class="te-input te-mono" id="te-w2-${i}-box6" value="${nv(w.box6)}" placeholder="0.00" step="0.01" min="0" oninput="teOnW2Num(${i},'box6')">
        </div>
        <div class="te-w2-box-cell">
          <label class="te-lbl">Box 7 &mdash; Social security tips <span class="te-cite">IRC §3402(k)</span></label>
          <input type="number" class="te-input te-mono" id="te-w2-${i}-box7" value="${nv(w.box7)}" placeholder="0.00" step="0.01" min="0" oninput="teOnW2Num(${i},'box7')">
        </div>
        <div class="te-w2-box-cell">
          <label class="te-lbl">Box 8 &mdash; Allocated tips <span class="te-cite">IRC §3402(k)</span></label>
          <input type="number" class="te-input te-mono" id="te-w2-${i}-box8" value="${nv(w.box8)}" placeholder="0.00" step="0.01" min="0" oninput="teOnW2Num(${i},'box8')">
        </div>
        <div class="te-w2-box-cell">
          <label class="te-lbl">Box 10 &mdash; Dependent care benefits <span class="te-cite">IRC §129</span></label>
          <input type="number" class="te-input te-mono" id="te-w2-${i}-box10" value="${nv(w.box10)}" placeholder="0.00" step="0.01" min="0" oninput="teOnW2Num(${i},'box10')">
        </div>
        <div class="te-w2-box-cell">
          <label class="te-lbl">Box 11 &mdash; Nonqualified plans <span class="te-cite">IRC §457</span></label>
          <input type="number" class="te-input te-mono" id="te-w2-${i}-box11" value="${nv(w.box11)}" placeholder="0.00" step="0.01" min="0" oninput="teOnW2Num(${i},'box11')">
        </div>
      </div>

      <div class="te-w2-sect-lbl">Box 12 &mdash; Coded Entries</div>
      <div class="te-w2-b12-grid">${b12Html}</div>

      <div class="te-w2-sect-lbl">Box 13</div>
      <div class="te-w2-b13-row">
        <label class="te-w2-b13-chk"><input type="checkbox"${ck(w.box13Statutory)} onchange="teOnW2Bool(${i},'box13Statutory',this.checked)"><span>Statutory employee</span></label>
        <label class="te-w2-b13-chk"><input type="checkbox"${ck(w.box13Retirement)} onchange="teOnW2Bool(${i},'box13Retirement',this.checked)"><span>Retirement plan <span class="te-cite">IRC §219(g)</span></span></label>
        <label class="te-w2-b13-chk"><input type="checkbox"${ck(w.box13ThirdParty)} onchange="teOnW2Bool(${i},'box13ThirdParty',this.checked)"><span>Third-party sick pay</span></label>
      </div>

      <div class="te-w2-sect-lbl">Box 14 &mdash; Other <span class="te-sc-sub">(employer-entered: state disability, union dues, etc.)</span></div>
      ${b14Html ? `<div class="te-w2-b14-list">${b14Html}</div>` : ''}
      <button class="ghost-btn te-sm-btn" style="margin-top:6px;" onclick="teW2AddB14(${i})">+ Add Box 14 Item</button>

      <div class="te-w2-sect-lbl" style="margin-top:14px;">State &amp; Local Tax <span class="te-cite">Boxes 15&ndash;20</span></div>
      <div class="te-w2-state-list">${srHtml}</div>
      ${srLen < 2 ? `<button class="ghost-btn te-sm-btn" style="margin-top:6px;" onclick="teW2AddState(${i})">+ Add State/Local Row</button>` : ''}

    </div>
  </div>`;
}

function teRenderW2List() {
  let c   = document.getElementById('te-w2-list');
  let bar = document.getElementById('te-w2-total-bar');
  if (!c) return;
  let w2s = teCurrentReturn.w2 || [];
  if (w2s.length === 0) {
    c.innerHTML = '<div class="te-empty">No W-2s added. Click &quot;+ Add W-2&quot; to begin.</div>';
    if (bar) bar.style.display = 'none';
    return;
  }
  if (bar) bar.style.display = 'flex';
  c.innerHTML = `<div class="te-w2-cards">${w2s.map((w, i) => teRenderW2Card(w, i)).join('')}</div>`;
  let tv1 = document.getElementById('te-w2-total-val');
  let tv2 = document.getElementById('te-w2-total-val2');
  if (tv1) tv1.textContent = teFmt(w2s.reduce((s, w) => s + (parseFloat(w.box1) || 0), 0));
  if (tv2) tv2.textContent = teFmt(w2s.reduce((s, w) => s + (parseFloat(w.box2) || 0), 0));
}

function teAddW2() {
  teMarkDirty();
  if (!teCurrentReturn.w2) teCurrentReturn.w2 = [];
  teCurrentReturn.w2.push({
    ssn: '', ein: '', empName: '', empAddr: '',
    controlNum: '', eeName: '', eeMI: '', eeLastName: '', eeSuffix: '', eeAddr: '',
    box1: '', box2: '', box3: '', box4: '', box5: '', box6: '',
    box7: '', box8: '', box10: '', box11: '',
    box12: [{ code: '', amount: '' }, { code: '', amount: '' }, { code: '', amount: '' }, { code: '', amount: '' }],
    box13Statutory: false, box13Retirement: false, box13ThirdParty: false,
    box14: [],
    stateRows: [{ state: '', stateId: '', stateWages: '', stateTax: '', localWages: '', localTax: '', locality: '' }],
    collapsed: false
  });
  teRenderW2List();
  teRecalculate();
}

function teRmW2(i) {
  teMarkDirty();
  teCurrentReturn.w2.splice(i, 1);
  teRenderW2List();
  teRecalculate();
}

function teToggleW2Card(i) {
  if (!teCurrentReturn.w2[i]) return;
  teCurrentReturn.w2[i].collapsed = !teCurrentReturn.w2[i].collapsed;
  let body = document.getElementById('te-w2-body-' + i);
  let card = document.getElementById('te-w2-card-' + i);
  if (body) body.style.display = teCurrentReturn.w2[i].collapsed ? 'none' : '';
  let btn = card ? card.querySelector('.te-w2-toggle-btn') : null;
  if (btn) btn.innerHTML = teCurrentReturn.w2[i].collapsed ? '&#9658; Expand' : '&#9660; Collapse';
}

// ── W-2 Input Handlers ────────────────────────────────────────────────────

function teOnW2Num(i, field) {
  clearTimeout(teW2Timers[i + '_' + field]);
  teW2Timers[i + '_' + field] = setTimeout(() => {
    let el = document.getElementById('te-w2-' + i + '-' + field);
    if (!el || !teCurrentReturn.w2[i]) return;
    teMarkDirty();
    teCurrentReturn.w2[i][field] = el.value;
    teRecalculate();
  }, 150);
}

function teOnW2Txt(i, field) {
  clearTimeout(teW2Timers[i + '_' + field]);
  teW2Timers[i + '_' + field] = setTimeout(() => {
    let el = document.getElementById('te-w2-' + i + '-' + field);
    if (!el || !teCurrentReturn.w2[i]) return;
    teMarkDirty();
    teCurrentReturn.w2[i][field] = el.value;
    if (field === 'empName') {
      let nameEl = document.getElementById('te-w2-hdr-name-' + i);
      if (nameEl) nameEl.textContent = el.value ? (' \u2014 ' + el.value) : '';
    }
  }, 150);
}

function teOnW2Bool(i, field, val) {
  if (!teCurrentReturn.w2[i]) return;
  teMarkDirty();
  teCurrentReturn.w2[i][field] = val;
  teRecalculate();
}

function teOnW2B12Code(i, slot, val) {
  if (!teCurrentReturn.w2[i] || !teCurrentReturn.w2[i].box12) return;
  teMarkDirty();
  teCurrentReturn.w2[i].box12[slot].code = val;
  teRecalculate();
}

function teOnW2B12Amt(i, slot) {
  let key = i + '_b12_' + slot;
  clearTimeout(teW2Timers[key]);
  teW2Timers[key] = setTimeout(() => {
    let el = document.getElementById('te-w2-' + i + '-b12amt-' + slot);
    let w  = teCurrentReturn.w2[i];
    if (!el || !w || !w.box12 || !w.box12[slot]) return;
    teMarkDirty();
    w.box12[slot].amount = el.value;
    teRecalculate();
  }, 150);
}

function teW2AddB14(i) {
  if (!teCurrentReturn.w2[i]) return;
  teMarkDirty();
  teCurrentReturn.w2[i].box14.push({ desc: '', amount: '' });
  teRenderW2List();
}

function teW2RmB14(i, j) {
  if (!teCurrentReturn.w2[i]) return;
  teMarkDirty();
  teCurrentReturn.w2[i].box14.splice(j, 1);
  teRenderW2List();
}

function teOnW2B14Txt(i, j) {
  let key = i + '_b14txt_' + j;
  clearTimeout(teW2Timers[key]);
  teW2Timers[key] = setTimeout(() => {
    let el = document.getElementById('te-w2-' + i + '-b14txt-' + j);
    let w  = teCurrentReturn.w2[i];
    if (!el || !w || !w.box14 || !w.box14[j]) return;
    teMarkDirty();
    w.box14[j].desc = el.value;
  }, 150);
}

function teOnW2B14Amt(i, j) {
  let key = i + '_b14amt_' + j;
  clearTimeout(teW2Timers[key]);
  teW2Timers[key] = setTimeout(() => {
    let el = document.getElementById('te-w2-' + i + '-b14amt-' + j);
    let w  = teCurrentReturn.w2[i];
    if (!el || !w || !w.box14 || !w.box14[j]) return;
    teMarkDirty();
    w.box14[j].amount = el.value;
  }, 150);
}

function teW2AddState(i) {
  if (!teCurrentReturn.w2[i]) return;
  teMarkDirty();
  if (!teCurrentReturn.w2[i].stateRows) teCurrentReturn.w2[i].stateRows = [];
  teCurrentReturn.w2[i].stateRows.push({ state: '', stateId: '', stateWages: '', stateTax: '', localWages: '', localTax: '', locality: '' });
  teRenderW2List();
}

function teW2RmState(i, j) {
  let w = teCurrentReturn.w2[i];
  if (!w || (w.stateRows || []).length <= 1) return;
  teMarkDirty();
  w.stateRows.splice(j, 1);
  teRenderW2List();
  teRecalculate();
}

function teOnW2StateField(i, j, field) {
  let key = i + '_sr_' + j + '_' + field;
  clearTimeout(teW2Timers[key]);
  teW2Timers[key] = setTimeout(() => {
    let el = document.getElementById('te-w2-' + i + '-sr-' + j + '-' + field);
    let w  = teCurrentReturn.w2[i];
    if (!el || !w || !w.stateRows || !w.stateRows[j]) return;
    teMarkDirty();
    w.stateRows[j][field] = el.value;
    teRecalculate();
  }, 150);
}

// ── Social Security Benefits — IRC §86 — 1040 Lines 6a/6b ────────────────
function teRenderSSSection() {
  let r  = teCurrentReturn;
  let ss = (r && r.socialSecurity) || {};
  let fs = (r && r.filingStatus)   || 'single';
  let calc = (r && r._calc)        || {};
  let isMFS = fs === 'mfs';

  let summaryHtml = '';
  if (calc.ssBenefitsGross > 0) {
    summaryHtml = teRenderSSSummary(calc, fs);
  }

  return `
    <div class="te-subsec" style="margin-top:20px;">
      <div class="te-subsec-lbl">Social Security Benefits (SSA-1099) <span class="te-cite">IRC §86; 1040 Lines 6a/6b</span></div>
      <div class="te-subsec-desc">Enter the total benefits received from SSA-1099 Box 5 (1040 Line 6a). The taxable portion (Line 6b) is computed using the IRC §86 provisional income formula — up to 85% of benefits may be taxable depending on total income.</div>
      <div class="te-frow" style="align-items:flex-end;gap:12px;flex-wrap:wrap;margin-top:8px;">
        <div class="te-field-group" style="max-width:220px;">
          <label class="te-lbl">Total SS Benefits Received <span class="te-cite">SSA-1099 Box 5; 1040 Line 6a</span></label>
          <input type="number" id="te-ss-benefits" class="te-input te-mono"
            value="${esc(String(ss.benefits||''))}" placeholder="0.00" step="0.01" min="0"
            oninput="teOnSSField()">
        </div>
        ${isMFS ? `
        <div class="te-field-group" style="align-self:center;margin-top:16px;">
          <label class="te-chk-lbl" title="IRC §86(c)(2): MFS filers who lived with their spouse at any time during the year are taxed at 85% on dollar one, regardless of income.">
            <input type="checkbox" id="te-ss-mfs-lived" ${ss.mfsLivedWithSpouse ? 'checked' : ''}
              onchange="teOnSSField()">
            Lived with spouse at any time during the year
          </label>
        </div>` : ''}
      </div>
      ${isMFS && !ss.mfsLivedWithSpouse ? '' : (isMFS ? `
      <div class="te-ded-note" style="margin-top:6px;color:var(--warning,#f59e0b);">
        MFS filers who lived with their spouse at any time during the year: 85% of benefits are taxable on dollar one — no thresholds apply. <span class="te-cite">IRC §86(c)(2)</span>
      </div>` : '')}
      <div id="te-ss-summary" style="margin-top:8px;">${summaryHtml}</div>
    </div>`;
}

function teRenderSSSummary(calc, fs) {
  if (!calc || (calc.ssBenefitsGross || 0) === 0) return '';
  let pct   = Math.round((calc.ssTaxablePct || 0) * 100);
  let piStr = calc.ssMfsPenalty ? 'N/A (MFS penalty rate)' : teFmt(calc.ssProvisionalIncome || 0);
  return `
    <div class="te-ded-note">
      <strong>Provisional Income:</strong> ${piStr} &nbsp;|&nbsp;
      <strong>1040 Line 6a (Gross):</strong> ${teFmt(calc.ssBenefitsGross || 0)} &nbsp;|&nbsp;
      <strong>1040 Line 6b (Taxable):</strong> ${teFmt(calc.ssBenefitsTaxable || 0)} (${pct}% of benefits)
      <span class="te-cite">IRC §86(a),(b)</span>
    </div>`;
}

function teOnSSField() {
  if (!teCurrentReturn) return;
  teMarkDirty();
  if (!teCurrentReturn.socialSecurity) teCurrentReturn.socialSecurity = {};
  let benEl  = document.getElementById('te-ss-benefits');
  let mfsEl  = document.getElementById('te-ss-mfs-lived');
  if (benEl)  teCurrentReturn.socialSecurity.benefits           = benEl.value;
  if (mfsEl)  teCurrentReturn.socialSecurity.mfsLivedWithSpouse = mfsEl.checked;
  teRecalculate();
}

// ── 1099-R: IRA & Pension Distributions ──────────────────────────────────
// IRC §72, §408; 1040 Lines 4a/4b (IRA) and 5a/5b (Pension)
function teRender1099RList(type) {
  let listId   = type === 'ira' ? 'te-ira-list'       : 'te-pension-list';
  let barId    = type === 'ira' ? 'te-ira-total-bar'  : 'te-pension-total-bar';
  let totId    = type === 'ira' ? 'te-ira-total-val'  : 'te-pension-total-val';
  let emptyMsg = type === 'ira'
    ? 'No IRA distributions added. Click &quot;+ Add 1099-R (IRA)&quot; to add.'
    : 'No pension distributions added. Click &quot;+ Add 1099-R (Pension)&quot; to add.';

  let c   = document.getElementById(listId);
  let bar = document.getElementById(barId);
  if (!c) return;

  let key     = type === 'ira' ? 'ira1099r' : 'pension1099r';
  let entries = teCurrentReturn[key] || [];
  if (entries.length === 0) {
    c.innerHTML = '<div class="te-empty">' + emptyMsg + '</div>';
    if (bar) bar.style.display = 'none';
    return;
  }
  if (bar) bar.style.display = 'flex';

  let colStyle = 'display:grid;grid-template-columns:2fr 1fr 1fr 64px 60px 28px;gap:8px;align-items:center;';
  c.innerHTML = `
    <div class="te-w2-tbl">
      <div style="${colStyle}padding:0 4px 7px;font-size:9px;font-weight:800;color:var(--text-dim);text-transform:uppercase;letter-spacing:0.08em;border-bottom:1px solid var(--border);">
        <span>Payer Name</span><span>Gross Distribution</span><span>Taxable Amount</span><span>Age</span><span>§72(t) Exc.</span><span></span>
      </div>
      ${entries.map((e, i) => `
        <div style="${colStyle}padding:5px 4px;border-bottom:1px solid rgba(30,45,69,0.4);">
          <input type="text"   class="te-input"          value="${esc(e.payerName||'')}"  placeholder="Payer name"
            oninput="teUpd1099R('${type}',${i},'payerName',this.value)">
          <input type="number" class="te-input te-mono"  value="${e.grossDist||''}"        placeholder="0.00" step="0.01" min="0"
            oninput="teUpd1099R('${type}',${i},'grossDist',this.value)">
          <input type="number" class="te-input te-mono"  value="${e.taxableDist||''}"      placeholder="0.00" step="0.01" min="0"
            id="te-1099r-${type}-${i}-td"
            title="Defaults to gross distribution. Adjust if 1099-R Box 2a shows a lower taxable amount (basis, after-tax contributions, partial rollover)."
            oninput="teUpd1099R('${type}',${i},'taxableDist',this.value)">
          <input type="number" class="te-input te-mono"  value="${e.age||''}"              placeholder="Age" step="1" min="0" max="130"
            oninput="teUpd1099R('${type}',${i},'age',this.value)">
          <label class="te-chk-lbl" style="justify-content:center;" title="Check if a §72(t)(2) exception applies (disability, SEPP, death, medical expenses, etc.)">
            <input type="checkbox" ${e.penaltyException ? 'checked' : ''}
              onchange="teUpd1099R('${type}',${i},'penaltyException',this.checked)"> Exc.
          </label>
          <button class="te-rm-btn" onclick="teRm1099R('${type}',${i})">✕</button>
        </div>`).join('')}
    </div>
    <div class="te-ded-note" style="margin-top:6px;">
      <strong>Taxable Amount</strong> defaults to full gross distribution. Adjust if 1099-R Box 2a is lower due to after-tax basis, Roth conversions, or a partial rollover. <span class="te-cite">IRC §72(e)</span> &nbsp;|&nbsp;
      <strong>Early Withdrawal Penalty (IRC §72(t)):</strong> 10% applies when Age &lt; 59½ and no §72(t)(2) exception applies. Check &quot;Exc.&quot; for: disability, SEPP/72(t) plan, death, medical expenses &gt;7.5% AGI, health insurance premiums while unemployed, higher education, first-home purchase (IRA only, $10K lifetime).
    </div>`;

  // Update total bar
  let tot = entries.reduce((s, e) => s + (parseFloat(e.taxableDist) || 0), 0);
  let tv  = document.getElementById(totId);
  if (tv) tv.textContent = teFmt(tot);
}

function teAdd1099R(type) {
  let key = type === 'ira' ? 'ira1099r' : 'pension1099r';
  teMarkDirty();
  if (!teCurrentReturn[key]) teCurrentReturn[key] = [];
  teCurrentReturn[key].push({ payerName: '', grossDist: '', taxableDist: '', age: '', penaltyException: false });
  teRender1099RList(type);
  teRecalculate();
}

function teUpd1099R(type, i, field, val) {
  let key     = type === 'ira' ? 'ira1099r' : 'pension1099r';
  let entries = teCurrentReturn[key];
  if (!entries || !entries[i]) return;
  teMarkDirty();
  let oldGross = entries[i].grossDist;
  entries[i][field] = val;
  // Auto-sync: when grossDist changes, update taxableDist if it was blank or matched the old grossDist
  if (field === 'grossDist') {
    if (!entries[i].taxableDist || entries[i].taxableDist === oldGross) {
      entries[i].taxableDist = val;
      let tdEl = document.getElementById('te-1099r-' + type + '-' + i + '-td');
      if (tdEl) tdEl.value = val;
    }
    // Live-update total bar
    let tot = entries.reduce((s, e) => s + (parseFloat(e.taxableDist) || 0), 0);
    let totEl = document.getElementById(type === 'ira' ? 'te-ira-total-val' : 'te-pension-total-val');
    if (totEl) totEl.textContent = teFmt(tot);
  }
  if (field === 'taxableDist') {
    let tot = entries.reduce((s, e) => s + (parseFloat(e.taxableDist) || 0), 0);
    let totEl = document.getElementById(type === 'ira' ? 'te-ira-total-val' : 'te-pension-total-val');
    if (totEl) totEl.textContent = teFmt(tot);
  }
  teRecalculate();
}

function teRm1099R(type, i) {
  let key = type === 'ira' ? 'ira1099r' : 'pension1099r';
  teMarkDirty();
  teCurrentReturn[key].splice(i, 1);
  teRender1099RList(type);
  teRecalculate();
}


function teRender1099() {
  let r    = teCurrentReturn;
  let inv  = (r && r.schedule1099) || {};
  let calc = (r && r._calc)        || {};
  let hasInt = calc.interestIncome    > 0;
  let hasDiv = calc.ordinaryDividends > 0;
  return `
    <div class="te-frow" style="align-items:flex-end;gap:12px;flex-wrap:wrap;margin-top:8px;">
      <div class="te-field-group" style="max-width:200px;">
        <label class="te-lbl">Total Interest Income <span class="te-cite">IRC §61(a)(4)</span></label>
        <input type="number" id="te-1099-int" class="te-input te-mono"
          value="${esc(String(inv.interestIncome||''))}" placeholder="0.00" step="0.01" min="0"
          oninput="teOn1099()">
      </div>
      <div class="te-field-group" style="max-width:200px;">
        <label class="te-lbl">Ordinary Dividends (Box 1a) <span class="te-cite">IRC §61(a)(7)</span></label>
        <input type="number" id="te-1099-div-ord" class="te-input te-mono"
          value="${esc(String(inv.ordinaryDividends||''))}" placeholder="0.00" step="0.01" min="0"
          oninput="teOn1099()">
      </div>
      <div class="te-field-group" style="max-width:200px;">
        <label class="te-lbl">Qualified Dividends (Box 1b) <span class="te-cite">IRC §1(h)(11)</span></label>
        <input type="number" id="te-1099-div-qual" class="te-input te-mono"
          value="${esc(String(inv.qualifiedDividends||''))}" placeholder="0.00" step="0.01" min="0"
          oninput="teOn1099()">
      </div>
    </div>
    ${(hasInt || hasDiv) ? `
    <div class="te-ded-note" style="margin-top:6px;">
      ${hasInt ? 'Interest: ' + teFmt(calc.interestIncome) + ' (ordinary rates)' : ''}
      ${hasInt && hasDiv ? ' &nbsp;|&nbsp; ' : ''}
      ${hasDiv ? 'Dividends: ' + teFmt(calc.ordinaryDividends) + ' total — '
        + teFmt(calc.qualifiedDividends) + ' qualified (preferential rate), '
        + teFmt(calc.ordinaryDividends - calc.qualifiedDividends) + ' non-qualified (ordinary rate)' : ''}
      ${calc.qdltcg > 0 ? ' &nbsp;|&nbsp; <strong>' + teFmt(calc.qdltcg) + '</strong> total in preferential rate pool' : ''}
    </div>` : ''}
    <div class="te-ded-note" style="margin-top:4px;">Qualified dividends must not exceed ordinary dividends (Box 1b ≤ Box 1a). The engine enforces this automatically. <span class="te-cite">IRC §1(h)(11)(B)</span></div>
    <div class="te-frow" style="align-items:flex-end;gap:12px;flex-wrap:wrap;margin-top:12px;">
      <div class="te-field-group" style="max-width:200px;">
        <label class="te-lbl">Tax-Exempt Interest (Box 8) <span class="te-cite">1040 Line 2a</span></label>
        <input type="number" id="te-1099-tex" class="te-input te-mono"
          value="${esc(String(inv.taxExemptInterest||''))}" placeholder="0.00" step="0.01" min="0"
          oninput="teOn1099()">
      </div>
    </div>
    <div class="te-ded-note" style="margin-top:4px;">Tax-exempt interest does <strong>not</strong> affect taxable income, but is included in the Social Security provisional income calculation under IRC §86(b)(1). Enter the amount from 1099-INT Box 8 or similar tax-exempt interest statements. <span class="te-cite">IRC §86(b)(1); 1040 Line 2a</span></div>`;
}

// ── Schedule D rendering helpers ─────────────────────────────────────

// Renders a single per-transaction row (ST or LT table).
// part: 'st' | 'lt'   tx: transaction object   idx: row index
function teSDTxRowHTML(part, tx, idx) {
  let proceeds = parseFloat(tx.proceeds)    || 0;
  let cost     = parseFloat(tx.cost)        || 0;
  let adj      = parseFloat(tx.adjustments) || 0;
  let gain     = teRound(proceeds - cost + adj);
  let hasAmts  = tx.proceeds || tx.cost || tx.description;
  let daysHeld = null;
  if (tx.dateAcquired && tx.dateSold) {
    let a = new Date(tx.dateAcquired), b = new Date(tx.dateSold);
    if (!isNaN(a.getTime()) && !isNaN(b.getTime())) daysHeld = Math.floor((b - a) / 86400000);
  }
  let showWarn = daysHeld !== null && hasAmts;
  let isWrong  = showWarn && (part === 'st' ? daysHeld > 365 : daysHeld <= 365);
  let warnBtn  = part === 'st'
    ? `<button class="te-sd-tx-warn-btn" onclick="teSchedDMoveTx('st',${idx})">&#9888; Held &gt; 1 year &mdash; Move to Part II (Long-Term)</button>`
    : `<button class="te-sd-tx-warn-btn" onclick="teSchedDMoveTx('lt',${idx})">&#9888; Held &le; 1 year &mdash; Move to Part I (Short-Term)</button>`;
  let gainDisplay = hasAmts
    ? (gain >= 0 ? teFmt(gain) : '(' + teFmt(Math.abs(gain)) + ')')
    : '&mdash;';
  return `<div class="te-sd-tx-row" id="te-sd-${part}-row-${idx}">
    <div class="te-sd-tx-cols">
      <input type="text"   class="te-input te-sd-col-desc"    placeholder="e.g., 100 sh. AAPL"
        value="${esc(tx.description||'')}"   oninput="teOnSchedDTx('${part}',${idx},'description',this.value)">
      <input type="date"   class="te-input te-sd-col-date"
        value="${esc(tx.dateAcquired||'')}"  onchange="teOnSchedDTx('${part}',${idx},'dateAcquired',this.value)">
      <input type="date"   class="te-input te-sd-col-date"
        value="${esc(tx.dateSold||'')}"      onchange="teOnSchedDTx('${part}',${idx},'dateSold',this.value)">
      <input type="number" class="te-input te-mono te-sd-col-amt" step="0.01" min="0" placeholder="0.00"
        value="${esc(String(tx.proceeds||''))}"    oninput="teOnSchedDTx('${part}',${idx},'proceeds',this.value)">
      <input type="number" class="te-input te-mono te-sd-col-amt" step="0.01" min="0" placeholder="0.00"
        value="${esc(String(tx.cost||''))}"        oninput="teOnSchedDTx('${part}',${idx},'cost',this.value)">
      <input type="number" class="te-input te-mono te-sd-col-adj" step="0.01" placeholder="0.00"
        value="${esc(String(tx.adjustments||''))}" oninput="teOnSchedDTx('${part}',${idx},'adjustments',this.value)">
      <span class="te-sd-col-gain te-mono ${gain >= 0 ? 'te-sd-gain-pos' : 'te-sd-gain-neg'}"
        id="te-sd-${part}-gain-${idx}">${gainDisplay}</span>
      <button class="te-sd-tx-del" onclick="teSchedDDelTx('${part}',${idx})" title="Remove">&#10005;</button>
    </div>
    ${isWrong ? `<div class="te-sd-tx-warn">${warnBtn}</div>` : ''}
  </div>`;
}

// Renders a Part I or Part II additional-line input row (lines 4–6 and 11–14).
function teSDLineRow(lineNum, label, field, val, helper, isCarryover) {
  let absVal = Math.abs(parseFloat(val)||0);
  return `<div class="te-sd-line-row">
    <span class="te-sd-line-num">${lineNum}</span>
    <span class="te-sd-line-lbl">${label}${helper ? `<span class="te-sd-line-note">${helper}</span>` : ''}</span>
    <div class="te-sd-line-inp-wrap">
      ${isCarryover && absVal > 0 ? `<span class="te-sd-line-paren te-sd-gain-neg te-mono">(${teFmt(absVal)})</span>` : ''}
      <input type="number" class="te-input te-mono te-sd-smry-inp" step="0.01" min="0"
        placeholder="0.00"
        value="${esc(String(val||''))}" oninput="teOnSchedD('${field}',this.value)">
    </div>
  </div>`;
}

// Full Schedule D — Capital Gains and Losses form (mini-screen).
// Data flow: transactions -> lines 1a/8a -> lines 7/15 -> line 16 -> Form 1040 line 7a
// IRC §1221 (capital asset definition), §1222 (holding period + netting), §1211(b) (loss cap)
function teRenderScheduleD() {
  let r     = teCurrentReturn;
  let sd    = (r && r.scheduleD) || {};
  let calc  = (r && r._calc)    || {};
  let sl    = calc.sdLines      || {};
  let qof   = sd.qualifiedOpportunityFund;
  let stTxs = sd.shortTermTransactions || [{ id:'st-0',description:'',dateAcquired:'',dateSold:'',proceeds:'',cost:'',adjustments:'' }];
  let ltTxs = sd.longTermTransactions  || [{ id:'lt-0',description:'',dateAcquired:'',dateSold:'',proceeds:'',cost:'',adjustments:'' }];
  let l7    = sl.l7  || 0;
  let l15   = sl.l15 || 0;
  let l16   = sl.l16 || 0;
  let l17yes = sl.l17yes || false;
  let l21   = sl.l21 || 0;
  let qualDivs = parseFloat((r && r.schedule1099 && r.schedule1099.qualifiedDividends) || 0);
  let r28   = parseFloat(sd.rate28Gain||0)       || 0;
  let r19   = parseFloat(sd.unrecaptured1250||0) || 0;

  return `<div class="te-sch-d">
    <!-- Qualified Opportunity Fund question — IRC §1400Z-2(c) -->
    <div class="te-sd-qof-row">
      <span class="te-sd-qof-lbl">Did you dispose of any investment(s) in a qualified opportunity fund during the tax year?</span>
      <span class="te-sd-toggle-wrap">
        <label class="te-sc-radio-lbl"><input type="radio" name="te-sd-qof" value="no" ${!qof?'checked':''}
          onchange="teOnSchedD('qualifiedOpportunityFund',false)"> No</label>
        <label class="te-sc-radio-lbl" style="margin-left:10px;"><input type="radio" name="te-sd-qof" value="yes" ${qof?'checked':''}
          onchange="teOnSchedD('qualifiedOpportunityFund',true)"> Yes</label>
      </span>
    </div>
    ${qof ? `<div class="te-sd-qof-note">Attach Form 8949 &mdash; additional reporting required for QOF dispositions. <span class="te-cite">IRC &sect;1400Z-2(c)</span></div>` : ''}

    <!-- ═══ PART I — SHORT-TERM ═══════════════════════════════════════ -->
    <div class="te-sd-section-label">Part I &mdash; Short-Term Capital Gains and Losses</div>
    <div class="te-sd-section-sub">Generally assets held one year or less &middot; <span class="te-cite">IRC &sect;1222(1)&ndash;(4)</span></div>
    <div class="te-sd-consolidation-note">Lines 1a, 1b, 2, and 3 are consolidated into one transaction table. All short-term transactions sum together regardless of Form 8949 box type.</div>

    <div class="te-sd-tbl-hdr">
      <span class="te-sd-col-desc">Description of Property</span>
      <span class="te-sd-col-date">Acquired</span>
      <span class="te-sd-col-date">Sold</span>
      <span class="te-sd-col-amt">Proceeds (d)</span>
      <span class="te-sd-col-amt">Cost/Basis (e)</span>
      <span class="te-sd-col-adj">Adj. (f)</span>
      <span class="te-sd-col-gain">Gain/(Loss) (g)</span>
      <span class="te-sd-col-del"></span>
    </div>
    <div id="te-sd-st-rows">${stTxs.map((tx,i) => teSDTxRowHTML('st',tx,i)).join('')}</div>
    <div class="te-sd-totals-row">
      <span class="te-sd-col-desc te-sd-tot-lbl">Line 1a Totals:</span>
      <span class="te-sd-col-date"></span><span class="te-sd-col-date"></span>
      <span class="te-sd-col-amt te-mono" id="te-sd-l1a-p">${teFmt(sl.line1aProc||0)}</span>
      <span class="te-sd-col-amt te-mono" id="te-sd-l1a-c">${teFmt(sl.line1aCost||0)}</span>
      <span class="te-sd-col-adj"></span>
      <span class="te-sd-col-gain te-mono ${(sl.line1aGain||0)>=0?'te-sd-gain-pos':'te-sd-gain-neg'}"
        id="te-sd-l1a-g">${(sl.line1aGain||0)>=0?teFmt(sl.line1aGain||0):'('+teFmt(Math.abs(sl.line1aGain||0))+')'}</span>
      <span class="te-sd-col-del"></span>
    </div>
    <button class="ghost-btn te-sm-btn" onclick="teSchedDAddTx('st')" style="margin:4px 0 14px;">+ Add Short-Term Transaction</button>

    <div class="te-sd-part-lines">
      ${teSDLineRow('4','Short-term gain from Form 6252; gain or (loss) from Forms 4684, 6781, and 8824','stGainForm6252',sd.stGainForm6252,'Installment sales, casualties, commodities, like-kind exchanges')}
      ${teSDLineRow('5','Net short-term gain or (loss) from Schedule(s) K-1','stGainK1',sd.stGainK1,'From Schedule K-1, Box 8 or equivalent')}
      ${teSDLineRow('6','Short-term capital loss carryover','stLossCarryover',sd.stLossCarryover,'From prior year Capital Loss Carryover Worksheet &mdash; <span class="te-cite">IRC &sect;1212(b)</span>',true)}
    </div>

    <div class="te-sd-net-line ${l7>=0?'te-sd-profit':'te-sd-loss'}" id="te-sd-l7-bar">
      <div>
        <div class="te-sd-net-lbl">Line 7 &mdash; Net Short-Term Capital Gain or (Loss)</div>
        <div class="te-sd-net-sub">Line 1a + lines 4 + 5 &minus; line 6 &middot; <span class="te-cite">IRC &sect;1222(5),(6)</span></div>
      </div>
      <div class="te-sd-net-amt ${l7>=0?'te-sd-gain-pos':'te-sd-gain-neg'}" id="te-sd-l7">
        ${l7>=0?teFmt(l7):'('+teFmt(Math.abs(l7))+')'}
      </div>
    </div>

    <!-- ═══ PART II — LONG-TERM ════════════════════════════════════════ -->
    <div class="te-sd-section-label" style="margin-top:28px;">Part II &mdash; Long-Term Capital Gains and Losses</div>
    <div class="te-sd-section-sub">Generally assets held more than one year &middot; <span class="te-cite">IRC &sect;1222(5)&ndash;(8)</span></div>
    <div class="te-sd-consolidation-note">Lines 8a, 8b, 9, and 10 are consolidated into one transaction table.</div>

    <div class="te-sd-tbl-hdr">
      <span class="te-sd-col-desc">Description of Property</span>
      <span class="te-sd-col-date">Acquired</span>
      <span class="te-sd-col-date">Sold</span>
      <span class="te-sd-col-amt">Proceeds (d)</span>
      <span class="te-sd-col-amt">Cost/Basis (e)</span>
      <span class="te-sd-col-adj">Adj. (f)</span>
      <span class="te-sd-col-gain">Gain/(Loss) (g)</span>
      <span class="te-sd-col-del"></span>
    </div>
    <div id="te-sd-lt-rows">${ltTxs.map((tx,i) => teSDTxRowHTML('lt',tx,i)).join('')}</div>
    <div class="te-sd-totals-row">
      <span class="te-sd-col-desc te-sd-tot-lbl">Line 8a Totals:</span>
      <span class="te-sd-col-date"></span><span class="te-sd-col-date"></span>
      <span class="te-sd-col-amt te-mono" id="te-sd-l8a-p">${teFmt(sl.line8aProc||0)}</span>
      <span class="te-sd-col-amt te-mono" id="te-sd-l8a-c">${teFmt(sl.line8aCost||0)}</span>
      <span class="te-sd-col-adj"></span>
      <span class="te-sd-col-gain te-mono ${(sl.line8aGain||0)>=0?'te-sd-gain-pos':'te-sd-gain-neg'}"
        id="te-sd-l8a-g">${(sl.line8aGain||0)>=0?teFmt(sl.line8aGain||0):'('+teFmt(Math.abs(sl.line8aGain||0))+')'}</span>
      <span class="te-sd-col-del"></span>
    </div>
    <button class="ghost-btn te-sm-btn" onclick="teSchedDAddTx('lt')" style="margin:4px 0 14px;">+ Add Long-Term Transaction</button>

    <div class="te-sd-part-lines">
      ${teSDLineRow('11','Gain from Form 4797 Part I; long-term gain from Forms 2439 and 6252; gain or (loss) from Forms 4684, 6781, and 8824','ltGainForm4797',sd.ltGainForm4797,'Business property sales, undistributed capital gains, installment sales, casualties, commodities, like-kind exchanges')}
      ${teSDLineRow('12','Net long-term gain or (loss) from Schedule(s) K-1','ltGainK1',sd.ltGainK1,'From Schedule K-1, Box 9a or equivalent')}
      ${teSDLineRow('13','Capital gain distributions','capitalGainDistributions',sd.capitalGainDistributions,'From Form 1099-DIV, Box 2a &mdash; mutual fund distributions &mdash; <span class="te-cite">IRC &sect;852(b)(3)(C)</span>')}
      ${teSDLineRow('14','Long-term capital loss carryover','ltLossCarryover',sd.ltLossCarryover,'From prior year Capital Loss Carryover Worksheet &mdash; <span class="te-cite">IRC &sect;1212(b)</span>',true)}
    </div>

    <div class="te-sd-net-line ${l15>=0?'te-sd-profit':'te-sd-loss'}" id="te-sd-l15-bar">
      <div>
        <div class="te-sd-net-lbl">Line 15 &mdash; Net Long-Term Capital Gain or (Loss)</div>
        <div class="te-sd-net-sub">Line 8a + lines 11 + 12 + 13 &minus; line 14 &middot; <span class="te-cite">IRC &sect;1222(7),(8)</span></div>
      </div>
      <div class="te-sd-net-amt ${l15>=0?'te-sd-gain-pos':'te-sd-gain-neg'}" id="te-sd-l15">
        ${l15>=0?teFmt(l15):'('+teFmt(Math.abs(l15))+')'}
      </div>
    </div>

    <!-- ═══ PART III — SUMMARY ═════════════════════════════════════════ -->
    <div id="te-sd-p3-wrap" style="transition:opacity 0.2s;${!sl.detailedActive?'opacity:0.35;pointer-events:none;':''}">
    <div class="te-sd-section-label" style="margin-top:28px;">Part III &mdash; Summary</div>

    <div class="te-sd-net-line ${l16>=0?'te-sd-profit':'te-sd-loss'}" id="te-sd-l16-bar" style="margin-top:8px;">
      <div>
        <div class="te-sd-net-lbl" style="font-size:14px;">Line 16 &mdash; Net Capital Gain or (Loss)</div>
        <div class="te-sd-net-sub">Line 7 + Line 15 &middot; <span class="te-cite">IRC &sect;1222</span></div>
        ${l16 > 0 ? `<div class="te-sd-flow-note te-sd-gain-pos">&#10003; Gain flows to Form 1040, line 7a</div>` : ''}
        ${l16 < 0 ? `<div class="te-sd-flow-note te-sd-gain-neg">See line 21 for deductible loss limit &mdash; <span class="te-cite">IRC &sect;1211(b)</span></div>` : ''}
      </div>
      <div class="te-sd-net-amt ${l16>=0?'te-sd-gain-pos':'te-sd-gain-neg'}" style="font-size:20px;" id="te-sd-l16">
        ${l16>=0?teFmt(l16):'('+teFmt(Math.abs(l16))+')'}
      </div>
    </div>

    <div class="te-sd-summary-lines">
      <div class="te-sd-smry-row">
        <span class="te-sd-smry-num">17</span>
        <span class="te-sd-smry-lbl">Are lines 15 and 16 both gains?</span>
        <span class="te-sd-smry-val ${l17yes?'te-sd-gain-pos':'te-sd-dimmed'}" id="te-sd-l17">
          ${l17yes ? 'Yes &mdash; complete lines 18 and 19 below' : 'No &mdash; skip to line 21'}
        </span>
      </div>

      <div class="te-sd-smry-row ${!l17yes?'te-sd-dimmed':''}" id="te-sd-l18-row">
        <span class="te-sd-smry-num">18</span>
        <span class="te-sd-smry-lbl">28% Rate Gain <span class="te-cite">IRC &sect;1(h)(1)(E)</span>
          <span class="te-sd-smry-note">Collectibles gains (art, antiques, coins, stamps) and &sect;1202 exclusion amounts</span></span>
        <input type="number" class="te-input te-mono te-sd-smry-inp" step="0.01" min="0" placeholder="0.00"
          value="${esc(String(sd.rate28Gain||''))}" ${!l17yes?'disabled':''} oninput="teOnSchedD('rate28Gain',this.value)">
      </div>

      <div class="te-sd-smry-row ${!l17yes?'te-sd-dimmed':''}" id="te-sd-l19-row">
        <span class="te-sd-smry-num">19</span>
        <span class="te-sd-smry-lbl">Unrecaptured Section 1250 Gain <span class="te-cite">IRC &sect;1(h)(1)(D)</span>
          <span class="te-sd-smry-note">Straight-line depreciation recapture on real property &mdash; max 25% rate. Not yet in engine (future track).</span></span>
        <input type="number" class="te-input te-mono te-sd-smry-inp" step="0.01" min="0" placeholder="0.00"
          value="${esc(String(sd.unrecaptured1250||''))}" ${!l17yes?'disabled':''} oninput="teOnSchedD('unrecaptured1250',this.value)">
      </div>

      <div class="te-sd-smry-row ${!l17yes?'te-sd-dimmed':''}" id="te-sd-l20-row">
        <span class="te-sd-smry-num">20</span>
        <span class="te-sd-smry-lbl">Are lines 18 and 19 both zero or blank?</span>
        <span class="te-sd-smry-val" id="te-sd-l20">
          ${(r28===0&&r19===0) ? 'Yes &mdash; use Qualified Dividends and Capital Gain Tax Worksheet' : 'No &mdash; use Schedule D Tax Worksheet'}
        </span>
      </div>

      <div class="te-sd-smry-row te-sd-loss-row" id="te-sd-l21-row" style="${l16>=0?'display:none':''}">
        <span class="te-sd-smry-num">21</span>
        <span class="te-sd-smry-lbl">Capital loss deduction <span class="te-cite">IRC &sect;1211(b)(1)</span>
          <span class="te-sd-smry-note">Max: ($3,000) or ($1,500) MFS &mdash; unused losses carry forward</span></span>
        <span class="te-sd-smry-val te-sd-gain-neg te-mono" id="te-sd-l21">(${teFmt(Math.abs(l21))})</span>
      </div>

      <div class="te-sd-smry-row" id="te-sd-l22-row">
        <span class="te-sd-smry-num">22</span>
        <span class="te-sd-smry-lbl">Do you have qualified dividends?</span>
        <span class="te-sd-smry-val" id="te-sd-l22">
          ${qualDivs>0 ? 'Yes &mdash; use Qualified Dividends and Capital Gain Tax Worksheet' : 'No &mdash; complete the rest of Form 1040'}
        </span>
      </div>
    </div>

    <div class="te-sd-rate-note">
      <strong>Preferential Rate Computation</strong> &mdash; <span class="te-cite">IRC &sect;1(h)</span><br>
      Engine applies the QDLTCG Tax Worksheet automatically when LTCG or qualified dividends are present.
      Preferential pool taxed at 0% / 15% / 20% using <em>zeroRateCeiling</em> / <em>fifteenRateCeiling</em> breakpoints
      from TAX_CONSTANTS (verified via Rev. Proc. 2024-40 / Rev. Proc. 2025-32).
      ${(r28>0||r19>0) ? `<div class="te-sd-rate-warn">&#9888; Lines 18 or 19 are present. The 28% and 25% rate buckets require the Schedule D Tax Worksheet, which is not yet in the engine. Do not file until those buckets are computed separately.</div>` : ''}
    </div>
    </div><!-- /te-sd-p3-wrap -->
  </div>`;
}

function teRenderScheduleEList() {
  let c = document.getElementById('te-sche-list');
  if (!c) return;
  let entities = teCurrentReturn.scheduleE || [];
  let calc     = teCurrentReturn._calc || {};
  if (entities.length === 0) {
    c.innerHTML = '<div class="te-empty">No entities added. Click "+ Add Entity" to add K-1 income.</div>';
    return;
  }
  let etLabels = { partnership: 'Partnership', scorp: 'S-Corporation', trust: 'Trust/Estate', ccorp: 'C-Corporation' };
  let colStyle = 'display:grid;grid-template-columns:2fr 100px 150px 100px 110px auto 28px;gap:8px;align-items:center;';
  c.innerHTML = `
    <div class="te-w2-tbl" style="margin-top:8px;">
      <div style="${colStyle}padding:0 4px 7px;font-size:9px;font-weight:800;color:var(--text-dim);text-transform:uppercase;letter-spacing:0.08em;border-bottom:1px solid var(--border);">
        <span>Entity Name</span><span>EIN</span><span>Entity Type</span><span>Income/(Loss)</span><span>§199A QBI</span><span>Passive?</span><span></span>
      </div>
      ${entities.map((e, i) => {
        let isCCorp = (e.entityType || 'partnership') === 'ccorp';
        return `
        <div style="${colStyle}padding:5px 4px;border-bottom:1px solid rgba(30,45,69,0.4);">
          <input type="text" class="te-input" value="${esc(e.name||'')}" placeholder="Entity name"
            oninput="teOnScheduleE(${i},'name',this.value)">
          <input type="text" class="te-input" value="${esc(e.ein||'')}" placeholder="XX-XXXXXXX"
            oninput="teOnScheduleE(${i},'ein',this.value)">
          <select class="te-input" onchange="teOnScheduleE(${i},'entityType',this.value)"
            title="Entity type determines K-1 box mapping and §199A eligibility. C-Corporation income is not eligible for the §199A QBI deduction.">
            ${['partnership','scorp','trust','ccorp'].map(t =>
              `<option value="${t}"${(e.entityType||'partnership')===t?' selected':''}>${etLabels[t]}</option>`
            ).join('')}
          </select>
          <input type="number" class="te-input te-mono" value="${e.incomeAmount||''}" placeholder="0.00" step="0.01"
            oninput="teOnScheduleE(${i},'incomeAmount',this.value)">
          <input type="number" class="te-input te-mono" value="${isCCorp ? '' : (e.qbiAmount||'')}"
            placeholder="${isCCorp ? 'N/A' : '0.00'}" step="0.01"
            ${isCCorp ? 'disabled title="C-Corporation income is not eligible for the §199A QBI deduction."' : `title="Enter the §199A QBI amount from K-1 (Partnership Box 20 Code Z / S-Corp Box 17 Code V). May differ from income/(loss) above."`}
            style="${isCCorp ? 'opacity:0.35;' : ''}"
            oninput="teOnScheduleE(${i},'qbiAmount',this.value)">
          <label style="display:flex;align-items:center;gap:5px;font-size:12px;white-space:nowrap;">
            <input type="checkbox" ${e.isPassive ? 'checked' : ''} onchange="teOnScheduleE(${i},'isPassive',this.checked)">
            Passive <span class="te-cite" style="font-size:10px;">§469</span>
          </label>
          <button class="te-rm-btn" onclick="teRmScheduleE(${i})">✕</button>
        </div>`;
      }).join('')}
    </div>
    ${calc.passiveLossSuspended > 0 ? `
    <div class="te-ded-note" style="margin-top:6px;color:#f5a623;">
      ⚠ Suspended passive loss: ${teFmt(calc.passiveLossSuspended)} — not currently deductible. Passive losses can only offset passive income. <span class="te-cite">IRC §469(a)</span>
    </div>` : ''}
    <div class="te-ded-note" style="margin-top:4px;">
      Passive: ${teFmt(calc.scheduleEPassive)} &nbsp;|&nbsp; Non-passive: ${teFmt(calc.scheduleENonPassive)} &nbsp;|&nbsp; Net flowing to gross income: ${teFmt(calc.scheduleENet)}
      &nbsp;|&nbsp; <strong>§199A QBI from entities: ${teFmt(calc.schedEQBI || 0)}</strong>
    </div>
    <div class="te-ded-note" style="margin-top:4px;">
      §199A QBI: Enter the amount reported on K-1 (Partnership Box 20 Code Z; S-Corp Box 17 Code V). This may differ from the income/(loss) above — the entity applies its own deductions before reporting QBI. C-Corporation income is never eligible. <span class="te-cite">IRC §199A(c); IRC §199A(f)(1)</span>
    </div>`;
}

// ──────────────────────────────────────────────────────────────────────
//  SCHEDULE 1, PART I — ADDITIONAL INCOME
// ──────────────────────────────────────────────────────────────────────

function teRenderSchedule1PI() {
  let r   = teCurrentReturn;
  let s1  = (r && r.schedule1)                    || {};
  let ln  = (r && r._calc && r._calc.sched1Lines) || {};
  let c   = (r && r._calc)                        || {};
  let yr  = r ? (r.taxYear || teActiveYear) : teActiveYear;

  let fmtPM = v => v === 0 ? '$0.00' : v > 0 ? teFmt(v) : '(' + teFmt(Math.abs(v)) + ')';

  // ── Row helpers ────────────────────────────────────────────────────

  // Full-width editable row — lines 1–7
  let iRow = (num, label, stateKey, val, note='', isNeg=false) =>
    `<div class="te-sc-row te-s1-row">
       <span class="te-sc-num">${num}</span>
       <span class="te-sc-lbl">${label}${isNeg ? '<span class="te-s1-neg-tag">negative</span>' : ''}${note ? `<span class="te-sc-note">${note}</span>` : ''}</span>
       <input type="number" class="te-input te-mono te-sc-inp" step="0.01" min="0"
         value="${esc(String(val||''))}" placeholder="0.00"
         oninput="teOnSched1PI('${stateKey}',this.value)">
     </div>`;

  // Two-column editable row — lines 8a–8v (shorter labels, no note)
  // groupStart: adds top border to mark the start of a new logical cluster within a column
  let iRow2 = (num, label, stateKey, val, isNeg=false, groupStart=false) =>
    `<div class="te-sc-row te-s1-row te-s1-col-row${groupStart ? ' te-s1-group-start' : ''}">
       <span class="te-sc-num">${num}</span>
       <span class="te-sc-lbl te-s1-col-lbl">${label}${isNeg ? '<span class="te-s1-neg-tag">negative</span>' : ''}</span>
       <input type="number" class="te-input te-mono te-sc-inp te-s1-col-inp" step="0.01" min="0"
         value="${esc(String(val||''))}" placeholder="0.00"
         oninput="teOnSched1PI('${stateKey}',this.value)">
     </div>`;

  // Read-only auto-populated row — id always on the inner span for live DOM updates
  let rRow = (num, label, valId, displayVal, linkSched='', note='') => {
    let inner = linkSched
      ? `<span id="${valId}" class="te-s1-ro-link" onclick="teOpenSchedule('${linkSched}','sched-1')">${displayVal}</span>`
      : `<span id="${valId}">${displayVal}</span>`;
    return `<div class="te-sc-row te-s1-row te-s1-ro-row">
       <span class="te-sc-num">${num}</span>
       <span class="te-sc-lbl">${label}${note ? `<span class="te-sc-note">${note}</span>` : ''}</span>
       <span class="te-sc-val">${inner}</span>
     </div>`;
  };

  // Computed total row — lines 9, optionally with extra class
  let tRow = (num, label, valId, displayVal, extraCls='') =>
    `<div class="te-sc-row te-sc-row-total${extraCls ? ' ' + extraCls : ''}">
       <span class="te-sc-num">${num}</span>
       <span class="te-sc-lbl">${label}</span>
       <span class="te-sc-val te-mono" id="${valId}">${displayVal}</span>
     </div>`;

  // Display values for auto-populated read-only lines
  let l3val = ln.l3 !== undefined ? fmtPM(ln.l3) : fmtPM(parseFloat((r.scheduleC||{}).netProfit)||0);
  let l5val = ln.l5 !== undefined ? fmtPM(ln.l5) : fmtPM(c.scheduleENet||0);
  let l6val = ln.l6 !== undefined ? teFmt(ln.l6) : teFmt(0);

  // 8z dynamic rows
  let s1OtherRows = s1.otherIncomeRows || [];
  let s1OtherHtml = `<div id="te-s1-8z-rows">${s1OtherRows.map((row, i) =>
    `<div class="te-sc-row te-s1-row" style="gap:8px;">
       <span class="te-sc-num">—</span>
       <input type="text" class="te-input te-sc-lbl-inp" style="flex:1;" placeholder="Type of income"
         value="${esc(row.type||'')}" oninput="teOnS1OtherIncome(${i},'type',this.value)">
       <input type="number" class="te-input te-mono te-sc-inp" step="0.01"
         value="${esc(String(row.amount||''))}" placeholder="0.00"
         oninput="teOnS1OtherIncome(${i},'amount',this.value)">
       <button class="te-sc-del-btn" onclick="teS1DelOtherIncome(${i})" title="Remove row">✕</button>
     </div>`).join('')}</div>`;

  let l10 = ln.l10 || 0;

  return `
    <!-- 1099-K — compact inline row -->
    <div class="te-sc-section-label">Form(s) 1099-K &mdash; Amounts Included in Error or Personal Items Sold at a Loss</div>
    <div class="te-sc-row te-s1-row">
      <span class="te-sc-num">—</span>
      <span class="te-sc-lbl">Amount included in error or personal items sold at a loss
        <span class="te-sc-note" style="font-style:italic;">Informational only &mdash; does not flow to line 10.</span>
      </span>
      <input type="number" class="te-input te-mono te-sc-inp" step="0.01" min="0"
        value="${esc(String(s1.k1099Amount||''))}" placeholder="0.00"
        oninput="teOnSched1PI('k1099Amount',this.value)">
    </div>

    <!-- Part I — Lines 1–7 -->
    <div class="te-sc-section-label">Part I &mdash; Additional Income &nbsp;<span class="te-cite" style="font-weight:400;">IRC §61</span></div>

    ${iRow('1',  'Taxable refunds, credits, or offsets of state and local income taxes', 'taxRefunds', s1.taxRefunds, 'IRC §111(a)')}
    ${iRow('2a', 'Alimony received', 'alimonyReceived', s1.alimonyReceived, 'Pre-2019 agreements only &mdash; IRC §71')}

    <div class="te-sc-row te-s1-row">
      <span class="te-sc-num">2b</span>
      <span class="te-sc-lbl">Date of original divorce or separation agreement</span>
      <input type="date" class="te-input te-mono te-sc-inp" style="max-width:160px;"
        value="${esc(s1.alimonyDate||'')}"
        onchange="teOnSched1PI('alimonyDate',this.value)">
    </div>

    ${rRow('3', 'Business income or (loss) &nbsp;<span class="te-cite">Schedule C</span>', 'te-s1-l3', l3val, 'sched-c', 'Click to open Schedule C')}

    <div class="te-sc-row te-s1-row">
      <span class="te-sc-num">4</span>
      <span class="te-sc-lbl">Other gains or (losses)
        <label class="te-sc-radio-lbl" style="margin-left:10px;">
          <input type="checkbox" ${s1.otherGainsForm4797?'checked':''} onchange="teOnSched1PI('otherGainsForm4797',this.checked)"> Form 4797
        </label>
        <label class="te-sc-radio-lbl">
          <input type="checkbox" ${s1.otherGainsForm4684?'checked':''} onchange="teOnSched1PI('otherGainsForm4684',this.checked)"> Form 4684
        </label>
      </span>
      <input type="number" class="te-input te-mono te-sc-inp" step="0.01"
        value="${esc(String(s1.otherGains||''))}" placeholder="0.00"
        oninput="teOnSched1PI('otherGains',this.value)">
    </div>

    ${rRow('5', 'Rental real estate, royalties, partnerships, S corps, trusts &nbsp;<span class="te-cite">Schedule E</span>', 'te-s1-l5', l5val, 'sched-e', 'Click to open Schedule E')}
    ${rRow('6', 'Farm income or (loss) &nbsp;<span class="te-cite">Schedule F</span>', 'te-s1-l6', l6val, '', 'Auto from Schedule SE &mdash; Schedule F form coming in a future update')}

    <div class="te-sc-row te-s1-row" style="flex-wrap:wrap;gap:4px 0;">
      <span class="te-sc-num">7</span>
      <span class="te-sc-lbl">Unemployment compensation &nbsp;<span class="te-cite">IRC §85(a)</span></span>
      <input type="number" class="te-input te-mono te-sc-inp" step="0.01" min="0"
        value="${esc(String(s1.unemployment||''))}" placeholder="0.00"
        oninput="teOnSched1PI('unemployment',this.value)">
      <div style="width:100%;padding-left:40px;margin-top:2px;display:flex;align-items:center;gap:10px;">
        <label class="te-sc-radio-lbl">
          <input type="checkbox" id="te-s1-unemp-repaid" ${s1.unemploymentRepaid?'checked':''}
            onchange="teOnSched1PI('unemploymentRepaid',this.checked)">
          Repaid prior year overpayment
        </label>
        <div id="te-s1-unemp-repaid-wrap" style="display:${s1.unemploymentRepaid?'flex':'none'};align-items:center;gap:6px;">
          <span class="te-sc-note">Repayment amount:</span>
          <input type="number" class="te-input te-mono" style="width:110px;" step="0.01" min="0"
            value="${esc(String(s1.unemploymentRepaidAmt||''))}" placeholder="0.00"
            oninput="teOnSched1PI('unemploymentRepaidAmt',this.value)">
        </div>
      </div>
    </div>

    <!-- Lines 8a–8v: two-column grid -->
    <div class="te-sc-section-label" style="margin-top:12px;">Other Income &mdash; Lines 8a&ndash;8z</div>

    <!-- Flat 2-column grid: elements interleaved left-right so CSS grid aligns rows by height.
         Order: (8a,8l), (8b,8m), (8c,8n), (8d,8o), (8e,8p), (8f,8q), (8g,8r), (8h,8s),
                (8i,8t), (8j,8u), (8k,8v)
         Group-start borders (per column):
           Left:  8d (group 2), 8g (group 3)
           Right: 8n (group 2), 8q (group 3)                                              -->
    <div class="te-s1-8av-grid">
      ${iRow2('8a', 'Net operating loss <span class="te-cite">IRC §172</span>',            'l8a', s1.l8a, true)}
      ${iRow2('8l', 'Rental of personal property (for profit, not in business)',            'l8l', s1.l8l)}

      ${iRow2('8b', 'Gambling winnings <span class="te-cite">IRC §165(d)</span>',          'l8b', s1.l8b)}
      ${iRow2('8m', 'Olympic/Paralympic medals &amp; USOC prize money <span class="te-cite">IRC §74(d)</span>', 'l8m', s1.l8m)}

      ${iRow2('8c', 'Cancellation of debt <span class="te-cite">IRC §61(a)(12)</span>',    'l8c', s1.l8c)}
      ${iRow2('8n', 'Section 951(a) inclusion (Subpart F)',                                'l8n', s1.l8n, false, true)}

      ${iRow2('8d', 'Foreign earned income exclusion (Form 2555)',                         'l8d', s1.l8d, true,  true)}
      ${iRow2('8o', 'Section 951A(a) inclusion (GILTI)',                                   'l8o', s1.l8o)}

      ${iRow2('8e', 'Income from Form 8853 (Archer MSA)',                                  'l8e', s1.l8e)}
      ${iRow2('8p', 'Section 461(l) excess business loss adjustment',                      'l8p', s1.l8p)}

      ${iRow2('8f', 'Income from Form 8889 (HSA)',                                         'l8f', s1.l8f)}
      ${iRow2('8q', 'ABLE account distributions <span class="te-cite">IRC §529A</span>',  'l8q', s1.l8q, false, true)}

      ${iRow2('8g', 'Alaska Permanent Fund dividends <span class="te-cite">IRC §643(b)</span>', 'l8g', s1.l8g, false, true)}
      ${iRow2('8r', 'Scholarship / fellowship not on W-2',                                 'l8r', s1.l8r)}

      ${iRow2('8h', 'Jury duty pay',                                                       'l8h', s1.l8h)}
      ${iRow2('8s', 'Nontaxable Medicaid waiver payments (Form 1040, line 1a/1d)',         'l8s', s1.l8s, true)}

      ${iRow2('8i', 'Prizes and awards <span class="te-cite">IRC §74(a)</span>',           'l8i', s1.l8i)}
      ${iRow2('8t', 'Nonqualified deferred comp / nongovernmental §457',                   'l8t', s1.l8t)}

      ${iRow2('8j', 'Not-for-profit activity income <span class="te-cite">IRC §183</span>','l8j', s1.l8j)}
      ${iRow2('8u', 'Wages earned while incarcerated',                                     'l8u', s1.l8u)}

      ${iRow2('8k', 'Stock options',                                                        'l8k', s1.l8k)}
      ${iRow2('8v', 'Digital assets as ordinary income (not reported elsewhere)',           'l8v', s1.l8v)}
    </div>

    <!-- Line 8z — full-width dynamic rows -->
    <div class="te-sc-section-label" style="font-size:11px;margin-top:10px;">8z &mdash; Other Income (specify type)</div>
    ${s1OtherHtml}
    <div style="padding-left:40px;margin-top:6px;">
      <button class="ghost-btn te-sm-btn" onclick="teS1AddOtherIncome()">+ Add Other Income</button>
    </div>

    <!-- Line 9 — Total other income (subtotal visual weight) -->
    ${tRow('9', 'Total other income &nbsp;<span class="te-cite">Add lines 8a&ndash;8z</span>', 'te-s1-l9', fmtPM(ln.l9||0), 'te-sc-row-subtotal')}

    <!-- Line 10 — Total Additional Income (highlighted box — unchanged) -->
    <div class="te-sc-net-bar ${l10 >= 0 ? 'te-sc-profit' : 'te-sc-loss'}" id="te-s1-l10-bar" style="margin-top:12px;">
      <div style="display:flex;flex-direction:column;gap:2px;">
        <span style="font-size:11px;font-weight:800;text-transform:uppercase;letter-spacing:0.06em;">
          Line 10 &mdash; Total Additional Income &nbsp;<span class="te-cite">1040 Line 8</span>
        </span>
        <span style="font-size:11px;color:var(--text-dim);">Lines 1 + 2a + 3 + 4 + 5 + 6 + 7 + 9</span>
      </div>
      <span class="te-sc-net-amt" id="te-s1-l10">${l10 >= 0 ? teFmt(l10) : '(' + teFmt(Math.abs(l10)) + ')'}</span>
    </div>

  `;
}

// ── SCHEDULE 1 — COMBINED SCREEN ─────────────────────────────────────
function teRenderSchedule1() {
  let r  = teCurrentReturn;
  let yr = r ? (r.taxYear || teActiveYear) : teActiveYear;
  return `<div class="te-s1-form">
    <div class="te-sc-header-bar te-s1-header">
      <span class="te-sc-title">Schedule 1 &mdash; Additional Income and Adjustments</span>
      <span class="te-sc-subtitle">Tax Year ${yr} &nbsp;&middot;&nbsp; <span class="te-cite">IRC §61, §62</span> &nbsp;&middot;&nbsp; 1040 Lines 8 &amp; 10</span>
    </div>
    ${teRenderSchedule1PI()}
    ${teRenderSchedule1PII()}
  </div>`;
}

// ── SCHEDULE 1 PART I HANDLERS ────────────────────────────────────────

function teOnSched1PI(field, value) {
  if (!teCurrentReturn) return;
  if (!teCurrentReturn.schedule1) teCurrentReturn.schedule1 = {};
  let s1 = teCurrentReturn.schedule1;

  // Boolean fields — immediate
  if (field === 'otherGainsForm4797' || field === 'otherGainsForm4684' || field === 'unemploymentRepaid') {
    s1[field] = value;
    // Toggle repayment amount wrapper visibility
    if (field === 'unemploymentRepaid') {
      let wrap = document.getElementById('te-s1-unemp-repaid-wrap');
      if (wrap) wrap.style.display = value ? 'flex' : 'none';
    }
    teMarkDirty();
    teRecalculate();
    return;
  }

  // Date field — immediate
  if (field === 'alimonyDate') {
    s1[field] = value;
    teMarkDirty();
    return;
  }

  // Number/text fields — debounce 150ms
  s1[field] = value;
  teMarkDirty();
  clearTimeout(teSchedS1Timer);
  teSchedS1Timer = setTimeout(teRecalculate, 150);
}

function teS1AddOtherIncome() {
  if (!teCurrentReturn) return;
  if (!teCurrentReturn.schedule1) teCurrentReturn.schedule1 = {};
  if (!teCurrentReturn.schedule1.otherIncomeRows) teCurrentReturn.schedule1.otherIncomeRows = [];
  teCurrentReturn.schedule1.otherIncomeRows.push({ type: '', amount: '' });
  teMarkDirty();
  teRenderS1OtherIncomeRows();
}

function teS1DelOtherIncome(idx) {
  if (!teCurrentReturn || !teCurrentReturn.schedule1) return;
  let rows = teCurrentReturn.schedule1.otherIncomeRows || [];
  rows.splice(idx, 1);
  teMarkDirty();
  teRenderS1OtherIncomeRows();
  teRecalculate();
}

function teOnS1OtherIncome(idx, field, value) {
  if (!teCurrentReturn || !teCurrentReturn.schedule1) return;
  let rows = teCurrentReturn.schedule1.otherIncomeRows || [];
  if (!rows[idx]) return;
  rows[idx][field] = value;
  teMarkDirty();
  if (field === 'amount') {
    clearTimeout(teSchedS1Timer);
    teSchedS1Timer = setTimeout(teRecalculate, 150);
  }
}

function teRenderS1OtherIncomeRows() {
  let wrap = document.getElementById('te-s1-8z-rows');
  if (!wrap) return;
  let rows = (teCurrentReturn && teCurrentReturn.schedule1 && teCurrentReturn.schedule1.otherIncomeRows) || [];
  wrap.innerHTML = rows.map((row, i) =>
    `<div class="te-sc-row" style="gap:8px;padding-left:40px;">
       <input type="text" class="te-input te-sc-lbl-inp" style="flex:1;" placeholder="Type of income"
         value="${esc(row.type||'')}" oninput="teOnS1OtherIncome(${i},'type',this.value)">
       <input type="number" class="te-input te-mono te-sc-inp" step="0.01"
         value="${esc(String(row.amount||''))}" placeholder="0.00"
         oninput="teOnS1OtherIncome(${i},'amount',this.value)">
       <button class="te-sc-del-btn" onclick="teS1DelOtherIncome(${i})" title="Remove row">✕</button>
     </div>`).join('');
}

// ──────────────────────────────────────────────────────────────────────
// SCHEDULE 1, PART II — Adjustments to Income (Lines 11–26)
// ──────────────────────────────────────────────────────────────────────

function teRenderSchedule1PII() {
  let r  = teCurrentReturn;
  let c  = r._calc || {};
  let s1 = r.schedule1 || {};
  let ln = c.sched1PII_lines || {};
  let fs = r.filingStatus || 'single';
  let yr = r.taxYear || teActiveYear;
  let isMFJ = (fs === 'mfj');

  let fmtRO = v => teFmt(v || 0);  // read-only display formatter

  // ── Row helpers ────────────────────────────────────────────────────

  // Standard single-column editable row
  let iRow = (num, label, stateKey, val, note='') =>
    `<div class="te-sc-row te-s1-row">
       <span class="te-sc-num">${num}</span>
       <span class="te-sc-lbl">${label}${note ? `<span class="te-sc-note">${note}</span>` : ''}</span>
       <input type="number" class="te-input te-mono te-sc-inp" step="0.01" min="0"
         value="${esc(String(val||''))}" placeholder="0.00"
         oninput="teOnSched1PII('${stateKey}',this.value)">
     </div>`;

  // Read-only row with optional clickable link to another screen
  let rRow = (num, label, valId, displayVal, linkSched='', note='') => {
    let inner = linkSched
      ? `<span id="${valId}" class="te-s1-ro-link" onclick="teOpenSchedule('${linkSched}','sched-1')">${displayVal}</span>`
      : `<span id="${valId}">${displayVal}</span>`;
    return `<div class="te-sc-row te-s1-row te-s1-ro-row">
       <span class="te-sc-num">${num}</span>
       <span class="te-sc-lbl">${label}${note ? `<span class="te-sc-note">${note}</span>` : ''}</span>
       <span class="te-sc-val">${inner}</span>
     </div>`;
  };

  // Two-column editable row (same grid as Part I lines 8a–8v)
  let iRow2 = (num, label, stateKey, val, groupStart=false) =>
    `<div class="te-sc-row te-s1-row te-s1-col-row${groupStart ? ' te-s1-group-start' : ''}">
       <span class="te-sc-num">${num}</span>
       <span class="te-sc-lbl te-s1-col-lbl">${label}</span>
       <input type="number" class="te-input te-mono te-sc-inp te-s1-col-inp" step="0.01" min="0"
         value="${esc(String(val||''))}" placeholder="0.00"
         oninput="teOnSched1PII('${stateKey}',this.value)">
     </div>`;

  let l25 = ln.l25 || 0;
  let l26 = ln.l26 || 0;

  return `
    <!-- Part II — Lines 11–26 -->
    <div class="te-sc-section-label" style="margin-top:28px;border-top:2px solid var(--border);padding-top:14px;">Part II &mdash; Adjustments to Income &nbsp;<span class="te-cite" style="font-weight:400;">IRC §62 &middot; 1040 Line 10</span></div>

    ${iRow('11', 'Educator expenses', 'p2L11', s1.p2L11,
        isMFJ ? 'Max $600 (MFJ) &mdash; IRC §62(a)(2)(D)' : 'Max $300 &mdash; IRC §62(a)(2)(D)')}

    ${iRow('12', 'Certain business expenses of reservists, performing artists, and fee-basis government officials &nbsp;<span class="te-cite">(Form 2106)</span>', 'p2L12', s1.p2L12, 'IRC §62(a)(2)(B),(C),(D)')}

    ${rRow('13', 'Health savings account deduction &nbsp;<span class="te-cite">(Form 8889)</span>',
        'te-s2-l13', fmtRO(ln.l13), 'hsa', 'Auto from Form 8889 &mdash; click to edit')}

    <div class="te-sc-row te-s1-row">
      <span class="te-sc-num">14</span>
      <span class="te-sc-lbl">Moving expenses for members of the Armed Forces &nbsp;<span class="te-cite">(Form 3903)</span>
        <span class="te-sc-note">Post-TCJA: available only to active-duty Armed Forces members &mdash; IRC §217(g)</span>
      </span>
      <input type="number" class="te-input te-mono te-sc-inp" step="0.01" min="0"
        value="${esc(String(s1.p2L14||''))}" placeholder="0.00"
        oninput="teOnSched1PII('p2L14',this.value)">
    </div>
    <div style="padding-left:40px;margin-top:-4px;margin-bottom:4px;">
      <label class="te-sc-radio-lbl">
        <input type="checkbox" ${s1.p2L14StorageOnly?'checked':''}
          onchange="teOnSched1PII('p2L14StorageOnly',this.checked)">
        Claiming only storage fees
      </label>
    </div>

    ${rRow('15', 'Deductible part of self-employment tax &mdash; Schedule SE',
        'te-s2-l15', fmtRO(ln.l15), 'sched-se', 'Auto from Schedule SE &mdash; click to edit')}

    ${iRow('16', 'Self-employed SEP, SIMPLE, and qualified plans', 'p2L16', s1.p2L16, 'IRC §§219, 404')}

    ${iRow('17', 'Self-employed health insurance deduction', 'p2L17', s1.p2L17, 'IRC §162(l)')}

    ${iRow('18', 'Penalty on early withdrawal of savings', 'p2L18', s1.p2L18, 'Bank/CD penalty &mdash; reported on 1099-INT Box 2')}

    <!-- Line 19a/19b/19c — Alimony -->
    ${rRow('19a', 'Alimony paid', 'te-s2-l19a', fmtRO(ln.l19a), 'alimony', 'Auto from alimony schedule &mdash; click to edit')}
    <div class="te-sc-row te-s1-row" style="padding-left:28px;">
      <span class="te-sc-num">19b</span>
      <span class="te-sc-lbl">Recipient&#39;s SSN <span class="te-sc-note">XXX-XX-XXXX (required if 19a &gt; 0)</span></span>
      <input type="text" class="te-input te-mono te-sc-inp" maxlength="11" placeholder="XXX-XX-XXXX"
        value="${esc(s1.p2L19b||'')}"
        oninput="teOnSched1PII('p2L19b',this.value)">
    </div>
    <div class="te-sc-row te-s1-row" style="padding-left:28px;">
      <span class="te-sc-num">19c</span>
      <span class="te-sc-lbl">Date of original divorce or separation agreement <span class="te-sc-note">mm/dd/yyyy</span></span>
      <input type="text" class="te-input te-mono te-sc-inp" maxlength="10" placeholder="mm/dd/yyyy"
        value="${esc(s1.p2L19c||'')}"
        oninput="teOnSched1PII('p2L19c',this.value)">
    </div>

    ${rRow('20', 'IRA deduction', 'te-s2-l20', fmtRO(ln.l20), 'ira-ded', 'Auto from IRA deduction screen &mdash; click to edit')}

    ${rRow('21', 'Student loan interest deduction', 'te-s2-l21', fmtRO(ln.l21), 'sli', 'Auto from SLI screen &mdash; click to edit')}

    <!-- Line 22 — Reserved -->
    <div class="te-sc-row te-s1-row" style="opacity:0.45;pointer-events:none;">
      <span class="te-sc-num">22</span>
      <span class="te-sc-lbl">Reserved for future use</span>
    </div>

    ${iRow('23', 'Archer MSA deduction &nbsp;<span class="te-cite">(Form 8853)</span>', 'p2L23', s1.p2L23, 'IRC §220')}

    <!-- Lines 24a–24k — Two-column grid (same pattern as Part I lines 8a–8v) -->
    <div class="te-sc-section-label" style="margin-top:12px;">Other Adjustments &mdash; Lines 24a&ndash;24z</div>

    <div class="te-s1-8av-grid">
      ${iRow2('24a', 'Jury duty pay (amounts turned over to employer)', 'p2L24a', s1.p2L24a)}
      ${iRow2('24g', 'Contributions by certain chaplains to section 403(b) plans', 'p2L24g', s1.p2L24g)}

      ${iRow2('24b', 'Deductible expenses related to rental of personal property (line 8l income)', 'p2L24b', s1.p2L24b)}
      ${iRow2('24h', 'Attorney fees and court costs — unlawful discrimination claims &nbsp;<span class="te-cite">IRC §62(a)(20)</span>', 'p2L24h', s1.p2L24h)}

      ${iRow2('24c', 'Nontaxable Olympic/Paralympic medals and USOC prize money (from line 8m)', 'p2L24c', s1.p2L24c)}
      ${iRow2('24i', 'Attorney fees and court costs — IRS whistleblower award &nbsp;<span class="te-cite">IRC §62(a)(21)</span>', 'p2L24i', s1.p2L24i)}

      ${iRow2('24d', 'Reforestation amortization and expenses &nbsp;<span class="te-cite">IRC §194</span>', 'p2L24d', s1.p2L24d)}
      ${iRow2('24j', 'Housing deduction from Form 2555 &nbsp;<span class="te-cite">IRC §911(c)</span>', 'p2L24j', s1.p2L24j)}

      ${iRow2('24e', 'Repayment of supplemental unemployment benefits (Trade Act of 1974)', 'p2L24e', s1.p2L24e)}
      ${iRow2('24k', 'Excess deductions of section 67(e) expenses from Schedule K-1 (Form 1041)', 'p2L24k', s1.p2L24k)}

      ${iRow2('24f', 'Contributions to section 501(c)(18)(D) pension plans', 'p2L24f', s1.p2L24f)}
      <div></div>
    </div>

    <!-- Line 24z — dynamic other adjustment rows -->
    <div class="te-sc-row te-s1-row" style="margin-top:4px;">
      <span class="te-sc-num">24z</span>
      <span class="te-sc-lbl">Other adjustments — describe below</span>
      <button class="ghost-btn te-sm-btn" onclick="teS1PiiAddOtherAdj()" style="margin-left:auto;">+ Add</button>
    </div>
    <div id="te-s2-24z-rows"></div>

    <!-- Line 25 — Total other adjustments (subtotal visual) -->
    <div class="te-sc-row te-sc-row-subtotal" style="margin-top:8px;">
      <span class="te-sc-num">25</span>
      <span class="te-sc-lbl">Total other adjustments &nbsp;<span class="te-sc-note">Add lines 24a&ndash;24z</span></span>
      <span class="te-sc-val te-mono" id="te-s2-l25">${teFmt(l25)}</span>
    </div>

    <!-- Line 26 — Total adjustments to income (highlighted box) -->
    <div class="te-sc-net-bar ${l26 >= 0 ? 'te-sc-profit' : 'te-sc-loss'}" id="te-s2-l26-bar" style="margin-top:12px;">
      <div style="display:flex;flex-direction:column;gap:2px;">
        <span style="font-size:11px;font-weight:800;text-transform:uppercase;letter-spacing:0.06em;">
          Line 26 &mdash; Total Adjustments to Income &nbsp;<span class="te-cite">1040 Line 10</span>
        </span>
        <span style="font-size:11px;color:var(--text-dim);">Lines 11 + 12 + 13 + 14 + 15 + 16 + 17 + 18 + 19a + 20 + 21 + 23 + 25</span>
      </div>
      <span class="te-sc-net-amt" id="te-s2-l26">${teFmt(l26)}</span>
    </div>

  `;
}

// ── SCHEDULE 1 PART II HANDLERS ───────────────────────────────────────

function teOnSched1PII(field, value) {
  if (!teCurrentReturn) return;
  if (!teCurrentReturn.schedule1) teCurrentReturn.schedule1 = {};
  let s1 = teCurrentReturn.schedule1;

  // Boolean fields — immediate recalc
  if (field === 'p2L14StorageOnly') {
    s1[field] = value;
    teMarkDirty();
    teRecalculate();
    return;
  }

  // Text fields (SSN, date) — immediate save, no recalc needed
  if (field === 'p2L19b' || field === 'p2L19c') {
    s1[field] = value;
    teMarkDirty();
    return;
  }

  // Number fields — 150ms debounce
  s1[field] = value;
  teMarkDirty();
  clearTimeout(teSchedS1PiiTimer);
  teSchedS1PiiTimer = setTimeout(teRecalculate, 150);
}

function teS1PiiAddOtherAdj() {
  if (!teCurrentReturn) return;
  if (!teCurrentReturn.schedule1) teCurrentReturn.schedule1 = {};
  if (!teCurrentReturn.schedule1.p2OtherAdjRows) teCurrentReturn.schedule1.p2OtherAdjRows = [];
  teCurrentReturn.schedule1.p2OtherAdjRows.push({ type: '', amount: '' });
  teMarkDirty();
  teRenderS1PiiOtherAdjRows();
}

function teS1PiiDelOtherAdj(idx) {
  if (!teCurrentReturn || !teCurrentReturn.schedule1) return;
  let rows = teCurrentReturn.schedule1.p2OtherAdjRows || [];
  rows.splice(idx, 1);
  teMarkDirty();
  teRenderS1PiiOtherAdjRows();
  teRecalculate();
}

function teOnS1PiiOtherAdj(idx, field, value) {
  if (!teCurrentReturn || !teCurrentReturn.schedule1) return;
  let rows = teCurrentReturn.schedule1.p2OtherAdjRows || [];
  if (!rows[idx]) return;
  rows[idx][field] = value;
  teMarkDirty();
  if (field === 'amount') {
    clearTimeout(teSchedS1PiiTimer);
    teSchedS1PiiTimer = setTimeout(teRecalculate, 150);
  }
}

function teRenderS1PiiOtherAdjRows() {
  let wrap = document.getElementById('te-s2-24z-rows');
  if (!wrap) return;
  let rows = (teCurrentReturn && teCurrentReturn.schedule1 && teCurrentReturn.schedule1.p2OtherAdjRows) || [];
  wrap.innerHTML = rows.map((row, i) =>
    `<div class="te-sc-row" style="gap:8px;padding-left:40px;">
       <input type="text" class="te-input te-sc-lbl-inp" style="flex:1;" placeholder="Type of adjustment"
         value="${esc(row.type||'')}" oninput="teOnS1PiiOtherAdj(${i},'type',this.value)">
       <input type="number" class="te-input te-mono te-sc-inp" step="0.01"
         value="${esc(String(row.amount||''))}" placeholder="0.00"
         oninput="teOnS1PiiOtherAdj(${i},'amount',this.value)">
       <button class="te-sc-del-btn" onclick="teS1PiiDelOtherAdj(${i})" title="Remove row">✕</button>
     </div>`).join('');
}

// ──────────────────────────────────────────────────────────────────────

function teRenderScheduleC() {
  let r    = teCurrentReturn;
  let sc   = (r && r.scheduleC)         || {};
  let bi   = sc.businessInfo            || {};
  let exp  = sc.expenses                || {};
  let p3   = sc.partIII                 || {};
  let p4   = sc.partIV                  || {};
  let ln   = (r && r._calc && r._calc.scLines) || {};
  let yr   = r ? (r.taxYear || teActiveYear) : teActiveYear;

  // ── Row helpers ──────────────────────────────────────────────────────
  // cRow: computed display (valId for live DOM updates)
  let cRow = (num, label, val, cls='', valId='') =>
    `<div class="te-sc-row${cls?' '+cls:''}">
       <span class="te-sc-num">${num}</span>
       <span class="te-sc-lbl">${label}</span>
       <span class="te-sc-val"${valId?` id="${valId}"`:''} >${val}</span>
     </div>`;

  // iRow: number input
  let iRow = (num, label, field, val, subObj='', note='') =>
    `<div class="te-sc-row">
       <span class="te-sc-num">${num}</span>
       <span class="te-sc-lbl">${label}${note?`<span class="te-sc-note">${note}</span>`:''}</span>
       <input type="number" class="te-input te-mono te-sc-inp" step="0.01" min="0"
         value="${esc(String(val||''))}" placeholder="0.00"
         oninput="teOnSchedC('${field}',this.value,'${subObj}')">
     </div>`;

  // Part III collapsible body
  let p3Open = [p3.inventoryBegin,p3.purchases,p3.costOfLabor,p3.materials,p3.otherCosts,p3.inventoryEnd]
    .some(v => (parseFloat(v)||0) > 0);

  // Part IV collapsible body
  let p4Open = !!(p4.vehicleDate || (parseFloat(p4.businessMiles)||0) > 0);

  // Part V collapsible body
  let p5Rows = sc.otherExpenseRows || [];
  let p5Open = p5Rows.length > 0;

  // Net profit styling
  let line31 = ln.l31 || 0;
  let profitCls = line31 > 0 ? 'te-sc-profit' : line31 < 0 ? 'te-sc-loss' : '';
  let profitLbl = line31 >= 0 ? 'Net Profit' : 'Net Loss';

  // Part V rows HTML
  let p5RowsHtml = `<div id="te-sc-v-rows">${p5Rows.map((row, i) =>
    `<div class="te-sc-row" style="gap:8px;">
       <span class="te-sc-num">—</span>
       <input type="text" class="te-input te-sc-lbl-inp" style="flex:1;" placeholder="Description"
         value="${esc(row.desc||'')}" oninput="teOnSchedCOtherExp(${i},'desc',this.value)">
       <input type="number" class="te-input te-mono te-sc-inp" step="0.01" min="0"
         value="${esc(String(row.amount||''))}" placeholder="0.00"
         oninput="teOnSchedCOtherExp(${i},'amount',this.value)">
       <button class="te-sc-del-btn" onclick="teSchedCDelOtherExp(${i})" title="Remove">✕</button>
     </div>`).join('')}</div>`;

  return `
  <div class="te-sch-c">

    <!-- Form Header -->
    <div class="te-sc-header-bar">
      <div class="te-sc-title">Schedule C — Profit or Loss From Business</div>
      <div class="te-sc-subtitle">(Sole Proprietorship) &nbsp;·&nbsp; Tax Year ${yr} &nbsp;·&nbsp; IRC §162</div>
    </div>

    <!-- Business Information -->
    <div class="te-sc-section-label">Business Information</div>
    <div class="te-sc-biz-grid">
      <div class="te-field-group" style="grid-column:span 2;">
        <label class="te-lbl">Principal business or profession</label>
        <input type="text" class="te-input" value="${esc(bi.businessType||'')}" placeholder="e.g., Consulting, Landscaping"
          oninput="teOnSchedC('businessType',this.value,'businessInfo')">
      </div>
      <div class="te-field-group">
        <label class="te-lbl">Business activity code <span class="te-sc-note">6-digit NAICS</span></label>
        <input type="text" class="te-input" value="${esc(bi.activityCode||'')}" maxlength="6" placeholder="e.g., 541110"
          oninput="teOnSchedC('activityCode',this.value,'businessInfo')">
      </div>
      <div class="te-field-group">
        <label class="te-lbl">Business name <span class="te-sc-note">Leave blank if same as proprietor</span></label>
        <input type="text" class="te-input" value="${esc(bi.businessName||'')}" placeholder="DBA name (optional)"
          oninput="teOnSchedC('businessName',this.value,'businessInfo')">
      </div>
      <div class="te-field-group">
        <label class="te-lbl">EIN <span class="te-sc-note">Leave blank if using SSN only</span></label>
        <input type="text" class="te-input" value="${esc(bi.ein||'')}" placeholder="XX-XXXXXXX" maxlength="10"
          oninput="teOnSchedC('ein',this.value,'businessInfo')">
      </div>
      <div class="te-field-group">
        <label class="te-lbl">Business street address</label>
        <input type="text" class="te-input" value="${esc(bi.street||'')}" placeholder="Street"
          oninput="teOnSchedC('street',this.value,'businessInfo')">
      </div>
      <div class="te-field-group" style="flex:1">
        <label class="te-lbl">City</label>
        <input type="text" class="te-input" value="${esc(bi.city||'')}" placeholder="City"
          oninput="teOnSchedC('city',this.value,'businessInfo')">
      </div>
      <div class="te-field-group" style="flex:0 0 90px">
        <label class="te-lbl">State</label>
        <select class="te-select" onchange="teOnSchedC('state',this.value,'businessInfo')">
          <option value="">—</option>
          ${['AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA','HI','ID','IL','IN','IA','KS','KY','LA','ME','MD','MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ','NM','NY','NC','ND','OH','OK','OR','PA','RI','SC','SD','TN','TX','UT','VT','VA','WA','WV','WI','WY'].map(s=>`<option value="${s}" ${(bi.state||'')=== s?'selected':''}>${s}</option>`).join('')}
        </select>
      </div>
      <div class="te-field-group" style="flex:0 0 100px">
        <label class="te-lbl">ZIP</label>
        <input type="text" class="te-input" value="${esc(bi.zip||'')}" maxlength="10" placeholder="XXXXX"
          oninput="teOnSchedC('zip',this.value,'businessInfo')">
      </div>
    </div>
    <div class="te-sc-biz-flags">
      <div class="te-sc-flag-row">
        <span class="te-sc-flag-lbl">Accounting method:</span>
        ${['cash','accrual','other'].map(m=>`<label class="te-sc-radio-lbl">
          <input type="radio" name="te-sc-acct" value="${m}" ${(bi.accountingMethod||'cash')===m?'checked':''}
            onchange="teOnSchedC('accountingMethod',this.value,'businessInfo')"> ${m.charAt(0).toUpperCase()+m.slice(1)}</label>`).join('')}
      </div>
      <div class="te-sc-flag-row">
        <span class="te-sc-flag-lbl">Material participation:</span>
        <label class="te-sc-radio-lbl"><input type="radio" name="te-sc-matpart" value="yes" ${bi.materialParticipation!==false?'checked':''}
          onchange="teOnSchedC('materialParticipation',true,'businessInfo')"> Yes</label>
        <label class="te-sc-radio-lbl"><input type="radio" name="te-sc-matpart" value="no" ${bi.materialParticipation===false?'checked':''}
          onchange="teOnSchedC('materialParticipation',false,'businessInfo')"> No</label>
        <span class="te-sc-note" style="margin-left:6px;">§469 — did you materially participate during the tax year?</span>
      </div>
      <div class="te-sc-flag-row">
        <label class="te-pers-chk-cell">
          <input type="checkbox" ${bi.startedThisYear?'checked':''}
            onchange="teOnSchedC('startedThisYear',this.checked,'businessInfo')">
          <span class="te-pers-chk-lbl">Business started or acquired this year</span>
        </label>
        &nbsp;&nbsp;
        <label class="te-pers-chk-cell">
          <input type="checkbox" ${bi.required1099?'checked':''}
            onchange="teOnSchedC('required1099',this.checked,'businessInfo')">
          <span class="te-pers-chk-lbl">Required to file 1099s</span>
        </label>
        ${bi.required1099 ? `&nbsp;&nbsp;<label class="te-pers-chk-cell">
          <input type="checkbox" ${bi.filed1099?'checked':''}
            onchange="teOnSchedC('filed1099',this.checked,'businessInfo')">
          <span class="te-pers-chk-lbl">Did (or will) file 1099s</span>
        </label>` : ''}
      </div>
    </div>

    <!-- Part I — Income -->
    <div class="te-sc-section-label" style="margin-top:14px;">Part I — Income <span class="te-cite">IRC §61(a)(2)</span></div>

    <div class="te-sc-row">
      <span class="te-sc-num">1</span>
      <span class="te-sc-lbl">Gross receipts or sales
        <label class="te-pers-chk-cell" style="display:inline-flex;margin-left:14px;">
          <input type="checkbox" ${sc.statutoryEmployee?'checked':''}
            onchange="teOnSchedC('statutoryEmployee',this.checked,'')">
          <span class="te-pers-chk-lbl">Statutory employee (W-2)</span>
        </label>
      </span>
      <input type="number" class="te-input te-mono te-sc-inp" step="0.01" min="0"
        value="${esc(String(sc.grossReceipts||''))}" placeholder="0.00"
        oninput="teOnSchedC('grossReceipts',this.value,'')">
    </div>

    ${iRow('2', 'Returns and allowances', 'returnsAllowances', sc.returnsAllowances)}
    ${cRow('3', 'Subtract line 2 from line 1', teFmt(ln.l3||0), 'te-sc-sub', 'te-sc-l3')}
    ${cRow('4', 'Cost of goods sold — from Part III, line 42 <span class="te-cite">IRC §263A</span>', teFmt(ln.l4||0), 'te-sc-sub', 'te-sc-l4')}
    ${cRow('5', 'Gross profit (line 3 minus line 4)', teFmt(ln.l5||0), 'te-sc-sub', 'te-sc-l5')}
    ${iRow('6', 'Other income, including federal fuel tax credit or refund', 'otherIncome', sc.otherIncome)}
    ${cRow('7', 'Gross income (add lines 5 and 6) <span class="te-cite">IRC §61</span>', teFmt(ln.l7||0), 'te-sc-sub', 'te-sc-l7')}

    <!-- Part II — Expenses -->
    <div class="te-sc-section-label" style="margin-top:14px;">Part II — Expenses <span class="te-cite">IRC §162</span></div>

    ${iRow('8',   'Advertising',                                                  'advertising',       exp.advertising)}
    ${iRow('9',   'Car and truck expenses <span class="te-cite">§179; $0.70/mile (2025)</span>','carTruck', exp.carTruck,'expenses','See Part IV or Form 4562')}
    ${iRow('10',  'Commissions and fees',                                          'commissions',       exp.commissions,       'expenses')}
    ${iRow('11',  'Contract labor',                                                'contractLabor',     exp.contractLabor,     'expenses')}
    ${iRow('12',  'Depletion',                                                     'depletion',         exp.depletion,         'expenses')}
    ${iRow('13',  'Depreciation and §179 deduction <span class="te-cite">§168, §179</span>', 'depreciation', exp.depreciation, 'expenses', 'Not including Part III amounts — see Form 4562')}
    ${iRow('14',  'Employee benefit programs <span class="te-cite">§106, §125</span>', 'employeeBenefits', exp.employeeBenefits, 'expenses', 'Other than pension/profit-sharing on line 19')}
    ${iRow('15',  'Insurance (other than health)',                                  'insurance',         exp.insurance,         'expenses')}
    ${iRow('16a', 'Interest — mortgage (paid to banks, etc.) <span class="te-cite">§163</span>', 'interestMortgage', exp.interestMortgage, 'expenses')}
    ${iRow('16b', 'Interest — other <span class="te-cite">§163</span>',            'interestOther',     exp.interestOther,     'expenses')}
    ${iRow('17',  'Legal and professional services',                               'legalProfessional', exp.legalProfessional, 'expenses')}
    ${iRow('18',  'Office expense',                                                'officeExpense',     exp.officeExpense,     'expenses')}
    ${iRow('19',  'Pension and profit-sharing plans <span class="te-cite">§404</span>', 'pension',     exp.pension,           'expenses')}
    ${iRow('20a', 'Rent or lease — vehicles, machinery, and equipment',            'rentVehicles',      exp.rentVehicles,      'expenses')}
    ${iRow('20b', 'Rent or lease — other business property',                       'rentProperty',      exp.rentProperty,      'expenses')}
    ${iRow('21',  'Repairs and maintenance',                                       'repairs',           exp.repairs,           'expenses')}
    ${iRow('22',  'Supplies (not included in Part III)',                            'supplies',          exp.supplies,          'expenses')}
    ${iRow('23',  'Taxes and licenses',                                            'taxesLicenses',     exp.taxesLicenses,     'expenses')}
    ${iRow('24a', 'Travel',                                                        'travel',            exp.travel,            'expenses')}
    ${iRow('24b', 'Deductible meals <span class="te-cite">§274(n) — generally 50% of actual</span>', 'meals', exp.meals, 'expenses')}
    ${iRow('25',  'Utilities',                                                     'utilities',         exp.utilities,         'expenses')}
    ${iRow('26',  'Wages (less employment credits)',                                'wages',             exp.wages,             'expenses')}
    ${iRow('27a', 'Energy efficient commercial buildings deduction <span class="te-cite">§179D — Form 7205</span>', 'energyBuildings', exp.energyBuildings, 'expenses')}
    ${cRow('27b', 'Other expenses — from Part V, line 48', teFmt(ln.l27b||0), 'te-sc-sub', 'te-sc-l27b')}
    ${cRow('28',  'Total expenses before home office (add lines 8 through 27b)', teFmt(ln.l28||0), 'te-sc-tot', 'te-sc-l28')}

    <!-- Lines 29–32 — Net Profit/Loss -->
    <div class="te-sc-section-label" style="margin-top:14px;">Net Profit or (Loss)</div>

    ${cRow('29', 'Tentative profit or (loss) — line 7 minus line 28', teFmt(ln.l29||0), 'te-sc-sub', 'te-sc-l29')}

    <!-- Line 30 — Home Office -->
    <div class="te-sc-row">
      <span class="te-sc-num">30</span>
      <span class="te-sc-lbl">
        Expenses for business use of home <span class="te-cite">IRC §280A(c)(1)</span>
        <div class="te-sc-homeofc" style="margin-top:6px;">
          <div class="te-sc-flag-row">
            <label class="te-sc-radio-lbl">
              <input type="radio" name="te-sc-homethod" value="simplified"
                ${(sc.homeOfficeMethod||'simplified')==='simplified'?'checked':''}
                onchange="teOnSchedC('homeOfficeMethod',this.value,'')"> Simplified method ($5/sq ft, max 300 sq ft)
            </label>
            <label class="te-sc-radio-lbl" style="margin-left:10px;">
              <input type="radio" name="te-sc-homethod" value="form8829"
                ${sc.homeOfficeMethod==='form8829'?'checked':''}
                onchange="teOnSchedC('homeOfficeMethod',this.value,'')"> Form 8829 (actual expenses)
            </label>
          </div>
          ${(sc.homeOfficeMethod||'simplified') !== 'form8829' ? `
          <div class="te-frow" style="gap:10px;margin-top:6px;">
            <div class="te-field-group" style="flex:0 0 160px;">
              <label class="te-lbl">Business sq ft <span class="te-cite" style="font-weight:400;">(max 300)</span></label>
              <input type="number" class="te-input te-mono" min="0" max="300" step="1"
                value="${esc(String(sc.businessSqFt||''))}" placeholder="0"
                oninput="teOnSchedC('businessSqFt',this.value,'')">
            </div>
            <div class="te-field-group" style="flex:0 0 160px;">
              <label class="te-lbl">Total home sq ft</label>
              <input type="number" class="te-input te-mono" min="0" step="1"
                value="${esc(String(sc.totalHomeSqFt||''))}" placeholder="0"
                oninput="teOnSchedC('totalHomeSqFt',this.value,'')">
            </div>
            <div class="te-field-group" style="flex:0 0 140px;align-self:flex-end;">
              <label class="te-lbl">Simplified deduction</label>
              <div class="te-input te-mono" style="background:var(--bg-surface);cursor:default;" id="te-sc-l30-simp">${teFmt(ln.l30||0)}</div>
            </div>
          </div>` : `
          <div class="te-field-group" style="max-width:200px;margin-top:6px;">
            <label class="te-lbl">Form 8829 deduction amount</label>
            <input type="number" class="te-input te-mono" step="0.01" min="0"
              value="${esc(String(sc.homeOffice||''))}" placeholder="0.00"
              oninput="teOnSchedC('homeOffice',this.value,'')">
          </div>`}
        </div>
      </span>
      <span class="te-sc-val" id="te-sc-l30">${teFmt(ln.l30||0)}</span>
    </div>

    <!-- Line 31 — Net Profit -->
    <div class="te-sc-net-bar ${profitCls}" id="te-sc-net-bar">
      <div>
        <span class="te-sc-net-lbl">Line 31 — ${profitLbl}</span>
        <span class="te-sc-net-sub">Flows to Schedule 1, Line 3 &nbsp;·&nbsp; <span class="te-cite">IRC §162</span></span>
      </div>
      <span class="te-sc-net-amt" id="te-sc-l31">${teFmt(line31)}</span>
    </div>

    <!-- Line 32 — Investment at risk (only if loss) -->
    ${line31 < 0 ? `
    <div class="te-sc-row" id="te-sc-l32-row">
      <span class="te-sc-num">32</span>
      <span class="te-sc-lbl">
        If you have a loss, check the box that describes your investment in this activity.
        <div class="te-sc-flag-row" style="margin-top:6px;">
          <label class="te-sc-radio-lbl">
            <input type="radio" name="te-sc-risk" value="32a" ${(sc.investmentAtRisk||'32a')==='32a'?'checked':''}
              onchange="teOnSchedC('investmentAtRisk',this.value,'')">
            32a — All investment is at risk
          </label>
          <label class="te-sc-radio-lbl" style="margin-left:12px;">
            <input type="radio" name="te-sc-risk" value="32b" ${sc.investmentAtRisk==='32b'?'checked':''}
              onchange="teOnSchedC('investmentAtRisk',this.value,'')">
            32b — Some investment is not at risk (Form 6198 required)
          </label>
        </div>
      </span>
    </div>` : ''}

    <!-- Part III — Cost of Goods Sold (collapsible) -->
    <div class="te-sc-collapse-hdr${p3Open?' te-sc-open':''}" id="te-sc-hdr-p3"
      onclick="teToggleSchedCPart('p3')">
      <span class="te-sc-collapse-title">Part III — Cost of Goods Sold <span class="te-cite">IRC §263A</span></span>
      <span class="te-sc-collapse-note">Skip if you don't sell products or have inventory</span>
      <span class="te-sc-chevron">&#8250;</span>
    </div>
    <div class="te-sc-collapse-body" id="te-sc-body-p3" style="display:${p3Open?'block':'none'};">
      <div class="te-sc-row">
        <span class="te-sc-num">33</span>
        <span class="te-sc-lbl">Method used to value closing inventory:</span>
        <span class="te-sc-val" style="min-width:auto;">
          ${['cost','locom','other'].map(m=>`<label class="te-sc-radio-lbl">
            <input type="radio" name="te-sc-inv" value="${m}" ${(p3.inventoryMethod||'cost')===m?'checked':''}
              onchange="teOnSchedC('inventoryMethod',this.value,'partIII')">
            ${{cost:'Cost',locom:'Lower of cost / market',other:'Other'}[m]}</label>`).join('')}
        </span>
      </div>
      <div class="te-sc-row">
        <span class="te-sc-num">34</span>
        <span class="te-sc-lbl">Was there a change in determining quantities, costs, or valuations?</span>
        <span class="te-sc-val" style="min-width:auto;">
          <label class="te-sc-radio-lbl"><input type="radio" name="te-sc-invchg" value="yes" ${p3.inventoryChange?'checked':''}
            onchange="teOnSchedC('inventoryChange',true,'partIII')"> Yes</label>
          <label class="te-sc-radio-lbl" style="margin-left:8px;"><input type="radio" name="te-sc-invchg" value="no" ${!p3.inventoryChange?'checked':''}
            onchange="teOnSchedC('inventoryChange',false,'partIII')"> No</label>
        </span>
      </div>
      ${iRow('35','Inventory at beginning of year',       'inventoryBegin', p3.inventoryBegin, 'partIII')}
      ${iRow('36','Purchases less cost of items withdrawn for personal use','purchases',p3.purchases,'partIII')}
      ${iRow('37','Cost of labor — not including yourself','costOfLabor',   p3.costOfLabor,   'partIII')}
      ${iRow('38','Materials and supplies',               'materials',      p3.materials,     'partIII')}
      ${iRow('39','Other costs',                          'otherCosts',     p3.otherCosts,    'partIII')}
      ${cRow('40','Add lines 35 through 39',              teFmt(ln.l40||0), 'te-sc-sub', 'te-sc-l40')}
      ${iRow('41','Inventory at end of year',             'inventoryEnd',   p3.inventoryEnd,  'partIII')}
      ${cRow('42','Cost of goods sold (line 40 minus line 41) — feeds Part I, line 4',
                                                          teFmt(ln.l42||0), 'te-sc-tot', 'te-sc-l42')}
    </div>

    <!-- Part IV — Vehicle Information (collapsible) -->
    <div class="te-sc-collapse-hdr${p4Open?' te-sc-open':''}" id="te-sc-hdr-p4"
      onclick="teToggleSchedCPart('p4')">
      <span class="te-sc-collapse-title">Part IV — Vehicle Information</span>
      <span class="te-sc-collapse-note">Complete only if claiming car/truck expenses on line 9</span>
      <span class="te-sc-chevron">&#8250;</span>
    </div>
    <div class="te-sc-collapse-body" id="te-sc-body-p4" style="display:${p4Open?'block':'none'};">
      <div class="te-sc-row">
        <span class="te-sc-num">43</span>
        <span class="te-sc-lbl">Date vehicle placed in service</span>
        <input type="date" class="te-input" style="width:150px;flex-shrink:0;"
          value="${esc(p4.vehicleDate||'')}" onchange="teOnSchedC('vehicleDate',this.value,'partIV')">
      </div>
      <div class="te-sc-row">
        <span class="te-sc-num">44</span>
        <span class="te-sc-lbl">Miles driven — (a) Business</span>
        <input type="number" class="te-input te-mono te-sc-inp" min="0" step="1" placeholder="0"
          value="${esc(String(p4.businessMiles||''))}" oninput="teOnSchedC('businessMiles',this.value,'partIV')">
      </div>
      <div class="te-sc-row">
        <span class="te-sc-num">44b</span>
        <span class="te-sc-lbl">Miles driven — (b) Commuting</span>
        <input type="number" class="te-input te-mono te-sc-inp" min="0" step="1" placeholder="0"
          value="${esc(String(p4.commutingMiles||''))}" oninput="teOnSchedC('commutingMiles',this.value,'partIV')">
      </div>
      <div class="te-sc-row">
        <span class="te-sc-num">44c</span>
        <span class="te-sc-lbl">Miles driven — (c) Other</span>
        <input type="number" class="te-input te-mono te-sc-inp" min="0" step="1" placeholder="0"
          value="${esc(String(p4.otherMiles||''))}" oninput="teOnSchedC('otherMiles',this.value,'partIV')">
      </div>
      ${['45:Vehicle available for personal use during off hours?,personalUse',
         '46:Another vehicle available for personal use?,anotherVehicle',
         '47a:Do you have evidence to support your deduction?,hasEvidence'].map(s => {
        let [numLabel, field] = s.split(':')[0].length===2 ? [s.split(':')[0], s.split(',')[1]] : [s.split(':')[0], s.split(',')[1]];
        let parts = s.split(':'); let num = parts[0]; let rest = parts[1]; let fld = rest.split(',')[1]; let lbl = rest.split(',')[0];
        return `<div class="te-sc-row">
          <span class="te-sc-num">${num}</span>
          <span class="te-sc-lbl">${lbl}</span>
          <span class="te-sc-val" style="min-width:auto;">
            <label class="te-sc-radio-lbl"><input type="radio" name="te-sc-${fld}" value="yes" ${p4[fld]?'checked':''}
              onchange="teOnSchedC('${fld}',true,'partIV')"> Yes</label>
            <label class="te-sc-radio-lbl" style="margin-left:8px;"><input type="radio" name="te-sc-${fld}" value="no" ${!p4[fld]?'checked':''}
              onchange="teOnSchedC('${fld}',false,'partIV')"> No</label>
          </span>
        </div>`;}).join('')}
      ${p4.hasEvidence ? `<div class="te-sc-row">
        <span class="te-sc-num">47b</span>
        <span class="te-sc-lbl">If "Yes," is the evidence written?</span>
        <span class="te-sc-val" style="min-width:auto;">
          <label class="te-sc-radio-lbl"><input type="radio" name="te-sc-writtenevidence" value="yes" ${p4.writtenEvidence?'checked':''}
            onchange="teOnSchedC('writtenEvidence',true,'partIV')"> Yes</label>
          <label class="te-sc-radio-lbl" style="margin-left:8px;"><input type="radio" name="te-sc-writtenevidence" value="no" ${!p4.writtenEvidence?'checked':''}
            onchange="teOnSchedC('writtenEvidence',false,'partIV')"> No</label>
        </span>
      </div>` : ''}
    </div>

    <!-- Part V — Other Expenses (collapsible) -->
    <div class="te-sc-collapse-hdr${p5Open?' te-sc-open':''}" id="te-sc-hdr-p5"
      onclick="teToggleSchedCPart('p5')">
      <span class="te-sc-collapse-title">Part V — Other Expenses (Line 48)</span>
      <span class="te-sc-collapse-note">Expenses not listed on lines 8–27a or line 30</span>
      <span class="te-sc-chevron">&#8250;</span>
    </div>
    <div class="te-sc-collapse-body" id="te-sc-body-p5" style="display:${p5Open?'block':'none'};">
      ${p5RowsHtml}
      <div style="margin:8px 0;">
        <button class="ghost-btn te-sm-btn" onclick="teSchedCAddOtherExp()">+ Add Expense</button>
      </div>
      <div class="te-sc-row te-sc-tot">
        <span class="te-sc-num">48</span>
        <span class="te-sc-lbl">Total other expenses — feeds Part II, line 27b</span>
        <span class="te-sc-val" id="te-sc-l48">${teFmt(ln.l48||0)}</span>
      </div>
    </div>

  </div>`; // .te-sch-c
}


// ──────────────────────────────────────────────────────────────────────
//  DEDUCTIONS SECTION
// ──────────────────────────────────────────────────────────────────────

function teToggleAdj(id) {
  let body = document.getElementById('te-adj-body-' + id);
  let row  = document.getElementById('te-adj-row-'  + id);
  if (!body || !row) return;
  let isOpen = body.style.display !== 'none';
  body.style.display = isOpen ? 'none' : 'block';
  row.classList.toggle('te-adj-open', !isOpen);
}

function teRenderInvestmentInterest() {
  let r    = teCurrentReturn;
  let ii   = (r && r.investmentInterest) || {};
  let calc = (r && r._calc) || {};
  let hasII = (parseFloat(ii.expense) || 0) > 0 || (parseFloat(ii.priorYearCarryforward) || 0) > 0;
  let iiOpen = hasII;
  return `
      <div class="te-adj-row${iiOpen ? ' te-adj-open' : ''}" id="te-adj-row-ii">
        <div class="te-adj-row-hdr" onclick="teToggleAdj('ii')">
          <span class="te-adj-row-label">Investment Interest Expense <span class="te-cite">IRC §163(d)</span></span>
          <span class="te-adj-row-val" id="te-sa-ii-calc">${teFmt(calc.investmentInterestAllowed || 0)}</span>
          <span class="te-adj-chevron">&#8250;</span>
        </div>
        <div class="te-adj-body" id="te-adj-body-ii" style="display:${iiOpen ? 'block' : 'none'};">
          <div class="te-frow" style="align-items:flex-end;gap:12px;flex-wrap:wrap;">
            <div class="te-field-group" style="max-width:200px;">
              <label class="te-lbl">Investment Interest Paid</label>
              <input type="number" id="te-ii-exp" class="te-input te-mono"
                value="${esc(String(ii.expense||''))}" placeholder="0.00" step="0.01" min="0"
                oninput="teOnInvestmentInterest()">
            </div>
            <div class="te-field-group" style="max-width:200px;">
              <label class="te-lbl">Prior Year Carryforward</label>
              <input type="number" id="te-ii-cf" class="te-input te-mono"
                value="${esc(String(ii.priorYearCarryforward||''))}" placeholder="0.00" step="0.01" min="0"
                oninput="teOnInvestmentInterest()">
            </div>
          </div>
          <div class="te-frow" style="margin-top:8px;">
            <label style="display:flex;align-items:center;gap:8px;font-size:12px;cursor:pointer;">
              <input type="checkbox" id="te-ii-qd" ${ii.includeQDinNII ? 'checked' : ''} onchange="teOnInvestmentInterest()" style="width:14px;height:14px;">
              <span>§163(d)(4)(B) Election — include qualified dividends in NII cap (QDs lose preferential rate if elected)</span>
            </label>
          </div>
          ${hasII ? `
          <div class="te-ded-note" style="margin-top:6px;">
            Deduction allowed: <strong>${teFmt(calc.investmentInterestAllowed || 0)}</strong> &nbsp;|&nbsp;
            ${calc.investmentInterestCarryforward > 0 ? 'Carryforward to next year: <strong>' + teFmt(calc.investmentInterestCarryforward) + '</strong> — <span class="te-cite">IRC §163(d)(2)</span>' : 'No carryforward — fully deductible.'}
          </div>` : ''}
          <div class="te-ded-note" style="margin-top:4px;">Deductible only to the extent of net investment income (interest + non-qualified dividends). Excess carries forward indefinitely. <span class="te-cite">IRC §163(d)(1),(2)</span></div>
        </div>
      </div>`;
}

// QBI deduction panel — read-only, computed from Schedule C — IRC §199A
function teRenderQBIPanel(calc, K, fs) {
  if (!K || !K.qbi) return '<div class="te-ded-note">QBI constants not available for this tax year.</div>';
  let threshold = K.qbi.threshold[fs] || K.qbi.threshold.single;
  let qbiBase   = calc.qbiBase   || 0;
  let qbiDed    = calc.qbiDeduction || 0;
  let above     = calc.qbiAboveThreshold || false;

  let schedCQBI = calc.schedCQBI || 0;
  let schedEQBI = calc.schedEQBI || 0;
  let hasSchedE = (teCurrentReturn.scheduleE || []).some(e => (e.entityType || 'partnership') !== 'ccorp' && (parseFloat(e.qbiAmount) || 0) !== 0);

  if (qbiBase === 0 && !hasSchedE && (calc.netSEIncome || 0) === 0) {
    return `<div class="te-ded-note">No qualified business income — §199A deduction not applicable. Enter Schedule C net profit or Schedule E §199A QBI amounts in the Income section. <span class="te-cite">IRC §199A(c)(1)</span></div>`;
  }
  if (above) {
    return `
      <div class="te-ded-note" style="color:var(--warning,#f59e0b);border-left:3px solid var(--warning,#f59e0b);padding-left:10px;">
        <strong>Above Threshold:</strong> Taxable income exceeds the §199A simplified threshold (${teFmt(threshold)}).
        QBI deduction requires Form 8995-A with W-2 wage and UBIA capital limitations — manual computation required for this return.
        <span class="te-cite">IRC §199A(b)(2),(e)(2)</span>
      </div>`;
  }
  let row = (label, val, cls='') => `<div class="te-ctc-row${cls?' '+cls:''}"><span>${label}</span><span>${val}</span></div>`;
  return `
    <div class="te-ctc-tbl" style="margin-top:4px;">
      ${(calc.netSEIncome || 0) > 0 || schedCQBI !== 0 ? `
        ${row('Schedule C Net Profit <span class="te-cite">IRC §199A(c)</span>', teFmt(calc.netSEIncome || 0))}
        ${row('− §164(f) SE Tax Deduction (reduces QBI per Form 8995)', '(' + teFmt(calc.seTaxDeduction || 0) + ')', 'te-ctc-sub')}
        ${row('= Schedule C QBI', teFmt(schedCQBI), 'te-ctc-sub')}` : ''}
      ${hasSchedE ? `
        ${row('Schedule E §199A QBI (from qualifying pass-through entities)', teFmt(schedEQBI), schedCQBI !== 0 ? 'te-ctc-sub' : '')}` : ''}
      ${(calc.netSEIncome || 0) > 0 && hasSchedE ?
        row('= Combined QBI', teFmt(qbiBase), 'te-ctc-sub') : ''}
      <div class="te-ctc-row" style="margin-top:6px;"></div>
      ${row('20% × QBI', teFmt(teRound(qbiBase * 0.20)))}
      ${row('20% × Taxable Income Before QBI', teFmt(teRound((calc.taxableIncomeBeforeQBI || 0) * 0.20)))}
      ${row('QBI Deduction — lesser of above <span class="te-cite">IRC §199A(a),(b)(1)</span>', teFmt(qbiDed), 'te-ctc-tot')}
    </div>
    <div class="te-ded-note" style="margin-top:4px;">Simplified method (Form 8995) applies — taxable income ${teFmt(calc.taxableIncomeBeforeQBI || 0)} is below the ${teFmt(threshold)} threshold. <span class="te-cite">IRC §199A(e)(2); Form 8995</span></div>`;
}

function teRenderDeductions() {
  let r      = teCurrentReturn;
  let fs     = r.filingStatus || 'single';
  let yr     = r.taxYear      || teActiveYear;
  let K      = TAX_CONSTANTS[yr];
  if (!K) return '<div class="te-empty">Tax constants not available for ' + yr + '.</div>';
  let stdAmt = K.standardDeduction[fs] || K.standardDeduction.single;
  let fsl    = { single: 'Single', mfj: 'Married Filing Jointly', mfs: 'Married Filing Separately', hoh: 'Head of Household', qss: 'Qualifying Surviving Spouse' }[fs] || fs;
  let a      = r.agiAdjustments || {};
  let sa     = r.scheduleA      || {};
  let calc   = r._calc || {};
  let sliAmt = calc.sliDeduction    || 0;
  let hsaAmt = calc.hsaDeduction    || 0;
  let iraAmt = calc.iraDeduction    || 0;
  let seAmt  = calc.seTaxDeduction  || 0;
  let alAmt  = calc.alimonyDeduction|| 0;
  let sliPo  = (fs === 'mfj') ? K.studentLoanInterest.phaseout.mfj : K.studentLoanInterest.phaseout.single;
  let isMFS  = (fs === 'mfs');
  let isMFJ  = (fs === 'mfj');
  let iraLimit = teFmt(K.ira.limit + (a.iraAge50Plus ? K.ira.catchUp : 0));

  // Schedule A: accordion default open states
  let saltOpen  = (parseFloat(sa.stateIncomeTax)||0) + (parseFloat(sa.localIncomeTax)||0) + (parseFloat(sa.realEstateTax)||0) + (parseFloat(sa.personalPropertyTax)||0) > 0;
  let miOpen    = parseFloat(sa.mortgageInterest) > 0;
  let charOpen  = (parseFloat(sa.cashCharitable)||0) + (parseFloat(sa.nonCashCharitable)||0) > 0;
  let medOpen   = parseFloat(sa.medicalExpenses) > 0;
  let saltCap   = (fs === 'mfs') ? K.scheduleA.salt.mfsCap : K.scheduleA.salt.cap;
  let saltThres = (fs === 'mfs') ? K.scheduleA.salt.mfsPhaseoutThreshold : K.scheduleA.salt.phaseoutThreshold;
  let saltAmt   = calc.saltDeduction       || 0;
  let miAmt     = calc.mortgageDeduction   || 0;
  let charAmt   = calc.charitableDeduction || 0;
  let medAmt    = calc.medicalDeduction    || 0;
  let itemTotal = calc.itemizedTotal       || 0;
  let useItemized = calc.deductionType === 'itemized';
  let dedUsed   = calc.deductionUsed       || calc.stdDed;
  let mfsItemizedRequired = calc.mfsItemizedRequired || false;
  // IRC §63(e): when MFS spouse-itemizes override is active, display $0 standard deduction
  if (mfsItemizedRequired) stdAmt = 0;

  // Default open: expand rows that already have a value
  let sliOpen = parseFloat(a.studentLoanInterest) > 0;
  let hsaOpen = parseFloat(a.hsaContributions)    > 0;
  let iraOpen = parseFloat(a.iraContributions)     > 0;
  let alOpen  = parseFloat((r.alimony||{}).paid)  > 0;
  let al      = r.alimony || {};

  return `
    <div class="te-sec-hdr"><h2>Deductions</h2>
    <p class="te-sec-sub">Reduces gross income to AGI and taxable income &mdash; <span class="te-cite">IRC §62, §63</span></p></div>

    <div class="te-subsec-lbl" style="margin-bottom:10px;">Above-the-Line Adjustments <span class="te-cite">IRC §62</span></div>

    <div class="te-adj-list">

      <div class="te-adj-row${sliOpen ? ' te-adj-open' : ''}" id="te-adj-row-sli">
        <div class="te-adj-row-hdr" onclick="teToggleAdj('sli')">
          <span class="te-adj-row-label">Student Loan Interest <span class="te-cite">IRC §221</span></span>
          <span class="te-adj-row-val" id="te-ded-sli-calc">${teFmt(sliAmt)}</span>
          <span class="te-adj-chevron">&#8250;</span>
        </div>
        <div class="te-adj-body" id="te-adj-body-sli" style="display:${sliOpen ? 'block' : 'none'};">
          ${isMFS
            ? '<div class="te-ded-note">Not available for Married Filing Separately. <span class="te-cite">IRC §221(b)(2)(B)</span></div>'
            : `<div class="te-frow" style="align-items:flex-end;gap:12px;">
                 <div class="te-field-group" style="max-width:180px;">
                   <label class="te-lbl">Interest Paid in ${yr}</label>
                   <input type="number" id="te-adj-sli" class="te-input te-mono" value="${esc(String(a.studentLoanInterest||''))}" placeholder="0.00" step="0.01" min="0" oninput="teOnAgiAdj()">
                 </div>
                 <div class="te-ded-note" style="flex:1;padding-bottom:0;">Maximum $2,500. Phase-out: ${teFmt(sliPo.floor)}–${teFmt(sliPo.ceiling)} MAGI. <span class="te-cite">IRC §221(b)(1),(b)(2)</span></div>
               </div>`}
        </div>
      </div>

      <div class="te-adj-row${hsaOpen ? ' te-adj-open' : ''}" id="te-adj-row-hsa">
        <div class="te-adj-row-hdr" onclick="teToggleAdj('hsa')">
          <span class="te-adj-row-label">HSA Deduction <span class="te-cite">IRC §223</span></span>
          <span class="te-adj-row-val" id="te-ded-hsa-calc">${teFmt(hsaAmt)}</span>
          <span class="te-adj-chevron">&#8250;</span>
        </div>
        <div class="te-adj-body" id="te-adj-body-hsa" style="display:${hsaOpen ? 'block' : 'none'};">
          <div class="te-frow" style="align-items:flex-end;gap:12px;flex-wrap:wrap;">
            <div class="te-field-group" style="max-width:165px;">
              <label class="te-lbl">Coverage Type</label>
              <select id="te-adj-hsa-type" class="te-select" onchange="teOnAgiAdj()">
                <option value="self"   ${a.hsaCoverageType!=='family'?'selected':''}>Self-Only (${teFmt(K.hsa.limitSelf)} limit)</option>
                <option value="family" ${a.hsaCoverageType==='family'?'selected':''}>Family (${teFmt(K.hsa.limitFamily)} limit)</option>
              </select>
            </div>
            <div class="te-field-group" style="max-width:165px;">
              <label class="te-lbl">Contributions Made</label>
              <input type="number" id="te-adj-hsa-contrib" class="te-input te-mono" value="${esc(String(a.hsaContributions||''))}" placeholder="0.00" step="0.01" min="0" oninput="teOnAgiAdj()">
            </div>
            <label class="te-lbl" style="display:flex;align-items:center;gap:6px;cursor:pointer;padding-bottom:6px;">
              <input type="checkbox" id="te-adj-hsa-55" ${a.hsaTaxpayerAge55?'checked':''} onchange="teOnAgiAdj()">
              Age 55+ (+$1,000) <span class="te-cite">IRC §223(b)(3)(B)</span>
            </label>
          </div>
          <div class="te-ded-note">No income phase-out. Requires qualifying HDHP. Taxpayer certifies eligibility. <span class="te-cite">IRC §223(b)(1)</span></div>
        </div>
      </div>

      <div class="te-adj-row${iraOpen ? ' te-adj-open' : ''}" id="te-adj-row-ira">
        <div class="te-adj-row-hdr" onclick="teToggleAdj('ira')">
          <span class="te-adj-row-label">Traditional IRA Deduction <span class="te-cite">IRC §219</span></span>
          <span class="te-adj-row-val" id="te-ded-ira-calc">${teFmt(iraAmt)}</span>
          <span class="te-adj-chevron">&#8250;</span>
        </div>
        <div class="te-adj-body" id="te-adj-body-ira" style="display:${iraOpen ? 'block' : 'none'};">
          <div class="te-frow" style="align-items:flex-end;gap:12px;flex-wrap:wrap;">
            <div class="te-field-group" style="max-width:180px;">
              <label class="te-lbl">IRA Contributions</label>
              <input type="number" id="te-adj-ira-contrib" class="te-input te-mono" value="${esc(String(a.iraContributions||''))}" placeholder="0.00" step="0.01" min="0" oninput="teOnAgiAdj()">
            </div>
            <label class="te-lbl" style="display:flex;align-items:center;gap:6px;cursor:pointer;padding-bottom:6px;">
              <input type="checkbox" id="te-adj-ira-50" ${a.iraAge50Plus?'checked':''} onchange="teOnAgiAdj()">
              Age 50+ (+$1,000) <span class="te-cite">IRC §219(b)(5)(B)</span>
            </label>
          </div>
          <div class="te-frow" style="gap:16px;margin-top:8px;flex-wrap:wrap;">
            <label class="te-lbl" style="display:flex;align-items:center;gap:6px;cursor:pointer;">
              <input type="checkbox" id="te-adj-ira-active" ${a.iraActiveParticipant?'checked':''} onchange="teOnAgiAdj()">
              Covered by employer plan <span class="te-cite">IRC §219(g)(2)</span>
            </label>
            ${isMFJ ? `
            <label class="te-lbl" style="display:flex;align-items:center;gap:6px;cursor:pointer;">
              <input type="checkbox" id="te-adj-ira-spouse-active" ${a.iraSpouseActive?'checked':''} onchange="teOnAgiAdj()">
              Spouse covered by employer plan <span class="te-cite">IRC §219(g)(7)</span>
            </label>` : ''}
          </div>
          <div class="te-ded-note">Limit: ${iraLimit}. Deductibility phases out when covered by an employer plan. <span class="te-cite">IRC §219(g)</span></div>
        </div>
      </div>

      <div class="te-adj-row${seAmt > 0 ? ' te-adj-open' : ''}" id="te-adj-row-se">
        <div class="te-adj-row-hdr" onclick="teToggleAdj('se')">
          <span class="te-adj-row-label">SE Tax Deduction <span class="te-cite">IRC §164(f)</span></span>
          <span class="te-adj-row-val" id="te-ded-se-calc">${teFmt(seAmt)}</span>
          <span class="te-adj-chevron">&#8250;</span>
        </div>
        <div class="te-adj-body" id="te-adj-body-se" style="display:${seAmt > 0 ? 'block' : 'none'};">
          ${calc.netSEIncome > 0
            ? `<div class="te-ded-note">
                Deductible amount: 50% of SE tax of ${teFmt(calc.seTax)} = <strong>${teFmt(seAmt)}</strong>.
                Auto-calculated from Schedule C net profit in the Income section. <span class="te-cite">IRC §164(f)</span>
               </div>`
            : `<div class="te-ded-note">Enter Schedule C net profit in the Income section to calculate SE tax and this deduction. <span class="te-cite">IRC §164(f)</span></div>`}
        </div>
      </div>

      <div class="te-adj-row${alOpen ? ' te-adj-open' : ''}" id="te-adj-row-al">
        <div class="te-adj-row-hdr" onclick="teToggleAdj('al')">
          <span class="te-adj-row-label">Alimony Paid <span class="te-cite">IRC §215</span></span>
          <span class="te-adj-row-val" id="te-ded-al-calc">${teFmt(alAmt)}</span>
          <span class="te-adj-chevron">&#8250;</span>
        </div>
        <div class="te-adj-body" id="te-adj-body-al" style="display:${alOpen ? 'block' : 'none'};">
          <div class="te-frow" style="align-items:flex-end;gap:12px;flex-wrap:wrap;">
            <div class="te-field-group" style="max-width:200px;">
              <label class="te-lbl">Alimony Paid in ${yr}</label>
              <input type="number" id="te-al-paid" class="te-input te-mono"
                value="${esc(String(al.paid||''))}" placeholder="0.00" step="0.01" min="0"
                oninput="teOnAlimony()">
            </div>
            <label class="te-lbl" style="display:flex;align-items:center;gap:6px;cursor:pointer;padding-bottom:6px;">
              <input type="checkbox" id="te-al-pre" ${al.preAgreement ? 'checked' : ''} onchange="teOnAlimony()">
              Divorce/separation agreement executed before Jan 1, 2019 <span class="te-cite">TCJA §11051</span>
            </label>
          </div>
          ${!al.preAgreement
            ? '<div class="te-ded-note" style="margin-top:4px;color:var(--te-warn,#f59e0b);">Post-2018 agreements: alimony paid is NOT deductible under TCJA. <span class="te-cite">IRC §215(b)(2)</span></div>'
            : '<div class="te-ded-note" style="margin-top:4px;">Pre-2019 agreements: full amount paid is deductible. Recipient must include in gross income. SSN of recipient required on Form 1040. <span class="te-cite">IRC §215(a), §71</span></div>'}
        </div>
      </div>

    </div>

    <div class="te-subsec-lbl" style="margin-bottom:10px;">Below-the-Line Deductions <span class="te-cite">IRC §63</span></div>

    <div class="te-sa-comparison" id="te-sa-comparison-bar">
      <div class="te-sa-comp-row">
        <div class="te-sa-comp-side ${!useItemized ? 'te-sa-comp-winner' : ''}">
          <span class="te-sa-comp-lbl">Standard Deduction</span>
          <span class="te-sa-comp-val" id="te-ded-std-amt">${teFmt(stdAmt)}</span>
          ${!useItemized ? '<span class="te-sa-comp-badge">Applied</span>' : ''}
        </div>
        <div class="te-sa-comp-vs">vs</div>
        <div class="te-sa-comp-side ${useItemized ? 'te-sa-comp-winner' : ''}">
          <span class="te-sa-comp-lbl">Itemized Deductions</span>
          <span class="te-sa-comp-val" id="te-sa-itemized-total">${teFmt(itemTotal)}</span>
          ${useItemized ? '<span class="te-sa-comp-badge">Applied</span>' : ''}
        </div>
      </div>
      <div class="te-sa-comp-note">
        ${mfsItemizedRequired
          ? `MFS — spouse is itemizing on their separate return. Standard deduction is disallowed on this return. <span class="te-cite">IRC §63(e)</span>`
          : useItemized
            ? `Itemizing saves <strong>${teFmt(itemTotal - stdAmt)}</strong> more than the standard deduction. <span class="te-cite">IRC §63(b)</span>`
            : `Standard deduction is <strong>${teFmt(stdAmt - itemTotal)}</strong> higher than current itemized total. Enter Schedule A expenses below to compare.`}
      </div>
    </div>

    <div class="te-subsec" style="margin-top:18px;margin-bottom:18px;">
      <div class="te-subsec-lbl">Qualified Business Income Deduction (§199A) <span class="te-cite">IRC §199A; 1040 Line 13a</span></div>
      <div class="te-subsec-desc">Automatically computed from Schedule C net profit. Applies to sole proprietors with qualified business income below the simplified method threshold. Reduces taxable income — not AGI. <span class="te-cite">IRC §199A(a)</span></div>
      <div id="te-qbi-panel" style="margin-top:8px;">${teRenderQBIPanel(calc, K, fs)}</div>
    </div>

    <div class="te-subsec-lbl" style="margin-bottom:8px;margin-top:18px;">Schedule A — Itemized Deductions <span class="te-cite">IRC §63(d)</span></div>

    ${isMFS ? `
    <div class="te-ded-note" style="margin-bottom:10px;padding:8px 10px;border-left:3px solid var(--te-warn,#f59e0b);">
      <label style="display:flex;align-items:center;gap:8px;cursor:pointer;">
        <input type="checkbox" id="te-sa-mfsi" ${sa.mfsSpouseItemizes ? 'checked' : ''} onchange="teOnScheduleA()" style="width:14px;height:14px;cursor:pointer;">
        <span>Spouse is itemizing deductions on their separate return</span>
      </label>
      ${sa.mfsSpouseItemizes ? '<div style="margin-top:5px;font-size:0.78rem;color:var(--te-warn,#f59e0b);">Standard deduction overridden to $0 — you must itemize per IRC §63(e). <span class="te-cite">IRC §63(e)</span></div>' : '<div style="margin-top:5px;font-size:0.78rem;">If checked, your standard deduction is disallowed and you must itemize. <span class="te-cite">IRC §63(e)</span></div>'}
    </div>` : ''}

    <div class="te-adj-list" style="margin-bottom:10px;">

      <div class="te-adj-row${saltOpen ? ' te-adj-open' : ''}" id="te-adj-row-salt">
        <div class="te-adj-row-hdr" onclick="teToggleAdj('salt')">
          <span class="te-adj-row-label">State &amp; Local Taxes (SALT) <span class="te-cite">IRC §164</span></span>
          <span class="te-adj-row-val" id="te-sa-salt-calc">${teFmt(saltAmt)}</span>
          <span class="te-adj-chevron">&#8250;</span>
        </div>
        <div class="te-adj-body" id="te-adj-body-salt" style="display:${saltOpen ? 'block' : 'none'};">
          <div class="te-frow" style="align-items:flex-end;gap:12px;flex-wrap:wrap;">
            <div class="te-field-group" style="max-width:175px;">
              <label class="te-lbl">State Income Tax Paid</label>
              <input type="number" id="te-sa-sit" class="te-input te-mono" value="${esc(String(sa.stateIncomeTax||''))}" placeholder="0.00" step="0.01" min="0" oninput="teOnScheduleA()">
            </div>
            <div class="te-field-group" style="max-width:175px;">
              <label class="te-lbl">Local Income Tax Paid</label>
              <input type="number" id="te-sa-lit" class="te-input te-mono" value="${esc(String(sa.localIncomeTax||''))}" placeholder="0.00" step="0.01" min="0" oninput="teOnScheduleA()">
            </div>
            <div class="te-field-group" style="max-width:175px;">
              <label class="te-lbl">Real Estate Tax</label>
              <input type="number" id="te-sa-ret" class="te-input te-mono" value="${esc(String(sa.realEstateTax||''))}" placeholder="0.00" step="0.01" min="0" oninput="teOnScheduleA()">
            </div>
            <div class="te-field-group" style="max-width:175px;">
              <label class="te-lbl">Personal Property Tax (ad valorem only)</label>
              <input type="number" id="te-sa-ppt" class="te-input te-mono" value="${esc(String(sa.personalPropertyTax||''))}" placeholder="0.00" step="0.01" min="0" oninput="teOnScheduleA()">
            </div>
          </div>
          <div class="te-ded-note">Cap: ${teFmt(saltCap)} (${yr}). Phase-down: 30% of MAGI over ${teFmt(saltThres)}; floor $10,000. <span class="te-cite">OBBBA P.L. 119-21</span></div>
          <div class="te-ded-note" style="margin-top:4px;">Personal property tax: enter the ad valorem (value-based) portion only. Flat vehicle registration fees or per-unit charges do not qualify. <span class="te-cite">IRC §164(a)(2)</span></div>
        </div>
      </div>

      <div class="te-adj-row${miOpen ? ' te-adj-open' : ''}" id="te-adj-row-mi">
        <div class="te-adj-row-hdr" onclick="teToggleAdj('mi')">
          <span class="te-adj-row-label">Mortgage Interest <span class="te-cite">IRC §163(h)</span></span>
          <span class="te-adj-row-val" id="te-sa-mi-calc">${teFmt(miAmt)}</span>
          <span class="te-adj-chevron">&#8250;</span>
        </div>
        <div class="te-adj-body" id="te-adj-body-mi" style="display:${miOpen ? 'block' : 'none'};">
          <div class="te-frow" style="align-items:flex-end;gap:12px;flex-wrap:wrap;">
            <div class="te-field-group" style="max-width:185px;">
              <label class="te-lbl">Interest Paid (Form 1098)</label>
              <input type="number" id="te-sa-mi" class="te-input te-mono" value="${esc(String(sa.mortgageInterest||''))}" placeholder="0.00" step="0.01" min="0" oninput="teOnScheduleA()">
            </div>
            <div class="te-field-group" style="max-width:185px;">
              <label class="te-lbl">Outstanding Balance</label>
              <input type="number" id="te-sa-mb" class="te-input te-mono" value="${esc(String(sa.mortgageBalance||''))}" placeholder="0.00" step="1" min="0" oninput="teOnScheduleA()">
            </div>
            <div class="te-field-group" style="max-width:165px;">
              <label class="te-lbl">Loan Date</label>
              <select id="te-sa-mld" class="te-select" onchange="teOnScheduleA()">
                <option value="post2017" ${sa.mortgageLoanDate!=='pre2018'?'selected':''}>Post-12/15/2017 ($750K limit)</option>
                <option value="pre2018"  ${sa.mortgageLoanDate==='pre2018'?'selected':''}>Pre-12/16/2017 ($1M limit)</option>
              </select>
            </div>
            <div class="te-field-group" style="max-width:230px;">
              <label class="te-lbl">Debt Purpose <span class="te-cite">IRC §163(h)(3)(C)</span></label>
              <select id="te-sa-mp" class="te-select" onchange="teOnScheduleA()">
                <option value="acquisition"          ${sa.mortgagePurpose!=='home_equity_personal'?'selected':''}>Acquisition / Improvement</option>
                <option value="home_equity_personal" ${sa.mortgagePurpose==='home_equity_personal'?'selected':''}>Home Equity — Personal Use</option>
              </select>
            </div>
          </div>
          ${sa.mortgagePurpose === 'home_equity_personal'
            ? '<div class="te-ded-note" style="margin-top:4px;color:var(--te-warn,#f59e0b);">Home equity interest used for personal purposes is not deductible under TCJA. <span class="te-cite">IRC §163(h)(3)(C)</span></div>'
            : '<div class="te-ded-note">If balance exceeds debt limit, deductible interest is prorated: interest × (limit ÷ balance). <span class="te-cite">IRC §163(h)(3)(F)</span></div>'}
        </div>
      </div>

      <div class="te-adj-row${charOpen ? ' te-adj-open' : ''}" id="te-adj-row-char">
        <div class="te-adj-row-hdr" onclick="teToggleAdj('char')">
          <span class="te-adj-row-label">Charitable Contributions <span class="te-cite">IRC §170</span></span>
          <span class="te-adj-row-val" id="te-sa-char-calc">${teFmt(charAmt)}</span>
          <span class="te-adj-chevron">&#8250;</span>
        </div>
        <div class="te-adj-body" id="te-adj-body-char" style="display:${charOpen ? 'block' : 'none'};">
          <div class="te-frow" style="align-items:flex-end;gap:12px;flex-wrap:wrap;">
            <div class="te-field-group" style="max-width:200px;">
              <label class="te-lbl">Cash Contributions</label>
              <input type="number" id="te-sa-cc" class="te-input te-mono" value="${esc(String(sa.cashCharitable||''))}" placeholder="0.00" step="0.01" min="0" oninput="teOnScheduleA()">
            </div>
            <div class="te-field-group" style="max-width:200px;">
              <label class="te-lbl">Non-Cash Contributions</label>
              <input type="number" id="te-sa-nc" class="te-input te-mono" value="${esc(String(sa.nonCashCharitable||''))}" placeholder="0.00" step="0.01" min="0" oninput="teOnScheduleA()">
            </div>
          </div>
          <div class="te-ded-note">Cash: limited to 60% of AGI. Non-cash: 50% of AGI. Combined cannot exceed 60% of AGI. <span class="te-cite">IRC §170(b)(1)(G),(A)</span></div>
        </div>
      </div>

      <div class="te-adj-row${medOpen ? ' te-adj-open' : ''}" id="te-adj-row-med">
        <div class="te-adj-row-hdr" onclick="teToggleAdj('med')">
          <span class="te-adj-row-label">Unreimbursed Medical &amp; Dental Expenses <span class="te-cite">IRC §213</span></span>
          <span class="te-adj-row-val" id="te-sa-med-calc">${teFmt(medAmt)}</span>
          <span class="te-adj-chevron">&#8250;</span>
        </div>
        <div class="te-adj-body" id="te-adj-body-med" style="display:${medOpen ? 'block' : 'none'};">
          <div class="te-frow" style="align-items:flex-end;gap:12px;">
            <div class="te-field-group" style="max-width:200px;">
              <label class="te-lbl">Unreimbursed Medical Expenses</label>
              <input type="number" id="te-sa-med" class="te-input te-mono" value="${esc(String(sa.medicalExpenses||''))}" placeholder="0.00" step="0.01" min="0" oninput="teOnScheduleA()">
            </div>
            <div class="te-ded-note" style="flex:1;padding-bottom:0;">Deductible amount = expenses exceeding 7.5% of AGI. Current floor: ${teFmt(Math.round((calc.agi || 0) * 0.075))}. <span class="te-cite">IRC §213(a)</span></div>
          </div>
          <div class="te-ded-note" style="margin-top:4px;">Enter unreimbursed amounts only. Do not include expenses covered by insurance, HSA distributions, employer HRA, or any other third-party reimbursement. <span class="te-cite">IRC §213(a)</span></div>
        </div>
      </div>

      ${teRenderInvestmentInterest()}

    </div>`;
}


// ──────────────────────────────────────────────────────────────────────
//  CREDITS SECTION
//
//  TODO (Track 5): Education Credit / Scholarship Coordination — IRC §25A
//  The American Opportunity Credit and Lifetime Learning Credit cannot be
//  claimed on tuition amounts covered by tax-free scholarships, Pell grants,
//  or employer tuition assistance (IRC §127).
//  Required fields: qualifiedTuitionPaid, taxFreeAssistanceReceived.
//  Eligible expense basis = qualifiedTuitionPaid − taxFreeAssistanceReceived.
//  Credits are computed on the net eligible amount only.
//  Source: uscode.house.gov/view.xhtml?req=granuleid:USC-prelim-title26-section25A
// ──────────────────────────────────────────────────────────────────────

function teRenderCredits() {
  let fs    = teCurrentReturn ? (teCurrentReturn.filingStatus || 'single') : 'single';
  let isMFS = (fs === 'mfs');
  return `
    <div class="te-sec-hdr"><h2>Tax Credits</h2>
    <p class="te-sec-sub">Dollar-for-dollar reduction of tax liability &mdash; <span class="te-cite">IRC §24, §25A</span></p></div>

    <div class="te-subsec">
      <div class="te-subsec-lbl">Child Tax Credit (CTC) <span class="te-cite">IRC §24</span></div>
      <div id="te-ctc-detail"></div>
    </div>

    <div class="te-subsec" style="margin-top:24px;">
      <div class="te-subsec-row">
        <div>
          <div class="te-subsec-lbl">Education Credits <span class="te-cite">IRC §25A</span></div>
          <div class="te-subsec-desc">American Opportunity Credit (AOC) or Lifetime Learning Credit (LLC) &mdash; one credit per student per tax year.</div>
        </div>
        ${isMFS ? '' : '<button class="ghost-btn te-sm-btn" onclick="teAddStudent()">+ Add Student</button>'}
      </div>
      ${isMFS
        ? '<div class="te-ded-note" style="margin-top:6px;">Not available for Married Filing Separately. <span class="te-cite">IRC §25A(g)(6)</span></div>'
        : '<div id="te-edu-list"></div>'}
    </div>

    <div class="te-subsec" style="margin-top:24px;">
      <div class="te-subsec-lbl">Earned Income Credit (EIC) <span class="te-cite">IRC §32</span></div>
      <div class="te-subsec-desc">Fully refundable credit for earned income. Qualifying children are identified automatically from the Personal section. <span class="te-cite">IRC §32(c)(3)</span></div>
      ${isMFS
        ? '<div class="te-ded-note" style="margin-top:8px;">Not available for Married Filing Separately. <span class="te-cite">IRC §32(d)</span></div>'
        : `<div id="te-eic-section" style="margin-top:10px;"></div>`}
    </div>

    <div class="te-subsec" style="margin-top:24px;">
      <div class="te-subsec-lbl">Child &amp; Dependent Care Credit <span class="te-cite">IRC §21</span></div>
      <div class="te-subsec-desc">Credit for care expenses paid so the taxpayer (and spouse, if MFJ) can work or look for work. Coordinates with employer-provided dependent care FSA benefits. Non-refundable. <span class="te-cite">IRC §21</span></div>
      ${isMFS
        ? '<div class="te-ded-note" style="margin-top:6px;">Not available for Married Filing Separately. <span class="te-cite">IRC §21(e)(2)</span></div>'
        : '<div id="te-cdcc-section" style="margin-top:10px;"></div>'}
    </div>

    <div class="te-subsec" style="margin-top:24px;">
      <div class="te-subsec-lbl">Retirement Savings Contributions Credit <span class="te-cite">IRC §25B</span></div>
      <div class="te-subsec-desc">Credit for contributions to eligible retirement plans. Contributions reduced by distributions received in the current year and prior 2 years. Non-refundable. <span class="te-cite">IRC §25B</span></div>
      ${isMFS
        ? '<div class="te-ded-note" style="margin-top:6px;">Not available for Married Filing Separately. <span class="te-cite">IRC §25B(g)</span></div>'
        : '<div id="te-savers-section" style="margin-top:10px;"></div>'}
    </div>

    <div class="te-subsec" style="margin-top:24px;">
      <div class="te-subsec-lbl">Energy-Efficient Home Improvement Credit <span class="te-cite">IRC §25C</span></div>
      <div class="te-subsec-desc">Credit for qualifying improvements to an existing primary residence. Two separate credit pools with distinct annual caps. Non-refundable; no carryforward. <span class="te-cite">IRC §25C</span></div>
      <div id="te-energy-section" style="margin-top:10px;"></div>
    </div>`;
}

function teRenderCTCDetail() {
  let c = document.getElementById('te-ctc-detail');
  if (!c || !teCurrentReturn) return;
  let K  = TAX_CONSTANTS[teCurrentReturn.taxYear || teActiveYear];
  if (!K) return;
  let fs    = teCurrentReturn.filingStatus || 'single';
  let qc    = (teCurrentReturn.dependents || []).filter(d => d.isQualifyingChild && teIsUnder17(d.dob, teCurrentReturn.taxYear));

  if (qc.length === 0) {
    c.innerHTML = '<div class="te-info-box">No qualifying children identified. Children must be under age 17 as of December 31, ' + (teCurrentReturn.taxYear || teActiveYear) + ' and marked as a qualifying child in the Personal section. <span class="te-cite">IRC §24(c)(1)</span></div>';
    return;
  }

  let gross        = qc.length * K.ctc.amountPerChild;
  let threshold    = K.ctc.phaseoutThreshold[fs] || K.ctc.phaseoutThreshold.single;
  let calc         = teCurrentReturn._calc || {};
  let agi          = calc.agi || 0;
  let excess       = Math.max(0, agi - threshold);
  let reduction    = Math.ceil(excess / 1000) * 50;
  let net          = Math.max(0, gross - reduction);

  // ACTC (Schedule 8812) display values — pulled from calc (already computed in teCalcCTC)
  let ctcNR        = calc.ctcNonRefundable || 0;
  let unused       = teRound(Math.max(0, net - ctcNR));
  let earnedIncome = teRound((calc.w2Wages || 0) + (calc.netSEIncome || 0));
  let byEarned     = teRound(Math.max(0, earnedIncome - K.ctc.earnedIncomeMin) * K.ctc.earnedIncomeRate);
  let perChildCap  = K.ctc.actcMax * qc.length;
  let actc         = calc.actcRefundable || 0;
  let limitLabel   = actc === byEarned && byEarned <= perChildCap ? '15% of earned income above threshold'
                   : actc === perChildCap || actc >= perChildCap  ? 'Per-child cap ($' + K.ctc.actcMax.toLocaleString() + ' × ' + qc.length + ')'
                   : 'Unused CTC';

  c.innerHTML = `
    <div class="te-ctc-tbl">
      <div class="te-ctc-row"><span>Qualifying Children <span class="te-cite">IRC §24(c)(1)</span></span><span>${qc.length}</span></div>
      <div class="te-ctc-row"><span>Credit per Child <span class="te-cite">IRC §24(a); OBBBA P.L. 119-21</span></span><span>${teFmt(K.ctc.amountPerChild)}</span></div>
      <div class="te-ctc-row te-ctc-sub"><span>Gross CTC</span><span>${teFmt(gross)}</span></div>
      ${excess > 0
        ? `<div class="te-ctc-row te-ctc-red"><span>Phase-out <span class="te-cite">IRC §24(b)(1)</span><br><small>AGI ${teFmt(agi)} exceeds ${teFmt(threshold)} by ${teFmt(excess)}. $50 reduction per $1,000.</small></span><span>(${teFmt(reduction)})</span></div>`
        : `<div class="te-ctc-row te-ctc-ok"><span>Phase-out: None — AGI below ${teFmt(threshold)} threshold</span><span>—</span></div>`}
      <div class="te-ctc-row te-ctc-tot"><span>Net CTC Available</span><span>${teFmt(net)}</span></div>
    </div>

    <div class="te-subsec-lbl" style="font-size:12px;margin-top:16px;margin-bottom:6px;">Schedule 8812 — Additional Child Tax Credit <span class="te-cite">IRC §24(d)</span></div>
    <div class="te-ctc-tbl">
      <div class="te-ctc-row"><span>Non-Refundable CTC Applied Against Tax</span><span>(${teFmt(ctcNR)})</span></div>
      <div class="te-ctc-row te-ctc-sub"><span>Unused CTC (ACTC basis)</span><span>${teFmt(unused)}</span></div>
      ${unused > 0 ? `
      <div class="te-ctc-row" style="margin-top:6px;"></div>
      <div class="te-ctc-row"><span>Earned Income <span class="te-cite">IRC §24(d)(1)(B)</span></span><span>${teFmt(earnedIncome)}</span></div>
      <div class="te-ctc-row te-ctc-sub"><span>− Earned Income Threshold</span><span>(${teFmt(K.ctc.earnedIncomeMin)})</span></div>
      <div class="te-ctc-row te-ctc-sub"><span>× 15% Rate</span><span>${teFmt(byEarned)}</span></div>
      <div class="te-ctc-row te-ctc-sub"><span>Per-Child Cap (${teFmt(K.ctc.actcMax)} × ${qc.length} children)</span><span>${teFmt(perChildCap)}</span></div>
      <div class="te-ctc-row te-ctc-sub"><span>Limiting Factor</span><span>${limitLabel}</span></div>
      <div class="te-ctc-row te-ctc-tot"><span>ACTC — Refundable <span class="te-cite">IRC §24(d)</span></span><span>${teFmt(actc)}</span></div>`
      : `<div class="te-ctc-row te-ctc-ok"><span>ACTC: $0 — CTC fully absorbed by tax liability</span><span>—</span></div>`}
    </div>`;
}

function teRenderEduList() {
  let c = document.getElementById('te-edu-list');
  if (!c) return;
  let students = teCurrentReturn.educationStudents || [];
  if (students.length === 0) {
    c.innerHTML = '<div class="te-empty">No education students added.</div>';
    return;
  }
  let K   = TAX_CONSTANTS[teCurrentReturn.taxYear || teActiveYear];
  let fs  = teCurrentReturn.filingStatus || 'single';
  let fg  = (fs === 'mfj' || fs === 'qss') ? 'mfj' : 'single';
  let agi = (teCurrentReturn._calc || {}).agi || 0;

  c.innerHTML = students.map((s, i) => {
    let exp = parseFloat(s.expenses) || 0;
    let cr  = s.creditType === 'aoc' ? teCalcAOC(exp, agi, fg, K) : { total: teCalcLLC(exp, agi, fg, K), refundable: 0 };
    return `
      <div class="te-edu-card">
        <div class="te-edu-hdr">
          <div class="te-frow" style="flex:1;gap:10px;">
            <div class="te-field-group">
              <label class="te-lbl">Student Name</label>
              <input type="text" class="te-input" value="${esc(s.name||'')}" placeholder="Name" oninput="teUpdStudent(${i},'name',this.value)">
            </div>
            <div class="te-field-group">
              <label class="te-lbl">Credit Type</label>
              <select class="te-select" onchange="teUpdStudent(${i},'creditType',this.value)">
                <option value="aoc" ${s.creditType==='aoc'?'selected':''}>American Opportunity (AOC)</option>
                <option value="llc" ${s.creditType==='llc'?'selected':''}>Lifetime Learning (LLC)</option>
              </select>
            </div>
            <div class="te-field-group">
              <label class="te-lbl">Qualified Expenses</label>
              <input type="text" inputmode="numeric" class="te-input te-mono" value="${s.expenses||''}" placeholder="0.00" oninput="teUpdStudent(${i},'expenses',this.value)">
            </div>
            ${s.creditType === 'aoc' ? `
            <div class="te-field-group te-narrow">
              <label class="te-lbl">Year of School</label>
              <select class="te-select" onchange="teUpdStudent(${i},'yearOfSchool',parseInt(this.value))">
                ${[1,2,3,4].map(y => `<option value="${y}" ${s.yearOfSchool==y?'selected':''}>${y}${['st','nd','rd','th'][y-1]} Year</option>`).join('')}
              </select>
            </div>` : ''}
          </div>
          <button class="te-rm-btn" onclick="teRmStudent(${i})">✕</button>
        </div>
        <div class="te-edu-calc">
          <span class="te-edu-calc-lbl">Calculated Credit: <strong>${teFmt(cr.total || 0)}</strong></span>
          ${s.creditType === 'aoc'
            ? `<span class="te-edu-calc-sub">Refundable portion (40%): ${teFmt(cr.refundable||0)} &mdash; <span class="te-cite">IRC §25A(i)</span></span>`
            : '<span class="te-edu-calc-sub">Non-refundable only &mdash; <span class="te-cite">IRC §25A(c)</span></span>'}
        </div>
      </div>`;
  }).join('');
}

function teAddStudent() {
  teMarkDirty();
  teCurrentReturn.educationStudents.push({ name: '', creditType: 'aoc', expenses: '', yearOfSchool: 1 });
  teRenderEduList();
  teRecalculate();
}

function teUpdStudent(i, field, val) {
  if (!teCurrentReturn.educationStudents[i]) return;
  teMarkDirty();
  teCurrentReturn.educationStudents[i][field] = val;
  teRenderEduList();
  teRecalculate();
}

function teRmStudent(i) {
  teMarkDirty();
  teCurrentReturn.educationStudents.splice(i, 1);
  teRenderEduList();
  teRecalculate();
}


// ──────────────────────────────────────────────────────────────────────
//  AGI ADJUSTMENTS — TRACK 1 HANDLERS
// ──────────────────────────────────────────────────────────────────────

function teOnAgiAdj() {
  if (!teCurrentReturn) return;
  teMarkDirty();
  if (!teCurrentReturn.agiAdjustments) teCurrentReturn.agiAdjustments = {};
  let a  = teCurrentReturn.agiAdjustments;
  let g  = id => { let el = document.getElementById(id); return el ? el.value  : ''; };
  let gb = id => { let el = document.getElementById(id); return el ? el.checked : false; };
  a.studentLoanInterest = g('te-adj-sli');
  a.hsaCoverageType     = g('te-adj-hsa-type') || 'self';
  a.hsaContributions    = g('te-adj-hsa-contrib');
  a.hsaTaxpayerAge55    = gb('te-adj-hsa-55');
  a.iraContributions    = g('te-adj-ira-contrib');
  a.iraAge50Plus        = gb('te-adj-ira-50');
  a.iraActiveParticipant = gb('te-adj-ira-active');
  a.iraSpouseActive     = gb('te-adj-ira-spouse-active');
  teRecalculate();
}

// IRC §221 — Student Loan Interest Deduction
// Source: IRS Publication 970 (irs.gov/publications/p970)
// MAGI for §221 = gross income minus all OTHER above-the-line adjustments, excluding §221 itself
// IRC §221(b)(2)(C): MAGI computed without the §221 deduction

// IRC §223 — Health Savings Account (HSA) Deduction
// Source: IRS Publication 969 (irs.gov/publications/p969); Rev. Proc. 2024-25
// No income phase-out. Deduction = contributions made, capped at coverage-tier limit.

// IRC §219 — Traditional IRA Deduction
// Source: IRS.gov newsroom — irs.gov/newsroom/401k-limit-increases-to-23500-for-2025-ira-limit-remains-7000
// MAGI for §219 = gross income minus all OTHER above-the-line adjustments, excluding §219 itself
// IRC §219(g)(3): MAGI computed without the §219 deduction


// ──────────────────────────────────────────────────────────────────────
//  TRACK 3 CALC FUNCTIONS
// ──────────────────────────────────────────────────────────────────────

// IRC §215 — Alimony Paid Deduction
// Source: uscode.house.gov/view.xhtml?req=granuleid:USC-prelim-title26-section215
// TCJA §11051 (P.L. 115-97): agreements executed after Dec 31, 2018 → NOT deductible.
// Pre-2019 agreements: full amount paid is deductible above-the-line.
// Practitioner responsibility: confirm the divorce/separation instrument date.

// Handler — Schedule SE field changes
// Called oninput from any user-editable line on the Schedule SE form screen.
// field: data model key (farmProfit | crpPayments | optionalMethods | ssWagesOverride | unreportedTips)
// value: raw string from the input element
function teOnSchedSE(field, value) {
  if (!teCurrentReturn) return;
  teMarkDirty();
  if (!teCurrentReturn.scheduleSE) teCurrentReturn.scheduleSE = {};
  teCurrentReturn.scheduleSE[field] = value;
  teRecalculate();
}

// ── Schedule C handlers ──────────────────────────────────────────────

// Main handler — called oninput/onchange from every field on the Schedule C form.
// field:  the data model key (e.g. 'grossReceipts', 'advertising', 'businessName')
// value:  raw value from the input element (string, number, or boolean)
// subObj: '' (root sc), 'businessInfo', 'expenses', 'partIII', or 'partIV'
function teOnSchedC(field, value, subObj) {
  if (!teCurrentReturn) return;
  teMarkDirty();
  let sc = teCurrentReturn.scheduleC;
  if (!sc) { teCurrentReturn.scheduleC = teEmptyReturn(null,null,null).scheduleC; sc = teCurrentReturn.scheduleC; }
  if (subObj) {
    if (!sc[subObj]) sc[subObj] = {};
    sc[subObj][field] = value;
  } else {
    sc[field] = value;
  }
  // 150ms debounce — avoids recalculating on every keystroke while typing dollar amounts
  clearTimeout(teSchedCTimer);
  teSchedCTimer = setTimeout(() => teRecalculate(), 150);
}

// Part V — add a blank other-expense row
function teSchedCAddOtherExp() {
  if (!teCurrentReturn) return;
  teMarkDirty();
  let sc = teCurrentReturn.scheduleC;
  if (!sc.otherExpenseRows) sc.otherExpenseRows = [];
  sc.otherExpenseRows.push({ desc: '', amount: '' });
  teRenderSchedCOtherExpRows();
  teRecalculate();
}

// Part V — delete an other-expense row by index
function teSchedCDelOtherExp(idx) {
  if (!teCurrentReturn) return;
  teMarkDirty();
  let rows = teCurrentReturn.scheduleC.otherExpenseRows;
  if (!rows) return;
  rows.splice(idx, 1);
  teRenderSchedCOtherExpRows();
  teRecalculate();
}

// Part V — update a single field (desc or amount) on an existing other-expense row
function teOnSchedCOtherExp(idx, field, value) {
  if (!teCurrentReturn) return;
  teMarkDirty();
  let rows = teCurrentReturn.scheduleC.otherExpenseRows;
  if (!rows || !rows[idx]) return;
  rows[idx][field] = value;
  // Update the running total span immediately without re-rendering the whole list
  let total = rows.reduce((s, r) => s + (parseFloat(r.amount) || 0), 0);
  let totEl = document.getElementById('te-sc-l48');
  if (totEl) totEl.textContent = teFmt(total);
  clearTimeout(teSchedCTimer);
  teSchedCTimer = setTimeout(() => teRecalculate(), 150);
}

// Part V — re-render ONLY the rows list (te-sc-v-rows element).
// Called after add/delete so the row list reflects current state without
// destroying focus on other inputs in the form.
function teRenderSchedCOtherExpRows() {
  let el = document.getElementById('te-sc-v-rows');
  if (!el) return;
  let rows = (teCurrentReturn && teCurrentReturn.scheduleC && teCurrentReturn.scheduleC.otherExpenseRows) || [];
  el.innerHTML = rows.map((row, i) =>
    `<div class="te-sc-row" style="gap:8px;">
       <span class="te-sc-num">—</span>
       <input type="text" class="te-input te-sc-lbl-inp" style="flex:1;" placeholder="Description"
         value="${esc(row.desc||'')}" oninput="teOnSchedCOtherExp(${i},'desc',this.value)">
       <input type="number" class="te-input te-mono te-sc-inp" step="0.01" min="0"
         value="${esc(String(row.amount||''))}" placeholder="0.00"
         oninput="teOnSchedCOtherExp(${i},'amount',this.value)">
       <button class="te-sc-del-btn" onclick="teSchedCDelOtherExp(${i})" title="Remove">✕</button>
     </div>`).join('');
}

// Collapsible section toggle — toggles te-sc-open class on the header + shows/hides the body.
// partId: 'p3' | 'p4' | 'p5'
function teToggleSchedCPart(partId) {
  let hdr  = document.getElementById('te-sc-hdr-' + partId);
  let body = document.getElementById('te-sc-body-' + partId);
  if (!hdr || !body) return;
  let isOpen = hdr.classList.toggle('te-sc-open');
  body.style.display = isOpen ? '' : 'none';
}

// ── Track 4 handlers ─────────────────────────────────────────────────

function teOn1099() {
  if (!teCurrentReturn) return;
  teMarkDirty();
  if (!teCurrentReturn.schedule1099) teCurrentReturn.schedule1099 = {};
  let g = id => { let el = document.getElementById(id); return el ? el.value : ''; };
  teCurrentReturn.schedule1099.interestIncome    = g('te-1099-int');
  teCurrentReturn.schedule1099.ordinaryDividends = g('te-1099-div-ord');
  teCurrentReturn.schedule1099.qualifiedDividends= g('te-1099-div-qual');
  teCurrentReturn.schedule1099.taxExemptInterest = g('te-1099-tex');
  teRecalculate();
}

// ── Schedule D handlers ──────────────────────────────────────────────

// Update a non-transaction field on scheduleD (lines 4–6, 11–14, 18, 19, QOF flag, etc.)
function teOnSchedD(field, value) {
  if (!teCurrentReturn) return;
  teMarkDirty();
  if (!teCurrentReturn.scheduleD) teCurrentReturn.scheduleD = {};
  teCurrentReturn.scheduleD[field] = value;
  clearTimeout(teSchedDTimer);
  teSchedDTimer = setTimeout(() => teRecalculate(), 150);
}

// Add a new transaction row to the ST or LT table.
// part: 'st' | 'lt'
function teSchedDAddTx(part) {
  if (!teCurrentReturn) return;
  teMarkDirty();
  let sd  = teCurrentReturn.scheduleD;
  let key = part === 'st' ? 'shortTermTransactions' : 'longTermTransactions';
  if (!sd[key]) sd[key] = [];
  let idx = sd[key].length;
  sd[key].push({ id: part + '-' + idx, description: '', dateAcquired: '', dateSold: '', proceeds: '', cost: '', adjustments: '' });
  // Append the new row to the DOM without full re-render (preserves existing row inputs)
  let container = document.getElementById('te-sd-' + part + '-rows');
  if (container) {
    let div = document.createElement('div');
    div.innerHTML = teSDTxRowHTML(part, sd[key][idx], idx);
    container.appendChild(div.firstElementChild);
    // Focus the description input of the new row
    let descInput = document.getElementById('te-sd-' + part + '-row-' + idx);
    if (descInput) { let inp = descInput.querySelector('input[type="text"]'); if (inp) inp.focus(); }
  }
  teRecalculate();
}

// Delete a transaction row by index.
// Keeps at least one empty row in the table.
function teSchedDDelTx(part, idx) {
  if (!teCurrentReturn) return;
  teMarkDirty();
  let sd  = teCurrentReturn.scheduleD;
  let key = part === 'st' ? 'shortTermTransactions' : 'longTermTransactions';
  if (!sd[key] || sd[key].length <= 1) {
    // Keep minimum one row — clear it instead of removing
    sd[key] = [{ id: part + '-0', description: '', dateAcquired: '', dateSold: '', proceeds: '', cost: '', adjustments: '' }];
  } else {
    sd[key].splice(idx, 1);
  }
  // Re-render all rows (indexes shift after splice)
  teRenderSDTxRows(part);
  teRecalculate();
}

// Update a single field on an existing transaction row.
// Recalculates just that row's gain cell + table totals without re-rendering other rows.
function teOnSchedDTx(part, idx, field, value) {
  if (!teCurrentReturn) return;
  teMarkDirty();
  let sd  = teCurrentReturn.scheduleD;
  let key = part === 'st' ? 'shortTermTransactions' : 'longTermTransactions';
  if (!sd[key] || !sd[key][idx]) return;
  sd[key][idx][field] = value;

  // Immediate gain cell update (proceeds/cost/adj change only — no debounce needed)
  if (field === 'proceeds' || field === 'cost' || field === 'adjustments') {
    let tx   = sd[key][idx];
    let gain = teRound((parseFloat(tx.proceeds)||0) - (parseFloat(tx.cost)||0) + (parseFloat(tx.adjustments)||0));
    let hasAmts = tx.proceeds || tx.cost || tx.description;
    let gainEl  = document.getElementById('te-sd-' + part + '-gain-' + idx);
    if (gainEl) {
      gainEl.textContent  = hasAmts ? (gain >= 0 ? teFmt(gain) : '(' + teFmt(Math.abs(gain)) + ')') : '\u2014';
      gainEl.className    = 'te-sd-col-gain te-mono ' + (gain >= 0 ? 'te-sd-gain-pos' : 'te-sd-gain-neg');
    }
  }

  // Holding period warning update for date fields
  if (field === 'dateAcquired' || field === 'dateSold') {
    let tx = sd[key][idx];
    let row = document.getElementById('te-sd-' + part + '-row-' + idx);
    if (row) {
      let existing = row.querySelector('.te-sd-tx-warn');
      let warn = '';
      if (tx.dateAcquired && tx.dateSold && (tx.proceeds || tx.cost || tx.description)) {
        let a = new Date(tx.dateAcquired), b = new Date(tx.dateSold);
        if (!isNaN(a.getTime()) && !isNaN(b.getTime())) {
          let days = Math.floor((b - a) / 86400000);
          let isWrong = part === 'st' ? days > 365 : days <= 365;
          if (isWrong) warn = part === 'st'
            ? `<button class="te-sd-tx-warn-btn" onclick="teSchedDMoveTx('st',${idx})">&#9888; Held &gt; 1 year &mdash; Move to Part II (Long-Term)</button>`
            : `<button class="te-sd-tx-warn-btn" onclick="teSchedDMoveTx('lt',${idx})">&#9888; Held &le; 1 year &mdash; Move to Part I (Short-Term)</button>`;
        }
      }
      if (existing) existing.remove();
      if (warn) { let d = document.createElement('div'); d.className = 'te-sd-tx-warn'; d.innerHTML = warn; row.appendChild(d); }
    }
  }

  clearTimeout(teSchedDTimer);
  teSchedDTimer = setTimeout(() => teRecalculate(), 150);
}

// Move a transaction from one part to the other (ST→LT or LT→ST).
// Called from the holding-period warning button.
// Copies the full row to the destination, deletes from source, re-renders both tables.
function teSchedDMoveTx(fromPart, idx) {
  if (!teCurrentReturn) return;
  teMarkDirty();
  let sd      = teCurrentReturn.scheduleD;
  let fromKey = fromPart === 'st' ? 'shortTermTransactions' : 'longTermTransactions';
  let toPart  = fromPart === 'st' ? 'lt' : 'st';
  let toKey   = fromPart === 'st' ? 'longTermTransactions'  : 'shortTermTransactions';
  if (!sd[fromKey] || !sd[fromKey][idx]) return;
  // Copy the row to the destination table
  if (!sd[toKey]) sd[toKey] = [];
  let tx = { ...sd[fromKey][idx], id: toPart + '-' + sd[toKey].length };
  sd[toKey].push(tx);
  // Remove from source — keep at least one empty row
  if (sd[fromKey].length <= 1) {
    sd[fromKey] = [{ id: fromPart + '-0', description: '', dateAcquired: '', dateSold: '', proceeds: '', cost: '', adjustments: '' }];
  } else {
    sd[fromKey].splice(idx, 1);
  }
  teRenderSDTxRows(fromPart);
  teRenderSDTxRows(toPart);
  teRecalculate();
}

// Re-render the entire tx rows container for a given part.
// Called after add/delete when row indexes have shifted.
function teRenderSDTxRows(part) {
  let container = document.getElementById('te-sd-' + part + '-rows');
  if (!container) return;
  let sd  = (teCurrentReturn && teCurrentReturn.scheduleD) || {};
  let key = part === 'st' ? 'shortTermTransactions' : 'longTermTransactions';
  let txs = sd[key] || [];
  container.innerHTML = txs.map((tx, i) => teSDTxRowHTML(part, tx, i)).join('');
}

function teAddScheduleE() {
  if (!teCurrentReturn) return;
  teMarkDirty();
  if (!teCurrentReturn.scheduleE) teCurrentReturn.scheduleE = [];
  teCurrentReturn.scheduleE.push({ name: '', ein: '', entityType: 'partnership', incomeAmount: '', isPassive: true, qbiAmount: '' });
  teRenderScheduleEList();
  teRecalculate();
}

function teRmScheduleE(i) {
  if (!teCurrentReturn) return;
  teMarkDirty();
  teCurrentReturn.scheduleE.splice(i, 1);
  teRenderScheduleEList();
  teRecalculate();
}

function teOnScheduleE(i, field, val) {
  if (!teCurrentReturn || !teCurrentReturn.scheduleE[i]) return;
  teMarkDirty();
  teCurrentReturn.scheduleE[i][field] = val;
  // Clear qbiAmount when switching to C-Corp — C-corp income never qualifies for §199A
  if (field === 'entityType' && val === 'ccorp') {
    teCurrentReturn.scheduleE[i].qbiAmount = '';
  }
  teRecalculate();
  let calc = teCurrentReturn._calc || {};
  // Re-render on structural changes (entityType changes QBI field visibility; passive changes loss note)
  if (field === 'entityType' || field === 'isPassive' || calc.passiveLossSuspended > 0) {
    teRenderScheduleEList();
  }
}

function teOnInvestmentInterest() {
  if (!teCurrentReturn) return;
  teMarkDirty();
  if (!teCurrentReturn.investmentInterest) teCurrentReturn.investmentInterest = {};
  let g  = id => { let el = document.getElementById(id); return el ? el.value   : ''; };
  let gc = id => { let el = document.getElementById(id); return el ? el.checked : false; };
  teCurrentReturn.investmentInterest.expense               = g('te-ii-exp');
  teCurrentReturn.investmentInterest.priorYearCarryforward = g('te-ii-cf');
  teCurrentReturn.investmentInterest.includeQDinNII        = gc('te-ii-qd');
  teRecalculate();
}

// Handler — Alimony field changes
function teOnAlimony() {
  if (!teCurrentReturn) return;
  teMarkDirty();
  if (!teCurrentReturn.alimony) teCurrentReturn.alimony = {};
  let g  = id => { let el = document.getElementById(id); return el ? el.value   : ''; };
  let gb = id => { let el = document.getElementById(id); return el ? el.checked : false; };
  teCurrentReturn.alimony.paid         = g('te-al-paid');
  teCurrentReturn.alimony.preAgreement = gb('te-al-pre');
  teRecalculate();
}

// Handler — Estimated payments field changes
function teOnEstPay() {
  if (!teCurrentReturn) return;
  teMarkDirty();
  if (!teCurrentReturn.estimatedPayments) teCurrentReturn.estimatedPayments = {};
  let g = id => { let el = document.getElementById(id); return el ? el.value : ''; };
  teCurrentReturn.estimatedPayments.q1 = g('te-ep-q1');
  teCurrentReturn.estimatedPayments.q2 = g('te-ep-q2');
  teCurrentReturn.estimatedPayments.q3 = g('te-ep-q3');
  teCurrentReturn.estimatedPayments.q4 = g('te-ep-q4');
  teRecalculate();
}


// ──────────────────────────────────────────────────────────────────────
//  SCHEDULE A — TRACK 2 CALC FUNCTIONS
// ──────────────────────────────────────────────────────────────────────

// IRC §164(a)(3),(b)(6) — SALT Deduction
// Source: irs.gov/newsroom/one-big-beautiful-bill-provisions-individuals-and-workers
// Effective cap = SALT cap reduced by 30% of MAGI over threshold; floor $10,000.
// MAGI for SALT phase-down = AGI (no additional modifications for Phase 1 W-2 returns).

// IRC §163(h)(3) — Qualified Residence Interest (Mortgage Interest Deduction)
// Source: uscode.house.gov/view.xhtml?req=granuleid:USC-prelim-title26-section163
// If outstanding balance exceeds qualified debt limit: deductible portion is
//   interest × (limit / balance) — IRC §163(h)(3)(F)(i)

// IRC §170(b)(1) — Charitable Contribution Deduction
// Source: uscode.house.gov/view.xhtml?req=granuleid:USC-prelim-title26-section170
// Cash: capped at 60% of AGI; Non-cash: capped at 50% of AGI; 30% cap-gain bucket; 20% private foundation bucket.
// 5-year carryover IRC §170(d)(1). OBBBA §70115: 0.5% AGI floor for TY2026+.

// IRC §213(a) — Medical Expense Deduction
// Source: uscode.house.gov/view.xhtml?req=granuleid:USC-prelim-title26-section213
// Deductible amount = medical expenses exceeding 7.5% of AGI. ARP §9222 — floor made permanent.

// ── Unified Schedule A form screen — IRS line-by-line layout ────────────
// Mirrors Schedule SE / Schedule 1 visual pattern: line# | label | value/input
function teRenderScheduleA() {
  let r    = teCurrentReturn;
  let sa   = r.scheduleA     || {};
  let calc = r._calc         || {};
  let fs   = r.filingStatus  || 'single';
  let yr   = r.taxYear       || teActiveYear;
  let K    = TAX_CONSTANTS[yr];
  if (!K) return '<div class="te-empty">Tax constants not available for ' + yr + '.</div>';
  let agi   = calc.agi  || 0;
  let isMFS = (fs === 'mfs');
  let Ksa   = K.scheduleA    || {};
  let Km    = Ksa.mortgage   || {};
  let Kc    = Ksa.charitable || {};
  let Kg    = Ksa.gambling   || {};
  let Kh    = Ksa.itemizedHaircut;  // undefined TY2025; defined TY2026 (OBBBA §70111)
  let cb    = calc.charBreakdown || {};
  let sl1   = r.schedule1   || {};
  let co    = sa.charCarryover || {};
  let gambleWin   = parseFloat(sl1.l8b) || 0;
  let iiAllowed   = calc.investmentInterestAllowed || 0;
  let interestTot = teRound((calc.mortgageDeduction || 0) + iiAllowed);
  let l16Total    = teRound((calc.gamblingDeduction || 0) + (calc.otherDeductionsTotal || 0));
  let std   = calc.stdDed   || 0;
  let itm   = calc.itemizedNet || 0;
  let using = calc.deductionType === 'itemized' ? 'itemized' : 'standard';

  // ── Row helpers (same visual pattern as Schedule SE) ──────────────────
  // Computed/read-only row
  let cRow = (num, label, id, val) =>
    `<div class="te-se-row">
       <span class="te-se-num">${num}</span>
       <span class="te-se-lbl">${label}</span>
       <span class="te-se-val"${id ? ` id="${id}"` : ''}>${teFmt(val)}</span>
     </div>`;

  // User-input row
  let iRow = (num, label, id, val) =>
    `<div class="te-se-row">
       <span class="te-se-num">${num}</span>
       <span class="te-se-lbl">${label}</span>
       <input type="number" id="${id}" class="te-input te-mono te-se-inp"
         value="${esc(String(val || ''))}" placeholder="0.00" step="0.01" min="0"
         oninput="teOnScheduleA(true)">
     </div>`;

  // Checkbox option row (no line number)
  let cbRow = (id, label, checked, cite='') =>
    `<div class="te-se-row">
       <span class="te-se-num"></span>
       <span class="te-se-lbl" style="font-weight:normal;">
         <label style="display:flex;align-items:center;gap:7px;cursor:pointer;">
           <input type="checkbox" id="${id}" ${checked ? 'checked' : ''} onchange="teOnScheduleA()">
           ${label}${cite ? ' <span class="te-cite">' + cite + '</span>' : ''}
         </label>
       </span>
     </div>`;

  // Indented sub-row (supporting detail under a main line — no line number)
  let subRow = (label, inputHtml, rowId='', hidden=false) =>
    `<div class="te-se-row"${rowId ? ` id="${rowId}"` : ''}${hidden ? ' style="display:none;"' : ''}>
       <span class="te-se-num"></span>
       <span class="te-se-lbl" style="padding-left:1.4rem;font-size:0.85em;opacity:0.88;">${label}</span>
       ${inputHtml}
     </div>`;

  // Annotation bar (note under a section, not a line)
  let annot = text =>
    `<div class="te-ded-note" style="margin:2px 0 8px 2.8rem;font-size:0.82rem;">${text}</div>`;

  // ── Comparison bar ────────────────────────────────────────────────────
  let barHtml =
    '<span style="margin-right:16px">Std: <strong>' + teFmt(std) + '</strong></span>' +
    '<span style="margin-right:16px">Itemized: <strong>' + teFmt(itm) + '</strong></span>' +
    '<span style="color:' + (using === 'itemized' ? '#4fc3f7' : '#81c784') + '">Using: <strong>' +
    (using === 'itemized' ? 'Itemized' : 'Standard') + '</strong></span>';

  // ── MEDICAL ───────────────────────────────────────────────────────────
  let medFloor = teRound(agi * ((Ksa.medical && Ksa.medical.agiFloor) || 0.075));

  // ── SALT ──────────────────────────────────────────────────────────────
  let saltGross = teRound(
    (parseFloat(sa.useSalesTax ? sa.salesTax : sa.stateIncomeTax) || 0) +
    (sa.useSalesTax ? 0 : (parseFloat(sa.localIncomeTax) || 0)) +
    (parseFloat(sa.realEstateTax) || 0) + (parseFloat(sa.personalPropertyTax) || 0)
  );
  let saltNote = yr >= 2026
    ? 'OBBBA §70107: $40,400 cap ($20,200 MFS) phases down at 30% of AGI above $505,050; floor $10,000. IRC §164(b)(6).'
    : 'TCJA §11042: Capped at $10,000 ($5,000 MFS). IRC §164(b)(6).';

  // ── MORTGAGE ─────────────────────────────────────────────────────────
  let isPost2017 = (sa.mortgageLoanDate !== 'pre2018');
  let miLimit    = isMFS
    ? (isPost2017 ? (Km.mfsPost2017Limit || 375000) : (Km.mfsPre2018Limit || 500000))
    : (isPost2017 ? (Km.post2017Limit    || 750000) : (Km.pre2018Limit    || 1000000));
  let miBalance  = parseFloat(sa.mortgageBalance) || 0;
  let miProrated = miBalance > miLimit && miBalance > 0;

  // ── CHARITABLE OBBBA floor ────────────────────────────────────────────
  let charFloorNote = Kc.agiFloor
    ? annot('OBBBA §70425: 0.5% AGI floor (' + teFmt(teRound(agi * Kc.agiFloor)) + ') applied. Deduction reduced by ' + teFmt(cb.floorReduction || 0) + '. IRC §170(b)(1)(I).')
    : '';

  // ── GAMBLING ─────────────────────────────────────────────────────────
  let gambleNote = yr >= 2026
    ? 'OBBBA §70114: losses limited to 90% of gambling winnings. IRC §165(d).'
    : 'IRC §165(d): losses limited to gambling winnings.';

  return `
    <div class="te-sch-se">

      <div class="te-se-header-bar">
        <div class="te-se-title">Schedule A — Itemized Deductions</div>
        <div class="te-se-subtitle">Attach to Form 1040 &nbsp;·&nbsp; IRC §63(d) &nbsp;·&nbsp; Tax Year ${yr}</div>
      </div>

      <div id="te-sa-comparison-bar" class="te-total-bar" style="margin:4px 0 4px;flex-wrap:wrap;gap:8px;">${barHtml}</div>

      ${cbRow('te-sa-elect', 'Elect to itemize even if less than standard deduction', sa.electToItemize, 'IRC §63(e)')}
      ${isMFS ? cbRow('te-sa-mfsi', 'MFS — spouse is also itemizing (prevents use of standard deduction)', sa.mfsSpouseItemizes, 'IRC §63(e)(3)') : ''}

      <div class="te-se-section-label">Medical and Dental Expenses <span class="te-cite">IRC §213(a) — Lines 1–4</span></div>

      ${iRow('1', 'Medical and dental expenses', 'te-sa-med', sa.medicalExpenses)}
      ${cRow('2', 'Your adjusted gross income (Form 1040, line 11b)', 'te-sa-l2', agi)}
      ${cRow('3', 'Multiply line 2 by 7.5% (.075) <span class="te-cite">ARP §9222 — permanent floor</span>', 'te-sa-l3', medFloor)}
      ${cRow('4', 'Subtract line 3 from line 1. If line 3 is more than line 1, enter -0-', 'te-sa-l4', calc.medicalDeduction || 0)}

      <div class="te-se-section-label" style="margin-top:12px;">Taxes You Paid <span class="te-cite">IRC §164 — Lines 5a–7</span></div>

      ${cbRow('te-sa-use-st', 'Elect to deduct state and local <strong>general sales tax</strong> instead of income tax', sa.useSalesTax, 'IRC §164(b)(5)')}

      <div id="te-sa-r-sit" class="te-se-row"${sa.useSalesTax ? ' style="display:none;"' : ''}>
        <span class="te-se-num">5a</span>
        <span class="te-se-lbl">State and local income taxes</span>
        <input type="number" id="te-sa-sit" class="te-input te-mono te-se-inp"
          value="${esc(String(sa.stateIncomeTax||''))}" placeholder="0.00" step="0.01" min="0"
          oninput="teOnScheduleA(true)">
      </div>
      ${subRow('Local income taxes (if separate from state return)', `<input type="number" id="te-sa-lit" class="te-input te-mono te-se-inp" value="${esc(String(sa.localIncomeTax||''))}" placeholder="0.00" step="0.01" min="0" oninput="teOnScheduleA(true)">`, 'te-sa-r-lit', !!sa.useSalesTax)}
      <div id="te-sa-r-st" class="te-se-row"${!sa.useSalesTax ? ' style="display:none;"' : ''}>
        <span class="te-se-num">5a</span>
        <span class="te-se-lbl">General sales taxes <span class="te-cite">IRC §164(b)(5)</span></span>
        <input type="number" id="te-sa-st" class="te-input te-mono te-se-inp"
          value="${esc(String(sa.salesTax||''))}" placeholder="0.00" step="0.01" min="0"
          oninput="teOnScheduleA(true)">
      </div>

      ${iRow('5b', 'State and local real estate taxes', 'te-sa-ret', sa.realEstateTax)}
      ${iRow('5c', 'State and local personal property taxes', 'te-sa-ppt', sa.personalPropertyTax)}
      ${cRow('5d', 'Add lines 5a through 5c', 'te-sa-l5d', saltGross)}

      <div class="te-se-row">
        <span class="te-se-num">6</span>
        <span class="te-se-lbl">Other taxes — list type and amount:
          <button class="ghost-btn te-sm-btn" style="margin-left:8px;" onclick="teAddSAOtherTax()">+ Add Row</button>
          <div id="te-sa-other-tax-rows" style="margin-top:4px;"></div>
        </span>
      </div>

      ${cRow('7', 'Add lines 5d through 6 (subject to SALT limitation below)', 'te-sa-l7', calc.saltDeduction || 0)}
      ${annot(saltNote)}

      <div class="te-se-section-label" style="margin-top:12px;">Interest You Paid <span class="te-cite">IRC §163(h) — Lines 8a–10</span></div>

      ${iRow('8a', 'Home mortgage interest and points reported on Form 1098', 'te-sa-mi', sa.mortgageInterest)}
      ${subRow('Outstanding loan balance (Form 1098, Box 2)', `<input type="number" id="te-sa-mb" class="te-input te-mono te-se-inp" value="${esc(String(sa.mortgageBalance||''))}" placeholder="0.00" step="0.01" min="0" oninput="teOnScheduleA(true)">`, '', false)}
      <div class="te-se-row" style="padding-left:2.8rem;">
        <span class="te-se-num"></span>
        <span class="te-se-lbl" style="font-size:0.85em;opacity:0.88;">Loan origination date</span>
        <select id="te-sa-mld" class="te-select" style="max-width:220px;" onchange="teOnScheduleA()">
          <option value="post2017" ${isPost2017  ? 'selected' : ''}>Post-2017 — $750K limit ($375K MFS)</option>
          <option value="pre2018"  ${!isPost2017 ? 'selected' : ''}>Pre-2018 grandfathered — $1M ($500K MFS)</option>
        </select>
      </div>
      <div class="te-se-row" style="padding-left:2.8rem;">
        <span class="te-se-num"></span>
        <span class="te-se-lbl" style="font-size:0.85em;opacity:0.88;">Loan purpose</span>
        <select id="te-sa-mp" class="te-select" style="max-width:220px;" onchange="teOnScheduleA()">
          <option value="acquisition" ${(sa.mortgagePurpose||'acquisition')==='acquisition'?'selected':''}>Acquisition debt (deductible)</option>
          <option value="home-equity" ${sa.mortgagePurpose==='home-equity'?'selected':''}>Home equity — non-deductible post-TCJA</option>
          <option value="mixed"       ${sa.mortgagePurpose==='mixed'      ?'selected':''}>Mixed (partial acquisition debt)</option>
        </select>
      </div>
      ${miProrated ? `<div class="te-se-row" style="padding-left:2.8rem;">
        <span class="te-se-num"></span>
        <span class="te-se-lbl" style="font-size:0.85em;color:#ffb74d;">
          Loan balance ($${miBalance.toLocaleString()}) exceeds ${teFmt(miLimit)} limit — interest prorated per IRC §163(h)(3)(F)(i)
        </span>
      </div>` : ''}

      ${iRow('8b', 'Home mortgage interest not reported on Form 1098', 'te-sa-mio', sa.mortgageInterestOther)}
      ${iRow('8c', 'Points not reported on Form 1098', 'te-sa-pts', sa.mortgagePoints)}
      ${Km.pmi
        ? iRow('8d', 'Mortgage insurance premiums <span class="te-cite">OBBBA §70108</span>', 'te-sa-pmi', sa.pmiPremiums)
        : ''}
      ${cRow('8e', 'Add lines 8a through 8d', 'te-sa-l8e', calc.mortgageDeduction || 0)}
      ${cRow('9',  'Investment interest expense (Form 4952) <span class="te-cite">IRC §163(d) — from Investment Income section</span>', 'te-sa-l9', iiAllowed)}
      ${cRow('10', 'Add lines 8e and 9', 'te-sa-l10', interestTot)}

      <div class="te-se-section-label" style="margin-top:12px;">Gifts to Charity <span class="te-cite">IRC §170 — Lines 11–14</span></div>

      ${iRow('11', 'Gifts by cash or check <span class="te-cite">60% of AGI limit — IRC §170(b)(1)(A)</span>', 'te-sa-cc', sa.cashCharitable)}
      ${iRow('12', 'Other than by cash or check <span class="te-cite">50% of AGI limit — IRC §170(b)(1)(A)</span>', 'te-sa-nc', sa.nonCashCharitable)}
      ${iRow('13', 'Carryover from prior year <span class="te-cite">IRC §170(d)(1) — 5-year carryover</span>', 'te-sa-co-c60', co.cash60)}

      <div class="te-se-row" style="padding-left:2.8rem;cursor:pointer;" onclick="teToggleSACharAdv()">
        <span class="te-se-num"></span>
        <span class="te-se-lbl" style="font-size:0.83em;color:var(--accent);" id="te-sa-char-adv-btn">
          ▸ Advanced: Capital gain property contributions &amp; per-bucket carryovers
        </span>
      </div>
      <div id="te-sa-char-adv" style="display:none;">
        ${iRow('', 'Cap. gain property to 50% organizations <span class="te-cite">IRC §170(b)(1)(C) — 30% limit</span>', 'te-sa-cg30', sa.capGainCharitable30)}
        ${iRow('', 'Cap. gain property to private foundations <span class="te-cite">IRC §170(b)(1)(D) — 20% limit</span>', 'te-sa-priv20', sa.capGainCharitable20)}
        ${iRow('', 'Non-cash 50% carryover from prior year', 'te-sa-co-nc50', co.noncash50)}
        ${iRow('', 'Cap. gain 30% carryover from prior year', 'te-sa-co-cg30', co.capgain30)}
        ${iRow('', 'Private foundation 20% carryover from prior year', 'te-sa-co-p20', co.private20)}
      </div>

      ${cRow('14', 'Add lines 11 through 13', 'te-sa-l14', calc.charitableDeduction || 0)}
      ${charFloorNote}

      <div class="te-se-section-label" style="margin-top:12px;">Casualty and Theft Losses <span class="te-cite">IRC §165(h) — Line 15</span></div>

      <div class="te-se-row">
        <span class="te-se-num"></span>
        <span class="te-se-lbl" style="font-size:0.85em;opacity:0.88;">
          ${yr >= 2026
            ? 'Federally OR state-declared disasters qualify (OBBBA §70109). $100 per-event floor; then 10% of AGI aggregate floor.'
            : 'Federal disaster declarations only (TCJA). $100 per-event floor; then 10% of AGI aggregate floor.'}
          <button class="ghost-btn te-sm-btn" style="margin-left:8px;" onclick="teAddSACasualty()">+ Add Event</button>
          <div id="te-sa-casualty-rows" style="margin-top:4px;"></div>
        </span>
      </div>
      ${cRow('15', 'Casualty and theft loss(es) from a declared disaster. Attach Form 4684.', 'te-sa-l15', calc.casualtyDeduction || 0)}

      <div class="te-se-section-label" style="margin-top:12px;">Other Itemized Deductions <span class="te-cite">IRC §165(d) — Line 16</span></div>

      ${iRow('16', 'Gambling losses <span class="te-cite">IRC §165(d)</span>', 'te-sa-gl', sa.gamblingLosses)}
      <div class="te-se-row" style="padding-left:2.8rem;">
        <span class="te-se-num"></span>
        <span class="te-se-lbl" style="font-size:0.84em;opacity:0.88;">
          Gambling losses allowed: <strong id="te-sa-l16g">${teFmt(calc.gamblingDeduction || 0)}</strong>
          &nbsp;|&nbsp; Winnings (Sch. 1 Line 8b): ${teFmt(gambleWin)} &nbsp;|&nbsp; ${gambleNote}
        </span>
      </div>

      <div class="te-se-row">
        <span class="te-se-num"></span>
        <span class="te-se-lbl" style="font-size:0.85em;opacity:0.88;">
          Other — list type and amount (investment fees, safe deposit box, etc.):
          <button class="ghost-btn te-sm-btn" style="margin-left:8px;" onclick="teAddSAOtherDed()">+ Add Row</button>
          <div id="te-sa-other-ded-rows" style="margin-top:4px;"></div>
        </span>
      </div>
      ${cRow('16 total', 'Total other itemized deductions (gambling allowed + other listed)', 'te-sa-l16', l16Total)}

      <div class="te-se-section-label" style="margin-top:12px;">Total Itemized Deductions <span class="te-cite">IRC §63(d) — Lines 17–18</span></div>

      ${cRow('17', 'Add lines 4, 7, 10, 14, 15, and 16. Enter on Form 1040, line 12a.', 'te-sa-l17', calc.itemizedRaw || 0)}
      ${Kh ? cRow('', 'Less: 2/37ths high-income limitation on itemized deductions <span class="te-cite">OBBBA §70111</span>', 'te-sa-haircut', calc.itemizedHaircut || 0) : ''}

      <div class="te-total-bar" style="margin-top:8px;">
        <span>Net Itemized Deduction${Kh ? ' (after OBBBA §70111 haircut)' : ''} <span class="te-cite">1040 Line 12a</span></span>
        <span class="te-total-val te-mono" id="te-sa-net-total">${teFmt(itm)}</span>
      </div>
      <div class="te-total-bar" style="margin-top:4px;opacity:0.75;">
        <span>Standard Deduction <span class="te-cite">IRC §63(c)</span></span>
        <span class="te-total-val te-mono">${teFmt(std)}</span>
      </div>
      <div class="te-total-bar" style="margin-top:4px;background:${using==='itemized'?'rgba(79,195,247,0.08)':'rgba(129,199,132,0.08)'};">
        <span>Deduction Applied on Form 1040 (${using === 'itemized' ? 'Itemized' : 'Standard'})</span>
        <span class="te-total-val te-mono" style="color:${using==='itemized'?'#4fc3f7':'#81c784'}">${teFmt(calc.deductionUsed || 0)}</span>
      </div>

    </div>`;
}

function teToggleSACharAdv() {
  let el  = document.getElementById('te-sa-char-adv');
  let btn = document.getElementById('te-sa-char-adv-btn');
  if (!el) return;
  let open = el.style.display !== 'none';
  el.style.display = open ? 'none' : '';
  if (btn) btn.innerHTML = (open ? '▸' : '▾') + ' Advanced: Capital gain property contributions &amp; per-bucket carryovers';
}

// Handler for Schedule A field changes
// debounce=true → 150ms timer (text/number inputs); debounce falsy → immediate (selects/checkboxes)
function teOnScheduleA(debounce) {
  if (!teCurrentReturn) return;
  teMarkDirty();
  if (!teCurrentReturn.scheduleA) teCurrentReturn.scheduleA = {};
  let s  = teCurrentReturn.scheduleA;
  let gv = id => { let el = document.getElementById(id); return el ? el.value : ''; };
  let gc = id => { let el = document.getElementById(id); return el ? el.checked : false; };
  // Toggles / selects (always read — immediate)
  s.useSalesTax         = gc('te-sa-use-st');
  s.mortgageLoanDate    = gv('te-sa-mld') || 'post2017';
  s.mortgagePurpose     = gv('te-sa-mp')  || 'acquisition';
  s.mfsSpouseItemizes   = gc('te-sa-mfsi');
  s.electToItemize      = gc('te-sa-elect');
  // Toggle 5a row visibility: income tax rows ↔ sales tax row (no re-render needed)
  let rSit = document.getElementById('te-sa-r-sit');
  let rLit = document.getElementById('te-sa-r-lit');
  let rSt  = document.getElementById('te-sa-r-st');
  if (rSit) rSit.style.display = s.useSalesTax ? 'none' : '';
  if (rLit) rLit.style.display = s.useSalesTax ? 'none' : '';
  if (rSt)  rSt.style.display  = s.useSalesTax ? '' : 'none';
  // Text / number inputs
  s.medicalExpenses     = gv('te-sa-med');
  s.stateIncomeTax      = s.useSalesTax ? s.stateIncomeTax : gv('te-sa-sit');
  s.salesTax            = s.useSalesTax ? gv('te-sa-st')   : s.salesTax;
  s.localIncomeTax      = gv('te-sa-lit');
  s.realEstateTax       = gv('te-sa-ret');
  s.personalPropertyTax = gv('te-sa-ppt');
  s.mortgageInterest    = gv('te-sa-mi');
  s.mortgageBalance     = gv('te-sa-mb');
  s.mortgagePoints      = gv('te-sa-pts');
  s.mortgageInterestOther = gv('te-sa-mio');
  s.pmiPremiums         = gv('te-sa-pmi');
  s.cashCharitable      = gv('te-sa-cc');
  s.nonCashCharitable   = gv('te-sa-nc');
  s.capGainCharitable30 = gv('te-sa-cg30');
  s.capGainCharitable20 = gv('te-sa-priv20');
  if (!s.charCarryover) s.charCarryover = {};
  s.charCarryover.cash60    = gv('te-sa-co-c60');
  s.charCarryover.noncash50 = gv('te-sa-co-nc50');
  s.charCarryover.capgain30 = gv('te-sa-co-cg30');
  s.charCarryover.private20 = gv('te-sa-co-p20');
  s.gamblingLosses      = gv('te-sa-gl');
  if (debounce) {
    clearTimeout(teSchedATimer);
    teSchedATimer = setTimeout(() => teRecalculate(), 150);
  } else {
    teRecalculate();
  }
}

// ── Schedule A — dynamic row handlers ────────────────────────────────────

function teAddSAOtherTax() {
  let sa = teCurrentReturn.scheduleA;
  if (!sa.otherTaxes) sa.otherTaxes = [];
  sa.otherTaxes.push({ description: '', amount: '' });
  teMarkDirty(); teRenderSAOtherTaxRows(); teRecalculate();
}
function teRemoveSAOtherTax(i) {
  teCurrentReturn.scheduleA.otherTaxes.splice(i, 1);
  teMarkDirty(); teRenderSAOtherTaxRows(); teRecalculate();
}
function teOnSAOtherTax(i, field, val) {
  teCurrentReturn.scheduleA.otherTaxes[i][field] = val;
  teMarkDirty();
}
function teRenderSAOtherTaxRows() {
  let el = document.getElementById('te-sa-other-tax-rows');
  if (!el) return;
  let rows = (teCurrentReturn.scheduleA.otherTaxes) || [];
  el.innerHTML = rows.map((row, i) => `
    <div class="te-frow" style="gap:8px;align-items:center;margin-top:5px;">
      <input type="text" class="te-input" style="flex:2;min-width:140px;" placeholder="Description (e.g., foreign income taxes)"
        value="${esc(row.description||'')}"
        oninput="teOnSAOtherTax(${i},'description',this.value)">
      <input type="number" class="te-input te-mono" style="max-width:130px;" placeholder="0.00" step="0.01" min="0"
        value="${esc(String(row.amount||''))}"
        oninput="teOnSAOtherTax(${i},'amount',this.value);teOnScheduleA(true)">
      <button class="te-sc-del-btn" onclick="teRemoveSAOtherTax(${i})" title="Remove">✕</button>
    </div>`).join('');
}

function teAddSACasualty() {
  let sa = teCurrentReturn.scheduleA;
  if (!sa.casualtyEvents) sa.casualtyEvents = [];
  sa.casualtyEvents.push({ description: '', lossAmount: '', isDisasterFederal: false, isDisasterState: false });
  teMarkDirty(); teRenderSACasualtyRows(); teRecalculate();
}
function teRemoveSACasualty(i) {
  teCurrentReturn.scheduleA.casualtyEvents.splice(i, 1);
  teMarkDirty(); teRenderSACasualtyRows(); teRecalculate();
}
function teOnSACasualty(i, field, val) {
  let ev = teCurrentReturn.scheduleA.casualtyEvents[i];
  if (field === 'isDisasterFederal' || field === 'isDisasterState') ev[field] = !!val;
  else ev[field] = val;
  teMarkDirty(); teRecalculate();
}
function teRenderSACasualtyRows() {
  let el = document.getElementById('te-sa-casualty-rows');
  if (!el) return;
  let yr   = (teCurrentReturn.taxYear || teActiveYear);
  let rows = (teCurrentReturn.scheduleA.casualtyEvents) || [];
  el.innerHTML = rows.map((ev, i) => `
    <div style="border:1px solid var(--border);border-radius:6px;padding:10px;margin-top:8px;">
      <div class="te-frow" style="gap:8px;align-items:center;flex-wrap:wrap;">
        <input type="text" class="te-input" style="flex:2;min-width:140px;" placeholder="Event description (e.g., Hurricane Helene — FEMA DR-4827)"
          value="${esc(ev.description||'')}"
          oninput="teOnSACasualty(${i},'description',this.value)">
        <input type="number" class="te-input te-mono" style="max-width:140px;" placeholder="Loss amount" step="0.01" min="0"
          value="${esc(String(ev.lossAmount||''))}"
          oninput="teOnSACasualty(${i},'lossAmount',this.value);teOnScheduleA(true)">
        <button class="te-sc-del-btn" onclick="teRemoveSACasualty(${i})" title="Remove">✕</button>
      </div>
      <div class="te-frow" style="gap:16px;margin-top:6px;flex-wrap:wrap;">
        <label style="display:flex;align-items:center;gap:5px;font-size:0.83rem;cursor:pointer;">
          <input type="checkbox" ${ev.isDisasterFederal ? 'checked' : ''}
            onchange="teOnSACasualty(${i},'isDisasterFederal',this.checked)">
          Federally declared disaster <span class="te-cite">IRC §165(h)(5)</span>
        </label>
        ${yr >= 2026 ? `<label style="display:flex;align-items:center;gap:5px;font-size:0.83rem;cursor:pointer;">
          <input type="checkbox" ${ev.isDisasterState ? 'checked' : ''}
            onchange="teOnSACasualty(${i},'isDisasterState',this.checked)">
          State-declared disaster <span class="te-cite">OBBBA §70109</span>
        </label>` : ''}
      </div>
    </div>`).join('');
}

function teAddSAOtherDed() {
  let sa = teCurrentReturn.scheduleA;
  if (!sa.otherDeductions) sa.otherDeductions = [];
  sa.otherDeductions.push({ description: '', amount: '' });
  teMarkDirty(); teRenderSAOtherDedRows(); teRecalculate();
}
function teRemoveSAOtherDed(i) {
  teCurrentReturn.scheduleA.otherDeductions.splice(i, 1);
  teMarkDirty(); teRenderSAOtherDedRows(); teRecalculate();
}
function teOnSAOtherDed(i, field, val) {
  teCurrentReturn.scheduleA.otherDeductions[i][field] = val;
  teMarkDirty();
}
function teRenderSAOtherDedRows() {
  let el = document.getElementById('te-sa-other-ded-rows');
  if (!el) return;
  let rows = (teCurrentReturn.scheduleA.otherDeductions) || [];
  el.innerHTML = rows.map((row, i) => `
    <div class="te-frow" style="gap:8px;align-items:center;margin-top:5px;">
      <input type="text" class="te-input" style="flex:2;min-width:140px;" placeholder="Description"
        value="${esc(row.description||'')}"
        oninput="teOnSAOtherDed(${i},'description',this.value)">
      <input type="number" class="te-input te-mono" style="max-width:130px;" placeholder="0.00" step="0.01" min="0"
        value="${esc(String(row.amount||''))}"
        oninput="teOnSAOtherDed(${i},'amount',this.value);teOnScheduleA(true)">
      <button class="te-sc-del-btn" onclick="teRemoveSAOtherDed(${i})" title="Remove">✕</button>
    </div>`).join('');
}


// ──────────────────────────────────────────────────────────────────────
//  PAYMENTS SECTION
// ──────────────────────────────────────────────────────────────────────

function teRenderEstimatedPayments() {
  let r    = teCurrentReturn;
  let ep   = (r && r.estimatedPayments) || {};
  let calc = (r && r._calc) || {};
  let yr   = r ? (r.taxYear || teActiveYear) : teActiveYear;
  // Due dates — Q1: Apr 15, Q2: Jun 16, Q3: Sep 15, Q4: Jan 15 following year
  let dates = [`Apr 15, ${yr}`, `Jun 16, ${yr}`, `Sep 15, ${yr}`, `Jan 15, ${yr + 1}`];
  return `
    <div class="te-frow" style="gap:12px;flex-wrap:wrap;margin-top:8px;">
      ${['q1','q2','q3','q4'].map((q, i) => `
        <div class="te-field-group" style="max-width:160px;">
          <label class="te-lbl">Q${i+1} — ${dates[i]}</label>
          <input type="number" id="te-ep-${q}" class="te-input te-mono"
            value="${esc(String(ep[q]||''))}" placeholder="0.00" step="0.01" min="0"
            oninput="teOnEstPay()">
        </div>`).join('')}
    </div>
    <div class="te-total-bar" style="margin-top:8px;">
      <span>Total Estimated Payments <span class="te-cite">IRC §6654</span></span>
      <span class="te-total-val">${teFmt(calc.estPayments || 0)}</span>
    </div>
    <div class="te-ded-note" style="margin-top:4px;">
      Required for self-employed individuals. Underpayment penalty applies if total payments are less than 90% of current-year tax or 100% of prior-year tax (110% if AGI > $150,000). <span class="te-cite">IRC §6654(d)</span>
    </div>`;
}

function teRenderScheduleSE() {
  let r    = teCurrentReturn;
  let calc = (r && r._calc) || {};
  let ln   = calc.seLines || {};
  let se   = (r && r.scheduleSE) || {};
  let yr   = r ? (r.taxYear || teActiveYear) : teActiveYear;
  let K    = TAX_CONSTANTS[yr];
  if (!K) return '<div class="te-empty">No tax constants loaded.</div>';

  // cRow: computed/read-only display line. valId: optional id on the value span for live DOM updates.
  let cRow = (num, label, val, cls='', valId='') =>
    `<div class="te-se-row${cls ? ' ' + cls : ''}">
       <span class="te-se-num">${num}</span>
       <span class="te-se-lbl">${label}</span>
       <span class="te-se-val"${valId ? ` id="${valId}"` : ''}>${val}</span>
     </div>`;

  // iRow: user-input line. field: scheduleSE data model key.
  let iRow = (num, label, field, val) =>
    `<div class="te-se-row">
       <span class="te-se-num">${num}</span>
       <span class="te-se-lbl">${label}</span>
       <input type="number" class="te-input te-mono te-se-inp" step="0.01" min="0"
         value="${esc(String(val || ''))}" placeholder="0.00"
         oninput="teOnSchedSE('${field}', this.value)">
     </div>`;

  let floorOk = ln.aboveFloor;

  return `
    <div class="te-sch-se">

      <div class="te-se-header-bar">
        <div class="te-se-title">Schedule SE — Self-Employment Tax</div>
        <div class="te-se-subtitle">Attach to Form 1040 &nbsp;·&nbsp; IRC §1401 / §1402 &nbsp;·&nbsp; Tax Year ${yr}</div>
      </div>

      <div class="te-se-section-label">Part I — Net Self-Employment Income</div>

      ${cRow('1a',
        'Net profit (loss) from Schedule C — trade or business <span class="te-cite">IRC §1402(a)</span>',
        teFmt(ln.line1a || 0),
        (ln.line1a || 0) === 0 ? 'te-se-zero' : '',
        'te-se-1a')}

      ${iRow('1b',
        'Net profit (loss) from Schedule F — farm income <span class="te-cite">IRC §1402(a)(1)</span>',
        'farmProfit', se.farmProfit)}

      ${iRow('2',
        'Conservation Reserve Program (CRP) payments from Schedule F <span class="te-cite">IRC §1402(a)</span>',
        'crpPayments', se.crpPayments)}

      ${cRow('3',
        'Combined net profit — sum of lines 1a, 1b, and 2',
        teFmt(ln.line3 || 0), 'te-se-sub', 'te-se-3')}

      <div class="te-se-section-label" style="margin-top:12px;">Part II — Self-Employment Tax Computation</div>

      ${cRow('4a',
        'Net earnings from SE: line 3 × 92.35% (net earnings rate) <span class="te-cite">IRC §1402(a)</span>',
        teFmt(ln.line4a || 0), 'te-se-sub', 'te-se-4a')}

      ${iRow('4b',
        'Optional SE method — if electing nonfarm or farm optional method <span class="te-cite">IRC §1402(a)</span>',
        'optionalMethods', se.optionalMethods)}

      ${cRow('4c',
        'Net SE earnings subject to SE tax (line 4a + line 4b)',
        teFmt(ln.line4c || 0), 'te-se-sub', 'te-se-4c')}

      <div id="te-se-floor">${!floorOk && (ln.line5b || 0) === 0
        ? `<div class="te-se-floor-note">
             Line 4c is ${teFmt(ln.line4c || 0)} — below the $400 minimum threshold.
             No SE tax applies to regular SE income. Enter church employee income (line 5a) if applicable.
             <span class="te-cite">IRC §1402(b)(2)</span>
           </div>`
        : ''}</div>

      ${iRow('5a',
        'Church employee income from Form W-2 — church employees not subject to FICA <span class="te-cite">IRC §3121(b)(8)</span>',
        'ssWagesOverride', se.ssWagesOverride)}

      ${cRow('5b',
        'Church employee income × 92.35%',
        teFmt(ln.line5b || 0), 'te-se-sub', 'te-se-5b')}

      ${cRow('6',
        'Total net SE earnings subject to tax (line 4c [if ≥ $400] + line 5b)',
        teFmt(ln.line6 || 0), 'te-se-sub', 'te-se-6')}

      <div class="te-se-divider"></div>

      ${cRow('7',
        `Maximum SS earnings — ${yr} annual wage base <span class="te-cite">IRC §1402(b)</span>`,
        teFmt(ln.line7 || 0))}

      ${cRow('8a',
        'W-2 Social Security wages already subject to FICA — reduces remaining wage base',
        teFmt(ln.line8a || 0), '', 'te-se-8a')}

      ${iRow('8b',
        'Unreported tips subject to SS tax (from Form 4137) <span class="te-cite">IRC §3102(c)</span>',
        'unreportedTips', se.unreportedTips)}

      ${cRow('9',
        'Remaining SS wage base capacity: line 7 − line 8a − line 8b',
        teFmt(ln.line9 || 0), 'te-se-sub', 'te-se-9')}

      <div class="te-se-divider"></div>

      ${cRow('10',
        'Social Security tax: lesser of (line 6, line 9) × 12.4% <span class="te-cite">IRC §1401(a)</span>',
        teFmt(ln.line10 || 0), 'te-se-tax', 'te-se-10')}

      ${cRow('11',
        'Medicare tax: line 6 × 2.9% — no wage base cap <span class="te-cite">IRC §1401(b)(1)</span>',
        teFmt(ln.line11 || 0), 'te-se-tax', 'te-se-11')}

      <div class="te-se-total-bar">
        <span>Line 12 — Total SE Tax &nbsp;<span class="te-cite" style="font-weight:400;">flows to Schedule 2, Line 4 · IRC §1401</span></span>
        <span id="te-se-total-val" class="te-total-val">${teFmt(ln.line12 || 0)}</span>
      </div>

      <div class="te-se-ded-row">
        <span class="te-se-num">13</span>
        <span class="te-se-lbl">§164(f) Deduction — 50% of SE tax; deductible above-the-line (reduces AGI) <span class="te-cite">IRC §164(f)</span></span>
        <span id="te-se-ded-val" class="te-se-val te-se-ded">(${teFmt(ln.line13 || 0)})</span>
      </div>

    </div>`;
}

function teRenderAddlTaxes() {
  let r    = teCurrentReturn;
  let calc = (r && r._calc) || {};
  let fs   = (r && r.filingStatus) || 'single';
  let yr   = r ? (r.taxYear || teActiveYear) : teActiveYear;
  let K    = TAX_CONSTANTS[yr];
  if (!K || !K.addlMedicare) return '<div class="te-empty">Enter income data to calculate.</div>';

  let amThr   = K.addlMedicare.threshold[fs]  || K.addlMedicare.threshold.single;
  let niitThr = K.niit.threshold[fs]           || K.niit.threshold.single;
  let earned  = teRound((calc.w2Wages || 0) + (calc.netSEIncome || 0));
  let amExcess = teRound(Math.max(0, earned - amThr));
  let niitExcess = teRound(Math.max(0, (calc.agi || 0) - niitThr));
  let nii     = calc.netInvestmentIncome || 0;
  let niitBase = teRound(Math.min(nii, niitExcess));

  let row = (label, val, cls='') =>
    `<div class="te-ctc-row${cls ? ' ' + cls : ''}"><span>${label}</span><span>${val}</span></div>`;

  // Additional Medicare Tax table
  let amTriggered = amExcess > 0;
  let amHtml = `
    <div class="te-ctc-tbl" style="margin-top:8px;">
      ${row('W-2 Wages', teFmt(calc.w2Wages || 0))}
      ${(calc.netSEIncome || 0) > 0 ? row('+ SE Income (Sch. C)', teFmt(calc.netSEIncome)) : ''}
      ${row('= Total Earned Income', teFmt(earned), 'te-ctc-sub')}
      ${row('− Threshold (' + ({single:'Single',mfj:'MFJ',mfs:'MFS',hoh:'HOH',qss:'QSS'}[fs]||fs) + ')', '(' + teFmt(amThr) + ')', 'te-ctc-sub')}
      ${amTriggered
        ? row('= Taxable Excess', teFmt(amExcess), 'te-ctc-sub')
          + row('× Rate', '0.9%', 'te-ctc-sub')
          + row('Additional Medicare Tax', teFmt(calc.addlMedicareTax || 0), 'te-ctc-tot')
        : row('= Taxable Excess', '$0 — below threshold', 'te-ctc-ok')
          + row('Additional Medicare Tax', '$0', 'te-ctc-tot')}
    </div>
    <div class="te-ded-note" style="margin-top:4px;">Applies to wages and SE income only — investment income is covered by NIIT. Threshold is statutory (not inflation-adjusted). <span class="te-cite">IRC §3101(b)(2); IRC §3102(f)</span></div>`;

  // NIIT table
  let nonQD = teRound((calc.ordinaryDividends || 0) - (calc.qualifiedDividends || 0));
  let niitTriggered = niitBase > 0;
  let niitHtml = `
    <div class="te-ctc-tbl" style="margin-top:8px;">
      ${(calc.interestIncome || 0) > 0     ? row('Interest Income', teFmt(calc.interestIncome)) : row('Interest Income', '$0')}
      ${(calc.ordinaryDividends || 0) > 0
        ? row('+ Dividends (' + teFmt(calc.qualifiedDividends||0) + ' qualified / ' + teFmt(nonQD) + ' ordinary)', teFmt(calc.ordinaryDividends || 0))
        : row('+ Dividends', '$0')}
      ${(calc.scheduleDNet || 0) > 0      ? row('+ Net Capital Gain (Sch. D)', teFmt(calc.scheduleDNet)) : ''}
      ${(calc.scheduleEPassive || 0) > 0  ? row('+ Passive K-1 Income (Sch. E)', teFmt(calc.scheduleEPassive)) : ''}
      ${(calc.investmentInterestAllowed || 0) > 0 ? row('− Investment Interest §163(d)', '(' + teFmt(calc.investmentInterestAllowed) + ')') : ''}
      ${row('= Net Investment Income (NII)', teFmt(nii), 'te-ctc-sub')}
      <div class="te-ctc-row" style="margin-top:6px;"></div>
      ${row('MAGI', teFmt(calc.agi || 0))}
      ${row('− Threshold (' + ({single:'Single',mfj:'MFJ',mfs:'MFS',hoh:'HOH',qss:'QSS'}[fs]||fs) + ')', '(' + teFmt(niitThr) + ')')}
      ${niitExcess > 0 ? row('= MAGI Excess', teFmt(niitExcess), 'te-ctc-sub') : row('= MAGI Excess', '$0 — below threshold', 'te-ctc-ok')}
      ${niitTriggered
        ? row('Lesser of NII / MAGI Excess', teFmt(niitBase), 'te-ctc-sub')
          + row('× Rate', '3.8%', 'te-ctc-sub')
          + row('Net Investment Income Tax', teFmt(calc.niit || 0), 'te-ctc-tot')
        : row('NIIT', '$0 — ' + (nii === 0 ? 'no net investment income' : 'MAGI below threshold'), 'te-ctc-tot')}
    </div>
    <div class="te-ded-note" style="margin-top:4px;">NII excludes SE income and non-passive K-1 income (active trade or business). MAGI = AGI for domestic taxpayers. Threshold is statutory. <span class="te-cite">IRC §1411(c)(1); IRC §1411(b)</span></div>`;

  // SE Tax panel
  let seTriggered = (calc.seTax || 0) > 0;
  let seHtml = `
    <div class="te-ctc-tbl" style="margin-top:8px;">
      ${row('Net SE Income (Sch. C + Farm + CRP)', teFmt(calc.netSEIncome || 0))}
      ${row('× Net Earnings Rate (92.35%) <span class="te-cite">IRC §1402(a)</span>', '', 'te-ctc-sub')}
      ${row('= SE Tax Base', teFmt(calc.seTaxBase || 0), 'te-ctc-sub')}
      <div class="te-ctc-row" style="margin-top:6px;"></div>
      ${(calc.w2Wages || 0) > 0
        ? row('SS Base (wage base − W-2 wages of ' + teFmt(calc.w2Wages) + ') <span class="te-cite">IRC §1402(b)</span>', teFmt(calc.seSSBase || 0))
        : row('SS Base (= SE Tax Base; no W-2 wages) <span class="te-cite">IRC §1402(b)</span>', teFmt(calc.seSSBase || 0))}
      ${row('SS Tax (12.4%)', teFmt(calc.seSSTax || 0), 'te-ctc-sub')}
      ${row('Medicare Tax (2.9%)', teFmt(calc.seMedicareTax || 0), 'te-ctc-sub')}
      ${row('= Total SE Tax (Schedule SE) <span class="te-cite">IRC §1401</span>', teFmt(calc.seTax || 0), 'te-ctc-tot')}
      <div class="te-ctc-row" style="margin-top:6px;"></div>
      ${row('§164(f) Deduction — 50% of SE Tax (reduces AGI)', '(' + teFmt(calc.seTaxDeduction || 0) + ')', 'te-ctc-sub')}
    </div>
    <div class="te-ded-note" style="margin-top:4px;">SE tax is self-employment's equivalent of FICA. Half is deductible above-the-line under §164(f). SS component is limited to the Social Security wage base less any W-2 wages already subject to SS. <span class="te-cite">IRC §1401; IRC §1402(a); IRC §164(f)</span></div>`;

  return `
    <div class="te-adj-row${seTriggered ? ' te-adj-open' : ''}" id="te-adj-row-se">
      <div class="te-adj-row-hdr" onclick="teToggleAdj('se')">
        <span class="te-adj-row-label">Self-Employment Tax (Schedule SE) <span class="te-cite">IRC §1401</span></span>
        <span class="te-adj-row-val ${seTriggered ? '' : 'te-adj-val-zero'}">${teFmt(calc.seTax || 0)}</span>
        <span class="te-adj-chevron">&#8250;</span>
      </div>
      <div class="te-adj-body" id="te-adj-body-se" style="display:${seTriggered ? 'block' : 'none'};">
        ${seHtml}
      </div>
    </div>
    <div class="te-adj-row${amTriggered ? ' te-adj-open' : ''}" id="te-adj-row-am">
      <div class="te-adj-row-hdr" onclick="teToggleAdj('am')">
        <span class="te-adj-row-label">Additional Medicare Tax <span class="te-cite">IRC §3101(b)(2)</span></span>
        <span class="te-adj-row-val ${amTriggered ? '' : 'te-adj-val-zero'}">${teFmt(calc.addlMedicareTax || 0)}</span>
        <span class="te-adj-chevron">&#8250;</span>
      </div>
      <div class="te-adj-body" id="te-adj-body-am" style="display:${amTriggered ? 'block' : 'none'};">
        ${amHtml}
      </div>
    </div>
    <div class="te-adj-row${niitTriggered ? ' te-adj-open' : ''}" id="te-adj-row-niit">
      <div class="te-adj-row-hdr" onclick="teToggleAdj('niit')">
        <span class="te-adj-row-label">Net Investment Income Tax (NIIT) <span class="te-cite">IRC §1411</span></span>
        <span class="te-adj-row-val ${niitTriggered ? '' : 'te-adj-val-zero'}">${teFmt(calc.niit || 0)}</span>
        <span class="te-adj-chevron">&#8250;</span>
      </div>
      <div class="te-adj-body" id="te-adj-body-niit" style="display:${niitTriggered ? 'block' : 'none'};">
        ${niitHtml}
      </div>
    </div>
    ${teRenderAMTAccordion(calc, K, fs)}
    ${teRenderPenaltyAccordion(calc)}`;
}

// AMT accordion — rendered as part of teRenderAddlTaxes
function teRenderAMTAccordion(calc, K, fs) {
  let amtTriggered = (calc.amt || 0) > 0;
  let A = K ? K.amt : null;
  let row = (label, val, cls='') =>
    `<div class="te-ctc-row${cls ? ' ' + cls : ''}"><span>${label}</span><span>${val}</span></div>`;

  let amtHtml;
  if (!A) {
    amtHtml = `<div class="te-ded-note">AMT constants not available for this tax year.</div>`;
  } else {
    let fsLabel = { single:'Single', mfj:'MFJ', mfs:'MFS', hoh:'HOH', qss:'QSS' }[fs] || fs;
    let fsKey   = (fs === 'qss') ? 'mfj' : fs;
    let stdBack  = calc.amtStdAddBack  || 0;
    let saltBack = calc.amtSaltAddBack || 0;
    let isoAmt   = calc.amtISOSpread   || 0;
    let amti     = calc.amti           || 0;
    let effExemp = calc.amtEffExemption || 0;
    let phaseReduction = teRound(Math.max(0, (calc.amtExemption || 0) - effExemp));
    let amtiAfterExemp = teRound(Math.max(0, amti - effExemp));
    let thr      = A.phaseoutThreshold[fsKey] || A.phaseoutThreshold.single;
    let rateBreak = (fs === 'mfs') ? A.rateBreak.mfs : A.rateBreak.standard;

    amtHtml = `
      <div class="te-ctc-tbl" style="margin-top:8px;">
        ${row('Regular Taxable Income', teFmt(calc.taxableIncome || 0))}
        ${stdBack  > 0 ? row('+ Standard Deduction Add-Back <span class="te-cite">IRC §56(b)(1)(E)</span>',   teFmt(stdBack),  'te-ctc-sub') : ''}
        ${saltBack > 0 ? row('+ SALT Add-Back <span class="te-cite">IRC §56(b)(1)(A)(ii)</span>',             teFmt(saltBack), 'te-ctc-sub') : ''}
        ${isoAmt   > 0 ? row('+ ISO Exercise Spread <span class="te-cite">IRC §56(b)(3)</span>',              teFmt(isoAmt),   'te-ctc-sub') : ''}
        ${row('= AMTI (Alternative Minimum Taxable Income)', teFmt(amti), 'te-ctc-sub')}
        <div class="te-ctc-row" style="margin-top:6px;"></div>
        ${row('AMT Exemption (' + fsLabel + ') <span class="te-cite">IRC §55(d)</span>', teFmt(calc.amtExemption || 0))}
        ${phaseReduction > 0
          ? row('Phase-out (AMTI exceeds $' + thr.toLocaleString() + ' × ' + Math.round(A.phaseoutRate * 100) + '%)', '(' + teFmt(phaseReduction) + ')', 'te-ctc-sub')
          : ''}
        ${row('= Effective Exemption', teFmt(effExemp), 'te-ctc-sub')}
        ${row('= AMTI After Exemption', teFmt(amtiAfterExemp), 'te-ctc-sub')}
        <div class="te-ctc-row" style="margin-top:6px;"></div>
        ${row('26% / 28% Rate Break Threshold', teFmt(rateBreak))}
        ${row('Tentative Minimum Tax (TMT)', teFmt(calc.amtTMT || 0), 'te-ctc-sub')}
        <div class="te-ctc-row" style="margin-top:6px;"></div>
        ${row('Regular Tax <span class="te-cite">IRC §1</span>', teFmt(calc.regularTax || 0))}
        ${amtTriggered
          ? row('= Alternative Minimum Tax (TMT − Regular Tax) <span class="te-cite">IRC §55(a)</span>', teFmt(calc.amt || 0), 'te-ctc-tot')
          : row('AMT <span class="te-cite">IRC §55(a)</span>', '$0 — Regular tax ≥ TMT', 'te-ctc-ok')}
      </div>
      ${amtTriggered ? `<div class="te-ded-note" style="margin-top:4px;"><strong>Note:</strong> AMT paid on deferral items (e.g. ISO exercise) may generate a Minimum Tax Credit (MTC) carryforward under IRC §53, offsetting future regular tax liability. Track separately.</div>` : ''}
      <div class="te-ded-note" style="margin-top:4px;">SALT and the standard deduction are disallowed for AMT. Qualified mortgage interest and charitable contributions remain deductible. QDLTCG portion of AMTI is taxed at preferential rates — IRC §55(b)(3). ISO spread entered in the Income section. <span class="te-cite">IRC §55; Form 6251</span></div>`;
  }

  return `
    <div class="te-adj-row${amtTriggered ? ' te-adj-open' : ''}" id="te-adj-row-amt">
      <div class="te-adj-row-hdr" onclick="teToggleAdj('amt')">
        <span class="te-adj-row-label">Alternative Minimum Tax (AMT) <span class="te-cite">IRC §55</span></span>
        <span class="te-adj-row-val ${amtTriggered ? '' : 'te-adj-val-zero'}">${teFmt(calc.amt || 0)}</span>
        <span class="te-adj-chevron">&#8250;</span>
      </div>
      <div class="te-adj-body" id="te-adj-body-amt" style="display:${amtTriggered ? 'block' : 'none'};">
        ${amtHtml}
      </div>
    </div>`;
}

// Early withdrawal penalty accordion — IRC §72(t); rendered as part of teRenderAddlTaxes
function teRenderPenaltyAccordion(calc) {
  let penTriggered  = (calc.earlyWithdrawalPenalty || 0) > 0;
  let hasAnyDist    = (calc.iraGross || 0) > 0 || (calc.pensionGross || 0) > 0;
  if (!penTriggered && !hasAnyDist) return '';

  let row = (label, val, cls='') =>
    `<div class="te-ctc-row${cls ? ' ' + cls : ''}"><span>${label}</span><span>${val}</span></div>`;

  let iraEntries = teCurrentReturn.ira1099r     || [];
  let penEntries = teCurrentReturn.pension1099r || [];
  let penaltySubjects = [...iraEntries, ...penEntries]
    .filter(e => (parseFloat(e.age) || 0) < 59.5 && !e.penaltyException);

  let penHtml = `
    <div class="te-ctc-tbl" style="margin-top:8px;">
      ${(calc.iraGross    || 0) > 0 ? row('Total IRA Gross Distributions <span class="te-cite">1040 Line 4a</span>',      teFmt(calc.iraGross))      : ''}
      ${(calc.iraTaxable  || 0) > 0 ? row('IRA Taxable Amount <span class="te-cite">1040 Line 4b</span>',                 teFmt(calc.iraTaxable),  'te-ctc-sub') : ''}
      ${(calc.pensionGross || 0) > 0 ? row('Total Pension Gross Distributions <span class="te-cite">1040 Line 5a</span>', teFmt(calc.pensionGross))  : ''}
      ${(calc.pensionTaxable || 0) > 0 ? row('Pension Taxable Amount <span class="te-cite">1040 Line 5b</span>',          teFmt(calc.pensionTaxable), 'te-ctc-sub') : ''}
      <div class="te-ctc-row" style="margin-top:6px;"></div>
      ${penaltySubjects.length > 0
        ? penaltySubjects.map(e =>
            row((esc(e.payerName) || 'Distribution') + ' — taxable amount, Age ' + (e.age || '?'),
                teFmt(parseFloat(e.taxableDist) || 0), 'te-ctc-sub')
          ).join('')
          + row('× Rate <span class="te-cite">IRC §72(t)(1)</span>', '10%', 'te-ctc-sub')
          + row('= Early Withdrawal Penalty <span class="te-cite">IRC §72(t)</span>', teFmt(calc.earlyWithdrawalPenalty || 0), 'te-ctc-tot')
        : row('Early Withdrawal Penalty', '$0 — no distributions before age 59½, or §72(t)(2) exception applies', 'te-ctc-ok')}
    </div>
    <div class="te-ded-note" style="margin-top:4px;">
      10% penalty applies when age at distribution is under 59½ and no IRC §72(t)(2) exception applies.
      Exceptions: disability §72(t)(2)(A)(ii), SEPP/72(t) plan §72(t)(2)(A)(iv), death, medical expenses &gt;7.5% AGI,
      health insurance premiums while unemployed, higher education expenses, first-home purchase (IRA only, $10K lifetime §72(t)(2)(F)).
      Mark the &quot;Exc.&quot; checkbox in the Income section for each qualifying distribution.
      <span class="te-cite">IRC §72(t); Schedule 2 Line 8</span>
    </div>`;

  return `
    <div class="te-adj-row${penTriggered ? ' te-adj-open' : ''}" id="te-adj-row-penalty">
      <div class="te-adj-row-hdr" onclick="teToggleAdj('penalty')">
        <span class="te-adj-row-label">Early Withdrawal Penalty <span class="te-cite">IRC §72(t)</span></span>
        <span class="te-adj-row-val ${penTriggered ? '' : 'te-adj-val-zero'}">${teFmt(calc.earlyWithdrawalPenalty || 0)}</span>
        <span class="te-adj-chevron">&#8250;</span>
      </div>
      <div class="te-adj-body" id="te-adj-body-penalty" style="display:${penTriggered ? 'block' : 'none'};">
        ${penHtml}
      </div>
    </div>`;
}

function teRenderPayments() {
  let w2s   = teCurrentReturn.w2 || [];
  let total = w2s.reduce((s, w) => s + (parseFloat(w.federalWithheld)||0), 0);
  let rows  = w2s.length > 0
    ? w2s.map(w => `<div class="te-pay-row te-pay-sub"><span>${esc(w.employer||'Unnamed Employer')}</span><span>${teFmt(parseFloat(w.federalWithheld)||0)}</span></div>`).join('')
    : '<div class="te-empty">No W-2 withholding. Add W-2s in the Income section.</div>';

  return `
    <div class="te-sec-hdr"><h2>Tax Payments</h2>
    <p class="te-sec-sub">Federal income tax withheld and prepayments &mdash; <span class="te-cite">IRC §3402, §6654</span></p></div>

    <div class="te-subsec">
      <div class="te-subsec-lbl">Federal W-2 Withholding <span class="te-cite">IRC §3402</span></div>
      <div class="te-subsec-desc">Federal income tax withheld from wages (W-2 Box 2). Auto-populated from Income section.</div>
      <div class="te-pay-tbl">
        ${rows}
        <div class="te-pay-row te-pay-tot"><span>Total Federal Withholding</span><span>${teFmt(total)}</span></div>
      </div>
    </div>

    <div class="te-subsec" style="margin-top:20px;">
      <div class="te-subsec-lbl">Estimated Tax Payments (Form 1040-ES) <span class="te-cite">IRC §6654</span></div>
      <div class="te-subsec-desc">Quarterly estimated payments. Self-employed individuals must pay quarterly to avoid underpayment penalties.</div>
      ${teRenderEstimatedPayments()}
    </div>

    <div class="te-subsec" style="margin-top:20px;">
      <div class="te-subsec-lbl">Additional Taxes <span class="te-cite">IRC §55, §72(t), §1401, §3101(b)(2), §1411</span></div>
      <div class="te-subsec-desc">Surtaxes computed automatically from income entries. Expand each to verify the calculation.</div>
      <div id="te-addl-taxes-panel">${teRenderAddlTaxes()}</div>
    </div>

    <div class="te-stub-sec" style="margin-top:16px;">
      <div class="te-stub-blk te-stub-blk-lg">
        <div>
          <span class="te-stub-title">Other Payments &amp; Credits <span class="te-cite">IRC §36B, §6402</span></span>
          <div class="te-stub-desc">Prior year overpayment applied, excess Social Security withheld, net premium tax credit</div>
        </div>
        <span class="te-stub-pill">Track 5</span>
      </div>
    </div>`;
}


// ── Social Security Taxable Amount — IRC §86 ─────────────────────────────
// Thresholds: IRC §86(c) — STATUTORY, hardcoded since 1993, never inflation-adjusted.
// Same values for every tax year; do NOT put in TAX_CONSTANTS.


// ──────────────────────────────────────────────────────────────────────
//  CALCULATION ENGINE
//  IRC §1 flow: Gross Income → AGI → Taxable Income → Tax → Credits → Payments → Refund/Due
// ──────────────────────────────────────────────────────────────────────


// IRC §1 — Progressive bracket tax calculation

// IRC §1(h) — Tax on qualified dividends and LTCG at preferential rates (0% / 15% / 20%)
// Mirrors the IRS Qualified Dividends and Capital Gain Tax Worksheet (Form 1040 instructions).
// qdltcg:         total preferentially taxed income (QDs + net cap gain)
// taxableIncome:  total taxable income (ordinary + qdltcg)
// ordinaryPortion: taxableIncome - qdltcg (the ordinary income piece)

// IRC §24 — Child Tax Credit and ACTC

// IRC §24(c)(1) — Age test: under 17 as of December 31 of tax year

// IRC §63(f): age 65+ test evaluated as of December 31 of the tax year.
// A taxpayer who turns 65 on January 1 of the following year is NOT 65 as of Dec 31.
// Source: IRC §7805; IRS Pub. 501 — "you are considered age 65 on the day before your 65th birthday"
// IRS rule: a person whose birthday is Jan 1 of year N+1 is treated as 65 on Dec 31 of year N.

// IRC §25A(b) — American Opportunity Tax Credit

// IRC §25A(c) — Lifetime Learning Credit (NOT refundable)

// IRC §25A — Education credits (CTC applied first; then AOC NR, then LLC vs remaining tax)


// ──────────────────────────────────────────────────────────────────────
//  TRACK 5 — EARNED INCOME CREDIT
// ──────────────────────────────────────────────────────────────────────

// IRC §32(c)(3) — EIC Qualifying Child Age Test
// Distinct from CTC §24(c)(1) (under 17). Must also satisfy the general qualifying child
// relationship, residency, and joint-return tests of IRC §152(c), which the engine tracks
// via d.isQualifyingChild (user-attested in Personal section).
// Three age alternatives — ALL THREE must be checked:
//   (I)  Under age 19 as of December 31 of tax year — IRC §32(c)(3)(A)(ii)(I)
//   (II) Under age 24 AND full-time student for at least 5 months — IRC §32(c)(3)(A)(ii)(II)
//   (III) Permanently and totally disabled — any age — IRC §32(c)(3)(A)(ii)(III)

// Returns count of EIC qualifying children, capped at 3 (3+ uses same rates as 3)

// IRC §32 — Earned Income Credit Calculation
// r:    current return object
// calc: computed values from teRecalculate (w2Wages, netSEIncome, agi, investment income fields)
// fs:   filing status
// K:    TAX_CONSTANTS for the return's tax year

// ──────────────────────────────────────────────────────────────────────
//  TRACK 5B — CHILD & DEPENDENT CARE CREDIT
// ──────────────────────────────────────────────────────────────────────

// IRC §21 — Child & Dependent Care Credit
// r:    current return object
// calc: computed values from teRecalculate (w2Wages, netSEIncome, agi)
// K:    TAX_CONSTANTS for the return's tax year
// fs:   filing status


// ──────────────────────────────────────────────────────────────────────
//  TRACK 5C — RETIREMENT SAVINGS CONTRIBUTIONS CREDIT (SAVER'S CREDIT)
// ──────────────────────────────────────────────────────────────────────

// IRC §25B — Saver's Credit
// r:    current return object
// calc: computed values from teRecalculate (agi)
// K:    TAX_CONSTANTS for the return's tax year
// fs:   filing status


// ──────────────────────────────────────────────────────────────────────
//  TRACK 5D — ENERGY-EFFICIENT HOME IMPROVEMENT CREDIT
// ──────────────────────────────────────────────────────────────────────

// IRC §25C — Energy-Efficient Home Improvement Credit
// Terminated for property placed in service after 12/31/2025 — OBBBA §70505.
// Code structure preserved for potential future re-enactment.
// r: current return object
// K: TAX_CONSTANTS for the return's tax year


// ISO exercise spread field handler
function teOnISOField(value) {
  if (!teCurrentReturn) return;
  teMarkDirty();
  teCurrentReturn.isoExercise = value;
  teRecalculate();
}


// ──────────────────────────────────────────────────────────────────────
//  TRACK 6 — ALTERNATIVE MINIMUM TAX (AMT)
// ──────────────────────────────────────────────────────────────────────

// IRC §55 — Alternative Minimum Tax
// Parallel tax computation: taxpayer pays the HIGHER of regular tax or Tentative Minimum Tax (TMT).
// AMT owed = max(0, TMT − regular tax) — IRC §55(a)
//
// r:    current return object
// calc: computed values — requires regularTax, taxableIncome, saltDeduction,
//       stdDed, deductionType, qdltcg to already be set
// K:    TAX_CONSTANTS for the return's tax year
// fs:   filing status

// Helper: apply 26%/28% two-rate structure to the ordinary portion of AMTI
// IRC §55(b)(1)(A): 26% on AMTI ≤ rateBreak; 28% on the excess above rateBreak


// EIC section UI renderer — called when credits tab is active
function teRenderEICSection() {
  let c = document.getElementById('te-eic-section');
  if (!c || !teCurrentReturn) return;
  let r     = teCurrentReturn;
  let K     = TAX_CONSTANTS[r.taxYear || teActiveYear];
  if (!K || !K.eic) return;
  let fs    = r.filingStatus || 'single';
  let calc  = r._calc || {};
  let numQC = teCountEICQC(r);
  let eicData = r.eic || {};

  // Investment income check
  let invIncome = teRound(
    (calc.interestIncome || 0) + (calc.ordinaryDividends || 0)
    + Math.max(0, calc.scheduleDNet || 0) + Math.max(0, calc.scheduleEPassive || 0)
  );
  let invDisqualified = invIncome > K.eic.investmentIncomeLimit;

  let earnedIncome = teRound((calc.w2Wages || 0) + (calc.netSEIncome || 0));
  let credit       = calc.eicCredit || 0;

  // Build audit-trail breakdown
  let breakdownHTML = '';
  if (!invDisqualified && (numQC > 0 || eicData.claimChildless) && earnedIncome > 0) {
    let qcKey     = Math.min(numQC, 3);
    let max       = K.eic.maxCredit[qcKey];
    let piRate    = K.eic.phaseInRate[qcKey];
    let poRate    = K.eic.phaseOutRate[qcKey];
    let tentative = Math.min(earnedIncome * piRate, max);
    let threshold = K.eic.phaseOutThreshold[qcKey] + (fs === 'mfj' ? K.eic.jointBonus : 0);
    let phaseBase = Math.max(calc.agi || 0, earnedIncome);
    let excess    = Math.max(0, phaseBase - threshold);
    let reduction = excess * poRate;

    breakdownHTML = `
      <div class="te-ctc-tbl" style="margin-top:10px;">
        <div class="te-ctc-row"><span>EIC Qualifying Children <span class="te-cite">IRC §32(c)(3)</span></span><span>${numQC}${numQC === 3 ? '+' : ''}</span></div>
        <div class="te-ctc-row"><span>Earned Income</span><span>${teFmt(earnedIncome)}</span></div>
        <div class="te-ctc-row te-ctc-sub"><span>Tentative Credit <small>(${(piRate*100).toFixed(2)}% × earned income, cap ${teFmt(max)})</small></span><span>${teFmt(tentative)}</span></div>
        <div class="te-ctc-row"><span>Phase-out Base <small>(greater of AGI ${teFmt(calc.agi||0)} or earned income)</small></span><span>${teFmt(phaseBase)}</span></div>
        ${excess > 0
          ? `<div class="te-ctc-row te-ctc-red"><span>Phase-out <span class="te-cite">IRC §32(b)</span><br><small>Excess over ${teFmt(threshold)}: ${teFmt(excess)} × ${(poRate*100).toFixed(2)}%</small></span><span>(${teFmt(reduction)})</span></div>`
          : `<div class="te-ctc-row te-ctc-ok"><span>No phase-out — income below ${teFmt(threshold)}</span><span>—</span></div>`}
        <div class="te-ctc-row te-ctc-tot"><span>EIC (Fully Refundable) <span class="te-cite">IRC §32(a)</span></span><span>${teFmt(credit)}</span></div>
      </div>`;
  }

  c.innerHTML = `
    ${numQC > 0
      ? `<div class="te-info-sm" style="margin-bottom:8px;">
           <strong>${numQC}${numQC===3?'+':''} EIC qualifying child${numQC===1?'':'ren'}</strong> identified from the Personal section.
           Age test: under 19, or under 24 + full-time student, or permanently disabled. <span class="te-cite">IRC §32(c)(3)</span>
         </div>`
      : `<div class="te-info-sm" style="margin-bottom:8px;">
           No EIC qualifying children found. Add dependents in the Personal section and check Full-Time Student or Disabled where applicable.
         </div>
         <div class="te-field-group" style="margin-bottom:8px;">
           <label class="te-lbl" style="display:flex;align-items:center;gap:8px;cursor:pointer;">
             <input type="checkbox" ${eicData.claimChildless?'checked':''} onchange="teOnEICClaimChildless(this.checked)">
             Claim as childless eligible worker <span class="te-cite">IRC §32(c)(1)(A)</span>
           </label>
           <div class="te-ded-note" style="margin-top:4px;">Age eligibility (25–64 under traditional rules) applies. TODO:VERIFY OBBBA P.L. 119-21 age changes.</div>
         </div>`}
    ${invDisqualified
      ? `<div class="te-info-box te-info-warn" style="margin-top:6px;">Investment income (${teFmt(invIncome)}) exceeds the ${teFmt(K.eic.investmentIncomeLimit)} limit — EIC disqualified. <span class="te-cite">IRC §32(i)(1)</span></div>`
      : ''}
    ${breakdownHTML}`;
}

// Handler for the childless EIC checkbox
function teOnEICClaimChildless(checked) {
  if (!teCurrentReturn) return;
  teMarkDirty();
  if (!teCurrentReturn.eic) teCurrentReturn.eic = {};
  teCurrentReturn.eic.claimChildless = checked;
  teRecalculate();
}


// ──────────────────────────────────────────────────────────────────────
//  TRACK 5B — CDCC UI RENDERER & HANDLER
// ──────────────────────────────────────────────────────────────────────

function teOnCDCCField(field, value) {
  if (!teCurrentReturn) return;
  teMarkDirty();
  if (!teCurrentReturn.cdcc) teCurrentReturn.cdcc = {};
  teCurrentReturn.cdcc[field] = value;
  teRecalculate();
}

function teRenderCDCCSection() {
  let c = document.getElementById('te-cdcc-section');
  if (!c || !teCurrentReturn) return;
  let r    = teCurrentReturn;
  let K    = TAX_CONSTANTS[r.taxYear || teActiveYear];
  if (!K || !K.cdcc) return;
  let fs   = r.filingStatus || 'single';
  let calc = r._calc || {};
  let d    = r.cdcc || {};

  let persons = d.qualifyingPersons || '';
  let is2plus = (persons === '2plus');
  let expCap  = is2plus ? K.cdcc.expenseCap2 : K.cdcc.expenseCap1;

  // Credit breakdown (shown when qualifying persons selected and data present)
  let breakdownHTML = '';
  if (persons && (calc.cdccQualExp > 0 || calc.cdccCredit >= 0)) {
    let careVal = parseFloat(d.careExpenses) || 0;
    let fsaVal  = parseFloat(d.fsaBenefits) || 0;
    if (careVal > 0 || fsaVal > 0) {
      breakdownHTML = `
        <div class="te-ctc-tbl" style="margin-top:12px;">
          <div class="te-ctc-row"><span>Qualifying Care Expenses Paid</span><span>${teFmt(careVal)}</span></div>
          ${fsaVal > 0 ? `<div class="te-ctc-row te-ctc-red"><span>Employer FSA Reduction <span class="te-cite">§129 / Form 2441</span></span><span>(${teFmt(fsaVal)})</span></div>` : ''}
          <div class="te-ctc-row te-ctc-sub"><span>Net Qualifying Expenses (cap: ${teFmt(expCap)})</span><span>${teFmt(calc.cdccQualExp || 0)}</span></div>
          ${calc.cdccRate > 0 ? `<div class="te-ctc-row te-ctc-sub"><span>Applicable Rate <span class="te-cite">IRC §21(a)(2)</span></span><span>${Math.round((calc.cdccRate || 0) * 100)}%</span></div>` : ''}
          <div class="te-ctc-row te-ctc-tot"><span>§21 Credit (Non-Refundable)</span><span>${teFmt(calc.cdccCredit || 0)}</span></div>
        </div>`;
    }
  }

  c.innerHTML = `
    <div class="te-frow" style="gap:14px;flex-wrap:wrap;">
      <div class="te-field-group">
        <label class="te-lbl">Qualifying Persons <span class="te-cite">IRC §21(b)</span></label>
        <select class="te-select" onchange="teOnCDCCField('qualifyingPersons',this.value)">
          <option value="" ${!persons?'selected':''}>— Select —</option>
          <option value="1" ${persons==='1'?'selected':''}>1 Qualifying Person</option>
          <option value="2plus" ${persons==='2plus'?'selected':''}>2 or More Qualifying Persons</option>
        </select>
        <div class="te-ded-note">Child under 13, or spouse/dependent incapable of self-care. <span class="te-cite">IRC §21(b)</span></div>
      </div>
      <div class="te-field-group">
        <label class="te-lbl">Qualifying Care Expenses Paid</label>
        <input type="text" inputmode="numeric" class="te-input te-mono" value="${d.careExpenses||''}" placeholder="0.00"
          oninput="teOnCDCCField('careExpenses',this.value)">
        ${persons ? `<div class="te-ded-note">Cap: ${teFmt(expCap)}. <span class="te-cite">IRC §21(c)</span></div>` : ''}
      </div>
      <div class="te-field-group">
        <label class="te-lbl">Employer Dependent Care FSA <span class="te-cite">§129</span></label>
        <input type="text" inputmode="numeric" class="te-input te-mono" value="${d.fsaBenefits||''}" placeholder="0.00"
          oninput="teOnCDCCField('fsaBenefits',this.value)">
        <div class="te-ded-note">Benefits received from employer FSA reduce qualifying expenses dollar-for-dollar. Form 2441.</div>
      </div>
    </div>
    ${fs === 'mfj' ? `
    <div class="te-frow" style="gap:14px;flex-wrap:wrap;margin-top:10px;align-items:flex-start;">
      <div class="te-field-group">
        <label class="te-lbl">Spouse Earned Income <span class="te-cite">IRC §21(d)</span></label>
        <input type="text" inputmode="numeric" class="te-input te-mono" value="${d.spouseEarnedIncome||''}" placeholder="0.00"
          ${d.spouseIsStudentOrDisabled ? 'disabled style="opacity:0.5;"' : ''}
          oninput="teOnCDCCField('spouseEarnedIncome',this.value)">
        <div class="te-ded-note">Qualifying expenses capped at lesser of both spouses' earned income.</div>
      </div>
      <div class="te-field-group" style="flex:1;min-width:220px;">
        <label class="te-lbl" style="display:flex;align-items:center;gap:8px;cursor:pointer;margin-top:4px;">
          <input type="checkbox" ${d.spouseIsStudentOrDisabled?'checked':''} onchange="teOnCDCCField('spouseIsStudentOrDisabled',this.checked)">
          Spouse is full-time student or disabled <span class="te-cite">IRC §21(d)(2)</span>
        </label>
        <div class="te-ded-note">Deemed income applies: ${teFmt(is2plus ? K.cdcc.deemedIncome2 : K.cdcc.deemedIncome1)}/month.</div>
      </div>
      ${d.spouseIsStudentOrDisabled ? `
      <div class="te-field-group te-narrow">
        <label class="te-lbl">Months Condition Applies</label>
        <input type="text" inputmode="numeric" class="te-input te-mono" value="${d.studentDisabledMonths||''}" placeholder="12"
          oninput="teOnCDCCField('studentDisabledMonths',this.value)">
      </div>` : ''}
    </div>` : ''}
    ${breakdownHTML}
    ${!persons ? '<div class="te-info-sm" style="margin-top:8px;">Select the number of qualifying persons to calculate the credit.</div>' : ''}`;
}


// ──────────────────────────────────────────────────────────────────────
//  TRACK 5C — SAVER'S CREDIT UI RENDERER & HANDLER
// ──────────────────────────────────────────────────────────────────────

function teOnSaversField(field, value) {
  if (!teCurrentReturn) return;
  teMarkDirty();
  if (!teCurrentReturn.savers) teCurrentReturn.savers = {};
  teCurrentReturn.savers[field] = value;
  teRecalculate();
}

function teRenderSaversSection() {
  let c = document.getElementById('te-savers-section');
  if (!c || !teCurrentReturn) return;
  let r    = teCurrentReturn;
  let K    = TAX_CONSTANTS[r.taxYear || teActiveYear];
  if (!K || !K.savers) return;
  let fs   = r.filingStatus || 'single';
  let calc = r._calc || {};
  let d    = r.savers || {};

  // AGI rate display
  let agi        = calc.agi || 0;
  let bracketKey = (fs === 'mfj') ? 'mfj' : (fs === 'hoh') ? 'hoh' : 'other';
  let currentRate = 0;
  for (let [maxAGI, rate] of K.savers.agiBrackets[bracketKey]) {
    if (agi <= maxAGI) { currentRate = rate; break; }
  }

  let disqualified = (d.taxpayerIsStudent) || (parseInt(d.taxpayerAge) > 0 && parseInt(d.taxpayerAge) < 18);

  // Breakdown
  let tpContrib = Math.max(0, parseFloat(d.taxpayerContributions) || 0);
  let tpDistCur = Math.max(0, parseFloat(d.taxpayerDistCurrent) || 0);
  let tpDistPri = Math.max(0, parseFloat(d.taxpayerDistPrior) || 0);
  let tpNet     = Math.max(0, Math.min(K.savers.maxContribPerPerson, tpContrib - tpDistCur - tpDistPri));
  let spContrib = Math.max(0, parseFloat(d.spouseContributions) || 0);
  let totalCredit = calc.saversCredit || 0;
  let tpCredit    = calc.saversTaxpayer || 0;
  let spCredit    = calc.saversSpouse || 0;

  let breakdownHTML = '';
  if (!disqualified && currentRate > 0 && (tpContrib > 0 || (fs === 'mfj' && spContrib > 0))) {
    breakdownHTML = `
      <div class="te-ctc-tbl" style="margin-top:12px;">
        <div class="te-ctc-row te-ctc-sub"><span>AGI <span class="te-cite">IRC §25B(b)</span></span><span>${teFmt(agi)} → ${Math.round(currentRate*100)}% rate</span></div>
        <div class="te-ctc-row"><span>Taxpayer Contributions</span><span>${teFmt(tpContrib)}</span></div>
        ${(tpDistCur + tpDistPri) > 0 ? `<div class="te-ctc-row te-ctc-red"><span>Distributions (current yr + prior 2 yrs) <span class="te-cite">IRC §25B(d)</span></span><span>(${teFmt(tpDistCur + tpDistPri)})</span></div>` : ''}
        <div class="te-ctc-row te-ctc-sub"><span>Net Taxpayer Contribution (cap: ${teFmt(K.savers.maxContribPerPerson)})</span><span>${teFmt(tpNet)}</span></div>
        <div class="te-ctc-row"><span>Taxpayer Credit</span><span>${teFmt(tpCredit)}</span></div>
        ${fs === 'mfj' && spContrib > 0 ? `<div class="te-ctc-row"><span>Spouse Credit</span><span>${teFmt(spCredit)}</span></div>` : ''}
        <div class="te-ctc-row te-ctc-tot"><span>§25B Credit (Non-Refundable)</span><span>${teFmt(totalCredit)}</span></div>
      </div>`;
  }

  c.innerHTML = `
    ${disqualified ? `<div class="te-info-box te-info-warn" style="margin-bottom:8px;">${d.taxpayerIsStudent ? 'Taxpayer is a full-time student' : 'Taxpayer is under age 18'} — Saver\'s Credit disqualified. <span class="te-cite">IRC §25B(c)</span></div>` : ''}
    ${!disqualified && currentRate === 0 && agi > 0 ? `<div class="te-info-box te-info-warn" style="margin-bottom:8px;">AGI (${teFmt(agi)}) exceeds the ${bracketKey === 'mfj' ? 'MFJ' : bracketKey === 'hoh' ? 'HOH' : 'Single'} income limit — credit rate is 0%. <span class="te-cite">IRC §25B(b)</span></div>` : ''}
    <div class="te-frow" style="gap:14px;flex-wrap:wrap;">
      <div class="te-field-group">
        <label class="te-lbl">Taxpayer Retirement Contributions <span class="te-cite">IRC §25B(d)(1)</span></label>
        <input type="text" inputmode="numeric" class="te-input te-mono" value="${d.taxpayerContributions||''}" placeholder="0.00"
          oninput="teOnSaversField('taxpayerContributions',this.value)">
        <div class="te-ded-note">IRA + 401(k)/403(b)/457(b)/SIMPLE combined. Cap: ${teFmt(K.savers.maxContribPerPerson)}/person.</div>
      </div>
      <div class="te-field-group">
        <label class="te-lbl">Current Year Distributions <span class="te-cite">IRC §25B(d)</span></label>
        <input type="text" inputmode="numeric" class="te-input te-mono" value="${d.taxpayerDistCurrent||''}" placeholder="0.00"
          oninput="teOnSaversField('taxpayerDistCurrent',this.value)">
      </div>
      <div class="te-field-group">
        <label class="te-lbl">Prior 2 Years Distributions <span class="te-cite">IRC §25B(d)</span></label>
        <input type="text" inputmode="numeric" class="te-input te-mono" value="${d.taxpayerDistPrior||''}" placeholder="0.00"
          oninput="teOnSaversField('taxpayerDistPrior',this.value)">
        <div class="te-ded-note">Future: auto-populated from client return history.</div>
      </div>
    </div>
    <div class="te-frow" style="gap:14px;flex-wrap:wrap;margin-top:8px;align-items:flex-end;">
      <div class="te-field-group te-narrow">
        <label class="te-lbl">Taxpayer Age</label>
        <input type="text" inputmode="numeric" class="te-input te-mono" value="${d.taxpayerAge||''}" placeholder="e.g. 35"
          oninput="teOnSaversField('taxpayerAge',this.value)">
        <div class="te-ded-note">Under 18 → disqualified. <span class="te-cite">IRC §25B(c)(1)</span></div>
      </div>
      <div class="te-field-group" style="flex:1;">
        <label class="te-lbl" style="display:flex;align-items:center;gap:8px;cursor:pointer;">
          <input type="checkbox" ${d.taxpayerIsStudent?'checked':''} onchange="teOnSaversField('taxpayerIsStudent',this.checked)">
          Taxpayer is a full-time student <span class="te-cite">IRC §25B(c)(2)</span>
        </label>
      </div>
    </div>
    ${fs === 'mfj' ? `
    <div class="te-subsec-lbl" style="margin-top:14px;font-size:12px;color:var(--te-muted);">Spouse — Independent $${K.savers.maxContribPerPerson.toLocaleString()} Cap</div>
    <div class="te-frow" style="gap:14px;flex-wrap:wrap;">
      <div class="te-field-group">
        <label class="te-lbl">Spouse Retirement Contributions</label>
        <input type="text" inputmode="numeric" class="te-input te-mono" value="${d.spouseContributions||''}" placeholder="0.00"
          oninput="teOnSaversField('spouseContributions',this.value)">
      </div>
      <div class="te-field-group">
        <label class="te-lbl">Spouse Current Year Distributions</label>
        <input type="text" inputmode="numeric" class="te-input te-mono" value="${d.spouseDistCurrent||''}" placeholder="0.00"
          oninput="teOnSaversField('spouseDistCurrent',this.value)">
      </div>
      <div class="te-field-group">
        <label class="te-lbl">Spouse Prior 2 Years Distributions</label>
        <input type="text" inputmode="numeric" class="te-input te-mono" value="${d.spouseDistPrior||''}" placeholder="0.00"
          oninput="teOnSaversField('spouseDistPrior',this.value)">
      </div>
    </div>` : ''}
    ${breakdownHTML}
    <div class="te-info-sm" style="margin-top:10px;">OBBBA P.L. 119-21 §70116: Starting TY2027, only ABLE account contributions qualify for this credit. Clients relying on IRA/401(k) contributions for this credit will lose eligibility after 2026.</div>`;
}


// ──────────────────────────────────────────────────────────────────────
//  TRACK 5D — ENERGY CREDIT UI RENDERER & HANDLER
// ──────────────────────────────────────────────────────────────────────

function teOnEnergyField(field, value) {
  if (!teCurrentReturn) return;
  teMarkDirty();
  if (!teCurrentReturn.energyImprovement) teCurrentReturn.energyImprovement = {};
  teCurrentReturn.energyImprovement[field] = value;
  teRecalculate();
}

function teRenderEnergySection() {
  let c = document.getElementById('te-energy-section');
  if (!c || !teCurrentReturn) return;
  let r   = teCurrentReturn;
  let yr  = r.taxYear || teActiveYear;
  let K   = TAX_CONSTANTS[yr];
  if (!K) return;

  // 2026+: credit terminated — OBBBA §70505
  if (!K.energyImprovement) {
    c.innerHTML = `<div class="te-info-box te-info-warn">§25C was terminated by OBBBA P.L. 119-21 §70505 for property placed in service after December 31, 2025. No credit is available for ${yr} returns. Code structure is preserved for potential future re-enactment.</div>`;
    return;
  }

  let cfg  = K.energyImprovement;
  let calc = r._calc || {};
  let e    = r.energyImprovement || {};

  // Live running totals for UI display
  let winAmt     = Math.min(parseFloat(e.windows)||0, cfg.poolA.subCaps.windows);
  let doorExp    = parseFloat(e.doors)||0;
  let doorCnt    = Math.max(1, parseInt(e.doorCount)||1);
  let doorAmt    = Math.min(doorExp, Math.min(doorCnt * cfg.poolA.subCaps.doorPerUnit, cfg.poolA.subCaps.doors));
  let epAmt      = Math.min(parseFloat(e.energyProperty)||0, cfg.poolA.subCaps.energyProperty);
  let audAmt     = Math.min(parseFloat(e.audit)||0, cfg.poolA.subCaps.audit);
  let poolAUsed  = Math.min(winAmt + doorAmt + epAmt + audAmt, cfg.poolA.cap);
  let poolALeft  = Math.max(0, cfg.poolA.cap - poolAUsed);
  let hpAmt      = parseFloat(e.heatPumps)||0;
  let hpwhAmt    = parseFloat(e.heatPumpWH)||0;
  let bioAmt     = parseFloat(e.biomass)||0;
  let poolBUsed  = Math.min(hpAmt + hpwhAmt + bioAmt, cfg.poolB.cap);
  let poolBLeft  = Math.max(0, cfg.poolB.cap - poolBUsed);
  let totalCredit = calc.energyCredit || 0;

  c.innerHTML = `
    <div class="te-ded-note" style="margin-bottom:10px;">For property placed in service in ${yr} at an existing primary U.S. residence. New construction not eligible. Non-refundable; no carryforward. <span class="te-cite">IRC §25C</span></div>

    <div class="te-subsec-lbl" style="font-size:12px;margin-bottom:8px;">
      Pool A — General Improvements <span class="te-cite">§25C(b)(1)</span>
      &nbsp;|&nbsp; Annual Cap: ${teFmt(cfg.poolA.cap)}
      &nbsp;|&nbsp; <span style="color:${poolALeft===0?'var(--te-warn)':'var(--te-muted)'};">Remaining: ${teFmt(poolALeft)}</span>
    </div>
    <div class="te-frow" style="gap:12px;flex-wrap:wrap;">
      <div class="te-field-group">
        <label class="te-lbl">Windows &amp; Skylights <small>(sub-cap ${teFmt(cfg.poolA.subCaps.windows)})</small></label>
        <input type="text" inputmode="numeric" class="te-input te-mono" value="${e.windows||''}" placeholder="0.00"
          oninput="teOnEnergyField('windows',this.value)">
        ${winAmt >= cfg.poolA.subCaps.windows && (parseFloat(e.windows)||0) > 0 ? `<div class="te-ded-note te-warn-note">${teFmt(cfg.poolA.subCaps.windows)} sub-cap reached.</div>` : ''}
      </div>
      <div class="te-field-group">
        <label class="te-lbl">Exterior Doors <small>($250/door, max ${teFmt(cfg.poolA.subCaps.doors)})</small></label>
        <input type="text" inputmode="numeric" class="te-input te-mono" value="${e.doors||''}" placeholder="0.00"
          oninput="teOnEnergyField('doors',this.value)">
      </div>
      <div class="te-field-group te-narrow">
        <label class="te-lbl"># of Doors</label>
        <input type="text" inputmode="numeric" class="te-input te-mono" value="${e.doorCount||''}" placeholder="1"
          oninput="teOnEnergyField('doorCount',this.value)">
      </div>
      <div class="te-field-group">
        <label class="te-lbl">Energy Property <small>(sub-cap ${teFmt(cfg.poolA.subCaps.energyProperty)})</small></label>
        <input type="text" inputmode="numeric" class="te-input te-mono" value="${e.energyProperty||''}" placeholder="0.00"
          oninput="teOnEnergyField('energyProperty',this.value)">
        <div class="te-ded-note">Central A/C, gas/oil water heater, furnace, boiler (non-heat-pump). <span class="te-cite">§25C(d)(2)</span></div>
        ${epAmt >= cfg.poolA.subCaps.energyProperty && (parseFloat(e.energyProperty)||0) > 0 ? `<div class="te-ded-note te-warn-note">${teFmt(cfg.poolA.subCaps.energyProperty)} sub-cap reached.</div>` : ''}
      </div>
      <div class="te-field-group">
        <label class="te-lbl">Home Energy Audit <small>(sub-cap ${teFmt(cfg.poolA.subCaps.audit)})</small></label>
        <input type="text" inputmode="numeric" class="te-input te-mono" value="${e.audit||''}" placeholder="0.00"
          oninput="teOnEnergyField('audit',this.value)">
        ${audAmt >= cfg.poolA.subCaps.audit && (parseFloat(e.audit)||0) > 0 ? `<div class="te-ded-note te-warn-note">${teFmt(cfg.poolA.subCaps.audit)} sub-cap reached.</div>` : ''}
      </div>
    </div>

    <div class="te-subsec-lbl" style="font-size:12px;margin-top:16px;margin-bottom:8px;">
      Pool B — Heat Pumps &amp; Biomass <span class="te-cite">§25C(b)(2)</span>
      &nbsp;|&nbsp; Separate Cap: ${teFmt(cfg.poolB.cap)} (in addition to Pool A)
      &nbsp;|&nbsp; <span style="color:${poolBLeft===0?'var(--te-warn)':'var(--te-muted)'};">Remaining: ${teFmt(poolBLeft)}</span>
    </div>
    <div class="te-frow" style="gap:12px;flex-wrap:wrap;">
      <div class="te-field-group">
        <label class="te-lbl">Heat Pumps (space heating/cooling)</label>
        <input type="text" inputmode="numeric" class="te-input te-mono" value="${e.heatPumps||''}" placeholder="0.00"
          oninput="teOnEnergyField('heatPumps',this.value)">
      </div>
      <div class="te-field-group">
        <label class="te-lbl">Heat Pump Water Heaters</label>
        <input type="text" inputmode="numeric" class="te-input te-mono" value="${e.heatPumpWH||''}" placeholder="0.00"
          oninput="teOnEnergyField('heatPumpWH',this.value)">
      </div>
      <div class="te-field-group">
        <label class="te-lbl">Biomass Stoves / Boilers</label>
        <input type="text" inputmode="numeric" class="te-input te-mono" value="${e.biomass||''}" placeholder="0.00"
          oninput="teOnEnergyField('biomass',this.value)">
      </div>
    </div>

    ${(poolAUsed > 0 || poolBUsed > 0) ? `
    <div class="te-ctc-tbl" style="margin-top:14px;">
      ${poolAUsed > 0 ? `<div class="te-ctc-row te-ctc-sub"><span>Pool A Qualified (cap ${teFmt(cfg.poolA.cap)}) <span class="te-cite">§25C(b)(1)</span></span><span>${teFmt(poolAUsed)}</span></div>` : ''}
      ${poolBUsed > 0 ? `<div class="te-ctc-row te-ctc-sub"><span>Pool B Qualified (cap ${teFmt(cfg.poolB.cap)} — separate) <span class="te-cite">§25C(b)(2)</span></span><span>${teFmt(poolBUsed)}</span></div>` : ''}
      <div class="te-ctc-row te-ctc-tot"><span>§25C Credit @ 30% (Non-Refundable)</span><span>${teFmt(totalCredit)}</span></div>
    </div>` : ''}`;
}


// ──────────────────────────────────────────────────────────────────────
//  METER UPDATE
// ──────────────────────────────────────────────────────────────────────

function teUpdateMeter(calc, K, fs) {
  teM('te-m-wages',    teFmt(calc.w2Wages));

  // SE income row
  let seIncRow = document.getElementById('te-m-se-inc-row');
  if (seIncRow) { seIncRow.style.display = calc.netSEIncome > 0 ? 'flex' : 'none'; teM('te-m-se-inc', teFmt(calc.netSEIncome)); }

  // SS taxable — hidden when $0
  let ssMRow = document.getElementById('te-m-ss-row');
  if (ssMRow) { ssMRow.style.display = (calc.ssBenefitsTaxable || 0) > 0 ? 'flex' : 'none'; teM('te-m-ss', teFmt(calc.ssBenefitsTaxable || 0)); }

  // Track 4 income rows
  let intRow = document.getElementById('te-m-int-row');
  if (intRow) { intRow.style.display = calc.interestIncome > 0 ? 'flex' : 'none'; teM('te-m-int', teFmt(calc.interestIncome)); }
  let divRow = document.getElementById('te-m-div-row');
  if (divRow) {
    divRow.style.display = calc.ordinaryDividends > 0 ? 'flex' : 'none';
    let divLabel = document.getElementById('te-m-div-lbl');
    if (divLabel) divLabel.textContent = calc.qualifiedDividends > 0
      ? 'Dividends (' + teFmt(calc.qualifiedDividends) + ' qual.)'
      : 'Dividends';
    teM('te-m-div', teFmt(calc.ordinaryDividends));
  }
  let capRow = document.getElementById('te-m-capgain-row');
  if (capRow) {
    capRow.style.display = (calc.scheduleDNet !== 0 || calc.scheduleDCombined !== 0) ? 'flex' : 'none';
    teM('te-m-capgain', calc.scheduleDNet >= 0 ? teFmt(calc.scheduleDNet) : '(' + teFmt(Math.abs(calc.scheduleDNet)) + ')');
  }
  let scheRow = document.getElementById('te-m-sche-row');
  if (scheRow) { scheRow.style.display = calc.scheduleENet !== 0 ? 'flex' : 'none'; teM('te-m-sche', calc.scheduleENet >= 0 ? teFmt(calc.scheduleENet) : '(' + teFmt(Math.abs(calc.scheduleENet)) + ')'); }

  let sliRow = document.getElementById('te-m-sli-row');
  if (sliRow) { sliRow.style.display = calc.sliDeduction > 0 ? 'flex' : 'none'; teM('te-m-sli', '(' + teFmt(calc.sliDeduction) + ')'); }
  let hsaRow = document.getElementById('te-m-hsa-row');
  if (hsaRow) { hsaRow.style.display = calc.hsaDeduction > 0 ? 'flex' : 'none'; teM('te-m-hsa', '(' + teFmt(calc.hsaDeduction) + ')'); }
  let iraRow = document.getElementById('te-m-ira-row');
  if (iraRow) { iraRow.style.display = calc.iraDeduction > 0 ? 'flex' : 'none'; teM('te-m-ira', '(' + teFmt(calc.iraDeduction) + ')'); }

  // SE tax deduction row
  let seRow = document.getElementById('te-m-se-row');
  if (seRow) { seRow.style.display = calc.seTaxDeduction > 0 ? 'flex' : 'none'; teM('te-m-se', '(' + teFmt(calc.seTaxDeduction) + ')'); }

  // Alimony row
  let alRow = document.getElementById('te-m-al-row');
  if (alRow) { alRow.style.display = calc.alimonyDeduction > 0 ? 'flex' : 'none'; teM('te-m-al', '(' + teFmt(calc.alimonyDeduction) + ')'); }
  teM('te-m-agi',      teFmt(calc.agi));
  // Deduction row: show standard OR itemized label/amount depending on which is applied
  let stdMRow  = document.getElementById('te-m-std-row');
  let itMRow   = document.getElementById('te-m-itemized-row');
  let useIt    = calc.deductionType === 'itemized';
  if (stdMRow)  stdMRow.style.display  = useIt ? 'none'  : 'flex';
  if (itMRow)   itMRow.style.display   = useIt ? 'flex'  : 'none';
  teM('te-m-std',       '(' + teFmt(calc.stdDed)       + ')');
  teM('te-m-itemized',  '(' + teFmt(calc.itemizedTotal) + ')');
  let qbiMRow = document.getElementById('te-m-qbi-row');
  if (qbiMRow) { qbiMRow.style.display = (calc.qbiDeduction || 0) > 0 ? 'flex' : 'none'; teM('te-m-qbi', '(' + teFmt(calc.qbiDeduction || 0) + ')'); }
  teM('te-m-taxable',  teFmt(calc.taxableIncome));
  teM('te-m-regtax',   teFmt(calc.regularTax));
  teM('te-m-ctc',     calc.ctcNonRefundable > 0 ? '(' + teFmt(calc.ctcNonRefundable) + ')' : '$0');
  teM('te-m-edu',     calc.totalEduNonRefundable > 0 ? '(' + teFmt(calc.totalEduNonRefundable) + ')' : '$0');
  let cdccMRow = document.getElementById('te-m-cdcc-row');
  if (cdccMRow) { cdccMRow.style.display = calc.cdccCredit > 0 ? 'flex' : 'none'; teM('te-m-cdcc', '(' + teFmt(calc.cdccCredit) + ')'); }
  let saversMRow = document.getElementById('te-m-savers-row');
  if (saversMRow) { saversMRow.style.display = calc.saversCredit > 0 ? 'flex' : 'none'; teM('te-m-savers', '(' + teFmt(calc.saversCredit) + ')'); }
  let energyMRow = document.getElementById('te-m-energy-row');
  if (energyMRow) { energyMRow.style.display = calc.energyCredit > 0 ? 'flex' : 'none'; teM('te-m-energy', '(' + teFmt(calc.energyCredit) + ')'); }
  teM('te-m-taxaft',   teFmt(calc.taxAfterNRCredits || 0));

  // SE tax row in meter (post-credit)
  let seTaxMRow = document.getElementById('te-m-setax-row');
  if (seTaxMRow) { seTaxMRow.style.display = calc.seTax > 0 ? 'flex' : 'none'; teM('te-m-setax', teFmt(calc.seTax)); }

  // NIIT and Additional Medicare rows
  let niitMRow = document.getElementById('te-m-niit-row');
  if (niitMRow) { niitMRow.style.display = calc.niit > 0 ? 'flex' : 'none'; teM('te-m-niit', teFmt(calc.niit)); }
  let amMRow = document.getElementById('te-m-am-row');
  if (amMRow) { amMRow.style.display = calc.addlMedicareTax > 0 ? 'flex' : 'none'; teM('te-m-am', teFmt(calc.addlMedicareTax)); }

  // AMT row — hidden when $0
  let amtMRow = document.getElementById('te-m-amt-row');
  if (amtMRow) { amtMRow.style.display = calc.amt > 0 ? 'flex' : 'none'; teM('te-m-amt', teFmt(calc.amt || 0)); }

  // Early withdrawal penalty row — hidden when $0
  let penaltyMRow = document.getElementById('te-m-penalty-row');
  if (penaltyMRow) { penaltyMRow.style.display = calc.earlyWithdrawalPenalty > 0 ? 'flex' : 'none'; teM('te-m-penalty', teFmt(calc.earlyWithdrawalPenalty || 0)); }

  teM('te-m-wh',      '(' + teFmt(calc.w2Withholding) + ')');

  // Estimated payments row
  let epRow = document.getElementById('te-m-ep-row');
  if (epRow) { epRow.style.display = calc.estPayments > 0 ? 'flex' : 'none'; teM('te-m-ep', '(' + teFmt(calc.estPayments) + ')'); }

  let actcRow = document.getElementById('te-m-actc-row');
  if (actcRow) {
    actcRow.style.display = calc.actcRefundable > 0 ? 'flex' : 'none';
    teM('te-m-actc', '(' + teFmt(calc.actcRefundable) + ')');
  }
  let aocRow = document.getElementById('te-m-aoc-ref-row');
  if (aocRow) {
    aocRow.style.display = calc.aocRefundable > 0 ? 'flex' : 'none';
    teM('te-m-aoc-ref', '(' + teFmt(calc.aocRefundable) + ')');
  }
  let eicRow = document.getElementById('te-m-eic-row');
  if (eicRow) {
    eicRow.style.display = calc.eicCredit > 0 ? 'flex' : 'none';
    teM('te-m-eic', '(' + teFmt(calc.eicCredit) + ')');
  }

  let rl = document.getElementById('te-m-result-lbl');
  let rv = document.getElementById('te-m-result-val');
  let rb = document.getElementById('te-meter-result');
  if (!rl || !rv || !rb) return;

  if (calc.refundOrDue >= 0) {
    rl.textContent = 'Estimated Refund';
    rv.textContent = teFmt(calc.refundOrDue);
    rb.className   = 'te-meter-result te-res-refund';
  } else {
    rl.textContent = 'Balance Due';
    rv.textContent = teFmt(Math.abs(calc.refundOrDue));
    rb.className   = 'te-meter-result te-res-due';
  }
}


// ──────────────────────────────────────────────────────────────────────
//  SECTION STATUS (nav checkmarks)
// ──────────────────────────────────────────────────────────────────────



// ──────────────────────────────────────────────────────────────────────
//  OPTIMIZATION FLAGS
// ──────────────────────────────────────────────────────────────────────

function teRunFlags(calc, K, fs) {
  let flags = [];
  let r     = teCurrentReturn;
  if (calc.agi === 0) {
    let p = document.getElementById('te-flags-panel');
    if (p) p.style.display = 'none';
    return;
  }

  // CTC phase-out proximity
  let ctcThr = K.ctc.phaseoutThreshold[fs] || K.ctc.phaseoutThreshold.single;
  let numQC  = (r.dependents||[]).filter(d => d.isQualifyingChild && teIsUnder17(d.dob, r.taxYear)).length;
  if (numQC > 0 && calc.agi > ctcThr * 0.90 && calc.agi <= ctcThr) {
    flags.push({ type: 'warning', text: 'AGI is within ' + teFmt(ctcThr - calc.agi) + ' of the CTC phase-out threshold (' + teFmt(ctcThr) + '). Pre-tax retirement contributions or deductions could preserve the full credit.' });
  }
  if (numQC > 0 && calc.agi > ctcThr) {
    flags.push({ type: 'info', text: 'CTC reduced by ' + teFmt(Math.ceil((calc.agi - ctcThr)/1000)*50) + ' due to phase-out.' });
  }

  // Withholding vs. tax
  if (calc.taxAfterCredits > 0 && calc.w2Withholding < calc.taxAfterCredits) {
    flags.push({ type: 'warning', text: 'Withholding (' + teFmt(calc.w2Withholding) + ') is below tax liability (' + teFmt(calc.taxAfterCredits) + '). Balance due of ' + teFmt(calc.taxAfterCredits - calc.w2Withholding) + '. Consider W-4 adjustment.' });
  }

  // AOC phase-out proximity
  let aocStudents = (r.educationStudents||[]).filter(s => s.creditType === 'aoc');
  if (aocStudents.length > 0) {
    let fg = (fs === 'mfj' || fs === 'qss') ? 'mfj' : 'single';
    let lo = K.aoc.phaseoutLower[fg], hi = K.aoc.phaseoutUpper[fg];
    if (calc.agi >= lo && calc.agi <= hi)
      flags.push({ type: 'warning', text: 'AGI is within the AOC phase-out range (' + teFmt(lo) + ' – ' + teFmt(hi) + '). Education credit is being reduced.' });
    if (calc.agi > hi)
      flags.push({ type: 'info', text: 'AGI exceeds AOC/LLC phase-out ceiling (' + teFmt(hi) + '). Education credits fully phased out.' });
  }

  // Student loan interest phase-out
  let adj = r.agiAdjustments || {};
  if (parseFloat(adj.studentLoanInterest) > 0 && fs !== 'mfs') {
    let sliPo  = (fs === 'mfj') ? K.studentLoanInterest.phaseout.mfj : K.studentLoanInterest.phaseout.single;
    let magiSLI = calc.grossIncome - calc.hsaDeduction;
    if (magiSLI >= sliPo.ceiling) {
      flags.push({ type: 'info', text: 'Student loan interest deduction fully phased out. MAGI (' + teFmt(magiSLI) + ') exceeds ' + teFmt(sliPo.ceiling) + ' ceiling.' });
    } else if (magiSLI > sliPo.floor) {
      flags.push({ type: 'warning', text: 'Student loan interest deduction is being reduced. MAGI (' + teFmt(magiSLI) + ') is within the ' + teFmt(sliPo.floor) + '–' + teFmt(sliPo.ceiling) + ' phase-out range.' });
    }
  }

  // IRA deduction phase-out
  if (parseFloat(adj.iraContributions) > 0 && (adj.iraActiveParticipant || (fs === 'mfj' && adj.iraSpouseActive))) {
    let magiIRA = calc.grossIncome - calc.hsaDeduction - calc.sliDeduction;
    let po      = null;
    if (adj.iraActiveParticipant) {
      if (fs === 'single' || fs === 'hoh' || fs === 'qss') po = K.ira.phaseout.singleActive;
      else if (fs === 'mfj') po = K.ira.phaseout.mfjActive;
      else if (fs === 'mfs') po = K.ira.phaseout.mfsActive;
    } else if (fs === 'mfj' && adj.iraSpouseActive) {
      po = K.ira.phaseout.mfjSpouseActive;
    }
    if (po) {
      if (magiIRA >= po.ceiling) {
        flags.push({ type: 'info', text: 'Traditional IRA deduction fully phased out. MAGI (' + teFmt(magiIRA) + ') exceeds ' + teFmt(po.ceiling) + ' limit. Consider Roth IRA if eligible.' });
      } else if (magiIRA > po.floor) {
        flags.push({ type: 'warning', text: 'Traditional IRA deduction partially reduced. MAGI (' + teFmt(magiIRA) + ') is within the ' + teFmt(po.floor) + '–' + teFmt(po.ceiling) + ' phase-out range. Deductible: ' + teFmt(calc.iraDeduction) + '.' });
      }
    }
  }

  // SE tax: no estimated payments flagged
  if (calc.seTax > 0 && calc.estPayments === 0 && calc.w2Withholding < calc.taxAfterCredits) {
    flags.push({ type: 'warning', text: 'Self-employment income detected but no estimated tax payments entered. SE clients typically owe quarterly payments to avoid IRC §6654 underpayment penalties. Consider entering Q1–Q4 estimated payments in the Payments section.' });
  }

  // SS wage base saturation — informational
  if (calc.netSEIncome > 0 && calc.seSSBase < calc.seTaxBase) {
    let saved = teRound((calc.seTaxBase - calc.seSSBase) * 0.124);
    flags.push({ type: 'info', text: 'Social Security wage base (' + teFmt(K.selfEmployment.ssTaxWageBase) + ') partially or fully exhausted by W-2 wages (' + teFmt(calc.w2Wages) + '). SS portion of SE tax reduced by ' + teFmt(saved) + '. <span class="te-cite">IRC §1402(b)</span>' });
  }

  // Track 4 — Additional Medicare Tax (0.9%) — now live
  let K4 = TAX_CONSTANTS[r.taxYear || teActiveYear];
  if (K4 && K4.addlMedicare) {
    let amThr      = K4.addlMedicare.threshold[fs] || K4.addlMedicare.threshold.single;
    let earnedBase = teRound(calc.w2Wages + calc.netSEIncome);
    if (earnedBase > amThr * 0.85 && earnedBase <= amThr) {
      flags.push({ type: 'warning', text: 'Wages + SE income (' + teFmt(earnedBase) + ') is within ' + teFmt(amThr - earnedBase) + ' of the Additional Medicare Tax threshold (' + teFmt(amThr) + '). The 0.9% surtax will apply above this level. <span class="te-cite">IRC §3101(b)(2)</span>' });
    }
    if (calc.addlMedicareTax > 0) {
      flags.push({ type: 'info', text: 'Additional Medicare Tax: ' + teFmt(calc.addlMedicareTax) + ' (0.9% on wages + SE income exceeding ' + teFmt(amThr) + '). Consider increasing W-4 withholding or estimated payments. <span class="te-cite">IRC §3101(b)(2)</span>' });
    }
  }

  // Track 4 — NIIT (3.8%)
  if (calc.niit > 0) {
    flags.push({ type: 'info', text: 'Net Investment Income Tax: ' + teFmt(calc.niit) + ' (3.8% on lesser of NII ' + teFmt(calc.netInvestmentIncome) + ' or MAGI excess over threshold). <span class="te-cite">IRC §1411</span>' });
  } else if (calc.netInvestmentIncome > 0 && K4 && K4.niit) {
    let niitThr = K4.niit.threshold[fs] || K4.niit.threshold.single;
    if (calc.agi > niitThr * 0.85 && calc.agi <= niitThr) {
      flags.push({ type: 'warning', text: 'AGI is within ' + teFmt(niitThr - calc.agi) + ' of the NIIT threshold (' + teFmt(niitThr) + '). Investment income (' + teFmt(calc.netInvestmentIncome) + ') may become subject to 3.8% surtax. <span class="te-cite">IRC §1411</span>' });
    }
  }

  // Track 4 — LTCG in 0% bracket (planning opportunity)
  if (calc.qdltcg > 0 && K4 && K4.capitalGains) {
    let bKey0    = (fs === 'qss') ? 'mfj' : fs;
    let zeroCeil = K4.capitalGains.zeroRateCeiling[bKey0] || K4.capitalGains.zeroRateCeiling.single;
    let ordPortion = teRound(Math.max(0, calc.taxableIncome - calc.qdltcg));
    if (ordPortion < zeroCeil) {
      let zeroRoom = teRound(zeroCeil - ordPortion);
      let zeroAmt  = teRound(Math.min(calc.qdltcg, zeroRoom));
      if (zeroAmt > 0) {
        flags.push({ type: 'info', text: teFmt(zeroAmt) + ' of qualified dividends/LTCG is in the 0% rate bracket (taxable income below ' + teFmt(zeroCeil) + '). Planning opportunity: consider harvesting additional long-term gains tax-free. <span class="te-cite">IRC §1(h)</span>' });
      }
    }
  }

  // Track 4 — Passive loss suspended
  if (calc.passiveLossSuspended > 0) {
    flags.push({ type: 'warning', text: 'Suspended passive loss: ' + teFmt(calc.passiveLossSuspended) + ' from Schedule E passive activities is not currently deductible. Passive losses may only offset passive income. The suspended loss carries forward. <span class="te-cite">IRC §469(a)</span>' });
  }

  // Track 4 — Investment interest carryforward created
  if (calc.investmentInterestCarryforward > 0) {
    flags.push({ type: 'info', text: 'Investment interest expense exceeds net investment income. Disallowed amount of ' + teFmt(calc.investmentInterestCarryforward) + ' carries forward to next year. <span class="te-cite">IRC §163(d)(2)</span>' });
  }

  // Track 4 — QD input validation
  if ((parseFloat((teCurrentReturn.schedule1099 || {}).qualifiedDividends) || 0) > (parseFloat((teCurrentReturn.schedule1099 || {}).ordinaryDividends) || 0)) {
    flags.push({ type: 'warning', text: 'Qualified dividends (Box 1b) exceed ordinary dividends (Box 1a). Qualified dividends are a subset — Box 1b cannot exceed Box 1a. Engine has capped at Box 1a. <span class="te-cite">IRC §1(h)(11)(B)</span>' });
  }

  // Alimony: post-2018 agreement entered but marked as non-deductible
  let al = teCurrentReturn.alimony || {};
  if (parseFloat(al.paid) > 0 && !al.preAgreement) {
    flags.push({ type: 'warning', text: 'Alimony paid (' + teFmt(parseFloat(al.paid)) + ') entered but the agreement is dated Jan 1, 2019 or later — not deductible under TCJA. Verify the original divorce or separation instrument date. <span class="te-cite">IRC §215(b)(2); TCJA §11051</span>' });
  }

  // Home equity personal use flag — IRC §163(h)(3)(C)
  let schedAFlags = teCurrentReturn.scheduleA || {};
  if (schedAFlags.mortgagePurpose === 'home_equity_personal' && parseFloat(schedAFlags.mortgageInterest) > 0) {
    flags.push({ type: 'warning', text: 'Mortgage interest excluded: home equity debt used for personal purposes is not deductible under TCJA. If proceeds were used to buy, build, or improve the home, change Debt Purpose to Acquisition / Improvement. IRC §163(h)(3)(C).' });
  }

  // MFS spouse-itemizes override flag — IRC §63(e)
  if (calc.mfsItemizedRequired) {
    flags.push({ type: 'warning', text: 'MFS: Spouse is itemizing — standard deduction ($' + (TAX_CONSTANTS[r.taxYear] ? TAX_CONSTANTS[r.taxYear].standardDeduction.mfs.toLocaleString() : '0') + ') is disallowed on this return. Deduction used: itemized total of ' + teFmt(calc.itemizedTotal) + '. IRC §63(e).' });
  }

  // Track 5 — EIC flags
  if (fs !== 'mfs') {
    let eicQC  = teCountEICQC(teCurrentReturn);
    let eicK   = K.eic;
    let earnedIncome = teRound(calc.w2Wages + calc.netSEIncome);
    let eicData = teCurrentReturn.eic || {};

    // Investment income disqualifier — IRC §32(i)(1)
    let eicInvIncome = teRound(calc.interestIncome + calc.ordinaryDividends + Math.max(0, calc.scheduleDNet) + Math.max(0, calc.scheduleEPassive));
    if (eicInvIncome > 0 && eicK && eicInvIncome > eicK.investmentIncomeLimit) {
      flags.push({ type: 'warning', text: 'EIC disqualified: Investment income (' + teFmt(eicInvIncome) + ') exceeds the ' + teFmt(eicK.investmentIncomeLimit) + ' limit. <span class="te-cite">IRC §32(i)(1)</span>' });
    }

    if (calc.eicCredit > 0) {
      let numKey = Math.min(eicQC + (eicData.claimChildless && eicQC === 0 ? 0 : 0), 3);
      let threshold = eicK.phaseOutThreshold[eicQC] + (fs === 'mfj' ? eicK.jointBonus : 0);
      let phaseOutBase = Math.max(calc.agi, earnedIncome);
      flags.push({ type: 'info', text: 'Earned Income Credit: ' + teFmt(calc.eicCredit) + ' (fully refundable). Based on ' + eicQC + ' EIC qualifying child' + (eicQC === 1 ? '' : 'ren') + '. Phase-out begins at ' + teFmt(threshold) + '. <span class="te-cite">IRC §32</span>' });
    } else if (earnedIncome > 0 && eicQC > 0 && eicK && eicInvIncome <= eicK.investmentIncomeLimit) {
      // Would have qualified but phased out
      let threshold = eicK.phaseOutThreshold[Math.min(eicQC, 3)] + (fs === 'mfj' ? eicK.jointBonus : 0);
      let phaseOutBase = Math.max(calc.agi, earnedIncome);
      if (phaseOutBase > threshold) {
        let maxCredit = eicK.maxCredit[Math.min(eicQC, 3)];
        let excess = phaseOutBase - threshold;
        let reduction = excess * eicK.phaseOutRate[Math.min(eicQC, 3)];
        if (reduction >= maxCredit) {
          flags.push({ type: 'info', text: 'EIC fully phased out: AGI/earned income (' + teFmt(phaseOutBase) + ') exceeds the ' + eicQC + '-child phase-out range. Max credit (' + teFmt(maxCredit) + ') fully reduced. <span class="te-cite">IRC §32(b)</span>' });
        }
      }
    }

    // EIC phase-out proximity warning
    if (calc.eicCredit > 0 && eicK && eicQC >= 0) {
      let threshold = eicK.phaseOutThreshold[Math.min(eicQC, 3)] + (fs === 'mfj' ? eicK.jointBonus : 0);
      let phaseOutBase = Math.max(calc.agi, earnedIncome);
      if (phaseOutBase > threshold) {
        let maxCredit = eicK.maxCredit[Math.min(eicQC, 3)];
        let dollarsTillZero = teRound(maxCredit / eicK.phaseOutRate[Math.min(eicQC, 3)] - (phaseOutBase - threshold));
        if (dollarsTillZero > 0 && dollarsTillZero < 5000) {
          flags.push({ type: 'warning', text: 'EIC phase-out: credit will be fully eliminated in ' + teFmt(dollarsTillZero) + ' more of income. <span class="te-cite">IRC §32(b)</span>' });
        }
      }
    }
  }

  // Track 5B — CDCC flags
  if (fs !== 'mfs' && K.cdcc) {
    let cdccData = r.cdcc || {};
    let careExp  = parseFloat(cdccData.careExpenses) || 0;
    let fsaBen   = parseFloat(cdccData.fsaBenefits) || 0;
    if (careExp > 0 && fsaBen >= careExp) {
      flags.push({ type: 'warning', text: 'Child & Dependent Care Credit: FSA benefits (' + teFmt(fsaBen) + ') equal or exceed qualifying care expenses (' + teFmt(careExp) + '). Net qualifying expenses are $0 — no §21 credit available on those expenses. <span class="te-cite">IRC §21(c)</span>' });
    }
    if (cdccData.qualifyingPersons && !cdccData.spouseIsStudentOrDisabled && fs === 'mfj') {
      let spouseEI = parseFloat(cdccData.spouseEarnedIncome) || 0;
      if (spouseEI === 0 && (calc.w2Wages + calc.netSEIncome) > 0) {
        flags.push({ type: 'warning', text: 'Child & Dependent Care Credit: MFJ return with spouse earned income of $0. Unless the spouse is a full-time student or incapable of self-care (check the student/disabled box for deemed income), the earned income limit eliminates the §21 credit. <span class="te-cite">IRC §21(d)</span>' });
      }
    }
    if (calc.cdccCredit > 0) {
      flags.push({ type: 'info', text: 'Child & Dependent Care Credit: ' + teFmt(calc.cdccCredit) + ' at ' + Math.round((calc.cdccRate || 0) * 100) + '% rate on ' + teFmt(calc.cdccQualExp) + ' of qualifying expenses (non-refundable). <span class="te-cite">IRC §21</span>' });
    }
  }

  // Track 5C — Saver's Credit flags
  if (fs !== 'mfs' && K.savers) {
    let saversData = r.savers || {};
    let tpContrib  = parseFloat(saversData.taxpayerContributions) || 0;
    let tpDistTot  = (parseFloat(saversData.taxpayerDistCurrent) || 0) + (parseFloat(saversData.taxpayerDistPrior) || 0);
    if (tpContrib > 0 && tpDistTot >= tpContrib) {
      flags.push({ type: 'warning', text: 'Saver\'s Credit: distributions received (' + teFmt(tpDistTot) + ') equal or exceed contributions (' + teFmt(tpContrib) + '). Net qualifying contribution is $0 — no §25B credit for taxpayer. <span class="te-cite">IRC §25B(d)</span>' });
    }
    if (calc.saversCredit > 0 && K.savers.agiBrackets) {
      let bracketKey = (fs === 'mfj') ? 'mfj' : (fs === 'hoh') ? 'hoh' : 'other';
      // Check if AGI is within $2,000 of a rate tier boundary (planning opportunity)
      for (let [maxAGI] of K.savers.agiBrackets[bracketKey]) {
        if (calc.agi > maxAGI && calc.agi <= maxAGI + 2000) {
          flags.push({ type: 'info', text: 'Saver\'s Credit: AGI (' + teFmt(calc.agi) + ') just crossed the ' + teFmt(maxAGI) + ' bracket threshold. A pre-tax contribution of ' + teFmt(calc.agi - maxAGI) + ' could move into the higher credit rate tier. <span class="te-cite">IRC §25B(b)</span>' });
          break;
        }
      }
      flags.push({ type: 'info', text: 'Saver\'s Credit: ' + teFmt(calc.saversCredit) + ' (non-refundable). OBBBA note: this credit will be limited to ABLE contributions only starting TY2027. <span class="te-cite">IRC §25B; OBBBA P.L. 119-21 §70116</span>' });
    }
  }

  // Track 5D — Energy Credit flags
  if (calc.energyTerminated) {
    // Terminated — shown in UI panel; no flag needed here (avoid duplicate noise)
  } else if (calc.energyCredit > 0) {
    let poolAStr = calc.energyPoolA > 0 ? 'Pool A: ' + teFmt(calc.energyPoolA) : '';
    let poolBStr = calc.energyPoolB > 0 ? 'Pool B (heat pump/biomass): ' + teFmt(calc.energyPoolB) : '';
    let parts    = [poolAStr, poolBStr].filter(Boolean).join(' | ');
    flags.push({ type: 'info', text: '§25C Energy Credit: ' + teFmt(calc.energyCredit) + ' total (non-refundable). ' + parts + '. This is the final year of §25C — credit terminated for TY2026+ by OBBBA P.L. 119-21 §70505.' });
    if (K.energyImprovement) {
      let eg = r.energyImprovement || {};
      let winVal = parseFloat(eg.windows)||0;
      let epVal  = parseFloat(eg.energyProperty)||0;
      if (winVal > K.energyImprovement.poolA.subCaps.windows) {
        flags.push({ type: 'info', text: '§25C: Window/skylight expenses exceed the $600 sub-cap. ' + teFmt(winVal - K.energyImprovement.poolA.subCaps.windows) + ' of expenses not creditable. <span class="te-cite">§25C(b)(1)(B)</span>' });
      }
      if (epVal > K.energyImprovement.poolA.subCaps.energyProperty) {
        flags.push({ type: 'info', text: '§25C: Energy property expenses exceed the $600 sub-cap. ' + teFmt(epVal - K.energyImprovement.poolA.subCaps.energyProperty) + ' of expenses not creditable. <span class="te-cite">§25C(b)(1)(A)</span>' });
      }
    }
  }

  // Deduction comparison note
  if (calc.mfsItemizedRequired) {
    // already flagged above; skip redundant comparison note
  } else if (calc.deductionType === 'itemized') {
    flags.push({ type: 'info', text: 'Itemized deductions (' + teFmt(calc.itemizedTotal) + ') applied — exceeds standard deduction (' + teFmt(calc.stdDed) + ') by ' + teFmt(calc.itemizedTotal - calc.stdDed) + '.' });
  } else if (calc.itemizedTotal > 0) {
    flags.push({ type: 'warning', text: 'Standard deduction (' + teFmt(calc.stdDed) + ') applied. Itemized total (' + teFmt(calc.itemizedTotal) + ') is ' + teFmt(calc.stdDed - calc.itemizedTotal) + ' below the standard deduction.' });
  } else {
    flags.push({ type: 'info', text: 'Standard deduction of ' + teFmt(calc.stdDed) + ' applied. Enter Schedule A expenses in the Deductions section to compare.' });
  }

  let panel = document.getElementById('te-flags-panel');
  let list  = document.getElementById('te-flags-list');
  if (!panel || !list) return;
  panel.style.display = 'block';
  list.innerHTML = flags.map(f => `
    <div class="te-flag te-flag-${f.type}">
      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="flex-shrink:0;margin-top:1px"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
      <span>${f.text}</span>
    </div>`).join('');
}


// ──────────────────────────────────────────────────────────────────────
//  CPA NOTES PANEL
// ──────────────────────────────────────────────────────────────────────



// ──────────────────────────────────────────────────────────────────────
//  RETURN STATUS (from Return Center row)
// ──────────────────────────────────────────────────────────────────────



// ──────────────────────────────────────────────────────────────────────
//  SAVE / LOAD / SERIALIZE
// ──────────────────────────────────────────────────────────────────────



// ──────────────────────────────────────────────────────────────────────
//  HELPERS
// ──────────────────────────────────────────────────────────────────────




// ──────────────────────────────────────────────────────────────────────
//  UNSAVED CHANGES — SIDEBAR NAVIGATION GUARD
//  Wraps switchDashTab so any navigation away from an open return
//  with unsaved changes triggers a Save / Discard modal first.
//  Runs once at script load after dashboard.js has defined switchDashTab.
// ──────────────────────────────────────────────────────────────────────
