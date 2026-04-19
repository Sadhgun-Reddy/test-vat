// src/pages/clinical/CasesPage.jsx
import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useCases, useCreateCase, useUpdateCase } from '../../hooks/useCases';
import { useQuery } from '@tanstack/react-query';
import { syncManager } from '../../sync/syncManager';
import { useSync } from '../../store/SyncContext';
import { useAuth } from '../../store/AuthContext';
import {
  PageWrap, PageHead, KPIGrid, KPICard, Card, CardHead, CardBody,
  DataTable, Badge, Modal, Btn, Field, inputStyle, EmptyState,
  outcomeColor, syncColor,
} from '../../components/ui';
import toast from 'react-hot-toast';

const fmtDate = d => d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';
const OUTCOMES = ['recovered','referred','died','ongoing'];

function linesFromEdit(edit) {
  let raw = edit?.animal_lines;
  if (typeof raw === 'string') {
    try { raw = JSON.parse(raw); } catch { raw = []; }
  }
  if (Array.isArray(raw) && raw.length) {
    return raw.map((l) => ({ animal_type_id: l.animal_type_id || '', units: Math.max(1, l.units ?? 1) }));
  }
  if (edit?.animal_type_id) {
    return [{ animal_type_id: edit.animal_type_id, units: edit.animal_units ?? 1 }];
  }
  return [{ animal_type_id: '', units: 1 }];
}

function formatAnimalLinesDisplay(lines, animalTypes) {
  let raw = lines;
  if (typeof raw === 'string') {
    try { raw = JSON.parse(raw); } catch { raw = []; }
  }
  if (!Array.isArray(raw) || !raw.length) return null;
  return raw.map((l) => {
    const n = animalTypes.find((x) => x.id === l.animal_type_id)?.name || '—';
    return `${n} (${l.units})`;
  }).join(', ');
}

