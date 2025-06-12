const CLOUDINARY_CLOUD_NAME = 'dwocdg3m9';
const CLOUDINARY_UPLOAD_PRESET = '3D_TO_AR';
const CLOUDINARY_UPLOAD_URL = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/upload`;

let currentModelUrl = null;
let models = new Map();

document.addEventListener("DOMContentLoaded", initializeApp);


function setupEventListeners() {
  const modelViewer = document.getElementById("modelViewer");
  if (modelViewer) {
    modelViewer.addEventListener("load", onModelLoad);
    modelViewer.addEventListener("error", onModelError);
  }
}

function initializeApp() {
  setupEventListeners();
  handleViewportChanges();
  checkUrlParameters();
  setupARSupport();
  preventDoubleTapZoom();
  updateGallery();
  const modelViewer = document.getElementById('modelViewer');
  modelViewer.addEventListener('load', onModelLoad);
  modelViewer.addEventListener('error', onModelError);


}

// --------------------- ARModelViewer Class ------------------------

class ARModelViewer {
  constructor() {
    this.isPlaying = false;
    this.currentTime = 0;
    this.duration = 100;
    this.playbackSpeed = 1;
    this.selectedAnimation = "idle";
    this.leftPanelOpen = true;

    this.initializeElements();
    this.bindEvents();
    this.updateUI();
  }

  initializeElements() {
    this.leftPanel = document.getElementById("leftPanel");
    this.toggleBtn = document.getElementById("toggleBtn");
    this.toggleIcon = document.getElementById("toggleIcon");

    this.uploadBtn = document.querySelector(".upload-btn");
    this.modelUpload = document.getElementById("modelUpload");

    this.positionSlider = document.getElementById("positionSlider");
    this.rotationSlider = document.getElementById("rotationSlider");
    this.scaleSlider = document.getElementById("scaleSlider");
    this.environmentSelect = document.getElementById("environmentSelect");

    this.animationSelect = document.getElementById("animationSelect");
    this.playPauseBtn = document.getElementById("playPauseBtn");
    this.playIcon = document.getElementById("playIcon");
    this.skipBackBtn = document.getElementById("skipBackBtn");
    this.skipForwardBtn = document.getElementById("skipForwardBtn");
    this.repeatBtn = document.getElementById("repeatBtn");
    this.timelineSlider = document.getElementById("timelineSlider");
    this.currentTimeDisplay = document.getElementById("currentTime");
    this.totalTimeDisplay = document.getElementById("totalTime");
    this.speedSlider = document.getElementById("speedSlider");
    this.speedValue = document.getElementById("speedValue");
    this.speedButtons = document.querySelectorAll(".speed-btn");

    this.playIndicator = document.getElementById("playIndicator");
    this.currentAnimation = document.getElementById("currentAnimation");
    this.playbackState = document.getElementById("playbackState");
    this.currentSpeed = document.getElementById("currentSpeed");
    this.launchARBtn = document.getElementById("launchARBtn");
  }

  bindEvents() {
    this.toggleBtn.addEventListener("click", () => this.toggleLeftPanel());

    this.uploadBtn.addEventListener("click", () => this.modelUpload.click());
    this.modelUpload.addEventListener("change", (e) => this.handleFileUpload(e));

    this.playPauseBtn.addEventListener("click", () => this.togglePlayback());
    this.skipBackBtn.addEventListener("click", () => this.skipToStart());
    this.skipForwardBtn.addEventListener("click", () => this.skipToEnd());
    this.timelineSlider.addEventListener("input", (e) => this.updateCurrentTime(e.target.value));
    this.speedSlider.addEventListener("input", (e) => this.updateSpeed(e.target.value));
    this.animationSelect.addEventListener("change", (e) => this.changeAnimation(e.target.value));

    this.speedButtons.forEach((btn) => {
      btn.addEventListener("click", (e) => {
        const speed = Number.parseFloat(e.target.dataset.speed);
        this.updateSpeed(speed);
      });
    });

    this.positionSlider.addEventListener("input", (e) => this.updatePosition(e.target.value));
    this.rotationSlider.addEventListener("input", (e) => this.updateRotation(e.target.value));
    this.scaleSlider.addEventListener("input", (e) => this.updateScale(e.target.value));
    this.environmentSelect.addEventListener("change", (e) => this.updateEnvironment(e.target.value));
  }

  toggleLeftPanel() {
    this.leftPanelOpen = !this.leftPanelOpen;

    this.leftPanel.classList.toggle("collapsed", !this.leftPanelOpen);
    this.toggleBtn.classList.toggle("collapsed", !this.leftPanelOpen);
    this.toggleIcon.className = this.leftPanelOpen ? "fas fa-chevron-left" : "fas fa-chevron-right";
  }

  async handleFileUpload(event) {
    const file = event.target.files[0];
    if (!file) return;
  
    if (!file.name.toLowerCase().endsWith(".glb") && !file.name.toLowerCase().endsWith(".gltf")) {
      showNotification("Only .glb or .gltf files supported", "error");
      return;
    }
  
    showLoading(true);
  
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("upload_preset", "3D_TO_AR");
      formData.append("resource_type", "raw");
  
      const res = await fetch("https://api.cloudinary.com/v1_1/dwocdg3m9/upload", {
        method: "POST",
        body: formData
      });
  
      const result = await res.json();
      console.log("✅ Cloudinary upload result:", result);

  
      if (!result.secure_url) {
        throw new Error("Upload failed: No secure_url returned");
      }
  
      // ✅ STEP 4 (safe version)
      const modelId = `model_${Date.now()}`;
      const modelData = {
        id: modelId, // 🔁 needed for gallery
        url: result.secure_url,
        filename: file.name,
        uploadTime: new Date().toISOString(),
        fileSize: formatFileSize(file.size)
      };
  
      // Save to localStorage
      localStorage.setItem(`model_${modelId}`, JSON.stringify(modelData));
      currentModelUrl = modelData.url;
  
      // Load into viewer
      loadModel(modelData.url, modelData.filename, modelId);
      updateGallery();
      this.launchARBtn.disabled = false;
      showNotification("✅ Model uploaded and loaded");
  
    } catch (err) {
      console.error("❌ Upload error:", err);
      showNotification("Upload failed", "error");
    } finally {
      showLoading(false);
    }
  }
  

  formatFileSize(bytes) {
    const sizes = ["Bytes", "KB", "MB"];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${(bytes / Math.pow(1024, i)).toFixed(2)} ${sizes[i]}`;
  }
  

  togglePlayback() {
    this.isPlaying = !this.isPlaying;
    this.updatePlaybackUI();

    if (this.isPlaying) {
      this.startAnimation();
    } else {
      this.pauseAnimation();
    }
  }

  startAnimation() {
    this.playIcon.className = "fas fa-pause";
    this.playIndicator.style.display = "flex";
    this.playbackState.textContent = "Playing";
    this.playbackState.style.color = "#10b981";

    this.animationInterval = setInterval(() => {
      if (this.currentTime < this.duration) {
        this.currentTime += this.playbackSpeed;
        this.updateTimeDisplay();
      } else {
        this.currentTime = 0;
      }
    }, 100);
  }

  pauseAnimation() {
    this.playIcon.className = "fas fa-play";
    this.playIndicator.style.display = "none";
    this.playbackState.textContent = "Paused";
    this.playbackState.style.color = "#f59e0b";

    if (this.animationInterval) clearInterval(this.animationInterval);
  }

  skipToStart() {
    this.currentTime = 0;
    this.updateTimeDisplay();
  }

  skipToEnd() {
    this.currentTime = this.duration;
    this.updateTimeDisplay();
  }

  updateCurrentTime(time) {
    this.currentTime = Number.parseInt(time);
    this.updateTimeDisplay();
  }

  updateSpeed(speed) {
    this.playbackSpeed = Number.parseFloat(speed);
    this.speedSlider.value = speed;
    this.speedValue.textContent = speed;
    this.currentSpeed.textContent = speed + "x";

    this.speedButtons.forEach((btn) => {
      if (Number.parseFloat(btn.dataset.speed) === this.playbackSpeed) {
        btn.classList.remove("btn-outline");
        btn.classList.add("btn-primary", "active");
      } else {
        btn.classList.remove("btn-primary", "active");
        btn.classList.add("btn-outline");
      }
    });
  }

  changeAnimation(animation) {
    this.selectedAnimation = animation;
    this.currentAnimation.textContent = animation.charAt(0).toUpperCase() + animation.slice(1);
    console.log("Animation changed to:", animation);
  }

  updatePosition(value) {
    console.log("Position updated:", value);
  }

  updateRotation(value) {
    console.log("Rotation updated:", value);
  }

  updateScale(value) {
    console.log("Scale updated:", value);
  }

  updateEnvironment(environment) {
    console.log("Environment changed to:", environment);
  }

  updateTimeDisplay() {
    const mins = Math.floor(this.currentTime / 60);
    const secs = Math.floor(this.currentTime % 60);
    const durMins = Math.floor(this.duration / 60);
    const durSecs = Math.floor(this.duration % 60);

    this.currentTimeDisplay.textContent = `${mins}:${secs.toString().padStart(2, "0")}`;
    this.totalTimeDisplay.textContent = `${durMins}:${durSecs.toString().padStart(2, "0")}`;
    this.timelineSlider.value = this.currentTime;
  }

  updatePlaybackUI() {
    this.updateTimeDisplay();
  }

  updateUI() {
    this.updateTimeDisplay();
    this.updateSpeed(this.playbackSpeed);
    this.changeAnimation(this.selectedAnimation);
  }
}

