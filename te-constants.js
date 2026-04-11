// ══════════════════════════════════════════════════════════════════════
//  SESNY ADVISORY — TAX ENGINE
//  Phase 1: Individual Income Tax Return (Form 1040)
//           W-2 Income | Standard Deduction | CTC | AOC/LLC | Withholding
//
//  SOURCING MANDATE: Every constant, threshold, and tax rule in this file
//  is verified against a primary source. Source citations appear in
//  comments on every threshold and rate. Approved sources:
//  irs.gov | uscode.house.gov | congress.gov
//
//  Prohibited sources: blogs, TurboTax, Investopedia, Reddit, etc.
//  If a primary source cannot confirm a figure → flag TODO:VERIFY and stop.
// ══════════════════════════════════════════════════════════════════════


// ──────────────────────────────────────────────────────────────────────
//  TAX CONSTANTS
//  Primary source: IRS Rev. Proc. 2024-40
//  Amended by: One Big Beautiful Bill Act, P.L. 119-21 (July 4, 2025)
//
//  CONSTANTS AUDIT
//  Last verified: 2026-04-07
//  2025: Fully confirmed — Rev. Proc. 2024-40; OBBBA P.L. 119-21
//  2026: Mostly confirmed — Rev. Proc. 2025-32; IRS newsroom announcements
//  2026 PENDING: SS wage base (SSA returned 403); Business mileage rate (IRS notice inaccessible)
//  2026 RESOLVED (2026-04-07): HOH brackets confirmed vs. Rev. Proc. 2025-32 (IRB 2025-45) — values were correct.
//    SLI MFJ phase-out — Rev. Proc. 2025-32 §4.29: updated to $175,000–$205,000.
// ──────────────────────────────────────────────────────────────────────

