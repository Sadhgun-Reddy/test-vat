
// src/pages/drugs/SalePage.jsx — Full POS billing interface
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useLocation } from 'react-router-dom';
import { syncManager } from '../../sync/syncManager';
import { upsertAndEnqueue } from '../../sync/offlineStore';
import { useSync } from '../../store/SyncContext';
import { useAuth } from '../../store/AuthContext';
import { Btn } from '../../components/ui';
import toast from 'react-hot-toast';

const fmtINR = n => `₹${Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;

/** Normalise purchase_history from API (json array or occasional string). */
function normalisePurchaseHistory(raw) {
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

function lastRecordedLabel(purHist) {
  const dates = purHist.map((p) => p.purchase_date || p.created_at).filter(Boolean).sort();
  const last = dates[dates.length - 1];
  return last
    ? new Date(last).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
    : '—';
}

/** Drug display: name on first line; code on second only when present (avoids a stray "—"). */
function DrugNameCode({ name, code, nameSize = 12 }) {
  const hasCode = code != null && String(code).trim() !== '';
  return (
    <>
      <div style={{ fontSize: nameSize, fontWeight: 500, lineHeight: 1.25 }}>{name}</div>
      {hasCode && (
        <div style={{ fontSize: 10, color: 'var(--txt3)', lineHeight: 1.2, fontFamily: 'var(--fm)' }}>{String(code).trim()}</div>
      )}
    </>
  );
}

const SALE_TYPES = [
  { id: 'drug_indent', label: 'Drug Indent' },
  { id: 'fodder', label: 'Fodder' },
  { id: 'vaccination', label: 'Vaccination' },
];

/** Header tabs — Sale is this screen; others reserved for future flows */
const MODULE_TABS = [
  { id: 'purchase_order', label: 'Purchase Order' },
  { id: 'purchase', label: 'Purchase' },
  { id: 'transfer', label: 'Transfer' },
  { id: 'sale', label: 'Sale' },
];

const Q_ROMAN = ['I', 'II', 'III', 'IV'];


const filterSelectStyle = {
  padding: '6px 24px 6px 8px',
  borderRadius: 6,
  border: '1px solid var(--bdr2)',
  fontSize: 12,
  fontFamily: 'var(--fb)',
  color: 'var(--txt)',
  background: 'var(--bg)',
  minWidth: 120,
  maxWidth: 200,
  cursor: 'pointer',
  outline: 'none',
};

function FilterField({ label, required, children }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <span style={{ fontSize: 10, fontWeight: 600, color: 'var(--txt3)', whiteSpace: 'nowrap' }}>
        {label}{required && <span style={{ color: 'var(--red)', marginLeft: 2 }}>*</span>}
      </span>
      {children}
    </div>
  );
}

export default function SalePage() {
  const { isOnline } = useSync();
  const { user } = useAuth();
  const location = useLocation();

  // Seeded from IndentsPage Edit buttons
  const editSale     = location.state?.editSale     || null;
  const editPO       = location.state?.editPO       || null;
  const editPurchase = location.state?.editPurchase || null;
  const editTransfer = location.state?.editTransfer || null;

  // Primary source for filter pre-seeding (Transfer rows have no filter context)
  const editFilterSeed = editSale || editPO || editPurchase || null;

  // Determine which tab to open based on what was passed
  // editPO always opens in purchase_order tab so the cart is pre-filled for editing
  const seedTab = editSale ? 'sale' : editPO ? 'purchase_order' : editPurchase ? 'purchase' : editTransfer ? 'transfer' : 'purchase_order';

  // When an edit context is passed, skip the first filter-change reset so seeded data survives auto-populate
  const skipResetRef = useRef(!!(editSale || editPO || editPurchase || editTransfer));

  // Build initial cart from whichever edit context was passed
  const buildCart = (items) => (items || []).map(i => ({
    drug_id:      i.drug_id,
    name:         i.drug_name,
    code:         i.drug_code || '',
    unit:         '',
    qty:          Number(i.quantity),
    unit_price:   Number(i.unit_price),
    lineDiscount: Number(i.discount) || 0,
    gstPct:       Number(i.gst_pct) || 0,
  }));

  const [cartItems, setCartItems]     = useState(() => {
    if (editSale)     return buildCart(editSale.items);
    if (editPO)       return buildCart(editPO.items);
    if (editPurchase) return buildCart(editPurchase.items);
    if (editTransfer) return [{ drug_id: editTransfer.drug_id, name: editTransfer.drug_name, code: '', unit: '', qty: Number(editTransfer.quantity), unit_price: Number(editTransfer.unit_price) || 0, lineDiscount: 0, gstPct: 0 }];
    return [];
  });
  const [searchQ, setSearchQ]         = useState('');
  const [saleType, setSaleType]       = useState('drug_indent');
  const [financialYearId, setFinancialYearId] = useState(() => editFilterSeed?.financial_year_id || '');
  const [schemeId, setSchemeId]       = useState(() => editFilterSeed?.scheme_id || '');
  const [quarterId, setQuarterId]     = useState(() => editFilterSeed?.quarter_id || '');
  const [districtId, setDistrictId]   = useState(() => editFilterSeed?.district_id || '');
  const [institutionTypeId, setInstitutionTypeId] = useState(() => editFilterSeed?.institution_type_id || '');
  const [placeOfWorkingId, setPlaceOfWorkingId] = useState(() => editFilterSeed?.place_of_working_id || '');
  const [payMethod, setPayMethod]     = useState(() => editSale?.payment_method || 'cash');
  const [amtReceived, setAmtReceived] = useState('');
  const [globalDiscount, setGlobalDiscount] = useState(() => Number(editSale?.discount) || 0);
  const [saleComplete, setSaleComplete] = useState(false);
  const [showCoupon, setShowCoupon]   = useState(false);
  const [couponCode, setCouponCode]   = useState('');
  const [activeTab, setActiveTab]     = useState(seedTab);
  const [filtersApplied, setFiltersApplied] = useState(false);
  // editingPO / editItems are used only in the Purchase tab detail panel (record goods received)
  const [editingPO, setEditingPO]     = useState(null);
  const [editItems, setEditItems]     = useState([]);
  /** ID of the PO whose items are loaded into the cart for editing (PO tab) */
  const [editingCartPOId, setEditingCartPOId] = useState(() => editPO?.id || null);
  const [toPlaceOfWorkingId, setToPlaceOfWorkingId] = useState('');
  const [expandedHistoryId, setExpandedHistoryId] = useState(null);
  /** `${poId}::${purchaseId}` — which goods-received receipt is expanded under PO history */
  const [expandedHistoryPurchaseKey, setExpandedHistoryPurchaseKey] = useState(null);
  const [purchaseNote, setPurchaseNote] = useState('');
  const [selectedAllocationIds, setSelectedAllocationIds] = useState(
    () => editPO?.allocation_id ? new Set([editPO.allocation_id]) : new Set(),
  );
  const [draftDismissed, setDraftDismissed] = useState(false);
  const invoiceNo = useMemo(() => `INV-${Date.now()}`, []);

  const { data: topDrugs } = useQuery({
    queryKey: ['drugs-top'],
    queryFn: async () => { const { data } = await syncManager.api.get('/drugs?limit=8'); return data.drugs || []; },
    enabled: isOnline, staleTime: 60_000,
  });

  const [poFetchTick, setPoFetchTick] = useState(0);
  const selectedAllocIdsKeyPo = [...selectedAllocationIds].sort().join(',');
  const { data: purchaseOrdersData, isFetching: poListFetching } = useQuery({
    queryKey: [
      'purchase-orders',
      placeOfWorkingId,
      institutionTypeId,
      selectedAllocIdsKeyPo,
      poFetchTick,
    ],
    queryFn: async () => {
      const pairs = [['limit', '100']];
      if (placeOfWorkingId) pairs.push(['place_of_working_id', placeOfWorkingId]);
      // Do not filter by scheme_id — history should show all POs for this institution
      if (institutionTypeId) pairs.push(['institution_type_id', institutionTypeId]);
      if (selectedAllocationIds.size === 1) pairs.push(['allocation_id', [...selectedAllocationIds][0]]);
      const params = new URLSearchParams(pairs);
      const { data } = await syncManager.api.get(`/purchase-orders?${params}`);
      return data.purchase_orders || [];
    },
    enabled: isOnline && poFetchTick > 0,
    staleTime: 0,
  });

  const { data: poHistory } = useQuery({
    queryKey: ['purchases-for-po', editingPO?.id],
    queryFn: async () => {
      const { data } = await syncManager.api.get(`/purchases?purchase_order_id=${editingPO.id}&limit=50`);
      return data.purchases || [];
    },
    enabled: isOnline && !!editingPO?.id && activeTab === 'purchase',
    staleTime: 0,
  });

  const { data: fyData } = useQuery({
    queryKey: ['financial-years'],
    queryFn: async () => { const { data } = await syncManager.api.get('/settings/financial-years'); return data; },
    enabled: isOnline, staleTime: 60_000,
  });
  const { data: schemes } = useQuery({
    queryKey: ['schemes'],
    queryFn: async () => { const { data } = await syncManager.api.get('/settings/schemes'); return data; },
    enabled: isOnline, staleTime: 60_000,
  });
  const { data: quarters } = useQuery({
    queryKey: ['quarters'],
    queryFn: async () => { const { data } = await syncManager.api.get('/settings/quarters'); return data; },
    enabled: isOnline, staleTime: 60_000,
  });
  const { data: districts } = useQuery({
    queryKey: ['districts'],
    queryFn: async () => { const { data } = await syncManager.api.get('/districts'); return data; },
    enabled: isOnline, staleTime: 60_000,
  });
  const { data: places } = useQuery({
    queryKey: ['places-of-working-sale', districtId],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (districtId) params.set('district_id', districtId);
      const { data } = await syncManager.api.get(`/places-of-working?${params}`);
      return data;
    },
    enabled: isOnline && !!districtId,
    staleTime: 60_000,
  });

  const { data: allocationsForIndent = [], isFetching: allocFetching } = useQuery({
    queryKey: ['budget-alloc-indent', financialYearId, schemeId, quarterId, institutionTypeId],
    queryFn: async () => {
      const p = new URLSearchParams();
      if (financialYearId)   p.set('financial_year_id', financialYearId);
      if (schemeId)          p.set('scheme_id', schemeId);
      if (quarterId)         p.set('quarter_id', quarterId);
      if (institutionTypeId) p.set('institution_type_id', institutionTypeId);
      const { data } = await syncManager.api.get(`/settings/budget-allocations/for-indent?${p}`);
      return data;
    },
    enabled: isOnline && filtersApplied && saleType === 'drug_indent',
    staleTime: 30_000,
  });

  const selectedAllocations = allocationsForIndent.filter((a) => selectedAllocationIds.has(a.id));
  const allocationDrugs = useMemo(() => {
    const seen = new Set();
    return selectedAllocations.flatMap((a) => a.drugs || []).filter((d) => {
      if (seen.has(d.id)) return false;
      seen.add(d.id);
      return true;
    });
  }, [selectedAllocations]);

  const searchResults = useMemo(() => {
    if (searchQ.length < 2) return [];
    const q = searchQ.toLowerCase();
    return allocationDrugs.filter(d =>
      d.name?.toLowerCase().includes(q) || d.code?.toLowerCase().includes(q)
    ).slice(0, 8);
  }, [searchQ, allocationDrugs]);

  const quartersForFy = useMemo(() => {
    if (!financialYearId || !quarters?.length) return [];
    return quarters.filter((q) => q.financial_year_id === financialYearId);
  }, [quarters, financialYearId]);

  const { data: institutionTypesRaw } = useQuery({
    queryKey: ['institution-types'],
    queryFn: async () => { const { data } = await syncManager.api.get('/institution-types'); return data; },
    enabled: isOnline,
    staleTime: 120_000,
  });
  const institutionTypes = useMemo(
    () => (Array.isArray(institutionTypesRaw) ? institutionTypesRaw : (institutionTypesRaw?.data || [])),
    [institutionTypesRaw],
  );

  const filteredPlaces = Array.isArray(places) ? places : [];

  const fyInitRef = useRef(false);
  const districtInitRef = useRef(false);
  const cardListRef = useRef(null);
  const scrollCards = dir => { if (cardListRef.current) cardListRef.current.scrollBy({ left: dir * 220, behavior: 'smooth' }); };

  useEffect(() => {
    if (!isOnline || fyInitRef.current || !fyData?.length || !schemes?.length || !quarters?.length) return;
    const fy = fyData.find((f) => f.is_current) || fyData[0];
    setFinancialYearId(fy.id);
    setSchemeId(schemes[0].id);
    const fq = quarters.filter((q) => q.financial_year_id === fy.id);
    if (fq.length) setQuarterId(fq[0].id);
    fyInitRef.current = true;
  }, [isOnline, fyData, schemes, quarters]);

  useEffect(() => {
    if (!financialYearId || !quarters?.length) return;
    const fq = quarters.filter((q) => q.financial_year_id === financialYearId);
    if (!fq.length) return;
    if (!quarterId || !fq.some((q) => q.id === quarterId)) setQuarterId(fq[0].id);
  }, [financialYearId, quarters, quarterId]);

  useEffect(() => {
    if (!isOnline || districtInitRef.current || !districts?.length) return;
    const list = districts;
    const preferred = user?.district_id && list.some((d) => d.id === user.district_id)
      ? user.district_id
      : list[0].id;
    setDistrictId(preferred);
    districtInitRef.current = true;
  }, [isOnline, districts, user?.district_id]);

  useEffect(() => {
    if (!institutionTypes.length) return;
    setInstitutionTypeId((prev) => {
      if (prev && institutionTypes.some((i) => i.id === prev)) return prev;
      return institutionTypes[0].id;
    });
  }, [institutionTypes]);

  useEffect(() => {
    if (!filteredPlaces.length) return;
    setPlaceOfWorkingId((prev) => {
      if (prev && filteredPlaces.some((p) => p.id === prev)) return prev;
      return filteredPlaces[0].id;
    });
  }, [filteredPlaces]);

  useEffect(() => {
    if (skipResetRef.current) { skipResetRef.current = false; return; }
    setFiltersApplied(false);
    setSelectedAllocationIds(new Set());
    setCartItems([]);
    setPoFetchTick(0);
    setDraftDismissed(false);
    setExpandedHistoryId(null);
    setExpandedHistoryPurchaseKey(null);
  }, [saleType, financialYearId, schemeId, quarterId, districtId, institutionTypeId, placeOfWorkingId]);

  const submitSale = useMutation({
    mutationFn: async (payload) => {
      if (isOnline) { const { data } = await syncManager.api.post('/sales', payload); return data; }
      return upsertAndEnqueue('drug_sales', payload, 'INSERT');
    },
    onSuccess: () => { setSaleComplete(true); toast.success(`Sale complete · ${invoiceNo}`); },
    onError: (err) => toast.error(err.response?.data?.error || 'Sale failed'),
  });

  const submitPO = useMutation({
    mutationFn: async (payload) => {
      const { data } = await syncManager.api.post('/purchase-orders', payload);
      return data;
    },
    onSuccess: (data) => {
      const merged = data?._merged;
      toast.success(merged ? 'Items merged into existing purchase order' : `Purchase order created · ${data?.invoice_no}`);
      setCartItems([]);
      setPoFetchTick(t => t + 1);
    },
    onError: (err) => toast.error(err.response?.data?.error || 'Failed to save purchase order'),
  });

  const existingDraft = useMemo(
    () => (purchaseOrdersData || []).find(po => po.status === 'draft' && (po.items || []).length > 0) ?? null,
    [purchaseOrdersData],
  );

  /** Confirmed POs for expandable history (excludes saved drafts). */
  const purchaseOrdersHistoryList = useMemo(() => {
    const rows = (purchaseOrdersData || []).filter(po => (po.status || '') !== 'draft');
    return [...rows].sort((a, b) => {
      const t = (x) => new Date(x.created_at || x.sale_date || 0).getTime();
      return t(b) - t(a);
    });
  }, [purchaseOrdersData]);

  const saveDraftMutation = useMutation({
    mutationFn: async (payload) => {
      const { data } = await syncManager.api.post('/purchase-orders/draft', payload);
      return data;
    },
    onSuccess: () => {
      toast.success('Draft saved');
      setPoFetchTick(t => t + 1);
    },
    onError: (err) => toast.error(err.response?.data?.error || 'Failed to save draft'),
  });

  const updatePO = useMutation({
    mutationFn: async ({ id, payload }) => {
      const { data } = await syncManager.api.patch(`/purchase-orders/${id}`, payload);
      return data;
    },
    onSuccess: () => {
      toast.success('Purchase order updated');
      setEditingPO(null);
      setEditingCartPOId(null);
      setCartItems([]);
      setPoFetchTick(t => t + 1);
    },
    onError: (err) => toast.error(err.response?.data?.error || 'Update failed'),
  });

  const savePurchase = useMutation({
    mutationFn: async (payload) => {
      const { data } = await syncManager.api.post('/purchases', payload);
      return data;
    },
    onSuccess: (data) => {
      if (data._order_closed) {
        toast.success(`Purchase matches order — saved & order closed · ${data.invoice_no}`);
        setEditingPO(null);
      } else {
        toast.success(`Purchase saved · ${data.invoice_no} — order remains open`);
      }
      setPurchaseNote('');
      setPoFetchTick(t => t + 1);
    },
    onError: (err) => toast.error(err.response?.data?.error || 'Failed to save purchase'),
  });

  const subtotalSale = useMemo(
    () => cartItems.reduce((s, i) => s + i.qty * i.unit_price - (i.lineDiscount || 0), 0),
    [cartItems],
  );
  const subtotalPO = useMemo(
    () => cartItems.reduce((s, i) => s + i.qty * i.unit_price, 0),
    [cartItems],
  );
  const taxPO = useMemo(
    () => cartItems.reduce((s, i) => s + (i.qty * i.unit_price * (parseFloat(i.gstPct) || 0)) / 100, 0),
    [cartItems],
  );
  const isPO = activeTab === 'purchase_order';
  const displaySubtotal = isPO ? subtotalPO : subtotalSale;
  const displayTax = isPO ? taxPO : 0;
  const total = Math.max(0, isPO ? subtotalPO + taxPO : subtotalSale - globalDiscount);
  const change = parseFloat(amtReceived || 0) - total;

  const selectedGroupBudget = selectedAllocations.reduce((s, a) => s + Number(a.budget_amount), 0);
  const selectedGroupSpent  = selectedAllocations.reduce((s, a) => s + Number(a.spent_amount || 0), 0);
  const poUsedBudget   = subtotalPO + taxPO;
  // 98% of combined budget must be spent — any surplus from one allocation can cover another (transfer)
  const poMinRequired  = selectedGroupBudget * 0.98;
  const poShortfall    = Math.max(0, poMinRequired - poUsedBudget);
  const poOverBudget   = selectedAllocations.length > 0 && poUsedBudget > selectedGroupBudget;
  // Allow submission as long as cart is within budget; the unused portion becomes reserve balance
  const canSubmitPO    = selectedAllocations.length === 0 || !poOverBudget;
  /** Remaining budget that will be moved to reserve balance on submission */
  const poReserveBalance = selectedAllocations.length > 0
    ? Math.max(0, selectedGroupBudget - selectedGroupSpent - poUsedBudget)
    : 0;

  /** True if some multiset of line items (qty × unit + GST each) can total between 98% and 100% of combined budget. */
  const selectedAllocationIdsKey = [...selectedAllocationIds].sort().join(',');
  const poAnyCartCanReachMin98 = useMemo(() => {
    const selected = allocationsForIndent.filter((a) => selectedAllocationIds.has(a.id));
    if (selected.length === 0) return true;
    const B = selected.reduce((s, a) => s + Number(a.budget_amount), 0);
    const seen = new Set();
    const drugs = selected.flatMap((a) => a.drugs || []).filter((d) => {
      if (seen.has(d.id)) return false;
      seen.add(d.id);
      return true;
    });
    if (B <= 0 || drugs.length === 0) return false;
    const toPaise = (x) => Math.round((Number(x) + Number.EPSILON) * 100);
    const Bc = toPaise(B);
    const target = Math.ceil(B * 0.98 * 100 - 1e-9);
    const costs = Array.from(
      new Set(
        drugs
          .map((d) => {
            const up = parseFloat(d.unit_price) || 0;
            const g = (parseFloat(d.gst_pct) || 0) / 100;
            return toPaise(up * (1 + g));
          })
          .filter((c) => c > 0 && c <= Bc),
      ),
    );
    if (!costs.length) return false;
    const DP_MAX_PAISE = 8_000_000; // ₹80k in paise — typical PO budgets; bounds memory (~8MB) and work
    if (Bc <= DP_MAX_PAISE) {
      const can = new Uint8Array(Bc + 1);
      can[0] = 1;
      for (const c of costs) {
        for (let w = c; w <= Bc; w++) {
          if (can[w - c]) can[w] = 1;
        }
      }
      for (let w = target; w <= Bc; w++) if (can[w]) return true;
      return false;
    }
    return costs.some((c) => Math.floor(Bc / c) * c >= target);
  }, [allocationsForIndent, selectedAllocationIdsKey]);

  /** Every allocation under current filters has less than ~2% budget left (≥98% spent) — nothing to buy against. */
  const poAllBudgetsNearlyExhausted = useMemo(() => {
    if (!filtersApplied || saleType !== 'drug_indent' || allocationsForIndent.length === 0) return false;
    return allocationsForIndent.every((a) => {
      const budget = Number(a.budget_amount) || 0;
      const spent = Number(a.spent_amount) || 0;
      if (budget <= 0) return true;
      return spent >= budget * 0.98 - 1e-6;
    });
  }, [allocationsForIndent, filtersApplied, saleType]);

  const hidePoCartAndBill =
    isPO &&
    saleType === 'drug_indent' &&
    filtersApplied &&
    poAllBudgetsNearlyExhausted;

  useEffect(() => {
    if (!hidePoCartAndBill) return;
    setCartItems([]);
    setSearchQ('');
  }, [hidePoCartAndBill]);

  const addToCart = (drug) => {
    setCartItems((prev) => {
      const ex = prev.find((i) => i.drug_id === drug.id);
      if (ex) return prev.map((i) => (i.drug_id === drug.id ? { ...i, qty: i.qty + 1 } : i));
      return [
        ...prev,
        {
          drug_id: drug.id,
          name: drug.name,
          code: drug.code,
          unit: drug.unit,
          qty: 1,
          unit_price: parseFloat(drug.unit_price) || 0,
          lineDiscount: 0,
          gstPct: parseFloat(drug.gst_pct) || 0,
        },
      ];
    });
    setSearchQ('');
  };

  const removeItem = (id) => setCartItems((p) => p.filter((i) => i.drug_id !== id));
  const updateQty = (id, qty) =>
    setCartItems((p) => p.map((i) => (i.drug_id === id ? { ...i, qty: Math.max(1, parseInt(qty, 10) || 1) } : i)));
  const updateDisc = (id, d) =>
    setCartItems((p) =>
      p.map((i) => (i.drug_id === id ? { ...i, lineDiscount: Math.max(0, parseFloat(d) || 0) } : i)),
    );
  const updateGstPct = (id, pct) =>
    setCartItems((p) =>
      p.map((i) => (i.drug_id === id ? { ...i, gstPct: Math.max(0, Math.min(100, parseFloat(pct) || 0)) } : i)),
    );

  const handleCompleteSale = () => {
    if (!cartItems.length) {
      toast.error('Cart is empty');
      return;
    }
    if (!filtersApplied) {
      toast.error('Apply filters with Search first');
      return;
    }
    if (isPO && saleType === 'drug_indent' && selectedAllocationIds.size === 0) {
      toast.error('Select a budget allocation first');
      return;
    }
    if (isPO && poOverBudget) {
      toast.error(`Order exceeds combined budget by ${fmtINR(poUsedBudget - selectedGroupBudget)} — reduce quantities`);
      return;
    }
    if (!isPO && payMethod === 'cash' && parseFloat(amtReceived || 0) < total) {
      toast.error('Amount received less than total');
      return;
    }
    const typeLabel = SALE_TYPES.find((t) => t.id === saleType)?.label ?? 'Drug Indent';
    const sub = isPO ? subtotalPO : subtotalSale;
    const tax = isPO ? taxPO : 0;
    const disc = isPO ? 0 : globalDiscount;

    if (isPO) {
      const poItems = cartItems.map((i) => {
        const base = i.qty * i.unit_price;
        const lineTax = (base * (parseFloat(i.gstPct) || 0)) / 100;
        return {
          drug_id: i.drug_id,
          quantity: i.qty,
          unit_price: i.unit_price,
          discount: 0,
          gst_pct: parseFloat(i.gstPct) || 0,
          total: base + lineTax,
        };
      });

      // If editing an existing PO from the cart, PATCH it directly
      if (editingCartPOId) {
        updatePO.mutate({
          id: editingCartPOId,
          payload: { items: poItems, subtotal: sub, tax, total },
        });
        return;
      }

      // Otherwise create / merge via POST (backend handles upsert)
      submitPO.mutate({
        invoice_no: invoiceNo,
        sale_date: new Date().toISOString().slice(0, 10),
        place_of_working_id: placeOfWorkingId || null,
        allocation_id: selectedAllocationIds.size > 0 ? [...selectedAllocationIds][0] : null,
        financial_year_id: financialYearId || null,
        scheme_id: schemeId || null,
        quarter_id: quarterId || null,
        institution_type_id: institutionTypeId || null,
        subtotal: sub,
        tax,
        total,
        items: poItems,
      });
      return;
    }

    submitSale.mutate({
      invoice_no: invoiceNo,
      customer_name: typeLabel,
      sale_date: new Date().toISOString().slice(0, 10),
      payment_method: payMethod,
      subtotal: sub,
      discount: disc,
      tax,
      total,
      amount_received: parseFloat(amtReceived) || total,
      change_returned: change >= 0 ? change : 0,
      place_of_working_id: placeOfWorkingId || null,
      items: cartItems.map((i) => {
        const base = i.qty * i.unit_price;
        return {
          drug_id: i.drug_id,
          quantity: i.qty,
          unit_price: i.unit_price,
          discount: i.lineDiscount || 0,
          total: base - (i.lineDiscount || 0),
        };
      }),
    });
  };

  const handleFilterSearch = () => {
    if (!isOnline) {
      toast.error('Go online to use filters');
      return;
    }
    if (!financialYearId || !schemeId || !quarterId || !districtId || !placeOfWorkingId) {
      toast.error('Please fill all required filters');
      return;
    }
    if (institutionTypes.length > 0 && !institutionTypeId) {
      toast.error('Please select institution type');
      return;
    }
    setSelectedAllocationIds(new Set());
    setCartItems([]);
    setFiltersApplied(true);
    setPoFetchTick(t => t + 1);
    if (activeTab === 'purchase_order' || activeTab === 'sale') {
      toast.success('Filters applied — select a budget allocation below');
    }
  };

  const handleSaveDraft = () => {
    if (!cartItems.length) { toast.error('Cart is empty'); return; }
    saveDraftMutation.mutate({
      place_of_working_id: placeOfWorkingId || null,
      financial_year_id: financialYearId || null,
      scheme_id: schemeId || null,
      quarter_id: quarterId || null,
      institution_type_id: institutionTypeId || null,
      allocation_id: selectedAllocationIds.size > 0 ? [...selectedAllocationIds][0] : null,
      subtotal: subtotalPO,
      tax: taxPO,
      total,
      items: cartItems.map((i) => ({
        drug_id: i.drug_id,
        quantity: i.qty,
        unit_price: i.unit_price,
        discount: 0,
        gst_pct: parseFloat(i.gstPct) || 0,
      })),
    });
  };

  const loadDraft = (draft) => {
    setCartItems((draft.items || []).map(item => ({
      drug_id: item.drug_id,
      name: item.drug_name,
      code: item.drug_code,
      unit: '',
      qty: Number(item.quantity),
      unit_price: Number(item.unit_price),
      lineDiscount: Number(item.discount) || 0,
      gstPct: Number(item.gst_pct) || 0,
    })));
    if (draft.allocation_id) setSelectedAllocationIds(new Set([draft.allocation_id]));
    setDraftDismissed(true);
    toast.success(`Draft loaded — ${(draft.items || []).length} item(s)`);
  };

  const filterContextParts = useMemo(() => {
    const fy = (fyData || []).find((f) => f.id === financialYearId);
    const sc = (schemes || []).find((s) => s.id === schemeId);
    const q = (quarters || []).find((x) => x.id === quarterId);
    const dist = (districts || []).find((d) => d.id === districtId);
    const place = (places || []).find((p) => p.id === placeOfWorkingId);
    const inst = institutionTypes.find((t) => t.id === institutionTypeId);
    const qLabel = q
      ? `${Q_ROMAN[q.quarter_no - 1] || q.quarter_no}${q.fy_label ? ` · ${q.fy_label}` : ''}`
      : '';
    return [
      SALE_TYPES.find((t) => t.id === saleType)?.label,
      fy?.label,
      sc?.name,
      qLabel,
      dist?.name,
      inst?.name,
      place?.name,
    ].filter(Boolean);
  }, [
    fyData,
    financialYearId,
    schemes,
    schemeId,
    quarters,
    quarterId,
    districts,
    districtId,
    places,
    placeOfWorkingId,
    institutionTypes,
    institutionTypeId,
    saleType,
  ]);

  if (saleComplete) return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 'calc(100vh - 96px)', gap: 20 }}>
      <div style={{ width: 72, height: 72, borderRadius: '50%', background: 'var(--grn-lt)', border: '3px solid var(--grn)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 32 }}>✓</div>
      <h2 style={{ fontFamily: 'var(--fd)', color: 'var(--grn)', fontSize: 26 }}>Sale Completed!</h2>
      <p style={{ color: 'var(--txt3)', fontSize: 13 }}>Invoice {invoiceNo} · Total {fmtINR(total)}</p>
      {payMethod === 'cash' && change > 0 && <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--blu)' }}>Change: {fmtINR(change)}</p>}
      <div style={{ display: 'flex', gap: 12 }}>
        <Btn variant="ghost" onClick={() => window.print()}>🖨 Print Bill</Btn>
        <Btn
          variant="primary"
          onClick={() => {
            setCartItems([]);
            setAmtReceived('');
            setGlobalDiscount(0);
            setSaleComplete(false);
            setSaleType('drug_indent');
            setFiltersApplied(false);
            setActiveTab('purchase_order');
          }}
        >
          + New Sale
        </Btn>
      </div>
    </div>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 96px)', overflow: 'hidden' }}>
      {/* Top bar */}
      <div style={{
        background: 'var(--blu2)', padding: '0 16px 0 20px', minHeight: 46,
        display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0, flexWrap: 'wrap', rowGap: 8,
      }}>
        <span style={{ color: '#fff', fontWeight: 700, fontSize: 14, whiteSpace: 'nowrap' }}>💊 Drug Sale / Billing</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexWrap: 'wrap' }}>
          {MODULE_TABS.map(({ id, label }) => {
            const isActive = activeTab === id;
            return (
              <button
                key={id}
                type="button"
                onClick={() => setActiveTab(id)}
                onMouseEnter={(e) => {
                  if (isActive) return;
                  e.currentTarget.style.background = 'var(--blu-lt)';
                  e.currentTarget.style.color = 'var(--blu)';
                  e.currentTarget.style.fontWeight = '600';
                }}
                onMouseLeave={(e) => {
                  if (isActive) return;
                  e.currentTarget.style.background = 'transparent';
                  e.currentTarget.style.color = 'rgba(255,255,255,.88)';
                  e.currentTarget.style.fontWeight = '500';
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 5,
                  padding: '5px 10px',
                  borderRadius: 6,
                  border: 'none',
                  background: isActive ? 'rgba(255,255,255,.2)' : 'transparent',
                  color: isActive ? '#fff' : 'rgba(255,255,255,.88)',
                  fontSize: 11,
                  fontWeight: isActive ? 700 : 500,
                  cursor: 'pointer',
                  fontFamily: 'var(--fb)',
                  whiteSpace: 'nowrap',
                  transition: 'background .15s, color .15s',
                  boxShadow: isActive ? 'inset 0 -2px 0 #fff' : 'none',
                }}
              >
                {label}
              </button>
            );
          })}
        </div>
        <div style={{ marginLeft: 'auto', color: 'rgba(255,255,255,.85)', fontSize: 11, whiteSpace: 'nowrap' }}>🧾 {invoiceNo}</div>
      </div>

      {/* Category type + programme filters */}
      <div style={{
        background: '#fff', borderBottom: '1px solid var(--bdr)', padding: '10px 20px',
        display: 'flex', alignItems: 'flex-end', gap: 10, flexWrap: 'wrap', flexShrink: 0,
      }}>
        <FilterField label="Category type" required>
          <select
            value={saleType}
            onChange={(e) => setSaleType(e.target.value)}
            aria-label="Category type"
            disabled={!isOnline}
            style={{ ...filterSelectStyle, minWidth: 160 }}
          >
            {SALE_TYPES.map(({ id, label }) => (
              <option key={id} value={id}>{label}</option>
            ))}
          </select>
        </FilterField>
        <FilterField label="Financial Year" required>
          <select
            value={financialYearId}
            onChange={(e) => setFinancialYearId(e.target.value)}
            disabled={!isOnline}
            style={filterSelectStyle}
          >
            <option value="">Select…</option>
            {(fyData || []).map((f) => (
              <option key={f.id} value={f.id}>{f.label}</option>
            ))}
          </select>
        </FilterField>
        <FilterField label="Scheme" required>
          <select
            value={schemeId}
            onChange={(e) => setSchemeId(e.target.value)}
            disabled={!isOnline}
            style={filterSelectStyle}
          >
            <option value="">Select…</option>
            {(schemes || []).map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        </FilterField>
        <FilterField label="Quarter" required>
          <select
            value={quarterId}
            onChange={(e) => setQuarterId(e.target.value)}
            disabled={!isOnline}
            style={filterSelectStyle}
          >
            <option value="">Select…</option>
            {quartersForFy.map((q) => (
              <option key={q.id} value={q.id}>
                {Q_ROMAN[q.quarter_no - 1] || q.quarter_no}{q.fy_label ? ` · ${q.fy_label}` : ''}
              </option>
            ))}
          </select>
        </FilterField>
        <FilterField label="District" required>
          <select
            value={districtId}
            onChange={(e) => setDistrictId(e.target.value)}
            disabled={!isOnline}
            style={{ ...filterSelectStyle, minWidth: 140 }}
          >
            <option value="">Select…</option>
            {(districts || []).map((d) => (
              <option key={d.id} value={d.id}>{d.name}</option>
            ))}
          </select>
        </FilterField>
        <FilterField label="Institution Type" required>
          <select
            value={institutionTypeId}
            onChange={(e) => setInstitutionTypeId(e.target.value)}
            disabled={!isOnline}
            style={filterSelectStyle}
          >
            <option value="">Select…</option>
            {institutionTypes.map((it) => (
              <option key={it.id} value={it.id}>{it.name}</option>
            ))}
          </select>
        </FilterField>
        <FilterField label="Place of Working" required>
          <select
            value={placeOfWorkingId}
            onChange={(e) => setPlaceOfWorkingId(e.target.value)}
            disabled={!isOnline}
            style={{ ...filterSelectStyle, maxWidth: 260 }}
          >
            <option value="">Select…</option>
            {filteredPlaces.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </FilterField>
        {activeTab === 'transfer' && (
          <FilterField label="To Place of Working" required>
            <select
              value={toPlaceOfWorkingId}
              onChange={(e) => setToPlaceOfWorkingId(e.target.value)}
              disabled={!isOnline}
              style={{ ...filterSelectStyle, maxWidth: 260, borderColor: 'var(--blu-bdr)', background: 'var(--blu-lt)' }}
            >
              <option value="">Select destination…</option>
              {filteredPlaces.filter(p => p.id !== placeOfWorkingId).map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </FilterField>
        )}
        <button
          type="button"
          onClick={handleFilterSearch}
          disabled={!isOnline}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            padding: '7px 14px', borderRadius: 6, border: 'none',
            background: !isOnline ? 'var(--bdr2)' : 'var(--blu)',
            color: '#fff', fontSize: 12, fontWeight: 600, cursor: !isOnline ? 'not-allowed' : 'pointer',
            fontFamily: 'var(--fb)', marginBottom: 1,
          }}
        >
          🔍 Search
        </button>
      </div>

      {activeTab === 'sale' && filtersApplied && filterContextParts.length > 0 && (
        <div
          style={{
            padding: '8px 20px',
            background: 'var(--blu-lt)',
            borderBottom: '1px solid var(--blu-bdr)',
            fontSize: 11,
            color: 'var(--txt2)',
            flexShrink: 0,
          }}
        >
          <span style={{ fontWeight: 700, color: 'var(--blu)', marginRight: 8 }}>Billing context</span>
          {filterContextParts.join(' · ')}
        </div>
      )}
      {activeTab === 'sale' && isOnline && !filtersApplied && (
        <div
          style={{
            padding: '8px 20px',
            background: 'var(--amber-lt, #fff8e6)',
            borderBottom: '1px solid var(--bdr)',
            fontSize: 11,
            color: 'var(--txt2)',
            flexShrink: 0,
          }}
        >
          Set programme filters above and click <strong>Search</strong> (on Purchase Order or here) before completing a sale — the same filters apply to both tabs.
        </div>
      )}

      {/* Purchase / Transfer tab — invoice badges + detail panel */}
      {(activeTab === 'purchase' || activeTab === 'transfer') && (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', background: 'var(--bg1)' }}>
          {/* Invoice badges bar */}
          <div style={{ padding: '10px 20px', background: '#fff', borderBottom: '1px solid var(--bdr)', flexShrink: 0, minHeight: 46, display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            {!filtersApplied ? (
              <span style={{ fontSize: 12, color: 'var(--txt4)' }}>Apply filters and click Search to load purchase orders</span>
            ) : poListFetching ? (
              <span style={{ fontSize: 12, color: 'var(--txt3)' }}>Loading…</span>
            ) : !purchaseOrdersHistoryList.length ? (
              <span style={{ fontSize: 12, color: 'var(--txt3)' }}>No purchase orders found</span>
            ) : (
              <>
                <span style={{ fontSize: 11, color: 'var(--txt3)', fontWeight: 600, marginRight: 4 }}>Purchase Orders:</span>
                {purchaseOrdersHistoryList.map((po) => {
                  const isActive = editingPO?.id === po.id;
                  const st = (po.status || '').toLowerCase();
                  const isClosed = st === 'closed';
                  const isOpen = st === 'confirmed';
                  const isDraft = st === 'draft';
                  const pillLabel = isClosed ? 'CLOSED' : isOpen ? 'OPEN' : isDraft ? 'DRAFT' : st === 'cancelled' ? 'CANCL' : st ? st.replace(/^./, (c) => c.toUpperCase()) : '—';
                  return (
                    <button key={po.id} onClick={() => {
                      if (isActive) { setEditingPO(null); setPurchaseNote(''); }
                      else { setEditingPO(po); setPurchaseNote(''); setEditItems((po.items || []).map(i => ({ ...i, quantity: Number(i.quantity), unit_price: Number(i.unit_price) }))); }
                    }} style={{
                      display: 'inline-flex', alignItems: 'center', gap: 5,
                      padding: '4px 10px', borderRadius: 20,
                      border: `1.5px solid ${isActive ? 'var(--blu)' : isClosed ? 'var(--grn)' : isOpen ? '#1d4ed8' : 'var(--bdr2)'}`,
                      background: isActive ? 'var(--blu)' : isClosed ? 'var(--grn-lt,#f0fdf4)' : isOpen ? '#eff6ff' : '#fff',
                      color: isActive ? '#fff' : isClosed ? 'var(--grn)' : isOpen ? '#1d4ed8' : 'var(--blu)',
                      fontSize: 11, fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--fb)',
                    }}>
                      {po.invoice_no}
                      <span style={{
                        fontSize: 9, fontWeight: 700, padding: '1px 5px', borderRadius: 8,
                        background: isActive ? 'rgba(255,255,255,.25)' : isClosed ? 'var(--grn)' : isOpen ? '#1d4ed8' : isDraft ? 'var(--amber-lt,#fff8e6)' : 'var(--blu-lt)',
                        color: isActive ? '#fff' : isClosed ? '#fff' : isOpen ? '#fff' : isDraft ? '#b45309' : 'var(--blu)',
                      }}>
                        {pillLabel}
                      </span>
                    </button>
                  );
                })}
              </>
            )}
          </div>

          {/* Detail panel for selected PO */}
          {editingPO && (() => {
            const editSubtotal = editItems.reduce((s, i) => s + i.quantity * i.unit_price, 0);
            const editTax = editItems.reduce((s, i) => s + (i.quantity * i.unit_price * (parseFloat(i.gst_pct) || 0)) / 100, 0);
            const editTotal = editSubtotal + editTax;
            return (
              <div style={{ flex: 1, overflow: 'auto', padding: 20 }}>
                {/* PO header info */}
                <div style={{ background: '#fff', borderRadius: 10, border: '1px solid var(--bdr)', overflow: 'hidden' }}>
                  <div style={{ padding: '12px 16px', background: editingPO.status === 'closed' ? 'var(--grn-lt,#f0fdf4)' : 'var(--blu-lt)', borderBottom: `1px solid ${editingPO.status === 'closed' ? 'var(--grn)' : 'var(--blu-bdr)'}`, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontWeight: 800, fontSize: 14, color: editingPO.status === 'closed' ? 'var(--grn)' : 'var(--blu)' }}>{editingPO.invoice_no}</span>
                        <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 10, background: editingPO.status === 'closed' ? 'var(--grn)' : 'var(--blu)', color: '#fff' }}>
                          {editingPO.status === 'closed' ? '✓ CLOSED' : 'DRAFT'}
                        </span>
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--txt3)', marginTop: 4 }}>
                        Date: {editingPO.sale_date?.slice(0, 10)} &nbsp;·&nbsp; {(editingPO.items || []).length} items
                        {activeTab === 'transfer' && toPlaceOfWorkingId && (
                          <span>&nbsp;·&nbsp; To: <strong>{filteredPlaces.find(p => p.id === toPlaceOfWorkingId)?.name}</strong></span>
                        )}
                      </div>
                      {editingPO.status === 'closed' && editingPO.purchase_invoice_no && (
                        <div style={{ fontSize: 11, color: 'var(--grn)', marginTop: 4, fontWeight: 600 }}>
                          Purchase: {editingPO.purchase_invoice_no}
                        </div>
                      )}
                      {editingPO.status === 'closed' && editingPO.purchase_notes && (
                        <div style={{ fontSize: 11, color: 'var(--txt2)', marginTop: 4, fontStyle: 'italic', maxWidth: 420 }}>
                          Note: {editingPO.purchase_notes}
                        </div>
                      )}
                    </div>
                    <button onClick={() => { setEditingPO(null); setPurchaseNote(''); }} style={{ background: 'none', border: 'none', fontSize: 18, cursor: 'pointer', color: 'var(--txt3)' }}>×</button>
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
                          <th key={h} style={{ padding: '9px 14px', textAlign: i > 0 ? 'right' : 'left', verticalAlign: 'middle', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: 'var(--txt3)', borderBottom: '1px solid var(--bdr)' }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {editItems.map((item, i) => (
                        <tr key={i} style={{ borderBottom: '1px solid var(--bdr)' }}>
                          <td style={{ padding: '10px 14px' }}>
                            <DrugNameCode name={item.drug_name} code={item.drug_code} nameSize={13} />
                          </td>
                          <td style={{ padding: '7px 14px', textAlign: 'right' }}>
                            <input type="number" min="0" value={item.quantity}
                              onChange={e => setEditItems(prev => prev.map((it, idx) => idx === i ? { ...it, quantity: parseFloat(e.target.value) || 0 } : it))}
                              style={{ width: 80, padding: '5px 8px', border: '1px solid var(--bdr2)', borderRadius: 6, fontSize: 12, textAlign: 'right', fontFamily: 'var(--fb)', outline: 'none' }} />
                          </td>
                          <td style={{ padding: '7px 14px', textAlign: 'right' }}>
                            <input type="number" min="0" step="0.01" value={item.unit_price}
                              onChange={e => setEditItems(prev => prev.map((it, idx) => idx === i ? { ...it, unit_price: parseFloat(e.target.value) || 0 } : it))}
                              style={{ width: 100, padding: '5px 8px', border: '1px solid var(--bdr2)', borderRadius: 6, fontSize: 12, textAlign: 'right', fontFamily: 'var(--fb)', outline: 'none' }} />
                          </td>
                          <td style={{ padding: '10px 14px', fontSize: 13, fontWeight: 600, textAlign: 'right' }}>{fmtINR(item.quantity * item.unit_price)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  {/* Closed state banner */}
                  {activeTab === 'purchase' && editingPO.status === 'closed' && (
                    <div style={{ padding: '10px 16px', background: 'var(--grn-lt,#f0fdf4)', borderTop: '1px solid var(--grn)', display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: 18 }}>✅</span>
                      <div>
                        <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--grn)' }}>Purchase already saved — this order is closed</div>
                        <div style={{ fontSize: 11, color: 'var(--txt3)' }}>No further changes can be made to this purchase order.</div>
                      </div>
                    </div>
                  )}

                  {/* Mismatch detection — compare editItems vs original PO items */}
                  {(() => {
                    const origItems = editingPO.items || [];
                    const isClosed = activeTab === 'purchase' && editingPO.status === 'closed';
                    const hasMismatch = !isClosed && activeTab === 'purchase' && (
                      editItems.length !== origItems.length ||
                      editItems.some(ei => {
                        const orig = origItems.find(o => o.drug_id === ei.drug_id);
                        return !orig ||
                          Number(orig.quantity) !== Number(ei.quantity) ||
                          Number(orig.unit_price) !== Number(ei.unit_price);
                      }) ||
                      origItems.some(o => !editItems.find(ei => ei.drug_id === o.drug_id))
                    );
                    // Note required if mismatch; save allowed but order won't close until items match
                    const canSave = !isClosed && (!hasMismatch || purchaseNote.trim().length > 0);

                    return (
                      <>
                        {!isClosed && !hasMismatch && activeTab === 'purchase' && (
                          <div style={{ padding: '8px 16px', borderTop: '1px solid var(--grn)', background: 'var(--grn-lt,#f0fdf4)', display: 'flex', alignItems: 'center', gap: 6 }}>
                            <span style={{ fontSize: 13 }}>✓</span>
                            <span style={{ fontSize: 11, color: 'var(--grn)', fontWeight: 600 }}>Items match the purchase order — saving will close this order</span>
                          </div>
                        )}
                        {hasMismatch && (
                          <div style={{ padding: '10px 16px', borderTop: '1px solid #fcd34d', background: 'var(--amber-lt,#fff8e6)' }}>
                            <div style={{ fontSize: 11, fontWeight: 700, color: '#b45309', marginBottom: 6 }}>
                              ⚠ Items differ from the purchase order — you can save but the order will stay open until they match. A note is required.
                            </div>
                            {editItems.map(ei => {
                              const orig = origItems.find(o => o.drug_id === ei.drug_id);
                              const qtyDiff = orig ? Number(ei.quantity) - Number(orig.quantity) : null;
                              const priceDiff = orig ? Number(ei.unit_price) - Number(orig.unit_price) : null;
                              if (!orig || (qtyDiff === 0 && priceDiff === 0)) return null;
                              return (
                                <div key={ei.drug_id} style={{ fontSize: 10, color: '#92400e', marginBottom: 3 }}>
                                  <strong>{ei.drug_name}</strong>
                                  {ei.drug_code != null && String(ei.drug_code).trim() !== '' && (
                                    <span style={{ fontWeight: 600, color: '#a16207' }}> · {ei.drug_code}</span>
                                  )}
                                  {qtyDiff !== 0 && <span> · Qty: {Number(orig.quantity)} → {ei.quantity} ({qtyDiff > 0 ? '+' : ''}{qtyDiff})</span>}
                                  {priceDiff !== 0 && <span> · Price: {fmtINR(orig.unit_price)} → {fmtINR(ei.unit_price)}</span>}
                                </div>
                              );
                            })}
                            {origItems.filter(o => !editItems.find(ei => ei.drug_id === o.drug_id)).map(o => (
                              <div key={o.drug_id} style={{ fontSize: 10, color: '#92400e', marginBottom: 3 }}>
                                <strong>{o.drug_name}</strong>
                                {o.drug_code != null && String(o.drug_code).trim() !== '' && (
                                  <span style={{ fontWeight: 600, color: '#a16207' }}> · {o.drug_code}</span>
                                )}
                                {' '}· Removed from purchase
                              </div>
                            ))}
                            <textarea
                              value={purchaseNote}
                              onChange={e => setPurchaseNote(e.target.value)}
                              placeholder="Explain the reason for changes (required)…"
                              rows={2}
                              style={{ width: '100%', marginTop: 8, padding: '6px 8px', border: `1px solid ${purchaseNote.trim() ? 'var(--grn)' : '#f59e0b'}`, borderRadius: 6, fontSize: 12, fontFamily: 'var(--fb)', outline: 'none', resize: 'vertical', boxSizing: 'border-box' }}
                            />
                          </div>
                        )}

                        {/* Footer */}
                        <div style={{ padding: '12px 16px', borderTop: '1px solid var(--bdr)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg1)' }}>
                          <div style={{ fontSize: 12, color: 'var(--txt2)', display: 'flex', gap: 24 }}>
                            <span>Subtotal: <strong>{fmtINR(editSubtotal)}</strong></span>
                            <span>Tax: <strong>{fmtINR(editTax)}</strong></span>
                            <span style={{ fontSize: 14, color: 'var(--txt)', fontWeight: 800 }}>Total: {fmtINR(editTotal)}</span>
                          </div>
                          <div style={{ display: 'flex', gap: 8 }}>
                            <Btn variant="ghost" onClick={() => { setEditingPO(null); setPurchaseNote(''); }}>Cancel</Btn>
                            <Btn variant="primary"
                              disabled={(activeTab === 'purchase' ? savePurchase.isPending : updatePO.isPending) || (activeTab === 'transfer' && !toPlaceOfWorkingId) || (activeTab === 'purchase' && !canSave)}
                              onClick={() => {
                                if (activeTab === 'transfer' && !toPlaceOfWorkingId) { toast.error('Select a destination place of working'); return; }
                                if (activeTab === 'purchase' && isClosed) { toast.error('This purchase order is already closed'); return; }
                                if (activeTab === 'purchase' && !canSave) { toast.error('Add a note explaining the changes'); return; }
                                if (activeTab === 'purchase') {
                                  savePurchase.mutate({
                                    invoice_no: `PUR-${Date.now()}`,
                                    purchase_order_id: editingPO.id,
                                    place_of_working_id: editingPO.place_of_working_id,
                                    allocation_id: editingPO.allocation_id,
                                    financial_year_id: editingPO.financial_year_id,
                                    scheme_id: editingPO.scheme_id,
                                    quarter_id: editingPO.quarter_id,
                                    institution_type_id: editingPO.institution_type_id,
                                    subtotal: editSubtotal, tax: editTax, total: editTotal,
                                    notes: purchaseNote.trim() || null,
                                    items: editItems.map(it => ({ drug_id: it.drug_id, quantity: it.quantity, unit_price: it.unit_price, discount: it.discount || 0, gst_pct: it.gst_pct || 0, total: it.quantity * it.unit_price })),
                                  });
                                  setPurchaseNote('');
                                } else {
                                  updatePO.mutate({ id: editingPO.id, payload: {
                                    ...(activeTab === 'transfer' && { to_place_of_working_id: toPlaceOfWorkingId }),
                                    items: editItems.map(it => ({ drug_id: it.drug_id, quantity: it.quantity, unit_price: it.unit_price, discount: it.discount || 0, total: it.quantity * it.unit_price })),
                                    subtotal: editSubtotal, tax: editTax, total: editTotal,
                                  }});
                                }
                              }}>
                              {(activeTab === 'purchase' ? savePurchase.isPending : updatePO.isPending) ? 'Saving…' : activeTab === 'transfer' ? 'Save as Transfer' : 'Save as Purchase'}
                            </Btn>
                          </div>
                        </div>
                      </>
                    );
                  })()}
                </div>

                {/* Purchase history for this PO */}
                {activeTab === 'purchase' && poHistory?.length > 0 && (
                  <div style={{ background: '#fff', borderRadius: 10, border: '1px solid var(--bdr)', overflow: 'hidden', marginTop: 16 }}>
                    <div style={{ padding: '10px 16px', background: 'var(--bg1)', borderBottom: '1px solid var(--bdr)', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.05em', color: 'var(--txt3)' }}>
                      Purchase History ({poHistory.length})
                    </div>
                    {poHistory.map((pur, pi) => (
                      <div key={pur.id} style={{ borderBottom: pi < poHistory.length - 1 ? '1px solid var(--bdr)' : 'none' }}>
                        {/* Purchase header */}
                        <div style={{ padding: '10px 16px', background: 'var(--bg1)', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                          <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--blu)' }}>{pur.invoice_no}</span>
                              <span style={{ fontSize: 10, color: 'var(--txt3)' }}>{pur.purchase_date?.slice(0, 10)}</span>
                            </div>
                            {pur.notes && (
                              <div style={{ marginTop: 4, padding: '4px 8px', background: 'var(--amber-lt,#fff8e6)', borderRadius: 5, border: '1px solid #fcd34d', fontSize: 10, color: '#92400e', maxWidth: 500 }}>
                                <strong>Note:</strong> {pur.notes}
                              </div>
                            )}
                          </div>
                          <span style={{ fontSize: 13, fontWeight: 800, whiteSpace: 'nowrap' }}>{fmtINR(pur.total)}</span>
                        </div>
                        {/* Purchase items */}
                        <table style={{ width: '100%', tableLayout: 'fixed', borderCollapse: 'collapse', minWidth: 560 }}>
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
                            {(pur.items || []).map((item, ii) => {
                              const pBase = Number(item.quantity) * Number(item.unit_price);
                              const pGst = (pBase * (parseFloat(item.gst_pct) || 0)) / 100;
                              return (
                              <tr key={ii} style={{ borderBottom: '1px solid var(--bdr)' }}>
                                <td style={{ padding: '8px 12px', overflow: 'hidden', verticalAlign: 'middle' }}>
                                  <DrugNameCode name={item.drug_name} code={item.drug_code} />
                                </td>
                                <td style={{ padding: '8px 12px', textAlign: 'right', fontSize: 12, verticalAlign: 'middle', fontFamily: 'var(--fm)' }}>{item.quantity}</td>
                                <td style={{ padding: '8px 12px', textAlign: 'right', fontSize: 12, verticalAlign: 'middle', fontFamily: 'var(--fd)' }}>{fmtINR(item.unit_price)}</td>
                                <td style={{ padding: '8px 12px', textAlign: 'right', fontSize: 12, color: 'var(--txt3)', verticalAlign: 'middle' }}>{item.gst_pct ?? 0}%</td>
                                <td style={{ padding: '8px 12px', textAlign: 'right', fontSize: 12, fontWeight: 700, verticalAlign: 'middle', fontFamily: 'var(--fd)', color: 'var(--txt2)' }}>{fmtINR(pGst)}</td>
                                <td style={{ padding: '8px 12px', textAlign: 'right', fontSize: 12, fontWeight: 700, verticalAlign: 'middle', fontFamily: 'var(--fd)' }}>{fmtINR(item.total)}</td>
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
          })()}

          {!editingPO && filtersApplied && purchaseOrdersHistoryList.length > 0 && (
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--txt4)', fontSize: 13 }}>
              Click an invoice number above to view details
            </div>
          )}
        </div>
      )}

      {/* Main layout — PO / Sale tabs */}
      <div style={{ flex: 1, display: (activeTab === 'purchase' || activeTab === 'transfer') ? 'none' : 'grid', gridTemplateColumns: hidePoCartAndBill ? '1fr' : '1fr 310px', overflow: 'hidden', minHeight: 0 }}>

        {/* Left panel */}
        <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden', background: 'var(--bg1)' }}>

          {isPO && (
            <div style={{ padding: '12px 14px', flexShrink: 0, background: '#fff', borderBottom: '1px solid var(--bdr)' }}>
              {!filtersApplied ? (
                <div style={{ padding: '10px 0', color: 'var(--txt4)', fontSize: 12, textAlign: 'center' }}>
                  Apply filters and click Search to load budget allocations
                </div>
              ) : allocFetching ? (
                <div style={{ padding: '10px 0', color: 'var(--txt3)', fontSize: 12, textAlign: 'center' }}>Loading allocations…</div>
              ) : !allocationsForIndent.length ? (
                <div style={{ padding: '10px 0', color: 'var(--red)', fontSize: 12, textAlign: 'center' }}>
                  No budget allocations found for selected filters
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 10 }}>
                  {allocationsForIndent.map((alloc) => {
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
                          textAlign: 'left', padding: '12px 14px', borderRadius: 10,
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
          )}

          {/* Draft banner */}
          {isPO && filtersApplied && existingDraft && !draftDismissed && !cartItems.length && (
            <div style={{ margin: '0 14px 8px', padding: '10px 14px', background: '#fffbeb', border: '1px solid #fcd34d', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, flexShrink: 0 }}>
              <div>
                <div style={{ fontSize: 12, fontWeight: 700, color: '#92400e' }}>
                  📋 Draft found — {(existingDraft.items || []).length} item(s) · {fmtINR(existingDraft.total)}
                </div>
                <div style={{ fontSize: 10, color: '#b45309', marginTop: 2 }}>
                  Last saved {existingDraft.updated_at ? new Date(existingDraft.updated_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : ''}
                </div>
              </div>
              <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                <button
                  type="button"
                  onClick={() => loadDraft(existingDraft)}
                  style={{ padding: '5px 12px', fontSize: 11, fontWeight: 700, background: '#f59e0b', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontFamily: 'var(--fb)' }}
                >
                  Load Draft
                </button>
                <button
                  type="button"
                  onClick={() => setDraftDismissed(true)}
                  style={{ padding: '5px 8px', fontSize: 12, background: 'transparent', color: '#92400e', border: '1px solid #fcd34d', borderRadius: 6, cursor: 'pointer' }}
                >
                  ✕
                </button>
              </div>
            </div>
          )}

          {/* Search */}
          {!hidePoCartAndBill && (
          <div style={{ padding: '7px 14px', background: '#fff', borderBottom: '1px solid var(--bdr)', position: 'relative', flexShrink: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, border: '1.5px solid var(--blu-bdr)', borderRadius: 8, padding: '5px 10px', background: '#fff', maxWidth: 320, width: '100%' }}>
              <span style={{ fontSize: 13, flexShrink: 0 }}>🔍</span>
              <input value={searchQ} onChange={e => setSearchQ(e.target.value)} placeholder="Search drug name or code…"
                style={{ width: '100%', border: 'none', outline: 'none', fontSize: 12, background: 'transparent', color: 'var(--txt)', fontFamily: 'var(--fb)' }} />
              {searchQ && <button onClick={() => setSearchQ('')} style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'var(--txt3)', fontSize: 14, padding: 0, lineHeight: 1 }}>×</button>}
            </div>
            {searchQ.length >= 2 && searchResults?.length > 0 && (
              <div style={{ position: 'absolute', top: '100%', left: 14, right: 14, background: '#fff', border: '1px solid var(--bdr)', borderRadius: 10, boxShadow: 'var(--sh3)', zIndex: 100, overflow: 'hidden' }}>
                {searchResults.map(d => (
                  <div key={d.id} onClick={() => addToCart(d)}
                    style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', cursor: 'pointer', borderBottom: '1px solid var(--bdr)' }}
                    onMouseEnter={e => e.currentTarget.style.background = 'var(--blu-lt)'}
                    onMouseLeave={e => e.currentTarget.style.background = '#fff'}
                  >
                    <div style={{ width: 34, height: 34, borderRadius: 8, background: 'var(--blu-lt)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, flexShrink: 0 }}>💊</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 12, fontWeight: 600 }}>{d.name}</div>
                      <div style={{ fontSize: 10, color: 'var(--txt3)' }}>{d.code} · {d.unit} · Stock: {d.current_stock ?? 0}</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--blu)', marginBottom: 3 }}>{fmtINR(d.unit_price)}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          )}

          {hidePoCartAndBill && (
            <div style={{ padding: '14px 16px', margin: '0 14px', marginTop: 8, background: 'var(--amber-lt,#fff8e6)', border: '1px solid #fcd34d', borderRadius: 10, fontSize: 12, color: '#92400e', lineHeight: 1.45 }}>
              {poAllBudgetsNearlyExhausted ? (
                <>
                  <strong>No budget left to buy:</strong> every allocation for these filters is at or above <strong>98%</strong> utilized (including fully spent). Cart and bill summary are hidden until a line has enough remaining budget.
                </>
              ) : (
                <>
                  <strong>No valid purchase mix:</strong> with current unit prices and GST, no combination of the listed drugs can reach the required <strong>98%</strong> of the combined budget ({fmtINR(selectedGroupBudget)}) while staying within budget. Change the selection or budget allocation.
                </>
              )}
            </div>
          )}

          {/* Quick-add cards — 2-row scrollable grid */}
          {!hidePoCartAndBill && selectedAllocations.length > 0 && allocationDrugs.length > 0 && (
            <div style={{ padding: '6px 8px', background: '#fff', borderBottom: '1px solid var(--bdr)', flexShrink: 0 }}>
              <div style={{ display: 'grid', gridTemplateRows: 'repeat(2, auto)', gridAutoFlow: 'column', gridAutoColumns: 'minmax(132px, 132px)', gap: 5, overflowX: 'auto', scrollbarWidth: 'none' }} ref={cardListRef}>
                {allocationDrugs.map(d => (
                  <div key={d.id} onClick={() => addToCart(d)}
                    style={{
                      border: '1px solid var(--bdr2)',
                      borderRadius: 6,
                      padding: '5px 6px',
                      background: '#fff',
                      cursor: 'pointer',
                      transition: 'var(--t)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 4,
                      minHeight: 0,
                    }}
                    onMouseEnter={e => { e.currentTarget.style.boxShadow = 'var(--sh2)'; e.currentTarget.style.borderColor = 'var(--blu-bdr)'; }}
                    onMouseLeave={e => { e.currentTarget.style.boxShadow = 'none'; e.currentTarget.style.borderColor = 'var(--bdr2)'; }}
                  >
                    <div
                      title={d.name}
                      style={{
                        background: 'linear-gradient(90deg, var(--blu-lt) 0%, rgba(219,234,254,0.35) 100%)',
                        borderLeft: '3px solid var(--blu)',
                        borderRadius: 4,
                        padding: '3px 5px',
                        fontSize: 10,
                        fontWeight: 800,
                        color: 'var(--blu2)',
                        lineHeight: 1.2,
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}
                    >
                      {d.name}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 4, minWidth: 0 }}>
                      <span
                        title={`${d.code} · ${d.unit}`}
                        style={{
                          fontSize: 9,
                          color: 'var(--txt3)',
                          lineHeight: 1.2,
                          flex: 1,
                          minWidth: 0,
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                        }}
                      >
                        {d.code} 
                      </span>
                      <span style={{ fontSize: 10, fontWeight: 800, fontFamily: 'var(--fd)', color: 'var(--txt)', flexShrink: 0 }}>{fmtINR(d.unit_price)}</span>
                      <span style={{ fontSize: 9, fontWeight: 700, background: 'var(--blu)', color: '#fff', borderRadius: 8, padding: '2px 5px', letterSpacing: '.02em', flexShrink: 0 }}>+Add</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Cart */}
          <div style={{ flex: 1, overflow: 'auto', padding: '0 14px 8px' }}>
            {!hidePoCartAndBill && (
            <>
            <table style={{ width: '100%', tableLayout: 'fixed', borderCollapse: 'collapse', background: '#fff', borderRadius: 10, overflow: 'hidden', border: '1px solid var(--bdr)', marginTop: 6 }}>
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
                  {(isPO ? ['Item', 'Qty', 'Price', 'GST %', 'GST Amt', 'Total', ''] : ['Item', 'Qty', 'Price', 'Disc.', 'Total', '']).map((h, i, arr) => {
                    const align = i === 0 ? 'left' : i === arr.length - 1 ? 'center' : 'right';
                    return (
                      <th
                        key={h || `col-${i}`}
                        style={{
                          padding: '6px 8px',
                          textAlign: align,
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
                {!cartItems.length
                  ? (
                    <tr>
                      <td colSpan={isPO ? 7 : 6} style={{ textAlign: 'center', padding: '14px 10px', color: 'var(--txt4)', fontSize: 12, lineHeight: 1.35 }}>
                        No items. Search or click a drug above.
                      </td>
                    </tr>
                  )
                  : cartItems.map((item) => {
                    const base = item.qty * item.unit_price;
                    const lineTax = (base * (parseFloat(item.gstPct) || 0)) / 100;
                    const lineTotalSale = base - (item.lineDiscount || 0);
                    const lineTotalPO = base + lineTax;
                    return (
                      <tr
                        key={item.drug_id}
                        style={{ borderBottom: '1px solid var(--bdr)' }}
                        onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--bg1)'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
                      >
                        <td style={{ padding: '5px 8px', verticalAlign: 'middle', overflow: 'hidden' }}>
                          <div style={{ fontSize: 12, fontWeight: 500, lineHeight: 1.25, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={item.name}>{item.name}</div>
                          <div style={{ fontSize: 10, color: 'var(--txt3)', lineHeight: 1.2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={[item.code, item.unit].filter(Boolean).join(' · ')}>
                            {[item.code, item.unit].filter(Boolean).join(' · ') || '—'}
                          </div>
                        </td>
                        <td style={{ padding: '5px 6px', textAlign: 'right', verticalAlign: 'middle' }}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 4 }}>
                            <button type="button" onClick={() => updateQty(item.drug_id, item.qty - 1)} style={{ width: 22, height: 22, borderRadius: '50%', border: '1px solid var(--bdr2)', background: 'var(--bg2)', cursor: 'pointer', fontFamily: 'var(--fb)', fontSize: 14, flexShrink: 0 }}>−</button>
                            <input
                              type="number"
                              min="1"
                              value={item.qty}
                              onChange={(e) => updateQty(item.drug_id, e.target.value)}
                              style={{ width: 44, padding: '3px 4px', border: '1px solid var(--bdr2)', borderRadius: 5, fontSize: 12, fontWeight: 700, textAlign: 'center', outline: 'none', fontFamily: 'var(--fb)' }}
                            />
                            <button type="button" onClick={() => updateQty(item.drug_id, item.qty + 1)} style={{ width: 22, height: 22, borderRadius: '50%', border: '1px solid var(--blu-bdr)', background: 'var(--blu-lt)', cursor: 'pointer', color: 'var(--blu)', fontFamily: 'var(--fb)', fontSize: 14, flexShrink: 0 }}>+</button>
                          </div>
                        </td>
                        <td style={{ padding: '5px 8px', textAlign: 'right', fontSize: 12, verticalAlign: 'middle', fontFamily: 'var(--fd)' }}>{fmtINR(item.unit_price)}</td>
                        <td style={{ padding: '5px 6px', textAlign: 'right', verticalAlign: 'middle' }}>
                          {isPO ? (
                            <input
                              type="number"
                              value={item.gstPct ?? 0}
                              onChange={(e) => updateGstPct(item.drug_id, e.target.value)}
                              style={{ width: 44, padding: '3px 5px', border: '1px solid var(--bdr2)', borderRadius: 4, fontSize: 11, textAlign: 'right', outline: 'none', fontFamily: 'var(--fb)', boxSizing: 'border-box' }}
                            />
                          ) : (
                            <input
                              type="number"
                              value={item.lineDiscount ?? 0}
                              onChange={(e) => updateDisc(item.drug_id, e.target.value)}
                              style={{ width: 56, padding: '3px 5px', border: '1px solid var(--bdr2)', borderRadius: 4, fontSize: 11, textAlign: 'right', outline: 'none', fontFamily: 'var(--fb)' }}
                            />
                          )}
                        </td>
                        {isPO && (
                          <td style={{ padding: '5px 8px', textAlign: 'right', fontSize: 11, fontWeight: 700, verticalAlign: 'middle', fontFamily: 'var(--fd)', color: 'var(--txt2)' }} title="GST amount on this line">
                            {fmtINR(lineTax)}
                          </td>
                        )}
                        <td style={{ padding: '5px 8px', textAlign: 'right', fontSize: 12, fontWeight: 700, verticalAlign: 'middle', fontFamily: 'var(--fd)' }}>
                          {fmtINR(isPO ? lineTotalPO : lineTotalSale)}
                        </td>
                        <td style={{ padding: '5px 4px', verticalAlign: 'middle', textAlign: 'center' }}>
                          <button type="button" onClick={() => removeItem(item.drug_id)} style={{ width: 20, height: 20, borderRadius: '50%', border: 'none', background: 'var(--red-lt)', color: 'var(--red)', cursor: 'pointer', fontSize: 10, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
            {cartItems.length > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 10px', background: 'var(--bg2)', borderRadius: '0 0 10px 10px', fontSize: 11, color: 'var(--txt3)', border: '1px solid var(--bdr)', borderTop: 'none' }}>
                <span>{cartItems.length} items · {cartItems.reduce((s, i) => s + i.qty, 0)} units</span>
                <span style={{ fontWeight: 700, color: 'var(--txt)', fontSize: 13 }}>{fmtINR(isPO ? subtotalPO + taxPO : subtotalSale)}</span>
              </div>
            )}
            </>
            )}

            {/* Purchase history — expandable rows (all statuses, including drafts) */}
            {filtersApplied && purchaseOrdersHistoryList.length > 0 && (
              <div style={{ marginTop: 16 }}>
                <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.05em', color: 'var(--txt3)', marginBottom: 6, paddingLeft: 2 }}>Purchase Orders</div>
                <div style={{ border: '1px solid var(--bdr)', borderRadius: 10, overflow: 'hidden' }}>
                  {purchaseOrdersHistoryList.map((po, idx, arr) => {
                    const isExpanded = expandedHistoryId === po.id;
                    const purHist = normalisePurchaseHistory(po.purchase_history);
                    const st = (po.status || '').toLowerCase();
                    const statusPill = st === 'closed'
                      ? { bg: 'var(--grn-lt,#f0fdf4)', color: 'var(--grn)', label: 'Closed' }
                      : st === 'confirmed'
                        ? { bg: '#eff6ff', color: '#1d4ed8', label: 'Open' }
                        : st === 'draft'
                          ? { bg: 'var(--amber-lt,#fff8e6)', color: '#b45309', label: 'Draft' }
                          : st === 'cancelled'
                            ? { bg: 'var(--red-lt)', color: 'var(--red)', label: 'Cancelled' }
                            : { bg: 'var(--bg2)', color: 'var(--txt3)', label: st ? st.replace(/^./, (c) => c.toUpperCase()) : '—' };
                    return (
                      <div key={po.id} style={{ borderBottom: idx < arr.length - 1 ? '1px solid var(--bdr)' : 'none' }}>
                        {/* Summary row — click to expand */}
                        <div
                          onClick={() => {
                            setExpandedHistoryId(isExpanded ? null : po.id);
                            if (isExpanded) setExpandedHistoryPurchaseKey(null);
                          }}
                          style={{ display: 'grid', gridTemplateColumns: '1fr auto auto auto', gap: 8, alignItems: 'center', padding: '6px 10px', background: isExpanded ? 'var(--blu-lt)' : idx % 2 === 0 ? '#fff' : 'var(--bg1)', cursor: 'pointer' }}
                          onMouseEnter={e => { if (!isExpanded) e.currentTarget.style.background = 'var(--bg1)'; }}
                          onMouseLeave={e => { if (!isExpanded) e.currentTarget.style.background = idx % 2 === 0 ? '#fff' : 'var(--bg1)'; }}
                        >
                          <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                              <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--blu)' }}>{po.invoice_no}</span>
                              <span style={{ fontSize: 9, fontWeight: 700, padding: '2px 6px', borderRadius: 6, background: statusPill.bg, color: statusPill.color }}>{statusPill.label}</span>
                            </div>
                            <div style={{ fontSize: 10, color: 'var(--txt3)' }}>{po.sale_date?.slice(0, 10)} · {(po.items || []).length} items</div>
                          </div>
                          <div style={{ fontSize: 12, fontWeight: 700, textAlign: 'right', whiteSpace: 'nowrap' }}>{fmtINR(po.total)}</div>
                          <div style={{ fontSize: 10, color: 'var(--txt3)', paddingLeft: 4 }}>{isExpanded ? '▲' : '▼'}</div>
                        </div>

                        {/* Expanded: order lines + goods-received history */}
                        {isExpanded && (
                          <div style={{ borderTop: '1px solid var(--blu-bdr)', background: '#fff', overflowX: 'auto' }}>
                            <div style={{ padding: '8px 10px 4px', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.05em', color: 'var(--txt3)' }}>
                              ORDER LINES
                            </div>
                            <table style={{ width: '100%', minWidth: 580, tableLayout: 'fixed', borderCollapse: 'collapse' }}>
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
                                {(po.items || []).map((item, i) => {
                                  const lineBase = Number(item.quantity) * Number(item.unit_price);
                                  const lineGstAmt = (lineBase * (parseFloat(item.gst_pct) || 0)) / 100;
                                  return (
                                  <tr key={i} style={{ borderBottom: '1px solid var(--bdr)' }}>
                                    <td style={{ padding: '5px 8px', verticalAlign: 'middle', overflow: 'hidden' }}>
                                      <DrugNameCode name={item.drug_name} code={item.drug_code} />
                                    </td>
                                    <td style={{ padding: '5px 8px', textAlign: 'right', fontSize: 12, verticalAlign: 'middle', fontFamily: 'var(--fm)' }}>{item.quantity}</td>
                                    <td style={{ padding: '5px 8px', textAlign: 'right', fontSize: 12, verticalAlign: 'middle', fontFamily: 'var(--fd)' }}>{fmtINR(item.unit_price)}</td>
                                    <td style={{ padding: '5px 8px', textAlign: 'right', fontSize: 12, color: 'var(--txt3)', verticalAlign: 'middle' }}>{item.gst_pct ?? 0}%</td>
                                    <td style={{ padding: '5px 8px', textAlign: 'right', fontSize: 12, fontWeight: 700, color: 'var(--txt2)', verticalAlign: 'middle', fontFamily: 'var(--fd)' }}>{fmtINR(lineGstAmt)}</td>
                                    <td style={{ padding: '5px 8px', textAlign: 'right', fontSize: 12, fontWeight: 700, verticalAlign: 'middle', fontFamily: 'var(--fd)' }}>{fmtINR(item.total)}</td>
                                  </tr>
                                  );
                                })}
                              </tbody>
                              <tfoot>
                                <tr style={{ background: 'var(--bg1)' }}>
                                  <td colSpan={5} style={{ padding: '5px 8px', fontSize: 11, fontWeight: 600, color: 'var(--txt2)' }}>
                                    {(po.items || []).length} items · {(po.items || []).reduce((s, i) => s + Number(i.quantity), 0)} units
                                  </td>
                                  <td style={{ padding: '5px 8px', textAlign: 'right', fontSize: 13, fontWeight: 800, fontFamily: 'var(--fd)' }}>{fmtINR(po.total)}</td>
                                </tr>
                              </tfoot>
                            </table>

                            {/* Edit in Cart — only for non-closed POs */}
                            {st !== 'closed' && st !== 'cancelled' && (
                              <div style={{ padding: '8px 10px', borderTop: '1px solid var(--bdr)', display: 'flex', justifyContent: 'flex-end' }}>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setCartItems((po.items || []).map(item => ({
                                      drug_id: item.drug_id,
                                      name: item.drug_name,
                                      code: item.drug_code || '',
                                      unit: '',
                                      qty: Number(item.quantity),
                                      unit_price: Number(item.unit_price),
                                      lineDiscount: Number(item.discount) || 0,
                                      gstPct: Number(item.gst_pct) || 0,
                                    })));
                                    if (po.allocation_id) setSelectedAllocationIds(new Set([po.allocation_id]));
                                    setEditingCartPOId(po.id);
                                    setExpandedHistoryId(null);
                                    toast.success(`Loaded "${po.invoice_no}" into cart for editing`);
                                  }}
                                  style={{ padding: '5px 12px', fontSize: 11, fontWeight: 700, background: 'var(--blu)', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontFamily: 'var(--fb)' }}
                                >
                                  ✏ Edit in Cart
                                </button>
                              </div>
                            )}

                            {purHist.length > 0 && (
                              <div style={{ marginTop: 14, borderTop: '1px solid var(--bdr)', paddingTop: 8 }}>
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
                                    📋 Purchase history — {purHist.length} receipt{purHist.length === 1 ? '' : 's'} ·{' '}
                                    {fmtINR(purHist.reduce((s, p) => s + Number(p.total || 0), 0))}
                                  </div>
                                  <div style={{ fontSize: 10, color: '#b45309', marginTop: 2 }}>
                                    Last recorded {lastRecordedLabel(purHist)}
                                  </div>
                                </div>
                                <div style={{ border: '1px solid var(--bdr)', borderRadius: 10, overflow: 'hidden', margin: '0 8px 8px' }}>
                                  {purHist.map((pur, pIdx, pArr) => {
                                    const pItems = Array.isArray(pur.items) ? pur.items : [];
                                    const pKey = `${po.id}::${pur.id || pur.invoice_no || pIdx}`;
                                    const purExpanded = expandedHistoryPurchaseKey === pKey;
                                    const receivedPill = { bg: 'var(--amber-lt,#fff8e6)', color: '#b45309', label: 'Received' };
                                    return (
                                      <div key={pKey} style={{ borderBottom: pIdx < pArr.length - 1 ? '1px solid var(--bdr)' : 'none' }}>
                                        <div
                                          role="button"
                                          tabIndex={0}
                                          onClick={() => setExpandedHistoryPurchaseKey(purExpanded ? null : pKey)}
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
                                            background: purExpanded ? 'var(--blu-lt)' : pIdx % 2 === 0 ? '#fff' : 'var(--bg1)',
                                            cursor: 'pointer',
                                          }}
                                          onMouseEnter={(e) => {
                                            if (!purExpanded) e.currentTarget.style.background = 'var(--bg1)';
                                          }}
                                          onMouseLeave={(e) => {
                                            if (!purExpanded) e.currentTarget.style.background = pIdx % 2 === 0 ? '#fff' : 'var(--bg1)';
                                          }}
                                        >
                                          <div>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                                              <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--blu)' }}>{pur.invoice_no || '—'}</span>
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
                                              {pur.purchase_date?.slice?.(0, 10) || '—'} · {pItems.length} item{pItems.length === 1 ? '' : 's'}
                                            </div>
                                          </div>
                                          <div style={{ fontSize: 12, fontWeight: 700, textAlign: 'right', whiteSpace: 'nowrap' }}>{fmtINR(pur.total)}</div>
                                          <div style={{ fontSize: 10, color: 'var(--txt3)', paddingLeft: 4 }}>{purExpanded ? '▲' : '▼'}</div>
                                        </div>
                                        {purExpanded && (
                                          <div style={{ borderTop: '1px solid var(--blu-bdr)', background: '#fff', overflowX: 'auto' }}>
                                            {pur.notes && (
                                              <div style={{ fontSize: 10, color: 'var(--txt3)', fontStyle: 'italic', padding: '8px 10px 0' }}>{pur.notes}</div>
                                            )}
                                            <div style={{ padding: '8px 10px 4px', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.05em', color: 'var(--txt3)' }}>
                                              ORDER LINES
                                            </div>
                                            <table style={{ width: '100%', minWidth: 580, tableLayout: 'fixed', borderCollapse: 'collapse' }}>
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
                                                {pItems.map((item, pi) => {
                                                  const lineBase = Number(item.quantity) * Number(item.unit_price);
                                                  const lineGstAmt = (lineBase * (parseFloat(item.gst_pct) || 0)) / 100;
                                                  const batchLine = [item.batch_no && `Batch ${item.batch_no}`, item.expiry_date && `Exp ${String(item.expiry_date).slice(0, 10)}`].filter(Boolean).join(' · ');
                                                  return (
                                                    <tr key={item.id || pi} style={{ borderBottom: '1px solid var(--bdr)' }}>
                                                      <td style={{ padding: '5px 8px', verticalAlign: 'middle', overflow: 'hidden' }}>
                                                        <DrugNameCode name={item.drug_name} code={item.drug_code} />
                                                        {batchLine && (
                                                          <div style={{ fontSize: 9, color: 'var(--txt4)', marginTop: 2 }}>{batchLine}</div>
                                                        )}
                                                      </td>
                                                      <td style={{ padding: '5px 8px', textAlign: 'right', fontSize: 12, verticalAlign: 'middle', fontFamily: 'var(--fm)' }}>{item.quantity}</td>
                                                      <td style={{ padding: '5px 8px', textAlign: 'right', fontSize: 12, verticalAlign: 'middle', fontFamily: 'var(--fd)' }}>{fmtINR(item.unit_price)}</td>
                                                      <td style={{ padding: '5px 8px', textAlign: 'right', fontSize: 12, color: 'var(--txt3)', verticalAlign: 'middle' }}>{item.gst_pct ?? 0}%</td>
                                                      <td style={{ padding: '5px 8px', textAlign: 'right', fontSize: 12, fontWeight: 700, color: 'var(--txt2)', verticalAlign: 'middle', fontFamily: 'var(--fd)' }}>{fmtINR(lineGstAmt)}</td>
                                                      <td style={{ padding: '5px 8px', textAlign: 'right', fontSize: 12, fontWeight: 700, verticalAlign: 'middle', fontFamily: 'var(--fd)' }}>{fmtINR(item.total)}</td>
                                                    </tr>
                                                  );
                                                })}
                                              </tbody>
                                              <tfoot>
                                                <tr style={{ background: 'var(--bg1)' }}>
                                                  <td colSpan={5} style={{ padding: '5px 8px', fontSize: 11, fontWeight: 600, color: 'var(--txt2)' }}>
                                                    {pItems.length} items · {pItems.reduce((s, i) => s + Number(i.quantity), 0)} units
                                                  </td>
                                                  <td style={{ padding: '5px 8px', textAlign: 'right', fontSize: 13, fontWeight: 800, fontFamily: 'var(--fd)' }}>{fmtINR(pur.total)}</td>
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
            )}
            {filtersApplied && !poListFetching && purchaseOrdersHistoryList.length === 0 && (
              <div style={{ marginTop: 16, padding: '12px 14px', fontSize: 12, color: 'var(--txt4)', background: 'var(--bg2)', borderRadius: 10, border: '1px solid var(--bdr)' }}>
                No purchase orders for these filters.
              </div>
            )}
          </div>

        </div>

        {/* Right panel — bill summary */}
        {!hidePoCartAndBill && (
        <div style={{ background: '#fff', borderLeft: '1px solid var(--bdr)', display: 'flex', flexDirection: 'column' }}>
          <div style={{ padding: '16px 18px', flex: 1, overflowY: 'auto' }}>
            <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: '.05em', marginBottom: 18 }}>BILL SUMMARY</div>
            {isPO ? (
              <>
                {[
                  ['Subtotal', fmtINR(displaySubtotal)],
                  ['GST', fmtINR(displayTax)],
                ].map(([l, v]) => (
                  <div key={l} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--txt2)', marginBottom: 10 }}>
                    <span>{l}</span>
                    <span style={{ fontWeight: 600 }}>{v}</span>
                  </div>
                ))}
                <div style={{ height: 1, background: 'var(--bdr)', margin: '12px 0' }} />
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                  <span style={{ fontSize: 15, fontWeight: 800 }}>TOTAL</span>
                  <span style={{ fontSize: 24, fontWeight: 800, fontFamily: 'var(--fd)' }}>{fmtINR(total)}</span>
                </div>
                <div style={{ fontSize: 10, color: 'var(--txt3)', lineHeight: 1.5, marginBottom: 12 }}>
                  {selectedAllocations.length > 0 ? (
                    <>
                      {[
                        ['Combined budget', fmtINR(selectedGroupBudget)],
                        ['Already spent', fmtINR(selectedGroupSpent)],
                        ['This PO', fmtINR(poUsedBudget)],
                      ].map(([k, v]) => (
                        <div key={k} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                          <span>{k}</span>
                          <span style={{ fontWeight: 600, color: 'var(--txt2)' }}>{v}</span>
                        </div>
                      ))}
                      {poReserveBalance > 0 && cartItems.length > 0 && (
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                          <span>Reserve balance</span>
                          <span style={{ fontWeight: 700, color: 'var(--grn)' }}>{fmtINR(poReserveBalance)}</span>
                        </div>
                      )}
                      {poReserveBalance > 0 && cartItems.length > 0 && (
                        <div style={{ padding: '6px 8px', background: 'var(--grn-lt,#f0fdf4)', borderRadius: 6, color: 'var(--grn)', fontWeight: 600, marginTop: 4, fontSize: 10, lineHeight: 1.5 }}>
                          ✓ {fmtINR(poReserveBalance)} unused budget will be added to reserve balance on submit.
                        </div>
                      )}
                      {poOverBudget && (
                        <div style={{ padding: '6px 8px', background: 'var(--red-lt)', borderRadius: 6, color: 'var(--red)', fontWeight: 600, marginTop: 4, fontSize: 10 }}>
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
                  <div key={l} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--txt2)', marginBottom: 10 }}>
                    <span>{l}</span>
                    <span style={{ color: l === 'Discount' && globalDiscount > 0 ? 'var(--grn)' : 'var(--txt2)', fontWeight: l === 'Discount' && globalDiscount > 0 ? 700 : 400 }}>{v}</span>
                  </div>
                ))}
                <div style={{ height: 1, background: 'var(--bdr)', margin: '12px 0' }} />
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
                  <span style={{ fontSize: 15, fontWeight: 800 }}>TOTAL</span>
                  <span style={{ fontSize: 24, fontWeight: 800, fontFamily: 'var(--fd)' }}>{fmtINR(total)}</span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, marginBottom: 16 }}>
                  {[['cash', 'Cash'], ['card', 'Card'], ['upi', 'UPI'], ['wallet', 'Wallet']].map(([id, label]) => (
                    <button key={id} type="button" onClick={() => setPayMethod(id)}
                      style={{ padding: '8px 0', border: `2px solid ${payMethod === id ? 'var(--blu)' : 'var(--bdr)'}`, borderRadius: 6, background: payMethod === id ? 'var(--blu)' : '#fff', color: payMethod === id ? '#fff' : 'var(--txt2)', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--fb)' }}
                    >{label}</button>
                  ))}
                </div>
                {payMethod === 'cash' && (
                  <>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 12, marginBottom: 8 }}>
                      <span>Amount Received</span>
                      <input type="number" value={amtReceived} onChange={(e) => setAmtReceived(e.target.value)}
                        placeholder={total.toFixed(2)}
                        style={{ width: 100, padding: '5px 8px', border: '1px solid var(--bdr2)', borderRadius: 6, fontSize: 13, textAlign: 'right', fontWeight: 600, outline: 'none', fontFamily: 'var(--fb)' }} />
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, fontWeight: 700 }}>
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


          {/* CTAs */}
          <div style={{ padding: '14px 18px', display: 'flex', flexDirection: 'column', gap: 8, borderTop: '1px solid var(--bdr)', flexShrink: 0 }}>
            {/* Editing-cart banner */}
            {isPO && editingCartPOId && cartItems.length > 0 && (
              <div style={{ fontSize: 10, color: 'var(--blu)', background: 'var(--blu-lt)', border: '1px solid var(--blu-bdr)', borderRadius: 7, padding: '6px 10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontWeight: 600 }}>
                <span>✏ Editing existing PO</span>
                <button
                  type="button"
                  onClick={() => { setEditingCartPOId(null); setCartItems([]); }}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--blu)', fontSize: 12, fontWeight: 700, padding: '0 2px' }}
                >
                  ✕ Cancel
                </button>
              </div>
            )}
            {/* Save Draft only when NOT editing an existing PO */}
            {isPO && !editingCartPOId && cartItems.length > 0 && filtersApplied && (
              <button
                type="button"
                disabled={saveDraftMutation.isPending}
                onClick={handleSaveDraft}
                style={{ padding: '10px 14px', background: '#fffbeb', color: '#92400e', border: '1px solid #fcd34d', borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--fb)' }}
              >
                {saveDraftMutation.isPending ? '⟳ Saving…' : '📋 Save Draft'}
              </button>
            )}
            {isPO && poOverBudget && cartItems.length > 0 && (
              <div style={{ fontSize: 10, color: 'var(--red)', background: 'var(--red-lt)', border: '1px solid var(--red)', borderRadius: 7, padding: '6px 10px', textAlign: 'center', fontWeight: 600 }}>
                ⚠ Exceeds combined budget by {fmtINR(poUsedBudget - selectedGroupBudget)}
              </div>
            )}
            <button
              type="button"
              onClick={handleCompleteSale}
              disabled={(isPO ? (editingCartPOId ? updatePO.isPending : submitPO.isPending) : submitSale.isPending) || !cartItems.length || !filtersApplied || (isPO && !canSubmitPO)}
              style={{
                padding: 14,
                background: !cartItems.length || !filtersApplied || (isPO && !canSubmitPO) ? 'var(--bdr2)' : isPO ? 'var(--blu)' : 'var(--grn)',
                color: '#fff',
                border: 'none',
                borderRadius: 10,
                fontSize: 14,
                fontWeight: 800,
                cursor: !cartItems.length || !filtersApplied || (isPO && !canSubmitPO) ? 'not-allowed' : 'pointer',
                fontFamily: 'var(--fb)',
              }}
            >
              {(isPO ? (editingCartPOId ? updatePO.isPending : submitPO.isPending) : submitSale.isPending)
                ? '⟳ Processing…'
                : isPO && editingCartPOId
                  ? 'Update Purchase Order'
                  : 'Submit'}
            </button>
          </div>
        </div>
        )}
      </div>

      {/* Coupon modal */}
      {showCoupon && (
        <div onClick={e => e.target === e.currentTarget && setShowCoupon(false)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.4)', zIndex: 800, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: '#fff', borderRadius: 14, padding: 24, width: 320, boxShadow: 'var(--sh3)' }}>
            <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 14 }}>🏷 Apply Coupon</div>
            <input value={couponCode} onChange={e => setCouponCode(e.target.value)} placeholder="Enter coupon code…"
              style={{ width: '100%', padding: '9px 12px', border: '1px solid var(--bdr2)', borderRadius: 6, fontSize: 13, outline: 'none', marginBottom: 12, boxSizing: 'border-box', fontFamily: 'var(--fb)' }} />
            <div style={{ display: 'flex', gap: 8 }}>
              <Btn variant="ghost" block onClick={() => setShowCoupon(false)}>Cancel</Btn>
              <Btn variant="primary" block onClick={() => { setGlobalDiscount(50); setShowCoupon(false); toast.success('₹50 discount applied'); }}>Apply</Btn>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}