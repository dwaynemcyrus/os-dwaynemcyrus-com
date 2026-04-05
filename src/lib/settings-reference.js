export const KEYBOARD_SHORTCUTS = [
  {
    description: 'Switch the command-sheet query into slash-command matching.',
    keys: '/',
  },
  {
    description: 'Capture the current command-sheet input to inbox.',
    keys: 'Enter',
  },
  {
    description: 'Insert a newline in the command-sheet input.',
    keys: 'Shift + Enter',
  },
  {
    description:
      'Close the command sheet. If unsaved input is present, it captures first.',
    keys: 'Escape',
  },
  {
    description: 'Save the current editor draft explicitly.',
    keys: 'Cmd/Ctrl + S',
  },
  {
    description: 'Trigger wikilink autocomplete in the editor.',
    keys: '[[',
  },
  {
    description: 'Trigger tag autocomplete in the editor.',
    keys: '#',
  },
];

export function formatSlashCommandMeta(slashCommand) {
  if (!slashCommand.template) {
    return 'Create a matching template first';
  }

  const metaParts = [];

  if (slashCommand.template.type) {
    metaParts.push(slashCommand.template.type);
  }

  if (slashCommand.template.subtype) {
    metaParts.push(slashCommand.template.subtype.replaceAll('_', ' '));
  }

  return metaParts.join(' · ');
}
