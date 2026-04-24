export default function Loading() {
  return (
    <div style={{
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      minHeight: "60vh", // จัดให้อยู่กึ่งกลางหน้าจอ
      width: "100%"
    }}>
      <div className="nx-loader">
        <p className="nx-loader-text">LOADING</p>
        <span className="nx-load"></span>
      </div>

      <style>{`
        /* กำหนดขนาดกล่อง Loader หลัก */
        .nx-loader {
          width: 80px;
          height: 50px;
          position: relative;
        }

        /* ส่วนข้อความ LOADING */
        .nx-loader-text {
          position: absolute;
          top: 0;
          padding: 0;
          margin: 0;
          color: #C8B6FF; /* สีตัวอักษร */
          font-family: var(--font), sans-serif;
          font-size: 0.8rem;
          font-weight: 700;
          letter-spacing: 1px;
          animation: nx_text_anim 3.5s ease both infinite;
        }

        /* ส่วนเส้นยืดหด (ตัวหลัก) */
        .nx-load {
          background-color: #9A79FF;
          border-radius: 50px;
          display: block;
          height: 16px;
          width: 16px;
          bottom: 0;
          position: absolute;
          transform: translateX(64px);
          animation: nx_loading_anim 3.5s ease both infinite;
        }

        /* ส่วนเงาหรือส่วนที่ยืดออกของเส้น */
        .nx-load::before {
          position: absolute;
          content: "";
          width: 100%;
          height: 100%;
          background-color: #D1C2FF;
          border-radius: inherit;
          animation: nx_loading2_anim 3.5s ease both infinite;
        }

        /* --- Keyframes Animations --- */
        @keyframes nx_text_anim {
          0% { letter-spacing: 1px; transform: translateX(0px); }
          40% { letter-spacing: 2px; transform: translateX(26px); }
          80% { letter-spacing: 1px; transform: translateX(32px); }
          90% { letter-spacing: 2px; transform: translateX(0px); }
          100% { letter-spacing: 1px; transform: translateX(0px); }
        }

        @keyframes nx_loading_anim {
          0% { width: 16px; transform: translateX(0px); }
          40% { width: 100%; transform: translateX(0px); }
          80% { width: 16px; transform: translateX(64px); }
          90% { width: 100%; transform: translateX(0px); }
          100% { width: 16px; transform: translateX(0px); }
        }

        @keyframes nx_loading2_anim {
          0% { transform: translateX(0px); width: 16px; }
          40% { transform: translateX(0%); width: 80%; }
          80% { width: 100%; transform: translateX(0px); }
          90% { width: 80%; transform: translateX(15px); }
          100% { transform: translateX(0px); width: 16px; }
        }
      `}</style>
    </div>
  );
}
