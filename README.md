# 📚 English Class Manager v3
ระบบจัดการนักเรียนวิชาภาษาอังกฤษ ม.1–3

## 🚀 ติดตั้งและใช้งาน

```powershell
# 1. แตกไฟล์
Expand-Archive -Path "C:\Users\weera\Downloads\english-class-manager-v3.zip" -DestinationPath "D:\" -Force
cd D:\english-class-manager-v3

# 2. ติดตั้ง
npm install

# 3. ตั้งค่า Supabase
Copy-Item .env.local.example .env.local
notepad .env.local

# 4. รัน
npm run dev
```

## ⚙️ ตั้งค่า .env.local
```
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGci...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGci...
```

## 🗄️ ตั้งค่า Supabase
1. สร้างโปรเจกต์ที่ supabase.com
2. SQL Editor → วาง `supabase/schema.sql` → Run
3. Storage → สร้าง buckets: `avatars`, `media`, `announcements` (public)
4. Authentication → Add user (สร้าง admin account)
5. SQL Editor: `UPDATE profiles SET role = 'admin' WHERE id = '<user-id>';`

## ✨ ฟีเจอร์ใหม่ v3
- 📱 **Responsive** - รองรับมือถือ (bottom navigation bar)
- 👤 **Profile** - แก้ไขข้อมูลส่วนตัว + เปลี่ยนรูปโปรไฟล์ + ประวัติคะแนน
- 📊 **Admin Student Preview** - ดูคะแนนแยกตามชั้นเรียน/แบบทดสอบ
- ⏱️ **Timer** - แสดง countdown นับถอยหลัง + progress bar เปลี่ยนสี
- 📚 **Knowledge Cards** - ดีไซน์ใหม่ สวยงาม อ่านง่าย
- 📣 **Announcements** - แสดงรายละเอียดครบ กดขยาย/ย่อ ตารางคะแนนแบบ interactive
- 🔒 **Student List** - แสดงเฉพาะ Admin เท่านั้น
- 🎨 **UI/UX** - ปรับ theme ใหม่ทั้งหมด สะอาด ทันสมัย ลื่นไหล
