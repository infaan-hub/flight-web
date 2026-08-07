/**
 * Curated Mixkit cinematic footage (verified 200 on assets.mixkit.co).
 * Keep 360p/720p variants — 1080p files are 80MB+ and unusable on the web.
 * Each key maps to an ordered list of fallback sources, then an animated
 * sky gradient (see VideoBackground).
 */
export const MIXKIT = {
  /** Wing + fluffy clouds + sun through a plane window — hero-grade. */
  skyThroughWindow: ["https://assets.mixkit.co/videos/4368/4368-360.mp4"],
  /** Pink sunset over the clouds from a plane window. */
  pinkSunset: ["https://assets.mixkit.co/videos/4204/4204-360.mp4"],
  /** Airliner taking off at dusk, taxiway lights. */
  takeoffDusk: ["https://assets.mixkit.co/videos/28000/28000-720.mp4"],
  /** Night landing on illuminated runway tracks. */
  landingTracks: ["https://assets.mixkit.co/videos/7374/7374-720.mp4"],
  /** Airliner climbing into a golden sky. */
  takeoffSun: ["https://assets.mixkit.co/videos/27988/27988-720.mp4"],
} as const

export type MixkitKey = keyof typeof MIXKIT

export function mixkitSources(key: MixkitKey): readonly string[] {
  return MIXKIT[key]
}
