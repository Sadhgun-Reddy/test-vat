import React from 'react';
import { useLocation } from 'react-router-dom';
import { useSync } from '../../store/SyncContext';
import { useAuth } from '../../store/AuthContext';
import { Btn } from '../../components/ui';

import { useSaleOrchestrator } from './hooks/useSaleOrchestrator';

import { FilterBar } from './components/FilterBar';
import { DrugSearchInput } from './components/DrugSearchInput';
import { SaleLineItems } from './components/SaleLineItems';
import { PaymentSummary } from './components/PaymentSummary';
import { PurchaseOrderDetailPanel } from './components/PurchaseOrderDetailPanel';
import { PurchaseHistory } from './components/PurchaseHistory';
import { SaleTabs } from './components/SaleTabs';
import { AllocationsGrid } from './components/AllocationsGrid';
import { DraftBanner } from './components/DraftBanner';

export default function SalePage() {
  const { isOnline } = useSync();
  const { user } = useAuth();
  const location = useLocation();

  const editSale = location.state?.editSale || null;
  const editPO = location.state?.editPO || null;
  const editPurchase = location.state?.editPurchase || null;
  const editTransfer = location.state?.editTransfer || null;
  const editFilterSeed = editSale || editPO || editPurchase || null;
  const seedTab = editSale ? 'sale' : editPO ? 'purchase_order' : editPurchase ? 'purchase' : editTransfer ? 'transfer' : 'purchase_order';

  const s = useSaleOrchestrator({ editSale, editPO, editPurchase, editTransfer, editFilterSeed, seedTab, isOnline, user });

  if (s.saleComplete) return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 'calc(100vh - 96px)', gap: 20 }}>
      <div style={{ width: 72, height: 72, borderRadius: '50%', background: 'var(--grn-lt)', border: '3px solid var(--grn)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 32 }}>✓</div>
      <h2 style={{ fontFamily: 'var(--fd)', color: 'var(--grn)', fontSize: 26 }}>Sale Completed!</h2>
      <p style={{ color: 'var(--txt3)', fontSize: 13 }}>Invoice {s.invoiceNo} · Total {s.fmtINR(s.total)}</p>
      {s.payMethod === 'cash' && s.change > 0 && <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--blu)' }}>Change: {s.fmtINR(s.change)}</p>}
      <div style={{ display: 'flex', gap: 12 }}>
        <Btn variant="ghost" block={false} disabled={false} onClick={() => window.print()}>🖨 Print Bill</Btn>
        <Btn variant="primary" block={false} disabled={false} onClick={() => { s.resetForm(); s.setSaleComplete(false); s.setSaleType('drug_indent'); s.setFiltersApplied(false); s.setActiveTab('purchase_order'); }}>+ New Sale</Btn>
      </div>
    </div>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 96px)', overflow: 'hidden' }}>
      <SaleTabs activeTab={s.activeTab} setActiveTab={s.setActiveTab} invoiceNo={s.invoiceNo} />
      <FilterBar
        isOnline={isOnline} saleType={s.saleType} setSaleType={s.setSaleType} financialYearId={s.filterProps.financialYearId} setFinancialYearId={s.filterProps.setFinancialYearId} fyData={s.filterProps.fyData}
        schemeId={s.filterProps.schemeId} setSchemeId={s.filterProps.setSchemeId} schemes={s.filterProps.schemes} quarterId={s.filterProps.quarterId} setQuarterId={s.filterProps.setQuarterId} quartersForFy={s.filterProps.quartersForFy}
        districtId={s.filterProps.districtId} setDistrictId={s.filterProps.setDistrictId} districts={s.filterProps.districts} institutionTypeId={s.filterProps.institutionTypeId} setInstitutionTypeId={s.filterProps.setInstitutionTypeId} institutionTypes={s.filterProps.institutionTypes}
        placeOfWorkingId={s.filterProps.placeOfWorkingId} setPlaceOfWorkingId={s.filterProps.setPlaceOfWorkingId} filteredPlaces={s.filterProps.filteredPlaces} activeTab={s.activeTab} toPlaceOfWorkingId={s.filterProps.toPlaceOfWorkingId} setToPlaceOfWorkingId={s.filterProps.setToPlaceOfWorkingId}
        onSearch={s.handleFilterSearch}
      />
      {(s.activeTab === 'purchase' || s.activeTab === 'transfer') && (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', background: 'var(--bg1)' }}>
          <div style={{ padding: '10px 20px', background: '#fff', borderBottom: '1px solid var(--bdr)', flexShrink: 0, minHeight: 46, display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            {!s.filtersApplied ? <span style={{ fontSize: 12, color: 'var(--txt4)' }}>Apply filters and click Search to load purchase orders</span>
            : s.poListFetching ? <span style={{ fontSize: 12, color: 'var(--txt3)' }}>Loading…</span>
            : !s.purchaseOrdersHistoryList.length ? <span style={{ fontSize: 12, color: 'var(--txt3)' }}>No purchase orders found</span>
            : (
              <>
                <span style={{ fontSize: 11, color: 'var(--txt3)', fontWeight: 600, marginRight: 4 }}>Purchase Orders:</span>
                {s.purchaseOrdersHistoryList.map((po: any) => {
                  const isActive = s.editingPO?.id === po.id;
                  const st = (po.status || '').toLowerCase();
                  const isClosed = st === 'closed'; const isOpen = st === 'confirmed'; const isDraft = st === 'draft';
                  const pillLabel = isClosed ? 'CLOSED' : isOpen ? 'OPEN' : isDraft ? 'DRAFT' : st === 'cancelled' ? 'CANCL' : st ? st.replace(/^./, (c: any) => c.toUpperCase()) : '—';
                  return (
                    <button key={po.id} onClick={() => {
                      if (isActive) { s.setEditingPO(null); s.setPurchaseNote(''); }
                      else { s.setEditingPO(po); s.setPurchaseNote(''); s.setEditItems((po.items || []).map((i: any) => ({ ...i, quantity: Number(i.quantity), unit_price: Number(i.unit_price) }))); }
                    }} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '4px 10px', borderRadius: 20, border: `1.5px solid ${isActive ? 'var(--blu)' : isClosed ? 'var(--grn)' : isOpen ? '#1d4ed8' : 'var(--bdr2)'}`, background: isActive ? 'var(--blu)' : isClosed ? 'var(--grn-lt,#f0fdf4)' : isOpen ? '#eff6ff' : '#fff', color: isActive ? '#fff' : isClosed ? 'var(--grn)' : isOpen ? '#1d4ed8' : 'var(--blu)', fontSize: 11, fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--fb)' }}>
                      {po.invoice_no}
                      <span style={{ fontSize: 9, fontWeight: 700, padding: '1px 5px', borderRadius: 8, background: isActive ? 'rgba(255,255,255,.25)' : isClosed ? 'var(--grn)' : isOpen ? '#1d4ed8' : isDraft ? 'var(--amber-lt,#fff8e6)' : 'var(--blu-lt)', color: isActive ? '#fff' : isClosed ? '#fff' : isOpen ? '#fff' : isDraft ? '#b45309' : 'var(--blu)' }}>
                        {pillLabel}
                      </span>
                    </button>
                  );
                })}
              </>
            )}
          </div>
          {s.editingPO && <PurchaseOrderDetailPanel editingPO={s.editingPO} setEditingPO={s.setEditingPO} activeTab={s.activeTab} filteredPlaces={s.filterProps.filteredPlaces} toPlaceOfWorkingId={s.filterProps.toPlaceOfWorkingId} editItems={s.editItems} setEditItems={s.setEditItems} purchaseNote={s.purchaseNote} setPurchaseNote={s.setPurchaseNote} savePurchaseIsPending={s.savePurchaseMutation.isPending} updatePOIsPending={s.updatePOMutation.isPending} onSavePurchase={s.handleSavePurchase} onUpdatePO={s.handleUpdatePO} poHistory={s.poHistory} />}
        </div>
      )}
      <div style={{ flex: 1, display: (s.activeTab === 'purchase' || s.activeTab === 'transfer') ? 'none' : 'grid', gridTemplateColumns: s.hidePoCartAndBill ? '1fr' : '1fr 310px', overflow: 'hidden', minHeight: 0 }}>
        <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden', background: 'var(--bg1)' }}>
          {s.isPO && <AllocationsGrid filtersApplied={s.filtersApplied} allocFetching={s.filterProps.allocFetching} allocationsForIndent={s.filterProps.allocationsForIndent} selectedAllocationIds={s.selectedAllocationIds} setSelectedAllocationIds={s.setSelectedAllocationIds} setCartItems={s.setCartItems} />}
          <DraftBanner existingDraft={s.existingDraft} draftDismissed={s.draftDismissed} cartItemsLength={s.cartItems.length} loadDraft={s.loadDraft} setDraftDismissed={s.setDraftDismissed} />
          {!s.hidePoCartAndBill && <DrugSearchInput searchQ={s.searchQ} setSearchQ={s.setSearchQ} allocationDrugs={s.allocationDrugs} addToCart={s.addToCart} />}
          <div style={{ flex: 1, overflow: 'auto', padding: '0 14px 8px' }}>
            {!s.hidePoCartAndBill && <SaleLineItems cartItems={s.cartItems} isPO={s.isPO} updateQty={s.updateQty} updateDisc={s.updateDisc} updateGstPct={s.updateGstPct} removeItem={s.removeItem} subtotalPO={s.subtotalPO} taxPO={s.taxPO} subtotalSale={s.subtotalSale} />}
            <PurchaseHistory purchaseOrdersHistoryList={s.purchaseOrdersHistoryList} expandedHistoryId={s.expandedHistoryId} setExpandedHistoryId={s.setExpandedHistoryId} expandedHistoryPurchaseKey={s.expandedHistoryPurchaseKey} setExpandedHistoryPurchaseKey={s.setExpandedHistoryPurchaseKey} setCartItems={s.setCartItems} setSelectedAllocationIds={s.setSelectedAllocationIds} setEditingCartPOId={s.setEditingCartPOId} />
          </div>
        </div>
        {!s.hidePoCartAndBill && (
          <div style={{ background: '#fff', borderLeft: '1px solid var(--bdr)', display: 'flex', flexDirection: 'column' }}>
            <PaymentSummary isPO={s.isPO} displaySubtotal={s.displaySubtotal} displayTax={s.displayTax} globalDiscount={s.globalDiscount} total={s.total} selectedAllocations={s.selectedAllocations} selectedGroupBudget={s.selectedGroupBudget} selectedGroupSpent={s.selectedGroupSpent} poUsedBudget={s.poUsedBudget} poReserveBalance={s.poReserveBalance} cartItemsLength={s.cartItems.length} poOverBudget={s.poOverBudget} payMethod={s.payMethod} setPayMethod={s.setPayMethod} amtReceived={s.amtReceived} setAmtReceived={s.setAmtReceived} change={s.change} />
            <div style={{ padding: '14px 18px', display: 'flex', flexDirection: 'column', gap: 8, borderTop: '1px solid var(--bdr)', flexShrink: 0 }}>
              {s.isPO && s.editingCartPOId && s.cartItems.length > 0 && (
                <div style={{ fontSize: 10, color: 'var(--blu)', background: 'var(--blu-lt)', border: '1px solid var(--blu-bdr)', borderRadius: 7, padding: '6px 10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontWeight: 600 }}>
                  <span>✏ Editing existing PO</span>
                  <button type="button" onClick={() => { s.setEditingCartPOId(null); s.setCartItems([]); }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--blu)', fontSize: 12, fontWeight: 700, padding: '0 2px' }}>✕ Cancel</button>
                </div>
              )}
              {s.isPO && !s.editingCartPOId && s.cartItems.length > 0 && s.filtersApplied && (
                <button type="button" disabled={s.saveDraftMutation.isPending} onClick={s.handleSaveDraft} style={{ padding: '10px 14px', background: '#fffbeb', color: '#92400e', border: '1px solid #fcd34d', borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--fb)' }}>
                  {s.saveDraftMutation.isPending ? '⟳ Saving…' : '📋 Save Draft'}
                </button>
              )}
              <button type="button" onClick={s.handleCompleteSale} disabled={(s.isPO ? (s.editingCartPOId ? s.updatePOMutation.isPending : s.submitPO.isPending) : s.submitSale.isPending) || !s.cartItems.length || !s.filtersApplied || (s.isPO && !s.canSubmitPO)} style={{ padding: 14, background: !s.cartItems.length || !s.filtersApplied || (s.isPO && !s.canSubmitPO) ? 'var(--bdr2)' : s.isPO ? 'var(--blu)' : 'var(--grn)', color: '#fff', border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 800, cursor: !s.cartItems.length || !s.filtersApplied || (s.isPO && !s.canSubmitPO) ? 'not-allowed' : 'pointer', fontFamily: 'var(--fb)' }}>
                {(s.isPO ? (s.editingCartPOId ? s.updatePOMutation.isPending : s.submitPO.isPending) : s.submitSale.isPending) ? '⟳ Processing…' : s.isPO && s.editingCartPOId ? 'Update Purchase Order' : 'Submit'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
