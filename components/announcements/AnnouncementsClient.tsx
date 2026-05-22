'use client'
import { useState, useMemo, useCallback, useEffect } from 'react'
import type { Announcement } from '@/types/announcement'
import { createClient } from '@/lib/supabase/client'
import { parseExcelOrCSV, normalizeScoreRows } from '@/lib/upload'
import { Plus, X, Pin, PinOff, Trash2, Upload, Megaphone, Image as ImageIcon, BarChart2, MoreVertical, ChevronDown, LayoutGrid, ChevronsUpDown, ChevronUp, ArrowUpDown } from 'lucide-react'
import toast from 'react-hot-toast'
import { createPortal } from 'react-dom'


type Ann = Announcement & { author?: { full_name: string; nickname: string | null } | null }
type ParsedRow = Record<string, string | number>
type SortDir = 'asc' | 'desc' | null

/* ─── CSS ──────────────────────────────────────────────────────────────── */
const CSS = `
  /* page */
  .ann-page { max-width: 900px; margin: 0 auto; }

  /* page header */
  .ann-page-title { font-size: 32px; font-weight: 900; letter-spacing: -0.03em; color: var(--on-surface); margin-bottom: 4px; }
  .ann-page-sub   { font-size: 13px; color: var(--outline); }

  /* toolbar */
  .ann-toolbar { display: flex; align-items: center; gap: 10px; margin-bottom: 24px; flex-wrap: wrap; }
  .ann-pills   { display: flex; gap: 8px; overflow-x: auto; scrollbar-width: none; flex: 1; }
  .ann-pills::-webkit-scrollbar { display: none; }
  .ann-pill {
    padding: 7px 18px; border-radius: 999px; font-size: 13px; font-weight: 600;
    cursor: pointer; border: none; font-family: var(--font); white-space: nowrap;
    transition: all 0.15s; background: var(--surface-highest); color: var(--outline);
  }
  .ann-pill:hover  { background: var(--surface-high); color: var(--text); }
  .ann-pill.active { background: linear-gradient(135deg, var(--primary), var(--primary-container)); color: white; box-shadow: 0 4px 14px rgba(0,80,203,0.22); }

  /* featured hero (pinned + important) */
  .ann-hero {
    border-radius: var(--r-2xl); overflow: hidden; margin-bottom: 20px;
    box-shadow: var(--shadow-md); position: relative; cursor: pointer;
    background: linear-gradient(135deg, #0d1b4b 0%, #0050cb 100%);
    min-height: 180px;
  }
  .ann-hero-overlay { position: absolute; inset: 0; background: linear-gradient(to top, rgba(0,0,0,0.7) 0%, rgba(0,0,0,0.1) 60%, transparent 100%); }
  .ann-hero-content { position: absolute; bottom: 0; left: 0; right: 0; padding: 24px 22px; }
  .ann-hero-label   { display: inline-flex; align-items: center; gap: 5px; background: rgba(255,255,255,0.15); backdrop-filter: blur(6px); padding: 3px 10px; border-radius: 999px; font-size: 10px; font-weight: 800; color: white; letter-spacing: 0.1em; text-transform: uppercase; margin-bottom: 8px; }
  .ann-hero-title   { font-size: 22px; font-weight: 900; color: white; line-height: 1.25; margin-bottom: 6px; letter-spacing: -0.02em; }
  .ann-hero-desc    { font-size: 13px; color: rgba(255,255,255,0.75); line-height: 1.5; }

  /* card */
  .ann-card {
    background: var(--surface-lowest);
    border-radius: var(--r-2xl);
    box-shadow: var(--shadow);
    margin-bottom: 14px;
    overflow: hidden;
    transition: box-shadow 0.2s;
  }
  .ann-card:hover { box-shadow: var(--shadow-md); }
  .ann-card.pinned { border-left: 3px solid var(--primary); }

  .ann-card-header { display: flex; align-items: flex-start; gap: 14px; padding: 18px 20px 14px; }
  .ann-card-icon   { width: 44px; height: 44px; border-radius: 14px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
  .ann-card-meta   { flex: 1; min-width: 0; }
  .ann-card-badges { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; margin-bottom: 5px; }
  .ann-card-title  { font-size: 15px; font-weight: 800; color: var(--on-surface); line-height: 1.35; margin-bottom: 4px; }
  .ann-card-author { font-size: 12px; color: var(--outline); display: flex; align-items: center; gap: 5px; }

  /* image thumbnail in card header */
  .ann-card-thumb  { width: 72px; height: 56px; border-radius: 10px; object-fit: cover; flex-shrink: 0; border: 1px solid var(--outline-variant); }

  /* body */
  .ann-card-body { padding: 0 20px 6px; }
  .ann-card-text { font-size: 13px; color: var(--on-surface-variant); line-height: 1.7; white-space: pre-wrap; word-break: break-word; }

  /* image full */
  .ann-card-img { width: 100%; border-radius: var(--r-lg); display: block; margin-top: 10px; }

  /* footer */
  .ann-card-footer { padding: 6px 20px 14px; display: flex; align-items: center; justify-content: space-between; }
  .ann-actions     { display: flex; align-items: center; gap: 4px; position: relative; }
  .ann-menu        { position: absolute; right: 0; top: 34px; background: var(--surface-lowest); border: 1px solid var(--outline-variant); border-radius: var(--r-lg); box-shadow: var(--shadow-md); z-index: 50; min-width: 160px; overflow: hidden; }
  .ann-menu-item   { display: flex; align-items: center; gap: 8px; padding: 11px 14px; font-size: 13px; font-weight: 600; cursor: pointer; border: none; background: none; font-family: var(--font); color: var(--text); width: 100%; text-align: left; transition: background 0.12s; }
  .ann-menu-item:hover { background: var(--surface-low); }
  .ann-menu-item.danger { color: var(--error); }

  /* empty */
  .ann-empty { text-align: center; padding: 64px 0; color: var(--outline); }

  /* desktop 2-col layout */
  .ann-layout { display: grid; grid-template-columns: 1fr 340px; gap: 24px; align-items: start; }
  .ann-sidebar { position: sticky; top: 16px; }
  .ann-sidebar-card { background: var(--surface-lowest); border-radius: var(--r-2xl); padding: 20px; box-shadow: var(--shadow); margin-bottom: 16px; }
  .ann-sidebar-title { font-size: 15px; font-weight: 800; color: var(--on-surface); margin-bottom: 14px; }
  .ann-sidebar-item  { display: flex; align-items: flex-start; gap: 10px; padding: 8px 0; border-bottom: 1px solid var(--surface-highest); cursor: pointer; transition: opacity 0.15s; }
  .ann-sidebar-item:last-child { border-bottom: none; }
  .ann-sidebar-item:hover { opacity: 0.75; }
  .ann-sidebar-icon  { width: 34px; height: 34px; border-radius: 10px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; font-size: 16px; }
  .ann-sidebar-text  { flex: 1; min-width: 0; }
  .ann-sidebar-name  { font-size: 13px; font-weight: 700; color: var(--on-surface); line-height: 1.3; overflow: hidden; text-overflow: ellipsis; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; }
  .ann-sidebar-date  { font-size: 11px; color: var(--outline); margin-top: 2px; }

  /* stat card in sidebar */
  .ann-stat-card { background: linear-gradient(135deg, var(--primary) 0%, var(--primary-container) 100%); border-radius: var(--r-2xl); padding: 20px; color: white; position: relative; overflow: hidden; }
  .ann-stat-bg   { position: absolute; right: -20px; bottom: -20px; font-size: 80px; opacity: 0.12; line-height: 1; pointer-events: none; }
  .ann-stat-label { font-size: 11px; font-weight: 800; letter-spacing: 0.1em; text-transform: uppercase; opacity: 0.8; margin-bottom: 8px; }
  .ann-stat-count { font-size: 36px; font-weight: 900; letter-spacing: -0.04em; line-height: 1; }
  .ann-stat-sub   { font-size: 12px; opacity: 0.75; margin-top: 4px; }

@media (max-width: 767px) {
    .ann-page-title  { font-size: 24px; }
    .ann-layout      { grid-template-columns: 1fr; }
    .ann-sidebar     { display: none; }
    .ann-hero-title  { font-size: 18px; }
    .ann-hero-content{ padding: 18px 16px; }
    .ann-card-header { padding: 14px 14px 10px; gap: 10px; }
    .ann-card-body   { padding: 0 14px 4px; }
    .ann-card-footer { padding: 4px 14px 12px; }
    .pill-label { display: none; }
    .pill-icon  { display: inline; font-size: 16px; }
    .ann-pill   { padding: 7px 12px; }
  }

  /* ═══════════════════════════════════════════════════════════
     AG GRID ENTERPRISE-STYLE SCORE TABLE  (table-based)
     ═══════════════════════════════════════════════════════════ */

  .ag-wrap {
    border-radius: 14px;
    overflow: hidden;
    border: 1px solid var(--outline-variant, #dde1ec);
    margin-top: 14px;
    box-shadow: 0 4px 20px rgba(0,0,0,0.09);
    font-family: 'DM Sans', -apple-system, sans-serif;
  }

  /* ── Toolbar ── */
  .ag-toolbar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 10px 14px 10px 16px;
    background: #1a2340;
    border-bottom: 1px solid rgba(255,255,255,0.06);
    gap: 8px;
    flex-wrap: wrap;
  }
  .ag-toolbar-left {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-shrink: 0;
  }
  .ag-toolbar-title {
    font-size: 12px;
    font-weight: 700;
    color: rgba(255,255,255,0.85);
    letter-spacing: 0.08em;
    text-transform: uppercase;
    display: flex;
    align-items: center;
    gap: 6px;
  }
  .ag-row-count-badge {
    background: rgba(0,163,255,0.18);
    color: #60c8ff;
    font-size: 10px;
    font-weight: 800;
    padding: 2px 9px;
    border-radius: 999px;
    letter-spacing: 0.06em;
  }
  .ag-search-box {
    display: flex;
    align-items: center;
    gap: 6px;
    background: rgba(255,255,255,0.07);
    border: 1px solid rgba(255,255,255,0.12);
    border-radius: 7px;
    padding: 5px 10px;
    min-width: 0;
    width: 200px;
    max-width: 100%;
  }
  .ag-search-box input {
    background: none;
    border: none;
    outline: none;
    color: rgba(255,255,255,0.9);
    font-size: 12px;
    font-family: inherit;
    width: 100%;
  }
  .ag-search-box input::placeholder { color: rgba(255,255,255,0.32); }
  .ag-search-clear {
    background: none; border: none; color: rgba(255,255,255,0.4);
    cursor: pointer; padding: 0; display: flex; align-items: center; flex-shrink: 0;
  }

  /* ── Scrollable table container ── */
  .ag-body {
    overflow-x: auto;
    overflow-y: auto;
    max-height: 400px;
    background: var(--surface-lowest, #fff);
  }
  .ag-body::-webkit-scrollbar { width: 6px; height: 6px; }
  .ag-body::-webkit-scrollbar-track { background: transparent; }
  .ag-body::-webkit-scrollbar-thumb { background: rgba(0,0,0,0.14); border-radius: 999px; }

  /* ── Table itself ── */
  .ag-table {
    width: 100%;
    border-collapse: collapse;
    table-layout: auto;
    min-width: 400px;
  }

  /* ── Header ── */
  .ag-table thead { position: sticky; top: 0; z-index: 2; }
  .ag-table thead tr { background: #232e4a; }
  .ag-th {
    padding: 11px 14px;
    font-size: 10px;
    font-weight: 800;
    letter-spacing: 0.09em;
    text-transform: uppercase;
    color: rgba(255,255,255,0.5);
    border-right: 1px solid rgba(255,255,255,0.05);
    border-bottom: 2px solid rgba(255,255,255,0.07);
    white-space: nowrap;
    cursor: pointer;
    user-select: none;
    text-align: left;
    transition: background 0.15s, color 0.15s;
  }
  .ag-th:last-child { border-right: none; }
  .ag-th:hover { background: rgba(255,255,255,0.05); color: rgba(255,255,255,0.85); }
  .ag-th.sorted { color: #60c8ff; background: rgba(0,163,255,0.07); }
  .ag-th-inner { display: flex; align-items: center; gap: 5px; }
  .ag-th-label { flex: 1; }
  .ag-sort-icon { flex-shrink: 0; opacity: 0.45; transition: opacity 0.15s, transform 0.22s ease; }
  .ag-th.sorted .ag-sort-icon { opacity: 1; }
  .ag-sort-icon.desc { transform: rotate(180deg); }

  /* Row-number th */
  .ag-th-rownum {
    width: 40px;
    min-width: 40px;
    text-align: center;
    padding: 11px 6px;
    color: rgba(255,255,255,0.28);
    font-size: 9px;
    cursor: default;
    border-right: 1px solid rgba(255,255,255,0.05);
    border-bottom: 2px solid rgba(255,255,255,0.07);
    background: rgba(0,0,0,0.08);
  }

  /* ── Data rows ── */
  .ag-table tbody tr {
    border-bottom: 1px solid var(--surface-highest, #eef0f8);
    transition: background 0.1s;
    animation: agRowIn 0.26s both;
  }
  .ag-table tbody tr:last-child { border-bottom: none; }
  .ag-table tbody tr:nth-child(even) { background: rgba(0,80,203,0.018); }
  .ag-table tbody tr:hover { background: rgba(0,80,203,0.06) !important; }

  @keyframes agRowIn {
    from { opacity: 0; transform: translateY(5px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  .ag-table tbody tr:nth-child(1)  { animation-delay: 0.00s; }
  .ag-table tbody tr:nth-child(2)  { animation-delay: 0.03s; }
  .ag-table tbody tr:nth-child(3)  { animation-delay: 0.055s; }
  .ag-table tbody tr:nth-child(4)  { animation-delay: 0.08s; }
  .ag-table tbody tr:nth-child(5)  { animation-delay: 0.10s; }
  .ag-table tbody tr:nth-child(6)  { animation-delay: 0.12s; }
  .ag-table tbody tr:nth-child(7)  { animation-delay: 0.14s; }
  .ag-table tbody tr:nth-child(8)  { animation-delay: 0.155s; }
  .ag-table tbody tr:nth-child(9)  { animation-delay: 0.17s; }
  .ag-table tbody tr:nth-child(10) { animation-delay: 0.185s; }

  /* ── Cells ── */
  .ag-td {
    padding: 10px 14px;
    font-size: 12.5px;
    color: var(--on-surface, #1a2340);
    border-right: 1px solid var(--surface-highest, #eef0f8);
    white-space: nowrap;
    max-width: 220px;
    overflow: hidden;
    text-overflow: ellipsis;
    vertical-align: middle;
  }
  .ag-td:last-child { border-right: none; }

  /* row-num td */
  .ag-td-rownum {
    width: 40px;
    min-width: 40px;
    text-align: center;
    padding: 10px 4px;
    font-size: 11px;
    font-weight: 700;
    color: rgba(0,80,203,0.38);
    background: rgba(0,80,203,0.022);
    border-right: 1px solid var(--surface-highest, #eef0f8);
    vertical-align: middle;
  }

  /* ── Score cell: badge + bar ── */
  .ag-score-wrap { display: flex; align-items: center; gap: 8px; }
  .ag-score-badge {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-width: 46px;
    padding: 3px 9px;
    border-radius: 6px;
    font-size: 12px;
    font-weight: 800;
    letter-spacing: 0.02em;
    flex-shrink: 0;
    transition: transform 0.15s;
  }
  .ag-table tbody tr:hover .ag-score-badge { transform: scale(1.07); }
  .ag-score-bar-track {
    flex: 1;
    min-width: 28px;
    height: 4px;
    border-radius: 999px;
    background: var(--surface-highest, #eef0f8);
    overflow: hidden;
  }
  .ag-score-bar-fill {
    height: 100%;
    border-radius: 999px;
    transition: width 0.65s cubic-bezier(0.34, 1.5, 0.64, 1);
  }

  /* ── Pagination bar ── */
  .ag-pagination {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 8px 16px;
    background: #f8f9fc;
    border-top: 1px solid var(--outline-variant, #dde1ec);
    flex-wrap: wrap;
    gap: 8px;
    min-height: 44px;
  }
  .ag-page-info {
    font-size: 12.5px;
    color: #8892aa;
    font-weight: 500;
    white-space: nowrap;
  }
  .ag-page-info strong { color: #1a2340; font-weight: 700; }
  .ag-page-btns { display: flex; align-items: center; gap: 4px; }
  .ag-page-btn {
    display: flex; align-items: center; justify-content: center;
    width: 32px; height: 32px;
    border-radius: 8px;
    border: 1px solid var(--outline-variant, #dde1ec);
    background: #fff;
    font-size: 12px; font-weight: 700; color: #4a5270;
    cursor: pointer; font-family: inherit;
    transition: all 0.14s;
    user-select: none;
  }
  .ag-page-btn:hover:not(:disabled):not(.active) {
    background: var(--surface-low, #f0f2f8);
    border-color: #b0b8d4;
    color: #1a2340;
  }
  .ag-page-btn.active {
    background: var(--primary, #0050cb);
    border-color: var(--primary, #0050cb);
    color: #fff;
    box-shadow: 0 2px 8px rgba(0,80,203,0.28);
  }
  .ag-page-btn:disabled { opacity: 0.32; cursor: not-allowed; }

  /* ── OLD show-more (kept for reference, unused) ── */
  .ag-show-more {
    display: flex; align-items: center; justify-content: center; gap: 6px;
    width: 100%; padding: 10px 0;
    background: rgba(0,80,203,0.035);
    border: none;
    border-top: 1px dashed var(--outline-variant, #dde1ec);
    font-size: 12px; font-weight: 700;
    color: var(--primary, #0050cb);
    cursor: pointer; font-family: inherit;
    transition: background 0.15s;
    letter-spacing: 0.02em;
  }
  .ag-show-more:hover { background: rgba(0,80,203,0.08); }

  /* ── Status bar ── */
  .ag-statusbar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 7px 16px;
    background: #f4f6fb;
    border-top: 1px solid var(--outline-variant, #dde1ec);
    flex-wrap: wrap;
    gap: 8px;
    min-height: 32px;
  }
  .ag-status-group { display: flex; align-items: center; gap: 18px; flex-wrap: wrap; }
  .ag-status-item {
    display: flex; align-items: center; gap: 4px;
    font-size: 10.5px; font-weight: 700;
    color: #8892aa;
    letter-spacing: 0.05em; text-transform: uppercase;
  }
  .ag-status-val { color: #1a2340; font-weight: 800; }
  .ag-status-dot {
    width: 6px; height: 6px; border-radius: 999px;
    background: var(--primary, #0050cb); opacity: 0.5;
  }

  /* ── Empty state ── */
  .ag-empty {
    padding: 36px 0; text-align: center;
    font-size: 13px; color: var(--outline, #8892aa);
  }

  /* ── Responsive ── */
  @media (max-width: 600px) {
    .ag-score-bar-track { display: none; }
    .ag-toolbar-title .ag-title-label { display: none; }
    .ag-th, .ag-td { padding: 9px 10px; font-size: 11.5px; }
    .ag-th-rownum, .ag-td-rownum { display: none; }
    .ag-search-box { width: 150px; }
    .ag-status-item:not(:first-child) { display: none; }
  }
`

