import { TrackingItem, TrackingSource, ReviewStatus, SendStatus, AuditLog, ComparisonJob, JobStatus, ComparisonDocStatus } from '../app/core/models/types.model';

export const MOCK_TRACKING_DATA: TrackingItem[] = [
  { id: 't-1', fileName: 'INV-CN-2026-00451.pdf', date: '2026-04-25', performer: 'Mail Agent', source: TrackingSource.EMAIL, reviewStatus: ReviewStatus.REVIEWED, sendStatus: SendStatus.SENT, docType: 'Invoice', ref: 'JOB-00451' },
  { id: 't-2', fileName: 'PKL-CN-2026-00451.xlsx', date: '2026-04-25', performer: 'Mail Agent', source: TrackingSource.EMAIL, reviewStatus: ReviewStatus.REVIEWED, sendStatus: SendStatus.SENT, docType: 'Packing List', ref: 'JOB-00451' },
  { id: 't-3', fileName: 'FTA-FORM-E-CN-TH.pdf', date: '2026-06-08', performer: 'System', source: TrackingSource.EMAIL, reviewStatus: ReviewStatus.WAIT_FOR_REVIEW, sendStatus: SendStatus.NOT_SENT, docType: 'FTA', ref: 'JOB-00451' },
  { id: 't-4', fileName: 'BL-MSC-4451023.pdf', date: '2026-06-08', performer: 'MSC Gateway', source: TrackingSource.API, reviewStatus: ReviewStatus.REVIEWED, sendStatus: SendStatus.SENT, docType: 'B/L', ref: 'JOB-00451' },
  { id: 't-5', fileName: 'INV-JP-123-AUTO.pdf', date: '2026-06-08', performer: 'Mail Agent', source: TrackingSource.EMAIL, reviewStatus: ReviewStatus.WAIT_FOR_REVIEW, sendStatus: SendStatus.NOT_SENT, docType: 'Invoice', ref: 'JOB-00892' },
  { id: 't-6', fileName: 'PKL-JP-123-AUTO.pdf', date: '2026-06-08', performer: 'Mail Agent', source: TrackingSource.EMAIL, reviewStatus: ReviewStatus.WAIT_FOR_REVIEW, sendStatus: SendStatus.NOT_SENT, docType: 'Packing List', ref: 'JOB-00892' },
  { id: 't-7', fileName: 'DEC-IMPORT-TH-998.xml', date: '2026-06-08', performer: 'TradeNet', source: TrackingSource.API, reviewStatus: ReviewStatus.REVIEWED, sendStatus: SendStatus.SENT, docType: 'Import Declaration', ref: 'JOB-00998' },
  { id: 't-8', fileName: 'CO-CHAMBER-2026.png', date: '2026-04-28', performer: 'Admin User', source: TrackingSource.UPLOAD, reviewStatus: ReviewStatus.UNREAD, sendStatus: SendStatus.NOT_SENT, docType: 'Certificate of Origin', ref: 'JOB-00331' },
];

export const MOCK_LOGS: AuditLog[] = [
  { id: 'l1', action: 'CREATE', user: 'Admin User', timestamp: '2026-10-20T09:00:00Z', details: 'Created agent "Invoice Processor Alpha"' },
  { id: 'l2', action: 'ENABLE', user: 'Admin User', timestamp: '2026-10-25T10:30:00Z', details: 'Changed status from Draft to Active' }
];

export const MOCK_COMPARISON_JOBS: ComparisonJob[] = [
  {
    id: 'job-1',
    reference: 'US-TH-2026-00445',
    expiryDate: '2026-06-15',
    createdAt: '2026-06-08T01:00:00Z',
    workflowName: 'Import Document Cross-Check (v2)',
    assignee: 'Operation Team A',
    status: JobStatus.REVIEW,
    docs: {
      'Invoice': ComparisonDocStatus.MATCHED,
      'Packing List': ComparisonDocStatus.MATCHED,
      'Bill of Lading': ComparisonDocStatus.MISMATCHED,
      'Customs Declaration': ComparisonDocStatus.RECEIVED
    },
    progress: 75,
    totalDocs: 4,
    foundDocs: 3,
    matchedCount: 2,
    mismatchedCount: 1,
    totalFieldsCount: 32,
    accuracyScore: 88.5,
    tags: ['USA', 'High Priority']
  },
  {
    id: 'job-2',
    reference: 'JP-TH-2026-00992',
    expiryDate: '2026-06-20',
    createdAt: '2026-06-07T12:00:00Z',
    workflowName: 'FTA HS Code Compliance',
    assignee: 'Operation Team B',
    status: JobStatus.READY,
    docs: {
      'Invoice': ComparisonDocStatus.MATCHED,
      'Certificate of Origin': ComparisonDocStatus.MATCHED,
      'Packing List': ComparisonDocStatus.MATCHED
    },
    progress: 100,
    totalDocs: 3,
    foundDocs: 3,
    matchedCount: 3,
    mismatchedCount: 0,
    totalFieldsCount: 18,
    accuracyScore: 100,
    tags: ['Japan', 'Form E']
  }
];
