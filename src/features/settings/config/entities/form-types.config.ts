import { z } from 'zod';
import { EntityConfig } from '../types';

export const formTypesConfig: EntityConfig<any> = {
  entityName: 'form-types',
  entityLabel: 'Form Type',
  entityLabelPlural: 'Form Type',
  apiPath: undefined,
  paginated: false,
  softDeletePut: false,
  columns: [
    { key: 'name', header: 'Name' },
    { key: 'is_active', header: 'Status', render: (val: any) => val ? 'Active' : 'Inactive' }
  ],
  formFields: [
  {
    "name": "name",
    "label": "Form type name",
    "required": true,
    "placeholder": "e.g. Allopathic Medicine"
  }
],
  validationSchema: z.object({
    name: z.string().min(1, 'Form type name is required')
  }),
  defaultFormValues: { is_active: true },
  canDelete: true,
  canEdit: true,
  bulkImport: false,
  importTemplatePrefix: undefined,
  permissionMatrix: false,
};
