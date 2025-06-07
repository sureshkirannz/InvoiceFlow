/**
 * Calculate the total amount for an invoice including discount and tax
 */
export function calculateInvoiceTotal(subtotal: number, discountPercent: number, taxPercent: number): number {
  const discountAmount = (subtotal * discountPercent) / 100;
  const taxableAmount = subtotal - discountAmount;
  const taxAmount = (taxableAmount * taxPercent) / 100;
  
  return taxableAmount + taxAmount;
}

/**
 * Format a number as currency
 */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount);
}

/**
 * Format a date for display
 */
export function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

/**
 * Calculate the number of days between two dates
 */
export function daysBetween(startDate: string, endDate: string): number {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const diffTime = Math.abs(end.getTime() - start.getTime());
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

/**
 * Determine if an invoice is overdue
 */
export function isInvoiceOverdue(dueDate: string, status: string): boolean {
  if (status === 'paid') return false;
  
  const due = new Date(dueDate);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  return due < today;
}

/**
 * Get the appropriate status based on due date and current status
 */
export function getInvoiceStatus(currentStatus: string, dueDate: string): string {
  if (currentStatus === 'paid' || currentStatus === 'draft') {
    return currentStatus;
  }
  
  if (isInvoiceOverdue(dueDate, currentStatus)) {
    return 'overdue';
  }
  
  return currentStatus;
}

/**
 * Generate a unique invoice number
 */
export function generateInvoiceNumber(): string {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const timestamp = Date.now().toString().slice(-6);
  
  return `INV-${year}${month}-${timestamp}`;
}

/**
 * Calculate invoice item amount
 */
export function calculateItemAmount(quantity: number, rate: number): number {
  return quantity * rate;
}

/**
 * Calculate invoice subtotal from items
 */
export function calculateSubtotal(items: Array<{ quantity: number; rate: number }>): number {
  return items.reduce((sum, item) => sum + calculateItemAmount(item.quantity, item.rate), 0);
}

/**
 * Validate invoice data
 */
export function validateInvoiceData(invoice: any): string[] {
  const errors: string[] = [];
  
  if (!invoice.invoiceNumber?.trim()) {
    errors.push("Invoice number is required");
  }
  
  if (!invoice.clientId) {
    errors.push("Client is required");
  }
  
  if (!invoice.issueDate) {
    errors.push("Issue date is required");
  }
  
  if (!invoice.dueDate) {
    errors.push("Due date is required");
  }
  
  if (new Date(invoice.dueDate) < new Date(invoice.issueDate)) {
    errors.push("Due date must be after issue date");
  }
  
  return errors;
}

/**
 * Format invoice number for display
 */
export function formatInvoiceNumber(invoiceNumber: string): string {
  return invoiceNumber.toUpperCase();
}

/**
 * Get invoice status color for UI
 */
export function getStatusColor(status: string): string {
  switch (status.toLowerCase()) {
    case 'paid':
      return 'bg-green-100 text-green-800';
    case 'pending':
      return 'bg-yellow-100 text-yellow-800';
    case 'overdue':
      return 'bg-red-100 text-red-800';
    case 'draft':
      return 'bg-gray-100 text-gray-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
}
