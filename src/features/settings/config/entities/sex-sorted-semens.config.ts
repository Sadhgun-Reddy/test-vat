import { z } from 'zod';
import { EntityConfig } from '../types';

export const sexSortedSemensConfig: EntityConfig<any> = {
  entityName: 'sex-sorted-semens',
  entityLabel: 'Sex Sorted Semen',
  entityLabelPlural: 'Sex Sorted Semen',
  apiPath: undefined,
  paginated: false,
  softDeletePut: false,
  columns: [
    { key: 'name', header: 'Name' },
    { key: 'is_active', header: 'Status', render: (val: any) => val ? 'Active' : 'Inactive' }
  ],
  formFields: [
  {
    "name": "name",
    "label": "Type / batch label",
    "required": true
  }
],
  validationSchema: z.object({
    name: z.string().min(1, 'Type / batch label is required')
  }),
  defaultFormValues: { is_active: true },
  canDelete: true,
  canEdit: true,
  bulkImport: false,
  importTemplatePrefix: undefined,
  permissionMatrix: false,
};
