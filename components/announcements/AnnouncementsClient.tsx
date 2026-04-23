'use client'
import { useState } from 'react'
import type { Announcement } from '@/types/announcement'
import { createClient } from '@/lib/supabase/client'
import { parseExcelOrCSV, normalizeScoreRows } from '@/lib/upload'
import { Plus, X, Pin, PinOff, Trash2, Upload, Megaphone, Image as ImageIcon, BarChart2, MoreVertical, ChevronDown, LayoutGrid } from 'lucide-react'
import toast from 'react-hot-toast'
import { createPortal } from 'react-dom'


type Ann = Announcement & { author?: { full_name: string; nickname: string | null } | null }
type ParsedRow = Record<string, string | number>

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

  /* score table */
  .ann-score-header { display: flex; align-items: center; gap: 8px; margin: 12px 0 8px; }
  .ann-score-count  { font-size: 12px; font-weight: 700; color: var(--outline); background: var(--surface-highest); padding: 2px 10px; border-radius: 999px; }
  .ann-tbl-wrap     { overflow-x: auto; border-radius: var(--r-lg); border: 1px solid var(--outline-variant); margin-bottom: 4px; }
  .ann-tbl          { width: 100%; border-collapse: collapse; font-size: 13px; min-width: 320px; }
  .ann-tbl th       { padding: 10px 14px; font-size: 10px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.08em; color: var(--outline); background: var(--surface-low); border-bottom: 1.5px solid var(--outline-variant); text-align: left; white-space: nowrap; }
  .ann-tbl td       { padding: 11px 14px; border-bottom: 1px solid var(--surface-highest); color: var(--on-surface); vertical-align: middle; }
  .ann-tbl tbody tr:last-child td { border-bottom: none; }
  .ann-tbl tbody tr:hover td      { background: var(--surface-low); }
  .ann-score-num    { font-weight: 700; color: var(--primary); }
  .ann-grade-badge  {
    display: inline-block; padding: 2px 9px; border-radius: 999px;
    font-size: 11px; font-weight: 800; letter-spacing: 0.04em;
  }

  /* show-more rows */
  .ann-show-more { font-size: 12px; font-weight: 600; color: var(--primary); background: none; border: none; cursor: pointer; font-family: var(--font); padding: 6px 0 10px; display: block; }

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
    .ann-tbl th, .ann-tbl td { padding: 9px 10px; font-size: 12px; }
    .pill-label { display: none; }
    .pill-icon  { display: inline; font-size: 16px; }
    .ann-pill   { padding: 7px 12px; }
  }
`

/* ─── Grade colour helper ─────────────────────────────────────────────── */
function gradeColor(val: number, max: number): { bg: string; color: string } {
  const pct = max > 0 ? val / max : 0
  if (pct >= 0.8) return { bg: 'rgba(5,150,105,0.1)', color: '#059669' }
  if (pct >= 0.6) return { bg: 'rgba(217,119,6,0.08)', color: '#d97706' }
  return { bg: 'rgba(220,38,38,0.08)', color: '#dc2626' }
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

/* ─── detect max per numeric col ────────────────────────────────────── */
function getMaxPerCol(rows: ParsedRow[], numCols: Set<string>): Record<string, number> {
  const m: Record<string, number> = {}
  for (const k of numCols) {
    m[k] = Math.max(...rows.map(r => Number(r[k] ?? 0)))
  }
  return m
}

const SCORE_TABLE_PREVIEW = 5

/* ─── ScoreTable component ───────────────────────────────────────────── */
function ScoreTable({ rows }: { rows: ParsedRow[] }) {
  const [showAll, setShowAll] = useState(false)
  if (!rows.length) return null

  const cols = Object.keys(rows[0])
  const numCols = getNumericCols(rows)
  const maxPer = getMaxPerCol(rows, numCols)
  const displayed = showAll ? rows : rows.slice(0, SCORE_TABLE_PREVIEW)

  return (
    <div>
      <div className="ann-score-header">
        <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--on-surface)' }}>ตารางคะแนน</span>
        <span className="ann-score-count">{rows.length} รายการ</span>
      </div>
      <div className="ann-tbl-wrap">
        <table className="ann-tbl">
          <thead>
            <tr>{cols.map(c => <th key={c}>{c}</th>)}</tr>
          </thead>
          <tbody>
            {displayed.map((row, i) => (
              <tr key={i}>
                {cols.map(c => {
                  const val = row[c]
                  const isNum = numCols.has(c) && val !== '' && val !== null && val !== undefined
                  if (isNum) {
                    const n = Number(val)
                    const gc = gradeColor(n, maxPer[c] ?? 100)
                    return (
                      <td key={c}>
                        <span className="ann-grade-badge" style={{ background: gc.bg, color: gc.color }}>{n}</span>
                      </td>
                    )
                  }
                  return <td key={c}>{String(val ?? '')}</td>
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {rows.length > SCORE_TABLE_PREVIEW && (
        <button className="ann-show-more" onClick={() => setShowAll(p => !p)}>
          {showAll ? `▲ ย่อ (แสดง ${SCORE_TABLE_PREVIEW} แถว)` : `▼ ดูทั้งหมด ${rows.length} รายการ`}
        </button>
      )}
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

  // Sort: pinned (is_important) first
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
        {/* Header */}
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
          {/* Thumbnail for image type */}
          {a.type === 'image' && a.image_url && (
            <img src={a.image_url} alt="" className="ann-card-thumb" />
          )}
          {/* 3-dot menu */}
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

        {/* Body */}
        <div className="ann-card-body">
          {a.content && (
            <p className="ann-card-text">{a.content}</p>
          )}
          {a.type === 'image' && a.image_url && (
            <img src={a.image_url} alt={a.title} className="ann-card-img" />
          )}
          {a.type === 'scores' && rows.length > 0 && (
            <ScoreTable rows={rows} />
          )}
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

      {/* Page header */}
      <div style={{ marginBottom: 20 }}>
        <h1 className="ann-page-title">ประกาศ</h1>
        <p className="ann-page-sub">แสดงทั้งหมด {list.length} ประกาศ</p>
      </div>

      {/* Toolbar */}
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

      {/* Main layout */}
      <div className="ann-layout">

        {/* ── Left: Feed ── */}
        <div>
          {/* Featured hero (first pinned item) */}
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

        {/* ── Right: Sidebar (desktop) ── */}
        <aside className="ann-sidebar">
          {/* Stat card */}
          <div className="ann-stat-card" style={{ marginBottom: 16 }}>
            <div className="ann-stat-bg">📣</div>
            <div className="ann-stat-label">ประกาศทั้งหมด</div>
            <div className="ann-stat-count">{list.length}</div>
            <div className="ann-stat-sub">{list.filter(a => a.is_important).length} ปักหมุด · {list.filter(a => a.type === 'scores').length} ตารางคะแนน</div>
          </div>

          {/* Recent list */}
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

          {/* Type picker */}
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
              {/* Preview */}
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