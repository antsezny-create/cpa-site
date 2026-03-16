function showServices() {
  document.getElementById("service-detail").style.display = "block";
  document.getElementById("service-detail").scrollIntoView({ behavior: "smooth" });
}

function hideServices() {
  document.getElementById("service-detail").style.display = "none";
}
function copyEmail() {
  navigator.clipboard.writeText("sesnyanthony@gmail.com");
  alert("Email copied to clipboard!");
}