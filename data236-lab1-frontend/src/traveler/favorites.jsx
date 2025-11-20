import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import "./dashboard.css";
import Layout from "../main/layout";
import AgentFab from "../agent/Agent";

function Favorites() {
  const [properties, setProperties] = useState([]);
  const [favorites, setFavorites] = useState([]);
  const bookingContext = null;

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("http://localhost:4000/api/traveler/favorites", {
          credentials: "include",
        });

        if (!res.ok) {
          if (res.status === 401 || res.status === 403) {
            localStorage.setItem("showLogin", "1");
          }
          const err = await res.json().catch(() => ({}));
          throw new Error(err.error || `Failed (${res.status})`);
        }

        const data = await res.json();

        const toFirstImage = (photo_urls) => {
          let arr = [];
          if (typeof photo_urls === "string") {
            try { arr = JSON.parse(photo_urls); } catch { arr = []; }
          } else if (Array.isArray(photo_urls)) {
            arr = photo_urls;
          }
          if (!arr.length) return "https://via.placeholder.com/640x400?text=No+photo";
          const first = arr[0];
          return typeof first === "string" ? first : first?.url || "https://via.placeholder.com/640x400?text=No+photo";
        };

        const normalized = (Array.isArray(data) ? data : []).map((p) => ({
          id: p._id || p.id,
          name: p.title || "Untitled",
          type: p.type,
          price: p.price_per_night != null ? Number(p.price_per_night) : 0,
          image: toFirstImage(p.photo_urls),
        }));

        setProperties(normalized);
        setFavorites(normalized.map((x) => x.id));
      } catch (err) {
        console.error("Failed to load properties:", err);
      }
    })();
  }, []);

  const toggleFav = async (propertyId) => {
    const isFav = favorites.includes(propertyId);

    // optimistic UI
    setFavorites((prev) =>
      isFav ? prev.filter((x) => x !== propertyId) : [...prev, propertyId]
    );

    try {
      const res = await fetch(
        `http://localhost:4000/api/traveler/favorites`,
        {
          method: isFav ? "DELETE" : "POST", 
          headers: {"Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ property_id: propertyId }),
        }
      );

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to update favorite");
      }
    } catch (err) {
      // rollback
      setFavorites((prev) =>
        isFav ? [...prev, propertyId] : prev.filter((x) => x !== propertyId)
      );
      console.error("Favorite toggle failed:", err);
      alert("Failed to update favorite. Please try again.");
    }
  };

  return (
    <div>
      <Layout />
      <section className="property-carousel container">
        <div className="carousel-scroll d-flex gap-3 overflow-auto pb-2">
          {properties.map((p) => {
            const isFav = favorites.includes(p.id); 
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
                      onClick={(e) => {
                        e.preventDefault(); 
                        toggleFav(p.id);
                      }}
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
