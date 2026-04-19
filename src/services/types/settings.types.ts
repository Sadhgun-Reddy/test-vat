import { ID } from './api.types';

export type Institution = {
  id: ID;
  name: string;
  type: string;
  district: string;
  mandal?: string;
  address?: string;
  isActive: boolean;
};

export type Designation = {
  id: ID;
  name: string;
  level: number;
  department: string;
  permissions: string[];
};

export type Policy = {
  id: ID;
  title: string;
  content: string;
  category: string;
  effectiveDate: string;
  isActive: boolean;
};

export type Budget = {
  id: ID;
  title: string;
  amount: number;
  spent: number;
  category: string;
  financialYear: string;
  status: 'active' | 'exhausted' | 'pending';
};

export type FinancialYear = {
  id: ID;
  label: string; // e.g. "2024-25"
  startDate: string;
  endDate: string;
  isActive: boolean;
};

export type Scheme = {
  id: ID;
  name: string;
  code?: string;
  description?: string;
  isActive: boolean;
};

export type Quarter = {
  id: ID;
  label: string; // e.g. "Q1", "Q2"
  financialYearId: ID;
  startDate: string;
  endDate: string;
};

export type District = {
  id: ID;
  name: string;
  stateCode?: string;
};

export type InstitutionType = {
  id: ID;
  name: string;
  code?: string;
};

export type PlaceOfWorking = {
  id: ID;
  name: string;
  district?: string;
  type?: string;
};

export type BudgetAllocationForIndent = {
  id: ID;
  schemeId: ID;
  financialYearId: ID;
  quarterId: ID;
  allocatedAmount: number;
  usedAmount: number;
  availableAmount: number;
};
