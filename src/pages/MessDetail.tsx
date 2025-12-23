import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
    ArrowLeft,
    MapPin,
    Star,
    Heart,
    Share2,
    Phone,
    MessageCircle,
    CheckCircle,
    Clock,
    Leaf,
    Flame,
    UtensilsCrossed,
    User,
    Calendar,
    ChevronLeft,
    ChevronRight,
    X,
    Navigation,
    IndianRupee,
    MapPinned,
    Globe,
    Mail,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { getMessById, Mess } from "@/services/messService";
import { getOsmMessById, PlaceContactInfo } from "@/services/osmPlacesService";
import { getCachedMess } from "@/services/osmCacheService";
import { useLocation } from "@/contexts/LocationContext";
import logger from "@/lib/logger";
import ContactOwnerModal from "@/components/ContactOwnerModal";
import { makePhoneCall } from "@/services/contactService";

// Demo mess data for fallback
const demoMessDetails = {
    id: "1",
    name: "Shahu Bhojanalaya",
    description: "Authentic Kolhapuri home-style cooking serving delicious vegetarian and non-vegetarian meals. Our mess is known for its traditional recipes passed down through generations. We use fresh ingredients and prepare meals with love, just like home. Perfect for students, working professionals, and anyone who appreciates good food.",
    location: "Rajarampuri, Kolhapur",
    address: "Near Shivaji University Main Gate, Rajarampuri 8th Lane, Kolhapur - 416001",
    price_per_month: 2500,
    food_type: "veg",
    timings: "7:00 AM - 10:00 PM",
    images: [
        "https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?w=800",
        "https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=800",
        "https://images.unsplash.com/photo-1476224203421-9ac39bcb3327?w=800",
        "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=800",
        "https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=800",
        "https://images.unsplash.com/photo-1540189549336-e6e99c3679fe?w=800",
    ],
    rating: 4.7,
    reviews_count: 234,
    menu_highlights: ["Misal Pav", "Thali", "Tambda Rassa", "Pandhra Rassa", "Bhakri", "Zunka"],
    is_verified: true,
    latitude: 16.6869,
    longitude: 74.2274,
    owner_name: "Sanjay Shinde",
    owner_phone: "+91 98765 43210",
    meal_options: ["Breakfast", "Lunch", "Dinner"],
    special_features: ["Home-style Cooking", "Fresh Ingredients", "Clean Kitchen", "Hygienic Preparation", "Unlimited Meals"],
};

const weeklyMenu = [
    { day: "Monday", lunch: "Varan Bhaat, Bhaji, Chapati, Salad", dinner: "Misal Pav, Buttermilk" },
    { day: "Tuesday", lunch: "Usal, Rice, Chapati, Papad", dinner: "Dal Khichdi, Kadhi" },
    { day: "Wednesday", lunch: "Tambda Rassa, Rice, Bhakri", dinner: "Veg Pulao, Raita" },
    { day: "Thursday", lunch: "Matki Usal, Chapati, Rice", dinner: "Chole Bhature" },
    { day: "Friday", lunch: "Pandhra Rassa, Rice, Bhakri", dinner: "Pav Bhaji" },
    { day: "Saturday", lunch: "Special Thali", dinner: "Biryani (Veg/Non-veg)" },
    { day: "Sunday", lunch: "Mutton Thali / Paneer Thali", dinner: "Light Dinner" },
];

const reviews = [
    {
        id: 1,
        name: "Rahul Jadhav",
        rating: 5,
        date: "1 week ago",
        comment: "Best mess in Kolhapur! The Tambda Rassa and Pandhra Rassa are absolutely authentic. Feels like eating at home.",
        avatar: "RJ",
    },
    {
        id: 2,
        name: "Priyanka Patil",
        rating: 4,
        date: "2 weeks ago",
        comment: "Good food quality and quantity. The Misal Pav is amazing. Monthly subscription is great value for money.",
        avatar: "PP",
    },
    {
        id: 3,
        name: "Vikram More",
        rating: 5,
        date: "1 month ago",
        comment: "Been eating here for 2 years now. Consistent quality and the owners are very caring. Highly recommended!",
        avatar: "VM",
    },
];

