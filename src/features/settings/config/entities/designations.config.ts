import { z } from 'zod';
import { EntityConfig } from '../types';

export const designationsConfig: EntityConfig<any> = {
  entityName: 'designations',
  entityLabel: 'Designation',
  entityLabelPlural: 'Designation',
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
    "label": "Designation name",
    "required": true
  }
],
  validationSchema: z.object({
    name: z.string().min(1, 'Designation name is required')
  }),
  defaultFormValues: { is_active: true },
  canDelete: true,
  canEdit: true,
  bulkImport: true,
  importTemplatePrefix: 'designations_import_template',
  permissionMatrix: true,
};
