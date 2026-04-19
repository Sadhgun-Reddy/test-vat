import React from 'react';
import { MODULE_TABS } from './constants';

export function SaleTabs({ activeTab, setActiveTab, invoiceNo }: {
  activeTab: string;
  setActiveTab: (t: string) => void;
  invoiceNo: string;
}) {
  return (
    <div style={{
      background: 'var(--blu2)', padding: '0 16px 0 20px', minHeight: 46,
      display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0, flexWrap: 'wrap', rowGap: 8,
    }}>
      <span style={{ color: '#fff', fontWeight: 700, fontSize: 14, whiteSpace: 'nowrap' }}>💊 Drug Sale / Billing</span>
      <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexWrap: 'wrap' }}>
        {MODULE_TABS.map(({ id, label }: any) => {
          const isActive = activeTab === id;
          return (
            <button
              key={id}
              type="button"
              onClick={() => setActiveTab(id)}
              style={{
                display: 'flex', alignItems: 'center', gap: 5, padding: '5px 10px', borderRadius: 6, border: 'none',
                background: isActive ? 'rgba(255,255,255,.2)' : 'transparent',
                color: isActive ? '#fff' : 'rgba(255,255,255,.88)',
                fontSize: 11, fontWeight: isActive ? 700 : 500, cursor: 'pointer', fontFamily: 'var(--fb)', whiteSpace: 'nowrap',
                boxShadow: isActive ? 'inset 0 -2px 0 #fff' : 'none',
              }}
            >
              {label}
            </button>
          );
        })}
      </div>
      <div style={{ marginLeft: 'auto', color: 'rgba(255,255,255,.85)', fontSize: 11, whiteSpace: 'nowrap' }}>🧾 {invoiceNo}</div>
    </div>
  );
}
