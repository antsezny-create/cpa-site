// ══════════════════════════════════════
//  STATE
// ══════════════════════════════════════
let currentUser     = null;
let currentUserData = null;
let unreadListener  = null;
let statusListener  = null;
let checklistListener = null;
let activityListener  = null;

// ══════════════════════════════════════
//  AUTH CHECK
// ══════════════════════════════════════
auth.onAuthStateChanged(function(user) {
  if (user) {
    currentUser = user;
    // Check approval status before loading portal
    db.collection("clients").doc(user.uid).get().then(function(doc) {
      if (!doc.exists) { window.location.href = "login.html"; return; }
      let data = doc.data();
      if (data.approvalStatus === "pending-approval") {
        window.location.href = "pending.html";
        return;
      }
      if (data.approvalStatus === "rejected") {
        auth.signOut().then(function() { window.location.href = "login.html"; });
        return;
      }
      // Approved — load portal normally
      loadUserData();
      loadMessages();
      loadDocuments();
      listenForUnreadMessages();
    });
  } else {
    window.location.href = "login.html";
  }
});

function loadUserData() {
  db.collection("clients").doc(currentUser.uid).get().then(function(doc) {
    if (doc.exists) {
      currentUserData = doc.data();
      let firstName = currentUserData.firstName || "";
      let lastName  = currentUserData.lastName  || "";
      let fullName  = (firstName + " " + lastName).trim();

      // Update welcome heading with first name
      let h1First = document.getElementById("portal-user-first");
      if (h1First) h1First.textContent = firstName || "there";

      // Update nav name
      let navUser = document.querySelector(".portal-user");
      if (navUser) navUser.textContent = fullName;

      // Show Financials tab if bookkeeping is enabled
      checkBookkeepingEnabled();

      // Now load live data that depends on user being loaded
      listenForStatus();
      listenForChecklist();
      listenForActivity();
    }
  });
}


// ══════════════════════════════════════
//  TAB SWITCHING
// ══════════════════════════════════════
function switchTab(tabName) {
  document.querySelectorAll(".tab-content").forEach(t => t.style.display = "none");
  document.getElementById("tab-" + tabName).style.display = "block";
  document.querySelectorAll(".sidebar-btn").forEach(btn => {
    btn.classList.remove("active");
    if (btn.getAttribute("onclick") && btn.getAttribute("onclick").includes("'" + tabName + "'"))
      btn.classList.add("active");
  });
}

function setMobileActive(btn) {
  document.querySelectorAll(".mobile-nav-btn").forEach(b => b.classList.remove("active"));
  btn.classList.add("active");
}


// ══════════════════════════════════════
//  REAL-TIME STATUS / TIMELINE
// ══════════════════════════════════════
// Steps: pending → in-progress → review → filed
// Timeline labels: Documents Received → In Progress → Under Review → Filed

const STATUS_STEPS = [
  { key: "pending",     label: "Documents Received" },
  { key: "in-progress", label: "In Progress" },
  { key: "review",      label: "Under Review" },
  { key: "filed",       label: "Filed" }
];

const STATUS_BANNERS = {
  "pending":     { text: "We're waiting for your documents",    sub: "Please upload your tax documents to get started." },
  "in-progress": { text: "Your return is in progress",          sub: "Anthony is working on your return." },
  "review":      { text: "Your return is under review",         sub: "Anthony is reviewing your return." },
  "filed":       { text: "Your return has been filed! 🎉",      sub: "Your tax return has been successfully filed." }
};

function listenForStatus() {
  if (statusListener) statusListener();
  statusListener = db.collection("clients").doc(currentUser.uid)
    .onSnapshot(function(doc) {
      if (!doc.exists) return;
      let status = doc.data().status || "pending";
      renderTimeline(status);
    });
}

function renderTimeline(status) {
  let banner = STATUS_BANNERS[status] || STATUS_BANNERS["pending"];
  let bannerEl = document.getElementById("status-banner-text");
  let bannerSub = document.getElementById("status-banner-sub");
  if (bannerEl)  bannerEl.textContent  = banner.text;
  if (bannerSub) bannerSub.textContent = banner.sub;

  // Update dot colour on banner
  let dot = document.getElementById("status-dot-main");
  if (dot) {
    dot.className = "status-dot";
    if (status === "filed")       dot.classList.add("status-filed");
    else if (status === "review") dot.classList.add("status-review");
    else                          dot.classList.add("status-progress");
  }

  // Find current step index
  let currentIdx = STATUS_STEPS.findIndex(s => s.key === status);
  if (currentIdx === -1) currentIdx = 0;

  // Render steps
  let stepsEl = document.getElementById("status-steps");
  if (!stepsEl) return;
  stepsEl.innerHTML = "";

  STATUS_STEPS.forEach(function(step, i) {
    let isDone   = i < currentIdx;
    let isActive = i === currentIdx;

    let stepEl = document.createElement("div");
    stepEl.className = "status-step" + (isDone ? " done" : "") + (isActive ? " active" : "");
    stepEl.innerHTML =
      '<div class="step-dot' + (isDone ? " done" : "") + (isActive ? " active" : "") + '"></div>' +
      '<span>' + step.label + '</span>';
    stepsEl.appendChild(stepEl);

    // Add connector line between steps
    if (i < STATUS_STEPS.length - 1) {
      let line = document.createElement("div");
      line.className = "status-step-line" + (isDone ? " done" : "");
      stepsEl.appendChild(line);
    }
  });
}


