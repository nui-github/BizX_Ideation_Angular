import React, { useState } from 'react';
import { Layout } from './components/Layout';
import { AgentList } from './components/AgentList';
import { AgentForm } from './components/AgentForm';
import { TrackingPage } from './components/TrackingPage';
import { ExtractionView } from './components/ExtractionView';
import { UploadPage } from './components/UploadPage';
import { WorkflowList } from './components/WorkflowList';
import { WorkflowBuilder } from './components/WorkflowBuilder';
import { DataComparison } from './components/DataComparison';
import { ManageRule } from './components/ManageRule';
import { ComparisonWorkflow } from './components/ComparisonWorkflow';
import { DataComparisonWorkflowBuilder } from './components/DataComparisonWorkflowBuilder';
import { DocTypeMaster } from './components/DocTypeMaster';
import { JobPresetSettings } from './components/JobPresetSettings';
import { LabelSchemaSettings } from './components/LabelSchemaSettings';
import { MasterDataSettings } from './components/MasterDataSettings';
import { Agent, AgentStatus, AgentType, AuditLog, UserRole, Language, TrackingItem, TrackingSource, ReviewStatus, SendStatus, Workflow, DocType, JobPreset } from './types';
import { TRANSLATIONS } from './translations';
import { MOCK_PRESETS } from './mock-data/preset.mock';
import { CheckCircle2, AlertCircle, Trash2, Power } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

// Mock Initial Data (Agent Data preserved)
const MOCK_AGENTS: Agent[] = [
  {
    id: '1',
    name: 'Invoice Processor Alpha',
    description: 'Automatically scans emails for PDF invoices and saves them to Finance Drive.',
    type: AgentType.MAIL,
    status: AgentStatus.ACTIVE,
    updatedAt: '2023-10-25T10:30:00Z',
    updatedBy: 'Admin User',
    createdAt: '2023-10-20T09:00:00Z',
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
    updatedAt: '2023-10-26T14:20:00Z',
    updatedBy: 'Sarah Connor',
    createdAt: '2023-10-21T09:00:00Z',
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
    updatedAt: '2023-10-27T09:15:00Z',
    updatedBy: 'HR Manager',
    createdAt: '2023-10-22T08:30:00Z',
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
  },
  {
    id: '4',
    name: 'Weekly Sales Report Generator',
    description: 'Compiles sales data every Monday morning and emails the PDF report to management.',
    type: AgentType.AI,
    status: AgentStatus.ACTIVE,
    updatedAt: '2023-10-24T16:00:00Z',
    updatedBy: 'Sales Director',
    createdAt: '2023-10-15T10:00:00Z',
    createdBy: 'System',
    companyId: 'comp-001',
    workflowId: 'wf-004',
    aiConfig: {
        model: 'gpt-4',
        inputSource: 'Sales Database',
        outputAction: 'Generate Summary PDF'
    },
    driveConfig: {
        autoSave: true,
        targetFolderPath: '/Sales/Reports/',
        autoRename: true,
        renamePattern: 'Weekly_Report_{Date}',
        autoCreateFolder: false
    }
  },
  {
    id: '5',
    name: 'IT Ticket Classifier',
    description: 'Categorizes IT support emails into Hardware, Software, or Network issues using AI.',
    type: AgentType.AI,
    status: AgentStatus.DRAFT,
    updatedAt: '2023-10-28T11:45:00Z',
    updatedBy: 'IT Admin',
    createdAt: '2023-10-28T10:00:00Z',
    createdBy: 'IT Admin',
    companyId: 'comp-001',
    workflowId: 'wf-002',
    aiConfig: {
        model: 'claude-3',
        inputSource: 'Email Body',
        outputAction: 'Tag Ticket'
    },
    driveConfig: {
        autoSave: false,
        autoRename: false,
        autoCreateFolder: false
    }
  },
  {
    id: '6',
    name: 'Legal Document Archiver',
    description: 'Archives all contracts sent to the legal department email for compliance.',
    type: AgentType.MAIL,
    status: AgentStatus.INACTIVE,
    updatedAt: '2023-09-30T15:30:00Z',
    updatedBy: 'Legal Team',
    createdAt: '2023-09-01T09:00:00Z',
    createdBy: 'Admin User',
    companyId: 'comp-001',
    workflowId: 'wf-005',
    mailConfig: {
      enableFilter: true,
      subjectKeywords: ['Contract', 'Agreement', 'NDA'],
      bodyKeywords: [],
      senderEmail: '',
      receiverEmail: 'legal@acme.com'
    },
    driveConfig: {
      autoSave: true,
      targetFolderPath: '/Legal/Archives/',
      autoRename: false,
      autoCreateFolder: true,
      folderStructure: '/{Year}/'
    }
  },
  {
    id: '7',
    name: 'Marketing Campaign Analyzer',
    description: 'Analyzes social media feedback and email responses to gauge campaign sentiment.',
    type: AgentType.AI,
    status: AgentStatus.ACTIVE,
    updatedAt: '2023-10-29T13:10:00Z',
    updatedBy: 'Marketing Lead',
    createdAt: '2023-10-20T11:00:00Z',
    createdBy: 'Marketing Lead',
    companyId: 'comp-001',
    workflowId: 'wf-006',
    aiConfig: {
        model: 'gemini-pro',
        inputSource: 'Social Feeds & Emails',
        outputAction: 'Sentiment Analysis Report'
    },
    driveConfig: {
        autoSave: true,
        targetFolderPath: '/Marketing/Reports/',
        autoRename: true,
        renamePattern: 'Sentiment_{Campaign}_{Date}',
        autoCreateFolder: false
    }
  },
  {
    id: '8',
    name: 'Procurement Order Sync',
    description: 'Extracts PO numbers from vendor emails and updates the ERP system.',
    type: AgentType.MAIL,
    status: AgentStatus.ACTIVE,
    updatedAt: '2023-10-22T14:50:00Z',
    updatedBy: 'Admin User',
    createdAt: '2023-10-05T09:00:00Z',
    createdBy: 'Admin User',
    companyId: 'comp-001',
    workflowId: 'wf-007',
    mailConfig: {
      enableFilter: true,
      subjectKeywords: ['PO', 'Purchase Order', 'Confirmation'],
      bodyKeywords: [],
      senderEmail: '',
      receiverEmail: 'purchasing@acme.com'
    },
    driveConfig: {
      autoSave: true,
      targetFolderPath: '/Procurement/Orders/',
      autoRename: true,
      renamePattern: 'PO_{DocNo}',
      autoCreateFolder: false
    }
  },
  {
    id: '9',
    name: 'Logistics Tracker',
    description: 'Monitors shipment notifications and updates tracking spreadsheets.',
    type: AgentType.MAIL,
    status: AgentStatus.DRAFT,
    updatedAt: '2023-10-30T10:00:00Z',
    updatedBy: 'Logistics Mgr',
    createdAt: '2023-10-30T09:50:00Z',
    createdBy: 'Logistics Mgr',
    companyId: 'comp-001',
    workflowId: 'wf-008',
    mailConfig: {
      enableFilter: true,
      subjectKeywords: ['Tracking', 'Shipment', 'Delivery'],
      bodyKeywords: [],
      senderEmail: '',
      receiverEmail: 'logistics@acme.com'
    },
    driveConfig: {
      autoSave: false,
      autoRename: false,
      autoCreateFolder: false
    }
  },
  {
    id: '10',
    name: 'Compliance Audit Bot',
    description: 'Periodically reviews saved documents for PII compliance using AI.',
    type: AgentType.AI,
    status: AgentStatus.INACTIVE,
    updatedAt: '2023-08-15T11:20:00Z',
    updatedBy: 'Security Officer',
    createdAt: '2023-08-01T10:00:00Z',
    createdBy: 'Admin User',
    companyId: 'comp-001',
    workflowId: 'wf-009',
    aiConfig: {
        model: 'gpt-4',
        inputSource: 'Drive Folders',
        outputAction: 'Compliance Flagging'
    },
    driveConfig: {
        autoSave: false,
        autoRename: false,
        autoCreateFolder: false
    }
  },
  {
    id: '11',
    name: 'Employee Feedback Summary',
    description: 'Summarizes anonymous employee feedback forms submitted via email.',
    type: AgentType.AI,
    status: AgentStatus.ACTIVE,
    updatedAt: '2023-10-25T16:45:00Z',
    updatedBy: 'HR Director',
    createdAt: '2023-10-10T14:00:00Z',
    createdBy: 'HR Director',
    companyId: 'comp-001',
    workflowId: 'wf-003',
    aiConfig: {
        model: 'gemini-pro',
        inputSource: 'Feedback Emails',
        outputAction: 'Monthly Summary'
    },
    driveConfig: {
        autoSave: true,
        targetFolderPath: '/HR/Feedback/Summaries/',
        autoRename: true,
        renamePattern: 'Feedback_Summary_{Month}',
        autoCreateFolder: false
    }
  },
  {
    id: '12',
    name: 'Daily News Digest',
    description: 'Curates industry news relevant to the company and emails a digest to all staff.',
    type: AgentType.AI,
    status: AgentStatus.ACTIVE,
    updatedAt: '2023-10-31T08:00:00Z',
    updatedBy: 'Comms Team',
    createdAt: '2023-09-20T09:00:00Z',
    createdBy: 'Admin User',
    companyId: 'comp-001',
    workflowId: 'wf-010',
    aiConfig: {
        model: 'gemini-pro',
        inputSource: 'RSS Feeds',
        outputAction: 'Email Digest'
    },
    driveConfig: {
        autoSave: false,
        autoRename: false,
        autoCreateFolder: false
    }
  }
];

