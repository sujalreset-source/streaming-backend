// utils/email.js
import nodemailer from "nodemailer";

export const sendInvoiceEmail = async (to, invoiceBuffer, invoiceNumber) => {
  const transporter = nodemailer.createTransport({
    service: "gmail", // or SES/SendGrid/SMTP
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

  await transporter.sendMail({
    from: `"My Music App" <${process.env.SMTP_USER}>`,
    to,
    subject: `Your Invoice #${invoiceNumber}`,
    text: "Attached is your invoice for the recent transaction.",
    attachments: [
      {
        filename: `invoice-${invoiceNumber}.pdf`,
        content: invoiceBuffer,   // 👈 attach buffer directly
        contentType: "application/pdf",
      },
    ],
  });
};
