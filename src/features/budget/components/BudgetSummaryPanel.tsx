import React from 'react';
import { FormHeaderState } from '../hooks/useBudgetReducer';

type BudgetSummaryPanelProps = {
  linesBudgetSum: number;
  headerCapNum: number | null;
  headerRemaining: number | null;
};

function formatRs(n: number) {
  return new Intl.NumberFormat('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);
}

export const BudgetSummaryPanel: React.FC<BudgetSummaryPanelProps> = ({
  linesBudgetSum,
  headerCapNum,
  headerRemaining,
}) => {
  return (
    <div
      style={{
        marginTop: 20,
        paddingTop: 16,
        borderTop: '1px solid var(--bdr)',
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
        gap: 12,
        alignItems: 'start',
      }}
    >
      <div>
        <div
          style={{
            fontSize: 10,
            fontWeight: 600,
            color: 'var(--txt2)',
            textTransform: 'uppercase',
            letterSpacing: '.04em',
            marginBottom: 4,
          }}
        >
          Total amount
        </div>
        <div style={{ fontSize: 15, fontWeight: 700, fontFamily: 'var(--fm)', color: 'var(--txt)' }}>
          {formatRs(linesBudgetSum)}
        </div>
      </div>
      <div>
        <div
          style={{
            fontSize: 10,
            fontWeight: 600,
            color: 'var(--txt2)',
            textTransform: 'uppercase',
            letterSpacing: '.04em',
            marginBottom: 4,
          }}
        >
          Remaining budget
        </div>
        <div
          style={{
            fontSize: 15,
            fontWeight: 700,
            fontFamily: 'var(--fm)',
            color:
              headerCapNum != null && headerCapNum > 0 && linesBudgetSum > headerCapNum
                ? 'var(--red)'
                : 'var(--txt)',
          }}
        >
          {headerRemaining != null ? formatRs(headerRemaining) : '—'}
        </div>
      </div>
      {headerCapNum != null && headerCapNum > 0 && linesBudgetSum > headerCapNum && (
        <div
          style={{
            gridColumn: '1 / -1',
            padding: '8px 12px',
            background: 'var(--red-lt, #fff0f0)',
            border: '1px solid var(--red)',
            borderRadius: 7,
            color: 'var(--red)',
            fontSize: 12,
            fontWeight: 600,
          }}
        >
          Combined total ({formatRs(linesBudgetSum)}) exceeds total budget ({formatRs(headerCapNum)}) by{' '}
          {formatRs(linesBudgetSum - headerCapNum)}
        </div>
      )}
    </div>
  );
};
