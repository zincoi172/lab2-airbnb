import Layout from "../main/layout";
import { useEffect, useState } from "react";
import axios from "axios";

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
    return "";
  }
}

function OwnerProperties() {
  const [list, setList] = useState([]);   
  const [loading, setLoading] = useState(true);

  useEffect(()=>{
    (async ()=>{
      try{
        const { data } = await axios.get("http://localhost:4000/api/owner/dashboard", {
          withCredentials: true
        });

        console.log("Raw property data:", data.myProperties);

        const normalized = (data.myProperties || []).map(p => {
          const photos = Array.isArray(p.photo_urls) ? p.photo_urls : [];
          const firstUrl = photos.length
            ? (typeof photos[0] === "string" ? photos[0] : photos[0].url)
            : "https://via.placeholder.com/192x192?text=No+photo";

          const propertyId = p.id || p._id || p.property_id;
          console.log("Property ID:", propertyId);

          return {
            id: propertyId,
            name: p.title || "Untitled",
            type: p.type,
            price: p.price_per_night != null ? Number(p.price_per_night) : 0,
            bedrooms: p.bedrooms ?? null,
            bathrooms: p.bathrooms ?? null,
            amenities: Array.isArray(p.amenities) ? p.amenities : [],
            locationText: prettyLocation(p.location),
            photo: firstUrl,
          };
        });

        setList(normalized);
      } catch(err) {
        console.error("Error loading properties:", err);
      } finally {
        setLoading(false);
      }
    })();
  },[]);

  if (loading) return (
    <div className="bg-white min-vh-100">
      <main className="container py-4">
        Loading…
      </main>
    </div>
  );

  return (
    <div className="px-4">
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h2 className="mb-0">My properties</h2>
        <a href="/owner/properties/new" className="btn btn-outline-secondary rounded-pill px-4">
          + New property
        </a>
      </div>

      {list.length === 0 && (
        <div className="card p-4 d-flex align-items-center justify-content-center" style={{ borderRadius: 12 }}>
          <p className="text-muted mb-2">You don't have any properties yet.</p>
          <a href="/owner/properties/new" className="btn btn-dark rounded-pill px-4">
            Create your first listing
          </a>
        </div>
      )}

      <div className="vstack gap-3">
        {list.map((p) => (
          <div key={p.id} className="card p-4" style={{ borderRadius: 12 }}>
            <div className="d-flex align-items-center gap-3 flex-wrap">
              <div className="position-relative" style={{ width: 96, height: 96, borderRadius: 12, overflow: "hidden" }}>
                <img
                  src={p.photo}
                  alt={p.name}
                  width="96"
                  height="96"
                  style={{ objectFit: "cover" }}
                />
              </div>

              <div className="flex-grow-1">
                <h5 className="mb-1">{p.name}</h5>
                <div className="text-muted small">
                  {p.type} · ${p.price}/night
                  {p.bedrooms != null && ` · ${p.bedrooms} bd`}
                  {p.bathrooms != null && ` · ${p.bathrooms} ba`}
                  {p.locationText && ` · ${p.locationText}`}
                </div>
                {!!(p.amenities?.length) && (
                  <div className="text-muted small mt-1">
                    Amenities: {p.amenities.slice(0, 3).join(", ")}
                    {p.amenities.length > 3 && " …"}
                  </div>
                )}
              </div>

              <div className="d-flex gap-2">
                <a
                  href={`/owner/properties/${p.id}/edit`}
                  className="btn btn-outline-secondary rounded-pill px-4"
                  onClick={(e) => {
                    console.log("Navigating to edit with ID:", p.id);
                  }}
                >
                  Edit
                </a>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default OwnerProperties;

