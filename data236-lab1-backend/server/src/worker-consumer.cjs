// server/src/worker-consumer.cjs
// Consumer Service - Background worker that processes Kafka messages
// MongoDB version

require("dotenv").config();
const { connectMongoDB, closeConnection } = require("./db/mongodb.cjs");
const consumerService = require('./consumer-service.cjs');

console.log('🔧 Starting Kafka Consumer Worker...');

// Initialize Kafka Consumer
async function initKafkaConsumer() {
  try {
    console.log('🚀 Initializing Kafka Consumer...');
    
    // Connect to MongoDB first
    await connectMongoDB();
    
    // Start consumer
    await consumerService.initConsumer();
    
    console.log('✅ Kafka Consumer initialized successfully');
    console.log('👂 Listening for messages...');
  } catch (error) {
    console.error('❌ Error initializing Kafka Consumer:', error);
    process.exit(1);
  }
}

// Start the consumer
initKafkaConsumer();

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM signal received: closing Consumer...');
  await consumerService.disconnectConsumer();
  await closeConnection();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('SIGINT signal received: closing Consumer...');
  await consumerService.disconnectConsumer();
  await closeConnection();
  process.exit(0);
});

// Keep process alive
process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
});