import { useReducer } from 'react';
import { ID } from '../../../services/types/api.types';

export type BudgetLineItem = {
  key: string;
  form_type: string;
  drug_ids: ID[];
  allocated_pct: number | string;
  budget_amount: number | string;
  spent_amount: number;
};

export type FormHeaderState = {
  institution_type_ids: ID[];
  financial_year_id: ID | '';
  scheme_id: ID | '';
  quarter_id: ID | '';
  total_budget_cap: number | string;
};

export type BudgetFormState = {
  showForm: boolean;
  editRow: Record<string, any> | null;
  formHeader: FormHeaderState;
  formLines: BudgetLineItem[];
  drugPickerLineKey: string | null;
  drugPickerDraft: ID[];
};

export type BudgetAction =
  | { type: 'OPEN_ADD_FORM' }
  | { type: 'OPEN_EDIT_FORM'; payload: { row: Record<string, any>; instIds: ID[]; cap: string } }
  | { type: 'CLOSE_FORM' }
  | { type: 'UPDATE_FORM_HEADER'; payload: Partial<FormHeaderState> }
  | { type: 'SET_FINANCIAL_YEAR'; payload: ID | '' }
  | { type: 'ADD_LINE_ITEM'; payload: BudgetLineItem }
  | { type: 'REMOVE_LINE_ITEM'; payload: { key: string } }
  | { type: 'UPDATE_LINE_ITEM'; payload: { key: string; changes: Partial<BudgetLineItem>; totalBudgetCap: number } }
  | { type: 'SET_FORM_LINES'; payload: BudgetLineItem[] }
  | { type: 'OPEN_DRUG_PICKER'; payload: { key: string; draft: ID[] } }
  | { type: 'CLOSE_DRUG_PICKER' }
  | { type: 'SET_DRUG_PICKER_DRAFT'; payload: ID[] }
  | { type: 'APPLY_DRUGS_TO_LINE' };

