import { z } from 'zod';
import { EntityConfig } from '../types';

export const unitSizesConfig: EntityConfig<any> = {
  entityName: 'unit-sizes',
  entityLabel: 'Unit Size',
  entityLabelPlural: 'Unit Size',
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
    "label": "Unit",
    "required": true
  }
],
  validationSchema: z.object({
    name: z.string().min(1, 'Unit is required')
  }),
  defaultFormValues: { is_active: true },
  canDelete: true,
  canEdit: true,
  bulkImport: false,
  importTemplatePrefix: undefined,
  permissionMatrix: false,
};
