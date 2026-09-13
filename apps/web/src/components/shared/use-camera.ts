import jsQR from "jsqr";
import { useCallback, useEffect, useRef, useState } from "react";
import { match, P } from "ts-pattern";

export interface UseCameraOptions {
  /**
   * What the reader can do instead, named exactly. Each scanner takes a
   * different thing by hand, so the hook states the cause and the caller
   * states the way out. Example: "Paste the link from the room screen below."
   */
  fallback: string;
  /** False releases the camera, for a page that is done scanning. */
  enabled?: boolean;
}

/**
 * Why the camera did not open. Only `refused` can be undone from the browser,
 * so it is the one the coach mark answers.
 */
export type CameraFaultKind = "refused" | "insecure" | "missing" | "busy" | "unknown";

export interface CameraFault {
  kind: CameraFaultKind;
  /** The cause and the way out, in one sentence for the reader. */
  message: string;
}

const INSECURE = "The camera needs an https address.";

/**
 * Reads the fault. A page served over plain http gets no camera at all, and
 * some engines report that as a refusal, so the address is checked before the
 * name of the fault.
 */
function causeOf(cause: unknown): Omit<CameraFault, "message"> & { cause: string } {
  if (!window.isSecureContext) return { kind: "insecure", cause: INSECURE };

  const name = match(cause)
    .with(P.instanceOf(Error), (cause) => cause.name)
    .otherwise(() => "" as const);

  if (name === "NotAllowedError") {
    return { kind: "refused", cause: "Camera access was refused." };
  }

  if (name === "NotFoundError" || name === "OverconstrainedError") {
    return { kind: "missing", cause: "No camera was found on this device." };
  }

  if (name === "NotReadableError") {
    return {
      kind: "busy",
      cause: "The camera is busy in another app. Close that app, then retry.",
    };
  }

  return { kind: "unknown", cause: "The camera could not be opened." };
}

/**
 * Opens the rear camera into the returned video ref and reads QR codes from
 * its frames. The same code seen on many frames calls back many times; the
 * caller decides what a repeat means.
 */
export function useCamera(onCode: (code: string) => void, options: UseCameraOptions) {
  const enabled = options.enabled ?? true;
  const { fallback } = options;
  const video = useRef<HTMLVideoElement>(null);
  const [fault, setFault] = useState<CameraFault | null>(null);
  const [active, setActive] = useState(false);
  const callback = useRef(onCode);

  /**
   * Asks the browser again, for a reader who just changed the permission.
   * Forgetting the fault is what starts a fresh attempt.
   */
  const retry = useCallback(() => setFault(null), []);

  useEffect(() => {
    callback.current = onCode;
  }, [onCode]);

  useEffect(() => {
    const element = video.current;
    // A recorded fault ends the attempt. retry() clears it to start another.
    if (!element || !enabled || fault) return;

    // Outside a secure context the browser hides mediaDevices, so reading
    // getUserMedia off it throws before any promise exists to catch it.
    const devices = navigator.mediaDevices;
    if (!devices?.getUserMedia) {
      const secure = window.isSecureContext;
      setFault({
        kind: match(secure)
          .with(true, () => "missing" as const)
          .otherwise(() => "insecure" as const),
        message: `${match(secure)
          .with(true, () => "This browser has no camera." as const)
          .otherwise(() => INSECURE)} ${fallback}`,
      });
      return;
    }

    let stream: MediaStream | null = null;
    let frame = 0;
    let stopped = false;
    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d", { willReadFrequently: true });

    const release = () => {
      if (!stream) return;
      for (const track of stream.getTracks()) track.stop();
      stream = null;
    };

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

    devices
      .getUserMedia({ video: { facingMode: "environment" }, audio: false })
      .then((media) => {
        stream = media;
        if (stopped) {
          release();
          return;
        }

        element.srcObject = media;
        return element.play().then(() => {
          setFault(null);
          setActive(true);
          frame = requestAnimationFrame(tick);
        });
      })
      .catch((reason: unknown) => {
        // play() can fail after the camera opened. Hand it back either way.
        release();
        const { kind, cause } = causeOf(reason);
        setFault({ kind, message: `${cause} ${fallback}` });
      });

    return () => {
      stopped = true;
      setActive(false);
      cancelAnimationFrame(frame);
      release();
    };
  }, [enabled, fallback, fault]);

  return { video, fault, active, retry };
}
