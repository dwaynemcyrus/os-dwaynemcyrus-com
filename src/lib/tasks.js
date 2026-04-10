import { supabase } from './supabase';

const TASK_FIELDS = [
  'id',
  'title',
  'status',
  'subtype',
  'area',
  'project',
  'blocked',
  'access',
  'date_start',
  'date_end',
  'date_created',
  'date_modified',
  'date_trashed',
  'tags',
].join(',');

export const TASK_FILTER_LABELS = {
  today: 'Today',
  upcoming: 'Upcoming',
  backlog: 'Backlog',
  someday: 'Someday',
  logbook: 'Logbook',
};

export const TASK_SUBTYPE_LABELS = {
  task: 'Task',
  project: 'Project',
};

export const TASK_STATUS_LABELS = {
  active: 'Today',
  backlog: 'Backlog',
  someday: 'Someday',
  done: 'Done',
};

const STATUS_ACTIONS = {
  active: [
    { id: 'done', label: 'Mark Done' },
    { id: 'backlog', label: 'Move to Backlog' },
    { id: 'someday', label: 'Move to Someday' },
  ],
  backlog: [
    { id: 'active', label: 'Move to Today' },
    { id: 'someday', label: 'Move to Someday' },
  ],
  someday: [
    { id: 'active', label: 'Move to Today' },
    { id: 'backlog', label: 'Move to Backlog' },
  ],
  done: [
    { id: 'backlog', label: 'Restore to Backlog' },
  ],
};

export { STATUS_ACTIONS as TASK_STATUS_ACTIONS };

export async function fetchTasksIndex({ filter, userId }) {
  const validFilters = ['today', 'upcoming', 'backlog', 'someday', 'logbook'];

  if (!validFilters.includes(filter)) {
    throw new Error(`Unknown task filter: ${filter}`);
  }

  let query = supabase
    .from('items')
    .select(TASK_FIELDS)
    .eq('user_id', userId)
    .eq('type', 'action')
    .eq('is_template', false)
    .is('date_trashed', null);

  switch (filter) {
    case 'today':
      query = query.eq('status', 'active');
      break;
    case 'upcoming':
      query = query.eq('status', 'backlog').not('date_start', 'is', null);
      break;
    case 'backlog':
      query = query.eq('status', 'backlog').is('date_start', null);
      break;
    case 'someday':
      query = query.eq('status', 'someday');
      break;
    case 'logbook':
      query = query.eq('status', 'done');
      break;
  }

  if (filter === 'upcoming') {
    query = query.order('date_start', { ascending: true, nullsFirst: false });
  } else {
    query = query
      .order('date_modified', { ascending: false, nullsFirst: false })
      .order('date_created', { ascending: false, nullsFirst: false });
  }

  const { data, error } = await query;

  if (error) throw error;

  return data ?? [];
}

export async function fetchTaskById(id, userId) {
  const { data, error } = await supabase
    .from('items')
    .select(`${TASK_FIELDS},content,frontmatter,dependencies,resources,workbench`)
    .eq('id', id)
    .eq('user_id', userId)
    .eq('type', 'action')
    .is('date_trashed', null)
    .single();

  if (error) throw error;

  return data;
}

export async function createTask({ subtype = 'task', title, userId }) {
  const payload = {
    user_id: userId,
    type: 'action',
    subtype,
    status: 'backlog',
    title: title?.trim() || (subtype === 'project' ? 'Untitled project' : 'Untitled task'),
    is_template: false,
    date_created: new Date().toISOString(),
    date_modified: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from('items')
    .insert(payload)
    .select('id')
    .single();

  if (error) throw error;

  return { taskId: data.id };
}

export async function updateTaskStatus(id, userId, status) {
  const { data, error } = await supabase
    .from('items')
    .update({ status, date_modified: new Date().toISOString() })
    .eq('id', id)
    .eq('user_id', userId)
    .select(TASK_FIELDS)
    .single();

  if (error) throw error;

  return data;
}

export async function trashTask(id, userId) {
  const { error } = await supabase
    .from('items')
    .update({ date_trashed: new Date().toISOString() })
    .eq('id', id)
    .eq('user_id', userId);

  if (error) throw error;
}

export async function fetchExecutionCounts(userId) {
  const base = () =>
    supabase
      .from('items')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('type', 'action')
      .eq('is_template', false)
      .is('date_trashed', null);

  const [
    { count: todayCount, error: todayError },
    { count: backlogCount, error: backlogError },
  ] = await Promise.all([
    base().eq('status', 'active'),
    base().eq('status', 'backlog'),
  ]);

  if (todayError) throw todayError;
  if (backlogError) throw backlogError;

  return {
    tasks_today: todayCount ?? 0,
    tasks_backlog: backlogCount ?? 0,
  };
}
