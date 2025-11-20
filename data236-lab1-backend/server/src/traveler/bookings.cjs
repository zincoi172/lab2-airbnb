// Booking Flow for Travelers - MongoDB version
const { Router } = require("express");
const { getDB } = require("../db/mongodb.cjs");
const { ObjectId } = require("mongodb");
const { requireAuth, requireRole } = require("../middleware/requireAuth.cjs");
const producerService = require('../producer-service.cjs');

const router = Router();

// Helper to safely convert to ObjectId
function toObjectId(id) {
  if (!id) return null;
  if (id instanceof ObjectId) return id;
  if (typeof id === 'string' && ObjectId.isValid(id)) {
    return new ObjectId(id);
  }
  return id;
}

// Helper to serialize booking
function serializeBooking(booking) {
  return {
    ...booking,
    _id: booking._id.toString(),
    property_id: booking.property_id.toString(),
    traveler_id: booking.traveler_id.toString()
  };
}

// Traveler creates a booking for selected dates/guests
router.post("/", requireAuth, requireRole("traveler"), async (req, res) => {
  try {
    const { property_id, start_date, end_date, guests = 1 } = req.body || {};
    if (!property_id || !start_date || !end_date)
      return res.status(400).json({ error: "property_id, start_date, end_date required" });

    const db = getDB();
    
    // Get property details to find owner_id
    const property = await db.collection('properties').findOne({ 
      _id: toObjectId(property_id)
    });
    
    if (!property) {
      return res.status(404).json({ error: "Property not found" });
    }

    // Create booking in PENDING status
    const bookingResult = await db.collection('bookings').insertOne({
      traveler_id: toObjectId(req.session.user.id),
      property_id: toObjectId(property_id),
      start_date: start_date,
      end_date: end_date,
      guests: guests,
      status: 'PENDING',
      created_at: new Date()
    });

    const bookingId = bookingResult.insertedId;

    // 🔥 Send booking request to Kafka
    await producerService.publishBookingRequest({
      booking_id: bookingId.toString(),
      property_id: property_id,
      traveler_id: req.session.user.id.toString(),
      owner_id: property.owner_id.toString(),
      start_date: start_date,
      end_date: end_date,
      total_price: property.price_per_night * guests,
    });

    res.status(201).json({ id: bookingId.toString(), status: "PENDING" });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message });
  }
});

// Travelers can view their bookings
router.get("/", requireAuth, requireRole("traveler"), async (req, res) => {
  try {
    const u = req.session.user;
    const db = getDB();
    
    const bookings = await db.collection('bookings')
      .find({ traveler_id: toObjectId(u.id) })
      .sort({ created_at: -1 })
      .toArray();
    
    // Convert ObjectIds to strings
    const serializedBookings = bookings.map(serializeBooking);
    
    res.json(serializedBookings);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message });
  }
});

// Traveler cancels their booking
router.post("/:id/cancel", requireAuth, requireRole("traveler"), async (req, res) => {
  try {
    const id = req.params.id;
    const u = req.session.user;
    const db = getDB();

    const result = await db.collection('bookings').updateOne(
      { 
        _id: toObjectId(id),
        traveler_id: toObjectId(u.id)
      },
      { $set: { status: 'CANCELLED' } }
    );
    
    if (result.matchedCount === 0) {
      return res.status(404).json({ error: "Not found or no permission" });
    }
    
    res.json({ id, status: "CANCELLED" });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;