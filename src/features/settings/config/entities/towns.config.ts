import { z } from 'zod';
import { EntityConfig } from '../types';

export const townsConfig: EntityConfig<any> = {
  entityName: 'towns',
  entityLabel: 'Village/Town',
  entityLabelPlural: 'Village/Town',
  apiPath: '/towns',
  paginated: true,
  softDeletePut: false,
  columns: [
    { key: 'name', header: 'Name' },
    { key: 'mandal', header: 'Mandal' },
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
    "name": "mandal_id",
    "label": "Mandal",
    "type": "select",
    "optionsFrom": "mandals",
    "optionLabel": "name",
    "optionSub": "district_name",
    "filterByDistrict": true,
    "required": true
  },
  {
    "name": "name",
    "label": "Village / town name",
    "required": true
  },
  {
    "name": "code",
    "label": "Village code",
    "placeholder": "Optional"
  }
],
  validationSchema: z.object({
    district_id: z.string(),
    mandal_id: z.string(),
    name: z.string().min(1, 'Village / town name is required'),
    code: z.string().optional().nullable()
  }),
  defaultFormValues: { is_active: true },
  canDelete: true,
  canEdit: true,
  bulkImport: true,
  importTemplatePrefix: 'towns_import_template',
  permissionMatrix: false,
};
