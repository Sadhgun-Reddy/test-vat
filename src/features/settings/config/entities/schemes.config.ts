import { z } from 'zod';
import { EntityConfig } from '../types';

export const schemesConfig: EntityConfig<any> = {
  entityName: 'schemes',
  entityLabel: 'Scheme',
  entityLabelPlural: 'Scheme',
  apiPath: undefined,
  paginated: false,
  softDeletePut: false,
  columns: [
    { key: 'financial_year', header: 'Financial year' },
    { key: 'name', header: 'Name' },
    { key: 'is_active', header: 'Status', render: (val: any) => val ? 'Active' : 'Inactive' }
  ],
  formFields: [
  {
    "name": "financial_year_id",
    "label": "Financial year",
    "type": "select",
    "optionsFrom": "financial-years",
    "optionLabel": "label",
    "required": true
  },
  {
    "name": "name",
    "label": "Scheme name",
    "required": true,
    "placeholder": "Enter scheme name"
  }
],
  validationSchema: z.object({
    financial_year_id: z.string(),
    name: z.string().min(1, 'Scheme name is required')
  }),
  defaultFormValues: { is_active: true },
  canDelete: true,
  canEdit: true,
  bulkImport: true,
  importTemplatePrefix: 'schemes_import_template',
  permissionMatrix: false,
};
