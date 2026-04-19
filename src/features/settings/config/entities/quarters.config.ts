import { z } from 'zod';
import { EntityConfig } from '../types';

export const quartersConfig: EntityConfig<any> = {
  entityName: 'quarters',
  entityLabel: 'Quarter',
  entityLabelPlural: 'Quarter',
  apiPath: undefined,
  paginated: false,
  softDeletePut: false,
  columns: [
    { key: 'financial_year', header: 'Financial year' },
    { key: 'quarter', header: 'Quarter' },
    { key: 'start', header: 'Start' },
    { key: 'end', header: 'End' },
    { key: 'is_active', header: 'Status', render: (val: any) => val ? 'Active' : 'Inactive' }
  ],
  formFields: [
  {
    "name": "financial_year_id",
    "label": "Financial year",
    "type": "select",
    "optionsFrom": "financial-years",
    "optionLabel": "label",
    "required": true,
    "placeholderSelect": "Select Financial Year"
  },
  {
    "name": "quarter_no",
    "label": "Quarter number",
    "type": "select",
    "options": [
      {
        "value": "1",
        "label": "I"
      },
      {
        "value": "2",
        "label": "II"
      },
      {
        "value": "3",
        "label": "III"
      },
      {
        "value": "4",
        "label": "IV"
      }
    ],
    "required": true
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
  }
],
  validationSchema: z.object({
    financial_year_id: z.string(),
    quarter_no: z.string(),
    start_date: z.string(),
    end_date: z.string()
  }),
  defaultFormValues: { is_active: true },
  canDelete: true,
  canEdit: true,
  bulkImport: false,
  importTemplatePrefix: undefined,
  permissionMatrix: false,
};
