// src/pages/citizen/CitizenDewormingPage.jsx
import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { syncManager } from '../../sync/syncManager';
import { PageWrap, PageHead, KPIGrid, KPICard, Card, DataTable, Badge, Btn, Modal, Field, inputStyle } from '../../components/ui';
import toast from 'react-hot-toast';

const fmtDate = d => d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

const ANIMAL_TYPES = ['Cow', 'Buffalo', 'Sheep', 'Goat', 'Horse', 'Pig'];
const STATUS_COLOR = { Pending: 'amber', Scheduled: 'blue', Completed: 'green', Cancelled: 'red' };

export default function CitizenDewormingPage() {
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [filters, setFilters]   = useState({ page: 1 });

  const { data, isLoading } = useQuery({
    queryKey: ['citizen-deworming', filters],
    queryFn: async () => {
      const params = new URLSearchParams({ limit: 25, page: filters.page });
      const { data } = await syncManager.api.get(`/citizen/deworming?${params}`);
      return data;
    },
    staleTime: 30_000,
  });

  const createMutation = useMutation({
    mutationFn: async (fd) => {
      const { data } = await syncManager.api.post('/citizen/deworming', fd);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['citizen-deworming'] });
      setShowForm(false);
      toast.success('Deworming request submitted');
    },
    onError: err => toast.error(err.response?.data?.error || 'Request failed'),
  });

  const { register, handleSubmit, formState: { errors }, reset } = useForm({
    defaultValues: {
      farmer_name: '', mobile: '', village: '',
      animal_type: 'Cow', number_of_animals: 1,
      preferred_date: '', notes: '',
    },
  });

  const records = data?.requests || data || [];
  const total   = Array.isArray(data) ? data.length : (data?.total || 0);
  const totalAnimals = records.reduce((s, r) => s + (+(r.number_of_animals) || 0), 0);

  return (
    <PageWrap>
      <PageHead
        title="Citizen Deworming Requests"
        subtitle="Farmer requests for animal deworming services"
        crumbs={['Home', 'Citizens', 'Deworming']}
        actions={<Btn variant="primary" size="sm" onClick={() => { reset(); setShowForm(true); }}>+ Request Service</Btn>}
      />

      <KPIGrid>
        <KPICard label="Total Requests"   value={total}        color="blue"  />
        <KPICard label="Animals Requested" value={totalAnimals} color="green" sub="(current page)" />
        <KPICard label="Scheduled"  value={records.filter(r => r.status === 'Scheduled').length}  color="blue"  />
        <KPICard label="Completed"  value={records.filter(r => r.status === 'Completed').length}  color="green" />
      </KPIGrid>

      <Card>
        <DataTable
          loading={isLoading}
          data={records}
          emptyMsg="No deworming requests yet"
          columns={[
            { header: 'Farmer',     key: 'farmer_name',       render: v => <strong style={{ fontSize: 12 }}>{v || '—'}</strong> },
            { header: 'Mobile',     key: 'mobile',            render: v => <span style={{ fontFamily: 'var(--fm)', fontSize: 11 }}>{v || '—'}</span> },
            { header: 'Village',    key: 'village',           render: v => <span style={{ fontSize: 11 }}>{v || '—'}</span> },
            { header: 'Animal',     key: 'animal_type',       render: v => <Badge color="blue">{v || '—'}</Badge> },
            { header: 'Count',      key: 'number_of_animals', render: v => <span style={{ fontFamily: 'var(--fm)', color: 'var(--blu)', fontWeight: 700 }}>{v}</span> },
            { header: 'Pref. Date', key: 'preferred_date',    render: v => <span style={{ fontSize: 11, color: 'var(--txt3)' }}>{fmtDate(v)}</span> },
            { header: 'Assigned To',key: 'assigned_institution', render: v => <span style={{ fontSize: 11 }}>{v || '—'}</span> },
            { header: 'Status',     key: 'status',            render: v => <Badge color={STATUS_COLOR[v] || 'amber'}>{v || 'Pending'}</Badge> },
          ]}
        />
        {total > 25 && (
          <div style={{ padding: '8px 14px', borderTop: '1px solid var(--bdr)', display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 11, color: 'var(--txt3)' }}>Showing {records.length} of {total}</span>
            <div style={{ display: 'flex', gap: 6 }}>
              <Btn size="xs" variant="ghost" disabled={filters.page <= 1} onClick={() => setFilters(f => ({ ...f, page: f.page - 1 }))}>‹ Prev</Btn>
              <Btn size="xs" variant="ghost" disabled={filters.page * 25 >= total} onClick={() => setFilters(f => ({ ...f, page: f.page + 1 }))}>Next ›</Btn>
            </div>
          </div>
        )}
      </Card>

      {showForm && (
        <Modal
          title="Request Deworming Service"
          sub="Submit animal deworming request"
          onClose={() => setShowForm(false)}
          footer={
            <>
              <Btn variant="ghost" onClick={() => setShowForm(false)}>Cancel</Btn>
              <Btn variant="primary" onClick={handleSubmit(d => createMutation.mutate(d))} disabled={createMutation.isPending}>
                {createMutation.isPending ? 'Submitting…' : '✓ Submit Request'}
              </Btn>
            </>
          }
        >
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <Field label="Farmer Name" required error={errors.farmer_name?.message}>
              <input {...register('farmer_name', { required: 'Required' })} placeholder="Your full name" style={inputStyle(errors.farmer_name)} />
            </Field>
            <Field label="Mobile" required error={errors.mobile?.message}>
              <input {...register('mobile', { required: 'Required', pattern: { value: /^[6-9]\d{9}$/, message: '10-digit mobile' } })}
                placeholder="10-digit mobile" maxLength={10} style={inputStyle(errors.mobile)} />
            </Field>
            <Field label="Village / Town" required error={errors.village?.message}>
              <input {...register('village', { required: 'Required' })} placeholder="Your village name" style={inputStyle(errors.village)} />
            </Field>
            <Field label="Animal Type" required>
              <select {...register('animal_type')} style={inputStyle()}>
                {ANIMAL_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </Field>
            <Field label="Number of Animals" required error={errors.number_of_animals?.message}>
              <input type="number" min="1" {...register('number_of_animals', { required: 'Required', min: { value: 1, message: 'At least 1' } })}
                style={inputStyle(errors.number_of_animals)} />
            </Field>
            <Field label="Preferred Date">
              <input type="date" {...register('preferred_date')} style={inputStyle()} />
            </Field>
            <Field label="Notes / Remarks" style={{ gridColumn: 'span 2' }}>
              <input {...register('notes')} placeholder="Any special observations…" style={inputStyle()} />
            </Field>
          </div>

          <div style={{ marginTop: 12, padding: 10, background: 'var(--bg1)', borderRadius: 8, fontSize: 11, color: 'var(--txt3)', lineHeight: 1.6 }}>
            <strong style={{ color: 'var(--txt2)' }}>Note:</strong> A veterinary officer from your nearest AH institution will contact you
            to schedule the deworming visit. You will receive an SMS confirmation.
          </div>
        </Modal>
      )}
    </PageWrap>
  );
}
