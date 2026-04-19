// src/pages/hrms/AttendanceReportPage.jsx
import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { syncManager } from '../../sync/syncManager';
import { useSync } from '../../store/SyncContext';
import { PageWrap, PageHead, KPIGrid, KPICard, Card, DataTable, Badge, Btn, inputStyle } from '../../components/ui';
import toast from 'react-hot-toast';

export default function AttendanceReportPage() {
  const { isOnline } = useSync();
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7));
  const [districtId, setDistrictId] = useState('');

  const { data: distData } = useQuery({
    queryKey: ['districts'],
    queryFn: async () => { const { data } = await syncManager.api.get('/districts'); return data; },
    enabled: isOnline, staleTime: Infinity,
  });

  const { data, isLoading } = useQuery({
    queryKey: ['attendance-report', month, districtId],
    queryFn: async () => {
      const params = new URLSearchParams({ month });
      if (districtId) params.set('district_id', districtId);
      const { data } = await syncManager.api.get(`/attendance/report?${params}`);
      return data;
    },
    enabled: isOnline,
    staleTime: 60_000,
  });

  const report = data?.report || [];
  const avgPresent = report.length
    ? Math.round(report.reduce((s, r) => s + (r.present_days || 0), 0) / report.length)
    : 0;
  const avgAbsent = report.length
    ? Math.round(report.reduce((s, r) => s + (r.absent_days || 0), 0) / report.length)
    : 0;

  return (
    <PageWrap>
      <PageHead
        title="Attendance Report"
        subtitle="Monthly attendance summary for all staff"
        crumbs={['Home', 'HRMS', 'Attendance Report']}
        actions={
          <>
            <input type="month" value={month} onChange={e => setMonth(e.target.value)}
              style={{ ...inputStyle(), width: 160 }} />
            <select value={districtId} onChange={e => setDistrictId(e.target.value)}
              style={{ padding: '7px 10px', border: '1px solid var(--bdr2)', borderRadius: 6, fontSize: 12, background: 'var(--bg)' }}>
              <option value="">All Districts</option>
              {(distData || []).map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
            <Btn variant="ghost" size="sm" onClick={() => toast('Exporting…')}>📤 Export</Btn>
          </>
        }
      />

      <KPIGrid>
        <KPICard label="Total Staff"        value={report.length}  color="blue"   />
        <KPICard label="Avg Present Days"   value={avgPresent}     color="green"  sub="per employee" />
        <KPICard label="Avg Absent Days"    value={avgAbsent}      color="red"    sub="per employee" />
        <KPICard label="High Attendance (≥90%)" value={report.filter(r => r.present_days / Math.max(1, r.present_days + r.absent_days + r.leave_days) >= 0.9).length} color="teal" />
      </KPIGrid>

      <Card>
        <DataTable
          loading={isLoading || !isOnline}
          data={report}
          emptyMsg={isOnline ? 'No data for selected month' : 'Go online to generate reports'}
          columns={[
            { header: 'Emp No.',     key: 'employee_no',   render: v => <span style={{ fontFamily: 'var(--fm)', fontSize: 11, color: 'var(--blu)', fontWeight: 700 }}>{v}</span> },
            { header: 'Name',        key: 'name',          render: v => <strong style={{ fontSize: 12 }}>{v}</strong> },
            { header: 'Designation', key: 'designation',   render: v => <span style={{ fontSize: 11, color: 'var(--txt3)' }}>{v || '—'}</span> },
            { header: 'District',    key: 'district',      render: v => <span style={{ fontSize: 11 }}>{v || '—'}</span> },
            { header: 'Present',     key: 'present_days',  render: v => <Badge color="green">{v || 0}</Badge> },
            { header: 'Absent',      key: 'absent_days',   render: v => <Badge color="red">{v || 0}</Badge> },
            { header: 'Leave',       key: 'leave_days',    render: v => <Badge color="amber">{v || 0}</Badge> },
            { header: 'OD',          key: 'od_days',       render: v => <Badge>{v || 0}</Badge> },
            {
              header: 'Attendance %', key: 'present_days',
              render: (v, r) => {
                const total = (r.present_days || 0) + (r.absent_days || 0) + (r.leave_days || 0);
                const pct   = total ? Math.round((r.present_days || 0) / total * 100) : 0;
                return <Badge color={pct >= 90 ? 'green' : pct >= 75 ? 'amber' : 'red'}>{pct}%</Badge>;
              },
            },
          ]}
        />
      </Card>
    </PageWrap>
  );
}