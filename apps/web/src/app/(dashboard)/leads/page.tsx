'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import Link from 'next/link';
import {
  Users, Upload, Search, Copy, Check, MapPin,
  SlidersHorizontal, X, Mail, Trash2, Linkedin,
  ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight,
  AlertTriangle, GripVertical,
} from 'lucide-react';
import { apiClient } from '@/lib/api-client';
import { useCall } from '@/hooks/use-call';
import { useCallStore } from '@/store/call.store';
import { cn } from '@/lib/utils';

/* ─────────────────────────── types ─────────────────────────── */
interface Lead {
  id: string;
  companyName: string;
  contactName: string | null;
  contactTitle: string | null;
  phoneNumber: string;
  country: string | null;
  location: string | null;
  email: string | null;
  industry: string | null;
  headcount: number | null;
  headcountGrowth6m: number | null;
  headcountGrowth12m: number | null;
  website: string | null;
  personalLinkedin: string | null;
  companyLinkedin: string | null;
  companyOverview: string | null;
  isOptOut: boolean;
  status: string;
  isWrongNumber: boolean;
  _count: { calls: number };
}
interface LeadsResponse {
  data: Lead[];
  meta: { total: number; page: number; limit: number; totalPages: number };
}

/* ─────────────────────────── constants ─────────────────────── */
const statusColors: Record<string, string> = {
  NEW: 'badge-new', CONTACTED: 'badge-new', INTERESTED: 'badge-int',
  NOT_INTERESTED: 'badge-no', CALLBACK_SCHEDULED: 'badge-cb',
  WRONG_NUMBER: 'badge-no', OPT_OUT: 'badge-no',
};

type ColumnKey =
  | 'select' | 'contact' | 'company' | 'phone' | 'email' | 'location'
  | 'industry' | 'headcount' | 'growth6m' | 'growth12m'
  | 'website' | 'personalLinkedin' | 'companyLinkedin'
  | 'companyOverview' | 'status' | 'call';

interface ColumnDef {
  key: ColumnKey;
  label: string;
  defaultVisible: boolean;
  width?: string;
  fixed?: boolean; // cannot be reordered or hidden
}

const BASE_COLUMNS: ColumnDef[] = [
  { key: 'select',           label: '',              defaultVisible: true,  fixed: true,  width: 'w-10' },
  { key: 'contact',          label: 'Contact',       defaultVisible: true,  width: 'min-w-[180px]' },
  { key: 'company',          label: 'Company',       defaultVisible: true,  width: 'min-w-[150px]' },
  { key: 'phone',            label: 'Phone',         defaultVisible: true,  width: 'min-w-[145px]' },
  { key: 'email',            label: 'Email',         defaultVisible: true,  width: 'min-w-[195px]' },
  { key: 'location',         label: 'Location',      defaultVisible: true,  width: 'min-w-[155px]' },
  { key: 'industry',         label: 'Industry',      defaultVisible: true,  width: 'min-w-[175px]' },
  { key: 'headcount',        label: 'Employees',     defaultVisible: false, width: 'min-w-[105px]' },
  { key: 'growth6m',         label: 'Growth 6m',     defaultVisible: false, width: 'min-w-[95px]'  },
  { key: 'growth12m',        label: 'Growth 12m',    defaultVisible: false, width: 'min-w-[100px]' },
  { key: 'website',          label: 'Website',       defaultVisible: false, width: 'min-w-[170px]' },
  { key: 'personalLinkedin', label: 'LinkedIn',      defaultVisible: false, width: 'w-14' },
  { key: 'companyLinkedin',  label: 'Co. LinkedIn',  defaultVisible: false, width: 'w-14' },
  { key: 'companyOverview',  label: 'Overview',      defaultVisible: false, width: 'min-w-[230px]' },
  { key: 'status',           label: 'Status',        defaultVisible: true,  width: 'min-w-[125px]' },
  { key: 'call',             label: 'Call',          defaultVisible: true,  fixed: true,  width: 'w-14' },
];

const STORAGE_KEY_ORDER   = 'sh_col_order';
const STORAGE_KEY_VISIBLE = 'sh_col_visible';
const LIMIT = 25;

function formatLocation(location: string | null, country: string | null): string {
  return [location, country]
    .filter(Boolean).map(s => s!.trim())
    .filter(s => !/^[A-Z]{2}$/.test(s)).join(', ');
}

