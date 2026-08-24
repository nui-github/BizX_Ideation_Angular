import React, { useState } from 'react';
import { Modal, Select, Input, Empty, Button, Tooltip, Tag, Popconfirm, Checkbox, Switch, message, Drawer, Popover } from 'antd';
import { 
  FileText, Plus, Trash2, Pencil, Copy, AlertCircle, ArrowLeft,
  Settings, Check, Search, Calendar, ChevronRight, Workflow as WorkflowIcon,
  Layers, Database, Clock, Info, HelpCircle, LayoutGrid, List, X,
  ChevronDown
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Language, DocType, Workflow } from '../types';
import { MOCK_TEAMS } from '../mock-data/teams.mock';

export interface SchemaLabel {
  id: string;
  name: string;
  required: boolean; // default: true (Required)
  compare: boolean; // default: false (Compare node)
  type?: string; // e.g. string, number, boolean, date, array
  subLabels?: SchemaLabel[];
  section?: 'Header' | 'Description' | 'Footer';
  aiPrompt?: string;
}

export interface DocTypeSchemaConfig {
  docTypeId: string;
  labels: SchemaLabel[];
  extractionMethod?: 'ai' | 'xml' | 'excel'; // how the AI extracts values for this doc type — default 'ai'
  aiExtractionPrompt?: string; // free-text hint used only when extractionMethod === 'ai'
  sampleFileName?: string; // sample XML/Excel file name used to map field positions
}

export interface LabelSchema {
  id: string;
  name: string;
  description: string;
  templateType?: string;
  aiPrompt?: string;
  docTypes: string[]; // docType IDs
  workflowIds: string[]; // workflow IDs
  assignedTeams: string[]; // team values (see MOCK_TEAMS)
  updatedAt: string;
  configs: DocTypeSchemaConfig[];
}

interface LabelSchemaSettingsProps {
  language: Language;
  docTypes: DocType[];
  workflows: Workflow[];
  comparisonWorkflows: Workflow[];
  onBack?: () => void;
  setComparisonWorkflows?: React.Dispatch<React.SetStateAction<Workflow[]>>;
  hideHeader?: boolean;
}

export const DEFAULT_SCHEMAS: LabelSchema[] = [
  {
    id: 'ls-inv',
    name: 'Invoice',
    description: 'Schema สำหรับเอกสาร Invoice — ตรวจสอบเลขที่ใบแจ้งหนี้ วันที่ และยอดรวม',
    templateType: 'invoice-schema',
    docTypes: ['INV'],
    workflowIds: ['cwf-1', 'cwf-po-pi', 'cwf-shipping-doc', 'cwf-import-dec-1'],
    assignedTeams: ['ALL'],
    updatedAt: '2026-06-01T09:00:00Z',
    configs: [
      {
        docTypeId: 'INV',
        labels: [
          { id: 'l-inv-1', name: 'Invoice Number', required: true, compare: true, section: 'Header', type: 'string' },
          { id: 'l-inv-2', name: 'Invoice Date', required: true, compare: false, section: 'Header', type: 'date' },
          { id: 'l-inv-3', name: 'Vendor Name', required: false, compare: false, section: 'Header', type: 'string' },
          { id: 'l-inv-4', name: 'Tax ID', required: false, compare: true, section: 'Header', type: 'string' },
          { id: 'l-inv-5', name: 'Total Amount', required: true, compare: true, section: 'Footer', type: 'number' }
        ]
      }
    ]
  },
  {
    id: 'ls-bl',
    name: 'Bill of Lading',
    description: 'Schema สำหรับเอกสาร Bill of Lading — ตรวจสอบผู้ส่ง ผู้รับ และรายละเอียดการขนส่ง',
    templateType: 'bl-schema',
    docTypes: ['BL'],
    workflowIds: ['cwf-shipping-doc', 'cwf-import-dec-1'],
    assignedTeams: ['ALL'],
    updatedAt: '2026-06-02T09:00:00Z',
    configs: [
      {
        docTypeId: 'BL',
        labels: [
          { id: 'l-bl-1', name: 'B/L Number', required: true, compare: true, section: 'Header', type: 'string' },
          { id: 'l-bl-2', name: 'Shipper Name', required: true, compare: false, section: 'Header', type: 'string' },
          { id: 'l-bl-3', name: 'Consignee Name', required: true, compare: true, section: 'Header', type: 'string' },
          { id: 'l-bl-4', name: 'Vessel Name', required: false, compare: false, section: 'Header', type: 'string' },
          { id: 'l-bl-5', name: 'Port of Loading', required: false, compare: true, section: 'Header', type: 'string' }
        ]
      }
    ]
  },
  {
    id: 'ls-pl',
    name: 'Packing List',
    description: 'Schema สำหรับเอกสาร Packing List — ตรวจสอบเลขที่และจำนวนหีบห่อ',
    templateType: 'pl-schema',
    docTypes: ['PL'],
    workflowIds: ['cwf-1', 'cwf-shipping-doc', 'cwf-import-dec-1'],
    assignedTeams: ['ALL'],
    updatedAt: '2026-06-03T09:00:00Z',
    configs: [
      {
        docTypeId: 'PL',
        labels: [
          { id: 'l-pl-1', name: 'Packing List No', required: false, compare: true, section: 'Header', type: 'string' },
          { id: 'l-pl-2', name: 'Total Packages', required: true, compare: true, section: 'Footer', type: 'number' }
        ]
      }
    ]
  },
  {
    id: 'ls-po',
    name: 'Purchase Order',
    description: 'Schema สำหรับเอกสาร Purchase Order — ตรวจสอบเลขที่ใบสั่งซื้อและยอดรวม',
    templateType: 'po-schema',
    docTypes: ['PO'],
    workflowIds: ['cwf-2'],
    assignedTeams: ['ALL'],
    updatedAt: '2026-06-04T09:00:00Z',
    configs: [
      {
        docTypeId: 'PO',
        labels: [
          { id: 'l-po-1', name: 'PO Number', required: true, compare: true, section: 'Header', type: 'string' },
          { id: 'l-po-2', name: 'PO Date', required: true, compare: false, section: 'Header', type: 'date' },
          { id: 'l-po-3', name: 'Total Amount', required: false, compare: true, section: 'Footer', type: 'number' }
        ]
      }
    ]
  },
  {
    id: 'ls-co',
    name: 'Certificate of Origin',
    description: 'ตรวจสอบความถูกต้องของหนังสือรับรองถิ่นกำเนิดสินค้าเพื่อสิทธิประโยชน์ทางภาษี',
    templateType: 'co-schema',
    docTypes: ['CO'],
    workflowIds: ['cwf-2'],
    assignedTeams: ['ALL'],
    updatedAt: '2026-06-05T09:00:00Z',
    configs: [
      {
        docTypeId: 'CO',
        labels: [
          { id: 'l-co-1', name: 'Certificate No', required: true, compare: true, section: 'Header', type: 'string' },
          { id: 'l-co-2', name: 'Origin Country', required: true, compare: true, section: 'Header', type: 'string' }
        ]
      }
    ]
  },
  {
    id: 'ls-do',
    name: 'Delivery Order',
    description: 'Schema สำหรับเอกสาร Delivery Order — ตรวจสอบเลขที่และผู้รับสินค้า',
    templateType: 'do-schema',
    docTypes: ['DO'],
    workflowIds: [],
    assignedTeams: ['ALL'],
    updatedAt: '2026-06-06T09:00:00Z',
    configs: [
      {
        docTypeId: 'DO',
        labels: [
          { id: 'l-do-1', name: 'DO Number', required: true, compare: true, section: 'Header', type: 'string' },
          { id: 'l-do-2', name: 'Consignee Name', required: true, compare: false, section: 'Header', type: 'string' },
          { id: 'l-do-3', name: 'Release Date', required: false, compare: false, section: 'Footer', type: 'date' }
        ]
      }
    ]
  },
  {
    id: 'ls-popi',
    name: 'PO/PI',
    description: 'Schema สำหรับเอกสาร PO/PI — ตรวจสอบเลขที่ วันที่ และมูลค่ารวมก่อนสร้าง Shipment',
    templateType: 'popi-schema',
    docTypes: ['POPI'],
    workflowIds: ['cwf-po-pi'],
    assignedTeams: ['ALL'],
    updatedAt: '2026-06-07T09:00:00Z',
    configs: [
      {
        docTypeId: 'POPI',
        labels: [
          { id: 'l-popi-1', name: 'PO/PI Number', required: true, compare: true, section: 'Header', type: 'string' },
          { id: 'l-popi-2', name: 'PO/PI Date', required: true, compare: false, section: 'Header', type: 'date' },
          { id: 'l-popi-3', name: 'Total Value', required: false, compare: true, section: 'Footer', type: 'number' }
        ]
      }
    ]
  },
  {
    id: 'ls-frt',
    name: 'FREIGHT INVOICE',
    description: 'Schema สำหรับเอกสาร Freight Invoice — ตรวจสอบค่าขนส่งและผู้ให้บริการ',
    templateType: 'frt-schema',
    docTypes: ['FRT'],
    workflowIds: ['cwf-shipping-doc', 'cwf-import-dec-1'],
    assignedTeams: ['ALL'],
    updatedAt: '2026-06-08T09:00:00Z',
    configs: [
      {
        docTypeId: 'FRT',
        labels: [
          { id: 'l-frt-1', name: 'Freight Invoice No', required: true, compare: true, section: 'Header', type: 'string' },
          { id: 'l-frt-2', name: 'Carrier Name', required: false, compare: false, section: 'Header', type: 'string' },
          { id: 'l-frt-3', name: 'Freight Amount', required: true, compare: true, section: 'Footer', type: 'number' }
        ]
      }
    ]
  },
  {
    id: 'ls-hs',
    name: 'HS Code Master File',
    description: 'Schema สำหรับไฟล์อ้างอิงพิกัดอัตราศุลกากร (HS Code) หลัก',
    templateType: 'hs-schema',
    docTypes: ['HS'],
    workflowIds: ['cwf-shipping-doc', 'cwf-import-dec-1'],
    assignedTeams: ['ALL'],
    updatedAt: '2026-06-09T09:00:00Z',
    configs: [
      {
        docTypeId: 'HS',
        labels: [
          { id: 'l-hs-1', name: 'HS Code', required: true, compare: true, section: 'Header', type: 'string' },
          { id: 'l-hs-2', name: 'Product Description', required: false, compare: false, section: 'Description', type: 'string' }
        ]
      }
    ]
  },
  {
    id: 'ls-ftad',
    name: 'Form FTA (Draft version)',
    description: 'Schema สำหรับแบบฟอร์ม FTA ฉบับร่าง ก่อนออกฉบับจริง',
    templateType: 'ftad-schema',
    docTypes: ['FTAD'],
    workflowIds: ['cwf-shipping-doc'],
    assignedTeams: ['ALL'],
    updatedAt: '2026-06-10T09:00:00Z',
    configs: [
      {
        docTypeId: 'FTAD',
        labels: [
          { id: 'l-ftad-1', name: 'FTA Form No', required: true, compare: true, section: 'Header', type: 'string' },
          { id: 'l-ftad-2', name: 'Origin Country', required: false, compare: true, section: 'Header', type: 'string' }
        ]
      }
    ]
  },
  {
    id: 'ls-ftao',
    name: 'Form FTA (Original version)',
    description: 'Schema สำหรับแบบฟอร์ม FTA ฉบับจริงที่ได้รับการรับรองแล้ว',
    templateType: 'ftao-schema',
    docTypes: ['FTAO'],
    workflowIds: [],
    assignedTeams: ['ALL'],
    updatedAt: '2026-06-11T09:00:00Z',
    configs: [
      {
        docTypeId: 'FTAO',
        labels: [
          { id: 'l-ftao-1', name: 'FTA Form No', required: true, compare: true, section: 'Header', type: 'string' },
          { id: 'l-ftao-2', name: 'Certificate Date', required: false, compare: false, section: 'Header', type: 'date' }
        ]
      }
    ]
  },
  {
    id: 'ls-ins',
    name: 'Insurance Sheet',
    description: 'Schema สำหรับเอกสารกรมธรรม์ประกันภัยสินค้า — ตรวจสอบเลขที่กรมธรรม์และมูลค่าเอาประกัน',
    templateType: 'ins-schema',
    docTypes: ['INS'],
    workflowIds: ['cwf-import-dec-1'],
    assignedTeams: ['ALL'],
    updatedAt: '2026-06-12T09:00:00Z',
    configs: [
      {
        docTypeId: 'INS',
        labels: [
          { id: 'l-ins-1', name: 'Policy No', required: true, compare: true, section: 'Header', type: 'string' },
          { id: 'l-ins-2', name: 'Insured Value', required: false, compare: true, section: 'Footer', type: 'number' }
        ]
      }
    ]
  },
  {
    id: 'ls-lic',
    name: 'License',
    description: 'Schema สำหรับใบอนุญาตนำเข้า/ส่งออก — ตรวจสอบเลขที่และวันหมดอายุ',
    templateType: 'lic-schema',
    docTypes: ['LIC'],
    workflowIds: ['cwf-import-dec-2'],
    assignedTeams: ['ALL'],
    updatedAt: '2026-06-13T09:00:00Z',
    configs: [
      {
        docTypeId: 'LIC',
        labels: [
          { id: 'l-lic-1', name: 'License No', required: true, compare: true, section: 'Header', type: 'string' },
          { id: 'l-lic-2', name: 'Issue Date', required: false, compare: false, section: 'Header', type: 'date' },
          { id: 'l-lic-3', name: 'Expiry Date', required: false, compare: false, section: 'Header', type: 'date' }
        ]
      }
    ]
  },
  {
    id: 'ls-lpi',
    name: 'LPI',
    description: 'Schema สำหรับเอกสารประกอบการนำเข้า (LPI)',
    templateType: 'lpi-schema',
    docTypes: ['LPI'],
    workflowIds: ['cwf-import-dec-2'],
    assignedTeams: ['ALL'],
    updatedAt: '2026-06-14T09:00:00Z',
    configs: [
      {
        docTypeId: 'LPI',
        labels: [
          { id: 'l-lpi-1', name: 'LPI No', required: true, compare: true, section: 'Header', type: 'string' }
        ]
      }
    ]
  },
  {
    id: 'ls-oth',
    name: 'Other',
    description: 'Schema สำหรับเอกสารประกอบอื่นๆ ที่ไม่เข้าพวกกับประเภทเอกสารหลัก',
    templateType: 'oth-schema',
    docTypes: ['OTH'],
    workflowIds: ['cwf-import-dec-2'],
    assignedTeams: ['ALL'],
    updatedAt: '2026-06-15T09:00:00Z',
    configs: [
      {
        docTypeId: 'OTH',
        labels: [
          { id: 'l-oth-1', name: 'Document Title', required: false, compare: false, section: 'Header', type: 'string' }
        ]
      }
    ]
  }
];

