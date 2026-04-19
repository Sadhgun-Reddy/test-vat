// src/pages/clinical/DewormingPage.jsx
import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { syncManager } from '../../sync/syncManager';
import { upsertAndEnqueue } from '../../sync/offlineStore';
import { useSync } from '../../store/SyncContext';
import { PageWrap, PageHead, KPIGrid, KPICard, Card, DataTable, Badge, Btn, Modal, Field, inputStyle } from '../../components/ui';
import toast from 'react-hot-toast';

const fmtDate = d => d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';
const DRUGS = ['Ivermectin', 'Albendazole', 'Fenbendazole', 'Levamisole', 'Oxfendazole', 'Triclabendazole'];

export default function DewormingPage() {
  const { isOnline, refreshPending } = useSync();
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [filters, setFilters]   = useState({ search: '', page: 1 });

  const { data, isLoading } = useQuery({
    queryKey: ['deworming', filters],
    queryFn: async () => {
      if (isOnline) {
        const params = new URLSearchParams({ limit: 25, page: filters.page });
        const { data } = await syncManager.api.get(`/deworming?${params}`);
        return data;
      }
      return { deworming: [], total: 0 };
    },
    staleTime: 30_000,
  });

  const { data: districts } = useQuery({
    queryKey: ['districts'],
    queryFn: async () => { const { data } = await syncManager.api.get('/districts'); return data; },
    enabled: isOnline, staleTime: Infinity,
  });

  const createMutation = useMutation({
    mutationFn: async (fd) => {
      if (isOnline) { const { data } = await syncManager.api.post('/deworming', fd); return data; }
      return upsertAndEnqueue('deworming', fd, 'INSERT');
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['deworming'] }); setShowForm(false); toast.success('Deworming record saved'); refreshPending(); },
    onError: err => toast.error(err.response?.data?.error || 'Failed to save'),
  });

  const { register, handleSubmit, formState: { errors } } = useForm({
    defaultValues: { farmer_name: '', district_id: '', date_of_deworming: new Date().toISOString().slice(0, 10), animal_count: 1, drug_name: 'Ivermectin', dose_ml: '', next_due_date: '' },
  });

  const records = data?.deworming || [];
  const total   = data?.total     || 0;
  const totalAnimals = records.reduce((s, r) => s + (r.animal_count || 0), 0);

  return (
    <PageWrap>
      <PageHead
        title="Deworming"
        subtitle={`Systematic animal deworming programme · ${total} records`}
        crumbs={['Home', 'Clinical', 'Deworming']}
        actions={<Btn variant="primary" size="sm" onClick={() => setShowForm(true)}>+ New Record</Btn>}
      />

      <KPIGrid>
        <KPICard label="Total Records"   value={total}        color="green" />
        <KPICard label="Animals Treated" value={totalAnimals} color="blue"  sub="(current page)" />
        <KPICard label="Pending Sync"    value={records.filter(r => r.sync_status === 'pending').length} color="amber" />
      </KPIGrid>

      <Card>
        <DataTable
          loading={isLoading}
          data={records}
          emptyMsg={isOnline ? 'No deworming records' : 'Records will appear when online'}
          columns={[
            { header: 'Farmer',      key: 'farmer_name',    render: v => <strong style={{ fontSize: 12 }}>{v || '—'}</strong> },
            { header: 'District',    key: 'district_name',  render: v => <span style={{ fontSize: 11 }}>{v || '—'}</span> },
            { header: 'Animal',      key: 'animal_type_name',render: v => <Badge>{v || '—'}</Badge> },
            { header: 'Count',       key: 'animal_count',   render: v => <span style={{ fontFamily: 'var(--fm)', color: 'var(--blu)', fontWeight: 700 }}>{v}</span> },
            { header: 'Drug Used',   key: 'drug_name',      render: v => <span style={{ fontWeight: 600, fontSize: 12 }}>{v || '—'}</span> },
            { header: 'Dose (ml)',   key: 'dose_ml',        render: v => <span style={{ fontFamily: 'var(--fm)' }}>{v || '—'}</span> },
            { header: 'Date',        key: 'date_of_deworming', render: v => <span style={{ fontSize: 11, color: 'var(--txt3)' }}>{fmtDate(v)}</span> },
            { header: 'Next Due',    key: 'next_due_date',  render: v => <span style={{ fontSize: 11, color: 'var(--txt3)' }}>{fmtDate(v)}</span> },
            { header: 'Sync',        key: 'sync_status',    render: v => <Badge color={v === 'synced' ? 'green' : 'amber'}>{v === 'synced' ? '✓' : '⟳'}</Badge> },
          ]}
        />
        {total > 25 && (
          <div style={{ padding: '8px 14px', borderTop: '1px solid var(--bdr)', display: 'flex', justifyContent: 'space-between', background: 'var(--bg1)' }}>
            <span style={{ fontSize: 11, color: 'var(--txt3)' }}>Showing {records.length} of {total}</span>
            <div style={{ display: 'flex', gap: 6 }}>
              <Btn size="xs" variant="ghost" disabled={filters.page <= 1} onClick={() => setFilters(f => ({ ...f, page: f.page - 1 }))}>‹ Prev</Btn>
              <Btn size="xs" variant="ghost" disabled={filters.page * 25 >= total} onClick={() => setFilters(f => ({ ...f, page: f.page + 1 }))}>Next ›</Btn>
            </div>
          </div>
        )}
      </Card>

      {showForm && (
        <Modal title="Record Deworming" sub="Animal deworming entry" onClose={() => setShowForm(false)}
          footer={
            <>
              <Btn variant="ghost" onClick={() => setShowForm(false)}>Cancel</Btn>
              <Btn variant="primary" onClick={handleSubmit(d => createMutation.mutate(d))} disabled={createMutation.isPending}>
                {createMutation.isPending ? 'Saving…' : '✓ Record'}
              </Btn>
            </>
          }
        >
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
            <Field label="Farmer Name" required error={errors.farmer_name?.message}>
              <input {...register('farmer_name', { required: 'Required' })} placeholder="Farmer name" style={inputStyle(errors.farmer_name)} />
            </Field>
            <Field label="District" required error={errors.district_id?.message}>
              <select {...register('district_id', { required: 'Required' })} style={inputStyle(errors.district_id)}>
                <option value="">Select district…</option>
                {(districts || []).map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
            </Field>
            <Field label="Date" required>
              <input type="date" {...register('date_of_deworming')} style={inputStyle()} />
            </Field>
            <Field label="Animal Count">
              <input type="number" {...register('animal_count')} min={1} style={inputStyle()} />
            </Field>
            <Field label="Drug Used">
              <select {...register('drug_name')} style={inputStyle()}>
                {DRUGS.map(d => <option key={d}>{d}</option>)}
              </select>
            </Field>
            <Field label="Dose (ml)">
              <input type="number" step="0.5" {...register('dose_ml')} placeholder="e.g. 5" style={inputStyle()} />
            </Field>
            <Field label="Batch No.">
              <input {...register('batch_no')} placeholder="BTH-XXXXXX" style={inputStyle()} />
            </Field>
            <Field label="Next Due Date">
              <input type="date" {...register('next_due_date')} style={inputStyle()} />
            </Field>
            <Field label="Notes">
              <input {...register('notes')} placeholder="Observations…" style={inputStyle()} />
            </Field>
          </div>
        </Modal>
      )}
    </PageWrap>
  );
}