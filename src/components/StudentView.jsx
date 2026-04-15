import React, { useEffect } from 'react';
import { useWebcamAnalysis } from '../hooks/useWebcamAnalysis';
import { supabase } from '../lib/supabase'; // your existing supabase client

export default function StudentView({ studentName, meetingId }) {
  const {
    videoRef,
    modelsLoaded,
    emotion,
    attention,
    micVolume,
    cameraError,
  } = useWebcamAnalysis();

  // Push data to Supabase every 3 seconds
  useEffect(() => {
    const interval = setInterval(async () => {
      if (!meetingId || !studentName) return;

      await supabase
        .from('student_engagement')
        .upsert({
          meeting_id: meetingId,
          student_name: studentName,
          emotion: emotion,
          attention: attention,
          mic_volume: micVolume,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'meeting_id,student_name' });

    }, 3000);

    return () => clearInterval(interval);
  }, [emotion, attention, micVolume, meetingId, studentName]);

  return (
    <div className="student-view">
      <h2>Hi, {studentName}!</h2>
      <p>You're in the classroom</p>

      {cameraError && (
        <div className="error-banner">{cameraError}</div>
      )}

      {!modelsLoaded && (
        <p>Loading AI models... please wait</p>
      )}

      {/* Hidden video element for processing */}
      <video
        ref={videoRef}
        autoPlay
        muted
        playsInline
        style={{ width: 200, borderRadius: 8, marginTop: 12 }}
      />

      {/* Attention Ring */}
      <div className="attention-ring">
        <span>{attention}%</span>
      </div>

      {/* Emotion Display */}
      <div className="emotion-display">
        <p>Current Emotion</p>
        <span>{emotionEmoji(emotion)}</span>
        <p>{emotion}</p>
      </div>

      {/* Mic Activity */}
      <div className="mic-bar">
        <p>Mic Activity</p>
        <div
          className="mic-fill"
          style={{ width: `${micVolume}%` }}
        />
      </div>
    </div>
  );
}

function emotionEmoji(emotion) {
  const map = {
    happy: '😊', sad: '😢', angry: '😠',
    surprised: '😲', disgusted: '🤢',
    fearful: '😨', neutral: '😐', absent: '👻',
  };
  return map[emotion] || '😐';
}