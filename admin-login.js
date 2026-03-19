// ── Route protection: redirect if already logged in ──
auth.onAuthStateChanged(function(user) {
  if (!user) return;
  db.collection("admins").doc(user.uid).get().then(function(doc) {
    if (doc.exists) {
      let existingSession = sessionStorage.getItem("adminSessionId");
      if (!existingSession) {
        let sessionId = Date.now().toString(36) + Math.random().toString(36).slice(2);
        let sessionData = {
          sessionId:  sessionId,
          uid:        user.uid,
          email:      user.email,
          signInAt:   firebase.firestore.FieldValue.serverTimestamp(),
          signOutAt:  null,
          duration:   null,
          userAgent:  navigator.userAgent,
          active:     true
        };
        db.collection("adminSessions").doc(sessionId).set(sessionData)
          .then(() => console.log("Session logged:", sessionId))
          .catch(e => console.error("Session log failed:", e.message));
        db.collection("admins").doc(user.uid).set({
          activeSession: sessionId,
          lastSignIn:    firebase.firestore.FieldValue.serverTimestamp(),
          lastUserAgent: navigator.userAgent
        }, { merge: true });
        sessionStorage.setItem("adminSessionId", sessionId);
        sessionStorage.setItem("adminSessionStart", Date.now().toString());
      }
      window.location.href = "dashboard.html";
    } else {
      window.location.href = "portal.html";
    }
  }).catch(function() {});
});

function handleAdminLogin() {
  let email = document.getElementById("admin-email").value;
  let password = document.getElementById("admin-password").value;

  document.getElementById("admin-email").parentElement.classList.remove("error");
  document.getElementById("admin-password").parentElement.classList.remove("error");

  if (email === "") {
    document.getElementById("admin-email").parentElement.classList.add("error");
    alert("Please enter your email address.");
    return;
  }

  if (password === "") {
    document.getElementById("admin-password").parentElement.classList.add("error");
    alert("Please enter your password.");
    return;
  }

  if (!email.includes("@") || !email.includes(".")) {
    document.getElementById("admin-email").parentElement.classList.add("error");
    alert("Please enter a valid email address.");
    return;
  }

  let btn = document.querySelector(".admin-btn");
  btn.textContent = "Signing in...";
  btn.disabled = true;

  auth.signInWithEmailAndPassword(email, password)
    .then(function(userCredential) {
      let user = userCredential.user;
      return db.collection("admins").doc(user.uid).get()
        .then(function(doc) {
          if (doc.exists && doc.data().role === "admin") {
            showSuccess();
          } else {
            return db.collection("admins").where("email", "==", user.email).get()
              .then(function(snapshot) {
                if (!snapshot.empty) {
                  showSuccess();
                } else {
                  auth.signOut();
                  btn.textContent = "Sign In to Dashboard";
                  btn.disabled = false;
                  alert("This account does not have practitioner access.");
                }
              });
          }
        })
        .catch(function(firestoreError) {
          auth.signOut();
          btn.textContent = "Sign In to Dashboard";
          btn.disabled = false;
          alert("Database error: " + firestoreError.message);
        });
    })
    .catch(function(error) {
      btn.textContent = "Sign In to Dashboard";
      btn.disabled = false;
      if (error.code === "auth/user-not-found") {
        alert("No account found with this email.");
      } else if (error.code === "auth/wrong-password" || error.code === "auth/invalid-credential") {
        alert("Incorrect password. Please try again.");
      } else if (error.code === "auth/too-many-requests") {
        alert("Too many failed attempts. Please try again in a few minutes.");
      } else {
        alert("Error: " + error.message);
      }
    });
}

function showSuccess() {
  document.querySelector(".login-form").style.display = "none";
  document.querySelector(".login-form-header").innerHTML =
    '<div style="width: 64px; height: 64px; border-radius: 50%; background: rgba(124, 58, 237, 0.1); color: #A78BFA; display: flex; align-items: center; justify-content: center; font-size: 28px; margin: 0 auto 20px;">✓</div>' +
    '<h2>Welcome, Anthony</h2>' +
    '<p>Loading your dashboard...</p>';
  document.querySelector(".login-form-header").style.textAlign = "center";

  let user = auth.currentUser;
  if (user) {
    let sessionId = Date.now().toString(36) + Math.random().toString(36).slice(2);
    let sessionData = {
      sessionId:   sessionId,
      uid:         user.uid,
      email:       user.email,
      signInAt:    firebase.firestore.FieldValue.serverTimestamp(),
      signOutAt:   null,
      duration:    null,
      userAgent:   navigator.userAgent,
      active:      true
    };
    db.collection("adminSessions").doc(sessionId).set(sessionData)
      .then(() => console.log("Session logged:", sessionId))
      .catch(e => console.error("Session log failed:", e.message));
    db.collection("admins").doc(user.uid).set({
      activeSession:   sessionId,
      lastSignIn:      firebase.firestore.FieldValue.serverTimestamp(),
      lastUserAgent:   navigator.userAgent
    }, { merge: true });
    sessionStorage.setItem("adminSessionId", sessionId);
    sessionStorage.setItem("adminSessionStart", Date.now().toString());
  }

  setTimeout(function() {
    window.location.href = "dashboard.html";
  }, 1500);
}

document.addEventListener("keydown", function(event) {
  if (event.key === "Enter") {
    handleAdminLogin();
  }
});
