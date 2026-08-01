import jsPDF from "jspdf";
import { PaymentResult } from "@/components/payment/PaymentResultModal";

export interface ReceiptData extends PaymentResult {
    receiptNumber?: string;
    gstNumber?: string;
    companyName?: string;
    companyAddress?: string;
}

// Generate unique receipt number
const generateReceiptNumber = (): string => {
    const date = new Date();
    const year = date.getFullYear().toString().slice(-2);
    const month = (date.getMonth() + 1).toString().padStart(2, "0");
    const random = Math.random().toString(36).substring(2, 8).toUpperCase();
    return `RM${year}${month}-${random}`;
};

// Format currency
const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat("en-IN", {
        style: "currency",
        currency: "INR",
        maximumFractionDigits: 0,
    }).format(amount);
};

// Format date
const formatDate = (date: Date): string => {
    return new Intl.DateTimeFormat("en-IN", {
        dateStyle: "long",
        timeStyle: "short",
    }).format(date);
};

export const generateReceiptPDF = async (data: ReceiptData): Promise<Blob> => {
    const pdf = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
    });

    const pageWidth = pdf.internal.pageSize.getWidth();
    const margin = 20;
    let yPos = 20;

    // Colors
    const primaryColor: [number, number, number] = [20, 184, 166]; // Teal
    const textColor: [number, number, number] = [31, 41, 55];
    const mutedColor: [number, number, number] = [107, 114, 128];
    const successColor: [number, number, number] = [16, 185, 129];

    // Generate receipt number
    const receiptNumber = data.receiptNumber || generateReceiptNumber();

    // Header Background
    pdf.setFillColor(...primaryColor);
    pdf.rect(0, 0, pageWidth, 50, "F");

    // Company Logo/Name
    pdf.setTextColor(255, 255, 255);
    pdf.setFontSize(24);
    pdf.setFont("helvetica", "bold");
    pdf.text("Room & Mess Finder", margin, yPos + 10);

    pdf.setFontSize(10);
    pdf.setFont("helvetica", "normal");
    pdf.text("Your trusted platform for accommodation", margin, yPos + 18);

    // Receipt Title
    pdf.setFontSize(14);
    pdf.setFont("helvetica", "bold");
    pdf.text("PAYMENT RECEIPT", pageWidth - margin - 50, yPos + 10);

    pdf.setFontSize(10);
    pdf.setFont("helvetica", "normal");
    pdf.text(`#${receiptNumber}`, pageWidth - margin - 50, yPos + 18);

    yPos = 60;

    // Status Badge
    if (data.success) {
        pdf.setFillColor(...successColor);
        pdf.roundedRect(margin, yPos, 50, 10, 2, 2, "F");
        pdf.setTextColor(255, 255, 255);
        pdf.setFontSize(10);
        pdf.setFont("helvetica", "bold");
        pdf.text("✓ PAID", margin + 18, yPos + 7);
    } else {
        pdf.setFillColor(239, 68, 68);
        pdf.roundedRect(margin, yPos, 50, 10, 2, 2, "F");
        pdf.setTextColor(255, 255, 255);
        pdf.setFontSize(10);
        pdf.setFont("helvetica", "bold");
        pdf.text("✗ FAILED", margin + 15, yPos + 7);
    }

    // Date on right
    pdf.setTextColor(...mutedColor);
    pdf.setFont("helvetica", "normal");
    pdf.text(`Date: ${formatDate(data.transactionDate)}`, pageWidth - margin - 60, yPos + 7);

    yPos += 25;

    // Divider
    pdf.setDrawColor(229, 231, 235);
    pdf.setLineWidth(0.5);
    pdf.line(margin, yPos, pageWidth - margin, yPos);

    yPos += 15;

    // Two column layout for customer and payment info
    const col1X = margin;
    const col2X = pageWidth / 2 + 10;

    // Customer Information
    pdf.setTextColor(...primaryColor);
    pdf.setFontSize(12);
    pdf.setFont("helvetica", "bold");
    pdf.text("CUSTOMER DETAILS", col1X, yPos);

    yPos += 8;
    pdf.setTextColor(...textColor);
    pdf.setFontSize(10);
    pdf.setFont("helvetica", "normal");

    const customerDetails = [
        ["Name", data.userName],
        ["Email", data.userEmail],
        ["Phone", data.userPhone],
    ];

    customerDetails.forEach(([label, value]) => {
        pdf.setTextColor(...mutedColor);
        pdf.text(`${label}:`, col1X, yPos);
        pdf.setTextColor(...textColor);
        pdf.setFont("helvetica", "bold");
        pdf.text(value || "N/A", col1X + 25, yPos);
        pdf.setFont("helvetica", "normal");
        yPos += 7;
    });

    // Reset yPos for column 2
    yPos -= 21;

    // Payment Information
    pdf.setTextColor(...primaryColor);
    pdf.setFontSize(12);
    pdf.setFont("helvetica", "bold");
    pdf.text("PAYMENT DETAILS", col2X, yPos - 8);

    pdf.setTextColor(...textColor);
    pdf.setFontSize(10);
    pdf.setFont("helvetica", "normal");

    const paymentDetails = [
        ["Payment ID", data.paymentId?.slice(0, 20) || "N/A"],
        ["Order ID", data.orderId?.slice(0, 20) || "N/A"],
        ["Method", "Razorpay (Online)"],
    ];

    paymentDetails.forEach(([label, value]) => {
        pdf.setTextColor(...mutedColor);
        pdf.text(`${label}:`, col2X, yPos);
        pdf.setTextColor(...textColor);
        pdf.setFont("helvetica", "bold");
        pdf.text(value, col2X + 30, yPos);
        pdf.setFont("helvetica", "normal");
        yPos += 7;
    });

    yPos += 15;

    // Divider
    pdf.setDrawColor(229, 231, 235);
    pdf.line(margin, yPos, pageWidth - margin, yPos);

    yPos += 15;

    // Booking/Subscription Details
    pdf.setTextColor(...primaryColor);
    pdf.setFontSize(12);
    pdf.setFont("helvetica", "bold");
    pdf.text(data.listingType === "room" ? "BOOKING DETAILS" : "SUBSCRIPTION DETAILS", margin, yPos);

    yPos += 10;

    // Table Header
    pdf.setFillColor(249, 250, 251);
    pdf.rect(margin, yPos, pageWidth - 2 * margin, 10, "F");
    pdf.setTextColor(...textColor);
    pdf.setFontSize(9);
    pdf.setFont("helvetica", "bold");
    pdf.text("Description", margin + 5, yPos + 7);
    pdf.text("Plan", pageWidth / 2, yPos + 7);
    pdf.text("Amount", pageWidth - margin - 30, yPos + 7);

    yPos += 12;

    // Table Row
    pdf.setFont("helvetica", "normal");
    pdf.setTextColor(...textColor);

    // Truncate listing name if too long
    const maxNameLength = 40;
    const displayName = data.listingName.length > maxNameLength
        ? data.listingName.substring(0, maxNameLength) + "..."
        : data.listingName;

    pdf.text(displayName, margin + 5, yPos + 5);
    pdf.text(`${data.planType || "Standard"} (${data.duration || "Monthly"})`, pageWidth / 2, yPos + 5);
    pdf.setFont("helvetica", "bold");
    pdf.text(formatCurrency(data.amount), pageWidth - margin - 30, yPos + 5);

    yPos += 15;

    // Total Box
    pdf.setFillColor(240, 253, 244);
    pdf.rect(pageWidth - margin - 80, yPos, 80, 20, "F");
    pdf.setDrawColor(...successColor);
    pdf.rect(pageWidth - margin - 80, yPos, 80, 20, "S");

    pdf.setTextColor(...textColor);
    pdf.setFontSize(10);
    pdf.setFont("helvetica", "bold");
    pdf.text("Total Paid:", pageWidth - margin - 75, yPos + 8);
    pdf.setFontSize(14);
    pdf.setTextColor(...successColor);
    pdf.text(formatCurrency(data.amount), pageWidth - margin - 75, yPos + 16);

    yPos += 35;

    // Important Notes
    pdf.setTextColor(...primaryColor);
    pdf.setFontSize(11);
    pdf.setFont("helvetica", "bold");
    pdf.text("IMPORTANT INFORMATION", margin, yPos);

    yPos += 8;
    pdf.setTextColor(...mutedColor);
    pdf.setFontSize(9);
    pdf.setFont("helvetica", "normal");

    const notes = [
        "• This is a computer-generated receipt and does not require a signature.",
        "• Please keep this receipt for your records.",
        "• For any queries, contact us at roommess8@gmail.com",
        "• Refund policy: Cancellations made within 24 hours are eligible for a full refund.",
        data.listingType === "room"
            ? "• Your room booking is confirmed. The owner will contact you shortly."
            : "• Your mess subscription is active. Enjoy your meals!",
    ];

    notes.forEach((note) => {
        pdf.text(note, margin, yPos);
        yPos += 6;
    });

    yPos += 10;

    // Footer
    pdf.setDrawColor(229, 231, 235);
    pdf.line(margin, yPos, pageWidth - margin, yPos);

    yPos += 10;

    pdf.setTextColor(...mutedColor);
    pdf.setFontSize(8);
    pdf.text("Room & Mess Finder | Kolhapur, Maharashtra, India", pageWidth / 2, yPos, { align: "center" });
    pdf.text("www.roomandmess.com | roommess8@gmail.com", pageWidth / 2, yPos + 5, { align: "center" });
    pdf.text(`Generated on ${formatDate(new Date())}`, pageWidth / 2, yPos + 10, { align: "center" });

    // Return as blob
    return pdf.output("blob");
};