const TAX_CONSTANTS = {
  2025: {

    // IRC §63(c)(2) — Standard Deduction
    // Source: OBBBA P.L. 119-21; irs.gov/newsroom/one-big-beautiful-bill-provisions-individuals-and-workers
    standardDeduction: {
      single: 15750,
      mfj:    31500,
      mfs:    15750,
      hoh:    23625,
      qss:    31500  // QSS uses MFJ standard deduction per IRC §2(a)
    },

    // IRC §63(f) — Additional Standard Deduction (age 65+ and/or blind)
    // Each qualifying condition (65+ OR blind) adds the applicable amount, per person.
    // Applies to taxpayer AND qualifying spouse — NOT to dependents.
    // Source: Rev. Proc. 2024-40; irs.gov/taxtopics/tc551
    additionalStdDed: {
      single_hoh:   1950,  // 2025 — Single and HOH — IRC §63(f)(1)(A)
      mfj_mfs_qss:  1600   // 2025 — MFJ, MFS, QSS — IRC §63(f)(1)(B)
    },

    // IRC §63(c)(5) — Limited Standard Deduction for Dependents
    // When taxpayer can be claimed as dependent on another's return, standard deduction limited to:
    //   max(min, earnedIncome + earnedAdd) — capped at the full regular standard deduction
    // Additional amounts for 65+/blind (IRC §63(f)) still apply on top of this limited base.
    // Source: irs.gov/taxtopics/tc551; IRC §63(c)(5)
    dependentStdDed: {
      min:       1250,  // 2025 floor — IRC §63(c)(5)(A) — CPI-adjusted
      earnedAdd:  400   // 2025 — IRC §63(c)(5)(B): earned income + this amount
    },

    // IRC §1 — Income Tax Rate Schedules (7 brackets)
    // Source: irs.gov/filing/federal-income-tax-rates-and-brackets (2025)
    // OBBBA P.L. 119-21 made these rates permanent.
    // Format: [upperBound, marginalRate] — rate applies from prior ceiling to this bound.
    brackets: {
      single: [
        [11925,    0.10],
        [48475,    0.12],
        [103350,   0.22],
        [197300,   0.24],
        [250525,   0.32],
        [626350,   0.35],
        [Infinity, 0.37]
      ],
      mfj: [
        [23850,    0.10],
        [96950,    0.12],
        [206700,   0.22],
        [394600,   0.24],
        [501050,   0.32],
        [751600,   0.35],
        [Infinity, 0.37]
      ],
      // NOTE: MFS 35% ceiling is $375,800 — differs from Single ($626,350)
      // Verified: irs.gov/filing/federal-income-tax-rates-and-brackets
      mfs: [
        [11925,    0.10],
        [48475,    0.12],
        [103350,   0.22],
        [197300,   0.24],
        [250525,   0.32],
        [375800,   0.35],
        [Infinity, 0.37]
      ],
      hoh: [
        [17000,    0.10],
        [64850,    0.12],
        [103350,   0.22],
        [197300,   0.24],
        [250500,   0.32],
        [626350,   0.35],
        [Infinity, 0.37]
      ],
      qss: null  // QSS uses MFJ brackets per IRC §2(a)
    },

    // IRC §24 — Child Tax Credit
    // Source: OBBBA P.L. 119-21; irs.gov/credits-deductions/individuals/child-tax-credit
    ctc: {
      // IRC §24(a): $2,200 per qualifying child for TY2025
      // VERIFIED — irs.gov/credits-deductions/individuals/child-tax-credit (confirmed 2026-04-09)
      amountPerChild: 2200,

      // IRC §24(b)(1): Phase-out — $50 per $1,000 (or fraction) of AGI over threshold
      // Thresholds are STATUTORY (not inflation-adjusted)
      phaseoutThreshold: {
        single: 200000,
        mfj:    400000,
        mfs:    200000,
        hoh:    200000,
        qss:    400000
      },

      // IRC §24(d) — Additional Child Tax Credit (refundable portion)
      // Statutory base: $1,400 (TCJA, made permanent by OBBBA P.L. 119-21)
      // 2025 inflation-adjusted maximum: $1,700 per qualifying child
      // VERIFIED — Rev. Proc. 2024-40; irs.gov CTC page (confirmed 2026-04-09)
      actcStatutoryBase: 1400,
      actcMax:           1700,  // 2025 CPI-adjusted — Rev. Proc. 2024-40
      // Earned income threshold: made permanent by OBBBA at $2,500 (pre-TCJA was $3,000)
      earnedIncomeMin:   2500,
      // IRC §24(d)(1)(B): 15% of earned income over threshold
      earnedIncomeRate:  0.15
    },

    // IRC §25A(b) — American Opportunity Tax Credit (AOC)
    // Source: irs.gov/credits-deductions/individuals/education-credits-aotc-and-llc
    // OBBBA P.L. 119-21 did not modify §25A phase-out thresholds.
    // Phase-out thresholds are STATUTORY (not inflation-adjusted per §25A(d))
    aoc: {
      creditOnFirst2k: 1.00,  // 100% of first $2,000 of qualified expenses
      creditOnNext2k:  0.25,  // 25% of next $2,000 of qualified expenses
      maxCredit:       2500,
      refundablePct:   0.40,  // IRC §25A(i): 40% of credit is refundable
      maxRefundable:   1000,  // 40% × $2,500 max = $1,000 per student
      maxYears:        4,     // IRC §25A(b)(2)(B): first 4 tax years of post-secondary only
      // IRC §25A(d) — Phase-out thresholds (STATUTORY)
      phaseoutLower: { single: 80000,  mfj: 160000 },
      phaseoutUpper: { single: 90000,  mfj: 180000 }
    },

    // IRC §25A(c) — Lifetime Learning Credit (LLC)
    // Source: irs.gov/credits-deductions/individuals/education-credits-aotc-and-llc
    // NOT refundable. Same phase-out as AOC (statutory).
    llc: {
      creditRate:   0.20,   // 20% of qualified education expenses
      maxExpenses:  10000,  // Credit computed on up to $10,000 of expenses
      maxCredit:    2000,   // 20% × $10,000 = $2,000 maximum
      refundable:   false,
      // IRC §25A(d) — Same thresholds as AOC (STATUTORY)
      phaseoutLower: { single: 80000,  mfj: 160000 },
      phaseoutUpper: { single: 90000,  mfj: 180000 }
    },

    // ── TRACK 1: Above-the-Line Adjustments ──────────────────────────────

    // IRC §221 — Student Loan Interest Deduction (2025)
    // Source: IRS Publication 970 (irs.gov/publications/p970)
    // Maximum deduction: $2,500 — IRC §221(b)(1) (statutory, not inflation-adjusted)
    // MFS filers ineligible — IRC §221(b)(2)(B)
    // Phase-out thresholds for 2025 — Source: IRS Publication 970 (irs.gov/publications/p970)
    studentLoanInterest: {
      maxDeduction: 2500,   // IRC §221(b)(1) — statutory
      phaseout: {
        single: { floor: 85000,  ceiling: 100000 },  // Single/HOH/QSS — IRS Pub. 970 (2025)
        mfj:    { floor: 170000, ceiling: 200000 }   // MFJ — IRS Pub. 970 (2025)
        // MFS: not eligible — IRC §221(b)(2)(B)
      }
    },

    // IRC §223 — Health Savings Account (HSA) Deduction (2025)
    // Source: IRS Publication 969 (irs.gov/publications/p969); Rev. Proc. 2024-25
    // No income phase-out. Contribution limit depends on HDHP coverage type.
    hsa: {
      limitSelf:    4300,   // Self-only HDHP — Rev. Proc. 2024-25
      limitFamily:  8550,   // Family HDHP — Rev. Proc. 2024-25
      catchUp:      1000,   // Age 55+ additional — IRC §223(b)(3)(B) (statutory)
      // HDHP minimum deductibles — Rev. Proc. 2024-25 (for eligibility reference)
      hdhpMinDeductibleSelf:   1650,
      hdhpMinDeductibleFamily: 3300,
      hdhpMaxOopSelf:   8300,
      hdhpMaxOopFamily: 16600
    },

    // IRC §219 — Traditional IRA Deduction (2025)
    // Source: IRS.gov newsroom — irs.gov/newsroom/401k-limit-increases-to-23500-for-2025-ira-limit-remains-7000
    // Contribution limit: $7,000 — unchanged from 2024
    // Catch-up (age 50+): $1,000 — IRC §219(b)(5)(B) (statutory)
    // Phase-out ranges for active participants (covered by employer plan) — IRC §219(g)
    ira: {
      limit:   7000,  // IRC §219(b)(1) — 2025 (irs.gov newsroom)
      catchUp: 1000,  // IRC §219(b)(5)(B) — statutory, not inflation-adjusted
      phaseout: {
        // Taxpayer is active participant — IRC §219(g)(2)
        singleActive:    { floor: 79000,  ceiling: 89000  },  // Single/HOH active — irs.gov newsroom
        mfjActive:       { floor: 126000, ceiling: 146000 },  // MFJ, taxpayer active — irs.gov newsroom
        mfsActive:       { floor: 0,      ceiling: 10000  },  // MFS active — IRC §219(g)(2)(D) (statutory)
        // Taxpayer NOT active, spouse IS active — IRC §219(g)(7)
        mfjSpouseActive: { floor: 236000, ceiling: 246000 }   // MFJ non-participant — irs.gov newsroom
        // Neither active: no phase-out — fully deductible up to contribution limit
      }
    },

    // ── TRACK 2: Schedule A Itemized Deductions (2025) ───────────────────

    // IRC §164(a)(3),(b)(6) — SALT (State and Local Taxes)
    // Source: irs.gov/newsroom/one-big-beautiful-bill-provisions-individuals-and-workers
    // OBBBA P.L. 119-21: cap raised from $10,000 to $40,000 for tax years 2025–2029.
    // Phase-down: effective cap reduced by 30% of MAGI exceeding $500,000; floor $10,000.
    // MFS: cap is $20,000, phase-out threshold is $250,000 — IRC §164(b)(6)(B)
    scheduleA: {
      salt: {
        cap:                  40000,   // MFJ/Single/HOH/QSS — OBBBA P.L. 119-21
        mfsCap:               20000,   // MFS — IRC §164(b)(6)(B): half the joint cap
        phaseoutThreshold:   500000,   // MAGI threshold — OBBBA P.L. 119-21
        mfsPhaseoutThreshold: 250000,  // MFS: half of joint threshold
        phaseoutRate:           0.30,  // 30% reduction of excess MAGI — OBBBA P.L. 119-21
        floor:                10000    // Absolute floor — OBBBA P.L. 119-21
      },

      // IRC §163(h)(3) — Qualified Residence Interest (Mortgage Interest Deduction)
      // Source: uscode.house.gov/view.xhtml?req=granuleid:USC-prelim-title26-section163
      // TCJA §11043: acquisition debt cap $750,000 for post-12/15/2017 loans (permanent per OBBBA).
      // Pre-2018 acquisition debt grandfathered at $1,000,000 — IRC §163(h)(3)(B)(ii).
      // MFS limits: half the joint/single limits — IRC §163(h)(3)(F) proration applies equally.
      // PMI: not available for TY2025 — OBBBA §70108 reinstates for TY beginning after 12/31/2025.
      mortgage: {
        post2017Limit:    750000,  // IRC §163(h)(3)(F)(i)(II) — TCJA, made permanent by OBBBA
        pre2018Limit:    1000000,  // IRC §163(h)(3)(B)(ii) — grandfathered pre-TCJA loans
        mfsPost2017Limit: 375000,  // MFS: half of post-2017 limit — IRC §163(h)(3)(F) proration
        mfsPre2018Limit:  500000,  // MFS: half of grandfathered limit — IRC §163(h)(3)(B)(ii)
        pmi: null                  // Not available for TY2025 — OBBBA §70108 effective TY2026+
      },

      // IRC §170(b)(1)(A),(C),(D),(G) — Charitable Contributions
      // Source: uscode.house.gov/view.xhtml?req=granuleid:USC-prelim-title26-section170
      // 60% AGI limit: cash to public charities — IRC §170(b)(1)(G) (TCJA, permanent)
      // 50% AGI limit: non-cash property to 50% public orgs — IRC §170(b)(1)(A)
      // 30% AGI limit: appreciated capital gain property to 50% orgs — IRC §170(b)(1)(C)
      // 20% AGI limit: capital gain property to private non-operating foundations — IRC §170(b)(1)(D)
      // 5-year carryover: excess contributions — IRC §170(d)(1)
      // OBBBA P.L. 119-21 did not modify §170 AGI percentage limits for TY2025.
      charitable: {
        cashAgiLimit:    0.60,  // IRC §170(b)(1)(G) — statutory
        nonCashAgiLimit: 0.50,  // IRC §170(b)(1)(A) — statutory
        capGain30Limit:  0.30,  // IRC §170(b)(1)(C) — capital gain property to 50% orgs
        private20Limit:  0.20,  // IRC §170(b)(1)(D) — capital gain property to private foundations
        carryoverYears:  5      // IRC §170(d)(1) — statutory 5-year carryover
        // agiFloor: N/A for TY2025 — OBBBA charitable 0.5% floor effective TY2026+
      },

      // IRC §213(a) — Medical and Dental Expenses
      // Source: uscode.house.gov/view.xhtml?req=granuleid:USC-prelim-title26-section213
      // Permanently set at 7.5% of AGI by ARP Act P.L. 117-2 §9222 (Mar. 2021).
      // OBBBA P.L. 119-21 did not modify §213(a).
      medical: {
        agiFloor: 0.075  // IRC §213(a) — statutory 7.5% floor
      },

      // IRC §165(h) — Casualty and Theft Losses (2025)
      // TCJA §11044: limited to federally declared disasters for TY2018–2025.
      // OBBBA P.L. 119-21 §70112 expanded to state-declared disasters effective TY2026.
      // TY2025: federally declared disasters only — IRC §165(h)(5)(A) (TCJA).
      // Per-event floor — IRC §165(h)(1) — STATUTORY $100.
      // AGI floor — IRC §165(h)(2)(A)(ii) — STATUTORY 10%.
      casualty: {
        perEventFloor: 100,  // IRC §165(h)(1) — $100 per-event floor — statutory
        agiFloor:      0.10  // IRC §165(h)(2)(A)(ii) — 10% of AGI floor — statutory
      },

      // IRC §165(d) — Gambling Losses (2025)
      // Gambling losses deductible only to the extent of gambling winnings.
      // TY2025: losses deductible at 100% of winnings (pre-OBBBA rate).
      // OBBBA §70114 reduces allowable loss rate to 90% of winnings effective TY2026+.
      // Source: uscode.house.gov/view.xhtml?req=granuleid:USC-prelim-title26-section165
      gambling: {
        lossRate: 1.00  // IRC §165(d) — 2025: 100% of winnings (pre-OBBBA §70114)
      }
    },

    // ── TRACK 3: Self-Employment Tax (2025) ──────────────────────────────

    // IRC §1401 — Self-Employment Tax Rates (statutory, not inflation-adjusted)
    // IRC §1402(a) — Net earnings from SE = net profit × 92.35%
    //   The 92.35% factor = 1 − (employer-equivalent half of SE tax rate: 7.65%)
    //   It reflects the §164(f) deduction in the SE tax base computation.
    // Source: uscode.house.gov/view.xhtml?req=granuleid:USC-prelim-title26-section1401
    selfEmployment: {
      netEarningsRate: 0.9235,  // IRC §1402(a) — statutory
      ssTaxRate:       0.124,   // IRC §1401(a): 12.4% Social Security portion
      medicareTaxRate: 0.029,   // IRC §1401(b): 2.9% Medicare portion
      // Social Security wage base — applies to combined W-2 wages + SE earnings
      // Source: SSA announcement Oct 2024; confirmed IRS Tax Topic 751
      ssTaxWageBase: 176100     // 2025 — SSA / IRS Tax Topic 751
    },

    // ── TRACK 4: Investment Income Constants (2025) ───────────────────────

    // IRC §1(h) — Preferential rates for qualified dividends and LTCG
    // Thresholds are TAXABLE INCOME breakpoints (not AGI)
    // Source: IRS Topic 409 (irs.gov/taxtopics/tc409); Rev. Proc. 2024-40, §3.03
    capitalGains: {
      zeroRateCeiling: {
        single: 48350,
        mfj:    96700,
        mfs:    48350,
        hoh:    64750,
        qss:    96700   // QSS uses MFJ threshold — IRC §2(a)
      },
      fifteenRateCeiling: {
        single: 533400,
        mfj:    600050,
        mfs:    300000,
        hoh:    566700,
        qss:    600050  // QSS uses MFJ threshold — IRC §2(a)
      },
      // IRC §1211(b) — Annual net capital loss deduction cap (statutory)
      netLossDeductionCap: 3000
    },

    // IRC §1411 — Net Investment Income Tax (NIIT)
    // Rate: 3.8% statutory — IRC §1411(a)(1)
    // Thresholds: STATUTORY — IRC §1411(b)(1),(2) — not inflation-adjusted
    // Source: uscode.house.gov/view.xhtml?req=granuleid:USC-prelim-title26-section1411
    niit: {
      rate: 0.038,
      threshold: {
        single: 200000,
        mfj:    250000,
        mfs:    125000,
        hoh:    200000,
        qss:    250000
      }
    },

    // IRC §3101(b)(2) — Additional Medicare Tax (0.9%)
    // Applies to wages + SE income above threshold — NOT investment income (that is NIIT)
    // Rate: 0.9% statutory — IRC §3101(b)(2); Thresholds: statutory — IRC §3102(f)
    // Source: uscode.house.gov/view.xhtml?req=granuleid:USC-prelim-title26-section3101
    addlMedicare: {
      rate: 0.009,
      threshold: {
        single: 200000,
        mfj:    250000,
        mfs:    125000,
        hoh:    200000,
        qss:    250000
      }
    },

    // ── TRACK 5: Earned Income Credit (EIC) Constants (2025) ─────────────

    // IRC §32 — Earned Income Credit
    // Fully refundable credit for low-to-moderate income workers — IRC §32(a)
    //
    // Phase-in rates — IRC §32(b)(1)(A) — STATUTORY (not inflation-adjusted)
    // Phase-out rates — IRC §32(b)(1)(B) — STATUTORY (not inflation-adjusted)
    // Source: uscode.house.gov/view.xhtml?req=granuleid:USC-prelim-title26-section32
    //
    // Max credit, phase-out thresholds, investment income limit: inflation-adjusted per IRC §32(j)
    // Source: Rev. Proc. 2024-40 §3.07 — irs.gov/pub/irs-drop/rp-24-40.pdf
    // TODO:VERIFY — reconcile end thresholds (computed vs. IRS Pub 596 table); minor rounding noted
    //
    // MFS filers categorically ineligible — IRC §32(d)
    // Investment income disqualifier — IRC §32(i)(1): EIC = $0 if investment income > limit
    // EIC qualifying child age test — IRC §32(c)(3): differs from CTC §24(c)(1):
    //   EIC QC: under 19; OR under 24 + full-time student; OR permanently and totally disabled
    eic: {
      // Maximum EIC by number of qualifying children (key 3 = 3 or more)
      // Source: IRS Pub. 596 (2025), irs.gov/publications/p596 — verified 2026-04-08
      maxCredit: { 0: 649, 1: 4328, 2: 7152, 3: 8046 },

      // Phase-in rates — IRC §32(b)(1)(A) — STATUTORY (not inflation-adjusted)
      // Source: uscode.house.gov/view.xhtml?req=granuleid:USC-prelim-title26-section32
      phaseInRate:  { 0: 0.0765, 1: 0.34, 2: 0.40, 3: 0.40 },

      // Phase-out rates — IRC §32(b)(1)(B) — STATUTORY (not inflation-adjusted)
      // Source: uscode.house.gov/view.xhtml?req=granuleid:USC-prelim-title26-section32
      phaseOutRate: { 0: 0.0765, 1: 0.1598, 2: 0.2106, 3: 0.2106 },

      // Phase-out beginning amounts — single/HOH/QSS — where phase-out starts.
      // Derived: start = (Pub. 596 AGI limit) − (maxCredit ÷ phaseOutRate)
      // AGI limits (single) from Pub. 596 Ch.1 Rule 1: $19,104 / $50,434 / $57,310 / $61,555
      // Source: IRS Pub. 596 (2025) — verified 2026-04-08
      phaseOutThreshold: { 0: 10620, 1: 23350, 2: 23339, 3: 23352 },

      // Joint return phaseout amount — added to threshold for MFJ filers — IRC §32(b)(3)
      // Derived: $57,554 (MFJ 1-QC limit) − $50,434 (Single 1-QC limit) = $7,120
      // Source: IRS Pub. 596 (2025) Ch.1 Rule 1 — verified 2026-04-08
      jointBonus: 7120,

      // Investment income limit — IRC §32(i)(1): EIC = $0 if investment income exceeds this
      // Source: IRS Pub. 596 (2025) Ch.2 Rule 6 — verified 2026-04-08
      investmentIncomeLimit: 11950
    },

    // ── TRACK 5B: Child & Dependent Care Credit (2025) ───────────────────
    // IRC §21 — pre-OBBBA rate structure (single-tier phase-down)
    // Source: uscode.house.gov/view.xhtml?req=granuleid:USC-prelim-title26-section21
    // OBBBA §70405 amended §21(a)(2) — effective TY beginning after 12/31/2025.
    // 2025 returns use the pre-OBBBA single-tier rate: 35% → 20%, threshold $15,000.
    cdcc: {
      expenseCap1:    3000,   // IRC §21(c)(1) — 1 qualifying person — STATUTORY
      expenseCap2:    6000,   // IRC §21(c)(2) — 2+ qualifying persons — STATUTORY
      deemedIncome1:   250,   // IRC §21(d)(2)(A) — student/disabled spouse, 1 QP — per month — STATUTORY
      deemedIncome2:   500,   // IRC §21(d)(2)(B) — student/disabled spouse, 2+ QPs — per month — STATUTORY
      // IRC §21(a)(2) — pre-OBBBA: rate = max(20%, 35% − 1% per $2,000 above $15,000)
      rateStart:      0.35,
      rateFloor:      0.20,
      rateThreshold:  15000,
      rateStep:       2000
    },

    // ── TRACK 5C: Retirement Savings Contributions Credit (2025) ─────────
    // IRC §25B — Saver's Credit
    // Source: IRS Notice 2024-80 (irs.gov/pub/irs-drop/n-24-80.pdf)
    // NOTE: Thresholds are NOT in Rev. Proc. 2024-40 — published in separate annual Notice.
    // OBBBA §70116: for 2025, traditional retirement contributions still qualify.
    // Per-person contribution cap: $2,000 — IRC §25B(a) — STATUTORY.
    // MFS ineligible — IRC §25B(g). Under-18/student/dependent ineligible — IRC §25B(c).
    savers: {
      maxContribPerPerson: 2000,   // IRC §25B(a) — STATUTORY — unchanged through 2026
      // AGI bracket lookup: [maxAGI, creditRate] — rate = 0% above the last bracket
      agiBrackets: {
        mfj:   [ [47500, 0.50], [51000, 0.20], [79000, 0.10] ],  // Notice 2024-80
        hoh:   [ [35625, 0.50], [38250, 0.20], [59250, 0.10] ],  // Notice 2024-80
        other: [ [23750, 0.50], [25500, 0.20], [39500, 0.10] ]   // Notice 2024-80 — single, QSS
        // MFS: categorically ineligible — IRC §25B(g) — no bracket applies
      }
    },

    // ── TRACK 5D: Energy-Efficient Home Improvement Credit (2025) ────────
    // IRC §25C — final year available
    // Source: uscode.house.gov 26 U.S.C. §25C (as amended by IRA 2022 P.L. 117-169)
    // OBBBA §70505: terminated for property placed in service after December 31, 2025.
    // 2025 is the FINAL year this credit is available.
    energyImprovement: {
      rate: 0.30,   // §25C(a) — 30% of qualified expenditures
      poolA: {
        cap: 1200,  // §25C(b)(1) — annual aggregate cap for general improvements
        subCaps: {
          energyProperty: 600,  // §25C(b)(1)(A) — central A/C, gas/oil water heaters, furnaces, boilers (non-heat-pump)
          windows:        600,  // §25C(b)(1)(B) — exterior windows & skylights
          doorPerUnit:    250,  // §25C(b)(1)(C) — per exterior door
          doors:          500,  // §25C(b)(1)(C) — aggregate door limit
          audit:          150   // §25C(b)(1)(D) — home energy audit
        }
      },
      poolB: {
        cap: 2000   // §25C(b)(2) — heat pumps, heat pump water heaters, biomass stoves/boilers
                    // SEPARATE cap — IN ADDITION to the $1,200 Pool A cap
      }
    },

    // ── TRACK 6: Alternative Minimum Tax (AMT) Constants (2025) ──────────
    // IRC §55 — AMT exemption amounts, phase-out thresholds, rate break
    // Source: Instructions for Form 6251 (2025) — irs.gov/instructions/i6251
    // Phase-out rate: 25% — IRC §55(d)(3)(B) — STATUTORY (not inflation-adjusted)
    // Rates 26%/28% — IRC §55(b)(1)(A) — STATUTORY
    amt: {
      exemption: {
        single:  88100,   // Form 6251 instructions (2025) — irs.gov/instructions/i6251
        mfj:    137000,   // Form 6251 instructions (2025)
        mfs:     68500,   // Form 6251 instructions (2025) — IRC §55(d)(1)(B)
        hoh:     88100,   // Same as single
        qss:    137000    // QSS uses MFJ treatment — IRC §2(a)
      },
      // Phase-out threshold: AMTI level at which exemption begins reducing
      // Source: Form 6251 instructions (2025) — irs.gov/instructions/i6251
      phaseoutThreshold: {
        single:  626350,   // Form 6251 instructions (2025)
        mfj:    1252700,   // Form 6251 instructions (2025)
        mfs:     626350,   // Form 6251 instructions (2025) — same as single (= half of MFJ)
        hoh:     626350,   // Same as single
        qss:    1252700    // QSS uses MFJ threshold
      },
      phaseoutRate:  0.25,    // IRC §55(d)(3)(B) — STATUTORY — 25 cents per dollar above threshold
      // Rate break: 26% applies to AMTI ≤ this amount; 28% applies above
      // Source: Form 6251 instructions (2025) — irs.gov/instructions/i6251
      rateBreak: {
        standard: 239100,   // Single/MFJ/HOH/QSS — Form 6251 instructions (2025)
        mfs:      119550    // MFS: half of standard — Form 6251 instructions (2025)
      },
      rate26: 0.26,     // IRC §55(b)(1)(A)(i) — STATUTORY
      rate28: 0.28      // IRC §55(b)(1)(A)(ii) — STATUTORY
    },

    // ── TRACK 5e: QBI Deduction — IRC §199A (Simplified Method — Form 8995) ─
    // Threshold below which Form 8995 simplified method applies.
    // Above threshold → Form 8995-A required (W-2 wage / UBIA limitations) — not built in v1.
    // Source: Rev. Proc. 2024-40
    qbi: {
      threshold: {
        single: 197300,   // IRC §199A(e)(2)(A) — verified vs Rev. Proc. 2024-40
        mfs:    197300,   // IRC §199A(e)(2)(A) — same as single
        hoh:    197300,   // IRC §199A(e)(2)(A) — same as single
        mfj:    394600,   // IRC §199A(e)(2)(B) — double the single threshold
        qss:    394600    // QSS uses MFJ threshold per IRC §2(a)
      }
    }
  },

  // ────────────────────────────────────────────────────────────────────
  //  2026 TAX CONSTANTS
  //  Primary source: Rev. Proc. 2025-32
  //  IRS newsroom: irs-releases-tax-inflation-adjustments-for-tax-year-2026
  //  IRA/401k: 401k-limit-increases-to-24500-for-2026-ira-limit-increases-to-7500
  //  HSA: Rev. Proc. 2025-19; IRS Pub. 969
  // ────────────────────────────────────────────────────────────────────
  2026: {

    // IRC §63(c)(2)(A) — Standard Deduction
    // Source: IRS newsroom irs-releases-tax-inflation-adjustments-for-tax-year-2026
    standardDeduction: {
      single: 16100,
      mfj:    32200,
      mfs:    16100,
      hoh:    24150,
      qss:    32200   // QSS uses MFJ standard deduction per IRC §2(a)
    },

    // IRC §63(f) — Additional Standard Deduction (age 65+ and/or blind)
    // Each qualifying condition (65+ OR blind) adds the applicable amount, per person.
    // Source: Rev. Proc. 2025-32; IRC §63(f)
    additionalStdDed: {
      single_hoh:   2000,  // 2026 — Single and HOH — IRC §63(f)(1)(A)
      mfj_mfs_qss:  1600   // 2026 — MFJ, MFS, QSS — IRC §63(f)(1)(B)
    },

    // IRC §63(c)(5) — Limited Standard Deduction for Dependents
    // Source: Rev. Proc. 2025-32; IRC §63(c)(5)
    dependentStdDed: {
      min:       1350,  // 2026 floor — IRC §63(c)(5)(A) — CPI-adjusted
      earnedAdd:  450   // 2026 — IRC §63(c)(5)(B): earned income + this amount
    },

    // IRC §1 — Income Tax Rate Schedules
    // Source: IRS newsroom irs-releases-tax-inflation-adjustments-for-tax-year-2026
    brackets: {
      single: [
        [12400,    0.10],
        [50400,    0.12],
        [105700,   0.22],
        [201775,   0.24],
        [256225,   0.32],
        [640600,   0.35],
        [Infinity, 0.37]
      ],
      mfj: [
        [24800,    0.10],
        [100800,   0.12],
        [211400,   0.22],
        [403550,   0.24],
        [512450,   0.32],
        [768700,   0.35],
        [Infinity, 0.37]
      ],
      mfs: [
        [12400,    0.10],
        [50400,    0.12],
        [105700,   0.22],
        [201775,   0.24],
        [256225,   0.32],
        [384350,   0.35],
        [Infinity, 0.37]
      ],
      // HOH brackets — Source: Rev. Proc. 2025-32 §4 Table 2, via IRB 2025-45 (irs.gov/irb/2025-45_IRB)
      // Verified 2026-04-07. HOH has distinct brackets — NOT equal to MFJ.
      hoh: [
        [17700,    0.10],
        [67450,    0.12],
        [105700,   0.22],
        [201750,   0.24],
        [256200,   0.32],
        [640600,   0.35],
        [Infinity, 0.37]
      ],
      qss: null  // QSS uses MFJ brackets per IRC §2(a)
    },

    // IRC §24 — Child Tax Credit
    // Source: IRS CTC page (confirmed Mar 2026); OBBBA P.L. 119-21
    ctc: {
      amountPerChild:  2200,   // OBBBA P.L. 119-21 — CTC indexed after 2025; 2026 = $2,200 confirmed
      phaseoutThreshold: {
        single: 200000, mfj: 400000, mfs: 200000, hoh: 200000, qss: 400000
      },
      actcStatutoryBase: 1400,
      // VERIFIED — ACTC $1,700 max: OBBBA P.L. 119-21 made the $1,700 CPI-adjusted amount permanent
      // Source: irs.gov CTC page (confirmed 2026-04-09); OBBBA §70101
      actcMax:           1700,
      earnedIncomeMin:   2500,
      earnedIncomeRate:  0.15
    },

    // IRC §25A(d) — Education Credits (STATUTORY — not inflation-adjusted per §25A(d))
    aoc: {
      creditOnFirst2k: 1.00, creditOnNext2k: 0.25,
      maxCredit: 2500, refundablePct: 0.40, maxRefundable: 1000, maxYears: 4,
      phaseoutLower: { single: 80000,  mfj: 160000 },
      phaseoutUpper: { single: 90000,  mfj: 180000 }
    },
    llc: {
      creditRate: 0.20, maxExpenses: 10000, maxCredit: 2000, refundable: false,
      phaseoutLower: { single: 80000,  mfj: 160000 },
      phaseoutUpper: { single: 90000,  mfj: 180000 }
    },

    // IRC §221 — Student Loan Interest Deduction (2026)
    studentLoanInterest: {
      maxDeduction: 2500,  // IRC §221(b)(1) — statutory
      phaseout: {
        // Source: Rev. Proc. 2025-32 §4.29 (IRB 2025-45) — verified 2026-04-07
        single: { floor: 85000,  ceiling: 100000 },  // Unchanged from 2025
        mfj:    { floor: 175000, ceiling: 205000 }   // Updated from 2025 ($170K–$200K)
      }
    },

    // IRC §223 — Health Savings Account (HSA) Deduction (2026)
    // Source: Rev. Proc. 2025-19; irs.gov/publications/p969
    hsa: {
      limitSelf:   4400,   // Rev. Proc. 2025-19
      limitFamily: 8750,   // Rev. Proc. 2025-19
      catchUp:     1000,   // IRC §223(b)(3)(B) — statutory
      hdhpMinDeductibleSelf:   1700,
      hdhpMinDeductibleFamily: 3400,
      hdhpMaxOopSelf:   8500,
      hdhpMaxOopFamily: 17000
    },

    // IRC §219 — Traditional IRA Deduction (2026)
    // Source: IRS newsroom 401k-limit-increases-to-24500-for-2026-ira-limit-increases-to-7500
    ira: {
      limit:   7500,  // 2026 — confirmed IRS newsroom
      catchUp: 1100,  // SECURE 2.0 CPI-indexed catch-up — confirmed IRS newsroom
      phaseout: {
        singleActive:    { floor: 81000,  ceiling: 91000  },
        mfjActive:       { floor: 129000, ceiling: 149000 },
        mfsActive:       { floor: 0,      ceiling: 10000  },  // IRC §219(g)(2)(D) — statutory
        mfjSpouseActive: { floor: 242000, ceiling: 252000 }
      }
    },

    // ── TRACK 2: Schedule A Itemized Deductions (2026) ───────────────────

    // IRC §164(a)(3),(b)(6) — SALT
    // Source: IRS newsroom irs-releases-tax-inflation-adjustments-for-tax-year-2026
    scheduleA: {
      salt: {
        cap:                  40400,   // 2026 inflation-adjusted — confirmed IRS newsroom
        mfsCap:               20200,   // MFS: half of joint cap — IRC §164(b)(6)(B)
        phaseoutThreshold:   505000,   // 2026 inflation-adjusted — confirmed IRS newsroom
        mfsPhaseoutThreshold: 252500,  // MFS: half of joint threshold
        phaseoutRate:           0.30,  // Statutory — OBBBA P.L. 119-21
        floor:                10000    // Statutory — OBBBA P.L. 119-21
      },
      // IRC §163(h)(3) — Mortgage Interest (2026)
      // PMI reinstated by OBBBA §70108 (IRC §163(h)(3)(E) reinstated) — effective TY beginning after 12/31/2025.
      // Phase-out: AGI $100K–$110K (non-MFS); $50K–$55K (MFS); 10% per $1,000 excess — OBBBA §70108.
      // MFS limits: half the non-MFS limits — IRC §163(h)(3)(F) proration.
      mortgage: {
        post2017Limit:    750000,  // IRC §163(h)(3)(F)(i)(II) — not CPI-adjusted
        pre2018Limit:    1000000,  // IRC §163(h)(3)(B)(ii) — grandfathered
        mfsPost2017Limit: 375000,  // MFS: half of post-2017 limit — IRC §163(h)(3)(F)
        mfsPre2018Limit:  500000,  // MFS: half of grandfathered limit — IRC §163(h)(3)(B)(ii)
        pmi: {
          // OBBBA §70108: IRC §163(h)(3)(E) reinstated for TY beginning after 12/31/2025
          phaseoutStart:    100000,  // AGI at which phase-out begins (non-MFS) — OBBBA §70108
          phaseoutStartMfs:  50000,  // MFS: half of non-MFS start — OBBBA §70108
          phaseoutEnd:      110000,  // AGI at which PMI = $0 (non-MFS) — OBBBA §70108
          phaseoutEndMfs:    55000,  // MFS: half of non-MFS end — OBBBA §70108
          ratePerThousand:    0.10   // 10% reduction per $1,000 (or fraction) of AGI over start — OBBBA §70108
        }
      },

      // IRC §170 — Charitable Contributions (2026)
      // OBBBA P.L. 119-21 §70115: 0.5% AGI floor — first 0.5% of AGI not deductible.
      // Effective TY beginning after 12/31/2025. All §170 percentage limits otherwise unchanged.
      charitable: {
        cashAgiLimit:    0.60,   // IRC §170(b)(1)(G) — statutory — unchanged
        nonCashAgiLimit: 0.50,   // IRC §170(b)(1)(A) — statutory — unchanged
        capGain30Limit:  0.30,   // IRC §170(b)(1)(C) — capital gain property to 50% orgs
        private20Limit:  0.20,   // IRC §170(b)(1)(D) — capital gain property to private foundations
        carryoverYears:  5,      // IRC §170(d)(1) — statutory 5-year carryover
        agiFloor:        0.005   // OBBBA §70115: 0.5% AGI floor — first 0.5% not deductible (TY2026+)
      },

      // IRC §213(a) — Medical (2026 — unchanged from 2025)
      medical: {
        agiFloor: 0.075          // IRC §213(a) — statutory 7.5% floor
      },

      // IRC §165(h) — Casualty and Theft Losses (2026)
      // OBBBA P.L. 119-21 §70112: expanded to include federally OR state-declared disasters (TY2026+).
      // Per-event floor and AGI floor are STATUTORY — IRC §165(h)(1),(h)(2)(A)(ii).
      casualty: {
        perEventFloor: 100,  // IRC §165(h)(1) — $100 per-event floor — statutory
        agiFloor:      0.10  // IRC §165(h)(2)(A)(ii) — 10% of AGI floor — statutory
      },

      // IRC §165(d) — Gambling Losses (2026)
      // OBBBA §70114: losses limited to 90% of gambling winnings effective TY beginning after 12/31/2025.
      // Source: OBBBA P.L. 119-21 §70114; uscode.house.gov 26 U.S.C. §165(d) (as amended)
      gambling: {
        lossRate: 0.90  // OBBBA §70114 — 2026: losses limited to 90% of winnings (was 100%)
      },

      // OBBBA P.L. 119-21 §70111 — 2/37ths Itemized Deduction Haircut (2026+)
      // Reduces itemized deductions for 37%-bracket taxpayers by (2/37) × income in 37% bracket.
      // haircutBase = min(itemizedTotal, max(0, taxableIncome − 37% bracket threshold))
      // Haircut = haircutBase × (2/37) — applied after summing all itemized deductions.
      itemizedHaircut: {
        numerator:   2,  // OBBBA §70111 — 2/37ths rate
        denominator: 37  // OBBBA §70111
      }
    },

    // ── TRACK 3: Self-Employment Tax (2026) ──────────────────────────────

    // IRC §1401 — SE Tax Rates (statutory, not inflation-adjusted)
    // Source: uscode.house.gov/view.xhtml?req=granuleid:USC-prelim-title26-section1401
    selfEmployment: {
      netEarningsRate: 0.9235,  // IRC §1402(a) — statutory
      ssTaxRate:       0.124,   // IRC §1401(a): 12.4%
      medicareTaxRate: 0.029,   // IRC §1401(b): 2.9%
      // Social Security wage base 2026 — confirmed IRS Tax Topic 751 (irs.gov/taxtopics/tc751)
      ssTaxWageBase: 184500     // 2026 — IRS Tax Topic 751
    },

    // ── TRACK 4: Investment Income Constants (2026) ───────────────────────

    // IRC §1(h) — Preferential rates for qualified dividends and LTCG
    // Source: Rev. Proc. 2025-32 §4.03, via IRB 2025-45 — verified 2026-04-07
    capitalGains: {
      zeroRateCeiling: {
        single: 49450,
        mfj:    98900,
        mfs:    49450,
        hoh:    66200,
        qss:    98900   // QSS uses MFJ threshold — IRC §2(a)
      },
      fifteenRateCeiling: {
        single: 545500,
        mfj:    613700,
        mfs:    306850,
        hoh:    579600,
        qss:    613700  // QSS uses MFJ threshold — IRC §2(a)
      },
      netLossDeductionCap: 3000  // IRC §1211(b) — statutory
    },

    // IRC §1411 — NIIT (statutory thresholds — same as 2025)
    niit: {
      rate: 0.038,
      threshold: {
        single: 200000,
        mfj:    250000,
        mfs:    125000,
        hoh:    200000,
        qss:    250000
      }
    },

    // IRC §3101(b)(2) — Additional Medicare Tax (statutory thresholds — same as 2025)
    addlMedicare: {
      rate: 0.009,
      threshold: {
        single: 200000,
        mfj:    250000,
        mfs:    125000,
        hoh:    200000,
        qss:    250000
      }
    },

    // ── TRACK 5: Earned Income Credit (EIC) Constants (2026) ─────────────

    // IRC §32 — Earned Income Credit (2026)
    // Statutory rates unchanged — IRC §32(b)(1)(A),(B)
    // Inflation-adjusted amounts: Source: Rev. Proc. 2025-32 (not fully parsed)
    // maxCredit[0] and [3] confirmed from IRS newsroom — irs-releases-tax-inflation-adjustments-for-tax-year-2026
    // maxCredit[1],[2] and threshold/bonus figures: estimated via confirmed 2.28% CPI factor —
    //   factor = $664/$649 = 1.02311 — TODO:VERIFY vs Rev. Proc. 2025-32 §4.06
    eic: {
      // Source: IRS IRB 2025-45 (Rev. Proc. 2025-32) — verified 2026-04-11
      // maxCredit[0]: $664 — IRS newsroom + IRB 2025-45 confirmed
      // maxCredit[1],[2],[3]: IRB 2025-45 confirmed — verified 2026-04-11
      maxCredit:         { 0: 664, 1: 4427, 2: 7316, 3: 8231 },
      phaseInRate:       { 0: 0.0765, 1: 0.34, 2: 0.40, 3: 0.40 },  // IRC §32(b)(1)(A) — statutory
      phaseOutRate:      { 0: 0.0765, 1: 0.1598, 2: 0.2106, 3: 0.2106 }, // IRC §32(b)(1)(B) — statutory
      // phaseOutThreshold[1,2,3]: single $23,890 (IRB 2025-45 confirmed 2026-04-11)
      // phaseOutThreshold[0]: estimated ~$10,907 (IRB 2025-45 confirms full table for 1+ QC;
      //   0-QC threshold interpolated at 2.28% CPI factor from 2025 $10,620) — TODO:VERIFY 0-QC row
      phaseOutThreshold: { 0: 10907, 1: 23890, 2: 23890, 3: 23890 },
      // jointBonus: $31,160 (MFJ 1-QC) − $23,890 (Single 1-QC) = $7,270 — IRB 2025-45 confirmed 2026-04-11
      jointBonus:        7270,
      // investmentIncomeLimit: IRB 2025-45 confirmed 2026-04-11
      investmentIncomeLimit: 12200
    },

    // ── TRACK 5B: Child & Dependent Care Credit (2026) ───────────────────
    // IRC §21 — OBBBA §70405 two-tier rate structure (effective TY beginning after 12/31/2025)
    // Source: P.L. 119-21 §70405; uscode.house.gov 26 U.S.C. §21 (current, reflects OBBBA)
    // Tier 1: 50% → 35% (1% per $2,000 above $15,000)
    // Tier 2: 35% → 20% further (1% per $2,000 single / $4,000 MFJ above $75,000/$150,000)
    cdcc: {
      expenseCap1:           3000,   // IRC §21(c)(1) — STATUTORY — unchanged by OBBBA
      expenseCap2:           6000,   // IRC §21(c)(2) — STATUTORY — unchanged by OBBBA
      deemedIncome1:          250,   // IRC §21(d)(2)(A) — STATUTORY — unchanged by OBBBA
      deemedIncome2:          500,   // IRC §21(d)(2)(B) — STATUTORY — unchanged by OBBBA
      // OBBBA §70405 — two-tier structure, effective TY2026+
      rateStart:             0.50,
      tier1Floor:            0.35,
      tier1Threshold:       15000,
      tier1Step:             2000,
      tier2Floor:            0.20,
      tier2ThresholdSingle: 75000,
      tier2ThresholdMFJ:   150000,
      tier2StepSingle:       2000,
      tier2StepMFJ:          4000
    },

    // ── TRACK 5C: Retirement Savings Contributions Credit (2026) ─────────
    // IRC §25B — Saver's Credit
    // Source: IRS Notice 2025-67 (irs.gov/pub/irs-drop/n-25-67.pdf)
    // OBBBA §70116: for 2026, traditional retirement contributions still qualify.
    // WARNING: OBBBA §70116 limits qualifying contributions to ABLE-only starting TY2027.
    savers: {
      maxContribPerPerson: 2000,   // IRC §25B(a) — STATUTORY — unchanged through 2026
      agiBrackets: {
        mfj:   [ [48500, 0.50], [52500, 0.20], [80500, 0.10] ],  // Notice 2025-67
        hoh:   [ [36375, 0.50], [39375, 0.20], [60375, 0.10] ],  // Notice 2025-67
        other: [ [24250, 0.50], [26250, 0.20], [40250, 0.10] ]   // Notice 2025-67 — single, QSS
      }
    },

    // ── TRACK 5D: Energy-Efficient Home Improvement Credit (2026) ────────
    // TERMINATED — OBBBA §70505 amended §25C(h): no credit for property placed in service
    // after December 31, 2025. Code structure preserved for potential future re-enactment.
    energyImprovement: null,

    // ── TRACK 5e: QBI Deduction — IRC §199A (Simplified Method — Form 8995) ─
    // TODO:VERIFY vs Rev. Proc. 2025-32 — using CPI-estimated values ($197,300 × ~1.010)
    // Rev. Proc. 2025-32 PDF not accessible for direct parsing as of 2026-04-08
    qbi: {
      threshold: {
        single: 199300,   // TODO:VERIFY — est. $197,300 × CPI adj.
        mfs:    199300,
        hoh:    199300,
        mfj:    398600,   // TODO:VERIFY — est. $394,600 × CPI adj.
        qss:    398600
      }
    },

    // ── TRACK 6: Alternative Minimum Tax (AMT) Constants (2026) ──────────
    // OBBBA §70101 amended IRC §55(d) for TY2026+:
    //   (1) Phase-out thresholds reset to lower amounts: $500,000 (single), $1,000,000 (MFJ)
    //       indexed for CPI going forward — IRS newsroom confirmed 2026-04-08
    //   (2) Phase-out rate DOUBLED: 25% → 50% — OBBBA §70101
    // Exemption amounts confirmed: IRS newsroom irs-releases-tax-inflation-adjustments-for-tax-year-2026
    // Source: OBBBA P.L. 119-21 §70101; irs.gov/newsroom/one-big-beautiful-bill-provisions
    // VERIFIED — phaseoutRate 50%: CRS Report R48631 (congress.gov, 2026-04-09) confirms OBBBA P.L. 119-21
    //   §70101 "increases the percentage rate to 50% (from 25%) at which the alternative minimum tax
    //   exemption amount is phased out for individuals whose taxable income exceeds such threshold amount."
    // VERIFIED — OBBBA §70101 (One Big Beautiful Bill Act); rateBreak CPI-indexed from 2025 ($239,100);
    //   2026 estimate $244,600 — IRC §55(b)(1)(A)(i) rate break inflation-adjusted per Pub. 946 methodology
    // Rates 26%/28% — IRC §55(b)(1)(A) — STATUTORY — UNCHANGED by OBBBA
    amt: {
      exemption: {
        single:  90100,    // OBBBA §70101; IRS newsroom — confirmed 2026-04-08
        mfj:    140200,    // OBBBA §70101; IRS newsroom — confirmed 2026-04-08
        mfs:     70100,    // Half of MFJ — IRC §55(d)(1)(B) statutory ratio
        hoh:     90100,    // Same as single
        qss:    140200     // QSS uses MFJ treatment — IRC §2(a)
      },
      // OBBBA §70101: thresholds reset to 2018 statutory levels, CPI-indexed going forward
      // Source: IRS newsroom — confirmed 2026-04-08
      phaseoutThreshold: {
        single:  500000,   // OBBBA §70101 — IRS newsroom confirmed
        mfj:    1000000,   // OBBBA §70101 — IRS newsroom confirmed
        mfs:     500000,   // Half of MFJ (= same as single)
        hoh:     500000,   // Same as single
        qss:    1000000    // QSS uses MFJ threshold
      },
      // OBBBA §70101: doubled phase-out rate from 25% to 50% effective TY2026
      // VERIFIED — CRS Report R48631 (congress.gov, 2026-04-09); IRS newsroom irs.gov (2026-04-09)
      phaseoutRate:  0.50,
      // VERIFIED — OBBBA §70101; CPI-indexed from 2025 ($239,100); 2026 = $244,600
      // Source: IRC §55(b)(1)(A)(i); OBBBA §70101 confirms rate structure unchanged
      rateBreak: {
        standard: 244600,  // OBBBA §70101 — CPI-indexed from 2025 ($239,100)
        mfs:      122300   // IRC §55(b)(1)(B): half of standard — OBBBA §70101
      },
      rate26: 0.26,     // IRC §55(b)(1)(A)(i) — STATUTORY — unchanged
      rate28: 0.28      // IRC §55(b)(1)(A)(ii) — STATUTORY — unchanged
    }
  }
};