const MOCK_TRACKING_DATA: TrackingItem[] = [
  // Job 1: China to Thailand (Electronics)
  { id: 't-1', fileName: 'INV-CN-2025-00451.pdf', date: '2025-04-25', performer: 'Mail Agent', source: TrackingSource.EMAIL, reviewStatus: ReviewStatus.REVIEWED, sendStatus: SendStatus.SENT, docType: 'Invoice', ref: 'JOB-00451' },
  { id: 't-2', fileName: 'PKL-CN-2025-00451.xlsx', date: '2025-04-25', performer: 'Mail Agent', source: TrackingSource.EMAIL, reviewStatus: ReviewStatus.REVIEWED, sendStatus: SendStatus.SENT, docType: 'Packing List', ref: 'JOB-00451' },
  { id: 't-3', fileName: 'FTA-FORM-E-CN-TH.pdf', date: '2025-10-26', performer: 'System', source: TrackingSource.EMAIL, reviewStatus: ReviewStatus.WAIT_FOR_REVIEW, sendStatus: SendStatus.NOT_SENT, docType: 'FTA', ref: 'JOB-00451' },
  { id: 't-4', fileName: 'BL-MSC-4451023.pdf', date: '2025-10-26', performer: 'MSC Gateway', source: TrackingSource.API, reviewStatus: ReviewStatus.REVIEWED, sendStatus: SendStatus.SENT, docType: 'B/L', ref: 'JOB-00451' },
  
  // Job 2: Japan to Thailand (Auto Parts)
  { id: 't-5', fileName: 'INV-JP-123-AUTO.pdf', date: '2025-10-27', performer: 'Mail Agent', source: TrackingSource.EMAIL, reviewStatus: ReviewStatus.WAIT_FOR_REVIEW, sendStatus: SendStatus.NOT_SENT, docType: 'Invoice', ref: 'JOB-00892' },
  { id: 't-6', fileName: 'PKL-JP-123-AUTO.pdf', date: '2025-10-27', performer: 'Mail Agent', source: TrackingSource.EMAIL, reviewStatus: ReviewStatus.WAIT_FOR_REVIEW, sendStatus: SendStatus.NOT_SENT, docType: 'Packing List', ref: 'JOB-00892' },
  
  // Job 3: Import Declaration (Thailand Customs)
  { id: 't-7', fileName: 'DEC-IMPORT-TH-998.xml', date: '2025-10-28', performer: 'TradeNet', source: TrackingSource.API, reviewStatus: ReviewStatus.REVIEWED, sendStatus: SendStatus.SENT, docType: 'Import Declaration', ref: 'JOB-00998' },
  
  // Job 4: Misc Others
  { id: 't-8', fileName: 'CO-CHAMBER-2025.png', date: '2025-04-28', performer: 'Admin User', source: TrackingSource.UPLOAD, reviewStatus: ReviewStatus.UNREAD, sendStatus: SendStatus.NOT_SENT, docType: 'Certificate of Origin', ref: 'JOB-00331' },
];

const MOCK_LOGS: AuditLog[] = [
    { id: 'l1', action: 'CREATE', user: 'Admin User', timestamp: '2023-10-20T09:00:00Z', details: 'Created agent "Invoice Processor Alpha"' },
    { id: 'l2', action: 'ENABLE', user: 'Admin User', timestamp: '2023-10-25T10:30:00Z', details: 'Changed status from Draft to Active' },
];

const MOCK_DATA_SOURCES = [
  { id: 'ds-1', name: 'Vendor_Data.xlsx', fields: ['Vendor ID', 'Vendor Name', 'Address', 'Tax ID'] },
  { id: 'ds-2', name: 'Scanned_Invoice.pdf', fields: ['Invoice No', 'Date', 'Total Amount', 'VAT'] }
];

