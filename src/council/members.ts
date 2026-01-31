/**
 * Council Members Definitions
 *
 * Nine unique AI personalities with distinct worldviews, thinking styles,
 * and perspectives for balanced debate and decision-making.
 */

import * as FileSystem from "@effect/platform/FileSystem";
import { Effect } from "effect";
import * as S from "effect/Schema";

/**
 * Individual Council Member
 */
export class CouncilMember extends S.Class<CouncilMember>("CouncilMember")({
	/**
	 * Unique member identifier (e.g., "pragmatist", "visionary")
	 */
	member_id: S.String,
	/**
	 * Display name with emoji (e.g., "🔧 The Pragmatist")
	 */
	member_name: S.String,
	/**
	 * Path to system prompt markdown file
	 */
	prompt_path: S.String,
	/**
	 * Additional context for opinion generation
	 */
	prompt_context: S.String,
}) {}

/**
 * All 9 Council Members
 */
export const COUNCIL_MEMBERS: ReadonlyArray<CouncilMember> = [
	{
		member_id: "pragmatist",
		member_name: "🔧 The Pragmatist",
		prompt_path: "src/council/prompts/pragmatist.md",
		prompt_context: `Focus on practicality, feasibility, and real-world constraints.
Consider resource limitations, time constraints, and implementation challenges.
Prefer simple, tested approaches over experimental ones.`,
	},
	{
		member_id: "visionary",
		member_name: "🌟 The Visionary",
		prompt_path: "src/council/prompts/visionary.md",
		prompt_context: `Focus on long-term potential and transformative possibilities.
Consider how this could be revolutionary rather than just incremental.
Embrace ambitious ideas even if they seem challenging today.`,
	},
	{
		member_id: "systems_thinker",
		member_name: "🔗 The Systems Thinker",
		prompt_path: "src/council/prompts/systems_thinker.md",
		prompt_context: `Focus on system-level effects and interconnections.
Consider feedback loops, dependencies, and cascading consequences.
Look for patterns and second-order effects.`,
	},
	{
		member_id: "optimist",
		member_name: "😊 The Optimist",
		prompt_path: "src/council/prompts/optimist.md",
		prompt_context: `Focus on opportunities and positive possibilities.
Emphasize strengths, advantages, and potential benefits.
Approach challenges with enthusiasm and confidence.`,
	},
	{
		member_id: "devils_advocate",
		member_name: "😈 The Devil's Advocate",
		prompt_path: "src/council/prompts/devils_advocate.md",
		prompt_context: `Focus on potential flaws, risks, and alternative viewpoints.
Challenge assumptions and explore what could go wrong.
Ask the questions others might be afraid to ask.`,
	},
	{
		member_id: "mediator",
		member_name: "🤝 The Mediator",
		prompt_path: "src/council/prompts/mediator.md",
		prompt_context: `Focus on finding common ground and shared interests.
Look for ways to integrate different perspectives into a balanced solution.
Emphasize collaboration and mutual understanding.`,
	},
	{
		member_id: "user_advocate",
		member_name: "👥 The User Advocate",
		prompt_path: "src/council/prompts/user_advocate.md",
		prompt_context: `Focus on user experience, accessibility, and inclusion.
Consider diverse user needs and potential barriers.
Prioritize intuitive, user-friendly design.`,
	},
	{
		member_id: "traditionalist",
		member_name: "📜 The Traditionalist",
		prompt_path: "src/council/prompts/traditionalist.md",
		prompt_context: `Focus on historical precedents and proven methods.
Consider what has worked well in the past and why.
Value stability and evolution over revolution.`,
	},
	{
		member_id: "analyst",
		member_name: "📊 The Analyst",
		prompt_path: "src/council/prompts/analyst.md",
		prompt_context: `Focus on data, metrics, and objective evidence.
Break down problems systematically and quantifiably.
Demand evidence for claims and predictions.`,
	},
];

/**
 * Load system prompt from markdown file
 */
export const loadSystemPrompt = (memberId: string) => {
	const member = COUNCIL_MEMBERS.find((m) => m.member_id === memberId);
	if (!member) {
		return Effect.dieMessage(`Member not found: ${memberId}`);
	}

	return Effect.gen(function* () {
		const fs = yield* FileSystem.FileSystem;
		return yield* fs.readFileString(member.prompt_path);
	});
};

/**
 * Get council member by ID
 */
export const getMemberById = (memberId: string): CouncilMember | undefined => {
	return COUNCIL_MEMBERS.find((m) => m.member_id === memberId);
};

/**
 * Get all council member IDs
 */
export const getMemberIds = (): string[] => {
	return COUNCIL_MEMBERS.map((m) => m.member_id);
};

/**
 * Validate member ID
 */
export const isValidMemberId = (memberId: string): boolean => {
	return getMemberIds().includes(memberId);
};
