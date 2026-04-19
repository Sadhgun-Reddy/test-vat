// src/pages/fodder/FodderPage.jsx
import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { syncManager } from '../../sync/syncManager';
import { upsertAndEnqueue } from '../../sync/offlineStore';
import { useSync } from '../../store/SyncContext';
import { useAuth } from '../../store/AuthContext';
import {
  PageWrap, PageHead, KPIGrid, KPICard, Card, DataTable,
  Badge, Btn, Modal, Field, inputStyle,
} from '../../components/ui';
import toast from 'react-hot-toast';

const fmtDate = d => d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';
const fmtINR  = n => n != null ? `₹${Number(n).toLocaleString('en-IN')}` : '—';

const CASTE_OPTIONS = ['General', 'SC', 'ST', 'OBC', 'EWS', 'Other'];

const DEFAULT_FORM = {
  district_id: '',
  place_of_working_id: '',
  date_of_distribution: '',
  fodder_item_id: '',
  unit_size_id: '',
  price_per_unit: '',
  beneficiary_contribution: '',
  subsidy: '',
  total_cost: '',
  owner_name: '',
  owner_mobile: '',
  caste: '',
  owner_aadhar: '',
  town_id: '',
  notes: '',
};

function sectionTitle(label) {
  return (
    <div style={{
      fontSize: 10, fontWeight: 700, color: 'var(--blu)', textTransform: 'uppercase', letterSpacing: '.06em',
      marginBottom: 10, marginTop: 4, display: 'flex', alignItems: 'center', gap: 6,
      borderTop: '1px solid var(--bdr)', paddingTop: 14,
    }}>
      <span style={{ width: 3, height: 14, background: 'var(--blu)', borderRadius: 2 }} />
      {label}
    </div>
  );
}

