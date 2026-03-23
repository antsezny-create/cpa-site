// ── Route protection: if already logged in, go straight to dashboard ──
auth.onAuthStateChanged(function(user) {
  if (!user) return;
  db.collection("admins").doc(user.uid).get().then(function(doc) {
    if (!doc.exists) return; // not an admin, do nothing
    // Valid admin already logged in — go straight to dashboard
    window.location.href = "dashboard.html";
  }).catch(function() {});
});

function handleAdminLogin() {
  let email    = document.getElementById("admin-email").value.trim();
  let password = document.getElementById("admin-password").value;

  document.getElementById("admin-email").parentElement.classList.remove("error");
  document.getElementById("admin-password").parentElement.classList.remove("error");

  if (!email) {
    document.getElementById("admin-email").parentElement.classList.add("error");
    alert("Please enter your email address.");
    return;
  }
  if (!password) {
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
  btn.disabled    = true;

  // Persistent login for primary admin only
  let persistence = (email.toLowerCase() === "sesnyanthony@gmail.com")
    ? firebase.auth.Auth.Persistence.LOCAL
    : firebase.auth.Auth.Persistence.SESSION;

  auth.setPersistence(persistence)
    .then(function() {
      return auth.signInWithEmailAndPassword(email, password);
    })
    .then(function(userCredential) {
      return db.collection("admins").doc(userCredential.user.uid).get();
    })
    .then(function(doc) {
      if (!doc.exists) {
        auth.signOut();
        btn.textContent = "Sign In to Dashboard";
        btn.disabled    = false;
        alert("This account does not have practitioner access.");
        return;
      }
      showSuccess();
    })
    .catch(function(error) {
      btn.textContent = "Sign In to Dashboard";
      btn.disabled    = false;
      if (error.code === "auth/user-not-found" || error.code === "auth/invalid-credential") {
        alert("Incorrect email or password. Please try again.");
      } else if (error.code === "auth/too-many-requests") {
        alert("Too many failed attempts. Please try again in a few minutes.");
      } else {
        alert("Sign in error: " + error.message);
      }
    });
}

function showSuccess() {
  document.querySelector(".login-form").style.display = "none";
  document.querySelector(".login-form-header").innerHTML =
    '<div style="width:64px;height:64px;border-radius:50%;background:rgba(0,166,81,0.1);color:#00A651;display:flex;align-items:center;justify-content:center;font-size:28px;margin:0 auto 20px;">✓</div>' +
    '<h2>Welcome, Anthony</h2>' +
    '<p>Loading your dashboard...</p>';
  document.querySelector(".login-form-header").style.textAlign = "center";
  // onAuthStateChanged fires and handles redirect + session creation
}

document.addEventListener("keydown", function(event) {
  if (event.key === "Enter") handleAdminLogin();
});
