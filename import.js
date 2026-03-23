// ══════════════════════════════════════
//  UNIVERSAL IMPORT TOOL
//  Handles: CSV, XLSX, TSV, QBO (QuickBooks), Trial Balance
// ══════════════════════════════════════

let importRawRows    = [];   // Raw parsed rows from file
let importMapped     = [];   // After column mapping
let importClientId   = "";
let importPeriodId   = "";
let importFileName   = "";
let importFileType   = "";   // "csv" | "xlsx" | "qbo" | "trialbalance"
let importColMap     = {};   // { date, description, debit, credit, amount, account }
let importPreviewJEs = [];   // Final journal entries ready to post

function loadImportTab() {
  let el = document.getElementById("import-main");
  if (!el) return;

  let clientOpts = clients.map(c =>
    `<option value="${c.uid}">${c.name}</option>`).join("");

  el.innerHTML = `
    <div class="dash-card" style="margin-bottom:20px;">
      <h3 style="font-size:15px;font-weight:700;margin-bottom:16px;">Step 1 — Select Client & Period</h3>
      <div class="acct-selectors">
        <div class="acct-selector-group">
          <label>Client</label>
          <select id="import-client-sel" class="assign-select" onchange="onImportClientChange()">
            <option value="">— Select Client —</option>
            ${clientOpts}
          </select>
        </div>
        <div class="acct-selector-group">
          <label>Period</label>
          <select id="import-period-sel" class="assign-select" disabled onchange="onImportPeriodChange()">
            <option value="">— Select Period —</option>
          </select>
        </div>
      </div>
    </div>

    <div class="dash-card" id="import-upload-card" style="margin-bottom:20px;display:none;">
      <h3 style="font-size:15px;font-weight:700;margin-bottom:8px;">Step 2 — Upload File</h3>
      <p style="font-size:13px;color:var(--text-muted);margin-bottom:16px;">
        Accepts CSV, Excel (.xlsx), QuickBooks export (.qbo), or a trial balance spreadsheet.
      </p>
      <div id="import-dropzone" class="import-dropzone"
        ondragover="event.preventDefault();this.classList.add('drag-over')"
        ondragleave="this.classList.remove('drag-over')"
        ondrop="handleImportDrop(event)">
        <div class="import-drop-icon">↑</div>
        <div class="import-drop-text">Drag & drop your file here</div>
        <div class="import-drop-sub">or</div>
        <label class="primary-btn" style="cursor:pointer;margin-top:8px;">
          Browse File
          <input type="file" id="import-file-input" accept=".csv,.xlsx,.xls,.qbo,.tsv,.txt"
            style="display:none;" onchange="handleImportFile(this.files[0])">
        </label>
        <div class="import-drop-sub" style="margin-top:12px;">CSV · Excel · QuickBooks · Trial Balance</div>
      </div>
      <div id="import-file-info" style="display:none;margin-top:12px;"></div>
    </div>

    <div id="import-map-card" style="display:none;"></div>
    <div id="import-preview-card" style="display:none;"></div>
    <div id="import-result-card" style="display:none;"></div>`;
}

async function onImportClientChange() {
  let sel = document.getElementById("import-client-sel");
  importClientId = sel.value;
  if (!importClientId) return;
  await loadPeriodsForClient(importClientId, "import-period-sel");
  document.getElementById("import-period-sel").disabled = false;
}

function onImportPeriodChange() {
  let sel = document.getElementById("import-period-sel");
  importPeriodId = sel.value;
  if (!importPeriodId) return;
  document.getElementById("import-upload-card").style.display = "block";
  document.getElementById("import-upload-card").scrollIntoView({ behavior: "smooth" });
}

function handleImportDrop(e) {
  e.preventDefault();
  document.getElementById("import-dropzone").classList.remove("drag-over");
  let file = e.dataTransfer.files[0];
  if (file) handleImportFile(file);
}

async function handleImportFile(file) {
  if (!file) return;
  importFileName = file.name;
  let ext = file.name.split(".").pop().toLowerCase();

  let info = document.getElementById("import-file-info");
  info.style.display = "block";
  info.innerHTML = `<span style="font-size:13px;color:var(--text-muted);">📄 ${file.name} (${(file.size/1024).toFixed(1)} KB) — Parsing...</span>`;

  try {
    if (ext === "qbo") {
      await parseQBO(file);
    } else if (ext === "xlsx" || ext === "xls") {
      await parseXLSX(file);
    } else {
      await parseCSV(file);
    }
  } catch(err) {
    info.innerHTML = `<span style="color:var(--red);font-size:13px;">⚠ Error reading file: ${err.message}</span>`;
  }
}

// ── CSV / TSV Parser ──
async function parseCSV(file) {
  let text = await file.text();
  let lines = text.trim().split(/\r?\n/);
  let delimiter = text.includes("\t") ? "\t" : ",";

  // Parse respecting quoted fields
  function parseLine(line) {
    let result = [], current = "", inQuote = false;
    for (let i = 0; i < line.length; i++) {
      let ch = line[i];
      if (ch === '"') { inQuote = !inQuote; continue; }
      if (ch === delimiter && !inQuote) { result.push(current.trim()); current = ""; continue; }
      current += ch;
    }
    result.push(current.trim());
    return result;
  }

  let headers = parseLine(lines[0]);
  let rows = lines.slice(1)
    .filter(l => l.trim())
    .map(l => {
      let vals = parseLine(l);
      let obj = {};
      headers.forEach((h, i) => obj[h] = vals[i] || "");
      return obj;
    });

  importRawRows = rows;
  importFileType = detectFileType(headers, rows);
  showColumnMapper(headers);
}

// ── XLSX Parser ──
async function parseXLSX(file) {
  if (typeof XLSX === "undefined") {
    throw new Error("Excel library not loaded. Please refresh the page.");
  }
  let ab = await file.arrayBuffer();
  let wb = XLSX.read(ab, { type: "array" });
  let ws = wb.Sheets[wb.SheetNames[0]];
  let rows = XLSX.utils.sheet_to_json(ws, { defval: "" });
  importRawRows = rows;
  let headers = rows.length ? Object.keys(rows[0]) : [];
  importFileType = detectFileType(headers, rows);
  showColumnMapper(headers);
}

// ── QBO (QuickBooks) Parser ──
async function parseQBO(file) {
  let text = await file.text();
  // QBO is OFX-like XML or SGML — extract STMTTRN blocks
  let transactions = [];
  let regex = /<STMTTRN>([\s\S]*?)<\/STMTTRN>/gi;
  let match;
  while ((match = regex.exec(text)) !== null) {
    let block = match[1];
    let get = tag => { let m = block.match(new RegExp(`<${tag}>([^<]+)`,"i")); return m ? m[1].trim() : ""; };
    let amt = parseFloat(get("TRNAMT")) || 0;
    transactions.push({
      Date:        formatQBODate(get("DTPOSTED")),
      Description: get("NAME") || get("MEMO"),
      Amount:      amt,
      Debit:       amt > 0 ? amt : "",
      Credit:      amt < 0 ? Math.abs(amt) : "",
      Reference:   get("FITID")
    });
  }
  if (!transactions.length) throw new Error("No transactions found in QBO file. Make sure it's a valid QuickBooks export.");
  importRawRows = transactions;
  importFileType = "qbo";
  // QBO has known columns — skip mapper and go straight to account mapping
  showQBOAccountMapper(transactions);
}

