import { z } from 'zod';
import { EntityConfig } from '../types';

export const seedTypesConfig: EntityConfig<any> = {
  entityName: 'seed-types',
  entityLabel: 'Type of Seed',
  entityLabelPlural: 'Type of Seed',
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
    "label": "Seed type",
    "required": true
  }
],
  validationSchema: z.object({
    name: z.string().min(1, 'Seed type is required')
  }),
  defaultFormValues: { is_active: true },
  canDelete: true,
  canEdit: true,
  bulkImport: false,
  importTemplatePrefix: undefined,
  permissionMatrix: false,
};
