/**
 * Migration: 002_add_indexes
 *
 * Adds performance indexes for common queries:
 * - Timestamp queries for rate limiting
 * - Status queries for filtering active debates
 */

import { SqliteClient } from "@effect/sql-sqlite-bun";
import { Effect } from "effect";

export default Effect.flatMap(
	SqliteClient.SqliteClient,
	(sql) =>
		sql`
      -- Index on timestamp for rate limiting queries
      CREATE INDEX IF NOT EXISTS idx_debates_timestamp
      ON debates(timestamp);

      -- Index on status for filtering debates
      CREATE INDEX IF NOT EXISTS idx_debates_status
      ON debates(status);

      -- Composite index for recent debates queries
      CREATE INDEX IF NOT EXISTS idx_debates_timestamp_status
      ON debates(timestamp DESC, status);
    `,
);
