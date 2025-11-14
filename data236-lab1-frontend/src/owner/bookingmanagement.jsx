import { useEffect, useState } from "react";
import axios from "axios";
import Layout from "../main/layout";

function BookingManagement() {
  const [list, setList] = useState([]);
  const [filter, setFilter] = useState(""); // '', 'pending','accepted','cancelled'
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  function fmtDate(isoLike) {
    if (!isoLike) return "";
    const d = new Date(isoLike);
    return d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
  }
  function uiStatus(s) {
    const m = String(s || "").toUpperCase();
    if (m === "ACCEPTED") return "Accepted";
    if (m === "CANCELLED") return "Cancelled";
    return "Pending";
  }
  function badgeClass(statusUi) {
    if (statusUi === "Accepted") return "text-bg-success";
    if (statusUi === "Cancelled") return "text-bg-secondary";
    return "text-bg-warning";
  }

  async function load() {
    setLoading(true);
    setErr("");
    try {
      const q = new URLSearchParams();
      if (filter) q.set("status", filter.toUpperCase()); 
      const url = `http://localhost:4000/api/owner/bookings${q.toString() ? `?${q.toString()}` : ""}`;

      const { data } = await axios.get(url, { withCredentials: true });

      const normalized = (Array.isArray(data) ? data : []).map((b) => ({
        id: b.id,
        propertyId: b.property_id,
        propertyTitle: b.property?.title || b.property?.name || null,
        checkin: fmtDate(b.start_date),
        checkout: fmtDate(b.end_date),
        guests: b.guests ?? 1,
        status: uiStatus(b.status),
      }));

      setList(normalized);
    } catch (e) {
      setErr(e.response?.data?.error || e.message || "Failed to load bookings");
      setList([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [filter]);

  async function act(id, action) { // action: 'accept' | 'cancel'
    try {
      await axios.post(
        `http://localhost:4000/api/owner/bookings/${id}/${action}`,
        {},
        { withCredentials: true }
      );
      load();
    } catch (e) {
      alert(e.response?.data?.error || `Failed to ${action} booking`);
    }
  }

  return (
    <div className="bg-white min-vh-100">
      <Layout />
      <main className="container py-4">
        <div className="d-flex justify-content-between align-items-center mb-3">
          <h2 className="mb-0">Booking requests</h2>
        </div>

        {loading && <div>Loading…</div>}
        {err && <div className="alert alert-danger">{err}</div>}

        {!loading && !err && (
          <div className="list-group">
            {list.length === 0 && (
              <div className="list-group-item text-muted">No bookings.</div>
            )}

            {list.map((b) => (
              <div key={b.id} className="list-group-item d-flex justify-content-between align-items-center">
                <div>
                  <div className="fw-semibold">
                    {b.propertyTitle || `#${b.propertyId}`}
                  </div>
                  <div className="text-muted small">
                    {b.checkin} → {b.checkout} • {b.guests} guest{b.guests > 1 ? "s" : ""}
                  </div>
                </div>
                <div className="d-flex align-items-center gap-2">
                  <span className={`badge ${badgeClass(b.status)}`}>{b.status}</span>
                  {b.status === "Pending" && (
                    <>
                      <button className="btn btn-sm btn-outline-success" onClick={() => act(b.id, "accept")}>
                        Accept
                      </button>
                      <button className="btn btn-sm btn-outline-danger" onClick={() => act(b.id, "cancel")}>
                        Cancel
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
export default  BookingManagement;