// ══════════════════════════════════════
//  REAL-TIME DOCUMENT CHECKLIST
// ══════════════════════════════════════
function listenForChecklist() {
  if (checklistListener) checklistListener();
  checklistListener = db.collection("documentRequests")
    .where("clientId", "==", currentUser.uid)
    .onSnapshot(function(snapshot) {
      let requests = [];
      snapshot.forEach(function(doc) {
        let d = doc.data(); d._id = doc.id;
        requests.push(d);
      });
      renderChecklist(requests);
    }, function() {
      // fallback if no index yet
      db.collection("documentRequests")
        .where("clientId", "==", currentUser.uid)
        .get().then(function(snapshot) {
          let requests = [];
          snapshot.forEach(function(doc) { let d=doc.data(); d._id=doc.id; requests.push(d); });
          renderChecklist(requests);
        });
    });
}

function renderChecklist(requests) {
  let container = document.getElementById("checklist-container");
  let badge     = document.getElementById("checklist-badge");
  if (!container) return;
  container.innerHTML = "";

  if (requests.length === 0) {
    container.innerHTML = '<div style="padding:16px;color:var(--text-dim);font-size:13px;">No document requests yet.</div>';
    if (badge) badge.textContent = "0";
    return;
  }

  let fulfilled = requests.filter(r => r.fulfilled).length;
  if (badge) badge.textContent = fulfilled + " of " + requests.length;

  requests.forEach(function(req) {
    let isDone = req.fulfilled === true;
    let item = document.createElement("div");
    item.className = "checklist-item " + (isDone ? "done" : "pending");
    item.innerHTML =
      '<span class="check-box ' + (isDone ? "done" : "pending") + '">' + (isDone ? "✓" : "!") + '</span>' +
      '<div><strong>' + req.documentName + '</strong>' +
      '<span>' + (isDone ? "Received" : "Still needed") + '</span></div>';
    container.appendChild(item);
  });
}


// ══════════════════════════════════════
//  REAL-TIME ACTIVITY FEED
// ══════════════════════════════════════
function listenForActivity() {
  if (activityListener) activityListener();
  activityListener = db.collection("activity")
    .where("clientId", "==", currentUser.uid)
    .onSnapshot(function(snapshot) {
      let items = [];
      snapshot.forEach(function(doc) { let d=doc.data(); d._id=doc.id; items.push(d); });
      items.sort(function(a,b) {
        if (!a.createdAt || !b.createdAt) return 0;
        return b.createdAt.seconds - a.createdAt.seconds;
      });
      renderActivity(items.slice(0, 6));
    }, function() {
      db.collection("activity")
        .where("clientId", "==", currentUser.uid)
        .get().then(function(snapshot) {
          let items = [];
          snapshot.forEach(function(doc){ let d=doc.data(); d._id=doc.id; items.push(d); });
          items.sort(function(a,b){ return (!a.createdAt||!b.createdAt)?0:b.createdAt.seconds-a.createdAt.seconds; });
          renderActivity(items.slice(0,6));
        });
    });
}

function renderActivity(items) {
  let list = document.getElementById("activity-list");
  if (!list) return;
  list.innerHTML = "";

  if (items.length === 0) {
    list.innerHTML = '<div class="activity-item"><div class="activity-dot blue"></div><div><strong>Account created</strong><span>Welcome!</span></div></div>';
    return;
  }

  // Color map per type
  let colorMap = {
    "upload":      "green",
    "request":     "red",
    "account":     "blue",
    "in-progress": "cyan",
    "review":      "cyan",
    "ready":       "purple",
    "filed":       "green-filed"
  };

  items.forEach(function(item) {
    let color = colorMap[item.type] || "blue";
    let timeText = "";
    if (item.createdAt) {
      let d = new Date(item.createdAt.seconds * 1000);
      let months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
      let h = d.getHours(), mn = d.getMinutes(), ap = h >= 12 ? "PM" : "AM";
      h = h % 12 || 12; if (mn < 10) mn = "0" + mn;
      timeText = months[d.getMonth()] + " " + d.getDate() + " at " + h + ":" + mn + " " + ap;
    }
    let el = document.createElement("div");
    el.className = "activity-item" + (item.type === "filed" ? " activity-filed" : "");
    el.innerHTML =
      '<div class="activity-dot ' + color + '"></div>' +
      '<div><strong>' + (item.text || "") + '</strong><span>' + timeText + '</span></div>';
    list.appendChild(el);
  });
}


