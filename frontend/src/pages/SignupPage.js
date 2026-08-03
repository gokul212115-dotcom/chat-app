import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { api } from '../lib/api';
import { useAuthStore } from '../store/authStore';
export default function SignupPage() {
    const [phoneNumber, setPhoneNumber] = useState('');
    const [name, setName] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [otpSent, setOtpSent] = useState(false);
    const [otpCode, setOtpCode] = useState('');
    const navigate = useNavigate();
    const login = useAuthStore((state) => state.login);
    const handleSendOtp = (e) => {
        e.preventDefault();
        setError(null);
        if (!phoneNumber || !name || !password) {
            setError('Please fill in all fields.');
            return;
        }
        if (password.length < 6) {
            setError('Password must be at least 6 characters.');
            return;
        }
        setOtpSent(true);
    };
    const handleVerifyOtp = async (e) => {
        e.preventDefault();
        setError(null);
        setIsLoading(true);
        try {
            const response = await api.post('/auth/signup', {
                phoneNumber,
                name,
                password,
            });
            const { user, accessToken, refreshToken } = response.data;
            login(user, accessToken, refreshToken);
            navigate('/');
        }
        catch (err) {
            setError(err.response?.data?.message || 'Signup failed. Please try again.');
            setOtpSent(false);
        }
        finally {
            setIsLoading(false);
        }
    };
    return (_jsxs("div", { className: "relative min-h-screen flex items-center justify-center bg-black overflow-hidden px-4", children: [_jsx("div", { className: "absolute inset-0 bg-grid" }), _jsx("div", { className: "absolute -top-32 -right-32 w-96 h-96 bg-teal-500/30 rounded-full blur-3xl animate-float" }), _jsx("div", { className: "absolute -bottom-32 -left-32 w-96 h-96 bg-emerald-500/30 rounded-full blur-3xl animate-floatSlow" }), _jsx("div", { className: "absolute top-1/4 left-1/4 w-64 h-64 bg-teal-400/20 rounded-full blur-3xl animate-glow" }), _jsxs("div", { className: "relative z-10 w-full max-w-sm bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl p-8 animate-fadeInUp", children: [_jsx("h1", { className: "text-2xl font-bold text-white mb-1", children: "Create account" }), _jsx("p", { className: "text-gray-400 mb-6 text-sm", children: "Join and start chatting" }), error && (_jsx("div", { className: "mb-4 text-sm text-red-300 bg-red-500/10 border border-red-500/30 rounded-lg px-3 py-2", children: error })), !otpSent && (_jsxs("form", { onSubmit: handleSendOtp, className: "space-y-4", children: [_jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium text-gray-300 mb-1", children: "Name" }), _jsx("input", { type: "text", value: name, onChange: (e) => setName(e.target.value), required: true, className: "w-full rounded-lg bg-white/5 border border-white/10 text-white placeholder-gray-500 px-3 py-2 focus:outline-none focus:ring-2 ring-theme-primary focus:border-transparent transition", placeholder: "Your name" })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium text-gray-300 mb-1", children: "Phone number" }), _jsx("input", { type: "tel", value: phoneNumber, onChange: (e) => setPhoneNumber(e.target.value), required: true, className: "w-full rounded-lg bg-white/5 border border-white/10 text-white placeholder-gray-500 px-3 py-2 focus:outline-none focus:ring-2 ring-theme-primary focus:border-transparent transition", placeholder: "+911234567890" })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium text-gray-300 mb-1", children: "Password" }), _jsx("input", { type: "password", value: password, onChange: (e) => setPassword(e.target.value), required: true, minLength: 6, className: "w-full rounded-lg bg-white/5 border border-white/10 text-white placeholder-gray-500 px-3 py-2 focus:outline-none focus:ring-2 ring-theme-primary focus:border-transparent transition", placeholder: "At least 6 characters" })] }), _jsx("button", { type: "submit", className: "w-full bg-theme-primary text-black font-semibold py-2 rounded-lg transition-all shadow-lg shadow-theme-primary", children: "Send OTP" })] })), otpSent && (_jsxs("form", { onSubmit: handleVerifyOtp, className: "space-y-4", children: [_jsxs("p", { className: "text-gray-400 text-sm text-center", children: ["OTP sent to ", _jsx("span", { className: "text-white", children: phoneNumber })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium text-gray-300 mb-1", children: "Enter OTP" }), _jsxs("div", { className: "relative w-full overflow-hidden rounded-lg bg-white/5 border border-white/10", children: [_jsx("input", { type: "text", inputMode: "numeric", maxLength: 6, value: otpCode, onChange: (e) => setOtpCode(e.target.value), required: true, className: "w-full bg-transparent text-white text-center tracking-widest text-lg px-3 py-2 focus:outline-none focus:ring-2 ring-theme-primary focus:border-transparent transition placeholder-transparent", placeholder: "Enter any 6 digits to create account", autoFocus: true }), !otpCode && (_jsx("div", { className: "absolute inset-0 flex items-center pointer-events-none overflow-hidden px-3", children: _jsx("span", { className: "text-gray-500 text-lg tracking-widest whitespace-nowrap animate-marquee", children: "Enter any 6 digits to create account \u00A0\u00A0\u00A0 Enter any 6 digits to create account \u00A0\u00A0\u00A0 Enter any 6 digits to create account" }) }))] })] }), _jsx("button", { type: "submit", disabled: isLoading || otpCode.length < 6, className: "w-full bg-theme-primary disabled:opacity-60 text-black font-semibold py-2 rounded-lg transition-all shadow-lg shadow-theme-primary", children: isLoading ? 'Creating account...' : 'Verify & Create Account' }), _jsx("button", { type: "button", onClick: () => { setOtpSent(false); setOtpCode(''); setError(null); }, className: "w-full text-gray-400 text-sm hover:text-white transition", children: "Change phone number" })] })), _jsxs("p", { className: "mt-6 text-sm text-center text-gray-400", children: ["Already have an account?", ' ', _jsx(Link, { to: "/login", className: "text-theme-primary font-medium hover:underline", children: "Log in" })] })] }), _jsx("style", { children: `
        @keyframes marquee {
          0% { transform: translateX(0%); }
          100% { transform: translateX(-33.333%); }
        }
        .animate-marquee {
          animation: marquee 8s linear infinite;
        }
      ` })] }));
}
//# sourceMappingURL=SignupPage.js.map