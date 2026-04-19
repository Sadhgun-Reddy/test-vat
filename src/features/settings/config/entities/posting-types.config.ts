import { z } from 'zod';
import { EntityConfig } from '../types';

export const postingTypesConfig: EntityConfig<any> = {
  entityName: 'posting-types',
  entityLabel: 'Type of Posting',
  entityLabelPlural: 'Type of Posting',
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
    "label": "Posting type",
    "required": true
  }
],
  validationSchema: z.object({
    name: z.string().min(1, 'Posting type is required')
  }),
  defaultFormValues: { is_active: true },
  canDelete: true,
  canEdit: true,
  bulkImport: false,
  importTemplatePrefix: undefined,
  permissionMatrix: false,
};
