import type { ReactNode } from "react"
import { motion } from "framer-motion"
import VideoBackground from "../cinema/VideoBackground"
import CloudLayer from "../cinema/CloudLayer"
import { cn } from "../../lib/utils"
import type { MixkitKey } from "../../lib/video"

interface PageHeroProps {
  kicker: string
  title: ReactNode
  description?: ReactNode
  /** Cinematic footage behind the header. */
  video?: MixkitKey
  children?: ReactNode
  className?: string
}

/**
 * Cinematic page header: footage or aurora sky behind, cloud layer, then a
 * staggered title reveal. Every sub-page opens on this.
 */
export default function PageHero({ kicker, title, description, video = "skyThroughWindow", children, className }: PageHeroProps) {
  return (
    <section className={cn("relative overflow-hidden rounded-b-[2.5rem] border-b border-white/5 pb-14 pt-16 md:pt-24", className)}>
      <VideoBackground video={video} overlayOpacity={0.68} videoOpacity={0.45} blur="blur(12px)" />
      <CloudLayer density={3} intensity={0.7} />
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-[#030610]" />

      <div className="container-custom relative z-10">
        <motion.p
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="font-grotesk flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.35em] text-sky-400"
        >
          <span className="inline-block h-px w-8 bg-gradient-to-r from-transparent to-sky-400" />
          {kicker}
        </motion.p>
        <motion.h1
          initial={{ opacity: 0, y: 26, filter: "blur(10px)" }}
          animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
          transition={{ duration: 0.8, delay: 0.08, ease: [0.22, 1, 0.36, 1] }}
          className="font-display mt-4 max-w-3xl text-4xl font-bold tracking-tight md:text-6xl"
        >
          {title}
        </motion.h1>
        {description && (
          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.22 }}
            className="mt-4 max-w-xl text-sm leading-relaxed text-slate-300 md:text-base"
          >
            {description}
          </motion.p>
        )}
        {children && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.34 }}
            className="mt-6"
          >
            {children}
          </motion.div>
        )}
      </div>
    </section>
  )
}
