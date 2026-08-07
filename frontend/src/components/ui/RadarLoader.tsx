import { cn } from "../../lib/utils"

interface RadarLoaderProps {
  className?: string
  label?: string
}

/**
 * Cinematic loading state: a radar sweep with a soft ping, replacing the
 * plain spinners. Pairs with a skeleton grid when data is far away.
 */
export default function RadarLoader({ className, label = "Scanning the sky" }: RadarLoaderProps) {
  return (
    <div className={cn("flex flex-col items-center justify-center gap-5 py-20", className)}>
      <div className="relative h-20 w-20">
        <div className="absolute inset-0 rounded-full border border-sky-400/25" />
        <div className="absolute inset-2 rounded-full border border-sky-400/20" />
        <div className="absolute inset-4 rounded-full border border-sky-400/15" />
        <div className="absolute inset-0 rounded-full bg-[radial-gradient(circle,rgba(56,189,248,0.12),transparent_70%)]" />
        <div className="radar-sweep absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 h-8 w-8 border-sky-400/40" />
        <div className="absolute inset-0 overflow-hidden rounded-full">
          <div className="absolute h-px w-full origin-center animate-[radar-spin_2.8s_linear_infinite] bg-gradient-to-r from-transparent via-sky-400/70 to-transparent" />
        </div>
      </div>
      <p className="font-grotesk text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">
        {label}
        <span className="blink-soft">…</span>
      </p>
    </div>
  )
}
