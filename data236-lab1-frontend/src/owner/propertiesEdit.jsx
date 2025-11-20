import { useEffect, useState } from "react";
import axios from "axios";
import Layout from "../main/layout";
import { useNavigate, useParams } from "react-router-dom";

function PropertyForm() {
  const nav = useNavigate();
  const { id } = useParams();
  const editing = !!id;

  console.log("PropertyForm - ID from params:", id); // DEBUG

  const [form, setForm] = useState({
    title: "",
    type: "Entire Home",
    price_per_night: 0,
    bedrooms: 0,
    bathrooms: 0,
    description: "",
    amenities: [],
    location: { city: "", state: "", country: "United States" },
    photo_urls: [],
  });

  const [files, setFiles] = useState([]);
  const [previews, setPreviews] = useState([]);
  const [loading, setLoading] = useState(false);

  // --- helpers ---
  function parseLocation(loc) {
    if (!loc) return { city: "", state: "", country: "United States" };
    if (typeof loc === "object") return { 
      city: loc.city || "", 
      state: (loc.state || "").toUpperCase().slice(0,2), 
      country: loc.country || "United States" 
    };
    try {
      const o = JSON.parse(loc);
      return {
        city: o.city || "",
        state: (o.state || "").toUpperCase().slice(0, 2),
        country: o.country || "United States",
      };
    } catch {
      return { city: "", state: "", country: "United States" };
    }
  }

  function normalizePhotos(arr) {
    if (!Array.isArray(arr)) return [];
    return arr.map((p) =>
      typeof p === "string" ? { url: p, key: null } : { url: p.url, key: p.key ?? null }
    );
  }

  async function uploadToCloudinary(files) {
    const CLOUD_NAME = "dewngnalj";
    const UPLOAD_PRESET = "data236-lab";
    const out = [];
    for (const file of files) {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("upload_preset", UPLOAD_PRESET);
      const r = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`, {
        method: "POST",
        body: fd,
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error?.message || "upload failed");
      out.push({ url: data.secure_url, key: data.public_id });
    }
    return out;
  }

  // --- load when editing ---
  useEffect(() => {
    if (!editing) {
      console.log("Not editing, skipping load");
      return;
    }

    if (!id || id === "undefined") {
      console.error("Invalid property ID:", id);
      alert("Invalid property ID. Redirecting to dashboard.");
      nav("/owner/dashboard");
      return;
    }

    console.log("Loading property with ID:", id);
    setLoading(true);

    (async () => {
      try {
        const { data } = await axios.get(
          `http://localhost:4000/api/owner/properties/${id}`,
          { withCredentials: true }
        );
        
        console.log("Loaded property data:", data);

        if (!data) {
          throw new Error("No property data returned");
        }

        setForm({
          title: data.title || "",
          type: data.type || "Entire Home",
          price_per_night: data.price_per_night != null ? Number(data.price_per_night) : 0,
          bedrooms: data.bedrooms ?? 0,
          bathrooms: data.bathrooms ?? 0,
          description: data.description || "",
          amenities: Array.isArray(data.amenities) ? data.amenities : [],
          location: parseLocation(data.location),
          photo_urls: normalizePhotos(data.photo_urls),
        });
      } catch (err) {
        console.error("Error loading property:", err);
        if (err.response?.status === 403) {
          alert("You don't have permission to edit this property. Please log in again.");
        } else if (err.response?.status === 404) {
          alert("Property not found.");
        } else {
          alert("Failed to load property: " + (err.response?.data?.message || err.message));
        }
        nav("/owner/dashboard");
      } finally {
        setLoading(false);
      }
    })();
  }, [editing, id, nav]);

  // --- handlers ---
  function onChange(e) {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value }));
  }

  function onPickFiles(e) {
    const selected = Array.from(e.target.files || []);
    setFiles(selected);
    previews.forEach((url) => URL.revokeObjectURL(url));
    const urls = selected.map((file) => URL.createObjectURL(file));
    setPreviews(urls);
  }

  async function onSubmit(e) {
    e.preventDefault();

    if (editing && (!id || id === "undefined")) {
      alert("Invalid property ID");
      return;
    }

    try {
      setLoading(true);

      // 1) upload newly picked files
      const newlyUploaded = files.length ? await uploadToCloudinary(files) : [];

      // 2) merge existing + new photos
      const existing = normalizePhotos(form.photo_urls);
      const photo_urls = [...existing, ...newlyUploaded];

      // 3) build payload
      const payload = {
        title: form.title,
        type: form.type,
        price_per_night: Number(form.price_per_night),
        bedrooms: Number(form.bedrooms),
        bathrooms: Number(form.bathrooms),
        description: form.description,
        amenities: form.amenities,
        location: JSON.stringify(form.location),
        photo_urls,
      };

      console.log("Submitting payload:", payload);

      if (editing) {
        console.log("PUT to:", `http://localhost:4000/api/owner/properties/${id}`);
        await axios.put(
          `http://localhost:4000/api/owner/properties/${id}`,
          payload,
          { 
            withCredentials: true, 
            headers: { "Content-Type": "application/json" } 
          }
        );
      } else {
        console.log("POST to:", "http://localhost:4000/api/owner/properties");
        await axios.post(
          "http://localhost:4000/api/owner/properties",
          payload,
          { 
            withCredentials: true, 
            headers: { "Content-Type": "application/json" } 
          }
        );
      }

      alert("Property saved successfully!");
      nav("/owner/dashboard");
    } catch (err) {
      console.error("Save error:", err);
      console.error("Error response:", err.response?.data);
      
      if (err.response?.status === 403) {
        alert("You don't have permission to edit this property. Please log in again.");
      } else {
        alert("Failed to save property: " + (err.response?.data?.message || err.message));
      }
    } finally {
      setLoading(false);
    }
  }

  if (loading && editing) {
    return (
      <div className="bg-white min-vh-100">
        <Layout />
        <main className="container py-4">
          <p>Loading property...</p>
        </main>
      </div>
    );
  }

  return (
    <div className="bg-white min-vh-100">
      <Layout />
      <main className="container py-4">
        <div className="d-flex justify-content-between align-items-center mb-3">
          <h2 className="mb-0">{editing ? "Edit property" : "New property"}</h2>
          <div className="d-flex gap-2">
            <a className="btn btn-outline-secondary" href="/owner/profile#properties">
              Cancel
            </a>
            <button 
              className="btn btn-dark" 
              onClick={onSubmit}
              disabled={loading}
            >
              {loading ? "Saving..." : "Save"}
            </button>
          </div>
        </div>

        <div className="row g-3">
          <div className="col-md-8">
            <label className="form-label">Property name</label>
            <input
              className="form-control mb-3"
              name="title"
              value={form.title}
              onChange={onChange}
            />

            <label className="form-label">Description</label>
            <textarea
              className="form-control mb-3"
              rows={5}
              name="description"
              value={form.description}
              onChange={onChange}
            />

            {/* existing photos */}
            {form.photo_urls?.length > 0 && (
              <>
                <div className="form-label">Existing photos</div>
                <div className="d-flex flex-wrap gap-2 mb-3">
                  {form.photo_urls.map((p, i) => (
                    <div
                      key={i}
                      className="position-relative"
                      style={{
                        width: 120,
                        height: 120,
                        borderRadius: 8,
                        overflow: "hidden",
                      }}
                    >
                      <img
                        src={typeof p === "string" ? p : p.url}
                        alt={`existing-${i}`}
                        className="w-100 h-100"
                        style={{ objectFit: "cover" }}
                      />
                      <button
                        type="button"
                        className="btn btn-sm btn-danger position-absolute top-0 end-0"
                        style={{
                          transform: "translate(25%, -25%)",
                          borderRadius: "50%",
                          lineHeight: "1",
                          padding: "2px 6px",
                        }}
                        onClick={() =>
                          setForm((f) => ({
                            ...f,
                            photo_urls: f.photo_urls.filter((_, idx) => idx !== i),
                          }))
                        }
                        aria-label="Remove existing photo"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              </>
            )}

            {/* pick new photos */}
            <label className="form-label">Add photos</label>
            <input className="form-control" type="file" multiple onChange={onPickFiles} />
            {previews.length > 0 && (
              <div className="d-flex flex-wrap gap-2 mt-3">
                {previews.map((src, i) => (
                  <div key={i} className="position-relative" style={{ width: 120, height: 120 }}>
                    <img
                      src={src}
                      alt={`preview-${i}`}
                      className="rounded shadow-sm"
                      style={{ width: "100%", height: "100%", objectFit: "cover" }}
                    />
                    <button
                      type="button"
                      className="btn btn-sm btn-danger position-absolute top-0 end-0"
                      style={{ transform: "translate(25%, -25%)" }}
                      onClick={() => {
                        setFiles((f) => f.filter((_, idx) => idx !== i));
                        setPreviews((p) => p.filter((_, idx) => idx !== i));
                      }}
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="col-md-4">
            <label className="form-label">Type</label>
            <select className="form-select mb-3" name="type" value={form.type} onChange={onChange}>
              <option>Entire Home</option>
              <option>Private Room</option>
              <option>Shared Room</option>
            </select>

            <label className="form-label">Price (per night)</label>
            <input
              className="form-control mb-3"
              type="number"
              name="price_per_night"
              value={form.price_per_night}
              onChange={onChange}
            />

            <div className="row">
              <div className="col">
                <label className="form-label">Bedrooms</label>
                <input
                  className="form-control mb-3"
                  type="number"
                  name="bedrooms"
                  value={form.bedrooms}
                  onChange={onChange}
                />
              </div>
              <div className="col">
                <label className="form-label">Bathrooms</label>
                <input
                  className="form-control mb-3"
                  type="number"
                  name="bathrooms"
                  value={form.bathrooms}
                  onChange={onChange}
                />
              </div>
            </div>

            <label className="form-label">Amenities (comma separated)</label>
            <textarea
              className="form-control mb-3"
              rows={3}
              value={form.amenities.join(", ")}
              placeholder="Kitchen, Wifi"
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  amenities: e.target.value
                    .split(",")
                    .map((s) => s.trim())
                    .filter(Boolean),
                }))
              }
            />

            <label className="form-label">Location</label>
            <div className="row">
              <div className="col">
                <input
                  className="form-control mb-2"
                  placeholder="City"
                  value={form.location.city}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, location: { ...f.location, city: e.target.value } }))
                  }
                />
              </div>
              <div className="col">
                <input
                  className="form-control mb-2"
                  placeholder="State (abbr.)"
                  value={form.location.state}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      location: {
                        ...f.location,
                        state: e.target.value.toUpperCase().slice(0, 2),
                      },
                    }))
                  }
                />
              </div>
            </div>
            <select
              className="form-select"
              value={form.location.country}
              onChange={(e) =>
                setForm((f) => ({ ...f, location: { ...f.location, country: e.target.value } }))
              }
            >
              {["United States", "Canada", "United Kingdom", "Australia", "Taiwan", "Japan"].map(
                (c) => (
                  <option key={c}>{c}</option>
                )
              )}
            </select>
          </div>
        </div>
      </main>
    </div>
  );
}

export default PropertyForm;