import express, { type Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./auth";
import { 
  insertCompanySchema, 
  insertBankDetailsSchema, 
  insertClientSchema, 
  insertInvoiceSchema,
  insertInvoiceItemSchema,
  insertPaymentSettingsSchema
} from "@shared/schema";
import { z } from "zod";
import multer from "multer";
import path from "path";
import fs from "fs";
import jsPDF from "jspdf";
import * as XLSX from "xlsx";

// File upload configuration
const storage_multer = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = 'uploads/logos';
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage: storage_multer,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|svg/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only image files are allowed!'));
    }
  }
});

export async function registerRoutes(app: Express): Promise<Server> {
  // Auth middleware
  await setupAuth(app);

  // Serve uploaded files
  app.use('/uploads', (req, res, next) => {
    // Basic security check - ensure user is authenticated to access uploads
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: 'Unauthorized' });
    }
    next();
  });
  app.use('/uploads', express.static('uploads'));

  // Auth routes
  app.get('/api/auth/user', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const user = await storage.getUser(userId);
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // Company routes
  app.get('/api/company', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const company = await storage.getCompanyByUserId(userId);
      res.json(company);
    } catch (error) {
      console.error("Error fetching company:", error);
      res.status(500).json({ message: "Failed to fetch company" });
    }
  });

  app.post('/api/company', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const companyData = insertCompanySchema.parse({ ...req.body, userId });
      const company = await storage.createCompany(companyData);
      res.json(company);
    } catch (error) {
      console.error("Error creating company:", error);
      res.status(400).json({ message: "Failed to create company" });
    }
  });

  app.put('/api/company/:id', isAuthenticated, async (req: any, res) => {
    try {
      const id = parseInt(req.params.id);
      const companyData = insertCompanySchema.partial().parse(req.body);
      const company = await storage.updateCompany(id, companyData);
      res.json(company);
    } catch (error) {
      console.error("Error updating company:", error);
      res.status(400).json({ message: "Failed to update company" });
    }
  });

  // Logo upload route
  app.post('/api/company/logo', isAuthenticated, upload.single('logo'), async (req: any, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: 'No file uploaded' });
      }
      
      const logoUrl = `/uploads/logos/${req.file.filename}`;
      res.json({ logoUrl });
    } catch (error) {
      console.error("Error uploading logo:", error);
      res.status(500).json({ message: "Failed to upload logo" });
    }
  });

  // Bank details routes
  app.post('/api/bank-details', isAuthenticated, async (req: any, res) => {
    try {
      const bankDetailsData = insertBankDetailsSchema.parse(req.body);
      const bankDetails = await storage.createBankDetails(bankDetailsData);
      res.json(bankDetails);
    } catch (error) {
      console.error("Error creating bank details:", error);
      res.status(400).json({ message: "Failed to create bank details" });
    }
  });

  app.put('/api/bank-details/:companyId', isAuthenticated, async (req: any, res) => {
    try {
      const companyId = parseInt(req.params.companyId);
      const bankDetailsData = insertBankDetailsSchema.partial().parse(req.body);
      const bankDetails = await storage.updateBankDetails(companyId, bankDetailsData);
      res.json(bankDetails);
    } catch (error) {
      console.error("Error updating bank details:", error);
      res.status(400).json({ message: "Failed to update bank details" });
    }
  });

  // Client routes
  app.get('/api/clients', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const clients = await storage.getClientsByUserId(userId);
      res.json(clients);
    } catch (error) {
      console.error("Error fetching clients:", error);
      res.status(500).json({ message: "Failed to fetch clients" });
    }
  });

  app.get('/api/clients/:id', isAuthenticated, async (req: any, res) => {
    try {
      const id = parseInt(req.params.id);
      const client = await storage.getClientById(id);
      if (!client) {
        return res.status(404).json({ message: "Client not found" });
      }
      res.json(client);
    } catch (error) {
      console.error("Error fetching client:", error);
      res.status(500).json({ message: "Failed to fetch client" });
    }
  });

  app.post('/api/clients', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const clientData = insertClientSchema.parse({ ...req.body, userId });
      const client = await storage.createClient(clientData);
      res.json(client);
    } catch (error) {
      console.error("Error creating client:", error);
      res.status(400).json({ message: "Failed to create client" });
    }
  });

  app.put('/api/clients/:id', isAuthenticated, async (req: any, res) => {
    try {
      const id = parseInt(req.params.id);
      const clientData = insertClientSchema.partial().parse(req.body);
      const client = await storage.updateClient(id, clientData);
      res.json(client);
    } catch (error) {
      console.error("Error updating client:", error);
      res.status(400).json({ message: "Failed to update client" });
    }
  });

  app.delete('/api/clients/:id', isAuthenticated, async (req: any, res) => {
    try {
      const id = parseInt(req.params.id);
      await storage.deleteClient(id);
      res.json({ message: "Client deleted successfully" });
    } catch (error) {
      console.error("Error deleting client:", error);
      res.status(500).json({ message: "Failed to delete client" });
    }
  });

  // Invoice routes
  app.get('/api/invoices', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const invoices = await storage.getInvoicesByUserId(userId);
      res.json(invoices);
    } catch (error) {
      console.error("Error fetching invoices:", error);
      res.status(500).json({ message: "Failed to fetch invoices" });
    }
  });

  app.get('/api/invoices/:id', isAuthenticated, async (req: any, res) => {
    try {
      const id = parseInt(req.params.id);
      const invoice = await storage.getInvoiceById(id);
      if (!invoice) {
        return res.status(404).json({ message: "Invoice not found" });
      }
      res.json(invoice);
    } catch (error) {
      console.error("Error fetching invoice:", error);
      res.status(500).json({ message: "Failed to fetch invoice" });
    }
  });

  const createInvoiceSchema = z.object({
    invoice: insertInvoiceSchema,
    items: z.array(insertInvoiceItemSchema),
  });

  app.post('/api/invoices', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const { invoice: invoiceData, items } = createInvoiceSchema.parse(req.body);
      
      const invoice = await storage.createInvoice(
        { ...invoiceData, userId },
        items
      );
      res.json(invoice);
    } catch (error) {
      console.error("Error creating invoice:", error);
      res.status(400).json({ message: "Failed to create invoice" });
    }
  });

  app.put('/api/invoices/:id', isAuthenticated, async (req: any, res) => {
    try {
      const id = parseInt(req.params.id);
      const invoiceData = insertInvoiceSchema.partial().parse(req.body);
      const invoice = await storage.updateInvoice(id, invoiceData);
      res.json(invoice);
    } catch (error) {
      console.error("Error updating invoice:", error);
      res.status(400).json({ message: "Failed to update invoice" });
    }
  });

  app.delete('/api/invoices/:id', isAuthenticated, async (req: any, res) => {
    try {
      const id = parseInt(req.params.id);
      await storage.deleteInvoice(id);
      res.json({ message: "Invoice deleted successfully" });
    } catch (error) {
      console.error("Error deleting invoice:", error);
      res.status(500).json({ message: "Failed to delete invoice" });
    }
  });

  // Invoice statistics
  app.get('/api/invoices/stats', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const stats = await storage.getInvoiceStats(userId);
      res.json(stats);
    } catch (error) {
      console.error("Error fetching invoice stats:", error);
      res.status(500).json({ message: "Failed to fetch invoice stats" });
    }
  });

  // PDF export
  app.get('/api/invoices/:id/pdf', isAuthenticated, async (req: any, res) => {
    try {
      const id = parseInt(req.params.id);
      const invoice = await storage.getInvoiceById(id);
      
      if (!invoice) {
        return res.status(404).json({ message: "Invoice not found" });
      }

      const doc = new jsPDF();
      
      // Add company header
      doc.setFontSize(20);
      doc.text('INVOICE', 20, 30);
      
      // Add invoice details
      doc.setFontSize(12);
      doc.text(`Invoice #: ${invoice.invoiceNumber}`, 20, 50);
      doc.text(`Issue Date: ${invoice.issueDate}`, 20, 60);
      doc.text(`Due Date: ${invoice.dueDate}`, 20, 70);
      
      // Add client details
      doc.text('Bill To:', 20, 90);
      doc.text(invoice.client.name, 20, 100);
      if (invoice.client.address) {
        doc.text(invoice.client.address, 20, 110);
      }
      
      // Add items table
      let yPosition = 130;
      doc.text('Description', 20, yPosition);
      doc.text('Qty', 120, yPosition);
      doc.text('Rate', 140, yPosition);
      doc.text('Amount', 160, yPosition);
      
      yPosition += 10;
      invoice.items.forEach(item => {
        doc.text(item.description, 20, yPosition);
        doc.text(item.quantity.toString(), 120, yPosition);
        doc.text(`$${item.rate}`, 140, yPosition);
        doc.text(`$${item.amount}`, 160, yPosition);
        yPosition += 10;
      });
      
      // Add totals
      yPosition += 10;
      doc.text(`Subtotal: $${invoice.subtotal}`, 120, yPosition);
      yPosition += 10;
      if (invoice.discount && parseFloat(invoice.discount) > 0) {
        doc.text(`Discount: ${invoice.discount}%`, 120, yPosition);
        yPosition += 10;
      }
      if (invoice.tax && parseFloat(invoice.tax) > 0) {
        doc.text(`Tax: ${invoice.tax}%`, 120, yPosition);
        yPosition += 10;
      }
      doc.text(`Total: $${invoice.total}`, 120, yPosition);
      
      const pdfBuffer = doc.output('arraybuffer');
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename=invoice-${invoice.invoiceNumber}.pdf`);
      res.send(Buffer.from(pdfBuffer));
    } catch (error) {
      console.error("Error generating PDF:", error);
      res.status(500).json({ message: "Failed to generate PDF" });
    }
  });

  // Excel export
  app.get('/api/invoices/:id/excel', isAuthenticated, async (req: any, res) => {
    try {
      const id = parseInt(req.params.id);
      const invoice = await storage.getInvoiceById(id);
      
      if (!invoice) {
        return res.status(404).json({ message: "Invoice not found" });
      }

      const workbook = XLSX.utils.book_new();
      
      // Create invoice details sheet
      const invoiceData = [
        ['Invoice Number', invoice.invoiceNumber],
        ['Issue Date', invoice.issueDate],
        ['Due Date', invoice.dueDate],
        ['Status', invoice.status],
        ['', ''],
        ['Bill To', ''],
        ['Client Name', invoice.client.name],
        ['Email', invoice.client.email || ''],
        ['Phone', invoice.client.phone || ''],
        ['Address', invoice.client.address || ''],
        ['', ''],
        ['Items', ''],
        ['Description', 'Quantity', 'Rate', 'Amount'],
        ...invoice.items.map(item => [item.description, item.quantity, item.rate, item.amount]),
        ['', ''],
        ['Subtotal', '', '', invoice.subtotal],
        ['Discount (%)', '', '', invoice.discount || '0'],
        ['Tax (%)', '', '', invoice.tax || '0'],
        ['Total', '', '', invoice.total],
      ];
      
      const worksheet = XLSX.utils.aoa_to_sheet(invoiceData);
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Invoice');
      
      const excelBuffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
      
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename=invoice-${invoice.invoiceNumber}.xlsx`);
      res.send(excelBuffer);
    } catch (error) {
      console.error("Error generating Excel:", error);
      res.status(500).json({ message: "Failed to generate Excel" });
    }
  });

  // Payment settings routes
  app.get('/api/payment-settings', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const settings = await storage.getPaymentSettings(userId);
      res.json(settings);
    } catch (error) {
      console.error("Error fetching payment settings:", error);
      res.status(500).json({ message: "Failed to fetch payment settings" });
    }
  });

  app.post('/api/payment-settings', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const settingsData = insertPaymentSettingsSchema.parse({ ...req.body, userId });
      const settings = await storage.upsertPaymentSettings(settingsData);
      res.json(settings);
    } catch (error) {
      console.error("Error updating payment settings:", error);
      res.status(400).json({ message: "Failed to update payment settings" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
