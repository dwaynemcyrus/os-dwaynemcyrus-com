import { supabase } from './supabase';

export const DEFAULT_TEMPLATE_FOLDER = 'template';
export const DEFAULT_TEMPLATE_DATE_FORMAT = 'YYYY-MM-DD';
export const DEFAULT_TEMPLATE_TIME_FORMAT = 'HH:mm:ss';

function buildUserSettingsFieldsQuery() {
  return 'daily_template_id,template_folder,template_date_format,template_time_format';
}

function normalizeOptionalText(value) {
  const normalizedValue = String(value ?? '').trim();

  return normalizedValue || '';
}

function normalizeTemplateFormat(value, fallbackValue) {
  return normalizeOptionalText(value) || fallbackValue;
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

export async function fetchDailyTemplateSettings({ userId }) {
  const [
    settingsRow,
    { data: templateItems, error: templatesError },
  ] = await Promise.all([
    fetchUserSettingsRow(userId),
    supabase
      .from('items')
      .select('id,title,subtype,date_modified')
      .eq('user_id', userId)
      .eq('is_template', true)
      .eq('subtype', 'daily')
      .is('date_trashed', null),
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

  return {
    options: sortedTemplateItems.map((templateItem) => ({
      id: templateItem.id,
      label: formatDailyTemplateOptionLabel(templateItem),
      title: templateItem.title?.trim() || 'Daily',
    })),
    selectedTemplateId,
  };
}

export async function saveDailyTemplatePreference({
  dailyTemplateId,
  userId,
}) {
  const { data: templateItem, error: templateError } = await supabase
    .from('items')
    .select('id')
    .eq('id', dailyTemplateId)
    .eq('user_id', userId)
    .eq('is_template', true)
    .eq('subtype', 'daily')
    .is('date_trashed', null)
    .single();

  if (templateError) {
    throw templateError;
  }

  const { data, error } = await supabase
    .from('user_settings')
    .upsert(
      {
        daily_template_id: templateItem.id,
        user_id: userId,
      },
      {
        onConflict: 'user_id',
      },
    )
    .select('daily_template_id')
    .single();

  if (error) {
    throw error;
  }

  return data.daily_template_id;
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
  const { selectedTemplateId } = await fetchDailyTemplateSettings({ userId });

  if (!selectedTemplateId) {
    throw new Error('No daily template has been selected yet.');
  }

  return selectedTemplateId;
}
