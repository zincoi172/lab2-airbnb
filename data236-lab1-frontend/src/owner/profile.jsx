import { useEffect, useState } from "react";
import Layout from "../main/layout";
import AboutMe from "../main/aboutme";
import OwnerProperties from "./properties";
import "../traveler/profile.css";

function Ownerprofile() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [active, setActive] = useState(() => window.location.hash || "#about");
  const [err, setErr] = useState("");

  // helper to compute active class
  const linkClass = (hash) =>
    `list-group-item list-group-item-action d-flex align-items-center gap-3 ${
      active === hash ? "active" : ""
    }`;

  // fetch profile from server
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("http://localhost:4000/api/profile", {
          credentials: "include",
        });

        if (!res.ok) {
        const text = await res.text().catch(() => "");
        const msg = (() => {
          try { return JSON.parse(text).error || JSON.parse(text).message; } catch { return ""; }
        })();
        throw new Error(msg || `Failed to load profile (HTTP ${res.status})`);
      }

        const data = await res.json();
        setUser((data && (data.profile ?? data)) || null);
      } catch (e) {
        console.error("Failed to load profile:", e);
        setErr(e.response?.data?.error || e.message || "Failed to load");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // manage hash/routing between tabs
  useEffect(() => {
    const onHashChange = () => {
      const h = window.location.hash || "#about";
      // accept only the two supported hashes
      setActive(h === "#properties" ? "#properties" : "#about");
    };
    window.addEventListener("hashchange", onHashChange);
    onHashChange(); // normalize on first render
    return () => window.removeEventListener("hashchange", onHashChange);
  }, []);

  if (loading) {
    return (
      <div className="bg-white min-vh-100 d-flex flex-column">
        <Layout />
        <main className="container py-4 flex-grow-1">Loading…</main>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="bg-white min-vh-100 d-flex flex-column">
        <Layout />
        <main className="container py-4 flex-grow-1">No profile found.</main>
      </div>
    );
  }

  return (
    <div className="bg-white min-vh-100 d-flex flex-column">
      <Layout />

      <main className="container py-4 flex-grow-1">
        <div className="row g-4">
          {/* sidebar — remove duplicate id */}
          <section className="col-12 col-lg-3">
            <div className="profile-sidebar">
              <h4 className="mb-4 fw-semibold">Profile</h4>
              <div className="list-group">
                <a
                  href="#about"
                  className={linkClass("#about")}
                  aria-current={active === "#about" ? "true" : undefined}
                  onClick={() => setActive("#about")}
                >
                  {user.avatar_url ? (
                    <img
                        src={/^https?:\/\//i.test(user.avatar_url)
                        ? user.avatar_url
                        : `http://localhost:4000${user.avatar_url}`} 
                        alt="avatar"
                        className="item-icon rounded-circle"
                        style={{ width: 40, height: 40, objectFit: "cover" }}
                    />
                    ) : (
                    <span className="item-icon rounded-circle bg-dark text-white">
                        {(user.first_name?.[0] || "?").toUpperCase()}
                    </span>
                    )}
                  <span className="fw-medium">About me</span>
                </a>

                <a
                  href="#properties"
                  className={linkClass("#properties")} 
                  aria-current={active === "#properties" ? "true" : undefined}
                  onClick={() => setActive("#properties")}
                >
                  <span className="emoji_style item-icon d-inline-flex align-items-center justify-content-center">
                    🏠
                  </span>
                  <span className="fw-medium">Properties</span>
                </a>
              </div>
            </div>
          </section>

          {/* main content */}
          <section className="col-12 col-lg-9">
            <div id="about" className={active === "#about" ? "" : "d-none"}>
              <AboutMe user={user} />
            </div>
            <div id="properties" className={active === "#properties" ? "" : "d-none"}>
              <OwnerProperties user={user} />
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}

export default Ownerprofile;
