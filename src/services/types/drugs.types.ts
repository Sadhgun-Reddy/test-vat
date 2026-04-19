import { ID } from './api.types';

export type Drug = {
  id: ID;
  name: string;
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

export type CreateDrugSalePayload = Omit<DrugSale, 'id' | 'soldAt' | 'soldBy'>;

export type DrugAllocation = {
  id: ID;
  drugId: ID;
  allocatedTo: string;
  quantity: number;
  allocationDate: string;
  status: 'pending' | 'approved' | 'rejected';
};