const FIELD_TYPE_INFO: { type: string; nameTh: string; nameEn: string; descTh: string; descEn: string }[] = [
  {
    type: 'string',
    nameTh: 'ข้อความ (Text)',
    nameEn: 'Text',
    descTh: 'เก็บตัวอักษรหรือข้อความทั่วไป เช่น ชื่อบริษัท, เลขที่เอกสาร',
    descEn: 'Stores plain text, e.g. a company name or a document number.',
  },
  {
    type: 'number',
    nameTh: 'ตัวเลข (Number)',
    nameEn: 'Number',
    descTh: 'เก็บค่าที่เป็นตัวเลขล้วนๆ เช่น จำนวนเงิน, น้ำหนัก ใช้เปรียบเทียบหรือคำนวณตัวเลขได้',
    descEn: 'Stores numeric values only, e.g. an amount or a weight — lets the system compare or calculate with it.',
  },
  {
    type: 'boolean',
    nameTh: 'ใช่/ไม่ใช่ (Yes/No)',
    nameEn: 'Yes/No',
    descTh: 'เก็บค่าจริงหรือเท็จอย่างใดอย่างหนึ่ง เช่น มีการชำระเงินแล้วหรือยัง',
    descEn: 'Stores a true/false answer, e.g. whether payment has been made.',
  },
  {
    type: 'date',
    nameTh: 'วันที่ (Date)',
    nameEn: 'Date',
    descTh: 'เก็บวันที่โดยเฉพาะ ระบบจะช่วยตรวจและแปลงรูปแบบวันที่ให้ถูกต้องอัตโนมัติ',
    descEn: 'Stores a date specifically — the system checks and normalizes the date format automatically.',
  },
  {
    type: 'array',
    nameTh: 'ชุดข้อมูล (Array)',
    nameEn: 'Array',
    descTh: 'ใช้เมื่อฟิลด์นี้มีข้อมูลซ้ำเป็นหลายรายการในเอกสารเดียว เช่น รายการสินค้าในใบสั่งของที่มีหลายบรรทัด (จะมีฟิลด์ย่อยให้ตั้งค่าเพิ่มด้านใน)',
    descEn: 'Use when this field repeats as multiple rows within one document, e.g. line items on a purchase order (lets you define sub-fields inside it).',
  },
];

const FieldTypeInfoButton: React.FC<{ isTh: boolean }> = ({ isTh }) => (
  <Popover
    trigger="click"
    placement="bottomLeft"
    title={isTh ? 'ประเภทฟิลด์แต่ละแบบคืออะไร' : 'What each field type means'}
    content={
      <div className="max-w-[280px] text-xs text-slate-600 leading-relaxed space-y-3 py-0.5">
        {FIELD_TYPE_INFO.map((info) => (
          <div key={info.type}>
            <span className="font-black text-slate-800">{isTh ? info.nameTh : info.nameEn}</span>
            <p className="mt-0.5">{isTh ? info.descTh : info.descEn}</p>
          </div>
        ))}
      </div>
    }
  >
    <button
      type="button"
      className="shrink-0 w-[40px] h-[40px] flex items-center justify-center text-slate-400 hover:text-[#1f5df9] hover:bg-blue-50 border border-transparent hover:border-blue-100 rounded-[4px] transition-all cursor-pointer"
      title={isTh ? 'ดูคำอธิบายประเภทฟิลด์' : 'View field type descriptions'}
    >
      <Info size={16} />
    </button>
  </Popover>
);

