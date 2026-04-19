import React from 'react';

const fmtINR = (n: any) => `₹${Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;

export function DraftBanner({ existingDraft, draftDismissed, cartItemsLength, loadDraft, setDraftDismissed }: {
  existingDraft: any;
  draftDismissed: boolean;
  cartItemsLength: number;
  loadDraft: (d: any) => void;
  setDraftDismissed: (v: boolean) => void;
}) {
  if (!existingDraft || draftDismissed || cartItemsLength > 0) return null;

  return (
    <div style={{ margin: '0 14px 8px', padding: '10px 14px', background: '#fffbeb', border: '1px solid #fcd34d', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, flexShrink: 0 }}>
      <div>
        <div style={{ fontSize: 12, fontWeight: 700, color: '#92400e' }}>📋 Draft found — {(existingDraft.items || []).length} item(s) · {fmtINR(existingDraft.total)}</div>
        <div style={{ fontSize: 10, color: '#b45309', marginTop: 2 }}>
          Last saved {existingDraft.updated_at ? new Date(existingDraft.updated_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : ''}
        </div>
      </div>
      <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
        <button type="button" onClick={() => loadDraft(existingDraft)} style={{ padding: '5px 12px', fontSize: 11, fontWeight: 700, background: '#f59e0b', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontFamily: 'var(--fb)' }}>Load Draft</button>
        <button type="button" onClick={() => setDraftDismissed(true)} style={{ padding: '5px 8px', fontSize: 12, background: 'transparent', color: '#92400e', border: '1px solid #fcd34d', borderRadius: 6, cursor: 'pointer' }}>✕</button>
      </div>
    </div>
  );
}
