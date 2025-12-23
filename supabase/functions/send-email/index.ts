// Supabase Edge Function: send-email
// Deploy this to your Supabase project: supabase functions deploy send-email

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const SENDGRID_API_KEY = Deno.env.get("SENDGRID_API_KEY");
const FROM_EMAIL = Deno.env.get("SENDGRID_FROM_EMAIL") || "noreply@roomandmess.com";

interface EmailRequest {
    to: string;
    subject: string;
    html: string;
    text?: string;
}

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
    // Handle CORS preflight
    if (req.method === "OPTIONS") {
        return new Response("ok", { headers: corsHeaders });
    }

    try {
        const { to, subject, html, text }: EmailRequest = await req.json();

        if (!to || !subject || !html) {
            return new Response(
                JSON.stringify({ error: "Missing required fields: to, subject, html" }),
                { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        if (!SENDGRID_API_KEY) {
            console.log("SendGrid API key not configured, logging email for manual send");
            console.log("TO:", to);
            console.log("SUBJECT:", subject);
            console.log("TEXT:", text || "No text version");

            return new Response(
                JSON.stringify({ success: true, message: "Email logged (SendGrid not configured)" }),
                { headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        // Send email via SendGrid
        const response = await fetch("https://api.sendgrid.com/v3/mail/send", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${SENDGRID_API_KEY}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                personalizations: [{ to: [{ email: to }] }],
                from: { email: FROM_EMAIL, name: "Room & Mess Finder" },
                subject,
                content: [
                    { type: "text/plain", value: text || subject },
                    { type: "text/html", value: html },
                ],
            }),
        });

        if (!response.ok) {
            const error = await response.text();
            console.error("SendGrid error:", error);
            return new Response(
                JSON.stringify({ error: "Failed to send email", details: error }),
                { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        return new Response(
            JSON.stringify({ success: true, message: "Email sent successfully" }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    } catch (error) {
        console.error("Error:", error);
        return new Response(
            JSON.stringify({ error: error.message }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    }
});
