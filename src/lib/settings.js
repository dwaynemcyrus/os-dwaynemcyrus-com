import { supabase } from './supabase';

function sortDailyTemplateItems(leftItem, rightItem) {
  const leftIsSystemTemplate = leftItem.user_id == null;
  const rightIsSystemTemplate = rightItem.user_id == null;

  if (leftIsSystemTemplate !== rightIsSystemTemplate) {
    return leftIsSystemTemplate ? -1 : 1;
  }

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
  const title = templateItem.title?.trim() || 'Daily';
  const sourceLabel = templateItem.user_id == null ? 'System' : 'Your Template';

  return `${sourceLabel} · ${title}`;
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
      .select('id,user_id,title,subtype,date_modified')
      .eq('is_template', true)
      .eq('subtype', 'daily')
      .is('date_trashed', null)
      .or(`user_id.eq.${userId},user_id.is.null`),
  ]);

  if (settingsError) {
    throw settingsError;
  }

  if (templatesError) {
    throw templatesError;
  }

  const sortedTemplateItems = [...(templateItems ?? [])].sort(sortDailyTemplateItems);
  const systemTemplate = sortedTemplateItems.find((item) => item.user_id == null) ?? null;
  const selectedTemplateId = sortedTemplateItems.some(
    (item) => item.id === settingsRow?.daily_template_id,
  )
    ? settingsRow.daily_template_id
    : (systemTemplate?.id ?? '');

  return {
    options: sortedTemplateItems.map((templateItem) => ({
      id: templateItem.id,
      isSystemTemplate: templateItem.user_id == null,
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
    .eq('is_template', true)
    .eq('subtype', 'daily')
    .is('date_trashed', null)
    .or(`user_id.eq.${userId},user_id.is.null`)
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
    throw new Error('No daily template is available for this account.');
  }

  return selectedTemplateId;
}
