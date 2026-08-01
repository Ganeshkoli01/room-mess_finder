import { useState, useEffect } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import {
  Building2,
  UtensilsCrossed,
  LayoutDashboard,
  Calendar,
  Heart,
  Settings,
  LogOut,
  Menu,
  Bell,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  CreditCard,
  Home,
  Coffee,
  RefreshCw,
  Pause,
  Play,
  User,
  Phone,
  Mail,
  Save,
  Loader2,
  Trash2,
} from "lucide-react";
import {
  getUserEnquiries,
  fetchUserEnquiries,
  deleteEnquiry,
  getUserBookings,
  getUserSubscriptions,
  fetchUserBookings,
  fetchUserSubscriptions,
  Enquiry,
  Booking,
  MessSubscription,
  cancelBooking,
  pauseSubscription,
  resumeSubscription,
  renewSubscription,
} from "@/services/bookingService";
import { getFavorites } from "@/services/recommendationsService";
import BookingDialog from "@/components/booking/BookingDialog";
import PaymentDialog from "@/components/payment/PaymentDialog";
import { useLanguage } from "@/contexts/LanguageContext";
import { getProfile, updateProfile, Profile } from "@/services/profileService";
import { checkAndNotifyExpiredSubscriptions } from "@/services/subscriptionExpiryService";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type EnquiryStatus = "pending" | "approved" | "rejected" | "booked";

const statusConfig: Record<EnquiryStatus, { icon: typeof Clock; label: string; className: string }> = {
  pending: { icon: Clock, label: "Pending", className: "bg-warning/10 text-warning" },
  approved: { icon: CheckCircle, label: "Approved", className: "bg-success/10 text-success" },
  rejected: { icon: XCircle, label: "Rejected", className: "bg-destructive/10 text-destructive" },
  booked: { icon: Home, label: "Booked", className: "bg-primary/10 text-primary" },
};

