import React, { useState, useMemo, useRef } from 'react';
import { Popover, message } from 'antd';
import * as XLSX from 'xlsx';
import {
  ArrowLeft, Plus, Trash2, Upload, FileText, Check, X, ChevronRight, ChevronDown,
  Save, FileSpreadsheet, Download, ArrowUpRight, Play, Search, Loader2, Info, Lightbulb
} from 'lucide-react';
import { Language, DocType } from '../types';
import { LabelSchema, SchemaLabel, DocTypeSchemaConfig, DEFAULT_SCHEMAS } from './LabelSchemaSettings';

interface OcrTuningSettingsProps {
  language: Language;
  docTypes: DocType[];
  onBack: () => void;
}

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
// same file name against the same schema reproduces the same demo outcome.
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

// A same-value-different-format variant — e.g. "1,000.00" -> "1000", "10/07/2026" -> "2026-07-10" —
// used to demonstrate the "ต่างแค่รูปแบบ" (format-only difference) loose-match case.
const looseFormatVariant = (value: string, type: string | undefined): string => {
  const dateMatch = value.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (dateMatch) return `${dateMatch[3]}-${dateMatch[2]}-${dateMatch[1]}`;
  if (type === 'number') {
    const n = parseFloat(value.replace(/,/g, ''));
    if (!isNaN(n)) return Number.isInteger(n) ? String(n) : String(n);
  }
  return value;
};

const normalizeForLooseCompare = (v: string): string => {
  let s = (v || '').trim().toLowerCase().replace(/,/g, '');
  s = s.replace(/^(\d+)\.00$/, '$1');
  const m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (m) s = `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`;
  return s;
};

type RowStatus = 'exact' | 'loose' | 'wrong' | 'missing' | 'extra';

interface ResultRow {
  id: string;
  page: number;
  fieldId: string;
  fieldName: string;
  friendlyName?: string;
  section: Section;
  expected: string;
  ocrValue: string;
  isExtra: boolean;
}

interface TestRun {
  pageCount: number;
  elapsedSeconds: number;
  rows: ResultRow[];
}

const computeRowStatus = (row: ResultRow): RowStatus => {
  if (row.isExtra) return 'extra';
  if (!row.ocrValue) return 'missing';
  if (row.expected === row.ocrValue) return 'exact';
  if (normalizeForLooseCompare(row.expected) === normalizeForLooseCompare(row.ocrValue)) return 'loose';
  return 'wrong';
};

