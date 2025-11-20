// server/src/app-producer.cjs
// Producer Service - Frontend-facing API that publishes to Kafka
const express = require("express");
const session = require("express-session");
const MongoStore = require("connect-mongo");
const cors = require("cors");
const morgan = require("morgan");
const path = require("path");
const swaggerUi = require("swagger-ui-express");
const YAML = require("yamljs");
const axios = require("axios");
const swaggerDoc = YAML.load(path.join(__dirname, "../swagger/swagger.yaml"));

require("dotenv").config();
const { connectMongoDB } = require("./db/mongodb.cjs");
const { requireAuth } = require("./middleware/requireAuth.cjs");

// Kafka Producer only
const producerService = require('./producer-service.cjs');

const app = express();

// middleware
app.use(cors({ origin: true, credentials: true }));
app.use(express.json());
app.use(morgan("dev"));

// MongoDB Session Store
app.use(
  session({
    secret: process.env.SESSION_SECRET || "dev",
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({
      mongoUrl: process.env.MONGODB_URI || 'mongodb://admin:mongopassword123@mongodb-service:27017/airbnb_lab?authSource=admin',
      dbName: 'airbnb_lab',
      collectionName: 'sessions',
      ttl: 24 * 60 * 60, // 1 day
      autoRemove: 'native',
      touchAfter: 24 * 3600,
    }),
    cookie: { 
      httpOnly: true, 
      sameSite: "lax", 
      secure: false, 
      maxAge: 1000 * 60 * 60 * 24 
    },
  })
);

// health
app.get("/", (_req, res) => res.json({ service: "Airbnb API Producer", status: "ok" }));
app.get("/health", (_req, res) =>
  res.status(200).json({ ok: true, service: "Airbnb API Producer", uptime: process.uptime(), timestamp: new Date().toISOString() })
);
app.get("/api/health", (_req, res) => res.json({ ok: true }));
app.get("/db-check", async (_req, res) => {
  try {
    const { getDB } = require("./db/mongodb.cjs");
    const db = getDB();
    const result = await db.admin().serverStatus();
    res.json({ ok: true, mongodb: result.version });
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

async function startServer() {
  try {
    // Connect to MongoDB first
    await connectMongoDB();
    
    app.listen(port, () => {
      console.log(`🌐 Producer API on http://localhost:${port}`);
      console.log(`🗄️  Connected to MongoDB`);
      
      // Initialize Kafka Producer
      initKafkaProducer();
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

// Initialize Kafka Producer
async function initKafkaProducer() {
  try {
    console.log('🚀 Initializing Kafka Producer...');
    await producerService.initProducer();
    console.log('✅ Kafka Producer initialized successfully');
  } catch (error) {
    console.error('❌ Error initializing Kafka Producer:', error);
    console.log('⚠️  Server will continue without Kafka');
  }
}

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM signal received: closing Producer...');
  await producerService.disconnectProducer();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('SIGINT signal received: closing Producer...');
  await producerService.disconnectProducer();
  process.exit(0);
});

// Start the server
startServer();