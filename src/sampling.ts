/**
 * MCP Sampling Infrastructure
 *
 * This module provides a helper function for performing MCP protocol sampling
 * using the `McpServerClient` pattern, similar to the `elicit` function in
 * `@effect/ai/McpServer`.
 *
 * Key Pattern:
 * - Get `McpServerClient` from Context
 * - Get RPC `client` via `getClient`
 * - Call `sampling/createMessage` RPC method
 * - Handle errors appropriately
 *
 * @since 1.0.0
 */

import {
	CreateMessage,
	CreateMessageResult,
	McpError,
	McpServerClient,
} from "@effect/ai/McpSchema";
import * as Effect from "effect";

/**
 * Sampling options for generating a message via MCP protocol
 *
 * @property messages - Array of messages to send to the LLM
 * @property maxTokens - Maximum tokens to generate
 * @property temperature - Optional temperature (0.0 to 1.0)
 * @property systemPrompt - Optional system prompt to override
 * @property includeContext - Whether to include server context ("none" | "thisServer" | "allServers")
 */
export interface SamplingOptions {
	readonly messages: ReadonlyArray<{
		readonly role: "user" | "assistant" | "system";
		readonly content: {
			readonly type: "text";
			readonly text: string;
		};
	}>;
	readonly maxTokens: number;
	readonly temperature?: number;
	readonly systemPrompt?: string;
	readonly includeContext?: "none" | "thisServer" | "allServers";
}

/**
 * Generate a message via MCP protocol sampling
 *
 * This function performs MCP sampling by:
 * 1. Getting the `McpServerClient` from the Context
 * 2. Getting the RPC client via `getClient`
 * 3. Calling `sampling/createMessage` with the provided options
 * 4. Handling errors with `SamplingError`
 *
 * This is analogous to `ctx.sample()` in Python FastMCP, allowing the server
 * to request text generation from the MCP client (e.g., Claude Desktop).
 *
 * @param options - Sampling options (messages, maxTokens, temperature, etc.)
 * @returns Effect that produces the sampling result or fails with SamplingError
 *
 * @example
 * ```typescript
 * import * as Effect from "effect";
 * import { sampleMessage } from "./sampling";
 *
 * const program = Effect.gen(function* () {
 *   const result = yield* sampleMessage({
 *     messages: [{
 *       role: "user",
 *       content: { type: "text", text: "Generate an opinion..." }
 *     }],
 *     maxTokens: 300,
 *     temperature: 0.8
 *   });
 *
 *   console.log(result.content.text);
 * });
 * ```
 */
export const sampleMessage = (
	options: SamplingOptions,
) =>
	Effect.gen(function* () {
		// Get the MCP server client from Context
		const { getClient } = yield* McpServerClient;
		const client = yield* getClient;

		// Build the request payload according to the CreateMessage schema
		const request = CreateMessage.payloadSchema.make({
			messages: options.messages as any,
			modelPreferences: options.temperature
				? ({ hints: [{ units: "tokens", value: options.temperature }] } as any)
				: undefined,
			systemPrompt: options.systemPrompt,
			includeContext: options.includeContext ?? "none",
			maxTokens: options.maxTokens,
			stopSequences: undefined,
			metadata: undefined,
		});

		// Call the `sampling/createMessage` RPC method
		const result = yield* client["sampling/createMessage"](request).pipe(
			Effect.mapError(
				(error) =>
					new SamplingError({
						message: `MCP sampling failed: ${error.message}`,
						cause: error,
					}),
			),
		);

		return result;
	}).pipe(Effect.scoped);

/**
 * Error thrown when MCP sampling fails
 *
 * This can happen when:
 * - The MCP client doesn't support sampling
 * - The sampling request is invalid
 * - The client declines the request
 * - Network/transport errors occur
 */
export class SamplingError extends Effect.Schema.TaggedError<SamplingError>()(
	"@effect/council-of-mine/SamplingError",
	{
		/**
		 * Human-readable error message
		 */
		message: Effect.Schema.String,

		/**
		 * The underlying cause of the error
		 */
		cause: Effect.Schema.Unknown,
	},
) {}
