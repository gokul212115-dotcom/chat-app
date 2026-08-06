import { useState } from 'react';
import type { Message } from '../types/chat';

interface Props {
  messages: Message[];
  onClose: () => void;
  onJumpTo: (messageId: number) => void;
}

export default function MessageSearch({ messages, onClose, onJumpTo }: Props) {
  const [query, setQuery] = useState('');
  const results = query.trim()
    ? messages.filter((m) => m.content?.toLowerCase().includes(query.toLowerCase()))
    : [];

  return (
    <div className="absolute top-0 left-0 right-0 bg-gray-900 border-b border-white/10 z-30 p-3">
      <div className="flex items-center gap-2">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search messages..."
          className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 ring-theme-primary"
          autoFocus
        />
        <button onClick={onClose} className="text-gray-400 hover:text-white text-sm">Cancel</button>
      </div>
      {query && (
        <div className="mt-2 max-h-40 overflow-y-auto space-y-1">
          {results.length === 0 ? (
            <p className="text-gray-500 text-xs">No results</p>
          ) : (
            results.map((msg) => (
              <button
                key={msg.id}
                onClick={() => { onJumpTo(msg.id); onClose(); }}
                className="w-full text-left px-2 py-1 rounded hover:bg-white/5 text-sm text-gray-300"
              >
                <span className="text-gray-500 text-xs">{msg.senderName}: </span>
                <span>{msg.content?.slice(0, 60)}{(msg.content?.length ?? 0) > 60 ? '...' : ''}</span>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
