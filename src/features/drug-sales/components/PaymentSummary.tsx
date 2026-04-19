import React from 'react';

const fmtINR = (n: any) =>
  `₹${Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;

export function PaymentSummary({
  isPO,
  displaySubtotal,
  displayTax,
  globalDiscount,
  total,
  selectedAllocations,
  selectedGroupBudget,
  selectedGroupSpent,
  poUsedBudget,
  poReserveBalance,
  cartItemsLength,
  poOverBudget,
  payMethod,
  setPayMethod,
  amtReceived,
  setAmtReceived,
  change,
}: {
  isPO: boolean;
  displaySubtotal: number;
  displayTax: number;
  globalDiscount: number;
  total: number;
  selectedAllocations: any[];
  selectedGroupBudget: number;
  selectedGroupSpent: number;
  poUsedBudget: number;
  poReserveBalance: number;
  cartItemsLength: number;
  poOverBudget: boolean;
  payMethod: string;
  setPayMethod: (m: string) => void;
  amtReceived: string;
  setAmtReceived: (a: string) => void;
  change: number;
}) {
  return (
    <div style={{ padding: '16px 18px', flex: 1, overflowY: 'auto' }}>
      <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: '.05em', marginBottom: 18 }}>
        BILL SUMMARY
      </div>
      {isPO ? (
        <>
          {[
            ['Subtotal', fmtINR(displaySubtotal)],
            ['GST', fmtINR(displayTax)],
          ].map(([l, v]) => (
            <div
              key={l}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                fontSize: 12,
                color: 'var(--txt2)',
                marginBottom: 10,
              }}
            >
              <span>{l}</span>
              <span style={{ fontWeight: 600 }}>{v}</span>
            </div>
          ))}
          <div style={{ height: 1, background: 'var(--bdr)', margin: '12px 0' }} />
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: 16,
            }}
          >
            <span style={{ fontSize: 15, fontWeight: 800 }}>TOTAL</span>
            <span style={{ fontSize: 24, fontWeight: 800, fontFamily: 'var(--fd)' }}>
              {fmtINR(total)}
            </span>
          </div>
          <div style={{ fontSize: 10, color: 'var(--txt3)', lineHeight: 1.5, marginBottom: 12 }}>
            {selectedAllocations.length > 0 ? (
              <>
                {[
                  ['Combined budget', fmtINR(selectedGroupBudget)],
                  ['Already spent', fmtINR(selectedGroupSpent)],
                  ['This PO', fmtINR(poUsedBudget)],
                ].map(([k, v]) => (
                  <div
                    key={k as any}
                    style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}
                  >
                    <span>{k}</span>
                    <span style={{ fontWeight: 600, color: 'var(--txt2)' }}>{v}</span>
                  </div>
                ))}
                {poReserveBalance > 0 && cartItemsLength > 0 && (
                  <div
                    style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}
                  >
                    <span>Reserve balance</span>
                    <span style={{ fontWeight: 700, color: 'var(--grn)' }}>
                      {fmtINR(poReserveBalance)}
                    </span>
                  </div>
                )}
                {poReserveBalance > 0 && cartItemsLength > 0 && (
                  <div
                    style={{
                      padding: '6px 8px',
                      background: 'var(--grn-lt,#f0fdf4)',
                      borderRadius: 6,
                      color: 'var(--grn)',
                      fontWeight: 600,
                      marginTop: 4,
                      fontSize: 10,
                      lineHeight: 1.5,
                    }}
                  >
                    ✓ {fmtINR(poReserveBalance)} unused budget will be added to reserve balance on
                    submit.
                  </div>
                )}
                {poOverBudget && (
                  <div
                    style={{
                      padding: '6px 8px',
                      background: 'var(--red-lt)',
                      borderRadius: 6,
                      color: 'var(--red)',
                      fontWeight: 600,
                      marginTop: 4,
                      fontSize: 10,
                    }}
                  >
                    ⚠ Order exceeds combined budget
                  </div>
                )}
              </>
            ) : (
              <div style={{ fontStyle: 'italic', color: 'var(--txt4)' }}>
                Select a budget allocation above to see limits
              </div>
            )}
          </div>
        </>
      ) : (
        <>
          {[
            ['Subtotal', fmtINR(displaySubtotal)],
            ['Discount', `− ${fmtINR(globalDiscount)}`],
            ['GST', fmtINR(displayTax)],
          ].map(([l, v]) => (
            <div
              key={l}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                fontSize: 12,
                color: 'var(--txt2)',
                marginBottom: 10,
              }}
            >
              <span>{l}</span>
              <span
                style={{
                  color: l === 'Discount' && globalDiscount > 0 ? 'var(--grn)' : 'var(--txt2)',
                  fontWeight: l === 'Discount' && globalDiscount > 0 ? 700 : 400,
                }}
              >
                {v}
              </span>
            </div>
          ))}
          <div style={{ height: 1, background: 'var(--bdr)', margin: '12px 0' }} />
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: 18,
            }}
          >
            <span style={{ fontSize: 15, fontWeight: 800 }}>TOTAL</span>
            <span style={{ fontSize: 24, fontWeight: 800, fontFamily: 'var(--fd)' }}>
              {fmtINR(total)}
            </span>
          </div>
          <div
            style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, marginBottom: 16 }}
          >
            {[
              ['cash', 'Cash'],
              ['card', 'Card'],
              ['upi', 'UPI'],
              ['wallet', 'Wallet'],
            ].map(([id, label]) => (
              <button
                key={id}
                type="button"
                onClick={() => setPayMethod(id)}
                style={{
                  padding: '8px 0',
                  border: `2px solid ${payMethod === id ? 'var(--blu)' : 'var(--bdr)'}`,
                  borderRadius: 6,
                  background: payMethod === id ? 'var(--blu)' : '#fff',
                  color: payMethod === id ? '#fff' : 'var(--txt2)',
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: 'pointer',
                  fontFamily: 'var(--fb)',
                }}
              >
                {label}
              </button>
            ))}
          </div>
          {payMethod === 'cash' && (
            <>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  fontSize: 12,
                  marginBottom: 8,
                }}
              >
                <span>Amount Received</span>
                <input
                  type="number"
                  value={amtReceived}
                  onChange={(e) => setAmtReceived(e.target.value)}
                  placeholder={total.toFixed(2)}
                  style={{
                    width: 100,
                    padding: '5px 8px',
                    border: '1px solid var(--bdr2)',
                    borderRadius: 6,
                    fontSize: 13,
                    textAlign: 'right',
                    fontWeight: 600,
                    outline: 'none',
                    fontFamily: 'var(--fb)',
                  }}
                />
              </div>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  fontSize: 14,
                  fontWeight: 700,
                }}
              >
                <span style={{ color: 'var(--txt2)' }}>Change</span>
                <span style={{ color: change >= 0 ? 'var(--grn)' : 'var(--red)' }}>
                  {amtReceived ? `${change < 0 ? '−' : ''}${fmtINR(Math.abs(change))}` : '—'}
                  {change < 0 && ' short'}
                </span>
              </div>
            </>
          )}
          {payMethod === 'upi' && (
            <div style={{ textAlign: 'center', padding: '14px 0' }}>
              <div style={{ fontSize: 32, marginBottom: 6 }}>📱</div>
              <div style={{ fontSize: 11, color: 'var(--txt3)' }}>UPI ID: vahd.pharmacy@upi</div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
