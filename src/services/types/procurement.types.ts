import { ID } from './api.types';

export type PurchaseOrder = {
  id: ID;
  orderNumber: string;
  vendorName: string;
  totalAmount: number;
  status: 'draft' | 'approved' | 'received' | 'cancelled';
  orderedAt: string;
  expectedDelivery?: string;
};

export type Purchase = {
  id: ID;
  purchaseOrderId?: ID;
  invoiceNumber: string;
  vendorName: string;
  totalAmount: number;
  receivedAt: string;
  verifiedBy?: ID;
};
