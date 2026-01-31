import * as Schema from "effect";
import * as S from "effect/Schema";

/**
 * Council Member Opinion
 * Generated during start_council_debate phase
 */
export const OpinionSchema = S.Struct({
	member_name: S.String,
	member_id: S.String,
	opinion: S.String,
	perspective: S.String,
});

export type Opinion = S.Schema.Type<typeof OpinionSchema>;

/**
 * Individual Vote
 * Cast during conduct_voting phase
 */
export const VoteSchema = S.Struct({
	voter_id: S.String,
	voter_name: S.String,
	voted_for_id: S.String,
	voted_for_member: S.String,
	reasoning: S.String,
});

export type Vote = S.Schema.Type<typeof VoteSchema>;

/**
 * Debate Results
 * Computed during get_results phase
 */
export const ResultsSchema = S.Struct({
	status: S.Union(
		S.Literal("in_progress"),
		S.Literal("voting_complete"),
		S.Literal("results_ready"),
	),
	winner_ids: S.Array(S.String),
	winner_names: S.Array(S.String),
	synthesis: S.String,
	timestamp: S.String,
});

export type Results = S.Schema.Type<typeof ResultsSchema>;

/**
 * Complete Debate State
 * Stored in SQLite as JSON
 */
export const DebateStateSchema = S.Struct({
	debate_id: S.String,
	prompt: S.String,
	timestamp: S.String,
	opinions: S.Array(OpinionSchema),
	votes: S.Array(VoteSchema),
	results: S.optional(ResultsSchema),
});

export type DebateState = S.Schema.Type<typeof DebateStateSchema>;

/**
 * Debate Summary for List View
 * Returned by list_past_debates
 */
export const DebateSummarySchema = S.Struct({
	debate_id: S.String,
	prompt: S.String,
	timestamp: S.String,
	opinion_count: S.Number,
	vote_count: S.Number,
	status: S.Union(
		S.Literal("in_progress"),
		S.Literal("voting_complete"),
		S.Literal("results_ready"),
	),
});

export type DebateSummary = S.Schema.Type<typeof DebateSummarySchema>;

/**
 * Sampling Message for MCP Protocol
 * Used in sampleMessage helper
 */
export const SamplingMessageContentSchema = S.Union(
	S.Struct({
		type: S.Literal("text"),
		text: S.String,
	}),
	S.Struct({
		type: S.Literal("image"),
		data: S.String,
		mimeType: S.optional(S.String),
	}),
);

export type SamplingMessageContent = S.Schema.Type<
	typeof SamplingMessageContentSchema
>;

export const SamplingMessageSchema = S.Struct({
	role: S.Union(S.Literal("user"), S.Literal("assistant"), S.Literal("system")),
	content: S.Union(
		SamplingMessageContentSchema,
		S.Array(SamplingMessageContentSchema),
	),
});

export type SamplingMessage = S.Schema.Type<typeof SamplingMessageSchema>;