/* ─── Grade colour helper ─────────────────────────────────────────────── */
function gradeColor(pct: number): { bg: string; color: string; bar: string } {
  if (pct >= 0.8) return { bg: 'rgba(5,150,105,0.10)', color: '#059669', bar: '#059669' }
  if (pct >= 0.6) return { bg: 'rgba(217,119,6,0.09)', color: '#d97706', bar: '#f59e0b' }
  return { bg: 'rgba(220,38,38,0.09)', color: '#dc2626', bar: '#ef4444' }
}

/* ─── detect numeric columns ─────────────────────────────────────────── */
function getNumericCols(rows: ParsedRow[]): Set<string> {
  const s = new Set<string>()
  if (!rows.length) return s
  for (const k of Object.keys(rows[0])) {
    if (rows.every(r => r[k] === '' || typeof r[k] === 'number' || !isNaN(Number(r[k])))) s.add(k)
  }
  return s
}

function getMaxPerCol(rows: ParsedRow[], numCols: Set<string>): Record<string, number> {
  const m: Record<string, number> = {}
  for (const k of numCols) m[k] = Math.max(...rows.map(r => Number(r[k] ?? 0)))
  return m
}

const PREVIEW_SIZE = 8

/* ═══════════════════════════════════════════════════════════
   AG-GRID ENTERPRISE STYLE SCORE TABLE  (table-based fix)
   ═══════════════════════════════════════════════════════════ */
