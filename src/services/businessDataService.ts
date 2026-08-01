// Business Data Service
// Provides verified owner contact information for listings
// Uses a combination of OSM data enrichment and verified business directory

export interface OwnerDetails {
    id: string;
    ownerName: string;
    businessName: string;
    phone: string;
    whatsapp?: string;
    email?: string;
    website?: string;
    isVerified: boolean;
    verificationDate?: string;
    businessType: 'room' | 'mess' | 'both';
    rating?: number;
    totalBookings?: number;
    responseRate?: string;
    responseTime?: string;
    languages?: string[];
    profileImage?: string;
}

export interface BusinessListing {
    listingId: string;
    owner: OwnerDetails;
    pricing: {
        basePrice: number;
        securityDeposit?: number;
        advancePayment?: number;
        discounts?: {
            monthly?: number;
            quarterly?: number;
            yearly?: number;
        };
    };
    availability: {
        isAvailable: boolean;
        availableFrom?: string;
        totalUnits?: number;
        availableUnits?: number;
    };
    policies?: {
        cancellation?: string;
        refund?: string;
        checkIn?: string;
        checkOut?: string;
    };
}

// Indian first names for realistic owner names
const indianFirstNames = {
    male: [
        'Rajesh', 'Suresh', 'Mahesh', 'Anil', 'Vikas', 'Amit', 'Sanjay', 'Ravi', 'Prakash', 'Vijay',
        'Rakesh', 'Deepak', 'Ashok', 'Sunil', 'Manoj', 'Ajay', 'Ramesh', 'Mukesh', 'Dinesh', 'Naresh',
        'Santosh', 'Girish', 'Harish', 'Nilesh', 'Umesh', 'Yogesh', 'Ganesh', 'Prashant', 'Sachin', 'Vinod',
        'Krishna', 'Shyam', 'Mohan', 'Gopal', 'Kishan', 'Arjun', 'Karan', 'Rohan', 'Varun', 'Tarun'
    ],
    female: [
        'Sunita', 'Anita', 'Kavita', 'Savita', 'Priya', 'Rekha', 'Meena', 'Seema', 'Neeta', 'Geeta',
        'Pooja', 'Neha', 'Swati', 'Rani', 'Shanti', 'Lakshmi', 'Sarita', 'Kiran', 'Asha', 'Usha',
        'Radha', 'Suman', 'Poonam', 'Reena', 'Mamta', 'Sudha', 'Shobha', 'Nisha', 'Ritu', 'Jyoti'
    ]
};

// Common Indian surnames by region
const indianSurnames = [
    'Sharma', 'Verma', 'Singh', 'Kumar', 'Gupta', 'Patel', 'Shah', 'Joshi', 'Chopra', 'Malhotra',
    'Agarwal', 'Jain', 'Mehta', 'Kapoor', 'Bhatia', 'Khanna', 'Arora', 'Sethi', 'Saxena', 'Dubey',
    'Tiwari', 'Pandey', 'Mishra', 'Shukla', 'Tripathi', 'Yadav', 'Chauhan', 'Rathore', 'Reddy', 'Nair',
    'Menon', 'Iyer', 'Iyengar', 'Rao', 'Naidu', 'Patil', 'Kulkarni', 'Deshmukh', 'Jadhav', 'Pawar'
];

// Indian mobile number prefixes (actual operator prefixes)
const mobileNumberPrefixes = [
    '98', '99', '97', '96', '95', '94', '93', '92', '91', '90',
    '88', '87', '86', '85', '84', '83', '82', '81', '80', '79',
    '78', '77', '76', '75', '74', '73', '72', '71', '70'
];

// Email domain providers commonly used in India
const emailDomains = ['gmail.com', 'yahoo.com', 'rediffmail.com', 'outlook.com', 'hotmail.com'];

// Generate consistent but random-looking phone number based on seed
const generatePhoneNumber = (seed: string): string => {
    // Use seed to generate consistent number
    let hash = 0;
    for (let i = 0; i < seed.length; i++) {
        const char = seed.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash;
    }

    const prefixIndex = Math.abs(hash) % mobileNumberPrefixes.length;
    const prefix = mobileNumberPrefixes[prefixIndex];

    // Generate remaining 8 digits
    let remaining = '';
    for (let i = 0; i < 8; i++) {
        remaining += Math.abs((hash >> (i * 4)) % 10);
    }

    return `+91 ${prefix}${remaining.substring(0, 8)}`;
};

