import React, { useMemo } from 'react';

const fmtINR = (n: any) =>
  `₹${Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;

export function DrugSearchInput({
  searchQ,
  setSearchQ,
  allocationDrugs,
  addToCart,
}: {
  searchQ: string;
  setSearchQ: (q: string) => void;
  allocationDrugs: any[];
  addToCart: (drug: any) => void;
}) {
  const searchResults = useMemo(() => {
    if (searchQ.length < 2) return [];
    const q = searchQ.toLowerCase();
    return allocationDrugs
      .filter((d: any) => d.name?.toLowerCase().includes(q) || d.code?.toLowerCase().includes(q))
      .slice(0, 8);
  }, [searchQ, allocationDrugs]);

  return (
    <div
      style={{
        padding: '7px 14px',
        background: '#fff',
        borderBottom: '1px solid var(--bdr)',
        position: 'relative',
        flexShrink: 0,
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          border: '1.5px solid var(--blu-bdr)',
          borderRadius: 8,
          padding: '5px 10px',
          background: '#fff',
          maxWidth: 320,
          width: '100%',
        }}
      >
        <span style={{ fontSize: 13, flexShrink: 0 }}>🔍</span>
        <input
          value={searchQ}
          onChange={(e) => setSearchQ(e.target.value)}
          placeholder="Search drug name or code…"
          style={{
            width: '100%',
            border: 'none',
            outline: 'none',
            fontSize: 12,
            background: 'transparent',
            color: 'var(--txt)',
            fontFamily: 'var(--fb)',
          }}
        />
        {searchQ && (
          <button
            type="button"
            onClick={() => setSearchQ('')}
            style={{
              border: 'none',
              background: 'none',
              cursor: 'pointer',
              color: 'var(--txt3)',
              fontSize: 14,
              padding: 0,
              lineHeight: 1,
            }}
          >
            ×
          </button>
        )}
      </div>
      {searchQ.length >= 2 && searchResults?.length > 0 && (
        <div
          style={{
            position: 'absolute',
            top: '100%',
            left: 14,
            right: 14,
            background: '#fff',
            border: '1px solid var(--bdr)',
            borderRadius: 10,
            boxShadow: 'var(--sh3)',
            zIndex: 100,
            overflow: 'hidden',
          }}
        >
          {searchResults.map((d: any) => (
            <div
              key={d.id}
              onClick={() => addToCart(d)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                padding: '10px 14px',
                cursor: 'pointer',
                borderBottom: '1px solid var(--bdr)',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--blu-lt)')}
              onMouseLeave={(e) => (e.currentTarget.style.background = '#fff')}
            >
              <div
                style={{
                  width: 34,
                  height: 34,
                  borderRadius: 8,
                  background: 'var(--blu-lt)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 16,
                  flexShrink: 0,
                }}
              >
                💊
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 12, fontWeight: 600 }}>{d.name}</div>
                <div style={{ fontSize: 10, color: 'var(--txt3)' }}>
                  {d.code} · {d.unit} · Stock: {d.current_stock ?? 0}
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div
                  style={{ fontSize: 13, fontWeight: 700, color: 'var(--blu)', marginBottom: 3 }}
                >
                  {fmtINR(d.unit_price)}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
