// consumer-service.cjs
// Backend Services - Consumes Kafka messages and processes bookings
// MongoDB version

const { Kafka } = require('kafkajs');
const { getDB } = require('./db/mongodb.cjs');
const { ObjectId } = require('mongodb');

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

// Initialize consumer
async function initConsumer() {
  try {
    await consumer.connect();
    console.log('✅ [CONSUMER] Connected to Kafka');

    // Subscribe to topics
    await consumer.subscribe({ 
      topics: [TOPICS.BOOKING_REQUESTS, TOPICS.BOOKING_UPDATES],
      fromBeginning: false
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

    // Update MongoDB - mark booking as pending
    const db = getDB();
    await db.collection('bookings').updateOne(
      { _id: new ObjectId(data.booking_id) },
      { $set: { status: 'PENDING' } }
    );
    console.log(`   ✅ Updated booking status in database`);

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

    // Update MongoDB with owner's decision
    const db = getDB();
    await db.collection('bookings').updateOne(
      { _id: new ObjectId(data.booking_id) },
      { $set: { status: data.status.toUpperCase() } }
    );
    console.log(`   ✅ Updated booking with owner's decision`);

    // Get traveler info for notification
    const booking = await db.collection('bookings').findOne({
      _id: new ObjectId(data.booking_id)
    });

    if (booking) {
      console.log(`   📧 Notifying traveler ${booking.traveler_id}`);
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
  TOPICS,
};