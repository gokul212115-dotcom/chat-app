import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useRef } from 'react';
import { api, uploadFile } from '../lib/api';
export default function CreateStoryModal({ onClose, onCreated }) {
    const [caption, setCaption] = useState('');
    const [mediaFile, setMediaFile] = useState(null);
    const [mediaPreview, setMediaPreview] = useState(null);
    const [mediaType, setMediaType] = useState('TEXT');
    const [uploading, setUploading] = useState(false);
    const [error, setError] = useState(null);
    const fileInputRef = useRef(null);
    const handleFileSelect = (e) => {
        const file = e.target.files?.[0];
        if (!file)
            return;
        const isImage = file.type.startsWith('image/');
        const isVideo = file.type.startsWith('video/');
        if (!isImage && !isVideo) {
            setError('Only images and videos are supported.');
            return;
        }
        setMediaFile(file);
        setMediaType(isImage ? 'IMAGE' : 'VIDEO');
        setMediaPreview(URL.createObjectURL(file));
        setError(null);
    };
    const handleSubmit = async () => {
        if (!caption.trim() && !mediaFile) {
            setError('Add a caption or media.');
            return;
        }
        setUploading(true);
        setError(null);
        try {
            let mediaUrl;
            let mimeType;
            let sizeBytes;
            let durationSeconds;
            if (mediaFile) {
                const uploadRes = await uploadFile(mediaFile);
                mediaUrl = uploadRes.url;
                mimeType = uploadRes.mimeType;
                sizeBytes = uploadRes.sizeBytes;
                // For video, we could extract duration from the file if needed (optional)
                if (mediaType === 'VIDEO' && mediaFile) {
                    // Simple duration extraction from video element
                    const video = document.createElement('video');
                    video.preload = 'metadata';
                    video.src = URL.createObjectURL(mediaFile);
                    await new Promise((resolve) => (video.onloadedmetadata = resolve));
                    durationSeconds = video.duration;
                    URL.revokeObjectURL(video.src);
                }
            }
            await api.post('/stories', {
                caption: caption.trim() || undefined,
                mediaUrl,
                mediaType,
                mimeType,
                sizeBytes,
                durationSeconds: durationSeconds ? Math.round(durationSeconds) : undefined,
            });
            onCreated();
            onClose();
        }
        catch (err) {
            setError(err.response?.data?.message || 'Failed to create story.');
        }
        finally {
            setUploading(false);
        }
    };
    return (_jsx("div", { className: "fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm", children: _jsxs("div", { className: "bg-gray-900 border border-white/10 rounded-2xl p-6 w-full max-w-md", children: [_jsxs("div", { className: "flex items-center justify-between mb-4", children: [_jsx("h2", { className: "text-white text-lg font-semibold", children: "Create Story" }), _jsx("button", { onClick: onClose, className: "text-gray-400 hover:text-white text-xl", children: "\u00D7" })] }), _jsxs("div", { className: "space-y-4", children: [_jsx("textarea", { value: caption, onChange: (e) => setCaption(e.target.value), placeholder: "Type a caption...", rows: 3, className: "w-full rounded-lg bg-white/5 border border-white/10 text-white placeholder-gray-500 px-3 py-2 focus:outline-none focus:ring-2 ring-theme-primary resize-none" }), _jsxs("div", { className: "flex items-center gap-3", children: [_jsxs("button", { onClick: () => fileInputRef.current?.click(), className: "flex items-center gap-2 bg-white/5 hover:bg-white/10 text-gray-300 px-4 py-2 rounded-lg text-sm", children: [_jsxs("svg", { xmlns: "http://www.w3.org/2000/svg", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", className: "w-4 h-4", children: [_jsx("rect", { x: "3", y: "3", width: "18", height: "18", rx: "2", ry: "2" }), _jsx("circle", { cx: "8.5", cy: "8.5", r: "1.5" }), _jsx("polyline", { points: "21 15 16 10 5 21" })] }), mediaFile ? 'Change Media' : 'Add Image/Video'] }), mediaFile && (_jsx("button", { onClick: () => { setMediaFile(null); setMediaPreview(null); setMediaType('TEXT'); }, className: "text-red-400 text-sm hover:text-red-300", children: "Remove" })), _jsx("input", { ref: fileInputRef, type: "file", accept: "image/*,video/*", className: "hidden", onChange: handleFileSelect })] }), mediaPreview && (_jsx("div", { className: "relative rounded-lg overflow-hidden bg-black", children: mediaType === 'IMAGE' ? (_jsx("img", { src: mediaPreview, alt: "Preview", className: "w-full max-h-64 object-contain" })) : (_jsx("video", { src: mediaPreview, controls: true, className: "w-full max-h-64" })) })), error && (_jsx("p", { className: "text-red-400 text-sm", children: error })), _jsx("button", { onClick: handleSubmit, disabled: uploading, className: "w-full bg-theme-primary disabled:opacity-60 text-black font-semibold py-2 rounded-lg", children: uploading ? 'Uploading...' : 'Post Story' })] })] }) }));
}
//# sourceMappingURL=CreateStoryModal.js.map