export default function FodderPage() {
  const { isOnline, refreshPending } = useSync();
  const { user } = useAuth();
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [districtId, setDistId] = useState('');
  const [mandalId, setMandalId] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['fodder', districtId],
    queryFn: async () => {
      if (isOnline) {
        const params = new URLSearchParams({ limit: 50 });
        if (districtId) params.set('district_id', districtId);
        const { data } = await syncManager.api.get(`/fodder?${params}`);
        return data;
      }
      return { fodder: [], total: 0 };
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

  const { data: fodderItems } = useQuery({
    queryKey: ['fodder-items'],
    queryFn: async () => { const { data } = await syncManager.api.get('/settings/fodder-items'); return data; },
    enabled: isOnline, staleTime: Infinity,
  });

  const { data: unitSizes } = useQuery({
    queryKey: ['unit-sizes'],
    queryFn: async () => { const { data } = await syncManager.api.get('/settings/unit-sizes'); return data; },
    enabled: isOnline, staleTime: Infinity,
  });

  const { register, handleSubmit, reset, setValue, watch, formState: { errors } } = useForm({
    defaultValues: { ...DEFAULT_FORM, date_of_distribution: new Date().toISOString().slice(0, 10) },
  });

  const watchDistrict = watch('district_id');
  const distReg = register('district_id', { required: !isOnline ? 'Required' : false });

  const { data: mandals = [] } = useQuery({
    queryKey: ['mandals', watchDistrict],
    queryFn: async () => {
      const { data } = await syncManager.api.get(`/districts/${watchDistrict}/mandals`);
      return data;
    },
    enabled: !!watchDistrict && isOnline,
  });

  const { data: towns = [] } = useQuery({
    queryKey: ['towns', mandalId],
    queryFn: async () => {
      const { data } = await syncManager.api.get(`/districts/mandals/${mandalId}/towns`);
      return data;
    },
    enabled: !!mandalId && isOnline,
  });

  const watchPlace = watch('place_of_working_id');

  useEffect(() => {
    setMandalId('');
    setValue('town_id', '');
  }, [watchDistrict, setValue]);

  useEffect(() => {
    if (!watchPlace || !(places || []).length) return;
    const p = places.find((x) => x.id === watchPlace);
    if (p?.district_id) setValue('district_id', p.district_id);
  }, [watchPlace, places, setValue]);

  const createMutation = useMutation({
    mutationFn: async (fd) => {
      if (isOnline) { const { data } = await syncManager.api.post('/fodder', fd); return data; }
      return upsertAndEnqueue('fodder_records', fd, 'INSERT');
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['fodder'] });
      setShowForm(false);
      setMandalId('');
      toast.success('Fodder entry saved');
      refreshPending();
    },
    onError: err => toast.error(err.response?.data?.error || err.response?.data?.errors?.[0]?.msg || 'Save failed'),
  });

  const openForm = () => {
    reset({
      ...DEFAULT_FORM,
      date_of_distribution: new Date().toISOString().slice(0, 10),
    });
    setMandalId('');
    setShowForm(true);
  };

  const records = data?.fodder || [];
  const total   = data?.total  || 0;
  const totalQty = records.reduce((s, r) => s + parseFloat(r.quantity || 0), 0);
  const totalCost = records.reduce((s, r) => s + Number(r.total_cost || 0), 0);

  return (
    <PageWrap>
      <PageHead
        title="Fodder Management"
        subtitle="Track fodder distribution across districts"
        crumbs={['Home', 'Fodder']}
        actions={
          <>
            <Btn variant="ghost"   size="sm" onClick={() => toast('Exporting…')}>📤 Export</Btn>
            <Btn variant="primary" size="sm" onClick={openForm}>+ Add Entry</Btn>
          </>
        }
      />

      <KPIGrid>
        <KPICard label="Total Records"    value={total}                   color="green" />
        <KPICard label="Total Quantity"   value={`${totalQty.toFixed(0)} kg`}      color="blue"  />
        <KPICard label="Total Cost"       value={fmtINR(totalCost)} color="purple" />
        <KPICard label="Districts Covered" value={new Set(records.map(r => r.district_name).filter(Boolean)).size} color="teal" />
      </KPIGrid>

      <div style={{ display: 'flex', gap: 10, marginBottom: 14 }}>
        <select value={districtId} onChange={e => setDistId(e.target.value)}
          style={{ padding: '7px 10px', border: '1px solid var(--bdr2)', borderRadius: 6, fontSize: 12, background: 'var(--bg)' }}>
          <option value="">All Districts</option>
          {(districts || []).map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
        </select>
      </div>

      <Card>
        <DataTable
          loading={isLoading}
          data={records}
          emptyMsg={isOnline ? 'No fodder records' : 'Go online to view fodder data'}
          columns={[
            { header: 'District',     key: 'district_name',    render: v => <strong style={{ fontSize: 12 }}>{v || '—'}</strong> },
            { header: 'Place',        key: 'place_of_working_name', render: v => <span style={{ fontSize: 11, color: 'var(--txt3)' }}>{v || '—'}</span> },
            { header: 'Fodder Item',  key: 'fodder_item_name', render: v => <Badge>{v || '—'}</Badge> },
            {
              header: 'Qty',
              key: 'quantity',
              render: (v, r) => <span style={{ fontFamily: 'var(--fm)', fontSize: 11 }}>{v} {r.unit_size_name || 'kg'}</span>,
            },
            { header: 'Total Cost',   key: 'total_cost',       render: v => <span style={{ fontFamily: 'var(--fm)', color: 'var(--gld)' }}>{fmtINR(v)}</span> },
            { header: 'Owner',        key: 'owner_name',       render: v => <span style={{ fontSize: 11 }}>{v || '—'}</span> },
            { header: 'Village',      key: 'village_name',     render: v => <span style={{ fontSize: 11, color: 'var(--txt3)' }}>{v || '—'}</span> },
            { header: 'Date',         key: 'date_of_distribution', render: v => <span style={{ fontSize: 11, color: 'var(--txt3)' }}>{fmtDate(v)}</span> },
            {
              header: 'Sync', key: 'sync_status',
              render: v => <Badge color={v === 'synced' ? 'green' : 'amber'}>{v === 'synced' ? '✓' : '⟳'}</Badge>,
            },
          ]}
        />
      </Card>

      {showForm && (
        <Modal
          title="Add Fodder Entry"
          sub="Fodder distribution record"
          size="lg"
          onClose={() => { setShowForm(false); setMandalId(''); }}
          footer={
            <>
              <Btn variant="ghost" onClick={() => { setShowForm(false); setMandalId(''); }}>✕ Cancel</Btn>
              <Btn variant="primary" onClick={handleSubmit(d => createMutation.mutate(d))} disabled={createMutation.isPending}>
                {createMutation.isPending ? 'Saving…' : '✓ Save'}
              </Btn>
            </>
          }
        >
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 8 }}>
            <div>
              <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--txt3)', marginBottom: 4 }}>User Name</div>
              <div style={{
                display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px',
                border: '1px solid var(--bdr2)', borderRadius: 8, background: 'var(--bg1)', fontSize: 12,
              }}>
                <span style={{ fontSize: 16 }}>👤</span>
                <strong>{user?.name || 'User'}</strong>
              </div>
            </div>
            <Field label="Date" required error={errors.date_of_distribution?.message}>
              <input {...register('date_of_distribution', { required: 'Required' })} type="date" style={inputStyle(errors.date_of_distribution)} />
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
            <input type="hidden" {...distReg} />
          ) : (
            <div style={{ marginBottom: 12 }}>
              <Field label="District" required error={errors.district_id?.message}>
                <select
                  {...distReg}
                  onChange={(e) => {
                    distReg.onChange(e);
                    setMandalId('');
                    setValue('town_id', '');
                  }}
                  style={inputStyle(errors.district_id)}
                >
                  <option value="">Select district…</option>
                  {(districts || []).map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                </select>
              </Field>
            </div>
          )}

          {sectionTitle('Fodder Details')}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <Field label="Type of Fodder" required error={errors.fodder_item_id?.message}>
              <select {...register('fodder_item_id', { required: 'Required' })} style={inputStyle(errors.fodder_item_id)}>
                <option value="">Select Fodder Type</option>
                {(fodderItems || []).map((f) => {
                  const label = (f.name && String(f.name).trim())
                    ? f.name
                    : [f.seed_type_name, f.unit_size_name].filter(Boolean).join(' — ') || 'Fodder item';
                  return <option key={f.id} value={f.id}>{label}</option>;
                })}
              </select>
            </Field>
            <Field label="Unit Size (KG)">
              <select {...register('unit_size_id')} style={inputStyle()}>
                <option value="">Select unit…</option>
                {(unitSizes || []).map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
              </select>
            </Field>
            <Field label="Price / Unit (₹)">
              <input type="number" step="0.01" {...register('price_per_unit')} placeholder="Price / Unit (Rs)" style={inputStyle()} />
            </Field>
            <Field label="Beneficiary Contribution">
              <input type="number" step="0.01" {...register('beneficiary_contribution')} placeholder="Beneficiary Contribution" style={inputStyle()} />
            </Field>
            <Field label="Subsidy">
              <input type="number" step="0.01" {...register('subsidy')} placeholder="Subsidy" style={inputStyle()} />
            </Field>
            <Field label="Total Cost">
              <input type="number" step="0.01" {...register('total_cost')} placeholder="Total Cost" style={inputStyle()} />
            </Field>
          </div>

          {sectionTitle('Owner Details')}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <Field label="Owner Name">
              <input {...register('owner_name')} placeholder="Enter owner's full name" style={inputStyle()} />
            </Field>
            <Field label="Mobile No">
              <input type="tel" {...register('owner_mobile')} placeholder="Enter Mobile No" style={inputStyle()} />
            </Field>
            <Field label="Caste">
              <select {...register('caste')} style={inputStyle()}>
                <option value="">Select Caste</option>
                {CASTE_OPTIONS.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </Field>
            <Field label="Aadhar Card Number">
              <input {...register('owner_aadhar')} placeholder="Enter 12-digit Aadhar" maxLength={12} style={inputStyle()} />
            </Field>
            <Field label="Tehsil / Mandal">
              <select
                value={mandalId}
                onChange={(e) => { setMandalId(e.target.value); setValue('town_id', ''); }}
                style={inputStyle()}
                disabled={!watchDistrict}
              >
                <option value="">{watchDistrict ? 'Select mandal…' : 'Select district first'}</option>
                {mandals.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
              </select>
            </Field>
            <Field label="Village">
              <select {...register('town_id')} style={inputStyle()} disabled={!mandalId}>
                <option value="">{mandalId ? 'Search and select village…' : 'Select mandal first'}</option>
                {towns.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </Field>
          </div>

          {!isOnline && (
            <p style={{ fontSize: 11, color: 'var(--txt3)', marginTop: 8 }}>Mandal and village lists need an online connection.</p>
          )}

          <div style={{ marginTop: 12 }}>
            <Field label="Notes">
              <input {...register('notes')} placeholder="Any observations…" style={inputStyle()} />
            </Field>
          </div>
        </Modal>
      )}
    </PageWrap>
  );
}
