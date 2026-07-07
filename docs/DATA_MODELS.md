# Data Models & Interfaces

This document outlines the core data structures used in the Logistics Data Comparison application. Currently, this schema drives the `mock-data/` artifacts and should be used to map responses from future backend APIs.

## 1. Job Entity (`Job`)
Represents a single logistics transaction or workflow.

```typescript
export enum JobStatus {
  NEW = 'NEW',
  PENDING = 'PENDING',
  REVIEW = 'REVIEW',
  READY = 'READY',
  DONE = 'DONE',
  PROCESSING = 'PROCESSING',
}

export interface Job {
  id: string; // e.g. 'JOB-8326'
  timestamp: string; // ISO format or localized string
  title: string;
  type: string;
  assignees: string[];
  totalFiles: number;
  uploadedFiles: number;
  status: JobStatus;
  docs: Record<string, ComparisonDocStatus>;
}
```

## 2. Document Entity (`Document`)
Tracks individual files within a job (e.g., Invoice, Packing List, B/L).

```typescript
export enum ComparisonDocStatus {
  MISSING = 'MISSING',
  RECEIVED = 'RECEIVED',
  EXTRACTING = 'EXTRACTING',
  OCR_DONE = 'OCR_DONE',
  MATCHED = 'MATCHED',
  MISMATCHED = 'MISMATCHED',
  ERROR = 'ERROR',
  LOCKED = 'LOCKED',
}

export interface DocumentFile {
  id: string;
  name: string;
  size: number;
  type: string;
  url?: string;
  category?: string; // AI categorised vs actual
}
```

## 3. Comparison Row Entity (`ComparisonRow`)
Represents the extracted data fields being verified across multiple documents against a master field.

```typescript
export interface ComparisonRow {
  id: string;
  field: string;               // e.g. "Shipper Name", "Total Weight"
  sourceValue: string;         // Master / Source of Truth
  documents: Record<string, {
      value: string;           // Extracted value
      status: 'MATCH' | 'MISMATCH' | 'SYNONYM' | 'WAITING' | 'ERROR';
      ruleTitle?: string;      // Optional text if matched by synonym rule
  }>;
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
