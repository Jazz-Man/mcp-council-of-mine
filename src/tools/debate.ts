/**
 * Council Debate Tool
 *
 * Implements the start_council_debate tool that generates opinions
 * from all 9 council members via MCP sampling.
 */

import * as Tool from "@effect/ai/Tool";
import * as Toolkit from "@effect/ai/Toolkit";
import { Effect } from "effect";
import * as Schema from "effect/Schema";
import { COUNCIL_MEMBERS, loadSystemPrompt } from "../council/members.ts";
import { DebateRepository } from "../db/repository.ts";
import { InvalidStateError, ValidationError } from "../errors.ts";
import { sampleMessage } from "../sampling.ts";
import type { Opinion } from "../schemas.ts";
import { checkRateLimits, validateAndSanitizePrompt } from "../security.ts";
import { generateDebateId } from "../types.ts";

/**
 * Tool definition for starting a council debate
 */
export const StartDebate = Tool.make("start_council_debate", {
	description:
		"Start a new council debate where all 9 members provide opinions",
	parameters: {
		prompt: Schema.String,
	},
	success: Schema.Struct({
		status: Schema.String,
		debate_id: Schema.String,
		opinion_count: Schema.Number,
	}),
	failure: Schema.Union(ValidationError, InvalidStateError),
});

/**
 * Handler implementation for starting a debate
 */
export const startDebateHandler = ({ prompt }: { prompt: string }) =>
	Effect.gen(function* () {
		// Step 1: Validate and sanitize prompt
		const safePrompt = yield* validateAndSanitizePrompt(prompt);

		// Step 2: Check rate limits
		const rateLimitStatus = yield* checkRateLimits();
		if (
			rateLimitStatus.hourlyRemaining === 0 ||
			rateLimitStatus.totalRemaining === 0
		) {
			return yield* new ValidationError({
				message: "Rate limit exceeded",
				field: "prompt",
				validation_type: "rate_limit_hourly",
			});
		}

		// Step 3: Generate debate ID
		const debateId = generateDebateId();

		// Step 4: Generate opinions for all 9 council members
		const opinions = yield* Effect.all(
			COUNCIL_MEMBERS.map((member) =>
				Effect.gen(function* () {
					// Load system prompt
					const systemPrompt = yield* loadSystemPrompt(member.member_id);

					// Build sampling message
					const result = yield* sampleMessage({
						messages: [
							{
								role: "user",
								content: {
									type: "text",
									text: `As ${member.member_name}, provide your opinion on: ${safePrompt}`,
								},
							},
						],
						maxTokens: 300,
						temperature: 0.8,
						systemPrompt,
						includeContext: "none",
						metadata: undefined,
					});

					// Extract text from result
					const text = yield* Effect.try({
						try: () => {
							const content = result.content;
							if (
								typeof content === "object" &&
								content !== null &&
								"type" in content &&
								content.type === "text" &&
								"text" in content
							) {
								return content.text;
							}
							return "";
						},
						catch: () =>
							new ValidationError({
								message: "Failed to extract opinion text",
								field: "opinion",
								validation_type: "prompt_length",
							}),
					});

					// Create opinion object
					const opinion: Opinion = {
						member_id: member.member_id,
						member_name: member.member_name,
						opinion: text,
						perspective: member.member_name,
					};

					return opinion;
				}),
			),
			{ concurrency: "unbounded" },
		);

		// Step 5: Persist to database
		const repo = yield* DebateRepository;
		yield* repo.create(safePrompt, opinions);

		// Step 6: Return success response
		return {
			status: "debate_started",
			debate_id: debateId,
			opinion_count: opinions.length,
		};
	}) as Effect.Effect<
		{ status: string; debate_id: string; opinion_count: number },
		ValidationError | InvalidStateError,
		never
	>;

/**
 * Layer for the debate tool handler
 */
export const DebateToolsLive = Toolkit.make(StartDebate).toLayer({
	start_council_debate: startDebateHandler,
});
