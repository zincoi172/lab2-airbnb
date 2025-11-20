import { useEffect, useState, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";

function fmtDateISOToLocal(s) {
  if (!s) return "";
  const d = new Date(s);
  return d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}
function diffNightsISO(startISO, endISO) {
  if (!startISO || !endISO) return 0;
  const a = new Date(startISO);
  const b = new Date(endISO);
  const ms = b.setHours(0,0,0,0) - a.setHours(0,0,0,0);
  return Math.max(0, Math.round(ms / (1000 * 60 * 60 * 24)));
}
function toTitleCaseStatus(s) {
  const map = { PENDING: "Pending", ACCEPTED: "Accepted", CANCELLED: "Cancelled" };
  return map[String(s || "").toUpperCase()] || "Pending";
}
function statusClass(s) {
  switch (s) {
    case "Accepted":  return "badge text-bg-success";
    case "Cancelled": return "badge text-bg-secondary";
    case "Pending":   return "badge text-bg-warning";
    default:          return "badge text-bg-light";
  }
}
function firstImage(photo_urls) {
  if (!Array.isArray(photo_urls) || !photo_urls.length) return null;
  const first = photo_urls[0];
  return typeof first === "string" ? first : first?.url || null;
}
function imgSrc(url) {
  if (!url) return "https://via.placeholder.com/640x400?text=No+photo";
  return /^https?:\/\//i.test(url) ? url : `http://localhost:4000${url.startsWith("/") ? url : `/${url}`}`;
}
function canCancel(status, checkinISO) {
  const s = String(status);
  if (s === "Pending") return true;
  if (s === "Accepted") {
    const today = new Date(); today.setHours(0,0,0,0);
    const cin = new Date(checkinISO); cin.setHours(0,0,0,0);
    return cin > today;
  }
  return false;
}

async function fetchJSON(url, opts = {}, { onAuthFail } = {}) {
  const res = await fetch(url, { credentials: "include", ...opts });
  if (res.status === 401 || res.status === 403) {
    try { localStorage.setItem("showLogin", "1"); } catch {}
    if (onAuthFail) onAuthFail();
    throw new Error("Unauthorized");
  }
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || `Request failed (${res.status})`);
  }
  return res.json();
}

export default function PastTrips() {
  const nav = useNavigate();
  const [items, setItems] = useState([]);  // normalized bookings
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState({}); // { [bookingId]: true }

  useEffect(() => {
    (async () => {
      try {
        const bookingsData = await fetchJSON(
          "http://localhost:4000/api/traveler/bookings",
          {},
          { onAuthFail: () => nav("/") }
        );

        const rows = Array.isArray(bookingsData)
          ? bookingsData
          : Array.isArray(bookingsData?.bookings)
          ? bookingsData.bookings
          : bookingsData
          ? [bookingsData]
          : [];

        const enriched = await Promise.all(
          rows.map(async (b) => {
            let prop = null;
            try {
              const p = await fetchJSON(
                `http://localhost:4000/api/properties/${b.property_id}`,
                {},
                { onAuthFail: () => nav("/") }
              );
              prop = {
                id: p._id || p.id,
                name: p.title || "Listing",
                price_per_night: p.price_per_night != null ? Number(p.price_per_night) : null,
                image: firstImage(p.photo_urls),
              };
            } catch (_) {
            }

            const nights = diffNightsISO(b.start_date, b.end_date);
            const price = prop?.price_per_night || 0;
            const subtotal = nights * price;
            const taxes = Math.round(subtotal * 0.0975 * 100) / 100;
            const total = Math.round((subtotal + taxes) * 100) / 100;

            return {
              id: b._id || b.id,
              property_id: b.property_id,
              status: toTitleCaseStatus(b.status),
              checkin: b.start_date,
              checkout: b.end_date,
              guests: Number(b.guests || 1),
              nights,
              total,
              property: prop,
            };
          })
        );

        setItems(enriched);
      } catch (e) {
        setErr(e.message || "Failed to load bookings");
      } finally {
        setLoading(false);
      }
    })();
  }, [nav]);

  const hasTrips = useMemo(() => items.length > 0, [items]);

  async function cancelBooking(id) {
    setBusy((m) => ({ ...m, [id]: true }));
    const prev = items;
    // optimistic UI
    setItems((list) => list.map((b) => (b.id === id ? { ...b, status: "Cancelled" } : b)));

    try {
      await fetchJSON(
        `http://localhost:4000/api/traveler/bookings/${id}/cancel`,
        { method: "POST", headers: { "Content-Type": "application/json" } },
        { onAuthFail: () => nav("/") }
      );
    } catch (e) {
      // rollback
      setItems(prev);
      alert(e.message || "Cancel failed");
    } finally {
      setBusy((m) => {
        const cpy = { ...m };
        delete cpy[id];
        return cpy;
      });
    }
  }

  if (loading) return <div className="text-muted">Loading trips…</div>;
  if (err) return <div className="alert alert-danger">{err}</div>;
  if (!hasTrips)
    return (
      <div className="text-center p-5 border rounded-4 bg-light-subtle">
        <h5 className="mb-2">No trips yet</h5>
        <p className="text-muted mb-3">When you take a trip, it’ll appear here.</p>
        <Link className="btn btn-dark rounded-pill px-4" to="/">Start exploring</Link>
      </div>
    );

  return (
    <div className="vstack gap-3">
      {items.map((b) => {
        const p = b.property || {};
        const img = imgSrc(p.image);
        const cancellable = canCancel(b.status, b.checkin);
        return (
          <div key={b.id} className="card border-0 shadow-sm rounded-4">
            <div className="card-body">
              <div className="row g-3 align-items-center">
                <div className="col-auto">
                  <img
                    src={img}
                    alt={p.name}
                    width="96"
                    height="96"
                    className="rounded-3"
                    style={{ objectFit: "cover" }}
                  />
                </div>

                <div className="col">
                  <div className="d-flex align-items-center gap-2 flex-wrap">
                    <h6 className="mb-0">{p.name || "Listing"}</h6>
                    <span className={statusClass(b.status)}>{b.status}</span>
                  </div>
                  <div className="text-muted small mt-1">
                    {fmtDateISOToLocal(b.checkin)} – {fmtDateISOToLocal(b.checkout)}
                    {" · "}
                    {b.nights} night{b.nights > 1 ? "s" : ""}
                    {" · "}
                    {b.guests} guest{b.guests > 1 ? "s" : ""}
                  </div>
                </div>

                <div className="col-auto text-end">
                  <div className="fw-semibold">${b.total.toFixed(2)}</div>
                  <div className="text-muted small">Total</div>
                  <div className="mt-2 d-flex gap-2 justify-content-end">
                    <Link
                      className="btn btn-outline-secondary btn-sm rounded-pill"
                      to={`/property/${p.id}`}
                    >
                      View place
                    </Link>

                    {cancellable && (
                      <button
                        className="btn btn-outline-danger btn-sm rounded-pill"
                        disabled={!!busy[b.id]}
                        onClick={() => cancelBooking(b.id)}
                      >
                        {busy[b.id] ? "Cancelling…" : "Cancel"}
                      </button>
                    )}
                  </div>
                </div>

              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
