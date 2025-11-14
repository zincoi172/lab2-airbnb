module.exports.requireAuth = (req, res, next) => {
  if (!req.session?.user) return res.status(401).json({ error: "Not authenticated" });
  next();
};

module.exports.requireRole = (role) => (req, res, next) => {
  if (!req.session?.user || req.session.user.role !== role) {
    return res.status(403).json({ error: `${role}s only` });
  }
  next();
};
