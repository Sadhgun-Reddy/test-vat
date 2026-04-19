import { useState, useMemo, useRef, useEffect } from 'react';
import toast from 'react-hot-toast';
import { useSaleForm } from './useSaleForm';
import { useSaleFilters } from './useSaleFilters';
import { useCreateDrugSale } from '../../../hooks/api/useDrugs';
import {
  useCreatePurchaseOrder,
  useCreatePurchaseOrderDraft,
  useUpdatePurchaseOrder,
  useCreatePurchase,
  usePurchaseOrders,
  usePurchasesForPO,
} from '../../../hooks/api/useProcurement';
import { ID } from '../../../services/types/api.types';

const fmtINR = (n: any) => `₹${Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;

export function useSaleOrchestrator({ editSale, editPO, editPurchase, editTransfer, editFilterSeed, seedTab, isOnline, user }: any) {
  const skipResetRef = useRef(!!(editSale || editPO || editPurchase || editTransfer));

  const buildCart = (items: any) => (items || []).map((i: any) => ({
    drug_id: i.drug_id, name: i.drug_name, code: i.drug_code || '', unit: '', qty: Number(i.quantity), unit_price: Number(i.unit_price), lineDiscount: Number(i.discount) || 0, gstPct: Number(i.gst_pct) || 0,
  }));

  const initialCart = useMemo(() => {
    if (editSale) return buildCart(editSale.items);
    if (editPO) return buildCart(editPO.items);
    if (editPurchase) return buildCart(editPurchase.items);
    if (editTransfer) return [{ drug_id: editTransfer.drug_id, name: editTransfer.drug_name, code: '', unit: '', qty: Number(editTransfer.quantity), unit_price: Number(editTransfer.unit_price) || 0, lineDiscount: 0, gstPct: 0 }];
    return [];
  }, [editSale, editPO, editPurchase, editTransfer]);

  const {
    cartItems, setCartItems, globalDiscount, setGlobalDiscount, payMethod, setPayMethod, amtReceived, setAmtReceived, subtotalSale, subtotalPO, taxPO, displaySubtotal, displayTax, total, change, addToCart, removeItem, updateQty, updateDisc, updateGstPct, resetForm
  } = useSaleForm({
    initialCart, initialDiscount: Number(editSale?.discount) || 0, initialPayMethod: editSale?.payment_method || 'cash', isPO: seedTab === 'purchase_order' || seedTab === 'purchase' || seedTab === 'transfer',
  });

  const [searchQ, setSearchQ] = useState('');
  const [saleType, setSaleType] = useState('drug_indent');
  const [saleComplete, setSaleComplete] = useState(false);
  const [activeTab, setActiveTab] = useState(seedTab);
  const [filtersApplied, setFiltersApplied] = useState(false);
  const [editingPO, setEditingPO] = useState<any>(null);
  const [editItems, setEditItems] = useState<any[]>([]);
  const [editingCartPOId, setEditingCartPOId] = useState<ID | null>(editPO?.id || null);
  const [expandedHistoryId, setExpandedHistoryId] = useState<ID | null>(null);
  const [expandedHistoryPurchaseKey, setExpandedHistoryPurchaseKey] = useState<string | null>(null);
  const [purchaseNote, setPurchaseNote] = useState('');
  const [selectedAllocationIds, setSelectedAllocationIds] = useState<Set<ID>>(
    editPO?.allocation_id ? new Set([editPO.allocation_id]) : new Set()
  );
  const [draftDismissed, setDraftDismissed] = useState(false);
  const invoiceNo = useMemo(() => `INV-${Date.now()}`, []);

  const isPO = activeTab === 'purchase_order';

  const filterProps = useSaleFilters({
    isOnline, seedTab, editFilterSeed, userDistrictId: user?.district_id as ID, saleType,
  });

  const [poFetchTick, setPoFetchTick] = useState(0);

  const { data: purchaseOrdersRaw, isFetching: poListFetching } = usePurchaseOrders({
    place_of_working_id: filterProps.placeOfWorkingId,
    institution_type_id: filterProps.institutionTypeId,
    allocation_id: selectedAllocationIds.size === 1 ? [...selectedAllocationIds][0] : undefined,
    limit: 100, enabled: isOnline && poFetchTick > 0,
  });
  const purchaseOrdersData = purchaseOrdersRaw?.data || (Array.isArray(purchaseOrdersRaw) ? purchaseOrdersRaw : []);

  const { data: poHistoryRaw } = usePurchasesForPO(editingPO?.id, { enabled: isOnline && activeTab === 'purchase' });
  const poHistory = Array.isArray(poHistoryRaw) ? poHistoryRaw : (poHistoryRaw?.data || []);

  const submitSale = useCreateDrugSale();
  const submitPO = useCreatePurchaseOrder();
  const saveDraftMutation = useCreatePurchaseOrderDraft();
  const updatePOMutation = useUpdatePurchaseOrder();
  const savePurchaseMutation = useCreatePurchase();

  const selectedAllocations = filterProps.allocationsForIndent.filter((a: any) => selectedAllocationIds.has(a.id));
  const allocationDrugs = useMemo(() => {
    const seen = new Set();
    return selectedAllocations.flatMap((a: any) => a.drugs || []).filter((d: any) => {
      if (seen.has(d.id)) return false; seen.add(d.id); return true;
    });
  }, [selectedAllocations]);

  useEffect(() => {
    if (skipResetRef.current) { skipResetRef.current = false; return; }
    setFiltersApplied(false); setSelectedAllocationIds(new Set()); resetForm();
    setPoFetchTick(0); setDraftDismissed(false); setExpandedHistoryId(null); setExpandedHistoryPurchaseKey(null);
  }, [saleType, filterProps.financialYearId, filterProps.schemeId, filterProps.quarterId, filterProps.districtId, filterProps.institutionTypeId, filterProps.placeOfWorkingId]);

  const existingDraft = useMemo(() => (purchaseOrdersData || []).find((po: any) => po.status === 'draft' && (po.items || []).length > 0) ?? null, [purchaseOrdersData]);

  const purchaseOrdersHistoryList = useMemo(() => {
    const rows = (purchaseOrdersData || []).filter((po: any) => (po.status || '') !== 'draft');
    return [...rows].sort((a, b) => { const t = (x: any) => new Date(x.created_at || x.sale_date || 0).getTime(); return t(b) - t(a); });
  }, [purchaseOrdersData]);

  const selectedGroupBudget = selectedAllocations.reduce((s: any, a: any) => s + Number(a.budget_amount), 0);
  const selectedGroupSpent = selectedAllocations.reduce((s: any, a: any) => s + Number(a.spent_amount || 0), 0);
  const poUsedBudget = subtotalPO + taxPO;
  const poOverBudget = selectedAllocations.length > 0 && poUsedBudget > selectedGroupBudget;
  const canSubmitPO = selectedAllocations.length === 0 || !poOverBudget;
  const poReserveBalance = selectedAllocations.length > 0 ? Math.max(0, selectedGroupBudget - selectedGroupSpent - poUsedBudget) : 0;

  const poAllBudgetsNearlyExhausted = useMemo(() => {
    if (!filtersApplied || saleType !== 'drug_indent' || filterProps.allocationsForIndent.length === 0) return false;
    return filterProps.allocationsForIndent.every((a: any) => {
      const budget = Number(a.budget_amount) || 0; const spent = Number(a.spent_amount) || 0;
      if (budget <= 0) return true; return spent >= budget * 0.98 - 1e-6;
    });
  }, [filterProps.allocationsForIndent, filtersApplied, saleType]);

  const hidePoCartAndBill = isPO && saleType === 'drug_indent' && filtersApplied && poAllBudgetsNearlyExhausted;

  useEffect(() => {
    if (!hidePoCartAndBill) return; resetForm(); setSearchQ('');
  }, [hidePoCartAndBill]);

  const handleFilterSearch = () => {
    if (!isOnline) { toast.error('Go online to use filters'); return; }
    if (!filterProps.financialYearId || !filterProps.schemeId || !filterProps.quarterId || !filterProps.districtId || !filterProps.placeOfWorkingId) { toast.error('Please fill all required filters'); return; }
    if (filterProps.institutionTypes.length > 0 && !filterProps.institutionTypeId) { toast.error('Please select institution type'); return; }

    setSelectedAllocationIds(new Set()); resetForm(); setFiltersApplied(true); setPoFetchTick(t => t + 1);
    if (activeTab === 'purchase_order' || activeTab === 'sale') toast.success('Filters applied — select a budget allocation below');
  };

  const handleSaveDraft = () => {
    if (!cartItems.length) { toast.error('Cart is empty'); return; }
    saveDraftMutation.mutate({
      place_of_working_id: filterProps.placeOfWorkingId || null, financial_year_id: filterProps.financialYearId || null,
      scheme_id: filterProps.schemeId || null, quarter_id: filterProps.quarterId || null, institution_type_id: filterProps.institutionTypeId || null,
      allocation_id: selectedAllocationIds.size > 0 ? [...selectedAllocationIds][0] : null,
      subtotal: subtotalPO, tax: taxPO, total,
      items: cartItems.map((i) => ({ drug_id: i.drug_id, quantity: i.qty, unit_price: i.unit_price, discount: 0, gst_pct: parseFloat(i.gstPct as any) || 0 })),
    }, {
      onSuccess: () => { toast.success('Draft saved'); setPoFetchTick(t => t + 1); },
      onError: (err: any) => toast.error(err.response?.data?.error || 'Failed to save draft'),
    });
  };

  const loadDraft = (draft: any) => {
    setCartItems((draft.items || []).map((item: any) => ({
      drug_id: item.drug_id, name: item.drug_name, code: item.drug_code, unit: '', qty: Number(item.quantity), unit_price: Number(item.unit_price), lineDiscount: Number(item.discount) || 0, gstPct: Number(item.gst_pct) || 0,
    })));
    if (draft.allocation_id) setSelectedAllocationIds(new Set([draft.allocation_id]));
    setDraftDismissed(true); toast.success(`Draft loaded — ${(draft.items || []).length} item(s)`);
  };

  const handleCompleteSale = () => {
    if (!cartItems.length) { toast.error('Cart is empty'); return; }
    if (!filtersApplied) { toast.error('Apply filters with Search first'); return; }
    if (isPO && saleType === 'drug_indent' && selectedAllocationIds.size === 0) { toast.error('Select a budget allocation first'); return; }
    if (isPO && poOverBudget) { toast.error(`Order exceeds combined budget by ${fmtINR(poUsedBudget - selectedGroupBudget)}`); return; }
    if (!isPO && payMethod === 'cash' && parseFloat(amtReceived || '0') < total) { toast.error('Amount received less than total'); return; }

    const sub = isPO ? subtotalPO : subtotalSale; const tax = isPO ? taxPO : 0; const disc = isPO ? 0 : globalDiscount;

    if (isPO) {
      const poItems = cartItems.map((i) => {
        const base = i.qty * i.unit_price; const lineTax = (base * (parseFloat(i.gstPct as any) || 0)) / 100;
        return { drug_id: i.drug_id, quantity: i.qty, unit_price: i.unit_price, discount: 0, gst_pct: parseFloat(i.gstPct as any) || 0, total: base + lineTax };
      });

      if (editingCartPOId) {
        updatePOMutation.mutate({ id: editingCartPOId, payload: { items: poItems, subtotal: sub, tax, total } }, {
          onSuccess: () => { toast.success('Purchase order updated'); setEditingCartPOId(null); resetForm(); setPoFetchTick(t => t + 1); },
          onError: (err: any) => toast.error(err.response?.data?.error || 'Update failed'),
        });
        return;
      }

      submitPO.mutate({
        invoice_no: invoiceNo, sale_date: new Date().toISOString().slice(0, 10), place_of_working_id: filterProps.placeOfWorkingId || null,
        allocation_id: selectedAllocationIds.size > 0 ? [...selectedAllocationIds][0] : null,
        financial_year_id: filterProps.financialYearId || null, scheme_id: filterProps.schemeId || null, quarter_id: filterProps.quarterId || null, institution_type_id: filterProps.institutionTypeId || null,
        subtotal: sub, tax, total, items: poItems,
      }, {
        onSuccess: (data: any) => { toast.success(`Purchase order created · ${data?.invoice_no || ''}`); resetForm(); setPoFetchTick(t => t + 1); },
        onError: (err: any) => toast.error(err.response?.data?.error || 'Failed to save purchase order'),
      });
      return;
    }

    submitSale.mutate({
      invoice_no: invoiceNo, customer_name: saleType, sale_date: new Date().toISOString().slice(0, 10), payment_method: payMethod,
      subtotal: sub, discount: disc, tax, total, amount_received: parseFloat(amtReceived) || total, change_returned: change >= 0 ? change : 0, place_of_working_id: filterProps.placeOfWorkingId || null,
      items: cartItems.map((i) => { const base = i.qty * i.unit_price; return { drug_id: i.drug_id, quantity: i.qty, unit_price: i.unit_price, discount: i.lineDiscount || 0, total: base - (i.lineDiscount || 0) }; }),
    }, {
      onSuccess: () => { setSaleComplete(true); toast.success(`Sale complete · ${invoiceNo}`); },
      onError: (err: any) => toast.error(err.response?.data?.error || 'Sale failed'),
    });
  };

  const handleSavePurchase = ({ editSubtotal, editTax, editTotal }: any) => {
    savePurchaseMutation.mutate({
      invoice_no: `PUR-${Date.now()}`, purchase_order_id: editingPO.id, place_of_working_id: editingPO.place_of_working_id,
      allocation_id: editingPO.allocation_id, financial_year_id: editingPO.financial_year_id, scheme_id: editingPO.scheme_id, quarter_id: editingPO.quarter_id, institution_type_id: editingPO.institution_type_id,
      subtotal: editSubtotal, tax: editTax, total: editTotal, notes: purchaseNote.trim() || null,
      items: editItems.map(it => ({ drug_id: it.drug_id, quantity: it.quantity, unit_price: it.unit_price, discount: it.discount || 0, gst_pct: it.gst_pct || 0, total: it.quantity * it.unit_price })),
    }, {
      onSuccess: (data: any) => { toast.success(`Purchase saved · ${data.invoice_no}`); setPurchaseNote(''); setEditingPO(null); setPoFetchTick(t => t + 1); },
      onError: (err: any) => toast.error(err.response?.data?.error || 'Failed to save purchase'),
    });
  };

  const handleUpdatePO = ({ editSubtotal, editTax, editTotal }: any) => {
    updatePOMutation.mutate({
      id: editingPO.id,
      payload: {
        ...(activeTab === 'transfer' && { to_place_of_working_id: filterProps.toPlaceOfWorkingId }),
        items: editItems.map(it => ({ drug_id: it.drug_id, quantity: it.quantity, unit_price: it.unit_price, discount: it.discount || 0, total: it.quantity * it.unit_price })),
        subtotal: editSubtotal, tax: editTax, total: editTotal,
      }
    }, {
      onSuccess: () => { toast.success('Order updated'); setEditingPO(null); setPoFetchTick(t => t + 1); },
      onError: (err: any) => toast.error(err.response?.data?.error || 'Update failed'),
    });
  };

  return {
    cartItems, setCartItems, globalDiscount, setGlobalDiscount, payMethod, setPayMethod, amtReceived, setAmtReceived, subtotalSale, subtotalPO, taxPO, displaySubtotal, displayTax, total, change, addToCart, removeItem, updateQty, updateDisc, updateGstPct, resetForm,
    searchQ, setSearchQ, saleType, setSaleType, saleComplete, setSaleComplete, activeTab, setActiveTab, filtersApplied, setFiltersApplied, editingPO, setEditingPO, editItems, setEditItems, editingCartPOId, setEditingCartPOId, expandedHistoryId, setExpandedHistoryId, expandedHistoryPurchaseKey, setExpandedHistoryPurchaseKey, purchaseNote, setPurchaseNote, selectedAllocationIds, setSelectedAllocationIds, draftDismissed, setDraftDismissed, invoiceNo, isPO, filterProps, poListFetching, poHistory, submitSale, submitPO, saveDraftMutation, updatePOMutation, savePurchaseMutation, selectedAllocations, allocationDrugs, existingDraft, purchaseOrdersHistoryList, selectedGroupBudget, selectedGroupSpent, poUsedBudget, poOverBudget, canSubmitPO, poReserveBalance, poAllBudgetsNearlyExhausted, hidePoCartAndBill, handleFilterSearch, handleSaveDraft, loadDraft, handleCompleteSale, handleSavePurchase, handleUpdatePO, fmtINR
  };
}