export default function CasesPage() {
  const { isOnline } = useSync();
  const { user } = useAuth();
  const [filters, setFilters]     = useState({ search: '', outcome: '', page: 1 });
  const [showForm, setShowForm]   = useState(false);
  const [editCase, setEditCase]   = useState(null);

  // Fetch cases
  const { data, isLoading } = useCases({ ...filters });
  const cases = data?.cases || [];
  const total = data?.total || 0;

  // Fetch settings for dropdowns
  const { data: animalTypes } = useQuery({ queryKey: ['animal-types'], queryFn: async () => { const { data } = await syncManager.api.get('/settings/animal-types'); return data; }, staleTime: Infinity });
  const { data: places } = useQuery({
    queryKey: ['places-of-working'],
    queryFn: async () => { const { data } = await syncManager.api.get('/places-of-working'); return data; },
    staleTime: 60_000,
    enabled: isOnline,
  });

  const createCase = useCreateCase();
  const updateCase = useUpdateCase();

  const openAdd  = () => { setEditCase(null); setShowForm(true); };
  const openEdit = (c) => { setEditCase(c); setShowForm(true); };
  const closeForm = () => { setShowForm(false); setEditCase(null); };

  const onSubmit = async (formData) => {
    if (editCase) {
      await updateCase.mutateAsync({ id: editCase.id, ...formData });
    } else {
      await createCase.mutateAsync(formData);
    }
    closeForm();
  };

  return (
    <PageWrap>
      <PageHead
        title="Cases Treated"
        subtitle={`Disease surveillance & treatment records · ${total} total`}
        crumbs={['Home', 'Clinical', 'Cases Treated']}
        actions={
          <>
            <Btn variant="ghost" size="sm" onClick={() => toast('Bulk upload')}>⬆ Bulk Upload</Btn>
            <Btn variant="primary" size="sm" onClick={openAdd}>+ New Case</Btn>
          </>
        }
      />

      {/* Filters */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 14 }}>
        <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
          <span style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', fontSize: 13, color: 'var(--txt4)' }}>🔍</span>
          <input
            value={filters.search}
            onChange={e => setFilters(f => ({ ...f, search: e.target.value, page: 1 }))}
            placeholder="Search case no, farmer, diagnosis…"
            style={{ ...inputStyle(), paddingLeft: 32 }}
          />
        </div>
        <select value={filters.outcome} onChange={e => setFilters(f => ({ ...f, outcome: e.target.value, page: 1 }))}
          style={{ padding: '7px 10px', border: '1px solid var(--bdr2)', borderRadius: 6, fontSize: 12, color: 'var(--txt2)', background: 'var(--bg)' }}>
          <option value="">All Outcomes</option>
          {OUTCOMES.map(o => <option key={o}>{o}</option>)}
        </select>
        <span style={{ fontSize: 11, color: 'var(--txt3)' }}>{cases.length} of {total}</span>
      </div>

      {/* Table */}
      <Card>
        <DataTable
          loading={isLoading}
          data={cases}
          emptyMsg="No cases match the current filters"
          columns={[
            {
              header: 'Case No.', key: 'case_number',
              render: v => <span style={{ fontFamily: 'var(--fm)', color: 'var(--blu)', fontSize: 11, fontWeight: 700 }}>{v}</span>,
            },
            {
              header: 'Farmer', key: 'farmer_name',
              render: (v, r) => <div><strong style={{ fontSize: 12 }}>{v || '—'}</strong><div style={{ fontSize: 10, color: 'var(--txt3)' }}>{r.district_name}</div></div>,
            },
            { header: 'Place', key: 'place_of_working_name', render: v => <span style={{ fontSize: 11, color: 'var(--txt2)' }}>{v || '—'}</span> },
            {
              header: 'Animals',
              key: 'animal_lines',
              render: (_, r) => {
                const s = formatAnimalLinesDisplay(r.animal_lines, animalTypes || []);
                if (s) return <span style={{ fontSize: 11, color: 'var(--txt2)' }}>{s}</span>;
                return <Badge>{r.animal_type_name || '—'}</Badge>;
              },
            },
            {
              header: 'Diagnosis', key: 'diagnosis_name',
              render: v => <span style={{ fontSize: 12, fontWeight: 600 }}>{v || '—'}</span>,
            },
            { header: 'Outcome', key: 'outcome', render: v => <Badge color={outcomeColor(v)}>{v}</Badge> },
            { header: 'Date',    key: 'date_of_treatment', render: v => <span style={{ fontSize: 11, color: 'var(--txt3)' }}>{fmtDate(v)}</span> },
            { header: 'Sync',   key: 'sync_status', render: v => <Badge color={syncColor(v)}>{v === 'synced' ? '✓ Synced' : '⟳ Pending'}</Badge> },
            {
              header: 'Actions', key: 'id',
              render: (_, r) => (
                <div style={{ display: 'flex', gap: 5 }}>
                  <Btn variant="ghost" size="xs" onClick={() => openEdit(r)}>✎</Btn>
                  <Btn variant="ghost" size="xs" onClick={() => toast('PDF generating…')}>PDF</Btn>
                </div>
              ),
            },
          ]}
        />
        {/* Pagination */}
        {total > 25 && (
          <div style={{ padding: '8px 14px', borderTop: '1px solid var(--bdr)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--bg1)' }}>
            <span style={{ fontSize: 11, color: 'var(--txt3)' }}>Showing {Math.min(25, cases.length)} of {total}</span>
            <div style={{ display: 'flex', gap: 6 }}>
              <Btn variant="ghost" size="xs" disabled={filters.page <= 1} onClick={() => setFilters(f => ({ ...f, page: f.page - 1 }))}>‹ Prev</Btn>
              <Btn variant="ghost" size="xs" disabled={filters.page * 25 >= total} onClick={() => setFilters(f => ({ ...f, page: f.page + 1 }))}>Next ›</Btn>
            </div>
          </div>
        )}
      </Card>

      {/* Form modal */}
      {showForm && (
        <CaseFormModal
          editData={editCase}
          animalTypes={animalTypes || []}
          places={places || []}
          userName={user?.name || 'User'}
          isOnline={isOnline}
          onClose={closeForm}
          onSubmit={onSubmit}
          saving={createCase.isPending || updateCase.isPending}
        />
      )}
    </PageWrap>
  );
}

