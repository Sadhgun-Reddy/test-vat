// src/pages/drugs/DrugsPage.jsx
import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { syncManager } from '../../sync/syncManager';
import { useSync } from '../../store/SyncContext';
import {
  PageWrap, PageHead, Card, DataTable, Badge, Btn,
  Modal, Field, inputStyle, KPIGrid, KPICard,
} from '../../components/ui';
import toast from 'react-hot-toast';

const CATEGORIES = ['antibiotic', 'antiparasitic', 'vaccine', 'analgesic', 'hormone', 'vitamin', 'other'];
const UNITS       = ['ml', 'tablet', 'vial', 'dose', 'bottle', 'sachet', 'kg', 'g'];

const EMPTY_DRUG_FORM = {
  code: '',
  listed_name: '',
  name: '',
  generic_name: '',
  unit: 'ml',
  unit_price: 0,
  gst_pct: 0,
  specification: '',
  unit_pack: '',
  presentation: '',
  firm_name: '',
  stockist_name: '',
  barcode: '',
  sku: '',
};

const fmtINR   = n => `₹${Number(n || 0).toLocaleString('en-IN')}`;
const fmtDate  = d => d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';
const expiryColor = d => {
  if (!d) return 'dim';
  if (new Date(d) < new Date()) return 'red';
  if (new Date(d) < new Date(Date.now() + 90 * 86400000)) return 'amber';
  return 'green';
};

const PAGE_SIZE = 50;

