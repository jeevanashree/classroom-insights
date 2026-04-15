import { useEffect, useRef, useState, useCallback } from "react";
import * as faceapi from "face-api.js";

const MODEL_URL = "/models";

// 5 emotions we track
export type Emotion = "Happy" | "Sad" | "Angry" | "Surprised" | "Neutral";

export function useWebcamEmotions() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [modelsLoaded, setModelsLoaded] = useState(false);
  const [emotion, setEmotion] = useState<Emotion>("Neutral");
  const [attention, setAttention] = useState(75);
  const [allEmotions, setAllEmotions] = useState<Record<Emotion, number>>({
    Happy: 0, Sad: 0, Angry: 0, Surprised: 0, Neutral: 1,
  });
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);

  // Load face-api models
  useEffect(() => {
    async function loadModels() {
      try {
        await Promise.all([
          faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
          faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
          faceapi.nets.faceExpressionNet.loadFromUri(MODEL_URL),
        ]);
        setModelsLoaded(true);
      } catch (err) {
        console.error("Failed to load face-api models:", err);
        setCameraError("Failed to load AI models.");
      }
    }
    loadModels();
  }, []);

  // Start webcam
  useEffect(() => {
    if (!modelsLoaded) return;

    async function startCamera() {
      try {
        const mediaStream = await navigator.mediaDevices.getUserMedia({
          video: { width: 320, height: 240, facingMode: "user" },
        });
        streamRef.current = mediaStream;
        setStream(mediaStream);

        if (videoRef.current) {
          videoRef.current.srcObject = mediaStream;
        }
      } catch (err) {
        setCameraError("Camera permission denied. Please allow camera access.");
        console.error(err);
      }
    }

    startCamera();

    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [modelsLoaded]);

  // Analyze every 2 seconds
  useEffect(() => {
    if (!modelsLoaded) return;

    intervalRef.current = setInterval(async () => {
      if (!videoRef.current || videoRef.current.readyState < 2) return;

      try {
        const detections = await faceapi
          .detectAllFaces(videoRef.current, new faceapi.TinyFaceDetectorOptions())
          .withFaceLandmarks()
          .withFaceExpressions();

        if (detections.length === 0) {
          setAttention(0);
          setEmotion("Neutral");
          return;
        }

        const det = detections[0];
        const expr = det.expressions;

        // Map face-api expressions to our 5 emotions
        const mapped: Record<Emotion, number> = {
          Happy: expr.happy || 0,
          Sad: expr.sad || 0,
          Angry: expr.angry || 0,
          Surprised: expr.surprised || 0,
          Neutral: expr.neutral || 0,
        };

        setAllEmotions(mapped);

        // Find dominant emotion
        const dominant = (Object.entries(mapped) as [Emotion, number][])
          .sort((a, b) => b[1] - a[1])[0][0];
        setEmotion(dominant);

        // Calculate attention score
        let score = 100;
        const box = det.detection.box;
        const videoW = videoRef.current.videoWidth || 320;
        const videoH = videoRef.current.videoHeight || 240;

        // Face size penalty
        const faceArea = (box.width * box.height) / (videoW * videoH);
        if (faceArea < 0.03) score -= 30;
        else if (faceArea < 0.06) score -= 15;

        // Face position penalty (looking away)
        const faceCenterX = box.x + box.width / 2;
        const faceCenterY = box.y + box.height / 2;
        const offsetX = Math.abs(faceCenterX / videoW - 0.5);
        const offsetY = Math.abs(faceCenterY / videoH - 0.5);
        if (offsetX > 0.3) score -= 20;
        if (offsetY > 0.3) score -= 15;

        // Emotion-based penalty
        if (mapped.Sad > 0.5) score -= 15;
        if (mapped.Angry > 0.5) score -= 10;

        setAttention(Math.max(0, Math.min(100, Math.round(score))));
      } catch (err) {
        console.error("Analysis error:", err);
      }
    }, 2000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [modelsLoaded]);

  return {
    videoRef,
    modelsLoaded,
    emotion,
    attention,
    allEmotions,
    cameraError,
    stream,
  };
}
