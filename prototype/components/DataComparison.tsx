import React, { useState, useEffect, useRef } from 'react';
import { diffChars } from 'diff';
import * as XLSX from 'xlsx';
import { 
  FileText, Upload, ArrowRight, Check, AlertCircle,
  Search, Download, Columns, ChevronLeft, ChevronRight,
  Plus, Trash2, ArrowLeftRight, FileSpreadsheet, File as FileIcon, FileCode,
  CheckCircle2, XCircle, Info, Eye, Send, Filter, ListFilter, ArrowLeft, Save, RotateCcw,
  LayoutGrid, List, ScanEye, Bot, ChevronDown, Lock, Unlock, HelpCircle, X, Loader2, ShieldCheck, ArrowUpRight, ScanSearch, History, Edit3, UploadCloud, AlertTriangle,
  Printer, RotateCw, ZoomIn, ZoomOut, Menu, Copy, Star, CheckCheck, StickyNote, SkipForward, Undo2,
  FileBarChart2, Layers, Maximize2, Minimize2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Tabs, Tag, Badge, Empty, Button, message, DatePicker } from 'antd';
import thTH from 'antd/locale/th_TH';
import dayjs from 'dayjs';
import 'dayjs/locale/th';
import { CreateJobModal } from './CreateJobModal';
import { GenerateReportModal } from './GenerateReportModal';
import { Tooltip } from './Tooltip';
import {
  Language, ComparisonFile, FieldMapping, TrackingItem, ReviewStatus,
  UserRole, ComparisonJob, JobStatus, ComparisonDocStatus, TrackingSource, SendStatus,
  AuditLog, Workflow
} from '../types';
import { TRANSLATIONS } from '../translations';
import { MOCK_PRESETS } from '../mock-data/preset.mock';
import { MOCK_TEAMS } from '../mock-data/teams.mock';

// Mirrors the "ทีม OPERATION" badge shown in the sidebar profile menu (Layout.tsx) —
// there's no real auth/session concept yet, so the current user's team is fixed here.
const CURRENT_USER_TEAM = 'operation';
const CURRENT_USER_NAME = 'Kunawut W.';

// Mock brand list for the per-file "Template" picker on Replace & Merge uploads —
// template name is built as [Brand]_[Doctype], e.g. MARDI_Invoice.
const REPLACE_FILE_TEMPLATE_BRANDS = ['MARDI', 'Elita', 'MINIMONO', 'ROENARI', 'SANRIO', 'WANTEX'];

const MAX_UPLOAD_FILE_SIZE_BYTES = 5 * 1024 * 1024;

// Picks which preview mockup to render for a document based on its real file extension
// when one is present (real uploaded filenames), falling back to 'pdf' for the many
// places pdfPreviewUrl only holds a doc-type display name like "PO/PI" with no extension.
type PreviewFileFormat = 'pdf' | 'excel' | 'xml';
const detectFileFormat = (nameOrLabel: string | null | undefined): PreviewFileFormat => {
  const lower = (nameOrLabel || '').toLowerCase();
  if (/\.(xlsx|xls|csv)$/.test(lower)) return 'excel';
  if (/\.xml$/.test(lower)) return 'xml';
  return 'pdf';
};
// pdfPreviewUrl is sometimes a bare doc-type name ("PACKING LIST") and sometimes already
// a real filename with its own extension — only append one when it doesn't already have it,
// so the toolbar never shows a doubled-up "FILE.XLSX.xlsx".
const withPreviewExtension = (nameOrLabel: string, upper: boolean): string => {
  const hasExt = /\.(pdf|xlsx|xls|csv|xml)$/i.test(nameOrLabel);
  const base = upper ? nameOrLabel.toUpperCase().replace(/\s/g, '_') : nameOrLabel.toLowerCase().replace(/\s/g, '_');
  if (hasExt) return base;
  const format = detectFileFormat(nameOrLabel);
  const ext = format === 'excel' ? 'xlsx' : format === 'xml' ? 'xml' : 'pdf';
  return `${base}.${ext}`;
};

// Re-indents minified/single-line XML so the real-file preview reads like formatted code.
// Standard "insert newline between adjacent tags, then indent by nesting depth" approach.
const formatXmlForPreview = (xml: string): string[] => {
  const withBreaks = xml.trim().replace(/>\s*</g, '>\n<');
  let depth = 0;
  return withBreaks.split('\n').map(line => {
    const trimmed = line.trim();
    const isClosingTag = /^<\//.test(trimmed);
    const isSelfClosing = /\/>$/.test(trimmed) || /^<\?/.test(trimmed) || /^<!--.*-->$/.test(trimmed);
    const isOpeningTag = /^<[^/!?]/.test(trimmed) && !isSelfClosing;
    if (isClosingTag) depth = Math.max(0, depth - 1);
    const indented = '  '.repeat(depth) + trimmed;
    if (isOpeningTag) depth += 1;
    return indented;
  });
};

// Lightweight, safe (no dangerouslySetInnerHTML) token-based XML syntax highlighter for a
// single already-indented line, matching the color scheme used elsewhere for XML previews.
const XML_TOKEN_RE = /(<\/?[A-Za-z][\w:.-]*)|(\s[A-Za-z][\w:.-]*=)|("[^"]*")|(\/?>)|([^<]+)/g;
const renderXmlLineTokens = (line: string): React.ReactNode[] => {
  const nodes: React.ReactNode[] = [];
  let match: RegExpExecArray | null;
  let i = 0;
  XML_TOKEN_RE.lastIndex = 0;
  while ((match = XML_TOKEN_RE.exec(line)) !== null) {
    const [, tagOpen, attrName, attrVal, close, text] = match;
    if (tagOpen) nodes.push(<span key={i++} className="text-sky-400">{tagOpen}</span>);
    else if (attrName) nodes.push(<span key={i++} className="text-emerald-400">{attrName}</span>);
    else if (attrVal) nodes.push(<span key={i++} className="text-orange-300">{attrVal}</span>);
    else if (close) nodes.push(<span key={i++} className="text-sky-400">{close}</span>);
    else if (text) nodes.push(<span key={i++} className="text-slate-200">{text}</span>);
  }
  return nodes;
};

// Individual cells with no compare rule configured in Rule Matrix render blank instead of a
// match/mismatch result — there's nothing to actually compare against. DataComparison.tsx has
// no real link to RuleMatrix's rule data (no job -> rule id, no shared field-naming contract),
// so which (field, doc) cells count as "no rule" is mocked here: a random 2-3 cells per part
// (Header/Description/Footer), re-rolled per job whenever its docs get (re)read.
const NO_RULE_CANDIDATE_FIELDS = {
  Header: ['Consignee Name', 'Consignee TAX ID', 'Incoterm', 'Port of Loading', 'Port of Discharge'],
  Description: ['Product Description', 'Item No. / Model No. (SKU)', "Q'ty by line", 'UOM', 'Price / Unit', 'Invoice Amount', 'HS Code'],
  Footer: ['Total Quantity', 'Total Volume (CBM)', 'Total Net Weight (KGS)', 'Total Gross Weight (KGS)', 'Vessel / Flight', 'Voyage No.', 'Country of Origin', 'Freight Charges'],
};
const noRuleCellKey = (fieldName: string, docName: string) => `${fieldName}::${docName}`;

// Deterministic per-item barcode shown under each Description-part field label — same shape as
// a real EAN-13 (e.g. "8809894049155"), varies by item so every "Item N" group gets its own.
const generateItemBarcode = (group: string | undefined): string => {
  const idx = parseInt((group || '').replace(/\D/g, ''), 10) || 0;
  const variable = (4049100 + idx * 137) % 9999999;
  return `880989${String(variable).padStart(7, '0')}`.slice(0, 13);
};
// Picks `count` random (field, doc) cell keys out of candidateFields x docNames, no duplicates.
const pickRandomNoRuleCells = (candidateFields: string[], docNames: string[], count: number): string[] => {
  if (candidateFields.length === 0 || docNames.length === 0) return [];
  const allPairs: string[] = [];
  candidateFields.forEach(field => docNames.forEach(doc => allPairs.push(noRuleCellKey(field, doc))));
  const shuffled = allPairs.sort(() => Math.random() - 0.5);
  return shuffled.slice(0, Math.min(count, shuffled.length));
};

// Demo-only preview filename overrides so a specific mock job can showcase the Excel/XML
// preview mockups without changing the real doc-type keys other logic (schema/rule matching,
// OCR simulation) relies on. Keyed by job id, then by the doc-type column name.
const DEMO_PREVIEW_FILENAME_OVERRIDES: Record<string, Record<string, string>> = {
  'job-demo-xlsx-xml': {
    'PACKING LIST': 'Packing_List_Demo.xlsx',
    'HS CODE MASTER FILE': 'HS_Code_Master_Demo.xml',
  },
};

// Comparison targets are keyed by the real doc-type name (e.g. 'PACKING LIST'), but the
// preview toolbar/canvas shows the overridden display filename. Reverse-map back to the
// real doc-type name so field lookups against `target.fileName` still resolve.
const resolveDocNameFromPreviewUrl = (url: string | null | undefined, jobId: string | undefined): string | null => {
  if (!url) return null;
  const overrides = jobId ? DEMO_PREVIEW_FILENAME_OVERRIDES[jobId] : undefined;
  if (overrides) {
    const match = Object.entries(overrides).find(([, override]) => override === url);
    if (match) return match[0];
  }
  return url;
};

// Mock "เลขที่งาน" prefix — real workflow nodes don't have a configurable prefix field yet,
// so derive a short one from the step's workflow name (e.g. "Invoice Processing" -> "IP").
const getWorkflowPrefix = (workflowName?: string): string => {
  if (!workflowName) return 'JOB';
  const cleaned = workflowName
    .replace(/\s*\[[^\]]*\]\s*$/, '')
    .replace(/\s*\([^)]*\)\s*$/, '')
    .trim();
  const initials = cleaned.split(/\s+/).filter(Boolean).map(w => w[0]).join('').toUpperCase();
  return (initials || 'JOB').slice(0, 4);
};

interface DocComment {
  id: string;
  user: string;
  timestamp: string;
  text: string;
}


// Demo toggle: "รายการรอรีวิว" (Pending Inbox) and "บันทึกประวัติ" (Activity Logs) tabs
// aren't ready to show customers yet. Flip to true to bring them back for internal use —
// nothing else needs to change, the features underneath are untouched.
const SHOW_PENDING_AND_LOGS_TABS = false;
import { 
  Inbox, FileWarning, Clock, User, Calendar, Mail
} from 'lucide-react';

const LOCAL_T = {
  TH: {
    uploadManageTitle: "อัปโหลดและสะสมกลุ่มเอกสาร (Upload & Multi-File Grouping)",
    uploadManageSubtitle: "อัปโหลดไฟล์เอกสาร PDF/รูปภาพเพิ่มเติม และเลือกจับกลุ่มเพื่อเชื่อมข้อมูลเป็น 1 คอลัมน์สำหรับ OCR และเปรียบเทียบข้อมูลร่วมกัน",
    dropzonePlaceholder: "ลากไฟล์มาวางที่นี่ หรือ คลิกเพื่อเลือกไฟล์",
    dropzoneSub: "รองรับ PDF, Excel, XML, JPG, PNG (เลือกหรือลากพร้อมกันได้หลายไฟล์ ขนาดไม่เกิน 5MB ต่อไฟล์)",
    newUploadedHeader: "ไฟล์ที่เพิ่งอัปโหลดใหม่ (%count% ไฟล์)",
    noFilesUploaded: "ยังไม่มีไฟล์ที่อัปโหลด ดรอปไฟล์ที่นี่เพื่อเริ่มใช้งาน",
    groupHeading: "การจัดกลุ่มเอกสารที่จะ Merge (Grouping Columns)",
    groupHelpText: "เลือกไฟล์ที่อัปโหลดใหม่ด้านซ้ายเพื่อจับกลุ่มเป็นคอลัมน์เดียวกันสำหรับ OCR",
    groupNamePlaceholder: "เช่น Invoice Group, BL Set",
    btnGroupSelected: "เชื่อมและจัดกลุ่มไฟล์ที่เลือก",
    activeGroupsLabel: "กลุ่มเอกสารที่พร้อมนำเข้า (%count% กลุ่ม)",
    individualFilesLabel: "ไฟล์เดี่ยวที่ไม่จัดกลุ่ม (%count% ไฟล์)",
    importToJob: "ยืนยันการบันทึกและนำเข้า Job",
    autoOCRLabel: "เริ่มกระบวนการสกัดข้อมูล (OCR) ทันทีหลังนำเข้าสำเร็จ",
    errorSelectFiles: "กรุณาเลือกไฟล์ที่ต้องการจะจัดกลุ่มอย่างน้อย 1 ไฟล์",
    errorGroupName: "กรุณากรอกชื่อกลุ่มเอกสาร",
    successGroupCreated: "สร้างกลุ่มเอกสารสำเร็จ",
    uploadedTooltip: "อัปโหลดแล้ว",
    ocrGroupedTip: "รวม %count% เอกสาร",
    btnOpenWorkspace: "อัปโหลด / จัดกลุ่มไฟล์",
    btnOpenWorkspaceDesc: "เพิ่มคอลัมน์ OCR ใหม่ผ่าน Drag & Drop",
    replaceModalTitle: "อัปโหลดไฟล์ทดแทน (Replace & Merge)",
    replaceModalSubtitle: "อัปโหลดไฟล์ใหม่เพื่อแทนที่หรือเพิ่มในคอลัมน์ \"%column%\" อัปโหลดกี่ไฟล์ก็ได้ ระบบจะรวมให้เป็นคอลัมน์เดียวให้เอง",
    btnConfirmReplace: "ยืนยันการแทนที่และรอ OCR",
    btnGenerateReport: "สร้างรายงาน"
  },
  EN: {
    uploadManageTitle: "Upload & Multi-File Grouping Workspace",
    uploadManageSubtitle: "Upload additional PDF/Image source files and select to group them as a unified column for joint OCR and comparison.",
    dropzonePlaceholder: "Drag & drop files here, or click to browse",
    dropzoneSub: "Supports PDF, Excel, XML, JPG, PNG (multiple files allowed, max 5MB per file)",
    newUploadedHeader: "Newly Uploaded Files (%count% files)",
    noFilesUploaded: "No files uploaded yet. Drag & drop files here to begin.",
    groupHeading: "Document Grouping Option (Merge to Column)",
    groupHelpText: "Select uploaded files on the left to merge them into a single comparison column.",
    groupNamePlaceholder: "e.g., Invoice Group, BL Set",
    btnGroupSelected: "Group Selected Files Together",
    activeGroupsLabel: "Active Groups Ready to Import (%count% groups)",
    individualFilesLabel: "Individual Ungrouped Files (%count% files)",
    importToJob: "Confirm and Import to Job",
    autoOCRLabel: "Auto-run OCR extraction immediately after importing",
    errorSelectFiles: "Please select at least 1 file to group.",
    errorGroupName: "Please enter a group name.",
    successGroupCreated: "Successfully grouped files",
    uploadedTooltip: "Uploaded",
    ocrGroupedTip: "Merged %count% documents",
    btnOpenWorkspace: "Upload & Group Docs",
    btnOpenWorkspaceDesc: "Create new OCR columns via drag & drop",
    replaceModalTitle: "Replace Files (Merge to Column)",
    replaceModalSubtitle: "Upload new files to replace or add to the \"%column%\" column. Upload as many as you like — we'll combine them into one column automatically.",
    btnConfirmReplace: "Confirm Replace & Wait for OCR",
    btnGenerateReport: "Generate Report"
  }
};

interface DataComparisonProps {
  language: Language;
  trackingItems: TrackingItem[];
  role?: UserRole;
  targetJobId?: string | null;
  onConsumeTargetJobId?: () => void;
}

export const AVAILABLE_DOC_TYPES = [
  'INVOICE',
  'PACKING LIST',
  'AIR WAYBILL',
  'BILL OF LADING',
  'CONTROL SHEET',
  'QUOTATION',
  'CUSTOMS DECLARATION',
  'INSURANCE',
  'IMPORT ENTRY',
  'HS CODE',
  'SHIPPING INSTRUCTIONS',
  'OTHER'
];

const formatDisplayDate = (dateStr: string | undefined): string => {
  if (!dateStr || dateStr === 'N/A') return 'N/A';
  if (dateStr.includes('T')) {
      const date = new Date(dateStr);
      if (!isNaN(date.getTime())) {
        return `${String(date.getDate()).padStart(2, '0')}/${String(date.getMonth() + 1).padStart(2, '0')}/${date.getFullYear()}`;
      }
  }
  // format: '25 APR 2026 14:20:05' or '25 APR 2026'
  // to: '25/04/2026'
  const parts = dateStr.trim().split(/\s+/);
  if (parts.length >= 3) {
    const d = parts[0].padStart(2, '0');
    const months: Record<string, string> = {"JAN":"01", "FEB":"02", "MAR":"03", "APR":"04", "MAY":"05", "JUN":"06", "JUL":"07", "AUG":"08", "SEP":"09", "OCT":"10", "NOV":"11", "DEC":"12"};
    const m = months[parts[1].toUpperCase()] || '01';
    const y = parts[2];
    return `${d}/${m}/${y}`;
  }
  return dateStr;
};

const formatDisplayDateWithTime = (dateStr: string | undefined): string => {
  if (!dateStr || dateStr === 'N/A') return 'N/A';
  if (dateStr.includes('T')) {
      const date = new Date(dateStr);
      if (!isNaN(date.getTime())) {
        return `${String(date.getDate()).padStart(2, '0')}/${String(date.getMonth() + 1).padStart(2, '0')}/${date.getFullYear()} | ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}:${String(date.getSeconds()).padStart(2, '0')}`;
      }
  }
  const parts = dateStr.trim().split(/\s+/);
  if (parts.length >= 3) {
    const d = parts[0].padStart(2, '0');
    const months: Record<string, string> = {"JAN":"01", "FEB":"02", "MAR":"03", "APR":"04", "MAY":"05", "JUN":"06", "JUL":"07", "AUG":"08", "SEP":"09", "OCT":"10", "NOV":"11", "DEC":"12"};
    const m = months[parts[1].toUpperCase()] || '01';
    const y = parts[2];
    let time = '';
    if (parts.length > 3) {
        time = ` | ${parts[3]}`;
    }
    return `${d}/${m}/${y}${time}`;
  }
  return dateStr;
};

const parseDateValue = (dateStr: string | undefined): number => {
  if (!dateStr) return 0;
  const parts = dateStr.trim().split(/\s+/);
  if (parts.length >= 3) {
    const d = parts[0].padStart(2, '0');
    const months: Record<string, string> = {"JAN":"01", "FEB":"02", "MAR":"03", "APR":"04", "MAY":"05", "JUN":"06", "JUL":"07", "AUG":"08", "SEP":"09", "OCT":"10", "NOV":"11", "DEC":"12"};
    const m = months[parts[1].toUpperCase()] || '01';
    const y = parts[2];
    const t = parts[3] || '00:00:00';
    return new Date(`${y}-${m}-${d}T${t}`).getTime();
  }
  return new Date(dateStr).getTime() || 0;
};

const getConciseMismatchSummary = (fieldName: string, lang: Language): string => {
  if (lang === 'TH') {
    if (fieldName === 'Consignee Name' || fieldName === 'Consignee TAX ID') return 'ข้อมูลคู่ค้าไม่ตรงกับเอกสารหลัก';
    if (fieldName === 'Port of Loading' || fieldName === 'Port of Discharge') return 'ท่าเรือต้นทาง/ปลายทางไม่ตรงกัน';
    if (fieldName === "Q'ty by line" || fieldName === 'Total Quantity') return 'จำนวนสินค้าไม่สอดคล้องกัน';
    if (fieldName === 'Price / Unit' || fieldName === 'Invoice Amount') return 'ราคาต่อหน่วย/มูลค่ารวมไม่สอดคล้องกัน';
    if (fieldName === 'HS Code') return 'รหัสพิกัดศุลกากร (HS Code) ไม่ตรงกัน';
    if (fieldName === 'Total Gross Weight (KGS)' || fieldName === 'Total Net Weight (KGS)' || fieldName === 'Total Volume (CBM)') return 'น้ำหนักหรือปริมาตรรวมไม่ตรงกัน';
    if (fieldName === 'Vessel / Flight' || fieldName === 'Voyage No.') return 'ชื่อพาหนะ/เที่ยวเดินเรือไม่ตรงกัน';
    if (fieldName === 'Incoterm') return 'เงื่อนไขการส่งมอบ (Incoterm) ไม่ตรงกัน';
    if (fieldName === 'Freight Charges') return 'เงื่อนไขชำระค่าระวางไม่ตรงกัน';
    return 'ข้อมูลมีความขัดแย้งกันข้ามเอกสาร';
  } else {
    if (fieldName === 'Consignee Name' || fieldName === 'Consignee TAX ID') return 'Consignee/TAX ID mismatch';
    if (fieldName === 'Port of Loading' || fieldName === 'Port of Discharge') return 'Port mismatch';
    if (fieldName === "Q'ty by line" || fieldName === 'Total Quantity') return 'Quantity consistency conflict';
    if (fieldName === 'Price / Unit' || fieldName === 'Invoice Amount') return 'Price/Amount mismatch';
    if (fieldName === 'HS Code') return 'HS Code mismatch';
    if (fieldName === 'Total Gross Weight (KGS)' || fieldName === 'Total Net Weight (KGS)' || fieldName === 'Total Volume (CBM)') return 'Weight/Volume mismatch';
    if (fieldName === 'Vessel / Flight' || fieldName === 'Voyage No.') return 'Vessel/Voyage mismatch';
    if (fieldName === 'Incoterm') return 'Incoterm consistency conflict';
    if (fieldName === 'Freight Charges') return 'Freight term mismatch';
    return 'Data conflict between documents';
  }
};

const getDetailedDiffExplanation = (targetVal: string, masterVal: string, lang: Language): string => {
  if (!targetVal || !masterVal) return '';

  const isNumeric = (val: string) => {
    const cleanVal = val.replace(/,/g, '').trim();
    return cleanVal !== '' && !isNaN(Number(cleanVal));
  };

  if (isNumeric(targetVal) && isNumeric(masterVal)) {
    return lang === 'TH' ? 'ค่าต่างกัน' : 'Value is different';
  }

  const diffs = diffChars(String(targetVal), String(masterVal));
  let unchangedCount = 0;
  
  diffs.forEach(part => {
    if (!part.removed && !part.added) {
      unchangedCount += part.value.length;
    }
  });

  const totalLength = Math.max(String(targetVal).length, String(masterVal).length);
  const similarity = totalLength > 0 ? unchangedCount / totalLength : 0;

  if (similarity < 0.4) {
    return lang === 'TH' ? 'เป็นข้อมูลคนละคำกัน' : 'Completely different data';
  }

  return lang === 'TH' ? 'ค่าต่างกันบางส่วน' : 'Partially different value';
};

export const DataComparison: React.FC<DataComparisonProps> = ({ language, trackingItems, role = UserRole.USER, targetJobId, onConsumeTargetJobId }) => {
  const t = TRANSLATIONS[language];
  
  const getMismatchRule = (fieldName: string, part: string, ruleTitleOverride?: string, ruleDescOverride?: string) => {
    if (ruleTitleOverride && ruleDescOverride) {
      return { title: ruleTitleOverride, desc: ruleDescOverride };
    }
    
    if (language === 'TH') {
      if (fieldName === 'Consignee Name' || fieldName === 'Consignee TAX ID') {
        return {
          title: 'กฎตรวจสอบกับทะเบียนคู่ค้าและฐานข้อมูลมาสเตอร์ (Master Database Check)',
          desc: 'เปรียบเทียบความถูกต้องของชื่อผู้รับสินค้าและเลขประจำตัวผู้เสียภาษี (TAX ID) กับทะเบียนมาสเตอร์เพื่อยืนยันนิติบุคคลที่ถูกต้อง'
        };
      }
      if (fieldName === 'Port of Loading' || fieldName === 'Port of Discharge') {
        return {
          title: 'กฎตรวจสอบรหัสท่าเรือและสถานที่ขนส่ง (Port Validation Rule)',
          desc: 'ตรวจสอบรหัสท่าเรือต้นทางและท่าเรือปลายทางให้ตรงกันทุกชุดเอกสารเพื่อป้องกันการเดินเรือผิดเส้นทางหรือสลับท่าเรือ'
        };
      }
      if (fieldName === 'Q\'ty by line' || fieldName === 'Total Quantity') {
        return {
          title: 'กฎเปรียบเทียบปริมาณและจำนวนรวมสินค้า (Quantity Consistency Rule)',
          desc: 'ตรวจสอบความสอดคล้องของจำนวนรวมและจำนวนแยกตามแต่ละไลน์รายการสินค้าให้ตรงกันระหว่าง Invoice, Packing List และใบตราส่งสินค้า'
        };
      }
      if (fieldName === 'Price / Unit' || fieldName === 'Invoice Amount') {
        return {
          title: 'กฎตรวจสอบราคาและมูลค่าสินค้ารายรายการ (Unit Price Validation)',
          desc: 'วิเคราะห์ตรวจสอบราคาต่อหน่วยและมูลค่าสินค้ารวมรายรายการในแต่ละเอกสารค้าขายให้ตรงกันทุกตำแหน่งเพื่อความถูกต้องทางบัญชี'
        };
      }
      if (fieldName === 'HS Code') {
        return {
          title: 'กฎตรวจสอบพิกัดอัตราศุลกากร (HS Code Cross-Check)',
          desc: 'เปรียบเทียบรหัสพิกัดศุลกากร (HS Code) ในแต่ละรายการสินค้าให้ตรงกันทุกเอกสารหลักเพื่อหลีกเลี่ยงการสำแดงพิกัดผิดพลาด'
        };
      }
      if (fieldName === 'Total Gross Weight (KGS)' || fieldName === 'Total Net Weight (KGS)' || fieldName === 'Total Volume (CBM)') {
        return {
          title: 'กฎเปรียบเทียบน้ำหนักและปริมาตรสินค้ารวม (Weight & Volume Check)',
          desc: 'ตรวจสอบความสอดคล้องของน้ำหนักรวม (Gross Weight), น้ำหนักสุทธิ (Net Weight) และปริมาตรรวม (CBM) ในทุกชุดเอกสารหลักให้ตรงกัน'
        };
      }
      if (fieldName === 'Vessel / Flight' || fieldName === 'Voyage No.') {
        return {
          title: 'กฎเปรียบเทียบชื่อพาหนะและเที่ยวเดินเรือ (Vessel/Voyage Matching Rule)',
          desc: 'ตรวจสอบความถูกต้องของชื่อเรือแม่/เที่ยวบิน และรหัสเที่ยวเดินเรือให้ตรงกันทุกใบเพื่อความถูกต้องในการรายงานกำหนดส่งสินค้า'
        };
      }
      if (fieldName === 'Incoterm') {
        return {
          title: 'กฎเปรียบเทียบเงื่อนไขการส่งมอบ (Incoterm Consistency Rule)',
          desc: 'ตรวจสอบเงื่อนไขการส่งมอบสินค้า (Incoterm) ให้สอดคล้องและตรงกันระหว่างเอกสารสัญญาหลักและเอกสารสำแดงนำเข้า'
        };
      }
      if (fieldName === 'Freight Charges') {
        return {
          title: 'กฎตรวจสอบเงื่อนไขการชำระค่าระวาง (Freight Term Validation)',
          desc: 'ตรวจสอบความสอดคล้องของเงื่อนไขการจ่ายค่าระวางสินค้า (Prepaid หรือ Collect) ระหว่างเอกสาร Invoice และใบตราส่งสินค้า (B/L)'
        };
      }
      return {
        title: 'กฎตรวจสอบความสอดคล้องของข้อมูลข้ามเอกสาร (Cross-Document Consistency Check)',
        desc: 'เปรียบเทียบค่าข้อมูลในฟิลด์นี้ของทุกเอกสารที่เกี่ยวข้อง เพื่อให้มั่นใจว่าข้อมูลไม่มีความขัดแย้งหรือคลาดเคลื่อนจากข้อมูลหลัก'
      };
    } else {
      if (fieldName === 'Consignee Name' || fieldName === 'Consignee TAX ID') {
        return {
          title: 'Master Database Matching Rule',
          desc: 'Verify Consignee name and TAX ID accuracy against the partner master database registries.'
        };
      }
      if (fieldName === 'Port of Loading' || fieldName === 'Port of Discharge') {
        return {
          title: 'Port Verification Rule',
          desc: 'Cross-check Port of Loading and Discharge code/name uniformity across commercial and transport documents.'
        };
      }
      if (fieldName === 'Q\'ty by line' || fieldName === 'Total Quantity') {
        return {
          title: 'Quantity Consistency Rule',
          desc: 'Compare line-item quantities and totals across Invoice, Packing List, and B/L to enforce structural accuracy.'
        };
      }
      if (fieldName === 'Price / Unit' || fieldName === 'Invoice Amount') {
        return {
          title: 'Unit Price & Amount Validation',
          desc: 'Ensure line-item prices, unit rates, and totals match correctly to eliminate financial or tax declaration errors.'
        };
      }
      if (fieldName === 'HS Code') {
        return {
          title: 'HS Code Alignment Rule',
          desc: 'Verify the harmonized tariff classification code matches across all corresponding item lines in active sheets.'
        };
      }
      if (fieldName === 'Total Gross Weight (KGS)' || fieldName === 'Total Net Weight (KGS)' || fieldName === 'Total Volume (CBM)') {
        return {
          title: 'Weight & Volume Cross-Check',
          desc: 'Verify gross weight, net weight, and total volume measurements match uniformly across commercial invoices and transport B/Ls.'
        };
      }
      if (fieldName === 'Vessel / Flight' || fieldName === 'Voyage No.') {
        return {
          title: 'Vessel & Voyage Matching Rule',
          desc: 'Check that transport vehicle name/flight and voyage ID match perfectly across import declarations and bill of lading documents.'
        };
      }
      if (fieldName === 'Incoterm') {
        return {
          title: 'Incoterm Consistency Rule',
          desc: 'Confirm shipping and trade delivery terms are aligned correctly across documents.'
        };
      }
      if (fieldName === 'Freight Charges') {
        return {
          title: 'Freight Charge Term Check',
          desc: 'Verify shipping freight payment terms (Prepaid / Collect) match across all commercial invoices and transport waybills.'
        };
      }
      return {
        title: 'Cross-Document Field Consistency Rule',
        desc: 'Cross-reference field value matches to ensure accuracy, alignment, and parity among all related business files.'
      };
    }
  };

  const [step, setStep] = useState(0); // 0 = Job Grid, 1 = Results
  const [selectedJob, setSelectedJob] = useState<ComparisonJob | null>(null);
  const [files, setFiles] = useState<ComparisonFile[]>([]);
  const [showOnlyDiff, setShowOnlyDiff] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [hoveredField, setHoveredField] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [shipmentDateFrom, setShipmentDateFrom] = useState('');
  const [shipmentDateTo, setShipmentDateTo] = useState('');
  const [shipmentPage, setShipmentPage] = useState(1);
  const [jobTypeFilter, setJobTypeFilter] = useState('ALL');
  const [assigneeFilter, setAssigneeFilter] = useState('ALL');
  const [sortBy, setSortBy] = useState('UPDATE_NEW');
  const [pdfPreviewUrl, setPdfPreviewUrl] = useState<string | null>(null);
  const [activeSubFileId, setActiveSubFileId] = useState<string | null>(null);

  const getSubFilesForDoc = (docName: string) => {
    if (!docName) return [];
    const docUpper = docName.toUpperCase();
    if (docUpper.includes('B / L') || docUpper.includes('B/L') || docUpper.includes('LADING')) {
      return [
        { id: `${docName}_sub_1`, label: language === 'TH' ? 'ใบที่ 1 (MAERSK_01.pdf)' : 'File 1 (MAERSK_01.pdf)', fileName: 'B_L_1.pdf', suffix: 'Container 1' },
        { id: `${docName}_sub_2`, label: language === 'TH' ? 'ใบที่ 2 (MAERSK_02.pdf)' : 'File 2 (MAERSK_02.pdf)', fileName: 'B_L_2.pdf', suffix: 'Container 2' },
        { id: `${docName}_sub_3`, label: language === 'TH' ? 'ใบที่ 3 (MAERSK_03.pdf)' : 'File 3 (MAERSK_03.pdf)', fileName: 'B_L_3.pdf', suffix: 'Container 3' },
      ];
    }
    if (docUpper.includes('INVOICE') || docUpper.includes('INV')) {
      return [
        { id: `${docName}_sub_1`, label: language === 'TH' ? 'ใบที่ 1 (INV_01.pdf)' : 'File 1 (INV_01.pdf)', fileName: 'Invoice_1.pdf', suffix: 'Invoice 1' },
        { id: `${docName}_sub_2`, label: language === 'TH' ? 'ใบที่ 2 (INV_02.pdf)' : 'File 2 (INV_02.pdf)', fileName: 'Invoice_2.pdf', suffix: 'Invoice 2' },
      ];
    }
    return [
      { id: docName, label: docName, fileName: `${docName.replace(/\s/g, '_')}.pdf`, suffix: '' }
    ];
  };

  // Sub-files of the same doc type (e.g. 3 separate B/L pages for 3 containers) can each be
  // OCR'd to slightly different values for a handful of fields — mirrors the variation already
  // simulated in the sub-file PDF preview drawer.
  const getSubFileFieldValue = (fieldName: string, subFileId: string, baseValue: any) => {
    if (subFileId.endsWith('_sub_2')) {
      if (fieldName === 'Consignee TAX ID') return '0105562000002';
      if (fieldName === 'Port of Loading') return 'SHANGHAI, CHINA (S2)';
      if (fieldName === 'Vessel / Flight') return 'MSC FLORENCE';
      if (fieldName === 'Total Quantity') return '320';
    } else if (subFileId.endsWith('_sub_3')) {
      if (fieldName === 'Consignee TAX ID') return '0105562000003';
      if (fieldName === 'Port of Loading') return 'SHANGHAI, CHINA (S3)';
      if (fieldName === 'Vessel / Flight') return 'MSC GENEVA';
      if (fieldName === 'Total Quantity') return '180';
    }
    return baseValue;
  };

  useEffect(() => {
    if (pdfPreviewUrl) {
      const subs = getSubFilesForDoc(pdfPreviewUrl);
      if (subs.length > 0) {
        setActiveSubFileId(subs[0].id);
      } else {
        setActiveSubFileId(null);
      }
    } else {
      setActiveSubFileId(null);
    }
  }, [pdfPreviewUrl]);
  const [showLockPrompt, setShowLockPrompt] = useState(false);
  const [leftPanelCollapsed, setLeftPanelCollapsed] = useState(true);
  const [overriddenValues, setOverriddenValues] = useState<Record<string, string>>({}); // field-tIdx -> value
  const [confirmedMismatches, setConfirmedMismatches] = useState<Record<string, boolean>>({}); // job_doc_field -> boolean
  // Comments attached to a specific document within a job — key is `${jobId}_${docName}`.
  // Anyone on the assigned team can add a comment; carried forward to the next job in the
  // shipment sequence on export (see handleConfirmExport) so context isn't lost downstream.
  const [docComments, setDocComments] = useState<Record<string, DocComment[]>>({});
  const [noteEditorDocName, setNoteEditorDocName] = useState<string | null>(null);
  const [commentDraft, setCommentDraft] = useState('');

  const toggleConfirmMismatch = (docName: string, fieldName: string) => {
    if (!selectedJob) return;
    const key = `${selectedJob.id}_${docName}_${fieldName}`;
    assignJobToCurrentUser(selectedJob.id);

    setConfirmedMismatches(prev => {
      const isConfirmed = !prev[key];
      
      // Add an audit log entry for this action
      const newLog = {
        id: Math.random().toString(36).substr(2, 9),
        jobId: selectedJob.id,
        docName: docName,
        timestamp: new Date().toISOString(),
        action: isConfirmed ? 'CONFIRM_DATA' : 'UNCONFIRM_DATA',
        details: language === 'TH'
          ? (isConfirmed
              ? `กดยืนยันใช้ค่านี้สำหรับฟิลด์ "${fieldName}" ใน "${docName}"`
              : `กดยกเลิกการยืนยันฟิลด์ "${fieldName}" ใน "${docName}"`)
          : (isConfirmed
              ? `Confirmed value for field "${fieldName}" in "${docName}"`
              : `Unconfirmed field "${fieldName}" in "${docName}"`),
        version: selectedJob.updatedDocs?.includes(docName) ? 2 : 1,
        user: 'Kunawut W.'
      };
      setOcrLogs(prevLogs => [newLog, ...prevLogs]);

      return {
        ...prev,
        [key]: isConfirmed
      };
    });
  };
  const [showStatusGuide, setShowStatusGuide] = useState(false);
  const [tempOCRData, setTempOCRData] = useState<Record<string, string>>({});
  const [originalOCRData, setOriginalOCRData] = useState<Record<string, string>>({});
  const [activePdfTab, setActivePdfTab] = useState<'EXTRACTED' | 'LOG'>('EXTRACTED');
  const [zoomLevel, setZoomLevel] = useState<number>(0.89);
  const [rotationAngle, setRotationAngle] = useState<number>(0);
  const [pdfCurrentPage, setPdfCurrentPage] = useState<number>(1);
  const [activeRightTab, setActiveRightTab] = useState<'excel' | 'json'>('excel');
  const [copiedJson, setCopiedJson] = useState<boolean>(false);
  // Cross-highlighting between the field list (right pane) and the rendered document (left pane):
  // key = `${group}::${fieldName}` so same-named fields in different item groups don't collide.
  const [hoveredFieldKey, setHoveredFieldKey] = useState<string | null>(null);
  const [selectedFieldKey, setSelectedFieldKey] = useState<string | null>(null);
  const [showOnlyMismatchedFields, setShowOnlyMismatchedFields] = useState(false);
  const isFieldHighlighted = (fieldName: string, group?: string) => {
    if (!hoveredFieldKey && !selectedFieldKey) return false;
    const key = `${group || 'no-group'}::${fieldName}`;
    return hoveredFieldKey === key || selectedFieldKey === key;
  };
  // For document renders that don't track a group (static header text, or the generic
  // key/value fallback layout), match on field name alone regardless of which item group it's in.
  const isFieldHighlightedByName = (fieldName: string) => {
    const active = hoveredFieldKey || selectedFieldKey;
    if (!active) return false;
    return active.endsWith(`::${fieldName}`);
  };
  const [ocrLogs, setOcrLogs] = useState<{id: string, jobId: string, docName: string, timestamp: string, action: string, details: string, version: number, user: string}[]>([
    { id: 'log-1', jobId: 'job-012a', docName: 'INVOICE', timestamp: new Date(Date.now() - 86400000).toISOString(), action: 'UPLOAD_NEW', details: 'อัปโหลดเอกสารเวอร์ชันเริ่มต้น', version: 1, user: 'System' },
    { id: 'log-2', jobId: 'job-012a', docName: 'INVOICE', timestamp: new Date(Date.now() - 3600000).toISOString(), action: 'EDIT_DATA', details: 'แก้ไขข้อมูลฟิลด์: Consignee Name, Consignee Tax ID', version: 1, user: 'Kunawut W.' },
    { id: 'log-3', jobId: 'job-012a', docName: 'INVOICE', timestamp: new Date().toISOString(), action: 'EDIT_DATA', details: 'แก้ไขข้อมูลฟิลด์: Port of Discharge', version: 1, user: 'Kunawut W.' },
    { id: 'log-4', jobId: 'job-012a', docName: 'PACKING LIST', timestamp: new Date(Date.now() - 86400000).toISOString(), action: 'UPLOAD_NEW', details: 'อัปโหลดเอกสารเวอร์ชันเริ่มต้น', version: 1, user: 'System' },
    { id: 'log-5', jobId: 'job-012a', docName: 'PACKING LIST', timestamp: new Date(Date.now() - 3600000).toISOString(), action: 'EDIT_DATA', details: 'แก้ไขข้อมูลฟิลด์: Invoice No., Date', version: 1, user: 'Kunawut W.' },
    { id: 'log-6', jobId: 'job-012a', docName: 'PACKING LIST', timestamp: new Date().toISOString(), action: 'UPLOAD_NEW', details: 'อัปโหลดเวอร์ชันใหม่: rev2', version: 2, user: 'Kunawut W.' },
    // job-004a (KR-TH-2026-00567 / JOB-001) is a DONE + LOCKED job — seeded with a full
    // upload -> OCR -> confirm -> export history so its activity log isn't empty.
    { id: 'log-7', jobId: 'job-004a', docName: 'Invoice', timestamp: new Date(Date.now() - 8 * 86400000).toISOString(), action: 'UPLOAD_NEW', details: 'อัปโหลดเอกสารเวอร์ชันเริ่มต้น', version: 1, user: 'Nui P.' },
    { id: 'log-8', jobId: 'job-004a', docName: 'Invoice', timestamp: new Date(Date.now() - 8 * 86400000 + 300000).toISOString(), action: 'OCR_DONE', details: 'อ่านไฟล์และดึงข้อมูลสำเร็จ', version: 1, user: 'Nui P.' },
    { id: 'log-9', jobId: 'job-004a', docName: 'Packing List', timestamp: new Date(Date.now() - 8 * 86400000).toISOString(), action: 'UPLOAD_NEW', details: 'อัปโหลดเอกสารเวอร์ชันเริ่มต้น', version: 1, user: 'Nui P.' },
    { id: 'log-10', jobId: 'job-004a', docName: 'Packing List', timestamp: new Date(Date.now() - 8 * 86400000 + 300000).toISOString(), action: 'OCR_DONE', details: 'อ่านไฟล์และดึงข้อมูลสำเร็จ', version: 1, user: 'Nui P.' },
    { id: 'log-11', jobId: 'job-004a', docName: 'CO', timestamp: new Date(Date.now() - 8 * 86400000).toISOString(), action: 'UPLOAD_NEW', details: 'อัปโหลดเอกสารเวอร์ชันเริ่มต้น', version: 1, user: 'Nui P.' },
    { id: 'log-12', jobId: 'job-004a', docName: 'CO', timestamp: new Date(Date.now() - 8 * 86400000 + 300000).toISOString(), action: 'OCR_DONE', details: 'อ่านไฟล์และดึงข้อมูลสำเร็จ', version: 1, user: 'Nui P.' },
    { id: 'log-13', jobId: 'job-004a', docName: 'CO', timestamp: new Date(Date.now() - 7 * 86400000).toISOString(), action: 'EDIT_DATA', details: 'แก้ไขข้อมูลฟิลด์: Certificate No.', version: 1, user: 'Nui P.' }
  ]);
  const [showJobLogsModal, setShowJobLogsModal] = useState(false);
  const [showSaveToast, setShowSaveToast] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [activeBoardTab, setActiveBoardTab] = useState('jobs');
  const [selectedShipment, setSelectedShipment] = useState<string | null>(null);

  const getShipments = () => {
    const grouped: Record<string, ComparisonJob[]> = {};
    jobs.forEach(job => {
      const ref = job.reference || 'UNKNOWN';
      if (!grouped[ref]) {
        grouped[ref] = [];
      }
      grouped[ref].push(job);
    });

    return Object.entries(grouped).map(([reference, shipmentJobs]) => {
      const unfinishedJobs = shipmentJobs.filter(j => j.status !== JobStatus.READY);
      const activeJob = unfinishedJobs[0] || shipmentJobs[shipmentJobs.length - 1];
      const currentAssignee = activeJob ? activeJob.assignee : 'N/A';
      const currentPhase = activeJob ? activeJob.workflowName : (language === 'TH' ? 'เสร็จสิ้นทั้งหมด' : 'All Completed');

      const completedCount = shipmentJobs.filter(j => j.status === JobStatus.READY).length;
      const totalCount = shipmentJobs.length;

      const createdAt = shipmentJobs.reduce((acc, job) => {
        if (!acc) return job.createdAt;
        try {
          return parseDateValue(job.createdAt) < parseDateValue(acc) ? job.createdAt : acc;
        } catch (e) {
          return job.createdAt;
        }
      }, shipmentJobs[0]?.createdAt);

      const latestUpdate = shipmentJobs.reduce((acc, job) => {
        if (!acc) return job.expiryDate;
        try {
          return parseDateValue(job.expiryDate) > parseDateValue(acc) ? job.expiryDate : acc;
        } catch (e) {
          return job.expiryDate;
        }
      }, shipmentJobs[0]?.expiryDate);

      const isUnfinished = shipmentJobs.some(j => j.status !== JobStatus.READY);
      const isMyPending = shipmentJobs.some(j => j.assignee === 'Kunawut W.' && j.status !== JobStatus.READY);

      return {
        reference,
        jobs: shipmentJobs,
        currentPhase,
        currentAssignee,
        completedCount,
        totalCount,
        createdAt,
        latestUpdate,
        isUnfinished,
        isMyPending
      };
    }).sort((a, b) => {
      return parseDateValue(b.createdAt) - parseDateValue(a.createdAt);
    });
  };

  const [selectedPendingId, setSelectedPendingId] = useState<string | null>(null);
  const [readPendingIds, setReadPendingIds] = useState<Set<string>>(new Set());
  const [pendingDocTypeSelections, setPendingDocTypeSelections] = useState<Record<string, string>>({});
  const [showRejectPendingModal, setShowRejectPendingModal] = useState(false);
  const [rejectPendingId, setRejectPendingId] = useState<string | null>(null);
  const [showRejectFileModal, setShowRejectFileModal] = useState(false);
  const [showCreateJobModal, setShowCreateJobModal] = useState(false);
  // Job presets assigned to the current user's team (Job Preset Settings) — a team can match
  // multiple presets, so the user picks a starting one from a dropdown when creating a shipment.
  const teamPresets = MOCK_PRESETS.filter(p => p.isActive && p.assignedTeams.includes(CURRENT_USER_TEAM));
  const [rejectFileTargetDocName, setRejectFileTargetDocName] = useState<string | null>(null);
  const [pendingFilter, setPendingFilter] = useState('All');
  const [collapsedParts, setCollapsedParts] = useState<Record<string, boolean>>({
    Header: false,
    Description: false,
    Footer: false
  });
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({});
  const [collapsedPreviewGroups, setCollapsedPreviewGroups] = useState<Record<string, boolean>>({});
  const [logFilter, setLogFilter] = useState<'ALL' | 'JOB' | 'PENDING'>('ALL');

  // --- Export Job Modal States ---
  const [showWorkflowWarning, setShowWorkflowWarning] = useState(false);
  const [exportJob, setExportJob] = useState<ComparisonJob | null>(null);
  const [exportOption, setExportOption] = useState<'workflow' | 'custom'>('workflow');
  const [selectedExportWorkflow, setSelectedExportWorkflow] = useState<string>('');
  const [selectedExportPlatform, setSelectedExportPlatform] = useState<string>('FTA');

const mockWorkflows: Workflow[] = [
  {
    id: 'wf-1',
    name: 'Invoice Processing',
    description: 'Processing invoices',
    status: 'ACTIVE',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    nodes: [
      { 
        id: 'node-create-job-1', 
        type: 'create_job', 
        position: { x: 0, y: 0 }, 
        data: { 
          jobName: 'Logistics ruleset invoice checking', 
          docTypes: ['Invoice', 'Purchase Order', 'Delivery Note'] 
        } 
      },
      {
        id: 'node-output-1',
        type: 'output',
        position: { x: 200, y: 0 },
        data: { label: 'Export Data' }
      },
      {
        id: 'node-send-to-1',
        type: 'send_to',
        position: { x: 400, y: 0 },
        data: {
          nodeName: 'ส่งต่องาน ไปยัง Maritime Freight Checking',
          nextWorkflowId: 'wf-4',
          nextWorkflowName: 'Maritime Freight Checking'
        }
      }
    ],
    edges: [
      { id: 'e1', source: 'node-create-job-1', target: 'node-output-1' },
      { id: 'e1-send', source: 'node-output-1', target: 'node-send-to-1' }
    ]
  },
  {
    id: 'wf-3',
    name: 'Australia Meat Import Control',
    description: 'Special control for importing Australian meat products',
    status: 'ACTIVE',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    nodes: [
      {
        id: 'node-create-job-3',
        type: 'create_job',
        position: { x: 0, y: 0 },
        data: {
          jobName: 'Australia Meat Import Control',
          docTypes: ['Invoice', 'Health Cert', 'Import Permit']
        }
      },
      {
        id: 'node-send-to-3',
        type: 'send_to',
        position: { x: 400, y: 0 },
        data: {
          nodeName: 'ส่งต่องาน ไปยัง Customs Declaration Matching',
          nextWorkflowId: 'wf-5',
          nextWorkflowName: 'Customs Declaration Matching'
        }
      }
    ],
    edges: [
      { id: 'e3-send', source: 'node-create-job-3', target: 'node-send-to-3' }
    ]
  },
  {
    id: 'wf-4',
    name: 'Maritime Freight Checking',
    description: 'Verification of maritime shipping documentation and rules compliance',
    status: 'ACTIVE',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    nodes: [
      {
        id: 'node-create-job-4',
        type: 'create_job',
        position: { x: 0, y: 0 },
        data: {
          jobName: 'Maritime Freight Checking',
          docTypes: ['Bill of Lading', 'Packing List', 'Commercial Invoice', 'Certificate of Origin']
        }
      },
      {
        id: 'node-output-4',
        type: 'output',
        position: { x: 200, y: 0 },
        data: { label: 'Export Data' }
      },
      {
        id: 'node-send-to-4',
        type: 'send_to',
        position: { x: 400, y: 0 },
        data: {
          nodeName: 'ส่งต่องาน ไปยัง Electronics Import Rules',
          nextWorkflowId: 'wf-6',
          nextWorkflowName: 'Electronics Import Rules'
        }
      }
    ],
    edges: [
      { id: 'e4', source: 'node-create-job-4', target: 'node-output-4' },
      { id: 'e4-send', source: 'node-output-4', target: 'node-send-to-4' }
    ]
  },
  {
    id: 'wf-5',
    name: 'Customs Declaration Matching',
    description: 'Direct verification of Customs Declaration with single import doc',
    status: 'ACTIVE',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    nodes: [
      {
        id: 'node-create-job-5',
        type: 'create_job',
        position: { x: 0, y: 0 },
        data: {
          jobName: 'Customs Declaration Matching',
          docTypes: ['Import Entry']
        }
      }
    ],
    edges: []
  },
  {
    id: 'wf-6',
    name: 'Electronics Import Rules',
    description: 'Rules for electronics',
    status: 'ACTIVE',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    nodes: [
      {
        id: 'node-create-job-6',
        type: 'create_job',
        position: { x: 0, y: 0 },
        data: {
          jobName: 'Electronics Import',
          docTypes: ['Invoice', 'Packing List']
        }
      },
      {
        id: 'node-output-6',
        type: 'output',
        position: { x: 200, y: 0 },
        data: { label: 'Export Data' }
      },
      {
        id: 'node-send-to-6',
        type: 'send_to',
        position: { x: 400, y: 0 },
        data: {
          nodeName: 'ส่งต่องาน ไปยัง ASEAN Trade Agreement',
          nextWorkflowId: 'wf-7',
          nextWorkflowName: 'ASEAN Trade Agreement'
        }
      }
    ],
    edges: [
      { id: 'e6', source: 'node-create-job-6', target: 'node-output-6' },
      { id: 'e6-send', source: 'node-output-6', target: 'node-send-to-6' }
    ]
  },
  {
    id: 'wf-7',
    name: 'ASEAN Trade Agreement',
    description: 'ASEAN trade rules',
    status: 'ACTIVE',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    nodes: [
      {
        id: 'node-create-job-7',
        type: 'create_job',
        position: { x: 0, y: 0 },
        data: {
          jobName: 'ASEAN Trade',
          docTypes: ['Invoice', 'Packing List']
        }
      },
      {
        id: 'node-output-7',
        type: 'output',
        position: { x: 200, y: 0 },
        data: { label: 'Export Data' }
      }
    ],
    edges: [{ id: 'e7', source: 'node-create-job-7', target: 'node-output-7' }]
  },
  {
    id: 'wf-2',
    name: 'Empty Workflow',
    description: 'Workflow without Job creation node',
    status: 'ACTIVE',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    nodes: [],
    edges: []
  },
  {
    id: 'wf-op-1',
    name: 'PO/PI Matching',
    description: 'Operation team: matches PO/PI against Invoice',
    status: 'ACTIVE',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    nodes: [
      {
        id: 'node-create-job-op-1',
        type: 'create_job',
        position: { x: 0, y: 0 },
        data: {
          jobName: 'PO/PI Matching',
          docTypes: ['PO/PI', 'Invoice']
        }
      },
      {
        id: 'node-send-to-op-1',
        type: 'send_to',
        position: { x: 400, y: 0 },
        data: {
          nodeName: 'ส่งต่องาน ไปยัง Shipping Doc Matching',
          nextWorkflowId: 'wf-op-2',
          nextWorkflowName: 'Shipping Doc Matching'
        }
      }
    ],
    edges: [
      { id: 'e-op-1-send', source: 'node-create-job-op-1', target: 'node-send-to-op-1' }
    ]
  },
  {
    id: 'wf-op-2',
    name: 'Shipping Doc Matching',
    description: 'Operation team: cross-checks Invoice, Packing List, B/L, Freight Invoice, HS Code, and the draft FTA form',
    status: 'ACTIVE',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    nodes: [
      {
        id: 'node-create-job-op-2',
        type: 'create_job',
        position: { x: 0, y: 0 },
        data: {
          jobName: 'Shipping Doc Matching',
          docTypes: ['Invoice', 'Packing List', 'Bill of Lading', 'FREIGHT INVOICE', 'HS Code Master File', 'Form FTA (Draft version)']
        }
      },
      {
        id: 'node-send-to-op-2',
        type: 'send_to',
        position: { x: 400, y: 0 },
        data: {
          nodeName: 'ส่งต่องาน ไปยัง Import Declaration Matching#1',
          nextWorkflowId: 'wf-op-3',
          nextWorkflowName: 'Import Declaration Matching#1'
        }
      }
    ],
    edges: [
      { id: 'e-op-2-send', source: 'node-create-job-op-2', target: 'node-send-to-op-2' }
    ]
  },
  {
    id: 'wf-op-3',
    name: 'Import Declaration Matching#1',
    description: 'Customs team: full import declaration document set including Freight Invoice, HS Code, FTA, and Insurance Sheet',
    status: 'ACTIVE',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    nodes: [
      {
        id: 'node-create-job-op-3',
        type: 'create_job',
        position: { x: 0, y: 0 },
        data: {
          jobName: 'Import Declaration Matching#1',
          docTypes: ['Import Dec.', 'Invoice', 'Packing List', 'Bill of Lading', 'FREIGHT INVOICE', 'HS Code Master File', 'Form FTA', 'Insurance Sheet']
        }
      },
      {
        id: 'node-send-to-op-3',
        type: 'send_to',
        position: { x: 400, y: 0 },
        data: {
          nodeName: 'ส่งต่องาน ไปยัง Import Declaration Matching#2',
          nextWorkflowId: 'wf-op-4',
          nextWorkflowName: 'Import Declaration Matching#2'
        }
      }
    ],
    edges: [
      { id: 'e-op-3-send', source: 'node-create-job-op-3', target: 'node-send-to-op-3' }
    ]
  },
  {
    id: 'wf-op-4',
    name: 'Import Declaration Matching#2',
    description: 'Customs team: supplementary FTA, License, LPI, and other supporting documents',
    status: 'ACTIVE',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    nodes: [
      {
        id: 'node-create-job-op-4',
        type: 'create_job',
        position: { x: 0, y: 0 },
        data: {
          jobName: 'Import Declaration Matching#2',
          docTypes: ['Import Dec.', 'Form FTA', 'License', 'LPI', 'Other']
        }
      }
    ],
    edges: []
  }
];

  // Shared by both a normal export and a skipped flow: find the next sub-job in the shipment
  // sequence, carry document comments and already-extracted doc data forward to it, and move
  // the selected-job view onto it. `finishedJob` must already carry the final doc statuses for
  // the job being left (e.g. DONE with docs marked MATCHED/MISMATCHED, or SKIPPED).
  const advanceToNextJob = (finishedJob: ComparisonJob) => {
    const shipmentJobs = jobs.filter(j => j.reference === finishedJob.reference);
    const seqIndex = shipmentJobs.findIndex(j => j.id === finishedJob.id);
    const nextJob = seqIndex !== -1 && seqIndex < shipmentJobs.length - 1 ? shipmentJobs[seqIndex + 1] : null;

    // Carry document comments forward to the next job in the sequence so reviewers there
    // still see context left on the same document earlier in the shipment. Doc names aren't
    // always cased the same across workflows (e.g. "INVOICE" vs "Invoice"), so match by
    // lowercased name rather than requiring an exact key match.
    if (nextJob) {
      setDocComments(prev => {
        const next = { ...prev };
        const nextJobDocNames = Object.keys(nextJob.docs);
        Object.keys(finishedJob.docs).forEach(docName => {
          const comments = prev[`${finishedJob.id}_${docName}`];
          if (!comments || comments.length === 0) return;
          const matchingNextDocName = nextJobDocNames.find(n => n.toLowerCase() === docName.toLowerCase());
          if (matchingNextDocName) {
            const key = `${nextJob.id}_${matchingNextDocName}`;
            const existing = next[key] || [];
            const existingIds = new Set(existing.map(c => c.id));
            const newOnes = comments.filter(c => !existingIds.has(c.id));
            next[key] = [...existing, ...newOnes];
          }
        });
        return next;
      });
    }

    // If a doc type in the next job was already uploaded and OCR'd in this job (e.g. "Invoice"
    // required by both this flow and the next one), carry its extracted data forward instead of
    // leaving it MISSING — the reviewer shouldn't have to re-upload and re-OCR the same file.
    // A doc that was already MATCHED in the previous flow carries forward as MATCHED directly —
    // it's the same physical document, already verified, so it shouldn't be put through another
    // random compare roll. Anything that was never verified (MISMATCHED, OCR_DONE, SKIPPED) lands
    // as OCR_DONE and goes through comparison again, since the next flow compares against a
    // different set of documents and the previous flow's verdict (or lack of one) isn't valid here.
    let carriedNextJob = nextJob;
    if (nextJob) {
      const updatedDocs = { ...nextJob.docs };
      let changed = false;
      Object.keys(updatedDocs).forEach(docName => {
        if (updatedDocs[docName] !== ComparisonDocStatus.MISSING) return;
        const matchingPrevDocName = Object.keys(finishedJob.docs).find(n => n.toLowerCase() === docName.toLowerCase());
        if (!matchingPrevDocName) return;
        const prevStatus = finishedJob.docs[matchingPrevDocName];
        // Only carry forward docs that finished extraction — a doc still uploading/OCR'ing
        // in this job has nothing useful to hand off yet.
        if (
          prevStatus !== ComparisonDocStatus.MATCHED &&
          prevStatus !== ComparisonDocStatus.MISMATCHED &&
          prevStatus !== ComparisonDocStatus.OCR_DONE &&
          prevStatus !== ComparisonDocStatus.SKIPPED
        ) return;
        updatedDocs[docName] = prevStatus === ComparisonDocStatus.MATCHED
          ? ComparisonDocStatus.MATCHED
          : ComparisonDocStatus.OCR_DONE;
        changed = true;
      });

      if (changed) {
        const found = Object.values(updatedDocs).filter(s => s !== ComparisonDocStatus.MISSING).length;
        const extractedCount = Object.values(updatedDocs).filter(s =>
          s !== ComparisonDocStatus.MISSING &&
          s !== ComparisonDocStatus.RECEIVED &&
          s !== ComparisonDocStatus.EXTRACTING &&
          s !== ComparisonDocStatus.ERROR
        ).length;
        const isAnyExtracting = Object.values(updatedDocs).some(s => s === ComparisonDocStatus.EXTRACTING);
        carriedNextJob = {
          ...nextJob,
          docs: updatedDocs,
          foundDocs: found,
          progress: Math.round((found / nextJob.totalDocs) * 100)
        };
        const finalCarriedJob = carriedNextJob;
        setJobs(prevJobs => prevJobs.map(j => j.id === nextJob.id ? finalCarriedJob : j));
        // Mirror the same auto-compare trigger used after a manual OCR read: once at least two
        // docs are extracted and nothing is still mid-OCR, kick off comparison automatically.
        if (extractedCount >= 2 && !isAnyExtracting) {
          setTimeout(() => handleStartComparison(nextJob.id), 0);
        }
      }
    }

    // If the finished job is currently selected (in details view), update selected job
    if (selectedJob && selectedJob.id === finishedJob.id) {
      if (carriedNextJob) {
        setSelectedJob(carriedNextJob);
      } else {
        setSelectedJob(prev => prev ? { ...prev, status: JobStatus.READY } : null);
      }
    }

    if (nextJob) {
      message.info(
        language === 'TH'
          ? `เปลี่ยนไปยังงานถัดไป: "${nextJob.workflowName}"`
          : `Switched to next job: "${nextJob.workflowName}"`
      );
    }
  };

  const handleConfirmExport = (jobToExport: ComparisonJob) => {
    // 1. Log export action
    const exportDetails = `Exported using workflow: ${jobToExport.workflowName || 'Default'}`;

    setActivityLogs(prev => [
      {
        id: `log-${Date.now()}`,
        action: 'APPROVE',
        user: 'nuifolio@gmail.com',
        timestamp: new Date().toISOString(),
        details: language === 'TH'
          ? `ส่งออกข้อมูลรายการสำเร็จ (${exportDetails})`
          : `Successfully exported job telemetry (${exportDetails})`,
        originalItem: jobToExport
      },
      ...prev
    ]);

    // 2. Transition status of the job in jobs state to READY (complete)
    setJobs(prevJobs =>
      prevJobs.map(j =>
        j.id === jobToExport.id
          ? { ...j, status: JobStatus.READY }
          : j
      )
    );

    advanceToNextJob({ ...jobToExport, status: JobStatus.READY });

    // 4. Reset modal state and show success message
    message.success(
      language === 'TH'
        ? `ส่งออกข้อมูลรายการ "${jobToExport.reference}" เรียบร้อยแล้ว!`
        : `Exported "${jobToExport.reference}" successfully!`
    );

    setExportJob(null);
  };

  // Lets a reviewer on job N send a previous job (N-1) in the same shipment back for correction
  // — e.g. they spot that an earlier job's document is still wrong while reviewing this one.
  // The previous job is marked REJECTED (not DONE), which re-blocks every job after it in the
  // shipment list until it's fixed and re-completed.
  const handleRejectFlow = (currentJob: ComparisonJob, reason: string) => {
    const prevJob = getPreviousJobInShipment(currentJob);
    if (!prevJob) return;

    const rejectedPrevJob: ComparisonJob = {
      ...prevJob,
      status: JobStatus.REJECTED,
      rejectionReason: reason,
      rejectedAt: new Date().toISOString(),
      rejectedBy: CURRENT_USER_NAME
    };

    setJobs(prevJobs => prevJobs.map(j => j.id === prevJob.id ? rejectedPrevJob : j));

    const rejectTimestamp = new Date().toISOString();
    setOcrLogs(prev => [
      {
        id: `log-reject-${Date.now()}`,
        jobId: currentJob.id,
        docName: Object.keys(currentJob.docs).join(', '),
        timestamp: rejectTimestamp,
        action: 'REJECT_FLOW',
        details: language === 'TH'
          ? `ตีกลับไปยัง "${prevJob.workflowName || prevJob.reference}" เหตุผล: ${reason}`
          : `Rejected back to "${prevJob.workflowName || prevJob.reference}". Reason: ${reason}`,
        version: 1,
        user: CURRENT_USER_NAME
      },
      // Also log against the rejected (previous) job itself, so its own activity history
      // shows the kickback — not just the job that initiated it.
      {
        id: `log-rejected-${Date.now()}`,
        jobId: prevJob.id,
        docName: language === 'TH' ? 'ทั้งหมด' : 'ALL',
        timestamp: rejectTimestamp,
        action: 'REJECTED',
        details: language === 'TH'
          ? `ถูกตีกลับจาก "${currentJob.workflowName || currentJob.reference}" เหตุผล: ${reason}`
          : `Rejected back from "${currentJob.workflowName || currentJob.reference}". Reason: ${reason}`,
        version: 1,
        user: CURRENT_USER_NAME
      },
      ...prev
    ]);

    message.success(
      language === 'TH'
        ? `ตีกลับไปยัง "${prevJob.workflowName || prevJob.reference}" เรียบร้อยแล้ว`
        : `Sent back to "${prevJob.workflowName || prevJob.reference}"`
    );

    setShowRejectFlowConfirm(false);
    setRejectReason('');
    setStep(0);
    setSelectedJob(null);
  };


  const [activityLogs, setActivityLogs] = useState<AuditLog[]>([
    {
      id: 'log-1',
      action: 'APPROVE',
      user: 'nuifolio@gmail.com',
      timestamp: new Date(Date.now() - 1000 * 60 * 5).toISOString(), // 5m ago
      details: 'Approved Email Review: RE: Shipment docs April'
    },
    {
      id: 'log-2',
      action: 'LOCK_JOB',
      user: 'nuifolio@gmail.com',
      timestamp: new Date(Date.now() - 1000 * 60 * 15).toISOString(), // 15m ago
      details: 'Locked Job SG-TH-2025-00334 for export'
    },
    {
      id: 'log-3',
      action: 'REJECT',
      user: 'system@bizx.ai',
      timestamp: new Date(Date.now() - 1000 * 60 * 30).toISOString(), // 30m ago
      details: 'Rejected Email Review: Urgent Invoice - Missing Attachments',
      originalItem: {
        id: 'p-mock-reject',
        typeBadge: 'Email review',
        title: 'Urgent Invoice - Missing Attachments',
        sub: 'billing@vendor_a.com → finance@bizx.co',
        workflow: 'Finance Approval',
        time: '30m ago',
        status: 'pending',
        sender: 'billing@vendor_a.com',
        to: 'finance@bizx.co',
        subject: 'Urgent Invoice - Missing Attachments',
        body: 'Here is the urgent invoice for PO-8871.',
        attachments: ['INV-8871-mismatch.pdf'],
        aiConfidence: 75,
        aiReasoning: 'อีเมลนี้ถูกตรวจพบว่ามีข้อมูลเอกสารแนบไม่ครบถ้วนตามเงื่อนไข workflow',
        type: 'Email'
      }
    },
    {
      id: 'log-4',
      action: 'CREATE_JOB',
      user: 'import@company.com',
      timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(), // 2h ago
      details: 'Created new Job LEO-2025-0045 from Manual Upload'
    },
    {
      id: 'log-5',
      action: 'OCR_DONE',
      user: 'AI Agent (Mail)',
      timestamp: new Date(Date.now() - 1000 * 60 * 60 * 4).toISOString(), // 4h ago
      details: 'Completed data extraction for BL_APR2025.pdf (Accuracy: 98%)'
    },
    {
      id: 'log-6',
      action: 'MISMATCH_DETECTED',
      user: 'AI Agent (Compare)',
      timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(), // 1d ago
      details: 'Found 3 mismatches in Job LEO-2025-0041'
    },
    {
      id: 'log-7',
      action: 'APPROVE',
      user: 'Nui P.',
      timestamp: new Date(Date.now() - 7 * 86400000 + 600000).toISOString(),
      details: 'ส่งออกข้อมูลและล็อครายการสำเร็จ',
      originalItem: { id: 'job-004a' }
    }
  ]);

  const [pendingInboxItems, setPendingInboxItems] = useState([
    {
      id: 'p-1',
      typeBadge: 'Email review',
      title: 'RE: Shipment docs April',
      sub: 'supplier@co.th → import@company.com',
      workflow: 'LEO Billing',
      time: '2m ago',
      status: 'pending',
      sender: 'supplier@co.th',
      to: 'import@company.com',
      subject: 'RE: Shipment docs April',
      body: 'Please find attached the shipment documents for April batch. Kindly process at your earliest convenience.',
      attachments: ['Invoice_April_v2.pdf', 'BL_APR2025.pdf'],
      aiConfidence: 62,
      aiReasoning: 'email นี้มีความเป็นไปได้ที่จะเกี่ยวข้องกับเอกสารนำเข้า เนื่องจากมีคำว่า "shipment documents" และไฟล์แนบที่มีชื่อตรงกับ pattern แต่ sender ไม่ได้อยู่ใน allowlist จึงส่งมาให้ยืนยัน',
      type: 'Email'
    },
    {
      id: 'p-2',
      typeBadge: 'Doc type',
      title: 'Invoice_April_v2.pdf',
      sub: 'Job LEO-2025-0041',
      workflow: 'LEO Billing',
      time: '5m ago',
      status: 'pending',
      jobNo: 'LEO-2025-0041',
      fileSize: '1.2 MB',
      aiSuggestedType: 'INVOICE',
      aiConfidence: 95,
      aiReasoning: 'ตรวจพบว่าเป็น Invoice แน่นอน แต่อยู่ในขั้นตอนรอการตรวจสอบความถูกต้องของประเภทเอกสารโดยเจ้าหน้าที่',
      type: 'Doc type'
    },
    {
      id: 'p-5',
      typeBadge: 'Email review',
      title: 'FW: New Invoice for Order #9982',
      sub: 'accounts@global.com → invoices@bizx.co',
      workflow: 'Global Logistics',
      time: '45m ago',
      status: 'pending',
      sender: 'accounts@global.com',
      to: 'invoices@bizx.co',
      subject: 'FW: New Invoice for Order #9982',
      body: 'Forwarding the invoice for order #9982. Please verify.',
      attachments: ['INV_9982_GL.pdf'],
      aiConfidence: 89,
      aiReasoning: 'ตรวจพบคำว่า Invoice และหมายเลข Order ที่ถูกต้อง แต่เป็น Forwarded mail จึงต้องการการยืนยันตัวตนเจ้าของข้อมูล',
      type: 'Email'
    },
    {
      id: 'p-6',
      typeBadge: 'Email review',
      title: 'Incomplete KYC - Action Required',
      sub: 'compliance@bank.co → accounts@bizx.co',
      workflow: 'Compliance Check',
      time: '1h ago',
      status: 'pending',
      sender: 'compliance@bank.co',
      to: 'accounts@bizx.co',
      subject: 'Incomplete KYC - Action Required',
      body: 'We noticed some missing fields in your KYC submission. Please re-upload the valid documents.',
      attachments: ['KYC_Status.pdf'],
      aiConfidence: 55,
      aiReasoning: 'ตรวจพบคำสั่งให้แก้ไขเอกสาร (KYC) ซึ่งอาจต้องใช้การพิจารณาจากเจ้าหน้าที่ฝ่ายกฎหมายเพิ่มเติม',
      type: 'Email'
    },
    {
      id: 'p-7',
      typeBadge: 'Email review',
      title: 'Payment notification for PO-8871',
      sub: 'billing@vendor_a.com → finance@bizx.co',
      workflow: 'Finance Approval',
      time: '2h ago',
      status: 'pending',
      sender: 'billing@vendor_a.com',
      to: 'finance@bizx.co',
      subject: 'Payment notification for PO-8871',
      body: 'Attached is the payment receipt for PO-8871. Please confirm receipt.',
      attachments: ['Receipt_8871.pdf'],
      aiConfidence: 82,
      aiReasoning: 'พบความเชื่อมโยงกับ PO และใบเสร็จรับเงิน แต่ระบบต้องการการตรวจสอบความถูกต้องของยอดเงินก่อนอนุมัติ',
      type: 'Email'
    },
    {
      id: 'p-8',
      typeBadge: 'Email review',
      title: 'Missing Signature on Contract #552',
      sub: 'legal@partner.com → management@bizx.co',
      workflow: 'Legal Review',
      time: '3h ago',
      status: 'pending',
      sender: 'legal@partner.com',
      to: 'management@bizx.co',
      subject: 'Missing Signature on Contract #552',
      body: 'The contract #552 is returned as it lacks one of the required signatures. Please sign and return.',
      attachments: ['Contract_552_Draft.pdf'],
      aiConfidence: 70,
      aiReasoning: 'เอกสารสัญญาถูกส่งกลับเนื่องจากลายเซ็นไม่ครบถ้วน จำเป็นต้องตรวจสอบว่าลายเซ็นที่หายไปเป็นของใคร',
      type: 'Email'
    },
    {
      id: 'p-9',
      typeBadge: 'Email review',
      title: 'Refund Request - User ID 1209',
      sub: 'customer@service.com → support@bizx.co',
      workflow: 'Service Support',
      time: '5h ago',
      status: 'pending',
      sender: 'customer@service.com',
      to: 'support@bizx.co',
      subject: 'Refund Request - User ID 1209',
      body: 'I am requesting a refund for my last transaction. Here is the transaction log.',
      attachments: ['Txn_Log_1209.csv'],
      aiConfidence: 45,
      aiReasoning: 'เป็นคำร้องขอคืนเงิน ระบบไม่สามารถตัดสินใจเองได้เนื่องจากเรื่องนโยบายบริษัท',
      type: 'Email'
    },
    {
      id: 'p-10',
      typeBadge: 'Doc type',
      title: 'Quotation_Q1_2026.pdf',
      sub: 'Job LEO-2025-0042',
      workflow: 'LEO Billing',
      time: '1d ago',
      status: 'pending',
      jobNo: 'LEO-2025-0042',
      fileSize: '840 KB',
      aiSuggestedType: 'QUOTATION',
      aiConfidence: 92,
      aiReasoning: 'ตรวจพบว่าเป็น Quotation แต่อาจสับสนกับ Invoice ในบางส่วนของหัวกระดาษ',
      type: 'Doc type'
    },
    {
      id: 'p-11',
      typeBadge: 'Doc type',
      title: 'Packing_List_v4.pdf',
      sub: 'Job LEO-2025-0043',
      workflow: 'LEO Billing',
      time: '1d ago',
      status: 'pending',
      jobNo: 'LEO-2025-0043',
      fileSize: '450 KB',
      aiSuggestedType: 'PACKING LIST',
      aiConfidence: 88,
      aiReasoning: 'โครงสร้างไฟล์ตรงกับ Packing List แต่ชื่อไฟล์มี v4 ซึ่งอาจเป็นเวอร์ชันที่ไม่ล่าสุด',
      type: 'Doc type'
    },
    {
      id: 'p-12',
      typeBadge: 'Doc type',
      title: 'Customs_Declaration_Main.pdf',
      sub: 'Job LEO-2025-0044',
      workflow: 'LEO Billing',
      time: '2d ago',
      status: 'pending',
      jobNo: 'LEO-2025-0044',
      fileSize: '2.1 MB',
      aiSuggestedType: 'CUSTOMS DECLARATION',
      aiConfidence: 90,
      aiReasoning: 'พบเอกสารสำแดงศุลกากร แต่รหัสพิกัดศุลกากร (HS Code) บางส่วนอ่านได้ไม่ชัดเจน',
      type: 'Doc type'
    },
    {
      id: 'p-13',
      typeBadge: 'Doc type',
      title: 'Insurance_Certificate_Final.pdf',
      sub: 'Job LEO-2025-0045',
      workflow: 'LEO Billing',
      time: '2d ago',
      status: 'pending',
      jobNo: 'LEO-2025-0045',
      fileSize: '320 KB',
      aiSuggestedType: 'INSURANCE',
      aiConfidence: 94,
      aiReasoning: 'ใบรับรองประกันภัยมีความสมบูรณ์ แต่ระบบต้องการการตรวจสอบวันสิ้นสุดความคุ้มครอง',
      type: 'Doc type'
    },
    {
      id: 'p-14',
      typeBadge: 'Doc type',
      title: 'Shipping_Instructions_002.pdf',
      sub: 'Job LEO-2025-0046',
      workflow: 'LEO Billing',
      time: '3d ago',
      status: 'pending',
      jobNo: 'LEO-2025-0046',
      fileSize: '1.5 MB',
      aiSuggestedType: 'SHIPPING INSTRUCTIONS',
      aiConfidence: 85,
      aiReasoning: 'คำแนะนำการขนส่งมีรายละเอียดที่ซับซ้อนและมีสาขาปลายทางหลายแห่ง',
      type: 'Doc type'
    }
  ]);

  const handleApprovePending = (id: string) => {
    const item = pendingInboxItems.find(i => i.id === id);
    if (!item) return;

    let assignedType = '';
    if (item.type === 'Doc type') {
       assignedType = pendingDocTypeSelections[id] || item.aiSuggestedType || '';
    }

    message.success(
      language === 'TH' 
        ? `ยืนยันประเภทเอกสาร ${assignedType ? `(${assignedType}) ` : ''}เรียบร้อยแล้ว สำเร็จ` 
        : `Confirmed ${assignedType ? `(${assignedType}) ` : ''}successfully.`
    );
    
    // Add to activity logs
    setActivityLogs(prev => [{
      id: `log-${Date.now()}`,
      action: 'APPROVE',
      user: 'nuifolio@gmail.com',
      timestamp: new Date().toISOString(),
      details: assignedType 
         ? `Confirmed document type as ${assignedType} for ${item.title}` 
         : `Approved ${item.typeBadge}: ${item.title}`
    }, ...prev]);

    setPendingInboxItems(prev => prev.filter(item => item.id !== id));
    if (selectedPendingId === id) setSelectedPendingId(null);
  };

  const handleRejectPending = (id: string) => {
    setRejectPendingId(id);
    setShowRejectPendingModal(true);
  };

  const confirmRejectPending = () => {
    if (!rejectPendingId) return;
    const item = pendingInboxItems.find(i => i.id === rejectPendingId);
    message.error(language === 'TH' ? 'ปฏิเสธรายการและลบไฟล์เรียบร้อยแล้ว' : 'Item rejected and discarded.');
    
    // Add to activity logs
    if (item) {
      setActivityLogs(prev => [{
        id: `log-${Date.now()}`,
        action: 'REJECT',
        user: 'nuifolio@gmail.com',
        timestamp: new Date().toISOString(),
        details: `Rejected ${item.typeBadge}: ${item.title}`,
        originalItem: item
      }, ...prev]);
    }

    setPendingInboxItems(prev => prev.filter(item => item.id !== rejectPendingId));
    if (selectedPendingId === rejectPendingId) setSelectedPendingId(null);
    setShowRejectPendingModal(false);
    setRejectPendingId(null);
  };

  const handleRestorePending = (log: AuditLog) => {
    if (!log.originalItem) return;
    
    const alreadyExists = pendingInboxItems.some(item => item.id === log.originalItem.id);
    if (alreadyExists) {
      message.warning(language === 'TH' ? 'รายการนี้อยู่ใน Inbox เรียบร้อยแล้ว' : 'Item is already in the inbox.');
      return;
    }

    setPendingInboxItems(prev => [log.originalItem, ...prev]);
    
    setActivityLogs(prev => [
      {
        id: `log-${Date.now()}`,
        action: 'RESTORE',
        user: 'nuifolio@gmail.com',
        timestamp: new Date().toISOString(),
        details: language === 'TH' ? `กู้คืนรายการ "${log.originalItem.title}" กลับสู่ Inbox` : `Restored "${log.originalItem.title}" back to Inbox`
      },
      ...prev
    ]);

    setActivityLogs(current => 
      current.map(item => 
        item.id === log.id 
          ? { ...item, originalItem: undefined } 
          : item
      )
    );

    message.success(language === 'TH' ? 'กู้คืนรายการกลับสู่ Inbox สำเร็จ' : 'Successfully restored item to Inbox.');
  };
  
  // --- Custom States for User File Upload & Grouping ---
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadedLocalFiles, setUploadedLocalFiles] = useState<{
    id: string;
    name: string;
    size: number;
    type: string;
  }[]>([]);
  const [selectedLocalFiles, setSelectedLocalFiles] = useState<Set<string>>(new Set());
  const [groupNameInput, setGroupNameInput] = useState('');
  const [sessionGroups, setSessionGroups] = useState<{
    id: string;
    name: string;
    files: { id: string; name: string; size: number; type: string }[];
  }[]>([]);
  const [autoStartOCR, setAutoStartOCR] = useState(true);
  const [isDragging, setIsDragging] = useState(false);

  // --- Custom States for Column Replace Feature ---
  const [showReplaceModal, setShowReplaceModal] = useState(false);
  const [replaceTargetColumn, setReplaceTargetColumn] = useState<string | null>(null);
  // Whether replaceTargetColumn already had data before this upload (opened via the
  // "Replace" icon on an already-OCR'd column) vs. a first-time upload on a MISSING column —
  // only the former needs to ask whether to replace or merge with the existing dataset.
  const [replaceIsResubmission, setReplaceIsResubmission] = useState(false);
  const [replaceMode, setReplaceMode] = useState<'replace' | 'merge'>('replace');
  const [replaceUploadedFiles, setReplaceUploadedFiles] = useState<{
    id: string;
    name: string;
    size: number;
    type: string;
    pageMode: 'all' | 'custom';
    pageRange: string;
    templateName: string;
    file: File;
  }[]>([]);
  const [replaceIsDragging, setReplaceIsDragging] = useState(false);
  const [replacePreviewFileId, setReplacePreviewFileId] = useState<string | null>(null);
  const [replacePreviewUrl, setReplacePreviewUrl] = useState<string | null>(null);
  // Real parsed content for the Excel/XML preview overlay (actual uploaded bytes, not a mock).
  const [replacePreviewParsed, setReplacePreviewParsed] = useState<
    | { kind: 'excel'; rows: any[][]; truncatedRows: boolean; truncatedCols: boolean }
    | { kind: 'xml'; lines: string[]; truncated: boolean }
    | { kind: 'error' }
    | null
  >(null);
  const [replaceAutoStartOCR, setReplaceAutoStartOCR] = useState(true);
  const [hiddenLockedDocs, setHiddenLockedDocs] = useState<string[]>([]);
  const [showColumnSelector, setShowColumnSelector] = useState(false);
  // Expands the job header + compare table card to fill the viewport, for reviewing wide
  // tables without the surrounding page chrome getting in the way.
  const [isJobPanelFullscreen, setIsJobPanelFullscreen] = useState(false);
  useEffect(() => {
    if (!isJobPanelFullscreen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsJobPanelFullscreen(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isJobPanelFullscreen]);
  // Collapses the flow stepper once the matrix table is scrolled, to free up table height —
  // reappears once scrolled back to the top.
  const [tableScrolledPastTop, setTableScrolledPastTop] = useState(false);
  // rAF-throttled so the collapse state flips at most once per frame instead of once per wheel
  // tick, and a hysteresis gap (24px vs 4px) stops it flapping back and forth near the threshold —
  // both were causing the header collapse animation to stutter mid-scroll.
  const tableScrollRafRef = useRef<number | null>(null);
  const handleTableScroll = (scrollTop: number) => {
    if (tableScrollRafRef.current !== null) return;
    tableScrollRafRef.current = requestAnimationFrame(() => {
      tableScrollRafRef.current = null;
      setTableScrolledPastTop(prev => {
        if (!prev && scrollTop > 24) return true;
        if (prev && scrollTop < 4) return false;
        return prev;
      });
    });
  };
  const [showDeleteColumnConfirmModal, setShowDeleteColumnConfirmModal] = useState(false);
  const [deleteColumnTargetDocName, setDeleteColumnTargetDocName] = useState<string | null>(null);
  const [confirmAllMismatchesTargetDocName, setConfirmAllMismatchesTargetDocName] = useState<string | null>(null);
  const [showRejectFlowConfirm, setShowRejectFlowConfirm] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [showRejectionReasonModal, setShowRejectionReasonModal] = useState(false);
  const [showGenerateReportDrawer, setShowGenerateReportDrawer] = useState(false);

  // --- Custom Handlers for Column Replace Feature ---
  const handleReplaceDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setReplaceIsDragging(true);
  };
  const handleReplaceDragLeave = () => {
    setReplaceIsDragging(false);
  };
  const handleReplaceDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setReplaceIsDragging(false);
    if (e.dataTransfer.files) appendReplaceFiles(e.dataTransfer.files);
  };
  const handleReplaceFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) appendReplaceFiles(e.target.files);
  };
  const appendReplaceFiles = (fileList: FileList) => {
    const allFiles = Array.from(fileList);
    const oversized = allFiles.filter(f => f.size > MAX_UPLOAD_FILE_SIZE_BYTES);
    const validFiles = allFiles.filter(f => f.size <= MAX_UPLOAD_FILE_SIZE_BYTES);
    if (oversized.length > 0) {
      alert(
        language === 'TH'
          ? `ไฟล์ต่อไปนี้มีขนาดเกิน 5MB จึงไม่ถูกอัปโหลด:\n${oversized.map(f => f.name).join('\n')}`
          : `The following files exceed 5MB and were not uploaded:\n${oversized.map(f => f.name).join('\n')}`
      );
    }
    const newFiles = validFiles.map(f => ({
      id: `replace-file-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      name: f.name,
      size: f.size,
      type: f.type || 'application/pdf',
      pageMode: 'all' as const,
      pageRange: '',
      templateName: '',
      file: f
    }));
    setReplaceUploadedFiles(prev => [...prev, ...newFiles]);
  };
  const handleRemoveReplaceFile = (fileId: string) => {
    setReplaceUploadedFiles(prev => prev.filter(f => f.id !== fileId));
    if (replacePreviewFileId === fileId) setReplacePreviewFileId(null);
  };
  const setReplaceFilePageMode = (fileId: string, pageMode: 'all' | 'custom') => {
    setReplaceUploadedFiles(prev => prev.map(f => f.id === fileId ? { ...f, pageMode } : f));
  };
  const setReplaceFilePageRange = (fileId: string, pageRange: string) => {
    setReplaceUploadedFiles(prev => prev.map(f => f.id === fileId ? { ...f, pageRange } : f));
  };
  const setReplaceFileTemplateName = (fileId: string, templateName: string) => {
    setReplaceUploadedFiles(prev => prev.map(f => f.id === fileId ? { ...f, templateName } : f));
  };

  // Object URL for whichever uploaded file is currently open in the preview overlay —
  // recreated on switch, revoked on switch/close/unmount so blobs don't leak.
  useEffect(() => {
    if (!replacePreviewFileId) {
      setReplacePreviewUrl(null);
      return;
    }
    const target = replaceUploadedFiles.find(f => f.id === replacePreviewFileId);
    if (!target) {
      setReplacePreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(target.file);
    setReplacePreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [replacePreviewFileId]);

  // Parses the real uploaded bytes for Excel/XML files so the preview overlay shows actual
  // sheet data / document content instead of a generic placeholder card.
  useEffect(() => {
    setReplacePreviewParsed(null);
    if (!replacePreviewFileId) return;
    const target = replaceUploadedFiles.find(f => f.id === replacePreviewFileId);
    if (!target) return;
    const format = detectFileFormat(target.file.name);
    let cancelled = false;

    if (format === 'excel') {
      target.file.arrayBuffer()
        .then(buffer => {
          if (cancelled) return;
          const workbook = XLSX.read(buffer, { type: 'array' });
          const sheet = workbook.Sheets[workbook.SheetNames[0]];
          const allRows: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, blankrows: false });
          const MAX_ROWS = 100;
          const MAX_COLS = 15;
          const truncatedRows = allRows.length > MAX_ROWS;
          const truncatedCols = allRows.some(r => r.length > MAX_COLS);
          const rows = allRows.slice(0, MAX_ROWS).map(r => r.slice(0, MAX_COLS));
          setReplacePreviewParsed({ kind: 'excel', rows, truncatedRows, truncatedCols });
        })
        .catch(() => { if (!cancelled) setReplacePreviewParsed({ kind: 'error' }); });
    } else if (format === 'xml') {
      target.file.text()
        .then(text => {
          if (cancelled) return;
          const MAX_LINES = 400;
          const formatted = formatXmlForPreview(text);
          const truncated = formatted.length > MAX_LINES;
          setReplacePreviewParsed({ kind: 'xml', lines: formatted.slice(0, MAX_LINES), truncated });
        })
        .catch(() => { if (!cancelled) setReplacePreviewParsed({ kind: 'error' }); });
    }

    return () => { cancelled = true; };
  }, [replacePreviewFileId]);

  const handleConfirmReplace = () => {
    if (!selectedJob || !replaceTargetColumn) return;
    if (replaceUploadedFiles.length === 0) {
      alert(language === 'TH' ? 'กรุณาอัปโหลดอย่างน้อย 1 ไฟล์' : 'Please upload at least 1 file.');
      return;
    }
    if (replaceUploadedFiles.some(f => !f.templateName)) {
      alert(language === 'TH' ? 'กรุณาเลือก Template ให้ครบทุกไฟล์' : 'Please select a template for every file.');
      return;
    }
    assignJobToCurrentUser(selectedJob.id);

    // Add activity log for new version
    const newLog = {
      id: Math.random().toString(36).substr(2, 9),
      jobId: selectedJob.id,
      docName: replaceTargetColumn,
      timestamp: new Date().toISOString(),
      action: 'UPLOAD_NEW_VERSION',
      details: replaceIsResubmission
        ? (replaceMode === 'merge'
            ? (language === 'TH' ? `อัปโหลดไฟล์เพิ่มเติมและรวมเข้ากับชุดเดิม (${replaceUploadedFiles.length} ไฟล์)` : `Uploaded additional files and merged with the existing set (${replaceUploadedFiles.length} files)`)
            : (language === 'TH' ? `อัปโหลดไฟล์ชุดใหม่ทับชุดเดิม (${replaceUploadedFiles.length} ไฟล์)` : `Uploaded a new set of files, replacing the old set (${replaceUploadedFiles.length} files)`))
        : (language === 'TH' ? `อัปโหลดไฟล์เวอร์ชันใหม่ (${replaceUploadedFiles.length} ไฟล์)` : `Uploaded new version (${replaceUploadedFiles.length} files)`),
      version: 2,
      user: 'Kunawut W.'
    };
    setOcrLogs(prev => [newLog, ...prev]);
    
    setJobs(prev => prev.map(job => {
      if (job.id === selectedJob.id) {
        const updatedDocsMap = { ...job.docs, [replaceTargetColumn]: ComparisonDocStatus.RECEIVED };
        const newUpdatedDocsList = job.updatedDocs ? [...job.updatedDocs] : [];
        if (!newUpdatedDocsList.includes(replaceTargetColumn)) {
           newUpdatedDocsList.push(replaceTargetColumn);
        }
        
        let nextStatus = job.status;
        if (job.status === JobStatus.READY) {
          nextStatus = JobStatus.NEW;
        }

        const finalJob = {
          ...job,
          docs: updatedDocsMap,
          updatedDocs: newUpdatedDocsList,
          status: nextStatus
        };
        setSelectedJob(finalJob);

        if (replaceAutoStartOCR) {
          setTimeout(() => {
            handleOCRFiles(job.id, [replaceTargetColumn]);
          }, 300);
        }

        return finalJob;
      }
      return job;
    }));

    setShowReplaceModal(false);
    setReplaceTargetColumn(null);
    setReplaceUploadedFiles([]);
    setReplacePreviewFileId(null);
    setReplaceIsResubmission(false);
    setReplaceMode('replace');
  };

  // --- Custom Handlers for User File Upload & Grouping ---
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files) {
      appendFiles(e.dataTransfer.files);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      appendFiles(e.target.files);
    }
  };

  const appendFiles = (fileList: FileList) => {
    const allFiles = Array.from(fileList);
    const oversized = allFiles.filter(f => f.size > MAX_UPLOAD_FILE_SIZE_BYTES);
    const validFiles = allFiles.filter(f => f.size <= MAX_UPLOAD_FILE_SIZE_BYTES);
    if (oversized.length > 0) {
      alert(
        language === 'TH'
          ? `ไฟล์ต่อไปนี้มีขนาดเกิน 5MB จึงไม่ถูกอัปโหลด:\n${oversized.map(f => f.name).join('\n')}`
          : `The following files exceed 5MB and were not uploaded:\n${oversized.map(f => f.name).join('\n')}`
      );
    }
    const newFiles = validFiles.map(f => ({
      id: `local-file-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      name: f.name,
      size: f.size,
      type: f.type || 'application/pdf'
    }));
    setUploadedLocalFiles(prev => [...prev, ...newFiles]);
  };

  const handleRemoveLocalFile = (fileId: string) => {
    setUploadedLocalFiles(prev => prev.filter(f => f.id !== fileId));
    const nextSelection = new Set(selectedLocalFiles);
    nextSelection.delete(fileId);
    setSelectedLocalFiles(nextSelection);
  };

  const handleRemoveGroup = (groupId: string) => {
    const groupToRemove = sessionGroups.find(g => g.id === groupId);
    if (!groupToRemove) return;
    setUploadedLocalFiles(prev => [...prev, ...groupToRemove.files]);
    setSessionGroups(prev => prev.filter(g => g.id !== groupId));
  };

  const handleImportUploadedDocs = () => {
    if (!selectedJob) return;

    const docsToAdd: Record<string, ComparisonDocStatus> = {};
    const newlyAddedDocNames: string[] = [];

    // 1. Add all groups
    sessionGroups.forEach(g => {
      docsToAdd[g.name] = ComparisonDocStatus.RECEIVED;
      newlyAddedDocNames.push(g.name);
    });

    // 2. Add all remaining ungrouped files
    uploadedLocalFiles.forEach(f => {
      docsToAdd[f.name] = ComparisonDocStatus.RECEIVED;
      newlyAddedDocNames.push(f.name);
    });

    if (newlyAddedDocNames.length === 0) {
      alert(language === 'TH' ? 'ไม่มีเอกสารใหม่สำหรับนำเข้า' : 'No new documents to import.');
      return;
    }
    assignJobToCurrentUser(selectedJob.id);

    // 3. Update jobs & selectedJob states
    setJobs(prev => prev.map(job => {
      if (job.id === selectedJob.id) {
        const updatedDocs = { ...job.docs, ...docsToAdd };
        
        let nextStatus = job.status;
        if (job.status === JobStatus.READY) {
          nextStatus = JobStatus.NEW;
        }

        const finalJob = {
          ...job,
          docs: updatedDocs,
          totalDocs: Object.keys(updatedDocs).length,
          status: nextStatus
        };
        setSelectedJob(finalJob);

        // Auto OCR trigger
        if (autoStartOCR) {
          setTimeout(() => {
            handleOCRFiles(job.id, newlyAddedDocNames);
          }, 300);
        }

        return finalJob;
      }
      return job;
    }));

    // Reset Modal states
    setShowUploadModal(false);
    setUploadedLocalFiles([]);
    setSessionGroups([]);
    setSelectedLocalFiles(new Set());
    setGroupNameInput('');
  };

  const PAGE_SIZE = 10;

  const togglePart = (part: string) => {
    setCollapsedParts(prev => ({ ...prev, [part]: !prev[part] }));
  };

  const toggleGroup = (e: React.MouseEvent, group: string) => {
    e.stopPropagation(); // prevent toggling the parent part
    setCollapsedGroups(prev => ({ ...prev, [group]: !prev[group] }));
  };

  const hasOCRChanges = React.useMemo(() => {
    return JSON.stringify(tempOCRData) !== JSON.stringify(originalOCRData);
  }, [tempOCRData, originalOCRData]);

  const handleSaveOCR = () => {
    if (!pdfPreviewUrl || !activeSubFileId) return;
    const updates: Record<string, string> = { ...overriddenValues };
    
    // Check if any fields were actually changed to record a meaningful log
    const changedFields: { field: string; from: string; to: string }[] = [];
    Object.entries(tempOCRData).forEach(([field, value]) => {
      updates[`${activeSubFileId}_${field}`] = value as string;
      if (originalOCRData[field] !== value) {
        changedFields.push({ field, from: String(originalOCRData[field] ?? ''), to: String(value ?? '') });
      }
    });

    if (changedFields.length > 0) {
      if (selectedJob) assignJobToCurrentUser(selectedJob.id);
      const activeSubObj = getSubFilesForDoc(pdfPreviewUrl).find(s => s.id === activeSubFileId);
      const subLabel = activeSubObj ? activeSubObj.label : activeSubFileId;
      const changeSummary = changedFields
        .map(c => `${c.field} (${c.from || (language === 'TH' ? 'ว่าง' : 'empty')} → ${c.to || (language === 'TH' ? 'ว่าง' : 'empty')})`)
        .join(', ');
      const newLog = {
        id: Math.random().toString(36).substr(2, 9),
        jobId: selectedJob?.id || '',
        docName: pdfPreviewUrl,
        timestamp: new Date().toISOString(),
        action: 'EDIT_DATA',
        details: language === 'TH'
          ? `แก้ไขฟิลด์ในใบย่อย (${subLabel}): ${changeSummary}`
          : `Edited fields in sub-file (${subLabel}): ${changeSummary}`,
        version: selectedJob?.updatedDocs?.includes(pdfPreviewUrl) ? 2 : 1,
        user: 'Kunawut W.'
      };
      setOcrLogs(prev => [newLog, ...prev]);
    }

    setOverriddenValues(updates);
    setOriginalOCRData({ ...tempOCRData });
    setShowSaveToast(true);
    setTimeout(() => setShowSaveToast(false), 3000);
  };

  // The "mismatched only" filter and field selection are per-document — reset them whenever
  // the previewed document changes so they don't carry over and silently hide fields on a doc
  // that doesn't have (or doesn't need) them.
  useEffect(() => {
    setShowOnlyMismatchedFields(false);
    setSelectedFieldKey(null);
    setHoveredFieldKey(null);
  }, [pdfPreviewUrl]);

  useEffect(() => {
    if (pdfPreviewUrl && selectedJob && activeSubFileId) {
      const results = getMockComparisonResults(selectedJob);
      const initialData: Record<string, string> = {};
      results.forEach(res => {
        // First check manual edits for this specific subfile
        const overrideKey = `${activeSubFileId}_${res.fieldName}`;
        if (overriddenValues[overrideKey] !== undefined) {
          initialData[res.fieldName] = overriddenValues[overrideKey];
        } else {
          const target = res.targets.find(t => t.fileName === resolveDocNameFromPreviewUrl(pdfPreviewUrl, selectedJob?.id));
          if (target && target.status !== 'NA') {
            initialData[res.fieldName] = getSubFileFieldValue(res.fieldName, activeSubFileId, target.value);
          }
        }
      });
      setTempOCRData(initialData);
      setOriginalOCRData({ ...initialData });
      setZoomLevel(0.89);
      setRotationAngle(0);
      setPdfCurrentPage(1);
      setActiveRightTab('excel');
      setCopiedJson(false);
    }
  }, [pdfPreviewUrl, selectedJob, activeSubFileId]);

  // Move jobs state to the top
  const [jobs, setJobs] = useState<ComparisonJob[]>([
    // --- Shipment 1: CN-TH-2026-00451 (3 jobs) ---
    {
      id: 'job-001a',
      reference: 'CN-TH-2026-00451',
      expiryDate: '25 APR 2026 14:20:05',
      createdAt: '20 APR 2026',
      workflowName: 'Invoice Processing',
      assignedTeam: 'accounting',
      assignee: 'Kunawut W.',
      isLocked: true,
      status: JobStatus.READY,
      totalFieldsCount: 363,
      accuracyScore: 100.0,
      docs: {
        'Invoice': ComparisonDocStatus.LOCKED,
        'Packing List': ComparisonDocStatus.LOCKED,
        'FTA / CO': ComparisonDocStatus.LOCKED,
        'B / L': ComparisonDocStatus.LOCKED,
        'Customs Dec': ComparisonDocStatus.LOCKED,
        'Other': ComparisonDocStatus.LOCKED
      },
      progress: 100,
      totalDocs: 6,
      foundDocs: 6,
      matchedCount: 6,
      mismatchedCount: 0
    },
    {
      id: 'job-001b',
      reference: 'CN-TH-2026-00451',
      expiryDate: '26 APR 2026 12:00:00',
      createdAt: '20 APR 2026',
      workflowName: 'Maritime Freight Checking',
      assignedTeam: 'logistics',
      assignee: 'Kunawut W.',
      isLocked: true,
      status: JobStatus.READY,
      totalFieldsCount: 150,
      accuracyScore: 98.0,
      docs: {
        'Bill of Lading': ComparisonDocStatus.LOCKED,
        'Sea Waybill': ComparisonDocStatus.LOCKED,
        'Delivery Order': ComparisonDocStatus.LOCKED
      },
      progress: 100,
      totalDocs: 3,
      foundDocs: 3,
      matchedCount: 3,
      mismatchedCount: 0
    },
    {
      id: 'job-001c',
      reference: 'CN-TH-2026-00451',
      expiryDate: '27 APR 2026 17:30:00',
      createdAt: '20 APR 2026',
      workflowName: 'Customs Declaration Matching',
      assignedTeam: 'customs',
      assignee: 'Somchai T.',
      status: JobStatus.NEW,
      totalFieldsCount: 80,
      accuracyScore: 0.0,
      docs: {
        'Customs Declaration': ComparisonDocStatus.RECEIVED,
        'Tax Invoice': ComparisonDocStatus.MISSING,
        'Packing List': ComparisonDocStatus.RECEIVED
      },
      progress: 50,
      totalDocs: 3,
      foundDocs: 2,
      matchedCount: 0,
      mismatchedCount: 0
    },

    // --- Shipment 2: VN-TH-2026-00912 (3 jobs) ---
    {
      id: 'job-002a',
      reference: 'VN-TH-2026-00912',
      expiryDate: '26 APR 2026 09:15:22',
      createdAt: '21 APR 2026',
      workflowName: 'Vietnam Road Freight Rules',
      assignedTeam: 'logistics',
      assignee: 'Somchai T.',
      status: JobStatus.READY,
      isLocked: true,
      totalFieldsCount: 45,
      accuracyScore: 100.0,
      docs: {
        'Invoice': ComparisonDocStatus.LOCKED,
        'Packing List': ComparisonDocStatus.LOCKED,
        'B / L': ComparisonDocStatus.LOCKED,
        'Road Waybill': ComparisonDocStatus.LOCKED
      },
      progress: 100,
      totalDocs: 4,
      foundDocs: 4,
      matchedCount: 4,
      mismatchedCount: 0
    },
    {
      id: 'job-002b',
      reference: 'VN-TH-2026-00912',
      expiryDate: '27 APR 2026 10:00:00',
      createdAt: '21 APR 2026',
      workflowName: 'LEO Billing',
      assignedTeam: 'finance',
      assignee: 'Somchai T.',
      status: JobStatus.PROCESSING,
      totalFieldsCount: 120,
      accuracyScore: 75.0,
      docs: {
        'Billing Invoice': ComparisonDocStatus.MATCHED,
        'Receipt': ComparisonDocStatus.RECEIVED,
        'Tax Invoice': ComparisonDocStatus.RECEIVED
      },
      progress: 50,
      totalDocs: 3,
      foundDocs: 3,
      matchedCount: 1,
      mismatchedCount: 0
    },
    {
      id: 'job-002c',
      reference: 'VN-TH-2026-00912',
      expiryDate: '28 APR 2026 14:00:00',
      createdAt: '21 APR 2026',
      workflowName: 'Finance Approval',
      assignedTeam: 'finance',
      assignee: 'Alice M.',
      status: JobStatus.REVIEW,
      totalFieldsCount: 30,
      accuracyScore: 0.0,
      docs: {
        'Payment Voucher': ComparisonDocStatus.MISMATCHED,
        'Invoice': ComparisonDocStatus.MATCHED,
        'Purchase Order': ComparisonDocStatus.MATCHED
      },
      progress: 100,
      totalDocs: 3,
      foundDocs: 3,
      matchedCount: 2,
      mismatchedCount: 1
    },

    // --- Shipment 3: JP-TH-2026-00223 (4 jobs) ---
    {
      id: 'job-003a',
      reference: 'JP-TH-2026-00223',
      expiryDate: '27 APR 2026 11:45:00',
      createdAt: '22 APR 2026',
      workflowName: 'Japan Air Freight High-Value',
      assignedTeam: 'logistics',
      assignee: 'Kunawut W.',
      status: JobStatus.READY,
      isLocked: true,
      totalFieldsCount: 363,
      accuracyScore: 100.0,
      docs: {
        'INVOICE': ComparisonDocStatus.LOCKED,
        'PACKING LIST': ComparisonDocStatus.LOCKED,
        'AIR WAYBILL': ComparisonDocStatus.LOCKED
      },
      progress: 100,
      totalDocs: 3,
      foundDocs: 3,
      matchedCount: 3,
      mismatchedCount: 0
    },
    {
      id: 'job-003b',
      reference: 'JP-TH-2026-00223',
      expiryDate: '28 APR 2026 09:30:00',
      createdAt: '22 APR 2026',
      workflowName: 'HS Code Verification',
      assignedTeam: 'customs',
      assignee: 'Kunawut W.',
      status: JobStatus.REVIEW,
      totalFieldsCount: 220,
      accuracyScore: 85.0,
      docs: {
        'CONTROL SHEET': ComparisonDocStatus.OCR_DONE,
        'DRAFT FORM E': ComparisonDocStatus.RECEIVED,
        'HS CODE LIST': ComparisonDocStatus.MISMATCHED
      },
      updatedDocs: ['HS CODE LIST'],
      progress: 66,
      totalDocs: 3,
      foundDocs: 3,
      matchedCount: 1,
      mismatchedCount: 1
    },
    {
      id: 'job-003c',
      reference: 'JP-TH-2026-00223',
      expiryDate: '29 APR 2026 15:00:00',
      createdAt: '22 APR 2026',
      workflowName: 'Customs Declaration Matching',
      assignedTeam: 'customs',
      assignee: 'Somchai T.',
      status: JobStatus.PENDING,
      totalFieldsCount: 150,
      accuracyScore: 0.0,
      docs: {
        'Import Entry': ComparisonDocStatus.MISSING,
        'Duty Receipt': ComparisonDocStatus.MISSING,
        'Receipt': ComparisonDocStatus.MISSING
      },
      progress: 0,
      totalDocs: 3,
      foundDocs: 0,
      matchedCount: 0,
      mismatchedCount: 0
    },
    {
      id: 'job-003d',
      reference: 'JP-TH-2026-00223',
      expiryDate: '30 APR 2026 11:00:00',
      createdAt: '22 APR 2026',
      workflowName: 'Legal Review',
      assignedTeam: 'operation',
      assignee: 'Alice M.',
      status: JobStatus.PENDING,
      totalFieldsCount: 50,
      accuracyScore: 0.0,
      docs: {
        'Compliance Cert': ComparisonDocStatus.MISSING,
        'Review Form': ComparisonDocStatus.MISSING,
        'Legal Advice': ComparisonDocStatus.MISSING
      },
      progress: 0,
      totalDocs: 3,
      foundDocs: 0,
      matchedCount: 0,
      mismatchedCount: 0
    },

    // --- Shipment 4: KR-TH-2026-00567 (3 jobs) ---
    {
      id: 'job-004a',
      reference: 'KR-TH-2026-00567',
      expiryDate: '30 APR 2026 16:30:22',
      createdAt: '23 APR 2026',
      workflowName: 'Korea Cosmetics Processing',
      assignedTeam: 'operation',
      assignee: 'Nui P.',
      status: JobStatus.REJECTED,
      rejectionReason: 'เลขที่ CO ใน Invoice ไม่ตรงกับเอกสาร Compliance Check กรุณาตรวจสอบและแก้ไขใหม่',
      rejectedAt: '2026-04-29T09:10:00.000Z',
      rejectedBy: 'Somchai T.',
      isLocked: true,
      totalFieldsCount: 110,
      accuracyScore: 100.0,
      docs: {
        'Invoice': ComparisonDocStatus.LOCKED,
        'Packing List': ComparisonDocStatus.LOCKED,
        'CO': ComparisonDocStatus.LOCKED
      },
      progress: 100,
      totalDocs: 3,
      foundDocs: 3,
      matchedCount: 3,
      mismatchedCount: 0
    },
    {
      id: 'job-004b',
      reference: 'KR-TH-2026-00567',
      expiryDate: '01 MAY 2026 12:00:00',
      createdAt: '23 APR 2026',
      workflowName: 'Compliance Check',
      assignedTeam: 'customs',
      assignee: 'Somchai T.',
      status: JobStatus.REVIEW,
      totalFieldsCount: 95,
      accuracyScore: 84.0,
      docs: {
        'B / L': ComparisonDocStatus.MISMATCHED,
        'Insurance': ComparisonDocStatus.MISMATCHED,
        'Certificate of Origin': ComparisonDocStatus.MATCHED
      },
      progress: 100,
      totalDocs: 3,
      foundDocs: 3,
      matchedCount: 2,
      mismatchedCount: 1
    },
    {
      id: 'job-004c',
      reference: 'KR-TH-2026-00567',
      expiryDate: '02 MAY 2026 10:00:00',
      createdAt: '23 APR 2026',
      workflowName: 'Finance Approval',
      assignedTeam: 'finance',
      assignee: 'Alice M.',
      status: JobStatus.PENDING,
      totalFieldsCount: 40,
      accuracyScore: 0.0,
      docs: {
        'Invoice Draft': ComparisonDocStatus.MISSING,
        'Proforma Invoice': ComparisonDocStatus.MISSING,
        'Payment Receipt': ComparisonDocStatus.MISSING
      },
      progress: 0,
      totalDocs: 3,
      foundDocs: 0,
      matchedCount: 0,
      mismatchedCount: 0
    },

    // --- Shipment 5: TH-DE-2026-00889 (3 jobs) ---
    {
      id: 'job-005a',
      reference: 'TH-DE-2026-00889',
      expiryDate: '01 MAY 2026 10:00:15',
      createdAt: '24 APR 2026',
      workflowName: 'Export Electronics Rules',
      assignedTeam: 'customs',
      assignee: 'Alice M.',
      status: JobStatus.READY,
      isLocked: true,
      totalFieldsCount: 180,
      accuracyScore: 100.0,
      docs: {
        'Invoice': ComparisonDocStatus.LOCKED,
        'Packing List': ComparisonDocStatus.LOCKED,
        'B / L': ComparisonDocStatus.LOCKED
      },
      progress: 100,
      totalDocs: 3,
      foundDocs: 3,
      matchedCount: 3,
      mismatchedCount: 0
    },
    {
      id: 'job-005b',
      reference: 'TH-DE-2026-00889',
      expiryDate: '02 MAY 2026 11:00:00',
      createdAt: '24 APR 2026',
      workflowName: 'EU Tariff Compliance',
      assignedTeam: 'customs',
      assignee: 'Alice M.',
      status: JobStatus.READY,
      isLocked: true,
      totalFieldsCount: 130,
      accuracyScore: 100.0,
      docs: {
        'HS Code Cert': ComparisonDocStatus.LOCKED,
        'Form D': ComparisonDocStatus.LOCKED,
        'Invoice': ComparisonDocStatus.LOCKED
      },
      progress: 100,
      totalDocs: 3,
      foundDocs: 3,
      matchedCount: 3,
      mismatchedCount: 0
    },
    {
      id: 'job-005c',
      reference: 'TH-DE-2026-00889',
      expiryDate: '03 MAY 2026 14:00:00',
      createdAt: '24 APR 2026',
      workflowName: 'Purchase Order Matching',
      assignedTeam: 'accounting',
      assignee: 'Kunawut W.',
      status: JobStatus.READY,
      totalFieldsCount: 90,
      accuracyScore: 100.0,
      docs: {
        'Purchase Order': ComparisonDocStatus.LOCKED,
        'Delivery Note': ComparisonDocStatus.LOCKED,
        'Quotation': ComparisonDocStatus.LOCKED
      },
      progress: 100,
      totalDocs: 3,
      foundDocs: 3,
      matchedCount: 3,
      mismatchedCount: 0
    },

    // --- Shipment 6: SG-TH-2026-00334 (3 jobs) ---
    {
      id: 'job-006a',
      reference: 'SG-TH-2026-00334',
      expiryDate: '02 MAY 2026 13:40:44',
      createdAt: '24 APR 2026',
      workflowName: 'Invoice Processing',
      assignedTeam: 'accounting',
      assignee: 'Nui P.',
      status: JobStatus.READY,
      isLocked: true,
      totalFieldsCount: 150,
      accuracyScore: 100.0,
      docs: {
        'Invoice': ComparisonDocStatus.LOCKED,
        'Form D': ComparisonDocStatus.LOCKED,
        'Packing List': ComparisonDocStatus.LOCKED
      },
      progress: 100,
      totalDocs: 3,
      foundDocs: 3,
      matchedCount: 3,
      mismatchedCount: 0
    },
    {
      id: 'job-006b',
      reference: 'SG-TH-2026-00334',
      expiryDate: '03 MAY 2026 09:00:00',
      createdAt: '24 APR 2026',
      workflowName: 'Maritime Freight Checking',
      assignedTeam: 'logistics',
      assignee: 'Nui P.',
      status: JobStatus.READY,
      isLocked: true,
      totalFieldsCount: 110,
      accuracyScore: 100.0,
      docs: {
        'Port Release Permit': ComparisonDocStatus.LOCKED,
        'Gate Pass': ComparisonDocStatus.LOCKED,
        'Customs Dec': ComparisonDocStatus.LOCKED
      },
      progress: 100,
      totalDocs: 3,
      foundDocs: 3,
      matchedCount: 3,
      mismatchedCount: 0
    },
    {
      id: 'job-006c',
      reference: 'SG-TH-2026-00334',
      expiryDate: '04 MAY 2026 11:30:00',
      createdAt: '24 APR 2026',
      workflowName: 'Electronics Import Rules',
      assignedTeam: 'customs',
      assignee: 'Kunawut W.',
      status: JobStatus.READY,
      totalFieldsCount: 75,
      accuracyScore: 99.0,
      docs: {
        'Billing Statement': ComparisonDocStatus.LOCKED,
        'Tax Invoice': ComparisonDocStatus.LOCKED,
        'Receipt': ComparisonDocStatus.LOCKED
      },
      progress: 100,
      totalDocs: 3,
      foundDocs: 3,
      matchedCount: 3,
      mismatchedCount: 0
    },

    // --- Shipment 7: CN-TH-2026-00998 (2 jobs) ---
    {
      id: 'job-007a',
      reference: 'CN-TH-2026-00998',
      expiryDate: '05 MAY 2026 11:20:00',
      createdAt: '25 APR 2026',
      workflowName: 'Invoice Processing',
      assignedTeam: 'accounting',
      assignee: 'Somchai T.',
      status: JobStatus.READY,
      isLocked: true,
      totalFieldsCount: 220,
      accuracyScore: 100.0,
      docs: {
        'Invoice': ComparisonDocStatus.LOCKED,
        'Packing List': ComparisonDocStatus.LOCKED,
        'B/L': ComparisonDocStatus.LOCKED
      },
      progress: 100,
      totalDocs: 3,
      foundDocs: 3,
      matchedCount: 3,
      mismatchedCount: 0
    },
    {
      id: 'job-007b',
      reference: 'CN-TH-2026-00998',
      expiryDate: '06 MAY 2026 10:00:00',
      createdAt: '25 APR 2026',
      workflowName: 'Maritime Freight Checking',
      assignedTeam: 'logistics',
      assignee: 'Somchai T.',
      status: JobStatus.READY,
      isLocked: true,
      totalFieldsCount: 140,
      accuracyScore: 100.0,
      docs: {
        'Certificate of Origin': ComparisonDocStatus.LOCKED,
        'Form E': ComparisonDocStatus.LOCKED,
        'Packing List': ComparisonDocStatus.LOCKED
      },
      progress: 100,
      totalDocs: 3,
      foundDocs: 3,
      matchedCount: 3,
      mismatchedCount: 0
    },

    // --- Shipment 8: MY-TH-2026-00678 (3 jobs) ---
    {
      id: 'job-008a',
      reference: 'MY-TH-2026-00678',
      expiryDate: '07 MAY 2026 08:20:11',
      createdAt: '25 APR 2026',
      workflowName: 'Malaysia Boundary Cross',
      assignedTeam: 'logistics',
      assignee: 'Kunawut W.',
      status: JobStatus.READY,
      isLocked: true,
      totalFieldsCount: 130,
      accuracyScore: 100.0,
      docs: {
        'Invoice': ComparisonDocStatus.LOCKED,
        'B/L': ComparisonDocStatus.LOCKED,
        'Packing List': ComparisonDocStatus.LOCKED
      },
      progress: 100,
      totalDocs: 3,
      foundDocs: 3,
      matchedCount: 3,
      mismatchedCount: 0
    },
    {
      id: 'job-008b',
      reference: 'MY-TH-2026-00678',
      expiryDate: '08 MAY 2026 09:00:00',
      createdAt: '25 APR 2026',
      workflowName: 'Road Waybill Matching',
      assignedTeam: 'logistics',
      assignee: 'Kunawut W.',
      status: JobStatus.READY,
      isLocked: true,
      totalFieldsCount: 105,
      accuracyScore: 100.0,
      docs: {
        'Road Waybill': ComparisonDocStatus.LOCKED,
        'Border Crossing Permit': ComparisonDocStatus.LOCKED,
        'Customs Form': ComparisonDocStatus.LOCKED
      },
      progress: 100,
      totalDocs: 3,
      foundDocs: 3,
      matchedCount: 3,
      mismatchedCount: 0
    },
    {
      id: 'job-008c',
      reference: 'MY-TH-2026-00678',
      expiryDate: '09 MAY 2026 13:00:00',
      createdAt: '25 APR 2026',
      workflowName: 'LEO Billing',
      assignedTeam: 'finance',
      assignee: 'Kunawut W.',
      status: JobStatus.READY,
      isLocked: true,
      totalFieldsCount: 60,
      accuracyScore: 100.0,
      docs: {
        'Billing Invoice': ComparisonDocStatus.LOCKED,
        'Receipt Summary': ComparisonDocStatus.LOCKED,
        'Purchase Order': ComparisonDocStatus.LOCKED
      },
      progress: 100,
      totalDocs: 3,
      foundDocs: 3,
      matchedCount: 3,
      mismatchedCount: 0
    },

    // --- Shipment 9: UK-TH-2026-00124 (3 jobs) ---
    {
      id: 'job-009a',
      reference: 'UK-TH-2026-00124',
      expiryDate: '10 MAY 2026 14:00:00',
      createdAt: '26 APR 2026',
      workflowName: 'UK High Value Air Cargo',
      assignedTeam: 'logistics',
      assignee: 'Somchai T.',
      status: JobStatus.NEW,
      totalFieldsCount: 160,
      accuracyScore: 0.0,
      docs: {
        'Invoice': ComparisonDocStatus.RECEIVED,
        'Air Waybill': ComparisonDocStatus.RECEIVED,
        'Packing List': ComparisonDocStatus.RECEIVED
      },
      progress: 40,
      totalDocs: 3,
      foundDocs: 3,
      matchedCount: 0,
      mismatchedCount: 0
    },
    {
      id: 'job-009b',
      reference: 'UK-TH-2026-00124',
      expiryDate: '11 MAY 2026 11:00:00',
      createdAt: '26 APR 2026',
      workflowName: 'Air Waybill Checking',
      assignedTeam: 'logistics',
      assignee: 'Somchai T.',
      status: JobStatus.PENDING,
      totalFieldsCount: 110,
      accuracyScore: 0.0,
      docs: {
        'Carrier Declaration': ComparisonDocStatus.MISSING,
        'Invoice': ComparisonDocStatus.MISSING,
        'Packing List': ComparisonDocStatus.MISSING
      },
      progress: 0,
      totalDocs: 3,
      foundDocs: 0,
      matchedCount: 0,
      mismatchedCount: 0
    },
    {
      id: 'job-009c',
      reference: 'UK-TH-2026-00124',
      expiryDate: '12 MAY 2026 15:30:00',
      createdAt: '26 APR 2026',
      workflowName: 'Legal Review',
      assignedTeam: 'operation',
      assignee: 'Alice M.',
      status: JobStatus.PENDING,
      totalFieldsCount: 45,
      accuracyScore: 0.0,
      docs: {
        'Legal Permit': ComparisonDocStatus.MISSING,
        'Invoice': ComparisonDocStatus.MISSING,
        'Certificate': ComparisonDocStatus.MISSING
      },
      progress: 0,
      totalDocs: 3,
      foundDocs: 0,
      matchedCount: 0,
      mismatchedCount: 0
    },

    // --- Shipment 10: US-TH-2026-00445 (3 jobs) ---
    {
      id: 'job-010a',
      reference: 'US-TH-2026-00445',
      expiryDate: '12 MAY 2026 09:45:30',
      createdAt: '27 APR 2026',
      workflowName: 'USA Tech Import Standards',
      assignedTeam: 'customs',
      assignee: 'Somchai T.',
      status: JobStatus.REVIEW,
      totalFieldsCount: 240,
      accuracyScore: 78.5,
      docs: {
        'Commercial Invoice': ComparisonDocStatus.MISMATCHED,
        'Cert of Origin': ComparisonDocStatus.MATCHED,
        'Packing List': ComparisonDocStatus.RECEIVED
      },
      progress: 50,
      totalDocs: 3,
      foundDocs: 3,
      matchedCount: 1,
      mismatchedCount: 1
    },
    {
      id: 'job-010b',
      reference: 'US-TH-2026-00445',
      expiryDate: '13 MAY 2026 10:00:00',
      createdAt: '27 APR 2026',
      workflowName: 'Customs Bond Verification',
      assignedTeam: 'customs',
      assignee: 'Somchai T.',
      status: JobStatus.PENDING,
      totalFieldsCount: 120,
      accuracyScore: 0.0,
      docs: {
        'Customs Bond': ComparisonDocStatus.RECEIVED,
        'Invoice': ComparisonDocStatus.MISSING,
        'Packing List': ComparisonDocStatus.MISSING
      },
      progress: 50,
      totalDocs: 3,
      foundDocs: 1,
      matchedCount: 0,
      mismatchedCount: 0
    },
    {
      id: 'job-010c',
      reference: 'US-TH-2026-00445',
      expiryDate: '14 MAY 2026 14:00:00',
      createdAt: '27 APR 2026',
      workflowName: 'LEO Billing',
      assignedTeam: 'finance',
      assignee: 'Kunawut W.',
      status: JobStatus.PENDING,
      totalFieldsCount: 80,
      accuracyScore: 0.0,
      docs: {
        'Billing Sheet': ComparisonDocStatus.MISSING,
        'Invoice': ComparisonDocStatus.MISSING,
        'Receipt': ComparisonDocStatus.MISSING
      },
      progress: 0,
      totalDocs: 3,
      foundDocs: 0,
      matchedCount: 0,
      mismatchedCount: 0
    },

    // --- Shipment 11: AU-TH-2026-00223 (1 job) ---
    {
      id: 'job-011a',
      reference: 'AU-TH-2026-00223',
      expiryDate: '15 MAY 2026 11:30:00',
      createdAt: '28 APR 2026',
      workflowName: 'Australia Meat Import Control',
      assignedTeam: 'customs',
      assignee: 'Somchai T.',
      status: JobStatus.NEW,
      totalFieldsCount: 190,
      accuracyScore: 0.0,
      docs: {
        'Invoice': ComparisonDocStatus.RECEIVED,
        'Health Cert': ComparisonDocStatus.MISSING,
        'Import Permit': ComparisonDocStatus.RECEIVED
      },
      progress: 66,
      totalDocs: 3,
      foundDocs: 2,
      matchedCount: 0,
      mismatchedCount: 0
    },

    // --- Shipment 12: EU-TH-2026-00778 (2 jobs) ---
    {
      id: 'job-012a',
      reference: 'EU-TH-2026-00778',
      expiryDate: '18 MAY 2026 16:15:00',
      createdAt: '29 APR 2026',
      workflowName: 'EU Fashion & Apparel Rules',
      assignedTeam: 'customs',
      assignee: 'Somchai T.',
      status: JobStatus.NEW,
      totalFieldsCount: 310,
      accuracyScore: 0.0,
      docs: {
        'INVOICE': ComparisonDocStatus.RECEIVED,
        'PACKING LIST': ComparisonDocStatus.RECEIVED,
        'BILL OF LADING': ComparisonDocStatus.RECEIVED
      },
      progress: 30,
      totalDocs: 10,
      foundDocs: 3,
      matchedCount: 0,
      mismatchedCount: 0
    },
    {
      id: 'job-012b',
      reference: 'EU-TH-2026-00778',
      expiryDate: '19 MAY 2026 10:00:00',
      createdAt: '29 APR 2026',
      workflowName: 'Customs Declaration Matching',
      assignedTeam: 'customs',
      assignee: 'Somchai T.',
      status: JobStatus.PENDING,
      totalFieldsCount: 120,
      accuracyScore: 0.0,
      docs: {
        'Customs Dec': ComparisonDocStatus.MISSING,
        'Invoice': ComparisonDocStatus.MISSING,
        'Packing List': ComparisonDocStatus.MISSING
      },
      progress: 0,
      totalDocs: 3,
      foundDocs: 0,
      matchedCount: 0,
      mismatchedCount: 0
    },

    // --- Shipment 13: DEMO-XLSX-XML-0001 — sample job for previewing the Excel/XML
    // document mockups (see DEMO_PREVIEW_FILENAME_OVERRIDES above). Read either doc
    // then click its column header to open the preview. ---
    {
      id: 'job-demo-xlsx-xml',
      reference: 'DEMO-XLSX-XML-0001',
      expiryDate: '30 MAY 2026 16:00:00',
      createdAt: '17 AUG 2026',
      workflowName: 'Preview Format Demo (Excel/XML)',
      assignedTeam: 'operation',
      assignee: 'Somchai T.',
      status: JobStatus.NEW,
      totalFieldsCount: 26,
      accuracyScore: 0.0,
      docs: {
        'PACKING LIST': ComparisonDocStatus.RECEIVED,
        'HS CODE MASTER FILE': ComparisonDocStatus.RECEIVED
      },
      progress: 20,
      totalDocs: 2,
      foundDocs: 2,
      matchedCount: 0,
      mismatchedCount: 0
    },

    // --- Shipment 14: Combine all flow2 into 1column in flow3 — CDS shipment preset (PO/PI
    // Matching -> Shipping Doc Matching -> Import Declaration Matching#1/#2). Flow 1 done,
    // flow 2 half-uploaded, flow 3/4 not started yet. Flow 3 is pre-collapsed to just 2
    // columns ("ใบขนสินค้า" + the merged flow-2 dataset) instead of the usual 8 — see the
    // 'รวมข้อมูลทั้งหมด (Flow ก่อนหน้า)' isPrimary special-case in getMockComparisonResults. ---
    {
      id: 'job-f2c1-a',
      reference: 'Combine all flow2 into 1column in flow3',
      expiryDate: '28 AUG 2026 17:00:00',
      createdAt: '26 AUG 2026',
      workflowName: 'PO/PI Matching',
      assignedTeam: 'operation',
      assignee: 'Somchai T.',
      isLocked: true,
      status: JobStatus.READY,
      totalFieldsCount: 11,
      accuracyScore: 100.0,
      docs: {
        'PO/PI': ComparisonDocStatus.LOCKED,
        'Invoice': ComparisonDocStatus.LOCKED
      },
      progress: 100,
      totalDocs: 2,
      foundDocs: 2,
      matchedCount: 2,
      mismatchedCount: 0
    },
    {
      id: 'job-f2c1-b',
      reference: 'Combine all flow2 into 1column in flow3',
      expiryDate: '29 AUG 2026 17:00:00',
      createdAt: '26 AUG 2026',
      workflowName: 'Shipping Doc Matching',
      assignedTeam: 'operation',
      assignee: 'Somchai T.',
      status: JobStatus.PENDING,
      totalFieldsCount: 0,
      accuracyScore: 0.0,
      docs: {
        'Invoice': ComparisonDocStatus.RECEIVED,
        'Packing List': ComparisonDocStatus.RECEIVED,
        'Bill of Lading': ComparisonDocStatus.RECEIVED,
        'FREIGHT INVOICE': ComparisonDocStatus.MISSING,
        'HS Code Master File': ComparisonDocStatus.MISSING,
        'Form FTA (Draft version)': ComparisonDocStatus.MISSING
      },
      progress: 50,
      totalDocs: 6,
      foundDocs: 3,
      matchedCount: 0,
      mismatchedCount: 0
    },
    {
      id: 'job-f2c1-c',
      reference: 'Combine all flow2 into 1column in flow3',
      expiryDate: '30 AUG 2026 17:00:00',
      createdAt: '26 AUG 2026',
      workflowName: 'Import Declaration Matching#1',
      assignedTeam: 'customs',
      status: JobStatus.NEW,
      totalFieldsCount: 0,
      accuracyScore: 0.0,
      docs: {
        'ใบขนสินค้า': ComparisonDocStatus.MISSING,
        // Pre-filled: this is flow 2's already-matched dataset carried forward automatically,
        // not something flow 3 needs to re-upload or re-extract. Still OCR_DONE (not MATCHED)
        // since it's the only column present so far — nothing to compare it against yet.
        'รวมข้อมูลทั้งหมด (Flow ก่อนหน้า)': ComparisonDocStatus.OCR_DONE
      },
      progress: 50,
      totalDocs: 2,
      foundDocs: 1,
      matchedCount: 0,
      mismatchedCount: 0
    },
    {
      id: 'job-f2c1-d',
      reference: 'Combine all flow2 into 1column in flow3',
      expiryDate: '31 AUG 2026 17:00:00',
      createdAt: '26 AUG 2026',
      workflowName: 'Import Declaration Matching#2',
      assignedTeam: 'customs',
      status: JobStatus.NEW,
      totalFieldsCount: 0,
      accuracyScore: 0.0,
      docs: {
        // Carried forward: flow 3 already OCR'd this doc, so flow 4 reuses that
        // extraction instead of asking the user to upload it again. Still OCR_DONE
        // (not MATCHED) since it's the only column present until another doc arrives
        // to actually compare against.
        'Import Dec.': ComparisonDocStatus.OCR_DONE,
        'Form FTA': ComparisonDocStatus.MISSING,
        'License': ComparisonDocStatus.MISSING,
        'LPI': ComparisonDocStatus.MISSING,
        'Other': ComparisonDocStatus.MISSING
      },
      progress: 20,
      totalDocs: 5,
      foundDocs: 1,
      matchedCount: 0,
      mismatchedCount: 0
    }
  ]);

  // Jump straight into a job from a notification bell click (see Layout.tsx).
  useEffect(() => {
    if (!targetJobId) return;
    const job = jobs.find(j => j.id === targetJobId);
    if (job) {
      setSelectedJob(job);
      setStep(1);
    }
    onConsumeTargetJobId?.();
  }, [targetJobId]);


  // Sync selectedJob when jobs state updates (e.g. background processing completes)
  useEffect(() => {
    if (selectedJob) {
      const updated = jobs.find(j => j.id === selectedJob.id);
      if (updated && JSON.stringify(updated) !== JSON.stringify(selectedJob)) {
        setSelectedJob(updated);
      }
    }
  }, [jobs, selectedJob]);

  // Reset hidden locked docs and pdf preview when switching jobs
  useEffect(() => {
    setHiddenLockedDocs([]);
    setPdfPreviewUrl(null);
    setShowColumnSelector(false);
    setTableScrolledPastTop(false);
  }, [selectedJob?.id]);

  const areAllFilesLocked = React.useMemo(() => {
    if (!selectedJob) return false;
    const docStatuses = Object.values(selectedJob.docs);
    return docStatuses.length > 0 && docStatuses.every(status => status === ComparisonDocStatus.LOCKED);
  }, [selectedJob]);

  // Job actions are no longer gated by an individual "claim" — anyone on the job's
  // assigned team can manage it, so this always evaluates to false now.
  const isUnassigned = false;

  // The first team member to act on a job (upload, read file, confirm a mismatch, etc.)
  // becomes its assignee; whoever acts most recently keeps taking over "current assignee"
  // so the list always reflects who is actively working the job right now.
  const assignJobToCurrentUser = (jobId: string) => {
    setJobs(prev => prev.map(job => job.id === jobId && job.assignee !== CURRENT_USER_NAME ? { ...job, assignee: CURRENT_USER_NAME } : job));
    setSelectedJob(prev => (prev && prev.id === jobId && prev.assignee !== CURRENT_USER_NAME) ? { ...prev, assignee: CURRENT_USER_NAME } : prev);
  };

  const handleStartComparison = (jobId: string) => {
    // Set to PROCESSING status first
    const markAsProcessing = (currentJobs: ComparisonJob[]) => {
      return currentJobs.map(job => {
        if (job.id === jobId) {
          return { ...job, status: JobStatus.PROCESSING };
        }
        return job;
      });
    };

    setJobs(prev => {
      const updated = markAsProcessing(prev);
      // Immediately sync selectedJob if it's the one being processed
      if (selectedJob && selectedJob.id === jobId) {
        const matching = updated.find(j => j.id === jobId);
        if (matching) setSelectedJob(matching);
      }
      return updated;
    });

    // Simulate delay
    const delay = 3000 + Math.random() * 2000; // 3-5 seconds
    
    setTimeout(() => {
      setJobs(prev => {
        const updated = prev.map(job => {
          if (job.id === jobId) {
            const updatedDocs = { ...job.docs };
            let found = 0;
            
            Object.keys(updatedDocs).forEach(key => {
              if (updatedDocs[key] === ComparisonDocStatus.OCR_DONE) {
                const result = Math.random() > 0.3 ? ComparisonDocStatus.MATCHED : ComparisonDocStatus.MISMATCHED;
                updatedDocs[key] = result;
              }
              if (updatedDocs[key] !== ComparisonDocStatus.MISSING) {
                found++;
              }
            });

            // Calculate final counts based on doc statuses
            let matched = 0;
            let mismatched = 0;
            Object.values(updatedDocs).forEach(s => {
              if (s === ComparisonDocStatus.MATCHED || s === ComparisonDocStatus.LOCKED) matched++;
              if (s === ComparisonDocStatus.MISMATCHED) mismatched++;
            });
            
            const allDocsProcessed = Object.values(updatedDocs).every(s => s !== ComparisonDocStatus.EXTRACTING);
            let newStatus = job.status;

            if (allDocsProcessed) {
              // A mismatch needs review; a clean match goes back to PENDING — the job only
              // becomes READY once the user explicitly clicks "เสร็จสิ้น" (Done), whether or
              // not it's the last job in its shipment.
              newStatus = mismatched > 0 ? JobStatus.REVIEW : JobStatus.PENDING;
            }

            const finalJob = { 
              ...job, 
              status: newStatus,
              docs: updatedDocs,
              foundDocs: found,
              matchedCount: matched,
              mismatchedCount: mismatched,
              progress: Math.round((found / job.totalDocs) * 100)
            };
            return finalJob;
          }
          return job;
        });

        // Sync selectedJob again after completion
        if (selectedJob && selectedJob.id === jobId) {
          const matching = updated.find(j => j.id === jobId);
          if (matching) setSelectedJob(matching);
        }
        
        return updated;
      });
    }, delay);
  };

  const handleOCRFiles = (jobId: string, docNames: string[]) => {
    // Re-roll which fields show as "no compare rule" for this job on every (re)read, so
    // repeat demo runs land the blank-cell treatment on different fields each time.
    delete noRuleFieldsRef.current[jobId];
    assignJobToCurrentUser(jobId);
    // 1. Move specified docs to EXTRACTING
    setJobs(prev => prev.map(job => {
      if (job.id === jobId) {
        const updatedDocs = { ...job.docs };
        docNames.forEach(name => {
          if (updatedDocs[name] === ComparisonDocStatus.RECEIVED) {
            updatedDocs[name] = ComparisonDocStatus.EXTRACTING;
          }
        });
        const finalJob = { ...job, docs: updatedDocs };
        if (selectedJob?.id === jobId) setSelectedJob(finalJob);
        return finalJob;
      }
      return job;
    }));

    // 2. Wait 5 seconds
    setTimeout(() => {
      // Log OCR read completion for each document — who read it, and when.
      setOcrLogs(prev => [
        ...docNames.map(name => ({
          id: `log-ocr-${Date.now()}-${name}`,
          jobId,
          docName: name,
          timestamp: new Date().toISOString(),
          action: 'OCR_DONE',
          details: language === 'TH' ? 'อ่านไฟล์และดึงข้อมูลสำเร็จ' : 'Read file and extracted data successfully',
          version: 1,
          user: 'Kunawut W.'
        })),
        ...prev
      ]);

      setJobs(prev => {
        let triggerCompare = false;
        const nextJobs = prev.map(job => {
          if (job.id === jobId) {
            const updatedDocs = { ...job.docs };
            docNames.forEach(name => {
              if (updatedDocs[name] === ComparisonDocStatus.EXTRACTING) {
                updatedDocs[name] = ComparisonDocStatus.OCR_DONE;
              }
            });
            const finalJob = { ...job, docs: updatedDocs };
            
            const extractedCount = Object.values(updatedDocs).filter(s => 
              s !== ComparisonDocStatus.MISSING && 
              s !== ComparisonDocStatus.RECEIVED && 
              s !== ComparisonDocStatus.EXTRACTING && 
              s !== ComparisonDocStatus.ERROR
            ).length;
            
            const isAnyExtracting = Object.values(updatedDocs).some(s => s === ComparisonDocStatus.EXTRACTING);
            
            if (extractedCount >= 2 && !isAnyExtracting) {
               triggerCompare = true;
            }
            
            if (selectedJob?.id === jobId) setSelectedJob(finalJob);
            return finalJob;
          }
          return job;
        });

        if (triggerCompare) {
          setTimeout(() => handleStartComparison(jobId), 0);
        }

        return nextJobs;
      });
    }, 5000); // 5 seconds
  };

  const renderStatusGuide = () => {
    const guides = [
      {
        status: JobStatus.PENDING,
        color: 'bg-blue-50 border-blue-200 text-blue-700',
        label: language === 'TH' ? 'รอดำเนินการ' : 'PENDING',
        desc: language === 'TH' ? 'รายการย่อยที่เพิ่งเปิด หรือรายการย่อยถัดไปที่เพิ่งเปิดขึ้นมา — อาจมีการอัปโหลดไฟล์แล้วหรือยังไม่อัปโหลดก็ได้ แต่ยังไม่มีไฟล์ไหนถูกเปรียบเทียบข้อมูลเลย รวมถึงกรณีที่เปรียบเทียบแล้วตรงกันครบทุกไฟล์แต่ยังไม่ได้กด "เสร็จสิ้น" ก็จะกลับมาเป็นสถานะนี้เช่นกัน' : 'A sub-job that was just opened, or the next one that just became active — files may or may not be uploaded yet, but none have been compared. A sub-job whose files all matched but hasn\'t had "เสร็จสิ้น" (Done) clicked yet also shows this status.',
        action: language === 'TH' ? 'อัปโหลดไฟล์ให้ครบ แล้วกด "อ่านไฟล์" บนการ์ดเอกสารเพื่อเริ่มกระบวนการ' : 'Upload all files, then click "Read File" on doc cards to start extraction'
      },
      {
        status: JobStatus.PROCESSING,
        color: 'bg-blue-600 text-white',
        label: language === 'TH' ? 'กำลังเปรียบเทียบข้อมูล' : 'COMPARING',
        desc: language === 'TH' ? 'จังหวะที่ระบบ AI กำลังเปรียบเทียบเอกสาร เมื่อเสร็จแล้วสถานะจะเปลี่ยนไปตามผล: ถ้าพบข้อมูลไม่ตรงกัน (Mismatch) จะเป็น "รอตรวจสอบ" แต่ถ้าตรงกันครบทุกไฟล์จะกลับไปเป็น "รอดำเนินการ" (รอให้กด "เสร็จสิ้น")' : 'The system is actively comparing documents. Once finished, the status changes based on the result: any mismatch moves it to "รอตรวจสอบ" (Review); a clean match across every file goes back to "รอดำเนินการ" (Pending "เสร็จสิ้น"/Done)',
        action: language === 'TH' ? 'รอระบบทำงาน (อัปเดตสถานะอัตโนมัติเมื่อเสร็จสิ้น)' : 'Wait for system (auto-updates when finished)'
      },
      {
        status: JobStatus.REVIEW,
        color: 'bg-amber-50 border-amber-200 text-amber-700',
        label: language === 'TH' ? 'รอตรวจสอบ' : 'REVIEW',
        desc: language === 'TH' ? 'พบความไม่ตรงกันของข้อมูล (Mismatch) ที่ต้องให้ผู้ใช้ตรวจสอบ' : 'Found data mismatch requiring manual review',
        action: language === 'TH' ? 'ตรวจสอบรายการในหน้า Detail และทำการแก้ไขให้ถูกต้อง' : 'Check Matrix Grid in Detail view and correct errors'
      },
      {
        status: JobStatus.REJECTED,
        color: 'bg-rose-50 border-rose-200 text-rose-700',
        label: language === 'TH' ? 'ถูกตีกลับ' : 'REJECTED',
        desc: language === 'TH' ? 'ขั้นตอนถัดไปในชิปเมนต์เดียวกันตรวจพบปัญหา และกด "ตีกลับ" มายังรายการย่อยนี้พร้อมระบุเหตุผล ทำให้ทุกขั้นตอนถัดไปในชิปเมนต์นี้ถูกบล็อกไว้จนกว่าจะแก้ไขและดำเนินการให้เสร็จสมบูรณ์อีกครั้ง' : 'A later job in the same shipment found an issue and rejected it back to this sub-job with a reason, blocking every job after it in the shipment until this one is corrected and completed again.',
        action: language === 'TH' ? 'ตรวจสอบเหตุผลที่ถูกตีกลับ แก้ไขข้อมูล/เอกสารให้ถูกต้อง แล้วดำเนินการต่อจนสถานะเปลี่ยนเป็นเสร็จสมบูรณ์อีกครั้ง' : 'Check the rejection reason, fix the data/documents, then complete the job again'
      },
      {
        status: JobStatus.READY,
        color: 'bg-emerald-50 text-emerald-700 border-emerald-200',
        label: language === 'TH' ? 'เสร็จสมบูรณ์' : 'READY',
        desc: language === 'TH' ? 'เกิดขึ้นเมื่อกดปุ่ม "เสร็จสิ้น" เท่านั้น (ไฟล์ตรงกันครบทุกไฟล์อย่างเดียวยังไม่พอ) กดแล้วจะส่งข้อมูลต่อไปยังรายการย่อยถัดไปในชิปเมนต์ หรือถ้าเป็นรายการย่อยสุดท้าย ก็จะได้สถานะนี้เช่นกันและถือว่า shipment เสร็จสมบูรณ์แล้ว' : 'Reached only by clicking "เสร็จสิ้น" (Done) — matching files alone isn\'t enough. Clicking it hands the data off to the next sub-job in the shipment; if it\'s the last sub-job, it also becomes READY and the shipment is considered complete.',
        action: language === 'TH' ? 'ไม่ต้องดำเนินการเพิ่มเติม ปุ่มทำงานทั้งหมดของรายการนี้จะถูกล็อกเป็นแบบอ่านอย่างเดียว (Read-only)' : 'No further action needed — every action button on this job is locked to read-only'
      },
      {
        status: 'DOC_UPDATED',
        color: 'bg-blue-50 border-blue-200 text-blue-600',
        label: 'UPDATED BADGE',
        desc: language === 'TH' ? 'ไฟล์มีการอัปเดตเวอร์ชันใหม่ และเตรียมเข้าสู่กระบวนการอ่านไฟล์ใหม่' : 'File version has been updated and is ready to enter the re-reading process',
        action: language === 'TH' ? 'แสดงเฉพาะใน Modal ดูข้อมูลที่สกัดได้ (OCR) ของไฟล์เท่านั้น' : 'Only shown in the modal that displays the file\'s extracted (OCR) data'
      }
    ];

    // Per-document (DocType) status shown inside the compare table's column headers — distinct
    // from the overall job status above, which rolls all documents in the sub-job up into one.
    const docTypeGuides = [
      {
        status: ComparisonDocStatus.MATCHED,
        color: 'bg-emerald-50 border-emerald-200 text-emerald-700',
        label: language === 'TH' ? 'ตรงกัน (Matched)' : 'Matched',
        desc: language === 'TH' ? 'ได้เมื่อเปรียบเทียบกับไฟล์อื่นในรายการแล้ว ข้อมูลตรงตามเงื่อนไข (Compare Rule) ที่ตั้งค่าไว้' : 'Set once this document is compared against the others in the job and the data satisfies the configured compare rule',
        action: language === 'TH' ? 'ไม่ต้องดำเนินการเพิ่มเติม' : 'No further action needed'
      },
      {
        status: ComparisonDocStatus.MISMATCHED,
        color: 'bg-rose-50 border-rose-200 text-rose-700',
        label: language === 'TH' ? 'ไม่ตรงกัน (Unmatched)' : 'Unmatched',
        desc: language === 'TH' ? 'ได้เมื่อเปรียบเทียบแล้วรายการไม่ตรงตามเงื่อนไข (Compare Rule) ที่ตั้งค่าไว้' : 'Set once this document is compared and the data does not satisfy the configured compare rule',
        action: language === 'TH' ? 'ตรวจสอบความไม่ตรงกันในหน้า Detail แล้วแก้ไขข้อมูล หรือกดยืนยันใช้ค่านี้หากถูกต้องแล้ว' : 'Check the mismatch in the Detail view, then correct the data or confirm the value if it\'s actually correct'
      },
      {
        status: ComparisonDocStatus.OCR_DONE,
        color: 'bg-amber-50 border-amber-200 text-amber-600',
        label: language === 'TH' ? 'รอเปรียบเทียบข้อมูล' : 'Waiting for Comparison',
        desc: language === 'TH' ? 'ได้ในจังหวะหลังอ่านไฟล์ (OCR) เสร็จแล้ว แต่ยังไม่ได้เปรียบเทียบข้อมูล กำลังรอการเปรียบเทียบอยู่' : 'Set right after this document finishes OCR extraction but before it has been compared — waiting for the comparison to run',
        action: language === 'TH' ? 'รอระบบเปรียบเทียบข้อมูลอัตโนมัติ' : 'Wait for the system to run the comparison automatically'
      }
    ];

    return (
      <AnimatePresence>
        {showStatusGuide && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowStatusGuide(false)}
              className="fixed inset-0 bg-slate-900/20 backdrop-blur-sm z-[700]"
            />
            <motion.div 
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed right-0 top-0 bottom-0 w-80 bg-white shadow-2xl z-[701] border-l border-slate-200 flex flex-col"
            >
              <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                <div>
                  <h3 className="font-black text-slate-800 tracking-tight flex items-center gap-2">
                    <HelpCircle size={18} className="text-blue-600" />
                    Status Guide
                  </h3>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mt-1">คู่มือสถานะและการทำงาน</p>
                </div>
                <button 
                  onClick={() => setShowStatusGuide(false)}
                  className="w-8 h-8 rounded-[4px] hover:bg-white flex items-center justify-center text-slate-400 hover:text-rose-500 transition-all shadow-sm"
                >
                  <X size={18} />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
                {guides.map((g, i) => (
                  <div key={i} className="space-y-4">
                    <div className="flex items-center gap-4">
                      <span className={`px-4 py-1.5 rounded-2xl text-[10px] font-black uppercase tracking-tighter shadow-sm border ${g.color}`}>
                        {g.label}
                      </span>
                      <div className="flex-1 h-px bg-slate-100"></div>
                    </div>
                    <div className="px-1">
                      <h4 className="text-sm font-black text-slate-800 leading-snug mb-3">{g.desc}</h4>
                      <div className="p-4 bg-slate-50/80 rounded-2xl border border-slate-100 shadow-sm">
                        <p className="text-[11px] font-bold text-slate-500 leading-relaxed flex flex-col gap-1">
                           <span className="text-blue-600 font-black uppercase tracking-wider text-[9px] shrink-0">{language === 'TH' ? 'การดำเนินการ:' : 'Action:'}</span>
                           <span>{g.action}</span>
                        </p>
                      </div>
                    </div>
                  </div>
                ))}

                <div className="pt-2">
                  <div className="flex items-center gap-3 mb-1">
                    <FileText size={14} className="text-slate-400 shrink-0" />
                    <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest">
                      {language === 'TH' ? 'สถานะเอกสาร (Doc Type)' : 'Doc Type Status'}
                    </h3>
                  </div>
                  <p className="text-[10px] font-bold text-slate-400 leading-relaxed">
                    {language === 'TH'
                      ? 'สถานะของเอกสารแต่ละไฟล์ในตาราง Compare — ต่างจากสถานะรายการย่อยด้านบนซึ่งสรุปรวมทุกไฟล์'
                      : 'The status of each individual document in the compare table — separate from the sub-job status above, which rolls every file up into one.'}
                  </p>
                </div>

                {docTypeGuides.map((g, i) => (
                  <div key={`doctype-${i}`} className="space-y-4">
                    <div className="flex items-center gap-4">
                      <span className={`px-4 py-1.5 rounded-2xl text-[10px] font-black uppercase tracking-tighter shadow-sm border ${g.color}`}>
                        {g.label}
                      </span>
                      <div className="flex-1 h-px bg-slate-100"></div>
                    </div>
                    <div className="px-1">
                      <h4 className="text-sm font-black text-slate-800 leading-snug mb-3">{g.desc}</h4>
                      <div className="p-4 bg-slate-50/80 rounded-2xl border border-slate-100 shadow-sm">
                        <p className="text-[11px] font-bold text-slate-500 leading-relaxed flex flex-col gap-1">
                           <span className="text-blue-600 font-black uppercase tracking-wider text-[9px] shrink-0">{language === 'TH' ? 'การดำเนินการ:' : 'Action:'}</span>
                           <span>{g.action}</span>
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <div className="p-6 border-t border-slate-100 bg-slate-50/30">
                <p className="text-[10px] font-bold text-slate-400 text-center uppercase tracking-widest">BIZX DATA COMPARISON SYSTEM</p>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    );
  };

  const handleRejectFile = (fileName: string) => {
    if (!selectedJob) return;
    setJobs(prev => prev.map(job => {
      if (job.id === selectedJob.id) {
        const updatedDocs = { ...job.docs, [fileName]: ComparisonDocStatus.MISMATCHED };
        
        // Rule: Reject individual file -> Job becomes REVIEW immediately
        const finalJob = {
          ...job,
          status: JobStatus.REVIEW,
          docs: updatedDocs,
          mismatchedCount: job.mismatchedCount + 1
        };
        if (selectedJob.id === job.id) setSelectedJob(finalJob);
        return finalJob;
      }
      return job;
    }));
  };

  const handleDeleteDocColumn = (fileName: string) => {
    if (!selectedJob) return;
    setJobs(prev => prev.map(job => {
      if (job.id === selectedJob.id) {
        const updatedDocs = { ...job.docs };
        delete updatedDocs[fileName];
        
        // Check if any visible docs remain
        const remainingDocs = Object.keys(updatedDocs).filter(k => updatedDocs[k] !== ComparisonDocStatus.MISSING);
        let newStatus = job.status;
        if (remainingDocs.length === 0) {
          newStatus = JobStatus.NEW;
        }
        
        const finalJob = {
          ...job,
          status: newStatus,
          docs: updatedDocs
        };
        if (selectedJob.id === job.id) {
          setSelectedJob(finalJob);
          if (pdfPreviewUrl === fileName) {
            setPdfPreviewUrl(null);
          }
        }
        return finalJob;
      }
      return job;
    }));
  };

  // Which (field, doc) cells count as "no compare rule configured" per job — picked once and
  // cached here, re-rolled (see handleOCRFiles) whenever that job's docs get (re)read.
  const noRuleFieldsRef = useRef<Record<string, string[]>>({});
  const getNoRuleCellsForJob = (jobId: string, docNames: string[]): Set<string> => {
    if (!noRuleFieldsRef.current[jobId]) {
      const count = 2 + Math.floor(Math.random() * 2); // 2-3
      noRuleFieldsRef.current[jobId] = [
        ...pickRandomNoRuleCells(NO_RULE_CANDIDATE_FIELDS.Header, docNames, count),
        ...pickRandomNoRuleCells(NO_RULE_CANDIDATE_FIELDS.Description, docNames, count),
        ...pickRandomNoRuleCells(NO_RULE_CANDIDATE_FIELDS.Footer, docNames, count),
      ];
    }
    return new Set(noRuleFieldsRef.current[jobId]);
  };

  // Mock data generator for comparison - Logistics specific fields
  const getMockComparisonResults = (job: ComparisonJob) => {
    // Generate realistic logistics data
    const headerFields = [
      { name: 'Consignee Name', source: 'BIZ-TRANS LOGISTICS CO., LTD.', type: 'string', part: 'Header' },
      { name: 'Consignee TAX ID', source: '0105562000000', type: 'string', part: 'Header' },
      { name: 'Incoterm', source: 'FOB', type: 'string', part: 'Header' },
      { name: 'Port of Loading', source: 'SHANGHAI, CHINA', type: 'string', part: 'Header' },
      { name: 'Port of Discharge', source: 'BANGKOK, THAILAND', type: 'string', part: 'Header' },
    ];
    
    // Simulate up to 50 items for demonstration of pagination
    const descriptionFields: any[] = [];
    const TOTAL_ITEMS = 50;
    for (let i = 1; i <= TOTAL_ITEMS; i++) {
       const groupId = `Item ${i}`;
       descriptionFields.push(
         { name: 'Product Description', source: `INDUSTRIAL AUTOMATION SENSOR V${i}`, type: 'string', part: 'Description', group: groupId },
         { name: 'Item No. / Model No. (SKU)', source: `SKU-${10000 + i}`, type: 'string', part: 'Description', group: groupId },
         { name: 'Q\'ty by line', source: `${(i * 12) % 150 || 5}`, type: 'number', part: 'Description', group: groupId },
         { name: 'UOM', source: 'PCS', type: 'string', part: 'Description', group: groupId },
         { name: 'Price / Unit', source: `${(i % 50) + 10}.00`, type: 'number', part: 'Description', group: groupId },
         { name: 'Invoice Amount', source: `${((i * 12) % 150 || 5) * ((i % 50) + 10)}.00`, type: 'number', part: 'Description', group: groupId },
         { name: 'HS Code', source: `8471.30.${(i * 10) % 99}`, type: 'string', part: 'Description', group: groupId }
       );
    }
    
    const footerFields = [
      { name: 'Total Quantity', source: '450', type: 'number', part: 'Footer' },
      { name: 'Total Volume (CBM)', source: '25.50', type: 'number', part: 'Footer' },
      { name: 'Total Net Weight (KGS)', source: '1,100.00', type: 'number', part: 'Footer' },
      { name: 'Total Gross Weight (KGS)', source: '1,250.00', type: 'number', part: 'Footer' },
      { name: 'Vessel / Flight', source: 'MSC ALICIA', type: 'string', part: 'Footer' },
      { name: 'Voyage No.', source: 'V.034S', type: 'string', part: 'Footer' },
      { name: 'Country of Origin', source: 'CHINA', type: 'string', part: 'Footer' },
      { name: 'Freight Charges', source: 'PREPAID', type: 'string', part: 'Footer' },
    ];
    
    const fields = [...headerFields, ...descriptionFields, ...footerFields];

    const synonymRules: Record<string, string[]> = {
      'BIZ-TRANS LOGISTICS CO., LTD.': ['BIZ-TRANS LOGISTICS', 'BIZ-TRANS LOGISTICS (THAILAND) CO., LTD.'],
      'SHANGHAI, CHINA': ['SHANGHAI PORT', 'CN SHA'],
      'BANGKOK, THAILAND': ['BANGKOK PORT', 'TH BKK'],
    };

    return fields.map(f => {
      const docNames = Object.keys(job.docs);
      
      // Determine which docName is the primary one for this field (first matching)
      // Flow 3's collapsed "all previous flows merged" column is always the reference doc,
      // for every field — it already represents matched data from the prior flow. Checked
      // ahead of the loop below so it isn't shadowed by the index-0 fallback case.
      let primaryTargetIdx = docNames.indexOf('รวมข้อมูลทั้งหมด (Flow ก่อนหน้า)');
      for (let i = 0; primaryTargetIdx === -1 && i < docNames.length; i++) {
        const dName = docNames[i];
        let isPrimaryCandidate = false;
        if (f.part === 'Header' && (dName.toUpperCase().includes('INVOICE') || dName.toUpperCase().includes('B / L'))) {
          isPrimaryCandidate = true;
        } else if (f.part === 'Footer' && (dName.toUpperCase().includes('PACKING') || dName.toUpperCase().includes('B / L'))) {
          isPrimaryCandidate = true;
        } else if (f.part === 'Description' && (dName.toUpperCase().includes('INVOICE') || dName.toUpperCase().includes('B / L'))) {
          isPrimaryCandidate = true;
        } else if (i === 0 && !Object.keys(job.docs).some(d => d.toUpperCase().includes('INVOICE') || d.toUpperCase().includes('PACKING'))) {
          isPrimaryCandidate = true;
        }
        if (isPrimaryCandidate) {
          primaryTargetIdx = i;
          break;
        }
      }
      
      const targets = docNames.map((docName, tIdx) => {
        const docStatus = job.docs[docName];
        
        let value = f.source;
        let status: 'MATCH' | 'MISMATCH' | 'SYNONYM' | 'NA' = 'MATCH';
        let ruleTitle = '';
        let ruleDesc = '';

        // Randomly simulate N/A for certain fields in certain docs
        if ((docName === 'FTA / CO' && f.name === 'Total Quantity')) {
          status = 'NA';
          value = '-';
        } 
        else if (docName === 'Payment Voucher' && (f.part === 'Description' || f.part === 'Footer')) {
          status = 'NA';
          value = '';
        }
        // If file is received (not read yet), missing, or error
        else if (docStatus === ComparisonDocStatus.RECEIVED || docStatus === ComparisonDocStatus.MISSING || docStatus === ComparisonDocStatus.ERROR) {
          status = 'NA';
          value = '-';
        }
        else {
          // Specific overrides for demonstration
          if (job.reference === 'JP-TH-2026-00223') {
             if (f.name === 'Consignee Name' && docName === 'PACKING LIST') {
                value = 'BIZ-TRANS LOGISTICS (THAILA ND) CO., LTD.';
                status = 'SYNONYM';
                ruleTitle = 'Master lookup (ฐานข้อมูล)';
                ruleDesc = 'ข้อมูลตรงกับฐานข้อมูลคู่ค้า (Alias)';
             } else if (f.name === 'Port of Loading' && docName === 'INVOICE') { // Changed to mismatch
                value = 'CN SHG';
                status = 'MISMATCH';
             } else if (f.name === 'Port of Discharge' && docName === 'PACKING LIST') {
                value = 'BANGKOK PORT';
                status = 'SYNONYM';
                ruleTitle = 'Master lookup (ฐานข้อมูล)';
                ruleDesc = 'ตรงกับรหัสท่าเรือในระบบ';
             } else if (f.name === 'Consignee TAX ID' && docName === 'PACKING LIST') {
                status = 'MISMATCH';
                value = '010556200000X';
             }
             
             // Move line-item specific mismatches to only specific items instead of globally for this job
             if (f.part === 'Description') {
                const groupIdx = parseInt((f.group || '').replace('Item ', ''));
                // Make precisely 8 items mismatch out of 50 to match user request (42 matched, 8 mismatched)
                const mismatchedItems = [3, 7, 12, 19, 24, 31, 42, 48];
                if (mismatchedItems.includes(groupIdx)) {
                   if (f.name === 'Q\'ty by line') {
                      if (docName === 'INVOICE') { value = `MIS_${f.source}`; status = 'MISMATCH'; }
                      if (docName === 'PACKING LIST') { value = `${parseInt(f.source) + 10}`; status = 'MISMATCH'; }
                   } else if (f.name === 'Price / Unit' && docName === 'PACKING LIST') {
                      value = `ERR_${f.source}`;
                      status = 'MISMATCH';
                   } else if (f.name === 'UOM' && groupIdx === 7 && docName === 'PACKING LIST') {
                      value = 'BOX';
                      status = 'MISMATCH';
                   }
                }
             }
          }

          if (job.reference === 'KR-TH-2026-00567') {
             if (f.name === 'Consignee Name' && docName === 'Insurance') {
                value = 'BIZ-TRANS LOGISTICS';
                status = 'SYNONYM';
                ruleTitle = 'Master lookup (ฐานข้อมูล)';
                ruleDesc = 'ข้อมูลตรงกับฐานข้อมูลคู่ค้า (Alias)';
             } else if (f.name === 'Port of Loading' && docName === 'Insurance') {
                value = 'SHANGHAI PORT';
                status = 'SYNONYM';
                ruleTitle = 'Master lookup (ฐานข้อมูล)';
                ruleDesc = 'ตรงกับรหัสท่าเรือในระบบ';
             } else if (f.name === 'Port of Discharge' && docName === 'Insurance') {
                value = 'BANGKOK PORT';
                status = 'SYNONYM';
                ruleTitle = 'Master lookup (ฐานข้อมูล)';
                ruleDesc = 'ตรงกับรหัสท่าเรือในระบบ';
             } else if (f.name === 'Consignee TAX ID' && docName === 'Insurance') {
                status = 'MISMATCH';
                value = '010556200000X';
             }

             if (f.part === 'Description') {
                const groupIdx = parseInt((f.group || '').replace('Item ', ''));
                const mismatchedItems = [3, 7, 12, 19, 24, 31, 42, 48];
                if (mismatchedItems.includes(groupIdx)) {
                   if (f.name === 'Q\'ty by line') {
                      if (docName === 'Insurance') { value = `${parseInt(f.source) + 5}`; status = 'MISMATCH'; }
                   } else if (f.name === 'Price / Unit' && docName === 'Insurance') {
                      value = `ERR_${f.source}`;
                      status = 'MISMATCH';
                   } else if (f.name === 'UOM' && groupIdx === 7 && docName === 'Insurance') {
                      value = 'BOX';
                      status = 'MISMATCH';
                   }
                }
             }
          }

          if (job.reference === 'VN-TH-2026-00912') {
             if (docName === 'Payment Voucher') {
                if (f.name === 'Consignee Name') {
                   value = 'BIZ-TRANS LOGISTICS COMPANY LIMITED';
                   status = 'MISMATCH';
                } else if (f.name === 'Consignee TAX ID') {
                   value = '010556200000X';
                   status = 'MISMATCH';
                }
             }
          }
          
          if (f.part === 'Footer') {
             if (f.name === 'Total Gross Weight (KGS)' && docName.toUpperCase().includes('PACKING')) {
                value = '1,255.00';
                status = 'MISMATCH';
             } else if (f.name === 'Total Quantity' && (docName.toUpperCase().includes('FORM') || docName.toUpperCase().includes('PACKING') || docName.toUpperCase().includes('B / L'))) {
                value = '440';
                status = 'MISMATCH';
             } else if (f.name === 'Total Volume (CBM)' && (docName.toUpperCase().includes('INVOICE') || docName.toUpperCase().includes('PACKING'))) {
                value = '25.00';
                status = 'MISMATCH';
             } else if (f.name === 'Vessel / Flight' && (docName.toUpperCase().includes('FORM') || docName.toUpperCase().includes('B / L') || docName.toUpperCase().includes('WAYBILL'))) {
                value = 'MSC ALICIA V.2';
                status = 'SYNONYM';
                ruleTitle = 'เปรียบเทียบตามเงื่อนไข (CONDITIONAL)';
                ruleDesc = 'ละเว้นคำนำหน้าชื่อเรือ (Prefix)';
             } else if (f.name === 'Country of Origin' && (docName.toUpperCase().includes('FORM') || docName.toUpperCase().includes('CO') || docName.toUpperCase().includes('CERT') || docName.toUpperCase().includes('FTA') || docName.toUpperCase().includes('B / L'))) {
                value = 'PRC';
                status = 'SYNONYM';
                ruleTitle = 'Master lookup (ฐานข้อมูล)';
                ruleDesc = 'ชื่อประเทศตรงกับรหัส PRC (China)';
             } else if (f.name === 'Freight Charges' && docName.toUpperCase().includes('INVOICE')) {
                value = 'COLLECT';
                status = 'MISMATCH';
             }
          }

          if (job.reference === 'SG-TH-2025-00334') {
             if (f.name === 'Consignee Name' && docName === 'Form D') {
                value = 'BIZ-TRANS LOGISTICS';
                status = 'SYNONYM';
                ruleTitle = 'Master lookup (ฐานข้อมูล)';
                ruleDesc = 'ข้อมูลตรงกับฐานข้อมูลคู่ค้า (Alias)';
             } else if (f.name === 'Port of Loading' && docName === 'Form D') {
                value = 'CN SHA';
                status = 'SYNONYM';
                ruleTitle = 'Master lookup (ฐานข้อมูล)';
                ruleDesc = 'รหัสตรงกับเมือง SHANGHAI';
             } else if (f.name === 'Port of Discharge' && docName === 'Form D') {
                value = 'TH BKK';
                status = 'SYNONYM';
                ruleTitle = 'Master lookup (ฐานข้อมูล)';
                ruleDesc = 'รหัสตรงกับเมือง BANGKOK';
             }
          }

          // Simulate Synonym match for others if not already set by specific overrides
          if (status === 'MATCH') {
            Object.entries(synonymRules).forEach(([master, syns]) => {
              if (f.source === master && tIdx % 2 === 1) {
                value = syns[Math.floor(Math.random() * syns.length)];
                status = 'SYNONYM';
                ruleTitle = 'Master lookup (ฐานข้อมูล)';
                ruleDesc = 'คำพ้องความหมายในระบบ';
              }
            });
          }

          // Fallback simulation for custom files if not already set by specific overrides
          if (status === 'MATCH') {
            const docUpper = docName.toUpperCase();
            if (docUpper.includes('INV') || docUpper.includes('INVOICE') || docUpper.includes('กลุ่ม')) {
              if (f.name === 'Incoterm' && tIdx % 2 === 1) {
                value = 'CIF';
                status = 'MISMATCH';
              } else if (f.name === 'Consignee Name' && tIdx % 2 === 1) {
                value = 'BIZ-TRANS LOGISTICS (THAILAND) CO., LTD.';
                status = 'SYNONYM';
                ruleTitle = 'Master lookup (ฐานข้อมูล)';
                ruleDesc = 'ข้อมูลตรงกับฐานข้อมูลคู่ค้า (Alias)';
              }
            } else if (docUpper.includes('BL') || docUpper.includes('B / L') || docUpper.includes('B/L') || docUpper.includes('LADING') || docUpper.includes('WAYBILL')) {
              if (f.name === 'Total Quantity') {
                value = '440';
                status = 'MISMATCH';
              } else if (f.name === 'Vessel / Flight' && tIdx % 2 === 1) {
                value = 'MSC ALICIA V.2';
                status = 'SYNONYM';
                ruleTitle = 'เปรียบเทียบตามเงื่อนไข (CONDITIONAL)';
                ruleDesc = 'ละเว้นคำนำหน้าชื่อเรือ (Prefix)';
              }
            }
          }

          // Force mismatch if doc status says so
          if (status === 'MATCH' && docStatus === ComparisonDocStatus.MISMATCHED && f.part !== 'Description') {
            // Only mismatch for first few fields to avoid overwhelming
            if (fields.indexOf(f) < 2) {
               value = `MIS_${f.source}`;
               status = 'MISMATCH';
            }
          }

          // Simulate Mismatch for rejected files
          if (status === 'MATCH' && !['Incoterm'].includes(f.name) && f.part !== 'Description' && f.part !== 'Footer' && (job.id === 'job-002' && f.name.includes('Weight') && docName === 'B / L')) {
            value = `ERR_${f.source}`;
            status = 'MISMATCH';
          }
        }

        // Apply manual overrides if any
        const overrideKey = `${docName}_${f.name}`;
        if (overriddenValues[overrideKey]) {
          value = overriddenValues[overrideKey];
          // Recalculate status based on manual entry vs master
          if (value === f.source) {
            status = 'MATCH';
          } else {
             // Check if it's a synonym
             const syns = synonymRules[f.source] || [];
             if (syns.includes(value)) {
               status = 'SYNONYM';
               ruleTitle = 'เปรียบเทียบตามเงื่อนไข (CONDITIONAL)';
               ruleDesc = 'ตรงกับเงื่อนไขที่ผู้ใช้ระบุ (Manual Accepted)';
             } else {
               status = 'MISMATCH';
             }
          }
        }

        // Check if user has manually confirmed/approved this mismatched value
        const confirmedKey = `${job.id}_${docName}_${f.name}`;
        if (status === 'MISMATCH' && confirmedMismatches[confirmedKey]) {
          status = 'MATCH';
          ruleTitle = language === 'TH' ? 'ผ่านการตรวจสอบแล้ว' : 'Verified';
          ruleDesc = language === 'TH' ? 'ยืนยันความถูกต้องของข้อมูลแล้ว' : 'Manually verified and confirmed';
        }

        // Rule: If document is MATCHED or LOCKED, it should not show mismatches
        if ((docStatus === ComparisonDocStatus.MATCHED || docStatus === ComparisonDocStatus.LOCKED) && status === 'MISMATCH') {
          status = 'MATCH';
          value = f.source;
        }

        const isPrimary = (tIdx === primaryTargetIdx);

        if (isPrimary) {
          value = f.source;
          status = 'MATCH';
          ruleTitle = '';
          ruleDesc = '';
        }

        return {
          fileId: `target-${tIdx + 1}`,
          fileName: docName,
          value,
          status,
          ruleTitle,
          ruleDesc,
          isPrimary
        };
      });

      return {
        fieldName: f.name,
        sourceValue: f.source,
        part: f.part,
        group: f.group,
        targets
      };
    });
  };

  const getEffectiveDocStatus = (job: ComparisonJob, docName: string, originalStatus: ComparisonDocStatus) => {
    if (originalStatus === ComparisonDocStatus.MATCHED || originalStatus === ComparisonDocStatus.MISMATCHED) {
      // Check if there are any actual MISMATCH targets for this docName in this job
      const baseResults = getMockComparisonResults(job);
      const hasMismatch = baseResults.some(res => 
        res.targets.some(t => {
          if (t.fileName !== docName) return false;
          let status = t.status;
          const confirmedKey = `${job.id}_${docName}_${res.fieldName}`;
          if (status === 'MISMATCH' && confirmedMismatches[confirmedKey]) {
            status = 'MATCH';
          }
          return status === 'MISMATCH';
        })
      );
      return hasMismatch ? ComparisonDocStatus.MISMATCHED : ComparisonDocStatus.MATCHED;
    }
    return originalStatus;
  };

  const getJobStatus = (job: ComparisonJob): JobStatus => {
    // A rejected job stays REJECTED until the reviewer redoes and re-completes it — don't let
    // the doc-derived status below (which may already read READY/REVIEW again) mask that.
    if (job.status === JobStatus.REJECTED) return JobStatus.REJECTED;
    // READY is only ever set explicitly (clicking "เสร็จสิ้น"/Done) — sticky once reached,
    // regardless of doc state, since it's a terminal/locked status.
    if (job.status === JobStatus.READY) return JobStatus.READY;
    // A manual re-compare sets job.status to PROCESSING directly, without necessarily putting
    // any individual doc into EXTRACTING — reflect that immediately rather than falling through
    // to the doc-derived status below, which would otherwise still show the stale REVIEW/READY
    // verdict from before the re-compare was requested.
    if (job.status === JobStatus.PROCESSING) return JobStatus.PROCESSING;
    const docs = Object.entries(job.docs).map(([docName, s]) =>
      getEffectiveDocStatus(job, docName, s)
    );
    if (docs.some(s => s === ComparisonDocStatus.EXTRACTING)) return JobStatus.PROCESSING;
    if (docs.some(s => s === ComparisonDocStatus.MISMATCHED)) return JobStatus.REVIEW;
    // Everything else — no files uploaded, files uploaded but not all, or every doc already
    // matched but "เสร็จสิ้น" (Done) hasn't been clicked yet — reads as PENDING.
    return JobStatus.PENDING;
  };

  const areAllFilesMatched = React.useMemo(() => {
    if (!selectedJob) return false;
    const results = getMockComparisonResults(selectedJob);
    return results.every(r => r.targets.every(t => (t.status as string) === 'MATCH' || (t.status as string) === 'SYNONYM' || (t.status as string) === 'NA'));
  }, [selectedJob, overriddenValues, confirmedMismatches]); // added overriddenValues and confirmedMismatches

  // Keeps job.status in sync with the live-computed status (e.g. resolving the last mismatch
  // flips REVIEW back to PENDING) so other views reading the raw field stay consistent. READY
  // itself is never written here — it's sticky and only ever set by the "เสร็จสิ้น" (Done) flow.
  useEffect(() => {
    if (selectedJob) {
      const currentStatus = getJobStatus(selectedJob);
      if (selectedJob.status !== currentStatus) {
        setJobs(prev => prev.map(job => job.id === selectedJob.id ? { ...job, status: currentStatus } : job));
      }
    }
  }, [selectedJob?.id, confirmedMismatches, overriddenValues]);

  const isAllDocsMatched = (job: ComparisonJob) => {
    return Object.entries(job.docs).every(([docName, status]) => {
      const s = getEffectiveDocStatus(job, docName, status);
      return s === ComparisonDocStatus.MATCHED || s === ComparisonDocStatus.LOCKED;
    });
  };

  const isLastSubItemWithAllDocsMatched = (job: ComparisonJob) => {
    if (!job) return false;
    const shipmentJobs = jobs.filter(j => j.reference === job.reference);
    if (shipmentJobs.length === 0) return false;
    const seqIndex = shipmentJobs.findIndex(j => j.id === job.id);
    const isLastJob = seqIndex === shipmentJobs.length - 1;
    return isLastJob && isAllDocsMatched(job);
  };

  // Rejecting only makes sense from the second job in a shipment onward — there's no earlier
  // step to kick a first job back to.
  const canRejectToPreviousJob = (job: ComparisonJob) => {
    if (!job) return false;
    const shipmentJobs = jobs.filter(j => j.reference === job.reference);
    if (shipmentJobs.length === 0) return false;
    const seqIndex = shipmentJobs.findIndex(j => j.id === job.id);
    return seqIndex > 0;
  };

  const getPreviousJobInShipment = (job: ComparisonJob): ComparisonJob | null => {
    if (!job) return null;
    const shipmentJobs = jobs.filter(j => j.reference === job.reference);
    const seqIndex = shipmentJobs.findIndex(j => j.id === job.id);
    return seqIndex > 0 ? shipmentJobs[seqIndex - 1] : null;
  };

  const getLastSubItemExportTooltip = (job: ComparisonJob, defaultText: string) => {
    if (!isLastSubItemWithAllDocsMatched(job)) {
      return defaultText;
    }
    return (
      <div className="flex flex-col gap-1 p-0.5 text-left min-w-[220px]">
        <div className="font-black text-emerald-400 text-[11px] uppercase tracking-wider flex items-center gap-1">
          <CheckCircle2 size={12} />
          <span>{language === 'TH' ? 'รายการย่อยสุดท้าย' : 'Last Sub-Job'}</span>
        </div>
        <div className="text-white font-bold text-[10px] leading-relaxed">
          {language === 'TH'
            ? 'จับคู่สำเร็จครบทุกไฟล์แล้ว กดเพื่อทำเครื่องหมายว่ารายการย่อยนี้ (และ shipment นี้) เสร็จสมบูรณ์'
            : 'All documents matched successfully. Click to mark this job — and the shipment — complete.'}
        </div>
      </div>
    );
  };

  const renderPendingInbox = () => {
    const filterItems = ['All', 'Email', 'Doc type'];
    
    // Sort logic (mocked sequence is already as per created_at)
    const filteredItems = pendingInboxItems.filter(item => 
      pendingFilter === 'All' || item.type === pendingFilter
    );

    const activeItem = filteredItems.find(i => i.id === selectedPendingId) || (selectedPendingId === null ? filteredItems[0] : null);

    return (
      <div className="flex bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm h-[560px] animate-in fade-in duration-700 font-sans">
        {/* Left Panel: List */}
        <div className="w-[340px] border-r border-slate-100 flex flex-col bg-slate-50/30">
          <div className="p-5 pb-3">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-black text-[#010136] tracking-tight flex items-center gap-2 font-sans">
                <Inbox size={18} className="text-[#1f5df9]" />
                {language === 'TH' ? 'รายการรอรีวิว' : 'PENDING INBOX'} <span className="text-slate-500 font-bold ml-0.5 font-sans">({pendingInboxItems.length})</span>
              </h2>
            </div>
            
            <div className="flex flex-wrap gap-2 mb-5">
              {(['All', 'Email', 'Doc type'] as const).map(f => (
                <button 
                  key={f}
                  className={`px-4 py-2 rounded-[4px] font-bold uppercase tracking-wider text-[10px] transition-all border font-sans ${
                    pendingFilter === f 
                      ? 'bg-[#1f5df9] text-white border-[#1f5df9] shadow-md shadow-blue-200' 
                      : 'bg-white text-slate-500 border-slate-200 hover:border-blue-300 hover:text-[#1f5df9]'
                  }`}
                  onClick={() => setPendingFilter(f)}
                >
                  {f === 'Doc type' ? (language === 'TH' ? 'ประเภทเอกสาร' : 'Doc type') : f === 'Email' ? (language === 'TH' ? 'อีเมล' : 'Email') : (language === 'TH' ? 'ทั้งหมด' : 'All')}
                </button>
              ))}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto px-1 space-y-2 pb-6">
            {filteredItems.length > 0 ? (
              filteredItems.map((item) => (
                <div 
                  key={item.id}
                  className={`mx-3 px-5 py-[18px] cursor-pointer transition-all relative border-l-[3px] rounded-r-2xl ${
                    selectedPendingId === item.id || (!selectedPendingId && filteredItems[0]?.id === item.id)
                      ? 'bg-white border-[#1f5df9] shadow-[0_4px_12px_rgba(0,0,0,0.05)] z-10' 
                      : 'bg-transparent border-transparent hover:bg-white/60 hover:shadow-sm'
                  }`}
                  onClick={() => {
                    setSelectedPendingId(item.id);
                    setReadPendingIds(prev => new Set([...prev, item.id]));
                  }}
                >
                  <div className="flex items-center gap-2 mb-2">
                    {!readPendingIds.has(item.id) && (
                      <div className="w-2.5 h-2.5 rounded-full bg-[#1f5df9] shadow-[0_0_8px_rgba(4,99,239,0.4)]"></div>
                    )}
                    <Tag 
                      variant="filled" 
                      className={`text-[8px] font-black uppercase tracking-tighter px-2 py-0.5 rounded-md m-0 border-none font-sans ${
                        item.typeBadge === 'Email review' ? 'bg-blue-50 text-[#1f5df9]' : 'bg-indigo-50 text-indigo-600'
                      }`}
                    >
                      {item.typeBadge}
                    </Tag>
                    <span className="text-[10px] text-slate-400 font-bold ml-auto font-sans">{item.time}</span>
                  </div>
                  <h3 className={`font-black text-[12px] tracking-tight mb-1 truncate font-sans ${
                    !readPendingIds.has(item.id) ? 'text-[#010136]' : 'text-slate-500 font-medium'
                  }`}>
                    {item.title}
                  </h3>
                  <div className="text-[10px] text-slate-400 font-bold tracking-tight truncate font-sans uppercase">
                    {item.sub}
                  </div>
                </div>
              ))
            ) : (
                <div className="py-20 px-8 flex flex-col items-center justify-center text-center">
                    <Inbox className="text-slate-200 mb-4" size={40} />
                    <h4 className="font-black text-slate-800 tracking-tight mb-2 uppercase text-[10px]">ไม่มีงานค้าง</h4>
                </div>
            )}
          </div>
        </div>

        {/* Right Panel: Detail View */}
        <div className="flex-1 bg-white overflow-y-auto">
          {activeItem ? (
            <div className="flex flex-col h-full animate-in fade-in slide-in-from-right-4 duration-500">
              {/* Header */}
              <div className="px-8 py-7 border-b border-slate-100 flex items-center justify-between sticky top-0 bg-white z-20">
                <div className="min-w-0">
                  <div className="flex items-center gap-3 mb-2">
                    <Tag variant="filled" className="bg-[#1f5df9] text-white font-black text-[9px] uppercase tracking-widest rounded-md border-none px-2 py-0.5 font-sans">
                      {activeItem.typeBadge}
                    </Tag>
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.15em] font-sans">{activeItem.workflow}</span>
                  </div>
                  <h2 className="text-xl font-black text-[#010136] tracking-tight truncate font-sans">
                    {activeItem.title}
                  </h2>
                </div>
                <div className="flex gap-3 shrink-0">
                  <button 
                    className="h-10 px-8 font-black text-[11px] uppercase tracking-widest bg-[#0ab16b] border-none text-white rounded-[4px] hover:bg-[#14d886] hover:text-white hover:scale-[1.05] hover:shadow-[0_4px_15px_rgba(20,216,134,0.45)] active:scale-[0.96] transition-all duration-300 font-sans cursor-pointer flex items-center justify-center"
                    onClick={() => handleApprovePending(activeItem.id)}
                  >
                    {language === 'TH' ? 'อนุมัติ' : 'APPROVE'}
                  </button>
                </div>
              </div>

              {/* Content Sections */}
              <div className="p-8 space-y-10">
                {activeItem.type === 'Email' ? (
                  <>
                {/* Details Section */}
                <div>
                  <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mb-7 border-b border-slate-100 pb-3 font-sans">
                    EMAIL DETAILS
                  </h3>
                  
                  <div className="space-y-6 px-4">
                        <div className="flex items-center">
                          <span className="w-32 text-[11px] font-black text-slate-400 uppercase tracking-widest font-sans">FROM</span>
                          <span className="text-[13px] font-black text-[#010136] font-sans">{activeItem.sender}</span>
                        </div>
                        <div className="flex items-center">
                          <span className="w-32 text-[11px] font-black text-slate-400 uppercase tracking-widest font-sans">TO</span>
                          <span className="text-[13px] font-black text-[#010136] font-sans">{activeItem.to}</span>
                        </div>
                        <div className="flex items-center">
                          <span className="w-32 text-[11px] font-black text-slate-400 uppercase tracking-widest font-sans">SUBJECT</span>
                          <span className="text-[13px] font-black text-[#1f5df9] font-sans">{activeItem.subject}</span>
                        </div>
                        <div className="flex items-start bg-slate-50/60 p-6 rounded-3xl mt-6 border border-slate-100">
                          <span className="w-32 text-[11px] font-black text-slate-400 uppercase tracking-widest mt-1.5 font-sans shrink-0">BODY</span>
                          <p className="flex-1 text-[13px] font-medium text-slate-600 leading-relaxed italic font-sans max-w-2xl">
                            "{activeItem.body}"
                          </p>
                        </div>
                        <div className="flex pt-6 items-center">
                          <span className="w-32 text-[11px] font-black text-slate-400 uppercase tracking-widest font-sans">ATTACHMENTS</span>
                          <div className="flex flex-wrap gap-2.5">
                            {activeItem.attachments?.map(file => (
                              <Tag 
                                key={file} 
                                variant="filled" 
                                onClick={() => {
                                  const matchedJob = jobs.find(j => j.reference === (activeItem.jobNo || 'LEO-2025-0041')) || {
                                    id: activeItem.jobNo || 'job-temp',
                                    reference: activeItem.jobNo || 'LEO-2025-0041',
                                    expiryDate: '10 JUN 2026 18:00:00',
                                    createdAt: '04 JUN 2026',
                                    workflowName: activeItem.workflow || 'LEO Billing',
                                    assignee: 'Kunawut W.',
                                    status: JobStatus.READY,
                                    docs: {
                                      [file]: ComparisonDocStatus.MATCHED,
                                      'Packing List': ComparisonDocStatus.MATCHED,
                                      'B / L': ComparisonDocStatus.MATCHED,
                                    },
                                    progress: 100,
                                    totalDocs: 3,
                                    foundDocs: 3,
                                    matchedCount: 3,
                                    mismatchedCount: 0
                                  };
                                  setSelectedJob(matchedJob);
                                  setPdfPreviewUrl(file);
                                }}
                                className="bg-white border border-slate-200 rounded-xl py-1.5 px-4 text-[11px] font-black text-[#1f5df9] flex items-center gap-2.5 hover:border-blue-300 hover:shadow-sm transition-all cursor-pointer font-sans"
                              >
                                <FileIcon size={16} className="text-slate-400" />
                                {file}
                              </Tag>
                            ))}
                          </div>
                        </div>
                  </div>
                </div>

                {/* AI Analysis Section */}
                <div className="bg-[#f0f7ff] border border-blue-100 rounded-[32px] p-8 relative overflow-hidden group">
                  <div className="absolute -top-10 -right-10 p-4 opacity-[0.03] text-[#1f5df9]">
                    <Bot size={140} />
                  </div>
                  <div className="flex items-center justify-between mb-5">
                    <h3 className="text-[10px] font-black text-[#1f5df9] uppercase tracking-[0.25em] flex items-center gap-3 font-sans">
                      <div className="w-8 h-8 rounded-full bg-white shadow-sm flex items-center justify-center">
                        <Bot size={16} />
                      </div>
                      AI ANALYSIS
                    </h3>
                    <div className="bg-white px-3 py-1 rounded-full text-[#1f5df9] font-black text-[10px] tracking-widest shadow-sm font-sans border border-blue-50">
                      {activeItem.aiConfidence}% CONFIDENCE
                    </div>
                  </div>
                  <p className="text-[13px] font-medium text-slate-700 leading-relaxed max-w-3xl relative z-10 font-sans">
                    {activeItem.aiReasoning}
                  </p>
                </div>
                  </>
                ) : (
                  <div className="space-y-10">
                    <div className="bg-slate-50 border border-slate-100 rounded-3xl p-8 flex flex-col gap-6">
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="flex items-center gap-3 mb-2">
                             <FileSpreadsheet size={24} className="text-[#1f5df9]" />
                             <h3 className="text-lg font-black text-[#010136] tracking-tight font-sans break-all">{activeItem.title}</h3>
                          </div>
                          <p className="text-[12px] font-bold text-slate-500 font-sans ml-9 flex items-center gap-2">
                            <span>{activeItem.fileSize || '1.2 MB'}</span>
                            <span className="w-1 h-1 rounded-full bg-slate-300"></span>
                            <span>{language === 'TH' ? 'ในรายการงาน:' : 'Job:'} {activeItem.jobNo}</span>
                          </p>
                        </div>
                        <Button 
                          type="default"
                          icon={<ScanEye size={15} className="text-[#1f5df9]" />}
                          onClick={() => {
                            const matchedJob = jobs.find(j => j.reference === activeItem.jobNo) || {
                              id: activeItem.jobNo || 'job-temp',
                              reference: activeItem.jobNo || 'LEO-2025-0041',
                              expiryDate: '10 JUN 2026 18:00:00',
                              createdAt: '04 JUN 2026',
                              workflowName: activeItem.workflow || 'LEO Billing',
                              assignee: 'Kunawut W.',
                              status: JobStatus.READY,
                              docs: {
                                [activeItem.title]: ComparisonDocStatus.MATCHED,
                                'Packing List': ComparisonDocStatus.MATCHED,
                                'B / L': ComparisonDocStatus.MATCHED,
                              },
                              progress: 100,
                              totalDocs: 3,
                              foundDocs: 3,
                              matchedCount: 3,
                              mismatchedCount: 0
                            };
                            setSelectedJob(matchedJob);
                            setPdfPreviewUrl(activeItem.title);
                          }}
                          className="font-bold border-[#1f5df9] text-[#1f5df9] hover:bg-blue-50/50 shadow-2xs font-sans h-9"
                          style={{ borderRadius: '4px' }}
                        >
                          {language === 'TH' ? 'ดูไฟล์' : 'View File'}
                        </Button>
                      </div>

                      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-[0_4px_20px_rgba(0,0,0,0.03)] border-l-4 border-l-[#1f5df9]">
                         <div className="flex items-center justify-between mb-4">
                           <div className="flex items-center gap-2">
                             <div className="w-7 h-7 rounded-full bg-blue-50 flex items-center justify-center text-[#1f5df9]">
                               <Bot size={14} />
                             </div>
                             <span className="text-[11px] font-black text-slate-600 uppercase tracking-widest flex items-center gap-2 font-sans">
                               {language === 'TH' ? 'AI แนะนำประเภทเอกสาร:' : 'AI Suggests:'}
                               <span className="bg-[#1f5df9] text-white px-2 py-0.5 rounded font-black text-[10px] tracking-wider ml-1">{activeItem.aiSuggestedType || 'UNKNOWN'}</span>
                             </span>
                           </div>
                           <Tag className="m-0 bg-blue-50 border-blue-100 text-[#1f5df9] font-black text-[10px] px-3 py-1 flex items-center gap-1.5 font-sans">
                             {activeItem.aiConfidence}% {language === 'TH' ? 'มั่นใจ' : 'CONFIDENCE'}
                           </Tag>
                         </div>
                         <p className="text-[12px] text-slate-500 font-medium italic border-t border-slate-100 pt-3 mt-1 pl-1 font-sans">
                           "{activeItem.aiReasoning}"
                         </p>
                      </div>
                    </div>

                    <div>
                      <h3 className="text-[11px] font-black text-slate-800 uppercase tracking-widest mb-4 font-sans px-2 flex items-center justify-between">
                         {language === 'TH' ? 'ยืนยันหรือเลือกประเภทเอกสารที่ถูกต้อง' : 'Confirm or Select Correct Document Type'}
                         {pendingDocTypeSelections[activeItem.id] && (
                           <span className="text-[10px] text-slate-400 normal-case font-medium">{language === 'TH' ? 'กรุณากด Approve เพื่อยืนยัน' : 'Click Approve to confirm'}</span>
                         )}
                      </h3>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                         {AVAILABLE_DOC_TYPES.map(type => {
                           const isAiSuggested = activeItem.aiSuggestedType === type;
                           const isSelected = pendingDocTypeSelections[activeItem.id] === type || (!pendingDocTypeSelections[activeItem.id] && isAiSuggested);
                           
                           return (
                             <button
                               key={type}
                               onClick={() => setPendingDocTypeSelections(prev => ({ ...prev, [activeItem.id]: type }))}
                               className={`p-4 rounded-[4px] border text-left flex flex-col items-start gap-2 transition-all font-sans relative overflow-hidden group ${
                                 isSelected 
                                 ? 'border-[#1f5df9] bg-white shadow-[0_4px_12px_rgba(4,99,239,0.1)] ring-1 ring-[#1f5df9]' 
                                 : 'border-slate-200 bg-white hover:border-blue-300 hover:bg-slate-50/50'
                               }`}
                             >
                               <div className="flex items-center justify-between w-full">
                                 <span className={`text-[12px] font-black uppercase tracking-widest line-clamp-1 ${isSelected ? 'text-[#1f5df9]' : 'text-slate-600 group-hover:text-slate-900'}`}>
                                   {type}
                                 </span>
                                 {isSelected && (
                                   <CheckCircle2 size={16} className="text-[#1f5df9] shrink-0" />
                                 )}
                               </div>
                               {isAiSuggested && !isSelected && (
                                 <span className="text-[9px] font-black text-amber-500 bg-amber-50 px-1.5 py-0.5 rounded leading-none">AI SUGGESTED</span>
                               )}
                               {isSelected && isAiSuggested && (
                                 <span className="text-[9px] font-black text-[#1f5df9] bg-blue-50 px-1.5 py-0.5 rounded leading-none flex items-center gap-1"><Bot size={10} /> AI SUGGESTED</span>
                               )}
                             </button>
                           );
                         })}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="h-full flex items-center justify-center p-12 text-center">
                <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest">Select an item to review</p>
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderActivityLogs = () => {
    const filteredLogs = activityLogs.filter(log => {
      if (logFilter === 'ALL') return true;
      if (logFilter === 'JOB') return log.details.toLowerCase().includes('job');
      if (logFilter === 'PENDING') return log.details.toLowerCase().includes('email') || log.details.toLowerCase().includes('reject') || log.details.toLowerCase().includes('approve');
      return true;
    });

    return (
      <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm h-[640px] flex flex-col animate-in fade-in duration-700 font-sans">
        <div className="p-6 border-b border-slate-100 bg-slate-50/30 flex items-center justify-between">
          <h2 className="text-sm font-black text-[#010136] tracking-tight flex items-center gap-3">
            <Clock size={18} className="text-[#1f5df9]" />
            {language === 'TH' ? 'บันทึกประวัติ' : 'ACTIVITY LOGS'}
          </h2>
          <div className="flex bg-white p-1.5 rounded-xl border border-slate-200 shadow-sm">
            {(['ALL', 'JOB', 'PENDING'] as const).map(f => (
              <button
                key={f}
                className={`px-4 py-2 rounded-[4px] font-black uppercase tracking-widest text-[11px] transition-all font-sans ${
                  logFilter === f 
                    ? 'bg-[#1f5df9] text-white shadow-md shadow-blue-200' 
                    : 'text-slate-500 hover:text-[#1f5df9] hover:bg-blue-50/50'
                }`}
                onClick={() => setLogFilter(f)}
              >
                {f === 'ALL' ? (language === 'TH' ? 'ทั้งหมด' : 'ALL') :
                 f === 'JOB' ? (language === 'TH' ? 'รายการงาน' : 'JOB') :
                 (language === 'TH' ? 'รายการรอรีวิว' : 'PENDING')}
              </button>
            ))}
          </div>
        </div>
        
        <div className="flex-1 overflow-y-auto">
          <table className="w-full text-left border-collapse font-sans">
            <thead className="sticky top-0 bg-white border-b border-slate-100 z-10">
              <tr>
                <th className="px-8 py-5 text-[11px] font-black text-slate-400 uppercase tracking-widest w-44">Timestamp</th>
                <th className="px-8 py-5 text-[11px] font-black text-slate-400 uppercase tracking-widest w-56">Actor</th>
                <th className="px-8 py-5 text-[11px] font-black text-slate-400 uppercase tracking-widest w-36">Action</th>
                <th className="px-8 py-5 text-[11px] font-black text-slate-400 uppercase tracking-widest">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filteredLogs.map(log => (
                <tr key={log.id} className="hover:bg-slate-50/70 transition-colors group">
                  <td className="px-8 py-5 align-top">
                    <span className="text-[11px] font-bold text-slate-400 tabular-nums">
                      {new Date(log.timestamp).toLocaleString(language === 'TH' ? 'th-TH' : 'en-US', {
                        day: '2-digit',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </span>
                  </td>
                  <td className="px-8 py-5 align-top">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-blue-50 text-[#1f5df9] flex items-center justify-center border border-blue-100">
                        <User size={14} />
                      </div>
                      <span className="text-[12px] font-black text-slate-700 truncate">{log.user}</span>
                    </div>
                  </td>
                  <td className="px-8 py-5 align-top">
                    <Tag 
                      variant="filled" 
                      className={`text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-lg m-0 border-none ${
                        log.action.includes('REJECT') ? 'bg-rose-50 text-rose-600' :
                        log.action.includes('APPROVE') || log.action.includes('DONE') ? 'bg-emerald-50 text-emerald-600' :
                        'bg-blue-50 text-[#1f5df9]'
                      }`}
                    >
                      {log.action}
                    </Tag>
                  </td>
                  <td className="px-8 py-5 align-top">
                    <div className="flex items-start justify-between gap-4">
                      <p className="text-[12px] font-bold text-slate-600 leading-relaxed italic group-hover:text-[#010136] transition-colors">
                        "{log.details}"
                      </p>
                      {log.action === 'REJECT' && log.originalItem && (
                        <button
                          type="button"
                          onClick={() => handleRestorePending(log)}
                          className="shrink-0 px-3 py-1 bg-blue-50 hover:bg-[#1f5df9] text-[#1f5df9] hover:text-white border border-blue-100 rounded-[4px] text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 transition-all shadow-3xs cursor-pointer active:scale-95"
                          title={language === 'TH' ? 'กู้คืนรายการกลับสู่ Inbox' : 'Restore back to Inbox'}
                        >
                          <RotateCcw size={11} strokeWidth={3} />
                          {language === 'TH' ? 'กู้คืนสู่อินบ็อกซ์' : 'RESTORE TO INBOX'}
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  const renderShipmentGrid = () => {
    dayjs.locale(language === 'TH' ? 'th' : 'en');
    const shipments = getShipments();
    const totalShipments = shipments.length;
    const unfinishedShipments = shipments.filter(sh => sh.isUnfinished).length;
    const myPendingShipments = shipments.filter(sh => sh.isMyPending).length;
    const completedShipments = totalShipments - unfinishedShipments;

    const shipmentStats = [
      { 
        label: language === 'TH' ? 'Shipment' : 'Total Shipments', 
        count: totalShipments, 
        icon: <FileText size={18} />, 
        color: 'bg-slate-50 text-slate-400',
        dotColor: 'bg-slate-400'
      },
      { 
        label: language === 'TH' ? 'Shipment ที่ยังไม่เสร็จ' : 'Unfinished Shipments', 
        count: unfinishedShipments, 
        icon: <Plus size={18} />, 
        color: 'bg-amber-50 text-amber-500',
        dotColor: 'bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.4)]'
      },
      { 
        label: language === 'TH' ? 'งานของฉันที่ทำค้างอยู่' : 'My Pending Shipments', 
        count: myPendingShipments, 
        icon: <ArrowLeftRight size={18} />, 
        color: 'bg-blue-50 text-[#1f5df9]',
        dotColor: 'bg-blue-500 shadow-[0_0_8px_rgba(4,99,239,0.4)]'
      },
      { 
        label: language === 'TH' ? 'Shipment ที่เสร็จสิ้น' : 'Completed Shipments', 
        count: completedShipments, 
        icon: <CheckCircle2 size={18} />, 
        color: 'bg-emerald-50 text-emerald-500',
        dotColor: 'bg-emerald-500 shadow-[0_0_8px_rgba(16,234,158,0.4)]'
      },
    ];

    const filteredShipments = shipments
      .filter(sh => {
        if (searchTerm === '') return true;
        return sh.reference.toLowerCase().includes(searchTerm.toLowerCase());
      })
      .filter(sh => {
        if (statusFilter === 'ALL') return true;
        if (statusFilter === 'PENDING') return sh.isUnfinished;
        if (statusFilter === 'DONE') return !sh.isUnfinished;
        return true;
      })
      .filter(sh => {
        if (!shipmentDateFrom && !shipmentDateTo) return true;
        const createdAtMs = parseDateValue(sh.createdAt);
        if (shipmentDateFrom && createdAtMs < new Date(shipmentDateFrom).getTime()) return false;
        if (shipmentDateTo && createdAtMs > new Date(shipmentDateTo).getTime() + (24 * 60 * 60 * 1000 - 1)) return false;
        return true;
      });

    const shipmentTotalPages = Math.max(1, Math.ceil(filteredShipments.length / PAGE_SIZE));
    const paginatedShipments = filteredShipments.slice((shipmentPage - 1) * PAGE_SIZE, shipmentPage * PAGE_SIZE);

    return (
      <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
        {/* Shipment Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {shipmentStats.map((stat, i) => (
            <div key={i} className="bg-white border border-slate-100 rounded-lg p-5 flex items-center justify-between shadow-sm hover:shadow-md transition-all group cursor-pointer font-sans">
              <div className="flex flex-col">
                <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-1">{stat.label}</p>
                <div className="flex items-baseline gap-2">
                  <h3 className="text-2xl font-black text-[#010136] tracking-tight">{stat.count}</h3>
                  <div className={`w-1.5 h-1.5 rounded-full ${stat.dotColor}`}></div>
                </div>
              </div>
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center transition-all group-hover:scale-110 shadow-sm ${stat.color}`}>
                {stat.icon}
              </div>
            </div>
          ))}
        </div>

        {/* Search bar & simple filters */}
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm mb-6 overflow-hidden font-sans">
          <div className="p-4 flex flex-wrap items-center gap-4 border-b border-slate-100 bg-slate-50/20">
            <div className="relative flex-1 min-w-[240px]">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input
                type="text"
                placeholder={language === 'TH' ? 'ค้นหาเลขที่ Shipment' : 'Search shipment number'}
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setShipmentPage(1);
                }}
                className="w-full bg-white border border-slate-200 rounded-xl py-2 pl-11 pr-4 focus:ring-4 focus:ring-blue-500/10 focus:border-[#1f5df9] text-[12px] font-bold outline-none shadow-sm font-sans transition-all"
              />
            </div>

            <div className="flex items-center gap-2 text-[12px] font-black text-slate-400 uppercase tracking-widest font-sans shrink-0">
              <span>{language === 'TH' ? 'วันที่เริ่ม:' : 'Date range:'}</span>
              <DatePicker.RangePicker
                value={[
                  shipmentDateFrom ? dayjs(shipmentDateFrom) : null,
                  shipmentDateTo ? dayjs(shipmentDateTo) : null
                ]}
                onChange={(dates) => {
                  setShipmentDateFrom(dates?.[0] ? dates[0].format('YYYY-MM-DD') : '');
                  setShipmentDateTo(dates?.[1] ? dates[1].format('YYYY-MM-DD') : '');
                  setShipmentPage(1);
                }}
                allowClear
                locale={language === 'TH' ? thTH.DatePicker : undefined}
                placeholder={language === 'TH' ? ['วันที่เริ่มต้น', 'วันที่สิ้นสุด'] : ['Start date', 'End date']}
                className="!bg-white !border-slate-200 !rounded-[4px] !py-2 !px-3 !shadow-sm !text-[12px] [&_input]:!text-[12px] font-sans"
              />
            </div>

            <div className="flex items-center gap-2 text-[12px] font-black text-slate-400 uppercase tracking-widest pl-2 font-sans shrink-0">
              <span>สถานะ Shipment:</span>
              <div className="relative">
                <select
                  value={statusFilter}
                  onChange={(e) => {
                    setStatusFilter(e.target.value);
                    setShipmentPage(1);
                  }}
                  className="bg-white border border-slate-200 rounded-xl py-2 px-4 pr-10 focus:ring-4 focus:ring-blue-500/10 focus:border-[#1f5df9] text-[12px] font-black uppercase tracking-tight appearance-none cursor-pointer outline-none shadow-sm font-sans transition-all"
                >
                  <option value="ALL">{language === 'TH' ? 'ทั้งหมด' : 'ALL'}</option>
                  <option value="PENDING">{language === 'TH' ? 'ยังไม่เสร็จ' : 'UNFINISHED'}</option>
                  <option value="DONE">{language === 'TH' ? 'เสร็จสิ้นแล้ว' : 'COMPLETED'}</option>
                </select>
                <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400" />
              </div>
            </div>
          </div>

          {/* Shipment Grid Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse table-auto font-sans text-sm">
              <thead>
                <tr className="bg-slate-50/50 text-[12px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">
                  <th className="px-8 py-4">{language === 'TH' ? 'เลขที่ Shipment' : 'SHIPMENT NO.'}</th>
                  <th className="px-8 py-4">{language === 'TH' ? 'ความคืบหน้างานย่อย' : 'PROGRESS'}</th>
                  <th className="px-8 py-4">{language === 'TH' ? 'สถานะเวิร์กโฟลว์ปัจจุบัน' : 'CURRENT WORKFLOW'}</th>
                  <th className="px-8 py-4">{language === 'TH' ? 'ผู้รับผิดชอบล่าสุด' : 'CURRENT ASSIGNEE'}</th>
                  <th className="px-8 py-4 text-right"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filteredShipments.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-8 py-12 text-center text-slate-400">
                      <Empty description={language === 'TH' ? 'ไม่พบข้อมูล Shipment' : 'No Shipment Found'} />
                    </td>
                  </tr>
                ) : (
                  paginatedShipments.map((shipment) => {
                    const percent = Math.round((shipment.completedCount / shipment.totalCount) * 100);
                    return (
                      <tr 
                        key={shipment.reference} 
                        onClick={() => setSelectedShipment(shipment.reference)}
                        className="transition-all hover:bg-blue-50/20 cursor-pointer"
                      >
                        <td className="px-8 py-5">
                          <div className="flex items-center gap-3">
                            <div className="p-2 bg-blue-50 text-[#1f5df9] rounded-lg">
                              <FileSpreadsheet size={18} />
                            </div>
                            <div>
                              <p className="font-black text-[#010136] text-[13px] tracking-tight mb-0.5">{shipment.reference}</p>
                              <p className="text-[12px] font-normal text-slate-400 uppercase tracking-wider">
                                {language === 'TH' ? 'วันที่เริ่ม: ' : 'STARTED: '} <span className="text-slate-500">{formatDisplayDate(shipment.createdAt)}</span>
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="px-8 py-5">
                          <div className="flex flex-col gap-1 w-[140px]">
                            <div className="flex justify-between text-[12px] font-black text-slate-500 tabular-nums">
                              <span>{shipment.completedCount}/{shipment.totalCount} {language === 'TH' ? 'เสร็จ' : 'done'}</span>
                              <span>{percent}%</span>
                            </div>
                            <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                              <div className="bg-[#16EA9E] h-full rounded-full transition-all duration-500" style={{ width: `${percent}%` }}></div>
                            </div>
                          </div>
                        </td>
                        <td className="px-8 py-5">
                          <span className="px-2.5 py-1 text-[12px] font-bold rounded-lg bg-blue-50 text-blue-700 border border-blue-100 inline-flex items-center gap-1.5 font-sans">
                            <div className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse"></div>
                            {shipment.currentPhase}
                          </span>
                        </td>
                        <td className="px-8 py-5">
                          {shipment.isUnfinished ? (
                            <span className="text-[12px] font-bold text-slate-600 flex items-center gap-1.5">
                              <div className="w-2 h-2 rounded-full bg-amber-400"></div>
                              {shipment.currentAssignee || (language === 'TH' ? 'ยังไม่ได้มอบหมาย' : 'Unassigned')}
                            </span>
                          ) : (
                            <span className="text-[12px] font-black text-emerald-600 flex items-center gap-1.5 font-sans">
                              <ShieldCheck size={14} className="text-emerald-500" />
                              {language === 'TH' ? 'เสร็จสมบูรณ์' : 'All Completed'}
                            </span>
                          )}
                        </td>
                        <td className="px-8 py-5 text-right">
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedShipment(shipment.reference);
                            }}
                            className="px-3 py-1.5 bg-white hover:bg-slate-50 text-slate-600 border border-slate-300 hover:border-slate-400 hover:text-slate-800 font-black text-xs rounded-[4px] flex items-center gap-1 transition-all cursor-pointer shadow-sm"
                          >
                            <span>{language === 'TH' ? 'ดูงานย่อย' : 'VIEW JOBS'}</span>
                            <ArrowRight size={14} className="text-slate-500 hover:text-slate-700" />
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination Footer */}
          {filteredShipments.length > 0 && (
            <div className="p-5 border-t border-slate-100 bg-slate-50/20 flex items-center justify-between font-sans">
              <div className="text-[11px] font-black text-slate-400 uppercase tracking-widest">
                {language === 'TH' ? 'แสดง' : 'Showing'} <span className="text-slate-800">{Math.min(filteredShipments.length, (shipmentPage - 1) * PAGE_SIZE + 1)}</span> {language === 'TH' ? 'ถึง' : 'to'} <span className="text-slate-800">{Math.min(filteredShipments.length, shipmentPage * PAGE_SIZE)}</span> {language === 'TH' ? 'จากทั้งหมด' : 'of'} <span className="text-slate-800">{filteredShipments.length}</span> {language === 'TH' ? 'รายการ' : 'items'}
              </div>
              {shipmentTotalPages > 1 && (
                <div className="flex items-center gap-5">
                  <button
                    disabled={shipmentPage === 1}
                    onClick={() => setShipmentPage(prev => Math.max(1, prev - 1))}
                    className="p-2 rounded-[4px] border border-slate-200 bg-white text-slate-400 hover:text-blue-600 disabled:opacity-30 disabled:cursor-not-allowed transition-all shadow-sm"
                  >
                    <ChevronLeft size={16} />
                  </button>
                  <div className="flex items-center gap-2">
                    {Array.from({ length: shipmentTotalPages }).map((_, i) => (
                      <button
                        key={i}
                        onClick={() => setShipmentPage(i + 1)}
                        className={`w-10 h-10 rounded-[4px] font-black text-xs transition-all ${shipmentPage === i + 1 ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20 scale-110' : 'bg-white border border-slate-100 text-slate-400 hover:border-blue-200 hover:bg-slate-50'}`}
                      >
                        {i + 1}
                      </button>
                    ))}
                  </div>
                  <button
                    disabled={shipmentPage === shipmentTotalPages}
                    onClick={() => setShipmentPage(prev => Math.min(shipmentTotalPages, prev + 1))}
                    className="p-2 rounded-[4px] border border-slate-200 bg-white text-slate-400 hover:text-blue-600 disabled:opacity-30 disabled:cursor-not-allowed transition-all shadow-sm"
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderShipmentJobList = () => {
    const shipmentJobs = jobs.filter(job => job.reference === selectedShipment);

    const shipmentCreatedAt = shipmentJobs.reduce((acc, job) => {
      if (!acc) return job.createdAt;
      try {
        return parseDateValue(job.createdAt) < parseDateValue(acc) ? job.createdAt : acc;
      } catch (e) {
        return job.createdAt;
      }
    }, shipmentJobs[0]?.createdAt);

    const filteredJobs = shipmentJobs
      .filter(job => 
        job.reference.toLowerCase().includes(searchTerm.toLowerCase()) ||
        job.workflowName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        job.assignee?.toLowerCase().includes(searchTerm.toLowerCase())
      )
      .sort((a, b) => {
        const indexA = shipmentJobs.findIndex(j => j.id === a.id);
        const indexB = shipmentJobs.findIndex(j => j.id === b.id);
        return indexA - indexB;
      });

    const getDocIcon = (status: ComparisonDocStatus) => {
      switch (status) {
        case ComparisonDocStatus.MATCHED:
          return (
            <Tooltip content={t.ttMatched}>
              <div className="w-5 h-5 rounded-full bg-emerald-50 text-emerald-500 flex items-center justify-center border border-emerald-100 hover:scale-110 transition-transform cursor-help shadow-sm">
                <Check size={12} strokeWidth={4} />
              </div>
            </Tooltip>
          );
        case ComparisonDocStatus.RECEIVED:
          return (
            <Tooltip content={t.ttProcessing}>
              <div className="w-5 h-5 rounded-full bg-slate-100 flex items-center justify-center hover:bg-slate-200 transition-colors cursor-help border border-slate-200"></div>
            </Tooltip>
          );
        case ComparisonDocStatus.MISMATCHED:
          return (
            <Tooltip content={t.ttMismatched}>
              <XCircle size={18} className="text-red-500 hover:scale-110 transition-transform cursor-help mx-auto" />
            </Tooltip>
          );
        case ComparisonDocStatus.MISSING:
        default:
          return <div className="w-4 h-[2px] bg-slate-100 mx-auto"></div>;
      }
    };

    const getStatusBadge = (job: ComparisonJob, isBlocked: boolean = false) => {
      if (isBlocked) {
        return (
          <span className="bg-slate-100 text-slate-500 border border-slate-200 text-[10px] font-black px-2.5 py-1 rounded-full uppercase tracking-tighter inline-flex items-center gap-1.5 font-sans whitespace-nowrap">
            <Lock size={10} className="text-slate-400" />
            {language === 'TH' ? 'ยังเริ่มไม่ได้' : 'CANNOT START'}
          </span>
        );
      }

      const status = getJobStatus(job);

      switch (status) {
        case JobStatus.READY:
          return <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-tighter inline-flex items-center gap-1.5 font-sans whitespace-nowrap"><div className="w-1 h-1 rounded-full bg-emerald-500"></div>{language === 'TH' ? 'เสร็จสมบูรณ์' : 'READY'}</span>;
        case JobStatus.PENDING:
          return <span className="bg-blue-50 text-blue-700 border border-blue-200 text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-tighter inline-flex items-center gap-1.5 font-sans whitespace-nowrap"><div className="w-1 h-1 rounded-full bg-blue-500"></div>{language === 'TH' ? 'รอดำเนินการ' : 'PENDING'}</span>;
        case JobStatus.NEW:
          return <span className="bg-slate-50 text-slate-500 border border-slate-200 text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-tighter inline-flex items-center gap-1.5 font-sans whitespace-nowrap"><div className="w-1 h-1 rounded-full bg-slate-400"></div>{language === 'TH' ? 'รอไฟล์ครบ' : 'PENDING FILES'}</span>;
        case JobStatus.PROCESSING:
          return (
            <span className="bg-blue-600 text-white text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-tighter inline-flex items-center gap-1.5 w-fit font-sans whitespace-nowrap">
              <Loader2 size={10} className="animate-spin" />
              {language === 'TH' ? 'กำลังเปรียบเทียบข้อมูล' : 'COMPARING'}
            </span>
          );
        case JobStatus.REVIEW:
          return <span className="bg-amber-50 text-amber-700 border border-amber-200 text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-tighter inline-flex items-center gap-1.5 font-sans whitespace-nowrap"><div className="w-1 h-1 rounded-full bg-amber-500 animate-pulse"></div>{language === 'TH' ? 'รอตรวจสอบ' : 'REVIEW'}</span>;
        case JobStatus.REJECTED:
          return (
            <Tooltip content={job.rejectionReason}>
              <span className="bg-rose-50 text-rose-700 border border-rose-200 text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-tighter inline-flex items-center gap-1.5 font-sans whitespace-nowrap cursor-help">
                <Undo2 size={10} className="text-rose-500" />
                {language === 'TH' ? 'ถูกตีกลับ' : 'REJECTED'}
              </span>
            </Tooltip>
          );
        default:
          return null;
      }
    };

    return (
      <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
        {/* Back Button and Shipment Context Banner */}
        <div className="flex items-center gap-3 pb-3 border-b border-slate-100 mb-6 font-sans">
          <button
            onClick={() => setSelectedShipment(null)}
            className="p-2 hover:bg-slate-50 rounded-[4px] transition-all text-slate-600 flex items-center justify-center cursor-pointer"
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <h3 className="text-xl md:text-2xl font-black text-[#010136] tracking-tight">{selectedShipment}</h3>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-0.5">
              {language === 'TH' ? 'สร้างเมื่อ: ' : 'CREATED: '} <span className="text-slate-500">{shipmentCreatedAt ? formatDisplayDate(shipmentCreatedAt) : 'N/A'}</span>
            </p>
          </div>
        </div>

        {/* Child Jobs Table */}
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden font-sans">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse table-auto font-sans text-sm">
              <thead>
                <tr className="bg-slate-50/50 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 whitespace-nowrap">
                  <th className="px-8 py-4 w-[110px]">{language === 'TH' ? 'ลำดับงาน' : 'STEP'}</th>
                  <th className="px-8 py-4">{language === 'TH' ? 'เลขที่งาน' : 'JOB NO.'}</th>
                  <th className="px-8 py-4">{language === 'TH' ? 'เวิร์กโฟลว์' : 'WORKFLOW'}</th>
                  <th className="px-8 py-4">{language === 'TH' ? 'ทีมที่รับผิดชอบ' : 'ASSIGNED TEAM'}</th>
                  <th className="px-8 py-4">{language === 'TH' ? 'ผู้รับผิดชอบล่าสุด' : 'CURRENT ASSIGNEE'}</th>
                  <th className="px-8 py-4">{language === 'TH' ? 'อัปเดตล่าสุด' : 'LAST UPDATE'}</th>
                  <th className="px-8 py-4 min-w-[170px]">{t.status}</th>
                  <th className="px-8 py-4 text-right"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filteredJobs.map((job) => {
                  const isProcessing = job.status === JobStatus.PROCESSING;
                  const seqIndex = shipmentJobs.findIndex(j => j.id === job.id);
                  // A job only reaches READY once the user explicitly clicks "เสร็จสิ้น" (Done) —
                  // all docs matching isn't enough on its own (that's still PENDING) — so the next
                  // sub-item stays blocked until this one is actually READY.
                  const isWorkflowCompleted = (j: ComparisonJob) => j.status === JobStatus.READY;
                  const isBlocked = seqIndex > 0 && shipmentJobs.slice(0, seqIndex).some(prevJob => !isWorkflowCompleted(prevJob));
                  
                  return (
                    <tr 
                      key={job.id} 
                      onClick={() => {
                        if (isBlocked) {
                          message.warning(
                            language === 'TH' 
                              ? 'ไม่สามารถเริ่มงานนี้ได้ เนื่องจากขั้นตอนก่อนหน้ายังไม่เสร็จสมบูรณ์' 
                              : 'Cannot start this job because the previous step is not completed.'
                          );
                          return;
                        }
                        setSelectedJob(job);
                        setStep(1);
                      }} 
                      className={`transition-all group ${
                        isBlocked 
                          ? 'cursor-not-allowed bg-slate-50/50 hover:bg-slate-50/50 opacity-60' 
                          : 'hover:bg-blue-50/20 cursor-pointer'
                      }`}
                    >
                      <td className="px-8 py-5">
                        <div className="relative flex items-center justify-start h-7 w-7">
                          {/* Connecting line - top half */}
                          {seqIndex > 0 && (
                            <div 
                              className={`absolute left-1/2 -translate-x-1/2 w-0.5 ${
                                isBlocked ? 'bg-slate-100' : 'bg-emerald-200/85'
                              }`} 
                              style={{ top: -24, bottom: '50%', zIndex: 0 }} 
                            />
                          )}
                          {/* Connecting line - bottom half */}
                          {seqIndex < filteredJobs.length - 1 && (
                            <div 
                              className={`absolute left-1/2 -translate-x-1/2 w-0.5 ${
                                isWorkflowCompleted(job)
                                  ? 'bg-emerald-200/85'
                                  : 'bg-slate-100'
                              }`} 
                              style={{ top: '50%', bottom: -24, zIndex: 0 }} 
                            />
                          )}
                          <span className={`relative z-10 w-7 h-7 rounded-full font-black text-xs flex items-center justify-center border shadow-sm ${
                            isBlocked
                              ? 'bg-slate-50 text-slate-400 border-slate-200'
                              : isWorkflowCompleted(job)
                                ? 'bg-emerald-50 text-emerald-600 border-emerald-200'
                                : 'bg-blue-50 text-[#1f5df9] border-blue-200'
                          }`}>
                            {seqIndex + 1}
                          </span>
                        </div>
                      </td>
                      <td className="px-8 py-5">
                        <span className={`text-[13px] font-black font-mono tracking-tight ${isBlocked ? 'text-slate-300' : 'text-slate-500'}`}>
                          {getWorkflowPrefix(job.workflowName)}-{String(seqIndex + 1).padStart(4, '0')}
                        </span>
                      </td>
                      <td className="px-8 py-5">
                        <p className={`text-[13px] font-bold font-sans ${isBlocked ? 'text-slate-400' : 'text-slate-600'}`}>{job.workflowName?.replace(/\s*\[[^\]]*\]\s*$/, '') || 'N/A'}</p>
                      </td>
                      <td className="px-8 py-5">
                        <span className={`text-[13px] font-bold font-sans ${isBlocked ? 'text-slate-300' : 'text-slate-500'}`}>{MOCK_TEAMS.find(team => team.value === job.assignedTeam)?.label || (language === 'TH' ? 'ยังไม่ได้กำหนด' : 'Unassigned')}</span>
                      </td>
                      <td className="px-8 py-5">
                        <span className={`text-[13px] font-bold font-sans ${isBlocked ? 'text-slate-300' : 'text-slate-500'}`}>{job.assignee || (language === 'TH' ? 'ยังไม่ได้มอบหมาย' : 'Unassigned')}</span>
                      </td>
                      <td className="px-8 py-5">
                        <p className={`text-[13px] font-bold font-sans ${isBlocked ? 'text-slate-400' : 'text-slate-600'}`}>{job.expiryDate ? formatDisplayDateWithTime(job.expiryDate) : 'N/A'}</p>
                      </td>
                      <td className="px-8 py-5 min-w-[170px]">
                        {getStatusBadge(job, isBlocked)}
                      </td>
                      <td className="px-8 py-5 text-right w-[160px]">
                        <div className="flex items-center justify-end gap-2">
                          <Tooltip content={isBlocked ? (language === 'TH' ? 'ขั้นตอนก่อนหน้ายังไม่เสร็จสิ้น' : 'Previous step not completed') : t.ttViewCompare}>
                            <button 
                              disabled={isBlocked}
                              onClick={(e) => {
                                e.stopPropagation();
                                if (isBlocked) {
                                  message.warning(
                                    language === 'TH' 
                                      ? 'ไม่สามารถเริ่มงานนี้ได้ เนื่องจากขั้นตอนก่อนหน้ายังไม่เสร็จสมบูรณ์' 
                                      : 'Cannot start this job because the previous step is not completed.'
                                  );
                                  return;
                                }
                                setSelectedJob(job);
                                setStep(1);
                              }}
                              className={`p-2.5 rounded-[4px] transition-all ${isBlocked ? 'text-slate-200 cursor-not-allowed' : 'text-slate-400 hover:text-[#1f5df9] hover:bg-blue-50'}`}
                            >
                              <Eye size={20} />
                            </button>
                          </Tooltip>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  };

  const renderGrid = () => {
    const jobStats = [
      { label: language === 'TH' ? 'งานทั้งหมด' : 'Total Jobs', count: 124, icon: <FileText size={18} />, color: 'bg-slate-50 text-slate-400' },
      { label: language === 'TH' ? 'รอดำเนินการ' : 'Pending', count: 18, icon: <Plus size={18} />, color: 'bg-amber-50 text-amber-500' },
      { label: language === 'TH' ? 'กำลังทำ' : 'In Progress', count: 42, icon: <ArrowLeftRight size={18} />, color: 'bg-blue-50 text-blue-500' },
      { label: language === 'TH' ? 'เสร็จสิ้น' : 'Completed', count: 64, icon: <CheckCircle2 size={18} />, color: 'bg-emerald-50 text-emerald-500' },
    ];

    const getDocIcon = (status: ComparisonDocStatus) => {
      switch (status) {
        case ComparisonDocStatus.MATCHED:
          return (
            <Tooltip content={t.ttMatched}>
              <div className="w-5 h-5 rounded-full bg-emerald-50 text-emerald-500 flex items-center justify-center border border-emerald-100 hover:scale-110 transition-transform cursor-help shadow-sm">
                <Check size={12} strokeWidth={4} />
              </div>
            </Tooltip>
          );
        case ComparisonDocStatus.RECEIVED:
          return (
            <Tooltip content={t.ttProcessing}>
              <div className="w-5 h-5 rounded-full bg-slate-100 flex items-center justify-center hover:bg-slate-200 transition-colors cursor-help border border-slate-200"></div>
            </Tooltip>
          );
        case ComparisonDocStatus.MISMATCHED:
          return (
            <Tooltip content={t.ttMismatched}>
              <XCircle size={18} className="text-red-500 hover:scale-110 transition-transform cursor-help mx-auto" />
            </Tooltip>
          );
        case ComparisonDocStatus.MISSING:
        default:
          return <div className="w-4 h-[2px] bg-slate-100 mx-auto"></div>;
      }
    };

    const getStatusBadge = (job: ComparisonJob) => {
      const status = getJobStatus(job);

      switch (status) {
        case JobStatus.READY:
          return <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-tighter inline-flex items-center gap-1.5 font-sans whitespace-nowrap"><div className="w-1 h-1 rounded-full bg-emerald-500"></div>{language === 'TH' ? 'เสร็จสมบูรณ์' : 'READY'}</span>;
        case JobStatus.PENDING:
          return <span className="bg-blue-50 text-blue-700 border border-blue-200 text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-tighter inline-flex items-center gap-1.5 font-sans whitespace-nowrap"><div className="w-1 h-1 rounded-full bg-blue-500"></div>{language === 'TH' ? 'รอดำเนินการ' : 'PENDING'}</span>;
        case JobStatus.NEW:
          return <span className="bg-slate-50 text-slate-500 border border-slate-200 text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-tighter inline-flex items-center gap-1.5 font-sans whitespace-nowrap"><div className="w-1 h-1 rounded-full bg-slate-400"></div>{language === 'TH' ? 'รอไฟล์ครบ' : 'PENDING FILES'}</span>;
        case JobStatus.PROCESSING:
          return (
            <span className="bg-blue-600 text-white text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-tighter inline-flex items-center gap-1.5 w-fit font-sans whitespace-nowrap">
              <Loader2 size={10} className="animate-spin" />
              {language === 'TH' ? 'กำลังเปรียบเทียบข้อมูล' : 'COMPARING'}
            </span>
          );
        case JobStatus.REVIEW:
          return <span className="bg-amber-50 text-amber-700 border border-amber-200 text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-tighter inline-flex items-center gap-1.5 font-sans whitespace-nowrap"><div className="w-1 h-1 rounded-full bg-amber-500 animate-pulse"></div>{language === 'TH' ? 'รอตรวจสอบ' : 'REVIEW'}</span>;
        case JobStatus.REJECTED:
          return (
            <Tooltip content={job.rejectionReason}>
              <span className="bg-rose-50 text-rose-700 border border-rose-200 text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-tighter inline-flex items-center gap-1.5 font-sans whitespace-nowrap cursor-help">
                <Undo2 size={10} className="text-rose-500" />
                {language === 'TH' ? 'ถูกตีกลับ' : 'REJECTED'}
              </span>
            </Tooltip>
          );
        default:
          return null;
      }
    };

    const getProgressColor = (status: JobStatus) => {
      switch (status) {
        case JobStatus.READY: return 'bg-emerald-500';
        case JobStatus.PENDING: return 'bg-blue-500';
        case JobStatus.PROCESSING: return 'bg-blue-600 animate-pulse';
        case JobStatus.REVIEW: return 'bg-amber-500';
        case JobStatus.REJECTED: return 'bg-rose-500';
        default: return 'bg-slate-300';
      }
    };

    const filteredJobs = jobs
      .filter(job => statusFilter === 'ALL' || job.status === statusFilter)
      .filter(job => jobTypeFilter === 'ALL' || job.workflowName === jobTypeFilter)
      .filter(job => {
        if (assigneeFilter === 'ALL') return true;
        if (assigneeFilter === 'UNASSIGNED') return !job.assignee || job.assignee === 'Unassigned' || job.assignee === '';
        return job.assignee === assigneeFilter;
      })
      .filter(job => 
        job.reference.toLowerCase().includes(searchTerm.toLowerCase()) ||
        job.workflowName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        job.assignee?.toLowerCase().includes(searchTerm.toLowerCase())
      );

    const sortedJobs = [...filteredJobs].sort((a, b) => {
      if (sortBy === 'NEWEST') {
        return parseDateValue(b.createdAt) - parseDateValue(a.createdAt);
      } else if (sortBy === 'OLDEST') {
        return parseDateValue(a.createdAt) - parseDateValue(b.createdAt);
      } else if (sortBy === 'UPDATE_NEW') {
        return parseDateValue(b.expiryDate) - parseDateValue(a.expiryDate);
      } else if (sortBy === 'UPDATE_OLD') {
        return parseDateValue(a.expiryDate) - parseDateValue(b.expiryDate);
      }
      return 0;
    });

    const totalPages = Math.ceil(sortedJobs.length / PAGE_SIZE);
    const paginatedJobs = sortedJobs.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

    return (
      <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
        {/* Compact Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {jobStats.map((stat, i) => (
            <div key={i} className="bg-white border border-slate-100 rounded-lg p-5 flex items-center justify-between shadow-sm hover:shadow-md transition-all group cursor-pointer font-sans">
              <div className="flex flex-col">
                <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-1">{stat.label}</p>
                <div className="flex items-baseline gap-2">
                  <h3 className="text-2xl font-black text-[#010136] tracking-tight">{stat.count}</h3>
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,234,158,0.4)]"></div>
                </div>
              </div>
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center transition-all group-hover:scale-110 shadow-sm ${stat.color}`}>
                {stat.icon}
              </div>
            </div>
          ))}
        </div>

        {/* Filters & Actions Header */}
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm mb-6 overflow-hidden font-sans">
          <div className="p-4 flex flex-wrap items-center gap-4 border-b border-slate-100 bg-slate-50/20">
            <div className="flex items-center gap-2 text-[11px] font-black text-slate-400 uppercase tracking-widest pl-2 font-sans shrink-0">
              <span>สถานะงาน:</span>
              <div className="relative">
                <select 
                  value={statusFilter}
                  onChange={(e) => {
                    setStatusFilter(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="bg-white border border-slate-200 rounded-xl py-2 px-4 pr-10 focus:ring-4 focus:ring-blue-500/10 focus:border-[#1f5df9] text-[11px] font-black uppercase tracking-tight appearance-none cursor-pointer outline-none shadow-sm font-sans transition-all"
                >
                  <option value="ALL">{language === 'TH' ? 'ทั้งหมด' : 'ALL'}</option>
                  <option value="NEW">{language === 'TH' ? 'รอไฟล์ครบ' : 'PENDING FILES'}</option>
                  <option value="PROCESSING">{language === 'TH' ? 'กำลังเปรียบเทียบข้อมูล' : 'COMPARING'}</option>
                  <option value="PENDING">{language === 'TH' ? 'รอดำเนินการ' : 'PENDING'}</option>
                  <option value="REVIEW">{language === 'TH' ? 'รอตรวจสอบ' : 'REVIEW'}</option>
                  <option value="READY">{language === 'TH' ? 'เสร็จสมบูรณ์' : 'READY'}</option>
                  <option value="DONE">{language === 'TH' ? 'ส่งออกแล้ว' : 'EXPORTED'}</option>
                </select>
                <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400" />
              </div>
            </div>

            <div className="flex items-center gap-2 text-[11px] font-black text-slate-400 uppercase tracking-widest font-sans shrink-0">
              <span>ประเภทงาน:</span>
              <div className="relative">
                <select 
                  value={jobTypeFilter}
                  onChange={(e) => {
                    setJobTypeFilter(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="bg-white border border-slate-200 rounded-xl py-2 px-4 pr-10 focus:ring-4 focus:ring-blue-500/10 focus:border-[#1f5df9] text-[11px] font-black uppercase tracking-tight appearance-none cursor-pointer outline-none shadow-sm font-sans transition-all w-[180px] truncate"
                >
                  <option value="ALL">ประเภทงานทั้งหมด</option>
                  {Array.from(new Set(jobs.map(j => j.workflowName).filter(Boolean))).map(type => (
                    <option key={type as string} value={type as string}>{type as string}</option>
                  ))}
                </select>
                <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400" />
              </div>
            </div>

            <div className="flex items-center gap-2 text-[11px] font-black text-slate-400 uppercase tracking-widest font-sans shrink-0">
              <span>ผู้รับผิดชอบ:</span>
              <div className="relative">
                <select 
                  value={assigneeFilter}
                  onChange={(e) => {
                    setAssigneeFilter(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="bg-white border border-slate-200 rounded-xl py-2 px-4 pr-10 focus:ring-4 focus:ring-blue-500/10 focus:border-[#1f5df9] text-[11px] font-black uppercase tracking-tight appearance-none cursor-pointer outline-none shadow-sm font-sans transition-all w-[160px] truncate"
                >
                  <option value="ALL">{language === 'TH' ? 'ผู้รับผิดชอบทั้งหมด' : 'ALL ASSIGNEES'}</option>
                  <option value="UNASSIGNED">{language === 'TH' ? 'ยังไม่ได้มอบหมาย' : 'UNASSIGNED'}</option>
                  {Array.from(new Set(jobs.map(j => j.assignee).filter(Boolean))).map(assignee => (
                    <option key={assignee as string} value={assignee as string}>{assignee as string}</option>
                  ))}
                </select>
                <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400" />
              </div>
            </div>

            <div className="flex-1"></div>
            
            <div className="flex items-center gap-2 text-[11px] font-black text-slate-400 uppercase tracking-widest font-sans shrink-0">
              <span>จัดเรียงตาม:</span>
              <div className="relative">
                <select 
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="bg-white border border-slate-200 rounded-xl py-2 px-4 pr-10 focus:ring-4 focus:ring-blue-500/10 focus:border-[#1f5df9] text-[11px] font-black uppercase tracking-tight appearance-none cursor-pointer outline-none shadow-sm font-sans transition-all w-[200px]"
                >
                  <option value="NEWEST">เรียงจากรายการใหม่ไปเก่า</option>
                  <option value="OLDEST">เรียงจากรายการเก่าไปใหม่</option>
                  <option value="UPDATE_NEW">ไฟล์อัปเดทล่าสุดไปเก่า</option>
                  <option value="UPDATE_OLD">ไฟล์อัปเดทเก่าไปล่าสุด</option>
                </select>
                <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400" />
              </div>
            </div>
          </div>

          {/* Business Grid Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse table-auto font-sans text-sm">
              <thead>
                <tr className="bg-slate-50/50 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">
                  <th className="px-8 py-4">{t.jobNo}</th>
                  <th className="px-8 py-4">{language === 'TH' ? 'ประเภทงาน' : 'JOB TYPE'}</th>
                  <th className="px-8 py-4">{language === 'TH' ? 'ผู้รับผิดชอบล่าสุด' : 'CURRENT ASSIGNEE'}</th>
                  <th className="px-8 py-4">{language === 'TH' ? 'อัปเดตล่าสุด' : 'LAST UPDATE'}</th>
                  <th className="px-8 py-4 text-center">{language === 'TH' ? 'จำนวนไฟล์' : 'FILES'}</th>
                  <th className="px-8 py-4 min-w-[170px]">{t.status}</th>
                  <th className="px-8 py-4 text-right"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {paginatedJobs.map((job) => {
                    const isProcessing = job.status === JobStatus.PROCESSING;
                    
                    // Logic for OCR counts
                    const docStatuses = Object.values(job.docs);
                    const ocrDoneCount = docStatuses.filter(s => 
                      s !== ComparisonDocStatus.MISSING && 
                      s !== ComparisonDocStatus.RECEIVED && 
                      s !== ComparisonDocStatus.EXTRACTING
                    ).length;
                    const extractingCount = docStatuses.filter(s => 
                      s === ComparisonDocStatus.EXTRACTING
                    ).length;
                    const hasOngoingOCR = docStatuses.some(s => 
                      s === ComparisonDocStatus.RECEIVED || 
                      s === ComparisonDocStatus.EXTRACTING
                    );

                    return (
                  <tr key={job.id} onClick={() => {
                      setSelectedJob(job);
                      setStep(1);
                  }} className={`transition-all group hover:bg-blue-50/20 cursor-pointer`}>
                    <td className="px-8 py-5">
                      <div className="flex items-center gap-4">
                        <div className={`w-2.5 h-2.5 rounded-full shadow-sm ${
                          job.status === JobStatus.READY ? 'bg-emerald-500 shadow-emerald-200' :
                          job.status === JobStatus.PENDING ? 'bg-[#1f5df9] shadow-blue-200' :
                          job.status === JobStatus.REVIEW ? 'bg-amber-500 shadow-amber-200' : 
                          job.status === JobStatus.PROCESSING ? 'bg-blue-600 animate-pulse' : 
                          'bg-slate-300'
                        }`}></div>
                        <div>
                          <p className="font-black text-[#010136] text-[13px] tracking-tight mb-0.5">{job.reference}</p>
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                            {language === 'TH' ? 'สร้างเมื่อ: ' : 'CREATED: '} <span className="text-slate-500">{job.createdAt ? formatDisplayDate(job.createdAt) : 'N/A'}</span>
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-5">
                      <p className="text-[13px] font-bold text-slate-600 font-sans">{job.workflowName || 'N/A'}</p>
                    </td>
                    <td className="px-8 py-5">
                      <span className="text-[13px] font-bold text-slate-500 font-sans">{job.assignee || (language === 'TH' ? 'ยังไม่ได้มอบหมาย' : 'Unassigned')}</span>
                    </td>
                    <td className="px-8 py-5">
                      <p className="text-[13px] font-bold text-slate-600 font-sans">{job.expiryDate ? formatDisplayDateWithTime(job.expiryDate) : 'N/A'}</p>
                    </td>
                    <td className="px-8 py-5 text-center">
                      <p className="text-[13px] font-black text-slate-800 tabular-nums">{job.foundDocs ?? Object.values(job.docs).filter(s => s !== ComparisonDocStatus.MISSING).length} / {job.totalDocs}</p>
                    </td>
                    <td className="px-8 py-5 min-w-[170px]">
                      {getStatusBadge(job)}
                    </td>
                    <td className="px-8 py-5 text-right w-[160px]">
                      <div className="flex items-center justify-end gap-2">
                        <Tooltip content={t.ttViewCompare}>
                          <button 
                            onClick={() => {
                              setSelectedJob(job);
                              setStep(1);
                            }}
                            className={`p-2.5 rounded-[4px] transition-all text-slate-400 hover:text-[#1f5df9] hover:bg-blue-50`}
                          >
                            <Eye size={20} />
                          </button>
                        </Tooltip>


                        <Tooltip content={getLastSubItemExportTooltip(job, t.ttExportNotify)}>
                          <button
                            disabled={job.status === JobStatus.READY || job.status === JobStatus.REJECTED || !isAllDocsMatched(job)}
                            onClick={(e) => {
                              e.stopPropagation();
                              setExportJob(job);
                              setExportOption('workflow');
                              setSelectedExportWorkflow(job.workflowName || '');
                              setSelectedExportPlatform('FTA');
                            }}
                            className={`p-2.5 transition-all rounded-[4px] ${(job.status !== JobStatus.READY && job.status !== JobStatus.REJECTED && isAllDocsMatched(job)) ? 'text-[#1f5df9] hover:bg-blue-50 cursor-pointer' : 'text-slate-200 cursor-not-allowed'}`}
                          >
                            <Send size={20} />
                          </button>
                        </Tooltip>
                      </div>
                    </td>
                  </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
          {/* Pagination Footer */}
            {totalPages > 1 && (
              <div className="p-5 border-t border-slate-100 bg-slate-50/20 flex items-center justify-between font-sans">
                <div className="text-[11px] font-black text-slate-400 uppercase tracking-widest">
                  {language === 'TH' ? 'แสดง' : 'Showing'} <span className="text-slate-800">{Math.min(sortedJobs.length, (currentPage - 1) * PAGE_SIZE + 1)}</span> {language === 'TH' ? 'ถึง' : 'to'} <span className="text-slate-800">{Math.min(sortedJobs.length, currentPage * PAGE_SIZE)}</span> {language === 'TH' ? 'จากทั้งหมด' : 'of'} <span className="text-slate-800">{sortedJobs.length}</span> {language === 'TH' ? 'รายการ' : 'items'}
                </div>
                <div className="flex items-center gap-5">
                  <button 
                    disabled={currentPage === 1}
                    onClick={(e) => {
                      e.stopPropagation();
                      setCurrentPage(prev => Math.max(1, prev - 1));
                    }}
                    className="p-2 rounded-[4px] border border-slate-200 bg-white text-slate-400 hover:text-blue-600 disabled:opacity-30 disabled:cursor-not-allowed transition-all shadow-sm"
                  >
                    <ChevronLeft size={16} />
                  </button>
                  <div className="flex items-center gap-2">
                    {Array.from({ length: totalPages }).map((_, i) => (
                      <button 
                        key={i}
                        onClick={(e) => {
                          e.stopPropagation();
                          setCurrentPage(i + 1);
                        }}
                        className={`w-10 h-10 rounded-[4px] font-black text-xs transition-all ${currentPage === i + 1 ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20 scale-110' : 'bg-white border border-slate-100 text-slate-400 hover:border-blue-200 hover:bg-slate-50'}`}
                      >
                        {i + 1}
                      </button>
                    ))}
                  </div>
                  <button 
                    disabled={currentPage === totalPages}
                    onClick={(e) => {
                      e.stopPropagation();
                      setCurrentPage(prev => Math.min(totalPages, prev + 1));
                    }}
                    className="p-2 rounded-[4px] border border-slate-200 bg-white text-slate-400 hover:text-blue-600 disabled:opacity-30 disabled:cursor-not-allowed transition-all shadow-sm"
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>
              </div>
            )}
        </div>

      </div>
    );
  };

  const visibleDocs = React.useMemo(() => {
    if (!selectedJob) return [];
    return Object.entries(selectedJob.docs).filter(([_, status]) => status !== ComparisonDocStatus.MISSING);
  }, [selectedJob]);

  const comparedDocs = React.useMemo(() => {
    if (!selectedJob) return [];

    // Show all docs as columns (including missing ones so they can still be uploaded and viewed), excluding hidden locked docs
    return Object.keys(selectedJob.docs).filter(docName => 
      !hiddenLockedDocs.includes(docName)
    );
  }, [selectedJob, hiddenLockedDocs]);

  const unvalidatedDocs = React.useMemo(() => {
    if (!selectedJob) return new Set<string>();
    const unvalidated = new Set<string>();
    Object.entries(selectedJob.docs).forEach(([docName, status]) => {
      if (status === ComparisonDocStatus.RECEIVED || 
          status === ComparisonDocStatus.EXTRACTING ||
          status === ComparisonDocStatus.OCR_DONE) {
        unvalidated.add(docName);
      }
    });
    return unvalidated;
  }, [selectedJob]);

  const comparisonResults = React.useMemo(() => {
    if (!selectedJob) return [];
    
    // Check if at least one file has been successfully read
    const hasAnyFileRead = Object.values(selectedJob.docs).some(status => 
      status !== ComparisonDocStatus.MISSING && 
      status !== ComparisonDocStatus.RECEIVED && 
      status !== ComparisonDocStatus.EXTRACTING &&
      status !== ComparisonDocStatus.ERROR
    );

    // If no files have been successfully read, there should be no comparison data rows filled.
    if (!hasAnyFileRead) return [];

    const baseResults = getMockComparisonResults(selectedJob);
    
    // Filter targets to only include docs that are actually compared
    return baseResults.map(res => ({
      ...res,
      targets: res.targets.filter(t => comparedDocs.includes(t.fileName)).map(t => ({
        ...t,
        status: unvalidatedDocs.has(t.fileName) ? 'WAITING' as any : t.status
      }))
    }));
  }, [selectedJob, overriddenValues, comparedDocs, unvalidatedDocs, confirmedMismatches]);

  const allComparisonResults = React.useMemo(() => {
    if (!selectedJob) return [];
    
    // Check if at least one file has been successfully read
    const hasAnyFileRead = Object.values(selectedJob.docs).some(status => 
      status !== ComparisonDocStatus.MISSING && 
      status !== ComparisonDocStatus.RECEIVED && 
      status !== ComparisonDocStatus.EXTRACTING &&
      status !== ComparisonDocStatus.ERROR
    );

    // If no files have been successfully read, there should be no comparison data rows filled.
    if (!hasAnyFileRead) return [];

    const baseResults = getMockComparisonResults(selectedJob);
    return baseResults.map(res => ({
      ...res,
      targets: res.targets.map(t => ({
        ...t,
        status: unvalidatedDocs.has(t.fileName) ? 'WAITING' as any : t.status
      }))
    }));
  }, [selectedJob, overriddenValues, unvalidatedDocs, confirmedMismatches]);

  const mismatchedFileNames = React.useMemo(() => {
    const set = new Set<string>();
    allComparisonResults.forEach(res => {
      res.targets.forEach(t => {
        if (t.status === 'MISMATCH') {
          set.add(t.fileName);
        }
      });
    });
    return set;
  }, [allComparisonResults]);

  // Confirm every currently-mismatched field in a single document at once, regardless
  // of how many fields are mismatched, instead of requiring one click per field.
  const confirmAllMismatchesInDoc = (docName: string) => {
    if (!selectedJob) return;
    const fieldNames = allComparisonResults
      .filter(res => res.targets.some(t => t.fileName === docName && t.status === 'MISMATCH'))
      .map(res => res.fieldName);
    if (fieldNames.length === 0) return;
    assignJobToCurrentUser(selectedJob.id);

    setConfirmedMismatches(prev => {
      const next = { ...prev };
      fieldNames.forEach(fieldName => {
        next[`${selectedJob.id}_${docName}_${fieldName}`] = true;
      });
      return next;
    });

    const newLog = {
      id: Math.random().toString(36).substr(2, 9),
      jobId: selectedJob.id,
      docName,
      timestamp: new Date().toISOString(),
      action: 'CONFIRM_DATA',
      details: language === 'TH'
        ? `กดยืนยันใช้ค่านี้ทั้งเอกสาร "${docName}" (${fieldNames.length} ฟิลด์)`
        : `Confirmed all mismatched values in "${docName}" (${fieldNames.length} fields)`,
      version: selectedJob.updatedDocs?.includes(docName) ? 2 : 1,
      user: 'Kunawut W.'
    };
    setOcrLogs(prevLogs => [newLog, ...prevLogs]);
  };

  // Reverts a "confirm all mismatches" that was clicked by mistake or a user who changed their
  // mind — un-confirms every field in this doc that was confirmed via confirmAllMismatchesInDoc,
  // putting the document back to MISMATCHED so it goes through review again.
  const unconfirmAllMismatchesInDoc = (docName: string) => {
    if (!selectedJob) return;
    const prefix = `${selectedJob.id}_${docName}_`;
    const confirmedFieldKeys = Object.keys(confirmedMismatches).filter(key => key.startsWith(prefix) && confirmedMismatches[key]);
    if (confirmedFieldKeys.length === 0) return;
    assignJobToCurrentUser(selectedJob.id);

    setConfirmedMismatches(prev => {
      const next = { ...prev };
      confirmedFieldKeys.forEach(key => { next[key] = false; });
      return next;
    });

    const newLog = {
      id: Math.random().toString(36).substr(2, 9),
      jobId: selectedJob.id,
      docName,
      timestamp: new Date().toISOString(),
      action: 'UNCONFIRM_DATA',
      details: language === 'TH'
        ? `กดยกเลิกการยืนยันทั้งเอกสาร "${docName}" (${confirmedFieldKeys.length} ฟิลด์)`
        : `Unconfirmed all previously-confirmed values in "${docName}" (${confirmedFieldKeys.length} fields)`,
      version: selectedJob.updatedDocs?.includes(docName) ? 2 : 1,
      user: CURRENT_USER_NAME
    };
    setOcrLogs(prevLogs => [newLog, ...prevLogs]);
  };

  const getLastJobWorkflowId = (shipmentRef: string) => {
    const shipmentJobs = jobs.filter(j => j.reference === shipmentRef);
    if (shipmentJobs.length === 0) return undefined;
    
    const lastJob = shipmentJobs[shipmentJobs.length - 1];
    if (!lastJob.workflowName) return undefined;
    
    const matchedWorkflow = mockWorkflows.find(w => {
      const createJobNode = w.nodes.find(n => n.type === 'create_job');
      const jobName = createJobNode?.data?.jobName || w.name;
      return lastJob.workflowName!.startsWith(jobName);
    });
    
    return matchedWorkflow?.id;
  };

  return (
    <div className="flex flex-col h-full bg-slate-50/30">
      {renderStatusGuide()}

      {/* Upload and Multi-File Grouping Modal Panel */}
      {showUploadModal && (
        <div className="fixed inset-0 z-[650] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-5xl h-[85vh] rounded-3xl overflow-hidden shadow-2xl flex flex-col border border-slate-100 font-sans">
            {/* Header */}
            <div className="p-6 border-b border-slate-100 bg-white sticky top-0 z-10 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl border border-indigo-100">
                  <Upload size={20} className="animate-pulse" />
                </div>
                <div>
                  <h3 className="font-black text-slate-800 tracking-tight text-lg leading-tight antialiased">
                    {LOCAL_T[language].uploadManageTitle}
                  </h3>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-0.5 max-w-xl">
                    {LOCAL_T[language].uploadManageSubtitle}
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setShowUploadModal(false);
                  setUploadedLocalFiles([]);
                  setSessionGroups([]);
                  setSelectedLocalFiles(new Set());
                  setGroupNameInput('');
                }}
                className="p-2 hover:bg-slate-100 rounded-[4px] text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
                id="close-upload-modal-btn"
              >
                <X size={20} />
              </button>
            </div>

            {/* Split Grid */}
            <div className="flex-1 overflow-hidden flex divide-x divide-slate-100 bg-slate-50/20">
              {/* Left Pane - Upload files */}
              <div className="w-1/2 p-6 flex flex-col overflow-auto">
                {/* Drag and Drop Zone */}
                <div
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  onClick={() => document.getElementById('local-file-uploader')?.click()}
                  className={`border-2 border-dashed rounded-2xl p-8 flex flex-col items-center justify-center text-center cursor-pointer transition-all duration-300 ${
                    isDragging 
                      ? 'border-indigo-500 bg-indigo-50/50 scale-[0.99] shadow-inner shadow-indigo-100' 
                      : 'border-slate-200 bg-white hover:border-indigo-400 hover:bg-indigo-50/10'
                  }`}
                  id="dropzone-container"
                >
                  <input
                    type="file"
                    id="local-file-uploader"
                    multiple
                    accept=".pdf,.xlsx,.xls,.xml,.jpg,.jpeg,.png"
                    className="hidden"
                    onChange={handleFileInputChange}
                  />
                  <div className="w-12 h-12 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-500 mb-4 shadow-sm border border-indigo-100">
                    <Upload size={22} />
                  </div>
                  <p className="text-xs font-black text-slate-700 uppercase tracking-wider">
                    {LOCAL_T[language].dropzonePlaceholder}
                  </p>
                  <p className="text-[9px] font-bold text-slate-400 mt-1 uppercase tracking-widest">
                    {LOCAL_T[language].dropzoneSub}
                  </p>
                </div>

                {/* Uploaded Files Section */}
                <div className="mt-6 flex-1 flex flex-col overflow-hidden">
                  <h4 className="text-[10px] font-black text-slate-400 tracking-widest uppercase mb-3 flex items-center justify-between">
                    <span>
                      {LOCAL_T[language].newUploadedHeader.replace('%count%', String(uploadedLocalFiles.length))}
                    </span>
                    {uploadedLocalFiles.length > 0 && (
                      <span className="text-[9px] text-indigo-500 lowercase font-bold tracking-tight bg-indigo-50 border border-indigo-100/50 px-1.5 py-0.5 rounded-full">
                        {language === 'TH' ? 'คลิกเลือกไฟล์เพื่อนำไปจัดกลุ่ม' : 'Select files to group'}
                      </span>
                    )}
                  </h4>
                  {uploadedLocalFiles.length === 0 ? (
                    <div className="flex-1 flex flex-col items-center justify-center border border-dashed border-slate-200/60 rounded-2xl p-8 bg-white/50 text-slate-400">
                      <FileIcon size={32} className="opacity-25 mb-2.5" />
                      <p className="text-[10px] font-bold uppercase tracking-wider opacity-60 text-center">
                        {LOCAL_T[language].noFilesUploaded}
                      </p>
                    </div>
                  ) : (
                    <div className="flex-1 overflow-auto pr-1 flex flex-col gap-2">
                      {uploadedLocalFiles.map(file => {
                        const isSelected = selectedLocalFiles.has(file.id);
                        return (
                          <div
                            key={file.id}
                            onClick={() => {
                              const next = new Set(selectedLocalFiles);
                              if (next.has(file.id)) {
                                next.delete(file.id);
                              } else {
                                next.add(file.id);
                              }
                              setSelectedLocalFiles(next);
                            }}
                            className={`p-3 rounded-2xl border transition-all duration-200 flex items-center justify-between group/file cursor-pointer ${
                              isSelected
                                ? 'bg-indigo-50 border-indigo-200 shadow-sm shadow-indigo-100/50'
                                : 'bg-white border-slate-150 hover:bg-slate-50 hover:border-slate-250 hover:shadow-sm'
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              {/* Checkbox */}
                              <div className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${
                                isSelected ? 'bg-indigo-600 border-indigo-600 text-white' : 'border-slate-300 bg-white group-hover/file:border-indigo-400'
                              }`}>
                                {isSelected && <Check size={10} strokeWidth={4} />}
                              </div>
                              {/* File icon */}
                              <div className={`p-2 rounded-xl border ${isSelected ? 'bg-indigo-100/50 text-indigo-600 border-indigo-200/50' : 'bg-slate-50 text-slate-400 border-slate-200'}`}>
                                <FileIcon size={14} />
                              </div>
                              <div className="flex flex-col text-left">
                                <span className={`text-[11px] font-bold truncate max-w-[200px] leading-tight ${isSelected ? 'text-indigo-900' : 'text-slate-700'}`}>
                                  {file.name}
                                </span>
                                <span className="text-[8px] font-mono text-slate-400 leading-none mt-0.5 font-bold">
                                  {(file.size / 1024).toFixed(1)} KB
                                </span>
                              </div>
                            </div>
                            
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleRemoveLocalFile(file.id);
                              }}
                              className="p-1.5 hover:bg-rose-50 rounded-[4px] text-slate-300 hover:text-rose-500 transition-colors opacity-0 group-hover/file:opacity-100 cursor-pointer"
                            >
                              <Trash2 size={12} />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>

              {/* Right Pane - Column Grouping Tool */}
              <div className="w-1/2 p-6 flex flex-col justify-between overflow-auto bg-slate-50/30">
                <div className="flex flex-col gap-6">
                  {/* Group Form */}
                  <div className="bg-white border border-slate-150 rounded-2xl p-5 shadow-sm text-left">
                    <h3 className="text-[11px] font-black uppercase tracking-widest text-slate-800 flex items-center gap-2 mb-1.5 antialiased">
                      <Columns size={12} className="text-indigo-500 shrink-0" />
                      {LOCAL_T[language].groupHeading}
                    </h3>
                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-4 leading-relaxed">
                      {LOCAL_T[language].groupHelpText}
                    </p>

                    <div className="flex flex-col gap-3">
                      <div className="flex flex-col text-left">
                        <label className="text-[8px] font-black tracking-widest uppercase text-slate-400 mb-1">
                          {language === 'TH' ? 'ชื่อกลุ่ม (Column Group Name)' : 'Group name'}
                        </label>
                        <input
                          type="text"
                          placeholder={LOCAL_T[language].groupNamePlaceholder}
                          value={groupNameInput}
                          onChange={(e) => setGroupNameInput(e.target.value)}
                          className="w-full text-xs font-bold border border-slate-200 outline-none p-3.5 rounded-xl focus:border-indigo-500 focus:ring-1 focus:ring-indigo-100 transition-all bg-slate-50/50"
                        />
                      </div>
                      <button
                        onClick={() => {
                          const filesToGroup = uploadedLocalFiles.filter(f => selectedLocalFiles.has(f.id));
                          if (filesToGroup.length === 0) {
                            alert(LOCAL_T[language].errorSelectFiles);
                            return;
                          }
                          const name = groupNameInput.trim() || (language === 'TH' ? `กลุ่ม Invoice ${sessionGroups.length + 1}` : `Invoice Group ${sessionGroups.length + 1}`);
                          
                          const newGroup = {
                            id: `group-${Date.now()}`,
                            name: `${name} (${filesToGroup.length} files)`,
                            files: filesToGroup
                          };
                          
                          setSessionGroups(prev => [...prev, newGroup]);
                          setUploadedLocalFiles(prev => prev.filter(f => !selectedLocalFiles.has(f.id)));
                          setSelectedLocalFiles(new Set());
                          setGroupNameInput('');
                        }}
                        disabled={selectedLocalFiles.size === 0}
                        className="w-full py-3 px-4 rounded-[4px] font-black text-[10px] uppercase tracking-widest transition-all text-white bg-indigo-600 disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed hover:bg-indigo-700 hover:-translate-y-0.5 active:translate-y-0 flex items-center justify-center gap-2 shadow-md shadow-indigo-100/50 cursor-pointer"
                      >
                        <Plus size={14} />
                        {LOCAL_T[language].btnGroupSelected}
                      </button>
                    </div>
                  </div>

                  {/* Active Groups Ready for Column Import */}
                  <div className="flex flex-col text-left">
                    <h4 className="text-[10px] font-black text-slate-400 tracking-widest uppercase mb-3 text-left">
                      {LOCAL_T[language].activeGroupsLabel.replace('%count%', String(sessionGroups.length))}
                    </h4>
                    {sessionGroups.length === 0 ? (
                      <div className="p-5 border border-dashed border-slate-200/70 rounded-2xl bg-white text-center text-slate-400">
                        <p className="text-[9px] font-bold uppercase tracking-widest opacity-60">
                          {language === 'TH' ? 'ยังไม่ได้จัดกลุ่ม (ไฟล์เดี่ยวจะถูกนำเข้าแยกปกติ)' : 'No groups created yet. (Ungrouped files will import individually)'}
                        </p>
                      </div>
                    ) : (
                      <div className="flex flex-col gap-2 max-h-[200px] overflow-auto pr-1">
                        {sessionGroups.map(group => (
                          <div
                            key={group.id}
                            className="p-4 bg-white border border-indigo-100 rounded-2xl flex items-start justify-between shadow-sm animate-in zoom-in-95 duration-200 text-left"
                          >
                            <div className="flex items-start gap-3">
                              <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl border border-indigo-100/50 mt-0.5">
                                <Columns size={12} strokeWidth={2.5} />
                              </div>
                              <div className="flex flex-col text-left">
                                <span className="text-[12px] font-black text-slate-800 tracking-tight leading-snug">
                                  {group.name}
                                </span>
                                <div className="flex items-center gap-1.5 flex-wrap mt-2">
                                  {group.files.map(gf => (
                                    <span key={gf.id} className="text-[7.5px] font-black uppercase text-indigo-700 bg-indigo-50/50 border border-indigo-100/50 px-1.5 py-0.5 rounded-md flex items-center gap-1 leading-none">
                                      <FileIcon size={8} />
                                      {gf.name}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            </div>
                            
                            <button
                              onClick={() => handleRemoveGroup(group.id)}
                              className="p-1 px-2.5 bg-slate-50 hover:bg-rose-50 text-slate-400 hover:text-rose-500 rounded-[4px] border border-slate-200 hover:border-rose-200 transition-colors text-[9px] font-black uppercase tracking-wider shrink-0 cursor-pointer"
                            >
                              {language === 'TH' ? 'ยกเลิก' : 'Ungroup'}
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Individual Ungrouped Files List */}
                  {uploadedLocalFiles.length > 0 && (
                    <div className="flex flex-col text-left border-t border-slate-100/80 pt-4">
                      <h4 className="text-[10px] font-black text-slate-400 tracking-widest uppercase mb-2">
                        {LOCAL_T[language].individualFilesLabel.replace('%count%', String(uploadedLocalFiles.length))}
                      </h4>
                      <div className="flex flex-wrap gap-1.5 max-h-[85px] overflow-auto">
                        {uploadedLocalFiles.map(file => (
                          <span key={file.id} className="text-[8px] font-bold text-slate-600 bg-white border border-slate-200 px-2 py-1 rounded-lg flex items-center gap-1 shadow-sm leading-none">
                            <span className="w-1.5 h-1.5 rounded-full bg-slate-300"></span>
                            {file.name}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Confirm Import Bottom Row */}
                <div className="border-t border-slate-100 pt-5 mt-6 flex flex-col gap-4">
                  {/* Auto OCR Option Toggle */}
                  <label className="flex items-center gap-3 cursor-pointer self-start p-1.5 hover:bg-slate-100/50 rounded-lg group select-none transition-colors">
                    <input
                      type="checkbox"
                      checked={autoStartOCR}
                      onChange={(e) => setAutoStartOCR(e.target.checked)}
                      className="w-4 h-4 rounded text-indigo-600 border-slate-300 focus:ring-indigo-100 shrink-0 cursor-pointer"
                    />
                    <span className="text-[10px] font-bold text-slate-600 uppercase tracking-wide group-hover:text-slate-800 leading-none">
                      {LOCAL_T[language].autoOCRLabel}
                    </span>
                  </label>

                  <button
                    onClick={handleImportUploadedDocs}
                    className="w-full py-4 rounded-[4px] font-black text-xs uppercase tracking-widest transition-all text-white bg-indigo-600 hover:bg-indigo-700 shadow-xl shadow-indigo-500/20 hover:-translate-y-0.5 active:translate-y-0 cursor-pointer"
                    id="submit-upload-import-btn"
                  >
                    {LOCAL_T[language].importToJob}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Replace Column File Modal */}
      {showReplaceModal && (
        <div className="fixed inset-0 z-[660] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-2xl max-h-[90vh] rounded-3xl overflow-hidden shadow-2xl flex flex-col border border-slate-100 font-sans">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl border border-blue-100">
                  <ArrowLeftRight size={20} />
                </div>
                <div>
                  <h3 className="font-black text-slate-800 tracking-tight text-lg leading-tight antialiased">
                    {LOCAL_T[language].replaceModalTitle}
                  </h3>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-0.5">
                    {LOCAL_T[language].replaceModalSubtitle.replace('%column%', replaceTargetColumn || '')}
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setShowReplaceModal(false);
                  setReplaceTargetColumn(null);
                  setReplaceUploadedFiles([]);
                  setReplacePreviewFileId(null);
                  setReplaceIsResubmission(false);
                  setReplaceMode('replace');
                }}
                className="p-2 hover:bg-slate-100 rounded-[4px] text-slate-400 transition-colors"
                id="close-replace-modal-btn"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-6 bg-slate-50/30 flex flex-col gap-6 overflow-y-auto flex-1 min-h-0 custom-scrollbar">
              {/* Drag and Drop Zone */}
              <div
                onDragOver={handleReplaceDragOver}
                onDragLeave={handleReplaceDragLeave}
                onDrop={handleReplaceDrop}
                onClick={() => document.getElementById('replace-file-uploader')?.click()}
                className={`border-2 border-dashed rounded-2xl p-8 flex flex-col items-center justify-center text-center cursor-pointer transition-all duration-300 ${
                  replaceIsDragging 
                    ? 'border-blue-500 bg-blue-50/50 scale-[0.99] shadow-inner shadow-blue-100' 
                    : 'border-slate-200 bg-white hover:border-blue-400 hover:bg-blue-50/10'
                }`}
                id="replace-dropzone-container"
              >
                <input
                  type="file"
                  id="replace-file-uploader"
                  multiple
                  accept=".pdf,.xlsx,.xls,.xml,.jpg,.jpeg,.png"
                  className="hidden"
                  onChange={handleReplaceFileInputChange}
                />
                <div className="w-12 h-12 rounded-full bg-blue-50 flex items-center justify-center text-blue-500 mb-4 shadow-sm border border-blue-100">
                  <Upload size={22} />
                </div>
                <p className="text-xs font-black text-slate-700 uppercase tracking-wider">
                  {LOCAL_T[language].dropzonePlaceholder}
                </p>
                <p className="text-[9px] font-bold text-slate-400 mt-1 uppercase tracking-widest">
                  {LOCAL_T[language].dropzoneSub}
                </p>
              </div>

              {/* Uploaded Files Section */}
              {replaceUploadedFiles.length > 0 && (
                <div className="flex flex-col gap-2.5 border border-slate-150 rounded-xl p-3 bg-white shadow-sm">
                  <h4 className="text-xs font-black text-slate-400 tracking-widest uppercase mb-1">
                    {LOCAL_T[language].newUploadedHeader.replace('%count%', String(replaceUploadedFiles.length))}
                  </h4>
                  {replaceUploadedFiles.map(file => (
                    <div key={file.id} className="p-3 rounded-xl border border-blue-100 bg-blue-50/30 flex flex-col gap-2.5 group/replaceFile" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-between">
                        <div
                          className="flex items-center gap-3 min-w-0 cursor-pointer"
                          onClick={() => setReplacePreviewFileId(file.id)}
                          title={language === 'TH' ? 'คลิกเพื่อดูตัวอย่างไฟล์' : 'Click to preview file'}
                        >
                          <div className="p-2 rounded-lg bg-white text-blue-500 border border-blue-100 shadow-sm shrink-0">
                            <FileIcon size={16} />
                          </div>
                          <div className="flex flex-col text-left min-w-0">
                            <span className="text-sm font-bold text-blue-900 truncate max-w-[260px] leading-tight hover:underline">
                              {file.name}
                            </span>
                            <span className="text-[11px] font-mono text-slate-400 leading-none mt-1 font-bold">
                              {(file.size / 1024).toFixed(1)} KB
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            onClick={() => setReplacePreviewFileId(file.id)}
                            className="p-2 hover:bg-blue-50 rounded-[4px] text-slate-300 hover:text-blue-500 transition-colors"
                            title={language === 'TH' ? 'ดูตัวอย่างไฟล์' : 'Preview file'}
                          >
                            <Eye size={16} />
                          </button>
                          <button
                            onClick={() => handleRemoveReplaceFile(file.id)}
                            className="p-2 hover:bg-rose-50 rounded-[4px] text-slate-300 hover:text-rose-500 transition-colors"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>

                      {/* Per-file page selection — which pages of this file to run OCR on */}
                      <div className="flex items-center gap-2 pl-1">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest shrink-0">
                          {language === 'TH' ? 'หน้าที่จะอ่าน:' : 'Pages to read:'}
                        </span>
                        <div className="flex items-center gap-0.5 bg-white border border-slate-200 rounded-[4px] p-0.5 shrink-0">
                          <button
                            onClick={() => setReplaceFilePageMode(file.id, 'all')}
                            className={`px-3 py-1 rounded-[3px] text-[10px] font-black uppercase tracking-widest transition-all cursor-pointer ${
                              file.pageMode === 'all' ? 'bg-blue-500 text-white shadow-sm' : 'text-slate-400 hover:text-slate-600'
                            }`}
                          >
                            {language === 'TH' ? 'ทั้งหมด' : 'All'}
                          </button>
                          <button
                            onClick={() => setReplaceFilePageMode(file.id, 'custom')}
                            className={`px-3 py-1 rounded-[3px] text-[10px] font-black uppercase tracking-widest transition-all cursor-pointer ${
                              file.pageMode === 'custom' ? 'bg-blue-500 text-white shadow-sm' : 'text-slate-400 hover:text-slate-600'
                            }`}
                          >
                            {language === 'TH' ? 'เลือกเอง' : 'Custom'}
                          </button>
                        </div>
                      </div>
                      {file.pageMode === 'custom' && (
                        <input
                          type="text"
                          value={file.pageRange}
                          onChange={(e) => setReplaceFilePageRange(file.id, e.target.value)}
                          placeholder={
                            language === 'TH'
                              ? 'เช่น 1-3, 5, 8-10 (หน้าติดกันใช้ - / ข้ามหน้าใช้ , คั่น)'
                              : 'e.g. 1-3, 5, 8-10 (use - for consecutive pages, , to skip)'
                          }
                          className="w-full text-xs px-3 py-2 rounded-[4px] border border-slate-200 text-slate-700 placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-300"
                        />
                      )}

                      {/* Per-file template — required, [Brand]_[Doctype] built from the target column */}
                      <div className="flex items-center gap-2 pl-1">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest shrink-0">
                          {language === 'TH' ? 'Template:' : 'Template:'}
                        </span>
                        <select
                          value={file.templateName}
                          onChange={(e) => setReplaceFileTemplateName(file.id, e.target.value)}
                          className="flex-1 min-w-0 text-xs px-3 py-2 rounded-[4px] border border-slate-200 text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-300"
                        >
                          <option value="">{language === 'TH' ? '-- เลือก Template --' : '-- Select Template --'}</option>
                          {REPLACE_FILE_TEMPLATE_BRANDS.map(brand => {
                            const templateName = `${brand}_${replaceTargetColumn || ''}`;
                            return <option key={brand} value={templateName}>{templateName}</option>;
                          })}
                        </select>
                      </div>
                    </div>
                  ))}
                  <div className="text-xs font-bold text-amber-600 bg-amber-50 p-2.5 rounded-lg flex items-center gap-2 mt-2">
                    <Info size={14} />
                    {language === 'TH' ? 'ไฟล์ทั้งหมดที่อัปโหลดด้านบน ข้อมูลที่สกัดออกมาได้จะถูกนำมารวมกันและแสดงอยู่ในคอลัมน์เดียวกัน' : 'The data extracted from all the files uploaded above will be combined and shown in the same column'}
                  </div>
                </div>
              )}

              {/* Replace vs Merge — only relevant from the 2nd upload onward on this column,
                  since the first upload has no existing dataset to replace or merge into. */}
              {replaceIsResubmission && (
                <div className="flex flex-col gap-2.5">
                  <h4 className="text-xs font-black text-slate-400 tracking-widest uppercase mb-0.5">
                    {language === 'TH' ? 'วิธีนำเข้าไฟล์ชุดใหม่' : 'How to import the new files'}
                  </h4>
                  <div className="grid grid-cols-2 gap-3">
                    <label
                      className={`flex flex-col gap-1.5 p-3.5 rounded-xl border-2 cursor-pointer transition-all ${
                        replaceMode === 'replace' ? 'border-blue-500 bg-blue-50/50 shadow-sm' : 'border-slate-200 bg-white hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <input
                          type="radio"
                          name="replace-mode"
                          checked={replaceMode === 'replace'}
                          onChange={() => setReplaceMode('replace')}
                          className="w-3.5 h-3.5 text-blue-600 focus:ring-blue-100 cursor-pointer"
                        />
                        <span className="text-xs font-black text-slate-800 uppercase tracking-wide">
                          {language === 'TH' ? 'ทับชุดเดิม' : 'Replace'}
                        </span>
                      </div>
                      <p className="text-[10px] font-bold text-slate-400 leading-relaxed pl-5">
                        {language === 'TH'
                          ? 'เอาไฟล์ชุดใหม่ทั้งชุดไปแทนที่ชุดเดิมทั้งหมด ไม่ว่าชุดเก่าหรือชุดใหม่จะมีจำนวนไฟล์เท่ากันหรือไม่'
                          : 'Replace the entire old set with the new one, regardless of how many files are in either set.'}
                      </p>
                    </label>
                    <label
                      className={`flex flex-col gap-1.5 p-3.5 rounded-xl border-2 cursor-pointer transition-all ${
                        replaceMode === 'merge' ? 'border-blue-500 bg-blue-50/50 shadow-sm' : 'border-slate-200 bg-white hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <input
                          type="radio"
                          name="replace-mode"
                          checked={replaceMode === 'merge'}
                          onChange={() => setReplaceMode('merge')}
                          className="w-3.5 h-3.5 text-blue-600 focus:ring-blue-100 cursor-pointer"
                        />
                        <span className="text-xs font-black text-slate-800 uppercase tracking-wide">
                          {language === 'TH' ? 'รวมกับชุดเดิม' : 'Merge'}
                        </span>
                      </div>
                      <p className="text-[10px] font-bold text-slate-400 leading-relaxed pl-5">
                        {language === 'TH'
                          ? 'นำข้อมูลจากไฟล์ชุดใหม่ไปต่อรวมกับชุดข้อมูลเดิมที่อ่านไฟล์ (OCR) ไปแล้ว'
                          : "Append the new files' data onto the existing dataset that has already been OCR'd."}
                      </p>
                    </label>
                  </div>
                </div>
              )}
            </div>

            {/* Action Buttons — kept outside the scrollable body so they stay reachable
                even when the uploaded-files list pushes the modal past the viewport. */}
            <div className="p-6 pt-4 border-t border-slate-100 flex flex-col gap-4 bg-white shrink-0">
              <label className="flex items-center gap-3 cursor-pointer p-1.5 hover:bg-slate-100/50 rounded-lg group select-none transition-colors w-fit">
                <input
                  type="checkbox"
                  checked={replaceAutoStartOCR}
                  onChange={(e) => setReplaceAutoStartOCR(e.target.checked)}
                  className="w-4 h-4 rounded text-blue-600 border-slate-300 focus:ring-blue-100 shrink-0 cursor-pointer"
                />
                <span className="text-[10px] font-bold text-slate-600 uppercase tracking-wide group-hover:text-slate-800 leading-none">
                  {LOCAL_T[language].autoOCRLabel}
                </span>
              </label>
              <button
                onClick={handleConfirmReplace}
                className="w-full py-4 rounded-[4px] font-black text-xs uppercase tracking-widest transition-all text-white bg-[#1f5df9] hover:bg-[#104BE3] shadow-xl shadow-[#1f5df9]/20 hover:-translate-y-0.5 active:translate-y-0 cursor-pointer disabled:bg-slate-300 disabled:shadow-none disabled:cursor-not-allowed"
                disabled={replaceUploadedFiles.length === 0 || replaceUploadedFiles.some(f => (f.pageMode === 'custom' && !f.pageRange.trim()) || !f.templateName)}
                id="submit-replace-import-btn"
              >
                {LOCAL_T[language].btnConfirmReplace}
                {replaceUploadedFiles.length > 0 && (
                  language === 'TH'
                    ? ` (${replaceUploadedFiles.length} ไฟล์)`
                    : ` (${replaceUploadedFiles.length} ${replaceUploadedFiles.length === 1 ? 'file' : 'files'})`
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Preview overlay for files just picked in the Replace & Merge uploader —
          switch between the uploaded files via the tab strip, PDFs render inline. */}
      {replacePreviewFileId && (() => {
        const previewFile = replaceUploadedFiles.find(f => f.id === replacePreviewFileId);
        if (!previewFile) return null;
        const isPdf = previewFile.type === 'application/pdf' || previewFile.name.toLowerCase().endsWith('.pdf');
        const isImage = previewFile.type.startsWith('image/') || /\.(jpe?g|png)$/i.test(previewFile.name);
        const previewFormat = detectFileFormat(previewFile.name);
        return (
          <div className="fixed inset-0 z-[670] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white w-[90vw] max-w-5xl h-[88vh] rounded-2xl overflow-hidden shadow-2xl flex flex-col font-sans">
              <div className="px-5 py-4 border-b border-slate-100 flex items-start justify-between gap-4 shrink-0">
                <div className="flex flex-col gap-1.5 min-w-0">
                  {replaceUploadedFiles.length > 1 && (
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                      {language === 'TH' ? 'สลับดูไฟล์:' : 'Switch file:'}
                    </span>
                  )}
                  <div className="flex items-center gap-2 overflow-x-auto">
                    {replaceUploadedFiles.map(f => (
                      <button
                        key={f.id}
                        onClick={() => setReplacePreviewFileId(f.id)}
                        className={`px-3 py-1.5 rounded-[4px] text-xs font-bold whitespace-nowrap transition-all shrink-0 ${
                          f.id === replacePreviewFileId
                            ? 'bg-[#1f5df9] text-white shadow-sm'
                            : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                        }`}
                      >
                        {f.name}
                      </button>
                    ))}
                  </div>
                </div>
                <button
                  onClick={() => setReplacePreviewFileId(null)}
                  className="p-2 hover:bg-slate-100 rounded-[4px] text-slate-400 hover:text-slate-600 transition-colors shrink-0"
                >
                  <X size={18} />
                </button>
              </div>
              <div className="flex-1 bg-slate-100 min-h-0">
                {isPdf && replacePreviewUrl ? (
                  <iframe src={replacePreviewUrl} title={previewFile.name} className="w-full h-full border-0" />
                ) : isImage && replacePreviewUrl ? (
                  <div className="w-full h-full flex items-center justify-center p-6 bg-slate-900/5">
                    <img src={replacePreviewUrl} alt={previewFile.name} className="max-w-full max-h-full object-contain rounded-lg shadow-lg" />
                  </div>
                ) : previewFormat === 'excel' ? (
                  !replacePreviewParsed || replacePreviewParsed.kind !== 'excel' && replacePreviewParsed.kind !== 'error' ? (
                    <div className="w-full h-full flex flex-col items-center justify-center gap-3 text-[#0f5c31] bg-[#f3f6f3]">
                      <Loader2 size={28} className="animate-spin" />
                      <p className="text-xs font-bold text-[#0f5c31]/60">{language === 'TH' ? 'กำลังอ่านไฟล์ Excel...' : 'Reading Excel file...'}</p>
                    </div>
                  ) : replacePreviewParsed.kind === 'error' ? (
                    <div className="w-full h-full flex flex-col items-center justify-center gap-3 text-[#0f5c31] bg-[#f3f6f3]">
                      <div className="w-16 h-16 rounded-2xl bg-[#107C41] flex items-center justify-center text-white shadow-lg">
                        <FileSpreadsheet size={28} />
                      </div>
                      <p className="text-sm font-black">{previewFile.name}</p>
                      <p className="text-xs font-bold text-[#0f5c31]/60">{language === 'TH' ? 'ไม่สามารถอ่านไฟล์นี้ได้' : 'Could not read this file'}</p>
                      {replacePreviewUrl && (
                        <a
                          href={replacePreviewUrl}
                          download={previewFile.name}
                          className="flex items-center gap-2 px-4 py-2 rounded-[4px] bg-[#107C41] text-white text-xs font-bold hover:bg-[#0d6836] transition-colors mt-1"
                        >
                          <Download size={14} />
                          {language === 'TH' ? 'ดาวน์โหลดไฟล์' : 'Download file'}
                        </a>
                      )}
                    </div>
                  ) : (
                    <div className="w-full h-full overflow-auto bg-white">
                      <div className="bg-[#107C41] text-white px-4 py-2 flex items-center gap-2 sticky top-0 z-10">
                        <FileSpreadsheet size={15} />
                        <span className="text-xs font-black tracking-tight truncate">{previewFile.name}</span>
                        {(replacePreviewParsed.truncatedRows || replacePreviewParsed.truncatedCols) && (
                          <span className="text-[10px] font-bold text-white/70 ml-auto shrink-0">
                            {language === 'TH' ? 'แสดงบางส่วน' : 'Showing partial data'}
                          </span>
                        )}
                      </div>
                      <table className="border-collapse text-[11px] font-sans">
                        <thead>
                          <tr>
                            <th className="sticky left-0 bg-[#e8f0e9] border-b border-r border-[#c7d6c9] w-9 h-6 z-10" />
                            {(replacePreviewParsed.rows[0] || []).map((_, colIdx) => (
                              <th key={colIdx} className="bg-[#e8f0e9] border-b border-r border-[#c7d6c9] min-w-[110px] h-6 text-[10px] font-black text-slate-500">
                                {String.fromCharCode(65 + (colIdx % 26))}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {replacePreviewParsed.rows.map((row, rowIdx) => (
                            <tr key={rowIdx}>
                              <td className="sticky left-0 bg-[#f3f6f3] border-b border-r border-[#c7d6c9] text-center text-[10px] font-bold text-slate-400">{rowIdx + 1}</td>
                              {row.map((cell, colIdx) => (
                                <td key={colIdx} className="border-b border-r border-[#e3e8e4] px-2 py-1 text-slate-700 truncate max-w-[220px]">
                                  {cell === null || cell === undefined ? '' : String(cell)}
                                </td>
                              ))}
                            </tr>
                          ))}
                          {replacePreviewParsed.rows.length === 0 && (
                            <tr><td className="p-6 text-center text-slate-300 font-bold text-xs" colSpan={1}>{language === 'TH' ? 'ไม่มีข้อมูลในชีตแรก' : 'No data in the first sheet'}</td></tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  )
                ) : previewFormat === 'xml' ? (
                  !replacePreviewParsed || replacePreviewParsed.kind !== 'xml' && replacePreviewParsed.kind !== 'error' ? (
                    <div className="w-full h-full flex flex-col items-center justify-center gap-3 text-slate-200 bg-[#1e1e1e]">
                      <Loader2 size={28} className="animate-spin text-sky-400" />
                      <p className="text-xs font-bold text-slate-400">{language === 'TH' ? 'กำลังอ่านไฟล์ XML...' : 'Reading XML file...'}</p>
                    </div>
                  ) : replacePreviewParsed.kind === 'error' ? (
                    <div className="w-full h-full flex flex-col items-center justify-center gap-3 text-slate-200 bg-[#1e1e1e]">
                      <div className="w-16 h-16 rounded-2xl bg-sky-500/20 border border-sky-400/30 flex items-center justify-center text-sky-400">
                        <FileCode size={28} />
                      </div>
                      <p className="text-sm font-black font-mono">{previewFile.name}</p>
                      <p className="text-xs font-bold text-slate-400">{language === 'TH' ? 'ไม่สามารถอ่านไฟล์นี้ได้' : 'Could not read this file'}</p>
                      {replacePreviewUrl && (
                        <a
                          href={replacePreviewUrl}
                          download={previewFile.name}
                          className="flex items-center gap-2 px-4 py-2 rounded-[4px] bg-sky-500 text-white text-xs font-bold hover:bg-sky-600 transition-colors mt-1"
                        >
                          <Download size={14} />
                          {language === 'TH' ? 'ดาวน์โหลดไฟล์' : 'Download file'}
                        </a>
                      )}
                    </div>
                  ) : (
                    <div className="w-full h-full overflow-auto bg-[#1e1e1e]">
                      <div className="bg-[#252526] text-slate-300 px-4 py-2 flex items-center gap-2 border-b border-black/40 sticky top-0 z-10">
                        <FileCode size={15} className="text-sky-400" />
                        <span className="text-xs font-bold tracking-tight truncate">{previewFile.name}</span>
                        {replacePreviewParsed.truncated && (
                          <span className="text-[10px] font-bold text-slate-500 ml-auto shrink-0">
                            {language === 'TH' ? 'แสดงบางส่วน' : 'Showing partial content'}
                          </span>
                        )}
                      </div>
                      <div className="p-4 leading-relaxed font-mono text-[12px]">
                        {replacePreviewParsed.lines.map((line, idx) => (
                          <div key={idx} className="flex">
                            <span className="w-8 text-right pr-3 text-slate-600 select-none shrink-0">{idx + 1}</span>
                            <span className="whitespace-pre">{renderXmlLineTokens(line)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center gap-3 text-slate-400">
                    <FileIcon size={40} />
                    <p className="text-sm font-bold">
                      {language === 'TH' ? 'ไม่รองรับการแสดงตัวอย่างไฟล์ประเภทนี้' : 'Preview not supported for this file type'}
                    </p>
                    {replacePreviewUrl && (
                      <a
                        href={replacePreviewUrl}
                        download={previewFile.name}
                        className="flex items-center gap-2 px-4 py-2 rounded-[4px] bg-[#1f5df9] text-white text-xs font-bold hover:bg-[#104BE3] transition-colors"
                      >
                        <Download size={14} />
                        {language === 'TH' ? 'ดาวน์โหลดไฟล์' : 'Download file'}
                      </a>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })()}

      {/* PDF View Overlay Side-by-side */}
      {pdfPreviewUrl && (
        <div className="fixed inset-0 z-[600] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white w-[96vw] max-w-7xl h-[92vh] rounded-2xl overflow-hidden shadow-2xl flex flex-col font-sans">
            
            {/* Topbar matching original with title, status, save indicator, activity logs, and close */}
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-white sticky top-0 z-10">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl">
                  <FileText size={20} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-black text-slate-800 tracking-tight text-lg leading-tight">{pdfPreviewUrl}</h3>
                    {activeBoardTab !== 'pending' && selectedJob?.docs[pdfPreviewUrl] && (() => {
                      const docStatus = selectedJob.docs[pdfPreviewUrl];
                      const isMismatched = mismatchedFileNames.has(pdfPreviewUrl);
                      const displayStatus = (docStatus === ComparisonDocStatus.MATCHED || docStatus === ComparisonDocStatus.MISMATCHED)
                        ? (isMismatched ? ComparisonDocStatus.MISMATCHED : ComparisonDocStatus.MATCHED)
                        : docStatus;
                      
                      const isMatchedOrLocked = displayStatus === ComparisonDocStatus.MATCHED || displayStatus === ComparisonDocStatus.LOCKED;
                      const isAmber = displayStatus === ComparisonDocStatus.RECEIVED || 
                                      displayStatus === ComparisonDocStatus.EXTRACTING || 
                                      displayStatus === ComparisonDocStatus.OCR_DONE;
                      const isRose = displayStatus === ComparisonDocStatus.ERROR || displayStatus === ComparisonDocStatus.MISMATCHED;

                      return (
                        <div className={`flex items-center gap-1.5 px-2.5 py-0.5 rounded-full border ${
                          isMatchedOrLocked ? 'bg-emerald-50 border-emerald-100' :
                          isAmber ? 'bg-amber-50 border-amber-100' :
                          isRose ? 'bg-rose-50 border-rose-100' :
                          'bg-slate-50 border-slate-100'
                        }`}>
                          <div className={`w-1.5 h-1.5 rounded-full ${
                            isMatchedOrLocked ? 'bg-emerald-500' :
                            displayStatus === ComparisonDocStatus.EXTRACTING ? 'bg-amber-500 animate-pulse' :
                            isAmber ? 'bg-amber-500' :
                            isRose ? 'bg-rose-500' :
                            'bg-slate-300'
                          }`}></div>
                          <span className={`text-[9px] font-black uppercase tracking-wider ${
                            isMatchedOrLocked ? 'text-emerald-500' :
                            isAmber ? 'text-amber-500' :
                            isRose ? 'text-rose-500' :
                            'text-slate-400'
                          }`}>
                            {
                              displayStatus === ComparisonDocStatus.LOCKED ? t.statusLocked :
                              (displayStatus === ComparisonDocStatus.RECEIVED || displayStatus === ComparisonDocStatus.EXTRACTING) ? t.statusReceived :
                              displayStatus === ComparisonDocStatus.OCR_DONE ? t.statusOcrDone :
                              displayStatus === ComparisonDocStatus.SKIPPED ? t.statusSkipped :
                              displayStatus === ComparisonDocStatus.MISMATCHED ? 'UNMATCHED' :
                              displayStatus
                            }
                          </span>
                        </div>
                      );
                    })()}
                    {activeBoardTab !== 'pending' && selectedJob?.updatedDocs?.includes(pdfPreviewUrl) && (
                      <span className="shrink-0 bg-blue-50 text-blue-600 text-[9px] font-black px-2 py-0.5 rounded-full border border-blue-100 flex items-center gap-1.5 uppercase tracking-wider">
                        <Save size={10} />
                        Updated file
                      </span>
                    )}
                  </div>
                </div>
              </div>
              
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setPdfPreviewUrl(null)}
                  className="w-10 h-10 rounded-[4px] bg-slate-100 text-slate-400 hover:bg-rose-500 hover:text-white transition-all flex items-center justify-center cursor-pointer"
                >
                  <XCircle size={24} />
                </button>
              </div>
            </div>



            {/* Sub-file Switcher Tab Bar */}
            {selectedJob && pdfPreviewUrl && getSubFilesForDoc(pdfPreviewUrl).length > 1 && (
              <div className="bg-slate-50/50 border-b border-slate-200/50 px-5 py-2 flex items-center gap-2 shrink-0 overflow-x-auto select-none custom-scrollbar">
                <span className="text-[10px] font-bold uppercase text-slate-400 tracking-wider mr-1.5 flex items-center gap-1">
                  <span className="w-1 h-2.5 bg-indigo-500 rounded-full inline-block"></span>
                  {language === 'TH' ? 'เลือกใบย่อยในกลุ่ม:' : 'SELECT SUB-FILE:'}
                </span>
                <div className="flex items-center gap-1.5">
                  {getSubFilesForDoc(pdfPreviewUrl).map((subFile) => {
                    const isActive = subFile.id === activeSubFileId;
                    return (
                      <button
                        key={subFile.id}
                        onClick={() => {
                          if (subFile.id === activeSubFileId) return;
                          if (hasOCRChanges) {
                            handleSaveOCR();
                          }
                          setActiveSubFileId(subFile.id);
                        }}
                        className={`flex items-center gap-1.5 px-3 py-1 rounded-[4px] border text-[11px] font-extrabold transition-all duration-200 cursor-pointer ${
                          isActive
                            ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm shadow-indigo-500/10'
                            : 'bg-white hover:bg-slate-100 text-slate-600 border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        <FileText size={11} />
                        <span>{subFile.label}</span>
                        <div className={`w-1.5 h-1.5 rounded-full ${isActive ? 'bg-white' : 'bg-emerald-500'}`} />
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Side-by-side Dual Panels */}
            <div className="flex-1 bg-slate-100 flex overflow-hidden min-h-0">
               
               {/* Left Pane: PDF Preview in grey canvas container */}
               <div className={`${activeBoardTab === 'pending' ? 'w-full' : 'w-1/2'} flex flex-col border-[#eaecf0] bg-white ${activeBoardTab === 'pending' ? '' : 'border-r'}`}>
                  
                  {/* PDF Simulator Cool Dark Chrome Toolbar */}
                  <div className="bg-[#323639] h-11 text-white flex items-center justify-between px-4 select-none shrink-0 border-b border-[#212325]">
                    
                    {/* Left: Hamburger menu & Title */}
                    <div className="flex items-center gap-3 text-[#010136]">
                      <button className="p-1 rounded-[4px] hover:bg-slate-700/60 transition-colors text-slate-200 cursor-pointer">
                        <Menu size={16} />
                      </button>
                      <span className="text-[11px] font-mono font-bold tracking-tight text-slate-300 max-w-[150px] truncate">
                        {withPreviewExtension(pdfPreviewUrl, true)}
                      </span>
                    </div>

                    {/* Middle: Page Indicator for Continuous View */}
                    <div className="flex items-center gap-2 text-slate-300">
                      <span className="text-xs font-sans font-black px-3 py-1 bg-slate-700/60 rounded-[4px] select-none tracking-wider font-mono">
                        {detectFileFormat(pdfPreviewUrl) === 'excel'
                          ? (language === 'TH' ? 'ชีต 1 จาก 1' : 'SHEET 1 OF 1')
                          : detectFileFormat(pdfPreviewUrl) === 'xml'
                          ? (language === 'TH' ? 'เอกสาร XML' : 'XML DOCUMENT')
                          : (language === 'TH' ? 'หน้า 1 - 3 (ต่อเนื่อง)' : 'PAGES 1 - 3 (CONTINUOUS)')}
                      </span>

                      <div className="w-px h-5 bg-slate-700/80 mx-2"></div>

                      {/* Zoom Controls */}
                      <button 
                        onClick={() => setZoomLevel(prev => Math.max(0.4, Number((prev - 0.1).toFixed(2))))}
                        className="w-7 h-7 flex items-center justify-center rounded-[4px] bg-slate-700/60 hover:bg-slate-600 hover:text-white transition-all text-slate-300 cursor-pointer"
                        title={language === 'TH' ? 'ย่อ (Zoom out)' : 'Zoom out'}
                      >
                        <ZoomOut size={14} className="text-white" />
                      </button>
                      <span className="text-xs font-semibold text-slate-300 w-12 text-center select-none font-mono">
                        {Math.round(zoomLevel * 100)}%
                      </span>
                      <button 
                        onClick={() => setZoomLevel(prev => Math.min(1.6, Number((prev + 0.1).toFixed(2))))}
                        className="w-7 h-7 flex items-center justify-center rounded-[4px] bg-slate-700/60 hover:bg-slate-600 hover:text-white transition-all text-slate-300 cursor-pointer"
                        title={language === 'TH' ? 'ขยาย (Zoom in)' : 'Zoom in'}
                      >
                        <ZoomIn size={14} className="text-white" />
                      </button>
                    </div>

                    {/* Right: Quick Tools */}
                    <div className="flex items-center gap-2">
                      <button 
                        onClick={() => setRotationAngle(prev => (prev + 90) % 360)}
                        className="w-7 h-7 flex items-center justify-center rounded-[4px] bg-slate-700/60 hover:bg-slate-600 hover:text-white transition-all text-slate-300 cursor-pointer"
                        title={language === 'TH' ? 'หมุนหน้า (Rotate)' : 'Rotate'}
                      >
                        <RotateCw size={14} className="text-white" />
                      </button>
                      <button 
                        onClick={() => window.print()}
                        className="w-7 h-7 flex items-center justify-center rounded-[4px] bg-slate-700/60 hover:bg-slate-600 hover:text-white transition-all text-slate-300 cursor-pointer"
                        title={language === 'TH' ? 'พิมพ์ (Print)' : 'Print Document'}
                      >
                        <Printer size={14} className="text-white" />
                      </button>
                      <button 
                        onClick={() => {
                          const format = detectFileFormat(pdfPreviewUrl);
                          const element = document.createElement("a");
                          const file = new Blob([`Simulated Local ${format.toUpperCase()} Download`], { type: 'text/plain' });
                          element.href = URL.createObjectURL(file);
                          element.download = withPreviewExtension(pdfPreviewUrl, false);
                          document.body.appendChild(element);
                          element.click();
                          document.body.removeChild(element);
                        }}
                        className="w-7 h-7 flex items-center justify-center rounded-[4px] bg-slate-700/60 hover:bg-slate-600 hover:text-white transition-all text-slate-300 cursor-pointer"
                        title={language === 'TH' ? 'ดาวน์โหลดเอกสาร' : 'Download Document'}
                      >
                        <Download size={14} className="text-white" />
                      </button>
                    </div>

                  </div>

                  {/* Gray PDF Canvas and Layout View */}
                  <div className="flex-1 bg-[#525659] overflow-auto flex items-start justify-center p-8 min-h-0 relative">
                    <div 
                      className="relative transition-all duration-300 origin-top flex flex-col gap-8 bg-transparent"
                      style={{ 
                        transform: `scale(${zoomLevel}) rotate(${rotationAngle}deg)`, 
                        marginTop: '0px'
                      }}
                    >
                      {/* Document render page based on filename */}
                      {(() => {
                        const docUpper = pdfPreviewUrl?.toUpperCase() || '';
                        const fileFormat = detectFileFormat(pdfPreviewUrl);
                        const fields = Object.entries(tempOCRData);

                        if (fileFormat === 'excel') {
                          const colLetters = ['A', 'B', 'C', 'D'];
                          return (
                            <div className="w-[820px] bg-white shadow-xl font-sans text-slate-800 overflow-hidden rounded-sm">
                              <div className="bg-[#107C41] text-white px-4 py-2.5 flex items-center gap-2">
                                <FileSpreadsheet size={16} />
                                <span className="text-xs font-black tracking-tight">{pdfPreviewUrl}</span>
                              </div>
                              <div className="grid" style={{ gridTemplateColumns: '36px repeat(4, 1fr)' }}>
                                <div className="bg-[#e8f0e9] border-b border-r border-[#c7d6c9] h-6" />
                                {colLetters.map(c => (
                                  <div key={c} className="bg-[#e8f0e9] border-b border-r border-[#c7d6c9] h-6 flex items-center justify-center text-[10px] font-black text-slate-500">{c}</div>
                                ))}
                                <div className="bg-[#f3f6f3] border-b border-r border-[#c7d6c9] h-7 flex items-center justify-center text-[10px] font-bold text-slate-400">1</div>
                                <div className="col-span-2 bg-[#dceee0] border-b border-r border-[#c7d6c9] h-7 flex items-center px-2 text-[10px] font-black uppercase tracking-wide text-[#0f5c31]">{language === 'TH' ? 'ชื่อฟิลด์' : 'Field'}</div>
                                <div className="col-span-2 bg-[#dceee0] border-b border-r border-[#c7d6c9] h-7 flex items-center px-2 text-[10px] font-black uppercase tracking-wide text-[#0f5c31]">{language === 'TH' ? 'ค่า' : 'Value'}</div>
                                {fields.length > 0 ? fields.map(([field, value], i) => (
                                  <React.Fragment key={field}>
                                    <div className="bg-[#f3f6f3] border-b border-r border-[#c7d6c9] h-7 flex items-center justify-center text-[10px] font-bold text-slate-400">{i + 2}</div>
                                    <div className={`col-span-2 border-b border-r border-[#e3e8e4] h-7 flex items-center px-2 text-[11px] font-semibold text-slate-700 truncate ${isFieldHighlightedByName(field) ? 'bg-amber-100/70' : ''}`}>{field}</div>
                                    <div className={`col-span-2 border-b border-r border-[#e3e8e4] h-7 flex items-center px-2 text-[11px] text-slate-600 truncate ${isFieldHighlightedByName(field) ? 'bg-amber-100/70' : ''}`}>{String(value)}</div>
                                  </React.Fragment>
                                )) : (
                                  <div className="col-span-5 h-24 flex items-center justify-center text-xs text-slate-300 font-bold">{language === 'TH' ? 'ไม่มีข้อมูล' : 'No data'}</div>
                                )}
                              </div>
                              <div className="bg-[#f3f6f3] border-t border-[#c7d6c9] px-3 py-1.5 flex items-center gap-2">
                                <div className="bg-white border border-[#c7d6c9] rounded-t px-3 py-1 text-[10px] font-bold text-[#0f5c31]">Sheet1</div>
                              </div>
                            </div>
                          );
                        }

                        if (fileFormat === 'xml') {
                          const rootTag = (docUpper.replace(/[^A-Z0-9]+/g, '') || 'DOCUMENT');
                          return (
                            <div className="w-[720px] bg-[#1e1e1e] shadow-xl font-mono text-[12px] rounded-sm overflow-hidden">
                              <div className="bg-[#252526] text-slate-300 px-4 py-2 flex items-center gap-2 border-b border-black/40">
                                <FileCode size={14} className="text-sky-400" />
                                <span className="text-xs font-bold tracking-tight">{pdfPreviewUrl}</span>
                              </div>
                              <div className="p-4 leading-relaxed overflow-x-auto">
                                <div className="flex"><span className="w-6 text-right pr-3 text-slate-600 select-none">1</span><span><span className="text-slate-500">{'<?xml version="1.0" encoding="UTF-8"?>'}</span></span></div>
                                <div className="flex"><span className="w-6 text-right pr-3 text-slate-600 select-none">2</span><span><span className="text-sky-400">{'<'}{rootTag}</span> <span className="text-emerald-400">source</span>=<span className="text-orange-300">"{selectedJob?.type || 'STANDARD_VERIFICATION'}"</span><span className="text-sky-400">{'>'}</span></span></div>
                                {fields.length > 0 ? fields.map(([field, value], i) => {
                                  const tag = field.replace(/[^A-Za-z0-9]+/g, '');
                                  return (
                                    <div key={field} className={`flex ${isFieldHighlightedByName(field) ? 'bg-amber-500/10' : ''}`}>
                                      <span className="w-6 text-right pr-3 text-slate-600 select-none">{i + 3}</span>
                                      <span className="pl-4">
                                        <span className="text-sky-400">{'<'}{tag}{'>'}</span>
                                        <span className="text-slate-200">{String(value)}</span>
                                        <span className="text-sky-400">{'</'}{tag}{'>'}</span>
                                      </span>
                                    </div>
                                  );
                                }) : (
                                  <div className="flex"><span className="w-6 text-right pr-3 text-slate-600 select-none">3</span><span className="pl-4 text-slate-500">{language === 'TH' ? '// ไม่มีข้อมูล' : '// no data'}</span></div>
                                )}
                                <div className="flex"><span className="w-6 text-right pr-3 text-slate-600 select-none">{fields.length + 3}</span><span><span className="text-sky-400">{'</'}{rootTag}{'>'}</span></span></div>
                              </div>
                            </div>
                          );
                        }

                        // Watermark block
                        const renderWatermark = (text: string) => (
                          <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none z-[1] overflow-hidden">
                            <div className="text-[120px] font-black uppercase text-slate-200/25 tracking-widest border-8 border-slate-200/20 px-10 py-4 rounded-3xl -rotate-12 font-sans">
                              {text}
                            </div>
                          </div>
                        );

                        if (docUpper.includes('LADING') || docUpper.includes('B / L') || docUpper.includes('B/L') || docUpper.includes('WAYBILL')) {
                          return (
                            <div className="flex flex-col gap-8">
                              {[1, 2, 3].map((pageNum) => (
                                <div key={pageNum} className="p-8 min-h-[900px] w-[680px] flex flex-col gap-6 relative bg-white font-sans text-slate-800 shadow-xl" style={{ contentVisibility: 'auto' }}>
                                  {renderWatermark('ORIGINAL')}
                                  
                                  {/* Header */}
                                  <div className="flex justify-between items-start border-b border-slate-800 pb-3 z-10">
                                    <div className="flex items-center gap-2">
                                      <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white font-extrabold text-[15px]">★</div>
                                      <span className="text-[#00243d] font-black tracking-widest text-xl font-sans">MAERSK LINE</span>
                                    </div>
                                    <div className="text-right">
                                      <h2 className="text-xs font-black text-slate-400 tracking-wider font-sans">BILL OF LADING FOR OCEAN TRANSPORT</h2>
                                      <p className="font-mono text-xs font-bold text-slate-700">B/L No. 953074879{activeSubFileId?.endsWith('_sub_2') ? '-02' : activeSubFileId?.endsWith('_sub_3') ? '-03' : '-01'}</p>
                                    </div>
                                  </div>

                                  {/* Core Info Grid */}
                                  <div className="grid grid-cols-2 border border-slate-800 text-[10px] z-10 font-sans">
                                    <div className="border-r border-b border-slate-800 p-3 space-y-1">
                                      <span className="font-black text-[9px] uppercase text-slate-400">Shipper</span>
                                      <p className="font-bold text-slate-800">TME CORP CO., LTD.</p>
                                      <p className="text-slate-500">40 DEVILS TOWER ROAD, P.O.BOX 176,</p>
                                      <p className="text-slate-500">GIBRALTAR</p>
                                    </div>
                                    <div className="border-b border-slate-800 p-3 space-y-1">
                                      <span className="font-black text-[9px] uppercase text-slate-400">Booking No. / References</span>
                                      <p className="font-bold font-mono text-slate-800">953074879{activeSubFileId?.endsWith('_sub_2') ? '-02' : activeSubFileId?.endsWith('_sub_3') ? '-03' : '-01'}</p>
                                      <span className="block font-black text-[9px] uppercase text-slate-400 mt-2">Export References</span>
                                      <p className="font-bold font-mono text-slate-800">131660-3/5</p>
                                    </div>
                                    <div className="border-r border-slate-800 p-3 space-y-1">
                                      <span className="font-black text-[9px] uppercase text-slate-400">Consignee</span>
                                      <p className="font-bold text-slate-800">UNDP - TANZANIA</p>
                                      <p className="text-slate-500">6TH FLOOR INTERNATIONAL HOUSE,</p>
                                      <p className="text-slate-500">SHAABAN ROBERT ST. GARDEN AVENUE, DAR ES SALAAM</p>
                                    </div>
                                    <div className="p-3 space-y-1">
                                      <span className="font-black text-[9px] uppercase text-slate-400">Notify Party</span>
                                      <p className="font-bold text-slate-800">SAME AS CONSIGNEE</p>
                                      <p className="text-slate-500">TEL: (+255) 22-211-2576</p>
                                      <p className="text-slate-500">EMAIL: YONAH.SAMO@UNDP.ORG</p>
                                    </div>
                                  </div>

                                  {/* Transport details */}
                                  <div className="grid grid-cols-4 border border-t-0 border-slate-800 text-[9px] z-10">
                                    <div className="border-r p-2">
                                      <span className="block font-black text-[8px] text-slate-400 uppercase">Pre-Carriage By</span>
                                      <p className="font-bold text-slate-700">VESSEL {activeSubFileId?.endsWith('_sub_2') ? 'MAERSK FLORENCE' : activeSubFileId?.endsWith('_sub_3') ? 'MAERSK GENEVA' : 'MAERSK WISCONSIN'}</p>
                                    </div>
                                    <div className="border-r p-2">
                                      <span className="block font-black text-[8px] text-slate-400 uppercase">Place of Receipt</span>
                                      <p className="font-bold text-slate-700 font-sans">SHANGHAI</p>
                                    </div>
                                    <div className={`border-r p-2 transition-colors ${isFieldHighlightedByName('Port of Loading') ? 'bg-amber-100/70' : ''}`}>
                                      <span className="block font-black text-[8px] text-slate-400 uppercase">Port of Loading</span>
                                      <p className="font-bold text-slate-700 font-sans">SHANGHAI, CHINA</p>
                                    </div>
                                    <div className={`p-2 transition-colors ${isFieldHighlightedByName('Port of Discharge') ? 'bg-amber-100/70' : ''}`}>
                                      <span className="block font-black text-[8px] text-slate-400 uppercase">Port of Discharge</span>
                                      <p className="font-bold text-slate-700 font-sans">BANGKOK, THAILAND</p>
                                    </div>
                                  </div>

                                  {/* Table Particulars */}
                                  <div className="border border-t-0 border-slate-800 z-10 flex-1 flex flex-col font-sans">
                                    <div className="bg-slate-50 border-b border-slate-800 text-center font-black py-1.5 text-[9px] uppercase tracking-wider text-slate-600">
                                      Particulars Furnished by Shipper
                                    </div>
                                    <div className="grid grid-cols-12 text-[10px] font-black uppercase text-slate-400 border-b border-slate-800 p-2">
                                      <div className="col-span-8 font-sans">Description of Packages and Goods</div>
                                      <div className="col-span-2 text-right">Gross Weight</div>
                                      <div className="col-span-2 text-right font-sans">Measurement</div>
                                    </div>
                                    <div className="flex-1 p-4 space-y-4 font-mono text-[10px]">
                                      {pageNum === 1 ? (
                                        <div className="grid grid-cols-12 text-[11px]">
                                          <div className="col-span-8 space-y-1">
                                            <p className="font-black text-slate-800">1 CONTAINER SAID TO CONTAIN 2 VEHICLES</p>
                                            <p className="text-slate-500 font-sans">VEHICLE REF AND TYPE TOYOTA LAND CRUISER GX V8 TWIN-TURBO</p>
                                            <p className="text-slate-500">CHASSIS NO. JTMHV09J-X04160007</p>
                                            <p className="text-slate-500">YEAR OF MANUF. 2026</p>
                                          </div>
                                          <div className="col-span-2 text-right font-bold text-slate-700">5,336.140 KGS</div>
                                          <div className="col-span-2 text-right font-bold text-slate-700 font-mono">38.600 CBM</div>
                                        </div>
                                      ) : pageNum === 2 ? (
                                        <div className="grid grid-cols-12 text-[11px]">
                                          <div className="col-span-8 space-y-1">
                                            <p className="font-black text-slate-800">SECOND ROW DETAILS - PARTS AND ACCESSORIES</p>
                                            <p className="text-slate-500">SPARE TYRES, JACK KIT WITH LEVER, TOOL BAG, MANUAL BOOKLET</p>
                                            <p className="text-slate-500">CONTAINER NO: MSKU {activeSubFileId?.endsWith('_sub_2') ? '6537220' : activeSubFileId?.endsWith('_sub_3') ? '6537221' : '6537219'}, SHIPPER SEAL NO: 270743</p>
                                            <p className="text-slate-500">HS COMPLIANT CARGO OF HIGHEST DEGREE VALIDATION</p>
                                          </div>
                                          <div className="col-span-2 text-right font-bold text-slate-700 font-mono">Included</div>
                                          <div className="col-span-2 text-right font-bold text-slate-700">-</div>
                                        </div>
                                      ) : (
                                        <div className="space-y-4 font-sans text-slate-400 p-8 text-center text-xs">
                                          <p className="font-bold border-b pb-2 uppercase tracking-widest text-[#010136]">Terms & Carrier Conditions</p>
                                          <p className="leading-relaxed">This carriage is subject to the terms and rules of the Ocean Association Carriage Act. Carrier standard limitation of liabilities apply as ruled in international commerce regulations. The shipper warrants the accuracy of all packages description.</p>
                                        </div>
                                      )}
                                    </div>
                                    <div className="border-t border-slate-300 p-3 bg-slate-50 text-[8px] text-slate-400 leading-normal font-sans">
                                      SHIPPED ON BOARD, DATE: 27 FEB 2015, SIGNED BY MASTER / AGENT FOR MAERSK LINE OCEAN SHIPPERS. ALL LIABILITIES SUBJECT TO CARRIER TERMS AND REGULATIONS AS SPECIFIED.
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          );
                        }

                        if (docUpper.includes('INV') || docUpper.includes('INVOICE') || docUpper.includes('ชุดข้อมูล')) {
                          return (
                            <div className="flex flex-col gap-8">
                              {[1, 2, 3].map((pageNum) => (
                                <div key={pageNum} className="p-8 min-h-[900px] w-[680px] flex flex-col gap-6 relative bg-white font-sans text-slate-800 shadow-xl" style={{ contentVisibility: 'auto' }}>
                                  {renderWatermark('INVOICE')}

                                  {/* Invoice Header */}
                                  <div className="flex justify-between items-start border-b-2 border-slate-900 pb-5 z-10">
                                    <div>
                                      <span className="text-xs font-black tracking-widest text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-sm uppercase">Commercial Invoice</span>
                                      <h1 className="text-2xl font-black tracking-tighter text-slate-800 mt-2 font-sans">GLOBAL TRADING INC.</h1>
                                      <p className="text-[11px] text-slate-400 mt-1 font-sans">123 Logistics St, Shanghai, China | exports@globaltrading.com</p>
                                    </div>
                                    <div className="text-right">
                                      <h2 className="text-lg font-black text-slate-800 tracking-tighter"># INV-2026-045{activeSubFileId?.endsWith('_sub_2') ? '-02' : '-01'}</h2>
                                      <p className="text-[11px] text-slate-400 font-mono">DATE: 20 APR 2026</p>
                                    </div>
                                  </div>

                                  {/* Client Info Grid */}
                                  <div className="grid grid-cols-2 gap-8 text-[11px] z-10 font-sans">
                                    <div className="bg-slate-50 p-4 rounded-xl space-y-1 font-sans">
                                      <span className="font-black text-[9px] uppercase tracking-wider text-slate-400">Exporter (Shipper)</span>
                                      <p className="font-extrabold text-slate-800 text-xs">GLOBAL TRADING INC.</p>
                                      <p className="text-slate-500">Shanghai Logistics Zone, Bldg A</p>
                                      <p className="text-slate-500">Contact: Exports Department</p>
                                    </div>
                                    <div className="bg-slate-50 p-4 rounded-xl space-y-1 font-sans">
                                      <span className="font-black text-[9px] uppercase tracking-wider text-slate-400 font-sans">Sold To (Consignee)</span>
                                      <p className="font-extrabold text-[#010136] text-xs font-sans font-black">BIZ-TRANS LOGISTICS CO., LTD.</p>
                                      <p className="text-slate-500 font-sans font-bold">45/2 Rama 9, Huai Khwang, Bangkok, Thailand</p>
                                      <p className="text-slate-500 font-mono">TAX ID: 010556200000{activeSubFileId?.endsWith('_sub_2') ? '2' : '0'}</p>
                                    </div>
                                  </div>

                                  {/* Delivery & Terms Panel */}
                                  <div className="grid grid-cols-3 gap-4 border border-slate-100 rounded-xl p-3 text-[10px] bg-slate-50/50 z-10 font-sans">
                                    <div>
                                      <span className="block text-[8px] font-black text-slate-400 uppercase">Incoterms</span>
                                      <p className="font-bold text-slate-700">FOB SHANGHAI, CHINA</p>
                                    </div>
                                    <div className={`transition-colors rounded ${isFieldHighlightedByName('Port of Loading') ? 'bg-amber-100/70 -m-1 p-1' : ''}`}>
                                      <span className="block text-[8px] font-black text-slate-400 uppercase">Port of Loading</span>
                                      <p className="font-bold text-slate-700">SHANGHAI, CHINA</p>
                                    </div>
                                    <div className={`transition-colors rounded ${isFieldHighlightedByName('Port of Discharge') ? 'bg-amber-100/70 -m-1 p-1' : ''}`}>
                                      <span className="block text-[8px] font-black text-slate-400 uppercase font-sans">Port of Discharge</span>
                                      <p className="font-bold text-slate-700 font-sans font-black">BANGKOK, THAILAND</p>
                                    </div>
                                  </div>

                                  {/* Itemized Table */}
                                  <div className="mt-4 border border-slate-200 rounded-xl overflow-hidden z-10 font-sans">
                                    <table className="w-full text-left text-xs font-sans">
                                      <thead>
                                        <tr className="bg-slate-900 text-white font-black uppercase tracking-wider text-[9px]">
                                          <th className="p-3">Description of Goods</th>
                                          <th className="p-3 font-mono text-center">HS Code</th>
                                          <th className="p-3 text-center">Qty / UOM</th>
                                          <th className="p-3 text-right">Price/Unit (USD)</th>
                                          <th className="p-3 text-right">Total (USD)</th>
                                        </tr>
                                      </thead>
                                      <tbody className="divide-y divide-slate-100 text-[11px] font-sans">
                                        {pageNum === 1 ? (
                                          Array.from({ length: 4 }).map((_, i) => {
                                            const itemGroup = `Item ${i + 1}`;
                                            return (
                                              <tr key={i} className="hover:bg-slate-50/50">
                                                <td className={`p-3 max-w-[240px] transition-colors ${isFieldHighlighted('Product Description', itemGroup) || isFieldHighlighted('Item No. / Model No. (SKU)', itemGroup) ? 'bg-amber-100/70' : ''}`}>
                                                  <p className={`font-bold font-sans ${isFieldHighlighted('Product Description', itemGroup) ? 'bg-amber-200/80 rounded px-1 -mx-1' : 'text-slate-800'}`}>INDUSTRIAL AUTOMATION SENSOR V{i+1}</p>
                                                  <p className={`text-[9px] font-sans ${isFieldHighlighted('Item No. / Model No. (SKU)', itemGroup) ? 'bg-amber-200/80 rounded px-1 -mx-1 text-slate-700' : 'text-slate-400'}`}>Item No: SKU-{10001 + i}</p>
                                                </td>
                                                <td className={`p-3 font-mono text-center text-slate-500 transition-colors ${isFieldHighlighted('HS Code', itemGroup) ? 'bg-amber-100/70' : ''}`}>8471.30.{15 * i + 10}</td>
                                                <td className={`p-3 text-center font-bold text-slate-700 font-mono transition-colors ${isFieldHighlighted('Q\'ty by line', itemGroup) || isFieldHighlighted('UOM', itemGroup) ? 'bg-amber-100/70' : ''}`}>{(i + 1) * 12} PCS</td>
                                                <td className={`p-3 text-right font-mono text-slate-600 transition-colors ${isFieldHighlighted('Price / Unit', itemGroup) ? 'bg-amber-100/70' : ''}`}>${15 * i + 120}.00</td>
                                                <td className={`p-3 text-right font-mono font-bold text-slate-800 transition-colors ${isFieldHighlighted('Invoice Amount', itemGroup) ? 'bg-amber-100/70' : ''}`}>${((i + 1) * 12) * (15 * i + 120)}.00</td>
                                              </tr>
                                            );
                                          })
                                        ) : pageNum === 2 ? (
                                          Array.from({ length: 4 }).map((_, i) => {
                                            const idx = i + 4;
                                            const itemGroup = `Item ${idx + 1}`;
                                            return (
                                              <tr key={idx} className="hover:bg-slate-50/50 font-sans">
                                                <td className={`p-3 max-w-[240px] transition-colors ${isFieldHighlighted('Product Description', itemGroup) || isFieldHighlighted('Item No. / Model No. (SKU)', itemGroup) ? 'bg-amber-100/70' : ''}`}>
                                                  <p className={`font-bold font-sans ${isFieldHighlighted('Product Description', itemGroup) ? 'bg-amber-200/80 rounded px-1 -mx-1' : 'text-slate-800'}`}>INDUSTRIAL AUTOMATION ACCESSORY MOD{idx+1}</p>
                                                  <p className={`text-[9px] font-sans ${isFieldHighlighted('Item No. / Model No. (SKU)', itemGroup) ? 'bg-amber-200/80 rounded px-1 -mx-1 text-slate-700' : 'text-slate-400'}`}>Item No: SKU-{10001 + idx}</p>
                                                </td>
                                                <td className={`p-3 font-mono text-center text-slate-500 transition-colors ${isFieldHighlighted('HS Code', itemGroup) ? 'bg-amber-100/70' : ''}`}>8471.30.{10 * idx + 10}</td>
                                                <td className={`p-3 text-center font-bold text-slate-700 font-mono transition-colors ${isFieldHighlighted('Q\'ty by line', itemGroup) || isFieldHighlighted('UOM', itemGroup) ? 'bg-amber-100/70' : ''}`}>{(idx + 1) * 5} PCS</td>
                                                <td className={`p-3 text-right font-mono text-slate-600 transition-colors ${isFieldHighlighted('Price / Unit', itemGroup) ? 'bg-amber-100/70' : ''}`}>${10 * idx + 8}.00</td>
                                                <td className={`p-3 text-right font-mono font-bold text-slate-800 transition-colors ${isFieldHighlighted('Invoice Amount', itemGroup) ? 'bg-amber-100/70' : ''}`}>${((idx + 1) * 5) * (10 * idx + 8)}.00</td>
                                              </tr>
                                            );
                                          })
                                        ) : (
                                          <tr>
                                            <td colSpan={5} className="p-8 text-center text-slate-400 font-sans leading-relaxed text-xs">
                                              <p className="font-bold text-slate-800 mb-2 uppercase tracking-wide">End of Commercial Statement</p>
                                              <p>This document constitutes a full legal sales invoice statement. All quantities and unit prices are final as packed.</p>
                                            </td>
                                          </tr>
                                        )}
                                      </tbody>
                                    </table>
                                  </div>

                                  {/* Bill Summary */}
                                  <div className="flex justify-end mt-4 z-10 w-full font-sans">
                                    <div className="w-64 bg-slate-50 p-4 rounded-xl border border-slate-100 space-y-2 text-xs">
                                      <div className="flex justify-between font-medium text-slate-400 text-[10px] uppercase">
                                        <span>Subtotal:</span>
                                        <span className="font-mono">$7,520.00</span>
                                      </div>
                                      <div className="flex justify-between font-medium text-slate-400 text-[10px] uppercase">
                                        <span>Shipping & Handling:</span>
                                        <span className="font-mono">PREPAID</span>
                                      </div>
                                      <div className="flex justify-between font-black border-t border-slate-200 pt-2 text-[#010136]">
                                        <span>TOTAL AMOUNT:</span>
                                        <span className="font-mono text-indigo-600 text-[13px]">$7,520.00</span>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          );
                        }

                        if (docUpper.includes('PACKING') || docUpper.includes('LIST')) {
                          return (
                            <div className="flex flex-col gap-8">
                              {[1, 2, 3].map((pageNum) => (
                                <div key={pageNum} className="p-8 min-h-[900px] w-[680px] flex flex-col gap-6 relative bg-white font-sans text-slate-800 shadow-xl" style={{ contentVisibility: 'auto' }}>
                                  {renderWatermark('PACKING LIST')}

                                  {/* Packing List Header */}
                                  <div className="flex justify-between items-start border-b-2 border-slate-900 pb-5 z-10">
                                    <div>
                                      <span className="text-xs font-black tracking-widest text-[#16EA9E] bg-[#16EA9E]/10 border border-[#16EA9E]/20 px-2.5 py-1 rounded-sm uppercase text-[#12a16d]">Packing list</span>
                                      <h1 className="text-2xl font-black tracking-tighter text-slate-800 mt-2 font-sans font-black">GLOBAL TRADING INC.</h1>
                                      <p className="text-[11px] text-slate-400 mt-1 font-sans">123 Logistics St, Shanghai, China | logistics@globaltrading.com</p>
                                    </div>
                                    <div className="text-right font-sans">
                                      <h2 className="text-lg font-black text-slate-800 tracking-tighter font-sans">REF# PK-2026-045</h2>
                                      <p className="text-[11px] text-slate-400 font-mono">DATE: 20 APR 2026</p>
                                    </div>
                                  </div>

                                  {/* Details */}
                                  <div className="grid grid-cols-2 gap-8 text-[11px] z-10 font-sans">
                                    <div className="bg-slate-50 p-4 rounded-xl space-y-1 font-sans">
                                      <span className="font-black text-[9px] uppercase tracking-wider text-slate-400">Shipper / Exporter</span>
                                      <p className="font-extrabold text-slate-800 text-xs">GLOBAL TRADING INC.</p>
                                      <p className="text-slate-500">Contact: Packing & Logistics</p>
                                    </div>
                                    <div className={`bg-slate-50 p-4 rounded-xl space-y-1 font-sans transition-colors ${isFieldHighlightedByName('Consignee Name') || isFieldHighlightedByName('Consignee TAX ID') ? 'bg-amber-100/70' : ''}`}>
                                      <span className="font-black text-[9px] uppercase tracking-wider text-slate-400">Consignee</span>
                                      <p className="font-extrabold text-[#010136] text-xs font-black">BIZ-TRANS LOGISTICS CO., LTD.</p>
                                      <p className="text-slate-500">Bangkok, Thailand | Contact: Kunawut W.</p>
                                    </div>
                                  </div>

                                  {/* Packages details table */}
                                  <div className="mt-4 border border-slate-200 rounded-xl overflow-hidden z-10 font-sans">
                                    <table className="w-full text-left text-xs font-sans">
                                      <thead>
                                        <tr className="bg-slate-900 text-white font-black uppercase tracking-wider text-[9px]">
                                          <th className="p-3">Box / Marks</th>
                                          <th className="p-3 font-sans">Description of Goods</th>
                                          <th className="p-3 text-center">Qty / Unit</th>
                                          <th className="p-3 text-right">Net Weight</th>
                                          <th className="p-3 text-right text-sans">Gross Weight</th>
                                        </tr>
                                      </thead>
                                      <tbody className="divide-y divide-slate-100 text-[11px] font-sans">
                                        {pageNum === 1 ? (
                                          Array.from({ length: 4 }).map((_, i) => {
                                            const itemGroup = `Item ${i + 1}`;
                                            return (
                                              <tr key={i} className="hover:bg-slate-50/50">
                                                <td className="p-3 font-mono font-bold text-slate-600">BOX {i+1}/4</td>
                                                <td className={`p-3 font-sans transition-colors ${isFieldHighlighted('Product Description', itemGroup) || isFieldHighlighted('Item No. / Model No. (SKU)', itemGroup) ? 'bg-amber-100/70' : ''}`}>
                                                  <p className={`font-bold font-sans ${isFieldHighlighted('Product Description', itemGroup) ? 'bg-amber-200/80 rounded px-1 -mx-1' : 'text-slate-800'}`}>INDUSTRIAL AUTOMATION SENSOR V{i+1}</p>
                                                  <p className={`text-[9px] font-sans ${isFieldHighlighted('Item No. / Model No. (SKU)', itemGroup) ? 'bg-amber-200/80 rounded px-1 -mx-1 text-slate-700' : 'text-slate-400'}`}>MODEL# SKU-{10001 + i}</p>
                                                </td>
                                                <td className={`p-3 text-center font-bold text-slate-700 font-mono transition-colors ${isFieldHighlighted('Q\'ty by line', itemGroup) ? 'bg-amber-100/70' : ''}`}>{(i + 1) * 12} PCS</td>
                                                <td className="p-3 text-right font-mono text-slate-500">{(i + 1) * 4.5} KG</td>
                                                <td className="p-3 text-right font-mono text-slate-500">{(i + 1) * 5.2} KG</td>
                                              </tr>
                                            );
                                          })
                                        ) : pageNum === 2 ? (
                                          Array.from({ length: 3 }).map((_, i) => {
                                            const idx = i + 4;
                                            const itemGroup = `Item ${idx + 1}`;
                                            return (
                                              <tr key={idx} className="hover:bg-slate-50/50 font-sans">
                                                <td className="p-3 font-mono font-bold text-slate-600 font-mono">BOX {idx+1}/7</td>
                                                <td className={`p-3 font-sans transition-colors ${isFieldHighlighted('Product Description', itemGroup) || isFieldHighlighted('Item No. / Model No. (SKU)', itemGroup) ? 'bg-amber-100/70' : ''}`}>
                                                  <p className={`font-bold font-sans ${isFieldHighlighted('Product Description', itemGroup) ? 'bg-amber-200/80 rounded px-1 -mx-1' : 'text-slate-800'}`}>AUTOMATION SENSOR BRACKET TYPE {idx+1}</p>
                                                  <p className={`text-[9px] font-sans ${isFieldHighlighted('Item No. / Model No. (SKU)', itemGroup) ? 'bg-amber-200/80 rounded px-1 -mx-1 text-slate-700' : 'text-slate-400'}`}>MODEL# SKU-{10001 + idx}</p>
                                                </td>
                                                <td className={`p-3 text-center font-bold text-slate-700 font-mono transition-colors ${isFieldHighlighted('Q\'ty by line', itemGroup) ? 'bg-amber-100/70' : ''}`}>{(idx + 1) * 2} PCS</td>
                                                <td className="p-3 text-right font-mono text-slate-500">{(idx + 1) * 1.5} KG</td>
                                                <td className="p-3 text-right font-mono text-slate-500">{(idx + 1) * 1.8} KG</td>
                                              </tr>
                                            );
                                          })
                                        ) : (
                                          <tr>
                                            <td colSpan={5} className="p-8 text-center text-slate-400 font-sans leading-relaxed text-xs">
                                              <p className="font-bold text-slate-800 mb-2 uppercase tracking-wide">End of Packaging Statement</p>
                                              <p>All containers and boxes are packed according to international shipping rules. Weights verified before container dispatch.</p>
                                            </td>
                                          </tr>
                                        )}
                                      </tbody>
                                    </table>
                                  </div>

                                  {/* Summary */}
                                  <div className="grid grid-cols-3 border border-slate-200 bg-slate-50 rounded-xl p-4 text-[10px] font-sans h-20 items-center z-10 mt-auto">
                                    <div className="text-center border-r border-slate-200">
                                      <span className="block font-black text-slate-400 uppercase text-[8px]">TOTAL PACKAGES</span>
                                      <p className="font-black text-slate-800 text-[13px] mt-0.5">4 CARTONS (BOXES)</p>
                                    </div>
                                    <div className="text-center border-r border-slate-200 animate-pulse">
                                      <span className="block font-black text-slate-400 uppercase text-[8px]">TOTAL NET WEIGHT</span>
                                      <p className="font-black text-[#010136] text-[13px] mt-0.5">45.00 KGS</p>
                                    </div>
                                    <div className="text-center">
                                      <span className="block font-black text-slate-400 uppercase text-[8px]">TOTAL GROSS WEIGHT</span>
                                      <p className="font-black text-[#010136] text-[13px] mt-0.5">52.00 KGS</p>
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          );
                        }

                        {/* Default Fallback Document Style */}
                        return (
                          <div className="flex flex-col gap-8">
                            {[1, 2, 3].map((pageNum) => (
                              <div key={pageNum} className="p-8 min-h-[900px] w-[680px] flex flex-col gap-6 relative bg-white font-sans text-slate-800 shadow-xl" style={{ contentVisibility: 'auto' }}>
                                {renderWatermark('DOCUMENT APPROVED')}

                                <div className="flex justify-between items-start border-b border-slate-300 pb-4 z-10 font-sans">
                                  <div className="flex items-center gap-2">
                                    <div className="w-7 h-7 rounded-lg bg-indigo-600 flex items-center justify-center text-white"><FileIcon size={14} /></div>
                                    <h1 className="text-sm font-black text-slate-800 uppercase tracking-tight font-sans">{pdfPreviewUrl}</h1>
                                  </div>
                                  <p className="text-[10px] font-mono text-slate-400 font-mono font-sans">DOC VERSION {selectedJob?.updatedDocs?.includes(pdfPreviewUrl) ? '2.0' : '1.0'}</p>
                                </div>

                                <div className="grid grid-cols-2 gap-4 border border-dashed border-slate-200 rounded-xl p-4 text-[11px] bg-slate-50/40 z-10 font-sans">
                                  <div>
                                    <span className="font-black text-slate-400 uppercase tracking-wider text-[8px]">SOURCE DATA NAME</span>
                                    <p className="font-bold text-slate-700 mt-0.5 font-sans">{pdfPreviewUrl}</p>
                                  </div>
                                  <div>
                                    <span className="font-black text-slate-400 uppercase tracking-wider text-[8px]">ASSOCIATED WORKFLOW</span>
                                    <p className="font-bold text-slate-700 mt-0.5 font-sans">{selectedJob?.type || 'STANDARD VERIFICATION'}</p>
                                  </div>
                                </div>

                                <div className="z-10 mt-4 flex-1 flex flex-col gap-4 font-sans">
                                  {pageNum === 1 ? (
                                    <>
                                      <h3 className="font-black text-[10px] uppercase text-slate-400 tracking-wider font-sans">DOC CONTENT SUMMARY (PAGE 1)</h3>
                                      <div className="border border-slate-200 rounded-xl p-4 flex-1 font-mono text-slate-500 font-bold text-[11px] space-y-2 whitespace-pre leading-relaxed bg-slate-50/50">
                                        {Object.entries(tempOCRData).slice(0, 10).map(([field, value]) => (
                                          <div key={field} className={`flex justify-between border-b border-slate-100 py-1.5 font-sans text-xs font-sans transition-colors ${isFieldHighlightedByName(field) ? 'bg-amber-100/70 -mx-2 px-2 rounded' : ''}`}>
                                            <span className="text-[#1f5df9] font-bold font-sans">{field}:</span>
                                            <span className="text-[#010136] font-semibold font-sans">{value}</span>
                                          </div>
                                        ))}
                                      </div>
                                    </>
                                  ) : pageNum === 2 ? (
                                    <>
                                      <h3 className="font-black text-[10px] uppercase text-slate-400 tracking-wider font-sans">DOC CONTENT SUMMARY (PAGE 2)</h3>
                                      <div className="border border-slate-200 rounded-xl p-4 flex-1 font-mono text-slate-500 font-bold text-[11px] space-y-2 whitespace-pre leading-relaxed bg-slate-50/50 font-sans">
                                        {Object.entries(tempOCRData).slice(10, 20).map(([field, value]) => (
                                          <div key={field} className={`flex justify-between border-b border-slate-100 py-1.5 font-sans text-xs transition-colors ${isFieldHighlightedByName(field) ? 'bg-amber-100/70 -mx-2 px-2 rounded' : ''}`}>
                                            <span className="text-[#1f5df9] font-bold font-sans">{field}:</span>
                                            <span className="text-[#010136] font-semibold font-sans">{value}</span>
                                          </div>
                                        ))}
                                        {Object.entries(tempOCRData).length <= 10 && (
                                          <p className="text-center text-slate-400 font-sans py-12 text-xs">No additional fields on Page 2</p>
                                        )}
                                      </div>
                                    </>
                                  ) : (
                                    <div className="p-8 text-center text-slate-400 font-sans h-full flex flex-col justify-center items-center">
                                      <p className="font-bold text-[#010136] mb-2 uppercase tracking-wide font-sans">Page 3 Signature Section & Metadata</p>
                                      <p className="text-xs max-w-sm mb-4">Official document certification and blockchain transaction logs are appended for compliance.</p>
                                      <div className="w-1/2 border-t-2 border-slate-300 font-bold text-[9px] pt-2 text-slate-500 font-sans">AUTHORIZED STAMP SIGNATURE</div>
                                    </div>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        );
                      })()}
                    </div>
                  </div>

               </div>

               {/* Right Pane: Multi Tab view of either Editable Excel layout or Raw JSON with Copy Code */}
               {activeBoardTab !== 'pending' && (
                 <div className="w-1/2 flex flex-col bg-white overflow-hidden min-h-0">
                  
                  {/* Right Tab Headers matching reference image */}
                  <div className="bg-slate-50/50 border-b border-[#eaecf0] flex px-4 shrink-0 h-12">
                    <button 
                      onClick={() => setActiveRightTab('excel')}
                      className={`px-5 py-3 border-b-2 text-xs font-black uppercase tracking-wider transition-all leading-none ${
                        activeRightTab === 'excel' 
                          ? 'border-[#1f5df9] text-[#1f5df9]' 
                          : 'border-transparent text-slate-400 hover:text-slate-600'
                      }`}
                    >
                      Excel Preview
                    </button>
                    <button 
                      onClick={() => setActiveRightTab('json')}
                      className={`px-5 py-3 border-b-2 text-xs font-black uppercase tracking-wider transition-all leading-none ${
                        activeRightTab === 'json' 
                          ? 'border-[#1f5df9] text-[#1f5df9]' 
                          : 'border-transparent text-slate-400 hover:text-slate-600'
                      }`}
                    >
                      JSON
                    </button>
                  </div>

                  {/* Right Tab Content */}
                  {activeRightTab === 'excel' ? (
                    <div className="flex-1 overflow-hidden flex flex-col bg-white min-h-0">
                      
                      {/* Excel Header row indicators */}
                      <div className="grid grid-cols-12 px-6 py-3 border-b border-slate-200 bg-slate-50 text-[10px] font-black tracking-wider uppercase text-[#1f5df9] shrink-0 font-sans items-center">
                        <div className="col-span-5 font-sans">{language === 'TH' ? 'ชื่อฟิลด์' : 'FIELD'}</div>
                        <div className="col-span-7 pl-4 font-sans flex items-center justify-between gap-2">
                          <span>{language === 'TH' ? 'ข้อมูลที่สกัด' : 'VALUE'}</span>
                          {(() => {
                            const hasMismatch = allComparisonResults.some(res => {
                              const target = res.targets.find((t: any) => t.fileName === resolveDocNameFromPreviewUrl(pdfPreviewUrl, selectedJob?.id));
                              return target && target.status === 'MISMATCH';
                            });
                            if (!hasMismatch) return null;
                            return (
                              <button
                                type="button"
                                onClick={() => setShowOnlyMismatchedFields(prev => !prev)}
                                className={`flex items-center gap-1 px-2 py-1 rounded border text-[9px] font-black normal-case tracking-normal transition-all shrink-0 ${
                                  showOnlyMismatchedFields
                                    ? 'bg-rose-600 text-white border-rose-600'
                                    : 'bg-white text-rose-600 border-rose-200 hover:bg-rose-50'
                                }`}
                              >
                                <AlertCircle size={10} />
                                {showOnlyMismatchedFields
                                  ? (language === 'TH' ? 'แสดงทั้งหมด' : 'Show all')
                                  : (language === 'TH' ? 'เฉพาะที่ไม่ตรงกัน' : 'Mismatched only')}
                              </button>
                            );
                          })()}
                        </div>
                      </div>

                      {/* Excel rows with clean editing cell styling */}
                      <div className="flex-1 overflow-auto divide-y divide-slate-100 px-4 custom-scrollbar">
                        {(() => {
                          let filteredResults = allComparisonResults.filter(res => {
                            const target = res.targets.find(t => t.fileName === resolveDocNameFromPreviewUrl(pdfPreviewUrl, selectedJob?.id));
                            return target && target.status !== 'NA';
                          });

                          if (showOnlyMismatchedFields) {
                            filteredResults = filteredResults.filter(res => {
                              const target = res.targets.find((t: any) => t.fileName === resolveDocNameFromPreviewUrl(pdfPreviewUrl, selectedJob?.id));
                              return target && target.status === 'MISMATCH';
                            });
                          }

                          if (filteredResults.length === 0) {
                            return (
                               <div className="p-8 text-center text-slate-400 font-sans text-xs">
                                  {showOnlyMismatchedFields
                                    ? (language === 'TH' ? 'ไม่มีฟิลด์ที่ไม่ตรงกันแล้ว' : 'No mismatched fields left.')
                                    : (language === 'TH' ? 'ไม่มีฟิลด์ข้อมูลเสริมที่เกี่ยวข้อง' : 'No relevant comparison fields found for this document.')}
                               </div>
                            );
                          }

                          const groupMap = new Map<string, typeof filteredResults>();
                          filteredResults.forEach(res => {
                            const g = (res as any).group || (res as any).part || 'General Information';
                            const key = g === 'Header' || g === 'Footer' ? 'General Information' : g;
                            if (!groupMap.has(key)) groupMap.set(key, []);
                            groupMap.get(key)!.push(res);
                          });

                          return Array.from(groupMap.entries()).map(([groupName, items]) => (
                            <div key={groupName} className="mb-4 border border-slate-200 rounded-lg overflow-hidden shrink-0 mt-3 mx-1 shadow-sm transition-all duration-300">
                              <div 
                                className="bg-slate-100/80 px-4 py-2 border-b border-slate-200 sticky top-0 z-10 flex items-center justify-between relative cursor-pointer hover:bg-slate-200/50 transition-colors group/header"
                                onClick={() => setCollapsedPreviewGroups(prev => ({ ...prev, [groupName]: !prev[groupName] }))}
                              >
                                <div className="absolute left-0 top-0 bottom-0 w-1 bg-[#1f5df9]"></div>
                                <div className="flex items-center gap-2">
                                  <div className="w-5 h-5 rounded bg-white border border-slate-200 shadow-sm flex items-center justify-center text-slate-500 group-hover/header:text-[#1f5df9] group-hover/header:border-blue-200 transition-all pointer-events-none">
                                    {collapsedPreviewGroups[groupName] ? <ChevronRight size={12} strokeWidth={3} /> : <ChevronDown size={12} strokeWidth={3} />}
                                  </div>
                                  <span className="text-[10px] font-black text-slate-800 uppercase tracking-widest pl-1 pointer-events-none">{groupName}</span>
                                </div>
                                <span className="bg-white border border-slate-200 text-slate-500 text-[9px] px-1.5 py-0.5 rounded font-black tracking-wider leading-none shadow-sm pointer-events-none">{items.length} FIELDS</span>
                              </div>
                              {!collapsedPreviewGroups[groupName] && (
                                <div className="divide-y divide-slate-100 bg-white animate-in slide-in-from-top-1 fade-in duration-200">
                                  {items.map((res: any, i: number) => {
                                    const fieldId = `input-field-${groupName.replace(/\s/g, '-')}-${i}`;
                                    const isDisabled = isUnassigned || selectedJob?.status === JobStatus.READY;
                                    const target = res.targets.find((t: any) => t.fileName === resolveDocNameFromPreviewUrl(pdfPreviewUrl, selectedJob?.id));
                                    const isMismatch = target && target.status === 'MISMATCH';
                                    const fieldKey = `${res.group || 'no-group'}::${res.fieldName}`;
                                    const isSelected = selectedFieldKey === fieldKey;
                                    const isHovered = hoveredFieldKey === fieldKey;
                                    return (
                                      <div
                                        key={i}
                                        className={`grid grid-cols-12 py-1.5 items-center transition-all relative group/row cursor-pointer ${
                                          isSelected ? 'bg-blue-50 ring-1 ring-inset ring-[#1f5df9]/40' : isHovered ? 'bg-amber-50' : isMismatch ? 'bg-rose-50/50 hover:bg-rose-50' : 'bg-white hover:bg-slate-50/60'
                                        }`}
                                        onMouseEnter={() => setHoveredFieldKey(fieldKey)}
                                        onMouseLeave={() => setHoveredFieldKey(null)}
                                        onClick={() => setSelectedFieldKey(prev => prev === fieldKey ? null : fieldKey)}
                                      >
                                        {isMismatch && <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-rose-400"></div>}
                                        {isSelected && <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-[#1f5df9]"></div>}
                                        <div className={`col-span-5 font-bold text-[12px] capitalize font-sans leading-relaxed tracking-tight px-3 break-words flex items-center gap-1.5 ${isMismatch ? 'text-rose-600' : 'text-[#1f5df9]'}`}>
                                          {isMismatch && <AlertCircle size={11} className="shrink-0" />}
                                          {res.fieldName}
                                        </div>
                                        <div className="col-span-7 pl-2 pr-4 relative">
                                          <div className="relative flex items-center w-full">
                                            <input
                                              id={fieldId}
                                              type="text"
                                              value={tempOCRData[res.fieldName] || ''}
                                              disabled={isDisabled}
                                              onChange={(e) => setTempOCRData(prev => ({ ...prev, [res.fieldName]: e.target.value }))}
                                              onFocus={() => setSelectedFieldKey(fieldKey)}
                                              onClick={(e) => e.stopPropagation()}
                                              className={`w-full p-2 pr-8 rounded-md text-[#010136] text-[13px] font-bold font-sans transition-all outline-none border ${
                                                isMismatch ? 'border-rose-200' : 'border-transparent'
                                              } hover:border-slate-200 hover:bg-slate-50 focus:bg-white focus:border-[#1f5df9] focus:ring-2 focus:ring-[#1f5df9]/20 ${
                                                selectedJob?.status === JobStatus.READY
                                                  ? 'bg-transparent text-slate-500 cursor-not-allowed shadow-none font-semibold hover:border-transparent hover:bg-transparent'
                                                  : 'bg-transparent'
                                              }`}
                                              placeholder="Enter extracted value"
                                            />
                                            {!isDisabled && (
                                              <button
                                                type="button"
                                                onClick={() => {
                                                  const el = document.getElementById(fieldId);
                                                  if (el) {
                                                    el.focus();
                                                  }
                                                }}
                                                className="absolute right-2 p-1 text-slate-400 hover:text-[#1f5df9] hover:bg-slate-200/50 rounded transition-all cursor-pointer opacity-40 group-hover/row:opacity-100 focus-within:opacity-100"
                                                title={language === 'TH' ? 'คลิกเพื่อแก้ไขข้อมูล' : 'Click to edit value'}
                                              >
                                                <Edit3 size={12} className="shrink-0" />
                                              </button>
                                            )}
                                          </div>
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              )}
                            </div>
                          ));
                        })()}
                      </div>

                    </div>
                  ) : (
                    /* High fidelity syntax highlighted raw JSON Tab code block view */
                    <div className="flex-1 overflow-hidden flex flex-col bg-slate-50 min-h-0 select-text p-5">
                      <div className="flex justify-between items-center mb-3.5 select-none shrink-0 font-sans">
                        <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest leading-none font-sans">
                          {language === 'TH' ? 'รหัสโครงสร้างข้อมูลที่สกัด' : 'EXTRACTED DATA STRUCTURE'}
                        </span>
                        
                        {/* Copy button with check anim feedback */}
                        <button
                          onClick={() => {
                            const jsonText = JSON.stringify(tempOCRData, null, 2);
                            navigator.clipboard.writeText(jsonText).then(() => {
                              setCopiedJson(true);
                              message.success(language === 'TH' ? 'คัดลอกรหัส JSON แล้ว!' : 'JSON Code Copied!');
                              setTimeout(() => setCopiedJson(false), 2000);
                            }).catch(() => {
                              const textarea = document.createElement('textarea');
                              textarea.value = jsonText;
                              document.body.appendChild(textarea);
                              textarea.select();
                              try {
                                document.execCommand('copy');
                                setCopiedJson(true);
                                message.success(language === 'TH' ? 'คัดลอกรหัส JSON แล้ว!' : 'JSON Code Copied!');
                                setTimeout(() => setCopiedJson(false), 2000);
                              } catch (err) {
                                console.error('Copy failed', err);
                              }
                              document.body.removeChild(textarea);
                            });
                          }}
                          className="px-3.5 py-2 text-[10px] font-black uppercase tracking-widest bg-white hover:bg-slate-100 border border-slate-200 rounded-[4px] text-slate-600 transition-all flex items-center gap-2 shadow-sm font-sans cursor-pointer active:scale-95"
                        >
                          {copiedJson ? (
                            <>
                              <Check size={12} className="text-emerald-500" strokeWidth={3} />
                              <span className="text-emerald-600 font-sans">{language === 'TH' ? 'คัดลอกเรียบร้อย!' : 'COPIED!'}</span>
                            </>
                          ) : (
                            <>
                              <Copy size={12} strokeWidth={2.5} />
                              <span className="font-sans">{language === 'TH' ? 'คัดลอกโค้ด' : 'COPY CODE'}</span>
                            </>
                          )}
                        </button>
                      </div>

                      {/* Display field code */}
                      <div className="flex-1 bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl p-5 flex flex-col relative min-h-0 font-mono">
                        <textarea
                          readOnly
                          value={JSON.stringify(tempOCRData, null, 2)}
                          className="flex-1 w-full bg-transparent border-none text-[12px] font-bold text-emerald-400 font-mono focus:ring-0 outline-none resize-none cursor-text select-all overflow-auto whitespace-pre leading-relaxed custom-scrollbar"
                          id="json-code-textarea"
                          style={{ scrollBehavior: 'smooth' }}
                        />
                      </div>
                    </div>
                  )}

                  {/* Save buttons footer at the bottom of the right panel */}
                  <div className="p-5 border-t border-slate-100 bg-white shrink-0">
                    <button 
                      onClick={handleSaveOCR}
                      disabled={isUnassigned || !hasOCRChanges || selectedJob?.status === JobStatus.READY}
                      className={`w-full py-4 rounded-[4px] font-black text-xs uppercase tracking-widest transition-all flex items-center justify-center gap-2 group cursor-pointer ${
                        (!isUnassigned && hasOCRChanges) && selectedJob?.status !== JobStatus.READY
                          ? 'bg-[#1f5df9] text-white shadow-lg shadow-blue-500/25 hover:bg-[#104BE3]' 
                          : 'bg-slate-100 text-slate-400 cursor-not-allowed opacity-70 border border-slate-200/50 shadow-none'
                      }`}
                    >
                      <Save size={16} className={hasOCRChanges ? "group-hover:scale-110 transition-transform" : ""} />
                      {language === 'TH' ? 'บันทึกข้อมูลแก้ไข' : 'Save Changes'}
                    </button>
                  </div>

               </div>
               )}

            </div>
          </div>

          {/* Toast Notification */}
          <AnimatePresence>
            {showSaveToast && (
              <motion.div 
                initial={{ opacity: 0, y: 50 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="fixed bottom-10 left-1/2 -translate-x-1/2 z-[700] px-6 py-3 bg-slate-900 text-white rounded-full shadow-2xl flex items-center gap-3 border border-slate-700"
              >
                <div className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-500 flex items-center justify-center">
                  <Check size={12} strokeWidth={4} />
                </div>
                <span className="text-xs font-black uppercase tracking-widest">
                  {language === 'TH' ? 'บันทึกข้อมูลเรียบร้อยแล้ว' : 'OCR DATA SAVED SUCCESSFULLY'}
                </span>
              </motion.div>
            )}
          </AnimatePresence>

        </div>
      )}

      {/* Reject Pending Modal */}
      {showRejectPendingModal && rejectPendingId && (
        <div className="fixed inset-0 z-[620] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-300 font-sans">
           <div className="bg-white p-10 rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 text-center flex flex-col items-center gap-6 animate-in zoom-in-95 duration-300">
              <div className="w-24 h-24 rounded-full bg-rose-50 text-rose-500 flex items-center justify-center border-4 border-rose-100 mb-2">
                 <AlertCircle size={48} strokeWidth={3} />
              </div>
              <div>
                <h3 className="text-xl font-black text-[#010136] tracking-tight mb-3 font-sans">
                   {language === 'TH' ? 'ยืนยันการปฏิเสธไฟล์นี้' : 'Confirm Reject File'}
                </h3>
                <p className="text-slate-500 font-medium text-[13px] leading-relaxed font-sans max-w-sm mx-auto">
                   {language === 'TH' 
                     ? 'คุณต้องการปฏิเสธและลบไฟล์นี้ออกจาก Inbox ใช่หรือไม่? การกระทำนี้ไม่สามารถย้อนกลับได้' 
                     : 'Are you sure you want to reject and discard this file from the inbox? This action cannot be undone.'}
                </p>
              </div>
              <div className="flex gap-4 w-full mt-4">
                 <Button 
                   size="large" 
                   className="flex-1 rounded-[4px] h-14 font-black uppercase tracking-widest text-[11px] border-slate-200 text-slate-600 hover:bg-slate-50 font-sans"
                   onClick={() => {
                     setShowRejectPendingModal(false);
                     setRejectPendingId(null);
                   }}
                 >
                   {language === 'TH' ? 'ยกเลิก' : 'CANCEL'}
                 </Button>
                 <Button 
                   type="primary" 
                   size="large" 
                   className="flex-1 rounded-[4px] h-14 font-black uppercase tracking-widest text-[11px] bg-rose-500 border-none shadow-lg shadow-rose-500/20 hover:bg-rose-600 font-sans"
                   onClick={confirmRejectPending}
                 >
                   {language === 'TH' ? 'ปฏิเสธไฟล์' : 'REJECT FILE'}
                 </Button>
              </div>
           </div>
        </div>
      )}

      {/* Delete Document Column Confirm Modal */}
      {showDeleteColumnConfirmModal && deleteColumnTargetDocName && (
        <div className="fixed inset-0 z-[620] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-300 font-sans">
          <div className="bg-white p-10 rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 text-center flex flex-col items-center gap-6 animate-in zoom-in-95 duration-300">
            <div className="w-24 h-24 rounded-full bg-rose-50 text-rose-500 flex items-center justify-center border-4 border-rose-100 mb-2">
              <AlertCircle size={48} strokeWidth={3} />
            </div>
            <div>
              <h3 className="text-xl font-black text-[#010136] tracking-tight mb-3 font-sans">
                {language === 'TH' ? 'ยืนยันการลบคอลัมน์เอกสาร' : 'Confirm Delete Column'}
              </h3>
              <p className="text-slate-500 font-medium text-[13px] leading-relaxed font-sans max-w-sm mx-auto">
                {language === 'TH' 
                  ? `คุณต้องการลบคอลัมน์เอกสาร "${deleteColumnTargetDocName}" ใช่หรือไม่? ไฟล์จะหายไปจากตารางเปรียบเทียบและการกระทำนี้ไม่สามารถย้อนกลับได้` 
                  : `Are you sure you want to delete the document column "${deleteColumnTargetDocName}"? The file will disappear from the comparison table and this action cannot be undone.`}
              </p>
            </div>
            <div className="flex gap-4 w-full mt-4">
              <Button 
                size="large" 
                className="flex-1 rounded-[4px] h-14 font-black uppercase tracking-widest text-[11px] border-slate-200 text-slate-600 hover:bg-slate-50 font-sans"
                onClick={() => {
                  setShowDeleteColumnConfirmModal(false);
                  setDeleteColumnTargetDocName(null);
                }}
              >
                {language === 'TH' ? 'ยกเลิก' : 'CANCEL'}
              </Button>
              <Button 
                type="primary" 
                size="large" 
                className="flex-1 rounded-[4px] h-14 font-black uppercase tracking-widest text-[11px] bg-rose-500 border-none shadow-lg shadow-rose-500/20 hover:bg-rose-600 font-sans"
                onClick={() => {
                  const targetDoc = deleteColumnTargetDocName;
                  handleDeleteDocColumn(targetDoc);
                  setShowDeleteColumnConfirmModal(false);
                  setDeleteColumnTargetDocName(null);
                  if (targetDoc) {
                    message.success(language === 'TH' ? `ลบคอลัมน์เอกสาร "${targetDoc}" เรียบร้อยแล้ว` : `Document column "${targetDoc}" has been deleted.`);
                  }
                }}
              >
                {language === 'TH' ? 'ลบคอลัมน์' : 'DELETE COLUMN'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Confirm-all-mismatches Modal */}
      {confirmAllMismatchesTargetDocName && (() => {
        const targetDoc = confirmAllMismatchesTargetDocName;
        const mismatchCount = allComparisonResults.filter(res => res.targets.some(t => t.fileName === targetDoc && t.status === 'MISMATCH')).length;
        return (
          <div className="fixed inset-0 z-[620] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-300 font-sans">
            <div className="bg-white p-10 rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 text-center flex flex-col items-center gap-6 animate-in zoom-in-95 duration-300">
              <div className="text-amber-500 flex items-center justify-center mb-2">
                <AlertCircle size={44} strokeWidth={2} />
              </div>
              <div>
                <h3 className="text-xl font-black text-[#010136] tracking-tight mb-3 font-sans">
                  {language === 'TH' ? 'ยืนยันใช้ค่านี้ทั้งเอกสาร' : 'Confirm All Mismatches'}
                </h3>
                <p className="text-slate-500 font-medium text-[13px] leading-relaxed font-sans max-w-sm mx-auto">
                  {language === 'TH'
                    ? `คุณต้องการยืนยันใช้ค่าที่สกัดได้สำหรับฟิลด์ที่ไม่ตรงกันทั้งหมด ${mismatchCount} ฟิลด์ ในเอกสาร "${targetDoc}" ใช่หรือไม่? การกระทำนี้จะถือว่าทุกฟิลด์ที่ไม่ตรงกันผ่านการตรวจสอบแล้ว`
                    : `Are you sure you want to confirm all ${mismatchCount} mismatched fields in "${targetDoc}"? This will mark every mismatched field as reviewed and accepted.`}
                </p>
              </div>
              <div className="flex gap-4 w-full mt-4">
                <Button
                  size="large"
                  className="flex-1 rounded-[4px] h-14 font-black uppercase tracking-widest text-[11px] border-slate-200 text-slate-600 hover:bg-slate-50 font-sans"
                  onClick={() => setConfirmAllMismatchesTargetDocName(null)}
                >
                  {language === 'TH' ? 'ยกเลิก' : 'CANCEL'}
                </Button>
                <Button
                  type="primary"
                  size="large"
                  className="flex-1 rounded-[4px] h-14 font-black uppercase tracking-widest text-[11px] bg-[#1f5df9] border-none shadow-lg shadow-[#1f5df9]/20 hover:!bg-[#104BE3] font-sans"
                  onClick={() => {
                    confirmAllMismatchesInDoc(targetDoc);
                    setConfirmAllMismatchesTargetDocName(null);
                  }}
                >
                  {language === 'TH' ? 'ยืนยัน' : 'CONFIRM'}
                </Button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Rejection Reason Popup — full reason text behind the icon button next to the REJECTED pill */}
      {showRejectionReasonModal && selectedJob?.rejectionReason && (
        <div className="fixed inset-0 z-[620] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-300 font-sans">
          <div className="bg-white p-10 rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 text-center flex flex-col items-center gap-6 animate-in zoom-in-95 duration-300">
            <div className="text-[#1f5df9] flex items-center justify-center mb-2">
              <Undo2 size={44} strokeWidth={2} />
            </div>
            <div>
              <h3 className="text-xl font-black text-[#010136] tracking-tight mb-3 font-sans">
                {language === 'TH' ? 'เหตุผลที่ถูกตีกลับ' : 'Rejection Reason'}
              </h3>
              <p className="text-slate-500 font-medium text-[13px] leading-relaxed font-sans max-w-sm mx-auto whitespace-pre-wrap">
                {selectedJob.rejectionReason}
              </p>
              {(selectedJob.rejectedBy || selectedJob.rejectedAt) && (
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-4 pt-4 border-t border-slate-100">
                  {selectedJob.rejectedBy}{selectedJob.rejectedAt ? ` · ${formatDisplayDate(selectedJob.rejectedAt)}` : ''}
                </p>
              )}
            </div>
            <Button
              type="primary"
              size="large"
              className="w-full rounded-[4px] h-12 font-black uppercase tracking-widest text-[11px] bg-[#1f5df9] border-none shadow-lg shadow-[#1f5df9]/20 hover:!bg-[#104BE3] font-sans mt-4"
              onClick={() => setShowRejectionReasonModal(false)}
            >
              {language === 'TH' ? 'ปิด' : 'CLOSE'}
            </Button>
          </div>
        </div>
      )}

      {/* Reject Flow Confirm Modal */}
      {showRejectFlowConfirm && selectedJob && (() => {
        const prevJob = getPreviousJobInShipment(selectedJob);
        return (
          <div className="fixed inset-0 z-[620] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-300 font-sans">
            <div className="bg-white p-10 rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 text-center flex flex-col items-center gap-6 animate-in zoom-in-95 duration-300">
              <div className="text-[#1f5df9] flex items-center justify-center mb-2">
                <Undo2 size={44} strokeWidth={2} />
              </div>
              <div>
                <h3 className="text-xl font-black text-[#010136] tracking-tight mb-3 font-sans">
                  {language === 'TH' ? 'ตีกลับไปยังขั้นตอนก่อนหน้า' : 'Reject Back to Previous Job'}
                </h3>
                <p className="text-slate-500 font-medium text-[13px] leading-relaxed font-sans max-w-sm mx-auto">
                  {language === 'TH'
                    ? `รายการ "${prevJob?.workflowName || prevJob?.reference}" จะถูกทำเครื่องหมายว่า "ถูกตีกลับ" พร้อมเหตุผลที่ระบุ และจะบล็อกขั้นตอนถัดไปในชิปเมนต์นี้จนกว่าจะแก้ไขและดำเนินการให้เสร็จสมบูรณ์อีกครั้ง`
                    : `"${prevJob?.workflowName || prevJob?.reference}" will be marked "Rejected" with the reason below, and every job after it in this shipment stays blocked until it's corrected and completed again.`}
                </p>
              </div>
              <div className="w-full text-left">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5 block">
                  {language === 'TH' ? 'เหตุผลในการตีกลับ' : 'Reason for rejection'}
                </label>
                <textarea
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  placeholder={language === 'TH' ? 'ระบุเหตุผล เช่น ข้อมูลใน Packing List ยังไม่ถูกต้อง' : 'e.g. Packing List data is still incorrect'}
                  className="w-full h-24 resize-none rounded-[4px] border border-slate-200 p-3 text-[13px] font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-rose-200 focus:border-rose-300 font-sans"
                />
              </div>
              <div className="flex gap-4 w-full mt-2">
                <Button
                  size="large"
                  className="flex-1 rounded-[4px] h-12 font-black uppercase tracking-widest text-[11px] border-slate-200 text-slate-600 hover:bg-slate-50 font-sans"
                  onClick={() => { setShowRejectFlowConfirm(false); setRejectReason(''); }}
                >
                  {language === 'TH' ? 'ยกเลิก' : 'CANCEL'}
                </Button>
                <Button
                  type="primary"
                  size="large"
                  disabled={!rejectReason.trim()}
                  className="flex-1 rounded-[4px] h-12 font-black uppercase tracking-widest text-[11px] bg-[#1f5df9] border-none shadow-lg shadow-[#1f5df9]/20 hover:!bg-[#104BE3] disabled:opacity-40 font-sans"
                  onClick={() => handleRejectFlow(selectedJob, rejectReason.trim())}
                >
                  {language === 'TH' ? 'ยืนยันตีกลับ' : 'CONFIRM REJECT'}
                </Button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Workflow Warning Modal */}
      {showWorkflowWarning && (
        <div className="fixed inset-0 z-[630] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-300">
           <div className="bg-white p-10 rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 text-center flex flex-col items-center gap-6 animate-in zoom-in-95 duration-300">
              <div className="w-24 h-24 rounded-full bg-amber-50 text-amber-500 flex items-center justify-center border-4 border-amber-50">
                 <AlertCircle size={48} strokeWidth={3} />
              </div>
              <div>
                <h3 className="text-2xl font-black text-slate-800 tracking-tighter mb-2">
                  {language === 'TH' ? 'ยังไม่ได้ตั้งค่า Export Node' : 'Export Node Not Set'}
                </h3>
                <p className="text-slate-500 font-bold text-sm leading-relaxed">
                  {language === 'TH' 
                    ? 'รายการนี้ยังไม่มีการตั้งค่าจุดส่งออกข้อมูล (Export node) ในเวิร์กโฟลว์ กรุณาตั้งค่าก่อนดำเนินการต่อ' 
                    : 'This job does not have an export node configured in its workflow. Please configure it before proceeding.'}
                </p>
              </div>
              <div className="flex flex-col w-full gap-3 mt-4">
                 <button 
                  onClick={() => {
                    setShowWorkflowWarning(false);
                    // Navigation logic would go here
                  }}
                  className="w-full py-4 bg-[#1f5df9] text-white rounded-[4px] font-black text-sm uppercase tracking-widest hover:bg-[#104BE3] transition-all flex items-center justify-center gap-2 border-none"
                 >
                   {language === 'TH' ? 'ไปที่ตั้งค่าเวิร์กโฟลว์' : 'Go to Set Workflow'}
                 </button>
                 <button 
                  onClick={() => setShowWorkflowWarning(false)}
                  className="w-full py-2 bg-transparent hover:bg-transparent text-slate-400 hover:text-slate-500 font-bold text-sm transition-all cursor-pointer border-none"
                 >
                   {language === 'TH' ? 'ยกเลิก' : 'Cancel'}
                 </button>
              </div>
           </div>
        </div>
      )}

      {/* Export Job Modal Dialog */}
      {exportJob && (() => {
        const shipmentJobs = jobs.filter(j => j.reference === exportJob.reference);
        const seqIndex = shipmentJobs.findIndex(j => j.id === exportJob.id);
        const nextJob = seqIndex !== -1 && seqIndex < shipmentJobs.length - 1 ? shipmentJobs[seqIndex + 1] : null;

        return (
          <div className="fixed inset-0 z-[620] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300 font-sans">
            <div className="bg-white p-8 rounded-2xl max-w-lg w-full shadow-2xl border border-slate-100 flex flex-col gap-6 animate-in zoom-in-95 duration-300 relative overflow-hidden">
              
              {/* Header section with export tag & title */}
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-blue-50 text-[#1f5df9] flex items-center justify-center border border-blue-100">
                    <Send size={24} strokeWidth={2.5} />
                  </div>
                  <div>
                    <h3 className="text-lg font-black text-[#010136] tracking-tight mb-0.5">
                      {language === 'TH' ? 'ส่งออกข้อมูลรายการ' : 'Export Job Data'}
                    </h3>
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">
                        {language === 'TH' ? 'อ้างอิง:' : 'REFERENCE:'}
                      </span>
                      <span className="text-[11px] font-bold text-slate-700 font-mono bg-slate-50 px-1.5 py-0.5 rounded border border-slate-200/50">
                        {exportJob.reference}
                      </span>
                    </div>
                  </div>
                </div>
                <button 
                  onClick={() => setExportJob(null)}
                  className="p-1.5 rounded-[4px] text-slate-400 hover:text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer border-none bg-transparent"
                  id="close-export-modal-btn"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Main Selection Area */}
              <div className="flex flex-col gap-4">
                {/* Export Workflow Section */}
                <div className="p-4 rounded-xl border border-slate-200 bg-white">
                  <div className="flex items-center gap-3 mb-3">
                    <span className="text-sm font-bold text-slate-700">
                      {language === 'TH' ? 'ส่งออกไปยังขั้นตอนถัดไป (ตามระบบ)' : 'Exporting to the Next Step (System)'}
                    </span>
                  </div>

                  <div className="flex items-center gap-2.5 bg-blue-50/50 border border-blue-100 p-3.5 rounded-lg">
                    <div className="w-2.5 h-2.5 rounded-full bg-blue-500 animate-pulse" />
                    <span className="text-xs font-black text-[#1f5df9] uppercase tracking-tight">
                      {nextJob ? nextJob.workflowName : (language === 'TH' ? 'ขั้นตอนสุดท้าย (เสร็จสมบูรณ์ทั้งหมด)' : 'FINAL STEP (ALL COMPLETED)')}
                    </span>
                  </div>

                  {nextJob && (
                    <div className="mt-3 flex items-center gap-1.5 text-[10px] font-bold text-slate-500">
                      <ShieldCheck size={13} className="text-emerald-500 shrink-0" />
                      <span>
                        {language === 'TH' 
                          ? `ระบบจะเปิดให้เริ่มทำงาน "${nextJob.workflowName}" ได้ทันทีเมื่อกดส่งออก`
                          : `"${nextJob.workflowName}" will become active immediately upon export`}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Double Button Actions */}
              <div className="flex gap-4 w-full mt-2">
                <Button 
                  size="large" 
                  className="flex-1 rounded-[4px] h-12 font-black uppercase tracking-widest text-[11px] border-slate-200 text-slate-600 hover:bg-slate-50 font-sans"
                  onClick={() => setExportJob(null)}
                >
                  {language === 'TH' ? 'ยกเลิก' : 'CANCEL'}
                </Button>
                <Button 
                  type="primary" 
                  size="large" 
                  className="flex-1 rounded-[4px] h-12 font-black uppercase tracking-widest text-[11px] bg-[#1f5df9] hover:!bg-[#104BE3] border-none shadow-lg shadow-blue-500/20 font-sans cursor-pointer"
                  onClick={() => handleConfirmExport(exportJob)}
                >
                  {language === 'TH' ? 'ส่งออกข้อมูล' : 'EXPORT DATA'}
                </Button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Reject Data confirmation modal */}
        {showCreateJobModal && (
        <CreateJobModal
          visible={showCreateJobModal}
          onClose={() => setShowCreateJobModal(false)}
          onCreate={(newJobs) => setJobs(prev => Array.isArray(newJobs) ? [...prev, ...newJobs] : [...prev, newJobs])}
          workflows={mockWorkflows}
          language={language}
          prefilledReference={selectedShipment || undefined}
          previousWorkflowId={selectedShipment ? getLastJobWorkflowId(selectedShipment) : undefined}
          teamPresets={teamPresets}
        />
      )}

      <GenerateReportModal
        visible={showGenerateReportDrawer}
        onClose={() => setShowGenerateReportDrawer(false)}
        language={language}
      />

      {/* Reject Data confirmation modal */}
       {showRejectFileModal && rejectFileTargetDocName && (
         <div className="fixed inset-0 z-[620] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-300">
            <div className="bg-white p-10 rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 text-center flex flex-col items-center gap-6 animate-in zoom-in-95 duration-300">
               <div className="w-24 h-24 rounded-full bg-rose-50 text-rose-500 flex items-center justify-center border-4 border-rose-50">
                  <AlertTriangle size={48} strokeWidth={3} />
               </div>
               <div>
                  <h3 className="text-3xl font-black text-slate-800 tracking-tighter mb-2">
                     {language === 'TH' ? 'ยืนยันปฏิเสธข้อมูล' : 'Confirm Reject Data'}
                  </h3>
                  <p className="text-slate-500 font-bold">
                     {language === 'TH' 
                       ? 'ระบบจะส่งข้อมูลนี้กลับไปแจ้งที่ต้นทาง' 
                       : 'The system will send a notification back to the source.'}
                  </p>
               </div>
               <div className="flex flex-col w-full gap-3 mt-4">
                  <button 
                   onClick={() => {
                     handleRejectFile(rejectFileTargetDocName);
                     message.success(language === 'TH' ? 'ปฏิเสธข้อมูลเรียบร้อยแล้ว' : 'Data rejected successfully.');
                     setShowRejectFileModal(false);
                     setRejectFileTargetDocName(null);
                   }}
                   className="w-full py-4 bg-rose-500 text-white rounded-[4px] font-black text-sm uppercase tracking-widest hover:bg-rose-600 transition-all flex items-center justify-center gap-2 border-none"
                  >
                    {language === 'TH' ? 'ยืนยันปฏิเสธ' : 'Confirm Reject'}
                  </button>
                  <button 
                   onClick={() => {
                     setShowRejectFileModal(false);
                     setRejectFileTargetDocName(null);
                   }}
                   className="w-full py-2 bg-transparent hover:bg-transparent text-slate-400 hover:text-slate-500 font-bold text-sm transition-all cursor-pointer border-none"
                  >
                    {language === 'TH' ? 'ยกเลิก' : 'Cancel'}
                  </button>
               </div>
            </div>
         </div>
       )}

      {step === 0 && (
        <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-sm space-y-3 animate-in fade-in duration-500" id="job-board-wrapper">
          {selectedShipment ? (
            renderShipmentJobList()
          ) : (
            <>
              <div className="flex justify-between items-center pb-3 border-b border-slate-100">
                <div>
                  <h2 className="text-xl md:text-2xl font-black text-slate-800 tracking-tight mb-1 flex items-center gap-3 animate-in slide-in-from-left duration-300">
                    {t.jobList}
                  </h2>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <p className="text-slate-500 font-bold text-xs md:text-sm">{t.jobListDesc}</p>
                    <button
                      onClick={() => setShowStatusGuide(true)}
                      className="inline-flex items-center justify-center p-1 rounded-[4px] text-blue-500 hover:bg-blue-50 hover:text-blue-600 transition-all cursor-pointer group"
                      title="STATUS GUIDE"
                      id="status-guide-icon-btn"
                    >
                      <HelpCircle size={16} className="group-hover:scale-110 transition-transform" />
                    </button>
                  </div>
                </div>
                <div className="flex items-center gap-2.5">
                  <button
                    onClick={() => setShowGenerateReportDrawer(true)}
                    className="px-4 py-2 bg-white text-[#1f5df9] border border-[#1f5df9] rounded-[4px] flex items-center gap-2 text-xs font-black uppercase tracking-widest hover:bg-blue-50 transition-all shadow-sm cursor-pointer"
                    id="generate-report-btn"
                  >
                    <FileBarChart2 size={16} />
                    {LOCAL_T[language].btnGenerateReport}
                  </button>
                  <button
                    onClick={() => setShowCreateJobModal(true)}
                    className="px-4 py-2 bg-[#1f5df9] text-white border border-transparent rounded-[4px] flex items-center gap-2 text-xs font-black uppercase tracking-widest hover:bg-[#104BE3] transition-all shadow-sm cursor-pointer"
                    id="create-new-job-btn"
                  >
                    <Plus size={16} />
                    สร้างรายการใหม่
                  </button>
                </div>
              </div>

              {SHOW_PENDING_AND_LOGS_TABS ? (
                <Tabs
                  activeKey={activeBoardTab}
                  onChange={setActiveBoardTab}
                  className="custom-job-tabs mb-6"
                  style={{ borderRadius: '8px' }}
                  items={[
                    {
                      key: 'jobs',
                      label: (
                        <div className="flex items-center gap-2 px-1 py-2 group">
                          <List size={18} className="text-slate-400 group-hover:text-blue-500 transition-colors" />
                          <span className="font-black uppercase tracking-[0.05em] text-[13px] text-slate-500 font-sans group-hover:text-slate-800 transition-colors">
                            {t.tabJobList}
                          </span>
                        </div>
                      ),
                      children: renderShipmentGrid()
                    },
                    {
                      key: 'pending',
                      label: (
                        <div className="flex items-center gap-2 px-1 py-2 group">
                          <Inbox size={18} className="text-slate-400 group-hover:text-blue-500 transition-colors" />
                          <span className="font-black uppercase tracking-[0.05em] text-[13px] text-slate-500 font-sans group-hover:text-slate-800 transition-colors">
                            {t.tabPendingInbox}
                          </span>
                          <Badge
                            count={pendingInboxItems.filter(item => !readPendingIds.has(item.id)).length}
                            size="small"
                            className="ml-1"
                            styles={{ count: { fontSize: '10px', fontWeight: 900, backgroundColor: '#DC2626', color: '#ffffff', minWidth: '18px', height: '18px', lineHeight: '18px', border: 'none', boxShadow: 'none', opacity: 1 } }}
                          />
                        </div>
                      ),
                      children: renderPendingInbox()
                    },
                    {
                      key: 'logs',
                      label: (
                        <div className="flex items-center gap-2 px-1 py-2 group">
                          <Clock size={18} className="text-slate-400 group-hover:text-blue-500 transition-colors" />
                          <span className="font-black uppercase tracking-[0.05em] text-[13px] text-slate-500 font-sans group-hover:text-slate-800 transition-colors">
                            {t.tabActivityLogs}
                          </span>
                        </div>
                      ),
                      children: renderActivityLogs()
                    }
                  ]}
                />
              ) : (
                // Demo mode: no other tabs to switch between, so skip the tab bar
                // entirely and give the job list content the extra vertical space.
                renderShipmentGrid()
              )}
            </>
          )}
          
          <style>{`
            .custom-job-tabs { border-radius: 8px !important; }
            .custom-job-tabs .ant-tabs-nav { margin: 0 0 10px 0 !important; }
            .custom-job-tabs .ant-tabs-nav::before { border-bottom: 2px solid #f1f5f9; }
            .custom-job-tabs .ant-tabs-tab { padding: 4px 12px !important; margin: 0 24px 0 0 !important; }
            .custom-job-tabs .ant-tabs-tab-active .ant-tabs-tab-btn > div > span:first-of-type { color: #010136 !important; }
            .custom-job-tabs .ant-tabs-tab-active svg { color: #1f5df9 !important; }
            .custom-job-tabs .ant-tabs-ink-bar { background: #1f5df9 !important; height: 3px !important; border-radius: 3px 3px 0 0; }
            .custom-job-tabs .ant-badge .ant-scroll-number-only-unit { color: white !important; }
            .custom-job-tabs .ant-tabs-content-holder { border-radius: 8px !important; }
          `}</style>
        </div>
      )}

      {step === 1 && selectedJob && (
        <div className={
          isJobPanelFullscreen
            ? "fixed inset-0 z-[500] flex flex-col overflow-hidden bg-white animate-in fade-in duration-200"
            : "animate-in fade-in slide-in-from-right-4 duration-500 flex flex-col h-full overflow-hidden bg-white border border-slate-200 rounded-2xl shadow-xl shadow-slate-200/50"
        }>
          {/* Compact Header Section */}
          <div className="px-6 py-4 bg-white border-b border-slate-200 flex items-center justify-between z-[60] shadow-sm">
            <div className="flex items-center gap-4">
              <button
                  onClick={() => {
                    setStep(0);
                    setSelectedJob(null);
                    setIsJobPanelFullscreen(false);
                  }}
                  className="p-2.5 bg-white text-slate-400 hover:text-slate-600 rounded-[4px] transition-all flex items-center justify-center group"
                >
                  <ArrowLeft size={18} className="group-hover:-translate-x-0.5 transition-transform" />
                </button>
                <div className="flex items-center gap-3">
                   <div>
                      <div className="flex items-center gap-2 mb-0.5">
                        <h2 className="text-xl font-black text-slate-800 tracking-tighter leading-none uppercase">
                          {(() => {
                            const shipmentJobs = jobs.filter(j => j.reference === selectedJob.reference);
                            const seqIndex = shipmentJobs.findIndex(j => j.id === selectedJob.id);
                            return `${getWorkflowPrefix(selectedJob.workflowName)}-${String(seqIndex + 1).padStart(4, '0')}`;
                          })()}
                        </h2>
                        {(() => {
                           const status = getJobStatus(selectedJob);
                           return (
                             <div className={`flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider group/status cursor-help relative border ${
                                status === JobStatus.READY ? 'bg-emerald-50 border-emerald-200 text-emerald-700' :
                                status === JobStatus.PENDING ? 'bg-blue-50 border-blue-200 text-blue-700' :
                                status === JobStatus.NEW ? 'bg-slate-50 border-slate-200 text-slate-500' :
                                status === JobStatus.REVIEW ? 'bg-amber-50 border-amber-200 text-amber-600' :
                                status === JobStatus.PROCESSING ? 'bg-blue-600 border-blue-700 text-white animate-pulse' :
                                status === JobStatus.REJECTED ? 'bg-rose-50 border-rose-200 text-rose-700' :
                                'bg-slate-50 border-slate-200 text-slate-500'
                              }`}
                              onClick={() => setShowStatusGuide(true)}
                              >
                                {(status === JobStatus.PROCESSING || status === JobStatus.REVIEW) && (
                                  <div className={`w-1.5 h-1.5 rounded-full ${status === JobStatus.PROCESSING ? 'bg-white' : 'bg-amber-500'} animate-pulse`}></div>
                                )}
                                {status === JobStatus.REJECTED && <Undo2 size={10} className="text-rose-500" />}
                                {status === JobStatus.READY
                                    ? (language === 'TH' ? 'เสร็จสมบูรณ์' : 'READY')
                                    : status === JobStatus.PENDING
                                    ? (language === 'TH' ? 'รอดำเนินการ' : 'PENDING')
                                    : status === JobStatus.NEW
                                    ? (language === 'TH' ? 'รอไฟล์ครบ' : 'PENDING FILES')
                                    : status === JobStatus.PROCESSING
                                    ? (language === 'TH' ? 'กำลังเปรียบเทียบข้อมูล' : 'COMPARING')
                                    : status === JobStatus.REVIEW
                                    ? (language === 'TH' ? 'รอตรวจสอบ' : 'REVIEW')
                                    : status === JobStatus.REJECTED
                                    ? (language === 'TH' ? 'ถูกตีกลับ' : 'REJECTED')
                                    : status}
                                <HelpCircle size={10} className="ml-1 opacity-40 group-hover/status:opacity-100 transition-opacity" />
                             </div>
                           );
                        })()}
                        {selectedJob.status === JobStatus.REJECTED && selectedJob.rejectionReason && (
                          <Tooltip content={language === 'TH' ? 'ดูเหตุผลที่ถูกตีกลับ' : 'View rejection reason'}>
                            <button
                              onClick={() => setShowRejectionReasonModal(true)}
                              className="w-5 h-5 rounded-full bg-rose-50 border border-rose-100 text-rose-500 flex items-center justify-center hover:bg-rose-100 transition-colors cursor-pointer shrink-0"
                            >
                              <StickyNote size={11} />
                            </button>
                          </Tooltip>
                        )}
                      </div>
                      <div className="flex items-center gap-2 flex-wrap">
                         <span className="flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-blue-50 border border-blue-200 text-[#1f5df9] text-[9px] font-black uppercase tracking-widest">
                           {selectedJob.reference}
                         </span>
                         <div className="w-1 h-1 bg-slate-200 rounded-full"></div>
                         <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{selectedJob.createdAt ? formatDisplayDate(selectedJob.createdAt) : 'N/A'}</p>
                         <div className="w-1 h-1 bg-slate-200 rounded-full"></div>
                         <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                           <span className="text-slate-400 text-[8px]">{language === 'TH' ? 'ผู้รับผิดชอบล่าสุด:' : 'LATEST ASSIGNEE:'}</span>
                           <span className="text-[#010136] font-extrabold font-mono text-[9px]">
                             {selectedJob.assignee || (language === 'TH' ? 'ยังไม่ได้มอบหมาย' : 'Unassigned')}
                           </span>
                         </p>
                      </div>
                   </div>
                </div>
              </div>

              <div className="flex items-center gap-2 p-1.5">

                  {/* 1. Show only differences Filter */}
                  <Tooltip position={isJobPanelFullscreen ? 'bottom' : 'top'} content={showOnlyDiff ? (language === 'TH' ? 'แสดงทั้งหมด' : 'Show All') : (language === 'TH' ? 'ดูเฉพาะที่ต่าง' : 'Show Only Differences')}>
                    <button 
                      disabled={isUnassigned}
                      onClick={() => setShowOnlyDiff(!showOnlyDiff)}
                      className={`p-2.5 rounded-[4px] transition-all border flex items-center justify-center cursor-pointer shadow-sm disabled:opacity-30 disabled:cursor-not-allowed ${
                        showOnlyDiff
                          ? 'bg-blue-50 text-blue-600 border-blue-200 hover:bg-blue-100 shadow-[0_2px_8px_rgba(31,93,249,0.15)]'
                          : 'bg-white text-slate-500 border-slate-200/60 hover:bg-slate-50'
                      }`}
                    >
                      <ListFilter size={15} strokeWidth={2.5} className={showOnlyDiff ? 'text-blue-500' : 'text-slate-400'} />
                    </button>
                  </Tooltip>

                  {/* Activity Logs for this job — who on the team did what, on which document/field */}
                  <Tooltip position={isJobPanelFullscreen ? 'bottom' : 'top'} content={language === 'TH' ? 'ดูประวัติกิจกรรมของรายการนี้' : 'View activity logs for this job'}>
                    <button
                      onClick={() => setShowJobLogsModal(true)}
                      className="p-2.5 rounded-[4px] transition-all border flex items-center justify-center cursor-pointer shadow-sm bg-white text-slate-500 border-slate-200/60 hover:bg-slate-50"
                    >
                      <History size={15} strokeWidth={2.5} className="text-slate-400" />
                    </button>
                  </Tooltip>

                  {/* Fullscreen — expands this job header + compare table card to fill the
                      viewport, for reviewing wide tables without the page chrome around it. */}
                  <Tooltip position={isJobPanelFullscreen ? 'bottom' : 'top'} content={isJobPanelFullscreen ? (language === 'TH' ? 'ออกจากเต็มหน้าจอ' : 'Exit Fullscreen') : (language === 'TH' ? 'ขยายเต็มหน้าจอ' : 'Fullscreen')}>
                    <button
                      onClick={() => setIsJobPanelFullscreen(!isJobPanelFullscreen)}
                      className={`p-2.5 rounded-[4px] transition-all border flex items-center justify-center cursor-pointer shadow-sm ${
                        isJobPanelFullscreen
                          ? 'bg-blue-50 text-blue-600 border-blue-200 hover:bg-blue-100 shadow-[0_2px_8px_rgba(31,93,249,0.15)]'
                          : 'bg-white text-slate-500 border-slate-200/60 hover:bg-slate-50'
                      }`}
                    >
                      {isJobPanelFullscreen
                        ? <Minimize2 size={15} strokeWidth={2.5} className="text-blue-500" />
                        : <Maximize2 size={15} strokeWidth={2.5} className="text-slate-400" />}
                    </button>
                  </Tooltip>

                  {/* Column Visibility Selector Option */}
                  {selectedJob && Object.keys(selectedJob.docs).length >= 3 && (
                    <div className="relative">
                      <Tooltip position={isJobPanelFullscreen ? 'bottom' : 'top'} content={language === 'TH' ? 'แสดง/ซ่อน คอลัมน์เอกสาร' : 'Show/Hide Document Columns'}>
                        <button
                          disabled={isUnassigned}
                          onClick={() => setShowColumnSelector(!showColumnSelector)}
                          className={`relative p-2.5 rounded-[4px] transition-all border flex items-center justify-center cursor-pointer shadow-sm disabled:opacity-30 disabled:cursor-not-allowed ${
                            showColumnSelector
                              ? 'bg-blue-50 text-[#1f5df9] border-blue-200 shadow-[0_2px_8px_rgba(31,93,249,0.15)]'
                              : 'bg-white text-slate-500 border-slate-200/60 hover:bg-slate-50'
                          }`}
                        >
                          <Eye size={15} strokeWidth={2.5} className={showColumnSelector ? 'text-[#1f5df9]' : 'text-slate-400'} />
                          {hiddenLockedDocs.length > 0 && (
                            <span className="absolute -top-1.5 -right-1.5 min-w-[16px] h-4 px-1 rounded-full bg-amber-500 text-white text-[9px] font-black flex items-center justify-center leading-none shadow-sm">
                              {hiddenLockedDocs.length}
                            </span>
                          )}
                        </button>
                      </Tooltip>

                      {showColumnSelector && (
                        <>
                          <div 
                            className="fixed inset-0 z-[590] cursor-default" 
                            onClick={() => setShowColumnSelector(false)} 
                          />
                          <div className="absolute right-0 mt-1.5 w-64 bg-white border border-slate-200 rounded-lg shadow-xl p-3 z-[600] select-none">
                            <p className="text-[10px] font-black text-[#010136] uppercase tracking-widest mb-2 pb-1.5 border-b border-slate-100 flex items-center justify-between">
                              <span>{language === 'TH' ? 'ตั้งค่าคอลัมน์' : 'COLUMN SETTINGS'}</span>
                              <span className="text-slate-400 font-mono">
                                {Object.keys(selectedJob.docs).length - hiddenLockedDocs.length}/{Object.keys(selectedJob.docs).length}
                              </span>
                            </p>
                            <div className="flex flex-col gap-1.5 max-h-60 overflow-y-auto custom-scrollbar">
                              {Object.keys(selectedJob.docs).map(docName => {
                                const isHidden = hiddenLockedDocs.includes(docName);
                                const isVisible = !isHidden;
                                const totalDocs = Object.keys(selectedJob.docs).length;
                                const visibleCount = totalDocs - hiddenLockedDocs.length;
                                const canHide = isVisible && (visibleCount > 2);
                                const disabled = isVisible && !canHide;

                                return (
                                  <label 
                                    key={docName} 
                                    className={`flex items-center justify-between gap-2 p-2 rounded-[4px] transition-all text-xs font-bold font-sans cursor-pointer ${
                                      disabled ? 'opacity-40 cursor-not-allowed bg-slate-50' : 'hover:bg-slate-50'
                                    }`}
                                    onClick={(e) => {
                                      if (disabled) {
                                        e.preventDefault();
                                      }
                                    }}
                                  >
                                    <div className="flex items-center gap-2 truncate">
                                      <input 
                                        type="checkbox"
                                        checked={isVisible}
                                        disabled={disabled}
                                        onChange={(e) => {
                                          if (e.target.checked) {
                                            setHiddenLockedDocs(prev => prev.filter(x => x !== docName));
                                          } else {
                                            if (canHide) {
                                              setHiddenLockedDocs(prev => [...prev, docName]);
                                            }
                                          }
                                        }}
                                        className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 h-3.5 w-3.5 cursor-pointer disabled:cursor-not-allowed"
                                      />
                                      <span className="truncate uppercase text-slate-700" title={docName}>{docName}</span>
                                    </div>
                                    {disabled && (
                                      <span className="text-[8px] font-black bg-slate-100 text-slate-400 px-1 py-0.5 rounded uppercase tracking-tighter scale-90 origin-right whitespace-nowrap">
                                        {language === 'TH' ? 'ต้องเหลืออย่างน้อย 2' : 'Min 2 required'}
                                      </span>
                                    )}
                                  </label>
                                );
                              })}
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                  )}

                  <div className="w-px h-6 bg-slate-200 mx-0.5"></div>

                  {/* 3. Bulk OCR - Read All files (only visible conditionally) */}
                  {selectedJob.status !== JobStatus.READY && Object.values(selectedJob.docs).some(s => s === ComparisonDocStatus.RECEIVED) && (
                    <Tooltip position={isJobPanelFullscreen ? 'bottom' : 'top'} content={t.btnBulkOCR}>
                      <button 
                        disabled={isUnassigned}
                        onClick={() => {
                          const newDocs = Object.entries(selectedJob.docs)
                            .filter(([_, status]) => status === ComparisonDocStatus.RECEIVED)
                            .map(([name]) => name);
                          handleOCRFiles(selectedJob.id, newDocs);
                        }}
                        className="p-2.5 rounded-[4px] transition-all shadow-md flex items-center justify-center bg-emerald-600 hover:bg-emerald-700 text-white border border-emerald-700/20 shadow-emerald-500/10 cursor-pointer animate-pulse disabled:opacity-30 disabled:cursor-not-allowed disabled:animate-none"
                      >
                        <ScanSearch size={15} strokeWidth={2.5} />
                      </button>
                    </Tooltip>
                  )}

                  {/* Reject Flow — from the 2nd job in a shipment onward, send the previous job
                      back for correction (e.g. a reviewer here spots the earlier job's document
                      is still wrong). */}
                  {canRejectToPreviousJob(selectedJob) && (
                    <Tooltip position={isJobPanelFullscreen ? 'bottom' : 'top'} content={language === 'TH' ? 'ตีกลับไปยังขั้นตอนก่อนหน้าเพื่อแก้ไข' : 'Reject back to the previous job for correction'}>
                      <button
                        disabled={isUnassigned}
                        onClick={() => setShowRejectFlowConfirm(true)}
                        className="p-2.5 rounded-[4px] transition-all flex items-center justify-center border disabled:opacity-30 disabled:cursor-not-allowed bg-white border-slate-200/60 text-slate-500 hover:bg-rose-50 hover:text-rose-600 hover:border-rose-200"
                      >
                        <Undo2 size={15} strokeWidth={2.5} />
                      </button>
                    </Tooltip>
                  )}

                  {/* 6. Finish / Export Data Button */}
                  <Tooltip position={isJobPanelFullscreen ? 'bottom' : 'top'} content={getLastSubItemExportTooltip(selectedJob, t.exportData)}>
                      <button
                      disabled={isUnassigned || selectedJob.status === JobStatus.READY || selectedJob.status === JobStatus.REJECTED || !isAllDocsMatched(selectedJob)}
                      onClick={() => {
                        setExportJob(selectedJob);
                        setExportOption('workflow');
                        setSelectedExportWorkflow(selectedJob.workflowName || '');
                        setSelectedExportPlatform('FTA');
                      }}
                      className={`px-3.5 py-2.5 rounded-[4px] transition-all flex items-center justify-center gap-1.5 border disabled:opacity-30 disabled:cursor-not-allowed ${
                        (selectedJob.status !== JobStatus.READY && selectedJob.status !== JobStatus.REJECTED && isAllDocsMatched(selectedJob))
                          ? 'bg-[#1f5df9] text-white border-[#1f5df9] hover:bg-[#104BE3] shadow-md shadow-blue-500/10'
                          : 'bg-white border-slate-200/60 text-slate-400 opacity-50 cursor-not-allowed'
                      }`}
                    >
                      <Send size={15} strokeWidth={2.5} />
                      <span className="text-xs font-black uppercase tracking-wider whitespace-nowrap">
                        {language === 'TH' ? 'เสร็จสิ้น' : 'Done'}
                      </span>
                    </button>
                  </Tooltip>
              </div>
            </div>

            {/* Flow stepper — shows which job in this shipment's sequence is currently open.
                Read-only (navigation between steps is already gated in the shipment job list).
                Collapses once the matrix table below is scrolled, to free up table height, and
                reappears once scrolled back to the top. */}
            {(() => {
              const shipmentSteps = jobs.filter(j => j.reference === selectedJob.reference);
              return (
                <div className={`overflow-hidden shrink-0 transition-[max-height] duration-300 ease-in-out will-change-[max-height] ${tableScrolledPastTop ? 'max-h-0' : 'max-h-24'}`}>
                <div className="px-6 py-3 bg-slate-50/60 border-b border-slate-200 flex items-center gap-1.5 overflow-x-auto">
                  {shipmentSteps.map((step, idx) => {
                    const isActive = step.id === selectedJob.id;
                    const teamLabel = MOCK_TEAMS.find(team => team.value === step.assignedTeam)?.label || (language === 'TH' ? 'ยังไม่ได้กำหนด' : 'Unassigned');
                    return (
                      <React.Fragment key={step.id}>
                        {idx > 0 && <ChevronRight size={14} className="text-slate-300 shrink-0" />}
                        <div
                          className={`flex items-center gap-2.5 px-3 py-1.5 rounded-lg border transition-all shrink-0 ${
                            isActive ? 'bg-blue-50 border-blue-300 shadow-sm' : 'bg-white border-slate-200'
                          }`}
                        >
                          <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-black shrink-0 ${
                            isActive ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-400'
                          }`}>
                            {idx + 1}
                          </div>
                          <div className="flex flex-col items-start leading-tight">
                            <span className={`text-[11px] font-black whitespace-nowrap ${isActive ? 'text-blue-900' : 'text-slate-500'}`}>
                              {step.workflowName?.replace(/\s*\[[^\]]*\]\s*$/, '') || 'N/A'}
                            </span>
                            <span className={`text-[9px] font-bold uppercase tracking-wide whitespace-nowrap ${isActive ? 'text-blue-400' : 'text-slate-300'}`}>
                              {teamLabel}
                            </span>
                          </div>
                        </div>
                      </React.Fragment>
                    );
                  })}
                </div>
                </div>
              );
            })()}

            <div className="flex-1 flex overflow-hidden relative">
               {/* Main Content Area: Comparison Matrix Grid */}
               <div className="flex-1 overflow-hidden flex flex-col bg-white">
                  {/* Legend — matches the icon/cell colors used in the matrix below */}
                  <div className="px-4 py-1.5 border-b border-slate-100 bg-slate-50/40 flex items-center gap-4 shrink-0">
                     <div className="flex items-center gap-1.5">
                        <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                        <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">{language === 'TH' ? 'ชุดข้อมูลหลัก' : 'Main Doc'}</span>
                     </div>
                     <div className="flex items-center gap-1.5">
                        <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                        <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">{language === 'TH' ? 'ตรงกัน' : 'Matched'}</span>
                     </div>
                     <div className="flex items-center gap-1.5">
                        <div className="w-2 h-2 rounded-full bg-rose-500"></div>
                        <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">{language === 'TH' ? 'ไม่ตรงกัน' : 'Mismatched'}</span>
                     </div>
                  </div>
                  <div
                    className="flex-1 overflow-auto custom-scrollbar relative"
                    onScroll={(e) => handleTableScroll(e.currentTarget.scrollTop)}
                  >
                     <table className="w-full border-separate border-spacing-0 sticky top-0 z-40 bg-white" style={{ tableLayout: 'fixed' }}>
                        <colgroup>
                           <col className="w-[180px]" style={{ minWidth: '180px' }} />
                           {comparedDocs.map(docName => (
                              <col key={`col-${docName}`} className="w-[180px]" style={{ minWidth: '180px' }} />
                           ))}
                        </colgroup>
                        <thead>
                           <tr>
                              <th className={`bg-slate-50 border-b border-r border-slate-200 px-4 py-1.5 min-w-[180px] flex items-center justify-center uppercase tracking-tighter shadow-[2px_0_5px_rgba(0,0,0,0.02)] sticky left-0 z-40 transition-[height] duration-300 will-change-[height] ${tableScrolledPastTop ? 'h-[48px]' : 'h-[82px]'}`}>
                                 <h3 className="text-[10px] font-black text-slate-700 uppercase tracking-widest leading-none text-center">{t.masterVsDocs}</h3>
                              </th>

                              {comparedDocs.map(docName => {
                                 const docStatus = selectedJob.docs[docName];
                                 const isMismatched = mismatchedFileNames.has(docName);
                                 const isReady = docStatus !== ComparisonDocStatus.RECEIVED && docStatus !== ComparisonDocStatus.EXTRACTING && docStatus !== ComparisonDocStatus.MISSING;
                                 
                                 // Derived status for display - override MATCHED if there are actual mismatches in data
                                 const displayStatus = (docStatus === ComparisonDocStatus.MATCHED || docStatus === ComparisonDocStatus.MISMATCHED)
                                   ? (isMismatched ? ComparisonDocStatus.MISMATCHED : ComparisonDocStatus.MATCHED)
                                   : docStatus;
                                 
                                 return (
                                   <th key={docName} className={`bg-slate-50 border-b border-slate-200 px-2 py-1.5 min-w-[180px] text-center group cursor-pointer hover:bg-slate-100 transition-[height,background-color] duration-300 will-change-[height] border-r border-slate-100 z-30 relative ${tableScrolledPastTop ? 'h-[48px]' : 'h-[82px]'}`} onClick={() => isReady && setPdfPreviewUrl(DEMO_PREVIEW_FILENAME_OVERRIDES[selectedJob.id]?.[docName] || docName)}>
                                       {(docStatus === ComparisonDocStatus.RECEIVED || docStatus === ComparisonDocStatus.MISSING) && (
                                         <div className="absolute inset-0 z-50 bg-white/95 backdrop-blur-[1px] flex flex-col items-center justify-between p-1.5 border-x border-slate-100 shadow-inner">
                                            <div className="flex items-center justify-between w-full gap-1 px-1 py-0.5">
                                              <span className="text-[10px] font-black text-[#010136] uppercase tracking-widest leading-none truncate max-w-[100px]" title={docName}>
                                                {docName.length > 11 ? (
                                                  <Tooltip content={docName}>
                                                    <span className="cursor-help hover:text-[#1f5df9] transition-colors">{docName.slice(0, 11) + '...'}</span>
                                                  </Tooltip>
                                                ) : (
                                                  docName
                                                )}
                                              </span>
                                              <div className="flex items-center gap-1 shrink-0 bg-white/40 p-0.5 rounded shadow-sm border border-slate-100/50">
                                              </div>
                                            </div>
                                            <button
                                             disabled={isUnassigned || selectedJob.status === JobStatus.READY}
                                             onClick={(e) => {
                                               e.stopPropagation();
                                               if (docStatus === ComparisonDocStatus.MISSING) {
                                                  setReplaceTargetColumn(docName);
                                                  setReplaceIsResubmission(false);
                                                  setReplaceMode('replace');
                                                  setShowReplaceModal(true);
                                               } else {
                                                  handleOCRFiles(selectedJob.id, [docName]);
                                               }
                                             }}
                                             className={`w-full h-7 text-white rounded-[4px] flex items-center justify-center gap-1.5 transition-all transform active:scale-95 border-none cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed disabled:transform-none disabled:active:scale-100 ${
                                               docStatus === ComparisonDocStatus.MISSING
                                                 ? 'bg-[#1F5DF9] hover:bg-[#104BE3] shadow-md shadow-blue-500/25 disabled:hover:bg-[#1F5DF9]'
                                                 : 'bg-emerald-600 hover:bg-emerald-700 shadow-md shadow-emerald-500/25 disabled:hover:bg-emerald-600'
                                             }`}
                                           >
                                             {docStatus === ComparisonDocStatus.MISSING ? (
                                                <Upload size={10} strokeWidth={2.5} />
                                             ) : (
                                                <FileText size={10} strokeWidth={2.5} />
                                             )}
                                             <span className="text-[9px] font-black uppercase tracking-widest">
                                                {docStatus === ComparisonDocStatus.MISSING 
                                                   ? (language === 'TH' ? 'อัปโหลดไฟล์' : 'Upload File')
                                                   : t.btnReadFile}
                                             </span>
                                           </button>
                                         </div>
                                       )}
                                       {docStatus === ComparisonDocStatus.EXTRACTING && (
                                         <div className="absolute inset-0 z-50 bg-blue-50/95 backdrop-blur-[1px] flex flex-col items-center justify-center p-2 border-x border-blue-100">
                                            <span className="text-[10px] font-black text-blue-800 uppercase tracking-widest leading-none mb-2.5">
                                             {docName.length > 15 ? (
                                               <Tooltip content={docName}>
                                                 <span className="cursor-help hover:text-indigo-600 transition-colors">{docName.slice(0, 15) + '...'}</span>
                                               </Tooltip>
                                             ) : (
                                               docName
                                             )}
                                            </span>
                                            <div className="flex flex-col items-center gap-1.5 translate-y-[-2px]">
                                              <Loader2 size={22} className="text-blue-600 animate-spin" />
                                              <span className="text-[8px] font-black text-blue-600 uppercase tracking-widest animate-pulse">{t.msgOcrInProgress}</span>
                                            </div>
                                            <div className="absolute bottom-0 left-0 h-1 bg-blue-500 transition-all duration-[5000ms] w-full origin-left ease-linear" style={{ animation: 'progress 5s linear forwards' }}></div>
                                            <style>{`
                                              @keyframes progress {
                                                from { width: 0%; }
                                                to { width: 100%; }
                                              }
                                            `}</style>
                                         </div>
                                       )}
                                      <div className={`flex flex-col items-center transition-[gap] duration-300 ${tableScrolledPastTop ? 'gap-0.5' : 'gap-3'}`}>
                                         {/* Status and Action Buttons */}
                                         <div className="flex items-center justify-between w-full px-1">
                                            <div className={`flex items-center gap-1.5 origin-left transition-transform duration-300 will-change-transform ${tableScrolledPastTop ? 'scale-90' : 'scale-100'} ${
                                              displayStatus === ComparisonDocStatus.MATCHED || displayStatus === ComparisonDocStatus.LOCKED ? 'px-2.5 py-0.5 bg-emerald-50 text-emerald-600 border border-emerald-200/60 rounded-[4px] shadow-sm' :
                                              displayStatus === ComparisonDocStatus.OCR_DONE ? 'px-2.5 py-0.5 bg-amber-50 text-amber-600 border border-amber-200/60 rounded-[4px] shadow-sm' :
                                              displayStatus === ComparisonDocStatus.ERROR || displayStatus === ComparisonDocStatus.MISMATCHED ? 'px-2.5 py-0.5 bg-rose-50 text-rose-600 border border-rose-200/60 rounded-[4px] shadow-sm' :
                                              displayStatus === ComparisonDocStatus.SKIPPED ? 'px-2.5 py-0.5 bg-slate-100 text-slate-500 border border-slate-200/60 rounded-[4px] shadow-sm' :
                                              ''
                                            }`}>
                                               <div className={`w-1.5 h-1.5 rounded-full ${
                                                 displayStatus === ComparisonDocStatus.MATCHED || displayStatus === ComparisonDocStatus.LOCKED ? 'bg-emerald-500' :
                                                 displayStatus === ComparisonDocStatus.OCR_DONE ? 'bg-amber-500' :
                                                 displayStatus === ComparisonDocStatus.EXTRACTING || displayStatus === ComparisonDocStatus.RECEIVED ? 'bg-amber-500 animate-pulse' :
                                                 displayStatus === ComparisonDocStatus.ERROR || displayStatus === ComparisonDocStatus.MISMATCHED ? 'bg-rose-500' :
                                                 displayStatus === ComparisonDocStatus.SKIPPED ? 'bg-slate-400' :
                                                 'bg-slate-300'
                                               }`}></div>
                                               <span className={`text-[9px] font-black uppercase tracking-wider ${
                                                 displayStatus === ComparisonDocStatus.MATCHED || displayStatus === ComparisonDocStatus.LOCKED ? 'text-emerald-500' :
                                                 displayStatus === ComparisonDocStatus.OCR_DONE ? 'text-amber-500' :
                                                 displayStatus === ComparisonDocStatus.EXTRACTING || displayStatus === ComparisonDocStatus.RECEIVED ? 'text-amber-500' :
                                                 displayStatus === ComparisonDocStatus.ERROR || displayStatus === ComparisonDocStatus.MISMATCHED ? 'text-rose-500' :
                                                 displayStatus === ComparisonDocStatus.SKIPPED ? 'text-slate-500' :
                                                 'text-slate-400'
                                               }`}>
                                                   {
                                                     displayStatus === ComparisonDocStatus.LOCKED ? t.statusLocked :
                                                     (displayStatus === ComparisonDocStatus.RECEIVED || displayStatus === ComparisonDocStatus.EXTRACTING) ? t.statusReceived :
                                                     displayStatus === ComparisonDocStatus.OCR_DONE ? t.statusOcrDone :
                                                     displayStatus === ComparisonDocStatus.SKIPPED ? t.statusSkipped :
                                                     displayStatus === ComparisonDocStatus.MISMATCHED ? 'UNMATCHED' :
                                                     displayStatus
                                                   }
                                               </span>
                                            </div>

                                            
                                             <div className={`flex items-center gap-1 origin-right transition-transform duration-300 will-change-transform ${tableScrolledPastTop ? 'scale-90' : 'scale-100'}`}>
                                               {displayStatus === ComparisonDocStatus.MISMATCHED && (
                                                    <Tooltip content={language === 'TH' ? 'ยืนยันใช้ค่านี้ทั้งเอกสาร' : 'Confirm all mismatches in this document'}>
                                                      <button
                                                        disabled={isUnassigned || selectedJob.status === JobStatus.READY}
                                                        onClick={(e) => {
                                                          e.stopPropagation();
                                                          setConfirmAllMismatchesTargetDocName(docName);
                                                        }}
                                                        className={`h-[18px] w-[18px] flex items-center justify-center rounded-[4px] bg-white border border-slate-200 transition-all ${
                                                          (isUnassigned || selectedJob.status === JobStatus.READY)
                                                          ? 'text-slate-200 cursor-not-allowed opacity-50'
                                                          : 'text-rose-400 hover:bg-rose-500 hover:text-white hover:border-rose-500 hover:shadow-lg shadow-sm cursor-pointer'
                                                        }`}
                                                      >
                                                        <CheckCheck size={10} strokeWidth={2.5} />
                                                      </button>
                                                    </Tooltip>
                                               )}
                                               {docStatus === ComparisonDocStatus.MISMATCHED && displayStatus === ComparisonDocStatus.MATCHED && (
                                                    <Tooltip content={language === 'TH' ? 'ยกเลิกการยืนยันทั้งเอกสาร (กลับไปเป็นไม่ตรงกัน)' : 'Undo confirm-all (revert to mismatched)'}>
                                                      <button
                                                        disabled={isUnassigned || selectedJob.status === JobStatus.READY}
                                                        onClick={(e) => {
                                                          e.stopPropagation();
                                                          unconfirmAllMismatchesInDoc(docName);
                                                        }}
                                                        className={`h-[18px] w-[18px] flex items-center justify-center rounded-[4px] bg-white border border-slate-200 transition-all ${
                                                          (isUnassigned || selectedJob.status === JobStatus.READY)
                                                          ? 'text-slate-200 cursor-not-allowed opacity-50'
                                                          : 'text-slate-400 hover:bg-slate-500 hover:text-white hover:border-slate-500 hover:shadow-lg shadow-sm cursor-pointer'
                                                        }`}
                                                      >
                                                        <Undo2 size={10} strokeWidth={2.5} />
                                                      </button>
                                                    </Tooltip>
                                               )}
                                               <Tooltip content={
                                                 (docComments[`${selectedJob.id}_${docName}`]?.length ?? 0) > 0
                                                   ? (language === 'TH' ? 'ดูความคิดเห็น' : 'View comments')
                                                   : (language === 'TH' ? 'เพิ่มความคิดเห็น' : 'Add comment')
                                               }>
                                                 <button
                                                   onClick={(e) => {
                                                     e.stopPropagation();
                                                     setCommentDraft('');
                                                     setNoteEditorDocName(docName);
                                                   }}
                                                   className={`h-[18px] w-[18px] flex items-center justify-center rounded-[4px] border transition-all cursor-pointer relative ${
                                                     (docComments[`${selectedJob.id}_${docName}`]?.length ?? 0) > 0
                                                       ? 'bg-amber-400 border-amber-400 text-white hover:bg-amber-500 hover:border-amber-500 shadow-sm'
                                                       : 'bg-white border-slate-200 text-slate-400 hover:bg-slate-500 hover:text-white hover:border-slate-500 hover:shadow-lg shadow-sm'
                                                   }`}
                                                 >
                                                   <StickyNote size={10} strokeWidth={2.5} />
                                                   {(docComments[`${selectedJob.id}_${docName}`]?.length ?? 0) > 0 && (
                                                     <span className="absolute -top-1.5 -right-1.5 min-w-[12px] h-[12px] px-0.5 rounded-full bg-rose-500 text-white text-[7px] font-black flex items-center justify-center leading-none">
                                                       {docComments[`${selectedJob.id}_${docName}`]!.length}
                                                     </span>
                                                   )}
                                                 </button>
                                               </Tooltip>
                                               {(displayStatus === ComparisonDocStatus.MISMATCHED || displayStatus === ComparisonDocStatus.MATCHED) && (
                                                    <Tooltip content={language === 'TH' ? 'อัปโหลดไฟล์ใหม่ (Replace)' : 'Replace File'}>
                                                      <button
                                                        disabled={isUnassigned || selectedJob.status === JobStatus.READY}
                                                        onClick={(e) => {
                                                          e.stopPropagation();
                                                          setReplaceTargetColumn(docName);
                                                          setReplaceIsResubmission(true);
                                                          setReplaceMode('replace');
                                                          setShowReplaceModal(true);
                                                        }}
                                                        className={`h-[18px] w-[18px] flex items-center justify-center rounded-[4px] bg-white border border-slate-200 transition-all ${
                                                          (isUnassigned || selectedJob.status === JobStatus.READY)
                                                          ? 'text-slate-200 cursor-not-allowed opacity-50'
                                                          : 'text-indigo-400 hover:bg-indigo-500 hover:text-white hover:border-indigo-500 hover:shadow-lg shadow-sm cursor-pointer'
                                                        }`}
                                                      >
                                                        <Upload size={10} strokeWidth={2.5} />
                                                      </button>
                                                    </Tooltip>
                                               )}
                                             </div>
                                         </div>

                                         <div className="flex flex-col items-center gap-0">
                                            <span className={`font-black tracking-tight flex items-center gap-1 uppercase transition-[font-size] duration-300 ${tableScrolledPastTop ? 'text-[10px]' : 'text-[11px]'} ${displayStatus === ComparisonDocStatus.MISMATCHED ? 'text-rose-500' : 'text-slate-800'}`}>
                                               {docName.length > 14 ? (
                                                 <Tooltip content={docName}>
                                                   <span className="cursor-help hover:text-indigo-600 transition-colors">{docName.slice(0, 14) + '...'}</span>
                                                 </Tooltip>
                                               ) : (
                                                 docName
                                               )}
                                               {isReady && <Eye size={10} className="opacity-0 group-hover:opacity-100 transition-opacity" />}
                                            </span>
                                         </div>

                                         {false && selectedJob.updatedDocs?.includes(docName) && (
                                           <span className="bg-blue-50 text-blue-600 text-[8px] font-black px-1.5 py-0.5 rounded-sm border border-blue-100 flex items-center gap-1 mt-1 transition-all animate-in fade-in zoom-in duration-300">
                                             <RotateCcw size={8} strokeWidth={3} />
                                             Updated
                                           </span>
                                         )}
                                      </div>
                                   </th>
                                 );
                              })}
                           </tr>
                        </thead>
                     </table>
                      {(!selectedJob || !Object.values(selectedJob.docs).some(status => 
                        status !== ComparisonDocStatus.MISSING && 
                        status !== ComparisonDocStatus.RECEIVED && 
                        status !== ComparisonDocStatus.EXTRACTING &&
                        status !== ComparisonDocStatus.ERROR
                      )) ? (
                         <div className="flex flex-col items-center justify-center py-20 px-4 text-center bg-white border border-slate-200/60 rounded-b-2xl mx-1 my-1 select-none">
                            <div className="w-16 h-16 rounded-2xl bg-indigo-50 border border-indigo-100/50 flex items-center justify-center text-indigo-500 mb-4 shadow-sm animate-pulse">
                               <UploadCloud size={24} className="text-indigo-500" />
                            </div>
                            <h4 className="text-sm font-black text-[#010136] tracking-tight mb-1.5 uppercase font-sans">
                               {language === 'TH' ? 'คลิกอ่านไฟล์เพื่อแสดงข้อมูลเปรียบเทียบ' : 'No Files Read in This Job Yet'}
                            </h4>
                            <p className="text-xs text-slate-400 font-semibold max-w-md mb-6 leading-relaxed">
                               {language === 'TH'
                                 ? 'ตารางจะเป็นค่าว่างจนกว่าจะมีการอัปโหลดและกดอ่านไฟล์สำเร็จอย่างน้อย 1 ไฟล์'
                                 : 'This comparison table is empty until at least one file is uploaded and read.'}
                            </p>
                         </div>
                      ) : (
                            showOnlyDiff && !comparisonResults.some(res => res.targets.some((t: any) => t.status === 'MISMATCH')) ? (
                              <div className="flex flex-col items-center justify-center py-20 px-4 text-center bg-white border border-slate-200/60 rounded-b-2xl mx-1 my-1 select-none w-full">
                                 <div className="w-16 h-16 rounded-2xl bg-emerald-50 border border-emerald-100/50 flex items-center justify-center text-emerald-500 mb-4 shadow-sm">
                                    <ShieldCheck size={28} className="text-emerald-500" />
                                 </div>
                                 <h4 className="text-sm font-black text-[#010136] tracking-tight mb-1.5 uppercase font-sans">
                                    {language === 'TH' ? 'ข้อมูลทุกฟิลด์ตรงกันเสร็จสมบูรณ์ 100%' : 'All Fields Match 100%'}
                                 </h4>
                                 <p className="text-xs text-slate-400 font-semibold max-w-md mb-6 leading-relaxed">
                                    {language === 'TH'
                                      ? 'ไม่พบค่าข้อมูลที่ขัดแย้งกันในกลุ่มเอกสารนี้ คุณสามารถปิดฟิลเตอร์ "ดูเฉพาะที่ต่าง" เพื่อตรวจสอบฟิลด์ข้อมูลทั้งหมดได้'
                                      : 'No conflicting data values found in this document group. You can toggle off "Show Only Differences" to view all fields.'}
                                 </p>
                                 <button
                                   onClick={() => setShowOnlyDiff(false)}
                                   className="px-4 py-2 bg-[#1F5DF9] hover:bg-[#104BE3] text-white rounded-[4px] text-xs font-black uppercase tracking-widest transition-all shadow-sm cursor-pointer border-none"
                                 >
                                   {language === 'TH' ? 'ดูข้อมูลทั้งหมด' : 'Show All Data'}
                                 </button>
                              </div>
                            ) : ['Header', 'Description', 'Footer'].map(part => {
                              const originalPartResults = comparisonResults.filter(res => (res as any).part === part);
                              const partResults = originalPartResults
                                .filter(res => !showOnlyDiff || res.targets.some((t: any) => t.status === 'MISMATCH'));
                              
                              if (partResults.length === 0) return null;

                              let displayMatchCount = 0;
                              let displayMismatchCount = 0;
                              let totalLabel = originalPartResults.length;

                              const readDocsCount = selectedJob ? Object.values(selectedJob.docs).filter(status => 
                                status !== ComparisonDocStatus.MISSING && 
                                status !== ComparisonDocStatus.RECEIVED && 
                                status !== ComparisonDocStatus.EXTRACTING && 
                                status !== ComparisonDocStatus.ERROR
                              ).length : 0;
                              const showHeaderBadges = readDocsCount >= 2;

                              if (part === 'Description') {
                                const groups = Array.from(new Set(originalPartResults.map(r => r.group || 'no-group'))).filter(g => g !== 'no-group');
                                totalLabel = groups.length;
                                
                                groups.forEach(groupName => {
                                  const groupFields = originalPartResults.filter(r => r.group === groupName);
                                  const hasMismatch = groupFields.some(r => r.targets.some(t => t.status === 'MISMATCH'));

                                  if (hasMismatch) displayMismatchCount++;
                                  else displayMatchCount++;
                                });
                              } else {
                                displayMismatchCount = originalPartResults.filter(r => r.targets.some((t: any) => t.status === 'MISMATCH')).length;
                                displayMatchCount = originalPartResults.length - displayMismatchCount;
                              }

                              return (
                                <table key={part} className="w-full border-separate border-spacing-0" style={{ tableLayout: 'fixed' }}>
                                   <colgroup>
                                      <col className="w-[180px]" style={{ minWidth: '180px' }} />
                                      {comparedDocs.map(docName => (
                                         <col key={`col-${docName}`} className="w-[180px]" style={{ minWidth: '180px' }} />
                                      ))}
                                   </colgroup>
                                   <thead className={`sticky z-[25] bg-slate-50 shadow-[0_1px_4px_rgba(0,0,0,0.02)] transition-[top] duration-300 will-change-[top] ${tableScrolledPastTop ? 'top-[48px]' : 'top-[82px]'}`}>
                                     <tr className="group cursor-pointer hover:bg-slate-100 transition-all" onClick={() => togglePart(part)}>
                                       <th 
                                         colSpan={comparedDocs.length + 1} 
                                         className="p-0 border-y border-slate-200/80 font-normal text-left"
                                       >
                                         <div className="sticky left-0 px-6 py-1.5 flex items-center justify-between w-fit gap-10 whitespace-nowrap z-30">
                                           <div className="flex items-center gap-4">
                                             <div className="flex items-center gap-3">
                                               <div className="w-5 h-5 rounded bg-white border border-slate-200 flex items-center justify-center shadow-sm text-slate-400 group-hover:text-blue-600 transition-colors scale-90">
                                                 {collapsedParts[part] ? <ChevronRight size={10} /> : <ChevronDown size={10} />}
                                               </div>
                                                <div className="flex items-center gap-2">
                                                  <span className="text-[10px] font-black uppercase tracking-[0.1em] text-slate-800 group-hover:text-blue-600 transition-colors uppercase">{part}</span>
                                                  <span className="text-[10px] font-black text-slate-400">:</span>
                                                  <span className="text-[10px] font-black text-slate-600">
                                                    {totalLabel} {part === 'Description' ? t.itemsList : t.itemsDataset}
                                                  </span>
                                                </div>
                                              </div>
                                              
                                              {showHeaderBadges && (
                                                <div className="flex items-center gap-1.5 translate-y-[1px]">
                                                 <Tooltip content={part === 'Description' ? t.ttMatchedCountDesc : t.ttMatchedCount}><div className={`flex items-center gap-1 px-1.5 py-0.5 rounded border text-[9px] font-black tracking-tight ${showOnlyDiff ? 'bg-slate-50 text-slate-400 border-slate-200 shadow-none opacity-60' : (displayMatchCount > 0 ? 'bg-emerald-50 text-emerald-600 border-emerald-100/50 shadow-sm' : 'bg-slate-50 text-slate-300 border-slate-100')}`}>
                                                   <Check size={9} strokeWidth={4} />
                                                   <span>{displayMatchCount}</span>
                                                 </div>
                                                 </Tooltip>
                                                 {displayMismatchCount > 0 && (
                                                   <Tooltip content={part === 'Description' ? t.ttMismatchedCountDesc : t.ttMismatchedCount}><div className="flex items-center gap-1 px-1.5 py-0.5 rounded border bg-rose-50 text-rose-600 border-rose-100/50 shadow-sm text-[9px] font-black tracking-tight">
                                                     <AlertCircle size={9} strokeWidth={2.5} />
                                                     <span>{displayMismatchCount}</span>
                                                   </div>
                                                   </Tooltip>
                                                 )}
                                               </div>
                                              )}
                                           </div>
                                         </div>
                                       </th>
                                     </tr>
                                   </thead>
                                   {!collapsedParts[part] && (() => {
                                       const groupsInPart = Array.from(new Set(partResults.map(r => r.group || 'no-group')));
                                       return groupsInPart.map((group, groupIdx) => {
                                         const groupFields = partResults.filter(r => (r.group || 'no-group') === group);
                                         
                                         return (
                                           <tbody key={group}>
                                             {group !== 'no-group' && (
                                                <tr className="bg-slate-100/80 group/itemheader hover:bg-slate-200/50 cursor-pointer transition-colors" onClick={(e) => toggleGroup(e, group as string)}>
                                                   <td colSpan={comparedDocs.length + 1} className={`sticky z-[24] p-0 border-y-2 border-slate-200/80 bg-slate-100/90 shadow-sm relative transition-[top] duration-300 will-change-[top] ${tableScrolledPastTop ? 'top-[80px]' : 'top-[114px]'}`}>
                                                      <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-[#1f5df9]"></div>
                                                      <div className="flex items-center gap-3 sticky left-0 pl-8 pr-6 py-2.5 z-[26] w-fit">
                                                         <div className="w-5 h-5 rounded bg-white border border-slate-200 shadow-sm flex items-center justify-center text-slate-500 group-hover/itemheader:text-blue-600 group-hover/itemheader:border-blue-200 transition-all">
                                                            {collapsedGroups[group] ? <ChevronRight size={12} strokeWidth={3} /> : <ChevronDown size={12} strokeWidth={3} />}
                                                         </div>
                                                         <span className="font-black text-[11px] text-slate-800 uppercase tracking-widest">{group}</span>
                                                         <div className="flex items-center gap-1.5 ml-2">
                                                            {(() => {
                                                              const groupFields = originalPartResults.filter(r => (r.group || 'no-group') === group);
                                                              const hasUncompared = groupFields.some(r => r.targets.some(t => t.status === 'WAITING' || t.status === 'NA'));
                                                              const mismatchF = groupFields.filter(r => r.targets.some(t => t.status === 'MISMATCH')).length;
                                                              const matchF = groupFields.length - mismatchF;

                                                              return (
                                                                <>
                                                                  {!hasUncompared && matchF > 0 && (
                                                                    <Tooltip content={part === 'Description' ? t.ttMatchedCountDesc : t.ttMatchedCount}>
                                                                      <div className="flex items-center gap-1.5 bg-emerald-50 text-emerald-700 px-2 py-1 rounded border border-emerald-200/60 text-[9px] font-black leading-none shadow-sm"><div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div>{matchF} {language === 'TH' ? 'ตรงกัน' : 'Matched'}</div>
                                                                    </Tooltip>
                                                                  )}
                                                                  {!hasUncompared && mismatchF > 0 && (
                                                                    <Tooltip content={part === 'Description' ? t.ttMismatchedCountDesc : t.ttMismatchedCount}>
                                                                      <div className="flex items-center gap-1.5 bg-rose-50 text-rose-700 px-2 py-1 rounded border border-rose-200/60 text-[9px] font-black leading-none shadow-sm"><div className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse"></div>{mismatchF}  {language === 'TH' ? 'ไม่ตรงกัน' : 'Mismatched'}</div>
                                                                    </Tooltip>
                                                                  )}
                                                                </>
                                                              );
                                                            })()}
                                                         </div>
                                                      </div>
                                                   </td>
                                                </tr>
                                             )}
                                             {!collapsedGroups[group] && groupFields.map((res, i) => (
                                              <tr key={res.fieldName} className={`hover:bg-slate-50/80 transition-colors group/row ${i === groupFields.length - 1 ? 'border-b-2 border-slate-200/80' : ''}`}>
                                                 <td className={`sticky left-0 z-20 bg-slate-50 border-r border-r-slate-100 border-t border-t-slate-200 p-4 font-black text-slate-700 group-hover/row:text-[#1f5df9] shadow-[2px_0_10px_rgba(0,0,0,0.02)] transition-colors relative`}>
                                                  {group !== 'no-group' && <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-slate-100"></div>}
                                                  <div className="flex flex-col ml-1">
                                                     <span className="text-[11px] tracking-wide">{res.fieldName}</span>
                                                     {res.part === 'Description' && (
                                                       <span className="text-[9px] font-bold text-slate-600 mt-1 tracking-wider bg-slate-100 w-fit px-1.5 py-0.5 rounded font-mono">
                                                         {generateItemBarcode(res.group)}
                                                       </span>
                                                     )}
                                                  </div>
                                               </td>

                                 {comparedDocs.map(docName => {
                                    const target = res.targets.find(t => t.fileName === docName);
                                    if (selectedJob && getNoRuleCellsForJob(selectedJob.id, comparedDocs).has(noRuleCellKey(res.fieldName, docName))) {
                                      return (
                                        <td key={docName} className="p-0 border-r border-r-slate-100 border-t border-t-slate-200 bg-slate-100/60">
                                          <div className="min-h-full py-4" />
                                        </td>
                                      );
                                    }
                                    const isMissing = selectedJob && selectedJob.docs[docName] === ComparisonDocStatus.MISSING;
                                    if (isMissing) {
                                      return (
                                        <td key={docName} className="p-0 border-r border-r-slate-100 border-t border-t-slate-200 bg-slate-50/5">
                                          <div className="px-4 py-4 text-xs font-bold text-slate-400 text-center flex items-center justify-center min-h-full font-mono">
                                            -
                                          </div>
                                        </td>
                                      );
                                    }
                                    if (!target) {
                                      return (
                                        <td key={docName} className="p-0 border-r border-r-slate-100 border-t border-t-slate-200 bg-slate-50/5">
                                          <div className="px-4 py-4 text-[10px] font-black text-slate-300 text-center flex items-center justify-center gap-1.5 min-h-full">
                                             <Loader2 size={10} className="animate-spin opacity-40" />
                                             <span className="uppercase tracking-widest opacity-40">WAITING</span>
                                          </div>
                                        </td>
                                      );
                                    }
                                    const isUserConfirmed = target && (target.ruleTitle === 'ยืนยันโดยผู้ใช้' || target.ruleTitle === 'Confirmed by User' || target.ruleTitle === 'ผ่านการตรวจสอบแล้ว' || target.ruleTitle === 'Verified');
                                    return (
                                      <td key={docName} className={`p-0 border-r border-r-slate-100 border-t border-t-slate-200 transition-all ${
                                         (target as any).isPrimary ? 'bg-blue-50' :
                                         isUserConfirmed ? 'bg-emerald-50/10' :
                                         (target.status === 'MATCH' || target.status === 'SYNONYM') ? 'bg-emerald-50' :
                                         target.status === 'WAITING' ? 'bg-white' :
                                         target.status === 'MISMATCH' ? 'bg-rose-50/30' :
                                         'bg-slate-50/10 opacity-50'
                                      }`}>
                                         <div className={`px-4 py-4 text-[11px] font-black text-center min-h-full flex flex-col items-center justify-center gap-1.5 group/cell relative overflow-visible ${
                                            isUserConfirmed ? 'text-emerald-700' :
                                            (target.status === 'MATCH' || target.status === 'SYNONYM') ? 'text-slate-600' :
                                            target.status === 'WAITING' ? 'text-slate-500' :
                                            target.status === 'MISMATCH' ? 'text-rose-600' :
                                            'text-slate-300'
                                         }`}>
                                            <div className="flex items-center gap-2">
                                               <span className="break-all">
                                                   {target.status === 'MISMATCH' && target.value && res.sourceValue ? (
                                                     diffChars(String(target.value), String(res.sourceValue)).map((part, index) => {
                                                       if (part.added) {
                                                         return null;
                                                       }
                                                       if (part.removed) {
                                                         return (
                                                           <span key={index} className="bg-rose-200 text-rose-800 rounded-[2px] font-bold px-0.5">
                                                             {part.value}
                                                           </span>
                                                         );
                                                       }
                                                       return <span key={index}>{part.value}</span>;
                                                     })
                                                   ) : (
                                                     target.value
                                                   )}
                                                </span>
                                                {target.status === 'MATCH' && (
                                                   <Tooltip content="ตรงกัน">
                                                     <CheckCircle2 size={14} className="text-emerald-500 shrink-0 cursor-help" />
                                                   </Tooltip>
                                                )}
                                                {target.status === 'MISMATCH' && (
                                                   <Tooltip content={(() => {
                                                      const summary = getConciseMismatchSummary(res.fieldName, language);
                                                      const detailedDiff = getDetailedDiffExplanation(String(target.value || ''), String(res.sourceValue || ''), language);
                                                      return (
                                                        <div className="p-0.5 text-left text-[11px] font-sans max-w-[220px]">
                                                          <span className="font-bold text-rose-400 block mb-0.5">{language === 'TH' ? 'ข้อมูลไม่สอดคล้องกัน' : 'Data Mismatch'}</span>
                                                          <span className="text-slate-200 font-medium block">{summary}</span>
                                                          {detailedDiff && (
                                                            <span className="text-rose-300 font-bold block mt-1 border-t border-slate-700/50 pt-1 leading-normal">{detailedDiff}</span>
                                                          )}
                                                        </div>
                                                      );
                                                   })()}>
                                                     <AlertCircle size={14} className="text-rose-500 shrink-0 cursor-help" />
                                                  </Tooltip>
                                               )}
                                               {target.status === 'SYNONYM' && (
                                                  <Tooltip content={target.ruleTitle ? `${language === 'TH' ? 'ตรงตามเงื่อนไข:' : 'Matched Condition:'} ${target.ruleTitle}` : "ตรงตามเงื่อนไข"}>
                                                    <CheckCircle2 size={14} className="text-emerald-500 shrink-0 cursor-help" />
                                                  </Tooltip>
                                                )}
                                            </div>

                                            {(target as any).isPrimary && res.targets.find((t: any) => t.isPrimary) === target && (
                                              <div className="px-1.5 py-0.5 bg-blue-100 text-blue-700 border border-blue-200 rounded-[4px] text-[8px] font-black uppercase tracking-wider shrink-0 shadow-sm flex items-center gap-1.5 w-fit">
                                                Main
                                              </div>
                                            )}

                                            {target.status === 'MISMATCH' && (
                                              <div className="flex flex-col items-center">
                                                <button
                                                  onClick={() => toggleConfirmMismatch(docName, res.fieldName)}
                                                  className="mt-2 px-2.5 py-0.5 rounded bg-emerald-500 hover:bg-emerald-600 text-white font-extrabold text-[9px] uppercase tracking-wider shadow-sm transition-all flex items-center gap-1 cursor-pointer"
                                                >
                                                  <Check size={9} strokeWidth={4} />
                                                  <span>{language === 'TH' ? 'ยืนยันใช้ค่านี้' : 'Confirm value'}</span>
                                                </button>
                                              </div>
                                            )}

                                            {isUserConfirmed && (
                                              <div className="flex flex-col items-center gap-1 mt-1">
                                                <div className="px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200/60 rounded-[4px] text-[9px] font-black tracking-tight shrink-0 shadow-sm flex items-center gap-1">
                                                  <Check size={9} className="text-emerald-600" strokeWidth={4} />
                                                  <span>{target.ruleTitle}</span>
                                                </div>
                                                <button
                                                  onClick={() => toggleConfirmMismatch(docName, res.fieldName)}
                                                  className="px-1.5 py-0.5 rounded bg-slate-100 hover:bg-rose-50 text-slate-500 hover:text-rose-600 border border-slate-200 hover:border-rose-200 font-extrabold text-[8px] uppercase tracking-wider transition-all flex items-center gap-1 cursor-pointer"
                                                >
                                                  <span>{language === 'TH' ? 'ยกเลิก' : 'Undo'}</span>
                                                </button>
                                              </div>
                                            )}

                                            {target.status === 'SYNONYM' && target.ruleTitle && target.ruleTitle !== 'Master lookup (ฐานข้อมูล)' && target.ruleTitle !== 'ยืนยันโดยผู้ใช้' && target.ruleTitle !== 'Confirmed by User' && target.ruleTitle !== 'ผ่านการตรวจสอบแล้ว' && target.ruleTitle !== 'Verified' && (
                                              <div className="mt-1 px-2 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200/60 rounded-[4px] text-[11px] font-black tracking-tight shrink-0 shadow-sm flex items-center gap-1.5 w-fit max-w-full">
                                                <ListFilter size={12} className="text-emerald-600 shrink-0" strokeWidth={3} />
                                                <span className="truncate max-w-[200px] leading-tight">{target.ruleTitle}</span>
                                              </div>
                                            )}

                                         </div>
                                      </td>
                                    );
                                 })}
                              </tr>
                                             ))}
                                           </tbody>
                                         );
                                      });
                                   })()}
                                </table>
                              );
                           })
                      )}

                  {/* Matrix Footer / Summary Bar — lives inside the scrollable area (scrolls
                      away vertically with the table), but its content stays pinned to the right
                      edge of the viewport instead of trailing off with horizontal column scroll. */}
                  <div
                    className="px-6 py-3 bg-slate-50/50 border-t border-slate-100 flex items-center justify-end"
                    style={{ minWidth: `${180 * (comparedDocs.length + 1)}px` }}
                  >
                     <div className="flex items-center gap-6 sticky right-6">
                        <div className="flex flex-col items-end leading-none">
                           <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-0.5 opacity-70 italic shadow-sm">Audit Summary</span>
                           <div className="flex items-center gap-2 bg-white px-2 py-1 rounded border border-slate-200">
                             <span className="text-[10px] font-black text-slate-500 uppercase tracking-tight">ฟิลด์ทั้งหมดที่ตรวจสอบ:</span>
                             <span className="text-xs font-mono font-black text-slate-800">{selectedJob.totalFieldsCount || comparisonResults.length}</span>
                           </div>
                        </div>

                        <div className="h-8 w-[1px] bg-slate-200 mx-1"></div>

                        {(() => {
                           const accuracyValue = (() => {
                             if (!comparisonResults || comparisonResults.length === 0) {
                               return selectedJob.accuracyScore !== undefined ? selectedJob.accuracyScore : 100.0;
                             }
                             const totalRows = comparisonResults.length;
                             const matchedRows = comparisonResults.filter(r => r.targets.every(t => t.status === 'MATCH' || t.status === 'SYNONYM' || t.status === 'NA')).length;
                             return Number(((matchedRows / totalRows) * 100).toFixed(1));
                           })();
                           return (
                             <div className="flex items-center gap-3 bg-white pl-1 pr-3 py-1 rounded-full border border-slate-200 shadow-[0_2px_10px_-4px_rgba(0,0,0,0.1)] hover:shadow-[0_4px_15px_-4px_rgba(0,0,0,0.15)] transition-all duration-300 group cursor-default">
                                <div className="relative w-8 h-8 flex items-center justify-center">
                                   <svg className="w-full h-full -rotate-90 transform scale-95" viewBox="0 0 36 36">
                                      <circle cx="18" cy="18" r="15" fill="none" className="stroke-slate-100" strokeWidth="4" />
                                      <motion.circle 
                                        cx="18" cy="18" r="15" 
                                        fill="none" 
                                        className={accuracyValue > 80 ? "stroke-emerald-500" : accuracyValue > 50 ? "stroke-amber-500" : "stroke-rose-500"}
                                        strokeWidth="4" 
                                        strokeDasharray="94.2"
                                        initial={{ strokeDashoffset: 94.2 }}
                                        animate={{ strokeDashoffset: 94.2 - (94.2 * accuracyValue / 100) }}
                                        transition={{ duration: 1.5, ease: "easeOut" }}
                                        strokeLinecap="round"
                                      />
                                   </svg>
                                   <div className="absolute inset-0 flex items-center justify-center">
                                      <div className={`w-1 h-1 rounded-full ${accuracyValue > 80 ? 'bg-emerald-500' : accuracyValue > 50 ? 'bg-amber-400' : 'bg-rose-500'} animate-pulse`}></div>
                                   </div>
                                </div>
                                <div className="flex flex-col justify-center">
                                   <span className="text-[7px] font-black text-slate-400 leading-none uppercase tracking-widest mb-0.5 opacity-60">Accuracy Score</span>
                                   <div className="flex items-baseline gap-1.5 leading-none">
                                      <span className="text-[11px] font-black text-slate-700 uppercase tracking-tighter">ระดับความถูกต้อง</span>
                                      <span className={`text-[16px] font-mono font-black tabular-nums transition-colors duration-500 ${accuracyValue > 80 ? 'text-emerald-600' : accuracyValue > 50 ? 'text-amber-600' : 'text-rose-600'}`}>
                                        {accuracyValue.toFixed(1)}<span className="text-[10px] ml-0.5 opacity-40">%</span>
                                      </span>
                                   </div>
                                </div>
                             </div>
                           );
                         })()}
                     </div>
                  </div>
                  </div>
               </div>
            </div>
          </div>
        )}

      {/* Shipment-level Activity Logs Modal — combines logs across every flow/job in this
          shipment (same reference): who on the team did what, on which document, on which field. */}
      <AnimatePresence>
        {showJobLogsModal && selectedJob && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[700] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="bg-white w-full max-w-5xl max-h-[85vh] rounded-2xl overflow-hidden shadow-2xl flex flex-col border border-slate-200"
            >
              <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-white sticky top-0 z-10">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl">
                    <History size={20} />
                  </div>
                  <div>
                    <h3 className="font-black text-slate-800 tracking-tight text-lg leading-tight uppercase">
                      {language === 'TH' ? 'ประวัติกิจกรรมของรายการ' : 'Job Activity Logs'}
                    </h3>
                    <p className="text-[11px] font-bold text-slate-400 tracking-tight leading-none mt-0.5 uppercase">{selectedJob.reference}</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowJobLogsModal(false)}
                  className="w-10 h-10 rounded-[4px] bg-slate-100 text-slate-400 hover:bg-rose-500 hover:text-white transition-all flex items-center justify-center"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="flex-1 overflow-auto p-6 bg-slate-50/50">
                {(() => {
                  // Shipment-wide: every job/flow sharing this reference, not just the flow
                  // currently open. Document names (e.g. "INVOICE") repeat across jobs, so we
                  // still key everything off jobId rather than name alone.
                  const shipmentJobs = jobs.filter(j => j.reference === selectedJob.reference);
                  const shipmentJobIds = new Set(shipmentJobs.map(j => j.id));
                  const jobById = new Map(shipmentJobs.map(j => [j.id, j]));

                  const docLogs = ocrLogs.filter(log => shipmentJobIds.has(log.jobId));
                  // Job-wide events (e.g. export) aren't tied to a single document — pull them
                  // in from the general activity log by matching the job they were logged for.
                  const jobWideLogs = activityLogs
                    .filter(log => shipmentJobIds.has(log.originalItem?.id))
                    .map(log => ({
                      id: log.id,
                      jobId: log.originalItem.id,
                      docName: language === 'TH' ? 'ทั้งหมด' : 'ALL',
                      timestamp: log.timestamp,
                      action: log.action,
                      details: log.details,
                      version: 1,
                      user: log.user
                    }));
                  let jobLogs = [...docLogs, ...jobWideLogs]
                    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

                  // Demo jobs created directly from mock data (rather than through the
                  // upload/OCR/export flow in this session) never got real log entries.
                  // For any flow in the shipment that has actually processed documents,
                  // synthesize a plausible upload -> OCR -> export history instead of
                  // showing empty.
                  if (jobLogs.length === 0) {
                    const synthetic: typeof docLogs = [];
                    shipmentJobs.forEach(job => {
                      const processedDocs = Object.entries(job.docs || {})
                        .filter(([, status]) => status !== ComparisonDocStatus.MISSING);
                      if (processedDocs.length === 0) return;
                      const baseTime = job.createdAt ? new Date(job.createdAt).getTime() : Date.now() - 86400000;
                      const actor = job.assignee || (language === 'TH' ? 'ระบบ' : 'System');
                      processedDocs.forEach(([docName], i) => {
                        synthetic.push({
                          id: `synthetic-${job.id}-${docName}-upload`,
                          jobId: job.id,
                          docName,
                          timestamp: new Date(baseTime + i * 60000).toISOString(),
                          action: 'UPLOAD_NEW',
                          details: language === 'TH' ? 'อัปโหลดเอกสารเวอร์ชันเริ่มต้น' : 'Uploaded initial document version',
                          version: 1,
                          user: actor
                        });
                        synthetic.push({
                          id: `synthetic-${job.id}-${docName}-ocr`,
                          jobId: job.id,
                          docName,
                          timestamp: new Date(baseTime + i * 60000 + 30000).toISOString(),
                          action: 'OCR_DONE',
                          details: language === 'TH' ? 'อ่านไฟล์และดึงข้อมูลสำเร็จ' : 'Read file and extracted data successfully',
                          version: 1,
                          user: actor
                        });
                      });
                      if (job.status === JobStatus.READY || job.isLocked) {
                        synthetic.push({
                          id: `synthetic-${job.id}-export`,
                          jobId: job.id,
                          docName: language === 'TH' ? 'ทั้งหมด' : 'ALL',
                          timestamp: new Date(baseTime + processedDocs.length * 60000 + 60000).toISOString(),
                          action: 'APPROVE',
                          details: language === 'TH' ? 'ส่งออกข้อมูลและล็อครายการสำเร็จ' : 'Exported data and locked the job',
                          version: 1,
                          user: actor
                        });
                      }
                    });
                    jobLogs = synthetic.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
                  }

                  if (jobLogs.length === 0) {
                    return (
                      <div className="flex flex-col items-center justify-center h-48 text-center space-y-3 opacity-60 bg-white border border-slate-200 border-dashed rounded-xl m-6">
                        <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center">
                          <History size={24} className="text-slate-400" />
                        </div>
                        <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">{language === 'TH' ? 'ยังไม่มีประวัติ' : 'No logs found'}</p>
                      </div>
                    );
                  }

                  return (
                    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                      <table className="w-full text-left border-collapse table-fixed">
                        <thead>
                          <tr className="bg-slate-50 border-b border-slate-200">
                            <th className="p-4 text-[10px] font-black text-slate-400 uppercase tracking-widest w-28">{language === 'TH' ? 'วัน/เวลา' : 'Date/Time'}</th>
                            <th className="p-4 text-[10px] font-black text-slate-400 uppercase tracking-widest w-64">{language === 'TH' ? 'ผู้ใช้งาน' : 'User'}</th>
                            <th className="p-4 text-[10px] font-black text-slate-400 uppercase tracking-widest w-44">{language === 'TH' ? 'การกระทำ' : 'Action'}</th>
                            <th className="p-4 text-[10px] font-black text-slate-400 uppercase tracking-widest w-32">{language === 'TH' ? 'เอกสาร' : 'Document'}</th>
                            <th className="p-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">{language === 'TH' ? 'รายละเอียด (ฟิลด์)' : 'Details (Fields)'}</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {jobLogs.map(log => {
                            const logJob = jobById.get((log as any).jobId);
                            return (
                            <tr key={log.id} className="hover:bg-slate-50/50 transition-colors">
                              <td className="p-4 whitespace-nowrap">
                                <span className="text-xs font-bold text-slate-600 block">
                                  {new Date(log.timestamp).toLocaleDateString(language === 'TH' ? 'th-TH' : 'en-US', { day: '2-digit', month: 'short', year: 'numeric' })}
                                </span>
                                <span className="text-[10px] font-semibold text-slate-400 block mt-0.5">
                                  {new Date(log.timestamp).toLocaleTimeString(language === 'TH' ? 'th-TH' : 'en-US', { hour: '2-digit', minute: '2-digit' })}
                                </span>
                              </td>
                              <td className="p-4 overflow-hidden">
                                <div className="flex items-center gap-2 min-w-0">
                                  <div className="w-6 h-6 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-[10px] font-black text-slate-600 uppercase shrink-0">
                                    {log.user.slice(0, 2)}
                                  </div>
                                  <div className="min-w-0 flex flex-col gap-1">
                                    <span className="text-sm font-semibold text-slate-600 truncate">{log.user}</span>
                                    {(logJob?.assignedTeam || logJob?.workflowName) && (
                                      <div className="flex items-center gap-1 min-w-0">
                                        {logJob?.assignedTeam && (
                                          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-500 border border-slate-200 uppercase shrink-0">
                                            {logJob.assignedTeam}
                                          </span>
                                        )}
                                        {logJob?.workflowName && (
                                          <Tooltip content={logJob.workflowName} position="top" className="min-w-0">
                                            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-blue-50 text-blue-600 border border-blue-100 uppercase truncate block">
                                              {logJob.workflowName}
                                            </span>
                                          </Tooltip>
                                        )}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </td>
                              <td className="p-4 overflow-hidden">
                                <div className="flex items-center gap-2 min-w-0">
                                  {log.action === 'EDIT_DATA' ? <Edit3 size={14} className="text-blue-500 shrink-0" />
                                    : log.action === 'OCR_DONE' ? <ScanSearch size={14} className="text-indigo-500 shrink-0" />
                                    : log.action === 'APPROVE' ? <Send size={14} className="text-teal-500 shrink-0" />
                                    : log.action === 'CONFIRM_DATA' ? <CheckCircle2 size={14} className="text-rose-500 shrink-0" />
                                    : log.action === 'UNCONFIRM_DATA' ? <XCircle size={14} className="text-slate-400 shrink-0" />
                                    : (log.action === 'REJECT_FLOW' || log.action === 'REJECTED') ? <Undo2 size={14} className="text-rose-500 shrink-0" />
                                    : <UploadCloud size={14} className="text-emerald-500 shrink-0" />}
                                  <span className="text-xs font-bold text-slate-700 truncate">
                                    {log.action === 'EDIT_DATA' ? (language === 'TH' ? 'แก้ไขข้อมูล OCR' : 'Edited OCR Data')
                                      : log.action === 'OCR_DONE' ? (language === 'TH' ? 'อ่านไฟล์ (OCR)' : 'Read File (OCR)')
                                      : log.action === 'APPROVE' ? (language === 'TH' ? 'ส่งออกข้อมูล' : 'Exported Data')
                                      : log.action === 'CONFIRM_DATA' ? (language === 'TH' ? 'กดยืนยันใช้ค่านี้' : 'Confirmed Value')
                                      : log.action === 'UNCONFIRM_DATA' ? (language === 'TH' ? 'กดยกเลิกการยืนยัน' : 'Unconfirmed Value')
                                      : log.action === 'REJECT_FLOW' ? (language === 'TH' ? 'ตีกลับไปขั้นตอนก่อนหน้า' : 'Rejected to Previous Job')
                                      : log.action === 'REJECTED' ? (language === 'TH' ? 'ถูกตีกลับ' : 'Rejected Back')
                                      : (language === 'TH' ? 'อัปโหลดเวอร์ชันใหม่' : 'Uploaded New Version')}
                                  </span>
                                </div>
                              </td>
                              <td className="p-4">
                                <span className="text-[10px] font-black px-2.5 py-1 rounded-full border bg-slate-100 text-slate-600 border-slate-200 uppercase inline-block max-w-full truncate align-bottom">
                                  {log.docName}
                                </span>
                              </td>
                              <td className="p-4">
                                <div className="text-xs text-slate-500 font-medium leading-relaxed max-w-sm">
                                  {log.details.replace('แก้ไขฟิลด์: ', '').replace('Edited fields: ', '')}
                                </div>
                              </td>
                            </tr>
                          );})}
                        </tbody>
                      </table>
                    </div>
                  );
                })()}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Document Comments — a discussion thread attached to a specific document within this
          job. Anyone on the team can post; each person can only delete their own comments.
          Carried forward to the next job in the shipment sequence on export (see handleConfirmExport). */}
      <AnimatePresence>
        {noteEditorDocName && selectedJob && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[700] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="bg-white w-full max-w-lg rounded-2xl overflow-hidden shadow-2xl flex flex-col border border-slate-200 max-h-[85vh]"
            >
              <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-white shrink-0">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-amber-50 text-amber-600 rounded-xl">
                    <StickyNote size={18} />
                  </div>
                  <div>
                    <h3 className="font-black text-slate-800 tracking-tight text-base leading-tight">
                      {language === 'TH' ? 'ความคิดเห็นเอกสาร' : 'Document Comments'}
                    </h3>
                    <p className="text-[11px] font-bold text-slate-400 tracking-tight leading-none mt-0.5 uppercase">{noteEditorDocName}</p>
                  </div>
                </div>
                <button
                  onClick={() => setNoteEditorDocName(null)}
                  className="w-9 h-9 rounded-[4px] bg-slate-100 text-slate-400 hover:bg-rose-500 hover:text-white transition-all flex items-center justify-center"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-5 bg-slate-50/50 space-y-3">
                {(docComments[`${selectedJob.id}_${noteEditorDocName}`] || []).length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-8 text-center opacity-60">
                    <StickyNote size={22} className="text-slate-300 mb-2" />
                    <p className="text-xs font-bold text-slate-400">
                      {language === 'TH' ? 'ยังไม่มีความคิดเห็น' : 'No comments yet'}
                    </p>
                  </div>
                ) : (
                  (docComments[`${selectedJob.id}_${noteEditorDocName}`] || []).map(comment => (
                    <div key={comment.id} className="bg-white border border-slate-200 rounded-xl p-3">
                      <div className="flex items-center justify-between gap-2 mb-1.5">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-[10px] font-black text-slate-600 uppercase shrink-0">
                            {comment.user.slice(0, 2)}
                          </div>
                          <span className="text-xs font-bold text-slate-700">{comment.user}</span>
                          <span className="text-[10px] font-semibold text-slate-400">
                            {new Date(comment.timestamp).toLocaleDateString(language === 'TH' ? 'th-TH' : 'en-US', { day: '2-digit', month: 'short', year: 'numeric' })}
                            {' '}
                            {new Date(comment.timestamp).toLocaleTimeString(language === 'TH' ? 'th-TH' : 'en-US', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        {comment.user === CURRENT_USER_NAME && (
                          <button
                            onClick={() => {
                              const key = `${selectedJob.id}_${noteEditorDocName}`;
                              setDocComments(prev => ({
                                ...prev,
                                [key]: (prev[key] || []).filter(c => c.id !== comment.id)
                              }));
                            }}
                            className="p-1 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded transition-colors shrink-0"
                          >
                            <Trash2 size={13} />
                          </button>
                        )}
                      </div>
                      <p className="text-sm text-slate-600 font-medium whitespace-pre-wrap">{comment.text}</p>
                    </div>
                  ))
                )}
              </div>

              <div className="p-4 border-t border-slate-100 bg-white shrink-0">
                <p className="text-[11px] text-slate-400 font-medium mb-2">
                  {language === 'TH'
                    ? 'ความคิดเห็นเหล่านี้จะติดไปกับเอกสารนี้เมื่อถูกส่งต่อไปยังรายการย่อยถัดไปในชิปเมนต์เดียวกัน'
                    : 'Comments follow the document forward when it moves to the next job in this shipment.'}
                </p>
                <div className="flex flex-col gap-2">
                  <textarea
                    value={commentDraft}
                    onChange={(e) => setCommentDraft(e.target.value)}
                    rows={2}
                    placeholder={language === 'TH' ? 'พิมพ์ความคิดเห็น...' : 'Write a comment...'}
                    className="w-full bg-slate-50 border border-slate-200 rounded-[4px] p-2.5 text-sm font-medium text-[#010136] outline-none focus:ring-2 focus:ring-[#1f5df9]/10 focus:border-[#1f5df9] transition-all resize-none"
                    autoFocus
                  />
                  <button
                    onClick={() => {
                      const trimmed = commentDraft.trim();
                      if (!trimmed) return;
                      const key = `${selectedJob.id}_${noteEditorDocName}`;
                      const newComment: DocComment = {
                        id: `comment-${Date.now()}`,
                        user: CURRENT_USER_NAME,
                        timestamp: new Date().toISOString(),
                        text: trimmed
                      };
                      setDocComments(prev => {
                        const next = { ...prev, [key]: [...(prev[key] || []), newComment] };
                        // If this job already moved on, the comment was added after the fact —
                        // sync it forward to every later job in the shipment that shares this
                        // doc type too, not just whichever job happened to be active at export
                        // time, so it still reaches wherever the document is being worked now.
                        if (selectedJob.status === JobStatus.READY && noteEditorDocName) {
                          const shipmentJobs = jobs.filter(j => j.reference === selectedJob.reference);
                          const seqIndex = shipmentJobs.findIndex(j => j.id === selectedJob.id);
                          shipmentJobs.slice(seqIndex + 1).forEach(laterJob => {
                            const matchingDocName = Object.keys(laterJob.docs).find(n => n.toLowerCase() === noteEditorDocName.toLowerCase());
                            if (!matchingDocName) return;
                            const laterKey = `${laterJob.id}_${matchingDocName}`;
                            next[laterKey] = [...(next[laterKey] || []), newComment];
                          });
                        }
                        return next;
                      });
                      setCommentDraft('');
                    }}
                    disabled={!commentDraft.trim()}
                    className="self-end px-4 py-2.5 bg-[#1f5df9] text-white rounded-[4px] font-bold text-sm flex items-center gap-2 hover:bg-[#104BE3] disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-sm shrink-0"
                  >
                    <Send size={14} />
                    {language === 'TH' ? 'เพิ่มความคิดเห็น' : 'Add comment'}
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
