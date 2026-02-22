"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Camera } from "lucide-react";

export const VirtualConcealerTryOn = ({
  colorHex = "#FFE4C4",
  coverage = 0.6,
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

  useEffect(() => {
    colorRef.current = colorHex;
  }, [colorHex]);

  useEffect(() => {
    coverageRef.current = localCoverage;
  }, [localCoverage]);

  const hexToRgb = (hex) => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result
      ? {
          r: parseInt(result[1], 16),
          g: parseInt(result[2], 16),
          b: parseInt(result[3], 16),
        }
      : { r: 255, g: 228, b: 196 };
  };

  const brightenColor = (r, g, b, amount) => {
    return {
      r: Math.min(255, Math.floor(r + (255 - r) * amount)),
      g: Math.min(255, Math.floor(g + (255 - g) * amount)),
      b: Math.min(255, Math.floor(b + (255 - b) * amount)),
    };
  };

  const onFaceMeshResults = useCallback((results) => {
    const canvas = canvasRef.current;
    const overlayCanvas = overlayCanvasRef.current;
    const video = videoRef.current;

    if (!canvas || !overlayCanvas || !video) return;

    const ctx = canvas.getContext("2d");
    const overlayCtx = overlayCanvas.getContext("2d", {
      willReadFrequently: true,
    });

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    overlayCanvas.width = video.videoWidth;
    overlayCanvas.height = video.videoHeight;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    overlayCtx.clearRect(0, 0, overlayCanvas.width, overlayCanvas.height);

    ctx.save();
    ctx.scale(-1, 1);
    ctx.translate(-canvas.width, 0);
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    ctx.restore();

    if (results.multiFaceLandmarks && results.multiFaceLandmarks.length > 0) {
      setFaceDetected(true);
      const landmarks = results.multiFaceLandmarks[0];
      applyConcealer(overlayCtx, ctx, landmarks, canvas.width, canvas.height);
    } else {
      setFaceDetected(false);
    }
  }, []);

/*   const applyConcealer = (overlayCtx, sourceCtx, landmarks, width, height) => {
    const getLandmark = (index) => {
      const landmark = landmarks[index];
      return {
        x: width - landmark.x * width,
        y: landmark.y * height,
      };
    };
  
    const currentColor = colorRef.current;
    const color = currentColor.startsWith("#") ? currentColor : `#${currentColor}`;
    const coverage = coverageRef.current;
  
    // نفس أسلوب الروج: استخدام multiply للمزج الطبيعي
    overlayCtx.globalCompositeOperation = "lighten"; 
    overlayCtx.fillStyle = color;
    overlayCtx.globalAlpha = coverage * 0.4; // شفافية أقل للطبيعية
    overlayCtx.filter = "blur(8px)"; // blur أكثر من الروج
  
    // Helper لرسم منحنيات ناعمة (نفس الروج)
    const drawSmoothArea = (points) => {
      if (points.length < 3) return;
  
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
    };
  
    // Left under-eye area - المنطقة الكاملة تحت العين اليسرى
    const leftUnderEye = [
      // من الزاوية الداخلية للعين
      133, 155, 154, 153, 145, 144, 163, 7,
      // النزول للخد
      33, 246, 161, 160, 159, 158, 157, 173,
      // العودة للبداية
      133
    ];
  
    drawSmoothArea(leftUnderEye);
  
    // Right under-eye area - المنطقة الكاملة تحت العين اليمنى  
    const rightUnderEye = [
      // من الزاوية الداخلية للعين
      362, 384, 385, 386, 387, 388, 466,
      // النزول للخد
      263, 249, 390, 373, 374, 380, 381, 382, 398,
      // العودة للبداية
      362
    ];
  
    drawSmoothArea(rightUnderEye);
  
    overlayCtx.filter = "none";
  
    // إضافة brightness/highlight ناعم (مثل لمعة الروج)
    overlayCtx.globalCompositeOperation = "screen";
    overlayCtx.globalAlpha = coverage * 0.15;
  
    // Left eye highlight - إضاءة تحت العين اليسرى
    const leftCenter = getLandmark(145);
    const leftGradient = overlayCtx.createRadialGradient(
      leftCenter.x,
      leftCenter.y + 8,
      5,
      leftCenter.x,
      leftCenter.y + 8,
      40
    );
    leftGradient.addColorStop(0, "rgba(255, 255, 255, 0.8)");
    leftGradient.addColorStop(0.4, "rgba(255, 255, 255, 0.3)");
    leftGradient.addColorStop(1, "rgba(255, 255, 255, 0)");
  
    overlayCtx.fillStyle = leftGradient;
    overlayCtx.beginPath();
    overlayCtx.arc(leftCenter.x, leftCenter.y + 8, 40, 0, Math.PI * 2);
    overlayCtx.fill();
  
    // Right eye highlight - إضاءة تحت العين اليمنى
    const rightCenter = getLandmark(374);
    const rightGradient = overlayCtx.createRadialGradient(
      rightCenter.x,
      rightCenter.y + 8,
      5,
      rightCenter.x,
      rightCenter.y + 8,
      40
    );
    rightGradient.addColorStop(0, "rgba(255, 255, 255, 0.8)");
    rightGradient.addColorStop(0.4, "rgba(255, 255, 255, 0.3)");
    rightGradient.addColorStop(1, "rgba(255, 255, 255, 0)");
  
    overlayCtx.fillStyle = rightGradient;
    overlayCtx.beginPath();
    overlayCtx.arc(rightCenter.x, rightCenter.y + 8, 40, 0, Math.PI * 2);
    overlayCtx.fill();
  
    // إضافة طبقة ثانية للتفتيح (لإخفاء الهالات)
    overlayCtx.globalCompositeOperation = "overlay";
    overlayCtx.globalAlpha = coverage * 0.12;
    overlayCtx.fillStyle = color;
    overlayCtx.filter = "blur(12px)";
  
    drawSmoothArea(leftUnderEye);
    drawSmoothArea(rightUnderEye);
  
    // Reset
    overlayCtx.globalCompositeOperation = "source-over";
    overlayCtx.globalAlpha = 1;
    overlayCtx.filter = "none";
  }; */
  
/*   const applyConcealer = (overlayCtx, sourceCtx, landmarks, width, height) => {
    const getLandmark = (index) => {
      const landmark = landmarks[index];
      return {
        x: width - landmark.x * width,
        y: landmark.y * height,
      };
    };
  
    const currentColor = colorRef.current;
    const color = currentColor.startsWith("#") ? currentColor : `#${currentColor}`;
    const coverage = coverageRef.current;
  
    overlayCtx.globalCompositeOperation = "lighten"; 
    overlayCtx.fillStyle = color;
    overlayCtx.globalAlpha = coverage * 0.4;
    overlayCtx.filter = "blur(8px)";
  
    const drawSmoothArea = (points) => {
      if (points.length < 3) return;
  
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
    };
  
    // ✅ LEFT UNDER-EYE - المنطقة تحت العين اليسرى (من الجفن السفلي للخد)
    const leftUnderEye = [
      // البداية من الجفن السفلي (lower eyelid)
      133, 173, 157, 158, 159, 160, 161, 246,
      // النزول للخد (cheek area - المنطقة اللي فيها الهالات)
      33, 130, 226, 113, 225, 224, 223, 222, 221, 
      // العودة لنقطة البداية
      189, 244, 233, 232, 231, 230, 229, 228, 31, 226, 130, 133
    ];
  
    drawSmoothArea(leftUnderEye);
  
    // ✅ RIGHT UNDER-EYE - المنطقة تحت العين اليمنى (من الجفن السفلي للخد)
    const rightUnderEye = [
      // البداية من الجفن السفلي (lower eyelid)
      362, 398, 384, 385, 386, 387, 388, 466,
      // النزول للخد (cheek area - المنطقة اللي فيها الهالات)
      263, 359, 446, 342, 445, 444, 443, 442, 441,
      // العودة لنقطة البداية
      413, 464, 453, 452, 451, 450, 449, 448, 261, 446, 359, 362
    ];
  
    drawSmoothArea(rightUnderEye);
  
    overlayCtx.filter = "none";
  
    // Highlight للإضاءة تحت العين
    overlayCtx.globalCompositeOperation = "screen";
    overlayCtx.globalAlpha = coverage * 0.15;
  
    // Left highlight - في وسط المنطقة تحت العين
    const leftHighlightPoint = getLandmark(230); // نقطة في وسط المنطقة تحت العين
    const leftGradient = overlayCtx.createRadialGradient(
      leftHighlightPoint.x,
      leftHighlightPoint.y,
      5,
      leftHighlightPoint.x,
      leftHighlightPoint.y,
      45
    );
    leftGradient.addColorStop(0, "rgba(255, 255, 255, 0.8)");
    leftGradient.addColorStop(0.4, "rgba(255, 255, 255, 0.3)");
    leftGradient.addColorStop(1, "rgba(255, 255, 255, 0)");
  
    overlayCtx.fillStyle = leftGradient;
    overlayCtx.beginPath();
    overlayCtx.arc(leftHighlightPoint.x, leftHighlightPoint.y, 45, 0, Math.PI * 2);
    overlayCtx.fill();
  
    // Right highlight - في وسط المنطقة تحت العين
    const rightHighlightPoint = getLandmark(450); // نقطة في وسط المنطقة تحت العين
    const rightGradient = overlayCtx.createRadialGradient(
      rightHighlightPoint.x,
      rightHighlightPoint.y,
      5,
      rightHighlightPoint.x,
      rightHighlightPoint.y,
      45
    );
    rightGradient.addColorStop(0, "rgba(255, 255, 255, 0.8)");
    rightGradient.addColorStop(0.4, "rgba(255, 255, 255, 0.3)");
    rightGradient.addColorStop(1, "rgba(255, 255, 255, 0)");
  
    overlayCtx.fillStyle = rightGradient;
    overlayCtx.beginPath();
    overlayCtx.arc(rightHighlightPoint.x, rightHighlightPoint.y, 45, 0, Math.PI * 2);
    overlayCtx.fill();
  
    // طبقة overlay للتفتيح
    overlayCtx.globalCompositeOperation = "overlay";
    overlayCtx.globalAlpha = coverage * 0.12;
    overlayCtx.fillStyle = color;
    overlayCtx.filter = "blur(12px)";
  
    drawSmoothArea(leftUnderEye);
    drawSmoothArea(rightUnderEye);
  
    // Reset
    overlayCtx.globalCompositeOperation = "source-over";
    overlayCtx.globalAlpha = 1;
    overlayCtx.filter = "none";
  }; */

  const applyConcealer = (overlayCtx, sourceCtx, landmarks, width, height) => {
    const getLandmark = (index) => {
      const landmark = landmarks[index];
      return {
        x: width - landmark.x * width,
        y: landmark.y * height,
      };
    };
  
    const currentColor = colorRef.current;
    const color = currentColor.startsWith("#") ? currentColor : `#${currentColor}`;
    const coverage = coverageRef.current;
  
    const r = parseInt(color.slice(1, 3), 16);
    const g = parseInt(color.slice(3, 5), 16);
    const b = parseInt(color.slice(5, 7), 16);
  
    // =====================================================
    // CORRECT UNDER-EYE LANDMARKS (on cheek, BELOW the eye)
    // These are from the cheek area, NOT the eye itself!
    // =====================================================
  
    // LEFT under-eye (cheek area below eye)
    const leftInnerUnder = getLandmark(111);  // Inner under-eye (near nose)
    const leftCenterUnder1 = getLandmark(117); // Under-eye cheek
    const leftCenterUnder2 = getLandmark(118); // Under-eye cheek center
    const leftCenterUnder3 = getLandmark(119); // Under-eye cheek
    const leftOuterUnder = getLandmark(121);  // Outer under-eye (near temple)
    const leftLower1 = getLandmark(229);      // Lower cheek
    const leftLower2 = getLandmark(230);      // Lower cheek center
    const leftLower3 = getLandmark(231);      // Lower cheek
  
    // RIGHT under-eye (cheek area below eye)
    const rightInnerUnder = getLandmark(340); // Inner under-eye (near nose)
    const rightCenterUnder1 = getLandmark(346); // Under-eye cheek
    const rightCenterUnder2 = getLandmark(347); // Under-eye cheek center
    const rightCenterUnder3 = getLandmark(348); // Under-eye cheek
    const rightOuterUnder = getLandmark(350); // Outer under-eye (near temple)
    const rightLower1 = getLandmark(449);     // Lower cheek
    const rightLower2 = getLandmark(450);     // Lower cheek center
    const rightLower3 = getLandmark(451);     // Lower cheek
  
    // Calculate under-eye area dimensions using CHEEK landmarks
    const leftWidth = Math.abs(leftOuterUnder.x - leftInnerUnder.x);
    const leftCenterX = (leftInnerUnder.x + leftOuterUnder.x) / 2;
    const leftCenterY = (leftCenterUnder2.y + leftLower2.y) / 2; // Between upper and lower cheek
  
    const rightWidth = Math.abs(rightOuterUnder.x - rightInnerUnder.x);
    const rightCenterX = (rightInnerUnder.x + rightOuterUnder.x) / 2;
    const rightCenterY = (rightCenterUnder2.y + rightLower2.y) / 2;
  
    const drawUnderEye = (centerX, centerY, areaWidth, innerPt, outerPt, lower) => {
      const fullWidth = areaWidth * 1.1;
      const fullHeight = areaWidth * 0.45;
      
      // LAYER 1: Main coverage
      overlayCtx.save();
      overlayCtx.globalCompositeOperation = "lighten";
      
      const gradient1 = overlayCtx.createRadialGradient(
        centerX, centerY, 0,
        centerX, centerY, fullWidth * 0.7
      );
      gradient1.addColorStop(0, `rgba(${r}, ${g}, ${b}, ${coverage * 0.4})`);
      gradient1.addColorStop(0.4, `rgba(${r}, ${g}, ${b}, ${coverage * 0.3})`);
      gradient1.addColorStop(0.7, `rgba(${r}, ${g}, ${b}, ${coverage * 0.15})`);
      gradient1.addColorStop(1, `rgba(${r}, ${g}, ${b}, 0)`);
      
      overlayCtx.fillStyle = gradient1;
      overlayCtx.beginPath();
      overlayCtx.ellipse(centerX, centerY, fullWidth, fullHeight, 0, 0, Math.PI * 2);
      overlayCtx.fill();
      overlayCtx.restore();
  
      // LAYER 2: Inner corner (near nose - darkest area)
      overlayCtx.save();
      overlayCtx.globalCompositeOperation = "lighten";
      
      const innerGradient = overlayCtx.createRadialGradient(
        innerPt.x, innerPt.y, 0,
        innerPt.x, innerPt.y, fullWidth * 0.4
      );
      innerGradient.addColorStop(0, `rgba(${r}, ${g}, ${b}, ${coverage * 0.35})`);
      innerGradient.addColorStop(0.5, `rgba(${r}, ${g}, ${b}, ${coverage * 0.15})`);
      innerGradient.addColorStop(1, `rgba(${r}, ${g}, ${b}, 0)`);
      
      overlayCtx.fillStyle = innerGradient;
      overlayCtx.beginPath();
      overlayCtx.ellipse(innerPt.x, innerPt.y, fullWidth * 0.4, fullHeight * 0.9, 0, 0, Math.PI * 2);
      overlayCtx.fill();
      overlayCtx.restore();
  
      // LAYER 3: Outer corner (near hair)
      overlayCtx.save();
      overlayCtx.globalCompositeOperation = "lighten";
      
      const outerGradient = overlayCtx.createRadialGradient(
        outerPt.x, outerPt.y, 0,
        outerPt.x, outerPt.y, fullWidth * 0.35
      );
      outerGradient.addColorStop(0, `rgba(${r}, ${g}, ${b}, ${coverage * 0.3})`);
      outerGradient.addColorStop(0.6, `rgba(${r}, ${g}, ${b}, ${coverage * 0.1})`);
      outerGradient.addColorStop(1, `rgba(${r}, ${g}, ${b}, 0)`);
      
      overlayCtx.fillStyle = outerGradient;
      overlayCtx.beginPath();
      overlayCtx.ellipse(outerPt.x, outerPt.y, fullWidth * 0.35, fullHeight * 0.8, 0, 0, Math.PI * 2);
      overlayCtx.fill();
      overlayCtx.restore();
  
      // LAYER 4: Highlight
      overlayCtx.save();
      overlayCtx.globalCompositeOperation = "screen";
      
      const highlight = overlayCtx.createRadialGradient(
        centerX, centerY, 0,
        centerX, centerY, fullWidth * 0.5
      );
      highlight.addColorStop(0, `rgba(255, 255, 255, ${coverage * 0.2})`);
      highlight.addColorStop(0.4, `rgba(255, 255, 255, ${coverage * 0.08})`);
      highlight.addColorStop(1, "rgba(255, 255, 255, 0)");
      
      overlayCtx.fillStyle = highlight;
      overlayCtx.beginPath();
      overlayCtx.ellipse(centerX, centerY, fullWidth * 0.5, fullHeight * 0.7, 0, 0, Math.PI * 2);
      overlayCtx.fill();
      overlayCtx.restore();
  
      // LAYER 5: Soft blend
      overlayCtx.save();
      overlayCtx.globalCompositeOperation = "soft-light";
      
      const softBlend = overlayCtx.createRadialGradient(
        centerX, centerY, 0,
        centerX, centerY, fullWidth * 0.8
      );
      softBlend.addColorStop(0, `rgba(${r}, ${g}, ${b}, ${coverage * 0.2})`);
      softBlend.addColorStop(0.5, `rgba(${r}, ${g}, ${b}, ${coverage * 0.1})`);
      softBlend.addColorStop(1, `rgba(${r}, ${g}, ${b}, 0)`);
      
      overlayCtx.fillStyle = softBlend;
      overlayCtx.beginPath();
      overlayCtx.ellipse(centerX, centerY, fullWidth * 0.8, fullHeight, 0, 0, Math.PI * 2);
      overlayCtx.fill();
      overlayCtx.restore();
    };
  
    // LEFT under-eye using CHEEK landmarks
    drawUnderEye(leftCenterX, leftCenterY, leftWidth, leftInnerUnder, leftOuterUnder, leftLower2);
  
    // RIGHT under-eye using CHEEK landmarks
    drawUnderEye(rightCenterX, rightCenterY, rightWidth, rightInnerUnder, rightOuterUnder, rightLower2);
  };

  
  const initializeFaceMesh = useCallback(async () => {
    try {
      const { FaceMesh } = await import("@mediapipe/face_mesh");
      const { Camera: CameraUtil } = await import("@mediapipe/camera_utils");

      const faceMesh = new FaceMesh({
        locateFile: (file) =>
          `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`,
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

  const handleMouseMove = useCallback(
    (e) => {
      if (!isDragging || !containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      setSplitPosition(Math.max(0, Math.min(100, (x / rect.width) * 100)));
    },
    [isDragging]
  );

  const handleTouchMove = useCallback(
    (e) => {
      if (!isDragging || !containerRef.current) return;
      const touch = e.touches[0];
      const rect = containerRef.current.getBoundingClientRect();
      const x = touch.clientX - rect.left;
      setSplitPosition(Math.max(0, Math.min(100, (x / rect.width) * 100)));
    },
    [isDragging]
  );

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
          💡 Concealer Try-On
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
        ref={containerRef}
        onMouseMove={handleMouseMove}
        onTouchMove={handleTouchMove}
        style={{
          position: "relative",
          width: "100%",
          maxWidth: "800px",
          aspectRatio: "4/3",
          backgroundColor: "#000",
          borderRadius: "12px",
          overflow: "hidden",
          boxShadow: "0 10px 40px rgba(0, 0, 0, 0.5)",
          cursor: isDragging ? "grabbing" : "default",
          touchAction: "none",
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
            position: "absolute",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            objectFit: "cover",
          }}
        />
        <canvas
          ref={overlayCanvasRef}
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            objectFit: "cover",
            clipPath: `inset(0 ${100 - splitPosition}% 0 0)`,
          }}
        />

        {/* Split Slider */}
        <div
          style={{
            position: "absolute",
            left: `${splitPosition}%`,
            top: 0,
            bottom: 0,
            width: "4px",
            backgroundColor: "white",
            cursor: "ew-resize",
            transform: "translateX(-50%)",
            boxShadow: "0 0 10px rgba(0,0,0,0.5)",
            zIndex: 10,
          }}
          onMouseDown={handleMouseDown}
          onTouchStart={handleMouseDown}
        >
          <div
            style={{
              position: "absolute",
              top: "50%",
              left: "50%",
              transform: "translate(-50%, -50%)",
              width: "48px",
              height: "48px",
              backgroundColor: "white",
              borderRadius: "50%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "0 4px 12px rgba(0,0,0,0.3)",
              cursor: "grab",
            }}
          >
            <div style={{ display: "flex", gap: "4px" }}>
              <div style={{ width: "2px", height: "20px", backgroundColor: "#666" }} />
              <div style={{ width: "2px", height: "20px", backgroundColor: "#666" }} />
            </div>
          </div>
        </div>

        {/* Labels */}
        <div
          style={{
            position: "absolute",
            top: "20px",
            left: "20px",
            backgroundColor: "rgba(0, 0, 0, 0.6)",
            color: "white",
            padding: "8px 16px",
            borderRadius: "20px",
            fontSize: "14px",
            fontWeight: "600",
            backdropFilter: "blur(10px)",
            opacity: splitPosition > 20 ? 1 : 0,
            transition: "opacity 0.2s",
          }}
        >
          WITH CONCEALER ✨
        </div>
        <div
          style={{
            position: "absolute",
            top: "20px",
            right: "20px",
            backgroundColor: "rgba(0, 0, 0, 0.6)",
            color: "white",
            padding: "8px 16px",
            borderRadius: "20px",
            fontSize: "14px",
            fontWeight: "600",
            backdropFilter: "blur(10px)",
            opacity: splitPosition < 80 ? 1 : 0,
            transition: "opacity 0.2s",
          }}
        >
          WITHOUT
        </div>

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

        {/* Face Detection Hint */}
        {isCameraActive && !isLoading && !faceDetected && (
          <div
            style={{
              position: "absolute",
              top: "20px",
              left: "50%",
              transform: "translateX(-50%)",
              background: "rgba(0, 0, 0, 0.7)",
              color: "white",
              padding: "12px 20px",
              borderRadius: "20px",
              fontSize: "14px",
              display: "flex",
              alignItems: "center",
              gap: "8px",
              backdropFilter: "blur(10px)",
              zIndex: 5,
            }}
          >
            <span style={{ fontSize: "16px" }}>💡</span>
            <span>Face the camera directly with good lighting</span>
          </div>
        )}
      </div>

      {/* Coverage Control */}
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
              minWidth: "70px",
            }}
          >
            Coverage
          </span>
          <input
            type="range"
            min="20"
            max="90"
            value={localCoverage * 100}
            onChange={(e) => setLocalCoverage(e.target.value / 100)}
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
            {Math.round(localCoverage * 100)}%
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
          Concealer: {colorRef.current.toUpperCase()}
        </span>
      </div>
    </div>
  );
};