// Download the PDF
export const downloadReceiptPDF = async (data: ReceiptData): Promise<void> => {
    const blob = await generateReceiptPDF(data);
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `RoomMess_Receipt_${data.paymentId?.slice(-8) || "receipt"}.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
};

// Send receipt via email (calls Supabase edge function)
export const emailReceipt = async (data: ReceiptData): Promise<boolean> => {
    try {
        // Generate PDF as base64
        const blob = await generateReceiptPDF(data);
        const reader = new FileReader();

        return new Promise((resolve, reject) => {
            reader.onloadend = async () => {
                const base64 = (reader.result as string).split(",")[1];

                // Call Supabase edge function to send email
                const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
                const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

                if (!supabaseUrl || !supabaseAnonKey) {
                    console.log("Supabase not configured, email cannot be sent");
                    resolve(true); // Still resolve so user can download
                    return;
                }

                try {
                    const response = await fetch(`${supabaseUrl}/functions/v1/send-receipt-email`, {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json",
                            "Authorization": `Bearer ${supabaseAnonKey}`,
                        },
                        body: JSON.stringify({
                            to: data.userEmail,
                            userName: data.userName,
                            paymentId: data.paymentId,
                            amount: data.amount,
                            listingName: data.listingName,
                            listingType: data.listingType,
                            pdfBase64: base64,
                        }),
                    });

                    const result = await response.json();

                    if (response.ok && result.success) {
                        console.log("Email sent successfully");
                        resolve(true);
                    } else {
                        console.log("Email send failed, but receipt can be downloaded");
                        resolve(true); // Still resolve so user can download
                    }
                } catch (fetchError) {
                    console.error("Error calling edge function:", fetchError);
                    resolve(true); // Still resolve so user can download
                }
            };
            reader.onerror = () => {
                console.error("Error reading PDF blob");
                resolve(true); // Still resolve so user can download
            };
            reader.readAsDataURL(blob);
        });
    } catch (error) {
        console.error("Error sending email:", error);
        return true; // Return true anyway since user can download
    }
};
