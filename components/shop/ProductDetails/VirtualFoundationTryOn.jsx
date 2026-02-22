"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Camera } from "lucide-react";

// ─────────────────────────────────────────────────────────────────────────────
// MediaPipe landmark indices
// ─────────────────────────────────────────────────────────────────────────────
const FACE_OVAL = [
  10, 338, 297, 332, 284, 251, 389, 356, 454, 323, 361, 288, 397, 365, 379, 378,
  400, 377, 152, 148, 176, 149, 150, 136, 172, 58, 132, 93, 234, 127, 162, 21,
  54, 103, 67, 109,
];
const LEFT_EYE = [
  362, 382, 381, 380, 374, 373, 390, 249, 263, 466, 388, 387, 386, 385, 384,
  398,
];
const RIGHT_EYE = [
  33, 7, 163, 144, 145, 153, 154, 155, 133, 173, 157, 158, 159, 160, 161, 246,
];
const LEFT_EYEBROW = [336, 296, 334, 293, 300, 276, 283, 282, 295, 285];
const RIGHT_EYEBROW = [70, 63, 105, 66, 107, 55, 65, 52, 53, 46];
const LIPS_OUTER = [
  61, 185, 40, 39, 37, 0, 267, 269, 270, 409, 291, 375, 321, 405, 314, 17, 84,
  181, 91, 146,
];
const LIPS_INNER = [
  78, 191, 80, 81, 82, 13, 312, 311, 310, 415, 308, 324, 318, 402, 317, 14, 87,
  178, 88, 95,
];
const NOSTRIL_POINTS = [2, 326, 97, 98, 327, 294, 460, 439, 457, 279, 275];
const NOSE_POINTS = [1, 2, 4, 5, 168, 6, 197, 195, 51, 281, 45, 275];
const FOREHEAD_PTS = [
  10, 67, 109, 103, 54, 21, 162, 127, 234, 93, 132, 58, 172,
];
const L_CHEEK_PTS = [234, 93, 132, 58, 172, 136, 149, 176, 148, 152];
const R_CHEEK_PTS = [454, 323, 361, 288, 397, 365, 379, 378, 400, 377, 152];
const CHIN_PTS = [152, 148, 176, 149, 150, 136, 172, 58, 132, 93, 234];

// ─────────────────────────────────────────────────────────────────────────────
// Foundation shade palette
// ─────────────────────────────────────────────────────────────────────────────
const FOUNDATION_SHADES = [
  { name: "Porcelain Cool", hex: "#F8EDEB", r: 248, g: 237, b: 235 },
  { name: "Light Neutral", hex: "#EED1C7", r: 238, g: 209, b: 199 },
  { name: "Medium Warm", hex: "#B26F5A", r: 178, g: 111, b: 90 },
  { name: "Tan Neutral", hex: "#9C5946", r: 156, g: 89, b: 70 },
  { name: "Deep Cool", hex: "#7C4236", r: 124, g: 66, b: 54 },
  { name: "Very Deep Warm", hex: "#3A1814", r: 58, g: 24, b: 20 },
];

