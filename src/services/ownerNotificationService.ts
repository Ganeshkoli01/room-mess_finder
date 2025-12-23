// Owner Notification Service
// Sends WhatsApp and Email notifications to property owners when they receive enquiries

import { supabase } from "@/integrations/supabase/client";

// Types
export interface EnquiryNotificationData {
    enquiryId: string;
    // User Details
    userName: string;
    userEmail: string;
    userPhone?: string;
    message: string;
    // Listing Details
    listingId: string;
    listingType: "room" | "mess";
    listingTitle: string;
    // Owner Details
    ownerName: string;
    ownerEmail: string;
    ownerPhone?: string;
    ownerWhatsApp?: string;
}

export interface NotificationResult {
    success: boolean;
    emailSent: boolean;
    whatsappSent: boolean;
    errors?: string[];
}

// =============================================
// WHATSAPP NOTIFICATION
// =============================================

/**
 * Creates a WhatsApp click-to-chat link
 */
export const createWhatsAppLink = (
    data: EnquiryNotificationData
): string | null => {
    const whatsappNumber = data.ownerWhatsApp || data.ownerPhone;

    if (!whatsappNumber) {
        return null;
    }

    const formattedPhone = formatPhoneNumber(whatsappNumber);
    const message = createWhatsAppMessage(data);

    return `https://wa.me/${formattedPhone}?text=${encodeURIComponent(message)}`;
};

/**
 * Sends WhatsApp message to owner
 * Returns a WhatsApp link for immediate use or logs for backend processing
 */
export const sendWhatsAppNotification = async (
    data: EnquiryNotificationData
): Promise<{ success: boolean; whatsappLink?: string; error?: string }> => {
    const whatsappNumber = data.ownerWhatsApp || data.ownerPhone;

    if (!whatsappNumber) {
        console.warn("No WhatsApp number available for owner");
        return { success: false, error: "No WhatsApp number" };
    }

    const formattedPhone = formatPhoneNumber(whatsappNumber);
    const message = createWhatsAppMessage(data);
    const whatsappLink = `https://wa.me/${formattedPhone}?text=${encodeURIComponent(message)}`;

    try {
        // Log the notification attempt for backend processing
        await logNotificationLocal({
            enquiryId: data.enquiryId,
            notificationType: "whatsapp",
            recipientType: "owner",
            recipientPhone: formattedPhone,
            message,
            status: "ready",
            whatsappLink,
        });

        console.log("WhatsApp notification prepared", formattedPhone);

        return { success: true, whatsappLink };
    } catch (error: any) {
        console.error("WhatsApp notification failed", error.message);
        return { success: false, error: error.message };
    }
};

/**
 * Creates a formatted WhatsApp message
 */
const createWhatsAppMessage = (data: EnquiryNotificationData): string => {
    const listingEmoji = data.listingType === "room" ? "🏠" : "🍽️";

    return `${listingEmoji} *New Enquiry Received!*

Hello ${data.ownerName},

You have received a new ${data.listingType} enquiry:

📋 *Listing:* ${data.listingTitle}

👤 *Customer Details:*
• Name: ${data.userName}
• Email: ${data.userEmail}
${data.userPhone ? `• Phone: ${data.userPhone}` : ""}

💬 *Message:*
"${data.message}"

⏰ Received: ${new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })}

Please respond quickly to increase your booking chances!

- Room & Mess Finder Team
🌐 roomandmess.com`;
};

// =============================================
// EMAIL NOTIFICATION
// =============================================

/**
 * Sends email notification to owner
 */
export const sendEmailNotification = async (
    data: EnquiryNotificationData
): Promise<{ success: boolean; error?: string }> => {
    if (!data.ownerEmail) {
        console.warn("No email available for owner");
        return { success: false, error: "No email address" };
    }

    try {
        const emailContent = createEmailContent(data);

        // Try Supabase Edge Function first
        try {
            const { error } = await supabase.functions.invoke("send-email", {
                body: {
                    to: data.ownerEmail,
                    subject: `🔔 New ${data.listingType === "room" ? "Room" : "Mess"} Enquiry - ${data.listingTitle}`,
                    html: emailContent.html,
                    text: emailContent.text,
                },
            });

            if (!error) {
                console.log("Email sent via Edge Function", data.ownerEmail);
                return { success: true };
            }
        } catch {
            // Edge function not available, continue to fallback
        }

        // Fallback: Log for manual sending or backend processing
        await logNotificationLocal({
            enquiryId: data.enquiryId,
            notificationType: "email",
            recipientType: "owner",
            recipientEmail: data.ownerEmail,
            subject: `New ${data.listingType} Enquiry - ${data.listingTitle}`,
            message: emailContent.text,
            status: "pending",
        });

        console.log("Email notification logged for manual send", data.ownerEmail);
        return { success: true };
    } catch (error: any) {
        console.error("Email notification failed", error.message);
        return { success: false, error: error.message };
    }
};