const MOCK_WORKFLOWS: Workflow[] = [
  {
    id: 'wf-1',
    name: 'Invoice Processing to ERP',
    description: 'Extracts data from scanned invoices and pushes to SAP ERP.',
    status: 'ACTIVE',
    createdAt: '2025-08-15T10:00:00Z',
    updatedAt: '2025-09-20T14:30:00Z',
    nodes: [
      { id: 'n1', type: 'input', position: { x: 100, y: 200 }, data: { files: [MOCK_DATA_SOURCES[1]] } },
      { id: 'n2', type: 'mapping', position: { x: 400, y: 200 }, data: { templateId: 'tpl-invoice', mappings: [
        { targetField: 'inv_no', sourceFileId: 'ds-2', sourceField: 'Invoice No' },
        { targetField: 'date', sourceFileId: 'ds-2', sourceField: 'Date' },
        { targetField: 'total', sourceFileId: 'ds-2', sourceField: 'Total Amount' }
      ] } },
      { id: 'n3', type: 'output', position: { x: 700, y: 200 }, data: { format: 'json', destination: 'erp' } }
    ],
    edges: [
      { id: 'e1', source: 'n1', target: 'n2' },
      { id: 'e2', source: 'n2', target: 'n3' }
    ]
  },
  {
    id: 'wf-2',
    name: 'Monthly PO Consolidation',
    description: 'Aggregates purchase orders from vendors into a single summary report.',
    status: 'ACTIVE',
    createdAt: '2025-09-01T09:15:00Z',
    updatedAt: '2025-09-22T11:20:00Z',
    nodes: [
      { id: 'n1', type: 'input', position: { x: 100, y: 200 }, data: { files: [MOCK_DATA_SOURCES[0]] } },
      { id: 'n2', type: 'mapping', position: { x: 400, y: 200 }, data: { templateId: 'tpl-po', mappings: [
        { targetField: 'vendor', sourceFileId: 'ds-1', sourceField: 'Vendor Name' }
      ] } },
      { id: 'n3', type: 'output', position: { x: 700, y: 200 }, data: { format: 'pdf', destination: 'email' } }
    ],
    edges: [
      { id: 'e1', source: 'n1', target: 'n2' },
      { id: 'e2', source: 'n2', target: 'n3' }
    ]
  },
  {
    id: 'wf-3',
    name: 'Customs E-Declaration Prep',
    description: 'Prepares draft e-declaration forms from shipping manifests.',
    status: 'INACTIVE',
    createdAt: '2025-09-10T16:45:00Z',
    updatedAt: '2025-09-15T08:10:00Z',
    nodes: [
      { id: 'n1', type: 'input', position: { x: 100, y: 200 }, data: { files: [MOCK_DATA_SOURCES[0]] } },
      { id: 'n2', type: 'mapping', position: { x: 400, y: 200 }, data: { templateId: 'tpl-edecl', mappings: [
        { targetField: 'importer', sourceFileId: 'ds-1', sourceField: 'Vendor Name' }
      ] } },
      { id: 'n3', type: 'output', position: { x: 700, y: 200 }, data: { format: 'xml', destination: 'drive' } }
    ],
    edges: [
      { id: 'e1', source: 'n1', target: 'n2' },
      { id: 'e2', source: 'n2', target: 'n3' }
    ]
  },
  {
    id: 'wf-4',
    name: 'Vendor Onboarding Sync',
    description: 'Syncs new vendor information from Excel forms to the central database.',
    status: 'ACTIVE',
    createdAt: '2025-09-18T13:20:00Z',
    updatedAt: '2025-09-24T09:05:00Z',
    nodes: [
      { id: 'n1', type: 'input', position: { x: 100, y: 200 }, data: { files: [MOCK_DATA_SOURCES[0]] } },
      { id: 'n2', type: 'mapping', position: { x: 400, y: 200 }, data: { templateId: 'tpl-po', mappings: [
        { targetField: 'vendor', sourceFileId: 'ds-1', sourceField: 'Vendor Name' }
      ] } },
      { id: 'n3', type: 'output', position: { x: 700, y: 200 }, data: { format: 'json', destination: 'erp' } }
    ],
    edges: [
      { id: 'e1', source: 'n1', target: 'n2' },
      { id: 'e2', source: 'n2', target: 'n3' }
    ]
  },
  {
    id: 'wf-5',
    name: 'Legacy Data Archive',
    description: 'Converts old text-based records into structured PDF archives.',
    status: 'INACTIVE',
    createdAt: '2025-07-20T11:00:00Z',
    updatedAt: '2025-08-05T15:40:00Z',
    nodes: [
      { id: 'n1', type: 'input', position: { x: 100, y: 200 }, data: { files: [MOCK_DATA_SOURCES[1]] } },
      { id: 'n2', type: 'mapping', position: { x: 400, y: 200 }, data: { templateId: 'tpl-invoice', mappings: [
        { targetField: 'inv_no', sourceFileId: 'ds-2', sourceField: 'Invoice No' }
      ] } },
      { id: 'n3', type: 'output', position: { x: 700, y: 200 }, data: { format: 'pdf', destination: 'drive' } }
    ],
    edges: [
      { id: 'e1', source: 'n1', target: 'n2' },
      { id: 'e2', source: 'n2', target: 'n3' }
    ]
  }
];

if (typeof window !== 'undefined') {
  localStorage.removeItem('bizx_label_schemas_v3');
}

