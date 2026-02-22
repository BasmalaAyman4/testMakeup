"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Camera } from "lucide-react";

export const VirtualNailPolishTryOn = ({
  colorHex = "#FF1744",
  finish = "glossy", // glossy, matte, metallic
  isActive = false,
  onClose,
}) => {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [localOpacity, setLocalOpacity] = useState(0.7);
  const [handsDetected, setHandsDetected] = useState(0);

  const colorRef = useRef(colorHex);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const handsRef = useRef(null);
  const opacityRef = useRef(0.7);
  const cameraUtilRef = useRef(null);
  const finishRef = useRef(finish);

  useEffect(() => {
    colorRef.current = colorHex;
  }, [colorHex]);

  useEffect(() => {
    opacityRef.current = localOpacity;
  }, [localOpacity]);

  useEffect(() => {
    finishRef.current = finish;
  }, [finish]);

  const hexToRgb = (hex) => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result
      ? {
          r: parseInt(result[1], 16),
          g: parseInt(result[2], 16),
          b: parseInt(result[3], 16),
        }
      : { r: 255, g: 23, b: 68 };
  };

  const onHandsResults = useCallback((results) => {
    const canvas = canvasRef.current;
    const video = videoRef.current;

    if (!canvas || !video) return;

    const ctx = canvas.getContext("2d");

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.filter = "brightness(1.1) contrast(1.05)";

    // رسم الفيديو بدون mirror (اليدين طبيعية)
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    ctx.filter = "none";

    if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
      setHandsDetected(results.multiHandLandmarks.length);
      
      results.multiHandLandmarks.forEach((landmarks, handIndex) => {
        const handedness = results.multiHandedness?.[handIndex]?.label || "Unknown";
        drawNailPolish(ctx, landmarks, canvas.width, canvas.height, handedness);
      });
    } else {
      setHandsDetected(0);
    }
  }, []);

  const drawNailPolish = (ctx, landmarks, width, height, handedness) => {
    const color = colorRef.current.startsWith("#") 
      ? colorRef.current 
      : `#${colorRef.current}`;
    const rgb = hexToRgb(color);
    const opacity = opacityRef.current;
    const finishType = finishRef.current;

    // MediaPipe Hands landmarks للأظافر
    // كل إصبع عنده 4 نقاط، الأظفر موجود عند tip (النقطة 4، 8، 12، 16، 20)
    const fingerTips = [
      { name: "Thumb", tip: 4, base: 3 },
      { name: "Index", tip: 8, base: 7 },
      { name: "Middle", tip: 12, base: 11 },
      { name: "Ring", tip: 16, base: 15 },
      { name: "Pinky", tip: 20, base: 19 },
    ];

    fingerTips.forEach((finger) => {
      const tip = landmarks[finger.tip];
      const base = landmarks[finger.base];
      
      if (!tip || !base) return;

      const tipX = tip.x * width;
      const tipY = tip.y * height;
      const baseX = base.x * width;
      const baseY = base.y * height;

      // حساب حجم الأظفر بناءً على المسافة
      const distance = Math.sqrt(
        Math.pow(tipX - baseX, 2) + Math.pow(tipY - baseY, 2)
      );
      const nailSize = distance * 0.6; // حجم الأظفر

      // حساب الزاوية للدوران
      const angle = Math.atan2(tipY - baseY, tipX - baseX);

      ctx.save();
      ctx.translate(tipX, tipY);
      ctx.rotate(angle);

      // Base color with multiply for natural look
      ctx.globalCompositeOperation = "multiply";
      ctx.globalAlpha = opacity * 0.8;

      // رسم شكل الأظفر (بيضاوي)
      ctx.beginPath();
      ctx.ellipse(0, 0, nailSize * 0.45, nailSize * 0.65, 0, 0, Math.PI * 2);
      ctx.fillStyle = color;
      ctx.fill();

      // إضافة depth للأظفر
      ctx.globalCompositeOperation = "source-over";
      ctx.globalAlpha = opacity * 0.3;
      
      const gradient = ctx.createRadialGradient(
        -nailSize * 0.15,
        -nailSize * 0.2,
        0,
        0,
        0,
        nailSize * 0.6
      );
      gradient.addColorStop(0, `rgba(${rgb.r + 30}, ${rgb.g + 30}, ${rgb.b + 30}, 0.8)`);
      gradient.addColorStop(0.5, `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.5)`);
      gradient.addColorStop(1, `rgba(${rgb.r - 20}, ${rgb.g - 20}, ${rgb.b - 20}, 0.3)`);
      
      ctx.beginPath();
      ctx.ellipse(0, 0, nailSize * 0.45, nailSize * 0.65, 0, 0, Math.PI * 2);
      ctx.fillStyle = gradient;
      ctx.fill();

      // Finish effects
      if (finishType === "glossy") {
        // Glossy shine
        ctx.globalCompositeOperation = "screen";
        ctx.globalAlpha = opacity * 0.6;

        const shineGradient = ctx.createRadialGradient(
          -nailSize * 0.2,
          -nailSize * 0.3,
          0,
          -nailSize * 0.1,
          -nailSize * 0.2,
          nailSize * 0.4
        );
        shineGradient.addColorStop(0, "rgba(255, 255, 255, 0.9)");
        shineGradient.addColorStop(0.5, "rgba(255, 255, 255, 0.4)");
        shineGradient.addColorStop(1, "rgba(255, 255, 255, 0)");

        ctx.beginPath();
        ctx.ellipse(-nailSize * 0.1, -nailSize * 0.25, nailSize * 0.25, nailSize * 0.35, 0, 0, Math.PI * 2);
        ctx.fillStyle = shineGradient;
        ctx.fill();
      } else if (finishType === "metallic") {
        // Metallic shimmer
        ctx.globalCompositeOperation = "overlay";
        ctx.globalAlpha = opacity * 0.5;

        const metallicGradient = ctx.createLinearGradient(
          -nailSize * 0.4,
          -nailSize * 0.6,
          nailSize * 0.4,
          nailSize * 0.6
        );
        metallicGradient.addColorStop(0, "rgba(255, 255, 255, 0)");
        metallicGradient.addColorStop(0.3, "rgba(255, 255, 255, 0.6)");
        metallicGradient.addColorStop(0.5, "rgba(255, 255, 255, 0.8)");
        metallicGradient.addColorStop(0.7, "rgba(255, 255, 255, 0.6)");
        metallicGradient.addColorStop(1, "rgba(255, 255, 255, 0)");

        ctx.beginPath();
        ctx.ellipse(0, 0, nailSize * 0.45, nailSize * 0.65, 0, 0, Math.PI * 2);
        ctx.fillStyle = metallicGradient;
        ctx.fill();
      }
      // matte doesn't need extra effects

      ctx.restore();
    });

    ctx.globalCompositeOperation = "source-over";
    ctx.globalAlpha = 1;
  };

  const initializeHands = useCallback(async () => {
    try {
      const { Hands } = await import("@mediapipe/hands");
      const { Camera: CameraUtil } = await import("@mediapipe/camera_utils");

      const hands = new Hands({
        locateFile: (file) => {
          return `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`;
        },
      });

      hands.setOptions({
        maxNumHands: 2,
        modelComplexity: 1,
        minDetectionConfidence: 0.6,
        minTrackingConfidence: 0.6,
      });

      hands.onResults(onHandsResults);
      handsRef.current = hands;

      if (videoRef.current) {
        const camera = new CameraUtil(videoRef.current, {
          onFrame: async () => {
            if (handsRef.current && videoRef.current) {
              await handsRef.current.send({ image: videoRef.current });
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
      console.error("Hands initialization error:", err);
      setError("Failed to load hand detection. Please refresh.");
      setIsLoading(false);
    }
  }, [onHandsResults]);

  const startCamera = useCallback(async () => {
    try {
      setError(null);
      setIsLoading(true);

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: "user",
        },
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

        await initializeHands();
      }
    } catch (err) {
      console.error("Camera error:", err);
      setError("Could not access camera. Please check permissions.");
      setIsLoading(false);
    }
  }, [initializeHands]);

  const stopCamera = useCallback(() => {
    if (cameraUtilRef.current) {
      cameraUtilRef.current.stop();
      cameraUtilRef.current = null;
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    if (handsRef.current) {
      handsRef.current.close();
      handsRef.current = null;
    }

    setIsCameraActive(false);
    setHandsDetected(0);
  }, []);

  useEffect(() => {
    if (isActive) {
      startCamera();
    }

    return () => {
      stopCamera();
    };
  }, [isActive, startCamera, stopCamera]);

  const handleClose = () => {
    stopCamera();
    onClose?.();
  };

  if (!isActive) return null;

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: "rgba(0, 0, 0, 0.9)",
        zIndex: 9999,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {/* Header */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          padding: "20px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          background: "linear-gradient(180deg, rgba(0,0,0,0.7) 0%, transparent 100%)",
          zIndex: 10,
        }}
      >
        <h2
          style={{
            color: "white",
            fontSize: "20px",
            fontWeight: "600",
            margin: 0,
          }}
        >
          💅 Nail Polish Try-On
        </h2>
        <button
          onClick={handleClose}
          style={{
            background: "rgba(255, 255, 255, 0.2)",
            border: "none",
            color: "white",
            fontSize: "24px",
            width: "40px",
            height: "40px",
            borderRadius: "50%",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          ×
        </button>
      </div>

      {/* Video Container */}
      <div
        style={{
          position: "relative",
          width: "100%",
          maxWidth: "800px",
          aspectRatio: "4/3",
          backgroundColor: "#000",
          borderRadius: "12px",
          overflow: "hidden",
          boxShadow: "0 10px 40px rgba(0, 0, 0, 0.5)",
        }}
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

        <canvas
          ref={canvasRef}
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
          }}
        />

        {/* Loading State */}
        {isLoading && (
          <div
            style={{
              position: "absolute",
              top: "50%",
              left: "50%",
              transform: "translate(-50%, -50%)",
              textAlign: "center",
              color: "white",
            }}
          >
            <Camera size={48} style={{ marginBottom: "16px", opacity: 0.5 }} />
            <p style={{ fontSize: "18px", margin: 0 }}>Initializing camera...</p>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div
            style={{
              position: "absolute",
              top: "50%",
              left: "50%",
              transform: "translate(-50%, -50%)",
              textAlign: "center",
              color: "white",
              padding: "20px",
            }}
          >
            <p style={{ fontSize: "16px", color: "#ff6b6b" }}>{error}</p>
            <button
              onClick={startCamera}
              style={{
                marginTop: "16px",
                padding: "12px 24px",
                background: "white",
                border: "none",
                borderRadius: "8px",
                cursor: "pointer",
                fontSize: "14px",
                fontWeight: "600",
              }}
            >
              Retry
            </button>
          </div>
        )}

        {/* Hand Detection Status */}
        {isCameraActive && !isLoading && (
          <div
            style={{
              position: "absolute",
              top: "20px",
              left: "50%",
              transform: "translateX(-50%)",
              background: handsDetected > 0 
                ? "rgba(76, 175, 80, 0.9)" 
                : "rgba(0, 0, 0, 0.7)",
              color: "white",
              padding: "12px 20px",
              borderRadius: "20px",
              fontSize: "14px",
              display: "flex",
              alignItems: "center",
              gap: "8px",
              backdropFilter: "blur(10px)",
              zIndex: 5,
              transition: "all 0.3s",
            }}
          >
            <span style={{ fontSize: "16px" }}>
              {handsDetected > 0 ? "✅" : "💡"}
            </span>
            <span>
              {handsDetected > 0 
                ? `${handsDetected} Hand${handsDetected > 1 ? "s" : ""} Detected` 
                : "Show your hands to the camera"}
            </span>
          </div>
        )}
      </div>

      {/* Intensity Control */}
      {isCameraActive && !isLoading && (
        <div
          style={{
            position: "absolute",
            bottom: "120px",
            left: "50%",
            transform: "translateX(-50%)",
            display: "flex",
            alignItems: "center",
            gap: "16px",
            background: "rgba(255, 255, 255, 0.95)",
            padding: "16px 24px",
            borderRadius: "24px",
            boxShadow: "0 4px 12px rgba(0, 0, 0, 0.2)",
            width: "90%",
            maxWidth: "300px",
          }}
        >
          <span
            style={{
              fontSize: "14px",
              fontWeight: "600",
              color: "#333",
              minWidth: "60px",
            }}
          >
            Intensity
          </span>
          <input
            type="range"
            min="40"
            max="90"
            value={localOpacity * 100}
            onChange={(e) => setLocalOpacity(e.target.value / 100)}
            style={{
              flex: 1,
              height: "6px",
              borderRadius: "3px",
              outline: "none",
              cursor: "pointer",
            }}
          />
          <span
            style={{
              fontSize: "14px",
              fontWeight: "600",
              color: "#666",
              minWidth: "35px",
            }}
          >
            {Math.round(localOpacity * 100)}%
          </span>
        </div>
      )}

      {/* Color Display */}
      <div
        style={{
          position: "absolute",
          bottom: "40px",
          display: "flex",
          alignItems: "center",
          gap: "12px",
          background: "rgba(255, 255, 255, 0.95)",
          padding: "12px 24px",
          borderRadius: "24px",
          boxShadow: "0 4px 12px rgba(0, 0, 0, 0.2)",
        }}
      >
        <div
          style={{
            width: "32px",
            height: "32px",
            borderRadius: "50%",
            backgroundColor: colorRef.current,
            border: "3px solid white",
            boxShadow: "0 2px 8px rgba(0, 0, 0, 0.2)",
          }}
        />
        <span style={{ fontSize: "14px", fontWeight: "600", color: "#333" }}>
          {colorRef.current.toUpperCase()} • {finishRef.current}
        </span>
      </div>
    </div>
  );
};