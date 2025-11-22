import React, { useEffect, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { signup, clearAuthError } from "../features/authSlice";
import { useNavigate } from "react-router-dom";

function Signup({ onSignedUp }) {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { loading, error } = useSelector((s) => s.auth);

  const [role, setRole] = useState("Traveler"); // Traveler / Owner
  const [form, setForm] = useState({
    first_name: "",
    last_name: "",
    email: "",
    password: "",
    location: "",
  });

  const signupPromiseRef = useRef(null);

  useEffect(() => {
    const el = document.getElementById("signupModal");
    if (!el) return;

    const handleShown = () => {
      dispatch(clearAuthError());
    };
    const handleHidden = () => {
      dispatch(clearAuthError());
      signupPromiseRef.current?.abort?.();
      signupPromiseRef.current = null;
      setForm({
        first_name: "",
        last_name: "",
        email: "",
        password: "",
        location: "",
      });
      setRole("Traveler");
    };

    el.addEventListener("shown.bs.modal", handleShown);
    el.addEventListener("hidden.bs.modal", handleHidden);
    return () => {
      el.removeEventListener("shown.bs.modal", handleShown);
      el.removeEventListener("hidden.bs.modal", handleHidden);
    };
  }, [dispatch]);

  const onChange = (e) => {
    if (error) dispatch(clearAuthError());
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const onRoleChange = (nextRole) => {
    if (error) dispatch(clearAuthError());
    setRole(nextRole);
  };

  async function handleSubmit(e) {
    e.preventDefault();

    signupPromiseRef.current?.abort?.();

    const payload = {
      first_name: form.first_name,
      last_name: form.last_name,
      email: form.email,
      password: form.password,
      role: role.toLowerCase(),
      ...(role === "Owner" ? { location: form.location } : {}),
    };

    const promise = dispatch(signup(payload));
    signupPromiseRef.current = promise;

    const res = await promise;
    signupPromiseRef.current = null;

    if (res.meta.requestStatus === "fulfilled") {
      const user = res.payload?.user;
      const effectiveRole = user?.role ?? res.payload?.role ?? role.toLowerCase();

      document.querySelector("#signupModal .btn-close")?.click();
      onSignedUp?.(user ?? { role: effectiveRole });

      if (effectiveRole === "owner") navigate("/owner/dashboard", { replace: true });
      else navigate("/traveler/profile", { replace: true });
    }
  }

  const isOwner = role === "Owner";

  return (
    <div className="modal fade" id="signupModal" tabIndex="-1" aria-hidden="true">
      <div className="modal-dialog modal-dialog-centered">
        <div className="modal-content p-3 rounded-3">
          <div className="modal-header border-0">
            <button type="button" className="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
          </div>

          <form className="modal-body" onSubmit={handleSubmit}>
            <h4 className="mb-3">Welcome to Airbnb</h4>

            <div className="d-flex justify-content-center gap-3 mb-3">
              <button
                type="button"
                className={`btn rounded-pill px-4 ${role === "Traveler" ? "btn-danger" : "btn-outline-danger"}`}
                onClick={() => onRoleChange("Traveler")}
              >
                Traveler
              </button>
              <button
                type="button"
                className={`btn rounded-pill px-4 ${isOwner ? "btn-danger" : "btn-outline-danger"}`}
                onClick={() => onRoleChange("Owner")}
              >
                Owner
              </button>
            </div>

            {error && <div className="alert alert-danger">{error}</div>}

            <input
              name="first_name"
              className="form-control mb-3"
              placeholder="First Name"
              value={form.first_name}
              onChange={onChange}
              required
            />
            <input
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
              autoComplete="email"
            />
            <input
              type="password"
              name="password"
              className="form-control mb-3"
              placeholder="Password"
              value={form.password}
              onChange={onChange}
              required
              autoComplete="new-password"
            />

            {isOwner && (
              <input
                name="location"
                className="form-control mb-3"
                placeholder="Location (e.g. Los Angeles, CA)"
                value={form.location}
                onChange={onChange}
                required
              />
            )}

            <button className="btn btn-danger w-100 mb-3" type="submit" disabled={loading}>
              {loading ? "Signing up..." : `Sign up as ${role}`}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

export default Signup;
