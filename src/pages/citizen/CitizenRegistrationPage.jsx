// src/pages/citizen/CitizenRegistrationPage.jsx
import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { syncManager } from '../../sync/syncManager';
import { PageWrap, PageHead, Card, DataTable, Badge, Btn, Modal, Field, inputStyle } from '../../components/ui';
import toast from 'react-hot-toast';

const fmtDate = d => d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

export default function CitizenRegistrationPage() {
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [filters, setFilters]   = useState({ search: '', page: 1 });
  const [selectedDistrict, setSelectedDistrict] = useState('');
  const [selectedMandal, setSelectedMandal]     = useState('');

  const { data: districts = [] } = useQuery({
    queryKey: ['districts'],
    queryFn: async () => { const { data } = await syncManager.api.get('/districts'); return data; },
    staleTime: Infinity,
  });

  const { data: mandals = [] } = useQuery({
    queryKey: ['mandals', selectedDistrict],
    queryFn: async () => {
      const { data } = await syncManager.api.get(`/mandals?district_id=${selectedDistrict}`);
      return data;
    },
    enabled: !!selectedDistrict,
    staleTime: 60_000,
  });

  const { data: villages = [] } = useQuery({
    queryKey: ['towns', selectedMandal],
    queryFn: async () => {
      const { data } = await syncManager.api.get(`/towns?mandal_id=${selectedMandal}`);
      return data;
    },
    enabled: !!selectedMandal,
    staleTime: 60_000,
  });

  const { data, isLoading } = useQuery({
    queryKey: ['citizen-registrations', filters],
    queryFn: async () => {
      const params = new URLSearchParams({ limit: 25, page: filters.page, search: filters.search });
      const { data } = await syncManager.api.get(`/citizens?${params}`);
      return data;
    },
    staleTime: 30_000,
  });

  const createMutation = useMutation({
    mutationFn: async (fd) => {
      const { data } = await syncManager.api.post('/citizens', fd);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['citizen-registrations'] });
      setShowForm(false);
      toast.success('Farmer registered successfully');
    },
    onError: err => toast.error(err.response?.data?.error || 'Registration failed'),
  });

  const { register, handleSubmit, setValue, watch, formState: { errors }, reset } = useForm({
    defaultValues: {
      name: '', mobile: '', aadhaar: '', village_id: '',
      land_extent_acres: '', land_possession: 'Owner',
    },
  });

  const watchVillage = watch('village_id');
  const villageDistrict = watchVillage
    ? districts.find(d => mandals.some(m => villages.find(v => v.id === +watchVillage && v.mandal_id === m.id && m.district_id === d.id)))
    : null;

  const records = data?.citizens || data || [];
  const total   = Array.isArray(data) ? data.length : (data?.total || 0);

  const openForm = () => { reset(); setSelectedDistrict(''); setSelectedMandal(''); setShowForm(true); };

  return (
    <PageWrap>
      <PageHead
        title="Farmer Registration"
        subtitle="Citizen / Farmer self-registration portal"
        crumbs={['Home', 'Citizens', 'Registration']}
        actions={<Btn variant="primary" size="sm" onClick={openForm}>+ Register Farmer</Btn>}
      />

      <Card>
        <div style={{ padding: '10px 14px', borderBottom: '1px solid var(--bdr)', display: 'flex', gap: 10 }}>
          <input
            placeholder="Search by name or mobile…"
            value={filters.search}
            onChange={e => setFilters(f => ({ ...f, search: e.target.value, page: 1 }))}
            style={{ ...inputStyle(), maxWidth: 280 }}
          />
        </div>
        <DataTable
          loading={isLoading}
          data={records}
          emptyMsg="No farmers registered yet"
          columns={[
            { header: 'Name',       key: 'name',          render: v => <strong style={{ fontSize: 12 }}>{v}</strong> },
            { header: 'Mobile',     key: 'mobile',        render: v => <span style={{ fontFamily: 'var(--fm)', fontSize: 12 }}>{v}</span> },
            { header: 'Village',    key: 'village_name',  render: v => <span style={{ fontSize: 11 }}>{v || '—'}</span> },
            { header: 'Mandal',     key: 'mandal_name',   render: v => <span style={{ fontSize: 11 }}>{v || '—'}</span> },
            { header: 'District',   key: 'district_name', render: v => <Badge color="blue">{v || '—'}</Badge> },
            { header: 'Land (ac)',  key: 'land_extent_acres', render: v => <span style={{ fontFamily: 'var(--fm)' }}>{v || '—'}</span> },
            { header: 'Possession', key: 'land_possession', render: v => <Badge color={v === 'Owner' ? 'green' : 'amber'}>{v || '—'}</Badge> },
            { header: 'Registered', key: 'created_at',   render: v => <span style={{ fontSize: 10, color: 'var(--txt3)' }}>{fmtDate(v)}</span> },
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
          title="Register Farmer"
          sub="New citizen / farmer registration"
          onClose={() => setShowForm(false)}
          footer={
            <>
              <Btn variant="ghost" onClick={() => setShowForm(false)}>Cancel</Btn>
              <Btn variant="primary" onClick={handleSubmit(d => createMutation.mutate(d))} disabled={createMutation.isPending}>
                {createMutation.isPending ? 'Saving…' : '✓ Register'}
              </Btn>
            </>
          }
        >
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <Field label="Full Name" required error={errors.name?.message}>
              <input {...register('name', { required: 'Required' })} placeholder="Farmer full name" style={inputStyle(errors.name)} />
            </Field>
            <Field label="Mobile Number" required error={errors.mobile?.message}>
              <input {...register('mobile', { required: 'Required', pattern: { value: /^[6-9]\d{9}$/, message: '10-digit mobile' } })}
                placeholder="10-digit mobile" maxLength={10} style={inputStyle(errors.mobile)} />
            </Field>
            <Field label="Aadhaar Number" error={errors.aadhaar?.message}>
              <input {...register('aadhaar', { pattern: { value: /^\d{12}$/, message: '12 digits' } })}
                placeholder="12-digit Aadhaar" maxLength={12} style={inputStyle(errors.aadhaar)} />
            </Field>
            <Field label="Land Possession" required>
              <select {...register('land_possession')} style={inputStyle()}>
                <option value="Owner">Owner</option>
                <option value="Tenant">Tenant</option>
              </select>
            </Field>
            <Field label="Land Extent (Acres)">
              <input type="number" step="0.1" min="0" {...register('land_extent_acres')} placeholder="e.g. 2.5" style={inputStyle()} />
            </Field>

            {/* Cascading location */}
            <Field label="District" required error={errors.district_id?.message}>
              <select
                value={selectedDistrict}
                onChange={e => { setSelectedDistrict(e.target.value); setSelectedMandal(''); setValue('village_id', ''); }}
                style={inputStyle()}
              >
                <option value="">Select district…</option>
                {districts.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
            </Field>
            <Field label="Mandal" required>
              <select
                value={selectedMandal}
                onChange={e => { setSelectedMandal(e.target.value); setValue('village_id', ''); }}
                disabled={!selectedDistrict}
                style={inputStyle()}
              >
                <option value="">Select mandal…</option>
                {mandals.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
              </select>
            </Field>
            <Field label="Village / Town" required error={errors.village_id?.message} style={{ gridColumn: 'span 2' }}>
              <select {...register('village_id', { required: 'Required' })} disabled={!selectedMandal} style={inputStyle(errors.village_id)}>
                <option value="">Select village…</option>
                {villages.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
              </select>
            </Field>
          </div>
        </Modal>
      )}
    </PageWrap>
  );
}
