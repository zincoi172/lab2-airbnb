// Property search route (moved from routes/properties.cjs)
const { Router } = require("express");
const { pool } = require("../db/pool.cjs");
const router = Router();

// We have properties.cjs in shared folder because both owner and traveler can see it

// Property Search Page/Dashboard - Search avaivalble properties by:
// Location, Start Date, End Date, Number of Guests
router.get("/search", async (req, res) => {
  const { location = "", startDate, endDate } = req.query;
  const params = [location];
  let sql = `SELECT p.* FROM properties p WHERE p.location LIKE CONCAT('%', ?, '%')`;
  if (startDate && endDate) {
    sql += ` AND NOT EXISTS (SELECT 1 FROM bookings b WHERE b.property_id = p.id AND b.status = 'ACCEPTED' AND NOT (b.end_date < ? OR b.start_date > ?))`;
    params.push(startDate, endDate);
  }
  const [rows] = await pool.query(sql, params);
  res.json(rows);
});

module.exports = router;

// Property Details View - view details such as 
// property name, type, amenities, pricing, bedrooms, bathrooms, availability. 

// GET /api/properties/:id
router.get("/:id", async (req, res) => {
  const propertyId = req.params.id;
  // Get property details
  const [rows] = await pool.query(
    `SELECT p.*, u.first_name, u.last_name, CONCAT(u.first_name, ' ', u.last_name) AS owner_name FROM properties p JOIN users u ON p.owner_id = u.id WHERE p.id = ?`, [propertyId]);
  if (!rows.length) return res.status(404).json({ error: "Property not found" });
  const property = rows[0];

  // Allow booking since it gets the accepted bookings for a property
  // and adds the booked dates so the frontend knows which dates are unavailable for booking
  const [bookings] = await pool.query(
    "SELECT start_date, end_date FROM bookings WHERE property_id = ? AND status = 'ACCEPTED'",
    [propertyId]
  );
  property.booked_dates = bookings;

  res.json(property);
});