import { z } from 'zod';
import { EntityConfig } from '../types';

export const grampanchayathsConfig: EntityConfig<any> = {
  entityName: 'grampanchayaths',
  entityLabel: 'Grampanchayath',
  entityLabelPlural: 'Grampanchayath',
  apiPath: undefined,
  paginated: false,
  softDeletePut: false,
  columns: [
    { key: 'name', header: 'Name' },
    { key: 'town', header: 'Town' },
    { key: 'is_active', header: 'Status', render: (val: any) => val ? 'Active' : 'Inactive' }
  ],
  formFields: [
  {
    "name": "town_id",
    "label": "Town (optional)",
    "type": "select",
    "optionsFrom": "towns",
    "optionLabel": "name",
    "optionSub": "mandal_name",
    "required": false
  },
  {
    "name": "name",
    "label": "Grampanchayath name",
    "required": true
  }
],
  validationSchema: z.object({
    town_id: z.string().optional().nullable(),
    name: z.string().min(1, 'Grampanchayath name is required')
  }),
  defaultFormValues: { is_active: true },
  canDelete: true,
  canEdit: true,
  bulkImport: true,
  importTemplatePrefix: 'grampanchayaths_import_template',
  permissionMatrix: false,
};
