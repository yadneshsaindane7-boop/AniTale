import { auth, db, googleProvider, signInWithPopup, signOut } from "./firebaseConfig.js";
import { showToast } from "./ui.js";
import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  onAuthStateChanged 
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-auth.js";
import { 
  doc, 
  setDoc, 
  getDoc 
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";

// 1. DYNAMIC NAVBAR USER AVATAR & DROPDOWN ENGINE
export function initAuthLink() {
  const container = document.getElementById("navAuthContainer");
  if (!container) return;

  onAuthStateChanged(auth, async (user) => {
    container.innerHTML = ""; // Clear wrapper to prevent duplicate rendering

    if (user) {
      let displayName = "User";
      try {
        const userDoc = await getDoc(doc(db, "users", user.uid));
        if (userDoc.exists() && userDoc.data().name) {
          displayName = userDoc.data().name;
        } else if (user.displayName) {
          displayName = user.displayName;
        }
      } catch (err) {
        console.error("Error reading profile node context:", err);
      }

      const initialChar = displayName.charAt(0).toUpperCase();

      container.innerHTML = `
        <div class="user-profile-chip" id="profileChipBtn" style="display: flex; align-items: center; gap: 8px; cursor: pointer; background: rgba(255,255,255,0.04); border: 1px solid var(--border-color); padding: 6px 12px; border-radius: 20px; transition: background 0.2s ease; position: relative;">
          <div class="user-avatar-icon" style="width: 24px; height: 24px; background: var(--accent-primary); border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 11px; font-weight: 700; color: #fff;">${initialChar}</div>
          <span style="font-size: 13px; font-weight: 500; color: var(--text-main); max-width: 100px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${displayName}</span>
        </div>
        <div class="user-profile-dropdown select-hide" id="profileMenuDropdown" style="position: absolute; top: 60px; right: 6%; background: var(--bg-surface-elevated); border: 1px solid var(--border-color-hover); border-radius: 12px; padding: 12px; min-width: 180px; box-shadow: 0 10px 25px rgba(0,0,0,0.5); z-index: 1000;">
          <div class="dropdown-user-info" style="font-size: 12px; color: var(--text-muted); margin-bottom: 8px; border-bottom: 1px solid var(--border-color); padding-bottom: 6px;">Logged in as ${displayName}</div>
          <button class="profile-dropdown-item" id="logoutDropdownBtn" style="width: 100%; background: transparent; border: none; text-align: left; font-size: 13px; font-weight: 600; cursor: pointer; color: #ff8a80; padding: 6px 0;">Logout</button>
        </div>
      `;

      const chipBtn = document.getElementById("profileChipBtn");
      const dropdownMenu = document.getElementById("profileMenuDropdown");

      if (chipBtn && dropdownMenu) {
        chipBtn.onclick = (e) => {
          e.stopPropagation();
          dropdownMenu.classList.toggle("select-hide");
        };
        document.addEventListener("click", (e) => {
          if (!container.contains(e.target)) dropdownMenu.classList.add("select-hide");
        });
      }

      document.getElementById("logoutDropdownBtn")?.addEventListener("click", async (e) => {
        e.preventDefault();
        try {
          await signOut(auth);
          showToast("Signed out successfully.", "info");
          setTimeout(() => { window.location.href = "auth.html"; }, 500);
        } catch (err) {
          console.error(err);
        }
      });
    } else {
      container.innerHTML = `<a href="auth.html" id="authLink" style="text-decoration: none; font-size: 13px; font-weight: 600; color: var(--accent-primary); background: rgba(139, 92, 246, 0.1); border: 1px solid rgba(139, 92, 246, 0.2); padding: 8px 16px; border-radius: 10px; transition: all 0.2s ease;">Sign In / Register</a>`;
    }
  });
}

// 2. SIGNUP LOCALSTORAGE DATA SYNCHRONIZATION 
export async function syncPendingProfile() {
  const pending = localStorage.getItem("pendingProfile");
  if (!pending) return;

  onAuthStateChanged(auth, async (user) => {
    if (!user) return;
    const data = JSON.parse(pending);
    try {
      await setDoc(doc(db, "users", user.uid), {
        name: data.name,
        username: data.username,
        birthdate: data.birthdate,
        gender: data.gender,
        email: data.email,
        createdAt: new Date().toISOString()
      });
      localStorage.removeItem("pendingProfile");
    } catch (err) {
      console.error(err);
    }
  });
}

// 3. CORE AUTHENTICATION SCREEN INTERACTION CONTROLLER
export function initAuthPage() {
  const loginForm = document.getElementById("loginForm");
  const signupForm = document.getElementById("signupForm");
  const showLogin = document.getElementById("showLogin");
  const showSignup = document.getElementById("showSignup");

  if (!loginForm || !signupForm || !showLogin || !showSignup) return;

  showLogin.onclick = (e) => {
    e.preventDefault();
    loginForm.style.display = "flex";
    signupForm.style.display = "none";
    showLogin.classList.add("active");
    showSignup.classList.remove("active");
  };

  showSignup.onclick = (e) => {
    e.preventDefault();
    signupForm.style.display = "flex";
    loginForm.style.display = "none";
    showSignup.classList.add("active");
    showLogin.classList.remove("active");
  };

  // EMAIL AND PASSWORD SIGN IN LISTENER
  document.getElementById("loginBtn")?.addEventListener("click", async (e) => {
    e.preventDefault();
    const email = document.getElementById("loginEmail").value.trim();
    const password = document.getElementById("loginPassword").value.trim();

    if (!email || !password) {
      showToast("Please enter your email and password.", "error");
      return;
    }

    try {
      await signInWithEmailAndPassword(auth, email, password);
      showToast("Welcome back to AniTale!", "success");
      setTimeout(() => { window.location.href = "index.html"; }, 1000);
    } catch (error) {
      showToast(error.message, "error");
    }
  });

  // GOOGLE OAUTH POPUP LISTENER
  const googleButtons = document.querySelectorAll(".googleLoginBtn");
  googleButtons.forEach((btn) => {
    btn.addEventListener("click", async (e) => {
      e.preventDefault();
      try {
        const result = await signInWithPopup(auth, googleProvider);
        const user = result.user;

        const userRef = doc(db, "users", user.uid);
        const userSnap = await getDoc(userRef);

        if (!userSnap.exists()) {
          promptGoogleProfileCompletion(user, userRef);
        } else {
          showToast("Welcome back to AniTale!", "success");
          setTimeout(() => { window.location.href = "index.html"; }, 1000);
        }
      } catch (error) {
        console.error(error);
        showToast("Google authorization rejected.", "error");
      }
    });
  });

  // EMAIL AND PASSWORD SIGN UP REGISTRATION LISTENER
  document.getElementById("signupBtn")?.addEventListener("click", async (e) => {
    e.preventDefault();
    const name = document.getElementById("signupName").value.trim();
    const username = document.getElementById("signupUsername").value.trim();
    const email = document.getElementById("signupEmail").value.trim();
    const birthdate = document.getElementById("signupBirthdate").value;
    const gender = document.getElementById("signupGender").value;
    const password = document.getElementById("signupPassword").value.trim();

    if (!name || !username || !email || !birthdate || !gender || !password) {
      showToast("Please fill all configuration parameters.", "error");
      return;
    }

    try {
      const credential = await createUserWithEmailAndPassword(auth, email, password);
      const user = credential.user;

      await setDoc(doc(db, "users", user.uid), {
        name,
        username,
        email,
        birthdate,
        gender,
        createdAt: new Date().toISOString()
      });

      showToast("Account created successfully!", "success");
      setTimeout(() => { window.location.href = "index.html"; }, 1000);
    } catch (error) {
      showToast(error.message, "error");
    }
  });
}

// 4. GOOGLE OAUTH FIRST-TIME ONBOARDING DIALOG MODAL
function promptGoogleProfileCompletion(user, userRef) {
  const backdrop = document.createElement("div");
  backdrop.className = "modal-backdrop"; // Uses centralized styling rule maps safely

  const card = document.createElement("div");
  card.className = "modal-card";

  card.innerHTML = `
    <h3>Complete Profile</h3>
    <p style="font-size:13px; color:var(--text-muted); margin-bottom:20px; line-height:1.5;">Welcome to AniTale! Please provide your details to finish setting up your account.</p>
    
    <div class="modal-field">
      <label for="googleBirthdate">Birthdate</label>
      <input id="googleBirthdate" type="date" required style="background:var(--bg-surface-elevated); border:1px solid var(--border-color); border-radius:10px; padding:12px; color:#fff; width:100%; outline:none;" />
    </div>
    
    <div class="modal-field">
      <label for="googleGender">Gender</label>
      <select id="googleGender" required>
        <option value="" disabled selected>Select Gender</option>
        <option value="Male">Male</option>
        <option value="Female">Female</option>
        <option value="Other">Other</option>
      </select>
    </div>
    
    <div class="modal-actions">
      <button type="button" id="submitGoogleDetailsBtn" class="modal-btn save" style="width:100%; background:#fff; color:#000;">Finish Onboarding</button>
    </div>
  `;

  backdrop.appendChild(card);
  document.body.appendChild(backdrop);

  document.getElementById("submitGoogleDetailsBtn").onclick = async (e) => {
    e.preventDefault();
    const birthdate = document.getElementById("googleBirthdate").value;
    const gender = document.getElementById("googleGender").value;

    if (!birthdate || !gender) {
      showToast("Please provide your missing profile credentials.", "error");
      return;
    }

    try {
      await setDoc(userRef, {
        name: user.displayName || "Google User",
        username: user.email.split("@")[0],
        email: user.email,
        birthdate: birthdate,
        gender: gender,
        createdAt: new Date().toISOString()
      });

      backdrop.remove();
      showToast("Onboarding complete! Welcome to AniTale.", "success");
      setTimeout(() => { window.location.href = "index.html"; }, 1000);
    } catch (err) {
      console.error(err);
      showToast("Failed to compile user metadata record layers.", "error");
    }
  };
}