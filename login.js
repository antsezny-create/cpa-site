function handleLogin() {
  let email = document.getElementById("email").value;
  let password = document.getElementById("password").value;

  document.getElementById("email").parentElement.classList.remove("error");
  document.getElementById("password").parentElement.classList.remove("error");

  if (email === "") {
    document.getElementById("email").parentElement.classList.add("error");
    alert("Please enter your email address.");
    return;
  }

  if (password === "") {
    document.getElementById("password").parentElement.classList.add("error");
    alert("Please enter your password.");
    return;
  }

  if (!email.includes("@") || !email.includes(".")) {
    document.getElementById("email").parentElement.classList.add("error");
    alert("Please enter a valid email address.");
    return;
  }

  let btn = document.querySelector(".btn-login");
  btn.textContent = "Signing in...";
  btn.disabled = true;

  auth.signInWithEmailAndPassword(email, password)
    .then(function(userCredential) {
      document.querySelector(".login-form").style.display = "none";
      document.querySelector(".login-form-header").innerHTML =
        '<div class="success-check">✓</div>' +
        '<h2>Welcome back!</h2>' +
        '<p>Redirecting to your portal...</p>';
      document.querySelector(".login-form-header").style.textAlign = "center";

      setTimeout(function() {
        window.location.href = "portal.html";
      }, 1500);
    })
    .catch(function(error) {
      btn.textContent = "Sign In";
      btn.disabled = false;

      if (error.code === "auth/user-not-found") {
        alert("No account found with this email. Please create an account first.");
      } else if (error.code === "auth/wrong-password" || error.code === "auth/invalid-credential") {
        alert("Incorrect password. Please try again.");
      } else if (error.code === "auth/too-many-requests") {
        alert("Too many failed attempts. Please try again in a few minutes.");
      } else {
        alert("Error: " + error.message);
      }
    });
}

function forgotPassword() {
  let email = prompt("Enter your email and we'll send you a reset link:");
  if (email) {
    auth.sendPasswordResetEmail(email)
      .then(function() {
        alert("Password reset email sent! Check your inbox.");
      })
      .catch(function(error) {
        alert("Error: " + error.message);
      });
  }
}

document.addEventListener("keydown", function(event) {
  if (event.key === "Enter") {
    handleLogin();
  }
});
