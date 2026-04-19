import { z } from 'zod';
import { EntityConfig } from '../types';

export const institutionTypesConfig: EntityConfig<any> = {
  entityName: 'institution-types',
  entityLabel: 'Type of Institution',
  entityLabelPlural: 'Type of Institution',
  apiPath: '/institution-types',
  paginated: true,
  softDeletePut: false,
  columns: [
    { key: 'name', header: 'Name' },
    { key: 'code', header: 'Code' },
    { key: 'is_active', header: 'Status', render: (val: any) => val ? 'Active' : 'Inactive' }
  ],
  formFields: [
  {
    "name": "name",
    "label": "Institution type",
    "required": true,
    "placeholder": "e.g. Polyclinic"
  },
  {
    "name": "code",
    "label": "Code",
    "required": false,
    "placeholder": "Optional — e.g. PVC"
  }
],
  validationSchema: z.object({
    name: z.string().min(1, 'Institution type is required'),
    code: z.string().optional().nullable()
  }),
  defaultFormValues: { is_active: true },
  canDelete: true,
  canEdit: true,
  bulkImport: true,
  importTemplatePrefix: 'institution_types_import_template',
  permissionMatrix: false,
};
