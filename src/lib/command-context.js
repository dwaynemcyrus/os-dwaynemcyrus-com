import { createContext, useContext } from 'react';

export const CommandContext = createContext(null);

export function useCommandContext() {
  const context = useContext(CommandContext);

  if (!context) {
    throw new Error('useCommandContext must be used within the command sheet.');
  }

  return context;
}
