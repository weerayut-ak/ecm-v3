'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import toast from 'react-hot-toast'
import { Camera, Save, TrendingUp, CheckCircle, XCircle, Clock } from 'lucide-react'

const GRADES = ['ม.1/1','ม.1/2','ม.1/3','ม.2/1','ม.2/2','ม.2/3','ม.3/1','ม.3/2','ม.3/3']

interface Sub { id: string; score: number|null; is_passed: boolean|null; submitted_at: string; time_taken: number|null; quiz: { title: string; pass_score: number } | null }
interface Profile { id: string; full_name: string; nickname: string|null; grade: string|null; student_id: string|null; role: string; avatar_url: string|null }

export default function ProfileClient({ profile: init, submissions, userId }: { profile: Profile|null; submissions: Sub[]; userId: string }) {
  const [profile, setProfile] = useState<Profile | null>(init)
  const [form, setForm] = useState({ full_name: init?.full_name??'', nickname: init?.nickname??'', grade: init?.grade??'', student_id: init?.student_id??'' })
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const supabase = createClient()

  async function save() {
    setSaving(true)
    const { error } = await supabase.from('profiles').update(form).eq('id', userId)
    if (error) { toast.error('บันทึกไม่สำเร็จ') }
    else { toast.success('บันทึกข้อมูลแล้ว ✓'); setProfile(p => p ? { ...p, ...form } : p) }
    setSaving(false)
  }

  async function uploadAvatar(file: File) {
    setUploading(true)
    const path = `avatars/${userId}-${Date.now()}.${file.name.split('.').pop()}`
    const { error: upErr } = await supabase.storage.from('avatars').upload(path, file, { upsert: true })
    if (upErr) { toast.error('อัปโหลดไม่สำเร็จ'); setUploading(false); return }
    const { data } = supabase.storage.from('avatars').getPublicUrl(path)
    await supabase.from('profiles').update({ avatar_url: data.publicUrl }).eq('id', userId)
    setProfile(p => p ? { ...p, avatar_url: data.publicUrl } : p)
    toast.success('เปลี่ยนรูปโปรไฟล์แล้ว ✓')
    setUploading(false)
  }

  const avgScore = submissions.length > 0 ? Math.round(submissions.reduce((a,s) => a + (s.score??0), 0) / submissions.length) : 0
  const passed = submissions.filter(s => s.is_passed).length
  const name = profile?.nickname ?? profile?.full_name ?? 'Guest'
  const initial = name[0]?.toUpperCase() ?? 'G'

  return (
    <div style={{ maxWidth: 800, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Header card */}
      <div className="card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '28px 24px', textAlign: 'center' }}>
        {/* Avatar */}
        <div style={{ position: 'relative', marginBottom: 14 }}>
          <div style={{ width: 80, height: 80, borderRadius: 20, background: 'var(--blue-light)', color: 'var(--blue)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28, fontWeight: 700, overflow: 'hidden', border: '3px solid var(--blue-light)' }}>
            {profile?.avatar_url
              ? <img src={profile.avatar_url} alt="avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              : initial}
          </div>
          <label style={{ position: 'absolute', bottom: -6, right: -6, width: 28, height: 28, background: 'var(--blue)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', border: '2px solid white' }}>
            {uploading ? <div className="spinner" style={{ width: 12, height: 12, borderWidth: 1.5 }} /> : <Camera size={13} color="white" />}
            <input type="file" accept="image/*" style={{ display: 'none' }} onChange={e => e.target.files?.[0] && uploadAvatar(e.target.files[0])} />
          </label>
        </div>
        <h2 style={{ fontSize: 20, fontWeight: 700 }}>{name}</h2>
        <p style={{ color: 'var(--text-2)', fontSize: 13, marginTop: 2 }}>{profile?.student_id ?? ''} {profile?.grade ? `· ${profile.grade}` : ''}</p>
        <span className={`badge ${profile?.role === 'admin' ? 'badge-blue' : 'badge-green'}`} style={{ marginTop: 8 }}>{profile?.role === 'admin' ? '⚡ Admin' : '🎓 นักเรียน'}</span>
      </div>

      {/* Score summary */}
      {submissions.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12 }}>
          {[
            { label: 'คะแนนเฉลี่ย', value: `${avgScore}%`, icon: TrendingUp, color: 'var(--blue)' },
            { label: 'ผ่านแล้ว', value: `${passed}/${submissions.length}`, icon: CheckCircle, color: 'var(--green)' },
            { label: 'ทำแล้ว', value: `${submissions.length} ชุด`, icon: Clock, color: 'var(--purple)' },
          ].map(s => (
            <div key={s.label} className="stat-card" style={{ textAlign: 'center' }}>
              <s.icon size={20} color={s.color} style={{ margin: '0 auto 6px' }} />
              <div style={{ fontSize: 20, fontWeight: 700 }}>{s.value}</div>
              <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 2 }}>{s.label}</div>
            </div>
          ))}
        </div>
      )}

      {/* Edit form */}
      <div className="card">
        <h3 style={{ fontWeight: 700, fontSize: 15, marginBottom: 16 }}>แก้ไขข้อมูลส่วนตัว</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14 }}>
          <div>
            <label className="form-label">ชื่อ-สกุล</label>
            <input className="input" value={form.full_name} onChange={e => setForm(p => ({...p, full_name: e.target.value}))} />
          </div>
          <div>
            <label className="form-label">ชื่อเล่น</label>
            <input className="input" value={form.nickname} onChange={e => setForm(p => ({...p, nickname: e.target.value}))} />
          </div>
          <div>
            <label className="form-label">รหัสนักเรียน</label>
            <input className="input" value={form.student_id} onChange={e => setForm(p => ({...p, student_id: e.target.value}))} />
          </div>
          <div>
            <label className="form-label">ระดับชั้น</label>
            <select className="input" value={form.grade} onChange={e => setForm(p => ({...p, grade: e.target.value}))}>
              <option value="">เลือกระดับชั้น</option>
              {GRADES.map(g => <option key={g} value={g}>{g}</option>)}
            </select>
          </div>
        </div>
        <div style={{ marginTop: 16, display: 'flex', justifyContent: 'flex-end' }}>
          <button className="btn btn-primary" onClick={save} disabled={saving}>
            {saving ? <><div className="spinner" /> บันทึก...</> : <><Save size={14} /> บันทึกข้อมูล</>}
          </button>
        </div>
      </div>

      {/* Quiz history */}
      {submissions.length > 0 && (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', fontWeight: 700 }}>ประวัติการสอบ</div>
          <div style={{ overflowX: 'auto' }}>
            <table className="tbl">
              <thead><tr><th>แบบทดสอบ</th><th>คะแนน</th><th>ผล</th><th>วันที่</th></tr></thead>
              <tbody>
                {submissions.map(s => (
                  <tr key={s.id}>
                    <td style={{ fontWeight: 500 }}>{s.quiz?.title ?? '-'}</td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div className="progress" style={{ width: 60 }}>
                          <div className="progress-fill" style={{ width: `${s.score??0}%`, background: (s.is_passed) ? 'var(--green)' : 'var(--red)' }} />
                        </div>
                        <span style={{ fontWeight: 600, fontSize: 13 }}>{s.score?.toFixed(0) ?? '-'}%</span>
                      </div>
                    </td>
                    <td>
                      <span className={`badge ${s.is_passed ? 'badge-green' : 'badge-red'}`}>
                        {s.is_passed ? <><CheckCircle size={10} /> ผ่าน</> : <><XCircle size={10} /> ไม่ผ่าน</>}
                      </span>
                    </td>
                    <td style={{ color: 'var(--text-3)', fontSize: 12 }}>{new Date(s.submitted_at).toLocaleDateString('th-TH')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
