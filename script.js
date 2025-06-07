class ARModelViewer {
    constructor() {
      this.isPlaying = false
      this.currentTime = 0
      this.duration = 100
      this.playbackSpeed = 1
      this.selectedAnimation = "idle"
      this.leftPanelOpen = true
  
      this.initializeElements()
      this.bindEvents()
      this.updateUI()
    }
  
    initializeElements() {
      // Panel elements
      this.leftPanel = document.getElementById("leftPanel")
      this.toggleBtn = document.getElementById("toggleBtn")
      this.toggleIcon = document.getElementById("toggleIcon")
  
      // Upload elements
      this.uploadBtn = document.querySelector(".upload-btn")
      this.modelUpload = document.getElementById("modelUpload")
  
      // Control elements
      this.positionSlider = document.getElementById("positionSlider")
      this.rotationSlider = document.getElementById("rotationSlider")
      this.scaleSlider = document.getElementById("scaleSlider")
      this.environmentSelect = document.getElementById("environmentSelect")
  
      // Animation elements
      this.animationSelect = document.getElementById("animationSelect")
      this.playPauseBtn = document.getElementById("playPauseBtn")
      this.playIcon = document.getElementById("playIcon")
      this.skipBackBtn = document.getElementById("skipBackBtn")
      this.skipForwardBtn = document.getElementById("skipForwardBtn")
      this.repeatBtn = document.getElementById("repeatBtn")
      this.timelineSlider = document.getElementById("timelineSlider")
      this.currentTimeDisplay = document.getElementById("currentTime")
      this.totalTimeDisplay = document.getElementById("totalTime")
      this.speedSlider = document.getElementById("speedSlider")
      this.speedValue = document.getElementById("speedValue")
      this.speedButtons = document.querySelectorAll(".speed-btn")
  
      // Status elements
      this.playIndicator = document.getElementById("playIndicator")
      this.currentAnimation = document.getElementById("currentAnimation")
      this.playbackState = document.getElementById("playbackState")
      this.currentSpeed = document.getElementById("currentSpeed")
      this.launchARBtn = document.getElementById("launchARBtn")
    }
  
    bindEvents() {
      // Panel toggle
      this.toggleBtn.addEventListener("click", () => this.toggleLeftPanel())
  
      // Upload
      this.uploadBtn.addEventListener("click", () => this.modelUpload.click())
      this.modelUpload.addEventListener("change", (e) => this.handleFileUpload(e))
  
      // Animation controls
      this.playPauseBtn.addEventListener("click", () => this.togglePlayback())
      this.skipBackBtn.addEventListener("click", () => this.skipToStart())
      this.skipForwardBtn.addEventListener("click", () => this.skipToEnd())
      this.timelineSlider.addEventListener("input", (e) => this.updateCurrentTime(e.target.value))
      this.speedSlider.addEventListener("input", (e) => this.updateSpeed(e.target.value))
      this.animationSelect.addEventListener("change", (e) => this.changeAnimation(e.target.value))
  
      // Speed buttons
      this.speedButtons.forEach((btn) => {
        btn.addEventListener("click", (e) => {
          const speed = Number.parseFloat(e.target.dataset.speed)
          this.updateSpeed(speed)
        })
      })
  
      // 3D controls
      this.positionSlider.addEventListener("input", (e) => this.updatePosition(e.target.value))
      this.rotationSlider.addEventListener("input", (e) => this.updateRotation(e.target.value))
      this.scaleSlider.addEventListener("input", (e) => this.updateScale(e.target.value))
      this.environmentSelect.addEventListener("change", (e) => this.updateEnvironment(e.target.value))
    }
  
    toggleLeftPanel() {
      this.leftPanelOpen = !this.leftPanelOpen
  
      if (this.leftPanelOpen) {
        this.leftPanel.classList.remove("collapsed")
        this.toggleBtn.classList.remove("collapsed")
        this.toggleIcon.className = "fas fa-chevron-left"
      } else {
        this.leftPanel.classList.add("collapsed")
        this.toggleBtn.classList.add("collapsed")
        this.toggleIcon.className = "fas fa-chevron-right"
      }
    }
  
    handleFileUpload(event) {
      const file = event.target.files[0]
      if (file) {
        console.log("File uploaded:", file.name)
        // Here you would handle the actual file upload
        // For demo purposes, we'll just enable the AR button
        this.launchARBtn.disabled = false
      }
    }
  
    togglePlayback() {
      this.isPlaying = !this.isPlaying
      this.updatePlaybackUI()
  
      if (this.isPlaying) {
        this.startAnimation()
      } else {
        this.pauseAnimation()
      }
    }
  
    startAnimation() {
      this.playIcon.className = "fas fa-pause"
      this.playIndicator.style.display = "flex"
      this.playbackState.textContent = "Playing"
      this.playbackState.style.color = "#10b981"
  
      // Simulate animation progress
      this.animationInterval = setInterval(() => {
        if (this.currentTime < this.duration) {
          this.currentTime += this.playbackSpeed
          this.updateTimeDisplay()
        } else {
          this.currentTime = 0 // Loop animation
        }
      }, 100)
    }
  
    pauseAnimation() {
      this.playIcon.className = "fas fa-play"
      this.playIndicator.style.display = "none"
      this.playbackState.textContent = "Paused"
      this.playbackState.style.color = "#f59e0b"
  
      if (this.animationInterval) {
        clearInterval(this.animationInterval)
      }
    }
  
    skipToStart() {
      this.currentTime = 0
      this.updateTimeDisplay()
    }
  
    skipToEnd() {
      this.currentTime = this.duration
      this.updateTimeDisplay()
    }
  
    updateCurrentTime(time) {
      this.currentTime = Number.parseInt(time)
      this.updateTimeDisplay()
    }
  
    updateSpeed(speed) {
      this.playbackSpeed = Number.parseFloat(speed)
      this.speedSlider.value = speed
      this.speedValue.textContent = speed
      this.currentSpeed.textContent = speed + "x"
  
      // Update speed button states
      this.speedButtons.forEach((btn) => {
        if (Number.parseFloat(btn.dataset.speed) === this.playbackSpeed) {
          btn.classList.remove("btn-outline")
          btn.classList.add("btn-primary", "active")
        } else {
          btn.classList.remove("btn-primary", "active")
          btn.classList.add("btn-outline")
        }
      })
    }
  
    changeAnimation(animation) {
      this.selectedAnimation = animation
      this.currentAnimation.textContent = animation.charAt(0).toUpperCase() + animation.slice(1)
      console.log("Animation changed to:", animation)
    }
  
    updatePosition(value) {
      console.log("Position updated:", value)
    }
  
    updateRotation(value) {
      console.log("Rotation updated:", value)
    }
  
    updateScale(value) {
      console.log("Scale updated:", value)
    }
  
    updateEnvironment(environment) {
      console.log("Environment changed to:", environment)
    }
  
    updateTimeDisplay() {
      const currentMinutes = Math.floor(this.currentTime / 60)
      const currentSeconds = Math.floor(this.currentTime % 60)
      const totalMinutes = Math.floor(this.duration / 60)
      const totalSeconds = Math.floor(this.duration % 60)
  
      this.currentTimeDisplay.textContent = `${currentMinutes}:${currentSeconds.toString().padStart(2, "0")}`
      this.totalTimeDisplay.textContent = `${totalMinutes}:${totalSeconds.toString().padStart(2, "0")}`
      this.timelineSlider.value = this.currentTime
    }
  
    updatePlaybackUI() {
      this.updateTimeDisplay()
    }
  
    updateUI() {
      this.updateTimeDisplay()
      this.updateSpeed(this.playbackSpeed)
      this.changeAnimation(this.selectedAnimation)
    }
  }
  
  // Initialize the application when the DOM is loaded
  document.addEventListener("DOMContentLoaded", () => {
    new ARModelViewer()
  })
  
  // Add some additional interactive features
  document.addEventListener("DOMContentLoaded", () => {
    // Add hover effects to cards
    const cards = document.querySelectorAll(".card")
    cards.forEach((card) => {
      card.addEventListener("mouseenter", () => {
        card.style.transform = "translateY(-2px)"
        card.style.boxShadow = "0 4px 12px rgba(0, 0, 0, 0.15)"
      })
  
      card.addEventListener("mouseleave", () => {
        card.style.transform = "translateY(0)"
        card.style.boxShadow = "0 1px 3px rgba(0, 0, 0, 0.1)"
      })
    })
  
    // Add ripple effect to buttons
    const buttons = document.querySelectorAll(".btn")
    buttons.forEach((button) => {
      button.addEventListener("click", function (e) {
        const ripple = document.createElement("span")
        const rect = this.getBoundingClientRect()
        const size = Math.max(rect.width, rect.height)
        const x = e.clientX - rect.left - size / 2
        const y = e.clientY - rect.top - size / 2
  
        ripple.style.width = ripple.style.height = size + "px"
        ripple.style.left = x + "px"
        ripple.style.top = y + "px"
        ripple.classList.add("ripple")
  
        this.appendChild(ripple)
  
        setTimeout(() => {
          ripple.remove()
        }, 600)
      })
    })
  })
  
  // Add CSS for ripple effect
  const style = document.createElement("style")
  style.textContent = `
      .btn {
          position: relative;
          overflow: hidden;
      }
      
      .ripple {
          position: absolute;
          border-radius: 50%;
          background: rgba(255, 255, 255, 0.6);
          transform: scale(0);
          animation: ripple-animation 0.6s linear;
          pointer-events: none;
      }
      
      @keyframes ripple-animation {
          to {
              transform: scale(4);
              opacity: 0;
          }
      }
  `
  document.head.appendChild(style)
  