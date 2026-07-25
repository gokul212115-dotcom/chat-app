import { useState, useEffect } from 'react';

export function useAudioRecorder() {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [error, setError] = useState<string | null>(null);

  let mediaRecorder: MediaRecorder | null = null;
  let audioChunks: BlobPart[] = [];
  let timer: NodeJS.Timeout | null = null;

  useEffect(() => {
    return () => {
      if (mediaRecorder) {
        mediaRecorder.stop();
      }
      if (timer) {
        clearInterval(timer);
      }
    };
  }, []);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunks.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(audioChunks, { type: 'audio/webm' });
        setAudioBlob(blob);
        audioChunks = [];
      };

      mediaRecorder.start();
      setIsRecording(true);
      setError(null);

      timer = setInterval(() => {
        setRecordingSeconds((prev) => prev + 1);
      }, 1000);
    } catch (err) {
      setError('Permission denied. Please allow microphone access.');
      setIsRecording(false);
    }
  };

  const stopRecording = () => {
    if (mediaRecorder) {
      mediaRecorder.stop();
    }
    if (timer) {
      clearInterval(timer);
    }
    setRecordingSeconds(0);
    setIsRecording(false);
  };

  return { isRecording, recordingSeconds, startRecording, stopRecording, audioBlob, error };
}
