// src/pages/clinical/AIServicePage.jsx
import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm, useFieldArray } from 'react-hook-form';
import { syncManager } from '../../sync/syncManager';
import { upsertAndEnqueue } from '../../sync/offlineStore';
import { useSync } from '../../store/SyncContext';
import { useAuth } from '../../store/AuthContext';
import { PageWrap, PageHead, KPIGrid, KPICard, Card, DataTable, Badge, Btn, Modal, Field, inputStyle } from '../../components/ui';
import toast from 'react-hot-toast';

const fmtDate = d => d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

function sectionTitle(label) {
  return (
    <div style={{
      fontSize: 10, fontWeight: 700, color: 'var(--blu)', textTransform: 'uppercase', letterSpacing: '.06em',
      marginBottom: 10, marginTop: 4, display: 'flex', alignItems: 'center', gap: 6,
      borderTop: '1px solid var(--bdr)', paddingTop: 14,
    }}>
      <span style={{ fontSize: 14 }}>🧬</span>
      {label}
    </div>
  );
}

const DEFAULT_LINE = { animal_type_id: '', sex_sorted_semen_id: '', dose_count: 1 };

const DEFAULT_AI = {
  district_id: '',
  place_of_working_id: '',
  date_of_service: '',
  lines: [{ ...DEFAULT_LINE }],
};