function formatQBODate(d) {
  if (!d || d.length < 8) return d;
  return `${d.slice(0,4)}-${d.slice(4,6)}-${d.slice(6,8)}`;
}

// ── File Type Detection ──
function detectFileType(headers, rows) {
  let h = headers.map(x => x.toLowerCase().replace(/\s+/g,""));
  // Trial balance: has debit + credit columns but no date
  if ((h.includes("debit") || h.includes("debits")) &&
      (h.includes("credit") || h.includes("credits")) &&
      !h.some(x => x.includes("date"))) return "trialbalance";
  // Bank statement: has date + amount/debit/credit
  if (h.some(x=>x.includes("date")) && h.some(x=>x.includes("amount")||x.includes("debit")||x.includes("credit"))) return "bankstatement";
  return "generic";
}

// ══════════════════════════════════════
//  COLUMN MAPPER — Generic CSV/XLSX
// ══════════════════════════════════════

function showColumnMapper(headers) {
  document.getElementById("import-file-info").innerHTML =
    `<span style="font-size:13px;color:var(--green);">✓ File loaded — ${importRawRows.length} rows detected</span>`;

  let card = document.getElementById("import-map-card");
  card.style.display = "block";

  // Auto-detect columns
  let auto = autoDetectColumns(headers);

  let makeSelect = (field, label, hint) => {
    let opts = `<option value="">— Not in file —</option>` +
      headers.map(h => `<option value="${h}" ${auto[field]===h?"selected":""}>${h}</option>`).join("");
    return `
      <div class="acct-selector-group">
        <label>${label} <span style="color:var(--text-muted);font-size:11px;">${hint}</span></label>
        <select class="assign-select" id="map-${field}" onchange="updateImportColMap()">
          ${opts}
        </select>
      </div>`;
  };

  // Preview first 3 rows
  let previewHeaders = headers.slice(0, 6);
  let previewRows = importRawRows.slice(0, 3);
  let previewTable = `
    <div style="overflow-x:auto;margin-bottom:20px;">
      <table style="width:100%;border-collapse:collapse;font-size:12px;">
        <thead>
          <tr>${previewHeaders.map(h=>`<th style="padding:6px 8px;background:var(--bg-secondary);border:1px solid var(--border);text-align:left;">${h}</th>`).join("")}</tr>
        </thead>
        <tbody>
          ${previewRows.map(r=>`<tr>${previewHeaders.map(h=>`<td style="padding:6px 8px;border:1px solid var(--border);color:var(--text-muted);">${r[h]||""}</td>`).join("")}</tr>`).join("")}
        </tbody>
      </table>
    </div>`;

  card.innerHTML = `
    <div class="dash-card" style="margin-bottom:20px;">
      <h3 style="font-size:15px;font-weight:700;margin-bottom:4px;">Step 3 — Map Columns</h3>
      <p style="font-size:13px;color:var(--text-muted);margin-bottom:16px;">
        Tell us which column in your file corresponds to each field. We've auto-detected where possible.
      </p>
      ${previewTable}
      <div class="acct-selectors" style="flex-wrap:wrap;">
        ${makeSelect("date",        "Date column",        "(transaction date)")}
        ${makeSelect("description", "Description column", "(memo / payee / narration)")}
        ${makeSelect("debit",       "Debit column",       "(money out / DR)")}
        ${makeSelect("credit",      "Credit column",      "(money in / CR)")}
        ${makeSelect("amount",      "Amount column",      "(if single amount column)")}
        ${makeSelect("account",     "Account column",     "(optional — if file has account names)")}
      </div>
      <div style="margin-top:16px;display:flex;gap:12px;align-items:center;">
        <button class="primary-btn" onclick="buildImportPreview()">Continue →</button>
        <span id="import-map-error" style="color:var(--red);font-size:13px;"></span>
      </div>
    </div>`;

  updateImportColMap();
}

function autoDetectColumns(headers) {
  let h = headers.map(x => x.toLowerCase().replace(/[\s_\-]/g,""));
  let find = (...terms) => headers[h.findIndex(x => terms.some(t => x.includes(t)))] || "";
  return {
    date:        find("date","posted","transdate","txndate"),
    description: find("description","desc","memo","payee","name","narration","detail","reference"),
    debit:       find("debit","dr","withdrawal","out","paid","expense","charge"),
    credit:      find("credit","cr","deposit","in","received","income"),
    amount:      find("amount","amt","value","total"),
    account:     find("account","acct","category","gl")
  };
}

function updateImportColMap() {
  ["date","description","debit","credit","amount","account"].forEach(f => {
    let el = document.getElementById("map-" + f);
    if (el) importColMap[f] = el.value;
  });
}

// ══════════════════════════════════════
//  TRIAL BALANCE IMPORTER
// ══════════════════════════════════════

function showQBOAccountMapper(transactions) {
  // For QBO, skip column mapping — go straight to preview
  importColMap = { date:"Date", description:"Description", debit:"Debit", credit:"Credit", amount:"Amount" };
  buildImportPreview();
}

async function buildImportPreview() {
  updateImportColMap();

  // Validate minimum columns
  let hasDate = !!importColMap.date;
  let hasDesc = !!importColMap.description;
  let hasAmt  = !!importColMap.debit || !!importColMap.amount;

  let errEl = document.getElementById("import-map-error");
  if (!hasDesc || !hasAmt) {
    if (errEl) errEl.textContent = "Please map at least a Description and a Debit or Amount column.";
    return;
  }
  if (errEl) errEl.textContent = "";

  await initChartOfAccounts();

  // Detect if this is a trial balance (debit+credit, no date)
  if (importFileType === "trialbalance") {
    buildTrialBalancePreview();
    return;
  }

  // Convert raw rows → proposed journal entries
  let proposed = [];
  importRawRows.forEach((row, idx) => {
    let dateStr = importColMap.date ? row[importColMap.date] : "";
    let desc    = importColMap.description ? (row[importColMap.description] || "Imported transaction") : "Imported transaction";
    let dr      = parseFloat((importColMap.debit  ? row[importColMap.debit]  : "") || "") || 0;
    let cr      = parseFloat((importColMap.credit ? row[importColMap.credit] : "") || "") || 0;
    let amt     = parseFloat((importColMap.amount ? row[importColMap.amount] : "") || "") || 0;

    // If single amount column — positive = debit, negative = credit
    if (!dr && !cr && amt) {
      if (amt > 0) dr = amt;
      else cr = Math.abs(amt);
    }

    if (!dr && !cr) return; // Skip zero rows

    proposed.push({
      _idx:     idx,
      dateStr:  normalizeDate(dateStr),
      desc:     desc.trim(),
      debit:    dr,
      credit:   cr,
      rawRow:   row,
      // Default account mapping — user can override
      drAccountId: "",
      crAccountId: "",
      skip: false
    });
  });

  importPreviewJEs = proposed;
  renderImportPreview(proposed);
}