const newLineKey = () => `L-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

export const emptyFormLine = (spent = 0): BudgetLineItem => ({
  key: newLineKey(),
  form_type: '',
  drug_ids: [],
  allocated_pct: '',
  budget_amount: '',
  spent_amount: spent,
});

const num = (v: string | number | undefined | null) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

const initialState: BudgetFormState = {
  showForm: false,
  editRow: null,
  formHeader: {
    institution_type_ids: [],
    financial_year_id: '',
    scheme_id: '',
    quarter_id: '',
    total_budget_cap: '',
  },
  formLines: [emptyFormLine()],
  drugPickerLineKey: null,
  drugPickerDraft: [],
};

const budgetReducer = (state: BudgetFormState, action: BudgetAction): BudgetFormState => {
  switch (action.type) {
    case 'OPEN_ADD_FORM':
      return {
        ...state,
        showForm: true,
        editRow: null,
        drugPickerLineKey: null,
        drugPickerDraft: [],
        formHeader: {
          institution_type_ids: [],
          financial_year_id: '',
          scheme_id: '',
          quarter_id: '',
          total_budget_cap: '',
        },
        formLines: [emptyFormLine()],
      };

    case 'OPEN_EDIT_FORM':
      return {
        ...state,
        showForm: true,
        editRow: action.payload.row,
        drugPickerLineKey: null,
        drugPickerDraft: [],
        formHeader: {
          institution_type_ids: action.payload.instIds,
          financial_year_id: action.payload.row.financial_year_id != null ? String(action.payload.row.financial_year_id) : '',
          scheme_id: action.payload.row.scheme_id != null ? String(action.payload.row.scheme_id) : '',
          quarter_id: action.payload.row.quarter_id != null ? String(action.payload.row.quarter_id) : '',
          total_budget_cap: action.payload.cap,
        },
        formLines: [
          {
            key: String(action.payload.row.id),
            form_type: action.payload.row.form_type != null ? String(action.payload.row.form_type) : (action.payload.row.scheme_name ? String(action.payload.row.scheme_name) : ''),
            drug_ids: Array.isArray(action.payload.row.drug_ids) ? action.payload.row.drug_ids.map(String) : [],
            allocated_pct: action.payload.row.allocated_pct != null ? action.payload.row.allocated_pct : '',
            budget_amount: action.payload.row.budget_amount != null ? action.payload.row.budget_amount : '',
            spent_amount: num(action.payload.row.spent_amount),
          },
        ],
      };

    case 'CLOSE_FORM':
      return {
        ...state,
        showForm: false,
        editRow: null,
        drugPickerLineKey: null,
        drugPickerDraft: [],
        formHeader: {
          institution_type_ids: [],
          financial_year_id: '',
          scheme_id: '',
          quarter_id: '',
          total_budget_cap: '',
        },
        formLines: [emptyFormLine()],
      };

    case 'UPDATE_FORM_HEADER':
      return {
        ...state,
        formHeader: { ...state.formHeader, ...action.payload },
      };

    case 'SET_FINANCIAL_YEAR':
      return {
        ...state,
        formHeader: {
          ...state.formHeader,
          financial_year_id: action.payload,
          quarter_id: '',
          scheme_id: '',
        },
      };

    case 'ADD_LINE_ITEM':
      return {
        ...state,
        formLines: [...state.formLines, action.payload],
      };

    case 'REMOVE_LINE_ITEM':
      return {
        ...state,
        formLines: state.formLines.filter((item) => item.key !== action.payload.key),
      };

    case 'SET_FORM_LINES':
      return {
        ...state,
        formLines: action.payload,
      };

    case 'UPDATE_LINE_ITEM': {
      const cap = action.payload.totalBudgetCap;
      const patch = action.payload.changes;
      return {
        ...state,
        formLines: state.formLines.map((line) => {
          if (line.key !== action.payload.key) return line;
          const next = { ...line, ...patch };
          if ('budget_amount' in patch && cap > 0) {
            next.allocated_pct = patch.budget_amount === '' ? '' : parseFloat(((num(patch.budget_amount) / cap) * 100).toFixed(2));
          } else if ('allocated_pct' in patch && cap > 0) {
            next.budget_amount = patch.allocated_pct === '' ? '' : parseFloat(((num(patch.allocated_pct) / 100) * cap).toFixed(2));
          }
          return next;
        }),
      };
    }

    case 'OPEN_DRUG_PICKER':
      return {
        ...state,
        drugPickerLineKey: action.payload.key,
        drugPickerDraft: action.payload.draft,
      };

    case 'CLOSE_DRUG_PICKER':
      return {
        ...state,
        drugPickerLineKey: null,
        drugPickerDraft: [],
      };

    case 'SET_DRUG_PICKER_DRAFT':
      return {
        ...state,
        drugPickerDraft: action.payload,
      };

    case 'APPLY_DRUGS_TO_LINE':
      if (!state.drugPickerLineKey) return state;
      return {
        ...state,
        formLines: state.formLines.map((line) =>
          line.key === state.drugPickerLineKey
            ? { ...line, drug_ids: state.drugPickerDraft }
            : line
        ),
        drugPickerLineKey: null,
        drugPickerDraft: [],
      };

    default:
      return state;
  }
};

export const useBudgetReducer = () => {
  const [state, dispatch] = useReducer(budgetReducer, initialState);

  const linesBudgetSum = state.formLines.reduce(
    (s, L) => s + num(L.budget_amount === '' || L.budget_amount == null ? 0 : L.budget_amount),
    0
  );

  const headerCapNum =
    state.formHeader.total_budget_cap === '' || state.formHeader.total_budget_cap == null
      ? null
      : num(state.formHeader.total_budget_cap);

  const headerRemaining =
    headerCapNum != null && Number.isFinite(headerCapNum) && headerCapNum >= 0
      ? Math.max(0, headerCapNum - linesBudgetSum)
      : null;

  return {
    state,
    actions: {
      openAddForm: () => dispatch({ type: 'OPEN_ADD_FORM' }),
      openEditForm: (row: Record<string, any>, instIds: ID[], cap: string) =>
        dispatch({ type: 'OPEN_EDIT_FORM', payload: { row, instIds, cap } }),
      closeForm: () => dispatch({ type: 'CLOSE_FORM' }),
      updateFormHeader: (payload: Partial<FormHeaderState>) =>
        dispatch({ type: 'UPDATE_FORM_HEADER', payload }),
      setFinancialYear: (payload: ID | '') =>
        dispatch({ type: 'SET_FINANCIAL_YEAR', payload }),
      addLineItem: (item: BudgetLineItem) => dispatch({ type: 'ADD_LINE_ITEM', payload: item }),
      removeLineItem: (key: string) => dispatch({ type: 'REMOVE_LINE_ITEM', payload: { key } }),
      updateLineItem: (key: string, changes: Partial<BudgetLineItem>, totalBudgetCap: number) =>
        dispatch({ type: 'UPDATE_LINE_ITEM', payload: { key, changes, totalBudgetCap } }),
      setFormLines: (payload: BudgetLineItem[]) => dispatch({ type: 'SET_FORM_LINES', payload }),
      openDrugPicker: (key: string, draft: ID[]) => dispatch({ type: 'OPEN_DRUG_PICKER', payload: { key, draft } }),
      closeDrugPicker: () => dispatch({ type: 'CLOSE_DRUG_PICKER' }),
      setDrugPickerDraft: (payload: ID[]) => dispatch({ type: 'SET_DRUG_PICKER_DRAFT', payload }),
      applyDrugsToLine: () => dispatch({ type: 'APPLY_DRUGS_TO_LINE' }),
    },
    derived: {
      linesBudgetSum,
      headerCapNum,
      headerRemaining,
    },
  };
};
