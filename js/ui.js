/* ==========================================================================
   UI UTILITIES (SCROLL EFFECTS, COLORS, & MODULAR TOAST SYSTEMS)
   ========================================================================== */

let revealListenerAttached = false;

/* ----------- SETUP SCROLL REVEAL ----------- */
export function setupScrollEffects() {
  if (!revealListenerAttached) {
    window.addEventListener("scroll", revealElements);
    window.addEventListener("load", () => {
      revealElements();
      colorVerdictTagsNow();
    });
    revealListenerAttached = true;
  }
}

export function setupRevealNow() {
  revealElements();
}

/* ----------- REVEAL ANIMATION ----------- */
function revealElements() {
  const reveals = document.querySelectorAll(".reveal");
  const windowHeight = window.innerHeight;

  reveals.forEach((el) => {
    const elementTop = el.getBoundingClientRect().top;
    if (elementTop < windowHeight - 60) {
      el.classList.add("visible");
    }
  });
}

/* ----------- VERDICT TAG COLORS ----------- */
export function colorVerdictTagsNow() {
  const cards = document.querySelectorAll("#diaryList .anime-card");

  cards.forEach((card) => {
    const verdictEl = card.querySelector(".verdict-tag");
    if (!verdictEl) return;

    const t = verdictEl.textContent.toLowerCase();

    if (t.includes("skip")) {
      verdictEl.style.background = "linear-gradient(135deg, #f44336, #d32f2f)";
    } else if (t.includes("timepass")) {
      verdictEl.style.background = "linear-gradient(135deg, #ff9800, #f57c00)";
    } else if (t.includes("go for it")) {
      verdictEl.style.background = "linear-gradient(135deg, #4caf50, #2e7d32)";
    } else if (t.includes("perfection")) {
      verdictEl.style.background = "linear-gradient(135deg, #7e57c2, #512da8)";
    } else {
      verdictEl.style.background = "rgba(255,255,255,0.1)";
    }
  });
}

/* ----------- GLOBAL PRODUCTION TOAST ENGINE ----------- */
export function showToast(message, type = "info", duration = 4000) {
  let container = document.getElementById("toast-container");
  
  // Create container lazily if missing from the global active view DOM layout
  if (!container) {
    container = document.createElement("div");
    container.id = "toast-container";
    document.body.appendChild(container);
  }

  const toast = document.createElement("div");
  toast.className = `toast ${type}`;
  
  toast.innerHTML = `
    <span>${message}</span>
    <button class="toast-close">&times;</button>
  `;

  container.appendChild(toast);

  const autoDismissTimeout = setTimeout(() => {
    dismissToast(toast);
  }, duration);

  toast.querySelector(".toast-close").onclick = () => {
    clearTimeout(autoDismissTimeout);
    dismissToast(toast);
  };
}

function dismissToast(toast) {
  toast.style.animation = "toastFadeOut 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards";
  toast.addEventListener("animationend", () => {
    toast.remove();
  });
}