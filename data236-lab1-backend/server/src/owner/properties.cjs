const { Router } = require("express");
const { pool } = require("../db/pool.cjs");
const { requireAuth, requireRole } = require("../middleware/requireAuth.cjs");

const router = Router();

// Property Posting - Post property for rent with details:
// Location, description, photos
// Pricing, amenities, availability
// And some more details as needed
router.post("/", requireAuth, requireRole("owner"), async (req, res) => {
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

  const [r] = await pool.query(
    `INSERT INTO properties
      (owner_id, type, title, location, description, price_per_night, bedrooms, bathrooms, guests, amenities, photo_urls)
     VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
    [
      req.session.user.id,
      String(type),
      String(title),
      String(location),
      description,
      price_per_night,
      bedrooms,
      bathrooms,
      guests,
      JSON.stringify(amenities ?? []),
      JSON.stringify(photo_urls ?? []),
    ]
  );
  res.status(201).json({ id: r.insertId });
});

// Profile Management - Add/edit with details
// (property name, type, amentities, pricing, bedrooms, bathrooms, avalability and more)
router.put("/:id", requireAuth, requireRole("owner"), async (req, res) => {
  const id = req.params.id;
  // Ensure ownership
  const [owned] = await pool.query("SELECT id FROM properties WHERE id = ? AND owner_id = ?", [id, req.session.user.id]);
  if (!owned.length) return res.status(403).json({ error: "Not your property" });

  const fields = [
    "type",
    "title",
    "location",
    "description",
    "price_per_night",
    "bedrooms",
    "bathrooms",
    "guests",
    "amenities",
    "photo_urls",
    "rating",
  ];
  const updates = [];
  const params = [];
  for (const f of fields) {
    if (req.body?.[f] !== undefined) {
      if (f === "amenities" || f === "photo_urls") {
        updates.push(`${f} = ?`);
        params.push(JSON.stringify(req.body[f] ?? []));
      } else {
        updates.push(`${f} = ?`);
        params.push(req.body[f]);
      }
    }
  }
  if (!updates.length) return res.json({ ok: true });
  params.push(id);
  await pool.query(`UPDATE properties SET ${updates.join(", ")} WHERE id = ?`, params);
  res.json({ ok: true });
});

// Owner deletes property
router.delete("/:id", requireAuth, requireRole("owner"), async (req, res) => {
  await pool.query("DELETE FROM properties WHERE id = ? AND owner_id = ?", [req.params.id, req.session.user.id]);
  res.json({ ok: true });
});

function parseJsonSafe(v, fallback) {
  if (v == null) return fallback;
  if (typeof v === "object") return v; 
  try {
    return JSON.parse(v);
  } catch {
    return fallback;
  }
}

router.get("/:id", requireAuth, requireRole("owner"), async (req, res) => {
  const id = req.params.id;
  try {
    const [rows] = await pool.query(
      "SELECT * FROM properties WHERE id = ? AND owner_id = ?",
      [id, req.session.user.id]
    );
    if (!rows.length) return res.status(404).json({ error: "Property not found" });

    const p = rows[0];

    const amenities  = parseJsonSafe(p.amenities,  []);
    const photo_urls = parseJsonSafe(p.photo_urls, []);
    const location   = parseJsonSafe(p.location,   null);

    res.json({
      id: p.id,
      owner_id: p.owner_id,
      type: p.type,
      title: p.title,
      location,
      description: p.description,
      price_per_night: p.price_per_night,
      bedrooms: p.bedrooms,
      bathrooms: p.bathrooms,
      guests: p.guests,
      amenities,
      photo_urls,
      rating: p.rating,
      created_at: p.created_at,
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Failed to fetch property" });
  }
});


module.exports = router;
