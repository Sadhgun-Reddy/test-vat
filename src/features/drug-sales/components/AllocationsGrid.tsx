import React from 'react';

const fmtINR = (n: any) => `₹${Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;

export function AllocationsGrid({
  filtersApplied,
  allocFetching,
  allocationsForIndent,
  selectedAllocationIds,
  setSelectedAllocationIds,
  setCartItems
}: {
  filtersApplied: boolean;
  allocFetching: boolean;
  allocationsForIndent: any[];
  selectedAllocationIds: Set<any>;
  setSelectedAllocationIds: (s: Set<any>) => void;
  setCartItems: (items: any[]) => void;
}) {
  return (
    <div style={{ padding: '12px 14px', flexShrink: 0, background: '#fff', borderBottom: '1px solid var(--bdr)' }}>
      {!filtersApplied ? (
        <div style={{ padding: '10px 0', color: 'var(--txt4)', fontSize: 12, textAlign: 'center' }}>
          Apply filters and click Search to load budget allocations
        </div>
      ) : allocFetching ? (
        <div style={{ padding: '10px 0', color: 'var(--txt3)', fontSize: 12, textAlign: 'center' }}>
          Loading allocations…
        </div>
      ) : !allocationsForIndent.length ? (
        <div style={{ padding: '10px 0', color: 'var(--red)', fontSize: 12, textAlign: 'center' }}>
          No budget allocations found for selected filters
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 10 }}>
          {allocationsForIndent.map((alloc: any) => {
            const selected = selectedAllocationIds.has(alloc.id);
            const budget = Number(alloc.budget_amount);
            const spent = Number(alloc.spent_amount);
            const pct = budget > 0 ? Math.min(100, (spent / budget) * 100) : 0;
            const fullySpent = budget > 0 && spent >= budget;
            return (
              <button
                key={alloc.id}
                type="button"
                disabled={fullySpent}
                onClick={() => {
                  if (fullySpent) return;
                  setSelectedAllocationIds(new Set([alloc.id]));
                  setCartItems([]);
                }}
                style={{
                  textAlign: 'left',
                  padding: '12px 14px',
                  borderRadius: 10,
                  border: selected ? '2px solid var(--blu)' : fullySpent ? '1px solid var(--bdr)' : '1px solid var(--bdr)',
                  background: fullySpent ? 'var(--bg2)' : selected ? 'var(--blu-lt)' : 'var(--bg1)',
                  cursor: fullySpent ? 'not-allowed' : 'pointer',
                  fontFamily: 'var(--fb)',
                  opacity: fullySpent ? 0.55 : 1,
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 }}>
                  <div style={{ fontSize: 11, fontWeight: 800, color: fullySpent ? 'var(--txt3)' : 'var(--blu)' }}>
                    {alloc.form_type || 'Allocation'}
                  </div>
                  {fullySpent && (
                    <span style={{ fontSize: 9, fontWeight: 700, background: 'var(--red)', color: '#fff', borderRadius: 4, padding: '2px 5px', whiteSpace: 'nowrap' }}>
                      FULLY SPENT
                    </span>
                  )}
                </div>
                <div style={{ fontSize: 10, color: 'var(--txt3)', marginBottom: 6 }}>
                  {alloc.drugs?.length || 0} drugs · {alloc.scheme_name || ''}
                </div>
                <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--txt)', marginBottom: 4 }}>
                  Budget: {fmtINR(budget)}
                </div>
                <div style={{ height: 4, borderRadius: 2, background: 'var(--bdr2)', overflow: 'hidden', marginBottom: 4 }}>
                  <div style={{ height: '100%', width: `${pct}%`, background: fullySpent ? 'var(--red)' : pct >= 80 ? '#f59e0b' : 'var(--grn)', transition: 'width .3s' }} />
                </div>
                <div style={{ fontSize: 10, color: fullySpent ? 'var(--red)' : 'var(--txt3)', fontWeight: fullySpent ? 700 : 400 }}>
                  {fullySpent ? 'Budget exhausted' : `${fmtINR(budget - spent)} remaining`}
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
