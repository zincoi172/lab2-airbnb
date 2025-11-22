// Booking Flow

const { Router } = require("express");
const { pool } = require("../db/pool.cjs");
const { requireAuth, requireRole } = require("../middleware/requireAuth.cjs");

const router = Router();

// Traveler creates a booking for selected dates/guests
router.post("/", requireAuth, requireRole("traveler"), async (req, res) => {
  const { property_id, start_date, end_date, guests = 1 } = req.body || {};
  if (!property_id || !start_date || !end_date)
    return res.status(400).json({ error: "property_id, start_date, end_date required" });

  // A booking starts in PENDING status until the Owner responds
  const [r] = await pool.query(
    `INSERT INTO bookings (traveler_id, property_id, start_date, end_date, guests, status)
     VALUES (?,?,?,?,?, 'PENDING')`,
    [req.session.user.id, property_id, start_date, end_date, guests]
  );
  res.status(201).json({ id: r.insertId, status: "PENDING" });
});

// Travelers can view Pending/Accepted/Cancelled bookings
// Also Traveler History - Display a history tab for any previous bookings/trips taken
// The frontend should filter and display:
// - Upcoming/current bookings for the Booking Flow tab
// - Past bookings/trips for the Traveler History tab
router.get("/", requireAuth, requireRole("traveler"), async (req, res) => {
  const u = req.session.user;
  const [rows] = await pool.query(
    `SELECT * FROM bookings WHERE traveler_id = ? ORDER BY created_at DESC`,
    [u.id]
  );
  res.json(rows);
});

// Traveler cancels their booking
router.post("/:id/cancel", requireAuth, requireRole("traveler"), async (req, res) => {
  const id = req.params.id;
  const u = req.session.user;

  const [r] = await pool.query(
    `UPDATE bookings SET status = 'CANCELLED' WHERE id = ? AND traveler_id = ?`,
    [id, u.id]
  );
  if (!r.affectedRows) return res.status(404).json({ error: "Not found or no permission" });
  res.json({ id, status: "CANCELLED" });
});

module.exports = router;
