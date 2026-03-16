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
 
  // Show success, then redirect to portal
  document.querySelector(".login-form").style.display = "none";
  document.querySelector(".login-form-header").innerHTML =
    '<div class="success-check">✓</div>' +
    '<h2>Welcome back!</h2>' +
    '<p>Redirecting to your portal...</p>';
  document.querySelector(".login-form-header").style.textAlign = "center";
 
  // Redirect after 1.5 seconds
  setTimeout(function() {
    window.location.href = "portal.html";
  }, 1500);
}
 
function forgotPassword() {
  let email = prompt("Enter your email and we'll send you a reset link:");
  if (email) {
    alert("If an account exists for " + email + ", you'll receive a reset link shortly.");
  }
}
 
document.addEventListener("keydown", function(event) {
  if (event.key === "Enter") {
    handleLogin();
  }
});
