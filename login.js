function showError(msg) {
  let el = document.getElementById("login-error");
  if (!el) return;
  el.textContent = msg;
  el.style.display = "block";
}

function clearError() {
  let el = document.getElementById("login-error");
  if (el) el.style.display = "none";
}

function handleLogin() {
  clearError();
  let email    = document.getElementById("email").value.trim();
  let password = document.getElementById("password").value;

  document.getElementById("email").parentElement.classList.remove("error");
  document.getElementById("password").parentElement.classList.remove("error");

  if (email === "") {
    document.getElementById("email").parentElement.classList.add("error");
    showError("Please enter your email address.");
    return;
  }

  if (password === "") {
    document.getElementById("password").parentElement.classList.add("error");
    showError("Please enter your password.");
    return;
  }

  if (!email.includes("@") || !email.includes(".")) {
    document.getElementById("email").parentElement.classList.add("error");
    showError("Please enter a valid email address.");
    return;
  }

  let btn = document.querySelector(".btn-login");
  btn.textContent = "Signing in...";
  btn.disabled = true;

  auth.signInWithEmailAndPassword(email, password)
    .then(function(userCredential) {
      return db.collection("clients").doc(userCredential.user.uid).get()
        .then(function(doc) {
          let firstName = doc.exists ? (doc.data().firstName || "") : "";
          let header = document.querySelector(".login-form-header");
          let form   = document.querySelector(".login-form");
          if (form)   form.style.display = "none";
          if (header) {
            header.style.textAlign = "center";
            let check = document.createElement("div");
            check.className = "success-check";
            check.textContent = "✓";
            let h2 = document.createElement("h2");
            h2.textContent = "Welcome back" + (firstName ? ", " + firstName : "") + "!";
            let p = document.createElement("p");
            p.textContent = "Redirecting to your portal...";
            header.innerHTML = "";
            header.appendChild(check);
            header.appendChild(h2);
            header.appendChild(p);
          }
          setTimeout(function() { window.location.href = "portal.html"; }, 1500);
        });
    })
    .catch(function(error) {
      btn.textContent = "Sign In";
      btn.disabled = false;
      if (error.code === "auth/user-not-found") {
        showError("No account found with this email. Please create an account first.");
      } else if (error.code === "auth/wrong-password" || error.code === "auth/invalid-credential") {
        showError("Incorrect password. Please try again.");
      } else if (error.code === "auth/too-many-requests") {
        showError("Too many failed attempts. Please wait a few minutes and try again.");
      } else {
        showError("Sign in failed. Please try again.");
      }
    });
}

function forgotPassword() {
  clearError();
  let forgotForm = document.getElementById("forgot-form");
  if (forgotForm) {
    forgotForm.style.display = forgotForm.style.display === "none" ? "block" : "none";
    if (forgotForm.style.display === "block") {
      let input = document.getElementById("forgot-email");
      let emailVal = document.getElementById("email").value.trim();
      if (emailVal) input.value = emailVal;
      input.focus();
    }
  }
}

function submitForgotPassword() {
  let email = document.getElementById("forgot-email").value.trim();
  let msg   = document.getElementById("forgot-msg");
  if (!email || !email.includes("@")) {
    showError("Please enter a valid email address.");
    return;
  }
  auth.sendPasswordResetEmail(email)
    .then(function() {
      if (msg) msg.style.display = "block";
      setTimeout(function() {
        document.getElementById("forgot-form").style.display = "none";
        if (msg) msg.style.display = "none";
      }, 4000);
    })
    .catch(function() {
      showError("Could not send reset email. Please check the address and try again.");
    });
}

document.addEventListener("keydown", function(event) {
  if (event.key === "Enter") {
    let forgotVisible = document.getElementById("forgot-form");
    if (forgotVisible && forgotVisible.style.display === "block") {
      submitForgotPassword();
    } else {
      handleLogin();
    }
  }
});
