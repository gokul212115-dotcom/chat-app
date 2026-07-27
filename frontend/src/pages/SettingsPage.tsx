import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, uploadFile, getMediaUrl } from '../lib/api';
import { useAuthStore } from '../store/authStore';

export default function SettingsPage() {
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const login = useAuthStore((state) => state.login);
  const accessToken = useAuthStore((state) => state.accessToken);
  const refreshToken = useAuthStore((state) => state.refreshToken);
  const logout = useAuthStore((state) => state.logout);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const [name, setName] = useState(user?.name || '');
  const [statusMessage, setStatusMessage] = useState(user?.statusMessage || '');
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileMessage, setProfileMessage] = useState<string | null>(null);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState<{ text: string; isError: boolean } | null>(null);

  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  const handleAvatarChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsUploadingAvatar(true);
    try {
      const uploaded = await uploadFile(file, file.name);
      const response = await api.patch('/users/me', { avatarUrl: uploaded.url });
      if (user && accessToken && refreshToken) {
        login({ ...user, avatarUrl: response.data.avatarUrl }, accessToken, refreshToken);
      }
    } catch (err) {
      console.error('Failed to update avatar:', err);
    } finally {
      setIsUploadingAvatar(false);
      event.target.value = '';
    }
  };

  const handleSaveProfile = async () => {
    setProfileSaving(true);
    setProfileMessage(null);
    try {
      const response = await api.patch('/users/me', { name, statusMessage });
      if (user && accessToken && refreshToken) {
        login({ ...user, name: response.data.name, statusMessage: response.data.statusMessage }, accessToken, refreshToken);
      }
      setProfileMessage('Profile updated successfully');
    } catch (err) {
      setProfileMessage('Failed to update profile');
    } finally {
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
    } catch (err: any) {
      setPasswordMessage({
        text: err.response?.data?.message || 'Failed to update password',
        isError: true,
      });
    } finally {
      setPasswordSaving(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="max-w-lg mx-auto px-6 py-6">
        <div className="flex items-center gap-4 mb-8">
          <button onClick={() => navigate(-1)} className="text-gray-400 hover:text-white">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6">
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
          </button>
          <h1 className="text-xl font-semibold">Settings</h1>
        </div>

        <div className="bg-white/5 border border-white/10 rounded-2xl p-6 mb-6">
          <h2 className="text-sm font-medium text-gray-400 mb-4">Profile</h2>

          <div className="flex items-center gap-4 mb-6">
            <button onClick={handleAvatarClick} className="relative">
              <div className="w-16 h-16 rounded-full bg-emerald-600 flex items-center justify-center text-white text-xl font-semibold overflow-hidden">
                {user?.avatarUrl ? (
                  <img src={getMediaUrl(user.avatarUrl)} className="w-full h-full object-cover" alt="avatar" />
                ) : (
                  user?.name?.charAt(0).toUpperCase()
                )}
              </div>
              {isUploadingAvatar && (
                <div className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center text-xs">
                  ...
                </div>
              )}
            </button>
            <div>
              <p className="text-sm text-gray-400">Click avatar to change photo</p>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleAvatarChange}
              className="hidden"
            />
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm text-gray-400 mb-1">Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full rounded-lg bg-white/5 border border-white/10 text-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Status Message</label>
              <input
                type="text"
                value={statusMessage}
                onChange={(e) => setStatusMessage(e.target.value)}
                className="w-full rounded-lg bg-white/5 border border-white/10 text-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            {profileMessage && (
              <p className="text-xs text-emerald-400">{profileMessage}</p>
            )}
            <button
              onClick={handleSaveProfile}
              disabled={profileSaving}
              className="bg-emerald-500 hover:bg-emerald-400 disabled:opacity-60 text-black font-medium px-4 py-2 rounded-lg text-sm"
            >
              {profileSaving ? 'Saving...' : 'Save Profile'}
            </button>
          </div>
        </div>

        <div className="bg-white/5 border border-white/10 rounded-2xl p-6 mb-6">
          <h2 className="text-sm font-medium text-gray-400 mb-4">Account</h2>
          <div>
            <label className="block text-sm text-gray-400 mb-1">Phone Number</label>
            <p className="text-white text-sm">{user?.phoneNumber}</p>
          </div>
        </div>

        <div className="bg-white/5 border border-white/10 rounded-2xl p-6 mb-6">
          <h2 className="text-sm font-medium text-gray-400 mb-4">Security</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm text-gray-400 mb-1">Current Password</label>
              <input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="w-full rounded-lg bg-white/5 border border-white/10 text-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">New Password</label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full rounded-lg bg-white/5 border border-white/10 text-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Confirm New Password</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full rounded-lg bg-white/5 border border-white/10 text-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            {passwordMessage && (
              <p className={`text-xs ${passwordMessage.isError ? 'text-red-400' : 'text-emerald-400'}`}>
                {passwordMessage.text}
              </p>
            )}
            <button
              onClick={handleChangePassword}
              disabled={passwordSaving || !currentPassword || !newPassword || !confirmPassword}
              className="bg-emerald-500 hover:bg-emerald-400 disabled:opacity-60 text-black font-medium px-4 py-2 rounded-lg text-sm"
            >
              {passwordSaving ? 'Updating...' : 'Change Password'}
            </button>
          </div>
        </div>

        <button
          onClick={handleLogout}
          className="w-full bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-400 font-medium py-3 rounded-xl text-sm"
        >
          Log Out
        </button>
      </div>
    </div>
  );
}
