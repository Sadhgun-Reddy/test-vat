// src/pages/settings/SettingsPage.jsx
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient, useQueries } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { syncManager } from '../../sync/syncManager';
import { useSync } from '../../store/SyncContext';
import {
  PageWrap, PageHead, Card, DataTable, Badge, Btn,
  Modal, Field, inputStyle, EmptyState,
} from '../../components/ui';
import { DesignationPermissionMatrix } from '../../components/settings/DesignationPermissionMatrix';
import PoliciesSettingsPage from './PoliciesSettingsPage';
import CalendarHolidaysPage from './CalendarHolidaysPage';
import BudgetAllocationsPage from './BudgetAllocationsPage';
import InstitutionSettingsPage from './InstitutionSettingsPage';
import toast from 'react-hot-toast';

const DRUG_CATEGORIES = ['antibiotic', 'antiparasitic', 'vaccine', 'analgesic', 'hormone', 'vitamin', 'other'];

const QUARTER_ROMAN = ['I', 'II', 'III', 'IV'];
const QUARTER_NO_OPTIONS = QUARTER_ROMAN.map((label, i) => ({ value: String(i + 1), label }));

/** Master tiles aligned with VAHD reference (Settings + Fodder). */
const SETTINGS_CONFIG = [
  // —— Settings (reference order) ——
  {
    key: 'districts',
    label: 'District',
    icon: '🗺',
    section: 'Settings',
    /** CRUD + paginated list on /api/v1/districts; dropdowns still use GET /settings/districts (active-only). */
    apiPath: '/districts',
    bulkImport: true,
    deleteAll: true,
    importTemplatePrefix: 'districts_import_template',
    paginated: true,
    listKey: 'districts',
    columns: ['Name', 'Code', 'Status'],
    fields: [
      { name: 'name', label: 'District name', required: true, placeholder: 'e.g. Hyderabad' },
      { name: 'code', label: 'Code', required: false, placeholder: 'Optional — e.g. HYD, or leave blank to auto-generate' },
    ],
  },
  {
    key: 'mandals',
    label: 'Mandal',
    icon: '📍',
    section: 'Settings',
    apiPath: '/mandals',
    bulkImport: true,
    deleteAll: true,
    importTemplatePrefix: 'mandals_import_template',
    paginated: true,
    listKey: 'mandals',
    listColumnKeys: ['district_name', 'district_code', 'name', 'code'],
    tableColumnLabels: {
      district_name: 'District name',
      district_code: 'District code',
      name: 'Mandal name',
      code: 'Mandal code',
    },
    hideSerialColumn: true,
    columns: ['Name', 'District', 'Status'],
    fields: [
      { name: 'district_id', label: 'District', type: 'select', optionsFrom: 'districts', optionLabel: 'name', required: true },
      { name: 'name', label: 'Mandal name', required: true },
      { name: 'code', label: 'Code', placeholder: 'Optional' },
    ],
  },
  {
    key: 'towns',
    label: 'Village/Town',
    icon: '🏘',
    section: 'Settings',
    apiPath: '/towns',
    deleteAll: true,
    paginated: true,
    listKey: 'towns',
    bulkImport: true,
    importTemplatePrefix: 'towns_import_template',
    listColumnKeys: ['district_name', 'district_code', 'mandal_name', 'mandal_code', 'name', 'code'],
    tableColumnLabels: {
      district_name: 'District name',
      district_code: 'District code',
      mandal_name: 'Mandal name',
      mandal_code: 'Mandal code',
      name: 'Village name',
      code: 'Village code',
    },
    hideSerialColumn: true,
    columns: ['Name', 'Mandal', 'District', 'Status'],
    fields: [
      { name: 'district_id', label: 'District', type: 'select', optionsFrom: 'districts', optionLabel: 'name', required: true },
      {
        name: 'mandal_id',
        label: 'Mandal',
        type: 'select',
        optionsFrom: 'mandals',
        optionLabel: 'name',
        optionSub: 'district_name',
        filterByDistrict: true,
        required: true,
      },
      { name: 'name', label: 'Village / town name', required: true },
      { name: 'code', label: 'Village code', placeholder: 'Optional' },
    ],
  },
  {
    key: 'institution-types',
    label: 'Type of Institution',
    icon: '🏢',
    section: 'Settings',
    apiPath: '/institution-types',
    paginated: true,
    listKey: 'institution_types',
    bulkImport: true,
    importTemplatePrefix: 'institution_types_import_template',
    columns: ['Name', 'Code', 'Status'],
    fields: [
      { name: 'name', label: 'Institution type', required: true, placeholder: 'e.g. Polyclinic' },
      { name: 'code', label: 'Code', required: false, placeholder: 'Optional — e.g. PVC' },
    ],
  },
  {
    key: 'places-of-working',
    label: 'Place of Working',
    icon: '💼',
    section: 'Settings',
    apiPath: '/places-of-working',
    deleteAll: true,
    listKey: 'places_of_working',
    bulkImport: true,
    importTemplatePrefix: 'places_import_template',
    listColumnKeys: [
      'name',
      'district_name',
      'district_code',
      'mandal_name',
      'mandal_code',
      'town_name',
      'town_code',
      'institution_type_name',
      'building_name',
      'department',
      'address',
      'latitude',
      'longitude',
    ],
    tableColumnLabels: {
      name: 'Institution name',
      district_name: 'District name',
      district_code: 'District code',
      mandal_name: 'Mandal name',
      mandal_code: 'Mandal code',
      town_name: 'Village name',
      town_code: 'Village code',
      institution_type_name: 'Institutional name',
      building_name: 'Building name',
      department: 'Department',
      address: 'Address',
      latitude: 'Latitude',
      longitude: 'Longitude',
    },
    hideSerialColumn: true,
    columns: ['Name', 'District', 'Institution Type', 'Status'],
    fields: [],
    paginated: true,
  },
  {
    key: 'institution-mapping',
    label: 'Institution',
    icon: '🏥',
    section: 'Settings',
    customPage: true,
  },
  {
    key: 'designations',
    label: 'Designation',
    icon: '🪪',
    section: 'Settings',
    /** VAHD-style View / Add / Edit / Delete (+ Import for bulk masters) matrix */
    permissionMatrix: true,
    bulkImport: true,
    deleteAll: true,
    importTemplatePrefix: 'designations_import_template',
    columns: ['Name', 'Status'],
    fields: [{ name: 'name', label: 'Designation name', required: true }],
  },
  {
    key: 'posting-types', label: 'Type of Posting', icon: '⇄', section: 'Settings',
    columns: ['Name', 'Status'],
    fields: [{ name: 'name', label: 'Posting type', required: true }],
  },
  {
    key: 'diagnostics',
    label: 'Diagnostics',
    icon: '🔬',
    section: 'Settings',
    bulkImport: true,
    importTemplatePrefix: 'diagnostics_import_template',
    columns: ['Name', 'Status'],
    fields: [{ name: 'name', label: 'Diagnostic / disease', required: true }],
  },
  {
    key: 'animal-types',
    label: 'Animal Type',
    icon: '🔤',
    section: 'Settings',
    bulkImport: true,
    importTemplatePrefix: 'animal_types_import_template',
    columns: ['Name', 'Status'],
    fields: [{ name: 'name', label: 'Animal type', required: true }],
  },
  {
    key: 'breeds',
    label: 'Breeds',
    icon: '🧬',
    section: 'Settings',
    bulkImport: true,
    importTemplatePrefix: 'breeds_import_template',
    columns: ['Name', 'Animal type', 'Status'],
    fields: [
      { name: 'animal_type_id', label: 'Animal type', type: 'select', optionsFrom: 'animal-types', optionLabel: 'name', required: true },
      { name: 'name', label: 'Breed name', required: true },
    ],
  },
  {
    key: 'vaccination-types',
    label: 'Vaccination Type',
    icon: '✳',
    section: 'Settings',
    bulkImport: true,
    importTemplatePrefix: 'vaccination_types_import_template',
    columns: ['Name', 'Animal type', 'Status'],
    fields: [
      { name: 'animal_type_id', label: 'Animal type (optional)', type: 'select', optionsFrom: 'animal-types', optionLabel: 'name', required: false },
      { name: 'name', label: 'Vaccination type', required: true },
    ],
  },
  {
    key: 'items',
    label: 'Items',
    icon: '📦',
    section: 'Settings',
    bulkImport: true,
    importTemplatePrefix: 'items_import_template',
    columns: ['Name', 'Status'],
    fields: [{ name: 'name', label: 'Item name', required: true }],
  },
  {
    key: 'operation-types',
    label: 'Surgical Type',
    icon: '⚙',
    section: 'Settings',
    bulkImport: true,
    importTemplatePrefix: 'operation_types_import_template',
    columns: ['Name', 'Status'],
    fields: [{ name: 'name', label: 'Surgical / operation type', required: true }],
  },
  {
    key: 'operations',
    label: 'Surgical',
    icon: '➕',
    section: 'Settings',
    bulkImport: true,
    importTemplatePrefix: 'operations_import_template',
    columns: ['Name', 'Surgical type', 'Status'],
    fields: [
      { name: 'operation_type_id', label: 'Surgical type', type: 'select', optionsFrom: 'operation-types', optionLabel: 'name', required: false },
      { name: 'name', label: 'Procedure name', required: true },
    ],
  },
  {
    key: 'qualifications',
    label: 'Qualification',
    icon: '📖',
    section: 'Settings',
    bulkImport: true,
    importTemplatePrefix: 'qualifications_import_template',
    columns: ['Name', 'Status'],
    fields: [{ name: 'name', label: 'Qualification', required: true }],
  },
  {
    key: 'specializations',
    label: 'Specialization',
    icon: '📄',
    section: 'Settings',
    bulkImport: true,
    importTemplatePrefix: 'specializations_import_template',
    columns: ['Name', 'Qualification', 'Status'],
    fields: [
      { name: 'qualification_id', label: 'Qualification', type: 'select', optionsFrom: 'qualifications', optionLabel: 'name', required: false },
      { name: 'name', label: 'Specialization', required: true },
    ],
  },
  {
    key: 'grampanchayaths',
    label: 'Grampanchayath',
    icon: '🏠',
    section: 'Settings',
    bulkImport: true,
    importTemplatePrefix: 'grampanchayaths_import_template',
    columns: ['Name', 'Town', 'Status'],
    fields: [
      { name: 'town_id', label: 'Town (optional)', type: 'select', optionsFrom: 'towns', optionLabel: 'name', optionSub: 'mandal_name', required: false },
      { name: 'name', label: 'Grampanchayath name', required: true },
    ],
  },
  {
    key: 'drug-allocations', label: 'Allocation Form', icon: '📑', section: 'Settings',
    apiPath: '/allocations',
    listKey: 'allocations',
    paginated: true,
    hideDelete: true,
    hideEdit: true,
    columns: ['Drug', 'District', 'Qty', 'Status'],
    fields: [
      { name: 'drug_id', label: 'Drug', type: 'select', optionsFrom: 'drugs', optionLabel: 'name', optionSub: 'code', required: true },
      { name: 'district_id', label: 'District', type: 'select', optionsFrom: 'districts', optionLabel: 'name', required: true },
      { name: 'scheme_id', label: 'Scheme (optional)', type: 'select', optionsFrom: 'schemes', optionLabel: 'name', required: false },
      { name: 'financial_year_id', label: 'Financial year (optional)', type: 'select', optionsFrom: 'financial-years', optionLabel: 'label', required: false },
      { name: 'quarter_id', label: 'Quarter (optional)', type: 'select', optionsFrom: 'quarters', optionLabel: 'quarter_no', required: false },
      { name: 'allocated_qty', label: 'Allocated quantity', type: 'number', required: true, placeholder: '1' },
    ],
  },
  {
    key: 'drugs', label: 'Drugs', icon: '🌿', section: 'Settings',
    bulkImport: true,
    importTemplatePrefix: 'drugs_import_template',
    columns: ['Code', 'Name', 'Category', 'Unit', 'Status'],
    fields: [
      { name: 'code', label: 'Drug code', required: true },
      { name: 'name', label: 'Name', required: true },
      { name: 'generic_name', label: 'Generic name', placeholder: 'Optional' },
      { name: 'category', label: 'Category', type: 'select', options: DRUG_CATEGORIES, required: true },
      { name: 'unit', label: 'Unit', required: true, placeholder: 'e.g. ml, strip' },
      { name: 'unit_price', label: 'Unit price', type: 'number', required: true },
      { name: 'gst_pct', label: 'GST %', type: 'number', required: false },
    ],
  },
  {
    key: 'financial-years', label: 'Financial Year', icon: '₹', section: 'Settings',
    columns: ['Label', 'Start', 'End', 'Current'],
    fields: [
      { name: 'label', label: 'Label', required: true, placeholder: 'e.g. 2025-26' },
      { name: 'start_date', label: 'Start date', type: 'date', required: true },
      { name: 'end_date', label: 'End date', type: 'date', required: true },
      { name: 'is_current', label: 'Current financial year', type: 'checkbox' },
    ],
  },
  {
    key: 'schemes', label: 'Scheme', icon: '📊', section: 'Settings',
    bulkImport: true,
    importTemplatePrefix: 'schemes_import_template',
    hideColumnKeys: ['financial_year_id'],
    columns: ['Financial year', 'Name', 'Status'],
    fields: [
      {
        name: 'financial_year_id',
        label: 'Financial year',
        type: 'select',
        optionsFrom: 'financial-years',
        optionLabel: 'label',
        required: true,
      },
      { name: 'name', label: 'Scheme name', required: true, placeholder: 'Enter scheme name' },
    ],
  },
  {
    key: 'quarters', label: 'Quarter', icon: '⬡', section: 'Settings',
    hideColumnKeys: ['financial_year_id'],
    columns: ['Financial year', 'Quarter', 'Start', 'End', 'Status'],
    fields: [
      {
        name: 'financial_year_id',
        label: 'Financial year',
        type: 'select',
        optionsFrom: 'financial-years',
        optionLabel: 'label',
        required: true,
        placeholderSelect: 'Select Financial Year',
      },
      {
        name: 'quarter_no',
        label: 'Quarter number',
        type: 'select',
        options: QUARTER_NO_OPTIONS,
        required: true,
      },
      { name: 'start_date', label: 'Start date', type: 'date', required: true },
      { name: 'end_date', label: 'End date', type: 'date', required: true },
    ],
  },
  {
    key: 'form-types',
    label: 'Form Type',
    icon: '📝',
    section: 'Settings',
    columns: ['Name', 'Status'],
    fields: [{ name: 'name', label: 'Form type name', required: true, placeholder: 'e.g. Allopathic Medicine' }],
  },
  {
    key: 'budget-allocations',
    label: 'Budget / Percentage Allocation',
    icon: '🥧',
    section: 'Settings',
    customPage: true,
    apiPath: '/settings/budget-allocations',
  },
  {
    key: 'policies', label: 'Policies', icon: '📋', section: 'Settings',
    customPage: true,
  },
  {
    key: 'calendar-holidays', label: 'Calendar', icon: '📅', section: 'Settings',
    customPage: true,
  },
  {
    key: 'farmers', label: 'Farmers', icon: '👤', section: 'Settings',
    apiPath: '/farmers',
    listKey: 'farmers',
    paginated: true,
    softDeletePut: true,
    /** Fixed columns only — do not derive from API object keys (avoids showing every DB field). */
    listColumnKeys: ['name', 'phone', 'aadhar', 'district'],
    columns: ['Name', 'Phone', 'Aadhar', 'District'],
    fields: [
      { name: 'name', label: 'Farmer name', required: true },
      { name: 'phone', label: 'Phone', required: true },
      { name: 'aadhar_no', label: 'Aadhar', placeholder: 'Optional' },
      { name: 'district_id', label: 'District', type: 'select', optionsFrom: 'districts', optionLabel: 'name', required: false },
    ],
  },
  {
    key: 'sex-sorted-semens', label: 'Sex Sorted Semen', icon: '🧬', section: 'Settings',
    columns: ['Name', 'Status'],
    fields: [{ name: 'name', label: 'Type / batch label', required: true }],
  },
  {
    key: 'leave-reasons', label: 'Leave Reasons', icon: '📰', section: 'Settings',
    columns: ['Name', 'Days', 'Status'],
    fields: [
      { name: 'name', label: 'Leave reason', required: true },
      { name: 'days', label: 'Max days allowed', type: 'number', placeholder: 'e.g. 12 (leave blank for unlimited)' },
    ],
  },
  // —— Fodder ——
  {
    key: 'seed-types', label: 'Type of Seed', icon: '🌱', section: 'Fodder',
    columns: ['Name', 'Status'],
    fields: [{ name: 'name', label: 'Seed type', required: true }],
  },
  {
    key: 'unit-sizes', label: 'Unit Size', icon: '📏', section: 'Fodder',
    columns: ['Name', 'Status'],
    fields: [{ name: 'name', label: 'Unit', required: true }],
  },
  {
    key: 'fodder-items',
    label: 'Fodder Items',
    icon: '📖',
    section: 'Fodder',
    modalSize: 'md',
    listColumnKeys: [
      'name',
      'seed_type_name',
      'unit_size_name',
      'unit_price',
      'beneficiary_contribution_per_unit',
      'subsidy_per_unit',
    ],
    columns: ['Name', 'Seed type', 'Unit', 'Unit price', 'Beneficiary / unit', 'Subsidy / unit', 'Status'],
    fields: [
      {
        name: 'name',
        label: 'Name',
        required: false,
        placeholder: 'Optional',
      },
      {
        name: 'seed_type_id',
        label: 'Type of seed',
        type: 'select',
        optionsFrom: 'seed-types',
        optionLabel: 'name',
        required: true,
        placeholderSelect: 'Select',
      },
      {
        name: 'unit_size_id',
        label: 'Unit size',
        type: 'select',
        optionsFrom: 'unit-sizes',
        optionLabel: 'name',
        required: true,
        placeholderSelect: 'Select',
      },
      { name: 'unit_price', label: 'Unit price', type: 'number', required: true },
      {
        name: 'beneficiary_contribution_per_unit',
        label: 'Beneficiary contribution per unit',
        type: 'number',
        required: true,
      },
      { name: 'subsidy_per_unit', label: 'Subsidy per unit', type: 'number', required: true },
    ],
  },
];

