// Payment Service
// Handles online payments using Razorpay (popular in India)
// For demo purposes, we simulate payments. In production, use actual Razorpay integration.

import logger from '@/lib/logger';
import { supabase } from '@/integrations/supabase/client';
import { createSubscription, createBooking } from "@/services/bookingService";

export interface PaymentDetails {
    amount: number; // Amount in INR
    currency: string;
    orderId: string;
    listingId: string;
    listingType: 'room' | 'mess';
    listingTitle: string;
    planType: 'daily' | 'weekly' | 'monthly';
    userId: string;
    userEmail: string;
    userName: string;
    paymentMethod?: 'upi' | 'card' | 'netbanking' | 'razorpay';
}

export interface PaymentResult {
    success: boolean;
    transactionId: string;
    orderId: string;
    amount: number;
    timestamp: Date;
    receiptUrl?: string;
}

export interface PaymentReceipt {
    id: string;
    transactionId: string;
    orderId: string;
    amount: number;
    currency: string;
    listingTitle: string;
    listingType: 'room' | 'mess';
    planType: string;
    userName: string;
    userEmail: string;
    timestamp: Date;
    status: 'success' | 'failed' | 'pending';
}

// Razorpay configuration - Default to standard test key if env variable is not set
const RAZORPAY_KEY = import.meta.env.VITE_RAZORPAY_KEY_ID || 'rzp_test_1DP5mmOlF5G5ag';

// Generate unique order ID
export const generateOrderId = (): string => {
    const timestamp = Date.now().toString(36);
    const randomStr = Math.random().toString(36).substring(2, 8);
    return `RM_${timestamp}_${randomStr}`.toUpperCase();
};

// Generate unique transaction ID
export const generateTransactionId = (): string => {
    const timestamp = Date.now().toString(36);
    const randomStr = Math.random().toString(36).substring(2, 10);
    return `TXN_${timestamp}_${randomStr}`.toUpperCase();
};

// Initialize Razorpay Payment Modal
export const initiatePayment = async (details: PaymentDetails): Promise<PaymentResult> => {
    return new Promise((resolve, reject) => {
        if (typeof window !== 'undefined' && (window as any).Razorpay) {
            try {
                const options = {
                    key: RAZORPAY_KEY,
                    amount: Math.round(details.amount * 100), // Razorpay expects amount in paise
                    currency: details.currency || 'INR',
                    name: 'Room & Mess Finder',
                    description: `${details.planType ? details.planType + ' plan' : 'Subscription'} for ${details.listingTitle}`,
                    handler: async function (response: any) {
                        const result: PaymentResult = {
                            success: true,
                            transactionId: response.razorpay_payment_id || generateTransactionId(),
                            orderId: details.orderId,
                            amount: details.amount,
                            timestamp: new Date(),
                        };

                        await savePaymentRecord(details, result);
                        resolve(result);
                    },
                    prefill: {
                        name: details.userName || 'Subscriber',
                        email: details.userEmail || 'subscriber@example.com',
                        contact: '9876543210',
                    },
                    notes: {
                        listing_id: details.listingId,
                        listing_type: details.listingType,
                        payment_method: details.paymentMethod || 'standard',
                    },
                    theme: {
                        color: '#6366f1',
                    },
                    modal: {
                        ondismiss: function () {
                            reject(new Error('Payment was cancelled by the user. Subscription not activated.'));
                        }
                    }
                };

                const rzp = new (window as any).Razorpay(options);
                rzp.on('payment.failed', function (response: any) {
                    reject(new Error(response.error?.description || 'Payment transaction failed. Subscription not activated.'));
                });
                rzp.open();
            } catch (err: any) {
                logger.error('Razorpay checkout error:', err);
                // Fallback to simulated payment if popup is blocked or fails
                simulatePayment(details).then(resolve).catch(reject);
            }
        } else {
            // Fallback simulated payment if Razorpay SDK script is unavailable
            simulatePayment(details).then(resolve).catch(reject);
        }
    });
};

// Simulate payment for demo purposes
const simulatePayment = async (details: PaymentDetails): Promise<PaymentResult> => {
    logger.info('Simulating payment (demo mode)', { context: 'Payment' });

    // Simulate processing delay (1 second)
    await new Promise(resolve => setTimeout(resolve, 1000));

    const result: PaymentResult = {
        success: true,
        transactionId: generateTransactionId(),
        orderId: details.orderId,
        amount: details.amount,
        timestamp: new Date(),
    };

    // Save payment to database
    await savePaymentRecord(details, result);

    return result;
};

