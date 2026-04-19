export type ID = string | number;

export type ApiError = {
  message: string;
  statusCode: number;
  errors?: Record<string, string[]>;
};

export type QueryFilters = {
  page?: number;
  limit?: number;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
};