const MessDetail = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { toast } = useToast();
    const { location: userLocation, calculateDistance } = useLocation();

    const [mess, setMess] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [currentImageIndex, setCurrentImageIndex] = useState(0);
    const [showGallery, setShowGallery] = useState(false);
    const [isFavorite, setIsFavorite] = useState(false);
    const [showContactModal, setShowContactModal] = useState(false);

    useEffect(() => {
        const fetchMess = async () => {
            setLoading(true);
            try {
                // Handle OSM mess IDs
                if (id && id.startsWith("osm-mess-")) {
                    logger.debug(`Fetching OSM mess: ${id}`, { context: 'MessDetail' });

                    // First check cache for 100% accuracy (same data as listing page)
                    const cachedMess = getCachedMess(id);

                    if (cachedMess) {
                        logger.debug(`Using cached mess data: ${cachedMess.name}`, { context: 'MessDetail' });
                        // Transform cached OSM data to match our mess format
                        setMess({
                            id: cachedMess.id,
                            name: cachedMess.name,
                            description: `${cachedMess.name} is a ${cachedMess.foodType === "veg" ? "vegetarian" : cachedMess.foodType === "non-veg" ? "non-vegetarian" : "multi-cuisine"} restaurant located at ${cachedMess.location}. They offer ${cachedMess.menuHighlights.join(", ")}. ${cachedMess.distance ? `It is approximately ${cachedMess.distance.toFixed(1)} km from your location.` : ''}`,
                            location: cachedMess.location,
                            address: cachedMess.address,
                            price_per_month: cachedMess.pricePerMonth,
                            food_type: cachedMess.foodType,
                            timings: cachedMess.timings,
                            images: cachedMess.photos,
                            rating: cachedMess.rating,
                            reviews_count: cachedMess.reviews,
                            menu_highlights: cachedMess.menuHighlights,
                            is_verified: cachedMess.isVerified,
                            latitude: cachedMess.lat,
                            longitude: cachedMess.lng,
                            isFromOSM: true,
                            distance: cachedMess.distance,
                            // Real contact info from OSM
                            contact: cachedMess.contact,
                            owner_name: cachedMess.contact?.ownerName || cachedMess.contact?.operatorName,
                            owner_phone: cachedMess.contact?.phone,
                        });
                    } else {
                        // Fallback to API if not in cache
                        logger.debug('Mess not in cache, fetching from API...', { context: 'MessDetail' });
                        const osmMess = await getOsmMessById(id);
                        if (osmMess) {
                            setMess({
                                id: osmMess.id,
                                name: osmMess.name,
                                description: `${osmMess.name} is a ${osmMess.foodType === "veg" ? "vegetarian" : osmMess.foodType === "non-veg" ? "non-vegetarian" : "multi-cuisine"} restaurant located at ${osmMess.location}. They offer ${osmMess.menuHighlights.join(", ")}.`,
                                location: osmMess.location,
                                address: osmMess.address,
                                price_per_month: osmMess.pricePerMonth,
                                food_type: osmMess.foodType,
                                timings: osmMess.timings,
                                images: osmMess.photos,
                                rating: osmMess.rating,
                                reviews_count: osmMess.reviews,
                                menu_highlights: osmMess.menuHighlights,
                                is_verified: osmMess.isVerified,
                                latitude: osmMess.lat,
                                longitude: osmMess.lng,
                                isFromOSM: true,
                                // Real contact info from OSM
                                contact: osmMess.contact,
                                owner_name: osmMess.contact?.ownerName || osmMess.contact?.operatorName,
                                owner_phone: osmMess.contact?.phone,
                            });
                        } else {
                            setMess(demoMessDetails);
                        }
                    }
                } else if (id && !id.startsWith("google-") && id !== "1" && id !== "2" && id !== "3") {
                    // Database mess
                    const data = await getMessById(id);
                    if (data) {
                        setMess(data);
                    } else {
                        setMess(demoMessDetails);
                    }
                } else {
                    setMess(demoMessDetails);
                }
            } catch (error) {
                logger.error('Error fetching mess:', error, { context: 'MessDetail' });
                setMess(demoMessDetails);
            } finally {
                setLoading(false);
            }
        };

        fetchMess();
    }, [id]);

    const handleShare = async () => {
        try {
            await navigator.share({
                title: mess?.name,
                text: `Check out this mess: ${mess?.name}`,
                url: window.location.href,
            });
        } catch {
            navigator.clipboard.writeText(window.location.href);
            toast({
                title: "Link Copied!",
                description: "Mess link copied to clipboard",
            });
        }
    };

    const handleFavorite = () => {
        setIsFavorite(!isFavorite);
        toast({
            title: isFavorite ? "Removed from favorites" : "Added to favorites",
            description: isFavorite ? "Mess removed from your wishlist" : "Mess saved to your wishlist",
        });
    };

    const handleContact = () => {
        toast({
            title: "Contact Request Sent",
            description: "The owner will contact you shortly",
        });
    };

    const nextImage = () => {
        const images = mess?.images || demoMessDetails.images;
        setCurrentImageIndex((prev) => (prev + 1) % images.length);
    };

    const prevImage = () => {
        const images = mess?.images || demoMessDetails.images;
        setCurrentImageIndex((prev) => (prev - 1 + images.length) % images.length);
    };

    const getFoodTypeInfo = (type: string) => {
        switch (type) {
            case "veg":
                return { label: "Pure Vegetarian", icon: Leaf, color: "text-green-600 bg-green-100" };
            case "non-veg":
                return { label: "Non-Vegetarian", icon: Flame, color: "text-red-600 bg-red-100" };
            default:
                return { label: "Veg & Non-Veg", icon: UtensilsCrossed, color: "text-orange-600 bg-orange-100" };
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-background">
                <Navbar />
                <div className="pt-24 pb-16 flex items-center justify-center">
                    <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
                </div>
            </div>
        );
    }

    const displayMess = mess || demoMessDetails;
    const images = displayMess.images || demoMessDetails.images;
    const foodTypeInfo = getFoodTypeInfo(displayMess.food_type || "veg");
    const FoodIcon = foodTypeInfo.icon;
    const distance = userLocation && displayMess.latitude && displayMess.longitude
        ? calculateDistance(displayMess.latitude, displayMess.longitude)
        : null;

    return (
        <div className="min-h-screen bg-background">
            <Navbar />

            <main className="pt-20 pb-16">
                {/* Back Button */}
                <div className="container mx-auto px-4 py-4">
                    <button
                        onClick={() => navigate(-1)}
                        className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
                    >
                        <ArrowLeft className="w-5 h-5" />
                        Back to listings
                    </button>
                </div>

                {/* Image Gallery - Mobile: Single image with swipe, Desktop: Grid */}
                <div className="container mx-auto px-4 mb-6 md:mb-8">
                    {/* Mobile Image Carousel */}
                    <div className="block md:hidden relative h-[250px] sm:h-[300px] rounded-xl overflow-hidden">
                        <img
                            src={images[currentImageIndex]}
                            alt={displayMess.name}
                            className="w-full h-full object-cover"
                        />
                        {/* Navigation arrows */}
                        <button
                            onClick={prevImage}
                            className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 bg-black/50 rounded-full flex items-center justify-center text-white"
                        >
                            <ChevronLeft className="w-5 h-5" />
                        </button>
                        <button
                            onClick={nextImage}
                            className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 bg-black/50 rounded-full flex items-center justify-center text-white"
                        >
                            <ChevronRight className="w-5 h-5" />
                        </button>
                        {/* Image counter */}
                        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 px-3 py-1 bg-black/50 rounded-full text-white text-sm">
                            {currentImageIndex + 1} / {images.length}
                        </div>
                        {/* View all button */}
                        <button
                            onClick={() => setShowGallery(true)}
                            className="absolute bottom-2 right-2 px-3 py-1 bg-white/90 rounded-lg text-sm font-medium"
                        >
                            View All
                        </button>
                    </div>

                    {/* Desktop Grid Gallery */}
                    <div className="hidden md:grid grid-cols-4 grid-rows-2 gap-2 h-[400px] lg:h-[500px] rounded-2xl overflow-hidden">
                        {/* Main Image */}
                        <div
                            className="col-span-2 row-span-2 relative cursor-pointer group"
                            onClick={() => setShowGallery(true)}
                        >
                            <img
                                src={images[0]}
                                alt={displayMess.name}
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                            />
                            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors" />
                        </div>

                        {/* Other Images */}
                        {images.slice(1, 5).map((img: string, index: number) => (
                            <div
                                key={index}
                                className="relative cursor-pointer group overflow-hidden"
                                onClick={() => {
                                    setCurrentImageIndex(index + 1);
                                    setShowGallery(true);
                                }}
                            >
                                <img
                                    src={img}
                                    alt={`Food ${index + 2}`}
                                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                />
                                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors" />
                                {index === 3 && images.length > 5 && (
                                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                                        <span className="text-white font-semibold text-lg">+{images.length - 5} more</span>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>

                {/* Content */}
                <div className="container mx-auto px-4">
                    <div className="grid lg:grid-cols-3 gap-8">
                        {/* Left Column - Details */}
                        <div className="lg:col-span-2 space-y-8">
                            {/* Title & Badges */}
                            <div>
                                <div className="flex items-start justify-between gap-4 mb-4">
                                    <div>
                                        <div className="flex items-center gap-2 mb-2 flex-wrap">
                                            {displayMess.isFromOSM && (
                                                <Badge variant="secondary" className="gap-1">
                                                    <MapPinned className="w-3 h-3" />
                                                    OpenStreetMap
                                                </Badge>
                                            )}
                                            {displayMess.is_verified && (
                                                <Badge className="bg-success text-white gap-1">
                                                    <CheckCircle className="w-3 h-3" />
                                                    Verified
                                                </Badge>
                                            )}
                                            <Badge className={`gap-1 ${foodTypeInfo.color}`}>
                                                <FoodIcon className="w-3 h-3" />
                                                {foodTypeInfo.label}
                                            </Badge>
                                            {distance !== null && (
                                                <Badge variant="outline" className="gap-1">
                                                    <Navigation className="w-3 h-3" />
                                                    {distance.toFixed(1)} km away
                                                </Badge>
                                            )}
                                        </div>
                                        <h1 className="font-heading font-bold text-xl sm:text-2xl md:text-3xl text-foreground">
                                            {displayMess.name}
                                        </h1>
                                        <p className="flex items-center gap-2 text-muted-foreground mt-2">
                                            <MapPin className="w-4 h-4" />
                                            {displayMess.address || displayMess.location}
                                        </p>
                                    </div>

                                    {/* Action Buttons */}
                                    <div className="flex gap-2">
                                        <Button
                                            variant="outline"
                                            size="icon"
                                            onClick={handleShare}
                                        >
                                            <Share2 className="w-5 h-5" />
                                        </Button>
                                        <Button
                                            variant="outline"
                                            size="icon"
                                            onClick={handleFavorite}
                                            className={isFavorite ? "text-red-500 border-red-500" : ""}
                                        >
                                            <Heart className={`w-5 h-5 ${isFavorite ? "fill-current" : ""}`} />
                                        </Button>
                                    </div>
                                </div>

                                {/* Rating & Timings */}
                                <div className="flex items-center gap-6 flex-wrap">
                                    <div className="flex items-center gap-1">
                                        <Star className="w-5 h-5 fill-yellow-400 text-yellow-400" />
                                        <span className="font-semibold">{displayMess.rating || 4.7}</span>
                                        <span className="text-muted-foreground">
                                            ({displayMess.reviews_count || 234} reviews)
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-1 text-muted-foreground">
                                        <Clock className="w-4 h-4" />
                                        <span>{displayMess.timings || demoMessDetails.timings}</span>
                                    </div>
                                </div>
                            </div>

                            {/* Description */}
                            <div className="bg-card rounded-2xl p-6 shadow-soft">
                                <h2 className="font-heading font-semibold text-xl mb-4">About</h2>
                                <p className="text-muted-foreground leading-relaxed">
                                    {displayMess.description || demoMessDetails.description}
                                </p>
                            </div>

                            {/* Menu Highlights */}
                            <div className="bg-card rounded-2xl p-6 shadow-soft">
                                <h2 className="font-heading font-semibold text-xl mb-4">Menu Highlights</h2>
                                <div className="flex flex-wrap gap-2">
                                    {(displayMess.menu_highlights || demoMessDetails.menu_highlights).map((item: string, index: number) => (
                                        <Badge key={index} variant="secondary" className="text-sm py-2 px-4">
                                            {item}
                                        </Badge>
                                    ))}
                                </div>
                            </div>

                            {/* Weekly Menu */}
                            <div className="bg-card rounded-2xl p-6 shadow-soft">
                                <h2 className="font-heading font-semibold text-xl mb-4">Weekly Menu</h2>
                                <div className="overflow-x-auto">
                                    <table className="w-full">
                                        <thead>
                                            <tr className="border-b">
                                                <th className="text-left py-3 px-4 font-semibold">Day</th>
                                                <th className="text-left py-3 px-4 font-semibold">Lunch</th>
                                                <th className="text-left py-3 px-4 font-semibold">Dinner</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {weeklyMenu.map((menu, index) => (
                                                <tr key={index} className="border-b last:border-0">
                                                    <td className="py-3 px-4 font-medium">{menu.day}</td>
                                                    <td className="py-3 px-4 text-muted-foreground">{menu.lunch}</td>
                                                    <td className="py-3 px-4 text-muted-foreground">{menu.dinner}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>

                            {/* Special Features */}
                            <div className="bg-card rounded-2xl p-6 shadow-soft">
                                <h2 className="font-heading font-semibold text-xl mb-4">Special Features</h2>
                                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                                    {demoMessDetails.special_features.map((feature, index) => (
                                        <div
                                            key={index}
                                            className="flex items-center gap-3 p-3 bg-muted rounded-xl"
                                        >
                                            <CheckCircle className="w-5 h-5 text-success flex-shrink-0" />
                                            <span className="text-sm font-medium">{feature}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Meal Plans */}
                            <div className="bg-card rounded-2xl p-6 shadow-soft">
                                <h2 className="font-heading font-semibold text-xl mb-4">Meal Plans Available</h2>
                                <div className="grid md:grid-cols-3 gap-4">
                                    <div className="border rounded-xl p-4 text-center hover:border-primary transition-colors cursor-pointer">
                                        <p className="font-semibold text-lg mb-1">Lunch Only</p>
                                        <p className="text-2xl font-bold text-primary">₹1,500</p>
                                        <p className="text-sm text-muted-foreground">/month</p>
                                    </div>
                                    <div className="border-2 border-primary rounded-xl p-4 text-center relative">
                                        <Badge className="absolute -top-2 left-1/2 -translate-x-1/2">Popular</Badge>
                                        <p className="font-semibold text-lg mb-1">Lunch + Dinner</p>
                                        <p className="text-2xl font-bold text-primary">₹2,500</p>
                                        <p className="text-sm text-muted-foreground">/month</p>
                                    </div>
                                    <div className="border rounded-xl p-4 text-center hover:border-primary transition-colors cursor-pointer">
                                        <p className="font-semibold text-lg mb-1">All Three Meals</p>
                                        <p className="text-2xl font-bold text-primary">₹3,500</p>
                                        <p className="text-sm text-muted-foreground">/month</p>
                                    </div>
                                </div>
                            </div>

                            {/* Reviews */}
                            <div className="bg-card rounded-2xl p-6 shadow-soft">
                                <div className="flex items-center justify-between mb-6">
                                    <h2 className="font-heading font-semibold text-xl">Reviews</h2>
                                    <div className="flex items-center gap-2">
                                        <Star className="w-5 h-5 fill-yellow-400 text-yellow-400" />
                                        <span className="font-semibold">{displayMess.rating || 4.7}</span>
                                        <span className="text-muted-foreground">({reviews.length} reviews)</span>
                                    </div>
                                </div>

                                <div className="space-y-6">
                                    {reviews.map((review) => (
                                        <div key={review.id} className="border-b pb-6 last:border-0 last:pb-0">
                                            <div className="flex items-start gap-4">
                                                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                                                    <span className="font-semibold text-primary">{review.avatar}</span>
                                                </div>
                                                <div className="flex-1">
                                                    <div className="flex items-center justify-between mb-2">
                                                        <div>
                                                            <h4 className="font-semibold">{review.name}</h4>
                                                            <span className="text-sm text-muted-foreground">{review.date}</span>
                                                        </div>
                                                        <div className="flex items-center gap-1">
                                                            {[...Array(5)].map((_, i) => (
                                                                <Star
                                                                    key={i}
                                                                    className={`w-4 h-4 ${i < review.rating ? "fill-yellow-400 text-yellow-400" : "text-muted"}`}
                                                                />
                                                            ))}
                                                        </div>
                                                    </div>
                                                    <p className="text-muted-foreground">{review.comment}</p>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                <Button variant="outline" className="w-full mt-6">
                                    View All Reviews
                                </Button>
                            </div>
                        </div>

                        {/* Right Column - Subscription Card */}
                        <div className="lg:col-span-1">
                            <div className="bg-card rounded-2xl p-6 shadow-soft sticky top-24">
                                {/* Price */}
                                <div className="text-center mb-6 pb-6 border-b">
                                    <p className="text-muted-foreground mb-1">Starting from</p>
                                    <p className="font-heading font-bold text-4xl text-primary">
                                        ₹{(displayMess.price_per_month || 2500).toLocaleString()}
                                    </p>
                                    <p className="text-sm text-muted-foreground mt-1">/month (Lunch + Dinner)</p>
                                </div>

                                {/* Timings */}
                                <div className="mb-6 pb-6 border-b">
                                    <h3 className="font-semibold mb-3">Service Timings</h3>
                                    <div className="space-y-2 text-sm">
                                        <div className="flex justify-between">
                                            <span className="text-muted-foreground">Breakfast</span>
                                            <span>7:00 AM - 9:30 AM</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-muted-foreground">Lunch</span>
                                            <span>12:00 PM - 2:30 PM</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-muted-foreground">Dinner</span>
                                            <span>7:30 PM - 10:00 PM</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Owner Info - Real data from OSM or fallback */}
                                <div className="mb-6 pb-6 border-b">
                                    <h3 className="font-semibold mb-4">Contact</h3>
                                    <div className="flex items-center gap-4">
                                        <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center">
                                            <User className="w-7 h-7 text-primary" />
                                        </div>
                                        <div className="flex-1">
                                            <p className="font-semibold">
                                                {displayMess.contact?.ownerName || displayMess.contact?.operatorName || displayMess.owner_name || "Mess Manager"}
                                            </p>
                                            {displayMess.contact?.hasContact ? (
                                                <p className="text-sm text-muted-foreground flex items-center gap-1">
                                                    <CheckCircle className="w-4 h-4 text-success" />
                                                    Verified Contact
                                                </p>
                                            ) : (
                                                <p className="text-sm text-amber-600 flex items-center gap-1">
                                                    Contact via visit
                                                </p>
                                            )}
                                            {displayMess.contact?.phone && (
                                                <p className="text-sm text-primary font-medium mt-1">
                                                    {displayMess.contact.phone}
                                                </p>
                                            )}
                                        </div>
                                    </div>

                                    {/* Quick Contact Buttons - Responsive grid */}
                                    {displayMess.contact?.hasContact && (
                                        <div className="grid grid-cols-2 sm:flex gap-2 mt-4">
                                            {displayMess.contact?.phone && (
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    className="gap-1 text-xs sm:text-sm"
                                                    onClick={() => makePhoneCall(displayMess.contact.phone)}
                                                >
                                                    <Phone className="w-3 h-3 sm:w-4 sm:h-4" />
                                                    Call
                                                </Button>
                                            )}
                                            {displayMess.contact?.website && (
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    className="gap-1 text-xs sm:text-sm"
                                                    onClick={() => window.open(displayMess.contact.website, '_blank')}
                                                >
                                                    <Globe className="w-3 h-3 sm:w-4 sm:h-4" />
                                                    Website
                                                </Button>
                                            )}
                                            {displayMess.contact?.email && (
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    className="gap-1 text-xs sm:text-sm col-span-2 sm:col-span-1"
                                                    onClick={() => window.open(`mailto:${displayMess.contact.email}`, '_blank')}
                                                >
                                                    <Mail className="w-3 h-3 sm:w-4 sm:h-4" />
                                                    Email
                                                </Button>
                                            )}
                                        </div>
                                    )}
                                </div>

                                {/* Action Buttons */}
                                <div className="space-y-3">
                                    <Button
                                        className="w-full gap-2 bg-gradient-to-r from-primary to-primary/80"
                                        size="lg"
                                        onClick={() => setShowContactModal(true)}
                                    >
                                        <IndianRupee className="w-5 h-5" />
                                        Subscribe Now
                                    </Button>
                                    {/* Mobile: 2 buttons side by side */}
                                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-1">
                                        {displayMess.contact?.phone && (
                                            <Button
                                                variant="outline"
                                                className="gap-1 sm:gap-2 border-green-500 text-green-600 hover:bg-green-50 text-xs sm:text-sm"
                                                size="default"
                                                onClick={() => {
                                                    const phone = displayMess.contact.phone;
                                                    const message = `Hi, I'm interested in subscribing to "${displayMess.name}" mess listed on RoomAndMess. Please share subscription details.`;
                                                    window.open(`https://wa.me/${phone.replace(/\D/g, '')}?text=${encodeURIComponent(message)}`, '_blank');
                                                }}
                                            >
                                                <MessageCircle className="w-4 h-4" />
                                                WhatsApp
                                            </Button>
                                        )}
                                        {displayMess.contact?.phone && (
                                            <Button
                                                variant="outline"
                                                className="gap-1 sm:gap-2 text-xs sm:text-sm"
                                                size="default"
                                                onClick={() => makePhoneCall(displayMess.contact.phone)}
                                            >
                                                <Phone className="w-4 h-4" />
                                                Call
                                            </Button>
                                        )}
                                    </div>
                                </div>

                                {/* Quick Info */}
                                <div className="mt-6 pt-6 border-t space-y-3 text-sm">
                                    <div className="flex items-center gap-2 text-muted-foreground">
                                        <Clock className="w-4 h-4" />
                                        Open: {displayMess.timings || demoMessDetails.timings}
                                    </div>
                                    <div className="flex items-center gap-2 text-muted-foreground">
                                        <MapPin className="w-4 h-4" />
                                        {displayMess.location}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </main>

            {/* Fullscreen Gallery Modal */}
            {showGallery && (
                <div className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center">
                    <button
                        onClick={() => setShowGallery(false)}
                        className="absolute top-4 right-4 text-white hover:text-gray-300 z-10"
                    >
                        <X className="w-8 h-8" />
                    </button>

                    <button
                        onClick={prevImage}
                        className="absolute left-4 text-white hover:text-gray-300"
                    >
                        <ChevronLeft className="w-10 h-10" />
                    </button>

                    <img
                        src={images[currentImageIndex]}
                        alt={`Food ${currentImageIndex + 1}`}
                        className="max-h-[90vh] max-w-[90vw] object-contain"
                    />

                    <button
                        onClick={nextImage}
                        className="absolute right-4 text-white hover:text-gray-300"
                    >
                        <ChevronRight className="w-10 h-10" />
                    </button>

                    {/* Image Counter */}
                    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-white">
                        {currentImageIndex + 1} / {images.length}
                    </div>

                    {/* Thumbnail Strip */}
                    <div className="absolute bottom-16 left-1/2 -translate-x-1/2 flex gap-2">
                        {images.map((img: string, index: number) => (
                            <button
                                key={index}
                                onClick={() => setCurrentImageIndex(index)}
                                className={`w-16 h-12 rounded overflow-hidden border-2 ${index === currentImageIndex ? "border-white" : "border-transparent opacity-50"
                                    }`}
                            >
                                <img src={img} alt="" className="w-full h-full object-cover" />
                            </button>
                        ))}
                    </div>
                </div>
            )}

            <Footer />

            {/* Contact Owner Modal for Subscription */}
            <ContactOwnerModal
                isOpen={showContactModal}
                onClose={() => setShowContactModal(false)}
                listingId={displayMess.id}
                listingName={displayMess.name}
                listingType="mess"
                price={displayMess.price_per_month || 2500}
                contact={displayMess.contact}
            />
        </div>
    );
};

export default MessDetail;
