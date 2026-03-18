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

      // Update welcome heading
      let h1 = document.querySelector("#tab-overview h1");
      if (h1) h1.textContent = "Welcome back, " + firstName;

      // Update nav name
      let navUser = document.querySelector(".portal-user");
      if (navUser) navUser.textContent = fullName;

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
        let bubble = document.createElement("div");
        bubble.className = "message " + (isMe ? "sent" : "received");
        bubble.innerHTML =
          (!isMe ? '<div class="message-avatar">AS</div>' : "") +
          '<div class="message-body">' +
            '<div class="message-meta"><strong>' + msg.senderName + '</strong> <span>' + timeText + '</span></div>' +
            '<div class="message-text">' + msg.text + '</div>' +
          '</div>';
        thread.appendChild(bubble);
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
    let file = files[i];
    let size = file.size;
    let sizeText = size < 1024 ? size + " B" : size < 1048576 ? Math.round(size/1024) + " KB" : (size/1048576).toFixed(1) + " MB";
    let ref = storage.ref("documents/" + currentUser.uid + "/" + Date.now() + "_" + file.name);
    ref.put(file).then(function(snap) {
      return snap.ref.getDownloadURL();
    }).then(function(url) {
      return db.collection("documents").add({
        clientId:   currentUser.uid,
        fileName:   file.name,
        fileSize:   sizeText,
        fileURL:    url,
        status:     "received",
        uploadedAt: firebase.firestore.FieldValue.serverTimestamp()
      });
    }).then(function() {
      // Log activity
      db.collection("activity").add({
        clientId:  currentUser.uid,
        type:      "upload",
        text:      "You uploaded " + file.name,
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
      });

      // Mark any matching document request as fulfilled
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
    }).catch(function(e) { alert("Upload failed: " + e.message); });
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
