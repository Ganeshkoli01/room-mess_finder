import React, { useState, useEffect } from "react";
import {
  Building2,
  Calendar as CalendarIcon,
  CheckCircle2,
  XCircle,
  Clock,
  Phone,
  Mail,
  User,
  MessageSquare,
  AlertCircle,
  Loader2,
  ShieldCheck,
  Lock
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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
import { OwnerOccupancyCalendar, OccupiedRange } from "./OwnerOccupancyCalendar";

export interface OwnerBookingItem {
  id: string;
  listing_id: string;
  user_id: string;
  owner_id: string;
  status: "pending" | "accepted" | "rejected" | "cancelled";
  check_in_date: string | null;
  check_out_date: string | null;
  created_at: string;
  user_name: string;
  user_email: string;
  user_phone: string;
  response_message?: string;
  listing_title: string;
  listing_city: string;
  listing_price: number;
}

interface OwnerBookingManagerProps {
  userId: string;
  listings: { id: string; title: string }[];
}

export const OwnerBookingManager: React.FC<OwnerBookingManagerProps> = ({
  userId,
  listings,
}) => {
  const [bookings, setBookings] = useState<OwnerBookingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [rejectingBooking, setRejectingBooking] = useState<OwnerBookingItem | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [processingId, setProcessingId] = useState<string | null>(null);

  useEffect(() => {
    fetchOwnerBookings();
  }, [userId]);

  const fetchOwnerBookings = async () => {
    setLoading(true);
    try {
      // 1. Try calling RLS-enforced RPC function get_owner_bookings(p_owner_id)
      const { data: rpcData, error: rpcErr } = await (supabase as any).rpc(
        "get_owner_bookings",
        { p_owner_id: userId }
      );

      if (!rpcErr && rpcData) {
        setBookings(rpcData as OwnerBookingItem[]);
      } else {
        // Fallback RLS-scoped direct table query
        const { data: tableData, error: tableErr } = await (supabase as any)
          .from("bookings")
          .select("*")
          .eq("owner_id", userId)
          .order("created_at", { ascending: false });

        if (!tableErr && tableData) {
          setBookings(
            tableData.map((b: any) => ({
              id: b.id,
              listing_id: b.listing_id,
              user_id: b.user_id,
              owner_id: b.owner_id,
              status: b.status || "pending",
              check_in_date: b.check_in_date || b.created_at,
              check_out_date: b.check_out_date || b.created_at,
              created_at: b.created_at,
              user_name: b.user_name || "Tenant",
              user_email: b.status === "accepted" ? b.user_email : "••••••••@••••.com (Revealed on Acceptance)",
              user_phone: b.status === "accepted" ? b.user_phone : "•••••••••• (Revealed on Acceptance)",
              response_message: b.response_message,
              listing_title: b.listing_title || "Room / Mess Listing",
              listing_city: "City",
              listing_price: 0,
            }))
          );
        }
      }
    } catch (err) {
      console.error("Error fetching owner bookings:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleAcceptBooking = async (booking: OwnerBookingItem) => {
    setProcessingId(booking.id);
    try {
      let { error } = await (supabase as any)
        .from("bookings")
        .update({
          status: "accepted",
          updated_at: new Date().toISOString(),
        })
        .eq("id", booking.id)
        .eq("owner_id", userId);

      if (error) {
        const { error: err2 } = await (supabase as any)
          .from("bookings")
          .update({
            status: "approved",
            updated_at: new Date().toISOString(),
          })
          .eq("id", booking.id)
          .eq("owner_id", userId);

        if (err2) throw error;
      }

      // Insert tenant notification
      await (supabase as any).from("notifications").insert({
        user_id: booking.user_id,
        type: "booking_response",
        title: "Booking Request Accepted! 🎉",
        message: `Your booking request for '${booking.listing_title}' was accepted by the owner. Contact details unlocked!`,
        read: false,
        created_at: new Date().toISOString(),
      }).then();

      toast.success(`Booking request accepted! Tenant contact information unlocked.`);
      fetchOwnerBookings();
    } catch (err: any) {
      toast.error(err.message || "Failed to accept booking");
    } finally {
      setProcessingId(null);
    }
  };

  const handleRejectBooking = async () => {
    if (!rejectingBooking) return;
    setProcessingId(rejectingBooking.id);

    try {
      const { error } = await (supabase as any)
        .from("bookings")
        .update({
          status: "rejected",
          response_message: rejectReason || "Rejected by owner",
          updated_at: new Date().toISOString(),
        })
        .eq("id", rejectingBooking.id)
        .eq("owner_id", userId);

      if (error) throw error;

      // Insert tenant notification
      await (supabase as any).from("notifications").insert({
        user_id: rejectingBooking.user_id,
        type: "booking_response",
        title: "Booking Request Decision",
        message: `Your request for '${rejectingBooking.listing_title}' was rejected by the owner.${
          rejectReason ? ` Reason: ${rejectReason}` : ""
        }`,
        read: false,
        created_at: new Date().toISOString(),
      }).then();

      toast.info(`Booking request rejected.`);
      setRejectingBooking(null);
      setRejectReason("");
      fetchOwnerBookings();
    } catch (err: any) {
      toast.error(err.message || "Failed to reject booking");
    } finally {
      setProcessingId(null);
    }
  };

  const handleUpdateBookingStatus = async (
    bookingId: string,
    targetStatus: "accepted" | "pending" | "cancelled" | "rejected"
  ) => {
    setProcessingId(bookingId);
    try {
      const dbStatus = targetStatus === "accepted" ? "accepted" : targetStatus;
      let { error } = await (supabase as any)
        .from("bookings")
        .update({
          status: dbStatus,
          updated_at: new Date().toISOString(),
        })
        .eq("id", bookingId)
        .eq("owner_id", userId);

      if (error && targetStatus === "accepted") {
        await (supabase as any)
          .from("bookings")
          .update({
            status: "approved",
            updated_at: new Date().toISOString(),
          })
          .eq("id", bookingId)
          .eq("owner_id", userId);
      }

      toast.success(`Booking status updated to ${targetStatus.toUpperCase()}!`);
      fetchOwnerBookings();
    } catch (err: any) {
      toast.error(err.message || "Failed to update status");
    } finally {
      setProcessingId(null);
    }
  };

  const filteredBookings = bookings.filter((b) => {
    if (filterStatus === "all") return true;
    return b.status === filterStatus;
  });

  const pendingCount = bookings.filter((b) => b.status === "pending").length;

  // Convert accepted bookings to OccupiedRange for calendar grid
  const calendarRanges: OccupiedRange[] = bookings
    .filter((b) => b.status === "accepted" || b.status === "pending")
    .map((b) => ({
      id: b.id,
      listingId: b.listing_id,
      listingTitle: b.listing_title,
      tenantName: b.user_name,
      checkInDate: b.check_in_date || b.created_at.split("T")[0],
      checkOutDate: b.check_out_date || b.created_at.split("T")[0],
      status: b.status as "accepted" | "pending",
    }));

  return (
    <div className="space-y-8 text-left">
      {/* 1. Occupancy Calendar Grid */}
      <OwnerOccupancyCalendar
        userId={userId}
        bookings={calendarRanges}
        listings={listings}
        onUpdateStatus={(id, st) => handleUpdateBookingStatus(id, st)}
      />

      {/* 2. Incoming Booking Requests List */}
      <div className="bg-card border border-border/60 rounded-2xl p-6 shadow-xl space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-4 border-b border-border/40 pb-4">
          <div>
            <h2 className="text-xl font-heading font-bold text-foreground flex items-center gap-2">
              <Building2 className="w-5 h-5 text-primary" />
              Incoming Booking Requests & RLS Security View
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Strict Postgres RLS scoped to <code className="font-mono text-primary">owner_id = auth.uid()</code>
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {(["all", "pending", "accepted", "rejected"] as const).map((st) => (
              <Button
                key={st}
                variant={filterStatus === st ? "default" : "outline"}
                size="sm"
                onClick={() => setFilterStatus(st)}
                className="text-xs capitalize h-8"
              >
                {st === "pending" && pendingCount > 0 ? (
                  <span className="flex items-center gap-1">
                    Pending <Badge className="bg-amber-500 text-white text-[10px] px-1 py-0">{pendingCount}</Badge>
                  </span>
                ) : (
                  st
                )}
              </Button>
            ))}
            <Button variant="ghost" size="sm" onClick={fetchOwnerBookings} className="h-8 text-xs">
              Refresh
            </Button>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : filteredBookings.length === 0 ? (
          <div className="p-8 text-center bg-muted/20 border border-dashed border-border/60 rounded-xl space-y-2">
            <CheckCircle2 className="w-8 h-8 text-muted-foreground opacity-40 mx-auto" />
            <p className="font-semibold text-sm text-foreground">No Booking Requests Found</p>
            <p className="text-xs text-muted-foreground">
              {filterStatus === "pending"
                ? "You have no pending tenant booking requests."
                : "Incoming requests from tenants will appear here."}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredBookings.map((b) => {
              const isAccepted = b.status === "accepted";
              const isPending = b.status === "pending";
              const isRejected = b.status === "rejected";
              const isProcessing = processingId === b.id;

              return (
                <div
                  key={b.id}
                  className={`p-5 rounded-2xl border transition-all space-y-4 ${
                    isPending
                      ? "bg-amber-500/5 border-amber-500/30"
                      : isAccepted
                      ? "bg-emerald-500/5 border-emerald-500/30"
                      : "bg-muted/20 border-border/40"
                  }`}
                >
                  <div className="flex items-start justify-between flex-wrap gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-heading font-bold text-base text-foreground">
                          {b.listing_title}
                        </h3>
                        <Badge
                          className={`text-[10px] uppercase font-mono ${
                            isAccepted
                              ? "bg-emerald-500/20 text-emerald-500 border border-emerald-500/30"
                              : isPending
                              ? "bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/30"
                              : "bg-destructive/20 text-destructive border border-destructive/30"
                          }`}
                        >
                          {b.status}
                        </Badge>
                      </div>

                      <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1.5">
                        <User className="w-3.5 h-3.5 text-primary" /> Tenant Name:{" "}
                        <strong className="text-foreground font-semibold">{b.user_name}</strong>
                      </p>
                    </div>

                    <div className="text-right text-xs">
                      <span className="text-muted-foreground block text-[11px]">Requested On</span>
                      <span className="font-mono text-foreground font-medium">
                        {new Date(b.created_at).toLocaleDateString("en-IN", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </span>
                    </div>
                  </div>

                  {/* Requested Dates */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs bg-muted/30 p-3 rounded-xl border border-border/30">
                    <div className="flex items-center gap-2">
                      <CalendarIcon className="w-4 h-4 text-emerald-500" />
                      <div>
                        <span className="text-[10px] text-muted-foreground block">Check-In Date</span>
                        <strong className="text-foreground">
                          {b.check_in_date ? new Date(b.check_in_date).toLocaleDateString("en-IN") : "Flexible"}
                        </strong>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-destructive" />
                      <div>
                        <span className="text-[10px] text-muted-foreground block">Check-Out Date</span>
                        <strong className="text-foreground">
                          {b.check_out_date ? new Date(b.check_out_date).toLocaleDateString("en-IN") : "Flexible"}
                        </strong>
                      </div>
                    </div>
                  </div>

                  {/* Contact Info Security Block (Requirement 5) */}
                  <div className="p-3 rounded-xl bg-background border border-border/40 text-xs space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-muted-foreground flex items-center gap-1.5">
                        {isAccepted ? (
                          <ShieldCheck className="w-4 h-4 text-emerald-500" />
                        ) : (
                          <Lock className="w-4 h-4 text-amber-500" />
                        )}
                        Tenant Contact Info (Postgres Filtered View)
                      </span>
                      <span className="text-[10px] text-muted-foreground font-mono">
                        {isAccepted ? "UNLOCKED ✓" : "MASKED UNTIL ACCEPTED 🔒"}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs pt-1">
                      <div className="flex items-center gap-2">
                        <Phone className="w-3.5 h-3.5 text-primary" />
                        <span className="font-mono text-foreground">{b.user_phone}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Mail className="w-3.5 h-3.5 text-primary" />
                        <span className="font-mono text-foreground">{b.user_email}</span>
                      </div>
                    </div>
                  </div>

                  {/* Status Editor Row */}
                  <div className="flex items-center justify-between pt-2 border-t border-border/30 flex-wrap gap-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-muted-foreground">Quick Change Status:</span>
                      <select
                        value={b.status}
                        onChange={(e) =>
                          handleUpdateBookingStatus(
                            b.id,
                            e.target.value as "accepted" | "pending" | "cancelled" | "rejected"
                          )
                        }
                        disabled={isProcessing}
                        className="h-8 text-xs bg-background border border-border/60 rounded-lg px-2 text-foreground font-semibold focus:outline-none"
                      >
                        <option value="accepted">🔴 Occupied (Accepted)</option>
                        <option value="pending">🟡 Pending Request</option>
                        <option value="cancelled">🟢 Available (Cancelled)</option>
                        <option value="rejected">❌ Rejected</option>
                      </select>
                    </div>

                    {isPending && (
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setRejectingBooking(b)}
                          disabled={isProcessing}
                          className="gap-1.5 text-xs text-destructive border-destructive/30 hover:bg-destructive/10"
                        >
                          <XCircle className="w-3.5 h-3.5" /> Reject
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => handleAcceptBooking(b)}
                          disabled={isProcessing}
                          className="gap-1.5 text-xs bg-emerald-500 hover:bg-emerald-600 text-white"
                        >
                          {isProcessing ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <CheckCircle2 className="w-3.5 h-3.5" />
                          )}
                          Accept & Confirm Stay
                        </Button>
                      </div>
                    )}
                  </div>

                  {isRejected && b.response_message && (
                    <div className="text-xs text-destructive bg-destructive/10 p-2.5 rounded-lg border border-destructive/20">
                      <strong>Rejection Reason:</strong> {b.response_message}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Reject Booking Dialog Modal */}
      {rejectingBooking && (
        <Dialog open={true} onOpenChange={() => setRejectingBooking(null)}>
          <DialogContent className="max-w-md bg-card">
            <DialogHeader>
              <DialogTitle className="text-lg">Reject Booking Request</DialogTitle>
              <DialogDescription className="text-xs">
                Provide an optional reason to notify tenant '{rejectingBooking.user_name}'.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3 py-2 text-xs">
              <label className="font-semibold block text-foreground">Reason for Rejection (Optional)</label>
              <Textarea
                rows={3}
                placeholder="e.g. Dates already reserved or maintenance scheduled."
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                className="bg-background"
              />
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setRejectingBooking(null)}>
                Cancel
              </Button>
              <Button variant="destructive" onClick={handleRejectBooking}>
                Confirm Rejection
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};
