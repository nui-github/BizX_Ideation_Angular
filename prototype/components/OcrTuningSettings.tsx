import React, { useState, useMemo, useEffect } from 'react';
import { Popover, message } from 'antd';
import * as XLSX from 'xlsx';
import {
  ArrowLeft, Plus, Trash2, Sparkles, Upload, FileText, Check, X,
  ChevronRight, RotateCcw, Save, FileSpreadsheet, FileCode2
} from 'lucide-react';
import { Language, DocType } from '../types';
import { LabelSchema, SchemaLabel, DocTypeSchemaConfig, DEFAULT_SCHEMAS } from './LabelSchemaSettings';

interface OcrTuningSettingsProps {
  language: Language;
  docTypes: DocType[];
  onBack: () => void;
}

type Step = 'MODE' | 'NAME' | 'BASE' | 'TUNE' | 'TEST';
type Section = 'Header' | 'Description' | 'Footer';
const SECTIONS: Section[] = ['Header', 'Description', 'Footer'];

const READY_MADE_PHRASES_TH: string[] = [
  'อยู่บริเวณหัวเอกสาร ด้านขวาบน',
  'อยู่ใต้คำว่า "เลขที่" หรือ "No."',
  'เป็นตัวเลขที่มีทศนิยม 2 ตำแหน่ง มักมีเครื่องหมาย , คั่นหลักพัน',
  'อยู่ในตารางรายการสินค้า คอลัมน์ขวาสุด',
  'เป็นวันที่ รูปแบบ วัน/เดือน/ปี',
  'อยู่ท้ายเอกสาร ใกล้ลายเซ็นหรือตราประทับ',
  'เป็นชื่อบริษัทหรือชื่อคู่ค้า อยู่บรรทัดแรกของเอกสาร',
];

// Deterministic per (field, seed) so re-renders don't jitter results, and re-uploading the
// same file name reproduces the same demo outcome.
const hashString = (s: string): number => {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h;
};

const buildMockExpectedValue = (field: SchemaLabel, seed: number): string => {
  const type = field.type || 'string';
  if (type === 'number') return ((seed % 90000) / 100).toFixed(2);
  if (type === 'boolean') return seed % 2 === 0 ? 'ใช่' : 'ไม่ใช่';
  if (type === 'date') {
    const day = (seed % 28) + 1;
    const month = (Math.floor(seed / 28) % 12) + 1;
    return `${String(day).padStart(2, '0')}/${String(month).padStart(2, '0')}/2026`;
  }
  if (type === 'array') return `${(seed % 12) + 1} รายการ`;
  const hint = (field.aiPrompt || '').toLowerCase();
  const name = (field.name || '').toLowerCase();
  if (hint.includes('invoice') || name.includes('invoice')) return `INV-2026-${String(seed % 9999).padStart(4, '0')}`;
  if (name.includes('tax')) return `01055${String(seed % 99999).padStart(5, '0')}0000`;
  return `${field.name || 'VALUE'}-${seed % 999}`;
};

const mutateValue = (value: string, seed: number): string => {
  if (!value) return value;
  const chars = value.split('');
  const idx = seed % chars.length;
  chars[idx] = /\d/.test(chars[idx]) ? String((parseInt(chars[idx], 10) + 1) % 10) : chars[idx];
  return chars.join('');
};

interface MockOcrResult { field: SchemaLabel; expected: string; ocrValue: string; matched: boolean; blank: boolean; }
const mockOcrPair = (field: SchemaLabel, seed: string): MockOcrResult => {
  const h = hashString(field.id + '|' + seed);
  const expected = buildMockExpectedValue(field, h);
  const bucket = h % 10;
  if (bucket < 7) return { field, expected, ocrValue: expected, matched: true, blank: false };
  if (bucket < 9) return { field, expected, ocrValue: mutateValue(expected, h), matched: false, blank: false };
  return { field, expected, ocrValue: '', matched: false, blank: true };
};

// Resolves e.g. "Sheet1!B4" (or just "B4", using the first sheet) against a parsed workbook.
const resolveExcelCellRef = (workbook: XLSX.WorkBook, ref: string): string | null => {
  const trimmed = ref.trim();
  if (!trimmed) return null;
  const parts = trimmed.split('!');
  const sheetName = parts.length === 2 ? parts[0].trim() : workbook.SheetNames[0];
  const cellAddr = (parts.length === 2 ? parts[1] : parts[0]).trim().toUpperCase();
  const sheet = workbook.Sheets[sheetName];
  if (!sheet) return null;
  const cell = sheet[cellAddr];
  if (!cell) return null;
  return cell.w !== undefined ? String(cell.w) : cell.v !== undefined ? String(cell.v) : null;
};

