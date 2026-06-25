import { auth, db } from "./firebaseConfig.js";
import { showToast } from "./ui.js";
import { 
  doc, 
  setDoc, 
  getDoc, 
  deleteDoc,
  collection,
  query,
  where,
  getDocs 
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-auth.js";

export function initDetailPage() {
  const container = document.getElementById("animeDetailContainer");
  if (!container) return;

  const urlParams = new URLSearchParams(window.location.search);
  const animeId = urlParams.get("id");

  if (!animeId) {
    container.innerHTML = "<p style='text-align:center; padding:40px; color:var(--text-muted);'>No anime ID specified.</p>";
    return;
  }

  let selectedVerdict = "";
  let animeDataPayload = null;
  let isWatchlisted = false;

  const colorMap = {
    skip: { bg: "rgba(239, 68, 68, 0.15)", border: "#ef4444", text: "#f87171" },
    timepass: { bg: "rgba(245, 158, 11, 0.15)", border: "#f59e0b", text: "#fbbf24" },
    goforit: { bg: "rgba(6, 182, 212, 0.15)", border: "#06b6d4", text: "#22d3ee" },
    perfection: { bg: "rgba(16, 185, 129, 0.15)", border: "#10b981", text: "#34d399" }
  };

  // Modern GraphQL Single-fetch request query container for AniList metadata
  async function fetchAnilistMediaDetails(id) {
    const query = `
      query ($id: Int) {
        Media(id: $id, type: ANIME) {
          id
          title {
            romaji
            english
          }
          description
          coverImage {
            large
          }
          averageScore
          status
          episodes
          duration
        }
      }
    `;

    const options = {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json",
      },
      body: JSON.stringify({
        query: query,
        variables: { id: parseInt(id) }
      })
    };

    const response = await fetch("https://graphql.anilist.co", options);
    if (!response.ok) throw new Error(`Anilist network boundary mismatch: ${response.status}`);
    const json = await response.json();
    return json.data?.Media || null;
  }

  async function loadAnimeDetails() {
    try {
      container.innerHTML = "<p style='text-align:center; padding:40px; color:var(--text-muted);'>Loading anime details...</p>";
      
      animeDataPayload = await fetchAnilistMediaDetails(animeId);
      
      if (!animeDataPayload) {
        container.innerHTML = "<p style='text-align:center; padding:40px; color:var(--text-muted);'>Failed to resolve title metadata.</p>";
        return;
      }

      // Safe fallback variables translation mappings matching Anilist GraphQL response shapes
      const title = animeDataPayload.title?.english || animeDataPayload.title?.romaji || "Unknown Title";
      
      // Clean HTML formatting tags from Anilist descriptions if present
      const synopsis = (animeDataPayload.description || "No synopsis available.").replace(/<br\s*\/?>/gi, ' ');
      const imgUrl = animeDataPayload.coverImage?.large || "";
      const score = animeDataPayload.averageScore ? `${animeDataPayload.averageScore}%` : "N/A";
      
      let status = animeDataPayload.status || "Unknown Status";
      if (status === "RELEASING") status = "Currently Airing";
      if (status === "FINISHED") status = "Finished Airing";
      if (status === "NOT_YET_RELEASED") status = "Upcoming";

      container.innerHTML = `
        <div class="anime-detail-container reveal visible" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 40px; width: 88%; max-width: 1400px; margin: 40px auto; text-align: left;">
          <div>
            <img src="${imgUrl}" alt="${title}" style="width: 100%; max-width: 360px; border-radius: 16px; border: 1px solid var(--border-color); box-shadow: 0 10px 30px rgba(0,0,0,0.5); margin-bottom: 20px;">
            
            <button id="watchlistBtn" type="button" style="width:100%; max-width:360px; background: rgba(255,255,255,0.03); color:#fff; border: 1px solid var(--border-color); padding: 14px; border-radius: 12px; font-size:14px; font-weight:600; cursor:pointer; display:flex; align-items:center; justify-content:center; gap:8px; transition: all 0.2s ease;">
              <span>📥 Add to Watchlist</span>
            </button>

            <div id="communityRatingsChart" style="width:100%; max-width:360px; margin-top:32px; background:var(--bg-surface); border:1px solid var(--border-color); padding:20px; border-radius:16px;">
              <h3 style="font-family:'Space Grotesk', sans-serif; font-size:14px; font-weight:700; color:#fff; margin-bottom:16px;">📊 Community Breakdown</h3>
              <div id="chartBarsContainer" style="display:flex; flex-direction:column; gap:12px;">
                <p style="font-size:12px; color:var(--text-muted);">Compiling public database reviews...</p>
              </div>
            </div>
          </div>

          <div style="display: flex; flex-direction: column; gap: 16px;">
            <h1 style="font-family:'Space Grotesk', sans-serif; font-size: 32px; font-weight:700; color: #fff;">${title}</h1>
            <p style="font-size: 14px; color: var(--accent-secondary); font-weight: 600; letter-spacing: 0.5px;">
              ⭐ Score: ${score} &nbsp;|&nbsp; 🎬 Status: ${status}
            </p>
            <p style="font-size: 15px; color: var(--text-main); line-height: 1.6; margin-bottom: 10px;">${synopsis}</p>

            <h3 style="font-family:'Space Grotesk', sans-serif; font-size:13px; color: var(--text-muted); text-transform:uppercase; letter-spacing:1px; margin-top: 10px;">Set Your Verdict</h3>
            
            <div class="verdict-btns" style="display: flex; flex-wrap: wrap; gap: 12px; margin-bottom: 4px;">
              <button type="button" class="modal-btn btn-skip" style="background: rgba(255,255,255,0.03); color: #fff; border: 1px solid var(--border-color); padding: 10px 20px; border-radius: 10px; cursor: pointer; transition: all 0.2s ease;" data-verdict="Skip">Skip</button>
              <button type="button" class="modal-btn btn-timepass" style="background: rgba(255,255,255,0.03); color: #fff; border: 1px solid var(--border-color); padding: 10px 20px; border-radius: 10px; cursor: pointer; transition: all 0.2s ease;" data-verdict="Timepass">Timepass</button>
              <button type="button" class="modal-btn btn-goforit" style="background: rgba(255,255,255,0.03); color: #fff; border: 1px solid var(--border-color); padding: 10px 20px; border-radius: 10px; cursor: pointer; transition: all 0.2s ease;" data-verdict="Go For It">Go For It</button>
              <button type="button" class="modal-btn btn-perfection" style="background: rgba(255,255,255,0.03); color: #fff; border: 1px solid var(--border-color); padding: 10px 20px; border-radius: 10px; cursor: pointer; transition: all 0.2s ease;" data-verdict="Perfection">Perfection</button>
            </div>

            <textarea id="note" placeholder="Write down your thoughts, timestamps, or favorite arcs here..." style="width:100%; max-width: 500px; padding:14px; background:var(--bg-surface-elevated); border:1px solid var(--border-color); border-radius:12px; color:#fff; font-size:14px; resize:none; outline:none; height: 100px; font-family: inherit; margin-top: 10px;"></textarea>
            <button id="saveDiaryBtn" type="button" style="background: #fff; color: #000; border: none; font-size: 14px; font-weight: 600; padding: 14px; border-radius: 12px; cursor: pointer; width: 100%; max-width: 500px; transition: background 0.2s ease; margin-top: 10px;">Save Entry to Diary</button>
          </div>
        </div>
      `;

      setupVerdictButtons();
      setupWatchlistAction();
      checkExistingEntry();
      compileCommunityRatings();

    } catch (err) {
      console.error(err);
      container.innerHTML = "<p style='text-align:center; padding:40px; color:var(--text-muted);'>Error resolving details payload layer via Anilist pipeline.</p>";
    }
  }

  function applyButtonColors(activeVerdict) {
    const btns = container.querySelectorAll(".verdict-btns button");
    btns.forEach(btn => {
      const btnVerdict = btn.getAttribute("data-verdict");
      const key = btnVerdict.toLowerCase().replace(/\s+/g, "");

      if (activeVerdict && btnVerdict.toLowerCase() === activeVerdict.toLowerCase()) {
        if (colorMap[key]) {
          btn.style.background = colorMap[key].bg;
          btn.style.borderColor = colorMap[key].border;
          btn.style.color = colorMap[key].text;
        }
      } else {
        btn.style.background = "rgba(255,255,255,0.03)";
        btn.style.borderColor = "var(--border-color)";
        btn.style.color = "#fff";
      }
    });
  }

  function setupVerdictButtons() {
    const btns = container.querySelectorAll(".verdict-btns button");
    btns.forEach(btn => {
      btn.onclick = (e) => {
        e.preventDefault();
        selectedVerdict = btn.getAttribute("data-verdict");
        applyButtonColors(selectedVerdict);
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

  function setupWatchlistAction() {
    const wBtn = document.getElementById("watchlistBtn");
    if (!wBtn) return;

    wBtn.onclick = async (e) => {
      e.preventDefault();
      const user = auth.currentUser;
      if (!user) {
        showToast("Please login to save custom watchlists.", "error");
        return;
      }

      const docId = `${user.uid}_${animeId}`;
      const docRef = doc(db, "watchlists", docId);

      try {
        if (isWatchlisted) {
          await deleteDoc(docRef);
          showToast("Removed from Watchlist.", "info");
          isWatchlisted = false;
        } else {
          const derivedTitle = animeDataPayload?.title?.english || animeDataPayload?.title?.romaji || "Unknown Title";
          await setDoc(docRef, {
            userId: user.uid,
            animeId: animeId,
            title: derivedTitle,
            imgUrl: animeDataPayload?.coverImage?.large || "",
            addedAt: new Date().toISOString()
          });
          showToast("Added to Watch later!", "success");
          isWatchlisted = true;
        }
        updateWatchlistButtonUI();
      } catch (err) {
        console.error(err);
        showToast("Watchlist action write failure.", "error");
      }
    };
  }

  function updateWatchlistButtonUI() {
    const wBtn = document.getElementById("watchlistBtn");
    if (!wBtn) return;
    if (isWatchlisted) {
      wBtn.style.background = "rgba(6, 182, 212, 0.1)";
      wBtn.style.borderColor = "var(--accent-secondary)";
      wBtn.innerHTML = `<span>✅ Inside Watchlist</span>`;
    } else {
      wBtn.style.background = "rgba(255,255,255,0.03)";
      wBtn.style.borderColor = "var(--border-color)";
      wBtn.innerHTML = `<span>📥 Add to Watchlist</span>`;
    }
  }

  async function compileCommunityRatings() {
    const barsContainer = document.getElementById("chartBarsContainer");
    if (!barsContainer) return;

    try {
      const q = query(collection(db, "anime_diary"), where("animeId", "==", animeId));
      const querySnap = await getDocs(q);

      let counts = { Skip: 0, Timepass: 0, "Go For It": 0, Perfection: 0 };
      let totalCount = 0;

      querySnap.forEach((doc) => {
        const v = doc.data().verdict;
        if (counts[v] !== undefined) {
          counts[v]++;
          totalCount++;
        }
      });

      if (totalCount === 0) {
        barsContainer.innerHTML = `<p style="font-size:13px; color:var(--text-muted); text-align:center; padding:10px 0;">No reviews logged yet. Be the first!</p>`;
        return;
      }

      barsContainer.innerHTML = "";

      const labelMap = { Skip: "skip", Timepass: "timepass", "Go For It": "goforit", Perfection: "perfection" };

      for (const [label, count] of Object.entries(counts)) {
        const percentage = Math.round((count / totalCount) * 100);
        const colorKey = labelMap[label];
        const barColor = colorMap[colorKey]?.border || "var(--accent-primary)";

        const barRowHtml = `
          <div style="display:flex; flex-direction:column; gap:4px;">
            <div style="display:flex; justify-content:space-between; font-size:12px; font-weight:500;">
              <span style="color:var(--text-main);">${label}</span>
              <span style="color:var(--text-muted); font-weight:600;">${count} (${percentage}%)</span>
            </div>
            <div style="width:100%; height:8px; background:rgba(255,255,255,0.04); border-radius:4px; overflow:hidden;">
              <div style="width:${percentage}%; height:100%; background:${barColor}; border-radius:4px; transition: width 0.5s ease;"></div>
            </div>
          </div>
        `;
        barsContainer.insertAdjacentHTML("beforeend", barRowHtml);
      }
    } catch (err) {
      console.error("Error drawing ratings matrix lines:", err);
      barsContainer.innerHTML = `<p style="font-size:12px; color:#ff8a80;">Could not sync global metrics.</p>`;
    }
  }

  async function checkExistingEntry() {
    onAuthStateChanged(auth, async (user) => {
      if (!user) return;
      try {
        const docId = `${user.uid}_${animeId}`;
        
        const diarySnap = await getDoc(doc(db, "anime_diary", docId));
        if (diarySnap.exists()) {
          const savedData = diarySnap.data();
          selectedVerdict = savedData.verdict;
          
          const noteArea = container.querySelector("#note");
          if (noteArea) noteArea.value = savedData.note || "";

          applyButtonColors(selectedVerdict);
          
          const saveBtn = container.querySelector("#saveDiaryBtn");
          if (saveBtn) saveBtn.textContent = "Update Diary Entry";
        }

        const watchlistSnap = await getDoc(doc(db, "watchlists", docId));
        isWatchlisted = watchlistSnap.exists();
        updateWatchlistButtonUI();

      } catch (err) {
        console.error("Error reading details session nodes:", err);
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

    const rawEpisodes = animeDataPayload?.episodes || 12; 
    const rawMinutesPerEpisode = animeDataPayload?.duration || 24;

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

      showToast("Entry saved to your diary!", "success");
      
      const saveBtn = container.querySelector("#saveDiaryBtn");
      if (saveBtn) saveBtn.textContent = "Update Diary Entry";
      
      compileCommunityRatings();
    } catch (error) {
      console.error(error);
      showToast("Cloud write sequence failed.", "error");
    }
  }

  loadAnimeDetails();
}