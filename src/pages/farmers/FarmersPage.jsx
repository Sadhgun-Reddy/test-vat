// src/pages/farmers/FarmersPage.jsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { syncManager } from '../../sync/syncManager';
import { upsertAndEnqueue } from '../../sync/offlineStore';
import { useSync } from '../../store/SyncContext';
import {
  PageWrap, PageHead, KPIGrid, KPICard, Card, DataTable,
  Badge, Btn, Modal, Field, inputStyle,
} from '../../components/ui';
import toast from 'react-hot-toast';

const FARMER_DEFAULTS = {
  state: 'Telangana',
  name: '',
  phone: '',
  aadhar_no: '',
  district_id: '',
  mandal_id: '',
  town_id: '',
  address: '',
  owner_id: '',
  org: '',
  department: '',
  father_or_husband_name: '',
  date_of_birth: '',
  gender: '',
  category: '',
};

const STATE_OPTIONS = [
  'Telangana', 'Andhra Pradesh', 'Karnataka', 'Maharashtra', 'Tamil Nadu', 'Kerala', 'Other',
];
const CATEGORY_OPTIONS = ['General', 'SC', 'ST', 'OBC', 'EWS', 'Other'];

export default function FarmersPage() {
  const navigate = useNavigate();
  const { isOnline, refreshPending } = useSync();
  const qc = useQueryClient();
  const [search, setSearch]   = useState('');
  const [districtId, setDistId] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editFarmer, setEditFarmer] = useState(null);
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ['farmers', search, districtId, page],
    queryFn: async () => {
      if (isOnline) {
        const params = new URLSearchParams({ page, limit: 25 });
        if (search)     params.set('search', search);
        if (districtId) params.set('district_id', districtId);
        const { data } = await syncManager.api.get(`/farmers?${params}`);
        return data;
      }
      return { farmers: [], total: 0 };
    },
    staleTime: 30_000,
  });

  const { data: districts } = useQuery({
    queryKey: ['districts'],
    queryFn: async () => { const { data } = await syncManager.api.get('/districts'); return data; },
    enabled: isOnline, staleTime: Infinity,
  });

  const { register, handleSubmit, reset, setValue, watch, formState: { errors } } = useForm({ defaultValues: FARMER_DEFAULTS });
  const watchDistrict = watch('district_id');
  const watchMandal = watch('mandal_id');

  const { data: mandals = [] } = useQuery({
    queryKey: ['mandals', watchDistrict],
    queryFn: async () => {
      const { data } = await syncManager.api.get(`/districts/${watchDistrict}/mandals`);
      return data;
    },
    enabled: !!watchDistrict && isOnline,
  });

  const { data: towns = [] } = useQuery({
    queryKey: ['towns', watchMandal],
    queryFn: async () => {
      const { data } = await syncManager.api.get(`/districts/mandals/${watchMandal}/towns`);
      return data;
    },
    enabled: !!watchMandal && isOnline,
  });

  const saveMutation = useMutation({
    mutationFn: async (fd) => {
      if (editFarmer?.id) {
        const { data } = await syncManager.api.put(`/farmers/${editFarmer.id}`, fd);
        return data;
      }
      if (isOnline) { const { data } = await syncManager.api.post('/farmers', fd); return data; }
      return upsertAndEnqueue('farmers', fd, 'INSERT');
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['farmers'] });
      setShowForm(false);
      setEditFarmer(null);
      toast.success(editFarmer ? 'Farmer updated' : 'Farmer registered');
      refreshPending();
    },
    onError: err => toast.error(err.response?.data?.error || 'Save failed'),
  });

  const distReg = register('district_id');
  const mandalReg = register('mandal_id');

  const openAdd = () => {
    reset(FARMER_DEFAULTS);
    setEditFarmer(null);
    setShowForm(true);
  };
  const openEdit = async (f) => {
    let full = f;
    if (f?.id && isOnline) {
      try {
        const { data } = await syncManager.api.get(`/farmers/${f.id}`);
        full = data;
      } catch {
        toast.error('Could not load farmer details');
        return;
      }
    }
    setEditFarmer(full);
    reset({
      ...FARMER_DEFAULTS,
      ...full,
      state: full.state || 'Telangana',
      district_id: full.district_id || '',
      mandal_id: full.mandal_id || '',
      town_id: full.town_id || '',
      gender: full.gender || '',
      category: full.category || '',
      date_of_birth: full.date_of_birth ? String(full.date_of_birth).slice(0, 10) : '',
    });
    setShowForm(true);
  };

  const farmers = data?.farmers || [];
  const total   = data?.total   || 0;
  const aadharPresent = farmers.filter(f => f.aadhar).length;

  return (
    <PageWrap>
      <PageHead
        title="Farmers Registry"
        subtitle={`Farmer registration and contact management · ${total} registered`}
        crumbs={['Home', 'Farmers']}
        actions={
          <>
            <Btn variant="ghost"   size="sm" onClick={() => navigate('/farmers/upload')}>⬆ Bulk Upload</Btn>
            <Btn variant="primary" size="sm" onClick={openAdd}>+ Add Farmer</Btn>
          </>
        }
      />

      <KPIGrid>
        <KPICard label="Total Farmers"   value={total}          color="blue"   />
        <KPICard label="Aadhar Present"  value={aadharPresent}  color="green"  sub={`of ${farmers.length} shown`} />
        <KPICard label="Aadhar Missing"  value={farmers.length - aadharPresent} color="amber" />
        <KPICard label="Districts"       value={new Set(farmers.map(f => f.district).filter(Boolean)).size} color="purple" />
      </KPIGrid>

      <div style={{ display: 'flex', gap: 10, marginBottom: 14, flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
          <span style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--txt4)' }}>🔍</span>
          <input value={search} onChange={e => { setSearch(e.target.value); setPage(1); }}
            placeholder="Search name, phone, Aadhar…"
            style={{ ...inputStyle(), paddingLeft: 32 }} />
        </div>
        <select value={districtId} onChange={e => { setDistId(e.target.value); setPage(1); }}
          style={{ padding: '7px 10px', border: '1px solid var(--bdr2)', borderRadius: 6, fontSize: 12, background: 'var(--bg)' }}>
          <option value="">All Districts</option>
          {(districts || []).map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
        </select>
        <span style={{ fontSize: 11, color: 'var(--txt3)', alignSelf: 'center' }}>{total} records</span>
      </div>

      <Card>
        <DataTable
          loading={isLoading}
          data={farmers}
          emptyMsg={isOnline ? 'No farmers found' : 'Go online to view farmers'}
          columns={[
            {
              header: 'Name', key: 'name',
              render: v => <strong style={{ fontSize: 12 }}>{v}</strong>,
            },
            {
              header: 'Phone', key: 'phone',
              render: v => <span style={{ fontFamily: 'var(--fm)', fontSize: 12 }}>{v}</span>,
            },
            {
              header: 'Aadhar', key: 'aadhar',
              render: v => <Badge color={v ? 'green' : 'red'}>{v ? '✓ Present' : '✕ Missing'}</Badge>,
            },
            { header: 'District', key: 'district', render: v => <span style={{ fontSize: 11 }}>{v || '—'}</span> },
            {
              header: 'Actions', key: 'id',
              render: (_, row) => (
                <div style={{ display: 'flex', gap: 5 }}>
                  <Btn variant="ghost" size="xs" onClick={() => openEdit(row)}>✎ Edit</Btn>
                </div>
              ),
            },
          ]}
        />
        {total > 25 && (
          <div style={{ padding: '8px 14px', borderTop: '1px solid var(--bdr)', display: 'flex', justifyContent: 'space-between', background: 'var(--bg1)' }}>
            <span style={{ fontSize: 11, color: 'var(--txt3)' }}>Showing {farmers.length} of {total}</span>
            <div style={{ display: 'flex', gap: 6 }}>
              <Btn size="xs" variant="ghost" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>‹ Prev</Btn>
              <Btn size="xs" variant="ghost" disabled={page * 25 >= total} onClick={() => setPage(p => p + 1)}>Next ›</Btn>
            </div>
          </div>
        )}
      </Card>

      {showForm && (
        <Modal
          size="lg"
          title={editFarmer ? 'Edit Farmer' : 'Add Farmer'}
          sub="Farmer registration"
          onClose={() => { setShowForm(false); setEditFarmer(null); }}
          footer={
            <>
              <Btn variant="ghost" onClick={() => { setShowForm(false); setEditFarmer(null); }}>Cancel</Btn>
              <Btn variant="primary" onClick={handleSubmit(d => saveMutation.mutate(d))} disabled={saveMutation.isPending}>
                {saveMutation.isPending ? 'Saving…' : '✓ Save'}
              </Btn>
            </>
          }
        >
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <Field label="State">
              <select {...register('state')} style={inputStyle()}>
                {STATE_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </Field>
            <Field label="Owner ID">
              <input {...register('owner_id')} placeholder="External / legacy ID" style={inputStyle()} />
            </Field>
            <Field label="Org">
              <input {...register('org')} placeholder="Organisation" style={inputStyle()} />
            </Field>
            <Field label="Department">
              <input {...register('department')} placeholder="Department" style={inputStyle()} />
            </Field>
            <div style={{ gridColumn: '1 / -1' }}>
              <Field label="Owner Name" required error={errors.name?.message}>
                <input {...register('name', { required: 'Required' })} placeholder="Owner / farmer name" style={inputStyle(errors.name)} />
              </Field>
            </div>
            <Field label="Father / Husband">
              <input {...register('father_or_husband_name')} placeholder="Name" style={inputStyle()} />
            </Field>
            <Field label="DOB">
              <input type="date" {...register('date_of_birth')} style={inputStyle()} />
            </Field>
            <Field label="Gender">
              <select {...register('gender')} style={inputStyle()}>
                <option value="">Select…</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
              </select>
            </Field>
            <Field label="Category">
              <select {...register('category')} style={inputStyle()}>
                <option value="">Select…</option>
                {CATEGORY_OPTIONS.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </Field>
            <Field label="Mobile Number" required error={errors.phone?.message}>
              <input
                type="tel"
                {...register('phone', { required: 'Required', pattern: { value: /^[0-9]{10}$/, message: '10-digit number' } })}
                placeholder="9XXXXXXXXX"
                style={inputStyle(errors.phone)}
              />
            </Field>
            <Field label="Aadhar Number">
              <input {...register('aadhar_no')} placeholder="XXXX XXXX XXXX" style={inputStyle()} />
            </Field>
            <Field label="District">
              <select
                {...distReg}
                onChange={(e) => { distReg.onChange(e); setValue('mandal_id', ''); setValue('town_id', ''); }}
                style={inputStyle()}
              >
                <option value="">Select district…</option>
                {(districts || []).map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
            </Field>
            <Field label="Tehsil / ULB">
              <select
                {...mandalReg}
                onChange={(e) => { mandalReg.onChange(e); setValue('town_id', ''); }}
                style={inputStyle()}
                disabled={!watchDistrict}
              >
                <option value="">{watchDistrict ? 'Select tehsil / mandal…' : 'Choose district first'}</option>
                {mandals.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
              </select>
            </Field>
            <Field label="Village">
              <select {...register('town_id')} style={inputStyle()} disabled={!watchMandal}>
                <option value="">{watchMandal ? 'Select village…' : 'Choose tehsil first'}</option>
                {towns.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </Field>
            <Field label="Address">
              <input {...register('address')} placeholder="Street / landmark" style={inputStyle()} />
            </Field>
            {!isOnline && (
              <div style={{ gridColumn: '1 / -1', fontSize: 11, color: 'var(--txt3)' }}>
                Tehsil and village lists load when online. You can still save district and address offline.
              </div>
            )}
          </div>
        </Modal>
      )}
    </PageWrap>
  );
}