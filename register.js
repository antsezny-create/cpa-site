// ── Step Navigation ──
function nextStep(stepNumber) {
  // Validate current step before moving forward
  if (stepNumber === 2) {
    if (!validateStep1()) return;
  }
  if (stepNumber === 3) {
    if (!validateStep2()) return;
  }

  // Hide all steps
  let steps = document.querySelectorAll(".register-step");
  for (let i = 0; i < steps.length; i++) {
    steps[i].style.display = "none";
  }

  // Show target step
  document.getElementById("step-" + stepNumber).style.display = "block";

  // Update step indicators
  updateStepIndicator(stepNumber);
}

function prevStep(stepNumber) {
  let steps = document.querySelectorAll(".register-step");
  for (let i = 0; i < steps.length; i++) {
    steps[i].style.display = "none";
  }
  document.getElementById("step-" + stepNumber).style.display = "block";
  updateStepIndicator(stepNumber);
}

function updateStepIndicator(currentStep) {
  // Reset all dots and lines
  for (let i = 1; i <= 3; i++) {
    let dot = document.getElementById("step-dot-" + i);
    dot.className = "step-dot-reg";

    if (i < currentStep) {
      dot.className = "step-dot-reg done";
      dot.textContent = "✓";
    } else if (i === currentStep) {
      dot.className = "step-dot-reg active";
      dot.textContent = i;
    } else {
      dot.textContent = i;
    }
  }

  for (let i = 1; i <= 2; i++) {
    let line = document.getElementById("step-line-" + i);
    line.className = "step-line";

    if (i < currentStep) {
      line.className = "step-line done";
    } else if (i === currentStep) {
      line.className = "step-line active";
    }
  }
}

// ── Validation ──
function validateStep1() {
  let firstName = document.getElementById("firstName").value.trim();
  let lastName = document.getElementById("lastName").value.trim();
  let email = document.getElementById("reg-email").value.trim();
  let phone = document.getElementById("phone").value.trim();

  if (firstName === "") {
    alert("Please enter your first name.");
    return false;
  }
  if (lastName === "") {
    alert("Please enter your last name.");
    return false;
  }
  if (email === "" || !email.includes("@") || !email.includes(".")) {
    alert("Please enter a valid email address.");
    return false;
  }
  if (phone === "") {
    alert("Please enter your phone number.");
    return false;
  }
  return true;
}

function validateStep2() {
  let password = document.getElementById("reg-password").value;
  let confirm = document.getElementById("reg-confirm").value;

  if (password.length < 8) {
    alert("Password must be at least 8 characters.");
    return false;
  }
  if (!/[0-9]/.test(password)) {
    alert("Password must contain at least one number.");
    return false;
  }
  if (!/[A-Z]/.test(password)) {
    alert("Password must contain at least one uppercase letter.");
    return false;
  }
  if (password !== confirm) {
    alert("Passwords do not match.");
    return false;
  }
  return true;
}

// ── Live Password Strength Checker ──
document.addEventListener("DOMContentLoaded", function() {
  let passwordInput = document.getElementById("reg-password");

  passwordInput.addEventListener("input", function() {
    let password = passwordInput.value;

    // Check length
    let reqLength = document.getElementById("req-length");
    if (password.length >= 8) {
      reqLength.classList.add("met");
    } else {
      reqLength.classList.remove("met");
    }

    // Check for number
    let reqNumber = document.getElementById("req-number");
    if (/[0-9]/.test(password)) {
      reqNumber.classList.add("met");
    } else {
      reqNumber.classList.remove("met");
    }

    // Check for uppercase
    let reqUpper = document.getElementById("req-upper");
    if (/[A-Z]/.test(password)) {
      reqUpper.classList.add("met");
    } else {
      reqUpper.classList.remove("met");
    }
  });
});

// ── Create Account ──
function createAccount() {
  let ssn = document.getElementById("ssn").value.trim();
  let ssnConfirm = document.getElementById("ssn-confirm").value.trim();
  let terms = document.getElementById("terms").checked;

  if (ssn === "") {
    alert("Please enter your SSN or Tax ID.");
    return;
  }
  if (ssn !== ssnConfirm) {
    alert("SSN entries do not match. Please re-enter.");
    return;
  }
  if (!terms) {
    alert("Please agree to the Terms of Service and Privacy Policy.");
    return;
  }

  // Show success
  let steps = document.querySelectorAll(".register-step");
  for (let i = 0; i < steps.length; i++) {
    steps[i].style.display = "none";
  }
  document.getElementById("step-success").style.display = "block";

  // Hide step indicator
  document.querySelector(".step-indicator").style.display = "none";

  // Redirect to portal after 2 seconds
  setTimeout(function() {
    window.location.href = "portal.html";
  }, 2000);
}
