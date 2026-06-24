import { auth, db } from "./firebaseConfig.js";
import { setupRevealNow, showToast } from "./ui.js";
import { getAnimeById } from "./api.js";
import { collection, addDoc } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";

export function initAnimeDetailPage() {
  const box = document.getElementById("animeDetail");
  if (!box) return;

  const params = new URLSearchParams(window.location.search);
  const id = params.get("id");

  if (!id) {
    box.innerHTML = "<p>Invalid anime selection scope context.</p>";
    return;
  }

  (async () => {
    const a = await getAnimeById(id);
    if (!a) {
      box.innerHTML = "<p>Error loading anime details.</p>";
      return;
    }

    box.innerHTML = `
      <img src="${a.images?.jpg?.large_image_url || ""}" alt="${a.title}">
      <div class="details">
        <h1>${a.title}</h1>
        <p>${a.synopsis || "No synopsis available."}</p>
        <p>Episodes: ${a.episodes || "?"} | Status: ${a.status || "Unknown"}</p>
        <div class="verdict-btns">
          <button class="skip">Skip</button>
          <button class="timepass">Timepass</button>
          <button class="goforit">Go For It</button>
          <button class="perfection">Perfection</button>
        </div>
        <textarea id="note" placeholder="Optional note..."></textarea>
        <button id="saveDiaryBtn" type="button">Save to Diary</button>
      </div>
    `;

    let verdict = "";
    const buttons = box.querySelectorAll(".verdict-btns button");
    buttons.forEach((btn) => {
      btn.onclick = () => {
        verdict = btn.innerText.trim();
        buttons.forEach((b) => b.classList.remove("active"));
        btn.classList.add("active");
      };
    });

    document.getElementById("saveDiaryBtn").addEventListener("click", async () => {
      if (!verdict) {
        showToast("Please select a rating option verdict first.", "info");
        return;
      }

      const user = auth.currentUser;
      if (!user) {
        showToast("Access unauthenticated. Routing to verification shields.", "error");
        setTimeout(() => { window.location.href = "auth.html"; }, 1500);
        return;
      }

      const note = document.getElementById("note").value.trim();

      try {
        await addDoc(collection(db, "anime_diary"), {
          userId: user.uid,
          animeId: id,
          verdict: verdict,
          note: note || null,
          createdAt: new Date().toISOString()
        });

        showToast(`Saved to your library under ${verdict}!`, "success");
      } catch (err) {
        showToast("Failed to compile database transaction entry.", "error");
      }
    });

    setupRevealNow();
  })();
}