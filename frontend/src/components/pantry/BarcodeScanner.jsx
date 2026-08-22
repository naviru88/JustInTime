import { useEffect, useRef, useState } from "react";

// Camera-based barcode scanner. Uses the native BarcodeDetector API where
// available (Chrome/Edge/Android, and Safari 16.4+); everywhere else it
// falls back to a manual numeric-entry field so scanning is never a hard
// requirement to add a pantry item.
export default function BarcodeScanner({ onDetect, onClose }) {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const rafRef = useRef(null);
  const detectedRef = useRef(false);

  const [supported] = useState(() => "BarcodeDetector" in window);
  const [cameraError, setCameraError] = useState(null);
  const [manualCode, setManualCode] = useState("");
  const photoInputRef = useRef(null);
  const [photoDecoding, setPhotoDecoding] = useState(false);
  const [photoError, setPhotoError] = useState(null);

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

  const handleManualSubmit = (e) => {
    e.preventDefault();
    if (manualCode.trim()) onDetect(manualCode.trim());
  };

  const handlePhotoPick = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = ""; // allow picking the same file again after a miss
    if (!file) return;

    setPhotoError(null);
    setPhotoDecoding(true);
    try {
      const detector = new window.BarcodeDetector({
        formats: ["ean_13", "ean_8", "upc_a", "upc_e", "code_128"],
      });
      // File is a Blob, which BarcodeDetector.detect() accepts directly —
      // no need to round-trip through a canvas or <img> element.
      const codes = await detector.detect(file);
      if (codes.length > 0) {
        detectedRef.current = true;
        onDetect(codes[0].rawValue);
      } else {
        setPhotoError("Couldn't find a barcode in that photo. Try a clearer, closer shot.");
      }
    } catch {
      setPhotoError("Couldn't read that photo. Try a different one.");
    } finally {
      setPhotoDecoding(false);
    }
  };

  const showManualFallback = !supported || cameraError;
  // Decoding from a still photo uses the same BarcodeDetector API as the
  // live scan, so it's only offered where that API actually exists.
  const showPhotoUpload = supported;

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

        {showPhotoUpload && (
          <>
            <div className="scanner-divider">or</div>
            <div className="scanner-upload">
              <button
                type="button"
                className="scanner-upload-btn"
                onClick={() => photoInputRef.current?.click()}
                disabled={photoDecoding}
              >
                {photoDecoding ? "Reading photo..." : "🖼️ Upload a photo of the barcode"}
              </button>
              {photoError && <p className="scanner-upload-hint is-error">{photoError}</p>}
              <input
                ref={photoInputRef}
                type="file"
                accept="image/*"
                onChange={handlePhotoPick}
                hidden
              />
            </div>
          </>
        )}
      </div>
    </div>
  );
}
