// AI Smart Search Service
// Uses Gemini AI to understand natural language queries and convert them to search parameters

import logger from '@/lib/logger';

export interface SmartSearchResult {
    type: 'room' | 'mess' | 'both';
    location?: string;
    priceRange?: { min: number; max: number };
    roomType?: string[];
    foodType?: 'veg' | 'non-veg' | 'both';
    facilities?: string[];
    keywords: string[];
    understood: string;
}

const SEARCH_PROMPT = `You are a search query parser for a Room & Mess Finder app in India. Parse the user's natural language query and extract search parameters.

Return a JSON object with these fields:
- type: "room", "mess", or "both"
- location: city/area name if mentioned
- priceRange: { min: number, max: number } if budget mentioned (in INR)
- roomType: array of ["Single", "Double", "Shared", "PG", "Hostel", "Hotel"] if mentioned
- foodType: "veg", "non-veg", or "both" if mentioned
- facilities: array of facilities like ["WiFi", "AC", "Parking", "Security"]
- keywords: important keywords from the query
- understood: a brief summary of what the user is looking for

Examples:
- "cheap PG near Koramangala under 6000" → type: room, location: Koramangala, priceRange: {min:0, max:6000}, roomType: ["PG"]
- "veg mess in Pune" → type: mess, location: Pune, foodType: veg
- "room with AC and WiFi" → type: room, facilities: ["AC", "WiFi"]

User query: `;

export const parseSmartSearch = async (query: string): Promise<SmartSearchResult> => {
    const apiKey = import.meta.env.VITE_GEMINI_API_KEY;

    // Default fallback result
    const defaultResult: SmartSearchResult = {
        type: 'both',
        keywords: query.toLowerCase().split(' ').filter(w => w.length > 2),
        understood: query,
    };

    if (!apiKey || !query.trim()) {
        return parseQueryLocally(query);
    }

    try {
        const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${apiKey}`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{ role: 'user', parts: [{ text: SEARCH_PROMPT + query }] }],
                    generationConfig: { temperature: 0.1, maxOutputTokens: 500 },
                }),
            }
        );

        if (!response.ok) {
            logger.warn('Smart search API failed', { context: 'SmartSearch' });
            return parseQueryLocally(query);
        }

        const data = await response.json();
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';

        // Extract JSON from the response
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
            const parsed = JSON.parse(jsonMatch[0]);
            logger.debug('Smart search parsed', { context: 'SmartSearch', data: parsed });
            return { ...defaultResult, ...parsed };
        }
    } catch (error) {
        logger.error('Smart search error', error, { context: 'SmartSearch' });
    }

    return parseQueryLocally(query);
};

// Local fallback parser when API is not available
const parseQueryLocally = (query: string): SmartSearchResult => {
    const lowerQuery = query.toLowerCase();

    const result: SmartSearchResult = {
        type: 'both',
        keywords: [],
        understood: query,
    };

    // Detect type
    if (lowerQuery.includes('mess') || lowerQuery.includes('food') || lowerQuery.includes('tiffin') || lowerQuery.includes('meal')) {
        result.type = 'mess';
    } else if (lowerQuery.includes('room') || lowerQuery.includes('pg') || lowerQuery.includes('hostel') || lowerQuery.includes('flat')) {
        result.type = 'room';
    }

    // Detect food type
    if (lowerQuery.includes('veg') && !lowerQuery.includes('non-veg')) {
        result.foodType = 'veg';
    } else if (lowerQuery.includes('non-veg') || lowerQuery.includes('nonveg')) {
        result.foodType = 'non-veg';
    }

    // Detect room types
    const roomTypes: string[] = [];
    if (lowerQuery.includes('single')) roomTypes.push('Single');
    if (lowerQuery.includes('double')) roomTypes.push('Double');
    if (lowerQuery.includes('shared')) roomTypes.push('Shared');
    if (lowerQuery.includes('pg') || lowerQuery.includes('paying guest')) roomTypes.push('PG');
    if (lowerQuery.includes('hostel')) roomTypes.push('Hostel');
    if (roomTypes.length > 0) result.roomType = roomTypes;

    // Detect facilities
    const facilities: string[] = [];
    if (lowerQuery.includes('wifi') || lowerQuery.includes('internet')) facilities.push('WiFi');
    if (lowerQuery.includes('ac') || lowerQuery.includes('air condition')) facilities.push('AC');
    if (lowerQuery.includes('parking')) facilities.push('Parking');
    if (lowerQuery.includes('security') || lowerQuery.includes('safe')) facilities.push('Security');
    if (facilities.length > 0) result.facilities = facilities;

    // Detect price range
    const priceMatch = query.match(/(\d{1,2})[,\s]?(\d{3})/g) || query.match(/(\d+)k/gi);
    if (priceMatch) {
        const prices = priceMatch.map(p => {
            if (p.toLowerCase().includes('k')) {
                return parseInt(p) * 1000;
            }
            return parseInt(p.replace(/[,\s]/g, ''));
        });
        if (prices.length === 1) {
            if (lowerQuery.includes('under') || lowerQuery.includes('below') || lowerQuery.includes('max')) {
                result.priceRange = { min: 0, max: prices[0] };
            } else {
                result.priceRange = { min: 0, max: prices[0] };
            }
        } else if (prices.length >= 2) {
            result.priceRange = { min: Math.min(...prices), max: Math.max(...prices) };
        }
    }

    // Extract keywords
    const keywords = query.split(/\s+/)
        .filter(word => word.length > 2)
        .filter(word => !['the', 'and', 'for', 'with', 'near', 'under', 'below', 'above'].includes(word.toLowerCase()));
    result.keywords = keywords;

    // Create understood text
    const parts: string[] = [];
    if (result.type !== 'both') parts.push(result.type === 'room' ? 'Room' : 'Mess');
    if (result.roomType?.length) parts.push(result.roomType.join('/'));
    if (result.foodType) parts.push(`${result.foodType} food`);
    if (result.priceRange) parts.push(`under ₹${result.priceRange.max.toLocaleString()}`);
    if (result.facilities?.length) parts.push(`with ${result.facilities.join(', ')}`);

    result.understood = parts.length > 0 ? `Looking for: ${parts.join(', ')}` : query;

    return result;
};

export default parseSmartSearch;
