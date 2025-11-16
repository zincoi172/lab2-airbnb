// Booking Management for Owners

const { Router } = require("express");
const { pool } = require("../db/pool.cjs");
const { requireAuth, requireRole } = require("../middleware/requireAuth.cjs");
const producerService = require('../producer-service.cjs');

const router = Router();

// View incoming booking requests for your properties:
router.get("/", requireAuth, requireRole("owner"), async (req, res) => {
  const u = req.session.user;
  const [rows] = await pool.query(
    `SELECT b.* FROM bookings b
     JOIN properties p ON p.id = b.property_id
     WHERE p.owner_id = ?
     ORDER BY b.created_at DESC`,
    [u.id]
  );
  res.json(rows);
});

// Accepting a booking changes its status to Accepted and
// should block the property for the requested dates.
// SET b.status = 'ACCEPTED' means the owner has accepted the booking request.
router.post("/:id/accept", requireAuth, requireRole("owner"), async (req, res) => {
  const id = req.params.id;
  const [r] = await pool.query(
    `UPDATE bookings b
     JOIN properties p ON p.id = b.property_id
     SET b.status = 'ACCEPTED' 
     WHERE b.id = ? AND p.owner_id = ?`,
    [id, req.session.user.id]
  );
  if (!r.affectedRows) return res.status(404).json({ error: "Not found or not your booking" });

  // 🔥 Send booking update to Kafka
  await producerService.publishBookingUpdate(
    id,
    'accepted',
    req.session.user.id,
    'Booking accepted by owner'
  );

  res.json({ id, status: "ACCEPTED" });
});

// Cancelling a booking changes its status to Cancelled and 
// should release the dates.
// SET b.status = 'CANCELLED' means the owner has cancelled the booking.
// which releases the booked dates.
router.post("/:id/cancel", requireAuth, requireRole("owner"), async (req, res) => {
  const id = req.params.id;
  const u = req.session.user;

  const [r] = await pool.query(
    `UPDATE bookings b
     LEFT JOIN properties p ON p.id = b.property_id
     SET b.status = 'CANCELLED'
     WHERE b.id = ? AND p.owner_id = ?`,
    [id, u.id]
  );
  if (!r.affectedRows) return res.status(404).json({ error: "Not found or no permission" });

  // 🔥 Send booking update to Kafka
  await producerService.publishBookingUpdate(
    id,
    '',
    req.session.user.id,
    'Booking cancelled by owner'
  );

  res.json({ id, status: "CANCELLED" });
});

module.exports = router;