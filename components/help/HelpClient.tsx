'use client'

import { useState } from 'react'
import { ROLES } from '@/constants/roles'
import {
  ArrowLeft, BookOpen, Zap, GraduationCap, ChevronDown,
  LogIn, LayoutDashboard, Video, Megaphone, ClipboardList,
  ScanLine, UserCircle, Users, FileText, BarChart2,
  UploadCloud, Download, ChevronUp,
} from 'lucide-react'

type Role = typeof ROLES[keyof typeof ROLES]
type TabId = 'user' | 'admin'

interface Section {
  id: string
  icon: React.ReactNode
  title: string
  content: React.ReactNode
}

// ─── Reusable sub-components ──────────────────────────────────────────────────

function Desc({ children, isAdmin = false }: { children: React.ReactNode; isAdmin?: boolean }) {
  return (
    <p className={`text-xs font-semibold leading-relaxed px-3 py-2.5 rounded-xl mb-4 border-l-2 ${
      isAdmin
        ? 'bg-violet-50 text-violet-800 border-violet-400'
        : 'bg-indigo-50 text-indigo-800 border-indigo-400'
    }`}>
      {children}
    </p>
  )
}

function Step({
  num, title, children, isAdmin = false,
}: { num: string | number; title: string; children: React.ReactNode; isAdmin?: boolean }) {
  return (
    <div className="flex gap-3 items-start bg-slate-50/60 rounded-xl p-3">
      <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-[10px] font-black text-white flex-shrink-0 ${
        isAdmin ? 'bg-gradient-to-br from-violet-600 to-violet-800' : 'bg-gradient-to-br from-indigo-500 to-indigo-700'
      }`}>
        {num}
      </div>
      <div>
        <p className="text-xs font-bold text-slate-800 mb-0.5">{title}</p>
        <p className="text-[11px] text-slate-500 leading-relaxed">{children}</p>
      </div>
    </div>
  )
}

function Tag({ children, red = false }: { children: React.ReactNode; red?: boolean }) {
  return (
    <span className={`inline-block px-2 py-0.5 rounded-md text-[10px] font-bold border mx-0.5 ${
      red
        ? 'bg-rose-50 text-rose-700 border-rose-200'
        : 'bg-indigo-50 text-indigo-700 border-indigo-200'
    }`}>
      {children}
    </span>
  )
}

function TipBox({ children, warn = false }: { children: React.ReactNode; warn?: boolean }) {
  return (
    <div className={`flex gap-2 items-start text-[11px] font-semibold leading-relaxed rounded-xl px-3.5 py-3 mt-3 border ${
      warn
        ? 'bg-rose-50 text-rose-800 border-rose-200'
        : 'bg-amber-50 text-amber-800 border-amber-200'
    }`}>
      <span className="text-base flex-shrink-0">{warn ? '⚠️' : '💡'}</span>
      <span>{children}</span>
    </div>
  )
}

function InfoRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-3 items-baseline text-[11px] bg-slate-50/60 px-3 py-2.5 rounded-xl">
      <span className="font-extrabold text-indigo-600 min-w-[130px] flex-shrink-0">{label}</span>
      <span className="text-slate-600 font-semibold">{children}</span>
    </div>
  )
}

function FeatCard({ icon, title, children, color = 'indigo' }: {
  icon: string; title: string; children: React.ReactNode
  color?: 'indigo' | 'emerald' | 'amber' | 'violet'
}) {
  const bg = { indigo: 'bg-indigo-50', emerald: 'bg-emerald-50', amber: 'bg-amber-50', violet: 'bg-violet-50' }[color]
  return (
    <div className={`${bg} rounded-xl p-3.5 flex gap-3 items-start border border-slate-100`}>
      <span className="text-xl flex-shrink-0">{icon}</span>
      <div>
        <p className="text-xs font-bold text-slate-800 mb-0.5">{title}</p>
        <p className="text-[11px] text-slate-500 leading-relaxed">{children}</p>
      </div>
    </div>
  )
}

// ─── Section accordion ────────────────────────────────────────────────────────

function HelpSection({ section, isAdmin, onFocus }: {
  section: Section; isAdmin: boolean; onFocus: () => void
}) {
  const [open, setOpen] = useState(true)
  return (
    <div id={section.id} className="bg-white border border-slate-100 rounded-2xl shadow-sm overflow-hidden scroll-mt-4" onMouseEnter={onFocus}>
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-3 px-5 py-4 hover:bg-slate-50/60 transition-colors text-left"
      >
        <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${
          isAdmin ? 'bg-violet-50 text-violet-600' : 'bg-indigo-50 text-indigo-600'
        }`}>
          {section.icon}
        </div>
        <span className="flex-1 text-sm font-bold text-slate-800">{section.title}</span>
        {open
          ? <ChevronUp size={15} className="text-slate-400 flex-shrink-0" />
          : <ChevronDown size={15} className="text-slate-400 flex-shrink-0" />}
      </button>
      {open && (
        <div className="px-5 pb-5 space-y-2 border-t border-slate-50">
          <div className="pt-4">{section.content}</div>
        </div>
      )}
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function HelpClient({ role }: { role: Role }) {
  const isAdmin = role === ROLES.ADMIN
  const [tab, setTab] = useState<TabId>(isAdmin ? 'admin' : 'user')
  const [activeId, setActiveId] = useState('')

  // ── STUDENT SECTIONS ─────────────────────────────────────────────────────────
  const userSections: Section[] = [
    {
      id: 'u-login', icon: <LogIn size={16} />, title: 'เข้าสู่ระบบ / ลงทะเบียน',
      content: (
        <div className="space-y-2">
          <Desc>เริ่มต้นใช้งาน The Scholar โดยเข้าสู่ระบบหรือสมัครบัญชีใหม่</Desc>
          <Step num={1} title="ลงทะเบียนครั้งแรก">
            กด <Tag>สมัครบัญชี</Tag> กรอกอีเมล รหัสผ่าน แล้วกด <Tag>Register</Tag>
          </Step>
          <Step num={2} title="เข้าสู่ระบบ">
            กรอกอีเมลและรหัสผ่าน แล้วกด <Tag>เข้าสู่ระบบ</Tag>
          </Step>
          <Step num={3} title="หน้าแดชบอร์ด">
            ระบบพาไปยังหน้าหลัก แสดงสรุปข้อมูลและเมนูด้านซ้าย
          </Step>
          <TipBox>หากลืมรหัสผ่าน ให้ติดต่อครูผู้สอนเพื่อรีเซ็ตบัญชี</TipBox>
        </div>
      ),
    },
    {
      id: 'u-dashboard', icon: <LayoutDashboard size={16} />, title: 'หน้าหลัก (Dashboard)',
      content: (
        <div className="space-y-2">
          <Desc>หน้าหลักแสดงภาพรวมและลิงก์ด่วนไปยังฟีเจอร์ต่างๆ</Desc>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <FeatCard icon="📊" title="สถิติส่วนตัว" color="indigo">คะแนนเฉลี่ย จำนวนข้อสอบที่ผ่าน และจำนวนชุดที่ทำแล้ว</FeatCard>
            <FeatCard icon="📢" title="ประกาศล่าสุด" color="amber">ประกาศจากอาจารย์แสดงที่หน้าหลักทันที</FeatCard>
            <FeatCard icon="📝" title="ควิซที่เปิดอยู่" color="emerald">ดูรายการแบบทดสอบที่พร้อมทำได้เลย</FeatCard>
            <FeatCard icon="🎬" title="สื่อการเรียน" color="violet">เข้าถึงวิดีโอและสื่อที่ครูอัปโหลดไว้</FeatCard>
          </div>
        </div>
      ),
    },
    {
      id: 'u-media', icon: <Video size={16} />, title: 'สื่อการเรียน',
      content: (
        <div className="space-y-2">
          <Desc>ดูวิดีโอและเอกสารที่ครูจัดเตรียมไว้</Desc>
          <Step num={1} title="เข้าเมนูสื่อการเรียน">คลิก <Tag>สื่อการเรียน</Tag> ที่แถบเมนูด้านซ้าย</Step>
          <Step num={2} title="เลือกสื่อ">คลิกที่การ์ดสื่อที่ต้องการ</Step>
          <Step num={3} title="ดูเนื้อหา">ระบบเล่นวิดีโอหรือแสดงเอกสารในหน้าจอทันที</Step>
          <TipBox>รองรับมือถือและแท็บเล็ต — หมุนหน้าจอแนวนอนเพื่อดูสะดวกขึ้น</TipBox>
        </div>
      ),
    },
    {
      id: 'u-announce', icon: <Megaphone size={16} />, title: 'ประกาศ',
      content: (
        <div className="space-y-2">
          <Desc>อ่านประกาศจากครู ข่าวสาร และกิจกรรมต่างๆ</Desc>
          <Step num={1} title="เข้าหน้าประกาศ">คลิก <Tag>ประกาศ</Tag> ที่แถบเมนูด้านซ้าย</Step>
          <Step num={2} title="อ่านประกาศ">ประกาศเรียงจากใหม่ไปเก่า พร้อมวันที่และหัวข้อ</Step>
          <TipBox>ตรวจสอบประกาศสม่ำเสมอ ครูจะแจ้งกำหนดสอบและกิจกรรมผ่านที่นี่</TipBox>
        </div>
      ),
    },
    {
      id: 'u-quiz', icon: <ClipboardList size={16} />, title: 'ทำแบบทดสอบ (ควิซ)',
      content: (
        <div className="space-y-2">
          <Desc>ทำแบบทดสอบออนไลน์ ดูผลลัพธ์ และสถิติคะแนน</Desc>
          <Step num={1} title="เลือกแบบทดสอบ">ไปที่ <Tag>ควิซ</Tag> แล้วเลือกชุดข้อสอบที่ต้องการ</Step>
          <Step num={2} title="อ่านเงื่อนไข">ระบบแสดงกติกา เวลา และคะแนนผ่าน กด <Tag>เริ่มทำข้อสอบ</Tag></Step>
          <Step num={3} title="ตอบคำถาม">เลือกคำตอบแต่ละข้อ นาฬิกาด้านบนนับเวลาถอยหลัง</Step>
          <Step num={4} title="ส่งข้อสอบ">กด <Tag>ส่งคำตอบ</Tag> หรือรอเวลาหมด — ระบบส่งอัตโนมัติ</Step>
          <Step num={5} title="ดูผลลัพธ์">แสดงคะแนน ผ่าน/ไม่ผ่าน ดูประวัติเพิ่มเติมได้ในหน้าโปรไฟล์</Step>
          <TipBox warn>หากออกจากหน้าระหว่างทำข้อสอบ ระบบจะบันทึกและส่งคำตอบที่ตอบไว้แล้วอัตโนมัติ</TipBox>
          <div className="space-y-1.5 mt-2">
            <InfoRow label="⏱ จับเวลา">นับถอยหลัง หมดเวลาส่งอัตโนมัติ</InfoRow>
            <InfoRow label="✅ คะแนนผ่าน">แต่ละควิซกำหนดต่างกัน ดูได้ที่หน้าเงื่อนไข</InfoRow>
            <InfoRow label="📋 ประวัติ">ดูผลทุกครั้งได้ในหน้าโปรไฟล์</InfoRow>
          </div>
        </div>
      ),
    },
    {
      id: 'u-omr', icon: <ScanLine size={16} />, title: 'OMR (กระดาษคำตอบ)',
      content: (
        <div className="space-y-2">
          <Desc>ระบบ OMR ใช้สำหรับส่งกระดาษคำตอบแบบระบายวงกลม</Desc>
          <Step num={1} title="รับกระดาษคำตอบ">ครูจะแจกกระดาษ OMR พร้อมแจ้งวิธีส่ง</Step>
          <Step num={2} title="ระบายให้ชัดเจน">ใช้ปากกาหรือดินสอระบายเต็มวง ไม่มีรอยลบ</Step>
          <Step num={3} title="ดูผลคะแนน">หลังครูสแกน ผลคะแนนจะปรากฏในหน้าโปรไฟล์ของคุณ</Step>
        </div>
      ),
    },
    {
      id: 'u-profile', icon: <UserCircle size={16} />, title: 'โปรไฟล์',
      content: (
        <div className="space-y-2">
          <Desc>แก้ไขข้อมูลส่วนตัว ดูประวัติการสอบ และตั้งค่าบัญชี</Desc>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <FeatCard icon="📸" title="เปลี่ยนรูปโปรไฟล์" color="indigo">กดไอคอนกล้องที่รูป แล้วเลือกภาพจากเครื่อง</FeatCard>
            <FeatCard icon="✏️" title="แก้ไขข้อมูล" color="emerald">แก้ชื่อ ชื่อเล่น รหัสนักเรียน ระดับชั้น แล้วกด <Tag>บันทึก</Tag></FeatCard>
            <FeatCard icon="📊" title="สถิติคะแนน" color="amber">คะแนนเฉลี่ย จำนวนชุดที่ผ่านและทำแล้ว</FeatCard>
            <FeatCard icon="📋" title="ประวัติการสอบ" color="violet">ดูผลทุกครั้ง พร้อมคะแนนและวันที่ กรองและค้นหาได้</FeatCard>
          </div>
          <TipBox warn>กด <Tag red>ออกจากระบบ</Tag> ที่ด้านล่างหน้าโปรไฟล์เพื่อออกจากบัญชี</TipBox>
        </div>
      ),
    },
  ]

  // ── ADMIN SECTIONS ────────────────────────────────────────────────────────────
  const adminSections: Section[] = [
    {
      id: 'a-overview', icon: <Zap size={16} />, title: 'Admin Dashboard ภาพรวม',
      content: (
        <div className="space-y-2">
          <Desc isAdmin>Admin Panel แสดงสถิติรวมและทางลัดสู่การจัดการทุกส่วน</Desc>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <FeatCard icon="👥" title="จำนวนนักเรียน" color="indigo">บัญชีนักเรียนทั้งหมดในระบบ</FeatCard>
            <FeatCard icon="📚" title="สื่อการสอน" color="emerald">จำนวนสื่อ/วิดีโอที่อัปโหลดไว้</FeatCard>
            <FeatCard icon="📢" title="ประกาศ" color="amber">จำนวนประกาศทั้งหมดในระบบ</FeatCard>
            <FeatCard icon="📝" title="แบบทดสอบ" color="violet">จำนวนควิซที่สร้างไว้</FeatCard>
          </div>
          <TipBox>กด <Tag>นำออกรายงานคะแนน</Tag> ที่ Admin Panel เพื่อดาวน์โหลดคะแนนทั้งหมดเป็น Excel</TipBox>
        </div>
      ),
    },
    {
      id: 'a-students', icon: <Users size={16} />, title: 'จัดการนักเรียน',
      content: (
        <div className="space-y-2">
          <Desc isAdmin>เพิ่ม แก้ไข ลบ และค้นหาข้อมูลนักเรียนในระบบ</Desc>
          <Step num="+" title="เพิ่มนักเรียน" isAdmin>ไปที่ <Tag>นักเรียน</Tag> → <Tag>เพิ่มนักเรียน</Tag> กรอกอีเมล รหัสผ่าน ชื่อ และระดับชั้น</Step>
          <Step num="✎" title="แก้ไขข้อมูล" isAdmin>คลิกที่แถวนักเรียน แก้ข้อมูล แล้วกด <Tag>บันทึก</Tag></Step>
          <Step num="🗑" title="ลบนักเรียน" isAdmin>เลือก checkbox → <Tag red>ลบที่เลือก</Tag> ระบบขอยืนยันก่อนเสมอ</Step>
          <Step num="🔍" title="ค้นหา/กรอง" isAdmin>พิมพ์ชื่อหรือรหัสในช่องค้นหา หรือกรองตามระดับชั้น</Step>
          <TipBox warn>การลบนักเรียนจะลบข้อมูลและประวัติสอบทั้งหมด — ไม่สามารถกู้คืนได้</TipBox>
        </div>
      ),
    },
    {
      id: 'a-media', icon: <Video size={16} />, title: 'จัดการสื่อการสอน',
      content: (
        <div className="space-y-2">
          <Desc isAdmin>อัปโหลดและจัดการสื่อการสอนสำหรับนักเรียน</Desc>
          <Step num={1} title="เพิ่มสื่อใหม่" isAdmin><Tag>Admin Panel</Tag> → <Tag>สื่อการสอน</Tag> → <Tag>เพิ่มสื่อ</Tag></Step>
          <Step num={2} title="กรอกข้อมูล" isAdmin>ใส่ชื่อ รายละเอียด URL วิดีโอ (YouTube/Vimeo) หรืออัปโหลดไฟล์</Step>
          <Step num={3} title="บันทึก" isAdmin>กด <Tag>บันทึก</Tag> สื่อจะปรากฏในหน้านักเรียนทันที</Step>
        </div>
      ),
    },
    {
      id: 'a-announce', icon: <Megaphone size={16} />, title: 'จัดการประกาศ',
      content: (
        <div className="space-y-2">
          <Desc isAdmin>สร้างและจัดการประกาศที่นักเรียนจะเห็น</Desc>
          <Step num={1} title="สร้างประกาศ" isAdmin><Tag>Admin Panel</Tag> → <Tag>ประกาศ</Tag> → <Tag>เพิ่มประกาศ</Tag></Step>
          <Step num={2} title="กรอกเนื้อหา" isAdmin>ใส่หัวข้อ รายละเอียด และแนบรูปภาพได้</Step>
          <Step num={3} title="เผยแพร่" isAdmin>กด <Tag>บันทึก</Tag> นักเรียนเห็นทันที</Step>
          <Step num="✎" title="แก้ไข/ลบ" isAdmin>คลิกไอคอนดินสอหรือถังขยะในแถวประกาศที่ต้องการ</Step>
        </div>
      ),
    },
    {
      id: 'a-quiz', icon: <ClipboardList size={16} />, title: 'จัดการแบบทดสอบ',
      content: (
        <div className="space-y-2">
          <Desc isAdmin>สร้างควิซ เพิ่มคำถาม กำหนดเวลา และเปิด-ปิดการสอบ</Desc>
          <Step num={1} title="สร้างควิซ" isAdmin><Tag>Admin Panel</Tag> → <Tag>แบบทดสอบ</Tag> → <Tag>เพิ่มแบบทดสอบ</Tag></Step>
          <Step num={2} title="ตั้งค่าทั่วไป" isAdmin>ชื่อ · คำอธิบาย · คะแนนผ่าน (%) · เวลาจำกัด (นาที) · วันที่เปิด-ปิด</Step>
          <Step num={3} title="เพิ่มคำถาม" isAdmin>กด <Tag>เพิ่มคำถาม</Tag> ใส่คำถาม ตัวเลือก A-D และระบุเฉลย</Step>
          <Step num={4} title="เปิด/ปิดการสอบ" isAdmin>Toggle <Tag>เปิดให้ทำ</Tag> เพื่อควบคุมการเข้าถึงของนักเรียน</Step>
          <Step num={5} title="ดูตัวอย่าง" isAdmin>กด <Tag>Preview</Tag> เพื่อดูหน้าตาก่อนเผยแพร่</Step>
          <div className="space-y-1.5 mt-2">
            <InfoRow label="📌 คะแนนผ่าน">กำหนดเป็น % เช่น 70 = ต้องได้ 70% ขึ้นไป</InfoRow>
            <InfoRow label="⏱ เวลาจำกัด">ระบุเป็นนาที — ว่างเปล่า = ไม่จับเวลา</InfoRow>
            <InfoRow label="📅 วันเปิด-ปิด">ระบบเปิด-ปิดอัตโนมัติตามวันที่ที่กำหนด</InfoRow>
          </div>
        </div>
      ),
    },
    {
      id: 'a-submissions', icon: <BarChart2 size={16} />, title: 'ประวัติการสอบ (Submissions)',
      content: (
        <div className="space-y-2">
          <Desc isAdmin>ดูและจัดการผลการสอบของนักเรียนทั้งหมด</Desc>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <FeatCard icon="🔍" title="ค้นหา/กรอง" color="indigo">ค้นตามชื่อ รหัส หรือกรองตามควิซ/ระดับชั้น</FeatCard>
            <FeatCard icon="👁" title="ดูรายละเอียด" color="emerald">คลิกแถวเพื่อดูคำตอบและผลของแต่ละคน</FeatCard>
            <FeatCard icon="🗑" title="ลบบันทึก" color="amber">เลือก checkbox แล้วกดลบประวัติที่ไม่ต้องการ</FeatCard>
            <FeatCard icon="📈" title="สถิติรวม" color="violet">แถบด้านบนแสดงเฉลี่ย ผ่าน/ไม่ผ่านของกลุ่มที่กรองอยู่</FeatCard>
          </div>
        </div>
      ),
    },
    {
      id: 'a-omr', icon: <ScanLine size={16} />, title: 'OMR สแกน',
      content: (
        <div className="space-y-2">
          <Desc isAdmin>สแกนกระดาษคำตอบ OMR อัตโนมัติ บันทึกคะแนนได้รวดเร็ว</Desc>
          <Step num={1} title="เข้าหน้า OMR สแกน" isAdmin>คลิก <Tag>OMR สแกน</Tag> ที่แถบเมนูส่วน Admin</Step>
          <Step num={2} title="เลือกแบบทดสอบ" isAdmin>เลือกควิซ — ระบบโหลดเฉลยมาให้อัตโนมัติ</Step>
          <Step num={3} title="สแกนกระดาษ" isAdmin>ใช้กล้องหรืออัปโหลดภาพ ระบบประมวลผลและตรวจคะแนน</Step>
          <Step num={4} title="ยืนยันและบันทึก" isAdmin>ตรวจสอบความถูกต้อง แล้วกด <Tag>บันทึกคะแนน</Tag></Step>
          <TipBox>ถ่ายในที่สว่าง วางกระดาษตรง — ช่วยให้ระบบอ่านได้แม่นยำขึ้น</TipBox>
        </div>
      ),
    },
    {
      id: 'a-export', icon: <Download size={16} />, title: 'นำออกข้อมูล (Export)',
      content: (
        <div className="space-y-2">
          <Desc isAdmin>ดาวน์โหลดรายงานคะแนนเป็นไฟล์ Excel/CSV</Desc>
          <Step num={1} title="เข้าหน้า Export" isAdmin><Tag>Admin Panel</Tag> → <Tag>นำออกรายงานคะแนน</Tag></Step>
          <Step num={2} title="เลือกตัวกรอง" isAdmin>เลือกควิซหรือระดับชั้นที่ต้องการ</Step>
          <Step num={3} title="ดาวน์โหลด" isAdmin>กด <Tag>Download</Tag> ไฟล์บันทึกในเครื่องทันที</Step>
          <InfoRow label="📋 ข้อมูลที่ได้">ชื่อ รหัส ระดับชั้น คะแนน ผ่าน/ไม่ผ่าน วันที่สอบ</InfoRow>
        </div>
      ),
    },
  ]

  const sections = tab === 'user' ? userSections : adminSections

  return (
    <div className="min-h-screen bg-slate-50/50 text-slate-800 p-4 sm:p-6 md:p-8 font-sans">
      <div className="max-w-5xl mx-auto flex flex-col gap-5">

        {/* ── HERO ── */}
        <div className={`relative overflow-hidden rounded-3xl p-6 sm:p-8 text-white shadow-sm ${
          isAdmin
            ? 'bg-gradient-to-r from-violet-700 via-violet-600 to-indigo-600'
            : 'bg-gradient-to-r from-blue-700 via-indigo-600 to-violet-700'
        }`}>
          <div className="absolute top-0 right-0 w-56 h-56 bg-white/10 rounded-full blur-2xl -mr-16 -mt-16" />

          <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black mb-3 ${
            isAdmin ? 'bg-violet-500/30 border border-violet-400/30' : 'bg-indigo-500/30 border border-indigo-400/30'
          }`}>
            {isAdmin ? <><Zap size={10} /> ⚡ แอดมิน/ครู · คู่มือการใช้งาน</> : <><GraduationCap size={10} /> 🎓 นักเรียน · คู่มือการใช้งาน</>}
          </div>

          <h1 className="text-xl sm:text-2xl font-black mb-1 leading-snug">
            {isAdmin ? 'คู่มือสำหรับครูและแอดมิน' : 'คู่มือการใช้งาน'}<br />
            <span className="opacity-80 font-bold text-base">The Scholar V3</span>
          </h1>
          <p className="text-[11px] font-semibold opacity-80 max-w-md mt-1">
            {isAdmin
              ? 'วิธีจัดการนักเรียน ควิซ สื่อ ประกาศ OMR และนำออกข้อมูล'
              : 'วิธีใช้งานทุกฟีเจอร์ — สื่อการเรียน ควิซ OMR และโปรไฟล์'}
          </p>

          <a
            href="/dashboard/profile"
            className="mt-4 inline-flex items-center gap-1.5 bg-white/15 hover:bg-white/25 border border-white/20 text-white text-[11px] font-bold px-3.5 py-1.5 rounded-xl transition-all"
          >
            <ArrowLeft size={12} />
            กลับสู่โปรไฟล์
          </a>
        </div>

        {/* ── TAB SWITCHER (admin only) ── */}
        {isAdmin && (
          <div className="flex gap-2 bg-white border border-slate-100 rounded-2xl p-1.5 shadow-sm">
            <button
              onClick={() => setTab('user')}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs font-bold transition-all ${
                tab === 'user'
                  ? 'bg-gradient-to-r from-indigo-500 to-indigo-600 text-white shadow-sm'
                  : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
              }`}
            >
              <GraduationCap size={13} /> คู่มือนักเรียน
            </button>
            <button
              onClick={() => setTab('admin')}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs font-bold transition-all ${
                tab === 'admin'
                  ? 'bg-gradient-to-r from-violet-600 to-violet-700 text-white shadow-sm'
                  : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
              }`}
            >
              <Zap size={13} /> คู่มือแอดมิน
            </button>
          </div>
        )}

        {/* ── MAIN LAYOUT ── */}
        <div className="flex gap-5 items-start">

          {/* TOC sidebar */}
          <aside className="hidden lg:block w-52 flex-shrink-0 sticky top-5">
            <div className="bg-white border border-slate-100 rounded-2xl p-3 shadow-sm">
              <p className="text-[9px] font-extrabold text-slate-400 uppercase tracking-widest px-2 pb-2 border-b border-slate-100 mb-2">
                สารบัญ
              </p>
              {sections.map(s => (
                <button
                  key={s.id}
                  onClick={() => {
                    setActiveId(s.id)
                    document.getElementById(s.id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
                  }}
                  className={`w-full text-left flex items-center gap-2 px-2.5 py-2 rounded-xl text-[11px] font-semibold transition-all mb-0.5 ${
                    activeId === s.id
                      ? tab === 'admin'
                        ? 'bg-violet-50 text-violet-700 font-bold'
                        : 'bg-indigo-50 text-indigo-700 font-bold'
                      : 'text-slate-500 hover:bg-slate-50 hover:text-slate-700'
                  }`}
                >
                  <span className={`flex-shrink-0 ${tab === 'admin' ? 'text-violet-500' : 'text-indigo-500'}`}>
                    {s.icon}
                  </span>
                  {s.title}
                </button>
              ))}
            </div>
          </aside>

          {/* Sections */}
          <div className="flex-1 min-w-0 flex flex-col gap-3">
            {sections.map(s => (
              <HelpSection
                key={s.id}
                section={s}
                isAdmin={tab === 'admin'}
                onFocus={() => setActiveId(s.id)}
              />
            ))}
          </div>
        </div>

      </div>
    </div>
  )
}