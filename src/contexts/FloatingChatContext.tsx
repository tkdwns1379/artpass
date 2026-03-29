import { createContext, useContext, useRef, useState } from 'react';

export interface FloatingRoom {
  id: string;
  name: string;
}

interface FloatingChatCtxType {
  floatingRoom: FloatingRoom | null;
  isMinimized: boolean;
  minimizingRef: React.MutableRefObject<boolean>;
  setFloatingRoom: (room: FloatingRoom | null) => void;
  minimize: () => void;
  expand: () => void;
  closeFloating: () => void;
}

const FloatingChatCtx = createContext<FloatingChatCtxType>(null!);

export function FloatingChatProvider({ children }: { children: React.ReactNode }) {
  const [floatingRoom, setFloatingRoom] = useState<FloatingRoom | null>(null);
  const [isMinimized, setIsMinimized] = useState(false);
  const minimizingRef = useRef(false);

  const minimize = () => {
    minimizingRef.current = true;
    setIsMinimized(true);
  };

  const expand = () => {
    setIsMinimized(false);
  };

  const closeFloating = () => {
    setFloatingRoom(null);
    setIsMinimized(false);
  };

  return (
    <FloatingChatCtx.Provider value={{
      floatingRoom, isMinimized, minimizingRef,
      setFloatingRoom, minimize, expand, closeFloating,
    }}>
      {children}
    </FloatingChatCtx.Provider>
  );
}

export function useFloatingChat() {
  return useContext(FloatingChatCtx);
}
