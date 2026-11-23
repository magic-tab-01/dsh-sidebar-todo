/**
 * Host half of dsh-sidebar-todo — data model v3.
 *
 * v3 adds checklist subtasks, multiple reminders (with snooze), recurring
 * presets, and the series/occurrence fields that make completion roll a task
 * forward. v1/v2 files migrate in place; the previous file is kept as
 * `state.v1.json` / `state.v2.json`.
 *
 * The store is a JSON file under $DSH_HOME; the Client page and the
 * `todo_manage` agent tool share it through `/dsh-sidebar-todo/state`.
 */

import { homedir } from 'node:os'
import { join } from 'node:path'
import { mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs'

const ROUTE_STATE = '/dsh-sidebar-todo/state'
const DSH_HOME = process.env.DSH_HOME || join(homedir(), '.dsh')
const STATE_DIR = join(DSH_HOME, 'dsh-sidebar-todo')
const STATE_FILE = join(STATE_DIR, 'state.json')
const V1_BACKUP = join(STATE_DIR, 'state.v1.json')
const V2_BACKUP = join(STATE_DIR, 'state.v2.json')
const MAX_TITLE = 500
const MAX_NOTES = 20000
const MAX_TAG = 40
const MAX_SUBTASK = 300
const MAX_REMINDERS = 5
const KEEP_COMPLETED_DAYS = 90
const WEEKDAYS = [1, 2, 3, 4, 5, 6, 7] // ISO: Monday 1 .. Sunday 7
const RECURRENCE_KINDS = ['daily', 'weekdays', 'weekly', 'monthly', 'yearly']

/** New id with a stable prefix. */
function newId(prefix) {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`
}

/** Fresh v3 store with the protected inbox list. */
function emptyState() {
  return {
    version: 3,
    revision: 0,
    folders: [],
    lists: [{ id: 'inbox', name: '收件箱', order: 0, folderId: null, color: '#4d6bfe', deletedAt: null }],
    tags: [],
    tasks: [],
    settings: { defaultListId: 'inbox', sort: 'smart' },
  }
}

/** Coerce one folder row. */
function sanitizeFolder(raw, index) {
  if (raw === null || typeof raw !== 'object') return null
  const name = typeof raw.name === 'string' ? raw.name.trim().slice(0, 60) : ''
  if (name === '') return null
  return {
    id: typeof raw.id === 'string' && raw.id !== '' ? raw.id : newId('f'),
    name,
    order: Number.isFinite(raw.order) ? Number(raw.order) : index,
  }
}

/** Validate a `#rrggbb` category color. */
function parseColor(value) {
  return typeof value === 'string' && /^#[0-9a-fA-F]{6}$/.test(value) ? value.toLowerCase() : null
}

/** Coerce one list row. */
function sanitizeList(raw, index, folderIds = new Set()) {
  if (raw === null || typeof raw !== 'object') return null
  const name = typeof raw.name === 'string' ? raw.name.trim().slice(0, 60) : ''
  if (name === '') return null
  return {
    id: typeof raw.id === 'string' && raw.id !== '' ? raw.id : newId('l'),
    name,
    order: Number.isFinite(raw.order) ? Number(raw.order) : index,
    folderId: typeof raw.folderId === 'string' && folderIds.has(raw.folderId) ? raw.folderId : null,
    color: parseColor(raw.color),
    deletedAt: Number.isFinite(raw.deletedAt) ? Number(raw.deletedAt) : null,
  }
}

/** Coerce one subtask row. */
function sanitizeSubtask(raw, index) {
  if (raw === null || typeof raw !== 'object') return null
  const title = typeof raw.title === 'string' ? raw.title.trim().slice(0, MAX_SUBTASK) : ''
  if (title === '') return null
  return {
    id: typeof raw.id === 'string' && raw.id !== '' ? raw.id : newId('s'),
    title,
    done: raw.done === true,
    order: Number.isFinite(raw.order) ? Number(raw.order) : index,
  }
}

/** Coerce one reminder row. */
function sanitizeReminder(raw) {
  if (raw === null || typeof raw !== 'object') return null
  if (!Number.isFinite(raw.at)) return null
  return {
    id: typeof raw.id === 'string' && raw.id !== '' ? raw.id : newId('r'),
    at: Number(raw.at),
    firedAt: Number.isFinite(raw.firedAt) ? Number(raw.firedAt) : null,
  }
}

/** Coerce a recurrence preset. */
function sanitizeRecurrence(raw) {
  if (raw === null || typeof raw !== 'object') return null
  const kind = String(raw.kind || '')
  if (!RECURRENCE_KINDS.includes(kind)) return null
  const every = Number.isInteger(raw.every) && raw.every >= 1 && raw.every <= 365 ? raw.every : 1
  const weekdays = Array.isArray(raw.weekdays)
    ? [...new Set(raw.weekdays.filter(day => Number.isInteger(day) && day >= 1 && day <= 7))].sort((a, b) => a - b)
    : []
  return {
    kind,
    every: kind === 'daily' ? every : 1,
    weekdays: kind === 'weekly' && weekdays.length > 0 ? weekdays : kind === 'weekdays' ? [1, 2, 3, 4, 5] : [],
    day: Number.isInteger(raw.day) && raw.day >= 1 && raw.day <= 31 ? raw.day : null,
    month: Number.isInteger(raw.month) && raw.month >= 0 && raw.month <= 11 ? raw.month : null,
  }
}

/** Coerce one task row. */
function sanitizeTask(raw, listIds) {
  if (raw === null || typeof raw !== 'object') return null
  const title = typeof raw.title === 'string' ? raw.title.trim().slice(0, MAX_TITLE) : ''
  if (title === '') return null
  const listId = listIds.has(raw.listId) ? raw.listId : 'inbox'
  const completed = raw.status === 'completed' || raw.done === true
  const tags = Array.isArray(raw.tags)
    ? [...new Set(raw.tags.filter(tag => typeof tag === 'string' && tag.trim() !== '').map(tag => tag.trim().slice(0, MAX_TAG)))]
    : []
  const subtasks = Array.isArray(raw.subtasks) ? raw.subtasks.map(sanitizeSubtask).filter(Boolean) : []
  const reminders = Array.isArray(raw.reminders) ? raw.reminders.map(sanitizeReminder).filter(Boolean) : []
  reminders.sort((a, b) => a.at - b.at)
  const recurrence = sanitizeRecurrence(raw.recurrence)
  return {
    id: typeof raw.id === 'string' && raw.id !== '' ? raw.id : newId('t'),
    listId,
    title,
    notes: typeof raw.notes === 'string' ? raw.notes.slice(0, MAX_NOTES) : '',
    status: completed ? 'completed' : 'open',
    priority: Number.isInteger(raw.priority) && raw.priority >= 0 && raw.priority <= 3 ? raw.priority : 0,
    dueAt: Number.isFinite(raw.dueAt) ? Number(raw.dueAt) : null,
    tags,
    subtasks,
    reminders,
    recurrence,
    seriesId: typeof raw.seriesId === 'string' && raw.seriesId !== '' ? raw.seriesId : null,
    occurrence: Number.isInteger(raw.occurrence) && raw.occurrence >= 0 ? raw.occurrence : 0,
    order: Number.isFinite(raw.order) ? Number(raw.order) : Date.now(),
    createdAt: Number.isFinite(raw.createdAt) ? Number(raw.createdAt) : Date.now(),
    updatedAt: Number.isFinite(raw.updatedAt) ? Number(raw.updatedAt) : Date.now(),
    completedAt: completed && Number.isFinite(raw.completedAt) ? Number(raw.completedAt) : null,
    deletedAt: Number.isFinite(raw.deletedAt) ? Number(raw.deletedAt) : null,
  }
}

/** Default reminder for a task with a due time. Past dues are marked fired. */
function reminderFor(dueAt, now = Date.now()) {
  return [{ id: newId('r'), at: dueAt, firedAt: dueAt < now ? dueAt : null }]
}

/** Normalize an arbitrary parsed object into a v3 store. */
function normalizeStore(parsed) {
  const base = emptyState()
  if (parsed === null || typeof parsed !== 'object') return base
  const fromVersion = Number.isFinite(parsed.version) ? Number(parsed.version) : 0
  const folders = Array.isArray(parsed.folders) ? parsed.folders.map(sanitizeFolder).filter(Boolean) : []
  const folderIds = new Set(folders.map(folder => folder.id))
  const lists = Array.isArray(parsed.lists) ? parsed.lists.map((list, index) => sanitizeList(list, index, folderIds)).filter(Boolean) : []
  if (!lists.some(list => list.id === 'inbox')) lists.unshift({ id: 'inbox', name: '收件箱', order: 0, folderId: null, color: '#4d6bfe', deletedAt: null })
  const listIds = new Set(lists.map(list => list.id))
  const now = Date.now()
  const tasks = Array.isArray(parsed.tasks) ? parsed.tasks.map(task => sanitizeTask(task, listIds)).filter(Boolean) : []
  if (fromVersion > 0 && fromVersion < 3) {
    for (const task of tasks) {
      if (task.dueAt !== null && task.reminders.length === 0) task.reminders = reminderFor(task.dueAt, now)
    }
  }
  const tags = Array.isArray(parsed.tags)
    ? parsed.tags.filter(tag => typeof tag === 'string' && tag.trim() !== '').map(tag => tag.trim().slice(0, MAX_TAG))
    : []
  const tagSet = new Set(tags)
  for (const task of tasks) for (const tag of task.tags) tagSet.add(tag)
  const sort = ['smart', 'manual', 'due'].includes(parsed.settings?.sort) ? parsed.settings.sort : 'smart'
  return {
    version: 3,
    revision: Number.isFinite(parsed.revision) ? Number(parsed.revision) : 0,
    folders,
    lists,
    tags: [...tagSet],
    tasks,
    settings: {
      defaultListId: listIds.has(parsed.settings?.defaultListId) ? parsed.settings.defaultListId : 'inbox',
      sort,
    },
  }
}

/** Map a v1 store (`{ todos }`) to v3. */
function migrateV1(parsed) {
  const state = emptyState()
  const now = Date.now()
  const todos = Array.isArray(parsed.todos) ? parsed.todos : []
  for (const todo of todos) {
    const title = typeof todo.text === 'string' ? todo.text.trim() : ''
    if (title === '') continue
    const done = todo.done === true
    const dueAt = Number.isFinite(todo.dueAt) ? Number(todo.dueAt) : null
    // v1: 1 high, 2 medium, 3 low -> v3: 3 high, 2 medium, 1 low.
    const priority = todo.priority === 1 ? 3 : todo.priority === 2 ? 2 : todo.priority === 3 ? 1 : 0
    state.tasks.push({
      id: typeof todo.id === 'string' && todo.id !== '' ? todo.id : newId('t'),
      listId: 'inbox',
      title: title.slice(0, MAX_TITLE),
      notes: '',
      status: done ? 'completed' : 'open',
      priority,
      dueAt,
      tags: typeof todo.tag === 'string' && todo.tag.trim() !== '' ? [todo.tag.trim().slice(0, MAX_TAG)] : [],
      subtasks: [],
      reminders: dueAt === null ? [] : reminderFor(dueAt, now),
      recurrence: null,
      seriesId: null,
      occurrence: 0,
      order: Number.isFinite(todo.createdAt) ? Number(todo.createdAt) : now,
      createdAt: Number.isFinite(todo.createdAt) ? Number(todo.createdAt) : now,
      updatedAt: Number.isFinite(todo.doneAt) ? Number(todo.doneAt) : now,
      completedAt: done && Number.isFinite(todo.doneAt) ? Number(todo.doneAt) : null,
      deletedAt: null,
    })
  }
  const tags = new Set()
  for (const task of state.tasks) for (const tag of task.tags) tags.add(tag)
  state.tags = [...tags]
  state.revision = 1
  return state
}

/** Atomically persist the whole store. */
function writeState(state) {
  mkdirSync(STATE_DIR, { recursive: true })
  const tmp = `${STATE_FILE}.${process.pid}.${Date.now()}.tmp`
  writeFileSync(tmp, `${JSON.stringify(state, null, 2)}\n`, 'utf8')
  renameSync(tmp, STATE_FILE)
}

/** Read, migrate, or create the store. */
function readState() {
  let parsed
  try {
    parsed = JSON.parse(readFileSync(STATE_FILE, 'utf8'))
  } catch {
    return emptyState()
  }
  const version = parsed !== null && typeof parsed === 'object' ? Number(parsed.version || 0) : 0
  const isV1 = version === 1 || Array.isArray(parsed.todos)
  if (isV1) {
    try { writeFileSync(V1_BACKUP, readFileSync(STATE_FILE, 'utf8'), 'utf8') } catch { /* best effort */ }
    const migrated = migrateV1(parsed)
    writeState(migrated)
    return migrated
  }
  if (version > 0 && version < 3) {
    try { writeFileSync(V2_BACKUP, readFileSync(STATE_FILE, 'utf8'), 'utf8') } catch { /* best effort */ }
  }
  const normalized = normalizeStore(parsed)
  if (version > 0 && version < 3) writeState(normalized)
  return normalized
}

/** Local midnight at or before `ms`. */
function startOfDay(ms) {
  const date = new Date(ms)
  date.setHours(0, 0, 0, 0)
  return date.getTime()
}

/** Local end of the day containing `ms`. */
function endOfDay(ms) {
  const date = new Date(ms)
  date.setHours(23, 59, 59, 999)
  return date.getTime()
}

/** Counts for the page header and the tool result. */
function stats(tasks, now = Date.now()) {
  const live = tasks.filter(task => !task.deletedAt)
  const open = live.filter(task => task.status === 'open')
  const todayEnd = endOfDay(now)
  const todayStart = startOfDay(now)
  const upcomingEnd = endOfDay(todayStart + 6 * 86400000)
  return {
    total: live.length,
    open: open.length,
    done: live.length - open.length,
    overdue: open.filter(task => task.dueAt !== null && task.dueAt < now).length,
    today: open.filter(task => task.dueAt !== null && task.dueAt <= todayEnd).length,
    upcoming: open.filter(task => task.dueAt !== null && task.dueAt >= todayStart && task.dueAt <= upcomingEnd).length,
  }
}

/** Accept an epoch millisecond value or an ISO/parseable date string. */
function parseDue(value) {
  if (value === null || value === undefined || value === '') return null
  if (typeof value === 'number') return Number.isFinite(value) ? Math.trunc(value) : null
  const text = String(value).trim()
  if (/^\d{10,}$/.test(text)) return Number(text)
  const parsed = Date.parse(text)
  return Number.isFinite(parsed) ? parsed : null
}

/** Validate/normalize a priority value (0 none, 1 low, 2 medium, 3 high). */
function parsePriority(value) {
  if (value === null || value === undefined || value === '') return 0
  const number = Number(value)
  return Number.isInteger(number) && number >= 0 && number <= 3 ? number : 0
}

/** Normalize a tag list from an array or a comma/space string. */
function parseTags(value) {
  if (value === null || value === undefined) return []
  const raw = Array.isArray(value) ? value : String(value).split(/[,，\s]+/)
  return [...new Set(raw.filter(tag => typeof tag === 'string' && tag.trim() !== '').map(tag => tag.trim().slice(0, MAX_TAG)))]
}

/** One-line due label for tool results. */
function dueLabel(dueAt) {
  if (dueAt === null) return ''
  const date = new Date(dueAt)
  const pad = value => String(value).padStart(2, '0')
  return `${date.getMonth() + 1}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`
}

/** Fill recurrence fields that depend on the due date. */
function normalizeRecurrenceFor(recurrence, dueAt) {
  if (recurrence === null || dueAt === null) return recurrence
  const date = new Date(dueAt)
  if (recurrence.kind === 'weekly' && recurrence.weekdays.length === 0) {
    recurrence.weekdays = [date.getDay() === 0 ? 7 : date.getDay()]
  }
  if (recurrence.kind === 'monthly' && recurrence.day === null) recurrence.day = date.getDate()
  if (recurrence.kind === 'yearly') {
    if (recurrence.day === null) recurrence.day = date.getDate()
    if (recurrence.month === null) recurrence.month = date.getMonth()
  }
  return recurrence
}

/** Days in a month (0-based month). */
function daysInMonth(year, month) {
  return new Date(year, month + 1, 0).getDate()
}

/** Advance one recurrence step. */
function advanceOnce(date, recurrence) {
  const next = new Date(date)
  if (recurrence.kind === 'daily') {
    next.setDate(next.getDate() + (recurrence.every || 1))
  } else if (recurrence.kind === 'weekdays') {
    do { next.setDate(next.getDate() + 1) } while (next.getDay() === 0 || next.getDay() === 6)
  } else if (recurrence.kind === 'weekly') {
    const set = recurrence.weekdays.length > 0 ? recurrence.weekdays : [1]
    do { next.setDate(next.getDate() + 1) } while (!set.includes(next.getDay() === 0 ? 7 : next.getDay()))
  } else if (recurrence.kind === 'monthly') {
    const day = recurrence.day || next.getDate()
    next.setDate(1)
    next.setMonth(next.getMonth() + 1)
    next.setDate(Math.min(day, daysInMonth(next.getFullYear(), next.getMonth())))
  } else if (recurrence.kind === 'yearly') {
    const day = recurrence.day || next.getDate()
    const month = recurrence.month !== null ? recurrence.month : next.getMonth()
    next.setDate(1)
    next.setMonth(month)
    next.setFullYear(next.getFullYear() + 1)
    next.setDate(Math.min(day, daysInMonth(next.getFullYear(), month)))
  }
  return next
}

/** Next occurrence strictly after `now`, or null. */
function nextDueAt(task, now = Date.now()) {
  if (task.dueAt === null || task.recurrence === null) return null
  let current = new Date(task.dueAt)
  for (let index = 0; index < 500; index += 1) {
    current = advanceOnce(current, task.recurrence)
    if (current.getTime() > now) return current.getTime()
  }
  return null
}

/** Filter + sort tasks for one view. */
function queryTasks(state, options = {}) {
  const now = Date.now()
  const todayEnd = endOfDay(now)
  const todayStart = startOfDay(now)
  const upcomingEnd = endOfDay(todayStart + 6 * 86400000)
  const view = String(options.view || options.filter || 'all')
  const search = String(options.search || '').trim().toLowerCase()
  const listId = options.listId || null
  const tag = options.tag || null
  const includeDone = view === 'completed'
  const rows = state.tasks.filter(task => {
    if (task.deletedAt) return false
    if (includeDone ? task.status !== 'completed' : task.status === 'completed') return false
    if (view === 'today' && (task.dueAt === null || task.dueAt > todayEnd)) return false
    if (view === 'upcoming' && (task.dueAt === null || task.dueAt < todayStart || task.dueAt > upcomingEnd)) return false
    if (listId !== null && task.listId !== listId) return false
    if (tag !== null && !task.tags.includes(tag)) return false
    if (search !== '') {
      const haystack = `${task.title}\n${task.notes}\n${task.tags.join(' ')}\n${task.subtasks.map(item => item.title).join(' ')}`.toLowerCase()
      if (!haystack.includes(search)) return false
    }
    return true
  })
  const rank = priority => (priority >= 1 && priority <= 3 ? 4 - priority : 0)
  rows.sort((a, b) => {
    if (includeDone) return (b.completedAt || 0) - (a.completedAt || 0)
    return (rank(b.priority) - rank(a.priority))
      || ((a.dueAt || Infinity) - (b.dueAt || Infinity))
      || (b.createdAt - a.createdAt)
  })
  return rows
}

/** Trim old completed tasks and purge deleted rows after 30 days. */
function trimTasks(tasks, now = Date.now()) {
  const keepAfter = now - KEEP_COMPLETED_DAYS * 86400000
  const purgeAfter = now - 30 * 86400000
  return tasks.filter(task => {
    if (task.deletedAt !== null && task.deletedAt < purgeAfter) return false
    if (task.status === 'completed' && task.completedAt !== null && task.completedAt < keepAfter) return false
    return true
  })
}

/** Resolve a list by id or display name. */
function resolveList(state, value) {
  if (value === null || value === undefined) return state.settings.defaultListId
  const text = String(value).trim()
  const byId = state.lists.find(list => list.id === text)
  if (byId) return byId.id
  const byName = state.lists.find(list => list.name === text)
  return byName ? byName.id : state.settings.defaultListId
}

/**
 * Apply one operation to the store.
 * @returns `{ ok: true, state, next? }` or `{ ok: false, error, status? }`.
 */
function applyOp(store, op) {
  const state = store.get()
  const now = Date.now()
  const action = String((op && (op.op || op.action)) || '').toLowerCase()
  const commit = (mutate, extra = {}) => {
    const next = {
      ...mutate,
      version: 3,
      revision: state.revision + 1,
    }
    next.tasks = trimTasks(next.tasks, now)
    const tagSet = new Set(next.tags)
    for (const task of next.tasks) if (!task.deletedAt) for (const tag of task.tags) tagSet.add(tag)
    next.tags = [...tagSet]
    writeState(next)
    store.set(next)
    return { ok: true, state: next, ...extra }
  }
  const lists = () => state.lists
  const liveTask = id => state.tasks.find(task => task.id === id && !task.deletedAt)
  const replaceTask = (id, patch) => state.tasks.map(task => (task.id === id ? { ...task, ...patch, updatedAt: now } : task))

  if (action === 'task.create' || action === 'add') {
    const title = String(op.title ?? op.text ?? '').trim().slice(0, MAX_TITLE)
    if (title === '') return { ok: false, error: '待办内容不能为空' }
    const listId = lists().some(list => list.id === op.listId) ? op.listId : (op.list ? resolveList(state, op.list) : state.settings.defaultListId)
    const dueAt = parseDue(op.dueAt !== undefined ? op.dueAt : op.due)
    let recurrence = sanitizeRecurrence(op.recurrence)
    if (recurrence !== null && dueAt === null) return { ok: false, error: '重复任务需要先设置截止时间' }
    recurrence = normalizeRecurrenceFor(recurrence, dueAt)
    const subtasks = Array.isArray(op.subtasks)
      ? op.subtasks.map((item, index) => ({ id: newId('s'), title: String(item).trim().slice(0, MAX_SUBTASK), done: false, order: index })).filter(item => item.title !== '')
      : []
    let reminders = Array.isArray(op.reminders) ? op.reminders.map(sanitizeReminder).filter(Boolean) : []
    if (reminders.length === 0 && dueAt !== null) reminders = reminderFor(dueAt, now)
    const task = {
      id: newId('t'),
      listId: listId || 'inbox',
      title,
      notes: typeof op.notes === 'string' ? op.notes.slice(0, MAX_NOTES) : '',
      status: 'open',
      priority: parsePriority(op.priority),
      dueAt,
      tags: parseTags(op.tags !== undefined ? op.tags : op.tag),
      subtasks,
      reminders: reminders.slice(0, MAX_REMINDERS),
      recurrence,
      seriesId: null,
      occurrence: 0,
      order: now,
      createdAt: now,
      updatedAt: now,
      completedAt: null,
      deletedAt: null,
    }
    return commit({ ...state, tasks: [...state.tasks, task] })
  }

  if (action === 'folder.create') {
    const name = String(op.name || '').trim().slice(0, 60)
    if (name === '') return { ok: false, error: '文件夹名称不能为空' }
    const folder = { id: newId('f'), name, order: state.folders.length }
    return commit({ ...state, folders: [...state.folders, folder] })
  }

  if (action === 'folder.rename') {
    const name = String(op.name || '').trim().slice(0, 60)
    if (name === '') return { ok: false, error: '文件夹名称不能为空' }
    if (!state.folders.some(folder => folder.id === op.id)) return { ok: false, error: '找不到文件夹' }
    return commit({ ...state, folders: state.folders.map(folder => (folder.id === op.id ? { ...folder, name } : folder)) })
  }

  if (action === 'folder.delete') {
    if (!state.folders.some(folder => folder.id === op.id)) return { ok: false, error: '找不到文件夹' }
    return commit({
      ...state,
      folders: state.folders.filter(folder => folder.id !== op.id),
      lists: state.lists.map(list => (list.folderId === op.id ? { ...list, folderId: null } : list)),
    })
  }

  if (action === 'list.create') {
    const name = String(op.name || '').trim().slice(0, 60)
    if (name === '') return { ok: false, error: '分类名称不能为空' }
    const folderId = state.folders.some(folder => folder.id === op.folderId) ? op.folderId : null
    const list = { id: newId('l'), name, order: lists().length, folderId, color: parseColor(op.color), deletedAt: null }
    return commit({ ...state, lists: [...state.lists, list] })
  }

  if (action === 'list.update' || action === 'list.rename') {
    if (!lists().some(list => list.id === op.id)) return { ok: false, error: '找不到分类' }
    const patch = {}
    if (op.name !== undefined) {
      const name = String(op.name).trim().slice(0, 60)
      if (name === '') return { ok: false, error: '分类名称不能为空' }
      patch.name = name
    }
    if (op.folderId !== undefined) patch.folderId = state.folders.some(folder => folder.id === op.folderId) ? op.folderId : null
    if (op.color !== undefined) patch.color = parseColor(op.color)
    if (Object.keys(patch).length === 0) return { ok: true, state }
    return commit({ ...state, lists: state.lists.map(list => (list.id === op.id ? { ...list, ...patch } : list)) })
  }

  if (action === 'list.delete') {
    if (op.id === 'inbox') return { ok: false, error: '收件箱不能删除' }
    if (!lists().some(list => list.id === op.id)) return { ok: false, error: '找不到分类' }
    return commit({
      ...state,
      lists: state.lists.filter(list => list.id !== op.id),
      tasks: state.tasks.map(task => (task.listId === op.id ? { ...task, listId: 'inbox' } : task)),
      settings: state.settings.defaultListId === op.id ? { ...state.settings, defaultListId: 'inbox' } : state.settings,
    })
  }

  if (action === 'settings.update') {
    const patch = {}
    if (op.sort !== undefined) {
      if (!['smart', 'manual', 'due'].includes(op.sort)) return { ok: false, error: '未知排序方式' }
      patch.sort = op.sort
    }
    if (Object.keys(patch).length === 0) return { ok: true, state }
    return commit({ ...state, settings: { ...state.settings, ...patch } })
  }

  if (action === 'task.bulk') {
    const ids = Array.isArray(op.ids) ? [...new Set(op.ids.filter(id => typeof id === 'string'))] : []
    if (ids.length === 0) return { ok: false, error: '没有选中任务' }
    const bulkAction = String(op.bulkAction || op.action2 || op.bulk || '').toLowerCase()
    if (bulkAction === 'complete') {
      let last = null
      let applied = 0
      for (const id of ids) {
        const result = applyOp(store, { op: 'task.complete', id })
        if (result.ok) {
          last = result
          applied += 1
        }
      }
      return applied > 0 ? last : { ok: false, error: '没有可完成的任务' }
    }
    if (bulkAction === 'delete') {
      return commit({ ...state, tasks: state.tasks.map(task => (ids.includes(task.id) && !task.deletedAt ? { ...task, deletedAt: now } : task)) })
    }
    if (bulkAction === 'restore') {
      return commit({ ...state, tasks: state.tasks.map(task => (ids.includes(task.id) && task.deletedAt !== null ? { ...task, deletedAt: null } : task)) })
    }
    if (bulkAction === 'move') {
      const listId = lists().some(list => list.id === op.listId) ? op.listId : null
      if (listId === null) return { ok: false, error: '找不到目标分类' }
      return commit({ ...state, tasks: state.tasks.map(task => (ids.includes(task.id) && !task.deletedAt ? { ...task, listId } : task)) })
    }
    return { ok: false, error: '未知批量操作' }
  }

  if (action === 'tag.rename') {
    const from = String(op.from || '').trim()
    const to = String(op.to || '').trim().slice(0, MAX_TAG)
    if (from === '' || to === '') return { ok: false, error: '标签名不能为空' }
    return commit({
      ...state,
      tags: [...new Set(state.tags.map(tag => (tag === from ? to : tag)))],
      tasks: state.tasks.map(task => (task.tags.includes(from) ? { ...task, tags: [...new Set(task.tags.map(tag => (tag === from ? to : tag)))] } : task)),
    })
  }

  if (action === 'tag.delete') {
    const name = String(op.name || '').trim()
    if (name === '') return { ok: false, error: '标签名不能为空' }
    return commit({
      ...state,
      tags: state.tags.filter(tag => tag !== name),
      tasks: state.tasks.map(task => (task.tags.includes(name) ? { ...task, tags: task.tags.filter(tag => tag !== name) } : task)),
    })
  }

  const id = String(op.id || '')
  const target = liveTask(id)

  if (action === 'task.complete' || action === 'done') {
    if (target === undefined) return { ok: false, error: `找不到待办 id=${id || '(空)'}` }
    if (target.status === 'completed') return { ok: true, state }
    let nextTask = null
    if (target.recurrence !== null) {
      const nextAt = nextDueAt(target, now)
      if (nextAt !== null) {
        const base = target.dueAt || nextAt
        const shifted = target.reminders
          .map(item => ({ ...item, id: newId('r'), at: nextAt - (base - item.at), firedAt: null }))
          .filter(item => item.at > now)
        nextTask = {
          ...target,
          id: newId('t'),
          status: 'open',
          dueAt: nextAt,
          reminders: shifted.length > 0 ? shifted : reminderFor(nextAt, now),
          subtasks: target.subtasks.map((item, index) => ({ ...item, id: newId('s'), done: false, order: index })),
          seriesId: target.seriesId || target.id,
          occurrence: (target.occurrence || 0) + 1,
          order: now,
          createdAt: now,
          updatedAt: now,
          completedAt: null,
          deletedAt: null,
        }
      }
    }
    const tasks = replaceTask(id, { status: 'completed', completedAt: now })
    return commit({ ...state, tasks: nextTask === null ? tasks : [...tasks, nextTask] }, nextTask === null ? {} : { next: nextTask })
  }

  if (action === 'task.uncomplete' || action === 'undone') {
    if (target === undefined) return { ok: false, error: `找不到待办 id=${id || '(空)'}` }
    return commit({ ...state, tasks: replaceTask(id, { status: 'open', completedAt: null }) })
  }

  if (action === 'task.toggle' || action === 'toggle') {
    if (target === undefined) return { ok: false, error: `找不到待办 id=${id || '(空)'}` }
    return applyOp(store, { ...op, op: target.status === 'completed' ? 'task.uncomplete' : 'task.complete', id })
  }

  if (action === 'task.delete' || action === 'remove') {
    if (target === undefined) return { ok: false, error: `找不到待办 id=${id || '(空)'}` }
    return commit({ ...state, tasks: replaceTask(id, { deletedAt: now }) })
  }

  if (action === 'task.restore' || action === 'restore') {
    const deleted = state.tasks.find(task => task.id === id && task.deletedAt !== null)
    if (deleted === undefined) return { ok: false, error: '找不到可恢复的待办' }
    return commit({ ...state, tasks: replaceTask(id, { deletedAt: null }) })
  }

  if (action === 'task.update' || action === 'update') {
    if (target === undefined) return { ok: false, error: `找不到待办 id=${id || '(空)'}` }
    const patch = {}
    if (op.title !== undefined || op.text !== undefined) {
      const title = String(op.title ?? op.text).trim().slice(0, MAX_TITLE)
      if (title === '') return { ok: false, error: '待办内容不能为空' }
      patch.title = title
    }
    if (op.notes !== undefined) patch.notes = String(op.notes).slice(0, MAX_NOTES)
    if (op.listId !== undefined) patch.listId = lists().some(list => list.id === op.listId) ? op.listId : 'inbox'
    else if (op.list !== undefined) patch.listId = resolveList(state, op.list)
    if (op.dueAt !== undefined || op.due !== undefined) patch.dueAt = parseDue(op.dueAt !== undefined ? op.dueAt : op.due)
    if (op.priority !== undefined) patch.priority = parsePriority(op.priority)
    if (op.tags !== undefined || op.tag !== undefined) patch.tags = parseTags(op.tags !== undefined ? op.tags : op.tag)
    if (op.recurrence !== undefined) {
      let recurrence = sanitizeRecurrence(op.recurrence)
      const effectiveDue = patch.dueAt !== undefined ? patch.dueAt : target.dueAt
      if (recurrence !== null && effectiveDue === null) return { ok: false, error: '重复任务需要先设置截止时间' }
      recurrence = normalizeRecurrenceFor(recurrence, effectiveDue)
      if (recurrence !== null && patch.dueAt !== undefined && patch.dueAt !== null) {
        const date = new Date(patch.dueAt)
        if (recurrence.kind === 'monthly' || recurrence.kind === 'yearly') recurrence.day = date.getDate()
        if (recurrence.kind === 'yearly') recurrence.month = date.getMonth()
      }
      patch.recurrence = recurrence
    }
    // Moving a due time shifts existing reminders by the same delta, so a
    // "1 hour before" reminder keeps its offset.
    if (patch.dueAt !== undefined && patch.dueAt !== null && target.dueAt !== null && op.reminders === undefined && op.reminderOffset !== true) {
      const delta = patch.dueAt - target.dueAt
      if (delta !== 0 && target.reminders.length > 0) {
        patch.reminders = target.reminders.map(item => ({ ...item, at: item.at + delta, firedAt: null }))
      }
    }
    if (op.reminders !== undefined) {
      patch.reminders = (Array.isArray(op.reminders) ? op.reminders.map(sanitizeReminder).filter(Boolean) : []).slice(0, MAX_REMINDERS)
    }
    if (Object.keys(patch).length === 0) return { ok: true, state }
    return commit({ ...state, tasks: replaceTask(id, patch) })
  }

  if (action === 'task.reorder') {
    if (target === undefined) return { ok: false, error: `找不到待办 id=${id || '(空)'}` }
    const before = op.beforeId ? state.tasks.find(task => task.id === op.beforeId) : undefined
    const after = op.afterId ? state.tasks.find(task => task.id === op.afterId) : undefined
    const order = before && after
      ? (before.order + after.order) / 2
      : before
        ? before.order - 0.5
        : after
          ? after.order + 0.5
          : target.order
    return commit({ ...state, tasks: replaceTask(id, { order }) })
  }

  if (action === 'subtask.add') {
    if (target === undefined) return { ok: false, error: '找不到待办' }
    const title = String(op.title || '').trim().slice(0, MAX_SUBTASK)
    if (title === '') return { ok: false, error: '子任务不能为空' }
    const subtask = { id: newId('s'), title, done: false, order: target.subtasks.length }
    return commit({ ...state, tasks: replaceTask(id, { subtasks: [...target.subtasks, subtask] }) })
  }

  if (action === 'subtask.toggle' || action === 'subtask.update') {
    if (target === undefined) return { ok: false, error: '找不到待办' }
    const index = target.subtasks.findIndex(item => item.id === op.subtaskId)
    if (index < 0) return { ok: false, error: '找不到子任务' }
    const subtasks = target.subtasks.map((item, itemIndex) => {
      if (itemIndex !== index) return item
      return {
        ...item,
        done: op.done !== undefined ? op.done === true : !item.done,
        title: typeof op.title === 'string' && op.title.trim() !== '' ? op.title.trim().slice(0, MAX_SUBTASK) : item.title,
      }
    })
    return commit({ ...state, tasks: replaceTask(id, { subtasks }) })
  }

  if (action === 'subtask.remove') {
    if (target === undefined) return { ok: false, error: '找不到待办' }
    return commit({ ...state, tasks: replaceTask(id, { subtasks: target.subtasks.filter(item => item.id !== op.subtaskId) }) })
  }

  if (action === 'reminder.add') {
    if (target === undefined) return { ok: false, error: '找不到待办' }
    if (target.reminders.length >= MAX_REMINDERS) return { ok: false, error: `最多 ${MAX_REMINDERS} 个提醒` }
    const at = parseDue(op.at)
    if (at === null) return { ok: false, error: '提醒时间无效' }
    if (target.reminders.some(item => item.at === at)) return { ok: false, error: '已存在同一时间的提醒' }
    const reminder = { id: newId('r'), at, firedAt: null }
    return commit({ ...state, tasks: replaceTask(id, { reminders: [...target.reminders, reminder].sort((a, b) => a.at - b.at) }) })
  }

  if (action === 'reminder.remove') {
    if (target === undefined) return { ok: false, error: '找不到待办' }
    return commit({ ...state, tasks: replaceTask(id, { reminders: target.reminders.filter(item => item.id !== op.reminderId) }) })
  }

  if (action === 'reminder.snooze') {
    if (target === undefined) return { ok: false, error: '找不到待办' }
    const index = target.reminders.findIndex(item => item.id === op.reminderId)
    if (index < 0) return { ok: false, error: '找不到提醒' }
    const minutes = Number(op.minutes)
    const at = Number.isFinite(minutes) && minutes > 0 ? now + minutes * 60000 : parseDue(op.at)
    if (at === null) return { ok: false, error: '稍后提醒时间无效' }
    const reminders = target.reminders.map((item, itemIndex) => (itemIndex === index ? { ...item, at, firedAt: null } : item))
    return commit({ ...state, tasks: replaceTask(id, { reminders }) })
  }

  if (action === 'reminder.fire') {
    if (target === undefined) return { ok: false, error: '找不到待办' }
    const ids = Array.isArray(op.reminderIds) ? op.reminderIds : op.reminderId ? [op.reminderId] : []
    // A scan result can be stale after a snooze: never mark a future reminder.
    const reminders = target.reminders.map(item => (ids.includes(item.id) && item.at <= now ? { ...item, firedAt: now } : item))
    return commit({ ...state, tasks: replaceTask(id, { reminders }) })
  }

  return { ok: false, error: `不认识的操作：${action || '(空)'}` }
}

/**
 * Host plugin entry.
 * @param ctx - host context.
 */
export function apply(ctx) {
  let state = readState()
  const store = {
    get: () => state,
    set: next => { state = next },
  }

  ctx.inject(['tools'], scoped => {
    scoped.tools.register({
      name: 'todo_manage',
      description:
        'Read and change the user\'s sidebar todo list. '
        + 'action=add needs title (optional list name, due ISO date, priority 0-3, tags, notes, repeat=daily|weekdays|weekly|monthly|yearly, subtasks). '
        + 'action=list returns tasks for view=all|today|upcoming|completed, optional list/tag/search. '
        + 'action=done/undone/toggle/remove/restore/update change one task by id; completing a repeating task creates its next occurrence. '
        + 'action=lists returns lists and tags. action=state returns counts. '
        + 'Use ids returned by list or add.',
      parameters: {
        type: 'object',
        properties: {
          action: {
            type: 'string',
            enum: ['add', 'list', 'done', 'undone', 'toggle', 'remove', 'restore', 'update', 'lists', 'state'],
            description: 'Operation to perform.',
          },
          title: { type: 'string', description: 'add/update: task title.' },
          text: { type: 'string', description: 'Alias of title.' },
          id: { type: 'string', description: 'done/undone/toggle/remove/restore/update: task id.' },
          list: { type: 'string', description: 'add/list: list id or name.' },
          due: { type: 'string', description: 'add/update: due time as ISO 8601, or empty to clear.' },
          priority: { type: 'integer', enum: [0, 1, 2, 3], description: '0 none, 1 low, 2 medium, 3 high.' },
          tags: { type: 'string', description: 'add/update: comma-separated tags, or empty to clear.' },
          notes: { type: 'string', description: 'add/update: notes.' },
          repeat: { type: 'string', enum: ['', 'daily', 'weekdays', 'weekly', 'monthly', 'yearly'], description: 'add/update: repeat preset; needs due.' },
          subtasks: { type: 'string', description: 'add: comma-separated subtask titles.' },
          view: { type: 'string', enum: ['all', 'today', 'upcoming', 'completed'], description: 'list: which tasks.' },
          tag: { type: 'string', description: 'list: filter by one tag.' },
          search: { type: 'string', description: 'list: search title/notes/tags/subtasks.' },
        },
        required: ['action'],
        additionalProperties: false,
      },
      output: {
        schema: {
          type: 'object',
          properties: { text: { type: 'string' } },
          required: ['text'],
          additionalProperties: false,
        },
        render(_args, value) {
          return [{ type: 'text', text: String((value && value.text) || '') }]
        },
      },
      async execute(args) {
        const action = String((args && args.action) || 'list').toLowerCase()
        if (action === 'state') return { text: JSON.stringify(stats(store.get().tasks), null, 2) }
        if (action === 'lists') {
          const current = store.get()
          const folderName = id => current.folders.find(folder => folder.id === id)?.name
          return {
            text: [
              `文件夹：${current.folders.length === 0 ? '（无）' : current.folders.map(folder => folder.name).join('、')}`,
              `分类：${current.lists.map(list => `${folderName(list.folderId) ? `${folderName(list.folderId)}/` : ''}${list.name}（${list.id}）`).join('、')}`,
              `标签：${current.tags.length === 0 ? '（无）' : current.tags.map(tag => `#${tag}`).join('、')}`,
              `排序：${current.settings.sort}`,
            ].join('\n'),
          }
        }
        if (action === 'list') {
          const current = store.get()
          const rows = queryTasks(current, {
            view: args.view || args.filter || 'all',
            listId: args.list ? resolveList(current, args.list) : null,
            tag: args.tag || null,
            search: args.search || '',
          })
          if (rows.length === 0) return { text: '没有符合条件的待办。' }
          const listName = id => current.lists.find(list => list.id === id)?.name || id
          const lines = rows.map(task => {
            const due = task.dueAt === null ? '' : ` · 截止 ${dueLabel(task.dueAt)}${task.dueAt < Date.now() && task.status === 'open' ? '（已逾期）' : ''}`
            const priority = task.priority === 3 ? ' · 高' : task.priority === 2 ? ' · 中' : task.priority === 1 ? ' · 低' : ''
            const tags = task.tags.length === 0 ? '' : ` · ${task.tags.map(tag => `#${tag}`).join(' ')}`
            const subs = task.subtasks.length === 0 ? '' : ` · 子任务 ${task.subtasks.filter(item => item.done).length}/${task.subtasks.length}`
            const repeat = task.recurrence === null ? '' : ` · 重复 ${task.recurrence.kind}`
            return `${task.status === 'completed' ? '[x]' : '[ ]'} ${task.title} · ${listName(task.listId)}${due}${priority}${tags}${subs}${repeat} (id=${task.id})`
          })
          const counts = stats(current.tasks)
          return { text: `${lines.join('\n')}\n\n共 ${rows.length} 条；未完成 ${counts.open} 条。` }
        }
        const payload = { ...args }
        if (args.repeat !== undefined) {
          payload.recurrence = args.repeat === '' ? null : { kind: args.repeat }
        }
        if (args.subtasks !== undefined && typeof args.subtasks === 'string') {
          payload.subtasks = args.subtasks.split(/[,，]+/).map(item => item.trim()).filter(Boolean)
        }
        const result = (() => {
          try {
            return applyOp(store, payload)
          } catch (cause) {
            return { ok: false, error: cause && cause.message ? cause.message : '写入失败' }
          }
        })()
        if (!result.ok) return { text: `操作失败：${result.error}` }
        const counts = stats(result.state.tasks)
        if (action === 'add') {
          const added = [...result.state.tasks].reverse().find(task => task.title === String(args.title ?? args.text ?? '').trim() && !task.deletedAt)
          return { text: `已添加：${added ? added.title : args.title}（id=${added ? added.id : '?'}，未完成 ${counts.open} 条）` }
        }
        if (action === 'done' && result.next) {
          return { text: `已完成，下一次：${result.next.title} · ${dueLabel(result.next.dueAt)}（id=${result.next.id}）` }
        }
        return { text: `已更新，未完成 ${counts.open} 条。` }
      },
    })
  })

  ctx.inject(['webServer'], scoped => {
    scoped.effect(() => scoped.webServer.register({
      kind: 'exact',
      path: ROUTE_STATE,
      handler: (req, res) => {
        const method = String((req && req.method) || 'GET').toUpperCase()
        const headers = (req && req.headers) || {}
        if (String(headers['sec-fetch-site'] || '').toLowerCase() === 'cross-site') {
          res.statusCode = 403
          res.end()
          return
        }
        const send = (status, payload) => {
          const body = JSON.stringify(payload)
          res.writeHead(status, {
            'content-type': 'application/json; charset=utf-8',
            'cache-control': 'no-store',
            'content-length': Buffer.byteLength(body),
          })
          res.end(body)
        }
        if (method === 'GET' || method === 'HEAD') {
          const current = store.get()
          send(200, { ok: true, state: current, stats: stats(current.tasks) })
          return
        }
        if (method !== 'POST') {
          res.statusCode = 405
          res.setHeader('allow', 'GET, HEAD, POST')
          res.end()
          return
        }
        let raw = ''
        req.on('data', chunk => {
          raw += chunk
          if (raw.length > 1024 * 1024) req.destroy()
        })
        req.on('end', () => {
          let body
          try {
            body = raw.trim() === '' ? {} : JSON.parse(raw)
          } catch {
            send(400, { ok: false, error: '请求体不是 JSON' })
            return
          }
          const result = (() => {
            try {
              return applyOp(store, body)
            } catch (cause) {
              return { ok: false, error: cause && cause.message ? cause.message : '写入失败', status: 500 }
            }
          })()
          if (!result.ok) {
            send(result.status === 500 ? 500 : 400, { ok: false, error: result.error })
            return
          }
          send(200, { ok: true, state: result.state, stats: stats(result.state.tasks), next: result.next })
        })
      },
    }), 'dsh-sidebar-todo: state route')
  })
}

export { ROUTE_STATE, migrateV1, normalizeStore, emptyState, nextDueAt }