function normalizeDate(str) {
  if (!str) return new Date().toISOString().slice(0,10);
  // Handle MM/DD/YYYY, YYYY-MM-DD, DD/MM/YYYY, MM-DD-YYYY
  str = str.toString().trim();
  let m;
  if ((m = str.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})$/))) {
    let y = m[3].length === 2 ? "20" + m[3] : m[3];
    return `${y}-${m[1].padStart(2,"0")}-${m[2].padStart(2,"0")}`;
  }
  if ((m = str.match(/^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})$/))) {
    return `${m[1]}-${m[2].padStart(2,"0")}-${m[3].padStart(2,"0")}`;
  }
  // Try native Date parse as fallback
  let d = new Date(str);
  if (!isNaN(d)) return d.toISOString().slice(0,10);
  return new Date().toISOString().slice(0,10);
}

function renderImportPreview(proposed) {
  let card = document.getElementById("import-preview-card");
  card.style.display = "block";
  card.scrollIntoView({ behavior: "smooth" });

  let acctOpts = `<option value="">— Select Account —</option>` +
    chartOfAccounts.filter(a=>a.isActive)
      .map(a => `<option value="${a._id}" data-number="${a.number}" data-name="${a.name}">${a.number} — ${a.name}</option>`)
      .join("");

  let totalAmt = proposed.reduce((s,r)=>s+r.debit+r.credit,0);

  card.innerHTML = `
    <div class="dash-card">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:16px;flex-wrap:wrap;gap:12px;">
        <div>
          <h3 style="font-size:15px;font-weight:700;margin-bottom:4px;">Step 4 — Review & Map Accounts</h3>
          <p style="font-size:13px;color:var(--text-muted);">
            ${proposed.length} transactions detected.<br>
            Each row needs a <strong>Debit Account</strong> and a <strong>Credit Account</strong> to create a balanced journal entry.
            Use "Skip" to exclude a row.
          </p>
        </div>
        <div style="display:flex;gap:8px;flex-wrap:wrap;">
          <button class="ghost-btn" onclick="importSkipAll()">Skip All</button>
          <button class="ghost-btn" onclick="importBulkAccount('dr')">Bulk Set DR</button>
          <button class="ghost-btn" onclick="importBulkAccount('cr')">Bulk Set CR</button>
        </div>
      </div>

      <div style="overflow-x:auto;">
        <div style="display:grid;grid-template-columns:90px 1fr 90px 180px 180px 50px;gap:8px;padding:8px 12px;background:var(--bg-secondary);border-radius:8px 8px 0 0;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;color:var(--text-muted);border:1px solid var(--border);">
          <span>Date</span>
          <span>Description</span>
          <span>Amount</span>
          <span>Debit Account (DR)</span>
          <span>Credit Account (CR)</span>
          <span>Skip</span>
        </div>
        <div id="import-preview-rows">
          ${proposed.map((r,i) => {
            let amt = r.debit || r.credit;
            return `
            <div style="display:grid;grid-template-columns:90px 1fr 90px 180px 180px 50px;gap:8px;padding:8px 12px;border:1px solid var(--border);border-top:none;align-items:center;" id="ipr-${i}" ${r.skip?"style='display:grid;grid-template-columns:90px 1fr 90px 180px 180px 50px;gap:8px;padding:8px 12px;border:1px solid var(--border);border-top:none;align-items:center;opacity:0.4;'":""}>
              <span style="font-size:12px;color:var(--text-muted);">${r.dateStr}</span>
              <span style="font-size:13px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;" title="${esc(r.desc)}">${esc(r.desc.slice(0,45))}${r.desc.length>45?"…":""}</span>
              <span style="font-size:13px;font-weight:600;">$${fmtMoney(amt)}</span>
              <select class="assign-select" style="font-size:12px;" id="ipr-dr-${i}" onchange="setImportAccount(${i},'dr',this)">
                ${acctOpts}
              </select>
              <select class="assign-select" style="font-size:12px;" id="ipr-cr-${i}" onchange="setImportAccount(${i},'cr',this)">
                ${acctOpts}
              </select>
              <label class="checkbox-label" style="font-size:12px;justify-content:center;">
                <input type="checkbox" ${r.skip?"checked":""} onchange="toggleImportSkip(${i},this.checked)">
                <span class="checkbox-custom"></span>
              </label>
            </div>`;
          }).join("")}
        </div>
      </div>

      <div style="margin-top:20px;display:flex;gap:12px;align-items:center;flex-wrap:wrap;">
        <button class="primary-btn" onclick="postImportEntries()">Post All Entries →</button>
        <span id="import-post-error" style="color:var(--red);font-size:13px;"></span>
      </div>
    </div>`;
}

function setImportAccount(i, side, sel) {
  if (side === "dr") importPreviewJEs[i].drAccountId = sel.value;
  else               importPreviewJEs[i].crAccountId = sel.value;
}

function toggleImportSkip(i, checked) {
  importPreviewJEs[i].skip = checked;
  let row = document.getElementById("ipr-" + i);
  if (row) row.style.opacity = checked ? "0.4" : "1";
}

function importSkipAll() {
  importPreviewJEs.forEach((r,i) => {
    r.skip = true;
    let row = document.getElementById("ipr-" + i);
    if (row) { row.style.opacity = "0.4"; let cb = row.querySelector("input[type=checkbox]"); if (cb) cb.checked = true; }
  });
}

function importBulkAccount(side) {
  let label = side === "dr" ? "Debit (DR)" : "Credit (CR)";
  showInputModal({ title: "Bulk Set " + label + " Account",
    fields:[{id:"acct", label:"Account Number", placeholder:"e.g. 100 for Cash, 400 for Revenue"}],
    confirmText:"Apply to All",
    onConfirm: function(vals) {
      let acct = vals.acct.trim();
      if (!acct) return;
      let match = chartOfAccounts.find(a => a.number === acct);
      if (!match) { toast("Account not found: " + acct, "error"); return; }
      importPreviewJEs.forEach((r,i) => {
        if (r.skip) return;
        if (side === "dr") {
          r.drAccountId = match._id;
          let sel = document.getElementById("ipr-dr-" + i);
          if (sel) sel.value = match._id;
        } else {
          r.crAccountId = match._id;
          let sel = document.getElementById("ipr-cr-" + i);
          if (sel) sel.value = match._id;
        }
      });
    }
  });
}