// ══════════════════════════════════════
//  MESSAGES — real-time with unread badge
// ══════════════════════════════════════
function listenForUnreadMessages() {
  if (unreadListener) unreadListener();
  unreadListener = db.collection("messages")
    .where("clientId", "==", currentUser.uid)
    .onSnapshot(function(snapshot) {
      let unread = 0;
      snapshot.forEach(function(doc) {
        let m = doc.data();
        if (m.senderRole === "admin" && !m.readByClient) unread++;
      });
      let badge = document.getElementById("msg-badge");
      if (badge) {
        badge.textContent = unread;
        badge.style.display = unread > 0 ? "inline" : "none";
      }
      // Sync mobile badge too
      let mobileBadge = document.getElementById("mobile-msg-badge");
      if (mobileBadge) {
        mobileBadge.textContent = unread;
        mobileBadge.style.display = unread > 0 ? "inline" : "none";
      }
    });
}

function loadMessages() {
  let thread = document.getElementById("messages-thread");
  db.collection("messages")
    .where("clientId", "==", currentUser.uid)
    .onSnapshot(function(snapshot) {
      thread.innerHTML = "";
      let messages = [];
      snapshot.forEach(function(doc) { messages.push(doc.data()); });
      messages.sort(function(a,b) {
        if (!a.timestamp) return -1;
        if (!b.timestamp) return 1;
        return a.timestamp.toMillis() - b.timestamp.toMillis();
      });

      messages.forEach(function(msg) {
        let isMe = msg.senderId === currentUser.uid;
        let timeText = "";
        if (msg.timestamp) {
          let d = msg.timestamp.toDate();
          let h = d.getHours(), mn = d.getMinutes(), ap = h >= 12 ? "PM" : "AM";
          h = h % 12 || 12; if (mn < 10) mn = "0" + mn;
          let months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
          timeText = months[d.getMonth()] + " " + d.getDate() + ", " + h + ":" + mn + " " + ap;
        }

        let wrapper = document.createElement("div");
        wrapper.style.cssText = `display:flex;flex-direction:column;align-items:${isMe?"flex-end":"flex-start"};margin-bottom:4px;`;

        let bubble = document.createElement("div");
        bubble.className = "msg-bubble " + (isMe ? "sent" : "received");
        bubble.textContent = msg.text;

        let time = document.createElement("div");
        time.className = "msg-time " + (isMe ? "" : "left");
        time.textContent = (isMe ? "" : (msg.senderName || "Anthony") + " · ") + timeText;

        wrapper.appendChild(bubble);
        wrapper.appendChild(time);
        thread.appendChild(wrapper);
      });
      thread.scrollTop = thread.scrollHeight;

      // Mark admin messages as read
      snapshot.forEach(function(doc) {
        let m = doc.data();
        if (m.senderRole === "admin" && !m.readByClient) {
          db.collection("messages").doc(doc.id).update({ readByClient: true });
        }
      });
    });
}

function sendMessage() {
  let input = document.getElementById("message-input");
  let text  = input.value.trim();
  if (!text) return;
  let senderName = currentUserData ? currentUserData.firstName + " " + currentUserData.lastName : "Client";
  db.collection("messages").add({
    clientId:    currentUser.uid,
    senderId:    currentUser.uid,
    senderName:  senderName,
    senderRole:  "client",
    text:        text,
    readByAdmin: false,
    timestamp:   firebase.firestore.FieldValue.serverTimestamp()
  });

  // Log activity
  db.collection("activity").add({
    clientId:  currentUser.uid,
    type:      "message",
    text:      "You sent a message",
    createdAt: firebase.firestore.FieldValue.serverTimestamp()
  });

  input.value = "";
}


