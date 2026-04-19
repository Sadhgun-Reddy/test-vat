import { z } from 'zod';
import { EntityConfig } from '../types';

export const financialYearsConfig: EntityConfig<any> = {
  entityName: 'financial-years',
  entityLabel: 'Financial Year',
  entityLabelPlural: 'Financial Year',
  apiPath: undefined,
  paginated: false,
  softDeletePut: false,
  columns: [
    { key: 'label', header: 'Label' },
    { key: 'start', header: 'Start' },
    { key: 'end', header: 'End' },
    { key: 'current', header: 'Current' }
  ],
  formFields: [
  {
    "name": "label",
    "label": "Label",
    "required": true,
    "placeholder": "e.g. 2025-26"
  },
  {
    "name": "start_date",
    "label": "Start date",
    "type": "date",
    "required": true
  },
  {
    "name": "end_date",
    "label": "End date",
    "type": "date",
    "required": true
  },
  {
    "name": "is_current",
    "label": "Current financial year",
    "type": "checkbox"
  }
],
  validationSchema: z.object({
    label: z.string().min(1, 'Label is required'),
    start_date: z.string(),
    end_date: z.string(),
    is_current: z.boolean().optional().nullable()
  }),
  defaultFormValues: { is_active: true },
  canDelete: true,
  canEdit: true,
  bulkImport: false,
  importTemplatePrefix: undefined,
  permissionMatrix: false,
};
