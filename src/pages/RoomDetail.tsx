import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
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
    Wifi,
    Car,
    Shield,
    Zap,
    Droplets,
    Wind,
    Building2,
    User,
    Calendar,
    ChevronLeft,
    ChevronRight,
    X,
    Navigation,
    MapPinned,
    ExternalLink,
    Globe,
    Mail,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { getRoomById, Room } from "@/services/roomService";
import { getOsmRoomById, PlaceContactInfo } from "@/services/osmPlacesService";
import { getCachedRoom } from "@/services/osmCacheService";
import { useLocation } from "@/contexts/LocationContext";
import logger from "@/lib/logger";
import ContactOwnerModal from "@/components/ContactOwnerModal";
import { makePhoneCall } from "@/services/contactService";

// Demo room data for fallback
const demoRoomDetails = {
    id: "1",
    title: "Spacious Single Room Near Shivaji University",
    description: "A beautifully furnished single room perfect for students and working professionals. Located in a peaceful residential area with easy access to public transport, markets, and educational institutions. The room features modern amenities and is maintained to high standards of cleanliness and comfort.",
    location: "Rajarampuri, Kolhapur",
    address: "123, Rajarampuri 8th Lane, Near Shivaji University Gate, Kolhapur - 416001",
    price: 5500,
    room_type: "Single",
    images: [
        "https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?w=800",
        "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=800",
        "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=800",
        "https://images.unsplash.com/photo-1555854877-bab0e564b8d5?w=800",
        "https://images.unsplash.com/photo-1536376072261-38c75010e6c9?w=800",
        "https://images.unsplash.com/photo-1505691938895-1758d7feb511?w=800",
    ],
    rating: 4.8,
    reviews_count: 124,
    facilities: ["WiFi", "AC", "Parking", "Security", "Power Backup", "Water Supply", "Attached Bathroom", "Furnished"],
    is_verified: true,
    latitude: 16.6869,
    longitude: 74.2274,
    owner_name: "Rajesh Patil",
    owner_phone: "+91 98765 43210",
    available_from: "Immediately",
    deposit: 10000,
    preferred_tenants: "Students, Working Professionals",
    rules: ["No Smoking", "No Pets", "Visitors allowed till 9 PM"],
};

const facilityIcons: { [key: string]: any } = {
    wifi: Wifi,
    ac: Wind,
    parking: Car,
    security: Shield,
    "power backup": Zap,
    power: Zap,
    "water supply": Droplets,
    water: Droplets,
    "attached bathroom": Droplets,
    furnished: Building2,
};

const getFacilityIcon = (facility: string) => {
    const key = facility.toLowerCase();
    return facilityIcons[key] || CheckCircle;
};

const reviews = [
    {
        id: 1,
        name: "Priya Sharma",
        rating: 5,
        date: "2 weeks ago",
        comment: "Excellent room! Very clean and well-maintained. The owner is very cooperative and helpful. Highly recommended for students.",
        avatar: "PS",
    },
    {
        id: 2,
        name: "Amit Kumar",
        rating: 4,
        date: "1 month ago",
        comment: "Good location and decent facilities. WiFi speed could be better but overall a great place to stay.",
        avatar: "AK",
    },
    {
        id: 3,
        name: "Sneha Desai",
        rating: 5,
        date: "2 months ago",
        comment: "I've been staying here for 6 months now. The room is spacious and the neighborhood is very safe. Perfect for female students.",
        avatar: "SD",
    },
];

