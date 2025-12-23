import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    MessageCircle,
    X,
    Send,
    Bot,
    User,
    Loader2,
    Sparkles,
    Building2,
    UtensilsCrossed,
    MapPin,
    HelpCircle,
    Minimize2
} from "lucide-react";

interface Message {
    id: string;
    role: "user" | "assistant";
    content: string;
    timestamp: Date;
}

// System prompt to train the AI on Room and Mess app context
const SYSTEM_PROMPT = `You are "RoomMate AI" - the intelligent assistant for the Room & Mess Finder web application. You are helpful, friendly, and knowledgeable about finding accommodation and mess services for students and working professionals.

**About the App:**
- Room & Mess Finder helps users find verified rooms and mess (food/tiffin) services near their location
- Users can browse, search, and filter rooms by location, price, room type (Single, Double, Shared, PG, Hostel, Apartment)
- Users can find mess services filtered by food type (Veg, Non-Veg, Both), price, and timings
- All listings show facilities, images, ratings, reviews, and distance from user's location
- Listings are verified by admins for safety

**User Roles:**
1. **User** - Can browse listings, apply for rooms/mess, write reviews
2. **Owner** - Can add and manage their own room/mess listings
3. **Admin** - Full access to verify, edit, or delete any listing

**Key Features:**
- Location-based search with geolocation support
- Filter by price range, room type, facilities (WiFi, AC, Parking, etc.)
- Verified listings with badges
- Star ratings and reviews from real users
- Direct contact with owners
- Owner Dashboard to manage listings
- Admin Dashboard for moderation

**Common User Questions:**
- How to find a room near a location
- How to apply for a room or mess
- How to list my property
- What facilities are available
- How verification works
- Price ranges and budgets
- Safety and trust features

**Guidelines:**
- Be concise but helpful
- Use emojis sparingly for friendliness 🏠 🍽️
- If asked about specific listings, guide them to use the search/filter features
- For technical issues, suggest contacting support
- Never share personal data or make up information
- Guide users to the appropriate sections of the app
- Be encouraging and helpful for first-time users

Remember: You are here to help users find their perfect room or mess service!`;

// Quick suggestion buttons
const QUICK_SUGGESTIONS = [
    { icon: Building2, text: "How to find a room?", query: "How can I find a room near my college?" },
    { icon: UtensilsCrossed, text: "Find mess services", query: "How do I find mess or tiffin services?" },
    { icon: MapPin, text: "List my property", query: "How can I list my room or mess on this app?" },
    { icon: HelpCircle, text: "How it works", query: "How does Room & Mess Finder work?" },
];

