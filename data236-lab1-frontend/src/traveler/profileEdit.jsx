import { useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";
import Layout from "../main/layout";

const api = axios.create({
  baseURL: "http://localhost:4000",
  withCredentials: true, 
});

function ProfileEdit({ onSaved }) {
  const [form, setForm] = useState({
    first_name: "",
    last_name: "",
    email: "",
    phone: "",
    about: "",
    city: "",
    state: "",
    country: "United States",
    languages_json: "English",           
    gender: "Prefer not to say",
    avatar_url: null,
  });

  async function uploadToCloudinary(file) {
    const CLOUD_NAME = "dewngnalj"; 
    const UPLOAD_PRESET = "data236-lab"; 

    const fd = new FormData();
    fd.append("file", file);
    fd.append("upload_preset", UPLOAD_PRESET);

    const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`, {
      method: "POST",
      body: fd,
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.error?.message || "Upload failed");

    return data.secure_url; 
  }

  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarUrl, setAvatarUrl] = useState(null);
  const fileRef = useRef(null);

  const [loading, setLoading] = useState(true);

  const initialLetter = useMemo(
    () => (form.first_name?.[0] || "?").toUpperCase(),
    [form.first_name]
  );

    useEffect(() => {
        (async () => {
          try {
            const { data } = await api.get("/api/profile");
            const p = data.profile ?? data; 
            
            const toLabel = (g) => {
              switch ((g || "").toLowerCase()) {
                case "female": return "Female";
                case "male": return "Male";
                case "non-binary": return "Non-binary";
                case "prefer_not_to_say":
                default: return "Prefer not to say";
              }
            };

            setForm({
              first_name: p.first_name || "",
              last_name: p.last_name || "",
              email: p.email || "",
              phone: p.phone || "",
              about: p.about || "",
              city: p.city || "",
              state: (p.state || "").toUpperCase().slice(0, 2),
              country: p.country || "United States",
              languages: Array.isArray(p.languages_json) && p.languages_json.length ? p.languages_json[0] : "English",
              gender: toLabel(p.gender),
              avatar_url: p.avatar_url || null, 
            });
            
            const resolvedAvatar = p.avatar_url ? (/^https?:\/\//i.test(p.avatar_url) ? p.avatar_url : `${api.defaults.baseURL}${p.avatar_url}`) : null;
            setAvatarUrl(resolvedAvatar);
          } catch (e) {
            if (e.response?.status === 401) {
              window.location.replace("/");
              return;
            }
            console.error(e);
            alert("Failed to load profile.");
          } finally {
            setLoading(false);
          }
        })();
      }, []);

  useEffect(() => {
    if (!avatarFile) return;
    const url = URL.createObjectURL(avatarFile);
    setAvatarUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [avatarFile]);

  const countries = [
    "United States",
    "Canada",
    "United Kingdom",
    "Australia",
    "Taiwan",
    "Japan",
    "Korea",
    "Germany",
    "France",
    "Italy",
  ];
  const genders = ["Female", "Male", "Non-binary", "Prefer not to say"];
  const languageOptions = ["English", "Chinese", "Spanish", "French", "Japanese", "Korean"];

  function onChange(e) {
    const { name, value } = e.target;
    if (name === "state") {
      setForm((p) => ({ ...p, state: value.toUpperCase().slice(0, 2) }));
    } else {
      setForm((p) => ({ ...p, [name]: value }));
    }
  }
  function onPickAvatar(e) {
    const f = e.target.files?.[0];
    if (f) setAvatarFile(f);
  }
  function removeAvatar() {
    setAvatarFile(null);
    setAvatarUrl(null);
  }

  async function handleSubmit(e) {
    e.preventDefault();

    try {
      let avatarUrl = form.avatar_url || null;

      if (avatarFile) {
        avatarUrl = await uploadToCloudinary(avatarFile);
      }

      const toEnumGender = (g) => {
        switch ((g || "").toLowerCase()) {
          case "female": return "female";
          case "male": return "male";
          case "non-binary": return "non-binary";
          default: return "prefer_not_to_say";
        }
      };

      const payload = {
        first_name: form.first_name,
        last_name: form.last_name,
        email: form.email,
        phone: form.phone,
        about: form.about,
        city: form.city,
        state: form.state,
        country: form.country,
        gender: toEnumGender(form.gender),
        languages_json: [form.languages].filter(Boolean),
        avatar_url: avatarUrl, 
      };

      const { data } = await api.put("/api/profile", payload, {
        headers: { "Content-Type": "application/json" },
        withCredentials: true,
      });

      if (!data?.ok && !data?.profile) throw new Error("Update failed");
      window.location.replace("/owner/profile");
    } catch (err) {
      console.error(err);
      const msg = err.response?.data?.message || err.message || "Update failed";
      alert(msg);
    }
  }



  if (loading) return <div className="container py-4">Loading…</div>;

  return (
    <div>
      <Layout />
      <form className="container py-4" onSubmit={handleSubmit}>
        <div className="d-flex justify-content-between align-items-center mb-3">
          <h1 className="h3 mb-0">Edit profile</h1>
          <div className="d-flex gap-2">
            <a href="/traveler/profile" className="btn btn-outline-secondary">
              Cancel
            </a>
            <button className="btn btn-dark" type="submit">
              Save
            </button>
          </div>
        </div>

        <div className="row g-4">
          <div className="col-12 col-lg-4 d-flex justify-content-center">
            <div className="position-relative" style={{ width: 260, height: 260 }}>
              {avatarUrl ? (
                <img
                  src={avatarUrl}
                  alt="avatar"
                  className="rounded-circle w-100 h-100"
                  style={{ objectFit: "cover", background: "#111" }}
                />
              ) : (
                <div
                  className="rounded-circle bg-dark text-white d-flex align-items-center justify-content-center w-100 h-100"
                  style={{ fontSize: 160, fontWeight: 700 }}
                  aria-label="avatar placeholder"
                >
                  {initialLetter}
                </div>
              )}

              <div
                className="d-flex gap-2 position-absolute start-50 translate-middle-x"
                style={{ bottom: -14 }}
              >
                <button
                  type="button"
                  className="btn btn-light border rounded-pill shadow-sm px-3"
                  onClick={() => fileRef.current?.click()}
                >
                  📷 Add
                </button>
                {avatarUrl && (
                  <button
                    type="button"
                    className="btn btn-light border rounded-pill shadow-sm px-3"
                    onClick={removeAvatar}
                  >
                    Remove
                  </button>
                )}
              </div>
              <input ref={fileRef} type="file" accept="image/*" hidden onChange={onPickAvatar} />
            </div>
          </div>

          <div className="col-12 col-lg-8">
            <div className="row g-3 mb-3 pb-3 border-bottom">
              <div className="col-md-6">
                <label className="form-label">First name</label>
                <input
                  className="form-control"
                  name="first_name"
                  value={form.first_name}
                  onChange={onChange}
                  required
                />
              </div>
              <div className="col-md-6">
                <label className="form-label">Last name</label>
                <input
                  className="form-control"
                  name="last_name"
                  value={form.last_name}
                  onChange={onChange}
                />
              </div>
            </div>

            <div className="row g-3 mb-3 pb-3 border-bottom">
              <div className="col-md-6">
                <label className="form-label">Email</label>
                <input
                  type="email"
                  className="form-control"
                  name="email"
                  value={form.email}
                  onChange={onChange}
                  required
                />
              </div>
              <div className="col-md-6">
                <label className="form-label">Phone number</label>
                <input
                  type="tel"
                  className="form-control"
                  name="phone"
                  value={form.phone}
                  onChange={onChange}
                  placeholder="+1 123 456 7890"
                />
              </div>
            </div>

            <div className="mb-3 pb-3 border-bottom">
              <label className="form-label">About me</label>
              <textarea
                className="form-control"
                rows={4}
                name="about"
                value={form.about}
                onChange={onChange}
                placeholder="Write something fun and punchy."
              />
            </div>

            <div className="row g-3 mb-3 pb-3 border-bottom">
              <div className="col-md-4">
                <label className="form-label">City</label>
                <input className="form-control" name="city" value={form.city} onChange={onChange} />
              </div>
              <div className="col-md-4">
                <label className="form-label">State (abbr.)</label>
                <input
                  className="form-control"
                  name="state"
                  maxLength={2}
                  value={form.state}
                  onChange={onChange}
                  placeholder="CA"
                />
                <div className="form-text">Use 2-letter abbreviation, e.g., CA, NY</div>
              </div>
              <div className="col-md-4">
                <label className="form-label">Country</label>
                <select className="form-select" name="country" value={form.country} onChange={onChange}>
                  {countries.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="row g-3 mb-4">
              <div className="col-md-6">
                <label className="form-label">Languages</label>
                <select className="form-select" name="languages" value={form.languages} onChange={onChange}>
                  {languageOptions.map((l) => (
                    <option key={l} value={l}>
                      {l}
                    </option>
                  ))}
                </select>
              </div>
              <div className="col-md-6">
                <label className="form-label">Gender</label>
                <select className="form-select" name="gender" value={form.gender} onChange={onChange}>
                  {genders.map((g) => (
                    <option key={g} value={g}>
                      {g}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}

export default ProfileEdit;