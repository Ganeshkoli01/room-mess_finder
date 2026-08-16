import React, { useState, useEffect } from "react";
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Building2,
  User,
  CheckCircle2,
  Clock,
  XCircle,
  Edit3,
  Check,
  Loader2,
  Sparkles
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

export interface OccupiedRange {
  id: string;
  listingId: string;
  listingTitle: string;
  tenantName: string;
  checkInDate: string; // YYYY-MM-DD
  checkOutDate: string; // YYYY-MM-DD
  status: "accepted" | "pending" | "cancelled" | "rejected";
}

interface OwnerOccupancyCalendarProps {
  userId: string;
  bookings: OccupiedRange[];
  listings: { id: string; title: string }[];
  onUpdateStatus?: (bookingId: string, targetStatus: "accepted" | "pending" | "cancelled") => void;
}

export const OwnerOccupancyCalendar: React.FC<OwnerOccupancyCalendarProps> = ({
  userId,
  bookings,
  listings,
  onUpdateStatus,
}) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedListingId, setSelectedListingId] = useState<string>("all");
  const [dailyOverrides, setDailyOverrides] = useState<Record<string, "available" | "occupied" | "pending">>({});
  const [selectedDayInfo, setSelectedDayInfo] = useState<{
    dateStr: string;
    dayNum: number;
    currentStatus: "available" | "occupied" | "pending";
    booking: OccupiedRange | null;
  } | null>(null);
  const [savingDayStatus, setSavingDayStatus] = useState(false);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  // Days in month calculation
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayOfWeek = new Date(year, month, 1).getDay();

  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  useEffect(() => {
    fetchDailyOverrides();
  }, [currentDate, selectedListingId, userId]);

  const fetchDailyOverrides = async () => {
    if (!userId) return;
    try {
      let query = (supabase as any)
        .from("listing_daily_availability")
        .select("*")
        .eq("owner_id", userId);

      if (selectedListingId !== "all") {
        query = query.eq("listing_id", selectedListingId);
      }

      const { data, error } = await query;
      if (!error && data) {
        const map: Record<string, "available" | "occupied" | "pending"> = {};
        data.forEach((row: any) => {
          map[row.date] = row.status;
        });
        setDailyOverrides(map);
      }
    } catch (err) {
      console.error("Error fetching daily availability overrides:", err);
    }
  };

  const handlePrevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  // Filter bookings for selected listing
  const filteredBookings = bookings.filter((b) => {
    if (b.status === "cancelled" || b.status === "rejected") return false;
    if (selectedListingId !== "all" && b.listingId !== selectedListingId) {
      return false;
    }
    return true;
  });

  // Calculate Day Status (Day-by-Day)
  const getDayStatus = (dayNum: number) => {
    const monthFormatted = String(month + 1).padStart(2, "0");
    const dayFormatted = String(dayNum).padStart(2, "0");
    const dateStr = `${year}-${monthFormatted}-${dayFormatted}`;

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const target = new Date(year, month, dayNum);
    target.setHours(0, 0, 0, 0);

    // 1. Check direct day-by-day manual override first
    if (dailyOverrides[dateStr]) {
      const matchingBooking = filteredBookings.find((b) => {
        if (!b.checkInDate || !b.checkOutDate) return false;
        const inDate = new Date(b.checkInDate);
        const outDate = new Date(b.checkOutDate);
        inDate.setHours(0, 0, 0, 0);
        outDate.setHours(0, 0, 0, 0);
        return target >= inDate && target <= outDate;
      }) || null;

      return {
        status: dailyOverrides[dateStr],
        booking: matchingBooking,
        dateStr,
        isOverride: true,
      };
    }

    // 2. All dates prior to today are automatically marked occupied/passed
    if (target < today) {
      return {
        status: "occupied" as const,
        booking: null,
        dateStr,
        isOverride: false,
      };
    }

    // 3. Fall back to booking ranges
    for (const b of filteredBookings) {
      if (!b.checkInDate || !b.checkOutDate) continue;
      const inDate = new Date(b.checkInDate);
      const outDate = new Date(b.checkOutDate);
      inDate.setHours(0, 0, 0, 0);
      outDate.setHours(0, 0, 0, 0);

      if (target >= inDate && target <= outDate) {
        return {
          status: b.status === "accepted" ? ("occupied" as const) : ("pending" as const),
          booking: b,
          dateStr,
          isOverride: false,
        };
      }
    }

    return {
      status: "available" as const,
      booking: null,
      dateStr,
      isOverride: false,
    };
  };

  const handleSaveDayStatus = async (targetStatus: "available" | "occupied" | "pending") => {
    if (!selectedDayInfo || !userId) return;
    setSavingDayStatus(true);

    try {
      const targetListingId =
        selectedListingId !== "all"
          ? selectedListingId
          : listings[0]?.id || selectedDayInfo.booking?.listingId;

      if (!targetListingId) {
        toast.error("Please select a specific listing to update day availability.");
        setSavingDayStatus(false);
        return;
      }

      // Upsert into listing_daily_availability Postgres table
      const { error } = await (supabase as any)
        .from("listing_daily_availability")
        .upsert(
          {
            listing_id: targetListingId,
            owner_id: userId,
            date: selectedDayInfo.dateStr,
            status: targetStatus,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "listing_id,date" }
        );

      if (error) throw error;

      // Update local state map
      setDailyOverrides((prev) => ({
        ...prev,
        [selectedDayInfo.dateStr]: targetStatus,
      }));

      // If associated with a booking range and changing to available/cancelled, trigger booking update
      if (selectedDayInfo.booking && targetStatus === "available" && onUpdateStatus) {
        onUpdateStatus(selectedDayInfo.booking.id, "cancelled");
      } else if (selectedDayInfo.booking && targetStatus === "occupied" && onUpdateStatus) {
        onUpdateStatus(selectedDayInfo.booking.id, "accepted");
      }

      toast.success(
        `Day ${selectedDayInfo.dayNum} ${monthNames[month]} set to ${targetStatus.toUpperCase()}!`
      );
      setSelectedDayInfo(null);
    } catch (err: any) {
      toast.error(err.message || "Failed to update day availability");
    } finally {
      setSavingDayStatus(false);
    }
  };

  return (
    <div className="bg-card border border-border/60 rounded-2xl p-6 shadow-xl space-y-6 text-left">
      <div className="flex items-center justify-between flex-wrap gap-4 border-b border-border/40 pb-4">
        <div>
          <h2 className="text-xl font-heading font-bold text-foreground flex items-center gap-2">
            <CalendarIcon className="w-5 h-5 text-primary" />
            Day-by-Day Occupancy & Calendar Grid
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Click on <strong>any day (1–31)</strong> to edit individual day status (Available, Occupied, Pending)
          </p>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          {/* Listing Filter Selector */}
          <select
            value={selectedListingId}
            onChange={(e) => setSelectedListingId(e.target.value)}
            className="h-9 text-xs bg-muted/30 border border-border/60 rounded-lg px-3 text-foreground focus:outline-none"
          >
            <option value="all">All My Listings</option>
            {listings.map((l) => (
              <option key={l.id} value={l.id}>
                {l.title}
              </option>
            ))}
          </select>

          {/* Month Navigation */}
          <div className="flex items-center gap-1 bg-muted/40 p-1 rounded-lg border border-border/40">
            <Button variant="ghost" size="icon" onClick={handlePrevMonth} className="h-7 w-7">
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <span className="text-xs font-semibold px-2 min-w-[120px] text-center text-foreground">
              {monthNames[month]} {year}
            </span>
            <Button variant="ghost" size="icon" onClick={handleNextMonth} className="h-7 w-7">
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Status Legend */}
      <div className="flex items-center gap-6 text-xs font-medium border-b border-border/30 pb-3 flex-wrap">
        <div className="flex items-center gap-1.5 cursor-pointer">
          <span className="w-3 h-3 rounded-full bg-emerald-500/20 border border-emerald-500" />
          <span className="text-muted-foreground">Available (Click any date to set)</span>
        </div>
        <div className="flex items-center gap-1.5 cursor-pointer">
          <span className="w-3 h-3 rounded-full bg-destructive/20 border border-destructive" />
          <span className="text-muted-foreground">Occupied / Confirmed Stay</span>
        </div>
        <div className="flex items-center gap-1.5 cursor-pointer">
          <span className="w-3 h-3 rounded-full bg-amber-500/20 border border-amber-500" />
          <span className="text-muted-foreground">Pending Request</span>
        </div>
      </div>

      {/* Month Calendar Grid */}
      <div className="grid grid-cols-7 gap-1 text-center font-mono text-xs">
        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
          <div key={day} className="py-2 font-bold text-muted-foreground border-b border-border/30">
            {day}
          </div>
        ))}

        {/* Empty Padding Days */}
        {Array.from({ length: firstDayOfWeek }).map((_, i) => (
          <div key={`pad-${i}`} className="h-20 bg-muted/10 border border-border/20 rounded-lg opacity-30" />
        ))}

        {/* Calendar Days (Interactive Day-by-Day Grid) */}
        {Array.from({ length: daysInMonth }).map((_, i) => {
          const dayNum = i + 1;
          const { status, booking, dateStr, isOverride } = getDayStatus(dayNum);
          const isToday =
            dayNum === new Date().getDate() &&
            month === new Date().getMonth() &&
            year === new Date().getFullYear();

          const isOccupied = status === "occupied";
          const isPending = status === "pending";

          return (
            <div
              key={`day-${dayNum}`}
              onClick={() =>
                setSelectedDayInfo({
                  dateStr,
                  dayNum,
                  currentStatus: status,
                  booking,
                })
              }
              className={`h-20 p-1.5 rounded-xl border transition-all flex flex-col justify-between text-left relative overflow-hidden cursor-pointer group hover:scale-[1.02] ${
                isOccupied
                  ? "bg-destructive/10 border-destructive/40 text-foreground hover:border-destructive"
                  : isPending
                  ? "bg-amber-500/10 border-amber-500/40 text-foreground hover:border-amber-500"
                  : "bg-emerald-500/5 border-emerald-500/20 hover:border-emerald-500/70 text-foreground"
              } ${isToday ? "ring-2 ring-primary" : ""}`}
            >
              <div className="flex items-center justify-between">
                <span
                  className={`text-xs font-bold ${
                    isToday
                      ? "bg-primary text-primary-foreground w-5 h-5 rounded-full flex items-center justify-center text-[11px]"
                      : ""
                  }`}
                >
                  {dayNum}
                </span>

                <div className="flex items-center gap-1">
                  {isOverride && (
                    <Badge variant="outline" className="text-[8px] px-1 py-0 bg-primary/10 border-primary/30 text-primary">
                      EDITED
                    </Badge>
                  )}
                  <Badge
                    variant="outline"
                    className={`text-[9px] px-1 py-0 border-0 ${
                      isOccupied
                        ? "bg-destructive/20 text-destructive"
                        : isPending
                        ? "bg-amber-500/20 text-amber-600 dark:text-amber-400"
                        : "bg-emerald-500/20 text-emerald-500"
                    }`}
                  >
                    {isOccupied ? "Occupied" : isPending ? "Pending" : "Available"}
                  </Badge>
                </div>
              </div>

              {booking ? (
                <div className="text-[10px] space-y-0.5 truncate bg-background/80 p-1 rounded border border-border/40 backdrop-blur-sm">
                  <p className="font-semibold truncate text-foreground flex items-center justify-between gap-1">
                    <span className="flex items-center gap-1 truncate">
                      <User className="w-2.5 h-2.5 text-primary" /> {booking.tenantName}
                    </span>
                    <Edit3 className="w-2.5 h-2.5 text-muted-foreground opacity-60 group-hover:opacity-100" />
                  </p>
                  <p className="text-[9px] text-muted-foreground truncate flex items-center gap-1">
                    <Building2 className="w-2.5 h-2.5" /> {booking.listingTitle}
                  </p>
                </div>
              ) : (
                <div className="text-[9px] text-muted-foreground/60 flex items-center justify-between opacity-0 group-hover:opacity-100 transition-opacity">
                  <span>Click to edit</span>
                  <Edit3 className="w-2.5 h-2.5 text-primary" />
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Interactive Day-by-Day Status Editor Dialog Modal */}
      {selectedDayInfo && (
        <Dialog open={true} onOpenChange={() => setSelectedDayInfo(null)}>
          <DialogContent className="max-w-md bg-card">
            <DialogHeader>
              <DialogTitle className="text-lg flex items-center gap-2">
                <Edit3 className="w-5 h-5 text-primary" />
                Edit Day Status: Day {selectedDayInfo.dayNum} {monthNames[month]} {year}
              </DialogTitle>
              <DialogDescription className="text-xs">
                {selectedDayInfo.booking
                  ? `Active tenant booking: ${selectedDayInfo.booking.tenantName} (${selectedDayInfo.booking.listingTitle})`
                  : `Customize individual day status for ${
                      selectedListingId !== "all"
                        ? listings.find((l) => l.id === selectedListingId)?.title
                        : "all listings"
                    }`}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3 py-3">
              <label className="text-xs font-semibold text-foreground block">
                Set Day {selectedDayInfo.dayNum} Status To:
              </label>

              <div className="grid grid-cols-1 gap-2.5 text-xs">
                {/* 1. Available Button */}
                <Button
                  variant={selectedDayInfo.currentStatus === "available" ? "default" : "outline"}
                  onClick={() => handleSaveDayStatus("available")}
                  disabled={savingDayStatus}
                  className="justify-start gap-3 h-12 border-emerald-500/40 hover:bg-emerald-500/10 text-foreground"
                >
                  <span className="w-3.5 h-3.5 rounded-full bg-emerald-500 shrink-0" />
                  <div className="text-left">
                    <div className="font-bold flex items-center gap-1.5">
                      Available <Check className="w-3.5 h-3.5 text-emerald-500" />
                    </div>
                    <div className="text-[10px] text-muted-foreground">
                      Open for tenant booking requests on this day
                    </div>
                  </div>
                </Button>

                {/* 2. Occupied Button */}
                <Button
                  variant={selectedDayInfo.currentStatus === "occupied" ? "default" : "outline"}
                  onClick={() => handleSaveDayStatus("occupied")}
                  disabled={savingDayStatus}
                  className="justify-start gap-3 h-12 border-destructive/40 hover:bg-destructive/10 text-foreground"
                >
                  <span className="w-3.5 h-3.5 rounded-full bg-destructive shrink-0" />
                  <div className="text-left">
                    <div className="font-bold text-destructive">Occupied / Confirmed Stay</div>
                    <div className="text-[10px] text-muted-foreground">
                      Mark as occupied for this specific day
                    </div>
                  </div>
                </Button>

                {/* 3. Pending Button */}
                <Button
                  variant={selectedDayInfo.currentStatus === "pending" ? "default" : "outline"}
                  onClick={() => handleSaveDayStatus("pending")}
                  disabled={savingDayStatus}
                  className="justify-start gap-3 h-12 border-amber-500/40 hover:bg-amber-500/10 text-foreground"
                >
                  <span className="w-3.5 h-3.5 rounded-full bg-amber-500 shrink-0" />
                  <div className="text-left">
                    <div className="font-bold text-amber-500">Pending Request</div>
                    <div className="text-[10px] text-muted-foreground">
                      Set day to pending reservation state
                    </div>
                  </div>
                </Button>
              </div>
            </div>

            <DialogFooter>
              <Button variant="ghost" size="sm" onClick={() => setSelectedDayInfo(null)}>
                Cancel
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};
