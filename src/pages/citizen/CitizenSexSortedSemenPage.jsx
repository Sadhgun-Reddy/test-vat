// src/pages/citizen/CitizenSexSortedSemenPage.jsx
import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { syncManager } from '../../sync/syncManager';
import { PageWrap, PageHead, KPIGrid, KPICard, Card, DataTable, Badge, Btn, Modal, Field, inputStyle } from '../../components/ui';
import toast from 'react-hot-toast';

const fmtDate = d => d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

const STATUS_COLOR = { Pending: 'amber', Confirmed: 'green', Completed: 'blue', Cancelled: 'red' };

export default function CitizenSexSortedSemenPage() {
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [filters, setFilters]   = useState({ page: 1 });
  const [selectedDistrict, setSelectedDistrict] = useState('');

  const { data: districts = [] } = useQuery({
    queryKey: ['districts'],
    queryFn: async () => { const { data } = await syncManager.api.get('/districts'); return data; },
    staleTime: Infinity,
  });

  const { data, isLoading } = useQuery({
    queryKey: ['citizen-sss', filters],
    queryFn: async () => {
      const params = new URLSearchParams({ limit: 25, page: filters.page });
      const { data } = await syncManager.api.get(`/citizen/sex-sorted-semen?${params}`);
      return data;
    },
    staleTime: 30_000,
  });

  // Load nearest institution when district is selected
  const { data: nearestInst } = useQuery({
    queryKey: ['nearest-sss-institution', selectedDistrict],
    queryFn: async () => {
      const { data } = await syncManager.api.get(`/places?district_id=${selectedDistrict}&institution_type=SSS&limit=1`);
      return Array.isArray(data) ? data[0] : (data?.places?.[0] || null);
    },
    enabled: !!selectedDistrict,
    staleTime: 60_000,
  });

  const createMutation = useMutation({
    mutationFn: async (fd) => {
      const { data } = await syncManager.api.post('/citizen/sex-sorted-semen', fd);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['citizen-sss'] });
      setShowForm(false);
      toast.success('Sex Sorted Semen request submitted');
    },
    onError: err => toast.error(err.response?.data?.error || 'Request failed'),
  });

  const { register, handleSubmit, formState: { errors }, reset } = useForm({
    defaultValues: {
      farmer_name: '', mobile: '', district_id: '',
      animal_type: 'Cow', number_of_animals: 1,
      breed: '', preferred_date: '', notes: '',
    },
  });

  const records = data?.requests || data || [];
  const total   = Array.isArray(data) ? data.length : (data?.total || 0);

  return (
    <PageWrap>
      <PageHead
        title="Sex Sorted Semen"
        subtitle="Requests for sex-sorted semen (female calf guarantee)"
        crumbs={['Home', 'Citizens', 'Sex Sorted Semen']}
        actions={<Btn variant="primary" size="sm" onClick={() => { reset(); setSelectedDistrict(''); setShowForm(true); }}>+ New Request</Btn>}
      />

      <KPIGrid>
        <KPICard label="Total Requests" value={total} color="blue" />
        <KPICard label="Confirmed"  value={records.filter(r => r.status === 'Confirmed').length}  color="green" />
        <KPICard label="Pending"    value={records.filter(r => r.status === 'Pending').length}    color="amber" />
        <KPICard label="Completed"  value={records.filter(r => r.status === 'Completed').length}  color="blue"  />
      </KPIGrid>

      <Card>
        <DataTable
          loading={isLoading}
          data={records}
          emptyMsg="No sex sorted semen requests yet"
          columns={[
            { header: 'Farmer',     key: 'farmer_name',   render: v => <strong style={{ fontSize: 12 }}>{v || '—'}</strong> },
            { header: 'Mobile',     key: 'mobile',        render: v => <span style={{ fontFamily: 'var(--fm)', fontSize: 11 }}>{v || '—'}</span> },
            { header: 'Animal',     key: 'animal_type',   render: v => <Badge color="blue">{v || '—'}</Badge> },
            { header: 'Count',      key: 'number_of_animals', render: v => <span style={{ fontFamily: 'var(--fm)', color: 'var(--blu)', fontWeight: 700 }}>{v}</span> },
            { header: 'Breed',      key: 'breed',         render: v => <span style={{ fontSize: 11 }}>{v || '—'}</span> },
            { header: 'Institution',key: 'institution_name', render: v => <span style={{ fontSize: 11, fontWeight: 600 }}>{v || '—'}</span> },
            { header: 'Pref. Date', key: 'preferred_date', render: v => <span style={{ fontSize: 11, color: 'var(--txt3)' }}>{fmtDate(v)}</span> },
            { header: 'Status',     key: 'status',        render: v => <Badge color={STATUS_COLOR[v] || 'amber'}>{v || 'Pending'}</Badge> },
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
          title="Request Sex Sorted Semen"
          sub="Submit SSS service request"
          onClose={() => setShowForm(false)}
          footer={
            <>
              <Btn variant="ghost" onClick={() => setShowForm(false)}>Cancel</Btn>
              <Btn variant="primary" onClick={handleSubmit(d => createMutation.mutate({ ...d, district_id: selectedDistrict }))} disabled={createMutation.isPending}>
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
            <Field label="District" required>
              <select
                value={selectedDistrict}
                onChange={e => setSelectedDistrict(e.target.value)}
                style={inputStyle()}
              >
                <option value="">Select district…</option>
                {districts.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
            </Field>
            <Field label="Animal Type" required>
              <select {...register('animal_type')} style={inputStyle()}>
                <option value="Cow">Cow</option>
                <option value="Buffalo">Buffalo</option>
              </select>
            </Field>
            <Field label="Number of Animals" required error={errors.number_of_animals?.message}>
              <input type="number" min="1" {...register('number_of_animals', { required: 'Required', min: { value: 1, message: 'Min 1' } })}
                style={inputStyle(errors.number_of_animals)} />
            </Field>
            <Field label="Breed">
              <input {...register('breed')} placeholder="e.g. HF, Jersey, Murrah" style={inputStyle()} />
            </Field>
            <Field label="Preferred Date">
              <input type="date" {...register('preferred_date')} style={inputStyle()} />
            </Field>
            <Field label="Notes">
              <input {...register('notes')} placeholder="Additional notes…" style={inputStyle()} />
            </Field>
          </div>

          {/* Nearest institution info */}
          {selectedDistrict && nearestInst && (
            <div style={{ marginTop: 12, padding: 12, background: '#eff6ff', borderRadius: 10, border: '1px solid #bfdbfe' }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--blu)', marginBottom: 4 }}>Nearest SSS Institution</div>
              <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--txt)' }}>{nearestInst.name}</div>
              {nearestInst.address && <div style={{ fontSize: 11, color: 'var(--txt3)', marginTop: 2 }}>{nearestInst.address}</div>}
              {nearestInst.phone && (
                <div style={{ fontSize: 11, color: 'var(--txt2)', marginTop: 4 }}>
                  📞 <a href={`tel:${nearestInst.phone}`} style={{ color: 'var(--blu)' }}>{nearestInst.phone}</a>
                </div>
              )}
            </div>
          )}
          {selectedDistrict && !nearestInst && (
            <div style={{ marginTop: 12, padding: 10, background: 'var(--bg1)', borderRadius: 8, fontSize: 11, color: 'var(--txt3)' }}>
              No SSS institution found in selected district. Your request will be routed to the nearest available institution.
            </div>
          )}
        </Modal>
      )}
    </PageWrap>
  );
}
