// src/pages/drugs/StockPage.jsx
import React, { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { syncManager } from '../../sync/syncManager';
import { useSync } from '../../store/SyncContext';
import {
  PageWrap, PageHead, KPIGrid, KPICard, Card, CardHead, DataTable,
  Badge, Btn, inputStyle,
} from '../../components/ui';
import toast from 'react-hot-toast';

const fmtDate = d => d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

function flattenPurchases(purchases) {
  const list = purchases || [];
  const rows = [];
  for (const p of list) {
    const items = Array.isArray(p.items) ? p.items : [];
    if (items.length === 0) {
      rows.push({
        drug_name: '—',
        quantity: null,
        batch_no: null,
        expiry_date: null,
        purchase_date: p.purchase_date,
        invoice_no: p.invoice_no,
        notes: p.notes,
        place_name: p.place_name,
      });
    } else {
      for (const it of items) {
        rows.push({
          drug_name: it.drug_name,
          quantity: it.quantity,
          batch_no: it.batch_no,
          expiry_date: it.expiry_date,
          purchase_date: p.purchase_date,
          invoice_no: p.invoice_no,
          notes: p.notes,
          place_name: p.place_name,
        });
      }
    }
  }
  return rows;
}

export default function StockPage() {
  const { isOnline } = useSync();
  const [search, setSearch]         = useState('');
  const [alertOnly, setAlertOnly]   = useState(false);

  const { data: stockData, isLoading } = useQuery({
    queryKey: ['stock-levels'],
    queryFn: async () => { const { data } = await syncManager.api.get('/stock/levels'); return data; },
    enabled: isOnline,
    refetchInterval: 60_000,
    staleTime: 30_000,
  });

  const { data: purchData, isLoading: purchLoading } = useQuery({
    queryKey: ['purchases', 'stock-sidebar'],
    queryFn: async () => {
      const { data } = await syncManager.api.get('/purchases?limit=50');
      return data;
    },
    enabled: isOnline,
    staleTime: 30_000,
  });

  const purchaseRows = useMemo(
    () => flattenPurchases(purchData?.purchases),
    [purchData?.purchases]
  );

  const stock   = stockData?.stock || [];
  const lowCount = stock.filter(d => d.stock_level === 'critical').length;
  const expCount = stock.filter(d => d.expiry_date && new Date(d.expiry_date) < new Date(Date.now() + 90 * 86400000)).length;

  const filtered = stock.filter(d =>
    (!alertOnly || d.stock_level !== 'ok') &&
    (!search || d.name?.toLowerCase().includes(search.toLowerCase()) || d.code?.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <PageWrap>
      <PageHead
        title="Purchase Management"
        subtitle="Drug stock levels · Expiry tracking · Reorder alerts"
        crumbs={['Home', 'Drugs', 'Inventory']}
        actions={<Btn variant="ghost" size="sm" onClick={() => toast('Exporting stock report…')}>⬇ Stock Report</Btn>}
      />

      <KPIGrid>
        <KPICard label="Total SKUs"       value={stock.length}    color="blue"   />
        <KPICard label="Low / Critical"   value={lowCount}        color={lowCount > 0 ? 'red' : 'green'} sub={lowCount > 0 ? 'Reorder needed' : 'All stocked'} />
        <KPICard label="Expiring ≤90 days" value={expCount}       color={expCount > 0 ? 'amber' : 'teal'} />
        <KPICard label="OK Status"         value={stock.filter(d => d.stock_level === 'ok').length} color="green" />
      </KPIGrid>

      {lowCount > 0 && (
        <div style={{ background: 'var(--red-lt)', border: '1px solid var(--red-bdr)', borderRadius: 8, padding: '10px 16px', marginBottom: 14, fontSize: 12, color: '#991b1b' }}>
          ⚠ <strong>{lowCount} item{lowCount > 1 ? 's' : ''} below minimum stock.</strong>{' '}
          Reorder required: {stock.filter(d => d.stock_level === 'critical').map(d => d.name).join(', ')}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: 16 }}>
        {/* Stock table */}
        <div>
          <div style={{ display: 'flex', gap: 10, marginBottom: 12 }}>
            <div style={{ position: 'relative', flex: 1 }}>
              <span style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--txt4)' }}>🔍</span>
              <input value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Search drug name or code…"
                style={{ ...inputStyle(), paddingLeft: 32 }} />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <input type="checkbox" id="ao" checked={alertOnly} onChange={e => setAlertOnly(e.target.checked)}
                style={{ accentColor: 'var(--red)', width: 14, height: 14 }} />
              <label htmlFor="ao" style={{ fontSize: 12, cursor: 'pointer', color: 'var(--txt2)', whiteSpace: 'nowrap' }}>Alerts only</label>
            </div>
          </div>

          <Card>
            <CardHead title="Current Stock Levels" sub={`${filtered.length} drugs`} />
            <DataTable
              loading={isLoading || !isOnline}
              data={filtered}
              emptyMsg={isOnline ? 'No stock data' : 'Go online to view inventory'}
              columns={[
                {
                  header: 'Drug', key: 'name',
                  render: (v, r) => (
                    <div>
                      <strong style={{ fontSize: 12 }}>{v}</strong>
                      <div style={{ fontSize: 10, color: 'var(--txt3)' }}>{r.code}</div>
                    </div>
                  ),
                },
                {
                  header: 'Stock', key: 'current_stock',
                  render: (v, r) => (
                    <span style={{ fontFamily: 'var(--fm)', fontWeight: 700,
                      color: r.stock_level === 'critical' ? 'var(--red)' : r.stock_level === 'low' ? 'var(--amb)' : 'var(--grn)' }}>
                      {v ?? '—'}
                    </span>
                  ),
                },
                {
                  header: 'Min', key: 'min_stock',
                  render: v => <span style={{ fontFamily: 'var(--fm)', fontSize: 11, color: 'var(--txt3)' }}>{v ?? '—'}</span>,
                },
                {
                  header: 'Level', key: 'stock_level',
                  render: v => (
                    <div style={{ width: 60 }}>
                      <div style={{ height: 6, background: 'var(--bg3)', borderRadius: 3, overflow: 'hidden' }}>
                        <div style={{
                          height: '100%', borderRadius: 3,
                          width: `${v === 'ok' ? 90 : v === 'low' ? 45 : 10}%`,
                          background: v === 'critical' ? 'var(--red)' : v === 'low' ? 'var(--amb)' : 'var(--grn)',
                          transition: 'width .4s ease',
                        }} />
                      </div>
                    </div>
                  ),
                },
                {
                  header: 'Expiry', key: 'expiry_date',
                  render: v => {
                    if (!v) return <span style={{ fontSize: 11, color: 'var(--txt4)' }}>—</span>;
                    const color = new Date(v) < new Date() ? 'red' : new Date(v) < new Date(Date.now() + 90 * 86400000) ? 'amber' : 'green';
                    return <Badge color={color}>{fmtDate(v)}</Badge>;
                  },
                },
              ]}
            />
          </Card>
        </div>

        {/* Purchase lines (same source as Purchase tab) */}
        <Card>
          <CardHead title="Recent Purchases" sub="Last 50 · line items from goods received" />
          <DataTable
            loading={purchLoading || !isOnline}
            data={purchaseRows}
            emptyMsg={isOnline ? 'No purchase records' : 'Go online to view purchases'}
            columns={[
              { header: 'Drug', key: 'drug_name', render: v => <span style={{ fontSize: 11 }}>{v}</span> },
              { header: 'Qty', key: 'quantity', render: v => <span style={{ fontFamily: 'var(--fm)', fontWeight: 700 }}>{v ?? '—'}</span> },
              { header: 'Batch', key: 'batch_no', render: v => <span style={{ fontSize: 10, color: 'var(--txt3)' }}>{v || '—'}</span> },
              {
                header: 'Expiry', key: 'expiry_date',
                render: v => {
                  if (!v) return <span style={{ fontSize: 10, color: 'var(--txt4)' }}>—</span>;
                  const color = new Date(v) < new Date() ? 'red' : new Date(v) < new Date(Date.now() + 90 * 86400000) ? 'amber' : 'green';
                  return <Badge color={color}>{fmtDate(v)}</Badge>;
                },
              },
              { header: 'Invoice', key: 'invoice_no', render: v => <span style={{ fontSize: 10, color: 'var(--txt3)' }}>{v || '—'}</span> },
              { header: 'Date', key: 'purchase_date', render: v => <span style={{ fontSize: 10, color: 'var(--txt3)' }}>{v ? String(v).slice(0, 10) : '—'}</span> },
              {
                header: 'Note',
                key: 'notes',
                render: v => (
                  <span style={{ fontSize: 10, color: 'var(--txt2)', display: 'block', maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={v || ''}>
                    {v?.trim() ? v : '—'}
                  </span>
                ),
              },
            ]}
          />
        </Card>
      </div>
    </PageWrap>
  );
}
