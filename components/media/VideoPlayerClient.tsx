'use client'
import { useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, Play, ChevronDown, ChevronUp, FileText, ExternalLink, BookOpen, MessageSquare, Clock, Calendar, Pencil, X, Plus } from 'lucide-react'
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
  tags: string[] | null
  file_url?: string | null
  drive_url?: string | null
  sort_order?: number
  created_at?: string
}

/* ── helpers ── */
function toEmbedUrl(url: string): string {
  const m1 = url.match(/youtube\.com\/watch\?(?:.*&)?v=([\w-]+)/)
  if (m1) return `https://www.youtube.com/embed/${m1[1]}?rel=0&modestbranding=1&autoplay=1`
  const m2 = url.match(/youtu\.be\/([\w-]+)/)
  if (m2) return `https://www.youtube.com/embed/${m2[1]}?rel=0&modestbranding=1&autoplay=1`
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
function toDriveEmbed(url: string): string {
  const m = url.match(/drive\.google\.com\/file\/d\/([\w-]+)/)
  if (m) return `https://drive.google.com/file/d/${m[1]}/preview`
  return url
}
function getDriveThumbnail(url: string | null): string | null {
  if (!url) return null
  const m = url.match(/drive\.google\.com\/file\/d\/([\w-]+)/)
  if (m) return `https://drive.google.com/thumbnail?id=${m[1]}&sz=w400`
  return null
}
function getThumb(item: MediaItem): string | null {
  if (item.type === 'video') return getYouTubeThumbnail(item.video_url)
  if (item.type === 'drive') return getDriveThumbnail(item.drive_url)
  return null
}
function linkify(text: string) {
  const urlRegex = /(https?:\/\/[^\s]+)/g
  const parts = text.split(urlRegex)
  return parts.map((part, i) =>
    urlRegex.test(part)
      ? <a key={i} href={part} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--primary)', textDecoration: 'underline', wordBreak: 'break-all' }}>{part}</a>
      : part
  )
}

