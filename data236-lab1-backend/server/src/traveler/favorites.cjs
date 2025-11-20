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

// Display favorites tab
router.get("/", requireAuth, requireRole("traveler"), async (req, res) => {
  try {
    const db = getDB();
    
    // Get all favorites for this traveler
    const favorites = await db.collection('favorites')
      .find({ traveler_id: toObjectId(req.session.user.id) })
      .sort({ created_at: -1 })
      .toArray();
    
    // Get property details for each favorite
    const propertyIds = favorites.map(f => f.property_id);
    const properties = await db.collection('properties')
      .find({ _id: { $in: propertyIds } })
      .toArray();
    
    // Serialize properties
    const serializedProperties = properties.map(serializeProperty);
    
    res.json(serializedProperties);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message });
  }
});

// Mark property as favorite
router.post("/", requireAuth, requireRole("traveler"), async (req, res) => {
  try {
    const { property_id } = req.body || {};
    if (!property_id) return res.status(400).json({ error: "property_id required" });
    
    const db = getDB();
    
    // Check if already favorited
    const existing = await db.collection('favorites').findOne({
      traveler_id: toObjectId(req.session.user.id),
      property_id: toObjectId(property_id)
    });
    
    if (existing) {
      return res.status(409).json({ error: "Already favorited" });
    }
    
    // Add to favorites
    await db.collection('favorites').insertOne({
      traveler_id: toObjectId(req.session.user.id),
      property_id: toObjectId(property_id),
      created_at: new Date()
    });
    
    res.status(201).json({ ok: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message });
  }
});

// Unmark property as favorite
router.delete("/", requireAuth, requireRole("traveler"), async (req, res) => {
  try {
    const { property_id } = req.body || {};
    if (!property_id) return res.status(400).json({ error: "property_id required" });
    
    const db = getDB();
    
    await db.collection('favorites').deleteOne({
      traveler_id: toObjectId(req.session.user.id),
      property_id: toObjectId(property_id)
    });
    
    res.json({ ok: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;