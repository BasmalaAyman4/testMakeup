"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Camera } from "lucide-react";

export const VirtualEyeshadowTryOn = ({
  colorHex = "#8B4513",  // Default brown eyeshadow
  coverage = 0.5,
  isActive = false,
  onClose,
}) => {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [localCoverage, setLocalCoverage] = useState(coverage);
  const [faceDetected, setFaceDetected] = useState(false);
  const [splitPosition, setSplitPosition] = useState(50);
  const [isDragging, setIsDragging] = useState(false);

  const colorRef = useRef(colorHex);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const overlayCanvasRef = useRef(null);
  const containerRef = useRef(null);
  const streamRef = useRef(null);
  const faceMeshRef = useRef(null);
  const coverageRef = useRef(coverage);
  const cameraUtilRef = useRef(null);

  // Eyeshadow landmarks from MediaPipe Face Mesh
  const EYESHADOW_LEFT = [226, 247, 30, 29, 27, 28, 56, 190, 243, 173, 157, 158, 159, 160, 161, 246, 33, 130, 226];
  const EYESHADOW_RIGHT = [463, 414, 286, 258, 257, 259, 260, 467, 446, 359, 263, 466, 388, 387, 386, 385, 384, 398, 362, 463];

  useEffect(() => {
    colorRef.current = colorHex;
  }, [colorHex]);

  useEffect(() => {
    coverageRef.current = localCoverage;
  }, [localCoverage]);

  const hexToRgb = (hex) => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16),
    } : { r: 139, g: 69, b: 19 };
  };

  const onFaceMeshResults = useCallback((results) => {
    const canvas = canvasRef.current;
    const overlayCanvas = overlayCanvasRef.current;
    const video = videoRef.current;

    if (!canvas || !overlayCanvas || !video) return;

    const ctx = canvas.getContext("2d");
    const overlayCtx = overlayCanvas.getContext("2d", { willReadFrequently: true });

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    overlayCanvas.width = video.videoWidth;
    overlayCanvas.height = video.videoHeight;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    overlayCtx.clearRect(0, 0, overlayCanvas.width, overlayCanvas.height);

    // Draw mirrored video
    ctx.save();
    ctx.scale(-1, 1);
    ctx.translate(-canvas.width, 0);
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    ctx.restore();

    if (results.multiFaceLandmarks && results.multiFaceLandmarks.length > 0) {
      setFaceDetected(true);
      const landmarks = results.multiFaceLandmarks[0];
      applyEyeshadow(overlayCtx, landmarks, canvas.width, canvas.height);
    } else {
      setFaceDetected(false);
    }
  }, []);

  const applyEyeshadow = (overlayCtx, landmarks, width, height) => {
    const getLandmark = (index) => {
      const landmark = landmarks[index];
      return {
        x: width - landmark.x * width,  // Mirror
        y: landmark.y * height,
      };
    };

    const currentColor = colorRef.current;
    const color = currentColor.startsWith("#") ? currentColor : `#${currentColor}`;
    const coverage = coverageRef.current;
    const { r, g, b } = hexToRgb(color);

    // Helper to draw smooth filled area
    const drawSmoothArea = (points, fillColor, alpha, blur = 0) => {
      if (points.length < 3) return;

      overlayCtx.save();
      
      if (blur > 0) {
        overlayCtx.filter = `blur(${blur}px)`;
      }
      
      overlayCtx.globalAlpha = alpha;
      overlayCtx.fillStyle = fillColor;

      overlayCtx.beginPath();
      const firstPoint = getLandmark(points[0]);
      overlayCtx.moveTo(firstPoint.x, firstPoint.y);

      for (let i = 1; i < points.length - 1; i++) {
        const current = getLandmark(points[i]);
        const next = getLandmark(points[i + 1]);
        const xMid = (current.x + next.x) / 2;
        const yMid = (current.y + next.y) / 2;
        overlayCtx.quadraticCurveTo(current.x, current.y, xMid, yMid);
      }

      const lastPoint = getLandmark(points[points.length - 1]);
      overlayCtx.lineTo(lastPoint.x, lastPoint.y);
      overlayCtx.closePath();
      overlayCtx.fill();
      
      overlayCtx.restore();
    };

    // ========================================
    // LAYER 1: Base eyeshadow color (multiply blend)
    // ========================================
    overlayCtx.globalCompositeOperation = "multiply";
    
    // Left eye
    drawSmoothArea(EYESHADOW_LEFT, color, coverage * 0.6, 3);
    // Right eye
    drawSmoothArea(EYESHADOW_RIGHT, color, coverage * 0.6, 3);

    // ========================================
    // LAYER 2: Darker crease color (for depth)
    // ========================================
    overlayCtx.globalCompositeOperation = "multiply";
    
    // Darken the color for crease
    const creaseColor = `rgb(${Math.max(0, r - 40)}, ${Math.max(0, g - 40)}, ${Math.max(0, b - 40)})`;
    
    // Left crease (upper part of eyeshadow area)
    const leftCrease = [247, 30, 29, 27, 28, 56, 190, 243, 173, 157, 158, 159, 160, 161, 246, 247];
    drawSmoothArea(leftCrease, creaseColor, coverage * 0.3, 5);
    
    // Right crease
    const rightCrease = [414, 286, 258, 257, 259, 260, 467, 446, 398, 384, 385, 386, 387, 388, 466, 414];
    drawSmoothArea(rightCrease, creaseColor, coverage * 0.3, 5);

    // ========================================
    // LAYER 3: Highlight (inner corner)
    // ========================================
    overlayCtx.globalCompositeOperation = "screen";
    
    // Lighter color for highlight
    const highlightColor = `rgba(255, 255, 255, ${coverage * 0.15})`;
    
    // Inner corner highlights
    const leftHighlight = getLandmark(133);
    const rightHighlight = getLandmark(362);
    
    // Left inner corner highlight
    const leftGradient = overlayCtx.createRadialGradient(
      leftHighlight.x, leftHighlight.y, 0,
      leftHighlight.x, leftHighlight.y, 25
    );
    leftGradient.addColorStop(0, `rgba(255, 255, 255, ${coverage * 0.3})`);
    leftGradient.addColorStop(0.5, `rgba(255, 255, 255, ${coverage * 0.1})`);
    leftGradient.addColorStop(1, "rgba(255, 255, 255, 0)");
    
    overlayCtx.fillStyle = leftGradient;
    overlayCtx.beginPath();
    overlayCtx.arc(leftHighlight.x, leftHighlight.y, 25, 0, Math.PI * 2);
    overlayCtx.fill();
    
    // Right inner corner highlight
    const rightGradient = overlayCtx.createRadialGradient(
      rightHighlight.x, rightHighlight.y, 0,
      rightHighlight.x, rightHighlight.y, 25
    );
    rightGradient.addColorStop(0, `rgba(255, 255, 255, ${coverage * 0.3})`);
    rightGradient.addColorStop(0.5, `rgba(255, 255, 255, ${coverage * 0.1})`);
    rightGradient.addColorStop(1, "rgba(255, 255, 255, 0)");
    
    overlayCtx.fillStyle = rightGradient;
    overlayCtx.beginPath();
    overlayCtx.arc(rightHighlight.x, rightHighlight.y, 25, 0, Math.PI * 2);
    overlayCtx.fill();

    // ========================================
    // LAYER 4: Shimmer/sparkle effect (optional)
    // ========================================
    overlayCtx.globalCompositeOperation = "overlay";
    
    // Left shimmer
    drawSmoothArea(EYESHADOW_LEFT, color, coverage * 0.2, 8);
    // Right shimmer
    drawSmoothArea(EYESHADOW_RIGHT, color, coverage * 0.2, 8);

    // Reset
    overlayCtx.globalCompositeOperation = "source-over";
    overlayCtx.globalAlpha = 1;
    overlayCtx.filter = "none";
  };

  const initializeFaceMesh = useCallback(async () => {
    try {
      const { FaceMesh } = await import("@mediapipe/face_mesh");
      const { Camera: CameraUtil } = await import("@mediapipe/camera_utils");

      const faceMesh = new FaceMesh({
        locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`,
      });

      faceMesh.setOptions({
        maxNumFaces: 1,
        refineLandmarks: true,
        minDetectionConfidence: 0.5,
        minTrackingConfidence: 0.5,
      });

      faceMesh.onResults(onFaceMeshResults);
      faceMeshRef.current = faceMesh;

      if (videoRef.current) {
        const camera = new CameraUtil(videoRef.current, {
          onFrame: async () => {
            if (faceMeshRef.current && videoRef.current) {
              await faceMeshRef.current.send({ image: videoRef.current });
            }
          },
          width: 1280,
          height: 720,
        });

        cameraUtilRef.current = camera;
        await camera.start();
        setIsLoading(false);
        setIsCameraActive(true);
      }
    } catch (err) {
      console.error("Face Mesh error:", err);
      setError("Failed to load face detection. Please refresh.");
      setIsLoading(false);
    }
  }, [onFaceMeshResults]);

  const startCamera = useCallback(async () => {
    try {
      setError(null);
      setIsLoading(true);

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: "user" },
        audio: false,
      });

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        streamRef.current = stream;
        await new Promise((resolve, reject) => {
          videoRef.current.onloadedmetadata = () => {
            videoRef.current.play().then(resolve).catch(reject);
          };
        });
        await initializeFaceMesh();
      }
    } catch (err) {
      console.error("Camera error:", err);
      setError("Could not access camera. Please check permissions.");
      setIsLoading(false);
    }
  }, [initializeFaceMesh]);

  const stopCamera = useCallback(() => {
    if (cameraUtilRef.current) {
      cameraUtilRef.current.stop();
      cameraUtilRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (faceMeshRef.current) {
      faceMeshRef.current.close();
      faceMeshRef.current = null;
    }
    setIsCameraActive(false);
    setFaceDetected(false);
  }, []);

  useEffect(() => {
    if (isActive) startCamera();
    return () => stopCamera();
  }, [isActive, startCamera, stopCamera]);

  const handleClose = () => {
    stopCamera();
    onClose?.();
  };

  const handleMouseDown = useCallback(() => setIsDragging(true), []);
  const handleMouseUp = useCallback(() => setIsDragging(false), []);

  const handleMouseMove = useCallback((e) => {
    if (!isDragging || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    setSplitPosition(Math.max(0, Math.min(100, (x / rect.width) * 100)));
  }, [isDragging]);

  const handleTouchMove = useCallback((e) => {
    if (!containerRef.current) return;
    const touch = e.touches[0];
    const rect = containerRef.current.getBoundingClientRect();
    const x = touch.clientX - rect.left;
    setSplitPosition(Math.max(0, Math.min(100, (x / rect.width) * 100)));
  }, []);

  useEffect(() => {
    if (isDragging) {
      window.addEventListener("mouseup", handleMouseUp);
      window.addEventListener("touchend", handleMouseUp);
      return () => {
        window.removeEventListener("mouseup", handleMouseUp);
        window.removeEventListener("touchend", handleMouseUp);
      };
    }
  }, [isDragging, handleMouseUp]);

  if (!isActive) return null;

  return (
    <div style={{
      position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: "rgba(0, 0, 0, 0.9)", zIndex: 9999,
      display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
    }}>
      {/* Header */}
      <div style={{
        position: "absolute", top: 0, left: 0, right: 0, padding: "20px",
        display: "flex", justifyContent: "space-between", alignItems: "center",
        background: "linear-gradient(180deg, rgba(0,0,0,0.7) 0%, transparent 100%)", zIndex: 10,
      }}>
        <h2 style={{ color: "white", fontSize: "20px", fontWeight: "600", margin: 0 }}>
          ✨ Eyeshadow Try-On
        </h2>
        <button onClick={handleClose} style={{
          background: "rgba(255, 255, 255, 0.2)", border: "none", color: "white",
          fontSize: "24px", width: "40px", height: "40px", borderRadius: "50%", cursor: "pointer",
        }}>×</button>
      </div>

      {/* Video Container */}
      <div ref={containerRef} onMouseMove={handleMouseMove} onTouchMove={handleTouchMove}
        onTouchStart={() => setIsDragging(true)} onTouchEnd={() => setIsDragging(false)}
        style={{
          position: "relative", width: "100%", maxWidth: "800px", aspectRatio: "4/3",
          backgroundColor: "#000", borderRadius: "12px", overflow: "hidden",
          boxShadow: "0 10px 40px rgba(0, 0, 0, 0.5)", touchAction: "none",
        }}>
        <video ref={videoRef} style={{ position: "absolute", opacity: 0 }} playsInline muted autoPlay />
        <canvas ref={canvasRef} style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", objectFit: "cover" }} />
        <canvas ref={overlayCanvasRef} style={{
          position: "absolute", top: 0, left: 0, width: "100%", height: "100%", objectFit: "cover",
          clipPath: `inset(0 ${100 - splitPosition}% 0 0)`,
        }} />

        {/* Split Line */}
        <div style={{
          position: "absolute", left: `${splitPosition}%`, top: 0, bottom: 0, width: "4px",
          backgroundColor: "white", cursor: "ew-resize", transform: "translateX(-50%)",
          boxShadow: "0 0 10px rgba(0,0,0,0.5)", zIndex: 10,
        }} onMouseDown={handleMouseDown} onTouchStart={handleMouseDown}>
          <div style={{
            position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)",
            width: "48px", height: "48px", backgroundColor: "white", borderRadius: "50%",
            display: "flex", alignItems: "center", justifyContent: "center",
            boxShadow: "0 4px 12px rgba(0,0,0,0.3)", cursor: "grab",
          }}>
            <div style={{ display: "flex", gap: "4px" }}>
              <div style={{ width: "2px", height: "20px", backgroundColor: "#666" }} />
              <div style={{ width: "2px", height: "20px", backgroundColor: "#666" }} />
            </div>
          </div>
        </div>

        {/* Labels */}
        <div style={{
          position: "absolute", top: "20px", left: "20px", backgroundColor: "rgba(0, 0, 0, 0.6)",
          color: "white", padding: "8px 16px", borderRadius: "20px", fontSize: "14px", fontWeight: "600",
          opacity: splitPosition > 20 ? 1 : 0,
        }}>WITH EYESHADOW ✨</div>
        <div style={{
          position: "absolute", top: "20px", right: "20px", backgroundColor: "rgba(0, 0, 0, 0.6)",
          color: "white", padding: "8px 16px", borderRadius: "20px", fontSize: "14px", fontWeight: "600",
          opacity: splitPosition < 80 ? 1 : 0,
        }}>WITHOUT</div>

        {isLoading && (
          <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)", textAlign: "center", color: "white" }}>
            <Camera size={48} style={{ marginBottom: "16px", opacity: 0.5 }} />
            <p style={{ fontSize: "18px", margin: 0 }}>Initializing camera...</p>
          </div>
        )}

        {isCameraActive && !isLoading && !faceDetected && (
          <div style={{
            position: "absolute", top: "20px", left: "50%", transform: "translateX(-50%)",
            background: "rgba(0, 0, 0, 0.7)", color: "white", padding: "12px 20px",
            borderRadius: "20px", fontSize: "14px", zIndex: 5,
          }}>💡 Face the camera directly</div>
        )}
      </div>

      {/* Coverage Control */}
      {isCameraActive && !isLoading && (
        <div style={{
          position: "absolute", bottom: "120px", left: "50%", transform: "translateX(-50%)",
          display: "flex", alignItems: "center", gap: "16px", background: "rgba(255, 255, 255, 0.95)",
          padding: "16px 24px", borderRadius: "24px", boxShadow: "0 4px 12px rgba(0, 0, 0, 0.2)",
          width: "90%", maxWidth: "300px",
        }}>
          <span style={{ fontSize: "14px", fontWeight: "600", color: "#333", minWidth: "70px" }}>Intensity</span>
          <input type="range" min="20" max="90" value={localCoverage * 100}
            onChange={(e) => setLocalCoverage(e.target.value / 100)} style={{ flex: 1 }} />
          <span style={{ fontSize: "14px", fontWeight: "600", color: "#666", minWidth: "35px" }}>
            {Math.round(localCoverage * 100)}%
          </span>
        </div>
      )}

      {/* Color Display */}
      <div style={{
        position: "absolute", bottom: "40px", display: "flex", alignItems: "center", gap: "12px",
        background: "rgba(255, 255, 255, 0.95)", padding: "12px 24px", borderRadius: "24px",
        boxShadow: "0 4px 12px rgba(0, 0, 0, 0.2)",
      }}>
        <div style={{
          width: "32px", height: "32px", borderRadius: "50%", backgroundColor: colorRef.current,
          border: "3px solid white", boxShadow: "0 2px 8px rgba(0, 0, 0, 0.2)",
        }} />
        <span style={{ fontSize: "14px", fontWeight: "600", color: "#333" }}>
          Eyeshadow: {colorRef.current.toUpperCase()}
        </span>
      </div>
    </div>
  );
};