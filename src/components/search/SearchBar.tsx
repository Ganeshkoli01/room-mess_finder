import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Search, MapPin, Filter, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { useLanguage } from "@/contexts/LanguageContext";
import { logCitySearch } from "@/services/analyticsService";

interface SearchBarProps {
  type?: "room" | "mess" | "all";
  onSearch?: (query: string, searchType: string, budget: string, facilities?: string[]) => void;
  initialFacilities?: string[];
  onFacilitiesChange?: (facilities: string[]) => void;
}

const availableFacilities = [
  { id: "wifi", label: "WiFi", icon: "📶" },
  { id: "ac", label: "AC", icon: "❄️" },
  { id: "parking", label: "Parking", icon: "🅿️" },
  { id: "security", label: "Security", icon: "🛡️" },
  { id: "power backup", label: "Power Backup", icon: "⚡" },
  { id: "water supply", label: "Water Supply", icon: "🚿" },
];

const SearchBar = ({ type = "all", onSearch, initialFacilities, onFacilitiesChange }: SearchBarProps) => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { t } = useLanguage();
  const [searchType, setSearchType] = useState<string>("room");
  const [location, setLocation] = useState<string>(searchParams.get("location") || "");
  const [budget, setBudget] = useState<string>(searchParams.get("budget") || "any");
  
  const [selectedFacilities, setSelectedFacilities] = useState<string[]>(() => {
    if (initialFacilities && initialFacilities.length > 0) {
      return initialFacilities;
    }
    const param = searchParams.get("facilities");
    return param ? param.split(",").map((f) => f.trim().toLowerCase()) : [];
  });

  useEffect(() => {
    if (initialFacilities) {
      setSelectedFacilities(initialFacilities);
    }
  }, [initialFacilities]);

  const toggleFacility = (facilityId: string) => {
    const norm = facilityId.toLowerCase();
    const updated = selectedFacilities.includes(norm)
      ? selectedFacilities.filter((f) => f !== norm)
      : [...selectedFacilities, norm];

    setSelectedFacilities(updated);
    if (onFacilitiesChange) {
      onFacilitiesChange(updated);
    }
  };

  const clearFacilities = () => {
    setSelectedFacilities([]);
    if (onFacilitiesChange) {
      onFacilitiesChange([]);
    }
  };

  const handleSearch = () => {
    if (location && location.trim()) {
      logCitySearch(location.trim());
    }
    if (onSearch) {
      onSearch(location, searchType, budget, selectedFacilities);
    } else {
      // Navigate to the appropriate page with search params
      const selectedType = type === "all" ? searchType : type;
      const targetPage = selectedType === "mess" ? "/mess" : "/rooms";
      const params = new URLSearchParams();
      if (location) params.set("location", location);
      if (budget !== "any") params.set("budget", budget);
      if (selectedFacilities.length > 0) params.set("facilities", selectedFacilities.join(","));

      navigate(`${targetPage}${params.toString() ? `?${params.toString()}` : ""}`);
    }
  };

  return (
    <div className="bg-card rounded-2xl p-4 shadow-card">
      <div className="flex flex-col lg:flex-row gap-4">
        {/* Search Type */}
        {type === "all" && (
          <Select value={searchType} onValueChange={setSearchType}>
            <SelectTrigger className="w-full lg:w-[160px] h-12">
              <SelectValue placeholder="Looking for" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="room">🏠 {t('nav.rooms')}</SelectItem>
              <SelectItem value="mess">🍽️ {t('nav.mess')}</SelectItem>
            </SelectContent>
          </Select>
        )}

        {/* Location */}
        <div className="relative flex-1">
          <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <Input
            placeholder={t('search.placeholder')}
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            className="pl-12 h-12 bg-muted/50 border-0"
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
          />
        </div>

        {/* Price Range */}
        <Select value={budget} onValueChange={setBudget}>
          <SelectTrigger className="w-full lg:w-[160px] h-12">
            <SelectValue placeholder={t('filter.price')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="any">Any Budget</SelectItem>
            <SelectItem value="0-3000">Under ₹3,000</SelectItem>
            <SelectItem value="3000-5000">₹3,000 - ₹5,000</SelectItem>
            <SelectItem value="5000-8000">₹5,000 - ₹8,000</SelectItem>
            <SelectItem value="8000+">₹8,000+</SelectItem>
          </SelectContent>
        </Select>

        {/* Facilities Filter Popover */}
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant={selectedFacilities.length > 0 ? "secondary" : "outline"}
              className={`h-12 gap-2 lg:px-4 ${
                selectedFacilities.length > 0 ? "border-primary text-primary font-medium" : ""
              }`}
            >
              <Filter className="w-4 h-4" />
              <span className="hidden sm:inline">{t('filter.facilities')}</span>
              {selectedFacilities.length > 0 && (
                <Badge
                  variant="default"
                  className="ml-1 px-1.5 py-0.5 text-xs bg-primary text-primary-foreground rounded-full"
                >
                  {selectedFacilities.length}
                </Badge>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-64 p-4 bg-card border border-border shadow-lg rounded-xl z-50">
            <div className="space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-border">
                <h4 className="font-semibold text-sm">Select Facilities</h4>
                {selectedFacilities.length > 0 && (
                  <button
                    type="button"
                    onClick={clearFacilities}
                    className="text-xs text-muted-foreground hover:text-primary transition-colors flex items-center gap-1"
                  >
                    <X className="w-3 h-3" /> Clear
                  </button>
                )}
              </div>
              <div className="space-y-2.5">
                {availableFacilities.map((facility) => {
                  const isChecked = selectedFacilities.includes(facility.id.toLowerCase());
                  return (
                    <label
                      key={facility.id}
                      className="flex items-center space-x-2.5 text-sm cursor-pointer hover:text-primary transition-colors py-1 select-none"
                    >
                      <Checkbox
                        checked={isChecked}
                        onCheckedChange={() => toggleFacility(facility.id)}
                      />
                      <span className="text-base">{facility.icon}</span>
                      <span className="font-medium">{facility.label}</span>
                    </label>
                  );
                })}
              </div>
            </div>
          </PopoverContent>
        </Popover>

        {/* Search Button */}
        <Button variant="default" size="lg" className="h-12 gap-2 px-8" onClick={handleSearch}>
          <Search className="w-4 h-4" />
          {t('common.search')}
        </Button>
      </div>
    </div>
  );
};

export default SearchBar;
