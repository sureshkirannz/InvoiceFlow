import {
  users,
  companies,
  bankDetails,
  clients,
  invoices,
  invoiceItems,
  paymentSettings,
  type User,
  type UpsertUser,
  type Company,
  type InsertCompany,
  type BankDetails,
  type InsertBankDetails,
  type Client,
  type InsertClient,
  type Invoice,
  type InsertInvoice,
  type InvoiceItem,
  type InsertInvoiceItem,
  type PaymentSettings,
  type InsertPaymentSettings,
  type InvoiceWithDetails,
  type CompanyWithBankDetails,
} from "@shared/schema";
import { db } from "./db";
import { eq, and, desc } from "drizzle-orm";

// Interface for storage operations
export interface IStorage {
  // User operations (mandatory for Replit Auth)
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;

  // Company operations
  getCompanyByUserId(userId: string): Promise<CompanyWithBankDetails | undefined>;
  createCompany(company: InsertCompany): Promise<Company>;
  updateCompany(id: number, company: Partial<InsertCompany>): Promise<Company>;
  
  // Bank details operations
  createBankDetails(bankDetails: InsertBankDetails): Promise<BankDetails>;
  updateBankDetails(companyId: number, bankDetails: Partial<InsertBankDetails>): Promise<BankDetails>;
  
  // Client operations
  getClientsByUserId(userId: string): Promise<Client[]>;
  getClientById(id: number): Promise<Client | undefined>;
  createClient(client: InsertClient): Promise<Client>;
  updateClient(id: number, client: Partial<InsertClient>): Promise<Client>;
  deleteClient(id: number): Promise<void>;
  
  // Invoice operations
  getInvoicesByUserId(userId: string): Promise<InvoiceWithDetails[]>;
  getInvoiceById(id: number): Promise<InvoiceWithDetails | undefined>;
  createInvoice(invoice: InsertInvoice, items: InsertInvoiceItem[]): Promise<InvoiceWithDetails>;
  updateInvoice(id: number, invoice: Partial<InsertInvoice>): Promise<Invoice>;
  deleteInvoice(id: number): Promise<void>;
  
  // Invoice statistics
  getInvoiceStats(userId: string): Promise<{
    totalInvoices: number;
    pendingAmount: string;
    paidAmount: string;
    overdueAmount: string;
  }>;
  
  // Payment settings operations
  getPaymentSettings(userId: string): Promise<PaymentSettings | undefined>;
  upsertPaymentSettings(settings: InsertPaymentSettings): Promise<PaymentSettings>;
}

