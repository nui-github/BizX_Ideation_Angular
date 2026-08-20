# Data Models & Interfaces

This document outlines the core data structures used in the Logistics Data Comparison application. Currently, this schema drives the `mock-data/` artifacts and should be used to map responses from future backend APIs.

> Canonical source: `prototype/types.ts`. This doc mirrors it — if the two ever disagree, `types.ts`
> wins; update this file to match rather than the other way around.

## 1. Job Entity (`ComparisonJob`)
Represents a single logistics transaction or workflow (one row in a shipment's sequence of sub-jobs).

```typescript
export enum JobStatus {
  NEW = 'NEW',
  PENDING = 'PENDING',
  REVIEW = 'REVIEW',
  READY = 'READY',
  DONE = 'DONE',
  PROCESSING = 'PROCESSING',
  // A later job in the shipment was kicked back to this one for corrections — distinct from
  // DONE so the shipment list re-blocks every job after this one until it's redone.
  REJECTED = 'REJECTED',
}

export interface ComparisonJob {
  id: string;
  reference: string;               // Shipment reference — jobs sharing this value form one shipment's sequence
  expiryDate: string;
  createdAt?: string;
  workflowName?: string;
  assignedTeam?: string;
  assignee?: string;
  isLocked?: boolean;
  status: JobStatus;
  docs: Record<string, ComparisonDocStatus>;
  updatedDocs?: string[];          // Doc names that have been updated with a new version
  progress: number;
  totalDocs: number;
  foundDocs: number;
  matchedCount?: number;
  mismatchedCount?: number;
  totalFieldsCount?: number;
  accuracyScore?: number;
  tags?: string[];
  // Present when a later job in the shipment rejected this job back for corrections.
  rejectionReason?: string;
  rejectedAt?: string;
  rejectedBy?: string;
}
```

## 2. Document Entity (`ComparisonDocStatus`)
Tracks the state of an individual document column within a job (e.g., Invoice, Packing List, B/L).

```typescript
export enum ComparisonDocStatus {
  MISSING = 'MISSING',
  RECEIVED = 'RECEIVED',
  EXTRACTING = 'EXTRACTING',
  ERROR = 'ERROR',
  MATCHED = 'MATCHED',
  MISMATCHED = 'MISMATCHED',
  LOCKED = 'LOCKED',
  OCR_DONE = 'OCR_DONE',
  // Extracted via OCR but the job was skipped before comparison ran — the data is present
  // but unverified, so it must render distinctly from MATCHED/LOCKED rather than implying
  // the values were checked against the master document.
  SKIPPED = 'SKIPPED',
}
```

## 3. Comparison Row Entity
Represents one extracted field being verified across every document column against the master/source value, plus one target per compared document.

```typescript
export interface ComparisonTarget {
  fileName: string;                // Doc column name this target belongs to
  value: string;
  status: 'MATCH' | 'MISMATCH' | 'SYNONYM' | 'NA';
  ruleTitle?: string;               // Set when matched via a synonym/master-lookup rule
  ruleDesc?: string;
  isPrimary?: boolean;              // Marks this doc as the "main" source for the field
}

export interface ComparisonRow {
  fieldName: string;                // e.g. "Consignee Name", "Total Quantity"
  sourceValue: string;              // Master / Source of Truth
  part: 'Header' | 'Description' | 'Footer';
  group?: string;                   // e.g. "Item 3" — line-item grouping within Description
  targets: ComparisonTarget[];
}
```

## 4. AI Analysis Metadata
Data structure for the "AI Analysis" section that provides confidence scores and suggestions.

```typescript
export interface AIAnalysis {
  confidenceScore: number;      // 0 - 100
  suggestedType: string;        // e.g. 'Commercial Invoice'
  analysisSummary: string;      // Text reasoning
}
```
