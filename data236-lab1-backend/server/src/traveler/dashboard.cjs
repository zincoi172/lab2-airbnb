const { Router } = require("express");
const { pool } = require("../db/pool.cjs");
const { requireAuth, requireRole } = require("../middleware/requireAuth.cjs");

const router = Router();

// Traveler dashboard
router.get("/", requireAuth, requireRole("traveler"), async (req, res) => {
  const u = req.session.user;

  const [[counts]] = await pool.query(
    `SELECT
        (SELECT COUNT(*) FROM favorites  WHERE traveler_id = ?) AS favorites,
        (SELECT COUNT(*) FROM bookings   WHERE traveler_id = ? AND status='PENDING')  AS pending,
        (SELECT COUNT(*) FROM bookings   WHERE traveler_id = ? AND status='ACCEPTED') AS accepted,
        (SELECT COUNT(*) FROM bookings   WHERE traveler_id = ? AND status='CANCELLED') AS cancelled`,
    [u.id, u.id, u.id, u.id]
  );

  const [favorites] = await pool.query(
    `SELECT p.* FROM favorites f
     JOIN properties p ON p.id = f.property_id
     WHERE f.traveler_id = ?
     ORDER BY f.created_at DESC LIMIT 10`,
    [u.id]
  );

  const [recentBookings] = await pool.query(
    `SELECT b.*, p.title, p.location, p.price_per_night
     FROM bookings b
     JOIN properties p ON p.id = b.property_id
     WHERE b.traveler_id = ?
     ORDER BY b.created_at DESC LIMIT 10`,
    [u.id]
  );

  res.json({
    user: u,
    counts: { favorites: counts.favorites, bookings: { PENDING: counts.pending, ACCEPTED: counts.accepted, CANCELLED: counts.cancelled } },
    favorites,
    recentBookings,
  });
});

module.exports = router;
