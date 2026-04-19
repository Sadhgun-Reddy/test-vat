import { z } from 'zod';
import { EntityConfig } from '../types';

export const specializationsConfig: EntityConfig<any> = {
  entityName: 'specializations',
  entityLabel: 'Specialization',
  entityLabelPlural: 'Specialization',
  apiPath: undefined,
  paginated: false,
  softDeletePut: false,
  columns: [
    { key: 'name', header: 'Name' },
    { key: 'qualification', header: 'Qualification' },
    { key: 'is_active', header: 'Status', render: (val: any) => val ? 'Active' : 'Inactive' }
  ],
  formFields: [
  {
    "name": "qualification_id",
    "label": "Qualification",
    "type": "select",
    "optionsFrom": "qualifications",
    "optionLabel": "name",
    "required": false
  },
  {
    "name": "name",
    "label": "Specialization",
    "required": true
  }
],
  validationSchema: z.object({
    qualification_id: z.string().optional().nullable(),
    name: z.string().min(1, 'Specialization is required')
  }),
  defaultFormValues: { is_active: true },
  canDelete: true,
  canEdit: true,
  bulkImport: true,
  importTemplatePrefix: 'specializations_import_template',
  permissionMatrix: false,
};
