import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
import { api, findUserByPhone } from '../lib/api';
export default function CreateGroupModal({ onClose, onCreated }) {
    const [phoneInput, setPhoneInput] = useState('');
    const [members, setMembers] = useState([]);
    const [groupName, setGroupName] = useState('');
    const [error, setError] = useState(null);
    const [isSearching, setIsSearching] = useState(false);
    const [isCreating, setIsCreating] = useState(false);
    const handleAddMember = async () => {
        setError(null);
        setIsSearching(true);
        try {
            const found = await findUserByPhone(phoneInput.trim());
            if (!found) {
                setError('No user found with that phone number');
                setIsSearching(false);
                return;
            }
            if (members.some((m) => m.id === found.id)) {
                setError('User already added');
                setIsSearching(false);
                return;
            }
            setMembers((prev) => [...prev, { id: found.id, name: found.name, phoneNumber: found.phoneNumber }]);
            setPhoneInput('');
        }
        catch (err) {
            setError('Failed to find user');
        }
        finally {
            setIsSearching(false);
        }
    };
    const handleRemoveMember = (id) => {
        setMembers((prev) => prev.filter((m) => m.id !== id));
    };
    const handleCreate = async () => {
        if (!groupName.trim() || members.length < 2)
            return;
        setIsCreating(true);
        setError(null);
        try {
            const response = await api.post('/conversations/create', {
                participantUserIds: members.map((m) => m.id),
                isGroup: true,
                groupName: groupName.trim(),
            });
            onCreated(response.data);
        }
        catch (err) {
            setError('Failed to create group');
        }
        finally {
            setIsCreating(false);
        }
    };
    return (_jsx("div", { className: "fixed inset-0 bg-black/80 flex items-center justify-center z-50 px-4", children: _jsxs("div", { className: "bg-gray-900 rounded-2xl p-6 max-w-sm w-full max-h-[80vh] overflow-y-auto", children: [_jsxs("div", { className: "flex items-center justify-between mb-4", children: [_jsx("h3", { className: "text-white font-semibold", children: "New Group" }), _jsx("button", { onClick: onClose, className: "text-gray-400 hover:text-white", children: _jsx("svg", { xmlns: "http://www.w3.org/2000/svg", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", className: "w-5 h-5", children: _jsx("path", { d: "M18 6L6 18M6 6l12 12" }) }) })] }), _jsx("input", { type: "text", value: groupName, onChange: (e) => setGroupName(e.target.value), placeholder: "Group name", className: "w-full rounded-lg bg-white/5 border border-white/10 text-white placeholder-gray-500 px-3 py-2 text-sm mb-4 focus:outline-none focus:ring-2 ring-theme-primary" }), _jsxs("div", { className: "flex gap-2 mb-2", children: [_jsx("input", { type: "tel", value: phoneInput, onChange: (e) => setPhoneInput(e.target.value), placeholder: "Add member by phone number", className: "flex-1 rounded-lg bg-white/5 border border-white/10 text-white placeholder-gray-500 px-3 py-2 text-sm focus:outline-none focus:ring-2 ring-theme-primary" }), _jsx("button", { onClick: handleAddMember, disabled: isSearching || !phoneInput.trim(), className: "bg-theme-primary disabled:opacity-50 text-black text-sm font-medium px-3 rounded-lg", children: "Add" })] }), error && _jsx("p", { className: "text-red-400 text-xs mb-2", children: error }), members.length > 0 && (_jsxs("div", { className: "space-y-2 mb-4", children: [_jsxs("p", { className: "text-gray-400 text-xs", children: [members.length, " member", members.length !== 1 ? 's' : '', " added"] }), members.map((member) => (_jsxs("div", { className: "flex items-center justify-between bg-white/5 rounded-lg px-3 py-2", children: [_jsxs("div", { children: [_jsx("p", { className: "text-white text-sm", children: member.name }), _jsx("p", { className: "text-gray-500 text-xs", children: member.phoneNumber })] }), _jsx("button", { onClick: () => handleRemoveMember(member.id), className: "text-gray-500 hover:text-red-400 text-xs", children: "Remove" })] }, member.id)))] })), _jsx("button", { onClick: handleCreate, disabled: isCreating || !groupName.trim() || members.length < 2, className: "w-full bg-theme-primary disabled:opacity-40 text-black font-semibold py-2 rounded-lg text-sm", children: isCreating ? 'Creating...' : 'Create Group' }), members.length < 2 && (_jsx("p", { className: "text-gray-500 text-xs text-center mt-2", children: "Add at least 2 members to create a group" }))] }) }));
}
//# sourceMappingURL=CreateGroupModal.js.map