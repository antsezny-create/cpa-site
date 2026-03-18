// ── Route protection: redirect if already logged in ──
auth.onAuthStateChanged(function(user) {
  if (!user) return; // Not logged in — show the login form normally

  // Someone is logged in — check if they're an admin
  db.collection("admins").doc(user.uid).get().then(function(doc) {
    if (doc.exists) {
      // Already logged in as admin — go straight to dashboard
      window.location.href = "dashboard.html";
    } else {
      // Logged in as a client — redirect to portal, this page isn't for them
      window.location.href = "portal.html";
    }
  }).catch(function() {
    // Can't verify — just let them see the login form
  });
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

  // Sign in with Firebase
  auth.signInWithEmailAndPassword(email, password)
    .then(function(userCredential) {
      let user = userCredential.user;

      // Try reading from admins collection
      return db.collection("admins").doc(user.uid).get()
        .then(function(doc) {
          if (doc.exists && doc.data().role === "admin") {
            // Found in admins collection
            showSuccess();
          } else {
            // Not found by UID - try checking by email as fallback
            return db.collection("admins").where("email", "==", user.email).get()
              .then(function(snapshot) {
                if (!snapshot.empty) {
                  showSuccess();
                } else {
                  // Last fallback: check if email matches your admin email
                  if (user.email === "sesnyanthony@gmail.com") {
                    // Auto-create admin record for this UID
                    return db.collection("admins").doc(user.uid).set({
                      role: "admin",
                      email: user.email,
                      name: "Anthony Sesny",
                      createdAt: firebase.firestore.FieldValue.serverTimestamp()
                    }).then(function() {
                      showSuccess();
                    });
                  } else {
                    auth.signOut();
                    btn.textContent = "Sign In to Dashboard";
                    btn.disabled = false;
                    alert("This account does not have practitioner access.");
                  }
                }
              });
          }
        })
        .catch(function(firestoreError) {
          // Firestore read failed - likely a rules issue
          // Fall back to email check
          if (userCredential.user.email === "sesnyanthony@gmail.com") {
            showSuccess();
          } else {
            auth.signOut();
            btn.textContent = "Sign In to Dashboard";
            btn.disabled = false;
            alert("Database error: " + firestoreError.message + "\n\nPlease check your Firestore security rules in the Firebase console.");
          }
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

  setTimeout(function() {
    window.location.href = "dashboard.html";
  }, 1500);
}

document.addEventListener("keydown", function(event) {
  if (event.key === "Enter") {
    handleAdminLogin();
  }
});
