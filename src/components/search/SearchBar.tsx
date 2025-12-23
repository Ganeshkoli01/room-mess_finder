import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search, MapPin, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useLanguage } from "@/contexts/LanguageContext";

interface SearchBarProps {
  type?: "room" | "mess" | "all";
  onSearch?: (query: string, searchType: string, budget: string) => void;
}

const SearchBar = ({ type = "all", onSearch }: SearchBarProps) => {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [searchType, setSearchType] = useState<string>("room");
  const [location, setLocation] = useState<string>("");
  const [budget, setBudget] = useState<string>("any");

  const handleSearch = () => {
    if (onSearch) {
      onSearch(location, searchType, budget);
    } else {
      // Navigate to the appropriate page with search params
      const targetPage = type === "all" ? `/${searchType}s` : `/${type}s`;
      const params = new URLSearchParams();
      if (location) params.set("location", location);
      if (budget !== "any") params.set("budget", budget);

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

        {/* More Filters */}
        <Button variant="outline" className="h-12 gap-2 lg:px-4">
          <Filter className="w-4 h-4" />
          <span className="hidden sm:inline">{t('filter.facilities')}</span>
        </Button>

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
