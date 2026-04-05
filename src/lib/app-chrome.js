import { createContext, useContext, useEffect } from 'react';

export const AppChromeContext = createContext(null);

export function useAppChrome(config) {
  const setScreenChrome = useContext(AppChromeContext);

  if (!setScreenChrome) {
    throw new Error('useAppChrome must be used within the app shell.');
  }

  useEffect(() => {
    setScreenChrome(config ?? null);

    return () => {
      setScreenChrome(null);
    };
  }, [config, setScreenChrome]);
}
