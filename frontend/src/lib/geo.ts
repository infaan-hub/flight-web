import type { MapBounds } from "../services/api"

export interface LocationInfo {
  lat: number
  lng: number
  isZanzibar: boolean
  label: string
  bounds: MapBounds
}

const ZANZIBAR_BOUNDS: MapBounds = { lamin: -7.5, lomin: 38.0, lamax: -4.5, lomax: 40.5 }
const WORLD_BOUNDS: MapBounds = { lamin: -90, lomin: -180, lamax: 90, lomax: 180 }

export function isInZanzibar(lat: number, lng: number): boolean {
  return (
    lat >= ZANZIBAR_BOUNDS.lamin &&
    lat <= ZANZIBAR_BOUNDS.lamax &&
    lng >= ZANZIBAR_BOUNDS.lomin &&
    lng <= ZANZIBAR_BOUNDS.lomax
  )
}

export function getBoundsAround(lat: number, lng: number, radiusDeg = 1.2): MapBounds {
  return {
    lamin: lat - radiusDeg,
    lomin: lng - radiusDeg,
    lamax: lat + radiusDeg,
    lomax: lng + radiusDeg,
  }
}

export function getDefaultLocation(): LocationInfo {
  return {
    lat: -6.2222,
    lng: 39.2249,
    isZanzibar: true,
    label: "Zanzibar, Tanzania",
    bounds: ZANZIBAR_BOUNDS,
  }
}

export function getUserLocation(): Promise<LocationInfo> {
  return new Promise((resolve) => {
    if (!navigator.geolocation) {
      resolve(getDefaultLocation())
      return
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude
        const lng = pos.coords.longitude
        if (isInZanzibar(lat, lng)) {
          resolve({
            lat,
            lng,
            isZanzibar: true,
            label: "Zanzibar, Tanzania",
            bounds: ZANZIBAR_BOUNDS,
          })
        } else {
          resolve({
            lat,
            lng,
            isZanzibar: false,
            label: "Your Location",
            bounds: getBoundsAround(lat, lng),
          })
        }
      },
      () => resolve(getDefaultLocation()),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
    )
  })
}
