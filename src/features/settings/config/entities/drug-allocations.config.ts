import { z } from 'zod';
import { EntityConfig } from '../types';

export const drugAllocationsConfig: EntityConfig<any> = {
  entityName: 'drug-allocations',
  entityLabel: 'Allocation Form',
  entityLabelPlural: 'Allocation Form',
  apiPath: '/allocations',
  paginated: true,
  softDeletePut: false,
  columns: [
    { key: 'drug', header: 'Drug' },
    { key: 'district', header: 'District' },
    { key: 'qty', header: 'Qty' },
    { key: 'is_active', header: 'Status', render: (val: any) => val ? 'Active' : 'Inactive' }
  ],
  formFields: [
  {
    "name": "drug_id",
    "label": "Drug",
    "type": "select",
    "optionsFrom": "drugs",
    "optionLabel": "name",
    "optionSub": "code",
    "required": true
  },
  {
    "name": "district_id",
    "label": "District",
    "type": "select",
    "optionsFrom": "districts",
    "optionLabel": "name",
    "required": true
  },
  {
    "name": "scheme_id",
    "label": "Scheme (optional)",
    "type": "select",
    "optionsFrom": "schemes",
    "optionLabel": "name",
    "required": false
  },
  {
    "name": "financial_year_id",
    "label": "Financial year (optional)",
    "type": "select",
    "optionsFrom": "financial-years",
    "optionLabel": "label",
    "required": false
  },
  {
    "name": "quarter_id",
    "label": "Quarter (optional)",
    "type": "select",
    "optionsFrom": "quarters",
    "optionLabel": "quarter_no",
    "required": false
  },
  {
    "name": "allocated_qty",
    "label": "Allocated quantity",
    "type": "number",
    "required": true,
    "placeholder": "1"
  }
],
  validationSchema: z.object({
    drug_id: z.string(),
    district_id: z.string(),
    scheme_id: z.string().optional().nullable(),
    financial_year_id: z.string().optional().nullable(),
    quarter_id: z.string().optional().nullable(),
    allocated_qty: z.coerce.number()
  }),
  defaultFormValues: { is_active: true },
  canDelete: false,
  canEdit: false,
  bulkImport: false,
  importTemplatePrefix: undefined,
  permissionMatrix: false,
};
