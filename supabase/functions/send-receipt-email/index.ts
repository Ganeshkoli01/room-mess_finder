import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface EmailRequest {
    to: string;
    userName: string;
    paymentId: string;
    amount: number;
    listingName: string;
    listingType: "room" | "mess";
    pdfBase64?: string;
}

serve(async (req) => {
    // Handle CORS preflight
    if (req.method === "OPTIONS") {
        return new Response(null, { headers: corsHeaders });
    }

    try {
        const resendApiKey = Deno.env.get("RESEND_API_KEY");

        if (!resendApiKey) {
            console.log("RESEND_API_KEY not configured, simulating email send");
            return new Response(
                JSON.stringify({ success: true, message: "Email simulated (API key not configured)" }),
                { headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        const resend = new Resend(resendApiKey);
        const body: EmailRequest = await req.json();

        const { to, userName, paymentId, amount, listingName, listingType, pdfBase64 } = body;

        // Format amount
        const formattedAmount = new Intl.NumberFormat("en-IN", {
            style: "currency",
            currency: "INR",
            maximumFractionDigits: 0,
        }).format(amount);

        // Email HTML template
        const emailHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Payment Receipt</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f4f7fa;">
  <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
    <!-- Header -->
    <tr>
      <td style="background: linear-gradient(135deg, #14b8a6 0%, #0d9488 100%); padding: 40px 30px; text-align: center;">
        <h1 style="color: #ffffff; margin: 0; font-size: 28px;">Room & Mess Finder</h1>
        <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0; font-size: 14px;">Payment Receipt</p>
      </td>
    </tr>
    
    <!-- Success Badge -->
    <tr>
      <td style="padding: 30px 30px 20px 30px; text-align: center;">
        <div style="display: inline-block; background-color: #10b981; color: white; padding: 10px 25px; border-radius: 50px; font-weight: bold;">
          ✓ Payment Successful
        </div>
      </td>
    </tr>
    
    <!-- Greeting -->
    <tr>
      <td style="padding: 0 30px 20px 30px;">
        <h2 style="color: #1f2937; margin: 0 0 10px 0; font-size: 22px;">Hello ${userName}! 🎉</h2>
        <p style="color: #6b7280; margin: 0; font-size: 15px; line-height: 1.6;">
          Thank you for your ${listingType === "room" ? "room booking" : "mess subscription"}. Your payment has been successfully processed.
        </p>
      </td>
    </tr>
    
    <!-- Amount Box -->
    <tr>
      <td style="padding: 0 30px 30px 30px;">
        <div style="background-color: #f0fdf4; border: 2px solid #10b981; border-radius: 12px; padding: 25px; text-align: center;">
          <p style="color: #6b7280; margin: 0 0 5px 0; font-size: 14px;">Amount Paid</p>
          <p style="color: #10b981; margin: 0; font-size: 36px; font-weight: bold;">${formattedAmount}</p>
        </div>
      </td>
    </tr>
    
    <!-- Details -->
    <tr>
      <td style="padding: 0 30px 30px 30px;">
        <div style="background-color: #f9fafb; border-radius: 12px; padding: 20px;">
          <h3 style="color: #1f2937; margin: 0 0 15px 0; font-size: 16px;">Transaction Details</h3>
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr>
              <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Payment ID</td>
              <td style="padding: 8px 0; color: #1f2937; font-size: 14px; text-align: right; font-family: monospace;">${paymentId}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">${listingType === "room" ? "Room" : "Mess"}</td>
              <td style="padding: 8px 0; color: #1f2937; font-size: 14px; text-align: right;">${listingName}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Date</td>
              <td style="padding: 8px 0; color: #1f2937; font-size: 14px; text-align: right;">${new Date().toLocaleDateString("en-IN", { dateStyle: "long" })}</td>
            </tr>
          </table>
        </div>
      </td>
    </tr>
    
    <!-- Next Steps -->
    <tr>
      <td style="padding: 0 30px 30px 30px;">
        <h3 style="color: #1f2937; margin: 0 0 15px 0; font-size: 16px;">What's Next?</h3>
        <ul style="color: #6b7280; margin: 0; padding-left: 20px; font-size: 14px; line-height: 1.8;">
          ${listingType === "room"
                ? `<li>The property owner will contact you shortly</li>
               <li>Keep this receipt for your records</li>
               <li>Check your dashboard for booking details</li>`
                : `<li>Your mess subscription is now active</li>
               <li>Visit the mess to start your meals</li>
               <li>Check your dashboard for subscription details</li>`
            }
        </ul>
      </td>
    </tr>
    
    <!-- Footer -->
    <tr>
      <td style="background-color: #f9fafb; padding: 25px 30px; text-align: center; border-top: 1px solid #e5e7eb;">
        <p style="color: #6b7280; margin: 0 0 10px 0; font-size: 13px;">
          Need help? Contact us at <a href="mailto:support@roomandmess.com" style="color: #14b8a6;">support@roomandmess.com</a>
        </p>
        <p style="color: #9ca3af; margin: 0; font-size: 12px;">
          © ${new Date().getFullYear()} Room & Mess Finder. All rights reserved.
        </p>
      </td>
    </tr>
  </table>
</body>
</html>
    `;

        // Prepare attachments if PDF is provided
        const attachments = pdfBase64 ? [{
            filename: `RoomMess_Receipt_${paymentId.slice(-8)}.pdf`,
            content: pdfBase64,
        }] : [];

        // Send email
        const { data, error } = await resend.emails.send({
            from: "Room & Mess Finder <noreply@roomandmess.com>",
            to: [to],
            subject: `Payment Receipt - ${formattedAmount} | Room & Mess Finder`,
            html: emailHtml,
            attachments,
        });

        if (error) {
            console.error("Email send error:", error);
            return new Response(
                JSON.stringify({ success: false, error: error.message }),
                { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        return new Response(
            JSON.stringify({ success: true, messageId: data?.id }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );

    } catch (error) {
        console.error("Error:", error);
        return new Response(
            JSON.stringify({ success: false, error: error.message }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    }
});
