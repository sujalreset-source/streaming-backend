import nodemailer from "nodemailer";

export const sendInvoiceEmail = async (to, invoiceData) => {
  const transporter = nodemailer.createTransport({
    service: "Gmail", // or use SMTP (recommended for production)
    host: process.env.SMTP_HOST,
    port: process.env.SMTP_PORT,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

  const mailOptions = {
    from: `"MyApp" <${process.env.EMAIL_USER}>`,
    to,
    subject: "Your Subscription Invoice",
    html: `
      <h2>Thanks for your payment 🎉</h2>
      <p>Invoice ID: <b>${invoiceData.id}</b></p>
      <p>Amount: ₹${invoiceData.amount_paid / 100}</p>
      <p>Status: ${invoiceData.status}</p>
      <p>Date: ${new Date(invoiceData.created_at * 1000).toLocaleString()}</p>
    `,
  };

  await transporter.sendMail(mailOptions);
};
