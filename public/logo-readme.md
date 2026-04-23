# โลโก้แอพ

วางไฟล์โลโก้ของคุณในโฟลเดอร์ `public/` นี้

## ไฟล์ที่แนะนำ

| ไฟล์ | ขนาด | ใช้สำหรับ |
|------|------|-----------|
| `logo.svg` | ไม่จำกัด | โลโก้หลัก (แนะนำ) |
| `logo.png` | 512×512px+ | รองรับทุก browser |
| `favicon.ico` | 32×32px | Tab icon |
| `apple-touch-icon.png` | 180×180px | iOS home screen |
| `og-image.png` | 1200×630px | Social media preview |

## วิธีเปลี่ยนโลโก้ใน Sidebar

แก้ไขไฟล์ `components/layout/Sidebar.tsx` บรรทัดที่มี `<BookOpen>` หรือ `<Sparkles>`:

```tsx
import Image from 'next/image'

// แทนที่ icon ด้วย:
<Image src="/logo.png" width={36} height={36} alt="Logo" style={{ borderRadius: 10 }} />
```

## วิธีเปลี่ยน Favicon

แก้ไขไฟล์ `app/layout.tsx`:
```tsx
export const metadata = {
  icons: {
    icon: '/favicon.ico',
    apple: '/apple-touch-icon.png',
  },
}
```
