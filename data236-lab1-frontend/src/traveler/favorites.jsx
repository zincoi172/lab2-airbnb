import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import "./dashboard.css";
import Layout from "../main/layout";
import AgentFab from "../agent/Agent";
import { useDispatch, useSelector } from "react-redux";
import { toggleFavorite, selectFavorites, setFavorites } from "../features/bookingsSlice";

const API_URL = process.env.REACT_APP_API_URL || "http://localhost:4000/api";

function toFirstImage(photo_urls) {
  let arr = [];
  if (typeof photo_urls === "string") {
    try { arr = JSON.parse(photo_urls); } catch { arr = []; }
  } else if (Array.isArray(photo_urls)) {
    arr = photo_urls;
  }
  if (!arr.length) return "https://via.placeholder.com/640x400?text=No+photo";
  const first = arr[0];
  return typeof first === "string" ? first : first?.url || "https://via.placeholder.com/640x400?text=No+photo";
}

function Favorites() {
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const dispatch = useDispatch();
  const favIds = useSelector(selectFavorites);
  const bookingContext = null;

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`${API_URL}/traveler/favorites`, { credentials: "include" });
        if (!res.ok) {
          if (res.status === 401 || res.status === 403) {
            try { localStorage.setItem("showLogin", "1"); } catch {}
          }
          const err = await res.json().catch(() => ({}));
          throw new Error(err.error || `Failed (${res.status})`);
        }

        const data = await res.json();
        const normalized = (Array.isArray(data) ? data : []).map((p) => ({
          id: p.id,
          name: p.title || "Untitled",
          type: p.type,
          price: p.price_per_night != null ? Number(p.price_per_night) : 0,
          image: toFirstImage(p.photo_urls),
        }));

        setProperties(normalized);
        dispatch(setFavorites(normalized.map((x) => x.id)));
      } catch (err) {
        console.error("Failed to load favorites:", err);
      } finally {
        setLoading(false);
      }
    })();
  }, [dispatch]);

  const toggleFav = async (propertyId) => {
    const isFav = favIds.includes(propertyId);

    dispatch(toggleFavorite(propertyId));

    try {
      const res = await fetch(`${API_URL}/traveler/favorites`, {
        method: isFav ? "DELETE" : "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ property_id: propertyId }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to update favorite");
      }
    } catch (err) {
      dispatch(toggleFavorite(propertyId));
      console.error("Favorite toggle failed:", err);
      alert("Failed to update favorite. Please try again.");
    }
  };

  return (
    <div>
      <Layout />
      <section className="property-carousel container">
        {loading && <div className="py-3">Loading…</div>}
        <div className="carousel-scroll d-flex gap-3 overflow-auto pb-2">
          {properties.map((p) => {
            const isFav = favIds.includes(p.id);
            return (
              <Link
                key={p.id}
                to={`/property/${p.id}`}
                className="text-decoration-none text-dark"
                style={{ flex: "0 0 auto" }}
              >
                <div className="property-card">
                  <div className="img-wrap ratio-16x10">
                    <img src={p.image} alt={p.name} />
                    <span className="pill-badge">Guest favorite</span>
                    <button
                      type="button"
                      className={`fav-btn ${isFav ? "is-active" : ""}`}
                      onClick={(e) => { e.preventDefault(); toggleFav(p.id); }}
                      aria-label={isFav ? "Remove favorite" : "Add favorite"}
                      title={isFav ? "Remove favorite" : "Add favorite"}
                    >
                      {isFav ? "❤️" : "🤍"}
                    </button>
                  </div>

                  <div className="pt-2">
                    <div className="fw-semibold text-truncate">{p.name}</div>
                    <div className="text-muted small">
                      ${p.price} / night · {p.type}
                    </div>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </section>
      <AgentFab bookingContext={bookingContext} />
    </div>
  );
}

export default Favorites;
