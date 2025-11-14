-- server/db/schema.sql
-- Assumes the database is already selected (USE airbnb_lab;)
-- Tables for Lab1 Airbnb (users, properties, bookings, favorites)

CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  email VARCHAR(190) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  role ENUM('traveler','owner') NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS user_profiles (
  user_id INT PRIMARY KEY,                               
  first_name VARCHAR(100) NOT NULL,
  last_name  VARCHAR(100) NOT NULL,
  email VARCHAR(190) NOT NULL UNIQUE,
  phone VARCHAR(30),
  about TEXT,
  city VARCHAR(80),
  state CHAR(2),                                          
  country VARCHAR(20),                                        
  gender ENUM('female','male','non-binary','prefer_not_to_say') DEFAULT 'prefer_not_to_say',
  languages_json JSON DEFAULT (JSON_ARRAY('en')),     
  avatar_url VARCHAR(100),    
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_user_profiles_user
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS properties (
  id INT AUTO_INCREMENT PRIMARY KEY,
  owner_id INT NOT NULL,
  type VARCHAR(100) NOT NULL,
  title VARCHAR(200) NOT NULL,
  location VARCHAR(200) NOT NULL,
  description TEXT,
  price_per_night DECIMAL(10,2) NOT NULL,
  bedrooms INT DEFAULT 1,
  bathrooms INT DEFAULT 1,
  guests INT DEFAULT 1,
  amenities JSON DEFAULT (JSON_ARRAY()),  
  rating DECIMAL(3,2) DEFAULT NULL, 
  photo_urls JSON DEFAULT (JSON_ARRAY()),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (owner_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS bookings (
  id INT AUTO_INCREMENT PRIMARY KEY,
  traveler_id INT NOT NULL,
  property_id INT NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  guests INT DEFAULT 1,
  status ENUM('PENDING','ACCEPTED','CANCELLED') DEFAULT 'PENDING',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (traveler_id) REFERENCES users(id),
  FOREIGN KEY (property_id) REFERENCES properties(id)
);

CREATE TABLE IF NOT EXISTS favorites (
  traveler_id INT NOT NULL,
  property_id INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (traveler_id, property_id),
  FOREIGN KEY (traveler_id) REFERENCES users(id),
  FOREIGN KEY (property_id) REFERENCES properties(id)
);
