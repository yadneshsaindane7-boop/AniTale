import { setupRevealNow } from "./ui.js";

export function initSchedulePage() {
  const scheduleGrid = document.getElementById("scheduleGrid");
  const tabButtons = document.querySelectorAll(".schedule-tab-btn");

  if (!scheduleGrid) return;

  const daysOfWeek = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
  
  // Resolve today's lowercase weekday string name to set the initial active tab state natively
  const todayIndex = new Date().getDay();
  let currentSelectedDay = daysOfWeek[todayIndex];

  // Align active visual highlight states cleanly on load based on your design system
  tabButtons.forEach(btn => {
    const targetDay = btn.getAttribute("data-day") || btn.textContent.trim().toLowerCase();
    if (targetDay === currentSelectedDay) {
      btn.classList.add("active");
    } else {
      btn.classList.remove("active");
    }
  });

  async function fetchAniListSchedule(dayName) {
    try {
      scheduleGrid.innerHTML = "<p style='grid-column:1/-1; text-align:center; padding:40px; color:var(--text-muted);'>Loading release schedule grids...</p>";

      // Establish a secure time range threshold centered around the current moment
      const currentTimeUnix = Math.floor(Date.now() / 1000);
      const startThreshold = currentTimeUnix - (4 * 24 * 60 * 60);
      const endThreshold = currentTimeUnix + (4 * 24 * 60 * 60);

      // FIXED GRAPHQL QUERY: Corrected 'airingAt_less' to 'airingAt_lesser' exactly as requested by the AniList schema response
      const query = `
        query ($page: Int, $perPage: Int, $start: Int, $end: Int) {
          Page(page: $page, perPage: $perPage) {
            airingSchedules(airingAt_greater: $start, airingAt_lesser: $end) {
              airingAt
              episode
              media {
                id
                title {
                  romaji
                  english
                }
                coverImage {
                  large
                }
              }
            }
          }
        }
      `;

      const response = await fetch("https://graphql.anilist.co", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json", 
          "Accept": "application/json" 
        },
        body: JSON.stringify({ 
          query: query, 
          variables: { 
            start: startThreshold, 
            end: endThreshold,
            page: 1,
            perPage: 50
          } 
        })
      });

      const json = await response.json();

      if (!response.ok || json.errors) {
        console.error("Detailed GraphQL Error Object:", json.errors);
        const errorMsg = json.errors && json.errors[0] ? json.errors[0].message : `HTTP Status ${response.status}`;
        
        scheduleGrid.innerHTML = `
          <div style="grid-column:1/-1; text-align:center; padding:40px;">
            <p style="color:#ff8a80; font-weight:600; margin-bottom:8px;">AniList API rejected the query request.</p>
            <p style="color:var(--text-muted); font-size:13px; font-family:monospace; background:rgba(0,0,0,0.2); padding:12px; border-radius:8px; display:inline-block;">
              Error details: ${errorMsg}
            </p>
          </div>
        `;
        return;
      }

      const list = json.data?.Page?.airingSchedules || [];

      // Filter elements dynamically to group items perfectly into your weekday slots
      const filteredShows = list.filter(item => {
        if (!item.media) return false;
        const airDate = new Date(item.airingAt * 1000);
        return daysOfWeek[airDate.getDay()] === dayName.toLowerCase();
      });

      if (filteredShows.length === 0) {
        scheduleGrid.innerHTML = `<p style='grid-column:1/-1; text-align:center; padding:40px; color:var(--text-muted);'>No anime series scheduled to air on ${dayName}.</p>`;
        return;
      }

      scheduleGrid.innerHTML = filteredShows.map(item => {
        const id = item.media.id;
        const title = item.media.title?.english || item.media.title?.romaji || "Unknown Title";
        const imgUrl = item.media.coverImage?.large || "";
        const airTime = new Date(item.airingAt * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

        return `
          <div class="anime-card glass reveal visible" onclick="window.location.href='anime.html?id=${id}'">
            <div class="anime-card-img-wrap">
              <div class="status-tag status-airing">Ep ${item.episode} @ ${airTime}</div>
              <img src="${imgUrl}" alt="${title}">
            </div>
            <h2 title="${title}">${title}</h2>
          </div>
        `;
      }).join("");

      if (typeof setupRevealNow === "function") {
        setupRevealNow();
      }

    } catch (err) {
      console.error(err);
      scheduleGrid.innerHTML = "<p style='grid-column:1/-1; text-align:center; padding:40px; color:#ff8a80;'>Failed to sync schedule matrix due to a network timeout.</p>";
    }
  }

  // Hook event listeners cleanly onto your tabs layout buttons row array
  tabButtons.forEach(btn => {
    btn.onclick = (e) => {
      e.preventDefault();
      
      tabButtons.forEach(b => b.classList.remove("active"));
      btn.classList.add("active");

      const selectedDay = btn.getAttribute("data-day") || btn.textContent.trim().toLowerCase();
      fetchAniListSchedule(selectedDay);
    };
  });

  // Load the initial schedule view on module generation
  fetchAniListSchedule(currentSelectedDay);
}