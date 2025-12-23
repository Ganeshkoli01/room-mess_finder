import { Link } from "react-router-dom";
import { useMemo, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Building2, UtensilsCrossed, Shield, Star, Users, TrendingUp, ArrowRight, CheckCircle, MapPin, Navigation, Loader2 } from "lucide-react";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import SearchBar from "@/components/search/SearchBar";
import RoomCard from "@/components/cards/RoomCard";
import MessCard from "@/components/cards/MessCard";
import TestimonialsSection from "@/components/TestimonialsSection";
import NewsletterSection from "@/components/NewsletterSection";
import TrustBadges from "@/components/TrustBadges";
import { useLocation } from "@/contexts/LocationContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { getRooms } from "@/services/roomService";
import { getAllMess } from "@/services/messService";
import heroImage from "@/assets/hero-room.jpg";

// Demo data as fallback - Kolhapur locations
const demoRooms = [
  {
    id: "1",
    title: "Spacious Single Room Near Shivaji University",
    location: "Rajarampuri, Kolhapur",
    price: 5500,
    roomType: "Single",
    image: "https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?w=800",
    rating: 4.8,
    reviews: 124,
    facilities: ["wifi", "ac", "parking", "security"],
    isVerified: true,
    lat: 16.6869,
    lng: 74.2274,
  },
  {
    id: "2",
    title: "Affordable Shared Room for Students",
    location: "Shahupuri, Kolhapur",
    price: 3500,
    roomType: "Shared",
    image: "https://images.unsplash.com/photo-1555854877-bab0e564b8d5?w=800",
    rating: 4.5,
    reviews: 89,
    facilities: ["wifi", "water", "power"],
    isVerified: true,
    lat: 16.7050,
    lng: 74.2433,
  },
  {
    id: "3",
    title: "Premium Double Room with Balcony",
    location: "Tarabai Park, Kolhapur",
    price: 7000,
    roomType: "Double",
    image: "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=800",
    rating: 4.9,
    reviews: 56,
    facilities: ["wifi", "ac", "parking", "security"],
    isVerified: false,
    lat: 16.7107,
    lng: 74.2249,
  },
];

const demoMess = [
  {
    id: "1",
    name: "Shahu Bhojanalaya",
    location: "Rajarampuri, Kolhapur",
    pricePerMonth: 2500,
    foodType: "veg" as const,
    image: "https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?w=800",
    rating: 4.7,
    reviews: 234,
    timings: "7AM - 10PM",
    menuHighlights: ["Misal Pav", "Thali", "Tambda Rassa"],
    isVerified: true,
    lat: 16.6869,
    lng: 74.2274,
  },
  {
    id: "2",
    name: "Kolhapuri Kitchen Mess",
    location: "Shahupuri, Kolhapur",
    pricePerMonth: 3000,
    foodType: "both" as const,
    image: "https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=800",
    rating: 4.4,
    reviews: 178,
    timings: "8AM - 9PM",
    menuHighlights: ["Kolhapuri Mutton", "Thali", "Pandhra Rassa"],
    isVerified: true,
    lat: 16.7050,
    lng: 74.2433,
  },
  {
    id: "3",
    name: "Mahalaxmi Mess",
    location: "Ichalkaranji Road, Kolhapur",
    pricePerMonth: 2800,
    foodType: "non-veg" as const,
    image: "https://images.unsplash.com/photo-1476224203421-9ac39bcb3327?w=800",
    rating: 4.6,
    reviews: 145,
    timings: "7AM - 10PM",
    menuHighlights: ["Chicken Curry", "Fish Fry", "Mutton Thali"],
    isVerified: false,
    lat: 16.6990,
    lng: 74.2100,
  },
];

const stats = [
  { icon: Building2, value: "10,000+", label: "Verified Rooms" },
  { icon: UtensilsCrossed, value: "5,000+", label: "Mess Options" },
  { icon: Users, value: "50,000+", label: "Happy Students" },
  { icon: TrendingUp, value: "100+", label: "Cities Covered" },
];

const features = [
  {
    icon: Shield,
    title: "Verified Listings",
    description: "All properties are personally verified by our team for your safety.",
  },
  {
    icon: Star,
    title: "Genuine Reviews",
    description: "Real reviews from real students to help you make the right choice.",
  },
  {
    icon: CheckCircle,
    title: "Easy Booking",
    description: "Simple booking process with instant confirmation and support.",
  },
];

