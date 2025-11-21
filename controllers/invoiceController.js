import PDFDocument from "pdfkit";
import Order from "../models/orderModel.js";
import Company from "../models/companyModal.js";
import axios from "axios";
import sharp from "sharp";
import fs from "fs";
import path from "path";

// ===============================================
// UNIVERSAL IMAGE LOADER (Cloudinary + Local)
// ===============================================
async function loadUniversalImage(src) {
  try {
    let buffer;

    if (src.startsWith("http")) {
      const res = await axios.get(src, { responseType: "arraybuffer" });
      buffer = Buffer.from(res.data);
    } else {
      const local = path.resolve("public", src);
      if (!fs.existsSync(local)) return null;
      buffer = fs.readFileSync(local);
    }

    const meta = await sharp(buffer).metadata();
    if (["webp", "avif", "svg", "tiff", "heic"].includes(meta.format)) {
      buffer = await sharp(buffer).png().toBuffer();
    }

    return buffer;
  } catch {
    return null;
  }
}

// =============================================================
//                   🔥 GENERATE INVOICE PDF
// =============================================================
export const generateInvoice = async (req, res) => {
  try {
    const { orderId } = req.params;

    const order = await Order.findById(orderId).populate("address");
    if (!order) return res.status(404).json({ message: "Order not found" });

    const company = await Company.findOne();
    if (!company) return res.status(404).json({ message: "Company details not found" });

    const doc = new PDFDocument({ margin: 50 });

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename=invoice_${orderId}.pdf`);

    doc.pipe(res);

    // ===============================================
    // HEADER (Logo + INVOICE TEXT)
    // ===============================================
    if (company.logo) {
      const logoBuffer = await loadUniversalImage(company.logo);
      if (logoBuffer) {
        try {
          doc.image(logoBuffer, 50, 45, { width: 60 });
        } catch {}
      }
    }

    doc.fontSize(20)
      .font("Helvetica-Bold")
      .text("INVOICE", 0, 50, { align: "right" });

    // =============================================================
    //                   TWO-COLUMN HEADER
    // =============================================================
    const leftX = 50;
    const rightX = 320;
    const leftWidth = 240;
    let topY = 130;

    doc.fontSize(10).font("Helvetica");

    // ============= LEFT COLUMN (WRAPPED) =============
    if (company.name)
      doc.text(company.name, leftX, topY, { width: leftWidth });

    if (company.address) {
      const { street, city, state, country, postalCode } = company.address;

      [street, `${city}, ${state}`, `${country} - ${postalCode}`]
        .filter(Boolean)
        .forEach((line) => {
          doc.text(line, leftX, doc.y, { width: leftWidth });
        });
    }
// EMAIL + PHONE (One line, wide enough to never wrap)
doc.text(`Email: ${company.email}`, leftX, doc.y, { width: leftWidth });
doc.text(`Phone: ${company.phone}`, leftX, doc.y, { width: leftWidth });

    if (company.website)
      doc.text(`Phone: ${company.phone}`, leftX, doc.y, { width: leftWidth });

    if (company.website)
      doc.text(`Website: ${company.website}`, leftX, doc.y, { width: leftWidth });

    if (company.registrationYear)
      doc.text(`Est. Year: ${company.registrationYear}`, leftX, doc.y, { width: leftWidth });

    doc.moveDown(0.3)
      .font("Helvetica-Bold")
      .text("Delivery Information:", leftX, doc.y, {
        underline: true,
        width: leftWidth,
      });

    doc.font("Helvetica")
      .text(
        `Delivery Charge: Rs ${company.deliveryCharge?.toFixed(2) || "0.00"}`,
        leftX,
        doc.y,
        { width: leftWidth }
      )
      .text(
        `Free Delivery Above: Rs ${company.freeDeliveryUpto?.toFixed(2) || "0.00"}`,
        leftX,
        doc.y,
        { width: leftWidth }
      );

    if (company.directors?.length) {
      doc.moveDown(0.3)
        .font("Helvetica-Bold")
        .text("Directors:", leftX, doc.y, {
          underline: true,
          width: leftWidth,
        });

      doc.font("Helvetica");
      company.directors.forEach((d) => {
        doc.text(
          `- ${d.name}${d.designation ? ` (${d.designation})` : ""}`,
          leftX,
          doc.y,
          { width: leftWidth }
        );
      });
    }

    // ============= RIGHT COLUMN =============
    const addr = order.address;

    doc.fontSize(12)
      .font("Helvetica-Bold")
      .text("Bill To:", rightX, topY);

    doc.fontSize(11)
      .font("Helvetica")
      .text(addr.fullName, rightX)
      .text(addr.street, rightX)
      .text(`${addr.city}, ${addr.state}`, rightX)
      .text(`${addr.country} - ${addr.postalCode}`, rightX)
      .text(`Phone: ${addr.phone}`, rightX)
      .moveDown(1);

    doc.font("Helvetica-Bold").text("Order Details:", rightX);

    doc.font("Helvetica")
      .text(`Order ID: ${order._id}`, rightX)
      .text(`Order Date: ${new Date(order.createdAt).toLocaleDateString()}`, rightX)
      .text(`Status: ${order.orderStatus}`, rightX)
      .text(`Payment: ${order.paymentStatus}`, rightX);

    // ===============================================
    // HORIZONTAL DIVIDER
    // ===============================================
    doc.moveDown(1.5);
    doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke();
    doc.moveDown(1);

    // ===============================================
    // TABLE HEADER
    // ===============================================
    const startY = doc.y + 10;
    const rupee = "Rs";

    doc.fontSize(11).font("Helvetica-Bold");
    doc.text("Item", 50, startY)
      .text("Qty", 250, startY)
      .text(`Price (${rupee})`, 320, startY, { width: 90, align: "right" })
      .text(`Subtotal (${rupee})`, 440, startY, { width: 90, align: "right" });

    doc.moveTo(50, startY + 15).lineTo(550, startY + 15).stroke();

    // ===============================================
    // TABLE BODY
    // ===============================================
    let position = startY + 25;
    const lineHeight = 16;
    const maxY = 700;

    doc.font("Helvetica");

    for (let i = 0; i < order.items.length; i++) {
      const item = order.items[i];

      const itemName = item.name || "Unnamed Product";
      const quantity = item.quantity || 0;
      const price = item.discountPrice?.toFixed(2) || "0.00";
      const subtotal = item.subtotal?.toFixed(2) || "0.00";

      const nameStart = position;
      doc.text(itemName, 50, nameStart, { width: 180 });

      const nameHeight = doc.y - nameStart;
      const rowHeight = Math.max(nameHeight, lineHeight);

      doc.text(String(quantity), 260, nameStart, { width: 40, align: "center" });
      doc.text(price, 320, nameStart, { width: 90, align: "right" });
      doc.text(subtotal, 440, nameStart, { width: 90, align: "right" });

      doc.moveTo(50, nameStart + rowHeight + 4)
        .lineTo(550, nameStart + rowHeight + 4)
        .strokeColor("#ddd")
        .stroke();

      position += rowHeight + 8;

      if (position > maxY && i < order.items.length - 1) {
        doc.addPage();
        position = 50;

        doc.font("Helvetica-Bold")
          .text("Item", 50, position)
          .text("Qty", 250, position)
          .text(`Price (${rupee})`, 320, position, { width: 90, align: "right" })
          .text(`Subtotal (${rupee})`, 440, position, { width: 90, align: "right" });

        doc.moveTo(50, position + 15).lineTo(550, position + 15).stroke();
        position += 30;

        doc.font("Helvetica");
      }
    }

    // ===============================================
    // TOTALS SECTION
    // ===============================================
    doc.moveTo(50, position).lineTo(550, position).stroke();
    position += 20;

    const subtotalAmt = order.totalPrice || 0;
    const discountAmt = order.discount || 0;
    const grandTotal = order.grandTotal || 0;
    const freeUpto = company.freeDeliveryUpto || 0;
    const baseDelivery = company.deliveryCharge || 0;

    const deliveryCharge = grandTotal >= freeUpto ? 0 : baseDelivery;
    const finalTotal = grandTotal + deliveryCharge;

    doc.font("Helvetica-Bold")
      .text(`Subtotal: Rs ${subtotalAmt.toFixed(2)}`, 350, position, {
        width: 200,
        align: "right",
      });
    position += 20;

    if (discountAmt > 0) {
      doc.font("Helvetica")
        .text(`Discount: Rs ${discountAmt.toFixed(2)}`, 350, position, {
          width: 200,
          align: "right",
        });
      position += 20;
    }

    doc.font("Helvetica")
      .text(`Delivery Charge: Rs ${deliveryCharge.toFixed(2)}`, 350, position, {
        width: 200,
        align: "right",
      });
    position += 20;

    if (deliveryCharge === 0 && freeUpto > 0) {
      doc.fillColor("#008000")
        .text("(Free Delivery Applied)", 350, position, {
          width: 200,
          align: "right",
        })
        .fillColor("black");
      position += 20;
    }

    doc.font("Helvetica-Bold")
      .text(`Grand Total: Rs ${finalTotal.toFixed(2)}`, 350, position, {
        width: 200,
        align: "right",
      });
    position += 30;

    doc.moveTo(50, position).lineTo(550, position).stroke();

    // ===============================================
    // FOOTER
    // ===============================================
    doc.moveDown(2);

    doc.fontSize(10)
      .text(company.invoiceNote || "Thank you for your business!", 50, doc.y, {
        align: "center",
        width: 500,
      })
      .moveDown(0.5);

    doc.fontSize(9)
      .text("**This is not a GST-generated bill. GST may be applied.", 50, doc.y, {
        align: "center",
        width: 500,
      })
      .moveDown(0.5);

    doc.fontSize(9)
      .text("This is a system-generated invoice, no signature required.", 50, doc.y, {
        align: "center",
        width: 500,
      });

    doc.end();

  } catch (error) {
    console.error("INVOICE ERROR:", error);
    res.status(500).json({
      message: "Failed to generate invoice",
      error: error.message,
    });
  }
};
