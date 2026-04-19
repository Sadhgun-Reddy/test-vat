// src/pages/hrms/EmployeesPage.jsx
import React, { useState, useEffect, useRef } from 'react';
import { useForm, useFieldArray, useWatch } from 'react-hook-form';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { syncManager } from '../../sync/syncManager';
import { useSync } from '../../store/SyncContext';
import { PageWrap, PageHead, KPIGrid, KPICard, Card, DataTable, Badge, Modal, Btn, Field, inputStyle } from '../../components/ui';
import toast from 'react-hot-toast';

const fmtDate = d => d ? new Date(d).toLocaleDateString('en-IN', { day:'2-digit', month:'short', year:'numeric' }) : '—';

const DEFAULT_PE = {
  caste: '', sub_caste: '', blood_group: '', father_name: '', mother_name: '', marital_status: '',
  permanent_address: '', temporary_address: '', native_district: '',
  date_last_promotion: '', previous_designation: '', previous_promotion_date: '',
  total_years_service: '', service_in_present_post: '',
  vigilance_status: 'none', vigilance_case_ref: '', vigilance_date: '',
  notable_awards: '', special_rewards: '', commendations_note: '',
};

const BLOOD = ['', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
const MARITAL = [
  { v: '', l: 'Select…' },
  { v: 'single', l: 'Single' },
  { v: 'married', l: 'Married' },
  { v: 'divorced', l: 'Divorced' },
  { v: 'widowed', l: 'Widowed' },
];
const CASTE = ['', 'General', 'OBC', 'SC', 'ST', 'Other'];
const VIGILANCE = [
  { v: 'none', l: 'None' },
  { v: 'active', l: 'Active' },
  { v: 'closed', l: 'Closed' },
];

const FORM_FIELD_LS = 'vahd_employee_form_fields_v3';

/** Every form field — `required` fields cannot be hidden. */
const FORM_FIELDS = [
  { id: 'first_name', label: 'First name', group: 'Personal', required: true },
  { id: 'middle_name', label: 'Middle name', group: 'Personal' },
  { id: 'last_name', label: 'Last name', group: 'Personal', required: true },
  { id: 'gender', label: 'Gender', group: 'Personal' },
  { id: 'phone', label: 'Mobile', group: 'Personal', required: true },
  { id: 'email', label: 'Email', group: 'Personal' },
  { id: 'date_of_birth', label: 'Date of birth', group: 'Personal' },
  { id: 'blood_group', label: 'Blood group', group: 'Personal' },
  { id: 'marital_status', label: 'Marital status', group: 'Personal' },
  { id: 'caste', label: 'Caste', group: 'Personal' },
  { id: 'sub_caste', label: 'Sub caste', group: 'Personal' },
  { id: 'father_name', label: "Father's name", group: 'Personal' },
  { id: 'mother_name', label: "Mother's name", group: 'Personal' },
  { id: 'postings_block', label: 'Posting & location (multi)', group: 'Posting & location' },
  { id: 'permanent_address', label: 'Permanent address', group: 'Address' },
  { id: 'temporary_address', label: 'Temporary address', group: 'Address' },
  { id: 'native_district', label: 'Native district', group: 'Address' },
  { id: 'employee_no', label: 'Employee no.', group: 'Service', required: true },
  { id: 'designation_id', label: 'Designation', group: 'Service' },
  { id: 'employment_type_id', label: 'Employment type', group: 'Service' },
  { id: 'qualification_id', label: 'Qualification', group: 'Service' },
  { id: 'specialization_id', label: 'Specialization', group: 'Service' },
  { id: 'date_of_joining', label: 'Date of joining', group: 'Service', required: true },
  { id: 'date_of_retirement', label: 'Date of retirement', group: 'Service' },
  { id: 'aadhar_no', label: 'Aadhar no.', group: 'Service' },
  { id: 'pan_no', label: 'PAN', group: 'Service' },
  { id: 'previous_designation', label: 'Previous designation (text)', group: 'Promotion history' },
  { id: 'date_last_promotion', label: 'Date of last promotion', group: 'Promotion history' },
  { id: 'previous_promotion_date', label: 'Previous promotion date', group: 'Promotion history' },
  { id: 'total_years_service', label: 'Total years of service', group: 'Service record' },
  { id: 'service_in_present_post', label: 'Service in present post', group: 'Service record' },
  { id: 'vigilance_status', label: 'Vigilance status', group: 'Vigilance' },
  { id: 'vigilance_case_ref', label: 'Vigilance case reference', group: 'Vigilance' },
  { id: 'vigilance_date', label: 'Vigilance incident date', group: 'Vigilance' },
  { id: 'notable_awards', label: 'Notable awards', group: 'Awards & recognition' },
  { id: 'special_rewards', label: 'Special rewards', group: 'Awards & recognition' },
  { id: 'commendations_note', label: 'Commendations / notes', group: 'Awards & recognition' },
];

function defaultFieldVis() {
  return FORM_FIELDS.reduce((acc, f) => {
    if (!f.required) acc[f.id] = true;
    return acc;
  }, {});
}

function loadFieldVisibility() {
  const base = defaultFieldVis();
  try {
    const raw = localStorage.getItem(FORM_FIELD_LS);
    if (!raw) return base;
    return { ...base, ...JSON.parse(raw) };
  } catch {
    return base;
  }
}

function saveFieldVisibility(vis) {
  try {
    localStorage.setItem(FORM_FIELD_LS, JSON.stringify(vis));
  } catch { /* ignore */ }
}

const GROUP_ORDER = ['Personal', 'Posting & location', 'Address', 'Service', 'Promotion history', 'Service record', 'Vigilance', 'Awards & recognition'];

function defaultPostingRow() {
  return { district_id: '', place_of_working_id: '', location_role: 'primary' };
}

function defaultPosting() {
  return { posting_type_id: '', locations: [defaultPostingRow()] };
}

/** Build postings[] from legacy single-row employee or saved profile_extra.postings */
function normalizePostingsFromEmployee(emp, pe) {
  if (pe.postings && Array.isArray(pe.postings) && pe.postings.length > 0) {
    return pe.postings.map(p => ({
      posting_type_id: p.posting_type_id || '',
      locations: (p.locations && p.locations.length ? p.locations : [defaultPostingRow()]).map(l => ({
        district_id: l.district_id || '',
        place_of_working_id: l.place_of_working_id || '',
        location_role: l.location_role === 'sub_center' ? 'sub_center' : 'primary',
      })),
    }));
  }
  return [{
    posting_type_id: emp.posting_type_id || '',
    locations: [{
      district_id: emp.district_id || '',
      place_of_working_id: emp.place_of_working_id || '',
      location_role: 'primary',
    }],
  }];
}

function mergePostingRoots(data) {
  let postings = data.profile_extra?.postings;
  if (!postings || !Array.isArray(postings) || postings.length === 0) {
    postings = [defaultPosting()];
  }
  const first = postings[0];
  const loc0 = first?.locations?.[0];
  return {
    ...data,
    posting_type_id: first?.posting_type_id || null,
    district_id: loc0?.district_id || null,
    place_of_working_id: loc0?.place_of_working_id || null,
    profile_extra: {
      ...data.profile_extra,
      postings,
    },
  };
}

function LocationRow({
  postingIndex, locIndex, control, register, setValue, districts, isOnline, onRemove, showRemove, inputStyle: inp,
}) {
  const base = `profile_extra.postings.${postingIndex}.locations.${locIndex}`;
  const districtId = useWatch({ control, name: `${base}.district_id` });
  const placeId = useWatch({ control, name: `${base}.place_of_working_id` });
  const role = useWatch({ control, name: `${base}.location_role` }) || 'primary';
  const prevDist = useRef();

  useEffect(() => {
    if (prevDist.current !== undefined && prevDist.current !== districtId) {
      setValue(`${base}.place_of_working_id`, '');
    }
    prevDist.current = districtId;
  }, [districtId, setValue, base]);

  const { data: places } = useQuery({
    queryKey: ['places-of-working', districtId, postingIndex, locIndex],
    queryFn: async () => {
      const { data } = await syncManager.api.get(`/places-of-working?district_id=${districtId}`);
      return data;
    },
    enabled: isOnline && !!districtId,
    staleTime: 60_000,
  });

  const place = (places || []).find(p => p.id === placeId);

  return (
    <div style={{
      border: '1px solid var(--bdr2)', borderRadius: 8, padding: 10, marginBottom: 8,
      background: 'var(--bg1)', position: 'relative',
    }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'flex-start', paddingRight: showRemove ? 72 : 0 }}>
        <div style={{ flex: '1 1 200px', minWidth: 160 }}>
          <Field label="District">
            <select {...register(`${base}.district_id`)} style={inp()}>
              <option value="">Select district…</option>
              {(districts || []).map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
          </Field>
        </div>
        <div style={{ flex: '1 1 200px', minWidth: 160 }}>
          <Field label={role === 'sub_center' ? 'Sub center' : 'Place of working'}>
            <select {...register(`${base}.place_of_working_id`)} style={inp()} disabled={!districtId}>
              <option value="">{districtId ? 'Select place…' : 'Select district first'}</option>
              {(places || []).map(p => (
                <option key={p.id} value={p.id}>
                  {p.name}{p.institution_type_name ? ` — ${p.institution_type_name}` : ''}
                </option>
              ))}
            </select>
          </Field>
        </div>
        <div style={{ flex: '1 1 160px', minWidth: 120 }}>
          <Field label="Mandal">
            <input readOnly value={place?.mandal_name || '—'} style={inp()} title="Auto-filled from workplace" />
          </Field>
        </div>
        <div style={{ flex: '1 1 180px', minWidth: 120 }}>
          <Field label="Village / town">
            <input readOnly value={place?.name || '—'} style={inp()} title="Workplace name / location" />
          </Field>
        </div>
        <div style={{ flex: '1 1 200px', minWidth: 160 }}>
          <Field label="Row type">
            <select {...register(`${base}.location_role`)} style={inp()}>
              <option value="primary">Primary workplace</option>
              <option value="sub_center">Sub center</option>
            </select>
          </Field>
        </div>
      </div>
      {showRemove && (
        <button
          type="button"
          onClick={onRemove}
          style={{
            position: 'absolute', top: 8, right: 8, border: 'none', background: 'transparent',
            color: 'var(--red)', cursor: 'pointer', fontSize: 11, fontWeight: 600,
          }}
        >
          ✕ Remove
        </button>
      )}
    </div>
  );
}

function PostingCard({
  postingIndex, removePosting, canRemovePost, postingTypes, districts, control, register, setValue, isOnline, inputStyle: inp,
}) {
  const { fields, append, remove } = useFieldArray({
    control,
    name: `profile_extra.postings.${postingIndex}.locations`,
  });

  return (
    <div style={{
      border: '1px solid var(--bdr)', borderRadius: 10, padding: 12, marginBottom: 12,
      background: 'var(--bg)', boxShadow: 'var(--sh1)',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10, marginBottom: 10, flexWrap: 'wrap' }}>
        <div style={{ flex: '1 1 280px', minWidth: 200 }}>
          <Field label="Type of Posting">
            <select {...register(`profile_extra.postings.${postingIndex}.posting_type_id`)} style={inp()}>
              <option value="">Select posting type</option>
              {(postingTypes || []).map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </Field>
        </div>
        {canRemovePost && (
          <button
            type="button"
            onClick={removePosting}
            style={{
              border: '1px solid var(--red-bdr)', background: 'var(--red-lt)', color: 'var(--red)',
              borderRadius: 6, padding: '6px 10px', fontSize: 11, cursor: 'pointer', fontWeight: 600,
            }}
          >
            ✕ Remove posting
          </button>
        )}
      </div>
      {fields.map((field, locIndex) => (
        <LocationRow
          key={field.id}
          postingIndex={postingIndex}
          locIndex={locIndex}
          control={control}
          register={register}
          setValue={setValue}
          districts={districts}
          isOnline={isOnline}
          showRemove={fields.length > 1}
          onRemove={() => remove(locIndex)}
          inputStyle={inp}
        />
      ))}
      <button
        type="button"
        onClick={() => append(defaultPostingRow())}
        style={{
          marginTop: 4, padding: '8px 14px', borderRadius: 8, border: '1px solid var(--blu)',
          background: 'var(--blu-lt)', color: 'var(--blu)', cursor: 'pointer', fontSize: 11, fontWeight: 700,
        }}
      >
        + Add location
      </button>
    </div>
  );
}

export default function EmployeesPage() {
  const { isOnline } = useSync();
  const qc = useQueryClient();
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editData, setEditData] = useState(null);
  const [page, setPage] = useState(1);
  const [fieldVis, setFieldVis] = useState(loadFieldVisibility);
  const [showFieldPicker, setShowFieldPicker] = useState(false);
  const [showDeleteAll, setShowDeleteAll] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null); // { id, name }
  const fieldPickerRef = useRef(null);
  const importFileRef  = useRef(null);

  useEffect(() => {
    const t = setTimeout(() => setSearch(searchInput), 350);
    return () => clearTimeout(t);
  }, [searchInput]);

  useEffect(() => {
    if (!showFieldPicker) return;
    const close = (e) => {
      if (fieldPickerRef.current && !fieldPickerRef.current.contains(e.target)) setShowFieldPicker(false);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [showFieldPicker]);

  const showField = (id) => {
    const def = FORM_FIELDS.find(f => f.id === id);
    if (def?.required) return true;
    return fieldVis[id] !== false;
  };

  const setFieldVisOne = (id, on) => {
    const def = FORM_FIELDS.find(f => f.id === id);
    if (def?.required) return;
    setFieldVis(prev => {
      const next = { ...prev, [id]: on };
      saveFieldVisibility(next);
      return next;
    });
  };

  const showAllFields = () => {
    const next = defaultFieldVis();
    setFieldVis(next);
    saveFieldVisibility(next);
  };

  const hideAllOptionalFields = () => {
    const next = FORM_FIELDS.reduce((acc, f) => {
      if (!f.required) acc[f.id] = false;
      return acc;
    }, {});
    setFieldVis(next);
    saveFieldVisibility(next);
  };

  const flexField = { flex: '1 1 240px', minWidth: 0, maxWidth: '100%' };

  const pageSize = 25;
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['employees', search, page, pageSize],
    queryFn: async () => {
      const { data } = await syncManager.api.get(
        `/employees?search=${encodeURIComponent(search)}&page=${page}&limit=${pageSize}`
      );
      return data;
    },
    enabled: isOnline,
    staleTime: 30_000,
  });

  const { data: districts } = useQuery({
    queryKey: ['districts'],
    queryFn: async () => { const { data } = await syncManager.api.get('/districts'); return data; },
    enabled: isOnline, staleTime: Infinity,
  });

  const { data: designations } = useQuery({
    queryKey: ['designations'],
    queryFn: async () => { const { data } = await syncManager.api.get('/settings/designations'); return data; },
    enabled: isOnline, staleTime: Infinity,
  });
  const { data: employmentTypes } = useQuery({
    queryKey: ['employment-types'],
    queryFn: async () => { const { data } = await syncManager.api.get('/settings/employment-types'); return data; },
    enabled: isOnline, staleTime: Infinity,
  });
  const { data: postingTypes } = useQuery({
    queryKey: ['posting-types'],
    queryFn: async () => { const { data } = await syncManager.api.get('/settings/posting-types'); return data; },
    enabled: isOnline, staleTime: Infinity,
  });
  const { data: qualifications } = useQuery({
    queryKey: ['qualifications'],
    queryFn: async () => { const { data } = await syncManager.api.get('/settings/qualifications'); return data; },
    enabled: isOnline, staleTime: Infinity,
  });

  const { register, control, handleSubmit, reset, watch, setValue, formState: { errors } } = useForm({
    defaultValues: { profile_extra: { ...DEFAULT_PE, postings: [defaultPosting()] } },
  });
  const { fields: postingFields, append: appendPosting, remove: removePosting } = useFieldArray({
    control,
    name: 'profile_extra.postings',
  });

  const qualificationId = watch('qualification_id');
  const prevQual = useRef();

  useEffect(() => {
    if (prevQual.current !== undefined && prevQual.current !== qualificationId) {
      setValue('specialization_id', '');
    }
    prevQual.current = qualificationId;
  }, [qualificationId, setValue]);

  useEffect(() => {
    if (!showForm) {
      prevQual.current = undefined;
    }
  }, [showForm]);

  const { data: specializations } = useQuery({
    queryKey: ['specializations', qualificationId],
    queryFn: async () => {
      const { data } = await syncManager.api.get(`/settings/specializations?qualification_id=${qualificationId}`);
      return data;
    },
    enabled: isOnline && !!qualificationId,
    staleTime: 60_000,
  });

  const employees = data?.employees || [];
  const total = data?.total ?? 0;
  const stats = data?.stats || {
    total: total,
    active: employees.filter((e) => e.is_active).length,
    present_today: employees.filter((e) => e.today_attendance === 'present').length,
    districts_covered: [...new Set(employees.map((e) => e.district_name).filter(Boolean))].length,
  };

  const save = useMutation({
    mutationFn: async (payload) => {
      if (editData) { const { data } = await syncManager.api.put(`/employees/${editData.id}`, payload); return data; }
      const { data } = await syncManager.api.post('/employees', payload); return data;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey:['employees'] }); toast.success(editData?'Employee updated':'Employee registered'); setShowForm(false); setEditData(null); },
    onError: err => toast.error(err.response?.data?.error || err.response?.data?.errors?.[0]?.msg || 'Save failed'),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id) => { await syncManager.api.delete(`/employees/${id}`); },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['employees'] }); toast.success('Employee deleted'); setDeleteTarget(null); },
    onError: (err) => toast.error(err.response?.data?.error || err.message || 'Delete failed'),
  });

  const deleteAllMutation = useMutation({
    mutationFn: async () => { const { data } = await syncManager.api.delete('/employees'); return data; },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['employees'] });
      toast.success(`Deleted ${data.deleted} employee(s)`);
      setShowDeleteAll(false);
    },
    onError: (err) => toast.error(err.response?.data?.error || err.message || 'Delete failed'),
  });

  const importMutation = useMutation({
    mutationFn: async (file) => {
      const fd = new FormData();
      fd.append('file', file);
      const { data } = await syncManager.api.post('/employees/import', fd);
      return data;
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['employees'] });
      const msg = [`${data.inserted} inserted`, data.skipped ? `${data.skipped} skipped` : null].filter(Boolean).join(' · ');
      toast.success(msg || 'Import finished');
      if (data.errors?.length) {
        toast.error(data.errors.slice(0, 5).map((e) => `Row ${e.row}: ${e.message}`).join(' · '), { duration: 6000 });
      }
      if (importFileRef.current) importFileRef.current.value = '';
    },
    onError: (err) => toast.error(err.response?.data?.error || err.message || 'Import failed'),
  });

  const openAdd = () => {
    reset({
      date_of_joining: new Date().toISOString().slice(0, 10),
      gender: 'male',
      profile_extra: { ...DEFAULT_PE, postings: [defaultPosting()] },
    });
    setEditData(null);
    setShowForm(true);
  };

  const openEdit = (emp) => {
    const pe = emp.profile_extra && typeof emp.profile_extra === 'object' ? emp.profile_extra : {};
    const postings = normalizePostingsFromEmployee(emp, pe);
    reset({
      first_name: emp.first_name,
      middle_name: emp.middle_name || '',
      last_name: emp.last_name,
      gender: emp.gender,
      date_of_birth: emp.date_of_birth?.slice(0, 10) || '',
      phone: emp.phone,
      email: emp.email || '',
      employee_no: emp.employee_no,
      designation_id: emp.designation_id || '',
      employment_type_id: emp.employment_type_id || '',
      qualification_id: emp.qualification_id || '',
      specialization_id: emp.specialization_id || '',
      date_of_joining: emp.date_of_joining?.slice(0, 10) || '',
      date_of_retirement: emp.date_of_retirement?.slice(0, 10) || '',
      aadhar_no: emp.aadhar_no || '',
      pan_no: emp.pan_no || '',
      profile_extra: {
        ...DEFAULT_PE,
        ...pe,
        postings,
        vigilance_status: pe.vigilance_status || 'none',
      },
    });
    setEditData(emp);
    setShowForm(true);
  };

  const sectionTitle = s => (
    <div style={{ fontSize:10, fontWeight:700, color:'var(--blu)', textTransform:'uppercase', letterSpacing:'.06em', marginBottom:10, display:'flex', alignItems:'center', gap:6 }}>
      <span style={{ width:3, height:14, background:'var(--blu)', borderRadius:2, display:'inline-block' }}/>{s}
    </div>
  );

  const pe = (name) => register(`profile_extra.${name}`);

  const visGroup = (g) => FORM_FIELDS.some(f => f.group === g && showField(f.id));

  const Fw = ({ id, children }) => (showField(id) ? <div style={flexField}>{children}</div> : null);

  return (
    <PageWrap>
      <PageHead title="Employee Directory" subtitle={`${stats.total} registered VAHD field personnel`} crumbs={['Home','HRMS','Employees']}
        actions={<>
          <Btn variant="ghost" size="sm" onClick={()=>toast('Export Excel')}>📤 Export</Btn>
          <Btn variant="ghost" size="sm" style={{ color:'var(--red,#e53e3e)', borderColor:'var(--red,#e53e3e)' }} onClick={()=>setShowDeleteAll(true)}>🗑 Delete All</Btn>
          <div style={{ position:'relative', display:'inline-flex', alignItems:'center' }}>
            <Btn variant="outline" size="sm" type="button"
              disabled={!isOnline || importMutation.isPending}
              style={isOnline && !importMutation.isPending ? { pointerEvents:'none' } : undefined}
            >
              {importMutation.isPending ? 'Importing…' : '📥 Import Excel / CSV'}
            </Btn>
            {isOnline && !importMutation.isPending && (
              <input ref={importFileRef} type="file"
                accept=".xlsx,.xls,.csv,.ods,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel,text/csv"
                aria-label="Import employees from Excel or CSV"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) importMutation.mutate(f); }}
                style={{ position:'absolute', left:0, top:0, width:'100%', height:'100%', opacity:0, cursor:'pointer', fontSize:0, zIndex:1 }}
              />
            )}
          </div>
          <a href={`${(''||'').replace(/\/$/,'')}/employees_import_template.xlsx`} download="employees_import_template.xlsx" style={{ fontSize:11, color:'var(--blu)', alignSelf:'center' }}>Sample .xlsx</a>
          <a href={`${(''||'').replace(/\/$/,'')}/employees_import_template.csv`}  download="employees_import_template.csv"  style={{ fontSize:11, color:'var(--blu)', alignSelf:'center' }}>Sample .csv</a>
          <Btn variant="primary" size="sm" onClick={openAdd}>+ Register Staff</Btn>
        </>}/>

      <KPIGrid>
        <KPICard label="Total Staff"   value={stats.total} color="blue"/>
        <KPICard label="Active"        value={stats.active} color="green" sub={`of ${stats.total}`}/>
        <KPICard label="Present Today" value={stats.present_today} color="purple"/>
        <KPICard label="Districts"     value={stats.districts_covered} color="teal" sub="covered"/>
      </KPIGrid>

      {isError && (
        <div style={{ marginBottom: 12, padding: '10px 12px', borderRadius: 8, background: 'var(--red-lt)', color: 'var(--red)', fontSize: 12 }}>
          Could not load employees: {error?.response?.data?.error || error?.message || 'Request failed'}
        </div>
      )}

      <div style={{ marginBottom:14 }}>
        <div style={{ position:'relative', maxWidth:380 }}>
          <span style={{ position:'absolute', left:10, top:'50%', transform:'translateY(-50%)', fontSize:13, color:'var(--txt4)' }}>🔍</span>
          <input
            value={searchInput}
            onChange={(e) => { setSearchInput(e.target.value); setPage(1); }}
            placeholder="Search name, employee no, phone…"
            style={{ ...inputStyle(), paddingLeft: 32 }}
          />
        </div>
      </div>

      <Card>
        <DataTable loading={isLoading} data={employees} emptyMsg={!isOnline ? 'Go online to view employees' : (isError ? 'Failed to load' : 'No employees found')}
          columns={[
            { header:'Emp No.', key:'employee_no', render:v=><span style={{fontFamily:'var(--fm)',color:'var(--blu)',fontSize:11,fontWeight:700}}>{v}</span> },
            { header:'Name', key:'first_name', render:(v,r)=><div><strong style={{fontSize:12}}>{r.first_name} {r.middle_name} {r.last_name}</strong><div style={{fontSize:10,color:'var(--txt3)'}}>{r.phone}</div></div> },
            { header:'Designation', key:'designation_name', render:v=><span style={{fontSize:11,color:'var(--txt2)'}}>{v||'—'}</span> },
            { header:'District', key:'district_name' },
            { header:'Place of Work', key:'place_of_working_name', render:v=><span style={{fontSize:11,color:'var(--txt3)'}}>{v||'—'}</span> },
            { header:'Joined', key:'date_of_joining', render:v=><span style={{fontSize:11,color:'var(--txt3)'}}>{fmtDate(v)}</span> },
            { header:'Today', key:'today_attendance', render:v=><Badge color={v==='present'?'green':v==='leave'?'amber':v==='absent'?'red':'dim'}>{v||'not marked'}</Badge> },
            { header:'Status', key:'is_active', render:v=><Badge color={v?'green':'dim'}>{v?'Active':'Inactive'}</Badge> },
            { header:'Actions', key:'id', render:(_,r)=><div style={{display:'flex',gap:5}}>
                <Btn variant="ghost" size="xs" onClick={()=>openEdit(r)}>✎ Edit</Btn>
                <Btn variant="ghost" size="xs" style={{ color:'var(--red,#e53e3e)' }}
                  onClick={()=>setDeleteTarget({ id: r.id, name: `${r.first_name} ${r.last_name}` })}
                >🗑</Btn>
              </div> },
          ]}
        />
        <div style={{ padding:'8px 14px', borderTop:'1px solid var(--bdr)', display:'flex', alignItems:'center', justifyContent:'space-between', background:'var(--bg1)', fontSize:11, color:'var(--txt3)' }}>
          <span>Showing {employees.length} of {total}</span>
          <div style={{ display:'flex', gap:6 }}>
            <Btn variant="ghost" size="xs" disabled={page<=1} onClick={()=>setPage(p=>p-1)}>‹ Prev</Btn>
            <span style={{ padding:'3px 8px' }}>Page {page}</span>
            <Btn variant="ghost" size="xs" disabled={page * pageSize >= total} onClick={() => setPage((p) => p + 1)}>Next ›</Btn>
          </div>
        </div>
      </Card>

      {showForm && (
        <Modal title={editData?'Edit Employee':'Register Employee'} sub="Use Fields to show to pick each input. Required fields (name, mobile, employee no., joining date) always stay visible." size="xl"
          onClose={()=>{setShowForm(false);setEditData(null);setShowFieldPicker(false);}}
          footer={<><Btn variant="ghost" onClick={()=>{setShowForm(false);setEditData(null);setShowFieldPicker(false);}}>Cancel</Btn><Btn variant="primary" onClick={handleSubmit(d => save.mutate(mergePostingRoots(d)))} disabled={save.isPending}>{save.isPending?'Saving…':`💾 ${editData?'Update':'Register'}`}</Btn></>}
        >
          <div ref={fieldPickerRef} style={{ position:'relative', marginBottom: 14, display:'flex', justifyContent:'flex-end', flexWrap:'wrap', gap:8 }}>
            <Btn type="button" variant="ghost" size="sm" onClick={() => setShowFieldPicker(v => !v)}>
              ⚙ Fields to show
            </Btn>
            {showFieldPicker && (
              <div style={{
                position: 'absolute', top: '100%', right: 0, marginTop: 6, zIndex: 20,
                width: 'min(100%, 420px)', maxHeight: 'min(70vh, 520px)',
                background: 'var(--bg)', border: '1px solid var(--bdr)', borderRadius: 10,
                boxShadow: 'var(--sh3)', padding: 12, display: 'flex', flexDirection: 'column',
              }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--txt2)', marginBottom: 6 }}>Visible fields</div>
                <p style={{ fontSize: 10, color: 'var(--txt3)', marginBottom: 10, lineHeight: 1.45 }}>
                  Check each field you want on the form. Required fields are locked on.
                </p>
                <div style={{ display: 'flex', gap: 8, marginBottom: 10, flexShrink: 0 }}>
                  <button type="button" onClick={showAllFields} style={{ fontSize: 10, padding: '4px 8px', borderRadius: 6, border: '1px solid var(--bdr)', background: 'var(--bg2)', cursor: 'pointer' }}>Select all</button>
                  <button type="button" onClick={hideAllOptionalFields} style={{ fontSize: 10, padding: '4px 8px', borderRadius: 6, border: '1px solid var(--bdr)', background: 'var(--bg2)', cursor: 'pointer' }}>Clear optional</button>
                </div>
                <div style={{ overflowY: 'auto', flex: 1, paddingRight: 4 }}>
                  {GROUP_ORDER.map(g => {
                    const fields = FORM_FIELDS.filter(f => f.group === g);
                    if (!fields.length) return null;
                    return (
                      <div key={g} style={{ marginBottom: 12 }}>
                        <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--blu)', textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 6 }}>{g}</div>
                        {fields.map(f => (
                          <label key={f.id} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, fontSize: 11, cursor: f.required ? 'default' : 'pointer', color: 'var(--txt2)', marginBottom: 6, opacity: f.required ? 0.85 : 1 }}>
                            <input
                              type="checkbox"
                              checked={f.required || !!fieldVis[f.id]}
                              disabled={!!f.required}
                              onChange={e => setFieldVisOne(f.id, e.target.checked)}
                              style={{ marginTop: 2 }}
                            />
                            <span>{f.label}{f.required ? ' (required)' : ''}</span>
                          </label>
                        ))}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {visGroup('Personal') && (
          <div style={{ background:'var(--bg1)', border:'1px solid var(--bdr)', borderRadius:8, padding:14, marginBottom:12 }}>
            {sectionTitle('Personal information')}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
              <Fw id="first_name"><Field label="First Name" required error={errors.first_name?.message}><input {...register('first_name',{required:'Required'})} placeholder="First name" style={inputStyle(errors.first_name)}/></Field></Fw>
              <Fw id="middle_name"><Field label="Middle Name"><input {...register('middle_name')} placeholder="Middle name" style={inputStyle()}/></Field></Fw>
              <Fw id="last_name"><Field label="Last Name" required error={errors.last_name?.message}><input {...register('last_name',{required:'Required'})} placeholder="Last name" style={inputStyle(errors.last_name)}/></Field></Fw>
              <Fw id="gender"><Field label="Gender"><select {...register('gender')} style={inputStyle()}><option value="male">Male</option><option value="female">Female</option><option value="other">Other</option></select></Field></Fw>
              <Fw id="phone"><Field label="Mobile" required error={errors.phone?.message}><input {...register('phone',{required:'Required'})} placeholder="9XXXXXXXXX" style={inputStyle(errors.phone)}/></Field></Fw>
              <Fw id="email"><Field label="Email"><input {...register('email')} type="email" placeholder="emp@vahd.gov.in" style={inputStyle()}/></Field></Fw>
              <Fw id="date_of_birth"><Field label="Date of Birth"><input {...register('date_of_birth')} type="date" style={inputStyle()}/></Field></Fw>
              <Fw id="blood_group"><Field label="Blood Group"><select {...pe('blood_group')} style={inputStyle()}>{BLOOD.map(b => <option key={b || 'empty'} value={b}>{b || 'Select…'}</option>)}</select></Field></Fw>
              <Fw id="marital_status"><Field label="Marital Status"><select {...pe('marital_status')} style={inputStyle()}>{MARITAL.map(m => <option key={m.v || 'x'} value={m.v}>{m.l}</option>)}</select></Field></Fw>
              <Fw id="caste"><Field label="Caste"><select {...pe('caste')} style={inputStyle()}>{CASTE.map(c => <option key={c || 'c'} value={c}>{c || 'Select…'}</option>)}</select></Field></Fw>
              <Fw id="sub_caste"><Field label="Sub Caste"><input {...pe('sub_caste')} placeholder="Sub caste" style={inputStyle()}/></Field></Fw>
              <Fw id="father_name"><Field label="Father's Name"><input {...pe('father_name')} placeholder="Father's name" style={inputStyle()}/></Field></Fw>
              <Fw id="mother_name"><Field label="Mother's Name"><input {...pe('mother_name')} placeholder="Mother's name" style={inputStyle()}/></Field></Fw>
            </div>
          </div>
          )}

          {visGroup('Posting & location') && (
          <div style={{ background:'var(--bg1)', border:'1px solid var(--bdr)', borderRadius:8, padding:14, marginBottom:12 }}>
            {sectionTitle('Posting & location')}
            <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start', flexWrap: 'wrap' }}>
              <div style={{ flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
                <button
                  type="button"
                  onClick={() => appendPosting(defaultPosting())}
                  style={{
                    padding: '10px 14px', borderRadius: 8, border: 'none', cursor: 'pointer',
                    background: 'linear-gradient(180deg, #34d399, #059669)', color: '#fff',
                    fontSize: 11, fontWeight: 700, boxShadow: '0 2px 6px rgba(5,150,105,.35)',
                    whiteSpace: 'nowrap',
                  }}
                >
                  + Add posting type
                </button>
              </div>
              <div style={{ flex: 1, minWidth: 280 }}>
                {postingFields.map((pf, pi) => (
                  <PostingCard
                    key={pf.id}
                    postingIndex={pi}
                    removePosting={() => removePosting(pi)}
                    canRemovePost={postingFields.length > 1}
                    postingTypes={postingTypes}
                    districts={districts}
                    control={control}
                    register={register}
                    setValue={setValue}
                    isOnline={isOnline}
                    inputStyle={inputStyle}
                  />
                ))}
              </div>
            </div>
            <div style={{ fontSize: 10, color: 'var(--txt3)', marginTop: 10, lineHeight: 1.45 }}>
              Add multiple posting types, then add one or more locations per posting. Mandal and village/town fill automatically from the selected workplace.
              The first posting’s first location is saved as the employee’s primary district / workplace for listings.
            </div>
          </div>
          )}

          {visGroup('Address') && (
          <div style={{ background:'var(--bg1)', border:'1px solid var(--bdr)', borderRadius:8, padding:14, marginBottom:12 }}>
            {sectionTitle('Address')}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
              <Fw id="permanent_address"><Field label="Permanent Address"><textarea {...pe('permanent_address')} rows={3} placeholder="Full permanent address" style={{...inputStyle(), resize:'vertical', minWidth: 200 }}/></Field></Fw>
              <Fw id="temporary_address"><Field label="Temporary Address"><textarea {...pe('temporary_address')} rows={3} placeholder="Current / temporary address" style={{...inputStyle(), resize:'vertical', minWidth: 200 }}/></Field></Fw>
              <Fw id="native_district"><Field label="Native District"><input {...pe('native_district')} placeholder="Native district" style={inputStyle()}/></Field></Fw>
            </div>
          </div>
          )}

          {visGroup('Service') && (
          <div style={{ background:'var(--bg1)', border:'1px solid var(--bdr)', borderRadius:8, padding:14, marginBottom:12 }}>
            {sectionTitle('Service information')}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
              <Fw id="employee_no"><Field label="Employee No." required error={errors.employee_no?.message}><input {...register('employee_no',{required:!editData})} placeholder="EMP00XXX" style={inputStyle(errors.employee_no)} disabled={!!editData}/></Field></Fw>
              <Fw id="designation_id"><Field label="Designation"><select {...register('designation_id')} style={inputStyle()}><option value="">Select…</option>{(designations||[]).map(d => <option key={d.id} value={d.id}>{d.name}</option>)}</select></Field></Fw>
              <Fw id="employment_type_id"><Field label="Employment Type"><select {...register('employment_type_id')} style={inputStyle()}><option value="">Select…</option>{(employmentTypes||[]).map(d => <option key={d.id} value={d.id}>{d.name}</option>)}</select></Field></Fw>
              <Fw id="qualification_id"><Field label="Qualification"><select {...register('qualification_id')} style={inputStyle()}><option value="">Select…</option>{(qualifications||[]).map(d => <option key={d.id} value={d.id}>{d.name}</option>)}</select></Field></Fw>
              <Fw id="specialization_id"><Field label="Specialization"><select {...register('specialization_id')} style={inputStyle()} disabled={!qualificationId}><option value="">{qualificationId ? 'Select…' : 'Select qualification first'}</option>{(specializations||[]).map(d => <option key={d.id} value={d.id}>{d.name}</option>)}</select></Field></Fw>
              <Fw id="date_of_joining"><Field label="Date of Joining" required><input {...register('date_of_joining',{required:'Required'})} type="date" style={inputStyle()}/></Field></Fw>
              <Fw id="date_of_retirement"><Field label="Date of Retirement"><input {...register('date_of_retirement')} type="date" style={inputStyle()}/></Field></Fw>
              <Fw id="aadhar_no"><Field label="Aadhar No."><input {...register('aadhar_no')} placeholder="XXXX XXXX XXXX" maxLength={12} style={inputStyle()}/></Field></Fw>
              <Fw id="pan_no"><Field label="PAN"><input {...register('pan_no')} placeholder="ABCDE1234F" maxLength={10} style={inputStyle()}/></Field></Fw>
            </div>
          </div>
          )}

          {visGroup('Promotion history') && (
          <div style={{ background:'var(--bg1)', border:'1px solid var(--bdr)', borderRadius:8, padding:14, marginBottom:12 }}>
            {sectionTitle('Promotion history')}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
              <Fw id="previous_designation"><Field label="Previous Designation (text)"><input {...pe('previous_designation')} placeholder="If applicable" style={inputStyle()}/></Field></Fw>
              <Fw id="date_last_promotion"><Field label="Date of Last Promotion"><input {...pe('date_last_promotion')} type="date" style={inputStyle()}/></Field></Fw>
              <Fw id="previous_promotion_date"><Field label="Previous Promotion Date"><input {...pe('previous_promotion_date')} type="date" style={inputStyle()}/></Field></Fw>
            </div>
          </div>
          )}

          {visGroup('Service record') && (
          <div style={{ background:'var(--bg1)', border:'1px solid var(--bdr)', borderRadius:8, padding:14, marginBottom:12 }}>
            {sectionTitle('Service record')}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
              <Fw id="total_years_service"><Field label="Total Years of Service"><input {...pe('total_years_service')} placeholder="e.g. 12" style={inputStyle()}/></Field></Fw>
              <Fw id="service_in_present_post"><Field label="Service in Present Post"><input {...pe('service_in_present_post')} placeholder="e.g. 3 years" style={inputStyle()}/></Field></Fw>
            </div>
          </div>
          )}

          {visGroup('Vigilance') && (
          <div style={{ background:'var(--bg1)', border:'1px solid var(--bdr)', borderRadius:8, padding:14, marginBottom:12 }}>
            {sectionTitle('Vigilance')}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
              <Fw id="vigilance_status"><Field label="Status"><select {...pe('vigilance_status')} style={inputStyle()}>{VIGILANCE.map(v => <option key={v.v} value={v.v}>{v.l}</option>)}</select></Field></Fw>
              <Fw id="vigilance_case_ref"><Field label="Case Reference"><input {...pe('vigilance_case_ref')} placeholder="Reference no." style={inputStyle()}/></Field></Fw>
              <Fw id="vigilance_date"><Field label="Date of Incident"><input {...pe('vigilance_date')} type="date" style={inputStyle()}/></Field></Fw>
            </div>
          </div>
          )}

          {visGroup('Awards & recognition') && (
          <div style={{ background:'var(--bg1)', border:'1px solid var(--bdr)', borderRadius:8, padding:14 }}>
            {sectionTitle('Awards & recognition')}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
              <Fw id="notable_awards"><Field label="Notable Awards"><input {...pe('notable_awards')} placeholder="Awards" style={inputStyle()}/></Field></Fw>
              <Fw id="special_rewards"><Field label="Special Rewards"><input {...pe('special_rewards')} placeholder="Rewards" style={inputStyle()}/></Field></Fw>
              <Fw id="commendations_note"><Field label="Commendations / notes"><input {...pe('commendations_note')} placeholder="Commendations (PDF can be filed separately)" style={inputStyle()}/></Field></Fw>
            </div>
          </div>
          )}
        </Modal>
      )}
      {deleteTarget && (
        <Modal
          title="Delete Employee"
          onClose={() => setDeleteTarget(null)}
          footer={<>
            <Btn variant="ghost" onClick={() => setDeleteTarget(null)}>Cancel</Btn>
            <Btn variant="primary" style={{ background:'var(--red,#e53e3e)', borderColor:'var(--red,#e53e3e)' }}
              disabled={deleteMutation.isPending}
              onClick={() => deleteMutation.mutate(deleteTarget.id)}
            >
              {deleteMutation.isPending ? 'Deleting…' : 'Yes, Delete'}
            </Btn>
          </>}
        >
          <p style={{ fontSize:14, color:'var(--txt2)', lineHeight:1.6 }}>
            Delete <strong>{deleteTarget.name}</strong>? This cannot be undone.
          </p>
        </Modal>
      )}

      {showDeleteAll && (
        <Modal
          title="Delete All Employees"
          onClose={() => setShowDeleteAll(false)}
          footer={<>
            <Btn variant="ghost" onClick={() => setShowDeleteAll(false)}>Cancel</Btn>
            <Btn variant="primary" style={{ background:'var(--red,#e53e3e)', borderColor:'var(--red,#e53e3e)' }}
              disabled={deleteAllMutation.isPending}
              onClick={() => deleteAllMutation.mutate()}
            >
              {deleteAllMutation.isPending ? 'Deleting…' : 'Yes, Delete All'}
            </Btn>
          </>}
        >
          <p style={{ fontSize:14, color:'var(--txt2)', lineHeight:1.6 }}>
            This will permanently delete <strong>all {stats.total} employee records</strong>. This action cannot be undone.
          </p>
          <p style={{ fontSize:13, color:'var(--red,#e53e3e)', marginTop:8 }}>Are you sure you want to continue?</p>
        </Modal>
      )}
    </PageWrap>
  );
}
