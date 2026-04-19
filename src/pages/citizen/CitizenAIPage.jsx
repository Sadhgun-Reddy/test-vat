// src/pages/citizen/CitizenAIPage.jsx
import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { syncManager } from '../../sync/syncManager';
import { PageWrap, PageHead, KPIGrid, KPICard, Card, DataTable, Badge, Btn, Modal, Field, inputStyle } from '../../components/ui';
import toast from 'react-hot-toast';

const fmtDate = d => d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';
const STATUS_COLOR = { Pending: 'amber', Assigned: 'blue', Completed: 'green', Cancelled: 'red' };

export default function CitizenAIPage() {
  const qc = useQueryClient();
  const [showForm, setShowForm]     = useState(false);
  const [filters, setFilters]       = useState({ page: 1 });
  const [locating, setLocating]     = useState(false);
  const [geoCoords, setGeoCoords]   = useState(null);

  const { data, isLoading } = useQuery({
    queryKey: ['citizen-ai', filters],
    queryFn: async () => {
      const params = new URLSearchParams({ limit: 25, page: filters.page });
      const { data } = await syncManager.api.get(`/citizen/ai-service?${params}`);
      return data;
    },
    staleTime: 30_000,
  });

  const createMutation = useMutation({
    mutationFn: async (fd) => {
      const { data } = await syncManager.api.post('/citizen/ai-service', fd);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['citizen-ai'] });
      setShowForm(false);
      toast.success('AI service request submitted');
    },
    onError: err => toast.error(err.response?.data?.error || 'Request failed'),
  });

  const { register, handleSubmit, setValue, formState: { errors }, reset } = useForm({
    defaultValues: {
      farmer_name: '', mobile: '', village: '',
      animal_type: 'Cow', breed: '',
      latitude: '', longitude: '',
      preferred_time: '', notes: '',
    },
  });

  const captureLocation = () => {
    if (!navigator.geolocation) { toast.error('Geolocation not supported'); return; }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      pos => {
        const lat = pos.coords.latitude.toFixed(6);
        const lng = pos.coords.longitude.toFixed(6);
        setGeoCoords({ lat, lng });
        setValue('latitude', lat);
        setValue('longitude', lng);
        setLocating(false);
        toast.success('Location captured');
      },
      () => { setLocating(false); toast.error('Could not get location'); }
    );
  };

  const openForm = () => { reset(); setGeoCoords(null); setShowForm(true); };

  const records = data?.requests || data || [];
  const total   = Array.isArray(data) ? data.length : (data?.total || 0);

  return (
    <PageWrap>
      <PageHead
        title="Artificial Insemination Requests"
        subtitle="Citizen requests for AI services at doorstep"
        crumbs={['Home', 'Citizens', 'Artificial Insemination']}
        actions={<Btn variant="primary" size="sm" onClick={openForm}>+ Request AI Service</Btn>}
      />

      <KPIGrid>
        <KPICard label="Total Requests" value={total} color="blue" />
        <KPICard label="Pending"   value={records.filter(r => r.status === 'Pending').length}   color="amber" />
        <KPICard label="Assigned"  value={records.filter(r => r.status === 'Assigned').length}  color="blue"  />
        <KPICard label="Completed" value={records.filter(r => r.status === 'Completed').length} color="green" />
      </KPIGrid>

      <Card>
        <DataTable
          loading={isLoading}
          data={records}
          emptyMsg="No AI service requests yet"
          columns={[
            { header: 'Farmer',      key: 'farmer_name',  render: v => <strong style={{ fontSize: 12 }}>{v || '—'}</strong> },
            { header: 'Mobile',      key: 'mobile',       render: v => <span style={{ fontFamily: 'var(--fm)', fontSize: 11 }}>{v || '—'}</span> },
            { header: 'Village',     key: 'village',      render: v => <span style={{ fontSize: 11 }}>{v || '—'}</span> },
            { header: 'Animal',      key: 'animal_type',  render: v => <Badge color="blue">{v || '—'}</Badge> },
            { header: 'Breed',       key: 'breed',        render: v => <span style={{ fontSize: 11 }}>{v || '—'}</span> },
            { header: 'Assigned To', key: 'assigned_officer', render: v => <span style={{ fontSize: 11 }}>{v || '—'}</span> },
            { header: 'Pref. Time',  key: 'preferred_time', render: v => <span style={{ fontSize: 11, color: 'var(--txt3)' }}>{v || '—'}</span> },
            { header: 'Status',      key: 'status',       render: v => <Badge color={STATUS_COLOR[v] || 'amber'}>{v || 'Pending'}</Badge> },
            { header: 'Requested',   key: 'created_at',   render: v => <span style={{ fontSize: 10, color: 'var(--txt3)' }}>{fmtDate(v)}</span> },
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
          title="Request AI Service"
          sub="Doorstep Artificial Insemination request"
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
                <option value="Cow">Cow</option>
                <option value="Buffalo">Buffalo</option>
              </select>
            </Field>
            <Field label="Breed">
              <input {...register('breed')} placeholder="e.g. HF, Jersey, Murrah" style={inputStyle()} />
            </Field>
            <Field label="Preferred Time">
              <input type="time" {...register('preferred_time')} style={inputStyle()} />
            </Field>

            {/* GPS Location */}
            <div style={{ gridColumn: 'span 2' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--txt2)' }}>GPS Location (optional)</span>
                <Btn size="xs" variant="ghost" onClick={captureLocation} disabled={locating}>
                  {locating ? '⟳ Locating…' : '📍 Capture Location'}
                </Btn>
              </div>
              {geoCoords && (
                <div style={{ padding: '6px 10px', background: '#f0fdf4', borderRadius: 8, border: '1px solid #bbf7d0', fontSize: 11, color: '#166534' }}>
                  Lat: {geoCoords.lat} · Lng: {geoCoords.lng}
                </div>
              )}
              <input type="hidden" {...register('latitude')} />
              <input type="hidden" {...register('longitude')} />
            </div>

            <Field label="Notes / Remarks" style={{ gridColumn: 'span 2' }}>
              <input {...register('notes')} placeholder="Any additional information…" style={inputStyle()} />
            </Field>
          </div>

          <div style={{ marginTop: 12, padding: 10, background: 'var(--bg1)', borderRadius: 8, fontSize: 11, color: 'var(--txt3)', lineHeight: 1.6 }}>
            <strong style={{ color: 'var(--txt2)' }}>Note:</strong> An AI technician from your nearest AH institution will be assigned
            and will contact you to confirm the visit time. SMS notification will be sent.
          </div>
        </Modal>
      )}
    </PageWrap>
  );
}