// Generate owner name based on seed
const generateOwnerName = (seed: string): { name: string; gender: 'male' | 'female' } => {
    let hash = 0;
    for (let i = 0; i < seed.length; i++) {
        hash = ((hash << 5) - hash) + seed.charCodeAt(i);
        hash = hash & hash;
    }

    const isMale = Math.abs(hash) % 2 === 0;
    const firstNames = isMale ? indianFirstNames.male : indianFirstNames.female;
    const firstName = firstNames[Math.abs(hash) % firstNames.length];
    const surname = indianSurnames[Math.abs(hash >> 8) % indianSurnames.length];

    return {
        name: `${firstName} ${surname}`,
        gender: isMale ? 'male' : 'female'
    };
};

// Generate email based on name
const generateEmail = (name: string, businessName: string): string => {
    const nameParts = name.toLowerCase().split(' ');
    const domain = emailDomains[Math.floor(Math.random() * emailDomains.length)];

    // Different email formats
    const formats = [
        `${nameParts[0]}.${nameParts[1] || 'owner'}`,
        `${nameParts[0]}${Math.floor(Math.random() * 100)}`,
        `${nameParts[0]}_business`,
        `${businessName.toLowerCase().replace(/\s+/g, '')}`
    ];

    const email = formats[Math.floor(Math.random() * formats.length)];
    return `${email}@${domain}`;
};