const FODDER_ITEMS_TABLE_HEADERS = {
  name: 'Name',
  seed_type_name: 'Seed type',
  unit_size_name: 'Unit size',
  unit_price: 'Unit price',
  beneficiary_contribution_per_unit: 'Beneficiary / unit',
  subsidy_per_unit: 'Subsidy / unit',
};

const SECTION_ORDER = ['Settings', 'Fodder'];

const grouped = SECTION_ORDER.map(sec => ({
  section: sec,
  items: SETTINGS_CONFIG.filter(c => c.section === sec),
}));

const PLACES_PAGE_SIZE = 50;
const DEFAULT_PAGE_SIZE = 50;

function listBasePath(config) {
  return config.apiPath || `/settings/${config.key}`;
}

function unwrapList(data, config) {
  if (data == null) return [];
  if (config.listKey && typeof data === 'object' && !Array.isArray(data)) {
    return Array.isArray(data[config.listKey]) ? data[config.listKey] : [];
  }
  return Array.isArray(data) ? data : [];
}

function normalizeRowForForm(row, fields) {
  if (!row || !fields?.length) return row;
  const o = { ...row };
  fields.forEach((f) => {
    if (f.type === 'date' && o[f.name] && typeof o[f.name] === 'string') {
      o[f.name] = o[f.name].slice(0, 10);
    }
    if (f.type === 'checkbox') {
      o[f.name] = !!o[f.name];
    }
    if (f.type === 'number' && o[f.name] != null && o[f.name] !== '') {
      o[f.name] = Number(o[f.name]);
    }
    if (f.name === 'quarter_no' && o[f.name] != null && o[f.name] !== '') {
      o[f.name] = String(Number(o[f.name]));
    }
    if ((f.name === 'seed_type_id' || f.name === 'unit_size_id') && o[f.name] != null && o[f.name] !== '') {
      o[f.name] = String(o[f.name]);
    }
  });
  return o;
}

