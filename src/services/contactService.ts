// Contact Service - Production-ready contact and inquiry handling
// Provides WhatsApp, SMS, Phone, and Email contact functionality

export interface ContactInfo {
    phone?: string;
    whatsapp?: string;
    email?: string;
    website?: string;
    ownerName?: string;
    operatorName?: string;
    hasContact: boolean;
}

export interface InquiryData {
    listingId: string;
    listingName: string;
    listingType: 'room' | 'mess';
    userName: string;
    userPhone: string;
    userEmail?: string;
    message: string;
    inquiryType: 'booking' | 'subscription' | 'visit' | 'general';
    preferredDate?: string;
    // For rooms
    moveInDate?: string;
    stayDuration?: string;
    // For mess
    mealPlan?: 'breakfast' | 'lunch' | 'dinner' | 'all';
    subscriptionDuration?: string;
}

// Format phone number for India (+91)
export const formatPhoneNumber = (phone: string): string => {
    if (!phone) return '';

    // Remove all non-digit characters
    let cleaned = phone.replace(/\D/g, '');

    // Handle various formats
    if (cleaned.startsWith('91') && cleaned.length === 12) {
        return `+${cleaned}`;
    } else if (cleaned.startsWith('0') && cleaned.length === 11) {
        return `+91${cleaned.slice(1)}`;
    } else if (cleaned.length === 10) {
        return `+91${cleaned}`;
    }

    // Return as-is if already formatted or unknown format
    return phone.startsWith('+') ? phone : `+${cleaned}`;
};

// Generate WhatsApp deep link with pre-filled message
export const generateWhatsAppLink = (
    phone: string,
    message: string
): string => {
    const formattedPhone = formatPhoneNumber(phone).replace(/\+/g, '');
    const encodedMessage = encodeURIComponent(message);
    return `https://wa.me/${formattedPhone}?text=${encodedMessage}`;
};

// Generate SMS link with pre-filled message
export const generateSMSLink = (
    phone: string,
    message: string
): string => {
    const formattedPhone = formatPhoneNumber(phone);
    const encodedMessage = encodeURIComponent(message);
    // Use sms: protocol - works on mobile and some desktops
    return `sms:${formattedPhone}?body=${encodedMessage}`;
};

// Generate phone call link
export const generateCallLink = (phone: string): string => {
    const formattedPhone = formatPhoneNumber(phone);
    return `tel:${formattedPhone}`;
};

// Generate email link with subject and body
export const generateEmailLink = (
    email: string,
    subject: string,
    body: string
): string => {
    const encodedSubject = encodeURIComponent(subject);
    const encodedBody = encodeURIComponent(body);
    return `mailto:${email}?subject=${encodedSubject}&body=${encodedBody}`;
};

// Extract contact info from OSM tags
export const extractContactFromOSMTags = (tags: Record<string, any> | undefined): ContactInfo => {
    if (!tags) {
        return { hasContact: false };
    }

    const phone = tags.phone || tags['contact:phone'] || tags['phone:mobile'] || tags['contact:mobile'];
    const whatsapp = tags['contact:whatsapp'] || tags.whatsapp || phone; // Fallback to phone
    const email = tags.email || tags['contact:email'];
    const website = tags.website || tags['contact:website'] || tags.url;
    const ownerName = tags.operator || tags['operator:name'] || tags.owner || tags['contact:name'];
    const operatorName = tags.operator || tags['operator:name'] || tags.brand;

    const hasContact = !!(phone || email || website);

    return {
        phone,
        whatsapp: whatsapp || phone, // Use phone as WhatsApp fallback
        email,
        website,
        ownerName,
        operatorName,
        hasContact,
    };
};

// Generate booking inquiry message for rooms
export const generateRoomInquiryMessage = (data: InquiryData): string => {
    const lines = [
        `🏠 *Room Booking Inquiry*`,
        ``,
        `Hi, I'm interested in booking this room.`,
        ``,
        `*Property:* ${data.listingName}`,
        `*Inquiry Type:* ${data.inquiryType === 'booking' ? 'Room Booking' : data.inquiryType === 'visit' ? 'Schedule Visit' : 'General Inquiry'}`,
        ``,
        `*My Details:*`,
        `Name: ${data.userName}`,
        `Phone: ${data.userPhone}`,
        data.userEmail ? `Email: ${data.userEmail}` : '',
        ``,
        data.moveInDate ? `*Preferred Move-in:* ${data.moveInDate}` : '',
        data.stayDuration ? `*Stay Duration:* ${data.stayDuration}` : '',
        ``,
        data.message ? `*Message:* ${data.message}` : '',
        ``,
        `Sent via RoomAndMess App`,
    ].filter(Boolean);

    return lines.join('\n');
};

