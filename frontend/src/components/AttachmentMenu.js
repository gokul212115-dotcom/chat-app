import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useRef, useEffect } from 'react';
export default function AttachmentMenu({ onCameraClick, onGalleryClick, onDocumentClick, onLocationClick, }) {
    const [isOpen, setIsOpen] = useState(false);
    const menuRef = useRef(null);
    useEffect(() => {
        const handleClickOutside = (e) => {
            if (menuRef.current && !menuRef.current.contains(e.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);
    const items = [
        {
            label: 'Camera',
            onClick: onCameraClick,
            icon: (_jsxs("svg", { xmlns: "http://www.w3.org/2000/svg", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", className: "w-5 h-5", children: [_jsx("path", { d: "M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z" }), _jsx("circle", { cx: "12", cy: "13", r: "4" })] })),
        },
        {
            label: 'Gallery',
            onClick: onGalleryClick,
            icon: (_jsxs("svg", { xmlns: "http://www.w3.org/2000/svg", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", className: "w-5 h-5", children: [_jsx("rect", { x: "3", y: "3", width: "18", height: "18", rx: "2" }), _jsx("circle", { cx: "8.5", cy: "8.5", r: "1.5" }), _jsx("path", { d: "M21 15l-5-5L5 21" })] })),
        },
        {
            label: 'Document',
            onClick: onDocumentClick,
            icon: (_jsx("svg", { xmlns: "http://www.w3.org/2000/svg", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", className: "w-5 h-5", children: _jsx("path", { d: "M21.44 11.05l-9.19 9.19a5 5 0 01-7.07-7.07l9.19-9.19a3.5 3.5 0 014.95 4.95l-9.2 9.19a1.5 1.5 0 01-2.12-2.12l8.49-8.48" }) })),
        },
        {
            label: 'Location',
            onClick: onLocationClick,
            icon: (_jsxs("svg", { xmlns: "http://www.w3.org/2000/svg", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", className: "w-5 h-5", children: [_jsx("path", { d: "M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" }), _jsx("circle", { cx: "12", cy: "10", r: "3" })] })),
        },
    ];
    return (_jsxs("div", { className: "relative", ref: menuRef, children: [_jsx("button", { onClick: () => setIsOpen((v) => !v), className: "bg-theme-primary text-black font-semibold w-9 h-9 flex items-center justify-center rounded-full text-lg", children: isOpen ? '×' : '+' }), isOpen && (_jsx("div", { className: "absolute bottom-12 left-0 bg-gray-900 border border-white/10 rounded-xl shadow-xl py-2 w-40 z-20", children: items.map((item) => (_jsxs("button", { onClick: () => {
                        item.onClick();
                        setIsOpen(false);
                    }, className: "w-full flex items-center gap-3 px-4 py-2 text-sm text-gray-200 hover:bg-white/5 hover:text-theme-primary", children: [item.icon, item.label] }, item.label))) }))] }));
}
//# sourceMappingURL=AttachmentMenu.js.map