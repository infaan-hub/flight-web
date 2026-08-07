import { useState } from "react"
import { mixkitSources, type MixkitKey } from "../../lib/video"
import { cn } from "../../lib/utils"

interface VideoBackgroundProps {
  /** Registry key for the curated footage. */
  video?: MixkitKey
  /** Extra darkening over the footage (e.g. 0.65). */
  overlayOpacity?: number
  /** Gaussian blur applied to the video layer. */
  blur?: string
  /** Opacity of the video layer itself. */
  videoOpacity?: number
  /** Optional vertical gradient to blend into the page background. */
  gradient?: string
  className?: string
}

/**
 * Cinematic page/section background.
 *
 * Priority: curated Mixkit MP4 (autoplay, muted, loop, cover) → animated
 * sky gradient with aurora → plain dark background. Every layer is inert
 * (`aria-hidden`, pointer-events-none) so it never distracts from content.
 */
export default function VideoBackground({
  video,
  overlayOpacity = 0.55,
  blur = "blur(10px)",
  videoOpacity = 0.5,
  gradient,
  className,
}: VideoBackgroundProps) {
  const [srcIndex, setSrcIndex] = useState(0)
  const [videoDead, setVideoDead] = useState(false)
  const sources = video ? mixkitSources(video) : []

  const canPlayVideo = !videoDead && sources.length > 0 && srcIndex < sources.length

  return (
    <div aria-hidden className={cn("absolute inset-0 overflow-hidden", className)}>
      {/* Fallback: animated aurora sky (always present, video sits above it) */}
      <div className="sky-cinematic absolute inset-0" />

      {canPlayVideo && (
        <video
          key={sources[srcIndex]}
          className="absolute inset-0 h-full w-full object-cover"
          style={{ opacity: videoOpacity, filter: blur, transform: "scale(1.06)" }}
          src={sources[srcIndex]}
          autoPlay
          muted
          loop
          playsInline
          preload="metadata"
          onError={() => {
            if (srcIndex + 1 < sources.length) {
              setSrcIndex((i) => i + 1)
            } else {
              setVideoDead(true)
            }
          }}
        />
      )}

      {/* Darkening + blending overlays */}
      <div
        className="absolute inset-0 bg-[#030610]"
        style={{ opacity: overlayOpacity }}
      />
      {gradient && <div className="absolute inset-0" style={{ background: gradient }} />}
    </div>
  )
}
