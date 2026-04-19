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
