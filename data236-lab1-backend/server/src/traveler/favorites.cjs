const { Router } = require("express");
const { pool } = require("../db/pool.cjs");
const { requireAuth, requireRole } = require("../middleware/requireAuth.cjs");

const router = Router();

// Display a favourites tab
router.get("/", requireAuth, requireRole("traveler"), async (req, res) => {
  const [rows] = await pool.query(
    `SELECT p.* 
     FROM favorites f 
     JOIN properties p ON p.id = f.property_id
     WHERE f.traveler_id = ?
     ORDER BY f.created_at DESC`,
    [req.session.user.id]
  );
  res.json(rows);
});

// Mark property as favorite
router.post("/", requireAuth, requireRole("traveler"), async (req, res) => {
  const { property_id } = req.body || {};
  if (!property_id) return res.status(400).json({ error: "property_id required" });
  try {
    await pool.query(
      "INSERT INTO favorites (traveler_id, property_id) VALUES (?, ?)",
      [req.session.user.id, property_id]
    );
    res.status(201).json({ ok: true });
  } catch (e) {
    if (e && e.code === "ER_DUP_ENTRY") return res.status(409).json({ error: "Already favorited" });
    throw e;
  }
});

// Unmark property as favorite
router.delete("/", requireAuth, requireRole("traveler"), async (req, res) => {
  const { property_id } = req.body || {};
  if (!property_id) return res.status(400).json({ error: "property_id required" });
  await pool.query(
    "DELETE FROM favorites WHERE traveler_id = ? AND property_id = ?",
    [req.session.user.id, property_id]
  );
  res.json({ ok: true });
});

module.exports = router;