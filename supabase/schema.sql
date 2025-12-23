-- Supabase Database Schema for Room & Mess Finder
-- Run this in your Supabase SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ===========================================
-- OWNERS TABLE (Room/Mess Owners)
-- ===========================================
CREATE TABLE IF NOT EXISTS owners (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL,
  phone VARCHAR(20),
  whatsapp VARCHAR(20),
  profile_image TEXT,
  is_verified BOOLEAN DEFAULT FALSE,
  total_listings INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ===========================================
-- ROOM LISTINGS TABLE
-- ===========================================
CREATE TABLE IF NOT EXISTS room_listings (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  owner_id UUID REFERENCES owners(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  location VARCHAR(500) NOT NULL,
  address TEXT,
  lat DECIMAL(10, 8),
  lng DECIMAL(11, 8),
  price DECIMAL(10, 2) NOT NULL,
  security_deposit DECIMAL(10, 2),
  room_type VARCHAR(50) NOT NULL, -- single, double, shared, pg, hostel
  gender_preference VARCHAR(20), -- male, female, any
  facilities JSONB DEFAULT '[]',
  images JSONB DEFAULT '[]',
  video_url TEXT,
  is_verified BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE,
  rating DECIMAL(2, 1) DEFAULT 0,
  total_reviews INTEGER DEFAULT 0,
  views INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ===========================================
-- MESS LISTINGS TABLE
-- ===========================================
CREATE TABLE IF NOT EXISTS mess_listings (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  owner_id UUID REFERENCES owners(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  location VARCHAR(500) NOT NULL,
  address TEXT,
  lat DECIMAL(10, 8),
  lng DECIMAL(11, 8),
  price_per_month DECIMAL(10, 2) NOT NULL,
  price_per_day DECIMAL(10, 2),
  food_type VARCHAR(20) NOT NULL, -- veg, non-veg, both
  timings VARCHAR(100),
  menu_highlights JSONB DEFAULT '[]',
  weekly_menu JSONB DEFAULT '{}',
  facilities JSONB DEFAULT '[]',
  images JSONB DEFAULT '[]',
  is_verified BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE,
  rating DECIMAL(2, 1) DEFAULT 0,
  total_reviews INTEGER DEFAULT 0,
  views INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ===========================================
-- ENQUIRIES TABLE (Main enquiry storage)
-- ===========================================
CREATE TABLE IF NOT EXISTS enquiries (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  -- User Information
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  user_name VARCHAR(255) NOT NULL,
  user_email VARCHAR(255) NOT NULL,
  user_phone VARCHAR(20),
  
  -- Listing Information
  listing_id VARCHAR(255) NOT NULL,
  listing_type VARCHAR(10) NOT NULL CHECK (listing_type IN ('room', 'mess')),
  listing_title VARCHAR(255) NOT NULL,
  
  -- Owner Information
  owner_id VARCHAR(255) NOT NULL,
  owner_email VARCHAR(255),
  owner_phone VARCHAR(20),
  owner_whatsapp VARCHAR(20),
  
  -- Enquiry Details
  message TEXT NOT NULL,
  preferred_move_in DATE,
  budget_range VARCHAR(50),
  
  -- Status & Tracking
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'viewed', 'contacted', 'approved', 'rejected', 'booked', 'cancelled')),
  admin_notes TEXT,
  owner_response TEXT,
  
  -- Notification Status
  email_sent BOOLEAN DEFAULT FALSE,
  whatsapp_sent BOOLEAN DEFAULT FALSE,
  sms_sent BOOLEAN DEFAULT FALSE,
  email_sent_at TIMESTAMP WITH TIME ZONE,
  whatsapp_sent_at TIMESTAMP WITH TIME ZONE,
  
  -- Metadata for AI Agents
  source VARCHAR(50) DEFAULT 'web', -- web, mobile, chatbot, ai_agent
  user_agent TEXT,
  ip_address VARCHAR(45),
  session_id VARCHAR(255),
  utm_source VARCHAR(100),
  utm_medium VARCHAR(100),
  utm_campaign VARCHAR(100),
  
  -- AI Processing Fields
  ai_processed BOOLEAN DEFAULT FALSE,
  ai_sentiment VARCHAR(20), -- positive, neutral, negative
  ai_priority VARCHAR(10), -- high, medium, low
  ai_tags JSONB DEFAULT '[]',
  ai_summary TEXT,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  viewed_at TIMESTAMP WITH TIME ZONE,
  responded_at TIMESTAMP WITH TIME ZONE
);

-- ===========================================
-- BOOKINGS TABLE (Room Bookings)
-- ===========================================
CREATE TABLE IF NOT EXISTS bookings (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  enquiry_id UUID REFERENCES enquiries(id) ON DELETE SET NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  listing_id VARCHAR(255) NOT NULL,
  listing_type VARCHAR(10) NOT NULL,
  listing_title VARCHAR(255),
  owner_id VARCHAR(255) NOT NULL,
  
  -- Booking Details
  start_date DATE NOT NULL,
  end_date DATE,
  duration_months INTEGER DEFAULT 1,
  
  -- Pricing
  monthly_rent DECIMAL(10, 2) NOT NULL,
  security_deposit DECIMAL(10, 2),
  total_amount DECIMAL(10, 2) NOT NULL,
  
  -- Status
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'active', 'completed', 'cancelled')),
  payment_status VARCHAR(20) DEFAULT 'pending' CHECK (payment_status IN ('pending', 'partial', 'paid', 'refunded')),
  
  -- Payment Details
  payment_method VARCHAR(50),
  transaction_id VARCHAR(255),
  payment_date TIMESTAMP WITH TIME ZONE,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  confirmed_at TIMESTAMP WITH TIME ZONE,
  cancelled_at TIMESTAMP WITH TIME ZONE
);

-- ===========================================
-- MESS SUBSCRIPTIONS TABLE
-- ===========================================
CREATE TABLE IF NOT EXISTS mess_subscriptions (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  mess_id VARCHAR(255) NOT NULL,
  mess_title VARCHAR(255),
  owner_id VARCHAR(255),
  
  -- Subscription Details
  plan_type VARCHAR(20) NOT NULL CHECK (plan_type IN ('daily', 'weekly', 'monthly')),
  meal_types JSONB DEFAULT '["breakfast", "lunch", "dinner"]',
  
  -- Dates
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  
  -- Pricing
  amount DECIMAL(10, 2) NOT NULL,
  
  -- Status
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'paused', 'cancelled', 'expired')),
  payment_status VARCHAR(20) DEFAULT 'pending',
  
  -- Auto-renewal
  auto_renew BOOLEAN DEFAULT FALSE,
  renewal_count INTEGER DEFAULT 0,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  paused_at TIMESTAMP WITH TIME ZONE,
  cancelled_at TIMESTAMP WITH TIME ZONE
);

