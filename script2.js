// Global Variables
let currentModelUrl = null;
let models = new Map(); // Store uploaded models

const CLOUDINARY_CLOUD_NAME = 'dwocdg3m9';
const CLOUDINARY_UPLOAD_PRESET = '3D_TO_AR';
const CLOUDINARY_UPLOAD_URL = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/upload`;

// Initialize the application
document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
});

// Application Initialization
function initializeApp() {
    onModelLoad();
    setupEventListeners();
    handleViewportChanges();
    checkUrlParameters();
    setupARSupport();
    preventDoubleTapZoom();
    updateGallery();
}
function generateQRCode(modelId) {
    const shareUrl = `${window.location.origin}${window.location.pathname}?model=${modelId}`;
    const qrContainer = document.getElementById('qrContainer');
    qrContainer.innerHTML = '';
  
    try {
      const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(shareUrl)}`;
  
      qrContainer.innerHTML = `
        <img src="${qrImageUrl}" alt="QR Code" style="max-width: 100%; height: auto; border-radius: 8px;" />
      `;
  
      document.getElementById('shareUrl').value = shareUrl;
      showNotification('QR code generated! Share this link to view the model on any device.');
    } catch (error) {
      console.error('QR Code generation error:', error);
      qrContainer.innerHTML = '<div class="qr-placeholder">QR Code generation failed</div>';
    }
  }

function updateUrlHistory(modelId) {
    const newUrl = `${window.location.origin}${window.location.pathname}?model=${modelId}`;
    window.history.pushState({ modelId }, '', newUrl);

}
  
  
function onModelLoad(event) {
    const modelViewer = event?.target || document.getElementById('modelViewer');
    const filename = modelViewer.dataset.filename || 'your model';
    const modelId = modelViewer.dataset.modelId || '';
  
    showLoading(false);
    showModelInfo(true);
    enableAR(true);
    generateQRCode(modelId);
    updateUrlHistory(modelId);
    showNotification(`${filename} loaded successfully!`);
  
    setTimeout(() => {
      modelViewer.dismissPoster?.();
      modelViewer.jumpCameraToGoal?.();
    }, 500);
  
    logModelStats(modelViewer);
    updateGallery();
  }

  function onModelError(error) {
    showLoading(false);
    showNotification('Error loading model. Please try another file.', 'error');
    console.error('Model loading error:', error);
    enableAR(false);
  }
  
  
// Event Listeners Setup
function setupEventListeners() {
    document.getElementById('fileInput').addEventListener('change', handleFileUpload);

    window.addEventListener('resize', handleViewportChange);
    window.addEventListener('orientationchange', handleViewportChange);

    const modelViewer = document.getElementById('modelViewer');
    modelViewer.addEventListener('load', onModelLoad);
    modelViewer.addEventListener('error', onModelError);
}

// File Upload Handler
async function handleFileUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    if (!isValidModelFile(file)) {
        showNotification('Please upload a .GLB or .GLTF file', 'error');
        return;
    }

    if (file.size > 100 * 1024 * 1024) {
        showNotification('Large file detected. Upload may take a while...', 'warning');
    }

    showLoading(true);

    try {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);
        formData.append('resource_type', 'raw');
        formData.append('public_id', `3d_models/${Date.now()}_${file.name.replace(/\.[^/.]+$/, "")}`);

        const response = await fetch(CLOUDINARY_UPLOAD_URL, {
            method: 'POST',
            body: formData
        });

        if (!response.ok) throw new Error(`Upload failed: ${response.status} ${response.statusText}`);
        const result = await response.json();

        const cloudinaryTimestamp = result.public_id.split('/')[1].split('_')[0];
        const originalFilename = result.public_id.split('/')[1].split('_').slice(1).join('_');
        const modelId = `model_${cloudinaryTimestamp}_${originalFilename}`;

        const modelData = {
            url: result.secure_url,
            cloudinaryId: result.public_id,
            filename: file.name,
            uploadTime: new Date().toISOString(),
            fileSize: formatFileSize(file.size),
            originalSize: file.size,
            cloudinaryVersion: result.version,
            originalFilename: file.name.replace(/\.[^/.]+$/, "")
        };

        try {
            localStorage.setItem(`model_${modelId}`, JSON.stringify(modelData));
        } catch (storageError) {
            console.warn('Could not save to localStorage:', storageError);
        }

        models.set(modelId, modelData);
        currentModelUrl = result.secure_url;

        loadModel(result.secure_url, file.name, modelId);
        showNotification(`${file.name} uploaded successfully! (${formatFileSize(file.size)})`);
        updateGallery();
    } catch (error) {
        console.error('Upload error:', error);
        showLoading(false);
        if (error.message.includes('413')) {
            showNotification('File too large. Try a smaller model.', 'error');
        } else if (error.message.includes('network')) {
            showNotification('Network error. Check your connection and try again.', 'error');
        } else {
            showNotification('Upload failed. Please try again.', 'error');
        }
    }
}

