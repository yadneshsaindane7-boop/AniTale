import { setupRevealNow, showToast } from "./ui.js";

export function initSchedulePage() {
  const scheduleGrid = document.getElementById("scheduleGrid");
  const tabsContainer = document.getElementById("dayTabsContainer");

  if (!scheduleGrid || !tabsContainer) return;

  // 1. TRANSACTION INTERFACE - FETCH AIRING TIMELINES FOR A SPECIFIC DAY NODE
  async function loadScheduleForDay(dayName) {
    scheduleGrid.innerHTML = `
      <div style="grid-column:1/-1; text-align:center; padding: 60px 0; color: var(--text-muted); font-size:14px;">
        Mapping broadcast timetables for ${dayName}...
      </div>
    `;

    try {
      const res = await fetch(`https://api.jikan.moe/v4/schedules?filter=${dayName}&sfw=true`);
      if (!res.ok) throw new Error("Schedule server pipeline response error");
      const json = await res.json();
      const data = json.data || [];

      scheduleGrid.innerHTML = "";

      if (data.length === 0) {
        scheduleGrid.innerHTML = `
          <div class="empty-state-container reveal visible" style="grid-column: 1/-1;">
            <div class="empty-state-icon">📆</div>
            <h3>No Releases Recorded</h3>
            <p>There are no premium airing schedules mapped onto ${dayName} for this seasonal block.</p>
          </div>
        `;
        return;
      }

      // 2. RENDERING ARCHITECTURE BUILD LOOP
      data.forEach((anime) => {
        const div = document.createElement("div");
        div.className = "anime-card glass reveal";
        
        const title = anime.title || "Unknown Title";
        const broadcastTime = anime.broadcast?.time ? `⏰ ${anime.broadcast.time} JST` : "📌 Broadcast Time Unset";

        div.innerHTML = `
          <div class="anime-card-img-wrap">
            <div class="status-tag status-airing">${broadcastTime}</div>
            <img src="${anime.images?.jpg?.large_image_url || ''}" alt="${title}">
          </div>
          <h2 title="${title}">${title}</h2>
        `;

        // Interactive route direction handler
        div.onclick = () => {
          window.location.href = `anime.html?id=${anime.mal_id}`;
        };

        scheduleGrid.appendChild(div);
      });

      setupRevealNow();

    } catch (error) {
      console.error(error);
      showToast(`Could not recover timetables for ${dayName}.`, "error");
    }
  }

  // 3. TAB EVENT HANDLERS REGISTRATION
  const buttons = tabsContainer.querySelectorAll(".schedule-tab-btn");
  buttons.forEach((btn) => {
    btn.onclick = (e) => {
      e.preventDefault();
      
      // Clean previous active indicators out of frame
      buttons.forEach((b) => b.classList.remove("active"));
      
      // Attach active highlights onto your current target element selection
      btn.classList.add("active");
      
      const targetDay = btn.getAttribute("data-day");
      loadScheduleForDay(targetDay);
    };
  });

  // Default execution layout loads on Monday on initial load phase
  loadScheduleForDay("monday");
}