// ══════════════════════════════════════
//  DOCUMENT UPLOADS
// ══════════════════════════════════════
function loadDocuments() {
  db.collection("documents")
    .where("clientId", "==", currentUser.uid)
    .onSnapshot(function(snapshot) {
      let fileList = document.getElementById("file-list");
      fileList.innerHTML = "";
      let count = 0;
      snapshot.forEach(function(doc) {
        let file = doc.data(); count++;
        let ext = file.fileName.split(".").pop().toUpperCase();
        let statusClass = file.status === "reviewed" ? "reviewed" : "received";
        let statusText  = file.status === "reviewed" ? "Reviewed" : "Received";
        let timeText = "";
        if (file.uploadedAt) {
          let d = file.uploadedAt.toDate();
          let months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
          timeText = months[d.getMonth()] + " " + d.getDate();
        }
        let item = document.createElement("div");
        item.className = "file-item";
        item.innerHTML =
          '<div class="file-icon">' + ext + '</div>' +
          '<div class="file-info"><strong>' + file.fileName + '</strong>' +
          '<span>' + file.fileSize + ' · Uploaded ' + timeText + '</span></div>' +
          '<span class="file-status ' + statusClass + '">' + statusText + '</span>' +
          '<button class="file-delete-btn" onclick="deleteDocument(\'' + doc.id + '\',\'' + (file.fileURL||"") + '\')">✕</button>';
        fileList.appendChild(item);
      });
      let docCount = document.getElementById("doc-count");
      if (docCount) docCount.textContent = count + " files";
    });
}

function deleteDocument(docId, fileURL) {
  if (!confirm("Delete this document? This cannot be undone.")) return;
  db.collection("documents").doc(docId).delete().then(function() {
    if (fileURL) { try { storage.refFromURL(fileURL).delete().catch(function(){}); } catch(e){} }
  }).catch(function(e) { alert("Failed to delete: " + e.message); });
}

function handleUpload(input) {
  let files = input.files;
  for (let i = 0; i < files.length; i++) {
    (function(file) {
      let size = file.size;
      let sizeText = size < 1024 ? size + " B" : size < 1048576 ? Math.round(size/1024) + " KB" : (size/1048576).toFixed(1) + " MB";

      // Show progress bar in upload zone
      let zone = document.getElementById("upload-zone");
      let progressId = "up-prog-" + Date.now();
      let progressEl = document.createElement("div");
      progressEl.id = progressId;
      progressEl.style.cssText = "margin-top:12px;width:100%;";
      progressEl.innerHTML = `
        <div style="font-size:12px;color:var(--ink-muted);margin-bottom:6px;text-align:left;">Uploading ${file.name}...</div>
        <div style="height:4px;background:var(--cream-border);border-radius:99px;overflow:hidden;">
          <div id="${progressId}-bar" style="height:100%;width:0%;background:var(--green);border-radius:99px;transition:width 0.2s;"></div>
        </div>`;
      if (zone) zone.appendChild(progressEl);

      let ref = storage.ref("documents/" + currentUser.uid + "/" + Date.now() + "_" + file.name);
      let uploadTask = ref.put(file);

      uploadTask.on("state_changed",
        function(snap) {
          let pct = Math.round((snap.bytesTransferred / snap.totalBytes) * 100);
          let bar = document.getElementById(progressId + "-bar");
          if (bar) bar.style.width = pct + "%";
        },
        function(e) {
          let el = document.getElementById(progressId);
          if (el) el.remove();
          // Show error in upload zone
          let errEl = document.createElement("div");
          errEl.style.cssText = "font-size:12px;color:#C0392B;margin-top:8px;text-align:center;";
          errEl.textContent = "Upload failed: " + e.message;
          if (zone) { zone.appendChild(errEl); setTimeout(() => errEl.remove(), 4000); }
        },
        function() {
          uploadTask.snapshot.ref.getDownloadURL().then(function(url) {
            return db.collection("documents").add({
              clientId:   currentUser.uid,
              fileName:   file.name,
              fileSize:   sizeText,
              fileURL:    url,
              status:     "received",
              uploadedAt: firebase.firestore.FieldValue.serverTimestamp()
            });
          }).then(function() {
            let el = document.getElementById(progressId);
            if (el) el.remove();

            db.collection("activity").add({
              clientId:  currentUser.uid,
              type:      "upload",
              text:      "You uploaded " + file.name,
              createdAt: firebase.firestore.FieldValue.serverTimestamp()
            });

            db.collection("documentRequests")
              .where("clientId", "==", currentUser.uid)
              .where("fulfilled", "==", false)
              .get().then(function(snapshot) {
                snapshot.forEach(function(doc) {
                  let req = doc.data();
                  if (file.name.toLowerCase().includes(req.documentName.toLowerCase()) ||
                      req.documentName.toLowerCase().includes(file.name.toLowerCase().replace(/\.[^.]+$/, ""))) {
                    db.collection("documentRequests").doc(doc.id).update({ fulfilled: true });
                  }
                });
              });
          }).catch(function(e) {
            let el = document.getElementById(progressId);
            if (el) el.remove();
          });
        }
      );
    })(files[i]);
  }
  input.value = "";
}


