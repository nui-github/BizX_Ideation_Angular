import { Workflow, DocType } from '../app/core/models/types.model';

export const MOCK_DATA_SOURCES = [
  { id: 'ds-1', name: 'Vendor_Data.xlsx', fields: ['Vendor ID', 'Vendor Name', 'Address', 'Tax ID'] },
  { id: 'ds-2', name: 'Scanned_Invoice.pdf', fields: ['Invoice No', 'Date', 'Total Amount', 'VAT'] }
];

export const MOCK_WORKFLOWS: Workflow[] = [
  {
    id: 'wf-1',
    name: 'Invoice Processing to ERP',
    description: 'Extracts data from scanned invoices and pushes to SAP ERP.',
    status: 'ACTIVE',
    createdAt: '2026-08-15T10:00:00Z',
    updatedAt: '2026-09-20T14:30:00Z',
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
  }
];

export const MOCK_COMPARISON_WORKFLOWS: Workflow[] = [
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
  }
];

export const MOCK_DOC_TYPES: DocType[] = [
  { 
    id: 'INV', 
    name: 'Invoice', 
    hint: 'Commercial Invoice with billing details', 
    pattern: 'INV_*, INVOICE_*',
    schema: [
      { id: 'f-1', key: 'invoice_no', name: 'Invoice Number', type: 'text', required: true, minConfidence: 85 },
      { id: 'f-2', key: 'invoice_date', name: 'Invoice Date', type: 'date', required: true, minConfidence: 80 },
      { id: 'f-3', key: 'total_amount', name: 'Total Amount', type: 'currency', required: true, minConfidence: 90 }
    ]
  },
  { 
    id: 'BL', 
    name: 'Bill of Lading', 
    hint: 'Shipping document with cargo details', 
    pattern: 'BL_*, BOL_*',
    schema: [
      { id: 'f-4', key: 'bl_no', name: 'B/L Number', type: 'text', required: true, minConfidence: 85 },
      { id: 'f-5', key: 'shipper', name: 'Shipper Name', type: 'text', required: true, minConfidence: 75 }
    ]
  }
];
