// ══════════════════════════════════════
//  AUTH CHECK - redirect if not logged in
// ══════════════════════════════════════

let currentUser = null;
let currentUserData = null;

auth.onAuthStateChanged(function(user) {
  if (user) {
    currentUser = user;
    loadUserData();
    loadMessages();
    loadDocuments();
  } else {
    // Not logged in - redirect to login
    window.location.href = "login.html";
  }
});

function loadUserData() {
  db.collection("clients").doc(currentUser.uid).get()
    .then(function(doc) {
      if (doc.exists) {
        currentUserData = doc.data();
        // Update welcome message
        let h1 = document.querySelector("#tab-overview h1");
        if (h1) h1.textContent = "Welcome back, " + currentUserData.firstName;

        // Update nav user name
        let userName = document.querySelector(".portal-user");
        if (userName) userName.textContent = currentUserData.firstName + " " + currentUserData.lastName;
      }
    });
}


// ══════════════════════════════════════
//  TAB SWITCHING
// ══════════════════════════════════════

function switchTab(tabName) {
  let allTabs = document.querySelectorAll(".tab-content");
  for (let i = 0; i < allTabs.length; i++) {
    allTabs[i].style.display = "none";
  }
  document.getElementById("tab-" + tabName).style.display = "block";

  let allBtns = document.querySelectorAll(".sidebar-btn");
  for (let i = 0; i < allBtns.length; i++) {
    allBtns[i].classList.remove("active");
  }
  let buttons = document.querySelectorAll(".sidebar-btn");
  for (let i = 0; i < buttons.length; i++) {
    let onclickValue = buttons[i].getAttribute("onclick");
    if (onclickValue && onclickValue.includes(tabName)) {
      buttons[i].classList.add("active");
    }
  }
}


// ══════════════════════════════════════
//  REAL-TIME MESSAGES (Firebase)
// ══════════════════════════════════════

function loadMessages() {
  let thread = document.getElementById("messages-thread");

  // Listen for messages in real time
  db.collection("messages")
    .where("clientId", "==", currentUser.uid)
    .onSnapshot(function(snapshot) {
      thread.innerHTML = "";

      // Sort messages by timestamp in JavaScript
      let messages = [];
      snapshot.forEach(function(doc) {
        let msg = doc.data();
        messages.push(msg);
      });
      messages.sort(function(a, b) {
        if (!a.timestamp) return -1;
        if (!b.timestamp) return 1;
        return a.timestamp.toMillis() - b.timestamp.toMillis();
      });

      for (let i = 0; i < messages.length; i++) {
        let msg = messages[i];
        let isMe = msg.senderId === currentUser.uid;

        let bubble = document.createElement("div");
        bubble.className = "message " + (isMe ? "sent" : "received");

        let timeText = "";
        if (msg.timestamp) {
          let date = msg.timestamp.toDate();
          let hours = date.getHours();
          let minutes = date.getMinutes();
          let ampm = hours >= 12 ? "PM" : "AM";
          hours = hours % 12;
          if (hours === 0) hours = 12;
          if (minutes < 10) minutes = "0" + minutes;

          let months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
          timeText = months[date.getMonth()] + " " + date.getDate() + ", " + hours + ":" + minutes + " " + ampm;
        }

        let avatarHTML = "";
        if (!isMe) {
          avatarHTML = '<div class="message-avatar">AS</div>';
        }

        bubble.innerHTML =
          avatarHTML +
          '<div class="message-body">' +
            '<div class="message-meta"><strong>' + msg.senderName + '</strong> <span>' + timeText + '</span></div>' +
            '<div class="message-text">' + msg.text + '</div>' +
          '</div>';

        thread.appendChild(bubble);
      }

      // Scroll to bottom
      thread.scrollTop = thread.scrollHeight;
    }, function(error) {
      // If the query fails (no index), show a helpful message
      console.log("Messages error:", error);
    });
}

