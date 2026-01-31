/**
 * Debate Repository
 *
 * Provides CRUD operations for debates using SQLite.
 * All operations return Effects for composability and error handling.
 */

import { SqliteClient } from "@effect/sql-sqlite-bun";
import { Context, Effect, Layer } from "effect";
import { DatabaseError, DebateNotFoundError } from "../errors.ts";
import type {
	DebateState,
	DebateSummary,
	Opinion,
	Results,
	Vote,
} from "../schemas.ts";
import { generateDebateId } from "../types.ts";

/**
 * Debate Repository Service
 */
export class DebateRepository extends Context.Tag("DebateRepository")<
	DebateRepository,
	{
		readonly create: (
			prompt: string,
			opinions: ReadonlyArray<Opinion>,
		) => Effect.Effect<string, DatabaseError>;
		readonly findById: (
			debateId: string,
		) => Effect.Effect<DebateState, DebateNotFoundError | DatabaseError>;
		readonly updateVotes: (
			debateId: string,
			votes: ReadonlyArray<Vote>,
		) => Effect.Effect<void, DatabaseError>;
		readonly updateResults: (
			debateId: string,
			results: Results,
		) => Effect.Effect<void, DatabaseError>;
		readonly listRecent: (
			limit: number,
		) => Effect.Effect<ReadonlyArray<DebateSummary>, DatabaseError>;
		readonly countInLastHour: () => Effect.Effect<number, DatabaseError>;
		readonly listAll: () => Effect.Effect<
			readonly DebateSummary[],
			DatabaseError
		>;
	}
>() {}

/**
 * Debate Repository Implementation
 */
export const DebateRepositoryLive = Layer.effect(
	DebateRepository,
	Effect.gen(function* () {
		const sql = yield* SqliteClient.SqliteClient;

		return DebateRepository.of({
			/**
			 * Create a new debate
			 */
			create: (prompt, opinions) =>
				Effect.gen(function* () {
					const debateId = generateDebateId();
					const timestamp = new Date().toISOString();

					yield* sql`
            INSERT INTO debates
            (debate_id, prompt, timestamp, status, opinions_json, votes_json)
            VALUES (
              ${debateId},
              ${prompt},
              ${timestamp},
              'collecting_opinions',
              ${JSON.stringify(opinions)},
              ${"[]"}
            )
          `.pipe(
						Effect.mapError(
							(error) =>
								new DatabaseError({
									message: `Failed to create debate: ${String(error)}`,
									operation: "create",
								}),
						),
					);

					return debateId;
				}),

			/**
			 * Find debate by ID
			 */
			findById: (debateId) =>
				Effect.gen(function* () {
					const rows = yield* sql`
            SELECT * FROM debates
            WHERE debate_id = ${debateId}
          `.pipe(
						Effect.mapError(
							(error) =>
								new DatabaseError({
									message: `Failed to find debate: ${String(error)}`,
									operation: "findById",
								}),
						),
					);

					if (rows.length === 0) {
						return yield* new DebateNotFoundError({
							message: `Debate not found: ${debateId}`,
							debate_id: debateId,
						});
					}

					const row = rows[0];

					if (!row) {
						return yield* new DebateNotFoundError({
							message: `Debate not found: ${debateId}`,
							debate_id: debateId,
						});
					}

					// Parse JSON fields
					const opinions = JSON.parse(
						row.opinions_json as string,
					) as ReadonlyArray<Opinion>;
					const votes = JSON.parse(
						row.votes_json as string,
					) as ReadonlyArray<Vote>;
					const results = row.results_json
						? (JSON.parse(row.results_json as string) as Results)
						: undefined;

					return {
						debate_id: row.debate_id as string,
						prompt: row.prompt as string,
						timestamp: row.timestamp as string,
						status: row.status as
							| "collecting_opinions"
							| "voting"
							| "completed",
						opinions,
						votes,
						results,
					} as DebateState;
				}),

			/**
			 * Update votes for a debate
			 */
			updateVotes: (debateId, votes) =>
				sql`
            UPDATE debates
            SET votes_json = ${JSON.stringify(votes)},
                updated_at = datetime('now')
            WHERE debate_id = ${debateId}
          `.pipe(
					Effect.mapError(
						(error) =>
							new DatabaseError({
								message: `Failed to update votes: ${String(error)}`,
								operation: "updateVotes",
							}),
					),
				),

			/**
			 * Update results for a debate
			 */
			updateResults: (debateId, results) =>
				sql`
            UPDATE debates
            SET results_json = ${JSON.stringify(results)},
                status = 'completed',
                updated_at = datetime('now')
            WHERE debate_id = ${debateId}
          `.pipe(
					Effect.mapError(
						(error) =>
							new DatabaseError({
								message: `Failed to update results: ${String(error)}`,
								operation: "updateResults",
							}),
					),
				),

			/**
			 * List recent debates (summary only)
			 */
			listRecent: (limit) =>
				sql`
            SELECT
              debate_id,
              prompt,
              timestamp,
              status,
              json_array_length(opinions_json) as opinion_count,
              json_array_length(votes_json) as vote_count
            FROM debates
            ORDER BY timestamp DESC
            LIMIT ${limit}
          `.pipe(
					Effect.mapError(
						(error) =>
							new DatabaseError({
								message: `Failed to list debates: ${String(error)}`,
								operation: "listRecent",
							}),
					),
					Effect.map(
						(rows) =>
							rows.map((row) => ({
								debate_id: row.debate_id as string,
								prompt: row.prompt as string,
								timestamp: row.timestamp as string,
								status: row.status as
									| "collecting_opinions"
									| "voting"
									| "completed",
								opinion_count: (row.opinion_count as number) ?? 0,
								vote_count: (row.vote_count as number) ?? 0,
							})) as ReadonlyArray<DebateSummary>,
					),
				),

			/**
			 * Count debates in the last hour (for rate limiting)
			 */
			countInLastHour: () =>
				sql`
            SELECT COUNT(*) as count
            FROM debates
            WHERE datetime(timestamp) > datetime('now', '-1 hour')
          `.pipe(
					Effect.mapError(
						(error) =>
							new DatabaseError({
								message: `Failed to count debates: ${String(error)}`,
								operation: "countInLastHour",
							}),
					),
					Effect.map((result) => (result[0]?.count as number) ?? 0),
				),

			/**
			 * List all debates (full summary)
			 */
			listAll: () =>
				sql`
            SELECT * FROM debates
            ORDER BY timestamp DESC
          `.pipe(
					Effect.mapError(
						(error) =>
							new DatabaseError({
								message: `Failed to list all debates: ${String(error)}`,
								operation: "listAll",
							}),
					),
					Effect.map(
						(rows) =>
							rows.map((row) => ({
								debate_id: row.debate_id as string,
								prompt: row.prompt as string,
								timestamp: row.timestamp as string,
								status: row.status as
									| "collecting_opinions"
									| "voting"
									| "completed",
								opinion_count: 0,
								vote_count: 0,
							})) as ReadonlyArray<DebateSummary>,
					),
				),
		});
	}),
);
