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
function teCalcHSA(adj, K, w2Box12W) {
  let contributions = parseFloat(adj.hsaContributions) || 0;
  if (contributions <= 0) return 0;
  let limit = (adj.hsaCoverageType === 'family') ? K.hsa.limitFamily : K.hsa.limitSelf;
  // IRC §223(b)(3)(B): age 55+ catch-up — statutory $1,000
  if (adj.hsaTaxpayerAge55) limit += K.hsa.catchUp;
  // IRC §223(b)(1), §223(d)(2): employer contributions (W-2 Box 12W) reduce the deductible limit
  // — employee may only deduct contributions up to limit minus what employer already contributed
  // Source: uscode.house.gov/view.xhtml?req=granuleid:USC-prelim-title26-section223
  limit = Math.max(0, limit - (w2Box12W || 0));
  return Math.min(contributions, limit);
}
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
function teCalcAlimony(alimony) {
  if (!alimony.preAgreement) return 0;  // post-2018 → not deductible per TCJA §11051
  return teRound(Math.max(0, parseFloat(alimony.paid) || 0));
}
function teCalcSALT(schedA, agi, K, fs) {
  let Ks = K.scheduleA.salt;
  // State income tax OR general sales tax — cannot use both — IRC §164(b)(5)(B)
  let stateTax = schedA.useSalesTax
    ? (parseFloat(schedA.salesTax) || 0)
    : (parseFloat(schedA.stateIncomeTax) || 0);
  // Other deductible taxes — IRC §164(a): ad valorem property taxes, foreign taxes, etc.
  let otherTaxesTotal = ((schedA.otherTaxes || []).reduce((s, row) => s + (parseFloat(row.amount) || 0), 0));
  let paid = stateTax
           + (parseFloat(schedA.localIncomeTax)      || 0)
           + (parseFloat(schedA.realEstateTax)        || 0)
           + (parseFloat(schedA.personalPropertyTax)  || 0)
           + otherTaxesTotal;
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
function teCalcMortgageInterest(schedA, agi, K, fs) {
  let Km = K.scheduleA.mortgage;

  // IRC §163(h)(3)(C): primary Form 1098 interest is deductible ONLY if debt was used to
  // acquire, build, or substantially improve the qualified residence.
  // Source: uscode.house.gov/view.xhtml?req=granuleid:USC-prelim-title26-section163
  let primaryInterest = (schedA.mortgagePurpose !== 'home_equity_personal')
    ? (parseFloat(schedA.mortgageInterest) || 0)
    : 0;

  // Prorate primary interest if outstanding balance exceeds acquisition debt limit
  if (primaryInterest > 0) {
    let balance  = parseFloat(schedA.mortgageBalance) || 0;
    let loanDate = schedA.mortgageLoanDate || 'post2017';
    // MFS limits: half the joint/single limits — IRC §163(h)(3)(F) proration applies equally
    let limit = (fs === 'mfs')
      ? ((loanDate === 'pre2018') ? Km.mfsPre2018Limit  : Km.mfsPost2017Limit)
      : ((loanDate === 'pre2018') ? Km.pre2018Limit      : Km.post2017Limit);
    if (balance > 0 && balance > limit) {
      primaryInterest = Math.round(primaryInterest * (limit / balance) * 100) / 100;
    }
  }

  // Other qualified home loan interest not on Form 1098 — Line 8b
  let otherInterest = parseFloat(schedA.mortgageInterestOther) || 0;
  // Deductible points not reported on Form 1098 — IRC §461
  let points        = parseFloat(schedA.mortgagePoints) || 0;

  // PMI — OBBBA §70108: IRC §163(h)(3)(E) reinstated for TY beginning after 12/31/2025
  // Phases out at 10% per $1,000 of AGI above start; fully phased at end — OBBBA §70108
  let pmiDeductible = 0;
  if (Km.pmi && (parseFloat(schedA.pmiPremiums) || 0) > 0) {
    let pmiAmt   = parseFloat(schedA.pmiPremiums);
    let pmiStart = (fs === 'mfs') ? Km.pmi.phaseoutStartMfs : Km.pmi.phaseoutStart;
    let pmiEnd   = (fs === 'mfs') ? Km.pmi.phaseoutEndMfs   : Km.pmi.phaseoutEnd;
    if (agi <= pmiStart) {
      pmiDeductible = pmiAmt;
    } else if (agi < pmiEnd) {
      // Each $1,000 (or fraction thereof) of AGI above start reduces deductible PMI by 10%
      let fullThousands = Math.ceil((agi - pmiStart) / 1000);
      pmiDeductible = Math.max(0, pmiAmt * (1 - fullThousands * Km.pmi.ratePerThousand));
      pmiDeductible = Math.round(pmiDeductible * 100) / 100;
    }
    // agi >= pmiEnd: pmiDeductible remains 0
  }

  return teRound(primaryInterest + otherInterest + points + pmiDeductible);
}
function teCalcCharitable(schedA, agi, K) {
  // Returns { total, cash60, noncash50, cg30, priv20, totalBuckets, floorReduction }
  let zero = { total: 0, cash60: 0, noncash50: 0, cg30: 0, priv20: 0, totalBuckets: 0, floorReduction: 0 };
  if (agi <= 0) return zero;
  let Kc = K.scheduleA.charitable;

  // Include prior-year carryovers with current-year contributions — IRC §170(d)(1)
  let co = schedA.charCarryover || {};
  let cashRaw   = (parseFloat(schedA.cashCharitable)     || 0) + (parseFloat(co.cash60)    || 0);
  let ncRaw     = (parseFloat(schedA.nonCashCharitable)  || 0) + (parseFloat(co.noncash50) || 0);
  let cg30Raw   = (parseFloat(schedA.capGainCharitable30)|| 0) + (parseFloat(co.capgain30) || 0);
  let priv20Raw = (parseFloat(schedA.capGainCharitable20)|| 0) + (parseFloat(co.private20) || 0);

  if (cashRaw <= 0 && ncRaw <= 0 && cg30Raw <= 0 && priv20Raw <= 0) return zero;

  // IRC §170 AGI limits — applied in priority order per IRS Pub. 526
  let cap60  = agi * Kc.cashAgiLimit;                                          // 60% overall combined cap
  let cap50  = agi * Kc.nonCashAgiLimit;                                       // 50% non-cash to 50% orgs
  let cap30  = Kc.capGain30Limit  ? agi * Kc.capGain30Limit  : 0;             // 30% cap gain to 50% orgs
  let cap20  = Kc.private20Limit  ? agi * Kc.private20Limit  : 0;             // 20% cap gain to private fndns

  // Step 1: Cash — limited to 60% of AGI — IRC §170(b)(1)(G)
  let cash60 = Math.min(cashRaw, cap60);
  let rem60  = cap60 - cash60;

  // Step 2: Non-cash to 50% orgs — limited to 50% of AGI and remaining 60% room — IRC §170(b)(1)(A)
  let noncash50 = Math.min(ncRaw, cap50, rem60);
  let rem60b    = rem60 - noncash50;
  let rem50     = cap50 - noncash50;

  // Step 3: Capital gain property to 50% orgs — limited to 30% of AGI and remaining 50%/60% room
  // IRC §170(b)(1)(C): cap gain property to 50% orgs uses remaining capacity from the 50% non-cash bucket
  let cg30 = cap30 > 0 ? Math.min(cg30Raw, cap30, rem50, rem60b) : 0;
  let rem60c = rem60b - cg30;
  let rem30  = cap30 - cg30;

  // Step 4: Capital gain to private foundations — limited to 20% of AGI, remaining 30%/60% room
  // IRC §170(b)(1)(D)
  let priv20 = cap20 > 0 ? Math.min(priv20Raw, cap20, rem30, rem60c) : 0;

  let totalBuckets = teRound(cash60 + noncash50 + cg30 + priv20);

  // OBBBA §70115 — 0.5% AGI floor: first 0.5% of AGI in charitable contributions not deductible
  // Effective TY2026+. For TY2025, Kc.agiFloor is undefined — no floor applies.
  let floorReduction = 0;
  if (Kc.agiFloor && totalBuckets > 0) {
    floorReduction = teRound(Math.min(totalBuckets, agi * Kc.agiFloor));
  }

  let total = teRound(Math.max(0, totalBuckets - floorReduction));
  return { total, cash60, noncash50, cg30, priv20, totalBuckets, floorReduction };
}
function teCalcMedical(schedA, agi, K) {
  let expenses = parseFloat(schedA.medicalExpenses) || 0;
  if (expenses <= 0 || agi <= 0) return 0;
  let floor = agi * K.scheduleA.medical.agiFloor;  // 7.5% of AGI
  return Math.max(0, Math.round((expenses - floor) * 100) / 100);
}
function teCalcCasualty(schedA, agi, K) {
  // IRC §165(h) — Casualty and Theft Losses
  // TY2025: federally declared disasters only — IRC §165(h)(5)(A) (TCJA §11044)
  // TY2026+: federally OR state-declared disasters — OBBBA §70112 expanded IRC §165(h)(5)
  // Per-event floor: IRC §165(h)(1) — $100 per event — STATUTORY
  // AGI floor: IRC §165(h)(2)(A)(ii) — 10% of AGI applied to aggregate after per-event floors — STATUTORY
  let events = schedA.casualtyEvents || [];
  if (events.length === 0 || agi <= 0) return 0;
  let Kc = K.scheduleA.casualty;
  let totalLoss = 0;
  events.forEach(ev => {
    if (!ev.federallyDeclared && !ev.stateDeclared) return;  // must be qualifying disaster
    let fmvBefore = parseFloat(ev.fmvBefore)  || 0;
    let fmvAfter  = parseFloat(ev.fmvAfter)   || 0;
    let insurance = parseFloat(ev.insurance)  || 0;
    // IRC §165(h): loss = min(adjusted basis, decline in FMV) minus insurance
    // Engine uses FMV decline (most common basis; taxpayer-certified)
    let decline = Math.max(0, fmvBefore - fmvAfter);
    let loss = Math.max(0, decline - insurance);
    // IRC §165(h)(1): $100 per-event floor
    loss = Math.max(0, loss - Kc.perEventFloor);
    totalLoss += loss;
  });
  if (totalLoss <= 0) return 0;
  // IRC §165(h)(2)(A)(ii): 10% of AGI floor applied to aggregate
  return teRound(Math.max(0, totalLoss - agi * Kc.agiFloor));
}
function teCalcGambling(schedA, schedule1, K) {
  // IRC §165(d): gambling losses deductible only to the extent of gambling winnings.
  // OBBBA §70114: effective TY2026+, losses limited to 90% of winnings (was 100%).
  // Winnings source: Schedule 1, Line 8b — must be entered separately in income section.
  let losses   = parseFloat(schedA.gamblingLosses)       || 0;
  let winnings = parseFloat((schedule1 || {}).l8b)        || 0;
  if (losses <= 0 || winnings <= 0) return 0;
  let Kg = (K.scheduleA.gambling) || { lossRate: 1.00 };
  let allowedWinnings = teRound(winnings * Kg.lossRate);
  return teRound(Math.min(losses, allowedWinnings));
}
function teCalcItemizedHaircut(itemizedRaw, agi, K, fs) {
  // OBBBA §70111: 2/37ths haircut on itemized deductions for 37%-bracket taxpayers.
  // Reduction = (2/37) × min(itemizedTotal, income taxed at 37% rate)
  // "Income at 37%" = max(0, taxable income − 37% bracket threshold)
  // Circular dependency resolved with single-pass AGI approximation:
  //   taxableEstimate = max(0, AGI − itemizedRaw) — not actual taxableIncome (avoids circularity)
  // Source: OBBBA P.L. 119-21 §70111
  let Kh = (K.scheduleA && K.scheduleA.itemizedHaircut);
  if (!Kh || itemizedRaw <= 0) return 0;  // No haircut for TY2025 (Kh undefined)
  // Approximate taxable income using itemizedRaw (pre-QBI, single-pass)
  let taxableEst = Math.max(0, agi - itemizedRaw);
  if (taxableEst <= 0) return 0;
  // Find the floor of the 37% bracket from tax brackets
  let bKey = (fs === 'qss') ? 'mfj' : fs;
  let brackets = K.brackets[bKey] || K.brackets.single;
  let threshold37 = 0;
  for (let i = 0; i < brackets.length; i++) {
    if (brackets[i][1] === 0.37 && i > 0) { threshold37 = brackets[i-1][0]; break; }
  }
  let incomeAt37 = Math.max(0, taxableEst - threshold37);
  if (incomeAt37 <= 0) return 0;  // Taxpayer not in 37% bracket — no haircut
  let haircutBase = Math.min(itemizedRaw, incomeAt37);
  return teRound(haircutBase * Kh.numerator / Kh.denominator);
}
function teCalcSS86(benefits, prelimAGI, taxExemptInterest, fs, mfsLivedWithSpouse) {
  benefits = teRound(Math.max(0, parseFloat(benefits) || 0));
  if (benefits === 0) return { gross: 0, taxable: 0, provisionalIncome: 0, taxablePct: 0 };

  // MFS filer who lived with spouse at any time during the year: 85% taxable on dollar one
  // No provisional income test — IRC §86(c)(2)
  if (fs === 'mfs' && mfsLivedWithSpouse) {
    let taxable = teRound(benefits * 0.85);
    return { gross: benefits, taxable, provisionalIncome: null, taxablePct: 0.85, mfsPenalty: true };
  }

  // Provisional income = AGI (without SS) + tax-exempt interest + 50% of benefits
  // IRC §86(b)(1)
  let pi = teRound(prelimAGI + (parseFloat(taxExemptInterest) || 0) + benefits * 0.50);

  // Thresholds — IRC §86(c) — statutory, not inflation-adjusted since 1993
  let t1, t2, tier1Cap;
  if (fs === 'mfj') {
    t1 = 32000; t2 = 44000;  // IRC §86(c)(1)(B)
    tier1Cap = teRound((t2 - t1) * 0.50);  // $6,000
  } else {
    // Single, HOH, QSS, MFS lived-apart-all-year — IRC §86(c)(1)(A)
    t1 = 25000; t2 = 34000;
    tier1Cap = teRound((t2 - t1) * 0.50);  // $4,500
  }

  let taxable;
  if (pi <= t1) {
    // Below base amount — 0% taxable — IRC §86(a)(1)
    taxable = 0;
  } else if (pi <= t2) {
    // Tier 1: lesser of 50% of benefits OR 50% of (PI − t1) — IRC §86(a)(1)
    taxable = teRound(Math.min(benefits * 0.50, (pi - t1) * 0.50));
  } else {
    // Tier 2: lesser of 85% of benefits OR 85% of (PI − t2) + tier1Cap — IRC §86(a)(2)
    taxable = teRound(Math.min(benefits * 0.85, (pi - t2) * 0.85 + tier1Cap));
  }

  // Hard ceiling: taxable cannot exceed 85% of benefits — IRC §86(a)(2)(A) / §86(a)(1)(A)
  taxable = teRound(Math.min(taxable, benefits * 0.85));
  let taxablePct = benefits > 0 ? taxable / benefits : 0;
  return { gross: benefits, taxable, provisionalIncome: pi, taxablePct, mfsPenalty: false };
}
function teRecalculate() {
  if (!teCurrentReturn) return;
  let yr = teCurrentReturn.taxYear || teActiveYear;
  let K  = TAX_CONSTANTS[yr];
  if (!K) return;

  let fs   = teCurrentReturn.filingStatus || 'single';
  let calc = {};

  // ── Step 1: Gross Income — IRC §61 ──────────────────────────────────

  // ── Step 1 pre: Compute Schedule C line-by-line from detailed form ───
  // If the user has entered detailed income/expense data, derive netProfit from
  // the full form (line 31). Otherwise, preserve the legacy single-field netProfit.
  // IRC §162 — ordinary and necessary business expenses; IRC §61(a)(2) — gross income
  let sc      = teCurrentReturn.scheduleC || {};
  let scExp   = sc.expenses  || {};
  let scPIII  = sc.partIII   || {};
  let scOtherRows = sc.otherExpenseRows || [];

  // Part III — Cost of Goods Sold (feeds Part I line 4)
  let scL35 = teRound(parseFloat(scPIII.inventoryBegin) || 0);
  let scL36 = teRound(parseFloat(scPIII.purchases)      || 0);
  let scL37 = teRound(parseFloat(scPIII.costOfLabor)    || 0);
  let scL38 = teRound(parseFloat(scPIII.materials)      || 0);
  let scL39 = teRound(parseFloat(scPIII.otherCosts)     || 0);
  let scL40 = teRound(scL35 + scL36 + scL37 + scL38 + scL39);
  let scL41 = teRound(parseFloat(scPIII.inventoryEnd)   || 0);
  let scL42 = teRound(Math.max(0, scL40 - scL41));  // COGS

  // Part V — Other Expenses (feeds Part II line 27b)
  let scL48 = teRound(scOtherRows.reduce((s, row) => s + (parseFloat(row.amount) || 0), 0));

  // Part I — Income (IRC §61)
  let scL1  = teRound(parseFloat(sc.grossReceipts)     || 0);
  let scL2  = teRound(parseFloat(sc.returnsAllowances) || 0);
  let scL3  = teRound(scL1 - scL2);
  let scL4  = scL42;                                         // from Part III
  let scL5  = teRound(scL3 - scL4);
  let scL6  = teRound(parseFloat(sc.otherIncome)       || 0);
  let scL7  = teRound(scL5 + scL6);                         // IRC §61 gross income

  // Part II — Expenses (IRC §162)
  let scL8   = teRound(parseFloat(scExp.advertising)       || 0);
  let scL9   = teRound(parseFloat(scExp.carTruck)          || 0);
  let scL10  = teRound(parseFloat(scExp.commissions)       || 0);
  let scL11  = teRound(parseFloat(scExp.contractLabor)     || 0);
  let scL12  = teRound(parseFloat(scExp.depletion)         || 0);
  let scL13  = teRound(parseFloat(scExp.depreciation)      || 0);
  let scL14  = teRound(parseFloat(scExp.employeeBenefits)  || 0);
  let scL15  = teRound(parseFloat(scExp.insurance)         || 0);
  let scL16a = teRound(parseFloat(scExp.interestMortgage)  || 0);
  let scL16b = teRound(parseFloat(scExp.interestOther)     || 0);
  let scL17  = teRound(parseFloat(scExp.legalProfessional) || 0);
  let scL18  = teRound(parseFloat(scExp.officeExpense)     || 0);
  let scL19  = teRound(parseFloat(scExp.pension)           || 0);
  let scL20a = teRound(parseFloat(scExp.rentVehicles)      || 0);
  let scL20b = teRound(parseFloat(scExp.rentProperty)      || 0);
  let scL21  = teRound(parseFloat(scExp.repairs)           || 0);
  let scL22  = teRound(parseFloat(scExp.supplies)          || 0);
  let scL23  = teRound(parseFloat(scExp.taxesLicenses)     || 0);
  let scL24a = teRound(parseFloat(scExp.travel)            || 0);
  let scL24b = teRound(parseFloat(scExp.meals)             || 0);
  let scL25  = teRound(parseFloat(scExp.utilities)         || 0);
  let scL26  = teRound(parseFloat(scExp.wages)             || 0);
  let scL27a = teRound(parseFloat(scExp.energyBuildings)   || 0);
  let scL27b = scL48;                                        // from Part V
  let scL28  = teRound(scL8+scL9+scL10+scL11+scL12+scL13+scL14+scL15+scL16a+scL16b+
                       scL17+scL18+scL19+scL20a+scL20b+scL21+scL22+scL23+
                       scL24a+scL24b+scL25+scL26+scL27a+scL27b);

  // Lines 29–31 — Net Profit or (Loss)
  let scL29  = teRound(scL7 - scL28);   // tentative profit
  // Line 30 — Home office: simplified method or Form 8829
  let scL30;
  if (sc.homeOfficeMethod !== 'form8829') {
    let bSqFt = parseFloat(sc.businessSqFt) || 0;
    scL30 = teRound(Math.min(bSqFt, 300) * 5);  // §280A(c)(5): $5/sqft, max 300 sqft
  } else {
    scL30 = teRound(parseFloat(sc.homeOffice) || 0);
  }
  let scL31 = teRound(scL29 - scL30);   // IRC §162 — net profit/loss → Sch. 1 Line 3

  // Persist all SC lines for the form renderer
  calc.scLines = {
    l1:scL1, l2:scL2, l3:scL3, l4:scL4, l5:scL5, l6:scL6, l7:scL7,
    l8:scL8, l9:scL9, l10:scL10, l11:scL11, l12:scL12, l13:scL13,
    l14:scL14, l15:scL15, l16a:scL16a, l16b:scL16b, l17:scL17, l18:scL18,
    l19:scL19, l20a:scL20a, l20b:scL20b, l21:scL21, l22:scL22, l23:scL23,
    l24a:scL24a, l24b:scL24b, l25:scL25, l26:scL26, l27a:scL27a, l27b:scL27b,
    l28:scL28, l29:scL29, l30:scL30, l31:scL31,
    l35:scL35, l36:scL36, l37:scL37, l38:scL38, l39:scL39, l40:scL40, l41:scL41, l42:scL42,
    l48:scL48
  };

  // Sync sc.netProfit from the computed line 31 whenever the return was created with the
  // detailed Schedule C form. Detection: sc.grossReceipts is undefined ONLY on pre-engine
  // legacy returns (created before the detailed form existed) that store a hand-entered
  // netProfit as a single field. All current returns have sc.grossReceipts = '' (from
  // teEmptyReturn) so the check is always true for them.
  //
  // BUG FIX: the previous guard `if (scDetailedActive)` (non-zero fields only) caused
  // sc.netProfit to retain its last computed value when the user cleared all fields back to
  // empty — scDetailedActive became false, the override was skipped, and the stale
  // netProfit flowed through to grossIncome and Schedule 1 Line 3.
  let scDetailedActive = scL1 > 0 || scL6 > 0 || scL42 > 0 || scL28 > 0 || scL48 > 0;
  if (sc.grossReceipts !== undefined) sc.netProfit = String(scL31);

  let seData_       = teCurrentReturn.scheduleSE || {};
  calc.w2Wages      = teRound((teCurrentReturn.w2 || []).reduce((s, w) => s + (parseFloat(w.box1)||parseFloat(w.wages)||0), 0));
  // IRC §3121: SS wages (Box 3 sum) — computed here (before SE calc) because Schedule SE Line 8a uses it.
  // Full FICA formula: Box 3 = min(box1 + box7, ssWageBase). Box 7 excluded for now — see W-2 auto-fill in te-forms.js.
  calc.w2Box3     = teRound((teCurrentReturn.w2 || []).reduce((s, w) => s + (parseFloat(w.box3) || 0), 0));
  // IRC §219(g)(5): active participant flag — computed here (before teCalcIRA) because IRA phase-out depends on it.
  calc.w2Box13Ret = (teCurrentReturn.w2 || []).some(w => w.box13Retirement);
  // IRC §223(d)(2), §223(b)(1): W-2 Box 12W = employer HSA contributions — reduces employee's deductible limit.
  // Computed here (before teCalcHSA in Step 2b) so employer contributions correctly reduce the limit.
  // Source: uscode.house.gov/view.xhtml?req=granuleid:USC-prelim-title26-section223
  calc.w2Box12W = teRound((teCurrentReturn.w2 || []).reduce((s, w) =>
    s + ((w.box12 || []).reduce((a, r) => a + (r.code === 'W' ? (parseFloat(r.amount) || 0) : 0), 0)), 0));
  // IRC §129: W-2 Box 10 = employer-provided dependent care benefits — reduces CDCC qualifying expenses.
  // Computed here (before teCalcCDCC in Step 9a) so Box 10 benefits are included in the exclusion limit.
  // Source: uscode.house.gov/view.xhtml?req=granuleid:USC-prelim-title26-section129
  calc.w2Box10 = teRound((teCurrentReturn.w2 || []).reduce((s, w) => s + (parseFloat(w.box10) || 0), 0));
  // netSEIncome = Schedule C + Schedule F farm profit + CRP payments (all SE sources)
  // IRC §1402(a): net earnings from self-employment includes all trade/business net income
  calc.netSEIncome  = teRound(Math.max(0,
    (parseFloat(sc.netProfit)          || 0)
    + (parseFloat(seData_.farmProfit)  || 0)
    + (parseFloat(seData_.crpPayments) || 0)
  ));

  // Track 4: Investment income — IRC §61(a)(4),(7); §1221
  // ── 1099-INT aggregation ─────────────────────────────────────────────
  // Box 1: Ordinary interest → 1040 Line 2b (via Schedule B Line 4)
  // Box 2: Early withdrawal penalty → Schedule 1 Part II Line 18 (auto, no separate input)
  // Box 3: Interest on US savings bonds/Treasury obligations → Schedule B Part I only
  // Box 4: Federal tax withheld → payments
  // Box 8: Tax-exempt interest → 1040 Line 2a
  let int1099s = teCurrentReturn.int1099s || [];
  calc.interestIncome    = teRound(int1099s.reduce((s, e) => s + Math.max(0, parseFloat(e.box1) || 0), 0));
  calc.usSavingsInt      = teRound(int1099s.reduce((s, e) => s + Math.max(0, parseFloat(e.box3) || 0), 0));
  calc.taxExemptInterest = teRound(int1099s.reduce((s, e) => s + Math.max(0, parseFloat(e.box8) || 0), 0));
  calc.earlyWdPenalty    = teRound(int1099s.reduce((s, e) => s + Math.max(0, parseFloat(e.box2) || 0), 0));
  calc.intWithholding    = teRound(int1099s.reduce((s, e) => s + Math.max(0, parseFloat(e.box4) || 0), 0));
  // Schedule B Part I: total interest (ordinary + US savings bonds) — Line 2
  let sbIntManual = ((teCurrentReturn.schedB || {}).intManualPayers || [])
    .reduce((s, p) => s + (parseFloat(p.amount) || 0), 0);
  calc.schedBL2 = teRound(calc.interestIncome + calc.usSavingsInt + sbIntManual);
  // Schedule B Line 4: after Series EE/I exclusion (Form 8815) — feeds 1040 Line 2b
  // TODO: Form 8815 exclusion not yet implemented; line 3 passthrough is the full amount for now
  calc.schedBL4 = calc.schedBL2;
  // ── 1099-DIV aggregation ─────────────────────────────────────────────
  // Box 1a: Total ordinary dividends → 1040 Line 3b (via Schedule B Line 6)
  // Box 1b: Qualified dividends (subset of 1a) → 1040 Line 3a
  // Box 4: Federal tax withheld → payments
  let div1099s = teCurrentReturn.div1099s || [];
  calc.ordinaryDividends = teRound(div1099s.reduce((s, e) => s + Math.max(0, parseFloat(e.box1a) || 0), 0));
  let rawQD              = teRound(div1099s.reduce((s, e) => s + Math.max(0, parseFloat(e.box1b) || 0), 0));
  calc.divWithholding    = teRound(div1099s.reduce((s, e) => s + Math.max(0, parseFloat(e.box4)  || 0), 0));
  // Schedule B Part II: total dividends — Line 6 feeds 1040 Line 3b
  let sbDivManual = ((teCurrentReturn.schedB || {}).divManualPayers || [])
    .reduce((s, p) => s + (parseFloat(p.amount) || 0), 0);
  calc.schedBL6 = teRound(calc.ordinaryDividends + sbDivManual);
  // Qualified dividends must be ≤ ordinary dividends — IRC §1(h)(11)(B)
  calc.qualifiedDividends = teRound(Math.min(rawQD, calc.ordinaryDividends));
  // Social Security — read early; taxable amount computed after preliminary AGI
  // Box 5 (net benefits = Box 3 − Box 4) is what the taxpayer enters as 'benefits'.
  // Box 4 (repaid): if repayments > $3,000, IRC §1341 claim-of-right may apply — flagged only, not computed here.
  // Box 6 (withheld): voluntary federal withholding → 1040 Line 25b.
  let ss = teCurrentReturn.socialSecurity || {};
  calc.ssBenefitsGross = teRound(Math.max(0, parseFloat(ss.benefits) || 0));
  calc.ssWithholding   = teRound(Math.max(0, parseFloat(ss.withheld) || 0));

  // Schedule D — IRC §1221, §1222
  let sd    = teCurrentReturn.scheduleD || {};
  let stTxArr = sd.shortTermTransactions || [];
  let ltTxArr = sd.longTermTransactions  || [];

  // Per-transaction gain/loss: g = proceeds (d) - cost (e) + adjustments (f) — IRC §1001
  let stTxGains = stTxArr.map(tx => teRound((parseFloat(tx.proceeds)||0) - (parseFloat(tx.cost)||0) + (parseFloat(tx.adjustments)||0)));
  let ltTxGains = ltTxArr.map(tx => teRound((parseFloat(tx.proceeds)||0) - (parseFloat(tx.cost)||0) + (parseFloat(tx.adjustments)||0)));

  // Line 1a / 8a: aggregate totals across all transactions
  let sdL1aProc = teRound(stTxArr.reduce((s,tx) => s + (parseFloat(tx.proceeds)||0), 0));
  let sdL1aCost = teRound(stTxArr.reduce((s,tx) => s + (parseFloat(tx.cost)||0),     0));
  let sdL1aGain = teRound(stTxGains.reduce((s,g) => s + g, 0));
  let sdL8aProc = teRound(ltTxArr.reduce((s,tx) => s + (parseFloat(tx.proceeds)||0), 0));
  let sdL8aCost = teRound(ltTxArr.reduce((s,tx) => s + (parseFloat(tx.cost)||0),     0));
  let sdL8aGain = teRound(ltTxGains.reduce((s,g) => s + g, 0));

  // Part I additional lines
  let sdL4 = teRound(parseFloat(sd.stGainForm6252)  || 0);
  let sdL5 = teRound(parseFloat(sd.stGainK1)        || 0);
  let sdL6 = teRound(Math.abs(parseFloat(sd.stLossCarryover) || 0));  // always positive input → negative
  // Line 7 — Net short-term: §1222(5),(6)
  let sdL7 = teRound(sdL1aGain + sdL4 + sdL5 - sdL6);

  // Part II additional lines
  let sdL11 = teRound(parseFloat(sd.ltGainForm4797)          || 0);
  let sdL12 = teRound(parseFloat(sd.ltGainK1)                || 0);
  let sdL13 = teRound(parseFloat(sd.capitalGainDistributions) || 0);
  let sdL14 = teRound(Math.abs(parseFloat(sd.ltLossCarryover) || 0));  // always positive input → negative
  // Line 15 — Net long-term: §1222(7),(8)
  let sdL15 = teRound(sdL8aGain + sdL11 + sdL12 + sdL13 - sdL14);

  // Line 16 — combined net
  let sdL16 = teRound(sdL7 + sdL15);

  // Detailed mode: any transaction with data OR any additional line has a value
  let sdDetailedActive = stTxArr.some(tx => tx.proceeds || tx.cost || tx.description)
    || ltTxArr.some(tx => tx.proceeds || tx.cost || tx.description)
    || sdL4 || sdL5 || sdL6 || sdL11 || sdL12 || sdL13 || sdL14;

  if (sdDetailedActive) {
    // Use computed lines — stLossCarryover/ltLossCarryover already factored into lines 7 and 15
    calc.netSTCG           = sdL7;
    calc.netLTCG           = sdL15;
    calc.priorCapLossCF    = 0;
    calc.scheduleDCombined = sdL16;
  } else {
    // Legacy path: read aggregate net fields (backward compat for old returns)
    calc.netSTCG        = teRound(parseFloat(sd.netSTCG)               || 0);
    calc.netLTCG        = teRound(parseFloat(sd.netLTCG)               || 0);
    calc.priorCapLossCF = teRound(Math.max(0, parseFloat(sd.priorYearCarryforward) || 0));
    calc.scheduleDCombined = teRound(calc.netSTCG + calc.netLTCG - calc.priorCapLossCF);
  }

  // IRC §1211(b)(1): max deductible capital loss = $3,000 ($1,500 if MFS)
  let sdLossCap = (fs === 'mfs') ? 1500 : K.capitalGains.netLossDeductionCap;
  if (calc.scheduleDCombined >= 0) {
    calc.scheduleDNet        = calc.scheduleDCombined;
    calc.capLossCarryforward = 0;
  } else {
    calc.scheduleDNet        = teRound(Math.max(-sdLossCap, calc.scheduleDCombined));
    calc.capLossCarryforward = teRound(Math.abs(calc.scheduleDCombined) - sdLossCap);
    if (calc.capLossCarryforward < 0) calc.capLossCarryforward = 0;
  }

  // Part III summary values (stored for form display — no additional IRC computation needed)
  let sdL17yes = sdL15 > 0 && sdL16 > 0;
  let sdL21    = calc.scheduleDCombined < 0 ? teRound(Math.max(-sdLossCap, calc.scheduleDCombined)) : 0;
  calc.sdLines = {
    line1aProc: sdL1aProc, line1aCost: sdL1aCost, line1aGain: sdL1aGain,
    line8aProc: sdL8aProc, line8aCost: sdL8aCost, line8aGain: sdL8aGain,
    l4: sdL4, l5: sdL5, l6: sdL6, l7: sdL7,
    l11: sdL11, l12: sdL12, l13: sdL13, l14: sdL14, l15: sdL15,
    l16: sdL16, l17yes: sdL17yes, l21: sdL21,
    stTxGains, ltTxGains,
    capLossCarryforward: calc.capLossCarryforward,
    detailedActive: sdDetailedActive
  };

  // Schedule E — pass-through income/loss — IRC §702 (partnerships), §1366 (S-corps)
  // IRC §469(a): passive activity losses can only offset passive activity income — excess suspended.
  // IRC §469(i): rental real estate with active participation: up to $25K allowance against non-passive
  // income, subject to AGI phase-out. Applied retroactively in Step 3a after AGI is known.
  let seEntities        = teCurrentReturn.scheduleE || [];
  // Split passive pool: §469(i)-eligible (rental + active participant) vs other passive — for Step 3a
  let seRentalActive    = seEntities.filter(e => e.isPassive && e.isRentalRealEstate && e.activelyParticipates);
  let seOtherPassive    = seEntities.filter(e => e.isPassive && !(e.isRentalRealEstate && e.activelyParticipates));
  calc.rentalActiveNet     = teRound(seRentalActive.reduce((s, e) => s + (parseFloat(e.incomeAmount) || 0), 0));
  let otherPassiveNet_     = teRound(seOtherPassive.reduce((s, e) => s + (parseFloat(e.incomeAmount) || 0), 0));
  calc.scheduleEPassive    = teRound(calc.rentalActiveNet + otherPassiveNet_);
  calc.scheduleENonPassive = teRound(seEntities.filter(e => !e.isPassive).reduce((s, e) => s + (parseFloat(e.incomeAmount) || 0), 0));
  // Pass 1: all passive losses suspended — §469(i) allowance applied retroactively in Step 3a
  calc.scheduleEPassiveDeductible = teRound(Math.max(0, calc.scheduleEPassive));
  calc.passiveLossSuspended       = teRound(calc.scheduleEPassive < 0 ? Math.abs(calc.scheduleEPassive) : 0);
  // Track rental-active loss separately so Step 3a knows how much §469(i) can unlock
  calc.rentalActiveLoss = teRound(Math.max(0, -calc.rentalActiveNet));
  // Non-passive losses flow through without restriction (e.g., general partner, material participation)
  calc.scheduleENet = teRound(calc.scheduleEPassiveDeductible + calc.scheduleENonPassive);

  // IRA & Pension/Annuity distributions — unified r1099s[] — IRC §72, §408; 1040 Lines 4a/4b, 5a/5b
  // Box 7 distribution codes that carry a §72(t) penalty:
  //   '1' → Early distribution, no known exception → 10% — IRC §72(t)(1)
  //   'S' → Early distribution from SIMPLE IRA, < 2 years participation → 25% — IRC §72(t)(6)
  //   All other codes (2,3,4,5,6,7,8,A,B,C,D,E,F,G,H,J,K,L,M,N,P,Q,R,T,U,W) → 0%
  let r1099s    = teCurrentReturn.r1099s || [];
  let iraEntries = r1099s.filter(e => e.type === 'ira');
  let penEntries = r1099s.filter(e => e.type === 'pension');
  calc.iraGross       = teRound(iraEntries.reduce((s, e) => s + (parseFloat(e.box1)  || 0), 0));
  calc.iraTaxable     = teRound(iraEntries.reduce((s, e) => s + (parseFloat(e.box2a) || 0), 0));
  calc.pensionGross   = teRound(penEntries.reduce((s, e) => s + (parseFloat(e.box1)  || 0), 0));
  calc.pensionTaxable = teRound(penEntries.reduce((s, e) => s + (parseFloat(e.box2a) || 0), 0));
  // Federal withholding from 1099-R Box 4 → 1040 Line 25b
  calc.r1099Withholding = teRound(r1099s.reduce((s, e) => s + (parseFloat(e.box4) || 0), 0));
  // Early withdrawal penalty — IRC §72(t): determined by Box 7 distribution code
  calc.earlyWithdrawalPenalty = teRound(
    r1099s.reduce((s, e) => {
      let taxable = parseFloat(e.box2a) || 0;
      let code    = (e.box7 || '').trim().toUpperCase();
      let rate    = code === '1' ? 0.10 : code === 'S' ? 0.25 : 0;
      return s + taxable * rate;
    }, 0)
  );

  // ── Schedule 1, Part I — Additional Income ──────────────────────────────
  // IRS Schedule 1, Part I collects additional income not reported directly on Form 1040.
  // Lines 3, 5, 6 are auto-populated from existing engine data (already in grossIncome).
  // Lines 1, 2a, 4, 7, 8a–8z are new editable items added to calc.sched1Extra below.
  let s1 = teCurrentReturn.schedule1 || {};

  // Line 1 — Taxable state/local refunds — IRC §111(a): only taxable if prior deduction yielded benefit
  let s1L1  = teRound(parseFloat(s1.taxRefunds)    || 0);

  // Line 2a — Alimony received — pre-2019 divorce/separation agreements only
  // Post-TCJA: agreements executed after Dec 31, 2018 → NOT includible — IRC §71 repealed by P.L. 115-97
  let s1L2a = teRound(parseFloat(s1.alimonyReceived) || 0);

  // Line 3 — Schedule C net profit/(loss) — computed above as scL31; auto, already in grossIncome
  let s1L3display = teRound(parseFloat(sc.netProfit) || 0);  // display only; not added to sched1Extra

  // Line 4 — Other gains/(losses) — Form 4797 / Form 4684
  let s1L4  = teRound(parseFloat(s1.otherGains) || 0);

  // Line 5 — Schedule E — auto from calc.scheduleENet (already in grossIncome) — display only
  // Line 6 — Farm income/(loss) — auto from scheduleSE (already in grossIncome via netSEIncome) — display only
  let seData_s1   = teCurrentReturn.scheduleSE || {};
  let s1L6display = teRound((parseFloat(seData_s1.farmProfit)||0) + (parseFloat(seData_s1.crpPayments)||0));

  // Line 7 — Unemployment compensation — IRC §85(a): gross taxable; repayment reduces amount
  let s1L7gross  = teRound(Math.max(0, parseFloat(s1.unemployment) || 0));
  let s1L7repaid = s1.unemploymentRepaid ? teRound(Math.abs(parseFloat(s1.unemploymentRepaidAmt) || 0)) : 0;
  let s1L7net    = teRound(s1L7gross - s1L7repaid);

  // Lines 8a–8v: Other Income sub-lines
  // Negative lines (8a, 8d, 8s): stored as positive user-entered values, subtracted in line 9
  let s1L8a = teRound(Math.abs(parseFloat(s1.l8a) || 0));  // NOL — IRC §172; subtracted
  let s1L8b = teRound(Math.max(0, parseFloat(s1.l8b) || 0));  // Gambling — IRC §165(d)
  let s1L8c = teRound(Math.max(0, parseFloat(s1.l8c) || 0));  // COD — IRC §61(a)(12)
  let s1L8d = teRound(Math.abs(parseFloat(s1.l8d) || 0));  // FEIE Form 2555 — subtracted
  let s1L8e = teRound(Math.max(0, parseFloat(s1.l8e) || 0));  // Form 8853 (MSA)
  let s1L8f = teRound(Math.max(0, parseFloat(s1.l8f) || 0));  // Form 8889 (HSA)
  let s1L8g = teRound(Math.max(0, parseFloat(s1.l8g) || 0));  // Alaska PFD — IRC §643(b)
  let s1L8h = teRound(Math.max(0, parseFloat(s1.l8h) || 0));  // Jury duty
  let s1L8i = teRound(Math.max(0, parseFloat(s1.l8i) || 0));  // Prizes/awards — IRC §74(a)
  let s1L8j = teRound(Math.max(0, parseFloat(s1.l8j) || 0));  // Not-for-profit — IRC §183
  let s1L8k = teRound(Math.max(0, parseFloat(s1.l8k) || 0));  // Stock options
  let s1L8l = teRound(Math.max(0, parseFloat(s1.l8l) || 0));  // Rental of personal property
  let s1L8m = teRound(Math.max(0, parseFloat(s1.l8m) || 0));  // Olympic/Paralympic — IRC §74(d)
  let s1L8n = teRound(Math.max(0, parseFloat(s1.l8n) || 0));  // §951(a) Subpart F
  let s1L8o = teRound(Math.max(0, parseFloat(s1.l8o) || 0));  // §951A(a) GILTI
  let s1L8p = teRound(Math.max(0, parseFloat(s1.l8p) || 0));  // §461(l) excess business loss adj
  let s1L8q = teRound(Math.max(0, parseFloat(s1.l8q) || 0));  // ABLE — IRC §529A
  let s1L8r = teRound(Math.max(0, parseFloat(s1.l8r) || 0));  // Scholarship/fellowship not on W-2
  let s1L8s = teRound(Math.abs(parseFloat(s1.l8s) || 0));  // Medicaid waiver (nontaxable) — subtracted
  let s1L8t = teRound(Math.max(0, parseFloat(s1.l8t) || 0));  // Nonqualified deferred comp / §457
  let s1L8u = teRound(Math.max(0, parseFloat(s1.l8u) || 0));  // Wages while incarcerated
  let s1L8v = teRound(Math.max(0, parseFloat(s1.l8v) || 0));  // Digital assets as ordinary income

  // Line 8z — dynamic other income rows
  let s1OtherRows = s1.otherIncomeRows || [];
  let s1L8z = teRound(s1OtherRows.reduce((sum, row) => sum + (parseFloat(row.amount) || 0), 0));

  // Line 9 — Total other income: 8a, 8d, 8s are negative (subtracted), all others added
  let s1L9 = teRound(
    s1L8b + s1L8c + s1L8e + s1L8f + s1L8g + s1L8h + s1L8i + s1L8j + s1L8k +
    s1L8l + s1L8m + s1L8n + s1L8o + s1L8p + s1L8q + s1L8r + s1L8t + s1L8u + s1L8v + s1L8z
    - s1L8a - s1L8d - s1L8s
  );

  // Line 10 — Total additional income (form display): includes all lines including auto-populated ones
  // This is the value shown on 1040 Line 8 → Sch. 1 Line 10
  let s1L10 = teRound(s1L1 + s1L2a + s1L3display + s1L4 + calc.scheduleENet + s1L6display + s1L7net + s1L9);

  // Persist all lines for form renderer — ordered for targeted DOM updates
  calc.sched1Lines = {
    l1: s1L1, l2a: s1L2a, l3: s1L3display, l4: s1L4,
    l5: calc.scheduleENet, l6: s1L6display,
    l7gross: s1L7gross, l7net: s1L7net,
    l8a: s1L8a, l8b: s1L8b, l8c: s1L8c, l8d: s1L8d, l8e: s1L8e, l8f: s1L8f,
    l8g: s1L8g, l8h: s1L8h, l8i: s1L8i, l8j: s1L8j, l8k: s1L8k, l8l: s1L8l,
    l8m: s1L8m, l8n: s1L8n, l8o: s1L8o, l8p: s1L8p, l8q: s1L8q, l8r: s1L8r,
    l8s: s1L8s, l8t: s1L8t, l8u: s1L8u, l8v: s1L8v, l8z: s1L8z,
    l9: s1L9, l10: s1L10
  };

  // sched1Extra: the NEW income items not previously in grossIncome (lines 1, 2a, 4, 7, 9)
  // Lines 3 (SC) and 5 (SE) already flow through netSEIncome/scheduleENet.
  // Line 6 (farm) already flows through netSEIncome via scheduleSE.farmProfit/crpPayments.
  calc.sched1Extra = teRound(s1L1 + s1L2a + s1L4 + s1L7net + s1L9);

  // Gross income: all sources — IRC §61
  // Note: ordinaryDividends includes qualifiedDividends (QDs are a subset, not additive)
  calc.grossIncome = teRound(
    calc.w2Wages + calc.netSEIncome
    + calc.iraTaxable + calc.pensionTaxable
    + calc.interestIncome + calc.ordinaryDividends
    + calc.scheduleDNet + calc.scheduleENet
    + calc.sched1Extra   // Sch. 1 Part I new items: lines 1, 2a, 4, 7, 8a–8z
  );

  // ── Step 2a: SE Tax — Schedule SE line-by-line ──────────────────────
  // SE tax does not depend on AGI (it depends only on net SE income), so
  // it can be computed here — enabling §164(f) deduction to reduce MAGI
  // for SLI and IRA phase-outs without circularity.
  // IRC §1401 rates; IRC §1402(a) net earnings factor.
  // Source: uscode.house.gov/view.xhtml?req=granuleid:USC-prelim-title26-section1401
  let SE = K.selfEmployment;

  // Line 1a — Net profit/(loss) from Schedule C (trade or business)
  // IRC §1402(a): net earnings from self-employment includes all trade/business income
  let seLine1a = teRound(Math.max(0, parseFloat(sc.netProfit) || 0));

  // Line 1b — Net profit/(loss) from Schedule F (farm income)
  // IRC §1402(a)(1): farm income included in net earnings from SE
  let seLine1b = teRound(Math.max(0, parseFloat(seData_.farmProfit) || 0));

  // Line 2 — Conservation Reserve Program (CRP) payments from Schedule F
  // IRC §1402(a): CRP rental payments to farmers treated as SE income
  let seLine2  = teRound(Math.max(0, parseFloat(seData_.crpPayments) || 0));

  // Line 3 — Combined SE income
  let seLine3  = teRound(seLine1a + seLine1b + seLine2);

  // Line 4a — Net earnings from SE: line 3 × 92.35%
  // IRC §1402(a): net earnings factor applied to arrive at taxable SE base
  // Source: uscode.house.gov/view.xhtml?req=granuleid:USC-prelim-title26-section1402
  let seLine4a = seLine3 > 0 ? teRound(seLine3 * SE.netEarningsRate) : 0;

  // Line 4b — Optional SE method amount (rare; user override for social security credits)
  // IRC §1402(a): optional farm/nonfarm methods can increase SE earnings below actual
  let seLine4b = teRound(parseFloat(seData_.optionalMethods) || 0);

  // Line 4c — Net SE earnings (sum of regular + optional method)
  let seLine4c = teRound(seLine4a + seLine4b);

  // $400 floor — IRC §1402(b)(2): SE tax not imposed if net earnings from SE < $400
  // Source: uscode.house.gov/view.xhtml?req=granuleid:USC-prelim-title26-section1402
  let seAboveFloor = seLine4c >= 400;

  // Line 5a — Church employee income from W-2 (wages not subject to FICA at church level)
  // IRC §3121(b)(8): church employees opted out of FICA; SE tax applies via Schedule SE
  let seLine5a = teRound(parseFloat(seData_.ssWagesOverride) || 0);

  // Line 5b — Church employee income × 92.35% (same net earnings factor applies)
  let seLine5b = teRound(seLine5a * SE.netEarningsRate);

  // Line 6 — Total SE earnings subject to SS and Medicare tax
  // If below $400 floor, regular SE excluded; church employee portion still applies
  let seLine6  = seAboveFloor
    ? teRound(seLine4c + seLine5b)
    : teRound(seLine5b);

  // Line 7 — SS wage base for the active tax year
  // IRC §1402(b): SS component of SE tax limited to excess of annual wage base
  let seLine7  = SE.ssTaxWageBase;

  // Line 8a — W-2 Social Security wages (Box 3 aggregate) already subject to FICA SS tax.
  // IRC §1402(b): SE SS applies only to wage base room not already consumed by W-2 Box 3 wages.
  // Uses calc.w2Box3 (sum of per-card Box 3 values) rather than Box 1 wages — Box 3 is capped
  // at the SS wage base per employer by W-2 auto-fill. IRC §3121.
  let seLine8a = calc.w2Box3;

  // Line 8b — Unreported tips subject to SS (from Form 4137; tip income not reported to employer)
  // IRC §3102(c): employee must pay SE-equivalent SS on unreported tips
  let seLine8b = teRound(parseFloat(seData_.unreportedTips) || 0);

  // Line 9 — Remaining SS wage base capacity after W-2 wages and unreported tips
  let seLine9  = teRound(Math.max(0, seLine7 - seLine8a - seLine8b));

  // Line 10 — SS tax: min(line 6, line 9) × 12.4%
  // IRC §1401(a): 12.4% SS rate applied only up to remaining wage base room
  let seLine10 = teRound(Math.min(seLine6, seLine9) * SE.ssTaxRate);

  // Line 11 — Medicare tax: line 6 × 2.9%
  // IRC §1401(b)(1): 2.9% Medicare rate — no wage base cap
  let seLine11 = teRound(seLine6 * SE.medicareTaxRate);

  // Line 12 — Total SE tax (SS + Medicare); Additional Medicare Tax (0.9%) computed separately
  // IRC §1401: line 12 = line 10 + line 11; flows to Form 1040 Schedule 2 line 4
  let seLine12 = teRound(seLine10 + seLine11);

  // Line 13 — §164(f) deduction: 50% of SE tax deductible above-the-line
  // Source: uscode.house.gov/view.xhtml?req=granuleid:USC-prelim-title26-section164
  let seLine13 = teRound(seLine12 * 0.50);

  // Map to existing calc fields (all downstream code uses these)
  calc.seTaxBase      = seLine4c;
  calc.seSSBase       = teRound(Math.min(seLine6, seLine9));
  calc.seSSTax        = seLine10;
  calc.seMedicareTax  = seLine11;
  calc.seTax          = seLine12;
  calc.seTaxDeduction = seLine13;

  // Persist all Schedule SE lines for form rendering
  calc.seLines = {
    line1a: seLine1a, line1b: seLine1b, line2: seLine2, line3: seLine3,
    line4a: seLine4a, line4b: seLine4b, line4c: seLine4c,
    aboveFloor: seAboveFloor,
    line5a: seLine5a, line5b: seLine5b, line6: seLine6,
    line7: seLine7, line8a: seLine8a, line8b: seLine8b, line9: seLine9,
    line10: seLine10, line11: seLine11, line12: seLine12, line13: seLine13
  };

  // ── Step 2b: Above-the-Line Adjustments — IRC §62 ───────────────────
  let adj = teCurrentReturn.agiAdjustments || {};

  // §223 HSA: no MAGI phase-out — compute first
  calc.hsaDeduction = teCalcHSA(adj, K, calc.w2Box12W);

  // §221 Student Loan Interest
  // MAGI = grossIncome − HSA − seTaxDeduction (§221 excluded from own MAGI)
  // IRC §221(b)(2)(C); Note: seTaxDeduction now correctly included per audit flag
  let magiForSLI    = teRound(calc.grossIncome - calc.hsaDeduction - calc.seTaxDeduction);
  calc.sliDeduction = teCalcSLI(adj, magiForSLI, K, fs);

  // §219 Traditional IRA
  // MAGI = grossIncome − HSA − SLI − seTaxDeduction (§219 excluded from own MAGI)
  let magiForIRA    = teRound(calc.grossIncome - calc.hsaDeduction - calc.sliDeduction - calc.seTaxDeduction);
  // IRC §219(g)(5): active participant auto-wire — one-way only (never auto-clears to preserve manual overrides).
  // If any W-2 Box 13 Retirement is checked, the taxpayer is an active participant in an employer plan.
  // The manual checkbox on Schedule 1 Part II Line 20 remains fully functional as an override.
  // Source: uscode.house.gov/view.xhtml?req=granuleid:USC-prelim-title26-section219
  if (calc.w2Box13Ret) adj.iraActiveParticipant = true;
  calc.iraDeduction = teCalcIRA(adj, magiForIRA, K, fs);

  // §215 Alimony Paid (pre-2019 divorce agreements only)
  // TCJA §11051: agreements executed after Dec 31, 2018 → NOT deductible
  // Source: uscode.house.gov/view.xhtml?req=granuleid:USC-prelim-title26-section215
  calc.alimonyDeduction = teCalcAlimony(teCurrentReturn.alimony || {});

  calc.adjustments = teRound(calc.hsaDeduction + calc.sliDeduction + calc.iraDeduction + calc.seTaxDeduction + calc.alimonyDeduction);

  // ── Schedule 1, Part II — Adjustments to Income — IRC §62 ───────────────
  // Lines 13 (HSA), 15 (SE tax deduction), 19a (alimony), 20 (IRA), 21 (SLI)
  // are already in calc.adjustments above. Only new user-entered lines add to the total.

  // Line 11 — Educator expenses — IRC §62(a)(2)(D); Rev. Proc. 2025-30
  // MFJ: each eligible spouse can claim up to $300 (total $600 if both educators)
  // Non-MFJ: max $300. Engine applies cap at point of entry.
  // Source: uscode.house.gov/view.xhtml?req=granuleid:USC-prelim-title26-section62
  let s2L11max = (fs === 'mfj') ? 600 : 300;
  let s2L11 = teRound(Math.min(Math.max(0, parseFloat(s1.p2L11)||0), s2L11max));

  // Line 12 — Certain business expenses: reservists, performing artists, fee-basis govt officials
  // Form 2106 — IRC §62(a)(2)(B),(C),(D)
  // Source: uscode.house.gov/view.xhtml?req=granuleid:USC-prelim-title26-section62
  let s2L12 = teRound(Math.max(0, parseFloat(s1.p2L12)||0));

  // Line 13 = calc.hsaDeduction (display only — already in calc.adjustments above)

  // Line 14 — Moving expenses for Armed Forces members — IRC §217(g)
  // TCJA §11049: suspended for non-military taxpayers through 2025 (and forward under OBBBA)
  // For qualified Armed Forces members: Form 3903 required
  // Source: uscode.house.gov/view.xhtml?req=granuleid:USC-prelim-title26-section217
  let s2L14 = teRound(Math.max(0, parseFloat(s1.p2L14)||0));

  // Line 15 = calc.seTaxDeduction (display only — already in calc.adjustments above)

  // Line 16 — Self-employed SEP, SIMPLE, and qualified plan contributions
  // IRC §§219, 404 — deduction for contributions to own plan as both employer and employee
  // Deductible portion limited to 25% of net SE income (complex; engine accepts user-entered value)
  // Source: uscode.house.gov/view.xhtml?req=granuleid:USC-prelim-title26-section404
  let s2L16 = teRound(Math.max(0, parseFloat(s1.p2L16)||0));

  // Line 17 — Self-employed health insurance deduction — IRC §162(l)
  // Limited to net profit from self-employment; cannot exceed earned income. Engine: user-entered.
  // Source: uscode.house.gov/view.xhtml?req=granuleid:USC-prelim-title26-section162
  let s2L17 = teRound(Math.max(0, parseFloat(s1.p2L17)||0));

  // Line 18 — Penalty on early withdrawal of savings — IRC §62(a)(9)
  // Auto-populated from 1099-INT Box 2 aggregate. Forfeited interest/penalty imposed by institution
  // for early withdrawal from time deposit (CD). DISTINCT from IRC §72(t) 10% early distribution tax.
  // Source: IRS Publication 550 — Investment Income and Expenses
  let s2L18 = calc.earlyWdPenalty || 0;

  // Line 19a = calc.alimonyDeduction (display only — already in calc.adjustments above)
  // Line 20  = calc.iraDeduction    (display only — already in calc.adjustments above)
  // Line 21  = calc.sliDeduction    (display only — already in calc.adjustments above)
  // Line 22  = Reserved for future use

  // Line 23 — Archer MSA deduction — IRC §220
  // Form 8853; for self-employed taxpayers or employees of small employers with HDHP coverage
  // Source: uscode.house.gov/view.xhtml?req=granuleid:USC-prelim-title26-section220
  let s2L23 = teRound(Math.max(0, parseFloat(s1.p2L23)||0));

  // Lines 24a–24k — Other Adjustments to Income
  let s2L24a = teRound(Math.max(0, parseFloat(s1.p2L24a)||0));  // Jury duty pay
  let s2L24b = teRound(Math.max(0, parseFloat(s1.p2L24b)||0));  // Deductible expenses re: rental of personal property
  let s2L24c = teRound(Math.max(0, parseFloat(s1.p2L24c)||0));  // Nontaxable Olympic/Paralympic medals/USOC prize money
  let s2L24d = teRound(Math.max(0, parseFloat(s1.p2L24d)||0));  // Reforestation amortization and expenses — IRC §194
  let s2L24e = teRound(Math.max(0, parseFloat(s1.p2L24e)||0));  // Repayment of supplemental unemployment benefits
  let s2L24f = teRound(Math.max(0, parseFloat(s1.p2L24f)||0));  // Contributions to §501(c)(18)(D) pension plans
  let s2L24g = teRound(Math.max(0, parseFloat(s1.p2L24g)||0));  // Contributions by chaplains to §403(b) plans
  let s2L24h = teRound(Math.max(0, parseFloat(s1.p2L24h)||0));  // Attorney fees — unlawful discrimination — IRC §62(a)(20)
  let s2L24i = teRound(Math.max(0, parseFloat(s1.p2L24i)||0));  // Attorney fees — IRS whistleblower — IRC §62(a)(21)
  let s2L24j = teRound(Math.max(0, parseFloat(s1.p2L24j)||0));  // Housing deduction from Form 2555 — IRC §911(c)
  let s2L24k = teRound(Math.max(0, parseFloat(s1.p2L24k)||0));  // Excess §67(e) deductions from K-1 (Form 1041)

  // Line 24z — dynamic other adjustment rows
  let s2OtherAdjRows = s1.p2OtherAdjRows || [];
  let s2L24z = teRound(s2OtherAdjRows.reduce((sum, row) => sum + (parseFloat(row.amount)||0), 0));

  // Line 25 — Total other adjustments: sum of 24a through 24z
  let s2L25 = teRound(s2L24a+s2L24b+s2L24c+s2L24d+s2L24e+s2L24f+s2L24g+s2L24h+s2L24i+s2L24j+s2L24k+s2L24z);

  // Line 26 — Total adjustments to income (form display value — all Part II lines combined)
  // = 11+12+13+14+15+16+17+18+19a+20+21+23+25  (line 22 reserved — skip)
  let s2L26 = teRound(
    s2L11 + s2L12 + calc.hsaDeduction + s2L14 + calc.seTaxDeduction +
    s2L16 + s2L17 + s2L18 + calc.alimonyDeduction + calc.iraDeduction +
    calc.sliDeduction + s2L23 + s2L25
  );

  // Persist all Part II lines for form renderer and targeted DOM updates
  calc.sched1PII_lines = {
    l11: s2L11, l11max: s2L11max, l12: s2L12, l13: calc.hsaDeduction,
    l14: s2L14, l15: calc.seTaxDeduction, l16: s2L16, l17: s2L17, l18: s2L18,
    l19a: calc.alimonyDeduction, l20: calc.iraDeduction, l21: calc.sliDeduction,
    l23: s2L23,
    l24a: s2L24a, l24b: s2L24b, l24c: s2L24c, l24d: s2L24d, l24e: s2L24e, l24f: s2L24f,
    l24g: s2L24g, l24h: s2L24h, l24i: s2L24i, l24j: s2L24j, l24k: s2L24k, l24z: s2L24z,
    l25: s2L25, l26: s2L26
  };

  // sched1PII_extra: the NEW adjustment items not in the original calc.adjustments
  // (lines 11, 12, 14, 16, 17, 18, 23, and 24a–24z via line 25)
  calc.sched1PII_extra = teRound(s2L11 + s2L12 + s2L14 + s2L16 + s2L17 + s2L18 + s2L23 + s2L25);
  calc.adjustments = teRound(calc.adjustments + calc.sched1PII_extra);

  // ── Step 3: Adjusted Gross Income — IRC §62 ─────────────────────────
  calc.agi = teRound(calc.grossIncome - calc.adjustments);

  // ── Step 3c: Social Security — IRC §86 ──────────────────────────────
  // Circular dependency resolved: §86 provisional income uses AGI without SS.
  // We use the preliminary AGI (above) as the base, run §86, then add SS taxable
  // back into grossIncome and AGI. Adjustments (SLI, HSA, IRA) are not recomputed
  // because none depend on SS income — the increment is clean.
  let ssCalc              = teCalcSS86(calc.ssBenefitsGross, calc.agi, calc.taxExemptInterest, fs, ss.mfsLivedWithSpouse);
  calc.ssBenefitsTaxable  = ssCalc.taxable;
  calc.ssProvisionalIncome = ssCalc.provisionalIncome;
  calc.ssTaxablePct        = ssCalc.taxablePct;
  calc.ssMfsPenalty        = ssCalc.mfsPenalty || false;
  // Add SS taxable to both grossIncome and AGI — adjustments are unchanged
  if (calc.ssBenefitsTaxable > 0) {
    calc.grossIncome = teRound(calc.grossIncome + calc.ssBenefitsTaxable);
    calc.agi         = teRound(calc.agi         + calc.ssBenefitsTaxable);
  }

  // ── Step 3a: §469(i) Rental Real Estate Exception ─────────────────────
  // IRC §469(i)(1): taxpayers who actively participate in rental real estate may deduct up to
  // $25,000 of net rental losses against non-passive income, subject to an AGI phase-out.
  // This step runs AFTER AGI is set (above) because the phase-out depends on AGI.
  // Pass 1 suspended all passive losses; if a §469(i) allowance exists, we retroactively
  // release it by increasing calc.scheduleENet and reducing calc.grossIncome and calc.agi.
  // Source: uscode.house.gov/view.xhtml?req=granuleid:USC-prelim-title26-section469
  calc.passive469iAllowance = 0;
  if (calc.rentalActiveLoss > 0) {
    let p4 = K.passive469i;
    let mfsLivedTogether = (fs === 'mfs') && !!(teCurrentReturn.socialSecurity || {}).mfsLivedWithSpouse;
    // IRC §469(i)(5)(A): MFS who lived with spouse at any time during year — cap is $0
    if (!mfsLivedTogether) {
      // Select correct cap and phase-out start based on filing status — IRC §469(i)(5)
      let cap469i       = (fs === 'mfs') ? p4.capMFSApart       : p4.cap;
      let phaseStart469i= (fs === 'mfs') ? p4.phaseoutStartMFSApart : p4.phaseoutStart;
      // IRC §469(i)(3)(B): reduce cap by 50% of AGI excess over threshold
      let agiExcess     = teRound(Math.max(0, calc.agi - phaseStart469i));
      let allowanceCap  = teRound(Math.max(0, cap469i - p4.phaseoutRate * agiExcess));
      // Allowance = lesser of net rental loss and (remaining) cap
      calc.passive469iAllowance = teRound(Math.min(calc.rentalActiveLoss, allowanceCap));
      if (calc.passive469iAllowance > 0) {
        // Release the allowance: reduce suspended loss, increase flowing income
        calc.passiveLossSuspended = teRound(Math.max(0, calc.passiveLossSuspended - calc.passive469iAllowance));
        calc.scheduleENet         = teRound(calc.scheduleENet - calc.passive469iAllowance);  // (rental net was negative)
        calc.grossIncome          = teRound(calc.grossIncome  - calc.passive469iAllowance);
        // Re-run SLI and IRA phase-outs with corrected MAGI — both key off grossIncome which just changed.
        // IRC §221(b)(2)(C): SLI MAGI = grossIncome − HSA − seTaxDeduction (SLI excluded from its own MAGI)
        let newMagiSLI = teRound(calc.grossIncome - calc.hsaDeduction - calc.seTaxDeduction);
        let newSliDed  = teCalcSLI(adj, newMagiSLI, K, fs);
        // IRC §219(b): IRA MAGI = grossIncome − HSA − SLI − seTaxDeduction
        let newMagiIRA = teRound(calc.grossIncome - calc.hsaDeduction - newSliDed - calc.seTaxDeduction);
        let newIraDed  = teCalcIRA(adj, newMagiIRA, K, fs);
        // Apply deltas to adjustments and re-derive AGI
        let adjDelta = teRound((newSliDed - calc.sliDeduction) + (newIraDed - calc.iraDeduction));
        calc.sliDeduction = newSliDed;
        calc.iraDeduction = newIraDed;
        calc.adjustments  = teRound(calc.adjustments + adjDelta);
        // Update Schedule 1 Part II display cache so renderer shows corrected values
        if (calc.sched1PII_lines) {
          calc.sched1PII_lines.l20 = calc.iraDeduction;
          calc.sched1PII_lines.l21 = calc.sliDeduction;
        }
        // Re-derive final AGI with corrected grossIncome and adjustments
        calc.agi = teRound(calc.grossIncome - calc.adjustments);
      }
    }
  }

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

  // Step 4a: Base standard deduction by filing status
  // Source: OBBBA P.L. 119-21
  let baseStdDed = K.standardDeduction[fs] || K.standardDeduction.single;

  // Step 4b: IRC §63(c)(5) — Dependent standard deduction limitation
  // When taxpayer can be claimed as a dependent, standard deduction limited to:
  //   max(min, earnedIncome + earnedAdd) — capped at the full base standard deduction
  // Source: uscode.house.gov/view.xhtml?req=granuleid:USC-prelim-title26-section63
  let depSd = K.dependentStdDed || {};
  if (teCurrentReturn.canBeClaimed) {
    let earnedForDep = teRound((calc.w2Wages || 0) + (calc.netSEIncome || 0));
    let depLimited   = teRound(Math.max(depSd.min || 0, earnedForDep + (depSd.earnedAdd || 0)));
    baseStdDed = Math.min(depLimited, baseStdDed);
  }

  // Step 4c: IRC §63(f) — Additional standard deduction (age 65+ and/or blind)
  // Each qualifying condition per filer adds the applicable additional amount.
  // Applies to taxpayer and, for MFJ/MFS/QSS, also to qualifying spouse.
  // Source: uscode.house.gov/view.xhtml?req=granuleid:USC-prelim-title26-section63
  let addlSd = K.additionalStdDed || {};
  let addlAmt = 0;
  if (addlSd.single_hoh || addlSd.mfj_mfs_qss) {
    let yr = teCurrentReturn.taxYear || teActiveYear;
    let tp = teCurrentReturn.taxpayer || {};
    let sp = teCurrentReturn.spouse   || {};
    let isMFJGroup = (fs === 'mfj' || fs === 'mfs' || fs === 'qss');
    let perPerson  = isMFJGroup ? (addlSd.mfj_mfs_qss || 0) : (addlSd.single_hoh || 0);
    // Taxpayer conditions: age 65+ OR blind (each counts separately — stack for both)
    let tpConditions = (teIsAge65OrOlder(tp.dob, yr) ? 1 : 0) + (tp.blind ? 1 : 0);
    // Spouse conditions: only for MFJ/MFS/QSS
    let spConditions = (isMFJGroup && (fs === 'mfj' || fs === 'mfs'))
      ? ((teIsAge65OrOlder(sp.dob, yr) ? 1 : 0) + (sp.blind ? 1 : 0))
      : 0;
    addlAmt = teRound((tpConditions + spConditions) * perPerson);
  }

  calc.stdDed        = baseStdDed + addlAmt;
  calc.addlStdDed    = addlAmt;       // for display in deductions panel

  // Track 2: Schedule A itemized deductions — automatically compared to standard
  let schedA = teCurrentReturn.scheduleA || {};
  calc.saltDeduction       = teCalcSALT(schedA, calc.agi, K, fs);
  calc.mortgageDeduction   = teCalcMortgageInterest(schedA, calc.agi, K, fs);
  let charResult           = teCalcCharitable(schedA, calc.agi, K);
  calc.charitableDeduction = charResult.total;
  calc.charBreakdown       = charResult;                    // bucket detail for Schedule A screen
  calc.medicalDeduction    = teCalcMedical(schedA, calc.agi, K);
  calc.casualtyDeduction   = teCalcCasualty(schedA, calc.agi, K);
  calc.gamblingDeduction   = teCalcGambling(schedA, teCurrentReturn.schedule1, K);
  // Line 17 other deductions (dynamic rows: impairment-related, etc.)
  calc.otherDeductionsTotal = teRound(
    (schedA.otherDeductions || []).reduce((s, row) => s + (parseFloat(row.amount) || 0), 0)
  );

  // IRC §163(d) investment interest is also an itemized deduction — included in total
  calc.itemizedRaw = teRound(
    calc.saltDeduction + calc.mortgageDeduction + calc.charitableDeduction +
    calc.medicalDeduction + calc.investmentInterestAllowed +
    calc.casualtyDeduction + calc.gamblingDeduction + calc.otherDeductionsTotal
  );

  // OBBBA §70111 — 2/37ths haircut: applies TY2026+ only (itemizedHaircut undefined for TY2025)
  // Single-pass approximation: taxableEstimate = max(0, AGI − itemizedRaw) — avoids circular dependency
  calc.itemizedHaircut = teCalcItemizedHaircut(calc.itemizedRaw, calc.agi, K, fs);
  calc.itemizedNet     = teRound(Math.max(0, calc.itemizedRaw - calc.itemizedHaircut));
  // itemizedTotal: net amount used for comparison and display (matches 1040 Line 12e when itemizing)
  calc.itemizedTotal   = calc.itemizedNet;

  // Engine picks whichever is higher — IRC §63(b)
  // electToItemize: taxpayer may elect itemized even when standard deduction is higher
  let forceItemized = (schedA.electToItemize === true);
  calc.deductionType  = (calc.itemizedNet > calc.stdDed || forceItemized) ? 'itemized' : 'standard';
  calc.deductionUsed  = (calc.deductionType === 'itemized') ? calc.itemizedNet : calc.stdDed;
  calc.mfsItemizedRequired = false;

  // IRC §63(e): If one MFS spouse itemizes, the other MUST also itemize.
  // The standard deduction is disallowed — treated as $0 regardless of itemized total.
  // Source: uscode.house.gov/view.xhtml?req=granuleid:USC-prelim-title26-section63
  if (fs === 'mfs' && schedA.mfsSpouseItemizes === true) {
    calc.stdDed              = 0;
    calc.deductionType       = 'itemized';
    calc.deductionUsed       = calc.itemizedNet;
    calc.mfsItemizedRequired = true;
  }
  teCurrentReturn.deductionType = calc.deductionType;

  // ── Step 5: Taxable Income — IRC §63(a) ─────────────────────────────
  // taxableIncomeBeforeQBI: AGI − std/itemized deduction, before §199A QBI deduction
  calc.taxableIncomeBeforeQBI = teRound(Math.max(0, calc.agi - calc.deductionUsed));

  // ── Step 5b: QBI Deduction — IRC §199A (Form 8995 simplified method) ──
  // QBI sources: Schedule C + qualifying Schedule E pass-through entities (not C-Corps)
  // TODO: SSTB limitation applies above threshold — future Form 8995-A build
  // Schedule C QBI: net profit reduced by §164(f) SE tax deduction per Form 8995 instructions
  calc.schedCQBI = teRound(calc.netSEIncome - calc.seTaxDeduction);  // can be negative (loss)
  // Schedule E QBI: user-entered K-1 §199A QBI per entity; C-Corps excluded — IRC §199A(f)(1)
  // Partnership: K-1 Box 20 Code Z | S-Corp: K-1 Box 17 Code V | Trust/Estate: K-1 Box 14 Code I
  calc.schedEQBI = teRound(
    (teCurrentReturn.scheduleE || [])
      .filter(e => (e.entityType || 'partnership') !== 'ccorp')
      .reduce((s, e) => s + (parseFloat(e.qbiAmount) || 0), 0)
  );
  // Combined QBI base — floored at $0 (negative net QBI → $0 deduction; carryforward not tracked v1)
  calc.qbiBase = teRound(Math.max(0, calc.schedCQBI + calc.schedEQBI));
  let qbiThreshold = (K.qbi && K.qbi.threshold) ? (K.qbi.threshold[fs] || K.qbi.threshold.single) : 0;
  if (calc.qbiBase === 0 || !K.qbi) {
    // No qualified business income — deduction is $0
    calc.qbiDeduction        = 0;
    calc.qbiAboveThreshold   = false;
  } else if (calc.taxableIncomeBeforeQBI > qbiThreshold) {
    // Above simplified method threshold — Form 8995-A required
    // IRC §199A(e)(2): taxpayers above threshold must apply W-2 wage / UBIA limitations
    calc.qbiDeduction        = 0;
    calc.qbiAboveThreshold   = true;
  } else {
    // Simplified method: 20% × QBI, limited to 20% × taxable income before QBI
    // IRC §199A(a),(b)(1)
    calc.qbiDeduction        = teRound(Math.min(calc.qbiBase * 0.20, calc.taxableIncomeBeforeQBI * 0.20));
    calc.qbiAboveThreshold   = false;
  }
  // QBI deduction reduces taxable income — IRC §199A(a); 1040 Line 13a → Line 15
  calc.taxableIncome = teRound(Math.max(0, calc.taxableIncomeBeforeQBI - calc.qbiDeduction));

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

  // ── Step 7a: Alternative Minimum Tax — IRC §55 ──────────────────────
  // AMT is included in taxBeforeCredits so non-refundable credits (CTC, CDCC, AOC, LLC,
  // Saver's, Energy) offset the combined regular tax + AMT — per Schedule 2, Part I.
  // teCalcAMT requires regularTax already set (above) to compute amt = max(0, TMT − regularTax).
  let amtResult         = teCalcAMT(teCurrentReturn, calc, K, fs);
  calc.amti             = amtResult.amti;
  calc.amtExemption     = amtResult.exemption;
  calc.amtEffExemption  = amtResult.effectiveExemption;
  calc.amtTMT           = amtResult.tmt;
  calc.amt              = amtResult.amt;
  calc.amtStdAddBack    = amtResult.stdAddBack;
  calc.amtSaltAddBack   = amtResult.saltAddBack;
  calc.amtISOSpread     = amtResult.isoSpread;
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
  // IRC §24(h)(4): ODC $500 per non-CTC qualifying dependent — non-refundable only
  // IRC §24(h)(7): ITIN children treated as non-CTC dependents → ODC instead of CTC
  calc.odcCredit         = ctc.odcNonRefundable || 0;

  // ── Step 9a: Child & Dependent Care Credit — IRC §21 ────────────────
  // Per Schedule 3 Line 2: §21 is applied immediately after CTC (Line 19 of Form 1040)
  // and before education credits (Schedule 3 Line 3). Non-refundable only.
  let taxAfterCTC   = teRound(Math.max(0, calc.taxBeforeCredits - calc.ctcNonRefundable - calc.odcCredit));
  let cdccResult    = teCalcCDCC(teCurrentReturn, calc, K, fs);
  calc.cdccRate     = cdccResult.rate;
  calc.cdccQualExp  = cdccResult.qualifyingExpenses;
  calc.cdccCredit   = teRound(Math.min(cdccResult.credit, taxAfterCTC));

  // ── Step 9b: Education Credits — IRC §25A ───────────────────────────
  // Applied after CDCC (Schedule 3 Line 3). Pass remaining tax after CDCC.
  let taxAfterCDCC = teRound(Math.max(0, taxAfterCTC - calc.cdccCredit));
  let edu = teCalcEduCredits(teCurrentReturn, calc.agi, taxAfterCDCC, fs, K);
  calc.aocNonRefundable      = edu.aocNonRefundable;
  calc.aocRefundable         = edu.aocRefundable;
  calc.llcCredit             = edu.llcCredit;
  calc.totalEduNonRefundable = edu.aocNonRefundable + edu.llcCredit;

  // ── Step 9c: Saver's Credit — IRC §25B ──────────────────────────────
  // Schedule 3, Line 4. Non-refundable. Applied after education credits.
  let taxAfterEdu   = teRound(Math.max(0, taxAfterCDCC - calc.totalEduNonRefundable));
  let saversResult  = teCalcSavers(teCurrentReturn, calc, K, fs);
  calc.saversTaxpayer = saversResult.taxpayerCredit;
  calc.saversSpouse   = saversResult.spouseCredit;
  calc.saversCredit   = teRound(Math.min(saversResult.total, taxAfterEdu));

  // ── Step 9d: Energy-Efficient Home Improvement Credit — IRC §25C ────
  // Schedule 3, Line 5a. Non-refundable; no carryforward. 2025 only — terminated by OBBBA §70505.
  let taxAfterSavers  = teRound(Math.max(0, taxAfterEdu - calc.saversCredit));
  let energyResult    = teCalcEnergy(teCurrentReturn, K);
  calc.energyPoolA    = energyResult.poolA;
  calc.energyPoolB    = energyResult.poolB;
  calc.energyTerminated = energyResult.terminated;
  calc.energyCredit   = teRound(Math.min(energyResult.total, taxAfterSavers));

  // ── Step 10: Non-refundable credits applied — floor at $0 ───────────
  calc.totalNonRefundable = teRound(
    calc.ctcNonRefundable + calc.odcCredit + calc.cdccCredit
    + calc.totalEduNonRefundable + calc.saversCredit + calc.energyCredit
  );
  calc.taxAfterNRCredits  = teRound(Math.max(0, calc.taxBeforeCredits - calc.totalNonRefundable));

  // ── Step 10a: EIC — Fully refundable — IRC §32 ──────────────────────
  // EIC does NOT reduce regular tax (non-refundable); it is applied in Step 12 as a refundable credit.
  // Computed here (after AGI and earned income are final) before payments are summed.
  calc.eicCredit = teCalcEIC(teCurrentReturn, calc, fs, K);

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

  calc.taxAfterCredits = teRound(calc.taxAfterNRCredits + calc.seTax + calc.addlMedicareTax + calc.niit + calc.earlyWithdrawalPenalty);
  calc.totalTax        = calc.taxAfterCredits;  // alias — used by meter and flags

  // ── Step 11: Payments — IRC §3402, §6654 ────────────────────────────
  calc.w2Withholding = teRound((teCurrentReturn.w2 || []).reduce((s, w) => s + (parseFloat(w.box2)||parseFloat(w.federalWithheld)||0), 0));
  // ── W-2 Informational Aggregates ──────────────────────────────────────
  // IRC §3121: SS/Medicare wage verification (informational — not in downstream calc)
  // Note: calc.w2Box3 and calc.w2Box13Ret are computed earlier (before SE calc and teCalcIRA).
  calc.w2Box4  = teRound((teCurrentReturn.w2||[]).reduce((s,w) => s+(parseFloat(w.box4 )||0), 0));
  calc.w2Box5  = teRound((teCurrentReturn.w2||[]).reduce((s,w) => s+(parseFloat(w.box5 )||0), 0));
  calc.w2Box6  = teRound((teCurrentReturn.w2||[]).reduce((s,w) => s+(parseFloat(w.box6 )||0), 0));
  // IRC §6413(c): if multiple employers caused aggregate Box 4 to exceed SS wage base × 6.2%,
  // the excess is a refundable payment (Schedule 3 Line 11 → 1040 Line 31).
  // Single-employer withholding errors are NOT refundable here — employer must file amended 941.
  // Source: uscode.house.gov/view.xhtml?req=granuleid:USC-prelim-title26-section6413
  calc.excessSSWithholding = teRound(Math.max(0, calc.w2Box4 - teRound(SE.ssTaxWageBase * 0.062)));
  // calc.w2Box10 computed early (before teCalcCDCC) — IRC §129. See above near calc.w2Box13Ret.
  // calc.w2Box12W computed early (before teCalcHSA) — IRC §223(d)(2). See above near calc.w2Box13Ret.
  // TODO: Wire w2Box12Ret to IRA deduction active participant phase-out — IRC §219(g)
  let _retCodes = new Set(['D','E','F','G','H','S','AA','BB','EE']);
  calc.w2Box12Ret = teRound((teCurrentReturn.w2||[]).reduce((s,w) => s+((w.box12||[]).reduce((a,r) => a+(_retCodes.has(r.code)?(parseFloat(r.amount)||0):0), 0)), 0));
  // IRC §6051(a)(14): employer health coverage cost — ACA informational reporting only
  calc.w2Box12DD  = teRound((teCurrentReturn.w2||[]).reduce((s,w) => s+((w.box12||[]).reduce((a,r) => a+(r.code==='DD'?(parseFloat(r.amount)||0):0), 0)), 0));
  // calc.w2Box13Ret already computed above — wired to IRA active participant flag via teCalcIRA. IRC §219(g)(5).
  // TODO: Wire w2Box17/w2Box19 to Schedule A SALT — IRC §164(a)(3)
  calc.w2Box17 = teRound((teCurrentReturn.w2||[]).reduce((s,w) => s+((w.stateRows||[]).reduce((a,r) => a+(parseFloat(r.stateTax)||0), 0)), 0));
  calc.w2Box19 = teRound((teCurrentReturn.w2||[]).reduce((s,w) => s+((w.stateRows||[]).reduce((a,r) => a+(parseFloat(r.localTax)||0), 0)), 0));
  let ep = teCurrentReturn.estimatedPayments || {};
  calc.estQ1         = teRound(parseFloat(ep.q1) || 0);
  calc.estQ2         = teRound(parseFloat(ep.q2) || 0);
  calc.estQ3         = teRound(parseFloat(ep.q3) || 0);
  calc.estQ4         = teRound(parseFloat(ep.q4) || 0);
  calc.estPayments   = teRound(calc.estQ1 + calc.estQ2 + calc.estQ3 + calc.estQ4);

  // ── Step 12: Refund / Balance Due ───────────────────────────────────
  // Refundable credits: EIC (§32) + ACTC (§24(d)) + AOC refundable (§25A(i)) — 1040 Line 32
  calc.totalRefundableCredits = teRound(calc.actcRefundable + calc.aocRefundable + calc.eicCredit);
  // Other withholding: 1099-INT Box 4 + 1099-DIV Box 4 + 1099-R Box 4 + SSA-1099 Box 6 → 1040 Line 25b
  calc.otherWithholding = teRound(
    (calc.intWithholding   || 0) +
    (calc.divWithholding   || 0) +
    (calc.r1099Withholding || 0) +
    (calc.ssWithholding    || 0)
  );
  // Total payments: W-2 withholding (Line 25a) + other withholding (Line 25b) + estimated (Line 26)
  // + excess SS (Schedule 3 Line 11 → 1040 Line 31) + refundable credits (Line 32) → 1040 Line 33
  // IRC §6413(c): excess SS withholding is a refundable payment, not a credit.
  calc.totalPayments = teRound(calc.w2Withholding + calc.otherWithholding + calc.estPayments + calc.excessSSWithholding + calc.totalRefundableCredits);
  // Refund (1040 Line 34) and Balance Due (1040 Line 37) — named aliases
  calc.refund     = teRound(Math.max(0,  calc.totalPayments - calc.totalTax));
  calc.balanceDue = teRound(Math.max(0,  calc.totalTax      - calc.totalPayments));
  // refundOrDue: positive = refund, negative = balance due — used by meter and display
  calc.refundOrDue = teRound(calc.totalPayments - calc.totalTax);

  teCurrentReturn._calc = calc;

  teUpdateMeter(calc, K, fs);
  teUpdateSecStatus(calc);
  teRunFlags(calc, K, fs);

  // Refresh live displays on active sections
  if (teActiveSection === 'dashboard') { let db = document.getElementById('te-interview-body'); if (db) db.innerHTML = teRenderDashboard1040(); }
  if (teActiveSection === 'credits') { teRenderCTCDetail(); teFocusSafe(teRenderEduList); teRenderEICSection(); teFocusSafe(teRenderCDCCSection); teFocusSafe(teRenderSaversSection); teFocusSafe(teRenderEnergySection); }
  if (teActiveSection === 'income') {
    // Live-update SS §86 summary on the income menu page
    let ssSummaryEl = document.getElementById('te-ss-summary');
    if (ssSummaryEl) ssSummaryEl.innerHTML = teRenderSSSummary(calc, fs);
  }
  if (teActiveSection === 'payments') {
    teM('te-ep-total', teFmt(calc.estPayments));
    let epTotal = document.querySelector('.te-total-val');
    if (epTotal) epTotal.textContent = teFmt(calc.estPayments);
    let addlPanel = document.getElementById('te-addl-taxes-panel');
    // Guard: don't rebuild while user is typing inside the panel (would destroy active input)
    if (addlPanel && !addlPanel.contains(document.activeElement)) addlPanel.innerHTML = teRenderAddlTaxes();
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
    // Live-update QBI panel
    let qbiPanel = document.getElementById('te-qbi-panel');
    if (qbiPanel) qbiPanel.innerHTML = teRenderQBIPanel(calc, K, fs);
  }
  // ── Mini-screen live updates ─────────────────────────────────────────
  // IMPORTANT: Never call full render functions here (teRenderScheduleEList, teRenderCTCDetail, etc.)
  // Full renders rebuild innerHTML which destroys the active input element and kicks the cursor out.
  // Only update the total-bar display value (te-mini-total-val) and display-only summary elements.
  if (teActiveSection.startsWith('mini:')) {
    let miniId = teActiveSection.slice(5);
    let totalValEl = document.getElementById('te-mini-total-val');
    switch (miniId) {
      case 'w2': {
        let tv1 = document.getElementById('te-w2-total-val');
        let tv2 = document.getElementById('te-w2-total-val2');
        if (tv1) tv1.textContent = teFmt(calc.w2Wages       || 0);
        if (tv2) tv2.textContent = teFmt(calc.w2Withholding || 0);
      } break;
      case 'retirement': {
        let g2 = id => document.getElementById(id);
        let hasAny = (teCurrentReturn.r1099s || []).length > 0;
        let rBar = g2('te-r1099-total-bar');
        if (rBar) rBar.style.display = hasAny ? '' : 'none';
        if (g2('te-r1099-total-ira'))  g2('te-r1099-total-ira').textContent  = teFmt(calc.iraTaxable      || 0);
        if (g2('te-r1099-total-pen'))  g2('te-r1099-total-pen').textContent  = teFmt(calc.pensionTaxable  || 0);
        if (g2('te-r1099-total-wh'))   g2('te-r1099-total-wh').textContent   = teFmt(calc.r1099Withholding|| 0);
        if (g2('te-r1099-total-ewp'))  g2('te-r1099-total-ewp').textContent  = teFmt(calc.earlyWithdrawalPenalty || 0);
      } break;
      case 'ss': {
        // SS summary is display-only (no inputs) — safe to update innerHTML directly
        let ssSel = document.getElementById('te-ss-summary');
        if (ssSel) ssSel.innerHTML = teRenderSSSummary(calc, fs);
      }                                                                                                                                   break;
      case 'sched-se': {
        // Targeted updates for every computed line on Schedule SE — no full re-render (preserves input focus)
        let ln = calc.seLines || {};
        let g  = id => document.getElementById(id);
        if (g('te-se-1a'))        g('te-se-1a').textContent        = teFmt(ln.line1a  || 0);
        if (g('te-se-3'))         g('te-se-3').textContent         = teFmt(ln.line3   || 0);
        if (g('te-se-4a'))        g('te-se-4a').textContent        = teFmt(ln.line4a  || 0);
        if (g('te-se-4c'))        g('te-se-4c').textContent        = teFmt(ln.line4c  || 0);
        if (g('te-se-5b'))        g('te-se-5b').textContent        = teFmt(ln.line5b  || 0);
        if (g('te-se-6'))         g('te-se-6').textContent         = teFmt(ln.line6   || 0);
        if (g('te-se-8a'))        g('te-se-8a').textContent        = teFmt(ln.line8a  || 0);
        if (g('te-se-9'))         g('te-se-9').textContent         = teFmt(ln.line9   || 0);
        if (g('te-se-10'))        g('te-se-10').textContent        = teFmt(ln.line10  || 0);
        if (g('te-se-11'))        g('te-se-11').textContent        = teFmt(ln.line11  || 0);
        if (g('te-se-total-val')) g('te-se-total-val').textContent = teFmt(ln.line12  || 0);
        if (g('te-se-ded-val'))   g('te-se-ded-val').textContent   = '(' + teFmt(ln.line13 || 0) + ')';
        // Update $400 floor note (display-only div, no inputs inside — safe to re-render)
        let floorEl = g('te-se-floor');
        if (floorEl) {
          let floorOk = ln.aboveFloor;
          floorEl.innerHTML = (!floorOk && (ln.line5b || 0) === 0)
            ? `<div class="te-se-floor-note">
                 Line 4c is ${teFmt(ln.line4c || 0)} — below the $400 minimum threshold.
                 No SE tax applies to regular SE income. Enter church employee income (line 5a) if applicable.
                 <span class="te-cite">IRC §1402(b)(2)</span>
               </div>`
            : '';
        }
      } break;
      case 'sched-d': {
        // Targeted DOM updates for every computed Schedule D line — preserves input focus in transaction rows
        let sl = calc.sdLines || {};
        let gd = id => document.getElementById(id);
        let fmtGL = v => v >= 0 ? teFmt(v) : '(' + teFmt(Math.abs(v)) + ')';
        let glCls = v => 'te-sd-col-gain te-mono ' + (v >= 0 ? 'te-sd-gain-pos' : 'te-sd-gain-neg');

        // Per-row gain cells
        (sl.stTxGains||[]).forEach((g,i) => {
          let el = gd('te-sd-st-gain-'+i);
          if (el) { el.textContent = fmtGL(g); el.className = glCls(g); }
        });
        (sl.ltTxGains||[]).forEach((g,i) => {
          let el = gd('te-sd-lt-gain-'+i);
          if (el) { el.textContent = fmtGL(g); el.className = glCls(g); }
        });

        // Totals rows
        let setT = (id, v) => { let e = gd(id); if (e) e.textContent = teFmt(v||0); };
        setT('te-sd-l1a-p', sl.line1aProc);  setT('te-sd-l1a-c', sl.line1aCost);
        setT('te-sd-l8a-p', sl.line8aProc);  setT('te-sd-l8a-c', sl.line8aCost);
        let l1aGEl = gd('te-sd-l1a-g'), l8aGEl = gd('te-sd-l8a-g');
        if (l1aGEl) { l1aGEl.textContent = fmtGL(sl.line1aGain||0); l1aGEl.className = glCls(sl.line1aGain||0); }
        if (l8aGEl) { l8aGEl.textContent = fmtGL(sl.line8aGain||0); l8aGEl.className = glCls(sl.line8aGain||0); }

        // Net-line bars (line 7, 15, 16)
        let updateNetBar = (barId, amtId, val) => {
          let bar = gd(barId), amtEl = gd(amtId);
          if (bar)   { bar.classList.toggle('te-sd-profit', val>=0); bar.classList.toggle('te-sd-loss', val<0); }
          if (amtEl) { amtEl.textContent = fmtGL(val); amtEl.className = (val>=0?'te-sd-gain-pos':'te-sd-gain-neg') + (barId==='te-sd-l16-bar'?' te-sd-net-amt':' te-sd-net-amt'); }
        };
        updateNetBar('te-sd-l7-bar',  'te-sd-l7',  sl.l7 ||0);
        updateNetBar('te-sd-l15-bar', 'te-sd-l15', sl.l15||0);
        updateNetBar('te-sd-l16-bar', 'te-sd-l16', sl.l16||0);

        // Line 17
        let l17el = gd('te-sd-l17');
        if (l17el) {
          l17el.textContent = sl.l17yes ? 'Yes \u2014 complete lines 18 and 19 below' : 'No \u2014 skip to line 21';
          l17el.className = 'te-sd-smry-val ' + (sl.l17yes ? 'te-sd-gain-pos' : 'te-sd-dimmed');
        }
        // Line 18/19 row — enable/disable based on l17yes
        ['te-sd-l18-row','te-sd-l19-row','te-sd-l20-row'].forEach(id => {
          let row = gd(id);
          if (row) { row.classList.toggle('te-sd-dimmed', !sl.l17yes); let inp = row.querySelector('input'); if (inp) inp.disabled = !sl.l17yes; }
        });

        // Line 21 — show only when line 16 is a loss
        let l21row = gd('te-sd-l21-row'), l21el = gd('te-sd-l21');
        if (l21row) l21row.style.display = (sl.l16||0) < 0 ? '' : 'none';
        if (l21el)  l21el.textContent = '(' + teFmt(Math.abs(sl.l21||0)) + ')';

        // Part III grayout — dim entire Part III + rate note when no Part I/II data yet
        let p3wrap = gd('te-sd-p3-wrap');
        if (p3wrap) {
          p3wrap.style.opacity      = sl.detailedActive ? '' : '0.35';
          p3wrap.style.pointerEvents = sl.detailedActive ? '' : 'none';
        }
      } break;
      case 'sched-c': {
        // Targeted DOM updates for every computed Schedule C line — preserves input focus
        let sl = calc.scLines || {};
        let g  = id => document.getElementById(id);
        if (g('te-sc-l3'))   g('te-sc-l3').textContent   = teFmt(sl.l3  || 0);
        if (g('te-sc-l4'))   g('te-sc-l4').textContent   = teFmt(sl.l4  || 0);
        if (g('te-sc-l5'))   g('te-sc-l5').textContent   = teFmt(sl.l5  || 0);
        if (g('te-sc-l7'))   g('te-sc-l7').textContent   = teFmt(sl.l7  || 0);
        if (g('te-sc-l27b')) g('te-sc-l27b').textContent = teFmt(sl.l27b|| 0);
        if (g('te-sc-l28'))  g('te-sc-l28').textContent  = teFmt(sl.l28 || 0);
        if (g('te-sc-l29'))  g('te-sc-l29').textContent  = teFmt(sl.l29 || 0);
        if (g('te-sc-l30'))  g('te-sc-l30').textContent  = teFmt(sl.l30 || 0);
        if (g('te-sc-l40'))  g('te-sc-l40').textContent  = teFmt(sl.l40 || 0);
        if (g('te-sc-l42'))  g('te-sc-l42').textContent  = teFmt(sl.l42 || 0);
        if (g('te-sc-l48'))  g('te-sc-l48').textContent  = teFmt(sl.l48 || 0);
        // Net profit bar — update amount and swap profit/loss class
        let netBar = g('te-sc-net-bar');
        if (netBar) {
          let net = sl.l31 || 0;
          let netAmtEl = netBar.querySelector('.te-sc-net-amt');
          if (netAmtEl) netAmtEl.textContent = net >= 0 ? teFmt(net) : `(${teFmt(Math.abs(net))})`;
          netBar.classList.toggle('te-sc-profit', net >= 0);
          netBar.classList.toggle('te-sc-loss',   net <  0);
        }
        // Line 31 standalone span (outside net bar if present)
        if (g('te-sc-l31')) {
          let net31 = sl.l31 || 0;
          g('te-sc-l31').textContent = net31 >= 0 ? teFmt(net31) : `(${teFmt(Math.abs(net31))})`;
        }
        // Line 32 (at-risk checkbox row) — show only when there is a loss
        let riskRow = g('te-sc-risk-row');
        if (riskRow) riskRow.style.display = (sl.l31 || 0) < 0 ? '' : 'none';
      } break;
      case 'sched-1': {
        // Targeted DOM updates for Schedule 1 (Part I + Part II) computed lines — preserves input focus
        let sl = calc.sched1Lines || {};
        let g1 = id => document.getElementById(id);
        let fmtPM = v => v === 0 ? '$0.00' : v > 0 ? teFmt(v) : '(' + teFmt(Math.abs(v)) + ')';
        // --- Part I ---
        // Read-only auto lines
        if (g1('te-s1-l3'))  g1('te-s1-l3').textContent  = fmtPM(sl.l3  || 0);
        if (g1('te-s1-l5'))  g1('te-s1-l5').textContent  = fmtPM(sl.l5  || 0);
        if (g1('te-s1-l6'))  g1('te-s1-l6').textContent  = teFmt(sl.l6  || 0);
        // Auto-sum lines
        if (g1('te-s1-l9'))  g1('te-s1-l9').textContent  = fmtPM(sl.l9  || 0);
        // Line 10 total bar
        let l10bar = g1('te-s1-l10-bar');
        let l10el  = g1('te-s1-l10');
        if (l10bar) {
          let v = sl.l10 || 0;
          l10bar.classList.toggle('te-sc-profit', v >= 0);
          l10bar.classList.toggle('te-sc-loss',   v <  0);
        }
        if (l10el) {
          let v = sl.l10 || 0;
          l10el.textContent = v >= 0 ? teFmt(v) : '(' + teFmt(Math.abs(v)) + ')';
        }
        // --- Part II ---
        let sl2 = calc.sched1PII_lines || {};
        let g2  = id => document.getElementById(id);
        // Inline deduction computed totals (lines 13, 18, 19a, 20, 21 — now entered directly on this screen)
        if (g2('te-s2-l13'))  g2('te-s2-l13').textContent  = teFmt(sl2.l13  || 0);
        if (g2('te-s2-l18'))  g2('te-s2-l18').textContent  = teFmt(calc.earlyWdPenalty || 0);
        if (g2('te-s2-l19a')) g2('te-s2-l19a').textContent = teFmt(sl2.l19a || 0);
        if (g2('te-s2-l20'))  g2('te-s2-l20').textContent  = teFmt(sl2.l20  || 0);
        if (g2('te-s2-l21'))  g2('te-s2-l21').textContent  = teFmt(sl2.l21  || 0);
        // Line 25 — total other adjustments
        if (g2('te-s2-l25')) g2('te-s2-l25').textContent = teFmt(sl2.l25 || 0);
        // Line 26 — total bar + value
        let l26bar = g2('te-s2-l26-bar');
        let l26el  = g2('te-s2-l26');
        if (l26bar) { let v = sl2.l26 || 0; l26bar.classList.toggle('te-sc-profit', v >= 0); l26bar.classList.toggle('te-sc-loss', v < 0); }
        if (l26el)  { l26el.textContent = teFmt(sl2.l26 || 0); }
      } break;
      case 'sched-e':    if (totalValEl) totalValEl.textContent = teFmt(calc.scheduleENet                                          || 0); break;
      case 'ctc':        if (totalValEl) totalValEl.textContent = teFmt((calc.ctcNonRefundable || 0) + (calc.actcRefundable        || 0)); break;
      case 'eic':        if (totalValEl) totalValEl.textContent = teFmt(calc.eicCredit                                             || 0); break;
      case 'cdcc':       if (totalValEl) totalValEl.textContent = teFmt(calc.cdccCredit                                            || 0); break;
      case 'savers':     if (totalValEl) totalValEl.textContent = teFmt(calc.saversCredit                                          || 0); break;
      case 'energy':     if (totalValEl) totalValEl.textContent = teFmt(calc.energyCredit                                          || 0); break;
      case 'sli':        if (totalValEl) totalValEl.textContent = teFmt(calc.sliDeduction                                          || 0); break;
      case 'hsa':        if (totalValEl) totalValEl.textContent = teFmt(calc.hsaDeduction                                          || 0); break;
      case 'ira-ded':    if (totalValEl) totalValEl.textContent = teFmt(calc.iraDeduction                                          || 0); break;
      case 'alimony':    if (totalValEl) totalValEl.textContent = teFmt(calc.alimonyDeduction                                      || 0); break;
      case '1099-int': {
        // Update totals bar: aggregate ordinary interest from all cards
        let g2 = id => document.getElementById(id);
        if (g2('te-int-total-box1')) g2('te-int-total-box1').textContent = teFmt(calc.interestIncome || 0);
        if (g2('te-int-total-box4')) g2('te-int-total-box4').textContent = teFmt(calc.intWithholding || 0);
        if (g2('te-int-total-penalty')) g2('te-int-total-penalty').textContent = teFmt(calc.earlyWdPenalty || 0);
        if (totalValEl) totalValEl.textContent = teFmt(calc.interestIncome || 0);
      } break;
      case '1099-div': {
        let g2 = id => document.getElementById(id);
        if (g2('te-div-total-box1a')) g2('te-div-total-box1a').textContent = teFmt(calc.ordinaryDividends  || 0);
        if (g2('te-div-total-box1b')) g2('te-div-total-box1b').textContent = teFmt(calc.qualifiedDividends || 0);
        if (g2('te-div-total-box4'))  g2('te-div-total-box4').textContent  = teFmt(calc.divWithholding     || 0);
        if (totalValEl) totalValEl.textContent = teFmt(calc.ordinaryDividends || 0);
      } break;
      case 'sched-b': {
        // Update Schedule B computed line totals
        let g2 = id => document.getElementById(id);
        if (g2('te-sb-l2')) g2('te-sb-l2').textContent = teFmt(calc.schedBL2 || 0);  // Part I total interest
        if (g2('te-sb-l4')) g2('te-sb-l4').textContent = teFmt(calc.schedBL4 || 0);  // After Form 8815 exclusion → 1040 L2b
        if (g2('te-sb-l6')) g2('te-sb-l6').textContent = teFmt(calc.schedBL6 || 0);  // Part II total dividends → 1040 L3b
        if (totalValEl) totalValEl.textContent = teFmt((calc.schedBL4 || 0) + (calc.schedBL6 || 0));
      } break;
      case 'salt':       if (totalValEl) totalValEl.textContent = teFmt(calc.saltDeduction                                         || 0); break;
      case 'mortgage':   if (totalValEl) totalValEl.textContent = teFmt(calc.mortgageDeduction                                     || 0); break;
      case 'charitable': if (totalValEl) totalValEl.textContent = teFmt(calc.charitableDeduction                                   || 0); break;
      case 'medical':    if (totalValEl) totalValEl.textContent = teFmt(calc.medicalDeduction                                      || 0); break;
      case 'sched-a': {
        // Targeted DOM updates for unified Schedule A — preserves input focus; no innerHTML rebuilds on input elements
        // BUG FIX: replaced teGetConstants() (undefined) with direct TAX_CONSTANTS lookup
        let g2  = id => document.getElementById(id);
        let yr2 = (teCurrentReturn && teCurrentReturn.taxYear) || teActiveYear;
        let K2  = TAX_CONSTANTS[yr2] || {};
        let sa2 = (teCurrentReturn && teCurrentReturn.scheduleA) || {};
        // Medical (Lines 1–4)
        let l2El = g2('te-sa-l2'); if (l2El) l2El.textContent = teFmt(calc.agi || 0);
        let l3El = g2('te-sa-l3'); if (l3El) l3El.textContent = teFmt(teRound((calc.agi || 0) * ((K2.scheduleA && K2.scheduleA.medical && K2.scheduleA.medical.agiFloor) || 0.075)));
        let l4El = g2('te-sa-l4'); if (l4El) l4El.textContent = teFmt(calc.medicalDeduction || 0);
        // SALT (Lines 5–7) — 5d is local subtotal computed from raw inputs
        let l5dEl = g2('te-sa-l5d');
        if (l5dEl) {
          let sit = parseFloat(sa2.useSalesTax ? sa2.salesTax : sa2.stateIncomeTax) || 0;
          let lit = sa2.useSalesTax ? 0 : (parseFloat(sa2.localIncomeTax) || 0);
          let ret = parseFloat(sa2.realEstateTax) || 0;
          let ppt = parseFloat(sa2.personalPropertyTax) || 0;
          l5dEl.textContent = teFmt(sit + lit + ret + ppt);
        }
        let l7El  = g2('te-sa-l7');  if (l7El)  l7El.textContent  = teFmt(calc.saltDeduction || 0);
        // Interest (Lines 8e, 9, 10)
        let l8eEl = g2('te-sa-l8e'); if (l8eEl) l8eEl.textContent = teFmt(calc.mortgageDeduction || 0);
        let l9El  = g2('te-sa-l9');  if (l9El)  l9El.textContent  = teFmt(calc.investmentInterestAllowed || 0);
        let l10El = g2('te-sa-l10'); if (l10El) l10El.textContent = teFmt(teRound((calc.mortgageDeduction || 0) + (calc.investmentInterestAllowed || 0)));
        // Charitable (Line 14 — post-floor total)
        let l14El = g2('te-sa-l14'); if (l14El) l14El.textContent = teFmt(calc.charitableDeduction || 0);
        // Casualty (Line 15)
        let l15El = g2('te-sa-l15'); if (l15El) l15El.textContent = teFmt(calc.casualtyDeduction || 0);
        // Other deductions (gambling inline + line 16 total)
        let l16gEl = g2('te-sa-l16g'); if (l16gEl) l16gEl.textContent = teFmt(calc.gamblingDeduction || 0);
        let l16El  = g2('te-sa-l16');  if (l16El)  l16El.textContent  = teFmt(teRound((calc.gamblingDeduction || 0) + (calc.otherDeductionsTotal || 0)));
        // Grand total + haircut + net (Lines 17+)
        let l17El = g2('te-sa-l17');      if (l17El)  l17El.textContent  = teFmt(calc.itemizedRaw || 0);
        let hcEl  = g2('te-sa-haircut');  if (hcEl)   hcEl.textContent   = teFmt(calc.itemizedHaircut || 0);
        let netEl = g2('te-sa-net-total');if (netEl)  netEl.textContent  = teFmt(calc.itemizedNet || 0);
        // Comparison bar — safe to rebuild (no inputs inside)
        let barEl = g2('te-sa-comparison-bar');
        if (barEl) {
          let std   = calc.stdDed   || 0;
          let itm   = calc.itemizedNet || 0;
          let using = calc.deductionType === 'itemized' ? 'itemized' : 'standard';
          barEl.innerHTML =
            '<span style="margin-right:16px">Std: <strong>' + teFmt(std) + '</strong></span>' +
            '<span style="margin-right:16px">Itemized: <strong>' + teFmt(itm) + '</strong></span>' +
            '<span style="color:' + (using === 'itemized' ? '#4fc3f7' : '#81c784') + '">Using: <strong>' +
            (using === 'itemized' ? 'Itemized' : 'Standard') + '</strong></span>';
        }
        if (totalValEl) totalValEl.textContent = teFmt(calc.itemizedNet || 0);
      } break;
    }
  }
  // ── Menu page live updates (recalc while on a menu page) ─────────────
  if (teActiveSection === 'income' || teActiveSection === 'deductions' ||
      teActiveSection === 'credits' || teActiveSection === 'payments') {
    // Re-render the menu to update card amounts and status dots
    let body = document.getElementById('te-interview-body');
    if (body) {
      if (teActiveSection === 'income')     body.innerHTML = teRenderIncomeMenu();
      if (teActiveSection === 'deductions') body.innerHTML = teRenderDeductionsMenu();
      if (teActiveSection === 'credits')    body.innerHTML = teRenderCreditsMenu();
      if (teActiveSection === 'payments')   body.innerHTML = teRenderPaymentsMenu();
    }
  }
}
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
function teCalcCTC(r, agi, totalTax, earnedIncome, fs, K) {
  let deps = r.dependents || [];
  let yr   = r.taxYear;

  // IRC §24(h)(7): SSN required for CTC — ITIN children treated as non-CTC dependents
  // IRC §24(c)(1): qualifying child must be under 17 as of December 31
  let ctcDeps = deps.filter(d => d.isQualifyingChild && teIsUnder17(d.dob, yr) && d.hasSSN !== false);
  // ODC dependents: (a) ITIN qualifying children, (b) all non-QC dependents — IRC §24(h)(4)
  let odcDeps = deps.filter(d => !(d.isQualifyingChild && teIsUnder17(d.dob, yr) && d.hasSSN !== false));
  let odcCount = odcDeps.length;

  let ctcGross = ctcDeps.length * K.ctc.amountPerChild;
  let odcGross = odcCount * (K.ctc.odcAmount || 500);
  let totalGross = ctcGross + odcGross;
  if (totalGross === 0) return { gross: 0, afterPhaseout: 0, nonRefundable: 0, actcRefundable: 0, odcNonRefundable: 0 };

  // IRC §24(b)(1): phase-out runs on combined CTC + ODC gross — $50 per $1,000 AGI over threshold
  // Source: uscode.house.gov/view.xhtml?req=granuleid:USC-prelim-title26-section24
  let thr       = K.ctc.phaseoutThreshold[fs] || K.ctc.phaseoutThreshold.single;
  let excess    = Math.max(0, agi - thr);
  let reduction = Math.ceil(excess / 1000) * 50;
  let totalAP   = Math.max(0, totalGross - reduction);

  // Prorate the phase-out reduction between CTC and ODC proportionally to gross amounts
  let ctcAP = totalGross > 0 ? teRound(totalAP * (ctcGross / totalGross)) : 0;
  let odcAP = teRound(totalAP - ctcAP);

  // CTC — non-refundable against tax; remainder eligible for ACTC — IRC §24(d)
  let ctcNR = teRound(Math.min(ctcAP, totalTax));
  let unused = teRound(ctcAP - ctcNR);
  let actc   = 0;
  if (unused > 0) {
    // ACTC = min(unused, min($1,700 × numCTCChildren, 15% × max(0, earnedIncome − $2,500)))
    let byEarned = Math.max(0, earnedIncome - K.ctc.earnedIncomeMin) * K.ctc.earnedIncomeRate;
    let maxACTC  = K.ctc.actcMax * ctcDeps.length;
    actc = teRound(Math.min(unused, Math.min(maxACTC, byEarned)));
  }

  // ODC — non-refundable only; applied after CTC against remaining liability — IRC §24(h)(4)
  let taxAfterCTConly = teRound(Math.max(0, totalTax - ctcNR));
  let odcNR = teRound(Math.min(odcAP, taxAfterCTConly));

  return { gross: ctcGross, afterPhaseout: ctcAP, nonRefundable: ctcNR, actcRefundable: actc, odcNonRefundable: odcNR };
}
function teIsUnder17(dob, taxYear) {
  if (!dob) return false;
  let birth = new Date(dob + 'T12:00:00'); // noon avoids DST edge
  let dec31 = new Date(taxYear, 11, 31);
  let age   = dec31.getFullYear() - birth.getFullYear();
  if (dec31 < new Date(taxYear, birth.getMonth(), birth.getDate())) age--;
  return age < 17;
}
function teIsAge65OrOlder(dob, taxYear) {
  if (!dob) return false;
  let birth = new Date(dob + 'T12:00:00');
  let dec31 = new Date(taxYear, 11, 31);
  let age   = dec31.getFullYear() - birth.getFullYear();
  // IRS Pub. 501: birthday Jan 1 counts as 65 on Dec 31 of prior year — treat Jan 1 as qualifying
  let bMonth = birth.getMonth(), bDay = birth.getDate();
  if (bMonth === 0 && bDay === 1) {
    // Jan 1 birthday: treated as turning 65 on Dec 31 of the preceding year → still counts
    // dec31 is Dec 31 of taxYear; age already computed correctly
  } else if (dec31 < new Date(taxYear, bMonth, bDay)) {
    age--;
  }
  return age >= 65;
}
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
function teCalcLLC(expenses, agi, fg, K) {
  if (!K) return 0;
  let cr = Math.min(expenses, K.llc.maxExpenses) * K.llc.creditRate;
  let lo = K.llc.phaseoutLower[fg], hi = K.llc.phaseoutUpper[fg];
  if (agi > lo) cr *= Math.max(0, 1 - (agi - lo) / (hi - lo));
  return Math.round(cr * 100) / 100;
}
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
function teIsEICQualifyingChild(d, taxYear) {
  if (!d.isQualifyingChild) return false;         // Must first satisfy general QC tests
  if (d.isPermanentlyDisabled) return true;        // Alternative (III): any age — IRC §32(c)(3)(A)(ii)(III)
  if (!d.dob) return false;
  let birth = new Date(d.dob + 'T12:00:00');      // Noon avoids DST edge
  let dec31 = new Date(taxYear, 11, 31);
  let age   = dec31.getFullYear() - birth.getFullYear();
  if (dec31 < new Date(taxYear, birth.getMonth(), birth.getDate())) age--;
  if (age < 19) return true;                       // Alternative (I): under 19 — IRC §32(c)(3)(A)(ii)(I)
  if (age < 24 && d.isFullTimeStudent) return true; // Alternative (II): under 24, student — IRC §32(c)(3)(A)(ii)(II)
  return false;
}
function teCountEICQC(r) {
  let taxYear = r.taxYear || teActiveYear;
  return Math.min(3, (r.dependents || []).filter(d => teIsEICQualifyingChild(d, taxYear)).length);
}
function teCalcEIC(r, calc, fs, K) {
  // IRC §32(d): MFS filers categorically ineligible
  if (fs === 'mfs') return 0;

  let eicK = K.eic;
  if (!eicK) return 0;

  // Earned income for EIC: W-2 wages + net SE income — IRC §32(c)(2)(A)
  // NOTE: Nontaxable combat pay election (IRC §32(c)(2)(B)) not implemented — TODO Track 5 future
  let earnedIncome = teRound(calc.w2Wages + calc.netSEIncome);
  if (earnedIncome <= 0) return 0;

  let numQC   = teCountEICQC(r);
  let eicData = r.eic || {};

  // If no EIC qualifying children and claimChildless not checked → no EIC
  // Childless EIC age test (must be ≥25 and <65 under traditional rule) — TODO:VERIFY OBBBA changes
  if (numQC === 0 && !eicData.claimChildless) return 0;

  // IRC §32(i)(1) — Investment income disqualifier
  // Investment income = interest + dividends + net capital gain + passive income
  // Source: IRC §32(i)(2) — uscode.house.gov/view.xhtml?req=granuleid:USC-prelim-title26-section32
  let investmentIncome = teRound(
    calc.interestIncome
    + calc.ordinaryDividends
    + Math.max(0, calc.scheduleDNet)      // net cap gain (losses don't reduce for EIC purposes)
    + Math.max(0, calc.scheduleEPassive)  // passive income (rents, royalties, passive K-1)
  );
  if (investmentIncome > eicK.investmentIncomeLimit) return 0;

  let qcKey      = Math.min(numQC, 3);  // 3+ treated same as 3
  let maxCredit  = eicK.maxCredit[qcKey];
  let phaseInR   = eicK.phaseInRate[qcKey];
  let phaseOutR  = eicK.phaseOutRate[qcKey];

  // Phase-in: tentative credit = min(earnedIncome × phaseInRate, maxCredit) — IRC §32(a)(1)
  let tentative  = teRound(Math.min(earnedIncome * phaseInR, maxCredit));

  // Phase-out base: GREATER of AGI or earned income — IRC §32(a)(2)
  // This prevents artificially low earned income (e.g., large losses) from defeating the phase-out
  let phaseBase  = Math.max(calc.agi, earnedIncome);

  // MFJ gets joint return phaseout bonus — IRC §32(b)(3)
  let threshold  = eicK.phaseOutThreshold[qcKey] + (fs === 'mfj' ? eicK.jointBonus : 0);

  // Phase-out: reduction = max(0, (phaseBase − threshold) × phaseOutRate)
  let excess     = Math.max(0, phaseBase - threshold);
  let reduction  = teRound(excess * phaseOutR);

  return teRound(Math.max(0, tentative - reduction));
}
function teCalcCDCC(r, calc, K, fs) {
  // IRC §21(e)(2): MFS categorically ineligible
  if (fs === 'mfs') return { credit: 0, rate: 0, qualifyingExpenses: 0 };
  let C = K.cdcc;
  if (!C) return { credit: 0, rate: 0, qualifyingExpenses: 0 };

  let d = r.cdcc || {};
  let persons = d.qualifyingPersons || '';
  if (!persons) return { credit: 0, rate: 0, qualifyingExpenses: 0 };

  let is2plus    = (persons === '2plus');
  let expenseCap = is2plus ? C.expenseCap2 : C.expenseCap1;

  // Step 1: Reduce qualifying expenses by employer-provided care benefits — IRC §21(c), §129; Form 2441
  // Box 10 (employer-provided dependent care benefits) reduces qualifying expenses alongside any
  // manually entered FSA benefits — IRC §129(a)(2) excludes from income, IRC §21(c) bars double-dipping.
  let careExp = teRound(Math.max(0, parseFloat(d.careExpenses) || 0));
  let fsaBen  = teRound(Math.max(0, (parseFloat(d.fsaBenefits) || 0) + (calc.w2Box10 || 0)));
  let netExp  = teRound(Math.max(0, careExp - fsaBen));

  // Step 2: Apply dollar cap — IRC §21(c)
  netExp = teRound(Math.min(netExp, expenseCap));
  if (netExp <= 0) return { credit: 0, rate: 0, qualifyingExpenses: 0 };

  // Step 3: Earned income limit — IRC §21(d)
  // MFJ: netExp capped at the LESSER of both spouses' earned income
  // Single/HOH/QSS: capped at taxpayer's earned income
  let taxpayerEI = teRound(calc.w2Wages + calc.netSEIncome);
  if (fs === 'mfj') {
    let spouseEI;
    if (d.spouseIsStudentOrDisabled) {
      // IRC §21(d)(2): deemed earned income for student or disabled spouse
      let months  = Math.min(12, Math.max(0, parseInt(d.studentDisabledMonths) || 0));
      let deemed  = is2plus ? C.deemedIncome2 : C.deemedIncome1;
      spouseEI    = teRound(deemed * months);
    } else {
      spouseEI = teRound(Math.max(0, parseFloat(d.spouseEarnedIncome) || 0));
    }
    netExp = teRound(Math.min(netExp, Math.min(taxpayerEI, spouseEI)));
  } else {
    netExp = teRound(Math.min(netExp, taxpayerEI));
  }
  if (netExp <= 0) return { credit: 0, rate: 0, qualifyingExpenses: 0 };

  // Step 4: Applicable credit rate — IRC §21(a)(2)
  let agi  = calc.agi || 0;
  let rate;
  if (C.tier1Floor !== undefined) {
    // 2026+ two-tier structure — OBBBA §70405
    // Tier 1: 50% → floor 35%, reduce 1% per $2,000 above $15,000
    let t1Reductions = Math.ceil(Math.max(0, agi - C.tier1Threshold) / C.tier1Step);
    let afterTier1   = Math.max(C.tier1Floor, C.rateStart - t1Reductions * 0.01);
    // Tier 2: further reduce 1% per $2,000 single / $4,000 MFJ above $75,000 / $150,000
    let t2Thresh     = (fs === 'mfj') ? C.tier2ThresholdMFJ     : C.tier2ThresholdSingle;
    let t2Step       = (fs === 'mfj') ? C.tier2StepMFJ          : C.tier2StepSingle;
    let t2Reductions = Math.ceil(Math.max(0, agi - t2Thresh) / t2Step);
    rate = Math.max(C.tier2Floor, afterTier1 - t2Reductions * 0.01);
  } else {
    // 2025 single-tier structure — pre-OBBBA
    let reductions = Math.ceil(Math.max(0, agi - C.rateThreshold) / C.rateStep);
    rate = Math.max(C.rateFloor, C.rateStart - reductions * 0.01);
  }

  let credit = teRound(netExp * rate);
  return { credit, rate, qualifyingExpenses: netExp };
}
function teCalcSavers(r, calc, K, fs) {
  // IRC §25B(g): MFS categorically ineligible
  if (fs === 'mfs') return { taxpayerCredit: 0, spouseCredit: 0, total: 0 };
  let C = K.savers;
  if (!C) return { taxpayerCredit: 0, spouseCredit: 0, total: 0 };

  let d = r.savers || {};

  // IRC §25B(c): categorical disqualifiers — full-time student or under age 18
  if (d.taxpayerIsStudent) return { taxpayerCredit: 0, spouseCredit: 0, total: 0 };
  let taxpayerAge = parseInt(d.taxpayerAge) || 0;
  if (taxpayerAge > 0 && taxpayerAge < 18) return { taxpayerCredit: 0, spouseCredit: 0, total: 0 };

  // AGI bracket lookup — rate = 0% above the highest bracket ceiling
  let bracketKey = (fs === 'mfj') ? 'mfj' : (fs === 'hoh') ? 'hoh' : 'other';
  let rate = 0;
  let agi  = calc.agi || 0;
  for (let [maxAGI, r_] of C.agiBrackets[bracketKey]) {
    if (agi <= maxAGI) { rate = r_; break; }
  }
  if (rate === 0) return { taxpayerCredit: 0, spouseCredit: 0, total: 0 };

  // Taxpayer net contributions — IRC §25B(d): reduce by distributions in current year + prior 2 years
  let tpContrib = teRound(Math.max(0, parseFloat(d.taxpayerContributions) || 0));
  let tpDistCur = teRound(Math.max(0, parseFloat(d.taxpayerDistCurrent) || 0));
  let tpDistPri = teRound(Math.max(0, parseFloat(d.taxpayerDistPrior) || 0));
  let tpNet     = teRound(Math.max(0, Math.min(C.maxContribPerPerson, tpContrib - tpDistCur - tpDistPri)));
  let tpCredit  = teRound(tpNet * rate);

  // Spouse contributions (MFJ only) — each spouse has an independent $2,000 cap
  let spCredit = 0;
  if (fs === 'mfj') {
    let spContrib = teRound(Math.max(0, parseFloat(d.spouseContributions) || 0));
    let spDistCur = teRound(Math.max(0, parseFloat(d.spouseDistCurrent) || 0));
    let spDistPri = teRound(Math.max(0, parseFloat(d.spouseDistPrior) || 0));
    let spNet     = teRound(Math.max(0, Math.min(C.maxContribPerPerson, spContrib - spDistCur - spDistPri)));
    spCredit = teRound(spNet * rate);
  }

  return { taxpayerCredit: tpCredit, spouseCredit: spCredit, total: teRound(tpCredit + spCredit), rate };
}
function teCalcEnergy(r, K) {
  let C = K.energyImprovement;
  // K.energyImprovement is null for 2026+ — credit terminated (OBBBA §70505)
  if (!C) return { poolA: 0, poolB: 0, total: 0, terminated: true, poolAQual: 0, poolBQual: 0 };

  let e = r.energyImprovement || {};

  // Pool A — General improvements, aggregate cap $1,200 with sub-limits — §25C(b)(1)
  let windows    = teRound(Math.min(Math.max(0, parseFloat(e.windows) || 0), C.poolA.subCaps.windows));
  let doorExp    = teRound(Math.max(0, parseFloat(e.doors) || 0));
  let doorCnt    = Math.max(1, parseInt(e.doorCount) || 1);
  let doorsCap   = teRound(Math.min(doorExp, Math.min(doorCnt * C.poolA.subCaps.doorPerUnit, C.poolA.subCaps.doors)));
  let energyProp = teRound(Math.min(Math.max(0, parseFloat(e.energyProperty) || 0), C.poolA.subCaps.energyProperty));
  let audit      = teRound(Math.min(Math.max(0, parseFloat(e.audit) || 0), C.poolA.subCaps.audit));
  let poolAQual  = teRound(Math.min(windows + doorsCap + energyProp + audit, C.poolA.cap));
  let poolACredit = teRound(poolAQual * C.rate);

  // Pool B — Heat pump / biomass, separate $2,000 cap — §25C(b)(2)
  let heatPumps  = teRound(Math.max(0, parseFloat(e.heatPumps) || 0));
  let heatPumpWH = teRound(Math.max(0, parseFloat(e.heatPumpWH) || 0));
  let biomass    = teRound(Math.max(0, parseFloat(e.biomass) || 0));
  let poolBQual  = teRound(Math.min(heatPumps + heatPumpWH + biomass, C.poolB.cap));
  let poolBCredit = teRound(poolBQual * C.rate);

  return {
    poolA: poolACredit, poolB: poolBCredit,
    total: teRound(poolACredit + poolBCredit),
    poolAQual, poolBQual, terminated: false,
    windows, doorsCap, energyProp, audit
  };
}
function teCalcAMT(r, calc, K, fs) {
  let A = K.amt;
  if (!A) return { amti: 0, exemption: 0, effectiveExemption: 0, tmt: 0, amt: 0, isoSpread: 0, stdAddBack: 0, saltAddBack: 0 };

  // ISO exercise spread — AMT preference item — IRC §56(b)(3)
  // User-entered: FMV minus exercise price for all ISOs exercised during the year.
  // NOT included in regular income (W-2 or otherwise) but DOES increase AMTI.
  let iso = teRound(Math.max(0, parseFloat(r.isoExercise) || 0));

  // ── Step 1: Compute AMTI — IRC §55(b)(2) ────────────────────────────
  // Start from regular taxable income and add back AMT disallowed items.
  //
  // Disallowed for AMT:
  //   Standard deduction — IRC §56(b)(1)(E)
  //   State and local taxes (SALT) — IRC §56(b)(1)(A)(ii)
  //
  // Allowed for AMT (no add-back needed):
  //   Qualified mortgage interest — IRC §56(b)(1)(C)(i) exception
  //   Charitable contributions — not disallowed
  //   Medical expenses at 7.5% floor — ARP Act P.L. 117-2 §9222 set permanent 7.5% for both regular + AMT
  //
  // Standard deduction add-back: applies only if standard deduction was taken.
  let stdAddBack  = calc.deductionType === 'standard' ? (calc.stdDed || 0) : 0;
  // SALT add-back: applies only if itemized (if standard, SALT was never deducted).
  let saltAddBack = calc.deductionType === 'itemized'  ? (calc.saltDeduction || 0) : 0;

  let amti = teRound(calc.taxableIncome + stdAddBack + saltAddBack + iso);

  // ── Step 2: AMT Exemption — IRC §55(d) ──────────────────────────────
  // Exemption phases out at phaseoutRate per dollar of AMTI above threshold.
  // 2025: 25% rate — STATUTORY. 2026: 50% rate — OBBBA §70101.
  let fsKey = (fs === 'qss') ? 'mfj' : fs;
  let exemption          = A.exemption[fsKey]          || A.exemption.single;
  let threshold          = A.phaseoutThreshold[fsKey]  || A.phaseoutThreshold.single;
  let phaseoutReduction  = teRound(Math.max(0, amti - threshold) * A.phaseoutRate);
  let effectiveExemption = teRound(Math.max(0, exemption - phaseoutReduction));
  let amtiAfterExemption = teRound(Math.max(0, amti - effectiveExemption));

  if (amtiAfterExemption <= 0) {
    return { amti, exemption, effectiveExemption, tmt: 0, amt: 0, isoSpread: iso, stdAddBack, saltAddBack };
  }

  // ── Step 3: Tentative Minimum Tax (TMT) — IRC §55(b)(1) ─────────────
  // IRC §55(b)(3): QDLTCG portion of AMTI is taxed at preferential 0%/15%/20% rates
  // (same as regular tax) rather than the flat 26%/28% AMT rates.
  // This mirrors the Form 6251 Line 17 worksheet.
  let rateBreak = (fs === 'mfs') ? A.rateBreak.mfs : A.rateBreak.standard;
  let qdltcg    = calc.qdltcg || 0;
  let tmt;

  if (qdltcg > 0 && amtiAfterExemption > 0) {
    // QDLTCG in AMTI = min(qdltcg, amtiAfterExemption) — can't exceed total AMTI
    let qdltcgInAMTI = Math.min(qdltcg, amtiAfterExemption);
    let ordinaryAMTI = teRound(amtiAfterExemption - qdltcgInAMTI);
    let ordinaryTMT  = teCalcAMTOrdinary(ordinaryAMTI, rateBreak, A);
    // Preferential rate on QDLTCG: use the same QDLTCG worksheet as regular tax,
    // substituting amtiAfterExemption for taxableIncome and ordinaryAMTI for ordinaryPortion.
    let qdltcgTMT    = teCalcQDLTCGTax(qdltcgInAMTI, amtiAfterExemption, ordinaryAMTI, K, fs);
    tmt = teRound(ordinaryTMT + qdltcgTMT);
  } else {
    tmt = teCalcAMTOrdinary(amtiAfterExemption, rateBreak, A);
  }

  // ── Step 4: AMT Liability — IRC §55(a) ──────────────────────────────
  // AMT = max(0, TMT − regular IRC §1 tax)
  // regularTax here is the pre-credit regular tax (after QDLTCG worksheet if applicable).
  // Note: AMT paid due to deferral items (e.g. ISO) generates an MTC carryforward — IRC §53.
  let amt = teRound(Math.max(0, tmt - (calc.regularTax || 0)));

  return { amti, exemption, effectiveExemption, tmt, amt, isoSpread: iso, stdAddBack, saltAddBack };
}
function teCalcAMTOrdinary(amtiOrdinary, rateBreak, A) {
  if (amtiOrdinary <= 0)         return 0;
  if (amtiOrdinary <= rateBreak) return teRound(amtiOrdinary * A.rate26);
  return teRound(rateBreak * A.rate26 + (amtiOrdinary - rateBreak) * A.rate28);
}
