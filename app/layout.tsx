import type { Metadata, Viewport } from 'next'
import './globals.css'
import { Toaster } from 'react-hot-toast'
<html lang="th" suppressHydrationWarning data-scroll-behavior="smooth"></html>

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
}

export const metadata: Metadata = {
  title: 'English Class Manager',
  description: 'ระบบจัดการนักเรียนวิชาภาษาอังกฤษ ม.1–3',
  manifest: '/manifest.json',   
  // เพิ่มส่วน icons
  icons: {
    icon: '/logo.png', // เปลี่ยนเป็นชื่อไฟล์รูปที่คุณมีในโฟลเดอร์ public 
    apple: '/logo.png', // (ตัวเลือกเสริม) สำหรับไอคอนเวลาเซฟลงหน้าจอมือถือ Apple
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="th" suppressHydrationWarning>

        <head>
          <meta name="theme-color" content="#0050cb" />
          <meta name="apple-mobile-web-app-capable" content="yes" />
          <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        </head>

      <body suppressHydrationWarning>
        {children}
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 3500,
            style: {
              fontFamily: "'Noto Sans Thai', sans-serif",
              fontSize: '13px',
              borderRadius: '12px',
              border: '1px solid rgba(0,0,0,0.08)',
              boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
              padding: '10px 14px',
            },
          }}
        />
      </body>
    </html>
  )
}