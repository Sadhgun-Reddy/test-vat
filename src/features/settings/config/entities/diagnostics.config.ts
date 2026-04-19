import { z } from 'zod';
import { EntityConfig } from '../types';

export const diagnosticsConfig: EntityConfig<any> = {
  entityName: 'diagnostics',
  entityLabel: 'Diagnostics',
  entityLabelPlural: 'Diagnostics',
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
    "label": "Diagnostic / disease",
    "required": true
  }
],
  validationSchema: z.object({
    name: z.string().min(1, 'Diagnostic / disease is required')
  }),
  defaultFormValues: { is_active: true },
  canDelete: true,
  canEdit: true,
  bulkImport: true,
  importTemplatePrefix: 'diagnostics_import_template',
  permissionMatrix: false,
};
