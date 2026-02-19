"use client";

import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { api, type Product, resolveImageUrl } from "@/lib/api";

export function PopularReorderDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const [items, setItems] = useState<Product[]>([]);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);
  const [allProducts, setAllProducts] = useState<Product[]>([]);

  const loadPopular = async () => {
    const pageSize = 100;
    let page = 1;
    const popular: Product[] = [];
    setLoading(true);
    try {
      // Load only popular products (from admin API filter when available, else fallback to storefront)
      while (true) {
        const res = await api.getProducts({ page, limit: pageSize, sortBy: 'displayOrder', sortOrder: 'asc' });
        if (!res.success || !res.data) break;
        const chunk = (res.data.products || []).filter(p => (p as any).isPopular);
        popular.push(...chunk);
        const pages = (res.data as any).pagination?.pages || 1;
        if (page >= pages) break;
        page += 1;
      }
      // Fallback: storefront popular flag
      if (popular.length === 0) {
        page = 1;
        while (true) {
          const res2 = await api.getStorefrontProducts({ page, limit: pageSize, isPopular: true, sortBy: 'displayOrder', sortOrder: 'asc' });
          if (!res2.success || !res2.data) break;
          const chunk2 = (res2.data.products || []) as any as Product[];
          popular.push(...chunk2);
          const pages2 = (res2.data as any).pagination?.pages || 1;
          if (page >= pages2) break;
          page += 1;
        }
      }
      setItems(popular);

      // Also load all ACTIVE products to allow toggling in/out of popular list
      page = 1;
      const all: Product[] = [];
      while (true) {
        const resAll = await api.getProducts({ page, limit: pageSize, status: 'ACTIVE', sortBy: 'name', sortOrder: 'asc' });
        if (!resAll.success || !resAll.data) break;
        all.push(...(resAll.data.products || []));
        const pagesAll = (resAll.data as any).pagination?.pages || 1;
        if (page >= pagesAll) break;
        page += 1;
      }
      setAllProducts(all);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { if (open) loadPopular(); }, [open]);

  const move = (from: number, to: number) => {
    if (to < 0 || to >= items.length) return;
    const next = [...items];
    const [row] = next.splice(from, 1);
    next.splice(to, 0, row);
    setItems(next);
  };

  const onDragStart = (e: React.DragEvent<HTMLDivElement>, index: number) => {
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', String(index));
  };
  const onDrop = (e: React.DragEvent<HTMLDivElement>, index: number) => {
    const from = Number(e.dataTransfer.getData('text/plain'));
    move(from, index);
  };
  const onDragOver = (e: React.DragEvent<HTMLDivElement>) => { e.preventDefault(); };

  const toggleProduct = (p: Product) => {
    const exists = items.find(x => x.id === p.id);
    if (exists) {
      setItems(items.filter(x => x.id !== p.id));
    } else {
      setItems([...items, p]);
    }
  };

  const saveOrder = async () => {
    setSaving(true);
    const orders = items.map((p, idx) => ({ id: p.id, displayOrder: idx }));
    const res = await api.post(`/products/popular/reorder`, { orders } as any);
    setSaving(false);
    if (res.success) onOpenChange(false);
  };

  const availableToAdd = allProducts.filter(p => !items.some(i => i.id === p.id));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-screen max-w-none h-screen sm:w-[98vw] sm:max-w-[900px] sm:max-h-[90vh] sm:h-auto overflow-y-auto p-0 rounded-none sm:rounded-lg">
        <DialogHeader className="sticky top-0 z-10 bg-card px-4 sm:px-6 pt-4 pb-2 border-b border-border">
          <DialogTitle className="text-base sm:text-lg font-semibold tracking-tight leading-tight">Popular Products</DialogTitle>
        </DialogHeader>
        <div className="px-4 sm:px-6 py-4 space-y-4">
          <div className="text-sm text-muted-foreground">Drag to set order for Popular section. Add/remove products below.</div>

          {/* Current popular order */}
          <div className="space-y-2 pr-1">
            {loading && <div className="text-sm text-muted-foreground">Loading…</div>}
            {!loading && items.length === 0 && <div className="text-sm text-muted-foreground">No popular products yet.</div>}
            {items.map((p, idx) => (
              <div key={p.id} className="group flex flex-wrap sm:flex-nowrap items-center justify-between gap-3 border border-border rounded-md p-2 sm:p-3 bg-card text-foreground cursor-grab active:cursor-grabbing"
                   draggable onDragStart={(e) => onDragStart(e, idx)} onDragOver={onDragOver} onDrop={(e) => onDrop(e, idx)} aria-grabbed={true}>
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-md overflow-hidden bg-muted border border-border">
                    <img src={resolveImageUrl((p as any).images?.[0]?.url || '')} alt="" className="w-full h-full object-cover" />
                  </div>
                  <div className="min-w-0">
                    <div className="font-medium break-words max-w-[72vw] sm:max-w-[520px] text-sm sm:text-base">{p.name}</div>
                    <div className="text-[11px] sm:text-xs text-muted-foreground">Status: {p.status}</div>
                  </div>
                </div>
                <div className="shrink-0 text-xs text-muted-foreground mr-2">#{idx + 1}</div>
                <div className="flex items-center gap-1 w-full sm:w-auto justify-end sm:justify-start mt-1 sm:mt-0">
                  <Button variant="outline" size="sm" onClick={() => move(idx, idx - 1)}>Up</Button>
                  <Button variant="outline" size="sm" onClick={() => move(idx, idx + 1)}>Down</Button>
                  <Button variant="destructive" size="sm" onClick={() => toggleProduct(p)}>Remove</Button>
                </div>
              </div>
            ))}
          </div>

          {/* Add more products */}
          <div className="pt-2 border-t border-border">
            <div className="text-sm font-medium mb-2">Add products to Popular</div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-[50vh] overflow-y-auto pr-1">
              {availableToAdd.map((p) => (
                <div key={p.id} className="flex items-center justify-between gap-3 border border-border rounded-md p-2 bg-card">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-8 h-8 rounded-md overflow-hidden bg-muted border border-border">
                      <img src={resolveImageUrl((p as any).images?.[0]?.url || '')} alt="" className="w-full h-full object-cover" />
                    </div>
                    <div className="truncate text-sm">{p.name}</div>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => toggleProduct(p)}>Add</Button>
                </div>
              ))}
              {availableToAdd.length === 0 && (
                <div className="text-sm text-muted-foreground">All active products are already in the popular list.</div>
              )}
            </div>
          </div>
        </div>

        <div className="sticky bottom-0 z-10 bg-card border-t border-border px-4 sm:px-6 py-3 flex justify-end gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>Cancel</Button>
          <Button onClick={saveOrder} disabled={saving}>{saving ? 'Saving…' : 'Save Popular Order'}</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default PopularReorderDialog;


