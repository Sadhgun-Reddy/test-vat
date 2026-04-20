import React from 'react';
import { inputStyle, Btn } from '../../../components/ui';
import { BudgetLineItem, emptyFormLine } from '../hooks/useBudgetReducer';

const TABLE_CTRL = {
  minHeight: 36,
  boxSizing: 'border-box' as const,
};

function formatRs(n: number) {
  return new Intl.NumberFormat('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);
}

const num = (v: any) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

type BudgetLineItemsTableProps = {
  formLines: BudgetLineItem[];
  editRow: any;
  formTypeOptions: string[];
  headerCapNum: number | null;
  linesBudgetSum: number;
  isOnline: boolean;
  updateLineItem: (key: string, changes: Partial<BudgetLineItem>, totalBudgetCap: number) => void;
  removeLineItem: (key: string) => void;
  addLineItem: (item: BudgetLineItem) => void;
  openDrugPicker: (line: BudgetLineItem) => void;
};

export const BudgetLineItemsTable: React.FC<BudgetLineItemsTableProps> = ({
  formLines,
  editRow,
  formTypeOptions,
  headerCapNum,
  linesBudgetSum,
  isOnline,
  updateLineItem,
  removeLineItem,
  addLineItem,
  openDrugPicker,
}) => {
  const cap = headerCapNum || 0;

  return (
    <>
      <div
        style={{
          border: '1px solid var(--bdr)',
          borderRadius: 8,
          overflow: 'hidden',
          background: '#fff',
        }}
      >
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 600 }}>
            <thead>
              <tr style={{ background: 'var(--bg2)', borderBottom: '1px solid var(--bdr)' }}>
                <th
                  style={{
                    textAlign: 'left',
                    fontSize: 11,
                    fontWeight: 600,
                    color: 'var(--txt2)',
                    padding: '8px 10px',
                    width: '30%',
                  }}
                >
                  Form Type
                </th>
                <th
                  style={{
                    textAlign: 'center',
                    fontSize: 11,
                    fontWeight: 600,
                    color: 'var(--txt2)',
                    padding: '8px 10px',
                    width: 100,
                  }}
                >
                  Allocated %
                </th>
                <th
                  style={{
                    textAlign: 'center',
                    fontSize: 11,
                    fontWeight: 600,
                    color: 'var(--txt2)',
                    padding: '8px 10px',
                    width: 130,
                  }}
                >
                  Budget (₹)
                </th>
                <th
                  style={{
                    textAlign: 'center',
                    fontSize: 11,
                    fontWeight: 600,
                    color: 'var(--txt2)',
                    padding: '8px 10px',
                    width: 100,
                  }}
                >
                  Calculated
                </th>
                <th
                  style={{
                    textAlign: 'center',
                    fontSize: 11,
                    fontWeight: 600,
                    color: 'var(--txt2)',
                    padding: '8px 10px',
                    width: 120,
                  }}
                >
                  Drugs
                </th>
                {!editRow && formLines.length > 1 ? (
                  <th style={{ padding: '8px 10px', width: 80 }} aria-label="Row actions" />
                ) : null}
              </tr>
            </thead>
            <tbody>
              {formLines.map((line) => {
                const nDrugs = Array.isArray(line.drug_ids) ? line.drug_ids.length : 0;
                const rowPad = { verticalAlign: 'middle', padding: '10px 8px' };
                const ctrl = {
                  ...inputStyle(),
                  ...TABLE_CTRL,
                  background: 'var(--bg1)',
                  padding: '8px 10px',
                };
                return (
                  <tr key={line.key}>
                    <td style={{ ...rowPad, paddingLeft: 10, textAlign: 'left' }}>
                      <select
                        value={line.form_type}
                        onChange={(e) => updateLineItem(line.key, { form_type: e.target.value }, cap)}
                        style={{ ...ctrl, width: '100%' }}
                      >
                        <option value="">Select…</option>
                        {formTypeOptions.map((opt) => (
                          <option key={opt} value={opt}>
                            {opt}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td style={{ ...rowPad, textAlign: 'center' }}>
                      <input
                        type="number"
                        step="any"
                        min={0}
                        value={line.allocated_pct}
                        onChange={(e) =>
                          updateLineItem(
                            line.key,
                            { allocated_pct: e.target.value === '' ? '' : num(e.target.value) },
                            cap
                          )
                        }
                        style={{ ...ctrl, width: '100%', maxWidth: 96, textAlign: 'center', margin: '0 auto', display: 'block' }}
                      />
                    </td>
                    <td style={{ ...rowPad, textAlign: 'center' }}>
                      <input
                        type="number"
                        step="any"
                        min={0}
                        value={line.budget_amount}
                        onChange={(e) =>
                          updateLineItem(
                            line.key,
                            { budget_amount: e.target.value === '' ? '' : num(e.target.value) },
                            cap
                          )
                        }
                        style={{ ...ctrl, width: '100%', maxWidth: 112, textAlign: 'center', margin: '0 auto', display: 'block' }}
                      />
                    </td>
                    <td style={{ ...rowPad, textAlign: 'center' }}>
                      {(() => {
                        const amt = num(line.budget_amount) || 0;
                        const pctVal =
                          line.allocated_pct === '' || line.allocated_pct == null
                            ? 0
                            : num(line.allocated_pct);
                        const totalOver = cap > 0 && linesBudgetSum > cap;
                        return (
                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, justifyContent: 'center', minHeight: TABLE_CTRL.minHeight }}>
                            <span style={{ fontSize: 12, fontWeight: 700, color: totalOver ? 'var(--red)' : 'var(--grn)' }}>
                              {pctVal}%
                            </span>
                            <span style={{ fontSize: 11, color: 'var(--txt2)', fontVariantNumeric: 'tabular-nums' }}>
                              {formatRs(amt)}
                            </span>
                          </div>
                        );
                      })()}
                    </td>
                    <td style={{ ...rowPad, textAlign: 'center' }}>
                      <button
                        type="button"
                        onClick={() => openDrugPicker(line)}
                        disabled={!isOnline}
                        style={{
                          ...TABLE_CTRL,
                          padding: '0 12px',
                          fontSize: 11,
                          fontWeight: 600,
                          fontFamily: 'var(--fb)',
                          borderRadius: 8,
                          border: '1px solid var(--blu-bdr)',
                          background: 'var(--bg1)',
                          color: 'var(--blu)',
                          cursor: !isOnline ? 'not-allowed' : 'pointer',
                          whiteSpace: 'nowrap',
                          width: '100%',
                          maxWidth: 168,
                        }}
                      >
                        {nDrugs > 0 ? `Drugs (${nDrugs})` : 'Select drugs'}
                      </button>
                    </td>
                    {!editRow && formLines.length > 1 ? (
                      <td style={{ ...rowPad, paddingRight: 10, textAlign: 'center' }}>
                        <button
                          type="button"
                          title="Remove row"
                          onClick={() => removeLineItem(line.key)}
                          style={{
                            ...TABLE_CTRL,
                            padding: '0 10px',
                            fontSize: 11,
                            borderRadius: 6,
                            border: '1px solid var(--red-bdr)',
                            background: 'var(--red-lt)',
                            color: 'var(--red)',
                            cursor: 'pointer',
                            fontFamily: 'var(--fb)',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          Remove
                        </button>
                      </td>
                    ) : null}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {!editRow && (
        <div style={{ marginTop: 16 }}>
          {/* @ts-expect-error Untyped component */}
          <Btn variant="outline" size="sm" type="button" onClick={() => addLineItem(emptyFormLine())}>
            + Add more
          </Btn>
        </div>
      )}
    </>
  );
};
