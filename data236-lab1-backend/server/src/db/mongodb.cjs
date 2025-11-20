// MongoDB connection module
const { MongoClient } = require('mongodb');

let client;
let db;

async function connectMongoDB() {
  if (db) {
    return db;
  }

  const mongoUrl = process.env.MONGODB_URI || 'mongodb://admin:mongopassword123@mongodb-service:27017/airbnb_lab?authSource=admin';
  
  client = new MongoClient(mongoUrl);
  
  try {
    await client.connect();
    console.log('✅ Connected to MongoDB');
    db = client.db('airbnb_lab');
    return db;
  } catch (error) {
    console.error('❌ MongoDB connection error:', error);
    throw error;
  }
}

function getDB() {
  if (!db) {
    throw new Error('Database not initialized. Call connectMongoDB() first.');
  }
  return db;
}

async function closeConnection() {
  if (client) {
    await client.close();
    console.log('MongoDB connection closed');
  }
}

module.exports = {
  connectMongoDB,
  getDB,
  closeConnection
};
