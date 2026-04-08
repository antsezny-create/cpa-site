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
      // IRC §24(a): $2,200 per qualifying child — OBBBA P.L. 119-21 (increased from $2,000)
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
      // Source: Rev. Proc. 2024-40; irs.gov/credits-deductions/individuals/child-tax-credit
      // TODO: VERIFY — Rev. Proc. 2025-32 could not be parsed (PDF binary).
      //   $1,700 confirmed via irs.gov CTC page. Cross-check Rev. Proc. 2025-32 when accessible.
      actcStatutoryBase: 1400,
      actcMax:           1700,  // 2025 inflation-adjusted per Rev. Proc. 2024-40
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
      mortgage: {
        post2017Limit: 750000,   // IRC §163(h)(3)(F)(i)(II) — TCJA, made permanent by OBBBA
        pre2018Limit:  1000000   // IRC §163(h)(3)(B)(ii) — grandfathered pre-TCJA loans
      },

      // IRC §170(b)(1)(A),(G) — Charitable Contributions
      // Source: uscode.house.gov/view.xhtml?req=granuleid:USC-prelim-title26-section170
      // 60% AGI limit for cash donations to public charities — IRC §170(b)(1)(G) (TCJA, permanent)
      // 50% AGI limit for non-cash property to public charities — IRC §170(b)(1)(A)
      // OBBBA P.L. 119-21 did not modify §170 AGI percentage limits.
      charitable: {
        cashAgiLimit:    0.60,  // IRC §170(b)(1)(G) — statutory
        nonCashAgiLimit: 0.50   // IRC §170(b)(1)(A) — statutory
      },

      // IRC §213(a) — Medical and Dental Expenses
      // Source: uscode.house.gov/view.xhtml?req=granuleid:USC-prelim-title26-section213
      // Permanently set at 7.5% of AGI by ARP Act P.L. 117-2 §9222 (Mar. 2021).
      // OBBBA P.L. 119-21 did not modify §213(a).
      medical: {
        agiFloor: 0.075  // IRC §213(a) — statutory 7.5% floor
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
      // TODO: VERIFY — ACTC $1,700 max carried from 2025; Rev. Proc. 2025-32 not parsed
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
      mortgage: {
        post2017Limit: 750000,   // IRC §163(h)(3)(F)(i)(II) — not CPI-adjusted
        pre2018Limit:  1000000   // IRC §163(h)(3)(B)(ii) — grandfathered
      },
      charitable: {
        cashAgiLimit:    0.60,   // IRC §170(b)(1)(G) — statutory
        nonCashAgiLimit: 0.50    // IRC §170(b)(1)(A) — statutory
      },
      medical: {
        agiFloor: 0.075          // IRC §213(a) — statutory
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
    }
  }
};


// ──────────────────────────────────────────────────────────────────────
//  MODULE STATE
// ──────────────────────────────────────────────────────────────────────

let teReturns        = [];
let teActiveYear     = 2026;
let teCurrentReturn  = null;
let teActiveSection  = 'personal';
let teNotesPanelOpen = false;
let teDirty          = false;  // true when return has unsaved changes

