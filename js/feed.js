import { auth, db } from "./firebaseConfig.js";
import { setupRevealNow, colorVerdictTagsNow, showToast } from "./ui.js";
import { getAnimeById } from "./api.js";
import { 
  collection, 
  getDocs, 
  query, 
  limit 
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";

export async function initFeedPage() {
  const feedContainer = document.getElementById("feedContainer");
  if (!feedContainer) return;

  try {
    // 1. Fetch the absolute global entries (limiting to top 24 to keep things fast)
    const feedQuery = query(collection(db, "anime_diary"), limit(24));
    const querySnapshot = await getDocs(feedQuery);
    const data = [];

    querySnapshot.forEach((docSnap) => {
      data.push({ id: docSnap.id, ...docSnap.data() });
    });

    // 2. Sort entries globally by date descending (Newest first)
    data.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    if (!data.length) {
      feedContainer.innerHTML = `
        <div class="empty-state-container reveal visible">
          <div class="empty-state-icon">📡</div>
          <h3>No Global Activity Yet</h3>
          <p>Be the first user to track an entry and broadcast your verdict to the world!</p>
          <a href="index.html" class="empty-state-btn">Start Tracking</a>
        </div>
      `;
      return;
    }

    feedContainer.innerHTML = "";

    // 3. Loop and render client stream entries asynchronously
    for (const entry of data) {
      try {
        const a = await getAnimeById(entry.animeId);
        const div = document.createElement("div");
        div.className = "anime-card glass reveal";

        const title = a?.title || "Unknown Anime";
        const status = a?.status || "Status";
        
        // Generate a localized anonymous mask based on the unique user ID string
        const pseudoUser = `User_${entry.userId.substring(0, 5)}`;

        div.innerHTML = `
          <div class="anime-card-img-wrap">
            <div class="status-tag status-finished" style="background: var(--bg-surface-elevated); border: 1px solid var(--border-color); color: var(--text-muted); font-family: 'Space Grotesk', sans-serif;">
              👤 ${pseudoUser}
            </div>
            <img src="${a?.images?.jpg?.large_image_url || ""}" alt="${title}">
          </div>
          <h2 title="${title}">${title}</h2>
          <p class="verdict-tag">${entry.verdict}</p>
          ${entry.note ? `<p class="diary-note" style="margin: 6px 14px 0; font-size:13px; opacity:0.85; font-style: italic; color: var(--text-muted);">"${entry.note}"</p>` : ""}
        `;

        // Direct user routing context on click
        div.onclick = () => {
          window.location.href = `anime.html?id=${entry.animeId}`;
        };

        feedContainer.appendChild(div);
      } catch (err) {
        console.error("Error processing stream node:", err);
      }
    }

    setupRevealNow();
    colorVerdictTagsNow();

  } catch (error) {
    console.error(error);
    showToast("Could not sync community broadcast servers.", "error");
  }
}