import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { Select, Input } from 'antd';
import { 
  FileText, Plus, Trash2, Edit3, AlertCircle, XCircle, ArrowLeft, 
  Settings, Check, Search, Sparkles, X, Info, FileCode,
  LayoutGrid, List, Database, Layers
 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { DocType, Language, DocTypeSchemaField, Workflow } from '../types';
import { LabelSchemaSettings, DEFAULT_SCHEMAS, LabelSchema } from './LabelSchemaSettings';

const getFieldTypeLabel = (type: string, masterData?: string, lang: Language = 'TH'): string => {
  switch (type) {
    case 'text':
      return lang === 'TH' ? 'ข้อความสั้น' : 'Short Text';
    case 'text_long':
      return lang === 'TH' ? 'ข้อความยาว (Textarea)' : 'Long Text';
    case 'number':
      return lang === 'TH' ? 'ตัวเลข (จำนวนเต็ม)' : 'Integer';
    case 'number_decimal':
      return lang === 'TH' ? 'ตัวเลข (ทศนิยม)' : 'Decimal';
    case 'date':
      return lang === 'TH' ? 'วันที่' : 'Date';
    case 'time':
      return lang === 'TH' ? 'เวลา' : 'Time';
    case 'datetime_relative':
      return lang === 'TH' ? 'วันเวลาสัมพัทธ์' : 'Relative datetime';
    case 'boolean':
      return lang === 'TH' ? 'เปิด/ปิด' : 'Boolean';
    case 'advanced': {
      const mdLabel = (() => {
        switch (masterData) {
          case 'vendor': return lang === 'TH' ? 'ผู้ขาย' : 'Vendor';
          case 'customer': return lang === 'TH' ? 'ลูกค้า' : 'Customer';
          case 'product': return lang === 'TH' ? 'สินค้า' : 'Product';
          case 'employee': return lang === 'TH' ? 'พนักงาน' : 'Employee';
          case 'cost_center': return lang === 'TH' ? 'ศูนย์ต้นทุน' : 'Cost Center';
          case 'tax_id': return lang === 'TH' ? 'ผู้เสียภาษี' : 'Tax ID';
          default: return lang === 'TH' ? 'ข้อมูลหลัก' : 'Master Data';
        }
      })();
      return `${lang === 'TH' ? 'ข้อมูลหลัก' : 'Master'}: ${mdLabel}`;
    }
    default:
      return type || (lang === 'TH' ? 'ข้อความ' : 'Text');
  }
};

interface DocTypeMasterProps {
  language: Language;
  docTypes: DocType[];
  workflows?: Workflow[];
  comparisonWorkflows?: Workflow[];
  setComparisonWorkflows?: React.Dispatch<React.SetStateAction<Workflow[]>>;
  initialTab?: 'doctype' | 'schema';
  onAddDocType: (newType: DocType) => void;
  onUpdateDocType: (updatedType: DocType) => void;
  onDeleteDocType: (id: string) => void;
  onBack?: () => void;
}

export const DocTypeMaster: React.FC<DocTypeMasterProps> = ({
  language,
  docTypes,
  workflows = [],
  comparisonWorkflows = [],
  setComparisonWorkflows,
  initialTab = 'doctype',
  onAddDocType,
  onUpdateDocType,
  onDeleteDocType,
  onBack
}) => {
  const [activeTab, setActiveTab] = useState<'doctype' | 'schema'>(initialTab);

  React.useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);

  const [searchQuery, setSearchQuery] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingDocType, setEditingDocType] = useState<DocType | null>(null);
  const [viewMode, setViewMode] = useState<'CARD' | 'LIST'>('CARD');

  // Form states
  const [formId, setFormId] = useState('');
  const [formName, setFormName] = useState('');
  const [formHint, setFormHint] = useState('');
  const [formPattern, setFormPattern] = useState('');
  const [formTags, setFormTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [formSchema, setFormSchema] = useState<DocTypeSchemaField[]>([]);
  
  // Validation error state
  const [errorMsg, setErrorMsg] = useState('');
  const [jsonPreviewMode, setJsonPreviewMode] = useState<'schema' | 'output'>('schema');

  // Find workflows that use the docType
  const getWorkflowsUsingDocType = (docTypeId: string, docTypeName: string) => {
    const usingWorkflows: { id: string; name: string; type: 'standard' | 'comparison' }[] = [];
    
    workflows.forEach(wf => {
      let isUsed = false;
      wf.nodes?.forEach(node => {
        const d = node.data || {};
        if (node.type === 'group_of_file' && d.docTypesToDetect && Array.isArray(d.docTypesToDetect) && d.docTypesToDetect.includes(docTypeId)) {
          isUsed = true;
        }
        if (node.type === 'group_of_file' && d.fileTypes && Array.isArray(d.fileTypes)) {
          const matched = d.fileTypes.some((ft: string) => 
            ft.toUpperCase() === docTypeId.toUpperCase() || 
            ft.toUpperCase() === docTypeName.toUpperCase() ||
            (docTypeId === 'INV' && ft.toUpperCase() === 'INVOICE') ||
            (docTypeId === 'BL' && (ft.toUpperCase() === 'B/L' || ft.toUpperCase() === 'BOL'))
          );
          if (matched) isUsed = true;
        }
      });
      if (isUsed) {
        usingWorkflows.push({ id: wf.id, name: wf.name, type: 'standard' });
      }
    });

    comparisonWorkflows.forEach(wf => {
      let isUsed = false;
      wf.nodes?.forEach(node => {
        const d = node.data || {};
        if (node.type === 'group_of_file' && d.docTypesToDetect && Array.isArray(d.docTypesToDetect) && d.docTypesToDetect.includes(docTypeId)) {
          isUsed = true;
        }
        if (node.type === 'group_of_file' && d.fileTypes && Array.isArray(d.fileTypes)) {
          const matched = d.fileTypes.some((ft: string) => 
            ft.toUpperCase() === docTypeId.toUpperCase() || 
            ft.toUpperCase() === docTypeName.toUpperCase() ||
            (docTypeId === 'INV' && ft.toUpperCase() === 'INVOICE') ||
            (docTypeId === 'BL' && (ft.toUpperCase() === 'B/L' || ft.toUpperCase() === 'BOL'))
          );
          if (matched) isUsed = true;
        }
      });
      if (isUsed) {
        usingWorkflows.push({ id: wf.id, name: wf.name, type: 'comparison' });
      }
    });

    return usingWorkflows;
  };

  const [deleteConfirmDialog, setDeleteConfirmDialog] = useState<{
    isOpen: boolean;
    docType: DocType | null;
    usingWorkflows: { id: string; name: string; type: 'standard' | 'comparison' }[];
    usingSchemas?: LabelSchema[];
  }>({
    isOpen: false,
    docType: null,
    usingWorkflows: [],
    usingSchemas: []
  });

  // Auto-generate ID Code from Document Name (e.g., Invoice -> INV)
  const generateDocId = (name: string): string => {
    const cleanName = name.replace(/[^a-zA-Z0-9\s]/g, '');
    const words = cleanName.trim().split(/\s+/).filter(Boolean);
    if (words.length === 0) return '';
    if (words.length === 1) {
      return words[0].slice(0, 4).toUpperCase();
    }
    return words.map(w => w[0]).join('').slice(0, 4).toUpperCase();
  };

  const text = {
    TH: {
      title: "ตั้งค่า Doc Type",
      subtitle: "รายการประเภทเอกสารและคู่มือกำหนดรูปแบบชื่อไฟล์ให้ AI ตรวจสอบและประมวลผล",
      searchPlaceholder: "ค้นหาประเภทเอกสาร...",
      addBtn: "เพิ่ม Doc Type",
      colName: "ชื่อประเภทเอกสาร",
      colHint: "คำนำทางเพื่อแยกแยะ (Classifier Hint)",
      colPattern: "รูปแบบชื่อไฟล์ (Filename Patterns)",
      noPattern: "ไม่มีรูปแบบ (แสดง \"-\")",
      emptyTitle: "ไม่พบประเภทเอกสารในระบบ",
      emptyDesc: "ระบบยังไม่มีการลงทะเบียนประเภทเอกสารใดๆ คุณสามารถเพิ่มประเภทเอกสารได้ทันทีเพื่อให้ AI นำไปใช้งาน",
      modalAddTitle: "เพิ่มประเภทเอกสารใหม่",
      modalEditTitle: "แก้ไขประเภทเอกสาร",
      labelId: "รหัสเอกสาร (ID/Code)",
      labelIdPlaceholder: "เช่น INV, BL, PL",
      labelName: "ชื่อประเภทเอกสาร (Name)",
      labelNamePlaceholder: "เช่น Invoice, Packing List",
      labelHint: "คำนำทางตรวจสอบเอกสาร (AI Classifier Hint)",
      labelHintPlaceholder: "อธิบายเอกสารสั้นๆ เช่น เอกสารแสดงราคาสินค้า มักมีคำว่า Invoice No., Unit Price, Total Amount",
      labelPattern: "รูปแบบชื่อไฟล์ (Filename Patterns) - ใส่คอมมาคั่น",
      labelPatternPlaceholder: "เช่น INV_*, INVOICE_* (ละไว้ได้)",
      btnSave: "บันทึกข้อมูล",
      btnCancel: "ยกเลิก",
      confirmDelete: (name: string) => `คุณแน่ใจหรือไม่ว่าต้องการลบประเภทเอกสาร "${name}"? การดำเนินการนี้อาจส่งผลต่อการเชื่อมโยงระบบ`,
      errIdRequired: "กรุณาระบุรหัสเอกสาร (ID/Code)",
      errIdUnique: "รหัสเอกสารนี้มีอยู่แล้วในระบบ",
      errNameRequired: "กรุณาระบุชื่อ doc type",
      errNameUnique: "ชื่อนี้มีอยู่แล้ว",
      errHintRequired: "กรุณาระบุ hint เพื่อให้ AI classify ได้แม่นขึ้น",
      totalTypes: (count: number) => `มีประเภทเอกสารทั้งหมดในระบบ ${count} รายการ`,
      backBtn: "หน้าแรก",
      schemaTitle: "คีย์เวิร์ดที่ต้องตรวจสอบ (Schema/Fields)",
      schemaAddRow: "+ เพิ่มฟิลด์",
      schemaLabelName: "ชื่อฟิลด์ (เช่น Invoice No.)",
      schemaLabelRequired: "จำเป็น (REQUIRED)",
      schemaLabelConfidence: "ความแม่นยำขั้นต่ำ",
    },
    EN: {
      title: "Doc Type Settings",
      subtitle: "List of document types and filename signature guides for AI classification",
      searchPlaceholder: "Search document types...",
      addBtn: "Add Doc Type",
      colName: "Document Type",
      colHint: "AI Classifier Hint",
      colPattern: "Filename Patterns",
      noPattern: "No Pattern (displays \"-\")",
      emptyTitle: "No Document Types Found",
      emptyDesc: "There are no document types registered in the system. Create a new document type to make them recognizable by AI.",
      modalAddTitle: "Add New Document Type",
      modalEditTitle: "Edit Document Type",
      labelId: "Document ID/Code",
      labelIdPlaceholder: "e.g., INV, BL, PL",
      labelName: "Document Name",
      labelNamePlaceholder: "e.g., Invoice, Packing List",
      labelHint: "AI Classifier Hint",
      labelHintPlaceholder: "e.g., Commercial Invoice with billing details",
      labelPattern: "Filename Patterns (comma separated)",
      labelPatternPlaceholder: "e.g., INV_*, INVOICE_* (optional)",
      btnSave: "Save",
      btnCancel: "Cancel",
      confirmDelete: (name: string) => `Are you sure you want to delete "${name}"? This action could affect rule sequences.`,
      errIdRequired: "Document ID/Code is required",
      errIdUnique: "Document ID/Code must be unique",
      errNameRequired: "Document name is required",
      errNameUnique: "This document name already exists",
      errHintRequired: "Please specify hint to improve AI classification accuracy",
      totalTypes: (count: number) => `Total registered document types: ${count}`,
      backBtn: "Back",
      schemaTitle: "Document Fields (Schema)",
      schemaAddRow: "+ Add Field",
      schemaLabelName: "Field Name (e.g., Invoice No.)",
      schemaLabelRequired: "Required",
      schemaLabelConfidence: "Min Confidence",
    }
  }[language];

  const handleOpenAddModal = () => {
    setEditingDocType(null);
    setFormId('');
    setFormName('');
    setFormHint('');
    setFormPattern('');
    setFormTags([]);
    setTagInput('');
    setFormSchema([]);
    setErrorMsg('');
    setShowModal(true);
  };

  const handleOpenEditModal = (dt: DocType) => {
    setEditingDocType(dt);
    setFormId(dt.id);
    setFormName(dt.name);
    setFormHint(dt.hint);
    setFormPattern(dt.pattern || '');
    const initialTags = dt.pattern ? dt.pattern.split(',').map(t => t.trim()).filter(Boolean) : [];
    setFormTags(initialTags);
    setTagInput('');
    setFormSchema(dt.schema ? JSON.parse(JSON.stringify(dt.schema)) : []);
    setErrorMsg('');
    setShowModal(true);
  };

  const handleDelete = (dt: DocType) => {
    const usingWfs = getWorkflowsUsingDocType(dt.id, dt.name);
    
    // Check if there are schemas linked to this docType
    let usingSchemas: LabelSchema[] = [];
    try {
      const savedSchemas = typeof window !== 'undefined' ? localStorage.getItem('bizx_label_schemas_v3') : null;
      const schemas: LabelSchema[] = savedSchemas ? JSON.parse(savedSchemas) : DEFAULT_SCHEMAS;
      usingSchemas = schemas.filter(s => 
        s.docTypes && s.docTypes.some(id => 
          id.toUpperCase() === dt.id.toUpperCase() || 
          id.toUpperCase() === dt.name.toUpperCase()
        )
      );
    } catch (e) {
      console.error('Failed to parse saved schemas', e);
    }

    setDeleteConfirmDialog({
      isOpen: true,
      docType: dt,
      usingWorkflows: usingWfs,
      usingSchemas: usingSchemas
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    const trimmedName = formName.trim();
    const trimmedHint = formHint.trim();

    // Collect any unsaved text in tag input
    let finalTags = [...formTags];
    const residualInput = tagInput.trim();
    if (residualInput) {
      const parts = residualInput.split(/[\s,]+/).map(p => p.trim()).filter(Boolean);
      parts.forEach(part => {
        if (!finalTags.some(t => t.toUpperCase() === part.toUpperCase())) {
          finalTags.push(part);
        }
      });
    }

    if (!trimmedName) {
      setErrorMsg(text.errNameRequired);
      return;
    }

    // Check name duplication (case-insensitive)
    const nameExists = docTypes.some(d => 
      d.name.trim().toLowerCase() === trimmedName.toLowerCase() && 
      (!editingDocType || d.id !== editingDocType.id)
    );
    if (nameExists) {
      setErrorMsg(text.errNameUnique);
      return;
    }

    if (!trimmedHint) {
      setErrorMsg(text.errHintRequired);
      return;
    }

    // Auto-generate a guaranteed unique ID Code from Document Name (e.g., Invoice -> INV)
    const generateUniqueDocId = (name: string): string => {
      const cleanName = name.replace(/[^a-zA-Z0-9\s]/g, '');
      const words = cleanName.trim().split(/\s+/).filter(Boolean);
      let baseId = '';
      if (words.length === 0) {
        baseId = 'DOC';
      } else if (words.length === 1) {
        baseId = words[0].slice(0, 4).toUpperCase();
      } else {
        baseId = words.map(w => w[0]).join('').slice(0, 4).toUpperCase();
      }
      
      let candidateId = baseId;
      let counter = 2;
      while (docTypes.some(d => d.id.toUpperCase() === candidateId)) {
        candidateId = `${baseId}${counter}`;
        counter++;
      }
      return candidateId;
    };

    const trimmedId = editingDocType ? editingDocType.id : generateUniqueDocId(trimmedName);

    const docTypeData: DocType = {
      id: trimmedId,
      name: trimmedName,
      hint: trimmedHint,
      pattern: finalTags.length > 0 ? finalTags.join(', ') : undefined,
      schema: formSchema.filter(f => f.name.trim() !== '')
    };

    if (editingDocType) {
      onUpdateDocType(docTypeData);
    } else {
      onAddDocType(docTypeData);
    }

    setShowModal(false);
  };

  const filteredDocTypes = docTypes.filter(d => 
    d.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    d.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
    d.hint.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (d.pattern && d.pattern.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="bg-white border border-slate-200/80 rounded-3xl p-4 shadow-sm space-y-6" id="doc-type-master-wrapper">
      {/* Header Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-100">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h1 className="text-xl md:text-2xl font-black text-slate-800 tracking-tight flex items-center gap-2">
              <Settings className="text-blue-600 animate-spin-slow" size={22} />
              {text.title}
            </h1>
          </div>
          <p className="text-xs md:text-sm text-slate-500 font-medium leading-relaxed">
            {text.subtitle}
          </p>
        </div>

        {/* Buttons have been moved to the search row below */}
      </div>

      {/* Tab Switcher */}
      <div className="flex border-b border-slate-100 pb-px">
        <button
          type="button"
          onClick={() => setActiveTab('doctype')}
          className={`flex items-center gap-2 px-5 py-3 text-xs md:text-sm font-black uppercase tracking-wider transition-all border-b-2 -mb-px cursor-pointer ${
            activeTab === 'doctype'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-400 hover:text-slate-600'
          }`}
        >
          <Settings size={16} />
          <span>{language === 'TH' ? 'ตั้งค่าประเภทเอกสาร (Doc Type)' : 'Doc Type Settings'}</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('schema')}
          className={`flex items-center gap-2 px-5 py-3 text-xs md:text-sm font-black uppercase tracking-wider transition-all border-b-2 -mb-px cursor-pointer ${
            activeTab === 'schema'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-400 hover:text-slate-600'
          }`}
        >
          <Layers size={16} />
          <span>{language === 'TH' ? 'ตั้งค่า Label schema' : 'Label Schema Settings'}</span>
        </button>
      </div>

      {activeTab === 'doctype' ? (
        <div className="flex flex-col gap-4 !mt-4 animate-in fade-in duration-300" id="doctype-tab-panel">
          {/* Control Filter row & total display */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <Input
                type="text"
                className="w-full text-xs font-semibold px-10 border border-slate-200/80 shadow-xs focus:ring-1 focus:ring-blue-500/25 transition-all font-sans"
                style={{ height: '38px', borderRadius: '4px' }}
                placeholder={text.searchPlaceholder}
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
              {/* View Toggle */}
              <div className="flex bg-slate-200/60 p-1 border border-slate-200/40 h-[38px] items-center" style={{ borderRadius: '4px' }}>
                <button
                  type="button"
                  onClick={() => setViewMode('CARD')}
                  className={`h-full px-2.5 rounded-[4px]-sm transition-all duration-200 flex items-center justify-center cursor-pointer ${
                    viewMode === 'CARD'
                      ? 'bg-white text-blue-600 shadow-sm'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                  style={{ borderRadius: '2px' }}
                  title="Card View"
                >
                  <LayoutGrid size={14} />
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('LIST')}
                  className={`h-full px-2.5 rounded-[4px]-sm transition-all duration-200 flex items-center justify-center cursor-pointer ${
                    viewMode === 'LIST'
                      ? 'bg-white text-blue-600 shadow-sm'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                  style={{ borderRadius: '2px' }}
                  title="List View"
                >
                  <List size={14} />
                </button>
              </div>

              {/* "+ เพิ่ม DOC TYPE" button on the same row, far right */}
              <button
                type="button"
                onClick={handleOpenAddModal}
                className="h-[38px] px-4 bg-[#1f5df9] hover:bg-blue-700 active:scale-95 text-white font-bold text-xs uppercase tracking-wider shadow-md shadow-blue-500/10 flex items-center gap-2 transition cursor-pointer"
                style={{ borderRadius: '4px' }}
              >
                <Plus size={15} strokeWidth={2.5} />
                <span>{language === 'TH' ? 'เพิ่ม DOC TYPE' : 'ADD DOC TYPE'}</span>
              </button>
            </div>
          </div>

      {/* Main Area */}
      {docTypes.length === 0 ? (
        /* Empty State */
        <div className="bg-white border border-slate-200/80 rounded-2xl p-12 text-center max-w-xl mx-auto shadow-sm space-y-6 animate-in fade-in-50 duration-500">
          <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mx-auto border border-blue-100 shadow-inner">
            <FileText size={28} className="text-blue-600 animate-bounce-subtle" />
          </div>
          <div className="space-y-2">
            <h3 className="text-base font-black text-slate-700 tracking-tight0">
              {text.emptyTitle}
            </h3>
            <p className="text-xs text-slate-500 leading-relaxed max-w-md mx-auto">
              {text.emptyDesc}
            </p>
          </div>
          <button
            onClick={handleOpenAddModal}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-black text-xs uppercase tracking-wider rounded-[4px] transition shadow-md shadow-blue-500/10 hover:shadow-blue-500/20 active:scale-95 cursor-pointer mx-auto"
          >
            <Plus size={16} strokeWidth={2.5} />
            <span>{text.addBtn}</span>
          </button>
        </div>
      ) : viewMode === 'CARD' ? (
        /* Grid List of Doc Types */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4" id="doc-type-master-grid">
          {filteredDocTypes.map((dt) => (
            <div 
              key={dt.id} 
              className="bg-white border border-slate-200/70 rounded-[8px] p-5 shadow-sm hover:shadow-md transition-all duration-300 group flex flex-col justify-between gap-4 relative overflow-hidden"
            >

              <div className="space-y-3">
                {/* ID Badge & Header */}
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="h-8 pl-2 pr-2.5 bg-blue-50 border border-blue-100/85 rounded-lg flex items-center gap-1.5 text-blue-600/90 shadow-2xs shrink-0 select-none">
                      <FileText size={12} strokeWidth={2.5} className="text-blue-500" />
                      <span className="text-[10px] font-mono font-black uppercase tracking-wider">{dt.id}</span>
                    </div>
                    <h3 className="text-sm font-black text-slate-800 tracking-tight group-hover:text-blue-700 transition-colors uppercase">
                      {dt.name}
                    </h3>
                  </div>
                  
                  {/* Action Buttons */}
                  <div className="flex items-center gap-1 opacity-60 group-hover:opacity-100 transition-opacity">
                    <button
                      type="button"
                      onClick={() => handleOpenEditModal(dt)}
                      className="p-1.5 hover:bg-slate-100 text-slate-500 hover:text-blue-600 rounded-[4px] transition-colors cursor-pointer"
                      title={text.modalEditTitle}
                    >
                      <Edit3 size={13} />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(dt)}
                      className="p-1.5 hover:bg-rose-50 text-slate-500 hover:text-destructive rounded-[4px] transition-colors cursor-pointer"
                      title="Delete"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>

                {/* AI Hint Section */}
                <div className="space-y-1.5 bg-slate-50/60 p-3 rounded-xl border border-slate-100/80">
                  <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1">
                    <Sparkles size={9} className="text-amber-500" />
                    {text.colHint}
                  </span>
                  <p className="text-xs font-medium text-slate-600 line-clamp-2 leading-relaxed font-sans">
                    {dt.hint}
                  </p>
                </div>

                {/* File Pattern Signature Indicator */}
                <div className="space-y-1 px-1">
                  <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1">
                    <FileCode size={9} />
                    {text.colPattern}
                  </span>
                  <div className="flex items-center flex-wrap gap-1 mt-1">
                    {dt.pattern ? (
                      dt.pattern.split(',').map((pat, idx) => (
                        <span key={idx} className="bg-emerald-50 border border-emerald-100 text-emerald-700 px-2 py-0.5 rounded-md text-[9px] font-mono font-bold uppercase tracking-tight">
                          {pat.trim()}
                        </span>
                      ))
                    ) : (
                      <span className="text-xs font-bold text-slate-400">
                        {text.noPattern.includes('-') ? '-' : text.noPattern}
                      </span>
                    )}
                  </div>
                </div>

                {/* Schema Fields Indicator */}
                <div className="space-y-1 px-1 pt-2.5 border-t border-slate-100">
                  <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1">
                    <Database size={9} className="text-blue-500" />
                    {language === 'TH' ? 'โครงสร้างฟิลด์ข้อมูลที่ต้องระบุ (Schema)' : 'Required Field Schema'}
                  </span>
                  <div className="flex items-center flex-wrap gap-1 mt-1">
                    {dt.schema && dt.schema.length > 0 ? (
                      <>
                        {dt.schema.slice(0, 3).map((f, idx) => (
                          <span key={f.id || idx} className="bg-blue-50/50 border border-blue-100/60 text-blue-700 px-2 py-0.5 rounded-md text-[9px] font-bold tracking-tight flex items-center gap-1">
                            <span>{f.name}</span>
                            <span className="text-slate-400 font-medium text-[8px]">({getFieldTypeLabel(f.type, f.masterData, language)})</span>
                            {f.required && <span className="text-rose-500 font-extrabold" title="Required">*</span>}
                          </span>
                        ))}
                        {dt.schema.length > 3 && (
                          <span className="bg-slate-100 border border-slate-200 text-slate-600 px-2.5 py-0.5 rounded-md text-[9px] font-black tracking-tight" title={dt.schema.slice(3).map(f => f.name).join(', ')}>
                            +{dt.schema.length - 3}
                          </span>
                        )}
                      </>
                    ) : (
                      <span className="text-[10px] font-bold text-slate-400 italic">
                        {language === 'TH' ? 'ยังไม่ได้กำหนดฟิลด์' : 'No fields defined'}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* List view - clean table layout */
        <div className="overflow-x-auto border border-slate-250/20 rounded-2xl bg-white shadow-xs animate-in fade-in duration-300" id="doc-type-master-table">
          <table className="min-w-full divide-y divide-slate-100">
            <thead className="bg-slate-50/75">
              <tr>
                <th scope="col" className="px-6 py-4 text-left text-[11px] font-black text-slate-400 uppercase tracking-wider w-24">
                  ID
                </th>
                <th scope="col" className="px-6 py-4 text-left text-[11px] font-black text-slate-400 uppercase tracking-wider w-48">
                  {text.colName}
                </th>
                <th scope="col" className="px-6 py-4 text-left text-[11px] font-black text-slate-400 uppercase tracking-wider">
                  {text.colHint}
                </th>
                <th scope="col" className="px-6 py-4 text-left text-[11px] font-black text-slate-400 uppercase tracking-wider">
                  {language === 'TH' ? 'โครงสร้างฟิลด์ข้อมูล (Schema)' : 'Schema Fields'}
                </th>
                <th scope="col" className="px-6 py-4 text-left text-[11px] font-black text-slate-400 uppercase tracking-wider max-w-[200px]">
                  {text.colPattern}
                </th>
                <th scope="col" className="relative px-6 py-4 w-28 text-right">
                  <span className="text-[11px] font-black text-slate-400 uppercase tracking-wider pr-4">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-150/10 bg-white">
              {filteredDocTypes.map((dt) => (
                <tr key={dt.id} className="hover:bg-slate-50/50 transition-colors group">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="bg-blue-50 border border-blue-100 px-2.5 py-1 rounded-lg text-[10px] font-black text-blue-600 uppercase tracking-widest font-mono shadow-sm">
                      {dt.id}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-black text-slate-800 uppercase tracking-tight">
                    {dt.name}
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-xs font-semibold text-slate-600 line-clamp-1 font-sans" title={dt.hint}>
                      {dt.hint}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center flex-wrap gap-1 max-w-[280px] overflow-hidden">
                      {dt.schema && dt.schema.length > 0 ? (
                        <>
                          {dt.schema.slice(0, 3).map((f, idx) => (
                            <span key={f.id || idx} className="bg-blue-50/50 border border-blue-100/60 text-blue-700 px-1.5 py-0.5 rounded text-[9px] font-bold tracking-tight flex items-center gap-1">
                              <span>{f.name}</span>
                              <span className="text-slate-400 font-medium text-[8px]">({getFieldTypeLabel(f.type, f.masterData, language)})</span>
                              {f.required && <span className="text-rose-500 font-extrabold" title="Required">*</span>}
                            </span>
                          ))}
                          {dt.schema.length > 3 && (
                            <span className="bg-slate-100 border border-slate-200 text-slate-600 px-1.5 py-0.5 rounded text-[9px] font-black tracking-tight" title={dt.schema.slice(3).map(f => f.name).join(', ')}>
                              +{dt.schema.length - 3}
                            </span>
                          )}
                        </>
                      ) : (
                        <span className="text-xs text-slate-400 italic font-medium">
                          {language === 'TH' ? 'ยังไม่ได้กำหนดฟิลด์' : 'No fields'}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center flex-wrap gap-1 max-w-[240px] overflow-hidden">
                      {dt.pattern ? (
                        dt.pattern.split(',').map((pat, idx) => (
                          <span key={idx} className="bg-emerald-50 border border-emerald-100 text-emerald-700 px-2 py-0.5 rounded-md text-[9px] font-mono font-bold uppercase tracking-tight">
                            {pat.trim()}
                          </span>
                        ))
                      ) : (
                        <span className="text-xs font-bold text-slate-400">
                          -
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right">
                    <div className="flex items-center justify-end gap-1 opacity-60 group-hover:opacity-100 transition-opacity pr-2">
                      <button
                        type="button"
                        onClick={() => handleOpenEditModal(dt)}
                        className="p-1.5 hover:bg-slate-100 text-slate-500 hover:text-blue-600 rounded-[4px] transition-colors cursor-pointer"
                        title={text.modalEditTitle}
                      >
                        <Edit3 size={13} />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(dt)}
                        className="p-1.5 hover:bg-rose-50 text-slate-500 hover:text-destructive rounded-[4px] transition-colors cursor-pointer"
                        title="Delete"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
        </div>
      ) : (
        <div className="!mt-4" id="schema-tab-panel">
          <LabelSchemaSettings
            language={language}
            docTypes={docTypes}
            workflows={workflows}
            comparisonWorkflows={comparisonWorkflows}
            setComparisonWorkflows={setComparisonWorkflows}
            hideHeader={true}
          />
        </div>
      )}

      {/* Slide-In Form Drawer */}
      {typeof document !== 'undefined' && createPortal(
        <AnimatePresence>
          {showModal && (
            <div className="fixed inset-0 z-[9999] flex justify-end" id="doc-type-master-drawer-container">
              {/* Backdrop Overlay */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setShowModal(false)}
                className="absolute inset-0 bg-slate-900/40 backdrop-blur-xs cursor-pointer"
              />

              {/* Slide-out Panel */}
              <motion.div
                initial={{ x: '100%' }}
                animate={{ x: 0 }}
                exit={{ x: '100%' }}
                transition={{ type: 'spring', damping: 25, stiffness: 220 }}
                className="relative w-full max-w-2xl h-full bg-white border-l border-slate-200/80 shadow-2xl flex flex-col z-10"
              >
                {/* Drawer Header */}
                <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center text-blue-600 border border-blue-100 animate-in spin-in-12 duration-500">
                      <FileText size={16} />
                    </div>
                    <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider">
                      {editingDocType ? text.modalEditTitle : text.modalAddTitle}
                    </h3>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 rounded-lg border-none bg-transparent cursor-pointer transition-colors"
                  >
                    <X size={20} />
                  </button>
                </div>

                {/* Drawer Form Content (with scrollable context) */}
                <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
                  {errorMsg && (
                    <div className="p-3 bg-rose-50 border border-rose-100 rounded-xl text-rose-600 text-xs font-semibold flex items-center gap-2 animate-in shake duration-300">
                      <AlertCircle size={14} className="shrink-0 text-rose-500" />
                      <span>{errorMsg}</span>
                    </div>
                  )}

                  {/* Name input */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center">
                      <span>{text.labelName}</span>
                      <span className="text-red-500 font-black text-sm ml-1 select-none" title="Required">*</span>
                    </label>
                    <Input
                      type="text"
                      style={{ borderRadius: 4 }}
                      className="w-full text-xs font-bold h-[40px] px-4"
                      placeholder={text.labelNamePlaceholder}
                      value={formName}
                      onChange={(e) => setFormName(e.target.value)}
                    />
                  </div>

                  {/* AI Classifier Hint Input */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center">
                      <span>{text.labelHint}</span>
                      <span className="text-red-500 font-black text-sm ml-1 select-none" title="Required">*</span>
                      <Tooltip content="Tell the AI what key markers to find in this doc to categorize it.">
                        <Info size={12} className="text-slate-400 cursor-pointer ml-1.5" />
                      </Tooltip>
                    </label>
                    <Input.TextArea
                      style={{ borderRadius: 4 }}
                      className="w-full min-h-[100px] text-xs font-semibold px-4 py-2.5 resize-none font-sans"
                      placeholder={text.labelHintPlaceholder}
                      value={formHint}
                      onChange={(e) => setFormHint(e.target.value)}
                    />
                  </div>

                  {/* Filename patterns tag input */}
                  <div className="space-y-1.5 flex flex-col">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                      {text.labelPattern}
                    </label>
                    
                    {/* Tag box container */}
                    <div className="w-full bg-slate-50/50 border border-slate-200 focus-within:ring-2 focus-within:ring-blue-500/10 focus-within:border-blue-400 p-2 transition min-h-[44px] flex flex-wrap items-center gap-2" style={{ borderRadius: 4 }}>
                      {formTags.map((tag, idx) => (
                        <span 
                          key={idx} 
                          className="bg-blue-50 border border-blue-100/80 text-blue-700 text-[10px] font-extrabold px-2 py-1 rounded-lg flex items-center gap-1 uppercase select-none font-mono tracking-wider shadow-sm animate-in zoom-in-95 duration-200"
                        >
                          {tag}
                          <button
                            type="button"
                            onClick={() => setFormTags(formTags.filter((_, tIdx) => tIdx !== idx))}
                            className="hover:bg-blue-200/50 hover:text-blue-900 rounded-[4px] p-0.5 text-blue-400 transition cursor-pointer"
                          >
                            <X size={10} strokeWidth={3} />
                          </button>
                        </span>
                      ))}
                      <Input
                        type="text"
                        variant="borderless"
                        className="flex-1 text-xs font-bold px-2 py-1 placeholder:text-slate-400 min-w-[100px]"
                        placeholder={formTags.length === 0 ? text.labelPatternPlaceholder : ""}
                        value={tagInput}
                        onChange={(e) => {
                          const val = e.target.value;
                          if (val.endsWith(',')) {
                            const newTag = val.slice(0, -1).trim();
                            if (newTag && !formTags.some(t => t.toUpperCase() === newTag.toUpperCase())) {
                              setFormTags([...formTags, newTag]);
                            }
                            setTagInput('');
                          } else {
                            setTagInput(val);
                          }
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            const newTag = tagInput.trim();
                            if (newTag && !formTags.some(t => t.toUpperCase() === newTag.toUpperCase())) {
                              setFormTags([...formTags, newTag]);
                            }
                            setTagInput('');
                          } else if (e.key === 'Backspace' && !tagInput && formTags.length > 0) {
                            setFormTags(formTags.slice(0, -1));
                          }
                        }}
                      />
                    </div>
                    
                    <span className="text-[10px] text-slate-400 font-semibold px-1 select-none leading-relaxed">
                      {language === 'TH' 
                        ? "คำแนะนำ: ใช้ * แทนอักขระใดก็ได้ ถ้าไม่มี pattern ระบบจะใช้ file content + hint แทน"
                        : "Tip: Use * as wildcard. If patterns are empty, system uses file content + hint instead."}
                    </span>
                  </div>

                  {/* The Schema Settings and JSON Preview sections have been removed. */}

                </form>

                {/* Drawer Footer */}
                <div className="p-6 border-t border-slate-100 bg-slate-50/40 flex items-center justify-end gap-3 shadow-[0_-4px_20px_rgba(0,0,0,0.01)]">
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="px-4 py-2.5 bg-white border border-slate-200 hover:bg-slate-50 active:scale-95 text-slate-600 hover:text-slate-800 font-bold text-xs uppercase tracking-wider rounded-[4px] shadow-xs transition cursor-pointer"
                  >
                    {text.btnCancel}
                  </button>
                  <button
                    type="submit"
                    onClick={handleSubmit}
                    className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white font-black text-xs uppercase tracking-wider rounded-[4px] shadow-md shadow-blue-500/10 transition cursor-pointer"
                  >
                    {text.btnSave}
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>,
        document.body
      )}

      {/* Custom Deletion Confirmation Dialog */}
      {typeof document !== 'undefined' && createPortal(
        <AnimatePresence>
          {deleteConfirmDialog.isOpen && deleteConfirmDialog.docType && (
            <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4">
              {/* Backdrop */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setDeleteConfirmDialog({ isOpen: false, docType: null, usingWorkflows: [], usingSchemas: [] })}
                className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm cursor-pointer"
              />

              {/* Dialog Body */}
              <motion.div
                initial={{ scale: 0.95, y: 20, opacity: 0 }}
                animate={{ scale: 1, y: 0, opacity: 1 }}
                exit={{ scale: 0.95, y: 20, opacity: 0 }}
                transition={{ type: 'spring', damping: 25, stiffness: 250 }}
                className="relative bg-white rounded-2xl shadow-2xl border border-slate-100 max-w-md w-full overflow-hidden z-10 p-6 text-center"
              >
                {/* Warning Yellow/Red Icon with no background circle */}
                <div className={`flex items-center justify-center mx-auto mb-4 ${deleteConfirmDialog.usingSchemas && deleteConfirmDialog.usingSchemas.length > 0 ? 'text-rose-500' : 'text-amber-500'}`}>
                  {deleteConfirmDialog.usingSchemas && deleteConfirmDialog.usingSchemas.length > 0 ? (
                    <XCircle size={48} />
                  ) : (
                    <AlertCircle size={48} />
                  )}
                </div>

                <div className="space-y-1.5 mb-4">
                  <h3 className="text-xl font-black text-[#010136] tracking-tight leading-tight">
                    {deleteConfirmDialog.usingSchemas && deleteConfirmDialog.usingSchemas.length > 0
                      ? (language === 'TH' ? 'ลบไม่ได้: มีการใช้งานเอกสารนี้' : 'Cannot Delete: Document Type in Use')
                      : deleteConfirmDialog.usingWorkflows.length > 0 
                        ? (language === 'TH' ? 'แจ้งเตือน: ตรวจพบการใช้งานในเวิร์กโฟลว์' : 'Warning: Document Type in Use')
                        : (language === 'TH' ? `ลบประเภทเอกสาร "${deleteConfirmDialog.docType.name}" ใช่หรือไม่` : `Delete "${deleteConfirmDialog.docType.name}"?`)
                    }
                  </h3>
                </div>

                {/* Content */}
                <div className="space-y-4 text-left mb-6">
                  {deleteConfirmDialog.usingWorkflows.length > 0 ? (
                    <div className="space-y-3.5">
                      <p className="text-xs font-bold text-slate-600 leading-relaxed">
                        {language === 'TH' 
                          ? `เอกสารนี้ถูกใช้งานในเวิร์กโฟลว์ทั้งหมด ${deleteConfirmDialog.usingWorkflows.length} รายการ ได้แก่:`
                          : `This document type is currently utilized in ${deleteConfirmDialog.usingWorkflows.length} workflows:`}
                      </p>
                      
                      {/* Workflow List */}
                      <ul className="bg-slate-50 border border-slate-100 rounded-xl p-3.5 space-y-2">
                        {deleteConfirmDialog.usingWorkflows.map((wf) => (
                          <li key={wf.id} className="flex items-center gap-2 text-xs font-semibold text-slate-700">
                            <span className="w-1.5 h-1.5 rounded-full bg-slate-400"></span>
                            <span>{wf.name}</span>
                          </li>
                        ))}
                      </ul>

                      {deleteConfirmDialog.usingSchemas && deleteConfirmDialog.usingSchemas.length > 0 && (
                        <>
                          <p className="text-xs font-semibold text-rose-500 leading-relaxed mt-4">
                            {language === 'TH' 
                              ? `และถูกใช้งานอยู่ใน Schema ต่อไปนี้ จึงไม่สามารถลบประเภทเอกสารนี้ได้:`
                              : `And is currently utilized in the following schemas, therefore it cannot be deleted:`}
                          </p>
                          <ul className="bg-slate-50 border border-slate-100 rounded-xl p-3.5 space-y-2">
                            {deleteConfirmDialog.usingSchemas.map((sch) => (
                              <li key={sch.id} className="flex items-center gap-2 text-xs font-semibold text-slate-700">
                                <span className="w-1.5 h-1.5 rounded-full bg-slate-400"></span>
                                <span>{sch.name}</span>
                              </li>
                            ))}
                          </ul>
                        </>
                      )}

                      {(!deleteConfirmDialog.usingSchemas || deleteConfirmDialog.usingSchemas.length === 0) && (
                        <p className="text-xs text-slate-500 font-semibold leading-relaxed">
                          {language === 'TH'
                            ? 'หากยืนยันการลบ จะส่งผลกระทบต่อเวิร์กโฟลว์เหล่านั้นทันที โดยโหนดที่อ้างอิงถึงประเภทเอกสารนี้จะแสดงสถานะไม่สมบูรณ์ (incomplete)'
                            : 'Confirming deletion will impact these workflows directly. Referenced nodes will automatically show as incomplete.'}
                        </p>
                      )}
                    </div>
                  ) : deleteConfirmDialog.usingSchemas && deleteConfirmDialog.usingSchemas.length > 0 ? (
                    <div className="space-y-3.5">
                      <p className="text-xs font-semibold text-slate-600 leading-relaxed">
                        {language === 'TH' 
                          ? `ประเภทเอกสารนี้ถูกใช้งานอยู่ใน Schema ต่อไปนี้ จึงไม่สามารถลบได้ หากต้องการลบ กรุณาไปลบ Schema เหล่านี้ออกก่อน:`
                          : `This document type is currently utilized in the following schemas and cannot be deleted. If you wish to delete it, please delete these schemas first:`}
                      </p>
                      
                      {/* Schema List */}
                      <ul className="bg-slate-50 border border-slate-100 rounded-xl p-3.5 space-y-2">
                        {deleteConfirmDialog.usingSchemas.map((sch) => (
                          <li key={sch.id} className="flex items-center gap-2 text-xs font-semibold text-slate-700">
                            <span className="w-1.5 h-1.5 rounded-full bg-slate-400"></span>
                            <span>{sch.name}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : (
                    <p className="text-xs font-semibold text-slate-600 leading-relaxed text-center">
                      {language === 'TH'
                        ? `คุณยืนยันที่จะลบประเภทเอกสาร "${deleteConfirmDialog.docType.name}" ใช่หรือไม่? การลบนี้ไม่สามารถกู้คืนได้เมื่อดำเนินการสำเร็จ`
                        : `Are you sure you want to permanently delete the "${deleteConfirmDialog.docType.name}" document type? This action cannot be undone.`}
                    </p>
                  )}
                </div>

                {/* Footer buttons */}
                {deleteConfirmDialog.usingSchemas && deleteConfirmDialog.usingSchemas.length > 0 ? (
                  <button
                    type="button"
                    onClick={() => setDeleteConfirmDialog({ isOpen: false, docType: null, usingWorkflows: [], usingSchemas: [] })}
                    className="w-full py-2.5 rounded-[4px] bg-[#1F5DF9] hover:bg-[#104BE3] text-white font-bold text-xs transition active:scale-95 cursor-pointer shadow-md shadow-blue-500/10 h-[40px]"
                  >
                    {language === 'TH' ? 'รับทราบ' : 'Close'}
                  </button>
                ) : (
                  <div className="flex items-center justify-center gap-3">
                    <button
                      type="button"
                      onClick={() => setDeleteConfirmDialog({ isOpen: false, docType: null, usingWorkflows: [], usingSchemas: [] })}
                      className="flex-1 py-2.5 rounded-[4px] border border-slate-200 bg-white text-slate-600 font-bold hover:bg-slate-50 text-xs transition active:scale-95 cursor-pointer h-[40px]"
                    >
                      {language === 'TH' ? 'ยกเลิก' : 'Cancel'}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (deleteConfirmDialog.docType) {
                          onDeleteDocType(deleteConfirmDialog.docType.id);
                        }
                        setDeleteConfirmDialog({ isOpen: false, docType: null, usingWorkflows: [], usingSchemas: [] });
                      }}
                      className="flex-1 py-2.5 rounded-[4px] bg-[#1F5DF9] hover:bg-[#104BE3] text-white font-bold text-xs transition active:scale-95 cursor-pointer shadow-md shadow-blue-500/10 h-[40px]"
                    >
                      {language === 'TH' ? 'ลบประเภทเอกสาร' : 'Confirm Delete'}
                    </button>
                  </div>
                )}
              </motion.div>
            </div>
          )}
        </AnimatePresence>,
        document.body
      )}
    </div>
  );
};

// Internal simple tooltip component to avoid external dependencies or issues
const Tooltip: React.FC<{ children: React.ReactNode; content: string }> = ({ children, content }) => {
  const [visible, setVisible] = useState(false);
  return (
    <div 
      className="relative inline-block" 
      onMouseEnter={() => setVisible(true)}
      onMouseLeave={() => setVisible(false)}
    >
      {children}
      {visible && (
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-1.5 bg-slate-800 text-[10px] font-black text-white rounded-lg shadow-xl border border-slate-700 whitespace-nowrap z-[1000] animate-in fade-in duration-100">
          {content}
        </div>
      )}
    </div>
  );
};
