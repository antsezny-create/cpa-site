function handleAdminLogin() {
  let email = document.getElementById("admin-email").value;
  let password = document.getElementById("admin-password").value;

  // Clear previous errors
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

  // Show success and redirect to dashboard
  document.querySelector(".login-form").style.display = "none";
  document.querySelector(".login-form-header").innerHTML =
    '<div style="width: 64px; height: 64px; border-radius: 50%; background: rgba(124, 58, 237, 0.1); color: #A78BFA; display: flex; align-items: center; justify-content: center; font-size: 28px; margin: 0 auto 20px;">✓</div>' +
    '<h2>Welcome, Anthony</h2>' +
    '<p>Loading your dashboard...</p>';
  document.querySelector(".login-form-header").style.textAlign = "center";

  // Redirect after 1.5 seconds
  setTimeout(function() {
    window.location.href = "dashboard.html";
  }, 1500);
}

// Enter key to submit
document.addEventListener("keydown", function(event) {
  if (event.key === "Enter") {
    handleAdminLogin();
  }
});
