import { auth, db } from "./firebaseConfig.js";
import { getAnimeById } from "./api.js";
import { showToast } from "./ui.js";
import { 
  doc, 
  setDoc, 
  getDoc, 
  collection 
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-auth.js";

export function initDetailPage() {
  const container = document.getElementById("animeDetailContainer");
  if (!container) return;

  const urlParams = new URLSearchParams(window.location.search);
  const animeId = urlParams.get("id");

  if (!animeId) {
    container.innerHTML = "<p style='text-align:center; padding:40px;'>No anime ID specified in navigation parameter mapping.</p>";
    return;
  }

  let selectedVerdict = "";
  let animeDataPayload = null;

  async function loadAnimeDetails() {
    try {
      animeDataPayload = await getAnimeById(animeId);
      if (!animeDataPayload) {
        container.innerHTML = "<p style='text-align:center; padding:40px;'>Failed to resolve title metadata.</p>";
        return;
      }

      const title = animeDataPayload.title || "Unknown Title";
      const synopsis = animeDataPayload.synopsis || "No synopsis available.";
      const imgUrl = animeDataPayload.images?.jpg?.large_image_url || "";
      const score = animeDataPayload.score || "N/A";
      const status = animeDataPayload.status || "Unknown Status";

      container.innerHTML = `
        <div class="anime-detail-container reveal visible">
          <div>
            <img src="${imgUrl}" alt="${title}">
          </div>
          <div style="display: flex; flex-direction: column;">
            <h1>${title}</h1>
            <p style="font-size: 13px; color: var(--accent-secondary); margin-bottom: 12px; font-weight: 600;">
              ⭐ Score: ${score} | 🎬 Status: ${status}
            </p>
            <p>${synopsis}</p>

            <h3 style="font-family:'Space Grotesk', sans-serif; font-size:14px; color: var(--text-muted); text-transform:uppercase; margin-bottom:12px;">Set Your Verdict</h3>
            <div class="verdict-btns">
              <button type="button" class="skip" data-verdict="Skip">Skip</button>
              <button type="button" class="timepass" data-verdict="Timepass">Timepass</button>
              <button type="button" class="goforit" data-verdict="Go For It">Go For It</button>
              <button type="button" class="perfection" data-verdict="Perfection">Perfection</button>
            </div>

            <textarea id="note" placeholder="Write down your thoughts, timestamps, or favorite arcs here..."></textarea>
            <button id="saveDiaryBtn" type="button">Save Entry to Diary</button>
          </div>
        </div>
      `;

      setupVerdictButtons();
      checkExistingEntry();

    } catch (err) {
      console.error(err);
      container.innerHTML = "<p style='text-align:center; padding:40px;'>Critical error resolving REST pipeline targets.</p>";
    }
  }

  function setupVerdictButtons() {
    const btns = container.querySelectorAll(".verdict-btns button");
    btns.forEach(btn => {
      btn.onclick = (e) => {
        e.preventDefault();
        btns.forEach(b => b.classList.remove("active"));
        btn.classList.add("active");
        selectedVerdict = btn.getAttribute("data-day") || btn.innerText; 
      };
    });

    const saveBtn = container.querySelector("#saveDiaryBtn");
    if (saveBtn) {
      saveBtn.onclick = (e) => {
        e.preventDefault();
        saveEntry();
      };
    }
  }

  async function checkExistingEntry() {
    onAuthStateChanged(auth, async (user) => {
      if (!user) return;
      try {
        const docId = `${user.uid}_${animeId}`;
        const docRef = doc(db, "anime_diary", docId);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          const savedData = docSnap.data();
          selectedVerdict = savedData.verdict;
          const noteArea = container.querySelector("#note");
          if (noteArea) noteArea.value = savedData.note || "";

          const btns = container.querySelectorAll(".verdict-btns button");
          btns.forEach(btn => {
            if (btn.innerText.toLowerCase().replace(/\s+/g, "") === selectedVerdict.toLowerCase().replace(/\s+/g, "")) {
              btn.classList.add("active");
            }
          });
          const saveBtn = container.querySelector("#saveDiaryBtn");
          if (saveBtn) saveBtn.textContent = "Update Diary Entry";
        }
      } catch (err) {
        console.error(err);
      }
    });
  }

  async function saveEntry() {
    const user = auth.currentUser;
    if (!user) {
      showToast("Please authenticate into your account to save data records.", "error");
      return;
    }

    if (!selectedVerdict) {
      showToast("Please select a verdict rating before tracking.", "info");
      return;
    }

    const noteText = container.querySelector("#note").value.trim();
    const docId = `${user.uid}_${animeId}`;

    // Cleanly extract raw timing fields from Jikan mapping schemas
    const rawEpisodes = animeDataPayload?.episodes || 12; // Standard fallback mapping
    const rawDurationText = animeDataPayload?.duration || "24 min";
    
    // Regular Expression helper to parse number values from duration strings safely (e.g. "24 min per ep" -> 24)
    const matchedNum = rawDurationText.match(/\d+/);
    const rawMinutesPerEpisode = matchedNum ? parseInt(matchedNum[0]) : 24;

    try {
      await setDoc(doc(db, "anime_diary", docId), {
        userId: user.uid,
        animeId: animeId,
        verdict: selectedVerdict,
        note: noteText || null,
        episodesCount: Number(rawEpisodes),
        minutesDuration: Number(rawMinutesPerEpisode),
        createdAt: new Date().toISOString()
      }, { merge: true });

      showToast("Database file securely written to user collection ledger.", "success");
    } catch (error) {
      console.error(error);
      showToast("Cloud write sequence failed on infrastructure layers.", "error");
    }
  }

  loadAnimeDetails();
}