async function postImportEntries() {
  let toPost = importPreviewJEs.filter(r => !r.skip);
  let errEl  = document.getElementById("import-post-error");

  if (!toPost.length) { errEl.textContent = "No entries to post — all rows are skipped."; return; }

  // Every row needs both a DR and CR account to create a balanced entry
  let unmapped = toPost.filter(r => !r.drAccountId || !r.crAccountId);
  if (unmapped.length) {
    errEl.textContent = `${unmapped.length} row(s) are missing a debit or credit account. Assign both sides or skip the row.`;
    return;
  }
  errEl.textContent = "";

  // Build one balanced journal entry per row: DR side + CR side
  let batch = db.batch();
  let count = 0;

  toPost.forEach(r => {
    let amt = r.debit || r.credit;
    if (!amt) return;

    let drAcct = chartOfAccounts.find(a => a._id === r.drAccountId);
    let crAcct = chartOfAccounts.find(a => a._id === r.crAccountId);

    let lines = [
      { accountId: r.drAccountId, accountNumber: drAcct?.number||"", accountName: drAcct?.name||"", debit: amt, credit: 0 },
      { accountId: r.crAccountId, accountNumber: crAcct?.number||"", accountName: crAcct?.name||"", debit: 0, credit: amt }
    ];

    let ref = db.collection("journalEntries").doc();
    batch.set(ref, {
      clientId:     importClientId,
      periodId:     importPeriodId,
      entryDate:    firebase.firestore.Timestamp.fromDate(new Date(r.dateStr + "T12:00:00")),
      description:  r.desc,
      isAdjusting:  false,
      lines:        lines,
      importedFrom: importFileName,
      postedBy:     "Import Tool",
      createdAt:    firebase.firestore.FieldValue.serverTimestamp()
    });
    count++;
  });

  try {
    await batch.commit();
    showImportSuccess(count);
  } catch(e) {
    errEl.textContent = "Failed to post: " + e.message;
  }
}

function showImportSuccess(count) {
  let card = document.getElementById("import-result-card");
  card.style.display = "block";
  card.innerHTML = `
    <div class="dash-card" style="text-align:center;padding:40px;">
      <div style="font-size:40px;margin-bottom:16px;">✓</div>
      <h3 style="font-size:18px;font-weight:700;margin-bottom:8px;">Import Complete</h3>
      <p style="font-size:14px;color:var(--text-muted);margin-bottom:24px;">
        ${count} journal entries posted successfully to the General Ledger.
      </p>
      <div style="display:flex;gap:12px;justify-content:center;">
        <button class="primary-btn" onclick="switchDashTab('gl')">View in GL →</button>
        <button class="ghost-btn" onclick="loadImportTab()">Import Another File</button>
      </div>
    </div>`;
  card.scrollIntoView({ behavior: "smooth" });
  document.getElementById("import-preview-card").style.display = "none";
  document.getElementById("import-map-card").style.display = "none";
}

// ══════════════════════════════════════
//  TRIAL BALANCE IMPORTER
//  Rows have: Account Name, Debit, Credit
//  Converts to one compound journal entry
// ══════════════════════════════════════

function buildTrialBalancePreview() {
  let card = document.getElementById("import-preview-card");
  card.style.display = "block";
  card.scrollIntoView({ behavior: "smooth" });

  let acctOpts = `<option value="">— Match Account —</option>` +
    chartOfAccounts.filter(a=>a.isActive)
      .map(a => `<option value="${a._id}" data-number="${a.number}" data-name="${a.name}">${a.number} — ${a.name}</option>`)
      .join("");

  // Try to auto-match by name
  let tbRows = importRawRows.map((row,i) => {
    let nameCol = importColMap.account || importColMap.description || Object.keys(row)[0];
    let drCol   = importColMap.debit   || Object.keys(row).find(k=>k.toLowerCase().includes("debit"))  || "";
    let crCol   = importColMap.credit  || Object.keys(row).find(k=>k.toLowerCase().includes("credit")) || "";
    let name    = row[nameCol] || "";
    let dr      = parseFloat(row[drCol]) || 0;
    let cr      = parseFloat(row[crCol]) || 0;

    // Auto-match by account name similarity
    let bestMatch = autoMatchAccount(name);

    return { name, dr, cr, accountId: bestMatch?._id || "", _idx: i };
  }).filter(r => r.name && (r.dr || r.cr));

  let totalDr = tbRows.reduce((s,r)=>s+r.dr,0);
  let totalCr = tbRows.reduce((s,r)=>s+r.cr,0);
  let balanced = Math.abs(totalDr - totalCr) < 0.01;

  card.innerHTML = `
    <div class="dash-card">
      <h3 style="font-size:15px;font-weight:700;margin-bottom:4px;">Step 4 — Trial Balance Account Matching</h3>
      <p style="font-size:13px;color:var(--text-muted);margin-bottom:4px;">
        ${tbRows.length} accounts detected. Match each to your chart of accounts. Auto-matched where possible.
      </p>
      <p style="font-size:13px;margin-bottom:16px;${balanced?"color:var(--green)":"color:var(--orange)"}">
        ${balanced ? "✓ Trial balance is in balance" : `⚠ Out of balance by $${fmtMoney(Math.abs(totalDr-totalCr))}`}
        &nbsp;·&nbsp; DR: $${fmtMoney(totalDr)} &nbsp; CR: $${fmtMoney(totalCr)}
      </p>
      <div class="import-preview-header" style="grid-template-columns:3fr 1fr 1fr 2fr;">
        <span>Account Name (from file)</span>
        <span>Debit</span>
        <span>Credit</span>
        <span>Match to Chart of Accounts</span>
      </div>
      <div id="tb-preview-rows">
        ${tbRows.map((r,i) => `
          <div class="import-preview-row" style="grid-template-columns:3fr 1fr 1fr 2fr;">
            <span style="font-size:13px;">${esc(r.name)}</span>
            <span style="font-size:13px;">${r.dr ? "$"+fmtMoney(r.dr) : ""}</span>
            <span style="font-size:13px;">${r.cr ? "$"+fmtMoney(r.cr) : ""}</span>
            <select class="assign-select" style="font-size:12px;" id="tb-acct-${i}"
              onchange="importPreviewJEs[${i}].accountId=this.value">
              ${acctOpts}
            </select>
          </div>`).join("")}
      </div>
      <div style="margin-top:20px;display:flex;gap:12px;align-items:center;">
        <button class="primary-btn" onclick="postTrialBalance(${JSON.stringify(tbRows).replace(/"/g,"&quot;")})">Post as Journal Entry →</button>
        <span id="import-post-error" style="color:var(--red);font-size:13px;"></span>
      </div>
    </div>`;

  // Set auto-matched values
  tbRows.forEach((r,i) => {
    importPreviewJEs[i] = r;
    if (r.accountId) {
      let sel = document.getElementById("tb-acct-" + i);
      if (sel) sel.value = r.accountId;
    }
  });
}

