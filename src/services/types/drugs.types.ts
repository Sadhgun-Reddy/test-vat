import { ID } from './api.types';

export type Drug = {
  id: ID;
  name: string;
  code?: string;
  genericName?: string;
  category: string;
  unit: string;
  currentStock: number;
  minimumStock: number;
  batchNumber?: string;
  expiryDate?: string;
};

export type DrugSale = {
  id: ID;
  drugId: ID;
  quantity: number;
  unitPrice: number;
  totalAmount: number;
  farmerName: string;
  farmerContact?: string;
  soldBy: ID;
  soldAt: string;
};

export type CreateDrugSalePayload = Partial<Omit<DrugSale, 'id' | 'soldAt' | 'soldBy'>> & {
  [key: string]: any;
};

export type DrugAllocation = {
  id: ID;
  drugId: ID;
  allocatedTo: string;
  quantity: number;
  allocationDate: string;
  status: 'pending' | 'approved' | 'rejected';
};
