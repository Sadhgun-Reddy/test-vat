// src/pages/dashboard/DailyProgressPage.jsx
import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { syncManager } from '../../sync/syncManager';
import { useSync } from '../../store/SyncContext';
import { PageWrap, PageHead, KPIGrid, KPICard, Card, DataTable, Badge, Btn } from '../../components/ui';
import toast from 'react-hot-toast';

export default function DailyProgressPage() {
  const { isOnline } = useSync();
  const { data, isLoading } = useQuery({
    queryKey: ['dashboard'],
    queryFn: async () => { const { data } = await syncManager.api.get('/dashboard'); return data; },
    enabled: isOnline,
    refetchInterval: 60_000,
    staleTime: 30_000,
  });

  const kpis     = data?.kpis     || {};
  const activity = data?.district_activity || [];

  return (
    <PageWrap>
      <PageHead
        title="Daily Progress"
        subtitle={new Date().toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        crumbs={['Home', 'Daily Progress']}
        actions={<Btn variant="ghost" size="sm" onClick={() => toast('Generating report…')}>📊 Print Report</Btn>}
      />

      <KPIGrid>
        <KPICard label="Cases Today"        value={kpis.cases_today}     sub={`Total: ${kpis.cases_total || 0}`} color="blue"   />
        <KPICard label="Vaccinations Today" value={kpis.vacc_today}      sub="today"  color="green"  />
        <KPICard label="A.I. Done"          value={kpis.ai_today}        sub="today"  color="gold"   />
        <KPICard label="Dewormings"         value={kpis.deworming_today} sub="today"  color="amber"  />
        <KPICard label="Staff Present"
          value={kpis.staff_present != null ? `${kpis.staff_present}/${kpis.staff_total}` : '—'}
          sub={kpis.staff_total ? `${Math.round((kpis.staff_present || 0) / kpis.staff_total * 100)}%` : ''}
          color="purple"
        />
        <KPICard label="Pending Sync"       value={kpis.pending_sync}    color={kpis.pending_sync > 0 ? 'amber' : 'teal'} />
      </KPIGrid>

      <Card>
        <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--bdr)', fontWeight: 600, fontSize: 13 }}>
          📈 District-wise Activity — Last 30 Days
        </div>
        <DataTable
          loading={isLoading || !isOnline}
          data={activity}
          emptyMsg={isOnline ? 'No activity data today' : 'Go online to view daily progress'}
          columns={[
            { header: 'District',      key: 'district',   render: v => <strong style={{ fontSize: 12 }}>{v}</strong> },
            { header: 'Cases',         key: 'cases',      render: v => <span style={{ fontFamily: 'var(--fm)', color: 'var(--blu)', fontWeight: 700 }}>{v}</span> },
            { header: 'Vaccinations',  key: 'vacc',       render: v => <span style={{ fontFamily: 'var(--fm)', color: 'var(--grn)', fontWeight: 700 }}>{v}</span> },
            { header: 'A.I.',          key: 'ai_done',    render: v => <span style={{ fontFamily: 'var(--fm)' }}>{v}</span> },
            { header: 'Status',        key: 'cases',      render: v => <Badge color={v > 5 ? 'green' : 'amber'}>{v > 5 ? 'Active' : 'Low'}</Badge> },
          ]}
        />
      </Card>
    </PageWrap>
  );
}