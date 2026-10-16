'use client';
import { Clock, Flame, Filter } from 'lucide-react';

export type Sort = 'latest' | 'liked';
type Props = {
  sort: Sort; onSort: (s: Sort) => void;
  table: string; onTable: (t: string) => void;
  tables: string[];
};

export default function FilterBar({ sort, onSort, table, onTable, tables }: Props) {
  const tab = (active: boolean) =>
    `flex items-center gap-1.5 rounded-full px-4 py-2 text-sm transition ${
      active ? 'bg-ruby-gradient text-gold-light shadow' : 'text-cocoa/70 hover:bg-parchment-100'}`;
  return (
    <div className="flex items-center gap-2 overflow-x-auto px-4 py-3">
      <div className="flex shrink-0 rounded-full border border-gold/50 bg-white p-1">
        <button className={tab(sort === 'latest')} onClick={() => onSort('latest')}><Clock className="h-4 w-4" />Latest</button>
        <button className={tab(sort === 'liked')} onClick={() => onSort('liked')}><Flame className="h-4 w-4" />Most liked</button>
      </div>
      <div className="relative shrink-0">
        <Filter className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gold-dark" />
        <select value={table} onChange={(e) => onTable(e.target.value)} aria-label="Filter by table"
          className="appearance-none rounded-full border border-gold/50 bg-white py-2.5 pl-9 pr-4 text-sm outline-none focus:border-ruby">
          <option value="">All tables</option>
          {tables.map((t) => <option key={t} value={t}>Table {t}</option>)}
        </select>
      </div>
    </div>
  );
}
