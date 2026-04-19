// src/pages/drugs/AllocationsPage.jsx
import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { syncManager } from '../../sync/syncManager';
import { useSync } from '../../store/SyncContext';
import {
  PageWrap, PageHead, KPIGrid, KPICard, Card, DataTable, Badge, Btn,
  Modal, Field, inputStyle,
} from '../../components/ui';
import toast from 'react-hot-toast';

const fmtINR  = n => `₹${Number(n || 0).toLocaleString('en-IN')}`;
const fmtDate = d => d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';
const fmtTime = d => d ? new Date(d).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true }) : '';

export default function AllocationsPage() {
  const { isOnline } = useSync();
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [fyFilter, setFyFilter] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['allocations', fyFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (fyFilter) params.set('fy_id', fyFilter);
      const { data } = await syncManager.api.get(`/allocations?${params}`);
      return data;
    },
    enabled: isOnline,
    staleTime: 60_000,
  });

  const { data: drugs } = useQuery({
    queryKey: ['drugs-select'],
    queryFn: async () => { const { data } = await syncManager.api.get('/drugs?limit=100'); return data.drugs || []; },
    enabled: isOnline, staleTime: Infinity,
  });

  const { data: districts } = useQuery({
    queryKey: ['districts'],
    queryFn: async () => { const { data } = await syncManager.api.get('/districts'); return data; },
    enabled: isOnline, staleTime: Infinity,
  });

  const { data: schemes } = useQuery({
    queryKey: ['schemes'],
    queryFn: async () => { const { data } = await syncManager.api.get('/settings/schemes'); return data; },
    enabled: isOnline, staleTime: Infinity,
  });

  const { data: fyData } = useQuery({
    queryKey: ['financial-years'],
    queryFn: async () => { const { data } = await syncManager.api.get('/settings/financial-years'); return data; },
    enabled: isOnline, staleTime: Infinity,
  });

  const createMutation = useMutation({
    mutationFn: async (fd) => { const { data } = await syncManager.api.post('/allocations', fd); return data; },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['allocations'] }); setShowForm(false); toast.success('Allocation recorded'); },
    onError: err => toast.error(err.response?.data?.error || 'Save failed'),
  });

  const { register, handleSubmit, formState: { errors } } = useForm();

  const alloc  = data?.allocations || [];
  const totAlloc   = alloc.reduce((s, a) => s + (a.allocated_qty || 0), 0);
  const totConsumed = alloc.reduce((s, a) => s + (a.consumed_qty || 0), 0);
  const totValue    = alloc.reduce((s, a) => s + (a.consumed_qty || 0) * (a.unit_price || 0), 0);

  return (
    <PageWrap>
      <PageHead
        title="Drug Allocations"
        subtitle={`District-wise drug allocation management · ${alloc.length} records`}
        crumbs={['Home', 'Drugs', 'Allocations']}
        actions={
          <>
            <Btn variant="ghost"   size="sm" onClick={() => toast('Exporting…')}>⬇ Export</Btn>
            <Btn variant="primary" size="sm" onClick={() => setShowForm(true)}>+ New Allocation</Btn>
          </>
        }
      />

      <KPIGrid>
        <KPICard label="Total Allocated"  value={totAlloc.toLocaleString()}   sub="units" color="blue"  />
        <KPICard label="Total Consumed"   value={totConsumed.toLocaleString()} sub={totAlloc ? `${Math.round(totConsumed/totAlloc*100)}% utilised` : ''} color="green" />
        <KPICard label="Balance"          value={(totAlloc - totConsumed).toLocaleString()} color="amber" />
        <KPICard label="Total Value"      value={fmtINR(Math.round(totValue))} color="gold" />
      </KPIGrid>

      <div style={{ display: 'flex', gap: 10, marginBottom: 14 }}>
        <select value={fyFilter} onChange={e => setFyFilter(e.target.value)}
          style={{ padding: '7px 10px', border: '1px solid var(--bdr2)', borderRadius: 6, fontSize: 12, background: 'var(--bg)' }}>
          <option value="">All Financial Years</option>
          {(fyData || []).map(f => <option key={f.id} value={f.id}>{f.label}</option>)}
        </select>
      </div>

      <Card>
        <DataTable
          loading={isLoading || !isOnline}
          data={alloc}
          emptyMsg={isOnline ? 'No allocations recorded' : 'Go online to view allocations'}
          columns={[
            {
              header: 'Drug', key: 'drug_name',
              render: (v, r) => <div><strong style={{ fontSize: 12 }}>{v}</strong><div style={{ fontSize: 10, color: 'var(--txt3)' }}>{r.unit}</div></div>,
            },
            { header: 'District', key: 'district_name', render: v => <span style={{ fontSize: 11 }}>{v}</span> },
            { header: 'Scheme',   key: 'scheme_name',   render: v => <Badge>{v || '—'}</Badge> },
            { header: 'FY',       key: 'fy_label',      render: v => <span style={{ fontSize: 11, fontFamily: 'var(--fm)' }}>{v || '—'}</span> },
            { header: 'Allocated', key: 'allocated_qty', render: v => <span style={{ fontFamily: 'var(--fm)', color: 'var(--blu)', fontWeight: 700 }}>{v}</span> },
            { header: 'Consumed',  key: 'consumed_qty',  render: v => <span style={{ fontFamily: 'var(--fm)', color: 'var(--grn)', fontWeight: 700 }}>{v}</span> },
            {
              header: 'Utilisation', key: 'allocated_qty',
              render: (v, r) => {
                const pct = v ? Math.round((r.consumed_qty || 0) / v * 100) : 0;
                return (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ width: 50, height: 5, background: 'var(--bg3)', borderRadius: 3, overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${pct}%`, background: pct > 90 ? 'var(--red)' : pct > 70 ? 'var(--amb)' : 'var(--grn)', borderRadius: 3 }} />
                    </div>
                    <span style={{ fontSize: 11, fontFamily: 'var(--fm)' }}>{pct}%</span>
                  </div>
                );
              },
            },
            {
              header: 'Last Modified', key: 'updated_at',
              render: v => (
                <div>
                  <div style={{ fontSize: 11, color: 'var(--txt2)', fontWeight: 500 }}>{fmtDate(v)}</div>
                  <div style={{ fontSize: 10, color: 'var(--txt3)' }}>{fmtTime(v)}</div>
                </div>
              ),
            },
          ]}
        />
      </Card>

      {showForm && (
        <Modal title="New Drug Allocation" sub="Allocate drugs to a district" onClose={() => setShowForm(false)}
          footer={
            <>
              <Btn variant="ghost" onClick={() => setShowForm(false)}>Cancel</Btn>
              <Btn variant="primary" onClick={handleSubmit(d => createMutation.mutate(d))} disabled={createMutation.isPending}>
                {createMutation.isPending ? 'Saving…' : '✓ Allocate'}
              </Btn>
            </>
          }
        >
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <Field label="Drug" required error={errors.drug_id?.message}>
              <select {...register('drug_id', { required: 'Required' })} style={inputStyle(errors.drug_id)}>
                <option value="">Select drug…</option>
                {(drugs || []).map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
            </Field>
            <Field label="District" required error={errors.district_id?.message}>
              <select {...register('district_id', { required: 'Required' })} style={inputStyle(errors.district_id)}>
                <option value="">Select district…</option>
                {(districts || []).map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
            </Field>
            <Field label="Quantity" required error={errors.allocated_qty?.message}>
              <input type="number" min={1} {...register('allocated_qty', { required: 'Required', min: 1 })} style={inputStyle(errors.allocated_qty)} />
            </Field>
            <Field label="Scheme">
              <select {...register('scheme_id')} style={inputStyle()}>
                <option value="">Select scheme…</option>
                {(schemes || []).map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </Field>
            <Field label="Financial Year">
              <select {...register('financial_year_id')} style={inputStyle()}>
                <option value="">Select FY…</option>
                {(fyData || []).map(f => <option key={f.id} value={f.id}>{f.label}</option>)}
              </select>
            </Field>
            <Field label="Allocation Value (₹)">
              <input type="number" step="0.01" {...register('allocation_value')} placeholder="0.00" style={inputStyle()} />
            </Field>
            <div style={{ gridColumn: '1/-1' }}>
              <Field label="Remarks">
                <input {...register('remarks')} placeholder="Any conditions or notes…" style={inputStyle()} />
              </Field>
            </div>
          </div>
        </Modal>
      )}
    </PageWrap>
  );
}