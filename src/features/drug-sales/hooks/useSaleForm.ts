import { useMemo, useState } from 'react';
import toast from 'react-hot-toast';

import { ID } from '../../../services/types/api.types';

export type SaleLineItem = {
  drug_id: ID;
  name: string;
  code: string;
  unit: string;
  qty: number;
  unit_price: number;
  lineDiscount: number;
  gstPct: number;
};

export type UseSaleFormProps = {
  initialCart?: SaleLineItem[];
  initialDiscount?: number;
  initialPayMethod?: string;
  isPO: boolean;
};

export function useSaleForm({
  initialCart = [],
  initialDiscount = 0,
  initialPayMethod = 'cash',
  isPO,
}: UseSaleFormProps) {
  const [cartItems, setCartItems] = useState<SaleLineItem[]>(initialCart);
  const [globalDiscount, setGlobalDiscount] = useState<number>(initialDiscount);
  const [payMethod, setPayMethod] = useState<string>(initialPayMethod);
  const [amtReceived, setAmtReceived] = useState<string>('');

  const subtotalSale = useMemo(
    () => cartItems.reduce((s, i) => s + i.qty * i.unit_price - (i.lineDiscount || 0), 0),
    [cartItems]
  );

  const subtotalPO = useMemo(
    () => cartItems.reduce((s, i) => s + i.qty * i.unit_price, 0),
    [cartItems]
  );

  const taxPO = useMemo(
    () => cartItems.reduce((s, i) => s + (i.qty * i.unit_price * (i.gstPct || 0)) / 100, 0),
    [cartItems]
  );

  const displaySubtotal = isPO ? subtotalPO : subtotalSale;
  const displayTax = isPO ? taxPO : 0;
  const total = Math.max(0, isPO ? subtotalPO + taxPO : subtotalSale - globalDiscount);
  const change = parseFloat(amtReceived || '0') - total;

  const addToCart = (drug: any) => {
    setCartItems((prev) => {
      const ex = prev.find((i) => i.drug_id === drug.id);
      if (ex) return prev.map((i) => (i.drug_id === drug.id ? { ...i, qty: i.qty + 1 } : i));
      return [
        ...prev,
        {
          drug_id: drug.id,
          name: drug.name,
          code: drug.code,
          unit: drug.unit || '',
          qty: 1,
          unit_price: parseFloat(drug.unit_price) || 0,
          lineDiscount: 0,
          gstPct: parseFloat(drug.gst_pct) || 0,
        },
      ];
    });
  };

  const removeItem = (id: ID) => setCartItems((p) => p.filter((i) => i.drug_id !== id));

  const updateQty = (id: ID, qty: number | string) =>
    setCartItems((p) =>
      p.map((i) =>
        i.drug_id === id
          ? { ...i, qty: Math.max(1, typeof qty === 'string' ? parseInt(qty, 10) || 1 : qty) }
          : i
      )
    );

  const updateDisc = (id: ID, d: number | string) =>
    setCartItems((p) =>
      p.map((i) =>
        i.drug_id === id
          ? { ...i, lineDiscount: Math.max(0, typeof d === 'string' ? parseFloat(d) || 0 : d) }
          : i
      )
    );

  const updateGstPct = (id: ID, pct: number | string) =>
    setCartItems((p) =>
      p.map((i) =>
        i.drug_id === id
          ? {
              ...i,
              gstPct: Math.max(
                0,
                Math.min(100, typeof pct === 'string' ? parseFloat(pct) || 0 : pct)
              ),
            }
          : i
      )
    );

  const resetForm = () => {
    setCartItems([]);
    setAmtReceived('');
    setGlobalDiscount(0);
  };

  return {
    cartItems,
    setCartItems,
    globalDiscount,
    setGlobalDiscount,
    payMethod,
    setPayMethod,
    amtReceived,
    setAmtReceived,
    subtotalSale,
    subtotalPO,
    taxPO,
    displaySubtotal,
    displayTax,
    total,
    change,
    addToCart,
    removeItem,
    updateQty,
    updateDisc,
    updateGstPct,
    resetForm,
  };
}
