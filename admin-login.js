function showAdminError(msg) {
  let el = document.getElementById("admin-error");
  if (!el) return;
  el.textContent = msg;
  el.style.display = "block";
}

function clearAdminError() {
  let el = document.getElementById("admin-error");
  if (el) el.style.display = "none";
}

// ── Route protection: if already logged in, go straight to dashboard ──
auth.onAuthStateChanged(function(user) {
  if (!user) return;
  db.collection("admins").doc(user.uid).get().then(function(doc) {
    if (!doc.exists) return;
    window.location.href = "dashboard.html";
  }).catch(function() {});
});

function handleAdminLogin() {
  clearAdminError();
  let email    = document.getElementById("admin-email").value.trim();
  let password = document.getElementById("admin-password").value;

  document.getElementById("admin-email").parentElement.classList.remove("error");
  document.getElementById("admin-password").parentElement.classList.remove("error");

  if (!email) {
    document.getElementById("admin-email").parentElement.classList.add("error");
    showAdminError("Please enter your email address.");
    return;
  }
  if (!password) {
    document.getElementById("admin-password").parentElement.classList.add("error");
    showAdminError("Please enter your password.");
    return;
  }
  if (!email.includes("@") || !email.includes(".")) {
    document.getElementById("admin-email").parentElement.classList.add("error");
    showAdminError("Please enter a valid email address.");
    return;
  }

  let btn = document.querySelector(".admin-btn");
  btn.textContent = "Signing in...";
  btn.disabled    = true;

  let remember = document.getElementById("admin-remember").checked;
  let persistence = remember
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
        showAdminError("This account does not have practitioner access.");
        return;
      }
      showSuccess();
    })
    .catch(function(error) {
      btn.textContent = "Sign In to Dashboard";
      btn.disabled    = false;
      if (error.code === "auth/user-not-found" || error.code === "auth/invalid-credential") {
        showAdminError("Incorrect email or password. Please try again.");
      } else if (error.code === "auth/too-many-requests") {
        showAdminError("Too many failed attempts. Please wait a few minutes and try again.");
      } else {
        showAdminError("Sign in failed. Please try again.");
      }
    });
}

function showSuccess() {
  let form   = document.querySelector(".login-form");
  let header = document.querySelector(".login-form-header");
  if (form)   form.style.display = "none";
  if (header) {
    header.style.textAlign = "center";
    let icon = document.createElement("div");
    icon.style.cssText = "width:64px;height:64px;border-radius:50%;background:rgba(0,166,81,0.1);color:#00A651;display:flex;align-items:center;justify-content:center;font-size:28px;margin:0 auto 20px;";
    icon.textContent = "✓";
    let h2 = document.createElement("h2");
    h2.textContent = "Welcome, Anthony";
    let p = document.createElement("p");
    p.textContent = "Loading your dashboard...";
    header.innerHTML = "";
    header.appendChild(icon);
    header.appendChild(h2);
    header.appendChild(p);
  }
}

document.addEventListener("keydown", function(event) {
  if (event.key === "Enter") handleAdminLogin();
});
