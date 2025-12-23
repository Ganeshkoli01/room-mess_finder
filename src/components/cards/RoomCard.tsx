import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Star, MapPin, Wifi, Car, Shield, Zap, Droplets, Wind, Heart, Scale, Navigation } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import EnquiryDialog from "@/components/booking/EnquiryDialog";
import ShareButton from "@/components/ShareButton";
import { useToast } from "@/hooks/use-toast";
import {
  addToFavorites,
  removeFromFavorites,
  isFavorite as checkIsFavorite,
  addToRecentlyViewed,
  FavoriteItem
} from "@/services/recommendationsService";
import {
  addToCompare,
  removeFromCompare,
  isInCompare,
  CompareItem
} from "@/components/ComparisonTool";
import { useLanguage } from "@/contexts/LanguageContext";

interface RoomCardProps {
  id: string;
  title: string;
  location: string;
  price: number;
  roomType: string;
  image: string;
  rating: number;
  reviews: number;
  facilities: string[];
  isVerified?: boolean;
  ownerId?: string;
  distance?: number;
  isFromOSM?: boolean;
  lat?: number;
  lng?: number;
}

const facilityIcons: Record<string, React.ElementType> = {
  wifi: Wifi,
  parking: Car,
  security: Shield,
  power: Zap,
  water: Droplets,
  ac: Wind,
};

