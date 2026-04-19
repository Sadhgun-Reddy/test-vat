import { z } from 'zod';
import { EntityConfig } from '../types';

export const animalTypesConfig: EntityConfig<any> = {
  entityName: 'animal-types',
  entityLabel: 'Animal Type',
  entityLabelPlural: 'Animal Type',
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
    "label": "Animal type",
    "required": true
  }
],
  validationSchema: z.object({
    name: z.string().min(1, 'Animal type is required')
  }),
  defaultFormValues: { is_active: true },
  canDelete: true,
  canEdit: true,
  bulkImport: true,
  importTemplatePrefix: 'animal_types_import_template',
  permissionMatrix: false,
};