/**
 * Creates HTML and plain text email content
 */
const createEmailContent = (data: EnquiryNotificationData): { html: string; text: string } => {
    const listingEmoji = data.listingType === "room" ? "🏠" : "🍽️";
    const listingColor = data.listingType === "room" ? "#8B5CF6" : "#F59E0B";

    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>New Enquiry Notification</title>
</head>
<body style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; padding: 0; background-color: #f5f5f5;">
  <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
    <div style="background: linear-gradient(135deg, ${listingColor}, #1E1B4B); border-radius: 16px 16px 0 0; padding: 30px; text-align: center;">
      <h1 style="color: white; margin: 0; font-size: 24px;">${listingEmoji} New Enquiry Received!</h1>
      <p style="color: rgba(255,255,255,0.8); margin-top: 10px;">Someone is interested in your listing</p>
    </div>
    
    <div style="background: white; padding: 30px; border-radius: 0 0 16px 16px;">
      <p style="color: #374151; font-size: 16px;">Hello <strong>${data.ownerName}</strong>,</p>
      
      <p style="color: #6B7280;">You have received a new enquiry for your ${data.listingType}:</p>
      
      <div style="background: #F3F4F6; border-radius: 12px; padding: 20px; margin: 20px 0;">
        <h3 style="color: ${listingColor}; margin: 0 0 10px 0;">${data.listingTitle}</h3>
        <p style="color: #6B7280; margin: 0; font-size: 14px;">Type: ${data.listingType.charAt(0).toUpperCase() + data.listingType.slice(1)}</p>
      </div>
      
      <h3 style="color: #1F2937; border-bottom: 2px solid #E5E7EB; padding-bottom: 10px;">👤 Customer Details</h3>
      <table style="width: 100%; border-collapse: collapse;">
        <tr>
          <td style="padding: 8px 0; color: #6B7280; width: 100px;">Name:</td>
          <td style="padding: 8px 0; color: #1F2937; font-weight: 500;">${data.userName}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #6B7280;">Email:</td>
          <td style="padding: 8px 0;"><a href="mailto:${data.userEmail}" style="color: ${listingColor}; text-decoration: none;">${data.userEmail}</a></td>
        </tr>
        ${data.userPhone ? `
        <tr>
          <td style="padding: 8px 0; color: #6B7280;">Phone:</td>
          <td style="padding: 8px 0;"><a href="tel:${data.userPhone}" style="color: ${listingColor}; text-decoration: none;">${data.userPhone}</a></td>
        </tr>
        ` : ""}
      </table>
      
      <h3 style="color: #1F2937; border-bottom: 2px solid #E5E7EB; padding-bottom: 10px; margin-top: 30px;">💬 Message</h3>
      <div style="background: #F9FAFB; border-left: 4px solid ${listingColor}; padding: 15px; border-radius: 0 8px 8px 0; margin: 15px 0;">
        <p style="color: #374151; margin: 0; line-height: 1.6;">"${data.message}"</p>
      </div>
      
      <div style="text-align: center; margin: 30px 0;">
        <a href="mailto:${data.userEmail}" style="display: inline-block; background: ${listingColor}; color: white; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: 500; margin: 5px;">📧 Reply via Email</a>
        ${data.userPhone ? `<a href="https://wa.me/${formatPhoneNumber(data.userPhone)}" style="display: inline-block; background: #25D366; color: white; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: 500; margin: 5px;">💬 Reply on WhatsApp</a>` : ""}
      </div>
      
      <div style="background: #FEF3C7; border-radius: 8px; padding: 15px; margin-top: 20px;">
        <p style="color: #92400E; margin: 0; font-size: 14px;">💡 <strong>Tip:</strong> Respond within 1 hour to increase your booking chances by 40%!</p>
      </div>
      
      <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #E5E7EB;">
        <p style="color: #9CA3AF; font-size: 12px; margin: 0;">This email was sent by Room & Mess Finder<br><a href="https://roomandmess.com" style="color: ${listingColor};">roomandmess.com</a></p>
      </div>
    </div>
  </div>
</body>
</html>`;

    const text = `
NEW ENQUIRY RECEIVED!
=====================

Hello ${data.ownerName},

You have received a new ${data.listingType} enquiry.

LISTING: ${data.listingTitle}

CUSTOMER DETAILS:
- Name: ${data.userName}
- Email: ${data.userEmail}
${data.userPhone ? `- Phone: ${data.userPhone}` : ""}

MESSAGE:
"${data.message}"

---
Received: ${new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })}

