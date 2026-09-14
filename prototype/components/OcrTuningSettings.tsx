import React, { useState, useMemo, useRef } from 'react';
import { message, Modal } from 'antd';
import {
  Plus, Trash2, Upload, FileText, FileSpreadsheet, FileCode2, Check, X,
  ChevronDown, Save, RotateCcw, Search, Sparkles
} from 'lucide-react';
import { Language, DocType } from '../types';
import { LabelSchema, SchemaLabel, DocTypeSchemaConfig, DEFAULT_SCHEMAS } from './LabelSchemaSettings';

interface OcrTuningSettingsProps {
  language: Language;
  docTypes: DocType[];
}

type Section = 'Header' | 'Description' | 'Footer';
const SECTIONS: Section[] = ['Header', 'Description', 'Footer'];
type ExtractionMethod = 'ai' | 'excel' | 'xml';

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

const buildMockValue = (field: SchemaLabel, seed: number): string => {
  const type = field.type || 'string';
  if (type === 'number') return ((seed % 90000) / 100).toFixed(2);
  if (type === 'boolean') return seed % 2 === 0 ? 'ใช่' : 'ไม่ใช่';
  if (type === 'date') {
    const day = (seed % 28) + 1;
    const month = (Math.floor(seed / 28) % 12) + 1;
    return `${String(day).padStart(2, '0')}/${String(month).padStart(2, '0')}/2026`;
  }
  if (type === 'array') return `${(seed % 12) + 1} รายการ`;
  const name = (field.name || '').toLowerCase();
  if (name.includes('invoice')) return `INV-2026-${String(seed % 9999).padStart(4, '0')}`;
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

interface TestFieldResult { fieldId: string; fieldName: string; friendlyName?: string; value: string; matched: boolean; blank: boolean; }
const mockTestField = (field: SchemaLabel, seed: string): TestFieldResult => {
  const h = hashString(field.id + '|' + seed);
  const expected = buildMockValue(field, h);
  const bucket = h % 10;
  if (bucket < 7) return { fieldId: field.id, fieldName: field.name || '—', friendlyName: field.friendlyName, value: expected, matched: true, blank: false };
  if (bucket < 9) return { fieldId: field.id, fieldName: field.name || '—', friendlyName: field.friendlyName, value: mutateValue(expected, h), matched: false, blank: false };
  return { fieldId: field.id, fieldName: field.name || '—', friendlyName: field.friendlyName, value: '', matched: false, blank: true };
};

const TYPE_OPTIONS: { value: string; th: string; en: string }[] = [
  { value: 'string', th: 'ข้อความ', en: 'Text' },
  { value: 'number', th: 'ตัวเลข', en: 'Number' },
  { value: 'boolean', th: 'ใช่/ไม่ใช่', en: 'Yes/No' },
  { value: 'date', th: 'วันที่', en: 'Date' },
  { value: 'array', th: 'ชุดข้อมูล', en: 'Array' },
];

const SECTION_LABEL = (section: Section, isTh: boolean): string => {
  if (section === 'Header') return isTh ? 'ส่วนหัว' : 'Header';
  if (section === 'Description') return isTh ? 'รายการสินค้า' : 'Line items';
  return isTh ? 'ส่วนท้าย' : 'Footer';
};

const cloneSchema = (schema: LabelSchema): LabelSchema => JSON.parse(JSON.stringify(schema));
const genId = (prefix: string) => `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

export const OcrTuningSettings: React.FC<OcrTuningSettingsProps> = ({ language, docTypes }) => {
  const isTh = language === 'TH';
  const t = (th: string, en: string) => (isTh ? th : en);
  const docTypeName = (id: string) => docTypes.find(d => d.id === id)?.name || id;

  const [schemas, setSchemas] = useState<LabelSchema[]>(() => {
    const saved = typeof window !== 'undefined' ? localStorage.getItem('bizx_label_schemas_v7') : null;
    if (saved) {
      try { return JSON.parse(saved); } catch (e) { console.error('Failed to parse saved schemas', e); }
    }
    return DEFAULT_SCHEMAS;
  });

  // Every (schema, docType) pair is its own pickable option — e.g. "Invoice / Invoice".
  const schemaOptions = useMemo(() => {
    const opts: { key: string; schema: LabelSchema; config: DocTypeSchemaConfig; docTypeName: string }[] = [];
    schemas.forEach(schema => {
      schema.configs.forEach(config => {
        opts.push({ key: `${schema.id}::${config.docTypeId}`, schema, config, docTypeName: docTypeName(config.docTypeId) });
      });
    });
    return opts;
  }, [schemas, docTypes]);

  // --- 1. เลือกงาน ---
  const [mode, setMode] = useState<'new' | 'edit'>('new');

  // --- 2. ชื่อ schema และจุดเริ่มต้น (new mode only) ---
  const [nameDraft, setNameDraft] = useState('');
  const [nameDocTypeId, setNameDocTypeId] = useState<string>(docTypes[0]?.id || '');
  const [startFrom, setStartFrom] = useState<'copy' | 'blank'>('copy');
  const [copySourceKey, setCopySourceKey] = useState('');
  const [newConfirmed, setNewConfirmed] = useState(false);

  // --- แก้ไข schema เดิม (edit mode only) ---
  const [editKey, setEditKey] = useState('');

  // --- Working schema (shared by both modes once identified) ---
  const [draftSchema, setDraftSchema] = useState<LabelSchema | null>(null);
  const [activeDocTypeId, setActiveDocTypeId] = useState<string | null>(null);

  const activeConfig: DocTypeSchemaConfig | null = useMemo(() => {
    if (!draftSchema) return null;
    return draftSchema.configs.find(c => c.docTypeId === activeDocTypeId) || draftSchema.configs[0] || null;
  }, [draftSchema, activeDocTypeId]);

  const resetAll = () => {
    setMode('new');
    setNameDraft('');
    setNameDocTypeId(docTypes[0]?.id || '');
    setStartFrom('copy');
    setCopySourceKey('');
    setNewConfirmed(false);
    setEditKey('');
    setDraftSchema(null);
    setActiveDocTypeId(null);
    setActiveSectionTab('Header');
    setSearchQuery('');
    setOnlyMissingHints(false);
    setExpandedHints(false);
    setNewFieldName(''); setNewFieldThai(''); setNewFieldType('string'); setNewFieldHint('');
    setTestVisible(true);
    setTestMethod('ai');
    setTestFile(null);
    setTestResults(null);
    setSavedOnce(false);
  };

  // Past step 2, a schema draft (and its fields) exists — confirm before throwing it away.
  const confirmResetAll = () => {
    if (!draftSchema) { resetAll(); return; }
    Modal.confirm({
      title: t('เริ่มใหม่ทั้งหมด?', 'Start over?'),
      content: t('ข้อมูลที่กรอกไว้ทั้งหมด รวมถึงฟิลด์ที่แก้ไข จะหายไป — การเริ่มใหม่ไม่สามารถย้อนกลับได้', 'Everything entered so far, including edited fields, will be lost — this can\'t be undone.'),
      okText: t('เริ่มใหม่', 'Start over'),
      okType: 'danger',
      cancelText: t('ยกเลิก', 'Cancel'),
      onOk: resetAll,
    });
  };

  const switchMode = (next: 'new' | 'edit') => {
    setMode(next);
    setDraftSchema(null);
    setActiveDocTypeId(null);
    setNewConfirmed(false);
    setEditKey('');
    setTestResults(null);
    setSavedOnce(false);
  };

  // Past step 2, a draft schema exists — switching "สร้าง/แก้ไข" would silently drop it.
  const confirmSwitchMode = (next: 'new' | 'edit') => {
    if (next === mode) return;
    if (!draftSchema) { switchMode(next); return; }
    Modal.confirm({
      title: t('เปลี่ยนโหมด?', 'Switch mode?'),
      content: t('ข้อมูลที่กรอกไว้ทั้งหมด รวมถึงฟิลด์ที่แก้ไข จะหายไป — การเปลี่ยนโหมดไม่สามารถย้อนกลับได้', 'Everything entered so far, including edited fields, will be lost — this can\'t be undone.'),
      okText: t('เปลี่ยนโหมด', 'Switch'),
      okType: 'danger',
      cancelText: t('ยกเลิก', 'Cancel'),
      onOk: () => switchMode(next),
    });
  };

  // Also used to swap the starting point after the schema's already been created — it
  // re-clones fields from the newly picked source and replaces the draft's current fields,
  // keeping the same schema id so it isn't treated as a second, separate schema.
  const confirmNewSchema = () => {
    if (!nameDraft.trim() || !nameDocTypeId) return;
    let labels: SchemaLabel[] = [];
    if (startFrom === 'copy' && copySourceKey) {
      const src = schemaOptions.find(o => o.key === copySourceKey);
      if (src) labels = JSON.parse(JSON.stringify(src.config.labels)).map((l: SchemaLabel) => ({ ...l, id: genId('field') }));
    }
    const config: DocTypeSchemaConfig = { docTypeId: nameDocTypeId, labels, extractionMethod: 'ai' };
    const schema: LabelSchema = draftSchema
      ? { ...draftSchema, name: nameDraft.trim(), docTypes: [nameDocTypeId], configs: [config] }
      : {
          id: genId('ls'), name: nameDraft.trim(), description: '', docTypes: [nameDocTypeId],
          workflowIds: [], assignedTeams: ['ALL'], updatedAt: new Date().toISOString(), configs: [config],
        };
    setDraftSchema(schema);
    setActiveDocTypeId(nameDocTypeId);
    setNewConfirmed(true);
    setSavedOnce(false);
  };

  const pickEditSchema = (key: string) => {
    setEditKey(key);
    const opt = schemaOptions.find(o => o.key === key);
    if (!opt) { setDraftSchema(null); return; }
    setDraftSchema(cloneSchema(opt.schema));
    setActiveDocTypeId(opt.config.docTypeId);
    setTestResults(null);
    setSavedOnce(false);
  };

  const [savedOnce, setSavedOnce] = useState(false);
  const handleSaveSchema = () => {
    if (!draftSchema) return;
    const toSave: LabelSchema = { ...draftSchema, updatedAt: new Date().toISOString() };
    setSchemas(prev => {
      const next = prev.some(s => s.id === toSave.id) ? prev.map(s => s.id === toSave.id ? toSave : s) : [...prev, toSave];
      if (typeof window !== 'undefined') localStorage.setItem('bizx_label_schemas_v7', JSON.stringify(next));
      return next;
    });
    setSavedOnce(true);
    message.success(isTh ? 'บันทึก Schema เรียบร้อย' : 'Schema saved');
  };

  // --- 3. ฟิลด์และคำอธิบายฟิลด์/ตำแหน่ง ---
  const [activeSectionTab, setActiveSectionTab] = useState<Section>('Header');
  const [searchQuery, setSearchQuery] = useState('');
  const [onlyMissingHints, setOnlyMissingHints] = useState(false);
  const [expandedHints, setExpandedHints] = useState(false);
  const [revealedThaiFieldIds, setRevealedThaiFieldIds] = useState<Set<string>>(new Set());
  const [justAddedFieldId, setJustAddedFieldId] = useState<string | null>(null);

  const groupedFields = useMemo(() => {
    const groups: Record<Section, SchemaLabel[]> = { Header: [], Description: [], Footer: [] };
    (activeConfig?.labels || []).forEach(label => {
      const section = label.section || 'Header';
      if (groups[section]) groups[section].push(label);
    });
    return groups;
  }, [activeConfig]);

  const missingHintCount = useMemo(() => (activeConfig?.labels || []).filter(l => !l.aiPrompt?.trim()).length, [activeConfig]);

  const visibleFields = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return groupedFields[activeSectionTab].filter(f => {
      if (onlyMissingHints && f.aiPrompt?.trim()) return false;
      if (!q) return true;
      return f.name.toLowerCase().includes(q) || (f.friendlyName || '').toLowerCase().includes(q) || (f.aiPrompt || '').toLowerCase().includes(q);
    });
  }, [groupedFields, activeSectionTab, searchQuery, onlyMissingHints]);

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

  const confirmRemoveField = (field: SchemaLabel) => {
    Modal.confirm({
      title: t('ลบฟิลด์นี้?', 'Delete this field?'),
      content: t(`ต้องการลบฟิลด์ "${field.name || '—'}" ใช่หรือไม่ — การลบไม่สามารถย้อนกลับได้`, `Delete the field "${field.name || '—'}"? This can't be undone.`),
      okText: t('ลบ', 'Delete'),
      okType: 'danger',
      cancelText: t('ยกเลิก', 'Cancel'),
      onOk: () => removeField(field.id),
    });
  };

  const assistWrite = (field: SchemaLabel) => {
    if (field.aiPrompt?.trim()) return;
    const phrase = READY_MADE_PHRASES_TH[hashString(field.id) % READY_MADE_PHRASES_TH.length];
    updateField(field.id, { aiPrompt: phrase });
  };

  // --- Quick-add field row ---
  const [newFieldName, setNewFieldName] = useState('');
  const [newFieldThai, setNewFieldThai] = useState('');
  const [newFieldType, setNewFieldType] = useState('string');
  const [newFieldHint, setNewFieldHint] = useState('');

  const addQuickField = (focusHint: boolean) => {
    if (!draftSchema || !activeConfig || !newFieldName.trim()) return;
    const newField: SchemaLabel = {
      id: genId('field'), name: newFieldName.trim(), required: true, compare: false,
      type: newFieldType, section: activeSectionTab,
      friendlyName: newFieldThai.trim() || undefined,
      aiPrompt: newFieldHint.trim() || undefined,
    };
    setDraftSchema({
      ...draftSchema,
      configs: draftSchema.configs.map(c => c.docTypeId === activeConfig.docTypeId
        ? { ...c, labels: [...c.labels, newField] }
        : c),
    });
    setNewFieldName(''); setNewFieldThai(''); setNewFieldType('string'); setNewFieldHint('');
    if (focusHint) setJustAddedFieldId(newField.id);
  };

  // --- 4. ทดสอบ (ไม่บังคับ) ---
  const [testVisible, setTestVisible] = useState(true);
  const [testMethod, setTestMethod] = useState<ExtractionMethod>('ai');
  const [testFile, setTestFile] = useState<File | null>(null);
  const [isTesting, setIsTesting] = useState(false);
  const [testResults, setTestResults] = useState<TestFieldResult[] | null>(null);
  const [isDraggingFile, setIsDraggingFile] = useState(false);

  const handleFileDragOver = (e: React.DragEvent) => { e.preventDefault(); setIsDraggingFile(true); };
  const handleFileDragLeave = () => setIsDraggingFile(false);
  const handleFileDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingFile(false);
    const f = e.dataTransfer.files?.[0];
    if (f) { setTestFile(f); setTestResults(null); }
  };

  const TEST_TABS: { key: ExtractionMethod; th: string; en: string; icon: React.ReactNode; accept: string }[] = [
    { key: 'ai', th: 'PDF / รูปภาพ', en: 'PDF / Image', icon: <FileText size={13} />, accept: '.pdf,.png,.jpg,.jpeg' },
    { key: 'excel', th: 'Excel', en: 'Excel', icon: <FileSpreadsheet size={13} />, accept: '.xlsx,.xls,.csv' },
    { key: 'xml', th: 'XML', en: 'XML', icon: <FileCode2 size={13} />, accept: '.xml' },
  ];

  const runTest = () => {
    if (!activeConfig || activeConfig.labels.length === 0 || !testFile) return;
    setIsTesting(true);
    setTestResults(null);
    window.setTimeout(() => {
      setTestResults(activeConfig.labels.map(f => mockTestField(f, testFile.name)));
      setIsTesting(false);
    }, 600);
  };

  const testMetrics = useMemo(() => {
    if (!testResults) return null;
    const total = testResults.length;
    const matched = testResults.filter(r => r.matched).length;
    return { total, matched, pct: total ? Math.round((matched / total) * 100) : 0 };
  }, [testResults]);

  // --- Step indicator (decorative — this is a single always-visible page, not a gated wizard —
  // but it should still reflect real progress: step 1 active and the rest disabled on a fresh
  // load, advancing/checking off as the user actually does each thing, rather than always
  // showing everything but the last step as already done). ---
  const STEP_LABELS = [
    { th: 'เลือกงาน', en: 'Choose task' },
    { th: 'ชื่อและต้นแบบ', en: 'Name & base' },
    { th: 'ฟิลด์และคำอธิบาย', en: 'Fields & hints' },
    { th: 'ทดสอบ (ไม่บังคับ)', en: 'Test (optional)' },
    { th: 'บันทึก', en: 'Save' },
  ];
  const hasChosenTask = mode === 'new' ? !!nameDraft.trim() : !!editKey;
  const currentStep = savedOnce ? 5
    : !hasChosenTask ? 1
    : !draftSchema ? 2
    : !testResults ? 3
    : 4;

  // Body cards renumber depending on mode — editing an existing schema skips the "name & base"
  // card entirely, since the schema already has both.
  const cardNumbers = mode === 'new' ? { fields: 3, test: 4 } : { fields: 2, test: 3 };
  const showWorkingCards = !!draftSchema;

  // Clicking a step in the indicator jumps straight to that section — "บันทึก" has no card of
  // its own (saving is just the header button), so it scrolls to the top instead.
  const topRef = useRef<HTMLDivElement>(null);
  const step1Ref = useRef<HTMLDivElement>(null);
  const step2Ref = useRef<HTMLDivElement>(null);
  const fieldsRef = useRef<HTMLDivElement>(null);
  const testRef = useRef<HTMLDivElement>(null);
  // Edit mode has no separate "name & base" card — picking the schema in step 1 covers it —
  // so step 2 anchors back to step 1's card instead of a nonexistent section.
  const STEP_REFS = [step1Ref, mode === 'new' ? step2Ref : step1Ref, fieldsRef, testRef, topRef];
  const scrollToStep = (stepNum: number) => {
    // Instant, not smooth — leftover trackpad/wheel momentum from the scroll that led to this
    // click can cancel a mid-flight smooth scrollIntoView, landing short of the target section.
    STEP_REFS[stepNum - 1]?.current?.scrollIntoView({ behavior: 'auto', block: 'start' });
  };

  return (
    // -m-4 cancels Layout's <main> padding so this box's own 24px margin (m-6) is the only
    // gap between it and the header/sidebar, regardless of <main>'s own padding value.
    <div className="-m-4 font-sans">
      <div className="bg-white rounded-lg shadow-[0_2px_8px_rgba(0,0,0,0.1)] m-6 p-6">
      <div>
        <div ref={topRef} className="flex items-start justify-between gap-4 mb-5 scroll-mt-24">
          <div>
            <h1 className="text-xl font-black text-slate-900 tracking-tight">{t('ปรับการอ่านเอกสาร', 'OCR Tuning')}</h1>
            <p className="text-sm text-slate-500 mt-0.5">{t('กำหนดฟิลด์และคำอธิบายฟิลด์/ตำแหน่ง ให้ AI อ่านเอกสารได้ถูกต้อง — ทดสอบก่อนบันทึกได้', 'Define fields and their hints so the AI reads documents correctly — test before saving')}</p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button onClick={confirmResetAll} className="flex items-center gap-1.5 px-3.5 py-2 rounded-[4px] border border-slate-200 bg-white text-slate-500 text-sm font-bold hover:bg-slate-50 cursor-pointer">
              <RotateCcw size={14} /> {t('เริ่มใหม่', 'Start over')}
            </button>
            <button
              onClick={handleSaveSchema}
              disabled={!draftSchema}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-[4px] bg-[#1f5df9] text-white text-sm font-bold hover:bg-[#1a4fd6] cursor-pointer disabled:bg-slate-200 disabled:text-slate-400 disabled:hover:bg-slate-200 disabled:cursor-not-allowed"
            >
              <Save size={14} /> {t('บันทึก', 'Save')}
            </button>
          </div>
        </div>

        {/* Step indicator — sticks to the top of the scroll area while scrolling down */}
        {/* Layout's <main> scroll container has its own p-4, which sticky offsets are computed
            against — top-0 would leave a permanent 16px gap under the header even when stuck,
            so this cancels that out to sit flush against it instead. */}
        <div className="sticky -top-4 z-20 flex items-center mb-6 bg-white border border-slate-200 rounded-xl px-5 py-3.5 overflow-x-auto shadow-sm">
          {STEP_LABELS.map((s, i) => {
            const stepNum = i + 1;
            const isDone = stepNum < currentStep;
            const isCurrent = stepNum === currentStep;
            const isLast = i === STEP_LABELS.length - 1;
            // Step 2 anchors to its own card in "new" mode, or back to step 1 in edit mode.
            const isReachable = stepNum === 1 || stepNum === 2 || stepNum === 5
              || ((stepNum === 3 || stepNum === 4) && !!draftSchema);
            return (
              <React.Fragment key={s.th}>
                <button
                  type="button"
                  onClick={() => isReachable && scrollToStep(stepNum)}
                  disabled={!isReachable}
                  className={`flex items-center gap-2 shrink-0 ${isReachable ? 'cursor-pointer' : 'cursor-not-allowed'}`}
                >
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-black shrink-0 ${
                    isDone ? 'bg-blue-50 text-[#1f5df9] border border-blue-200'
                      : isCurrent ? 'bg-[#1f5df9] text-white'
                      : 'bg-white text-slate-300 border border-slate-200'
                  }`}>
                    {isDone ? <Check size={12} /> : stepNum}
                  </div>
                  <span className={`text-sm font-bold whitespace-nowrap ${isCurrent ? 'text-slate-800' : isDone ? 'text-slate-400' : 'text-slate-300'}`}>
                    {isTh ? s.th : s.en}
                  </span>
                </button>
                {!isLast && <div className="flex-1 h-px bg-slate-200 mx-3 min-w-6" />}
              </React.Fragment>
            );
          })}
        </div>

        <div className="space-y-4">
          {/* 1. เลือกงาน */}
          <div ref={step1Ref} className="bg-white border border-slate-200 rounded-xl p-5 scroll-mt-24">
            <h3 className="text-[15px] font-black text-slate-800 mb-3">{t('1. เลือกงาน', '1. Choose a task')}</h3>
            <div className="inline-flex items-center gap-1 p-1 bg-slate-50 border border-slate-200 rounded-[8px]">
              <button
                onClick={() => confirmSwitchMode('new')}
                className={`px-3.5 py-1.5 text-xs font-bold rounded-[4px] cursor-pointer transition-all ${mode === 'new' ? 'bg-[#1f5df9] text-white shadow-sm' : 'text-slate-500 hover:bg-white'}`}
              >
                {t('สร้าง schema ใหม่', 'Create new schema')}
              </button>
              <button
                onClick={() => confirmSwitchMode('edit')}
                className={`px-3.5 py-1.5 text-xs font-bold rounded-[4px] cursor-pointer transition-all ${mode === 'edit' ? 'bg-[#1f5df9] text-white shadow-sm' : 'text-slate-500 hover:bg-white'}`}
              >
                {t('แก้ไข schema เดิม', 'Edit existing schema')}
              </button>
            </div>

            {mode === 'edit' && (
              <div className="mt-4 pt-4 border-t border-slate-100">
                <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-1.5">{t('schema/ชนิดเอกสารที่จะแก้', 'Schema / document type to edit')}</label>
                <select
                  value={editKey}
                  onChange={(e) => pickEditSchema(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-[4px] border border-slate-200 text-sm font-semibold bg-white focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-[#1f5df9]"
                >
                  <option value="">{t('— เลือก schema —', '— Pick a schema —')}</option>
                  {schemaOptions.map(o => (
                    <option key={o.key} value={o.key}>{o.schema.name} / {o.docTypeName}</option>
                  ))}
                </select>
                {activeConfig && (
                  <p className="text-[11px] font-bold text-slate-400 mt-1.5">
                    {activeConfig.labels.length} {t('ฟิลด์', 'fields')} · {t('บันทึกแล้วจะมีผลกับการอ่านเอกสารจริงทันที', 'once saved, this affects real document reading immediately')}
                  </p>
                )}
              </div>
            )}
          </div>

          {/* 2. ชื่อ schema และจุดเริ่มต้น (new mode only) */}
          {mode === 'new' && (
            <div ref={step2Ref} className="bg-white border border-slate-200 rounded-xl p-5 scroll-mt-24">
              <h3 className="text-[15px] font-black text-slate-800 mb-3">{t('2. ชื่อ schema และจุดเริ่มต้น', '2. Schema name and starting point')}</h3>
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-1.5">{t('ชื่อ schema', 'Schema name')}</label>
                  <input
                    type="text"
                    value={nameDraft}
                    onChange={(e) => { setNameDraft(e.target.value.slice(0, 200)); setNewConfirmed(false); }}
                    maxLength={200}
                    placeholder={t('เช่น cds-invoice-easyaccess', 'e.g. cds-invoice-easyaccess')}
                    className="w-full h-[42px] px-3 rounded-[4px] border border-slate-200 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-[#1f5df9]"
                  />
                  <p className="text-[10px] font-bold text-slate-300 text-right mt-1">{nameDraft.length}/200</p>
                </div>
                <div>
                  <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-1.5">{t('ชนิดเอกสาร', 'Document type')}</label>
                  <select
                    value={nameDocTypeId}
                    onChange={(e) => { setNameDocTypeId(e.target.value); setNewConfirmed(false); }}
                    className="w-full h-[42px] px-3 rounded-[4px] border border-slate-200 text-sm font-semibold bg-white focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-[#1f5df9]"
                  >
                    {docTypes.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                  </select>
                </div>
              </div>

              <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-1.5">{t('ตั้งต้นจาก', 'Start from')}</label>
              <div className="flex items-center gap-4 mb-3">
                {([
                  { key: 'copy' as const, th: 'คัดลอกฟิลด์จาก schema อื่น', en: 'Copy fields from another schema' },
                  { key: 'blank' as const, th: 'เริ่ม Schema ใหม่', en: 'Start a new schema' },
                ]).map(opt => (
                  <label key={opt.key} className="flex items-center gap-1.5 text-[13px] font-bold text-slate-600 cursor-pointer">
                    <input type="radio" checked={startFrom === opt.key} onChange={() => { setStartFrom(opt.key); setNewConfirmed(false); }} />
                    {isTh ? opt.th : opt.en}
                  </label>
                ))}
              </div>

              {startFrom === 'copy' && (
                <select
                  value={copySourceKey}
                  onChange={(e) => { setCopySourceKey(e.target.value); setNewConfirmed(false); }}
                  className="w-full px-3 py-2.5 rounded-[4px] border border-slate-200 text-sm font-semibold bg-white mb-4 focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-[#1f5df9]"
                >
                  <option value="">{t('— เลือก schema ต้นทาง —', '— Pick a source schema —')}</option>
                  {schemaOptions.map(o => (
                    <option key={o.key} value={o.key}>{o.schema.name} / {o.docTypeName} ({o.config.labels.length} {t('ฟิลด์', 'fields')})</option>
                  ))}
                </select>
              )}
              <button
                onClick={confirmNewSchema}
                disabled={!nameDraft.trim() || !nameDocTypeId}
                className="px-4 py-2.5 rounded-[4px] bg-[#1f5df9] text-white text-sm font-bold cursor-pointer hover:bg-[#1a4fd6] disabled:bg-slate-200 disabled:text-slate-400 disabled:hover:bg-slate-200 disabled:cursor-not-allowed"
              >
                {draftSchema
                  ? t('ใช้จุดเริ่มต้นนี้แทนฟิลด์ปัจจุบัน', 'Use this starting point instead of the current fields')
                  : t('ถัดไป: แก้ฟิลด์และคำอธิบาย', 'Next: edit fields & hints')}
              </button>

              {newConfirmed && draftSchema && (
                <p className="text-[11px] font-bold text-slate-400 mt-2.5">
                  {t('schema ใหม่', 'New schema')} "{draftSchema.name}" · {docTypeName(nameDocTypeId)} — {t('เปลี่ยนจุดเริ่มต้นด้านบนแล้วกดปุ่มนี้อีกครั้งเพื่อแทนที่ฟิลด์ปัจจุบัน', 'change the starting point above and press this button again to replace the current fields')}
                </p>
              )}
            </div>
          )}

          {/* N. ฟิลด์และคำอธิบายฟิลด์/ตำแหน่ง */}
          {showWorkingCards && draftSchema && activeConfig && (
            <div ref={fieldsRef} className="bg-white border border-slate-200 rounded-xl p-5 scroll-mt-24">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-[15px] font-black text-slate-800">{cardNumbers.fields}. {t('ฟิลด์และคำอธิบายฟิลด์/ตำแหน่ง', 'Fields and field/position hints')}</h3>
                <span className="text-xs font-bold text-slate-400">{draftSchema.name} · {docTypeName(activeConfig.docTypeId)}</span>
              </div>

              <div className="flex items-center gap-4 border-b border-slate-200 mb-3">
                {SECTIONS.map(section => (
                  <button
                    key={section}
                    onClick={() => setActiveSectionTab(section)}
                    className={`pb-2 text-sm font-bold cursor-pointer border-b-2 -mb-px transition-all ${
                      activeSectionTab === section ? 'border-[#1f5df9] text-[#1f5df9]' : 'border-transparent text-slate-500 hover:text-slate-700'
                    }`}
                  >
                    {SECTION_LABEL(section, isTh)} ({groupedFields[section].length})
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-3 flex-wrap mb-3">
                <div className="relative flex-1 min-w-[200px]">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder={t('ค้นหาชื่อฟิลด์หรือความหมาย', 'Search field name or meaning')}
                    className="w-full pl-8 pr-3 py-2 text-sm border border-slate-200 rounded-[4px] focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-[#1f5df9]"
                  />
                  <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-300 pointer-events-none" />
                </div>
                <label className="flex items-center gap-2 text-[13px] font-bold text-slate-600 cursor-pointer shrink-0">
                  <input type="checkbox" checked={onlyMissingHints} onChange={(e) => setOnlyMissingHints(e.target.checked)} />
                  {t('เฉพาะที่ยังไม่มีคำอธิบาย', 'Missing a hint only')}
                  {missingHintCount > 0 && (
                    <span className="px-1.5 py-0.5 rounded bg-amber-50 border border-amber-200 text-amber-700 text-[11px] font-black">{missingHintCount}</span>
                  )}
                </label>
                <button
                  onClick={() => setExpandedHints(v => !v)}
                  className="px-3 py-2 rounded-[4px] border border-slate-200 bg-white text-slate-600 text-xs font-bold hover:bg-slate-50 cursor-pointer shrink-0"
                >
                  {expandedHints ? t('ย่อช่องคำอธิบาย', 'Collapse hint box') : t('ขยายช่องคำอธิบาย', 'Expand hint box')}
                </button>
              </div>

              <div className="grid grid-cols-[minmax(160px,1fr)_130px_minmax(240px,2fr)_auto_auto] gap-3 items-center text-[11px] font-black text-slate-400 uppercase tracking-widest px-1 mb-1">
                <span>{t('ชื่อฟิลด์', 'Field name')}</span>
                <span>{t('ชนิดข้อมูล', 'Data type')}</span>
                <span>{t('คำอธิบายฟิลด์/ตำแหน่ง', 'Field / position hint')}</span>
                <span />
                <span />
              </div>
              <div className="space-y-2">
                {visibleFields.length === 0 && (
                  <p className="text-xs text-slate-300 italic py-3">{t('ไม่พบฟิลด์ที่ตรงกับเงื่อนไข', 'No fields match')}</p>
                )}
                {visibleFields.map(field => {
                  const showThaiInput = revealedThaiFieldIds.has(field.id) || !!field.friendlyName;
                  return (
                    <div key={field.id} className="grid grid-cols-[minmax(160px,1fr)_130px_minmax(240px,2fr)_auto_auto] gap-3 items-start py-1.5 border-b border-slate-50 last:border-b-0">
                      <div className="pt-2 min-w-0">
                        <div className="font-mono text-sm font-semibold text-slate-700 truncate">{field.name}</div>
                        {showThaiInput ? (
                          <input
                            type="text"
                            value={field.friendlyName || ''}
                            onChange={(e) => updateField(field.id, { friendlyName: e.target.value })}
                            placeholder={t('ชื่อภาษาไทย', 'Thai name')}
                            className="w-full mt-1 px-2 py-1 text-xs border border-slate-200 rounded-[4px] focus:outline-none focus:ring-2 focus:ring-blue-100"
                          />
                        ) : (
                          <button
                            onClick={() => setRevealedThaiFieldIds(prev => new Set(prev).add(field.id))}
                            className="text-[11px] font-bold text-[#1f5df9] hover:underline cursor-pointer mt-0.5"
                          >
                            + {t('ใส่ความหมาย', 'Add meaning')}
                          </button>
                        )}
                      </div>
                      <select
                        value={field.type || 'string'}
                        onChange={(e) => updateField(field.id, { type: e.target.value })}
                        className="mt-1.5 px-2 py-1.5 bg-white border border-slate-200 rounded-[4px] text-xs font-semibold cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-100"
                      >
                        {TYPE_OPTIONS.map(o => <option key={o.value} value={o.value}>{isTh ? o.th : o.en}</option>)}
                      </select>
                      <div className="mt-1.5">
                        <textarea
                          autoFocus={field.id === justAddedFieldId}
                          onFocus={() => { if (field.id === justAddedFieldId) setJustAddedFieldId(null); }}
                          value={field.aiPrompt || ''}
                          onChange={(e) => updateField(field.id, { aiPrompt: e.target.value })}
                          placeholder={t('บอก AI ว่าค่านี้อยู่ตรงไหน หน้าตาเป็นอย่างไร', 'Tell the AI where this value is and what it looks like')}
                          rows={expandedHints ? 3 : 1}
                          className="w-full px-3 py-1.5 text-sm text-slate-700 bg-white border border-slate-200 rounded-[4px] resize-y focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-[#1f5df9]"
                        />
                        {!field.aiPrompt?.trim() && (
                          <p className="text-[11px] font-bold text-amber-600 mt-0.5">{t('ยังไม่มีคำอธิบาย', 'No hint yet')}</p>
                        )}
                      </div>
                      <button
                        onClick={() => assistWrite(field)}
                        className="mt-1.5 flex items-center gap-1 px-2.5 py-1.5 rounded-[4px] border border-slate-200 text-slate-600 text-xs font-bold hover:bg-slate-50 cursor-pointer whitespace-nowrap"
                      >
                        <Sparkles size={12} /> {t('ช่วยเขียน', 'Assist')}
                      </button>
                      <button
                        onClick={() => confirmRemoveField(field)}
                        className="mt-1.5 text-xs font-bold text-rose-500 hover:text-rose-700 hover:underline cursor-pointer whitespace-nowrap"
                      >
                        {t('ลบ', 'Delete')}
                      </button>
                    </div>
                  );
                })}
              </div>

              <div className="mt-4 p-3 border border-dashed border-slate-200 rounded-lg">
                <div className="grid grid-cols-4 gap-3 mb-2.5">
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{t('ชื่อฟิลด์ (ภาษาอังกฤษ)', 'Field name (English)')}</label>
                    <input type="text" value={newFieldName} onChange={(e) => setNewFieldName(e.target.value)} placeholder={t('เช่น buyerName', 'e.g. buyerName')} className="w-full px-2.5 py-1.5 font-mono text-sm border border-slate-200 rounded-[4px] focus:outline-none focus:ring-2 focus:ring-blue-100" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{t('ชื่อภาษาไทย', 'Thai name')}</label>
                    <input type="text" value={newFieldThai} onChange={(e) => setNewFieldThai(e.target.value)} placeholder={t('เช่น ชื่อผู้ซื้อ', 'e.g. buyer')} className="w-full px-2.5 py-1.5 text-sm border border-slate-200 rounded-[4px] focus:outline-none focus:ring-2 focus:ring-blue-100" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{t('ชนิดข้อมูล', 'Data type')}</label>
                    <select value={newFieldType} onChange={(e) => setNewFieldType(e.target.value)} className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-[4px] text-sm cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-100">
                      {TYPE_OPTIONS.map(o => <option key={o.value} value={o.value}>{isTh ? o.th : o.en}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{t('คำอธิบายฟิลด์/ตำแหน่ง', 'Field / position hint')}</label>
                    <input type="text" value={newFieldHint} onChange={(e) => setNewFieldHint(e.target.value)} placeholder={t('(ใส่ทีหลังได้)', '(optional, add later)')} className="w-full px-2.5 py-1.5 text-sm border border-slate-200 rounded-[4px] focus:outline-none focus:ring-2 focus:ring-blue-100" />
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => addQuickField(false)}
                    disabled={!newFieldName.trim()}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-[4px] border border-slate-200 bg-white text-slate-600 text-xs font-bold hover:bg-slate-50 cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    <Plus size={13} /> {t('เพิ่มฟิลด์', 'Add field')}
                  </button>
                  <button
                    onClick={() => addQuickField(true)}
                    disabled={!newFieldName.trim()}
                    className="px-3 py-2 rounded-[4px] border border-slate-200 bg-white text-slate-600 text-xs font-bold hover:bg-slate-50 cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    {t('เพิ่มและใส่คำอธิบาย', 'Add & write hint now')}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* N. ทดสอบ (ไม่บังคับ) */}
          {showWorkingCards && draftSchema && activeConfig && (
            <div ref={testRef} className="bg-white border border-slate-200 rounded-xl p-5 scroll-mt-24">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-[15px] font-black text-slate-800 flex items-center gap-2">
                  {cardNumbers.test}. {t('ทดสอบ', 'Test')}
                  <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 text-[10px] font-black uppercase tracking-wide">{t('ไม่บังคับ', 'Optional')}</span>
                </h3>
                <button onClick={() => setTestVisible(v => !v)} className="text-xs font-bold text-slate-400 hover:text-slate-600 cursor-pointer flex items-center gap-1">
                  {testVisible ? t('ซ่อน', 'Hide') : t('แสดง', 'Show')} <ChevronDown size={13} className={`transition-transform ${testVisible ? '' : '-rotate-90'}`} />
                </button>
              </div>

              {testVisible && (
                <>
                  <div className="flex items-center gap-1 p-1 bg-slate-50 border border-slate-200 rounded-[8px] w-fit mb-3">
                    {TEST_TABS.map(tab => (
                      <button
                        key={tab.key}
                        onClick={() => { setTestMethod(tab.key); setTestFile(null); setTestResults(null); }}
                        className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-[4px] cursor-pointer transition-all ${testMethod === tab.key ? 'bg-white text-[#1f5df9] border border-slate-200 shadow-sm' : 'text-slate-500'}`}
                      >
                        {tab.icon} {isTh ? tab.th : tab.en}
                      </button>
                    ))}
                  </div>
                  <p className="text-xs text-slate-400 mb-3">{t('ให้ AI อ่านเอกสาร ด้วยฟิลด์และคำอธิบายที่ยังไม่ได้บันทึก', "Reads the document using this draft's fields and hints, even before they're saved")}</p>

                  <label
                    onDragOver={handleFileDragOver}
                    onDragLeave={handleFileDragLeave}
                    onDrop={handleFileDrop}
                    className={`flex flex-col items-center justify-center gap-2 py-8 border-2 border-dashed rounded-xl cursor-pointer transition-all mb-3 ${
                      isDraggingFile ? 'border-[#1f5df9] bg-blue-50/40' : 'border-slate-200 hover:border-[#1f5df9] hover:bg-blue-50/20'
                    }`}
                  >
                    <Upload size={22} className="text-[#1f5df9]" />
                    <span className="text-sm font-bold text-slate-700">{testFile ? testFile.name : t('ลากไฟล์มาวางที่นี่ หรือคลิกเพื่อเลือกไฟล์', 'Drop a file here, or click to choose one')}</span>
                    <span className="text-xs text-slate-400">{t('รองรับ', 'Supports')} {TEST_TABS.find(t2 => t2.key === testMethod)?.accept}</span>
                    <input
                      type="file"
                      accept={TEST_TABS.find(t2 => t2.key === testMethod)?.accept}
                      className="hidden"
                      onChange={(e) => { const f = e.target.files?.[0]; if (f) { setTestFile(f); setTestResults(null); } }}
                    />
                  </label>

                  <button
                    onClick={runTest}
                    disabled={!testFile || activeConfig.labels.length === 0 || isTesting}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-[4px] bg-[#1f5df9] text-white text-sm font-bold cursor-pointer hover:bg-[#1a4fd6] disabled:bg-slate-200 disabled:text-slate-400 disabled:hover:bg-slate-200 disabled:cursor-not-allowed"
                  >
                    {isTesting ? t('กำลังทดสอบ...', 'Testing...') : t('เริ่มทดสอบ', 'Start test')}
                  </button>

                  {testResults && testMetrics && (
                    <div className="mt-4">
                      <p className="text-sm font-bold text-slate-700 mb-2">
                        {t('อ่านได้ถูกต้อง', 'Read correctly')} {testMetrics.matched}/{testMetrics.total} {t('ฟิลด์', 'fields')} ({testMetrics.pct}%)
                      </p>
                      <div className="border border-slate-200 rounded-[8px] overflow-hidden max-h-72 overflow-y-auto">
                        {testResults.map(r => (
                          <div key={r.fieldId} className="flex items-center justify-between gap-3 px-3 py-2 border-b border-slate-100 last:border-b-0 text-sm">
                            <div className="min-w-0">
                              <span className="font-mono font-semibold text-slate-700">{r.fieldName}</span>
                              {r.friendlyName && <span className="text-xs text-slate-400 ml-1.5">({r.friendlyName})</span>}
                            </div>
                            <div className={`font-mono text-xs shrink-0 ${r.matched ? 'text-slate-600' : r.blank ? 'text-amber-600' : 'text-rose-600'}`}>
                              {r.blank ? t('(ไม่พบ)', '(not found)') : r.value}
                            </div>
                            <span className="shrink-0">
                              {r.matched ? <Check size={14} className="text-emerald-600" /> : <X size={14} className="text-rose-500" />}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      </div>
      </div>
    </div>
  );
};
