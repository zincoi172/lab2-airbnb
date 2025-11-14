import { useEffect, useState } from "react";
import axios from "axios";
import "./Agent.css";

const USE_MOCK = false; 

export default function AgentPanel({ bookingContext, onClose }) {
  const [form, setForm] = useState({
    useCurrentBooking: true,
    location: bookingContext?.location || "",
    start_date: bookingContext?.start_date || "",
    end_date: bookingContext?.end_date || "",
    party_type: bookingContext?.party_type || "family",
    guests: bookingContext?.guests || 2,
    budget: "medium",
    interests: "beach, museum",
    mobility_needs: "",
    dietary: "vegan",
    nlu_query: ""
  });
  const [loading, setLoading] = useState(false);
  const [resp, setResp] = useState(null);
  const [err, setErr] = useState("");

  useEffect(() => {
    const saved = localStorage.getItem("agent_prefs");
    if (saved) {
      try { setForm(prev => ({ ...prev, ...JSON.parse(saved) })); } catch {}
    }
  }, []);

  function update(k, v) {
    setForm(prev => {
      const next = { ...prev, [k]: v };
      localStorage.setItem("agent_prefs", JSON.stringify({
        budget: next.budget,
        interests: next.interests,
        mobility_needs: next.mobility_needs,
        dietary: next.dietary
      }));
      return next;
    });
  }

  async function submit(e) {
    e.preventDefault();
    setErr(""); setLoading(true); setResp(null);

    const payload = {
      booking: form.useCurrentBooking ? {
        location: bookingContext?.location || form.location,
        start_date: bookingContext?.start_date || form.start_date,
        end_date: bookingContext?.end_date || form.end_date,
        party_type: bookingContext?.party_type || form.party_type,
        guests: bookingContext?.guests || Number(form.guests || 1),
      } : {
        location: form.location,
        start_date: form.start_date,
        end_date: form.end_date,
        party_type: form.party_type,
        guests: Number(form.guests || 1),
      },
      preferences: {
        budget: form.budget,
        interests: form.interests.split(",").map(s => s.trim()).filter(Boolean),
        mobility_needs: form.mobility_needs.split(",").map(s => s.trim()).filter(Boolean),
        dietary: form.dietary.split(",").map(s => s.trim()).filter(Boolean),
      },
      nlu_query: form.nlu_query || undefined
    };

    try {
      const url = "http://localhost:8001/api/ai/concierge";
      const data = USE_MOCK ? await mockCall(payload)
                           : (await axios.post(url, payload, { withCredentials: true })).data;

      // safety: make sure keys exist 
     setResp({
       plan: Array.isArray(data?.plan) ? data.plan : [],
       activities: Array.isArray(data?.activities) ? data.activities : [],
       restaurants: Array.isArray(data?.restaurants) ? data.restaurants : [],
       packing_checklist: Array.isArray(data?.packing_checklist) ? data.packing_checklist : [],
     });
    } catch (e) {
      setErr(e?.response?.data?.message || e.message || "Failed to fetch plan");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="agent-overlay" role="dialog" aria-modal="true">
      <div className="agent-drawer">
        <div className="d-flex justify-content-between align-items-center mb-3">
          <h5 className="mb-0">AI Concierge</h5>
          <button className="btn-close" onClick={onClose} aria-label="Close" />
        </div>

        <form onSubmit={submit} className="agent-form">
          <div className="form-check mb-2">
            <input
              className="form-check-input"
              type="checkbox"
              checked={form.useCurrentBooking}
              onChange={(e) => update("useCurrentBooking", e.target.checked)}
              id="useCurrentBooking"
            />
            <label className="form-check-label" htmlFor="useCurrentBooking">
              Use my current booking context
            </label>
          </div>

          {!form.useCurrentBooking && (
            <>
              <div className="row g-2">
                <div className="col-12">
                  <label className="form-label">Location</label>
                  <input className="form-control" value={form.location} onChange={e=>update("location", e.target.value)} />
                </div>
                <div className="col-6">
                  <label className="form-label">Check-in</label>
                  <input type="date" className="form-control" value={form.start_date} onChange={e=>update("start_date", e.target.value)} />
                </div>
                <div className="col-6">
                  <label className="form-label">Check-out</label>
                  <input type="date" className="form-control" value={form.end_date} onChange={e=>update("end_date", e.target.value)} />
                </div>
                <div className="col-6">
                  <label className="form-label">Party type</label>
                  <select className="form-select" value={form.party_type} onChange={e=>update("party_type", e.target.value)}>
                    <option>solo</option><option>couple</option><option>family</option><option>friends</option>
                  </select>
                </div>
                <div className="col-6">
                  <label className="form-label">Guests</label>
                  <input type="number" min="1" className="form-control" value={form.guests} onChange={e=>update("guests", e.target.value)} />
                </div>
              </div>
            </>
          )}

          <div className="row g-2 mt-2">
            <div className="col-6">
              <label className="form-label">Budget</label>
              <select className="form-select" value={form.budget} onChange={e=>update("budget", e.target.value)}>
                <option>low</option><option>medium</option><option>high</option>
              </select>
            </div>
            <div className="col-6">
              <label className="form-label">Dietary</label>
              <input className="form-control" placeholder="vegan, no-nuts" value={form.dietary} onChange={e=>update("dietary", e.target.value)} />
            </div>
            <div className="col-12">
              <label className="form-label">Interests</label>
              <input className="form-control" placeholder="beach, museum" value={form.interests} onChange={e=>update("interests", e.target.value)} />
            </div>
            <div className="col-12">
              <label className="form-label">Mobility needs</label>
              <input className="form-control" placeholder="wheelchair, stroller" value={form.mobility_needs} onChange={e=>update("mobility_needs", e.target.value)} />
            </div>
            <div className="col-12">
              <label className="form-label">Free-text ask (NLU)</label>
              <textarea className="form-control" rows={2} placeholder="we're vegan, two kids, no long hikes" value={form.nlu_query} onChange={e=>update("nlu_query", e.target.value)} />
            </div>
          </div>

          <button className="btn btn-danger w-100 mt-3" disabled={loading}>
            {loading ? "Planning…" : "Generate plan"}
          </button>
        </form>

        {err && <div className="alert alert-danger mt-3">{err}</div>}

        {resp && (
          <div className="agent-results mt-3">
            <h6>Itinerary</h6>
            {resp.plan?.map(day => (
              <div key={day.date} className="mb-3 p-2 rounded border">
                <div className="fw-semibold mb-1">{day.date}</div>
                <div className="small">
                  <div><b>Morning:</b> {day.blocks?.morning?.join(" • ") || "-"}</div>
                  <div><b>Afternoon:</b> {day.blocks?.afternoon?.join(" • ") || "-"}</div>
                  <div><b>Evening:</b> {day.blocks?.evening?.join(" • ") || "-"}</div>
                </div>
              </div>
            ))}

            <h6 className="mt-3">Activities</h6>
            {resp.activities?.map((a,i) => (
              <div key={i} className="p-2 border rounded mb-2 small">
                <div className="fw-semibold">{a.title} <span className="text-muted">{a.price_tier}</span></div>
                <div>{a.address}</div>
                <div>{a.tags?.join(" · ")}</div>
                <div>{a.wheelchair_friendly ? "♿︎ " : ""}{a.child_friendly ? "👶 " : ""}{a.duration_min ? `• ${a.duration_min} min` : ""}</div>
              </div>
            ))}

            <h6 className="mt-3">Restaurants</h6>
            {resp.restaurants?.map((r,i)=>(
              <div key={i} className="p-2 border rounded mb-2 small">
                <div className="fw-semibold">{r.name} <span className="text-muted">{r.price_tier}</span></div>
                <div>{r.address}</div>
                <div>{r.diet_tags?.join(", ")}</div>
                {r.notes && <div className="text-muted">{r.notes}</div>}
              </div>
            ))}

            <h6 className="mt-3">Packing checklist</h6>
            <ul className="small mb-0">
              {resp.packing_checklist?.map((item,i)=><li key={i}>{item}</li>)}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}

/* ---- Mock 回應（後端尚未完成時用） ---- */
async function mockCall(payload) {
  await new Promise(r => setTimeout(r, 800));
  return {
    plan: [
      { date: payload.booking.start_date, blocks:{
        morning: ["Aquarium of the Pacific (child-friendly)"],
        afternoon: ["Shoreline Village • 2h"],
        evening: ["Beach sunset stroll"]
      }},
      { date: payload.booking.end_date, blocks:{
        morning: ["Naples Island gondola"],
        afternoon: ["Museum of Latin American Art"],
        evening: ["Pine Ave dinner"]
      }}
    ],
    activities: [
      { title:"Aquarium of the Pacific", address:"100 Aquarium Way", price_tier:"$$", duration_min:120, tags:["family","indoor"], wheelchair_friendly:true, child_friendly:true }
    ],
    restaurants: [
      { name:"Seabirds Kitchen", diet_tags:["vegan"], address:"Long Beach, CA", price_tier:"$$", notes:"kid-friendly" }
    ],
    packing_checklist: ["Light jacket", "Sunscreen", "Water bottle", "Comfortable shoes"]
  };
}
