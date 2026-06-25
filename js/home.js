import { setupRevealNow, showToast } from "./ui.js";

export function initHomePage() {
  const list = document.getElementById("animeList");
  const searchInput = document.getElementById("searchInput");
  const searchBtn = document.getElementById("searchBtn");
  const headingTitle = document.getElementById("mainHeadingTitle");

  // Filter UI element bindings
  const filterToggleBtn = document.getElementById("filterToggleBtn");
  const filterDrawer = document.getElementById("filterDrawer");
  const applyFiltersBtn = document.getElementById("applyFiltersBtn");
  const resetFiltersBtn = document.getElementById("resetFiltersBtn");

  const filterGenre = document.getElementById("filterGenre");
  const filterOrderBy = document.getElementById("filterOrderBy");
  const filterRating = document.getElementById("filterRating");

  if (!list) return;

  // 1. CHIP CONTROLLER - TOGGLE OPEN THE FILTERING DRAWER VIEW PANEL
  if (filterToggleBtn && filterDrawer) {
    filterToggleBtn.onclick = (e) => {
      e.preventDefault();
      filterDrawer.classList.toggle("select-hide");
    };
  }

  // 2. LIFECYCLE TARGET - RENDER COLLECTION STREAM MATRIX
  async function renderCardGrid(animeArray) {
    list.innerHTML = "";
    if (!animeArray || animeArray.length === 0) {
      list.innerHTML = `
        <div class="empty-state-container reveal visible" style="grid-column: 1/-1;">
          <div class="empty-state-icon">🔍</div>
          <h3>No Series Match Your Search</h3>
          <p>We couldn't locate matching records. Try tweaking your parameter filters or checking the spelling.</p>
        </div>
      `;
      return;
    }

    animeArray.forEach((item) => {
      const div = document.createElement("div");
      div.className = "anime-card glass reveal";
      
      const title = item.title || "Unknown Title";
      const status = item.status || "Unknown";
      
      let badgeClass = "status-finished";
      if (status.toLowerCase().includes("airing")) badgeClass = "status-airing";
      if (status.toLowerCase().includes("upcoming")) badgeClass = "status-upcoming";

      div.innerHTML = `
        <div class="anime-card-img-wrap">
          <div class="status-tag ${badgeClass}">${status}</div>
          <img src="${item.images?.jpg?.large_image_url || ''}" alt="${title}">
        </div>
        <h2 title="${title}">${title}</h2>
      `;

      div.onclick = () => {
        window.location.href = `anime.html?id=${item.mal_id}`;
      };

      list.appendChild(div);
    });

    setupRevealNow();
  }

  // 3. CORE HANDSHAKE - INITIAL HOME HOOK ROUTINES LOAD
  async function loadInitialTrending() {
    if (headingTitle) headingTitle.textContent = "Trending Seasonal Collection";
    
    const cacheKey = "trending_anime_cache";
    const cacheTimeKey = "trending_anime_time";
    const cachedData = sessionStorage.getItem(cacheKey);
    const cachedTime = sessionStorage.getItem(cacheTimeKey);

    // Serve instantly from client memory if cache is fresh (< 1 hour)
    if (cachedData && cachedTime && (Date.now() - parseInt(cachedTime) < 3600000)) {
      renderCardGrid(JSON.parse(cachedData));
      return;
    }

    try {
      const res = await fetch("https://api.jikan.moe/v4/seasons/now");
      if (!res.ok) throw new Error("Network response error");
      const json = await res.json();
      const data = json.data || [];
      
      if (data.length > 0) {
        sessionStorage.setItem(cacheKey, JSON.stringify(data));
        sessionStorage.setItem(cacheTimeKey, Date.now().toString());
        renderCardGrid(data);
      }
    } catch (err) {
      console.error(err);
      showToast("Failed to fetch trending index records.", "error");
    }
  }

  // 4. TRANSACTION ENGINE - COORDINATE EXPLICIT PARAM QUERIES TO UPSTREAM SERVERS
  async function executeSearchAndFilter() {
    const queryStr = searchInput ? searchInput.value.trim() : "";
    const genre = filterGenre ? filterGenre.value : "";
    const orderBy = filterOrderBy ? filterOrderBy.value : "popularity";
    const rating = filterRating ? filterRating.value : "";

    if (!searchBtn) return;

    // UI Interactive Loading Feedback Loops
    searchBtn.disabled = true;
    const originalText = searchBtn.textContent;
    searchBtn.textContent = "...";

    if (queryStr || genre || orderBy !== "popularity" || rating) {
      if (headingTitle) headingTitle.textContent = "Filtered Search Results";
    } else {
      searchBtn.disabled = false;
      searchBtn.textContent = originalText;
      loadInitialTrending();
      return;
    }

    try {
      // Safely construct explicit query parameters string natively
      const urlParams = new URLSearchParams();
      if (queryStr) urlParams.append("q", queryStr);
      if (genre) urlParams.append("genres", genre);
      if (orderBy) urlParams.append("order_by", orderBy);
      urlParams.append("sort", "desc");
      if (rating) urlParams.append("rating", rating);
      urlParams.append("sfw", "true");

      const res = await fetch(`https://api.jikan.moe/v4/anime?${urlParams.toString()}`);
      if (!res.ok) throw new Error("Search request error");
      const json = await res.json();
      
      renderCardGrid(json.data || []);
    } catch (error) {
      console.error(error);
      showToast("Error resolving advanced filter sequence.", "error");
    } {
      searchBtn.disabled = false;
      searchBtn.textContent = originalText;
    }
  }

  // 5. INPUT REGISTRATION EVENT HANDLERS
  if (searchBtn) {
    searchBtn.onclick = (e) => {
      e.preventDefault();
      executeSearchAndFilter();
    };
  }

  if (searchInput) {
    searchInput.onkeydown = (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        executeSearchAndFilter();
      }
    };
  }

  if (applyFiltersBtn) {
    applyFiltersBtn.onclick = (e) => {
      e.preventDefault();
      executeSearchAndFilter();
      if (filterDrawer) filterDrawer.classList.add("select-hide");
    };
  }

  if (resetFiltersBtn) {
    resetFiltersBtn.onclick = (e) => {
      e.preventDefault();
      if (searchInput) searchInput.value = "";
      if (filterGenre) filterGenre.value = "";
      if (filterOrderBy) filterOrderBy.value = "popularity";
      if (filterRating) filterRating.value = "";
      loadInitialTrending();
      if (filterDrawer) filterDrawer.classList.add("select-hide");
      showToast("Filter parameters reset.", "info");
    };
  }

  // Initialize Home Dashboard Core Execution
  loadInitialTrending();
}