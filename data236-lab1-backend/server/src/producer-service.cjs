// producer-service.cjs
// Frontend Services - Handles HTTP requests and produces Kafka messages
// Place at: data236-lab1-backend/server/src/producer-service.cjs

const { Kafka } = require('kafkajs');

const kafka = new Kafka({
  clientId: 'airbnb-producer',
  brokers: [process.env.KAFKA_BROKERS || 'kafka-service:9092'],
});

const producer = kafka.producer();

// Topics for booking flow
const TOPICS = {
  BOOKING_REQUESTS: 'booking-requests',    // Traveler → Kafka
  BOOKING_UPDATES: 'booking-updates',      // Owner → Kafka
  TRAVELER_NOTIFICATIONS: 'traveler-notifications', // Kafka → Traveler
};

// Initialize producer
async function initProducer() {
  try {
    await producer.connect();
    console.log('✅ [PRODUCER] Connected to Kafka');
    return true;
  } catch (error) {
    console.error('❌ [PRODUCER] Error connecting:', error);
    return false;
  }
}

// Traveler creates booking → Send to Kafka
async function publishBookingRequest(bookingData) {
  try {
    const message = {
      booking_id: bookingData.booking_id,
      property_id: bookingData.property_id,
      traveler_id: bookingData.traveler_id,
      owner_id: bookingData.owner_id,
      start_date: bookingData.start_date,
      end_date: bookingData.end_date,
      total_price: bookingData.total_price,
      status: 'pending',
      timestamp: new Date().toISOString(),
      event: 'BOOKING_REQUEST_CREATED',
    };

    await producer.send({
      topic: TOPICS.BOOKING_REQUESTS,
      messages: [
        {
          key: String(bookingData.booking_id),
          value: JSON.stringify(message),
          headers: {
            'event-type': 'BOOKING_REQUEST',
            'traveler-id': String(bookingData.traveler_id),
          },
        },
      ],
    });

    console.log(`📨 [PRODUCER] Published booking request: ${bookingData.booking_id}`);
    return { success: true, message: 'Booking request sent to Kafka' };
  } catch (error) {
    console.error('❌ [PRODUCER] Error publishing booking request:', error);
    return { success: false, error: error.message };
  }
}

// Owner responds to booking → Send to Kafka
async function publishBookingUpdate(bookingId, status, ownerId, notes = '') {
  try {
    // Convert status to uppercase to match database ENUM
    const upperStatus = status.toUpperCase();
    
    const message = {
      booking_id: bookingId,
      status: upperStatus, // NOW UPPERCASE
      owner_id: ownerId,
      notes: notes,
      timestamp: new Date().toISOString(),
      event: 'BOOKING_STATUS_UPDATED',
    };

    await producer.send({
      topic: TOPICS.BOOKING_UPDATES,
      messages: [
        {
          key: String(bookingId),
          value: JSON.stringify(message),
          headers: {
            'event-type': 'BOOKING_UPDATE',
            'owner-id': String(ownerId),
          },
        },
      ],
    });

    console.log(`📨 [PRODUCER] Published booking update: ${bookingId} - ${upperStatus}`);
    return { success: true, message: 'Booking update sent to Kafka' };
  } catch (error) {
    console.error('❌ [PRODUCER] Error publishing booking update:', error);
    return { success: false, error: error.message };
  }
}

// Disconnect producer
async function disconnectProducer() {
  try {
    await producer.disconnect();
    console.log('✅ [PRODUCER] Disconnected from Kafka');
  } catch (error) {
    console.error('❌ [PRODUCER] Error disconnecting:', error);
  }
}

module.exports = {
  initProducer,
  publishBookingRequest,
  publishBookingUpdate,
  disconnectProducer,
  TOPICS,
};