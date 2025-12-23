import { Button } from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
    Share2,
    Copy,
    MessageCircle,
    Facebook,
    Twitter,
    Link2,
    Mail,
    CheckCircle,
} from "lucide-react";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";

interface ShareButtonProps {
    title: string;
    description?: string;
    url?: string;
    price?: number;
    location?: string;
    variant?: "default" | "ghost" | "outline";
    size?: "default" | "sm" | "lg" | "icon";
}

const ShareButton = ({
    title,
    description,
    url,
    price,
    location,
    variant = "ghost",
    size = "icon",
}: ShareButtonProps) => {
    const { toast } = useToast();
    const [copied, setCopied] = useState(false);

    const shareUrl = url || window.location.href;
    const shareText = description || `Check out ${title}${location ? ` in ${location}` : ""}${price ? ` - ₹${price.toLocaleString()}/month` : ""}`;

    const encodedUrl = encodeURIComponent(shareUrl);
    const encodedText = encodeURIComponent(shareText);
    const encodedTitle = encodeURIComponent(title);

    const shareLinks = {
        whatsapp: `https://wa.me/?text=${encodedText}%0A%0A${encodedUrl}`,
        facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}&quote=${encodedText}`,
        twitter: `https://twitter.com/intent/tweet?text=${encodedText}&url=${encodedUrl}`,
        email: `mailto:?subject=${encodedTitle}&body=${encodedText}%0A%0A${encodedUrl}`,
    };

    const handleCopyLink = async () => {
        try {
            await navigator.clipboard.writeText(shareUrl);
            setCopied(true);
            toast({
                title: "Link copied!",
                description: "The link has been copied to your clipboard.",
            });
            setTimeout(() => setCopied(false), 2000);
        } catch {
            toast({
                title: "Failed to copy",
                description: "Please copy the link manually.",
                variant: "destructive",
            });
        }
    };

    const handleNativeShare = async () => {
        if (navigator.share) {
            try {
                await navigator.share({
                    title,
                    text: shareText,
                    url: shareUrl,
                });
            } catch (error) {
                // User cancelled or error
            }
        }
    };

    const handleShareClick = (platform: keyof typeof shareLinks) => {
        const link = shareLinks[platform];
        window.open(link, "_blank", "noopener,noreferrer,width=600,height=400");
    };

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant={variant} size={size}>
                    <Share2 className="w-4 h-4" />
                    {size !== "icon" && <span className="ml-2">Share</span>}
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
                {/* WhatsApp - Popular in India */}
                <DropdownMenuItem
                    onClick={() => handleShareClick("whatsapp")}
                    className="cursor-pointer"
                >
                    <MessageCircle className="w-4 h-4 mr-2 text-[#25D366]" />
                    WhatsApp
                </DropdownMenuItem>

                <DropdownMenuItem
                    onClick={() => handleShareClick("facebook")}
                    className="cursor-pointer"
                >
                    <Facebook className="w-4 h-4 mr-2 text-[#1877F2]" />
                    Facebook
                </DropdownMenuItem>

                <DropdownMenuItem
                    onClick={() => handleShareClick("twitter")}
                    className="cursor-pointer"
                >
                    <Twitter className="w-4 h-4 mr-2 text-[#1DA1F2]" />
                    Twitter
                </DropdownMenuItem>

                <DropdownMenuItem
                    onClick={() => handleShareClick("email")}
                    className="cursor-pointer"
                >
                    <Mail className="w-4 h-4 mr-2 text-gray-600" />
                    Email
                </DropdownMenuItem>

                <DropdownMenuSeparator />

                <DropdownMenuItem onClick={handleCopyLink} className="cursor-pointer">
                    {copied ? (
                        <CheckCircle className="w-4 h-4 mr-2 text-success" />
                    ) : (
                        <Copy className="w-4 h-4 mr-2" />
                    )}
                    {copied ? "Copied!" : "Copy Link"}
                </DropdownMenuItem>

                {navigator.share && (
                    <DropdownMenuItem
                        onClick={handleNativeShare}
                        className="cursor-pointer"
                    >
                        <Link2 className="w-4 h-4 mr-2" />
                        More Options
                    </DropdownMenuItem>
                )}
            </DropdownMenuContent>
        </DropdownMenu>
    );
};

export default ShareButton;
