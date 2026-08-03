import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
import { useCamera } from '../hooks/useCamera';
export default function CameraModal({ onClose, onSend }) {
    const [photoBlob, setPhotoBlob] = useState(null);
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
    return (_jsx("div", { className: "fixed inset-0 bg-black/75 flex items-center justify-center", children: photoBlob ? (_jsxs("div", { className: "relative w-full max-w-md p-6 bg-black rounded-lg text-white", children: [_jsx("button", { onClick: onClose, className: "absolute top-2 right-2 text-gray-400 hover:text-white", children: "\u00D7" }), _jsx("img", { src: URL.createObjectURL(photoBlob), alt: "Preview", className: "w-full h-auto mb-4 rounded-lg" }), _jsxs("div", { className: "flex justify-center gap-4", children: [_jsx("button", { onClick: handleRetake, className: "bg-emerald-500 hover:bg-emerald-400 text-black font-semibold px-4 py-2 rounded-full text-sm", children: "Retake" }), _jsx("button", { onClick: handleSend, className: "bg-emerald-500 hover:bg-emerald-400 text-black font-semibold px-4 py-2 rounded-full text-sm", children: "Send" })] })] })) : (_jsxs("div", { className: "relative w-full max-w-md p-6 bg-black rounded-lg text-white", children: [_jsx("button", { onClick: onClose, className: "absolute top-2 right-2 text-gray-400 hover:text-white", children: "\u00D7" }), _jsx("video", { ref: videoRef, autoPlay: true, playsInline: true, className: "w-full h-auto mb-4 rounded-lg" }), _jsx("div", { className: "flex justify-center", children: _jsx("button", { onClick: handleCapture, className: "bg-emerald-500 hover:bg-emerald-400 text-black font-semibold px-6 py-3 rounded-full text-sm", children: "Capture" }) })] })) }));
}
//# sourceMappingURL=CameraModal.js.map