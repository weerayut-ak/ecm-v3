'use client'
import { useState } from 'react'
import { BookOpen, Video, Plus, X, Tag, Play, Search, ChevronRight, FileText, Link } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import toast from 'react-hot-toast'

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
}

function toEmbedUrl(url: string | null): string | null {
  if (!url) return null
  const m1 = url.match(/youtube\.com\/watch\?(?:.*&)?v=([\w-]+)/)
  if (m1) return `https://www.youtube.com/embed/${m1[1]}`
  const m2 = url.match(/youtu\.be\/([\w-]+)/)
  if (m2) return `https://www.youtube.com/embed/${m2[1]}`
  return url
}

function toDriveEmbedUrl(url: string | null): string | null {
  if (!url) return null
  // https://drive.google.com/file/d/FILE_ID/view
  const m1 = url.match(/drive\.google\.com\/file\/d\/([\w-]+)/)
  if (m1) return `https://drive.google.com/file/d/${m1[1]}/preview`
  // https://drive.google.com/open?id=FILE_ID
  const m2 = url.match(/[?&]id=([\w-]+)/)
  if (m2) return `https://drive.google.com/file/d/${m2[1]}/preview`
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

function getPdfThumbnailUrl(url: string | null): string | null {
  if (!url) return null
  // Use Google Docs viewer thumbnail for PDF
  return `https://docs.google.com/viewer?url=${encodeURIComponent(url)}&embedded=true`
}

function getDriveThumbnail(url: string | null): string | null {
  if (!url) return null
  const m1 = url.match(/drive\.google\.com\/file\/d\/([\w-]+)/)
  if (m1) return `https://drive.google.com/thumbnail?id=${m1[1]}&sz=w400`
  const m2 = url.match(/[?&]id=([\w-]+)/)
  if (m2) return `https://drive.google.com/thumbnail?id=${m2[1]}&sz=w400`
  return null
}

const ICONS: Record<string, string> = { Grammar: '📖', Vocabulary: '📝', Reading: '📚', Writing: '✏️', Listening: '🎧', Speaking: '🗣️' }

const TYPE_LABELS = {
  knowledge: { label: 'บทความ', icon: '📄', color: '#EFF6FF', tc: 'var(--blue)' },
  video:     { label: 'วีดีโอ',  icon: '🎬', color: '#F0FDF4', tc: 'var(--green)' },
  pdf:       { label: 'PDF',    icon: '📕', color: '#FEF2F2', tc: 'var(--red)' },
  drive:     { label: 'Drive',  icon: '📁', color: '#FFFBEB', tc: 'var(--amber)' },
}

export default function MediaClient({ knowledge: kInit, videos: vInit, isAdmin }: { knowledge: MediaItem[]; videos: MediaItem[]; isAdmin: boolean }) {
  const [tab, setTab] = useState<'knowledge' | 'video'>('knowledge')
  const [knowledge, setKnowledge] = useState(kInit)
  const [videos, setVideos] = useState(vInit)
  const [selected, setSelected] = useState<MediaItem | null>(null)
  const [addModal, setAddModal] = useState<'knowledge' | 'video' | null>(null)
  const [search, setSearch] = useState('')
  const supabase = createClient()

  const filteredK = knowledge.filter(k => !search || k.title.toLowerCase().includes(search.toLowerCase()) || k.tags?.some(t => t.toLowerCase().includes(search.toLowerCase())))
  const filteredV = videos.filter(v => !search || v.title.toLowerCase().includes(search.toLowerCase()))

  async function handleDelete(item: MediaItem) {
    if (!confirm('ยืนยันการลบ?')) return
    await supabase.from('media_items').delete().eq('id', item.id)
    if (item.type === 'knowledge') setKnowledge(p => p.filter(k => k.id !== item.id))
    else setVideos(p => p.filter(v => v.id !== item.id))
    toast.success('ลบแล้ว')
  }

  async function handleAdd(form: Partial<MediaItem>) {
    const sb = createClient()
    // Only set type if not already specified (for pdf/drive/video subtypes)
    const dataToInsert = form.type ? form : { ...form, type: addModal }
    console.log('Inserting data:', JSON.stringify(dataToInsert, null, 2))
    const { data, error } = await sb.from('media_items').insert(dataToInsert).select().single()
    if (error || !data) { 
      console.error('Insert error:', error)
      console.error('Insert error details:', JSON.stringify(error, null, 2))
      toast.error(`เพิ่มไม่สำเร็จ: ${error?.message || error?.details || 'ข้อผิดพลาดที่ไม่รู้จัก'}`)
      return 
    }
    if (addModal === 'knowledge') setKnowledge(p => [...p, { ...form, type: addModal, id: crypto.randomUUID() } as MediaItem])
    else setVideos(p => [...p, { ...form, type: addModal, id: crypto.randomUUID() } as MediaItem])
    toast.success('เพิ่มสำเร็จ ✓')
    setAddModal(null)
  }

  return (
    <div style={{ maxWidth: 960, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
          <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-3)' }} />
          <input className="input" style={{ paddingLeft: 32 }} placeholder="ค้นหาหัวข้อ..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        {isAdmin && (
          <button className="btn btn-primary" onClick={() => setAddModal(tab)}>
            <Plus size={14} /> เพิ่ม{tab === 'knowledge' ? 'เนื้อหา' : 'วีดีโอ/PDF/Drive'}
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="tab-bar" style={{ marginBottom: 24 }}>
        <button className={`tab ${tab === 'knowledge' ? 'active' : ''}`} onClick={() => { setTab('knowledge'); setSearch('') }}>
          <BookOpen size={14} style={{ display: 'inline', marginRight: 5 }} />คลังความรู้ <span style={{ fontSize: 11, opacity: 0.6, marginLeft: 4 }}>({knowledge.length})</span>
        </button>
        <button className={`tab ${tab === 'video' ? 'active' : ''}`} onClick={() => { setTab('video'); setSearch('') }}>
          <Video size={14} style={{ display: 'inline', marginRight: 5 }} />สื่อการสอน <span style={{ fontSize: 11, opacity: 0.6, marginLeft: 4 }}>({videos.length})</span>
        </button>
      </div>

      {/* Knowledge grid */}
      {tab === 'knowledge' && (
        <div>
          {filteredK.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-3)' }}>
              <BookOpen size={40} style={{ margin: '0 auto 12px', opacity: 0.3 }} />
              <p>ยังไม่มีเนื้อหา</p>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }} className="stagger">
              {filteredK.map(k => {
                const icon = k.tags?.find(t => ICONS[t]) ? ICONS[k.tags.find(t => ICONS[t])!] : '📄'
                return (
                  <div key={k.id} className="knowledge-card fade-up" onClick={() => setSelected(k)}>
                    <div className="knowledge-card-header" style={{ background: 'linear-gradient(135deg, #F0F9FF, #EFF6FF)' }}>
                      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 }}>
                        <div style={{ fontSize: 32 }}>{icon}</div>
                        {isAdmin && (
                          <button className="btn btn-sm btn-danger" onClick={e => { e.stopPropagation(); handleDelete(k) }}>ลบ</button>
                        )}
                      </div>
                      <h3 style={{ fontSize: 15, fontWeight: 700, marginTop: 10, marginBottom: 4 }}>{k.title}</h3>
                      <p style={{ fontSize: 12, color: 'var(--text-2)', lineHeight: 1.5 }}>{k.description}</p>
                    </div>
                    <div className="knowledge-card-body">
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginBottom: 10 }}>
                        {k.tags?.map(t => <span key={t} className="badge badge-blue" style={{ fontSize: 10 }}><Tag size={8} />{t}</span>)}
                      </div>
                      {k.content && (
                        <p style={{ fontSize: 12, color: 'var(--text-2)', lineHeight: 1.6, display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                          {k.content}
                        </p>
                      )}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 10, fontSize: 12, color: 'var(--blue)', fontWeight: 600 }}>
                        อ่านเพิ่มเติม <ChevronRight size={12} />
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* Video/PDF/Drive grid */}
      {tab === 'video' && (
        <div>
          {filteredV.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-3)' }}>
              <Video size={40} style={{ margin: '0 auto 12px', opacity: 0.3 }} />
              <p>ยังไม่มีสื่อการสอน</p>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 16 }} className="stagger">
              {filteredV.map(v => {
                const tinfo = TYPE_LABELS[v.type as keyof typeof TYPE_LABELS] ?? TYPE_LABELS.video
                return (
                  <div key={v.id} className="video-card fade-up" onClick={() => setSelected(v)}>
                    <div className="video-thumb" style={{ background: `linear-gradient(135deg, ${tinfo.color}, #F8FAFC)`, overflow: 'hidden', position: 'relative' }}>
                      {/* Real preview thumbnail */}
                      {v.type === 'video' && getYouTubeThumbnail(v.video_url) ? (
                        <img
                          src={getYouTubeThumbnail(v.video_url)!}
                          alt={v.title}
                          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
                          onError={e => { (e.target as HTMLImageElement).style.display = 'none' }}
                        />
                      ) : v.type === 'drive' && getDriveThumbnail(v.drive_url) ? (
                        <img
                          src={getDriveThumbnail(v.drive_url)!}
                          alt={v.title}
                          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
                          onError={e => { (e.target as HTMLImageElement).style.display = 'none' }}
                        />
                      ) : v.type === 'pdf' && v.file_url ? (
                        <iframe
                          src={`https://docs.google.com/viewer?url=${encodeURIComponent(v.file_url)}&embedded=true`}
                          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', border: 'none', pointerEvents: 'none', transform: 'scale(1)', transformOrigin: 'top left' }}
                          title="preview"
                        />
                      ) : null}
                      {/* Overlay play/icon button */}
                      <div className="video-play" style={{ background: tinfo.tc, zIndex: 2 }}>
                        {v.type === 'pdf' ? <FileText size={20} color="white" /> :
                         v.type === 'drive' ? <Link size={20} color="white" /> :
                         <Play size={20} color="white" fill="white" />}
                      </div>
                      {v.duration && <span style={{ position: 'absolute', bottom: 8, right: 8, background: 'rgba(0,0,0,0.6)', color: 'white', fontSize: 11, padding: '2px 6px', borderRadius: 4, zIndex: 2 }}>{v.duration}</span>}
                      <span style={{ position: 'absolute', top: 8, left: 8, zIndex: 2 }} className={`badge badge-${v.type === 'pdf' ? 'red' : v.type === 'drive' ? 'amber' : 'green'}`}>{tinfo.label}</span>
                    </div>
                    <div style={{ padding: '12px 14px' }}>
                      <h3 style={{ fontSize: 13, fontWeight: 600, lineHeight: 1.4, marginBottom: 5 }}>{v.title}</h3>
                      <p style={{ fontSize: 11, color: 'var(--text-3)', lineHeight: 1.4, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{v.description}</p>
                      {isAdmin && <button className="btn btn-sm btn-danger" style={{ marginTop: 8 }} onClick={e => { e.stopPropagation(); handleDelete(v) }}>ลบ</button>}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* Detail modal */}
      {selected && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setSelected(null)}>
          <div className="modal" style={{ maxWidth: 640 }}>
            <div className="modal-header">
              <h3 style={{ fontWeight: 700, fontSize: 16 }}>{selected.title}</h3>
              <button className="btn btn-icon btn-ghost" onClick={() => setSelected(null)}><X size={16} /></button>
            </div>
            <div className="modal-body">
              {/* Video */}
              {selected.type === 'video' && (
                <div style={{ borderRadius: 'var(--r-lg)', overflow: 'hidden', marginBottom: 16, background: '#000', aspectRatio: '16/9', position: 'relative' }}>
                  {selected.video_url
                    ? <iframe src={toEmbedUrl(selected.video_url) ?? undefined} style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', border: 'none' }} allowFullScreen title={selected.title} />
                    : <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', position: 'absolute', inset: 0 }}><Play size={40} color="var(--blue)" /><p style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 8 }}>ยังไม่มี URL วีดีโอ</p></div>}
                </div>
              )}

              {/* PDF */}
              {selected.type === 'pdf' && (
                <div style={{ marginBottom: 16 }}>
                  {selected.file_url ? (
                    <div style={{ borderRadius: 'var(--r-lg)', overflow: 'hidden', border: '1px solid var(--border)', height: 480 }}>
                      <iframe src={selected.file_url ?? undefined} style={{ width: '100%', height: '100%', border: 'none' }} title={selected.title} />
                    </div>
                  ) : (
                    <div style={{ padding: 20, background: 'var(--red-light)', borderRadius: 'var(--r-md)', textAlign: 'center', color: 'var(--red)' }}>
                      <FileText size={32} style={{ margin: '0 auto 8px' }} />
                      <p style={{ fontSize: 13 }}>ยังไม่มีไฟล์ PDF</p>
                    </div>
                  )}
                  {selected.file_url && (
                    <a href={selected.file_url} target="_blank" rel="noopener noreferrer" className="btn btn-sm" style={{ marginTop: 8 }}>
                      <FileText size={12} /> เปิดไฟล์ PDF
                    </a>
                  )}
                </div>
              )}

              {/* Google Drive */}
              {selected.type === 'drive' && (
                <div style={{ marginBottom: 16 }}>
                  {selected.drive_url ? (
                    <div style={{ borderRadius: 'var(--r-lg)', overflow: 'hidden', border: '1px solid var(--border)', height: 480 }}>
                      <iframe src={toDriveEmbedUrl(selected.drive_url) ?? undefined} style={{ width: '100%', height: '100%', border: 'none' }} title={selected.title} allowFullScreen />
                    </div>
                  ) : (
                    <div style={{ padding: 20, background: 'var(--amber-light)', borderRadius: 'var(--r-md)', textAlign: 'center', color: 'var(--amber)' }}>
                      <Link size={32} style={{ margin: '0 auto 8px' }} />
                      <p style={{ fontSize: 13 }}>ยังไม่มีลิงก์ Google Drive</p>
                    </div>
                  )}
                  {selected.drive_url && (
                    <a href={selected.drive_url} target="_blank" rel="noopener noreferrer" className="btn btn-sm" style={{ marginTop: 8 }}>
                      <Link size={12} /> เปิดใน Google Drive
                    </a>
                  )}
                </div>
              )}

              {/* Knowledge icon */}
              {selected.type === 'knowledge' && (
                <div style={{ background: 'linear-gradient(135deg,#F0F9FF,#EFF6FF)', borderRadius: 'var(--r-lg)', padding: '16px', marginBottom: 16, fontSize: 28, textAlign: 'center' }}>
                  {selected.tags?.find(t => ICONS[t]) ? ICONS[selected.tags.find(t => ICONS[t])!] : '📄'}
                </div>
              )}

              {selected.description && <p style={{ fontSize: 13, color: 'var(--text-2)', marginBottom: 12, lineHeight: 1.7 }}>{selected.description}</p>}
              {selected.content && (
                <div style={{ background: '#FAFAFA', borderRadius: 'var(--r-md)', padding: '14px 16px', fontSize: 13, lineHeight: 1.8, color: 'var(--text)', whiteSpace: 'pre-wrap', border: '1px solid var(--border)', maxHeight: 300, overflowY: 'auto' }}>
                  {selected.content}
                </div>
              )}
              {selected.tags?.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 12 }}>
                  {selected.tags.map(t => <span key={t} className="badge badge-blue">{t}</span>)}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Add modal */}
      {addModal && <AddModal type={addModal} onClose={() => setAddModal(null)} onSave={handleAdd} supabase={supabase} />}
    </div>
  )
}

function AddModal({ type, onClose, onSave, supabase }: { type: 'knowledge' | 'video'; onClose: () => void; onSave: (f: Partial<MediaItem>) => void; supabase: ReturnType<typeof createClient> }) {
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

    // อัพโหลด PDF ถ้ามี
    if (type === 'video' && subType === 'pdf' && pdfFile) {
      setUploading(true)
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (!session) { 
          toast.error('ไม่ได้ลงชื่นเข้า ต้องลงชื่นเข้าใหม่'); 
          setSaving(false); 
          setUploading(false); 
          return 
        }
        
        const ext = pdfFile.name.split(`.`).pop() ?? `pdf`
        const path = `pdfs/${Date.now()}.${ext}`
        
        console.log('Uploading to:', path, 'File size:', pdfFile.size)
        
        const { data, error } = await supabase.storage.from('media').upload(path, pdfFile, { upsert: true })
        if (error) { 
          console.error('Upload error:', error)
          toast.error(`อัพโหลดไม่สำเร็จ: ${error.message || 'ข้อผิดพลาดที่ไม่รู้จัก'}`)
          setSaving(false)
          setUploading(false)
          return 
        }
        
        const { data: urlData } = supabase.storage.from('media').getPublicUrl(path)
        if (!urlData?.publicUrl) {
          toast.error('ไม่สามารถสร้าง URL สาธารณะได้')
          setSaving(false)
          setUploading(false)
          return
        }
        
        finalForm.file_url = urlData.publicUrl
        finalForm.type = 'pdf' as any
        toast.success('อัพโหลด PDF สำเร็จ ✓')
      } catch (err) {
        console.error('Upload exception:', err)
        toast.error(`ข้อผิดพลาด: ${err instanceof Error ? err.message : 'ไม่รู้จัก'}`)
        setSaving(false)
        setUploading(false)
        return
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

  const actualType = type === 'video' ? subType : type

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header">
          <h3 style={{ fontWeight: 700 }}>เพิ่ม{type === 'knowledge' ? 'เนื้อหา' : 'สื่อการสอน'}</h3>
          <button className="btn btn-icon btn-ghost" onClick={onClose}><X size={16} /></button>
        </div>
        <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

          {/* ประเภทสื่อ (เฉพาะ tab วีดีโอ) */}
          {type === 'video' && (
            <div>
              <label className="form-label">ประเภทสื่อ</label>
              <div style={{ display: 'flex', gap: 8 }}>
                {(['video', 'pdf', 'drive'] as const).map(t => (
                  <button key={t} onClick={() => setSubType(t)} className={`btn btn-sm ${subType === t ? 'btn-primary' : ''}`}>
                    {t === 'video' ? '🎬 วีดีโอ' : t === 'pdf' ? '📕 PDF' : '📁 Google Drive'}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div><label className="form-label">ชื่อหัวข้อ *</label><input className="input" value={form.title ?? ''} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} /></div>
          <div><label className="form-label">คำอธิบาย</label><input className="input" value={form.description ?? ''} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} /></div>

          {/* เนื้อหาบทความ */}
          {type === 'knowledge' && (
            <div><label className="form-label">เนื้อหา</label><textarea className="input" rows={5} value={form.content ?? ''} onChange={e => setForm(p => ({ ...p, content: e.target.value }))} /></div>
          )}

          {/* วีดีโอ */}
          {type === 'video' && subType === 'video' && (
            <>
              <div><label className="form-label">URL วีดีโอ (YouTube)</label><input className="input" placeholder="https://www.youtube.com/watch?v=..." value={form.video_url ?? ''} onChange={e => setForm(p => ({ ...p, video_url: e.target.value }))} /></div>
              <div><label className="form-label">ความยาว</label><input className="input" placeholder="12:34" value={form.duration ?? ''} onChange={e => setForm(p => ({ ...p, duration: e.target.value }))} /></div>
            </>
          )}

          {/* PDF Upload */}
          {type === 'video' && subType === 'pdf' && (
            <div>
              <label className="form-label">ไฟล์ PDF</label>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, border: '1.5px dashed var(--border-md)', borderRadius: 'var(--r-md)', padding: 12, cursor: 'pointer', background: pdfFile ? 'var(--red-light)' : '' }}>
                <FileText size={16} color={pdfFile ? 'var(--red)' : 'var(--text-3)'} />
                <span style={{ fontSize: 13, color: pdfFile ? 'var(--red)' : 'var(--text-2)' }}>{pdfFile?.name ?? 'คลิกเลือกไฟล์ PDF...'}</span>
                <input type="file" accept=".pdf" style={{ display: 'none' }} onChange={e => setPdfFile(e.target.files?.[0] ?? null)} />
              </label>
              {uploading && <p style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 4 }}>กำลังอัพโหลด...</p>}
            </div>
          )}

          {/* Google Drive */}
          {type === 'video' && subType === 'drive' && (
            <div>
              <label className="form-label">ลิงก์ Google Drive</label>
              <input className="input" placeholder="https://drive.google.com/file/d/..." value={form.drive_url ?? ''} onChange={e => setForm(p => ({ ...p, drive_url: e.target.value }))} />
              <p style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 4 }}>💡 ตั้งค่าไฟล์เป็น "ทุกคนที่มีลิงก์" ก่อนวาง URL</p>
            </div>
          )}

          {/* แท็ก */}
          <div>
            <label className="form-label">แท็ก</label>
            <div style={{ display: 'flex', gap: 6, marginBottom: 6 }}>
              <input className="input" value={tagInput} onChange={e => setTagInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); if (tagInput.trim()) { setForm(p => ({ ...p, tags: [...(p.tags ?? []), tagInput.trim()] })); setTagInput('') } } }}
                placeholder="พิมพ์แล้วกด Enter" />
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
              {form.tags?.map((t, i) => (
                <span key={i} className="badge badge-blue" style={{ cursor: 'pointer' }} onClick={() => setForm(p => ({ ...p, tags: p.tags?.filter((_, j) => j !== i) }))}>
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
    </div>
  )
}