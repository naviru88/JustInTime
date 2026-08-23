import { useEffect, useRef, useState } from "react";
import { BrowserMultiFormatReader } from "@zxing/browser";
import { NotFoundException } from "@zxing/library";

// Camera-based barcode scanner. Live scanning uses the native BarcodeDetector
// API where available (Chrome/Edge/Android, and Safari 16.4+); everywhere
// else it falls back to a manual numeric-entry field. Decoding from an
// uploaded photo instead uses zxing-js, which runs in plain JS against a
// canvas — that works in every modern browser regardless of BarcodeDetector
// support, so "upload a photo" is never a Chromium-only option.
export default function BarcodeScanner({ onDetect, onDetectBatch, onClose }) {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const rafRef = useRef(null);
  const detectedRef = useRef(false);
  const zxingReaderRef = useRef(null);

  const [supported] = useState(() => "BarcodeDetector" in window);
  const [cameraError, setCameraError] = useState(null);
  const [manualCode, setManualCode] = useState("");
  const photoInputRef = useRef(null);
  const [photoDecoding, setPhotoDecoding] = useState(null); // null | "Reading..." string | { error }

  useEffect(() => {
    if (!supported) return undefined;

    let cancelled = false;

    const start = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "environment" },
        });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }

        const detector = new window.BarcodeDetector({
          formats: ["ean_13", "ean_8", "upc_a", "upc_e", "code_128"],
        });

        const scanFrame = async () => {
          if (cancelled || detectedRef.current || !videoRef.current) return;
          try {
            const codes = await detector.detect(videoRef.current);
            if (codes.length > 0 && !detectedRef.current) {
              detectedRef.current = true;
              onDetect(codes[0].rawValue);
              return;
            }
          } catch {
            // transient decode errors are normal mid-stream; keep scanning
          }
          rafRef.current = requestAnimationFrame(scanFrame);
        };
        rafRef.current = requestAnimationFrame(scanFrame);
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
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      if (streamRef.current) streamRef.current.getTracks().forEach((t) => t.stop());
    };
  }, [supported, onDetect]);

  const getZxingReader = () => {
    if (!zxingReaderRef.current) zxingReaderRef.current = new BrowserMultiFormatReader();
    return zxingReaderRef.current;
  };

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
          onDetect(codes[0]);
        } else {
          setPhotoDecoding({ error: "Couldn't find a barcode in that photo. Try a clearer, closer shot." });
        }
      } else if (codes.length === 0) {
        setPhotoDecoding({ error: "Couldn't find a barcode in any of those photos." });
      } else {
        detectedRef.current = true;
        onDetectBatch({ codes, unreadable });
      }
    } finally {
      setPhotoDecoding((prev) => (prev && prev.error ? prev : null));
    }
  };

  const photoError = photoDecoding && typeof photoDecoding === "object" ? photoDecoding.error : null;
  const photoLabel = typeof photoDecoding === "string" ? photoDecoding : "🖼️ Upload photo(s) of a barcode";
  const showManualFallback = !supported || cameraError;

  return (
    <div className="scanner-overlay" onClick={onClose}>
      <div className="scanner-modal" onClick={(e) => e.stopPropagation()}>
        <div className="scanner-header">
          <span>Scan a barcode</span>
          <button type="button" className="scanner-close" onClick={onClose} aria-label="Close">
            &times;
          </button>
        </div>

        {!showManualFallback && (
          <div className="scanner-video-wrap">
            <video ref={videoRef} className="scanner-video" muted playsInline />
            <div className="scanner-frame" />
          </div>
        )}

        {showManualFallback && (
          <form className="scanner-manual" onSubmit={handleManualSubmit}>
            <p className="scanner-manual-hint">{cameraError || "Barcode scanning isn't supported in this browser."}</p>
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
