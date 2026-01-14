// services/brevoService.js
import SibApiV3Sdk from "sib-api-v3-sdk";

export async function sendBookingConfirmation({ toEmail, toName, booking, event }) {
  const apiKey = process.env.BREVO_API_KEY;
  if (!apiKey) throw new Error("Missing BREVO_API_KEY in environment");

  // ✅ Set key at send-time (fixes dotenv/import order issues)
  const client = SibApiV3Sdk.ApiClient.instance;
  client.authentications["api-key"].apiKey = apiKey;

  const transactionalApi = new SibApiV3Sdk.TransactionalEmailsApi();

  const senderEmail = process.env.BREVO_SENDER_EMAIL;
  const senderName = process.env.BREVO_SENDER_NAME || "Victoria Hall";

  if (!senderEmail) throw new Error("Missing BREVO_SENDER_EMAIL in environment");

  const email = {
    sender: { email: senderEmail, name: senderName },
    to: [{ email: toEmail, name: toName }],
    subject: "🎟️ Your Victoria Hall Ticket Confirmation",
    htmlContent: `
      <h2>Thank you for your booking, ${toName}!</h2>

      <p><strong>Event:</strong> ${event?.title || "Victoria Hall Event"}</p>
      <p><strong>Date:</strong> ${event?.dateLabel || ""} ${event?.timeLabel || ""}</p>
      <p><strong>Venue:</strong> ${event?.venue || "Victoria Hall"}</p>

      <hr />

      <p><strong>Booking ID:</strong> ${booking?._id}</p>
      <p><strong>Total Paid:</strong> £${Number(booking?.pricing?.total || 0).toFixed(2)}</p>

      <p>Your ticket has been successfully issued.</p>
      <p><strong>Victoria Hall Team</strong></p>
    `,
  };
  console.log("BREVO KEY PRESENT:", !!process.env.BREVO_API_KEY);
  console.log("BREVO KEY PREFIX:", process.env.BREVO_API_KEY?.slice(0, 10));
  
  return transactionalApi.sendTransacEmail(email);
}
