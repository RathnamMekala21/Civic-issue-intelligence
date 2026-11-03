-- ========================================================
-- CIVIC ISSUE INTELLIGENCE: GRAM PANCHAYAT DATABASE SCHEMA
-- PostgreSQL 17 Database: civic_panchayat_db
-- ========================================================

-- 1. PANCHAYATS TABLE
CREATE TABLE IF NOT EXISTS panchayats (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    mandal VARCHAR(100) NOT NULL,
    district VARCHAR(100) NOT NULL,
    secretary_name VARCHAR(100),
    contact_phone VARCHAR(20),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. WARDS TABLE
CREATE TABLE IF NOT EXISTS wards (
    id SERIAL PRIMARY KEY,
    panchayat_id INT REFERENCES panchayats(id) ON DELETE CASCADE,
    ward_number INT NOT NULL,
    ward_name VARCHAR(100) NOT NULL,
    ward_member_name VARCHAR(100),
    contact_phone VARCHAR(20),
    contact_email VARCHAR(100),
    center_lat FLOAT,
    center_lon FLOAT
);

-- 3. USERS TABLE
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    full_name VARCHAR(100) NOT NULL,
    phone VARCHAR(20) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(20) NOT NULL CHECK (role IN ('citizen', 'ward_officer', 'admin')),
    panchayat_id INT REFERENCES panchayats(id),
    ward_id INT REFERENCES wards(id),
    department VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 4. ISSUES TABLE
CREATE TABLE IF NOT EXISTS issues (
    id SERIAL PRIMARY KEY,
    ticket_id VARCHAR(50) UNIQUE NOT NULL,
    master_ticket_id VARCHAR(50),
    title VARCHAR(255) NOT NULL,
    category VARCHAR(50) NOT NULL,
    description TEXT,
    voice_audio_url VARCHAR(255),
    original_photo_url VARCHAR(255),
    completion_photo_url VARCHAR(255),
    latitude FLOAT NOT NULL,
    longitude FLOAT NOT NULL,
    address VARCHAR(255),
    priority_score FLOAT DEFAULT 5.0,
    urgency_label VARCHAR(50) DEFAULT 'MEDIUM (24h SLA)',
    status VARCHAR(50) DEFAULT 'Submitted',
    is_duplicate BOOLEAN DEFAULT FALSE,
    duplicate_count INT DEFAULT 0,
    citizen_name VARCHAR(100),
    citizen_phone VARCHAR(20),
    citizen_id INT REFERENCES users(id),
    ward_id INT REFERENCES wards(id),
    ward_name VARCHAR(100),
    panchayat_id INT REFERENCES panchayats(id),
    assigned_officer_id INT REFERENCES users(id),
    assigned_officer_name VARCHAR(100),
    officer_email VARCHAR(100),
    officer_phone VARCHAR(20),
    verification_score FLOAT,
    verification_status VARCHAR(100) DEFAULT 'Pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    resolved_at TIMESTAMP
);
