import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from './AuthContext';
import { getAccessToken } from '../api/client';

interface SocketContextValue {
  socket: Socket | null;
  onlineCount: number;
}

const SocketContext = createContext<SocketContextValue>({ socket: null, onlineCount: 0 });

export function SocketProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [socket, setSocket] = useState<Socket | null>(null);
  const [onlineCount, setOnlineCount] = useState(0);

  useEffect(() => {
    if (!user) {
      socket?.disconnect();
      setSocket(null);
      return;
    }

    const socketUrl = import.meta.env.VITE_SOCKET_URL || window.location.origin.replace('5173', '3001');
    const s = io(socketUrl, {
      auth: { token: getAccessToken() },
      transports: ['websocket'],
    });

    s.on('presence:update', ({ onlineCount }: { onlineCount: number }) => {
      setOnlineCount(onlineCount);
    });

    s.on('connect_error', (err) => {
      console.warn('[Socket] Connection error:', err.message);
    });

    setSocket(s);

    return () => {
      s.disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  return (
    <SocketContext.Provider value={{ socket, onlineCount }}>
      {children}
    </SocketContext.Provider>
  );
}

export function useSocket() {
  return useContext(SocketContext);
}
