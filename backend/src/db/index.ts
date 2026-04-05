import { DatabaseSync } from 'node:sqlite';
import path from 'path';
import fs from 'fs';

type SqlParameter = string | number | bigint | Uint8Array | null;

export interface StatementResult {
    changes: number;
    lastInsertRowid: number;
}

export interface PreparedStatement {
    run: (...params: SqlParameter[]) => StatementResult;
    get: <T = unknown>(...params: SqlParameter[]) => T | undefined;
    all: <T = unknown>(...params: SqlParameter[]) => T[];
}

export interface AppDatabase {
    exec: (sql: string) => void;
    pragma: (sql: string) => void;
    prepare: (sql: string) => PreparedStatement;
    transaction: <TArgs extends unknown[], TResult>(fn: (...args: TArgs) => TResult) => (...args: TArgs) => TResult;
    close: () => void;
}

function normalizeResult(result: { changes: number | bigint; lastInsertRowid: number | bigint }): StatementResult {
    return {
        changes: Number(result.changes),
        lastInsertRowid: Number(result.lastInsertRowid),
    };
}

function createDatabase(filePath: string): AppDatabase {
    const database = new DatabaseSync(filePath);

    return {
        exec(sql: string) {
            database.exec(sql);
        },
        pragma(sql: string) {
            database.exec(`PRAGMA ${sql}`);
        },
        prepare(sql: string): PreparedStatement {
            const statement = database.prepare(sql);
            return {
                run: (...params: SqlParameter[]) => normalizeResult(statement.run(...params)),
                get: <T = unknown>(...params: SqlParameter[]) => {
                    const row = statement.get(...params);
                    return row === null ? undefined : (row as T | undefined);
                },
                all: <T = unknown>(...params: SqlParameter[]) => statement.all(...params) as T[],
            };
        },
        transaction<TArgs extends unknown[], TResult>(fn: (...args: TArgs) => TResult) {
            return (...args: TArgs) => {
                database.exec('BEGIN');
                try {
                    const result = fn(...args);
                    database.exec('COMMIT');
                    return result;
                } catch (error) {
                    database.exec('ROLLBACK');
                    throw error;
                }
            };
        },
        close() {
            database.close();
        },
    };
}

const dbPath = process.env.DATABASE_PATH || path.join(__dirname, '../../data/applauncher.db');
const dbDir = path.dirname(dbPath);

if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
}

const uploadDir = process.env.UPLOAD_PATH || path.join(__dirname, '../../uploads/icons');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

const db = createDatabase(dbPath);
db.pragma('foreign_keys = ON');

export async function runMigrations() {
    // 1. Create meta table if missing
    db.exec(`
        CREATE TABLE IF NOT EXISTS app_meta (
            key TEXT PRIMARY KEY,
            value TEXT
        );
    `);

    // 2. Get current version
    let currentVersion = 0;
    const row = db.prepare("SELECT value FROM app_meta WHERE key = 'db_version'").get() as { value: string } | undefined;
    
    if (row) {
        currentVersion = parseInt(row.value);
    } else {
        db.prepare("INSERT INTO app_meta (key, value) VALUES ('db_version', '0')").run();
    }


    // 3. Define migrations list (mapping files to logic)
    // We import them statically for now as dynamic fs-based imports in TS can be tricky with bundling
    const migrations = [
        { version: 1, name: '001-init', up: (await import('../migrations/001-init')).up },
    ];

    // 4. Run pending migrations
    for (const migration of migrations) {
        if (migration.version > currentVersion) {
            try {
                await migration.up(db);
                db.prepare("UPDATE app_meta SET value = ? WHERE key = 'db_version'").run(migration.version.toString());
            } catch (error) {
                console.error(`Migration ${migration.name} failed:`, error);
                throw error; // Stop startup if migration fails
            }
        }
    }
}

export function initDb() {
    // This is now legacy/wrapper for compatibility or simple checks
    // The actual schema is handled by runMigrations
}

export default db;
