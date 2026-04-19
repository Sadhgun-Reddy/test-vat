// Centralized query key management prevents cache key typos
// and makes invalidation predictable

export const queryKeys = {
  // Auth
  auth: {
    currentUser: () => ['auth', 'currentUser'] as const,
  },

  // Cases
  cases: {
    all: () => ['cases'] as const,
    list: (filters?: Record<string, unknown>) => ['cases', 'list', filters] as const,
    detail: (id: string | number) => ['cases', 'detail', id] as const,
  },

  // Procurement
  procurement: {
    indents: (f?: any) => ['procurement', 'indents', f] as const,
    indentDetail: (id: any) => ['procurement', 'indents', id] as const,
    purchaseOrders: (f?: any) => ['procurement', 'purchaseOrders', f] as const,
    purchaseOrderDetail: (id: any) => ['procurement', 'purchaseOrders', id] as const,
    goodsReceipts: (f?: any) => ['procurement', 'goodsReceipts', f] as const,
    goodsReceiptDetail: (id: any) => ['procurement', 'goodsReceipts', id] as const,
    vendorPayments: (f?: any) => ['procurement', 'vendorPayments', f] as const,
    vendorPaymentDetail: (id: any) => ['procurement', 'vendorPayments', id] as const,
    vendors: (f?: any) => ['procurement', 'vendors', f] as const,
    purchases: (f?: any) => ['procurement', 'purchases', f] as const,
    purchasesForPO: (f?: any) => ['procurement', 'purchasesForPO', f] as const,
  },
  // Drugs
  drugs: {
    all: () => ['drugs'] as const,
    list: (filters?: Record<string, unknown>) => ['drugs', 'list', filters] as const,
    detail: (id: string | number) => ['drugs', 'detail', id] as const,
    sales: (filters?: Record<string, unknown>) => ['drugs', 'sales', filters] as const,
    allocations: (filters?: Record<string, unknown>) => ['drugs', 'allocations', filters] as const,
  },

  // Employees
  employees: {
    all: () => ['employees'] as const,
    list: (filters?: Record<string, unknown>) => ['employees', 'list', filters] as const,
    detail: (id: string | number) => ['employees', 'detail', id] as const,
    attendance: (filters?: Record<string, unknown>) =>
      ['employees', 'attendance', filters] as const,
  },

  // Farmers
  farmers: {
    all: () => ['farmers'] as const,
    list: (filters?: Record<string, unknown>) => ['farmers', 'list', filters] as const,
    detail: (id: string | number) => ['farmers', 'detail', id] as const,
  },

  // Settings
  settings: {
    institutions: (filters?: Record<string, unknown>) =>
      ['settings', 'institutions', filters] as const,
    designations: () => ['settings', 'designations'] as const,
    policies: (filters?: Record<string, unknown>) => ['settings', 'policies', filters] as const,
    budget: (filters?: Record<string, unknown>) => ['settings', 'budget', filters] as const,
    financialYears: () => ['settings', 'financial-years'] as const,
    schemes: () => ['settings', 'schemes'] as const,
    quarters: (fyId?: any) => ['settings', 'quarters', fyId] as const,
    districts: () => ['settings', 'districts'] as const,
    institutionTypes: () => ['settings', 'institution-types'] as const,
    placesOfWorking: (filters?: any) => ['settings', 'places-of-working', filters] as const,
    budgetForIndent: (filters?: any) => ['settings', 'budgetForIndent', filters] as const,
  },
} as const;
