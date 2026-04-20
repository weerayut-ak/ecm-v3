import type { Metadata } from 'next'
import './globals.css'
import { Toaster } from 'react-hot-toast'

export const metadata: Metadata = {
  title: 'English Class Manager',
  description: 'ระบบจัดการนักเรียนวิชาภาษาอังกฤษ ม.1–3',
  viewport: 'width=device-width, initial-scale=1, maximum-scale=1',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="th" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+Thai:wght@300;400;500;600;700&display=swap" rel="stylesheet" />
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