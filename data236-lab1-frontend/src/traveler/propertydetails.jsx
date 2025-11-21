import { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Layout from "../main/layout";
import { formatToday } from "../utils/date";
import AgentFab from "../agent/Agent";

import { useDispatch, useSelector } from "react-redux";
import {
  fetchPropertyById,
  selectPropertyDetail,
  selectPropertyLoading,
  selectPropertyError,
  clearPropertyError,
} from "../features/propertiesSlice";
import { toggleFavorite, selectFavorites } from "../features/bookingsSlice";

const API_URL = process.env.REACT_APP_API_URL || "http://localhost:4000/api";

// ---------- utils ----------
function prettyLocation(loc) {
  if (!loc) return "";
  if (typeof loc === "object") {
    const { city, state, country } = loc;
    return [city, state, country].filter(Boolean).join(", ");
  }
  try {
    const o = JSON.parse(loc);
    return [o.city, o.state, o.country].filter(Boolean).join(", ");
  } catch {
    return String(loc);
  }
}

function normalizeProperty(p) {
  const photos = Array.isArray(p?.photo_urls)
    ? p.photo_urls.map((ph) => (typeof ph === "string" ? ph : ph?.url)).filter(Boolean)
    : [];

  return {
    id: p?.id,
    name: p?.title || "Untitled",
    type: p?.type,
    price: p?.price_per_night != null ? Number(p.price_per_night) : 0,
    bedrooms: p?.bedrooms ?? 0,
    bathrooms: p?.bathrooms ?? 0,
    guests: p?.guests ?? 1,
    amenities: Array.isArray(p?.amenities) ? p.amenities : [],
    rating: p?.rating ?? 4.9,
    locationText: prettyLocation(p?.location),
    images: photos.length ? photos : ["https://via.placeholder.com/1280x800?text=No+photo"],
    owner_name: p?.owner_name || null,
    description: p?.description || "",
  };
}

function imgSrc(url) {
  return /^https?:\/\//i.test(url)
    ? url
    : `http://localhost:4000${url?.startsWith("/") ? url : `/${url}`}`;
}

// ---------- component ----------
export default function PropertyDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const detail = useSelector(selectPropertyDetail);
  const loading = useSelector(selectPropertyLoading);
  const error = useSelector(selectPropertyError);

  const favs = useSelector(selectFavorites);

  const [checkin, setCheckin] = useState("");
  const [checkout, setCheckout] = useState("");
  const [guests, setGuests] = useState(1);
  const todayStr = formatToday();

  useEffect(() => {
    dispatch(fetchPropertyById(id));
    return () => {
      dispatch(clearPropertyError());
    };
  }, [dispatch, id]);

  const property = useMemo(() => (detail ? normalizeProperty(detail) : null), [detail]);

  async function handleToggleFav(propertyId) {
    const me = await fetch(`${API_URL}/auth/me`, { credentials: "include" })
      .then((r) => r.json())
      .catch(() => ({}));
    if (!me?.user) {
      alert("Please log in or sign up to add favorites.");
      try {
        localStorage.setItem("showLogin", "1");
      } catch {}
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

  if (loading || !property) return <div className="container py-5">Loading...</div>;
  if (error) return <div className="container py-5 alert alert-danger">{error}</div>;

  const bookingContext = {
    location: property.locationText || "",
    start_date: checkin || "",
    end_date: checkout || "",
    party_type: "family",
    guests: Number(guests || 1),
  };

  const isFav = favs.includes(property.id);

  return (
    <>
      <Layout />
      <div className="container py-4">
        <div className="d-flex align-items-center justify-content-between mb-2">
          <h2 className="fw-bold mb-0">{property.name}</h2>
          <button
            type="button"
            className={`btn btn-sm ${isFav ? "btn-danger" : "btn-outline-danger"}`}
            onClick={() => handleToggleFav(property.id)}
            aria-label={isFav ? "Remove favorite" : "Add favorite"}
            title={isFav ? "Remove favorite" : "Add favorite"}
          >
            {isFav ? "♥ Saved" : "♡ Save"}
          </button>
        </div>

        <p className="text-muted mb-4">
          {property.locationText} · {property.bedrooms} bedrooms · {property.bathrooms} baths
        </p>

        <div id="propertyCarousel" className="carousel slide mb-5" data-bs-ride="carousel">
          <div className="carousel-inner rounded-4 overflow-hidden shadow-sm">
            {property.images.map((img, i) => (
              <div key={i} className={`carousel-item ${i === 0 ? "active" : ""}`}>
                <img
                  src={imgSrc(img)}
                  className="d-block w-100"
                  style={{ objectFit: "cover", height: "480px" }}
                  alt={`property ${i + 1}`}
                />
              </div>
            ))}
          </div>
          {property.images.length > 1 && (
            <>
              <button
                className="carousel-control-prev"
                type="button"
                data-bs-target="#propertyCarousel"
                data-bs-slide="prev"
              >
                <span className="carousel-control-prev-icon"></span>
              </button>
              <button
                className="carousel-control-next"
                type="button"
                data-bs-target="#propertyCarousel"
                data-bs-slide="next"
              >
                <span className="carousel-control-next-icon"></span>
              </button>
            </>
          )}
        </div>

        <div className="row g-5">
          <div className="col-lg-7">
            <h4 className="mb-3">
              Entire {property.type} in {property.locationText}
            </h4>
            <p className="text-muted mb-4">
              {property.guests} guests · {property.bedrooms} bedrooms · {property.bathrooms} baths
            </p>

            <div className="d-flex align-items-center gap-3 border-bottom pb-3 mb-3">
              <img
                src="https://a0.muscache.com/defaults/user_pic-50x50.png?v=3"
                className="rounded-circle"
                alt="Host"
                width="50"
                height="50"
              />
              <div>
                <h6 className="mb-0">Hosted by {property.owner_name || "Your host"}</h6>
              </div>
            </div>

            <p>{property.description}</p>

            <h5 className="mt-4">Amenities</h5>
            <ul>
              {property.amenities.map((a, i) => (
                <li key={i}>{a}</li>
              ))}
            </ul>
          </div>

          <div className="col-lg-5">
            <div className="border rounded-4 p-4 shadow-sm">
              <div className="row g-2 mb-3">
                <div className="col-6">
                  <label className="form-label small mb-1">Check-in</label>
                  <input
                    type="date"
                    className="form-control"
                    value={checkin}
                    min={todayStr}
                    onChange={(e) => setCheckin(e.target.value)}
                  />
                </div>
                <div className="col-6">
                  <label className="form-label small mb-1">Check-out</label>
                  <input
                    type="date"
                    className="form-control"
                    value={checkout}
                    min={checkin || todayStr}
                    onChange={(e) => setCheckout(e.target.value)}
                  />
                </div>
              </div>

              <div className="mb-3">
                <label className="form-label small mb-1">Guests</label>
                <select
                  className="form-select"
                  value={guests}
                  onChange={(e) => setGuests(Number(e.target.value))}
                >
                  {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => (
                    <option key={n} value={n}>
                      {n} guest{n > 1 && "s"}
                    </option>
                  ))}
                </select>
              </div>

              <button
                className="btn btn-danger w-100 rounded-pill py-2"
                onClick={() => {
                  if (!checkin || !checkout) return alert("Please select dates");
                  navigate(
                    `/property/book/${property.id}?checkin=${checkin}&checkout=${checkout}&guests=${guests}`
                  );
                }}
              >
                Check availability
              </button>
            </div>
          </div>
        </div>

        {property && <AgentFab bookingContext={bookingContext} />}
      </div>
    </>
  );
}
