# mcp-council-of-mine

Model Context Protocol (MCP) server implementing a democratic council of 9 AI members with distinct personalities who debate topics and vote on the best perspectives.

## Features

- **9 Council Members** with unique personalities (Pragmatist, Visionary, Systems Thinker, etc.)
- **Democratic Voting** - Members vote for opinions aligning with their values
- **Transparent Results** - See all opinions, votes, reasoning, and AI synthesis
- **No API Keys** - Uses MCP protocol sampling
- **SQLite Persistence** - Fast, local debate storage
- **Security** - Rate limiting, input validation, sanitization

## Installation

```bash
bun install
cp .env.example .env
bun run dev
```

## MCP Tools

### start_council_debate
Start a new debate where all 9 members generate opinions.

### conduct_voting
Members vote for the opinion that best aligns with their perspective.

### get_results
Calculate winners, show all votes with reasoning, and generate AI synthesis.

### list_past_debates
List all historical debates.

### view_debate
View complete debate by ID.

## Development

```bash
bun run typecheck  # Type checking with @effect/language-service
bun run test       # Run tests
```

## Architecture

- **Effect TypeScript** - Compositional business logic
- **Bun Runtime** - Fast execution
- **SQLite** - Debate persistence
- **MCP Protocol** - No API keys needed

## Security

- Path traversal prevention
- Prompt injection detection
- Rate limiting (50/hour, 1000 total)
- Input sanitization
- Audit logging

## License

MIT
