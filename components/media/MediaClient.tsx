'use client'
import { useState } from 'react'
import { BookOpen, Video, Plus, X, Tag, Play, Clock, Eye, Search, ChevronRight } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import toast from 'react-hot-toast'

interface MediaItem { id:string; type:'knowledge'|'video'; title:string; description:string|null; content:string|null; video_url:string|null; duration:string|null; tags:string[] }

function toEmbedUrl(url: string | null): string | null {
  if (!url) return null
  const m1 = url.match(/youtube\.com\/watch\?(?:.*&)?v=([\w-]+)/)
  if (m1) return `https://www.youtube.com/embed/${m1[1]}`
  const m2 = url.match(/youtu\.be\/([\w-]+)/)
  if (m2) return `https://www.youtube.com/embed/${m2[1]}`
  return url
}

const ICONS: Record<string, string> = { Grammar:'📖', Vocabulary:'📝', Reading:'📚', Writing:'✏️', Listening:'🎧', Speaking:'🗣️' }

export default function MediaClient({ knowledge: kInit, videos: vInit, isAdmin }: { knowledge:MediaItem[]; videos:MediaItem[]; isAdmin:boolean }) {
  const [tab, setTab] = useState<'knowledge'|'video'>('knowledge')
  const [knowledge, setKnowledge] = useState(kInit)
  const [videos, setVideos] = useState(vInit)
  const [selected, setSelected] = useState<MediaItem|null>(null)
  const [addModal, setAddModal] = useState<'knowledge'|'video'|null>(null)
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
    const { data, error } = await supabase.from('media_items').insert({ ...form, type: addModal }).select().single()
    if (error || !data) { toast.error('เพิ่มไม่สำเร็จ'); return }
    if (addModal === 'knowledge') setKnowledge(p => [...p, data])
    else setVideos(p => [...p, data])
    toast.success('เพิ่มสำเร็จ ✓')
    setAddModal(null)
  }

  return (
    <div style={{ maxWidth: 960, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:20, flexWrap:'wrap' }}>
        <div style={{ position:'relative', flex:1, minWidth:200 }}>
          <Search size={14} style={{ position:'absolute', left:10, top:'50%', transform:'translateY(-50%)', color:'var(--text-3)' }} />
          <input className="input" style={{ paddingLeft:32 }} placeholder="ค้นหาหัวข้อ..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        {isAdmin && (
          <button className="btn btn-primary" onClick={() => setAddModal(tab)}>
            <Plus size={14} /> เพิ่ม{tab==='knowledge'?'เนื้อหา':'วีดีโอ'}
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="tab-bar" style={{ marginBottom:24 }}>
        <button className={`tab ${tab==='knowledge'?'active':''}`} onClick={()=>{setTab('knowledge');setSearch('')}}>
          <BookOpen size={14} style={{display:'inline',marginRight:5}} />คลังความรู้ <span style={{fontSize:11,opacity:0.6,marginLeft:4}}>({knowledge.length})</span>
        </button>
        <button className={`tab ${tab==='video'?'active':''}`} onClick={()=>{setTab('video');setSearch('')}}>
          <Video size={14} style={{display:'inline',marginRight:5}} />วีดีโอการสอน <span style={{fontSize:11,opacity:0.6,marginLeft:4}}>({videos.length})</span>
        </button>
      </div>

      {/* Knowledge grid */}
      {tab === 'knowledge' && (
        <div>
          {filteredK.length === 0 ? (
            <div style={{ textAlign:'center', padding:'60px 0', color:'var(--text-3)' }}>
              <BookOpen size={40} style={{ margin:'0 auto 12px', opacity:0.3 }} />
              <p>ยังไม่มีเนื้อหา</p>
            </div>
          ) : (
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(280px, 1fr))', gap:16 }} className="stagger">
              {filteredK.map(k => {
                const icon = k.tags?.find(t => ICONS[t]) ? ICONS[k.tags.find(t => ICONS[t])!] : '📄'
                return (
                  <div key={k.id} className="knowledge-card fade-up" onClick={() => setSelected(k)}>
                    <div className="knowledge-card-header" style={{ background:'linear-gradient(135deg, #F0F9FF, #EFF6FF)' }}>
                      <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', gap:10 }}>
                        <div style={{ fontSize:32 }}>{icon}</div>
                        {isAdmin && (
                          <button className="btn btn-sm btn-danger" onClick={e=>{e.stopPropagation();handleDelete(k)}}>ลบ</button>
                        )}
                      </div>
                      <h3 style={{ fontSize:15, fontWeight:700, marginTop:10, marginBottom:4 }}>{k.title}</h3>
                      <p style={{ fontSize:12, color:'var(--text-2)', lineHeight:1.5 }}>{k.description}</p>
                    </div>
                    <div className="knowledge-card-body">
                      <div style={{ display:'flex', flexWrap:'wrap', gap:5, marginBottom:10 }}>
                        {k.tags?.map(t => <span key={t} className="badge badge-blue" style={{ fontSize:10 }}><Tag size={8}/>{t}</span>)}
                      </div>
                      {k.content && (
                        <p style={{ fontSize:12, color:'var(--text-2)', lineHeight:1.6, display:'-webkit-box', WebkitLineClamp:3, WebkitBoxOrient:'vertical', overflow:'hidden' }}>
                          {k.content}
                        </p>
                      )}
                      <div style={{ display:'flex', alignItems:'center', gap:4, marginTop:10, fontSize:12, color:'var(--blue)', fontWeight:600 }}>
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

      {/* Video grid */}
      {tab === 'video' && (
        <div>
          {filteredV.length === 0 ? (
            <div style={{ textAlign:'center', padding:'60px 0', color:'var(--text-3)' }}>
              <Video size={40} style={{ margin:'0 auto 12px', opacity:0.3 }} />
              <p>ยังไม่มีวีดีโอ</p>
            </div>
          ) : (
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(260px, 1fr))', gap:16 }} className="stagger">
              {filteredV.map(v => (
                <div key={v.id} className="video-card fade-up" onClick={() => setSelected(v)}>
                  <div className="video-thumb">
                    <div className="video-play"><Play size={20} color="white" fill="white" /></div>
                    {v.duration && <span style={{ position:'absolute', bottom:8, right:8, background:'rgba(0,0,0,0.6)', color:'white', fontSize:11, padding:'2px 6px', borderRadius:4 }}>{v.duration}</span>}
                  </div>
                  <div style={{ padding:'12px 14px' }}>
                    <h3 style={{ fontSize:13, fontWeight:600, lineHeight:1.4, marginBottom:5 }}>{v.title}</h3>
                    <p style={{ fontSize:11, color:'var(--text-3)', lineHeight:1.4, display:'-webkit-box', WebkitLineClamp:2, WebkitBoxOrient:'vertical', overflow:'hidden' }}>{v.description}</p>
                    {isAdmin && <button className="btn btn-sm btn-danger" style={{ marginTop:8 }} onClick={e=>{e.stopPropagation();handleDelete(v)}}>ลบ</button>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Detail modal */}
      {selected && (
        <div className="modal-overlay" onClick={e => e.target===e.currentTarget && setSelected(null)}>
          <div className="modal" style={{ maxWidth:560 }}>
            <div className="modal-header">
              <h3 style={{ fontWeight:700, fontSize:16 }}>{selected.title}</h3>
              <button className="btn btn-icon btn-ghost" onClick={() => setSelected(null)}><X size={16} /></button>
            </div>
            <div className="modal-body">
              {selected.type === 'video' && (
                <div style={{ borderRadius:'var(--r-lg)', overflow:'hidden', marginBottom:16, background:'#E8F0FE', aspectRatio:'16/9', display:'flex', alignItems:'center', justifyContent:'center' }}>
                  {selected.video_url
                    ? <iframe src={toEmbedUrl(selected.video_url)} style={{ width:'100%', height:'100%' }} allowFullScreen />
                    : <div style={{ textAlign:'center' }}><Play size={40} color="var(--blue)" style={{margin:'0 auto 8px'}}/><p style={{fontSize:12,color:'var(--text-3)'}}>ยังไม่มี URL วีดีโอ</p></div>}
                </div>
              )}
              {selected.type === 'knowledge' && (
                <div style={{ background:'linear-gradient(135deg,#F0F9FF,#EFF6FF)', borderRadius:'var(--r-lg)', padding:'16px', marginBottom:16, fontSize:28, textAlign:'center' }}>
                  {selected.tags?.find(t => ICONS[t]) ? ICONS[selected.tags.find(t => ICONS[t])!] : '📄'}
                </div>
              )}
              {selected.description && <p style={{ fontSize:13, color:'var(--text-2)', marginBottom:12, lineHeight:1.7 }}>{selected.description}</p>}
              {selected.content && (
                <div style={{ background:'#FAFAFA', borderRadius:'var(--r-md)', padding:'14px 16px', fontSize:13, lineHeight:1.8, color:'var(--text)', whiteSpace:'pre-wrap', border:'1px solid var(--border)', maxHeight:300, overflowY:'auto' }}>
                  {selected.content}
                </div>
              )}
              {selected.tags?.length > 0 && (
                <div style={{ display:'flex', flexWrap:'wrap', gap:6, marginTop:12 }}>
                  {selected.tags.map(t => <span key={t} className="badge badge-blue">{t}</span>)}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Add modal */}
      {addModal && <AddModal type={addModal} onClose={() => setAddModal(null)} onSave={handleAdd} />}
    </div>
  )
}

function AddModal({ type, onClose, onSave }: { type:'knowledge'|'video'; onClose:()=>void; onSave:(f:Partial<MediaItem>)=>void }) {
  const [form, setForm] = useState<Partial<MediaItem>>({ tags:[] })
  const [tagInput, setTagInput] = useState('')
  const [saving, setSaving] = useState(false)

  async function save() {
    if (!form.title?.trim()) { toast.error('กรุณาใส่ชื่อ'); return }
    setSaving(true)
    await onSave(form)
    setSaving(false)
  }

  return (
    <div className="modal-overlay" onClick={e => e.target===e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header">
          <h3 style={{ fontWeight:700 }}>เพิ่ม{type==='knowledge'?'เนื้อหา':'วีดีโอ'}</h3>
          <button className="btn btn-icon btn-ghost" onClick={onClose}><X size={16} /></button>
        </div>
        <div className="modal-body" style={{ display:'flex', flexDirection:'column', gap:12 }}>
          <div><label className="form-label">ชื่อหัวข้อ *</label><input className="input" value={form.title??''} onChange={e => setForm(p=>({...p,title:e.target.value}))} /></div>
          <div><label className="form-label">คำอธิบาย</label><input className="input" value={form.description??''} onChange={e => setForm(p=>({...p,description:e.target.value}))} /></div>
          {type==='knowledge' && <div><label className="form-label">เนื้อหา</label><textarea className="input" rows={5} value={form.content??''} onChange={e => setForm(p=>({...p,content:e.target.value}))} /></div>}
          {type==='video' && <div><label className="form-label">URL วีดีโอ (YouTube Embed)</label><input className="input" placeholder="https://www.youtube.com/watch?v=... หรือ embed URL" value={form.video_url??''} onChange={e => setForm(p=>({...p,video_url:e.target.value}))} /></div>}
          {type==='video' && <div><label className="form-label">ความยาว</label><input className="input" placeholder="12:34" value={form.duration??''} onChange={e => setForm(p=>({...p,duration:e.target.value}))} /></div>}
          <div>
            <label className="form-label">แท็ก</label>
            <div style={{ display:'flex', gap:6, marginBottom:6 }}>
              <input className="input" value={tagInput} onChange={e => setTagInput(e.target.value)} onKeyDown={e => { if(e.key==='Enter'){e.preventDefault();if(tagInput.trim()){setForm(p=>({...p,tags:[...(p.tags??[]),tagInput.trim()]}));setTagInput('')}}}} placeholder="พิมพ์แล้วกด Enter" />
            </div>
            <div style={{ display:'flex', flexWrap:'wrap', gap:5 }}>
              {form.tags?.map((t,i) => <span key={i} className="badge badge-blue" style={{ cursor:'pointer' }} onClick={() => setForm(p=>({...p,tags:p.tags?.filter((_,j)=>j!==i)}))}>{t} ×</span>)}
            </div>
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn" onClick={onClose}>ยกเลิก</button>
          <button className="btn btn-primary" onClick={save} disabled={saving}>{saving ? <><div className="spinner"/>บันทึก...</> : 'บันทึก'}</button>
        </div>
      </div>
    </div>
  )
}