import {
  ICredentialType,
  INodeProperties,
  INodePropertyOptions,
} from 'n8n-workflow';

export class AiApiCredentials implements ICredentialType {
  name = 'aiApi';
  displayName = 'AI API';
  documentationUrl = 'https://docs.n8n.io/integrations/builtin/credentials/http/';
  properties: INodeProperties[] = [
    {
      name: 'providerType',
      displayName: 'Provider Type',
      type: 'options',
      options: [
        {
          name: 'OpenAI',
          value: 'openai',
        },
        {
          name: 'Anthropic',
          value: 'anthropic',
        },
        {
          name: 'Custom (OpenAI Compatible)',
          value: 'custom',
        },
      ] as INodePropertyOptions[],
      default: 'openai',
    },
    {
      name: 'apiKey',
      displayName: 'API Key',
      type: 'string',
      typeOptions: {
        password: true,
      },
      default: '',
      required: true,
    },
    {
      name: 'baseURL',
      displayName: 'Base URL',
      type: 'string',
      default: '',
      placeholder: 'https://api.openai.com/v1',
      description: 'Custom API endpoint for OpenAI compatible providers',
    },
    {
      name: 'organization',
      displayName: 'Organization ID',
      type: 'string',
      default: '',
      description: 'Optional organization ID for OpenAI',
    },
    {
      name: 'projectId',
      displayName: 'Project ID',
      type: 'string',
      default: '',
      description: 'Optional project ID for OpenAI',
    },
  ];
}