-- ===========================================
-- NOTIFICATION LOGS TABLE
-- ===========================================
CREATE TABLE IF NOT EXISTS notification_logs (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  enquiry_id UUID REFERENCES enquiries(id) ON DELETE CASCADE,
  
  -- Notification Details
  notification_type VARCHAR(20) NOT NULL, -- email, whatsapp, sms, push
  recipient_type VARCHAR(20) NOT NULL, -- owner, user, admin
  recipient_email VARCHAR(255),
  recipient_phone VARCHAR(20),
  
  -- Content
  subject VARCHAR(500),
  message TEXT,
  template_id VARCHAR(100),
  
  -- Status
  status VARCHAR(20) DEFAULT 'pending', -- pending, sent, delivered, failed
  error_message TEXT,
  
  -- Provider Info
  provider VARCHAR(50), -- sendgrid, twilio, whatsapp_business
  provider_message_id VARCHAR(255),
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  sent_at TIMESTAMP WITH TIME ZONE,
  delivered_at TIMESTAMP WITH TIME ZONE
);

-- ===========================================
-- INDEXES FOR PERFORMANCE
-- ===========================================
CREATE INDEX IF NOT EXISTS idx_enquiries_user_id ON enquiries(user_id);
CREATE INDEX IF NOT EXISTS idx_enquiries_owner_id ON enquiries(owner_id);
CREATE INDEX IF NOT EXISTS idx_enquiries_listing_id ON enquiries(listing_id);
CREATE INDEX IF NOT EXISTS idx_enquiries_status ON enquiries(status);
CREATE INDEX IF NOT EXISTS idx_enquiries_created_at ON enquiries(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_enquiries_listing_type ON enquiries(listing_type);

CREATE INDEX IF NOT EXISTS idx_bookings_user_id ON bookings(user_id);
CREATE INDEX IF NOT EXISTS idx_bookings_status ON bookings(status);

CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON mess_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON mess_subscriptions(status);

CREATE INDEX IF NOT EXISTS idx_room_listings_owner_id ON room_listings(owner_id);
CREATE INDEX IF NOT EXISTS idx_room_listings_location ON room_listings(location);
CREATE INDEX IF NOT EXISTS idx_room_listings_price ON room_listings(price);

CREATE INDEX IF NOT EXISTS idx_mess_listings_owner_id ON mess_listings(owner_id);
CREATE INDEX IF NOT EXISTS idx_mess_listings_location ON mess_listings(location);

-- ===========================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ===========================================
ALTER TABLE enquiries ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE mess_subscriptions ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (to allow re-running)
DROP POLICY IF EXISTS "Users can view own enquiries" ON enquiries;
DROP POLICY IF EXISTS "Users can create enquiries" ON enquiries;
DROP POLICY IF EXISTS "Owners can view listing enquiries" ON enquiries;
DROP POLICY IF EXISTS "Anyone can insert enquiries" ON enquiries;

-- Users can read their own enquiries
CREATE POLICY "Users can view own enquiries" ON enquiries
  FOR SELECT USING (auth.uid() = user_id);

-- Anyone can create enquiries (even anonymous for demo)
CREATE POLICY "Anyone can insert enquiries" ON enquiries
  FOR INSERT WITH CHECK (true);

-- Owners can view enquiries for their listings
CREATE POLICY "Owners can view listing enquiries" ON enquiries
  FOR SELECT USING (owner_id::text = auth.uid()::text);

-- ===========================================
-- REAL-TIME SUBSCRIPTIONS
-- ===========================================
-- Enable real-time for tables (ignore errors if already added)
DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE enquiries;
EXCEPTION WHEN duplicate_object THEN
  -- Table already in publication, ignore
END $$;

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE bookings;
EXCEPTION WHEN duplicate_object THEN
  NULL;
END $$;

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE mess_subscriptions;
EXCEPTION WHEN duplicate_object THEN
  NULL;
END $$;

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE notification_logs;
EXCEPTION WHEN duplicate_object THEN
  NULL;
END $$;

-- ===========================================
-- FUNCTIONS & TRIGGERS
-- ===========================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at (drop first to avoid duplicates)
DROP TRIGGER IF EXISTS update_enquiries_updated_at ON enquiries;
CREATE TRIGGER update_enquiries_updated_at
  BEFORE UPDATE ON enquiries
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_bookings_updated_at ON bookings;
CREATE TRIGGER update_bookings_updated_at
  BEFORE UPDATE ON bookings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_subscriptions_updated_at ON mess_subscriptions;
CREATE TRIGGER update_subscriptions_updated_at
  BEFORE UPDATE ON mess_subscriptions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