function teEmptyReturn(clientId, clientName, taxYear) {
  return {
    id:           null,
    clientId:     clientId,
    clientName:   clientName,
    taxYear:      taxYear || teActiveYear,
    returnType:   '1040',
    status:       'not_started',
    filingStatus: 'single',
    taxpayer:     { firstName: '', lastName: '', ssnLast4: '', dob: '' },
    spouse:       { firstName: '', lastName: '', ssnLast4: '', dob: '' },
    dependents:   [],
    w2:           [],
    deductionType: 'standard',
    educationStudents: [],
    scheduleC: {
      netProfit: ''             // IRC §162 — Schedule C net profit (gross receipts minus expenses)
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
      qualifiedDividends:''    // 1099-DIV Box 1b — IRC §1(h)(11); must be ≤ ordinaryDividends
    },
    scheduleD: {
      netSTCG:              '', // Net short-term capital gain/(loss) — IRC §1222(5),(6)
      netLTCG:              '', // Net long-term capital gain/(loss) — IRC §1222(7),(8)
      priorYearCarryforward:''  // Prior year capital loss carryforward — IRC §1212(b)
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
    annotations:  [],
    completedSections: []
  };
}


// ──────────────────────────────────────────────────────────────────────
//  INIT / RETURN CENTER
// ──────────────────────────────────────────────────────────────────────

// ── Dirty-state helpers ──────────────────────────────────────────────
// teMarkDirty(): called on every field change. Sets flag and updates Save button.
function teMarkDirty() {
  if (teDirty) return;
  teDirty = true;
  let btn = document.getElementById('te-save-btn');
  if (btn) { btn.textContent = 'Save ●'; }
}

// teClearDirty(): called on successful save or confirmed discard.
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


// ──────────────────────────────────────────────────────────────────────
//  NEW RETURN MODAL
// ──────────────────────────────────────────────────────────────────────

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


// ──────────────────────────────────────────────────────────────────────
//  OPEN / CLOSE ENGINE
// ──────────────────────────────────────────────────────────────────────

function teOpenReturn(returnId) {
  db.collection('taxReturns').doc(returnId).get().then(doc => {
    if (!doc.exists) { toast('Return not found.', 'error'); return; }
    let data = doc.data(); data.id = doc.id;
    teCurrentReturn = teDeserialize(data);
    teClearDirty();  // fresh load = clean baseline
    teShowEngine();
    teUpdateBreadcrumb();
    teSwitchSection('personal');
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
      onConfirm: () => { teSaveReturn(); teClearDirty(); teDoBackToCenter(); },
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


// ──────────────────────────────────────────────────────────────────────
//  SECTION NAVIGATION
// ──────────────────────────────────────────────────────────────────────

function teSwitchSection(section) {
  teActiveSection = section;
  document.querySelectorAll('.te-sec-btn:not(.te-sec-stub)').forEach(b => b.classList.remove('active'));
  let btn = document.getElementById('te-sec-btn-' + section);
  if (btn) btn.classList.add('active');

  let body = document.getElementById('te-interview-body');
  if (!body) return;

  if (section === 'personal') {
    body.innerHTML = teRenderPersonal();
    teRenderDepsList();
  } else if (section === 'income') {
    body.innerHTML = teRenderIncome();
    teRenderW2List();
    teRenderScheduleEList();
  } else if (section === 'deductions') {
    body.innerHTML = teRenderDeductions();
  } else if (section === 'credits') {
    body.innerHTML = teRenderCredits();
    teRenderCTCDetail();
    teRenderEduList();
  } else if (section === 'payments') {
    body.innerHTML = teRenderPayments();
  }

  if (teNotesPanelOpen) {
    let lbl = document.getElementById('te-notes-sec-lbl');
    if (lbl) lbl.textContent = 'Section: ' + section.charAt(0).toUpperCase() + section.slice(1);
    teRenderNotesHistory();
  }
}


// ──────────────────────────────────────────────────────────────────────
//  PERSONAL SECTION
// ──────────────────────────────────────────────────────────────────────

function teRenderPersonal() {
  let r  = teCurrentReturn;
  let fs = r.filingStatus || 'single';
  let tp = r.taxpayer || {};
  let sp = r.spouse   || {};
  let showSpouse = (fs === 'mfj' || fs === 'mfs');

  return `
    <div class="te-sec-hdr"><h2>Personal Information</h2>
    <p class="te-sec-sub">Filing status and taxpayer identification &mdash; <span class="te-cite">IRC §2, §7703, §152</span></p></div>

    <div class="te-field-group" style="margin-bottom:18px;">
      <label class="te-lbl">Filing Status <span class="te-cite">IRC §2</span></label>
      <select id="te-fs" class="te-select" onchange="teOnFSChange(this.value)">
        <option value="single" ${fs==='single'?'selected':''}>Single</option>
        <option value="mfj"    ${fs==='mfj'   ?'selected':''}>Married Filing Jointly (MFJ)</option>
        <option value="mfs"    ${fs==='mfs'   ?'selected':''}>Married Filing Separately (MFS)</option>
        <option value="hoh"    ${fs==='hoh'   ?'selected':''}>Head of Household (HOH)</option>
        <option value="qss"    ${fs==='qss'   ?'selected':''}>Qualifying Surviving Spouse (QSS)</option>
      </select>
    </div>

    <div class="te-subsec-lbl" style="margin-bottom:10px;">Taxpayer</div>
    <div class="te-frow">
      <div class="te-field-group">
        <label class="te-lbl">First Name</label>
        <input type="text" id="te-tp-fn" class="te-input" value="${esc(tp.firstName||'')}" oninput="teOnField()">
      </div>
      <div class="te-field-group">
        <label class="te-lbl">Last Name</label>
        <input type="text" id="te-tp-ln" class="te-input" value="${esc(tp.lastName||'')}" oninput="teOnField()">
      </div>
      <div class="te-field-group te-narrow">
        <label class="te-lbl">SSN (Last 4)</label>
        <input type="text" id="te-tp-ssn" class="te-input" value="${esc(tp.ssnLast4||'')}" maxlength="4" placeholder="XXXX" oninput="teOnField()">
      </div>
      <div class="te-field-group">
        <label class="te-lbl">Date of Birth</label>
        <input type="date" id="te-tp-dob" class="te-input" value="${esc(tp.dob||'')}" onchange="teOnField()">
      </div>
    </div>

    <div id="te-spouse-sec" style="display:${showSpouse?'block':'none'};">
      <div class="te-subsec-lbl" style="margin-top:20px;margin-bottom:10px;">Spouse</div>
      <div class="te-frow">
        <div class="te-field-group">
          <label class="te-lbl">First Name</label>
          <input type="text" id="te-sp-fn" class="te-input" value="${esc(sp.firstName||'')}" oninput="teOnField()">
        </div>
        <div class="te-field-group">
          <label class="te-lbl">Last Name</label>
          <input type="text" id="te-sp-ln" class="te-input" value="${esc(sp.lastName||'')}" oninput="teOnField()">
        </div>
        <div class="te-field-group te-narrow">
          <label class="te-lbl">SSN (Last 4)</label>
          <input type="text" id="te-sp-ssn" class="te-input" value="${esc(sp.ssnLast4||'')}" maxlength="4" placeholder="XXXX" oninput="teOnField()">
        </div>
        <div class="te-field-group">
          <label class="te-lbl">Date of Birth</label>
          <input type="date" id="te-sp-dob" class="te-input" value="${esc(sp.dob||'')}" onchange="teOnField()">
        </div>
      </div>
    </div>

    <div class="te-subsec" style="margin-top:28px;">
      <div class="te-subsec-row">
        <div><div class="te-subsec-lbl">Dependents <span class="te-cite">IRC §152</span></div></div>
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
  teCurrentReturn.taxpayer.firstName = g('te-tp-fn');
  teCurrentReturn.taxpayer.lastName  = g('te-tp-ln');
  teCurrentReturn.taxpayer.ssnLast4  = g('te-tp-ssn');
  teCurrentReturn.taxpayer.dob       = g('te-tp-dob');
  teCurrentReturn.spouse.firstName   = g('te-sp-fn');
  teCurrentReturn.spouse.lastName    = g('te-sp-ln');
  teCurrentReturn.spouse.ssnLast4    = g('te-sp-ssn');
  teCurrentReturn.spouse.dob         = g('te-sp-dob');
  teRecalculate();
}

function teRenderDepsList() {
  let c = document.getElementById('te-deps-list');
  if (!c) return;
  let deps = teCurrentReturn.dependents || [];
  if (deps.length === 0) {
    c.innerHTML = '<div class="te-empty">No dependents added.</div>';
    return;
  }
  c.innerHTML = `
    <div class="te-dep-tbl">
      <div class="te-dep-hdr">
        <span>First Name</span><span>Last Name</span><span>Date of Birth</span>
        <span>Relationship</span><span>Qualifying Child?</span><span></span>
      </div>
      ${deps.map((d, i) => `
        <div class="te-dep-row">
          <input type="text" class="te-input te-dep-in" value="${esc(d.firstName||'')}" placeholder="First" oninput="teUpdDep(${i},'firstName',this.value)">
          <input type="text" class="te-input te-dep-in" value="${esc(d.lastName||'')}"  placeholder="Last"  oninput="teUpdDep(${i},'lastName',this.value)">
          <input type="date" class="te-input te-dep-in" value="${esc(d.dob||'')}" onchange="teUpdDep(${i},'dob',this.value)">
          <select class="te-select te-dep-in" onchange="teUpdDep(${i},'relationship',this.value)">
            <option value="child"     ${d.relationship==='child'    ?'selected':''}>Child</option>
            <option value="stepchild" ${d.relationship==='stepchild'?'selected':''}>Stepchild</option>
            <option value="sibling"   ${d.relationship==='sibling'  ?'selected':''}>Sibling</option>
            <option value="parent"    ${d.relationship==='parent'   ?'selected':''}>Parent</option>
            <option value="other"     ${d.relationship==='other'    ?'selected':''}>Other Relative</option>
          </select>
          <div class="te-qc-cell">
            <input type="checkbox" id="te-qc-${i}" ${d.isQualifyingChild?'checked':''} onchange="teUpdDep(${i},'isQualifyingChild',this.checked)">
            <label for="te-qc-${i}" style="font-size:11px;">
              ${d.dob ? (teIsUnder17(d.dob, teCurrentReturn.taxYear) ? '<span style="color:var(--green)">Under 17 ✓</span>' : '<span style="color:var(--orange)">Age 17+</span>') : ''}
            </label>
          </div>
          <button class="te-rm-btn" onclick="teRmDep(${i})">✕</button>
        </div>`).join('')}
    </div>`;
}

function teAddDep() {
  teMarkDirty();
  teCurrentReturn.dependents.push({ firstName: '', lastName: '', dob: '', relationship: 'child', isQualifyingChild: true });
  teRenderDepsList();
  teRecalculate();
}

function teUpdDep(i, field, val) {
  if (!teCurrentReturn.dependents[i]) return;
  teMarkDirty();
  teCurrentReturn.dependents[i][field] = val;
  if (field === 'dob') teRenderDepsList();
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
      <div class="te-total-bar" id="te-w2-total-bar" style="display:none;">
        <span>Total W-2 Wages <span class="te-cite">IRC §61(a)(1)</span></span>
        <span class="te-total-val" id="te-w2-total-val">$0</span>
      </div>
    </div>

    <div class="te-subsec" style="margin-top:20px;">
      <div class="te-subsec-lbl">Schedule C — Self-Employment Income <span class="te-cite">IRC §162, §61(a)(2)</span></div>
      <div class="te-subsec-desc">Net profit from self-employment (gross receipts minus business expenses). Loss entries reduce gross income and SE tax base.</div>
      ${teRenderScheduleC()}
    </div>

    <div class="te-subsec" style="margin-top:20px;">
      <div class="te-subsec-lbl">1099-INT &amp; 1099-DIV — Interest &amp; Dividend Income <span class="te-cite">IRC §61(a)(4),(7)</span></div>
      <div class="te-subsec-desc">Interest income (1099-INT) and dividends (1099-DIV). Qualified dividends receive preferential 0%/15%/20% rates. <span class="te-cite">IRC §1(h)(11)</span></div>
      ${teRender1099()}
    </div>

    <div class="te-subsec" style="margin-top:20px;">
      <div class="te-subsec-lbl">Schedule D — Capital Gains &amp; Losses <span class="te-cite">IRC §1221, §1222</span></div>
      <div class="te-subsec-desc">Enter net figures by holding period. Long-term gains (held &gt;1 year) taxed at preferential rates. Net losses deductible up to $3,000/year; excess carries forward. <span class="te-cite">IRC §1211(b), §1212(b)</span></div>
      ${teRenderScheduleD()}
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

    <div class="te-stub-sec" style="margin-top:8px;">
      <div class="te-stub-blk"><span class="te-stub-title">Other Income (Alimony Received, Prizes, Gambling, etc.) <span class="te-cite">IRC §61(a)</span></span><span class="te-stub-pill">Track 5</span></div>
    </div>`;
}

function teRenderW2List() {
  let c   = document.getElementById('te-w2-list');
  let bar = document.getElementById('te-w2-total-bar');
  if (!c) return;
  let w2s = teCurrentReturn.w2 || [];
  if (w2s.length === 0) {
    c.innerHTML = '<div class="te-empty">No W-2s added. Click "+ Add W-2" to add wages.</div>';
    if (bar) bar.style.display = 'none';
    return;
  }
  if (bar) bar.style.display = 'flex';
  c.innerHTML = `
    <div class="te-w2-tbl">
      <div class="te-w2-hdr">
        <span>Employer Name</span><span>Box 1: Wages</span><span>Box 2: Fed. Withheld</span><span></span>
      </div>
      ${w2s.map((w, i) => `
        <div class="te-w2-row">
          <input type="text"   class="te-input"          value="${esc(w.employer||'')}"       placeholder="Employer name" oninput="teUpdW2(${i},'employer',this.value)">
          <input type="number" class="te-input te-mono"  value="${w.wages||''}"               placeholder="0.00" step="0.01" min="0" oninput="teUpdW2(${i},'wages',this.value)">
          <input type="number" class="te-input te-mono"  value="${w.federalWithheld||''}"     placeholder="0.00" step="0.01" min="0" oninput="teUpdW2(${i},'federalWithheld',this.value)">
          <button class="te-rm-btn" onclick="teRmW2(${i})">✕</button>
        </div>`).join('')}
    </div>`;
  let tot = w2s.reduce((s, w) => s + (parseFloat(w.wages)||0), 0);
  let tv  = document.getElementById('te-w2-total-val');
  if (tv) tv.textContent = teFmt(tot);
}

function teAddW2() {
  teMarkDirty();
  teCurrentReturn.w2.push({ employer: '', wages: '', federalWithheld: '' });
  teRenderW2List();
  teRecalculate();
}

function teUpdW2(i, field, val) {
  if (!teCurrentReturn.w2[i]) return;
  teMarkDirty();
  teCurrentReturn.w2[i][field] = val;
  if (field === 'wages') {
    let tot = teCurrentReturn.w2.reduce((s, w) => s + (parseFloat(w.wages)||0), 0);
    let tv  = document.getElementById('te-w2-total-val');
    if (tv) tv.textContent = teFmt(tot);
  }
  teRecalculate();
}

function teRmW2(i) {
  teMarkDirty();
  teCurrentReturn.w2.splice(i, 1);
  teRenderW2List();
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
    <div class="te-ded-note" style="margin-top:4px;">Qualified dividends must not exceed ordinary dividends (Box 1b ≤ Box 1a). The engine enforces this automatically. <span class="te-cite">IRC §1(h)(11)(B)</span></div>`;
}

function teRenderScheduleD() {
  let r    = teCurrentReturn;
  let sd   = (r && r.scheduleD) || {};
  let calc = (r && r._calc)     || {};
  let hasD = calc.scheduleDCombined !== 0 || calc.netSTCG !== 0 || calc.netLTCG !== 0;
  let isLoss  = calc.scheduleDCombined < 0;
  let isGain  = calc.scheduleDCombined > 0;
  return `
    <div class="te-frow" style="align-items:flex-end;gap:12px;flex-wrap:wrap;margin-top:8px;">
      <div class="te-field-group" style="max-width:200px;">
        <label class="te-lbl">Net Short-Term Gain / (Loss) <span class="te-cite">IRC §1222(5),(6)</span></label>
        <input type="number" id="te-sd-stcg" class="te-input te-mono"
          value="${esc(String(sd.netSTCG||''))}" placeholder="0.00" step="0.01"
          oninput="teOnScheduleD()">
      </div>
      <div class="te-field-group" style="max-width:200px;">
        <label class="te-lbl">Net Long-Term Gain / (Loss) <span class="te-cite">IRC §1222(7),(8)</span></label>
        <input type="number" id="te-sd-ltcg" class="te-input te-mono"
          value="${esc(String(sd.netLTCG||''))}" placeholder="0.00" step="0.01"
          oninput="teOnScheduleD()">
      </div>
      <div class="te-field-group" style="max-width:200px;">
        <label class="te-lbl">Prior Year Loss Carryforward <span class="te-cite">IRC §1212(b)</span></label>
        <input type="number" id="te-sd-cf" class="te-input te-mono"
          value="${esc(String(sd.priorYearCarryforward||''))}" placeholder="0.00" step="0.01" min="0"
          oninput="teOnScheduleD()">
      </div>
    </div>
    ${hasD ? `
    <div class="te-ded-note" style="margin-top:6px;">
      Combined net: <strong>${calc.scheduleDCombined >= 0 ? teFmt(calc.scheduleDCombined) : '(' + teFmt(Math.abs(calc.scheduleDCombined)) + ')'}</strong>
      ${isGain ? ' — gain flows to gross income; LTCG portion of ' + teFmt(Math.max(0, calc.netLTCG - calc.priorCapLossCF)) + ' taxed at preferential rates.' : ''}
      ${isLoss ? ' — deductible loss capped at ($3,000); carryforward to next year: ' + teFmt(calc.capLossCarryforward) + '. <span class="te-cite">IRC §1211(b)</span>' : ''}
    </div>` : ''}
    <div class="te-ded-note" style="margin-top:4px;">Enter net after netting all transactions by holding period. Enter losses as negative numbers. Short-term = held ≤ 1 year (ordinary rates). Long-term = held &gt; 1 year (preferential rates). <span class="te-cite">IRC §1222</span></div>`;
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
  c.innerHTML = `
    <div class="te-w2-tbl" style="margin-top:8px;">
      <div class="te-w2-hdr">
        <span>Entity Name</span><span>EIN (optional)</span><span>Income / (Loss)</span><span>Passive?</span><span></span>
      </div>
      ${entities.map((e, i) => `
        <div class="te-w2-row">
          <input type="text"   class="te-input" value="${esc(e.name||'')}"        placeholder="Partner / S-Corp name"  oninput="teOnScheduleE(${i},'name',this.value)">
          <input type="text"   class="te-input" value="${esc(e.ein||'')}"         placeholder="XX-XXXXXXX"             oninput="teOnScheduleE(${i},'ein',this.value)" style="max-width:130px;">
          <input type="number" class="te-input te-mono" value="${e.incomeAmount||''}" placeholder="0.00" step="0.01"   oninput="teOnScheduleE(${i},'incomeAmount',this.value)">
          <label style="display:flex;align-items:center;gap:5px;font-size:12px;white-space:nowrap;">
            <input type="checkbox" ${e.isPassive ? 'checked' : ''} onchange="teOnScheduleE(${i},'isPassive',this.checked)"> Passive <span class="te-cite" style="font-size:10px;">§469</span>
          </label>
          <button class="te-rm-btn" onclick="teRmScheduleE(${i})">✕</button>
        </div>`).join('')}
    </div>
    ${calc.passiveLossSuspended > 0 ? `
    <div class="te-ded-note" style="margin-top:6px;color:#f5a623;">
      ⚠ Suspended passive loss: ${teFmt(calc.passiveLossSuspended)} — not currently deductible. Passive losses can only offset passive income. <span class="te-cite">IRC §469(a)</span>
    </div>` : ''}
    ${(entities.length > 0) ? `
    <div class="te-ded-note" style="margin-top:4px;">
      Passive: ${teFmt(calc.scheduleEPassive)} &nbsp;|&nbsp; Non-passive: ${teFmt(calc.scheduleENonPassive)} &nbsp;|&nbsp; Net flowing to gross income: ${teFmt(calc.scheduleENet)}
    </div>` : ''}`;
}

function teRenderScheduleC() {
  let r    = teCurrentReturn;
  let sc   = (r && r.scheduleC) || {};
  let calc = (r && r._calc)     || {};
  let hasIncome = calc.netSEIncome > 0;
  return `
    <div class="te-frow" style="align-items:flex-end;gap:12px;flex-wrap:wrap;margin-top:8px;">
      <div class="te-field-group" style="max-width:220px;">
        <label class="te-lbl">Schedule C Net Profit / (Loss) <span class="te-cite">IRC §162</span></label>
        <input type="number" id="te-sc-netprofit" class="te-input te-mono"
          value="${esc(String(sc.netProfit||''))}" placeholder="0.00" step="0.01"
          oninput="teOnScheduleC()">
      </div>
      ${hasIncome ? `
      <div class="te-ded-note" style="flex:1;padding-bottom:6px;">
        SE Tax Base: ${teFmt(calc.seTaxBase)} &nbsp;|&nbsp;
        SE Tax: ${teFmt(calc.seTax)}
        (SS: ${teFmt(calc.seSSTax)} + Medicare: ${teFmt(calc.seMedicareTax)}) &nbsp;|&nbsp;
        §164(f) Deduction: ${teFmt(calc.seTaxDeduction)}
      </div>` : ''}
    </div>
    <div class="te-ded-note" style="margin-top:4px;">
      Enter net profit from all Schedule C businesses combined. Losses (negative values) reduce gross income and eliminate SE tax.
      SE tax = net profit × 92.35% × 15.3% (SS limited to wage base less W-2 wages). <span class="te-cite">IRC §1401, §1402</span>
    </div>`;
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

    <div class="te-stub-sec" style="margin-top:16px;">
      <div class="te-stub-blk"><span class="te-stub-title">Earned Income Credit (EIC) <span class="te-cite">IRC §32</span></span><span class="te-stub-pill">Phase 2</span></div>
      <div class="te-stub-blk"><span class="te-stub-title">Child &amp; Dependent Care Credit <span class="te-cite">IRC §21</span></span><span class="te-stub-pill">Phase 2</span></div>
      <div class="te-stub-blk"><span class="te-stub-title">Retirement Savings Contributions Credit <span class="te-cite">IRC §25B</span></span><span class="te-stub-pill">Phase 2</span></div>
      <div class="te-stub-blk"><span class="te-stub-title">Energy-Efficient Home Improvement Credit <span class="te-cite">IRC §25C, §25D</span></span><span class="te-stub-pill">Phase 2</span></div>
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

  let gross     = qc.length * K.ctc.amountPerChild;
  let threshold = K.ctc.phaseoutThreshold[fs] || K.ctc.phaseoutThreshold.single;
  let calc      = teCurrentReturn._calc || {};
  let agi       = calc.agi || 0;
  let excess    = Math.max(0, agi - threshold);
  let reduction = Math.ceil(excess / 1000) * 50;
  let net       = Math.max(0, gross - reduction);

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
    <div class="te-info-sm">Non-refundable portion reduces tax liability first. Remaining unused credit may be refundable as ACTC (up to ${teFmt(K.ctc.actcMax)}/child). <span class="te-cite">IRC §24(d)</span></div>`;
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
              <input type="number" class="te-input te-mono" value="${s.expenses||''}" placeholder="0.00" step="0.01" min="0" oninput="teUpdStudent(${i},'expenses',this.value)">
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
function teCalcSLI(adj, magi, K, fs) {
  let interest = parseFloat(adj.studentLoanInterest) || 0;
  if (interest <= 0) return 0;
  // IRC §221(b)(2)(B): MFS filers are not eligible
  if (fs === 'mfs') return 0;
  // IRC §221(b)(1): deduct the lesser of $2,500 or actual interest paid
  let maxDed = Math.min(interest, K.studentLoanInterest.maxDeduction);
  // Determine phase-out range by filing status
  let po = (fs === 'mfj') ? K.studentLoanInterest.phaseout.mfj : K.studentLoanInterest.phaseout.single;
  if (magi >= po.ceiling) return 0;
  if (magi <= po.floor)   return maxDed;
  // IRC §221(b)(2)(A): proportional phase-out reduction
  let ratio = (magi - po.floor) / (po.ceiling - po.floor);
  return Math.max(0, Math.round(maxDed * (1 - ratio) * 100) / 100);
}

// IRC §223 — Health Savings Account (HSA) Deduction
// Source: IRS Publication 969 (irs.gov/publications/p969); Rev. Proc. 2024-25
// No income phase-out. Deduction = contributions made, capped at coverage-tier limit.
function teCalcHSA(adj, K) {
  let contributions = parseFloat(adj.hsaContributions) || 0;
  if (contributions <= 0) return 0;
  let limit = (adj.hsaCoverageType === 'family') ? K.hsa.limitFamily : K.hsa.limitSelf;
  // IRC §223(b)(3)(B): age 55+ catch-up — statutory $1,000
  if (adj.hsaTaxpayerAge55) limit += K.hsa.catchUp;
  return Math.min(contributions, limit);
}

// IRC §219 — Traditional IRA Deduction
// Source: IRS.gov newsroom — irs.gov/newsroom/401k-limit-increases-to-23500-for-2025-ira-limit-remains-7000
// MAGI for §219 = gross income minus all OTHER above-the-line adjustments, excluding §219 itself
// IRC §219(g)(3): MAGI computed without the §219 deduction
function teCalcIRA(adj, magi, K, fs) {
  let contributions = parseFloat(adj.iraContributions) || 0;
  if (contributions <= 0) return 0;
  // IRC §219(b)(1): contribution limit (before catch-up)
  // IRC §219(b)(5)(B): age 50+ catch-up — statutory $1,000
  let maxContrib = K.ira.limit + (adj.iraAge50Plus ? K.ira.catchUp : 0);
  let capped     = Math.min(contributions, maxContrib);

  // Determine phase-out range — IRC §219(g)
  let po = null;
  if (adj.iraActiveParticipant) {
    // Taxpayer covered by employer plan — IRC §219(g)(2)
    if (fs === 'single' || fs === 'hoh' || fs === 'qss') {
      po = K.ira.phaseout.singleActive;
    } else if (fs === 'mfj') {
      po = K.ira.phaseout.mfjActive;
    } else if (fs === 'mfs') {
      po = K.ira.phaseout.mfsActive;    // IRC §219(g)(2)(D) — statutory $0–$10,000
    }
  } else if (fs === 'mfj' && adj.iraSpouseActive) {
    // Taxpayer NOT active, spouse IS active — IRC §219(g)(7)
    po = K.ira.phaseout.mfjSpouseActive;
  }
  // Neither active participant: no phase-out — fully deductible
  if (!po) return capped;

  if (magi >= po.ceiling) return 0;
  if (magi <= po.floor)   return capped;

  // IRC §219(g)(2)(A): proportional phase-out reduction
  let ratio   = (magi - po.floor) / (po.ceiling - po.floor);
  let phased  = capped * (1 - ratio);
  // IRC §219(g)(2)(C): round UP to nearest $10; minimum $200 if nonzero
  let rounded = Math.ceil(phased / 10) * 10;
  if (rounded > 0 && rounded < 200) rounded = 200;
  return Math.min(rounded, capped);
}


// ──────────────────────────────────────────────────────────────────────
//  TRACK 3 CALC FUNCTIONS
// ──────────────────────────────────────────────────────────────────────

// IRC §215 — Alimony Paid Deduction
// Source: uscode.house.gov/view.xhtml?req=granuleid:USC-prelim-title26-section215
// TCJA §11051 (P.L. 115-97): agreements executed after Dec 31, 2018 → NOT deductible.
// Pre-2019 agreements: full amount paid is deductible above-the-line.
// Practitioner responsibility: confirm the divorce/separation instrument date.
function teCalcAlimony(alimony) {
  if (!alimony.preAgreement) return 0;  // post-2018 → not deductible per TCJA §11051
  return teRound(Math.max(0, parseFloat(alimony.paid) || 0));
}

// Handler — Schedule C field changes
function teOnScheduleC() {
  if (!teCurrentReturn) return;
  teMarkDirty();
  if (!teCurrentReturn.scheduleC) teCurrentReturn.scheduleC = {};
  let g = id => { let el = document.getElementById(id); return el ? el.value : ''; };
  teCurrentReturn.scheduleC.netProfit = g('te-sc-netprofit');
  teRecalculate();
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
  teRecalculate();
}

function teOnScheduleD() {
  if (!teCurrentReturn) return;
  teMarkDirty();
  if (!teCurrentReturn.scheduleD) teCurrentReturn.scheduleD = {};
  let g = id => { let el = document.getElementById(id); return el ? el.value : ''; };
  teCurrentReturn.scheduleD.netSTCG               = g('te-sd-stcg');
  teCurrentReturn.scheduleD.netLTCG               = g('te-sd-ltcg');
  teCurrentReturn.scheduleD.priorYearCarryforward = g('te-sd-cf');
  teRecalculate();
}

function teAddScheduleE() {
  if (!teCurrentReturn) return;
  teMarkDirty();
  if (!teCurrentReturn.scheduleE) teCurrentReturn.scheduleE = [];
  teCurrentReturn.scheduleE.push({ name: '', ein: '', incomeAmount: '', isPassive: true });
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
  teRecalculate();
  // Update passive loss note live without full re-render
  let calc = teCurrentReturn._calc || {};
  let c    = document.getElementById('te-sche-list');
  if (c && calc.passiveLossSuspended > 0) teRenderScheduleEList();
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
function teCalcSALT(schedA, agi, K, fs) {
  let Ks = K.scheduleA.salt;
  let paid = (parseFloat(schedA.stateIncomeTax)      || 0)
           + (parseFloat(schedA.localIncomeTax)       || 0)
           + (parseFloat(schedA.realEstateTax)        || 0)
           + (parseFloat(schedA.personalPropertyTax)  || 0);
  if (paid <= 0) return 0;
  // Determine cap and phase-out threshold by filing status
  let cap       = (fs === 'mfs') ? Ks.mfsCap               : Ks.cap;
  let threshold = (fs === 'mfs') ? Ks.mfsPhaseoutThreshold : Ks.phaseoutThreshold;
  // Compute effective cap after phase-down
  let excess       = Math.max(0, agi - threshold);
  let effectiveCap = cap - (Ks.phaseoutRate * excess);
  effectiveCap     = Math.max(Ks.floor, effectiveCap);
  return Math.min(paid, effectiveCap);
}

// IRC §163(h)(3) — Qualified Residence Interest (Mortgage Interest Deduction)
// Source: uscode.house.gov/view.xhtml?req=granuleid:USC-prelim-title26-section163
// If outstanding balance exceeds qualified debt limit: deductible portion is
//   interest × (limit / balance) — IRC §163(h)(3)(F)(i)
function teCalcMortgageInterest(schedA, K) {
  let interest = parseFloat(schedA.mortgageInterest) || 0;
  if (interest <= 0) return 0;
  // IRC §163(h)(3)(C): Home equity interest is deductible ONLY if the debt was used to
  // acquire, build, or substantially improve the qualified residence. Interest on home
  // equity debt used for personal purposes (car, vacation, debt consolidation, etc.)
  // is not deductible under TCJA. Source: uscode.house.gov/view.xhtml?req=granuleid:USC-prelim-title26-section163
  if (schedA.mortgagePurpose === 'home_equity_personal') return 0;
  let balance = parseFloat(schedA.mortgageBalance) || 0;
  let limit   = (schedA.mortgageLoanDate === 'pre2018')
    ? K.scheduleA.mortgage.pre2018Limit
    : K.scheduleA.mortgage.post2017Limit;
  // If balance not entered or within limit: all interest deductible
  if (balance <= 0 || balance <= limit) return interest;
  // Balance exceeds limit: prorate — IRC §163(h)(3)(F)(i)
  return Math.round(interest * (limit / balance) * 100) / 100;
}

// IRC §170(b)(1) — Charitable Contribution Deduction
// Source: uscode.house.gov/view.xhtml?req=granuleid:USC-prelim-title26-section170
// Cash: capped at 60% of AGI; Non-cash: capped at 50% of AGI.
// Combined total: capped at 60% of AGI (higher-tier cash limit governs).
function teCalcCharitable(schedA, agi, K) {
  if (agi <= 0) return 0;
  let cash    = Math.min(parseFloat(schedA.cashCharitable)    || 0, agi * K.scheduleA.charitable.cashAgiLimit);
  let nonCash = Math.min(parseFloat(schedA.nonCashCharitable) || 0, agi * K.scheduleA.charitable.nonCashAgiLimit);
  // Combined cannot exceed the 60% AGI limit — IRC §170(b)(1)
  return Math.min(cash + nonCash, agi * K.scheduleA.charitable.cashAgiLimit);
}

// IRC §213(a) — Medical Expense Deduction
// Source: uscode.house.gov/view.xhtml?req=granuleid:USC-prelim-title26-section213
// Deductible amount = medical expenses exceeding 7.5% of AGI.
function teCalcMedical(schedA, agi, K) {
  let expenses = parseFloat(schedA.medicalExpenses) || 0;
  if (expenses <= 0 || agi <= 0) return 0;
  let floor = agi * K.scheduleA.medical.agiFloor;  // 7.5% of AGI
  return Math.max(0, Math.round((expenses - floor) * 100) / 100);
}

// Handler for Schedule A field changes
function teOnScheduleA() {
  if (!teCurrentReturn) return;
  teMarkDirty();
  if (!teCurrentReturn.scheduleA) teCurrentReturn.scheduleA = {};
  let s  = teCurrentReturn.scheduleA;
  let g  = id => { let el = document.getElementById(id); return el ? el.value : ''; };
  s.stateIncomeTax      = g('te-sa-sit');
  s.localIncomeTax      = g('te-sa-lit');
  s.realEstateTax       = g('te-sa-ret');
  s.personalPropertyTax = g('te-sa-ppt');
  s.mortgageInterest    = g('te-sa-mi');
  s.mortgageBalance     = g('te-sa-mb');
  s.mortgageLoanDate    = g('te-sa-mld') || 'post2017';
  s.mortgagePurpose     = g('te-sa-mp')  || 'acquisition';
  s.cashCharitable      = g('te-sa-cc');
  s.nonCashCharitable   = g('te-sa-nc');
  s.medicalExpenses     = g('te-sa-med');
  let mfsiEl = document.getElementById('te-sa-mfsi');
  s.mfsSpouseItemizes   = mfsiEl ? mfsiEl.checked : false;
  teRecalculate();
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

  return `
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
      <div class="te-subsec-lbl">Additional Taxes <span class="te-cite">IRC §3101(b)(2), §1411</span></div>
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


// ──────────────────────────────────────────────────────────────────────
//  CALCULATION ENGINE
//  IRC §1 flow: Gross Income → AGI → Taxable Income → Tax → Credits → Payments → Refund/Due
// ──────────────────────────────────────────────────────────────────────

function teRecalculate() {
  if (!teCurrentReturn) return;
  let yr = teCurrentReturn.taxYear || teActiveYear;
  let K  = TAX_CONSTANTS[yr];
  if (!K) return;

  let fs   = teCurrentReturn.filingStatus || 'single';
  let calc = {};

  // ── Step 1: Gross Income — IRC §61 ──────────────────────────────────
  let sc            = teCurrentReturn.scheduleC || {};
  calc.w2Wages      = teRound((teCurrentReturn.w2 || []).reduce((s, w) => s + (parseFloat(w.wages)||0), 0));
  calc.netSEIncome  = teRound(Math.max(0, parseFloat(sc.netProfit) || 0));

  // Track 4: Investment income — IRC §61(a)(4),(7); §1221
  let inv = teCurrentReturn.schedule1099 || {};
  calc.interestIncome    = teRound(Math.max(0, parseFloat(inv.interestIncome)    || 0));
  calc.ordinaryDividends = teRound(Math.max(0, parseFloat(inv.ordinaryDividends) || 0));
  // Qualified dividends must be ≤ ordinary dividends — IRC §1(h)(11)(B)
  calc.qualifiedDividends = teRound(Math.min(
    Math.max(0, parseFloat(inv.qualifiedDividends) || 0),
    calc.ordinaryDividends
  ));

  // Schedule D — IRC §1221, §1222
  let sd = teCurrentReturn.scheduleD || {};
  calc.netSTCG         = teRound(parseFloat(sd.netSTCG)               || 0);
  calc.netLTCG         = teRound(parseFloat(sd.netLTCG)               || 0);
  calc.priorCapLossCF  = teRound(Math.max(0, parseFloat(sd.priorYearCarryforward) || 0));
  // Combined net before loss cap
  calc.scheduleDCombined = teRound(calc.netSTCG + calc.netLTCG - calc.priorCapLossCF);
  if (calc.scheduleDCombined >= 0) {
    calc.scheduleDNet        = calc.scheduleDCombined;
    calc.capLossCarryforward = 0;
  } else {
    // IRC §1211(b): net capital loss deductible up to $3,000; excess carries forward
    calc.scheduleDNet        = teRound(Math.max(-K.capitalGains.netLossDeductionCap, calc.scheduleDCombined));
    calc.capLossCarryforward = teRound(Math.abs(calc.scheduleDCombined) - K.capitalGains.netLossDeductionCap);
    if (calc.capLossCarryforward < 0) calc.capLossCarryforward = 0;
  }

  // Schedule E — pass-through income/loss — IRC §702 (partnerships), §1366 (S-corps)
  // IRC §469(a): passive activity losses can only offset passive activity income — excess suspended
  let seEntities        = teCurrentReturn.scheduleE || [];
  calc.scheduleEPassive    = teRound(seEntities.filter(e => e.isPassive).reduce((s, e) => s + (parseFloat(e.incomeAmount) || 0), 0));
  calc.scheduleENonPassive = teRound(seEntities.filter(e => !e.isPassive).reduce((s, e) => s + (parseFloat(e.incomeAmount) || 0), 0));
  // Only positive passive income flows through; passive losses are suspended (not deductible currently)
  calc.scheduleEPassiveDeductible = teRound(Math.max(0, calc.scheduleEPassive));
  calc.passiveLossSuspended       = teRound(calc.scheduleEPassive < 0 ? Math.abs(calc.scheduleEPassive) : 0);
  // Non-passive losses flow through without restriction (e.g., general partner, material participation)
  calc.scheduleENet = teRound(calc.scheduleEPassiveDeductible + calc.scheduleENonPassive);

  // Gross income: all sources — IRC §61
  // Note: ordinaryDividends includes qualifiedDividends (QDs are a subset, not additive)
  calc.grossIncome = teRound(
    calc.w2Wages + calc.netSEIncome
    + calc.interestIncome + calc.ordinaryDividends
    + calc.scheduleDNet + calc.scheduleENet
  );

  // ── Step 2a: SE Tax — computed BEFORE above-the-line deductions ─────
  // SE tax does not depend on AGI (it depends only on net SE income), so
  // it can be computed here — enabling §164(f) deduction to reduce MAGI
  // for SLI and IRA phase-outs without circularity.
  // IRC §1401 rates; IRC §1402(a) net earnings factor.
  // Source: uscode.house.gov/view.xhtml?req=granuleid:USC-prelim-title26-section1401
  let SE = K.selfEmployment;
  calc.seTaxBase      = teRound(calc.netSEIncome * SE.netEarningsRate);     // × 92.35%
  // SS applies only up to wage base, reduced by W-2 wages already subject to SS
  // IRC §1402(b): SS component of SE tax limited to excess of wage base over wages
  let ssRemaining     = Math.max(0, SE.ssTaxWageBase - calc.w2Wages);
  calc.seSSBase       = teRound(Math.min(calc.seTaxBase, ssRemaining));
  calc.seSSTax        = teRound(calc.seSSBase       * SE.ssTaxRate);        // 12.4%
  calc.seMedicareTax  = teRound(calc.seTaxBase      * SE.medicareTaxRate);  // 2.9%
  calc.seTax          = teRound(calc.seSSTax + calc.seMedicareTax);         // → Step 7b
  // §164(f): 50% of SE tax deductible above-the-line
  // Source: uscode.house.gov/view.xhtml?req=granuleid:USC-prelim-title26-section164
  calc.seTaxDeduction = teRound(calc.seTax * 0.50);

  // ── Step 2b: Above-the-Line Adjustments — IRC §62 ───────────────────
  let adj = teCurrentReturn.agiAdjustments || {};

  // §223 HSA: no MAGI phase-out — compute first
  calc.hsaDeduction = teCalcHSA(adj, K);

  // §221 Student Loan Interest
  // MAGI = grossIncome − HSA − seTaxDeduction (§221 excluded from own MAGI)
  // IRC §221(b)(2)(C); Note: seTaxDeduction now correctly included per audit flag
  let magiForSLI    = teRound(calc.grossIncome - calc.hsaDeduction - calc.seTaxDeduction);
  calc.sliDeduction = teCalcSLI(adj, magiForSLI, K, fs);

  // §219 Traditional IRA
  // MAGI = grossIncome − HSA − SLI − seTaxDeduction (§219 excluded from own MAGI)
  let magiForIRA    = teRound(calc.grossIncome - calc.hsaDeduction - calc.sliDeduction - calc.seTaxDeduction);
  calc.iraDeduction = teCalcIRA(adj, magiForIRA, K, fs);

  // §215 Alimony Paid (pre-2019 divorce agreements only)
  // TCJA §11051: agreements executed after Dec 31, 2018 → NOT deductible
  // Source: uscode.house.gov/view.xhtml?req=granuleid:USC-prelim-title26-section215
  calc.alimonyDeduction = teCalcAlimony(teCurrentReturn.alimony || {});

  calc.adjustments = teRound(calc.hsaDeduction + calc.sliDeduction + calc.iraDeduction + calc.seTaxDeduction + calc.alimonyDeduction);

  // ── Step 3: Adjusted Gross Income — IRC §62 ─────────────────────────
  calc.agi = teRound(calc.grossIncome - calc.adjustments);

  // ── Step 3b: Investment Interest Expense — IRC §163(d) ───────────────
  // Deductible as Schedule A itemized deduction limited to net investment income.
  // NII for §163(d) = interest + non-qualified dividends + (QDs if §163(d)(4)(B) elected)
  // STCG and LTCG may also be included if taxpayer elects, but excluded here by default.
  // Source: uscode.house.gov/view.xhtml?req=granuleid:USC-prelim-title26-section163
  let ii          = teCurrentReturn.investmentInterest || {};
  let iiExpense   = teRound(Math.max(0, parseFloat(ii.expense) || 0));
  let iiCF        = teRound(Math.max(0, parseFloat(ii.priorYearCarryforward) || 0));
  let includeQDin163d = ii.includeQDinNII === true;
  // NII for §163(d) cap: standard = interest + non-QD dividends; election adds QDs
  let niiFor163d  = teRound(
    calc.interestIncome
    + (calc.ordinaryDividends - calc.qualifiedDividends)   // non-qualified dividends
    + (includeQDin163d ? calc.qualifiedDividends : 0)
    + Math.max(0, calc.netSTCG)   // STCG is ordinary investment income for §163(d) purposes
  );
  let totalIIAvail                    = teRound(iiExpense + iiCF);
  calc.investmentInterestAllowed      = teRound(Math.min(totalIIAvail, Math.max(0, niiFor163d)));
  calc.investmentInterestCarryforward = teRound(Math.max(0, totalIIAvail - calc.investmentInterestAllowed));

  // ── Step 4: Deductions — IRC §63 ────────────────────────────────────
  calc.stdDed = K.standardDeduction[fs] || K.standardDeduction.single;  // Source: OBBBA P.L. 119-21

  // Track 2: Schedule A itemized deductions — automatically compared to standard
  let schedA = teCurrentReturn.scheduleA || {};
  calc.saltDeduction       = teCalcSALT(schedA, calc.agi, K, fs);
  calc.mortgageDeduction   = teCalcMortgageInterest(schedA, K);
  calc.charitableDeduction = teCalcCharitable(schedA, calc.agi, K);
  calc.medicalDeduction    = teCalcMedical(schedA, calc.agi, K);
  // IRC §163(d) investment interest included in Schedule A itemized deductions
  calc.itemizedTotal       = teRound(calc.saltDeduction + calc.mortgageDeduction + calc.charitableDeduction + calc.medicalDeduction + calc.investmentInterestAllowed);

  // Engine picks whichever is higher — IRC §63(b)
  // No taxpayer toggle: the engine always applies the more beneficial deduction
  calc.deductionType  = calc.itemizedTotal > calc.stdDed ? 'itemized' : 'standard';
  calc.deductionUsed  = calc.itemizedTotal > calc.stdDed ? calc.itemizedTotal : calc.stdDed;
  calc.mfsItemizedRequired = false;

  // IRC §63(e): If one MFS spouse itemizes, the other MUST also itemize.
  // The standard deduction is disallowed — treated as $0 regardless of itemized total.
  // Source: uscode.house.gov/view.xhtml?req=granuleid:USC-prelim-title26-section63
  if (fs === 'mfs' && schedA.mfsSpouseItemizes === true) {
    calc.stdDed              = 0;
    calc.deductionType       = 'itemized';
    calc.deductionUsed       = calc.itemizedTotal;
    calc.mfsItemizedRequired = true;
  }
  teCurrentReturn.deductionType = calc.deductionType;

  // ── Step 5: Taxable Income — IRC §63(a) ─────────────────────────────
  calc.taxableIncome = teRound(Math.max(0, calc.agi - calc.deductionUsed));

  // ── Step 6: Regular Income Tax — IRC §1 ─────────────────────────────
  // QSS uses MFJ brackets per IRC §2(a)
  let bKey = (fs === 'qss') ? 'mfj' : fs;

  // IRC §1(h) — Qualified Dividends and Capital Gain Tax Worksheet
  // If the return has QDs or LTCG, the preferential portion is taxed at 0%/15%/20%
  // rather than ordinary bracket rates. Mirrors the IRS Qualified Dividends and Capital
  // Gain Tax Worksheet (Form 1040 instructions).
  // Preferential pool = qualified dividends + net LTCG after STCG netting and CF offset
  let netCapGainPreferential = teRound(Math.max(0,
    calc.netLTCG - calc.priorCapLossCF          // LTCG net of carryforward
    + Math.min(0, calc.netSTCG)                 // negative STCG offsets LTCG (not below 0)
  ));
  calc.qdltcg = teRound(calc.qualifiedDividends + netCapGainPreferential);

  if (calc.qdltcg > 0 && calc.taxableIncome > 0) {
    let ordinaryPortion = teRound(Math.max(0, calc.taxableIncome - calc.qdltcg));
    let ordinaryTax     = teBracketTax(ordinaryPortion, K.brackets[bKey] || K.brackets.single);
    let qdltcgTax       = teCalcQDLTCGTax(calc.qdltcg, calc.taxableIncome, ordinaryPortion, K, fs);
    calc.regularTax     = teRound(ordinaryTax + qdltcgTax);
  } else {
    calc.regularTax = teBracketTax(calc.taxableIncome, K.brackets[bKey] || K.brackets.single);
  }

  // ── Step 7a: Pre-credit taxes (Schedule 2, Part I) ──────────────────
  // AMT is added here — before credits — because non-refundable credits
  // (CTC, AOC, LLC) CAN offset regular income tax + AMT combined.
  // Source: Form 1040 Schedule 2, Part I; IRC §55
  calc.amt             = 0;  // IRC §55     — Phase 2 (Track 6)
  calc.taxBeforeCredits = teRound(calc.regularTax + calc.amt);

  // ── Step 8: Child Tax Credit — IRC §24 ──────────────────────────────
  // CTC applied against taxBeforeCredits (regular tax + AMT), NOT against SE tax or NIIT.
  // Earned income for ACTC = W-2 wages + net SE income — IRC §24(d)(1)(B)
  let earnedIncome = teRound(calc.w2Wages + calc.netSEIncome);
  let ctc = teCalcCTC(teCurrentReturn, calc.agi, calc.taxBeforeCredits, earnedIncome, fs, K);
  calc.ctcGross          = ctc.gross;
  calc.ctcAfterPhaseout  = ctc.afterPhaseout;
  calc.ctcNonRefundable  = ctc.nonRefundable;
  calc.actcRefundable    = ctc.actcRefundable;

  // ── Step 9: Education Credits — IRC §25A ────────────────────────────
  // Education credits applied against remaining tax after CTC, still against taxBeforeCredits base.
  let taxAfterCTC = teRound(Math.max(0, calc.taxBeforeCredits - calc.ctcNonRefundable));
  let edu = teCalcEduCredits(teCurrentReturn, calc.agi, taxAfterCTC, fs, K);
  calc.aocNonRefundable      = edu.aocNonRefundable;
  calc.aocRefundable         = edu.aocRefundable;
  calc.llcCredit             = edu.llcCredit;
  calc.totalEduNonRefundable = edu.aocNonRefundable + edu.llcCredit;

  // ── Step 10: Non-refundable credits applied — floor at $0 ───────────
  calc.totalNonRefundable  = teRound(calc.ctcNonRefundable + calc.totalEduNonRefundable);
  calc.taxAfterNRCredits   = teRound(Math.max(0, calc.taxBeforeCredits - calc.totalNonRefundable));

  // ── Step 7b: Post-credit taxes (Schedule 2, Part II) ────────────────
  // SE Tax (calc.seTax) already computed in Step 2a — it is NOT offset by non-refundable credits.

  // IRC §3101(b)(2) — Additional Medicare Tax (0.9%)
  // Applies to wages + SE income exceeding threshold — NOT investment income (that is NIIT)
  // Source: uscode.house.gov/view.xhtml?req=granuleid:USC-prelim-title26-section3101
  let amThreshold       = K.addlMedicare.threshold[fs] || K.addlMedicare.threshold.single;
  calc.addlMedicareTax  = teRound(Math.max(0, (calc.w2Wages + calc.netSEIncome - amThreshold)) * K.addlMedicare.rate);

  // IRC §1411 — Net Investment Income Tax (3.8%)
  // NII = interest + dividends + net cap gain + passive SE income − §163(d) investment interest
  // IRC §1411(c)(1): NII excludes income from an active trade or business (SE income, non-passive K-1)
  // Source: uscode.house.gov/view.xhtml?req=granuleid:USC-prelim-title26-section1411
  calc.netInvestmentIncome = teRound(Math.max(0,
    calc.interestIncome
    + calc.ordinaryDividends                          // includes QDs
    + Math.max(0, calc.scheduleDNet)                  // net cap gain only; losses don't add to NII
    + Math.max(0, calc.scheduleEPassive)              // passive income (positive only per §469 interaction)
    - calc.investmentInterestAllowed                  // §163(d) reduces NII
  ));
  // MAGI for NIIT = AGI for domestic taxpayers (no §911 foreign exclusion in engine)
  let niitThreshold = K.niit.threshold[fs] || K.niit.threshold.single;
  let niitExcess    = teRound(Math.max(0, calc.agi - niitThreshold));
  calc.niit         = teRound(Math.min(calc.netInvestmentIncome, niitExcess) * K.niit.rate);

  calc.taxAfterCredits = teRound(calc.taxAfterNRCredits + calc.seTax + calc.addlMedicareTax + calc.niit);
  calc.totalTax        = calc.taxAfterCredits;  // alias — used by meter and flags

  // ── Step 11: Payments — IRC §3402, §6654 ────────────────────────────
  calc.w2Withholding = teRound((teCurrentReturn.w2 || []).reduce((s, w) => s + (parseFloat(w.federalWithheld)||0), 0));
  let ep = teCurrentReturn.estimatedPayments || {};
  calc.estQ1         = teRound(parseFloat(ep.q1) || 0);
  calc.estQ2         = teRound(parseFloat(ep.q2) || 0);
  calc.estQ3         = teRound(parseFloat(ep.q3) || 0);
  calc.estQ4         = teRound(parseFloat(ep.q4) || 0);
  calc.estPayments   = teRound(calc.estQ1 + calc.estQ2 + calc.estQ3 + calc.estQ4);
  calc.totalPayments = teRound(calc.w2Withholding + calc.estPayments);

  // ── Step 12: Refund / Balance Due ───────────────────────────────────
  // Positive = refund; negative = balance due
  calc.totalRefundableCredits = teRound(calc.actcRefundable + calc.aocRefundable);
  calc.refundOrDue = teRound(calc.totalPayments + calc.totalRefundableCredits - calc.taxAfterCredits);

  teCurrentReturn._calc = calc;

  teUpdateMeter(calc, K, fs);
  teUpdateSecStatus(calc);
  teRunFlags(calc, K, fs);

  // Refresh live displays on active sections
  if (teActiveSection === 'credits') { teRenderCTCDetail(); teRenderEduList(); }
  if (teActiveSection === 'income') {
    let scEl = document.getElementById('te-sc-netprofit');
    if (!scEl) { teRenderW2List(); }  // full re-render only if SC input gone
    let scCalcEl = document.querySelector('#tab-returns .te-subsec .te-ded-note');
    // Live-update the SE tax breakdown in the Schedule C info note
    let scNote = document.querySelector('[id="te-sc-netprofit"]');
    if (scNote) {
      // Update the sibling info note if income changed
      let parent = scNote.closest('.te-frow');
      if (parent && parent.nextElementSibling) {
        // refresh the inline SE tax breakdown
        let infoDiv = parent.querySelector('.te-ded-note');
        if (infoDiv && calc.netSEIncome > 0) {
          infoDiv.innerHTML = 'SE Tax Base: ' + teFmt(calc.seTaxBase) + ' &nbsp;|&nbsp; SE Tax: ' + teFmt(calc.seTax) + ' (SS: ' + teFmt(calc.seSSTax) + ' + Medicare: ' + teFmt(calc.seMedicareTax) + ') &nbsp;|&nbsp; §164(f) Deduction: ' + teFmt(calc.seTaxDeduction);
        }
      }
    }
  }
  if (teActiveSection === 'payments') {
    teM('te-ep-total', teFmt(calc.estPayments));
    let epTotal = document.querySelector('.te-total-val');
    if (epTotal) epTotal.textContent = teFmt(calc.estPayments);
    let addlPanel = document.getElementById('te-addl-taxes-panel');
    if (addlPanel) addlPanel.innerHTML = teRenderAddlTaxes();
  }
  if (teActiveSection === 'deductions') {
    teM('te-ded-std-amt',      teFmt(calc.stdDed));
    teM('te-ded-sli-calc',     teFmt(calc.sliDeduction));
    teM('te-ded-hsa-calc',     teFmt(calc.hsaDeduction));
    teM('te-ded-ira-calc',     teFmt(calc.iraDeduction));
    teM('te-ded-se-calc',      teFmt(calc.seTaxDeduction));
    teM('te-ded-al-calc',      teFmt(calc.alimonyDeduction));
    teM('te-sa-salt-calc',     teFmt(calc.saltDeduction));
    teM('te-sa-mi-calc',       teFmt(calc.mortgageDeduction));
    teM('te-sa-char-calc',     teFmt(calc.charitableDeduction));
    teM('te-sa-med-calc',      teFmt(calc.medicalDeduction));
    teM('te-sa-ii-calc',       teFmt(calc.investmentInterestAllowed || 0));
    teM('te-sa-itemized-total',teFmt(calc.itemizedTotal));
    // Rebuild comparison bar to update labels/badges and note text
    let cmpBar = document.getElementById('te-sa-comparison-bar');
    if (cmpBar) {
      let useIt = calc.deductionType === 'itemized';
      let stdSide  = cmpBar.querySelector('.te-sa-comp-side:first-child');
      let itSide   = cmpBar.querySelector('.te-sa-comp-side:last-child');
      let note     = cmpBar.querySelector('.te-sa-comp-note');
      if (stdSide) {
        stdSide.className = 'te-sa-comp-side' + (useIt ? '' : ' te-sa-comp-winner');
        let badge = stdSide.querySelector('.te-sa-comp-badge');
        if (!badge && !useIt) { let b = document.createElement('span'); b.className = 'te-sa-comp-badge'; b.textContent = 'Applied'; stdSide.appendChild(b); }
        if ( badge &&  useIt) badge.remove();
      }
      if (itSide) {
        itSide.className  = 'te-sa-comp-side' + (useIt ? ' te-sa-comp-winner' : '');
        let badge = itSide.querySelector('.te-sa-comp-badge');
        if (!badge &&  useIt) { let b = document.createElement('span'); b.className = 'te-sa-comp-badge'; b.textContent = 'Applied'; itSide.appendChild(b); }
        if ( badge && !useIt) badge.remove();
      }
      if (note) {
        if (calc.mfsItemizedRequired) {
          note.innerHTML = 'MFS — spouse is itemizing on their separate return. Standard deduction is disallowed on this return. <span class="te-cite">IRC §63(e)</span>';
        } else if (useIt) {
          note.innerHTML = 'Itemizing saves <strong>' + teFmt(calc.itemizedTotal - calc.stdDed) + '</strong> more than the standard deduction. <span class="te-cite">IRC §63(b)</span>';
        } else {
          note.innerHTML = 'Standard deduction is <strong>' + teFmt(calc.stdDed - calc.itemizedTotal) + '</strong> higher than current itemized total. Enter Schedule A expenses below to compare.';
        }
      }
    }
  }
}

// IRC §1 — Progressive bracket tax calculation
function teBracketTax(income, brackets) {
  let tax  = 0;
  let prev = 0;
  for (let [ceil, rate] of brackets) {
    if (income <= prev) break;
    tax += (Math.min(income, ceil === Infinity ? income : ceil) - prev) * rate;
    prev = (ceil === Infinity) ? income : ceil;
    if (ceil === Infinity) break;
  }
  return Math.round(tax * 100) / 100;
}

// IRC §1(h) — Tax on qualified dividends and LTCG at preferential rates (0% / 15% / 20%)
// Mirrors the IRS Qualified Dividends and Capital Gain Tax Worksheet (Form 1040 instructions).
// qdltcg:         total preferentially taxed income (QDs + net cap gain)
// taxableIncome:  total taxable income (ordinary + qdltcg)
// ordinaryPortion: taxableIncome - qdltcg (the ordinary income piece)
function teCalcQDLTCGTax(qdltcg, taxableIncome, ordinaryPortion, K, fs) {
  let cg       = K.capitalGains;
  let bKey     = (fs === 'qss') ? 'mfj' : fs;
  let zeroCeil = cg.zeroRateCeiling[bKey]    || cg.zeroRateCeiling.single;
  let fifCeil  = cg.fifteenRateCeiling[bKey] || cg.fifteenRateCeiling.single;

  // Amount of QDLTCG eligible for 0% rate (ordinary income + qdltcg ≤ zeroCeil)
  let inZero    = teRound(Math.max(0, Math.min(qdltcg, Math.max(0, zeroCeil - ordinaryPortion))));
  let remaining = teRound(qdltcg - inZero);

  // Amount of remaining QDLTCG eligible for 15% rate
  let startOf15 = Math.max(zeroCeil, ordinaryPortion);
  let inFifteen = teRound(Math.max(0, Math.min(remaining, Math.max(0, fifCeil - startOf15))));
  let inTwenty  = teRound(remaining - inFifteen);

  return teRound(inFifteen * 0.15 + inTwenty * 0.20);  // 0% contributes $0
}

// IRC §24 — Child Tax Credit and ACTC
function teCalcCTC(r, agi, totalTax, earnedIncome, fs, K) {
  // IRC §24(c)(1): qualifying child must be under 17 as of December 31
  let qc = (r.dependents || []).filter(d => d.isQualifyingChild && teIsUnder17(d.dob, r.taxYear));
  if (qc.length === 0) return { gross: 0, afterPhaseout: 0, nonRefundable: 0, actcRefundable: 0 };

  // IRC §24(a): $2,200 per qualifying child — OBBBA P.L. 119-21
  let gross = qc.length * K.ctc.amountPerChild;

  // IRC §24(b)(1): $50 reduction per $1,000 (or fraction) of AGI over threshold
  let thr       = K.ctc.phaseoutThreshold[fs] || K.ctc.phaseoutThreshold.single;
  let excess    = Math.max(0, agi - thr);
  let reduction = Math.ceil(excess / 1000) * 50;
  let ap        = Math.max(0, gross - reduction);

  // Non-refundable portion: limited to tax liability
  let nr = Math.min(ap, totalTax);

  // IRC §24(d): ACTC — refundable when CTC exceeds tax liability
  // ACTC = min(unusedCTC, min($1,700 × numQC, 15% × max(0, earnedIncome − $2,500)))
  // Source: Rev. Proc. 2024-40; irs.gov CTC page
  let unused = ap - nr;
  let actc   = 0;
  if (unused > 0) {
    let byEarned = Math.max(0, earnedIncome - K.ctc.earnedIncomeMin) * K.ctc.earnedIncomeRate;
    let maxACTC  = K.ctc.actcMax * qc.length;
    actc = Math.round(Math.min(unused, Math.min(maxACTC, byEarned)) * 100) / 100;
  }

  return { gross, afterPhaseout: ap, nonRefundable: nr, actcRefundable: actc };
}

// IRC §24(c)(1) — Age test: under 17 as of December 31 of tax year
function teIsUnder17(dob, taxYear) {
  if (!dob) return false;
  let birth = new Date(dob + 'T12:00:00'); // noon avoids DST edge
  let dec31 = new Date(taxYear, 11, 31);
  let age   = dec31.getFullYear() - birth.getFullYear();
  if (dec31 < new Date(taxYear, birth.getMonth(), birth.getDate())) age--;
  return age < 17;
}

// IRC §25A(b) — American Opportunity Tax Credit
function teCalcAOC(expenses, agi, fg, K) {
  if (!K) return { total: 0, nonRefundable: 0, refundable: 0 };
  // 100% of first $2,000 + 25% of next $2,000 = max $2,500
  let cr = Math.min(expenses, 2000) * K.aoc.creditOnFirst2k
         + Math.max(0, Math.min(expenses, 4000) - 2000) * K.aoc.creditOnNext2k;

  // IRC §25A(d): phase-out (STATUTORY thresholds)
  let lo = K.aoc.phaseoutLower[fg], hi = K.aoc.phaseoutUpper[fg];
  let m  = agi > lo ? Math.max(0, 1 - (agi - lo) / (hi - lo)) : 1;
  let crPO = cr * m;

  // IRC §25A(i): 40% refundable
  let ref = Math.min(crPO * K.aoc.refundablePct, K.aoc.maxRefundable);
  let nr  = crPO - ref;

  return {
    total:        Math.round(crPO * 100) / 100,
    nonRefundable: Math.round(nr  * 100) / 100,
    refundable:    Math.round(ref * 100) / 100
  };
}

// IRC §25A(c) — Lifetime Learning Credit (NOT refundable)
function teCalcLLC(expenses, agi, fg, K) {
  if (!K) return 0;
  let cr = Math.min(expenses, K.llc.maxExpenses) * K.llc.creditRate;
  let lo = K.llc.phaseoutLower[fg], hi = K.llc.phaseoutUpper[fg];
  if (agi > lo) cr *= Math.max(0, 1 - (agi - lo) / (hi - lo));
  return Math.round(cr * 100) / 100;
}

// IRC §25A — Education credits (CTC applied first; then AOC NR, then LLC vs remaining tax)
function teCalcEduCredits(r, agi, taxAfterCTC, fs, K) {
  if (!K) return { aocNonRefundable: 0, aocRefundable: 0, llcCredit: 0 };
  // IRC §25A(g)(6): No credit allowed to a married taxpayer who does not file a joint return.
  // MFS filers are categorically ineligible for both AOC and LLC.
  // Source: uscode.house.gov/view.xhtml?req=granuleid:USC-prelim-title26-section25A
  if (fs === 'mfs') return { aocNonRefundable: 0, aocRefundable: 0, llcCredit: 0 };
  let fg  = (fs === 'mfj' || fs === 'qss') ? 'mfj' : 'single';
  let students = r.educationStudents || [];
  let aocNR = 0, aocRef = 0, llc = 0;

  students.forEach(s => {
    let exp = parseFloat(s.expenses) || 0;
    if (s.creditType === 'aoc') {
      let c = teCalcAOC(exp, agi, fg, K);
      aocNR += c.nonRefundable; aocRef += c.refundable;
    } else if (s.creditType === 'llc') {
      llc += teCalcLLC(exp, agi, fg, K);
    }
  });

  // Cap non-refundable education credits against remaining tax liability
  let rem      = Math.max(0, taxAfterCTC);
  let cappedNR = Math.min(aocNR, rem);
  let cappedLL = Math.min(llc, Math.max(0, rem - cappedNR));

  return {
    aocNonRefundable: Math.round(cappedNR   * 100) / 100,
    aocRefundable:    Math.round(aocRef     * 100) / 100,
    llcCredit:        Math.round(cappedLL   * 100) / 100
  };
}


// ──────────────────────────────────────────────────────────────────────
//  METER UPDATE
// ──────────────────────────────────────────────────────────────────────

function teUpdateMeter(calc, K, fs) {
  teM('te-m-wages',    teFmt(calc.w2Wages));

  // SE income row
  let seIncRow = document.getElementById('te-m-se-inc-row');
  if (seIncRow) { seIncRow.style.display = calc.netSEIncome > 0 ? 'flex' : 'none'; teM('te-m-se-inc', teFmt(calc.netSEIncome)); }

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
  teM('te-m-taxable',  teFmt(calc.taxableIncome));
  teM('te-m-regtax',   teFmt(calc.regularTax));
  teM('te-m-ctc',     calc.ctcNonRefundable > 0 ? '(' + teFmt(calc.ctcNonRefundable) + ')' : '$0');
  teM('te-m-edu',     calc.totalEduNonRefundable > 0 ? '(' + teFmt(calc.totalEduNonRefundable) + ')' : '$0');
  teM('te-m-taxaft',   teFmt(calc.taxAfterNRCredits || 0));

  // SE tax row in meter (post-credit)
  let seTaxMRow = document.getElementById('te-m-setax-row');
  if (seTaxMRow) { seTaxMRow.style.display = calc.seTax > 0 ? 'flex' : 'none'; teM('te-m-setax', teFmt(calc.seTax)); }

  // NIIT and Additional Medicare rows
  let niitMRow = document.getElementById('te-m-niit-row');
  if (niitMRow) { niitMRow.style.display = calc.niit > 0 ? 'flex' : 'none'; teM('te-m-niit', teFmt(calc.niit)); }
  let amMRow = document.getElementById('te-m-am-row');
  if (amMRow) { amMRow.style.display = calc.addlMedicareTax > 0 ? 'flex' : 'none'; teM('te-m-am', teFmt(calc.addlMedicareTax)); }

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

function teM(id, val) { let e = document.getElementById(id); if (e) e.textContent = val; }


// ──────────────────────────────────────────────────────────────────────
//  SECTION STATUS (nav checkmarks)
// ──────────────────────────────────────────────────────────────────────

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


// ──────────────────────────────────────────────────────────────────────
//  RETURN STATUS (from Return Center row)
// ──────────────────────────────────────────────────────────────────────

function teSetStatus(status) {
  if (!teCurrentReturn) return;
  teCurrentReturn.status = status;
}


// ──────────────────────────────────────────────────────────────────────
//  SAVE / LOAD / SERIALIZE
// ──────────────────────────────────────────────────────────────────────

function teSaveReturn() {
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
    scheduleC:          r.scheduleC          || { netProfit: '' },
    alimony:            r.alimony            || { paid: '', preAgreement: false },
    estimatedPayments:  r.estimatedPayments  || { q1: '', q2: '', q3: '', q4: '' },
    schedule1099:       r.schedule1099       || { interestIncome: '', ordinaryDividends: '', qualifiedDividends: '' },
    scheduleD:          r.scheduleD          || { netSTCG: '', netLTCG: '', priorYearCarryforward: '' },
    scheduleE:          r.scheduleE          || [],
    investmentInterest: r.investmentInterest || { expense: '', priorYearCarryforward: '', includeQDinNII: false },
    deductionType:      r.deductionType      || 'standard',
    educationStudents: r.educationStudents || [],
    agiAdjustments:    r.agiAdjustments    || { studentLoanInterest: '', hsaCoverageType: 'self', hsaContributions: '', hsaTaxpayerAge55: false, iraContributions: '', iraAge50Plus: false, iraActiveParticipant: false, iraSpouseActive: false },
    scheduleA:         r.scheduleA         || { stateIncomeTax: '', localIncomeTax: '', realEstateTax: '', personalPropertyTax: '', mortgageInterest: '', mortgageBalance: '', mortgageLoanDate: 'post2017', mortgagePurpose: 'acquisition', cashCharitable: '', nonCashCharitable: '', medicalExpenses: '', mfsSpouseItemizes: false },
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
  if (!r.scheduleC)           r.scheduleC           = { netProfit: '' };
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
  if (!r.scheduleD)          r.scheduleD          = { netSTCG: '', netLTCG: '', priorYearCarryforward: '' };
  if (!r.scheduleE)          r.scheduleE          = [];
  if (!r.investmentInterest) r.investmentInterest = { expense: '', priorYearCarryforward: '', includeQDinNII: false };
  if (!r.annotations)        r.annotations        = [];
  return r;
}


// ──────────────────────────────────────────────────────────────────────
//  HELPERS
// ──────────────────────────────────────────────────────────────────────

function teFmt(n) {
  if (n === null || n === undefined || isNaN(n)) return '$0';
  return '$' + Math.round(n).toLocaleString('en-US');
}

// ── Cent-precision rounding for intermediate calc values ──────────────
function teRound(n) { return Math.round(n * 100) / 100; }


// ──────────────────────────────────────────────────────────────────────
//  UNSAVED CHANGES — SIDEBAR NAVIGATION GUARD
//  Wraps switchDashTab so any navigation away from an open return
//  with unsaved changes triggers a Save / Discard modal first.
//  Runs once at script load after dashboard.js has defined switchDashTab.
// ──────────────────────────────────────────────────────────────────────
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
