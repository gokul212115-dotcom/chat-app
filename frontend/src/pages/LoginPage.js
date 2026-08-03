import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { api } from '../lib/api';
import { useAuthStore } from '../store/authStore';
export default function LoginPage() {
    const [phoneNumber, setPhoneNumber] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const navigate = useNavigate();
    const login = useAuthStore((state) => state.login);
    const handleSubmit = async (e) => {
        e.preventDefault();
        setError(null);
        setIsLoading(true);
        try {
            const response = await api.post('/auth/login', {
                phoneNumber,
                password,
            });
            const { user, accessToken, refreshToken } = response.data;
            login(user, accessToken, refreshToken);
            navigate('/');
        }
        catch (err) {
            setError(err.response?.data?.message || 'Login failed. Please try again.');
        }
        finally {
            setIsLoading(false);
        }
    };
    return (_jsxs("div", { className: "relative min-h-screen flex items-center justify-center bg-black overflow-hidden px-4", children: [_jsx("div", { className: "absolute inset-0 bg-grid" }), _jsx("div", { className: "absolute -top-32 -left-32 w-96 h-96 bg-emerald-500/30 rounded-full blur-3xl animate-float" }), _jsx("div", { className: "absolute -bottom-32 -right-32 w-96 h-96 bg-teal-500/30 rounded-full blur-3xl animate-floatSlow" }), _jsx("div", { className: "absolute top-1/3 right-1/4 w-64 h-64 bg-emerald-400/20 rounded-full blur-3xl animate-glow" }), _jsxs("div", { className: "relative z-10 w-full max-w-sm bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl p-8 animate-fadeInUp", children: [_jsx("h1", { className: "text-2xl font-bold text-white mb-1", children: "Welcome back" }), _jsx("p", { className: "text-gray-400 mb-6 text-sm", children: "Log in to continue chatting" }), error && (_jsx("div", { className: "mb-4 text-sm text-red-300 bg-red-500/10 border border-red-500/30 rounded-lg px-3 py-2", children: error })), _jsxs("form", { onSubmit: handleSubmit, className: "space-y-4", children: [_jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium text-gray-300 mb-1", children: "Phone number" }), _jsx("input", { type: "tel", value: phoneNumber, onChange: (e) => setPhoneNumber(e.target.value), required: true, className: "w-full rounded-lg bg-white/5 border border-white/10 text-white placeholder-gray-500 px-3 py-2 focus:outline-none focus:ring-2 ring-theme-primary focus:border-transparent transition", placeholder: "+911234567890" })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium text-gray-300 mb-1", children: "Password" }), _jsx("input", { type: "password", value: password, onChange: (e) => setPassword(e.target.value), required: true, className: "w-full rounded-lg bg-white/5 border border-white/10 text-white placeholder-gray-500 px-3 py-2 focus:outline-none focus:ring-2 ring-theme-primary focus:border-transparent transition", placeholder: "\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022" })] }), _jsx("button", { type: "submit", disabled: isLoading, className: "w-full bg-theme-primary disabled:opacity-60 text-black font-semibold py-2 rounded-lg transition-all shadow-lg shadow-theme-primary", children: isLoading ? 'Logging in...' : 'Log in' })] }), _jsxs("p", { className: "mt-6 text-sm text-center text-gray-400", children: ["Don't have an account?", ' ', _jsx(Link, { to: "/signup", className: "text-theme-primary font-medium hover:underline", children: "Sign up" })] })] })] }));
}
//# sourceMappingURL=LoginPage.js.map