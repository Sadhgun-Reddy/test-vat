import { z } from 'zod';
import { EntityConfig } from '../types';

export const breedsConfig: EntityConfig<any> = {
  entityName: 'breeds',
  entityLabel: 'Breeds',
  entityLabelPlural: 'Breeds',
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
    "label": "Animal type",
    "type": "select",
    "optionsFrom": "animal-types",
    "optionLabel": "name",
    "required": true
  },
  {
    "name": "name",
    "label": "Breed name",
    "required": true
  }
],
  validationSchema: z.object({
    animal_type_id: z.string(),
    name: z.string().min(1, 'Breed name is required')
  }),
  defaultFormValues: { is_active: true },
  canDelete: true,
  canEdit: true,
  bulkImport: true,
  importTemplatePrefix: 'breeds_import_template',
  permissionMatrix: false,
};
