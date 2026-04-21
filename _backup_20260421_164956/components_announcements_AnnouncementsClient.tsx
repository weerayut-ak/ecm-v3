'use client'
import { useState } from 'react'
import type { Announcement } from '@/types/announcement'
import { createClient } from '@/lib/supabase/client'
import { parseExcelOrCSV, normalizeScoreRows } from '@/lib/upload'
import { Plus, X, Star, Trash2, Upload, ChevronDown, ChevronUp } from 'lucide-react'
import toast from 'react-hot-toast'

type Ann = Announcement & { author?: { full_name: string; nickname: string | null } | null }

export default function AnnouncementsClient({ announcements: init, isAdmin }: { announcements: Ann[]; isAdmin: boolean }) {
  const [list, setList] = useState(init)
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const [modal, setModal] = useState(false)
  const supabase = createClient()

  function toggle(id: string) {
    setExpanded(prev => {
      const n = new Set(prev)
      n.has(id) ? n.delete(id) : n.add(id)
      return n
    })
  }

  async function toggleImportant(id: string, cur: boolean) {
    await supabase.from('announcements').update({ is_important: !cur }).eq('id', id)
    setList(p => p.map(a => a.id === id ? { ...a, is_important: !cur } : a))
  }

  async function del(id: string) {
    if (!confirm('ยืนยันการลบ?')) return
    await supabase.from('announcements').delete().eq('id', id)
    setList(p => p.filter(a => a.id !== id))
    toast.success('ลบแล้ว')
  }

  return (
    <div style={{ maxWidth: 780, margin: '0 auto' }}>
      {isAdmin && (
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
          <button className="btn btn-primary" onClick={() => setModal(true)}><Plus size={14} />สร้างประกาศ</button>
        </div>
      )}

      {list.length === 0 && (
        <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-3)' }}>ยังไม่มีประกาศ</div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {list.map(a => {
          const isOpen = expanded.has(a.id)
          const authorName = a.author?.nickname ?? a.author?.full_name ?? 'ไม่ระบุ'
          const typeIcon = a.type === 'scores' ? '📊' : a.type === 'image' ? '🖼️' : '📢'
          const typeLabel = a.type === 'scores' ? 'ตารางคะแนน' : a.type === 'image' ? 'รูปภาพ' : 'ข้อความ'

          return (
            <div key={a.id} className={`feed-card ${a.is_important ? 'important' : ''}`}>
              {/* Header row */}
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                <div style={{ width: 40, height: 40, borderRadius: 12, background: 'var(--blue-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, flexShrink: 0 }}>
                  {typeIcon}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', marginBottom: 3 }}>
                    <h3 style={{ fontWeight: 700, fontSize: 15, lineHeight: 1.3 }}>{a.title}</h3>
                    {a.is_important && <span className="badge badge-blue">⭐ สำคัญ</span>}
                    <span className="badge badge-gray">{typeLabel}</span>
                  </div>
                  <p style={{ fontSize: 12, color: 'var(--text-3)' }}>
                    {authorName} · {new Date(a.created_at).toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric' })}
                  </p>
                </div>

                {/* Actions */}
                <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                  {isAdmin && <>
                    <button className="btn btn-sm btn-ghost" onClick={() => toggleImportant(a.id, a.is_important)} title={a.is_important ? 'ยกเลิกสำคัญ' : 'ทำเป็นสำคัญ'}>
                      <Star size={13} fill={a.is_important ? 'currentColor' : 'none'} style={{ color: a.is_important ? 'var(--amber)' : 'var(--text-3)' }} />
                    </button>
                    <button className="btn btn-sm btn-danger" onClick={() => del(a.id)}><Trash2 size={12} /></button>
                  </>}
                  <button className="btn btn-sm btn-ghost" onClick={() => toggle(a.id)}>
                    {isOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                  </button>
                </div>
              </div>

              {/* Content - always show a preview */}
              {a.content && !isOpen && (
                <p style={{ marginTop: 10, fontSize: 13, color: 'var(--text-2)', lineHeight: 1.6, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' as React.CSSProperties['WebkitBoxOrient'] }}>
                  {a.content}
                </p>
              )}

              {/* Expanded content */}
              {isOpen && (
                <div style={{ marginTop: 14, paddingTop: 14, borderTop: '1px solid var(--border)' }}>
                  {/* Text */}
                  {a.content && (
                    <p style={{ fontSize: 14, color: 'var(--text)', lineHeight: 1.8, marginBottom: a.image_url || a.scores_data ? 14 : 0 }}>
                      {a.content}
                    </p>
                  )}

                  {/* Image */}
                  {a.type === 'image' && a.image_url && (
                    <img src={a.image_url} alt="announcement" style={{ maxWidth: '100%', borderRadius: 'var(--r-lg)', border: '1px solid var(--border)' }} />
                  )}

                  {/* Score table */}
                  {a.type === 'scores' && a.scores_data && Array.isArray(a.scores_data) && a.scores_data.length > 0 && (
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
                        <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-2)' }}>ตารางคะแนน ({a.scores_data.length} คน)</span>
                      </div>
                      <div style={{ overflowX: 'auto', borderRadius: 'var(--r-md)', border: '1px solid var(--border)' }}>
                        <table className="tbl">
                          <thead>
                            <tr>
                              {Object.keys(a.scores_data[0]).map(k => <th key={k}>{k}</th>)}
                            </tr>
                          </thead>
                          <tbody>
                            {a.scores_data.map((row: Record<string, string | number | undefined>, i: number) => (
                              <tr key={i}>
                                {Object.values(row).map((v, j) => (
                                  <td key={j}>
                                    {typeof v === 'number' && String(Object.keys(row)[j]).includes('คะแนน')
                                      ? <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                          <div className="progress" style={{ width: 48 }}><div className="progress-fill" style={{ width: `${v}%`, background: v >= 70 ? 'var(--green)' : v >= 50 ? 'var(--amber)' : 'var(--red)' }} /></div>
                                          <span style={{ fontWeight: 600 }}>{v}</span>
                                        </div>
                                      : String(v)}
                                  </td>
                                ))}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Show/hide toggle text */}
              <button onClick={() => toggle(a.id)} style={{ marginTop: 8, background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, color: 'var(--blue)', fontWeight: 500, padding: 0, fontFamily: 'inherit' }}>
                {isOpen ? 'ย่อ ▲' : 'ดูรายละเอียด ▼'}
              </button>
            </div>
          )
        })}
      </div>

      {modal && <AddAnnouncementModal onClose={() => setModal(false)} onCreated={a => { setList(p => [a, ...p]); setModal(false) }} />}
    </div>
  )
}

function AddAnnouncementModal({ onClose, onCreated }: { onClose: () => void; onCreated: (a: Ann) => void }) {
  const [type, setType] = useState<'text' | 'image' | 'scores'>('text')
  const [form, setForm] = useState({ title: '', content: '', is_important: false })
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [scoresFile, setScoresFile] = useState<File | null>(null)
  const [saving, setSaving] = useState(false)
  const supabase = createClient()

  async function save() {
    if (!form.title.trim()) { toast.error('กรุณาใส่หัวข้อ'); return }
    setSaving(true)
    let image_url = null, scores_data = null

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
      <div className="modal">
        <div className="modal-header"><h3 style={{ fontWeight: 700 }}>สร้างประกาศใหม่</h3><button className="btn btn-icon btn-ghost" onClick={onClose}><X size={16} /></button></div>
        <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div>
            <label className="form-label">ประเภท</label>
            <div style={{ display: 'flex', gap: 6 }}>
              {(['text', 'image', 'scores'] as const).map(t => (
                <button key={t} onClick={() => setType(t)} className={`btn btn-sm ${type === t ? 'btn-primary' : ''}`}>
                  {t === 'text' ? '📢 ข้อความ' : t === 'image' ? '🖼️ รูปภาพ' : '📊 คะแนน'}
                </button>
              ))}
            </div>
          </div>
          <div><label className="form-label">หัวข้อ *</label><input className="input" value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} /></div>
          <div><label className="form-label">เนื้อหา</label><textarea className="input" rows={3} value={form.content} onChange={e => setForm(p => ({ ...p, content: e.target.value }))} /></div>
          {type === 'image' && (
            <div>
              <label className="form-label">รูปภาพ</label>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, border: '1.5px dashed var(--border-md)', borderRadius: 'var(--r-md)', padding: 12, cursor: 'pointer' }}>
                <Upload size={15} color="var(--text-3)" /><span style={{ fontSize: 13, color: 'var(--text-2)' }}>{imageFile?.name ?? 'คลิกเลือกรูป...'}</span>
                <input type="file" accept="image/*" style={{ display: 'none' }} onChange={e => setImageFile(e.target.files?.[0] ?? null)} />
              </label>
            </div>
          )}
          {type === 'scores' && (
            <div>
              <label className="form-label">ไฟล์คะแนน (CSV / Excel)</label>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, border: '1.5px dashed var(--border-md)', borderRadius: 'var(--r-md)', padding: 12, cursor: 'pointer' }}>
                <Upload size={15} color="var(--text-3)" /><span style={{ fontSize: 13, color: 'var(--text-2)' }}>{scoresFile?.name ?? 'คลิกเลือกไฟล์ .csv / .xlsx'}</span>
                <input type="file" accept=".csv,.xlsx,.xls" style={{ display: 'none' }} onChange={e => setScoresFile(e.target.files?.[0] ?? null)} />
              </label>
            </div>
          )}
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13 }}>
            <input type="checkbox" checked={form.is_important} onChange={e => setForm(p => ({ ...p, is_important: e.target.checked }))} />
            ทำเครื่องหมายว่า "สำคัญ"
          </label>
        </div>
        <div className="modal-footer">
          <button className="btn" onClick={onClose}>ยกเลิก</button>
          <button className="btn btn-primary" onClick={save} disabled={saving}>{saving ? <><div className="spinner" />กำลังสร้าง...</> : 'เผยแพร่'}</button>
        </div>
      </div>
    </div>
  )
}

