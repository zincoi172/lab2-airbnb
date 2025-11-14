import './layout.css';
import Login from '../main/login';
import Signup from '../main/signup';
import { useLocation, Link, useNavigate } from "react-router-dom";
import { useEffect, useState, useMemo } from "react";
import { formatToday } from '../utils/date';

function Layout() {
  const location = useLocation();
  const nav = useNavigate();                 
  const todayStr = formatToday();

  const [me, setMe] = useState(null);
  const [where, setWhere] = useState("");
  const [checkin, setCheckin] = useState("");
  const [checkout, setCheckout] = useState("");
  const [guests, setGuests] = useState("");
  const [loadingMe, setLoadingMe] = useState(true);

  const hideSearch = useMemo(() => location.pathname.startsWith("/owner"), [location.pathname]);

  useEffect(() => {
    const f = localStorage.getItem("showLogin");
    if (f === "1" && window.bootstrap) {
        localStorage.removeItem("showLogin");
        const el = document.getElementById("loginModal");
        if (el) {
        const modal = new window.bootstrap.Modal(el);
        modal.show();
        }
    }
    }, []);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("http://localhost:4000/api/auth/me", {
          credentials: "include",
        });
        const data = await res.json();
        setMe(data.user);
      } catch (e) {
        console.error(e);
      } finally {
        setLoadingMe(false);
      }
    })();
  }, []);

  async function logout() {
    try {
      await fetch("http://localhost:4000/api/auth/logout", {
        method: "POST",
        credentials: "include",
      });
      setMe(null);
      window.location.replace("/");
    } catch (e) {
      console.error(e);
    }
  }
  function onSearch(e) {
    e.preventDefault();
    const params = new URLSearchParams();
    if (where.trim()) params.set("location", where.trim());
    if (checkin) params.set("startDate", checkin);
    if (checkout) params.set("endDate", checkout);
    if (guests) params.set("guests", String(guests));

    nav(`/${params.toString() ? `?${params.toString()}` : ""}`);
  }
  const isOwner = me?.role === "owner";

  return (
    <nav className="navbar navbar-expand-lg navbar-light bg-white border-bottom">
      <div className="container">
        <div className="row w-100 align-items-center">          
        {isOwner ? (
          <div className="col-4 col-lg-3">
            <Link className="navbar-brand d-flex align-items-center" to="/owner/dashboard">
              <img src="/Airbnb_Logo.png" alt="Airbnb logo" height="32" className="mr-1" />
            </Link>
          </div>):(
            <div className="col-4 col-lg-3">
            <Link className="navbar-brand d-flex align-items-center" to="/">
              <img src="/Airbnb_Logo.png" alt="Airbnb logo" height="32" className="mr-1" />
            </Link>
          </div>
          )}

          <div className="col-4 d-lg-none d-flex justify-content-center">
            <button
              className="navbar-toggler"
              type="button"
              data-bs-toggle="collapse"
              data-bs-target="#abnbNav"
              aria-controls="abnbNav"
              aria-expanded="false"
              aria-label="Toggle navigation"
            >
              <span className="navbar-toggler-icon"></span>
            </button>
          </div>

          <div className="col-12 col-lg-6 d-flex justify-content-center" style={{ position: "relative", zIndex: 2 }}>
            <form
              className={`abnb-search-pill d-flex align-items-center mx-auto ${hideSearch ? "invisible" : ""}`}
              aria-hidden={hideSearch ? "true" : "false"}
              onSubmit={onSearch}
            >
              <label className="abnb-seg">
                <span className="abnb-seg-title">Where</span>
                <input className="abnb-seg-input" value={where} type="text" onChange={(e) => setWhere(e.target.value)} placeholder="Search destinations" />
              </label>

              <span className="abnb-divider"></span>

              <label className="abnb-seg">
                <span className="abnb-seg-title">Check in</span>
                <input className="abnb-seg-input" value={checkin} onChange={(e) => setCheckin(e.target.value)}  type="date" min={todayStr} placeholder="Add dates" />
              </label>

              <span className="abnb-divider"></span>

              <label className="abnb-seg">
                <span className="abnb-seg-title">Check out</span>
                <input className="abnb-seg-input" onChange={(e) => setCheckout(e.target.value)}  value={checkout} type="date" min={checkin || todayStr} placeholder="Add dates" />
              </label>

              <span className="abnb-divider"></span>

              <label className="abnb-seg">
                <span className="abnb-seg-title">Who</span>
                <input className="abnb-seg-input" onChange={(e) => setGuests(e.target.value)}   value={guests}  type="number" placeholder="Add guests" />
              </label>

              <button type="submit" className="abnb-go">
                <svg viewBox="0 0 24 24" width="18" height="18" fill="#fff">
                  <path d="M11 4a7 7 0 105.3 12l4 4 1.4-1.4-4-4A7 7 0 0011 4zm0 2a5 5 0 110 10A5 5 0 0111 6z" />
                </svg>
              </button>
            </form>
          </div>

          <div className="col-8 col-lg-3 d-flex justify-content-end">
            <div className="collapse navbar-collapse justify-content-end" id="abnbNav">
              <ul className="navbar-nav align-items-center gap-2">
                <li className="nav-item dropdown">
                  <button
                    className="abnb-profile-toggle dropdown-toggle p-1 d-flex align-items-center nav-link"
                    id="profileMenu"
                    type="button"
                    data-bs-toggle="dropdown"
                    aria-expanded="false"
                  >
                    {me ? (
                      <span
                        className="d-inline-flex justify-content-center align-items-center"
                        style={{ width: 28, height: 28, fontSize: 12, fontWeight: 700 }}
                        aria-label="avatar"
                      >
                        👤
                      </span>
                    ) : (
                      <svg viewBox="0 0 32 32" width="20" height="20" className="mr-2" fill="#755">
                        <path d="M6 10h20v2H6zm0 6h20v2H6zm0 6h12v2H6z"></path>
                      </svg>
                    )}
                  </button>

                  <div className="dropdown-menu dropdown-menu-end" aria-labelledby="profileMenu" style={{ minWidth: 220 }}>
                    {!me ? (
                      <>
                        {!isOwner}
                        <button className="dropdown-item" type="button" data-bs-toggle="modal" data-bs-target="#loginModal">
                          Log in
                        </button>
                        <button className="dropdown-item" type="button" data-bs-toggle="modal" data-bs-target="#signupModal">
                          Sign up
                        </button>
                        <div className="dropdown-divider"></div>
                        <a className="dropdown-item" href="#">Help Center</a>
                      </>
                    ) : (
                      isOwner ? (
                        <>
                          <div className="dropdown-header">{me.first_name} {me.last_name} (Host)</div>
                          <a className="dropdown-item" href="/owner/profile">Profile</a>
                          <a className="dropdown-item" href="/owner/bookings">Bookings</a>
                          <div className="dropdown-divider"></div>
                          <button className="dropdown-item" onClick={logout}>Log out</button>
                        </>
                      ) : (
                        <>
                          <div className="dropdown-header">{me.first_name} {me.last_name}</div>
                          <a className="dropdown-item" href="/traveler/profile">Profile</a>
                          <a className="dropdown-item" href="/traveler/profile#past-trips">Trips</a>
                          <a className="dropdown-item" href="/traveler/favorites">Favourites</a>
                          <div className="dropdown-divider"></div>
                          <button className="dropdown-item" onClick={logout}>Log out</button>
                        </>
                      )
                    )}
                  </div>
                </li>
              </ul>
            </div>
          </div>
        </div>

        <Login onLoggedIn={(user) => setMe(user)} />
        <Signup onSignedUp={(user) => setMe(user)} />
      </div>
    </nav>
  );
}

export default Layout;
