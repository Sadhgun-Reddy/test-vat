import { ZodSchema } from 'zod';

export type ID = string | number;

export type FieldType =
  | 'text'
  | 'number'
  | 'email'
  | 'select'
  | 'textarea'
  | 'date'
  | 'boolean'
  | 'checkbox'; // Treating checkbox the same as boolean but explicit

export type FormField = {
  name: string;
  label: string;
  type?: FieldType; // Defaults to text
  placeholder?: string;
  required?: boolean;
  options?: { label: string; value: string | number }[]; // for static select fields
  optionsFrom?: string; // key of another setting for dynamic options
  optionLabel?: string; // field to use for label in optionsFrom
  optionSub?: string; // sub-field to show in parens
  placeholderSelect?: string;
  defaultValue?: unknown;
  filterByDistrict?: boolean; // specialized for towns -> mandal_id
};

export type ColumnDef<T> = {
  key: keyof T | string; // key can be string for custom cols
  header: string;
  render?: (value: unknown, row: T) => React.ReactNode;
  sortable?: boolean;
  width?: string;
};

export type EntityConfig<T extends { id: ID }> = {
  entityName: string; // e.g. "institution"
  entityLabel: string; // e.g. "Institution" (display)
  entityLabelPlural: string; // e.g. "Institutions"

  // Custom API configuration
  apiPath?: string; // Override base path (e.g., /allocations)
  paginated?: boolean; // Should use page/limit
  softDeletePut?: boolean; // True if delete should be PUT {is_active: false}

  columns: ColumnDef<T>[];
  formFields: FormField[];
  validationSchema: ZodSchema;
  defaultFormValues: Partial<T>;

  canDelete?: boolean;
  canEdit?: boolean;
  searchableFields?: (keyof T)[];

  bulkImport?: boolean;
  importTemplatePrefix?: string;

  // Feature-specific toggles
  permissionMatrix?: boolean; // for designations
};

export type CRUDHandlers<T> = {
  items: T[];
  totalItems: number;
  isLoading: boolean;
  isCreating: boolean;
  isUpdating: boolean;
  isDeleting: boolean;
  onCreate: (data: Partial<T>) => Promise<void>;
  onUpdate: (id: ID, data: Partial<T>) => Promise<void>;
  onDelete: (id: ID) => Promise<void>;
  onImport?: (file: File) => Promise<void>;
  page: number;
  setPage: (page: number) => void;
  search: string;
  setSearch: (search: string) => void;
  totalPages: number;
};
