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

// Dynamically inject user avatar chip dropdown menu upon verified authorization state updates
export function initAuthLink() {
  const container = document.getElementById("navAuthContainer");
  if (!container) return;

  onAuthStateChanged(auth, async (user) => {
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
        <div class="user-profile-chip" id="profileChipBtn">
          <div class="user-avatar-icon">${initialChar}</div>
          <span style="font-size: 13px; font-weight: 500; color: var(--text-main); max-width: 100px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${displayName}</span>
        </div>
        <div class="user-profile-dropdown select-hide" id="profileMenuDropdown">
          <div class="dropdown-user-info">Logged in as ${displayName}</div>
          <button class="profile-dropdown-item" id="logoutDropdownBtn" style="color: #ff8a80;">Logout</button>
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

      document.getElementById("logoutDropdownBtn")?.addEventListener("click", async () => {
        try {
          await signOut(auth);
          window.location.href = "auth.html";
        } catch (err) {
          console.error(err);
        }
      });
    } else {
      container.innerHTML = `<a href="auth.html" id="authLink">Login</a>`;
    }
  });
}

// Syncs profile storage data after initial email account verification confirmation
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

// Structural page validation routines matching original authorization bindings
export function initAuthPage() {
  const loginForm = document.getElementById("loginForm");
  const signupForm = document.getElementById("signupForm");
  const showLogin = document.getElementById("showLogin");
  const showSignup = document.getElementById("showSignup");

  if (!loginForm || !signupForm || !showLogin || !showSignup) return;

  showLogin.onclick = () => {
    loginForm.style.display = "flex";
    signupForm.style.display = "none";
    showLogin.classList.add("active");
    showSignup.classList.remove("active");
  };

  showSignup.onclick = () => {
    signupForm.style.display = "flex";
    loginForm.style.display = "none";
    showSignup.classList.add("active");
    showLogin.classList.remove("active");
  };

  document.getElementById("loginBtn")?.addEventListener("click", async () => {
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

  const googleButtons = document.querySelectorAll(".googleLoginBtn");
  googleButtons.forEach((btn) => {
    btn.addEventListener("click", async () => {
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
        showToast("Google authorization rejected.", "error");
      }
    });
  });

  document.getElementById("signupBtn")?.addEventListener("click", async () => {
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

function promptGoogleProfileCompletion(user, userRef) {
  const backdrop = document.createElement("div");
  backdrop.className = "auth-modal-backdrop";

  const card = document.createElement("div");
  card.className = "auth-modal-card";

  card.innerHTML = `
    <h3>Complete Profile</h3>
    <p>Welcome to AniTale! Please provide your details to finish setting up your account.</p>
    
    <div class="auth-form">
      <div class="modal-field">
        <label for="googleBirthdate">Birthdate</label>
        <input id="googleBirthdate" type="date" required />
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
      
      <button type="button" id="submitGoogleDetailsBtn">Finish Onboarding</button>
    </div>
  `;

  backdrop.appendChild(card);
  document.body.appendChild(backdrop);

  document.getElementById("submitGoogleDetailsBtn").onclick = async () => {
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
      showToast("Failed to compile user metadata record layers.", "error");
    }
  };
}