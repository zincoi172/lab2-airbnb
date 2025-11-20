// Authentication routes using MongoDB
const { Router } = require("express");
const bcrypt = require("bcrypt");
const { getDB } = require("../db/mongodb.cjs");

const router = Router();

// Signup
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
      location = null;
    }

    email = String(email).trim().toLowerCase();

    const db = getDB();
    
    // Check if email exists
    const existingUser = await db.collection('users').findOne({ email });
    if (existingUser) {
      return res.status(409).json({ error: "Email already registered" });
    }

    // Hash password
    const password_hash = await bcrypt.hash(password, 10);

    // Insert user
    const userResult = await db.collection('users').insertOne({
      first_name,
      last_name,
      email,
      password_hash,
      role,
      created_at: new Date()
    });

    const userId = userResult.insertedId;

    // Insert user profile
    await db.collection('user_profiles').insertOne({
      user_id: userId,
      first_name,
      last_name,
      email,
      city: location
    });

    const user = {
      id: userId,
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

// Login
router.post("/login", async (req, res) => {
  let { email, password } = req.body || {};
  if (!email || !password) return res.status(400).json({ error: "Missing email/password" });

  try {
    email = String(email).trim().toLowerCase();
    
    const db = getDB();
    const u = await db.collection('users').findOne({ email });
    
    if (!u) return res.status(401).json({ error: "Invalid credentials" });

    const ok = await bcrypt.compare(password, u.password_hash);
    if (!ok) return res.status(401).json({ error: "Invalid credentials" });

    const user = {
      id: u._id,
      first_name: u.first_name,
      last_name: u.last_name,
      name: `${u.first_name} ${u.last_name}`.trim(),
      email: u.email,
      role: u.role,
    };
    
    req.session.regenerate((err) => {
      if (err) {
        console.error(err);
        return res.status(500).json({ error: "Login failed" });
      }

      req.session.user = user;

      req.session.save((err) => {
        if (err) {
          console.error(err);
          return res.status(500).json({ error: "Login failed" });
        }
        return res.json({ user: req.session.user });
      });
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Login failed" });
  }
});

// Logout
router.post("/logout", (req, res) => {
  req.session.destroy(() => {
    res.clearCookie("connect.sid");
    res.json({ ok: true });
  });
});

// Get current user
router.get("/me", (req, res) => {
  res.json({ user: req.session.user || null });
});

module.exports = router;