Reply quickly to increase your booking chances!

- Room & Mess Finder Team
  `;

    return { html, text };
};

// =============================================
// HELPER FUNCTIONS
// =============================================

/**
 * Formats phone number for WhatsApp (adds country code)
 */
export const formatPhoneNumber = (phone: string): string => {
    let cleaned = phone.replace(/\D/g, "");

    if (cleaned.length === 10) {
        cleaned = "91" + cleaned;
    } else if (cleaned.startsWith("0")) {
        cleaned = "91" + cleaned.substring(1);
    }

    return cleaned;
};

// Local storage for notification logs (fallback when Supabase tables don't exist)
const NOTIFICATION_LOGS_KEY = "rm_notification_logs";

interface NotificationLog {
    id: string;
    enquiryId: string;
    notificationType: string;
    recipientType: string;
    recipientEmail?: string;
    recipientPhone?: string;
    subject?: string;
    message?: string;
    status: string;
    whatsappLink?: string;
    createdAt: Date;
}

const logNotificationLocal = async (data: {
    enquiryId: string;
    notificationType: string;
    recipientType: string;
    recipientEmail?: string;
    recipientPhone?: string;
    subject?: string;
    message?: string;
    status: string;
    whatsappLink?: string;
}): Promise<void> => {
    try {
        const logs = getNotificationLogsLocal();
        const newLog: NotificationLog = {
            id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            ...data,
            createdAt: new Date(),
        };
        logs.push(newLog);
        localStorage.setItem(NOTIFICATION_LOGS_KEY, JSON.stringify(logs));

        // Also try to save to Supabase (will fail silently if table doesn't exist)
        try {
            await supabase.from("notification_logs" as any).insert({
                enquiry_id: data.enquiryId,
                notification_type: data.notificationType,
                recipient_type: data.recipientType,
                recipient_email: data.recipientEmail,
                recipient_phone: data.recipientPhone,
                subject: data.subject,
                message: data.message,
                status: data.status,
            });
        } catch {
            // Supabase table doesn't exist, using local storage only
        }
    } catch (err: any) {
        console.warn("Notification logging error", err.message);
    }
};

const getNotificationLogsLocal = (): NotificationLog[] => {
    try {
        const data = localStorage.getItem(NOTIFICATION_LOGS_KEY);
        return data ? JSON.parse(data) : [];
    } catch {
        return [];
    }
};

// =============================================
// MAIN NOTIFICATION FUNCTION
// =============================================

/**
 * Sends all notifications (WhatsApp + Email) to owner
 */
export const notifyOwner = async (
    data: EnquiryNotificationData
): Promise<NotificationResult> => {
    const errors: string[] = [];
    let emailSent = false;
    let whatsappSent = false;

    // Send WhatsApp notification
    const whatsappResult = await sendWhatsAppNotification(data);
    whatsappSent = whatsappResult.success;
    if (!whatsappResult.success && whatsappResult.error) {
        errors.push(`WhatsApp: ${whatsappResult.error}`);
    }

    // Send Email notification
    const emailResult = await sendEmailNotification(data);
    emailSent = emailResult.success;
    if (!emailResult.success && emailResult.error) {
        errors.push(`Email: ${emailResult.error}`);
    }

    return {
        success: emailSent || whatsappSent,
        emailSent,
        whatsappSent,
        errors: errors.length > 0 ? errors : undefined,
    };
};

export default {
    notifyOwner,
    sendEmailNotification,
    sendWhatsAppNotification,
    createWhatsAppLink,
    formatPhoneNumber,
};