function App() {
  // New State: Tracking View is default, EXTRACTION is new
  const [currentView, setCurrentView] = useState<'TRACKING' | 'AGENT_LIST' | 'AGENT_FORM' | 'EXTRACTION' | 'UPLOAD' | 'WORKFLOW_LIST' | 'WORKFLOW_BUILDER' | 'DATA_COMPARISON_JOBS' | 'DATA_COMPARISON_WORKFLOW' | 'DATA_COMPARISON_RULE' | 'DATA_COMPARISON_WORKFLOW_BUILDER' | 'SETTINGS_DOC_TYPE_MASTER' | 'SETTINGS_LABEL_SCHEMA' | 'SETTINGS_MASTER_DATA' | 'SETTINGS_JOB_PRESET'>('TRACKING');
  const [docTypes, setDocTypes] = useState<DocType[]>([
    { 
      id: 'INV', 
      name: 'Invoice', 
      hint: 'Commercial Invoice with billing details', 
      pattern: 'INV_*, INVOICE_*',
      schema: [
        { id: 'f-1', key: 'invoice_no', name: 'Invoice Number', type: 'text', required: true, minConfidence: 85 },
        { id: 'f-2', key: 'invoice_date', name: 'Invoice Date', type: 'date', required: true, minConfidence: 80 },
        { id: 'f-3', key: 'total_amount', name: 'Total Amount', type: 'currency', required: true, minConfidence: 90 },
        { id: 'f-9', key: 'tax_id', name: 'Tax ID', type: 'text', required: false, minConfidence: 80 },
        { id: 'f-10', key: 'vendor_name', name: 'Vendor Name', type: 'text', required: false, minConfidence: 75 }
      ]
    },
    { 
      id: 'BL', 
      name: 'Bill of Lading', 
      hint: 'Shipping document with cargo details', 
      pattern: 'BL_*, BOL_*',
      schema: [
        { id: 'f-4', key: 'bl_no', name: 'B/L Number', type: 'text', required: true, minConfidence: 85 },
        { id: 'f-5', key: 'shipper', name: 'Shipper Name', type: 'text', required: true, minConfidence: 75 },
        { id: 'f-6', key: 'consignee', name: 'Consignee Name', type: 'text', required: true, minConfidence: 80 },
        { id: 'f-11', key: 'vessel_name', name: 'Vessel Name', type: 'text', required: false, minConfidence: 80 },
        { id: 'f-12', key: 'port_of_loading', name: 'Port of Loading', type: 'text', required: false, minConfidence: 85 }
      ]
    },
    { 
      id: 'PL', 
      name: 'Packing List', 
      hint: 'Detailed list of items in the shipment', 
      pattern: 'PL_*, PACK_*',
      schema: [
        { id: 'f-7', key: 'pack_no', name: 'Packing List No', type: 'text', required: false, minConfidence: 80 },
        { id: 'f-8', key: 'total_packages', name: 'Total Packages', type: 'number', required: true, minConfidence: 85 }
      ]
    },
    { id: 'PO', name: 'Purchase Order', hint: 'Commercial document issued by a buyer', pattern: 'PO_*' },
    { id: 'CO', name: 'Certificate of Origin', hint: 'Declares in which country a commodity was manufactured', pattern: 'CO_*, CERT_*' },
    { id: 'DO', name: 'Delivery Order', hint: 'Order from consignee to carrier to release cargo', pattern: 'DO_*' }
  ]);
  const [formMode, setFormMode] = useState<'CREATE' | 'EDIT' | 'VIEW'>('CREATE');
  const [agents, setAgents] = useState<Agent[]>(MOCK_AGENTS);
  const [jobPresets, setJobPresets] = useState<JobPreset[]>(MOCK_PRESETS);
  const [selectedAgent, setSelectedAgent] = useState<Agent | undefined>(undefined);
  
  // State for Tracking Items
  const [trackingItems, setTrackingItems] = useState<TrackingItem[]>(MOCK_TRACKING_DATA);
  // State for Extraction View
  const [extractionItem, setExtractionItem] = useState<TrackingItem | null>(null);

  // State for Workflows
  const [workflows, setWorkflows] = useState<Workflow[]>(MOCK_WORKFLOWS);
  const [confirmToggleDialog, setConfirmToggleDialog] = useState<{ isOpen: boolean; workflow: Workflow | null; type: 'STANDARD' | 'COMPARISON' }>({ isOpen: false, workflow: null, type: 'STANDARD' });
  const [deleteWorkflowDialog, setDeleteWorkflowDialog] = useState<{ isOpen: boolean; workflow: Workflow | null; type: 'STANDARD' | 'COMPARISON' }>({ isOpen: false, workflow: null, type: 'STANDARD' });
  const [comparisonWorkflows, setComparisonWorkflows] = useState<Workflow[]>([
    {
      id: 'cwf-leo',
      name: 'LEO Billing',
      description: 'Billing reconciliation and automatic comparison against LEO standards.',
      status: 'ACTIVE',
      createdAt: '2026-03-10T11:00:00Z',
      updatedAt: '2026-05-29T10:00:00Z',
      nodes: [
        { id: 'n1-leo', type: 'get_file', position: { x: 100, y: 300 }, data: { 
          nodeName: 'Mail Connector (LEO)',
          source: 'e-mail', 
          agent: 'Logistics Bot B', 
          manualUpload: true,
          protocol: 'IMAP',
          tenantId: 'd432-8493-xyz1',
          clientId: 'app-9842-1111',
          clientSecret: 'secret-key-***',
          folder: 'INBOX',
          pollInterval: '5 min'
        } },
        { id: 'n2-leo', type: 'compare', position: { x: 500, y: 300 }, data: { 
          nodeName: 'Compare Docs', 
          isConfigured: true, 
          ruleId: 'rule-001' 
        } }
      ],
      edges: [
        { id: 'e1-leo', source: 'n1-leo', target: 'n2-leo' }
      ]
    },
    {
      id: 'cwf-cds',
      name: 'CDS Import',
      description: 'Customs declaration and import clearance matching for CDS.',
      status: 'ACTIVE',
      createdAt: '2026-03-15T14:30:00Z',
      updatedAt: '2026-05-29T10:15:00Z',
      nodes: [
        { id: 'n1-cds', type: 'get_file', position: { x: 100, y: 300 }, data: { 
          nodeName: 'CDS FTP Connector',
          source: 'FTP Server', 
          agent: 'Compliance Monitor B', 
          manualUpload: false,
          protocol: 'SFTP',
          tenantId: 'cds-tenant',
          clientId: 'cds-client',
          clientSecret: 'cds-sec',
          folder: '/imports',
          pollInterval: '10 min'
        } },
        { id: 'n2-cds', type: 'compare', position: { x: 500, y: 300 }, data: { 
          nodeName: 'Compare Docs', 
          isConfigured: true, 
          ruleId: 'rule-001' 
        } }
      ],
      edges: [
        { id: 'e1-cds', source: 'n1-cds', target: 'n2-cds' }
      ]
    },
    {
      id: 'cwf-1',
      name: 'Import Document Cross-Check (v2)',
      description: 'Automated matching between Commercial Invoices, Packing Lists, and Customs Declarations.',
      status: 'ACTIVE',
      createdAt: '2026-01-10T09:00:00Z',
      updatedAt: '2026-04-20T14:30:00Z',
      nodes: [
        { id: 'n1', type: 'get_file', position: { x: 100, y: 300 }, data: { 
          nodeName: 'Mail Connector (INBOX)',
          source: 'e-mail', 
          agent: 'Logistics Bot A', 
          manualUpload: true,
          connectionType: 'OAuth2 (Outlook)',
          tenantId: 'd432-8493-xyz1',
          clientId: 'app-9842-1111',
          clientSecret: 'secret-key-***',
          folder: 'INBOX',
          pollInterval: '1 min',
          markAsRead: true,
          protocol: 'OAUTH2_OUTLOOK',
          allowedExtensions: ['PDF', 'JPG', 'XLS', 'XLSX']
        } },
        { id: 'n2', type: 'group_of_file', position: { x: 500, y: 300 }, data: { rule: 'MARDI_PO#M-IMP-26-0142', sampleGroup: 'MARDI_PO#2026-01', fileTypes: ['INVOICE', 'PL', 'CO'] } },
        { id: 'n3', type: 'create_job', position: { x: 900, y: 300 }, data: { namingFormat: 'JOB-{Date}-{Ref}', jobType: 'Comparison' } },
        { id: 'n4', type: 'send_to', position: { x: 1300, y: 300 }, data: { destinations: ['Google Drive', 'Internal API'] } }
      ],
      edges: [
        { id: 'e1', source: 'n1', target: 'n2' },
        { id: 'e2', source: 'n2', target: 'n3' },
        { id: 'e3', source: 'n3', target: 'n4' }
      ]
    },
    {
      id: 'cwf-2',
      name: 'FTA HS Code Compliance',
      description: 'Validates HS Codes against current FTA rules and Certificate of Origin documents.',
      status: 'ACTIVE',
      createdAt: '2026-02-15T11:20:00Z',
      updatedAt: '2026-04-21T09:15:00Z',
      nodes: [
        { id: 'fa-1', type: 'get_file', position: { x: 100, y: 250 }, data: { 
          nodeName: 'FTA FTP Monitor',
          source: 'FTP Server', 
          agent: 'Compliance Monitor', 
          manualUpload: false,
          protocol: 'SFTP',
          tenantId: 'fta-tenant',
          clientId: 'fta-client',
          clientSecret: 'fta-sec',
          folder: '/inbound',
          pollInterval: '5 min'
        } },
        { id: 'fa-sub1', type: 'hybrid_mail_filter', position: { x: 500, y: 250 }, data: {
          nodeName: 'Mail Filter',
          mode: 'Prompt-based only',
          promptTemplate: 'Please filter out FTA documents that do not have HS codes.',
        } },
        { id: 'fa-2', type: 'group_of_file', position: { x: 900, y: 250 }, data: { rule: 'GLOBAL_PO#G-IMP-26-0812', fileTypes: ['FTA_ANNEX', 'INVOICE', 'PO'] } },
        { id: 'fa-3', type: 'create_job', position: { x: 1300, y: 250 }, data: { namingFormat: 'COMPLIANCE-{Ref}', jobType: 'Validation' } }
      ],
      edges: [
        { id: 'fe1', source: 'fa-1', target: 'fa-sub1' },
        { id: 'fe1-2', source: 'fa-sub1', target: 'fa-2' },
        { id: 'fe2', source: 'fa-2', target: 'fa-3' }
      ]
    },
    {
      id: 'cwf-3',
      name: 'Express Clearance Auto-Job',
      description: 'Quick scan and job creation for express shipments with high-confidence document sets.',
      status: 'INACTIVE',
      createdAt: '2026-03-01T08:45:00Z',
      updatedAt: '2026-04-29T10:00:00Z',
      nodes: [
        { id: 'ex-1', type: 'get_file', position: { x: 100, y: 400 }, data: { 
          source: 'Mobile App', 
          agent: 'Express Handler', 
          manualUpload: true 
          // Intentionally left incomplete to showcase the new validation feature when activating
        } },
        { id: 'ex-2', type: 'create_job', position: { x: 500, y: 400 }, data: { namingFormat: 'EXP-{Ref}', jobType: 'FastTrack' } },
        { id: 'ex-3', type: 'send_to', position: { x: 900, y: 400 }, data: { destinations: ['Broker System', 'Customer App'] } }
      ],
      edges: [
        { id: 'ex-e1', source: 'ex-1', target: 'ex-2' },
        { id: 'ex-e2', source: 'ex-2', target: 'ex-3' }
      ]
    }
  ]);
  const [selectedWorkflow, setSelectedWorkflow] = useState<Workflow | undefined>(undefined);

  const [role, setRole] = useState<UserRole>(UserRole.ADMIN);
  const [logs, setLogs] = useState<AuditLog[]>(MOCK_LOGS);
  const [language, setLanguage] = useState<Language>('TH'); // Default to TH based on screenshot
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const t = TRANSLATIONS[language];

  React.useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => {
        setToast(null);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  const getCurrentUser = () => role === UserRole.ADMIN ? 'Admin User' : 'Kunawut W.';

  // Workflow Handlers
  const handleDuplicateWorkflow = (originalWorkflow: Workflow, newName: string, newDescription: string) => {
    const newWorkflow: Workflow = {
      ...originalWorkflow,
      id: `wf-${Date.now()}`,
      name: newName,
      description: newDescription,
      status: 'INACTIVE',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      // Creating deep copies of nodes and edges to avoid reference issues
      nodes: JSON.parse(JSON.stringify(originalWorkflow.nodes)),
      edges: JSON.parse(JSON.stringify(originalWorkflow.edges)),
    };
    setWorkflows(prev => [newWorkflow, ...prev]);
    setToast({
      message: language === 'TH' ? 'ทำสำเนาเวิร์กโฟลว์สำเร็จ' : 'Workflow duplicated successfully',
      type: 'success'
    });
  };

  const handleDuplicateComparisonWorkflow = (originalWorkflow: Workflow, newName: string, newDescription: string) => {
    const newWorkflow: Workflow = {
      ...originalWorkflow,
      id: `cwf-${Date.now()}`,
      name: newName,
      description: newDescription,
      status: 'INACTIVE',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      // Creating deep copies of nodes and edges
      nodes: JSON.parse(JSON.stringify(originalWorkflow.nodes)),
      edges: JSON.parse(JSON.stringify(originalWorkflow.edges)),
    };
    setComparisonWorkflows(prev => [newWorkflow, ...prev]);
    setToast({
      message: language === 'TH' ? 'ทำสำเนาเวิร์กโฟลว์สำเร็จ' : 'Workflow duplicated successfully',
      type: 'success'
    });
  };

  const handleEditWorkflow = (workflow: Workflow) => {
    setSelectedWorkflow(workflow);
    setCurrentView('WORKFLOW_BUILDER');
  };

  const handleDeleteWorkflow = (workflow: Workflow) => {
    setDeleteWorkflowDialog({ isOpen: true, workflow, type: 'STANDARD' });
  };

  const checkWorkflowIncomplete = (workflow: Workflow) => {
    if (!workflow.nodes) return false;
    return workflow.nodes.some(node => {
      if (node.type === 'get_file') {
        const d = node.data || {};
        const folderValid = d.folder ? d.folder.split('/').every((level: string) => level.trim().length > 0) : false;
        return !d.nodeName?.trim() || !d.protocol || !d.tenantId?.trim() || !d.clientId?.trim() || !d.clientSecret?.trim() || !folderValid || !d.pollInterval;
      }
      if (node.type === 'hybrid_mail_filter') {
        const d = node.data || {};
        if (d.mode === 'Prompt-based only' || d.mode === 'Both') {
          if (!d.promptTemplate || d.promptTemplate.trim() === '') return true;
        }
        return false;
      }
      if (node.type === 'compare') {
        const d = node.data || {};
        return !d.ruleId || d.isConfigured === false;
      }
      return false;
    });
  };

  const handleToggleWorkflowStatus = (workflow: Workflow) => {
    if (workflow.status === 'INACTIVE') {
      const isIncomplete = checkWorkflowIncomplete(workflow);
      if (isIncomplete) {
        setConfirmToggleDialog({ isOpen: true, workflow, type: 'STANDARD' });
        return;
      }
    }
    executeToggleWorkflowStatus(workflow, 'STANDARD');
  };

  const handleEditComparisonWorkflow = (workflow: Workflow) => {
    setSelectedWorkflow(workflow);
    setCurrentView('DATA_COMPARISON_WORKFLOW_BUILDER');
  };

  const handleDeleteComparisonWorkflow = (workflow: Workflow) => {
    setDeleteWorkflowDialog({ isOpen: true, workflow, type: 'COMPARISON' });
  };

  const handleToggleComparisonWorkflowStatus = (workflow: Workflow) => {
    if (workflow.status === 'INACTIVE') {
      const isIncomplete = checkWorkflowIncomplete(workflow);
      if (isIncomplete) {
        setConfirmToggleDialog({ isOpen: true, workflow, type: 'COMPARISON' });
        return;
      }
    }
    executeToggleWorkflowStatus(workflow, 'COMPARISON');
  };

  const executeToggleWorkflowStatus = (workflow: Workflow, type: 'STANDARD' | 'COMPARISON') => {
    const newStatus = workflow.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    if (type === 'STANDARD') {
      setWorkflows(prev => prev.map(w => w.id === workflow.id ? { ...w, status: newStatus, updatedAt: new Date().toISOString() } : w));
    } else {
      setComparisonWorkflows(prev => prev.map(w => w.id === workflow.id ? { ...w, status: newStatus, updatedAt: new Date().toISOString() } : w));
    }
    setConfirmToggleDialog({ isOpen: false, workflow: null, type: 'STANDARD' });
    
    // If delete dialog is open and we just disabled the workflow, update its status in the dialog
    if (deleteWorkflowDialog.isOpen && deleteWorkflowDialog.workflow?.id === workflow.id) {
       setDeleteWorkflowDialog(prev => ({
         ...prev,
         workflow: { ...workflow, status: newStatus }
       }));
    }
  };

  const executeDeleteWorkflow = () => {
    const { workflow, type } = deleteWorkflowDialog;
    if (!workflow) return;

    if (type === 'STANDARD') {
      setWorkflows(prev => prev.filter(w => w.id !== workflow.id));
    } else {
      setComparisonWorkflows(prev => prev.filter(w => w.id !== workflow.id));
    }

    setToast({
      message: language === 'TH' ? 'ลบเวิร์กโฟลว์สำเร็จ' : 'Workflow deleted successfully',
      type: 'success'
    });
    setDeleteWorkflowDialog({ isOpen: false, workflow: null, type: 'STANDARD' });
  };

  const handleDeleteRuleFromApp = (ruleId: string) => {
    setComparisonWorkflows(prev => prev.map(wf => {
      if (!wf.nodes) return wf;
      let hasChange = false;
      const updatedNodes = wf.nodes.map(node => {
        if (node.type === 'compare' && node.data?.ruleId === ruleId) {
          hasChange = true;
          return {
            ...node,
            data: {
              ...node.data,
              ruleId: '',
              ruleName: '',
              isConfigured: false
            }
          };
        }
        return node;
      });
      return hasChange ? { ...wf, nodes: updatedNodes, updatedAt: new Date().toISOString() } : wf;
    }));
  };

  const handleSaveComparisonWorkflow = (workflow: Workflow) => {
    setComparisonWorkflows(prev => {
      const exists = prev.find(w => w.id === workflow.id);
      if (exists) {
        return prev.map(w => w.id === workflow.id ? workflow : w);
      }
      return [...prev, workflow];
    });
    setToast({
      message: language === 'TH' ? 'บันทึกเวิร์กโฟลว์สำเร็จ' : 'Workflow saved successfully',
      type: 'success'
    });
    setCurrentView('DATA_COMPARISON_WORKFLOW');
  };

  const handleCreateWorkflow = () => {
    setSelectedWorkflow(undefined);
    setCurrentView('WORKFLOW_BUILDER');
  };

  const handleSaveWorkflow = (workflow: Workflow) => {
    setWorkflows(prev => {
      const exists = prev.find(w => w.id === workflow.id);
      if (exists) {
        return prev.map(w => w.id === workflow.id ? workflow : w);
      }
      return [...prev, workflow];
    });
    setToast({
      message: language === 'TH' ? 'บันทึกเวิร์กโฟลว์สำเร็จ' : 'Workflow saved successfully',
      type: 'success'
    });
    setCurrentView('WORKFLOW_LIST');
  };

  const handleEdit = (agent: Agent) => {
    setSelectedAgent(agent);
    setFormMode('EDIT');
    setCurrentView('AGENT_FORM');
  };

  const handleView = (agent: Agent) => {
    setSelectedAgent(agent);
    setFormMode('VIEW');
    setCurrentView('AGENT_FORM');
  };

  const handleCreate = () => {
    setSelectedAgent(undefined);
    setFormMode('CREATE');
    setCurrentView('AGENT_FORM');
  };

  const handleSave = (savedAgent: Agent) => {
    setAgents(prev => {
      const exists = prev.find(a => a.id === savedAgent.id);
      if (exists) {
        return prev.map(a => a.id === savedAgent.id ? savedAgent : a);
      }
      // New agent
      const newAgentWithMeta = {
          ...savedAgent,
          createdAt: new Date().toISOString(),
          createdBy: getCurrentUser(),
          updatedBy: getCurrentUser()
      };
      return [...prev, newAgentWithMeta];
    });

    // Add Audit Log
    const action = selectedAgent ? 'UPDATE' : 'CREATE';
    const newLog: AuditLog = {
        id: `log-${Date.now()}`,
        action,
        user: getCurrentUser(),
        timestamp: new Date().toISOString(),
        details: `${action === 'CREATE' ? 'Created' : 'Updated'} agent "${savedAgent.name}". Status: ${savedAgent.status}`
    };
    setLogs(prev => [newLog, ...prev]);

    setCurrentView('AGENT_LIST');
  };

  const handleDelete = (agent: Agent) => {
      if (window.confirm(`${t.confirmDeleteAgent}\nAgent: ${agent.name}`)) {
        setAgents(prev => prev.filter(a => a.id !== agent.id));
        const newLog: AuditLog = {
            id: `log-${Date.now()}`,
            action: 'DELETE',
            user: getCurrentUser(),
            timestamp: new Date().toISOString(),
            details: `Deleted agent "${agent.name}"`
        };
        setLogs(prev => [newLog, ...prev]);
      }
  };

  const handleToggleStatus = (agent: Agent) => {
    if (role !== UserRole.ADMIN) return;
    
    const newStatus = agent.status === AgentStatus.ACTIVE ? AgentStatus.INACTIVE : AgentStatus.ACTIVE;
    // Check validation if trying to activate
    if (newStatus === AgentStatus.ACTIVE && !agent.workflowId) {
        window.alert(t.alertActivateFail);
        return;
    }

    const updatedAgent = { 
        ...agent, 
        status: newStatus, 
        updatedAt: new Date().toISOString(),
        updatedBy: getCurrentUser()
    };
    
    setAgents(prev => prev.map(a => a.id === updatedAgent.id ? updatedAgent : a));
    
    // Log
    const newLog: AuditLog = {
        id: `log-${Date.now()}`,
        action: newStatus === AgentStatus.ACTIVE ? 'ENABLE' : 'DISABLE',
        user: getCurrentUser(),
        timestamp: new Date().toISOString(),
        details: `Changed status to ${newStatus}`
    };
    setLogs(prev => [newLog, ...prev]);
  };

  const toggleRole = () => {
      setRole(prev => prev === UserRole.ADMIN ? UserRole.USER : UserRole.ADMIN);
  };

  const handleNavigate = (view: 'TRACKING' | 'AGENT_LIST' | 'UPLOAD' | 'WORKFLOW_LIST' | 'DATA_COMPARISON_JOBS' | 'DATA_COMPARISON_WORKFLOW' | 'DATA_COMPARISON_RULE' | 'DATA_COMPARISON_WORKFLOW_BUILDER' | 'SETTINGS_DOC_TYPE_MASTER' | 'SETTINGS_LABEL_SCHEMA' | 'SETTINGS_MASTER_DATA') => {
      setCurrentView(view);
  };

  React.useEffect(() => {
    const handleViewChange = (e: Event) => {
      const customEvent = e as CustomEvent;
      if (customEvent.detail) {
        setCurrentView(customEvent.detail);
      }
    };
    window.addEventListener('change-view', handleViewChange);
    return () => window.removeEventListener('change-view', handleViewChange);
  }, []);

  const handleViewExtraction = (item: TrackingItem) => {
      setExtractionItem(item);
      setCurrentView('EXTRACTION');
  };

  const handleStartReading = (item: TrackingItem) => {
      // 1. Set status to READING immediately
      setTrackingItems(prev => prev.map(i => 
          i.id === item.id ? { ...i, reviewStatus: ReviewStatus.READING } : i
      ));

      // 2. Simulate Delay (3 seconds) then set to WAIT_FOR_REVIEW
      setTimeout(() => {
          setTrackingItems(prev => prev.map(i => 
              i.id === item.id ? { ...i, reviewStatus: ReviewStatus.WAIT_FOR_REVIEW } : i
          ));
      }, 3000);
  };

  const handleUploadFiles = (files: File[]) => {
      // Mock converting Files to TrackingItems
      const newItems: TrackingItem[] = files.map((file, idx) => ({
          id: `up-${Date.now()}-${idx}`,
          fileName: file.name,
          date: new Date().toISOString().split('T')[0],
          performer: getCurrentUser(),
          source: TrackingSource.UPLOAD,
          reviewStatus: ReviewStatus.UNREAD,
          sendStatus: SendStatus.NOT_SENT,
          docType: 'Invoice',
          ref: '-'
      }));

      setTrackingItems(prev => [...newItems, ...prev]);
      setCurrentView('TRACKING');
  };

  return (
      <Layout 
        currentUserRole={role} 
        onToggleRole={toggleRole} 
        language={language} 
        onLanguageChange={setLanguage}
        onNavigate={handleNavigate}
      >
        {currentView === 'TRACKING' && (
           <TrackingPage 
              language={language} 
              items={trackingItems}
              onViewExtraction={handleViewExtraction}
              onUploadClick={() => setCurrentView('UPLOAD')}
              onStartRead={handleStartReading}
           />
        )}

        {currentView === 'UPLOAD' && (
           <UploadPage 
              language={language}
              onUpload={handleUploadFiles}
           />
        )}

        {currentView === 'EXTRACTION' && extractionItem && (
            <ExtractionView 
               item={extractionItem}
               language={language}
               onBack={() => setCurrentView('TRACKING')}
               onSave={() => {
                 setCurrentView('TRACKING');
                 setToast({
                   message: language === 'TH' ? 'บันทึกข้อมูลเรียบร้อยแล้ว' : 'Data saved successfully',
                   type: 'success'
                 });
               }}
            />
        )}

        {currentView === 'AGENT_LIST' && (
          <AgentList 
            agents={agents} 
            role={role}
            language={language}
            onEdit={handleEdit} 
            onView={handleView}
            onCreate={handleCreate} 
            onToggleStatus={handleToggleStatus}
            onDelete={handleDelete}
          />
        )}

        {currentView === 'AGENT_FORM' && (
          <AgentForm 
            initialData={selectedAgent} 
            role={role}
            language={language}
            onSave={handleSave} 
            onBack={() => setCurrentView('AGENT_LIST')}
            auditLogs={selectedAgent ? logs.filter(l => l.details.includes(selectedAgent.name)) : []}
            readOnly={formMode === 'VIEW'}
          />
        )}

        {currentView === 'WORKFLOW_LIST' && (
          <WorkflowList 
            workflows={workflows}
            language={language}
            onEdit={handleEditWorkflow}
            onDelete={handleDeleteWorkflow}
            onCreate={handleCreateWorkflow}
            onToggleStatus={handleToggleWorkflowStatus}
            onDuplicate={handleDuplicateWorkflow}
          />
        )}

        {currentView === 'WORKFLOW_BUILDER' && (
          <WorkflowBuilder 
            workflow={selectedWorkflow}
            language={language}
            trackingItems={trackingItems}
            onSave={handleSaveWorkflow}
            onBack={() => setCurrentView('WORKFLOW_LIST')}
          />
        )}

        {currentView === 'DATA_COMPARISON_JOBS' && (
          <DataComparison 
            language={language}
            trackingItems={trackingItems}
            role={role}
          />
        )}

        {currentView === 'DATA_COMPARISON_WORKFLOW' && (
          <ComparisonWorkflow 
            language={language}
            workflows={comparisonWorkflows}
            onEdit={handleEditComparisonWorkflow}
            onDelete={handleDeleteComparisonWorkflow}
            onCreate={() => {
              setSelectedWorkflow(undefined);
              setCurrentView('DATA_COMPARISON_WORKFLOW_BUILDER');
            }}
            onToggleStatus={handleToggleComparisonWorkflowStatus}
            onDuplicate={handleDuplicateComparisonWorkflow}
          />
        )}

        {currentView === 'DATA_COMPARISON_WORKFLOW_BUILDER' && (
          <DataComparisonWorkflowBuilder 
            workflow={selectedWorkflow}
            language={language}
            docTypes={docTypes}
            onSave={(wf) => {
              handleSaveComparisonWorkflow(wf);
            }}
            onBack={() => setCurrentView('DATA_COMPARISON_WORKFLOW')}
          />
        )}

        {currentView === 'DATA_COMPARISON_RULE' && (
           <ManageRule 
             language={language}
             comparisonWorkflows={comparisonWorkflows}
             onDeleteRule={handleDeleteRuleFromApp}
           />
        )}

        {(currentView === 'SETTINGS_DOC_TYPE_MASTER' || currentView === 'SETTINGS_LABEL_SCHEMA') && (
           <DocTypeMaster 
             initialTab={currentView === 'SETTINGS_LABEL_SCHEMA' ? 'schema' : 'doctype'}
             setComparisonWorkflows={setComparisonWorkflows}
             language={language}
             docTypes={docTypes}
             workflows={workflows}
             comparisonWorkflows={comparisonWorkflows}
             onAddDocType={(newType) => {
               setDocTypes((prev) => [...prev, newType]);
               setToast({
                 message: language === 'TH' ? `เพิ่มประเภทเอกสาร ${newType.name} เรียบร้อยแล้ว` : `Successfully added ${newType.name} document type`,
                 type: 'success'
               });
             }}
             onUpdateDocType={(updatedType) => {
               setDocTypes((prev) => prev.map(d => d.id === updatedType.id ? updatedType : d));
               setToast({
                 message: language === 'TH' ? `อัปเดตประเภทเอกสาร ${updatedType.name} เรียบร้อยแล้ว` : `Successfully updated ${updatedType.name}`,
                 type: 'success'
               });
             }}
             onDeleteDocType={(idToDelete) => {
               const targetType = docTypes.find(d => d.id === idToDelete);
               setDocTypes((prev) => prev.filter(d => d.id !== idToDelete));
               
               // Also clean up referenced document type in workflows
               setWorkflows((prevWorkflows) => 
                 prevWorkflows.map(wf => ({
                   ...wf,
                   nodes: wf.nodes.map(node => {
                     if (node.type === 'group_of_file' && node.data) {
                       const updatedDetect = node.data.docTypesToDetect 
                         ? node.data.docTypesToDetect.filter((t: string) => t !== idToDelete)
                         : undefined;
                       const updatedFiles = node.data.fileTypes 
                         ? node.data.fileTypes.filter((t: string) => 
                             t !== idToDelete && 
                             t.toUpperCase() !== idToDelete.toUpperCase() &&
                             t.toUpperCase() !== targetType?.name?.toUpperCase() &&
                             !(idToDelete === 'INV' && t.toUpperCase() === 'INVOICE') &&
                             !(idToDelete === 'BL' && (t.toUpperCase() === 'B/L' || t.toUpperCase() === 'BOL'))
                           )
                         : undefined;
                       return {
                         ...node,
                         data: {
                           ...node.data,
                           ...(updatedDetect !== undefined ? { docTypesToDetect: updatedDetect } : {}),
                           ...(updatedFiles !== undefined ? { fileTypes: updatedFiles } : {})
                         }
                       };
                     }
                     return node;
                   })
                 }))
               );

               setComparisonWorkflows((prevWorkflows) => 
                 prevWorkflows.map(wf => ({
                   ...wf,
                   nodes: wf.nodes.map(node => {
                     if (node.type === 'group_of_file' && node.data) {
                       const updatedDetect = node.data.docTypesToDetect 
                         ? node.data.docTypesToDetect.filter((t: string) => t !== idToDelete)
                         : undefined;
                       const updatedFiles = node.data.fileTypes 
                         ? node.data.fileTypes.filter((t: string) => 
                             t !== idToDelete && 
                             t.toUpperCase() !== idToDelete.toUpperCase() &&
                             t.toUpperCase() !== targetType?.name?.toUpperCase() &&
                             !(idToDelete === 'INV' && t.toUpperCase() === 'INVOICE') &&
                             !(idToDelete === 'BL' && (t.toUpperCase() === 'B/L' || t.toUpperCase() === 'BOL'))
                           )
                         : undefined;
                       return {
                         ...node,
                         data: {
                           ...node.data,
                           ...(updatedDetect !== undefined ? { docTypesToDetect: updatedDetect } : {}),
                           ...(updatedFiles !== undefined ? { fileTypes: updatedFiles } : {})
                         }
                       };
                     }
                     return node;
                   })
                 }))
               );

               setToast({
                 message: language === 'TH' ? `ลบประเภทเอกสาร ${targetType?.name || idToDelete} เรียบร้อยแล้ว` : `Successfully deleted ${targetType?.name || idToDelete}`,
                 type: 'success'
               });
             }}
             onBack={() => setCurrentView('TRACKING')}
           />
        )}

        {currentView === 'SETTINGS_JOB_PRESET' && (
          <JobPresetSettings
            language={language}
            workflows={workflows}
            comparisonWorkflows={comparisonWorkflows}
            presets={jobPresets}
            onAddPreset={(preset) => setJobPresets([...jobPresets, preset])}
            onUpdatePreset={(preset) => setJobPresets(jobPresets.map(p => p.id === preset.id ? preset : p))}
            onDeletePreset={(id) => setJobPresets(jobPresets.filter(p => p.id !== id))}
            onBack={() => setCurrentView('TRACKING')}
          />
        )}

        {currentView === 'SETTINGS_MASTER_DATA' && (
          <div className="flex-1 overflow-y-auto">
            <MasterDataSettings 
              language={language}
              onBack={() => {
                setCurrentView('TRACKING');
              }}
            />
          </div>
        )}

        {/* Global Toast Notification */}
        <AnimatePresence>
          {toast && (
            <motion.div 
              initial={{ opacity: 0, y: 50, x: '-50%' }}
              animate={{ opacity: 1, y: 0, x: '-50%' }}
              exit={{ opacity: 0, y: 20, x: '-50%', scale: 0.95 }}
              className="fixed bottom-10 left-1/2 z-[2000] pointer-events-none"
            >
              <div className={`px-6 py-3.5 rounded-2xl shadow-2xl flex items-center gap-3 border ${
                toast.type === 'success' ? 'bg-emerald-600 text-white border-emerald-500' : 'bg-red-600 text-white border-red-500'
              }`}>
                {toast.type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
                <span className="text-sm font-black uppercase tracking-tight">{toast.message}</span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {confirmToggleDialog.isOpen && confirmToggleDialog.workflow && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm"
            >
              <motion.div 
                initial={{ scale: 0.95, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.95, y: 20 }}
                className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden border border-white/20 text-center"
              >
                <div className="p-6">
                  <div className="flex items-center justify-center mx-auto mb-4 text-amber-500">
                    <AlertCircle size={48} />
                  </div>
                  <h3 className="text-xl font-black text-[#010136] tracking-tight leading-tight mb-2">
                    {language === 'TH' ? 'เวิร์กโฟลว์ยังตั้งค่าไม่สมบูรณ์' : 'Incomplete Configuration'}
                  </h3>
                  <p className="text-xs font-semibold text-slate-500 leading-relaxed w-full mb-6">
                    {language === 'TH' 
                      ? 'workflow นี้ยังมี node ที่ config ไม่ครบ ต้องการ enable ต่อไปหรือไม่?'
                      : 'This workflow still has incomplete nodes. Are you sure you want to proceed and enable it?'}
                  </p>
                  <div className="flex gap-3">
                    <button 
                      onClick={() => setConfirmToggleDialog({ isOpen: false, workflow: null, type: 'STANDARD' })}
                      className="flex-1 py-2.5 border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 rounded-[4px] font-bold text-xs uppercase tracking-widest transition-all cursor-pointer h-[40px]"
                    >
                      {language === 'TH' ? 'ยกเลิก' : 'Cancel'}
                    </button>
                    <button 
                      onClick={() => executeToggleWorkflowStatus(confirmToggleDialog.workflow!, confirmToggleDialog.type)}
                      className="flex-1 py-2.5 bg-[#1F5DF9] hover:bg-[#104BE3] text-white rounded-[4px] font-bold text-xs uppercase tracking-widest transition-all shadow-md cursor-pointer h-[40px]"
                    >
                      {language === 'TH' ? 'ยืนยันการเปิดใช้งาน' : 'Confirm Enable'}
                    </button>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Delete Workflow Modal */}
        <AnimatePresence>
          {deleteWorkflowDialog.isOpen && deleteWorkflowDialog.workflow && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm"
            >
              <motion.div 
                initial={{ scale: 0.95, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.95, y: 20 }}
                className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden border border-white/20 text-center"
              >
                {deleteWorkflowDialog.workflow.status === 'ACTIVE' ? (
                  <div className="p-6">
                    <div className="flex items-center justify-center mx-auto mb-4 text-amber-500">
                      <AlertCircle size={48} />
                    </div>
                    <div className="space-y-2 mb-6">
                      <h3 className="text-xl font-black text-[#010136] tracking-tight leading-tight">
                        {t.errDeleteActiveTitle}
                      </h3>
                      <p className="text-xs font-semibold text-slate-500 leading-relaxed w-full">
                        {t.errDeleteActiveDesc}
                      </p>
                    </div>
                    <div className="flex gap-3">
                      <button 
                        onClick={() => setDeleteWorkflowDialog({ isOpen: false, workflow: null, type: 'STANDARD' })}
                        className="flex-1 py-2.5 border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 rounded-[4px] font-bold text-xs uppercase tracking-widest transition-all cursor-pointer h-[40px]"
                      >
                        {t.btnCancel}
                      </button>
                      <button 
                        onClick={() => {
                          if (deleteWorkflowDialog.workflow) {
                            executeToggleWorkflowStatus(deleteWorkflowDialog.workflow, deleteWorkflowDialog.type);
                          }
                        }}
                        className="flex-1 py-2.5 bg-[#1F5DF9] hover:bg-[#104BE3] text-white rounded-[4px] font-bold text-xs uppercase tracking-widest transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer h-[40px]"
                      >
                        <Power size={14} />
                        {t.btnGoToDisable}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="p-6">
                    <div className="flex items-center justify-center mx-auto mb-4 text-amber-500">
                      <AlertCircle size={48} />
                    </div>
                    <div className="space-y-3 mb-6 text-center">
                      <h3 className="text-xl font-black text-[#010136] tracking-tight leading-tight">
                        {t.confirmDeleteWorkflowTitle}
                      </h3>
                      <div className="space-y-3">
                        <p className="text-xs font-bold text-slate-700 bg-slate-50 py-2.5 px-4 rounded-[4px] border border-slate-150 italic w-full truncate">
                          "{deleteWorkflowDialog.workflow.name}"
                        </p>
                        <div className="p-3 bg-rose-50/40 rounded-lg border border-rose-100/60 w-full">
                          <p className="text-[11px] font-bold text-rose-600 leading-relaxed mb-1">
                            {t.confirmDeleteWorkflowDesc(deleteWorkflowDialog.workflow.name)}
                          </p>
                          <p className="text-[10px] font-medium text-rose-400">
                            {t.confirmDeleteWorkflowNote}
                          </p>
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-3">
                      <button 
                        onClick={() => setDeleteWorkflowDialog({ isOpen: false, workflow: null, type: 'STANDARD' })}
                        className="flex-1 py-2.5 bg-white text-slate-600 border border-slate-200 rounded-[4px] font-bold text-xs uppercase tracking-widest transition-all hover:bg-slate-50"
                      >
                        {t.btnCancel}
                      </button>
                      <button 
                        onClick={executeDeleteWorkflow}
                        className="flex-1 py-2.5 bg-[#1F5DF9] hover:bg-[#104BE3] text-white rounded-[4px] font-bold text-xs uppercase tracking-widest transition-all shadow-md shadow-blue-500/10"
                      >
                        {t.btnConfirmDeleteShort}
                      </button>
                    </div>
                  </div>
                )}
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </Layout>
  );
}

export default App;