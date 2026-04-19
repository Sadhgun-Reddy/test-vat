import React from 'react';
import toast from 'react-hot-toast';

const fmtINR = (n: any) =>
  `₹${Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;

function normalisePurchaseHistory(raw: any) {
  if (raw == null) return [];
  if (Array.isArray(raw)) return raw;
  if (typeof raw === 'string') {
    try {
      const p = JSON.parse(raw);
      return Array.isArray(p) ? p : [];
    } catch {
      return [];
    }
  }
  return [];
}

function lastRecordedLabel(purHist: any[]) {
  const dates = purHist
    .map((p: any) => p.purchase_date || p.created_at)
    .filter(Boolean)
    .sort();
  const last = dates[dates.length - 1];
  return last
    ? new Date(last).toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      })
    : '—';
}

function DrugNameCode({ name, code }: any) {
  const hasCode = code != null && String(code).trim() !== '';
  return (
    <>
      <div style={{ fontSize: 12, fontWeight: 500, lineHeight: 1.25 }}>{name}</div>
      {hasCode && (
        <div
          style={{ fontSize: 10, color: 'var(--txt3)', lineHeight: 1.2, fontFamily: 'var(--fm)' }}
        >
          {String(code).trim()}
        </div>
      )}
    </>
  );
}

export function PurchaseHistory({
  purchaseOrdersHistoryList,
  expandedHistoryId,
  setExpandedHistoryId,
  expandedHistoryPurchaseKey,
  setExpandedHistoryPurchaseKey,
  setCartItems,
  setSelectedAllocationIds,
  setEditingCartPOId,
}: any) {
  if (!purchaseOrdersHistoryList || purchaseOrdersHistoryList.length === 0) return null;

  return (
    <div style={{ marginTop: 16 }}>
      <div
        style={{
          fontSize: 10,
          fontWeight: 700,
          textTransform: 'uppercase',
          letterSpacing: '.05em',
          color: 'var(--txt3)',
          marginBottom: 6,
          paddingLeft: 2,
        }}
      >
        Purchase Orders
      </div>
      <div style={{ border: '1px solid var(--bdr)', borderRadius: 10, overflow: 'hidden' }}>
        {purchaseOrdersHistoryList.map((po: any, idx: number, arr: any[]) => {
          const isExpanded = expandedHistoryId === po.id;
          const purHist = normalisePurchaseHistory(po.purchase_history);
          const st = (po.status || '').toLowerCase();
          const statusPill =
            st === 'closed'
              ? { bg: 'var(--grn-lt,#f0fdf4)', color: 'var(--grn)', label: 'Closed' }
              : st === 'confirmed'
                ? { bg: '#eff6ff', color: '#1d4ed8', label: 'Open' }
                : st === 'draft'
                  ? { bg: 'var(--amber-lt,#fff8e6)', color: '#b45309', label: 'Draft' }
                  : st === 'cancelled'
                    ? { bg: 'var(--red-lt)', color: 'var(--red)', label: 'Cancelled' }
                    : {
                        bg: 'var(--bg2)',
                        color: 'var(--txt3)',
                        label: st ? st.replace(/^./, (c: string) => c.toUpperCase()) : '—',
                      };

          return (
            <div
              key={po.id}
              style={{ borderBottom: idx < arr.length - 1 ? '1px solid var(--bdr)' : 'none' }}
            >
              {/* Summary row — click to expand */}
              <div
                onClick={() => {
                  setExpandedHistoryId(isExpanded ? null : po.id);
                  if (isExpanded) setExpandedHistoryPurchaseKey(null);
                }}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr auto auto auto',
                  gap: 8,
                  alignItems: 'center',
                  padding: '6px 10px',
                  background: isExpanded ? 'var(--blu-lt)' : idx % 2 === 0 ? '#fff' : 'var(--bg1)',
                  cursor: 'pointer',
                }}
                onMouseEnter={(e) => {
                  if (!isExpanded) e.currentTarget.style.background = 'var(--bg1)';
                }}
                onMouseLeave={(e) => {
                  if (!isExpanded)
                    e.currentTarget.style.background = idx % 2 === 0 ? '#fff' : 'var(--bg1)';
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                    <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--blu)' }}>
                      {po.invoice_no}
                    </span>
                    <span
                      style={{
                        fontSize: 9,
                        fontWeight: 700,
                        padding: '2px 6px',
                        borderRadius: 6,
                        background: statusPill.bg,
                        color: statusPill.color,
                      }}
                    >
                      {statusPill.label}
                    </span>
                  </div>
                  <div style={{ fontSize: 10, color: 'var(--txt3)' }}>
                    {po.sale_date?.slice(0, 10)} · {(po.items || []).length} items
                  </div>
                </div>
                <div
                  style={{
                    fontSize: 12,
                    fontWeight: 700,
                    textAlign: 'right',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {fmtINR(po.total)}
                </div>
                <div style={{ fontSize: 10, color: 'var(--txt3)', paddingLeft: 4 }}>
                  {isExpanded ? '▲' : '▼'}
                </div>
              </div>

              {/* Expanded: order lines + goods-received history */}
              {isExpanded && (
                <div
                  style={{
                    borderTop: '1px solid var(--blu-bdr)',
                    background: '#fff',
                    overflowX: 'auto',
                  }}
                >
                  <div
                    style={{
                      padding: '8px 10px 4px',
                      fontSize: 10,
                      fontWeight: 700,
                      textTransform: 'uppercase',
                      letterSpacing: '.05em',
                      color: 'var(--txt3)',
                    }}
                  >
                    ORDER LINES
                  </div>
                  <table
                    style={{
                      width: '100%',
                      minWidth: 580,
                      tableLayout: 'fixed',
                      borderCollapse: 'collapse',
                    }}
                  >
                    <colgroup>
                      <col />
                      <col style={{ width: 52 }} />
                      <col style={{ width: 88 }} />
                      <col style={{ width: 56 }} />
                      <col style={{ width: 88 }} />
                      <col style={{ width: 100 }} />
                    </colgroup>
                    <thead>
                      <tr style={{ background: 'var(--bg1)' }}>
                        {['Item', 'Qty', 'Price', 'GST %', 'GST Amt', 'Total'].map((h, i) => (
                          <th
                            key={h}
                            style={{
                              padding: '6px 8px',
                              textAlign: i === 0 ? 'left' : 'right',
                              verticalAlign: 'middle',
                              fontSize: 10,
                              fontWeight: 700,
                              textTransform: 'uppercase',
                              letterSpacing: '.05em',
                              color: 'var(--txt3)',
                              borderBottom: '1px solid var(--bdr)',
                              lineHeight: 1.2,
                            }}
                          >
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {(po.items || []).map((item: any, i: number) => {
                        const lineBase = Number(item.quantity) * Number(item.unit_price);
                        const lineGstAmt = (lineBase * (parseFloat(item.gst_pct) || 0)) / 100;
                        return (
                          <tr key={i} style={{ borderBottom: '1px solid var(--bdr)' }}>
                            <td
                              style={{
                                padding: '5px 8px',
                                verticalAlign: 'middle',
                                overflow: 'hidden',
                              }}
                            >
                              <DrugNameCode name={item.drug_name} code={item.drug_code} />
                            </td>
                            <td
                              style={{
                                padding: '5px 8px',
                                textAlign: 'right',
                                fontSize: 12,
                                verticalAlign: 'middle',
                                fontFamily: 'var(--fm)',
                              }}
                            >
                              {item.quantity}
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
                            <td
                              style={{
                                padding: '5px 8px',
                                textAlign: 'right',
                                fontSize: 12,
                                color: 'var(--txt3)',
                                verticalAlign: 'middle',
                              }}
                            >
                              {item.gst_pct ?? 0}%
                            </td>
                            <td
                              style={{
                                padding: '5px 8px',
                                textAlign: 'right',
                                fontSize: 12,
                                fontWeight: 700,
                                color: 'var(--txt2)',
                                verticalAlign: 'middle',
                                fontFamily: 'var(--fd)',
                              }}
                            >
                              {fmtINR(lineGstAmt)}
                            </td>
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
                              {fmtINR(item.total)}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                    <tfoot>
                      <tr style={{ background: 'var(--bg1)' }}>
                        <td
                          colSpan={5}
                          style={{
                            padding: '5px 8px',
                            fontSize: 11,
                            fontWeight: 600,
                            color: 'var(--txt2)',
                          }}
                        >
                          {(po.items || []).length} items ·{' '}
                          {(po.items || []).reduce((s: any, i: any) => s + Number(i.quantity), 0)}{' '}
                          units
                        </td>
                        <td
                          style={{
                            padding: '5px 8px',
                            textAlign: 'right',
                            fontSize: 13,
                            fontWeight: 800,
                            fontFamily: 'var(--fd)',
                          }}
                        >
                          {fmtINR(po.total)}
                        </td>
                      </tr>
                    </tfoot>
                  </table>

                  {/* Edit in Cart — only for non-closed POs */}
                  {st !== 'closed' && st !== 'cancelled' && (
                    <div
                      style={{
                        padding: '8px 10px',
                        borderTop: '1px solid var(--bdr)',
                        display: 'flex',
                        justifyContent: 'flex-end',
                      }}
                    >
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setCartItems(
                            (po.items || []).map((item: any) => ({
                              drug_id: item.drug_id,
                              name: item.drug_name,
                              code: item.drug_code || '',
                              unit: '',
                              qty: Number(item.quantity),
                              unit_price: Number(item.unit_price),
                              lineDiscount: Number(item.discount) || 0,
                              gstPct: Number(item.gst_pct) || 0,
                            }))
                          );
                          if (po.allocation_id)
                            setSelectedAllocationIds(new Set([po.allocation_id]));
                          setEditingCartPOId(po.id);
                          setExpandedHistoryId(null);
                          toast.success(`Loaded "${po.invoice_no}" into cart for editing`);
                        }}
                        style={{
                          padding: '5px 12px',
                          fontSize: 11,
                          fontWeight: 700,
                          background: 'var(--blu)',
                          color: '#fff',
                          border: 'none',
                          borderRadius: 6,
                          cursor: 'pointer',
                          fontFamily: 'var(--fb)',
                        }}
                      >
                        ✏ Edit in Cart
                      </button>
                    </div>
                  )}

                  {purHist.length > 0 && (
                    <div
                      style={{ marginTop: 14, borderTop: '1px solid var(--bdr)', paddingTop: 8 }}
                    >
                      <div
                        style={{
                          margin: '0 10px 10px',
                          padding: '10px 14px',
                          background: '#fffbeb',
                          border: '1px solid #fcd34d',
                          borderRadius: 8,
                        }}
                      >
                        <div style={{ fontSize: 12, fontWeight: 700, color: '#92400e' }}>
                          📋 Purchase history — {purHist.length} receipt
                          {purHist.length === 1 ? '' : 's'} ·{' '}
                          {fmtINR(purHist.reduce((s: any, p: any) => s + Number(p.total || 0), 0))}
                        </div>
                        <div style={{ fontSize: 10, color: '#b45309', marginTop: 2 }}>
                          Last recorded {lastRecordedLabel(purHist)}
                        </div>
                      </div>
                      <div
                        style={{
                          border: '1px solid var(--bdr)',
                          borderRadius: 10,
                          overflow: 'hidden',
                          margin: '0 8px 8px',
                        }}
                      >
                        {purHist.map((pur: any, pIdx: number, pArr: any[]) => {
                          const pItems = Array.isArray(pur.items) ? pur.items : [];
                          const pKey = `${po.id}::${pur.id || pur.invoice_no || pIdx}`;
                          const purExpanded = expandedHistoryPurchaseKey === pKey;
                          const receivedPill = {
                            bg: 'var(--amber-lt,#fff8e6)',
                            color: '#b45309',
                            label: 'Received',
                          };
                          return (
                            <div
                              key={pKey}
                              style={{
                                borderBottom:
                                  pIdx < pArr.length - 1 ? '1px solid var(--bdr)' : 'none',
                              }}
                            >
                              <div
                                role="button"
                                tabIndex={0}
                                onClick={() =>
                                  setExpandedHistoryPurchaseKey(purExpanded ? null : pKey)
                                }
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter' || e.key === ' ') {
                                    e.preventDefault();
                                    setExpandedHistoryPurchaseKey(purExpanded ? null : pKey);
                                  }
                                }}
                                style={{
                                  display: 'grid',
                                  gridTemplateColumns: '1fr auto auto auto',
                                  gap: 8,
                                  alignItems: 'center',
                                  padding: '6px 10px',
                                  background: purExpanded
                                    ? 'var(--blu-lt)'
                                    : pIdx % 2 === 0
                                      ? '#fff'
                                      : 'var(--bg1)',
                                  cursor: 'pointer',
                                }}
                                onMouseEnter={(e) => {
                                  if (!purExpanded) e.currentTarget.style.background = 'var(--bg1)';
                                }}
                                onMouseLeave={(e) => {
                                  if (!purExpanded)
                                    e.currentTarget.style.background =
                                      pIdx % 2 === 0 ? '#fff' : 'var(--bg1)';
                                }}
                              >
                                <div>
                                  <div
                                    style={{
                                      display: 'flex',
                                      alignItems: 'center',
                                      gap: 6,
                                      flexWrap: 'wrap',
                                    }}
                                  >
                                    <span
                                      style={{ fontSize: 11, fontWeight: 700, color: 'var(--blu)' }}
                                    >
                                      {pur.invoice_no || '—'}
                                    </span>
                                    <span
                                      style={{
                                        fontSize: 9,
                                        fontWeight: 700,
                                        padding: '2px 6px',
                                        borderRadius: 6,
                                        background: receivedPill.bg,
                                        color: receivedPill.color,
                                      }}
                                    >
                                      {receivedPill.label}
                                    </span>
                                  </div>
                                  <div style={{ fontSize: 10, color: 'var(--txt3)' }}>
                                    {pur.purchase_date?.slice?.(0, 10) || '—'} · {pItems.length}{' '}
                                    item{pItems.length === 1 ? '' : 's'}
                                  </div>
                                </div>
                                <div
                                  style={{
                                    fontSize: 12,
                                    fontWeight: 700,
                                    textAlign: 'right',
                                    whiteSpace: 'nowrap',
                                  }}
                                >
                                  {fmtINR(pur.total)}
                                </div>
                                <div style={{ fontSize: 10, color: 'var(--txt3)', paddingLeft: 4 }}>
                                  {purExpanded ? '▲' : '▼'}
                                </div>
                              </div>
                              {purExpanded && (
                                <div
                                  style={{
                                    borderTop: '1px solid var(--blu-bdr)',
                                    background: '#fff',
                                    overflowX: 'auto',
                                  }}
                                >
                                  {pur.notes && (
                                    <div
                                      style={{
                                        fontSize: 10,
                                        color: 'var(--txt3)',
                                        fontStyle: 'italic',
                                        padding: '8px 10px 0',
                                      }}
                                    >
                                      {pur.notes}
                                    </div>
                                  )}
                                  <div
                                    style={{
                                      padding: '8px 10px 4px',
                                      fontSize: 10,
                                      fontWeight: 700,
                                      textTransform: 'uppercase',
                                      letterSpacing: '.05em',
                                      color: 'var(--txt3)',
                                    }}
                                  >
                                    ORDER LINES
                                  </div>
                                  <table
                                    style={{
                                      width: '100%',
                                      minWidth: 580,
                                      tableLayout: 'fixed',
                                      borderCollapse: 'collapse',
                                    }}
                                  >
                                    <colgroup>
                                      <col />
                                      <col style={{ width: 52 }} />
                                      <col style={{ width: 88 }} />
                                      <col style={{ width: 56 }} />
                                      <col style={{ width: 88 }} />
                                      <col style={{ width: 100 }} />
                                    </colgroup>
                                    <thead>
                                      <tr style={{ background: 'var(--bg1)' }}>
                                        {['Item', 'Qty', 'Price', 'GST %', 'GST Amt', 'Total'].map(
                                          (h, i) => (
                                            <th
                                              key={h}
                                              style={{
                                                padding: '6px 8px',
                                                textAlign: i === 0 ? 'left' : 'right',
                                                verticalAlign: 'middle',
                                                fontSize: 10,
                                                fontWeight: 700,
                                                textTransform: 'uppercase',
                                                letterSpacing: '.05em',
                                                color: 'var(--txt3)',
                                                borderBottom: '1px solid var(--bdr)',
                                                lineHeight: 1.2,
                                              }}
                                            >
                                              {h}
                                            </th>
                                          )
                                        )}
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {pItems.map((item: any, pi: number) => {
                                        const lineBase =
                                          Number(item.quantity) * Number(item.unit_price);
                                        const lineGstAmt =
                                          (lineBase * (parseFloat(item.gst_pct) || 0)) / 100;
                                        const batchLine = [
                                          item.batch_no && `Batch ${item.batch_no}`,
                                          item.expiry_date &&
                                            `Exp ${String(item.expiry_date).slice(0, 10)}`,
                                        ]
                                          .filter(Boolean)
                                          .join(' · ');
                                        return (
                                          <tr
                                            key={item.id || pi}
                                            style={{ borderBottom: '1px solid var(--bdr)' }}
                                          >
                                            <td
                                              style={{
                                                padding: '5px 8px',
                                                verticalAlign: 'middle',
                                                overflow: 'hidden',
                                              }}
                                            >
                                              <DrugNameCode
                                                name={item.drug_name}
                                                code={item.drug_code}
                                              />
                                              {batchLine && (
                                                <div
                                                  style={{
                                                    fontSize: 9,
                                                    color: 'var(--txt4)',
                                                    marginTop: 2,
                                                  }}
                                                >
                                                  {batchLine}
                                                </div>
                                              )}
                                            </td>
                                            <td
                                              style={{
                                                padding: '5px 8px',
                                                textAlign: 'right',
                                                fontSize: 12,
                                                verticalAlign: 'middle',
                                                fontFamily: 'var(--fm)',
                                              }}
                                            >
                                              {item.quantity}
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
                                            <td
                                              style={{
                                                padding: '5px 8px',
                                                textAlign: 'right',
                                                fontSize: 12,
                                                color: 'var(--txt3)',
                                                verticalAlign: 'middle',
                                              }}
                                            >
                                              {item.gst_pct ?? 0}%
                                            </td>
                                            <td
                                              style={{
                                                padding: '5px 8px',
                                                textAlign: 'right',
                                                fontSize: 12,
                                                fontWeight: 700,
                                                color: 'var(--txt2)',
                                                verticalAlign: 'middle',
                                                fontFamily: 'var(--fd)',
                                              }}
                                            >
                                              {fmtINR(lineGstAmt)}
                                            </td>
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
                                              {fmtINR(item.total)}
                                            </td>
                                          </tr>
                                        );
                                      })}
                                    </tbody>
                                    <tfoot>
                                      <tr style={{ background: 'var(--bg1)' }}>
                                        <td
                                          colSpan={5}
                                          style={{
                                            padding: '5px 8px',
                                            fontSize: 11,
                                            fontWeight: 600,
                                            color: 'var(--txt2)',
                                          }}
                                        >
                                          {pItems.length} items ·{' '}
                                          {pItems.reduce(
                                            (s: any, i: any) => s + Number(i.quantity),
                                            0
                                          )}{' '}
                                          units
                                        </td>
                                        <td
                                          style={{
                                            padding: '5px 8px',
                                            textAlign: 'right',
                                            fontSize: 13,
                                            fontWeight: 800,
                                            fontFamily: 'var(--fd)',
                                          }}
                                        >
                                          {fmtINR(pur.total)}
                                        </td>
                                      </tr>
                                    </tfoot>
                                  </table>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
