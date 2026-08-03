import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
import { api, findUserByPhone, getMediaUrl } from '../lib/api';
import { useAuthStore } from '../store/authStore';
export default function GroupInfoModal({ conversation, onClose, onUpdated, onLeft }) {
    const currentUser = useAuthStore((state) => state.user);
    const [phoneInput, setPhoneInput] = useState('');
    const [error, setError] = useState(null);
    const [isAdding, setIsAdding] = useState(false);
    const [isLeaving, setIsLeaving] = useState(false);
    const [removingId, setRemovingId] = useState(null);
    const myMembership = conversation.participants.find((p) => p.id === currentUser?.id);
    const isAdmin = myMembership?.role === 'ADMIN';
    const handleAddMember = async () => {
        setError(null);
        setIsAdding(true);
        try {
            const found = await findUserByPhone(phoneInput.trim());
            if (!found) {
                setError('No user found with that phone number');
                setIsAdding(false);
                return;
            }
            const response = await api.post(`/conversations/${conversation.id}/members`, {
                userIds: [found.id],
            });
            onUpdated(response.data);
            setPhoneInput('');
        }
        catch (err) {
            setError(err.response?.data?.message || 'Failed to add member');
        }
        finally {
            setIsAdding(false);
        }
    };
    const handleRemoveMember = async (memberId) => {
        setRemovingId(memberId);
        try {
            await api.delete(`/conversations/${conversation.id}/members/${memberId}`);
            const updatedParticipants = conversation.participants.filter((p) => p.id !== memberId);
            onUpdated({ ...conversation, participants: updatedParticipants });
        }
        catch (err) {
            console.error('Failed to remove member:', err);
        }
        finally {
            setRemovingId(null);
        }
    };
    const handleLeaveGroup = async () => {
        const confirmed = window.confirm('Are you sure you want to leave this group?');
        if (!confirmed)
            return;
        setIsLeaving(true);
        try {
            await api.post(`/conversations/${conversation.id}/leave`);
            onLeft();
        }
        catch (err) {
            console.error('Failed to leave group:', err);
        }
        finally {
            setIsLeaving(false);
        }
    };
    return (_jsx("div", { className: "fixed inset-0 bg-black/80 flex items-center justify-center z-50 px-4", children: _jsxs("div", { className: "bg-gray-900 rounded-2xl p-6 max-w-sm w-full max-h-[80vh] overflow-y-auto", children: [_jsxs("div", { className: "flex items-center justify-between mb-4", children: [_jsx("h3", { className: "text-white font-semibold", children: "Group Info" }), _jsx("button", { onClick: onClose, className: "text-gray-400 hover:text-white", children: _jsx("svg", { xmlns: "http://www.w3.org/2000/svg", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", className: "w-5 h-5", children: _jsx("path", { d: "M18 6L6 18M6 6l12 12" }) }) })] }), _jsxs("div", { className: "flex flex-col items-center mb-6", children: [_jsx("div", { className: "w-16 h-16 rounded-full bg-theme-primary flex items-center justify-center text-white mb-2 overflow-hidden", children: conversation.groupAvatarUrl ? (_jsx("img", { src: getMediaUrl(conversation.groupAvatarUrl), className: "w-full h-full object-cover", alt: "group" })) : (_jsxs("svg", { xmlns: "http://www.w3.org/2000/svg", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", className: "w-7 h-7", children: [_jsx("path", { d: "M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" }), _jsx("circle", { cx: "9", cy: "7", r: "4" }), _jsx("path", { d: "M23 21v-2a4 4 0 00-3-3.87" }), _jsx("path", { d: "M16 3.13a4 4 0 010 7.75" })] })) }), _jsx("p", { className: "text-white font-semibold", children: conversation.groupName }), _jsxs("p", { className: "text-gray-500 text-xs", children: [conversation.participants.length, " members"] })] }), isAdmin && (_jsxs("div", { className: "mb-4", children: [_jsxs("div", { className: "flex gap-2", children: [_jsx("input", { type: "tel", value: phoneInput, onChange: (e) => setPhoneInput(e.target.value), placeholder: "Add member by phone number", className: "flex-1 rounded-lg bg-white/5 border border-white/10 text-white placeholder-gray-500 px-3 py-2 text-sm focus:outline-none focus:ring-2 ring-theme-primary" }), _jsx("button", { onClick: handleAddMember, disabled: isAdding || !phoneInput.trim(), className: "bg-theme-primary disabled:opacity-50 text-black text-sm font-medium px-3 rounded-lg", children: "Add" })] }), error && _jsx("p", { className: "text-red-400 text-xs mt-1", children: error })] })), _jsxs("div", { className: "space-y-2 mb-6", children: [_jsx("p", { className: "text-gray-400 text-xs mb-2", children: "Members" }), conversation.participants.map((member) => {
                            const memberRole = member.role;
                            return (_jsxs("div", { className: "flex items-center justify-between bg-white/5 rounded-lg px-3 py-2", children: [_jsxs("div", { className: "flex items-center gap-2", children: [_jsx("div", { className: "w-8 h-8 rounded-full bg-theme-primary flex items-center justify-center text-white text-xs font-semibold overflow-hidden", children: member.avatarUrl ? (_jsx("img", { src: getMediaUrl(member.avatarUrl), className: "w-full h-full object-cover", alt: member.name })) : (member.name.charAt(0).toUpperCase()) }), _jsxs("div", { children: [_jsxs("p", { className: "text-white text-sm", children: [member.name, " ", member.id === currentUser?.id && '(You)'] }), memberRole === 'ADMIN' && (_jsx("p", { className: "text-theme-primary text-[10px]", children: "Admin" }))] })] }), isAdmin && member.id !== currentUser?.id && (_jsx("button", { onClick: () => handleRemoveMember(member.id), disabled: removingId === member.id, className: "text-gray-500 hover:text-red-400 text-xs", children: removingId === member.id ? '...' : 'Remove' }))] }, member.id));
                        })] }), _jsx("button", { onClick: handleLeaveGroup, disabled: isLeaving, className: "w-full bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-400 font-medium py-2.5 rounded-lg text-sm", children: isLeaving ? 'Leaving...' : 'Leave Group' })] }) }));
}
//# sourceMappingURL=GroupInfoModal.js.map