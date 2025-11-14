// Owner dashboard

const { Router } = require("express");
const { pool } = require("../db/pool.cjs");
const { requireAuth, requireRole } = require("../middleware/requireAuth.cjs");

const router = Router();

// Owner dashboard
router.get("/", requireAuth, requireRole("owner"), async (req, res) => {
  const u = req.session.user;
  // Shows quick stats for owner's properties and bookings
  // Such as number of properties, pending bookings, accepted bookings, cancelled bookings
  const [[counts]] = await pool.query(
    `SELECT
        (SELECT COUNT(*) FROM properties WHERE owner_id = ?) AS properties,
        (SELECT COUNT(*) FROM bookings b
           JOIN properties p ON p.id=b.property_id
           WHERE p.owner_id = ? AND b.status='PENDING')  AS pending,
        (SELECT COUNT(*) FROM bookings b
           JOIN properties p ON p.id=b.property_id
           WHERE p.owner_id = ? AND b.status='ACCEPTED') AS accepted,
        (SELECT COUNT(*) FROM bookings b
           JOIN properties p ON p.id=b.property_id
           WHERE p.owner_id = ? AND b.status='CANCELLED') AS cancelled`,
    [u.id, u.id, u.id, u.id]
  );

  const [myProperties] = await pool.query(
    `SELECT * FROM properties WHERE owner_id = ? ORDER BY created_at DESC LIMIT 20`,
    [u.id]
  );
// Shows previous bookings and recent requests for owner's properties
  const [recentBookings] = await pool.query(
    `SELECT b.*, p.title, p.location,
            CONCAT(uu.first_name, ' ', uu.last_name) AS traveler_name,
            uu.email AS traveler_email
     FROM bookings b
     JOIN properties p ON p.id = b.property_id
     JOIN users uu ON uu.id = b.traveler_id
     WHERE p.owner_id = ?
     ORDER BY b.created_at DESC LIMIT 10`,
    [u.id]
  );

  res.json({
    user: u,
    counts: { properties: counts.properties, bookings: { PENDING: counts.pending, ACCEPTED: counts.accepted, CANCELLED: counts.cancelled } },
    myProperties,
    recentBookings,
  });
});

module.exports = router;
