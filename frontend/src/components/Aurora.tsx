/** Ambient aurora background — animated gradient blobs (reactbits-style). */
export default function Aurora() {
  return (
    <div className="aurora" aria-hidden>
      <div
        className="aurora-blob"
        style={{
          top: "-15%",
          left: "-10%",
          width: 520,
          height: 520,
          background: "radial-gradient(circle, rgba(14,165,233,0.55), transparent 65%)",
        }}
      />
      <div
        className="aurora-blob"
        style={{
          top: "20%",
          right: "-12%",
          width: 640,
          height: 640,
          background: "radial-gradient(circle, rgba(124,58,237,0.4), transparent 65%)",
          animationDelay: "-6s",
        }}
      />
      <div
        className="aurora-blob"
        style={{
          bottom: "-20%",
          left: "25%",
          width: 560,
          height: 560,
          background: "radial-gradient(circle, rgba(20,184,166,0.35), transparent 65%)",
          animationDelay: "-12s",
        }}
      />
    </div>
  )
}