export const LabelSchemaSettings: React.FC<LabelSchemaSettingsProps> = ({
  language,
  docTypes,
  workflows = [],
  comparisonWorkflows = [],
  onBack,
  setComparisonWorkflows,
  hideHeader = false
}) => {
  const [schemas, setSchemas] = useState<LabelSchema[]>(() => {
    const saved = typeof window !== 'undefined' ? localStorage.getItem('bizx_label_schemas_v7') : null;
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error('Failed to parse saved schemas', e);
      }
    }
    return DEFAULT_SCHEMAS;
  });

  React.useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('bizx_label_schemas_v7', JSON.stringify(schemas));
    }
  }, [schemas]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingSchema, setEditingSchema] = useState<LabelSchema | null>(null);
  const [viewMode, setViewMode] = useState<'GRID' | 'LIST'>('GRID');

  // Form states
  const [formName, setFormName] = useState('');
  const [formDesc, setFormDesc] = useState('');
  const [formTemplateType, setFormTemplateType] = useState('');
  const [formAiPrompt, setFormAiPrompt] = useState('');
  const [formDocTypes, setFormDocTypes] = useState<string[]>([]);
  const [formWorkflows, setFormWorkflows] = useState<string[]>([]);
  const [formTeams, setFormTeams] = useState<string[]>(['ALL']);
  const [formConfigs, setFormConfigs] = useState<DocTypeSchemaConfig[]>([]);
  const [errorMsg, setErrorMsg] = useState('');

  // Warning state for docType without labels
  const [showWarningModal, setShowWarningModal] = useState(false);
  const [pendingSavePayload, setPendingSavePayload] = useState<LabelSchema | null>(null);

  // Delete schema state
  const [schemaToDelete, setSchemaToDelete] = useState<LabelSchema | null>(null);

  // Selector state for adding docTypes one by one
  const [selectedDocTypeToAdd, setSelectedDocTypeToAdd] = useState<string | undefined>(undefined);

  // Collapsible accordion state for DocTypes
  const [expandedDocTypes, setExpandedDocTypes] = useState<Record<string, boolean>>({});

  const isTh = language === 'TH';

  // Get active workflows count and names
  const getAllWorkflows = () => {
    return [
      ...workflows.map(w => ({ id: w.id, name: w.name, type: 'Standard' })),
      ...comparisonWorkflows.map(cw => ({ id: cw.id, name: cw.name, type: 'Comparison' }))
    ];
  };

  const getWorkflowNames = (ids: string[]) => {
    const allWfs = getAllWorkflows();
    return ids
      .map(id => allWfs.find(w => w.id === id)?.name)
      .filter((name): name is string => !!name);
  };

  const getDocTypeNames = (ids: string[]) => {
    return ids
      .map(id => docTypes.find(d => d.id === id)?.name)
      .filter((name): name is string => !!name);
  };

  const handleOpenCreate = () => {
    setEditingSchema(null);
    setFormName('');
    setFormDesc('');
    setFormTemplateType('');
    setFormAiPrompt('');
    setFormDocTypes([]);
    setFormWorkflows([]);
    setFormTeams(['ALL']);
    setFormConfigs([]);
    setSelectedDocTypeToAdd(undefined);
    setExpandedDocTypes({});
    setErrorMsg('');
    setShowModal(true);
  };

  const handleOpenEdit = (schema: LabelSchema) => {
    setEditingSchema(schema);
    setFormName(schema.name);
    setFormDesc(schema.description);
    setFormTemplateType(schema.templateType || '');
    setFormAiPrompt(schema.aiPrompt || '');
    setFormDocTypes(schema.docTypes);
    setFormWorkflows(schema.workflowIds);
    setFormTeams(schema.assignedTeams && schema.assignedTeams.length > 0 ? schema.assignedTeams : ['ALL']);
    setFormConfigs(schema.configs ? JSON.parse(JSON.stringify(schema.configs)) : schema.docTypes.map(id => ({ docTypeId: id, labels: [], extractionMethod: 'ai' as const })));
    setSelectedDocTypeToAdd(undefined);
    setExpandedDocTypes({});
    setErrorMsg('');
    setShowModal(true);
  };

  const handleDuplicateSchema = (schema: LabelSchema) => {
    const cloned: LabelSchema = {
      ...JSON.parse(JSON.stringify(schema)),
      id: `ls-${Date.now()}`,
      name: isTh ? `สำเนาของ ${schema.name}` : `Copy of ${schema.name}`,
      workflowIds: [],
      updatedAt: new Date().toISOString()
    };
    setSchemas(prev => [cloned, ...prev]);
  };

  const handleDeleteSchema = (id: string) => {
    const schemaToDelete = schemas.find(s => s.id === id);
    if (schemaToDelete && schemaToDelete.workflowIds.length > 0 && setComparisonWorkflows) {
      setComparisonWorkflows(prevWorkflows => 
        prevWorkflows.map(wf => {
          if (schemaToDelete.workflowIds.includes(wf.id)) {
            return {
              ...wf,
              nodes: wf.nodes.map(node => {
                if (node.type === 'extract') {
                  return {
                    ...node,
                    data: {
                      ...node.data,
                      isConfigured: false
                    }
                  };
                }
                return node;
              })
            };
          }
          return wf;
        })
      );
    }
    
    setSchemas(prev => prev.filter(s => s.id !== id));
  };

  // Add a docType configuration block
  const handleAddDocTypeConfig = (docTypeId: string) => {
    if (!docTypeId) return;
    if (!formDocTypes.includes(docTypeId)) {
      setFormDocTypes([...formDocTypes, docTypeId]);
      setFormConfigs([...formConfigs, { docTypeId, labels: [], extractionMethod: 'ai' }]);
      setExpandedDocTypes(prev => ({ ...prev, [docTypeId]: true }));
    }
  };

  const handleAddNewDocTypeClick = () => {
    if (selectedDocTypeToAdd) {
      handleAddDocTypeConfig(selectedDocTypeToAdd);
      setSelectedDocTypeToAdd(undefined);
    }
  };

  // Remove a docType configuration block
  const handleRemoveDocTypeConfig = (docTypeId: string) => {
    setFormDocTypes(formDocTypes.filter(id => id !== docTypeId));
    setFormConfigs(formConfigs.filter(cfg => cfg.docTypeId !== docTypeId));
  };

  // Update doc-type-level config (extraction method, AI prompt, sample file name)
  const handleUpdateDocTypeConfig = (docTypeId: string, updates: Partial<DocTypeSchemaConfig>) => {
    setFormConfigs(prevConfigs =>
      prevConfigs.map(cfg => (cfg.docTypeId === docTypeId ? { ...cfg, ...updates } : cfg))
    );
  };

  // Open a native file picker and store the chosen file's name as the sample file for
  // XML/Excel field-position mapping. Prototype-only — no real parsing, just remembers the name.
  const handlePickSampleFile = (docTypeId: string, accept: string) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = accept;
    input.onchange = (e: any) => {
      const file = e.target.files?.[0];
      if (file) handleUpdateDocTypeConfig(docTypeId, { sampleFileName: file.name });
    };
    input.click();
  };

  // Add Label to a specific docType configuration table
  const handleAddLabelRow = (docTypeId: string, section?: 'Header' | 'Description' | 'Footer') => {
    setFormConfigs(prevConfigs => 
      prevConfigs.map(cfg => {
        if (cfg.docTypeId === docTypeId) {
          return {
            ...cfg,
            labels: [
              ...cfg.labels,
              {
                id: `l-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
                name: '',
                required: true,
                type: 'string',
                section: section || 'Header',
                compare: false
              }
            ]
          };
        }
        return cfg;
      })
    );
  };

  // Update specific field inside a label row
  const handleUpdateLabelRow = (docTypeId: string, labelId: string, updates: Partial<SchemaLabel>) => {
    setFormConfigs(prevConfigs => 
      prevConfigs.map(cfg => {
        if (cfg.docTypeId === docTypeId) {
          return {
            ...cfg,
            labels: cfg.labels.map(lbl => {
              if (lbl.id === labelId) {
                return { ...lbl, ...updates };
              }
              return lbl;
            })
          };
        }
        return cfg;
      })
    );
  };

  // Remove a label row
  const handleRemoveLabelRow = (docTypeId: string, labelId: string) => {
    setFormConfigs(prevConfigs => 
      prevConfigs.map(cfg => {
        if (cfg.docTypeId === docTypeId) {
          return {
            ...cfg,
            labels: cfg.labels.filter(lbl => lbl.id !== labelId)
          };
        }
        return cfg;
      })
    );
  };

  // Add sub-label to an array field row in a specific docType configuration table
  const handleAddSubLabelRow = (docTypeId: string, parentLabelId: string) => {
    setFormConfigs(prevConfigs => 
      prevConfigs.map(cfg => {
        if (cfg.docTypeId === docTypeId) {
          return {
            ...cfg,
            labels: cfg.labels.map(lbl => {
              if (lbl.id === parentLabelId) {
                const subLabels = lbl.subLabels || [];
                return {
                  ...lbl,
                  subLabels: [
                    ...subLabels,
                    {
                      id: `l-sub-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
                      name: '',
                      required: true,
                      type: 'string',
                      compare: false
                    }
                  ]
                };
              }
              return lbl;
            })
          };
        }
        return cfg;
      })
    );
  };

  // Update specific sub-field inside a parent's label row
  const handleUpdateSubLabelRow = (docTypeId: string, parentLabelId: string, subLabelId: string, updates: Partial<SchemaLabel>) => {
    setFormConfigs(prevConfigs => 
      prevConfigs.map(cfg => {
        if (cfg.docTypeId === docTypeId) {
          return {
            ...cfg,
            labels: cfg.labels.map(lbl => {
              if (lbl.id === parentLabelId) {
                const subLabels = lbl.subLabels || [];
                return {
                  ...lbl,
                  subLabels: subLabels.map(subLbl => {
                    if (subLbl.id === subLabelId) {
                      return { ...subLbl, ...updates };
                    }
                    return subLbl;
                  })
                };
              }
              return lbl;
            })
          };
        }
        return cfg;
      })
    );
  };

  // Remove a sub-field row inside a parent label row
  const handleRemoveSubLabelRow = (docTypeId: string, parentLabelId: string, subLabelId: string) => {
    setFormConfigs(prevConfigs => 
      prevConfigs.map(cfg => {
        if (cfg.docTypeId === docTypeId) {
          return {
            ...cfg,
            labels: cfg.labels.map(lbl => {
              if (lbl.id === parentLabelId) {
                const subLabels = lbl.subLabels || [];
                return {
                  ...lbl,
                  subLabels: subLabels.filter(subLbl => subLbl.id !== subLabelId)
                };
              }
              return lbl;
            })
          };
        }
        return cfg;
      })
    );
  };

  const handleSave = () => {
    // 1. Schema name validation
    if (!formName.trim()) {
      setErrorMsg(isTh ? 'กรุณากรอกชื่อ Schema' : 'Please fill in Schema Name');
      return;
    }

    // Duplicate name validation
    const nameExists = schemas.some(s => 
      s.name.trim().toLowerCase() === formName.trim().toLowerCase() && 
      (!editingSchema || s.id !== editingSchema.id)
    );
    if (nameExists) {
      setErrorMsg(isTh ? 'ชื่อ Schema นี้มีอยู่แล้วในระบบ กรุณาใช้ชื่ออื่น' : 'Schema name already exists. Please choose another name.');
      return;
    }

    // 2. Doc Type validation (Required at least 1)
    if (formDocTypes.length === 0) {
      setErrorMsg(isTh ? 'กรุณาเลือกประเภทเอกสารอย่างน้อย 1 ประเภท' : 'Please select at least 1 document type');
      return;
    }

    // Assigned teams validation (Required at least 1)
    if (formTeams.length === 0) {
      setErrorMsg(isTh ? 'กรุณาเลือกทีมที่จะใช้ Schema นี้อย่างน้อย 1 ทีม' : 'Please select at least 1 team');
      return;
    }

    // 3. Labels validation inside active doc types (Label name is required if rows exist)
    let hasEmptyLabelName = false;
    formConfigs.forEach(cfg => {
      cfg.labels.forEach(lbl => {
        if (!lbl.name.trim()) {
          hasEmptyLabelName = true;
        }
      });
    });

    if (hasEmptyLabelName) {
      setErrorMsg(isTh ? 'กรุณากรอกชื่อ Label ในทุกแถวที่ระบุ' : 'Please fill in the Label name for all entries.');
      return;
    }

    const timestamp = new Date().toISOString();
    const payload: LabelSchema = {
      id: editingSchema ? editingSchema.id : `ls-${Date.now()}`,
      name: formName.trim(),
      description: formDesc.trim(),
      templateType: formTemplateType.trim(),
      aiPrompt: formAiPrompt.trim(),
      docTypes: formDocTypes,
      workflowIds: formWorkflows,
      assignedTeams: formTeams,
      updatedAt: timestamp,
      configs: formConfigs
    };

    // 4. Warning validation: Doc type with zero labels
    const emptyDocTypesList = formConfigs
      .filter(cfg => cfg.labels.length === 0)
      .map(cfg => cfg.docTypeId);

    if (emptyDocTypesList.length > 0) {
      // Show warning modal and store payload
      setPendingSavePayload(payload);
      setShowWarningModal(true);
      return;
    }

    // Save normally if no warning triggered
    submitSave(payload);
  };

  const submitSave = (payload: LabelSchema) => {
    const updatedSchemas = [...schemas];
    if (editingSchema) {
      const index = updatedSchemas.findIndex(s => s.id === editingSchema.id);
      if (index !== -1) {
        updatedSchemas[index] = payload;
      }
    } else {
      updatedSchemas.unshift(payload);
    }
    setSchemas(updatedSchemas);
    message.success(isTh ? 'บันทึกข้อมูลเรียบร้อยแล้ว' : 'Saved successfully');
    setShowModal(false);
    setShowWarningModal(false);
    setPendingSavePayload(null);
  };

  const filteredSchemas = schemas.filter(s => 
    s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    const hours = String(d.getHours()).padStart(2, '0');
    const mins = String(d.getMinutes()).padStart(2, '0');
    return `${day}/${month}/${year} ${hours}:${mins}`;
  };

  return (
    <div className={hideHeader ? "space-y-6" : "bg-white border border-slate-200/80 rounded-[16px] p-6 shadow-sm space-y-6"} id="label-schema-settings-wrapper">
      {/* Header breadcrumb */}
      {!hideHeader && (
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <button 
              onClick={onBack}
              className="p-2 hover:bg-slate-100 rounded-[4px] text-slate-600 transition-colors"
            >
              <ArrowLeft size={18} />
            </button>
            <div>
              <div className="text-xs text-slate-500 font-bold uppercase tracking-wider flex items-center gap-1.5 mb-1">
                <span>{isTh ? 'การตั้งค่าระบบ' : 'SYSTEM SETTINGS'}</span>
                <ChevronRight size={12} className="text-slate-300" />
                <span className="text-[#1f5df9]">{isTh ? 'สคีมาป้ายระบุ' : 'LABEL SCHEMA'}</span>
              </div>
              <h1 className="text-2xl font-black text-[#010136] tracking-tight">
                {isTh ? 'ตั้งค่า Label schema' : 'Label Schema Settings'}
              </h1>
            </div>
          </div>

          {schemas.length > 0 && (
            <button
              onClick={handleOpenCreate}
              className="px-5 py-2.5 bg-[#1f5df9] hover:bg-[#104BE3] text-white font-black text-sm uppercase tracking-wider rounded-[4px] shadow-md shadow-blue-500/15 flex items-center gap-2 transition-all active:scale-95 cursor-pointer"
            >
              <Plus size={16} />
              <span>{isTh ? 'สร้างสคีมาใหม่' : 'Create Schema'}</span>
            </button>
          )}
        </div>
      )}

      {/* Main Box */}
      {schemas.length === 0 ? (
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className={hideHeader ? "p-12 text-center flex flex-col items-center justify-center min-h-[400px]" : "bg-white border border-slate-200/80 rounded-[16px] p-12 text-center shadow-sm flex flex-col items-center justify-center min-h-[400px]"}
        >
          <div className="w-20 h-20 bg-slate-50 text-slate-300 rounded-full flex items-center justify-center mb-6 border border-slate-100">
            <Layers size={36} />
          </div>
          <h3 className="text-xl font-black text-slate-800 tracking-tight mb-2">
            {isTh ? 'ยังไม่มี Label schema ในระบบ' : 'No Label Schemas Found'}
          </h3>
          <p className="text-slate-500 text-sm max-w-md mx-auto mb-8 leading-relaxed">
            {isTh 
              ? 'ระบบยังไม่มีการตั้งค่า Schema ข้อมูลป้ายระบุ (Label) สำหรับการประมวลผลและการจับคู่เอกสาร เริ่มสร้าง Schema แรกของคุณเพื่อใช้งานร่วมกับเวิร์กโฟลว์'
              : 'There are currently no Label Schemas. Create your first schema to map fields across different document types in your workflows.'}
          </p>
          <button
            onClick={handleOpenCreate}
            className="px-6 py-3 bg-[#1f5df9] hover:bg-[#104BE3] text-white font-black text-sm uppercase tracking-wider rounded-[4px] shadow-md flex items-center gap-2 transition-all active:scale-95 cursor-pointer"
          >
            <Plus size={16} />
            <span>{isTh ? 'สร้าง Label schema' : 'Create Label Schema'}</span>
          </button>
        </motion.div>
      ) : (
        <div className="space-y-4 animate-in fade-in duration-300">
          {/* Search / Filter Utility Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <Input
                type="text"
                className="w-full text-xs font-semibold px-10 border border-slate-200/80 shadow-xs focus:ring-1 focus:ring-blue-500/25 transition-all font-sans"
                style={{ height: '38px', borderRadius: '4px' }}
                placeholder={isTh ? 'ค้นหาสคีมาด้วยชื่อ หรือคำอธิบาย...' : 'Search schema by name, description...'}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              {searchQuery && (
                <button 
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 p-0.5 hover:bg-slate-100 rounded-[4px] text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  <X size={12} />
                </button>
              )}
            </div>
            
            <div className="flex items-center gap-3">
              {/* View Mode Toggle */}
              <div className="flex bg-slate-200/60 p-1 border border-slate-200/40 h-[38px] items-center" style={{ borderRadius: '4px' }}>
                <Tooltip title={isTh ? 'แบบกริด' : 'Grid view'}>
                  <button
                    type="button"
                    onClick={() => setViewMode('GRID')}
                    className={`h-full px-2.5 rounded-[4px]-sm transition-all duration-200 flex items-center justify-center cursor-pointer ${
                      viewMode === 'GRID'
                        ? 'bg-white text-blue-600 shadow-sm'
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                    style={{ borderRadius: '2px' }}
                  >
                    <LayoutGrid size={14} />
                  </button>
                </Tooltip>
                <Tooltip title={isTh ? 'แบบรายการ' : 'List view'}>
                  <button
                    type="button"
                    onClick={() => setViewMode('LIST')}
                    className={`h-full px-2.5 rounded-[4px]-sm transition-all duration-200 flex items-center justify-center cursor-pointer ${
                      viewMode === 'LIST'
                        ? 'bg-white text-blue-600 shadow-sm'
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                    style={{ borderRadius: '2px' }}
                  >
                    <List size={14} />
                  </button>
                </Tooltip>
              </div>

              {hideHeader && (
                <button
                  type="button"
                  onClick={handleOpenCreate}
                  className="h-[38px] px-4 bg-[#1f5df9] hover:bg-[#104BE3] active:scale-95 text-white font-bold text-xs uppercase tracking-wider shadow-md shadow-blue-500/10 flex items-center gap-2 transition cursor-pointer"
                  style={{ borderRadius: '4px' }}
                >
                  <Plus size={15} strokeWidth={2.5} />
                  <span>{isTh ? 'สร้างสคีมาใหม่' : 'CREATE SCHEMA'}</span>
                </button>
              )}
            </div>
          </div>

          {/* Schemas display */}
          {viewMode === 'LIST' ? (
            <div className="overflow-x-auto border border-slate-150/50 rounded-[16px] bg-white shadow-xs">
              <table className="min-w-full divide-y divide-slate-100">
                <thead className="bg-slate-50/75">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-black text-slate-400 uppercase tracking-wider">
                      {isTh ? 'ชื่อสคีมา / รายละเอียด' : 'Schema Name / Description'}
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-black text-slate-400 uppercase tracking-wider">
                      {isTh ? 'ประเภทเอกสารเเละจำนวน Label' : 'Document Types & Labels'}
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-black text-slate-400 uppercase tracking-wider">
                      {isTh ? 'จำนวนเวิร์กโฟลว์' : 'Workflows'}
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-black text-slate-400 uppercase tracking-wider">
                      {isTh ? 'เวลาแก้ไขล่าสุด' : 'Updated At'}
                    </th>
                    <th className="px-6 py-4 text-right text-xs font-black text-slate-400 uppercase tracking-wider pr-8">
                      {isTh ? 'จัดการ' : 'Actions'}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  <AnimatePresence mode="popLayout">
                    {filteredSchemas.map((schema, idx) => {
                      const schemaDocTypes = getDocTypeNames(schema.docTypes);
                      const schemaWorkflows = getWorkflowNames(schema.workflowIds);

                      return (
                        <motion.tr
                          key={schema.id}
                          layout
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, scale: 0.98 }}
                          transition={{ duration: 0.15, delay: idx * 0.02 }}
                          className="hover:bg-slate-50/50 transition-colors group"
                        >
                          {/* Name & Desc */}
                          <td className="px-6 py-4 max-w-sm">
                            <div className="flex items-start gap-3">
                              <div className="p-2.5 bg-blue-50/70 text-[#1f5df9] rounded-[4px] shrink-0 mt-0.5">
                                <Layers size={15} />
                              </div>
                              <div className="space-y-0.5">
                                <h4 className="text-sm font-black text-[#010136]">
                                  {schema.name}
                                </h4>
                                <p className="text-xs text-slate-500 font-medium line-clamp-2 leading-relaxed">
                                  {schema.description || (isTh ? '(ไม่มีคำอธิบาย)' : '(No description)')}
                                </p>
                              </div>
                            </div>
                          </td>

                          {/* Doc types with detailed labels */}
                          <td className="px-6 py-4">
                            <div className="space-y-2">
                              <span className="font-bold text-xs text-[#010136] block">
                                {isTh ? `${schema.docTypes.length} ประเภทเอกสาร` : `${schema.docTypes.length} Doc Types`}
                              </span>
                              {schema.docTypes.length > 0 ? (
                                <div className="flex flex-col gap-1.5 max-w-md">
                                  {schema.docTypes.map((dtId, dtIdx) => {
                                    const dtName = docTypes.find(d => d.id === dtId)?.name || dtId;
                                    const configForDt = schema.configs?.find(c => c.docTypeId === dtId);
                                    const labelNames = configForDt?.labels.map(l => l.name) || [];

                                    return (
                                      <div key={dtIdx} className="bg-slate-50/80 p-1.5 rounded-lg border border-slate-150/45 flex flex-col gap-1">
                                        <div className="flex items-center justify-between">
                                          <span className="text-[11px] font-black text-[#010136]">{dtName}</span>
                                          <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">
                                            {isTh ? `${labelNames.length} คีย์` : `${labelNames.length} Keys`}
                                          </span>
                                        </div>
                                        {labelNames.length > 0 ? (
                                          <div className="flex flex-wrap gap-1">
                                            {labelNames.map((name, nIdx) => (
                                              <span 
                                                key={nIdx} 
                                                className="px-1.5 py-0.5 text-[9px] font-medium bg-white text-slate-600 border border-slate-205 rounded-sm shadow-3xs"
                                              >
                                                {name}
                                              </span>
                                            ))}
                                          </div>
                                        ) : (
                                          <span className="text-[10px] text-slate-400 italic font-medium">No labels custom configured</span>
                                        )}
                                      </div>
                                    );
                                  })}
                                </div>
                              ) : (
                                <span className="text-xs text-slate-400 italic">-</span>
                              )}
                            </div>
                          </td>

                          {/* Connected Workflows */}
                          <td className="px-6 py-4">
                            <div className="space-y-1">
                              <span className="font-bold text-xs text-[#010136] block">
                                {isTh ? `${schema.workflowIds.length} เวิร์กโฟลว์` : `${schema.workflowIds.length} Workflows`}
                              </span>
                              {schemaWorkflows.length > 0 ? (
                                Math.min(schemaWorkflows.length, 1) > 0 && (
                                  <div className="flex flex-col gap-0.5 max-w-xs">
                                    {schemaWorkflows.map((wfName, idx) => (
                                      <div key={idx} className="flex items-center gap-1 text-[11px] font-medium text-slate-500">
                                        <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full shrink-0"></span>
                                        <span className="truncate text-slate-600" title={wfName}>{wfName}</span>
                                      </div>
                                    ))}
                                  </div>
                                )
                              ) : (
                                <div className="text-[11px] text-slate-400 italic flex items-center gap-1 bg-amber-50/50 p-1.5 border border-amber-100/50 rounded-[4px] max-w-[125px]">
                                  <AlertCircle size={10} className="text-amber-500" />
                                  <span>{isTh ? 'ไม่ได้ใช้ฟลว์ใด' : 'Not used'}</span>
                                </div>
                              )}
                            </div>
                          </td>

                          {/* Updated At */}
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-500">
                              <Clock size={12} className="text-slate-400" />
                              <span>{formatDate(schema.updatedAt)}</span>
                            </div>
                          </td>

                          {/* Action Buttons */}
                          <td className="px-6 py-4 whitespace-nowrap text-right pr-8">
                            <div className="flex items-center justify-end gap-1.5">
                              <Tooltip title={isTh ? 'แก้ไขสคีมา' : 'Edit Schema'}>
                                <button
                                  onClick={() => handleOpenEdit(schema)}
                                  className="p-2 hover:bg-slate-50 text-slate-400 hover:text-[#1f5df9] bg-white border border-slate-150 rounded-[4px] transition-all cursor-pointer"
                                >
                                  <Pencil size={14} />
                                </button>
                              </Tooltip>

                              <Tooltip title={isTh ? 'ทำสำเนา' : 'Duplicate'}>
                                <button
                                  onClick={() => handleDuplicateSchema(schema)}
                                  className="p-2 hover:bg-slate-50 text-slate-400 hover:text-[#1f5df9] bg-white border border-slate-150 rounded-[4px] transition-all cursor-pointer"
                                >
                                  <Copy size={14} />
                                </button>
                              </Tooltip>

                              <Tooltip title={isTh ? 'ลบ' : 'Delete'}>
                                <button
                                  onClick={() => setSchemaToDelete(schema)}
                                  className="p-2 hover:bg-rose-50 text-slate-400 hover:text-rose-600 bg-white border border-slate-150 rounded-[4px] transition-all cursor-pointer"
                                >
                                  <Trash2 size={14} />
                                </button>
                              </Tooltip>
                            </div>
                          </td>
                        </motion.tr>
                      );
                    })}
                  </AnimatePresence>
                </tbody>
              </table>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <AnimatePresence mode="popLayout">
                {filteredSchemas.map((schema, idx) => {
                  const schemaDocTypes = getDocTypeNames(schema.docTypes);
                  const schemaWorkflows = getWorkflowNames(schema.workflowIds);

                  return (
                    <motion.div
                      key={schema.id}
                      layout
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      transition={{ duration: 0.2, delay: idx * 0.04 }}
                      className="bg-white border border-slate-200/70 rounded-[8px] p-5 shadow-sm hover:shadow-md transition-all duration-300 group flex flex-col justify-between gap-4 relative overflow-hidden h-full"
                    >
                      <div className="space-y-4 flex-1 flex flex-col justify-between">
                        <div className="space-y-3">
                          {/* ID Badge & Header */}
                          <div className="flex items-start justify-between">
                            <div className="flex items-center gap-2.5">
                              <h3 className="text-sm font-black text-slate-800 tracking-tight group-hover:text-blue-700 transition-colors uppercase">
                                {schema.name}
                              </h3>
                            </div>
                            
                            {/* Action Buttons */}
                            <div className="flex items-center gap-1 opacity-60 group-hover:opacity-100 transition-opacity">
                              <Tooltip title={isTh ? 'แก้ไขสคีมา' : 'Edit Schema'}>
                                <button
                                  type="button"
                                  onClick={() => handleOpenEdit(schema)}
                                  className="p-1.5 hover:bg-slate-100 text-slate-500 hover:text-blue-600 rounded-[4px] transition-colors cursor-pointer"
                                >
                                  <Pencil size={13} />
                                </button>
                              </Tooltip>
                              <Tooltip title={isTh ? 'ทำสำเนา' : 'Duplicate'}>
                                <button
                                  type="button"
                                  onClick={() => handleDuplicateSchema(schema)}
                                  className="p-1.5 hover:bg-slate-100 text-slate-500 hover:text-blue-600 rounded-[4px] transition-colors cursor-pointer"
                                >
                                  <Copy size={13} />
                                </button>
                              </Tooltip>
                              <Tooltip title={isTh ? 'ลบ' : 'Delete'}>
                                <button
                                  type="button"
                                  onClick={() => setSchemaToDelete(schema)}
                                  className="p-1.5 hover:bg-rose-50 text-slate-500 hover:text-destructive rounded-[4px] transition-colors cursor-pointer"
                                >
                                  <Trash2 size={13} />
                                </button>
                              </Tooltip>
                            </div>
                          </div>

                          {/* Description box */}
                          <p className="text-xs text-slate-500 font-medium leading-relaxed font-sans mt-1 line-clamp-2 px-1">
                            {schema.description || (isTh ? '(ไม่มีคำอธิบายคีย์เพิ่มเติม)' : '(No description provided)')}
                          </p>
                        </div>

                        <hr className="border-slate-100/80" />

                        {/* Doc types section with counts */}
                        <div className="space-y-2">
                          <div className="flex items-center gap-1 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                            <FileText size={12} className="text-slate-400" />
                            <span>{isTh ? `ประเภทเอกสาร (${schema.docTypes.length})` : `Doc Types (${schema.docTypes.length})`}</span>
                          </div>
                          {schema.docTypes.length > 0 ? (
                            <div className="flex flex-col gap-1.5">
                              {schema.docTypes.map((dtId, dtIdx) => {
                                const dtName = docTypes.find(d => d.id === dtId)?.name || dtId;
                                const configForDt = schema.configs?.find(c => c.docTypeId === dtId);
                                const labelCount = configForDt?.labels.length || 0;

                                return (
                                  <div key={dtIdx} className="flex items-center justify-between text-xs bg-slate-50 px-2.5 py-1.5 rounded-lg border border-slate-150/45">
                                    <span className="font-bold text-[#010136] truncate max-w-[140px]">{dtName}</span>
                                    <span className="text-[10px] font-black text-[#1f5df9] bg-indigo-50 px-1.5 py-0.5 rounded">
                                      {labelCount} {isTh ? 'Labels' : 'Labels'}
                                    </span>
                                  </div>
                                );
                              })}
                            </div>
                          ) : (
                            <span className="text-xs text-slate-400 italic">None</span>
                          )}
                        </div>

                        {/* Workflows mapping */}
                        <div className="space-y-1.5">
                          <div className="flex items-center gap-1 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                            <WorkflowIcon size={12} className="text-slate-400" />
                            <span>{isTh ? `ผูกเวิร์กโฟลว์ (${schema.workflowIds.length})` : `Connected Workflows (${schema.workflowIds.length})`}</span>
                          </div>
                          {schemaWorkflows.length > 0 ? (
                            <div className="flex flex-col gap-1">
                              {schemaWorkflows.map((wfName, idx) => (
                                <div key={idx} className="flex items-center gap-1 text-xs font-semibold text-slate-600">
                                  <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full shrink-0"></span>
                                  <span className="truncate" title={wfName}>{wfName}</span>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="text-xs text-slate-400 italic flex items-center gap-1 bg-amber-50/50 p-2 border border-amber-100/50 rounded-xl">
                              <AlertCircle size={12} className="text-amber-500" />
                              <span>{isTh ? 'ยังไม่ได้เชื่อมต่อกับ Flow ใดๆ' : 'Not used in any workflows'}</span>
                            </div>
                          )}
                        </div>


                      </div>

                      {/* Footer card metrics */}
                      <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                        <div className="flex items-center gap-1">
                          <Clock size={12} />
                          <span>{formatDate(schema.updatedAt)}</span>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          )}
        </div>
      )}

      {/* Setup Schema Modal with width=820 for tabular label lists */}
      <Drawer
        title={
          <div className="flex items-center gap-2">
            <div>
              <h2 className="text-base font-black text-[#010136] tracking-tight">
                {editingSchema ? (isTh ? 'ตั้งค่า Label schema ของคุณ' : 'Configure Your Label Schema') : (isTh ? 'สร้างสคีมาใหม่ในระบบ' : 'Create New Label Schema')}
              </h2>
            </div>
          </div>
        }
        closeIcon={false}
        extra={
          <button 
            onClick={() => setShowModal(false)} 
            className="p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 rounded-lg border-none bg-transparent cursor-pointer transition-colors"
          >
            <X size={20} />
          </button>
        }
        open={showModal}
        onClose={() => setShowModal(false)}
        size="large"
        placement="right"
        styles={{ body: { paddingBottom: 80 } }}
        footer={
          <div className="flex justify-end gap-3 px-2 py-1">
            <Button 
              onClick={() => setShowModal(false)} 
              className="text-slate-500 font-bold hover:bg-slate-50 px-6 py-2.5 rounded-[4px] border border-slate-200 cursor-pointer text-xs uppercase tracking-wider h-[40px]"
            >
              {isTh ? 'ยกเลิก' : 'Cancel'}
            </Button>
            <Button 
              onClick={handleSave} 
              type="primary" 
              className="bg-[#1f5df9] hover:!bg-[#104BE3] text-white font-black px-6 py-2.5 rounded-[4px] border-none shadow-md shadow-blue-500/10 cursor-pointer text-xs uppercase tracking-wider h-[40px]"
            >
              {isTh ? 'บันทึกข้อมูล' : 'Save Schema'}
            </Button>
          </div>
        }
      >
        <div className="py-4 space-y-6">
          {errorMsg && (
            <div className="p-3.5 bg-red-50 text-rose-600 rounded-xl text-xs font-bold flex items-center gap-2 border border-red-100 shadow-3xs animate-shake">
              <AlertCircle size={15} />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Form Basic section */}
          <div className="space-y-4">
            {/* Schema Name */}
            <div className="space-y-1.5">
              <label className="text-xs font-black text-[#010136] uppercase tracking-wider flex items-center gap-1">
                <span>{isTh ? 'ชื่อ SCHEMA' : 'SCHEMA NAME'}</span>
                <span className="text-rose-500">*</span>
              </label>
              <Input
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder={isTh ? 'เช่น Import standard v2' : 'e.g. Import standard v2'}
                className="py-2.5 rounded-xl border-slate-200 font-semibold text-slate-800 hover:border-blue-300 focus:border-[#1f5df9] focus:shadow-sm shadow-2xs placeholder-slate-400"
                maxLength={512}
              />
              <div className="flex justify-end">
                <span className="text-[10px] font-bold text-slate-400">{formName.length} / 512</span>
              </div>
            </div>

            {/* Schema Description */}
            <div className="space-y-1.5">
              <label className="text-xs font-black text-[#010136] uppercase tracking-wider">
                {isTh ? 'คำอธิบายสคีมา' : 'DESCRIPTION'}
              </label>
              <Input.TextArea 
                value={formDesc} 
                onChange={(e) => setFormDesc(e.target.value)}
                placeholder={isTh ? 'สรุปรายละเอียดหรือจุดประสงค์ในการใช้สคีมานี้...' : 'Detail the use case or objective of this schema...'}
                rows={2}
                className="rounded-xl border-slate-200 font-semibold text-slate-800 hover:border-blue-300 focus:border-[#1f5df9] focus:shadow-sm shadow-2xs placeholder-slate-400"
              />
            </div>

            {/* Assigned Teams */}
            <div className="space-y-1.5">
              <label className="text-xs font-black text-[#010136] uppercase tracking-wider flex items-center gap-1">
                <span>{isTh ? 'ทีมที่ใช้ Schema นี้' : 'TEAMS USING THIS SCHEMA'}</span>
                <span className="text-rose-500">*</span>
              </label>
              <Select
                mode="multiple"
                allowClear
                className="w-full custom-select"
                popupClassName="!z-[2100]"
                placeholder={isTh ? 'เลือกทีม' : 'Select team'}
                value={formTeams}
                onChange={(vals: string[]) => {
                  // Selecting "All Team" collapses the picker to just that tag;
                  // individual teams stay disabled below until it's removed.
                  if (vals.includes('ALL') && !formTeams.includes('ALL')) {
                    setFormTeams(['ALL']);
                  } else {
                    setFormTeams(vals.filter(v => v !== 'ALL'));
                  }
                }}
                options={[
                  { value: 'ALL', label: isTh ? 'ทุกทีม (All Team)' : 'All Team' },
                  ...MOCK_TEAMS.map(team => ({ ...team, disabled: formTeams.includes('ALL') }))
                ]}
                style={{ width: '100%' }}
              />
            </div>
          </div>

          <hr className="border-slate-100" />

          {/* Connect & Add Doc Types and its Labels */}
          <div className="space-y-4">
            <div className="flex flex-col gap-3 bg-slate-50 p-3 rounded-[8px] border border-slate-200/40">
              <div className="space-y-1">
                <span className="text-xs font-black text-[#010136] uppercase tracking-wider flex items-center gap-1.5">
                  <FileText size={15} className="text-[#1f5df9]" />
                  <span>{isTh ? 'จัดการประเภทเอกสาร' : 'Document Types Management'}</span>
                  <span className="text-rose-500">*</span>
                </span>
                <p className="text-[11px] text-slate-500 font-semibold">
                  {isTh ? 'เลือกประเภทเอกสารเข้ามาเพื่อกำหนดตารางและชื่อป้ายระบุ (Label) ตัวกลั่นกรองฟิลด์' : 'Add document types used in operations to specify metadata labels.'}
                </p>
              </div>

              {/* Selector to custom add docType with button click */}
              <div className="flex items-center gap-2 w-full">
                <Select
                  className="w-full sm:w-64 ant-select-custom font-semibold text-xs h-[32px]"
                  placeholder={isTh ? 'เลือกประเภทเอกสาร' : 'Select Document Type'}
                  value={selectedDocTypeToAdd}
                  onChange={(val) => setSelectedDocTypeToAdd(val)}
                  options={docTypes
                    .filter(d => !formDocTypes.includes(d.id))
                    .map(d => ({ label: `[${d.id}] ${d.name}`, value: d.id }))}
                  styles={{ popup: { root: { zIndex: 9999 } } }}
                />
                <Button
                  type="primary"
                  onClick={handleAddNewDocTypeClick}
                  disabled={!selectedDocTypeToAdd}
                  className="bg-[#1f5df9] hover:!bg-[#104BE3] hover:shadow-xs text-white font-bold h-[32px] rounded-[4px] border-none flex items-center px-3.5 text-xs shadow-3xs transition-all duration-200"
                >
                  <Plus size={13} className="mr-1" />
                  <span>{isTh ? 'เพิ่ม' : 'Add'}</span>
                </Button>
              </div>
            </div>

            {/* Tables for each selected DocType */}
            {formConfigs.length === 0 ? (
              <div className="p-8 text-center rounded-2xl bg-white border border-dashed border-slate-200 flex flex-col items-center justify-center">
                <FileText size={24} className="text-slate-300 mb-2" />
                <span className="text-xs text-slate-400 font-bold">
                  {isTh ? 'ยังไม่มีการเลือกประเภทเอกสารในสคีมานี้' : 'No document types added to this schema yet.'}
                </span>
              </div>
            ) : (
              <div className="space-y-6">
                {formConfigs.map((config) => {
                  const docTypeObj = docTypes.find(d => d.id === config.docTypeId);
                  const docTypeName = docTypeObj ? docTypeObj.name : config.docTypeId;
                  const isExpanded = expandedDocTypes[config.docTypeId] !== false;

                  return (
                    <motion.div 
                      key={config.docTypeId}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="bg-white rounded-[8px] border border-slate-200 overflow-hidden shadow-2xs"
                    >
                      {/* DocType Header - Clickable Accordion Header */}
                      <div 
                        onClick={() => {
                          setExpandedDocTypes(prev => ({
                            ...prev,
                            [config.docTypeId]: isExpanded ? false : true
                          }));
                        }}
                        className="px-5 py-4 bg-slate-50/70 border-b border-slate-100 flex items-center justify-between cursor-pointer hover:bg-slate-100/50 select-none transition-all"
                      >
                        <div className="flex items-center gap-2.5">
                          <ChevronDown 
                            size={16} 
                            className={`text-[#010136]/50 transition-transform duration-250 ease-out-back ${isExpanded ? 'rotate-0' : '-rotate-90'}`} 
                          />
                          <span className="w-2.5 h-2.5 rounded-full bg-[#1f5df9]" />
                          <span className="text-sm font-black text-[#010136] tracking-tight">{docTypeName}</span>
                          <span className="px-2 py-0.5 text-[10px] font-extrabold bg-[#1f5df9]/10 text-[#1f5df9] rounded-md tracking-wider">
                            {config.docTypeId}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation(); // prevent accordion toggle when deleting
                            handleRemoveDocTypeConfig(config.docTypeId);
                          }}
                          className="px-2.5 py-1 text-xs font-bold text-slate-500 hover:text-rose-600 bg-white hover:bg-rose-50 border border-slate-200 hover:border-rose-200 rounded-[4px] transition-all flex items-center gap-1 cursor-pointer"
                        >
                          <X size={12} />
                          <span>{isTh ? 'ลบออก' : 'Remove'}</span>
                        </button>
                      </div>

                      {/* Collapsible Section Area */}
                      <AnimatePresence initial={false}>
                        {isExpanded && (
                          <motion.div
                            initial="collapsed"
                            animate="open"
                            exit="collapsed"
                            variants={{
                              open: { opacity: 1, height: "auto" },
                              collapsed: { opacity: 0, height: 0 }
                            }}
                            transition={{ duration: 0.25, ease: [0.04, 0.62, 0.23, 0.98] }}
                            className="overflow-hidden"
                          >
                            {/* Extraction Method */}
                            <div className="px-4 pt-4">
                              <div className="border border-slate-200 rounded-[8px] p-4 bg-white space-y-3 shadow-3xs">
                                <h5 className="text-xs font-black text-slate-800 tracking-tight uppercase mb-0">
                                  {isTh ? 'วิธีดึงข้อมูล' : 'Extraction Method'}
                                </h5>

                                {/* 3-way segmented toggle */}
                                <div className="inline-flex items-center gap-1 p-1 bg-slate-50 border border-slate-200 rounded-[8px]">
                                  {([
                                    { key: 'ai' as const, labelTh: 'AI อ่านเอกสาร (LLM)', labelEn: 'AI reads document (LLM)' },
                                    { key: 'xml' as const, labelTh: 'อ่านจากไฟล์ XML', labelEn: 'Read from XML file' },
                                    { key: 'excel' as const, labelTh: 'อ่านจากไฟล์ Excel', labelEn: 'Read from Excel file' },
                                  ]).map((opt) => {
                                    const active = (config.extractionMethod || 'ai') === opt.key;
                                    return (
                                      <button
                                        key={opt.key}
                                        type="button"
                                        onClick={() => handleUpdateDocTypeConfig(config.docTypeId, { extractionMethod: opt.key })}
                                        className={`px-3 py-1.5 text-xs font-bold rounded-[4px] transition-all cursor-pointer whitespace-nowrap ${
                                          active
                                            ? 'bg-[#1f5df9] text-white shadow-sm'
                                            : 'text-slate-500 hover:bg-white hover:text-slate-700'
                                        }`}
                                      >
                                        {isTh ? opt.labelTh : opt.labelEn}
                                      </button>
                                    );
                                  })}
                                </div>

                                {/* Method-specific content */}
                                {(config.extractionMethod || 'ai') === 'ai' && (
                                  <Input.TextArea
                                    value={config.aiExtractionPrompt || ''}
                                    onChange={(e) => handleUpdateDocTypeConfig(config.docTypeId, { aiExtractionPrompt: e.target.value })}
                                    placeholder={isTh ? 'เขียนคำอธิบายให้โมเดลอ่าน เช่น "The INVOICE # of the invoice"' : 'Describe what the model should read, e.g. "The INVOICE # of the invoice"'}
                                    rows={2}
                                    style={{ borderRadius: 4 }}
                                    className="w-full text-xs font-semibold px-4 py-2.5 resize-none font-sans border-slate-200 hover:border-blue-300 focus:border-[#1f5df9]"
                                  />
                                )}

                                {(config.extractionMethod === 'xml' || config.extractionMethod === 'excel') && (
                                  <>
                                    <p className="text-[11px] font-semibold text-slate-400">
                                      {config.extractionMethod === 'xml'
                                        ? (isTh ? 'ระบุ path ของแต่ละฟิลด์ในไฟล์ XML — ไม่ใช้คำอธิบาย' : 'Specify each field\'s path in the XML file — no description needed')
                                        : (isTh ? 'คลิกเซลล์ในไฟล์ตัวอย่างเพื่อกำหนดตำแหน่งของแต่ละฟิลด์ — ไม่ใช้คำอธิบาย' : 'Click a cell in the sample file to set each field\'s position — no description needed')}
                                    </p>
                                    <div
                                      onClick={() => handlePickSampleFile(config.docTypeId, config.extractionMethod === 'xml' ? '.xml' : '.xlsx,.xls,.csv')}
                                      className="border-2 border-dashed border-slate-200 rounded-[8px] px-4 py-3 flex items-center justify-between gap-3 hover:border-blue-300 hover:bg-blue-50/20 transition-colors cursor-pointer"
                                    >
                                      <span className="text-xs font-black text-[#1f5df9] shrink-0">
                                        {config.sampleFileName
                                          ? (isTh ? 'เปลี่ยนไฟล์ตัวอย่าง' : 'Change sample file')
                                          : (config.extractionMethod === 'xml'
                                              ? (isTh ? 'เลือกไฟล์ XML ตัวอย่าง' : 'Choose sample XML file')
                                              : (isTh ? 'เลือกไฟล์ Excel ตัวอย่าง' : 'Choose sample Excel file'))}
                                      </span>
                                      {config.sampleFileName ? (
                                        <span className="flex items-center gap-1.5 text-xs font-bold text-emerald-600 min-w-0">
                                          <Check size={14} className="shrink-0" />
                                          <span className="truncate">{config.sampleFileName}</span>
                                        </span>
                                      ) : (
                                        <span className="text-[11px] font-semibold text-slate-400 text-right">
                                          {isTh ? 'โหลดไฟล์ตัวอย่างก่อน จึงจะคลิกเลือกเซลล์ได้' : 'Upload a sample file first to start mapping'}
                                        </span>
                                      )}
                                    </div>
                                  </>
                                )}
                              </div>
                            </div>

                            {/* 3 Sections (Header, Description, Footer) */}
                            <div className="p-4 pt-2 space-y-6">
                              {[
                                {
                                  key: 'Header' as const,
                                  titleTh: 'ส่วนหัว (Header)',
                                  titleEn: 'Header',
                                  color: 'bg-blue-600',
                                  textColor: 'text-blue-700'
                                },
                                {
                                  key: 'Description' as const,
                                  titleTh: 'คำอธิบาย (Description)',
                                  titleEn: 'Description',
                                  color: 'bg-emerald-500',
                                  textColor: 'text-emerald-700'
                                },
                                {
                                  key: 'Footer' as const,
                                  titleTh: 'ส่วนท้าย (Footer)',
                                  titleEn: 'Footer',
                                  color: 'bg-purple-600',
                                  textColor: 'text-purple-700'
                                }
                              ].map((sect) => {
                                const sectionLabels = config.labels.filter(label => (label.section || 'Header') === sect.key);
                                return (
                                  <div key={sect.key} className="border border-slate-200 rounded-[8px] p-4 bg-white space-y-4 shadow-3xs">
                                    {/* Section Sub-Header */}
                                    <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                                      <div className="flex items-center gap-2">
                                        <span className={`w-2.5 h-2.5 rounded-full ${sect.color}`} />
                                        <h5 className="text-xs font-black text-slate-800 tracking-tight uppercase mb-0">
                                          {isTh ? sect.titleTh : sect.titleEn}
                                        </h5>
                                        <span className="px-2 py-0.5 text-[10px] font-bold bg-slate-100 text-slate-500 rounded-md">
                                          {sectionLabels.length} {isTh ? 'ฟิลด์' : 'fields'}
                                        </span>
                                      </div>
                                    </div>

                                    {/* Fields List */}
                                    <div className="space-y-3.5">
                                      {sectionLabels.length === 0 ? (
                                        <div className="py-6 text-center text-slate-400 text-xs font-medium border border-dashed border-slate-100 rounded-[8px] bg-slate-50/20">
                                          {isTh ? 'ยังไม่มีฟิลด์ในส่วนนี้' : 'No fields defined. Click "เพิ่ม Field" to begin.'}
                                        </div>
                                      ) : (
                                        <div className="space-y-4 animate-in fade-in duration-200">
                                          {sectionLabels.map((label) => (
                                            <div 
                                              key={label.id} 
                                              className={`pt-4 ${label.type === 'array' ? 'pb-0' : 'pb-4'} px-0 bg-slate-50/50 rounded-[8px] border border-slate-200/50 ${label.type === 'array' ? 'space-y-3.5' : ''} transition-all`}
                                            >
                                              {/* Main Row */}
                                              <div className="flex gap-4 items-center w-full px-4">
                                                {/* Field Name Input */}
                                                <div className="flex-1 min-w-0">
                                                  <input 
                                                    type="text"
                                                    value={label.name}
                                                    onChange={(e) => handleUpdateLabelRow(config.docTypeId, label.id, { name: e.target.value })}
                                                    placeholder={isTh ? 'ชื่อ field' : 'field name'}
                                                    className="w-full px-3.5 py-2 font-mono bg-white text-slate-800 font-semibold border rounded-[4px] focus:outline-none focus:ring-2 focus:ring-[#1f5df9]/10 text-sm h-[40px] transition-all border-slate-200 hover:border-slate-300 focus:border-[#1f5df9]"
                                                  />
                                                </div>

                                                {/* Select Field Type */}
                                                <div className="relative w-36">
                                                  <select
                                                    value={label.type || 'string'}
                                                    onChange={(e) => {
                                                      const newType = e.target.value;
                                                      if (newType === 'array' && !label.subLabels) {
                                                        handleUpdateLabelRow(config.docTypeId, label.id, { type: newType, subLabels: [] });
                                                      } else {
                                                        handleUpdateLabelRow(config.docTypeId, label.id, { type: newType });
                                                      }
                                                    }}
                                                    className="w-full pl-3.5 pr-8 py-2 bg-white text-slate-700 border border-slate-200 rounded-[4px] focus:outline-none focus:ring-2 focus:ring-[#1f5df9]/10 text-sm font-semibold h-[40px] appearance-none cursor-pointer"
                                                  >
                                                    <option value="string">{isTh ? 'ข้อความ (Text)' : 'Text (string)'}</option>
                                                    <option value="number">{isTh ? 'ตัวเลข (Number)' : 'Number'}</option>
                                                    <option value="boolean">{isTh ? 'ใช่/ไม่ใช่ (Yes/No)' : 'Yes/No (boolean)'}</option>
                                                    <option value="date">{isTh ? 'วันที่ (Date)' : 'Date'}</option>
                                                    <option value="array">{isTh ? 'ชุดข้อมูล (Array)' : 'Table/List (array)'}</option>
                                                  </select>
                                                  <div className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-slate-400">
                                                    <ChevronDown size={14} />
                                                  </div>
                                                </div>

                                                <FieldTypeInfoButton isTh={isTh} />

                                                {/* Dangerously delete label field */}
                                                <button
                                                  type="button"
                                                  onClick={() => handleRemoveLabelRow(config.docTypeId, label.id)}
                                                  className="p-2 text-rose-500 hover:text-rose-750 hover:bg-rose-50 active:scale-95 border border-transparent rounded-[4px] transition-all cursor-pointer flex items-center justify-center h-[40px] w-[40px]"
                                                  title={isTh ? 'ลบ Field' : 'Delete field'}
                                                >
                                                  <Trash2 size={16} />
                                                </button>
                                              </div>

                                              {/* Sub-fields block for array type */}
                                              {label.type === 'array' && (
                                                <div className="mx-4 mb-4 pl-6 border-l-2 border-dashed border-[#1f5df9]/40 space-y-3 pt-1">
                                                  <div className="flex items-center justify-between">
                                                    <span className="text-[11px] font-black text-[#010136]/75 uppercase tracking-wider flex items-center gap-1.5 label-section-title">
                                                      <span className="w-1.5 h-1.5 rounded-full bg-[#16EA9E]" />
                                                      {isTh ? `ฟิลด์ย่อย (Array Items: ${label.name || '?'})` : `Sub-Fields for Array Items: ${label.name || '?'}`}
                                                    </span>
                                                  </div>

                                                  {/* Sub-fields list */}
                                                  {(!label.subLabels || label.subLabels.length === 0) ? (
                                                    <div className="p-4 text-center text-slate-400 text-xs font-semibold bg-white/70 border border-dashed border-slate-200/80 rounded-[8px]">
                                                      {isTh ? 'ยังไม่มีฟิลด์ย่อย กดปุ่มด้านล่างเพื่อเริ่มกำหนดค่า' : 'No nested fields yet. Click the button below to begin.'}
                                                    </div>
                                                  ) : (
                                                    <div className="space-y-2.5">
                                                      {label.subLabels.map((subLabel) => (
                                                        <div key={subLabel.id} className="p-3 bg-white rounded-[8px] border border-slate-200/60 shadow-3xs hover:shadow-2xs transition-all animate-in slide-in-from-top-1 duration-150 space-y-2">
                                                          <div className="flex gap-3 items-center w-full">
                                                            {/* Sub-Field Name Input */}
                                                            <div className="flex-1 min-w-0">
                                                              <input 
                                                                type="text"
                                                                value={subLabel.name}
                                                                onChange={(e) => handleUpdateSubLabelRow(config.docTypeId, label.id, subLabel.id, { name: e.target.value })}
                                                                placeholder={isTh ? 'ชื่อ field ย่อย' : 'sub-field name'}
                                                                className="w-full px-3 py-1.5 font-mono bg-white text-slate-800 font-semibold border border-slate-200 rounded-[4px] focus:outline-none focus:ring-2 focus:ring-[#1f5df9]/10 text-xs h-[36px] transition-all hover:border-slate-300 focus:border-[#1f5df9]"
                                                              />
                                                            </div>

                                                            {/* Sub-Field Type Selector */}
                                                            <div className="relative w-32">
                                                              <select
                                                                value={subLabel.type || 'string'}
                                                                onChange={(e) => handleUpdateSubLabelRow(config.docTypeId, label.id, subLabel.id, { type: e.target.value })}
                                                                className="w-full pl-3 pr-8 py-1.5 bg-white text-slate-700 border border-slate-200 rounded-[4px] focus:outline-none focus:ring-2 focus:ring-[#1f5df9]/10 text-xs font-semibold h-[36px] appearance-none cursor-pointer"
                                                              >
                                                                <option value="string">{isTh ? 'ข้อความ (Text)' : 'Text (string)'}</option>
                                                                <option value="number">{isTh ? 'ตัวเลข (Number)' : 'Number'}</option>
                                                                <option value="boolean">{isTh ? 'ใช่/ไม่ใช่ (Yes/No)' : 'Yes/No (boolean)'}</option>
                                                                <option value="date">{isTh ? 'วันที่ (Date)' : 'Date'}</option>
                                                              </select>
                                                              <div className="pointer-events-none absolute inset-y-0 right-2 w-4 flex items-center text-slate-400">
                                                                <ChevronDown size={12} />
                                                              </div>
                                                            </div>

                                                            {/* Delete Sub-Field */}
                                                            <button
                                                              type="button"
                                                              onClick={() => handleRemoveSubLabelRow(config.docTypeId, label.id, subLabel.id)}
                                                              className="p-1.5 text-rose-500 hover:text-rose-750 hover:bg-rose-50 active:scale-95 border border-transparent rounded-[4px] transition-all cursor-pointer flex items-center justify-center h-[32px] w-[32px]"
                                                              title={isTh ? 'ลบ field ย่อย' : 'Delete sub-field'}
                                                            >
                                                              <Trash2 size={13} />
                                                            </button>
                                                          </div>
                                                        </div>
                                                      ))}
                                                    </div>
                                                  )}

                                                  <Button
                                                    type="dashed"
                                                    onClick={() => handleAddSubLabelRow(config.docTypeId, label.id)}
                                                    className="border-dashed border-[#1f5df9]/50 text-[#1f5df9] hover:text-[#0352cc] hover:border-[#0352cc] text-[11px] h-[26px] py-0 px-2.5 rounded-[4px] flex items-center justify-center w-full font-bold"
                                                  >
                                                    <Plus size={12} className="mr-1" />
                                                    {isTh ? 'เพิ่ม Field ย่อย' : 'Add Sub Field'}
                                                  </Button>
                                                </div>
                                              )}
                                            </div>
                                          ))}
                                        </div>
                                      )}

                                      <button
                                        type="button"
                                        onClick={() => handleAddLabelRow(config.docTypeId, sect.key)}
                                        className="w-full px-3 py-1.5 border border-dashed border-[#1f5df9]/40 hover:border-[#1f5df9]/70 hover:bg-[#1f5df9]/5 hover:text-[#1f5df9] text-[#1f5df9]/80 font-black text-xs rounded-[4px] transition-all flex items-center justify-center gap-1 bg-white cursor-pointer active:scale-98"
                                      >
                                        <Plus size={12} className="text-[#1f5df9]" />
                                        <span>{isTh ? 'เพิ่ม Field' : 'Add Field'}</span>
                                      </button>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </Drawer>

      {/* Warning confirmation modal for docTypes without labels */}
      <Modal
        open={showWarningModal}
        onCancel={() => {
          setShowWarningModal(false);
          setPendingSavePayload(null);
        }}
        footer={null}
        width={420}
        centered
        closable={false}
        className="rounded-3xl overflow-hidden"
      >
        <div className="p-4 text-center space-y-4">
          <div className="flex items-center justify-center mx-auto text-amber-500">
            <AlertCircle size={48} />
          </div>

          <div className="space-y-1.5">
            <h3 className="text-base font-black text-[#010136] tracking-tight">
              {isTh ? 'doc type นี้ยังไม่มี label' : 'This doc type has no labels yet'}
            </h3>
            <p className="text-xs text-slate-500 font-semibold leading-relaxed">
              {isTh 
                ? 'ต้องการบันทึกต่อไปหรือไม่' 
                : 'Do you want to continue saving anyway?'}
            </p>
          </div>

          {/* List of warning types */}
          {pendingSavePayload && (
            <div className="p-3 bg-amber-50/50 rounded-xl border border-amber-100 flex flex-col gap-1 text-left">
              <span className="text-[10px] font-bold text-amber-600 block uppercase tracking-wider">
                {isTh ? 'ประเภทเอกสารที่ไม่มี Label' : 'Zero labels configured on:'}
              </span>
              <div className="flex flex-wrap gap-1 mt-1">
                {formConfigs
                  .filter(cfg => cfg.labels.length === 0)
                  .map(cfg => {
                    const name = docTypes.find(d => d.id === cfg.docTypeId)?.name || cfg.docTypeId;
                    return (
                      <span key={cfg.docTypeId} className="px-2 py-0.5 text-[9px] font-extrabold bg-white text-slate-600 rounded-md border border-amber-250">
                        {name}
                      </span>
                    );
                  })}
              </div>
            </div>
          )}

          <div className="pt-2 grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => {
                setShowWarningModal(false);
                setPendingSavePayload(null);
              }}
              className="px-4 py-2.5 border border-slate-200 text-slate-500 hover:bg-slate-50 font-black text-xs uppercase tracking-wider rounded-[4px] transition-all cursor-pointer h-[40px]"
            >
              {isTh ? 'กลับไปแก้ไข' : 'Go back to edit'}
            </button>
            <button
              type="button"
              onClick={() => {
                if (pendingSavePayload) {
                  submitSave(pendingSavePayload);
                }
              }}
              className="px-4 py-2.5 bg-[#1f5df9] text-white hover:bg-[#104BE3] font-black text-xs uppercase tracking-wider rounded-[4px] transition-all shadow-md shadow-blue-500/10 cursor-pointer h-[40px]"
            >
              {isTh ? 'ต้องการบันทึกต่อไป' : 'Continue Saving'}
            </button>
          </div>
        </div>
      </Modal>

      {/* Delete Schema Modal */}
      <Modal
        open={!!schemaToDelete}
        onCancel={() => setSchemaToDelete(null)}
        footer={null}
        width={480}
        centered
        closable={false}
        className="rounded-3xl overflow-hidden"
      >
        {schemaToDelete && (
          <div className="p-4 text-center space-y-4">
            <div className="flex items-center justify-center mx-auto text-amber-500">
              <AlertCircle size={48} />
            </div>

            <div className="space-y-1.5">
              <h3 className="text-base font-black text-[#010136] tracking-tight hover:text-[#1F5DF9] transition-colors">
                {isTh ? `ต้องการลบ ${schemaToDelete.name} ใช่หรือไม่` : `Delete ${schemaToDelete.name}?`}
              </h3>
              
              {(() => {
                const schemaWorkflows = getWorkflowNames(schemaToDelete.workflowIds);
                if (schemaWorkflows.length > 0) {
                  return (
                    <div>
                      <div className="text-left mt-4 text-xs font-semibold leading-relaxed text-slate-500 bg-slate-50 p-4 rounded-xl border border-slate-200/80">
                        <div className="flex items-start gap-2 mb-2">
                          <AlertCircle size={16} className="text-amber-500 shrink-0 mt-0.5" />
                          <span className="text-slate-700 font-bold">
                            {isTh ? `schema นี้ถูกใช้ใน ${schemaToDelete.workflowIds.length} workflow` : `This schema is used in ${schemaToDelete.workflowIds.length} workflows`}
                          </span>
                        </div>
                        <ul className="list-disc pl-7 space-y-1 text-slate-600 font-medium opacity-90">
                          {schemaWorkflows.map((wf, idx) => (
                            <li key={idx}>{wf}</li>
                          ))}
                        </ul>
                      </div>
                      <p className="text-[11px] font-semibold text-slate-500 text-center leading-relaxed mt-4 w-full">
                        {isTh ? 'การลบจะกระทบ workflow เหล่านั้น Extract node จะแสดง incomplete' : 'Deleting this will affect these workflows. Their Extract nodes will become incomplete.'}
                      </p>
                    </div>
                  );
                }
                return (
                  <p className="text-xs text-slate-500 mt-2 font-semibold">
                    {isTh ? 'การลบนี้ไม่สามารถกู้คืนได้' : 'This action cannot be undone.'}
                  </p>
                );
              })()}
            </div>

            <div className="pt-2 grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setSchemaToDelete(null)}
                className="px-4 py-2.5 border border-slate-200 text-slate-500 hover:bg-slate-50 font-black text-xs uppercase tracking-wider rounded-[4px] transition-all cursor-pointer h-[40px]"
              >
                {isTh ? 'ยกเลิก' : 'Cancel'}
              </button>
              <button
                type="button"
                onClick={() => {
                  handleDeleteSchema(schemaToDelete.id);
                  setSchemaToDelete(null);
                }}
                className="px-4 py-2.5 bg-[#1F5DF9] text-white hover:bg-[#104BE3] font-black text-xs uppercase tracking-wider rounded-[4px] transition-all shadow-md shadow-blue-500/10 cursor-pointer h-[40px]"
              >
                {isTh ? 'ลบทันที' : 'Confirm Delete'}
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};
