import { z } from 'zod';
import { EntityConfig } from '../types';

export const leaveReasonsConfig: EntityConfig<any> = {
  entityName: 'leave-reasons',
  entityLabel: 'Leave Reasons',
  entityLabelPlural: 'Leave Reasons',
  apiPath: undefined,
  paginated: false,
  softDeletePut: false,
  columns: [
    { key: 'name', header: 'Name' },
    { key: 'days', header: 'Days' },
    { key: 'is_active', header: 'Status', render: (val: any) => val ? 'Active' : 'Inactive' }
  ],
  formFields: [
  {
    "name": "name",
    "label": "Leave reason",
    "required": true
  },
  {
    "name": "days",
    "label": "Max days allowed",
    "type": "number",
    "placeholder": "e.g. 12 (leave blank for unlimited)"
  }
],
  validationSchema: z.object({
    name: z.string().min(1, 'Leave reason is required'),
    days: z.coerce.number().optional().nullable()
  }),
  defaultFormValues: { is_active: true },
  canDelete: true,
  canEdit: true,
  bulkImport: false,
  importTemplatePrefix: undefined,
  permissionMatrix: false,
};