/* persist helpers */
function loadOrder(): ColumnKey[] | null {
  try { const v = localStorage.getItem(STORAGE_KEY_ORDER); return v ? JSON.parse(v) : null; } catch { return null; }
}
function saveOrder(order: ColumnKey[]) {
  try { localStorage.setItem(STORAGE_KEY_ORDER, JSON.stringify(order)); } catch {}
}
function loadVisible(): Set<ColumnKey> | null {
  try { const v = localStorage.getItem(STORAGE_KEY_VISIBLE); return v ? new Set(JSON.parse(v)) : null; } catch { return null; }
}
function saveVisible(visible: Set<ColumnKey>) {
  try { localStorage.setItem(STORAGE_KEY_VISIBLE, JSON.stringify([...visible])); } catch {}
}

function buildInitialColumns(): ColumnDef[] {
  const order = loadOrder();
  if (!order) return BASE_COLUMNS;
  const map = new Map(BASE_COLUMNS.map(c => [c.key, c]));
  const ordered = order.map(k => map.get(k)).filter(Boolean) as ColumnDef[];
  // append any new columns not in saved order
  BASE_COLUMNS.forEach(c => { if (!order.includes(c.key)) ordered.push(c); });
  return ordered;
}

/* ────────────────────── Delete Modal ───────────────────────── */
function DeleteModal({ count, onConfirm, onCancel, loading }: {
  count: number; onConfirm: () => void; onCancel: () => void; loading: boolean;
}) {
  const confirmRef = useRef<HTMLButtonElement>(null);
  const cancelRef  = useRef<HTMLButtonElement>(null);
  useEffect(() => { confirmRef.current?.focus(); }, []);
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { onCancel(); return; }
      if (e.key === 'Tab') {
        const els = [cancelRef.current, confirmRef.current].filter(Boolean) as HTMLElement[];
        if (e.shiftKey && document.activeElement === els[0]) { e.preventDefault(); els[els.length-1].focus(); }
        else if (!e.shiftKey && document.activeElement === els[els.length-1]) { e.preventDefault(); els[0].focus(); }
      }
    };
    document.addEventListener('keydown', h);
    return () => document.removeEventListener('keydown', h);
  }, [onCancel]);

  return (
    <div role="dialog" aria-modal="true" aria-labelledby="del-title" aria-describedby="del-desc"
      className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onCancel} aria-hidden="true" />
      <div className="relative w-full max-w-sm rounded-2xl p-6 shadow-2xl"
        style={{ backgroundColor: 'var(--card-bg)', border: '1px solid var(--card-border)' }}>
        <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-full bg-red-500/10">
          <AlertTriangle className="h-5 w-5 text-red-500" aria-hidden="true" />
        </div>
        <h2 id="del-title" className="mb-1 text-base font-semibold" style={{ color: 'var(--foreground)' }}>
          Delete {count === 1 ? 'Prospect' : `${count} Prospects`}
        </h2>
        <p id="del-desc" className="mb-6 text-sm leading-relaxed" style={{ color: 'var(--muted)' }}>
          This action will permanently remove {count === 1 ? 'this prospect' : `these ${count} prospects`} from the database. This cannot be undone.
        </p>
        <div className="flex gap-3 justify-end">
          <button ref={cancelRef} onClick={onCancel} disabled={loading}
            className="rounded-lg px-4 py-2 text-sm font-medium transition-colors disabled:opacity-50"
            style={{ backgroundColor: 'var(--hover-bg)', color: 'var(--foreground)', border: '1px solid var(--card-border)' }}
            onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'var(--tag-bg)')}
            onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'var(--hover-bg)')}>
            Cancel
          </button>
          <button ref={confirmRef} onClick={onConfirm} disabled={loading}
            className="flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-red-700 disabled:opacity-50">
            {loading && <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />}
            Confirm Delete
          </button>
        </div>
      </div>
    </div>
  );
}