function autoMatchAccount(name) {
  if (!name) return null;
  let lower = name.toLowerCase().replace(/[^a-z0-9]/g,"");
  let best = null, bestScore = 0;
  chartOfAccounts.forEach(a => {
    let aName = a.name.toLowerCase().replace(/[^a-z0-9]/g,"");
    if (aName === lower) { best = a; bestScore = 100; return; }
    if (aName.includes(lower) || lower.includes(aName)) {
      let score = Math.min(aName.length,lower.length) / Math.max(aName.length,lower.length) * 90;
      if (score > bestScore) { best = a; bestScore = score; }
    }
  });
  return bestScore > 40 ? best : null;
}

async function postTrialBalance(tbRows) {
  // Read current account selections
  tbRows.forEach((r,i) => {
    let sel = document.getElementById("tb-acct-" + i);
    if (sel) r.accountId = sel.value;
  });

  let unmapped = tbRows.filter(r => !r.accountId);
  let errEl = document.getElementById("import-post-error");
  if (unmapped.length) {
    errEl.textContent = `${unmapped.length} account(s) not matched. Please match all rows.`;
    return;
  }
  errEl.textContent = "";

  // Build one compound journal entry from the entire trial balance
  let lines = [];
  tbRows.forEach(r => {
    let acct = chartOfAccounts.find(a => a._id === r.accountId);
    if (!acct) return;
    if (r.dr) lines.push({ accountId: r.accountId, accountNumber: acct.number, accountName: acct.name, debit: r.dr, credit: 0 });
    if (r.cr) lines.push({ accountId: r.accountId, accountNumber: acct.number, accountName: acct.name, debit: 0, credit: r.cr });
  });

  try {
    await db.collection("journalEntries").add({
      clientId:    importClientId,
      periodId:    importPeriodId,
      entryDate:   firebase.firestore.Timestamp.fromDate(new Date()),
      description: "Imported Trial Balance — " + importFileName,
      isAdjusting: false,
      lines,
      importedFrom: importFileName,
      postedBy:    "Trial Balance Import",
      createdAt:   firebase.firestore.FieldValue.serverTimestamp()
    });
    showImportSuccess(1);
  } catch(e) {
    errEl.textContent = "Failed: " + e.message;
  }
}


// ══════════════════════════════════════
//  MANUAL STATEMENT BUILDER
// ══════════════════════════════════════

let manualStmtData   = {};   // { lineId → amount }
let manualStmtType   = "is"; // is | bs | scf | sshe
let manualStmtClient = "";
let manualStmtPeriod = "";
let manualStmtLabel  = "";
let manualStmtCompany= "";

function loadManualStmtTab() {
  let el = document.getElementById("manual-stmt-main");
  if (!el) return;
  manualStmtData = {};

  let clientOpts = clients.map(c =>
    `<option value="${c.uid}">${c.name}</option>`).join("");

  el.innerHTML = `
    <div class="dash-card" style="margin-bottom:20px;">
      <h3 style="font-size:15px;font-weight:700;margin-bottom:16px;">Build a Manual Financial Statement</h3>
      <div class="acct-selectors" style="flex-wrap:wrap;">
        <div class="acct-selector-group">
          <label>Client</label>
          <select id="ms-client" class="assign-select" onchange="onMSClientChange()">
            <option value="">— Select Client —</option>
            ${clientOpts}
          </select>
        </div>
        <div class="acct-selector-group">
          <label>Period</label>
          <select id="ms-period" class="assign-select" disabled onchange="onMSPeriodChange()">
            <option value="">— Select Period —</option>
          </select>
        </div>
        <div class="acct-selector-group">
          <label>Statement Type</label>
          <select id="ms-type" class="assign-select" onchange="onMSTypeChange()">
            <option value="is">Income Statement</option>
            <option value="bs">Balance Sheet</option>
            <option value="scf">Statement of Cash Flows</option>
            <option value="sshe">Shareholders' Equity</option>
          </select>
        </div>
      </div>
    </div>
    <div id="ms-form-area"></div>`;
}

async function onMSClientChange() {
  let sel = document.getElementById("ms-client");
  manualStmtClient = sel.value;
  manualStmtCompany = sel.options[sel.selectedIndex]?.textContent || "";
  if (!manualStmtClient) return;
  await loadPeriodsForClient(manualStmtClient, "ms-period");
  document.getElementById("ms-period").disabled = false;
}

function onMSPeriodChange() {
  let sel = document.getElementById("ms-period");
  manualStmtPeriod = sel.value;
  manualStmtLabel  = sel.options[sel.selectedIndex]?.textContent || "";
  if (!manualStmtPeriod) return;
  renderManualStmtForm();
}

function onMSTypeChange() {
  manualStmtType = document.getElementById("ms-type").value;
  if (manualStmtPeriod) renderManualStmtForm();
}

