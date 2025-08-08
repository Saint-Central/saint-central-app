import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { usePathname, useRouter } from 'expo-router';

interface NavigationHistoryContextType {
  history: string[];
  canGoBack: boolean;
  goBack: () => void;
  clearHistory: () => void;
}

const NavigationHistoryContext = createContext<NavigationHistoryContextType | undefined>(undefined);

export function NavigationHistoryProvider({ children }: { children: ReactNode }) {
  const [history, setHistory] = useState<string[]>([]);
  const pathname = usePathname();
  const router = useRouter();

  // Track route changes
  useEffect(() => {
    if (pathname) {
      setHistory((prev) => {
        // Don't add duplicate consecutive entries
        if (prev[prev.length - 1] === pathname) {
          return prev;
        }
        // Keep only last 50 entries to prevent memory issues
        const newHistory = [...prev, pathname];
        if (newHistory.length > 50) {
          return newHistory.slice(-50);
        }
        return newHistory;
      });
    }
  }, [pathname]);

  const goBack = () => {
    if (history.length > 1) {
      // Remove current route
      const newHistory = history.slice(0, -1);
      const previousRoute = newHistory[newHistory.length - 1];
      
      // Update history to remove both current and where we're going
      // to prevent duplicate when the route change is detected
      setHistory(newHistory.slice(0, -1));
      
      // Navigate to previous route
      router.push(previousRoute as any);
    } else {
      // If no history, go to home
      router.push('/home');
    }
  };

  const clearHistory = () => {
    setHistory([]);
  };

  const canGoBack = history.length > 1;

  return (
    <NavigationHistoryContext.Provider value={{ history, canGoBack, goBack, clearHistory }}>
      {children}
    </NavigationHistoryContext.Provider>
  );
}

export function useNavigationHistory() {
  const context = useContext(NavigationHistoryContext);
  if (!context) {
    throw new Error('useNavigationHistory must be used within NavigationHistoryProvider');
  }
  return context;
}