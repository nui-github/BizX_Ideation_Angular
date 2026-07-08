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
  updatedDocs?: string[];
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
  renamePattern?: string;
  autoCreateFolder: boolean;
  folderStructure?: string;
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
  workflowId?: string;
  triggerEvent?: string;
  startTime?: string;
  endTime?: string;
  mailConfig?: MailConfig;
  aiConfig?: AIConfig;
  driveConfig?: DriveConfig;
}

export enum TrackingSource {
  UPLOAD = 'UPLOAD',
  EMAIL = 'EMAIL',
  API = 'API'
}

export enum ReviewStatus {
  UNREAD = 'UNREAD',
  READING = 'READING',
  READ_FAILED = 'READ_FAILED',
  WAIT_FOR_REVIEW = 'WAIT_FOR_REVIEW',
  DRAFT = 'DRAFT',
  REVIEWED = 'REVIEWED'
}

export enum SendStatus {
  NOT_SENT = 'NOT_SENT',
  SENDING = 'SENDING',
  SENT = 'SENT',
  FAILED = 'FAILED'
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
