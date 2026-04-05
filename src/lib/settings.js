import { supabase } from './supabase';

export const DEFAULT_DAILY_NOTE_FOLDER = '';
export const DEFAULT_TEMPLATE_FOLDER = 'template';
export const DEFAULT_TEMPLATE_DATE_FORMAT = 'YYYY-MM-DD';
export const DEFAULT_TEMPLATE_TIME_FORMAT = 'HH:mm:ss';
const MISSING_DAILY_TEMPLATE_ERROR_MESSAGE =
  'No daily template has been selected yet.';

function buildUserSettingsFieldsQuery() {
  return 'daily_template_id,daily_note_folder,template_folder,template_date_format,template_time_format';
}

function normalizeOptionalText(value) {
  const normalizedValue = String(value ?? '').trim();

  return normalizedValue || '';
}

function normalizeTemplateFormat(value, fallbackValue) {
  return normalizeOptionalText(value) || fallbackValue;
}

function normalizeDailyNoteFolder(value) {
  return normalizeOptionalText(value);
}

function buildSortedFolderOptions(folderRows) {
  return [...new Set(
    (folderRows ?? [])
      .map((row) => normalizeOptionalText(row.folder))
      .filter(Boolean),
  )].sort((leftFolder, rightFolder) =>
    leftFolder.localeCompare(rightFolder, undefined, { sensitivity: 'base' }),
  );
}

function ensureFolderOptionIncluded(folderOptions, folderValue) {
  const normalizedFolderValue = normalizeDailyNoteFolder(folderValue);

  if (!normalizedFolderValue || folderOptions.includes(normalizedFolderValue)) {
    return folderOptions;
  }

  return [...folderOptions, normalizedFolderValue].sort((leftFolder, rightFolder) =>
    leftFolder.localeCompare(rightFolder, undefined, { sensitivity: 'base' }),
  );
}