// ─────────────────────────────────────────────────────────────────────────────
// Foundation overlay drawing
// ─────────────────────────────────────────────────────────────────────────────
function drawFoundationOverlay(ctx, landmarks, W, H, coverage, shade) {
  // Alpha range: 0.18 (sheer) → 0.42 (full) — low enough that skin texture
  // always shows through, so it never looks like a flat painted mask.
  const alpha = 0.18 + coverage * 0.24;

  const pt = (idx) => ({
    x: (1 - landmarks[idx].x) * W,
    y: landmarks[idx].y * H,
  });

  // ── Build the face oval path ──────────────────────────────────────────────
  const ovalPts = FACE_OVAL.map((i) => pt(i));

  // Compute the actual bounds of the face oval so the gradient
  // is centered on the face (not the canvas), and can never bleed
  // outside the oval even if the face is off-center.
  const xs = ovalPts.map((p) => p.x);
  const ys = ovalPts.map((p) => p.y);
  const faceMinX = Math.min(...xs),
    faceMaxX = Math.max(...xs);
  const faceMinY = Math.min(...ys),
    faceMaxY = Math.max(...ys);
  const faceCX = (faceMinX + faceMaxX) / 2;
  const faceCY = (faceMinY + faceMaxY) / 2;
  // Radius covers most of the face but fades BEFORE the hairline / jawline edges
  const faceR = Math.max(faceMaxX - faceMinX, faceMaxY - faceMinY) * 0.52;

  // ── Off-screen canvas ─────────────────────────────────────────────────────
  const off = new OffscreenCanvas(W, H);
  const octx = off.getContext("2d");

  // STRICT clip to face oval — nothing can ever be drawn outside the face,
  // including blur halos, which was the "hair/head covered" bug.
  octx.beginPath();
  octx.moveTo(ovalPts[0].x, ovalPts[0].y);
  ovalPts.forEach((p) => octx.lineTo(p.x, p.y));
  octx.closePath();
  octx.clip(); // ← all subsequent draws are clipped to face oval

  // Radial gradient centered on the face, fading at the edges so
  // the hairline, jaw and ear areas naturally receive less coverage.
  const grad = octx.createRadialGradient(
    faceCX,
    faceCY,
    0,
    faceCX,
    faceCY,
    faceR,
  );
  grad.addColorStop(0, `rgba(${shade.r},${shade.g},${shade.b},${alpha})`);
  grad.addColorStop(
    0.6,
    `rgba(${shade.r},${shade.g},${shade.b},${alpha * 0.9})`,
  );
  grad.addColorStop(
    0.85,
    `rgba(${shade.r},${shade.g},${shade.b},${alpha * 0.45})`,
  );
  grad.addColorStop(1.0, `rgba(${shade.r},${shade.g},${shade.b},0)`);
  octx.fillStyle = grad;
  octx.fillRect(0, 0, W, H); // fills only inside the clip (face oval)

  // ── Cut out non-skin zones ────────────────────────────────────────────────
  octx.globalCompositeOperation = "destination-out";
  [
    { pts: LEFT_EYE, blur: 5 },
    { pts: RIGHT_EYE, blur: 5 },
    { pts: LEFT_EYEBROW, blur: 7 },
    { pts: RIGHT_EYEBROW, blur: 7 },
    { pts: LIPS_OUTER, blur: 4 },
    { pts: LIPS_INNER, blur: 4 },
    { pts: NOSTRIL_POINTS, blur: 4 },
  ].forEach(({ pts, blur }) => {
    octx.save();
    octx.filter = `blur(${blur}px)`;
    octx.beginPath();
    octx.moveTo(pt(pts[0]).x, pt(pts[0]).y);
    pts.forEach((i) => octx.lineTo(pt(i).x, pt(i).y));
    octx.closePath();
    octx.fill();
    octx.restore();
  });
  octx.globalCompositeOperation = "source-over";
  octx.filter = "none";

  // ── Composite onto main canvas ────────────────────────────────────────────
  // Single source-over pass: alpha is already baked into the gradient,
  // so the skin texture underneath always shows through (no mask effect).
  ctx.save();
  ctx.globalCompositeOperation = "source-over";
  ctx.globalAlpha = 1;
  ctx.drawImage(off, 0, 0);
  ctx.restore();
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────────────────────
export default function VirtualFoundationTryOn({ isActive = false, onClose }) {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [faceDetected, setFaceDetected] = useState(false);
  const [coverage, setCoverage] = useState(0.5);
  const [splitPos, setSplitPos] = useState(50);
  const [selectedIdx, setSelectedIdx] = useState(2); // default: Medium Warm

  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const faceMeshRef = useRef(null);
  const cameraUtilRef = useRef(null);
  const coverageRef = useRef(0.5);
  const shadeRef = useRef(FOUNDATION_SHADES[2]); // always set, no null check needed
  const splitRef = useRef(50);
  const isDraggingRef = useRef(false);
  const containerRef = useRef(null);

  // Keep refs in sync with state
  useEffect(() => {
    coverageRef.current = coverage;
  }, [coverage]);
  useEffect(() => {
    splitRef.current = splitPos;
  }, [splitPos]);
  // Instantly update shade ref so the running render loop sees the new color
  useEffect(() => {
    shadeRef.current = FOUNDATION_SHADES[selectedIdx];
  }, [selectedIdx]);

  // ── Face mesh results handler ────────────────────────────────────────────
  const onResults = useCallback((results) => {
    const canvas = canvasRef.current;
    const video = videoRef.current;
    if (!canvas || !video) return;

    const ctx = canvas.getContext("2d");
    const W = video.videoWidth || 640;
    const H = video.videoHeight || 480;

    if (canvas.width !== W || canvas.height !== H) {
      canvas.width = W;
      canvas.height = H;
    }

    ctx.clearRect(0, 0, W, H);

    // Draw mirrored video (full frame)
    ctx.save();
    ctx.scale(-1, 1);
    ctx.translate(-W, 0);
    ctx.filter = "brightness(1.05) contrast(1.03)";
    ctx.drawImage(video, 0, 0, W, H);
    ctx.restore();
    ctx.filter = "none";

    const splitX = (splitRef.current / 100) * W;

    if (results.multiFaceLandmarks?.length > 0) {
      setFaceDetected(true);
      const lm = results.multiFaceLandmarks[0];

      // Draw foundation only on RIGHT side of the divider using the selected shade
      ctx.save();
      ctx.beginPath();
      ctx.rect(splitX, 0, W - splitX, H);
      ctx.clip();
      drawFoundationOverlay(
        ctx,
        lm,
        W,
        H,
        coverageRef.current,
        shadeRef.current,
      );
      ctx.restore();
    } else {
      setFaceDetected(false);
    }

    // ── Draw the split divider ───────────────────────────────────────────
    // Vertical line
    ctx.save();
    ctx.strokeStyle = "rgba(255,255,255,0.9)";
    ctx.lineWidth = 2;
    ctx.shadowColor = "rgba(0,0,0,0.5)";
    ctx.shadowBlur = 6;
    ctx.beginPath();
    ctx.moveTo(splitX, 0);
    ctx.lineTo(splitX, H);
    ctx.stroke();

    // Drag handle circle
    const cy = H / 2;
    ctx.shadowBlur = 10;
    ctx.fillStyle = "white";
    ctx.beginPath();
    ctx.arc(splitX, cy, 18, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "rgba(255,255,255,0.6)";
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Arrows inside the handle
    ctx.shadowBlur = 0;
    ctx.strokeStyle = "#555";
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
    // Left arrow
    ctx.beginPath();
    ctx.moveTo(splitX - 10, cy);
    ctx.lineTo(splitX - 5, cy - 5);
    ctx.moveTo(splitX - 10, cy);
    ctx.lineTo(splitX - 5, cy + 5);
    ctx.stroke();
    // Right arrow
    ctx.beginPath();
    ctx.moveTo(splitX + 10, cy);
    ctx.lineTo(splitX + 5, cy - 5);
    ctx.moveTo(splitX + 10, cy);
    ctx.lineTo(splitX + 5, cy + 5);
    ctx.stroke();
    ctx.restore();

    // ── BEFORE / AFTER labels ────────────────────────────────────────────
    ctx.save();
    ctx.font = "bold 13px sans-serif";
    ctx.fillStyle = "rgba(255,255,255,0.85)";
    ctx.textBaseline = "top";
    ctx.shadowColor = "rgba(0,0,0,0.6)";
    ctx.shadowBlur = 4;
    if (splitX > 60) {
      ctx.textAlign = "left";
      ctx.fillText("BEFORE", 14, 14);
    }
    if (splitX < W - 60) {
      ctx.textAlign = "right";
      ctx.fillText("AFTER", W - 14, 14);
    }
    ctx.restore();
  }, []);

  // ── Initialize MediaPipe ─────────────────────────────────────────────────
  const initFaceMesh = useCallback(async () => {
    try {
      const { FaceMesh } = await import("@mediapipe/face_mesh");
      const { Camera: CamUtil } = await import("@mediapipe/camera_utils");

      const faceMesh = new FaceMesh({
        locateFile: (f) =>
          `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${f}`,
      });
      faceMesh.setOptions({
        maxNumFaces: 1,
        refineLandmarks: true,
        minDetectionConfidence: 0.6,
        minTrackingConfidence: 0.6,
      });
      faceMesh.onResults(onResults);
      faceMeshRef.current = faceMesh;

      const cam = new CamUtil(videoRef.current, {
        onFrame: async () => {
          if (faceMeshRef.current && videoRef.current) {
            await faceMeshRef.current.send({ image: videoRef.current });
          }
        },
        width: 1280,
        height: 720,
      });
      cameraUtilRef.current = cam;
      await cam.start();
      setIsLoading(false);
      setIsCameraActive(true);
    } catch (err) {
      console.error("FaceMesh init error:", err);
      setError("Failed to load face detection. Please refresh.");
      setIsLoading(false);
    }
  }, [onResults]);

  // ── Start camera ─────────────────────────────────────────────────────────
  const startCamera = useCallback(async () => {
    try {
      setError(null);
      setIsLoading(true);

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: "user",
          frameRate: { ideal: 30 },
        },
        audio: false,
      });

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        streamRef.current = stream;
        await new Promise((res, rej) => {
          videoRef.current.onloadedmetadata = () =>
            videoRef.current.play().then(res).catch(rej);
        });
        await initFaceMesh();
      }
    } catch (err) {
      console.error("Camera error:", err);
      setError("Could not access camera. Please check permissions.");
      setIsLoading(false);
    }
  }, [initFaceMesh]);

  // ── Stop camera ──────────────────────────────────────────────────────────
  const stopCamera = useCallback(() => {
    cameraUtilRef.current?.stop();
    cameraUtilRef.current = null;
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    if (faceMeshRef.current) {
      faceMeshRef.current.close();
      faceMeshRef.current = null;
    }
    setIsCameraActive(false);
    setFaceDetected(false);
  }, []);

  // ── Open / close lifecycle ────────────────────────────────────────────────
  useEffect(() => {
    if (isActive) startCamera();
    return () => stopCamera();
  }, [isActive, startCamera, stopCamera]);

  const handleClose = () => {
    stopCamera();
    onClose?.();
  };

  // ── Split drag (pointer events on the canvas container) ──────────────────
  const getPercent = (clientX) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return 50;
    return Math.min(
      90,
      Math.max(10, ((clientX - rect.left) / rect.width) * 100),
    );
  };

  const onPointerDown = (e) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = e.clientX - rect.left;
    const splitX = (splitRef.current / 100) * rect.width;
    if (Math.abs(x - splitX) < 30) {
      isDraggingRef.current = true;
      e.currentTarget.setPointerCapture(e.pointerId);
    }
  };
  const onPointerMove = (e) => {
    if (!isDraggingRef.current) return;
    setSplitPos(getPercent(e.clientX));
  };
  const onPointerUp = () => {
    isDraggingRef.current = false;
  };

  if (!isActive) return null;

  return (
    <div style={s.backdrop}>
      {/* ── Header ── */}
      <div style={s.header}>
        <h2 style={s.title}>Virtual Foundation Try-On</h2>
        <button
          onClick={handleClose}
          style={s.closeBtn}
          onMouseEnter={(e) =>
            (e.currentTarget.style.background = "rgba(255,255,255,0.3)")
          }
          onMouseLeave={(e) =>
            (e.currentTarget.style.background = "rgba(255,255,255,0.2)")
          }
        >
          ×
        </button>
      </div>

      {/* ── Video / Canvas area ── */}
      <div
        ref={containerRef}
        style={s.videoWrap}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
      >
        <video
          ref={videoRef}
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            objectFit: "cover",
            opacity: 0,
          }}
          playsInline
          muted
          autoPlay
        />
        <canvas ref={canvasRef} style={s.canvas} />

        {/* Loading */}
        {isLoading && (
          <div style={s.centered}>
            <Camera
              size={48}
              style={{ marginBottom: 16, opacity: 0.5, color: "white" }}
            />
            <p style={{ fontSize: 18, margin: 0, color: "white" }}>
              Initializing camera…
            </p>
          </div>
        )}

        {/* Error */}
        {error && (
          <div style={s.centered}>
            <p style={{ fontSize: 16, color: "#ff6b6b", marginBottom: 16 }}>
              {error}
            </p>
            <button onClick={startCamera} style={s.retryBtn}>
              Retry
            </button>
          </div>
        )}

        {/* Face-not-detected hint */}
        {isCameraActive && !isLoading && !faceDetected && (
          <div style={s.hint}>
            <span style={{ fontSize: 16 }}>💡</span>
            <span>Face the camera directly with good lighting</span>
          </div>
        )}
      </div>

      {/* ── Controls ── */}
      {isCameraActive && !isLoading && (
        <div style={s.controls}>
          {/* Shade palette */}
          <div style={s.paletteRow}>
            {FOUNDATION_SHADES.map((shade, i) => (
              <button
                key={shade.name}
                title={shade.name}
                onClick={() => setSelectedIdx(i)}
                style={{
                  ...s.swatchBtn,
                  background: shade.hex,
                  outline:
                    selectedIdx === i
                      ? `3px solid white`
                      : "3px solid transparent",
                  outlineOffset: 2,
                  boxShadow:
                    selectedIdx === i
                      ? `0 0 0 1px rgba(0,0,0,0.4), 0 2px 8px rgba(0,0,0,0.35)`
                      : `0 1px 4px rgba(0,0,0,0.25)`,
                }}
              />
            ))}
          </div>

          {/* Selected shade name */}
          <p style={s.shadeName}>{FOUNDATION_SHADES[selectedIdx].name}</p>

          {/* Coverage slider */}
          <div style={s.sliderGroup}>
            <span style={s.sliderLbl}>Coverage</span>
            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={coverage}
              onChange={(e) => setCoverage(parseFloat(e.target.value))}
              style={s.slider}
            />
            <span style={s.sliderVal}>{Math.round(coverage * 100)}%</span>
          </div>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// STYLES
// ─────────────────────────────────────────────────────────────────────────────
const s = {
  backdrop: {
    position: "fixed",
    inset: 0,
    backgroundColor: "rgba(0,0,0,0.92)",
    zIndex: 9999,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: 0,
  },
  header: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    padding: "16px 20px",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    background:
      "linear-gradient(180deg, rgba(0,0,0,0.75) 0%, transparent 100%)",
    zIndex: 10,
  },
  title: {
    color: "white",
    fontSize: 18,
    fontWeight: 600,
    margin: 0,
    letterSpacing: "0.03em",
  },
  closeBtn: {
    background: "rgba(255,255,255,0.2)",
    border: "none",
    color: "white",
    fontSize: 24,
    width: 40,
    height: 40,
    borderRadius: "50%",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    transition: "background 0.2s",
  },
  videoWrap: {
    position: "relative",
    width: "100%",
    maxWidth: 800,
    aspectRatio: "4/3",
    backgroundColor: "#000",
    borderRadius: 12,
    overflow: "hidden",
    boxShadow: "0 10px 40px rgba(0,0,0,0.5)",
    cursor: "col-resize",
    touchAction: "none",
  },
  canvas: {
    width: "100%",
    height: "100%",
    objectFit: "cover",
    display: "block",
  },
  centered: {
    position: "absolute",
    top: "50%",
    left: "50%",
    transform: "translate(-50%,-50%)",
    textAlign: "center",
    color: "white",
  },
  retryBtn: {
    padding: "10px 24px",
    background: "white",
    border: "none",
    borderRadius: 8,
    cursor: "pointer",
    fontSize: 14,
    fontWeight: 600,
  },
  hint: {
    position: "absolute",
    top: 16,
    left: "50%",
    transform: "translateX(-50%)",
    background: "rgba(0,0,0,0.7)",
    color: "white",
    padding: "10px 18px",
    borderRadius: 20,
    fontSize: 13,
    display: "flex",
    alignItems: "center",
    gap: 8,
    backdropFilter: "blur(10px)",
    zIndex: 5,
    whiteSpace: "nowrap",
  },
  controls: {
    position: "absolute",
    bottom: 24,
    left: "50%",
    transform: "translateX(-50%)",
    display: "flex",
    flexDirection: "column",
    gap: 10,
    background: "rgba(255,255,255,0.95)",
    padding: "14px 22px",
    borderRadius: 20,
    boxShadow: "0 4px 20px rgba(0,0,0,0.25)",
    width: "90%",
    maxWidth: 340,
  },
  sliderGroup: {
    display: "flex",
    alignItems: "center",
    gap: 10,
  },
  sliderLbl: {
    fontSize: 13,
    fontWeight: 600,
    color: "#333",
    minWidth: 72,
  },
  slider: {
    flex: 1,
    height: 6,
    borderRadius: 3,
    outline: "none",
    cursor: "pointer",
    accentColor: "#c0845a",
  },
  sliderVal: {
    fontSize: 13,
    fontWeight: 600,
    color: "#666",
    minWidth: 36,
    textAlign: "right",
  },
  paletteRow: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  swatchBtn: {
    width: 34,
    height: 34,
    borderRadius: "50%",
    border: "none",
    cursor: "pointer",
    flexShrink: 0,
    transition: "transform 0.15s",
  },
  shadeName: {
    margin: "2px 0 0",
    textAlign: "center",
    fontSize: 12,
    fontWeight: 600,
    color: "#444",
    letterSpacing: "0.03em",
  },
};