// ══════════════════════════════════════
//  MY RETURNS — real-time from Firestore
// ══════════════════════════════════════
let returnsListener = null;

function loadMyReturns() {
  if (!currentUser) return;
  if (returnsListener) returnsListener();

  let list = document.getElementById("my-returns-list");
  list.innerHTML = '<div style="padding:16px;color:var(--text-dim);font-size:13px;">Loading...</div>';

  returnsListener = db.collection("clientReturns")
    .where("clientId", "==", currentUser.uid)
    .onSnapshot(function(snapshot) {
      list.innerHTML = "";
      if (snapshot.empty) {
        list.innerHTML = '<div style="padding:24px;color:var(--text-dim);font-size:13px;text-align:center;">No returns on file yet.</div>';
        return;
      }
      let returns = [];
      snapshot.forEach(doc => { let d = doc.data(); d._id = doc.id; returns.push(d); });
      returns.sort((a,b) => (b.taxYear||0) - (a.taxYear||0));
      returns.forEach(r => {
        let statusClass = { "need-docs":"pending-status", "in-progress":"in-progress-status", "filed":"filed-status" }[r.returnStatus] || "pending-status";
        let statusLabel = { "need-docs":"Need Docs", "in-progress":"In Progress", "filed":"Filed" }[r.returnStatus] || "Need Docs";
        let item = document.createElement("div");
        item.className = "return-item";
        item.innerHTML =
          '<div class="return-year">' + (r.taxYear || "—") + '</div>' +
          '<div class="return-info">' +
            '<strong>' + (r.formName || "Tax Return") + '</strong>' +
            '<span>Tax Year ' + (r.taxYear || "") + '</span>' +
          '</div>' +
          '<span class="file-status ' + statusClass + '">' + statusLabel + '</span>';
        list.appendChild(item);
      });
    });
}


// ══════════════════════════════════════
//  FINANCIALS TAB
// ══════════════════════════════════════

function checkBookkeepingEnabled() {
  if (!currentUserData) return;
  let enabled = currentUserData.bookkeeping === true;
  let sidebarBtn = document.getElementById("sidebar-financials-btn");
  let mobileBtn  = document.getElementById("mobile-financials-btn");
  if (sidebarBtn) sidebarBtn.style.display = enabled ? "flex" : "none";
  if (mobileBtn)  mobileBtn.style.display  = enabled ? "flex" : "none";
}

function loadMyStatements() {
  let container = document.getElementById("financials-portal-content");
  if (!container) return;
  container.innerHTML = `<div style="padding:32px;text-align:center;color:var(--text-dim);font-size:13px;">Loading statements...</div>`;

  db.collection("financialStatements")
    .where("clientId",  "==", currentUser.uid)
    .where("published", "==", true)
    .get().then(snap => {
      if (snap.empty) {
        // Fallback — try without published filter in case index is missing
        return db.collection("financialStatements")
          .where("clientId", "==", currentUser.uid)
          .get().then(snap2 => {
            let filtered = [];
            snap2.forEach(doc => {
              let d = doc.data();
              if (d.published === true) { d._id = doc.id; filtered.push(d); }
            });
            return { forEach: (fn) => filtered.forEach(d => fn({ data: () => d, id: d._id })), empty: filtered.length === 0 };
          });
      }
      return snap;
    }).then(snap => {
      if (snap.empty) {
        container.innerHTML = `
          <div class="portal-card" style="text-align:center;padding:40px;">
            <div style="font-size:32px;margin-bottom:12px;">📊</div>
            <h3 style="font-size:16px;font-weight:700;margin-bottom:8px;">No statements yet</h3>
            <p style="font-size:13px;color:var(--text-dim);">Anthony hasn't published any financial statements for you yet.</p>
          </div>`;
        return;
      }

      // Group by period
      let periods = {};
      snap.forEach(doc => {
        let d = doc.data(); d._id = doc.id;
        if (!periods[d.periodId]) {
          periods[d.periodId] = { label: d.periodLabel, clientName: d.clientName, statements: {} };
        }
        periods[d.periodId].statements[d.statementType] = d;
      });

      let html = "";
      Object.entries(periods).forEach(([periodId, period]) => {
        html += `
          <div class="portal-card fin-period-card" style="margin-bottom:20px;">
            <div class="portal-card-header" style="margin-bottom:16px;">
              <div>
                <h2 style="font-family:var(--serif);font-size:20px;font-weight:500;">${period.clientName || "Company"}</h2>
                <span style="font-size:12px;color:var(--ink-muted);">${period.label}</span>
              </div>
              <button class="download-btn" onclick="downloadStatementsExcel('${periodId}')">Download Excel ↓</button>
            </div>

            <div class="fin-stmt-tabs">
              <button class="fin-stmt-tab active" onclick="switchPortalStmt('${periodId}','income',this)">Income Statement</button>
              <button class="fin-stmt-tab" onclick="switchPortalStmt('${periodId}','balance',this)">Balance Sheet</button>
              <button class="fin-stmt-tab" onclick="switchPortalStmt('${periodId}','cashflow',this)">Cash Flow</button>
              <button class="fin-stmt-tab" onclick="switchPortalStmt('${periodId}','equity',this)">Shareholders' Equity</button>
            </div>

            <div id="portal-stmt-${periodId}" class="fin-stmt-view">
              ${renderPortalStatement(period.statements['income'], period.label, period.clientName)}
            </div>
          </div>`;
      });

      // Store for export
      window._portalPeriods = periods;
      container.innerHTML = html;
    }).catch(e => {
      container.innerHTML = `<div style="padding:24px;color:var(--text-dim);font-size:13px;">Failed to load statements: ${e.message}</div>`;
    });
}

