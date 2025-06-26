// Add padding function to Number prototype
Number.prototype.pad = function (n, str) {
  return Array(n - String(this).length + 1).join(str || "0") + this;
};

// Add padding function to String prototype
String.prototype.pad = function (n, str) {
  return Array(n - String(this).length + 1).join(str || "0") + this;
};

let showRGB = false;
let isPlaying = false;
let currentInterval = 1; // Default to 1 second
let audioContext = null;
let audioBuffer = null;
let audioSource = null;
let backgroundAudio = null;
let lastAnnouncementTime = 0;
let isMuted = false;
let announceInterval = 5; // Default to 5 minutes
let lastAnnouncedMinute = null;

// Initialize audio context
async function initAudio() {
  try {
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const response = await fetch("beats.webm");
    const arrayBuffer = await response.arrayBuffer();
    audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
  } catch (error) {
    console.error("Error initializing audio:", error);
  }
}

// Play beep sound
function playBeep() {
  if (!audioContext || !audioBuffer || isMuted) return;

  try {
    const source = audioContext.createBufferSource();
    const gainNode = audioContext.createGain();

    source.buffer = audioBuffer;
    source.connect(gainNode);
    gainNode.connect(audioContext.destination);

    // Set volume to 20% of the background music volume
    const volume = Math.min(
      0.2,
      backgroundAudio ? backgroundAudio.volume * 0.2 : 0.2
    );
    gainNode.gain.value = volume;

    source.start(0);
  } catch (error) {
    console.error("Error playing beep:", error);
  }
}

// Update time and colors
function updateTime() {
  const now = new Date();
  const hours = now.getHours();
  const minutes = now.getMinutes();
  const seconds = now.getSeconds();

  // Calculate RGB values using the reference implementation's scaling
  const red = Math.round((255 / 23) * hours);
  const green = Math.round((255 / 59) * minutes);
  const blue = Math.round((255 / 59) * seconds);

  // Update clock display
  document.getElementById("hours").textContent = hours.pad(2);
  document.getElementById("minutes").textContent = minutes.pad(2);
  document.getElementById("seconds").textContent = seconds.pad(2);

  // Update date display
  document.getElementById("date").textContent = formatDate(now);

  // Update hex code display
  const hexCode =
    "#" +
    red.toString(16).pad(2) +
    green.toString(16).pad(2) +
    blue.toString(16).pad(2);
  const rgbCode = `rgb(${red},${green},${blue})`;
  document.getElementById("hexCode").textContent = showRGB ? rgbCode : hexCode;

  // Update background color
  document.body.style.backgroundColor = rgbCode;

  // Add/remove light class based on brightness
  if (red > 200 && green > 200 && blue > 200) {
    document.querySelector(".clock").classList.add("light");
  } else {
    document.querySelector(".clock").classList.remove("light");
  }

  // Announce time at exact multiples of the interval (e.g., 2:05, 2:10, ...)
  if (
    minutes % announceInterval === 0 &&
    seconds === 0 &&
    lastAnnouncedMinute !== minutes
  ) {
    announceTime(hours, minutes);
    lastAnnouncedMinute = minutes;
  }

  // Play beep sound at the specified interval
  if (
    isPlaying &&
    seconds % currentInterval === 0 &&
    seconds !== lastAnnouncementTime
  ) {
    playBeep();
    lastAnnouncementTime = seconds;
  }
}

// Format date in a nice readable format
function formatDate(date) {
  const options = {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  };
  return date.toLocaleDateString("en-US", options);
}

// Toggle between RGB and HEX display
function toggleDisplay() {
  showRGB = !showRGB;
  updateTime();
}

// Initialize background audio
function initBackgroundAudio() {
  backgroundAudio = new Audio("beats.webm");
  backgroundAudio.loop = true;
  backgroundAudio.volume = 0.02; // Start at 2% volume
}

// Attempt to start background audio
async function attemptAutoplay() {
  if (!backgroundAudio) return;

  try {
    // Try to play with user interaction
    const playPromise = backgroundAudio.play();

    if (playPromise !== undefined) {
      playPromise
        .then(() => {
          console.log("Autoplay started successfully");
        })
        .catch((error) => {
          console.log("Autoplay prevented:", error);
          // If autoplay fails, we'll wait for user interaction
        });
    }
  } catch (error) {
    console.error("Error attempting autoplay:", error);
  }
}

function updateToggleFormat() {
  if (showRGB) {
    rgbToggle.classList.add("active");
    hexToggle.classList.remove("active");
  } else {
    rgbToggle.classList.remove("active");
    hexToggle.classList.add("active");
  }
}

function announceTime(hours, minutes) {
  const timeString = `${hours.toString().padStart(2, "0")}:${minutes
    .toString()
    .padStart(2, "0")}`;
  const utterance = new SpeechSynthesisUtterance(`The time is ${timeString}`);
  utterance.volume = 0.5; // 50% volume, not affected by volume knob
  speechSynthesis.speak(utterance);
}

// Initialize everything
async function initialize() {
  initBackgroundAudio();
  attemptAutoplay();
  updateToggleFormat();
  updateTime();
  setInterval(updateTime, 1000);
  await initAudio();
}

// Event Listeners
document.addEventListener("DOMContentLoaded", initialize);

document.getElementById("togglePlay").addEventListener("click", function () {
  isPlaying = !isPlaying;
  this.classList.toggle("playing");
  this.classList.toggle("paused");
  if (isPlaying) {
    playBeep();
  }
});

document.getElementById("toggleMute").addEventListener("click", function () {
  isMuted = !isMuted;
  this.classList.toggle("muted");
  if (backgroundAudio) {
    backgroundAudio.muted = isMuted;
  }
});

document.getElementById("volumeSlider").addEventListener("input", function (e) {
  const volume = parseFloat(e.target.value);
  if (backgroundAudio) {
    backgroundAudio.volume = volume;
  }
});

document
  .getElementById("intervalSelect")
  .addEventListener("change", function (e) {
    announceInterval = parseInt(e.target.value);
    lastAnnouncedMinute = null; // Reset so it announces at the next interval
  });

// Add event listeners for the new toggle-format
const rgbToggle = document.getElementById("rgbToggle");
const hexToggle = document.getElementById("hexToggle");
const toggleFormat = document.getElementById("toggleFormat");

rgbToggle.addEventListener("click", function () {
  showRGB = true;
  updateTime();
  updateToggleFormat();
});

hexToggle.addEventListener("click", function () {
  showRGB = false;
  updateTime();
  updateToggleFormat();
});
