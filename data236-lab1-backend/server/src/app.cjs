// server/src/app.cjs
const express = require("express");
const session = require("express-session");
const cors = require("cors");
const morgan = require("morgan");
const path = require("path");
const swaggerUi = require("swagger-ui-express");
const YAML = require("yamljs");
const axios = require("axios");
const swaggerDoc = YAML.load(path.join(__dirname, "../swagger/swagger.yaml"));

require("dotenv").config();
const { pool } = require("./db/pool.cjs");
const { requireAuth } = require("./middleware/requireAuth.cjs");

// Kafka services
const producerService = require('./producer-service.cjs');
const consumerService = require('./consumer-service.cjs');

const app = express();

// middleware
app.use(cors({ origin: true, credentials: true }));
app.use(express.json());
app.use(morgan("dev"));
app.use(
  session({
    secret: process.env.SESSION_SECRET || "dev",
    resave: false,
    saveUninitialized: false,
    cookie: { httpOnly: true, sameSite: "lax", secure: false, maxAge: 1000 * 60 * 60 * 24 },
  })
);

// health
app.get("/", (_req, res) => res.json({ service: "Airbnb API", status: "ok" }));
app.get("/health", (_req, res) =>
  res.status(200).json({ ok: true, service: "Airbnb API", uptime: process.uptime(), timestamp: new Date().toISOString() })
);
app.get("/api/health", (_req, res) => res.json({ ok: true }));
app.get("/db-check", async (_req, res) => {
  try {
    const [rows] = await pool.query("SELECT NOW() AS now");
    res.json(rows[0]);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// routes
app.use("/api/auth", require("./shared/auth.cjs"));
app.use("/api/properties", require("./shared/properties.cjs"));
app.use("/api/profile", require("./shared/profile.cjs"));

// Traveler routes
app.use("/api/traveler/dashboard", require("./traveler/dashboard.cjs"));
app.use("/api/traveler/favorites", require("./traveler/favorites.cjs"));
app.use("/api/traveler/bookings", require("./traveler/bookings.cjs"));

// Owner routes
app.use("/api/owner/dashboard", require("./owner/dashboard.cjs"));
app.use("/api/owner/properties", require("./owner/properties.cjs"));
app.use("/api/owner/bookings", require("./owner/bookings.cjs"));

// proxy route for agent service
app.post('/api/agent/plan', requireAuth, async (req, res) => {
  try {
    const response = await axios.post('http://localhost:8001/plan', req.body);
    res.json(response.data);
  } catch (err) {
    res.status(500).json({ error: 'Agent service error', details: err.message });
  }
});

// swagger
app.use("/docs", swaggerUi.serve, swaggerUi.setup(swaggerDoc));

// start
const port = process.env.PORT || 4000;
app.listen(port, () => {
  console.log(`API on http://localhost:${port}`);
  
  // Initialize Kafka after server starts
  initKafka();
});

// Initialize Kafka Producer and Consumer
async function initKafka() {
  try {
    console.log('🚀 Initializing Kafka services...');
    
    // Start producer (for sending messages)
    await producerService.initProducer();
    
    // Pass database connection to consumer
    consumerService.setDatabase(pool);
    
    // Start consumer (for receiving messages)
    await consumerService.initConsumer();
    
    console.log('✅ Kafka services initialized successfully');
  } catch (error) {
    console.error('❌ Error initializing Kafka:', error);
    // Continue running even if Kafka fails (for development)
    console.log('⚠️  Server will continue without Kafka');
  }
}

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM signal received: closing connections...');
  await producerService.disconnectProducer();
  await consumerService.disconnectConsumer();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('SIGINT signal received: closing connections...');
  await producerService.disconnectProducer();
  await consumerService.disconnectConsumer();
  process.exit(0);
});