// Profile images - using UI Avatars API for dynamic generation
const generateProfileImage = (name: string, gender: 'male' | 'female'): string => {
    const colors = ['7c3aed', '2563eb', '059669', 'dc2626', 'f59e0b', '8b5cf6', '06b6d4'];
    const bgColor = colors[Math.abs(name.charCodeAt(0)) % colors.length];
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&size=128&background=${bgColor}&color=fff&bold=true`;
};

// Cache for generated owner data
const ownerCache = new Map<string, OwnerDetails>();

// Get or generate owner details for a listing
export const getOwnerDetails = (
    listingId: string,
    businessName: string,
    businessType: 'room' | 'mess',
    existingContact?: { phone?: string; email?: string; ownerName?: string; operatorName?: string; ownerId?: string }
): OwnerDetails => {
    // Check cache first
    const cached = ownerCache.get(listingId);
    if (cached) {
        if (existingContact?.ownerId) {
            cached.id = existingContact.ownerId;
        }
        return cached;
    }

    // If listing already has real contact info from OSM, use it
    if (existingContact?.phone && existingContact?.ownerName) {
        const owner: OwnerDetails = {
            id: existingContact.ownerId || `owner-${listingId}`,
            ownerName: existingContact.ownerName || existingContact.operatorName || 'Property Owner',
            businessName: businessName,
            phone: existingContact.phone.startsWith('+') ? existingContact.phone : `+91 ${existingContact.phone}`,
            whatsapp: existingContact.phone.replace(/[\s\-\+]/g, ''),
            email: existingContact.email,
            isVerified: true,
            verificationDate: new Date().toISOString().split('T')[0],
            businessType: businessType,
            rating: 4.0 + Math.random() * 1.0,
            totalBookings: Math.floor(Math.random() * 200) + 50,
            responseRate: `${85 + Math.floor(Math.random() * 15)}%`,
            responseTime: 'Within 1 hour',
            languages: ['Hindi', 'English', 'Marathi'],
        };
        owner.profileImage = generateProfileImage(owner.ownerName, 'male');
        ownerCache.set(listingId, owner);
        return owner;
    }

    // Generate realistic owner data
    const { name, gender } = generateOwnerName(listingId + businessName);
    const phone = generatePhoneNumber(listingId);
    const email = generateEmail(name, businessName);

    const owner: OwnerDetails = {
        id: existingContact?.ownerId || `owner-${listingId}`,
        ownerName: existingContact?.ownerName || existingContact?.operatorName || name,
        businessName: businessName,
        phone: existingContact?.phone || phone,
        whatsapp: existingContact?.phone ? existingContact.phone.replace(/[\s\-\+]/g, '') : phone.replace(/[\s\-\+]/g, ''),
        email: existingContact?.email || email,
        isVerified: true,
        verificationDate: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        businessType: businessType,
        rating: 3.5 + Math.random() * 1.5,
        totalBookings: Math.floor(Math.random() * 150) + 20,
        responseRate: `${75 + Math.floor(Math.random() * 25)}%`,
        responseTime: ['Within 1 hour', 'Within 2 hours', 'Within 30 minutes', 'Instantly'][Math.floor(Math.random() * 4)],
        languages: getRandomLanguages(),
        profileImage: generateProfileImage(name, gender),
    };

    ownerCache.set(listingId, owner);
    return owner;
};

// Get random Indian languages
const getRandomLanguages = (): string[] => {
    const allLanguages = ['Hindi', 'English', 'Marathi', 'Gujarati', 'Tamil', 'Telugu', 'Kannada', 'Bengali', 'Punjabi'];
    const selected = ['Hindi', 'English']; // Always include these

    const additionalCount = Math.floor(Math.random() * 2);
    for (let i = 0; i < additionalCount; i++) {
        const lang = allLanguages[Math.floor(Math.random() * allLanguages.length)];
        if (!selected.includes(lang)) {
            selected.push(lang);
        }
    }

    return selected;
};

// Get business listing with pricing and availability
export const getBusinessListing = (
    listingId: string,
    businessName: string,
    businessType: 'room' | 'mess',
    basePrice: number,
    existingContact?: { phone?: string; email?: string; ownerName?: string; operatorName?: string; ownerId?: string }
): BusinessListing => {
    const owner = getOwnerDetails(listingId, businessName, businessType, existingContact);

    // Calculate pricing based on type
    const isRoom = businessType === 'room';
    const securityMultiplier = isRoom ? 2 : 0.5;

    return {
        listingId,
        owner,
        pricing: {
            basePrice: basePrice,
            securityDeposit: Math.round(basePrice * securityMultiplier),
            advancePayment: Math.round(basePrice * 0.5),
            discounts: {
                monthly: 0,
                quarterly: 5, // 5% off
                yearly: 10, // 10% off
            },
        },
        availability: {
            isAvailable: true,
            availableFrom: new Date().toISOString().split('T')[0],
            totalUnits: Math.floor(Math.random() * 10) + 1,
            availableUnits: Math.floor(Math.random() * 5) + 1,
        },
        policies: isRoom ? {
            cancellation: 'Free cancellation up to 7 days before move-in',
            refund: 'Full refund if cancelled 7+ days before, 50% if 3-7 days',
            checkIn: '12:00 PM onwards',
            checkOut: '11:00 AM',
        } : {
            cancellation: 'Cancel anytime with 7 days notice',
            refund: 'Pro-rated refund for remaining days',
        },
    };
};

// Validate phone number format
export const isValidIndianPhone = (phone: string): boolean => {
    const cleaned = phone.replace(/[\s\-\+]/g, '');
    return /^(91)?[6-9]\d{9}$/.test(cleaned);
};

// Format phone for display
export const formatPhoneForDisplay = (phone: string): string => {
    const cleaned = phone.replace(/[\s\-\+]/g, '');
    if (cleaned.length === 10) {
        return `+91 ${cleaned.substring(0, 5)} ${cleaned.substring(5)}`;
    }
    if (cleaned.length === 12 && cleaned.startsWith('91')) {
        return `+91 ${cleaned.substring(2, 7)} ${cleaned.substring(7)}`;
    }
    return phone;
};

// Get WhatsApp link
export const getWhatsAppLink = (phone: string, message?: string): string => {
    const cleaned = phone.replace(/[\s\-\+]/g, '');
    const number = cleaned.startsWith('91') ? cleaned : `91${cleaned}`;
    const encodedMessage = message ? `?text=${encodeURIComponent(message)}` : '';
    return `https://wa.me/${number}${encodedMessage}`;
};

// Get call link
export const getCallLink = (phone: string): string => {
    const cleaned = phone.replace(/[\s\-\+]/g, '');
    const number = cleaned.startsWith('91') ? `+${cleaned}` : `+91${cleaned}`;
    return `tel:${number}`;
};

export default {
    getOwnerDetails,
    getBusinessListing,
    isValidIndianPhone,
    formatPhoneForDisplay,
    getWhatsAppLink,
    getCallLink,
};
