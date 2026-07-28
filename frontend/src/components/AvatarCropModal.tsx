import { useState, useRef, useCallback } from 'react';

interface AvatarCropModalProps {
  imageSrc: string;
  onCancel: () => void;
  onConfirm: (blob: Blob) => void;
}

export default function AvatarCropModal({ imageSrc, onCancel, onConfirm }: AvatarCropModalProps) {
  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStart = useRef({ x: 0, y: 0 });
  const imgRef = useRef<HTMLImageElement>(null);
  const containerSize = 280;

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    dragStart.current = { x: e.clientX - offset.x, y: e.clientY - offset.y };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    setOffset({
      x: e.clientX - dragStart.current.x,
      y: e.clientY - dragStart.current.y,
    });
  };

  const handleMouseUp = () => setIsDragging(false);

  const handleConfirm = useCallback(() => {
    const img = imgRef.current;
    if (!img) return;

    const canvas = document.createElement('canvas');
    const outputSize = 300;
    canvas.width = outputSize;
    canvas.height = outputSize;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const naturalWidth = img.naturalWidth;
    const naturalHeight = img.naturalHeight;
    const displayScale = Math.max(containerSize / naturalWidth, containerSize / naturalHeight) * scale;

    const drawWidth = naturalWidth * displayScale;
    const drawHeight = naturalHeight * displayScale;

    const centerX = containerSize / 2 + offset.x;
    const centerY = containerSize / 2 + offset.y;

    const sx = (containerSize / 2 - centerX + drawWidth / 2) / displayScale;
    const sy = (containerSize / 2 - centerY + drawHeight / 2) / displayScale;

    ctx.drawImage(
      img,
      Math.max(0, sx - containerSize / 2 / displayScale),
      Math.max(0, sy - containerSize / 2 / displayScale),
      containerSize / displayScale,
      containerSize / displayScale,
      0,
      0,
      outputSize,
      outputSize
    );

    canvas.toBlob((blob) => {
      if (blob) onConfirm(blob);
    }, 'image/jpeg', 0.9);
  }, [scale, offset, onConfirm]);

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
      <div className="bg-gray-900 rounded-2xl p-6 max-w-sm w-full mx-4">
        <h3 className="text-white font-semibold mb-4 text-center">Adjust Photo</h3>

        <div
          className="relative mx-auto rounded-full overflow-hidden bg-black cursor-move select-none"
          style={{ width: containerSize, height: containerSize }}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        >
          <img
            ref={imgRef}
            src={imageSrc}
            alt="crop preview"
            draggable={false}
            className="absolute pointer-events-none"
            style={{
              left: '50%',
              top: '50%',
              transform: `translate(-50%, -50%) translate(${offset.x}px, ${offset.y}px) scale(${scale})`,
              maxWidth: 'none',
              minWidth: containerSize,
              minHeight: containerSize,
            }}
          />
        </div>

        <div className="mt-4 flex items-center gap-3">
          <span className="text-gray-400 text-sm">Zoom</span>
          <input
            type="range"
            min="1"
            max="3"
            step="0.05"
            value={scale}
            onChange={(e) => setScale(parseFloat(e.target.value))}
            className="flex-1 accent-emerald-500"
          />
        </div>

        <div className="mt-6 flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 bg-white/10 hover:bg-white/20 text-white py-2 rounded-lg text-sm font-medium"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            className="flex-1 bg-emerald-500 hover:bg-emerald-400 text-black py-2 rounded-lg text-sm font-semibold"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}