function switchPortalStmt(periodId, type, btn) {
  // Update tabs
  let tabs = btn.closest(".fin-stmt-tabs").querySelectorAll(".fin-stmt-tab");
  tabs.forEach(t => t.classList.remove("active"));
  btn.classList.add("active");

  // Render
  let period = window._portalPeriods ? window._portalPeriods[periodId] : null;
  if (!period) return;
  let stmt = period.statements[type];
  let el   = document.getElementById("portal-stmt-" + periodId);
  if (el) el.innerHTML = renderPortalStatement(stmt, period.label, period.clientName);
}

function renderPortalStatement(stmt, periodLabel, clientName) {
  if (!stmt) return `<div style="padding:24px;text-align:center;color:var(--text-dim);font-size:13px;">Statement not available.</div>`;

  let accounts = stmt.accounts || [];
  let ni       = stmt.netIncome || 0;

  function fmt(n) {
    if (!n) return "$0.00";
    if (n < 0) return `($${Math.abs(n).toLocaleString("en-US",{minimumFractionDigits:2})})`;
    return `$${n.toLocaleString("en-US",{minimumFractionDigits:2})}`;
  }

  function row(num, name, amount, indent, bold, total) {
    return `<div class="portal-stmt-row ${bold?"portal-stmt-bold":""} ${total?"portal-stmt-total":""}" style="padding-left:${indent}px">
      <span class="portal-stmt-num">${num||""}</span>
      <span class="portal-stmt-name">${name}</span>
      <span class="portal-stmt-amt">${amount!==null?fmt(amount):""}</span>
    </div>`;
  }

  function section(title) { return `<div class="portal-stmt-section">${title}</div>`; }
  function divider()      { return `<div class="portal-stmt-divider"></div>`; }

  let html = `<div class="portal-stmt-wrapper">
    <div class="portal-stmt-header">
      <div class="portal-stmt-company">${clientName||""}</div>
      <div class="portal-stmt-period">${periodLabel}</div>
    </div>`;

  if (stmt.statementType === "income") {
    let rev  = accounts.filter(a=>a.type==="revenue");
    let cogs = accounts.filter(a=>a.type==="cogs");
    let opex = accounts.filter(a=>a.type==="expense"&&a.subType==="operating_expense");
    let oexp = accounts.filter(a=>a.type==="expense"&&a.subType==="other_expense");
    let tax  = accounts.filter(a=>a.type==="tax");
    let tRev = rev.reduce((s,a)=>s+a.balance,0);
    let tCOGS= cogs.reduce((s,a)=>s+a.balance,0);
    let gp   = tRev-tCOGS;
    let tOp  = opex.reduce((s,a)=>s+a.balance,0);
    let ifo  = gp-tOp;
    let tOE  = oexp.reduce((s,a)=>s+a.balance,0);
    let ibt  = ifo-tOE;
    let tTax = tax.reduce((s,a)=>s+a.balance,0);

    if (rev.length)  { html+=section("REVENUE");   rev.forEach(a=>{ html+=row(a.number,a.name,a.balance,24,false,false); }); html+=row("","Total Revenue",tRev,24,true,true); html+=divider(); }
    if (cogs.length) { html+=section("COST OF GOODS SOLD"); cogs.forEach(a=>{ html+=row(a.number,a.name,a.balance,24,false,false); }); html+=row("","Gross Profit",gp,0,true,true); html+=divider(); }
    if (opex.length) { html+=section("OPERATING EXPENSES"); opex.forEach(a=>{ html+=row(a.number,a.name,a.balance,24,false,false); }); html+=row("","Income from Operations",ifo,0,true,true); html+=divider(); }
    if (oexp.length) { html+=section("OTHER EXPENSES"); oexp.forEach(a=>{ html+=row(a.number,a.name,a.balance,24,false,false); }); html+=row("","Income Before Tax",ibt,0,true,true); html+=divider(); }
    if (tax.length)  { html+=section("INCOME TAX"); tax.forEach(a=>{ html+=row(a.number,a.name,a.balance,24,false,false); }); html+=divider(); }
    html += `<div class="portal-stmt-net"><span>NET INCOME</span><span>${fmt(ni)}</span></div>`;
  }

  else if (stmt.statementType === "balance") {
    let ca  = accounts.filter(a=>a.type==="asset"&&a.subType==="current_asset");
    let fa  = accounts.filter(a=>a.type==="asset"&&a.subType==="fixed_asset");
    let con = accounts.filter(a=>a.type==="asset"&&a.subType==="contra_asset");
    let oa  = accounts.filter(a=>a.type==="asset"&&a.subType==="other_asset");
    let cl  = accounts.filter(a=>a.type==="liability"&&a.subType==="current_liability");
    let ll  = accounts.filter(a=>a.type==="liability"&&a.subType==="long_term_liability");
    let eq  = accounts.filter(a=>a.type==="equity");
    let tCA = ca.reduce((s,a)=>s+a.balance,0);
    let tFA = fa.reduce((s,a)=>s+a.balance,0);
    let tCon= con.reduce((s,a)=>s+a.balance,0);
    let tOA = oa.reduce((s,a)=>s+a.balance,0);
    let tA  = tCA+tFA-tCon+tOA;
    let tCL = cl.reduce((s,a)=>s+a.balance,0);
    let tLL = ll.reduce((s,a)=>s+a.balance,0);
    let tL  = tCL+tLL;
    let tE  = eq.reduce((s,a)=>s+a.balance,0)+ni;

    html+=section("ASSETS");
    if(ca.length){ html+=section("Current Assets"); ca.forEach(a=>{html+=row(a.number,a.name,a.balance,24,false,false);}); html+=row("","Total Current Assets",tCA,8,true,true); }
    if(fa.length||con.length){ html+=section("Property, Plant & Equipment"); fa.forEach(a=>{html+=row(a.number,a.name,a.balance,24,false,false);}); con.forEach(a=>{html+=row(a.number,a.name,-a.balance,24,false,false);}); html+=row("","Net PP&E",tFA-tCon,8,true,true); }
    if(oa.length){ html+=section("Other Assets"); oa.forEach(a=>{html+=row(a.number,a.name,a.balance,24,false,false);}); }
    html+=divider(); html+=row("","TOTAL ASSETS",tA,0,true,true); html+=divider();
    html+=section("LIABILITIES");
    if(cl.length){ html+=section("Current Liabilities"); cl.forEach(a=>{html+=row(a.number,a.name,a.balance,24,false,false);}); html+=row("","Total Current Liabilities",tCL,8,true,true); }
    if(ll.length){ html+=section("Long-Term Liabilities"); ll.forEach(a=>{html+=row(a.number,a.name,a.balance,24,false,false);}); html+=row("","Total Long-Term Liabilities",tLL,8,true,true); }
    html+=row("","Total Liabilities",tL,0,true,true); html+=divider();
    html+=section("SHAREHOLDERS' EQUITY");
    eq.forEach(a=>{html+=row(a.number,a.name,a.balance,24,false,false);});
    html+=row("","Net Income",ni,24,false,false);
    html+=row("","Total Shareholders' Equity",tE,0,true,true); html+=divider();
    html+=`<div class="portal-stmt-net"><span>TOTAL LIABILITIES & EQUITY</span><span>${fmt(tL+tE)}</span></div>`;
  }

  else if (stmt.statementType === "cashflow") {
    let g = num => accounts.filter(a=>a.number===num).reduce((s,a)=>s+a.balance,0);
    let depr  = g("640") + g("650");
    let cfOps = ni + depr - g("110") - g("120") - g("130") + g("200") + g("210");
    let cfInv = -(g("150") + g("170"));
    let cfFin = g("220") + g("250") + g("300") + g("310") - g("330");
    let net   = cfOps + cfInv + cfFin;
    let beg   = g("100");
    let end   = beg + net;

    html += section("CASH FLOWS FROM OPERATING ACTIVITIES");
    html += row("","Net Income",ni,24,false,false);
    if (depr)    html += row("640/650","Depreciation & Amortization",depr,32,false,false);
    if (g("110")) html += row("110","Change in Accounts Receivable",-g("110"),32,false,false);
    if (g("120")) html += row("120","Change in Inventory",-g("120"),32,false,false);
    if (g("200")) html += row("200","Change in Accounts Payable",g("200"),32,false,false);
    if (g("210")) html += row("210","Change in Accrued Liabilities",g("210"),32,false,false);
    html += row("","Net Cash from Operating Activities",cfOps,0,true,true);
    html += divider();

    html += section("CASH FLOWS FROM INVESTING ACTIVITIES");
    if (g("150")) html += row("150","Purchase of PP&E",-g("150"),24,false,false);
    if (g("170")) html += row("170","Purchase of Intangibles",-g("170"),24,false,false);
    html += row("","Net Cash from Investing Activities",cfInv,0,true,true);
    html += divider();

    html += section("CASH FLOWS FROM FINANCING ACTIVITIES");
    if (g("220")||g("250")) html += row("220/250","Proceeds from Notes Payable",g("220")+g("250"),24,false,false);
    if (g("300")||g("310")) html += row("300/310","Proceeds from Equity Issuance",g("300")+g("310"),24,false,false);
    if (g("330")) html += row("330","Dividends / Distributions Paid",-g("330"),24,false,false);
    html += row("","Net Cash from Financing Activities",cfFin,0,true,true);
    html += divider();

    html += row("","Net Increase (Decrease) in Cash",net,0,true,true);
    html += row("","Cash at Beginning of Period",beg,0,false,false);
    html += `<div class="portal-stmt-net"><span>CASH AT END OF PERIOD</span><span>${fmt(end)}</span></div>`;
  }

  else if (stmt.statementType === "equity") {
    let g = id => accounts.filter(a=>a.number===id).reduce((s,a)=>s+a.balance,0);
    let cs=g("300"), apic=g("310"), re=g("320"), div=g("330"), tsy=g("340");
    let endRE=re+ni-div, tEq=cs+apic+endRE-tsy;
    html+=section("PAID-IN CAPITAL");
    html+=row("300","Common Stock",cs,24,false,false);
    if(apic) html+=row("310","Additional Paid-In Capital",apic,24,false,false);
    html+=row("","Total Paid-In Capital",cs+apic,0,true,true); html+=divider();
    html+=section("RETAINED EARNINGS");
    html+=row("320","Retained Earnings (Beginning)",re,24,false,false);
    html+=row("","Net Income (Current Period)",ni,24,false,false);
    if(div) html+=row("330","Less: Dividends",div,24,false,false);
    html+=row("","Retained Earnings (Ending)",endRE,0,true,true); html+=divider();
    html+=`<div class="portal-stmt-net"><span>TOTAL SHAREHOLDERS' EQUITY</span><span>${fmt(tEq)}</span></div>`;
  }

  html += `</div>`;
  return html;
}