export default function AIServicePage() {
  const { isOnline, refreshPending } = useSync();
  const { user } = useAuth();
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState(null);

  const { data, isLoading } = useQuery({
    queryKey: ['ai-services'],
    queryFn: async () => {
      if (!isOnline) return { ai_services: [], total: 0 };
      const { data } = await syncManager.api.get('/ai-services?limit=50');
      return data;
    },
    staleTime: 30_000,
  });

  const { data: districts } = useQuery({
    queryKey: ['districts'],
    queryFn: async () => { const { data } = await syncManager.api.get('/districts'); return data; },
    enabled: isOnline, staleTime: Infinity,
  });

  const { data: places } = useQuery({
    queryKey: ['places-of-working'],
    queryFn: async () => { const { data } = await syncManager.api.get('/places-of-working'); return data; },
    enabled: isOnline, staleTime: 60_000,
  });

  const { data: animalTypes } = useQuery({
    queryKey: ['animal-types'],
    queryFn: async () => { const { data } = await syncManager.api.get('/settings/animal-types'); return data; },
    enabled: isOnline, staleTime: Infinity,
  });

  const { data: sexSortedSemens } = useQuery({
    queryKey: ['sex-sorted-semens'],
    queryFn: async () => { const { data } = await syncManager.api.get('/settings/sex-sorted-semens'); return data; },
    enabled: isOnline, staleTime: Infinity,
  });

  const { register, handleSubmit, reset, setValue, watch, control, formState: { errors } } = useForm({
    defaultValues: { ...DEFAULT_AI, date_of_service: new Date().toISOString().slice(0, 10) },
  });

  const { fields, append, remove } = useFieldArray({ control, name: 'lines' });

  const distReg = register('district_id', { required: !isOnline ? 'Required' : false });
  const watchPlace = watch('place_of_working_id');

  useEffect(() => {
    if (!watchPlace || !(places || []).length) return;
    const p = places.find((x) => x.id === watchPlace);
    if (p?.district_id) setValue('district_id', p.district_id);
  }, [watchPlace, places, setValue]);

  const createMutation = useMutation({
    mutationFn: async (fd) => {
      const body = {
        date_of_service: fd.date_of_service,
        place_of_working_id: fd.place_of_working_id,
        district_id: fd.district_id,
        lines: fd.lines.map((l) => ({
          animal_type_id: l.animal_type_id,
          sex_sorted_semen_id: l.sex_sorted_semen_id || '',
          dose_count: l.dose_count,
        })),
      };
      if (isOnline) {
        const { data } = await syncManager.api.post('/ai-services', body);
        return data;
      }
      const base = {
        date_of_service: fd.date_of_service,
        place_of_working_id: fd.place_of_working_id || null,
        district_id: fd.district_id,
      };
      const created = [];
      for (const line of fd.lines) {
        const rec = await upsertAndEnqueue(
          'ai_services',
          {
            ...base,
            animal_type_id: line.animal_type_id,
            sex_sorted_semen_id: line.sex_sorted_semen_id || null,
            dose_count: line.dose_count,
          },
          'INSERT'
        );
        created.push(rec);
      }
      return { ai_services: created };
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['ai-services'] });
      setShowForm(false);
      toast.success('A.I. service record saved');
      refreshPending();
    },
    onError: err => toast.error(err.response?.data?.error || 'Failed to save'),
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, ...fd }) => {
      const { data } = await syncManager.api.patch(`/ai-services/${id}`, fd);
      return data;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['ai-services'] }); setEditId(null); toast.success('Pregnancy status updated'); },
    onError: () => toast.error('Update failed'),
  });

  const openForm = () => {
    reset({
      ...DEFAULT_AI,
      date_of_service: new Date().toISOString().slice(0, 10),
      lines: [{ ...DEFAULT_LINE }],
    });
    setShowForm(true);
  };

  const records = data?.ai_services || [];
  const total = data?.total || 0;
  const confirmed = records.filter(r => r.pregnancy_status === 'confirmed').length;
  const successRate = records.length ? Math.round(confirmed / records.length * 100) : 0;

  const pregnancyColor = p => ({ confirmed: 'green', not_confirmed: 'red', pending: 'amber', repeat_service: 'gold' }[p] || 'dim');

  return (
    <PageWrap>
      <PageHead
        title="Artificial Insemination"
        subtitle={`A.I. programme records · ${total} total`}
        crumbs={['Home', 'Clinical', 'A.I. Service']}
        actions={<Btn variant="primary" size="sm" onClick={openForm}>+ New Record</Btn>}
      />

      <KPIGrid>
        <KPICard label="Total A.I." value={total} color="blue" />
        <KPICard label="Confirmed Pregnant" value={confirmed} sub={`${successRate}% success rate`} color="green" delta={`↑ ${successRate}%`} />
        <KPICard label="Pending Check" value={records.filter(r => r.pregnancy_status === 'pending').length} color="amber" />
        <KPICard label="Sex-Sorted Semen" value={records.filter(r => r.semen_type === 'sex-sorted').length} color="purple" />
        <KPICard label="Repeat Service" value={records.filter(r => r.pregnancy_status === 'repeat_service').length} color="red" />
      </KPIGrid>

      <Card>
        <DataTable
          loading={isLoading}
          data={records}
          emptyMsg={isOnline ? 'No A.I. service records' : 'Records will appear when online'}
          columns={[
            { header: 'Place', key: 'place_of_working_name', render: v => <span style={{ fontSize: 11 }}>{v || '—'}</span> },
            { header: 'District', key: 'district_name', render: v => <span style={{ fontSize: 11 }}>{v || '—'}</span> },
            { header: 'Animal', key: 'animal_type_name', render: v => <Badge>{v || '—'}</Badge> },
            { header: 'Sex-sorted semen', key: 'sex_sorted_semen_name', render: v => <span style={{ fontSize: 11 }}>{v || '—'}</span> },
            { header: 'A.I. done', key: 'dose_count', render: v => <span style={{ fontFamily: 'var(--fm)', fontWeight: 700 }}>{v ?? '—'}</span> },
            { header: 'Date', key: 'date_of_service', render: v => <span style={{ fontSize: 11, color: 'var(--txt3)' }}>{fmtDate(v)}</span> },
            {
              header: 'Pregnancy', key: 'pregnancy_status',
              render: (v, r) => (
                <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                  <Badge color={pregnancyColor(v)}>{v?.replace(/_/g, ' ') || '—'}</Badge>
                  {v === 'pending' && (
                    <button type="button" onClick={() => setEditId(r.id)} title="Update status"
                      style={{ fontSize: 11, padding: '1px 6px', background: 'var(--blu-lt)', color: 'var(--blu)', border: '1px solid var(--blu-bdr)', borderRadius: 4, cursor: 'pointer', fontFamily: 'var(--fb)' }}>
                      ✎
                    </button>
                  )}
                </div>
              ),
            },
            { header: 'Sync', key: 'sync_status', render: v => <Badge color={v === 'synced' ? 'green' : 'amber'}>{v === 'synced' ? '✓' : '⟳'}</Badge> },
          ]}
        />
      </Card>

      {showForm && (
        <Modal
          title="Create Artificial Insemination Record"
          sub=""
          size="lg"
          onClose={() => setShowForm(false)}
          footer={
            <>
              <Btn variant="ghost" onClick={() => setShowForm(false)}>✕ Cancel</Btn>
              <Btn variant="primary" onClick={handleSubmit(d => createMutation.mutate(d))} disabled={createMutation.isPending}>
                {createMutation.isPending ? 'Saving…' : '✓ Submit'}
              </Btn>
            </>
          }
        >
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, alignItems: 'end', marginBottom: 8 }}>
            <div>
              <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--txt3)', marginBottom: 4 }}>User Name</div>
              <div style={{
                display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px',
                border: '1px solid var(--bdr2)', borderRadius: 8, background: 'var(--bg1)', fontSize: 12,
              }}>
                <span style={{ fontSize: 16 }}>👤</span>
                <span>User Name: <strong>{user?.name || 'Admin'}</strong></span>
              </div>
            </div>
            <Field label="Date" required error={errors.date_of_service?.message}>
              <input {...register('date_of_service', { required: 'Required' })} type="date" style={inputStyle(errors.date_of_service)} />
            </Field>
            <Field label="Place of Working" required={isOnline} error={errors.place_of_working_id?.message}>
              <select
                {...register('place_of_working_id', { required: isOnline ? 'Required' : false })}
                style={inputStyle(errors.place_of_working_id)}
                disabled={!isOnline}
              >
                <option value="">{isOnline ? 'Select Place' : 'Offline — optional'}</option>
                {(places || []).map(p => (
                  <option key={p.id} value={p.id}>{p.name}{p.district_name ? ` · ${p.district_name}` : ''}</option>
                ))}
              </select>
            </Field>
          </div>

          {isOnline ? (
            <input type="hidden" {...register('district_id')} />
          ) : (
            <div style={{ marginBottom: 12 }}>
              <Field label="District" required error={errors.district_id?.message}>
                <select {...distReg} style={inputStyle(errors.district_id)}>
                  <option value="">Select…</option>
                  {(districts || []).map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                </select>
              </Field>
            </div>
          )}

          {sectionTitle('Animal AI Details')}
          {fields.map((field, index) => {
            const lineErr = errors.lines?.[index];
            const n = index + 1;
            return (
              <div
                key={field.id}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr 1fr 36px',
                  gap: 12,
                  alignItems: 'end',
                  marginBottom: index < fields.length - 1 ? 14 : 4,
                  paddingBottom: index < fields.length - 1 ? 14 : 0,
                  borderBottom: index < fields.length - 1 ? '1px solid var(--bdr)' : 'none',
                }}
              >
                <Field label={`Animal Type ${n}`} required error={lineErr?.animal_type_id?.message}>
                  <select
                    {...register(`lines.${index}.animal_type_id`, { required: 'Required' })}
                    style={inputStyle(lineErr?.animal_type_id)}
                  >
                    <option value="">Select Animal Type</option>
                    {(animalTypes || []).map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                  </select>
                </Field>
                <Field label="Sex Sorted Semen">
                  <select {...register(`lines.${index}.sex_sorted_semen_id`)} style={inputStyle()}>
                    <option value="">Select Semen</option>
                    {(sexSortedSemens || []).map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </Field>
                <Field label={`No of AI Done ${n}`} required error={lineErr?.dose_count?.message}>
                  <input
                    type="number"
                    min={1}
                    step={1}
                    {...register(`lines.${index}.dose_count`, {
                      required: 'Required',
                      min: { value: 1, message: 'Min 1' },
                      valueAsNumber: true,
                    })}
                    placeholder="No of AI Done"
                    style={inputStyle(lineErr?.dose_count)}
                  />
                </Field>
                <div style={{ paddingBottom: 2 }}>
                  {fields.length > 1 ? (
                    <button
                      type="button"
                      title="Remove row"
                      onClick={() => remove(index)}
                      style={{
                        width: 32,
                        height: 32,
                        borderRadius: 8,
                        border: '1px solid var(--bdr2)',
                        background: 'var(--bg1)',
                        color: 'var(--txt2)',
                        cursor: 'pointer',
                        fontSize: 16,
                        lineHeight: 1,
                      }}
                    >
                      ×
                    </button>
                  ) : (
                    <span style={{ display: 'inline-block', width: 32 }} />
                  )}
                </div>
              </div>
            );
          })}
          <div style={{ marginTop: 8 }}>
            <Btn
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => append({ ...DEFAULT_LINE })}
            >
              + Add animal line
            </Btn>
          </div>
        </Modal>
      )}

      {editId && (
        <UpdatePregnancyModal
          id={editId}
          onClose={() => setEditId(null)}
          onSubmit={data => updateMutation.mutate({ id: editId, ...data })}
          saving={updateMutation.isPending}
        />
      )}
    </PageWrap>
  );
}