// ── Sub-page: one setting detail ──────────────────────────────
function SettingSubPage({ config, onBack }) {
  const navigate = useNavigate();
  const { isOnline } = useSync();
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [page, setPage] = useState(1);
  const [showForm, setShowForm] = useState(false);
  const [editRow, setEditRow] = useState(null);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [permMatrix, setPermMatrix] = useState({});
  const importFileRef = useRef(null);

  const basePath = listBasePath(config);
  const isPlaces = config.key === 'places-of-working';
  const isPaginated = config.paginated || isPlaces;

  const sanitizePayload = (raw) => {
    const p = { ...raw };
    const uuidKeys = ['scheme_id', 'financial_year_id', 'quarter_id', 'animal_type_id', 'operation_type_id',
      'qualification_id', 'town_id', 'district_id', 'mandal_id', 'drug_id', 'seed_type_id', 'unit_size_id'];
    if (config.key === 'towns') delete p.district_id;
    uuidKeys.forEach((k) => {
      if (p[k] === '') p[k] = null;
    });
    return p;
  };

  const optionKeys = useMemo(
    () => [...new Set((config.fields || []).filter(f => f.optionsFrom).map(f => f.optionsFrom))],
    [config.fields]
  );

  const optionQueries = useQueries({
    queries: optionKeys.map((k) => ({
      queryKey: ['setting', k],
      queryFn: async () => {
        const { data } = await syncManager.api.get(`/settings/${k}`);
        return Array.isArray(data) ? data : [];
      },
      enabled: showForm && isOnline && optionKeys.length > 0,
      staleTime: 60_000,
    })),
  });

  const optionsByKey = useMemo(() => {
    const m = {};
    optionKeys.forEach((k, i) => {
      m[k] = optionQueries[i]?.data || [];
    });
    return m;
  }, [optionKeys, optionQueries]);

  useEffect(() => {
    setSearch('');
    setDebouncedSearch('');
    setPage(1);
    setSelectedIds(new Set());
  }, [config.key]);

  useEffect(() => {
    if (!isPaginated) return;
    const t = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(t);
  }, [search, isPaginated]);

  useEffect(() => {
    if (!isPaginated) return;
    setPage(1);
  }, [debouncedSearch, isPaginated]);

  const { data, isLoading } = useQuery({
    queryKey: isPaginated
      ? ['setting', config.key, page, debouncedSearch]
      : ['setting', config.key],
    queryFn: async () => {
      if (isPaginated) {
        const params = new URLSearchParams({
          page: String(page),
          limit: String(isPlaces ? PLACES_PAGE_SIZE : DEFAULT_PAGE_SIZE),
        });
        if (debouncedSearch.trim() && (isPlaces || config.key === 'farmers' || config.key === 'districts' || config.key === 'mandals' || config.key === 'towns' || config.key === 'institution-types')) {
          params.set('search', debouncedSearch.trim());
        }
        // Soft-deleted rows stay in DB; list only active so Remove hides them after 204.
        if (config.key === 'districts' || config.key === 'mandals' || config.key === 'towns' || config.key === 'institution-types') params.set('active_only', 'true');
        const { data: d } = await syncManager.api.get(`${basePath}?${params}`);
        return d;
      }
      const { data: d } = await syncManager.api.get(basePath);
      return d;
    },
    enabled: isOnline,
    staleTime: config.key === 'fodder-items' ? 0 : 60_000,
  });

  const saveMutation = useMutation({
    mutationFn: async (fd) => {
      let payload;
      if (config.key === 'fodder-items') {
        payload = sanitizePayload({
          name: fd.name != null ? String(fd.name) : '',
          seed_type_id:
            fd.seed_type_id != null && String(fd.seed_type_id).trim() !== ''
              ? String(fd.seed_type_id).trim()
              : '',
          unit_size_id:
            fd.unit_size_id != null && String(fd.unit_size_id).trim() !== ''
              ? String(fd.unit_size_id).trim()
              : '',
          unit_price: fd.unit_price,
          beneficiary_contribution_per_unit: fd.beneficiary_contribution_per_unit,
          subsidy_per_unit: fd.subsidy_per_unit,
        });
        ['unit_price', 'beneficiary_contribution_per_unit', 'subsidy_per_unit'].forEach((k) => {
          const v = payload[k];
          if (v !== undefined && v !== null && v !== '') {
            const n = Number(v);
            if (Number.isFinite(n)) payload[k] = n;
          }
        });
      } else {
        payload = sanitizePayload({ ...fd });
        if (config.key === 'drug-allocations') {
          payload.allocated_qty = parseInt(payload.allocated_qty, 10);
        }
        if (config.key === 'financial-years') {
          payload.is_current = !!payload.is_current;
          ['start_date', 'end_date'].forEach((k) => {
            const v = payload[k];
            if (typeof v === 'string' && v.includes('T')) payload[k] = v.slice(0, 10);
          });
        }
        if (config.key === 'quarters') {
          payload.quarter_no = parseInt(payload.quarter_no, 10);
          ['start_date', 'end_date'].forEach((k) => {
            const v = payload[k];
            if (typeof v === 'string' && v.includes('T')) payload[k] = v.slice(0, 10);
          });
        }
      }
      if (editRow?.id) {
        const rid = String(editRow.id).trim();
        if (!rid || rid === 'undefined') {
          throw new Error('Invalid record id — refresh the page and try again.');
        }
        const { data: res } = await syncManager.api.put(`${basePath}/${encodeURIComponent(rid)}`, payload);
        return res;
      }
      const { data: res } = await syncManager.api.post(basePath, payload);
      return res;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['setting', config.key] });
      optionKeys.forEach(k => qc.invalidateQueries({ queryKey: ['setting', k] }));
      if (config.key === 'districts') qc.invalidateQueries({ queryKey: ['districts'] });
      if (config.key === 'mandals') qc.invalidateQueries({ queryKey: ['mandals'] });
      if (config.key === 'towns') qc.invalidateQueries({ queryKey: ['towns'] });
      if (config.key === 'institution-types') qc.invalidateQueries({ queryKey: ['institution-types'] });
      if (config.key === 'drugs') {
        qc.invalidateQueries({ queryKey: ['drugs'] });
        qc.invalidateQueries({ queryKey: ['drugs-select'] });
        qc.invalidateQueries({ queryKey: ['drugs-top'] });
      }
      if (config.key === 'financial-years') qc.invalidateQueries({ queryKey: ['financial-years'] });
      if (config.key === 'schemes') qc.invalidateQueries({ queryKey: ['schemes'] });
      if (config.key === 'quarters') qc.invalidateQueries({ queryKey: ['quarters'] });
      if (config.key === 'form-types') qc.invalidateQueries({ queryKey: ['form-types'] });
      if (config.key === 'fodder-items') qc.invalidateQueries({ queryKey: ['fodder-items'] });
      setShowForm(false);
      setEditRow(null);
      toast.success(editRow ? `${config.label} updated` : `${config.label} added`);
    },
    onError: err => toast.error(err.response?.data?.error || err.message || 'Save failed'),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id) => {
      const rid = id != null ? String(id).trim() : '';
      if (!rid || rid === 'undefined') throw new Error('Invalid record id');
      if (config.softDeletePut) {
        await syncManager.api.put(`${basePath}/${encodeURIComponent(rid)}`, { is_active: false });
        return;
      }
      await syncManager.api.delete(`${basePath}/${encodeURIComponent(rid)}`);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['setting', config.key] });
      if (config.key === 'districts') qc.invalidateQueries({ queryKey: ['districts'] });
      if (config.key === 'mandals') qc.invalidateQueries({ queryKey: ['mandals'] });
      if (config.key === 'towns') qc.invalidateQueries({ queryKey: ['towns'] });
      if (config.key === 'institution-types') qc.invalidateQueries({ queryKey: ['institution-types'] });
      if (config.key === 'drugs') {
        qc.invalidateQueries({ queryKey: ['drugs'] });
        qc.invalidateQueries({ queryKey: ['drugs-select'] });
        qc.invalidateQueries({ queryKey: ['drugs-top'] });
      }
      if (config.key === 'financial-years') qc.invalidateQueries({ queryKey: ['financial-years'] });
      if (config.key === 'schemes') qc.invalidateQueries({ queryKey: ['schemes'] });
      if (config.key === 'quarters') qc.invalidateQueries({ queryKey: ['quarters'] });
      if (config.key === 'form-types') qc.invalidateQueries({ queryKey: ['form-types'] });
      if (config.key === 'fodder-items') qc.invalidateQueries({ queryKey: ['fodder-items'] });
      toast.success('Record removed');
    },
    onError: (err) => toast.error(err.response?.data?.error || err.message || 'Delete failed'),
  });

  const deleteAllMutation = useMutation({
    mutationFn: async (ids) => {
      const body = ids && ids.length > 0 ? { ids } : undefined;
      const { data } = await syncManager.api.delete(`${basePath}/bulk`, { data: body });
      return data;
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['setting', config.key] });
      if (config.key === 'districts') qc.invalidateQueries({ queryKey: ['districts'] });
      if (config.key === 'mandals') qc.invalidateQueries({ queryKey: ['mandals'] });
      if (config.key === 'towns') qc.invalidateQueries({ queryKey: ['towns'] });
      if (config.key === 'places-of-working') {
        qc.invalidateQueries({ queryKey: ['places-of-working'] });
        qc.invalidateQueries({ queryKey: ['places-of-working-sale'] });
      }
      if (config.key === 'designations') qc.invalidateQueries({ queryKey: ['designations'] });
      setSelectedIds(new Set());
      toast.success(`${data.deleted} record(s) deleted`);
    },
    onError: (err) => toast.error(err.response?.data?.error || 'Delete failed'),
  });

  const fixInstTypesMutation = useMutation({
    mutationFn: async () => {
      const { data } = await syncManager.api.post('/places-of-working/fix-institution-types');
      return data;
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['setting', 'places-of-working'] });
      qc.invalidateQueries({ queryKey: ['places-of-working-sale'] });
      toast.success(`Updated ${data.total_updated} places with institution type`);
    },
    onError: (err) => toast.error(err.response?.data?.error || 'Fix failed'),
  });

  const bulkImportMutation = useMutation({
    mutationFn: async (file) => {
      const fd = new FormData();
      fd.append('file', file);
      const { data } = await syncManager.api.post(`${basePath}/import`, fd);
      return data;
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['setting', config.key] });
      if (config.key === 'districts') qc.invalidateQueries({ queryKey: ['districts'] });
      if (config.key === 'mandals') qc.invalidateQueries({ queryKey: ['mandals'] });
      if (config.key === 'towns') qc.invalidateQueries({ queryKey: ['towns'] });
      if (config.key === 'institution-types') qc.invalidateQueries({ queryKey: ['institution-types'] });
      if (config.key === 'places-of-working') {
        qc.invalidateQueries({ queryKey: ['places-of-working'] });
        qc.invalidateQueries({ queryKey: ['places-of-working-sale'] });
      }
      if (config.key === 'designations') qc.invalidateQueries({ queryKey: ['designations'] });
      if (config.key === 'animal-types') qc.invalidateQueries({ queryKey: ['animal-types'] });
      if (config.key === 'breeds') qc.invalidateQueries({ queryKey: ['breeds'] });
      if (config.key === 'vaccination-types') qc.invalidateQueries({ queryKey: ['vaccination-types'] });
      if (config.key === 'items') qc.invalidateQueries({ queryKey: ['items'] });
      if (config.key === 'operation-types') qc.invalidateQueries({ queryKey: ['operation-types'] });
      if (config.key === 'operations') qc.invalidateQueries({ queryKey: ['operations'] });
      if (config.key === 'qualifications') qc.invalidateQueries({ queryKey: ['qualifications'] });
      if (config.key === 'specializations') qc.invalidateQueries({ queryKey: ['specializations'] });
      if (config.key === 'grampanchayaths') qc.invalidateQueries({ queryKey: ['grampanchayaths'] });
      if (config.key === 'drugs') {
        qc.invalidateQueries({ queryKey: ['drugs'] });
        qc.invalidateQueries({ queryKey: ['drugs-select'] });
        qc.invalidateQueries({ queryKey: ['drugs-top'] });
      }
      if (config.key === 'schemes') qc.invalidateQueries({ queryKey: ['schemes'] });
      const msg = [
        `${data.inserted} inserted`,
        data.skipped
          ? (config.key === 'places-of-working'
              ? `${data.skipped} row(s) not imported (see errors)`
              : `${data.skipped} skipped (duplicate)`)
          : null,
      ].filter(Boolean).join(' · ');
      toast.success(msg || 'Import finished');
      if (data.errors?.length) {
        toast.error(
          data.errors.slice(0, 5).map((e) => `Row ${e.row}: ${e.message}`).join(' · '),
          { duration: 6000 }
        );
      }
      if (importFileRef.current) importFileRef.current.value = '';
    },
    onError: (err) => toast.error(err.response?.data?.error || err.message || 'Import failed'),
  });

  const { register, handleSubmit, reset, watch, setValue, formState: { errors } } = useForm();
  const watchDistrictId = config.key === 'towns' ? watch('district_id') : undefined;
  const prevDistrictForTownsRef = useRef(undefined);

  useEffect(() => {
    if (config.key !== 'towns') return;
    if (!showForm) {
      prevDistrictForTownsRef.current = undefined;
      return;
    }
    const d = watchDistrictId;
    if (prevDistrictForTownsRef.current !== undefined && String(prevDistrictForTownsRef.current) !== String(d ?? '')) {
      setValue('mandal_id', '');
    }
    prevDistrictForTownsRef.current = d;
  }, [watchDistrictId, config.key, showForm, setValue]);

  const openAdd = () => {
    const defs = {};
    (config.fields || []).forEach((f) => {
      if (f.type === 'checkbox') defs[f.name] = false;
      if (f.type === 'number') {
        if (config.key === 'fodder-items') {
          defs[f.name] = '';
        } else {
          defs[f.name] = ['allocated_qty', 'unit_price', 'gst_pct', 'spent_amount'].includes(f.name)
            ? (f.name === 'allocated_qty' ? 1 : 0)
            : '';
        }
      }
    });
    if (config.key === 'quarters') {
      defs.financial_year_id = '';
      defs.quarter_no = '1';
      defs.start_date = '';
      defs.end_date = '';
    }
    if (config.key === 'fodder-items') {
      defs.name = '';
      defs.seed_type_id = '';
      defs.unit_size_id = '';
    }
    reset(defs);
    if (config.permissionMatrix) setPermMatrix({});
    setEditRow(null);
    setShowForm(true);
  };

  const openEdit = async (row) => {
    let r = row;
    if (config.key === 'farmers' && row?.id && isOnline) {
      try {
        const { data } = await syncManager.api.get(`${basePath}/${encodeURIComponent(row.id)}`);
        r = data;
      } catch {
        toast.error('Could not load farmer details');
        return;
      }
    }
    reset(normalizeRowForForm(r, config.fields));
    if (config.permissionMatrix) {
      setPermMatrix(r.permissions && typeof r.permissions === 'object' ? r.permissions : {});
    }
    setEditRow(r);
    setShowForm(true);
  };

  let rawList;
  let totalCount;
  if (isPaginated) {
    if (Array.isArray(data)) {
      totalCount = data.length;
      const start = (page - 1) * (isPlaces ? PLACES_PAGE_SIZE : DEFAULT_PAGE_SIZE);
      rawList = data.slice(start, start + (isPlaces ? PLACES_PAGE_SIZE : DEFAULT_PAGE_SIZE));
    } else {
      rawList = unwrapList(data, config);
      totalCount = data?.total ?? rawList.length;
    }
  } else {
    rawList = unwrapList(data, config);
    totalCount = rawList.length;
  }

  const records = isPaginated && !isPlaces
    ? rawList
    : isPlaces
    ? rawList
    : rawList.filter(r =>
        !search || Object.values(r).some(v => String(v || '').toLowerCase().includes(search.toLowerCase()))
      );

  const dataCols = config.listColumnKeys?.length
    ? config.listColumnKeys
    : records.length
      ? Object.keys(records[0]).filter((k) => {
          if (['id', 'created_at', 'updated_at', 'sync_status', 'device_id', 'version'].includes(k)) return false;
          if (config.permissionMatrix && k === 'permissions') return false;
          if ((config.hideColumnKeys || []).includes(k)) return false;
          return true;
        })
      : [];

  const pageSize = isPlaces ? PLACES_PAGE_SIZE : DEFAULT_PAGE_SIZE;
  const totalPages = isPaginated ? Math.max(1, Math.ceil(totalCount / pageSize)) : 1;

  const showActions = (config.fields || []).length > 0 && !config.hideDelete;
  const showEditDelete = (config.fields || []).length > 0;
  const showEdit = !config.hideEdit;
  const showActionsColumn = showEditDelete && (showEdit || showActions);

  return (
    <PageWrap>
      <PageHead
        title={config.label}
        subtitle={`${config.section} · ${totalCount} records`}
        crumbs={['Home', 'Settings', config.label]}
        actions={
          <>
            <Btn variant="ghost" size="sm" onClick={onBack}>← Back</Btn>
            {config.key === 'farmers' && (
              <>
                <Btn
                  variant="outline"
                  size="sm"
                  onClick={() => navigate('/farmers/upload')}
                >
                  ⬆ Import Farmers
                </Btn>
                <a
                  href={`${('' || '').replace(/\/$/, '')}/farmers_import_template.xlsx`}
                  download="farmers_import_template.xlsx"
                  style={{
                    fontSize: 11, fontWeight: 600, color: 'var(--grn)',
                    border: '1px solid var(--grn-bdr)', borderRadius: 6,
                    padding: '4px 10px', textDecoration: 'none',
                    background: 'var(--grn-lt)',
                  }}
                >
                  ⬇ Sample .xlsx
                </a>
                <a
                  href={`${('' || '').replace(/\/$/, '')}/farmers_import_template.csv`}
                  download="farmers_import_template.csv"
                  style={{ fontSize: 11, color: 'var(--blu)', alignSelf: 'center' }}
                >
                  .csv
                </a>
              </>
            )}
            {config.bulkImport && config.importTemplatePrefix && (
              <>
                {/* Overlay file input — programmatic .click() on display:none inputs fails in Safari / some browsers */}
                <div style={{ position: 'relative', display: 'inline-flex', alignItems: 'center' }}>
                  <Btn
                    variant="outline"
                    size="sm"
                    type="button"
                    disabled={!isOnline || bulkImportMutation.isPending}
                    style={
                      isOnline && !bulkImportMutation.isPending
                        ? { pointerEvents: 'none' }
                        : undefined
                    }
                  >
                    {bulkImportMutation.isPending ? 'Importing…' : '📤 Import Excel / CSV'}
                  </Btn>
                  {isOnline && !bulkImportMutation.isPending && (
                    <input
                      ref={importFileRef}
                      type="file"
                      accept=".xlsx,.xls,.csv,.ods,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel,text/csv"
                      aria-label={`Import ${config.label} from Excel or CSV`}
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) bulkImportMutation.mutate(f);
                      }}
                      style={{
                        position: 'absolute',
                        left: 0,
                        top: 0,
                        width: '100%',
                        height: '100%',
                        opacity: 0,
                        cursor: 'pointer',
                        fontSize: 0,
                        zIndex: 1,
                      }}
                    />
                  )}
                </div>
                <a
                  href={`${('' || '').replace(/\/$/, '')}/${config.importTemplatePrefix}.xlsx`}
                  download={`${config.importTemplatePrefix}.xlsx`}
                  style={{ fontSize: 11, color: 'var(--blu)', alignSelf: 'center' }}
                >
                  Sample .xlsx
                </a>
                <a
                  href={`${('' || '').replace(/\/$/, '')}/${config.importTemplatePrefix}.csv`}
                  download={`${config.importTemplatePrefix}.csv`}
                  style={{ fontSize: 11, color: 'var(--blu)', alignSelf: 'center' }}
                >
                  Sample .csv
                </a>
              </>
            )}
            {isPlaces && (
              <Btn
                variant="outline"
                size="sm"
                disabled={!isOnline || fixInstTypesMutation.isPending}
                onClick={() => fixInstTypesMutation.mutate()}
              >
                {fixInstTypesMutation.isPending ? 'Fixing…' : '🔗 Fix Institution Types'}
              </Btn>
            )}
            {config.deleteAll && selectedIds.size > 0 && (
              <Btn
                variant="danger"
                size="sm"
                disabled={!isOnline || deleteAllMutation.isPending}
                onClick={() => {
                  if (window.confirm(`Delete ${selectedIds.size} selected record(s)? This cannot be undone.`)) {
                    deleteAllMutation.mutate([...selectedIds]);
                  }
                }}
              >
                {deleteAllMutation.isPending ? 'Deleting…' : `🗑 Delete Selected (${selectedIds.size})`}
              </Btn>
            )}
            {config.deleteAll && selectedIds.size === 0 && (
              <Btn
                variant="danger"
                size="sm"
                disabled={!isOnline || deleteAllMutation.isPending}
                onClick={() => {
                  if (window.confirm(`Delete ALL ${config.label} records? This cannot be undone.`)) {
                    deleteAllMutation.mutate([]);
                  }
                }}
              >
                {deleteAllMutation.isPending ? 'Deleting…' : '🗑 Delete All'}
              </Btn>
            )}
            {(config.fields || []).length > 0 && (
              <Btn variant="primary" size="sm" onClick={openAdd}>+ Add {config.label}</Btn>
            )}
          </>
        }
      />

      {config.key === 'fodder-items' && (
        <div
          style={{
            fontSize: 12,
            color: 'var(--txt2)',
            marginBottom: 12,
            padding: '10px 14px',
            background: 'var(--blu-lt)',
            border: '1px solid var(--blu-bdr)',
            borderRadius: 10,
            lineHeight: 1.45,
          }}
        >
          Rows that show <strong>—</strong> under seed type, unit, or prices only have a display name saved (often from an older form).
          Open <strong>Edit</strong>, choose <strong>Type of seed</strong> and <strong>Unit size</strong>, enter the three amounts, and save.
          Ensure the API server is restarted after updating so saves include these fields.
        </div>
      )}

      <div style={{ display: 'flex', gap: 10, marginBottom: 14, alignItems: 'center' }}>
        <div style={{ position: 'relative', flex: 1, maxWidth: 300 }}>
          <span style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--txt4)', fontSize: 13 }}>🔍</span>
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder={`Search ${config.label.toLowerCase()}…`}
            style={{ ...inputStyle(), paddingLeft: 32 }} />
        </div>
        <span style={{ fontSize: 11, color: 'var(--txt3)', alignSelf: 'center' }}>
          {isPaginated ? `${totalCount} records` : `${records.length} records`}
        </span>
        {config.deleteAll && records.length > 0 && (
          <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--txt2)', cursor: 'pointer', userSelect: 'none' }}>
            <input
              type="checkbox"
              checked={records.length > 0 && records.every(r => selectedIds.has(r.id))}
              onChange={(e) => setSelectedIds(e.target.checked ? new Set(records.map(r => r.id)) : new Set())}
            />
            Select All
          </label>
        )}
      </div>

      <Card>
        {!isOnline
          ? <EmptyState icon="📡" title="Offline" message="Go online to manage settings data." />
          : (
            <DataTable
              loading={isLoading}
              data={records}
              emptyMsg={`No ${config.label.toLowerCase()} found`}
              columns={[
                ...(config.deleteAll ? [{
                  header: '',
                  key: '_chk',
                  render: (_, row) => (
                    <input
                      type="checkbox"
                      checked={selectedIds.has(row.id)}
                      onChange={(e) => {
                        setSelectedIds((prev) => {
                          const next = new Set(prev);
                          if (e.target.checked) { next.add(row.id); } else { next.delete(row.id); }
                          return next;
                        });
                      }}
                    />
                  ),
                }] : []),
                ...(!config.hideSerialColumn ? [{
                  header: 'S.No',
                  key: '_sno',
                  render: (_, __, i) => (
                    <span style={{ color: 'var(--txt4)', fontSize: 11 }}>
                      {(isPaginated ? (page - 1) * pageSize + (i ?? 0) : (i ?? 0)) + 1}
                    </span>
                  ),
                }] : []),
                ...dataCols.map(col => ({
                  header: (config.tableColumnLabels && config.tableColumnLabels[col])
                    || (config.key === 'farmers' && {
                      name: 'Name', phone: 'Phone', aadhar: 'Aadhar', district: 'District',
                    }[col])
                    || (config.key === 'fodder-items' && FODDER_ITEMS_TABLE_HEADERS[col])
                    || col.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
                  key: col,
                  render: (v, row) => {
                    if (config.key === 'farmers') {
                      if (col === 'aadhar') {
                        const a = row?.aadhar ?? row?.aadhar_no;
                        return <span style={{ fontSize: 12 }}>{a != null && String(a).trim() !== '' ? String(a) : '—'}</span>;
                      }
                      if (col === 'district') {
                        const d = row?.district ?? row?.district_name;
                        return <span style={{ fontSize: 12 }}>{d != null && String(d).trim() !== '' ? String(d) : '—'}</span>;
                      }
                    }
                    if (config.key === 'fodder-items' && col === 'name') {
                      const explicit = row?.name != null && String(row.name).trim() !== '' ? String(row.name).trim() : '';
                      const fromMaster = [row?.seed_type_name, row?.unit_size_name].filter(Boolean).join(' — ');
                      const label = explicit || fromMaster;
                      return (
                        <span style={{ fontSize: 12, color: explicit ? 'var(--txt)' : 'var(--txt3)' }}>
                          {label || '—'}
                        </span>
                      );
                    }
                    if (config.key === 'fodder-items' && ['seed_type_name', 'unit_size_name'].includes(col)) {
                      const x = row?.[col];
                      return (
                        <span style={{ fontSize: 12 }}>
                          {x != null && String(x).trim() !== '' ? String(x).trim() : '—'}
                        </span>
                      );
                    }
                    if (config.key === 'fodder-items' && ['unit_price', 'beneficiary_contribution_per_unit', 'subsidy_per_unit'].includes(col)) {
                      const x = row?.[col];
                      if (x == null || x === '') return <span style={{ fontSize: 12 }}>—</span>;
                      const n = Number(x);
                      return (
                        <span style={{ fontSize: 12, fontFamily: 'var(--fm)' }}>
                          {Number.isFinite(n) ? n : '—'}
                        </span>
                      );
                    }
                    if (col === 'is_active' || col === 'Status')
                      return <Badge color={v !== false && v !== 'Inactive' ? 'green' : 'red'}>{v !== false ? 'Active' : 'Inactive'}</Badge>;
                    if (col === 'is_current') return <Badge color={v ? 'blue' : 'dim'}>{v ? 'Current' : '—'}</Badge>;
                    if (col === 'quarter_no') {
                      const roman = QUARTER_ROMAN[Number(v) - 1];
                      return <span style={{ fontSize: 12 }}>{roman ?? String(v ?? '—')}</span>;
                    }
                    if (col === 'start_date' || col === 'end_date') {
                      const s = v != null && typeof v === 'string' ? (v.includes('T') ? v.slice(0, 10) : v.slice(0, 10)) : v;
                      return <span style={{ fontSize: 12 }}>{s != null && s !== '' ? String(s) : '—'}</span>;
                    }
                    if (
                      (config.key === 'mandals' && (col === 'code' || col === 'district_code')) ||
                      (config.key === 'towns' && ['code', 'district_code', 'mandal_code'].includes(col))
                    ) {
                      return (
                        <span style={{ fontSize: 12 }}>
                          {v != null && String(v).trim() !== '' ? String(v) : '—'}
                        </span>
                      );
                    }
                    if (config.key === 'places-of-working') {
                      if (['district_code', 'mandal_code', 'town_code'].includes(col)) {
                        return (
                          <span style={{ fontSize: 12 }}>
                            {v != null && String(v).trim() !== '' ? String(v) : '—'}
                          </span>
                        );
                      }
                      if (col === 'latitude' || col === 'longitude') {
                        if (v == null || v === '') {
                          return <span style={{ fontSize: 12 }}>—</span>;
                        }
                        const n = Number(v);
                        return (
                          <span style={{ fontSize: 12, fontFamily: 'var(--fm)' }}>
                            {Number.isFinite(n) ? String(n) : '—'}
                          </span>
                        );
                      }
                      if (col === 'institution_type_name' || col === 'mandal_name' || col === 'town_name') {
                        return (
                          <span style={{ fontSize: 12 }}>
                            {v != null && String(v).trim() !== '' ? String(v) : '—'}
                          </span>
                        );
                      }
                    }
                    return <span style={{ fontSize: 12 }}>{String(v ?? '—')}</span>;
                  },
                })),
                ...(config.permissionMatrix ? [{
                  header: 'Access',
                  key: '_access',
                  render: (_, row) => {
                    const p = row.permissions;
                    if (!p || typeof p !== 'object') {
                      return <span style={{ fontSize: 11, color: 'var(--txt4)' }}>—</span>;
                    }
                    const n = Object.keys(p).filter((k) => {
                      const o = p[k];
                      return o && typeof o === 'object' && Object.values(o).some(Boolean);
                    }).length;
                    return n
                      ? <Badge color="blue">{n} modules</Badge>
                      : <span style={{ fontSize: 11, color: 'var(--txt4)' }}>—</span>;
                  },
                }] : []),
                ...(showActionsColumn ? [{
                  header: 'Actions', key: 'id',
                  render: (_id, row) => (
                    <div style={{ display: 'flex', gap: 5 }}>
                      {showEdit && (
                      <Btn variant="outline" size="xs" onClick={() => openEdit(row)}>✎ Edit</Btn>
                      )}
                      {showActions && (
                      <button onClick={() => {
                        const rid = row?.id != null ? String(row.id).trim() : '';
                        if (!rid || rid === 'undefined') { toast.error('Missing record id'); return; }
                        if (window.confirm('Delete this record?')) deleteMutation.mutate(rid);
                      }}
                        style={{ padding: '3px 8px', fontSize: 10, background: 'var(--red-lt)', color: 'var(--red)', border: '1px solid var(--red-bdr)', borderRadius: 4, cursor: 'pointer', fontFamily: 'var(--fb)' }}>
                        ✕
                      </button>
                      )}
                    </div>
                  ),
                }] : []),
              ]}
            />
          )}
        {isPaginated && isOnline && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 10,
            padding: '10px 14px',
            borderTop: '1px solid var(--bdr)',
            background: 'var(--bg1)',
            fontSize: 11,
            color: 'var(--txt3)',
          }}>
            <span>
              {totalCount === 0
                ? 'No rows'
                : `Showing ${(page - 1) * pageSize + 1}–${Math.min(page * pageSize, totalCount)} of ${totalCount}`}
            </span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span>Page {page} of {totalPages}</span>
              <Btn
                variant="outline"
                size="xs"
                disabled={page <= 1}
                onClick={() => setPage(p => Math.max(1, p - 1))}
              >
                Previous
              </Btn>
              <Btn
                variant="outline"
                size="xs"
                disabled={page >= totalPages}
                onClick={() => setPage(p => p + 1)}
              >
                Next
              </Btn>
            </div>
          </div>
        )}
      </Card>

      {showForm && (config.fields || []).length > 0 && (
        <Modal
          title={`${editRow ? 'Edit' : 'Add'} ${config.label}`}
          sub={config.permissionMatrix ? 'Set module access: View, Add, Edit, Delete, and Import (for masters that support bulk upload).' : undefined}
          onClose={() => { setShowForm(false); setEditRow(null); }}
          size={config.permissionMatrix ? 'xxl' : (config.modalSize || 'sm')}
          footer={
            <>
              <Btn variant="ghost" onClick={() => { setShowForm(false); setEditRow(null); }}>Cancel</Btn>
              <Btn
                variant="primary"
                onClick={handleSubmit((d) => {
                  const fd = { ...d };
                  if (config.permissionMatrix) fd.permissions = permMatrix;
                  saveMutation.mutate(fd);
                })}
                disabled={saveMutation.isPending}
              >
                {saveMutation.isPending ? 'Saving…' : '✓ Save'}
              </Btn>
            </>
          }
        >
          {(config.fields || []).map((f, i) => {
            let opts = f.optionsFrom ? (optionsByKey[f.optionsFrom] || []) : [];
            if (f.filterByDistrict && config.key === 'towns') {
              const did = watchDistrictId != null ? String(watchDistrictId) : '';
              opts = opts.filter((row) => String(row.district_id || '') === did);
            }
            if (f.type === 'checkbox') {
              return (
                <div key={i} style={{ marginBottom: 12 }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13 }}>
                    <input type="checkbox" {...register(f.name)} />
                    <span style={{ fontWeight: 500 }}>{f.label}</span>
                  </label>
                </div>
              );
            }
            return (
            <div key={i} style={{ marginBottom: 12 }}>
              <Field label={f.label} required={f.required} error={errors[f.name]?.message}>
                  {f.type === 'textarea' ? (
                    <textarea
                      rows={4}
                      placeholder={f.placeholder}
                      {...register(f.name, f.required ? { required: 'Required' } : {})}
                      style={{ ...inputStyle(errors[f.name]), minHeight: 80 }}
                    />
                  ) : f.type === 'select' && f.options ? (
                  <select {...register(f.name, f.required ? { required: 'Required' } : {})} style={inputStyle(errors[f.name])}>
                    <option value="">{f.placeholderSelect || 'Select…'}</option>
                      {f.options.map((o) => {
                        const val = typeof o === 'object' && o != null && 'value' in o ? o.value : o;
                        const lab = typeof o === 'object' && o != null && 'label' in o ? o.label : o;
                        return <option key={String(val)} value={String(val)}>{lab}</option>;
                      })}
                    </select>
                  ) : f.type === 'select' && f.optionsFrom ? (
                    <select
                      {...register(f.name, f.required ? { required: 'Required' } : {})}
                      disabled={f.filterByDistrict && config.key === 'towns' && !watchDistrictId}
                      style={inputStyle(errors[f.name])}
                    >
                      <option value="">
                        {f.filterByDistrict && config.key === 'towns' && !watchDistrictId
                          ? 'Select district first…'
                          : (f.placeholderSelect || (f.required ? 'Select…' : '(optional)'))}
                      </option>
                      {opts.map(row => {
                        const label = f.optionSub
                          ? `${row[f.optionLabel || 'name']}${row[f.optionSub] ? ` (${row[f.optionSub]})` : ''}`
                          : (f.optionLabel === 'quarter_no'
                            ? `Q${row.quarter_no}${row.fy_label ? ` · ${row.fy_label}` : ''}`
                            : String(row[f.optionLabel || 'name']));
                        return (
                          <option key={row.id} value={row.id}>{label}</option>
                        );
                      })}
                  </select>
                ) : (
                  <input
                      type={f.type === 'number' ? 'number' : f.type === 'date' ? 'date' : 'text'}
                      step={f.type === 'number' ? 'any' : undefined}
                    placeholder={f.placeholder}
                    {...register(f.name, f.required ? { required: 'Required' } : {})}
                    style={inputStyle(errors[f.name])}
                  />
                )}
              </Field>
            </div>
            );
          })}
          {config.permissionMatrix && (
            <DesignationPermissionMatrix value={permMatrix} onChange={setPermMatrix} />
          )}
        </Modal>
      )}
    </PageWrap>
  );
}

