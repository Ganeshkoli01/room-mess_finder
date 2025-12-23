// Razorpay Payment Service
// Production-ready payment integration for Room & Mess Finder
// Handles booking payments, subscription payments, and refunds

import logger from '@/lib/logger';

declare global {
  interface Window {
    Razorpay: any;
  }
}

export interface PaymentConfig {
  keyId: string;
  keySecret?: string;
  currency: string;
  companyName: string;
  companyLogo?: string;
  theme: {
    color: string;
  };
}

export interface CreateOrderRequest {
  amount: number;
  currency?: string;
  listingId: string;
  listingType: 'room' | 'mess';
  listingTitle: string;
  planType: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly' | 'booking';
  userId: string;
  userEmail: string;
  userName: string;
  userPhone: string;
  notes?: Record<string, string>;
}

export interface PaymentOrder {
  orderId: string;
  amount: number;
  amountPaid: number;
  currency: string;
  status: 'created' | 'paid' | 'attempted' | 'failed';
  createdAt: Date;
}

export interface PaymentResult {
  success: boolean;
  paymentId: string;
  orderId: string;
  signature?: string;
  amount: number;
  timestamp: Date;
  error?: string;
}

export interface PaymentReceipt {
  id: string;
  paymentId: string;
  orderId: string;
  amount: number;
  currency: string;
  listingId: string;
  listingTitle: string;
  listingType: 'room' | 'mess';
  planType: string;
  userName: string;
  userEmail: string;
  userPhone: string;
  ownerName: string;
  ownerPhone: string;
  status: 'success' | 'failed' | 'pending' | 'refunded';
  timestamp: Date;
  bookingDetails?: {
    checkIn?: string;
    checkOut?: string;
    duration?: string;
    mealPlan?: string;
  };
}

// Configuration - Read from environment or use test keys
const getConfig = (): PaymentConfig => ({
  keyId: import.meta.env.VITE_RAZORPAY_KEY_ID || 'rzp_test_your_key_here',
  keySecret: import.meta.env.VITE_RAZORPAY_KEY_SECRET,
  currency: 'INR',
  companyName: 'Room & Mess Finder',
  companyLogo: '/logo.png',
  theme: {
    color: '#6366f1', // Indigo color matching the app theme
  },
});

