const { Router } = require("express");
const { getDB } = require("../db/mongodb.cjs");
const { ObjectId } = require("mongodb");
const { requireAuth } = require("../middleware/requireAuth.cjs");
const router = Router();
const multer = require("multer");
const path = require("path");

// Helper to safely convert to ObjectId
function toObjectId(id) {
  if (!id) return null;
  if (id instanceof ObjectId) return id;
  if (typeof id === 'string' && ObjectId.isValid(id)) {
    return new ObjectId(id);
  }
  return id;
}

const upload = multer({
  dest: path.join(__dirname, "../../public/avatars"),
  limits: { fileSize: 2 * 1024 * 1024 }, // 2MB limit
  fileFilter: (req, file, cb) => {
    if (!file.mimetype.startsWith("image/")) {
      return cb(new Error("Only image files are allowed!"));
    }
    cb(null, true);
  },
});

// POST /api/profile/avatar - upload profile picture
router.post("/avatar", requireAuth, upload.single("avatar"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: "No file uploaded" });
    
    const userId = req.session.user.id;
    const avatarUrl = `/avatars/${req.file.filename}`;
    
    const db = getDB();
    await db.collection('user_profiles').updateOne(
      { user_id: toObjectId(userId) },
      { $set: { avatar_url: avatarUrl } }
    );
    
    res.json({ avatar_url: avatarUrl });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message });
  }
});

// GET /api/profile - get current user's profile
router.get("/", requireAuth, async (req, res) => {
  try {
    const userId = req.session.user.id;
    const role = (req.session.user?.role || "").toLowerCase();
    
    const db = getDB();
    const profile = await db.collection('user_profiles').findOne({ 
      user_id: toObjectId(userId)
    });
    
    if (!profile) {
      return res.status(404).json({ error: "Profile not found" });
    }
    
    res.json({ ...profile, role });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message });
  }
});

// PUT /api/profile - update current user's profile
router.put("/", requireAuth, async (req, res) => {
  try {
    const userId = req.session.user.id;
    const fields = ["first_name", "last_name", "email", "phone", "about", "city", "state", "country", "gender", "languages_json", "avatar_url"];
    
    const updates = {};
    for (const f of fields) {
      if (req.body?.[f] !== undefined) {
        updates[f] = f === "languages_json" ? JSON.stringify(req.body[f]) : req.body[f];
      }
    }
    
    if (Object.keys(updates).length === 0) {
      return res.json({ ok: true });
    }
    
    const db = getDB();
    await db.collection('user_profiles').updateOne(
      { user_id: toObjectId(userId) },
      { $set: updates }
    );
    
    res.json({ ok: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;