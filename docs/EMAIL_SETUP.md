# Payment Receipt Email Setup

This guide explains how to set up the email functionality for sending payment receipts.

## Features

✅ **Automated Email Receipts** - Sent immediately after successful payment
✅ **PDF Attachment** - Professional receipt PDF attached to email
✅ **Beautiful HTML Template** - Responsive email design
✅ **Transaction Details** - Payment ID, amount, listing info included

## Setup Instructions

### 1. Get Resend API Key

1. Go to [Resend.com](https://resend.com)
2. Sign up for a free account (100 emails/day free)
3. Verify your domain (or use their test domain for development)
4. Get your API key from the dashboard

### 2. Configure Supabase Edge Function

1. Install Supabase CLI if you haven't:
   ```bash
   npm install -g supabase
   ```

2. Login to Supabase:
   ```bash
   supabase login
   ```

3. Link your project:
   ```bash
   supabase link --project-ref YOUR_PROJECT_REF
   ```

4. Set the Resend API key as a secret:
   ```bash
   supabase secrets set RESEND_API_KEY=re_your_api_key_here
   ```

5. Deploy the edge function:
   ```bash
   supabase functions deploy send-receipt-email
   ```

### 3. Test the Email Function

After deployment, test it:

```bash
curl -X POST 'https://YOUR_PROJECT_REF.supabase.co/functions/v1/send-receipt-email' \
  -H 'Authorization: Bearer YOUR_ANON_KEY' \
  -H 'Content-Type: application/json' \
  -d '{
    "to": "test@example.com",
    "userName": "Test User",
    "paymentId": "pay_test123",
    "amount": 5000,
    "listingName": "Test Room",
    "listingType": "room"
  }'
```

## How It Works

### Payment Flow

1. **User completes payment** → Razorpay processes payment
2. **Payment success** → `PaymentResultModal` appears with confetti 🎉
3. **User clicks "Email Receipt"** → Triggers email send
4. **Receipt generated** → PDF created with jsPDF
5. **Email sent** → Supabase Edge Function sends email via Resend
6. **User receives email** → Beautiful HTML email with PDF attachment

### Files Involved

- `src/components/payment/PaymentResultModal.tsx` - Animated success/failure modal
- `src/services/receiptService.ts` - PDF generation and email trigger
- `supabase/functions/send-receipt-email/index.ts` - Email sending edge function

## Email Template Features

The email includes:

- ✅ Success badge with checkmark
- 💰 Large amount display
- 📋 Transaction details (Payment ID, listing name, date)
- 📝 Next steps for the user
- 📎 PDF receipt attachment
- 🎨 Responsive design (looks great on mobile)

## Customization

### Change Email Sender

Edit `supabase/functions/send-receipt-email/index.ts`:

```typescript
from: "Your Company <noreply@yourdomain.com>",
```

### Modify Email Template

The HTML template is in the same file. You can customize:
- Colors (currently using teal theme)
- Logo/branding
- Content sections
- Footer information

### Add More Details

You can add more fields to the email by:

1. Update the `EmailRequest` interface
2. Add the field to the email HTML template
3. Pass the data from `receiptService.ts`

## Troubleshooting

### Emails not sending?

1. Check Supabase logs:
   ```bash
   supabase functions logs send-receipt-email
   ```

2. Verify API key is set:
   ```bash
   supabase secrets list
   ```

3. Check Resend dashboard for delivery status

### PDF not attaching?

- Ensure `pdfBase64` is being passed correctly
- Check file size (Resend has a 40MB limit)
- Verify base64 encoding is working

### Email goes to spam?

- Verify your domain with Resend
- Add SPF/DKIM records
- Use a professional "from" address

## Development Mode

Without Resend API key configured, the system will:
- ✅ Still show success message
- ✅ Allow PDF download
- ⚠️ Log "Email simulated" instead of sending

This allows development without email setup.

## Production Checklist

Before going live:

- [ ] Resend API key configured
- [ ] Domain verified in Resend
- [ ] Edge function deployed
- [ ] Test email sent successfully
- [ ] Spam folder checked
- [ ] Mobile email rendering tested
- [ ] PDF attachment working
- [ ] Error handling tested

## Cost

**Resend Pricing:**
- Free: 100 emails/day, 3,000/month
- Pro: $20/month for 50,000 emails
- Business: Custom pricing

For most startups, the free tier is sufficient!

## Support

If you need help:
1. Check Supabase logs
2. Check Resend dashboard
3. Review this documentation
4. Contact support@roomandmess.com
