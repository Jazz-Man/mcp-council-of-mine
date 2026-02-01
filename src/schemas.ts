import type { CreateMessage } from "@effect/ai/McpSchema";
import * as S from "effect/Schema";

// ==============================================================================
// CUSTOM MCP SAMPLING SCHEMAS (Full MCP Spec Compliance)
// ==============================================================================

/**
 * Text content block for sampling responses
 */
export const TextContentSchema = S.Struct({
	type: S.Literal("text"),
	text: S.String,
});

/**
 * Image content block for sampling responses
 */
export const ImageContentSchema = S.Struct({
	type: S.Literal("image"),
	data: S.String,
	mimeType: S.String,
});

/**
 * Union of all content block types
 */
export const ContentBlockSchema = S.Union(
	TextContentSchema,
	ImageContentSchema,
);

/**
 * Full CreateMessage result schema (MCP spec compliant)
 *
 * According to MCP spec, sampling/createMessage response includes:
 * - role: "assistant"
 * - content: Array of content blocks (text or image)
 * - model: Model identifier
 * - stopReason: Why generation stopped
 *
 * Note: @effect/ai's CreateMessageResult is incomplete (missing role and content)
 * This custom schema provides the full specification.
 */
export const CreateMessageResultSchema = S.Struct({
	role: S.Literal("assistant"),
	content: S.Array(ContentBlockSchema),
	model: S.String,
	stopReason: S.Literal("endTurn", "maxTokens", "stopSequence", "error"),
});

export type CreateMessageResult = S.Schema.Type<
	typeof CreateMessageResultSchema
>;

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
		S.Literal("collecting_opinions"),
		S.Literal("voting"),
		S.Literal("completed"),
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

export type SamplingOptions = S.Schema.Type<typeof CreateMessage.payloadSchema>;

export type SamplingMessage = S.Schema.Type<typeof SamplingMessageSchema>;
