import {
  IExecuteFunctions,
  INodeExecutionData,
  INodeType,
  INodeTypeDescription,
} from 'n8n-workflow';
import { generateText, streamText } from 'ai';
import { openai } from '@ai-sdk/openai';
import { anthropic } from '@ai-sdk/anthropic';
import { agentRuntime } from '../../shared/AgentRuntime';
import type { ReferenceConfig } from '../../shared/AgentRuntime';

const BASE_DESCRIPTION: INodeTypeDescription = {
  version: 1,
  defaults: {
    name: 'AI Agent',
  },
  group: ['ai'] as unknown as INodeTypeDescription['group'],
  name: 'aiAgent',
  displayName: 'AI Agent',
  icon: 'fa:robot',
  description: 'An AI Agent with full features using AI SDK - supports skills, memory, reasoning',
  inputs: ['main'],
  outputs: ['main'],
  credentials: [
    {
      name: 'aiApi',
      required: true,
    },
  ],
  properties: [
    {
      displayName: 'Provider Type',
      name: 'providerType',
      type: 'options',
      options: [
        { name: 'OpenAI', value: 'openai' },
        { name: 'Anthropic', value: 'anthropic' },
      ],
      default: 'openai',
      description: 'Choose the AI provider',
    },
    {
      displayName: 'Model',
      name: 'model',
      type: 'string',
      default: 'gpt-4o',
      required: true,
      description: 'Model to use (e.g., gpt-4o, claude-sonnet-4-7)',
    },
    {
      displayName: 'System Instructions',
      name: 'instructions',
      type: 'string',
      typeOptions: {
        rows: 5,
      },
      default: 'You are a helpful AI assistant.',
      description: 'Instructions that define the agent behavior and capabilities',
    },
    {
      displayName: 'Max Steps',
      name: 'maxSteps',
      type: 'number',
      typeOptions: {
        minValue: 1,
        maxValue: 100,
      },
      default: 20,
      description: 'Maximum number of steps the agent can take before stopping',
    },
    {
      displayName: 'Temperature',
      name: 'temperature',
      type: 'number',
      typeOptions: {
        minValue: 0,
        maxValue: 2,
      },
      default: 0.7,
      description: 'Controls randomness in generation (0-2)',
    },
    {
      displayName: 'Max Output Tokens',
      name: 'maxOutputTokens',
      type: 'number',
      typeOptions: {
        minValue: 1,
        maxValue: 128000,
      },
      default: 4096,
      description: 'Maximum number of tokens to generate',
    },
    {
      displayName: 'Tool Choice',
      name: 'toolChoice',
      type: 'options',
      options: [
        { name: 'Auto', value: 'auto' },
        { name: 'Required', value: 'required' },
        { name: 'None', value: 'none' },
      ],
      default: 'auto',
      description: 'How the model should choose which tools to use',
    },
    {
      displayName: 'Enable Memory',
      name: 'enableMemory',
      type: 'boolean',
      default: false,
      description: 'Enable conversation memory for the agent',
    },
    {
      displayName: 'Memory Type',
      name: 'memoryType',
      type: 'options',
      options: [
        { name: 'Core Memory', value: 'core' },
        { name: 'Archival Memory', value: 'archival' },
        { name: 'Both', value: 'both' },
      ],
      default: 'core',
      displayOptions: {
        show: {
          enableMemory: [true],
        },
      },
      description: 'Type of memory to use',
    },
    {
      displayName: 'References (JSON)',
      name: 'references',
      type: 'json',
      default: '[]',
      displayOptions: {
        show: {
          enableMemory: [true],
        },
      },
      description: 'JSON array of reference documents/URLs for context',
    },
    {
      displayName: 'Skills / Tools',
      name: 'skills',
      type: 'fixedCollection',
      typeOptions: {
        multipleValues: true,
      },
      default: {
        values: [],
      },
      options: [
        {
          name: 'values',
          displayName: 'Skill',
          values: [
            {
              displayName: 'Name',
              name: 'name',
              type: 'string',
              required: true,
              default: '',
              description: 'Skill/tool name',
            },
            {
              displayName: 'Description',
              name: 'description',
              type: 'string',
              required: true,
              default: '',
              description: 'What this skill does',
            },
            {
              displayName: 'Schema (JSON)',
              name: 'schema',
              type: 'string',
              required: true,
              default: '{"type":"object","properties":{}}',
              description: 'JSON Schema for tool input',
            },
          ],
        },
      ],
    },
    {
      displayName: 'Prompt',
      name: 'prompt',
      type: 'string',
      typeOptions: {
        rows: 3,
      },
      default: '={{$json.message || $json.prompt || $json.input}}',
      description: 'The user prompt or message to send to the agent',
    },
    {
      displayName: 'Stream Response',
      name: 'streaming',
      type: 'boolean',
      default: false,
      description: 'Whether to stream the response',
    },
    {
      displayName: 'Session ID',
      name: 'sessionId',
      type: 'string',
      default: '',
      displayOptions: {
        show: {
          enableMemory: [true],
        },
      },
      description: 'Session ID for maintaining conversation state (leave empty for auto-generated)',
    },
  ],
};

interface SkillValue {
  name: string;
  description: string;
  schema: string;
}

interface SkillsParameter {
  values: SkillValue[];
}

export class AIAgentNode implements INodeType {
  description: INodeTypeDescription = BASE_DESCRIPTION;

