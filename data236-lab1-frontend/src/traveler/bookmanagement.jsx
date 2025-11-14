import { useEffect, useMemo, useState } from "react";
import { useParams, useSearchParams, useNavigate, Link } from "react-router-dom";
import Layout from "../main/layout";

function diffNights(checkin, checkout) {
  if (!checkin || !checkout) return 0;
  const a = new Date(checkin + "T00:00:00");
  const b = new Date(checkout + "T00:00:00");
  const ms = b - a;
  return Math.max(0, Math.round(ms / (1000 * 60 * 60 * 24)));
}

function toFirstImage(photo_urls) {
  if (!Array.isArray(photo_urls) || !photo_urls.length) {
    return "https://via.placeholder.com/640x400?text=No+photo";
  }
  const first = photo_urls[0];
  return typeof first === "string"
    ? first
    : first?.url || "https://via.placeholder.com/640x400?text=No+photo";
}

export default function BookingRequest() {
  const { id } = useParams();
  const [sp] = useSearchParams();
  const navigate = useNavigate();

  const [property, setProperty] = useState(null);
  const [payOption, setPayOption] = useState("pay_now");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  const checkin = sp.get("checkin") || "";
  const checkout = sp.get("checkout") || "";
  const guests = Number(sp.get("guests") || 1);

  const nights = useMemo(() => diffNights(checkin, checkout), [checkin, checkout]);
  const pricePerNight = property?.price || 0;
  const subtotal = nights * pricePerNight;
  const taxes = Math.round(subtotal * 0.0975 * 100) / 100;
  const total = Math.round((subtotal + taxes) * 100) / 100;

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`http://localhost:4000/api/properties/${id}`, {
          credentials: "include",
        });
        if (!res.ok) throw new Error("Failed to load property");
        const p = await res.json();

        const normalized = {
          id: p.id,
          name: p.title || "Untitled",
          price: p.price_per_night != null ? Number(p.price_per_night) : 0,
          image: toFirstImage(p.photo_urls),
          rating: p.rating ?? 4.9,
        };
        setProperty(normalized);
      } catch (e) {
        console.error(e);
        setErr("Failed to load property information.");
      }
    })();
  }, [id]);

  async function submitBooking() {
    setErr("");
    if (!checkin || !checkout) {
      setErr("Please select check-in and check-out dates.");
      return;
    }
    if (diffNights(checkin, checkout) <= 0) {
      setErr("Check-out must be after check-in.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("http://localhost:4000/api/traveler/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          property_id: Number(id),
          start_date: checkin,
          end_date: checkout,
          guests,
          pay_option: payOption,
        }),
      });

      if (res.status === 401 || res.status === 403) {
        localStorage.setItem("showLogin", "1");
        navigate("/");
        return;
      }
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Booking failed");
      }

      navigate(`/traveler/profile#past-trips`);
    } catch (e) {
      console.error(e);
      setErr(e.message);
    } finally {
      setLoading(false);
    }
  }

  if (!property)
    return (
      <>
        <Layout />
        <div className="container py-5">Loading…</div>
      </>
    );

  return (
    <>
      <Layout />
      <div className="container py-4">
        <div className="d-flex align-items-center gap-3 mb-3">
          <Link to={-1} className="btn btn-light rounded-circle p-2" aria-label="back">
            ←
          </Link>
          <h2 className="mb-0 fw-bold">Request to book</h2>
        </div>

        <div className="row g-4">
          <div className="col-lg-7">
            <div className="border rounded-4 p-4 mb-3 shadow-sm">
              <h5 className="fw-bold mb-3">1. Choose when to pay</h5>

              <div
                className={`border rounded-3 p-3 mb-3 ${
                  payOption === "pay_now" ? "border-dark" : ""
                }`}
                role="button"
                onClick={() => setPayOption("pay_now")}
              >
                <div className="form-check">
                  <input
                    className="form-check-input"
                    type="radio"
                    name="pay"
                    checked={payOption === "pay_now"}
                    readOnly
                  />
                  <label className="form-check-label ms-2">Pay ${total.toFixed(2)} now</label>
                </div>
              </div>

              <div
                className={`border rounded-3 p-3 ${
                  payOption === "pay_part" ? "border-dark" : ""
                }`}
                role="button"
                onClick={() => setPayOption("pay_part")}
              >
                <div className="form-check">
                  <input
                    className="form-check-input"
                    type="radio"
                    name="pay"
                    checked={payOption === "pay_part"}
                    readOnly
                  />
                  <label className="form-check-label ms-2">Pay part now, part later</label>
                </div>
                <div className="text-muted small ms-4">
                  ${(total / 2).toFixed(2)} now, remaining on check-in.
                </div>
              </div>
            </div>

            <div className="border rounded-4 p-4 mb-3 shadow-sm">
              <h5 className="fw-bold mb-3">2. Add a payment method</h5>
              <input className="form-control" placeholder="Card number (mock)" />
            </div>

            <div className="border rounded-4 p-4 mb-3 shadow-sm">
              <h5 className="fw-bold mb-3">3. Write a message to the host</h5>
              <textarea
                className="form-control"
                rows={3}
                placeholder="Say hello to your host…"
              />
            </div>

            {err && <div className="alert alert-danger">{err}</div>}
          </div>

          <div className="col-lg-5">
            <div className="border rounded-4 p-4 shadow-sm">
              <div className="d-flex gap-3 mb-3">
                <img
                  src={property.image}
                  alt={property.name}
                  width="96"
                  height="96"
                  className="rounded-3"
                  style={{ objectFit: "cover" }}
                />
                <div>
                  <div className="fw-semibold">{property.name}</div>
                  <div className="text-muted small">★ {property.rating} · Superhost</div>
                </div>
              </div>

              <div className="border-top pt-3 small">
                <div className="d-flex justify-content-between">
                  <span className="text-muted">Dates</span>
                  <span>
                    {checkin} – {checkout}
                  </span>
                </div>
                <div className="d-flex justify-content-between">
                  <span className="text-muted">Guests</span>
                  <span>
                    {guests} {guests > 1 ? "guests" : "guest"}
                  </span>
                </div>
              </div>

              <div className="border-top pt-3 mt-3">
                <div className="d-flex justify-content-between">
                  <span>
                    {nights} night{nights > 1 ? "s" : ""} × ${pricePerNight.toFixed(2)}
                  </span>
                  <span>${subtotal.toFixed(2)}</span>
                </div>
                <div className="d-flex justify-content-between">
                  <span>Taxes</span>
                  <span>${taxes.toFixed(2)}</span>
                </div>
                <hr />
                <div className="d-flex justify-content-between fw-bold">
                  <span>Total USD</span>
                  <span>${total.toFixed(2)}</span>
                </div>
                <div className="form-text">Free cancellation within 24 hours of booking.</div>
              </div>
            </div>

            <button
              className="btn btn-danger w-100 rounded-pill py-3 mt-3 fs-5"
              disabled={loading}
              onClick={submitBooking}
            >
              {loading ? "Submitting..." : "Request to book"}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