// Save payment record to database
export const savePaymentRecord = async (details: PaymentDetails, result: PaymentResult): Promise<void> => {
    try {
        // Note: In production, create a 'payments' table in Supabase
        const paymentRecord = {
            transaction_id: result.transactionId,
            order_id: result.orderId,
            user_id: details.userId,
            listing_id: details.listingId,
            listing_type: details.listingType,
            plan_type: details.planType,
            amount: result.amount,
            currency: details.currency || 'INR',
            status: result.success ? 'success' : 'failed',
            created_at: result.timestamp.toISOString(),
        };

        logger.info('Payment record saved', { context: 'Payment', data: paymentRecord });

        // Store in localStorage for demo
        const payments = JSON.parse(localStorage.getItem('rm_payments') || '[]');
        payments.push(paymentRecord);
        localStorage.setItem('rm_payments', JSON.stringify(payments));

        // Auto-create active subscription or booking record for the owner & user
        if (result.success) {
            if (details.listingType === "mess") {
                await createSubscription({
                    userId: details.userId,
                    messId: details.listingId,
                    messTitle: details.listingTitle,
                    planType: (details.planType === "daily" || details.planType === "weekly" || details.planType === "monthly") ? details.planType : "monthly",
                    amount: result.amount,
                }).catch(err => console.error("Error creating subscription from payment:", err));
            } else if (details.listingType === "room") {
                await createBooking({
                    enquiryId: `enq_${Date.now()}`,
                    userId: details.userId,
                    listingId: details.listingId,
                    listingType: "room",
                    listingTitle: details.listingTitle,
                    startDate: new Date(),
                    amount: result.amount,
                    userName: details.userName,
                    userEmail: details.userEmail,
                }).catch(err => console.error("Error creating booking from payment:", err));
            }
        }
    } catch (error) {
        logger.error('Failed to save payment record', error, { context: 'Payment' });
    }
};

// Get payment history for user
export const getPaymentHistory = (userId?: string): PaymentReceipt[] => {
    try {
        const payments = JSON.parse(localStorage.getItem('rm_payments') || '[]');
        if (userId) {
            return payments.filter((p: any) => p.user_id === userId);
        }
        return payments;
    } catch {
        return [];
    }
};

// Generate receipt HTML for printing/download
export const generateReceiptHTML = (receipt: PaymentReceipt): string => {
    return `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Payment Receipt - ${receipt.transactionId}</title>
      <style>
        body { font-family: Arial, sans-serif; padding: 40px; max-width: 600px; margin: 0 auto; }
        .header { text-align: center; border-bottom: 2px solid #6366f1; padding-bottom: 20px; margin-bottom: 30px; }
        .logo { font-size: 24px; font-weight: bold; color: #6366f1; }
        .receipt-title { font-size: 20px; color: #333; margin-top: 10px; }
        .details { margin: 20px 0; }
        .row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #eee; }
        .label { color: #666; }
        .value { font-weight: 600; }
        .amount { font-size: 24px; color: #6366f1; text-align: center; margin: 30px 0; }
        .footer { text-align: center; color: #666; font-size: 12px; margin-top: 40px; }
        .success { color: #22c55e; font-weight: bold; }
        @media print { body { padding: 20px; } }
      </style>
    </head>
    <body>
      <div class="header">
        <div class="logo">Room & Mess Finder</div>
        <div class="receipt-title">Payment Receipt</div>
      </div>
      
      <div class="details">
        <div class="row">
          <span class="label">Transaction ID</span>
          <span class="value">${receipt.transactionId}</span>
        </div>
        <div class="row">
          <span class="label">Order ID</span>
          <span class="value">${receipt.orderId}</span>
        </div>
        <div class="row">
          <span class="label">Date & Time</span>
          <span class="value">${new Date(receipt.timestamp).toLocaleString('en-IN')}</span>
        </div>
        <div class="row">
          <span class="label">Listing</span>
          <span class="value">${receipt.listingTitle}</span>
        </div>
        <div class="row">
          <span class="label">Plan Type</span>
          <span class="value" style="text-transform: capitalize;">${receipt.planType}</span>
        </div>
        <div class="row">
          <span class="label">Customer Name</span>
          <span class="value">${receipt.userName}</span>
        </div>
        <div class="row">
          <span class="label">Email</span>
          <span class="value">${receipt.userEmail}</span>
        </div>
        <div class="row">
          <span class="label">Status</span>
          <span class="value success">✓ ${receipt.status.toUpperCase()}</span>
        </div>
      </div>
      
      <div class="amount">
        <div style="font-size: 14px; color: #666;">Amount Paid</div>
        <div>₹${receipt.amount.toLocaleString('en-IN')}</div>
      </div>
      
      <div class="footer">
        <p>Thank you for using Room & Mess Finder!</p>
        <p>For any queries, contact roommess8@gmail.com</p>
        <p>This is a computer-generated receipt and does not require a signature.</p>
      </div>
    </body>
    </html>
  `;
};

// Download receipt as PDF (uses print dialog)
export const downloadReceipt = (receipt: PaymentReceipt): void => {
    const html = generateReceiptHTML(receipt);
    const printWindow = window.open('', '_blank');
    if (printWindow) {
        printWindow.document.write(html);
        printWindow.document.close();
        printWindow.focus();
        setTimeout(() => {
            printWindow.print();
        }, 500);
    }
};

