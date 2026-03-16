function handleLogin() {
  // Get the values from the input fields
  let email = document.getElementById("email").value;
  let password = document.getElementById("password").value;

  // Remove any previous error states
  document.getElementById("email").parentElement.classList.remove("error");
  document.getElementById("password").parentElement.classList.remove("error");

  // Check if email is empty
  if (email === "") {
    document.getElementById("email").parentElement.classList.add("error");
    alert("Please enter your email address.");
    return;
  }

  // Check if password is empty
  if (password === "") {
    document.getElementById("password").parentElement.classList.add("error");
    alert("Please enter your password.");
    return;
  }

  // Check if email looks valid (has @ and a dot)
  if (!email.includes("@") || !email.includes(".")) {
    document.getElementById("email").parentElement.classList.add("error");
    alert("Please enter a valid email address.");
    return;
  }

  // If everything passes, show success
  // In a real app, this would send the data to a server to verify
  document.querySelector(".login-form").style.display = "none";
  document.querySelector(".login-form-header").innerHTML = 
    '<div class="success-check">✓</div>' +
    '<h2>Welcome back!</h2>' +
    '<p>Redirecting to your portal...</p>';
  document.querySelector(".login-form-header").style.textAlign = "center";
}

function forgotPassword() {
  let email = prompt("Enter your email and we'll send you a reset link:");
  if (email) {
    alert("If an account exists for " + email + ", you'll receive a reset link shortly.");
  }
}

// Let users press Enter to submit the form
document.addEventListener("keydown", function(event) {
  if (event.key === "Enter") {
    handleLogin();
  }
});
