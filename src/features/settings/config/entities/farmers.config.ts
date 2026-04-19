import { z } from 'zod';
import { EntityConfig } from '../types';

export const farmersConfig: EntityConfig<any> = {
  entityName: 'farmers',
  entityLabel: 'Farmers',
  entityLabelPlural: 'Farmers',
  apiPath: '/farmers',
  paginated: true,
  softDeletePut: true,
  columns: [
    { key: 'name', header: 'Name' },
    { key: 'phone', header: 'Phone' },
    { key: 'aadhar', header: 'Aadhar' },
    { key: 'district', header: 'District' }
  ],
  formFields: [
  {
    "name": "name",
    "label": "Farmer name",
    "required": true
  },
  {
    "name": "phone",
    "label": "Phone",
    "required": true
  },
  {
    "name": "aadhar_no",
    "label": "Aadhar",
    "placeholder": "Optional"
  },
  {
    "name": "district_id",
    "label": "District",
    "type": "select",
    "optionsFrom": "districts",
    "optionLabel": "name",
    "required": false
  }
],
  validationSchema: z.object({
    name: z.string().min(1, 'Farmer name is required'),
    phone: z.string().min(1, 'Phone is required'),
    aadhar_no: z.string().optional().nullable(),
    district_id: z.string().optional().nullable()
  }),
  defaultFormValues: { is_active: true },
  canDelete: true,
  canEdit: true,
  bulkImport: false,
  importTemplatePrefix: undefined,
  permissionMatrix: false,
};
