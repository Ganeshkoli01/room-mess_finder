// Multi-Language Support Service (i18n)
// Supports English (en), Hindi (hi), Marathi (mr)

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export type SupportedLanguage = 'en' | 'hi' | 'mr';

export interface Translations {
    [key: string]: string;
}

// English translations (default)
const en: Translations = {
    // Navigation
    'nav.home': 'Home',
    'nav.rooms': 'Rooms',
    'nav.mess': 'Mess',
    'nav.login': 'Login',
    'nav.register': 'Register',
    'nav.dashboard': 'Dashboard',
    'nav.logout': 'Logout',
    'nav.favorites': 'Favorites',
    'nav.compare': 'Compare',

    // Hero Section
    'hero.title': 'Find Your Perfect',
    'hero.subtitle': 'Room & Mess',
    'hero.description': 'Discover verified rooms and mess facilities near your college or workplace. Safe, affordable, and hassle-free accommodation search.',
    'hero.findRooms': 'Find Rooms',
    'hero.findMess': 'Find Mess',
    'hero.trustedBy': 'Trusted by 50,000+ Students',

    // Search
    'search.placeholder': 'Search location, area, or landmark...',
    'search.voiceSearch': 'Voice Search',
    'search.smartSearch': 'Try "PG near college under 5000"',

    // Room Card
    'card.verified': 'Verified',
    'card.perMonth': '/month',
    'card.sendEnquiry': 'Send Enquiry',
    'card.addToFavorites': 'Save to Favorites',
    'card.addToCompare': 'Add to Compare',
    'card.share': 'Share',
    'card.km': 'km',

    // Filters
    'filter.price': 'Price Range',
    'filter.roomType': 'Room Type',
    'filter.foodType': 'Food Type',
    'filter.facilities': 'Facilities',
    'filter.verified': 'Verified Only',
    'filter.applyFilters': 'Apply Filters',
    'filter.clearFilters': 'Clear All',

    // Room Types
    'roomType.single': 'Single',
    'roomType.double': 'Double',
    'roomType.shared': 'Shared',
    'roomType.pg': 'PG',
    'roomType.hostel': 'Hostel',
    'roomType.apartment': 'Apartment',

    // Food Types
    'foodType.veg': 'Pure Veg',
    'foodType.nonVeg': 'Non-Veg',
    'foodType.both': 'Veg & Non-Veg',

    // Payment
    'payment.payNow': 'Pay Now',
    'payment.selectPlan': 'Select Plan',
    'payment.daily': 'Daily',
    'payment.weekly': 'Weekly',
    'payment.monthly': 'Monthly',
    'payment.secure': 'Secure Payment',
    'payment.success': 'Payment Successful!',
    'payment.failed': 'Payment Failed',
    'payment.receipt': 'Download Receipt',

    // Notifications
    'notification.title': 'Notifications',
    'notification.markAllRead': 'Mark All as Read',
    'notification.noNotifications': 'No notifications yet',
    'notification.viewAll': 'View All',

    // Auth
    'auth.email': 'Email',
    'auth.password': 'Password',
    'auth.confirmPassword': 'Confirm Password',
    'auth.firstName': 'First Name',
    'auth.lastName': 'Last Name',
    'auth.loginTitle': 'Welcome Back',
    'auth.registerTitle': 'Create Account',
    'auth.forgotPassword': 'Forgot Password?',
    'auth.orContinueWith': 'Or continue with',
    'auth.google': 'Google',

    // Common
    'common.loading': 'Loading...',
    'common.error': 'Something went wrong',
    'common.retry': 'Retry',
    'common.cancel': 'Cancel',
    'common.confirm': 'Confirm',
    'common.save': 'Save',
    'common.delete': 'Delete',
    'common.edit': 'Edit',
    'common.view': 'View',
    'common.close': 'Close',
    'common.back': 'Back',
    'common.next': 'Next',
    'common.submit': 'Submit',
    'common.search': 'Search',

    // Footer
    'footer.about': 'About Us',
    'footer.contact': 'Contact',
    'footer.privacy': 'Privacy Policy',
    'footer.terms': 'Terms of Service',
    'footer.copyright': '© 2024 Room & Mess Finder. All rights reserved.',

    // Empty States
    'empty.noRooms': 'No rooms found',
    'empty.noMess': 'No mess found',
    'empty.noFavorites': 'No favorites yet',
    'empty.noResults': 'No results found',

    // Video Tour
    'video.watchTour': 'Watch Video Tour',
    'video.noVideo': 'No video available',

    // Dark Mode
    'theme.light': 'Light Mode',
    'theme.dark': 'Dark Mode',
    'theme.system': 'System',

    // External Food
    'food.messIsClosed': 'Mess is closed? Try these options:',
    'food.orderFromZomato': 'Order from Zomato',
    'food.orderFromSwiggy': 'Order from Swiggy',

    // Section Headings
    'section.roomsNearYou': 'Rooms Near You',
    'section.featuredRooms': 'Featured Rooms',
    'section.messNearYou': 'Mess Near You',
    'section.popularMess': 'Popular Mess',
    'section.whyChoose': 'Why Choose Room & Mess?',
    'section.ownerCTA': 'Are You a Room or Mess Owner?',
    'section.listProperty': 'List Your Property Free',
    'section.viewAll': 'View All',
};

