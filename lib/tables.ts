// Table names that have moved, kept in one place so a rename is one edit rather
// than a hunt through the app.
//
// The per-game roster table was called `players` until it was renamed to
// `unsaved_users` (same 12 columns, same primary key, same FK to games.id, rows
// carried over). Nothing in the app noticed: every call site swallows query
// errors, so the console just showed empty rosters and 0% participation instead
// of failing loudly. Hence the constant.
export const ROSTER_TABLE = 'unsaved_users';
