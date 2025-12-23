import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Phone, Mail, User, Send, Loader2, CheckCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { createEnquiry } from "@/services/bookingService";
import { useLanguage } from "@/contexts/LanguageContext";

interface EnquiryDialogProps {
  listingId: string;
  listingType: "room" | "mess";
  listingTitle: string;
  ownerId: string;
  trigger?: React.ReactNode;
}

const EnquiryDialog = ({ listingId, listingType, listingTitle, ownerId, trigger }: EnquiryDialogProps) => {
  const { user, session } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    message: "",
  });

  const handleChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user || !session) {
      toast({
        title: "Login Required",
        description: "Please login to send an enquiry",
        variant: "destructive",
      });
      navigate("/auth");
      return;
    }

    if (!formData.name || !formData.email || !formData.message) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      const result = await createEnquiry({
        userId: user.id,
        listingId,
        listingType,
        listingTitle,
        ownerId,
        userName: formData.name,
        userEmail: formData.email,
        userPhone: formData.phone || undefined,
        message: formData.message,
      });

      if (result.success) {
        setSuccess(true);
        toast({
          title: "Enquiry Sent! 📩",
          description: "The owner will review your request and get back to you soon.",
        });

        setTimeout(() => {
          setOpen(false);
          setSuccess(false);
          setFormData({ name: "", email: "", phone: "", message: "" });
        }, 2000);
      } else {
        throw new Error(result.error);
      }
    } catch (error: any) {
      console.error("Error sending enquiry:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to send enquiry. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleOpen = () => {
    if (!user) {
      toast({
        title: "Login Required",
        description: "Please login to send an enquiry",
        variant: "destructive",
      });
      navigate("/auth");
      return;
    }
    // Pre-fill email if user is logged in
    if (user.email) {
      setFormData(prev => ({
        ...prev,
        email: user.email || "",
        name: user.user_metadata?.first_name || ""
      }));
    }
    setOpen(true);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild onClick={(e) => { e.preventDefault(); handleOpen(); }}>
        {trigger || <Button>{t('card.sendEnquiry')}</Button>}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        {success ? (
          <div className="flex flex-col items-center justify-center py-8">
            <div className="w-16 h-16 rounded-full bg-success/10 flex items-center justify-center mb-4">
              <CheckCircle className="w-8 h-8 text-success" />
            </div>
            <h3 className="font-heading font-semibold text-xl text-foreground">Enquiry Sent!</h3>
            <p className="text-muted-foreground mt-2 text-center">
              The owner will review your request and get back to you soon.
            </p>
          </div>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle className="font-heading text-xl">{t('card.sendEnquiry')}</DialogTitle>
              <DialogDescription>
                Interested in <span className="font-semibold text-foreground">{listingTitle}</span>? Send your details and the owner will contact you.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label htmlFor="name">Full Name *</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => handleChange("name", e.target.value)}
                    placeholder="Enter your full name"
                    className="pl-10"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email Address *</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => handleChange("email", e.target.value)}
                    placeholder="your@email.com"
                    className="pl-10"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">Phone Number</Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="phone"
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => handleChange("phone", e.target.value)}
                    placeholder="+91 98765 43210"
                    className="pl-10"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="message">Message *</Label>
                <Textarea
                  id="message"
                  value={formData.message}
                  onChange={(e) => handleChange("message", e.target.value)}
                  placeholder="Tell the owner about yourself and when you'd like to move in..."
                  rows={4}
                  required
                />
              </div>

              <Button type="submit" className="w-full gap-2" disabled={loading}>
                {loading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    {t('card.sendEnquiry')}
                  </>
                )}
              </Button>
            </form>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default EnquiryDialog;
