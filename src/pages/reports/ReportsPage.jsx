// src/pages/reports/ReportsPage.jsx
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { PageWrap, PageHead } from '../../components/ui';

const REPORT_GROUPS = [
  {
    title: 'Attendance Reports',
    icon: '👥',
    reports: [
      { id: 'attendance',          label: 'Attendance Report',                  icon: '📋', desc: 'Monthly attendance summary per employee' },
      { id: 'district-abstract',   label: 'District Wise Attendance Abstract',  icon: '🗺', desc: 'District-level attendance overview' },
    ],
  },
  {
    title: 'Clinical Reports',
    icon: '🩺',
    reports: [
      { id: 'cases',               label: 'Case Treated Report',                icon: '🩺', desc: 'District/species-wise treatment outcomes' },
      { id: 'ai',                  label: 'Artificial Insemination Report',      icon: '🐄', desc: 'A.I. done and pregnancy outcomes' },
      { id: 'farmers',             label: 'Farmers Report',                      icon: '🌾', desc: 'Farmer registration and Aadhar status' },
    ],
  },
  {
    title: 'Drug & Inventory Reports',
    icon: '💊',
    reports: [
      { id: 'inventory',           label: 'Inventory Management Report',        icon: '🗄', desc: 'Stock levels, movements and expiry' },
      { id: 'drug-wise',           label: 'Drug-wise Issuance Report',           icon: '💊', desc: 'Quantity and value issued per drug' },
    ],
  },
  {
    title: 'Administrative Reports',
    icon: '📊',
    reports: [
      { id: 'district-abstract',   label: 'District Wise Abstract Report',      icon: '📊', desc: 'Cases, vaccinations, A.I. per district' },
    ],
  },
];

function ReportCard({ report, onClick }) {
  return (
    <div
      onClick={onClick}
      style={{
        background: 'var(--bg)', border: '1px solid var(--bdr)', borderRadius: 10,
        padding: '20px 14px 16px', display: 'flex', flexDirection: 'column',
        alignItems: 'center', gap: 12, cursor: 'pointer',
        boxShadow: 'var(--sh1)', transition: 'transform .12s, box-shadow .12s',
      }}
      onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 4px 16px rgba(26,86,219,.13)'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
      onMouseLeave={e => { e.currentTarget.style.boxShadow = 'var(--sh1)'; e.currentTarget.style.transform = 'translateY(0)'; }}
    >
      <div style={{
        width: 56, height: 56, borderRadius: '50%',
        background: 'linear-gradient(135deg,#e8f0fe,#c7d7fc)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24,
      }}>
        {report.icon}
      </div>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--txt)', lineHeight: 1.3, marginBottom: 4 }}>{report.label}</div>
        <div style={{ fontSize: 10, color: 'var(--txt4)', lineHeight: 1.4 }}>{report.desc}</div>
      </div>
    </div>
  );
}

export default function ReportsPage() {
  const navigate = useNavigate();

  return (
    <PageWrap>
      <PageHead
        title="Reports"
        subtitle="District-level analytics, exportable reports and progress tracking"
        crumbs={['Home', 'Reports']}
      />

      {REPORT_GROUPS.map((group, gi) => (
        <div key={gi} style={{ marginBottom: 32 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
            <span style={{ fontSize: 18 }}>{group.icon}</span>
            <h3 style={{ fontFamily: 'var(--fd)', fontSize: 'clamp(14px,1.2vw,18px)', fontWeight: 700, color: 'var(--blu)', margin: 0 }}>
              {group.title}
            </h3>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(170px,1fr))', gap: 14 }}>
            {group.reports.map(r => (
              <ReportCard key={r.id} report={r} onClick={() => navigate(`/reports/${r.id}`)} />
            ))}
          </div>
        </div>
      ))}
    </PageWrap>
  );
}