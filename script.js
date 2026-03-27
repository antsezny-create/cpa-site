function toggleMobileMenu() {
  let menu = document.getElementById("mobile-menu");
  menu.classList.toggle("open");
}

function openContactModal() {
  let modal = document.getElementById("contact-modal");
  modal.style.display = "flex";
  document.getElementById("cf-name").focus();
}

function closeContactModal() {
  let modal = document.getElementById("contact-modal");
  modal.style.display = "none";
  // Reset form
  ["cf-name","cf-email","cf-phone","cf-msg"].forEach(function(id) {
    document.getElementById(id).value = "";
  });
  document.getElementById("cf-error").style.display = "none";
  document.getElementById("contact-form-wrap").style.display = "block";
  document.getElementById("contact-success").style.display = "none";
}

async function submitContactForm() {
  let name    = document.getElementById("cf-name").value.trim();
  let email   = document.getElementById("cf-email").value.trim();
  let phone   = document.getElementById("cf-phone").value.trim();
  let message = document.getElementById("cf-msg").value.trim();
  let errEl   = document.getElementById("cf-error");
  let btn     = document.getElementById("cf-submit");

  errEl.style.display = "none";
  if (!name || !email || !message) {
    errEl.textContent = "Please fill in your name, email, and message.";
    errEl.style.display = "block";
    return;
  }

  btn.textContent = "Sending...";
  btn.disabled = true;

  try {
    let res = await fetch("https://us-central1-sesny-cpa.cloudfunctions.net/submitInquiry", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ name, email, phone, message })
    });
    if (!res.ok) throw new Error("Server error");
    document.getElementById("contact-form-wrap").style.display = "none";
    document.getElementById("contact-success").style.display = "block";
  } catch(e) {
    errEl.textContent = "Something went wrong. Please email sesnyanthony@gmail.com directly.";
    errEl.style.display = "block";
    btn.textContent = "Send Message";
    btn.disabled = false;
  }
}

// Close mobile menu when clicking outside
document.addEventListener("click", function(e) {
  let menu = document.getElementById("mobile-menu");
  let nav  = document.querySelector(".nav");
  if (menu && menu.classList.contains("open") && !nav.contains(e.target)) {
    menu.classList.remove("open");
  }
  // Close contact modal when clicking backdrop
  let modal = document.getElementById("contact-modal");
  if (modal && e.target === modal) closeContactModal();
});
