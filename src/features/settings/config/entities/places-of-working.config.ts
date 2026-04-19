import { z } from 'zod';
import { EntityConfig } from '../types';

export const placesOfWorkingConfig: EntityConfig<any> = {
  entityName: 'places-of-working',
  entityLabel: 'Place of Working',
  entityLabelPlural: 'Place of Working',
  apiPath: '/places-of-working',
  paginated: true,
  softDeletePut: false,
  columns: [
    { key: 'name', header: 'Name' },
    { key: 'district', header: 'District' },
    { key: 'institution_type', header: 'Institution Type' },
    { key: 'is_active', header: 'Status', render: (val: any) => val ? 'Active' : 'Inactive' }
  ],
  formFields: [],
  validationSchema: z.object({

  }),
  defaultFormValues: { is_active: true },
  canDelete: true,
  canEdit: true,
  bulkImport: true,
  importTemplatePrefix: 'places_import_template',
  permissionMatrix: false,
};