export default function DrugsPage() {
  const { isOnline } = useSync();
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [catFilter, setCatFilter] = useState('');
  const [page, setPage] = useState(1);
  const [showForm, setShowForm] = useState(false);
  const [editDrug, setEditDrug] = useState(null);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, catFilter]);

  const { data, isLoading } = useQuery({
    queryKey: ['drugs', debouncedSearch, catFilter, page],
    queryFn: async () => {
      const params = new URLSearchParams({ limit: String(PAGE_SIZE), page: String(page) });
      if (debouncedSearch.trim()) params.set('search', debouncedSearch.trim());
      if (catFilter) params.set('category', catFilter);
      const { data } = await syncManager.api.get(`/drugs?${params}`);
      return data;
    },
    staleTime: 60_000,
    enabled: isOnline,
  });

  const createMutation = useMutation({
    mutationFn: async (fd) => {
      if (editDrug) {
        const { data } = await syncManager.api.put(`/drugs/${editDrug.id}`, fd);
        return data;
      }
      const { data } = await syncManager.api.post('/drugs', fd);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['drugs'] });
      setShowForm(false);
      setEditDrug(null);
      toast.success(editDrug ? 'Drug updated' : 'Drug added to formulary');
    },
    onError: err => toast.error(err.response?.data?.error || 'Save failed'),
  });

  const { register, handleSubmit, reset, formState: { errors } } = useForm({
    defaultValues: { ...EMPTY_DRUG_FORM },
  });

  const openAdd = () => {
    reset({ ...EMPTY_DRUG_FORM });
    setEditDrug(null);
    setShowForm(true);
  };
  const openEdit = (d) => {
    reset({
      ...EMPTY_DRUG_FORM,
      ...d,
      unit_price: d.unit_price ?? 0,
      gst_pct: d.gst_pct ?? 0,
    });
    setEditDrug(d);
    setShowForm(true);
  };

  const drugs = data?.drugs || [];
  const total = data?.total ?? 0;
  const stats = data?.stats;
  const lowStock = stats
    ? stats.low_stock
    : drugs.filter(d => d.current_stock != null && d.current_stock < d.min_stock).length;
  const expiringSoon = stats
    ? stats.expiring_soon
    : drugs.filter(d => d.expiry_date && new Date(d.expiry_date) < new Date(Date.now() + 90 * 86400000)).length;
  const vaccines = stats ? stats.vaccines : drugs.filter(d => d.category === 'vaccine').length;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <PageWrap>
      <PageHead
        title="Drug Formulary"
        subtitle={`Master drug list · Stock tracking · ${total} drugs`}
        crumbs={['Home', 'Drugs', 'Formulary']}
        actions={<Btn variant="primary" size="sm" onClick={openAdd}>+ Add Drug</Btn>}
      />

      <KPIGrid>
        <KPICard label="Total Drugs"    value={total}  color="blue"  />
        <KPICard label="Low Stock"      value={lowStock}           color={lowStock > 0 ? 'red' : 'green'} sub={lowStock > 0 ? 'Reorder needed' : 'All stocked'} />
        <KPICard label="Expiring ≤90d"  value={expiringSoon}       color={expiringSoon > 0 ? 'amber' : 'teal'} />
        <KPICard label="Vaccines"       value={vaccines}           color="purple" />
      </KPIGrid>

      <div style={{ display: 'flex', gap: 10, marginBottom: 14, flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
          <span style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--txt4)' }}>🔍</span>
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search name, code, generic, barcode, SKU…"
            style={{ ...inputStyle(), paddingLeft: 32 }} />
        </div>
        <select value={catFilter} onChange={e => setCatFilter(e.target.value)}
          style={{ padding: '7px 10px', border: '1px solid var(--bdr2)', borderRadius: 6, fontSize: 12, background: 'var(--bg)' }}>
          <option value="">All Categories</option>
          {CATEGORIES.map(c => <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>)}
        </select>
      </div>

      <Card>
        <DataTable
          loading={isLoading || !isOnline}
          data={drugs}
          emptyMsg={isOnline ? 'No drugs match your filters' : 'Go online to view drug formulary'}
          columns={[
            {
              header: 'Code', key: 'code',
              render: v => <span style={{ fontFamily: 'var(--fm)', color: 'var(--blu)', fontWeight: 700, fontSize: 11 }}>{v}</span>,
            },
            {
              header: 'Barcode', key: 'barcode',
              render: v => <span style={{ fontFamily: 'var(--fm)', fontSize: 11 }}>{v || '—'}</span>,
            },
            {
              header: 'SKU', key: 'sku',
              render: v => <span style={{ fontFamily: 'var(--fm)', fontSize: 11 }}>{v || '—'}</span>,
            },
            {
              header: 'Drug Name', key: 'name',
              render: (v, r) => (
                <div>
                  <strong style={{ fontSize: 12 }}>{v}</strong>
                  {r.generic_name && <div style={{ fontSize: 10, color: 'var(--txt3)' }}>{r.generic_name}</div>}
                </div>
              ),
            },
            { header: 'Category',  key: 'category',    render: v => <Badge>{v || '—'}</Badge> },
            { header: 'Unit',      key: 'unit',         render: v => <span style={{ fontSize: 11 }}>{v}</span> },
            {
              header: 'Price', key: 'unit_price',
              render: v => <span style={{ fontFamily: 'var(--fm)', color: 'var(--gld)', fontWeight: 700 }}>{fmtINR(v)}</span>,
            },
            {
              header: 'Stock', key: 'current_stock',
              render: (v, r) => {
                const level = v < r.min_stock ? 'critical' : v < (r.min_stock || 0) * 2 ? 'low' : 'ok';
                return (
                  <div>
                    <span style={{ fontFamily: 'var(--fm)', fontWeight: 700, color: level === 'critical' ? 'var(--red)' : level === 'low' ? 'var(--amb)' : 'var(--grn)' }}>
                      {v ?? '—'}
                    </span>
                    {r.min_stock && <span style={{ fontSize: 10, color: 'var(--txt4)', marginLeft: 4 }}>min:{r.min_stock}</span>}
                  </div>
                );
              },
            },
            {
              header: 'Expiry', key: 'expiry_date',
              render: v => <Badge color={expiryColor(v)}>{fmtDate(v)}</Badge>,
            },
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
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 10,
          padding: '10px 14px',
          borderTop: '1px solid var(--bdr)',
          background: 'var(--bg1)',
          fontSize: 11,
          color: 'var(--txt3)',
        }}>
          <span>
            {total === 0
              ? 'No rows'
              : `Showing ${(page - 1) * PAGE_SIZE + 1}–${Math.min(page * PAGE_SIZE, total)} of ${total}`}
          </span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span>Page {page} of {totalPages}</span>
            <Btn
              variant="outline"
              size="xs"
              disabled={page <= 1}
              onClick={() => setPage(p => Math.max(1, p - 1))}
            >
              Previous
            </Btn>
            <Btn
              variant="outline"
              size="xs"
              disabled={page >= totalPages}
              onClick={() => setPage(p => p + 1)}
            >
              Next
            </Btn>
          </div>
        </div>
      </Card>

      {showForm && (
        <Modal
          title={editDrug ? 'Edit Drug' : 'Add Drug'}
          sub={editDrug ? 'Drug formulary management' : ''}
          onClose={() => { setShowForm(false); setEditDrug(null); }}
          size="lg"
          footer={
            <>
              <Btn variant="ghost" onClick={() => { setShowForm(false); setEditDrug(null); }}>Cancel</Btn>
              <Btn variant="primary" onClick={handleSubmit(d => createMutation.mutate(d))} disabled={createMutation.isPending}>
                {createMutation.isPending ? 'Saving…' : '✓ Save'}
              </Btn>
            </>
          }
        >
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
            <Field label="Drug code" required error={errors.code?.message}>
              <input {...register('code', { required: 'Required' })} placeholder="Enter drug code" style={inputStyle(errors.code)} disabled={!!editDrug} />
            </Field>
            <Field label="Drug name (drugCode1)" required error={errors.listed_name?.message}>
              <input {...register('listed_name', { required: 'Required' })} placeholder="Enter drug name" style={inputStyle(errors.listed_name)} />
            </Field>
            <Field label="Trade name" required error={errors.name?.message}>
              <input {...register('name', { required: 'Required' })} placeholder="Enter trade name" style={inputStyle(errors.name)} />
            </Field>
            <Field label="Specification">
              <input {...register('specification')} placeholder="Enter specification" style={inputStyle()} />
            </Field>
            <Field label="Unit pack">
              <input {...register('unit_pack')} placeholder="Enter unit pack" style={inputStyle()} />
            </Field>
            <Field label="Presentation">
              <input {...register('presentation')} placeholder="Enter presentation" style={inputStyle()} />
            </Field>
            <Field label="Generic name">
              <input {...register('generic_name')} placeholder="INN / generic name" style={inputStyle()} />
            </Field>
            <Field label="Unit">
              <select {...register('unit')} style={inputStyle()}>
                {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
              </select>
            </Field>
            <Field label="Base price (₹)" required error={errors.unit_price?.message}>
              <input
                type="number"
                step="0.01"
                {...register('unit_price', { required: 'Required', min: { value: 0, message: 'Min 0' }, valueAsNumber: true })}
                placeholder="Enter base price"
                style={inputStyle(errors.unit_price)}
              />
            </Field>
            <Field label="GST %">
              <input type="number" step="0.01" {...register('gst_pct', { valueAsNumber: true })} placeholder="Enter GST" style={inputStyle()} />
            </Field>
            <Field label="Name of the firm">
              <input {...register('firm_name')} placeholder="Enter firm name" style={inputStyle()} />
            </Field>
            <Field label="Name of the stockiest">
              <input {...register('stockist_name')} placeholder="Enter stockiest name" style={inputStyle()} />
            </Field>
            <Field label="Barcode">
              <input {...register('barcode')} placeholder="Scan or enter barcode" style={inputStyle()} />
            </Field>
            <Field label="SKU">
              <input {...register('sku')} placeholder="Stock keeping unit" style={inputStyle()} />
            </Field>
          </div>
        </Modal>
      )}
    </PageWrap>
  );
}