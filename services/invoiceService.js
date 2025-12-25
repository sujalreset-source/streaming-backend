// services/invoiceService.js
import PDFDocument from "pdfkit";
import nodemailer from "nodemailer";
import { User } from "../models/User.js";

// Helper: format date
const formatDate = (date) => new Date(date).toLocaleDateString("en-IN");

// 🔹 Build invoice data object from transaction
export const prepareInvoiceData = async (transaction) => {
    if (!transaction) return null;
   const user = await User.findById(transaction.userId)
  .select("name email")
  .lean();
    if (!user) return null;
    console.log("Preparing invoice data for user:", user);

  return {
    invoiceNumber: transaction.invoiceNumber, // or a real sequence generator
    transactionId: transaction._id.toString(),
    issueDate: new Date(),
    seller: {
      name: "Reset Music",
      address: `45 Malviya Nagar road
New Delhi, Delhi 110017
India`, 
      email: "contact@reset93.net",
    },
    customer: {
      name: user.name || "Valued Customer",
      email: user.email,
    },
    items: [
      {
        description:
          transaction.itemType === "subscription"
            ? `Artist Subscription`
            : `${transaction.itemType} purchase`,
        quantity: 1,
        price: transaction.amount,
        total: transaction.amount,
      },
    ],
    subtotal:  transaction.amount,
    currency: transaction.currency || "INR",
    taxBreakdown: [], // extend later if GST/VAT
    total:  transaction.amount,
    amountPaid: transaction.amount,
    balanceDue: 0,
  };
};

// 🔹 Generate invoice PDF buffer
const generateInvoiceBuffer = (invoice) => {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ margin: 50 });
      const buffers = [];
      doc.on("data", buffers.push.bind(buffers));
      doc.on("end", () => resolve(Buffer.concat(buffers)));

      const startX = doc.page.margins.left;
      const endX = doc.page.width - doc.page.margins.right;

      // ------------------- Logo -------------------
    //   if (logoPath) {
    //     if (logoPath.endsWith(".svg")) {
    //       const svg = fs.readFileSync(logoPath, "utf8");
    //       SVGtoPDF(doc, svg, startX, doc.y, { width: 100 });
    //       doc.moveDown(2);
    //     } else {
    //       doc.image(logoPath, startX, doc.y, { width: 100 });
    //       doc.moveDown(2);
    //     }
    //   }

      // ------------------- Fonts -------------------
    //   doc.font("fonts/NotoSans-Regular.ttf"); // make sure font file exists

      // ------------------- Seller Info -------------------
      doc.fontSize(20).font("Helvetica-Bold").text(invoice.seller.name, startX, doc.y);
      doc.fontSize(10).font("Helvetica").text(invoice.seller.address);
      doc.text(invoice.seller.email || "");
      doc.text(invoice.seller.phone || "");
      doc.moveDown();

      // ------------------- Invoice Header -------------------
      doc.fontSize(14).font("Helvetica-Bold")
        .text("INVOICE", endX - 100, doc.y - 50, { width: 100, align: "right" });
      doc.fontSize(10).font("Helvetica")
        .text(`Invoice #${invoice.invoiceNumber}`, { align: "right" });
      doc.text(`Transaction ID: ${invoice.transactionId}`, { align: "right" });
      doc.text(`Issue Date: ${formatDate(invoice.issueDate)}`, { align: "right" });
      doc.moveDown(2);

      // ------------------- Separator -------------------
      doc.strokeColor("#aaaaaa").lineWidth(1)
        .moveTo(startX, doc.y).lineTo(endX, doc.y).stroke();
      doc.moveDown();

      // ------------------- Customer Info -------------------
      doc.fontSize(10).font("Helvetica-Bold").text("INVOICE TO:");
      doc.font("Helvetica").text(invoice.customer.name || "");
      doc.text(invoice.customer.email || "");
      doc.text(invoice.customer.phone || "");
      doc.moveDown(2);

      // ------------------- Table -------------------
      const descriptionX = startX,
            quantityX = 300,
            priceX = 380,
            totalX = 450;
      let tableY = doc.y;

      // Table Header
      doc.font("Helvetica-Bold").fontSize(10);
      doc.text("Product/Service", descriptionX, tableY);
      doc.text("Qty", quantityX, tableY, { width: 50, align: "right" });
      doc.text("Price", priceX, tableY, { width: 70, align: "right" });
      doc.text("Total", totalX, tableY, { width: 70, align: "right" });

      tableY += 20;
      doc.strokeColor("#cccccc").lineWidth(1)
        .moveTo(startX, tableY - 5).lineTo(endX, tableY - 5).stroke();

      // Table Rows
      doc.font("Helvetica").fontSize(10);
      invoice.items.forEach((item) => {
        const rowHeight = Math.max(
          doc.heightOfString(item.description, { width: quantityX - descriptionX - 10 }),
          doc.heightOfString(item.quantity.toString(), { width: 50 }),
          doc.heightOfString(item.price.toFixed(2), { width: 70 }),
          doc.heightOfString(item.total.toFixed(2), { width: 70 })
        ) + 5;

        doc.text(item.description, descriptionX, tableY, { width: quantityX - descriptionX - 10 });
        doc.text(item.quantity.toString(), quantityX, tableY, { width: 50, align: "right" });
        doc.text(item.price.toFixed(2), priceX, tableY, { width: 70, align: "right" });
        doc.text(item.total.toFixed(2), totalX, tableY, { width: 70, align: "right" });

        tableY += rowHeight;

        // optional row separator
        doc.strokeColor("#eeeeee").lineWidth(0.5)
          .moveTo(startX, tableY - 2).lineTo(endX, tableY - 2).stroke();
      });

      // ------------------- Totals -------------------
      doc.moveDown(1);
      const totalsX = endX - 150;
      doc.font("Helvetica-Bold").text("Subtotal:", totalsX, tableY, { width: 100, align: "right" });
      doc.font("Helvetica").text(`${invoice.currency} ${invoice.subtotal.toFixed(2)}`, endX - 100, tableY, { width: 100, align: "right" });

      tableY += 20;
      doc.font("Helvetica-Bold").text("Invoice Total:", totalsX, tableY, { width: 100, align: "right" });
      doc.font("Helvetica").text(`${invoice.currency} ${invoice.total.toFixed(2)}`, endX - 100, tableY, { width: 100, align: "right" });

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
};