document.addEventListener("DOMContentLoaded", () => {
  new ARModelViewer();
});

// --------------------- Cloudinary Upload + Model Viewer ------------------------

async function uploadModelToCloudinary(file) {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("upload_preset", CLOUDINARY_UPLOAD_PRESET);
  formData.append("resource_type", "raw");

  const response = await fetch(CLOUDINARY_UPLOAD_URL, {
    method: "POST",
    body: formData,
  });

  const result = await response.json();
  return result.secure_url;
}

function loadModel(url, filename, modelId) {
  const modelViewer = document.getElementById('modelViewer');

  modelViewer.src = ''; // reset
  modelViewer.src = url;

  modelViewer.dataset.modelId = modelId;
  modelViewer.dataset.filename = filename;

  setTimeout(() => {
    modelViewer.dismissPoster?.();
    modelViewer.jumpCameraToGoal?.();
  }, 100);
}





function onModelLoad(event) {
  const modelViewer = event?.target || document.getElementById("modelViewer");
  const filename = modelViewer.dataset.filename;
  const modelId = modelViewer.dataset.modelId;

  showLoading(false);
  showModelInfo(true);
  enableAR(true);
  generateQRCode(modelId);
  updateUrlHistory(modelId);
  showNotification(`${filename} loaded successfully!`);

  // Reveal the viewer
  modelViewer.style.display = "block";
  const placeholder = document.getElementById("viewerPlaceholder");
  if (placeholder) placeholder.style.display = "none";

  setTimeout(() => {
    modelViewer.dismissPoster?.();
    modelViewer.jumpCameraToGoal?.();

    // Autoplay animation if available
    const animations = modelViewer.availableAnimations;
    if (animations && animations.length > 0) {
      modelViewer.animationName = animations[0];
      modelViewer.play();
    }
  }, 300);
}

