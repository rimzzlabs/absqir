import { MAX_RADIUS_METERS, MIN_RADIUS_METERS } from "@absqir/core/geo";
import { Button } from "@absqir/ui/button";
import { cn } from "@absqir/ui/lib/utils";
import { CrosshairIcon, SpinnerIcon } from "@phosphor-icons/react";
import type { Circle, Map as LeafletMap, Marker } from "leaflet";
// Leaflet ships its own stylesheet, and the map renders as a pile of
// unpositioned tiles without it.
import "leaflet/dist/leaflet.css";
import { useEffect, useRef, useState } from "react";
import { match, P } from "ts-pattern";

/**
 * Picks a point and a radius on a map.
 *
 * Leaflet, loaded only when this component mounts, because a settings page
 * should not carry a map into every other page of the app. Raster tiles from
 * OpenStreetMap need no account and no key, which keeps a self-host working
 * out of the box. An operator who expects real traffic must set their own
 * tile server: see PUBLIC_MAP_TILE_URL.
 */

const TILE_URL =
  import.meta.env.PUBLIC_MAP_TILE_URL ?? "https://tile.openstreetmap.org/{z}/{x}/{y}.png";
const TILE_ATTRIBUTION =
  import.meta.env.PUBLIC_MAP_TILE_ATTRIBUTION ??
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';

export interface MapPickerValue {
  latitude: number;
  longitude: number;
  radiusMeters: number;
}

export interface MapPickerProps {
  value: MapPickerValue;
  onChange: (value: MapPickerValue) => void;
  className?: string;
}

/** Where the map opens when the organizer has picked nothing yet. */
const FALLBACK_ZOOM = 2;
const PLACED_ZOOM = 17;

export function MapPicker(props: MapPickerProps) {
  const host = useRef<HTMLDivElement>(null);
  const map = useRef<LeafletMap | null>(null);
  const marker = useRef<Marker | null>(null);
  const ring = useRef<Circle | null>(null);
  const [ready, setReady] = useState(false);
  const [locating, setLocating] = useState(false);

  // The map is built once and then driven by the effect below. Every value
  // the setup needs goes through a ref, so the setup depends on nothing and
  // a keystroke in the radius field cannot tear the map down and rebuild it.
  const onChange = useRef(props.onChange);
  onChange.current = props.onChange;
  const radius = useRef(props.value.radiusMeters);
  radius.current = props.value.radiusMeters;
  const start = useRef<[number, number]>([props.value.latitude, props.value.longitude]);

  useEffect(() => {
    const element = host.current;
    if (!element) return;

    let cancelled = false;

    // Leaflet reaches for `window` at import time, so it can only load in the
    // browser, after the island hydrates.
    void import("leaflet").then((L) => {
      if (cancelled || !host.current) return;

      const at = start.current;
      const instance = L.map(element, { attributionControl: true }).setView(
        at,
        match(isPlaced({ latitude: at[0], longitude: at[1] }))
          .with(true, () => PLACED_ZOOM)
          .otherwise(() => FALLBACK_ZOOM),
      );

      L.tileLayer(TILE_URL, { attribution: TILE_ATTRIBUTION, maxZoom: 19 }).addTo(instance);

      // Leaflet's own marker is a pair of image files it resolves against the
      // stylesheet's address, which a bundler rewrites and breaks. A div
      // marker carries no image and takes the app's own colours.
      marker.current = L.marker(at, {
        draggable: true,
        keyboard: true,
        title: "The place. Drag to move it.",
        icon: L.divIcon({
          className: "",
          html: '<span class="block size-4 rounded-full border-2 border-white bg-primary shadow-md"></span>',
          iconSize: [16, 16],
          iconAnchor: [8, 8],
        }),
      }).addTo(instance);
      ring.current = L.circle(at, {
        radius: radius.current,
        color: "var(--color-primary)",
        weight: 2,
        fillOpacity: 0.12,
      }).addTo(instance);

      const move = (latitude: number, longitude: number) => {
        onChange.current({ latitude, longitude, radiusMeters: radius.current });
      };

      instance.on("click", (event) => move(event.latlng.lat, event.latlng.lng));
      marker.current.on("dragend", () => {
        const at = marker.current?.getLatLng();
        if (at) move(at.lat, at.lng);
      });

      map.current = instance;
      setReady(true);
    });

    return () => {
      cancelled = true;
      map.current?.remove();
      map.current = null;
      marker.current = null;
      ring.current = null;
    };
  }, []);

  // Follows the value, whichever control changed it: the map, the radius
  // slider, or the "use my location" button.
  useEffect(() => {
    if (!ready) return;

    const at: [number, number] = [props.value.latitude, props.value.longitude];
    marker.current?.setLatLng(at);
    ring.current?.setLatLng(at);
    ring.current?.setRadius(props.value.radiusMeters);
  }, [ready, props.value.latitude, props.value.longitude, props.value.radiusMeters]);

  const useMyLocation = () => {
    if (!navigator.geolocation) return;

    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocating(false);
        const at: [number, number] = [position.coords.latitude, position.coords.longitude];
        map.current?.setView(at, PLACED_ZOOM);
        props.onChange({
          latitude: at[0],
          longitude: at[1],
          radiusMeters: radius.current,
        });
      },
      () => setLocating(false),
      { enableHighAccuracy: true, timeout: 10_000 },
    );
  };

  return (
    <div className="flex flex-col gap-2">
      <div
        ref={host}
        // Leaflet measures its host, so the height cannot come from content.
        className={cn(
          "border-border bg-muted z-0 h-64 w-full overflow-hidden rounded-lg border",
          props.className,
        )}
        role="application"
        aria-label="Pick the place on the map"
      />

      <div className="flex flex-wrap items-center gap-2">
        <Button type="button" variant="outline" size="sm" onClick={useMyLocation}>
          {match(locating)
            .with(true, () => <SpinnerIcon className="animate-spin" />)
            .otherwise(() => (
              <CrosshairIcon />
            ))}
          Use my location
        </Button>
        <p className="text-muted-foreground text-xs">
          Tap the map, or drag the pin. The circle is how far from it a check-in still counts.
        </p>
      </div>
    </div>
  );
}

export function clampRadius(value: number): number {
  return Math.min(MAX_RADIUS_METERS, Math.max(MIN_RADIUS_METERS, Math.round(value)));
}

/** True once the organizer has actually put the pin somewhere. */
export function isPlaced(value: Pick<MapPickerValue, "latitude" | "longitude">): boolean {
  return match([value.latitude, value.longitude])
    .with([0, 0], () => false)
    .with([P.number, P.number], () => true)
    .otherwise(() => false);
}