function UpdatePregnancyModal({ id, onClose, onSubmit, saving }) {
  const { register, handleSubmit } = useForm({ defaultValues: { pregnancy_status: 'pending', pregnancy_check_date: new Date().toISOString().slice(0, 10) } });
  return (
    <Modal title="Update Pregnancy Status" onClose={onClose} size="sm"
      footer={
        <>
          <Btn variant="ghost" onClick={onClose}>Cancel</Btn>
          <Btn variant="primary" onClick={handleSubmit(onSubmit)} disabled={saving}>{saving ? 'Saving…' : '✓ Update'}</Btn>
        </>
      }
    >
      <Field label="Pregnancy Status" style={{ marginBottom: 12 }}>
        <select {...register('pregnancy_status')} style={{ padding: '8px 10px', border: '1px solid var(--bdr2)', borderRadius: 6, fontSize: 13, width: '100%', fontFamily: 'var(--fb)' }}>
          <option value="confirmed">Confirmed</option>
          <option value="not_confirmed">Not Confirmed</option>
          <option value="repeat_service">Repeat Service Required</option>
          <option value="pending">Still Pending</option>
        </select>
      </Field>
      <Field label="Check Date">
        <input type="date" {...register('pregnancy_check_date')} style={{ padding: '8px 10px', border: '1px solid var(--bdr2)', borderRadius: 6, fontSize: 13, width: '100%', fontFamily: 'var(--fb)' }} />
      </Field>
    </Modal>
  );
}
