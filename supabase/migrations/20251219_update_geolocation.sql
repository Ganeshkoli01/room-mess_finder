-- Safe update migration that handles existing objects
-- Run this if you get "already exists" errors

-- Add new columns to rooms table (if not exist)
DO $$ 
BEGIN
    -- Add latitude column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' 
                   AND table_name = 'rooms' 
                   AND column_name = 'latitude') THEN
        ALTER TABLE public.rooms ADD COLUMN latitude DECIMAL(10, 8);
    END IF;
    
    -- Add longitude column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' 
                   AND table_name = 'rooms' 
                   AND column_name = 'longitude') THEN
        ALTER TABLE public.rooms ADD COLUMN longitude DECIMAL(11, 8);
    END IF;
    
    -- Add city column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' 
                   AND table_name = 'rooms' 
                   AND column_name = 'city') THEN
        ALTER TABLE public.rooms ADD COLUMN city TEXT;
    END IF;
    
    -- Add rating column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' 
                   AND table_name = 'rooms' 
                   AND column_name = 'rating') THEN
        ALTER TABLE public.rooms ADD COLUMN rating DECIMAL(2, 1) DEFAULT 0;
    END IF;
    
    -- Add reviews_count column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' 
                   AND table_name = 'rooms' 
                   AND column_name = 'reviews_count') THEN
        ALTER TABLE public.rooms ADD COLUMN reviews_count INTEGER DEFAULT 0;
    END IF;
END $$;

-- Add new columns to mess table (if not exist)
DO $$ 
BEGIN
    -- Add latitude column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' 
                   AND table_name = 'mess' 
                   AND column_name = 'latitude') THEN
        ALTER TABLE public.mess ADD COLUMN latitude DECIMAL(10, 8);
    END IF;
    
    -- Add longitude column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' 
                   AND table_name = 'mess' 
                   AND column_name = 'longitude') THEN
        ALTER TABLE public.mess ADD COLUMN longitude DECIMAL(11, 8);
    END IF;
    
    -- Add city column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' 
                   AND table_name = 'mess' 
                   AND column_name = 'city') THEN
        ALTER TABLE public.mess ADD COLUMN city TEXT;
    END IF;
    
    -- Add rating column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' 
                   AND table_name = 'mess' 
                   AND column_name = 'rating') THEN
        ALTER TABLE public.mess ADD COLUMN rating DECIMAL(2, 1) DEFAULT 0;
    END IF;
    
    -- Add reviews_count column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' 
                   AND table_name = 'mess' 
                   AND column_name = 'reviews_count') THEN
        ALTER TABLE public.mess ADD COLUMN reviews_count INTEGER DEFAULT 0;
    END IF;
END $$;

-- Create indexes for geolocation queries (drop first if exist)
DROP INDEX IF EXISTS idx_rooms_location;
DROP INDEX IF EXISTS idx_mess_location;
DROP INDEX IF EXISTS idx_rooms_city;
DROP INDEX IF EXISTS idx_mess_city;

CREATE INDEX idx_rooms_location ON public.rooms (latitude, longitude);
CREATE INDEX idx_mess_location ON public.mess (latitude, longitude);
CREATE INDEX idx_rooms_city ON public.rooms (city);
CREATE INDEX idx_mess_city ON public.mess (city);

-- Function to calculate distance between two points (Haversine formula)
CREATE OR REPLACE FUNCTION public.calculate_distance(
  lat1 DECIMAL,
  lon1 DECIMAL,
  lat2 DECIMAL,
  lon2 DECIMAL
)
RETURNS DECIMAL
LANGUAGE plpgsql
AS $$
DECLARE
  R DECIMAL := 6371; -- Earth's radius in km
  dLat DECIMAL;
  dLon DECIMAL;
  a DECIMAL;
  c DECIMAL;
BEGIN
  IF lat1 IS NULL OR lon1 IS NULL OR lat2 IS NULL OR lon2 IS NULL THEN
    RETURN NULL;
  END IF;
  
  dLat := radians(lat2 - lat1);
  dLon := radians(lon2 - lon1);
  a := sin(dLat/2) * sin(dLat/2) + cos(radians(lat1)) * cos(radians(lat2)) * sin(dLon/2) * sin(dLon/2);
  c := 2 * atan2(sqrt(a), sqrt(1-a));
  RETURN R * c;
END;
$$;

-- Function to get rooms near a location
CREATE OR REPLACE FUNCTION public.get_rooms_near_location(
  user_lat DECIMAL,
  user_lng DECIMAL,
  radius_km DECIMAL DEFAULT 50
)
RETURNS TABLE (
  id UUID,
  owner_id UUID,
  title TEXT,
  description TEXT,
  location TEXT,
  address TEXT,
  city TEXT,
  latitude DECIMAL,
  longitude DECIMAL,
  price NUMERIC,
  room_type TEXT,
  facilities TEXT[],
  images TEXT[],
  is_verified BOOLEAN,
  rating DECIMAL,
  reviews_count INTEGER,
  distance DECIMAL
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    r.id,
    r.owner_id,
    r.title,
    r.description,
    r.location,
    r.address,
    r.city,
    r.latitude,
    r.longitude,
    r.price,
    r.room_type,
    r.facilities,
    r.images,
    r.is_verified,
    r.rating,
    r.reviews_count,
    calculate_distance(user_lat, user_lng, r.latitude, r.longitude) as distance
  FROM public.rooms r
  WHERE r.is_active = true
    AND r.latitude IS NOT NULL
    AND r.longitude IS NOT NULL
    AND calculate_distance(user_lat, user_lng, r.latitude, r.longitude) <= radius_km
  ORDER BY distance ASC;
END;
$$;

-- Function to get mess near a location
CREATE OR REPLACE FUNCTION public.get_mess_near_location(
  user_lat DECIMAL,
  user_lng DECIMAL,
  radius_km DECIMAL DEFAULT 50
)
RETURNS TABLE (
  id UUID,
  owner_id UUID,
  name TEXT,
  description TEXT,
  location TEXT,
  address TEXT,
  city TEXT,
  latitude DECIMAL,
  longitude DECIMAL,
  price_per_month NUMERIC,
  food_type TEXT,
  timings TEXT,
  menu_highlights TEXT[],
  images TEXT[],
  is_verified BOOLEAN,
  rating DECIMAL,
  reviews_count INTEGER,
  distance DECIMAL
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    m.id,
    m.owner_id,
    m.name,
    m.description,
    m.location,
    m.address,
    m.city,
    m.latitude,
    m.longitude,
    m.price_per_month,
    m.food_type,
    m.timings,
    m.menu_highlights,
    m.images,
    m.is_verified,
    m.rating,
    m.reviews_count,
    calculate_distance(user_lat, user_lng, m.latitude, m.longitude) as distance
  FROM public.mess m
  WHERE m.is_active = true
    AND m.latitude IS NOT NULL
    AND m.longitude IS NOT NULL
    AND calculate_distance(user_lat, user_lng, m.latitude, m.longitude) <= radius_km
  ORDER BY distance ASC;
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.calculate_distance TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_rooms_near_location TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_mess_near_location TO anon, authenticated;
