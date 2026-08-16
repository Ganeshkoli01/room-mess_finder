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
    AlertOctagon,
    Flag,
    Loader2,
    Trash2,
    Edit,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { getRoomById, updateRoom, Room } from "@/services/roomService";
import { ListingAvailabilityCalendar } from "@/components/booking/ListingAvailabilityCalendar";
import { uploadListingImage } from "@/services/uploadService";
import { getOsmRoomById, PlaceContactInfo } from "@/services/osmPlacesService";
import { getCachedRoom } from "@/services/osmCacheService";
import { useLocation } from "@/contexts/LocationContext";
import logger from "@/lib/logger";
import ContactOwnerModal from "@/components/ContactOwnerModal";
import { makePhoneCall } from "@/services/contactService";
import { useAuth } from "@/contexts/AuthContext";
import { createReport, createReview, getReviews, deleteReview } from "@/services/moderationService";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

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
    const { user, userRole } = useAuth();

    const [room, setRoom] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    // Edit listing states
    const [editingRoom, setEditingRoom] = useState<any | null>(null);
    const [savingRoomEdits, setSavingRoomEdits] = useState(false);
    const facilityOptions = ["Wi-Fi", "Parking", "AC", "Power Backup", "Water Supply", "Security", "Geyser", "Gym"];

    // Phase 4 states
    const [customReviews, setCustomReviews] = useState<any[]>([]);
    const [loadingReviews, setLoadingReviews] = useState(false);
    const [newReviewRating, setNewReviewRating] = useState(5);
    const [newReviewComment, setNewReviewComment] = useState("");
    const [submittingReview, setSubmittingReview] = useState(false);

    const [showReportListingModal, setShowReportListingModal] = useState(false);
    const [reportListingReason, setReportListingReason] = useState("Incorrect details");
    const [reportListingDetail, setReportListingDetail] = useState("");
    const [submittingListingReport, setSubmittingListingReport] = useState(false);

    const [reportingReview, setReportingReview] = useState<any>(null);
    const [reportReviewReason, setReportReviewReason] = useState("Spam");
    const [reportReviewDetail, setReportReviewDetail] = useState("");
    const [submittingReviewReport, setSubmittingReviewReport] = useState(false);
    const [reviewToDelete, setReviewToDelete] = useState<string | null>(null);
    const [currentImageIndex, setCurrentImageIndex] = useState(0);
    const [showGallery, setShowGallery] = useState(false);
    const [isFavorite, setIsFavorite] = useState(false);
    const [showContactModal, setShowContactModal] = useState(false);

    const saveRoomEdits = async () => {
        if (!editingRoom) return;
        setSavingRoomEdits(true);
        try {
            const result = await updateRoom(editingRoom.id, {
                title: editingRoom.title,
                description: editingRoom.description,
                location: editingRoom.location,
                address: editingRoom.address,
                city: editingRoom.city,
                price: Number(editingRoom.price),
                deposit: Number(editingRoom.deposit),
                room_type: editingRoom.room_type,
                facilities: editingRoom.facilities,
                rules: editingRoom.rules,
                preferred_tenants: editingRoom.preferred_tenants,
                available_from: editingRoom.available_from,
                images: editingRoom.images,
            });

            if (result) {
                toast({ title: "Room listing updated successfully ✓" });
                setRoom(result);
                setEditingRoom(null);
            } else {
                toast({ title: "Failed to update room listing", variant: "destructive" });
            }
        } catch (err: any) {
            toast({ title: "Error updating listing", description: err.message, variant: "destructive" });
        } finally {
            setSavingRoomEdits(false);
        }
    };

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
        fetchCustomReviews();
    }, [id]);

    const fetchCustomReviews = async () => {
        if (!id) return;
        setLoadingReviews(true);
        try {
            const all = await getReviews();
            // Filter by listing_id and status 'approved' or no status
            const filtered = all.filter(r => r.listing_id === id && (r.status === "approved" || !r.status));
            setCustomReviews(filtered);
        } catch (err) {
            console.error("Error loading reviews:", err);
        } finally {
            setLoadingReviews(false);
        }
    };

    const handleSubmitReview = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user) {
            toast({ title: "Please login to submit a review", variant: "destructive" });
            navigate("/auth");
            return;
        }
        if (!newReviewComment.trim()) {
            toast({ title: "Please write a comment", variant: "destructive" });
            return;
        }
        setSubmittingReview(true);
        try {
            await createReview(user.id, id!, "room", newReviewRating, newReviewComment);
            toast({ title: "Review submitted successfully! ✓" });
            setNewReviewComment("");
            setNewReviewRating(5);
            fetchCustomReviews();
        } catch (err: any) {
            toast({ title: "Error submitting review", description: err.message, variant: "destructive" });
        } finally {
            setSubmittingReview(false);
        }
    };

    const handleSubmitListingReport = async () => {
        if (!user) {
            toast({ title: "Please login to file a report", variant: "destructive" });
            navigate("/auth");
            return;
        }
        setSubmittingListingReport(true);
        try {
            const fullReason = `${reportListingReason}: ${reportListingDetail}`;
            await createReport(user.id, "listing", id!, fullReason);
            toast({ title: "Listing reported successfully. Moderation will review it. ✓" });
            setShowReportListingModal(false);
            setReportListingDetail("");
        } catch (err: any) {
            toast({ title: "Error filing report", description: err.message, variant: "destructive" });
        } finally {
            setSubmittingListingReport(false);
        }
    };

    const handleSubmitReviewReport = async () => {
        if (!user) {
            toast({ title: "Please login to report a review", variant: "destructive" });
            navigate("/auth");
            return;
        }
        if (!reportingReview) return;
        setSubmittingReviewReport(true);
        try {
            const fullReason = `${reportReviewReason}: ${reportReviewDetail}`;
            await createReport(user.id, "review", reportingReview.id.toString(), fullReason);
            toast({ title: "Review reported successfully. Moderation will review it. ✓" });
            setReportingReview(null);
            setReportReviewDetail("");
        } catch (err: any) {
            toast({ title: "Error reporting review", description: err.message, variant: "destructive" });
        } finally {
            setSubmittingReviewReport(false);
        }
    };

    const handleDeleteReview = (reviewId: string) => {
        setReviewToDelete(reviewId);
    };

    const confirmDeleteReview = async () => {
        if (!reviewToDelete) return;
        try {
            await deleteReview(reviewToDelete);
            toast({ title: "Review deleted successfully ✓" });
            fetchCustomReviews();
        } catch (err: any) {
            toast({ title: "Error deleting review", description: err.message, variant: "destructive" });
        } finally {
            setReviewToDelete(null);
        }
    };

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

                {/* Image Gallery - Mobile: Single image with swipe, Desktop: Grid */}
                <div className="container mx-auto px-4 mb-6 md:mb-8">
                    {/* Mobile Image Carousel */}
                    <div className="block md:hidden relative h-[250px] sm:h-[300px] rounded-xl overflow-hidden">
                        <img
                            src={images[currentImageIndex]}
                            alt={displayRoom.title}
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
                                        <h1 className="font-heading font-bold text-xl sm:text-2xl md:text-3xl text-foreground">
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
                                        <Button
                                            variant="outline"
                                            size="icon"
                                            onClick={() => setShowReportListingModal(true)}
                                            className="text-amber-600 hover:text-amber-700 border-amber-200 hover:bg-amber-50"
                                            title="Report this listing"
                                        >
                                            <Flag className="w-5 h-5" />
                                        </Button>
                                        {(user?.id === displayRoom.owner_id || userRole === "admin") && (
                                            <Button
                                                variant="outline"
                                                size="icon"
                                                onClick={() => setEditingRoom(displayRoom)}
                                                className="text-primary border-primary/20 hover:bg-primary/5"
                                                title="Edit listing"
                                            >
                                                <Edit className="w-5 h-5" />
                                            </Button>
                                        )}
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
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                                    <div className="space-y-3">
                                        <div className="flex flex-col sm:flex-row sm:justify-between py-2 border-b gap-1">
                                            <span className="text-muted-foreground text-sm">Room Type</span>
                                            <span className="font-medium text-right">{displayRoom.room_type || "Single"}</span>
                                        </div>
                                        <div className="flex flex-col sm:flex-row sm:justify-between py-2 border-b gap-1">
                                            <span className="text-muted-foreground text-sm">Available From</span>
                                            <span className="font-medium text-right">{displayRoom.available_from || demoRoomDetails.available_from}</span>
                                        </div>
                                        <div className="flex flex-col sm:flex-row sm:justify-between py-2 border-b gap-1">
                                            <span className="text-muted-foreground text-sm">Security Deposit</span>
                                            <span className="font-medium text-right">
                                                ₹{(displayRoom.deposit !== undefined ? displayRoom.deposit : demoRoomDetails.deposit).toLocaleString()}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="space-y-3">
                                        <div className="flex flex-col sm:flex-row sm:justify-between py-2 border-b gap-1">
                                            <span className="text-muted-foreground text-sm">Preferred Tenants</span>
                                            <span className="font-medium text-right">{displayRoom.preferred_tenants || demoRoomDetails.preferred_tenants}</span>
                                        </div>
                                        <div className="flex flex-col sm:flex-row sm:justify-between py-2 border-b gap-1">
                                            <span className="text-muted-foreground text-sm">Furnishing</span>
                                            <span className="font-medium text-right">Fully Furnished</span>
                                        </div>
                                        <div className="flex flex-col sm:flex-row sm:justify-between py-2 border-b gap-1">
                                            <span className="text-muted-foreground text-sm">Floor</span>
                                            <span className="font-medium text-right">2nd Floor</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* House Rules */}
                            <div className="bg-card rounded-2xl p-6 shadow-soft">
                                <h2 className="font-heading font-semibold text-xl mb-4">House Rules</h2>
                                <div className="space-y-3">
                                    {(() => {
                                        const rulesList = typeof displayRoom.rules === 'string'
                                            ? displayRoom.rules.split('\n').map(r => r.trim()).filter(Boolean)
                                            : Array.isArray(displayRoom.rules)
                                                ? displayRoom.rules
                                                : Array.isArray(demoRoomDetails.rules)
                                                    ? demoRoomDetails.rules
                                                    : [];
                                        
                                        return rulesList.map((rule: string, index: number) => (
                                            <div key={index} className="flex items-center gap-3">
                                                <div className="w-2 h-2 rounded-full bg-primary" />
                                                <span className="text-muted-foreground">{rule}</span>
                                            </div>
                                        ));
                                    })()}
                                </div>
                            </div>

                            {/* Reviews */}
                            <div className="bg-card rounded-2xl p-6 shadow-soft">
                                <div className="flex items-center justify-between mb-6">
                                    <h2 className="font-heading font-semibold text-xl">Reviews</h2>
                                    <div className="flex items-center gap-2">
                                        <Star className="w-5 h-5 fill-yellow-400 text-yellow-400" />
                                        <span className="font-semibold">{displayRoom.rating || 4.8}</span>
                                        <span className="text-muted-foreground">({reviews.length + customReviews.length} reviews)</span>
                                    </div>
                                </div>

                                <div className="space-y-6">
                                    {/* Static Reviews */}
                                    {reviews.map((review) => (
                                        <div key={review.id} className="border-b pb-6 last:border-b last:pb-6">
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
                                                        <div className="flex items-center gap-3">
                                                            <div className="flex items-center gap-1">
                                                                {[...Array(5)].map((_, i) => (
                                                                    <Star
                                                                        key={i}
                                                                        className={`w-4 h-4 ${i < review.rating ? "fill-yellow-400 text-yellow-400" : "text-muted"}`}
                                                                    />
                                                                ))}
                                                            </div>
                                                            <button
                                                                onClick={() => setReportingReview({ id: `static-${review.id}`, comment: review.comment })}
                                                                className="text-muted-foreground hover:text-destructive transition-colors"
                                                                title="Report review"
                                                            >
                                                                <Flag className="w-3.5 h-3.5" />
                                                            </button>
                                                        </div>
                                                    </div>
                                                    <p className="text-muted-foreground">{review.comment}</p>
                                                </div>
                                            </div>
                                        </div>
                                    ))}

                                    {/* Custom Database Reviews */}
                                    {customReviews.map((review) => (
                                        <div key={review.id} className="border-b pb-6 last:border-0 last:pb-0">
                                            <div className="flex items-start gap-4">
                                                <div className="w-12 h-12 rounded-full bg-primary/15 flex items-center justify-center">
                                                    <span className="font-semibold text-primary">UR</span>
                                                </div>
                                                <div className="flex-1">
                                                    <div className="flex items-center justify-between mb-2">
                                                        <div>
                                                            <h4 className="font-semibold">User Review</h4>
                                                            <span className="text-xs text-muted-foreground">
                                                                {new Date(review.created_at).toLocaleDateString()}
                                                            </span>
                                                        </div>
                                                        <div className="flex items-center gap-3">
                                                            <div className="flex items-center gap-1">
                                                                {[...Array(5)].map((_, i) => (
                                                                    <Star
                                                                        key={i}
                                                                        className={`w-4 h-4 ${i < review.rating ? "fill-yellow-400 text-yellow-400" : "text-muted"}`}
                                                                    />
                                                                ))}
                                                            </div>
                                                            {user && review.user_id === user.id ? (
                                                                <button
                                                                    onClick={() => handleDeleteReview(review.id)}
                                                                    className="text-destructive hover:text-destructive/80 transition-colors"
                                                                    title="Delete review"
                                                                >
                                                                    <Trash2 className="w-3.5 h-3.5" />
                                                                </button>
                                                            ) : (
                                                                <button
                                                                    onClick={() => setReportingReview(review)}
                                                                    className="text-muted-foreground hover:text-destructive transition-colors"
                                                                    title="Report review"
                                                                >
                                                                    <Flag className="w-3.5 h-3.5" />
                                                                </button>
                                                            )}
                                                        </div>
                                                    </div>
                                                    <p className="text-muted-foreground">{review.comment}</p>
                                                    {review.owner_reply && (
                                                        <div className="mt-3 p-3 bg-muted rounded-lg border border-border">
                                                            <p className="font-semibold text-xs text-primary mb-1">Response from Owner:</p>
                                                            <p className="text-xs text-foreground italic">{review.owner_reply}</p>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    ))}

                                    {customReviews.length === 0 && (
                                        <p className="text-center text-xs text-muted-foreground py-2">No custom reviews posted yet.</p>
                                    )}
                                </div>

                                {/* Write a Review Form */}
                                <div className="border-t pt-6 mt-6">
                                    <h3 className="font-heading font-semibold text-lg mb-4">Write a Review</h3>
                                    {user ? (
                                        <form onSubmit={handleSubmitReview} className="space-y-4">
                                            <div>
                                                <Label htmlFor="new-rating" className="text-sm font-semibold mb-1 block">Rating</Label>
                                                <select
                                                    id="new-rating"
                                                    value={newReviewRating}
                                                    onChange={(e) => setNewReviewRating(parseInt(e.target.value) || 5)}
                                                    className="h-9 px-3 rounded-md border border-input bg-background text-sm text-foreground w-32 cursor-pointer"
                                                >
                                                    <option value="5">5 Stars</option>
                                                    <option value="4">4 Stars</option>
                                                    <option value="3">3 Stars</option>
                                                    <option value="2">2 Stars</option>
                                                    <option value="1">1 Star</option>
                                                </select>
                                            </div>
                                            <div>
                                                <Label htmlFor="new-comment" className="text-sm font-semibold mb-1 block">Review Comment</Label>
                                                <Textarea
                                                    id="new-comment"
                                                    value={newReviewComment}
                                                    onChange={(e) => setNewReviewComment(e.target.value)}
                                                    placeholder="Write your honest review here..."
                                                    rows={3}
                                                    className="text-foreground"
                                                />
                                            </div>
                                            <Button type="submit" disabled={submittingReview} className="w-full sm:w-auto">
                                                {submittingReview ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
                                                Submit Review
                                            </Button>
                                        </form>
                                    ) : (
                                        <div className="bg-muted p-4 rounded-xl text-center">
                                            <p className="text-sm text-muted-foreground mb-2">You must be signed in to post a review.</p>
                                            <Button onClick={() => navigate("/auth")} size="sm">Sign In / Sign Up</Button>
                                        </div>
                                    )}
                                </div>
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
                                    <p className="text-sm text-muted-foreground mt-1">
                                        + ₹{(displayRoom.deposit !== undefined ? displayRoom.deposit : demoRoomDetails.deposit).toLocaleString()} deposit
                                    </p>
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

                                    {/* Quick Contact Buttons - Responsive grid */}
                                    {displayRoom.contact?.hasContact && (
                                        <div className="grid grid-cols-2 sm:flex gap-2 mt-4">
                                            {displayRoom.contact?.phone && (
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    className="gap-1 text-xs sm:text-sm"
                                                    onClick={() => makePhoneCall(displayRoom.contact.phone)}
                                                >
                                                    <Phone className="w-3 h-3 sm:w-4 sm:h-4" />
                                                    Call
                                                </Button>
                                            )}
                                            {displayRoom.contact?.website && (
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    className="gap-1 text-xs sm:text-sm"
                                                    onClick={() => window.open(displayRoom.contact.website, '_blank')}
                                                >
                                                    <Globe className="w-3 h-3 sm:w-4 sm:h-4" />
                                                    Website
                                                </Button>
                                            )}
                                            {displayRoom.contact?.email && (
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    className="gap-1 text-xs sm:text-sm col-span-2 sm:col-span-1"
                                                    onClick={() => window.open(`mailto:${displayRoom.contact.email}`, '_blank')}
                                                >
                                                    <Mail className="w-3 h-3 sm:w-4 sm:h-4" />
                                                    Email
                                                </Button>
                                            )}
                                        </div>
                                    )}
                                </div>

                                {/* Public Listing Availability Calendar */}
                                <ListingAvailabilityCalendar
                                    listingId={displayRoom.id}
                                    listingType="room"
                                    onSelectDate={() => setShowContactModal(true)}
                                />

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
                                    {/* Mobile: 2 buttons side by side */}
                                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-1">
                                        {displayRoom.contact?.phone && (
                                            <Button
                                                variant="outline"
                                                className="gap-1 sm:gap-2 border-green-500 text-green-600 hover:bg-green-50 text-xs sm:text-sm"
                                                size="default"
                                                onClick={() => {
                                                    const phone = displayRoom.contact.phone;
                                                    const message = `Hi, I'm interested in booking "${displayRoom.title}" listed on RoomAndMess. Please share more details.`;
                                                    window.open(`https://wa.me/${phone.replace(/\D/g, '')}?text=${encodeURIComponent(message)}`, '_blank');
                                                }}
                                            >
                                                <MessageCircle className="w-4 h-4" />
                                                <span className="hidden sm:inline">WhatsApp</span>
                                                <span className="sm:hidden">WhatsApp</span>
                                            </Button>
                                        )}
                                        {displayRoom.contact?.phone && (
                                            <Button
                                                variant="outline"
                                                className="gap-1 sm:gap-2 text-xs sm:text-sm"
                                                size="default"
                                                onClick={() => makePhoneCall(displayRoom.contact.phone)}
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

            {/* Report Listing Modal */}
            {showReportListingModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-card rounded-2xl p-6 w-full max-w-md shadow-2xl border">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="font-heading font-semibold text-lg flex items-center gap-2 text-foreground">
                                <AlertOctagon className="w-5 h-5 text-amber-500" />
                                Report Listing
                            </h3>
                            <button onClick={() => setShowReportListingModal(false)} className="text-muted-foreground hover:text-foreground">
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <Label htmlFor="report-list-reason" className="text-sm font-semibold text-foreground mb-1 block">
                                    Reason for Report
                                </Label>
                                <select
                                    id="report-list-reason"
                                    value={reportListingReason}
                                    onChange={(e) => setReportListingReason(e.target.value)}
                                    className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm cursor-pointer text-foreground"
                                >
                                    <option value="Incorrect details">Incorrect details / Pricing</option>
                                    <option value="Owner not reachable">Owner not reachable</option>
                                    <option value="Spam / Scam">Spam / Scam listing</option>
                                    <option value="Offensive content">Offensive content</option>
                                    <option value="Other">Other reason</option>
                                </select>
                            </div>

                            <div>
                                <Label htmlFor="report-list-detail" className="text-sm font-semibold text-foreground mb-1 block">
                                    Additional details (optional)
                                </Label>
                                <Textarea
                                    id="report-list-detail"
                                    value={reportListingDetail}
                                    onChange={(e) => setReportListingDetail(e.target.value)}
                                    placeholder="Please provide more context..."
                                    rows={3}
                                    className="text-foreground"
                                />
                            </div>

                            <div className="flex gap-3 justify-end pt-2">
                                <Button variant="outline" onClick={() => setShowReportListingModal(false)}>
                                    Cancel
                                </Button>
                                <Button onClick={handleSubmitListingReport} disabled={submittingListingReport} className="bg-destructive text-white hover:bg-destructive/95">
                                    {submittingListingReport ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
                                    Submit Report
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Report Review Modal */}
            {reportingReview && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-card rounded-2xl p-6 w-full max-w-md shadow-2xl border">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="font-heading font-semibold text-lg flex items-center gap-2 text-foreground">
                                <AlertOctagon className="w-5 h-5 text-amber-500" />
                                Report Review
                            </h3>
                            <button onClick={() => setReportingReview(null)} className="text-muted-foreground hover:text-foreground">
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        <div className="space-y-4">
                            <div className="p-3 bg-muted rounded-lg text-sm text-muted-foreground italic mb-2">
                                "{reportingReview.comment}"
                            </div>

                            <div>
                                <Label htmlFor="report-rev-reason" className="text-sm font-semibold text-foreground mb-1 block">
                                    Reason for Report
                                </Label>
                                <select
                                    id="report-rev-reason"
                                    value={reportReviewReason}
                                    onChange={(e) => setReportReviewReason(e.target.value)}
                                    className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm cursor-pointer text-foreground"
                                >
                                    <option value="Spam">Spam or advertising</option>
                                    <option value="Abusive language">Abusive / Inappropriate language</option>
                                    <option value="False review">False review / Harassment</option>
                                    <option value="Other">Other</option>
                                </select>
                            </div>

                            <div>
                                <Label htmlFor="report-rev-detail" className="text-sm font-semibold text-foreground mb-1 block">
                                    Additional details (optional)
                                </Label>
                                <Textarea
                                    id="report-rev-detail"
                                    value={reportReviewDetail}
                                    onChange={(e) => setReportReviewDetail(e.target.value)}
                                    placeholder="Please explain why this review violates terms..."
                                    rows={3}
                                    className="text-foreground"
                                />
                            </div>

                            <div className="flex gap-3 justify-end pt-2">
                                <Button variant="outline" onClick={() => setReportingReview(null)}>
                                    Cancel
                                </Button>
                                <Button onClick={handleSubmitReviewReport} disabled={submittingReviewReport} className="bg-destructive text-white hover:bg-destructive/95">
                                    {submittingReviewReport ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
                                    Submit Report
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Delete Review Confirmation Modal */}
            {reviewToDelete && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 block">
                    <div className="bg-card rounded-2xl p-6 w-full max-w-sm shadow-2xl border text-center">
                        <h3 className="font-heading font-semibold text-lg text-foreground mb-2">Delete Review</h3>
                        <p className="text-sm text-muted-foreground mb-6">
                            Are you sure you want to permanently delete this review? This action cannot be undone.
                        </p>
                        <div className="flex gap-3 justify-center">
                            <Button variant="outline" onClick={() => setReviewToDelete(null)} className="w-24">
                                Cancel
                            </Button>
                            <Button onClick={confirmDeleteReview} className="bg-destructive text-white hover:bg-destructive/95 w-24">
                                Delete
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            {/* Edit Room Modal */}
            {editingRoom && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-card rounded-2xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl border text-foreground text-left">
                        <div className="flex items-center justify-between mb-6 pb-2 border-b">
                            <h3 className="font-heading font-semibold text-xl">Edit Room Listing</h3>
                            <Button variant="ghost" size="icon" onClick={() => setEditingRoom(null)}>
                                <X className="w-5 h-5" />
                            </Button>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <Label htmlFor="edit-room-title">Room Title *</Label>
                                <Input
                                    id="edit-room-title"
                                    value={editingRoom.title}
                                    onChange={(e) => setEditingRoom({ ...editingRoom, title: e.target.value })}
                                />
                            </div>

                            <div>
                                <Label htmlFor="edit-room-desc">Description</Label>
                                <Textarea
                                    id="edit-room-desc"
                                    value={editingRoom.description || ""}
                                    onChange={(e) => setEditingRoom({ ...editingRoom, description: e.target.value })}
                                    rows={3}
                                />
                            </div>

                            <div className="grid md:grid-cols-3 gap-4">
                                <div>
                                    <Label htmlFor="edit-room-loc">Area / Landmark *</Label>
                                    <Input
                                        id="edit-room-loc"
                                        value={editingRoom.location}
                                        onChange={(e) => setEditingRoom({ ...editingRoom, location: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <Label htmlFor="edit-room-addr">Address *</Label>
                                    <Input
                                        id="edit-room-addr"
                                        value={editingRoom.address || ""}
                                        onChange={(e) => setEditingRoom({ ...editingRoom, address: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <Label htmlFor="edit-room-city">City *</Label>
                                    <Input
                                        id="edit-room-city"
                                        value={editingRoom.city || ""}
                                        onChange={(e) => setEditingRoom({ ...editingRoom, city: e.target.value })}
                                    />
                                </div>
                            </div>

                            <div className="grid md:grid-cols-3 gap-4">
                                <div>
                                    <Label htmlFor="edit-room-price">Monthly Price (₹) *</Label>
                                    <Input
                                        id="edit-room-price"
                                        type="number"
                                        value={editingRoom.price}
                                        onChange={(e) => setEditingRoom({ ...editingRoom, price: Number(e.target.value) })}
                                    />
                                </div>
                                <div>
                                    <Label htmlFor="edit-room-deposit">Deposit (₹)</Label>
                                    <Input
                                        id="edit-room-deposit"
                                        type="number"
                                        value={editingRoom.deposit || ""}
                                        onChange={(e) => setEditingRoom({ ...editingRoom, deposit: Number(e.target.value) })}
                                    />
                                </div>
                                <div>
                                    <Label htmlFor="edit-room-type">Room Type *</Label>
                                    <select
                                        id="edit-room-type"
                                        value={editingRoom.room_type}
                                        onChange={(e) => setEditingRoom({ ...editingRoom, room_type: e.target.value })}
                                        className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm text-foreground"
                                    >
                                        <option value="Single">Single</option>
                                        <option value="Shared">Shared</option>
                                        <option value="Double">Double</option>
                                    </select>
                                </div>
                            </div>

                            <div className="grid md:grid-cols-2 gap-4">
                                <div>
                                    <Label htmlFor="edit-room-tenants">Preferred Tenants</Label>
                                    <Input
                                        id="edit-room-tenants"
                                        value={editingRoom.preferred_tenants || ""}
                                        onChange={(e) => setEditingRoom({ ...editingRoom, preferred_tenants: e.target.value })}
                                        placeholder="e.g. Students / Employees"
                                    />
                                </div>
                                <div>
                                    <Label htmlFor="edit-room-avail">Available From</Label>
                                    <Input
                                        id="edit-room-avail"
                                        type="date"
                                        value={editingRoom.available_from || ""}
                                        onChange={(e) => setEditingRoom({ ...editingRoom, available_from: e.target.value })}
                                    />
                                </div>
                            </div>

                            <div>
                                <Label htmlFor="edit-room-rules">Rules</Label>
                                <Input
                                    id="edit-room-rules"
                                    value={editingRoom.rules || ""}
                                    onChange={(e) => setEditingRoom({ ...editingRoom, rules: e.target.value })}
                                    placeholder="e.g. No smoking, No pets"
                                />
                            </div>

                            <div>
                                <Label className="mb-2 block">Facilities</Label>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                                    {facilityOptions.map((facility) => {
                                        const hasFacility = editingRoom.facilities?.includes(facility);
                                        return (
                                            <label key={facility} className="flex items-center gap-2 text-sm cursor-pointer">
                                                <input
                                                    type="checkbox"
                                                    checked={hasFacility}
                                                    onChange={(e) => {
                                                        const newFacilities = e.target.checked
                                                            ? [...(editingRoom.facilities || []), facility]
                                                            : (editingRoom.facilities || []).filter(f => f !== facility);
                                                        setEditingRoom({ ...editingRoom, facilities: newFacilities });
                                                    }}
                                                    className="w-4 h-4 rounded border-input text-primary"
                                                />
                                                <span>{facility}</span>
                                            </label>
                                        );
                                    })}
                                </div>
                            </div>

                            <div>
                                <Label className="mb-2 block">Images (URLs)</Label>
                                <div className="grid grid-cols-3 gap-2 mb-2">
                                    {(editingRoom.images || []).map((imgUrl: string, idx: number) => (
                                        <div key={idx} className="relative group aspect-video rounded-lg overflow-hidden border">
                                            <img src={imgUrl} className="w-full h-full object-cover" />
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    const newImages = (editingRoom.images || []).filter((_: any, i: number) => i !== idx);
                                                    setEditingRoom({ ...editingRoom, images: newImages });
                                                }}
                                                className="absolute top-1 right-1 bg-destructive/80 hover:bg-destructive text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center w-6 h-6"
                                            >
                                                <Trash2 className="w-3.5 h-3.5" />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                                <div className="flex gap-2">
                                    <Input
                                        placeholder="Paste image URL here"
                                        id="new-room-image-url"
                                        className="flex-1"
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter') {
                                                e.preventDefault();
                                                const input = e.currentTarget;
                                                const url = input.value.trim();
                                                if (url) {
                                                    setEditingRoom({ ...editingRoom, images: [...(editingRoom.images || []), url] });
                                                    input.value = "";
                                                }
                                            }
                                        }}
                                    />
                                    <Button
                                        type="button"
                                        variant="outline"
                                        onClick={() => {
                                            const input = document.getElementById("new-room-image-url") as HTMLInputElement;
                                            const url = input?.value.trim();
                                            if (url) {
                                                setEditingRoom({ ...editingRoom, images: [...(editingRoom.images || []), url] });
                                                input.value = "";
                                            }
                                        }}
                                    >
                                        Add
                                    </Button>
                                </div>
                                <div className="flex flex-col gap-2 border p-3 rounded-lg bg-muted/20 mt-3 text-left">
                                    <span className="text-xs font-semibold text-muted-foreground">Upload from Device</span>
                                    <div className="flex items-center gap-2">
                                        <Input
                                            type="file"
                                            accept="image/*"
                                            onChange={async (e) => {
                                                const file = e.target.files?.[0];
                                                if (file) {
                                                    try {
                                                        toast({ title: "Uploading image...", description: "Please wait while we upload the image." });
                                                        const url = await uploadListingImage(file);
                                                        if (url) {
                                                            setEditingRoom({ ...editingRoom, images: [...(editingRoom.images || []), url] });
                                                            toast({ title: "Image uploaded successfully ✓" });
                                                        }
                                                    } catch (err: any) {
                                                        toast({ title: "Upload failed", description: err.message, variant: "destructive" });
                                                    }
                                                    e.target.value = "";
                                                }
                                            }}
                                            className="cursor-pointer text-xs"
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="flex justify-end gap-3 pt-4 border-t">
                                <Button variant="outline" onClick={() => setEditingRoom(null)}>Cancel</Button>
                                <Button onClick={saveRoomEdits} disabled={savingRoomEdits}>
                                    {savingRoomEdits ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                                    Save Changes
                                </Button>
                            </div>
                        </div>
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
                ownerId={displayRoom.owner_id}
            />
        </div>
    );
};

export default RoomDetail;