// Builds a full mock test run for a given (schema, docType config, file). Header/Footer fields
// appear once; Description fields repeat once per "line item" to simulate a multi-page document,
// plus a couple of stray "extra" rows the OCR found but the schema didn't expect.
const buildTestRun = (config: DocTypeSchemaConfig, seedBase: string): TestRun => {
  const baseHash = hashString(seedBase);
  const pageCount = 3 + (baseHash % 23);
  const itemRepeats = 4 + (baseHash % 12);
  const rows: ResultRow[] = [];
  let rowSeq = 0;
  config.labels.forEach(field => {
    const repeats = field.section === 'Description' ? itemRepeats : 1;
    for (let i = 0; i < repeats; i++) {
      rowSeq++;
      const rowSeed = hashString(`${seedBase}|${field.id}|${i}`);
      const expected = buildMockExpectedValue(field, rowSeed);
      const bucket = rowSeed % 100;
      let ocrValue = expected;
      if (bucket < 70) ocrValue = expected;
      else if (bucket < 82) ocrValue = looseFormatVariant(expected, field.type);
      else if (bucket < 94) ocrValue = mutateValue(expected, rowSeed);
      else ocrValue = '';
      rows.push({
        id: `row-${field.id}-${i}`,
        page: 1 + ((rowSeq * 7 + rowSeed) % pageCount),
        fieldId: field.id,
        fieldName: field.name || '—',
        friendlyName: field.friendlyName,
        section: field.section || 'Header',
        expected,
        ocrValue,
        isExtra: false,
      });
    }
  });
  const extraCount = baseHash % 3;
  const descField = config.labels.find(f => f.section === 'Description');
  for (let i = 0; i < extraCount; i++) {
    const seed = hashString(`${seedBase}|extra|${i}`);
    rows.push({
      id: `extra-${i}`,
      page: 1 + (seed % pageCount),
      fieldId: `extra-${i}`,
      fieldName: descField?.name || 'Extra item',
      section: 'Description',
      expected: '',
      ocrValue: `${descField?.name || 'VALUE'}-${seed % 999}`,
      isExtra: true,
    });
  }
  const elapsedSeconds = Math.round((pageCount * (3 + (baseHash % 5)) + (baseHash % 50) / 10) * 10) / 10;
  return { pageCount, elapsedSeconds, rows };
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
const slugify = (s: string) => s.trim().toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');

export const OcrTuningSettings: React.FC<OcrTuningSettingsProps> = ({ language, docTypes, onBack }) => {
  const isTh = language === 'TH';
  const t = (th: string, en: string) => (isTh ? th : en);

  const [schemas, setSchemas] = useState<LabelSchema[]>(() => {
    const saved = typeof window !== 'undefined' ? localStorage.getItem('bizx_label_schemas_v7') : null;
    if (saved) {
      try { return JSON.parse(saved); } catch (e) { console.error('Failed to parse saved schemas', e); }
    }
    return DEFAULT_SCHEMAS;
  });

  const docTypeName = (id: string) => docTypes.find(d => d.id === id)?.name || id;

  // Every (schema, docType) pair is its own pickable option in step 2, e.g. "Invoice / Invoice".
  const schemaOptions = useMemo(() => {
    const opts: { key: string; schema: LabelSchema; config: DocTypeSchemaConfig; docTypeName: string; code: string }[] = [];
    schemas.forEach(schema => {
      schema.configs.forEach(config => {
        const dtName = docTypeName(config.docTypeId);
        opts.push({
          key: `${schema.id}::${config.docTypeId}`,
          schema, config, docTypeName: dtName,
          code: `BIZX_${slugify(schema.name)}_schema__${slugify(dtName)}`,
        });
      });
    });
    return opts;
  }, [schemas, docTypes]);

  // --- Step 1: file ---
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);

  // --- Step 2: schema + advanced tuning ---
  const [selectedKey, setSelectedKey] = useState<string>('');
  const selectedOption = schemaOptions.find(o => o.key === selectedKey) || null;
  // Draft copy of the picked schema — edits (hints/fields/JSON) stay local until explicitly
  // saved back into `schemas`/localStorage via "บันทึก schema เข้า BizX".
  const [draftSchema, setDraftSchema] = useState<LabelSchema | null>(null);
  const [hasUnsavedEdits, setHasUnsavedEdits] = useState(false);
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [advancedTab, setAdvancedTab] = useState<'hints' | 'fields' | 'json'>('hints');
  const [jsonDraft, setJsonDraft] = useState('');
  const [jsonError, setJsonError] = useState<string | null>(null);
  const [openPhraseFieldId, setOpenPhraseFieldId] = useState<string | null>(null);
  const schemaCardRef = useRef<HTMLDivElement>(null);

  const activeConfig: DocTypeSchemaConfig | null = useMemo(() => {
    if (!draftSchema || !selectedOption) return null;
    return draftSchema.configs.find(c => c.docTypeId === selectedOption.config.docTypeId) || draftSchema.configs[0] || null;
  }, [draftSchema, selectedOption]);

  const groupedFields = useMemo(() => {
    const groups: Record<Section, SchemaLabel[]> = { Header: [], Description: [], Footer: [] };
    (activeConfig?.labels || []).forEach(label => {
      const section = label.section || 'Header';
      if (groups[section]) groups[section].push(label);
    });
    return groups;
  }, [activeConfig]);

  const selectSchemaOption = (key: string) => {
    setSelectedKey(key);
    const opt = schemaOptions.find(o => o.key === key);
    setDraftSchema(opt ? cloneSchema(opt.schema) : null);
    setHasUnsavedEdits(false);
    setResults(null);
  };

  const updateField = (fieldId: string, updates: Partial<SchemaLabel>) => {
    if (!draftSchema || !activeConfig) return;
    setDraftSchema({
      ...draftSchema,
      configs: draftSchema.configs.map(c => c.docTypeId === activeConfig.docTypeId
        ? { ...c, labels: c.labels.map(l => l.id === fieldId ? { ...l, ...updates } : l) }
        : c),
    });
    setHasUnsavedEdits(true);
  };

  const removeField = (fieldId: string) => {
    if (!draftSchema || !activeConfig) return;
    setDraftSchema({
      ...draftSchema,
      configs: draftSchema.configs.map(c => c.docTypeId === activeConfig.docTypeId
        ? { ...c, labels: c.labels.filter(l => l.id !== fieldId) }
        : c),
    });
    setHasUnsavedEdits(true);
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
    setHasUnsavedEdits(true);
  };

  const appendPhrase = (fieldId: string, phrase: string) => {
    if (!activeConfig) return;
    const field = activeConfig.labels.find(l => l.id === fieldId);
    if (!field) return;
    const current = field.aiPrompt || '';
    updateField(fieldId, { aiPrompt: current ? `${current} ${phrase}` : phrase });
    setOpenPhraseFieldId(null);
  };

  const openJsonTab = () => {
    setAdvancedTab('json');
    setJsonDraft(activeConfig ? JSON.stringify(activeConfig, null, 2) : '');
    setJsonError(null);
  };

  const applyJsonDraft = () => {
    if (!draftSchema || !activeConfig) return;
    try {
      const parsed = JSON.parse(jsonDraft);
      if (!parsed || typeof parsed !== 'object' || !Array.isArray(parsed.labels)) {
        throw new Error(t('รูปแบบ JSON ไม่ถูกต้อง (ต้องมี labels เป็น array)', 'Invalid JSON shape (labels must be an array)'));
      }
      setDraftSchema({
        ...draftSchema,
        configs: draftSchema.configs.map(c => c.docTypeId === activeConfig.docTypeId ? { ...c, ...parsed, docTypeId: c.docTypeId } : c),
      });
      setHasUnsavedEdits(true);
      setJsonError(null);
      message.success(t('นำ JSON ไปใช้แล้ว', 'JSON applied'));
    } catch (e: any) {
      setJsonError(e.message || t('JSON ไม่ถูกต้อง', 'Invalid JSON'));
    }
  };

  const handleSaveSchema = () => {
    if (!draftSchema) return;
    const toSave: LabelSchema = { ...draftSchema, updatedAt: new Date().toISOString() };
    setSchemas(prev => {
      const next = prev.some(s => s.id === toSave.id) ? prev.map(s => s.id === toSave.id ? toSave : s) : [...prev, toSave];
      if (typeof window !== 'undefined') localStorage.setItem('bizx_label_schemas_v7', JSON.stringify(next));
      return next;
    });
    setHasUnsavedEdits(false);
    message.success(isTh ? 'บันทึก Schema เข้า BizX เรียบร้อย' : 'Schema saved to BizX');
  };

  const goEditHintsThenRetest = () => {
    setAdvancedOpen(true);
    setAdvancedTab('hints');
    schemaCardRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  // --- Step 3: read document ---
  const [isReading, setIsReading] = useState(false);
  const [results, setResults] = useState<TestRun | null>(null);
  const [resultsFilter, setResultsFilter] = useState<'need_fix' | 'all'>('need_fix');
  const [showWorstFields, setShowWorstFields] = useState(false);

  const canRead = !!uploadedFile && !!activeConfig && activeConfig.labels.length > 0;

  const runOcrRead = () => {
    if (!canRead || !activeConfig || !uploadedFile) return;
    setIsReading(true);
    setResults(null);
    window.setTimeout(() => {
      const run = buildTestRun(activeConfig, `${uploadedFile.name}::${draftSchema?.id}`);
      setResults(run);
      setIsReading(false);
      setResultsFilter('need_fix');
    }, 700);
  };

  const updateRowExpected = (rowId: string, value: string) => {
    setResults(prev => prev ? { ...prev, rows: prev.rows.map(r => r.id === rowId ? { ...r, expected: value } : r) } : prev);
  };

  // "Extra" rows (OCR found a value the schema never asked for) can't become correct by editing
  // the expected value — the only resolution is dropping them from the Expected file entirely.
  const dismissExtraRow = (rowId: string) => {
    setResults(prev => prev ? { ...prev, rows: prev.rows.filter(r => r.id !== rowId) } : prev);
  };

  const metrics = useMemo(() => {
    if (!results) return null;
    const comparable = results.rows.filter(r => !r.isExtra);
    const exact = comparable.filter(r => computeRowStatus(r) === 'exact').length;
    const looseOk = comparable.filter(r => ['exact', 'loose'].includes(computeRowStatus(r))).length;
    const wrong = comparable.filter(r => computeRowStatus(r) === 'wrong').length;
    const missing = comparable.filter(r => computeRowStatus(r) === 'missing').length;
    const extra = results.rows.filter(r => r.isExtra).length;
    return { total: comparable.length, exact, looseOk, wrong, missing, extra };
  }, [results]);

  const needFixRows = useMemo(() => results ? results.rows.filter(r => ['wrong', 'missing', 'extra'].includes(computeRowStatus(r))) : [], [results]);
  const filteredRows = useMemo(() => {
    if (!results) return [];
    return resultsFilter === 'all' ? results.rows : needFixRows;
  }, [results, resultsFilter, needFixRows]);

  const worstFields = useMemo(() => {
    if (!results) return [];
    const byField: Record<string, { fieldName: string; total: number; bad: number }> = {};
    results.rows.filter(r => !r.isExtra).forEach(r => {
      if (!byField[r.fieldId]) byField[r.fieldId] = { fieldName: r.fieldName, total: 0, bad: 0 };
      byField[r.fieldId].total++;
      if (['wrong', 'missing'].includes(computeRowStatus(r))) byField[r.fieldId].bad++;
    });
    return Object.values(byField)
      .filter(f => f.bad > 0)
      .sort((a, b) => (b.bad / b.total) - (a.bad / a.total))
      .slice(0, 5);
  }, [results]);

  const readyForDownload = !!results && needFixRows.length === 0;

  // --- Step 5: download ---
  const handleDownloadExcel = () => {
    if (!results) {
      message.info(t('ให้ระบบอ่านเอกสารก่อน จึงจะดาวน์โหลดได้', 'Read the document first before downloading'));
      return;
    }
    const data = results.rows.map(r => ({
      [t('หน้า', 'Page')]: r.page,
      [t('ฟิลด์', 'Field')]: r.fieldName,
      [t('ค่าที่คาดหวัง (Expected)', 'Expected')]: r.expected,
      [t('ค่าที่ OCR อ่านได้', 'OCR Read')]: r.ocrValue,
      [t('ผล', 'Result')]: computeRowStatus(r),
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Expected');
    const baseName = (uploadedFile?.name || 'expected').replace(/\.[^.]+$/, '');
    XLSX.writeFile(wb, `${baseName}_expected.xlsx`);
  };

  const openDetailedComparison = () => {
    message.info(t('หน้าเปรียบเทียบแบบละเอียดอยู่ระหว่างการพัฒนา', 'The detailed comparison page is still being built'));
  };

  // --- Step indicator (progress only — every section below stays visible) ---
  const STEP_LABELS = [
    { th: 'เลือกไฟล์', en: 'Pick file' },
    { th: 'เลือก schema', en: 'Pick schema' },
    { th: 'อ่านเอกสาร', en: 'Read document' },
    { th: 'แก้ให้ถูกต้อง', en: 'Fix values' },
    { th: 'ดาวน์โหลด', en: 'Download' },
  ];
  const currentStep = !uploadedFile ? 1 : !activeConfig ? 2 : !results ? 3 : !readyForDownload ? 4 : 5;

  const STATUS_BADGE: Record<RowStatus, { th: string; en: string; className: string; icon: React.ReactNode }> = {
    exact: { th: 'ตรงกัน', en: 'Match', className: 'text-emerald-600', icon: <Check size={12} /> },
    loose: { th: 'ต่างแค่รูปแบบ', en: 'Format only', className: 'text-amber-600', icon: <Check size={12} /> },
    wrong: { th: 'ไม่ตรงกัน', en: 'Mismatch', className: 'text-rose-600', icon: <X size={12} /> },
    missing: { th: 'ไม่พบ', en: 'Not found', className: 'text-rose-500', icon: <X size={12} /> },
    extra: { th: 'เกินมา', en: 'Extra', className: 'text-purple-600', icon: <Plus size={12} /> },
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans">
      <div className="max-w-6xl mx-auto px-6 py-6">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 mb-5">
          <div className="flex items-start gap-2">
            <button onClick={onBack} className="p-1.5 mt-0.5 hover:bg-slate-100 rounded-[4px] text-slate-400 hover:text-slate-600 cursor-pointer shrink-0">
              <ArrowLeft size={16} />
            </button>
            <div>
              <h1 className="text-xl font-black text-slate-900 tracking-tight">{t('สร้างไฟล์คำตอบที่ถูกต้อง (Expected)', 'Build the Expected Answers File')}</h1>
              <p className="text-sm text-slate-500 mt-0.5">{t('อัปโหลดเอกสาร ให้ระบบอ่านก่อน แล้วคุณแก้ให้ถูกต้อง จากนั้นดาวน์โหลดไปใช้วัดความแม่นยำ', 'Upload a document, let the system read it, correct the results, then download to measure accuracy elsewhere')}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button onClick={handleDownloadExcel} className="flex items-center gap-1.5 px-3.5 py-2 rounded-[4px] border border-slate-200 bg-white text-slate-600 text-sm font-bold hover:bg-slate-50 cursor-pointer">
              <FileSpreadsheet size={14} /> {t('ไฟล์ Excel', 'Excel file')}
            </button>
          </div>
        </div>

        {/* Step indicator */}
        <div className="flex items-center mb-6 bg-white border border-slate-200 rounded-xl px-5 py-3.5">
          {STEP_LABELS.map((s, i) => {
            const idx = i + 1;
            const isCurrent = idx === currentStep;
            return (
              <React.Fragment key={s.th}>
                <div className="flex items-center gap-2 shrink-0">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-black shrink-0 ${
                    isCurrent ? 'bg-[#1f5df9] text-white' : 'bg-white border border-slate-300 text-slate-400'
                  }`}>
                    {idx}
                  </div>
                  <span className={`text-sm font-bold whitespace-nowrap ${isCurrent ? 'text-slate-800' : 'text-slate-400'}`}>
                    {isTh ? s.th : s.en}
                  </span>
                </div>
                {i < STEP_LABELS.length - 1 && <div className="flex-1 h-px bg-slate-200 mx-3" />}
              </React.Fragment>
            );
          })}
        </div>

        <div className="space-y-4">
          {/* Section 1 — file */}
          <div className="bg-white border border-slate-200 rounded-xl p-5">
            <h3 className="text-[15px] font-black text-slate-800 mb-3">{t('1. เลือกไฟล์เอกสาร', '1. Pick a document')}</h3>
            <label className="flex flex-col items-center justify-center gap-2 py-10 border-2 border-dashed border-slate-200 rounded-xl cursor-pointer hover:border-[#1f5df9] hover:bg-blue-50/20 transition-all">
              <Upload size={26} className="text-[#1f5df9]" />
              <span className="text-sm font-bold text-slate-700">
                {uploadedFile ? uploadedFile.name : t('ลากไฟล์มาวางที่นี่ หรือ คลิกเพื่อเลือกไฟล์', 'Drop a file here, or click to choose one')}
              </span>
              <span className="text-xs text-slate-400">{t('รองรับไฟล์ PDF', 'Supports PDF files')}</span>
              <input
                type="file"
                accept=".pdf"
                className="hidden"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) { setUploadedFile(f); setResults(null); } }}
              />
            </label>
          </div>

          {/* Section 2 — schema */}
          <div ref={schemaCardRef} className="bg-white border border-slate-200 rounded-xl p-5">
            <h3 className="text-[15px] font-black text-slate-800 mb-3">{t('2. เลือก schema', '2. Pick a schema')}</h3>
            <div className="flex items-start gap-2 p-3 rounded-[8px] bg-blue-50 border border-blue-100 text-[13px] text-blue-700 mb-3">
              <Info size={15} className="shrink-0 mt-0.5" />
              <span>{t('schema คือรายการฟิลด์ที่ต้องการดึงออกมา หน้านี้จะแสดงเฉพาะ schema ที่ชื่อมีคำว่า generic เท่านั้น — 1 schema ใช้ได้หลายชนิดเอกสาร กรุณาเลือกชนิดเอกสารให้ตรงกับไฟล์ที่อัปโหลด', 'A schema is the list of fields to extract. 1 schema can serve multiple document types — pick the type matching the file you uploaded.')}</span>
            </div>
            <select
              value={selectedKey}
              onChange={(e) => selectSchemaOption(e.target.value)}
              className="w-full px-3 py-2.5 rounded-[4px] border border-slate-200 text-sm font-semibold bg-white focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-[#1f5df9]"
            >
              <option value="">{t('— เลือก schema —', '— Pick a schema —')}</option>
              {schemaOptions.map(o => (
                <option key={o.key} value={o.key}>{o.schema.name} / {o.docTypeName}</option>
              ))}
            </select>
            {selectedOption && (
              <p className="text-[11px] font-mono text-slate-400 mt-1.5">{t('รหัสที่ใช้จริง', 'Actual code')}: {selectedOption.code}</p>
            )}

            {activeConfig && (
              <div className="mt-4 pt-4 border-t border-slate-100">
                <button
                  onClick={() => setAdvancedOpen(v => !v)}
                  className="flex items-center gap-1.5 text-sm font-bold text-slate-600 hover:text-[#1f5df9] cursor-pointer"
                >
                  {advancedOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                  {t('ตั้งค่าขั้นสูง (แก้ฟิลด์และคำใบ้)', 'Advanced settings (edit fields and hints)')}
                </button>

                {advancedOpen && (
                  <div className="mt-3">
                    <div className="flex items-center gap-4 border-b border-slate-200 mb-3">
                      {([
                        { key: 'hints' as const, th: 'คำใบ้ (hints)', en: 'Hints' },
                        { key: 'fields' as const, th: 'ฟิลด์', en: 'Fields' },
                        { key: 'json' as const, th: 'แก้เป็น JSON', en: 'Edit as JSON' },
                      ]).map(tab => (
                        <button
                          key={tab.key}
                          onClick={() => tab.key === 'json' ? openJsonTab() : setAdvancedTab(tab.key)}
                          className={`pb-2 text-sm font-bold cursor-pointer border-b-2 -mb-px transition-all ${
                            advancedTab === tab.key ? 'border-[#1f5df9] text-[#1f5df9]' : 'border-transparent text-slate-500 hover:text-slate-700'
                          }`}
                        >
                          {isTh ? tab.th : tab.en}
                        </button>
                      ))}
                    </div>

                    {advancedTab === 'hints' && (
                      <div>
                        <div className="flex items-start gap-2 p-3 rounded-[8px] bg-blue-50 border border-blue-100 text-[13px] text-blue-700 mb-3">
                          <Info size={15} className="shrink-0 mt-0.5" />
                          <span>{t('hints คือคำอธิบายภาษาอังกฤษ บอก AI ว่าฟิลด์นี้อยู่ตรงไหนของเอกสาร และให้อ่านอย่างไร — เขียนยาวหลายบรรทัดได้ ยิ่งอธิบายชัด ยิ่งอ่านแม่น', 'Hints are English descriptions telling the AI where a field sits on the document and how to read it — the more specific, the more accurate the read.')}</span>
                        </div>
                        <div className="grid grid-cols-[180px_1fr] gap-x-4 gap-y-1 text-[11px] font-black text-slate-400 uppercase tracking-widest px-1 mb-1">
                          <span>{t('ฟิลด์', 'Field')}</span>
                          <span>{t('คำใบ้', 'Hint')}</span>
                        </div>
                        <div className="space-y-2">
                          {(activeConfig.labels.length === 0) && (
                            <p className="text-xs text-slate-300 italic py-2">{t('ยังไม่มีฟิลด์ในสคีมานี้', 'This schema has no fields yet')}</p>
                          )}
                          {activeConfig.labels.map(field => (
                            <div key={field.id} className="grid grid-cols-[180px_1fr] gap-x-4 items-start group/hintRow">
                              <div className="pt-2 text-sm font-mono font-semibold text-slate-700 truncate">{field.name || '—'}</div>
                              <div className="relative">
                                <textarea
                                  value={field.aiPrompt || ''}
                                  onChange={(e) => updateField(field.id, { aiPrompt: e.target.value })}
                                  placeholder={t('เช่น top right, under the words TAX INVOICE', 'e.g. top right, under the words TAX INVOICE')}
                                  rows={1}
                                  className="w-full pl-3 pr-16 py-2 text-sm text-slate-700 bg-white border border-slate-200 rounded-[4px] resize-y focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-[#1f5df9]"
                                />
                                <div className="absolute right-1.5 top-1.5 flex items-center gap-1 opacity-0 group-hover/hintRow:opacity-100 focus-within:opacity-100 transition-opacity">
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
                                      className="w-6 h-6 rounded-full bg-emerald-50 text-emerald-600 hover:bg-emerald-100 flex items-center justify-center cursor-pointer"
                                    >
                                      <Lightbulb size={12} />
                                    </button>
                                  </Popover>
                                  <a
                                    href={`https://www.google.com/search?q=${encodeURIComponent(field.name || '')}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    title={t('ค้นหาใน Google', 'Search on Google')}
                                    className="w-6 h-6 rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 flex items-center justify-center cursor-pointer"
                                  >
                                    <Search size={12} />
                                  </a>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {advancedTab === 'fields' && (
                      <div className="space-y-4">
                        {SECTIONS.map(section => (
                          <div key={section}>
                            <div className="flex items-center justify-between mb-2">
                              <h5 className="text-[11px] font-black text-slate-400 uppercase tracking-widest">
                                {section === 'Header' ? t('ส่วนหัว (Header)', 'Header') : section === 'Description' ? t('ส่วนรายละเอียด (Description)', 'Description') : t('ส่วนท้าย (Footer)', 'Footer')}
                              </h5>
                              <button onClick={() => addField(section)} className="flex items-center gap-1 text-[11px] font-bold text-[#1f5df9] hover:underline cursor-pointer">
                                <Plus size={12} /> {t('เพิ่มฟิลด์ใหม่', 'Add field')}
                              </button>
                            </div>
                            <div className="space-y-2">
                              {groupedFields[section].length === 0 && (
                                <p className="text-xs text-slate-300 italic py-1">{t('ยังไม่มีฟิลด์ในส่วนนี้', 'No fields in this section yet')}</p>
                              )}
                              {groupedFields[section].map(field => (
                                <div key={field.id} className="flex items-center gap-2 p-2 bg-slate-50/60 rounded-[8px] border border-slate-200/70">
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
                                  <button onClick={() => removeField(field.id)} className="p-1.5 text-rose-400 hover:text-rose-600 hover:bg-rose-50 rounded-[4px] cursor-pointer shrink-0">
                                    <Trash2 size={14} />
                                  </button>
                                </div>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {advancedTab === 'json' && (
                      <div>
                        <textarea
                          value={jsonDraft}
                          onChange={(e) => setJsonDraft(e.target.value)}
                          rows={14}
                          className="w-full px-3 py-2.5 text-xs font-mono text-slate-700 bg-slate-50 border border-slate-200 rounded-[8px] focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-[#1f5df9]"
                        />
                        {jsonError && <p className="text-xs font-bold text-rose-500 mt-1.5">{jsonError}</p>}
                        <button
                          onClick={applyJsonDraft}
                          className="mt-2 px-3.5 py-2 rounded-[4px] bg-[#1f5df9] text-white text-xs font-bold cursor-pointer hover:bg-[#1a4fd6]"
                        >
                          {t('นำ JSON นี้ไปใช้', 'Apply this JSON')}
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Section 3 — read document */}
          <div className="bg-white border border-slate-200 rounded-xl p-5">
            <h3 className="text-[15px] font-black text-slate-800 mb-3">{t('3. ให้ระบบอ่านเอกสาร', '3. Let the system read the document')}</h3>
            <button
              onClick={runOcrRead}
              disabled={!canRead || isReading}
              className="flex items-center gap-2 px-4 py-2.5 rounded-[4px] bg-[#1f5df9] text-white text-sm font-bold cursor-pointer hover:bg-[#1a4fd6] disabled:opacity-30 disabled:cursor-not-allowed"
            >
              {isReading ? <Loader2 size={16} className="animate-spin" /> : <Play size={16} />}
              {isReading ? t('กำลังอ่าน...', 'Reading...') : t('เริ่มอ่านเอกสาร', 'Start reading')}
            </button>
          </div>

          {/* Results */}
          {results && metrics && (
            <div className="bg-white border border-slate-200 rounded-xl p-5">
              <h3 className="text-[15px] font-black text-slate-800 mb-3">{t('ผลการทดสอบ', 'Test results')}</h3>

              <div className="grid grid-cols-4 border border-slate-200 rounded-[8px] overflow-hidden mb-3">
                {[
                  { label: t('ตรงกันเป๊ะ', 'Exact match'), value: `${metrics.total ? Math.round((metrics.exact / metrics.total) * 100) : 0}%`, sub: `${metrics.exact}/${metrics.total}` },
                  { label: t('ตรงแบบยืดหยุ่น', 'Loose match'), value: `${metrics.total ? Math.round((metrics.looseOk / metrics.total) * 100) : 0}%`, sub: `${metrics.looseOk}/${metrics.total}` },
                  { label: t('ผิด', 'Wrong'), value: String(metrics.wrong) },
                  { label: t('ไม่พบ', 'Not found'), value: String(metrics.missing) },
                  { label: t('เกินมา', 'Extra'), value: String(metrics.extra) },
                  { label: t('จำนวนหน้า', 'Pages'), value: String(results.pageCount) },
                  { label: t('เวลาที่ใช้', 'Time taken'), value: `${results.elapsedSeconds} ${t('วินาที', 'sec')}` },
                  { label: t('ฟิลด์ทั้งหมด', 'Total fields'), value: String(metrics.total) },
                ].map((cell, i) => (
                  <div key={i} className="border-b border-r border-slate-200 p-3 [&:nth-child(4n)]:border-r-0 [&:nth-last-child(-n+4)]:border-b-0">
                    <div className="text-[11px] font-bold text-slate-400 mb-1">{cell.label}</div>
                    <div className="flex items-baseline gap-1.5">
                      <span className={`text-lg font-black ${cell.sub ? 'text-emerald-600' : 'text-slate-700'}`}>{cell.value}</span>
                      {cell.sub && <span className="text-xs font-bold text-slate-400">{cell.sub}</span>}
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex items-start gap-2 p-3 rounded-[8px] bg-blue-50 border border-blue-100 text-[13px] text-blue-700 mb-3">
                <Info size={15} className="shrink-0 mt-0.5" />
                <span>{t('"ต่างแค่รูปแบบ" = ค่าถูกต้องแต่เขียนคนละแบบ เช่น 1,000.00 กับ 1000 หรือ 10/07/2026 กับ 2026-07-10 ถือว่าใช้ได้ — ถ้าคะแนนยังไม่ดี ให้แก้คำใบ้ด้านบน แล้วกดเริ่มทดสอบอีกครั้ง ไม่ต้องอัปโหลดใหม่', '"Format only" = the value is correct but written differently, e.g. 1,000.00 vs 1000 — if the score isn\'t good, edit the hints above and re-run the test, no need to re-upload')}</span>
              </div>

              <div className="flex items-center justify-between flex-wrap gap-2 mb-3">
                <div className="flex items-center gap-1 p-1 bg-slate-50 border border-slate-200 rounded-[8px] w-fit">
                  <button onClick={() => setResultsFilter('need_fix')} className={`px-3 py-1.5 text-xs font-bold rounded-[4px] cursor-pointer ${resultsFilter === 'need_fix' ? 'bg-white text-[#1f5df9] border border-slate-200 shadow-sm' : 'text-slate-500'}`}>
                    {t('เฉพาะที่ต้องแก้', 'Needs fixing')} ({needFixRows.length})
                  </button>
                  <button onClick={() => setResultsFilter('all')} className={`px-3 py-1.5 text-xs font-bold rounded-[4px] cursor-pointer ${resultsFilter === 'all' ? 'bg-white text-[#1f5df9] border border-slate-200 shadow-sm' : 'text-slate-500'}`}>
                    {t('ทั้งหมด', 'All')} ({results.rows.length})
                  </button>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={goEditHintsThenRetest} className="flex items-center gap-1.5 px-3 py-2 rounded-[4px] border border-slate-200 bg-white text-slate-600 text-xs font-bold hover:bg-slate-50 cursor-pointer">
                    <FileText size={13} /> {t('แก้คำใบ้แล้วทดสอบใหม่', 'Edit hints & re-test')}
                  </button>
                  <button
                    onClick={handleSaveSchema}
                    disabled={!hasUnsavedEdits}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-[4px] border border-slate-200 bg-white text-slate-600 text-xs font-bold hover:bg-slate-50 cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-white"
                  >
                    <Save size={13} /> {t('บันทึก schema เข้า BizX', 'Save schema to BizX')}
                  </button>
                </div>
              </div>

              <div className="border border-slate-200 rounded-[8px] overflow-hidden">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="bg-slate-50 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                      <th className="px-4 py-2.5 w-16">{t('หน้า', 'Page')}</th>
                      <th className="px-4 py-2.5">{t('ฟิลด์', 'Field')}</th>
                      <th className="px-4 py-2.5">{t('ค่าที่คาดหวัง', 'Expected')}</th>
                      <th className="px-4 py-2.5">{t('ค่าที่ OCR อ่านได้', 'OCR read')}</th>
                      <th className="px-4 py-2.5">{t('ผล', 'Result')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredRows.length === 0 && (
                      <tr>
                        <td colSpan={5} className="px-4 py-14">
                          <div className="flex flex-col items-center gap-2 text-slate-300">
                            <FileText size={28} />
                            <span className="text-xs font-bold">No Data</span>
                          </div>
                        </td>
                      </tr>
                    )}
                    {filteredRows.map(r => {
                      const status = computeRowStatus(r);
                      const badge = STATUS_BADGE[status];
                      return (
                        <tr key={r.id} className="border-t border-slate-100">
                          <td className="px-4 py-2 align-top text-slate-500 font-mono text-xs">{r.page}</td>
                          <td className="px-4 py-2 align-top">
                            <div className="font-bold text-slate-700">{r.fieldName}</div>
                            {r.friendlyName && <div className="text-[11px] text-slate-400 mt-0.5">{r.friendlyName}</div>}
                          </td>
                          <td className="px-4 py-2 align-top">
                            <input
                              type="text"
                              value={r.expected}
                              onChange={(e) => updateRowExpected(r.id, e.target.value)}
                              className="w-full px-2 py-1 font-mono text-xs text-slate-700 bg-white border border-slate-200 rounded-[4px] focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-[#1f5df9]"
                            />
                          </td>
                          <td className="px-4 py-2 align-top font-mono text-xs text-slate-500">
                            {r.ocrValue || <span className="italic text-slate-300">{t('(ไม่พบ)', '(not found)')}</span>}
                          </td>
                          <td className="px-4 py-2 align-top">
                            <div className="flex items-center gap-2">
                              <span className={`inline-flex items-center gap-1 text-xs font-bold ${badge.className}`}>
                                {badge.icon} {isTh ? badge.th : badge.en}
                              </span>
                              {r.isExtra && (
                                <button
                                  onClick={() => dismissExtraRow(r.id)}
                                  title={t('ไม่ใช่ฟิลด์จริง ตัดออกจากไฟล์ Expected', 'Not a real field — drop it from the Expected file')}
                                  className="text-slate-300 hover:text-rose-500 cursor-pointer"
                                >
                                  <Trash2 size={12} />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {worstFields.length > 0 && (
                <div className="mt-3">
                  <button onClick={() => setShowWorstFields(v => !v)} className="flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-slate-700 cursor-pointer">
                    {showWorstFields ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                    {t('ฟิลด์ที่แย่ที่สุด (ควรแก้คำใบ้ฟิลด์เหล่านี้ก่อน)', 'Worst fields (fix these hints first)')}
                  </button>
                  {showWorstFields && (
                    <div className="mt-2 space-y-1">
                      {worstFields.map(f => (
                        <div key={f.fieldName} className="flex items-center justify-between px-3 py-1.5 bg-rose-50/50 rounded-[4px] text-xs">
                          <span className="font-bold text-slate-700">{f.fieldName}</span>
                          <span className="font-mono text-rose-600">{f.bad}/{f.total} {t('ผิด', 'wrong')}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              <button onClick={openDetailedComparison} className="flex items-center gap-1 text-xs font-bold text-[#1f5df9] hover:underline cursor-pointer mt-3">
                {t('เปิดหน้าเปรียบเทียบแบบละเอียด (แท็บใหม่)', 'Open detailed comparison (new tab)')} <ArrowUpRight size={12} />
              </button>
            </div>
          )}

          {/* Section 5 — download */}
          {results && (
            <div className="bg-white border border-slate-200 rounded-xl p-5">
              <h3 className="text-[15px] font-black text-slate-800 mb-1">{t('5. ดาวน์โหลด', '5. Download')}</h3>
              <p className="text-xs text-slate-400 mb-3">
                {readyForDownload
                  ? t('แก้ค่าคาดหวังครบทุกรายการแล้ว พร้อมดาวน์โหลด', 'Every expected value has been fixed — ready to download')
                  : t('ยังมีรายการที่ต้องแก้อยู่ — ดาวน์โหลดได้เลยหรือจะแก้ให้ครบก่อนก็ได้', 'Some rows still need fixing — you can download now or finish fixing first')}
              </p>
              <button onClick={handleDownloadExcel} className="flex items-center gap-2 px-4 py-2.5 rounded-[4px] bg-[#1f5df9] text-white text-sm font-bold cursor-pointer hover:bg-[#1a4fd6]">
                <Download size={16} /> {t('ดาวน์โหลดไฟล์ Expected (Excel)', 'Download the Expected file (Excel)')}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
