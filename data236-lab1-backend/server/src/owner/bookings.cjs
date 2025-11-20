// Booking Management for Owners - MongoDB version
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

// Helper to convert ObjectIds to strings for frontend
function serializeBooking(booking) {
  return {
    ...booking,
    _id: booking._id.toString(),
    property_id: booking.property_id.toString(),
    traveler_id: booking.traveler_id.toString()
  };
}

// View incoming booking requests for your properties
router.get("/", requireAuth, requireRole("owner"), async (req, res) => {
  try {
    const u = req.session.user;
    const db = getDB();
    
    // Get all properties owned by this owner
    const properties = await db.collection('properties')
      .find({ owner_id: toObjectId(u.id) })
      .toArray();
    
    const propertyIds = properties.map(p => p._id);
    
    // Get all bookings for these properties
    const bookings = await db.collection('bookings')
      .find({ property_id: { $in: propertyIds } })
      .sort({ created_at: -1 })
      .toArray();
    
    // Convert ObjectIds to strings for frontend
    const serializedBookings = bookings.map(serializeBooking);
    
    res.json(serializedBookings);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message });
  }
});

// Accept a booking
router.post("/:id/accept", requireAuth, requireRole("owner"), async (req, res) => {
  try {
    const id = req.params.id;
    const db = getDB();
    
    // Get the booking to verify it belongs to owner's property
    const booking = await db.collection('bookings').findOne({ 
      _id: toObjectId(id)
    });
    
    if (!booking) {
      return res.status(404).json({ error: "Booking not found" });
    }
    
    // Verify the property belongs to this owner
    const property = await db.collection('properties').findOne({
      _id: booking.property_id,
      owner_id: toObjectId(req.session.user.id)
    });
    
    if (!property) {
      return res.status(404).json({ error: "Not found or not your booking" });
    }
    
    // Update booking status
    await db.collection('bookings').updateOne(
      { _id: toObjectId(id) },
      { $set: { status: 'ACCEPTED' } }
    );

    // 🔥 Send booking update to Kafka
    await producerService.publishBookingUpdate(
      id,
      'accepted',
      req.session.user.id.toString(),
      'Booking accepted by owner'
    );

    res.json({ id, status: "ACCEPTED" });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message });
  }
});

// Cancel a booking
router.post("/:id/cancel", requireAuth, requireRole("owner"), async (req, res) => {
  try {
    const id = req.params.id;
    const u = req.session.user;
    const db = getDB();

    // Get the booking to verify it belongs to owner's property
    const booking = await db.collection('bookings').findOne({ 
      _id: toObjectId(id)
    });
    
    if (!booking) {
      return res.status(404).json({ error: "Booking not found" });
    }
    
    // Verify the property belongs to this owner
    const property = await db.collection('properties').findOne({
      _id: booking.property_id,
      owner_id: toObjectId(u.id)
    });
    
    if (!property) {
      return res.status(404).json({ error: "Not found or no permission" });
    }

    // Update booking status
    await db.collection('bookings').updateOne(
      { _id: toObjectId(id) },
      { $set: { status: 'CANCELLED' } }
    );

    // 🔥 Send booking update to Kafka
    await producerService.publishBookingUpdate(
      id,
      'cancelled',
      u.id.toString(),
      'Booking cancelled by owner'
    );

    res.json({ id, status: "CANCELLED" });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;