function downloadStatementsExcel(periodId) {
  if (!window._portalPeriods || !window._portalPeriods[periodId]) return;
  if (typeof XLSX === "undefined") { alert("Excel library not loaded."); return; }

  let period   = window._portalPeriods[periodId];
  let accounts = period.statements['income']?.accounts || [];
  let ni       = period.statements['income']?.netIncome || 0;
  let wb       = XLSX.utils.book_new();

  let isData = [[period.clientName||""],["INCOME STATEMENT"],["Period: "+period.label],[""],["Acct #","Account Name","Amount"]];
  accounts.filter(a=>a.type==="revenue").forEach(a=>isData.push([a.number,a.name,a.balance]));
  accounts.filter(a=>a.type==="cogs").forEach(a=>isData.push([a.number,a.name,a.balance]));
  accounts.filter(a=>a.type==="expense").forEach(a=>isData.push([a.number,a.name,a.balance]));
  accounts.filter(a=>a.type==="tax").forEach(a=>isData.push([a.number,a.name,a.balance]));
  isData.push(["","NET INCOME",ni]);
  let ws = XLSX.utils.aoa_to_sheet(isData);
  ws["!cols"] = [{wch:10},{wch:40},{wch:18}];
  XLSX.utils.book_append_sheet(wb, ws, "Income Statement");

  XLSX.writeFile(wb, (period.clientName||"Statements").replace(/\s+/g,"-") + "_" + period.label.replace(/\s+/g,"-") + ".xlsx");
}
