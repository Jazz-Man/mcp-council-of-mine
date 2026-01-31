/**
 * Security utilities for input validation, sanitization, and rate limiting
 *
 * Based on Python security features from mcp-council-of-mine
 */

import { Effect, Option } from "effect";
import { DebateRepository } from "./db/repository.ts";
import { ValidationError } from "./errors.ts";

/**
 * Validate debate ID to prevent path traversal attacks
 *
 * Rules:
 * - Must match format: YYYYMMDD_HHMMSS_XXXXXXXXXXXX
 * - No path separators (/ or \)
 * - No special characters that could be used for traversal
 * - Max 64 characters
 */
export const validateDebateId = (debateId: string) =>
	Effect.gen(function* () {
		// Check length
		if (debateId.length > 64) {
			return yield* new ValidationError({
				message: `Debate ID too long: ${debateId.length} characters (max 64)`,
				validation_type: "debate_id_length",
			});
		}

		// Check for path traversal patterns
		const traversalPatterns = ["..", "/", "\\", "\0"];
		for (const pattern of traversalPatterns) {
			if (debateId.includes(pattern)) {
				return yield* new ValidationError({
					message: `Invalid debate ID: contains path traversal pattern`,
					validation_type: "path_traversal",
				});
			}
		}

		// Check format: YYYYMMDD_HHMMSS_XXXXXXXXXXXX
		const formatRegex = /^\d{8}_\d{6}_[a-z0-9]{12}$/;
		if (!formatRegex.test(debateId)) {
			return yield* new ValidationError({
				message: `Invalid debate ID format: ${debateId}`,
				validation_type: "debate_id_format",
			});
		}

		return debateId;
	});

/**
 * Validate prompt to prevent prompt injection attacks
 *
 * Rules:
 * - Max 5000 characters
 * - Check for common injection patterns
 * - Warn about suspicious content
 */
export const validatePrompt = (prompt: string) =>
	Effect.gen(function* () {
		// Check length
		if (prompt.length === 0) {
			return yield* new ValidationError({
				message: "Prompt cannot be empty",
				validation_type: "empty_prompt",
			});
		}

		if (prompt.length > 5000) {
			return yield* new ValidationError({
				message: `Prompt too long: ${prompt.length} characters (max 5000)`,
				validation_type: "prompt_length",
			});
		}

		// Check for prompt injection patterns
		const injectionPatterns = [
			/ignore\s+(all\s+)?(previous|above)/gi,
			/disregard\s+(all\s+)?(previous|above)/gi,
			/forget\s+(all\s+)?(previous|above)/gi,
			/new\s+(conversation|chat)/gi,
			/override\s+instructions/gi,
			/admin\s+mode/gi,
			/system\s+prompt/gi,
		];

		const detectedInjections: string[] = [];
		for (const pattern of injectionPatterns) {
			if (pattern.test(prompt)) {
				detectedInjections.push(pattern.source);
			}
		}

		if (detectedInjections.length > 0) {
			return yield* new ValidationError({
				message: `Prompt injection detected: ${detectedInjections.join(", ")}`,
				validation_type: "prompt_injection",
			});
		}

		return prompt;
	});

/**
 * Sanitize text by removing or replacing dangerous characters
 *
 * This is a lighter version of validation - it cleans the text
 * rather than rejecting it entirely
 */
export const sanitizeText = (text: string, maxLength = 10000): string => {
	// Remove null bytes
	let sanitized = text.replace(/\0/g, "");

	// Remove control characters except newlines and tabs
	// biome-ignore lint/suspicious/noControlCharactersInRegex - We need to match control characters for security sanitization
	sanitized = sanitized.replace(
		/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g,
		"",
	);

	// Truncate if too long
	if (sanitized.length > maxLength) {
		sanitized = sanitized.substring(0, maxLength);
	}

	return sanitized;
};

/**
 * Extract safe text from potentially dangerous content
 *
 * This is used for extracting text from LLM responses or user input
 * where we want to be extra careful about what we extract
 */
export const safeExtractText = (content: string): string => {
	// First sanitize
	let text = sanitizeText(content);

	// Remove common markdown code block markers
	text = text.replace(/```[\w]*\n?/g, "");

	// Remove excessive whitespace (but keep single newlines)
	text = text.replace(/\n{3,}/g, "\n\n");
	text = text.replace(/[ \t]{2,}/g, " ");

	return text.trim();
};

/**
 * Rate limiting configuration
 */
export const RATE_LIMITS = {
	HOURLY_LIMIT: 50,
	TOTAL_LIMIT: 1000,
} as const;

/**
 * Check rate limits before starting a new debate
 *
 * Rules:
 * - Max 50 debates per hour
 * - Max 1000 total debates
 */
export const checkRateLimits = () =>
	Effect.gen(function* () {
		const repository = yield* DebateRepository;

		// Check hourly limit
		const hourlyCount = yield* repository.countInLastHour();
		if (hourlyCount >= RATE_LIMITS.HOURLY_LIMIT) {
			return yield* new ValidationError({
				message: `Rate limit exceeded: ${hourlyCount}/50 debates in the last hour`,
				field: "hourly",
				validation_type: "rate_limit_hourly",
			});
		}

		// Check total limit
		const totalCount = yield* repository.listAll();
		const total = totalCount.length;
		if (total >= RATE_LIMITS.TOTAL_LIMIT) {
			return yield* new ValidationError({
				message: `Rate limit exceeded: ${total}/1000 total debates`,
				field: "total",
				validation_type: "rate_limit_total",
			});
		}

		// Return current limits status
		return {
			hourlyUsed: hourlyCount,
			hourlyRemaining: RATE_LIMITS.HOURLY_LIMIT - hourlyCount,
			totalUsed: total,
			totalRemaining: RATE_LIMITS.TOTAL_LIMIT - total,
		};
	});

/**
 * Build a safe prompt for council members by sanitizing the user prompt
 * and adding safety context
 */
export const buildSafePrompt = (
	userPrompt: string,
	additionalContext = "",
): string => {
	const sanitized = sanitizeText(userPrompt);
	const sanitizedContext = additionalContext
		? sanitizeText(additionalContext)
		: "";

	return [
		"Please provide your opinion on the following topic:",
		"",
		sanitized,
		sanitizedContext ? `\n\nAdditional context:\n${sanitizedContext}` : "",
	].join("\n");
};

/**
 * Validate and sanitize a user's debate prompt
 *
 * This combines validation and sanitization for a complete security check
 */
export const validateAndSanitizePrompt = (prompt: string) =>
	Effect.gen(function* () {
		// First validate
		const validPrompt = yield* validatePrompt(prompt);

		// Then sanitize
		const sanitized = sanitizeText(validPrompt);

		return sanitized;
	});