const ChatBot = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [isMinimized, setIsMinimized] = useState(false);
    const [messages, setMessages] = useState<Message[]>([
        {
            id: "welcome",
            role: "assistant",
            content: "Hello! 👋 I'm **RoomMate AI**, your smart assistant for finding rooms and mess services. How can I help you today?",
            timestamp: new Date(),
        }
    ]);
    const [input, setInput] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    // Scroll to bottom when messages change
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    // Focus input when chat opens
    useEffect(() => {
        if (isOpen && !isMinimized) {
            inputRef.current?.focus();
        }
    }, [isOpen, isMinimized]);

    // Generate response using Gemini API
    const generateResponse = async (userMessage: string): Promise<string> => {
        const apiKey = import.meta.env.VITE_GEMINI_API_KEY;

        if (!apiKey) {
            // Fallback responses when API key is not available
            return getFallbackResponse(userMessage);
        }

        // Try multiple model names for compatibility
        const models = [
            "gemini-pro",
            "gemini-1.0-pro",
            "gemini-1.5-flash-latest",
        ];

        for (const model of models) {
            try {
                const response = await fetch(
                    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
                    {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json",
                        },
                        body: JSON.stringify({
                            contents: [
                                {
                                    role: "user",
                                    parts: [{ text: SYSTEM_PROMPT + "\n\nUser message: " + userMessage }]
                                }
                            ],
                            generationConfig: {
                                temperature: 0.7,
                                topK: 40,
                                topP: 0.95,
                                maxOutputTokens: 500,
                            },
                        }),
                    }
                );

                if (!response.ok) {
                    console.log(`Model ${model} failed, trying next...`);
                    continue;
                }

                const data = await response.json();

                if (data.candidates && data.candidates[0]?.content?.parts?.[0]?.text) {
                    return data.candidates[0].content.parts[0].text;
                }
            } catch (error) {
                console.error(`Gemini API error with model ${model}:`, error);
                continue;
            }
        }

        // If all models fail, use fallback
        return getFallbackResponse(userMessage);
    };

    // Intelligent fallback responses
    const getFallbackResponse = (query: string): string => {
        const lowerQuery = query.toLowerCase();

        if (lowerQuery.includes("room") && (lowerQuery.includes("find") || lowerQuery.includes("search"))) {
            return "🏠 **Finding a Room is Easy!**\n\n1. Go to the **Rooms** page from the navigation\n2. Use the **location search** to enter your preferred area\n3. Apply **filters** for price, room type, and facilities\n4. Browse listings sorted by distance from your location\n5. Click on any room to see full details and contact the owner\n\nTip: Enable location access for better nearby results!";
        }

        if (lowerQuery.includes("mess") || lowerQuery.includes("food") || lowerQuery.includes("tiffin")) {
            return "🍽️ **Finding Mess Services:**\n\n1. Navigate to the **Mess** page\n2. Filter by food type: **Veg, Non-Veg, or Both**\n3. Set your **budget** using the price filter\n4. Check **timings** and **menu highlights**\n5. Read reviews from other users\n\nAll verified mess services ensure quality food!";
        }

        if (lowerQuery.includes("list") || lowerQuery.includes("owner") || lowerQuery.includes("add")) {
            return "📝 **List Your Property:**\n\n1. **Sign up/Login** to your account\n2. Go to **Owner Dashboard** from your profile menu\n3. Click **Add Room** or **Add Mess** tab\n4. Fill in all details: title, description, photos, price, facilities\n5. Submit for verification\n\nOnce verified by admin, your listing goes live! It's completely **FREE** to list.";
        }

        if (lowerQuery.includes("how") && lowerQuery.includes("work")) {
            return "✨ **How Room & Mess Finder Works:**\n\n🔍 **Search** - Find rooms and mess near your location\n📍 **Filter** - Narrow down by price, type, and facilities\n✅ **Verified** - All listings are verified for safety\n⭐ **Reviews** - Read real user experiences\n📞 **Connect** - Contact owners directly\n\nWhether you're a student or working professional, we help you find the perfect accommodation!";
        }

        if (lowerQuery.includes("price") || lowerQuery.includes("cost") || lowerQuery.includes("budget")) {
            return "💰 **Pricing Information:**\n\n**Rooms typically range from:**\n- Single Room: ₹3,000 - ₹8,000/month\n- Double Room: ₹5,000 - ₹12,000/month\n- Shared/PG: ₹2,500 - ₹6,000/month\n\n**Mess services:**\n- Monthly plans: ₹2,000 - ₹4,000/month\n\nUse our **price filter** to find options within your budget!";
        }

        if (lowerQuery.includes("verify") || lowerQuery.includes("safe") || lowerQuery.includes("trust")) {
            return "🛡️ **Verification & Safety:**\n\n✅ All listings are **manually verified** by our admin team\n✅ Verified listings show a **green badge**\n✅ Real **photos** and accurate **information**\n✅ User **ratings and reviews** for transparency\n✅ Direct **owner contact** for any queries\n\nYour safety is our priority!";
        }

        if (lowerQuery.includes("contact") || lowerQuery.includes("support") || lowerQuery.includes("help")) {
            return "📧 **Need More Help?**\n\nFor any assistance:\n- Browse our listings at **Rooms** or **Mess** pages\n- Check the **FAQ** section\n- Use filters to narrow your search\n- Read reviews before deciding\n\nI'm here to answer your questions about using the app!";
        }

        // Default response
        return "I'm here to help you find the perfect room or mess! 🏠🍽️\n\nYou can ask me about:\n- **Finding rooms** near your location\n- **Mess/tiffin services** in your area\n- **Listing your property** as an owner\n- **How the app works**\n- **Pricing and budgets**\n\nWhat would you like to know?";
    };

    const handleSend = async () => {
        if (!input.trim() || isLoading) return;

        const userMessage: Message = {
            id: Date.now().toString(),
            role: "user",
            content: input.trim(),
            timestamp: new Date(),
        };

        setMessages(prev => [...prev, userMessage]);
        setInput("");
        setIsLoading(true);

        try {
            const response = await generateResponse(userMessage.content);

            const assistantMessage: Message = {
                id: (Date.now() + 1).toString(),
                role: "assistant",
                content: response,
                timestamp: new Date(),
            };

            setMessages(prev => [...prev, assistantMessage]);
        } catch (error) {
            console.error("Error generating response:", error);
            const errorMessage: Message = {
                id: (Date.now() + 1).toString(),
                role: "assistant",
                content: "I apologize, but I'm having trouble responding right now. Please try again in a moment.",
                timestamp: new Date(),
            };
            setMessages(prev => [...prev, errorMessage]);
        } finally {
            setIsLoading(false);
        }
    };

    const handleQuickSuggestion = (query: string) => {
        setInput(query);
        setTimeout(() => handleSend(), 100);
    };

    const handleKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    // Format message content with markdown-like styling
    const formatMessage = (content: string) => {
        return content
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/\n/g, '<br/>');
    };

    return (
        <>
            {/* Chat Button */}
            {!isOpen && (
                <button
                    onClick={() => setIsOpen(true)}
                    className="fixed bottom-6 right-6 z-50 group"
                >
                    <div className="relative">
                        {/* Glow effect */}
                        <div className="absolute inset-0 bg-gradient-to-r from-primary to-accent rounded-full blur-lg opacity-50 group-hover:opacity-75 transition-opacity animate-pulse" />

                        {/* Button */}
                        <div className="relative w-16 h-16 bg-gradient-to-r from-primary to-accent rounded-full shadow-lg flex items-center justify-center transform group-hover:scale-110 transition-transform">
                            <MessageCircle className="w-7 h-7 text-white" />
                        </div>

                        {/* Badge */}
                        <div className="absolute -top-1 -right-1 w-5 h-5 bg-success rounded-full flex items-center justify-center">
                            <Sparkles className="w-3 h-3 text-white" />
                        </div>
                    </div>

                    {/* Tooltip */}
                    <div className="absolute bottom-full right-0 mb-2 px-3 py-1.5 bg-foreground text-background text-sm rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                        Chat with RoomMate AI
                    </div>
                </button>
            )}

            {/* Chat Window */}
            {isOpen && (
                <div
                    className={`fixed bottom-6 right-6 z-50 bg-card rounded-2xl shadow-2xl border border-border overflow-hidden transition-all duration-300 ${isMinimized ? "w-80 h-16" : "w-96 h-[600px] max-h-[80vh]"
                        }`}
                >
                    {/* Header */}
                    <div className="bg-gradient-to-r from-primary to-accent p-4 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm">
                                <Bot className="w-5 h-5 text-white" />
                            </div>
                            <div className="text-white">
                                <h3 className="font-semibold text-sm">RoomMate AI</h3>
                                <p className="text-xs text-white/80 flex items-center gap-1">
                                    <span className="w-2 h-2 bg-success rounded-full animate-pulse" />
                                    Powered by Gemini
                                </p>
                            </div>
                        </div>
                        <div className="flex items-center gap-1">
                            <Button
                                variant="ghost"
                                size="icon"
                                className="text-white/80 hover:text-white hover:bg-white/20 h-8 w-8"
                                onClick={() => setIsMinimized(!isMinimized)}
                            >
                                <Minimize2 className="w-4 h-4" />
                            </Button>
                            <Button
                                variant="ghost"
                                size="icon"
                                className="text-white/80 hover:text-white hover:bg-white/20 h-8 w-8"
                                onClick={() => setIsOpen(false)}
                            >
                                <X className="w-4 h-4" />
                            </Button>
                        </div>
                    </div>

                    {!isMinimized && (
                        <>
                            {/* Messages */}
                            <div className="flex-1 overflow-y-auto p-4 h-[calc(100%-180px)] bg-muted/30">
                                {messages.map((msg) => (
                                    <div
                                        key={msg.id}
                                        className={`mb-4 flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                                    >
                                        <div className={`flex items-start gap-2 max-w-[85%] ${msg.role === "user" ? "flex-row-reverse" : ""}`}>
                                            <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${msg.role === "user"
                                                ? "bg-primary text-primary-foreground"
                                                : "bg-gradient-to-br from-primary/20 to-accent/20"
                                                }`}>
                                                {msg.role === "user" ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4 text-primary" />}
                                            </div>
                                            <div className={`rounded-2xl px-4 py-2.5 ${msg.role === "user"
                                                ? "bg-primary text-primary-foreground rounded-tr-sm"
                                                : "bg-card border border-border rounded-tl-sm shadow-sm"
                                                }`}>
                                                <p
                                                    className="text-sm leading-relaxed"
                                                    dangerouslySetInnerHTML={{ __html: formatMessage(msg.content) }}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                ))}

                                {isLoading && (
                                    <div className="flex justify-start mb-4">
                                        <div className="flex items-start gap-2">
                                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center">
                                                <Bot className="w-4 h-4 text-primary" />
                                            </div>
                                            <div className="bg-card border border-border rounded-2xl rounded-tl-sm px-4 py-3 shadow-sm">
                                                <div className="flex items-center gap-1">
                                                    <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                                                    <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                                                    <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                <div ref={messagesEndRef} />
                            </div>

                            {/* Quick Suggestions */}
                            {messages.length <= 2 && (
                                <div className="px-4 py-2 border-t border-border bg-card/50">
                                    <p className="text-xs text-muted-foreground mb-2">Quick questions:</p>
                                    <div className="flex flex-wrap gap-2">
                                        {QUICK_SUGGESTIONS.map((suggestion, index) => (
                                            <button
                                                key={index}
                                                onClick={() => handleQuickSuggestion(suggestion.query)}
                                                className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-muted hover:bg-muted/80 rounded-full transition-colors"
                                            >
                                                <suggestion.icon className="w-3 h-3" />
                                                {suggestion.text}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Input */}
                            <div className="p-4 border-t border-border bg-card">
                                <div className="flex items-center gap-2">
                                    <Input
                                        ref={inputRef}
                                        value={input}
                                        onChange={(e) => setInput(e.target.value)}
                                        onKeyDown={handleKeyPress}
                                        placeholder="Ask me anything..."
                                        className="flex-1 bg-muted border-0 focus-visible:ring-1 focus-visible:ring-primary"
                                        disabled={isLoading}
                                    />
                                    <Button
                                        onClick={handleSend}
                                        disabled={!input.trim() || isLoading}
                                        size="icon"
                                        className="bg-gradient-to-r from-primary to-accent hover:opacity-90 transition-opacity"
                                    >
                                        {isLoading ? (
                                            <Loader2 className="w-4 h-4 animate-spin" />
                                        ) : (
                                            <Send className="w-4 h-4" />
                                        )}
                                    </Button>
                                </div>
                                <p className="text-[10px] text-muted-foreground text-center mt-2">
                                    RoomMate AI • Your accommodation assistant
                                </p>
                            </div>
                        </>
                    )}
                </div>
            )}
        </>
    );
};

export default ChatBot;
