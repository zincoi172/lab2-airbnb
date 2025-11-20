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

// Helper to serialize property
function serializeProperty(property) {
  return {
    ...property,
    _id: property._id.toString(),
    owner_id: property.owner_id.toString()
  };
}

// Property Posting - Post property for rent
router.post("/", requireAuth, requireRole("owner"), async (req, res) => {
  try {
    const {
      type,
      title,
      location,
      description = null,
      price_per_night,
      bedrooms = 1,
      bathrooms = 1,
      guests = 1,
      amenities = [],
      photo_urls = [],
    } = req.body || {};

    if (!type || !title || !location || price_per_night == null) {
      return res.status(400).json({ error: "type, title, location, price_per_night required" });
    }

    const db = getDB();
    
    const result = await db.collection('properties').insertOne({
      owner_id: toObjectId(req.session.user.id),
      type: String(type),
      title: String(title),
      location: String(location),
      description,
      price_per_night,
      bedrooms,
      bathrooms,
      guests,
      amenities: amenities || [],
      photo_urls: photo_urls || [],
      created_at: new Date()
    });
    
    res.status(201).json({ id: result.insertedId.toString() });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message });
  }
});

// Update property details
router.put("/:id", requireAuth, requireRole("owner"), async (req, res) => {
  try {
    const id = req.params.id;
    const db = getDB();
    
    // Ensure ownership
    const owned = await db.collection('properties').findOne({
      _id: toObjectId(id),
      owner_id: toObjectId(req.session.user.id)
    });
    
    if (!owned) {
      return res.status(403).json({ error: "Not your property" });
    }

    const fields = [
      "type", "title", "location", "description", "price_per_night",
      "bedrooms", "bathrooms", "guests", "amenities", "photo_urls", "rating"
    ];
    
    const updates = {};
    for (const f of fields) {
      if (req.body?.[f] !== undefined) {
        updates[f] = req.body[f];
      }
    }
    
    if (Object.keys(updates).length === 0) {
      return res.json({ ok: true });
    }
    
    await db.collection('properties').updateOne(
      { _id: toObjectId(id) },
      { $set: updates }
    );
    
    res.json({ ok: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message });
  }
});

// Delete property
router.delete("/:id", requireAuth, requireRole("owner"), async (req, res) => {
  try {
    const db = getDB();
    
    await db.collection('properties').deleteOne({
      _id: toObjectId(req.params.id),
      owner_id: toObjectId(req.session.user.id)
    });
    
    res.json({ ok: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message });
  }
});

// Get single property (owner's own)
router.get("/:id", requireAuth, requireRole("owner"), async (req, res) => {
  try {
    const id = req.params.id;
    const db = getDB();
    
    const property = await db.collection('properties').findOne({
      _id: toObjectId(id),
      owner_id: toObjectId(req.session.user.id)
    });
    
    if (!property) {
      return res.status(404).json({ error: "Property not found" });
    }
    
    res.json(serializeProperty(property));
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Failed to fetch property" });
  }
});

module.exports = router;