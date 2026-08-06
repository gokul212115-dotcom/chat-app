import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
import { api } from '../lib/api';
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
export default function WallpaperPicker({ conversationId, currentWallpaper, onClose, onSelect }) {
    const [selected, setSelected] = useState(currentWallpaper);
    const handleSave = async () => {
        try {
            await api.post(`/conversations/${conversationId}/wallpaper`, { wallpaper: selected });
            onSelect(selected);
            onClose();
        }
        catch (err) {
            console.error('Failed to set wallpaper', err);
        }
    };
    return (_jsx("div", { className: "fixed inset-0 bg-black/80 flex items-center justify-center z-50 px-4", children: _jsxs("div", { className: "bg-gray-900 rounded-2xl p-6 max-w-sm w-full", children: [_jsxs("div", { className: "flex items-center justify-between mb-4", children: [_jsx("h3", { className: "text-white font-semibold", children: "Wallpaper" }), _jsx("button", { onClick: onClose, className: "text-gray-400 hover:text-white", children: _jsx("svg", { xmlns: "http://www.w3.org/2000/svg", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", className: "w-5 h-5", children: _jsx("path", { d: "M18 6L6 18M6 6l12 12" }) }) })] }), _jsx("div", { className: "grid grid-cols-4 gap-3 mb-6", children: COLORS.map((color) => (_jsx("button", { onClick: () => setSelected(color.value), className: `w-14 h-14 rounded-full border-2 ${color.bg} ${selected === color.value ? 'border-white' : 'border-transparent'}`, title: color.name }, color.name))) }), _jsx("button", { onClick: handleSave, className: "w-full bg-theme-primary text-black font-semibold py-2 rounded-lg text-sm", children: "Apply" })] }) }));
}
//# sourceMappingURL=WallpaperPicker.js.map