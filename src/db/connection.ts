/**
 * SQLite Connection Layer
 *
 * Provides SqliteClient layer for database operations.
 * Uses @effect/sql-sqlite-bun for Effect-based database access.
 */

import { fileURLToPath } from "node:url";
import { SqliteClient, SqliteMigrator } from "@effect/sql-sqlite-bun";
import { Layer } from "effect";

/**
 * SqliteClient Layer
 *
 * Simple layer for database client
 */
export const SqliteLive = SqliteClient.layer({
	filename: "debates/council.db",
});

/**
 * Migrator Layer
 *
 * Runs database migrations from src/db/migrations directory
 */
export const MigratorLive = SqliteMigrator.layer({
	loader: SqliteMigrator.fromFileSystem(
		fileURLToPath(new URL("migrations", import.meta.url)),
	),
}).pipe(Layer.provide(SqliteLive));

/**
 * Database Layer
 *
 * Combines client and migrator for complete database setup
 */
export const DatabaseLive = Layer.mergeAll(SqliteLive, MigratorLive);