// Resolves a simple tag path like "/Invoice/Header/InvoiceNo" (leading slash optional, root
// tag in the path optional) against a parsed XML document.
const resolveXmlPath = (doc: Document, path: string): string | null => {
  const segments = path.split('/').filter(Boolean);
  if (segments.length === 0) return null;
  let node: Element | null = doc.documentElement;
  if (!node) return null;
  let startIdx = 0;
  if (segments[0].toLowerCase() === node.tagName.toLowerCase()) startIdx = 1;
  for (let i = startIdx; i < segments.length; i++) {
    if (!node) return null;
    const seg = segments[i];
    const found: Element | undefined = Array.from(node.children).find(c => c.tagName.toLowerCase() === seg.toLowerCase());
    if (!found) return null;
    node = found;
  }
  return node ? (node.textContent || '').trim() : null;
};

const TYPE_OPTIONS: { value: string; th: string; en: string }[] = [
  { value: 'string', th: 'ข้อความ (Text)', en: 'Text (string)' },
  { value: 'number', th: 'ตัวเลข (Number)', en: 'Number' },
  { value: 'boolean', th: 'ใช่/ไม่ใช่ (Yes/No)', en: 'Yes/No (boolean)' },
  { value: 'date', th: 'วันที่ (Date)', en: 'Date' },
  { value: 'array', th: 'ชุดข้อมูล (Array)', en: 'Table/List (array)' },
];

const cloneSchema = (schema: LabelSchema): LabelSchema => JSON.parse(JSON.stringify(schema));