// Calculate plan prices
export const getPlanPrices = (basePrice: number): { daily: number; weekly: number; monthly: number } => {
    return {
        daily: Math.round(basePrice / 30), // Daily rate
        weekly: Math.round((basePrice / 30) * 7 * 0.9), // 10% discount for weekly
        monthly: basePrice, // Full monthly price
    };
};

// Manual override for bookings/subscriptions
export const forceUpdateBookingStatus = async (
    bookingId: string,
    isMess: boolean,
    newStatus: string,
    reason: string
): Promise<{ success: boolean; error?: string }> => {
    try {
        const key = isMess ? "rm_subscriptions" : "rm_bookings";
        const items = JSON.parse(localStorage.getItem(key) || "[]");
        const idx = items.findIndex((item: any) => (item.id === bookingId || item.bookingId === bookingId));
        if (idx !== -1) {
            items[idx].status = newStatus;
            items[idx].override_reason = reason;
            items[idx].updated_at = new Date().toISOString();
            localStorage.setItem(key, JSON.stringify(items));
        }

        // Also update Supabase bookings table if applicable
        if (!isMess) {
            await supabase
                .from("bookings")
                .update({
                    status: newStatus as any,
                    response_message: reason,
                    updated_at: new Date().toISOString()
                })
                .eq("id", bookingId);
        }

        return { success: true };
    } catch (err: any) {
        logger.error("Error overriding booking status:", err);
        return { success: false, error: err.message };
    }
};

// Manual Refund Trigger
export const refundRazorpayPayment = async (
    bookingId: string,
    isMess: boolean,
    amount: number
): Promise<{ success: boolean; error?: string }> => {
    try {
        // 1. Update Booking status and payment status in local storage
        const key = isMess ? "rm_subscriptions" : "rm_bookings";
        const items = JSON.parse(localStorage.getItem(key) || "[]");
        const idx = items.findIndex((item: any) => (item.id === bookingId || item.bookingId === bookingId));
        let paymentId = "";
        
        if (idx !== -1) {
            items[idx].status = "cancelled";
            items[idx].paymentStatus = "refunded";
            items[idx].refunded_amount = amount;
            items[idx].updated_at = new Date().toISOString();
            paymentId = items[idx].paymentId || items[idx].transactionId || "";
            localStorage.setItem(key, JSON.stringify(items));
        }

        // 2. Update payment record
        const payments = JSON.parse(localStorage.getItem("rm_payments") || "[]");
        const payIdx = payments.findIndex((p: any) => (p.paymentId === paymentId || p.transaction_id === paymentId || p.id === bookingId));
        if (payIdx !== -1) {
            payments[payIdx].status = "refunded";
            payments[payIdx].refunded_amount = amount;
            payments[payIdx].updated_at = new Date().toISOString();
            localStorage.setItem("rm_payments", JSON.stringify(payments));
        }

        // 3. Update Supabase if needed
        if (!isMess) {
            await supabase
                .from("bookings")
                .update({
                    status: "cancelled" as any,
                    updated_at: new Date().toISOString()
                })
                .eq("id", bookingId);
        }

        return { success: true };
    } catch (err: any) {
        logger.error("Error refunding payment:", err);
        return { success: false, error: err.message };
    }
};

// Fetch Commission Settings
export const getCommissionSettings = async (): Promise<number> => {
    try {
        const { data, error } = await (supabase as any)
            .from("platform_settings")
            .select("commission_percent")
            .limit(1)
            .maybeSingle();
            
        if (!error && data) {
            return Number((data as any).commission_percent);
        }
    } catch (err) {
        console.error("Error loading commission settings from Supabase:", err);
    }
    
    // Fallback to local storage
    const local = localStorage.getItem("rm_commission_percent");
    return local ? parseFloat(local) : 10.0;
};

// Update Commission Settings
export const updateCommissionSettings = async (percent: number): Promise<{ success: boolean; error?: string }> => {
    try {
        // Save to local storage first
        localStorage.setItem("rm_commission_percent", percent.toString());

        // Update in Supabase (we have seeded exactly one row)
        const { data: settings } = await (supabase as any)
            .from("platform_settings")
            .select("id")
            .limit(1);

        if (settings && settings.length > 0) {
            const { error } = await (supabase as any)
                .from("platform_settings")
                .update({ commission_percent: percent, updated_at: new Date().toISOString() })
                .eq("id", settings[0].id);

            if (error) throw error;
        } else {
            const { error } = await (supabase as any)
                .from("platform_settings")
                .insert({ commission_percent: percent });

            if (error) throw error;
        }

        return { success: true };
    } catch (err: any) {
        console.error("Error updating commission settings:", err);
        return { success: false, error: err.message };
    }
};

export default {
    generateOrderId,
    generateTransactionId,
    initiatePayment,
    getPaymentHistory,
    generateReceiptHTML,
    downloadReceipt,
    getPlanPrices,
    forceUpdateBookingStatus,
    refundRazorpayPayment,
    getCommissionSettings,
    updateCommissionSettings,
};