// ── Case form modal (Case Treated: date, place, repeatable animal type + units) ──
function CaseFormModal({ editData, animalTypes, places, userName, isOnline, onClose, onSubmit, saving }) {
  const { register, handleSubmit, reset, formState: { errors } } = useForm({
    defaultValues: {
      date_of_treatment: new Date().toISOString().slice(0, 10),
      place_of_working_id: '',
    },
  });

  const [animalLines, setAnimalLines] = useState(() => linesFromEdit(null));

  useEffect(() => {
    reset({
      date_of_treatment: editData?.date_of_treatment
        ? String(editData.date_of_treatment).slice(0, 10)
        : new Date().toISOString().slice(0, 10),
      place_of_working_id: editData?.place_of_working_id || '',
    });
    setAnimalLines(linesFromEdit(editData));
  }, [editData, reset]);

  const updateLine = (i, patch) => {
    setAnimalLines((prev) => prev.map((row, j) => (j === i ? { ...row, ...patch } : row)));
  };

  const sectionTitle = (s) => (
    <div style={{
      fontSize: 10, fontWeight: 700, color: 'var(--blu)', textTransform: 'uppercase', letterSpacing: '.06em',
      marginBottom: 10, marginTop: 4, display: 'flex', alignItems: 'center', gap: 6,
      borderTop: '1px solid var(--bdr)', paddingTop: 14,
    }}>
      <span style={{ fontSize: 14 }}>⏳</span>
      {s}
    </div>
  );

  const runSubmit = (fd) => {
    const pow = places.find((p) => p.id === fd.place_of_working_id);
    const cleaned = animalLines
      .map((l) => ({
        animal_type_id: l.animal_type_id,
        units: Math.max(1, parseInt(l.units, 10) || 1),
      }))
      .filter((l) => l.animal_type_id);
    if (!cleaned.length) {
      toast.error('Add at least one animal type with units');
      return;
    }
    onSubmit({
      date_of_treatment: fd.date_of_treatment,
      place_of_working_id: fd.place_of_working_id,
      animal_lines: cleaned,
      district_id: pow?.district_id || editData?.district_id,
    });
  };

  return (
    <Modal
      title={editData ? 'Edit Case' : 'Case Treated'}
      sub={editData ? 'Update case record' : ''}
      onClose={onClose}
      size="lg"
      footer={
        <>
          <Btn variant="ghost" onClick={onClose}>✕ Cancel</Btn>
          <Btn variant="primary" onClick={handleSubmit(runSubmit)} disabled={saving}>
            {saving ? 'Saving…' : '✓ Submit'}
          </Btn>
        </>
      }
    >
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr minmax(140px, 1fr)', gap: 12, alignItems: 'end' }}>
        <Field label="Date" required error={errors.date_of_treatment?.message}>
          <input {...register('date_of_treatment', { required: 'Required' })} type="date" style={inputStyle(errors.date_of_treatment)} />
        </Field>
        <Field label="Place of Working" required error={errors.place_of_working_id?.message}>
          <select
            {...register('place_of_working_id', { required: 'Required' })}
            style={inputStyle(errors.place_of_working_id)}
            disabled={!isOnline}
          >
            <option value="">{isOnline ? 'Select Place' : 'Go online to load places'}</option>
            {places.map((p) => (
              <option key={p.id} value={p.id}>{p.name}{p.district_name ? ` · ${p.district_name}` : ''}</option>
            ))}
          </select>
        </Field>
        <div style={{ paddingBottom: 2 }}>
          <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--txt3)', marginBottom: 4 }}>User</div>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px',
            border: '1px solid var(--bdr2)', borderRadius: 8, background: 'var(--bg1)', fontSize: 12, color: 'var(--txt2)',
          }}>
            <span style={{ fontSize: 16 }}>👤</span>
            <span>User Name: <strong>{userName}</strong></span>
          </div>
        </div>
      </div>

      {sectionTitle('Animal Details')}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {animalLines.map((line, i) => (
          <div
            key={i}
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr auto',
              gap: 12,
              alignItems: 'end',
            }}
          >
            <Field label={`Animal Type ${i + 1}`} required>
              <select
                value={line.animal_type_id}
                onChange={(e) => updateLine(i, { animal_type_id: e.target.value })}
                style={inputStyle()}
              >
                <option value="">Select Animal Type</option>
                {animalTypes.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
              </select>
            </Field>
            <Field label={`No of Units ${i + 1}`} required>
              <input
                type="number"
                min={1}
                step={1}
                value={line.units}
                onChange={(e) => updateLine(i, { units: e.target.value })}
                placeholder="No of Units"
                style={inputStyle()}
              />
            </Field>
            <Btn
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setAnimalLines((prev) => (prev.length <= 1 ? prev : prev.filter((_, j) => j !== i)))}
              disabled={animalLines.length <= 1}
              title="Remove row"
            >
              ✕
            </Btn>
          </div>
        ))}
        <div>
          <Btn type="button" variant="ghost" size="sm" onClick={() => setAnimalLines((prev) => [...prev, { animal_type_id: '', units: 1 }])}>
            + Add animal type
          </Btn>
        </div>
      </div>
    </Modal>
  );
}