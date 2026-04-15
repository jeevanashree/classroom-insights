import { useEffect, useRef, useState } from 'react';
import * as faceapi from 'face-api.js';

const MODEL_URL = '/models';

export function useWebcamAnalysis() {
  const videoRef = useRef(null);
  const intervalRef = useRef(null);
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);

  const [modelsLoaded, setModelsLoaded] = useState(false);
  const [emotion, setEmotion] = useState('neutral');
  const [attention, setAttention] = useState(0);
  const [micVolume, setMicVolume] = useState(0);
  const [cameraError, setCameraError] = useState(null);

  // ── STEP 3A: Load models once on mount ──
  useEffect(() => {
    async function loadModels() {
      await Promise.all([
        faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
        faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
        faceapi.nets.faceExpressionNet.loadFromUri(MODEL_URL),
      ]);
      setModelsLoaded(true);
    }
    loadModels();
  }, []);

  // ── STEP 3B: Start webcam + mic after models loaded ──
  useEffect(() => {
    if (!modelsLoaded) return;

    async function startMedia() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { width: 320, height: 240, facingMode: 'user' },
          audio: true,
        });

        // Attach video stream
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }

        // Setup audio analyser
        const audioCtx = new AudioContext();
        const source = audioCtx.createMediaStreamSource(stream);
        const analyser = audioCtx.createAnalyser();
        analyser.fftSize = 512;
        source.connect(analyser);
        audioContextRef.current = audioCtx;
        analyserRef.current = analyser;

      } catch (err) {
        setCameraError('Camera/mic permission denied. Please allow access.');
        console.error(err);
      }
    }

    startMedia();

    return () => {
      // Cleanup on unmount
      if (videoRef.current?.srcObject) {
        videoRef.current.srcObject.getTracks().forEach(t => t.stop());
      }
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
      clearInterval(intervalRef.current);
    };
  }, [modelsLoaded]);

  // ── STEP 3C: Run analysis every 2 seconds ──
  useEffect(() => {
    if (!modelsLoaded) return;

    intervalRef.current = setInterval(async () => {
      await analyzeFrame();
    }, 2000);

    return () => clearInterval(intervalRef.current);
  }, [modelsLoaded]);

  async function analyzeFrame() {
    if (!videoRef.current || videoRef.current.readyState < 2) return;

    // --- Face + Emotion Detection ---
    const detections = await faceapi
      .detectAllFaces(videoRef.current, new faceapi.TinyFaceDetectorOptions())
      .withFaceLandmarks()
      .withFaceExpressions();

    if (detections.length === 0) {
      // No face detected = not paying attention
      setAttention(0);
      setEmotion('absent');
    } else {
      const det = detections[0]; // use first face

      // Get dominant emotion
      const expressions = det.expressions;
      const dominantEmotion = Object.entries(expressions)
        .sort((a, b) => b[1] - a[1])[0][0];
      setEmotion(dominantEmotion);

      // Calculate attention score
      const attentionScore = calculateAttention(det);
      setAttention(attentionScore);
    }

    // --- Mic Volume (participation indicator) ---
    if (analyserRef.current) {
      const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
      analyserRef.current.getByteFrequencyData(dataArray);
      const avg = dataArray.reduce((a, b) => a + b, 0) / dataArray.length;
      const volumePercent = Math.min(100, Math.round((avg / 128) * 100));
      setMicVolume(volumePercent);
    }
  }

  function calculateAttention(detection) {
    // Attention heuristics based on face position and landmarks
    let score = 100;

    const box = detection.detection.box;
    const videoW = videoRef.current.videoWidth || 320;
    const videoH = videoRef.current.videoHeight || 240;

    // 1. Face size (too small = person is far/distracted)
    const faceArea = (box.width * box.height) / (videoW * videoH);
    if (faceArea < 0.03) score -= 30; // face too small
    else if (faceArea < 0.06) score -= 15;

    // 2. Face position (centered = looking at screen)
    const faceCenterX = box.x + box.width / 2;
    const faceCenterY = box.y + box.height / 2;
    const offsetX = Math.abs(faceCenterX / videoW - 0.5);
    const offsetY = Math.abs(faceCenterY / videoH - 0.5);
    if (offsetX > 0.3) score -= 20;
    if (offsetY > 0.3) score -= 15;

    // 3. Expression penalty (sleeping/angry = not engaged)
    const expr = detection.expressions;
    if (expr.sleepy > 0.5) score -= 25;
    if (expr.disgusted > 0.5) score -= 10;
    if (expr.angry > 0.5) score -= 10;

    return Math.max(0, Math.min(100, score));
  }

  return {
    videoRef,
    modelsLoaded,
    emotion,
    attention,
    micVolume,
    cameraError,
  };
}