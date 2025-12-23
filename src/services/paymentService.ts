// Payment Service
// Handles online payments using Razorpay (popular in India)
// For demo purposes, we simulate payments. In production, use actual Razorpay integration.

import logger from '@/lib/logger';
import { supabase } from '@/integrations/supabase/client';

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

// Razorpay configuration
const RAZORPAY_KEY = import.meta.env.VITE_RAZORPAY_KEY_ID || 'rzp_test_demo';

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

// Initialize Razorpay payment
export const initiatePayment = async (details: PaymentDetails): Promise<PaymentResult> => {
    return new Promise((resolve, reject) => {
        // Check if Razorpay is loaded
        if (typeof window !== 'undefined' && (window as any).Razorpay) {
            const options = {
                key: RAZORPAY_KEY,
                amount: details.amount * 100, // Razorpay expects amount in paise
                currency: details.currency || 'INR',
                name: 'Room & Mess Finder',
                description: `${details.planType} plan for ${details.listingTitle}`,
                order_id: details.orderId,
                handler: async function (response: any) {
                    const result: PaymentResult = {
                        success: true,
                        transactionId: response.razorpay_payment_id || generateTransactionId(),
                        orderId: details.orderId,
                        amount: details.amount,
                        timestamp: new Date(),
                    };

                    // Save payment to database
                    await savePaymentRecord(details, result);

                    resolve(result);
                },
                prefill: {
                    name: details.userName,
                    email: details.userEmail,
                },
                theme: {
                    color: '#6366f1',
                },
                modal: {
                    ondismiss: function () {
                        reject(new Error('Payment cancelled by user'));
                    }
                }
            };

            const rzp = new (window as any).Razorpay(options);
            rzp.open();
        } else {
            // Fallback for demo/development without Razorpay
            simulatePayment(details).then(resolve).catch(reject);
        }
    });
};

// Simulate payment for demo purposes
const simulatePayment = async (details: PaymentDetails): Promise<PaymentResult> => {
    logger.info('Simulating payment (demo mode)', { context: 'Payment' });

    // Simulate processing delay
    await new Promise(resolve => setTimeout(resolve, 2000));

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
const savePaymentRecord = async (details: PaymentDetails, result: PaymentResult): Promise<void> => {
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
        <p>For any queries, contact support@roomandmess.com</p>
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

export default {
    generateOrderId,
    generateTransactionId,
    initiatePayment,
    getPaymentHistory,
    generateReceiptHTML,
    downloadReceipt,
    getPlanPrices,
};
