import { useState, useEffect, useCallback } from 'react';
import { api, getMediaUrl } from '../lib/api';
import { useAuthStore } from '../store/authStore';

interface Story {
  id: number;
  userId: number;
  caption: string | null;
  mediaUrl: string | null;
  mediaType: 'TEXT' | 'IMAGE' | 'VIDEO';
  createdAt: string;
  expiresAt: string;
  durationSeconds?: number | null;
}

interface User {
  id: number;
  name: string;
  avatarUrl: string | null;
}

interface Props {
  stories: Story[];
  user: User;
  onClose: () => void;
  onStoryDeleted?: () => void; // callback to refresh feed
}

export default function StoryViewer({ stories: initialStories, user, onClose, onStoryDeleted }: Props) {
  const [stories, setStories] = useState<Story[]>(initialStories);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const currentUser = useAuthStore((state) => state.user);

  const currentStory = stories[currentIndex];
  const isVideo = currentStory?.mediaType === 'VIDEO';
  const isImage = currentStory?.mediaType === 'IMAGE';
  const isText = currentStory?.mediaType === 'TEXT' || (!isVideo && !isImage);
  const isOwnStory = currentStory?.userId === currentUser?.id;

  // Reset stories when initialStories change (feed refresh)
  useEffect(() => {
    setStories(initialStories);
    setCurrentIndex(0);
    setProgress(0);
  }, [initialStories]);

  // Auto advance timer
  useEffect(() => {
    if (!currentStory) return;
    if (isVideo) {
      setProgress(0);
      return;
    }

    const duration = 5000;
    const interval = 100;
    let elapsed = 0;

    const timer = setInterval(() => {
      elapsed += interval;
      setProgress(Math.min((elapsed / duration) * 100, 100));
      if (elapsed >= duration) {
        clearInterval(timer);
        handleNext();
      }
    }, interval);

    return () => clearInterval(timer);
  }, [currentIndex, stories]);

  const handleNext = useCallback(() => {
    if (currentIndex < stories.length - 1) {
      setCurrentIndex(currentIndex + 1);
      setProgress(0);
    } else {
      onClose();
    }
  }, [currentIndex, stories.length, onClose]);

  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
      setProgress(0);
    }
  };

  const handleVideoEnd = () => {
    handleNext();
  };

  const handleDelete = async () => {
    if (!currentStory) return;
    try {
      await api.delete(`/stories/${currentStory.id}`);
      const updatedStories = stories.filter(s => s.id !== currentStory.id);
      setStories(updatedStories);
      if (updatedStories.length === 0) {
        onClose();
        onStoryDeleted?.();
        return;
      }
      // Adjust index if needed
      if (currentIndex >= updatedStories.length) {
        setCurrentIndex(updatedStories.length - 1);
      }
      setProgress(0);
      onStoryDeleted?.(); // refresh feed in background
    } catch (err) {
      console.error('Failed to delete story', err);
    }
  };

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') handleNext();
      else if (e.key === 'ArrowLeft') handlePrev();
      else if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [handleNext, onClose]);

  if (!currentStory) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black flex items-center justify-center">
      <button
        onClick={onClose}
        className="absolute top-4 right-4 z-10 text-white/70 hover:text-white text-2xl"
      >
        &times;
      </button>

      {isOwnStory && (
        <button
          onClick={handleDelete}
          className="absolute top-4 right-12 z-10 text-white/70 hover:text-red-400 text-xl"
          title="Delete story"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
            <polyline points="3 6 5 6 21 6" />
            <path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6" />
            <path d="M10 11v6" />
            <path d="M14 11v6" />
            <path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2" />
          </svg>
        </button>
      )}

      <div className="absolute top-4 left-4 z-10 flex items-center gap-2">
        <div className="w-8 h-8 rounded-full bg-theme-primary flex items-center justify-center text-white text-xs font-semibold overflow-hidden">
          {user.avatarUrl ? (
            <img src={getMediaUrl(user.avatarUrl)} className="w-full h-full object-cover" alt={user.name} />
          ) : (
            user.name.charAt(0).toUpperCase()
          )}
        </div>
        <span className="text-white text-sm font-medium">{user.name}</span>
      </div>

      <div className="absolute top-0 left-0 right-0 flex gap-1 px-2 pt-2 z-10">
        {stories.map((_, idx) => (
          <div key={idx} className="flex-1 h-1 bg-white/30 rounded-full overflow-hidden">
            <div
              className="h-full bg-white rounded-full transition-all duration-100 ease-linear"
              style={{ width: idx < currentIndex ? '100%' : idx === currentIndex ? `${progress}%` : '0%' }}
            />
          </div>
        ))}
      </div>

      <div className="absolute inset-0 flex z-20">
        <div className="w-1/3 h-full" onClick={handlePrev} />
        <div className="w-1/3 h-full" onClick={onClose} />
        <div className="w-1/3 h-full" onClick={handleNext} />
      </div>

      <div className="absolute inset-0 flex items-center justify-center p-4" onClick={(e) => e.stopPropagation()}>
        {isText && (
          <div className="bg-gray-800 text-white p-8 rounded-xl max-w-md w-full text-center">
            <p className="text-lg whitespace-pre-wrap break-words">{currentStory.caption}</p>
          </div>
        )}
        {isImage && currentStory.mediaUrl && (
          <img src={getMediaUrl(currentStory.mediaUrl)} alt="story" className="max-w-full max-h-[80vh] object-contain" />
        )}
        {isVideo && currentStory.mediaUrl && (
          <video src={getMediaUrl(currentStory.mediaUrl)} autoPlay playsInline className="max-w-full max-h-[80vh] object-contain" onEnded={handleVideoEnd} />
        )}
      </div>

      {currentStory.caption && !isText && (
        <div className="absolute bottom-6 left-0 right-0 text-center z-10">
          <p className="text-white text-sm bg-black/40 inline-block px-4 py-2 rounded-full">
            {currentStory.caption}
          </p>
        </div>
      )}
    </div>
  );
}