// --------------------- Utility & UI Helpers ------------------------

function generateQRCode(modelId) {
  const url = `${window.location.origin}${window.location.pathname}?model=${modelId}`;
  const qr = document.getElementById("qrContainer");
  qr.innerHTML = `<img src="https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent(url)}" />`;
  document.getElementById("shareUrl").value = url;
}

function updateUrlHistory(modelId) {
  const url = `${window.location.origin}${window.location.pathname}?model=${modelId}`;
  history.pushState({ modelId }, "", url);
}

function showNotification(msg, type = "success") {
  const el = document.getElementById("notification");
  el.textContent = msg;
  el.style.background = type === "error" ? "#ef4444" : "#10b981";
  el.style.display = "block";
  setTimeout(() => (el.style.display = "none"), 3000);
}

function showLoading(show) {
  document.getElementById("loadingOverlay").style.display = show ? "block" : "none";
}
function showModelInfo(show) {
  document.getElementById("modelInfo").style.display = show ? "block" : "none";
}
function enableAR(enable) {
  const btn = document.getElementById("launchARBtn") || document.getElementById("arBtn");
  if (btn) btn.disabled = !enable;
}
function formatFileSize(bytes) {
  const sizes = ["Bytes", "KB", "MB"];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(2)} ${sizes[i]}`;
}

function openAR() {
  const viewer = document.getElementById("modelViewer");
  if (viewer?.canActivateAR) {
    viewer.activateAR();
  } else {
    showNotification("AR not supported on this device", "error");
  }
}

function copyToClipboard() {
  const input = document.getElementById("shareUrl");
  if (!input.value) return;
  navigator.clipboard.writeText(input.value).then(() => {
    showNotification("Copied to clipboard");
  });
}

// --------------------- Gallery ------------------------

function updateGallery() {
  const grid = document.getElementById("galleryGrid");
  if (!grid) return;

  const entries = [];

  for (let key in localStorage) {
    if (key.startsWith("model_")) {
      try {
        const model = JSON.parse(localStorage.getItem(key));
        entries.push({ id: key.replace("model_", ""), ...model });
      } catch (err) {
        console.warn("Corrupt model in storage:", key);
      }
    }
  }

  if (entries.length === 0) {
    grid.innerHTML = `
      <div class="gallery-placeholder">
        <i class="fas fa-folder-open"></i>
        <p>No models uploaded yet</p>
      </div>`;
    return;
  }

  // Reverse order to show most recent first
  entries.sort((a, b) => new Date(b.uploadTime) - new Date(a.uploadTime));

  grid.innerHTML = entries
    .map(
      (model) => `
      <div class="gallery-item">
        <div class="gallery-info">
          <h4>${model.filename}</h4>
          <small>${model.fileSize} • ${new Date(model.uploadTime).toLocaleDateString()}</small>
        </div>
        <div class="gallery-actions">
          <button class="btn btn-small" onclick="loadModelFromGallery('${model.id}')">📂 Load</button>
          <button class="btn btn-small btn-outline" onclick="deleteModelFromGallery('${model.id}')">🗑️ Delete</button>
        </div>
      </div>`
    )
    .join("");
}


// --------------------- AR Support & Initialization ------------------------

function setupARSupport() {
  if ("xr" in navigator) {
    navigator.xr.isSessionSupported("immersive-ar").then((supported) => {
      console.log("WebXR AR support:", supported);
    });
  }
}

function checkUrlParameters() {
  const params = new URLSearchParams(window.location.search);
  const modelId = params.get("model");
  if (!modelId) return;

  const modelData = JSON.parse(localStorage.getItem(`model_${modelId}`));
  if (modelData) {
    loadModel(modelData.url, modelData.filename, modelId);
  }
}

function handleViewportChanges() {
  const vh = window.innerHeight * 0.01;
  document.documentElement.style.setProperty('--vh', `${vh}px`);
}

function preventDoubleTapZoom() {
  let last = 0;
  document.addEventListener("touchend", (e) => {
    const now = Date.now();
    if (now - last <= 300) e.preventDefault();
    last = now;
  });
}

// --------------------- Ripple Effect & Global Functions ------------------------

document.addEventListener("DOMContentLoaded", () => {
  document.querySelectorAll(".btn").forEach((btn) => {
    btn.addEventListener("click", function (e) {
      const ripple = document.createElement("span");
      const rect = this.getBoundingClientRect();
      const size = Math.max(rect.width, rect.height);
      ripple.style.width = ripple.style.height = size + "px";
      ripple.style.left = `${e.clientX - rect.left - size / 2}px`;
      ripple.style.top = `${e.clientY - rect.top - size / 2}px`;
      ripple.classList.add("ripple");
      this.appendChild(ripple);
      setTimeout(() => ripple.remove(), 600);
    });
  });

  const style = document.createElement("style");
  style.textContent = `
    .btn { position: relative; overflow: hidden; }
    .ripple {
      position: absolute;
      border-radius: 50%;
      background: rgba(255, 255, 255, 0.6);
      transform: scale(0);
      animation: ripple-animation 0.6s linear;
      pointer-events: none;
    }
    @keyframes ripple-animation {
      to { transform: scale(4); opacity: 0; }
    }
  `;
  document.head.appendChild(style);
});

function loadModelFromGallery(id) {
  const model = JSON.parse(localStorage.getItem(`model_${id}`));
  if (model) {
    currentModelUrl = model.url;
    loadModel(model.url, model.filename, id);
    showNotification("Model loaded");
  }
}

function deleteModelFromGallery(id) {
  localStorage.removeItem(`model_${id}`);
  updateGallery();
  showNotification("Model deleted");
}

// ✅ Expose globally for onclick=""



// Make functions accessible from inline HTML
window.openAR = openAR;
window.copyToClipboard = copyToClipboard;
window.loadModelFromGallery = loadModelFromGallery;
window.deleteModelFromGallery = deleteModelFromGallery;
window.openModal = () => {};
window.closeModal = () => {};