// File Validation
function isValidModelFile(file) {
    const validExtensions = ['.glb', '.gltf'];
    return validExtensions.some(ext => file.name.toLowerCase().endsWith(ext));
}

// Load 3D Model
function loadModel(url, filename, modelId) {
    const modelViewer = document.getElementById('modelViewer');
    modelViewer.src = '';
    modelViewer.src = url;
    modelViewer.dataset.modelId = modelId;
    modelViewer.dataset.filename = filename;
    setTimeout(() => {
        modelViewer.dismissPoster();
        modelViewer.jumpCameraToGoal();
    }, 100);
}
// Copy to Clipboard Function
function copyToClipboard() {
    const shareUrl = document.getElementById('shareUrl');
    shareUrl.focus();
  
    if (!shareUrl.value) {
      showNotification('No URL to copy. Please upload a model first.', 'error');
      return;
    }
  
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(shareUrl.value).then(() => {
        showNotification('Link copied to clipboard!');
      }).catch(() => {
        fallbackCopyTextToClipboard(shareUrl.value);
      });
    } else {
      fallbackCopyTextToClipboard(shareUrl.value);
    }
  }
  
  function fallbackCopyTextToClipboard(text) {
    const shareUrl = document.getElementById('shareUrl');
    shareUrl.select();
    shareUrl.setSelectionRange(0, 99999);
    try {
      document.execCommand('copy');
      showNotification('Link copied to clipboard!');
    } catch (err) {
      console.error('Copy failed:', err);
      showNotification('Copy failed. Please copy manually.', 'error');
    }
  }
  
  // AR Functionality
  function openAR() {
    const modelViewer = document.getElementById('modelViewer');
  
    if (!modelViewer || !currentModelUrl) {
      showNotification('Please upload a model first', 'error');
      return;
    }
  
    if (modelViewer.canActivateAR) {
      try {
        modelViewer.activateAR();
        showNotification('Launching AR experience...');
      } catch (error) {
        console.error('AR activation error:', error);
        showNotification('Failed to launch AR. Please try again.', 'error');
      }
    } else {
      showNotification('AR not supported on this device/browser', 'error');
      console.log('AR Support Info:', {
        hasWebXR: 'xr' in navigator,
        isSecureContext: window.isSecureContext,
        userAgent: navigator.userAgent
      });
    }
  }
  
  // Notification
  function showNotification(message, type = 'success') {
    const notification = document.getElementById('notification');
    notification.textContent = message;
    const colors = {
      success: 'linear-gradient(45deg, #4ecdc4, #44a08d)',
      error: 'linear-gradient(45deg, #ff6b6b, #ff8e8e)',
      warning: 'linear-gradient(45deg, #ffd93d, #ff6b6b)',
      info: 'linear-gradient(45deg, #667eea, #764ba2)'
    };
    notification.style.background = colors[type] || colors.success;
    notification.classList.add('show');
    setTimeout(() => {
      notification.classList.remove('show');
    }, 3000);
  }
  
  // Loading Overlay
  function showLoading(show) {
    const overlay = document.getElementById('loadingOverlay');
    overlay.style.display = show ? 'block' : 'none';
  }
  
  function showModelInfo(show) {
    const info = document.getElementById('modelInfo');
    info.style.display = show ? 'block' : 'none';
  }
  
  function enableAR(enable) {
    const arBtn = document.getElementById('arBtn');
    if (arBtn) {
      arBtn.classList.toggle('active', enable);
    }
  }
  
  // Handle ?model= query
  async function checkUrlParameters() {
    const urlParams = new URLSearchParams(window.location.search);
    const modelId = urlParams.get('model');
    if (!modelId) return;
  
    showLoading(true);
    const storedData = localStorage.getItem(`model_${modelId}`);
    if (storedData) {
      const modelData = JSON.parse(storedData);
      if (modelData?.url?.includes('cloudinary.com')) {
        const valid = await testModelUrl(modelData.url);
        if (valid.success) {
          models.set(modelId, modelData);
          currentModelUrl = modelData.url;
          showNotification(`Loading shared model: ${modelData.filename}...`);
          loadModel(modelData.url, modelData.filename, modelId);
          return;
        }
      }
    }
  
    // fallback cloudinary URL generation
    if (modelId.includes('model_')) {
      const parts = modelId.split('_');
      const timestamp = parts[1];
      const filename = parts.slice(2).join('_');
      const baseUrl = `https://res.cloudinary.com/${CLOUDINARY_CLOUD_NAME}/image/upload`;
      const testUrls = [
        `${baseUrl}/3d_models/${timestamp}_${filename}.glb`,
        `${baseUrl}/3d_models/${timestamp}_${filename}.gltf`
      ];
      for (const testUrl of testUrls) {
        const valid = await testModelUrl(testUrl);
        if (valid.success) {
          const modelData = {
            url: testUrl,
            filename,
            uploadTime: new Date(parseInt(timestamp)).toISOString(),
            fileSize: 'Unknown',
            originalSize: 0
          };
          localStorage.setItem(`model_${modelId}`, JSON.stringify(modelData));
          models.set(modelId, modelData);
          currentModelUrl = testUrl;
          showNotification('Loading shared 3D model...');
          loadModel(testUrl, filename, modelId);
          return;
        }
      }
    }
  
    showLoading(false);
    showNotification('Model not found or expired.', 'error');
  }
  function handleViewportChange() {
    const vh = window.innerHeight * 0.01;
    document.documentElement.style.setProperty('--vh', `${vh}px`);
  }
  
  function handleViewportChanges() {
    handleViewportChange();
    let resizeTimeout;
    window.addEventListener('resize', () => {
      clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(handleViewportChange, 100);
    });
  }
  
  // Format file size utility
  function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
  
  function logModelStats(modelViewer) {
    console.log('Model loaded:', {
      src: modelViewer.src,
      hasAR: modelViewer.canActivateAR,
      timestamp: new Date().toISOString()
    });
  }
  
  function cleanup() {
    models.forEach((model) => {
      if (model.url.startsWith('blob:')) {
        URL.revokeObjectURL(model.url);
      }
    });
    models.clear();
  }
  
  // Modal functionality
  function openModal(type) {
    const overlay = document.getElementById('modalOverlay');
    const privacy = document.getElementById('privacyModal');
    const terms = document.getElementById('termsModal');
  
    privacy.style.display = 'none';
    terms.style.display = 'none';
  
    if (type === 'privacy') privacy.style.display = 'block';
    if (type === 'terms') terms.style.display = 'block';
  
    overlay.classList.add('show');
    document.body.style.overflow = 'hidden';
  }
  function closeModal() {
    document.getElementById('modalOverlay').classList.remove('show');
    document.body.style.overflow = 'auto';
  }
  document.getElementById('modalOverlay').addEventListener('click', function(e) {
    if (e.target === this) closeModal();
  });
  document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') closeModal();
  });
  
  // Gallery
  function updateGallery() {
    const galleryGrid = document.getElementById('galleryGrid');
    const allModels = new Map();
  
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key.startsWith('model_')) {
        try {
          const modelData = JSON.parse(localStorage.getItem(key));
          const modelId = key.replace('model_', '');
          allModels.set(modelId, modelData);
        } catch (e) {
          console.warn('Invalid localStorage model:', key);
        }
      }
    }
  
    models.forEach((modelData, modelId) => {
      allModels.set(modelId, modelData);
    });
  
    if (allModels.size === 0) {
      galleryGrid.innerHTML = `
        <div class="gallery-placeholder">
          <div class="placeholder-icon">📁</div>
          <p>No models uploaded yet</p>
        </div>
      `;
      return;
    }
  
    galleryGrid.innerHTML = '';
    const sorted = Array.from(allModels.entries()).sort((a, b) => {
      return new Date(b[1].uploadTime) - new Date(a[1].uploadTime);
    });
  
    sorted.forEach(([modelId, modelData]) => {
      const item = document.createElement('div');
      item.className = 'gallery-item';
      item.dataset.modelId = modelId;
  
      const uploadDate = new Date(modelData.uploadTime).toLocaleDateString();
      const isCurrent = currentModelUrl === modelData.url;
  
      item.innerHTML = `
        <div class="gallery-item-header">
          <div class="gallery-item-info">
            <h4>${modelData.filename}</h4>
            <div class="file-meta">${modelData.fileSize} • ${uploadDate}</div>
          </div>
        </div>
        <div class="gallery-item-preview">🎲</div>
        <div class="gallery-item-actions">
          <button class="gallery-btn load-btn" onclick="loadModelFromGallery('${modelId}')" ${isCurrent ? 'disabled' : ''}>
            ${isCurrent ? '✓ Loaded' : '📂 Load'}
          </button>
          <button class="gallery-btn delete-btn" onclick="deleteModelFromGallery('${modelId}')">🗑️ Delete</button>
        </div>
      `;
  
      galleryGrid.appendChild(item);
    });
  }
  
  async function loadModelFromGallery(modelId) {
    const modelData = models.get(modelId) || JSON.parse(localStorage.getItem(`model_${modelId}`));
    if (!modelData) return showNotification('Model not found', 'error');
  
    showLoading(true);
    const urlTest = await testModelUrl(modelData.url);
    if (urlTest.success) {
      currentModelUrl = modelData.url;
      loadModel(modelData.url, modelData.filename, modelId);
      updateGallery();
    } else {
      showNotification('Model file not accessible', 'error');
    }
  }
  
  async function deleteModelFromGallery(modelId) {
    if (!confirm('Are you sure you want to delete this model?')) return;
    const modelData = models.get(modelId) || JSON.parse(localStorage.getItem(`model_${modelId}`));
  
    if (modelData) {
      localStorage.removeItem(`model_${modelId}`);
      models.delete(modelId);
      if (currentModelUrl === modelData.url) {
        document.getElementById('modelViewer').src = '';
        currentModelUrl = null;
        enableAR(false);
        showModelInfo(false);
        document.getElementById('qrContainer').innerHTML = `
          <div class="qr-placeholder">
            <div class="placeholder-icon">📱</div>
            <p>Upload a model to generate QR code</p>
          </div>
        `;
        document.getElementById('shareUrl').value = '';
      }
      updateGallery();
      showNotification(`${modelData.filename} deleted`);
    }
  }
  function setupARSupport() {
    if ('xr' in navigator) {
      navigator.xr.isSessionSupported('immersive-ar').then((supported) => {
        if (supported) {
          console.log('✅ WebXR AR is supported');
        } else {
          console.log('❌ WebXR AR not supported, fallback to SceneViewer/QuickLook');
        }
      }).catch((err) => {
        console.warn('WebXR AR check failed:', err);
      });
    } else {
      console.log('❌ XR not available in navigator');
    }
  }
  
  
  // Global error fallback
  window.addEventListener('beforeunload', cleanup);
  window.addEventListener('error', function(event) {
    console.error('Global error:', event.error);
    showNotification('An unexpected error occurred', 'error');
  });
  
  // Debug
  if (window.location.search.includes('debug=true')) {
    window.appDebug = {
      models,
      currentModelUrl,
      loadModel,
      generateQRCode,
      showNotification
    };
    console.log('Debug mode enabled');
  }
    