/* ────────────────────── Pagination Bar ─────────────────────── */
function PaginationBar({ currentPage, totalPages, total, loading, onPage }: {
  currentPage: number; totalPages: number; total: number; loading: boolean; onPage: (p: number) => void;
}) {
  const [showJump, setShowJump] = useState(false);
  const jumpRef = useRef<HTMLDivElement>(null);
  const pageStart = (currentPage - 1) * LIMIT + 1;
  const pageEnd = Math.min(currentPage * LIMIT, total);

  useEffect(() => {
    const h = (e: MouseEvent) => { if (jumpRef.current && !jumpRef.current.contains(e.target as Node)) setShowJump(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  const btn = "flex items-center justify-center rounded-lg border transition-colors disabled:opacity-30 h-8 w-8";
  const bStyle = { borderColor: 'var(--card-border)', color: 'var(--foreground)', backgroundColor: 'var(--card-bg)' };
  const hIn  = (e: React.MouseEvent<HTMLButtonElement>) => (e.currentTarget.style.backgroundColor = 'var(--hover-bg)');
  const hOut = (e: React.MouseEvent<HTMLButtonElement>) => (e.currentTarget.style.backgroundColor = 'var(--card-bg)');

  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      <button aria-label="First page" onClick={() => onPage(1)} disabled={currentPage <= 1 || loading} className={btn} style={bStyle} onMouseEnter={hIn} onMouseLeave={hOut}><ChevronsLeft className="h-3.5 w-3.5" /></button>
      <button aria-label="Previous page" onClick={() => onPage(currentPage - 1)} disabled={currentPage <= 1 || loading} className={btn} style={bStyle} onMouseEnter={hIn} onMouseLeave={hOut}><ChevronLeft className="h-3.5 w-3.5" /></button>
      <div className="relative" ref={jumpRef}>
        <button onClick={() => setShowJump(p => !p)} aria-label={`Page ${currentPage}`}
          className="flex items-center gap-1 rounded-lg border px-2.5 h-8 text-sm font-medium transition-colors"
          style={{ ...bStyle, minWidth: 44, backgroundColor: showJump ? 'var(--hover-bg)' : 'var(--card-bg)' }}>
          {currentPage}<ChevronRight className="h-3 w-3 rotate-90 opacity-50" />
        </button>
        {showJump && (
          <div className="absolute bottom-10 left-0 z-50 rounded-xl shadow-xl overflow-y-auto"
            style={{ backgroundColor: 'var(--card-bg)', border: '1px solid var(--card-border)', maxHeight: 200, width: 72 }}>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
              <button key={p} onClick={() => { onPage(p); setShowJump(false); }}
                className="w-full px-2 py-1.5 text-sm text-left transition-colors"
                style={{ backgroundColor: p === currentPage ? 'var(--accent)' : 'transparent', color: p === currentPage ? '#fff' : 'var(--foreground)' }}
                onMouseEnter={e => { if (p !== currentPage) (e.currentTarget.style.backgroundColor = 'var(--hover-bg)'); }}
                onMouseLeave={e => { if (p !== currentPage) (e.currentTarget.style.backgroundColor = 'transparent'); }}>
                {p}
              </button>
            ))}
          </div>
        )}
      </div>
      <span className="text-sm px-0.5" style={{ color: 'var(--muted)' }}>of {totalPages}</span>
      <button aria-label="Next page" onClick={() => onPage(currentPage + 1)} disabled={currentPage >= totalPages || loading} className={btn} style={bStyle} onMouseEnter={hIn} onMouseLeave={hOut}><ChevronRight className="h-3.5 w-3.5" /></button>
      <button aria-label="Last page" onClick={() => onPage(totalPages)} disabled={currentPage >= totalPages || loading} className={btn} style={bStyle} onMouseEnter={hIn} onMouseLeave={hOut}><ChevronsRight className="h-3.5 w-3.5" /></button>
      <span className="text-sm ml-1 tabular-nums" style={{ color: 'var(--muted)' }}>{pageStart}–{pageEnd} of {total}</span>
    </div>
  );
}