const CSS = `
  .vp-page { max-width: 1100px; margin: 0 auto; }

  /* layout */
  .vp-layout { display: grid; grid-template-columns: 1fr 320px; gap: 28px; align-items: start; }

  /* player */
  .vp-player-wrap {
    border-radius: var(--r-2xl); overflow: hidden; background: #000;
    position: relative; box-shadow: 0 20px 50px rgba(0,0,0,0.2);
  }
  .vp-iframe { width: 100%; aspect-ratio: 16/9; border: none; display: block; }
  .vp-thumb-wrap { position: relative; width: 100%; aspect-ratio: 16/9; cursor: pointer; }
  .vp-thumb  { width: 100%; height: 100%; object-fit: cover; display: block; }
  .vp-thumb-overlay {
    position: absolute; inset: 0;
    background: linear-gradient(to top, rgba(0,0,0,0.6) 0%, rgba(0,0,0,0.1) 50%, transparent 100%);
    display: flex; align-items: center; justify-content: center;
  }
  .vp-play-btn {
    width: 72px; height: 72px; border-radius: 50%; background: var(--primary);
    color: white; display: flex; align-items: center; justify-content: center;
    box-shadow: 0 8px 30px rgba(0,80,203,0.45); border: none; cursor: pointer;
    transition: transform 0.2s, box-shadow 0.2s;
  }
  .vp-play-btn:hover { transform: scale(1.1); box-shadow: 0 12px 40px rgba(0,80,203,0.55); }
  .vp-seekbar { position: absolute; bottom: 0; left: 0; right: 0; height: 4px; background: rgba(255,255,255,0.2); }
  .vp-seekbar-fill { height: 100%; width: 33%; background: var(--primary); border-radius: 0 2px 2px 0; }

  /* no-thumb player (pdf/drive) */
  .vp-embed { width: 100%; height: 520px; border: none; display: block; border-radius: var(--r-2xl); }

  /* meta */
  .vp-label  { font-size: 11px; font-weight: 800; letter-spacing: 0.12em; text-transform: uppercase; color: var(--primary); margin-bottom: 8px; }
  .vp-title  { font-size: 24px; font-weight: 900; letter-spacing: -0.03em; color: var(--on-surface); line-height: 1.25; margin-bottom: 10px; }
  .vp-stats  { display: flex; align-items: center; gap: 16px; color: var(--outline); font-size: 13px; flex-wrap: wrap; }
  .vp-stat   { display: flex; align-items: center; gap: 5px; }
  .vp-tags   { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 12px; }
  .vp-tag    { padding: 4px 12px; border-radius: 999px; font-size: 11px; font-weight: 700; background: var(--surface-highest); color: var(--primary); }

  /* desc card */
  .vp-desc-card { background: var(--surface-low); border-radius: var(--r-2xl); padding: 20px 22px; margin-top: 20px; position: relative; overflow: hidden; }
  .vp-desc-bg   { position: absolute; top: 10px; right: 14px; font-size: 56px; opacity: 0.08; pointer-events: none; line-height: 1; }
  .vp-desc-title { font-size: 14px; font-weight: 800; color: var(--on-surface); margin-bottom: 8px; }
  .vp-desc-text  { font-size: 13px; color: var(--on-surface-variant); line-height: 1.8; }
  .vp-desc-toggle { font-size: 12px; font-weight: 700; color: var(--primary); background: none; border: none; cursor: pointer; font-family: var(--font); display: flex; align-items: center; gap: 4px; margin-top: 10px; padding: 0; }

  /* tabs */
  .vp-tabs { display: flex; border-bottom: 1.5px solid var(--outline-variant); margin-top: 22px; }
  .vp-tab  { padding: 10px 18px; font-size: 14px; font-weight: 700; cursor: pointer; border: none; background: none; font-family: var(--font); color: var(--outline); border-bottom: 3px solid transparent; margin-bottom: -1.5px; transition: all 0.15s; }
  .vp-tab:hover  { color: var(--on-surface); }
  .vp-tab.active { color: var(--primary); border-bottom-color: var(--primary); }

  /* doc grid */
  .vp-doc-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-top: 16px; }
  .vp-doc-card {
    display: flex; align-items: center; gap: 12px; padding: 14px 16px;
    background: var(--surface-lowest); border-radius: var(--r-xl);
    border: 1px solid var(--outline-variant); cursor: pointer;
    transition: all 0.18s; text-decoration: none;
  }
  .vp-doc-card:hover { box-shadow: var(--shadow-md); transform: translateY(-1px); border-color: rgba(0,80,203,0.2); }
  .vp-doc-icon { width: 40px; height: 40px; border-radius: 10px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
  .vp-doc-name { font-size: 13px; font-weight: 700; color: var(--on-surface); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .vp-doc-meta { font-size: 11px; color: var(--outline); margin-top: 2px; }

  /* knowledge content */
  .vp-content { background: var(--surface-low); border-radius: var(--r-xl); padding: 20px; margin-top: 16px; font-size: 14px; color: var(--on-surface-variant); line-height: 1.85; white-space: pre-wrap; word-break: break-word; }

  /* sidebar */
  .vp-sidebar { position: sticky; top: 16px; }
  .vp-related-title { font-size: 17px; font-weight: 800; color: var(--on-surface); letter-spacing: -0.02em; margin-bottom: 4px; display: flex; align-items: center; justify-content: space-between; }
  .vp-see-all { font-size: 13px; font-weight: 700; color: var(--primary); text-decoration: none; }
  .vp-see-all:hover { text-decoration: underline; }

  /* related card */
  .vp-rel-card { display: flex; gap: 12px; padding: 10px; border-radius: var(--r-xl); cursor: pointer; transition: all 0.18s; text-decoration: none; }
  .vp-rel-card:hover { background: var(--surface-lowest); box-shadow: var(--shadow); }
  .vp-rel-thumb { position: relative; width: 110px; height: 68px; border-radius: 10px; overflow: hidden; flex-shrink: 0; background: #0f172a; }
  .vp-rel-thumb img { width: 100%; height: 100%; object-fit: cover; }
  .vp-rel-play { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; background: rgba(0,0,0,0.2); }
  .vp-rel-dur  { position: absolute; bottom: 4px; right: 4px; background: rgba(0,0,0,0.65); color: white; font-size: 10px; font-weight: 700; padding: 2px 5px; border-radius: 4px; }
  .vp-rel-title { font-size: 13px; font-weight: 700; color: var(--on-surface); line-height: 1.4; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
  .vp-rel-sub   { font-size: 11px; color: var(--outline); margin-top: 3px; }

  /* quiz cta */
  .vp-quiz-cta { background: linear-gradient(135deg, #4345d1 0%, #0050cb 100%); border-radius: var(--r-2xl); padding: 22px; color: white; margin-top: 20px; position: relative; overflow: hidden; }
  .vp-quiz-bg  { position: absolute; right: -16px; bottom: -16px; width: 110px; height: 110px; background: rgba(255,255,255,0.08); border-radius: 50%; pointer-events: none; }
  .vp-quiz-bg2 { position: absolute; right: 20px; bottom: 30px; width: 60px; height: 60px; background: rgba(255,255,255,0.05); border-radius: 50%; pointer-events: none; }
  .vp-quiz-title { font-size: 15px; font-weight: 800; margin-bottom: 6px; }
  .vp-quiz-desc  { font-size: 12px; opacity: 0.8; line-height: 1.6; margin-bottom: 14px; }
  .vp-quiz-btn   { background: white; color: #0050cb; padding: 9px 20px; border-radius: 999px; font-size: 13px; font-weight: 800; border: none; cursor: pointer; font-family: var(--font); transition: opacity 0.15s; display: inline-block; text-decoration: none; }
  .vp-quiz-btn:hover { opacity: 0.92; }

  /* back btn */
  .vp-back { display: inline-flex; align-items: center; gap: 7px; font-size: 13px; font-weight: 700; color: var(--outline); text-decoration: none; margin-bottom: 20px; padding: 7px 14px; border-radius: 999px; background: var(--surface-lowest); box-shadow: var(--shadow-xs); transition: all 0.15s; border: 1px solid var(--outline-variant); }
  .vp-back:hover { color: var(--primary); border-color: rgba(0,80,203,0.2); }

  /* mobile */
  @media (max-width: 767px) {
    .vp-layout      { grid-template-columns: 1fr; gap: 0; }
    .vp-sidebar     { position: static; margin-top: 28px; }
    .vp-title       { font-size: 20px; }
    .vp-doc-grid    { grid-template-columns: 1fr; }
    .vp-embed       { height: 340px; }
    .vp-rel-thumb   { width: 96px; height: 60px; }
  }
`

