# n8n AI Agent Nodes

Custom n8n nodes for AI Agent with full features using Vercel AI SDK.

## Features

- **Multi-Provider Support**: OpenAI and Anthropic compatible APIs
- **Custom Provider Endpoint**: Use any OpenAI-compatible API endpoint
- **ToolLoopAgent**: Full AI agent capabilities with reasoning loop
- **Skills/Tools**: Define custom tools for the agent to use
- **Memory**: Core and archival memory support
- **References**: Add context via URLs, documents, or knowledge base
- **Streaming**: Stream responses for real-time output
- **Conversation Context**: Maintain state across interactions

## Installation

```bash
npm install
npm run build
```

## Configuration

### Credentials

Create an AI API credential in n8n with:

- **Provider Type**: OpenAI, Anthropic, or Custom (OpenAI Compatible)
- **API Key**: Your API key
- **Base URL**: Custom endpoint (for custom providers)

### Node Parameters

| Parameter | Description |
|-----------|-------------|
| Provider / Model | Model identifier (e.g., `openai/gpt-4o` or `anthropic/claude-sonnet-4.7`) |
| System Instructions | Define agent behavior and capabilities |
| Max Steps | Maximum reasoning steps (default: 20) |
| Temperature | Randomness control (0-2, default: 0.7) |
| Max Output Tokens | Maximum response length |
| Tool Choice | How the model uses tools (auto/required/none) |
| Enable Memory | Enable conversation memory |
| Skills / Tools | Custom tools for the agent |
| Prompt | User input message |
| Stream Response | Enable streaming output |

## Supported Models

### OpenAI Compatible
- `openai/gpt-5`
- `openai/gpt-4o`
- `openai/gpt-4o-mini`
- `openai/gpt-4-turbo`
- `openai/gpt-4`
- `openai/gpt-3.5-turbo`

### Anthropic
- `anthropic/claude-opus-4-5`
- `anthropic/claude-opus-4-0`
- `anthropic/claude-sonnet-4-7`
- `anthropic/claude-sonnet-4-6`
- `anthropic/claude-haiku-4-0`

## Usage Examples

### Basic Agent
```javascript
{
  "model": "openai/gpt-4o",
  "instructions": "You are a helpful coding assistant.",
  "prompt": "Write a function to fibonacci"
}
```

### Agent with Skills
```javascript
{
  "model": "openai/gpt-4o",
  "instructions": "You are a research assistant with web search capabilities.",
  "skills": [
    {
      "name": "webSearch",
      "description": "Search the web for information",
      "schema": {
        "type": "object",
        "properties": {
          "query": { "type": "string" }
        },
        "required": ["query"]
      }
    }
  ]
}
```

### Agent with Memory
```javascript
{
  "model": "openai/gpt-4o",
  "instructions": "You are a personal assistant that remembers details.",
  "enableMemory": true,
  "memoryType": "core",
  "sessionId": "user_123_session"
}
```

## Development

```bash
# Build TypeScript
npm run build

# Watch mode
npm run dev
```

## Architecture

```
src/
├── providers/           # AI SDK provider configurations
│   └── customProvider.ts
├── credentials/        # n8n credential definitions
│   └── AiApi.credentials.ts
├── tools/             # Tool factory for skills
│   └── toolFactory.ts
├── shared/            # Shared runtime and utilities
│   └── AgentRuntime.ts
└── nodes/             # n8n node implementations
    └── AIAgent/
        └── AIAgent.node.ts
```