  async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
    const items = this.getInputData();
    const runtime = agentRuntime;

    for (let itemIndex = 0; itemIndex < items.length; itemIndex++) {
      try {
        const item = items[itemIndex];

        const providerType = this.getNodeParameter('providerType', itemIndex) as string;
        const model = this.getNodeParameter('model', itemIndex) as string;

        const instructions = this.getNodeParameter('instructions', itemIndex) as string;
        const maxSteps = this.getNodeParameter('maxSteps', itemIndex) as number;
        const temperature = this.getNodeParameter('temperature', itemIndex) as number;
        const maxOutputTokens = this.getNodeParameter('maxOutputTokens', itemIndex) as number;
        const toolChoice = this.getNodeParameter('toolChoice', itemIndex) as string;
        const streaming = this.getNodeParameter('streaming', itemIndex) as boolean;
        const enableMemory = this.getNodeParameter('enableMemory', itemIndex) as boolean;
        const memoryType = this.getNodeParameter('memoryType', itemIndex) as string;
        const promptParam = this.getNodeParameter('prompt', itemIndex) as string;
        const skillsParam = this.getNodeParameter('skills', itemIndex) as SkillsParameter;

        const credentials = await this.getCredentials('aiApi');
        const apiKey = credentials.apiKey as string;
        const baseURL = credentials.baseURL as string || undefined;

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        let agentModel: any;
        if (providerType === 'anthropic') {
          const anthropicProvider = anthropic({
            apiKey,
            baseURL: baseURL || 'https://api.anthropic.com/v1',
          } as any);
          agentModel = (anthropicProvider as any)(model);
        } else {
          const openaiProvider = openai({
            apiKey,
            baseURL: baseURL || 'https://api.openai.com/v1',
          } as any);
          agentModel = (openaiProvider as any)(model);
        }

        const skills = skillsParam?.values || [];
        const tools: Record<string, any> = {};

        for (const skill of skills) {
          if (skill.name && skill.description) {
            try {
              const schema = typeof skill.schema === 'string' ? JSON.parse(skill.schema) : skill.schema;
              const { tool } = require('ai');
              tools[skill.name] = tool({
                description: skill.description,
                parameters: schema,
                execute: async ({ input }: any) => {
                  return { result: 'Skill executed successfully', input };
                },
              });
            } catch (e) {
              console.warn(`Failed to parse schema for skill ${skill.name}:`, e);
            }
          }
        }

        const inputPrompt = promptParam
          .replace(/\{\{\$json\.(\w+)\}\}/g, (_: string, key: string) => String(item.json[key] || ''))
          .trim();

        if (!inputPrompt) {
          items[itemIndex] = {
            json: { error: 'No prompt provided' },
            binary: item.binary,
          };
          continue;
        }

        let sessionId = (this.getNodeParameter('sessionId', itemIndex) as string) || '';
        if (enableMemory && !sessionId) {
          sessionId = `session_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
        }

        let finalPrompt = inputPrompt;

        if (enableMemory && sessionId) {
          const references = this.getNodeParameter('references', itemIndex) as string;
          try {
            const refList: ReferenceConfig[] = JSON.parse(references);
            if (refList.length > 0) {
              let refContext = '\n\nReference Information:\n';
              for (const ref of refList) {
                refContext += `- [${ref.type}] ${ref.source}\n`;
              }
              finalPrompt = refContext + '\nUser: ' + inputPrompt;
            }
          } catch (e) {
            console.warn('Failed to parse references:', e);
          }

          if (memoryType === 'core' || memoryType === 'both') {
            const coreMemory = await runtime.getMemory(sessionId, 'core');
            if (Object.keys(coreMemory).length > 0) {
              finalPrompt = `\nCore Memory:\n${JSON.stringify(coreMemory)}\n\n` + finalPrompt;
            }
          }
        }

        const generateOptions: any = {
          model: agentModel,
          system: instructions,
          tools: Object.keys(tools).length > 0 ? tools : undefined,
          maxSteps,
          temperature,
          maxOutputTokens,
          toolChoice: toolChoice as any,
          prompt: finalPrompt,
        };

        if (streaming) {
          const stream = streamText(generateOptions);

          let fullText = '';
          for await (const chunk of stream.fullStream as AsyncIterable<any>) {
            if (chunk.type === 'text-delta') {
              fullText += chunk.textDelta;
            }
          }

          items[itemIndex] = {
            json: {
              response: fullText,
              finishReason: stream.finishReason,
              usage: stream.usage,
            },
            binary: item.binary,
          };
        } else {
          const result = await generateText(generateOptions);

          if (enableMemory && sessionId && result.text) {
            await runtime.addMemory(sessionId, 'core', {
              key: `context_${Date.now()}`,
              value: result.text.substring(0, 500),
            });
          }

          items[itemIndex] = {
            json: {
              response: result.text,
              finishReason: result.finishReason,
              usage: result.usage,
              steps: result.steps,
              toolCalls: result.toolCalls,
              toolResults: result.toolResults,
              sessionId: enableMemory ? sessionId : undefined,
            },
            binary: item.binary,
          };
        }
      } catch (error) {
        items[itemIndex] = {
          json: {
            error: error instanceof Error ? error.message : String(error),
          },
          binary: items[itemIndex].binary,
        };
      }
    }

    return [items];
  }
}