// Hindi translations
const hi: Translations = {
    // Navigation
    'nav.home': 'होम',
    'nav.rooms': 'कमरे',
    'nav.mess': 'मेस',
    'nav.login': 'लॉगिन',
    'nav.register': 'रजिस्टर',
    'nav.dashboard': 'डैशबोर्ड',
    'nav.logout': 'लॉगआउट',
    'nav.favorites': 'पसंदीदा',
    'nav.compare': 'तुलना करें',

    // Hero Section
    'hero.title': 'अपना परफेक्ट खोजें',
    'hero.subtitle': 'कमरा और मेस',
    'hero.description': 'अपने कॉलेज या कार्यस्थल के पास सत्यापित कमरे और मेस सुविधाएं खोजें। सुरक्षित, किफायती और परेशानी मुक्त।',
    'hero.findRooms': 'कमरे खोजें',
    'hero.findMess': 'मेस खोजें',
    'hero.trustedBy': '50,000+ छात्रों का भरोसा',

    // Search
    'search.placeholder': 'लोकेशन, एरिया या लैंडमार्क खोजें...',
    'search.voiceSearch': 'वॉइस सर्च',
    'search.smartSearch': '"कॉलेज के पास 5000 में PG" ट्राई करें',

    // Room Card
    'card.verified': 'सत्यापित',
    'card.perMonth': '/महीना',
    'card.sendEnquiry': 'पूछताछ भेजें',
    'card.addToFavorites': 'पसंदीदा में जोड़ें',
    'card.addToCompare': 'तुलना में जोड़ें',
    'card.share': 'शेयर करें',
    'card.km': 'किमी',

    // Filters
    'filter.price': 'मूल्य सीमा',
    'filter.roomType': 'कमरे का प्रकार',
    'filter.foodType': 'भोजन प्रकार',
    'filter.facilities': 'सुविधाएं',
    'filter.verified': 'केवल सत्यापित',
    'filter.applyFilters': 'फ़िल्टर लागू करें',
    'filter.clearFilters': 'सभी साफ़ करें',

    // Room Types
    'roomType.single': 'सिंगल',
    'roomType.double': 'डबल',
    'roomType.shared': 'शेयर्ड',
    'roomType.pg': 'पीजी',
    'roomType.hostel': 'हॉस्टल',
    'roomType.apartment': 'अपार्टमेंट',

    // Food Types
    'foodType.veg': 'शुद्ध शाकाहारी',
    'foodType.nonVeg': 'मांसाहारी',
    'foodType.both': 'शाकाहारी और मांसाहारी',

    // Payment
    'payment.payNow': 'अभी भुगतान करें',
    'payment.selectPlan': 'प्लान चुनें',
    'payment.daily': 'दैनिक',
    'payment.weekly': 'साप्ताहिक',
    'payment.monthly': 'मासिक',
    'payment.secure': 'सुरक्षित भुगतान',
    'payment.success': 'भुगतान सफल!',
    'payment.failed': 'भुगतान विफल',
    'payment.receipt': 'रसीद डाउनलोड करें',

    // Common
    'common.loading': 'लोड हो रहा है...',
    'common.error': 'कुछ गलत हो गया',
    'common.retry': 'पुनः प्रयास करें',
    'common.cancel': 'रद्द करें',
    'common.confirm': 'पुष्टि करें',
    'common.save': 'सहेजें',
    'common.delete': 'हटाएं',
    'common.close': 'बंद करें',
    'common.search': 'खोजें',

    // External Food
    'food.messIsClosed': 'मेस बंद है? ये विकल्प आज़माएं:',
    'food.orderFromZomato': 'Zomato से ऑर्डर करें',
    'food.orderFromSwiggy': 'Swiggy से ऑर्डर करें',

    // Section Headings
    'section.roomsNearYou': 'आपके पास कमरे',
    'section.featuredRooms': 'विशेष कमरे',
    'section.messNearYou': 'आपके पास मेस',
    'section.popularMess': 'लोकप्रिय मेस',
    'section.whyChoose': 'रूम एंड मेस क्यों चुनें?',
    'section.ownerCTA': 'क्या आप कमरे या मेस के मालिक हैं?',
    'section.listProperty': 'अपनी संपत्ति मुफ्त में सूचीबद्ध करें',
    'section.viewAll': 'सभी देखें',

    // Footer
    'footer.about': 'हमारे बारे में',
    'footer.contact': 'संपर्क करें',
    'footer.privacy': 'गोपनीयता नीति',
    'footer.terms': 'सेवा की शर्तें',
    'footer.copyright': '© 2024 रूम एंड मेस फाइंडर। सर्वाधिकार सुरक्षित।',
};

