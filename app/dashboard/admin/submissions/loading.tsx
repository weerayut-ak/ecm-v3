export default function Loading() {
  return (
    <div style={{ display:"flex", alignItems:"center", justifyContent:"center", minHeight:"60vh" }}>
      <div style={{ width:36, height:36, borderRadius:"50%", border:"3px solid transparent", borderTopColor:"currentColor", animation:"spin 0.7s linear infinite", opacity:0.6 }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
