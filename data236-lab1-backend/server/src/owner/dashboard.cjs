// Owner dashboard - MongoDB version
const { Router } = require("express");
const { getDB } = require("../db/mongodb.cjs");
const { ObjectId } = require("mongodb");
const { requireAuth, requireRole } = require("../middleware/requireAuth.cjs");

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

// Helper to serialize properties and bookings
function serializeProperty(property) {
  return {
    ...property,
    _id: property._id.toString(),
    owner_id: property.owner_id.toString()
  };
}

function serializeBooking(booking) {
  return {
    ...booking,
    _id: booking._id ? booking._id.toString() : undefined,
    property_id: booking.property_id ? booking.property_id.toString() : undefined,
    traveler_id: booking.traveler_id ? booking.traveler_id.toString() : undefined
  };
}

// Owner dashboard
router.get("/", requireAuth, requireRole("owner"), async (req, res) => {
  try {
    const u = req.session.user;
    const db = getDB();
    const userId = toObjectId(u.id);

    // Get owner's properties
    const myProperties = await db.collection('properties')
      .find({ owner_id: userId })
      .sort({ created_at: -1 })
      .limit(20)
      .toArray();
    
    const propertyIds = myProperties.map(p => p._id);

    // Get counts
    const propertiesCount = myProperties.length;
    const pendingCount = await db.collection('bookings').countDocuments({ 
      property_id: { $in: propertyIds }, 
      status: 'PENDING' 
    });
    const acceptedCount = await db.collection('bookings').countDocuments({ 
      property_id: { $in: propertyIds }, 
      status: 'ACCEPTED' 
    });
    const cancelledCount = await db.collection('bookings').countDocuments({ 
      property_id: { $in: propertyIds }, 
      status: 'CANCELLED' 
    });

    // Get recent bookings with details
    const bookingsList = await db.collection('bookings')
      .find({ property_id: { $in: propertyIds } })
      .sort({ created_at: -1 })
      .limit(10)
      .toArray();
    
    // Enrich bookings with property and traveler details
    const recentBookings = await Promise.all(bookingsList.map(async (booking) => {
      const property = await db.collection('properties').findOne({ _id: booking.property_id });
      const traveler = await db.collection('users').findOne({ _id: booking.traveler_id });
      
      return serializeBooking({
        ...booking,
        title: property?.title,
        location: property?.location,
        traveler_name: traveler ? `${traveler.first_name} ${traveler.last_name}` : 'Unknown',
        traveler_email: traveler?.email
      });
    }));

    res.json({
      user: u,
      counts: { 
        properties: propertiesCount, 
        bookings: { 
          PENDING: pendingCount, 
          ACCEPTED: acceptedCount, 
          CANCELLED: cancelledCount 
        } 
      },
      myProperties: myProperties.map(serializeProperty),
      recentBookings,
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;