// src/pages/dashboard/DashboardPage.jsx
import React, { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../store/AuthContext';
import { useSync } from '../../store/SyncContext';
import { syncManager } from '../../sync/syncManager';
import {
  PageWrap, PageHead, KPIGrid, KPICard,
  Card, CardHead, CardBody, Badge, DataTable,
  outcomeColor, syncColor,
} from '../../components/ui';
import TelanganaMap from './TelanganaMap';

const fmtDate = d => d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

export default function DashboardPage() {
  const { user } = useAuth();
  const { isOnline, pendingCount, isSyncing, triggerSync } = useSync();
  const navigate = useNavigate();

  const greet = useMemo(() => {
    const h = new Date().getHours();
    return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
  }, []);

  const { data, isLoading } = useQuery({
    queryKey: ['dashboard'],
    queryFn: async () => {
      const { data } = await syncManager.api.get('/dashboard');
      return data;
    },
    enabled: isOnline,
    refetchInterval: 60_000,
  });

  const kpis = data?.kpis || {};
  const districtActivity = data?.district_activity || [];
  const outcomes         = data?.outcomes          || [];
  const recentCases      = data?.recent_cases      || [];

  // Build outcome map
  const outcomeMap = useMemo(() => {
    const m = { recovered: 0, referred: 0, died: 0, ongoing: 0 };
    outcomes.forEach(o => { m[o.outcome] = parseInt(o.cnt); });
    return m;
  }, [outcomes]);

  const totalCases = Object.values(outcomeMap).reduce((a, b) => a + b, 0);

  return (
    <PageWrap>
      <PageHead
        title={`${greet}, ${user?.name?.split(' ')[2] || 'Officer'}`}
        subtitle={`VAHD AHIS · ${new Date().toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}`}
        actions={
          <>
            <button onClick={triggerSync} disabled={isSyncing || !isOnline} style={{
              padding: '6px 14px', background: 'var(--bg)', border: '1px solid var(--bdr)',
              borderRadius: 6, fontSize: 12, cursor: 'pointer', color: 'var(--txt2)', fontFamily: 'var(--fb)',
            }}>
              {isSyncing ? '⟳ Syncing…' : '⇄ Sync Now'}
            </button>
            <button onClick={() => navigate('/cases')} style={{
              padding: '6px 14px', background: 'var(--blu)', border: 'none',
              borderRadius: 6, fontSize: 12, cursor: 'pointer', color: '#fff', fontFamily: 'var(--fb)', fontWeight: 600,
            }}>
              + New Case
            </button>
          </>
        }
      />

      {/* KPI grid */}
      <KPIGrid>
        <KPICard label="Cases Today"     value={kpis.cases_today ?? '—'}     sub={`Total: ${kpis.cases_total ?? '—'}`}   delta="↑ 12%" color="blue"   onClick={() => navigate('/cases')} />
        <KPICard label="Vaccinations"    value={kpis.vacc_today ?? '—'}      sub="Today"                                   delta="↑ 8%"  color="green"  onClick={() => navigate('/vaccinations')} />
        <KPICard label="A.I. Done"       value={kpis.ai_today ?? '—'}        sub="Today · 94% success"                                  color="gold"   onClick={() => navigate('/ai-service')} />
        <KPICard label="Dewormings"      value={kpis.deworming_today ?? '—'} sub="Today"                                                color="amber"  onClick={() => navigate('/deworming')} />
        <KPICard
          label="Staff Present"
          value={kpis.staff_present != null && kpis.staff_total ? `${kpis.staff_present}/${kpis.staff_total}` : '—'}
          sub={kpis.staff_total ? `${Math.round(kpis.staff_present/kpis.staff_total*100)}% attendance` : ''}
          color="purple" onClick={() => navigate('/attendance')}
        />
        <KPICard
          label="Recovery Rate"
          value={totalCases ? `${Math.round(outcomeMap.recovered/totalCases*100)}%` : '—'}
          sub="All cases" delta="↑ 3%" color="green"
        />
        <KPICard label="Pending Sync" value={pendingCount} sub="offline records" color={pendingCount > 0 ? 'amber' : 'teal'} onClick={() => navigate('/sync')} />
        <KPICard label="Data Sync" value={isOnline ? 'Online' : 'Offline'} sub={pendingCount > 0 ? `${pendingCount} queued` : 'All synced'} color={isOnline ? 'green' : 'red'} />
      </KPIGrid>

      {/* Telangana Map — full width */}
      <div style={{ marginBottom: 16 }}>
        <TelanganaMap districtActivity={districtActivity} />
      </div>

      {/* Two-column layout */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
        {/* District Activity */}
        <Card>
          <CardHead title="District Activity" sub="Last 30 days — cases + vaccinations" />
          <DataTable
            loading={isLoading}
            columns={[
              { header: '#', key: '_i', render: (_, __, i) => <span style={{ color: 'var(--txt3)', fontSize: 11 }}>{i+1}</span> },
              { header: 'District',      key: 'district', render: v => <strong style={{ fontSize: 12 }}>{v}</strong> },
              { header: 'Cases',         key: 'cases',    render: v => <span style={{ fontFamily: 'var(--fm)', color: 'var(--blu)', fontWeight: 700 }}>{v}</span> },
              { header: 'Vacc.',         key: 'vacc',     render: v => <span style={{ fontFamily: 'var(--fm)', color: 'var(--grn)', fontWeight: 700 }}>{v}</span> },
              { header: 'A.I.',          key: 'ai_done',  render: v => <span style={{ fontFamily: 'var(--fm)' }}>{v}</span> },
            ]}
            data={districtActivity.map((r, i) => ({ ...r, _i: i + 1 }))}
            emptyMsg={!isOnline ? 'Go online to view district data' : 'No data yet'}
          />
        </Card>

        {/* Case Outcomes */}
        <Card>
          <CardHead title="Case Outcomes" sub={`${totalCases} total recorded cases`} />
          <CardBody>
            {[
              { label: 'Recovered', key: 'recovered', color: 'var(--grn)' },
              { label: 'Referred',  key: 'referred',  color: 'var(--blu)' },
              { label: 'Ongoing',   key: 'ongoing',   color: 'var(--amb)' },
              { label: 'Died',      key: 'died',      color: 'var(--red)' },
            ].map(o => {
              const count = outcomeMap[o.key] || 0;
              const pct   = totalCases ? Math.round(count / totalCases * 100) : 0;
              return (
                <div key={o.key} style={{ marginBottom: 14 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                    <span style={{ fontSize: 12, color: 'var(--txt2)' }}>{o.label}</span>
                    <span style={{ fontSize: 12, fontFamily: 'var(--fm)', color: o.color, fontWeight: 700 }}>
                      {count} <span style={{ color: 'var(--txt3)', fontWeight: 400 }}>({pct}%)</span>
                    </span>
                  </div>
                  <div style={{ height: 6, background: 'var(--bg3)', borderRadius: 3, overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${pct}%`, background: o.color, borderRadius: 3, transition: 'width .4s ease' }} />
                  </div>
                </div>
              );
            })}
          </CardBody>
        </Card>
      </div>

      {/* Recent Cases */}
      <Card>
        <CardHead title="Recent Cases" sub="Last 10 records">
          <button onClick={() => navigate('/cases')} style={{ background: 'none', border: 'none', color: 'var(--blu)', fontSize: 12, cursor: 'pointer', fontFamily: 'var(--fb)' }}>
            View All →
          </button>
        </CardHead>
        <DataTable
          loading={isLoading}
          columns={[
            { header: 'Case No.',   key: 'case_number',      render: v => <span style={{ fontFamily: 'var(--fm)', color: 'var(--blu)', fontSize: 11, fontWeight: 700 }}>{v}</span> },
            { header: 'Farmer',     key: 'farmer_name',      render: (v, r) => <div><strong style={{ fontSize: 12 }}>{v}</strong><div style={{ fontSize: 10, color: 'var(--txt3)' }}>{r.district}</div></div> },
            { header: 'Animal',     key: 'animal_type',      render: v => <Badge>{v}</Badge> },
            { header: 'Outcome',    key: 'outcome',          render: v => <Badge color={outcomeColor(v)}>{v}</Badge> },
            { header: 'Date',       key: 'date_of_treatment',render: v => <span style={{ fontSize: 11, color: 'var(--txt3)' }}>{fmtDate(v)}</span> },
            { header: 'Sync',       key: 'sync_status',      render: v => <Badge color={syncColor(v)}>{v === 'synced' ? '✓' : '⟳'}</Badge> },
          ]}
          data={recentCases}
          emptyMsg={!isOnline ? 'Go online to view recent cases' : 'No cases yet'}
        />
      </Card>
    </PageWrap>
  );
}