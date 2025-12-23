// Video Tour Component
// Displays video tours/short clips for rooms and mess

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Play, Video, X, Volume2, VolumeX, Maximize } from "lucide-react";

interface VideoTourProps {
    videoUrl?: string;
    thumbnailUrl?: string;
    title: string;
    trigger?: React.ReactNode;
}

const VideoTour = ({
    videoUrl,
    thumbnailUrl,
    title,
    trigger,
}: VideoTourProps) => {
    const [open, setOpen] = useState(false);
    const [isMuted, setIsMuted] = useState(true);
    const [isPlaying, setIsPlaying] = useState(false);

    // Check if video is available
    const hasVideo = videoUrl && videoUrl.length > 0;

    // Demo video for testing (replace with actual video URLs in production)
    const demoVideoUrl = "https://www.w3schools.com/html/mov_bbb.mp4";
    const actualVideoUrl = hasVideo ? videoUrl : demoVideoUrl;

    const handlePlayPause = () => {
        const video = document.getElementById("video-player") as HTMLVideoElement;
        if (video) {
            if (isPlaying) {
                video.pause();
            } else {
                video.play();
            }
            setIsPlaying(!isPlaying);
        }
    };

    const handleMuteToggle = () => {
        const video = document.getElementById("video-player") as HTMLVideoElement;
        if (video) {
            video.muted = !isMuted;
            setIsMuted(!isMuted);
        }
    };

    const handleFullscreen = () => {
        const video = document.getElementById("video-player") as HTMLVideoElement;
        if (video) {
            if (video.requestFullscreen) {
                video.requestFullscreen();
            } else if ((video as any).webkitRequestFullscreen) {
                (video as any).webkitRequestFullscreen();
            }
        }
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                {trigger || (
                    <Button variant="outline" className="gap-2">
                        <Play className="w-4 h-4" />
                        Watch Video Tour
                    </Button>
                )}
            </DialogTrigger>
            <DialogContent className="sm:max-w-3xl p-0 overflow-hidden">
                <DialogHeader className="p-4 pb-0">
                    <DialogTitle className="flex items-center gap-2">
                        <Video className="w-5 h-5 text-primary" />
                        Video Tour
                    </DialogTitle>
                    <DialogDescription>{title}</DialogDescription>
                </DialogHeader>

                <div className="relative bg-black aspect-video">
                    {hasVideo || true ? ( // Always show video for demo
                        <>
                            <video
                                id="video-player"
                                src={actualVideoUrl}
                                poster={thumbnailUrl}
                                className="w-full h-full object-contain"
                                muted={isMuted}
                                playsInline
                                onPlay={() => setIsPlaying(true)}
                                onPause={() => setIsPlaying(false)}
                                onClick={handlePlayPause}
                            />

                            {/* Play/Pause overlay */}
                            {!isPlaying && (
                                <div
                                    className="absolute inset-0 flex items-center justify-center cursor-pointer bg-black/30"
                                    onClick={handlePlayPause}
                                >
                                    <div className="w-16 h-16 rounded-full bg-primary/90 flex items-center justify-center shadow-xl">
                                        <Play className="w-8 h-8 text-primary-foreground ml-1" />
                                    </div>
                                </div>
                            )}

                            {/* Controls */}
                            <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/80 to-transparent">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="text-white hover:bg-white/20"
                                            onClick={handlePlayPause}
                                        >
                                            {isPlaying ? (
                                                <div className="w-4 h-4 flex gap-1">
                                                    <div className="w-1 h-4 bg-white rounded" />
                                                    <div className="w-1 h-4 bg-white rounded" />
                                                </div>
                                            ) : (
                                                <Play className="w-4 h-4" />
                                            )}
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="text-white hover:bg-white/20"
                                            onClick={handleMuteToggle}
                                        >
                                            {isMuted ? (
                                                <VolumeX className="w-4 h-4" />
                                            ) : (
                                                <Volume2 className="w-4 h-4" />
                                            )}
                                        </Button>
                                    </div>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="text-white hover:bg-white/20"
                                        onClick={handleFullscreen}
                                    >
                                        <Maximize className="w-4 h-4" />
                                    </Button>
                                </div>
                            </div>
                        </>
                    ) : (
                        <div className="absolute inset-0 flex flex-col items-center justify-center text-white/70">
                            <Video className="w-16 h-16 mb-4 opacity-50" />
                            <p className="text-lg">No video tour available</p>
                            <p className="text-sm mt-2">
                                Contact the owner for a video walkthrough
                            </p>
                        </div>
                    )}
                </div>

                <div className="p-4 pt-2">
                    <p className="text-sm text-muted-foreground text-center">
                        📹 Request a live video call tour from the owner for a personalized walkthrough
                    </p>
                </div>
            </DialogContent>
        </Dialog>
    );
};

// Preview component for cards
export const VideoTourBadge = ({
    hasVideo,
    onClick,
}: {
    hasVideo: boolean;
    onClick?: () => void;
}) => {
    if (!hasVideo) return null;

    return (
        <button
            onClick={onClick}
            className="absolute bottom-3 left-3 flex items-center gap-1 px-2 py-1 bg-black/70 backdrop-blur-sm text-white rounded-lg text-xs hover:bg-black/80 transition-colors"
        >
            <Video className="w-3 h-3" />
            <span>Video Tour</span>
        </button>
    );
};

export default VideoTour;
