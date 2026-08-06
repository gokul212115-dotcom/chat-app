import { useState, useRef } from 'react';
import { api, uploadFile } from '../lib/api';

const COLORS = [
  { name: 'Default', value: null, bg: 'bg-gray-900' },
  { name: 'Dark Green', value: '#0d2818', bg: 'bg-[#0d2818]' },
  { name: 'Dark Blue', value: '#0c1929', bg: 'bg-[#0c1929]' },
  { name: 'Dark Purple', value: '#1a0d29', bg: 'bg-[#1a0d29]' },
  { name: 'Dark Red', value: '#290d0d', bg: 'bg-[#290d0d]' },
  { name: 'Dark Teal', value: '#0d2926', bg: 'bg-[#0d2926]' },
  { name: 'Dark Pink', value: '#290d1f', bg: 'bg-[#290d1f]' },
  { name: 'Dark Orange', value: '#291a0d', bg: 'bg-[#291a0d]' },
];

interface Props {
  conversationId: number;
  currentWallpaper: string | null;
  onClose: () => void;
  onSelect: (wallpaper: string | null) => void;
}

export default function WallpaperPicker({ conversationId, currentWallpaper, onClose, onSelect }: Props) {
  const [selected, setSelected] = useState(currentWallpaper);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const res = await uploadFile(file);
      setSelected(res.url);
    } catch (err) {
      console.error('Upload failed', err);
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    try {
      await api.post(`/conversations/${conversationId}/wallpaper`, { wallpaper: selected });
      onSelect(selected);
      onClose();
    } catch (err) {
      console.error('Failed to set wallpaper', err);
    }
  };

  const isImage = selected && (selected.startsWith('http') || selected.startsWith('/'));

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 px-4">
      <div className="bg-gray-900 rounded-2xl p-6 max-w-sm w-full">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-white font-semibold">Wallpaper</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Image upload */}
        <div className="mb-4">
          <button
            onClick={() => fileInputRef.current?.click()}
            className="w-full bg-white/5 hover:bg-white/10 border border-dashed border-white/20 rounded-xl py-3 text-sm text-gray-300 flex items-center justify-center gap-2"
            disabled={uploading}
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
              <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
              <polyline points="17 8 12 3 7 8" />
              <line x1="12" y1="3" x2="12" y2="15" />
            </svg>
            {uploading ? 'Uploading...' : 'Upload Image'}
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFileUpload}
          />
          {isImage && (
            <div className="mt-2 relative rounded-lg overflow-hidden h-20">
              <img src={selected} alt="Preview" className="w-full h-full object-cover" />
              <button
                onClick={() => setSelected(null)}
                className="absolute top-1 right-1 bg-black/60 rounded-full p-0.5 text-white text-xs"
              >
                ✕
              </button>
            </div>
          )}
        </div>

        {/* Color picker */}
        <p className="text-gray-500 text-xs mb-2">Solid Colors</p>
        <div className="grid grid-cols-4 gap-3 mb-6">
          {COLORS.map((color) => (
            <button
              key={color.name}
              onClick={() => setSelected(color.value)}
              className={`w-14 h-14 rounded-full border-2 ${color.bg} ${selected === color.value ? 'border-white' : 'border-transparent'}`}
              title={color.name}
            />
          ))}
        </div>

        <button onClick={handleSave} className="w-full bg-theme-primary text-black font-semibold py-2 rounded-lg text-sm">
          Apply
        </button>
      </div>
    </div>
  );
}
