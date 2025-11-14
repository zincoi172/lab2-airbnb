import React, { useState } from "react";

function Signup({ onSignedUp }) {
  const [role, setRole] = useState("Traveler"); // Traveler / Owner
  const [form, setForm] = useState({
    first_name: "",
    last_name:"",
    email: "",
    password: "",
    location: "",
  });
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

  function onChange(e) {
    setForm({ ...form, [e.target.name]: e.target.value });
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setErr("");
    setLoading(true);

    try {
      const endpoint = "http://localhost:4000/api/auth/signup";

      const payload = {
        first_name: form.first_name,
        last_name: form.last_name,
        email: form.email,
        password: form.password,
        role: role.toLowerCase(),
        ...(role === "Owner" ? { location: form.location } : {}),
      };

      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Signup failed");

      document.querySelector("#signupModal .btn-close")?.click();
      onSignedUp?.(data.user);

      if (data.user?.role === "owner") {
        window.location.replace("/owner/dashboard");
      } else {
        window.location.replace("/traveler/profile");
      }
    } catch (e) {
      setErr(e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className="modal fade"
      id="signupModal"
      tabIndex="-1"
      aria-labelledby="signupModalLabel"
      aria-hidden="true"
    >
      <div className="modal-dialog modal-dialog-centered">
        <div className="modal-content p-3 rounded-3">
          <div className="modal-header border-0">
            <button
              type="button"
              className="btn-close"
              data-bs-dismiss="modal"
              aria-label="Close"
            ></button>
          </div>

          <form className="modal-body" onSubmit={handleSubmit}>
            <h4 className="mb-3">Welcome to Airbnb</h4>

            <div className="d-flex justify-content-center gap-3 mb-3">
              <button
                type="button"
                className={`btn rounded-pill px-4 ${
                  role === "Traveler" ? "btn-danger" : "btn-outline-danger"
                }`}
                onClick={() => setRole("Traveler")}
              >
                Traveler
              </button>
              <button
                type="button"
                className={`btn rounded-pill px-4 ${
                  role === "Owner" ? "btn-danger" : "btn-outline-danger"
                }`}
                onClick={() => setRole("Owner")}
              >
                Owner
              </button>
            </div>

            {err && <div className="alert alert-danger">{err}</div>}

            <input
              type="text"
              name="first_name"
              className="form-control mb-3"
              placeholder="First Name"
              value={form.first_name}
              onChange={onChange}
              required
            />
            <input
              type="text"
              name="last_name"
              className="form-control mb-3"
              placeholder="Last Name"
              value={form.last_name}
              onChange={onChange}
              required
            />
            <input
              type="email"
              name="email"
              className="form-control mb-3"
              placeholder="Email"
              value={form.email}
              onChange={onChange}
              required
            />
            <input
              type="password"
              name="password"
              className="form-control mb-3"
              placeholder="Password"
              value={form.password}
              onChange={onChange}
              required
            />

            {role === "Owner" && (
              <input
                type="text"
                name="location"
                className="form-control mb-3"
                placeholder="Location (e.g. Los Angeles, CA)"
                value={form.location}
                onChange={onChange}
                required
              />
            )}

            <button
              className="btn btn-danger w-100 mb-3"
              type="submit"
              disabled={loading}
            >
              {loading ? "Signing up..." : `Sign up as ${role}`}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

export default Signup;
