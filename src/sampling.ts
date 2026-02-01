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

import { CreateMessage, McpServerClient } from "@effect/ai/McpSchema";
import { Cause, Effect, Schema } from "effect";
import type { SamplingOptions } from "./schemas.ts";

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
export const sampleMessage = (options: SamplingOptions) =>
	Effect.gen(function* () {
		// Get the MCP server client from Context
		const { getClient } = yield* McpServerClient;
		const client = yield* getClient;

		// Build the request payload according to the CreateMessage schema
		const request = CreateMessage.payloadSchema.make(options);

		// Call the `sampling/createMessage` RPC method
		const result = yield* client["sampling/createMessage"](request).pipe(
			Effect.catchAllCause((cause) =>
				Effect.fail(
					new SamplingError({
						request,
						cause: Cause.squash(cause),
					}),
				),
			),
		);

		return result;
	});

export const sampleMessageFn = (options: SamplingOptions) =>
	Effect.fnUntraced(function* () {
		// Get the MCP server client from Context
		const { getClient } = yield* McpServerClient;
		const client = yield* getClient;

		// Build the request payload according to the CreateMessage schema
		const request = CreateMessage.payloadSchema.make(options);

		// Call the `sampling/createMessage` RPC method
		const result = yield* client["sampling/createMessage"](request).pipe(
			Effect.catchAllCause((cause) =>
				Effect.fail(
					new SamplingError({
						request,
						cause: Cause.squash(cause),
					}),
				),
			),
		);

		return result;
	}, Effect.scoped);

/**
 * Error thrown when MCP sampling fails
 *
 * This can happen when:
 * - The MCP client doesn't support sampling
 * - The sampling request is invalid
 * - The client declines the request
 * - Network/transport errors occur
 */
export class SamplingError extends Schema.TaggedError<SamplingError>()(
	"@effect/council-of-mine/SamplingError",
	{
		request: CreateMessage.payloadSchema,

		/**
		 * The underlying cause of the error
		 */
		cause: Schema.optional(Schema.Defect),
	},
) {}
