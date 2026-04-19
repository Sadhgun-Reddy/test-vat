import { z } from 'zod';
import { EntityConfig } from '../types';

export const vaccinationTypesConfig: EntityConfig<any> = {
  entityName: 'vaccination-types',
  entityLabel: 'Vaccination Type',
  entityLabelPlural: 'Vaccination Type',
  apiPath: undefined,
  paginated: false,
  softDeletePut: false,
  columns: [
    { key: 'name', header: 'Name' },
    { key: 'animal_type', header: 'Animal type' },
    { key: 'is_active', header: 'Status', render: (val: any) => val ? 'Active' : 'Inactive' }
  ],
  formFields: [
  {
    "name": "animal_type_id",
    "label": "Animal type (optional)",
    "type": "select",
    "optionsFrom": "animal-types",
    "optionLabel": "name",
    "required": false
  },
  {
    "name": "name",
    "label": "Vaccination type",
    "required": true
  }
],
  validationSchema: z.object({
    animal_type_id: z.string().optional().nullable(),
    name: z.string().min(1, 'Vaccination type is required')
  }),
  defaultFormValues: { is_active: true },
  canDelete: true,
  canEdit: true,
  bulkImport: true,
  importTemplatePrefix: 'vaccination_types_import_template',
  permissionMatrix: false,
};