const Index = () => {
  const { location, requestLocation, calculateDistance, loading: locationLoading } = useLocation();
  const { t } = useLanguage();
  const [rooms, setRooms] = useState<any[]>([]);
  const [messList, setMessList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [usingDemoData, setUsingDemoData] = useState(false);

  // Auto-request location on page load
  useEffect(() => {
    requestLocation();
  }, []);

  // Fetch rooms and mess from database
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        // Always fetch all rooms and mess (location is used for sorting only)
        const [roomsData, messData] = await Promise.all([
          getRooms(),
          getAllMess(),
        ]);

        // Transform rooms data
        if (roomsData && roomsData.length > 0) {
          const transformedRooms = roomsData.slice(0, 3).map(room => ({
            id: room.id,
            title: room.title,
            location: room.location,
            price: room.price,
            roomType: room.room_type,
            image: room.images?.[0] || "https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?w=800",
            rating: room.rating || 0,
            reviews: room.reviews_count || 0,
            facilities: room.facilities || [],
            isVerified: room.is_verified,
            lat: room.latitude,
            lng: room.longitude,
            distance: room.distance,
          }));
          setRooms(transformedRooms);
          setUsingDemoData(false);
        } else {
          setRooms(demoRooms);
          setUsingDemoData(true);
        }

        // Transform mess data
        if (messData && messData.length > 0) {
          const transformedMess = messData.slice(0, 3).map(mess => ({
            id: mess.id,
            name: mess.name,
            location: mess.location,
            pricePerMonth: mess.price_per_month,
            foodType: mess.food_type,
            image: mess.images?.[0] || "https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?w=800",
            rating: mess.rating || 0,
            reviews: mess.reviews_count || 0,
            timings: mess.timings || "",
            menuHighlights: mess.menu_highlights || [],
            isVerified: mess.is_verified,
            lat: mess.latitude,
            lng: mess.longitude,
            distance: mess.distance,
          }));
          setMessList(transformedMess);
        } else {
          setMessList(demoMess);
        }
      } catch (error) {
        console.error("Error fetching data:", error);
        setRooms(demoRooms);
        setMessList(demoMess);
        setUsingDemoData(true);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []); // Fetch once on mount

  // Sort rooms by distance if location is available
  const sortedRooms = useMemo(() => {
    if (!location || !usingDemoData) return rooms;

    return [...rooms].sort((a, b) => {
      const distA = calculateDistance(a.lat, a.lng) || Infinity;
      const distB = calculateDistance(b.lat, b.lng) || Infinity;
      return distA - distB;
    });
  }, [location, calculateDistance, rooms, usingDemoData]);

  // Sort mess by distance if location is available
  const sortedMess = useMemo(() => {
    if (!location || !usingDemoData) return messList;

    return [...messList].sort((a, b) => {
      const distA = calculateDistance(a.lat, a.lng) || Infinity;
      const distB = calculateDistance(b.lat, b.lng) || Infinity;
      return distA - distB;
    });
  }, [location, calculateDistance, messList, usingDemoData]);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      {/* Hero Section */}
      <section className="relative pt-16 overflow-hidden">
        {/* Animated Gradient Background */}
        <div className="absolute inset-0 hero-animated-bg" />
        <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-10" />

        {/* Decorative Blobs */}
        <div className="absolute top-20 right-10 w-72 h-72 bg-primary-foreground/10 rounded-full blur-3xl animate-blob blob-1" />
        <div className="absolute bottom-20 left-10 w-96 h-96 bg-accent/10 rounded-full blur-3xl animate-blob blob-2" />
        <div className="absolute top-1/2 left-1/3 w-64 h-64 bg-primary/10 rounded-full blur-3xl animate-blob blob-3" />

        <div className="relative container mx-auto px-4 py-20 lg:py-32">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="text-center lg:text-left">
              <span className="inline-block px-4 py-1.5 rounded-full bg-primary-foreground/20 text-primary-foreground text-sm font-medium mb-6 animate-slide-up animate-stagger-1 btn-shine">
                🎓 {t('hero.trustedBy')}
              </span>
              <h1 className="font-heading text-4xl md:text-5xl lg:text-6xl font-bold text-primary-foreground leading-tight">
                <span className="animate-text-reveal inline-block animate-stagger-2">{t('hero.title')}</span>
                <span className="block animate-text-reveal animate-stagger-3">{t('hero.subtitle')}</span>
              </h1>
              <p className="mt-6 text-lg text-primary-foreground/80 max-w-xl mx-auto lg:mx-0 animate-slide-up animate-stagger-4">
                {t('hero.description')}
              </p>

              {/* Location Display */}
              {location && (
                <div className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-full glass text-primary-foreground animate-pop-in animate-stagger-5">
                  <MapPin className="w-4 h-4 animate-bounce-soft" />
                  <span className="text-sm">
                    {location.area ? `${location.area}, ` : ""}{location.city || "Your Location"}
                  </span>
                </div>
              )}

              {locationLoading && (
                <div className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary-foreground/20 text-primary-foreground">
                  <div className="w-4 h-4 border-2 border-primary-foreground/50 border-t-primary-foreground rounded-full animate-spin" />
                  <span className="text-sm">{t('common.loading')}</span>
                </div>
              )}

              <div className="flex flex-col sm:flex-row items-center gap-4 mt-8 justify-center lg:justify-start">
                <Link to="/rooms" className="w-full sm:w-auto animate-slide-up animate-stagger-5">
                  <Button variant="hero" size="xl" className="gap-2 w-full sm:w-auto btn-hover-grow btn-shine">
                    <Building2 className="w-5 h-5" />
                    {t('hero.findRooms')}
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </Button>
                </Link>
                <Link to="/mess" className="w-full sm:w-auto animate-slide-up animate-stagger-6">
                  <Button variant="hero-outline" size="xl" className="gap-2 w-full sm:w-auto btn-hover-grow">
                    <UtensilsCrossed className="w-5 h-5" />
                    {t('hero.findMess')}
                  </Button>
                </Link>
              </div>
            </div>

            <div className="relative hidden lg:block animate-float">
              <div className="relative rounded-3xl overflow-hidden shadow-2xl card-hover-glow">
                <img
                  src={heroImage}
                  alt="Cozy student room"
                  className="w-full h-auto object-cover animate-image-reveal"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-foreground/40 via-transparent to-transparent" />
              </div>
              {/* Floating Card */}
              <div className="absolute -bottom-6 -left-6 bg-card p-4 rounded-2xl shadow-xl animate-bounce-in glass" style={{ animationDelay: "0.3s" }}>
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-success/10 flex items-center justify-center animate-glow">
                    <CheckCircle className="w-6 h-6 text-success" />
                  </div>
                  <div>
                    <p className="font-semibold text-foreground">Verified</p>
                    <p className="text-sm text-muted-foreground">10,000+ Properties</p>
                  </div>
                </div>
              </div>
              {/* Location Card */}
              {location && (
                <div className="absolute -top-4 -right-4 bg-card p-3 rounded-xl shadow-xl animate-pop-in glass" style={{ animationDelay: "0.5s" }}>
                  <div className="flex items-center gap-2">
                    <Navigation className="w-5 h-5 text-primary animate-bounce-soft" />
                    <span className="text-sm font-medium">Near You</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Scroll Indicator */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-scroll-indicator hidden lg:block">
          <div className="w-6 h-10 rounded-full border-2 border-primary-foreground/30 flex justify-center pt-2">
            <div className="w-1 h-2 bg-primary-foreground/50 rounded-full" />
          </div>
        </div>

        {/* Wave Divider */}
        <div className="absolute bottom-0 left-0 right-0">
          <svg viewBox="0 0 1440 120" fill="none" className="w-full h-auto">
            <path
              d="M0 120L60 110C120 100 240 80 360 70C480 60 600 60 720 65C840 70 960 80 1080 85C1200 90 1320 90 1380 90L1440 90V120H1380C1320 120 1200 120 1080 120C960 120 840 120 720 120C600 120 480 120 360 120C240 120 120 120 60 120H0Z"
              fill="hsl(var(--background))"
            />
          </svg>
        </div>
      </section>

      {/* Search Section */}
      <section className="container mx-auto px-4 -mt-8 relative z-10">
        <SearchBar type="all" />
      </section>

      {/* Stats Section */}
      <section className="container mx-auto px-4 py-20">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          {stats.map((stat, index) => (
            <div
              key={stat.label}
              className={`text-center p-6 rounded-2xl bg-card shadow-soft card-hover-lift card-hover-glow animate-pop-in animate-stagger-${index + 1}`}
            >
              <div className="w-14 h-14 mx-auto rounded-xl bg-primary/10 flex items-center justify-center mb-4 group-hover:animate-bounce-soft">
                <stat.icon className="w-7 h-7 text-primary" />
              </div>
              <h3 className="font-heading font-bold text-2xl md:text-3xl text-foreground">{stat.value}</h3>
              <p className="text-muted-foreground mt-1">{stat.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Featured Rooms */}
      <section className="container mx-auto px-4 py-16 particles-bg">
        <div className="flex items-center justify-between mb-10">
          <div className="animate-slide-right">
            <h2 className="font-heading font-bold text-3xl text-foreground">
              {location ? t('section.roomsNearYou') : t('section.featuredRooms')}
            </h2>
            <p className="text-muted-foreground mt-2">
              {loading ? t('common.loading') : location ? "Sorted by distance from your location" : "Handpicked accommodations for you"}
              {usingDemoData && " (demo data)"}
            </p>
          </div>
          <Link to="/rooms" className="animate-slide-left">
            <Button variant="outline" className="gap-2 hidden sm:flex btn-hover-grow">
              {t('section.viewAll')}
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </Button>
          </Link>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {sortedRooms.map((room, index) => {
              const distance = room.distance || (location ? calculateDistance(room.lat, room.lng) : null);
              return (
                <div
                  key={room.id}
                  className={`relative animate-slide-up`}
                  style={{ animationDelay: `${index * 0.1}s` }}
                >
                  {location && distance !== null && (
                    <div className="absolute top-3 left-3 z-10 glass px-2 py-1 rounded-lg flex items-center gap-1">
                      <Navigation className="w-3 h-3 text-primary" />
                      <span className="text-xs font-medium">{distance.toFixed(1)} km</span>
                    </div>
                  )}
                  <RoomCard {...room} />
                </div>
              );
            })}
          </div>
        )}

        <div className="mt-8 text-center sm:hidden">
          <Link to="/rooms">
            <Button variant="outline" className="gap-2">
              {t('section.viewAll')} {t('nav.rooms')}
              <ArrowRight className="w-4 h-4" />
            </Button>
          </Link>
        </div>
      </section>

      {/* Featured Mess */}
      <section className="bg-muted/50 py-16">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between mb-10">
            <div>
              <h2 className="font-heading font-bold text-3xl text-foreground">
                {location ? t('section.messNearYou') : t('section.popularMess')}
              </h2>
              <p className="text-muted-foreground mt-2">
                {loading ? t('common.loading') : location ? "Sorted by distance from your location" : "Delicious & affordable food options"}
                {usingDemoData && " (demo data)"}
              </p>
            </div>
            <Link to="/mess">
              <Button variant="outline" className="gap-2 hidden sm:flex">
                {t('section.viewAll')}
                <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {sortedMess.map((mess) => {
                const distance = mess.distance || (location ? calculateDistance(mess.lat, mess.lng) : null);
                return (
                  <div key={mess.id} className="relative">
                    {location && distance !== null && (
                      <div className="absolute top-3 left-3 z-10 bg-background/90 backdrop-blur-sm px-2 py-1 rounded-lg flex items-center gap-1">
                        <Navigation className="w-3 h-3 text-primary" />
                        <span className="text-xs font-medium">{distance.toFixed(1)} km</span>
                      </div>
                    )}
                    <MessCard {...mess} />
                  </div>
                );
              })}
            </div>
          )}

          <div className="mt-8 text-center sm:hidden">
            <Link to="/mess">
              <Button variant="outline" className="gap-2">
                {t('section.viewAll')} {t('nav.mess')}
                <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Why Choose Us */}
      <section className="container mx-auto px-4 py-20">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <h2 className="font-heading font-bold text-3xl text-foreground">{t('section.whyChoose')}</h2>
          <p className="text-muted-foreground mt-3">
            We make finding accommodation simple, safe, and reliable
          </p>
        </div>
        <div className="grid md:grid-cols-3 gap-8">
          {features.map((feature, index) => (
            <div
              key={feature.title}
              className="text-center p-8 rounded-2xl bg-card shadow-soft hover:shadow-card transition-all duration-300 group"
            >
              <div className="w-16 h-16 mx-auto rounded-2xl gradient-hero flex items-center justify-center mb-6 group-hover:shadow-glow transition-all duration-300">
                <feature.icon className="w-8 h-8 text-primary-foreground" />
              </div>
              <h3 className="font-heading font-semibold text-xl text-foreground">{feature.title}</h3>
              <p className="text-muted-foreground mt-3">{feature.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA Section */}
      <section className="container mx-auto px-4 py-16">
        <div className="gradient-hero rounded-3xl p-8 md:p-16 text-center relative overflow-hidden">
          <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-10" />
          <div className="relative z-10">
            <h2 className="font-heading font-bold text-3xl md:text-4xl text-primary-foreground mb-4">
              {t('section.ownerCTA')}
            </h2>
            <p className="text-primary-foreground/80 max-w-xl mx-auto mb-8">
              List your property for free and reach thousands of students and working professionals looking for accommodation.
            </p>
            <Link to="/owner-dashboard">
              <Button variant="hero" size="xl" className="bg-primary-foreground text-primary hover:bg-primary-foreground/90">
                {t('section.listProperty')}
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <TestimonialsSection />

      {/* Newsletter */}
      <NewsletterSection />

      {/* Trust Badges */}
      <TrustBadges />

      <Footer />
    </div>
  );
};

export default Index;
