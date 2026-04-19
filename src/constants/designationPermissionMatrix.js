/**
 * VAHD-style permission matrix for Settings → Designation (job title / access profile).
 * Row ids are stable keys stored in designations.permissions JSON.
 */
const V = ['view'];
const CRUD = ['view', 'add', 'edit', 'delete'];

export const DESIGNATION_PERMISSION_MATRIX = [
  {
    section: 'Dashboard',
    rows: [{ id: 'dashboard', label: 'Dashboard', modes: V }],
  },
  {
    section: 'HRMS',
    rows: [
      { id: 'hrms_employees', label: 'Employee details', modes: CRUD },
      { id: 'hrms_attendance', label: 'Attendance', modes: CRUD },
      { id: 'hrms_leave', label: 'Leave management', modes: CRUD },
      { id: 'hrms_reports', label: 'HRMS reports', modes: V },
    ],
  },
  {
    section: 'Clinical & pharmacy',
    rows: [
      { id: 'clinical_cases', label: 'Cases / patients', modes: CRUD },
      { id: 'clinical_vaccination', label: 'Vaccination', modes: CRUD },
      { id: 'clinical_drugs', label: 'Drugs', modes: CRUD },
      { id: 'clinical_stock', label: 'Stock', modes: CRUD },
    ],
  },
  {
    section: 'Settings — geography & institutions',
    rows: [
      { id: 'settings_district', label: 'District', modes: CRUD, import: true },
      { id: 'settings_mandal', label: 'Mandal', modes: CRUD, import: true },
      { id: 'settings_town', label: 'Village / town', modes: CRUD, import: true },
      { id: 'settings_institution_type', label: 'Type of institution', modes: CRUD, import: true },
      { id: 'settings_place_of_working', label: 'Place of working', modes: CRUD, import: true },
    ],
  },
  {
    section: 'Settings — HR & reference data',
    rows: [
      { id: 'settings_designation', label: 'Designation', modes: CRUD },
      { id: 'settings_posting_type', label: 'Type of posting', modes: CRUD },
      { id: 'settings_qualification', label: 'Qualification', modes: CRUD },
      { id: 'settings_specialization', label: 'Specialization', modes: CRUD },
      { id: 'settings_diagnostics', label: 'Diagnostics', modes: CRUD },
      { id: 'settings_animal_type', label: 'Animal type', modes: CRUD },
      { id: 'settings_breed', label: 'Breeds', modes: CRUD },
      { id: 'settings_vaccination_type', label: 'Vaccination type', modes: CRUD },
      { id: 'settings_operation_type', label: 'Surgical type', modes: CRUD },
      { id: 'settings_operation', label: 'Surgical', modes: CRUD },
      { id: 'settings_item', label: 'Items', modes: CRUD },
      { id: 'settings_grampanchayath', label: 'Grampanchayath', modes: CRUD },
      { id: 'settings_leave_reason', label: 'Leave reasons', modes: CRUD },
      { id: 'settings_farmer', label: 'Farmers', modes: CRUD },
      { id: 'settings_sex_sorted_semen', label: 'Sex sorted semen', modes: CRUD },
    ],
  },
  {
    section: 'Settings — finance & calendar',
    rows: [
      { id: 'settings_financial_year', label: 'Financial year', modes: CRUD },
      { id: 'settings_scheme', label: 'Scheme', modes: CRUD },
      { id: 'settings_quarter', label: 'Quarter', modes: CRUD },
      { id: 'settings_budget_allocation', label: 'Budget / percentage allocation', modes: CRUD },
      { id: 'settings_drug_allocation', label: 'Allocation form', modes: CRUD },
      { id: 'settings_policy', label: 'Policies', modes: CRUD },
      { id: 'settings_calendar', label: 'Calendar / holidays', modes: CRUD },
    ],
  },
  {
    section: 'Settings — fodder',
    rows: [
      { id: 'settings_seed_type', label: 'Type of seed', modes: CRUD },
      { id: 'settings_unit_size', label: 'Unit size', modes: CRUD },
      { id: 'settings_fodder_item', label: 'Fodder items', modes: CRUD },
    ],
  },
  {
    section: 'Reports',
    rows: [{ id: 'reports', label: 'Reports (all)', modes: V }],
  },
];
