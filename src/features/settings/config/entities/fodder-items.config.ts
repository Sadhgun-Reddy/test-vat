import { z } from 'zod';
import { EntityConfig } from '../types';

export const fodderItemsConfig: EntityConfig<any> = {
  entityName: 'fodder-items',
  entityLabel: 'Fodder Items',
  entityLabelPlural: 'Fodder Items',
  apiPath: undefined,
  paginated: false,
  softDeletePut: false,
  columns: [
    { key: 'name', header: 'Name' },
    { key: 'seed_type', header: 'Seed type' },
    { key: 'unit', header: 'Unit' },
    { key: 'unit_price', header: 'Unit price' },
    { key: 'beneficiary__unit', header: 'Beneficiary / unit' },
    { key: 'subsidy__unit', header: 'Subsidy / unit' },
    { key: 'is_active', header: 'Status', render: (val: any) => val ? 'Active' : 'Inactive' }
  ],
  formFields: [
  {
    "name": "name",
    "label": "Name",
    "required": false,
    "placeholder": "Optional"
  },
  {
    "name": "seed_type_id",
    "label": "Type of seed",
    "type": "select",
    "optionsFrom": "seed-types",
    "optionLabel": "name",
    "required": true,
    "placeholderSelect": "Select"
  },
  {
    "name": "unit_size_id",
    "label": "Unit size",
    "type": "select",
    "optionsFrom": "unit-sizes",
    "optionLabel": "name",
    "required": true,
    "placeholderSelect": "Select"
  },
  {
    "name": "unit_price",
    "label": "Unit price",
    "type": "number",
    "required": true
  },
  {
    "name": "beneficiary_contribution_per_unit",
    "label": "Beneficiary contribution per unit",
    "type": "number",
    "required": true
  },
  {
    "name": "subsidy_per_unit",
    "label": "Subsidy per unit",
    "type": "number",
    "required": true
  }
],
  validationSchema: z.object({
    name: z.string().optional().nullable(),
    seed_type_id: z.string(),
    unit_size_id: z.string(),
    unit_price: z.coerce.number(),
    beneficiary_contribution_per_unit: z.coerce.number(),
    subsidy_per_unit: z.coerce.number()
  }),
  defaultFormValues: { is_active: true },
  canDelete: true,
  canEdit: true,
  bulkImport: false,
  importTemplatePrefix: undefined,
  permissionMatrix: false,
};
