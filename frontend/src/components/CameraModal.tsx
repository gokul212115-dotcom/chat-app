import React, { useState } from 'react';
import { useCamera } from '../hooks/useCamera';

interface CameraModalProps {
  onClose: () => void;
  onSend: (blob: Blob) => void;
}

export default function CameraModal({ onClose, onSend }: CameraModalProps) {
  const [photoBlob, setPhotoBlob] = useState<Blob | null>(null);
  const { videoRef, startCamera, stopCamera, capturePhoto } = useCamera();

  const handleCapture = async () => {
    const blob = await capturePhoto();
    if (blob) {
      setPhotoBlob(blob);
    }
  };

  const handleSend = () => {
    if (photoBlob) {
      onSend(photoBlob);
      onClose();
    }
  };

  const handleRetake = () => {
    setPhotoBlob(null);
  };

  return (
    <div className="fixed inset-0 bg-black/75 flex items-center justify-center">
      {photoBlob ? (
        <div className="relative w-full max-w-md p-6 bg-black rounded-lg text-white">
          <button onClick={onClose} className="absolute top-2 right-2 text-gray-400 hover:text-white">
            ×
          </button>
          <img src={URL.createObjectURL(photoBlob)} alt="Preview" className="w-full h-auto mb-4 rounded-lg" />
          <div className="flex justify-center gap-4">
            <button onClick={handleRetake} className="bg-emerald-500 hover:bg-emerald-400 text-black font-semibold px-4 py-2 rounded-full text-sm">
              Retake
            </button>
            <button onClick={handleSend} className="bg-emerald-500 hover:bg-emerald-400 text-black font-semibold px-4 py-2 rounded-full text-sm">
              Send
            </button>
          </div>
        </div>
      ) : (
        <div className="relative w-full max-w-md p-6 bg-black rounded-lg text-white">
          <button onClick={onClose} className="absolute top-2 right-2 text-gray-400 hover:text-white">
            ×
          </button>
          <video ref={videoRef} autoPlay playsInline className="w-full h-auto mb-4 rounded-lg" />
          <div className="flex justify-center">
            <button onClick={handleCapture} className="bg-emerald-500 hover:bg-emerald-400 text-black font-semibold px-6 py-3 rounded-full text-sm">
              Capture
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