function ScoreTable({ rows }: { rows: ParsedRow[] }) {
  const [page, setPage] = useState(1)
  const [sortCol, setSortCol] = useState<string | null>(null)
  const [sortDir, setSortDir] = useState<SortDir>(null)
  const [query, setQuery] = useState('')

  if (!rows.length) return null

  const cols = Object.keys(rows[0])
  const numCols = getNumericCols(rows)
  const maxPer = getMaxPerCol(rows, numCols)

  // Filter
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return rows
    return rows.filter(row => cols.some(c => String(row[c] ?? '').toLowerCase().includes(q)))
  }, [rows, query, cols])

  // Sort
  const sorted = useMemo(() => {
    if (!sortCol || !sortDir) return filtered
    return [...filtered].sort((a, b) => {
      const av = a[sortCol]; const bv = b[sortCol]
      const an = Number(av); const bn = Number(bv)
      if (!isNaN(an) && !isNaN(bn)) return sortDir === 'asc' ? an - bn : bn - an
      return sortDir === 'asc'
        ? String(av ?? '').localeCompare(String(bv ?? ''))
        : String(bv ?? '').localeCompare(String(av ?? ''))
    })
  }, [filtered, sortCol, sortDir])

  // Pagination
  const totalPages = Math.max(1, Math.ceil(sorted.length / PREVIEW_SIZE))
  const safePage = Math.min(page, totalPages)
  const startIdx = (safePage - 1) * PREVIEW_SIZE
  const endIdx = Math.min(startIdx + PREVIEW_SIZE, sorted.length)
  const displayed = sorted.slice(startIdx, endIdx)

  function handleSort(col: string) {
    if (sortCol !== col) { setSortCol(col); setSortDir('asc'); setPage(1); return }
    if (sortDir === 'asc') { setSortDir('desc'); return }
    setSortCol(null); setSortDir(null)
  }

  function goPage(p: number) {
    setPage(Math.max(1, Math.min(p, totalPages)))
  }

  // Reset page when filter/sort changes
  useMemo(() => { setPage(1) }, [query, sortCol, sortDir])

  // Stats
  const stats = useMemo(() => {
    const firstNum = [...numCols].find(c => maxPer[c] > 0)
    if (!firstNum) return null
    const vals = sorted.map(r => Number(r[firstNum])).filter(v => !isNaN(v))
    if (!vals.length) return null
    const avg = (vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(1)
    return { col: firstNum, avg, max: Math.max(...vals), min: Math.min(...vals) }
  }, [sorted, numCols, maxPer])

  // Page buttons: first, prev, up to 5 page numbers, next, last
  function pageButtons() {
    const btns: (number | '...')[] = []
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) btns.push(i)
    } else {
      btns.push(1)
      if (safePage > 3) btns.push('...')
      for (let i = Math.max(2, safePage - 1); i <= Math.min(totalPages - 1, safePage + 1); i++) btns.push(i)
      if (safePage < totalPages - 2) btns.push('...')
      btns.push(totalPages)
    }
    return btns
  }

  return (
    <div className="ag-wrap">

      {/* ── Toolbar ── */}
      <div className="ag-toolbar">
        <div className="ag-toolbar-left">
          <div className="ag-toolbar-title">
            <BarChart2 size={13} />
            <span className="ag-title-label">ตารางคะแนน</span>
          </div>
          <span className="ag-row-count-badge">{sorted.length} ROWS</span>
        </div>
        <div className="ag-search-box">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.38)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
          </svg>
          <input
            placeholder="ค้นหา..."
            value={query}
            onChange={e => { setQuery(e.target.value) }}
          />
          {query && (
            <button className="ag-search-clear" onClick={() => setQuery('')}>
              <X size={11} />
            </button>
          )}
        </div>
      </div>

      {/* ── Scrollable table ── */}
      <div className="ag-body">
        {displayed.length === 0 ? (
          <div className="ag-empty">ไม่พบข้อมูลที่ตรงกับการค้นหา</div>
        ) : (
          <table className="ag-table">
            <thead>
              <tr>
                <th className="ag-th-rownum">#</th>
                {cols.map(col => {
                  const isSort = sortCol === col
                  return (
                    <th
                      key={col}
                      className={`ag-th ${isSort ? 'sorted' : ''}`}
                      onClick={() => handleSort(col)}
                    >
                      <div className="ag-th-inner">
                        <span className="ag-th-label">{col}</span>
                        {isSort
                          ? <ChevronUp size={11} className={`ag-sort-icon${sortDir === 'desc' ? ' desc' : ''}`} />
                          : <ChevronsUpDown size={10} className="ag-sort-icon" />
                        }
                      </div>
                    </th>
                  )
                })}
              </tr>
            </thead>
            <tbody>
              {displayed.map((row, i) => (
                <tr key={startIdx + i}>
                  <td className="ag-td-rownum">{startIdx + i + 1}</td>
                  {cols.map(c => {
                    const val = row[c]
                    const isNum = numCols.has(c) && val !== '' && val !== null && val !== undefined
                    if (isNum) {
                      const n = Number(val)
                      const mx = maxPer[c] ?? 100
                      const pct = mx > 0 ? n / mx : 0
                      const gc = gradeColor(pct)
                      return (
                        <td key={c} className="ag-td" style={{ minWidth: 110 }}>
                          <div className="ag-score-wrap">
                            <span className="ag-score-badge" style={{ background: gc.bg, color: gc.color }}>{n}</span>
                            <div className="ag-score-bar-track">
                              <div className="ag-score-bar-fill" style={{ width: `${Math.min(pct * 100, 100)}%`, background: gc.bar }} />
                            </div>
                          </div>
                        </td>
                      )
                    }
                    return <td key={c} className="ag-td">{String(val ?? '')}</td>
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* ── Stats row ── */}
      <div className="ag-statusbar">
        <div className="ag-status-group">
          <span className="ag-status-item">ROWS&nbsp;<span className="ag-status-val">{sorted.length}</span></span>
          {stats && (
            <>
              <span className="ag-status-item">AVG&nbsp;<span className="ag-status-val">{stats.avg}</span></span>
              <span className="ag-status-item">MAX&nbsp;<span className="ag-status-val">{stats.max}</span></span>
              <span className="ag-status-item">MIN&nbsp;<span className="ag-status-val">{stats.min}</span></span>
            </>
          )}
        </div>
        {sortCol && (
          <span className="ag-status-item">
            <div className="ag-status-dot" />
            SORTED&nbsp;<span className="ag-status-val">{sortCol}</span>&nbsp;{sortDir === 'asc' ? '↑' : '↓'}
          </span>
        )}
      </div>

      {/* ── Pagination bar ── */}
      <div className="ag-pagination">
        <span className="ag-page-info">
          แสดง <strong>{sorted.length === 0 ? 0 : startIdx + 1}–{endIdx}</strong> จาก <strong>{sorted.length}</strong> รายการ
        </span>
        <div className="ag-page-btns">
          {/* First */}
          <button className="ag-page-btn" onClick={() => goPage(1)} disabled={safePage === 1} title="หน้าแรก">
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="11 17 6 12 11 7"/><polyline points="18 17 13 12 18 7"/>
            </svg>
          </button>
          {/* Prev */}
          <button className="ag-page-btn" onClick={() => goPage(safePage - 1)} disabled={safePage === 1} title="ก่อนหน้า">
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6"/>
            </svg>
          </button>
          {/* Page numbers */}
          {pageButtons().map((btn, idx) =>
            btn === '...'
              ? <span key={`ellipsis-${idx}`} style={{ padding: '0 2px', color: '#8892aa', fontSize: 13 }}>…</span>
              : <button
                  key={btn}
                  className={`ag-page-btn${safePage === btn ? ' active' : ''}`}
                  onClick={() => goPage(btn as number)}
                >
                  {btn}
                </button>
          )}
          {/* Next */}
          <button className="ag-page-btn" onClick={() => goPage(safePage + 1)} disabled={safePage === totalPages} title="ถัดไป">
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="9 18 15 12 9 6"/>
            </svg>
          </button>
          {/* Last */}
          <button className="ag-page-btn" onClick={() => goPage(totalPages)} disabled={safePage === totalPages} title="หน้าสุดท้าย">
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="13 17 18 12 13 7"/><polyline points="6 17 11 12 6 7"/>
            </svg>
          </button>
        </div>
      </div>
    </div>
  )
}

/* ─── type icon / colour ─────────────────────────────────────────────── */
const TYPE_META = {
  text:   { icon: <Megaphone size={20} />,  bg: 'rgba(0,80,203,0.1)',  color: 'var(--primary)',    label: 'ประกาศ' },
  image:  { icon: <ImageIcon size={20} />,  bg: 'rgba(67,69,209,0.1)', color: 'var(--tertiary)',   label: 'รูปภาพ' },
  scores: { icon: <BarChart2 size={20} />,  bg: 'rgba(0,104,119,0.1)', color: 'var(--secondary)',  label: 'คะแนน' },
}

/* ─── Main component ─────────────────────────────────────────────────── */
export default function AnnouncementsClient({
  announcements: init, isAdmin,
}: {
  announcements: Ann[]
  isAdmin: boolean
}) {
  const [list, setList] = useState(init)
  const [filter, setFilter] = useState<'all' | 'text' | 'image' | 'scores'>('all')
  const [modal, setModal] = useState(false)
  const [openMenu, setOpenMenu] = useState<string | null>(null)
  const supabase = createClient()

  // 🔴 Realtime: รับประกาศใหม่ทันทีโดยไม่ต้อง refresh
  useEffect(() => {
    const channel = supabase
      .channel('announcements-realtime')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'announcements' },
        async (payload) => {
          // ดึงข้อมูลพร้อม author จาก DB เพราะ payload ไม่มี join
          const { data } = await supabase
            .from('announcements')
            .select('*, author:profiles(full_name, nickname)')
            .eq('id', payload.new.id)
            .single()
          if (data) setList((prev) => {
            if (prev.some((a) => a.id === data.id)) return prev
            return [data, ...prev]
          })
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'announcements' },
        async (payload) => {
          const { data } = await supabase
            .from('announcements')
            .select('*, author:profiles(full_name, nickname)')
            .eq('id', payload.new.id)
            .single()
          if (data) setList((prev) => prev.map((a) => a.id === data.id ? data : a))
        }
      )
      .on(
        'postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'announcements' },
        (payload) => {
          setList((prev) => prev.filter((a) => a.id !== payload.old.id))
        }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [supabase])

  const sorted = [...list].sort((a, b) => {
    if (a.is_important && !b.is_important) return -1
    if (!a.is_important && b.is_important) return 1
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  })
  const filtered = sorted.filter(a => filter === 'all' || a.type === filter)
  const featuredAnn = filtered.find(a => a.is_important) ?? null
  const recentList = sorted.slice(0, 5)

  async function togglePin(id: string, cur: boolean) {
    await supabase.from('announcements').update({ is_important: !cur }).eq('id', id)
    setList(p => p.map(a => a.id === id ? { ...a, is_important: !cur } : a))
    toast.success(!cur ? '📌 ปักหมุดแล้ว' : 'ยกเลิกการปักหมุด')
    setOpenMenu(null)
  }

  async function del(id: string) {
    if (!confirm('ยืนยันการลบประกาศนี้?')) return
    await supabase.from('announcements').delete().eq('id', id)
    setList(p => p.filter(a => a.id !== id))
    toast.success('ลบแล้ว')
    setOpenMenu(null)
  }

  function fmt(dt: string) {
    return new Date(dt).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: '2-digit' })
  }

  const AnnCard = ({ a }: { a: Ann }) => {
    const tm = TYPE_META[a.type] ?? TYPE_META.text
    const rows = (a.scores_data ?? []) as ParsedRow[]
    const menuOpen = openMenu === a.id

    return (
      <div className={`ann-card ${a.is_important ? 'pinned' : ''}`}>
        <div className="ann-card-header">
          <div className="ann-card-icon" style={{ background: tm.bg }}>
            <span style={{ fontSize: 20 }}>{tm.icon}</span>
          </div>
          <div className="ann-card-meta">
            <div className="ann-card-badges">
              {a.is_important && (
                <span style={{ display:'inline-flex', alignItems:'center', gap:4, fontSize:10, fontWeight:800, letterSpacing:'0.08em', textTransform:'uppercase', background:'rgba(220,38,38,0.08)', color:'#dc2626', padding:'2px 8px', borderRadius:999 }}>
                  ❗ IMPORTANT
                </span>
              )}
              <span style={{ fontSize:10, fontWeight:800, letterSpacing:'0.08em', textTransform:'uppercase', background: tm.bg, color: tm.color, padding:'2px 8px', borderRadius:999 }}>
                {tm.label}
              </span>
            </div>
            <h3 className="ann-card-title">{a.title}</h3>
            <p className="ann-card-author">
              <span>{a.author?.nickname ?? a.author?.full_name ?? 'ครู'}</span>
              <span style={{ opacity: 0.4 }}>•</span>
              <span>{fmt(a.created_at)}</span>
            </p>
          </div>
          {a.type === 'image' && a.image_url && (
            <img src={a.image_url} alt="" className="ann-card-thumb" />
          )}
          {isAdmin && (
            <div className="ann-actions">
              <button
                className="btn btn-sm btn-ghost btn-icon"
                style={{ position:'relative' }}
                onClick={() => setOpenMenu(menuOpen ? null : a.id)}
              >
                <MoreVertical size={15} />
              </button>
              {menuOpen && (
                <div className="ann-menu">
                  <button className="ann-menu-item" onClick={() => togglePin(a.id, a.is_important)}>
                    {a.is_important ? <><PinOff size={14} /> ยกเลิกปักหมุด</> : <><Pin size={14} /> ปักหมุดไว้บนสุด</>}
                  </button>
                  <button className="ann-menu-item danger" onClick={() => del(a.id)}>
                    <Trash2 size={14} /> ลบประกาศ
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="ann-card-body">
          {a.content && <p className="ann-card-text">{a.content}</p>}
          {a.type === 'image' && a.image_url && (
            <img src={a.image_url} alt={a.title} className="ann-card-img" />
          )}
          {a.type === 'scores' && rows.length > 0 && <ScoreTable rows={rows} />}
        </div>

        <div className="ann-card-footer">
          <span style={{ fontSize: 11, color: 'var(--outline)' }}>
            อัปเดตล่าสุด: {fmt(a.updated_at ?? a.created_at)}
          </span>
        </div>
      </div>
    )
  }

  return (
    <div className="ann-page" onClick={() => openMenu && setOpenMenu(null)}>
      <style>{CSS}</style>

      <div style={{ marginBottom: 20 }}>
        <h1 className="ann-page-title">ประกาศ</h1>
        <p className="ann-page-sub">แสดงทั้งหมด {list.length} ประกาศ</p>
      </div>

      <div className="ann-toolbar">
        <div className="ann-pills">
          {(['all','text','image','scores'] as const).map(f => (
            <button key={f} className={`ann-pill ${filter === f ? 'active' : ''}`} onClick={() => setFilter(f)}
              style={{ display:'inline-flex', alignItems:'center', gap: 6 }}>
              <span className="pill-icon" style={{ display:'flex', alignItems:'center' }}>
                {f === 'all' ? <LayoutGrid size={16} /> : TYPE_META[f].icon}
              </span>
              <span className="pill-label">{f === 'all' ? 'ทั้งหมด' : TYPE_META[f].label}</span>
            </button>
          ))}
        </div>
        {isAdmin && (
          <button className="btn btn-primary" onClick={() => setModal(true)}>
            <Plus size={14} /> สร้างประกาศ
          </button>
        )}
      </div>

      <div className="ann-layout">
        <div>
          {featuredAnn && filter === 'all' && (
            <div className="ann-hero fade-up" style={{ backgroundImage: featuredAnn.image_url ? `url(${featuredAnn.image_url})` : undefined, backgroundSize: 'cover', backgroundPosition: 'center' }}>
              <div className="ann-hero-overlay" />
              <div className="ann-hero-content">
                <div className="ann-hero-label">📌 FEATURED</div>
                <h2 className="ann-hero-title">{featuredAnn.title}</h2>
                {featuredAnn.content && (
                  <p className="ann-hero-desc" style={{ display:'-webkit-box', WebkitLineClamp:2, WebkitBoxOrient:'vertical', overflow:'hidden' }}>
                    {featuredAnn.content}
                  </p>
                )}
              </div>
            </div>
          )}

          {filtered.length === 0 ? (
            <div className="ann-empty">
              <Megaphone size={40} style={{ margin:'0 auto 12px', opacity:0.25 }} />
              <p style={{ fontSize:14 }}>ยังไม่มีประกาศ</p>
            </div>
          ) : (
            filtered.map(a => <AnnCard key={a.id} a={a} />)
          )}
        </div>

        <aside className="ann-sidebar">
          <div className="ann-stat-card" style={{ marginBottom: 16 }}>
            <div className="ann-stat-bg">📣</div>
            <div className="ann-stat-label">ประกาศทั้งหมด</div>
            <div className="ann-stat-count">{list.length}</div>
            <div className="ann-stat-sub">{list.filter(a => a.is_important).length} ปักหมุด · {list.filter(a => a.type === 'scores').length} ตารางคะแนน</div>
          </div>
          <div className="ann-sidebar-card">
            <div className="ann-sidebar-title">ประกาศสั้นๆ</div>
            {recentList.map(a => {
              const tm = TYPE_META[a.type] ?? TYPE_META.text
              return (
                <div key={a.id} className="ann-sidebar-item">
                  <div className="ann-sidebar-icon" style={{ background: tm.bg }}>
                    <span>{tm.icon}</span>
                  </div>
                  <div className="ann-sidebar-text">
                    <div className="ann-sidebar-name">{a.title}</div>
                    <div className="ann-sidebar-date">{fmt(a.created_at)}</div>
                  </div>
                </div>
              )
            })}
          </div>
        </aside>
      </div>

      {modal && createPortal(
        <AddAnnouncementModal
          onClose={() => setModal(false)}
          onCreated={a => { setList(p => [a, ...p]); setModal(false) }}
        />,
        document.body
      )}
    </div>
  )
}

/* ─── Add Modal ──────────────────────────────────────────────────────── */
function AddAnnouncementModal({
  onClose, onCreated,
}: {
  onClose: () => void
  onCreated: (a: Ann) => void
}) {
  const [type, setType] = useState<'text' | 'image' | 'scores'>('text')
  const [form, setForm] = useState({ title: '', content: '', is_important: false })
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [scoresFile, setScoresFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<Record<string, string | number>[]>([])
  const [saving, setSaving] = useState(false)
  const supabase = createClient()

  async function onScoresFile(file: File) {
    setScoresFile(file)
    try {
      const rows = await parseExcelOrCSV(file)
      const norm = normalizeScoreRows(rows)
      setPreview(norm.slice(0, 3))
    } catch { setPreview([]) }
  }

  async function save() {
    if (!form.title.trim()) { toast.error('กรุณาใส่หัวข้อ'); return }
    setSaving(true)
    let image_url = null
    let scores_data = null

    if (type === 'image' && imageFile) {
      const path = `announcements/${Date.now()}-${imageFile.name}`
      await supabase.storage.from('announcements').upload(path, imageFile)
      const { data } = supabase.storage.from('announcements').getPublicUrl(path)
      image_url = data.publicUrl
    }
    if (type === 'scores' && scoresFile) {
      const rows = await parseExcelOrCSV(scoresFile)
      scores_data = normalizeScoreRows(rows)
    }

    const { data: { user } } = await supabase.auth.getUser()
    const { data, error } = await supabase.from('announcements').insert({
      type, title: form.title, content: form.content || null,
      is_important: form.is_important, image_url, scores_data, created_by: user?.id,
    }).select('*, author:profiles(full_name, nickname)').single()

    if (error || !data) { toast.error('สร้างไม่สำเร็จ'); setSaving(false); return }
    toast.success('สร้างประกาศแล้ว ✓')

    // 🔔 แจ้งเตือนนักเรียนทุกคนว่ามีประกาศใหม่
    try {
      await fetch('/api/notifications/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'new_announcement',
          title: `ประกาศใหม่: "${data.title}"`,
          body: form.content ? form.content.slice(0, 80) + (form.content.length > 80 ? '…' : '') : undefined,
          link: '/dashboard/announcements',
          metadata: { announcement_id: data.id, is_important: form.is_important },
          target_role: 'student',
        }),
      })
    } catch { /* ไม่ block flow */ }

    onCreated(data)
  }

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: 520 }}>
        <div className="modal-header">
          <h3 style={{ fontWeight: 800, fontSize: 16 }}>สร้างประกาศใหม่</h3>
          <button className="btn btn-icon btn-ghost" onClick={onClose}><X size={16} /></button>
        </div>
        <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label className="form-label">ประเภทประกาศ</label>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {([
                { v:'text',   label:'ข้อความ',    icon: <Megaphone size={14} /> },
                { v:'image',  label:'รูปภาพ',     icon: <ImageIcon size={14} /> },
                { v:'scores', label:'ตารางคะแนน', icon: <BarChart2 size={14} /> },
              ] as const).map(({ v, label, icon }) => (
                <button
                  key={v}
                  onClick={() => setType(v)}
                  className={`btn btn-sm ${type === v ? 'btn-primary' : ''}`}
                  style={{ display:'inline-flex', alignItems:'center', gap:6 }}
                >
                  {icon}{label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="form-label">หัวข้อ *</label>
            <input className="input" placeholder="หัวข้อประกาศ..." value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} />
          </div>
          <div>
            <label className="form-label">เนื้อหา / รายละเอียด</label>
            <textarea className="input" rows={3} style={{ borderRadius: 'var(--r-lg)', resize: 'vertical' }} placeholder="รายละเอียดเพิ่มเติม..." value={form.content} onChange={e => setForm(p => ({ ...p, content: e.target.value }))} />
          </div>

          {type === 'image' && (
            <div>
              <label className="form-label">รูปภาพ</label>
              <label style={{ display:'flex', alignItems:'center', gap:10, border:'1.5px dashed var(--outline-variant)', borderRadius:'var(--r-lg)', padding:14, cursor:'pointer', background: imageFile ? 'var(--surface-low)' : '' }}>
                <ImageIcon size={18} color="var(--outline)" />
                <span style={{ fontSize:13, color:'var(--outline)' }}>{imageFile?.name ?? 'คลิกเลือกรูปภาพ...'}</span>
                <input type="file" accept="image/*" style={{ display:'none' }} onChange={e => setImageFile(e.target.files?.[0] ?? null)} />
              </label>
            </div>
          )}

          {type === 'scores' && (
            <div>
              <label className="form-label">ไฟล์คะแนน (.csv / .xlsx)</label>
              <label style={{ display:'flex', alignItems:'center', gap:10, border:'1.5px dashed var(--outline-variant)', borderRadius:'var(--r-lg)', padding:14, cursor:'pointer', background: scoresFile ? 'var(--surface-low)' : '' }}>
                <BarChart2 size={18} color="var(--outline)" />
                <span style={{ fontSize:13, color:'var(--outline)' }}>{scoresFile?.name ?? 'คลิกเลือกไฟล์ .csv / .xlsx'}</span>
                <input type="file" accept=".csv,.xlsx,.xls" style={{ display:'none' }} onChange={e => e.target.files?.[0] && onScoresFile(e.target.files[0])} />
              </label>
              {preview.length > 0 && (
                <div style={{ marginTop:10, background:'var(--surface-low)', borderRadius:'var(--r-lg)', padding:'10px 14px', fontSize:12, color:'var(--outline)' }}>
                  <div style={{ fontWeight:700, marginBottom:6 }}>ตัวอย่างข้อมูล ({preview.length} แถวแรก)</div>
                  <div style={{ overflowX:'auto' }}>
                    <table style={{ borderCollapse:'collapse', fontSize:11, minWidth:200 }}>
                      <thead><tr>{Object.keys(preview[0]).map(k => <th key={k} style={{ padding:'4px 8px', background:'var(--surface-highest)', borderRadius:4, fontWeight:700, whiteSpace:'nowrap' }}>{k}</th>)}</tr></thead>
                      <tbody>{preview.map((r,i) => <tr key={i}>{Object.values(r).map((v,j) => <td key={j} style={{ padding:'4px 8px', borderBottom:'1px solid var(--surface-highest)' }}>{String(v)}</td>)}</tr>)}</tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          <label style={{ display:'flex', alignItems:'center', gap:10, cursor:'pointer', padding:'10px 14px', background:'var(--surface-low)', borderRadius:'var(--r-lg)', fontSize:13, fontWeight:600 }}>
            <input type="checkbox" checked={form.is_important} onChange={e => setForm(p => ({ ...p, is_important: e.target.checked }))} style={{ width:16, height:16 }} />
            <Pin size={14} color="var(--primary)" />
            ปักหมุดไว้บนสุด (สำคัญ)
          </label>
        </div>
        <div className="modal-footer">
          <button className="btn" onClick={onClose}>ยกเลิก</button>
          <button className="btn btn-primary" onClick={save} disabled={saving}>
            {saving ? <><div className="spinner" />กำลังสร้าง...</> : '📣 เผยแพร่'}
          </button>
        </div>
      </div>
    </div>
  )
}