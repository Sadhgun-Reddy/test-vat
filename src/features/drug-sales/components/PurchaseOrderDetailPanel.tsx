import React from 'react';

import { Btn } from '../../../components/ui';

const fmtINR = (n: any) =>
  `₹${Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;

function DrugNameCode({ name, code, nameSize = 12 }: any) {
  const hasCode = code != null && String(code).trim() !== '';
  return (
    <>
      <div style={{ fontSize: nameSize, fontWeight: 500, lineHeight: 1.25 }}>{name}</div>
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

export function PurchaseOrderDetailPanel({
  editingPO,
  setEditingPO,
  activeTab,
  filteredPlaces,
  toPlaceOfWorkingId,
  editItems,
  setEditItems,
  purchaseNote,
  setPurchaseNote,
  savePurchaseIsPending,
  updatePOIsPending,
  onSavePurchase,
  onUpdatePO,
  poHistory,
}: any) {
  const editSubtotal = editItems.reduce((s: any, i: any) => s + i.quantity * i.unit_price, 0);
  const editTax = editItems.reduce(
    (s: any, i: any) => s + (i.quantity * i.unit_price * (parseFloat(i.gst_pct) || 0)) / 100,
    0
  );
  const editTotal = editSubtotal + editTax;

  const origItems = editingPO.items || [];
  const isClosed = activeTab === 'purchase' && editingPO.status === 'closed';
  const hasMismatch =
    !isClosed &&
    activeTab === 'purchase' &&
    (editItems.length !== origItems.length ||
      editItems.some((ei: any) => {
        const orig = origItems.find((o: any) => o.drug_id === ei.drug_id);
        return (
          !orig ||
          Number(orig.quantity) !== Number(ei.quantity) ||
          Number(orig.unit_price) !== Number(ei.unit_price)
        );
      }) ||
      origItems.some((o: any) => !editItems.find((ei: any) => ei.drug_id === o.drug_id)));
  const canSave = !isClosed && (!hasMismatch || purchaseNote.trim().length > 0);

  return (
    <div style={{ flex: 1, overflow: 'auto', padding: 20 }}>
      {/* PO header info */}
      <div
        style={{
          background: '#fff',
          borderRadius: 10,
          border: '1px solid var(--bdr)',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            padding: '12px 16px',
            background: editingPO.status === 'closed' ? 'var(--grn-lt,#f0fdf4)' : 'var(--blu-lt)',
            borderBottom: `1px solid ${editingPO.status === 'closed' ? 'var(--grn)' : 'var(--blu-bdr)'}`,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span
                style={{
                  fontWeight: 800,
                  fontSize: 14,
                  color: editingPO.status === 'closed' ? 'var(--grn)' : 'var(--blu)',
                }}
              >
                {editingPO.invoice_no}
              </span>
              <span
                style={{
                  fontSize: 10,
                  fontWeight: 700,
                  padding: '2px 7px',
                  borderRadius: 10,
                  background: editingPO.status === 'closed' ? 'var(--grn)' : 'var(--blu)',
                  color: '#fff',
                }}
              >
                {editingPO.status === 'closed' ? '✓ CLOSED' : 'DRAFT'}
              </span>
            </div>
            <div style={{ fontSize: 11, color: 'var(--txt3)', marginTop: 4 }}>
              Date: {editingPO.sale_date?.slice(0, 10)} &nbsp;·&nbsp;{' '}
              {(editingPO.items || []).length} items
              {activeTab === 'transfer' && toPlaceOfWorkingId && (
                <span>
                  &nbsp;·&nbsp; To:{' '}
                  <strong>
                    {filteredPlaces.find((p: any) => p.id === toPlaceOfWorkingId)?.name}
                  </strong>
                </span>
              )}
            </div>
            {editingPO.status === 'closed' && editingPO.purchase_invoice_no && (
              <div style={{ fontSize: 11, color: 'var(--grn)', marginTop: 4, fontWeight: 600 }}>
                Purchase: {editingPO.purchase_invoice_no}
              </div>
            )}
            {editingPO.status === 'closed' && editingPO.purchase_notes && (
              <div
                style={{
                  fontSize: 11,
                  color: 'var(--txt2)',
                  marginTop: 4,
                  fontStyle: 'italic',
                  maxWidth: 420,
                }}
              >
                Note: {editingPO.purchase_notes}
              </div>
            )}
          </div>
          <button
            type="button"
            onClick={() => {
              setEditingPO(null);
              setPurchaseNote('');
            }}
            style={{
              background: 'none',
              border: 'none',
              fontSize: 18,
              cursor: 'pointer',
              color: 'var(--txt3)',
            }}
          >
            ×
          </button>
        </div>

        {/* Items table */}
        <table style={{ width: '100%', tableLayout: 'fixed', borderCollapse: 'collapse' }}>
          <colgroup>
            <col />
            <col style={{ width: 100 }} />
            <col style={{ width: 112 }} />
            <col style={{ width: 120 }} />
          </colgroup>
          <thead>
            <tr style={{ background: 'var(--bg1)' }}>
              {['Drug', 'Qty', 'Unit Price', 'Total'].map((h, i) => (
                <th
                  key={h}
                  style={{
                    padding: '9px 14px',
                    textAlign: i > 0 ? 'right' : 'left',
                    verticalAlign: 'middle',
                    fontSize: 11,
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    color: 'var(--txt3)',
                    borderBottom: '1px solid var(--bdr)',
                  }}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {editItems.map((item: any, i: number) => (
              <tr key={i} style={{ borderBottom: '1px solid var(--bdr)' }}>
                <td style={{ padding: '10px 14px' }}>
                  <DrugNameCode name={item.drug_name} code={item.drug_code} nameSize={13} />
                </td>
                <td style={{ padding: '7px 14px', textAlign: 'right' }}>
                  <input
                    type="number"
                    min="0"
                    value={item.quantity}
                    onChange={(e) =>
                      setEditItems((prev: any) =>
                        prev.map((it: any, idx: number) =>
                          idx === i ? { ...it, quantity: parseFloat(e.target.value) || 0 } : it
                        )
                      )
                    }
                    style={{
                      width: 80,
                      padding: '5px 8px',
                      border: '1px solid var(--bdr2)',
                      borderRadius: 6,
                      fontSize: 12,
                      textAlign: 'right',
                      fontFamily: 'var(--fb)',
                      outline: 'none',
                    }}
                  />
                </td>
                <td style={{ padding: '7px 14px', textAlign: 'right' }}>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={item.unit_price}
                    onChange={(e) =>
                      setEditItems((prev: any) =>
                        prev.map((it: any, idx: number) =>
                          idx === i ? { ...it, unit_price: parseFloat(e.target.value) || 0 } : it
                        )
                      )
                    }
                    style={{
                      width: 100,
                      padding: '5px 8px',
                      border: '1px solid var(--bdr2)',
                      borderRadius: 6,
                      fontSize: 12,
                      textAlign: 'right',
                      fontFamily: 'var(--fb)',
                      outline: 'none',
                    }}
                  />
                </td>
                <td
                  style={{
                    padding: '10px 14px',
                    fontSize: 13,
                    fontWeight: 600,
                    textAlign: 'right',
                  }}
                >
                  {fmtINR(item.quantity * item.unit_price)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Closed state banner */}
        {activeTab === 'purchase' && editingPO.status === 'closed' && (
          <div
            style={{
              padding: '10px 16px',
              background: 'var(--grn-lt,#f0fdf4)',
              borderTop: '1px solid var(--grn)',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }}
          >
            <span style={{ fontSize: 18 }}>✅</span>
            <div>
              <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--grn)' }}>
                Purchase already saved — this order is closed
              </div>
              <div style={{ fontSize: 11, color: 'var(--txt3)' }}>
                No further changes can be made to this purchase order.
              </div>
            </div>
          </div>
        )}

        {/* Mismatch detection — compare editItems vs original PO items */}
        {!isClosed && !hasMismatch && activeTab === 'purchase' && (
          <div
            style={{
              padding: '8px 16px',
              borderTop: '1px solid var(--grn)',
              background: 'var(--grn-lt,#f0fdf4)',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            <span style={{ fontSize: 13 }}>✓</span>
            <span style={{ fontSize: 11, color: 'var(--grn)', fontWeight: 600 }}>
              Items match the purchase order — saving will close this order
            </span>
          </div>
        )}
        {hasMismatch && (
          <div
            style={{
              padding: '10px 16px',
              borderTop: '1px solid #fcd34d',
              background: 'var(--amber-lt,#fff8e6)',
            }}
          >
            <div style={{ fontSize: 11, fontWeight: 700, color: '#b45309', marginBottom: 6 }}>
              ⚠ Items differ from the purchase order — you can save but the order will stay open
              until they match. A note is required.
            </div>
            {editItems.map((ei: any) => {
              const orig = origItems.find((o: any) => o.drug_id === ei.drug_id);
              const qtyDiff = orig ? Number(ei.quantity) - Number(orig.quantity) : null;
              const priceDiff = orig ? Number(ei.unit_price) - Number(orig.unit_price) : null;
              if (!orig || (qtyDiff === 0 && priceDiff === 0)) return null;
              return (
                <div key={ei.drug_id} style={{ fontSize: 10, color: '#92400e', marginBottom: 3 }}>
                  <strong>{ei.drug_name}</strong>
                  {ei.drug_code != null && String(ei.drug_code).trim() !== '' && (
                    <span style={{ fontWeight: 600, color: '#a16207' }}> · {ei.drug_code}</span>
                  )}
                  {qtyDiff !== 0 && (
                    <span>
                      {' '}
                      · Qty: {Number(orig.quantity)} → {ei.quantity} ({qtyDiff! > 0 ? '+' : ''}
                      {qtyDiff})
                    </span>
                  )}
                  {priceDiff !== 0 && (
                    <span>
                      {' '}
                      · Price: {fmtINR(orig.unit_price)} → {fmtINR(ei.unit_price)}
                    </span>
                  )}
                </div>
              );
            })}
            {origItems
              .filter((o: any) => !editItems.find((ei: any) => ei.drug_id === o.drug_id))
              .map((o: any) => (
                <div key={o.drug_id} style={{ fontSize: 10, color: '#92400e', marginBottom: 3 }}>
                  <strong>{o.drug_name}</strong>
                  {o.drug_code != null && String(o.drug_code).trim() !== '' && (
                    <span style={{ fontWeight: 600, color: '#a16207' }}> · {o.drug_code}</span>
                  )}{' '}
                  · Removed from purchase
                </div>
              ))}
            <textarea
              value={purchaseNote}
              onChange={(e) => setPurchaseNote(e.target.value)}
              placeholder="Explain the reason for changes (required)…"
              rows={2}
              style={{
                width: '100%',
                marginTop: 8,
                padding: '6px 8px',
                border: `1px solid ${purchaseNote.trim() ? 'var(--grn)' : '#f59e0b'}`,
                borderRadius: 6,
                fontSize: 12,
                fontFamily: 'var(--fb)',
                outline: 'none',
                resize: 'vertical',
                boxSizing: 'border-box',
              }}
            />
          </div>
        )}

        {/* Footer */}
        <div
          style={{
            padding: '12px 16px',
            borderTop: '1px solid var(--bdr)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            background: 'var(--bg1)',
          }}
        >
          <div style={{ fontSize: 12, color: 'var(--txt2)', display: 'flex', gap: 24 }}>
            <span>
              Subtotal: <strong>{fmtINR(editSubtotal)}</strong>
            </span>
            <span>
              Tax: <strong>{fmtINR(editTax)}</strong>
            </span>
            <span style={{ fontSize: 14, color: 'var(--txt)', fontWeight: 800 }}>
              Total: {fmtINR(editTotal)}
            </span>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <Btn
              variant="ghost"
              block={false}
              disabled={false}
              onClick={() => {
                setEditingPO(null);
                setPurchaseNote('');
              }}
            >
              Cancel
            </Btn>
            <Btn
              variant="primary"
              block={false}
              disabled={
                (activeTab === 'purchase' ? savePurchaseIsPending : updatePOIsPending) ||
                (activeTab === 'transfer' && !toPlaceOfWorkingId) ||
                (activeTab === 'purchase' && !canSave)
              }
              onClick={() => {
                if (activeTab === 'purchase') {
                  onSavePurchase({ editSubtotal, editTax, editTotal });
                } else {
                  onUpdatePO({ editSubtotal, editTax, editTotal });
                }
              }}
            >
              {(activeTab === 'purchase' ? savePurchaseIsPending : updatePOIsPending)
                ? 'Saving…'
                : activeTab === 'transfer'
                  ? 'Save as Transfer'
                  : 'Save as Purchase'}
            </Btn>
          </div>
        </div>
      </div>

      {/* Purchase history for this PO */}
      {activeTab === 'purchase' && poHistory?.length > 0 && (
        <div
          style={{
            background: '#fff',
            borderRadius: 10,
            border: '1px solid var(--bdr)',
            overflow: 'hidden',
            marginTop: 16,
          }}
        >
          <div
            style={{
              padding: '10px 16px',
              background: 'var(--bg1)',
              borderBottom: '1px solid var(--bdr)',
              fontSize: 11,
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '.05em',
              color: 'var(--txt3)',
            }}
          >
            Purchase History ({poHistory.length})
          </div>
          {poHistory.map((pur: any, pi: number) => (
            <div
              key={pur.id}
              style={{ borderBottom: pi < poHistory.length - 1 ? '1px solid var(--bdr)' : 'none' }}
            >
              <div
                style={{
                  padding: '10px 16px',
                  background: 'var(--bg1)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--blu)' }}>
                      {pur.invoice_no}
                    </span>
                    <span style={{ fontSize: 10, color: 'var(--txt3)' }}>
                      {pur.purchase_date?.slice(0, 10)}
                    </span>
                  </div>
                  {pur.notes && (
                    <div
                      style={{
                        marginTop: 4,
                        padding: '4px 8px',
                        background: 'var(--amber-lt,#fff8e6)',
                        borderRadius: 5,
                        border: '1px solid #fcd34d',
                        fontSize: 10,
                        color: '#92400e',
                        maxWidth: 500,
                      }}
                    >
                      <strong>Note:</strong> {pur.notes}
                    </div>
                  )}
                </div>
                <span style={{ fontSize: 13, fontWeight: 800, whiteSpace: 'nowrap' }}>
                  {fmtINR(pur.total)}
                </span>
              </div>
              <table
                style={{
                  width: '100%',
                  tableLayout: 'fixed',
                  borderCollapse: 'collapse',
                  minWidth: 560,
                }}
              >
                <colgroup>
                  <col />
                  <col style={{ width: 52 }} />
                  <col style={{ width: 92 }} />
                  <col style={{ width: 56 }} />
                  <col style={{ width: 88 }} />
                  <col style={{ width: 100 }} />
                </colgroup>
                <thead>
                  <tr style={{ background: 'var(--bg1)' }}>
                    {['Item', 'Qty', 'Unit Price', 'GST %', 'GST Amt', 'Total'].map((h, i) => (
                      <th
                        key={h}
                        style={{
                          padding: '6px 12px',
                          textAlign: i === 0 ? 'left' : 'right',
                          verticalAlign: 'middle',
                          fontSize: 10,
                          fontWeight: 700,
                          textTransform: 'uppercase',
                          letterSpacing: '.05em',
                          color: 'var(--txt3)',
                          borderBottom: '1px solid var(--bdr)',
                          borderTop: '1px solid var(--bdr)',
                        }}
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {(pur.items || []).map((item: any, ii: number) => {
                    const pBase = Number(item.quantity) * Number(item.unit_price);
                    const pGst = (pBase * (parseFloat(item.gst_pct) || 0)) / 100;
                    return (
                      <tr key={ii} style={{ borderBottom: '1px solid var(--bdr)' }}>
                        <td
                          style={{
                            padding: '8px 12px',
                            overflow: 'hidden',
                            verticalAlign: 'middle',
                          }}
                        >
                          <DrugNameCode name={item.drug_name} code={item.drug_code} />
                        </td>
                        <td
                          style={{
                            padding: '8px 12px',
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
                            padding: '8px 12px',
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
                            padding: '8px 12px',
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
                            padding: '8px 12px',
                            textAlign: 'right',
                            fontSize: 12,
                            fontWeight: 700,
                            verticalAlign: 'middle',
                            fontFamily: 'var(--fd)',
                            color: 'var(--txt2)',
                          }}
                        >
                          {fmtINR(pGst)}
                        </td>
                        <td
                          style={{
                            padding: '8px 12px',
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
              </table>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
