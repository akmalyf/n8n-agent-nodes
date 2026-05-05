export interface MemoryConfig {
  type: 'core' | 'archival' | 'custom';
  maxSize?: number;
  ttl?: number;
}

export interface ReferenceConfig {
  type: 'url' | 'document' | 'knowledge-base';
  source: string;
  metadata?: Record<string, any>;
}

export interface SessionMemory {
  core: Map<string, any>;
  archival: Array<{ content: string; timestamp: number }>;
}

export interface AgentSession {
  id: string;
  createdAt: Date;
  lastUsed: Date;
  memory?: SessionMemory;
}

export class AgentRuntime {
  private sessions: Map<string, AgentSession> = new Map();

  createSession(sessionId: string): AgentSession {
    const session: AgentSession = {
      id: sessionId,
      createdAt: new Date(),
      lastUsed: new Date(),
      memory: {
        core: new Map(),
        archival: [],
      },
    };

    this.sessions.set(sessionId, session);
    return session;
  }

  getSession(sessionId: string): AgentSession | undefined {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.lastUsed = new Date();
    }
    return session;
  }

  getOrCreateSession(sessionId: string): AgentSession {
    let session = this.sessions.get(sessionId);
    if (!session) {
      session = this.createSession(sessionId);
    }
    return session;
  }

  deleteSession(sessionId: string): void {
    this.sessions.delete(sessionId);
  }

  async addMemory(sessionId: string, memoryType: 'core' | 'archival', data: any): Promise<void> {
    let session = this.getSession(sessionId);
    if (!session || !session.memory) {
      session = this.getOrCreateSession(sessionId);
    }

    if (memoryType === 'core') {
      const key = typeof data === 'string' ? `memory_${Date.now()}` : (data.key || `memory_${Date.now()}`);
      const value = typeof data === 'string' ? data : data.value;
      session.memory!.core.set(key, value);
    } else {
      session.memory!.archival.push({
        content: typeof data === 'string' ? data : JSON.stringify(data),
        timestamp: Date.now(),
      });
    }
  }

  async getMemory(sessionId: string, memoryType: 'core' | 'archival'): Promise<any> {
    const session = this.getSession(sessionId);
    if (!session || !session.memory) {
      return memoryType === 'core' ? {} : [];
    }

    if (memoryType === 'core') {
      const obj: Record<string, any> = {};
      session.memory.core.forEach((value, key) => {
        obj[key] = value;
      });
      return obj;
    }

    return session.memory.archival;
  }

  buildReferenceContext(references: ReferenceConfig[]): string {
    let context = 'Reference Information:\n';

    for (const ref of references) {
      switch (ref.type) {
        case 'url':
          context += `[URL] ${ref.source}\n`;
          break;
        case 'document':
          context += `[Document] ${ref.source}\n`;
          break;
        case 'knowledge-base':
          context += `[Knowledge Base] ${ref.source}\n`;
          break;
      }
      if (ref.metadata) {
        context += `  Metadata: ${JSON.stringify(ref.metadata)}\n`;
      }
    }

    return context;
  }
}

export const agentRuntime = new AgentRuntime();
