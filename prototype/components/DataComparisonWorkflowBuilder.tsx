import React, { useState, useRef, useEffect } from 'react';
import { 
  ArrowLeft, Save, Play, Plus, Trash2, Settings, FileText, 
  Database, FileOutput, X, Mail, Folder, Paperclip,
  FolderInput, Briefcase, Send, ChevronRight, Hash, Layers,
  ZoomIn, ZoomOut, Upload, Minus, ChevronDown, UserPlus, HardDrive, Share2, FileSearch, ScanSearch, Maximize, UserCheck,
  ShieldCheck, Terminal, List, Clock, AlertCircle, CheckCircle2, Cpu, Loader2,
  GitBranch, Scale, Filter, Eye, Zap, Tag, Scan, History, RefreshCw, Key, Files
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Workflow, WorkflowNode, WorkflowEdge, Language, DocType } from '../types';
import { TRANSLATIONS } from '../translations';
import { DEFAULT_SCHEMAS } from './LabelSchemaSettings';

const MASTER_DOC_TYPES = [
  { id: 'INV', name: 'Invoice', hint: 'Commercial Invoice with billing details', pattern: 'INV_*, INVOICE_*' },
  { id: 'BL', name: 'Bill of Lading', hint: 'Shipping document with cargo details', pattern: 'BL_*, BOL_*' },
  { id: 'PL', name: 'Packing List', hint: 'Detailed list of items in the shipment', pattern: 'PL_*, PACK_*' },
  { id: 'PO', name: 'Purchase Order', hint: 'Commercial document issued by a buyer', pattern: 'PO_*' },
  { id: 'CO', name: 'Certificate of Origin', hint: 'Declares in which country a commodity was manufactured', pattern: 'CO_*, CERT_*' },
  { id: 'DO', name: 'Delivery Order', hint: 'Order from consignee to carrier to release cargo', pattern: 'DO_*' }
];

const parseStorageTemplate = (template: string) => {
  if (!template) return '';
  return template
    .replace(/{year}/g, '2026')
    .replace(/{month}/g, '06')
    .replace(/{date}/g, '20260608')
    .replace(/{job#}/g, 'US-TH-2026-00445')
    .replace(/{job_type}/g, 'USA Tech Import Standards')
    .replace(/{doc_type}/g, 'Invoice')
    .replace(/{original_name}/g, 'commercial_invoice_v3');
};

const getLocalLabelSchemas = (): any[] => {
  if (typeof window !== 'undefined') {
    const saved = localStorage.getItem('bizx_label_schemas');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error('Failed to parse local schemas', e);
      }
    }
  }
  return DEFAULT_SCHEMAS;
};

const getSchemaNameById = (schemaId: string): string => {
  if (!schemaId) return '';
  const schemas = getLocalLabelSchemas();
  const schema = schemas.find(s => s.id === schemaId);
  return schema ? schema.name : schemaId;
};

interface DataComparisonWorkflowBuilderProps {
  workflow?: Workflow;
  language: Language;
  onSave: (workflow: Workflow) => void;
  onBack: () => void;
  docTypes?: DocType[];
  rules?: any[];
}

interface WorkflowRunHistory {
  id: string;
  timestamp: string;
  status: 'SUCCESS' | 'FAILED';
  duration: string;
  triggerData: any;
  nodeExecutions: {
    id: string;
    title: string;
    status: 'SUCCESS' | 'FAILED';
    input: any;
    output: any;
    startTime: string;
    endTime: string;
  }[];
  timeline: {
    time: string;
    event: string;
    description: string;
    status: 'DISPATCHED' | 'COMPLETED' | 'FAILED';
    nodeName?: string;
  }[];
}

interface FolderHierarchyEditorProps {
  value: string;
  onChange: (value: string) => void;
  language: Language;
}

const FolderHierarchyEditor: React.FC<FolderHierarchyEditorProps> = ({ value, onChange, language }) => {
  const levels = value ? value.split('/') : ['INBOX'];
  
  const updateLevel = (index: number, newValue: string) => {
    const newLevels = [...levels];
    newLevels[index] = newValue;
    onChange(newLevels.join('/'));
  };

  const addLevel = () => {
    if (levels.length < 6) {
      onChange([...levels, ''].join('/'));
    }
  };

  const removeLevel = (index: number) => {
    if (levels.length > 1) {
      const newLevels = levels.filter((_, i) => i !== index);
      onChange(newLevels.join('/'));
    }
  };

  return (
    <div className="space-y-4">
      {levels.map((level, index) => (
        <div key={index} className="flex items-center gap-4" style={{ paddingLeft: `${index * 16}px` }}>
          {index > 0 && <ChevronRight size={14} className="text-slate-300 shrink-0" />}
          <div className="relative flex-1 group">
            <input
              type="text"
              value={level}
              onChange={(e) => updateLevel(index, e.target.value)}
              className={`w-full bg-white p-4 rounded-lg text-xs font-black text-slate-700 border tracking-tight transition-all ${
                !level.trim() ? 'border-amber-300 ring-4 ring-amber-500/10' : 'border-slate-100 hover:border-slate-200'
              } focus:outline-none focus:ring-2 focus:ring-emerald-500/20`}
              placeholder={index === 0 ? "INBOX" : (language === 'TH' ? "ชื่อโฟลเดอร์..." : "Subfolder name...")}
            />
            {levels.length > 1 && (
              <button 
                onClick={() => removeLevel(index)}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 text-slate-300 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-all rounded-[4px] hover:bg-rose-50"
              >
                <Trash2 size={14} />
              </button>
            )}
          </div>
        </div>
      ))}
      {levels.length < 6 && (
        <button
          onClick={addLevel}
          className="w-full py-4 border-2 border-dashed border-slate-200 rounded-[4px] flex items-center justify-center gap-4 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 hover:border-emerald-200 transition-all group mt-1"
        >
          <Plus size={16} className="group-hover:rotate-90 transition-transform duration-300" />
          <span className="text-[10px] font-black uppercase tracking-widest">{language === 'TH' ? 'เพิ่มโฟลเดอร์ย่อย' : 'Add Subfolder'}</span>
        </button>
      )}
    </div>
  );
};

interface TagInputProps {
  tags: string[];
  onChange: (tags: string[]) => void;
  placeholder?: string;
  className?: string;
}

const TagInput: React.FC<TagInputProps> = ({ tags = [], onChange, placeholder, className }) => {
  const [input, setInput] = useState('');

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if ((e.key === 'Enter' || e.key === ',') && input.trim()) {
      e.preventDefault();
      const newTag = input.trim().startsWith('.') ? input.trim() : input.trim();
      if (!tags.includes(newTag)) {
        onChange([...tags, newTag]);
      }
      setInput('');
    } else if (e.key === 'Backspace' && !input && tags.length > 0) {
      onChange(tags.slice(0, -1));
    }
  };

  return (
    <div className={`flex flex-wrap gap-4 p-4 bg-slate-50 rounded-lg border border-slate-100 min-h-[56px] items-center ${className}`}>
      {tags.map((tag, idx) => (
        <span key={idx} className="flex items-center gap-4 px-3 py-1.5 bg-white text-slate-700 rounded-2xl text-[10px] font-black border border-slate-200 shadow-sm animate-in zoom-in-95 duration-200 uppercase tracking-tight">
          {tag}
          <button onClick={() => onChange(tags.filter((_, i) => i !== idx))} className="ml-1 text-slate-300 hover:text-rose-500 transition-colors">
            <X size={12} strokeWidth={3} />
          </button>
        </span>
      ))}
      <input
        type="text"
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={tags.length === 0 ? placeholder : ""}
        className="flex-1 bg-transparent border-none focus:outline-none text-[10px] font-bold text-slate-700 min-w-[120px] uppercase tracking-widest"
      />
    </div>
  );
};

