"use client";

import { useEffect, useMemo, useState } from "react";
import { loadFromStorage, saveToStorage } from "@/lib/storage";

export type Expense = {
  id: string;
  amount: number;
  category: string;
  note: string;
  date: string; // ISO yyyy-mm-dd
};

const STORAGE_KEY = "minimal-expenses:v1";

const categories = [
  "General",
  "Food",
  "Transport",
  "Housing",
  "Utilities",
  "Health",
  "Entertainment",
  "Shopping",
  "Travel",
  "Other"
];

function formatCurrency(value: number) {
  return new Intl.NumberFormat(undefined, { style: "currency", currency: "USD" }).format(value);
}

function startOfMonthISO(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10);
}

function endOfMonthISO(d: Date) {
  return new Date(d.getFullYear(), d.getMonth() + 1, 0).toISOString().slice(0, 10);
}

export default function Page() {
  const today = new Date();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [form, setForm] = useState({
    amount: "",
    category: "General",
    note: "",
    date: new Date().toISOString().slice(0, 10)
  });

  const [filters, setFilters] = useState({
    from: startOfMonthISO(today),
    to: endOfMonthISO(today),
    q: "",
    category: ""
  });

  useEffect(() => {
    setExpenses(loadFromStorage<Expense[]>(STORAGE_KEY, []));
  }, []);

  useEffect(() => {
    saveToStorage(STORAGE_KEY, expenses);
  }, [expenses]);

  const filtered = useMemo(() => {
    return expenses
      .filter((e) => (!filters.category ? true : e.category === filters.category))
      .filter((e) => (!filters.q ? true : (e.note + " " + e.category).toLowerCase().includes(filters.q.toLowerCase())))
      .filter((e) => (filters.from ? e.date >= filters.from : true))
      .filter((e) => (filters.to ? e.date <= filters.to : true))
      .sort((a, b) => (a.date < b.date ? 1 : -1));
  }, [expenses, filters]);

  const totals = useMemo(() => {
    const total = filtered.reduce((sum, e) => sum + e.amount, 0);
    const byCategory = filtered.reduce<Record<string, number>>((acc, e) => {
      acc[e.category] = (acc[e.category] ?? 0) + e.amount;
      return acc;
    }, {});
    return { total, byCategory };
  }, [filtered]);

  function resetForm() {
    setForm({ amount: "", category: "General", note: "", date: new Date().toISOString().slice(0, 10) });
    setEditingId(null);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const amount = parseFloat(form.amount);
    if (!isFinite(amount) || amount <= 0) return;
    const payload: Expense = {
      id: editingId ?? crypto.randomUUID(),
      amount,
      category: form.category,
      note: form.note.trim(),
      date: form.date
    };
    setExpenses((prev) => {
      const next = editingId ? prev.map((x) => (x.id === editingId ? payload : x)) : [{ ...payload }, ...prev];
      return next;
    });
    resetForm();
  }

  function handleEdit(id: string) {
    const e = expenses.find((x) => x.id === id);
    if (!e) return;
    setForm({ amount: String(e.amount), category: e.category, note: e.note, date: e.date });
    setEditingId(id);
  }

  function handleDelete(id: string) {
    setExpenses((prev) => prev.filter((x) => x.id !== id));
    if (editingId === id) resetForm();
  }

  function handleExport() {
    const blob = new Blob([JSON.stringify(expenses, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "expenses.json";
    a.click();
    URL.revokeObjectURL(url);
  }

  function handleImport(file: File) {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result)) as Expense[];
        if (!Array.isArray(parsed)) return;
        const cleaned = parsed
          .filter((e) => e && typeof e.amount === "number" && typeof e.date === "string")
          .map((e) => ({
            id: e.id || crypto.randomUUID(),
            amount: e.amount,
            category: e.category || "General",
            note: e.note || "",
            date: e.date.slice(0, 10)
          }));
        setExpenses(cleaned);
      } catch {}
    };
    reader.readAsText(file);
  }

  const importInputId = "import-json";

  return (
    <div className="grid" style={{ gap: 16 }}>
      <section className="card grid">
        <form onSubmit={handleSubmit} className="grid" style={{ gap: 12 }}>
          <div className="row">
            <input
              inputMode="decimal"
              placeholder="Amount"
              value={form.amount}
              onChange={(e) => setForm((s) => ({ ...s, amount: e.target.value }))}
              aria-label="Amount"
            />
            <select value={form.category} onChange={(e) => setForm((s) => ({ ...s, category: e.target.value }))} aria-label="Category">
              {categories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
          <div className="row">
            <input type="date" value={form.date} onChange={(e) => setForm((s) => ({ ...s, date: e.target.value }))} aria-label="Date" />
            <input placeholder="Note" value={form.note} onChange={(e) => setForm((s) => ({ ...s, note: e.target.value }))} aria-label="Note" />
          </div>
          <div className="controls">
            <button className="button-primary" type="submit">{editingId ? "Save" : "Add"}</button>
            {editingId && (
              <button type="button" className="button-outline" onClick={resetForm}>
                Cancel
              </button>
            )}
          </div>
        </form>
      </section>

      <section className="card grid">
        <div className="controls" style={{ justifyContent: "space-between" }}>
          <div className="controls">
            <input
              placeholder="Search note/category"
              value={filters.q}
              onChange={(e) => setFilters((s) => ({ ...s, q: e.target.value }))}
              aria-label="Search"
            />
            <select value={filters.category} onChange={(e) => setFilters((s) => ({ ...s, category: e.target.value }))} aria-label="Category filter">
              <option value="">All</option>
              {categories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
            <input type="date" value={filters.from} onChange={(e) => setFilters((s) => ({ ...s, from: e.target.value }))} aria-label="From" />
            <input type="date" value={filters.to} onChange={(e) => setFilters((s) => ({ ...s, to: e.target.value }))} aria-label="To" />
          </div>
          <div className="controls">
            <button className="button-outline" onClick={handleExport}>Export</button>
            <input id={importInputId} type="file" accept="application/json" style={{ display: "none" }} onChange={(e) => e.target.files && handleImport(e.target.files[0])} />
            <button className="button-outline" onClick={() => document.getElementById(importInputId)?.click()}>Import</button>
            <button className="button-outline" onClick={() => { setFilters({ from: startOfMonthISO(new Date()), to: endOfMonthISO(new Date()), q: "", category: "" }); }}>Reset</button>
          </div>
        </div>
        <hr className="sep" />
        <div className="kpis">
          <div className="kpi">
            <div className="kpi-label">Total</div>
            <div className="kpi-value">{formatCurrency(totals.total)}</div>
          </div>
          <div className="kpi">
            <div className="kpi-label">Entries</div>
            <div className="kpi-value">{filtered.length}</div>
          </div>
          <div className="kpi">
            <div className="kpi-label">Top Category</div>
            <div className="kpi-value">
              {Object.keys(totals.byCategory).length
                ? Object.entries(totals.byCategory).sort((a, b) => b[1] - a[1])[0][0]
                : "?"}
            </div>
          </div>
        </div>
      </section>

      <section className="grid" style={{ gap: 8 }}>
        <div className="list">
          {filtered.map((e) => (
            <div key={e.id} className="item">
              <div className="item-main">
                <div className="item-title">{formatCurrency(e.amount)} ? {e.category}</div>
                <div className="item-sub">{e.note || "No note"} ? {new Date(e.date).toLocaleDateString()}</div>
              </div>
              <div className="controls">
                <button className="button-outline" onClick={() => handleEdit(e.id)}>Edit</button>
                <button className="button-danger" onClick={() => handleDelete(e.id)}>Delete</button>
              </div>
            </div>
          ))}
          {!filtered.length && <div className="badge">No expenses match the filters</div>}
        </div>
      </section>
    </div>
  );
}