/* ── related type icon ── */
function RelIcon({ type }: { type: string }) {
  if (type === 'pdf')   return <FileText size={14} color="white" />
  if (type === 'drive') return <ExternalLink size={14} color="white" />
  return <Play size={14} color="white" fill="white" />
}

export default function VideoPlayerClient({
  item, related, isAdmin,
}: {
  item: MediaItem
  related: MediaItem[]
  isAdmin: boolean
}) {
  const [playing, setPlaying] = useState(false)
  const [tab, setTab] = useState<'docs' | 'discussion'>('docs')
  const [descExpanded, setDescExpanded] = useState(false)
  const [editModal, setEditModal] = useState(false)
  const [localItem, setLocalItem] = useState(item)

  const thumb = getThumb(localItem)

  /* ── Player section ── */
  const PlayerSection = () => {
    if (localItem.type === 'video') {
      if (playing && localItem.video_url) {
        return (
          <div className="vp-player-wrap">
            <iframe
              className="vp-iframe"
              src={toEmbedUrl(localItem.video_url)}
              allowFullScreen
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              title={localItem.title}
            />
          </div>
        )
      }
      return (
        <div className="vp-player-wrap">
          <div className="vp-thumb-wrap" onClick={() => setPlaying(true)}>
            {thumb
              ? <img src={thumb} alt={localItem.title} className="vp-thumb" />
              : <div style={{ width:'100%', aspectRatio:'16/9', background:'linear-gradient(135deg,#0d1b4b,#1e293b)' }} />
            }
            <div className="vp-thumb-overlay">
              <button className="vp-play-btn">
                <Play size={32} fill="white" />
              </button>
            </div>
            <div className="vp-seekbar"><div className="vp-seekbar-fill" /></div>
          </div>
        </div>
      )
    }

    if (localItem.type === 'pdf' && localItem.file_url) {
      return (
        <iframe
          className="vp-embed"
          src={localItem.file_url}
          title={localItem.title}
          style={{ boxShadow: '0 20px 50px rgba(0,0,0,0.15)' }}
        />
      )
    }

    if (localItem.type === 'drive' && localItem.drive_url) {
      return (
        <iframe
          className="vp-embed"
          src={toDriveEmbed(localItem.drive_url)}
          title={localItem.title}
          allowFullScreen
          style={{ boxShadow: '0 20px 50px rgba(0,0,0,0.15)' }}
        />
      )
    }

    if (localItem.type === 'knowledge') {
      return (
        <div style={{ background: 'linear-gradient(135deg, #0050cb 0%, #4345d1 100%)', borderRadius: 'var(--r-2xl)', padding: '40px', minHeight: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', boxShadow: '0 20px 50px rgba(0,80,203,0.2)' }}>
          <div style={{ textAlign: 'center' }}>
            <BookOpen size={48} style={{ opacity: 0.6, marginBottom: 12 }} />
            <p style={{ fontSize: 16, fontWeight: 700, opacity: 0.9 }}>บทความ / เนื้อหาสรุป</p>
          </div>
        </div>
      )
    }

    return null
  }

  return (
    <div className="vp-page">
      <style>{CSS}</style>

      {/* back */}
      <Link href="/dashboard/media" className="vp-back">
        <ArrowLeft size={15} /> กลับไปสื่อการเรียน
      </Link>

      <div className="vp-layout">
        {/* ── Left column ── */}
        <div>
          {/* Player */}
          <PlayerSection />

          {/* Meta */}
          <div style={{ marginTop: 20 }}>
            <p className="vp-label">
              {localItem.type === 'video' ? 'VIDEO LESSON' : localItem.type === 'pdf' ? 'PDF DOCUMENT' : localItem.type === 'drive' ? 'GOOGLE DRIVE' : 'ARTICLE'}
              {localItem.duration && <span style={{ marginLeft: 8 }}>• {localItem.duration}</span>}
            </p>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
              <h1 className="vp-title" style={{ flex: 1 }}>{localItem.title}</h1>
              {isAdmin && (
                <button className="btn btn-sm btn-outline" onClick={() => setEditModal(true)} style={{ flexShrink: 0, marginTop: 4 }}>
                  <Pencil size={13} /> แก้ไข
                </button>
              )}
            </div>
            <div className="vp-stats">
              {localItem.created_at && (
                <span className="vp-stat">
                  <Calendar size={13} />
                  {new Date(localItem.created_at).toLocaleDateString('th-TH', { day:'numeric', month:'short', year:'2-digit' })}
                </span>
              )}
              {localItem.duration && (
                <span className="vp-stat"><Clock size={13} /> {localItem.duration}</span>
              )}
            </div>
            {localItem.tags && localItem.tags.length > 0 && (
              <div className="vp-tags">
                {localItem.tags.map(t => <span key={t} className="vp-tag">{t}</span>)}
              </div>
            )}
          </div>

          {/* Description card */}
          {localItem.description && (
            <div className="vp-desc-card">
              <div className="vp-desc-bg">📖</div>
              <h3 className="vp-desc-title">คำอธิบายบทเรียน</h3>
              <p className="vp-desc-text" style={{ display: descExpanded ? 'block' : '-webkit-box', WebkitLineClamp: descExpanded ? undefined : 3, WebkitBoxOrient: 'vertical', overflow: descExpanded ? 'visible' : 'hidden' }}>
                {linkify(localItem.description)}
              </p>
              <button className="vp-desc-toggle" onClick={() => setDescExpanded(p => !p)}>
                {descExpanded ? (<>ย่อลง <ChevronUp size={13} /></>) : (<>ดูเพิ่มเติม <ChevronDown size={13} /></>)}
              </button>
            </div>
          )}

          {/* Tabs */}
          <div className="vp-tabs">
            <button className={`vp-tab ${tab === 'docs' ? 'active' : ''}`} onClick={() => setTab('docs')}>
              เอกสารประกอบ
            </button>
            <button className={`vp-tab ${tab === 'discussion' ? 'active' : ''}`} onClick={() => setTab('discussion')}>
              กระดานสนทนา
            </button>
          </div>

          {tab === 'docs' && (
            <div>
              {/* Knowledge content */}
              {localItem.type === 'knowledge' && localItem.content && (
                <div className="vp-content">{localItem.content}</div>
              )}

              {/* File docs grid */}
              {(() => {
                const links = (localItem as any).doc_links as { label: string; url: string }[] | null
                const hasDocLinks = links && links.length > 0
                const hasPdf = localItem.type === 'pdf' && localItem.file_url
                const hasDrive = localItem.type === 'drive' && localItem.drive_url
                const isEmpty = !hasDocLinks && !hasPdf && !hasDrive && localItem.type !== 'knowledge'

                return (
                  <div className="vp-doc-grid">
                    {hasDocLinks && links!.map((d, i) => (
                      <a key={i} href={d.url} target="_blank" rel="noopener noreferrer" className="vp-doc-card">
                        <div className="vp-doc-icon" style={{ background: 'rgba(0,80,203,0.08)' }}>
                          <ExternalLink size={18} color="var(--primary)" />
                        </div>
                        <div style={{ minWidth: 0 }}>
                          <div className="vp-doc-name">{d.label}</div>
                          <div className="vp-doc-meta">ลิงก์เอกสาร</div>
                        </div>
                      </a>
                    ))}
                    {hasPdf && (
                      <a href={localItem.file_url!} target="_blank" rel="noopener noreferrer" className="vp-doc-card">
                        <div className="vp-doc-icon" style={{ background: '#fef2f2' }}>
                          <FileText size={20} color="#dc2626" />
                        </div>
                        <div style={{ minWidth: 0 }}>
                          <div className="vp-doc-name">{localItem.title}.pdf</div>
                          <div className="vp-doc-meta">PDF Document</div>
                        </div>
                      </a>
                    )}
                    {hasDrive && (
                      <a href={localItem.drive_url!} target="_blank" rel="noopener noreferrer" className="vp-doc-card">
                        <div className="vp-doc-icon" style={{ background: '#fff7ed' }}>
                          <ExternalLink size={20} color="#d97706" />
                        </div>
                        <div style={{ minWidth: 0 }}>
                          <div className="vp-doc-name">{localItem.title}</div>
                          <div className="vp-doc-meta">Google Drive</div>
                        </div>
                      </a>
                    )}
                    {isEmpty && (
                      <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '32px 0', color: 'var(--outline)', fontSize: 13 }}>
                        ยังไม่มีเอกสารประกอบ
                      </div>
                    )}
                  </div>
                )
              })()}
            </div>
          )}

          {tab === 'discussion' && (
            <div style={{ textAlign: 'center', padding: '48px 0', color: 'var(--outline)' }}>
              <MessageSquare size={36} style={{ margin: '0 auto 12px', opacity: 0.25 }} />
              <p style={{ fontSize: 14, fontWeight: 600 }}>กระดานสนทนา</p>
              <p style={{ fontSize: 13, marginTop: 4 }}>ยังไม่มีความคิดเห็น — เป็นคนแรกที่แสดงความคิดเห็น!</p>
            </div>
          )}
        </div>

        {/* ── Right sidebar ── */}
        <aside className="vp-sidebar">
          {/* Related */}
          <div style={{ marginBottom: 4 }}>
            <div className="vp-related-title">
              <span>บทเรียนที่เกี่ยวข้อง</span>
              <Link href="/dashboard/media" className="vp-see-all">ดูทั้งหมด</Link>
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {related.length === 0 ? (
              <p style={{ fontSize: 13, color: 'var(--outline)', padding: '16px 0' }}>ยังไม่มีบทเรียนอื่น</p>
            ) : related.map(r => {
              const rThumb = getThumb(r)
              return (
                <Link key={r.id} href={`/dashboard/media/${r.id}`} className="vp-rel-card">
                  <div className="vp-rel-thumb">
                    {rThumb
                      ? <img src={rThumb} alt={r.title} onError={e => { (e.target as HTMLImageElement).style.display = 'none' }} />
                      : <div style={{ position:'absolute', inset:0, background:'linear-gradient(135deg,#1e293b,#334155)', display:'flex', alignItems:'center', justifyContent:'center' }}>
                          <RelIcon type={r.type} />
                        </div>
                    }
                    <div className="vp-rel-play"><RelIcon type={r.type} /></div>
                    {r.duration && <span className="vp-rel-dur">{r.duration}</span>}
                  </div>
                  <div style={{ flex: 1, minWidth: 0, paddingTop: 2 }}>
                    <p className="vp-rel-title">{r.title}</p>
                    {r.description && <p className="vp-rel-sub" style={{ display:'-webkit-box', WebkitLineClamp:1, WebkitBoxOrient:'vertical', overflow:'hidden' }}>{r.description}</p>}
                  </div>
                </Link>
              )
            })}
          </div>

          {/* Quiz CTA */}
          <div className="vp-quiz-cta">
            <div className="vp-quiz-bg" /><div className="vp-quiz-bg2" />
            <div style={{ position: 'relative', zIndex: 1 }}>
              <h5 className="vp-quiz-title">ทดสอบความเข้าใจ?</h5>
              <p className="vp-quiz-desc"></p>
              <Link href="/dashboard/quizzes" className="vp-quiz-btn">เริ่มทำควิซ</Link>
            </div>
          </div>
        </aside>
      </div>

      {/* Edit Modal */}
      {editModal && createPortal(
        <EditModal
          item={localItem}
          onClose={() => setEditModal(false)}
          onSaved={updated => { setLocalItem(updated); setEditModal(false) }}
        />,
        document.body
      )}
    </div>
  )
}

