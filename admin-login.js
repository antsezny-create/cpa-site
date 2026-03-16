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
      // Check if this user is an admin
      return db.collection("admins").doc(userCredential.user.uid).get();
    })
    .then(function(doc) {
      if (doc.exists && doc.data().role === "admin") {
        // Admin confirmed - redirect to dashboard
        document.querySelector(".login-form").style.display = "none";
        document.querySelector(".login-form-header").innerHTML =
          '<div style="width: 64px; height: 64px; border-radius: 50%; background: rgba(124, 58, 237, 0.1); color: #A78BFA; display: flex; align-items: center; justify-content: center; font-size: 28px; margin: 0 auto 20px;">✓</div>' +
          '<h2>Welcome, Anthony</h2>' +
          '<p>Loading your dashboard...</p>';
        document.querySelector(".login-form-header").style.textAlign = "center";

        setTimeout(function() {
          window.location.href = "dashboard.html";
        }, 1500);
      } else {
        // Not an admin - sign them out
        auth.signOut();
        let btn = document.querySelector(".admin-btn");
        btn.textContent = "Sign In to Dashboard";
        btn.disabled = false;
        alert("This account does not have practitioner access. If you're a client, please use the client login.");
      }
    })
    .catch(function(error) {
      let btn = document.querySelector(".admin-btn");
      btn.textContent = "Sign In to Dashboard";
      btn.disabled = false;

      if (error.code === "auth/user-not-found") {
        alert("No account found with this email.");
      } else if (error.code === "auth/wrong-password" || error.code === "auth/invalid-credential") {
        alert("Incorrect password. Please try again.");
      } else {
        alert("Error: " + error.message);
      }
    });
}

document.addEventListener("keydown", function(event) {
  if (event.key === "Enter") {
    handleAdminLogin();
  }
});