/* ───────────────────────── Main Page ───────────────────────── */
export default function LeadsPage() {
  const [leads, setLeads]           = useState<Lead[]>([]);
  const [meta, setMeta]             = useState<LeadsResponse['meta'] | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [search, setSearch]         = useState('');
  const [loading, setLoading]       = useState(true);
  const [copiedEmail, setCopiedEmail] = useState<string | null>(null);
  const [selected, setSelected]     = useState<Set<string>>(new Set());
  const [deleteModal, setDeleteModal] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [showColumnPicker, setShowColumnPicker] = useState(false);

  // Column order (persisted) — draggable tiles
  const [columns, setColumns] = useState<ColumnDef[]>(buildInitialColumns);
  // Visible set (persisted)
  const [visibleColumns, setVisibleColumns] = useState<Set<ColumnKey>>(() => {
    const saved = loadVisible();
    if (saved) return saved;
    return new Set(BASE_COLUMNS.filter(c => c.defaultVisible).map(c => c.key));
  });

  // Drag state
  const dragKey = useRef<ColumnKey | null>(null);
  const dragOverKey = useRef<ColumnKey | null>(null);
  const [dragOverActive, setDragOverActive] = useState<ColumnKey | null>(null);

  const pickerRef = useRef<HTMLDivElement>(null);
  const { initiateCall, isInitiating } = useCall();
  const { isOnCall } = useCallStore();

  const fetchLeads = useCallback(async (page = 1) => {
    setLoading(true);
    setSelected(new Set());
    try {
      const params: Record<string, any> = { page, limit: LIMIT };
      if (search) params.search = search;
      const response = await apiClient.get<LeadsResponse>('/leads', { params });
      setLeads(response.data.data);
      setMeta(response.data.meta);
      setCurrentPage(page);
    } catch (err) { console.error('Failed to fetch leads:', err); }
    finally { setLoading(false); }
  }, [search]);

  useEffect(() => { fetchLeads(1); }, []);

  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) setShowColumnPicker(false);
    };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  const handleSearch = (e: React.FormEvent) => { e.preventDefault(); fetchLeads(1); };
  const copyEmail = (email: string) => {
    navigator.clipboard.writeText(email);
    setCopiedEmail(email);
    setTimeout(() => setCopiedEmail(null), 2000);
  };

  /* selection */
  const allIds = leads.map(l => l.id);
  const allSelected = allIds.length > 0 && allIds.every(id => selected.has(id));
  const someSelected = allIds.some(id => selected.has(id)) && !allSelected;
  const toggleSelectAll = () => {
    if (allSelected) setSelected(p => { const n = new Set(p); allIds.forEach(id => n.delete(id)); return n; });
    else setSelected(p => { const n = new Set(p); allIds.forEach(id => n.add(id)); return n; });
  };
  const toggleSelect = (id: string) =>
    setSelected(p => { const n = new Set(p); n.has(id) ? n.delete(id) : n.add(id); return n; });

  /* delete */
  const handleDeleteConfirm = async () => {
    setDeleteLoading(true);
    try {
      await Promise.all([...selected].map(id => apiClient.delete(`/leads/${id}`)));
      setDeleteModal(false);
      fetchLeads(currentPage);
    } catch (err) { console.error('Delete failed', err); }
    finally { setDeleteLoading(false); }
  };

  /* column visibility — persisted */
  const toggleColumn = (key: ColumnKey) => {
    if (key === 'call' || key === 'select') return;
    setVisibleColumns(p => {
      const n = new Set(p); n.has(key) ? n.delete(key) : n.add(key);
      saveVisible(n);
      return n;
    });
  };

  /* drag-and-drop reorder */
  const handleDragStart = (key: ColumnKey, e: React.DragEvent) => {
    dragKey.current = key;
    // Use a transparent 1×1 pixel as drag image so browser ghost doesn't lag
    const ghost = document.createElement('div');
    ghost.style.cssText = 'position:fixed;top:-9999px;width:1px;height:1px;opacity:0';
    document.body.appendChild(ghost);
    e.dataTransfer.setDragImage(ghost, 0, 0);
    setTimeout(() => document.body.removeChild(ghost), 0);
    e.dataTransfer.effectAllowed = 'move';
  };
  const handleDragEnter = (key: ColumnKey) => {
    if (key === dragKey.current) return;
    dragOverKey.current = key;
    setDragOverActive(key);
  };
  const handleDragEnd   = () => {
    if (!dragKey.current || !dragOverKey.current || dragKey.current === dragOverKey.current) return;
    setColumns(prev => {
      const next = [...prev];
      const from = next.findIndex(c => c.key === dragKey.current);
      const to   = next.findIndex(c => c.key === dragOverKey.current);
      if (from === -1 || to === -1) return prev;
      // Don't move fixed columns
      if (next[from].fixed || next[to].fixed) return prev;
      const [item] = next.splice(from, 1);
      next.splice(to, 0, item);
      saveOrder(next.map(c => c.key));
      return next;
    });
    dragKey.current = null;
    dragOverKey.current = null;
    setDragOverActive(null);
  };

  /* keyboard reorder (← → arrow keys on tiles) */
  const handleTileKeyDown = (e: React.KeyboardEvent, key: ColumnKey) => {
    if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
    e.preventDefault();
    setColumns(prev => {
      const next = [...prev];
      const idx = next.findIndex(c => c.key === key);
      const target = e.key === 'ArrowLeft' ? idx - 1 : idx + 1;
      if (target < 0 || target >= next.length) return prev;
      if (next[idx].fixed || next[target].fixed) return prev;
      [next[idx], next[target]] = [next[target], next[idx]];
      saveOrder(next.map(c => c.key));
      return next;
    });
  };

  const activeColumns = columns.filter(c => visibleColumns.has(c.key));
  const hiddenCount   = columns.filter(c => !c.fixed && !visibleColumns.has(c.key)).length;

  /* checkbox class */
  const cbClass = [
    "h-3.5 w-3.5 rounded border-2 cursor-pointer appearance-none transition-all",
    "border-[color:var(--card-border)] bg-transparent",
    "checked:border-blue-500 checked:bg-blue-500",
    "focus:outline-none focus:ring-2 focus:ring-blue-500/40",
    "indeterminate:border-blue-500 indeterminate:bg-blue-500",
  ].join(' ');

  const renderCell = (lead: Lead, col: ColumnKey) => {
    const canCall = !lead.isWrongNumber && !isOnCall && !isInitiating;
    switch (col) {
      case 'select':
        return (
          <td key={col} className="w-10 px-3 py-3">
            <input type="checkbox" aria-label={`Select ${lead.contactName || lead.companyName}`}
              checked={selected.has(lead.id)} onChange={() => toggleSelect(lead.id)}
              className={cbClass} onClick={e => e.stopPropagation()} />
          </td>
        );
      case 'contact':
        return (
          <td key={col} className="px-4 py-3 min-w-[180px]">
            <Link href={`/leads/${lead.id}`} className="text-sm font-medium hover:text-blue-500" style={{ color: 'var(--foreground)' }}>
              {lead.contactName || '—'}
            </Link>
            {lead.contactTitle && <p className="text-xs mt-0.5 truncate max-w-[175px]" style={{ color: 'var(--muted)' }}>{lead.contactTitle}</p>}
          </td>
        );
      case 'company':
        return (
          <td key={col} className="px-4 py-3 min-w-[150px]">
            <Link href={`/leads/${lead.id}`} className="text-sm hover:text-blue-500" style={{ color: 'var(--foreground)' }}>{lead.companyName}</Link>
          </td>
        );
      case 'phone':
        return (
          <td key={col} className="px-4 py-3 min-w-[145px]">
            {/* Clickable phone — initiates call via tel: + useCall */}
            <a
              href={`tel:${lead.phoneNumber}`}
              onClick={e => { e.preventDefault(); if (canCall) initiateCall(lead.id).catch(() => {}); }}
              className="text-sm tabular-nums transition-colors hover:text-blue-500"
              style={{ color: 'var(--foreground)', cursor: canCall ? 'pointer' : 'default' }}
              title={canCall ? `Call ${lead.phoneNumber}` : isOnCall ? 'Already on a call' : 'Wrong number'}
              aria-label={`Call ${lead.phoneNumber}`}
            >
              {lead.phoneNumber}
            </a>
          </td>
        );
      case 'email':
        return (
          <td key={col} className="px-4 py-3 min-w-[195px]">
            {lead.email ? (
              <div className="flex items-center gap-1">
                <p className="text-xs truncate max-w-[165px]" style={{ color: 'var(--muted)' }}>{lead.email}</p>
                <button onClick={() => copyEmail(lead.email!)} className="flex-shrink-0 rounded p-0.5" style={{ color: 'var(--muted)' }} title="Copy email" aria-label="Copy email">
                  {copiedEmail === lead.email ? <Check className="h-3 w-3 text-green-500" /> : <Copy className="h-3 w-3" />}
                </button>
              </div>
            ) : <span className="text-sm" style={{ color: 'var(--muted)' }}>—</span>}
          </td>
        );
      case 'location': {
        const loc = formatLocation(lead.location, lead.country);
        return (
          <td key={col} className="px-4 py-3 min-w-[155px]">
            {loc ? (
              <div className="flex items-center gap-1 text-sm" style={{ color: 'var(--muted)' }}>
                <MapPin className="h-3 w-3 flex-shrink-0" aria-hidden="true" />
                <span className="truncate max-w-[135px]">{loc}</span>
              </div>
            ) : <span className="text-sm" style={{ color: 'var(--muted)' }}>—</span>}
          </td>
        );
      }
      case 'industry':
        return (
          <td key={col} className="px-4 py-3 min-w-[175px]">
            {lead.industry
              ? <span className="inline-flex rounded-md px-2 py-0.5 text-xs font-medium" style={{ backgroundColor: 'var(--tag-bg)', color: 'var(--tag-text)' }}>{lead.industry}</span>
              : <span className="text-sm" style={{ color: 'var(--muted)' }}>—</span>}
          </td>
        );
      case 'headcount':
        return (
          <td key={col} className="px-4 py-3 min-w-[105px]">
            <span className="text-sm tabular-nums" style={{ color: 'var(--foreground)' }}>{lead.headcount ? lead.headcount.toLocaleString() : '—'}</span>
          </td>
        );
      case 'growth6m':
        return (
          <td key={col} className="px-4 py-3 min-w-[95px]">
            {lead.headcountGrowth6m != null
              ? <span className={cn('text-sm font-medium tabular-nums', lead.headcountGrowth6m >= 0 ? 'text-green-500' : 'text-red-400')}>{lead.headcountGrowth6m > 0 ? '+' : ''}{lead.headcountGrowth6m}%</span>
              : <span className="text-sm" style={{ color: 'var(--muted)' }}>—</span>}
          </td>
        );
      case 'growth12m':
        return (
          <td key={col} className="px-4 py-3 min-w-[100px]">
            {lead.headcountGrowth12m != null
              ? <span className={cn('text-sm font-medium tabular-nums', lead.headcountGrowth12m >= 0 ? 'text-green-500' : 'text-red-400')}>{lead.headcountGrowth12m > 0 ? '+' : ''}{lead.headcountGrowth12m}%</span>
              : <span className="text-sm" style={{ color: 'var(--muted)' }}>—</span>}
          </td>
        );
      case 'website':
        return (
          <td key={col} className="px-4 py-3 min-w-[170px]">
            {lead.website
              ? <a href={lead.website} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-500 hover:underline truncate block max-w-[155px]">{lead.website.replace(/^https?:\/\//, '')}</a>
              : <span className="text-sm" style={{ color: 'var(--muted)' }}>—</span>}
          </td>
        );
      case 'personalLinkedin':
        return (
          <td key={col} className="px-4 py-3 w-14 text-center">
            {lead.personalLinkedin
              ? <a href={lead.personalLinkedin} target="_blank" rel="noopener noreferrer" aria-label="Personal LinkedIn" className="inline-flex items-center justify-center h-7 w-7 rounded-md hover:bg-blue-500/10"><Linkedin className="h-4 w-4 text-[#0A66C2]" /></a>
              : <span style={{ color: 'var(--muted)' }}>—</span>}
          </td>
        );
      case 'companyLinkedin':
        return (
          <td key={col} className="px-4 py-3 w-14 text-center">
            {lead.companyLinkedin
              ? <a href={lead.companyLinkedin} target="_blank" rel="noopener noreferrer" aria-label="Company LinkedIn" className="inline-flex items-center justify-center h-7 w-7 rounded-md hover:bg-blue-500/10"><Linkedin className="h-4 w-4 text-[#0A66C2]" /></a>
              : <span style={{ color: 'var(--muted)' }}>—</span>}
          </td>
        );
      case 'companyOverview':
        return (
          <td key={col} className="px-4 py-3 min-w-[230px]">
            {lead.companyOverview
              ? <p className="text-xs line-clamp-2 max-w-[215px]" style={{ color: 'var(--muted)' }}>{lead.companyOverview}</p>
              : <span className="text-sm" style={{ color: 'var(--muted)' }}>—</span>}
          </td>
        );
      case 'status':
        return (
          <td key={col} className="px-4 py-3 min-w-[125px]">
            <span className={cn('inline-flex rounded-full px-2 py-0.5 text-xs font-medium', statusColors[lead.status] || statusColors.NEW)}>
              {lead.status.replace(/_/g, ' ')}
            </span>
          </td>
        );
      case 'call': {
        const dialCount = lead._count?.calls ?? 0;
        return (
          <td key={col} className="px-4 py-3 text-center w-14">
            <button
              onClick={() => initiateCall(lead.id).catch(() => {})}
              aria-label={`Call ${lead.contactName || lead.companyName}${dialCount > 0 ? ` (dialed ${dialCount}×)` : ''}`}
              className="group relative inline-flex flex-col items-center gap-0.5 rounded-lg px-1.5 py-1 transition-all hover:bg-green-500/10 active:scale-95"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                className="h-4 w-4 text-green-600 transition-transform group-hover:scale-110" aria-hidden="true">
                <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 9.81a19.79 19.79 0 01-3.07-8.67A2 2 0 012 1h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L6.09 8.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z"/>
              </svg>
              {dialCount > 0 && (
                <span className="text-[10px] font-medium tabular-nums leading-none" style={{ color: 'var(--muted)' }}>
                  {dialCount}×
                </span>
              )}
            </button>
          </td>
        );
      }
      default: return <td key={col} />;
    }
  };

  return (
    <>
      {deleteModal && (
        <DeleteModal count={selected.size} loading={deleteLoading}
          onConfirm={handleDeleteConfirm} onCancel={() => setDeleteModal(false)} />
      )}

      <div>
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold" style={{ color: 'var(--foreground)' }}>Leads</h1>
            <p className="mt-1 text-sm" style={{ color: 'var(--muted)' }}>
              {meta ? `${meta.total} leads total` : 'Loading...'}
            </p>
          </div>
          <Link href="/leads/import" className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700">
            <Upload className="h-4 w-4" aria-hidden="true" />
            Import CSV
          </Link>
        </div>

        {/* Search + Columns */}
        <div className="mb-4 flex items-center gap-3">
          <form onSubmit={handleSearch} className="flex-1" role="search">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2" style={{ color: 'var(--muted)' }} aria-hidden="true" />
              <input type="text" value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Search by company, contact, phone, or industry..."
                aria-label="Search leads"
                className="w-full rounded-lg border py-2 pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                style={{ backgroundColor: 'var(--input-bg)', borderColor: 'var(--input-border)', color: 'var(--foreground)' }} />
            </div>
          </form>

          <div className="relative" ref={pickerRef}>
            <button onClick={() => setShowColumnPicker(p => !p)} aria-expanded={showColumnPicker}
              className="flex items-center gap-2 rounded-lg border px-3 py-2 text-sm transition-colors"
              style={{ backgroundColor: showColumnPicker ? 'var(--hover-bg)' : 'var(--card-bg)', borderColor: 'var(--card-border)', color: 'var(--foreground)' }}>
              <SlidersHorizontal className="h-4 w-4" aria-hidden="true" />
              Columns
              {hiddenCount > 0 && <span className="rounded-full bg-blue-600 px-1.5 py-0.5 text-xs text-white leading-none">+{hiddenCount}</span>}
            </button>

            {/* Column picker — draggable tiles */}
            {showColumnPicker && (
              <div className="absolute right-0 top-10 z-50 w-64 rounded-xl p-3 shadow-xl"
                style={{ backgroundColor: 'var(--card-bg)', border: '1px solid var(--card-border)' }}>
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--muted)' }}>Columns · drag to reorder</span>
                  <button onClick={() => setShowColumnPicker(false)} style={{ color: 'var(--muted)' }} aria-label="Close"><X className="h-3.5 w-3.5" /></button>
                </div>

                {/* Tile grid */}
                <div className="grid grid-cols-2 gap-1.5">
                  {columns.filter(c => !c.fixed).map(col => (
                    <div
                      key={col.key}
                      draggable
                      onDragStart={e => handleDragStart(col.key, e)}
                      onDragEnter={() => handleDragEnter(col.key)}
                      onDragEnd={handleDragEnd}
                      onDragOver={e => e.preventDefault()}
                      tabIndex={0}
                      role="button"
                      aria-label={`${col.label} column, use arrow keys to reorder`}
                      onKeyDown={e => handleTileKeyDown(e, col.key)}
                      className="flex items-center gap-1.5 rounded-lg px-2 py-2 text-sm cursor-grab active:cursor-grabbing select-none transition-all duration-150"
                      style={{
                        backgroundColor: dragOverActive === col.key
                          ? 'var(--accent)'
                          : visibleColumns.has(col.key) ? 'var(--hover-bg)' : 'transparent',
                        border: `1px solid ${dragOverActive === col.key ? 'var(--accent)' : visibleColumns.has(col.key) ? 'var(--accent)' : 'var(--card-border)'}`,
                        color: dragOverActive === col.key ? '#fff' : 'var(--foreground)',
                        opacity: dragKey.current === col.key ? 0.4 : visibleColumns.has(col.key) ? 1 : 0.5,
                        transform: dragOverActive === col.key ? 'scale(1.03)' : 'scale(1)',
                        boxShadow: dragOverActive === col.key ? '0 4px 12px rgba(0,0,0,0.15)' : 'none',
                      }}
                    >
                      <GripVertical className="h-3 w-3 flex-shrink-0" style={{ color: 'var(--muted)' }} aria-hidden="true" />
                      <input
                        type="checkbox"
                        checked={visibleColumns.has(col.key)}
                        onChange={() => toggleColumn(col.key)}
                        onClick={e => e.stopPropagation()}
                        className={cbClass}
                        aria-label={`Show ${col.label}`}
                      />
                      <span className="text-xs truncate">{col.label}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Selection toolbar — NO top pagination */}
        {selected.size > 0 && (
          <div className="mb-3 flex items-center gap-2 rounded-lg px-3 py-1.5 w-fit"
            style={{ backgroundColor: 'var(--card-bg)', border: '1px solid var(--card-border)' }}>
            <button onClick={() => setSelected(new Set())} className="flex items-center gap-1.5 text-sm font-medium pr-2"
              style={{ color: 'var(--foreground)', borderRight: '1px solid var(--card-border)' }}>
              <X className="h-3.5 w-3.5" aria-hidden="true" />
              Clear {selected.size} selected
            </button>
            <button className="flex items-center justify-center rounded-md p-1.5 text-blue-500 transition-colors hover:bg-blue-500/10" aria-label="Email selected">
              <Mail className="h-4 w-4" />
            </button>
            <button onClick={() => setDeleteModal(true)} className="flex items-center justify-center rounded-md p-1.5 text-red-500 transition-colors hover:bg-red-500/10" aria-label="Delete selected">
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        )}

        {/* Table */}
        <div className="overflow-x-auto rounded-xl" style={{ backgroundColor: 'var(--card-bg)', border: '1px solid var(--card-border)' }}>
          <table className="w-full" style={{ borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ backgroundColor: 'var(--table-header)' }}>
                {activeColumns.map(col =>
                  col.key === 'select' ? (
                    <th key="select" className="w-10 px-3 py-3">
                      <input type="checkbox" aria-label="Select all"
                        checked={allSelected}
                        ref={el => { if (el) el.indeterminate = someSelected; }}
                        onChange={toggleSelectAll}
                        className={cbClass} />
                    </th>
                  ) : (
                    <th key={col.key}
                      className={cn('px-4 py-3 text-left text-xs font-medium uppercase tracking-wider whitespace-nowrap', col.width, col.key === 'call' && 'text-center')}
                      style={{ color: 'var(--muted)', borderBottom: '1px solid var(--table-divider)' }}>
                      {col.label}
                    </th>
                  )
                )}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={activeColumns.length} className="px-6 py-12 text-center text-sm" style={{ color: 'var(--muted)' }}>Loading leads...</td></tr>
              ) : leads.length === 0 ? (
                <tr>
                  <td colSpan={activeColumns.length} className="px-6 py-12 text-center">
                    <Users className="mx-auto h-8 w-8" style={{ color: 'var(--muted)' }} aria-hidden="true" />
                    <p className="mt-2 text-sm" style={{ color: 'var(--muted)' }}>No leads found</p>
                    <Link href="/leads/import" className="mt-2 inline-block text-sm text-blue-600 hover:text-blue-500">Import your first CSV</Link>
                  </td>
                </tr>
              ) : (
                leads.map(lead => (
                  <tr key={lead.id}
                    style={{ borderTop: '1px solid var(--table-divider)', backgroundColor: selected.has(lead.id) ? 'var(--hover-bg)' : 'transparent' }}
                    onMouseEnter={e => { if (!selected.has(lead.id)) (e.currentTarget as HTMLElement).style.backgroundColor = 'var(--hover-bg)'; }}
                    onMouseLeave={e => { if (!selected.has(lead.id)) (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent'; }}>
                    {activeColumns.map(col => renderCell(lead, col.key))}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Bottom pagination — sticky */}
        {meta && (
          <div className="sticky bottom-0 mt-3 flex justify-between items-center rounded-xl px-4 py-2.5 backdrop-blur-sm"
            style={{ backgroundColor: 'color-mix(in srgb, var(--card-bg) 90%, transparent)', border: '1px solid var(--card-border)' }}>
            <span className="text-xs" style={{ color: 'var(--muted)' }}>
              {selected.size > 0 ? `${selected.size} selected` : `${meta.total} total`}
            </span>
            <PaginationBar currentPage={currentPage} totalPages={meta.totalPages} total={meta.total} loading={loading} onPage={fetchLeads} />
          </div>
        )}
      </div>
    </>
  );
}