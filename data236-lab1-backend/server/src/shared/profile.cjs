
const { Router } = require("express");
const { pool } = require("../db/pool.cjs");
const { requireAuth } = require("../middleware/requireAuth.cjs");
const router = Router();
const multer = require("multer");
const path = require("path");
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

// POST /api/profile/avatar - upload profile picture for both traveler and owner
// The frontend should send a multipart/form-data POST request 
// to /api/profile/avatar with the file field named avatar
router.post("/avatar", requireAuth, upload.single("avatar"), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: "No file uploaded" });
  const userId = req.session.user.id;
  // Save the file path (relative to public) in avatar_url
  const avatarUrl = `/avatars/${req.file.filename}`;
  await pool.query("UPDATE user_profiles SET avatar_url = ? WHERE user_id = ?", [avatarUrl, userId]);
  res.json({ avatar_url: avatarUrl });
});
// Note that both traveler and owner can use the same logic for Profile Management or Profile Page
// The Frontend can decide which fields to show/edit based on the role
// The only difference is the Owner Add/edit with details(
// property name, type, amentities, pricing, bedrooms, bathrooms, avalability) 
// Where we placed it in owner/properties.cjs

// GET /api/profile - get current user's profile
router.get("/", requireAuth, async (req, res) => {
  const userId = req.session.user.id;
  const role = (req.session.user?.role || "").toLowerCase();
  const [rows] = await pool.query("SELECT * FROM user_profiles WHERE user_id = ?", [userId]);
  if (!rows.length) return res.status(404).json({ error: "Profile not found" });
  res.json({ ...rows[0], role});
});

// PUT /api/profile - update current user's profile
router.put("/", requireAuth, async (req, res) => {
  const userId = req.session.user.id;
  const fields = ["first_name", "last_name", "email", "phone", "about", "city", "state", "country", "gender", "languages_json", "avatar_url"];
  const updates = [];
  const params = [];
  for (const f of fields) {
    if (req.body?.[f] !== undefined) {
      updates.push(`${f} = ?`);
      params.push(f === "languages_json" ? JSON.stringify(req.body[f]) : req.body[f]);
    }
  }
  if (!updates.length) return res.json({ ok: true });
  params.push(userId);
  await pool.query(`UPDATE user_profiles SET ${updates.join(", ")} WHERE user_id = ?`, params);
  res.json({ ok: true });
});

module.exports = router;