export class DatabaseStorage implements IStorage {
  // User operations (mandatory for Replit Auth)
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          ...userData,
          updatedAt: new Date(),
        },
      })
      .returning();
    return user;
  }

  // Company operations
  async getCompanyByUserId(userId: string): Promise<CompanyWithBankDetails | undefined> {
    const [company] = await db
      .select()
      .from(companies)
      .where(eq(companies.userId, userId));
    
    if (!company) return undefined;
    
    const bankDetailsData = await db
      .select()
      .from(bankDetails)
      .where(eq(bankDetails.companyId, company.id));
    
    return {
      ...company,
      bankDetails: bankDetailsData,
    };
  }

  async createCompany(company: InsertCompany): Promise<Company> {
    const [newCompany] = await db
      .insert(companies)
      .values(company)
      .returning();
    return newCompany;
  }

  async updateCompany(id: number, company: Partial<InsertCompany>): Promise<Company> {
    const [updatedCompany] = await db
      .update(companies)
      .set({ ...company, updatedAt: new Date() })
      .where(eq(companies.id, id))
      .returning();
    return updatedCompany;
  }

  // Bank details operations
  async createBankDetails(bankDetailsData: InsertBankDetails): Promise<BankDetails> {
    const [newBankDetails] = await db
      .insert(bankDetails)
      .values(bankDetailsData)
      .returning();
    return newBankDetails;
  }

  async updateBankDetails(companyId: number, bankDetailsData: Partial<InsertBankDetails>): Promise<BankDetails> {
    const [updatedBankDetails] = await db
      .update(bankDetails)
      .set({ ...bankDetailsData, updatedAt: new Date() })
      .where(eq(bankDetails.companyId, companyId))
      .returning();
    return updatedBankDetails;
  }

  // Client operations
  async getClientsByUserId(userId: string): Promise<Client[]> {
    return await db
      .select()
      .from(clients)
      .where(eq(clients.userId, userId))
      .orderBy(desc(clients.createdAt));
  }

  async getClientById(id: number): Promise<Client | undefined> {
    const [client] = await db
      .select()
      .from(clients)
      .where(eq(clients.id, id));
    return client;
  }

  async createClient(client: InsertClient): Promise<Client> {
    const [newClient] = await db
      .insert(clients)
      .values(client)
      .returning();
    return newClient;
  }

  async updateClient(id: number, client: Partial<InsertClient>): Promise<Client> {
    const [updatedClient] = await db
      .update(clients)
      .set({ ...client, updatedAt: new Date() })
      .where(eq(clients.id, id))
      .returning();
    return updatedClient;
  }

  async deleteClient(id: number): Promise<void> {
    await db.delete(clients).where(eq(clients.id, id));
  }

  // Invoice operations
  async getInvoicesByUserId(userId: string): Promise<InvoiceWithDetails[]> {
    const invoicesData = await db
      .select()
      .from(invoices)
      .leftJoin(clients, eq(invoices.clientId, clients.id))
      .where(eq(invoices.userId, userId))
      .orderBy(desc(invoices.createdAt));

    const invoicesWithItems = await Promise.all(
      invoicesData.map(async ({ invoices: invoice, clients: client }) => {
        const items = await db
          .select()
          .from(invoiceItems)
          .where(eq(invoiceItems.invoiceId, invoice.id));

        return {
          ...invoice,
          client: client!,
          items,
        };
      })
    );

    return invoicesWithItems;
  }

  async getInvoiceById(id: number): Promise<InvoiceWithDetails | undefined> {
    const [invoiceData] = await db
      .select()
      .from(invoices)
      .leftJoin(clients, eq(invoices.clientId, clients.id))
      .where(eq(invoices.id, id));

    if (!invoiceData) return undefined;

    const items = await db
      .select()
      .from(invoiceItems)
      .where(eq(invoiceItems.invoiceId, id));

    return {
      ...invoiceData.invoices,
      client: invoiceData.clients!,
      items,
    };
  }

  async createInvoice(invoice: InsertInvoice, items: InsertInvoiceItem[]): Promise<InvoiceWithDetails> {
    const [newInvoice] = await db
      .insert(invoices)
      .values(invoice)
      .returning();

    const invoiceItemsWithInvoiceId = items.map(item => ({
      ...item,
      invoiceId: newInvoice.id,
    }));

    const newItems = await db
      .insert(invoiceItems)
      .values(invoiceItemsWithInvoiceId)
      .returning();

    const [client] = await db
      .select()
      .from(clients)
      .where(eq(clients.id, invoice.clientId));

    return {
      ...newInvoice,
      client: client!,
      items: newItems,
    };
  }

  async updateInvoice(id: number, invoice: Partial<InsertInvoice>): Promise<Invoice> {
    const [updatedInvoice] = await db
      .update(invoices)
      .set({ ...invoice, updatedAt: new Date() })
      .where(eq(invoices.id, id))
      .returning();
    return updatedInvoice;
  }

  async deleteInvoice(id: number): Promise<void> {
    await db.delete(invoiceItems).where(eq(invoiceItems.invoiceId, id));
    await db.delete(invoices).where(eq(invoices.id, id));
  }

  // Invoice statistics
  async getInvoiceStats(userId: string): Promise<{
    totalInvoices: number;
    pendingAmount: string;
    paidAmount: string;
    overdueAmount: string;
  }> {
    const userInvoices = await db
      .select()
      .from(invoices)
      .where(eq(invoices.userId, userId));

    const totalInvoices = userInvoices.length;
    
    let pendingAmount = 0;
    let paidAmount = 0;
    let overdueAmount = 0;
    
    const now = new Date();
    
    userInvoices.forEach(invoice => {
      const total = parseFloat(invoice.total);
      
      switch (invoice.status) {
        case 'paid':
          paidAmount += total;
          break;
        case 'pending':
          if (new Date(invoice.dueDate) < now) {
            overdueAmount += total;
          } else {
            pendingAmount += total;
          }
          break;
        case 'overdue':
          overdueAmount += total;
          break;
        default:
          pendingAmount += total;
      }
    });

    return {
      totalInvoices,
      pendingAmount: `$${pendingAmount.toFixed(2)}`,
      paidAmount: `$${paidAmount.toFixed(2)}`,
      overdueAmount: `$${overdueAmount.toFixed(2)}`,
    };
  }

  // Payment settings operations
  async getPaymentSettings(userId: string): Promise<PaymentSettings | undefined> {
    const [settings] = await db
      .select()
      .from(paymentSettings)
      .where(eq(paymentSettings.userId, userId));
    return settings;
  }

  async upsertPaymentSettings(settings: InsertPaymentSettings): Promise<PaymentSettings> {
    const existing = await this.getPaymentSettings(settings.userId);
    
    if (existing) {
      const [updated] = await db
        .update(paymentSettings)
        .set({ ...settings, updatedAt: new Date() })
        .where(eq(paymentSettings.userId, settings.userId))
        .returning();
      return updated;
    } else {
      const [created] = await db
        .insert(paymentSettings)
        .values(settings)
        .returning();
      return created;
    }
  }
}

export const storage = new DatabaseStorage();
