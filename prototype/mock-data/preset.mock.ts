import { JobPreset } from '../types';

export const MOCK_PRESETS: JobPreset[] = [
  {
    id: 'preset-1',
    name: 'Standard Import Process',
    assignedTeams: ['logistics', 'operation'],
    workflows: [
      { id: 'pwf-1', workflowId: 'wf-1', assignedTeams: ['logistics'] },
      { id: 'pwf-2', workflowId: 'wf-2', assignedTeams: ['operation'] }
    ],
    isActive: true,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-07-01T00:00:00Z'
  },
  {
    id: 'preset-2',
    name: 'Accounting Monthly Close',
    assignedTeams: ['accounting'],
    workflows: [
      { id: 'pwf-3', workflowId: 'wf-3', assignedTeams: ['accounting'] }
    ],
    isActive: false,
    createdAt: '2026-02-01T00:00:00Z',
    updatedAt: '2026-06-01T00:00:00Z'
  }
];
