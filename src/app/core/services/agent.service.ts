import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { Agent, AgentStatus } from '../models/types.model';
import { MOCK_AGENTS, AVAILABLE_TRIGGERS, ALLOWED_VARIABLES } from '../../../mock-data/agents.mock';

@Injectable({
  providedIn: 'root'
})
export class AgentService {
  private agents: Agent[] = [...MOCK_AGENTS];

  getAgents(): Observable<Agent[]> {
    return of(this.agents);
  }

  getAgentById(id: string): Observable<Agent | undefined> {
    const agent = this.agents.find(a => a.id === id);
    return of(agent);
  }

  createAgent(agent: Omit<Agent, 'id' | 'createdAt' | 'updatedAt'>): Observable<Agent> {
    const newAgent: Agent = {
      ...agent,
      id: `agent-${Date.now()}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    this.agents.push(newAgent);
    return of(newAgent);
  }

  updateAgent(id: string, updates: Partial<Agent>): Observable<Agent> {
    const index = this.agents.findIndex(a => a.id === id);
    if (index !== -1) {
      this.agents[index] = {
        ...this.agents[index],
        ...updates,
        updatedAt: new Date().toISOString()
      };
      return of(this.agents[index]);
    }
    throw new Error(`Agent with ID ${id} not found`);
  }

  deleteAgent(id: string): Observable<boolean> {
    const beforeLength = this.agents.length;
    this.agents = this.agents.filter(a => a.id !== id);
    return of(this.agents.length < beforeLength);
  }

  getTriggers(): Observable<string[]> {
    return of(AVAILABLE_TRIGGERS);
  }

  getAllowedVariables(): Observable<string[]> {
    return of(ALLOWED_VARIABLES);
  }
}
