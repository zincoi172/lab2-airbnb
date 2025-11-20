// Property routes using MongoDB
const { Router } = require("express");
const { getDB } = require("../db/mongodb.cjs");
const { ObjectId } = require("mongodb");

const router = Router();

// Property Search - Search available properties by location, dates, guests
router.get("/search", async (req, res) => {
  try {
    const { location = "", startDate, endDate } = req.query;
    const db = getDB();
    
    // Build query
    let query = {};
    if (location) {
      query.location = { $regex: location, $options: 'i' };
    }
    
    // Get all properties matching location
    let properties = await db.collection('properties').find(query).toArray();
    
    // If date range provided, filter out properties with conflicting bookings
    if (startDate && endDate) {
      const propertyIds = properties.map(p => p._id);
      
      // Find conflicting bookings
      const conflictingBookings = await db.collection('bookings').find({
        property_id: { $in: propertyIds },
        status: 'ACCEPTED',
        $or: [
          { start_date: { $lte: endDate, $gte: startDate } },
          { end_date: { $lte: endDate, $gte: startDate } },
          { start_date: { $lte: startDate }, end_date: { $gte: endDate } }
        ]
      }).toArray();
      
      const bookedPropertyIds = new Set(conflictingBookings.map(b => b.property_id.toString()));
      properties = properties.filter(p => !bookedPropertyIds.has(p._id.toString()));
    }
    
    res.json(properties);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message });
  }
});

// Property Details View - view details such as property name, type, amenities, pricing
router.get("/:id", async (req, res) => {
  try {
    const propertyId = req.params.id;
    const db = getDB();
    
    // Get property details with owner info
    const property = await db.collection('properties').findOne({ 
      _id: new ObjectId(propertyId) 
    });
    
    if (!property) {
      return res.status(404).json({ error: "Property not found" });
    }
    
    // Get owner details - handle both ObjectId and string formats
    let ownerId;
    if (property.owner_id) {
      // Check if owner_id is already an ObjectId
      if (property.owner_id instanceof ObjectId) {
        ownerId = property.owner_id;
      } else if (typeof property.owner_id === 'string') {
        // Try to convert string to ObjectId
        try {
          ownerId = new ObjectId(property.owner_id);
        } catch (err) {
          console.error("Invalid owner_id format:", property.owner_id);
          ownerId = null;
        }
      }
    }
    
    // Fetch owner only if we have a valid ownerId
    if (ownerId) {
      const owner = await db.collection('users').findOne({ 
        _id: ownerId
      });
      
      if (owner) {
        property.owner_name = `${owner.first_name} ${owner.last_name}`;
        property.first_name = owner.first_name;
        property.last_name = owner.last_name;
      }
    } else {
      // Default owner info if no valid owner_id
      property.owner_name = "Your host";
      property.first_name = "Your";
      property.last_name = "host";
    }
    
    // Get accepted bookings for this property
    const bookings = await db.collection('bookings').find({
      property_id: new ObjectId(propertyId),
      status: 'ACCEPTED'
    }).toArray();
    
    property.booked_dates = bookings.map(b => ({
      start_date: b.start_date,
      end_date: b.end_date
    }));
    
    res.json(property);
  } catch (e) {
    console.error("Property details error:", e);
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;