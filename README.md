# 📚 English Class Manager v3

ระบบจัดการชั้นเรียนวิชาภาษาอังกฤษ สำหรับนักเรียนระดับมัธยมศึกษาปีที่ 1–3  
พัฒนาด้วย **Next.js 15** + **Supabase** + **TypeScript** + **Tailwind CSS**

---

## ✨ ฟีเจอร์หลัก

| ฟีเจอร์ | รายละเอียด |
|---|---|
| 📝 แบบทดสอบออนไลน์ | Timer นับถอยหลัง, ป้องกันออกจากหน้าต่าง, ผลคะแนนทันที |
| 📷 OMR Scanner | สแกนกระดาษคำตอบผ่านกล้อง |
| 🎬 สื่อการเรียน | วิดีโอ + เนื้อหาความรู้ |
| 📣 ประกาศ | ข้อความ, รูปภาพ, ตารางคะแนน |
| 👥 จัดการนักเรียน | เพิ่ม/แก้ไข/ลบ, Export CSV |
| 👤 โปรไฟล์ | แก้ไขข้อมูล, อัปโหลดรูป, ประวัติคะแนน |
| 📱 รองรับมือถือ | Bottom Navigation Bar |
| 🔐 2 บทบาท | Admin (ครู) และ Student (นักเรียน) |

---

## ⚙️ สิ่งที่ต้องการก่อนติดตั้ง

- **Node.js** v18.17+ → https://nodejs.org (เลือก LTS)
- **บัญชี Supabase** (ฟรี) → https://supabase.com

---

## 🚀 ขั้นตอนติดตั้ง

### 1. ตั้งค่า Supabase

1. สร้างโปรเจกต์ใหม่ที่ supabase.com
2. **SQL Editor** → วาง `supabase/schema.sql` ทั้งหมด → **Run**
3. **SQL Editor** → วาง `supabase/schema_quiz_sessions.sql` → **Run**
4. **Storage** → สร้าง 3 Buckets (ตั้งเป็น Public ทั้งหมด):
   - `avatars` — รูปโปรไฟล์
   - `media` — สื่อการเรียน
   - `announcements` — รูปประกาศ
5. **Authentication → Users** → Add user (บัญชีครู/Admin)
6. **SQL Editor** → อัปเดต role:
   ```sql
   UPDATE profiles SET role = 'admin' WHERE id = '<user-uuid>';
   ```
7. **Project Settings → API** → คัดลอก URL และ Keys ไว้

### 2. ตั้งค่าโปรเจกต์

```bash
cp .env.example .env.local   # macOS/Linux
copy .env.example .env.local  # Windows
```

แก้ไขไฟล์ `.env.local`:
```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
NEXT_PUBLIC_REVALIDATE_TIME=60
```

### 3. ติดตั้งและรัน

```bash
npm install
npm run dev      # เปิด http://localhost:3000
```

---

## 📋 คำสั่งที่ใช้บ่อย

| คำสั่ง | ความหมาย |
|---|---|
| `npm run dev` | รันโหมด Development |
| `npm run build` | Build สำหรับ Production |
| `npm start` | รัน Production Build |

---

## 📁 โครงสร้างโปรเจกต์

```
ecm-v3/
├── app/                  # หน้าต่างๆ (Next.js App Router)
│   ├── api/              # API Routes
│   ├── dashboard/        # หน้า Dashboard (admin/, quizzes/, media/ ...)
│   ├── login/            # หน้าล็อกอิน
│   └── register/         # หน้าสมัครสมาชิก
├── components/           # React Components
│   ├── admin/            # Components สำหรับ Admin
│   ├── omr/              # ระบบ OMR Scanner
│   └── layout/           # Layout Components
├── lib/                  # Utility (auth, supabase, export, upload)
├── hooks/                # Custom React Hooks
├── types/                # TypeScript Types
├── supabase/
│   ├── schema.sql              # ⭐ รันก่อน
│   └── schema_quiz_sessions.sql # ⭐ รันหลัง
├── .env.example          # ตัวอย่าง Environment Variables
└── middleware.ts         # Auth Middleware
```

---

## 🚢 Deploy (Production)

1. Push โปรเจกต์ขึ้น GitHub
2. เชื่อม Repository กับ vercel.com
3. เพิ่ม Environment Variables ใน Vercel Dashboard
4. Supabase → Authentication → URL Configuration → เพิ่ม URL ของ Vercel

---

## ❗ ข้อควรระวัง

- `SUPABASE_SERVICE_ROLE_KEY` มีสิทธิ์ Admin เต็ม อย่าเปิดเผยต่อสาธารณะ
- ไม่ควร Commit ไฟล์ `.env.local` ขึ้น Git
