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
      
      // Map Anilist properties (title.english/romaji and status variations)
      const title = item.title?.english || item.title?.romaji || "Unknown Title";
      let status = item.status || "Unknown";
      
      // Format status text cleanly for your CSS tag classes
      if (status === "RELEASING") status = "Currently Airing";
      if (status === "FINISHED") status = "Finished Airing";
      if (status === "NOT_YET_RELEASED") status = "Upcoming";

      let badgeClass = "status-finished";
      if (status.toLowerCase().includes("airing")) badgeClass = "status-airing";
      if (status.toLowerCase().includes("upcoming")) badgeClass = "status-upcoming";

      div.innerHTML = `
        <div class="anime-card-img-wrap">
          <div class="status-tag ${badgeClass}">${status}</div>
          <img src="${item.coverImage?.large || ''}" alt="${title}">
        </div>
        <h2 title="${title}">${title}</h2>
      `;

      div.onclick = () => {
        // Keeps your exact detail routing path intact using the Anilist ID string key
        window.location.href = `anime.html?id=${item.id}`;
      };

      list.appendChild(div);
    });

    try {
      if (typeof setupRevealNow === "function") {
        setupRevealNow();
      }
    } catch (revealError) {
      console.warn("Reveal animation handled gracefully:", revealError);
      document.querySelectorAll(".anime-card.reveal").forEach(card => {
        card.classList.add("visible");
        card.style.opacity = "1";
        card.style.transform = "none";
      });
    }
  }

  // 3. ANILIST METADATA FETCHER ENGINE (GRAPHQL DATA COUPLER)
  async function makeAnilistRequest(searchQuery = null, genre = null, sort = "POPULARITY_DESC") {
    // GraphQL structural query setup definitions
    const query = `
      query ($search: String, $genre: String, $sort: [MediaSort]) {
        Page(page: 1, perPage: 24) {
          media(search: $search, genre: $genre, sort: $sort, type: ANIME, isAdult: false) {
            id
            title {
              romaji
              english
            }
            coverImage {
              large
            }
            status
          }
        }
      }
    `;

    // Map your frontend dropdown filters directly to Anilist strict Enum variants
    let apiSort = "POPULARITY_DESC";
    if (sort === "score" || sort === "members") apiSort = "SCORE_DESC";

    const variables = {};
    if (searchQuery) variables.search = searchQuery;
    if (genre) variables.genre = genre;
    variables.sort = [apiSort];

    const options = {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json",
      },
      body: JSON.stringify({ query, variables })
    };

    const response = await fetch("https://graphql.anilist.co", options);
    if (!response.ok) throw new Error(`Anilist network pipe failure: ${response.status}`);
    
    const json = await response.json();
    return json.data?.Page?.media || [];
  }

  // 4. CORE INITIAL SEASONS HOOK ROUTINES LOAD
  async function loadInitialTrending() {
    if (headingTitle) headingTitle.textContent = "Trending Seasonal Collection";
    
    const cacheKey = "anilist_trending_cache";
    const cacheTimeKey = "anilist_trending_time";
    const cachedData = sessionStorage.getItem(cacheKey);
    const cachedTime = sessionStorage.getItem(cacheTimeKey);

    if (cachedData && cachedTime && (Date.now() - parseInt(cachedTime) < 3600000)) {
      renderCardGrid(JSON.parse(cachedData));
      return;
    }

    try {
      // Fetch fresh trending data instantly using our new setup pipeline rules
      const data = await makeAnilistRequest(null, null, "POPULARITY_DESC");
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

  // 5. SEARCH AND FILTER ROUTINES
  async function executeSearchAndFilter() {
    const queryStr = searchInput ? searchInput.value.trim() : "";
    const genre = filterGenre ? filterGenre.value.trim() : "";
    const orderBy = filterOrderBy ? filterOrderBy.value.trim() : "popularity";

    if (!searchBtn) return;

    searchBtn.disabled = true;
    const originalText = searchBtn.textContent;
    searchBtn.textContent = "...";

    if (queryStr || genre || orderBy !== "popularity") {
      if (headingTitle) headingTitle.textContent = "Filtered Search Results";
    } else {
      searchBtn.disabled = false;
      searchBtn.textContent = originalText;
      loadInitialTrending();
      return;
    }

    try {
      const results = await makeAnilistRequest(queryStr || null, genre || null, orderBy);
      renderCardGrid(results);
    } catch (error) {
      console.error("Anilist Search System error:", error);
      showToast("Error resolving advanced search parameters.", "error");
    } finally {
      searchBtn.disabled = false;
      searchBtn.textContent = originalText;
    }
  }

  // 6. INPUT REGISTRATION EVENT HANDLERS
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

  if (filterGenre) {
    filterGenre.onchange = () => executeSearchAndFilter();
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

  loadInitialTrending();
}