async function fetchUserSettingsRow(userId) {
  const { data, error } = await supabase
    .from('user_settings')
    .select(buildUserSettingsFieldsQuery())
    .eq('user_id', userId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data ?? null;
}

function buildDailyTemplateLookupQuery(userId) {
  return supabase
    .from('items')
    .select('id')
    .eq('user_id', userId)
    .eq('is_template', true)
    .eq('subtype', 'daily')
    .is('date_trashed', null);
}

async function resolvePersistedDailyTemplateId({ userId }) {
  const settingsRow = await fetchUserSettingsRow(userId);
  const selectedTemplateId = normalizeOptionalText(settingsRow?.daily_template_id);

  if (!selectedTemplateId) {
    throw new Error(MISSING_DAILY_TEMPLATE_ERROR_MESSAGE);
  }

  const { data: templateItem, error: templateError } =
    await buildDailyTemplateLookupQuery(userId)
      .eq('id', selectedTemplateId)
      .maybeSingle();

  if (templateError) {
    throw templateError;
  }

  if (!templateItem?.id) {
    throw new Error(MISSING_DAILY_TEMPLATE_ERROR_MESSAGE);
  }

  return {
    dailyNoteFolder: normalizeDailyNoteFolder(settingsRow?.daily_note_folder),
    dailyTemplateId: templateItem.id,
  };
}

function sortDailyTemplateItems(leftItem, rightItem) {
  const titleComparison = String(leftItem.title ?? '').localeCompare(
    String(rightItem.title ?? ''),
  );

  if (titleComparison !== 0) {
    return titleComparison;
  }

  return String(rightItem.date_modified ?? '').localeCompare(
    String(leftItem.date_modified ?? ''),
  );
}

function formatDailyTemplateOptionLabel(templateItem) {
  return templateItem.title?.trim() || 'Daily';
}

async function fetchAvailableFolderOptions({ userId }) {
  const { data, error } = await supabase
    .from('items')
    .select('folder')
    .eq('user_id', userId)
    .is('date_trashed', null)
    .not('folder', 'is', null);

  if (error) {
    throw error;
  }

  return buildSortedFolderOptions(data);
}

async function resolveSelectedDailyTemplateId({ dailyTemplateId, userId }) {
  const normalizedTemplateId = normalizeOptionalText(dailyTemplateId);

  if (!normalizedTemplateId) {
    return '';
  }

  const { data: templateItem, error: templateError } = await supabase
    .from('items')
    .select('id')
    .eq('id', normalizedTemplateId)
    .eq('user_id', userId)
    .eq('is_template', true)
    .eq('subtype', 'daily')
    .is('date_trashed', null)
    .single();

  if (templateError) {
    throw templateError;
  }

  return templateItem.id;
}

export async function fetchDailyNoteSettings({ userId }) {
  const [
    settingsRow,
    { data: templateItems, error: templatesError },
    folderOptions,
  ] = await Promise.all([
    fetchUserSettingsRow(userId),
    supabase
      .from('items')
      .select('id,title,subtype,date_modified')
      .eq('user_id', userId)
      .eq('is_template', true)
      .eq('subtype', 'daily')
      .is('date_trashed', null),
    fetchAvailableFolderOptions({ userId }),
  ]);

  if (templatesError) {
    throw templatesError;
  }

  const sortedTemplateItems = [...(templateItems ?? [])].sort(sortDailyTemplateItems);
  const selectedTemplateId = sortedTemplateItems.some(
    (item) => item.id === settingsRow?.daily_template_id,
  )
    ? settingsRow.daily_template_id
    : '';
  const dailyNoteFolder = normalizeDailyNoteFolder(settingsRow?.daily_note_folder);

  return {
    folder: dailyNoteFolder,
    folderOptions: ensureFolderOptionIncluded(folderOptions, dailyNoteFolder),
    options: sortedTemplateItems.map((templateItem) => ({
      id: templateItem.id,
      label: formatDailyTemplateOptionLabel(templateItem),
      title: templateItem.title?.trim() || 'Daily',
    })),
    selectedTemplateId,
  };
}

export async function saveDailyNoteSettings({
  dailyNoteFolder,
  dailyTemplateId,
  userId,
}) {
  const selectedTemplateId = await resolveSelectedDailyTemplateId({
    dailyTemplateId,
    userId,
  });
  const normalizedDailyNoteFolder = normalizeDailyNoteFolder(dailyNoteFolder);

  const { data, error } = await supabase
    .from('user_settings')
    .upsert(
      {
        daily_note_folder: normalizedDailyNoteFolder || null,
        daily_template_id: selectedTemplateId || null,
        user_id: userId,
      },
      {
        onConflict: 'user_id',
      },
    )
    .select('daily_note_folder,daily_template_id')
    .single();

  if (error) {
    throw error;
  }

  return {
    folder: normalizeDailyNoteFolder(data.daily_note_folder),
    selectedTemplateId: data.daily_template_id ?? '',
  };
}

export async function bulkUpdateDailyNoteFolders({
  dailyNoteFolder,
  userId,
}) {
  const normalizedDailyNoteFolder = normalizeDailyNoteFolder(dailyNoteFolder);
  const { data, error } = await supabase
    .from('items')
    .update({
      folder: normalizedDailyNoteFolder || null,
    })
    .eq('user_id', userId)
    .eq('is_template', false)
    .eq('type', 'journal')
    .eq('subtype', 'daily')
    .is('date_trashed', null)
    .select('id');

  if (error) {
    throw error;
  }

  return {
    folder: normalizedDailyNoteFolder,
    updatedCount: data?.length ?? 0,
  };
}

export async function fetchDailyTemplateSettings({ userId }) {
  const { options, selectedTemplateId } = await fetchDailyNoteSettings({ userId });

  return {
    options,
    selectedTemplateId,
  };
}

export async function saveDailyTemplatePreference({
  dailyTemplateId,
  userId,
}) {
  const { selectedTemplateId } = await saveDailyNoteSettings({
    dailyTemplateId,
    userId,
  });

  return selectedTemplateId;
}

export async function fetchTemplateSettings({ userId }) {
  const settingsRow = await fetchUserSettingsRow(userId);

  return {
    folder: normalizeTemplateFormat(
      settingsRow?.template_folder,
      DEFAULT_TEMPLATE_FOLDER,
    ),
    dateFormat: normalizeTemplateFormat(
      settingsRow?.template_date_format,
      DEFAULT_TEMPLATE_DATE_FORMAT,
    ),
    timeFormat: normalizeTemplateFormat(
      settingsRow?.template_time_format,
      DEFAULT_TEMPLATE_TIME_FORMAT,
    ),
  };
}

export async function saveTemplateSettings({
  dateFormat,
  folder,
  timeFormat,
  userId,
}) {
  const normalizedFolder = normalizeTemplateFormat(
    folder,
    DEFAULT_TEMPLATE_FOLDER,
  );
  const normalizedDateFormat = normalizeTemplateFormat(
    dateFormat,
    DEFAULT_TEMPLATE_DATE_FORMAT,
  );
  const normalizedTimeFormat = normalizeTemplateFormat(
    timeFormat,
    DEFAULT_TEMPLATE_TIME_FORMAT,
  );
  const { data, error } = await supabase
    .from('user_settings')
    .upsert(
      {
        template_date_format: normalizedDateFormat,
        template_folder: normalizedFolder,
        template_time_format: normalizedTimeFormat,
        user_id: userId,
      },
      {
        onConflict: 'user_id',
      },
    )
    .select('template_folder,template_date_format,template_time_format')
    .single();

  if (error) {
    throw error;
  }

  return {
    folder: normalizeTemplateFormat(
      data.template_folder,
      DEFAULT_TEMPLATE_FOLDER,
    ),
    dateFormat: normalizeTemplateFormat(
      data.template_date_format,
      DEFAULT_TEMPLATE_DATE_FORMAT,
    ),
    timeFormat: normalizeTemplateFormat(
      data.template_time_format,
      DEFAULT_TEMPLATE_TIME_FORMAT,
    ),
  };
}

export async function fetchResolvedDailyTemplateId({ userId }) {
  const { dailyTemplateId } = await resolvePersistedDailyTemplateId({ userId });

  return dailyTemplateId;
}

export async function fetchResolvedDailyNotePreferences({ userId }) {
  return resolvePersistedDailyTemplateId({ userId });
}