// 🔹 Send invoice email
const sendInvoiceEmail = async (to, invoiceBuffer, invoiceNumber, subject) => {
  const transporter = nodemailer.createTransport({
    service: "gmail", // replace with SES/SMTP in prod
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
  console.log("Sending invoice email to:", to);

  const htmlBody = `
  <div style="font-family: Arial, sans-serif; color: #333;">
    <h2>🎵 Thank you for your purchase!</h2>
    <p>We’ve attached your invoice <b>#${invoiceNumber}</b> for your reference.</p>
    <p>If you have any questions, contact us at <a href="mailto:support@reset93.net">support@reset93.net</a>.</p>
    <br>
    <p>– Reset Music Team</p>
  </div>
`;

  await transporter.sendMail({
  from: `"Reset Music" <${process.env.SMTP_USER}>`,
  to,
  subject:`Invoice #${invoiceNumber}` ,
  text: `Thank you for your purchase. Your invoice #${invoiceNumber} is attached.`,
  html: htmlBody,
  attachments: [
    {
      filename: `invoice-${invoiceNumber}.pdf`,
      content: invoiceBuffer,
      contentType: "application/pdf",
    },
  ],
});
};

// 🔹 Public function: handles full invoice flow
  export const processAndSendInvoice = async (transaction) => {
    console.log("Processing invoice for transaction:", transaction._id);
  const invoiceData = await prepareInvoiceData(transaction);
  console.log("Prepared invoice data:", invoiceData);
  if (!invoiceData) {
    console.warn("No invoice data available, skipping invoice generation.");
    return;
  }
  const invoiceBuffer = await generateInvoiceBuffer(invoiceData);
  const subjct = `Invoice #${invoiceData.invoiceNumber}`
  console.log("Generated invoice PDF buffer, size:", invoiceBuffer.length);
  await sendInvoiceEmail(invoiceData.customer.email, invoiceBuffer, invoiceData.invoiceNumber);
  console.log("Sent invoice email to:", invoiceData.customer.email);
};
