import React from 'react';

import { SaleLineItem } from '../hooks/useSaleForm';

const fmtINR = (n: any) =>
  `₹${Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;

export function SaleLineItems({
  cartItems,
  isPO,
  updateQty,
  updateDisc,
  updateGstPct,
  removeItem,
  subtotalPO,
  taxPO,
  subtotalSale,
}: {
  cartItems: SaleLineItem[];
  isPO: boolean;
  updateQty: (id: any, qty: any) => void;
  updateDisc: (id: any, d: any) => void;
  updateGstPct: (id: any, pct: any) => void;
  removeItem: (id: any) => void;
  subtotalPO: number;
  taxPO: number;
  subtotalSale: number;
}) {
  return (
    <>
      <table
        style={{
          width: '100%',
          tableLayout: 'fixed',
          borderCollapse: 'collapse',
          background: '#fff',
          borderRadius: 10,
          overflow: 'hidden',
          border: '1px solid var(--bdr)',
          marginTop: 6,
        }}
      >
        {isPO ? (
          <colgroup>
            <col />
            <col style={{ width: 118 }} />
            <col style={{ width: 80 }} />
            <col style={{ width: 52 }} />
            <col style={{ width: 82 }} />
            <col style={{ width: 88 }} />
            <col style={{ width: 36 }} />
          </colgroup>
        ) : (
          <colgroup>
            <col />
            <col style={{ width: 122 }} />
            <col style={{ width: 82 }} />
            <col style={{ width: 76 }} />
            <col style={{ width: 96 }} />
            <col style={{ width: 36 }} />
          </colgroup>
        )}
        <thead>
          <tr style={{ background: 'var(--bg1)' }}>
            {(isPO
              ? ['Item', 'Qty', 'Price', 'GST %', 'GST Amt', 'Total', '']
              : ['Item', 'Qty', 'Price', 'Disc.', 'Total', '']
            ).map((h, i, arr) => {
              const align = i === 0 ? 'left' : i === arr.length - 1 ? 'center' : 'right';
              return (
                <th
                  key={h || `col-${i}`}
                  style={{
                    padding: '6px 8px',
                    textAlign: align as any,
                    verticalAlign: 'middle',
                    fontSize: 10,
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    letterSpacing: '.05em',
                    color: 'var(--txt3)',
                    borderBottom: '1px solid var(--bdr)',
                    lineHeight: 1.25,
                  }}
                >
                  {h}
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {!cartItems.length ? (
            <tr>
              <td
                colSpan={isPO ? 7 : 6}
                style={{
                  textAlign: 'center',
                  padding: '14px 10px',
                  color: 'var(--txt4)',
                  fontSize: 12,
                  lineHeight: 1.35,
                }}
              >
                No items. Search or click a drug above.
              </td>
            </tr>
          ) : (
            cartItems.map((item) => {
              const base = item.qty * item.unit_price;
              const lineTax = (base * (parseFloat(item.gstPct as any) || 0)) / 100;
              const lineTotalSale = base - (item.lineDiscount || 0);
              const lineTotalPO = base + lineTax;
              return (
                <tr
                  key={item.drug_id}
                  style={{ borderBottom: '1px solid var(--bdr)' }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'var(--bg1)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'transparent';
                  }}
                >
                  <td style={{ padding: '5px 8px', verticalAlign: 'middle', overflow: 'hidden' }}>
                    <div
                      style={{
                        fontSize: 12,
                        fontWeight: 500,
                        lineHeight: 1.25,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                      title={item.name}
                    >
                      {item.name}
                    </div>
                    <div
                      style={{
                        fontSize: 10,
                        color: 'var(--txt3)',
                        lineHeight: 1.2,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                      title={[item.code, item.unit].filter(Boolean).join(' · ')}
                    >
                      {[item.code, item.unit].filter(Boolean).join(' · ') || '—'}
                    </div>
                  </td>
                  <td style={{ padding: '5px 6px', textAlign: 'right', verticalAlign: 'middle' }}>
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'flex-end',
                        gap: 4,
                      }}
                    >
                      <button
                        type="button"
                        onClick={() => updateQty(item.drug_id, item.qty - 1)}
                        style={{
                          width: 22,
                          height: 22,
                          borderRadius: '50%',
                          border: '1px solid var(--bdr2)',
                          background: 'var(--bg2)',
                          cursor: 'pointer',
                          fontFamily: 'var(--fb)',
                          fontSize: 14,
                          flexShrink: 0,
                        }}
                      >
                        −
                      </button>
                      <input
                        type="number"
                        min="1"
                        value={item.qty}
                        onChange={(e) => updateQty(item.drug_id, e.target.value)}
                        style={{
                          width: 44,
                          padding: '3px 4px',
                          border: '1px solid var(--bdr2)',
                          borderRadius: 5,
                          fontSize: 12,
                          fontWeight: 700,
                          textAlign: 'center',
                          outline: 'none',
                          fontFamily: 'var(--fb)',
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => updateQty(item.drug_id, item.qty + 1)}
                        style={{
                          width: 22,
                          height: 22,
                          borderRadius: '50%',
                          border: '1px solid var(--blu-bdr)',
                          background: 'var(--blu-lt)',
                          cursor: 'pointer',
                          color: 'var(--blu)',
                          fontFamily: 'var(--fb)',
                          fontSize: 14,
                          flexShrink: 0,
                        }}
                      >
                        +
                      </button>
                    </div>
                  </td>
                  <td
                    style={{
                      padding: '5px 8px',
                      textAlign: 'right',
                      fontSize: 12,
                      verticalAlign: 'middle',
                      fontFamily: 'var(--fd)',
                    }}
                  >
                    {fmtINR(item.unit_price)}
                  </td>
                  <td style={{ padding: '5px 6px', textAlign: 'right', verticalAlign: 'middle' }}>
                    {isPO ? (
                      <input
                        type="number"
                        value={item.gstPct ?? 0}
                        onChange={(e) => updateGstPct(item.drug_id, e.target.value)}
                        style={{
                          width: 44,
                          padding: '3px 5px',
                          border: '1px solid var(--bdr2)',
                          borderRadius: 4,
                          fontSize: 11,
                          textAlign: 'right',
                          outline: 'none',
                          fontFamily: 'var(--fb)',
                          boxSizing: 'border-box',
                        }}
                      />
                    ) : (
                      <input
                        type="number"
                        value={item.lineDiscount ?? 0}
                        onChange={(e) => updateDisc(item.drug_id, e.target.value)}
                        style={{
                          width: 56,
                          padding: '3px 5px',
                          border: '1px solid var(--bdr2)',
                          borderRadius: 4,
                          fontSize: 11,
                          textAlign: 'right',
                          outline: 'none',
                          fontFamily: 'var(--fb)',
                        }}
                      />
                    )}
                  </td>
                  {isPO && (
                    <td
                      style={{
                        padding: '5px 8px',
                        textAlign: 'right',
                        fontSize: 11,
                        fontWeight: 700,
                        verticalAlign: 'middle',
                        fontFamily: 'var(--fd)',
                        color: 'var(--txt2)',
                      }}
                      title="GST amount on this line"
                    >
                      {fmtINR(lineTax)}
                    </td>
                  )}
                  <td
                    style={{
                      padding: '5px 8px',
                      textAlign: 'right',
                      fontSize: 12,
                      fontWeight: 700,
                      verticalAlign: 'middle',
                      fontFamily: 'var(--fd)',
                    }}
                  >
                    {fmtINR(isPO ? lineTotalPO : lineTotalSale)}
                  </td>
                  <td style={{ padding: '5px 4px', verticalAlign: 'middle', textAlign: 'center' }}>
                    <button
                      type="button"
                      onClick={() => removeItem(item.drug_id)}
                      style={{
                        width: 20,
                        height: 20,
                        borderRadius: '50%',
                        border: 'none',
                        background: 'var(--red-lt)',
                        color: 'var(--red)',
                        cursor: 'pointer',
                        fontSize: 10,
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      ✕
                    </button>
                  </td>
                </tr>
              );
            })
          )}
        </tbody>
      </table>
      {cartItems.length > 0 && (
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            padding: '5px 10px',
            background: 'var(--bg2)',
            borderRadius: '0 0 10px 10px',
            fontSize: 11,
            color: 'var(--txt3)',
            border: '1px solid var(--bdr)',
            borderTop: 'none',
          }}
        >
          <span>
            {cartItems.length} items · {cartItems.reduce((s, i) => s + i.qty, 0)} units
          </span>
          <span style={{ fontWeight: 700, color: 'var(--txt)', fontSize: 13 }}>
            {fmtINR(isPO ? subtotalPO + taxPO : subtotalSale)}
          </span>
        </div>
      )}
    </>
  );
}
