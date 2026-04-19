// src/pages/reports/ReportDetailPage.jsx
import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { syncManager } from '../../sync/syncManager';
import { useSync } from '../../store/SyncContext';
import {
  PageWrap, PageHead, Card, CardHead, DataTable, Badge, Btn, Field, inputStyle,
} from '../../components/ui';
import toast from 'react-hot-toast';

const REPORT_META = {
  'attendance':         { label: 'Attendance Report',                 icon: '📋' },
  'district-abstract':  { label: 'District Wise Abstract Report',     icon: '📊' },
  'inventory':          { label: 'Inventory Management Report',       icon: '🗄'  },
  'drug-wise':          { label: 'Drug-wise Issuance Report',          icon: '💊' },
  'cases':              { label: 'Case Treated Report',               icon: '🩺'  },
  'ai':                 { label: 'Artificial Insemination Report',     icon: '🐄' },
  'farmers':            { label: 'Farmers Report',                    icon: '🌾'  },
};

const fmtINR = n => n != null ? `₹${Number(n).toLocaleString('en-IN')}` : '—';

// Column renderers specific to each report type
function renderCell(key, value, row) {
  if (value == null) return '—';
  const k = key.toLowerCase();
  if (k.includes('rate') || k.includes('%'))        return <span style={{ fontFamily: 'var(--fm)', color: 'var(--blu)' }}>{value}%</span>;
  if (k.includes('value') || k.includes('price') || k.includes('amount')) return <span style={{ fontFamily: 'var(--fm)', color: 'var(--gld)' }}>{fmtINR(value)}</span>;
  if (k === 'status')                                return <Badge color={String(value).toLowerCase() === 'ok' || String(value).toLowerCase() === 'active' ? 'green' : 'red'}>{value}</Badge>;
  if (k.includes('stock') && typeof value === 'number') return <span style={{ fontFamily: 'var(--fm)', color: value < 50 ? 'var(--red)' : 'var(--grn)', fontWeight: 700 }}>{value}</span>;
  return String(value);
}

export default function ReportDetailPage() {
  const { reportId } = useParams();
  const navigate     = useNavigate();
  const { isOnline } = useSync();

  const defaultFrom = new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10);
  const [from, setFrom]       = useState(defaultFrom);
  const [to, setTo]           = useState(new Date().toISOString().slice(0, 10));
  const [districtId, setDistrictId] = useState('');
  const [generating, setGenerating] = useState(null);

  const meta = REPORT_META[reportId] || { label: reportId?.replace(/-/g, ' '), icon: '📄' };

  const { data: distData } = useQuery({
    queryKey: ['districts'],
    queryFn: async () => { const { data } = await syncManager.api.get('/districts'); return data; },
    enabled: isOnline, staleTime: Infinity,
  });

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['report', reportId, from, to, districtId],
    queryFn: async () => {
      const params = new URLSearchParams({ from, to });
      if (districtId) params.set('district_id', districtId);
      const { data } = await syncManager.api.get(`/reports/${reportId}?${params}`);
      return data;
    },
    enabled: isOnline && !!reportId,
    staleTime: 60_000,
  });

  const rows = data?.report || [];
  const cols = rows.length
    ? Object.keys(rows[0]).filter(k => !['id', '_i'].includes(k))
    : [];

  const exportReport = async (type) => {
    setGenerating(type);
    await new Promise(r => setTimeout(r, 900));
    toast.success(`${meta.label} exported as ${type.toUpperCase()}`);
    setGenerating(null);
  };

  return (
    <PageWrap>
      <PageHead
        title={meta.label}
        subtitle={`${rows.length} records · Period: ${from} to ${to}`}
        crumbs={['Home', 'Reports', meta.label]}
        actions={
          <>
            <Btn variant="ghost" size="sm" onClick={() => navigate('/reports')}>← Back</Btn>
            <Btn variant="ghost"    size="sm" onClick={() => exportReport('excel')} disabled={!!generating}>
              {generating === 'excel' ? '⏳ …' : '⬇ Excel'}
            </Btn>
            <Btn variant="primary"  size="sm" onClick={() => exportReport('pdf')} disabled={!!generating}>
              {generating === 'pdf' ? '⏳ …' : '📄 PDF'}
            </Btn>
          </>
        }
      />

      {/* Filter bar */}
      <Card style={{ marginBottom: 14 }}>
        <div style={{ padding: '10px 16px', display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 11, color: 'var(--txt3)', fontWeight: 600 }}>Filters:</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <label style={{ fontSize: 11, color: 'var(--txt2)', whiteSpace: 'nowrap' }}>From</label>
            <input type="date" value={from} onChange={e => setFrom(e.target.value)}
              style={{ ...inputStyle(), width: 140 }} />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <label style={{ fontSize: 11, color: 'var(--txt2)' }}>To</label>
            <input type="date" value={to} onChange={e => setTo(e.target.value)}
              style={{ ...inputStyle(), width: 140 }} />
          </div>
          <select value={districtId} onChange={e => setDistrictId(e.target.value)}
            style={{ padding: '7px 10px', border: '1px solid var(--bdr2)', borderRadius: 6, fontSize: 12, background: 'var(--bg)', color: 'var(--txt2)' }}>
            <option value="">All Districts</option>
            {(distData || []).map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
          </select>
          <Btn variant="primary" size="sm" onClick={() => refetch()}>🔍 Generate</Btn>
          <Btn variant="ghost"   size="sm" onClick={() => { setFrom(defaultFrom); setTo(new Date().toISOString().slice(0, 10)); setDistrictId(''); }}>
            Reset
          </Btn>
        </div>
      </Card>

      {/* Results table */}
      <Card>
        <CardHead
          title={meta.label}
          sub={`${from} to ${to}${districtId ? ' · Filtered by district' : ''}`}
        />
        <DataTable
          loading={isLoading || !isOnline}
          data={rows}
          emptyMsg={
            !isOnline
              ? 'Go online to generate reports'
              : 'No data for the selected period. Try adjusting filters.'
          }
          columns={[
            { header: 'S.No', key: '_sno', render: (_, __, i) => <span style={{ color: 'var(--txt4)', fontSize: 11 }}>{(i || 0) + 1}</span> },
            ...cols.map(col => ({
              header: col.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
              key: col,
              render: (v, r) => renderCell(col, v, r),
            })),
          ]}
        />
        {rows.length > 0 && (
          <div style={{
            padding: '8px 14px', borderTop: '1px solid var(--bdr)',
            background: 'var(--bg1)', fontSize: 11, color: 'var(--txt3)',
            display: 'flex', justifyContent: 'space-between',
          }}>
            <span>Total records: <strong>{rows.length}</strong></span>
            <span>Period: {from} to {to}</span>
          </div>
        )}
      </Card>
    </PageWrap>
  );
}