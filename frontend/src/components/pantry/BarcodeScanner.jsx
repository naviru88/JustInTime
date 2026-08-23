import { useEffect, useRef, useState } from "react";
import { BrowserMultiFormatReader } from "@zxing/browser";
import { BarcodeFormat, DecodeHintType, NotFoundException } from "@zxing/library";

// Camera-based barcode scanner. Both live scanning AND decoding an uploaded
// photo use zxing-js (a pure-JS decoder working off a canvas), not the
// browser-native BarcodeDetector API — that API doesn't exist in Android's
// System WebView (what a Capacitor app actually renders with), so live
// scanning would silently never detect anything there even though it works
// fine in a desktop Chrome tab. Using the same decoder for both paths means
// "works in the browser" and "works in the app" are the same code path.
const HINTS = new Map([
  [
    DecodeHintType.POSSIBLE_FORMATS,
    [BarcodeFormat.EAN_13, BarcodeFormat.EAN_8, BarcodeFormat.UPC_A, BarcodeFormat.UPC_E, BarcodeFormat.CODE_128],
  ],
]);

export default function BarcodeScanner({ onDetect, onDetectBatch, onClose }) {
  const videoRef = useRef(null);
  const controlsRef = useRef(null);
  const detectedRef = useRef(false);
  const zxingReaderRef = useRef(null);

  const [cameraError, setCameraError] = useState(null);
  const [manualCode, setManualCode] = useState("");
  const photoInputRef = useRef(null);
  const [photoDecoding, setPhotoDecoding] = useState(null); // null | "Reading..." string | { error }

  const getZxingReader = () => {
    if (!zxingReaderRef.current) zxingReaderRef.current = new BrowserMultiFormatReader(HINTS);
    return zxingReaderRef.current;
  };

  useEffect(() => {
    let cancelled = false;

    const start = async () => {
      try {
        // decodeFromConstraints handles getUserMedia + attaching the stream
        // to the video element itself, then calls back on every decode
        // attempt (found or not) until we stop it.
        const controls = await getZxingReader().decodeFromConstraints(
          { video: { facingMode: "environment" } },
          videoRef.current,
          (result, error) => {
            if (cancelled || detectedRef.current) return;
            if (result) {
              detectedRef.current = true;
              controlsRef.current?.stop();
              onDetect(result.getText());
            } else if (error && !(error instanceof NotFoundException)) {
              // NotFoundException fires on every frame with no barcode in
              // view — that's normal and expected, not an error to surface.
            }
          }
        );
        if (cancelled) {
          controls.stop();
          return;
        }
        controlsRef.current = controls;
      } catch (err) {
        if (!cancelled) {
          setCameraError(
            err.name === "NotAllowedError"
              ? "Camera access was denied. Enter the barcode number instead."
              : "Couldn't access the camera. Enter the barcode number instead."
          );
        }
      }
    };

    start();

    return () => {
      cancelled = true;
      controlsRef.current?.stop();
      controlsRef.current = null;
    };
  }, [onDetect]);

  // Decodes one image file to a barcode string, or null if none was found.
  const decodePhoto = async (file) => {
    const url = URL.createObjectURL(file);
    try {
      const result = await getZxingReader().decodeFromImageUrl(url);
      return result.getText();
    } catch (err) {
      if (err instanceof NotFoundException) return null;
      throw err;
    } finally {
      URL.revokeObjectURL(url);
    }
  };

  const handleManualSubmit = (e) => {
    e.preventDefault();
    if (manualCode.trim()) onDetect(manualCode.trim());
  };

  const handlePhotoPick = async (e) => {
    const files = Array.from(e.target.files || []);
    e.target.value = ""; // allow picking the same file(s) again after a miss

    if (files.length === 0) return;

    setPhotoDecoding(files.length > 1 ? `Reading ${files.length} photos...` : "Reading photo...");
    try {
      const codes = [];
      let unreadable = 0;
      for (const file of files) {
        try {
          const code = await decodePhoto(file);
          if (code) codes.push(code);
          else unreadable += 1;
        } catch {
          unreadable += 1;
        }
      }

      if (files.length === 1) {
        if (codes.length === 1) {
          detectedRef.current = true;
          controlsRef.current?.stop();
          onDetect(codes[0]);
        } else {
          setPhotoDecoding({ error: "Couldn't find a barcode in that photo. Try a clearer, closer shot." });
        }
      } else if (codes.length === 0) {
        setPhotoDecoding({ error: "Couldn't find a barcode in any of those photos." });
      } else {
        detectedRef.current = true;
        controlsRef.current?.stop();
        onDetectBatch({ codes, unreadable });
      }
    } finally {
      setPhotoDecoding((prev) => (prev && prev.error ? prev : null));
    }
  };

  const photoError = photoDecoding && typeof photoDecoding === "object" ? photoDecoding.error : null;
  const photoLabel = typeof photoDecoding === "string" ? photoDecoding : "🖼️ Upload photo(s) of a barcode";

  return (
    <div className="scanner-overlay" onClick={onClose}>
      <div className="scanner-modal" onClick={(e) => e.stopPropagation()}>
        <div className="scanner-header">
          <span>Scan a barcode</span>
          <button type="button" className="scanner-close" onClick={onClose} aria-label="Close">
            &times;
          </button>
        </div>

        {!cameraError && (
          <div className="scanner-video-wrap">
            <video ref={videoRef} className="scanner-video" muted playsInline />
            <div className="scanner-frame" />
          </div>
        )}

        {cameraError && (
          <form className="scanner-manual" onSubmit={handleManualSubmit}>
            <p className="scanner-manual-hint">{cameraError}</p>
            <input
              type="text"
              inputMode="numeric"
              placeholder="Enter barcode number"
              value={manualCode}
              onChange={(e) => setManualCode(e.target.value)}
              autoFocus
            />
            <button type="submit" disabled={!manualCode.trim()}>
              Look up
            </button>
          </form>
        )}

        <div className="scanner-divider">or</div>
        <div className="scanner-upload">
          <button
            type="button"
            className="scanner-upload-btn"
            onClick={() => photoInputRef.current?.click()}
            disabled={typeof photoDecoding === "string"}
          >
            {photoLabel}
          </button>
          <p className="scanner-upload-hint">Pick one photo to scan it now, or several to add them all at once.</p>
          {photoError && <p className="scanner-upload-hint is-error">{photoError}</p>}
          <input
            ref={photoInputRef}
            type="file"
            accept="image/*"
            multiple
            onChange={handlePhotoPick}
            hidden
          />
        </div>
      </div>
    </div>
  );
}
