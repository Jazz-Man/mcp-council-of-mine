import * as S from "effect/Schema";

/**
 * Error hierarchy for Council of Mine MCP Server
 * All errors extend CouncilError base
 */

/**
 * Base Error for all Council of Mine errors
 */
export class CouncilError extends S.TaggedError<CouncilError>()(
	"CouncilError",
	{
		message: S.String,
		details: S.optional(S.Unknown),
	},
) {}

/**
 * Debate Not Found Error
 * Raised when viewing a non-existent debate
 */
export class DebateNotFoundError extends S.TaggedError<DebateNotFoundError>(
	"@effect/council-of-mine/DebateNotFoundError",
)("DebateNotFoundError", {
	message: S.String,
	debate_id: S.String,
}) {}

/**
 * Validation Error
 * Raised when input validation fails (prompt injection, path traversal, etc.)
 */
export class ValidationError extends S.TaggedError<ValidationError>(
	"@effect/council-of-mine/ValidationError",
)("ValidationError", {
	message: S.String,
	field: S.optional(S.String),
	validation_type: S.optional(
		S.Union(
			S.Literal("prompt_injection"),
			S.Literal("path_traversal"),
			S.Literal("invalid_debate_id"),
			S.Literal("empty_prompt"),
			S.Literal("sanitization_failed"),
		),
	),
}) {}

/**
 * Rate Limit Error
 * Raised when rate limit is exceeded
 */
export class RateLimitError extends S.TaggedError<RateLimitError>(
	"@effect/council-of-mine/RateLimitError",
)("RateLimitError", {
	message: S.String,
	limit_type: S.Union(S.Literal("hourly"), S.Literal("total")),
	current_count: S.Number,
	limit: S.Number,
	retry_after_seconds: S.optional(S.Number),
}) {}

/**
 * Database Error
 * Raised when database operations fail
 */
export class DatabaseError extends S.TaggedError<DatabaseError>(
	"@effect/council-of-mine/DatabaseError",
)("DatabaseError", {
	message: S.String,
	operation: S.optional(S.String),
	details: S.optional(S.Unknown),
}) {}

/**
 * Sampling Error
 * Raised when MCP sampling fails
 */
export class SamplingError extends S.TaggedError<SamplingError>(
	"@effect/council-of-mine/SamplingError",
)("SamplingError", {
	message: S.String,
	member_name: S.optional(S.String),
	details: S.optional(S.Unknown),
}) {}

/**
 * Invalid State Error
 * Raised when an operation is called in wrong state
 * (e.g., conduct_voting before start_council_debate)
 */
export class InvalidStateError extends S.TaggedError<InvalidStateError>(
	"@effect/council-of-mine/InvalidStateError",
)("InvalidStateError", {
	message: S.String,
	current_status: S.optional(S.String),
	required_status: S.optional(S.String),
}) {}

/**
 * MCP Client Error
 * Raised when MCP client is not available
 */
export class McpClientError extends S.TaggedError<McpClientError>(
	"@effect/council-of-mine/McpClientError",
)("McpClientError", {
	message: S.String,
	details: S.optional(S.Unknown),
}) {}