const genId = (prefix: string) => `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

export const OcrTuningSettings: React.FC<OcrTuningSettingsProps> = ({ language, docTypes, onBack }) => {
  const isTh = language === 'TH';

  const [schemas, setSchemas] = useState<LabelSchema[]>(() => {
    const saved = typeof window !== 'undefined' ? localStorage.getItem('bizx_label_schemas_v7') : null;
    if (saved) {
      try { return JSON.parse(saved); } catch (e) { console.error('Failed to parse saved schemas', e); }
    }
    return DEFAULT_SCHEMAS;
  });
  useEffect(() => {
    if (typeof window !== 'undefined') localStorage.setItem('bizx_label_schemas_v7', JSON.stringify(schemas));
  }, [schemas]);

  const [step, setStep] = useState<Step>('MODE');
  const [mode, setMode] = useState<'new' | 'edit' | null>(null);
  const [draftSchema, setDraftSchema] = useState<LabelSchema | null>(null);
  const [selectedDocTypeId, setSelectedDocTypeId] = useState<string | null>(null);
  const [nameDraft, setNameDraft] = useState('');
  const [nameDocTypeId, setNameDocTypeId] = useState<string>('');
  const [baseSearch, setBaseSearch] = useState('');
  const [openPhraseFieldId, setOpenPhraseFieldId] = useState<string | null>(null);
  const [testFileName, setTestFileName] = useState<string | null>(null);
  const [resultsFilter, setResultsFilter] = useState<'mismatch' | 'all'>('mismatch');
  const [excelWorkbook, setExcelWorkbook] = useState<XLSX.WorkBook | null>(null);
  const [xmlDoc, setXmlDoc] = useState<Document | null>(null);
  const [mappingFileError, setMappingFileError] = useState<string | null>(null);

  const resetAll = () => {
    setStep('MODE');
    setMode(null);
    setDraftSchema(null);
    setSelectedDocTypeId(null);
    setNameDraft('');
    setNameDocTypeId('');
    setBaseSearch('');
    setOpenPhraseFieldId(null);
    setTestFileName(null);
    setResultsFilter('mismatch');
    setExcelWorkbook(null);
    setXmlDoc(null);
    setMappingFileError(null);
  };

  const activeConfig: DocTypeSchemaConfig | null = useMemo(() => {
    if (!draftSchema) return null;
    if (draftSchema.configs.length === 0) return null;
    return draftSchema.configs.find(c => c.docTypeId === selectedDocTypeId) || draftSchema.configs[0];
  }, [draftSchema, selectedDocTypeId]);

  const groupedFields = useMemo(() => {
    const groups: Record<Section, SchemaLabel[]> = { Header: [], Description: [], Footer: [] };
    (activeConfig?.labels || []).forEach(label => {
      const section = label.section || 'Header';
      if (groups[section]) groups[section].push(label);
    });
    return groups;
  }, [activeConfig]);

  const updateActiveConfig = (updates: Partial<DocTypeSchemaConfig>) => {
    if (!draftSchema || !activeConfig) return;
    setDraftSchema({
      ...draftSchema,
      configs: draftSchema.configs.map(c => c.docTypeId === activeConfig.docTypeId ? { ...c, ...updates } : c),
    });
  };

  const updateField = (fieldId: string, updates: Partial<SchemaLabel>) => {
    if (!draftSchema || !activeConfig) return;
    setDraftSchema({
      ...draftSchema,
      configs: draftSchema.configs.map(c => c.docTypeId === activeConfig.docTypeId
        ? { ...c, labels: c.labels.map(l => l.id === fieldId ? { ...l, ...updates } : l) }
        : c),
    });
  };

  const removeField = (fieldId: string) => {
    if (!draftSchema || !activeConfig) return;
    setDraftSchema({
      ...draftSchema,
      configs: draftSchema.configs.map(c => c.docTypeId === activeConfig.docTypeId
        ? { ...c, labels: c.labels.filter(l => l.id !== fieldId) }
        : c),
    });
  };

  const addField = (section: Section) => {
    if (!draftSchema || !activeConfig) return;
    const newField: SchemaLabel = { id: genId('field'), name: '', required: true, compare: false, type: 'string', section };
    setDraftSchema({
      ...draftSchema,
      configs: draftSchema.configs.map(c => c.docTypeId === activeConfig.docTypeId
        ? { ...c, labels: [...c.labels, newField] }
        : c),
    });
  };

  const appendPhrase = (fieldId: string, phrase: string) => {
    if (!activeConfig) return;
    const field = activeConfig.labels.find(l => l.id === fieldId);
    if (!field) return;
    const current = field.aiPrompt || '';
    updateField(fieldId, { aiPrompt: current ? `${current} ${phrase}` : phrase });
    setOpenPhraseFieldId(null);
  };

  // --- MODE step ---
  const startNew = () => { setMode('new'); setNameDraft(''); setNameDocTypeId(docTypes[0]?.id || ''); setStep('NAME'); };
  const startEdit = (schema: LabelSchema) => {
    setMode('edit');
    const clone = cloneSchema(schema);
    setDraftSchema(clone);
    setSelectedDocTypeId(clone.configs[0]?.docTypeId || null);
    setStep('TUNE');
  };

  // --- NAME step ---
  const confirmName = () => {
    if (!nameDraft.trim() || !nameDocTypeId) return;
    setStep('BASE');
  };

  // --- BASE step ---
  const startBlank = () => {
    const config: DocTypeSchemaConfig = { docTypeId: nameDocTypeId, labels: [], extractionMethod: 'ai' };
    const schema: LabelSchema = {
      id: genId('ls'), name: nameDraft.trim(), description: '', docTypes: [nameDocTypeId],
      workflowIds: [], assignedTeams: ['ALL'], updatedAt: new Date().toISOString(), configs: [config],
    };
    setDraftSchema(schema);
    setSelectedDocTypeId(nameDocTypeId);
    setStep('TUNE');
  };
  const startFromBase = (base: LabelSchema) => {
    const baseConfig = base.configs.find(c => c.docTypeId === nameDocTypeId) || base.configs[0];
    const clonedLabels: SchemaLabel[] = baseConfig ? JSON.parse(JSON.stringify(baseConfig.labels)).map((l: SchemaLabel) => ({ ...l, id: genId('field') })) : [];
    const config: DocTypeSchemaConfig = { docTypeId: nameDocTypeId, labels: clonedLabels, extractionMethod: baseConfig?.extractionMethod || 'ai' };
    const schema: LabelSchema = {
      id: genId('ls'), name: nameDraft.trim(), description: base.description || '', docTypes: [nameDocTypeId],
      workflowIds: [], assignedTeams: ['ALL'], updatedAt: new Date().toISOString(), configs: [config],
    };
    setDraftSchema(schema);
    setSelectedDocTypeId(nameDocTypeId);
    setStep('TUNE');
  };

  // --- Save ---
  const handleSave = () => {
    if (!draftSchema) return;
    const toSave: LabelSchema = { ...draftSchema, updatedAt: new Date().toISOString() };
    setSchemas(prev => mode === 'edit' && prev.some(s => s.id === toSave.id)
      ? prev.map(s => s.id === toSave.id ? toSave : s)
      : [...prev, toSave]);
    if (mode === 'new') setMode('edit');
    message.success(isTh ? 'บันทึก Schema เรียบร้อย' : 'Schema saved');
  };

  // --- TEST step: AI/mock ---
  const testResults: MockOcrResult[] = useMemo(() => {
    if (!activeConfig || (activeConfig.extractionMethod || 'ai') !== 'ai' || !testFileName) return [];
    return activeConfig.labels.map(f => mockOcrPair(f, testFileName));
  }, [activeConfig, testFileName]);

  const testMetrics = useMemo(() => {
    const total = testResults.length;
    const matched = testResults.filter(r => r.matched).length;
    const blank = testResults.filter(r => r.blank).length;
    const wrong = total - matched - blank;
    return { total, matched, blank, wrong, matchPct: total ? Math.round((matched / total) * 100) : 0 };
  }, [testResults]);

  const filteredResults = useMemo(() => resultsFilter === 'all' ? testResults : testResults.filter(r => !r.matched), [testResults, resultsFilter]);

  const handleTestFileUpload = (file: File) => {
    setTestFileName(file.name);
    setExcelWorkbook(null);
    setXmlDoc(null);
    setMappingFileError(null);
    const method = activeConfig?.extractionMethod || 'ai';
    if (method === 'excel') {
      file.arrayBuffer().then(buf => setExcelWorkbook(XLSX.read(buf, { type: 'array' }))).catch(() => setMappingFileError(isTh ? 'ไม่สามารถอ่านไฟล์ Excel นี้ได้' : 'Could not read this Excel file'));
    } else if (method === 'xml') {
      file.text().then(text => {
        try {
          const doc = new DOMParser().parseFromString(text, 'application/xml');
          if (doc.querySelector('parsererror')) throw new Error('parse error');
          setXmlDoc(doc);
        } catch { setMappingFileError(isTh ? 'ไม่สามารถอ่านไฟล์ XML นี้ได้' : 'Could not read this XML file'); }
      });
    }
  };

  const resolveMappedValue = (field: SchemaLabel): string | null => {
    const method = activeConfig?.extractionMethod || 'ai';
    if (method === 'excel' && excelWorkbook && field.excelCellRef) return resolveExcelCellRef(excelWorkbook, field.excelCellRef);
    if (method === 'xml' && xmlDoc && field.xmlPath) return resolveXmlPath(xmlDoc, field.xmlPath);
    return null;
  };

  const t = (th: string, en: string) => (isTh ? th : en);

  const availableDocTypeIds = useMemo(() => new Set(docTypes.map(d => d.id)), [docTypes]);
  const docTypeName = (id: string) => docTypes.find(d => d.id === id)?.name || id;

  const filteredBaseSchemas = useMemo(
    () => schemas.filter(s => s.name.toLowerCase().includes(baseSearch.trim().toLowerCase())),
    [schemas, baseSearch]
  );

  const STEP_LABELS: { key: Step; th: string; en: string }[] = [
    { key: 'MODE', th: 'เลือกโหมด', en: 'Mode' },
    { key: 'NAME', th: 'ชื่อ Schema', en: 'Name' },
    { key: 'BASE', th: 'เลือกฐาน', en: 'Base' },
    { key: 'TUNE', th: 'ปรับแต่ง', en: 'Tune' },
    { key: 'TEST', th: 'ทดสอบ', en: 'Test' },
  ];
  const visibleSteps = mode === 'edit' ? STEP_LABELS.filter(s => s.key !== 'NAME' && s.key !== 'BASE') : STEP_LABELS;

  return (
    <div className="flex-1 overflow-y-auto bg-slate-50 font-sans">
      <div className="max-w-5xl mx-auto p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <button onClick={onBack} className="p-2 hover:bg-slate-100 rounded-[4px] text-slate-600 cursor-pointer">
              <ArrowLeft size={20} />
            </button>
            <div>
              <h2 className="text-xl font-black text-[#010136] tracking-tight">{t('ปรับแต่งการอ่าน OCR (OCR Tuning)', 'OCR Tuning')}</h2>
              <p className="text-[11px] font-bold text-slate-400 mt-0.5">{t('สร้างและปรับแต่ง Schema สำหรับดึงข้อมูลจากเอกสาร โดยไม่ต้องแก้ JSON', 'Create and tune document extraction schemas — no JSON required')}</p>
            </div>
          </div>
          {step !== 'MODE' && (
            <button
              onClick={resetAll}
              className="flex items-center gap-1.5 px-3 py-2 rounded-[4px] border border-slate-200 bg-white text-slate-500 text-xs font-bold hover:bg-slate-50 cursor-pointer"
            >
              <RotateCcw size={14} /> {t('เริ่มใหม่', 'Start over')}
            </button>
          )}
        </div>

        {/* Step indicator */}
        <div className="flex items-center gap-2 mb-6">
          {visibleSteps.map((s, i) => (
            <React.Fragment key={s.key}>
              <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold ${step === s.key ? 'bg-[#1f5df9] text-white' : 'bg-white border border-slate-200 text-slate-400'}`}>
                <span>{i + 1}</span><span>{isTh ? s.th : s.en}</span>
              </div>
              {i < visibleSteps.length - 1 && <ChevronRight size={12} className="text-slate-300" />}
            </React.Fragment>
          ))}
        </div>

        {/* --- MODE --- */}
        {step === 'MODE' && (
          <div className="grid grid-cols-2 gap-4">
            <button onClick={startNew} className="p-6 bg-white border-2 border-slate-200 rounded-2xl text-left hover:border-[#1f5df9] hover:shadow-sm transition-all cursor-pointer">
              <Plus size={22} className="text-[#1f5df9] mb-2" />
              <h3 className="font-black text-slate-800">{t('สร้าง Schema ใหม่', 'Create new schema')}</h3>
              <p className="text-xs text-slate-400 mt-1">{t('เริ่มจากฐานเดิม หรือเริ่มจากเปล่า', 'Start from an existing base, or from scratch')}</p>
            </button>
            <div className="p-6 bg-white border-2 border-slate-200 rounded-2xl">
              <h3 className="font-black text-slate-800 mb-3">{t('แก้ไข Schema ที่มีอยู่', 'Edit an existing schema')}</h3>
              <div className="max-h-64 overflow-y-auto space-y-1.5">
                {schemas.map(s => (
                  <button
                    key={s.id}
                    onClick={() => startEdit(s)}
                    className="w-full text-left px-3 py-2 rounded-[4px] border border-slate-100 hover:border-[#1f5df9] hover:bg-blue-50/40 transition-all cursor-pointer"
                  >
                    <div className="text-sm font-bold text-slate-700">{s.name}</div>
                    <div className="text-[10px] text-slate-400">{s.docTypes.map(docTypeName).join(', ') || '—'}</div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* --- NAME --- */}
        {step === 'NAME' && (
          <div className="p-6 bg-white border border-slate-200 rounded-2xl max-w-lg">
            <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-1.5">{t('ชื่อ Schema', 'Schema name')}</label>
            <input
              autoFocus
              type="text"
              value={nameDraft}
              onChange={(e) => setNameDraft(e.target.value)}
              placeholder={t('เช่น Invoice ลูกค้า ABC', 'e.g. ABC Customer Invoice')}
              className="w-full px-3 py-2.5 rounded-[4px] border border-slate-200 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-[#1f5df9] mb-4"
            />
            <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-1.5">{t('ประเภทเอกสาร', 'Document type')}</label>
            <select
              value={nameDocTypeId}
              onChange={(e) => setNameDocTypeId(e.target.value)}
              className="w-full px-3 py-2.5 rounded-[4px] border border-slate-200 text-sm font-semibold bg-white focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-[#1f5df9] mb-5"
            >
              {docTypes.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
            <button
              disabled={!nameDraft.trim() || !nameDocTypeId}
              onClick={confirmName}
              className="px-4 py-2.5 rounded-[4px] bg-[#1f5df9] text-white text-sm font-bold disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
            >
              {t('ถัดไป', 'Next')}
            </button>
          </div>
        )}

        {/* --- BASE --- */}
        {step === 'BASE' && (
          <div>
            <div className="mb-3">
              <input
                type="text"
                value={baseSearch}
                onChange={(e) => setBaseSearch(e.target.value)}
                placeholder={t('ค้นหา schema...', 'Search schemas...')}
                className="w-full max-w-sm px-3 py-2 rounded-[4px] border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-[#1f5df9]"
              />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <button onClick={startBlank} className="p-4 bg-white border-2 border-dashed border-slate-300 rounded-xl text-left hover:border-[#1f5df9] transition-all cursor-pointer">
                <Plus size={18} className="text-slate-400 mb-1.5" />
                <div className="text-sm font-bold text-slate-600">{t('เริ่มจากเปล่า', 'Start blank')}</div>
              </button>
              {filteredBaseSchemas.map(s => (
                <button
                  key={s.id}
                  onClick={() => startFromBase(s)}
                  className="p-4 bg-white border-2 border-slate-200 rounded-xl text-left hover:border-[#1f5df9] hover:shadow-sm transition-all cursor-pointer"
                >
                  <div className="text-sm font-bold text-slate-700 truncate">{s.name}</div>
                  <div className="text-[10px] text-slate-400 mt-0.5">{s.configs.reduce((n, c) => n + c.labels.length, 0)} {t('ฟิลด์', 'fields')}</div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* --- TUNE --- */}
        {step === 'TUNE' && draftSchema && activeConfig && (
          <div className="space-y-4">
            <div className="flex items-center justify-between bg-white p-4 rounded-xl border border-slate-200">
              <input
                type="text"
                value={draftSchema.name}
                onChange={(e) => setDraftSchema({ ...draftSchema, name: e.target.value })}
                className="text-lg font-black text-[#010136] bg-transparent border-b border-transparent hover:border-slate-200 focus:border-[#1f5df9] outline-none px-1 -mx-1"
              />
              <div className="flex items-center gap-2">
                <button onClick={handleSave} className="flex items-center gap-1.5 px-3.5 py-2 rounded-[4px] bg-[#1f5df9] text-white text-xs font-bold cursor-pointer hover:bg-[#1a4fd6]">
                  <Save size={14} /> {t('บันทึก', 'Save')}
                </button>
                <button onClick={() => setStep('TEST')} className="flex items-center gap-1.5 px-3.5 py-2 rounded-[4px] border border-slate-200 text-slate-600 text-xs font-bold cursor-pointer hover:bg-slate-50">
                  {t('ไปที่ทดสอบ', 'Go to test')} <ChevronRight size={14} />
                </button>
              </div>
            </div>

            {draftSchema.configs.length > 1 && (
              <div className="flex items-center gap-1.5">
                {draftSchema.configs.map(c => (
                  <button
                    key={c.docTypeId}
                    onClick={() => setSelectedDocTypeId(c.docTypeId)}
                    className={`px-3 py-1.5 rounded-[4px] text-xs font-bold cursor-pointer ${activeConfig.docTypeId === c.docTypeId ? 'bg-[#1f5df9] text-white' : 'bg-white border border-slate-200 text-slate-500'}`}
                  >
                    {docTypeName(c.docTypeId)}
                  </button>
                ))}
              </div>
            )}

            {/* Extraction method */}
            <div className="bg-white p-4 rounded-xl border border-slate-200">
              <h5 className="text-xs font-black text-slate-800 uppercase tracking-tight mb-2.5">{t('วิธีดึงข้อมูล', 'Extraction method')}</h5>
              <div className="inline-flex items-center gap-1 p-1 bg-slate-50 border border-slate-200 rounded-[8px]">
                {([
                  { key: 'ai' as const, th: 'AI อ่านเอกสาร (LLM)', en: 'AI reads document (LLM)' },
                  { key: 'excel' as const, th: 'อ่านจากไฟล์ Excel', en: 'Read from Excel file' },
                  { key: 'xml' as const, th: 'อ่านจากไฟล์ XML', en: 'Read from XML file' },
                ]).map(opt => (
                  <button
                    key={opt.key}
                    onClick={() => updateActiveConfig({ extractionMethod: opt.key })}
                    className={`px-3 py-1.5 text-xs font-bold rounded-[4px] cursor-pointer transition-all ${(activeConfig.extractionMethod || 'ai') === opt.key ? 'bg-[#1f5df9] text-white shadow-sm' : 'text-slate-500 hover:bg-white'}`}
                  >
                    {isTh ? opt.th : opt.en}
                  </button>
                ))}
              </div>
            </div>

            {SECTIONS.map(section => (
              <div key={section} className="bg-white p-4 rounded-xl border border-slate-200">
                <div className="flex items-center justify-between mb-3">
                  <h5 className="text-xs font-black text-slate-500 uppercase tracking-widest">
                    {section === 'Header' ? t('ส่วนหัว (Header)', 'Header') : section === 'Description' ? t('ส่วนรายละเอียด (Description)', 'Description') : t('ส่วนท้าย (Footer)', 'Footer')}
                  </h5>
                  <button onClick={() => addField(section)} className="flex items-center gap-1 text-[11px] font-bold text-[#1f5df9] hover:underline cursor-pointer">
                    <Plus size={12} /> {t('เพิ่มฟิลด์ใหม่', 'Add field')}
                  </button>
                </div>
                <div className="space-y-2.5">
                  {groupedFields[section].length === 0 && (
                    <p className="text-xs text-slate-300 italic py-2">{t('ยังไม่มีฟิลด์ในส่วนนี้', 'No fields in this section yet')}</p>
                  )}
                  {groupedFields[section].map(field => {
                    const method = activeConfig.extractionMethod || 'ai';
                    return (
                      <div key={field.id} className="p-3 bg-slate-50/60 rounded-[8px] border border-slate-200/70">
                        <div className="flex items-center gap-2 mb-2">
                          <input
                            type="text"
                            value={field.name}
                            onChange={(e) => updateField(field.id, { name: e.target.value })}
                            placeholder={t('ชื่อฟิลด์', 'Field name')}
                            className="flex-1 min-w-0 px-3 py-1.5 font-mono text-sm font-semibold border border-slate-200 rounded-[4px] focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-[#1f5df9]"
                          />
                          <select
                            value={field.type || 'string'}
                            onChange={(e) => updateField(field.id, { type: e.target.value })}
                            className="w-40 px-2.5 py-1.5 bg-white border border-slate-200 rounded-[4px] text-xs font-semibold cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-100"
                          >
                            {TYPE_OPTIONS.map(o => <option key={o.value} value={o.value}>{isTh ? o.th : o.en}</option>)}
                          </select>
                          <label className="flex items-center gap-1 text-[11px] font-bold text-slate-500 cursor-pointer shrink-0">
                            <input type="checkbox" checked={field.required} onChange={(e) => updateField(field.id, { required: e.target.checked })} /> {t('จำเป็น', 'Required')}
                          </label>
                          <label className="flex items-center gap-1 text-[11px] font-bold text-slate-500 cursor-pointer shrink-0">
                            <input type="checkbox" checked={field.compare} onChange={(e) => updateField(field.id, { compare: e.target.checked })} /> {t('เทียบข้อมูล', 'Compare')}
                          </label>
                          <button onClick={() => removeField(field.id)} className="p-1.5 text-rose-400 hover:text-rose-600 hover:bg-rose-50 rounded-[4px] cursor-pointer shrink-0">
                            <Trash2 size={14} />
                          </button>
                        </div>
                        <input
                          type="text"
                          value={field.friendlyName || ''}
                          onChange={(e) => updateField(field.id, { friendlyName: e.target.value })}
                          placeholder={t('คำอธิบายฟิลด์แบบเข้าใจง่าย (สำหรับผู้ใช้ทั่วไป)', 'Plain-language field description (for non-technical users)')}
                          className="w-full px-3 py-1.5 text-xs font-semibold text-slate-600 bg-white border border-slate-200/80 rounded-[4px] mb-1.5 focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-[#1f5df9]"
                        />
                        {method === 'ai' && (
                          <div className="flex items-start gap-1.5">
                            <textarea
                              value={field.aiPrompt || ''}
                              onChange={(e) => updateField(field.id, { aiPrompt: e.target.value })}
                              placeholder={t('คำอธิบายฟิลด์/ตำแหน่ง — บอกให้ AI รู้ว่าฟิลด์นี้อยู่ตรงไหน อ่านอย่างไร', 'Field description/position — tell the AI where this field is and how to read it')}
                              rows={2}
                              className="flex-1 px-3 py-1.5 text-xs italic text-slate-600 bg-white border border-slate-200/80 rounded-[4px] resize-none focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-[#1f5df9] focus:not-italic"
                            />
                            <Popover
                              open={openPhraseFieldId === field.id}
                              onOpenChange={(open) => setOpenPhraseFieldId(open ? field.id : null)}
                              trigger="click"
                              placement="bottomRight"
                              content={
                                <div className="w-64 max-h-64 overflow-y-auto">
                                  {READY_MADE_PHRASES_TH.map(phrase => (
                                    <button
                                      key={phrase}
                                      onClick={() => appendPhrase(field.id, phrase)}
                                      className="w-full text-left px-2 py-1.5 text-xs text-slate-600 hover:bg-blue-50 hover:text-[#1f5df9] rounded-[4px] cursor-pointer"
                                    >
                                      {phrase}
                                    </button>
                                  ))}
                                </div>
                              }
                            >
                              <button
                                title={t('วลีสำเร็จรูป', 'Ready-made phrases')}
                                className="p-1.5 mt-0.5 text-amber-500 hover:bg-amber-50 rounded-[4px] cursor-pointer shrink-0"
                              >
                                <Sparkles size={16} />
                              </button>
                            </Popover>
                          </div>
                        )}
                        {method === 'excel' && (
                          <input
                            type="text"
                            value={field.excelCellRef || ''}
                            onChange={(e) => updateField(field.id, { excelCellRef: e.target.value })}
                            placeholder={t('ตำแหน่งในไฟล์ Excel เช่น Sheet1!B4', 'Excel cell reference, e.g. Sheet1!B4')}
                            className="w-full px-3 py-1.5 text-xs font-mono text-slate-600 bg-white border border-slate-200/80 rounded-[4px] focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-[#1f5df9]"
                          />
                        )}
                        {method === 'xml' && (
                          <input
                            type="text"
                            value={field.xmlPath || ''}
                            onChange={(e) => updateField(field.id, { xmlPath: e.target.value })}
                            placeholder={t('XML Path เช่น /Invoice/Header/InvoiceNo', 'XML path, e.g. /Invoice/Header/InvoiceNo')}
                            className="w-full px-3 py-1.5 text-xs font-mono text-slate-600 bg-white border border-slate-200/80 rounded-[4px] focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-[#1f5df9]"
                          />
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* --- TEST --- */}
        {step === 'TEST' && draftSchema && activeConfig && (
          <div className="space-y-4">
            <div className="flex items-center justify-between bg-white p-4 rounded-xl border border-slate-200">
              <button onClick={() => setStep('TUNE')} className="flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-[#1f5df9] cursor-pointer">
                <ArrowLeft size={14} /> {t('กลับไปปรับแต่ง', 'Back to tuning')}
              </button>
              <button onClick={handleSave} className="flex items-center gap-1.5 px-3.5 py-2 rounded-[4px] bg-[#1f5df9] text-white text-xs font-bold cursor-pointer hover:bg-[#1a4fd6]">
                <Save size={14} /> {t('บันทึก Schema เข้า Collection', 'Save schema to collection')}
              </button>
            </div>

            {(activeConfig.extractionMethod || 'ai') === 'ai' ? (
              <>
                <div className="bg-white p-5 rounded-xl border border-slate-200">
                  <label className="flex flex-col items-center justify-center gap-2 py-8 border-2 border-dashed border-slate-200 rounded-xl cursor-pointer hover:border-[#1f5df9] transition-all">
                    <Upload size={22} className="text-slate-400" />
                    <span className="text-sm font-bold text-slate-600">{testFileName || t('อัปโหลดไฟล์ PDF เพื่อทดสอบ', 'Upload a PDF to test')}</span>
                    <input type="file" accept=".pdf" className="hidden" onChange={(e) => e.target.files?.[0] && handleTestFileUpload(e.target.files[0])} />
                  </label>
                </div>

                {testFileName && (
                  <>
                    <div className="grid grid-cols-4 gap-3">
                      <div className="bg-white p-3 rounded-xl border border-slate-200"><div className="text-[10px] font-black text-slate-400 uppercase">{t('ตรงกัน', 'Matched')}</div><div className="text-lg font-black text-emerald-600">{testMetrics.matchPct}%</div></div>
                      <div className="bg-white p-3 rounded-xl border border-slate-200"><div className="text-[10px] font-black text-slate-400 uppercase">{t('ผิด', 'Wrong')}</div><div className="text-lg font-black text-rose-600">{testMetrics.wrong}</div></div>
                      <div className="bg-white p-3 rounded-xl border border-slate-200"><div className="text-[10px] font-black text-slate-400 uppercase">{t('ไม่พบ', 'Not found')}</div><div className="text-lg font-black text-amber-600">{testMetrics.blank}</div></div>
                      <div className="bg-white p-3 rounded-xl border border-slate-200"><div className="text-[10px] font-black text-slate-400 uppercase">{t('ฟิลด์ทั้งหมด', 'Total fields')}</div><div className="text-lg font-black text-slate-700">{testMetrics.total}</div></div>
                    </div>

                    <div className="flex items-center gap-1 p-1 bg-slate-50 border border-slate-200 rounded-[8px] w-fit">
                      <button onClick={() => setResultsFilter('mismatch')} className={`px-3 py-1.5 text-xs font-bold rounded-[4px] cursor-pointer ${resultsFilter === 'mismatch' ? 'bg-[#1f5df9] text-white' : 'text-slate-500'}`}>
                        {t('เฉพาะที่ต้องแก้', 'Needs fixing')} ({testMetrics.wrong + testMetrics.blank})
                      </button>
                      <button onClick={() => setResultsFilter('all')} className={`px-3 py-1.5 text-xs font-bold rounded-[4px] cursor-pointer ${resultsFilter === 'all' ? 'bg-[#1f5df9] text-white' : 'text-slate-500'}`}>
                        {t('ทั้งหมด', 'All')} ({testMetrics.total})
                      </button>
                    </div>

                    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                      <table className="w-full text-left text-sm">
                        <thead>
                          <tr className="bg-slate-50 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                            <th className="px-4 py-2.5">{t('ฟิลด์', 'Field')}</th>
                            <th className="px-4 py-2.5">{t('ค่าที่คาดหวัง', 'Expected')}</th>
                            <th className="px-4 py-2.5">{t('ค่าที่ OCR อ่านได้', 'OCR read')}</th>
                            <th className="px-4 py-2.5">{t('ผล', 'Result')}</th>
                          </tr>
                        </thead>
                        <tbody>
                          {filteredResults.length === 0 && (
                            <tr><td colSpan={4} className="px-4 py-8 text-center text-slate-300 text-xs">{t('ไม่มีรายการ', 'No rows')}</td></tr>
                          )}
                          {filteredResults.map(r => (
                            <tr key={r.field.id} className="border-t border-slate-100">
                              <td className="px-4 py-2.5 align-top">
                                <div className="font-bold text-slate-700">{r.field.name || '—'}</div>
                                {r.field.friendlyName && <div className="text-[11px] text-slate-400 mt-0.5">{r.field.friendlyName}</div>}
                              </td>
                              <td className="px-4 py-2.5 align-top font-mono text-xs text-slate-600">{r.expected}</td>
                              <td className="px-4 py-2.5 align-top">
                                <div className={`font-mono text-xs ${r.matched ? 'text-slate-600' : r.blank ? 'text-amber-600' : 'text-rose-600'}`}>{r.blank ? t('(ไม่พบ)', '(not found)') : r.ocrValue}</div>
                                {r.field.aiPrompt && <div className="text-[10px] text-slate-400 italic mt-0.5">{r.field.aiPrompt}</div>}
                              </td>
                              <td className="px-4 py-2.5 align-top">
                                {r.matched
                                  ? <span className="inline-flex items-center gap-1 text-emerald-600 text-xs font-bold"><Check size={12} /> {t('ตรงกัน', 'Match')}</span>
                                  : <span className="inline-flex items-center gap-1 text-rose-600 text-xs font-bold"><X size={12} /> {r.blank ? t('ไม่พบ', 'Not found') : t('ไม่ตรงกัน', 'Mismatch')}</span>}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </>
                )}
              </>
            ) : (
              <div className="bg-white p-5 rounded-xl border border-slate-200 space-y-4">
                <label className="flex flex-col items-center justify-center gap-2 py-8 border-2 border-dashed border-slate-200 rounded-xl cursor-pointer hover:border-[#1f5df9] transition-all">
                  {activeConfig.extractionMethod === 'excel' ? <FileSpreadsheet size={22} className="text-slate-400" /> : <FileCode2 size={22} className="text-slate-400" />}
                  <span className="text-sm font-bold text-slate-600">
                    {testFileName || (activeConfig.extractionMethod === 'excel' ? t('อัปโหลดไฟล์ Excel ตัวอย่าง', 'Upload a sample Excel file') : t('อัปโหลดไฟล์ XML ตัวอย่าง', 'Upload a sample XML file'))}
                  </span>
                  <input
                    type="file"
                    accept={activeConfig.extractionMethod === 'excel' ? '.xlsx,.xls,.csv' : '.xml'}
                    className="hidden"
                    onChange={(e) => e.target.files?.[0] && handleTestFileUpload(e.target.files[0])}
                  />
                </label>
                {mappingFileError && <p className="text-xs font-bold text-rose-500">{mappingFileError}</p>}
                {testFileName && !mappingFileError && (
                  <div className="space-y-2">
                    {activeConfig.labels.map(field => {
                      const value = resolveMappedValue(field);
                      return (
                        <div key={field.id} className="flex items-center gap-3 p-2.5 bg-slate-50/60 rounded-[8px] border border-slate-200/70">
                          <div className="w-40 shrink-0 text-sm font-bold text-slate-700 truncate">{field.name || '—'}</div>
                          <div className="w-56 shrink-0 text-xs font-mono text-slate-500 truncate">{activeConfig.extractionMethod === 'excel' ? field.excelCellRef : field.xmlPath || '—'}</div>
                          <ChevronRight size={12} className="text-slate-300 shrink-0" />
                          <div className={`flex-1 text-xs font-mono truncate ${value ? 'text-emerald-600 font-bold' : 'text-slate-300 italic'}`}>
                            {value ?? t('(ไม่พบค่า)', '(no value found)')}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
