/**
 * Type-level utilities and helpers for Council of Mine
 */

/**
 * Generate unique debate ID based on timestamp
 */
export const generateDebateId = (): string => {
	const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
	return `${timestamp}`;
};

/**
 * Extract member ID from member name
 */
export const memberIdFromName = (name: string): string => {
	return name
		.toLowerCase()
		.replace(/\s+/g, "-")
		.replace(/[^a-z0-9-]/g, "");
};

/**
 * Get current timestamp in ISO format
 */
export const currentTimestamp = (): string => {
	return new Date().toISOString();
};

/**
 * Validate debate ID format
 * Format: YYYY-MM-DDTHH-MM-SS-sssZ
 */
export const isValidDebateId = (id: string): boolean => {
	const regex = /^\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}-\d{3}Z$/;
	return regex.test(id);
};

/**
 * Calculate vote totals from votes array
 */
export interface VoteTotals {
	opinion_id: string;
	count: number;
}

export const calculateVoteTotals = (
	votes: Array<{ voted_for_id: string }>,
): VoteTotals[] => {
	const totals = new Map<string, number>();

	for (const vote of votes) {
		const current = totals.get(vote.voted_for_id) ?? 0;
		totals.set(vote.voted_for_id, current + 1);
	}

	return Array.from(totals.entries())
		.map(([opinion_id, count]) => ({ opinion_id, count }))
		.sort((a, b) => b.count - a.count);
};

/**
 * Get winners from vote totals
 * Returns all opinions tied for highest votes
 */
export const getWinners = (
	votes: Array<{ voted_for_id: string }>,
): string[] => {
	const totals = calculateVoteTotals(votes);

	if (totals.length === 0) {
		return [];
	}

	const maxCount = totals[0]?.count ?? 0;
	return totals.filter((t) => t.count === maxCount).map((t) => t.opinion_id);
};

/**
 * Truncate text to max length
 */
export const truncateText = (
	text: string,
	maxLength: number,
	suffix = "...",
): string => {
	if (text.length <= maxLength) {
		return text;
	}
	return text.substring(0, maxLength - suffix.length) + suffix;
};

/**
 * Clean and normalize text
 */
export const cleanText = (text: string): string => {
	return text
		.replace(/\r\n/g, "\n")
		.replace(/\n{3,}/g, "\n\n")
		.trim();
};
