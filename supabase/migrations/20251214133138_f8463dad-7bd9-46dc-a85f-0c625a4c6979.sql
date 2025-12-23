-- Create enum for listing types
CREATE TYPE public.listing_type AS ENUM ('room', 'mess');

-- Create enum for booking status
CREATE TYPE public.booking_status AS ENUM ('pending', 'approved', 'rejected', 'cancelled');

-- Create enum for user roles
CREATE TYPE public.app_role AS ENUM ('user', 'owner', 'admin');

-- Create profiles table for user information
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  first_name TEXT,
  last_name TEXT,
  phone TEXT,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create user_roles table for role management
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL DEFAULT 'user',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

-- Create rooms table with geolocation
CREATE TABLE public.rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  location TEXT NOT NULL,
  address TEXT,
  city TEXT,
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  price NUMERIC NOT NULL,
  room_type TEXT NOT NULL,
  facilities TEXT[] DEFAULT '{}',
  images TEXT[] DEFAULT '{}',
  is_verified BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  rating DECIMAL(2, 1) DEFAULT 0,
  reviews_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create mess table with geolocation
CREATE TABLE public.mess (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  location TEXT NOT NULL,
  address TEXT,
  city TEXT,
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  price_per_month NUMERIC NOT NULL,
  food_type TEXT NOT NULL CHECK (food_type IN ('veg', 'non-veg', 'both')),
  timings TEXT,
  menu_highlights TEXT[] DEFAULT '{}',
  images TEXT[] DEFAULT '{}',
  is_verified BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  rating DECIMAL(2, 1) DEFAULT 0,
  reviews_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create bookings/enquiries table
CREATE TABLE public.bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  listing_id UUID NOT NULL,
  listing_type listing_type NOT NULL,
  owner_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  message TEXT,
  status booking_status NOT NULL DEFAULT 'pending',
  user_name TEXT NOT NULL,
  user_email TEXT NOT NULL,
  user_phone TEXT,
  response_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create reviews table
CREATE TABLE public.reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  listing_id UUID NOT NULL,
  listing_type listing_type NOT NULL,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create index for geolocation queries
CREATE INDEX idx_rooms_location ON public.rooms (latitude, longitude);
CREATE INDEX idx_mess_location ON public.mess (latitude, longitude);
CREATE INDEX idx_rooms_city ON public.rooms (city);
CREATE INDEX idx_mess_city ON public.mess (city);

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mess ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

-- Helper function to check user role
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Profiles policies
CREATE POLICY "Profiles are viewable by everyone" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users can insert their own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own profile" ON public.profiles FOR UPDATE USING (auth.uid() = user_id);

-- User roles policies
CREATE POLICY "Users can view their own roles" ON public.user_roles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own role" ON public.user_roles FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Rooms policies
CREATE POLICY "Rooms are viewable by everyone" ON public.rooms FOR SELECT USING (is_active = true);
CREATE POLICY "Owners can view their own rooms" ON public.rooms FOR SELECT USING (auth.uid() = owner_id);
CREATE POLICY "Owners can insert their own rooms" ON public.rooms FOR INSERT WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "Owners can update their own rooms" ON public.rooms FOR UPDATE USING (auth.uid() = owner_id);
CREATE POLICY "Owners can delete their own rooms" ON public.rooms FOR DELETE USING (auth.uid() = owner_id);

-- Mess policies
CREATE POLICY "Mess are viewable by everyone" ON public.mess FOR SELECT USING (is_active = true);
CREATE POLICY "Owners can view their own mess" ON public.mess FOR SELECT USING (auth.uid() = owner_id);
CREATE POLICY "Owners can insert their own mess" ON public.mess FOR INSERT WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "Owners can update their own mess" ON public.mess FOR UPDATE USING (auth.uid() = owner_id);
CREATE POLICY "Owners can delete their own mess" ON public.mess FOR DELETE USING (auth.uid() = owner_id);

-- Bookings policies
CREATE POLICY "Users can view their own bookings" ON public.bookings FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Owners can view bookings for their listings" ON public.bookings FOR SELECT USING (auth.uid() = owner_id);
CREATE POLICY "Users can create bookings" ON public.bookings FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Owners can update booking status" ON public.bookings FOR UPDATE USING (auth.uid() = owner_id);
CREATE POLICY "Users can cancel their own bookings" ON public.bookings FOR UPDATE USING (auth.uid() = user_id);

-- Reviews policies
CREATE POLICY "Reviews are viewable by everyone" ON public.reviews FOR SELECT USING (true);
CREATE POLICY "Authenticated users can create reviews" ON public.reviews FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own reviews" ON public.reviews FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own reviews" ON public.reviews FOR DELETE USING (auth.uid() = user_id);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create triggers for updated_at
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_rooms_updated_at BEFORE UPDATE ON public.rooms FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_mess_updated_at BEFORE UPDATE ON public.mess FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_bookings_updated_at BEFORE UPDATE ON public.bookings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Function to handle new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, first_name, last_name)
  VALUES (NEW.id, NEW.raw_user_meta_data ->> 'first_name', NEW.raw_user_meta_data ->> 'last_name');
  
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, COALESCE((NEW.raw_user_meta_data ->> 'role')::app_role, 'user'));
  
  RETURN NEW;
END;
$$;

-- Trigger for new user signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

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