const RoomDetail = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { toast } = useToast();
    const { location: userLocation, calculateDistance } = useLocation();

    const [room, setRoom] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [currentImageIndex, setCurrentImageIndex] = useState(0);
    const [showGallery, setShowGallery] = useState(false);
    const [isFavorite, setIsFavorite] = useState(false);
    const [showContactModal, setShowContactModal] = useState(false);

    useEffect(() => {
        const fetchRoom = async () => {
            setLoading(true);
            try {
                // Handle OSM room IDs
                if (id && id.startsWith("osm-room-")) {
                    logger.debug(`Fetching OSM room: ${id}`, { context: 'RoomDetail' });

                    // First check cache for 100% accuracy (same data as listing page)
                    const cachedRoom = getCachedRoom(id);

                    if (cachedRoom) {
                        logger.debug(`Using cached room data: ${cachedRoom.title}`, { context: 'RoomDetail' });
                        // Transform cached OSM data to match our room format
                        setRoom({
                            id: cachedRoom.id,
                            title: cachedRoom.title,
                            description: `${cachedRoom.title} is a ${cachedRoom.roomType} located at ${cachedRoom.location}. This property offers ${cachedRoom.facilities.join(", ")} and is available for rent. The accommodation is ${cachedRoom.distance ? `approximately ${cachedRoom.distance.toFixed(1)} km from your location.` : 'conveniently located in the area.'}`,
                            location: cachedRoom.location,
                            address: cachedRoom.address,
                            price: cachedRoom.price,
                            room_type: cachedRoom.roomType,
                            images: cachedRoom.photos,
                            rating: cachedRoom.rating,
                            reviews_count: cachedRoom.reviews,
                            facilities: cachedRoom.facilities,
                            is_verified: cachedRoom.isVerified,
                            latitude: cachedRoom.lat,
                            longitude: cachedRoom.lng,
                            isFromOSM: true,
                            distance: cachedRoom.distance,
                            // Real contact info from OSM
                            contact: cachedRoom.contact,
                            owner_name: cachedRoom.contact?.ownerName || cachedRoom.contact?.operatorName,
                            owner_phone: cachedRoom.contact?.phone,
                        });
                    } else {
                        // Fallback to API if not in cache
                        logger.debug('Room not in cache, fetching from API...', { context: 'RoomDetail' });
                        const osmRoom = await getOsmRoomById(id);
                        if (osmRoom) {
                            setRoom({
                                id: osmRoom.id,
                                title: osmRoom.title,
                                description: `${osmRoom.title} is a ${osmRoom.roomType} located at ${osmRoom.location}. This property offers ${osmRoom.facilities.join(", ")} and is available for rent.`,
                                location: osmRoom.location,
                                address: osmRoom.address,
                                price: osmRoom.price,
                                room_type: osmRoom.roomType,
                                images: osmRoom.photos,
                                rating: osmRoom.rating,
                                reviews_count: osmRoom.reviews,
                                facilities: osmRoom.facilities,
                                is_verified: osmRoom.isVerified,
                                latitude: osmRoom.lat,
                                longitude: osmRoom.lng,
                                isFromOSM: true,
                                // Real contact info from OSM
                                contact: osmRoom.contact,
                                owner_name: osmRoom.contact?.ownerName || osmRoom.contact?.operatorName,
                                owner_phone: osmRoom.contact?.phone,
                            });
                        } else {
                            setRoom(demoRoomDetails);
                        }
                    }
                } else if (id && !id.startsWith("google-") && id !== "1" && id !== "2" && id !== "3") {
                    // Database room
                    const data = await getRoomById(id);
                    if (data) {
                        setRoom(data);
                    } else {
                        setRoom(demoRoomDetails);
                    }
                } else {
                    // Use demo data for demo rooms
                    setRoom(demoRoomDetails);
                }
            } catch (error) {
                logger.error('Error fetching room:', error, { context: 'RoomDetail' });
                setRoom(demoRoomDetails);
            } finally {
                setLoading(false);
            }
        };

        fetchRoom();
    }, [id]);

    const handleShare = async () => {
        try {
            await navigator.share({
                title: room?.title,
                text: `Check out this room: ${room?.title}`,
                url: window.location.href,
            });
        } catch {
            navigator.clipboard.writeText(window.location.href);
            toast({
                title: "Link Copied!",
                description: "Room link copied to clipboard",
            });
        }
    };

    const handleFavorite = () => {
        setIsFavorite(!isFavorite);
        toast({
            title: isFavorite ? "Removed from favorites" : "Added to favorites",
            description: isFavorite ? "Room removed from your wishlist" : "Room saved to your wishlist",
        });
    };

    const handleContact = () => {
        toast({
            title: "Contact Request Sent",
            description: "The owner will contact you shortly",
        });
    };

    const nextImage = () => {
        const images = room?.images || demoRoomDetails.images;
        setCurrentImageIndex((prev) => (prev + 1) % images.length);
    };

    const prevImage = () => {
        const images = room?.images || demoRoomDetails.images;
        setCurrentImageIndex((prev) => (prev - 1 + images.length) % images.length);
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

    const displayRoom = room || demoRoomDetails;
    const images = displayRoom.images || demoRoomDetails.images;
    const distance = userLocation && displayRoom.latitude && displayRoom.longitude
        ? calculateDistance(displayRoom.latitude, displayRoom.longitude)
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

                {/* Image Gallery */}
                <div className="container mx-auto px-4 mb-8">
                    <div className="grid grid-cols-4 grid-rows-2 gap-2 h-[500px] rounded-2xl overflow-hidden">
                        {/* Main Image */}
                        <div
                            className="col-span-2 row-span-2 relative cursor-pointer group"
                            onClick={() => setShowGallery(true)}
                        >
                            <img
                                src={images[0]}
                                alt={displayRoom.title}
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
                                    alt={`Room view ${index + 2}`}
                                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                />
                                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors" />
                                {index === 3 && images.length > 5 && (
                                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                                        <span className="text-white font-semibold text-xl">+{images.length - 5} more</span>
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
                                            {displayRoom.isFromOSM && (
                                                <Badge variant="secondary" className="gap-1">
                                                    <MapPinned className="w-3 h-3" />
                                                    OpenStreetMap
                                                </Badge>
                                            )}
                                            {displayRoom.is_verified && (
                                                <Badge className="bg-success text-white gap-1">
                                                    <CheckCircle className="w-3 h-3" />
                                                    Verified
                                                </Badge>
                                            )}
                                            <Badge variant="secondary">{displayRoom.room_type || "Single"}</Badge>
                                            {distance !== null && (
                                                <Badge variant="outline" className="gap-1">
                                                    <Navigation className="w-3 h-3" />
                                                    {distance.toFixed(1)} km away
                                                </Badge>
                                            )}
                                        </div>
                                        <h1 className="font-heading font-bold text-3xl text-foreground">
                                            {displayRoom.title}
                                        </h1>
                                        <p className="flex items-center gap-2 text-muted-foreground mt-2">
                                            <MapPin className="w-4 h-4" />
                                            {displayRoom.address || displayRoom.location}
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

                                {/* Rating */}
                                <div className="flex items-center gap-4">
                                    <div className="flex items-center gap-1">
                                        <Star className="w-5 h-5 fill-yellow-400 text-yellow-400" />
                                        <span className="font-semibold">{displayRoom.rating || 4.8}</span>
                                    </div>
                                    <span className="text-muted-foreground">
                                        ({displayRoom.reviews_count || 124} reviews)
                                    </span>
                                </div>
                            </div>

                            {/* Description */}
                            <div className="bg-card rounded-2xl p-6 shadow-soft">
                                <h2 className="font-heading font-semibold text-xl mb-4">Description</h2>
                                <p className="text-muted-foreground leading-relaxed">
                                    {displayRoom.description || demoRoomDetails.description}
                                </p>
                            </div>

                            {/* Facilities */}
                            <div className="bg-card rounded-2xl p-6 shadow-soft">
                                <h2 className="font-heading font-semibold text-xl mb-4">Facilities & Amenities</h2>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                    {(displayRoom.facilities || demoRoomDetails.facilities).map((facility: string, index: number) => {
                                        const Icon = getFacilityIcon(facility);
                                        return (
                                            <div
                                                key={index}
                                                className="flex items-center gap-3 p-3 bg-muted rounded-xl"
                                            >
                                                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                                                    <Icon className="w-5 h-5 text-primary" />
                                                </div>
                                                <span className="text-sm font-medium">{facility}</span>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Room Details */}
                            <div className="bg-card rounded-2xl p-6 shadow-soft">
                                <h2 className="font-heading font-semibold text-xl mb-4">Room Details</h2>
                                <div className="grid md:grid-cols-2 gap-6">
                                    <div className="space-y-4">
                                        <div className="flex justify-between py-2 border-b">
                                            <span className="text-muted-foreground">Room Type</span>
                                            <span className="font-medium">{displayRoom.room_type || "Single"}</span>
                                        </div>
                                        <div className="flex justify-between py-2 border-b">
                                            <span className="text-muted-foreground">Available From</span>
                                            <span className="font-medium">{demoRoomDetails.available_from}</span>
                                        </div>
                                        <div className="flex justify-between py-2 border-b">
                                            <span className="text-muted-foreground">Security Deposit</span>
                                            <span className="font-medium">₹{demoRoomDetails.deposit.toLocaleString()}</span>
                                        </div>
                                    </div>
                                    <div className="space-y-4">
                                        <div className="flex justify-between py-2 border-b">
                                            <span className="text-muted-foreground">Preferred Tenants</span>
                                            <span className="font-medium">{demoRoomDetails.preferred_tenants}</span>
                                        </div>
                                        <div className="flex justify-between py-2 border-b">
                                            <span className="text-muted-foreground">Furnishing</span>
                                            <span className="font-medium">Fully Furnished</span>
                                        </div>
                                        <div className="flex justify-between py-2 border-b">
                                            <span className="text-muted-foreground">Floor</span>
                                            <span className="font-medium">2nd Floor</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* House Rules */}
                            <div className="bg-card rounded-2xl p-6 shadow-soft">
                                <h2 className="font-heading font-semibold text-xl mb-4">House Rules</h2>
                                <div className="space-y-3">
                                    {demoRoomDetails.rules.map((rule, index) => (
                                        <div key={index} className="flex items-center gap-3">
                                            <div className="w-2 h-2 rounded-full bg-primary" />
                                            <span className="text-muted-foreground">{rule}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Reviews */}
                            <div className="bg-card rounded-2xl p-6 shadow-soft">
                                <div className="flex items-center justify-between mb-6">
                                    <h2 className="font-heading font-semibold text-xl">Reviews</h2>
                                    <div className="flex items-center gap-2">
                                        <Star className="w-5 h-5 fill-yellow-400 text-yellow-400" />
                                        <span className="font-semibold">{displayRoom.rating || 4.8}</span>
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

                        {/* Right Column - Booking Card */}
                        <div className="lg:col-span-1">
                            <div className="bg-card rounded-2xl p-6 shadow-soft sticky top-24">
                                {/* Price */}
                                <div className="text-center mb-6 pb-6 border-b">
                                    <p className="text-muted-foreground mb-1">Monthly Rent</p>
                                    <p className="font-heading font-bold text-4xl text-primary">
                                        ₹{(displayRoom.price || 5500).toLocaleString()}
                                    </p>
                                    <p className="text-sm text-muted-foreground mt-1">+ ₹{demoRoomDetails.deposit.toLocaleString()} deposit</p>
                                </div>

                                {/* Owner Info - Real data from OSM or fallback */}
                                <div className="mb-6 pb-6 border-b">
                                    <h3 className="font-semibold mb-4">Property Contact</h3>
                                    <div className="flex items-center gap-4">
                                        <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center">
                                            <User className="w-7 h-7 text-primary" />
                                        </div>
                                        <div className="flex-1">
                                            <p className="font-semibold">
                                                {displayRoom.contact?.ownerName || displayRoom.contact?.operatorName || displayRoom.owner_name || "Property Manager"}
                                            </p>
                                            {displayRoom.contact?.hasContact ? (
                                                <p className="text-sm text-muted-foreground flex items-center gap-1">
                                                    <CheckCircle className="w-4 h-4 text-success" />
                                                    Verified Contact
                                                </p>
                                            ) : (
                                                <p className="text-sm text-amber-600 flex items-center gap-1">
                                                    Contact via visit
                                                </p>
                                            )}
                                            {displayRoom.contact?.phone && (
                                                <p className="text-sm text-primary font-medium mt-1">
                                                    {displayRoom.contact.phone}
                                                </p>
                                            )}
                                        </div>
                                    </div>

                                    {/* Quick Contact Buttons */}
                                    {displayRoom.contact?.hasContact && (
                                        <div className="flex gap-2 mt-4">
                                            {displayRoom.contact?.phone && (
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    className="gap-1"
                                                    onClick={() => makePhoneCall(displayRoom.contact.phone)}
                                                >
                                                    <Phone className="w-4 h-4" />
                                                    Call
                                                </Button>
                                            )}
                                            {displayRoom.contact?.website && (
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    className="gap-1"
                                                    onClick={() => window.open(displayRoom.contact.website, '_blank')}
                                                >
                                                    <Globe className="w-4 h-4" />
                                                    Website
                                                </Button>
                                            )}
                                            {displayRoom.contact?.email && (
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    className="gap-1"
                                                    onClick={() => window.open(`mailto:${displayRoom.contact.email}`, '_blank')}
                                                >
                                                    <Mail className="w-4 h-4" />
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
                                        <Calendar className="w-5 h-5" />
                                        Book Now
                                    </Button>
                                    {displayRoom.contact?.phone && (
                                        <Button
                                            variant="outline"
                                            className="w-full gap-2 border-green-500 text-green-600 hover:bg-green-50"
                                            size="lg"
                                            onClick={() => {
                                                const phone = displayRoom.contact.phone;
                                                const message = `Hi, I'm interested in booking "${displayRoom.title}" listed on RoomAndMess. Please share more details.`;
                                                window.open(`https://wa.me/${phone.replace(/\D/g, '')}?text=${encodeURIComponent(message)}`, '_blank');
                                            }}
                                        >
                                            <MessageCircle className="w-5 h-5" />
                                            WhatsApp Inquiry
                                        </Button>
                                    )}
                                    {displayRoom.contact?.phone && (
                                        <Button
                                            variant="outline"
                                            className="w-full gap-2"
                                            size="lg"
                                            onClick={() => makePhoneCall(displayRoom.contact.phone)}
                                        >
                                            <Phone className="w-5 h-5" />
                                            Call Now
                                        </Button>
                                    )}
                                </div>

                                {/* Quick Info */}
                                <div className="mt-6 pt-6 border-t space-y-3 text-sm">
                                    <div className="flex items-center gap-2 text-muted-foreground">
                                        <Calendar className="w-4 h-4" />
                                        Available: {demoRoomDetails.available_from}
                                    </div>
                                    <div className="flex items-center gap-2 text-muted-foreground">
                                        <MapPin className="w-4 h-4" />
                                        {displayRoom.location}
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
                        alt={`Room view ${currentImageIndex + 1}`}
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

            {/* Contact Owner Modal for Booking */}
            <ContactOwnerModal
                isOpen={showContactModal}
                onClose={() => setShowContactModal(false)}
                listingId={displayRoom.id}
                listingName={displayRoom.title}
                listingType="room"
                price={displayRoom.price || 5500}
                contact={displayRoom.contact}
            />
        </div>
    );
};

export default RoomDetail;
