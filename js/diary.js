import { auth, db } from "./firebaseConfig.js";
import { setupRevealNow, colorVerdictTagsNow, showToast } from "./ui.js";
import { getAnimeById } from "./api.js";
import { 
  collection, 
  query, 
  where, 
  getDocs, 
  doc, 
  updateDoc, 
  deleteDoc 
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-auth.js";

export function initDiaryPage() {
  const list = document.getElementById("diaryList");
  const analyticsBox = document.getElementById("diaryAnalytics");
  if (!list) return;

  onAuthStateChanged(auth, async (user) => {
    if (!user) {
      list.innerHTML = '<p style="text-align:center; grid-column: 1/-1; padding: 40px 0;">Please <a href="auth.html" style="color: var(--accent-primary); text-decoration: none; font-weight: 600;">login</a> to view your diary.</p>';
      if (analyticsBox) analyticsBox.innerHTML = "";
      return;
    }

    try {
      const diaryQuery = query(collection(db, "anime_diary"), where("userId", "==", user.uid));
      const querySnapshot = await getDocs(diaryQuery);
      const data = [];
      
      querySnapshot.forEach((docSnap) => {
        data.push({ id: docSnap.id, ...docSnap.data() });
      });

      data.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

      // 1. IF COMPLETELY EMPTY, ERASE ANALYTICS AND DRAW EMPTY STATE CANVAS
      if (!data.length) {
        if (analyticsBox) analyticsBox.innerHTML = "";
        list.innerHTML = `
          <div class="empty-state-container reveal visible">
            <div class="empty-state-icon">📖</div>
            <h3>Your Diary is Empty</h3>
            <p>You haven't tracked any anime titles yet. Start building your custom library collection today.</p>
            <a href="index.html" class="empty-state-btn">Discover Anime</a>
          </div>
        `;
        return;
      }

      // 2. RUN METRIC DATA CALCULATIONS FOR ANALYTICS CARD BOARD
      let counts = { Total: data.length, Perfection: 0, GoForIt: 0, Timepass: 0, Skip: 0 };
      
      data.forEach((item) => {
        const v = (item.verdict || "").toLowerCase().replace(/\s+/g, "");
        if (v === "perfection") counts.Perfection++;
        else if (v === "goforit") counts.GoForIt++;
        else if (v === "timepass") counts.Timepass++;
        else if (v === "skip") counts.Skip++;
      });

      // 3. INJECT THE ANALYTICS CONTROLS HTML DISPLAY
      if (analyticsBox) {
        analyticsBox.innerHTML = `
          <div class="analytics-dashboard-card">
            <div class="stat-metric-box total">
              <span class="label">Total Tracked</span>
              <span class="count">${counts.Total}</span>
            </div>
            <div class="stat-metric-box perfection">
              <span class="label">Perfection</span>
              <span class="count">${counts.Perfection}</span>
            </div>
            <div class="stat-metric-box goforit">
              <span class="label">Go For It</span>
              <span class="count">${counts.GoForIt}</span>
            </div>
            <div class="stat-metric-box timepass">
              <span class="label">Timepass</span>
              <span class="count">${counts.Timepass}</span>
            </div>
            <div class="stat-metric-box skip">
              <span class="label">Skip</span>
              <span class="count">${counts.Skip}</span>
            </div>
          </div>
        `;
        analyticsBox.classList.add("visible");
      }

      // 4. DRAW TRANSITIONAL CARDS
      list.innerHTML = "";

      for (const entry of data) {
        try {
          const a = await getAnimeById(entry.animeId);
          const div = document.createElement("div");
          div.className = "anime-card glass reveal";
          div.dataset.entryId = entry.id;

          const title = a?.title || "Unknown Anime";
          const status = a?.status || "Status";

          div.innerHTML = `
            <div class="anime-card-img-wrap">
              <div class="status-tag status-airing">${status}</div>
              <img src="${a?.images?.jpg?.large_image_url || ""}" alt="${title}">
              <div class="diary-menu-container">
                <button class="diary-menu-btn" type="button">⋮</button>
              </div>
            </div>
            <h2 title="${title}">${title}</h2>
            <p class="verdict-tag">${entry.verdict}</p>
            ${entry.note ? `<p class="diary-note" style="margin: 6px 14px 0; font-size:13px; opacity:0.85;">${entry.note}</p>` : ""}
          `;

          attachDiaryMenuHandlers(div, entry, user);
          list.appendChild(div);
        } catch (err) {
          console.error(err);
        }
      }

      setupRevealNow();
      colorVerdictTagsNow();
    } catch (error) {
      showToast("Could not retrieve collection pipeline data layers.", "error");
    }
  });
}

function attachDiaryMenuHandlers(cardEl, entry, user) {
  const btn = cardEl.querySelector(".diary-menu-btn");
  if (!btn) return;

  let dropdown = null;
  const closeDropdown = () => {
    if (dropdown) {
      dropdown.remove();
      dropdown = null;
      document.removeEventListener("click", outsideClickHandler);
    }
  };

  const outsideClickHandler = (e) => {
    if (dropdown && !dropdown.contains(e.target) && e.target !== btn) closeDropdown();
  };

  btn.onclick = (e) => {
    e.stopPropagation();
    if (dropdown) { closeDropdown(); return; }

    dropdown = document.createElement("div");
    dropdown.className = "diary-menu-dropdown";
    dropdown.innerHTML = `
      <button class="diary-menu-item diary-edit" type="button">✏️ Edit</button>
      <button class="diary-menu-item diary-delete" type="button" style="color:#ff8a80;">🗑 Delete</button>
    `;

    cardEl.querySelector(".diary-menu-container").appendChild(dropdown);

    dropdown.querySelector(".diary-edit").onclick = (ev) => {
      ev.stopPropagation();
      closeDropdown();
      openEditModal(entry, cardEl, user);
    };

    dropdown.querySelector(".diary-delete").onclick = (ev) => {
      ev.stopPropagation();
      closeDropdown();
      openCustomDeleteModal(entry, cardEl);
    };

    document.addEventListener("click", outsideClickHandler);
  };
}

function openCustomDeleteModal(entry, cardEl) {
  const backdrop = document.createElement("div");
  backdrop.className = "modal-backdrop";

  const card = document.createElement("div");
  card.className = "modal-card";
  card.style.borderColor = "rgba(239, 68, 68, 0.2)";

  card.innerHTML = `
    <h3 style="color: #ef4444; display: flex; align-items: center; gap: 8px;">
      ⚠️ Remove Entry
    </h3>
    <p style="font-size: 13px; color: var(--text-muted); margin-bottom: 20px; line-height: 1.6;">
      Are you sure you want to remove this anime tracker file from your personal diary collection? This transaction cannot be undone.
    </p>
    <div class="modal-actions">
      <button class="modal-btn cancel">Keep Entry</button>
      <button class="modal-btn save" style="background: #dc2626; color: #fff;">Delete Permanently</button>
    </div>
  `;

  backdrop.appendChild(card);
  document.body.appendChild(backdrop);

  const closeModal = () => backdrop.remove();
  card.querySelector(".cancel").onclick = closeModal;
  backdrop.onclick = (e) => { if (e.target === backdrop) closeModal(); };

  card.querySelector(".save").onclick = async () => {
    try {
      await deleteDoc(doc(db, "anime_diary", entry.id));
      cardEl.remove();
      closeModal();
      showToast("Entry removed from library collection.", "info");
      
      initDiaryPage();
    } catch (error) {
      showToast("Failed to clean file target document tree.", "error");
    }
  };
}

function openEditModal(entry, cardEl, user) {
  const backdrop = document.createElement("div");
  backdrop.className = "modal-backdrop";

  const card = document.createElement("div");
  card.className = "modal-card";

  card.innerHTML = `
    <h3>Edit Diary Entry</h3>
    <div class="modal-field">
      <label>Verdict</label>
      <select id="editVerdictSelect">
        <option value="Skip">Skip</option>
        <option value="Timepass">Timepass</option>
        <option value="Go For It">Go For It</option>
        <option value="Perfection">Perfection</option>
      </select>
    </div>
    <div class="modal-field">
      <label for="editNote">Note (optional)</label>
      <textarea id="editNote" rows="4" placeholder="Add your thoughts..." style="width:100%; padding:11px 14px; background:var(--bg-surface-elevated); border:1px solid rgba(255,255,255,0.08); border-radius:8px; color:#fff; font-size:13px; resize:none; outline:none;"></textarea>
    </div>
    <div class="modal-actions">
      <button class="modal-btn cancel">Cancel</button>
      <button class="modal-btn save">Save Changes</button>
    </div>
  `;

  backdrop.appendChild(card);
  document.body.appendChild(backdrop);

  const selectEl = card.querySelector("#editVerdictSelect");
  selectEl.value = entry.verdict;

  const noteTextarea = card.querySelector("#editNote");
  noteTextarea.value = entry.note || "";

  const closeModal = () => backdrop.remove();
  card.querySelector(".cancel").onclick = closeModal;
  backdrop.onclick = (e) => { if (e.target === backdrop) closeModal(); };

  card.querySelector(".save").onclick = async () => {
    const newVerdict = selectEl.value;
    const newNote = noteTextarea.value.trim();

    try {
      const docRef = doc(db, "anime_diary", entry.id);
      await updateDoc(docRef, {
        verdict: newVerdict,
        note: newNote || null
      });

      closeModal();
      showToast("Library entry configuration updated.", "success");
      
      initDiaryPage();
    } catch (error) {
      showToast("Failed to modify database document rows.", "error");
    }
  };
}