function renderManualStmtForm() {
  manualStmtData = {};
  let el = document.getElementById("ms-form-area");
  if (!el) return;

  let templates = {
    is: [
      { id:"rev",    label:"Revenue",                   section:true },
      { id:"rev1",   label:"Revenue / Sales",           indent:1 },
      { id:"rev2",   label:"Service Revenue",           indent:1 },
      { id:"rev3",   label:"Other Income",              indent:1 },
      { id:"cogs",   label:"Cost of Goods Sold",        section:true },
      { id:"cogs1",  label:"Cost of Goods Sold",        indent:1 },
      { id:"cogs2",  label:"Direct Labor",              indent:1 },
      { id:"opex",   label:"Operating Expenses",        section:true },
      { id:"opex1",  label:"Salaries & Wages",          indent:1 },
      { id:"opex2",  label:"Rent Expense",              indent:1 },
      { id:"opex3",  label:"Utilities",                 indent:1 },
      { id:"opex4",  label:"Insurance",                 indent:1 },
      { id:"opex5",  label:"Depreciation",              indent:1 },
      { id:"opex6",  label:"Other Operating Expenses",  indent:1 },
      { id:"other",  label:"Other Expenses",            section:true },
      { id:"other1", label:"Interest Expense",          indent:1 },
      { id:"other2", label:"Other Non-Operating",       indent:1 },
      { id:"tax",    label:"Income Tax",                section:true },
      { id:"tax1",   label:"Income Tax Expense",        indent:1 },
    ],
    bs: [
      { id:"ca",     label:"Current Assets",            section:true },
      { id:"ca1",    label:"Cash & Equivalents",        indent:1 },
      { id:"ca2",    label:"Accounts Receivable",       indent:1 },
      { id:"ca3",    label:"Inventory",                 indent:1 },
      { id:"ca4",    label:"Prepaid Expenses",          indent:1 },
      { id:"fa",     label:"Fixed Assets",              section:true },
      { id:"fa1",    label:"Property, Plant & Equip.",  indent:1 },
      { id:"fa2",    label:"Less: Accum. Depreciation", indent:1, negative:true },
      { id:"oa",     label:"Other Assets",              section:true },
      { id:"oa1",    label:"Intangible Assets",         indent:1 },
      { id:"cl",     label:"Current Liabilities",       section:true },
      { id:"cl1",    label:"Accounts Payable",          indent:1 },
      { id:"cl2",    label:"Accrued Liabilities",       indent:1 },
      { id:"cl3",    label:"Notes Payable - Current",   indent:1 },
      { id:"ll",     label:"Long-Term Liabilities",     section:true },
      { id:"ll1",    label:"Notes Payable - LT",        indent:1 },
      { id:"eq",     label:"Shareholders' Equity",      section:true },
      { id:"eq1",    label:"Common Stock",              indent:1 },
      { id:"eq2",    label:"Retained Earnings",         indent:1 },
      { id:"eq3",    label:"Net Income",                indent:1 },
    ],
    scf: [
      { id:"ops",    label:"Operating Activities",      section:true },
      { id:"ops1",   label:"Net Income",                indent:1 },
      { id:"ops2",   label:"Depreciation & Amort.",     indent:1 },
      { id:"ops3",   label:"Change in AR",              indent:1 },
      { id:"ops4",   label:"Change in Inventory",       indent:1 },
      { id:"ops5",   label:"Change in AP",              indent:1 },
      { id:"ops6",   label:"Other Operating Changes",   indent:1 },
      { id:"inv",    label:"Investing Activities",      section:true },
      { id:"inv1",   label:"Purchase of PP&E",          indent:1 },
      { id:"inv2",   label:"Proceeds from Asset Sales", indent:1 },
      { id:"inv3",   label:"Other Investing",           indent:1 },
      { id:"fin",    label:"Financing Activities",      section:true },
      { id:"fin1",   label:"Proceeds from Debt",        indent:1 },
      { id:"fin2",   label:"Repayment of Debt",         indent:1 },
      { id:"fin3",   label:"Equity Issuance",           indent:1 },
      { id:"fin4",   label:"Dividends Paid",            indent:1 },
      { id:"cash",   label:"Cash",                      section:true },
      { id:"cash1",  label:"Beginning Cash Balance",    indent:1 },
    ],
    sshe: [
      { id:"cs",     label:"Common Stock",              section:true },
      { id:"cs1",    label:"Beginning Balance",         indent:1 },
      { id:"cs2",    label:"Issuances",                 indent:1 },
      { id:"apic",   label:"Additional Paid-In Capital",section:true },
      { id:"apic1",  label:"Beginning Balance",         indent:1 },
      { id:"apic2",  label:"Additions",                 indent:1 },
      { id:"re",     label:"Retained Earnings",         section:true },
      { id:"re1",    label:"Beginning Balance",         indent:1 },
      { id:"re2",    label:"Net Income",                indent:1 },
      { id:"re3",    label:"Dividends Paid",            indent:1, negative:true },
      { id:"tsy",    label:"Treasury Stock",            section:true },
      { id:"tsy1",   label:"Beginning Balance",         indent:1 },
      { id:"tsy2",   label:"Repurchases",               indent:1 },
    ]
  };

  let rows = templates[manualStmtType] || templates.is;

  let formRows = rows.map(r => {
    if (r.section) {
      return `<div class="ms-section-header">${r.label}</div>`;
    }
    return `
      <div class="ms-form-row" style="padding-left:${(r.indent||0)*24}px;">
        <span class="ms-form-label">${r.label}</span>
        <div class="ms-form-input-wrap">
          ${r.negative ? `<span style="color:var(--text-muted);margin-right:4px;">(</span>` : ""}
          <span style="color:var(--text-muted);margin-right:2px;">$</span>
          <input type="number" class="ms-input" id="ms-${r.id}" placeholder="0.00"
            step="0.01" oninput="manualStmtData['${r.id}']=parseFloat(this.value)||0;updateManualTotals()">
          ${r.negative ? `<span style="color:var(--text-muted);margin-left:4px;">)</span>` : ""}
        </div>
      </div>`;
  }).join("");

  let typeLabels = { is:"Income Statement", bs:"Balance Sheet", scf:"Statement of Cash Flows", sshe:"Statement of Shareholders' Equity" };

  el.innerHTML = `
    <div class="dash-card" style="margin-bottom:20px;">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;flex-wrap:wrap;gap:12px;">
        <div>
          <h3 style="font-size:15px;font-weight:700;">${typeLabels[manualStmtType]} — Manual Entry</h3>
          <p style="font-size:13px;color:var(--text-muted);">${manualStmtCompany} · ${manualStmtLabel}</p>
        </div>
        <div style="display:flex;gap:8px;">
          <button class="ghost-btn" onclick="clearManualStmt()">Clear All</button>
          <button class="ghost-btn" onclick="previewManualStmt()">Preview</button>
          <button class="primary-btn" onclick="publishManualStmt()">Publish to Portal</button>
        </div>
      </div>
      <div id="ms-form-rows">${formRows}</div>
      <div id="ms-totals-area" style="margin-top:20px;border-top:2px solid var(--border);padding-top:16px;"></div>
    </div>
    <div id="ms-preview-area" style="display:none;"></div>`;

  updateManualTotals();
}

function clearManualStmt() {
  showModal({ title:"Clear All", message:"Clear all entered values?", confirmText:"Clear", type:"danger",
    onConfirm: function() {
      manualStmtData = {};
      document.querySelectorAll(".ms-input").forEach(i => i.value = "");
      updateManualTotals();
    }
  });
}

