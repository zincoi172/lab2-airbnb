// This code defines authentication routes for an Express.js server, 
// Include handling user signup, login, logout, get current user info.
// We have it in routes/auth.cjs because both owner and traveler use it.

const { Router } = require("express");
const bcrypt = require("bcrypt");
const { pool } = require("../db/pool.cjs");

const router = Router();

// Signup – Owner signs up with name, email ID, password, and location:
// POST /api/auth/signup:
router.post("/signup", async (req, res) => {
  try {
    let { first_name, last_name, name, email, password, role, location } = req.body || {};

    // allow legacy `name`
    if ((!first_name || !last_name) && name) {
      const parts = String(name).trim().split(/\s+/);
      first_name = parts.shift() || "";
      last_name = parts.join(" ");
    }

    // Strict role-based validation
    if (!first_name || !last_name || !email || !password || !["traveler", "owner"].includes(role)) {
      return res.status(400).json({ error: "first_name, last_name, email, password, role required" });
    }
    if (role === "owner" && !location) {
      return res.status(400).json({ error: "location required for owner signup" });
    }
    if (role === "traveler") {
      location = null; // ignore location for traveler
    }

    email = String(email).trim().toLowerCase();

    const [exists] = await pool.query("SELECT id FROM users WHERE email = ?", [email]);
    if (exists.length) return res.status(409).json({ error: "Email already registered" });

    const hash = await bcrypt.hash(password, 10);
    const [r] = await pool.query(
      "INSERT INTO users (first_name, last_name, email, password_hash, role) VALUES (?,?,?,?,?)",
      [first_name, last_name, email, hash, role]
    );

    // Add location to user_profiles (city column)
    await pool.query(
      "INSERT INTO user_profiles (user_id, first_name, last_name, email, city) VALUES (?,?,?,?,?)",
      [r.insertId, first_name, last_name, email, location]
    );

    const user = {
      id: r.insertId,
      first_name,
      last_name,
      name: `${first_name} ${last_name}`.trim(),
      email,
      role,
      location,
    };
    req.session.user = user;
    res.status(201).json({ user });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Signup failed" });
  }
});

// Login/Logout – Implement session-based authentication:
// POST /api/auth/login:
router.post("/login", async (req, res) => {
  let { email, password } = req.body || {};
  if (!email || !password) return res.status(400).json({ error: "Missing email/password" });

  try {
    email = String(email).trim().toLowerCase();
    const [rows] = await pool.query("SELECT * FROM users WHERE email = ?", [email]);
    if (!rows.length) return res.status(401).json({ error: "Invalid credentials" });

    const u = rows[0];
    const ok = await bcrypt.compare(password, u.password_hash);
    if (!ok) return res.status(401).json({ error: "Invalid credentials" });

    const user = {
      id: u.id,
      first_name: u.first_name,
      last_name: u.last_name,
      name: `${u.first_name} ${u.last_name}`.trim(),
      email: u.email,
      role: u.role,
    };
    req.session.regenerate((err) => {
      if (err) return next(err);

      req.session.user = user;

      req.session.save((err) => {
        if (err) return next(err);
        return res.json({ user: req.session.user });
      });
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Login failed" });
  }
});

// POST /api/auth/logout:
router.post("/logout", (req, res) => {
  req.session.destroy(() => {
    res.clearCookie("connect.sid");
    res.json({ ok: true });
  });
});



// GET /api/auth/me either travels or owner who is logged in
router.get("/me", (req, res) => {
  res.json({ user: req.session.user || null });
});

module.exports = router;
