import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";

export default function ProtectedRoute({ children, role }) {
  const [me, setMe] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await fetch("http://localhost:4000/api/auth/me", {
          credentials: "include",
        });
        const data = await res.json();
        if (!alive) return;
        setMe(data.user || null);
      } catch (e) {
        if (!alive) return;
        setMe(null);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, []);

  if (loading) {
    return <div className="container py-5">Checking authentication…</div>;
  }

  if (!me) {
    localStorage.setItem("showLogin", "1");
    return <Navigate to="/" replace />;
  }

  if (role && me.role !== role) {
    return <Navigate to="/" replace />;
  }

  return children;
}
