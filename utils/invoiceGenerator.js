// utils/invoiceGenerator.js
import PDFDocument from "pdfkit";

export const generateInvoiceBuffer = (invoice) => {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ margin: 50 });
      const buffers = [];
      doc.on("data", buffers.push.bind(buffers));
      doc.on("end", () => resolve(Buffer.concat(buffers)));

      // Header
      doc.fontSize(14).text(`Invoice #${invoice.invoiceNumber}`, { align: "right" });
      doc.text(`Issue Date: ${formatDate(invoice.issueDate)}`, { align: "right" });
      doc.text(`Due Date: ${formatDate(invoice.dueDate)}`, { align: "right" });
      doc.moveDown();

      // Seller Info
      doc.fontSize(12).text(invoice.seller.name);
      doc.text(invoice.seller.address);
      doc.text(invoice.seller.email);
      doc.text(invoice.seller.phone);
      doc.moveDown();

      // Customer Info
      doc.fontSize(12).text("Customer Info:");
      doc.text(invoice.customer.name);
      doc.text(invoice.customer.email);
      doc.text(invoice.customer.phone);
      doc.moveDown();

      // Table Header
      doc.fontSize(12).text("Product or Service", 50, doc.y);
      doc.text("Quantity", 300, doc.y);
      doc.text("Price", 380, doc.y);
      doc.text("Line Total", 450, doc.y);
      doc.moveDown();

      // Table Rows
      invoice.items.forEach(item => {
        doc.text(item.description, 50, doc.y);
        doc.text(item.quantity.toString(), 300, doc.y);
        doc.text(`₹${item.price.toFixed(2)}`, 380, doc.y);
        doc.text(`₹${item.total.toFixed(2)}`, 450, doc.y);
        doc.moveDown();
      });

      // Totals
      doc.text(`Subtotal: ₹${invoice.subtotal.toFixed(2)}`, { align: "right" });
      invoice.taxBreakdown.forEach(t => {
        doc.text(`${t.name} (${t.rate}%) ₹${t.amount.toFixed(2)}`, { align: "right" });
      });
      doc.text(`Invoice Total: ₹${invoice.total.toFixed(2)}`, { align: "right" });
      doc.text(`Amount Paid: ₹${invoice.amountPaid.toFixed(2)}`, { align: "right" });
      doc.text(`Balance Due: ₹${invoice.balanceDue.toFixed(2)}`, { align: "right" });

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
};

function formatDate(date) {
  return new Date(date).toLocaleDateString("en-IN", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}
