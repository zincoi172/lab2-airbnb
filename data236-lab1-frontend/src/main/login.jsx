import React, { useEffect, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { login, clearAuthError } from "../features/authSlice";
import { useNavigate } from "react-router-dom";

function Login({ onLoggedIn }) {
  const dispatch = useDispatch();
  const { loading, error } = useSelector((s) => s.auth);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const navigate = useNavigate();
  const loginPromiseRef = useRef(null); 

  useEffect(() => {
    const el = document.getElementById("loginModal");
    if (!el) return;

    const handleShown = () => {
      dispatch(clearAuthError());
    };
    const handleHidden = () => {
      dispatch(clearAuthError());
      loginPromiseRef.current?.abort?.();
      loginPromiseRef.current = null;
      setEmail("");
      setPassword("");
    };

    el.addEventListener("shown.bs.modal", handleShown);
    el.addEventListener("hidden.bs.modal", handleHidden);

    return () => {
      el.removeEventListener("shown.bs.modal", handleShown);
      el.removeEventListener("hidden.bs.modal", handleHidden);
    };
  }, [dispatch]);

  const onEmailChange = (e) => {
    if (error) dispatch(clearAuthError());
    setEmail(e.target.value);
  };
  const onPasswordChange = (e) => {
    if (error) dispatch(clearAuthError());
    setPassword(e.target.value);
  };

  async function handleSubmit(e) {
    e?.preventDefault?.();
    loginPromiseRef.current?.abort?.();

    const promise = dispatch(login({ email, password }));
    loginPromiseRef.current = promise;

    const res = await promise;
    loginPromiseRef.current = null; 

    if (res.meta.requestStatus === "fulfilled") {
      const user = res.payload?.user;
      const role = user?.role ?? res.payload?.role;

      document.querySelector("#loginModal .btn-close")?.click();

      onLoggedIn?.(user ?? { role });
      if (role === "owner") navigate("/owner/dashboard", { replace: true });
      else navigate("/traveler/profile", { replace: true });
    }
  }

  return (
    <div className="modal fade" id="loginModal" tabIndex="-1" aria-hidden="true">
      <div className="modal-dialog modal-dialog-centered">
        <div className="modal-content p-3 rounded-3">
          <div className="modal-header border-0">
            <h5 className="modal-title">Log in</h5>
            <button type="button" className="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
          </div>

          <form className="modal-body" onSubmit={handleSubmit}>
            {error && <div className="alert alert-danger">{error}</div>}

            <input
              type="email"
              className="form-control mb-3"
              placeholder="Email"
              value={email}
              onChange={onEmailChange}
              required
              autoComplete="email"
            />
            <input
              type="password"
              className="form-control mb-3"
              placeholder="Password"
              value={password}
              onChange={onPasswordChange}
              required
              autoComplete="current-password"
            />

            <button
              className="btn btn-danger w-100 mb-3"
              type="submit"
              disabled={loading}
            >
              {loading ? "Logging in..." : "Log in"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
export default Login;
