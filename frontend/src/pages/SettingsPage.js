import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, uploadFile, getMediaUrl } from '../lib/api';
import { useAuthStore } from '../store/authStore';
import AvatarCropModal from '../components/AvatarCropModal';
import { useThemeStore } from '../store/themeStore';
import { THEME_COLORS } from '../lib/themeColors';
export default function SettingsPage() {
    const navigate = useNavigate();
    const user = useAuthStore((state) => state.user);
    const login = useAuthStore((state) => state.login);
    const accessToken = useAuthStore((state) => state.accessToken);
    const refreshToken = useAuthStore((state) => state.refreshToken);
    const logout = useAuthStore((state) => state.logout);
    const accentColor = useThemeStore((state) => state.accentColor);
    const setAccentColor = useThemeStore((state) => state.setAccentColor);
    const fileInputRef = useRef(null);
    const [name, setName] = useState(user?.name || '');
    const [statusMessage, setStatusMessage] = useState(user?.statusMessage || '');
    const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
    const [profileSaving, setProfileSaving] = useState(false);
    const [profileMessage, setProfileMessage] = useState(null);
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [passwordSaving, setPasswordSaving] = useState(false);
    const [passwordMessage, setPasswordMessage] = useState(null);
    const [cropImageSrc, setCropImageSrc] = useState(null);
    const handleAvatarClick = () => {
        fileInputRef.current?.click();
    };
    const handleAvatarChange = async (event) => {
        const file = event.target.files?.[0];
        if (!file)
            return;
        setIsUploadingAvatar(true);
        try {
            const uploaded = await uploadFile(file, file.name);
            const response = await api.put('/users/me', { avatarUrl: uploaded.url });
            if (user && accessToken && refreshToken) {
                login({ ...user, avatarUrl: response.data.avatarUrl }, accessToken, refreshToken);
            }
        }
        catch (err) {
            console.error('Failed to update avatar:', err);
        }
        finally {
            setIsUploadingAvatar(false);
            event.target.value = '';
        }
    };
    const handleSaveProfile = async () => {
        setProfileSaving(true);
        setProfileMessage(null);
        try {
            const response = await api.put('/users/me', { name, statusMessage });
            if (user && accessToken && refreshToken) {
                login({ ...user, name: response.data.name, statusMessage: response.data.statusMessage }, accessToken, refreshToken);
            }
            setProfileMessage('Profile updated successfully');
        }
        catch (err) {
            setProfileMessage('Failed to update profile');
        }
        finally {
            setProfileSaving(false);
        }
    };
    const handleChangePassword = async () => {
        setPasswordMessage(null);
        if (newPassword !== confirmPassword) {
            setPasswordMessage({ text: 'New passwords do not match', isError: true });
            return;
        }
        if (newPassword.length < 6) {
            setPasswordMessage({ text: 'New password must be at least 6 characters', isError: true });
            return;
        }
        setPasswordSaving(true);
        try {
            await api.post('/auth/change-password', { currentPassword, newPassword });
            setPasswordMessage({ text: 'Password updated successfully', isError: false });
            setCurrentPassword('');
            setNewPassword('');
            setConfirmPassword('');
        }
        catch (err) {
            setPasswordMessage({
                text: err.response?.data?.message || 'Failed to update password',
                isError: true,
            });
        }
        finally {
            setPasswordSaving(false);
        }
    };
    const handleLogout = () => {
        logout();
        navigate('/login');
    };
    const handleCropCancel = () => setCropImageSrc(null);
    const handleCropConfirm = () => setCropImageSrc(null);
    return (_jsxs("div", { className: "min-h-screen bg-black text-white", children: [_jsxs("div", { className: "max-w-lg mx-auto px-6 py-6", children: [_jsxs("div", { className: "flex items-center gap-4 mb-8", children: [_jsx("button", { onClick: () => navigate(-1), className: "text-gray-400 hover:text-white", children: _jsx("svg", { xmlns: "http://www.w3.org/2000/svg", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", className: "w-6 h-6", children: _jsx("path", { d: "M19 12H5M12 19l-7-7 7-7" }) }) }), _jsx("h1", { className: "text-xl font-semibold", children: "Settings" })] }), _jsxs("div", { className: "bg-white/5 border border-white/10 rounded-2xl p-6 mb-6", children: [_jsx("h2", { className: "text-sm font-medium text-gray-400 mb-4", children: "Profile" }), _jsxs("div", { className: "flex items-center gap-4 mb-6", children: [_jsxs("button", { onClick: handleAvatarClick, className: "relative", children: [_jsx("div", { className: "w-16 h-16 rounded-full bg-theme-primary flex items-center justify-center text-white text-xl font-semibold overflow-hidden", children: user?.avatarUrl ? (_jsx("img", { src: getMediaUrl(user.avatarUrl), className: "w-full h-full object-cover", alt: "avatar" })) : (user?.name?.charAt(0).toUpperCase()) }), isUploadingAvatar && (_jsx("div", { className: "absolute inset-0 bg-black/50 rounded-full flex items-center justify-center text-xs", children: "..." }))] }), _jsx("div", { children: _jsx("p", { className: "text-sm text-gray-400", children: "Click avatar to change photo" }) }), _jsx("input", { ref: fileInputRef, type: "file", accept: "image/*", onChange: handleAvatarChange, className: "hidden" })] }), _jsxs("div", { className: "space-y-4", children: [_jsxs("div", { children: [_jsx("label", { className: "block text-sm text-gray-400 mb-1", children: "Name" }), _jsx("input", { type: "text", value: name, onChange: (e) => setName(e.target.value), className: "w-full rounded-lg bg-white/5 border border-white/10 text-white px-3 py-2 text-sm focus:outline-none focus:ring-2 ring-theme-primary" })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-sm text-gray-400 mb-1", children: "Status Message" }), _jsx("input", { type: "text", value: statusMessage, onChange: (e) => setStatusMessage(e.target.value), className: "w-full rounded-lg bg-white/5 border border-white/10 text-white px-3 py-2 text-sm focus:outline-none focus:ring-2 ring-theme-primary" })] }), profileMessage && (_jsx("p", { className: "text-xs text-theme-primary", children: profileMessage })), _jsx("button", { onClick: handleSaveProfile, disabled: profileSaving, className: "bg-theme-primary disabled:opacity-60 text-black font-medium px-4 py-2 rounded-lg text-sm", children: profileSaving ? 'Saving...' : 'Save Profile' })] })] }), _jsxs("div", { className: "bg-white/5 border border-white/10 rounded-2xl p-6 mb-6", children: [_jsx("h2", { className: "text-sm font-medium text-gray-400 mb-4", children: "Account" }), _jsxs("div", { children: [_jsx("label", { className: "block text-sm text-gray-400 mb-1", children: "Phone Number" }), _jsx("p", { className: "text-white text-sm", children: user?.phoneNumber })] })] }), _jsxs("div", { className: "bg-white/5 border border-white/10 rounded-2xl p-6 mb-6", children: [_jsx("h2", { className: "text-sm font-medium text-gray-400 mb-4", children: "Security" }), _jsxs("div", { className: "space-y-4", children: [_jsxs("div", { children: [_jsx("label", { className: "block text-sm text-gray-400 mb-1", children: "Current Password" }), _jsx("input", { type: "password", value: currentPassword, onChange: (e) => setCurrentPassword(e.target.value), className: "w-full rounded-lg bg-white/5 border border-white/10 text-white px-3 py-2 text-sm focus:outline-none focus:ring-2 ring-theme-primary" })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-sm text-gray-400 mb-1", children: "New Password" }), _jsx("input", { type: "password", value: newPassword, onChange: (e) => setNewPassword(e.target.value), className: "w-full rounded-lg bg-white/5 border border-white/10 text-white px-3 py-2 text-sm focus:outline-none focus:ring-2 ring-theme-primary" })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-sm text-gray-400 mb-1", children: "Confirm New Password" }), _jsx("input", { type: "password", value: confirmPassword, onChange: (e) => setConfirmPassword(e.target.value), className: "w-full rounded-lg bg-white/5 border border-white/10 text-white px-3 py-2 text-sm focus:outline-none focus:ring-2 ring-theme-primary" })] }), passwordMessage && (_jsx("p", { className: `text-xs ${passwordMessage.isError ? 'text-red-400' : 'text-theme-primary'}`, children: passwordMessage.text })), _jsx("button", { onClick: handleChangePassword, disabled: passwordSaving || !currentPassword || !newPassword || !confirmPassword, className: "bg-theme-primary disabled:opacity-60 text-black font-medium px-4 py-2 rounded-lg text-sm", children: passwordSaving ? 'Updating...' : 'Change Password' })] })] }), _jsxs("div", { className: "bg-white/5 border border-white/10 rounded-2xl p-6 mb-6", children: [_jsx("h2", { className: "text-sm font-medium text-gray-400 mb-4", children: "Appearance" }), _jsx("p", { className: "text-sm text-gray-400 mb-3", children: "Accent Color" }), _jsx("div", { className: "flex gap-3", children: Object.entries(THEME_COLORS).map(([key, colors]) => (_jsxs("button", { onClick: () => setAccentColor(key), className: "flex flex-col items-center gap-1.5", title: colors.label, children: [_jsx("span", { className: "w-9 h-9 rounded-full border-2 transition-all", style: {
                                                backgroundColor: colors.primary,
                                                borderColor: accentColor === key ? "#ffffff" : "transparent",
                                            } }), _jsx("span", { className: "text-[10px] text-gray-500", children: colors.label })] }, key))) })] }), _jsx("button", { onClick: handleLogout, className: "w-full bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-400 font-medium py-3 rounded-xl text-sm", children: "Log Out" })] }), cropImageSrc && (_jsx(AvatarCropModal, { imageSrc: cropImageSrc, onCancel: handleCropCancel, onConfirm: handleCropConfirm }))] }));
}
//# sourceMappingURL=SettingsPage.js.map