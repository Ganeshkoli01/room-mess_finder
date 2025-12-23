import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Star, MapPin, Clock, Leaf, Flame, Heart, Scale, Navigation } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import EnquiryDialog from "@/components/booking/EnquiryDialog";
import SubscriptionDialog from "@/components/booking/SubscriptionDialog";
import ShareButton from "@/components/ShareButton";
import { useToast } from "@/hooks/use-toast";
import {
  addToFavorites,
  removeFromFavorites,
  isFavorite as checkIsFavorite,
  addToRecentlyViewed,
  FavoriteItem
} from "@/services/recommendationsService";
import { useLanguage } from "@/contexts/LanguageContext";

interface MessCardProps {
  id: string;
  name: string;
  location: string;
  pricePerMonth: number;
  foodType: "veg" | "non-veg" | "both";
  image: string;
  rating: number;
  reviews: number;
  timings: string;
  menuHighlights: string[];
  isVerified?: boolean;
  ownerId?: string;
  distance?: number;
  isFromOSM?: boolean;
}

const MessCard = ({
  id,
  name,
  location,
  pricePerMonth,
  foodType,
  image,
  rating,
  reviews,
  timings,
  menuHighlights,
  isVerified = false,
  ownerId = "demo-owner",
  distance,
  isFromOSM = false,
}: MessCardProps) => {
  const [isFavorite, setIsFavorite] = useState(false);
  const { toast } = useToast();
  const { t } = useLanguage();

  // Check initial state
  useEffect(() => {
    setIsFavorite(checkIsFavorite(id));
  }, [id]);

  const handleFavorite = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    const favoriteItem: FavoriteItem = {
      id,
      type: "mess",
      title: name,
      location,
      price: pricePerMonth,
      timestamp: Date.now(),
      image,
      rating,
    };

    if (isFavorite) {
      removeFromFavorites(id);
      setIsFavorite(false);
      toast({
        title: "Removed from favorites",
        description: `${name} has been removed from your saved listings.`,
      });
    } else {
      addToFavorites(favoriteItem);
      setIsFavorite(true);
      toast({
        title: "Added to favorites ❤️",
        description: `${name} has been saved. View in Favorites.`,
      });
    }
  };

  const handleCardClick = () => {
    // Track recently viewed
    addToRecentlyViewed({
      id,
      type: "mess",
      title: name,
      location,
      price: pricePerMonth,
      timestamp: Date.now(),
    });
  };

  const getFoodTypeIcon = () => {
    if (foodType === "veg") return <Leaf className="w-4 h-4" />;
    if (foodType === "non-veg") return <Flame className="w-4 h-4" />;
    return (
      <div className="flex items-center gap-0.5">
        <Leaf className="w-3.5 h-3.5" />
        <Flame className="w-3.5 h-3.5" />
      </div>
    );
  };

  const getFoodTypeBadge = () => {
    const styles = {
      veg: "bg-success text-success-foreground",
      "non-veg": "bg-destructive text-destructive-foreground",
      both: "bg-warning text-warning-foreground",
    };
    const labels = {
      veg: t('foodType.veg'),
      "non-veg": t('foodType.nonVeg'),
      both: t('foodType.both'),
    };
    return (
      <Badge className={`${styles[foodType]} gap-1`}>
        {getFoodTypeIcon()}
        {labels[foodType]}
      </Badge>
    );
  };

  return (
    <div className="group bg-card rounded-2xl overflow-hidden shadow-card card-hover-lift card-hover-glow gpu-accelerated">
      {/* Image */}
      <Link
        to={`/mess/${id}`}
        className="block relative aspect-[4/3] overflow-hidden cursor-pointer ripple-effect"
        onClick={handleCardClick}
      >
        <img
          src={image}
          alt={name}
          className="w-full h-full object-cover group-hover:scale-108"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-foreground/60 via-transparent to-transparent opacity-80 group-hover:opacity-100" />

        {/* Badges */}
        <div className="absolute top-3 left-3 flex items-center gap-2">
          {getFoodTypeBadge()}
          {isVerified && (
            <Badge className="bg-primary text-primary-foreground">Verified</Badge>
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
        <div className="absolute bottom-3 right-3 bg-accent text-accent-foreground px-3 py-1.5 rounded-lg">
          <span className="font-bold">₹{pricePerMonth.toLocaleString()}</span>
          <span className="text-accent-foreground/80 text-sm">{t('card.perMonth')}</span>
        </div>
      </Link>

      {/* Content */}
      <div className="p-5">
        <Link to={`/mess/${id}`} className="block" onClick={handleCardClick}>
          <h3 className="font-heading font-semibold text-lg text-foreground line-clamp-1 group-hover:text-primary transition-colors cursor-pointer">
            {name}
          </h3>
        </Link>

        <div className="flex items-center gap-1.5 mt-2 text-muted-foreground">
          <MapPin className="w-4 h-4 text-primary" />
          <span className="text-sm line-clamp-1">{location}</span>
        </div>

        {/* Timings */}
        <div className="flex items-center gap-1.5 mt-2 text-muted-foreground">
          <Clock className="w-4 h-4 text-accent" />
          <span className="text-sm">{timings}</span>
        </div>

        {/* Menu Highlights */}
        <div className="mt-4">
          <p className="text-xs text-muted-foreground mb-2">Popular items:</p>
          <div className="flex items-center gap-2 flex-wrap">
            {menuHighlights.slice(0, 3).map((item) => (
              <span
                key={item}
                className="px-2 py-1 bg-muted rounded-md text-xs text-muted-foreground"
              >
                {item}
              </span>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 mt-5">
          <SubscriptionDialog
            messId={id}
            messTitle={name}
            monthlyPrice={pricePerMonth}
            trigger={<Button variant="default" className="flex-1 gap-1">Subscribe</Button>}
          />

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
            title={name}
            price={pricePerMonth}
            location={location}
            url={`${window.location.origin}/mess/${id}`}
          />
        </div>
      </div>
    </div>
  );
};

export default MessCard;
