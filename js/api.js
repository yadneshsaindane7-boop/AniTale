const CACHE_KEY_PREFIX = "anitale_anime_";
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

// Fetch anime by id with localStorage cache
export async function getAnimeById(id) {
  if (!id) return null;

  const key = CACHE_KEY_PREFIX + id;
  const now = Date.now();

  // Try localStorage first
  try {
    const raw = localStorage.getItem(key);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && parsed.ts && parsed.anime && now - parsed.ts < CACHE_TTL_MS) {
        return parsed.anime;
      }
    }
  } catch (err) {
    console.warn("Anime cache read error:", err);
  }

  // If not cached or expired, fetch from API
  try {
    const res = await fetch(`https://api.jikan.moe/v4/anime/${id}`);
    const json = await res.json();
    const anime = json.data || null;

    if (anime) {
      try {
        localStorage.setItem(
          key,
          JSON.stringify({
            ts: now,
            anime,
          })
        );
      } catch (err) {
        console.warn("Anime cache write error:", err);
      }
    }

    return anime;
  } catch (err) {
    console.error("Failed to fetch anime:", err);
    return null;
  }
}
