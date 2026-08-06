import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
export default function MessageSearch({ messages, onClose, onJumpTo }) {
    const [query, setQuery] = useState('');
    const results = query.trim()
        ? messages.filter((m) => m.content?.toLowerCase().includes(query.toLowerCase()))
        : [];
    return (_jsxs("div", { className: "absolute top-0 left-0 right-0 bg-gray-900 border-b border-white/10 z-30 p-3", children: [_jsxs("div", { className: "flex items-center gap-2", children: [_jsx("input", { type: "text", value: query, onChange: (e) => setQuery(e.target.value), placeholder: "Search messages...", className: "flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 ring-theme-primary", autoFocus: true }), _jsx("button", { onClick: onClose, className: "text-gray-400 hover:text-white text-sm", children: "Cancel" })] }), query && (_jsx("div", { className: "mt-2 max-h-40 overflow-y-auto space-y-1", children: results.length === 0 ? (_jsx("p", { className: "text-gray-500 text-xs", children: "No results" })) : (results.map((msg) => (_jsxs("button", { onClick: () => { onJumpTo(msg.id); onClose(); }, className: "w-full text-left px-2 py-1 rounded hover:bg-white/5 text-sm text-gray-300", children: [_jsxs("span", { className: "text-gray-500 text-xs", children: [msg.senderName, ": "] }), _jsxs("span", { children: [msg.content?.slice(0, 60), (msg.content?.length ?? 0) > 60 ? '...' : ''] })] }, msg.id)))) }))] }));
}
//# sourceMappingURL=MessageSearch.js.map