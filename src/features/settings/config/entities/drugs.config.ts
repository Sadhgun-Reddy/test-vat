import { z } from 'zod';
import { EntityConfig } from '../types';

export const drugsConfig: EntityConfig<any> = {
  entityName: 'drugs',
  entityLabel: 'Drugs',
  entityLabelPlural: 'Drugs',
  apiPath: undefined,
  paginated: false,
  softDeletePut: false,
  columns: [
    { key: 'code', header: 'Code' },
    { key: 'name', header: 'Name' },
    { key: 'category', header: 'Category' },
    { key: 'unit', header: 'Unit' },
    { key: 'is_active', header: 'Status', render: (val: any) => val ? 'Active' : 'Inactive' }
  ],
  formFields: [
  {
    "name": "code",
    "label": "Drug code",
    "required": true
  },
  {
    "name": "name",
    "label": "Name",
    "required": true
  },
  {
    "name": "generic_name",
    "label": "Generic name",
    "placeholder": "Optional"
  },
  {
    "name": "category",
    "label": "Category",
    "type": "select",
    "options": [],
    "required": true
  },
  {
    "name": "unit",
    "label": "Unit",
    "required": true,
    "placeholder": "e.g. ml, strip"
  },
  {
    "name": "unit_price",
    "label": "Unit price",
    "type": "number",
    "required": true
  },
  {
    "name": "gst_pct",
    "label": "GST %",
    "type": "number",
    "required": false
  }
],
  validationSchema: z.object({
    code: z.string().min(1, 'Drug code is required'),
    name: z.string().min(1, 'Name is required'),
    generic_name: z.string().optional().nullable(),
    category: z.string(),
    unit: z.string().min(1, 'Unit is required'),
    unit_price: z.coerce.number(),
    gst_pct: z.coerce.number().optional().nullable()
  }),
  defaultFormValues: { is_active: true },
  canDelete: true,
  canEdit: true,
  bulkImport: true,
  importTemplatePrefix: 'drugs_import_template',
  permissionMatrix: false,
};
