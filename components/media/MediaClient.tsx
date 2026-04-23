'use client'
import { useState } from 'react'
import { BookOpen, Video, Plus, X, Tag, Play, Search, ChevronRight, FileText, ExternalLink, ArrowLeft, ArrowRight, Pin, PinOff } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import toast from 'react-hot-toast'
import { createPortal } from 'react-dom'

interface MediaItem {
  id: string
  type: 'knowledge' | 'video' | 'pdf' | 'drive'
  title: string
  description: string | null
  content: string | null
  video_url: string | null
  duration: string | null
  tags: string[]
  file_url?: string | null
  drive_url?: string | null
  is_pinned?: boolean
}

function toEmbedUrl(url: string | null): string | null {
  if (!url) return null
  const m1 = url.match(/youtube\.com\/watch\?(?:.*&)?v=([\w-]+)/)
  if (m1) return `https://www.youtube.com/embed/${m1[1]}`
  const m2 = url.match(/youtu\.be\/([\w-]+)/)
  if (m2) return `https://www.youtube.com/embed/${m2[1]}`
  return url
}

function getYouTubeThumbnail(url: string | null): string | null {
  if (!url) return null
  const m1 = url.match(/youtube\.com\/watch\?(?:.*&)?v=([\w-]+)/)
  if (m1) return `https://img.youtube.com/vi/${m1[1]}/hqdefault.jpg`
  const m2 = url.match(/youtu\.be\/([\w-]+)/)
  if (m2) return `https://img.youtube.com/vi/${m2[1]}/hqdefault.jpg`
  return null
}

function getDriveThumbnail(url: string | null): string | null {
  if (!url) return null
  const m1 = url.match(/drive\.google\.com\/file\/d\/([\w-]+)/)
  if (m1) return `https://drive.google.com/thumbnail?id=${m1[1]}&sz=w400`
  const m2 = url.match(/[?&]id=([\w-]+)/)
  if (m2) return `https://drive.google.com/thumbnail?id=${m2[1]}&sz=w400`
  return null
}

function toDriveEmbedUrl(url: string | null): string | null {
  if (!url) return null
  const m1 = url.match(/drive\.google\.com\/file\/d\/([\w-]+)/)
  if (m1) return `https://drive.google.com/file/d/${m1[1]}/preview`
  const m2 = url.match(/[?&]id=([\w-]+)/)
  if (m2) return `https://drive.google.com/file/d/${m2[1]}/preview`
  return url
}

const TAG_ICONS: Record<string, string> = {
  Grammar: '📖', Vocabulary: '📝', Reading: '📚', Writing: '✏️',
  Listening: '🎧', Speaking: '🗣️', Literature: '📜', Pronunciation: '🔊',
}

const TAG_COLORS: Record<string, { bg: string; color: string }> = {
  Grammar:      { bg: 'rgba(0,80,203,0.08)',  color: '#0050cb' },
  Vocabulary:   { bg: 'rgba(67,69,209,0.08)', color: '#4345d1' },
  Reading:      { bg: 'rgba(0,104,119,0.08)', color: '#006877' },
  Writing:      { bg: 'rgba(124,82,0,0.08)',  color: '#7c5200' },
  Listening:    { bg: 'rgba(5,150,105,0.08)', color: '#059669' },
  Speaking:     { bg: 'rgba(220,38,38,0.08)', color: '#dc2626' },
  Literature:   { bg: 'rgba(139,92,246,0.08)',color: '#7c3aed' },
  Pronunciation:{ bg: 'rgba(217,119,6,0.08)', color: '#d97706' },
}

