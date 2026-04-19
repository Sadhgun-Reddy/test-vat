// src/pages/citizen/CitizenFodderSeedPage.jsx
import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { syncManager } from '../../sync/syncManager';
import { PageWrap, PageHead, KPIGrid, KPICard, Card, DataTable, Badge, Btn, Modal, Field, inputStyle } from '../../components/ui';
import toast from 'react-hot-toast';

const fmtDate = d => d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

const FODDER_TYPES = [
  'CO-3 (Cumbu Napier)',
  'CO-4 (Hybrid Napier)',
  'Sorghum (Sudan Grass)',
  'Maize (Fodder)',
  'Cowpea',
  'Stylosanthes',
  'Lucerne (Alfalfa)',
  'Oat Fodder',
];

const STATUS_COLOR = { Available: 'green', 'Not Available': 'red', 'Available After Date': 'amber' };

export default function CitizenFodderSeedPage() {
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [filters, setFilters]   = useState({ page: 1 });

  const { data, isLoading } = useQuery({
    queryKey: ['citizen-fodder', filters],
    queryFn: async () => {
      const params = new URLSearchParams({ limit: 25, page: filters.page });
      const { data } = await syncManager.api.get(`/citizen/fodder-seed?${params}`);
      return data;
    },
    staleTime: 30_000,
  });

  const createMutation = useMutation({
    mutationFn: async (fd) => {
      const { data } = await syncManager.api.post('/citizen/fodder-seed', fd);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['citizen-fodder'] });
      setShowForm(false);
      toast.success('Fodder seed request submitted');
    },
    onError: err => toast.error(err.response?.data?.error || 'Request failed'),
  });

  const { register, handleSubmit, formState: { errors }, reset } = useForm({
    defaultValues: { fodder_type: FODDER_TYPES[0], quantity_kg: '', farmer_name: '', mobile: '', notes: '' },
  });

  const records = data?.requests || data || [];
  const total   = Array.isArray(data) ? data.length : (data?.total || 0);
  const available = records.filter(r => r.availability_status === 'Available').length;

  return (
    <PageWrap>
      <PageHead
        title="Fodder Seed Requests"
        subtitle="Citizen requests for fodder seed availability"
        crumbs={['Home', 'Citizens', 'Fodder Seed']}
        actions={<Btn variant="primary" size="sm" onClick={() => { reset(); setShowForm(true); }}>+ New Request</Btn>}
      />

      <KPIGrid>
        <KPICard label="Total Requests" value={total}     color="blue"  />
        <KPICard label="Available"      value={available} color="green" />
        <KPICard label="Not Available"  value={records.filter(r => r.availability_status === 'Not Available').length} color="red" />
        <KPICard label="Pending / Due"  value={records.filter(r => r.availability_status === 'Available After Date').length} color="amber" />
      </KPIGrid>

      <Card>
        <DataTable
          loading={isLoading}
          data={records}
          emptyMsg="No fodder seed requests yet"
          columns={[
            { header: 'Farmer',       key: 'farmer_name',         render: v => <strong style={{ fontSize: 12 }}>{v || '—'}</strong> },
            { header: 'Mobile',       key: 'mobile',              render: v => <span style={{ fontFamily: 'var(--fm)', fontSize: 11 }}>{v || '—'}</span> },
            { header: 'Fodder Type',  key: 'fodder_type',         render: v => <span style={{ fontSize: 12, fontWeight: 600 }}>{v}</span> },
            { header: 'Qty (kg)',     key: 'quantity_kg',         render: v => <span style={{ fontFamily: 'var(--fm)', color: 'var(--blu)' }}>{v || '—'}</span> },
            { header: 'Status',       key: 'availability_status', render: v => <Badge color={STATUS_COLOR[v] || 'blue'}>{v || 'Pending'}</Badge> },
            { header: 'Available On', key: 'available_from_date', render: v => <span style={{ fontSize: 11, color: 'var(--txt3)' }}>{fmtDate(v)}</span> },
            { header: 'Requested',    key: 'created_at',          render: v => <span style={{ fontSize: 10, color: 'var(--txt3)' }}>{fmtDate(v)}</span> },
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
          title="Request Fodder Seed"
          sub="Submit availability enquiry"
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
            <Field label="Fodder Type" required error={errors.fodder_type?.message}>
              <select {...register('fodder_type', { required: 'Required' })} style={inputStyle(errors.fodder_type)}>
                {FODDER_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </Field>
            <Field label="Quantity Required (kg)" required error={errors.quantity_kg?.message}>
              <input type="number" min="1" {...register('quantity_kg', { required: 'Required', min: { value: 1, message: 'Min 1 kg' } })}
                placeholder="e.g. 10" style={inputStyle(errors.quantity_kg)} />
            </Field>
            <Field label="Notes / Remarks" style={{ gridColumn: 'span 2' }}>
              <input {...register('notes')} placeholder="Any special requirements…" style={inputStyle()} />
            </Field>
          </div>

          <div style={{ marginTop: 12, padding: 10, background: 'var(--bg1)', borderRadius: 8, fontSize: 11, color: 'var(--txt3)', lineHeight: 1.6 }}>
            <strong style={{ color: 'var(--txt2)' }}>Note:</strong> Availability status will be updated by your nearest Animal Husbandry Institution.
            You will receive an SMS notification on your registered mobile number.
          </div>
        </Modal>
      )}
    </PageWrap>
  );
}
