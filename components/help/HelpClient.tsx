'use client'
import { useState } from 'react'
import { ROLES } from '@/constants/roles'

type Role = typeof ROLES[keyof typeof ROLES]
type TabId = 'user' | 'admin'

interface Section {
  id: string
  icon: string
  title: string
  content: React.ReactNode
}

export default function HelpClient({ role }: { role: Role }) {
  const isAdmin = role === ROLES.ADMIN

  // นักเรียนเห็นแค่แท็บนักเรียน, แอดมินเริ่มที่แท็บแอดมิน
  const [tab, setTab] = useState<TabId>(isAdmin ? 'admin' : 'user')
  const [activeSection, setActiveSection] = useState<string>('')

  /* ─────────── USER SECTIONS ─────────── */
  const userSections: Section[] = [
    {
      id: 'login',
      icon: '🔐',
      title: 'เข้าสู่ระบบ / ลงทะเบียน',
      content: (
        <div>
          <p className="help-desc">เริ่มต้นใช้งาน The Scholar โดยเข้าสู่ระบบหรือสมัครบัญชีใหม่</p>
          <div className="step-list">
            <div className="step">
              <div className="step-num">1</div>
              <div>
                <strong>ลงทะเบียนครั้งแรก</strong>
                <p>กด <span className="tag">สมัครบัญชี</span> กรอกอีเมล รหัสผ่าน แล้วกด <span className="tag">Register</span></p>
              </div>
            </div>
            <div className="step">
              <div className="step-num">2</div>
              <div>
                <strong>เข้าสู่ระบบ</strong>
                <p>กรอกอีเมลและรหัสผ่าน แล้วกด <span className="tag">เข้าสู่ระบบ</span></p>
              </div>
            </div>
            <div className="step">
              <div className="step-num">3</div>
              <div>
                <strong>หน้าแดชบอร์ด</strong>
                <p>ระบบจะพาไปยังหน้าหลัก แสดงสรุปข้อมูลและเมนูด้านซ้าย</p>
              </div>
            </div>
          </div>
          <div className="tip-box">
            <span className="tip-icon">💡</span>
            <span>หากลืมรหัสผ่าน ให้ติดต่อครูผู้สอนเพื่อรีเซ็ตบัญชี</span>
          </div>
        </div>
      ),
    },
    {
      id: 'dashboard',
      icon: '🏠',
      title: 'หน้าหลัก (Dashboard)',
      content: (
        <div>
          <p className="help-desc">หน้าหลักแสดงภาพรวมและลิงก์ด่วนไปยังฟีเจอร์ต่างๆ</p>
          <div className="feature-grid">
            <div className="feature-card">
              <div className="feature-icon">📊</div>
              <div><strong>สถิติส่วนตัว</strong><p>คะแนนเฉลี่ย จำนวนข้อสอบที่ผ่าน และจำนวนชุดที่ทำแล้ว</p></div>
            </div>
            <div className="feature-card">
              <div className="feature-icon">📢</div>
              <div><strong>ประกาศล่าสุด</strong><p>ประกาศจากอาจารย์แสดงที่หน้าหลักทันที</p></div>
            </div>
            <div className="feature-card">
              <div className="feature-icon">📝</div>
              <div><strong>ควิซที่เปิดอยู่</strong><p>ดูรายการแบบทดสอบที่พร้อมทำได้เลย</p></div>
            </div>
            <div className="feature-card">
              <div className="feature-icon">🎬</div>
              <div><strong>สื่อการเรียน</strong><p>เข้าถึงวิดีโอและสื่อที่ครูอัปโหลดไว้</p></div>
            </div>
          </div>
        </div>
      ),
    },
    {
      id: 'media',
      icon: '🎬',
      title: 'สื่อการเรียน',
      content: (
        <div>
          <p className="help-desc">ดูวิดีโอและเอกสารที่ครูจัดเตรียมไว้</p>
          <div className="step-list">
            <div className="step"><div className="step-num">1</div><div><strong>เข้าเมนูสื่อการเรียน</strong><p>คลิก <span className="tag">สื่อการเรียน</span> ที่แถบเมนูด้านซ้าย</p></div></div>
            <div className="step"><div className="step-num">2</div><div><strong>เลือกสื่อ</strong><p>คลิกที่การ์ดสื่อที่ต้องการ</p></div></div>
            <div className="step"><div className="step-num">3</div><div><strong>ดูเนื้อหา</strong><p>ระบบเล่นวิดีโอหรือแสดงเอกสารในหน้าจอ</p></div></div>
          </div>
          <div className="tip-box">
            <span className="tip-icon">📱</span>
            <span>รองรับมือถือและแท็บเล็ต — หมุนหน้าจอแนวนอนเพื่อดูสะดวกขึ้น</span>
          </div>
        </div>
      ),
    },
    {
      id: 'announcements',
      icon: '📢',
      title: 'ประกาศ',
      content: (
        <div>
          <p className="help-desc">อ่านประกาศจากครู ข่าวสาร และกิจกรรมต่างๆ</p>
          <div className="step-list">
            <div className="step"><div className="step-num">1</div><div><strong>เข้าหน้าประกาศ</strong><p>คลิก <span className="tag">ประกาศ</span> ที่แถบเมนูด้านซ้าย</p></div></div>
            <div className="step"><div className="step-num">2</div><div><strong>อ่านประกาศ</strong><p>เรียงจากใหม่ไปเก่า พร้อมวันที่และหัวข้อ</p></div></div>
          </div>
          <div className="tip-box">
            <span className="tip-icon">🔔</span>
            <span>ตรวจสอบประกาศสม่ำเสมอ ครูจะแจ้งกำหนดสอบและกิจกรรมผ่านที่นี่</span>
          </div>
        </div>
      ),
    },
    {
      id: 'quizzes',
      icon: '📝',
      title: 'ทำแบบทดสอบ (ควิซ)',
      content: (
        <div>
          <p className="help-desc">ทำแบบทดสอบออนไลน์ ดูผลลัพธ์ และสถิติคะแนน</p>
          <div className="step-list">
            <div className="step"><div className="step-num">1</div><div><strong>เลือกแบบทดสอบ</strong><p>ไปที่ <span className="tag">ควิซ</span> แล้วเลือกชุดข้อสอบที่ต้องการ</p></div></div>
            <div className="step"><div className="step-num">2</div><div><strong>อ่านเงื่อนไข</strong><p>ระบบแสดงกติกา เวลา และคะแนนผ่าน กด <span className="tag">เริ่มทำข้อสอบ</span></p></div></div>
            <div className="step"><div className="step-num">3</div><div><strong>ตอบคำถาม</strong><p>เลือกคำตอบแต่ละข้อ นาฬิกาด้านบนนับเวลาถอยหลัง</p></div></div>
            <div className="step"><div className="step-num">4</div><div><strong>ส่งข้อสอบ</strong><p>กด <span className="tag">ส่งคำตอบ</span> หรือรอเวลาหมด ระบบส่งอัตโนมัติ</p></div></div>
            <div className="step"><div className="step-num">5</div><div><strong>ดูผลลัพธ์</strong><p>แสดงคะแนน ผ่าน/ไม่ผ่าน ดูประวัติเพิ่มเติมได้ในหน้าโปรไฟล์</p></div></div>
          </div>
          <div className="warning-box">
            <span className="tip-icon">⚠️</span>
            <span>หากออกจากหน้าระหว่างทำข้อสอบ ระบบจะบันทึกและส่งคำตอบที่ตอบไว้แล้วอัตโนมัติ</span>
          </div>
          <div className="info-grid" style={{marginTop:'14px'}}>
            <div className="info-item"><span className="info-label">⏱ จับเวลา</span><span>นับถอยหลัง หมดเวลาส่งอัตโนมัติ</span></div>
            <div className="info-item"><span className="info-label">✅ คะแนนผ่าน</span><span>แต่ละควิซกำหนดต่างกัน ดูได้ที่หน้าเงื่อนไข</span></div>
            <div className="info-item"><span className="info-label">📋 ประวัติ</span><span>ดูผลทุกครั้งได้ในหน้าโปรไฟล์</span></div>
          </div>
        </div>
      ),
    },
    {
      id: 'omr-student',
      icon: '🔲',
      title: 'OMR (กระดาษคำตอบ)',
      content: (
        <div>
          <p className="help-desc">ระบบ OMR ใช้สำหรับส่งกระดาษคำตอบแบบระบายวงกลม</p>
          <div className="step-list">
            <div className="step"><div className="step-num">1</div><div><strong>รับกระดาษคำตอบ</strong><p>ครูจะแจกกระดาษ OMR พร้อมแจ้งวิธีส่ง</p></div></div>
            <div className="step"><div className="step-num">2</div><div><strong>ระบายให้ชัดเจน</strong><p>ใช้ปากกาหรือดินสอระบายเต็มวง ไม่มีรอยลบ</p></div></div>
            <div className="step"><div className="step-num">3</div><div><strong>ดูผลคะแนน</strong><p>หลังครูสแกน ผลคะแนนจะปรากฏในหน้าโปรไฟล์ของคุณ</p></div></div>
          </div>
        </div>
      ),
    },
    {
      id: 'profile-user',
      icon: '👤',
      title: 'โปรไฟล์',
      content: (
        <div>
          <p className="help-desc">แก้ไขข้อมูลส่วนตัว ดูประวัติการสอบ และตั้งค่าบัญชี</p>
          <div className="feature-grid">
            <div className="feature-card"><div className="feature-icon">📸</div><div><strong>เปลี่ยนรูปโปรไฟล์</strong><p>กดไอคอนกล้องที่รูป แล้วเลือกภาพจากเครื่อง</p></div></div>
            <div className="feature-card"><div className="feature-icon">✏️</div><div><strong>แก้ไขข้อมูล</strong><p>แก้ชื่อ ชื่อเล่น รหัสนักเรียน ระดับชั้น แล้วกด <span className="tag">บันทึก</span></p></div></div>
            <div className="feature-card"><div className="feature-icon">📊</div><div><strong>สถิติคะแนน</strong><p>ดูคะแนนเฉลี่ย จำนวนชุดที่ผ่านและทำแล้ว</p></div></div>
            <div className="feature-card"><div className="feature-icon">📋</div><div><strong>ประวัติการสอบ</strong><p>ดูผลทุกครั้ง พร้อมคะแนนและวันที่</p></div></div>
          </div>
          <div className="step-list" style={{marginTop:'14px'}}>
            <div className="step">
              <div className="step-num" style={{background:'#ef4444'}}>!</div>
              <div><strong>ออกจากระบบ</strong><p>กดปุ่ม <span className="tag tag-red">ออกจากระบบ</span> ที่ด้านล่างหน้าโปรไฟล์</p></div>
            </div>
          </div>
        </div>
      ),
    },
  ]

  /* ─────────── ADMIN SECTIONS ─────────── */
  const adminSections: Section[] = [
    {
      id: 'admin-overview',
      icon: '⚡',
      title: 'Admin Dashboard ภาพรวม',
      content: (
        <div>
          <p className="help-desc">Admin Panel แสดงสถิติรวมและทางลัดสู่การจัดการทุกส่วน</p>
          <div className="feature-grid">
            <div className="feature-card blue"><div className="feature-icon">👥</div><div><strong>จำนวนนักเรียน</strong><p>บัญชีนักเรียนทั้งหมดในระบบ</p></div></div>
            <div className="feature-card green"><div className="feature-icon">📚</div><div><strong>สื่อการสอน</strong><p>จำนวนสื่อ/วิดีโอที่อัปโหลดไว้</p></div></div>
            <div className="feature-card amber"><div className="feature-icon">📢</div><div><strong>ประกาศ</strong><p>จำนวนประกาศทั้งหมดในระบบ</p></div></div>
            <div className="feature-card purple"><div className="feature-icon">📝</div><div><strong>แบบทดสอบ</strong><p>จำนวนควิซที่สร้างไว้</p></div></div>
          </div>
          <div className="tip-box" style={{marginTop:'14px'}}>
            <span className="tip-icon">📊</span>
            <span>กด <strong>นำออกรายงานคะแนน</strong> ที่ Admin Panel เพื่อ Download คะแนนเป็น Excel</span>
          </div>
        </div>
      ),
    },
    {
      id: 'admin-students',
      icon: '👥',
      title: 'จัดการนักเรียน',
      content: (
        <div>
          <p className="help-desc">เพิ่ม แก้ไข ลบ และค้นหาข้อมูลนักเรียนในระบบ</p>
          <div className="step-list">
            <div className="step"><div className="step-num">+</div><div><strong>เพิ่มนักเรียน</strong><p>ไปที่ <span className="tag">นักเรียน</span> → <span className="tag">เพิ่มนักเรียน</span> กรอกอีเมล รหัสผ่าน ชื่อ และระดับชั้น</p></div></div>
            <div className="step"><div className="step-num">✎</div><div><strong>แก้ไขข้อมูล</strong><p>คลิกที่แถวนักเรียน แก้ข้อมูล แล้วกด <span className="tag">บันทึก</span></p></div></div>
            <div className="step"><div className="step-num">🗑</div><div><strong>ลบนักเรียน</strong><p>เลือก checkbox → <span className="tag tag-red">ลบที่เลือก</span> — ระบบขอยืนยันก่อนเสมอ</p></div></div>
            <div className="step"><div className="step-num">🔍</div><div><strong>ค้นหา/กรอง</strong><p>พิมพ์ชื่อหรือรหัสในช่องค้นหา หรือกรองตามระดับชั้น</p></div></div>
          </div>
          <div className="warning-box">
            <span className="tip-icon">⚠️</span>
            <span>การลบนักเรียนจะลบข้อมูลและประวัติสอบทั้งหมด — ไม่สามารถกู้คืนได้</span>
          </div>
        </div>
      ),
    },
    {
      id: 'admin-media',
      icon: '📚',
      title: 'จัดการสื่อการสอน',
      content: (
        <div>
          <p className="help-desc">อัปโหลดและจัดการสื่อการสอนสำหรับนักเรียน</p>
          <div className="step-list">
            <div className="step"><div className="step-num">1</div><div><strong>เพิ่มสื่อใหม่</strong><p><span className="tag">Admin Panel</span> → <span className="tag">สื่อการสอน</span> → <span className="tag">เพิ่มสื่อ</span></p></div></div>
            <div className="step"><div className="step-num">2</div><div><strong>กรอกข้อมูล</strong><p>ใส่ชื่อ รายละเอียด URL วิดีโอ (YouTube/Vimeo) หรืออัปโหลดไฟล์</p></div></div>
            <div className="step"><div className="step-num">3</div><div><strong>บันทึก</strong><p>กด <span className="tag">บันทึก</span> สื่อจะปรากฏในหน้านักเรียนทันที</p></div></div>
          </div>
        </div>
      ),
    },
    {
      id: 'admin-announcements',
      icon: '📢',
      title: 'จัดการประกาศ',
      content: (
        <div>
          <p className="help-desc">สร้างและจัดการประกาศที่นักเรียนจะเห็น</p>
          <div className="step-list">
            <div className="step"><div className="step-num">1</div><div><strong>สร้างประกาศ</strong><p><span className="tag">Admin Panel</span> → <span className="tag">ประกาศ</span> → <span className="tag">เพิ่มประกาศ</span></p></div></div>
            <div className="step"><div className="step-num">2</div><div><strong>กรอกเนื้อหา</strong><p>ใส่หัวข้อ รายละเอียด และแนบรูปภาพได้</p></div></div>
            <div className="step"><div className="step-num">3</div><div><strong>เผยแพร่</strong><p>กด <span className="tag">บันทึก</span> นักเรียนเห็นทันที</p></div></div>
            <div className="step"><div className="step-num">✎</div><div><strong>แก้ไข/ลบ</strong><p>คลิกไอคอนดินสอหรือถังขยะในแถวประกาศที่ต้องการ</p></div></div>
          </div>
        </div>
      ),
    },
    {
      id: 'admin-quizzes',
      icon: '📝',
      title: 'จัดการแบบทดสอบ',
      content: (
        <div>
          <p className="help-desc">สร้างควิซ เพิ่มคำถาม กำหนดเวลา และเปิด-ปิดการสอบ</p>
          <div className="step-list">
            <div className="step"><div className="step-num">1</div><div><strong>สร้างควิซ</strong><p><span className="tag">Admin Panel</span> → <span className="tag">แบบทดสอบ</span> → <span className="tag">เพิ่มแบบทดสอบ</span></p></div></div>
            <div className="step"><div className="step-num">2</div><div><strong>ตั้งค่าทั่วไป</strong><p>ชื่อ · คำอธิบาย · คะแนนผ่าน (%) · เวลาจำกัด (นาที) · วันที่เปิด-ปิด</p></div></div>
            <div className="step"><div className="step-num">3</div><div><strong>เพิ่มคำถาม</strong><p>กด <span className="tag">เพิ่มคำถาม</span> ใส่คำถาม ตัวเลือก A-D และระบุเฉลย</p></div></div>
            <div className="step"><div className="step-num">4</div><div><strong>เปิด/ปิดการสอบ</strong><p>Toggle <span className="tag">เปิดให้ทำ</span> เพื่อควบคุมการเข้าถึงของนักเรียน</p></div></div>
            <div className="step"><div className="step-num">5</div><div><strong>ดูตัวอย่าง</strong><p>กด <span className="tag">Preview</span> เพื่อดูหน้าตาก่อนเผยแพร่</p></div></div>
          </div>
          <div className="info-grid">
            <div className="info-item"><span className="info-label">📌 คะแนนผ่าน</span><span>กำหนดเป็น % เช่น 60 = ต้องได้ 60% ขึ้นไป</span></div>
            <div className="info-item"><span className="info-label">⏱ เวลาจำกัด</span><span>ระบุเป็นนาที — ว่างเปล่า = ไม่จับเวลา</span></div>
            <div className="info-item"><span className="info-label">📅 วันเปิด-ปิด</span><span>ระบบเปิด-ปิดอัตโนมัติตามวันที่ที่กำหนด</span></div>
          </div>
        </div>
      ),
    },
    {
      id: 'admin-submissions',
      icon: '📊',
      title: 'ประวัติการสอบ',
      content: (
        <div>
          <p className="help-desc">ดูและจัดการผลการสอบของนักเรียนทั้งหมด</p>
          <div className="feature-grid">
            <div className="feature-card"><div className="feature-icon">🔍</div><div><strong>ค้นหา/กรอง</strong><p>ค้นตามชื่อ รหัส หรือกรองตามควิซ/ระดับชั้น</p></div></div>
            <div className="feature-card"><div className="feature-icon">👁</div><div><strong>ดูรายละเอียด</strong><p>คลิกแถวเพื่อดูคำตอบและผลของแต่ละคน</p></div></div>
            <div className="feature-card"><div className="feature-icon">🗑</div><div><strong>ลบบันทึก</strong><p>เลือก checkbox แล้วกดลบเพื่อลบประวัติที่ไม่ต้องการ</p></div></div>
            <div className="feature-card"><div className="feature-icon">📈</div><div><strong>สถิติรวม</strong><p>แถบด้านบนแสดงเฉลี่ย ผ่าน/ไม่ผ่านของกลุ่มที่กรองอยู่</p></div></div>
          </div>
        </div>
      ),
    },
    {
      id: 'admin-omr',
      icon: '🔲',
      title: 'OMR สแกน',
      content: (
        <div>
          <p className="help-desc">สแกนกระดาษคำตอบ OMR อัตโนมัติ บันทึกคะแนนได้รวดเร็ว</p>
          <div className="step-list">
            <div className="step"><div className="step-num">1</div><div><strong>เข้าหน้า OMR สแกน</strong><p>คลิก <span className="tag">OMR สแกน</span> ที่แถบเมนูส่วน Admin</p></div></div>
            <div className="step"><div className="step-num">2</div><div><strong>เลือกแบบทดสอบ</strong><p>เลือกควิซ — ระบบโหลดเฉลยมาให้อัตโนมัติ</p></div></div>
            <div className="step"><div className="step-num">3</div><div><strong>สแกนกระดาษ</strong><p>ใช้กล้องหรืออัปโหลดภาพ ระบบประมวลผลและตรวจคะแนน</p></div></div>
            <div className="step"><div className="step-num">4</div><div><strong>ยืนยันและบันทึก</strong><p>ตรวจสอบความถูกต้อง แล้วกด <span className="tag">บันทึกคะแนน</span></p></div></div>
          </div>
          <div className="tip-box">
            <span className="tip-icon">💡</span>
            <span>ถ่ายในที่สว่าง วางกระดาษตรง — ช่วยให้ระบบอ่านได้แม่นยำขึ้น</span>
          </div>
        </div>
      ),
    },
    {
      id: 'admin-export',
      icon: '📥',
      title: 'นำออกข้อมูล (Export)',
      content: (
        <div>
          <p className="help-desc">ดาวน์โหลดรายงานคะแนนเป็นไฟล์ Excel/CSV</p>
          <div className="step-list">
            <div className="step"><div className="step-num">1</div><div><strong>เข้าหน้า Export</strong><p><span className="tag">Admin Panel</span> → <span className="tag">นำออกรายงานคะแนน</span></p></div></div>
            <div className="step"><div className="step-num">2</div><div><strong>เลือกตัวกรอง</strong><p>เลือกควิซหรือระดับชั้นที่ต้องการ</p></div></div>
            <div className="step"><div className="step-num">3</div><div><strong>ดาวน์โหลด</strong><p>กด <span className="tag">Download</span> ไฟล์จะถูกบันทึกในเครื่องทันที</p></div></div>
          </div>
          <div className="info-grid">
            <div className="info-item"><span className="info-label">📋 ข้อมูลที่ได้</span><span>ชื่อ รหัส ระดับชั้น คะแนน ผ่าน/ไม่ผ่าน วันที่สอบ</span></div>
          </div>
        </div>
      ),
    },
  ]

  // นักเรียนเห็นแค่ userSections, แอดมินเห็นได้ทั้งคู่
  const sections = tab === 'user' ? userSections : adminSections

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Sarabun:wght@400;500;600;700;800&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: 'Sarabun', sans-serif; background: #f0f4ff; color: #1a1f36; }

        .help-page { max-width: 900px; margin: 0 auto; padding: 32px 20px 60px; }

        /* Hero */
        .help-hero {
          border-radius: 20px; padding: 36px 32px; color: white; margin-bottom: 28px;
          position: relative; overflow: hidden;
        }
        .help-hero.student-hero { background: linear-gradient(135deg, #0050cb 0%, #0066ff 60%, #338aff 100%); }
        .help-hero.admin-hero  { background: linear-gradient(135deg, #5b21b6 0%, #7c3aed 60%, #9333ea 100%); }
        .help-hero::before {
          content:''; position:absolute; top:-40px; right:-40px; width:200px; height:200px;
          background:rgba(255,255,255,0.07); border-radius:50%;
        }
        .help-hero-badge {
          display:inline-flex; align-items:center; gap:6px;
          background:rgba(255,255,255,0.15); border:1px solid rgba(255,255,255,0.25);
          border-radius:20px; padding:4px 12px; font-size:12px; font-weight:600;
          margin-bottom:12px;
        }
        .help-hero h1 { font-size:26px; font-weight:800; line-height:1.2; margin-bottom:8px; }
        .help-hero p  { font-size:13px; opacity:0.85; line-height:1.6; }
        .back-btn {
          display:inline-flex; align-items:center; gap:8px;
          background:rgba(255,255,255,0.15); border:1px solid rgba(255,255,255,0.25);
          color:white; border-radius:10px; padding:8px 16px; font-size:13px;
          font-weight:600; cursor:pointer; text-decoration:none; margin-top:16px;
          font-family:inherit; transition:background 0.2s;
        }
        .back-btn:hover { background:rgba(255,255,255,0.25); }

        /* Role badge (admin only) */
        .role-banner {
          display:flex; align-items:center; gap:10px;
          background:#faf5ff; border:1px solid #e9d5ff;
          border-radius:12px; padding:10px 16px;
          font-size:13px; color:#6b21a8; font-weight:600;
          margin-bottom:20px;
        }

        /* Tabs — only for admin */
        .tab-bar {
          display:flex; gap:8px; margin-bottom:24px;
          background:white; border-radius:14px; padding:6px;
          box-shadow:0 2px 12px rgba(0,0,0,0.06);
        }
        .tab-btn {
          flex:1; padding:10px 20px; border:none; border-radius:10px;
          font-size:14px; font-weight:700; cursor:pointer; transition:all 0.2s;
          font-family:inherit; display:flex; align-items:center; justify-content:center; gap:8px;
          background:transparent; color:#64748b;
        }
        .tab-btn.tab-user.active  { background:linear-gradient(135deg,#0050cb,#0066ff); color:white; box-shadow:0 4px 16px rgba(0,80,203,0.25); }
        .tab-btn.tab-admin.active { background:linear-gradient(135deg,#7c3aed,#9333ea); color:white; box-shadow:0 4px 16px rgba(124,58,237,0.25); }

        /* Layout */
        .help-layout { display:grid; grid-template-columns:220px 1fr; gap:20px; align-items:start; }

        /* TOC */
        .toc { background:white; border-radius:14px; padding:14px; position:sticky; top:20px; box-shadow:0 2px 12px rgba(0,0,0,0.06); }
        .toc-title { font-size:11px; font-weight:700; color:#94a3b8; letter-spacing:0.08em; text-transform:uppercase; padding:4px 8px 10px; border-bottom:1px solid #f1f5f9; margin-bottom:8px; }
        .toc-item { display:flex; align-items:center; gap:8px; padding:8px 10px; border-radius:8px; font-size:13px; font-weight:500; cursor:pointer; transition:all 0.15s; color:#475569; border:none; background:none; width:100%; text-align:left; font-family:inherit; }
        .toc-item:hover { background:#f0f4ff; color:#0050cb; }
        .toc-item.active-user  { background:#eff6ff; color:#0050cb; font-weight:700; }
        .toc-item.active-admin { background:#f5f3ff; color:#7c3aed; font-weight:700; }

        /* Sections */
        .content-area { display:flex; flex-direction:column; gap:16px; }
        .help-section { background:white; border-radius:14px; overflow:hidden; box-shadow:0 2px 12px rgba(0,0,0,0.06); scroll-margin-top:20px; border:1px solid transparent; }
        .section-header { padding:18px 22px; display:flex; align-items:center; gap:12px; cursor:pointer; user-select:none; border-bottom:1px solid #f1f5f9; }
        .section-header:hover { background:#fafbff; }
        .section-emoji { font-size:22px; width:40px; height:40px; background:#eff6ff; border-radius:10px; display:flex; align-items:center; justify-content:center; flex-shrink:0; }
        .section-emoji.admin-emoji { background:#f5f3ff; }
        .section-title { font-size:15px; font-weight:700; flex:1; }
        .section-chevron { font-size:12px; color:#94a3b8; transition:transform 0.2s; }
        .section-chevron.open { transform:rotate(180deg); }
        .section-body { padding:22px; display:none; }
        .section-body.open { display:block; }

        /* Content pieces */
        .help-desc { color:#475569; font-size:14px; line-height:1.6; margin-bottom:16px; padding:12px 14px; background:#f8faff; border-left:3px solid #0050cb; border-radius:0 8px 8px 0; }
        .help-desc.admin-desc { border-left-color:#7c3aed; background:#faf5ff; }

        .step-list { display:flex; flex-direction:column; gap:12px; }
        .step { display:flex; gap:14px; align-items:flex-start; padding:12px 14px; background:#fafbff; border-radius:10px; }
        .step-num { width:28px; height:28px; border-radius:8px; background:linear-gradient(135deg,#0050cb,#0066ff); color:white; font-size:12px; font-weight:700; display:flex; align-items:center; justify-content:center; flex-shrink:0; }
        .step-num.admin-num { background:linear-gradient(135deg,#7c3aed,#9333ea); }
        .step strong { display:block; font-size:13px; margin-bottom:4px; }
        .step p { font-size:13px; color:#64748b; line-height:1.5; }

        .feature-grid { display:grid; grid-template-columns:1fr 1fr; gap:10px; }
        .feature-card { padding:14px; border-radius:10px; background:#f8faff; border:1px solid #e8efff; display:flex; gap:10px; align-items:flex-start; }
        .feature-card.blue   { background:#eff6ff; border-color:#dbeafe; }
        .feature-card.green  { background:#f0fdf4; border-color:#dcfce7; }
        .feature-card.amber  { background:#fffbeb; border-color:#fef3c7; }
        .feature-card.purple { background:#faf5ff; border-color:#ede9fe; }
        .feature-icon { font-size:20px; flex-shrink:0; margin-top:2px; }
        .feature-card strong { font-size:13px; display:block; margin-bottom:4px; }
        .feature-card p { font-size:12px; color:#64748b; line-height:1.4; }

        .tip-box,.warning-box { display:flex; gap:10px; align-items:flex-start; padding:12px 14px; border-radius:10px; font-size:13px; line-height:1.5; margin-top:14px; }
        .tip-box     { background:#fffbeb; border:1px solid #fed7aa; color:#92400e; }
        .warning-box { background:#fff1f2; border:1px solid #fecdd3; color:#9f1239; }
        .tip-icon    { font-size:16px; flex-shrink:0; margin-top:1px; }

        .info-grid { display:flex; flex-direction:column; gap:8px; margin-top:14px; }
        .info-item { display:flex; gap:10px; align-items:baseline; padding:10px 12px; background:#f8faff; border-radius:8px; font-size:13px; }
        .info-label { font-weight:700; color:#0050cb; white-space:nowrap; min-width:140px; flex-shrink:0; }
        .info-label.admin-label { color:#7c3aed; }
        .info-item span:last-child { color:#475569; }

        .tag { display:inline-block; background:#eff6ff; color:#1d4ed8; border:1px solid #bfdbfe; border-radius:5px; padding:1px 7px; font-size:12px; font-weight:600; }
        .tag.tag-red { background:#fff1f2; color:#be123c; border-color:#fecdd3; }

        @media (max-width:640px) {
          .help-layout { grid-template-columns:1fr; }
          .toc { display:none; }
          .feature-grid { grid-template-columns:1fr; }
          .help-hero h1 { font-size:20px; }
        }
      `}</style>

      <div className="help-page">
        {/* Hero — สีต่างกันตาม role */}
        <div className={`help-hero ${isAdmin ? 'admin-hero' : 'student-hero'}`}>
          <div className="help-hero-badge">
            {isAdmin ? '⚡ แอดมิน/ครู' : '🎓 นักเรียน'} · คู่มือการใช้งาน
          </div>
          <h1>
            {isAdmin
              ? 'คู่มือสำหรับครูและแอดมิน\nThe Scholar V3'
              : 'คู่มือการใช้งาน\nThe Scholar V3'}
          </h1>
          <p>
            {isAdmin
              ? 'วิธีจัดการนักเรียน ควิซ สื่อ ประกาศ OMR และนำออกข้อมูล'
              : 'วิธีใช้งานทุกฟีเจอร์ — สื่อการเรียน ควิซ OMR และโปรไฟล์'}
          </p>
          <a href="/dashboard/profile" className="back-btn">← กลับสู่โปรไฟล์</a>
        </div>

        {/* แอดมินเห็น Tab switcher เพิ่ม */}
        {isAdmin && (
          <div className="tab-bar">
            <button
              className={`tab-btn tab-user ${tab === 'user' ? 'active' : ''}`}
              onClick={() => setTab('user')}
            >
              🎓 คู่มือนักเรียน
            </button>
            <button
              className={`tab-btn tab-admin ${tab === 'admin' ? 'active' : ''}`}
              onClick={() => setTab('admin')}
            >
              ⚡ คู่มือแอดมิน
            </button>
          </div>
        )}

        {/* Layout */}
        <div className="help-layout">
          {/* TOC */}
          <div className="toc">
            <div className="toc-title">สารบัญ</div>
            {sections.map(s => (
              <button
                key={s.id}
                className={`toc-item ${
                  activeSection === s.id
                    ? tab === 'admin' ? 'active-admin' : 'active-user'
                    : ''
                }`}
                onClick={() => {
                  setActiveSection(s.id)
                  document.getElementById(s.id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
                }}
              >
                <span>{s.icon}</span>
                <span style={{fontSize:12}}>{s.title}</span>
              </button>
            ))}
          </div>

          {/* Sections */}
          <div className="content-area">
            {sections.map(s => (
              <HelpSection
                key={s.id}
                section={s}
                isAdmin={tab === 'admin'}
                onEnter={() => setActiveSection(s.id)}
              />
            ))}
          </div>
        </div>
      </div>
    </>
  )
}

function HelpSection({
  section,
  isAdmin,
  onEnter,
}: {
  section: Section
  isAdmin: boolean
  onEnter: () => void
}) {
  const [open, setOpen] = useState(true)

  return (
    <div id={section.id} className="help-section" onMouseEnter={onEnter}>
      <div className="section-header" onClick={() => setOpen(o => !o)}>
        <div className={`section-emoji ${isAdmin ? 'admin-emoji' : ''}`}>{section.icon}</div>
        <div className="section-title">{section.title}</div>
        <span className={`section-chevron ${open ? 'open' : ''}`}>▼</span>
      </div>
      <div className={`section-body ${open ? 'open' : ''}`}>
        {section.content}
      </div>
    </div>
  )
}