/* ─── Edit Modal ─────────────────────────────────────────────────────────── */
function EditModal({ item, onClose, onSaved }: {
  item: MediaItem
  onClose: () => void
  onSaved: (updated: MediaItem) => void
}) {
  const supabase = createClient()
  const [form, setForm] = useState({
    title: item.title,
    description: item.description ?? '',
    content: item.content ?? '',
    video_url: item.video_url ?? '',
    duration: item.duration ?? '',
    drive_url: item.drive_url ?? '',
  })
  const [tags, setTags] = useState<string[]>(item.tags ?? [])
  const [tagInput, setTagInput] = useState('')
  const [docLinks, setDocLinks] = useState<{ label: string; url: string }[]>(
    ((item as any).doc_links as { label: string; url: string }[]) ?? []
  )
  const [docLabel, setDocLabel] = useState('')
  const [docUrl, setDocUrl] = useState('')
  const [saving, setSaving] = useState(false)

  function addDocLink() {
    if (!docUrl.trim()) return
    setDocLinks(p => [...p, { label: docLabel.trim() || docUrl.trim(), url: docUrl.trim() }])
    setDocLabel('')
    setDocUrl('')
  }

  async function save() {
    if (!form.title.trim()) { toast.error('กรุณาใส่ชื่อ'); return }
    setSaving(true)
    const updates = {
      title: form.title.trim(),
      description: form.description.trim() || null,
      content: form.content.trim() || null,
      video_url: form.video_url.trim() || null,
      duration: form.duration.trim() || null,
      drive_url: form.drive_url.trim() || null,
      tags,
      doc_links: docLinks.length > 0 ? docLinks : null,
    }
    const { data, error } = await supabase
      .from('media_items').update(updates).eq('id', item.id).select().single()
    if (error || !data) { toast.error('บันทึกไม่สำเร็จ'); setSaving(false); return }
    toast.success('บันทึกแล้ว ✓')
    onSaved(data as MediaItem)
  }

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: 560 }}>
        <div className="modal-header">
          <h3 style={{ fontWeight: 800, fontSize: 16 }}>แก้ไขสื่อการสอน</h3>
          <button className="btn btn-icon btn-ghost" onClick={onClose}><X size={16} /></button>
        </div>
        <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

          {/* ชื่อ */}
          <div>
            <label className="form-label">ชื่อหัวข้อ *</label>
            <input className="input" value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} />
          </div>

          {/* คำอธิบาย */}
          <div>
            <label className="form-label">คำอธิบาย</label>
            <textarea className="input" rows={3} style={{ borderRadius: 'var(--r-lg)', resize: 'vertical' }}
              value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} />
          </div>

          {/* เนื้อหา (knowledge) */}
          {item.type === 'knowledge' && (
            <div>
              <label className="form-label">เนื้อหา</label>
              <textarea className="input" rows={7} style={{ borderRadius: 'var(--r-lg)', resize: 'vertical' }}
                value={form.content} onChange={e => setForm(p => ({ ...p, content: e.target.value }))} />
            </div>
          )}

          {/* URL วีดีโอ */}
          {item.type === 'video' && (
            <>
              <div>
                <label className="form-label">URL วีดีโอ (YouTube)</label>
                <input className="input" placeholder="https://www.youtube.com/watch?v=..."
                  value={form.video_url} onChange={e => setForm(p => ({ ...p, video_url: e.target.value }))} />
              </div>
              <div>
                <label className="form-label">ความยาว</label>
                <input className="input" placeholder="12:34"
                  value={form.duration} onChange={e => setForm(p => ({ ...p, duration: e.target.value }))} />
              </div>
            </>
          )}

          {/* Drive URL */}
          {item.type === 'drive' && (
            <div>
              <label className="form-label">ลิงก์ Google Drive</label>
              <input className="input" placeholder="https://drive.google.com/file/d/..."
                value={form.drive_url} onChange={e => setForm(p => ({ ...p, drive_url: e.target.value }))} />
            </div>
          )}

          {/* เอกสารประกอบ */}
          <div>
            <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <ExternalLink size={12} /> เอกสารประกอบ (ลิงก์)
            </label>
            <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
              <input className="input" style={{ flex: 1 }} placeholder="ชื่อเอกสาร"
                value={docLabel} onChange={e => setDocLabel(e.target.value)} />
              <input className="input" style={{ flex: 2 }} placeholder="URL ลิงก์..."
                value={docUrl} onChange={e => setDocUrl(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addDocLink() } }} />
              <button className="btn btn-primary btn-sm" style={{ flexShrink: 0 }}
                disabled={!docUrl.trim()} onClick={addDocLink}>
                <Plus size={13} />
              </button>
            </div>
            {docLinks.map((d, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'var(--surface-low)', borderRadius: 'var(--r-md)', padding: '8px 12px', marginBottom: 6 }}>
                <ExternalLink size={13} color="var(--primary)" style={{ flexShrink: 0 }} />
                <span style={{ flex: 1, fontSize: 13, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{d.label}</span>
                <span style={{ fontSize: 11, color: 'var(--outline)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 140 }}>{d.url}</span>
                <button onClick={() => setDocLinks(p => p.filter((_, j) => j !== i))}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--error)', padding: 2, flexShrink: 0 }}>
                  <X size={13} />
                </button>
              </div>
            ))}
          </div>

          {/* แท็ก */}
          <div>
            <label className="form-label">แท็ก</label>
            <input className="input" value={tagInput} placeholder="พิมพ์แล้วกด Enter"
              onChange={e => setTagInput(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  if (tagInput.trim()) { setTags(p => [...p, tagInput.trim()]); setTagInput('') }
                }
              }} />
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginTop: 6 }}>
              {tags.map((t, i) => (
                <span key={i} className="badge badge-blue" style={{ cursor: 'pointer' }}
                  onClick={() => setTags(p => p.filter((_, j) => j !== i))}>
                  {t} ×
                </span>
              ))}
            </div>
          </div>

        </div>
        <div className="modal-footer">
          <button className="btn" onClick={onClose}>ยกเลิก</button>
          <button className="btn btn-primary" onClick={save} disabled={saving}>
            {saving ? <><div className="spinner" />บันทึก...</> : '💾 บันทึก'}
          </button>
        </div>
      </div>
    </div>
  )
}