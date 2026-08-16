import React, { useState, useEffect } from "react";
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, CheckCircle2, Lock, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";

interface ListingAvailabilityCalendarProps {
  listingId: string;
  listingType?: "room" | "mess";
  onSelectDate?: (dateStr: string) => void;
  selectedDate?: string;
}

export const ListingAvailabilityCalendar: React.FC<ListingAvailabilityCalendarProps> = ({
  listingId,
  listingType = "room",
  onSelectDate,
  selectedDate,
}) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [occupiedDates, setOccupiedDates] = useState<Set<string>>(new Set());
  const [dailyOverrides, setDailyOverrides] = useState<Record<string, "available" | "occupied" | "pending">>({});
  const [loading, setLoading] = useState(true);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayOfWeek = new Date(year, month, 1).getDay();

  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  useEffect(() => {
    if (listingId) {
      fetchAvailability();
    }
  }, [listingId, currentDate]);

  const fetchAvailability = async () => {
    setLoading(true);
    try {
      // 1. Fetch accepted bookings for this listing
      const { data: bookingsData } = await (supabase as any)
        .from("bookings")
        .select("check_in_date, check_out_date, status")
        .eq("listing_id", listingId)
        .in("status", ["accepted", "approved", "confirmed"]);

      const set = new Set<string>();
      if (bookingsData) {
        bookingsData.forEach((b: any) => {
          if (b.check_in_date && b.check_out_date) {
            const start = new Date(b.check_in_date);
            const end = new Date(b.check_out_date);
            for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
              const monthStr = String(d.getMonth() + 1).padStart(2, "0");
              const dayStr = String(d.getDate()).padStart(2, "0");
              set.add(`${d.getFullYear()}-${monthStr}-${dayStr}`);
            }
          }
        });
      }
      setOccupiedDates(set);

      // 2. Fetch day-by-day overrides from listing_daily_availability table
      const { data: overridesData } = await (supabase as any)
        .from("listing_daily_availability")
        .select("date, status")
        .eq("listing_id", listingId);

      if (overridesData) {
        const map: Record<string, "available" | "occupied" | "pending"> = {};
        overridesData.forEach((row: any) => {
          map[row.date] = row.status;
        });
        setDailyOverrides(map);
      }
    } catch (err) {
      console.error("Error fetching availability:", err);
    } finally {
      setLoading(false);
    }
  };

  const handlePrevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  const getDayAvailability = (dayNum: number) => {
    const monthFormatted = String(month + 1).padStart(2, "0");
    const dayFormatted = String(dayNum).padStart(2, "0");
    const dateStr = `${year}-${monthFormatted}-${dayFormatted}`;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const targetDate = new Date(year, month, dayNum);
    targetDate.setHours(0, 0, 0, 0);

    // All dates prior to today are automatically marked as occupied / passed
    if (targetDate < today) {
      return {
        status: "occupied" as const,
        dateStr,
        isPast: true,
      };
    }

    // Check manual override first
    if (dailyOverrides[dateStr]) {
      return {
        status: dailyOverrides[dateStr],
        dateStr,
        isPast: false,
      };
    }

    // Check accepted booking set
    if (occupiedDates.has(dateStr)) {
      return {
        status: "occupied" as const,
        dateStr,
        isPast: false,
      };
    }

    return {
      status: "available" as const,
      dateStr,
      isPast: false,
    };
  };

  return (
    <div className="bg-card/90 border border-border/60 rounded-2xl p-5 shadow-lg space-y-4 text-left backdrop-blur-sm">
      <div className="flex items-center justify-between flex-wrap gap-2 border-b border-border/40 pb-3">
        <div className="flex items-center gap-2">
          <CalendarIcon className="w-4 h-4 text-primary" />
          <h3 className="font-heading font-semibold text-sm text-foreground">
            Property Availability Calendar
          </h3>
        </div>

        {/* Month Navigation */}
        <div className="flex items-center gap-1 bg-muted/40 p-1 rounded-lg border border-border/40">
          <Button variant="ghost" size="icon" onClick={handlePrevMonth} className="h-6 w-6">
            <ChevronLeft className="w-3.5 h-3.5" />
          </Button>
          <span className="text-xs font-semibold px-2 min-w-[100px] text-center text-foreground">
            {monthNames[month]} {year}
          </span>
          <Button variant="ghost" size="icon" onClick={handleNextMonth} className="h-6 w-6">
            <ChevronRight className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>

      {/* Status Legend */}
      <div className="flex items-center gap-4 text-[11px] font-medium border-b border-border/30 pb-2.5">
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
          <span className="text-muted-foreground">Available (Click to Pick)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-destructive" />
          <span className="text-muted-foreground">Occupied / Booked</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
          <span className="text-muted-foreground">Pending</span>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="grid grid-cols-7 gap-1 text-center font-mono text-xs">
        {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map((day) => (
          <div key={day} className="py-1 text-[11px] font-bold text-muted-foreground">
            {day}
          </div>
        ))}

        {/* Empty Padding Days */}
        {Array.from({ length: firstDayOfWeek }).map((_, i) => (
          <div key={`pad-${i}`} className="h-10 bg-muted/10 border border-border/10 rounded-md opacity-30" />
        ))}

        {/* Month Days */}
        {Array.from({ length: daysInMonth }).map((_, i) => {
          const dayNum = i + 1;
          const { status, dateStr } = getDayAvailability(dayNum);
          const isToday =
            dayNum === new Date().getDate() &&
            month === new Date().getMonth() &&
            year === new Date().getFullYear();
          const isSelected = selectedDate === dateStr;

          const isAvailable = status === "available";
          const isOccupied = status === "occupied";
          const isPending = status === "pending";

          return (
            <button
              key={`day-${dayNum}`}
              type="button"
              disabled={!isAvailable}
              onClick={() => isAvailable && onSelectDate && onSelectDate(dateStr)}
              className={`h-10 rounded-lg border text-xs font-bold transition-all flex flex-col items-center justify-center relative ${
                isSelected
                  ? "ring-2 ring-primary bg-primary text-primary-foreground font-extrabold shadow-md scale-105"
                  : isOccupied
                  ? "bg-destructive/15 border-destructive/30 text-destructive/80 cursor-not-allowed line-through"
                  : isPending
                  ? "bg-amber-500/15 border-amber-500/30 text-amber-600 dark:text-amber-400 cursor-not-allowed"
                  : "bg-emerald-500/10 border-emerald-500/30 text-foreground hover:bg-emerald-500/20 hover:border-emerald-500 cursor-pointer"
              } ${isToday && !isSelected ? "border-primary" : ""}`}
            >
              <span>{dayNum}</span>

              {isOccupied && (
                <Lock className="w-2.5 h-2.5 text-destructive absolute bottom-1 right-1 opacity-70" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};
