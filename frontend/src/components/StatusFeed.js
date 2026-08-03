import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState, useCallback } from 'react';
import { api, getMediaUrl } from '../lib/api';
import { useAuthStore } from '../store/authStore';
import CreateStoryModal from './CreateStoryModal';
import StoryViewer from './StoryViewer';
export default function StatusFeed() {
    const [feed, setFeed] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [viewingUserIndex, setViewingUserIndex] = useState(null);
    const currentUser = useAuthStore((state) => state.user);
    const loadFeed = useCallback(() => {
        api.get('/stories/feed')
            .then((res) => setFeed(res.data))
            .catch((err) => console.error('Failed to load stories', err))
            .finally(() => setLoading(false));
    }, []);
    useEffect(() => {
        loadFeed();
    }, [loadFeed]);
    const handleDeleteStory = async (storyId) => {
        try {
            await api.delete(`/stories/${storyId}`);
            loadFeed();
        }
        catch (err) {
            console.error('Failed to delete story', err);
        }
    };
    const openViewer = (userIndex) => {
        setViewingUserIndex(userIndex);
    };
    if (loading) {
        return (_jsx("div", { className: "flex-1 flex items-center justify-center", children: _jsx("p", { className: "text-gray-500 text-sm", children: "Loading statuses..." }) }));
    }
    const myStoriesUser = feed.find(f => f.user.id === currentUser?.id);
    const otherStories = feed.filter(f => f.user.id !== currentUser?.id);
    return (_jsxs("div", { className: "flex-1 overflow-y-auto", children: [_jsxs("div", { className: "px-4 py-3 border-b border-white/10", children: [_jsxs("div", { className: "flex items-center justify-between mb-2", children: [_jsx("h3", { className: "text-xs font-semibold text-gray-400 uppercase", children: "My Status" }), _jsx("button", { onClick: () => setShowCreateModal(true), className: "text-theme-primary text-xs font-medium", children: "+ Add" })] }), !myStoriesUser || myStoriesUser.stories.length === 0 ? (_jsxs("div", { className: "flex items-center gap-3 cursor-pointer", onClick: () => setShowCreateModal(true), children: [_jsx("div", { className: "w-10 h-10 rounded-full bg-white/10 flex items-center justify-center", children: _jsxs("svg", { xmlns: "http://www.w3.org/2000/svg", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", className: "w-6 h-6 text-theme-primary", children: [_jsx("circle", { cx: "12", cy: "12", r: "10" }), _jsx("line", { x1: "12", y1: "8", x2: "12", y2: "16" }), _jsx("line", { x1: "8", y1: "12", x2: "16", y2: "12" })] }) }), _jsxs("div", { children: [_jsx("p", { className: "text-white text-sm font-medium", children: "Add status" }), _jsx("p", { className: "text-gray-500 text-xs", children: "Tap to add a status update" })] })] })) : (_jsx("div", { className: "space-y-2", children: myStoriesUser.stories.map((story, idx) => {
                            const preview = story.caption || (story.mediaType !== 'TEXT' ? (story.mediaType === 'IMAGE' ? 'Photo' : 'Video') : '');
                            const timeAgo = formatTimeAgo(story.createdAt);
                            return (_jsxs("div", { className: "flex items-center gap-2 group cursor-pointer hover:bg-white/5 rounded-lg px-2 py-1.5 -mx-2", onClick: () => openViewer(0), children: [_jsx("div", { className: "w-8 h-8 rounded-md bg-white/10 flex items-center justify-center overflow-hidden flex-shrink-0", children: story.mediaUrl && story.mediaType !== 'TEXT' ? (story.mediaType === 'IMAGE' ? (_jsx("img", { src: getMediaUrl(story.mediaUrl), className: "w-full h-full object-cover", alt: "" })) : (_jsxs("svg", { xmlns: "http://www.w3.org/2000/svg", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", className: "w-4 h-4 text-gray-400", children: [_jsx("polygon", { points: "23 7 16 12 23 17 23 7" }), _jsx("rect", { x: "1", y: "5", width: "15", height: "14", rx: "2", ry: "2" })] }))) : (_jsx("span", { className: "text-gray-400 text-xs font-medium", children: story.caption?.charAt(0) || 'S' })) }), _jsxs("div", { className: "flex-1 min-w-0", children: [_jsx("p", { className: "text-white text-xs truncate", children: preview || 'No content' }), _jsx("p", { className: "text-gray-500 text-xs", children: timeAgo })] }), _jsx("button", { onClick: (e) => {
                                            e.stopPropagation();
                                            handleDeleteStory(story.id);
                                        }, className: "opacity-0 group-hover:opacity-100 text-gray-500 hover:text-red-400 p-1", title: "Delete story", children: _jsxs("svg", { xmlns: "http://www.w3.org/2000/svg", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", className: "w-4 h-4", children: [_jsx("polyline", { points: "3 6 5 6 21 6" }), _jsx("path", { d: "M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6" }), _jsx("path", { d: "M10 11v6" }), _jsx("path", { d: "M14 11v6" }), _jsx("path", { d: "M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2" })] }) })] }, story.id));
                        }) }))] }), _jsxs("div", { className: "px-4 py-3", children: [_jsx("h3", { className: "text-xs font-semibold text-gray-400 uppercase mb-2", children: "Recent updates" }), otherStories.length === 0 ? (_jsx("p", { className: "text-gray-500 text-sm", children: "No recent status updates from contacts." })) : (otherStories.map((storyUser, index) => {
                        const viewerIndex = index + 1; // my stories are at index 0
                        const latestStory = storyUser.stories[storyUser.stories.length - 1];
                        const timeAgo = formatTimeAgo(latestStory.createdAt);
                        return (_jsxs("div", { className: "flex items-center gap-3 py-2 cursor-pointer hover:bg-white/5 rounded-lg -mx-2 px-2", onClick: () => openViewer(viewerIndex), children: [_jsx("div", { className: "w-10 h-10 rounded-full bg-theme-primary flex items-center justify-center text-white font-semibold overflow-hidden", children: storyUser.user.avatarUrl ? (_jsx("img", { src: getMediaUrl(storyUser.user.avatarUrl), className: "w-full h-full object-cover", alt: storyUser.user.name })) : (storyUser.user.name.charAt(0).toUpperCase()) }), _jsxs("div", { className: "flex-1 min-w-0", children: [_jsx("p", { className: "text-white text-sm font-medium truncate", children: storyUser.user.name }), _jsx("p", { className: "text-gray-500 text-xs truncate", children: latestStory.caption || (latestStory.mediaType !== 'TEXT' ? 'Photo/Video' : '') })] }), _jsx("span", { className: "text-gray-500 text-xs flex-shrink-0", children: timeAgo })] }, storyUser.user.id));
                    }))] }), showCreateModal && (_jsx(CreateStoryModal, { onClose: () => setShowCreateModal(false), onCreated: () => { loadFeed(); } })), viewingUserIndex !== null && feed.length > 0 && feed[viewingUserIndex] && (_jsx(StoryViewer, { stories: feed[viewingUserIndex].stories, user: feed[viewingUserIndex].user, onClose: () => setViewingUserIndex(null), onStoryDeleted: () => { loadFeed(); } }))] }));
}
function formatTimeAgo(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMin = Math.floor(diffMs / 60000);
    if (diffMin < 1)
        return 'now';
    if (diffMin < 60)
        return `${diffMin}m`;
    const diffHr = Math.floor(diffMin / 60);
    if (diffHr < 24)
        return `${diffHr}h`;
    const diffDay = Math.floor(diffHr / 24);
    return `${diffDay}d`;
}
//# sourceMappingURL=StatusFeed.js.map