// Generate subscription inquiry message for mess
export const generateMessInquiryMessage = (data: InquiryData): string => {
    const mealPlanText = data.mealPlan === 'all' ? 'All Meals (Breakfast + Lunch + Dinner)' :
        data.mealPlan === 'breakfast' ? 'Breakfast Only' :
            data.mealPlan === 'lunch' ? 'Lunch Only' :
                data.mealPlan === 'dinner' ? 'Dinner Only' : 'All Meals';

    const lines = [
        `🍽️ *Mess Subscription Inquiry*`,
        ``,
        `Hi, I'm interested in subscribing to your mess service.`,
        ``,
        `*Mess:* ${data.listingName}`,
        ``,
        `*My Details:*`,
        `Name: ${data.userName}`,
        `Phone: ${data.userPhone}`,
        data.userEmail ? `Email: ${data.userEmail}` : '',
        ``,
        `*Meal Plan:* ${mealPlanText}`,
        data.subscriptionDuration ? `*Duration:* ${data.subscriptionDuration}` : '',
        data.preferredDate ? `*Start Date:* ${data.preferredDate}` : '',
        ``,
        data.message ? `*Additional Notes:* ${data.message}` : '',
        ``,
        `Sent via RoomAndMess App`,
    ].filter(Boolean);

    return lines.join('\n');
};

// Open WhatsApp with inquiry
export const sendWhatsAppInquiry = (phone: string, data: InquiryData): void => {
    const message = data.listingType === 'room'
        ? generateRoomInquiryMessage(data)
        : generateMessInquiryMessage(data);

    const link = generateWhatsAppLink(phone, message);
    window.open(link, '_blank');
};

// Open SMS with inquiry
export const sendSMSInquiry = (phone: string, data: InquiryData): void => {
    let shortMessage = '';

    if (data.listingType === 'room') {
        shortMessage = `Hi, I'm ${data.userName} (${data.userPhone}). I'm interested in booking "${data.listingName}". ${data.moveInDate ? `Move-in: ${data.moveInDate}. ` : ''}${data.message || 'Please contact me.'}`;
    } else {
        shortMessage = `Hi, I'm ${data.userName} (${data.userPhone}). I want to subscribe to "${data.listingName}". ${data.mealPlan ? `Plan: ${data.mealPlan}. ` : ''}${data.message || 'Please contact me.'}`;
    }

    const link = generateSMSLink(phone, shortMessage);
    window.open(link, '_blank');
};

// Make phone call
export const makePhoneCall = (phone: string): void => {
    const link = generateCallLink(phone);
    window.open(link, '_blank');
};

// Send email inquiry
export const sendEmailInquiry = (email: string, data: InquiryData): void => {
    const subject = data.listingType === 'room'
        ? `Room Booking Inquiry - ${data.listingName}`
        : `Mess Subscription Inquiry - ${data.listingName}`;

    const body = data.listingType === 'room'
        ? generateRoomInquiryMessage(data).replace(/\*/g, '')
        : generateMessInquiryMessage(data).replace(/\*/g, '');

    const link = generateEmailLink(email, subject, body);
    window.open(link, '_blank');
};

// Store inquiry locally for tracking
export const storeInquiry = (inquiry: InquiryData): void => {
    try {
        const stored = localStorage.getItem('user_inquiries');
        const inquiries: InquiryData[] = stored ? JSON.parse(stored) : [];
        inquiries.push({
            ...inquiry,
            preferredDate: new Date().toISOString(),
        });
        localStorage.setItem('user_inquiries', JSON.stringify(inquiries));
    } catch (error) {
        console.error('Error storing inquiry:', error);
    }
};

// Get user's past inquiries
export const getStoredInquiries = (): InquiryData[] => {
    try {
        const stored = localStorage.getItem('user_inquiries');
        return stored ? JSON.parse(stored) : [];
    } catch {
        return [];
    }
};

// Validate phone number (basic validation)
export const isValidPhoneNumber = (phone: string): boolean => {
    const cleaned = phone.replace(/\D/g, '');
    return cleaned.length >= 10 && cleaned.length <= 15;
};

// Validate email
export const isValidEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
};
