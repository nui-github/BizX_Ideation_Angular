import { JobPreset } from '../types';

export const MOCK_PRESETS: JobPreset[] = [
  {
    id: 'preset-1',
    name: 'Standard Import Process',
    assignedTeams: ['logistics'],
    workflows: [
      { id: 'pwf-1', workflowId: 'wf-1', assignedTeams: ['logistics'] },
      { id: 'pwf-2', workflowId: 'wf-4', assignedTeams: ['operation'] }
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
  },
  {
    id: 'preset-3',
    name: 'Vendor Onboarding Sync',
    assignedTeams: ['operation'],
    workflows: [
      { id: 'pwf-4', workflowId: 'wf-op-1', assignedTeams: ['operation'] },
      { id: 'pwf-8', workflowId: 'wf-op-2', assignedTeams: ['operation'] },
      { id: 'pwf-9', workflowId: 'wf-op-3', assignedTeams: ['operation'] }
    ],
    isActive: true,
    createdAt: '2026-03-05T00:00:00Z',
    updatedAt: '2026-06-15T00:00:00Z'
  },
  {
    id: 'preset-4',
    name: 'LEO Billing Reconciliation',
    assignedTeams: ['finance'],
    workflows: [
      { id: 'pwf-5', workflowId: 'cwf-leo', assignedTeams: ['logistics'] },
      { id: 'pwf-6', workflowId: 'wf-1', assignedTeams: ['accounting'] }
    ],
    isActive: true,
    createdAt: '2026-04-10T00:00:00Z',
    updatedAt: '2026-06-28T00:00:00Z'
  },
  {
    id: 'preset-5',
    name: 'Legacy Archive Cleanup',
    assignedTeams: ['customer_service'],
    workflows: [
      { id: 'pwf-7', workflowId: 'wf-5', assignedTeams: ['customer_service'] }
    ],
    isActive: false,
    createdAt: '2026-05-01T00:00:00Z',
    updatedAt: '2026-05-20T00:00:00Z'
  }
];