function updateManualTotals() {
  let el = document.getElementById("ms-totals-area");
  if (!el) return;

  let d = manualStmtData;
  let g = (...ids) => ids.reduce((s,id) => s + (d[id]||0), 0);

  let totals = "";

  if (manualStmtType === "is") {
    let rev  = g("rev1","rev2","rev3");
    let cogs = g("cogs1","cogs2");
    let gp   = rev - cogs;
    let opex = g("opex1","opex2","opex3","opex4","opex5","opex6");
    let ops  = gp - opex;
    let oth  = g("other1","other2");
    let ebt  = ops - oth;
    let tax  = g("tax1");
    let ni   = ebt - tax;
    totals = `
      <div class="ms-total-row"><span>Total Revenue</span><span>$${fmtMoney(rev)}</span></div>
      <div class="ms-total-row"><span>Gross Profit</span><span>$${fmtMoney(gp)}</span></div>
      <div class="ms-total-row"><span>Income from Operations</span><span>$${fmtMoney(ops)}</span></div>
      <div class="ms-total-row"><span>Income Before Tax</span><span>$${fmtMoney(ebt)}</span></div>
      <div class="ms-total-row ms-net-total"><span>NET INCOME</span><span>$${fmtMoney(ni)}</span></div>`;
  } else if (manualStmtType === "bs") {
    let ca   = g("ca1","ca2","ca3","ca4");
    let fa   = g("fa1") - g("fa2");
    let oa   = g("oa1");
    let ta   = ca + fa + oa;
    let cl   = g("cl1","cl2","cl3");
    let ll   = g("ll1");
    let tl   = cl + ll;
    let eq   = g("eq1","eq2","eq3");
    let tle  = tl + eq;
    let diff = Math.abs(ta - tle);
    totals = `
      <div class="ms-total-row"><span>Total Assets</span><span>$${fmtMoney(ta)}</span></div>
      <div class="ms-total-row"><span>Total Liabilities</span><span>$${fmtMoney(tl)}</span></div>
      <div class="ms-total-row"><span>Total Equity</span><span>$${fmtMoney(eq)}</span></div>
      <div class="ms-total-row ms-net-total"><span>Total Liabilities & Equity</span><span>$${fmtMoney(tle)}</span></div>
      <div class="ms-total-row" style="${diff<0.01?"color:var(--green)":"color:var(--orange)"}">
        <span>${diff<0.01?"✓ Balanced":"⚠ Out of balance by $"+fmtMoney(diff)}</span>
      </div>`;
  } else if (manualStmtType === "scf") {
    let cfOps = g("ops1","ops2","ops3","ops4","ops5","ops6");
    let cfInv = g("inv1","inv2","inv3");
    let cfFin = g("fin1","fin2","fin3","fin4");
    let net   = cfOps + cfInv + cfFin;
    let beg   = g("cash1");
    let end   = beg + net;
    totals = `
      <div class="ms-total-row"><span>Net Cash from Operating</span><span>$${fmtMoney(cfOps)}</span></div>
      <div class="ms-total-row"><span>Net Cash from Investing</span><span>$${fmtMoney(cfInv)}</span></div>
      <div class="ms-total-row"><span>Net Cash from Financing</span><span>$${fmtMoney(cfFin)}</span></div>
      <div class="ms-total-row"><span>Net Change in Cash</span><span>$${fmtMoney(net)}</span></div>
      <div class="ms-total-row ms-net-total"><span>Ending Cash Balance</span><span>$${fmtMoney(end)}</span></div>`;
  } else if (manualStmtType === "sshe") {
    let cs   = g("cs1","cs2");
    let apic = g("apic1","apic2");
    let re   = g("re1","re2") - g("re3");
    let tsy  = g("tsy1","tsy2");
    let tot  = cs + apic + re - tsy;
    totals = `
      <div class="ms-total-row"><span>Total Common Stock</span><span>$${fmtMoney(cs)}</span></div>
      <div class="ms-total-row"><span>Total APIC</span><span>$${fmtMoney(apic)}</span></div>
      <div class="ms-total-row"><span>Ending Retained Earnings</span><span>$${fmtMoney(re)}</span></div>
      <div class="ms-total-row ms-net-total"><span>Total Shareholders' Equity</span><span>$${fmtMoney(tot)}</span></div>`;
  }

  el.innerHTML = totals;
}

function previewManualStmt() {
  let area = document.getElementById("ms-preview-area");
  area.style.display = "block";
  area.scrollIntoView({ behavior:"smooth" });

  let typeLabels = { is:"Income Statement", bs:"Balance Sheet", scf:"Statement of Cash Flows", sshe:"Statement of Shareholders' Equity" };

  // Collect all filled rows
  let rows = [];
  document.querySelectorAll(".ms-form-row").forEach(row => {
    let label = row.querySelector(".ms-form-label")?.textContent;
    let input = row.querySelector(".ms-input");
    let val   = parseFloat(input?.value) || 0;
    if (val) rows.push({ label, val });
  });

  let html = `<div class="dash-card">
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;">
      <h3 style="font-size:15px;font-weight:700;">Preview — ${typeLabels[manualStmtType]}</h3>
      <button class="ghost-btn" onclick="document.getElementById('ms-preview-area').style.display='none'">Close</button>
    </div>
    <div class="stmt-wrapper">
      <div class="stmt-header">
        <div class="stmt-company">${esc(manualStmtCompany)}</div>
        <div class="stmt-title">${typeLabels[manualStmtType]}</div>
        <div class="stmt-period">${esc(manualStmtLabel)}</div>
        <div class="stmt-method" style="color:var(--orange);font-size:11px;">Manual Entry</div>
      </div>
      ${rows.map(r => `
        <div class="stmt-row">
          <span class="stmt-acct-name">${esc(r.label)}</span>
          <span class="stmt-acct-amt">$${fmtMoney(r.val)}</span>
        </div>`).join("")}
    </div>
  </div>`;

  area.innerHTML = html;
}

async function publishManualStmt() {
  if (!manualStmtClient || !manualStmtPeriod) {
    toast("Please select a client and period first", "warning");
    return;
  }
  showModal({ title:"Publish Statement", message:"Publish this manual statement to the client portal?",
    confirmText:"Publish", type:"success", onConfirm: async function() {
  // Collect line items
  let lines = [];
  document.querySelectorAll(".ms-form-row").forEach(row => {
    let label = row.querySelector(".ms-form-label")?.textContent;
    let input = row.querySelector(".ms-input");
    let val   = parseFloat(input?.value) || 0;
    if (val) lines.push({ label, amount: val });
  });

  let typeMap = { is:"income", bs:"balance", scf:"cashflow", sshe:"equity" };

  try {
    await db.collection("financialStatements")
      .doc(manualStmtClient + "_" + manualStmtPeriod + "_" + typeMap[manualStmtType] + "_manual")
      .set({
        clientId:      manualStmtClient,
        clientName:    manualStmtCompany,
        periodId:      manualStmtPeriod,
        periodLabel:   manualStmtLabel,
        statementType: typeMap[manualStmtType],
        isManual:      true,
        lines,
        data:          { ...manualStmtData },
        published:     true,
        publishedAt:   firebase.firestore.FieldValue.serverTimestamp()
      });

    await db.collection("activity").add({
      clientId: manualStmtClient,
      type: "ready",
      text: `Manual ${manualStmtType.toUpperCase()} published for ${manualStmtLabel}`,
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    });

    toast("Published to portal", "success");
    } catch(e) {
      toast(e.message, "error");
    }
    } // end onConfirm
  }); // end showModal
}


// ══════════════════════════════════════
//  TRIAL BALANCE VIEW
//  Shows all accounts with debit/credit
//  balance for a given period
// ══════════════════════════════════════

let tbViewClientId = "";
let tbViewPeriodId = "";

