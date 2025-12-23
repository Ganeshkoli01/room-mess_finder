// Predefined Admin Configuration
// These users have full admin privileges and cannot be created through signup

export const ADMIN_EMAILS = [
    'zyzx9607@gmail.com',
    'abhishekpatil7149@gmail.com',
    'ganeshkoli23112005@gmail.com',
] as const;

// Check if an email is a predefined admin
export const isAdminEmail = (email: string): boolean => {
    return ADMIN_EMAILS.includes(email.toLowerCase() as any);
};

// Admin credentials (for reference - passwords are stored in Supabase)
// Admin 1: zyzx9607@gmail.com / Zyzx@9607
// Admin 2: abhishekpatil7149@gmail.com / Abhishekpatil@7149
// Admin 3: ganeshkoli23112005@gmail.com / Ganeshkoli@23112005
