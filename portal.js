// ── Tab Switching ──
function switchTab(tabName) {
  // Hide all tabs
  let allTabs = document.querySelectorAll(".tab-content");
  for (let i = 0; i < allTabs.length; i++) {
    allTabs[i].style.display = "none";
  }

  // Show the selected tab
  document.getElementById("tab-" + tabName).style.display = "block";

  // Update sidebar buttons
  let allBtns = document.querySelectorAll(".sidebar-btn");
  for (let i = 0; i < allBtns.length; i++) {
    allBtns[i].classList.remove("active");
  }

  // Find the button that was clicked and make it active
  // We use the onclick attribute to match which button corresponds to which tab
  let buttons = document.querySelectorAll(".sidebar-btn");
  for (let i = 0; i < buttons.length; i++) {
    let onclickValue = buttons[i].getAttribute("onclick");
    if (onclickValue && onclickValue.includes(tabName)) {
      buttons[i].classList.add("active");
    }
  }
}

// ── File Upload ──
function handleUpload(input) {
  let files = input.files;

  for (let i = 0; i < files.length; i++) {
    let file = files[i];

    // Get file size in readable format
    let size = file.size;
    let sizeText = "";
    if (size < 1024) {
      sizeText = size + " B";
    } else if (size < 1024 * 1024) {
      sizeText = Math.round(size / 1024) + " KB";
    } else {
      sizeText = (size / (1024 * 1024)).toFixed(1) + " MB";
    }

    // Get today's date
    let today = new Date();
    let months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    let dateText = months[today.getMonth()] + " " + today.getDate();

    // Get file extension for the icon
    let extension = file.name.split(".").pop().toUpperCase();

    // Create new file item HTML
    let newItem = document.createElement("div");
    newItem.className = "file-item";
    newItem.innerHTML =
      '<div class="file-icon">' + extension + "</div>" +
      '<div class="file-info">' +
        "<strong>" + file.name + "</strong>" +
        "<span>" + sizeText + " · Uploaded " + dateText + "</span>" +
      "</div>" +
      '<span class="file-status received">Received</span>';

    // Add it to the file list
    document.getElementById("file-list").appendChild(newItem);
  }

  // Update the file count
  let totalFiles = document.querySelectorAll(".file-item").length;
  document.getElementById("doc-count").textContent = totalFiles + " files";

  // Reset the input so the same file can be uploaded again if needed
  input.value = "";
}

// ── Messaging ──
function sendMessage() {
  let input = document.getElementById("message-input");
  let text = input.value.trim();

  // Don't send empty messages
  if (text === "") return;

  // Get current time
  let now = new Date();
  let hours = now.getHours();
  let minutes = now.getMinutes();
  let ampm = hours >= 12 ? "PM" : "AM";
  hours = hours % 12;
  if (hours === 0) hours = 12;
  if (minutes < 10) minutes = "0" + minutes;
  let timeText = "Today at " + hours + ":" + minutes + " " + ampm;

  // Create message element
  let newMessage = document.createElement("div");
  newMessage.className = "message sent";
  newMessage.innerHTML =
    '<div class="message-body">' +
      '<div class="message-meta"><strong>You</strong> <span>' + timeText + "</span></div>" +
      '<div class="message-text">' + text + "</div>" +
    "</div>";

  // Add to thread
  document.getElementById("messages-thread").appendChild(newMessage);

  // Clear input
  input.value = "";

  // Scroll to bottom
  let thread = document.getElementById("messages-thread");
  thread.scrollTop = thread.scrollHeight;
}