// Marathi translations
const mr: Translations = {
    // Navigation
    'nav.home': 'होम',
    'nav.rooms': 'खोल्या',
    'nav.mess': 'मेस',
    'nav.login': 'लॉगिन',
    'nav.register': 'नोंदणी',
    'nav.dashboard': 'डॅशबोर्ड',
    'nav.logout': 'लॉगआउट',
    'nav.favorites': 'आवडते',
    'nav.compare': 'तुलना',

    // Hero Section
    'hero.title': 'तुमचे परफेक्ट शोधा',
    'hero.subtitle': 'खोली आणि मेस',
    'hero.description': 'तुमच्या कॉलेज किंवा कामाच्या ठिकाणी जवळ सत्यापित खोल्या आणि मेस शोधा. सुरक्षित, परवडणारे आणि सोपे.',
    'hero.findRooms': 'खोल्या शोधा',
    'hero.findMess': 'मेस शोधा',
    'hero.trustedBy': '50,000+ विद्यार्थ्यांचा विश्वास',

    // Search
    'search.placeholder': 'लोकेशन, एरिया किंवा लँडमार्क शोधा...',
    'search.voiceSearch': 'व्हॉइस सर्च',
    'search.smartSearch': '"कॉलेजजवळ 5000 मध्ये PG" ट्राय करा',

    // Room Card
    'card.verified': 'सत्यापित',
    'card.perMonth': '/महिना',
    'card.sendEnquiry': 'चौकशी पाठवा',
    'card.addToFavorites': 'आवडते मध्ये जोडा',
    'card.addToCompare': 'तुलनेत जोडा',
    'card.share': 'शेअर करा',
    'card.km': 'किमी',

    // Room Types
    'roomType.single': 'सिंगल',
    'roomType.double': 'डबल',
    'roomType.shared': 'शेअर्ड',
    'roomType.pg': 'पीजी',
    'roomType.hostel': 'हॉस्टेल',
    'roomType.apartment': 'अपार्टमेंट',

    // Food Types
    'foodType.veg': 'शुद्ध शाकाहारी',
    'foodType.nonVeg': 'मांसाहारी',
    'foodType.both': 'शाकाहारी आणि मांसाहारी',

    // Payment
    'payment.payNow': 'आता पे करा',
    'payment.selectPlan': 'प्लान निवडा',
    'payment.daily': 'दैनिक',
    'payment.weekly': 'साप्ताहिक',
    'payment.monthly': 'मासिक',
    'payment.success': 'पेमेंट यशस्वी!',
    'payment.receipt': 'पावती डाउनलोड करा',

    // Common
    'common.loading': 'लोड होत आहे...',
    'common.error': 'काहीतरी चूक झाली',
    'common.cancel': 'रद्द करा',
    'common.confirm': 'पुष्टी करा',
    'common.search': 'शोधा',

    // External Food
    'food.messIsClosed': 'मेस बंद आहे? हे पर्याय वापरा:',
    'food.orderFromZomato': 'Zomato वरून ऑर्डर करा',
    'food.orderFromSwiggy': 'Swiggy वरून ऑर्डर करा',

    // Section Headings
    'section.roomsNearYou': 'तुमच्याजवळ खोल्या',
    'section.featuredRooms': 'वैशिष्ट्यीकृत खोल्या',
    'section.messNearYou': 'तुमच्याजवळ मेस',
    'section.popularMess': 'लोकप्रिय मेस',
    'section.whyChoose': 'रूम अँड मेस का निवडा?',
    'section.ownerCTA': 'तुम्ही खोली किंवा मेस मालक आहात का?',
    'section.listProperty': 'तुमची मालमत्ता मोफत सूचीबद्ध करा',
    'section.viewAll': 'सर्व पहा',

    // Footer
    'footer.about': 'आमच्याबद्दल',
    'footer.contact': 'संपर्क',
    'footer.privacy': 'गोपनीयता धोरण',
    'footer.terms': 'सेवा अटी',
    'footer.copyright': '© 2024 रूम अँड मेस फाइंडर। सर्व हक्क राखीव।',
};

