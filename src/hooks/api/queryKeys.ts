// Centralized query key management prevents cache key typos
// and makes invalidation predictable

import { ID } from '../../services/types/api.types';

export const queryKeys = {
  // Auth
  auth: {
    currentUser: () => ['auth', 'currentUser'] as const,
  },

  // Cases
  cases: {
    all: () => ['cases'] as const,
    list: (filters?: Record<string, unknown>) => ['cases', 'list', filters] as const,
    detail: (id: ID) => ['cases', 'detail', id] as const,
  },

  // Drugs
  drugs: {
    all: () => ['drugs'] as const,
    list: (filters?: Record<string, unknown>) => ['drugs', 'list', filters] as const,
    detail: (id: ID) => ['drugs', 'detail', id] as const,
    sales: (filters?: Record<string, unknown>) => ['drugs', 'sales', filters] as const,
    allocations: (filters?: Record<string, unknown>) => ['drugs', 'allocations', filters] as const,
  },

  // Employees
  employees: {
    all: () => ['employees'] as const,
    list: (filters?: Record<string, unknown>) => ['employees', 'list', filters] as const,
    detail: (id: ID) => ['employees', 'detail', id] as const,
    attendance: (filters?: Record<string, unknown>) =>
      ['employees', 'attendance', filters] as const,
  },

  // Farmers
  farmers: {
    all: () => ['farmers'] as const,
    list: (filters?: Record<string, unknown>) => ['farmers', 'list', filters] as const,
    detail: (id: ID) => ['farmers', 'detail', id] as const,
  },

  // Settings
  settings: {
    institutions: (filters?: Record<string, unknown>) =>
      ['settings', 'institutions', filters] as const,
    designations: () => ['settings', 'designations'] as const,
    policies: (filters?: Record<string, unknown>) => ['settings', 'policies', filters] as const,
    budget: (filters?: Record<string, unknown>) => ['settings', 'budget', filters] as const,
    financialYears: () => ['settings', 'financialYears'] as const,
    schemes: () => ['settings', 'schemes'] as const,
    quarters: (financialYearId?: ID) => ['settings', 'quarters', financialYearId] as const,
    institutionTypes: () => ['settings', 'institutionTypes'] as const,
    placesOfWorking: (filters?: Record<string, unknown>) =>
      ['settings', 'placesOfWorking', filters] as const,
    budgetForIndent: (filters?: Record<string, unknown>) =>
      ['settings', 'budgetForIndent', filters] as const,
  },

  // Districts
  districts: {
    all: () => ['districts'] as const,
  },

  // Procurement
  procurement: {
    purchaseOrders: (filters?: Record<string, unknown>) =>
      ['procurement', 'purchaseOrders', filters] as const,
    purchases: (filters?: Record<string, unknown>) =>
      ['procurement', 'purchases', filters] as const,
    purchasesForPO: (poId?: ID) => ['procurement', 'purchasesForPO', poId] as const,
  },
} as const;
