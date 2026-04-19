import { z } from 'zod';
import { EntityConfig } from '../types';

export const operationsConfig: EntityConfig<any> = {
  entityName: 'operations',
  entityLabel: 'Surgical',
  entityLabelPlural: 'Surgical',
  apiPath: undefined,
  paginated: false,
  softDeletePut: false,
  columns: [
    { key: 'name', header: 'Name' },
    { key: 'surgical_type', header: 'Surgical type' },
    { key: 'is_active', header: 'Status', render: (val: any) => val ? 'Active' : 'Inactive' }
  ],
  formFields: [
  {
    "name": "operation_type_id",
    "label": "Surgical type",
    "type": "select",
    "optionsFrom": "operation-types",
    "optionLabel": "name",
    "required": false
  },
  {
    "name": "name",
    "label": "Procedure name",
    "required": true
  }
],
  validationSchema: z.object({
    operation_type_id: z.string().optional().nullable(),
    name: z.string().min(1, 'Procedure name is required')
  }),
  defaultFormValues: { is_active: true },
  canDelete: true,
  canEdit: true,
  bulkImport: true,
  importTemplatePrefix: 'operations_import_template',
  permissionMatrix: false,
};