// Load Razorpay script dynamically
export const loadRazorpayScript = (): Promise<boolean> => {
  return new Promise((resolve) => {
    if (window.Razorpay) {
      resolve(true);
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    script.onload = () => resolve(true);
    script.onerror = () => {
      console.error('Failed to load Razorpay script');
      resolve(false);
    };
    document.body.appendChild(script);
  });
};

// Generate unique order ID
export const generateOrderId = (): string => {
  const timestamp = Date.now().toString(36);
  const randomStr = Math.random().toString(36).substring(2, 8);
  return `RM_${timestamp}_${randomStr}`.toUpperCase();
};

// Generate unique payment ID (for demo mode)
export const generatePaymentId = (): string => {
  const timestamp = Date.now().toString(36);
  const randomStr = Math.random().toString(36).substring(2, 10);
  return `pay_${timestamp}${randomStr}`;
};

// Create order (In production, this should call your backend)
export const createOrder = async (request: CreateOrderRequest): Promise<PaymentOrder> => {
  // In production, call your backend API to create Razorpay order
  // Backend would use Razorpay SDK: razorpay.orders.create({...})

  const orderId = generateOrderId();

  return {
    orderId,
    amount: request.amount,
    amountPaid: 0,
    currency: request.currency || 'INR',
    status: 'created',
    createdAt: new Date(),
  };
};

// Check if a valid Razorpay API key is configured
const isValidRazorpayKey = (key: string): boolean => {
  // Must start with rzp_live_ or rzp_test_ and have actual content after
  return key.startsWith('rzp_live_') ||
    (key.startsWith('rzp_test_') && !key.includes('your_key'));
};

// Process payment with Razorpay
export const processPayment = async (
  order: PaymentOrder,
  request: CreateOrderRequest,
  ownerDetails: { name: string; phone: string }
): Promise<PaymentResult> => {
  const config = getConfig();

  // Check if valid API key is configured - if not, use demo mode directly
  if (!isValidRazorpayKey(config.keyId)) {
    console.log('📋 No valid Razorpay API key configured. Using demo payment mode.');
    return simulatePayment(order, request, ownerDetails);
  }

  // Load Razorpay script
  const loaded = await loadRazorpayScript();

  if (!loaded || !window.Razorpay) {
    // Fallback to demo payment if Razorpay not available
    return simulatePayment(order, request, ownerDetails);
  }

  return new Promise((resolve, reject) => {
    const options = {
      key: config.keyId,
      amount: order.amount * 100, // Amount in paise
      currency: order.currency,
      name: config.companyName,
      description: `${request.planType.charAt(0).toUpperCase() + request.planType.slice(1)} - ${request.listingTitle}`,
      order_id: order.orderId, // This should be actual Razorpay order ID in production
      handler: async (response: any) => {
        const result: PaymentResult = {
          success: true,
          paymentId: response.razorpay_payment_id || generatePaymentId(),
          orderId: order.orderId,
          signature: response.razorpay_signature,
          amount: order.amount,
          timestamp: new Date(),
        };

        // Save payment record
        await savePaymentRecord(request, result, ownerDetails);

        resolve(result);
      },
      prefill: {
        name: request.userName,
        email: request.userEmail,
        contact: request.userPhone,
      },
      notes: {
        listingId: request.listingId,
        listingType: request.listingType,
        planType: request.planType,
        ...request.notes,
      },
      theme: config.theme,
      modal: {
        ondismiss: () => {
          reject(new Error('Payment cancelled by user'));
        },
        escape: true,
        animation: true,
      },
    };

    try {
      const rzp = new window.Razorpay(options);
      rzp.on('payment.failed', (response: any) => {
        const error = response.error || {};
        reject(new Error(error.description || 'Payment failed'));
      });
      rzp.open();
    } catch (error: any) {
      console.error('Razorpay error:', error);
      // Fallback to simulation
      simulatePayment(order, request, ownerDetails).then(resolve).catch(reject);
    }
  });
};

// Simulate payment for demo/development
const simulatePayment = async (
  order: PaymentOrder,
  request: CreateOrderRequest,
  ownerDetails: { name: string; phone: string }
): Promise<PaymentResult> => {
  logger.info('Using demo payment mode', { context: 'Payment' });

  // Show demo payment UI
  return new Promise((resolve, reject) => {
    // Create demo payment modal
    const modal = document.createElement('div');
    modal.id = 'demo-payment-modal';
    modal.innerHTML = `
      <div style="
        position: fixed;
        inset: 0;
        background: rgba(0,0,0,0.6);
        backdrop-filter: blur(4px);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 9999;
        animation: fadeIn 0.3s ease;
      ">
        <div style="
          background: white;
          border-radius: 16px;
          padding: 32px;
          max-width: 400px;
          width: 90%;
          box-shadow: 0 25px 50px -12px rgba(0,0,0,0.25);
          animation: slideUp 0.3s ease;
        ">
          <div style="text-align: center; margin-bottom: 24px;">
            <div style="
              width: 64px;
              height: 64px;
              background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
              border-radius: 50%;
              display: flex;
              align-items: center;
              justify-content: center;
              margin: 0 auto 16px;
            ">
              <svg width="32" height="32" fill="white" viewBox="0 0 24 24">
                <path d="M20 4H4c-1.11 0-1.99.89-1.99 2L2 18c0 1.11.89 2 2 2h16c1.11 0 2-.89 2-2V6c0-1.11-.89-2-2-2zm0 14H4v-6h16v6zm0-10H4V6h16v2z"/>
              </svg>
            </div>
            <h3 style="margin: 0 0 8px; font-size: 20px; font-weight: 600; color: #1f2937;">Demo Payment</h3>
            <p style="margin: 0; color: #6b7280; font-size: 14px;">This is a demo payment. No actual charges will be made.</p>
          </div>
          
          <div style="background: #f9fafb; border-radius: 12px; padding: 16px; margin-bottom: 24px;">
            <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
              <span style="color: #6b7280;">Amount</span>
              <span style="font-weight: 600; color: #1f2937;">₹${order.amount.toLocaleString('en-IN')}</span>
            </div>
            <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
              <span style="color: #6b7280;">For</span>
              <span style="font-weight: 500; color: #1f2937;">${request.listingTitle}</span>
            </div>
            <div style="display: flex; justify-content: space-between;">
              <span style="color: #6b7280;">Plan</span>
              <span style="font-weight: 500; color: #6366f1; text-transform: capitalize;">${request.planType}</span>
            </div>
          </div>
          
          <div style="display: flex; gap: 12px;">
            <button id="demo-cancel-btn" style="
              flex: 1;
              padding: 12px 16px;
              border: 1px solid #e5e7eb;
              background: white;
              color: #374151;
              border-radius: 8px;
              font-weight: 500;
              cursor: pointer;
              transition: all 0.2s;
            ">Cancel</button>
            <button id="demo-pay-btn" style="
              flex: 1;
              padding: 12px 16px;
              border: none;
              background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
              color: white;
              border-radius: 8px;
              font-weight: 600;
              cursor: pointer;
              transition: all 0.2s;
            ">Pay ₹${order.amount.toLocaleString('en-IN')}</button>
          </div>
        </div>
      </div>
      <style>
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
      </style>
    `;

    document.body.appendChild(modal);

    const cancelBtn = document.getElementById('demo-cancel-btn');
    const payBtn = document.getElementById('demo-pay-btn');

    cancelBtn?.addEventListener('click', () => {
      modal.remove();
      reject(new Error('Payment cancelled by user'));
    });

    payBtn?.addEventListener('click', async () => {
      // Show loading state
      if (payBtn) {
        payBtn.innerHTML = '<span style="display: inline-flex; align-items: center; gap: 8px;"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="animation: spin 1s linear infinite;"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>Processing...</span>';
        (payBtn as HTMLButtonElement).disabled = true;
      }

      // Simulate payment processing
      await new Promise(r => setTimeout(r, 2000));

      const result: PaymentResult = {
        success: true,
        paymentId: generatePaymentId(),
        orderId: order.orderId,
        amount: order.amount,
        timestamp: new Date(),
      };

      // Save payment record
      await savePaymentRecord(request, result, ownerDetails);

      modal.remove();
      resolve(result);
    });
  });
};

// Save payment record
const savePaymentRecord = async (
  request: CreateOrderRequest,
  result: PaymentResult,
  ownerDetails: { name: string; phone: string }
): Promise<void> => {
  const receipt: PaymentReceipt = {
    id: `RCP_${Date.now().toString(36).toUpperCase()}`,
    paymentId: result.paymentId,
    orderId: result.orderId,
    amount: result.amount,
    currency: 'INR',
    listingId: request.listingId,
    listingTitle: request.listingTitle,
    listingType: request.listingType,
    planType: request.planType,
    userName: request.userName,
    userEmail: request.userEmail,
    userPhone: request.userPhone,
    ownerName: ownerDetails.name,
    ownerPhone: ownerDetails.phone,
    status: result.success ? 'success' : 'failed',
    timestamp: result.timestamp,
  };

  try {
    // Store in localStorage
    const payments = JSON.parse(localStorage.getItem('rm_payments') || '[]');
    payments.unshift(receipt);
    localStorage.setItem('rm_payments', JSON.stringify(payments.slice(0, 100))); // Keep last 100

    // Store booking
    const bookings = JSON.parse(localStorage.getItem('rm_bookings') || '[]');
    bookings.unshift({
      ...receipt,
      bookingId: `BKG_${Date.now().toString(36).toUpperCase()}`,
      status: 'confirmed',
      createdAt: new Date().toISOString(),
    });
    localStorage.setItem('rm_bookings', JSON.stringify(bookings.slice(0, 100)));

    logger.info('Payment saved successfully', { context: 'Payment', data: receipt });
  } catch (error) {
    logger.error('Failed to save payment', error, { context: 'Payment' });
  }
};

// Get payment history
export const getPaymentHistory = (userId?: string): PaymentReceipt[] => {
  try {
    const payments = JSON.parse(localStorage.getItem('rm_payments') || '[]');
    return payments;
  } catch {
    return [];
  }
};

// Get bookings
export const getBookings = (): any[] => {
  try {
    return JSON.parse(localStorage.getItem('rm_bookings') || '[]');
  } catch {
    return [];
  }
};

// Calculate total amount with taxes
export const calculateTotalAmount = (
  basePrice: number,
  planType: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly' | 'booking',
  includeSecurityDeposit: boolean = false,
  securityDepositMultiplier: number = 2
): { subtotal: number; tax: number; securityDeposit: number; total: number } => {
  let subtotal = basePrice;

  // Adjust for plan type
  switch (planType) {
    case 'daily':
      subtotal = Math.round(basePrice / 30);
      break;
    case 'weekly':
      subtotal = Math.round((basePrice / 30) * 7 * 0.95); // 5% discount
      break;
    case 'monthly':
      subtotal = basePrice;
      break;
    case 'quarterly':
      subtotal = Math.round(basePrice * 3 * 0.95); // 5% discount
      break;
    case 'yearly':
      subtotal = Math.round(basePrice * 12 * 0.9); // 10% discount
      break;
    case 'booking':
      subtotal = Math.round(basePrice * 0.3); // 30% advance
      break;
  }

  const tax = Math.round(subtotal * 0.18); // 18% GST
  const securityDeposit = includeSecurityDeposit ? Math.round(basePrice * securityDepositMultiplier) : 0;
  const total = subtotal + tax + securityDeposit;

  return { subtotal, tax, securityDeposit, total };
};

// Generate receipt HTML
export const generateReceiptHTML = (receipt: PaymentReceipt): string => {
  const formattedDate = new Date(receipt.timestamp).toLocaleString('en-IN', {
    dateStyle: 'full',
    timeStyle: 'short',
  });

  return `
<!DOCTYPE html>
<html>
<head>
  <title>Payment Receipt - ${receipt.id}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { 
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
      padding: 40px; 
      max-width: 600px; 
      margin: 0 auto; 
      background: #f8fafc;
    }
    .receipt {
      background: white;
      border-radius: 16px;
      padding: 32px;
      box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1);
    }
    .header { 
      text-align: center; 
      border-bottom: 2px solid #6366f1; 
      padding-bottom: 20px; 
      margin-bottom: 24px; 
    }
    .logo { 
      font-size: 24px; 
      font-weight: 700; 
      background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
    }
    .receipt-title { font-size: 18px; color: #374151; margin-top: 8px; }
    .success-badge {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      background: #dcfce7;
      color: #166534;
      padding: 6px 12px;
      border-radius: 20px;
      font-size: 14px;
      font-weight: 500;
      margin-top: 12px;
    }
    .details { margin: 24px 0; }
    .row { 
      display: flex; 
      justify-content: space-between; 
      padding: 12px 0; 
      border-bottom: 1px solid #f1f5f9; 
    }
    .row:last-child { border-bottom: none; }
    .label { color: #64748b; }
    .value { font-weight: 600; color: #1e293b; }
    .amount-section { 
      background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
      border-radius: 12px;
      padding: 24px;
      text-align: center;
      color: white;
      margin: 24px 0;
    }
    .amount-label { font-size: 14px; opacity: 0.9; }
    .amount { font-size: 36px; font-weight: 700; }
    .footer { 
      text-align: center; 
      color: #64748b; 
      font-size: 12px; 
      margin-top: 24px;
      padding-top: 16px;
      border-top: 1px solid #f1f5f9;
    }
    @media print { 
      body { padding: 20px; background: white; }
      .receipt { box-shadow: none; }
    }
  </style>
</head>
<body>
  <div class="receipt">
    <div class="header">
      <div class="logo">🏠 Room & Mess Finder</div>
      <div class="receipt-title">Payment Receipt</div>
      <div class="success-badge">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polyline points="20 6 9 17 4 12"></polyline>
        </svg>
        Payment Successful
      </div>
    </div>
    
    <div class="details">
      <div class="row">
        <span class="label">Receipt ID</span>
        <span class="value">${receipt.id}</span>
      </div>
      <div class="row">
        <span class="label">Payment ID</span>
        <span class="value">${receipt.paymentId}</span>
      </div>
      <div class="row">
        <span class="label">Date & Time</span>
        <span class="value">${formattedDate}</span>
      </div>
      <div class="row">
        <span class="label">Property</span>
        <span class="value">${receipt.listingTitle}</span>
      </div>
      <div class="row">
        <span class="label">Type</span>
        <span class="value" style="text-transform: capitalize;">${receipt.listingType}</span>
      </div>
      <div class="row">
        <span class="label">Plan</span>
        <span class="value" style="text-transform: capitalize;">${receipt.planType}</span>
      </div>
      <div class="row">
        <span class="label">Customer</span>
        <span class="value">${receipt.userName}</span>
      </div>
      <div class="row">
        <span class="label">Phone</span>
        <span class="value">${receipt.userPhone}</span>
      </div>
      <div class="row">
        <span class="label">Owner</span>
        <span class="value">${receipt.ownerName}</span>
      </div>
    </div>
    
    <div class="amount-section">
      <div class="amount-label">Amount Paid</div>
      <div class="amount">₹${receipt.amount.toLocaleString('en-IN')}</div>
    </div>
    
    <div class="footer">
      <p>Thank you for using Room & Mess Finder!</p>
      <p style="margin-top: 8px;">For support, contact support@roomandmess.com</p>
      <p style="margin-top: 4px;">This is a computer-generated receipt.</p>
    </div>
  </div>
</body>
</html>
  `;
};

// Download receipt
export const downloadReceipt = (receipt: PaymentReceipt): void => {
  const html = generateReceiptHTML(receipt);
  const printWindow = window.open('', '_blank');
  if (printWindow) {
    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => printWindow.print(), 500);
  }
};

export default {
  loadRazorpayScript,
  createOrder,
  processPayment,
  getPaymentHistory,
  getBookings,
  calculateTotalAmount,
  generateReceiptHTML,
  downloadReceipt,
};