const UserDashboard = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user, userRole, loading: authLoading, signOut } = useAuth();

  // Role-based routing redirect
  useEffect(() => {
    if (!authLoading) {
      if (!user) {
        navigate("/auth");
      } else if (userRole === "admin") {
        navigate("/admin/dashboard");
      } else if (userRole === "owner") {
        navigate("/owner/dashboard");
      }
    }
  }, [user, userRole, authLoading, navigate]);
  const { toast } = useToast();
  const { t } = useLanguage();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeTab, setActiveTab] = useState(() => {
    return searchParams.get("tab") || "overview";
  });

  // Sync activeTab with URL param so it updates when param changes (e.g. back navigation or click)
  useEffect(() => {
    const tab = searchParams.get("tab");
    if (tab && tab !== activeTab) {
      setActiveTab(tab);
    }
  }, [searchParams]);

  // Update search param when activeTab changes
  const handleTabChange = (value: string) => {
    setActiveTab(value);
    setSearchParams({ tab: value });
  };
  const [enquiries, setEnquiries] = useState<Enquiry[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [subscriptions, setSubscriptions] = useState<MessSubscription[]>([]);
  const [savedCount, setSavedCount] = useState(0);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const [editProfile, setEditProfile] = useState({
    first_name: "",
    last_name: "",
    phone: "",
  });

  useEffect(() => {
    if (user) {
      loadData();
    }
  }, [user]);

  const loadData = async () => {
    if (!user) return;
    setEnquiries(getUserEnquiries(user.id, user.email));
    setBookings(getUserBookings(user.id));
    setSubscriptions(getUserSubscriptions(user.id));
    setSavedCount(getFavorites().length);

    // Check and notify expired mess subscriptions & room stays
    checkAndNotifyExpiredSubscriptions(user.id).then(() => {
      // Re-fetch bookings and subscriptions after checking expiration
      fetchUserBookings(user.id).then(setBookings);
      fetchUserSubscriptions(user.id).then(setSubscriptions);
    }).catch(console.error);

    // Fetch fresh enquiries asynchronously from Supabase
    fetchUserEnquiries(user.id, user.email).then((data) => {
      setEnquiries(data);
    });

    // Load profile
    setProfileLoading(true);
    try {
      const profileData = await getProfile();
      if (profileData) {
        setProfile(profileData);
        setEditProfile({
          first_name: profileData.first_name || "",
          last_name: profileData.last_name || "",
          phone: profileData.phone || "",
        });
      }
    } catch (err) {
      console.error("Error loading profile:", err);
    } finally {
      setProfileLoading(false);
    }
  };

  const handleDeleteEnquiry = async (enquiryId: string) => {
    // Optimistic UI update
    setEnquiries((prev) => prev.filter((e) => e.id !== enquiryId));

    const success = await deleteEnquiry(enquiryId);
    if (success) {
      toast({
        title: "Enquiry Deleted",
        description: "The enquiry has been removed.",
      });
      loadData();
    } else {
      toast({
        title: "Error",
        description: "Failed to delete enquiry.",
        variant: "destructive",
      });
      loadData();
    }
  };

  const handleCancelBooking = (bookingId: string) => {
    if (cancelBooking(bookingId)) {
      toast({
        title: "Booking Cancelled",
        description: "Your booking has been cancelled.",
      });
      loadData();
    }
  };

  const handlePauseSubscription = (subscriptionId: string) => {
    if (pauseSubscription(subscriptionId)) {
      toast({
        title: "Subscription Paused",
        description: "Your subscription has been paused.",
      });
      loadData();
    }
  };

  const handleResumeSubscription = (subscriptionId: string) => {
    if (resumeSubscription(subscriptionId)) {
      toast({
        title: "Subscription Resumed",
        description: "Your subscription is now active again.",
      });
      loadData();
    }
  };

  const handleRenewSubscription = (subscriptionId: string) => {
    if (renewSubscription(subscriptionId)) {
      toast({
        title: "Subscription Renewed",
        description: "Your subscription has been renewed.",
      });
      loadData();
    }
  };

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  const navItems = [
    { id: "overview", label: "Overview", icon: LayoutDashboard },
    { id: "enquiries", label: "Enquiries", icon: Calendar },
    { id: "bookings", label: "Bookings", icon: Home },
    { id: "subscriptions", label: "Subscriptions", icon: Coffee },
    { id: "saved", label: "Saved", icon: Heart },
    { id: "settings", label: "Settings", icon: Settings },
  ];

  const pendingEnquiries = enquiries.filter(e => e.status === "pending").length;
  const approvedEnquiries = enquiries.filter(e => e.status === "approved").length;
  const activeBookings = bookings.filter(b => b.status === "confirmed").length;
  const activeSubscriptions = subscriptions.filter(s => s.status === "active").length;

  const stats = [
    { label: "Total Enquiries", value: enquiries.length.toString(), icon: Calendar, color: "bg-primary" },
    { label: "Active Bookings", value: activeBookings.toString(), icon: Home, color: "bg-success" },
    { label: "Subscriptions", value: activeSubscriptions.toString(), icon: Coffee, color: "bg-warning" },
    { label: "Saved Items", value: savedCount.toString(), icon: Heart, color: "bg-accent" },
  ];

  return (
    <div className="min-h-screen bg-background flex">
      {/* Sidebar */}
      <aside className={`fixed lg:static inset-y-0 left-0 z-50 w-64 bg-card border-r border-border transform ${sidebarOpen ? "translate-x-0" : "-translate-x-full"} lg:translate-x-0 transition-transform duration-200`}>
        <div className="flex flex-col h-full">
          <div className="p-6 border-b border-border">
            <Link to="/" className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-xl gradient-hero flex items-center justify-center">
                <Building2 className="w-5 h-5 text-primary-foreground" />
              </div>
              <span className="font-heading font-bold text-xl">
                Room<span className="text-primary">&</span>Mess
              </span>
            </Link>
          </div>

          <nav className="flex-1 p-4 space-y-1">
            {navItems.map((item) => (
              <button
                key={item.id}
                onClick={() => handleTabChange(item.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-colors ${activeTab === item.id
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-muted"
                  }`}
              >
                <item.icon className="w-5 h-5" />
                {item.label}
                {item.id === "enquiries" && pendingEnquiries > 0 && (
                  <Badge variant="destructive" className="ml-auto">{pendingEnquiries}</Badge>
                )}
              </button>
            ))}

            <hr className="my-4" />

            <Link to="/rooms" className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-muted-foreground hover:bg-muted transition-colors">
              <Building2 className="w-5 h-5" />
              {t('hero.findRooms')}
            </Link>
            <Link to="/mess" className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-muted-foreground hover:bg-muted transition-colors">
              <UtensilsCrossed className="w-5 h-5" />
              {t('hero.findMess')}
            </Link>
          </nav>

          <div className="p-4 border-t border-border">
            <Button variant="ghost" className="w-full justify-start gap-3 text-muted-foreground" onClick={handleSignOut}>
              <LogOut className="w-5 h-5" />
              {t('nav.logout')}
            </Button>
          </div>
        </div>
      </aside>

      {sidebarOpen && (
        <div className="fixed inset-0 z-40 bg-foreground/50 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      <div className="flex-1 flex flex-col min-h-screen">
        <header className="sticky top-0 z-30 bg-card/80 backdrop-blur-lg border-b border-border">
          <div className="flex items-center justify-between px-6 py-4">
            <div className="flex items-center gap-4">
              <button className="lg:hidden" onClick={() => setSidebarOpen(true)}>
                <Menu className="w-6 h-6" />
              </button>
              <div>
                <h1 className="font-heading font-semibold text-xl">{t('nav.dashboard')}</h1>
                <p className="text-sm text-muted-foreground">Welcome back, {user?.email}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="icon" onClick={loadData}>
                <RefreshCw className="w-5 h-5" />
              </Button>
              <Button variant="ghost" size="icon" className="relative">
                <Bell className="w-5 h-5" />
              </Button>
            </div>
          </div>
        </header>

        <main className="flex-1 p-6">
          {/* Stats */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            {stats.map((stat) => (
              <div key={stat.label} className="bg-card rounded-2xl p-5 shadow-soft">
                <div className={`w-12 h-12 rounded-xl ${stat.color} flex items-center justify-center mb-4`}>
                  <stat.icon className="w-6 h-6 text-primary-foreground" />
                </div>
                <p className="text-2xl font-bold text-foreground">{stat.value}</p>
                <p className="text-sm text-muted-foreground">{stat.label}</p>
              </div>
            ))}
          </div>

          {/* Tabs Content */}
          <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-6">
            {/* Overview Tab */}
            <TabsContent value="overview" className="space-y-6">
              {/* Approved Enquiries - Ready to Book */}
              {approvedEnquiries > 0 && (
                <div className="bg-success/10 border border-success/30 rounded-2xl p-6">
                  <h3 className="font-semibold text-success flex items-center gap-2 mb-4">
                    <CheckCircle className="w-5 h-5" />
                    {approvedEnquiries} Enquiry Approved! Ready to Book
                  </h3>
                  <div className="space-y-3">
                    {enquiries.filter(e => e.status === "approved").map((enquiry) => (
                      <div key={enquiry.id} className="bg-card rounded-xl p-4 flex items-center justify-between">
                        <div>
                          <h4 className="font-medium">{enquiry.listingTitle}</h4>
                          <p className="text-sm text-muted-foreground capitalize">{enquiry.listingType}</p>
                        </div>
                        {enquiry.listingType === "room" ? (
                          <BookingDialog
                            enquiry={enquiry}
                            monthlyRent={5000} // Default, should be passed from listing
                            trigger={<Button size="sm" className="gap-2"><Home className="w-4 h-4" />Book Now</Button>}
                            onSuccess={loadData}
                          />
                        ) : (
                          <PaymentDialog
                            listingId={enquiry.listingId}
                            listingType="mess"
                            listingTitle={enquiry.listingTitle}
                            basePrice={3000}
                            trigger={<Button size="sm" className="gap-2"><CreditCard className="w-4 h-4" />Subscribe</Button>}
                          />
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Recent Activity */}
              <div className="bg-card rounded-2xl shadow-soft">
                <div className="p-6 border-b border-border">
                  <h2 className="font-heading font-semibold text-lg">Recent Activity</h2>
                </div>
                {enquiries.length === 0 && bookings.length === 0 && subscriptions.length === 0 ? (
                  <div className="p-8 text-center">
                    <Calendar className="w-12 h-12 mx-auto text-muted-foreground/50 mb-4" />
                    <h3 className="font-semibold text-foreground mb-2">No activity yet</h3>
                    <p className="text-muted-foreground mb-4">Start by browsing rooms and mess</p>
                    <div className="flex items-center justify-center gap-3">
                      <Link to="/rooms"><Button variant="default">{t('hero.findRooms')}</Button></Link>
                      <Link to="/mess"><Button variant="outline">{t('hero.findMess')}</Button></Link>
                    </div>
                  </div>
                ) : (
                  <div className="divide-y divide-border max-h-[400px] overflow-y-auto">
                    {enquiries.slice(0, 5).map((enquiry) => {
                      const StatusIcon = statusConfig[enquiry.status].icon;
                      return (
                        <div key={enquiry.id} className="p-4 flex items-center gap-4">
                          <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${enquiry.listingType === "room" ? "bg-primary/10" : "bg-accent/10"}`}>
                            {enquiry.listingType === "room" ? (
                              <Building2 className="w-5 h-5 text-primary" />
                            ) : (
                              <UtensilsCrossed className="w-5 h-5 text-accent" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className="font-medium text-foreground">{enquiry.listingTitle}</h3>
                            <p className="text-xs text-muted-foreground">
                              {new Date(enquiry.createdAt).toLocaleDateString()}
                            </p>
                          </div>
                          <Badge className={`${statusConfig[enquiry.status].className} gap-1`}>
                            <StatusIcon className="w-3 h-3" />
                            {statusConfig[enquiry.status].label}
                          </Badge>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </TabsContent>

            {/* Enquiries Tab */}
            <TabsContent value="enquiries">
              <div className="bg-card rounded-2xl shadow-soft">
                <div className="p-6 border-b border-border">
                  <h2 className="font-heading font-semibold text-lg">My Enquiries</h2>
                  <p className="text-sm text-muted-foreground">Track the status of your enquiries</p>
                </div>
                {enquiries.length === 0 ? (
                  <div className="p-8 text-center">
                    <Calendar className="w-12 h-12 mx-auto text-muted-foreground/50 mb-4" />
                    <h3 className="font-semibold text-foreground mb-2">No enquiries yet</h3>
                    <p className="text-muted-foreground mb-4">Browse rooms and mess to send your first enquiry</p>
                    <div className="flex items-center justify-center gap-3">
                      <Link to="/rooms"><Button variant="default">{t('hero.findRooms')}</Button></Link>
                      <Link to="/mess"><Button variant="outline">{t('hero.findMess')}</Button></Link>
                    </div>
                  </div>
                ) : (
                  <div className="divide-y divide-border">
                    {enquiries.map((enquiry) => {
                      const StatusIcon = statusConfig[enquiry.status].icon;
                      return (
                        <div key={enquiry.id} className="p-4 flex items-center gap-4">
                          <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${enquiry.listingType === "room" ? "bg-primary/10" : "bg-accent/10"}`}>
                            {enquiry.listingType === "room" ? (
                              <Building2 className="w-5 h-5 text-primary" />
                            ) : (
                              <UtensilsCrossed className="w-5 h-5 text-accent" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className="font-medium text-foreground">{enquiry.listingTitle}</h3>
                            <p className="text-sm text-muted-foreground line-clamp-2">My Message: {enquiry.message}</p>
                            {enquiry.ownerResponse && (
                              <div className="mt-2 p-3 bg-muted/70 rounded-lg border border-border text-xs leading-relaxed max-w-lg">
                                <p className="font-semibold text-primary mb-1">Owner Response:</p>
                                <p className="text-foreground">{enquiry.ownerResponse}</p>
                              </div>
                            )}
                            <p className="text-xs text-muted-foreground mt-1">
                              {new Date(enquiry.createdAt).toLocaleDateString()}
                            </p>
                          </div>
                          <Badge className={`${statusConfig[enquiry.status].className} gap-1`}>
                            <StatusIcon className="w-3 h-3" />
                            {statusConfig[enquiry.status].label}
                          </Badge>
                          {enquiry.status === "approved" && (
                            enquiry.listingType === "room" ? (
                              <BookingDialog
                                enquiry={enquiry}
                                monthlyRent={5000}
                                trigger={<Button size="sm">Book Now</Button>}
                                onSuccess={loadData}
                              />
                            ) : (
                              <PaymentDialog
                                listingId={enquiry.listingId}
                                listingType="mess"
                                listingTitle={enquiry.listingTitle}
                                basePrice={3000}
                                trigger={<Button size="sm">Subscribe</Button>}
                              />
                            )
                          )}
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 h-9 w-9 rounded-lg transition-colors ml-1"
                            onClick={() => handleDeleteEnquiry(enquiry.id)}
                            title="Delete Enquiry"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </TabsContent>

            {/* Bookings Tab */}
            <TabsContent value="bookings">
              <div className="bg-card rounded-2xl shadow-soft">
                <div className="p-6 border-b border-border">
                  <h2 className="font-heading font-semibold text-lg">My Bookings</h2>
                  <p className="text-sm text-muted-foreground">Your active room bookings</p>
                </div>
                {bookings.length === 0 ? (
                  <div className="p-8 text-center">
                    <Home className="w-12 h-12 mx-auto text-muted-foreground/50 mb-4" />
                    <h3 className="font-semibold text-foreground mb-2">No bookings yet</h3>
                    <p className="text-muted-foreground">Once your enquiry is approved, you can book a room here</p>
                  </div>
                ) : (
                  <div className="divide-y divide-border">
                    {bookings.map((booking) => (
                      <div key={booking.id} className="p-4 flex items-center gap-4">
                        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                          <Home className="w-5 h-5 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-medium text-foreground">{booking.listingTitle}</h3>
                          <p className="text-sm text-muted-foreground">
                            {new Date(booking.startDate).toLocaleDateString()} - {booking.endDate ? new Date(booking.endDate).toLocaleDateString() : "Ongoing"}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Amount: ₹{booking.amount.toLocaleString()}
                          </p>
                        </div>
                        <Badge className={booking.paymentStatus === "paid" ? "bg-success/10 text-success" : "bg-warning/10 text-warning"}>
                          {booking.paymentStatus === "paid" ? "Paid" : "Payment Pending"}
                        </Badge>
                        {booking.status === "confirmed" && (
                          <Button variant="outline" size="sm" onClick={() => handleCancelBooking(booking.id)}>
                            Cancel
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </TabsContent>

            {/* Subscriptions Tab */}
            <TabsContent value="subscriptions">
              <div className="bg-card rounded-2xl shadow-soft">
                <div className="p-6 border-b border-border">
                  <h2 className="font-heading font-semibold text-lg">My Subscriptions</h2>
                  <p className="text-sm text-muted-foreground">Your active mess subscriptions</p>
                </div>
                {subscriptions.length === 0 ? (
                  <div className="p-8 text-center">
                    <Coffee className="w-12 h-12 mx-auto text-muted-foreground/50 mb-4" />
                    <h3 className="font-semibold text-foreground mb-2">No subscriptions yet</h3>
                    <p className="text-muted-foreground mb-4">Subscribe to a mess for daily meals</p>
                    <Link to="/mess"><Button variant="default">{t('hero.findMess')}</Button></Link>
                  </div>
                ) : (
                  <div className="divide-y divide-border">
                    {subscriptions.map((subscription) => (
                      <div key={subscription.id} className="p-4 flex items-center gap-4">
                        <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center">
                          <UtensilsCrossed className="w-5 h-5 text-accent" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-medium text-foreground">{subscription.messTitle}</h3>
                          <p className="text-sm text-muted-foreground capitalize">
                            {subscription.planType} Plan • {subscription.mealTypes.join(", ")}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Amount Paid: ₹{subscription.amount?.toLocaleString()} • Valid until: {new Date(subscription.endDate).toLocaleDateString()}
                          </p>
                        </div>
                        <Badge className={subscription.status === "active" ? "bg-success/10 text-success" : "bg-warning/10 text-warning"}>
                          {subscription.status}
                        </Badge>
                        <div className="flex gap-2">
                          {subscription.status === "active" ? (
                            <Button variant="outline" size="icon" onClick={() => handlePauseSubscription(subscription.id)}>
                              <Pause className="w-4 h-4" />
                            </Button>
                          ) : subscription.status === "paused" && (
                            <Button variant="outline" size="icon" onClick={() => handleResumeSubscription(subscription.id)}>
                              <Play className="w-4 h-4" />
                            </Button>
                          )}
                          <Button variant="outline" size="sm" onClick={() => handleRenewSubscription(subscription.id)}>
                            Renew
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </TabsContent>

            {/* Saved Tab */}
            <TabsContent value="saved">
              <div className="bg-card rounded-2xl shadow-soft">
                <div className="p-6 border-b border-border">
                  <h2 className="font-heading font-semibold text-lg">Saved Items</h2>
                  <p className="text-sm text-muted-foreground">Your favorite rooms and mess</p>
                </div>
                <div className="p-8 text-center">
                  <Heart className="w-12 h-12 mx-auto text-muted-foreground/50 mb-4" />
                  <h3 className="font-semibold text-foreground mb-2">{savedCount} saved items</h3>
                  <p className="text-muted-foreground mb-4">Click the heart icon on any listing to save it</p>
                  <div className="flex items-center justify-center gap-3">
                    <Link to="/rooms"><Button variant="default">{t('hero.findRooms')}</Button></Link>
                    <Link to="/mess"><Button variant="outline">{t('hero.findMess')}</Button></Link>
                  </div>
                </div>
              </div>
            </TabsContent>

            {/* Settings Tab */}
            <TabsContent value="settings">
              <div className="bg-card rounded-2xl shadow-soft">
                <div className="p-6 border-b border-border">
                  <h2 className="font-heading font-semibold text-lg">Profile Settings</h2>
                  <p className="text-sm text-muted-foreground">Manage your account and profile information</p>
                </div>
                <div className="p-6 space-y-6">
                  {/* Profile Section */}
                  <div className="space-y-4">
                    <h3 className="font-medium flex items-center gap-2">
                      <User className="w-4 h-4" />
                      Personal Information
                    </h3>

                    <div className="grid md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="first_name">First Name</Label>
                        <Input
                          id="first_name"
                          value={editProfile.first_name}
                          onChange={(e) => setEditProfile({ ...editProfile, first_name: e.target.value })}
                          placeholder="Enter your first name"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="last_name">Last Name</Label>
                        <Input
                          id="last_name"
                          value={editProfile.last_name}
                          onChange={(e) => setEditProfile({ ...editProfile, last_name: e.target.value })}
                          placeholder="Enter your last name"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="phone">Phone Number</Label>
                      <div className="relative">
                        <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input
                          id="phone"
                          value={editProfile.phone}
                          onChange={(e) => setEditProfile({ ...editProfile, phone: e.target.value })}
                          placeholder="+91 98765 43210"
                          className="pl-10"
                        />
                      </div>
                    </div>

                    <Button
                      onClick={async () => {
                        setProfileLoading(true);
                        try {
                          await updateProfile(editProfile);
                          toast({
                            title: "Profile Updated",
                            description: "Your profile has been saved successfully.",
                          });
                          loadData();
                        } catch {
                          toast({
                            title: "Error",
                            description: "Failed to update profile. Please try again.",
                            variant: "destructive",
                          });
                        } finally {
                          setProfileLoading(false);
                        }
                      }}
                      disabled={profileLoading}
                      className="gap-2"
                    >
                      {profileLoading ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Save className="w-4 h-4" />
                      )}
                      Save Profile
                    </Button>
                  </div>

                  <hr />

                  {/* Account Info */}
                  <div className="space-y-4">
                    <h3 className="font-medium flex items-center gap-2">
                      <Mail className="w-4 h-4" />
                      Account Information
                    </h3>

                    <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50">
                      <div>
                        <p className="font-medium">Email Address</p>
                        <p className="text-sm text-muted-foreground">{user?.email}</p>
                      </div>
                      <Badge variant="outline">Verified</Badge>
                    </div>

                    <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50">
                      <div>
                        <p className="font-medium">Account Type</p>
                        <p className="text-sm text-muted-foreground capitalize">{user?.user_metadata?.role || "User"}</p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50">
                      <div>
                        <p className="font-medium">Member Since</p>
                        <p className="text-sm text-muted-foreground">
                          {user?.created_at ? new Date(user.created_at).toLocaleDateString() : "N/A"}
                        </p>
                      </div>
                    </div>
                  </div>

                  <hr />

                  {/* Danger Zone */}
                  <div className="space-y-4">
                    <h3 className="font-medium text-destructive">Danger Zone</h3>
                    <Button variant="destructive" onClick={handleSignOut} className="gap-2">
                      <LogOut className="w-4 h-4" />
                      Sign Out
                    </Button>
                  </div>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </main>
      </div>
    </div>
  );
};

export default UserDashboard;
