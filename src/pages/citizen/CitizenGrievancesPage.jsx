// src/pages/citizen/CitizenGrievancesPage.jsx
import React, { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { syncManager } from '../../sync/syncManager';
import { PageWrap, PageHead, KPIGrid, KPICard, Card, DataTable, Badge, Btn, Modal, Field, inputStyle } from '../../components/ui';
import toast from 'react-hot-toast';

const fmtDate = d => d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

const CATEGORIES = [
  { value: 'staff_absent',       label: 'Staff Not Available',   icon: '👤' },
  { value: 'opened_late',        label: 'Institution Opened Late', icon: '⏰' },
  { value: 'medicines_missing',  label: 'Medicines Not Available', icon: '💊' },
  { value: 'closed',             label: 'Institution Closed',     icon: '🔒' },
];

const STATUS_COLOR = { Open: 'red', 'In Progress': 'amber', Resolved: 'green', Closed: 'blue' };
const CATEGORY_LABEL = Object.fromEntries(CATEGORIES.map(c => [c.value, c.label]));

export default function CitizenGrievancesPage() {
  const qc = useQueryClient();
  const [showForm, setShowForm]   = useState(false);
  const [filters, setFilters]     = useState({ page: 1 });
  const [locating, setLocating]   = useState(false);
  const [geoCoords, setGeoCoords] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);
  const fileRef = useRef();

  const { data, isLoading } = useQuery({
    queryKey: ['citizen-grievances', filters],
    queryFn: async () => {
      const params = new URLSearchParams({ limit: 25, page: filters.page });
      const { data } = await syncManager.api.get(`/citizen/grievances?${params}`);
      return data;
    },
    staleTime: 30_000,
  });

  const { data: districts = [] } = useQuery({
    queryKey: ['districts'],
    queryFn: async () => { const { data } = await syncManager.api.get('/districts'); return data; },
    staleTime: Infinity,
  });

  const createMutation = useMutation({
    mutationFn: async (fd) => {
      const formData = new FormData();
      Object.entries(fd).forEach(([k, v]) => { if (v !== undefined && v !== null && v !== '') formData.append(k, v); });
      if (fd._photo) formData.append('photo', fd._photo);
      const { data } = await syncManager.api.post('/citizen/grievances', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['citizen-grievances'] });
      setShowForm(false);
      toast.success('Grievance submitted successfully');
    },
    onError: err => toast.error(err.response?.data?.error || 'Submission failed'),
  });

  const { register, handleSubmit, setValue, watch, formState: { errors }, reset } = useForm({
    defaultValues: {
      farmer_name: '', mobile: '', district_id: '',
      institution_name: '', category: CATEGORIES[0].value,
      description: '', latitude: '', longitude: '', _photo: null,
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

  const handlePhoto = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { toast.error('Photo must be < 5 MB'); return; }
    setValue('_photo', file);
    const reader = new FileReader();
    reader.onload = ev => setPhotoPreview(ev.target.result);
    reader.readAsDataURL(file);
  };

  const openForm = () => { reset(); setGeoCoords(null); setPhotoPreview(null); setShowForm(true); };

  const records = data?.grievances || data || [];
  const total   = Array.isArray(data) ? data.length : (data?.total || 0);

  return (
    <PageWrap>
      <PageHead
        title="Citizen Grievances"
        subtitle="Lodge and track complaints about AH institution services"
        crumbs={['Home', 'Citizens', 'Grievances']}
        actions={<Btn variant="primary" size="sm" onClick={openForm}>+ Lodge Grievance</Btn>}
      />

      <KPIGrid>
        <KPICard label="Total"       value={total} color="blue" />
        <KPICard label="Open"        value={records.filter(r => r.status === 'Open').length}        color="red"   />
        <KPICard label="In Progress" value={records.filter(r => r.status === 'In Progress').length} color="amber" />
        <KPICard label="Resolved"    value={records.filter(r => r.status === 'Resolved').length}    color="green" />
      </KPIGrid>

      <Card>
        <DataTable
          loading={isLoading}
          data={records}
          emptyMsg="No grievances submitted yet"
          columns={[
            { header: 'Farmer',      key: 'farmer_name',   render: v => <strong style={{ fontSize: 12 }}>{v || '—'}</strong> },
            { header: 'Mobile',      key: 'mobile',        render: v => <span style={{ fontFamily: 'var(--fm)', fontSize: 11 }}>{v || '—'}</span> },
            { header: 'Institution', key: 'institution_name', render: v => <span style={{ fontSize: 11, fontWeight: 600 }}>{v || '—'}</span> },
            { header: 'Category',    key: 'category',      render: v => <span style={{ fontSize: 11 }}>{CATEGORY_LABEL[v] || v || '—'}</span> },
            { header: 'District',    key: 'district_name', render: v => <Badge color="blue">{v || '—'}</Badge> },
            { header: 'Has Photo',   key: 'photo_url',     render: v => v ? <span style={{ color: '#059669', fontSize: 12 }}>📷 Yes</span> : <span style={{ color: 'var(--txt3)', fontSize: 11 }}>—</span> },
            { header: 'Status',      key: 'status',        render: v => <Badge color={STATUS_COLOR[v] || 'amber'}>{v || 'Open'}</Badge> },
            { header: 'Submitted',   key: 'created_at',    render: v => <span style={{ fontSize: 10, color: 'var(--txt3)' }}>{fmtDate(v)}</span> },
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
          title="Lodge Grievance"
          sub="Report an issue at your Animal Husbandry institution"
          onClose={() => setShowForm(false)}
          footer={
            <>
              <Btn variant="ghost" onClick={() => setShowForm(false)}>Cancel</Btn>
              <Btn variant="primary" onClick={handleSubmit(d => createMutation.mutate(d))} disabled={createMutation.isPending}>
                {createMutation.isPending ? 'Submitting…' : '✓ Submit Grievance'}
              </Btn>
            </>
          }
        >
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <Field label="Your Name" required error={errors.farmer_name?.message}>
              <input {...register('farmer_name', { required: 'Required' })} placeholder="Your full name" style={inputStyle(errors.farmer_name)} />
            </Field>
            <Field label="Mobile" required error={errors.mobile?.message}>
              <input {...register('mobile', { required: 'Required', pattern: { value: /^[6-9]\d{9}$/, message: '10-digit mobile' } })}
                placeholder="10-digit mobile" maxLength={10} style={inputStyle(errors.mobile)} />
            </Field>
            <Field label="District" required error={errors.district_id?.message}>
              <select {...register('district_id', { required: 'Required' })} style={inputStyle(errors.district_id)}>
                <option value="">Select district…</option>
                {districts.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
            </Field>
            <Field label="Institution Name" required error={errors.institution_name?.message}>
              <input {...register('institution_name', { required: 'Required' })} placeholder="Name of institution" style={inputStyle(errors.institution_name)} />
            </Field>

            {/* Category radio */}
            <div style={{ gridColumn: 'span 2' }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--txt2)', marginBottom: 6 }}>Grievance Category <span style={{ color: 'var(--red)' }}>*</span></div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                {CATEGORIES.map(cat => {
                  const isSelected = watch('category') === cat.value;
                  return (
                    <label key={cat.value} style={{
                      display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', borderRadius: 10,
                      border: `1.5px solid ${isSelected ? 'var(--blu)' : 'var(--bdr)'}`,
                      background: isSelected ? 'var(--blu-lt)' : 'var(--bg)',
                      cursor: 'pointer', transition: 'all .15s', fontSize: 12,
                    }}>
                      <input type="radio" {...register('category', { required: true })} value={cat.value} style={{ accentColor: 'var(--blu)' }} />
                      <span style={{ fontSize: 16 }}>{cat.icon}</span>
                      <span style={{ fontWeight: isSelected ? 700 : 500, color: isSelected ? 'var(--blu)' : 'var(--txt)' }}>{cat.label}</span>
                    </label>
                  );
                })}
              </div>
            </div>

            <Field label="Description" required error={errors.description?.message} style={{ gridColumn: 'span 2' }}>
              <textarea
                {...register('description', { required: 'Required' })}
                placeholder="Describe the issue in detail…"
                rows={3}
                style={{ ...inputStyle(errors.description), resize: 'vertical' }}
              />
            </Field>

            {/* Geo-tagged photo */}
            <div style={{ gridColumn: 'span 2' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--txt2)' }}>Photo Evidence (with geo-tag)</span>
                <Btn size="xs" variant="ghost" onClick={captureLocation} disabled={locating}>
                  {locating ? '⟳ Locating…' : '📍 Capture Location'}
                </Btn>
                <Btn size="xs" variant="ghost" onClick={() => fileRef.current?.click()}>📷 Attach Photo</Btn>
              </div>
              <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handlePhoto} />
              <input type="hidden" {...register('latitude')} />
              <input type="hidden" {...register('longitude')} />
              <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                {geoCoords && (
                  <div style={{ padding: '6px 10px', background: '#f0fdf4', borderRadius: 8, border: '1px solid #bbf7d0', fontSize: 11, color: '#166534', flexShrink: 0 }}>
                    📍 {geoCoords.lat}, {geoCoords.lng}
                  </div>
                )}
                {photoPreview && (
                  <img src={photoPreview} alt="preview" style={{ height: 64, borderRadius: 8, objectFit: 'cover', border: '1px solid var(--bdr)' }} />
                )}
                {!geoCoords && !photoPreview && (
                  <span style={{ fontSize: 11, color: 'var(--txt3)', fontStyle: 'italic' }}>
                    Capture location and attach a photo for stronger evidence
                  </span>
                )}
              </div>
            </div>
          </div>
        </Modal>
      )}
    </PageWrap>
  );
}
