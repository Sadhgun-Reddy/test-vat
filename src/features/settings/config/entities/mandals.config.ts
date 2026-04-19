import { z } from 'zod';
import { EntityConfig } from '../types';

export const mandalsConfig: EntityConfig<any> = {
  entityName: 'mandals',
  entityLabel: 'Mandal',
  entityLabelPlural: 'Mandal',
  apiPath: '/mandals',
  paginated: true,
  softDeletePut: false,
  columns: [
    { key: 'name', header: 'Name' },
    { key: 'district', header: 'District' },
    { key: 'is_active', header: 'Status', render: (val: any) => val ? 'Active' : 'Inactive' }
  ],
  formFields: [
  {
    "name": "district_id",
    "label": "District",
    "type": "select",
    "optionsFrom": "districts",
    "optionLabel": "name",
    "required": true
  },
  {
    "name": "name",
    "label": "Mandal name",
    "required": true
  },
  {
    "name": "code",
    "label": "Code",
    "placeholder": "Optional"
  }
],
  validationSchema: z.object({
    district_id: z.string(),
    name: z.string().min(1, 'Mandal name is required'),
    code: z.string().optional().nullable()
  }),
  defaultFormValues: { is_active: true },
  canDelete: true,
  canEdit: true,
  bulkImport: true,
  importTemplatePrefix: 'mandals_import_template',
  permissionMatrix: false,
};
