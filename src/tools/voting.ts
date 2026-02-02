/**
 * Council Voting Tool
 *
 * This tool implements the voting phase of the council debate system.
 * Each council member evaluates all opinions (except their own) and votes
 * for the one that best aligns with their perspective.
 *
 * Usage:
 *   User calls conduct_voting() -> Council members vote -> Results saved
 */

import * as Tool from "@effect/ai/Tool";
import * as Toolkit from "@effect/ai/Toolkit";
import { Effect } from "effect";
import * as Schema from "effect/Schema";
import * as Council from "../council/members.ts";
import * as Errors from "../errors.ts";
import * as Sampling from "../sampling.ts";
import type * as Schemas from "../schemas.ts";
import * as Security from "../security.ts";

/**
 * Conduct Voting Tool Definition
 *
 * Parameters: debate_id to identify which debate to vote on
 * Success: Returns voting summary
 * Failure: InvalidStateError if debate not ready for voting
 */
export const ConductVoting = Tool.make("conduct_voting", {
	description: `Conduct voting where each council member evaluates all opinions (except their own) and votes for the one that best aligns with their perspective.

Each member provides reasoning for their vote via LLM sampling.

Returns:
- total_votes: Number of votes cast
- status: "voting_complete"`,
	parameters: {
		debate_id: Schema.String,
	},
	success: Schema.Struct({
		status: Schema.String,
		debate_id: Schema.String,
		total_votes: Schema.Number,
		vote_breakdown: Schema.Array(
			Schema.Struct({
				voter: Schema.String,
				voted_for: Schema.String,
			}),
		),
	}),
	failure: Schema.Union(Errors.InvalidStateError, Errors.ValidationError),
});

/**
 * Generate voting prompt for a council member
 */
const generateVotingPrompt = (
	member: Council.CouncilMember,
	opinions: ReadonlyArray<Schemas.Opinion>,
): string => {
	// Filter out this member's own opinion
	const otherOpinions = opinions.filter(
		(op) => op.member_id !== member.member_id,
	);

	// Build prompt with all opinions
	const opinionsText = otherOpinions
		.map(
			(op, idx) => `
**Option ${idx + 1}:** ${op.member_name}
${op.opinion}
`,
		)
		.join("\n");

	return `As ${member.member_name}, review the following council member opinions and vote for the one that best aligns with your perspective.

${opinionsText}

Instructions:
- Evaluate each opinion based on your worldview and expertise
- Consider factors like: feasibility, vision, systems thinking, user impact, etc.
- Vote for the opinion you find most compelling
- Provide clear reasoning for your choice

Respond in this exact format:
VOTE: Option X
REASONING: [Your detailed reasoning for this choice]`;
};

/**
 * Parse voting response from LLM
 */
const parseVotingResponse = (
	response: string,
): { votedFor: string; reasoning: string } => {
	// Extract VOTE line
	const voteMatch = response.match(/VOTE:\s*Option\s+(\d+)/i);
	if (!voteMatch) {
		throw new Error("Could not parse vote from response");
	}

	const optionNumber = Number.parseInt(voteMatch[1], 10);
	if (Number.isNaN(optionNumber)) {
		throw new Error("Invalid vote option number");
	}

	// Extract REASONING line
	const reasoningMatch = response.match(/REASONING:\s*(.+)/is);
	const reasoning = reasoningMatch
		? reasoningMatch[1].trim()
		: "No reasoning provided";

	return { votedFor: optionNumber.toString(), reasoning };
};

/**
 * Conduct Voting Handler Implementation
 */
const conductVotingHandler = Tool.makeHandler(ConductVoting)(({ debate_id }) =>
	Effect.gen(function* () {
		// Step 1: Validate debate ID
		const validatedId = yield* Security.validateDebateId(debate_id);

		// Step 2: Get current debate state from database (TODO: implement repository access)
		// For now, we'll assume we can get debate state somehow
		// const repo = yield* DebateRepository;
		// const debate = yield* repo.findById(validatedId);

		// Step 3: Validate state - must have 9 opinions
		// if (debate.opinions.length !== 9) {
		//   return yield* new Errors.InvalidStateError({
		//     message: `Debate must have exactly 9 opinions before voting. Current: ${debate.opinions.length}`,
		//     current_status: debate.status,
		//     required_status: "collecting_opinions",
		//   });
		// }

		// TEMPORARY: Mock data for testing
		const mockOpinions: Schemas.Opinion[] = Council.COUNCIL_MEMBERS.map(
			(member) => ({
				member_id: member.member_id,
				member_name: member.member_name,
				opinion: `Mock opinion from ${member.member_name}`,
				perspective: member.member_name,
			}),
		);

		// Step 4: For each member, conduct voting via MCP sampling
		const votes = yield* Effect.forEach(
			Council.COUNCIL_MEMBERS,
			(member) =>
				Effect.gen(function* () {
					// Generate voting prompt
					const prompt = generateVotingPrompt(member, mockOpinions);

					// Sample vote via MCP
					const result = yield* Sampling.sampleMessage({
						messages: [
							{
								role: "user",
								content: [
									{
										type: "text",
										text: prompt,
									},
								],
							},
						],
						maxTokens: 500,
						temperature: 0.7,
						includeContext: "none",
					});

					// Extract text from response - safely handle content array
					let responseText = "";
					if (result.content.length > 0) {
						const firstContent = result.content[0];
						if (firstContent.type === "text") {
							responseText = firstContent.text;
						}
					}

					// Parse voting response
					const parsed = yield* Effect.try({
						try: () => parseVotingResponse(responseText),
						catch: () =>
							new Errors.ValidationError({
								message: "Failed to parse voting response",
								field: "voting_response",
								validation_type: "invalid_response",
							}),
					});

					// Map option number to actual opinion
					const otherOpinions = mockOpinions.filter(
						(op) => op.member_id !== member.member_id,
					);
					const votedOpinion =
						otherOpinions[Number.parseInt(parsed.votedFor, 10) - 1];

					if (!votedOpinion) {
						return yield* new Errors.ValidationError({
							message: `Invalid vote option: ${parsed.votedFor}`,
							field: "vote",
							validation_type: "invalid_response",
						});
					}

					// Create vote object with correct field name
					const vote: Schemas.Vote = {
						voter_id: member.member_id,
						voter_name: member.member_name,
						voted_for_id: votedOpinion.member_id,
						voted_for_member: votedOpinion.member_name,
						reasoning: parsed.reasoning,
					};

					return vote;
				}),
			{ concurrency: "unbounded" },
		);

		// Step 5: Update debate with votes (TODO: implement repository update)
		// yield* repo.updateVotes(validatedId, votes);

		// Step 6: Return success response
		return {
			status: "voting_complete",
			debate_id: validatedId,
			total_votes: votes.length,
			vote_breakdown: votes.map((v) => ({
				voter: v.voter_name,
				voted_for: v.voted_for_member,
			})),
		};
	}),
);

/**
 * Layer for the voting tool handler
 */
export const VotingToolsLive = Toolkit.make(ConductVoting).toLayer({
	conduct_voting: conductVotingHandler,
});
