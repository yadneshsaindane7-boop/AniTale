import { setupRevealNow } from "./ui.js";

export function initHomePage() {
  const animeList = document.getElementById("animeList");
  const searchBtn = document.getElementById("searchBtn");
  const searchInput = document.getElementById("searchInput");

  if (!animeList || !searchBtn || !searchInput) return;

  // Caching configuration parameters
  const CACHE_KEY = "anitale_airing_cache";
  const CACHE_TIME_KEY = "anitale_airing_cache_time";
  const ONE_HOUR = 60 * 60 * 1000; // 1 hour in milliseconds

  function displayAnime(list) {
    animeList.innerHTML = "";
    list.forEach((a) => {
      const statusText = (a.status || "").toLowerCase();
      const status = statusText.includes("airing")
        ? "airing"
        : statusText.includes("finished")
        ? "finished"
        : "upcoming";

      const div = document.createElement("div");
      div.className = "anime-card glass reveal";
      
      div.innerHTML = `
        <div class="anime-card-img-wrap">
          <div class="status-tag status-${status}">${a.status || ""}</div>
          <img src="${a.images?.jpg?.large_image_url || ""}" alt="${a.title}">
        </div>
        <h2 title="${a.title}">${a.title}</h2>
      `;

      div.onclick = () => {
        const url = new URL(window.location.href);
        url.pathname = "anime.html";
        url.searchParams.set("id", a.mal_id);
        window.location.href = url.toString();
      };

      animeList.appendChild(div);
    });

    setupRevealNow();
  }

  // Robust Cache-First Data Fetcher
  async function loadAiring() {
    const cachedData = sessionStorage.getItem(CACHE_KEY);
    const cacheTime = sessionStorage.getItem(CACHE_TIME_KEY);
    const now = Date.now();

    // If cache exists and is less than an hour old, load instantly from client memory
    if (cachedData && cacheTime && now - cacheTime < ONE_HOUR) {
      displayAnime(JSON.parse(cachedData));
      return;
    }

    animeList.innerHTML = "<p style='text-align:center; grid-column: 1/-1; opacity: 0.5;'>Loading...</p>";
    try {
      const res = await fetch("https://api.jikan.moe/v4/seasons/now");
      const data = await res.json();
      
      if (data.data?.length) {
        const items = data.data.slice(0, 12);
        
        // Save network payload to client session storage layers
        sessionStorage.setItem(CACHE_KEY, JSON.stringify(items));
        sessionStorage.setItem(CACHE_TIME_KEY, now.toString());
        
        displayAnime(items);
      } else {
        animeList.innerHTML = "<p style='text-align:center; grid-column: 1/-1;'>No anime found.</p>";
      }
    } catch (err) {
      console.error(err);
      animeList.innerHTML = "<p style='text-align:center; grid-column: 1/-1;'>Error loading anime.</p>";
    }
  }

  // Debounced search button interaction node
  searchBtn.onclick = async () => {
    const q = searchInput.value.trim();
    if (!q) {
      loadAiring();
      return;
    }

    // Rate-limiting safety check: Disable button instantly to block double clicks
    searchBtn.disabled = true;
    searchBtn.innerText = "...";
    animeList.innerHTML = "<p style='text-align:center; grid-column: 1/-1; opacity: 0.5;'>Searching...</p>";
    
    try {
      const res = await fetch(`https://api.jikan.moe/v4/anime?q=${encodeURIComponent(q)}&limit=12`);
      const data = await res.json();
      if (data.data?.length) {
        displayAnime(data.data);
      } else {
        animeList.innerHTML = "<p style='text-align:center; grid-column: 1/-1;'>No results found.</p>";
      }
    } catch (err) {
      console.error(err);
      animeList.innerHTML = "<p style='text-align:center; grid-column: 1/-1;'>Error searching anime.</p>";
    } finally {
      // Restore button status control values safely
      searchBtn.disabled = false;
      searchBtn.innerText = "Search";
    }
  };

  loadAiring();
}