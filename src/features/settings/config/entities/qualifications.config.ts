import { z } from 'zod';
import { EntityConfig } from '../types';

export const qualificationsConfig: EntityConfig<any> = {
  entityName: 'qualifications',
  entityLabel: 'Qualification',
  entityLabelPlural: 'Qualification',
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
    "label": "Qualification",
    "required": true
  }
],
  validationSchema: z.object({
    name: z.string().min(1, 'Qualification is required')
  }),
  defaultFormValues: { is_active: true },
  canDelete: true,
  canEdit: true,
  bulkImport: true,
  importTemplatePrefix: 'qualifications_import_template',
  permissionMatrix: false,
};
