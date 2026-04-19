import { z } from 'zod';
import { EntityConfig } from '../types';

export const operationTypesConfig: EntityConfig<any> = {
  entityName: 'operation-types',
  entityLabel: 'Surgical Type',
  entityLabelPlural: 'Surgical Type',
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
    "label": "Surgical / operation type",
    "required": true
  }
],
  validationSchema: z.object({
    name: z.string().min(1, 'Surgical / operation type is required')
  }),
  defaultFormValues: { is_active: true },
  canDelete: true,
  canEdit: true,
  bulkImport: true,
  importTemplatePrefix: 'operation_types_import_template',
  permissionMatrix: false,
};