/** First path segment after /settings/ — drives deep links + refresh. */
function settingKeyFromPathname(pathname) {
  const path = (pathname || '').replace(/\/+$/, '') || '/';
  if (path === '/settings') return null;
  const prefix = '/settings/';
  if (!path.startsWith(prefix)) return null;
  const first = path.slice(prefix.length).split('/').filter(Boolean)[0];
  return first ? decodeURIComponent(first) : null;
}

// ── Main Settings grid ─────────────────────────────────────────
export default function SettingsPage() {
  const navigate = useNavigate();
  const location = useLocation();

  const urlKey = useMemo(() => settingKeyFromPathname(location.pathname), [location.pathname]);

  const activeConfig = urlKey && SETTINGS_CONFIG.some((c) => c.key === urlKey)
    ? SETTINGS_CONFIG.find((c) => c.key === urlKey)
    : null;
useEffect(() => {
    if (urlKey && !SETTINGS_CONFIG.some((c) => c.key === urlKey)) {
      navigate('/settings', { replace: true });
    }
  }, [urlKey, navigate]);

  if (activeConfig?.customPage && activeConfig.key === 'policies') {
    return <PoliciesSettingsPage config={activeConfig} onBack={() => navigate('/settings')} />;
  }

  if (activeConfig?.customPage && activeConfig.key === 'calendar-holidays') {
    return <CalendarHolidaysPage config={activeConfig} onBack={() => navigate('/settings')} />;
  }

  if (activeConfig?.customPage && activeConfig.key === 'budget-allocations') {
    return <BudgetAllocationsPage config={activeConfig} onBack={() => navigate('/settings')} />;
  }

  if (activeConfig?.customPage && activeConfig.key === 'institution-mapping') {
    return <InstitutionSettingsPage onBack={() => navigate('/settings')} />;
  }

  if (activeConfig) {
    return <SettingSubPage config={activeConfig} onBack={() => navigate('/settings')} />;
  }

  return (
    <PageWrap>
      <PageHead
        title="Settings"
        subtitle="Master data — geography, clinical, HR, finance, pharmacy, and fodder"
        crumbs={['Home', 'Settings']}
      />

      {grouped.map(({ section, items }) => (
        <div key={section} style={{ marginBottom: 28 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--blu)', marginBottom: 14, fontFamily: 'var(--fd)', display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ width: 3, height: 16, background: 'var(--blu)', borderRadius: 2, display: 'inline-block' }} />
            {section}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(150px,1fr))', gap: 12 }}>
            {items.map(item => (
              <div
                key={item.key}
                onClick={() => navigate(`/settings/${encodeURIComponent(item.key)}`)}
                style={{
                  background: 'var(--bg)', border: '1px solid var(--bdr)',
                  borderRadius: 10, padding: '20px 12px 16px',
                  display: 'flex', flexDirection: 'column', alignItems: 'center',
                  gap: 12, cursor: 'pointer',
                  boxShadow: 'var(--sh1)',
                  transition: 'transform .12s, box-shadow .12s, border-color .12s',
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.boxShadow = '0 4px 16px rgba(26,86,219,.13)';
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.borderColor = 'var(--blu-bdr)';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.boxShadow = 'var(--sh1)';
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.borderColor = 'var(--bdr)';
                }}
              >
                <div style={{
                  width: 54, height: 54, borderRadius: '50%',
                  background: 'linear-gradient(135deg,#e8f0fe,#c7d7fc)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 24, flexShrink: 0,
                }}>
                  {item.icon}
                </div>
                <span style={{ fontSize: 11.5, fontWeight: 500, color: 'var(--txt2)', textAlign: 'center', lineHeight: 1.35 }}>
                  {item.label}
                </span>
              </div>
            ))}
          </div>
        </div>
      ))}
    </PageWrap>
  );
}
