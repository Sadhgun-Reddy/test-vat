// src/pages/hrms/AttendancePage.jsx
import React, { useState, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { syncManager } from '../../sync/syncManager';
import { upsertAndEnqueue } from '../../sync/offlineStore';
import { useSync } from '../../store/SyncContext';
import { PageWrap, PageHead, KPIGrid, KPICard, Card, Btn, Field, inputStyle } from '../../components/ui';
import toast from 'react-hot-toast';

const todayStr = () => new Date().toISOString().slice(0, 10);

const defaultFilters = () => ({
  from: todayStr(),
  to: todayStr(),
  districtId: '',
  designationId: '',
  search: '',
});

export default function AttendancePage() {
  const { isOnline, refreshPending } = useSync();
  const qc = useQueryClient();
  const [draft, setDraft] = useState(defaultFilters);
  const [applied, setApplied] = useState(defaultFilters);
  const [attendance, setAttendance] = useState({});

  const date = applied.from;

  const { data, isLoading } = useQuery({
    queryKey: ['attendance', date, applied.districtId],
    queryFn: async () => {
      const params = new URLSearchParams({ date, limit: '500' });
      if (applied.districtId) params.set('district_id', applied.districtId);
      const { data } = await syncManager.api.get(`/attendance?${params}`);
      const map = {};
      data.attendance.forEach(r => { map[r.employee_id] = r.status; });
      setAttendance(map);
      return data;
    },
    enabled: isOnline,
    staleTime: 30_000,
  });

  const { data: distData } = useQuery({
    queryKey: ['districts'],
    queryFn: async () => { const { data } = await syncManager.api.get('/districts'); return data; },
    enabled: isOnline, staleTime: Infinity,
  });

  const { data: designations } = useQuery({
    queryKey: ['designations'],
    queryFn: async () => { const { data } = await syncManager.api.get('/settings/designations'); return data; },
    enabled: isOnline, staleTime: Infinity,
  });

  const mark = async (id, status) => {
    setAttendance(p => ({ ...p, [id]: status }));
    try {
      if (isOnline) {
        await syncManager.api.post('/attendance/bulk', {
          date,
          records: [{ employee_id: id, status }],
        });
        qc.invalidateQueries({ queryKey: ['attendance', date] });
      } else {
        await upsertAndEnqueue('attendance', { employee_id: id, status, date, sync_status: 'pending' }, 'INSERT');
        refreshPending();
      }
    } catch {
      toast.error('Could not save attendance');
    }
  };

  const records = useMemo(() => {
    let rows = data?.attendance || [];
    const q = applied.search.trim().toLowerCase();
    if (q) {
      rows = rows.filter(r =>
        r.employee_name?.toLowerCase().includes(q) ||
        r.employee_no?.toLowerCase().includes(q)
      );
    }
    if (applied.designationId) {
      rows = rows.filter(r => r.designation_id === applied.designationId);
    }
    if (applied.to && applied.from && applied.to < applied.from) {
      /* ignore invalid range for display */
    }
    return rows;
  }, [data?.attendance, applied.search, applied.designationId, applied.from, applied.to]);

  const total = records.length;
  const presentCount = records.filter(r => (attendance[r.employee_id] || r.status) === 'present').length;
  const absentCount  = records.filter(r => (attendance[r.employee_id] || r.status) === 'absent').length;
  const leaveCount   = records.filter(r => (attendance[r.employee_id] || r.status) === 'leave').length;

  const runSearch = () => setApplied({ ...draft });
  const runReset = () => {
    const d = defaultFilters();
    setDraft(d);
    setApplied(d);
  };

  const dateLabel = new Date(date).toLocaleDateString('en-IN', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  });

  return (
    <PageWrap>
      <PageHead
        title="Daily Attendance"
        subtitle={`Mark attendance — ${dateLabel}`}
        crumbs={['Home', 'HRMS', 'Attendance']}
      />

      <KPIGrid>
        <KPICard label="Total Staff"   value={total}        color="blue"   />
        <KPICard label="Present"       value={presentCount} sub={total ? `${Math.round(presentCount / total * 100)}%` : '0%'} color="green" />
        <KPICard label="Absent"        value={absentCount}  color="red"    />
        <KPICard label="On Leave"      value={leaveCount}   color="amber"  />
      </KPIGrid>

      <div style={{
        background: 'var(--bg)', border: '1px solid var(--bdr)', borderRadius: 10,
        padding: '14px 16px', marginBottom: 14, boxShadow: 'var(--sh1)',
      }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
          gap: 12,
          alignItems: 'end',
        }}>
          <Field label="From date">
            <input
              type="date"
              value={draft.from}
              onChange={e => setDraft(d => ({ ...d, from: e.target.value }))}
              style={inputStyle()}
            />
          </Field>
          <Field label="To date">
            <input
              type="date"
              value={draft.to}
              onChange={e => setDraft(d => ({ ...d, to: e.target.value }))}
              style={inputStyle()}
            />
          </Field>
          <Field label="Category">
            <select
              value={draft.designationId}
              onChange={e => setDraft(d => ({ ...d, designationId: e.target.value }))}
              style={inputStyle()}
            >
              <option value="">All categories</option>
              {(designations || []).map(x => <option key={x.id} value={x.id}>{x.name}</option>)}
            </select>
          </Field>
          <Field label="District">
            <select
              value={draft.districtId}
              onChange={e => setDraft(d => ({ ...d, districtId: e.target.value }))}
              style={inputStyle()}
            >
              <option value="">All districts</option>
              {(distData || []).map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
          </Field>
          <Field label="Search">
            <input
              value={draft.search}
              onChange={e => setDraft(d => ({ ...d, search: e.target.value }))}
              placeholder="Name, employee no…"
              style={inputStyle()}
              onKeyDown={e => { if (e.key === 'Enter') runSearch(); }}
            />
          </Field>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <Btn variant="primary" size="sm" type="button" onClick={runSearch}>Search</Btn>
            <Btn variant="ghost" size="sm" type="button" onClick={runReset}>Reset</Btn>
          </div>
        </div>
        {draft.from !== draft.to && (
          <p style={{ fontSize: 10, color: 'var(--txt3)', marginTop: 10, marginBottom: 0 }}>
            Attendance is recorded per day. Editing uses the <strong>From date</strong>. Set From and To the same day to mark that date.
          </p>
        )}
      </div>

      <Card>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(250px,1fr))', gap: 8, padding: 14 }}>
          {isLoading && <div style={{ color: 'var(--txt3)', fontSize: 13, padding: 20 }}>Loading…</div>}
          {!isLoading && !records.length && (
            <div style={{ color: 'var(--txt4)', fontSize: 12, padding: 20 }}>
              {isOnline ? 'No records for this date' : 'Go online to load attendance'}
            </div>
          )}
          {records.map(r => {
            const status = attendance[r.employee_id] ?? r.status ?? 'present';
            return (
              <div key={r.employee_id} style={{
                background: 'var(--bg)', border: '1px solid var(--bdr)',
                borderRadius: 8, padding: '10px 12px',
                display: 'flex', alignItems: 'center', gap: 10,
                transition: 'var(--t)',
              }}>
                <div style={{ width: 34, height: 34, borderRadius: '50%', background: 'linear-gradient(135deg,var(--blu),var(--blu2))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: '#fff', flexShrink: 0 }}>
                  {(r.employee_name || '?').split(' ').slice(0,2).map(w => w[0]).join('')}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.employee_name}</div>
                  <div style={{ fontSize: 10, color: 'var(--txt3)' }}>{r.designation_name} · {r.employee_no}</div>
                </div>
                <div style={{ display: 'flex', gap: 3 }}>
                  {[['present','✓','var(--grn-lt)','var(--grn)','var(--grn-bdr)'],
                    ['absent', '✕','var(--red-lt)','var(--red)','var(--red-bdr)'],
                    ['leave',  '◷','var(--amb-lt)','var(--amb)','var(--amb-bdr)']
                  ].map(([s, icon, bg, color, bdr]) => (
                    <button key={s} type="button" onClick={() => mark(r.employee_id, s)}
                      title={s.charAt(0).toUpperCase() + s.slice(1)}
                      style={{
                        width: 28, height: 28, borderRadius: 6,
                        border: `1px solid ${status === s ? bdr : 'var(--bdr)'}`,
                        background: status === s ? bg : 'var(--bg2)',
                        color: status === s ? color : 'var(--txt4)',
                        cursor: 'pointer', fontSize: 13, fontFamily: 'var(--fb)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}>
                      {icon}
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </Card>
    </PageWrap>
  );
}
