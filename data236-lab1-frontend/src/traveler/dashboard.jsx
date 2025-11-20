import { useEffect, useState, useMemo } from "react";
import { Link, useSearchParams } from "react-router-dom";  
import "./dashboard.css";
import Layout from "../main/layout";

function TravelerDashboard() {
  const [sp] = useSearchParams();
  const [properties, setProperties] = useState([]);
  const [favorites, setFavorites] = useState([]);

  const q = useMemo(() => {
    const location = (sp.get("location") || "").trim();
    const startDate = sp.get("startDate") || "";
    const endDate = sp.get("endDate") || "";
    const guests = sp.get("guests") || "";
    return { location, startDate, endDate, guests };
  }, [sp]);

  const bookingContext = null;
  useEffect(() => {
    const locationQ = sp.get("location") || "";
    const startDate = sp.get("startDate") || "";
    const endDate = sp.get("endDate") || "";

    let url = "http://localhost:4000/api/properties/search";
    const qs = new URLSearchParams();
    if (locationQ) qs.set("location", locationQ);
    if (startDate && endDate) {
        qs.set("startDate", startDate);
        qs.set("endDate", endDate);
    }
    if (qs.toString()) url += `?${qs.toString()}`;

    fetch(url)
      .then((res) => res.json())
      .then((data) => {
        const toFirstImage = (photo_urls) => {
            let arr = [];
            if(typeof photo_urls === "string"){
                try { 
                    arr = JSON.parse(photo_urls);
                }catch{
                    arr = [];
                }
            }else if(Array.isArray(photo_urls)){
                arr = photo_urls;
            }
            if(!arr.length)
                return "https://via.placeholder.com/640x400?text=No+photo";
            const first = arr[0];
            return typeof first === "string" ? first : first?.url || "https://via.placeholder.com/640x400?text=No+photo";
        };
        const normalized = (Array.isArray(data) ? data : []).map((p) => ({
          id: p._id || p.id,  // ← FIXED: Try _id first, then fallback to id
          name: p.title || "Untitled", 
          type: p.type,
          price: p.price_per_night != null ? Number(p.price_per_night) : 0,
          image: toFirstImage(p.photo_urls),
        }));
        setProperties(normalized);
      })
      .catch((err) => console.error("Failed to load properties:", err));
  }, [q.location, q.startDate, q.endDate]);

  const toggleFav = async (propertyId) => {
    const resCheck = await fetch("http://localhost:4000/api/auth/me", {
        credentials: "include",
    });
    const data = await resCheck.json().catch(() => ({}));
    if (!data.user) {
        alert("Please log in or sign up to add favorites.");
        localStorage.setItem("showLogin", "1");
        return;
    }
    try {
      setFavorites((prev) =>
        prev.includes(propertyId)
          ? prev.filter((x) => x !== propertyId)
          : [...prev, propertyId]
      );

      const res = await fetch("http://localhost:4000/api/traveler/favorites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ property_id: propertyId }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `Failed to update favorite`);
      }
    } catch (err) {
      console.error("Favorite toggle failed:", err);
      alert("Failed to update favorite. Please try again.");

      setFavorites((prev) =>
        prev.includes(propertyId)
          ? prev.filter((x) => x !== propertyId)
          : [...prev, propertyId]
      );
    }
  };


  return (
    <div>
      <Layout />
      <section className="container py-3">
        <div className="row g-3">
            {properties.map((p) => (
            <div key={p.id} className="col-12 col-sm-6 col-lg-3">
                <Link
                to={`/property/${p.id}`}
                className="text-decoration-none text-dark d-block h-100"
                >
                <div className="property-card h-100">
                    <div className="img-wrap ratio-16x10 position-relative">
                    <img
                        src={p.image}
                        alt={p.name}
                        className="w-100 h-100"
                        style={{ objectFit: "cover", borderRadius: 12 }}
                    />
                    <span className="pill-badge">Guest favorite</span>
                    <button
                        type="button"
                        className={`fav-btn ${favorites.includes(p.id) ? "is-active" : ""}`}
                        onClick={(e) => {
                        e.preventDefault(); 
                        toggleFav(p.id);
                        }}
                        aria-label={favorites.includes(p.id) ? "Remove favorite" : "Add favorite"}
                        title={favorites.includes(p.id) ? "Remove favorite" : "Add favorite"}
                    >
                        {favorites.includes(p.id) ? "❤️" : "🤍"}
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
            </div>
            ))}
        </div>
        </section>
    </div>
  );
}

export default TravelerDashboard;