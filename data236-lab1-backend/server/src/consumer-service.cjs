// consumer-service.cjs
// Backend Services - Consumes Kafka messages and processes bookings
// Place at: data236-lab1-backend/server/src/consumer-service.cjs

const { Kafka } = require('kafkajs');

const kafka = new Kafka({
  clientId: 'airbnb-consumer',
  brokers: [process.env.KAFKA_BROKERS || 'kafka-service:9092'],
});

const consumer = kafka.consumer({ groupId: 'booking-processor-group' });

// Topics
const TOPICS = {
  BOOKING_REQUESTS: 'booking-requests',
  BOOKING_UPDATES: 'booking-updates',
  TRAVELER_NOTIFICATIONS: 'traveler-notifications',
};

// Store for database connection (will be injected)
let dbPool = null;

// Set database connection
function setDatabase(pool) {
  dbPool = pool;
}

// Initialize consumer
async function initConsumer() {
  try {
    await consumer.connect();
    console.log('✅ [CONSUMER] Connected to Kafka');

    // Subscribe to topics
    await consumer.subscribe({ 
      topics: [TOPICS.BOOKING_REQUESTS, TOPICS.BOOKING_UPDATES],
      fromBeginning: false  // Only new messages
    });
    console.log('✅ [CONSUMER] Subscribed to topics');

    // Start consuming
    await startConsuming();
    
    return true;
  } catch (error) {
    console.error('❌ [CONSUMER] Error initializing:', error);
    return false;
  }
}

// Process booking requests from travelers
async function handleBookingRequest(message) {
  try {
    const data = JSON.parse(message.value.toString());
    console.log(`\n📬 [CONSUMER] Processing booking request: ${data.booking_id}`);
    console.log(`   Traveler: ${data.traveler_id}`);
    console.log(`   Property: ${data.property_id}`);
    console.log(`   Dates: ${data.start_date} to ${data.end_date}`);

    // Update database - mark booking as received (FIXED: id instead of booking_id)
    if (dbPool) {
      await dbPool.query(
        'UPDATE bookings SET status = ? WHERE id = ?',
        ['pending', data.booking_id]
      );
      console.log(`   ✅ Updated booking status in database`);
    }

    // Here you could:
    // - Send notification to owner
    // - Check availability
    // - Process payment
    // - Send email
    
    console.log(`   ✅ Booking request processed successfully`);
    
  } catch (error) {
    console.error('❌ [CONSUMER] Error processing booking request:', error);
  }
}

// Process booking updates from owners
async function handleBookingUpdate(message) {
  try {
    const data = JSON.parse(message.value.toString());
    console.log(`\n📬 [CONSUMER] Processing booking update: ${data.booking_id}`);
    console.log(`   Owner: ${data.owner_id}`);
    console.log(`   Status: ${data.status}`);
    console.log(`   Notes: ${data.notes || 'N/A'}`);

    // Update database with owner's decision (FIXED: id instead of booking_id)
    if (dbPool) {
      await dbPool.query(
        'UPDATE bookings SET status = ? WHERE id = ?',
        [data.status, data.booking_id]
      );
      console.log(`   ✅ Updated booking with owner's decision`);

      // Get traveler info for notification (FIXED: id instead of booking_id)
      const [booking] = await dbPool.query(
        'SELECT traveler_id FROM bookings WHERE id = ?',
        [data.booking_id]
      );

      if (booking.length > 0) {
        // Send notification to traveler (via Kafka or email)
        console.log(`   📧 Notifying traveler ${booking[0].traveler_id}`);
        // You could publish to TRAVELER_NOTIFICATIONS topic here
      }
    }

    console.log(`   ✅ Booking update processed successfully`);
    
  } catch (error) {
    console.error('❌ [CONSUMER] Error processing booking update:', error);
  }
}

// Main consumer loop
async function startConsuming() {
  await consumer.run({
    eachMessage: async ({ topic, partition, message }) => {
      try {
        console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
        console.log(`📨 Message received from Kafka`);
        console.log(`   Topic: ${topic}`);
        console.log(`   Partition: ${partition}`);
        console.log(`   Offset: ${message.offset}`);

        // Route to appropriate handler based on topic
        if (topic === TOPICS.BOOKING_REQUESTS) {
          await handleBookingRequest(message);
        } else if (topic === TOPICS.BOOKING_UPDATES) {
          await handleBookingUpdate(message);
        }

        console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);
        
      } catch (error) {
        console.error('❌ [CONSUMER] Error processing message:', error);
      }
    },
  });
}

// Disconnect consumer
async function disconnectConsumer() {
  try {
    await consumer.disconnect();
    console.log('✅ [CONSUMER] Disconnected from Kafka');
  } catch (error) {
    console.error('❌ [CONSUMER] Error disconnecting:', error);
  }
}

module.exports = {
  initConsumer,
  disconnectConsumer,
  setDatabase,
  TOPICS,
};