function sendMessage() {
  let input = document.getElementById("message-input");
  let text = input.value.trim();
  if (text === "") return;

  let senderName = "Client";
  if (currentUserData) {
    senderName = currentUserData.firstName + " " + currentUserData.lastName;
  }

  // Save message to Firestore
  db.collection("messages").add({
    clientId: currentUser.uid,
    senderId: currentUser.uid,
    senderName: senderName,
    senderRole: "client",
    text: text,
    timestamp: firebase.firestore.FieldValue.serverTimestamp()
  });

  input.value = "";
}


// ══════════════════════════════════════
//  DOCUMENT UPLOADS (Firebase Storage)
// ══════════════════════════════════════

function loadDocuments() {
  db.collection("documents")
    .where("clientId", "==", currentUser.uid)
    .onSnapshot(function(snapshot) {
      let fileList = document.getElementById("file-list");
      fileList.innerHTML = "";

      let count = 0;
      snapshot.forEach(function(doc) {
        let file = doc.data();
        count++;

        let item = document.createElement("div");
        item.className = "file-item";

        let ext = file.fileName.split(".").pop().toUpperCase();
        let statusClass = file.status === "reviewed" ? "reviewed" : "received";
        let statusText = file.status === "reviewed" ? "Reviewed" : "Received";

        let timeText = "";
        if (file.uploadedAt) {
          let date = file.uploadedAt.toDate();
          let months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
          timeText = months[date.getMonth()] + " " + date.getDate();
        }

        item.innerHTML =
          '<div class="file-icon">' + ext + '</div>' +
          '<div class="file-info">' +
            '<strong>' + file.fileName + '</strong>' +
            '<span>' + file.fileSize + ' · Uploaded ' + timeText + '</span>' +
          '</div>' +
          '<span class="file-status ' + statusClass + '">' + statusText + '</span>' +
          '<button class="file-delete-btn" onclick="deleteDocument(\'' + doc.id + '\', \'' + (file.fileURL || '') + '\')">✕</button>';

        fileList.appendChild(item);
      });

      let docCount = document.getElementById("doc-count");
      if (docCount) docCount.textContent = count + " files";
    }, function(error) {
      console.log("Documents error:", error);
    });
}

function deleteDocument(docId, fileURL) {
  if (!confirm("Delete this document? This cannot be undone.")) return;

  // Delete from Firestore
  db.collection("documents").doc(docId).delete()
    .then(function() {
      // Try to delete from Storage too
      if (fileURL) {
        try {
          let fileRef = storage.refFromURL(fileURL);
          fileRef.delete().catch(function() {});
        } catch(e) {}
      }
    })
    .catch(function(error) {
      alert("Failed to delete: " + error.message);
    });
}

function handleUpload(input) {
  let files = input.files;

  for (let i = 0; i < files.length; i++) {
    let file = files[i];

    // Get file size text
    let size = file.size;
    let sizeText = "";
    if (size < 1024) { sizeText = size + " B"; }
    else if (size < 1024 * 1024) { sizeText = Math.round(size / 1024) + " KB"; }
    else { sizeText = (size / (1024 * 1024)).toFixed(1) + " MB"; }

    // Upload to Firebase Storage
    let storageRef = storage.ref("documents/" + currentUser.uid + "/" + Date.now() + "_" + file.name);

    storageRef.put(file).then(function(snapshot) {
      return snapshot.ref.getDownloadURL();
    }).then(function(downloadURL) {
      // Save file metadata to Firestore
      return db.collection("documents").add({
        clientId: currentUser.uid,
        fileName: file.name,
        fileSize: sizeText,
        fileURL: downloadURL,
        status: "received",
        uploadedAt: firebase.firestore.FieldValue.serverTimestamp()
      });
    }).catch(function(error) {
      alert("Upload failed: " + error.message);
    });
  }

  input.value = "";
}
