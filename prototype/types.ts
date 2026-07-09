
export enum AgentType {
  MAIL = 'MAIL',
  AI = 'AI'
}

export interface DocTypeSchemaField {
  id: string;
  key: string;
  name: string;
  type: string;
  required: boolean;
  minConfidence: number;
  masterData?: string;
}

export interface DocType {
  id: string;
  name: string;
  hint: string;
  pattern?: string;
  schema?: DocTypeSchemaField[];
}

export enum AgentStatus {
  DRAFT = 'DRAFT',
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE'
}

export enum UserRole {
  ADMIN = 'ADMIN',
  MANAGER = 'MANAGER',
  OPERATION = 'OPERATION',
  USER = 'USER'
}

export enum JobStatus {
  NEW = 'NEW',
  PENDING = 'PENDING',
  REVIEW = 'REVIEW',
  READY = 'READY',
  DONE = 'DONE',
  PROCESSING = 'PROCESSING'
}

export enum ComparisonDocStatus {
  MISSING = 'MISSING',
  RECEIVED = 'RECEIVED',
  EXTRACTING = 'EXTRACTING',
  ERROR = 'ERROR',
  MATCHED = 'MATCHED',
  MISMATCHED = 'MISMATCHED',
  LOCKED = 'LOCKED',
  OCR_DONE = 'OCR_DONE'
}

export interface ComparisonJob {
  id: string;
  reference: string;
  expiryDate: string;
  createdAt?: string;
  workflowName?: string;
  assignee?: string;
  isLocked?: boolean;
  status: JobStatus;
  docs: Record<string, ComparisonDocStatus>;
  updatedDocs?: string[]; // List of doc names that have been updated with new versions
  progress: number;
  totalDocs: number;
  foundDocs: number;
  matchedCount?: number;
  mismatchedCount?: number;
  totalFieldsCount?: number;
  accuracyScore?: number;
  tags?: string[];
}

export type Language = 'EN' | 'TH';

export interface AuditLog {
  id: string;
  action: string;
  user: string;
  timestamp: string;
  details: string;
  originalItem?: any;
}

export interface MailConfig {
  senderEmail?: string;
  receiverEmail?: string;
  enableFilter: boolean;
  subjectKeywords: string[];
  bodyKeywords: string[];
  subjectTemplate?: string;
  bodyTemplate?: string;
}

export interface AIConfig {
  inputSource?: string;
  outputAction?: string;
  model: string;
}

export interface DriveConfig {
  autoSave: boolean;
  targetFolderPath?: string;
  autoRename: boolean;
  renamePattern?: string; // e.g. {DocNo}_{Date}
  autoCreateFolder: boolean;
  folderStructure?: string; // e.g. /{Year}/{Customer}/
}

export interface Agent {
  id: string;
  name: string;
  description: string;
  type: AgentType;
  status: AgentStatus;
  createdAt: string;
  createdBy: string;
  updatedAt: string;
  updatedBy: string;
  companyId: string;
  workflowId?: string; // The workflow this agent is bound to
  triggerEvent?: string; // e.g., "On Document Create"
  startTime?: string;
  endTime?: string;
  
  // Specific Configs
  mailConfig?: MailConfig;
  aiConfig?: AIConfig;
  driveConfig?: DriveConfig;
}

// Tracking Types
export enum TrackingSource {
  UPLOAD = 'UPLOAD',
  EMAIL = 'EMAIL',
  API = 'API'
}

export enum ReviewStatus {
  UNREAD = 'UNREAD',            // ยังไม่อ่านข้อมูล
  READING = 'READING',          // กำลังอ่านข้อมูล
  READ_FAILED = 'READ_FAILED',  // อ่านข้อมูลไม่สำเร็จ
  WAIT_FOR_REVIEW = 'WAIT_FOR_REVIEW', // รอรีวิว
  DRAFT = 'DRAFT',              // บันทึกแบบร่าง
  REVIEWED = 'REVIEWED'         // รีวิวแล้ว
}

export enum SendStatus {
  NOT_SENT = 'NOT_SENT',        // ยังไม่ส่ง
  SENDING = 'SENDING',          // กำลังส่ง...
  SENT = 'SENT',                // ส่งแล้ว
  FAILED = 'FAILED'             // ส่งไม่สำเร็จ
}

export interface TrackingItem {
  id: string;
  fileName: string;
  date: string;
  performer: string;
  source: TrackingSource;
  reviewStatus: ReviewStatus;
  sendStatus: SendStatus;
  docType: string;
  ref: string;
}

export interface Workflow {
  id: string;
  name: string;
  description: string;
  status: 'ACTIVE' | 'INACTIVE';
  createdAt: string;
  updatedAt: string;
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
  edgeStyle?: 'smooth' | 'straight' | 'elbow';
}

export interface WorkflowNode {
  id: string;
  type: 'input' | 'mapping' | 'output' | 'get_file' | 'hybrid_mail_filter' | 'attachment_filter' | 'group_of_file' | 'create_job' | 'send_to' | 'assign_job' | 'route_job' | 'filter_data' | 'inspect_data' | 'approve_data' | 'connector' | 'doc_classifier' | 'storage' | 'extract' | 'compare' | 'send_email';
  position: { x: number; y: number };
  data: any;
}

export interface WorkflowEdge {
  id: string;
  source: string;
  target: string;
  sourcePortId?: string;
  style?: 'smooth' | 'straight' | 'elbow';
}

export interface ComparisonFile {
  id: string;
  name: string;
  type: 'SOURCE' | 'TARGET';
  fields: string[];
  uploadDate: string;
  data?: Record<string, any>;
}

export interface FieldMapping {
  sourceField: string;
  targetField: string;
  targetFileId: string;
}

// Mock Data Types
export const AVAILABLE_WORKFLOWS = [
  { id: 'wf-001', name: 'Invoice Processing' },
  { id: 'wf-002', name: 'Customer Support Ticket' },
  { id: 'wf-003', name: 'HR Onboarding' },
  { id: 'time-range', name: 'Time Range' }
];

export const AVAILABLE_TRIGGERS = [
  'On Email Received',
  'On Document Created',
  'Schedule: Daily 9:00 AM',
  'Manual Trigger Only'
];

export const ALLOWED_VARIABLES = ['{DocNo}', '{Date}', '{Customer}', '{AgentName}', '{Year}', '{Month}', '{DocType}'];

export interface JobPresetWorkflow {
  id: string;
  workflowId: string;
  assignedTeams: string[];
}

export interface JobPreset {
  id: string;
  name: string;
  assignedTeams: string[];
  workflows: JobPresetWorkflow[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}