const RoomCard = ({
  id,
  title,
  location,
  price,
  roomType,
  image,
  rating,
  reviews,
  facilities,
  isVerified = false,
  ownerId = "demo-owner",
  distance,
  isFromOSM = false,
  lat,
  lng,
}: RoomCardProps) => {
  const [isFavorite, setIsFavorite] = useState(false);
  const [inCompare, setInCompare] = useState(false);
  const { toast } = useToast();
  const { t } = useLanguage();

  // Check initial states
  useEffect(() => {
    setIsFavorite(checkIsFavorite(id));
    setInCompare(isInCompare(id));
  }, [id]);

  const handleFavorite = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    const favoriteItem: FavoriteItem = {
      id,
      type: "room",
      title,
      location,
      price,
      timestamp: Date.now(),
      image,
      rating,
    };

    if (isFavorite) {
      removeFromFavorites(id);
      setIsFavorite(false);
      toast({
        title: "Removed from favorites",
        description: `${title} has been removed from your saved listings.`,
      });
    } else {
      addToFavorites(favoriteItem);
      setIsFavorite(true);
      toast({
        title: "Added to favorites ❤️",
        description: `${title} has been saved. View in Favorites.`,
      });
    }
  };

  const handleCompare = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    const compareItem: CompareItem = {
      id,
      title,
      location,
      price,
      rating,
      reviews,
      image,
      type: roomType,
      facilities,
      isVerified,
      distance,
    };

    if (inCompare) {
      removeFromCompare(id);
      setInCompare(false);
      toast({
        title: "Removed from compare",
        description: `${title} has been removed from comparison.`,
      });
    } else {
      const added = addToCompare(compareItem);
      if (added) {
        setInCompare(true);
        toast({
          title: "Added to compare ⚖️",
          description: "Click the Compare icon in navbar to view comparison.",
        });
      } else {
        toast({
          title: "Compare limit reached",
          description: "You can compare up to 3 items. Remove one to add more.",
          variant: "destructive",
        });
      }
    }
  };

  const handleCardClick = () => {
    // Track recently viewed
    addToRecentlyViewed({
      id,
      type: "room",
      title,
      location,
      price,
      timestamp: Date.now(),
    });
  };

  return (
    <div className="group bg-card rounded-2xl overflow-hidden shadow-card card-hover-lift card-hover-glow gpu-accelerated">
      {/* Image */}
      <Link
        to={`/rooms/${id}`}
        className="block relative aspect-[4/3] overflow-hidden cursor-pointer ripple-effect"
        onClick={handleCardClick}
      >
        <img
          src={image}
          alt={title}
          className="w-full h-full object-cover group-hover:scale-108"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-foreground/60 via-transparent to-transparent opacity-80 group-hover:opacity-100" />

        {/* Badges */}
        <div className="absolute top-3 left-3 flex items-center gap-2">
          <Badge className="bg-primary text-primary-foreground">{roomType}</Badge>
          {isVerified && (
            <Badge className="bg-success text-success-foreground">{t('card.verified')}</Badge>
          )}
          {isFromOSM && (
            <Badge className="bg-blue-500 text-white text-[10px]">OSM</Badge>
          )}
        </div>

        {/* Rating */}
        <div className="absolute top-3 right-3 bg-card/90 backdrop-blur-sm px-2 py-1 rounded-lg flex items-center gap-1">
          <Star className="w-4 h-4 text-warning fill-warning" />
          <span className="font-semibold text-sm">{rating.toFixed(1)}</span>
          <span className="text-muted-foreground text-xs">({reviews})</span>
        </div>

        {/* Distance */}
        {distance && (
          <div className="absolute bottom-3 left-3 bg-card/90 backdrop-blur-sm px-2 py-1 rounded-lg flex items-center gap-1">
            <Navigation className="w-3 h-3 text-primary" />
            <span className="text-xs font-medium">{distance.toFixed(1)} km</span>
          </div>
        )}

        {/* Price */}
        <div className="absolute bottom-3 right-3 bg-primary text-primary-foreground px-3 py-1.5 rounded-lg">
          <span className="font-bold">₹{price.toLocaleString()}</span>
          <span className="text-primary-foreground/80 text-sm">{t('card.perMonth')}</span>
        </div>
      </Link>

      {/* Content */}
      <div className="p-5">
        <Link to={`/rooms/${id}`} className="block" onClick={handleCardClick}>
          <h3 className="font-heading font-semibold text-lg text-foreground line-clamp-1 group-hover:text-primary transition-colors cursor-pointer">
            {title}
          </h3>
        </Link>

        <div className="flex items-center gap-1.5 mt-2 text-muted-foreground">
          <MapPin className="w-4 h-4 text-primary" />
          <span className="text-sm line-clamp-1">{location}</span>
        </div>

        {/* Facilities */}
        <div className="flex items-center gap-2 mt-4 flex-wrap">
          {facilities.slice(0, 4).map((facility) => {
            const Icon = facilityIcons[facility.toLowerCase()] || Shield;
            return (
              <div
                key={facility}
                className="flex items-center gap-1 px-2 py-1 bg-muted rounded-md"
                title={facility}
              >
                <Icon className="w-3.5 h-3.5 text-primary" />
                <span className="text-xs text-muted-foreground capitalize">{facility}</span>
              </div>
            );
          })}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 mt-5">
          <EnquiryDialog
            listingId={id}
            listingType="room"
            listingTitle={title}
            ownerId={ownerId}
            trigger={<Button variant="default" className="flex-1">{t('card.sendEnquiry')}</Button>}
          />

          {/* Compare Button */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                size="icon"
                onClick={handleCompare}
                className={inCompare ? "text-primary border-primary hover:bg-primary/10" : ""}
              >
                <Scale className={`w-5 h-5 ${inCompare ? "fill-primary/20" : ""}`} />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              {inCompare ? t('card.addToCompare') : t('card.addToCompare')}
            </TooltipContent>
          </Tooltip>

          {/* Favorite Button */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                size="icon"
                onClick={handleFavorite}
                className={isFavorite ? "text-destructive border-destructive hover:bg-destructive/10" : ""}
              >
                <Heart className={`w-5 h-5 ${isFavorite ? "fill-current animate-heartbeat" : ""}`} />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              {isFavorite ? t('card.addToFavorites') : t('card.addToFavorites')}
            </TooltipContent>
          </Tooltip>

          {/* Share Button */}
          <ShareButton
            title={title}
            price={price}
            location={location}
            url={`${window.location.origin}/rooms/${id}`}
          />
        </div>
      </div>
    </div>
  );
};

export default RoomCard;