const CSS = `
  /* ── Page layout ── */
  .mc-page { max-width: 1100px; margin: 0 auto; }

  /* ── Page header ── */
  .mc-page-header { margin-bottom: 28px; }
  .mc-page-label {
    font-size: 11px; font-weight: 800; letter-spacing: 0.12em;
    text-transform: uppercase; color: var(--secondary);
    display: flex; align-items: center; gap: 6px; margin-bottom: 6px;
  }
  .mc-page-label::before {
    content: ''; width: 6px; height: 6px; border-radius: 50%;
    background: var(--secondary); display: inline-block;
  }
  .mc-page-title {
    font-size: 48px; font-weight: 900; letter-spacing: -0.04em;
    color: var(--on-surface); line-height: 1.05; margin-bottom: 10px;
  }
  .mc-page-desc { font-size: 14px; color: var(--outline); line-height: 1.7; max-width: 520px; }

  /* ── Top toolbar ── */
  .mc-toolbar {
    display: flex; align-items: center; gap: 10px;
    margin-bottom: 28px; flex-wrap: wrap;
  }
  .mc-search-wrap { position: relative; flex: 1; min-width: 160px; max-width: 380px; }
  .mc-search-icon {
    position: absolute; left: 14px; top: 50%;
    transform: translateY(-50%); color: var(--outline); pointer-events: none;
  }
  .mc-search {
    width: 100%; padding: 10px 16px 10px 40px;
    border: 1.5px solid var(--outline-variant);
    border-radius: 999px; font-size: 13px; font-family: var(--font);
    background: var(--surface-lowest); color: var(--text); outline: none;
    transition: all 0.2s;
  }
  .mc-search:focus { border-color: var(--primary); box-shadow: 0 0 0 3px rgba(0,80,203,0.1); }

  /* ── Filter pills ── */
  .mc-pills {
    display: flex; gap: 8px; overflow-x: auto;
    padding-bottom: 2px; -webkit-overflow-scrolling: touch;
    scrollbar-width: none;
  }
  .mc-pills::-webkit-scrollbar { display: none; }
  .mc-pill {
    padding: 7px 18px; border-radius: 999px; font-size: 13px;
    font-weight: 600; cursor: pointer; border: none; font-family: var(--font);
    white-space: nowrap; transition: all 0.18s;
    background: var(--surface-highest); color: var(--outline);
  }
  .mc-pill:hover { background: var(--surface-high); color: var(--text); }
  .mc-pill.active {
    background: linear-gradient(135deg, var(--primary), var(--primary-container));
    color: white; box-shadow: 0 6px 16px rgba(0,80,203,0.2);
  }

  /* ── Section heading ── */
  .mc-section-row {
    display: flex; align-items: center; justify-content: space-between;
    margin-bottom: 20px; flex-wrap: wrap; gap: 8px;
  }
  .mc-section-title { font-size: 22px; font-weight: 800; color: var(--on-surface); letter-spacing: -0.02em; }
  .mc-see-all {
    font-size: 13px; color: var(--primary); font-weight: 700;
    cursor: pointer; display: flex; align-items: center; gap: 4px;
    background: none; border: none; font-family: var(--font);
    padding: 4px 8px; border-radius: 8px; transition: background 0.15s;
  }
  .mc-see-all:hover { background: rgba(0,80,203,0.07); }

  /* ── Desktop 2-column layout ── */
  .mc-two-col {
    display: grid;
    grid-template-columns: 1fr 1.6fr;
    gap: 36px;
    align-items: start;
  }

  /* ── Knowledge card (left column) ── */
  .mc-k-card {
    background: var(--surface-lowest);
    border-radius: var(--r-2xl);
    padding: 22px;
    box-shadow: var(--shadow);
    cursor: pointer;
    transition: all 0.22s ease;
    border: 1.5px solid transparent;
    margin-bottom: 14px;
  }
  .mc-k-card:hover {
    box-shadow: var(--shadow-md);
    transform: translateY(-2px);
    border-color: rgba(0,80,203,0.1);
  }
  .mc-k-card-top {
    display: flex; align-items: flex-start;
    justify-content: space-between; gap: 10px; margin-bottom: 12px;
  }
  .mc-k-icon {
    width: 46px; height: 46px; border-radius: 14px;
    display: flex; align-items: center; justify-content: center; font-size: 22px;
    background: linear-gradient(135deg, #EFF6FF, #DBEAFE); flex-shrink: 0;
  }
  .mc-tag-pill {
    font-size: 10px; font-weight: 800; letter-spacing: 0.08em;
    text-transform: uppercase; padding: 3px 10px; border-radius: 999px;
    border: none; font-family: var(--font);
  }
  .mc-k-title { font-size: 15px; font-weight: 700; color: var(--on-surface); line-height: 1.4; margin-bottom: 6px; }
  .mc-k-desc  { font-size: 12px; color: var(--outline); line-height: 1.6; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
  .mc-k-meta  { display: flex; align-items: center; gap: 14px; margin-top: 12px; }
  .mc-k-meta-item { display: flex; align-items: center; gap: 5px; font-size: 12px; color: var(--outline); font-weight: 500; }
  .mc-read-more { display: flex; align-items: center; gap: 4px; font-size: 12px; font-weight: 700; color: var(--primary); margin-top: 12px; }

  /* ── Featured video (right top) ── */
  .mc-featured-video {
    border-radius: var(--r-2xl);
    overflow: hidden;
    box-shadow: var(--shadow-md);
    cursor: pointer;
    transition: all 0.22s;
    background: var(--surface-lowest);
    margin-bottom: 20px;
  }
  .mc-featured-video:hover { transform: translateY(-2px); box-shadow: var(--shadow-lg); }
  .mc-featured-thumb {
    position: relative; width: 100%; padding-bottom: 52%;
    background: linear-gradient(135deg, #0f172a, #1e293b);
    overflow: hidden;
  }
  .mc-featured-thumb img { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; }
  .mc-featured-overlay {
    position: absolute; inset: 0;
    background: linear-gradient(to top, rgba(0,0,0,0.7) 0%, rgba(0,0,0,0.1) 50%, transparent 100%);
  }
  .mc-featured-play {
    position: absolute; top: 50%; left: 50%; transform: translate(-50%,-50%);
    width: 60px; height: 60px; border-radius: 50%;
    background: rgba(255,255,255,0.2); backdrop-filter: blur(8px);
    display: flex; align-items: center; justify-content: center;
    transition: transform 0.2s, background 0.2s;
  }
  .mc-featured-video:hover .mc-featured-play { transform: translate(-50%,-50%) scale(1.1); background: rgba(255,255,255,0.3); }
  .mc-featured-duration {
    position: absolute; bottom: 12px; right: 12px;
    background: rgba(0,0,0,0.7); color: white; font-size: 12px;
    font-weight: 700; padding: 3px 8px; border-radius: 6px;
  }
  .mc-featured-body { padding: 18px 20px; }
  .mc-featured-label { font-size: 10px; font-weight: 800; letter-spacing: 0.1em; text-transform: uppercase; color: var(--secondary); margin-bottom: 6px; }
  .mc-featured-title { font-size: 18px; font-weight: 800; color: var(--on-surface); line-height: 1.35; margin-bottom: 6px; letter-spacing: -0.02em; }
  .mc-featured-desc  { font-size: 13px; color: var(--outline); line-height: 1.6; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }

  /* ── Small video grid ── */
  .mc-video-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
  .mc-video-card {
    background: var(--surface-lowest);
    border-radius: var(--r-xl);
    overflow: hidden;
    cursor: pointer;
    transition: all 0.2s ease;
    box-shadow: var(--shadow);
  }
  .mc-video-card:hover { transform: translateY(-2px); box-shadow: var(--shadow-md); }
  .mc-video-thumb {
    position: relative; width: 100%; padding-bottom: 56%;
    background: #0f172a; overflow: hidden;
  }
  .mc-video-thumb img { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; }
  .mc-video-play-sm {
    position: absolute; top: 50%; left: 50%; transform: translate(-50%,-50%);
    width: 36px; height: 36px; border-radius: 50%;
    background: rgba(255,255,255,0.25); backdrop-filter: blur(6px);
    display: flex; align-items: center; justify-content: center;
    transition: transform 0.18s;
  }
  .mc-video-card:hover .mc-video-play-sm { transform: translate(-50%,-50%) scale(1.12); }
  .mc-video-duration-sm {
    position: absolute; bottom: 6px; right: 6px;
    background: rgba(0,0,0,0.65); color: white;
    font-size: 10px; font-weight: 700; padding: 2px 6px; border-radius: 4px;
  }
  .mc-video-body { padding: 10px 12px; }
  .mc-video-title { font-size: 12px; font-weight: 700; color: var(--on-surface); line-height: 1.4; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
  .mc-video-desc  { font-size: 11px; color: var(--outline); margin-top: 3px; display: -webkit-box; -webkit-line-clamp: 1; -webkit-box-orient: vertical; overflow: hidden; }

  /* ── Nav arrows ── */
  .mc-nav-arrow {
    width: 36px; height: 36px; border-radius: 50%; border: 1.5px solid var(--outline-variant);
    background: var(--surface-lowest); cursor: pointer; display: flex; align-items: center;
    justify-content: center; color: var(--outline); transition: all 0.18s;
    box-shadow: var(--shadow-xs);
  }
  .mc-nav-arrow:hover { background: var(--primary); border-color: var(--primary); color: white; }

  /* ── Pin badge ── */
  .mc-pin-badge {
    display: inline-flex; align-items: center; gap: 4px;
    font-size: 9px; font-weight: 800; letter-spacing: 0.08em; text-transform: uppercase;
    background: rgba(220,38,38,0.08); color: #dc2626;
    padding: 2px 8px; border-radius: 999px; margin-bottom: 6px;
  }

  /* ── Mobile: full-width single column ── */
  @media (max-width: 767px) {
    .mc-page-title { font-size: 32px; }
    .mc-page-desc  { font-size: 13px; }
    .mc-two-col    { grid-template-columns: 1fr; gap: 0; }
    .mc-video-grid { grid-template-columns: 1fr; }
    .mc-k-card     { margin-bottom: 12px; }
    .mc-featured-body { padding: 14px 16px; }
    .mc-featured-title { font-size: 16px; }
  }
  @media (max-width: 480px) {
    .mc-page-title { font-size: 28px; }
    .mc-video-grid { grid-template-columns: 1fr 1fr; }
  }
`