function loadTrialBalanceTab() {
  initChartOfAccounts();
  let el = document.getElementById("tb-main");
  if (!el) return;

  let clientOpts = clients.map(c =>
    `<option value="${c.uid}">${c.name}</option>`).join("");

  el.innerHTML = `
    <div class="acct-selectors" style="margin-bottom:20px;">
      <div class="acct-selector-group">
        <label>Client</label>
        <select id="tb-client-sel" class="assign-select" onchange="onTBClientChange()">
          <option value="">— Select Client —</option>
          ${clientOpts}
        </select>
      </div>
      <div class="acct-selector-group">
        <label>Period</label>
        <select id="tb-period-sel" class="assign-select" disabled onchange="onTBPeriodChange()">
          <option value="">— Select Period —</option>
        </select>
      </div>
      <div class="acct-selector-group" style="align-self:flex-end;">
        <button class="ghost-btn" id="tb-export-btn" style="display:none;" onclick="exportTrialBalance()">Export Excel ↓</button>
      </div>
    </div>
    <div id="tb-content">
      <div style="padding:32px;text-align:center;color:var(--text-muted);font-size:13px;">
        Select a client and period to view the trial balance.
      </div>
    </div>`;
}

async function onTBClientChange() {
  let sel = document.getElementById("tb-client-sel");
  tbViewClientId = sel.value;
  if (!tbViewClientId) return;
  await loadPeriodsForClient(tbViewClientId, "tb-period-sel");
  document.getElementById("tb-period-sel").disabled = false;
}

async function onTBPeriodChange() {
  let periodSel = document.getElementById("tb-period-sel");
  tbViewPeriodId = periodSel.value;
  let periodLabel = periodSel.options[periodSel.selectedIndex]?.textContent || "";
  let periodType  = periodSel.options[periodSel.selectedIndex]?.dataset.periodType || "annual";
  let clientName  = document.getElementById("tb-client-sel")?.options[
    document.getElementById("tb-client-sel").selectedIndex
  ]?.textContent || "";

  if (!tbViewPeriodId) return;

  let content = document.getElementById("tb-content");
  content.innerHTML = `<div style="padding:24px;text-align:center;color:var(--text-muted);font-size:13px;">Computing trial balance...</div>`;

  await initChartOfAccounts();

  let { from, to } = getPeriodDateRange(periodLabel, periodType);
  let accounts = await computeBalances(tbViewClientId, tbViewPeriodId, from, to);

  window._tbData = { accounts, periodLabel, clientName };
  document.getElementById("tb-export-btn").style.display = "inline-flex";

  renderTrialBalance(accounts, periodLabel, clientName);
}

function renderTrialBalance(accounts, periodLabel, clientName) {
  let totalDr = accounts.reduce((s,a) => s + (a.normalBalance==="debit"  ? Math.max(a.balance,0) : 0), 0);
  let totalCr = accounts.reduce((s,a) => s + (a.normalBalance==="credit" ? Math.max(a.balance,0) : 0), 0);
  let balanced = Math.abs(totalDr - totalCr) < 0.01;

  let typeOrder = ["asset","liability","equity","revenue","cogs","expense","tax"];
  let sorted = [...accounts].sort((a,b) => parseInt(a.number) - parseInt(b.number));

  let content = document.getElementById("tb-content");
  content.innerHTML = `
    <div class="dash-card" style="padding:0;overflow:hidden;">
      <div class="stmt-header" style="padding:20px 24px;border-bottom:1px solid var(--border);">
        <div class="stmt-company">${esc(clientName)}</div>
        <div class="stmt-title">Trial Balance</div>
        <div class="stmt-period">As of ${esc(periodLabel)}</div>
      </div>
      <div class="tb-grid-header">
        <span>Acct #</span>
        <span>Account Name</span>
        <span>Type</span>
        <span style="text-align:right;">Debit</span>
        <span style="text-align:right;">Credit</span>
      </div>
      ${sorted.map(a => {
        let dr = a.normalBalance === "debit"  ? Math.max(a.balance,0) : (a.balance < 0 ? Math.abs(a.balance) : 0);
        let cr = a.normalBalance === "credit" ? Math.max(a.balance,0) : (a.balance < 0 ? Math.abs(a.balance) : 0);
        if (a.normalBalance === "debit")  { dr = Math.max(a.balance,0); cr = a.balance < 0 ? Math.abs(a.balance) : 0; }
        if (a.normalBalance === "credit") { cr = Math.max(a.balance,0); dr = a.balance < 0 ? Math.abs(a.balance) : 0; }
        return `
          <div class="tb-grid-row">
            <span class="tb-acct-num">${esc(a.number)}</span>
            <span class="tb-acct-name">${esc(a.name)}</span>
            <span class="tb-acct-type">${esc(a.type)}</span>
            <span class="tb-amount">${dr ? "$"+fmtMoney(dr) : ""}</span>
            <span class="tb-amount">${cr ? "$"+fmtMoney(cr) : ""}</span>
          </div>`;
      }).join("")}
      <div class="tb-grid-total">
        <span></span>
        <span style="font-weight:700;">TOTALS</span>
        <span></span>
        <span style="text-align:right;font-weight:700;">$${fmtMoney(totalDr)}</span>
        <span style="text-align:right;font-weight:700;">$${fmtMoney(totalCr)}</span>
      </div>
      <div style="padding:12px 24px;font-size:13px;${balanced?"color:var(--green)":"color:var(--orange)"}">
        ${balanced ? "✓ Trial balance is in balance" : `⚠ Out of balance by $${fmtMoney(Math.abs(totalDr-totalCr))}`}
      </div>
    </div>`;
}

function exportTrialBalance() {
  if (!window._tbData) return;
  if (typeof XLSX === "undefined") { toast("Excel library not loaded", "error"); return; }
  let { accounts, periodLabel, clientName } = window._tbData;

  let data = [
    [clientName],
    ["TRIAL BALANCE"],
    ["As of " + periodLabel],
    [""],
    ["Acct #", "Account Name", "Type", "Debit", "Credit"]
  ];

  accounts.forEach(a => {
    let dr = a.normalBalance === "debit"  ? Math.max(a.balance,0) : 0;
    let cr = a.normalBalance === "credit" ? Math.max(a.balance,0) : 0;
    data.push([a.number, a.name, a.type, dr||"", cr||""]);
  });

  let totalDr = accounts.reduce((s,a)=>s+(a.normalBalance==="debit"?Math.max(a.balance,0):0),0);
  let totalCr = accounts.reduce((s,a)=>s+(a.normalBalance==="credit"?Math.max(a.balance,0):0),0);
  data.push(["", "TOTALS", "", totalDr, totalCr]);

  let wb = XLSX.utils.book_new();
  let ws = XLSX.utils.aoa_to_sheet(data);
  ws["!cols"] = [{wch:10},{wch:40},{wch:14},{wch:16},{wch:16}];
  XLSX.utils.book_append_sheet(wb, ws, "Trial Balance");
  XLSX.writeFile(wb, clientName.replace(/\s+/g,"-") + "_TB_" + periodLabel.replace(/\s+/g,"-") + ".xlsx");
}
