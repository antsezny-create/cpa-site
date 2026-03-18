function toggleMobileMenu() {
  let menu = document.getElementById("mobile-menu");
  menu.classList.toggle("open");
}

function copyEmail() {
  navigator.clipboard.writeText("sesnyanthony@gmail.com").then(function() {
    let btn = document.querySelector(".btn-copy");
    let original = btn.textContent;
    btn.textContent = "✓ Copied!";
    setTimeout(function() { btn.textContent = original; }, 2000);
  });
}

// Close mobile menu when clicking outside
document.addEventListener("click", function(e) {
  let menu = document.getElementById("mobile-menu");
  let nav  = document.querySelector(".nav");
  if (menu && menu.classList.contains("open") && !nav.contains(e.target)) {
    menu.classList.remove("open");
  }
});
