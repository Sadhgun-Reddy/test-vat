import { z } from 'zod';
import { EntityConfig } from '../types';

export const itemsConfig: EntityConfig<any> = {
  entityName: 'items',
  entityLabel: 'Items',
  entityLabelPlural: 'Items',
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
    "label": "Item name",
    "required": true
  }
],
  validationSchema: z.object({
    name: z.string().min(1, 'Item name is required')
  }),
  defaultFormValues: { is_active: true },
  canDelete: true,
  canEdit: true,
  bulkImport: true,
  importTemplatePrefix: 'items_import_template',
  permissionMatrix: false,
};
