import { z } from 'zod';
import { EntityConfig } from '../types';

export const districtsConfig: EntityConfig<any> = {
  entityName: 'districts',
  entityLabel: 'District',
  entityLabelPlural: 'District',
  apiPath: '/districts',
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
    "label": "District name",
    "required": true,
    "placeholder": "e.g. Hyderabad"
  },
  {
    "name": "code",
    "label": "Code",
    "required": false,
    "placeholder": "Optional — e.g. HYD, or leave blank to auto-generate"
  }
],
  validationSchema: z.object({
    name: z.string().min(1, 'District name is required'),
    code: z.string().optional().nullable()
  }),
  defaultFormValues: { is_active: true },
  canDelete: true,
  canEdit: true,
  bulkImport: true,
  importTemplatePrefix: 'districts_import_template',
  permissionMatrix: false,
};
