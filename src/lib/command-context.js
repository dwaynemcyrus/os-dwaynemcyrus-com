import { createContext, useContext, useEffect } from 'react';

export const CommandContext = createContext(null);

export function useCommandContext() {
  const context = useContext(CommandContext);

  if (!context) {
    throw new Error('useCommandContext must be used within the command sheet.');
  }

  return context;
}

export function useRegisterCommands(commands) {
  const { registerCommands, unregisterCommands } = useCommandContext();

  useEffect(() => {
    if (commands.length === 0) {
      return;
    }

    registerCommands(commands);

    const ids = commands.map((c) => c.id);

    return () => {
      unregisterCommands(ids);
    };
  }, [commands, registerCommands, unregisterCommands]);
}
