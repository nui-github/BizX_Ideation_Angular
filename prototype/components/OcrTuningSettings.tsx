import React, { useState, useMemo, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { message, Modal, Tooltip } from 'antd';
import {
  Plus, Upload, FileText, FileSpreadsheet, FileCode2, Check,
  Save, RotateCcw, Search, Sparkles, Trash2
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

interface AssistPhrase { th: string; en: string; }
interface AssistCategory { title: { th: string; en: string }; phrases: AssistPhrase[]; }
const ASSIST_PHRASE_CATEGORIES: AssistCategory[] = [
  {
    title: { th: 'อยู่ตรงไหน', en: 'Where it is' },
    phrases: [
      { th: 'อยู่มุมขวาบนของเอกสาร', en: 'In the top-right corner of the document' },
      { th: 'อยู่ส่วนหัวของเอกสาร ใต้ชื่อบริษัท', en: 'In the header, below the company name' },
      { th: 'อยู่หลังคำว่า "{คำที่อยู่ข้างหน้า}"', en: 'Right after the label "{preceding word}"' },
      { th: 'อยู่ในกล่องที่มีหัวข้อ "{หัวข้อกล่อง}"', en: 'Inside the box titled "{box heading}"' },
      { th: 'อยู่ในคอลัมน์ "{ชื่อหัวคอลัมน์}" ของตาราง', en: 'In the "{column header}" column of the table' },
      { th: 'อยู่ท้ายเอกสาร ใกล้ช่องลายเซ็น', en: 'Near the bottom, close to the signature box' },
    ],
  },
  {
    title: { th: 'หน้าตาของค่า', en: 'What it looks like' },
    phrases: [
      { th: 'เป็นตัวเลขอย่างเดียว ไม่ต้องใส่หน่วยหรือสกุลเงิน', en: 'Digits only — no unit or currency symbol' },
      { th: 'เป็นวันที่ ให้อ่านตามที่เขียนในเอกสาร', en: 'A date — read it exactly as written' },
      { th: 'ขึ้นต้นด้วย "{ตัวอักษรขึ้นต้น}"', en: 'Starts with "{leading characters}"' },
      { th: 'ถ้าเขียนไว้หลายบรรทัด ให้รวมเป็นบรรทัดเดียว', en: 'If it spans multiple lines, join them into one' },
    ],
  },
  {
    title: { th: 'สิ่งที่ไม่ต้องอ่าน', en: "What to skip" },
    phrases: [
      { th: 'ไม่ต้องรวมชื่อบริษัท เอาเฉพาะที่อยู่', en: "Don't include the company name, address only" },
      { th: 'ไม่ใช่ยอดรวมท้ายตาราง', en: 'Not the total row at the bottom of the table' },
      { th: 'ไม่ต้องอ่านแถวยอดรวม (TOTAL)', en: 'Skip the TOTAL row' },
      { th: 'ถ้าไม่มีในเอกสาร ให้เว้นว่าง', en: "Leave blank if it's not in the document" },
    ],
  },
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
  if (type === 'number') return String(seed % 9000);
  if (type === 'decimal') return ((seed % 90000) / 100).toFixed(2);
  if (type === 'boolean') return seed % 2 === 0 ? 'ใช่' : 'ไม่ใช่';
  if (type === 'date') {
    const day = (seed % 28) + 1;
    const month = (Math.floor(seed / 28) % 12) + 1;
    return `${String(day).padStart(2, '0')}/${String(month).padStart(2, '0')}/2026`;
  }
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
  { value: 'decimal', th: 'ทศนิยม', en: 'Decimal' },
  { value: 'date', th: 'วันที่', en: 'Date' },
  { value: 'boolean', th: 'ใช่/ไม่ใช่', en: 'Yes/No' },
];

const SECTION_LABEL = (section: Section, isTh: boolean): string => {
  if (section === 'Header') return isTh ? 'ส่วนหัว' : 'Header';
  if (section === 'Description') return isTh ? 'รายการสินค้า' : 'Line items';
  return isTh ? 'ส่วนท้าย' : 'Footer';
};

// Common fields (the ones our mock/default schemas already ship with) get a fixed Thai name +
// description straight out of this glossary — no input, nothing to edit. Anything not in here
// falls back to the old editable "+ ใส่ความหมาย" flow, since there's no mock meaning to show.
interface GlossaryEntry { th: string; desc: string; }
const FIELD_GLOSSARY: Record<string, GlossaryEntry> = {
  'invoice number': { th: 'เลขที่ใบแจ้งหนี้', desc: 'เลขที่เอกสารใบแจ้งหนี้ ใช้อ้างอิงการซื้อขาย' },
  'invoice date': { th: 'วันที่ออกใบแจ้งหนี้', desc: 'วันที่ที่ออกเอกสารใบแจ้งหนี้' },
  'vendor name': { th: 'ชื่อผู้ขาย', desc: 'ชื่อบริษัทหรือบุคคลที่ขายสินค้า' },
  'tax id': { th: 'เลขประจำตัวผู้เสียภาษี', desc: 'เลขประจำตัวผู้เสียภาษีของผู้ขายหรือผู้ซื้อ' },
  'total amount': { th: 'ยอดรวมทั้งหมด', desc: 'ยอดเงินรวมสุทธิของเอกสาร' },
  'b/l number': { th: 'เลขที่ใบตราส่งสินค้า', desc: 'เลขที่เอกสาร Bill of Lading' },
  'shipper name': { th: 'ชื่อผู้ส่งสินค้า', desc: 'ชื่อบริษัทหรือบุคคลที่เป็นผู้ส่งสินค้า' },
  'consignee name': { th: 'ชื่อผู้รับสินค้า', desc: 'ชื่อบริษัทหรือบุคคลที่เป็นผู้รับสินค้าปลายทาง' },
  'vessel name': { th: 'ชื่อเรือ', desc: 'ชื่อเรือหรือพาหนะที่ใช้ขนส่งสินค้า' },
  'port of loading': { th: 'ท่าเรือต้นทาง', desc: 'ท่าเรือที่สินค้าถูกบรรทุกขึ้นเรือ' },
  'packing list no': { th: 'เลขที่บัญชีรายการบรรจุหีบห่อ', desc: 'เลขที่เอกสาร Packing List' },
  'total packages': { th: 'จำนวนหีบห่อรวม', desc: 'จำนวนหีบห่อทั้งหมดในรายการสินค้า' },
  'po number': { th: 'เลขที่ใบสั่งซื้อ', desc: 'เลขที่เอกสาร Purchase Order' },
  'po date': { th: 'วันที่ใบสั่งซื้อ', desc: 'วันที่ที่ออกเอกสารใบสั่งซื้อ' },
  'certificate no': { th: 'เลขที่ใบรับรอง', desc: 'เลขที่เอกสารใบรับรองแหล่งกำเนิดสินค้า' },
  'origin country': { th: 'ประเทศแหล่งกำเนิดสินค้า', desc: 'ประเทศที่เป็นแหล่งกำเนิดของสินค้า' },
  'do number': { th: 'เลขที่ใบส่งของ', desc: 'เลขที่เอกสาร Delivery Order' },
  'release date': { th: 'วันที่ปล่อยสินค้า', desc: 'วันที่สินค้าถูกปล่อยออกจากคลัง' },
  'po/pi number': { th: 'เลขที่ PO/PI', desc: 'เลขที่เอกสารใบสั่งซื้อหรือใบเสนอราคาสินค้า' },
  'po/pi date': { th: 'วันที่ PO/PI', desc: 'วันที่ที่ออกเอกสาร PO/PI' },
  'total value': { th: 'มูลค่ารวม', desc: 'มูลค่ารวมทั้งหมดของสินค้าในเอกสาร' },
  'freight invoice no': { th: 'เลขที่ใบแจ้งหนี้ค่าขนส่ง', desc: 'เลขที่เอกสารใบแจ้งหนี้ค่าระวางขนส่ง' },
  'carrier name': { th: 'ชื่อผู้ขนส่ง', desc: 'ชื่อบริษัทผู้ให้บริการขนส่งสินค้า' },
  'freight amount': { th: 'ค่าระวางขนส่ง', desc: 'จำนวนเงินค่าขนส่งสินค้า' },
  'hs code': { th: 'พิกัดศุลกากร', desc: 'รหัสพิกัดศุลกากรของสินค้า (HS Code)' },
  'product description': { th: 'รายละเอียดสินค้า', desc: 'คำอธิบายลักษณะหรือชนิดของสินค้า' },
  'fta form no': { th: 'เลขที่แบบฟอร์ม FTA', desc: 'เลขที่เอกสารแบบฟอร์มสิทธิพิเศษทางการค้า' },
  'certificate date': { th: 'วันที่ออกใบรับรอง', desc: 'วันที่ที่ออกเอกสารใบรับรอง' },
  'policy no': { th: 'เลขที่กรมธรรม์', desc: 'เลขที่เอกสารกรมธรรม์ประกันภัย' },
  'insured value': { th: 'มูลค่าที่เอาประกัน', desc: 'มูลค่าสินค้าที่ทำประกันภัย' },
  'license no': { th: 'เลขที่ใบอนุญาต', desc: 'เลขที่เอกสารใบอนุญาตนำเข้า/ส่งออก' },
  'issue date': { th: 'วันที่ออกเอกสาร', desc: 'วันที่ที่เอกสารนี้ถูกออก' },
  'expiry date': { th: 'วันหมดอายุ', desc: 'วันที่เอกสารหรือใบอนุญาตหมดอายุ' },
  'lpi no': { th: 'เลขที่ LPI', desc: 'เลขที่เอกสาร Letter of Products Identification' },
  'document title': { th: 'ชื่อเอกสาร', desc: 'ชื่อหัวเรื่องของเอกสาร' },
  'item description': { th: 'รายละเอียดสินค้า', desc: 'ชื่อและคำอธิบายของสินค้าในรายการนี้' },
  'quantity': { th: 'จำนวน', desc: 'จำนวนสินค้าของรายการนี้' },
  'unit price': { th: 'ราคาต่อหน่วย', desc: 'ราคาต่อหน่วยของสินค้า' },
  'line amount': { th: 'มูลค่ารวมรายการ', desc: 'มูลค่ารวมของรายการนี้ (จำนวน × ราคาต่อหน่วย)' },
  'total quantity': { th: 'จำนวนรวม', desc: 'จำนวนสินค้ารวมทั้งหมดในเอกสาร' },
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

  // --- 2. ชื่อ schema ชนิดเอกสาร และ template (new mode only) ---
  const [nameDraft, setNameDraft] = useState('');
  const [nameDocTypeId, setNameDocTypeId] = useState<string>(docTypes[0]?.id || '');
  const [copySourceKey, setCopySourceKey] = useState('');
  const [newConfirmed, setNewConfirmed] = useState(false);

  // The "copy fields from" source list only makes sense scoped to the doc type being created —
  // copying a Bill of Lading schema's fields onto an Invoice schema isn't a real starting point.
  const copySourceOptions = useMemo(
    () => schemaOptions.filter(o => o.config.docTypeId === nameDocTypeId),
    [schemaOptions, nameDocTypeId]
  );

  // Locked to that doc type's own generic template — prefer one literally named "generic",
  // otherwise fall back to whichever template exists for it.
  const genericTemplateOption = useMemo(() => {
    if (copySourceOptions.length === 0) return null;
    return copySourceOptions.find(o => o.schema.name.toLowerCase().includes('generic')) || copySourceOptions[0];
  }, [copySourceOptions]);

  useEffect(() => {
    setCopySourceKey(genericTemplateOption?.key || '');
  }, [genericTemplateOption]);

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
    setTestMethod('ai');
    setTestFile(null);
    setRetestNonce(0);
    setTestPage(1);
    setLineItemTableHint('');
    setLineItemHintRevealed(false);
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
    setRetestNonce(0);
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
    if (copySourceKey) {
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
    setRetestNonce(0);
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
  const [lineItemTableHint, setLineItemTableHint] = useState('');
  const [lineItemHintRevealed, setLineItemHintRevealed] = useState(false);

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
      const glossary = FIELD_GLOSSARY[(f.name || '').trim().toLowerCase()];
      return f.name.toLowerCase().includes(q) || (f.friendlyName || '').toLowerCase().includes(q) || (f.aiPrompt || '').toLowerCase().includes(q)
        || (glossary ? glossary.th.includes(q) || glossary.desc.includes(q) : false);
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

  // "ช่วยเขียน" opens a picker of ready-made example hints, grouped by category, instead of
  // guessing and inserting one — the picker's own language toggle is independent of the page's.
  const [assistFieldId, setAssistFieldId] = useState<string | null>(null);
  const [assistAnchorRect, setAssistAnchorRect] = useState<DOMRect | null>(null);
  const [assistLang, setAssistLang] = useState<'TH' | 'EN'>(isTh ? 'TH' : 'EN');

  const openAssistPicker = (field: SchemaLabel, e: React.MouseEvent<HTMLButtonElement>) => {
    setAssistAnchorRect(e.currentTarget.getBoundingClientRect());
    setAssistFieldId(prev => (prev === field.id ? null : field.id));
  };

  const pickAssistPhrase = (phrase: AssistPhrase) => {
    if (assistFieldId) updateField(assistFieldId, { aiPrompt: assistLang === 'TH' ? phrase.th : phrase.en });
    setAssistFieldId(null);
  };

  useEffect(() => {
    if (!assistFieldId) return;
    const onKeyDown = (e: KeyboardEvent) => { if (e.key === 'Escape') setAssistFieldId(null); };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [assistFieldId]);

  // --- Quick-add field row ---
  const [newFieldName, setNewFieldName] = useState('');
  const [newFieldThai, setNewFieldThai] = useState('');
  const [newFieldType, setNewFieldType] = useState('string');
  const [newFieldHint, setNewFieldHint] = useState('');

  const addQuickField = () => {
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
  };

  // --- 3. ทดสอบและปรับคำอธิบาย — file lives here, but every field row shows its own live
  // "ค่าที่อ่านได้" inline rather than a separate results panel, so testing and editing hints
  // happen in the same place. ---
  const [testMethod, setTestMethod] = useState<ExtractionMethod>('ai');
  const [testFile, setTestFile] = useState<File | null>(null);
  const [isTesting, setIsTesting] = useState(false);
  const [isDraggingFile, setIsDraggingFile] = useState(false);
  // Bumped by "ทดสอบอีกครั้ง" to vary the mock hash — simulates a fresh read without needing a
  // real OCR backend.
  const [retestNonce, setRetestNonce] = useState(0);
  const [testPage, setTestPage] = useState(1);
  const changeFileInputRef = useRef<HTMLInputElement>(null);

  const handleFileDragOver = (e: React.DragEvent) => { e.preventDefault(); setIsDraggingFile(true); };
  const handleFileDragLeave = () => setIsDraggingFile(false);
  const handleFileDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingFile(false);
    const f = e.dataTransfer.files?.[0];
    if (f) pickTestFile(f);
  };

  const TEST_TABS: { key: ExtractionMethod; th: string; en: string; icon: React.ReactNode; accept: string }[] = [
    { key: 'ai', th: 'PDF / รูปภาพ', en: 'PDF / Image', icon: <FileText size={13} />, accept: '.pdf,.png,.jpg,.jpeg' },
    { key: 'excel', th: 'Excel', en: 'Excel', icon: <FileSpreadsheet size={13} />, accept: '.xlsx,.xls,.csv' },
    { key: 'xml', th: 'XML', en: 'XML', icon: <FileCode2 size={13} />, accept: '.xml' },
  ];
  const ALL_FILE_ACCEPT = TEST_TABS.map(t2 => t2.accept).join(',');
  const detectMethodFromFileName = (name: string): ExtractionMethod => {
    const ext = name.split('.').pop()?.toLowerCase() || '';
    if (['xlsx', 'xls', 'csv'].includes(ext)) return 'excel';
    if (ext === 'xml') return 'xml';
    return 'ai';
  };
  const pickTestFile = (f: File) => {
    setTestFile(f);
    setTestMethod(detectMethodFromFileName(f.name));
    setTestPage(1);
    setRetestNonce(0);
  };
  const formatFileSize = (bytes: number) => `${Math.max(1, Math.round(bytes / 1024))} KB`;
  const step1FileInputRef = useRef<HTMLInputElement>(null);

  // Mock page count for the uploaded file — purely for the "หน้า" selector, doesn't change
  // values. Always at least 3 pages, since a real multi-page document is the common case.
  const testPageOptions = useMemo(() => {
    if (!testFile) return [1];
    const n = (hashString(testFile.name) % 3) + 3;
    return Array.from({ length: n }, (_, i) => i + 1);
  }, [testFile]);

  const retest = () => {
    if (!testFile) return;
    setIsTesting(true);
    window.setTimeout(() => { setRetestNonce(n => n + 1); setIsTesting(false); }, 500);
  };

  // Every field across every section, tested live against the uploaded file — this is what
  // fills in each row's "ค่าที่อ่านได้" column.
  const fieldResultsById = useMemo(() => {
    const map: Record<string, TestFieldResult> = {};
    if (!activeConfig || !testFile) return map;
    const seed = `${testFile.name}|${testPage}|${retestNonce}`;
    activeConfig.labels.forEach(f => { map[f.id] = mockTestField(f, seed); });
    return map;
  }, [activeConfig, testFile, testPage, retestNonce]);

  const unreadableCount = useMemo(
    () => Object.values(fieldResultsById).filter(r => r.blank).length,
    [fieldResultsById]
  );

  // Mock preview grid for the line-items table — a plausible row count plus one row of values
  // per Description-section field, so "ผลการอ่านตาราง" has something believable to show.
  const lineItemRowCount = useMemo(() => {
    if (!testFile) return 0;
    return 15 + (hashString(testFile.name + '|rows') % 16);
  }, [testFile]);

  const lineItemPreviewRows = useMemo(() => {
    const cols = groupedFields.Description;
    if (!testFile || cols.length === 0 || lineItemRowCount === 0) return [];
    return Array.from({ length: Math.min(lineItemRowCount, 12) }, (_, rowIdx) =>
      cols.map(col => buildMockValue(col, hashString(`${testFile.name}|${retestNonce}|row${rowIdx}|${col.id}`)))
    );
  }, [testFile, groupedFields, lineItemRowCount, retestNonce]);

  // --- Step indicator (decorative — this is a single always-visible page, not a gated wizard —
  // but it should still reflect real progress: step 1 active and the rest disabled on a fresh
  // load, advancing/checking off as the user actually does each thing, rather than always
  // showing everything but the last step as already done). ---
  const STEP_LABELS = [
    { th: 'อัปโหลดไฟล์และเลือกงาน', en: 'Upload file & choose task' },
    { th: 'ชื่อ ชนิดเอกสาร template', en: 'Name, doc type & template' },
    { th: 'ทดสอบและปรับคำอธิบาย', en: 'Test & adjust hints' },
    { th: 'บันทึก', en: 'Save' },
  ];
  const hasChosenTask = (mode === 'new' ? !!nameDraft.trim() : !!editKey) && !!testFile;
  const currentStep = savedOnce ? 4
    : !hasChosenTask ? 1
    : !draftSchema ? 2
    : 3;

  // Body cards renumber depending on mode — editing an existing schema skips the "name, doc
  // type & template" card entirely, since the schema already has both.
  const cardNumbers = { combined: mode === 'new' ? 3 : 2 };
  const showWorkingCards = !!draftSchema;

  // Clicking a step in the indicator jumps straight to that section — "บันทึก" has no card of
  // its own (saving is just the header button), so it scrolls to the top instead.
  const topRef = useRef<HTMLDivElement>(null);
  const step1Ref = useRef<HTMLDivElement>(null);
  const step2Ref = useRef<HTMLDivElement>(null);
  const combinedRef = useRef<HTMLDivElement>(null);
  // Edit mode has no separate "name & template" card — picking the schema in step 1 covers it —
  // so step 2 anchors back to step 1's card instead of a nonexistent section.
  const STEP_REFS = [step1Ref, mode === 'new' ? step2Ref : step1Ref, combinedRef, topRef];
  const scrollToStep = (stepNum: number) => {
    // Instant, not smooth — leftover trackpad/wheel momentum from the scroll that led to this
    // click can cancel a mid-flight smooth scrollIntoView, landing short of the target section.
    STEP_REFS[stepNum - 1]?.current?.scrollIntoView({ behavior: 'auto', block: 'start' });
  };

  return (
    <>
    {/* -m-4 cancels Layout's <main> padding so this box's own 24px margin (m-6) is the only
        gap between it and the header/sidebar, regardless of <main>'s own padding value. */}
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

        {/* Step indicator — no longer sticky; the field-section tabs stick instead (see below) */}
        <div className="flex items-center mb-6 bg-white border border-slate-200 rounded-xl px-5 py-3.5 overflow-x-auto shadow-sm">
          {STEP_LABELS.map((s, i) => {
            const stepNum = i + 1;
            const isDone = stepNum < currentStep;
            const isCurrent = stepNum === currentStep;
            const isLast = i === STEP_LABELS.length - 1;
            // Step 2 anchors to its own card in "new" mode, or back to step 1 in edit mode.
            const isReachable = stepNum === 1 || stepNum === 2 || stepNum === 4 || (stepNum === 3 && !!draftSchema);
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
          {/* 1. อัปโหลดไฟล์และเลือกงาน */}
          <div ref={step1Ref} className="bg-white border border-slate-200 rounded-xl p-5 scroll-mt-24">
            <h3 className="text-[15px] font-black text-slate-800 mb-3">{t('1. อัปโหลดไฟล์และเลือกงาน', '1. Upload a file & choose a task')}</h3>

            {testFile ? (
              <div className="flex items-center justify-between gap-4 p-4 bg-emerald-50/50 border border-emerald-200 rounded-xl mb-4">
                <div className="flex items-center gap-3 min-w-0">
                  <span className="px-2 py-0.5 rounded-full border border-rose-300 text-rose-500 text-[10px] font-black uppercase tracking-wide shrink-0">
                    {TEST_TABS.find(t2 => t2.key === testMethod)?.[isTh ? 'th' : 'en']}
                  </span>
                  <div className="min-w-0">
                    <div className="text-sm font-bold text-slate-800 font-mono truncate">{testFile.name}</div>
                    <div className="text-xs text-slate-400">
                      {formatFileSize(testFile.size)} · {t('พร้อมใช้ทดสอบในขั้นตอนที่ 3', 'Ready to test in step 3')}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => step1FileInputRef.current?.click()}
                    className="px-3 py-1.5 rounded-[4px] border border-slate-200 bg-white text-slate-600 text-xs font-bold hover:bg-slate-50 cursor-pointer"
                  >
                    {t('เปลี่ยนไฟล์', 'Change file')}
                  </button>
                  <button
                    onClick={() => setTestFile(null)}
                    className="px-3 py-1.5 rounded-[4px] border border-rose-200 bg-white text-rose-500 text-xs font-bold hover:bg-rose-50 cursor-pointer"
                  >
                    {t('ลบไฟล์', 'Remove file')}
                  </button>
                </div>
                <input
                  ref={step1FileInputRef}
                  type="file"
                  accept={ALL_FILE_ACCEPT}
                  className="hidden"
                  onChange={(e) => { const f = e.target.files?.[0]; if (f) pickTestFile(f); }}
                />
              </div>
            ) : (
              <label
                onDragOver={handleFileDragOver}
                onDragLeave={handleFileDragLeave}
                onDrop={handleFileDrop}
                className={`flex flex-col items-center justify-center gap-2 py-8 border-2 border-dashed rounded-xl cursor-pointer transition-all mb-4 ${
                  isDraggingFile ? 'border-[#1f5df9] bg-blue-50/40' : 'border-slate-200 hover:border-[#1f5df9] hover:bg-blue-50/20'
                }`}
              >
                <Upload size={22} className="text-[#1f5df9]" />
                <span className="text-sm font-bold text-slate-700">{t('ลากไฟล์มาวางที่นี่ หรือคลิกเพื่อเลือกไฟล์', 'Drop a file here, or click to choose one')}</span>
                <span className="text-xs text-slate-400">
                  {t('PDF, รูปภาพ, Excel หรือ XML — ใช้ทดสอบในขั้นตอนที่ 3', 'PDF, image, Excel, or XML — used for testing in step 3')}
                </span>
                <input
                  type="file"
                  accept={ALL_FILE_ACCEPT}
                  className="hidden"
                  onChange={(e) => { const f = e.target.files?.[0]; if (f) pickTestFile(f); }}
                />
              </label>
            )}

            <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-1.5">{t('งานที่จะทำ', 'Task')}</label>
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

          {/* 2. ชื่อ schema ชนิดเอกสาร และ template (new mode only) */}
          {mode === 'new' && (
            <div ref={step2Ref} className="bg-white border border-slate-200 rounded-xl p-5 scroll-mt-24">
              <h3 className="text-[15px] font-black text-slate-800 mb-3">{t('2. ชื่อ schema ชนิดเอกสาร และ template', '2. Schema name, document type & template')}</h3>
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

              <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-1.5">{t('template', 'template')}</label>
              <select
                value={copySourceKey}
                disabled
                className="w-full px-3 py-2.5 rounded-[4px] border border-slate-200 text-sm font-semibold bg-slate-50 text-slate-500 cursor-not-allowed"
              >
                {!genericTemplateOption && <option value="">{t('— ไม่มี template สำหรับชนิดเอกสารนี้ —', '— No template for this document type —')}</option>}
                {copySourceOptions.map(o => (
                  <option key={o.key} value={o.key}>{o.schema.name} ({o.config.labels.length} {t('ฟิลด์', 'fields')})</option>
                ))}
              </select>
              <p className="text-[11px] font-bold text-slate-400 mt-1.5 mb-4">
                {t('ฟิลด์ตั้งต้นคัดลอกจาก template generic ของชนิดเอกสารนี้', "Starting fields are copied from this document type's generic template")}
              </p>
              <button
                onClick={() => {
                  const wasFirstTime = !draftSchema;
                  confirmNewSchema();
                  // First time, the combined test/hint card doesn't exist in the DOM yet at
                  // this point — setDraftSchema hasn't committed — so wait a frame for it to
                  // mount before jumping to it.
                  if (wasFirstTime) requestAnimationFrame(() => requestAnimationFrame(() => scrollToStep(3)));
                }}
                disabled={!nameDraft.trim() || !nameDocTypeId}
                className="px-4 py-2.5 rounded-[4px] bg-[#1f5df9] text-white text-sm font-bold cursor-pointer hover:bg-[#1a4fd6] disabled:bg-slate-200 disabled:text-slate-400 disabled:hover:bg-slate-200 disabled:cursor-not-allowed"
              >
                {draftSchema
                  ? t('ใช้ template นี้แทนฟิลด์ปัจจุบัน', 'Use this template instead of the current fields')
                  : t('ทดสอบ', 'Test')}
              </button>

              {newConfirmed && draftSchema && (
                <p className="text-[11px] font-bold text-slate-400 mt-2.5">
                  {t('schema ใหม่', 'New schema')} "{draftSchema.name}" · {docTypeName(nameDocTypeId)} — {t('เปลี่ยน template ด้านบนแล้วกดปุ่มนี้อีกครั้งเพื่อแทนที่ฟิลด์ปัจจุบัน', 'change the template above and press this button again to replace the current fields')}
                </p>
              )}
            </div>
          )}

          {/* N. ทดสอบและปรับคำอธิบาย — file, live test values, and field/hint editing all in one place */}
          {showWorkingCards && draftSchema && activeConfig && (
            <div ref={combinedRef} className="bg-white border border-slate-200 rounded-xl p-5 scroll-mt-24">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-[15px] font-black text-slate-800">{cardNumbers.combined}. {t('ทดสอบและปรับคำอธิบาย', 'Test & adjust hints')}</h3>
                <span className="text-xs font-bold text-slate-400">{draftSchema.name} · {docTypeName(activeConfig.docTypeId)}</span>
              </div>

              <div className="flex items-center gap-3 flex-wrap mb-1">
                <span className="text-xs font-black text-slate-400 uppercase tracking-widest shrink-0">{t('ไฟล์ทดสอบ', 'Test file')}</span>
                {testFile ? (
                  <>
                    <span className="text-sm font-bold text-slate-700 font-mono">{testFile.name}</span>
                    <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 text-[10px] font-black uppercase tracking-wide">
                      {TEST_TABS.find(tab => tab.key === testMethod)?.[isTh ? 'th' : 'en']}
                    </span>
                    <button
                      onClick={() => changeFileInputRef.current?.click()}
                      className="px-3 py-1.5 rounded-[4px] border border-slate-200 bg-white text-slate-600 text-xs font-bold hover:bg-slate-50 cursor-pointer"
                    >
                      {t('เปลี่ยนไฟล์', 'Change file')}
                    </button>
                    <button
                      onClick={retest}
                      disabled={isTesting}
                      className="px-3 py-1.5 rounded-[4px] bg-[#1f5df9] text-white text-xs font-bold hover:bg-[#1a4fd6] cursor-pointer disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed"
                    >
                      {isTesting ? t('กำลังทดสอบ...', 'Testing...') : t('ทดสอบอีกครั้ง', 'Test again')}
                    </button>
                  </>
                ) : (
                  <button
                    onClick={() => changeFileInputRef.current?.click()}
                    className="px-3 py-1.5 rounded-[4px] border border-slate-200 bg-white text-slate-600 text-xs font-bold hover:bg-slate-50 cursor-pointer"
                  >
                    {t('อัปโหลดไฟล์ทดสอบ', 'Upload a test file')}
                  </button>
                )}
                <input
                  ref={changeFileInputRef}
                  type="file"
                  accept={ALL_FILE_ACCEPT}
                  className="hidden"
                  onChange={(e) => { const f = e.target.files?.[0]; if (f) pickTestFile(f); }}
                />
              </div>
              <p className="text-xs text-slate-400 mb-3">{t('ให้ AI อ่านเอกสาร ด้วยฟิลด์และคำอธิบายที่ยังไม่ได้บันทึก — แก้คำอธิบายในตารางด้านล่างแล้วทดสอบอีกครั้งได้', "Reads the document using this draft's fields and hints, even before they're saved — adjust hints below then test again")}</p>

              {testFile && (
                <div className="mb-3 max-w-xs">
                  <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-1.5">{t('หน้า', 'Page')}</label>
                  <select
                    value={testPage}
                    onChange={(e) => setTestPage(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-[4px] border border-slate-200 text-sm font-semibold bg-white focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-[#1f5df9]"
                  >
                    {testPageOptions.map(p => <option key={p} value={p}>{t(`หน้า ${p}`, `Page ${p}`)}</option>)}
                  </select>
                </div>
              )}

              {testFile && unreadableCount > 0 && (
                <p className="inline-block px-2.5 py-1 rounded-[4px] bg-rose-50 border border-rose-200 text-rose-600 text-xs font-bold mb-3">
                  {t(`อ่านไม่ได้ ${unreadableCount} ฟิลด์`, `${unreadableCount} field(s) unreadable`)}
                </p>
              )}

              {/* Floating navbar, sticky flush against the header — no border of its own, just a
                  shadow to lift it, with a proper tab-bar baseline (shared border-b, tabs
                  overlapping it with -mb-px) instead of each tab floating its own underline. */}
              <div className="sticky -top-4 z-20 bg-white rounded-xl pt-2.5 shadow-sm mb-3">
                <div className="flex items-center gap-4 border-b border-slate-200">
                  {SECTIONS.map(section => (
                    <button
                      key={section}
                      onClick={() => setActiveSectionTab(section)}
                      className={`tab-underline pb-2 text-sm font-bold cursor-pointer border-b-2 -mb-px transition-all ${
                        activeSectionTab === section ? 'border-[#1f5df9] text-[#1f5df9]' : 'border-transparent text-slate-500 hover:text-slate-700'
                      }`}
                    >
                      {SECTION_LABEL(section, isTh)} ({groupedFields[section].length})
                    </button>
                  ))}
                </div>
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

              {/* Sticks flush right under the nav tab bar above (24px = that bar's own 40px
                  height minus its own -16px offset) instead of scrolling away with the rows. */}
              <div className="sticky top-6 z-10 grid grid-cols-[minmax(180px,1.2fr)_minmax(160px,1fr)_minmax(220px,2fr)_auto_auto] gap-3 items-center text-[11px] font-black text-slate-400 uppercase tracking-widest bg-slate-50 rounded-[4px] px-2 py-2 mb-1">
                <span>{t('ชื่อฟิลด์', 'Field name')}</span>
                <span>{t('ค่าที่อ่านได้', 'Value read')}</span>
                <span>{t('คำอธิบายฟิลด์/ตำแหน่ง', 'Field / position hint')}</span>
                <span />
                <span />
              </div>

              {activeSectionTab === 'Description' && groupedFields.Description.length > 0 && (
                <div className="grid grid-cols-[minmax(180px,1.2fr)_minmax(160px,1fr)_minmax(220px,2fr)_auto_auto] gap-3 items-start py-1.5 border-b border-slate-100 bg-slate-50/60 -mx-1 px-1 rounded-[4px] mb-1">
                  <div className="pt-1.5 min-w-0">
                    <div className="font-mono text-sm font-black text-slate-800">{t('ตาราง: items', 'Table: items')}</div>
                    {lineItemHintRevealed ? (
                      <input
                        type="text"
                        value={lineItemTableHint}
                        onChange={(e) => setLineItemTableHint(e.target.value)}
                        placeholder={t('ความหมายของตารางนี้', "What this table means")}
                        className="w-full mt-1 px-2 py-1 text-xs border border-slate-200 rounded-[4px] focus:outline-none focus:ring-2 focus:ring-blue-100"
                      />
                    ) : (
                      <button onClick={() => setLineItemHintRevealed(true)} className="text-[11px] font-bold text-[#1f5df9] hover:underline cursor-pointer mt-0.5">
                        + {t('ใส่ความหมาย', 'Add meaning')}
                      </button>
                    )}
                    <div className="text-[11px] text-slate-400 mt-0.5">{t('ตาราง', 'Table')}</div>
                  </div>
                  <div className="pt-1.5 text-sm font-bold text-slate-600">
                    {testFile ? t(`${lineItemRowCount} แถว`, `${lineItemRowCount} rows`) : '—'}
                  </div>
                  <div className="pt-1.5 text-xs text-slate-400">
                    {t(`${groupedFields.Description.length} คอลัมน์ — ใส่คำอธิบายที่คอลัมน์ด้านล่าง`, `${groupedFields.Description.length} columns — add hints on the columns below`)}
                  </div>
                  <div /><div />
                </div>
              )}
              <div className="space-y-2">
                {visibleFields.length === 0 && (
                  <p className="text-xs text-slate-300 italic py-3">{t('ไม่พบฟิลด์ที่ตรงกับเงื่อนไข', 'No fields match')}</p>
                )}
                {visibleFields.map(field => {
                  const glossary = FIELD_GLOSSARY[(field.name || '').trim().toLowerCase()];
                  const showThaiInput = revealedThaiFieldIds.has(field.id) || !!field.friendlyName;
                  const result = fieldResultsById[field.id];
                  return (
                    <div key={field.id} className="grid grid-cols-[minmax(180px,1.2fr)_minmax(160px,1fr)_minmax(220px,2fr)_auto_auto] gap-3 items-start py-1.5 border-b border-slate-50 last:border-b-0">
                      <div className="pt-2 min-w-0">
                        <div className="font-mono text-sm font-semibold text-slate-700 truncate">{field.name}</div>
                        {glossary ? (
                          <>
                            <div className="text-xs text-slate-500 mt-0.5">{glossary.th}</div>
                            <div className="text-[11px] text-slate-400 mt-0.5">{glossary.desc}</div>
                          </>
                        ) : showThaiInput ? (
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
                        <select
                          value={field.type || 'string'}
                          onChange={(e) => updateField(field.id, { type: e.target.value })}
                          className="mt-1.5 px-2 py-1.5 bg-white border border-slate-200 rounded-[4px] text-xs font-semibold cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-100"
                        >
                          {TYPE_OPTIONS.map(o => <option key={o.value} value={o.value}>{isTh ? o.th : o.en}</option>)}
                        </select>
                      </div>
                      <div className="pt-2 min-w-0">
                        {activeSectionTab === 'Description' && <div className="text-[11px] text-slate-400 mb-0.5">{t('ค่าในแถวแรก', 'Value in the first row')}</div>}
                        {!testFile ? (
                          <span className="text-sm text-slate-300">—</span>
                        ) : result?.blank ? (
                          <span className="text-sm font-bold text-rose-600">{t('อ่านไม่ได้ / ไม่พบ', 'Unreadable / not found')}</span>
                        ) : (
                          <span className="text-sm font-mono text-slate-700 break-words">{result?.value}</span>
                        )}
                      </div>
                      <div className="mt-1.5">
                        <textarea
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
                      <Tooltip title={t('ช่วยเขียน', 'Assist')}>
                        <button
                          onClick={(e) => openAssistPicker(field, e)}
                          aria-label={t('ช่วยเขียน', 'Assist')}
                          className={`mt-1.5 flex items-center justify-center w-8 h-8 rounded-[4px] border cursor-pointer ${
                            assistFieldId === field.id ? 'border-[#1f5df9] text-[#1f5df9] bg-blue-50' : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                          }`}
                        >
                          <Sparkles size={14} />
                        </button>
                      </Tooltip>
                      <Tooltip title={t('ลบ', 'Delete')}>
                        <button
                          onClick={() => confirmRemoveField(field)}
                          aria-label={t('ลบ', 'Delete')}
                          className="mt-1.5 flex items-center justify-center w-8 h-8 rounded-[4px] text-rose-500 hover:bg-rose-50 cursor-pointer"
                        >
                          <Trash2 size={14} />
                        </button>
                      </Tooltip>
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
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{t('ความหมาย', 'Meaning')}</label>
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
                    onClick={addQuickField}
                    disabled={!newFieldName.trim()}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-[4px] border border-slate-200 bg-white text-slate-600 text-xs font-bold hover:bg-slate-50 cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    <Plus size={13} /> {t('เพิ่มฟิลด์', 'Add field')}
                  </button>
                </div>
              </div>

              {activeSectionTab === 'Description' && testFile && groupedFields.Description.length > 0 && (
                <div className="mt-5">
                  <h4 className="text-sm font-black text-slate-800 mb-2">
                    {t(`ผลการอ่านตาราง items (${lineItemRowCount} แถว)`, `Table read result: items (${lineItemRowCount} rows)`)}
                  </h4>
                  <div className="overflow-x-auto border border-slate-200 rounded-[8px]">
                    <table className="min-w-full text-xs">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-200">
                          <th className="px-2 py-2 text-left font-black text-slate-400">#</th>
                          {groupedFields.Description.map(col => {
                            const g = FIELD_GLOSSARY[(col.name || '').trim().toLowerCase()];
                            return (
                              <th key={col.id} className="px-3 py-2 text-left whitespace-nowrap">
                                <div className="font-mono font-bold text-slate-700">{col.name}</div>
                                {(g || col.friendlyName) && (
                                  <div className="text-slate-400 font-normal">{g ? `${g.th} – ${g.desc}` : col.friendlyName}</div>
                                )}
                                {!col.aiPrompt?.trim() && (
                                  <div className="text-amber-600 font-bold font-normal">{t('ยังไม่มีคำอธิบาย...', 'No hint yet...')}</div>
                                )}
                              </th>
                            );
                          })}
                        </tr>
                      </thead>
                      <tbody>
                        {lineItemPreviewRows.map((row, i) => (
                          <tr key={i} className="border-b border-slate-100 last:border-b-0 hover:bg-slate-50/60">
                            <td className="px-2 py-1.5 text-slate-400 font-bold">{i + 1}</td>
                            {row.map((val, ci) => (
                              <td key={ci} className="px-3 py-1.5 font-mono text-slate-700 whitespace-nowrap">{val}</td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
      </div>
    </div>
    {assistFieldId && assistAnchorRect && createPortal(
      <>
        <div className="fixed inset-0 z-40" onClick={() => setAssistFieldId(null)} />
        <div
          className="fixed z-50 bg-white border border-slate-200 rounded-xl shadow-lg p-4 w-[560px] max-h-[70vh] overflow-y-auto"
          style={{
            top: Math.min(assistAnchorRect.bottom + 6, window.innerHeight - 24),
            left: Math.min(Math.max(assistAnchorRect.left, 12), window.innerWidth - 580),
          }}
        >
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-sm font-black text-slate-800">{t('เลือกประโยคตัวอย่าง', 'Pick an example sentence')}</h4>
            <div className="inline-flex items-center gap-1 p-1 bg-slate-50 border border-slate-200 rounded-[8px]">
              <button
                onClick={() => setAssistLang('TH')}
                className={`px-2.5 py-1 text-xs font-bold rounded-[4px] cursor-pointer ${assistLang === 'TH' ? 'bg-[#1f5df9] text-white' : 'text-slate-500 hover:bg-white'}`}
              >
                {t('ไทย', 'ไทย')}
              </button>
              <button
                onClick={() => setAssistLang('EN')}
                className={`px-2.5 py-1 text-xs font-bold rounded-[4px] cursor-pointer ${assistLang === 'EN' ? 'bg-[#1f5df9] text-white' : 'text-slate-500 hover:bg-white'}`}
              >
                English
              </button>
            </div>
          </div>
          <div className="space-y-4">
            {ASSIST_PHRASE_CATEGORIES.map(cat => (
              <div key={cat.title.th}>
                <p className="text-xs font-black text-slate-500 mb-2">{assistLang === 'TH' ? cat.title.th : cat.title.en}</p>
                <div className="flex flex-wrap gap-2">
                  {cat.phrases.map(ph => (
                    <button
                      key={ph.th}
                      onClick={() => pickAssistPhrase(ph)}
                      className="px-3 py-1.5 rounded-[6px] border border-slate-200 bg-white text-xs font-semibold text-slate-700 hover:border-[#1f5df9] hover:text-[#1f5df9] hover:bg-blue-50 cursor-pointer text-left"
                    >
                      {assistLang === 'TH' ? ph.th : ph.en}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </>,
      document.body
    )}
    </>
  );
};
