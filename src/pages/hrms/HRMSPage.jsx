// src/pages/hrms/HRMSPage.jsx
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { syncManager } from '../../sync/syncManager';
import { useSync } from '../../store/SyncContext';
import {
  PageWrap, PageHead, KPIGrid, KPICard,
  Card, CardHead, DataTable, Badge, Btn,
} from '../../components/ui';

export default function HRMSPage() {
  const navigate = useNavigate();
  const { isOnline } = useSync();

  const { data: empData } = useQuery({
    queryKey: ['employees', 'hrms-summary'],
    queryFn: async () => {
      const { data } = await syncManager.api.get('/employees?limit=200');
      return data;
    },
    enabled: isOnline,
    staleTime: 60_000,
  });

  const employees  = empData?.employees || [];
  const total      = empData?.total || 0;
  const present    = employees.filter(e => e.today_attendance === 'present').length;
  const absent     = employees.filter(e => e.today_attendance === 'absent').length;
  const onLeave    = employees.filter(e => e.today_attendance === 'leave').length;
  const active     = employees.filter(e => e.is_active).length;
  const districtCount = new Set(employees.map(e => e.district_name).filter(Boolean)).size;

  const desigMap = {};
  employees.forEach(e => {
    if (e.designation_name) desigMap[e.designation_name] = (desigMap[e.designation_name] || 0) + 1;
  });

  const MODULES = [
    { to: '/employees',         icon: '👤', label: 'Staff Directory',     desc: 'Full VAHD personnel registry',     badge: `${total} staff`,     accent: 'var(--blu)',  bg: 'var(--blu-lt)'  },
    { to: '/attendance',        icon: '📋', label: 'Daily Attendance',    desc: "Mark today's attendance",          badge: `${present} present`, accent: 'var(--grn)',  bg: 'var(--grn-lt)'  },
    { to: '/employees',         icon: '📝', label: 'Emp. Registration',   desc: 'Register a new field officer',     badge: 'Add new',            accent: 'var(--pur)',  bg: 'var(--pur-lt)'  },
    { to: '/attendance-report', icon: '📊', label: 'Attendance Report',   desc: 'Monthly summary and export',       badge: '26 working days',    accent: 'var(--amb)',  bg: 'var(--amb-lt)'  },
    { to: '/leaves',            icon: '📄', label: 'Leave Management',    desc: 'Apply and track approvals',        badge: `${onLeave} on leave`,accent: 'var(--gld)',  bg: 'var(--gld-lt)'  },
    { to: '/attendance-report', icon: '📈', label: 'District Summary',    desc: 'District-wise attendance counts',  badge: `${districtCount} districts`, accent: 'var(--tel)', bg: 'var(--tel-lt)' },
  ];

  return (
    <PageWrap>
      <PageHead
        title="Human Resource Management"
        subtitle="Staff registry · Attendance · Leaves · VAHD field personnel"
        crumbs={['Home', 'HRMS']}
        actions={
          <>
            <Btn variant="ghost" size="sm" onClick={() => navigate('/employees')}>+ Register Employee</Btn>
            <Btn variant="ghost" size="sm" onClick={() => navigate('/attendance-report')}>📊 Reports</Btn>
          </>
        }
      />

      <KPIGrid>
        <KPICard label="Total Staff"   value={total}      sub={`${districtCount} districts`}           color="blue"   onClick={() => navigate('/employees')} />
        <KPICard label="Present Today" value={present}    sub={`${total ? Math.round(present/total*100) : 0}% attendance`} color="green" delta="↑ On track" onClick={() => navigate('/attendance')} />
        <KPICard label="Absent Today"  value={absent}     sub="marked absent"                          color="red"   />
        <KPICard label="On Leave"      value={onLeave}    sub="approved leave"                         color="amber" />
        <KPICard label="Active Staff"  value={active}     sub={`of ${total} registered`}               color="green" />
        <KPICard label="Districts"     value={districtCount} sub="covered by staff"                    color="purple" />
      </KPIGrid>

      <div style={{
        background: 'var(--blu-lt)', border: '1px solid var(--blu-bdr)',
        borderRadius: 8, padding: '11px 16px', marginBottom: 18,
        fontSize: 13, color: 'var(--blu2)',
      }}>
        👥 <strong>HRMS Hub</strong> — Manage all human resource operations for VAHD field staff
        across Telangana from this central dashboard.
      </div>

      {/* Module cards grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(280px,1fr))', gap: 14, marginBottom: 22 }}>
        {MODULES.map((m, i) => (
          <div key={i} onClick={() => navigate(m.to)}
            style={{
              background: 'var(--bg)', border: '1px solid var(--bdr)',
              borderLeft: `4px solid ${m.accent}`, borderRadius: 10,
              padding: '14px 16px', cursor: 'pointer',
              display: 'flex', gap: 14, alignItems: 'flex-start',
              boxShadow: 'var(--sh1)', transition: 'transform .12s, box-shadow .12s',
            }}
            onMouseEnter={e => { e.currentTarget.style.boxShadow = 'var(--sh2)'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
            onMouseLeave={e => { e.currentTarget.style.boxShadow = 'var(--sh1)'; e.currentTarget.style.transform = 'translateY(0)'; }}
          >
            <div style={{ width: 44, height: 44, borderRadius: 10, background: m.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, flexShrink: 0 }}>{m.icon}</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--txt)', marginBottom: 3 }}>{m.label}</div>
              <div style={{ fontSize: 11, color: 'var(--txt3)', marginBottom: 8 }}>{m.desc}</div>
              <span style={{ fontSize: 10, fontWeight: 600, color: m.accent, background: m.bg, padding: '2px 8px', borderRadius: 10 }}>{m.badge}</span>
            </div>
            <span style={{ color: 'var(--txt4)', fontSize: 18 }}>›</span>
          </div>
        ))}
      </div>

      {/* Bottom row: breakdown + recent */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <Card>
          <CardHead title="Designation Breakdown" sub={`${Object.keys(desigMap).length} designations`} />
          <div style={{ padding: 14 }}>
            {Object.entries(desigMap).sort((a,b) => b[1]-a[1]).map(([d, n]) => {
              const pct = total ? Math.round(n / total * 100) : 0;
              return (
                <div key={d} style={{ marginBottom: 12 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span style={{ fontSize: 12, color: 'var(--txt2)' }}>{d}</span>
                    <span style={{ fontSize: 12, fontFamily: 'var(--fm)', color: 'var(--blu)', fontWeight: 700 }}>{n}</span>
                  </div>
                  <div style={{ height: 5, background: 'var(--bg3)', borderRadius: 3, overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${pct}%`, background: 'var(--blu)', borderRadius: 3, transition: 'width .4s ease' }} />
                  </div>
                </div>
              );
            })}
            {!Object.keys(desigMap).length && (
              <div style={{ color: 'var(--txt4)', fontSize: 12 }}>
                {isOnline ? 'No employees loaded' : 'Go online to load employee data'}
              </div>
            )}
          </div>
        </Card>

        <Card>
          <CardHead title="Today's Attendance" sub={new Date().toLocaleDateString('en-IN', { weekday: 'short', day: '2-digit', month: 'short' })}>
            <Btn variant="ghost" size="xs" onClick={() => navigate('/attendance')}>Mark Attendance →</Btn>
          </CardHead>
          <DataTable
            data={employees.slice(0, 8)}
            emptyMsg={isOnline ? 'No employees loaded' : 'Go online to view attendance'}
            columns={[
              {
                header: 'Employee', key: 'first_name',
                render: (v, r) => (
                  <div>
                    <strong style={{ fontSize: 12 }}>{r.first_name} {r.last_name}</strong>
                    <div style={{ fontSize: 10, color: 'var(--txt3)' }}>{r.district_name}</div>
                  </div>
                ),
              },
              {
                header: 'Designation', key: 'designation_name',
                render: v => <span style={{ fontSize: 11, color: 'var(--txt3)' }}>{v || '—'}</span>,
              },
              {
                header: 'Status', key: 'today_attendance',
                render: v => (
                  <Badge color={v === 'present' ? 'green' : v === 'leave' ? 'amber' : v === 'absent' ? 'red' : 'dim'}>
                    {v || 'Not marked'}
                  </Badge>
                ),
              },
            ]}
          />
        </Card>
      </div>
    </PageWrap>
  );
}