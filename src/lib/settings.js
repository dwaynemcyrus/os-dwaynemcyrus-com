import { supabase } from './supabase';

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
    { data: settingsRow, error: settingsError },
    { data: templateItems, error: templatesError },
  ] = await Promise.all([
    supabase
      .from('user_settings')
      .select('daily_template_id')
      .eq('user_id', userId)
      .maybeSingle(),
    supabase
      .from('items')
      .select('id,title,subtype,date_modified')
      .eq('user_id', userId)
      .eq('is_template', true)
      .eq('subtype', 'daily')
      .is('date_trashed', null),
  ]);

  if (settingsError) {
    throw settingsError;
  }

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

export async function fetchResolvedDailyTemplateId({ userId }) {
  const { selectedTemplateId } = await fetchDailyTemplateSettings({ userId });

  if (!selectedTemplateId) {
    throw new Error('No daily template has been selected yet.');
  }

  return selectedTemplateId;
}