// All translations
const translations: Record<SupportedLanguage, Translations> = {
    en,
    hi,
    mr,
};

// Language names for display
export const languageNames: Record<SupportedLanguage, string> = {
    en: 'English',
    hi: 'हिंदी',
    mr: 'मराठी',
};

// Context
interface LanguageContextType {
    language: SupportedLanguage;
    setLanguage: (lang: SupportedLanguage) => void;
    t: (key: string) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

// Provider component
export const LanguageProvider = ({ children }: { children: ReactNode }) => {
    const [language, setLanguageState] = useState<SupportedLanguage>(() => {
        const saved = localStorage.getItem('rm_language') as SupportedLanguage;
        return saved && translations[saved] ? saved : 'en';
    });

    const setLanguage = (lang: SupportedLanguage) => {
        setLanguageState(lang);
        localStorage.setItem('rm_language', lang);
        document.documentElement.lang = lang;
    };

    useEffect(() => {
        document.documentElement.lang = language;
    }, [language]);

    const t = (key: string): string => {
        return translations[language][key] || translations.en[key] || key;
    };

    return (
        <LanguageContext.Provider value={{ language, setLanguage, t }}>
            {children}
        </LanguageContext.Provider>
    );
};

// Hook
export const useLanguage = () => {
    const context = useContext(LanguageContext);
    if (!context) {
        throw new Error('useLanguage must be used within a LanguageProvider');
    }
    return context;
};

export default { LanguageProvider, useLanguage, languageNames };
