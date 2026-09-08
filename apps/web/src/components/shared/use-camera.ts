import jsQR from "jsqr";
import { useEffect, useRef, useState } from "react";

export interface UseCameraOptions {
  /** False releases the camera, for a page that is done scanning. */
  enabled?: boolean;
}

/**
 * Opens the rear camera into the returned video ref and reads QR codes from
 * its frames. The same code seen on many frames calls back many times; the
 * caller decides what a repeat means.
 */
export function useCamera(onCode: (code: string) => void, options: UseCameraOptions = {}) {
  const enabled = options.enabled ?? true;
  const video = useRef<HTMLVideoElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [active, setActive] = useState(false);
  const callback = useRef(onCode);

  useEffect(() => {
    callback.current = onCode;
  }, [onCode]);

  useEffect(() => {
    const element = video.current;
    if (!element || !enabled) return;

    let stream: MediaStream | null = null;
    let frame = 0;
    let stopped = false;
    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d", { willReadFrequently: true });

    const tick = () => {
      if (stopped) return;

      if (element.readyState >= HTMLMediaElement.HAVE_ENOUGH_DATA && context) {
        canvas.width = element.videoWidth;
        canvas.height = element.videoHeight;
        context.drawImage(element, 0, 0, canvas.width, canvas.height);
        const image = context.getImageData(0, 0, canvas.width, canvas.height);
        const found = jsQR(image.data, image.width, image.height, {
          inversionAttempts: "dontInvert",
        });
        if (found?.data) callback.current(found.data);
      }

      frame = requestAnimationFrame(tick);
    };

    navigator.mediaDevices
      .getUserMedia({ video: { facingMode: "environment" }, audio: false })
      .then((media) => {
        if (stopped) {
          for (const track of media.getTracks()) track.stop();
          return;
        }
        stream = media;
        element.srcObject = media;
        return element.play().then(() => {
          setActive(true);
          frame = requestAnimationFrame(tick);
        });
      })
      .catch((cause: unknown) => {
        setError(
          cause instanceof Error && cause.name === "NotAllowedError"
            ? "Camera access was refused. Allow it in the browser, or paste below instead."
            : "No camera could be opened. Paste below instead.",
        );
      });

    return () => {
      stopped = true;
      setActive(false);
      cancelAnimationFrame(frame);
      if (stream) for (const track of stream.getTracks()) track.stop();
    };
  }, [enabled]);

  return { video, error, active };
}
