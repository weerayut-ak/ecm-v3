/**
 * AppLogo — โลโก้แอพ
 *
 * วิธีเปลี่ยนโลโก้:
 *   1. วางไฟล์ภาพ (PNG / SVG) ไว้ที่  public/logo.png  (หรือ .svg)
 *   2. แก้ค่า LOGO_SRC ด้านล่างให้ตรงกับชื่อไฟล์
 *   3. แก้ APP_NAME ให้เป็นชื่อแอพที่ต้องการ
 *   4. ถ้าไม่ต้องการรูป ให้ตั้ง LOGO_SRC = '' — จะแสดงแค่ชื่อข้อความ
 */

// ── ตั้งค่าตรงนี้ ─────────────────────────────────────────────────────────
const LOGO_SRC = '/logo.png'// ← วางไฟล์ใน public/ แล้วใส่ชื่อ เช่น '/logo.png'
const APP_NAME  = 'English Class' // ชื่อแอพ (ใช้เป็น alt text และ fallback)
const LOGO_SIZE = 32            // ขนาดโลโก้ (px) — ปรับได้
// ──────────────────────────────────────────────────────────────────────────

interface AppLogoProps {
  /** แสดงชื่อแอพข้างๆ โลโก้ด้วยหรือเปล่า */
  showName?: boolean
  /** ขนาดของรูป (override LOGO_SIZE) */
  size?: number
  /** style เพิ่มเติมสำหรับ wrapper */
  style?: React.CSSProperties
  /** class เพิ่มเติม */
  className?: string
}

export default function AppLogo({
  showName = true,
  size = LOGO_SIZE,
  style,
  className,
}: AppLogoProps) {
  return (
    <div
      className={className}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        textDecoration: 'none',
        ...style,
      }}
    >
      {/* ── รูปโลโก้ ── */}
      {LOGO_SRC ? (
        <img
          src={LOGO_SRC}
          alt={APP_NAME}
          width={size}
          height={size}
          style={{
            width: size,
            height: size,
            objectFit: 'contain',
            borderRadius: size * 0.22,   // มุมโค้งอัตโนมัติตามขนาด
            flexShrink: 0,
          }}
          // ถ้าโหลดรูปไม่ได้ ซ่อนและแสดงชื่อข้อความแทน
          onError={e => { (e.target as HTMLImageElement).style.display = 'none' }}
        />
      ) : (
        /* Fallback: ตัวอักษรย่อ */
        <div style={{
          width: size, height: size, borderRadius: size * 0.22,
          background: 'linear-gradient(135deg, #0050cb, #0066ff)',
          color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontWeight: 900, fontSize: size * 0.45, flexShrink: 0,
          boxShadow: '0 4px 12px rgba(0,80,203,0.25)',
        }}>
          {APP_NAME[0]}
        </div>
      )}

      {/* ── ชื่อแอพ ── */}
      {showName && (
        <span style={{
          fontWeight: 900,
          fontSize: 17,
          color: '#0050cb',
          letterSpacing: '-0.03em',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
        }}>
          {APP_NAME}
        </span>
      )}
    </div>
  )
}