import { useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';
import { useAuthStore } from '../store/authStore';
let socketInstance = null;
export function useSocket() {
    const accessToken = useAuthStore((state) => state.accessToken);
    const [, bump] = useState(0);
    const ref = useRef(socketInstance);
    useEffect(() => {
        if (!accessToken) {
            if (socketInstance) {
                socketInstance.disconnect();
                socketInstance = null;
                ref.current = null;
                bump((n) => n + 1);
            }
            return;
        }
        if (!socketInstance) {
            const url = import.meta.env.VITE_SOCKET_URL || 'http://localhost:3000';
            socketInstance = io(url, { auth: { token: accessToken } });
        }
        ref.current = socketInstance;
        bump((n) => n + 1);
    }, [accessToken]);
    return ref.current;
}
//# sourceMappingURL=useSocket.js.map