export const DataComparisonWorkflowBuilder: React.FC<DataComparisonWorkflowBuilderProps> = ({ 
  workflow, language, onSave, onBack, docTypes, rules
}) => {
  const currentDocTypes = docTypes || MASTER_DOC_TYPES;
  const t = TRANSLATIONS[language];
  // Sync comparing rules cleanly from localStorage if present
  const localRules = typeof window !== 'undefined' ? (() => {
    const saved = localStorage.getItem('bizx_compare_rules_v5');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error('Failed to parse compare rules in builder', e);
      }
    }
    return null;
  })() : null;

  const defaultRules = rules || localRules || [
    {
      id: 'rule-001',
      name: 'Import Declaration High-Value',
      nameTh: 'กฎตรวจสอบใบขนสินค้าข้ามแดนมูลค่าสูง',
      description: 'Strict matching for high value retail and industrial imports including custom clearances.',
      docTypes: ['INV', 'PL', 'CO', 'BL', 'PO']
    },
    {
      id: 'rule-002',
      name: 'Standard Export Documents',
      nameTh: 'กฎตรวจสอบเอกสารส่งออกมาตรฐาน',
      description: 'Standard matching for commercial invoices and packing lists for export shipments.',
      docTypes: ['INV', 'PL']
    },
    {
      id: 'rule-003',
      name: 'Chemical & Dangerous Goods',
      nameTh: 'กฎตรวจสอบเคมีภัณฑ์และสินค้าอันตราย',
      description: 'Specific comparison checks for dangerous chemical clearance declaration datasets.',
      docTypes: ['INV', 'PL', 'CO', 'BL']
    },
    {
      id: 'rule-004',
      name: 'Automated HS Code Verification',
      nameTh: 'กฎเปรียบเทียบพิกัดศุลกากร (HS Code) อัตโนมัติ',
      description: 'Verifies standard HS Code classifications and special duty rate matches for general imports.',
      docTypes: ['INV', 'PL', 'CO']
    },
    {
      id: 'rule-005',
      name: 'B2B Freight Invoice Discrepancy',
      nameTh: 'กฎตรวจส่วนต่างบิลค่าขนส่งทางเรือ (B2B)',
      description: 'Cross-checks logistics carrier costs, freight charges, and surcharges against billing statements.',
      docTypes: ['INV', 'BL']
    }
  ];
  const [name, setName] = useState(workflow?.name || (language === 'TH' ? 'เวิร์กโฟลว์ใหม่' : 'New Comparison Workflow'));
  const [description, setDescription] = useState(workflow?.description || '');
  const [status, setStatus] = useState<'ACTIVE' | 'INACTIVE'>(workflow?.status === 'INACTIVE' ? 'INACTIVE' : 'ACTIVE');
  const [zoom, setZoom] = useState(1);
  
  const [nodes, setNodes] = useState<WorkflowNode[]>(workflow?.nodes || []);
  const [edges, setEdges] = useState<WorkflowEdge[]>(workflow?.edges || []);
  const [globalEdgeStyle, setGlobalEdgeStyle] = useState<WorkflowEdge['style']>(workflow?.edgeStyle || 'smooth');
  const [nodeHeights, setNodeHeights] = useState<Record<string, number>>({});
  
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [drawerNodeId, setDrawerNodeId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [selectedEdgeId, setSelectedEdgeId] = useState<string | null>(null);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const [draggingNodeId, setDraggingNodeId] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [addNodeMenu, setAddNodeMenu] = useState<{ nodeId: string; x: number; y: number } | null>(null);
  const [connectingFromId, setConnectingFromId] = useState<string | null>(null);
  const [connectingFromPortId, setConnectingFromPortId] = useState<string | null>(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [showCanvasNodeMenu, setShowCanvasNodeMenu] = useState<{ x?: number, y?: number, right?: number, bottom?: number } | null>(null);
  const [confirmToggleDialog, setConfirmToggleDialog] = useState(false);
  const [showHistoryDrawer, setShowHistoryDrawer] = useState(false);
  const [expandedRunId, setExpandedRunId] = useState<string | null>(null);
  const [isRefreshingHistory, setIsRefreshingHistory] = useState(false);
  
  const [historyData, setHistoryData] = useState<WorkflowRunHistory[]>([
    {
      id: 'run-1',
      timestamp: '13 May 26, 07:00:58',
      status: 'SUCCESS',
      duration: '25ms',
      triggerData: {
        receivedDateTime: "2026-05-13T14:00:55",
        emailMessageId: "AAMkADc4OTM0ODM0LWQyOTU2LTRjODJjZTRkYTBmNABGAAAAAAAAnzEp2f",
        subject: "wfwf",
        from: "tharathep@netbay.co.th",
        mailBoxConfigId: "01b0abd3-e969-43b9-9017-b9ba37b39dc4"
      },
      nodeExecutions: [
        {
          id: 'node-1',
          title: 'กรองอีเมล (Hybrid)',
          status: 'SUCCESS',
          startTime: '07:00:58.501',
          endTime: '07:00:58.511',
          input: {
            receivedDateTime: "2026-05-13T14:00:55",
            from: "tharathep@netbay.co.th",
            mailBoxConfigId: "01b0abd3-e969-43b9-9017-b9ba37b39dc4",
            emailMessageId: "AAMkADc4OTM0ODM0LWQyOTU2LTRjODJjZTRkYTBmNABGAAAAAAAAnzEp2f",
            subject: "wfwf"
          },
          output: {
            filterNeedsReview: false,
            hybridFilterMode: "RULE_BASED",
            receivedDateTime: "2026-05-13T14:00:55",
            hybridRulePassed: false,
            emailMessageId: "AAMkADc4OTM0ODM0LWQyOTU2LTRjODJjZTRkYTBmNABGAAAAAAAAnzEp2f",
            subject: "wfwf",
            filterPassed: false,
            from: "tharathep@netbay.co.th"
          }
        },
        {
          id: 'node-2',
          title: 'รับอีเมล add',
          status: 'SUCCESS',
          startTime: '07:00:58.489',
          endTime: '07:00:58.501',
          input: {
            receivedDateTime: "2026-05-13T14:00:55",
            from: "tharathep@netbay.co.th",
            mailBoxConfigId: "01b0abd3-e969-43b9-9017-b9ba37b39dc4",
            emailMessageId: "AAMkADc4OTM0ODM0LWQyOTU2LTRjODJjZTRkYTBmNABGAAAAAAAAnzEp2f",
            subject: "wfwf"
          },
          output: {
            receivedDateTime: "2026-05-13T14:00:55",
            from: "tharathep@netbay.co.th",
            mailBoxConfigId: "01b0abd3-e969-43b9-9017-b9ba37b39dc4",
            emailMessageId: "AAMkADc4OTM0ODM0LWQyOTU2LTRjODJjZTRkYTBmNABGAAAAAAAAnzEp2f",
            subject: "wfwf"
          }
        }
      ],
      timeline: [
        { time: '07:00:58', event: 'DISPATCHED', description: 'Sent to queue: workflow-email-ingest-queue', status: 'DISPATCHED', nodeName: 'รับอีเมล add' },
        { time: '07:00:58', event: 'COMPLETED', description: 'Node completed successfully', status: 'COMPLETED', nodeName: 'รับอีเมล add' },
        { time: '07:00:58', event: 'DISPATCHED', description: 'Sent to queue: workflow-hybrid-mail-filter-queue', status: 'DISPATCHED', nodeName: 'กรองอีเมล (Hybrid)' },
        { time: '07:00:58', event: 'COMPLETED', description: 'Node completed successfully', status: 'COMPLETED', nodeName: 'กรองอีเมล (Hybrid)' }
      ]
    },
    {
      id: 'run-2',
      timestamp: '13 May 26, 07:00:57',
      status: 'SUCCESS',
      duration: '66ms',
      triggerData: {},
      nodeExecutions: [],
      timeline: []
    },
    {
      id: 'run-3',
      timestamp: '13 May 26, 06:56:19',
      status: 'SUCCESS',
      duration: '47ms',
      triggerData: {},
      nodeExecutions: [],
      timeline: []
    },
    {
      id: 'run-4',
      timestamp: '13 May 26, 06:56:18',
      status: 'SUCCESS',
      duration: '15ms',
      triggerData: {},
      nodeExecutions: [],
      timeline: []
    }
  ]);

  const [deleteConfirmation, setDeleteConfirmation] = useState<{ nodeId: string } | null>(null);
  const [isTestingConnection, setIsTestingConnection] = useState(false);
  const [testConnectionResult, setTestConnectionResult] = useState<'success' | 'error' | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setTestConnectionResult(null);
    setIsTestingConnection(false);
    
    if (drawerNodeId) {
      const node = nodes.find(n => n.id === drawerNodeId);
      if (node && node.type === 'get_file') {
        const updates: any = {};
        if (!node.data.nodeName) updates.nodeName = renderNodeTitle(node.type);
        if (!node.data.protocol) updates.protocol = 'OAuth2 Outlook';
        if (!node.data.folder) updates.folder = 'INBOX';
        if (!node.data.pollInterval) updates.pollInterval = '1 min';
        
        if (Object.keys(updates).length > 0) {
          updateNodeData(node.id, updates);
        }
      } else if (node) {
        const updates: any = {};
        if (!node.data.nodeName) updates.nodeName = renderNodeTitle(node.type);
        
        if (Object.keys(updates).length > 0) {
          updateNodeData(node.id, updates);
        }
      }
    }
  }, [drawerNodeId]);

  const handleTestConnection = async () => {
    setIsTestingConnection(true);
    setTestConnectionResult(null);
    
    // Simulate a connection test
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Logic: if tenantId, clientId, and clientSecret are present, return success
    const node = nodes.find(n => n.id === drawerNodeId);
    if (node?.data.tenantId && node?.data.clientId && node?.data.clientSecret) {
      setTestConnectionResult('success');
    } else {
      setTestConnectionResult('error');
    }
    
    setIsTestingConnection(false);
  };

  const handleFitView = () => {
    if (nodes.length === 0 || !containerRef.current) return;

    const padding = 60;
    const rect = containerRef.current.getBoundingClientRect();
    
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;

    nodes.forEach(node => {
      const h = nodeHeights[node.id] || 240;
      const w = 300; // slightly wider than 280 for margin
      minX = Math.min(minX, node.position.x);
      minY = Math.min(minY, node.position.y);
      maxX = Math.max(maxX, node.position.x + w);
      maxY = Math.max(maxY, node.position.y + h);
    });

    const contentWidth = maxX - minX;
    const contentHeight = maxY - minY;

    const zoomX = (rect.width - padding * 2) / contentWidth;
    const zoomY = (rect.height - padding * 2) / contentHeight;
    const newZoom = Math.min(Math.max(0.3, Math.min(zoomX, zoomY)), 1);

    const newPanX = (rect.width / 2) - (minX + contentWidth / 2) * newZoom;
    const newPanY = (rect.height / 2) - (minY + contentHeight / 2) * newZoom;

    setZoom(newZoom);
    setPan({ x: newPanX, y: newPanY });
  };

  useEffect(() => {
    // Initial fit view after a small delay to ensure container rect and node heights are ready
    const timer = setTimeout(handleFitView, 200);
    return () => clearTimeout(timer);
  }, []);

  const getDefaultData = (type: string) => {
    const baseData = { isConfigured: false, nodeName: '' };
    switch (type) {
      case 'get_file': return { 
        ...baseData,
        nodeName: '',
        source: 'e-mail', 
        protocol: 'OAuth2 Outlook',
        tenantId: '',
        clientId: '',
        clientSecret: '',
        folder: 'INBOX',
        pollInterval: '1 min',
        markAsRead: true,
        allowedExtensions: ['PDF', 'JPG', 'XLS']
      };
      case 'attachment_filter': return {
        ...baseData,
        nodeName: '',
        includeExtensions: ['.pdf', '.xls', '.xlsx', '.jpg'],
        excludeExtensions: ['.exe', '.zip'],
        includeKeywords: ['invoice', 'BL'],
        excludeKeywords: ['draft', 'sample']
      };
      case 'group_of_file': return { 
        ...baseData,
        nodeName: '',
        docTypesToDetect: ['INV'],
        confidenceThreshold: 80      
      };
      case 'create_job': return { 
        ...baseData,
        jobTypeName: '',
        namingFormat: 'JOB-{YYYY}-{####}', 
        assignTo: '',
        matchKeys: ['PO#', 'B/L#', 'Invoice#'],
        requiredDocTypes: [
          { name: 'PO', isRequired: true },
          { name: 'Invoice', isRequired: true }
        ],
        closedJobBehavior: 'alert',
        lockedJobBehavior: 'queue',
        fileVersioning: true
      };
      case 'assign_job': return { ...baseData, assignee: 'Team Alpha', priority: 'High' };
      case 'route_job': return { 
        ...baseData,
        conditions: [
          { field: 'DocType', operator: 'equals', value: 'Invoice', target: '' },
          { field: 'Total', operator: '>', value: '1000', target: '' }
        ]
      };
      case 'filter_data': return {
        ...baseData,
        rules: [
          { field: 'Status', operator: 'in', value: 'Active, Paid' }
        ]
      };
      case 'inspect_data': return {
        ...baseData,
        checks: ['OCR Accuracy', 'Signature Present', 'Stamp Detected'],
        threshold: 95
      };
      case 'approve_data': return {
        ...baseData,
        approvers: ['Manager A', 'Director B'],
        requiredApprovals: 1
      };
      case 'connector': return {
        ...baseData,
        service: 'SAP',
        endpoint: 'https://api.sap.com/v1/ingest',
        apiKey: '••••••••'
      };
      case 'send_to': return { 
        ...baseData,
        destinations: ['DRIVE'],
        notifyOnComplete: true,
        notificationEmails: '',
        isPublic: false,
        exportFormat: 'ZIP',
        targetPortal: 'Internal'
      };
      case 'hybrid_mail_filter': return {
        ...baseData,
        nodeName: '',
        mode: 'Rule-based only',
        senderAllowlist: [],
        subjectIncludes: [],
        subjectExcludes: [],
        bodyKeywords: [],
        mustHaveAttachment: false,
        promptTemplate: '',
        model: 'Gemini',
        confidenceThreshold: 80,
        lowConfidenceRoute: 'Human review queue'
      };
      case 'storage': return {
        ...baseData,
        nodeName: language === 'TH' ? 'บันทึกข้อมูล (Storage Node)' : 'Storage Connection',
        directoryPath: '/imports/{year}/{month}',
        directoryNaming: '{job#}-{job_type}',
        fileNamingMode: 'original',
        fileNamingTemplate: '{job#}_{doc_type}_{date}',
      };
      case 'extract': return {
        ...baseData,
        nodeName: language === 'TH' ? 'สกัดข้อมูล (Extract)' : 'Extract Node',
        schemaId: '',
        confidenceThreshold: 80,
        allowReview: true
      };
      case 'compare': return {
        ...baseData,
        nodeName: '',
      };
      case 'send_email': return {
        ...baseData,
        nodeName: '',
      };
      default: return baseData;
    }
  };

  const addNodeAfter = (sourceNodeId: string, type: WorkflowNode['type']) => {
    const sourceNode = nodes.find(n => n.id === sourceNodeId);
    if (!sourceNode) return;

    const newNodeId = `node-${Date.now()}`;
    const newNode: WorkflowNode = {
      id: newNodeId,
      type,
      position: { x: sourceNode.position.x + 320, y: sourceNode.position.y },
      data: getDefaultData(type)
    };

    const newEdge: WorkflowEdge = {
      id: `edge-${Date.now()}`,
      source: sourceNodeId,
      target: newNodeId,
      style: globalEdgeStyle
    };

    setNodes([...nodes, newNode]);
    setEdges([...edges, newEdge]);
    setAddNodeMenu(null);
  };

  const addStandaloneNode = (type: WorkflowNode['type'], position: { x: number, y: number }) => {
    const newNodeId = `node-${Date.now()}`;
    const newNode: WorkflowNode = {
      id: newNodeId,
      type,
      position,
      data: getDefaultData(type)
    };
    setNodes([...nodes, newNode]);
    setShowCanvasNodeMenu(null);
  };

  const handleCanvasMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return;
    setIsPanning(true);
    setPanStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
    setSelectedNodeId(null);
    setSelectedEdgeId(null);
  };

  const handleNodeMouseDown = (e: React.MouseEvent, nodeId: string) => {
    e.stopPropagation();
    setSelectedNodeId(nodeId);
    setSelectedEdgeId(null);
    const node = nodes.find(n => n.id === nodeId);
    if (node) {
      setDraggingNodeId(nodeId);
      // Adjust drag offset based on zoom
      setDragOffset({ x: e.clientX - node.position.x * zoom, y: e.clientY - node.position.y * zoom });
    }
  };

  const handleCanvasMouseMove = (e: React.MouseEvent) => {
    // Calculate mouse position in canvas coordinates
    const rect = e.currentTarget.getBoundingClientRect();
    const canvasMouseX = (e.clientX - rect.left - pan.x) / zoom;
    const canvasMouseY = (e.clientY - rect.top - pan.y) / zoom;
    setMousePos({ x: canvasMouseX, y: canvasMouseY });

    if (draggingNodeId) {
      // Adjust movement based on zoom and snap to 16px grid
      const rawX = (e.clientX - dragOffset.x) / zoom;
      const rawY = (e.clientY - dragOffset.y) / zoom;
      const x = Math.round(rawX / 16) * 16;
      const y = Math.round(rawY / 16) * 16;
      setNodes(prev => prev.map(n => n.id === draggingNodeId ? { ...n, position: { x, y } } : n));
    } else if (isPanning) {
      setPan({ x: e.clientX - panStart.x, y: e.clientY - panStart.y });
    }
  };

  const handleCanvasMouseUp = () => {
    setDraggingNodeId(null);
    setIsPanning(false);
    setConnectingFromId(null);
    setConnectingFromPortId(null);
  };

  const handleNodeMouseUp = (e: React.MouseEvent, targetNodeId: string) => {
    if (connectingFromId && connectingFromId !== targetNodeId) {
      e.stopPropagation();
      
      // Check if edge already exists
      const exists = edges.some(edge => 
        edge.source === connectingFromId && 
        edge.target === targetNodeId && 
        edge.sourcePortId === (connectingFromPortId || undefined)
      );
      if (!exists) {
        const newEdge: WorkflowEdge = {
          id: `edge-${Date.now()}`,
          source: connectingFromId,
          target: targetNodeId,
          sourcePortId: connectingFromPortId || undefined
        };
        setEdges(prev => [...prev, newEdge]);
      }
      setConnectingFromId(null);
      setConnectingFromPortId(null);
    }
  };

  const handleCanvasWheel = (e: React.WheelEvent) => {
    if (e.ctrlKey || e.metaKey) {
      const delta = e.deltaY;
      const zoomFactor = 0.05;
      const newZoom = delta > 0 ? Math.max(0.2, zoom - zoomFactor) : Math.min(3, zoom + zoomFactor);
      setZoom(newZoom);
      e.preventDefault();
    } else {
      // Normal pan with scroll if not ctrl key
      setPan(prev => ({ x: prev.x - e.deltaX, y: prev.y - e.deltaY }));
    }
  };

  const handleZoomIn = () => setZoom(prev => Math.min(3, prev + 0.1));
  const handleZoomOut = () => setZoom(prev => Math.max(0.2, prev - 0.1));
  
  const handleToolbarDragStart = (e: React.DragEvent, type: WorkflowNode['type']) => {
    e.dataTransfer.setData('nodeType', type);
    e.dataTransfer.effectAllowed = 'copy';
  };

  const handleCanvasDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
  };

  const handleCanvasDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsPanning(false);
    setDraggingNodeId(null);
    const type = e.dataTransfer.getData('nodeType') as WorkflowNode['type'];
    if (!type) return;

    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const x = (e.clientX - rect.left - pan.x) / zoom;
      const y = (e.clientY - rect.top - pan.y) / zoom;
      
      // Center the node
      addStandaloneNode(type, { x: x - 140, y: y - 50 });
    }
  };

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  const handleSave = () => {
    onSave({
      id: workflow?.id || `cwf-${Date.now()}`,
      name: name || (language === 'TH' ? 'เวิร์กโฟลว์ใหม่' : 'New Comparison Workflow'),
      description,
      status,
      createdAt: workflow?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      nodes,
      edges,
      edgeStyle: globalEdgeStyle
    });
  };

  const updateNodeData = (nodeId: string, newData: any) => {
    setNodes(prev => prev.map(n => n.id === nodeId ? { ...n, data: { ...n.data, ...newData } } : n));
  };

  const updateEdgeStyle = (edgeId: string, style: WorkflowEdge['style']) => {
    setGlobalEdgeStyle(style);
    setEdges(prev => prev.map(e => ({ ...e, style })));
  };

  const deleteEdge = (edgeId: string) => {
    setEdges(prev => prev.filter(e => e.id !== edgeId));
    if (selectedEdgeId === edgeId) setSelectedEdgeId(null);
  };

  const handleDeleteNode = (nodeId: string, force: boolean = false) => {
    const hasEdges = edges.some(e => e.source === nodeId || e.target === nodeId);
    
    if (hasEdges && !force) {
      setDeleteConfirmation({ nodeId });
      return;
    }

    setNodes(prev => prev.filter(n => n.id !== nodeId));
    setEdges(prev => prev.filter(e => e.source !== nodeId && e.target !== nodeId));
    if (selectedNodeId === nodeId) setSelectedNodeId(null);
    setDeleteConfirmation(null);
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if user is typing in an input or textarea
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selectedNodeId) {
          handleDeleteNode(selectedNodeId);
        } else if (selectedEdgeId) {
          deleteEdge(selectedEdgeId);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedNodeId, selectedEdgeId, edges]);

  const getBestConnectionPoints = (sourceId: string, targetId: string, edge?: WorkflowEdge) => {
    const source = nodes.find(n => n.id === sourceId);
    const target = nodes.find(n => n.id === targetId);
    if (!source || !target) return { startX: 0, startY: 0, endX: 0, endY: 0 };

    const sH = nodeHeights[source.id] || 200;
    const sW = 280;
    const tH = nodeHeights[target.id] || 200;
    const tW = 280;

    // Center points
    const scx = source.position.x + sW / 2;
    const scy = source.position.y + sH / 2;
    const tcx = target.position.x + tW / 2;
    const tcy = target.position.y + tH / 2;

    // Potential source points: Right, Left
    const sPoints = [
      { x: source.position.x + sW, y: scy, side: 'right' },
      { x: source.position.x, y: scy, side: 'left' }
    ];

    // Potential target points: Right, Left
    const tPoints = [
      { x: target.position.x + tW, y: tcy, side: 'right' },
      { x: target.position.x, y: tcy, side: 'left' }
    ];

    let bestDist = Infinity;
    let bestS = sPoints[0]; // Default right
    let bestT = tPoints[1]; // Default left

    for (const s of sPoints) {
      for (const t of tPoints) {
        const dist = Math.sqrt(Math.pow(s.x - t.x, 2) + Math.pow(s.y - t.y, 2));
        if (dist < bestDist) {
          bestDist = dist;
          bestS = s;
          bestT = t;
        }
      }
    }

    return { 
      startX: bestS.x, 
      startY: bestS.y, 
      endX: bestT.x, 
      endY: bestT.y,
      sourceSide: bestS.side,
      targetSide: bestT.side
    };
  };

  const getEdgePath = (startX: number, startY: number, endX: number, endY: number, style?: WorkflowEdge['style'], sourceSide?: string, targetSide?: string) => {
    const activeStyle = style || globalEdgeStyle;
    
    if (activeStyle === 'straight') {
      return `M ${startX} ${startY} L ${endX} ${endY}`;
    }

    if (activeStyle === 'smooth') {
      const distX = Math.abs(endX - startX);
      const distY = Math.abs(endY - startY);
      
      // Control point logic based on sides
      let cp1x = startX;
      let cp1y = startY;
      let cp2x = endX;
      let cp2y = endY;

      const offset = Math.max(50, (distX + distY) * 0.2);

      if (sourceSide === 'right') cp1x += offset;
      else if (sourceSide === 'left') cp1x -= offset;
      else if (sourceSide === 'top') cp1y -= offset;
      else if (sourceSide === 'bottom') cp1y += offset;

      if (targetSide === 'right') cp2x += offset;
      else if (targetSide === 'left') cp2x -= offset;
      else if (targetSide === 'top') cp2y -= offset;
      else if (targetSide === 'bottom') cp2y += offset;

      return `M ${startX} ${startY} C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${endX} ${endY}`;
    }

    // Elbow style with robust Manhattan routing
    const borderRadius = 12;
    const minMargin = 30;
    const points: {x: number, y: number}[] = [{x: startX, y: startY}];

    // Simple routing logic: move out from side, then to middle
    let p1x = startX, p1y = startY;
    let p2x = endX, p2y = endY;

    if (sourceSide === 'right') p1x += minMargin;
    else if (sourceSide === 'left') p1x -= minMargin;
    else if (sourceSide === 'top') p1y -= minMargin;
    else if (sourceSide === 'bottom') p1y += minMargin;

    if (targetSide === 'right') p2x += minMargin;
    else if (targetSide === 'left') p2x -= minMargin;
    else if (targetSide === 'top') p2y -= minMargin;
    else if (targetSide === 'bottom') p2y += minMargin;

    points.push({x: p1x, y: p1y});
    
    // Middle point logic
    if (sourceSide === 'left' || sourceSide === 'right') {
      if (targetSide === 'left' || targetSide === 'right') {
        const midX = (p1x + p2x) / 2;
        points.push({x: midX, y: p1y});
        points.push({x: midX, y: p2y});
      } else {
        points.push({x: p2x, y: p1y});
      }
    } else {
      if (targetSide === 'top' || targetSide === 'bottom') {
        const midY = (p1y + p2y) / 2;
        points.push({x: p1x, y: midY});
        points.push({x: p2x, y: midY});
      } else {
        points.push({x: p1x, y: p2y});
      }
    }

    points.push({x: p2x, y: p2y});
    points.push({x: endX, y: endY});

    // Build the SVG path string with quadratic curves for rounded corners
    let path = `M ${points[0].x} ${points[0].y}`;
    for (let i = 1; i < points.length; i++) {
      const prev = points[i - 1];
      const curr = points[i];
      const next = points[i + 1];

      if (next) {
        const d1 = Math.sqrt(Math.pow(curr.x - prev.x, 2) + Math.pow(curr.y - prev.y, 2));
        const d2 = Math.sqrt(Math.pow(next.x - curr.x, 2) + Math.pow(next.y - curr.y, 2));
        const r = Math.min(borderRadius, d1 / 2, d2 / 2);

        if (r > 0 && (curr.x !== prev.x || curr.y !== prev.y)) {
          const p1 = {
            x: curr.x + (prev.x - curr.x) * (r / d1),
            y: curr.y + (prev.y - curr.y) * (r / d1)
          };
          const p2 = {
            x: curr.x + (next.x - curr.x) * (r / d2),
            y: curr.y + (next.y - curr.y) * (r / d2)
          };
          path += ` L ${p1.x} ${p1.y} Q ${curr.x} ${curr.y} ${p2.x} ${p2.y}`;
        } else {
          path += ` L ${curr.x} ${curr.y}`;
        }
      } else {
        path += ` L ${curr.x} ${curr.y}`;
      }
    }
    
    return path;
  };

  const renderNodeIcon = (type: string) => {
    switch (type) {
      case 'get_file': return <Mail size={24} className="text-blue-500" />;
      case 'hybrid_mail_filter': return <Filter size={24} className="text-orange-500" />;
      case 'attachment_filter': return <Paperclip size={24} className="text-purple-500" />;
      case 'group_of_file': return <Tag size={24} className="text-indigo-500" />;
      case 'route_job': return <GitBranch size={24} className="text-emerald-500" />;
      case 'assign_job': return <UserPlus size={24} className="text-indigo-500" />;
      case 'create_job': return <Briefcase size={24} className="text-amber-500" />;
      case 'filter_data': return <Filter size={24} className="text-orange-500" />;
      case 'inspect_data': return <Eye size={24} className="text-sky-500" />;
      case 'approve_data': return <ShieldCheck size={24} className="text-rose-500" />;
      case 'send_to': return <Send size={24} className="text-emerald-600" />;
      case 'connector': return <Zap size={24} className="text-yellow-500" />;
      case 'storage': return <HardDrive size={24} className="text-slate-500" />;
      case 'extract': return <Scan size={24} className="text-emerald-500" />;
      case 'compare': return <Scale size={24} className="text-blue-600" />;
      case 'send_email': return <Mail size={24} className="text-amber-400" />;
      default: return <Settings size={24} className="text-slate-500" />;
    }
  };

  const isNodeIncomplete = (node: WorkflowNode) => {
    switch (node.type) {
      case 'hybrid_mail_filter': {
        const d = node.data;
        if (d.mode === 'Prompt-based only') {
          if (!d.promptTemplate || d.promptTemplate.trim() === '') return true;
        }
        return false;
      }
      case 'attachment_filter': 
      case 'get_file': {
        const d = node.data;
        if (node.type === 'get_file') {
          // All levels must have a name
          const folderValid = d.folder && d.folder.split('/').every((level: string) => level.trim().length > 0);
          return !d.nodeName?.trim() || !d.protocol || !d.tenantId?.trim() || !d.clientId?.trim() || !d.clientSecret?.trim() || !folderValid || !d.pollInterval;
        }
        return false; // Attachment filter has no required fields
      }
      case 'create_job': {
        const d = node.data;
        return !d.jobTypeName?.trim() || !d.namingFormat?.trim() || !d.assignTo?.trim();
      }
      case 'group_of_file': {
        const d = node.data;
        if (!d.docTypesToDetect || d.docTypesToDetect.length === 0) {
          // Fallback check for fileTypes
          if (!d.fileTypes || d.fileTypes.length === 0) {
            return true;
          }
          // Verify if all fileTypes can be mapped to an existing docType
          const allFileTypesExist = d.fileTypes.every((ft: string) => 
            currentDocTypes.some((dt: any) => 
              dt.id.toUpperCase() === ft.toUpperCase() || 
              dt.name.toUpperCase() === ft.toUpperCase() ||
              (dt.id === 'INV' && ft.toUpperCase() === 'INVOICE') ||
              (dt.id === 'BL' && (ft.toUpperCase() === 'B/L' || ft.toUpperCase() === 'BOL'))
            )
          );
          return !allFileTypesExist;
        }
        
        // Check if any of docTypesToDetect does not exist in currentDocTypes
        const hasDeletedType = d.docTypesToDetect.some((typeId: string) => 
          !currentDocTypes.some((dt: any) => dt.id === typeId)
        );
        return hasDeletedType;
      }
      case 'extract': {
        const d = node.data;
        if (!d.schemaId) return true;
        if (d.confidenceThreshold === undefined || d.confidenceThreshold === null || d.confidenceThreshold === '') return true;
        
        const thresholdVal = Number(d.confidenceThreshold);
        if (isNaN(thresholdVal) || thresholdVal < 0 || thresholdVal > 100) return true;
        return false;
      }
      case 'compare': {
        const d = node.data;
        return !d.ruleId;
      }
      case 'storage': {
        const d = node.data;
        if (!d.directoryPath || d.directoryPath.trim() === '') return true;
        if (!d.directoryNaming || d.directoryNaming.trim() === '') return true;
        if (!d.fileNamingMode) return true;
        if (d.fileNamingMode === 'custom' && (!d.fileNamingTemplate || d.fileNamingTemplate.trim() === '')) return true;
        return false;
      }
      default: return false;
    }
  };

  const renderNodeTitle = (type: string) => {
    switch (type) {
      case 'get_file': return language === 'TH' ? 'Mail Connector (รับอีเมล)' : 'Mail Connector';
      case 'hybrid_mail_filter': return 'Hybrid Mail Filtering';
      case 'attachment_filter': return language === 'TH' ? 'Attachment Filter (กรองไฟล์แนบ)' : 'Attachment Filter';
      case 'group_of_file': return language === 'TH' ? 'Doc Classifier (จำแนกเอกสาร) + Filter' : 'Doc Classifier + Filter';
      case 'route_job': return language === 'TH' ? 'จัดเส้นทางเคส' : 'Job Routing';
      case 'assign_job': return language === 'TH' ? 'มอบหมายทีม' : 'Assign Team';
      case 'create_job': return 'JOB CREATION';
      case 'filter_data': return language === 'TH' ? 'กรอง' : 'Filter';
      case 'inspect_data': return language === 'TH' ? 'ตรวจสอบ' : 'Inspection';
      case 'approve_data': return language === 'TH' ? 'อนุมัติ' : 'Approval';
      case 'send_to': return 'Send to other app';
      case 'connector': return language === 'TH' ? 'ตัวเชื่อมต่อ' : 'Connector';
      case 'storage': return 'Storage';
      case 'extract': return 'Extract';
      case 'compare': return 'Compare';
      case 'send_email': return 'Send email';
      default: return 'Node';
    }
  };

  const selectedNode = nodes.find(n => n.id === selectedNodeId);
  
  const [windowHeight, setWindowHeight] = useState(typeof window !== 'undefined' ? window.innerHeight : 800);
  useEffect(() => {
    const handleResize = () => setWindowHeight(window.innerHeight);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const isCompact = windowHeight < 640;
  
  const toolbarCategories = [
    {
      name: 'Input',
      items: [
        { type: 'get_file' as WorkflowNode['type'], icon: (s: number) => <Mail size={s} />, color: 'text-blue-500' }
      ]
    },
    {
      name: 'Filter',
      items: [
        { type: 'hybrid_mail_filter' as WorkflowNode['type'], icon: (s: number) => <Filter size={s} />, color: 'text-orange-500' },
        { type: 'attachment_filter' as WorkflowNode['type'], icon: (s: number) => <Paperclip size={s} />, color: 'text-purple-500' }
      ]
    },
    {
      name: 'Classify',
      items: [
        { type: 'group_of_file' as WorkflowNode['type'], icon: (s: number) => <Tag size={s} />, color: 'text-indigo-500' }
      ]
    },
    {
      name: 'Job',
      items: [
        { type: 'create_job' as WorkflowNode['type'], icon: (s: number) => <Briefcase size={s} />, color: 'text-amber-500' }
      ]
    },
    {
      name: 'Process',
      items: [
        { type: 'storage' as WorkflowNode['type'], icon: (s: number) => <HardDrive size={s} />, color: 'text-slate-500' },
        { type: 'extract' as WorkflowNode['type'], icon: (s: number) => <Scan size={s} />, color: 'text-emerald-500' },
        { type: 'compare' as WorkflowNode['type'], icon: (s: number) => <Scale size={s} />, color: 'text-blue-600' }
      ]
    },
    {
      name: 'Output',
      items: [
        { type: 'send_to' as WorkflowNode['type'], icon: (s: number) => <Send size={s} />, color: 'text-emerald-600' },
        { type: 'send_email' as WorkflowNode['type'], icon: (s: number) => <Mail size={s} />, color: 'text-amber-400' }
      ]
    }
  ];

  const toolbarItems = toolbarCategories.flatMap(c => c.items);

  const groupingRules = [
    { name: 'MARDI_PO#M-IMP-26-0142', files: ['INVOICE', 'PACKING LIST', 'B / L', 'FTA', 'HS CODE'] },
    { name: 'GLOBAL_PO#G-IMP-26-0812', files: ['INVOICE', 'PACKING LIST', 'ใบขนสินค้า'] },
    { name: 'NEXUS_PO#N-IMP-26-1055', files: ['B / L', 'FREIGHT INVOICE', 'FTA'] },
  ];

  const NAMING_TAGS = ['{Date}', '{Ref}', '{JobType}', '{Seq}', '{YYYY}', '{MM}', '{DD}'];

  return (
    <div className="flex flex-col h-full bg-slate-50 overflow-hidden select-none rounded-2xl shadow-inner">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 shrink-0 z-10 shadow-sm rounded-t-2xl">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center px-6 py-4 gap-4">
          <div className="flex items-center gap-4 flex-1 min-w-0 w-full">
            <button onClick={onBack} className="p-2 hover:bg-slate-100 rounded-[4px] text-slate-500 transition-all shrink-0">
              <ArrowLeft size={20} />
            </button>
            <div className="h-8 w-px bg-slate-100 mx-1 shrink-0"></div>
            <div className="flex-1 min-w-0">
              <input 
                type="text" 
                placeholder={language === 'TH' ? 'ชื่อเวิร์กโฟลว์' : 'Workflow Name'}
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="text-lg md:text-xl font-black text-slate-800 bg-transparent border-none focus:outline-none p-0 hover:bg-slate-50 rounded px-2 focus:bg-slate-50 block w-full truncate"
              />
              <input 
                type="text"
                placeholder={language === 'TH' ? 'รายละเอียดเวิร์กโฟลว์...' : 'Workflow description...'}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="text-xs text-slate-500 bg-transparent border-none focus:outline-none p-0 hover:bg-slate-50 rounded px-2 w-full mt-0.5 focus:bg-slate-50 block truncate"
              />
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3 md:gap-4 shrink-0 w-full sm:w-auto">
            {/* Status Toggle as Switch */}
            <div className="flex items-center gap-2.5 shrink-0 select-none">
              <span className="text-[10px] font-black text-slate-500 uppercase tracking-tight">
                {status === 'ACTIVE' ? t.statusActive : t.statusInactive}
              </span>
              <button 
                onClick={() => {
                  if (status === 'ACTIVE') {
                    setStatus('INACTIVE');
                  } else {
                    if (nodes.some(isNodeIncomplete)) {
                      setConfirmToggleDialog(true);
                    } else {
                      setStatus('ACTIVE');
                    }
                  }
                }}
                className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full px-0 border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  status === 'ACTIVE' ? 'bg-emerald-500' : 'bg-slate-300'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                    status === 'ACTIVE' ? 'translate-x-4' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            <button 
              onClick={() => setShowHistoryDrawer(true)}
              className="flex items-center gap-3 px-4 py-2 bg-[#f1f5f9] border border-slate-200 rounded-[4px] font-black text-slate-600 hover:bg-slate-100 transition-all shadow-sm active:scale-95 group shrink-0"
            >
              <History size={18} className="text-blue-500 group-hover:rotate-12 transition-transform" />
              <div className="flex flex-col items-start leading-none">
                <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-0.5">
                  {language === 'TH' ? 'ประวัติการรัน' : 'Run History'}
                </span>
                <span className="text-[11px] font-black uppercase tracking-tight text-slate-700">
                  WORKFLOW
                </span>
              </div>
            </button>

            <button 
              onClick={handleSave} 
              className="flex items-center gap-2 md:gap-3 px-4 md:px-8 py-2 bg-blue-600 text-white rounded-[4px] font-black text-xs md:text-sm hover:bg-blue-700 transition-all shadow-[0_8px_20px_-4px_rgba(37,99,235,0.4)] active:scale-95 group shrink-0"
            >
              <Save size={18} className="group-hover:scale-110 transition-transform" />
              <span>{language === 'TH' ? 'บันทึก' : 'Save'}</span>
            </button>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-hidden relative" ref={containerRef}>
        {/* Canvas */}
        <div 
          className="absolute inset-0 bg-slate-100 cursor-grab active:cursor-grabbing"
          style={{
            backgroundImage: 'radial-gradient(#cbd5e1 1px, transparent 1px)',
            backgroundSize: `${16 * zoom}px ${16 * zoom}px`,
            backgroundPosition: `${pan.x}px ${pan.y}px`
          }}
          onMouseDown={handleCanvasMouseDown}
          onMouseMove={handleCanvasMouseMove}
          onMouseUp={handleCanvasMouseUp}
          onMouseLeave={handleCanvasMouseUp}
          onWheel={handleCanvasWheel}
          onDragOver={handleCanvasDragOver}
          onDrop={handleCanvasDrop}
          onContextMenu={(e) => {
            e.preventDefault();
            const rect = e.currentTarget.getBoundingClientRect();
            setShowCanvasNodeMenu({
              x: e.clientX - rect.left,
              y: e.clientY - rect.top
            });
          }}
        >
          {/* Panned Content */}
          <div 
            className="absolute inset-0"
            style={{ 
              transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
              transformOrigin: '0 0',
              transition: isPanning || draggingNodeId ? 'none' : 'transform 150ms ease-out'
            }}
            onClick={() => {
              if (showCanvasNodeMenu) setShowCanvasNodeMenu(null);
            }}
          >
            {/* Edges */}
            <svg className="absolute inset-0 w-[5000px] h-[5000px] pointer-events-none">
              {edges.map(edge => {
                const source = nodes.find(n => n.id === edge.source);
                const target = nodes.find(n => n.id === edge.target);
                if (!source || !target) return null;
                
                const { startX, startY, endX, endY, sourceSide, targetSide } = getBestConnectionPoints(edge.source, edge.target, edge);
                
                const isSelected = selectedEdgeId === edge.id;
                const path = getEdgePath(startX, startY, endX, endY, edge.style, sourceSide, targetSide);

                return (
                  <g key={edge.id} className="pointer-events-auto cursor-pointer group/edge" onClick={(e) => {
                    e.stopPropagation();
                    setSelectedEdgeId(edge.id);
                    setSelectedNodeId(null);
                  }}>
                    {/* Wider hit area */}
                    <path 
                      d={path}
                      stroke="transparent"
                      strokeWidth="20"
                      fill="none"
                    />
                    <path 
                      d={path}
                      stroke={isSelected ? "#3b82f6" : "#94a3b8"}
                      strokeWidth={isSelected ? "4" : "3"}
                      fill="none"
                      strokeLinecap="round"
                      className={`transition-all duration-300 ${isSelected ? '' : 'group-hover/edge:stroke-slate-400'}`}
                    />
                    {isSelected && (
                      <circle cx={endX} cy={endY} r="4" fill="#3b82f6" />
                    )}
                  </g>
                );
              })}

              {/* Temporary dragging edge */}
              {connectingFromId && (
                (() => {
                  const source = nodes.find(n => n.id === connectingFromId);
                  if (!source) return null;
                  const sourceHeight = nodeHeights[source.id] || 200;
                  let startX = source.position.x + 280;
                  let startY = source.position.y + sourceHeight / 2;
                  
                  const endX = mousePos.x;
                  const endY = mousePos.y;
                  return (
                    <path 
                      d={`M ${startX} ${startY} C ${startX + 100} ${startY}, ${endX - 100} ${endY}, ${endX} ${endY}`}
                      stroke="#3b82f6"
                      strokeWidth="3"
                      strokeDasharray="8,8"
                      fill="none"
                      strokeLinecap="round"
                    />
                  );
                })()
              )}
            </svg>

            {/* Edge Property Menu */}
            {selectedEdgeId && (() => {
              const edge = edges.find(e => e.id === selectedEdgeId);
              if (!edge) return null;
              
              const { startX, startY, endX, endY } = getBestConnectionPoints(edge.source, edge.target, edge);
              const midX = (startX + endX) / 2;
              const midY = (startY + endY) / 2;

              return (
                <div 
                  className="absolute z-[100] bg-white rounded-2xl shadow-2xl p-2 border border-blue-100 flex items-center gap-2 animate-in zoom-in-95 duration-200"
                  style={{ left: midX, top: midY, transform: 'translate(-50%, -50%)' }}
                  onMouseDown={(e) => e.stopPropagation()}
                >
                  <div className="flex bg-slate-100 p-1 rounded-2xl">
                    <button 
                      onClick={() => updateEdgeStyle(edge.id, 'smooth')}
                      className={`px-3 py-1.5 rounded-[4px] text-[9px] font-black uppercase transition-all ${(!edge.style || edge.style === 'smooth') ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                    >
                      Smooth
                    </button>
                    <button 
                      onClick={() => updateEdgeStyle(edge.id, 'straight')}
                      className={`px-3 py-1.5 rounded-[4px] text-[9px] font-black uppercase transition-all ${edge.style === 'straight' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                    >
                      Straight
                    </button>
                    <button 
                      onClick={() => updateEdgeStyle(edge.id, 'elbow')}
                      className={`px-3 py-1.5 rounded-[4px] text-[9px] font-black uppercase transition-all ${edge.style === 'elbow' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                    >
                      Elbow
                    </button>
                  </div>
                  <div className="w-px h-6 bg-slate-200 mx-1"></div>
                  <button 
                    onClick={() => deleteEdge(edge.id)}
                    className="p-2 text-red-500 hover:bg-red-50 rounded-[4px] transition-all"
                    title="Delete connection"
                  >
                    <Trash2 size={16} />
                  </button>
                  <button 
                    onClick={() => setSelectedEdgeId(null)}
                    className="p-2 text-slate-400 hover:bg-slate-50 rounded-[4px] transition-all"
                  >
                    <X size={16} />
                  </button>
                </div>
              );
            })()}

            {/* Nodes */}
            {nodes.length > 0 && nodes.map(node => (
              <div 
                key={node.id}
                ref={(el) => {
                  if (el && nodeHeights[node.id] !== el.offsetHeight) {
                    setNodeHeights(prev => ({ ...prev, [node.id]: el.offsetHeight }));
                  }
                }}
                onMouseDown={(e) => handleNodeMouseDown(e, node.id)}
                onMouseUp={(e) => handleNodeMouseUp(e, node.id)}
                className={`absolute w-[280px] bg-white rounded-2xl shadow-xl border-4 group
                  ${selectedNodeId === node.id ? 'border-blue-500 scale-105 z-20 shadow-blue-200' : 'border-white hover:border-slate-200 z-10'}
                  ${connectingFromId && connectingFromId !== node.id ? 'ring-4 ring-blue-400 ring-offset-4 ring-offset-slate-100' : ''}
                  ${node.data.isConfigured === false ? 'border-red-500/50 ring-4 ring-red-500/10 shadow-[0_0_20px_rgba(244,63,94,0.2)]' : isNodeIncomplete(node) ? 'border-amber-400/50 ring-4 ring-amber-400/10 shadow-[0_0_20px_rgba(245,158,11,0.2)]' : ''}
                `}
                style={{ 
                  left: node.position.x, 
                  top: node.position.y,
                  transition: draggingNodeId === node.id ? 'none' : 'transform 150ms ease-out, scale 150ms ease-out, border-color 150ms ease-out'
                }}
              >
                {(() => {
                  const isNotConfigured = node.data.isConfigured === false || isNodeIncomplete(node);
                  const isMissingTrigger = !edges.some(e => e.target === node.id) && node.type !== 'get_file';
                  const showWarning = isNotConfigured || isMissingTrigger;
                  
                  if (!showWarning) return null;

                  return (
                    <div className="absolute -top-3 -left-3 z-[60] group/tooltip">
                      <div className={`w-8 h-8 rounded-full text-white flex items-center justify-center shadow-lg border-2 border-white ring-4 cursor-help ${
                        isNotConfigured ? (node.data.isConfigured === false ? 'bg-red-600 ring-red-500/20' : 'bg-amber-500 ring-amber-400/20') : 'bg-amber-500 ring-amber-500/20'
                      } ${isNotConfigured ? 'animate-pulse' : ''}`}>
                        <AlertCircle size={18} strokeWidth={3} />
                      </div>
                      <div className="absolute bottom-full left-0 mb-2 w-64 p-3 bg-slate-800 text-white text-[11px] font-bold rounded-lg opacity-0 group-hover/tooltip:opacity-100 group-hover/tooltip:-translate-y-1 transition-all pointer-events-none after:content-[''] after:absolute after:top-full after:left-3 after:border-4 after:border-transparent after:border-t-slate-800 shadow-xl z-[100] whitespace-pre-wrap flex flex-col gap-1.5">
                        {isNotConfigured && (
                          <div className="flex gap-2">
                            <span className="shrink-0 text-red-400">•</span>
                            <span>{language === 'TH' ? 'โหนดนี้ยังไม่ได้ตั้งค่า หรือตั้งค่าไม่ครบถ้วน' : 'This node is not configured or configuration is incomplete'}</span>
                          </div>
                        )}
                        {isMissingTrigger && (
                          <div className="flex gap-2">
                            <span className="shrink-0 text-amber-400">•</span>
                            <span>{language === 'TH' ? 'โหนดนี้ไม่มี Trigger (Optional) — สามารถทำงานได้แม้ไม่มี Trigger' : 'This node has no Trigger (Optional) — It can run with or without a trigger'}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })()}

                <div className="p-4">
                  <div className="flex items-center gap-4 mb-4">
                    <div className="w-12 h-12 rounded-2xl bg-slate-50 flex items-center justify-center shadow-inner">
                      {renderNodeIcon(node.type)}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex flex-col">
                          <h3 className={`font-black uppercase tracking-tight leading-none text-[13px] ${node.data.isConfigured === false ? 'text-red-600' : 'text-slate-800'}`}>
                            {node.data.isConfigured === false ? (language === 'TH' ? 'ยังไม่ได้ตั้งค่า' : 'Not Configured') : (node.data.nodeName || renderNodeTitle(node.type))}
                          </h3>
                          {node.data.isConfigured !== false && node.data.nodeName && node.data.nodeName !== renderNodeTitle(node.type) && (
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none mt-1">{renderNodeTitle(node.type)}</p>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              setDrawerNodeId(node.id);
                            }}
                            className="p-1.5 hover:bg-slate-100 rounded-[4px] text-slate-400 hover:text-slate-600 transition-all"
                            title="Configure Node"
                          >
                            <Settings size={14} />
                          </button>
                        </div>
                      </div>
                      <div className="h-1 w-8 bg-blue-500 rounded-full mt-2"></div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    {node.data.isConfigured === false ? (
                      <div className="p-4 bg-amber-50 rounded-2xl border border-amber-100 flex items-center gap-3">
                        <AlertCircle size={16} className="text-amber-500" />
                        <span className="text-[12px] font-bold text-amber-600">
                          {TRANSLATIONS[language].notConfigured}
                        </span>
                      </div>
                    ) : (
                      <>
                        {node.type === 'get_file' && (
                          <div className="space-y-4">
                            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-4">
                          <div className="flex items-center justify-between">
                            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">PROTOCOL</span>
                            <span className="text-[10px] font-black text-blue-600 uppercase tracking-tight bg-blue-50 px-2 py-1 rounded-lg border border-blue-100">{node.data.protocol || 'OAuth2 Outlook'}</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">ACCOUNT</span>
                            <span className="text-[10px] font-bold text-slate-700 truncate max-w-[120px] font-mono tracking-tighter">{node.data.clientId ? `********${node.data.clientId.slice(-8)}` : 'No Connection'}</span>
                          </div>
                        </div>
                      </div>
                    )}

                    {node.type === 'hybrid_mail_filter' && (
                      <div className="space-y-4">
                        <div className="p-4 bg-orange-50 rounded-2xl border border-orange-100">
                           <div className="flex flex-col gap-4">
                             <span className="text-[9px] font-black text-orange-400 uppercase tracking-widest">{node.data.mode || 'Rule-based only'}</span>
                             {node.data.mode === 'Prompt-based only' ? (
                               <span className="text-[10px] font-bold text-orange-700">Threshold {node.data.confidenceThreshold || 80}%</span>
                             ) : (
                               <span className="text-[10px] font-bold text-orange-700">
                                 {((node.data.senderAllowlist?.length || 0) + (node.data.subjectIncludes?.length || 0) + (node.data.subjectExcludes?.length || 0) + (node.data.bodyKeywords?.length || 0))} Keywords
                               </span>
                             )}
                           </div>
                        </div>
                      </div>
                    )}

                    {node.type === 'attachment_filter' && (
                      <div className="space-y-4">
                        <div className="p-4 bg-white/50 rounded-2xl shadow-sm border border-slate-100">
                           <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-4 px-1">{language === 'TH' ? 'สรุปการกรอง' : 'Filter Summary'}</p>
                           <div className="space-y-4">
                             {((node.data.extensionFilterMode || 'include') === 'include' ? (node.data.includeExtensions?.length > 0) : (node.data.excludeExtensions?.length > 0)) && (
                               <div className="space-y-4">
                                 <p className="text-[9px] font-black text-purple-500 uppercase tracking-widest px-1">
                                   {language === 'TH' ? 'ไฟล์' : 'FILE'} 
                                   <span className="ml-1 opacity-60 text-[6px]">
                                     ({(node.data.extensionFilterMode || 'include') === 'include' ? (language === 'TH' ? 'รวม' : 'INCLUDE') : (language === 'TH' ? 'ยกเว้น' : 'EXCLUDE')})
                                   </span>
                                 </p>
                                 <div className="flex flex-wrap gap-4">
                                   {(node.data.extensionFilterMode || 'include') === 'include' ? (
                                     node.data.includeExtensions?.map((ext: string) => (
                                       <span key={ext} className="text-[8px] font-black bg-emerald-50 text-emerald-600 px-2 py-1 rounded-lg border border-emerald-100 uppercase">{ext}</span>
                                     ))
                                   ) : (
                                     node.data.excludeExtensions?.map((ext: string) => (
                                       <span key={ext} className="text-[8px] font-black bg-rose-50 text-rose-600 px-2 py-1 rounded-lg border border-rose-100 uppercase">{ext}</span>
                                     ))
                                   )}
                                 </div>
                               </div>
                             )}
                             {(node.data.includeKeywords?.length > 0 || node.data.excludeKeywords?.length > 0) && (
                               <div className="space-y-4">
                                 <p className="text-[9px] font-black text-blue-500 uppercase tracking-widest px-1">{language === 'TH' ? 'ชื่อไฟล์' : 'FILE NAME'}</p>
                                 <div className="flex flex-wrap gap-4">
                                   {node.data.includeKeywords?.map((kw: string) => (
                                     <span key={kw} className="text-[8px] font-black bg-blue-50 text-blue-600 px-2 py-1 rounded-lg border border-blue-100 uppercase">{kw}</span>
                                   ))}
                                   {node.data.excludeKeywords?.map((kw: string) => (
                                     <span key={kw} className="text-[8px] font-black bg-slate-50 text-slate-500 px-2 py-1 rounded-lg border border-slate-100 uppercase opacity-70">{kw}</span>
                                   ))}
                                 </div>
                               </div>
                             )}
                             {!node.data.includeExtensions?.length && !node.data.excludeExtensions?.length && !node.data.includeKeywords?.length && !node.data.excludeKeywords?.length && (
                               <p className="text-[10px] font-bold text-slate-400 italic px-1">{language === 'TH' ? 'รับทุกไฟล์ (ไม่มีการกรอง)' : 'Accept all files (no filtering)'}</p>
                             )}
                           </div>
                        </div>
                      </div>
                    )}

                    {node.type === 'group_of_file' && (
                      <div className="space-y-4">
                        <div className="flex items-center justify-between px-1">
                          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{node.data.docTypesToDetect?.length || 0} doc types</span>
                          <span className="text-[9px] font-bold text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded-md border border-indigo-100">Auto-accept ≥ {node.data.confidenceThreshold || 80}%</span>
                        </div>
                        
                        <div className="flex flex-col gap-1.5 mt-3 border-t border-slate-100 pt-3">
                          <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1 px-1">Outputs</span>
                          {(node.data.docTypesToDetect || []).map((typeId: string) => {
                            const typeDef = currentDocTypes.find(d => d.id === typeId);
                            return (
                             <div key={typeId} className="flex items-center justify-between text-[10px] font-bold text-slate-700 bg-white px-2.5 py-2 rounded-lg border border-slate-200 shadow-sm relative overflow-visible">
                               <div className="absolute left-0 top-0 bottom-0 w-1 bg-blue-400"></div>
                               <span className="ml-1 uppercase tracking-tight">{typeDef?.name || typeId}</span>
                               <span className="w-1.5 h-1.5 rounded-full bg-blue-500 shadow-[0_0_5px_rgba(59,130,246,0.5)]"></span>
                             </div>
                            );
                          })}
                          
                          {/* Pending Review Port (Always present) */}
                          <div className="flex items-center justify-between text-[10px] font-bold text-amber-700 bg-amber-50 px-2.5 py-2 rounded-lg border border-amber-200 mt-1 relative overflow-visible">
                             <div className="absolute left-0 top-0 bottom-0 w-1 bg-amber-400"></div>
                             <span className="ml-1 uppercase tracking-tight text-amber-600">Pending Review</span>
                             <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shadow-[0_0_5px_rgba(245,158,11,0.5)]"></span>
                          </div>
                          
                          {/* Discard Port (Always present) */}
                          <div className="flex items-center justify-between text-[10px] font-bold text-slate-500 bg-slate-50 px-2.5 py-2 rounded-lg border border-dashed border-slate-200 relative overflow-visible">
                             <div className="absolute left-0 top-0 bottom-0 w-1 bg-slate-300"></div>
                             <span className="ml-1 uppercase tracking-tight">Discard</span>
                             <span className="w-1.5 h-1.5 rounded-full bg-slate-400"></span>
                          </div>
                        </div>
                      </div>
                    )}

                    {node.type === 'create_job' && (
                      <div className="space-y-4">
                        <div className="p-4 bg-slate-50/80 rounded-2xl border border-slate-100 shadow-sm space-y-3">
                          <div className="flex items-center justify-between">
                            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">TYPE NAME</span>
                            <span className="text-[10px] font-bold text-slate-700 truncate max-w-[120px]">{node.data.jobTypeName || '-'}</span>
                          </div>

                          <div className="flex items-center justify-between pt-1 border-t border-slate-100">
                            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">FORMAT</span>
                            <span className="text-[10px] font-bold text-slate-700 truncate max-w-[120px] font-mono uppercase">{node.data.namingFormat || '-'}</span>
                          </div>
                          
                          <div className="flex flex-col gap-1.5 pt-1 border-t border-slate-100">
                            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">MATCH KEYS</span>
                            <div className="flex flex-wrap gap-1">
                              {(node.data.matchKeys || []).map((k: string, i: number) => (
                                <span key={i} className="px-1.5 py-0.5 bg-slate-200 text-slate-600 rounded text-[8px] font-bold uppercase tracking-tight">{k}</span>
                              ))}
                              {(!node.data.matchKeys || node.data.matchKeys.length === 0) && <span className="text-[10px] font-bold text-slate-400">-</span>}
                            </div>
                          </div>
                          
                          <div className="flex items-center justify-between pt-2 border-t border-slate-200">
                             <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">WAIT FOR</span>
                             <span className="text-[10px] font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-lg border border-amber-100">
                               {node.data.requiredDocTypes?.filter((t: any) => t.isRequired).length || 0} Required
                             </span>
                          </div>
                        </div>
                      </div>
                    )}

                    {node.type === 'assign_job' && (
                      <>
                        <div className="space-y-1">
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Assignee Group</p>
                          <select 
                            value={node.data.assignee || 'Team Alpha'}
                            onChange={(e) => updateNodeData(node.id, { assignee: e.target.value })}
                            onMouseDown={(e) => e.stopPropagation()}
                            className="w-full bg-slate-50 p-4 rounded-2xl text-sm font-bold text-slate-700 border border-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                          >
                            <option value="Team Alpha">Team Alpha</option>
                            <option value="CS Department">CS Department</option>
                            <option value="Customs Broker">Customs Broker</option>
                          </select>
                        </div>
                        <div className="space-y-1 mt-4">
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Priority</p>
                          <div className="flex gap-2">
                             {['Low', 'Normal', 'High'].map(p => (
                               <button 
                                 key={p}
                                 onClick={(e) => {
                                   e.stopPropagation();
                                   updateNodeData(node.id, { priority: p });
                                 }}
                                 className={`flex-1 py-4 rounded-[4px] text-[10px] font-black uppercase border-2 transition-all ${node.data.priority === p ? 'border-indigo-500 bg-indigo-50 text-indigo-700' : 'border-slate-100 bg-slate-50 text-slate-400'}`}
                               >
                                 {p}
                               </button>
                             ))}
                          </div>
                        </div>
                      </>
                    )}

                    {node.type === 'send_to' && (
                      <>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1 mb-4">Destinations</p>
                        <div className="grid grid-cols-2 gap-4">
                          {[
                            { id: 'Drive', icon: <HardDrive size={14} /> },
                            { id: 'e-mail', icon: <Mail size={14} /> },
                            { id: 'Share', icon: <Share2 size={14} /> },
                            { id: 'Portal', icon: <FileOutput size={14} /> }
                          ].map((dest) => (
                            <div 
                              key={dest.id}
                              onClick={(e) => {
                                e.stopPropagation();
                                const current = node.data.destinations || [];
                                const next = current.includes(dest.id) 
                                  ? current.filter((d: string) => d !== dest.id) 
                                  : [...current, dest.id];
                                updateNodeData(node.id, { destinations: next });
                              }}
                              className={`flex items-center gap-4 px-3 py-4 rounded-2xl border-2 transition-all cursor-pointer
                                ${node.data.destinations?.includes(dest.id) ? 'border-emerald-500 bg-emerald-50 text-emerald-700 shadow-sm shadow-emerald-100' : 'border-slate-50 bg-slate-50 text-slate-300'}
                              `}
                            >
                              {dest.icon}
                              <span className="text-[9px] font-black uppercase tracking-tight">{dest.id}</span>
                            </div>
                          ))}
                        </div>
                      </>
                    )}

                    {node.type === 'storage' && (
                      <div className="space-y-3">
                        <div className="p-3 bg-slate-50/80 rounded-[8px] border border-slate-100 space-y-2">
                          <div className="flex flex-col gap-1">
                            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none">DIRECTORY PATH</span>
                            <span className="text-[10px] font-bold text-slate-700 truncate font-mono bg-white border border-slate-200/50 px-2 py-1 rounded-[4px] mt-0.5">
                              {node.data.directoryPath || '/imports/{year}/{month}'}
                            </span>
                          </div>
                          
                          <div className="flex flex-col gap-1 pt-1 border-t border-slate-100/50">
                            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none">DIRECTORY NAMING</span>
                            <span className="text-[10px] font-bold text-slate-700 truncate font-mono bg-white border border-slate-200/50 px-2 py-1 rounded-[4px] mt-0.5">
                              {node.data.directoryNaming || '{job#}-{job_type}'}
                            </span>
                          </div>

                          <div className="flex items-center justify-between pt-1.5 border-t border-slate-100/50">
                            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">FILE NAMING</span>
                            <span className={`text-[9px] font-black uppercase tracking-tight px-2 py-0.5 rounded-[4px] border ${
                              node.data.fileNamingMode === 'custom' 
                                ? 'bg-indigo-50 border-indigo-100 text-indigo-600' 
                                : 'bg-emerald-50 border-emerald-100 text-emerald-600'
                            }`}>
                              {node.data.fileNamingMode === 'custom' ? 'Custom' : 'Original'}
                            </span>
                          </div>

                          {node.data.fileNamingMode === 'custom' && (
                            <div className="flex flex-col gap-1 pt-1 border-t border-slate-100">
                              <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none">TEMPLATE</span>
                              <span className="text-[10px] font-bold text-slate-700 truncate font-mono bg-white border border-slate-200/50 px-2 py-1 rounded-[4px] mt-0.5">
                                {node.data.fileNamingTemplate || '{job#}_{doc_type}_{date}'}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {node.type === 'extract' && (
                      <div className="space-y-3">
                        <div className="p-3 bg-slate-50/80 rounded-[8px] border border-slate-100 space-y-2">
                          <div className="flex flex-col gap-1">
                            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none">SCHEMA</span>
                            <span className="text-[10px] font-semibold text-slate-700 truncate font-sans bg-white border border-slate-200/50 px-2 py-1 rounded-[4px] mt-0.5" title={getSchemaNameById(node.data.schemaId)}>
                              {getSchemaNameById(node.data.schemaId) || (language === 'TH' ? 'ไม่ได้เลือก' : 'Not Selected')}
                            </span>
                          </div>

                          <div className="flex items-center justify-between pt-1.5 border-t border-slate-100/50">
                            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none">THRESHOLD</span>
                            <span className="text-[10px] font-bold text-[#1f5df9] font-mono bg-blue-50/60 border border-blue-100 px-2 py-0.5 rounded-[4px]">
                              {node.data.confidenceThreshold !== undefined ? `≥ ${node.data.confidenceThreshold}%` : '≥ 80%'}
                            </span>
                          </div>

                          <div className="flex items-center justify-between pt-1.5 border-t border-slate-100/50">
                            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none font-sans">ALLOW REVIEW</span>
                            <span className={`text-[9px] font-black uppercase tracking-tight px-2 py-0.5 rounded-[4px] border ${
                              node.data.allowReview !== false 
                                ? 'bg-emerald-50 border-emerald-100 text-emerald-600' 
                                : 'bg-rose-50 border-rose-100 text-rose-600'
                            }`}>
                              {node.data.allowReview !== false ? (language === 'TH' ? 'ON' : 'ON') : (language === 'TH' ? 'OFF' : 'OFF')}
                            </span>
                          </div>
                        </div>
                      </div>
                    )}

                    {node.type === 'compare' && (
                      <div className="space-y-3">
                        <div className="p-3 bg-slate-50/80 rounded-[8px] border border-slate-100 space-y-2">
                          <div className="flex flex-col gap-1">
                            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none">COMPARE RULE</span>
                            <span className="text-[10px] font-semibold text-slate-700 truncate font-sans bg-white border border-slate-200/50 px-2 py-1 rounded-[4px] mt-0.5" title={node.data.ruleName}>
                              {node.data.ruleName || (language === 'TH' ? 'ไม่ได้เลือก' : 'Not Selected')}
                            </span>
                          </div>

                          <div className="flex items-center justify-between pt-1.5 border-t border-slate-100/50">
                            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none font-sans">ALLOW REVIEW</span>
                            <span className={`text-[9px] font-black uppercase tracking-tight px-2 py-0.5 rounded-[4px] border ${
                              node.data.allowReview !== false 
                                ? 'bg-emerald-50 border-emerald-100 text-emerald-600' 
                                : 'bg-rose-50 border-rose-100 text-rose-600'
                            }`}>
                              {node.data.allowReview !== false ? (language === 'TH' ? 'ON' : 'ON') : (language === 'TH' ? 'OFF' : 'OFF')}
                            </span>
                          </div>
                        </div>
                      </div>
                    )}
                      </>
                    )}
                  </div>

                  {/* Add Handle (Left - Input Port) */}
                  <div 
                    className="absolute top-1/2 -left-4 -translate-y-1/2 z-30 cursor-crosshair group/port"
                    onMouseDown={(e) => {
                      e.stopPropagation();
                      setConnectingFromId(node.id);
                    }}
                  >
                    <div className={`w-4 h-4 rounded-full border-2 bg-white transition-all group-hover/port:scale-125 group-hover/port:border-blue-400 ${connectingFromId && connectingFromId !== node.id ? 'border-blue-500 scale-150 bg-blue-50' : 'border-slate-200'}`}></div>
                  </div>

                  {/* Right Connection Port (Centered) */}
                  <div 
                    className="absolute top-1/2 -right-4 -translate-y-1/2 z-30 cursor-crosshair group/port"
                    onMouseDown={(e) => {
                      e.stopPropagation();
                      setConnectingFromId(node.id);
                    }}
                  >
                    <div className="w-4 h-4 rounded-full border-2 border-slate-200 bg-white transition-all group-hover/port:scale-125 group-hover/port:border-blue-400"></div>
                  </div>

                  {/* Dynamic Output Ports for Doc Classifier - CLEANUP REMOVED */}



                  {/* Floating Add Node Button (Right side, only if selected) */}
                  <div 
                    className={`absolute top-1/2 left-[calc(100%+1.5rem)] -translate-y-1/2 z-30 transition-all duration-300
                      ${selectedNodeId === node.id ? 'opacity-100 scale-100' : 'opacity-0 scale-75 pointer-events-none'}`}
                  >
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        setAddNodeMenu({ 
                          nodeId: node.id, 
                          x: node.position.x + 280, 
                          y: node.position.y 
                        });
                      }}
                      className="w-10 h-10 rounded-[4px] bg-slate-900 text-white flex items-center justify-center shadow-xl shadow-slate-200 hover:scale-110 active:scale-95 transition-all group/add-btn"
                    >
                      <Plus size={20} strokeWidth={3} className="group-hover/add-btn:rotate-90 transition-transform duration-300" />
                    </button>
                  </div>

                  {/* Delete Handle */}
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteNode(node.id);
                    }}
                    className="absolute -top-3 -right-3 w-8 h-8 rounded-full bg-red-100 text-red-500 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center border-2 border-white shadow-lg hover:bg-red-500 hover:text-white transition-all scale-110 active:scale-95"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
            {/* Add Node Menu Overlay */}
            <AnimatePresence>
              {addNodeMenu && (
                <>
                  <div 
                    className="absolute inset-0 z-[90]" 
                    style={{ 
                      width: '1000vw', 
                      height: '1000vh', 
                      left: '-500vw', 
                      top: '-500vh',
                      cursor: 'default'
                    }}
                    onMouseDown={(e) => {
                      e.stopPropagation();
                      setAddNodeMenu(null);
                    }}
                  />
                  <motion.div 
                    key="add-node-menu"
                    initial={{ opacity: 0, scale: 0.9, x: addNodeMenu.x + 40, y: addNodeMenu.y }}
                    animate={{ opacity: 1, scale: 1, x: addNodeMenu.x + 40, y: addNodeMenu.y }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    drag
                    dragConstraints={containerRef}
                    dragMomentum={false}
                    dragElastic={0}
                    className="absolute z-[100] bg-white rounded-lg shadow-2xl p-4 border border-slate-100 min-w-[220px] cursor-default pointer-events-auto"
                    onMouseDown={(e) => e.stopPropagation()}
                    onWheel={(e) => e.stopPropagation()}
                  >
                  <div className="flex items-center justify-between mb-3 px-2 cursor-grab active:cursor-grabbing">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Select Node Type</span>
                    <button onClick={() => setAddNodeMenu(null)} className="text-slate-300 hover:text-slate-500 transition-colors">
                      <X size={14} />
                    </button>
                  </div>
                  <div className="flex flex-col gap-2 max-h-[320px] overflow-y-auto pr-1 scrollbar-hide py-1">
                    {toolbarCategories.map((cat, catIdx) => (
                      <div key={catIdx} className="flex flex-col gap-1">
                        <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-2 mb-0.5">{cat.name}</div>
                        {cat.items.map((option, idx) => (
                          <button 
                            key={idx}
                            onClick={() => addNodeAfter(addNodeMenu.nodeId, option.type)}
                            className="flex items-center gap-3 w-full p-2.5 rounded-[4px] hover:bg-slate-50 transition-all group"
                          >
                            <div className={`w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center ${option.color} group-hover:bg-slate-900 group-hover:text-white transition-all`}>
                              {option.icon(16)}
                            </div>
                            <span className="text-xs font-black text-slate-700 uppercase tracking-tight">{renderNodeTitle(option.type)}</span>
                          </button>
                        ))}
                      </div>
                    ))}
                  </div>
                </motion.div>
                </>
              )}
            </AnimatePresence>

          </div>

          {/* Standalone Node Menu Overlay (Screen Space) */}
          <AnimatePresence>
            {showCanvasNodeMenu && (
              <>
                <div 
                  className="absolute inset-0 z-[90]" 
                  onMouseDown={(e) => {
                    e.stopPropagation();
                    setShowCanvasNodeMenu(null);
                  }}
                />
                <motion.div 
                  key="canvas-node-menu"
                  initial={{ 
                    opacity: 0, 
                    scale: 0.95,
                    x: showCanvasNodeMenu.x !== undefined ? 10 : 0,
                    y: 10
                  }}
                  animate={{ 
                    opacity: 1, 
                    scale: 1, 
                    x: 0,
                    y: 0
                  }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  drag
                  dragConstraints={containerRef}
                  dragMomentum={false}
                  dragElastic={0.1}
                  layout
                  className="absolute z-[100] bg-white/95 backdrop-blur-xl rounded-2xl shadow-[0_20px_50px_-12px_rgba(0,0,0,0.15)] p-4 border border-slate-200/60 w-52 cursor-default pointer-events-auto flex flex-col"
                  style={{ 
                    left: showCanvasNodeMenu.x, 
                    top: showCanvasNodeMenu.y,
                    right: showCanvasNodeMenu.right,
                    bottom: showCanvasNodeMenu.bottom,
                    maxHeight: 'calc(100% - 48px)', // 24px top/bottom spacing
                    position: 'absolute' 
                  }}
                  onMouseDown={(e) => e.stopPropagation()}
                  onWheel={(e) => e.stopPropagation()}
                >
                <div className="flex items-center justify-between mb-2 px-1 shrink-0 cursor-grab active:cursor-grabbing group/handle">
                  <div className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.4)]"></div>
                    <span className="text-[9px] font-black text-slate-800 uppercase tracking-[0.15em]">{language === 'TH' ? 'สร้างโหนดใหม่' : 'Create New Node'}</span>
                  </div>
                  <button 
                    onClick={() => setShowCanvasNodeMenu(null)} 
                    className="w-5 h-5 flex items-center justify-center rounded-[4px] hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-all"
                  >
                    <X size={10} />
                  </button>
                </div>
                
                <div className="flex flex-col gap-2 overflow-y-auto pr-1 scrollbar-hide custom-scrollbar max-h-[300px]">
                  {toolbarCategories.map((cat, catIdx) => (
                    <div key={catIdx} className="flex flex-col gap-0.5">
                      <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-2 py-0.5">{cat.name}</div>
                      {cat.items.map((option, idx) => (
                        <motion.button 
                          key={idx}
                          layout
                          initial={{ opacity: 0, y: 5 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: (catIdx * 2 + idx) * 0.02 }}
                          draggable
                          onDragStart={(e) => handleToolbarDragStart(e, option.type)}
                          onClick={() => {
                            let canvasX = 0;
                            let canvasY = 0;
                            
                            if (showCanvasNodeMenu.x !== undefined && showCanvasNodeMenu.y !== undefined) {
                              canvasX = (showCanvasNodeMenu.x - pan.x) / zoom;
                              canvasY = (showCanvasNodeMenu.y - pan.y) / zoom;
                            } else if (containerRef.current) {
                              const rect = containerRef.current.getBoundingClientRect();
                              // Calculate base screen coordinates from right/bottom
                              const screenX = showCanvasNodeMenu.right !== undefined ? rect.width - showCanvasNodeMenu.right - 208 : 
                                             (showCanvasNodeMenu.x !== undefined ? showCanvasNodeMenu.x : rect.width / 2 - 104);
                              const screenY = showCanvasNodeMenu.bottom !== undefined ? rect.height - showCanvasNodeMenu.bottom - 200 :
                                             (showCanvasNodeMenu.y !== undefined ? showCanvasNodeMenu.y : rect.height / 2 - 150);
                              canvasX = (screenX - pan.x) / zoom;
                              canvasY = (screenY - pan.y) / zoom;
                            }
                            
                            addStandaloneNode(option.type, { x: canvasX, y: canvasY });
                            setShowCanvasNodeMenu(null);
                          }}
                          className="flex items-center gap-2.5 w-full p-2 rounded-2xl hover:bg-slate-900 transition-all group relative overflow-hidden shrink-0"
                        >
                          <div className={`w-6 h-6 rounded-2xl bg-slate-50 flex items-center justify-center ${option.color} group-hover:bg-white/10 group-hover:text-white transition-all`}>
                            {option.icon(12)}
                          </div>
                          <div className="flex flex-col items-start min-w-0">
                            <span className="text-[10px] font-black text-slate-700 uppercase tracking-tight group-hover:text-white transition-colors truncate w-full text-left">
                              {renderNodeTitle(option.type)}
                            </span>
                          </div>
                        </motion.button>
                      ))}
                    </div>
                  ))}
                </div>
              </motion.div>
              </>
            )}
          </AnimatePresence>

          {/* Floating Zoom Controls (Top Right) */}
          <div className="absolute top-6 right-6 flex items-center bg-white/90 backdrop-blur-sm border border-slate-200 rounded-full px-2 py-1 shadow-lg z-30">
            <button onClick={handleZoomOut} className="p-2 hover:bg-slate-100 rounded-[4px] text-slate-500 transition-all">
              <ZoomOut size={16} />
            </button>
            <div className="px-3 text-[11px] font-black text-slate-600 min-w-[45px] text-center">
              {Math.round(zoom * 100)}%
            </div>
            <button onClick={handleZoomIn} className="p-2 hover:bg-slate-100 rounded-[4px] text-slate-500 transition-all">
              <ZoomIn size={16} />
            </button>
            <div className="w-px h-4 bg-slate-200 mx-1.5"></div>
            <button onClick={handleFitView} className="p-2 hover:bg-slate-100 rounded-[4px] text-slate-500 transition-all" title="Fit Content">
              <Maximize size={16} />
            </button>
          </div>

          {/* Floating Sidebar Toolbar (Left) */}
          <div className="absolute left-6 top-1/2 -translate-y-1/2 z-30 pointer-events-auto">
            <div 
              onMouseDown={(e) => e.stopPropagation()}
              className="flex flex-col gap-1 p-1 bg-white/90 backdrop-blur-sm rounded-lg border border-slate-200 shadow-xl transition-all duration-300 origin-left"
              style={{ 
                transform: windowHeight < 500 ? `scale(${Math.max(0.6, windowHeight / 550)})` : 'none'
              }}
            >
               {toolbarCategories.map((cat, catIdx) => (
                 <div key={cat.name} className="flex flex-col items-center gap-1 group/category relative">
                   {catIdx > 0 && <div className="w-4 h-px bg-slate-200 my-0.5" />}
                   {cat.items.map((item, idx) => (
                     <div 
                       key={idx}
                       draggable
                       onDragStart={(e) => handleToolbarDragStart(e, item.type)}
                       onClick={() => {
                         let canvasX = 0;
                         let canvasY = 0;
                         
                         if (containerRef.current) {
                           const rect = containerRef.current.getBoundingClientRect();
                           const screenX = rect.width / 2 - 104;
                           const screenY = rect.height / 2 - 150;
                           const offset = nodes.length * 20;
                           canvasX = (screenX - pan.x + offset) / zoom;
                           canvasY = (screenY - pan.y + offset) / zoom;
                         }
                         addStandaloneNode(item.type, { x: canvasX, y: canvasY });
                       }}
                       className="w-9 h-9 rounded-lg bg-white flex items-center justify-center cursor-pointer active:cursor-grabbing border-2 border-transparent hover:border-slate-100 hover:bg-slate-50 transition-all group relative"
                       title=""
                     >
                       <div className={`group-hover:scale-110 transition-transform ${item.color}`}>
                        {item.icon(16)}
                       </div>

                       {/* Custom Tooltip */}
                       <div className="absolute left-[calc(100%+12px)] top-1/2 -translate-y-1/2 px-3 py-2 bg-slate-900 text-white text-[10px] font-black rounded-lg whitespace-nowrap opacity-0 scale-90 pointer-events-none group-hover:opacity-100 group-hover:scale-100 transition-all z-50 shadow-xl flex flex-col items-start gap-0.5 min-w-max">
                          <div className="absolute -left-1 top-1/2 -translate-y-1/2 w-2 h-2 bg-slate-900 rotate-45"></div>
                          <span className="uppercase tracking-widest">{renderNodeTitle(item.type)}</span>
                          <span className="text-[7px] text-slate-400 uppercase tracking-widest">{cat.name}</span>
                       </div>
                     </div>
                   ))}
                 </div>
               ))}
            </div>
          </div>

          {/* Empty State UI */}
          {nodes.length === 0 && !showCanvasNodeMenu && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="flex flex-col items-center gap-4 bg-white/50 backdrop-blur-md p-10 rounded-2xl border border-white shadow-2xl animate-in fade-in zoom-in duration-500">
                <div className="w-20 h-20 rounded-3xl bg-blue-50 text-blue-600 flex items-center justify-center shadow-inner mb-2">
                  <Layers size={40} />
                </div>
                <div className="text-center">
                  <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight">
                    {language === 'TH' ? 'ยังไม่มีขั้นตอนการทำงาน' : 'Ready for your first node?'}
                  </h3>
                  <p className="text-slate-500 text-sm max-w-[240px] mt-1 font-medium leading-tight">
                    {language === 'TH' ? 'เริ่มต้นสร้างเวิร์กโฟลว์ของคุณโดยการเพิ่มโหนดแรกที่นี่' : 'Start building your automated data flow by adding a node.'}
                  </p>
                </div>
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    if (containerRef.current) {
                      const rect = containerRef.current.getBoundingClientRect();
                      // Center in screen space (box is 208px wide)
                      setShowCanvasNodeMenu({ 
                        x: rect.width / 2 - 104, 
                        y: Math.max(24, rect.height / 2 - 200) 
                      });
                    }
                  }}
                  className="pointer-events-auto flex items-center gap-2 px-8 py-3 bg-blue-600 text-white rounded-[4px] font-black text-sm hover:bg-blue-700 hover:scale-105 active:scale-95 transition-all shadow-xl shadow-blue-200 mt-2"
                >
                  <Plus size={20} strokeWidth={3} />
                  {language === 'TH' ? 'เพิ่มโหนดแรก' : 'Add First Node'}
                </button>
              </div>
            </div>
          )}

          <div className="absolute bottom-6 right-6 flex flex-col gap-3">
             <button 
              onClick={() => {
                setShowCanvasNodeMenu(prev => (prev && prev.right === 104) ? null : { 
                  right: 104, // Aligned 24px left of the Add Button (24px button margin + 56px button + 24px spacing)
                  bottom: 24 
                });
              }}
              title="Add Node"
              className="w-14 h-14 rounded-[4px] bg-slate-900 text-white flex items-center justify-center shadow-xl hover:scale-110 active:scale-95 transition-all hover:bg-slate-800 group"
            >
              <Plus size={24} strokeWidth={3} className="group-hover:rotate-90 transition-transform duration-300" />
            </button>
          </div>
        </div>
      </div>

      {/* Configuration Drawer */}
      {drawerNodeId && (
        (() => {
          const node = nodes.find(n => n.id === drawerNodeId);
          if (!node) return null;

          return (
            <div 
              className="fixed inset-y-0 right-0 w-[450px] bg-white shadow-2xl z-[1000] border-l border-slate-200 flex flex-col animate-in slide-in-from-right duration-300"
              onMouseDown={(e) => e.stopPropagation()}
              onWheel={(e) => e.stopPropagation()}
            >
              {/* Drawer Header */}
              <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-2xl bg-white shadow-sm flex items-center justify-center text-blue-600 border border-blue-50">
                    {renderNodeIcon(node.type)}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <h2 className="text-lg font-black text-slate-800 uppercase tracking-tight leading-none">{renderNodeTitle(node.type)}</h2>
                    </div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1.5">CONFIGURATION SETTINGS</p>
                  </div>
                </div>
                <button 
                  onClick={() => setDrawerNodeId(null)}
                  className="p-2 hover:bg-slate-200 rounded-[4px] text-slate-400 hover:text-slate-600 transition-all"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Drawer Body - Scrollable */}
              <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
                {/* Mail Agent Specific Config */}
                {node.type === 'get_file' && (
                  <div className="space-y-8">
                    {/* Section: Basic Info */}
                    <div className="space-y-4">
                      <div className="flex items-center gap-2 mb-2">
                        <FileText size={16} className="text-blue-500" />
                        <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest">BASIC INFORMATION</h3>
                      </div>
                      
                      <div className="space-y-1">
                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-1 leading-none mb-1 block">
                          NODE NAME <span className="text-rose-500 font-bold ml-1">*</span> — <span className="text-slate-300 italic">ชื่อที่ใช้อ้างอิง</span>
                        </label>
                        <input 
                          type="text"
                          value={node.data.nodeName || ''}
                          onChange={(e) => updateNodeData(node.id, { nodeName: e.target.value })}
                          className={`w-full bg-slate-50 p-2.5 rounded-lg text-xs font-bold text-slate-700 border transition-all focus:outline-none ${!node.data.nodeName ? 'border-amber-200 bg-amber-50/30' : 'border-slate-100 focus:ring-2 focus:ring-blue-500/20'}`}
                          placeholder="e.g. Receive Invoice Email"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-1 leading-none mb-1 block">
                          PROTOCOL <span className="text-rose-500 font-bold ml-1">*</span>
                        </label>
                        <select 
                          value={node.data.protocol || 'OAuth2 Outlook'}
                          onChange={(e) => updateNodeData(node.id, { protocol: e.target.value })}
                          className="w-full bg-slate-50 p-2.5 rounded-lg text-xs font-bold text-slate-700 border border-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                        >
                          <option value="OAuth2 Outlook">OAuth2 Outlook</option>
                          <option value="IMAP">IMAP</option>
                          <option value="POP3">POP3</option>
                        </select>
                      </div>
                    </div>

                    {/* Section: Connection Setup */}
                    <div className="space-y-4">
                      <div className="flex items-center gap-2 mb-2">
                        <Terminal size={16} className="text-blue-500" />
                        <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest">CONNECTION SETUP <span className="text-rose-500 font-bold ml-1">*</span></h3>
                      </div>
                      
                      <div className="space-y-3">
                        <div className="space-y-1">
                          <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-1 leading-none mb-1 block">เทนแนนท์ ไอดี (TENANT ID) <span className="text-rose-500 font-bold ml-1">*</span></label>
                        <input 
                          type="text"
                          value={node.data.tenantId || ''}
                          onChange={(e) => updateNodeData(node.id, { tenantId: e.target.value })}
                          className={`w-full bg-slate-50 p-2.5 rounded-lg text-xs font-bold text-slate-700 border transition-all focus:outline-none ${!node.data.tenantId ? 'border-amber-200 bg-amber-50/30' : 'border-slate-100 focus:ring-2 focus:ring-blue-500/20'}`}
                          placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                        />
                        </div>

                        <div className="space-y-1">
                          <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-1 leading-none mb-1 block">ไคลเอนต์ ไอดี (CLIENT ID) <span className="text-rose-500 font-bold ml-1">*</span></label>
                        <input 
                          type="text"
                          value={node.data.clientId || ''}
                          onChange={(e) => updateNodeData(node.id, { clientId: e.target.value })}
                          className={`w-full bg-slate-50 p-2.5 rounded-lg text-xs font-bold text-slate-700 border transition-all focus:outline-none ${!node.data.clientId ? 'border-amber-200 bg-amber-50/30' : 'border-slate-100 focus:ring-2 focus:ring-blue-500/20'}`}
                          placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                        />
                        </div>

                        <div className="space-y-1">
                          <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-1 leading-none mb-1 block">ไคลเอนต์ ซีเคร็ต (CLIENT SECRET) <span className="text-rose-500 font-bold ml-1">*</span></label>
                        <input 
                          type="password"
                          value={node.data.clientSecret || ''}
                          onChange={(e) => updateNodeData(node.id, { clientSecret: e.target.value })}
                          className={`w-full bg-slate-50 p-2.5 rounded-lg text-xs font-bold text-slate-700 border transition-all focus:outline-none ${!node.data.clientSecret ? 'border-amber-200 bg-amber-50/30' : 'border-slate-100 focus:ring-2 focus:ring-blue-500/20'}`}
                          placeholder="••••••••••••••••"
                        />
                        </div>

                        <button 
                          onClick={handleTestConnection}
                          disabled={isTestingConnection}
                          className={`w-full py-2.5 rounded-[4px] text-[10px] font-black uppercase transition-all mt-2 flex items-center justify-center gap-2 ${
                            isTestingConnection 
                              ? 'bg-slate-100 text-slate-400 cursor-not-allowed' 
                              : testConnectionResult === 'success'
                                ? 'bg-emerald-50 text-emerald-600 border border-emerald-100 hover:bg-emerald-100'
                                : testConnectionResult === 'error'
                                  ? 'bg-rose-50 text-rose-600 border border-rose-100 hover:bg-rose-100'
                                  : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
                          }`}
                        >
                          {isTestingConnection ? (
                            <Loader2 size={14} className="animate-spin" />
                          ) : testConnectionResult === 'success' ? (
                            <CheckCircle2 size={14} />
                          ) : testConnectionResult === 'error' ? (
                            <AlertCircle size={14} />
                          ) : (
                            <ShieldCheck size={14} />
                          )}
                          {isTestingConnection 
                            ? (language === 'TH' ? 'กำลังทดสอบ...' : 'Testing...') 
                            : testConnectionResult === 'success'
                              ? t.connectionSuccess
                              : testConnectionResult === 'error'
                                ? t.connectionFailed
                                : t.testConnection}
                        </button>
                      </div>
                    </div>

                    {/* Section: Folder Setting */}
                    <div className="space-y-4">
                      <div className="flex items-center gap-2 mb-2">
                        <Folder size={16} className="text-emerald-500" />
                        <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest">{language === 'TH' ? 'ตั้งค่าโฟลเดอร์' : 'FOLDER SETTING'}</h3>
                      </div>

                      <div className="space-y-1">
                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-1 leading-none mb-1 block">FOLDER <span className="text-rose-500 font-bold ml-1">*</span></label>
                        <FolderHierarchyEditor 
                          value={node.data.folder || 'INBOX'} 
                          onChange={(val) => updateNodeData(node.id, { folder: val })} 
                          language={language}
                        />

                        {/* Folder Preview */}
                        <div className="mt-4 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none mb-3">FOLDER PREVIEW</p>
                          <div className="space-y-1 content-center">
                            {(node.data.folder || 'INBOX').split('/').map((folder: string, idx: number) => (
                              <div key={idx} className="flex items-center gap-2" style={{ marginLeft: `${idx * 16}px` }}>
                                <div className="w-1.5 h-1.5 rounded-full bg-blue-400/60 shadow-[0_0_8px_rgba(96,165,250,0.4)]"></div>
                                <span className={`text-[10px] font-bold ${!folder.trim() ? 'text-amber-400 italic' : 'text-slate-600'} truncate`}>
                                  {folder.trim() || (language === 'TH' ? 'ระบุชื่อ...' : 'Pending name...')}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>

                      <div className="space-y-1">
                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-1 leading-none mb-1 block">POLL INTERVAL <span className="text-rose-500 font-bold ml-1">*</span></label>
                        <select 
                          value={node.data.pollInterval || '1 min'}
                          onChange={(e) => updateNodeData(node.id, { pollInterval: e.target.value })}
                          className="w-full bg-slate-50 p-2.5 rounded-lg text-xs font-bold text-slate-700 border border-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                        >
                          <option value="1 min">1 min</option>
                          <option value="5 min">5 min</option>
                          <option value="15 min">15 min</option>
                          <option value="real-time">real-time</option>
                        </select>
                      </div>

                      <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all ${node.data.markAsRead ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-200 text-slate-400'}`}>
                            <Eye size={16} />
                          </div>
                          <div>
                            <p className="text-[10px] font-black text-slate-800 uppercase tracking-widest leading-none mb-1">MARK AS READ</p>
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none">DEFAULT: ON</p>
                          </div>
                        </div>
                        <button 
                          onClick={() => updateNodeData(node.id, { markAsRead: !node.data.markAsRead })}
                          className={`w-12 h-6 rounded-[4px] transition-all relative ${node.data.markAsRead ? 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.3)]' : 'bg-slate-300'}`}
                        >
                          <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${node.data.markAsRead ? 'left-7' : 'left-1'}`}></div>
                        </button>
                      </div>

                    </div>
                  </div>
                )}

                {node.type === 'hybrid_mail_filter' && (
                  <div className="space-y-8">
                    {/* Node Name Section */}
                    <div className="space-y-1">
                      <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-1 block">
                        <span>{language === 'TH' ? 'ชื่อโหนด (Node Name)' : 'Node Name'}</span>
                        <span className="text-rose-500 font-bold ml-1">*</span>
                      </label>
                      <input 
                        type="text"
                        value={node.data.nodeName || ''}
                        onChange={(e) => updateNodeData(node.id, { nodeName: e.target.value })}
                        placeholder={language === 'TH' ? 'ระบุชื่อโหนด...' : 'Enter node name...'}
                        className="w-full bg-white p-3 text-[10px] font-black text-slate-700 border border-slate-200 rounded-lg focus:outline-none focus:ring-4 focus:ring-purple-500/10 uppercase"
                      />
                      {!node.data.nodeName && (
                        <p className="text-[9px] font-black text-rose-500 uppercase tracking-widest px-1">
                          {language === 'TH' ? 'กรุณาระบุชื่อโหนด' : 'Node name is required'}
                        </p>
                      )}
                    </div>

                    {/* Mode Selector */}
                    <div className="space-y-3">
                      <div className="flex items-center gap-2 mb-2">
                        <Filter size={16} className="text-orange-500" />
                        <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest">FILTER MODE</h3>
                      </div>
                      <div className="flex flex-col gap-2">
                        {['Rule-based only', 'Prompt-based only'].map((mode) => (
                          <div
                            key={mode}
                            onClick={() => updateNodeData(node.id, { mode })}
                            className={`p-3 rounded-2xl border-2 flex items-center gap-3 cursor-pointer transition-all ${
                              node.data.mode === mode
                                ? 'border-orange-500 bg-orange-50/50'
                                : 'border-slate-100 hover:border-slate-200'
                            }`}
                          >
                            <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                              node.data.mode === mode ? 'border-orange-500' : 'border-slate-300'
                            }`}>
                              {node.data.mode === mode && <div className="w-2 h-2 rounded-full bg-orange-500" />}
                            </div>
                            <span className={`text-[10px] font-black uppercase tracking-widest ${
                              node.data.mode === mode ? 'text-orange-600' : 'text-slate-500'
                            }`}>{mode}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {(node.data.mode === 'Rule-based only') && (
                      <div className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-200">
                        <div className="flex items-center gap-2 mb-2">
                          <Terminal size={16} className="text-blue-500" />
                          <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest">Rule-based Configuration</h3>
                        </div>

                        <div className="space-y-1">
                          <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-1 block">Sender Allowlist</label>
                          <TagInput 
                            tags={node.data.senderAllowlist || []} 
                            onChange={(tags) => updateNodeData(node.id, { senderAllowlist: tags })}
                            placeholder="e.g. @domain.com, john@..."
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-1 block">Subject includes keywords</label>
                          <TagInput 
                            tags={node.data.subjectIncludes || []} 
                            onChange={(tags) => updateNodeData(node.id, { subjectIncludes: tags })}
                            placeholder="e.g. invoice, report"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-1 block">Subject exclude keywords</label>
                          <TagInput 
                            tags={node.data.subjectExcludes || []} 
                            onChange={(tags) => updateNodeData(node.id, { subjectExcludes: tags })}
                            placeholder="e.g. spam, newsletter"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-1 block">Body keyword</label>
                          <TagInput 
                            tags={node.data.bodyKeywords || []} 
                            onChange={(tags) => updateNodeData(node.id, { bodyKeywords: tags })}
                            placeholder="e.g. urgent, attached"
                          />
                        </div>
                        <div className="pt-2">
                          <div className="flex items-center justify-between p-3 rounded-2xl border border-slate-100 bg-slate-50">
                            <div>
                              <p className="text-[10px] font-black text-slate-800 uppercase tracking-widest leading-none mb-1">Must have attachment</p>
                              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none">Discard email if no files</p>
                            </div>
                            <button 
                              onClick={() => updateNodeData(node.id, { mustHaveAttachment: !node.data.mustHaveAttachment })}
                              className={`w-10 h-5 rounded-[4px] transition-all relative ${node.data.mustHaveAttachment ? 'bg-orange-500' : 'bg-slate-300'}`}
                            >
                              <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all ${node.data.mustHaveAttachment ? 'left-5' : 'left-0.5'}`}></div>
                            </button>
                          </div>
                        </div>
                      </div>
                    )}

                    {(node.data.mode === 'Prompt-based only') && (
                      <div className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-200">
                        <div className="flex items-center gap-2 mb-2">
                          <Cpu size={16} className="text-purple-500" />
                          <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest">Prompt-based Configuration</h3>
                        </div>

                        <div className="space-y-1">
                          <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-1 block">
                            <span>Prompt Template</span>
                            <span className="text-rose-500 font-bold ml-1">*</span>
                          </label>
                          <textarea 
                            value={node.data.promptTemplate || ''}
                            onChange={(e) => updateNodeData(node.id, { promptTemplate: e.target.value })}
                            placeholder="Check if this email is about an invoice... Available variables: {subject}, {body}, {sender}"
                            className="w-full bg-white p-3 text-[10px] font-bold text-slate-700 border border-slate-200 rounded-lg focus:outline-none focus:ring-4 focus:ring-purple-500/10 min-h-[120px] resize-none"
                          />
                          {!node.data.promptTemplate && (
                            <p className="text-[9px] font-black text-rose-500 uppercase tracking-widest px-1">Prompt is required</p>
                          )}
                        </div>

                        <div className="space-y-1">
                          <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-1 block">Model</label>
                          <div className="relative">
                            <select 
                              value={node.data.model || 'Gemini'}
                              onChange={(e) => updateNodeData(node.id, { model: e.target.value })}
                              className="w-full bg-white p-3 pr-10 text-[10px] font-black text-slate-700 border border-slate-200 rounded-lg focus:outline-none focus:ring-4 focus:ring-purple-500/10 uppercase appearance-none"
                            >
                              <option>Gemini</option>
                              <option>Claude 3</option>
                            </select>
                            <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                          </div>
                        </div>

                        <div className="space-y-1">
                          <div className="flex items-center justify-between px-1 mb-1">
                            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Confidence Threshold</label>
                            <span className="text-[10px] font-black text-purple-600">{node.data.confidenceThreshold || 80}%</span>
                          </div>
                          <input 
                            type="range"
                            min="0"
                            max="100"
                            value={node.data.confidenceThreshold || 80}
                            onChange={(e) => updateNodeData(node.id, { confidenceThreshold: parseInt(e.target.value) })}
                            className="w-full accent-purple-500 h-1.5 bg-slate-200 rounded-full appearance-none cursor-pointer"
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-1 block">Low Confidence Route</label>
                          <div className="grid grid-cols-2 gap-2">
                             {['Human review queue', 'Auto fail'].map(route => (
                               <button 
                                 key={route}
                                 onClick={() => updateNodeData(node.id, { lowConfidenceRoute: route })}
                                 className={`py-3 px-2 rounded-[4px] text-[9px] font-black uppercase tracking-widest border-2 transition-all ${node.data.lowConfidenceRoute === route ? 'border-purple-500 bg-purple-50/50 text-purple-700' : 'border-slate-50 bg-slate-100 text-slate-400 hover:border-slate-200'}`}
                               >
                                 {route}
                               </button>
                             ))}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Attachment Filter Specific Config */}
                {node.type === 'attachment_filter' && (
                  <div className="space-y-8">
                    {/* Node Name Section */}
                    <div className="space-y-1">
                      <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-1 block">
                        <span>{language === 'TH' ? 'ชื่อโหนด (Node Name)' : 'Node Name'}</span>
                        <span className="text-rose-500 font-bold ml-1">*</span>
                      </label>
                        <input 
                          type="text"
                          value={node.data.nodeName || ''}
                          onChange={(e) => updateNodeData(node.id, { nodeName: e.target.value })}
                          placeholder={language === 'TH' ? 'ระบุชื่อโหนด...' : 'Enter node name...'}
                          className="w-full bg-white p-3 text-[10px] font-black text-slate-700 border border-slate-200 rounded-lg focus:outline-none focus:ring-4 focus:ring-purple-500/10 uppercase"
                        />
                      {!node.data.nodeName && (
                        <p className="text-[9px] font-black text-rose-500 uppercase tracking-widest px-1">
                          {language === 'TH' ? 'กรุณาระบุชื่อโหนด' : 'Node name is required'}
                        </p>
                      )}
                    </div>

                    {/* Section: File type */}
                    <div className="space-y-4">
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <div className="flex items-center gap-2">
                          <Paperclip size={16} className="text-purple-500" />
                          <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest">{language === 'TH' ? 'ไฟล์ (FILE)' : 'FILE'}</h3>
                        </div>
                        
                        <div className="flex bg-slate-100 p-0.5 rounded-lg">
                          {[
                            { id: 'include', label: language === 'TH' ? 'รวม' : 'Include', color: 'text-emerald-600' },
                            { id: 'exclude', label: language === 'TH' ? 'ยกเว้น' : 'Exclude', color: 'text-rose-600' }
                          ].map(mode => {
                            const isSelected = (node.data.extensionFilterMode || 'include') === mode.id;
                            return (
                              <button 
                                key={mode.id}
                                onClick={() => updateNodeData(node.id, { extensionFilterMode: mode.id })}
                                className={`px-2 py-1 rounded-[4px] text-[8px] font-black uppercase transition-all ${isSelected ? `bg-white shadow-sm ${mode.color}` : 'text-slate-400 hover:text-slate-500'}`}
                              >
                                {mode.label}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                      
                      {(node.data.extensionFilterMode || 'include') === 'include' ? (
                        <div className="space-y-1">
                          <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-1 leading-none mb-1 block">
                            {language === 'TH' ? 'รวมนามสกุลไฟล์ (Include extensions)' : 'Include extensions'}
                          </label>
                          <TagInput 
                            tags={node.data.includeExtensions || []} 
                            onChange={(tags) => updateNodeData(node.id, { includeExtensions: tags })}
                            placeholder=".pdf, .xls, .jpg"
                          />
                        </div>
                      ) : (
                        <div className="space-y-1">
                          <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-1 leading-none mb-1 block">
                            {language === 'TH' ? 'ยกเว้นนามสกุลไฟล์ (Exclude extensions)' : 'Exclude extensions'}
                          </label>
                          <TagInput 
                            tags={node.data.excludeExtensions || []} 
                            onChange={(tags) => updateNodeData(node.id, { excludeExtensions: tags })}
                            placeholder=".exe, .zip"
                          />
                        </div>
                      )}
                    </div>

                    {/* Section: File name matching */}
                    <div className="space-y-4">
                      <div className="flex items-center gap-2 mb-2">
                        <FileSearch size={16} className="text-blue-500" />
                        <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest">{language === 'TH' ? 'ชื่อไฟล์ (FILE NAME)' : 'FILE NAME'}</h3>
                      </div>
                      
                      <div className="space-y-1">
                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-1 leading-none mb-1 block">
                          {language === 'TH' ? 'รวมคำสำคัญ (Include keywords)' : 'Include keywords'}
                        </label>
                        <TagInput 
                          tags={node.data.includeKeywords || []} 
                          onChange={(tags) => updateNodeData(node.id, { includeKeywords: tags })}
                          placeholder="invoice, BL, packing"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-1 leading-none mb-1 block">
                          {language === 'TH' ? 'ยกเว้นคำสำคัญ (Exclude keywords)' : 'Exclude keywords'}
                        </label>
                        <TagInput 
                          tags={node.data.excludeKeywords || []} 
                          onChange={(tags) => updateNodeData(node.id, { excludeKeywords: tags })}
                          placeholder="draft, template"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* Classify Data Specific Config */}
                {node.type === 'group_of_file' && (
                  <div className="space-y-8">
                    {/* Section 1: Doc Type List */}
                    <div className="space-y-4">
                      <div className="flex items-center gap-2 mb-2">
                        <Tag size={16} className="text-indigo-500" />
                        <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest">Section 1: Doc type list</h3>
                      </div>

                      <div className="space-y-3">
                        {/* Display Configured Doc Types */}
                        {(node.data.docTypesToDetect || []).map((typeId: string) => {
                          const typeDef = currentDocTypes.find(d => d.id === typeId);
                          if (!typeDef) return null;
                          return (
                            <div key={typeId} className="bg-white border text-left border-slate-100 rounded-2xl p-4 shadow-sm flex items-start justify-between group/row animate-in slide-in-from-right-4 duration-300">
                              <div className="flex flex-col gap-1.5 pr-4">
                                <span className="text-xs font-black text-slate-800 tracking-tight">{typeDef.name}</span>
                                <span className="text-[10px] font-bold text-slate-400 leading-tight">hint — {typeDef.hint}</span>
                                <span className="text-[9px] font-black text-blue-500 uppercase tracking-widest bg-blue-50 px-2 py-0.5 rounded-md self-start font-mono">ตัวอย่างชื่อไฟล์: {typeDef.pattern}</span>
                              </div>
                              <button 
                                onClick={() => {
                                  const updated = (node.data.docTypesToDetect || []).filter((t: string) => t !== typeId);
                                  updateNodeData(node.id, {
                                    docTypesToDetect: updated
                                  });
                                  // Clean up any edge matching this nodeId and sourcePortId/typeId
                                  setEdges(prev => prev.filter(edge => !(edge.source === node.id && edge.sourcePortId === typeId)));
                                }}
                                className="w-8 h-8 rounded-[4px] bg-slate-50 flex items-center justify-center text-slate-400 hover:text-rose-500 hover:bg-rose-50 transition-colors shrink-0 opacity-0 group-hover/row:opacity-100"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          );
                        })}

                        {(!node.data.docTypesToDetect || node.data.docTypesToDetect.length === 0) && (
                          <div className="p-3 bg-red-50 rounded-xl border border-red-100 flex items-center gap-2 text-red-600 text-[11px] font-medium leading-none animate-bounce">
                            <AlertCircle size={14} className="shrink-0" />
                            <span>{language === 'TH' ? 'จำเป็นต้องเลือก Doc Type อย่างน้อย 1 ประเภท' : 'Requires at least 1 Doc Type'}</span>
                          </div>
                        )}

                        {/* Add Doc Type Dropdown */}
                        <div className="pt-2">
                          <div className="relative group">
                            <Plus size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 pointer-events-none" />
                            <select
                              value=""
                              onChange={(e) => {
                                const newType = e.target.value;
                                if (newType) {
                                  const current = node.data.docTypesToDetect || [];
                                  if (!current.includes(newType)) {
                                    updateNodeData(node.id, { docTypesToDetect: [...current, newType] });
                                  }
                                }
                              }}
                              className="w-full bg-slate-50 pl-10 pr-4 py-3 rounded-xl border border-slate-200 text-[10px] font-black text-slate-600 hover:text-slate-800 hover:border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-300 uppercase appearance-none cursor-pointer transition-all"
                            >
                              <option value="" disabled hidden>+ add doc type</option>
                              {currentDocTypes.map(type => (
                                <option key={type.id} value={type.id} disabled={(node.data.docTypesToDetect || []).includes(type.id)}>
                                  {type.name} ({type.id})
                                </option>
                              ))}
                            </select>
                            <ChevronDown size={14} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Section 2: Confidence threshold */}
                    <div className="space-y-4">
                      <div className="flex items-center gap-2 mb-2">
                        <Cpu size={16} className="text-purple-500" />
                        <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest">Section 2: Confidence threshold</h3>
                      </div>

                      <div className="p-5 bg-gradient-to-br from-slate-50 to-white rounded-2xl border border-slate-100 shadow-sm">
                        <div className="flex items-center justify-between mb-4">
                           <div className="flex flex-col">
                             <span className="text-[10px] font-black text-slate-800 uppercase tracking-widest leading-none">Auto-accept (%)</span>
                             <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1">Default 80%</span>
                           </div>
                           <span className="text-lg font-black text-blue-600 font-mono tracking-tighter bg-blue-50 px-3 py-1 rounded-xl border border-blue-100">{node.data.confidenceThreshold || 80}%</span>
                         </div>
                         <input 
                           type="range" 
                           min="0" 
                           max="100" 
                           value={node.data.confidenceThreshold || 80}
                           onChange={(e) => updateNodeData(node.id, { confidenceThreshold: parseInt(e.target.value) })}
                           className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600 mb-6"
                         />
                         
                         <div className="space-y-4 pt-4 border-t border-slate-100">
                           <div className="flex items-start gap-4">
                             <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0">
                               <CheckCircle2 size={16} />
                             </div>
                             <div>
                               <p className="text-[11px] font-black text-slate-800 uppercase tracking-tight">Auto-accept zone</p>
                               <p className="text-[10px] font-bold text-emerald-600 leading-snug">
                                 score ≥ {node.data.confidenceThreshold || 80}% : classify อัตโนมัติและส่งไปขั้นตอนถัดไป
                               </p>
                             </div>
                           </div>

                           <div className="flex items-start gap-4">
                             <div className="w-8 h-8 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center shrink-0">
                               <UserCheck size={16} />
                             </div>
                             <div>
                               <p className="text-[11px] font-black text-slate-800 uppercase tracking-tight">Review zone</p>
                               <p className="text-[10px] font-bold text-amber-600 leading-snug">
                                 score ต่ำกว่า auto-accept ({'<'} {node.data.confidenceThreshold || 80}%) : human review พร้อม AI suggestion
                               </p>
                             </div>
                           </div>
                         </div>
                      </div>
                    </div>
                  </div>
                )}
                
                {node.type === 'route_job' && (
                  <div className="space-y-6">
                    <div className="flex items-center gap-2 mb-2">
                      <GitBranch size={16} className="text-emerald-500" />
                      <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest">Routing Conditions</h3>
                    </div>
                    {(node.data.conditions || []).map((condition: any, idx: number) => (
                      <div key={idx} className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex items-center gap-3">
                         <div className="flex-1 font-bold text-xs">
                           IF <span className="text-blue-600">{condition.field}</span> {condition.operator} <span className="text-emerald-600">"{condition.value}"</span>
                         </div>
                      </div>
                    ))}
                    <button className="w-full py-3 border-2 border-dashed border-slate-200 rounded-[4px] text-[10px] font-black uppercase text-slate-400 hover:border-blue-400 hover:text-blue-600 transition-all">
                      + Add Condition
                    </button>
                  </div>
                )}

                {node.type === 'filter_data' && (
                  <div className="space-y-6">
                    <div className="flex items-center gap-2 mb-2">
                      <Filter size={16} className="text-orange-500" />
                      <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest">Filter Rules</h3>
                    </div>
                    <div className="p-4 bg-orange-50 rounded-2xl border border-orange-100">
                      <p className="text-[10px] font-bold text-orange-700 leading-relaxed uppercase">
                        Current Rule: {node.data.rules?.[0]?.field} {node.data.rules?.[0]?.operator} "{node.data.rules?.[0]?.value}"
                      </p>
                    </div>
                  </div>
                )}

                {node.type === 'inspect_data' && (
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Eye size={16} className="text-sky-500" />
                      <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest">Inspection Checklist</h3>
                    </div>
                    <div className="space-y-2">
                       {(node.data.checks || []).map((check: string, idx: number) => (
                         <div key={idx} className="flex items-center gap-3 p-3 bg-slate-50 rounded-2xl border border-slate-100">
                           <div className="w-4 h-4 rounded border-2 border-blue-500 bg-blue-50"></div>
                           <span className="text-xs font-bold text-slate-700">{check}</span>
                         </div>
                       ))}
                    </div>
                  </div>
                )}

                {node.type === 'approve_data' && (
                  <div className="space-y-6">
                    <div className="flex items-center gap-2 mb-2">
                      <ShieldCheck size={16} className="text-rose-500" />
                      <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest">Approval Flow</h3>
                    </div>
                    <div className="space-y-3">
                       <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1 mb-2">APPROVERS <span className="text-rose-500 font-bold ml-1">*</span></p>
                          <div className="flex flex-wrap gap-2">
                             {node.data.approvers?.map((name: string) => (
                               <span key={name} className="px-3 py-1 bg-white rounded-lg text-[10px] font-black text-slate-600 border border-slate-200">{name}</span>
                             ))}
                          </div>
                       </div>
                    </div>
                  </div>
                )}

                {node.type === 'connector' && (
                  <div className="space-y-6">
                    <div className="flex items-center gap-2 mb-2">
                      <Zap size={16} className="text-yellow-600" />
                      <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest">API Connector</h3>
                    </div>
                    <div className="space-y-4">
                      <div className="space-y-1">
                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-1">Service</label>
                        <select className="w-full bg-slate-50 p-2.5 rounded-lg text-xs font-bold text-slate-700 border border-slate-100 outline-none">
                           <option>{node.data.service}</option>
                           <option>Salesforce</option>
                           <option>Oracle</option>
                        </select>
                      </div>
                      <div className="space-y-1">
                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-1">Endpoint URL</label>
                        <input className="w-full bg-slate-50 p-2.5 rounded-lg text-xs font-bold text-slate-700 border border-slate-100 outline-none" value={node.data.endpoint} readOnly />
                      </div>
                    </div>
                  </div>
                )}

                {/* Create Job Specific Config */}
                {node.type === 'create_job' && (
                  <div className="space-y-8">
                    {/* Section 1: Job Identity */}
                    <div className="space-y-4">
                      <div className="flex items-center gap-2 mb-2">
                        <Briefcase size={16} className="text-blue-500" />
                        <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest">{language === 'TH' ? '1. ข้อมูล JOB (JOB IDENTITY)' : '1. Job Identity'}</h3>
                      </div>

                      <div className="space-y-1">
                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-1">{language === 'TH' ? 'ชื่อประเภท JOB' : 'Job Type Name'} <span className="text-rose-500">*</span></label>
                        <input 
                          type="text"
                          value={node.data.jobTypeName || ''}
                          onChange={(e) => {
                            const val = e.target.value;
                            updateNodeData(node.id, { jobTypeName: val, nodeName: val });
                          }}
                          className={`w-full bg-slate-50 p-2.5 rounded-lg text-xs font-bold text-slate-700 border transition-all focus:outline-none ${!node.data.jobTypeName ? 'border-amber-200 bg-amber-50/30 ring-2 ring-amber-500/20' : 'border-slate-100 focus:ring-2 focus:ring-blue-500/20'}`}
                          placeholder="e.g. LEO Billing, CDS, SPN"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-1">{language === 'TH' ? 'รูปแบบเลข Job' : 'Job Number Format'} <span className="text-rose-500">*</span></label>
                        <input 
                          type="text"
                          value={node.data.namingFormat || ''}
                          onChange={(e) => updateNodeData(node.id, { namingFormat: e.target.value })}
                          className={`w-full bg-slate-50 p-2.5 rounded-lg text-xs font-bold text-slate-700 border transition-all focus:outline-none ${!node.data.namingFormat ? 'border-amber-200 bg-amber-50/30 ring-2 ring-amber-500/20' : 'border-slate-100 focus:ring-2 focus:ring-blue-500/20'}`}
                          placeholder="LEO-{YYYY}-{####}"
                        />
                        <div className="flex flex-wrap gap-1.5 mt-2">
                           {['{YYYY}', '{MM}', '{DD}', '{####}'].map(tag => (
                             <button 
                               key={tag}
                               onClick={() => {
                                 const current = node.data.namingFormat || '';
                                 updateNodeData(node.id, { namingFormat: current + tag });
                               }}
                               className="px-2 py-1 bg-slate-100 hover:bg-slate-200 rounded-[4px] text-[9px] font-bold text-slate-500 transition-all font-mono"
                             >
                               {tag}
                             </button>
                           ))}
                        </div>
                        <p className="text-[9px] text-slate-400 px-1 mt-1 font-bold">
                          {language === 'TH' ? 'ตัวอย่าง:' : 'Preview:'} 
                          <span className="text-blue-600 ml-1 font-mono">{node.data.namingFormat ? node.data.namingFormat.replace('{YYYY}', new Date().getFullYear().toString()).replace('{MM}', String(new Date().getMonth()+1).padStart(2, '0')).replace('{DD}', '15').replace('{####}', '0001') : '-'}</span>
                        </p>
                      </div>

                      <div className="space-y-1">
                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-1">{language === 'TH' ? 'มอบหมายให้ทีม' : 'Assign to'} <span className="text-rose-500">*</span></label>
                        <select 
                          value={node.data.assignTo || ''}
                          onChange={(e) => updateNodeData(node.id, { assignTo: e.target.value })}
                          className={`w-full bg-slate-50 p-2.5 rounded-lg text-xs font-bold text-slate-700 border transition-all focus:outline-none ${!node.data.assignTo ? 'border-amber-200 bg-amber-50/30 ring-2 ring-amber-500/20' : 'border-slate-100 focus:ring-2 focus:ring-blue-500/20'}`}
                        >
                           <option value="">{language === 'TH' ? 'เลือกทีมที่รับผิดชอบ' : 'Select Team'}</option>
                           <option value="Team Alpha">Team Alpha</option>
                           <option value="Team Beta">Team Beta</option>
                           <option value="Operations">Operations</option>
                        </select>
                      </div>
                    </div>

                    {/* Section 2: Match Key */}
                    <div className="space-y-4">
                      <div className="flex items-center gap-2 mb-2">
                        <Key size={16} className="text-purple-500" />
                        <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest">{language === 'TH' ? '2. สร้างเงื่อนไขจับคู่ JOB' : '2. Match Key'}</h3>
                      </div>
                      
                      <div className="bg-slate-50 p-4 rounded-lg border border-slate-100">
                        <p className="text-[10px] text-slate-500 font-bold mb-3 italic">
                          {language === 'TH' ? 'ระบบใช้ key นี้หา job เดิม ถ้าพบ → เพิ่มไฟล์เข้า job นั้น, ถ้าไม่พบ → สร้าง job ใหม่' : 'System uses this key to find existing jobs. If found -> adds file to job, if not -> creates new job'}
                        </p>
                        
                        <div className="flex flex-wrap gap-2 mb-3">
                          {(node.data.matchKeys || []).map((k: string, i: number) => (
                            <span key={i} className="flex items-center gap-1.5 px-2 py-1 bg-white border border-slate-200 rounded-md shadow-sm">
                              <span className="text-xs font-bold text-slate-700">{k}</span>
                              <button 
                                onClick={() => {
                                  let newKeys = [...(node.data.matchKeys || [])];
                                  newKeys.splice(i, 1);
                                  updateNodeData(node.id, { matchKeys: newKeys });
                                }}
                                className="text-slate-400 hover:text-rose-500"
                              ><X size={12}/></button>
                            </span>
                          ))}
                        </div>
                        
                        <div className="flex items-center gap-2">
                          <input 
                            type="text" 
                            id={`match_key_input_${node.id}`}
                            className="flex-1 bg-white p-2 rounded-md text-xs font-bold border border-slate-200 focus:outline-none focus:border-purple-400"
                            placeholder={language === 'TH' ? 'พิมพ์แล้วกด Enter (เช่น PO#, B/L#)' : 'Type & press Enter...'}
                            onKeyDown={(e) => {
                               if (e.key === 'Enter') {
                                 let val = e.currentTarget.value.trim();
                                 if (val) {
                                  updateNodeData(node.id, { matchKeys: [...(node.data.matchKeys || []), val] });
                                  e.currentTarget.value = '';
                                 }
                               }
                            }}
                          />
                          <button 
                            className="p-2 bg-purple-100 text-purple-600 rounded-[4px] hover:bg-purple-200 transition-colors"
                            onClick={() => {
                               let input = document.getElementById(`match_key_input_${node.id}`) as HTMLInputElement;
                               if (input && input.value.trim()) {
                                  updateNodeData(node.id, { matchKeys: [...(node.data.matchKeys || []), input.value.trim()] });
                                  input.value = '';
                               }
                            }}
                          ><Plus size={16} /></button>
                        </div>
                      </div>
                    </div>

                    {/* Section 3: Required Doc Types */}
                    <div className="space-y-4">
                      <div className="flex items-center gap-2 mb-2">
                        <Files size={16} className="text-emerald-500" />
                        <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest">{language === 'TH' ? '3. ประเภทไฟล์ที่ต้องการ' : '3. Required Doc Types'}</h3>
                      </div>
                      
                      <div className="bg-slate-50 p-4 flex flex-col gap-3 rounded-lg border border-slate-100">
                        <p className="text-[10px] text-slate-500 font-bold italic">
                          {language === 'TH' ? 'ระบุไฟล์ที่ job ต้องรอให้ครบ ถ้าปล่อยว่างระบบจะถือว่า job ready ทันทีที่สร้าง' : 'Leave empty if job is ready upon creation.'}
                        </p>
                        
                        {(node.data.requiredDocTypes || []).map((doc: {name: string, isRequired: boolean}, i: number) => (
                           <div key={i} className="flex items-center gap-3 bg-white p-2 rounded-md border border-slate-200 shadow-sm">
                             <input 
                               type="text" 
                               value={doc.name} 
                               onChange={(e) => {
                                  let newDocs = [...(node.data.requiredDocTypes || [])];
                                  newDocs[i].name = e.target.value;
                                  updateNodeData(node.id, { requiredDocTypes: newDocs });
                               }}
                               className="flex-1 text-xs font-bold outline-none" 
                               placeholder="Document Type..."
                             />
                             <div className="flex items-center gap-2 shrink-0">
                                <label className="text-[10px] font-bold text-slate-500 flex items-center gap-1 cursor-pointer">
                                  <input 
                                    type="checkbox" 
                                    checked={doc.isRequired}
                                    onChange={(e) => {
                                      let newDocs = [...(node.data.requiredDocTypes || [])];
                                      newDocs[i].isRequired = e.target.checked;
                                      updateNodeData(node.id, { requiredDocTypes: newDocs });
                                    }}
                                  /> Required
                                </label>
                                <button 
                                  className="text-slate-400 hover:text-rose-500 p-1"
                                  onClick={() => {
                                    let newDocs = [...(node.data.requiredDocTypes || [])];
                                    newDocs.splice(i, 1);
                                    updateNodeData(node.id, { requiredDocTypes: newDocs });
                                  }}
                                ><Trash2 size={14}/></button>
                             </div>
                           </div>
                        ))}
                        
                        <button 
                           onClick={() => {
                             updateNodeData(node.id, { requiredDocTypes: [...(node.data.requiredDocTypes || []), { name: '', isRequired: true }] })
                           }}
                           className="flex items-center gap-2 justify-center py-2 bg-emerald-50 text-emerald-600 rounded-[4px] border border-emerald-100 font-bold text-[10px] uppercase hover:bg-emerald-100 transition-colors mt-1"
                        >
                          <Plus size={14}/> {language === 'TH' ? 'เพิ่มประเภทไฟล์' : 'Add Doc Type'}
                        </button>
                      </div>
                    </div>

                    {/* Section 4: Behavior */}
                    <div className="space-y-4">
                      <div className="flex items-center gap-2 mb-2">
                        <AlertCircle size={16} className="text-amber-500" />
                        <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest">{language === 'TH' ? '4. พฤติกรรมเมื่อพบปัญหา' : '4. Error Behaviors'}</h3>
                      </div>
                      
                      <div className="grid gap-4">
                        <div className="space-y-2 p-4 bg-slate-50 rounded-lg border border-slate-100">
                          <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-2">Closed Job Behavior</label>
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input 
                              type="radio" 
                              name={`closed_behavior_${node.id}`} 
                              checked={node.data.closedJobBehavior === 'alert'}
                              onChange={() => updateNodeData(node.id, { closedJobBehavior: 'alert' })}
                              className="text-blue-500"
                            />
                            <span className="text-xs font-bold text-slate-700">Alert tab + Reject</span>
                          </label>
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input 
                              type="radio" 
                              name={`closed_behavior_${node.id}`} 
                              checked={node.data.closedJobBehavior === 'create_new'}
                              onChange={() => updateNodeData(node.id, { closedJobBehavior: 'create_new' })}
                              className="text-blue-500"
                            />
                            <span className="text-xs font-bold text-slate-700">Create new job</span>
                          </label>
                        </div>
                        
                        <div className="space-y-2 p-4 bg-slate-50 rounded-lg border border-slate-100">
                          <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-2">Locked Job Behavior</label>
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input 
                              type="radio" 
                              name={`locked_behavior_${node.id}`} 
                              checked={node.data.lockedJobBehavior === 'queue'}
                              onChange={() => updateNodeData(node.id, { lockedJobBehavior: 'queue' })}
                              className="text-purple-500"
                            />
                            <span className="text-xs font-bold text-slate-700">Queue + Alert</span>
                          </label>
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input 
                              type="radio" 
                              name={`locked_behavior_${node.id}`} 
                              checked={node.data.lockedJobBehavior === 'reject'}
                              onChange={() => updateNodeData(node.id, { lockedJobBehavior: 'reject' })}
                              className="text-purple-500"
                            />
                            <span className="text-xs font-bold text-slate-700">Reject</span>
                          </label>
                        </div>
                      </div>
                    </div>

                    {/* Section 5: Versioning */}
                    <div className="space-y-4">
                      <div className="flex items-center gap-2 mb-2">
                        <History size={16} className="text-blue-500" />
                        <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest">{language === 'TH' ? '5. ระบบเวอร์ชันไฟล์' : '5. File Versioning'}</h3>
                      </div>
                      
                      <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg border border-slate-100">
                        <div>
                           <p className="text-xs font-bold text-slate-700">{language === 'TH' ? 'เก็บประวัติไฟล์ทุกเวอร์ชัน' : 'Keep all file versions'}</p>
                           <p className="text-[10px] text-slate-500 font-bold italic mt-0.5 max-w-[200px]">{language === 'TH' ? 'หากไฟล์ชื่อซ้ำจะถูกสร้างเป็นเวอร์ชันใหม่' : 'Save as new version instead of overwriting'}</p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                           <input 
                             type="checkbox" 
                             checked={node.data.fileVersioning !== false} 
                             onChange={(e) => updateNodeData(node.id, { fileVersioning: e.target.checked })}
                             className="sr-only peer"
                           />
                           <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
                        </label>
                      </div>
                    </div>
                  </div>
                )}

                {/* Save/Share Specific Config */}
                {node.type === 'send_to' && (
                  <div className="space-y-8">
                    {/* Section 1: Output Destinations */}
                    <div className="space-y-4">
                      <div className="flex items-center gap-2 mb-2">
                        <Share2 size={16} className="text-emerald-500" />
                        <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest">Output Destinations</h3>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                         {[
                           { id: 'DRIVE', label: 'Cloud Drive', icon: <HardDrive size={14} /> },
                           { id: 'EMAIL', label: 'Email Report', icon: <Mail size={14} /> },
                           { id: 'PORTAL', label: 'BizX Portal', icon: <Hash size={14} /> },
                           { id: 'SHARE', label: 'External Share', icon: <Share2 size={14} /> }
                         ].map(dest => {
                           const isSelected = (node.data.destinations || []).includes(dest.id);
                           return (
                             <button 
                               key={dest.id}
                               onClick={() => {
                                 const current = node.data.destinations || [];
                                 const next = isSelected ? current.filter((d: string) => d !== dest.id) : [...current, dest.id];
                                 updateNodeData(node.id, { destinations: next });
                               }}
                               className={`flex items-center gap-3 p-3 rounded-[4px] border-2 transition-all ${isSelected ? 'border-emerald-500 bg-emerald-50' : 'border-slate-50 bg-slate-100 hover:border-slate-200'}`}
                             >
                               <div className={`${isSelected ? 'text-emerald-600' : 'text-slate-400'}`}>
                                 {dest.icon}
                               </div>
                               <span className={`text-[9px] font-black uppercase tracking-widest ${isSelected ? 'text-emerald-700' : 'text-slate-400'}`}>{dest.label}</span>
                             </button>
                           );
                         })}
                      </div>
                    </div>

                    {/* Section 2: Notifications & Security */}
                    <div className="space-y-4">
                      <div className="flex items-center gap-2 mb-2">
                        <ShieldCheck size={16} className="text-blue-500" />
                        <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest">Notifications & Security</h3>
                      </div>

                      <div className="space-y-3">
                        <div className="flex items-center justify-between p-4 bg-white border border-slate-100 rounded-2xl shadow-sm">
                          <div className="flex items-center gap-4">
                             <div className="w-10 h-10 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-100">
                               <ShieldCheck size={18} />
                             </div>
                             <div>
                                <p className="text-[10px] font-black text-slate-800 uppercase tracking-tight">Public Link</p>
                                <p className="text-[9px] text-slate-400 font-bold">Allow access without login</p>
                             </div>
                          </div>
                          <input 
                            type="checkbox"
                            checked={node.data.isPublic || false}
                            onChange={(e) => updateNodeData(node.id, { isPublic: e.target.checked })}
                            className="w-5 h-5 rounded-lg border-slate-200 text-blue-600 focus:ring-blue-500 transition-all cursor-pointer"
                          />
                        </div>

                        <div className="flex items-center justify-between p-4 bg-slate-50/50 border border-slate-100 rounded-2xl">
                           <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Notify on Complete</span>
                           <input 
                             type="checkbox"
                             checked={node.data.notifyOnComplete || false}
                             onChange={(e) => updateNodeData(node.id, { notifyOnComplete: e.target.checked })}
                             className="w-5 h-5 rounded-lg border-slate-200 text-blue-600 focus:ring-blue-500 transition-all cursor-pointer"
                           />
                        </div>
                        
                        {node.data.notifyOnComplete && (
                          <div className="px-1 animate-in fade-in slide-in-from-top-2 duration-200">
                            <input 
                              type="text"
                              value={node.data.notificationEmails || ''}
                              onChange={(e) => updateNodeData(node.id, { notificationEmails: e.target.value })}
                              className="w-full bg-white p-3 text-[10px] font-bold text-slate-700 border border-slate-200 rounded-lg focus:outline-none focus:ring-4 focus:ring-blue-500/10 transition-all"
                              placeholder="Enter email addresses (comma separated)..."
                            />
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Section: Next Workflow Routing */}
                    <div className="space-y-4 pt-4 border-t border-slate-100">
                      <div className="flex items-center gap-2 mb-2">
                        <GitBranch size={16} className="text-amber-500" />
                        <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest">
                          {language === 'TH' ? 'เวิร์กโฟลว์ถัดไป (ส่งต่องาน)' : 'Next Workflow Routing'}
                        </h3>
                      </div>
                      <div className="space-y-1">
                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-1">
                          {language === 'TH' ? 'เลือกเวิร์กโฟลว์ถัดไป' : 'Select Destination Workflow'}
                        </label>
                        <select
                          value={node.data.nextWorkflowId || ''}
                          onChange={(e) => {
                            const val = e.target.value;
                            const wfNames: Record<string, string> = {
                              'wf-1': 'Invoice Processing',
                              'wf-3': 'Australia Meat Import Control',
                              'wf-4': 'Maritime Freight Checking',
                              'wf-5': 'Customs Declaration Matching',
                              'wf-6': 'Electronics Import Rules',
                              'wf-7': 'ASEAN Trade Agreement',
                              'wf-2': 'Empty Workflow'
                            };
                            updateNodeData(node.id, { 
                              nextWorkflowId: val,
                              nextWorkflowName: wfNames[val] || ''
                            });
                          }}
                          className="w-full bg-white p-3 text-[11px] font-bold text-slate-700 border border-slate-200 rounded-[4px] focus:outline-none focus:ring-4 focus:ring-blue-500/10 transition-all"
                        >
                          <option value="">-- {language === 'TH' ? 'ไม่ได้เลือก' : 'None'} --</option>
                          <option value="wf-1">Invoice Processing</option>
                          <option value="wf-3">Australia Meat Import Control</option>
                          <option value="wf-4">Maritime Freight Checking</option>
                          <option value="wf-5">Customs Declaration Matching</option>
                          <option value="wf-6">Electronics Import Rules</option>
                          <option value="wf-7">ASEAN Trade Agreement</option>
                        </select>
                      </div>
                    </div>

                    {/* Section 3: Export Details */}
                    <div className="space-y-4 pt-4 border-t border-slate-100">
                      <div className="flex items-center gap-2 mb-2">
                        <FileOutput size={16} className="text-purple-500" />
                        <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest">Export Details</h3>
                      </div>

                      <div className="space-y-1">
                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-1">Package Format</label>
                        <div className="grid grid-cols-3 gap-2 mt-1">
                           {['ZIP BUNDLE', 'INDIVIDUAL FILES', 'COMBINED PDF'].map(fmt => (
                             <button 
                               key={fmt}
                               onClick={() => updateNodeData(node.id, { exportPackage: fmt })}
                               className={`py-3 px-2 rounded-[4px] text-[9px] font-black uppercase border-2 transition-all ${node.data.exportPackage === fmt ? 'border-purple-500 bg-purple-50/50 text-purple-700' : 'border-slate-50 bg-slate-100 text-slate-400 hover:border-slate-200'}`}
                             >
                               {fmt}
                             </button>
                           ))}
                        </div>
                      </div>

                      <div className="p-4 bg-slate-50/80 rounded-2xl border border-slate-100 italic">
                         <p className="text-[9px] font-bold text-slate-500 leading-relaxed flex items-start gap-2">
                           <span className="text-blue-600 font-black whitespace-nowrap">Note:</span>
                           <span>BizX Portal will always receive the full audit trail regardless of format selection.</span>
                         </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Compare Config for nodes of type 'compare' */}
                {node.type === 'compare' && (
                  <div className="space-y-6">
                    <div>
                      <h3 className="text-sm font-black text-[#010136] uppercase tracking-wider mb-2">
                        {language === 'TH' ? 'เปรียบเทียบข้อมูล (Compare Settings)' : 'Compare Settings'}
                      </h3>
                      <p className="text-xs text-slate-500 mb-4 leading-relaxed">
                        {language === 'TH' 
                          ? 'เลือก Compare Rule เพื่อกำหนดเงื่อนไขในการเปรียบเทียบชุดข้อมูล' 
                          : 'Select a Compare Rule to determine the dataset comparison logic.'}
                      </p>
                    </div>

                     {/* Section 1: Compare rule dropdown */}
                     <div className="space-y-3">
                       <label className="block text-xs font-black text-slate-700 uppercase tracking-wide">
                         {language === 'TH' ? 'เลือก Compare Rule' : 'Select Compare Rule'} <span className="text-red-500">*</span>
                       </label>
                       
                       <select
                         value={node.data?.ruleId || ''}
                         onChange={(e) => {
                           const val = e.target.value;
                           const selectedRule = defaultRules.find((r: any) => r.id === val);
                           const ruleNameDisplay = selectedRule ? (language === 'TH' ? (selectedRule.nameTh || selectedRule.name) : selectedRule.name) : '';
                           updateNodeData(node.id, { 
                             ruleId: val,
                             ruleName: ruleNameDisplay,
                             isConfigured: !!val
                           });
                         }}
                         style={{ borderRadius: '4px' }}
                         className="w-full bg-white border border-slate-300 px-4 py-3 text-sm font-bold text-[#010136] placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all cursor-pointer"
                       >
                         <option value="">-- {language === 'TH' ? 'เลือก Compare Rule' : 'Select Compare Rule'} --</option>
                         {defaultRules.map((rule: any) => {
                           const ruleLabel = language === 'TH' ? (rule.nameTh || rule.name) : rule.name;
                           return (
                             <option key={rule.id} value={rule.id}>
                               {ruleLabel}
                             </option>
                           );
                         })}
                       </select>

                       {/* ถ้ายังไม่มี rule เลย ให้แสดง link "ไปสร้าง Compare rule" */}
                       {(!defaultRules || defaultRules.length === 0) && (
                         <div className="p-3 bg-amber-50 border border-amber-200 mt-2" style={{ borderRadius: '8px' }}>
                           <p className="text-xs font-bold text-amber-700">
                             {language === 'TH' ? 'ยังไม่มี Compare rule ในระบบ' : 'No Compare rules found.'}
                           </p>
                           <button
                             type="button"
                             onClick={() => window.dispatchEvent(new CustomEvent('change-view', { detail: 'DATA_COMPARISON_RULE' }))}
                             className="text-xs font-black text-[#1f5df9] hover:underline mt-1.5 flex items-center gap-1"
                           >
                             {language === 'TH' ? 'ไปสร้าง Compare rule' : 'Go create a Compare rule'} &rarr;
                           </button>
                         </div>
                       )}
                     </div>

                    {/* เมื่อเลือก rule แล้ว ให้แสดง preview สรุป rule ที่เลือก */}
                    {node.data?.ruleId && (
                      (() => {
                        const boundRule = defaultRules.find((r: any) => r.id === node.data.ruleId);
                        if (!boundRule) return null;
                        const detailTitle = language === 'TH' ? 'พรีวิวเงื่อนไขเปรียบเทียบข้อมูล (Preview Rule Summary)' : 'Compare Rule Preview Summary';
                        const ruleTitle = language === 'TH' ? (boundRule.nameTh || boundRule.name) : boundRule.name;
                        const descriptionText = language === 'TH' ? (boundRule.descriptionTh || boundRule.description) : boundRule.description;
                        
                        // Gather rows across parts
                        const rows = boundRule.parts ? boundRule.parts.flatMap((p: any) => p.rows || []) : [];

                        return (
                          <div className="space-y-3 pt-3 border-t border-slate-100">
                            <div className="p-4 bg-blue-50/20 border border-blue-100 space-y-3" style={{ borderRadius: '8px' }}>
                              <div className="flex items-center justify-between">
                                <span className="text-[10px] font-black text-[#1f5df9] bg-blue-100/60 px-2.5 py-1 rounded uppercase tracking-wider">
                                  {language === 'TH' ? 'Rule ที่เลือกอยู่' : 'Selected Rule'}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => window.dispatchEvent(new CustomEvent('change-view', { detail: 'DATA_COMPARISON_RULE' }))}
                                  className="text-[10px] font-black text-[#1f5df9] hover:underline"
                                >
                                  {language === 'TH' ? 'แก้ไขกฎนี้' : 'Edit this rule'}
                                </button>
                              </div>

                              <div>
                                <h4 className="text-xs font-black text-[#010136]">{ruleTitle}</h4>
                                <p className="text-[11px] font-bold text-slate-400 mt-1 leading-relaxed">{descriptionText}</p>
                              </div>

                              {/* Document Types mapping chains */}
                              <div className="pt-2 border-t border-slate-200/50 flex flex-wrap gap-1">
                                {(boundRule.docTypes || []).map((dt: string) => (
                                  <span key={dt} className="inline-flex items-center text-[9px] font-black px-2 py-0.5 bg-slate-100/80 text-slate-600 rounded" style={{ borderRadius: '4px' }}>
                                    {dt}
                                  </span>
                                ))}
                              </div>
                            </div>

                            {/* Field matching type lists: "Quantity -> Invoice vs Packing list vs B/L · Exact" */}
                            <div className="border border-slate-100 rounded-lg p-3 bg-white space-y-2">
                              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">
                                {detailTitle}
                              </p>
                              
                              <div className="divide-y divide-slate-50 max-h-[220px] overflow-y-auto custom-scrollbar pr-1">
                                {rows.length === 0 ? (
                                  <p className="text-xs text-slate-400 italic py-2 text-center">
                                    {language === 'TH' ? 'ไม่มีฟิลด์เปรียบเทียบในกฎนี้' : 'No comparison fields defined in this rule.'}
                                  </p>
                                ) : (
                                  rows.map((row: any) => {
                                    const rowLabel = language === 'TH' ? (row.detailTh || row.detail) : row.detail;
                                    
                                    // Find which document types are mapped for this row
                                    const involvedDocs = (row.values || []).map((val: any, idx: number) => {
                                      if (val && val.type && val.type !== 'TEXT') {
                                        return boundRule.docTypes[idx] || null;
                                      }
                                      return null;
                                    }).filter(Boolean);

                                    // Gather active mapping type
                                    const activeValue = (row.values || []).find((val: any) => val && val.type && val.type !== 'TEXT');
                                    const matchTypeLabel = activeValue ? activeValue.type : 'EXACT';

                                    // Translate labels to human readable formats
                                    const finalMatchType = matchTypeLabel === 'CONDITIONAL' ? 'Conditional' :
                                                           matchTypeLabel === 'BILINGUAL' ? 'Bilingual' :
                                                           matchTypeLabel === 'NUMBER_WORD' ? 'Number' :
                                                           matchTypeLabel === 'MASTER_LOOKUP' ? 'Master Lookup' :
                                                           matchTypeLabel === 'DATE_NORMALIZATION' ? 'Date' :
                                                           matchTypeLabel === 'CROSS_FLOW_CARRY' ? 'Cross Carry' :
                                                           'Exact';

                                    const docChain = involvedDocs.length > 0 ? involvedDocs.join(' vs ') : (language === 'TH' ? 'ไม่มีการเปรียบเทียบ' : 'No Comparison');

                                    return (
                                      <div key={row.id} className="flex justify-between items-center py-2 text-[11px] font-bold">
                                        <div className="text-slate-700 truncate max-w-[150px]" title={rowLabel}>
                                          {rowLabel}
                                        </div>
                                        <div className="flex items-center gap-1.5 text-right">
                                          <span className="text-[10px] text-slate-400 font-medium">{docChain}</span>
                                          <span className="text-[9px] font-black text-[#16EA9E] bg-[#16EA9E]/10 px-1 py-0.5 rounded uppercase tracking-tight" style={{ borderRadius: '3px' }}>
                                            {finalMatchType}
                                          </span>
                                        </div>
                                      </div>
                                    );
                                  })
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })()
                    )}

                    {/* Section 2: Allow review toggle */}
                    <div className="pt-4 border-t border-slate-100 space-y-4">
                      <div className="flex items-center justify-between">
                        <div>
                           <label className="block text-xs font-black text-slate-700 uppercase tracking-wide">
                             {language === 'TH' ? 'เปิดให้เจ้าหน้าที่ตรวจสอบ (Allow Review)' : 'Allow Review'}
                           </label>
                           <p className="text-[11px] text-slate-400 mt-0.5 leading-normal">
                             {language === 'TH' 
                               ? 'เปิดการขอทบทวนโดยเจ้าหน้าที่หากข้อมูลไม่คลาดเคลื่อนหรือความกังขา' 
                               : 'Enable dynamic paused queues for physical operator verification.'}
                           </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            const currentVal = node.data?.allowReview !== false; // default = true
                            updateNodeData(node.id, { allowReview: !currentVal });
                          }}
                          className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-[20px] border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                            (node.data?.allowReview !== false) ? 'bg-[#16EA9E]' : 'bg-slate-200'
                          }`}
                          style={{ borderRadius: '20px' }}
                        >
                          <span
                            className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                              (node.data?.allowReview !== false) ? 'translate-x-5' : 'translate-x-0'
                            }`}
                            style={{ borderRadius: '50%' }}
                          />
                        </button>
                      </div>

                      {/* Informational description box based on Toggle Status */}
                      <div className="p-3 bg-slate-50/80 rounded border border-slate-100 text-[11px] text-slate-500 leading-relaxed" style={{ borderRadius: '8px' }}>
                        {(node.data?.allowReview !== false) ? (
                          <p>
                            {language === 'TH'
                              ? '💡 หากพบข้อมูลไม่ตรงกัน (Mismatch) หรือความน่าจะเป็นต่ำ ระบบจะระงับเวิร์กโฟลว์ชั่วคราวเพื่อให้เจ้าหน้าที่ตรวจสอบและตัดสินใจเลือกค่าที่ถูกต้องในส่วน "Compare review"'
                              : '💡 When differences or mismatch issues occur, files will be held in the paused queue for user selection inside "Compare review".'}
                          </p>
                        ) : (
                          <p className="text-amber-600 font-bold">
                            {language === 'TH'
                              ? '⚠️ ถ้าผลลัพธ์ไม่คลาดเคลื่อนหรือเกิดความไม่ลงตัว ระบบจะเลือกใช้ค่าจากเอกสารประเภทแรก (First Document Type / Main) เป็นเกณฑ์หลักในการตรวจสอบ และดำเนินสเต็ปทำงานต่อไปทันทีโดยไม่หยุดรอ'
                              : '⚠️ If mismatches arise, the validation flow automatically processes values from the main/first document type specified in the rule and proceeds immediately.'}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* Storage Node Config */}
                {node.type === 'storage' && (
                  <div className="space-y-6">
                    <div>
                      <h3 className="text-sm font-black text-[#010136] uppercase tracking-wider mb-2">
                        {language === 'TH' ? 'ตั้งค่าการจัดเก็บข้อมูล (Storage Settings)' : 'Storage Settings'}
                      </h3>
                      <p className="text-xs text-slate-500 mb-4 leading-relaxed">
                        {language === 'TH' 
                          ? 'กำหนดโครงสร้าง โฟลเดอร์ปลายทาง และรูปแบบการตั้งชื่อไฟล์สำหรับบันทึกข้อมูล' 
                          : 'Configure destination folder structures and file naming conventions for outputs.'}
                      </p>
                    </div>

                    {/* Section 1: Directory path */}
                    <div className="p-4 bg-white border border-slate-200 shadow-sm rounded-[16px] space-y-4">
                      <div className="flex items-center gap-2">
                        <FolderInput size={16} className="text-[#1f5df9]" />
                        <h4 className="text-xs font-black text-[#010136] uppercase tracking-wider">
                          Section 1: Directory Path (เส้นทางหลัก) <span className="text-rose-500 font-bold">*</span>
                        </h4>
                      </div>
                      
                      <div className="space-y-2">
                        <input 
                          type="text"
                          value={node.data.directoryPath !== undefined ? node.data.directoryPath : "/imports/{year}/{month}"}
                          onChange={(e) => updateNodeData(node.id, { directoryPath: e.target.value })}
                          className="w-full bg-slate-50 p-3 text-xs font-bold text-[#010136] border border-slate-200 rounded-[4px] focus:outline-none focus:border-[#1f5df9] focus:ring-1 focus:ring-[#1f5df9]/20 transition-all font-mono"
                          placeholder="/imports/{year}/{month}"
                        />
                        
                        {/* Variables Hint */}
                        <div className="bg-slate-50 border border-slate-100 p-2.5 rounded-[8px] space-y-1">
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">
                            {language === 'TH' ? 'คลิกเพื่อแทรกแท็ก (Click to insert):' : 'Click to insert tag:'}
                          </p>
                          <div className="flex flex-wrap gap-1.5">
                            {['{year}', '{month}', '{date}', '{job#}', '{job_type}'].map(tag => (
                              <button
                                key={tag}
                                onClick={() => {
                                  const currentPath = node.data.directoryPath !== undefined ? node.data.directoryPath : "/imports/{year}/{month}";
                                  updateNodeData(node.id, { directoryPath: currentPath + tag });
                                }}
                                className="px-1.5 py-0.5 bg-white hover:bg-blue-50 hover:border-[#1f5df9] border border-slate-200 text-[#1f5df9] rounded-[4px] text-[10px] font-mono font-bold transition-all"
                              >
                                {tag}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Preview */}
                        <div className="flex flex-col gap-1 p-2.5 bg-blue-50/50 border border-blue-100 rounded-[8px]">
                          <p className="text-[9px] font-black text-[#1f5df9] uppercase tracking-wider leading-none">
                            {language === 'TH' ? 'ตัวอย่างเส้นทางจริง:' : 'Real Path Preview:'}
                          </p>
                          <p className="text-[11px] font-bold text-slate-600 font-mono break-all leading-relaxed mt-1">
                            {parseStorageTemplate(node.data.directoryPath !== undefined ? node.data.directoryPath : "/imports/{year}/{month}") || '/'}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Section 2: Directory naming */}
                    <div className="p-4 bg-white border border-slate-200 shadow-sm rounded-[16px] space-y-4 font-sans max-w-full">
                      <div className="flex items-center gap-2">
                        <Folder size={16} className="text-[#1f5df9]" />
                        <h4 className="text-xs font-black text-[#010136] uppercase tracking-wider">
                          Section 2: Directory Naming (ชื่อโฟลเดอร์) <span className="text-rose-500 font-bold">*</span>
                        </h4>
                      </div>
                      
                      <div className="space-y-2">
                        <input 
                          type="text"
                          value={node.data.directoryNaming !== undefined ? node.data.directoryNaming : "{job#}-{job_type}"}
                          onChange={(e) => updateNodeData(node.id, { directoryNaming: e.target.value })}
                          className="w-full bg-slate-50 p-3 text-xs font-bold text-[#010136] border border-slate-200 rounded-[4px] focus:outline-none focus:border-[#1f5df9] focus:ring-1 focus:ring-[#1f5df9]/20 transition-all font-mono"
                          placeholder="{job#}-{job_type}"
                        />
                        
                        {/* Variables Hint */}
                        <div className="bg-slate-50 border border-slate-100 p-2.5 rounded-[8px] space-y-1">
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">
                            {language === 'TH' ? 'คลิกเพื่อแทรกแท็ก (Click to insert):' : 'Click to insert tag:'}
                          </p>
                          <div className="flex flex-wrap gap-1.5">
                            {['{year}', '{month}', '{date}', '{job#}', '{job_type}'].map(tag => (
                              <button
                                key={tag}
                                onClick={() => {
                                  const currentNaming = node.data.directoryNaming !== undefined ? node.data.directoryNaming : "{job#}-{job_type}";
                                  updateNodeData(node.id, { directoryNaming: currentNaming + tag });
                                }}
                                className="px-1.5 py-0.5 bg-white hover:bg-blue-50 hover:border-[#1f5df9] border border-slate-200 text-[#1f5df9] rounded-[4px] text-[10px] font-mono font-bold transition-all"
                              >
                                {tag}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Preview */}
                        <div className="flex flex-col gap-1 p-2.5 bg-blue-50/50 border border-blue-100 rounded-[8px]">
                          <p className="text-[9px] font-black text-[#1f5df9] uppercase tracking-wider leading-none">
                            {language === 'TH' ? 'ตัวอย่างชื่อโฟลเดอร์จริง:' : 'Folder Name Preview:'}
                          </p>
                          <p className="text-[11px] font-bold text-slate-600 font-mono break-all leading-relaxed mt-1">
                            {parseStorageTemplate(node.data.directoryNaming !== undefined ? node.data.directoryNaming : "{job#}-{job_type}") || 'No directory name'}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Section 3: File naming */}
                    <div className="p-4 bg-white border border-slate-200 shadow-sm rounded-[16px] space-y-4 font-sans max-w-full">
                      <div className="flex items-center gap-2">
                        <FileText size={16} className="text-[#1f5df9]" />
                        <h4 className="text-xs font-black text-[#010136] uppercase tracking-wider">
                          Section 3: File Naming (รูปแบบชื่อไฟล์) <span className="text-rose-500 font-bold">*</span>
                        </h4>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-3 font-sans">
                        <button
                          onClick={() => updateNodeData(node.id, { fileNamingMode: 'original' })}
                          className={`p-3 border transition-all rounded-[8px] flex flex-col justify-between h-[80px] text-left transition-all ${
                            (node.data.fileNamingMode || 'original') === 'original' 
                              ? 'border-[#1f5df9] bg-blue-50/50 text-[#010136] ring-1 ring-[#1f5df9]' 
                              : 'border-slate-200 bg-white hover:border-slate-300 text-slate-500 hover:bg-slate-50'
                          }`}
                        >
                          <span className="text-[11px] font-black uppercase tracking-wider leading-none">Original Name</span>
                          <span className="text-[9px] text-slate-400 font-bold leading-tight block mt-1">
                            {language === 'TH' ? 'ใช้ชื่อไฟล์เดิม ไม่เปลี่ยน' : 'Keep default filename'}
                          </span>
                        </button>

                        <button
                          onClick={() => updateNodeData(node.id, { fileNamingMode: 'custom' })}
                          className={`p-3 border transition-all rounded-[8px] flex flex-col justify-between h-[80px] text-left transition-all ${
                            node.data.fileNamingMode === 'custom' 
                              ? 'border-[#1f5df9] bg-blue-50/50 text-[#010136] ring-1 ring-[#1f5df9]' 
                              : 'border-slate-200 bg-white hover:border-slate-300 text-slate-500 hover:bg-slate-50'
                          }`}
                        >
                          <span className="text-[11px] font-black uppercase tracking-wider leading-none">Custom Template</span>
                          <span className="text-[9px] text-slate-400 font-bold leading-tight block mt-1">
                            {language === 'TH' ? 'กำหนดตามต้องการ' : 'Define naming rules'}
                          </span>
                        </button>
                      </div>

                      {/* Custom template input block */}
                      {node.data.fileNamingMode === 'custom' && (
                        <div className="space-y-3 pt-3 border-t border-slate-100 animate-in fade-in slide-in-from-top-2 duration-200">
                          <div className="space-y-1">
                            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1 block">
                              File Naming Template <span className="text-rose-500 font-bold">*</span>
                            </label>
                            <input 
                              type="text"
                              value={node.data.fileNamingTemplate !== undefined ? node.data.fileNamingTemplate : "{job#}_{doc_type}_{date}"}
                              onChange={(e) => updateNodeData(node.id, { fileNamingTemplate: e.target.value })}
                              className="w-full bg-slate-50 p-3 text-xs font-bold text-[#010136] border border-slate-200 rounded-[4px] focus:outline-none focus:border-[#1f5df9] focus:ring-1 focus:ring-[#1f5df9]/20 transition-all font-mono"
                              placeholder="{job#}_{doc_type}_{date}"
                            />
                          </div>

                          {/* Variables Hint */}
                          <div className="bg-slate-50 border border-slate-100 p-2.5 rounded-[8px] space-y-1">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">
                              {language === 'TH' ? 'คลิกเพื่อแทรกแท็ก (Click to insert):' : 'Click to insert tag:'}
                            </p>
                            <div className="flex flex-wrap gap-1.5">
                              {['{job#}', '{doc_type}', '{date}', '{original_name}'].map(tag => (
                                <button
                                  key={tag}
                                  onClick={() => {
                                    const currentTemplate = node.data.fileNamingTemplate !== undefined ? node.data.fileNamingTemplate : "{job#}_{doc_type}_{date}";
                                    updateNodeData(node.id, { fileNamingTemplate: currentTemplate + tag });
                                  }}
                                  className="px-1.5 py-0.5 bg-white hover:bg-blue-50 hover:border-[#1f5df9] border border-slate-200 text-[#1f5df9] rounded-[4px] text-[10px] font-mono font-bold transition-all"
                                >
                                  {tag}
                                </button>
                              ))}
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Preview for File Naming */}
                      <div className="flex flex-col gap-1 p-2.5 bg-blue-50/50 border border-blue-100 rounded-[8px]">
                        <p className="text-[9px] font-black text-[#1f5df9] uppercase tracking-wider leading-none">
                          {language === 'TH' ? 'ตัวอย่างชื่อไฟล์จริง:' : 'File Name Preview:'}
                        </p>
                        <p className="text-[11px] font-bold text-slate-600 font-mono break-all leading-relaxed mt-1">
                          {node.data.fileNamingMode === 'custom' 
                            ? (parseStorageTemplate(node.data.fileNamingTemplate !== undefined ? node.data.fileNamingTemplate : "{job#}_{doc_type}_{date}") ? `${parseStorageTemplate(node.data.fileNamingTemplate !== undefined ? node.data.fileNamingTemplate : "{job#}_{doc_type}_{date}")}.pdf` : 'No custom template') 
                            : 'commercial_invoice_v3.pdf'}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Extract Node Config */}
                {node.type === 'extract' && (() => {
                  const schemasList = getLocalLabelSchemas();
                  const selectedSchemaId = node.data.schemaId || '';
                  const selectedSchema = schemasList.find(s => s.id === selectedSchemaId);
                  
                  return (
                    <div className="space-y-6">
                      <div>
                        <h3 className="text-sm font-black text-[#010136] uppercase tracking-wider mb-2">
                          {language === 'TH' ? 'ตั้งค่าสกัดข้อมูล (Extract Node Settings)' : 'Extract Node Settings'}
                        </h3>
                        <p className="text-xs text-slate-500 mb-4 leading-relaxed font-sans">
                          {language === 'TH' 
                            ? 'ระบบจะแยกและตรวจดึงข้อมูลจากเอกสารตามกฎและสคีมาที่กำหนดไว้' 
                            : 'AI will parse, inspect, and extract document data according to selected schemas.'}
                        </p>
                      </div>

                      {/* Section 1: Label schema */}
                      <div className="p-4 bg-white border border-slate-200 shadow-sm rounded-[16px] space-y-4 font-sans">
                        <div className="flex items-center gap-2">
                          <Layers size={16} className="text-[#1f5df9]" />
                          <h4 className="text-xs font-black text-[#010136] uppercase tracking-wider">
                            Section 1: Label Schema <span className="text-rose-500 font-bold">*</span>
                          </h4>
                        </div>
                        
                        <div className="space-y-2">
                          {schemasList.length === 0 ? (
                            <div className="bg-slate-50 p-4 border border-slate-200 rounded-[4px] space-y-2">
                              <p className="text-xs font-semibold text-slate-500">
                                {language === 'TH' ? 'ยังไม่มี Schema ในระบบ' : 'No schemas found in the system'}
                              </p>
                              <button
                                type="button"
                                onClick={() => {
                                  setDrawerNodeId(null);
                                  window.dispatchEvent(new CustomEvent('change-view', { detail: 'SETTINGS_LABEL_SCHEMA' }));
                                }}
                                className="text-[#1f5df9] hover:underline font-bold text-xs flex items-center gap-1 cursor-pointer"
                              >
                                {language === 'TH' ? 'ไปสร้าง Label schema →' : 'Go to create Label schema →'}
                              </button>
                            </div>
                          ) : (
                            <div className="space-y-3">
                              <select 
                                value={selectedSchemaId}
                                onChange={(e) => updateNodeData(node.id, { schemaId: e.target.value })}
                                className="w-full bg-slate-50 p-3 text-xs font-bold text-[#010136] border border-slate-200 rounded-[4px] focus:outline-none focus:border-[#1f5df9] focus:ring-1 focus:ring-[#1f5df9]/20 transition-all cursor-pointer"
                              >
                                <option value="" disabled className="text-slate-400">
                                  {language === 'TH' ? '-- เลือก Label Schema --' : '-- Choose Label Schema --'}
                                </option>
                                {schemasList.map(s => (
                                  <option key={s.id} value={s.id}>
                                    {s.name}
                                  </option>
                                ))}
                              </select>

                              {/* Schema Summary Preview */}
                              {selectedSchema && (
                                <div className="p-4 bg-blue-50/40 border border-blue-100 rounded-[8px] space-y-3 animate-in fade-in duration-200">
                                  <p className="text-[10px] font-black text-[#1f5df9] uppercase tracking-wider">
                                    {language === 'TH' ? 'สรุป Schema ที่เลือก:' : 'Selected Schema Summary:'}
                                  </p>
                                  <div className="space-y-2">
                                    {(selectedSchema.configs || []).map((config: any) => {
                                      const docTypeName = currentDocTypes.find((dt: any) => dt.id === config.docTypeId)?.name || config.docTypeId;
                                      const labelCount = config.labels?.length || 0;
                                      return (
                                        <div key={config.docTypeId} className="flex items-center justify-between bg-white px-3 py-2 rounded-lg border border-blue-100/40">
                                          <div className="flex items-center gap-1.5">
                                            <FileText size={12} className="text-[#1f5df9]" />
                                            <span className="text-[11px] font-black text-slate-700">{docTypeName}</span>
                                          </div>
                                          <span className="text-[10px] font-black bg-blue-50 text-[#1f5df9] px-2 py-0.5 rounded" style={{ borderRadius: '4px' }}>
                                            {labelCount} {language === 'TH' ? 'Labels' : 'Labels'}
                                          </span>
                                        </div>
                                      );
                                    })}
                                    {(!selectedSchema.configs || selectedSchema.configs.length === 0) && (
                                      <p className="text-[11px] font-medium text-slate-500 italic">
                                        {language === 'TH' ? 'ไม่มีโครงร่างเอกสารในสคีมานี้' : 'No document configurations present in this schema'}
                                      </p>
                                    )}
                                  </div>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Section 2: Confidence Threshold */}
                      <div className="p-4 bg-white border border-slate-200 shadow-sm rounded-[16px] space-y-4 font-sans">
                        <div className="flex items-center gap-2">
                          <ShieldCheck size={16} className="text-[#1f5df9]" />
                          <h4 className="text-xs font-black text-[#010136] uppercase tracking-wider">
                            Section 2: Confidence Threshold <span className="text-rose-500 font-bold">*</span>
                          </h4>
                        </div>
                        
                        <div className="space-y-4">
                          {(() => {
                            const currentValue = node.data.confidenceThreshold !== undefined ? Number(node.data.confidenceThreshold) : 80;
                            return (
                              <div className="space-y-4">
                                <div className="flex items-center gap-4">
                                  <input 
                                    type="range"
                                    min="0"
                                    max="100"
                                    value={currentValue}
                                    onChange={(e) => {
                                      updateNodeData(node.id, { confidenceThreshold: Number(e.target.value) });
                                    }}
                                    className="flex-1 accent-[#1f5df9] h-2 bg-slate-100 rounded-lg appearance-none cursor-pointer"
                                  />
                                  <div className="flex items-center gap-1 bg-blue-50 border border-blue-100 px-3 py-1" style={{ borderRadius: '4px' }}>
                                    <span className="text-xs font-black text-[#1f5df9] font-mono">{currentValue}%</span>
                                  </div>
                                </div>

                                <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-slate-100/50">
                                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mr-1">Presets:</span>
                                  {[50, 70, 80, 90, 100].map((preset) => {
                                    const isSelected = currentValue === preset;
                                    return (
                                      <button
                                        key={preset}
                                        type="button"
                                        onClick={() => updateNodeData(node.id, { confidenceThreshold: preset })}
                                        className={`px-3 py-1 text-xs font-black font-mono transition-all cursor-pointer ${
                                          isSelected 
                                            ? 'bg-[#1f5df9] border-[#1f5df9] text-white shadow-sm' 
                                            : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100 hover:border-slate-300'
                                        }`}
                                        style={{ borderRadius: '4px' }}
                                      >
                                        {preset}%
                                      </button>
                                    );
                                  })}
                                </div>

                                <div className="bg-slate-50 border border-slate-100 p-3 rounded-[8px]">
                                  <p className="text-[10px] font-bold text-slate-500 leading-relaxed font-sans">
                                    {language === 'TH' 
                                      ? `≥ ${currentValue}% → auto-accept ไหลต่อได้เลย` 
                                      : `≥ ${currentValue}% → auto-accept can flow through`}
                                    <br />
                                    {language === 'TH' 
                                      ? `< ${currentValue}% → ขึ้นอยู่กับ Allow review` 
                                      : `< ${currentValue}% → depends on Allow review`}
                                  </p>
                                </div>
                              </div>
                            );
                          })()}
                        </div>
                      </div>

                      {/* Section 3: Allow Review */}
                      <div className="p-4 bg-white border border-slate-200 shadow-sm rounded-[16px] space-y-4 font-sans">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <UserCheck size={16} className="text-[#1f5df9]" />
                            <h4 className="text-xs font-black text-[#010136] uppercase tracking-wider">
                              Section 3: Allow Review
                            </h4>
                          </div>
                          
                          <button
                            type="button"
                            onClick={() => {
                              const newVal = node.data.allowReview === false ? true : false;
                              updateNodeData(node.id, { allowReview: newVal });
                            }}
                            className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-[20px] border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                              node.data.allowReview !== false ? 'bg-[#1f5df9]' : 'bg-slate-200'
                            }`}
                          >
                            <span
                              className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                                node.data.allowReview !== false ? 'translate-x-5' : 'translate-x-0'
                              }`}
                            />
                          </button>
                        </div>
                        
                        <div className="p-3 bg-slate-50/80 rounded-[8px] border border-slate-100/50">
                          <p className="text-[11px] font-bold text-slate-600 leading-relaxed">
                            {node.data.allowReview !== false ? (
                              language === 'TH' 
                                ? 'ถ้า field ไหน confidence ต่ำกว่า threshold ระบบจะหยุดรอ และส่งไปให้ user review ใน Job detail ก่อน แล้วค่อยไหลต่อ' 
                                : 'If any field has confidence below the threshold, the system will pause and send it to the Human Review Queue in Job detail before proceeding.'
                            ) : (
                              language === 'TH' 
                                ? 'ระบบใช้ค่าที่ AI ดึงมาทั้งหมด ไม่ว่า confidence จะเป็นเท่าไหร่ ไหลต่อทันทีโดยไม่รอ review' 
                                : 'The system uses all values extracted by the AI regardless of confidence and proceeds immediately without waiting for human review.'
                            )}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })()}

                {/* Generic Config for other nodes */}
                {node.type !== 'get_file' && node.type !== 'hybrid_mail_filter' && node.type !== 'attachment_filter' && node.type !== 'group_of_file' && node.type !== 'create_job' && node.type !== 'send_to' && node.type !== 'compare' && node.type !== 'storage' && node.type !== 'extract' && (
                  <div className="flex flex-col items-center justify-center h-[200px] text-center opacity-40">
                    <Settings size={40} className="mb-4" />
                    <p className="text-sm font-bold uppercase tracking-tight">Configuration module coming soon</p>
                  </div>
                )}
              </div>

              {/* Drawer Footer */}
              <div className="p-6 border-t border-slate-100 flex gap-3 bg-white">
                <button 
                  onClick={() => setDrawerNodeId(null)}
                  className="flex-1 py-3.5 bg-slate-50 text-slate-600 rounded-[4px] font-black text-[10px] uppercase hover:bg-slate-100 transition-all border border-slate-200 tracking-widest"
                >
                  {language === 'TH' ? 'ยกเลิก' : 'Cancel'}
                </button>
                <button 
                  onClick={() => {
                    updateNodeData(node.id, { isConfigured: true });
                    setToast({ 
                      message: language === 'TH' ? 'บันทึกการตั้งค่าสำเร็จ' : 'Configuration saved', 
                      type: 'success' 
                    });
                    setDrawerNodeId(null);
                  }}
                  disabled={isNodeIncomplete(node)}
                  className={`flex-[2] py-3.5 rounded-[4px] font-black text-[10px] uppercase transition-all tracking-widest ${
                    isNodeIncomplete(node)
                      ? 'bg-slate-200 text-slate-400 cursor-not-allowed border border-slate-300 shadow-none'
                      : 'bg-blue-600 text-white hover:bg-blue-700 shadow-[0_10px_25px_-5px_rgba(37,99,235,0.4)] active:scale-[0.98]'
                  }`}
                >
                  {language === 'TH' ? 'บันทึกการตั้งค่า' : 'Save Configuration'}
                </button>
              </div>
            </div>
          );
        })()
      )}

      {/* Toast Notification */}
      <AnimatePresence>
        {showHistoryDrawer && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowHistoryDrawer(false)}
              className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[2500]"
            />
            <motion.div 
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed inset-y-0 right-0 w-full max-w-4xl bg-slate-50 shadow-2xl z-[2600] flex flex-col border-l border-slate-200"
            >
              {/* History Header */}
              <div className="bg-white px-8 py-6 border-b border-slate-200 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-6">
                  <button 
                    onClick={() => setShowHistoryDrawer(false)}
                    className="p-2 hover:bg-slate-100 rounded-[4px] text-slate-400 hover:text-slate-600 transition-all"
                  >
                    <X size={20} />
                  </button>
                  <h2 className="text-xl font-black text-slate-800 uppercase tracking-tight font-sans">
                    {language === 'TH' ? 'ประวัติการรัน Workflow' : 'Workflow Run History'}
                  </h2>
                </div>
              </div>

              {/* Stats & Refresh */}
              <div className="px-8 py-4 flex items-center justify-between shrink-0 font-sans">
                <span className="text-xs font-black text-slate-400 uppercase tracking-widest">
                  {historyData.length} {language === 'TH' ? 'การรัน' : 'Runs'}
                </span>
                <button 
                  onClick={() => {
                    setIsRefreshingHistory(true);
                    setTimeout(() => setIsRefreshingHistory(false), 800);
                  }}
                  className="flex items-center gap-2 text-xs font-black text-slate-600 hover:text-blue-600 transition-colors uppercase tracking-widest group"
                >
                  <RefreshCw size={14} className={`${isRefreshingHistory ? 'animate-spin' : ''} transition-transform group-hover:rotate-180 duration-500`} />
                  {language === 'TH' ? 'รีเฟรช' : 'Refresh'}
                </button>
              </div>

              {/* History List */}
              <div className="flex-1 overflow-y-auto px-8 pb-10 custom-scrollbar space-y-4 font-sans">
                {historyData.map((run) => (
                  <div key={run.id} className="group/run">
                    {/* Run Header Item */}
                    <div 
                      onClick={() => setExpandedRunId(expandedRunId === run.id ? null : run.id)}
                      className={`bg-white border rounded-2xl p-4 flex items-center justify-between transition-all cursor-pointer shadow-sm hover:shadow-md ${
                        expandedRunId === run.id ? 'border-blue-500 ring-4 ring-blue-500/5' : 'border-slate-200'
                      }`}
                    >
                      <div className="flex items-center gap-4">
                        <div className={`p-1 transition-transform duration-300 ${expandedRunId === run.id ? 'rotate-180' : ''}`}>
                          <ChevronDown size={18} className="text-slate-400" />
                        </div>
                        <div className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest ${
                          run.status === 'SUCCESS' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-rose-50 text-rose-600 border border-rose-100'
                        }`}>
                          {run.status === 'SUCCESS' ? (language === 'TH' ? 'สำเร็จ' : 'Success') : (language === 'TH' ? 'ล้มเหลว' : 'Failed')}
                        </div>
                        <span className="text-xs font-bold text-slate-700">{run.timestamp}</span>
                      </div>
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{run.duration}</span>
                    </div>

                    {/* Run Details (Expanded) */}
                    <AnimatePresence>
                      {expandedRunId === run.id && (
                        <motion.div 
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          className="overflow-hidden"
                        >
                          <div className="mt-4 bg-white border border-blue-500 rounded-2xl p-6 shadow-xl space-y-8 animate-in slide-in-from-top-2 duration-300">
                            {/* Trigger Data Section */}
                            <div className="space-y-4">
                              <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">TRIGGER DATA</h4>
                              <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100 font-mono text-[11px] leading-relaxed overflow-x-auto">
                                <pre>{JSON.stringify(run.triggerData, null, 2)}</pre>
                              </div>
                            </div>

                            {/* Node Executions Section */}
                            <div className="space-y-4">
                              <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">ผลการทำงานแต่ละ NODE</h4>
                              <div className="space-y-4">
                                {run.nodeExecutions.map((node) => (
                                  <div key={node.id} className="bg-white border border-slate-100 rounded-2xl shadow-sm overflow-hidden">
                                    <div className="p-4 bg-slate-50/50 border-b border-slate-100 flex items-center justify-between">
                                      <div className="flex items-center gap-3">
                                        <div className={`px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-widest ${
                                          node.status === 'SUCCESS' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
                                        }`}>
                                          {node.status === 'SUCCESS' ? (language === 'TH' ? 'สำเร็จ' : 'Success') : (language === 'TH' ? 'ผิดพลาด' : 'Error')}
                                        </div>
                                        <span className="text-xs font-black text-slate-800 uppercase tracking-tight">{node.title}</span>
                                      </div>
                                      <span className="text-[9px] font-mono text-slate-400 select-all">{node.id}</span>
                                    </div>
                                    <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                                      <div className="space-y-2">
                                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-1">Input</span>
                                        <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 font-mono text-[10px] max-h-[200px] overflow-y-auto custom-scrollbar">
                                          <pre>{JSON.stringify(node.input, null, 2)}</pre>
                                        </div>
                                      </div>
                                      <div className="space-y-2">
                                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-1">Output</span>
                                        <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 font-mono text-[10px] max-h-[200px] overflow-y-auto custom-scrollbar">
                                          <pre>{JSON.stringify(node.output, null, 2)}</pre>
                                        </div>
                                      </div>
                                    </div>
                                    <div className="px-4 py-2 bg-slate-50 border-t border-slate-100 flex items-center gap-4">
                                      <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                                        {language === 'TH' ? 'เริ่ม' : 'Start'}: {node.startTime}
                                      </span>
                                      <div className="w-1 h-1 rounded-full bg-slate-300"></div>
                                      <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                                        {language === 'TH' ? 'สิ้นสุด' : 'End'}: {node.endTime}
                                      </span>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>

                            {/* Timeline Section */}
                            <div className="space-y-4">
                              <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">TIMELINE</h4>
                              <div className="relative pl-8 space-y-8 before:absolute before:left-3 before:top-2 before:bottom-2 before:w-px before:bg-slate-200">
                                {run.timeline.map((item, idx) => (
                                  <div key={idx} className="relative">
                                    <div className={`absolute -left-8 top-1.5 w-6 h-6 rounded-full bg-white border-2 flex items-center justify-center z-10 ${
                                      item.status === 'COMPLETED' ? 'border-emerald-500' : 
                                      item.status === 'FAILED' ? 'border-rose-500' : 'border-blue-500'
                                    }`}>
                                      <div className={`w-2 h-2 rounded-full ${
                                        item.status === 'COMPLETED' ? 'bg-emerald-500' : 
                                        item.status === 'FAILED' ? 'bg-rose-50' : 'bg-blue-500'
                                      }`} />
                                    </div>
                                    <div className="flex flex-col gap-1">
                                      <div className="flex items-center gap-3">
                                        <span className="text-[10px] font-mono text-slate-400">{item.time}</span>
                                        <span className="text-[10px] font-black text-slate-800 uppercase tracking-widest">
                                          {item.event} {item.nodeName && <span className="text-slate-400 font-bold mx-1">—</span>} {item.nodeName}
                                        </span>
                                      </div>
                                      <p className="text-[10px] font-medium text-slate-500">{item.description}</p>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                ))}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

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
        {confirmToggleDialog && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[3000] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm"
          >
            <motion.div 
              initial={{ scale: 0.95, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 20 }}
              className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden border border-slate-100 text-center"
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
                    onClick={() => setConfirmToggleDialog(false)}
                    className="flex-1 py-2.5 border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 rounded-[4px] font-bold text-xs uppercase tracking-widest transition-all cursor-pointer h-[40px]"
                  >
                    {language === 'TH' ? 'ยกเลิก' : 'Cancel'}
                  </button>
                  <button 
                    onClick={() => {
                      setStatus('ACTIVE');
                      setConfirmToggleDialog(false);
                    }}
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

      <AnimatePresence>
        {deleteConfirmation && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[3000] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm"
          >
            <motion.div 
              initial={{ scale: 0.95, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 20 }}
              className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden border border-white text-center"
            >
              <div className="p-8">
                <div className="flex items-center justify-center mx-auto mb-6 text-amber-500">
                  <AlertCircle size={48} />
                </div>
                <h3 className="text-xl font-black text-[#010136] tracking-tight leading-tight mb-2">
                  {t.confirmDeleteNodeTitle}
                </h3>
                <p className="text-sm font-medium text-slate-500 leading-relaxed mb-8">
                  {t.confirmDeleteNodeWithEdges}
                </p>
                <div className="flex gap-3">
                  <button 
                    onClick={() => setDeleteConfirmation(null)}
                    className="flex-1 py-3 bg-slate-50 text-slate-600 rounded-[4px] font-black text-xs uppercase tracking-widest hover:bg-slate-100 transition-all border border-slate-200"
                  >
                    {t.btnCancel}
                  </button>
                  <button 
                    onClick={() => handleDeleteNode(deleteConfirmation.nodeId, true)}
                    className="flex-1 py-3 bg-[#1F5DF9] hover:bg-[#104BE3] text-white rounded-[4px] font-black text-xs uppercase tracking-widest transition-all shadow-md shadow-blue-500/15"
                  >
                    {language === 'TH' ? 'ลบทันที' : 'Confirm Delete'}
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
