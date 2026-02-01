# MCP Sampling Schema Discrepancy Research

**Date:** 2026-02-01  
**Context:** Implementation of `mcp-council-of-mine` using @effect/ai  
**Status:** 🔍 Active Investigation

---

## Problem Description

When implementing `sampleMessage()` function using `@effect/ai/McpSchema.CreateMessage`, discovered that the response schema (`CreateMessageResult`) is incomplete compared to the MCP specification.

---

## MCP Specification vs @effect/ai Implementation

### MCP Spec (sampling/createMessage Response)

According to [MCP Client Sampling Spec](https://modelcontextprotocol.io/specification/2025-06-18/client/sampling):

```json
{
  "role": "assistant",
  "content": {
    "type": "text",
    "text": "Generated response text..."
  },
  "model": "claude-3-sonnet-20240307",
  "stopReason": "endTurn"
}
```

**Required Fields:**
- ✅ `role` - "assistant"
- ✅ `content` - ContentBlock (TextContent or ImageContent)
- ✅ `model` - Model identifier
- ✅ `stopReason` - "endTurn" | "maxTokens" | "stopSequence" | "error"

### @effect/ai Implementation

**File:** `node_modules/@effect/ai/src/McpSchema.ts` (lines 1428-1435)

```typescript
export class CreateMessageResult extends Schema.Class<CreateMessageResult>("CreateMessageResult", {
  model: Schema.String,
  stopReason: Schema.Literal("endTurn", "maxTokens", "stopSequence", "error")
}) {}
```

**Missing Fields:**
- ❌ `role` - Not present!
- ❌ `content` - Not present!

**Available Fields:**
- ✅ `model` - Present
- ✅ `stopReason` - Present

---

## Impact on Implementation

### Current Code Attempt (src/tools/debate.ts)

```typescript
const result = yield* sampleMessage({
  messages: [{
    role: "user",
    content: {
      type: "text",
      text: sanitizedPrompt
    }
  }],
  maxTokens: 300,
  temperature: 0.8,
  systemPrompt: memberPrompt
});

const opinionText = result.content; // ❌ TypeScript Error: Property 'content' does not exist
```

### TypeScript Error

```
TS2339: Property 'content' does not exist on type 'CreateMessageResult'.
```

---

## Possible Explanations

### 1. **@effect/ai Schema Incomplete**
The library may have an incomplete schema definition that doesn't match the MCP spec.

**Evidence:**
- Schema clearly missing `role` and `content` fields
- MCP spec explicitly requires these fields
- No other `CreateMessageResult` variant found

### 2. **Different Response Mechanism**
Maybe the actual message content comes through a different channel:
- Notifications?
- Separate RPC response wrapper?
- Streaming updates?

**Evidence:**
- Need to investigate actual RPC response structure
- Check if `McpServerClient` provides additional data

### 3. **Implementation-Specific Behavior**
@effect/ai may handle sampling differently than raw MCP protocol.

**Evidence:**
- Check examples in @effect/ai repository
- Look for test files showing actual usage

---

## Next Steps (Variant A)

1. **Investigate Actual RPC Response**
   - Add logging to see what actually returns
   - Check if response has additional properties not in schema
   - Verify runtime vs compile-time types

2. **Check @effect/ai Examples**
   - Search for sampling examples in codebase
   - Look for test files using `CreateMessage`
   - Check documentation for usage patterns

3. **Alternative Approaches**
   - Maybe use `Chat` API instead of direct sampling?
   - Check if `elicit` pattern has different response structure
   - Consider custom schema extension

---

## Relevant Code Locations

### @effect/ai Source Files

- `node_modules/@effect/ai/src/McpSchema.ts` - Schema definitions
  - Line 1428-1435: `CreateMessageResult` definition
  - Line 1340-1360: `SamplingMessage` definition (has content!)
  - Line 1350-1400: `ModelPreferences` definition

- `node_modules/@effect/ai/src/McpServer.ts`
  - Line 1190-1240: `elicit` function (similar pattern)

### Project Files

- `src/schemas.ts` - `SamplingOptions` type alias
- `src/sampling.ts` - `sampleMessage()` implementation
- `src/tools/debate.ts` - Usage attempt (line 89)

---

## Related Schemas Found

### ContentBlock Types
- `TextContent` - `{ type: "text", text: string }`
- `ImageContent` - `{ type: "image", data: string, mimeType: string }`
- `ResourceContents` - Array of content blocks

### Message Types
- `SamplingMessage` - `{ role: "user"|"assistant", content: ContentBlock }`
- `PromptMessage` - Similar structure
- `CreateMessage` payload uses `SamplingMessage[]` for messages

---

## Hypothesis

**The `CreateMessageResult` schema is likely incomplete in @effect/ai.**

The actual RPC response probably includes the full message with role and content, but the TypeScript schema doesn't reflect this. This could be:
- A bug in @effect/ai
- An intentional design decision (content delivered separately)
- A documentation discrepancy

**Test Strategy:** Add runtime logging to see actual response shape, then work around or extend schema as needed.

---

## References

- [MCP Client Sampling Spec](https://modelcontextprotocol.io/specification/2025-06-18/client/sampling)
- @effect/ai repository: https://github.com/Effect-TS/effect/tree/main/packages/ai
- Python FastMCP ctx.sample() implementation (reference)
