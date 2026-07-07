import { Agent, AgentType, AgentStatus } from '../app/core/models/types.model';

export const MOCK_AGENTS: Agent[] = [
  {
    id: '1',
    name: 'Invoice Processor Alpha',
    description: 'Automatically scans emails for PDF invoices and saves them to Finance Drive.',
    type: AgentType.MAIL,
    status: AgentStatus.ACTIVE,
    updatedAt: '2026-10-25T10:30:00Z',
    updatedBy: 'Admin User',
    createdAt: '2026-10-20T09:00:00Z',
    createdBy: 'Admin User',
    companyId: 'comp-001',
    workflowId: 'wf-001',
    mailConfig: {
      enableFilter: true,
      subjectKeywords: ['Invoice', 'Receipt', 'Bill'],
      bodyKeywords: [],
      senderEmail: '',
      receiverEmail: 'invoices@acme.com'
    },
    driveConfig: {
      autoSave: true,
      targetFolderPath: '/Finance/Invoices/',
      autoRename: true,
      renamePattern: '{Date}_{DocNo}',
      autoCreateFolder: true,
      folderStructure: '/{Year}/{Month}/'
    }
  },
  {
    id: '2',
    name: 'Customer Support Auto-Reply',
    description: 'Uses AI to analyze incoming support tickets and draft initial responses for agents.',
    type: AgentType.AI,
    status: AgentStatus.ACTIVE,
    updatedAt: '2026-10-26T14:20:00Z',
    updatedBy: 'Sarah Connor',
    createdAt: '2026-10-21T09:00:00Z',
    createdBy: 'Admin User',
    companyId: 'comp-001',
    workflowId: 'wf-002',
    aiConfig: {
      model: 'gemini-pro',
      inputSource: 'Support Ticket System',
      outputAction: 'Draft Reply JSON'
    },
    driveConfig: {
      autoSave: false,
      autoRename: false,
      autoCreateFolder: false
    }
  },
  {
    id: '3',
    name: 'HR Resume Scanner',
    description: 'Filters incoming job applications and saves resumes to specific folders based on department.',
    type: AgentType.MAIL,
    status: AgentStatus.ACTIVE,
    updatedAt: '2026-10-27T09:15:00Z',
    updatedBy: 'HR Manager',
    createdAt: '2026-10-22T08:30:00Z',
    createdBy: 'Admin User',
    companyId: 'comp-001',
    workflowId: 'wf-003',
    mailConfig: {
      enableFilter: true,
      subjectKeywords: ['Application', 'Resume', 'CV'],
      bodyKeywords: [],
      senderEmail: '',
      receiverEmail: 'jobs@acme.com'
    },
    driveConfig: {
      autoSave: true,
      targetFolderPath: '/HR/Resumes/',
      autoRename: true,
      renamePattern: '{ApplicantName}_{Role}',
      autoCreateFolder: true,
      folderStructure: '/{Role}/'
    }
  }
];

export const AVAILABLE_TRIGGERS = [
  'On Email Received',
  'On Document Created',
  'Schedule: Daily 9:00 AM',
  'Manual Trigger Only'
];

export const ALLOWED_VARIABLES = ['{DocNo}', '{Date}', '{Customer}', '{AgentName}', '{Year}', '{Month}', '{DocType}'];
