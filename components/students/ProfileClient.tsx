'use client'

import React, { useState, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import toast from 'react-hot-toast'
import { 
  Camera, Save, TrendingUp, CheckCircle, XCircle, Clock, 
  BookOpen, CreditCard, GraduationCap, LogOut,
  Sliders, Trophy, ArrowUpDown, Calendar, ArrowRight,
  ChevronUp, ChevronDown, Zap, ShieldCheck
} from 'lucide-react'
import { ROLES } from '@/constants/roles'

export interface Quiz {
  title: string;
  pass_score: number;
}

export interface Submission {
  id: string;
  score: number | null;
  raw_score?: number;
  max_score?: number;
  is_passed: boolean | null;
  submitted_at: string;
  time_taken: number | null;
  quiz: Quiz | null;
}

export interface Profile {
  id: string;
  full_name: string;
  nickname: string | null;
  grade: string | null;
  student_id: string | null;
  role: string;
  avatar_url: string | null;
}

export interface ProfileClientProps {
  profile: Profile | null;
  submissions?: Submission[];
  userId: string;
}

const GRADES: string[] = ['ม.1/1', 'ม.1/2', 'ม.1/3', 'ม.2/1', 'ม.2/2', 'ม.2/3', 'ม.3/1', 'ม.3/2', 'ม.3/3']

export default function ProfileClient({ 
  profile: initialProfile, 
  submissions = [], 
  userId 
}: ProfileClientProps) {
  
  const [profile, setProfile] = useState<Profile | null>(initialProfile)
  const [showEdit, setShowEdit] = useState<boolean>(false)
  const [saving, setSaving] = useState<boolean>(false)
  const [uploading, setUploading] = useState<boolean>(false)
  
  const supabase = createClient()

  // ── ตรวจสอบสิทธิ์ผู้ใช้งาน ──────────────────────────────────────────────────
  const isAdmin = profile?.role === ROLES.ADMIN

  const [form, setForm] = useState({
    full_name: profile?.full_name ?? '',
    nickname: profile?.nickname ?? '',
    grade: profile?.grade ?? '',
    student_id: profile?.student_id ?? ''
  })

  const [searchQuiz, setSearchQuiz] = useState<string>('')
  const [filterPassed, setFilterPassed] = useState<string>('all') 
  const [sortConfig, setSortConfig] = useState<{ key: keyof Submission | 'quiz.title'; direction: 'ascending' | 'descending' }>({ 
    key: 'submitted_at', 
    direction: 'descending' 
  })

  async function save() {
    setSaving(true)
    try {
      const { error } = await supabase
        .from('profiles')
        .update(form)
        .eq('id', userId)
      
      if (error) throw error

      setProfile((prev: Profile | null) => prev ? { ...prev, ...form } : prev)
      toast.success('บันทึกการแก้ไขข้อมูลส่วนตัวเรียบร้อยแล้ว ✓')
      setShowEdit(false)
    } catch (err) {
      toast.error('บันทึกไม่สำเร็จ กรุณาตรวจสอบการเชื่อมต่ออินเทอร์เน็ต')
    } finally {
      setSaving(false)
    }
  }

  async function logout() {
    try {
      await supabase.auth.signOut()
      toast.success('ออกจากระบบเรียบร้อยแล้ว ⚡')
      setTimeout(() => { window.location.href = '/login' }, 1000)
    } catch (err) {
      toast.error('ไม่สามารถออกจากระบบได้ในขณะนี้')
    }
  }

  async function uploadAvatar(file: File) {
    if (!file) return
    setUploading(true)
    try {
      const fileExt = file.name.split('.').pop()
      const path = `avatars/${userId}-${Date.now()}.${fileExt}`
      
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(path, file, { upsert: true })
      
      if (uploadError) throw uploadError
      
      const { data } = supabase.storage.from('avatars').getPublicUrl(path)
      
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: data.publicUrl })
        .eq('id', userId)

      if (updateError) throw updateError

      setProfile((prev: Profile | null) => prev ? { ...prev, avatar_url: data.publicUrl } : prev)
      toast.success('เปลี่ยนรูปประจำตัวใหม่สำเร็จแล้ว ✨')
    } catch (err) {
      toast.error('อัปโหลดรูปภาพล้มเหลว กรุณาลองใหม่อีกครั้ง')
    } finally {
      setUploading(false)
    }
  }

  const requestSort = (key: keyof Submission | 'quiz.title') => {
    let direction: 'ascending' | 'descending' = 'ascending'
    if (sortConfig.key === key && sortConfig.direction === 'ascending') {
      direction = 'descending'
    }
    setSortConfig({ key, direction })
  }

  const resolvedSubmissions = useMemo<Submission[]>(() => {
    return submissions.map((s: Submission) => ({
      ...s,
      raw_score: s.raw_score ?? Math.round(((s.score ?? 0) / 100) * 20),
      max_score: s.max_score ?? 20
    }))
  }, [submissions])

  const processedSubmissions = useMemo<Submission[]>(() => {
    const result = resolvedSubmissions.filter((s: Submission) => {
      const titleMatch = s.quiz?.title?.toLowerCase().includes(searchQuiz.toLowerCase()) ?? true
      const passMatch = filterPassed === 'all' 
        ? true 
        : filterPassed === 'passed' 
          ? s.is_passed === true 
          : s.is_passed === false
      return titleMatch && passMatch
    })

    if (sortConfig.key) {
      result.sort((a: Submission, b: Submission) => {
        const aValue = sortConfig.key === 'quiz.title' ? (a.quiz?.title || '') : a[sortConfig.key as keyof Submission]
        const bValue = sortConfig.key === 'quiz.title' ? (b.quiz?.title || '') : b[sortConfig.key as keyof Submission]
        if (aValue === null || aValue === undefined) return 1
        if (bValue === null || bValue === undefined) return -1
        if (aValue < bValue) return sortConfig.direction === 'ascending' ? -1 : 1
        if (aValue > bValue) return sortConfig.direction === 'ascending' ? 1 : -1
        return 0
      })
    }
    return result
  }, [resolvedSubmissions, searchQuiz, filterPassed, sortConfig])

  const avgScore = resolvedSubmissions.length > 0 
    ? Math.round(resolvedSubmissions.reduce((acc: number, s: Submission) => acc + (s.score ?? 0), 0) / resolvedSubmissions.length) 
    : 0
  const passedCount = resolvedSubmissions.filter((s: Submission) => s.is_passed).length
  const passRate = resolvedSubmissions.length > 0 
    ? Math.round((passedCount / resolvedSubmissions.length) * 100) 
    : 0

  const name = profile?.nickname ?? profile?.full_name ?? 'ผู้ใช้งานทั่วไป'
  const initial = name[0]?.toUpperCase() ?? 'U'

  return (
    <div className="min-h-screen bg-slate-50/50 text-slate-800 p-4 sm:p-6 md:p-8 font-sans">
      <div className="max-w-5xl mx-auto flex flex-col gap-6">

        {/* ── 1. HELP BANNER (role-aware) ── */}
        <a
          href="/dashboard/help"
          className={`group relative overflow-hidden flex flex-col sm:flex-row items-start sm:items-center justify-between p-5 rounded-3xl text-white shadow-sm hover:shadow-md transition-all duration-300 ${
            isAdmin
              ? 'bg-gradient-to-r from-violet-700 via-violet-600 to-indigo-600'
              : 'bg-gradient-to-r from-blue-700 via-indigo-600 to-violet-700'
          }`}
        >
          {/* decorative blob */}
          <div className="absolute top-0 right-0 w-48 h-48 bg-white/10 rounded-full blur-2xl -mr-16 -mt-16 transition-transform duration-500 group-hover:scale-125" />
          
          <div className="flex items-center gap-4 z-10">
            <div className={`w-11 h-11 rounded-2xl bg-white/15 flex items-center justify-center flex-shrink-0 group-hover:rotate-6 transition-transform duration-300`}>
              {isAdmin ? <ShieldCheck size={20} className="text-white" /> : <BookOpen size={20} className="text-white" />}
            </div>
            <div>
              <div className="font-bold text-sm flex items-center gap-1.5">
                {isAdmin
                  ? <><Zap size={13} /> คู่มือสำหรับผู้ดูแลระบบ (Admin)</>
                  : <>📘 คู่มือการใช้งานระบบแบบทดสอบออนไลน์</>
                }
              </div>
              <p className="text-[11px] text-white/80 mt-0.5 font-medium leading-relaxed max-w-lg">
                {isAdmin
                  ? 'ศึกษาแนวทางการจัดการข้อมูลนักเรียน แบบทดสอบ สื่อการเรียนรู้ การสแกน OMR และการส่งออกรายงานผลคะแนน'
                  : 'ตรวจสอบคู่มือการทำแบบทดสอบ เกณฑ์การประเมิน และแนวทางการใช้งานระบบอย่างเป็นขั้นตอน'
                }
              </p>
            </div>
          </div>
          
          <div className="mt-4 sm:mt-0 px-3.5 py-1.5 bg-white/15 hover:bg-white text-white hover:text-indigo-950 text-xs font-bold rounded-xl flex items-center gap-1.5 tracking-wide transition-all self-end sm:self-auto z-10 border border-white/10 whitespace-nowrap">
            <span>{isAdmin ? 'เปิดคู่มือผู้ดูแลระบบ' : 'ดูคู่มือผู้เรียน'}</span>
            <ArrowRight size={13} className="group-hover:translate-x-1 transition-transform" />
          </div>
        </a>

        {/* ── 2. HERO PROFILE CARD ── */}
        <div className="relative overflow-hidden bg-white border border-slate-100 rounded-3xl p-6 sm:p-8 flex flex-col sm:flex-row items-center sm:items-start gap-6 shadow-sm">
          <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${
            isAdmin ? 'from-violet-500 via-violet-400 to-indigo-500' : 'from-blue-500 via-indigo-500 to-violet-500'
          }`} />
          
          {/* Avatar */}
          <div className="relative flex-shrink-0 group">
            <div className="relative w-24 h-24 rounded-3xl overflow-hidden bg-indigo-50 border-4 border-white shadow-sm transition-all duration-300 group-hover:scale-105">
              {profile?.avatar_url ? (
                <img src={profile.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
              ) : (
                <div className={`w-full h-full flex items-center justify-center text-white text-3xl font-extrabold bg-gradient-to-br ${
                  isAdmin ? 'from-violet-500 to-violet-700' : 'from-indigo-500 to-indigo-700'
                }`}>
                  {initial}
                </div>
              )}
              <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity duration-300">
                <Camera size={18} className="text-white" />
              </div>
            </div>

            <label className={`absolute -bottom-1 -right-1 w-8 h-8 text-white rounded-xl flex items-center justify-center cursor-pointer shadow-md border-2 border-white transition-all hover:scale-110 ${
              isAdmin ? 'bg-violet-600 hover:bg-violet-700' : 'bg-indigo-600 hover:bg-indigo-700'
            }`}>
              {uploading
                ? <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                : <Camera size={12} />
              }
              <input type="file" accept="image/*" className="hidden" onChange={e => e.target.files?.[0] && uploadAvatar(e.target.files[0])} />
            </label>
          </div>

          {/* Profile Info */}
          <div className="flex-grow text-center sm:text-left space-y-2.5">
            <div className="flex flex-col sm:flex-row items-center gap-2 justify-center sm:justify-start">
              <h2 className="text-xl font-bold tracking-tight text-slate-900">{name}</h2>
              <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[9px] font-bold border ${
                isAdmin
                  ? 'bg-violet-50 text-violet-700 border-violet-100'
                  : 'bg-emerald-50 text-emerald-700 border-emerald-100'
              }`}>
                {isAdmin ? '⚡ ผู้ดูแลระบบ (Admin)' : '🎓 ผู้เรียน'}
              </span>
            </div>

            <div className="text-xs text-slate-500 font-semibold flex items-center justify-center sm:justify-start gap-2 flex-wrap">
              {profile?.student_id && (
                <span className="inline-flex items-center gap-1 bg-slate-100 text-slate-700 px-2.5 py-1 rounded-lg">
                  <CreditCard size={12} />
                  รหัสนักเรียน: {profile.student_id}
                </span>
              )}
              {profile?.grade && (
                <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg ${
                  isAdmin ? 'bg-violet-50 text-violet-700' : 'bg-indigo-50 text-indigo-700'
                }`}>
                  <GraduationCap size={12} />
                  ระดับชั้น: {profile.grade}
                </span>
              )}
            </div>

            <div className="pt-1 flex flex-wrap justify-center sm:justify-start gap-4 text-[10px] text-slate-400 font-semibold">
              <span className="flex items-center gap-1">
                <Calendar size={12} />
                {isAdmin ? 'ผู้จัดการระบบการเรียนรู้' : 'ระบบการเรียนรู้'}
              </span>
              <span className="hidden sm:inline">•</span>
              <span className="flex items-center gap-1">
                <Trophy size={12} className="text-amber-500" />
                สถานะการเข้าใช้งานระบบ: ดีเยี่ยม
              </span>
            </div>
          </div>

          {/* Edit Button */}
          <div className="flex-shrink-0 self-center sm:self-start">
            <button
              onClick={() => {
                setShowEdit(!showEdit)
                if (!showEdit) {
                  setForm({
                    full_name: profile?.full_name ?? '',
                    nickname: profile?.nickname ?? '',
                    grade: profile?.grade ?? '',
                    student_id: profile?.student_id ?? ''
                  })
                }
              }}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold border transition-all ${
                showEdit
                  ? 'bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-200/70'
                  : isAdmin
                    ? 'bg-violet-50 hover:bg-violet-100/80 border-violet-100 text-violet-700 shadow-sm'
                    : 'bg-indigo-50 hover:bg-indigo-100/80 border-indigo-100 text-indigo-700 shadow-sm'
              }`}
            >
              <Sliders size={13} className={showEdit ? 'rotate-180 transition-transform duration-300' : 'transition-transform duration-300'} />
              <span>{showEdit ? 'ปิดหน้าต่างแก้ไขข้อมูล' : 'แก้ไขข้อมูลโปรไฟล์'}</span>
            </button>
          </div>
        </div>

        {/* ── 3. COLLAPSIBLE EDIT FORM ── */}
        <div className={`grid transition-all duration-300 ease-in-out ${
          showEdit ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'
        }`}>
          <div className="overflow-hidden">
            <div className={`bg-white border rounded-3xl p-6 shadow-sm space-y-4 mt-0 ${
              isAdmin ? 'border-violet-100' : 'border-indigo-100'
            }`}>

              {/* header */}
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <Sliders size={15} className={isAdmin ? 'text-violet-600' : 'text-indigo-600'} />
                  <h3 className="font-bold text-sm text-slate-800">แก้ไขข้อมูลโปรไฟล์</h3>
                </div>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                  isAdmin ? 'text-violet-500 bg-violet-50' : 'text-indigo-500 bg-indigo-50'
                }`}>
                  กรุณากดบันทึกเพื่ออัปเดตข้อมูลในระบบ
                </span>
              </div>

              {/* fields */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  { label: 'ชื่อ-นามสกุล', key: 'full_name' },
                  { label: 'ชื่อเล่น',      key: 'nickname'  },
                  { label: 'รหัสนักเรียน',   key: 'student_id'},
                ].map(field => (
                  <div key={field.key}>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">{field.label}</label>
                    <input
                      type="text"
                      className={`w-full bg-slate-50/70 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none focus:bg-white text-slate-700 transition-all ${
                        isAdmin ? 'focus:border-violet-400' : 'focus:border-indigo-400'
                      }`}
                      value={form[field.key as keyof typeof form]}
                      onChange={e => setForm(p => ({ ...p, [field.key]: e.target.value }))}
                    />
                  </div>
                ))}
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">ระดับชั้น / ห้องเรียน</label>
                  <select
                    className={`w-full bg-slate-50/70 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none focus:bg-white text-slate-700 transition-all ${
                      isAdmin ? 'focus:border-violet-400' : 'focus:border-indigo-400'
                    }`}
                    value={form.grade}
                    onChange={e => setForm(p => ({ ...p, grade: e.target.value }))}
                  >
                    <option value="">เลือกระดับชั้น</option>
                    {GRADES.map((g: string) => <option key={g} value={g}>{g}</option>)}
                  </select>
                </div>
              </div>

              {/* actions */}
              <div className="flex justify-end gap-2 pt-2 border-t border-slate-50">
                <button
                  onClick={() => setShowEdit(false)}
                  className="px-4 py-1.5 rounded-xl text-xs font-bold text-slate-500 hover:bg-slate-100 transition-all"
                >
                  ยกเลิก
                </button>
                <button
                  onClick={save}
                  disabled={saving}
                  className={`inline-flex items-center gap-1.5 text-white px-4 py-1.5 rounded-xl text-xs font-bold transition-all shadow-sm disabled:opacity-60 ${
                    isAdmin ? 'bg-violet-600 hover:bg-violet-700' : 'bg-indigo-600 hover:bg-indigo-700'
                  }`}
                >
                  {saving
                    ? <><div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" /><span>กำลังบันทึก...</span></>
                    : <><Save size={12} /><span>บันทึกข้อมูล</span></>
                  }
                </button>
              </div>

            </div>
          </div>
        </div>

        {/* ── 4. STATISTICS CARDS ── */}
        {resolvedSubmissions.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm relative overflow-hidden">
              <div className="absolute top-0 right-0 w-20 h-20 bg-blue-500/5 rounded-full blur-xl -mr-4 -mt-4" />
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-slate-400 tracking-wider uppercase">คะแนนเฉลี่ยสะสมทั้งหมด</span>
                <div className="p-2 bg-blue-50/50 text-blue-600 rounded-xl"><TrendingUp size={16} /></div>
              </div>
              <div className="space-y-1">
                <div className="text-2xl font-black text-slate-900">{avgScore}%</div>
                <div className="w-full bg-slate-100 h-1 rounded-full overflow-hidden">
                  <div className="h-full bg-blue-500 rounded-full transition-all duration-1000" style={{ width: `${avgScore}%` }} />
                </div>
                <p className="text-[10px] text-slate-400 font-semibold">คำนวณจากผลการทดสอบทั้งหมดในระบบ</p>
              </div>
            </div>

            <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm relative overflow-hidden">
              <div className="absolute top-0 right-0 w-20 h-20 bg-emerald-500/5 rounded-full blur-xl -mr-4 -mt-4" />
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-slate-400 tracking-wider uppercase">อัตราการผ่านประเมิน</span>
                <div className="p-2 bg-emerald-50/50 text-emerald-600 rounded-xl"><CheckCircle size={16} /></div>
              </div>
              <div className="space-y-1">
                <div className="text-2xl font-black text-slate-900 flex items-baseline gap-1.5">
                  <span>{passedCount} / {resolvedSubmissions.length}</span>
                  <span className="text-xs text-emerald-600 font-bold">({passRate}%)</span>
                </div>
                <div className="w-full bg-slate-100 h-1 rounded-full overflow-hidden">
                  <div className="h-full bg-emerald-500 rounded-full transition-all duration-1000" style={{ width: `${passRate}%` }} />
                </div>
                <p className="text-[10px] text-slate-400 font-semibold">เกณฑ์การผ่านประเมินร้อยละ 70 ของข้อสอบแต่ละชุด</p>
              </div>
            </div>

            <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm relative overflow-hidden">
              <div className="absolute top-0 right-0 w-20 h-20 bg-violet-500/5 rounded-full blur-xl -mr-4 -mt-4" />
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-slate-400 tracking-wider uppercase">ประวัติการเข้าทดสอบ</span>
                <div className="p-2 bg-violet-50/50 text-violet-600 rounded-xl"><Clock size={16} /></div>
              </div>
              <div className="space-y-1">
                <div className="text-2xl font-black text-slate-900">{resolvedSubmissions.length} ชุดทดสอบ</div>
                <div className="w-full bg-slate-100 h-1 rounded-full overflow-hidden">
                  <div className="h-full bg-violet-500 rounded-full w-full" />
                </div>
                <p className="text-[10px] text-slate-400 font-semibold">ประวัติการส่งผลคะแนนเข้าสู่ระบบทั้งหมด</p>
              </div>
            </div>
          </div>
        )}

        {/* ── 5. SUBMISSIONS TABLE ── */}
        <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-100 gap-3">
            <div className="flex items-center gap-2">
              <div className={`w-8 h-8 rounded-lg bg-slate-50 border border-slate-100 flex items-center justify-center ${
                isAdmin ? 'text-violet-600' : 'text-indigo-600'
              }`}>
                <Trophy size={14} />
              </div>
              <h3 className="font-bold text-sm text-slate-800">รายงานประวัติการทำแบบทดสอบ</h3>
            </div>
            <span className="text-[10px] bg-slate-50 border border-slate-100 text-slate-600 font-extrabold px-2.5 py-1 rounded-full">
              รายการทั้งหมด: {processedSubmissions.length} รายการ
            </span>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
            <div className="relative flex-1">
              <input
                type="text"
                placeholder="🔍 ค้นหาหัวข้อแบบทดสอบ..."
                className={`w-full bg-slate-50/70 border border-slate-200 rounded-xl pl-4 pr-4 py-2.5 text-xs font-semibold focus:outline-none focus:bg-white text-slate-700 transition-all ${
                  isAdmin ? 'focus:border-violet-400' : 'focus:border-indigo-400'
                }`}
                value={searchQuiz}
                onChange={e => setSearchQuiz(e.target.value)}
              />
            </div>
            <div className="flex bg-slate-50/70 p-1 rounded-xl border border-slate-200/60 max-w-sm">
              {[
                { id: 'all', label: 'ทั้งหมด' },
                { id: 'passed', label: 'ผ่านเกณฑ์' },
                { id: 'failed', label: 'ไม่ผ่านเกณฑ์' },
              ].map(f => (
                <button
                  key={f.id}
                  onClick={() => setFilterPassed(f.id)}
                  className={`flex-1 text-[11px] font-bold py-1.5 px-3.5 rounded-lg transition-all whitespace-nowrap ${
                    filterPassed === f.id
                      ? f.id === 'failed'
                        ? 'bg-rose-600 text-white shadow-sm'
                        : f.id === 'passed'
                          ? isAdmin ? 'bg-violet-600 text-white shadow-sm' : 'bg-indigo-600 text-white shadow-sm'
                          : 'bg-white shadow-sm text-indigo-950 border border-slate-200/20'
                      : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          <div className="w-full overflow-hidden border border-slate-200/50 rounded-2xl shadow-sm bg-white">
            {processedSubmissions.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50/50 border-b border-slate-200 text-[10px] font-extrabold uppercase text-slate-400 tracking-wider">
                      {[
                        { key: 'quiz.title', label: 'หัวข้อแบบทดสอบ', w: '' },
                        { key: 'raw_score', label: 'คะแนนที่ได้', w: 'w-[140px]' },
                        { key: 'score', label: 'คะแนนร้อยละ (%)', w: 'w-[160px]' },
                        { key: 'is_passed', label: 'ผลการประเมิน', w: 'w-[110px]' },
                        { key: 'submitted_at', label: 'วันที่ส่งผลการทดสอบ', w: 'w-[130px]' },
                      ].map(col => (
                        <th
                          key={col.key}
                          onClick={() => requestSort(col.key as keyof Submission | 'quiz.title')}
                          className={`py-3 px-4 select-none cursor-pointer hover:bg-slate-100/80 hover:text-slate-600 transition-colors ${col.w}`}
                        >
                          <div className="flex items-center gap-1.5">
                            <span>{col.label}</span>
                            <ArrowUpDown size={10} className="text-slate-300" />
                          </div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                    {processedSubmissions.map((s: Submission, idx: number) => {
                      const passed = s.is_passed
                      return (
                        <tr key={s.id || idx.toString()} className="hover:bg-slate-50/30 transition-all duration-150">
                          <td className="py-3.5 px-4">
                            <div className="flex flex-col">
                              <span className="font-bold text-slate-800 text-xs">{s.quiz?.title || 'ไม่ระบุชื่อแบบทดสอบ'}</span>
                              <span className="text-[9px] text-slate-400 font-bold mt-0.5 tracking-wider uppercase">SUBMISSION ID: {s.id}</span>
                            </div>
                          </td>
                          <td className="py-3.5 px-4 whitespace-nowrap">
                            <div className="flex items-center gap-1 font-extrabold text-slate-700">
                              <span>{s.raw_score}</span>
                              <span className="text-slate-300 font-normal">/</span>
                              <span className="text-slate-400 font-normal">{s.max_score}</span>
                              <span className="text-[10px] text-slate-400 font-normal ml-1">คะแนน</span>
                            </div>
                          </td>
                          <td className="py-3.5 px-4">
                            <div className="flex items-center gap-2.5">
                              <span className={`text-xs font-black min-w-[32px] ${passed ? 'text-emerald-700' : 'text-rose-700'}`}>
                                {s.score ?? 0}%
                              </span>
                              <div className="hidden md:block flex-1 max-w-[80px] bg-slate-100 h-1.5 rounded-full overflow-hidden">
                                <div className={`h-full rounded-full transition-all duration-500 ${passed ? 'bg-emerald-500' : 'bg-rose-500'}`} style={{ width: `${s.score ?? 0}%` }} />
                              </div>
                            </div>
                          </td>
                          <td className="py-3.5 px-4 whitespace-nowrap">
                            <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[9px] font-extrabold border ${
                              passed
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-100'
                                : 'bg-rose-50 text-rose-700 border-rose-100'
                            }`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${passed ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                              {passed ? 'ผ่านเกณฑ์' : 'ไม่ผ่านเกณฑ์'}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 whitespace-nowrap text-[10px] font-extrabold text-slate-400">
                            {new Date(s.submitted_at).toLocaleDateString('th-TH', { year: 'numeric', month: 'short', day: 'numeric' })}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="py-12 text-center text-slate-400 space-y-2 border border-dashed border-slate-200 rounded-2xl bg-slate-50/20">
                <Sliders size={24} className="mx-auto text-slate-300 animate-pulse" />
                <p className="text-xs font-bold text-slate-500">ไม่พบข้อมูลประวัติการทดสอบที่ตรงตามเงื่อนไข</p>
                <p className="text-[10px]">กรุณาปรับเปลี่ยนคำค้นหาหรือตัวกรองใหม่อีกครั้ง</p>
              </div>
            )}
          </div>

          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between text-[10px] text-slate-400 font-semibold px-1 gap-2">
            <p>💡 คำแนะนำ: คลิกที่หัวตารางเพื่อจัดเรียงลำดับข้อมูลตามหัวข้อที่ต้องการ</p>
            <div className="flex items-center gap-2 text-red-500">
              <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
              <span>ข้อมูลนี้ยังไม่ได้รับการประมวลผลจากผู้ดูแลระบบให้ติดตามคะแนนที่ได้รับการยืนยันแล้วได้ที่ ประกาศ</span>
            </div>
          </div>
        </div>

        {/* ── 6. SIGN OUT ── */}
        <button
          onClick={logout}
          className="group relative overflow-hidden w-full py-3.5 px-6 rounded-2xl bg-slate-900 hover:bg-black text-white font-bold text-xs tracking-wide shadow-sm transition-all duration-300 flex items-center justify-center gap-2 border border-slate-800"
        >
          <LogOut size={13} className="group-hover:-translate-x-0.5 transition-transform" />
          <span>ออกจากระบบ ({isAdmin ? 'ผู้ดูแลระบบ' : 'ผู้เรียน'})</span>
        </button>

      </div>
    </div>
  )
}