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

// Helper to serialize
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

// Traveler dashboard
router.get("/", requireAuth, requireRole("traveler"), async (req, res) => {
  try {
    const u = req.session.user;
    const db = getDB();
    const userId = toObjectId(u.id);

    // Get counts
    const favoritesCount = await db.collection('favorites').countDocuments({ traveler_id: userId });
    const pendingCount = await db.collection('bookings').countDocuments({ traveler_id: userId, status: 'PENDING' });
    const acceptedCount = await db.collection('bookings').countDocuments({ traveler_id: userId, status: 'ACCEPTED' });
    const cancelledCount = await db.collection('bookings').countDocuments({ traveler_id: userId, status: 'CANCELLED' });

    // Get favorite properties
    const favoritesList = await db.collection('favorites')
      .find({ traveler_id: userId })
      .sort({ created_at: -1 })
      .limit(10)
      .toArray();
    
    const favoritePropertyIds = favoritesList.map(f => f.property_id);
    const favorites = await db.collection('properties')
      .find({ _id: { $in: favoritePropertyIds } })
      .toArray();

    // Get recent bookings with property details
    const bookingsList = await db.collection('bookings')
      .find({ traveler_id: userId })
      .sort({ created_at: -1 })
      .limit(10)
      .toArray();
    
    // Enrich bookings with property details
    const recentBookings = await Promise.all(bookingsList.map(async (booking) => {
      const property = await db.collection('properties').findOne({ _id: booking.property_id });
      return serializeBooking({
        ...booking,
        title: property?.title,
        location: property?.location,
        price_per_night: property?.price_per_night
      });
    }));

    res.json({
      user: u,
      counts: { 
        favorites: favoritesCount, 
        bookings: { 
          PENDING: pendingCount, 
          ACCEPTED: acceptedCount, 
          CANCELLED: cancelledCount 
        } 
      },
      favorites: favorites.map(serializeProperty),
      recentBookings,
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;