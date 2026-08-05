export interface TeamOption {
  value: string;
  label: string;
}

// Single source of truth for team options across the app (Job Preset Settings,
// Workflow assignment, etc.) — import this instead of redefining a local list.
export const MOCK_TEAMS: TeamOption[] = [
  { value: 'logistics', label: 'Logistics' },
  { value: 'accounting', label: 'Accounting' },
  { value: 'operation', label: 'Operation' },
  { value: 'customer_service', label: 'Customer Service' },
  { value: 'finance', label: 'Finance' },
  { value: 'customs', label: 'Customs' },
  { value: 'cds', label: 'CDS' },
  { value: 'pge', label: 'PGE' },
  { value: 'ssp', label: 'SSP' },
  { value: 'muj', label: 'MUJ' },
  { value: 'omt', label: 'OMT' },
  { value: 'b2s', label: 'B2S' },
  { value: 'mps', label: 'MPS' }
];
