import { useEffect, useMemo } from "react";
import { Link, useSearchParams } from "react-router-dom";
import "./dashboard.css";
import Layout from "../main/layout";

import { useDispatch, useSelector } from "react-redux";
import {
  fetchProperties,
  selectPropertyList,
  selectPropertyLoading,
  selectPropertyError,
} from "../features/propertiesSlice";
import { toggleFavorite, selectFavorites } from "../features/bookingsSlice";

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

export default function TravelerDashboard() {
  const [sp] = useSearchParams();
  const dispatch = useDispatch();

  const list = useSelector(selectPropertyList);
  const loading = useSelector(selectPropertyLoading);
  const error = useSelector(selectPropertyError);
  const favs = useSelector(selectFavorites);

  const q = useMemo(() => {
    const location = (sp.get("location") || "").trim();
    const startDate = sp.get("startDate") || "";
    const endDate = sp.get("endDate") || "";
    const guests = sp.get("guests") || "";
    return { location, startDate, endDate, guests };
  }, [sp]);

  useEffect(() => {
    const params = {
      location: q.location,
      startDate: q.startDate,
      endDate: q.endDate,
      guests: q.guests,
    };
    dispatch(fetchProperties(params));
  }, [dispatch, q.location, q.startDate, q.endDate, q.guests]);

  async function handleToggleFav(propertyId) {
    const me = await fetch(`${API_URL}/auth/me`, { credentials: "include" })
      .then(r => r.json()).catch(() => ({}));
    if (!me?.user) {
      alert("Please log in or sign up to add favorites.");
      try { localStorage.setItem("showLogin", "1"); } catch {}
      return;
    }

    dispatch(toggleFavorite(propertyId));

    try {
      const res = await fetch(`${API_URL}/traveler/favorites`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ property_id: propertyId }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to update favorite");
      }
    } catch (e) {
      dispatch(toggleFavorite(propertyId));
      console.error("Favorite toggle failed:", e);
      alert("Failed to update favorite. Please try again.");
    }
  }

  return (
    <div>
      <Layout />
      <section className="container py-3">
        {loading && <div>Loading…</div>}
        {error && <div className="alert alert-danger">{error}</div>}

        <div className="row g-3">
          {list.map((p) => {
            const image = toFirstImage(p.photo_urls);
            const isFav = favs.includes(p.id);
            return (
              <div key={p.id} className="col-12 col-sm-6 col-lg-3">
                <Link
                  to={`/property/${p.id}`}
                  className="text-decoration-none text-dark d-block h-100"
                >
                  <div className="property-card h-100">
                    <div className="img-wrap ratio-16x10 position-relative">
                      <img
                        src={image}
                        alt={p.title || "Untitled"}
                        className="w-100 h-100"
                        style={{ objectFit: "cover", borderRadius: 12 }}
                      />
                      <span className="pill-badge">Guest favorite</span>
                      <button
                        type="button"
                        className={`fav-btn ${isFav ? "is-active" : ""}`}
                        onClick={(e) => {
                          e.preventDefault();
                          handleToggleFav(p.id);
                        }}
                        aria-label={isFav ? "Remove favorite" : "Add favorite"}
                        title={isFav ? "Remove favorite" : "Add favorite"}
                      >
                        {isFav ? "❤️" : "🤍"}
                      </button>
                    </div>

                    <div className="pt-2">
                      <div className="fw-semibold text-truncate">{p.title || "Untitled"}</div>
                      <div className="text-muted small">
                        ${p.price_per_night != null ? Number(p.price_per_night) : 0} / night · {p.type}
                      </div>
                    </div>
                  </div>
                </Link>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
