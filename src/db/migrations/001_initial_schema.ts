/**
 * Migration: 001_initial_schema
 *
 * Creates the debates table with all necessary columns for storing
 * council debates, opinions, votes, and results.
 */

import { SqliteClient } from "@effect/sql-sqlite-bun";
import { Effect } from "effect";

export default Effect.flatMap(
	SqliteClient.SqliteClient,
	(sql) =>
		sql`
      -- Enable foreign keys and WAL mode for better performance
      PRAGMA foreign_keys = ON;
      PRAGMA journal_mode = WAL;

      -- Create debates table
      CREATE TABLE IF NOT EXISTS debates (
        debate_id TEXT PRIMARY KEY,
        prompt TEXT NOT NULL,
        timestamp TEXT NOT NULL,
        status TEXT NOT NULL,
        opinions_json TEXT NOT NULL,
        votes_json TEXT NOT NULL,
        results_json TEXT,
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now'))
      );
    `,
);
