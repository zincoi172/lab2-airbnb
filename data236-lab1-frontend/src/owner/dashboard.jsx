import { useEffect, useState } from "react";
import axios from "axios";
import Layout from "../main/layout";

function OwnerDashboard(){
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  useEffect(()=>{
    (async ()=>{
      try{
        const {data} = await axios.get("http://localhost:4000/api/owner/dashboard", {withCredentials:true});
        const stats = {
          properties: data.counts?.properties ?? 0,
          pending: data.counts?.bookings?.PENDING ?? 0,
          upcoming: data.counts?.bookings?.ACCEPTED ?? 0,
        };

        const recentBookings = Array.isArray(data.recentBookings) ? data.recentBookings : [];
        setData({ stats, recentBookings});
      }finally{
        setLoading(false); }
    })();
  },[]);
  if(loading) return <Layout><div className="container py-4">Loading…</div></Layout>;
  if(!data) return <Layout><div className="container py-4">No data</div></Layout>;

  return (
    <div className="bg-white min-vh-100">
      <Layout/>
      <main className="container py-4">
        <h2 className="mb-4">Host dashboard</h2>
        <div className="row g-3">
          <div className="col-md-3"><Stat label="My Properties" value={data.stats.properties}/></div>
          <div className="col-md-3"><Stat label="Pending requests" value={data.stats.pending}/></div>
          <div className="col-md-3"><Stat label="Upcoming" value={data.stats.upcoming}/></div>
        </div>

        <h5 className="mt-4">Recent booking requests</h5>
        <div className="list-group">
          {data.recentBookings.map(b=>(
            <div key={b.id} className="list-group-item d-flex justify-content-between align-items-center">
              <div>
                <div className="fw-semibold">{b.title} • {b.traveler_name} • {b.status}</div>
                <div className="text-muted small">{b.checkin} → {b.checkout} • {b.guests} guest(s)</div>
              </div>
              <a className="btn btn-sm btn-outline-secondary" href={`/owner/bookings`}>Manage</a>
            </div>
          ))}
        </div>

      </main>
    </div>
  );
}
function Stat({label,value}){ return (
  <div className="p-3 border rounded-3">
    <div className="display-6">{value}</div>
    <div className="text-muted">{label}</div>
  </div>
);}

export default OwnerDashboard;