export default function MediaClient({
  knowledge: kInit, videos: vInit, isAdmin,
}: {
  knowledge: MediaItem[]; videos: MediaItem[]; isAdmin: boolean
}) {
  const [tab, setTab] = useState<'all' | 'knowledge' | 'video'>('all')
  const [knowledge, setKnowledge] = useState(kInit)
  const [videos, setVideos] = useState(vInit)
  const [selected, setSelected] = useState<MediaItem | null>(null)
  const [addModal, setAddModal] = useState<'knowledge' | 'video' | null>(null)
  const [search, setSearch] = useState('')
  const [featuredIdx, setFeaturedIdx] = useState(0)
  const supabase = createClient()

  // Sort pinned items to top
  const sortedK = [...knowledge].sort((a, b) => (b.is_pinned ? 1 : 0) - (a.is_pinned ? 1 : 0))
  const sortedV = [...videos].sort((a, b) => (b.is_pinned ? 1 : 0) - (a.is_pinned ? 1 : 0))

  const filteredK = sortedK.filter(k =>
    !search || k.title.toLowerCase().includes(search.toLowerCase()) ||
    k.tags?.some(t => t.toLowerCase().includes(search.toLowerCase()))
  )
  const filteredV = sortedV.filter(v =>
    !search || v.title.toLowerCase().includes(search.toLowerCase())
  )

  const featuredVideo = filteredV[featuredIdx] ?? null
  const gridVideos = filteredV.filter((_, i) => i !== featuredIdx).slice(0, 4)

  async function togglePin(item: MediaItem) {
    const newVal = !item.is_pinned
    await supabase.from('media_items').update({ is_pinned: newVal }).eq('id', item.id)
    if (item.type === 'knowledge') setKnowledge(p => p.map(k => k.id === item.id ? { ...k, is_pinned: newVal } : k))
    else setVideos(p => p.map(v => v.id === item.id ? { ...v, is_pinned: newVal } : v))
    toast.success(newVal ? '📌 ปักหมุดแล้ว' : 'ยกเลิกการปักหมุด')
  }

  async function handleDelete(item: MediaItem) {
    if (!confirm('ยืนยันการลบ?')) return
    await supabase.from('media_items').delete().eq('id', item.id)
    if (item.type === 'knowledge') setKnowledge(p => p.filter(k => k.id !== item.id))
    else setVideos(p => p.filter(v => v.id !== item.id))
    toast.success('ลบแล้ว')
  }

  async function handleAdd(form: Partial<MediaItem>) {
    const sb = createClient()
    const dataToInsert = form.type ? form : { ...form, type: addModal }
    const { data, error } = await sb.from('media_items').insert(dataToInsert).select().single()
    if (error || !data) {
      toast.error(`เพิ่มไม่สำเร็จ: ${error?.message || 'ข้อผิดพลาดที่ไม่รู้จัก'}`)
      return
    }
    if (addModal === 'knowledge') setKnowledge(p => [...p, { ...form, type: addModal, id: data.id } as MediaItem])
    else setVideos(p => [...p, { ...form, type: addModal, id: data.id } as MediaItem])
    toast.success('เพิ่มสำเร็จ ✓')
    setAddModal(null)
  }

  // Helper: get thumbnail for any media type
  function getThumb(v: MediaItem): string | null {
    if (v.type === 'video') return getYouTubeThumbnail(v.video_url)
    if (v.type === 'drive') return getDriveThumbnail(v.drive_url ?? null)
    return null
  }

  // Helper: type badge color
  const TYPE_BADGE: Record<string, { label: string; bg: string; color: string }> = {
    video:     { label: 'VIDEO',     bg: 'rgba(5,150,105,0.1)',  color: '#059669' },
    pdf:       { label: 'PDF',       bg: 'rgba(220,38,38,0.08)', color: '#dc2626' },
    drive:     { label: 'DRIVE',     bg: 'rgba(217,119,6,0.08)', color: '#d97706' },
    knowledge: { label: 'ARTICLE',   bg: 'rgba(0,80,203,0.08)',  color: '#0050cb' },
  }

  // ── Knowledge section ──
  const KnowledgeSection = () => (
    <div>
      <div className="mc-section-row">
        <span className="mc-section-title">สรุปเนื้อหาสำคัญ</span>
        {isAdmin && (
          <button className="btn btn-primary btn-sm" onClick={() => setAddModal('knowledge')}>
            <Plus size={13} /> เพิ่มบทความ
          </button>
        )}
      </div>

      {filteredK.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '48px 0', color: 'var(--outline)' }}>
          <BookOpen size={36} style={{ margin: '0 auto 10px', opacity: 0.3 }} />
          <p style={{ fontSize: 14 }}>ยังไม่มีเนื้อหา</p>
        </div>
      ) : (
        <div>
          {filteredK.map(k => {
            const mainTag = k.tags?.find(t => TAG_COLORS[t]) ?? k.tags?.[0]
            const tagStyle = mainTag ? TAG_COLORS[mainTag] : { bg: 'rgba(0,80,203,0.08)', color: '#0050cb' }
            const icon = k.tags?.find(t => TAG_ICONS[t]) ? TAG_ICONS[k.tags.find(t => TAG_ICONS[t])!] : '📄'
            return (
              <div key={k.id} className="mc-k-card fade-up" onClick={() => setSelected(k)}>
                {k.is_pinned && <div className="mc-pin-badge"><Pin size={9} />ปักหมุด</div>}
                <div className="mc-k-card-top">
                  <div className="mc-k-icon">{icon}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    {mainTag && (
                      <span className="mc-tag-pill" style={{ background: tagStyle.bg, color: tagStyle.color, marginBottom: 6, display: 'inline-block' }}>
                        {mainTag}
                      </span>
                    )}
                    <h3 className="mc-k-title">{k.title}</h3>
                    {k.description && <p className="mc-k-desc">{k.description}</p>}
                  </div>
                  {isAdmin && (
                    <div style={{ display:'flex', gap:4, flexShrink:0 }}>
                      <button
                        className="btn btn-sm btn-ghost"
                        title={k.is_pinned ? 'ยกเลิกปักหมุด' : 'ปักหมุด'}
                        onClick={e => { e.stopPropagation(); togglePin(k) }}
                        style={{ color: k.is_pinned ? 'var(--primary)' : 'var(--outline)' }}
                      >
                        {k.is_pinned ? <PinOff size={13} /> : <Pin size={13} />}
                      </button>
                      <button className="btn btn-sm btn-danger" onClick={e => { e.stopPropagation(); handleDelete(k) }}>ลบ</button>
                    </div>
                  )}
                </div>
                {k.tags && k.tags.length > 0 && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginTop: 4 }}>
                    {k.tags.slice(0, 3).map(t => (
                      <span key={t} className="mc-tag-pill" style={{ background: (TAG_COLORS[t]?.bg ?? 'rgba(0,80,203,0.07)'), color: (TAG_COLORS[t]?.color ?? '#0050cb') }}>
                        {t}
                      </span>
                    ))}
                  </div>
                )}
                <div className="mc-read-more">อ่านเพิ่มเติม <ChevronRight size={13} /></div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )

  // ── Video section ──
  const VideoSection = () => (
    <div>
      {/* Section heading + arrows */}
      <div className="mc-section-row">
        <span className="mc-section-title">วิดีโอล่าสุด</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {isAdmin && (
            <button className="btn btn-primary btn-sm" onClick={() => setAddModal('video')}>
              <Plus size={13} /> เพิ่มสื่อ
            </button>
          )}
          <button className="mc-nav-arrow" onClick={() => setFeaturedIdx(i => Math.max(0, i - 1))} disabled={featuredIdx === 0}>
            <ArrowLeft size={16} />
          </button>
          <button className="mc-nav-arrow" onClick={() => setFeaturedIdx(i => Math.min(filteredV.length - 1, i + 1))} disabled={featuredIdx >= filteredV.length - 1}>
            <ArrowRight size={16} />
          </button>
        </div>
      </div>

      {filteredV.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '48px 0', color: 'var(--outline)' }}>
          <Video size={36} style={{ margin: '0 auto 10px', opacity: 0.3 }} />
          <p style={{ fontSize: 14 }}>ยังไม่มีสื่อการสอน</p>
        </div>
      ) : (
        <>
          {/* Featured video */}
          {featuredVideo && (
            <div className="mc-featured-video fade-up" onClick={() => setSelected(featuredVideo)}>
              <div className="mc-featured-thumb">
                {getThumb(featuredVideo) && (
                  <img src={getThumb(featuredVideo)!} alt={featuredVideo.title}
                    onError={e => { (e.target as HTMLImageElement).style.display = 'none' }} />
                )}
                <div className="mc-featured-overlay" />
                <div className="mc-featured-play">
                  {featuredVideo.type === 'pdf'
                    ? <FileText size={24} color="white" />
                    : <Play size={26} color="white" fill="white" />}
                </div>
                {featuredVideo.duration && (
                  <span className="mc-featured-duration">{featuredVideo.duration}</span>
                )}
                {/* Type badge */}
                {(() => { const tb = TYPE_BADGE[featuredVideo.type]; return (
                  <span style={{ position:'absolute', top:12, left:12, fontSize:10, fontWeight:800, letterSpacing:'0.08em', padding:'3px 9px', borderRadius:999, background:'rgba(255,255,255,0.15)', backdropFilter:'blur(6px)', color:'white' }}>
                    {tb?.label}
                  </span>
                )})()}
                {isAdmin && (
                  <div style={{ position:'absolute', top:10, right:10, zIndex:2, display:'flex', gap:4 }}>
                    <button
                      className="btn btn-sm"
                      style={{ background:'rgba(255,255,255,0.2)', backdropFilter:'blur(6px)', color:'white', padding:'4px 8px' }}
                      onClick={e => { e.stopPropagation(); togglePin(featuredVideo) }}
                      title={featuredVideo.is_pinned ? 'ยกเลิกปักหมุด' : 'ปักหมุด'}
                    >
                      {featuredVideo.is_pinned ? <PinOff size={13} /> : <Pin size={13} />}
                    </button>
                    <button className="btn btn-sm btn-danger" onClick={e => { e.stopPropagation(); handleDelete(featuredVideo) }}>ลบ</button>
                  </div>
                )}
              </div>
              <div className="mc-featured-body">
                <p className="mc-featured-label">
                  {featuredVideo.type === 'video' ? 'LIVE RECORDING' : featuredVideo.type === 'pdf' ? 'PDF DOCUMENT' : 'GOOGLE DRIVE'}
                </p>
                <h3 className="mc-featured-title">{featuredVideo.title}</h3>
                {featuredVideo.description && (
                  <p className="mc-featured-desc">{featuredVideo.description}</p>
                )}
              </div>
            </div>
          )}

          {/* Grid of other videos */}
          {gridVideos.length > 0 && (
            <div className="mc-video-grid">
              {gridVideos.map(v => (
                <div key={v.id} className="mc-video-card fade-up" onClick={() => setSelected(v)}>
                  <div className="mc-video-thumb">
                    {getThumb(v) ? (
                      <img src={getThumb(v)!} alt={v.title} onError={e => { (e.target as HTMLImageElement).style.display = 'none' }} />
                    ) : (
                      <div style={{ position:'absolute', inset:0, background:'linear-gradient(135deg,#1e293b,#334155)', display:'flex', alignItems:'center', justifyContent:'center' }}>
                        {v.type === 'pdf' ? <FileText size={28} color="rgba(255,255,255,0.4)" /> : <Play size={28} color="rgba(255,255,255,0.4)" />}
                      </div>
                    )}
                    <div className="mc-video-play-sm">
                      {v.type === 'pdf' ? <FileText size={16} color="white" /> : <Play size={16} color="white" fill="white" />}
                    </div>
                    {v.duration && <span className="mc-video-duration-sm">{v.duration}</span>}
                    {v.is_pinned && (
                      <span style={{ position:'absolute', top:6, left:6, background:'rgba(220,38,38,0.85)', color:'white', fontSize:9, fontWeight:800, padding:'2px 7px', borderRadius:999, letterSpacing:'0.06em' }}>📌 PIN</span>
                    )}
                    {isAdmin && (
                      <div style={{ position:'absolute', top:6, right:6, zIndex:2, display:'flex', gap:3 }}>
                        <button
                          className="btn btn-sm"
                          style={{ background:'rgba(0,0,0,0.5)', color:'white', padding:'3px 7px', fontSize:10 }}
                          onClick={e => { e.stopPropagation(); togglePin(v) }}
                        >
                          {v.is_pinned ? <PinOff size={11} /> : <Pin size={11} />}
                        </button>
                        <button className="btn btn-sm btn-danger" style={{ fontSize:10, padding:'3px 8px' }} onClick={e => { e.stopPropagation(); handleDelete(v) }}>ลบ</button>
                      </div>
                    )}
                  </div>
                  <div className="mc-video-body">
                    <h4 className="mc-video-title">{v.title}</h4>
                    {v.description && <p className="mc-video-desc">{v.description}</p>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )

  return (
    <div className="mc-page">
      <style>{CSS}</style>

      {/* ── Page Header ── */}
      <div className="mc-page-header fade-up">
        <p className="mc-page-label">Resource Center</p>
        <h1 className="mc-page-title">สื่อการเรียนรู้</h1>
        <p className="mc-page-desc">
          คลังบทความ วิดีโอ และสื่อการสอนภาษาอังกฤษ ครบครัน พร้อมใช้งาน
        </p>
      </div>

      {/* ── Toolbar: Search + Filter pills ── */}
      <div className="mc-toolbar">
        <div className="mc-search-wrap">
          <Search size={15} className="mc-search-icon" />
          <input
            className="mc-search"
            placeholder="ค้นหาหัวข้อ, แท็ก..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <div className="mc-pills">
          <button className={`mc-pill ${tab === 'all' ? 'active' : ''}`} onClick={() => { setTab('all'); setSearch('') }}>ทั้งหมด</button>
          <button className={`mc-pill ${tab === 'knowledge' ? 'active' : ''}`} onClick={() => { setTab('knowledge'); setSearch('') }}>
            <BookOpen size={12} style={{ display:'inline', marginRight:5, verticalAlign:'middle' }} />คลังความรู้
          </button>
          <button className={`mc-pill ${tab === 'video' ? 'active' : ''}`} onClick={() => { setTab('video'); setSearch('') }}>
            <Video size={12} style={{ display:'inline', marginRight:5, verticalAlign:'middle' }} />สื่อการสอน
          </button>
        </div>
      </div>

      {/* ── Main Content ── */}
      {(tab === 'all' || tab === 'knowledge' || tab === 'video') && (
        <div className={tab === 'all' ? 'mc-two-col' : ''}>

          {/* Left: Knowledge */}
          {(tab === 'all' || tab === 'knowledge') && <KnowledgeSection />}

          {/* Right: Videos */}
          {(tab === 'all' || tab === 'video') && <VideoSection />}

        </div>
      )}

      {selected && createPortal(
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setSelected(null)}>
          <div className="modal" style={{ maxWidth: 680 }}>
            <div className="modal-header">
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--secondary)', marginBottom: 4 }}>
                  {selected.type === 'video' ? 'VIDEO' : selected.type === 'pdf' ? 'PDF' : selected.type === 'drive' ? 'DRIVE' : 'ARTICLE'}
                </div>
                <h3 style={{ fontWeight: 800, fontSize: 17, lineHeight: 1.3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{selected.title}</h3>
              </div>
              <button className="btn btn-icon btn-ghost" style={{ marginLeft: 8, flexShrink: 0 }} onClick={() => setSelected(null)}><X size={16} /></button>
            </div>
            <div className="modal-body">

              {/* Video embed */}
              {selected.type === 'video' && (
                <div style={{ borderRadius: 'var(--r-lg)', overflow: 'hidden', marginBottom: 16, background: '#000', aspectRatio: '16/9', position: 'relative' }}>
                  {selected.video_url
                    ? <iframe src={toEmbedUrl(selected.video_url) ?? undefined} style={{ position:'absolute', top:0, left:0, width:'100%', height:'100%', border:'none' }} allowFullScreen title={selected.title} />
                    : <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', height:'100%', position:'absolute', inset:0 }}>
                        <Play size={40} color="rgba(255,255,255,0.4)" />
                        <p style={{ fontSize:12, color:'rgba(255,255,255,0.4)', marginTop:8 }}>ยังไม่มี URL วีดีโอ</p>
                      </div>}
                </div>
              )}

              {/* PDF embed */}
              {selected.type === 'pdf' && (
                <div style={{ marginBottom: 16, borderRadius: 'var(--r-lg)', overflow: 'hidden', border: '1px solid var(--border)', height: 440 }}>
                  {selected.file_url
                    ? <iframe src={selected.file_url} style={{ width:'100%', height:'100%', border:'none' }} title={selected.title} />
                    : <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', height:'100%', background:'var(--surface-low)' }}>
                        <FileText size={40} color="var(--outline)" />
                        <p style={{ fontSize:13, color:'var(--outline)', marginTop:8 }}>ยังไม่มีไฟล์ PDF</p>
                      </div>}
                </div>
              )}

              {/* Drive embed */}
              {selected.type === 'drive' && (
                <div style={{ marginBottom: 16, borderRadius: 'var(--r-lg)', overflow: 'hidden', border: '1px solid var(--border)', height: 440 }}>
                  {selected.drive_url
                    ? <iframe src={toDriveEmbedUrl(selected.drive_url) ?? undefined} style={{ width:'100%', height:'100%', border:'none' }} title={selected.title} allowFullScreen />
                    : <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', height:'100%', background:'var(--surface-low)' }}>
                        <ExternalLink size={40} color="var(--outline)" />
                        <p style={{ fontSize:13, color:'var(--outline)', marginTop:8 }}>ยังไม่มีลิงก์ Drive</p>
                      </div>}
                </div>
              )}

              {/* Knowledge content */}
              {selected.type === 'knowledge' && selected.content && (
                <div style={{ background: 'var(--surface-low)', borderRadius: 'var(--r-lg)', padding: '18px 20px', marginBottom: 16, maxHeight: 320, overflowY: 'auto' }}>
                  <p style={{ fontSize: 14, lineHeight: 1.9, color: 'var(--text)', whiteSpace: 'pre-wrap' }}>{selected.content}</p>
                </div>
              )}

              {/* Description */}
              {selected.description && (
                <p style={{ fontSize: 13, color: 'var(--outline)', lineHeight: 1.7, marginBottom: 12 }}>{selected.description}</p>
              )}

              {/* Tags */}
              {selected.tags && selected.tags.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {selected.tags.map(t => (
                    <span key={t} className="mc-tag-pill" style={{ background: TAG_COLORS[t]?.bg ?? 'rgba(0,80,203,0.08)', color: TAG_COLORS[t]?.color ?? '#0050cb' }}>
                      {TAG_ICONS[t] && <span style={{ marginRight: 4 }}>{TAG_ICONS[t]}</span>}{t}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* ── Add Modal ── */}
      {addModal && createPortal(
        <AddModal
          type={addModal}
          onClose={() => setAddModal(null)}
          onSave={handleAdd}
          supabase={supabase}
        />,
        document.body
      )}
    </div>
  )
}

// ─── Add Modal ────────────────────────────────────────────────────────────────
function AddModal({
  type, onClose, onSave, supabase,
}: {
  type: 'knowledge' | 'video'
  onClose: () => void
  onSave: (f: Partial<MediaItem>) => void
  supabase: ReturnType<typeof createClient>
}) {
  const [subType, setSubType] = useState<'video' | 'pdf' | 'drive'>('video')
  const [form, setForm] = useState<Partial<MediaItem>>({ tags: [] })
  const [tagInput, setTagInput] = useState('')
  const [pdfFile, setPdfFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [saving, setSaving] = useState(false)

  async function save() {
    if (!form.title?.trim()) { toast.error('กรุณาใส่ชื่อ'); return }
    setSaving(true)
    let finalForm = { ...form }

    if (type === 'video' && subType === 'pdf' && pdfFile) {
      setUploading(true)
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (!session) { toast.error('ไม่ได้ลงชื่อเข้า'); setSaving(false); setUploading(false); return }
        const ext = pdfFile.name.split('.').pop() ?? 'pdf'
        const path = `pdfs/${Date.now()}.${ext}`
        const { error } = await supabase.storage.from('media').upload(path, pdfFile, { upsert: true })
        if (error) { toast.error(`อัพโหลดไม่สำเร็จ: ${error.message}`); setSaving(false); setUploading(false); return }
        const { data: urlData } = supabase.storage.from('media').getPublicUrl(path)
        finalForm.file_url = urlData.publicUrl
        finalForm.type = 'pdf' as any
      } catch (err) {
        toast.error(`ข้อผิดพลาด: ${err instanceof Error ? err.message : 'ไม่รู้จัก'}`)
        setSaving(false); setUploading(false); return
      }
      setUploading(false)
    } else if (type === 'video' && subType === 'drive') {
      finalForm.type = 'drive' as any
    } else if (type === 'video' && subType === 'video') {
      finalForm.type = 'video' as any
    }

    await onSave(finalForm)
    setSaving(false)
  }

  return createPortal(
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header">
          <h3 style={{ fontWeight: 700 }}>เพิ่ม{type === 'knowledge' ? 'บทความ' : 'สื่อการสอน'}</h3>
          <button className="btn btn-icon btn-ghost" onClick={onClose}><X size={16} /></button>
        </div>
        <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

          {type === 'video' && (
            <div>
              <label className="form-label">ประเภทสื่อ</label>
              <div style={{ display: 'flex', gap: 8 }}>
                {(['video', 'pdf', 'drive'] as const).map(t => (
                  <button key={t} onClick={() => setSubType(t)} className={`btn btn-sm ${subType === t ? 'btn-primary' : ''}`}>
                    {t === 'video' ? '🎬 วีดีโอ' : t === 'pdf' ? '📕 PDF' : '📁 Drive'}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div><label className="form-label">ชื่อหัวข้อ *</label><input className="input" value={form.title ?? ''} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} /></div>
          <div><label className="form-label">คำอธิบาย</label><input className="input" value={form.description ?? ''} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} /></div>

          {type === 'knowledge' && (
            <div><label className="form-label">เนื้อหา</label><textarea className="input" rows={5} style={{ borderRadius: 'var(--r-lg)', resize: 'vertical' }} value={form.content ?? ''} onChange={e => setForm(p => ({ ...p, content: e.target.value }))} /></div>
          )}
          {type === 'video' && subType === 'video' && (
            <>
              <div><label className="form-label">URL วีดีโอ (YouTube)</label><input className="input" placeholder="https://www.youtube.com/watch?v=..." value={form.video_url ?? ''} onChange={e => setForm(p => ({ ...p, video_url: e.target.value }))} /></div>
              <div><label className="form-label">ความยาว</label><input className="input" placeholder="12:34" value={form.duration ?? ''} onChange={e => setForm(p => ({ ...p, duration: e.target.value }))} /></div>
            </>
          )}
          {type === 'video' && subType === 'pdf' && (
            <div>
              <label className="form-label">ไฟล์ PDF</label>
              <label style={{ display:'flex', alignItems:'center', gap:8, border:'1.5px dashed var(--outline-variant)', borderRadius:'var(--r-md)', padding:12, cursor:'pointer', background: pdfFile ? 'var(--error-container)' : '' }}>
                <FileText size={16} color={pdfFile ? 'var(--error)' : 'var(--outline)'} />
                <span style={{ fontSize:13, color: pdfFile ? 'var(--error)' : 'var(--outline)' }}>{pdfFile?.name ?? 'คลิกเลือกไฟล์ PDF...'}</span>
                <input type="file" accept=".pdf" style={{ display:'none' }} onChange={e => setPdfFile(e.target.files?.[0] ?? null)} />
              </label>
            </div>
          )}
          {type === 'video' && subType === 'drive' && (
            <div>
              <label className="form-label">ลิงก์ Google Drive</label>
              <input className="input" placeholder="https://drive.google.com/file/d/..." value={form.drive_url ?? ''} onChange={e => setForm(p => ({ ...p, drive_url: e.target.value }))} />
              <p style={{ fontSize:11, color:'var(--outline)', marginTop:4 }}>💡 ตั้งค่าไฟล์เป็น "ทุกคนที่มีลิงก์" ก่อนวาง URL</p>
            </div>
          )}

          <div>
            <label className="form-label">แท็ก</label>
            <input className="input" value={tagInput} placeholder="พิมพ์แล้วกด Enter"
              onChange={e => setTagInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); if (tagInput.trim()) { setForm(p => ({ ...p, tags: [...(p.tags ?? []), tagInput.trim()] })); setTagInput('') } } }} />
            <div style={{ display:'flex', flexWrap:'wrap', gap:5, marginTop:6 }}>
              {form.tags?.map((t, i) => (
                <span key={i} className="badge badge-blue" style={{ cursor:'pointer' }} onClick={() => setForm(p => ({ ...p, tags: p.tags?.filter((_, j) => j !== i) }))}>
                  {t} ×
                </span>
              ))}
            </div>
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn" onClick={onClose}>ยกเลิก</button>
          <button className="btn btn-primary" onClick={save} disabled={saving || uploading}>
            {saving || uploading ? <><div className="spinner" />บันทึก...</> : 'บันทึก'}
          </button>
        </div>
      </div>
    </div>,
    document.body
  )
}