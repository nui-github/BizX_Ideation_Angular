import React, { useState, useCallback } from 'react';
import { RuleList } from './RuleList';
import { RuleMatrix } from './RuleMatrix';
import { TRANSLATIONS } from '../translations';
import { Language } from '../types';
import { X, Check } from 'lucide-react';
import { DEFAULT_SCHEMAS } from './LabelSchemaSettings';

interface ManageRuleProps {
  language: Language;
  comparisonWorkflows?: any[];
  onDeleteRule?: (ruleId: string) => void;
}

export const ManageRule: React.FC<ManageRuleProps> = ({ language, comparisonWorkflows, onDeleteRule }) => {
  const t = TRANSLATIONS[language];
  const isTh = language === 'TH';
  const [selectedRuleId, setSelectedRuleId] = useState<string | null>(null);
  
  // Create Modal State
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newRuleData, setNewRuleData] = useState({
    name: '',
    description: '',
    docTypes: [] as string[]
  });

  const getDocTypeIdFromColName = (colName: string): string => {
    const norm = colName.toLowerCase().trim();
    if (norm.includes('invoice')) return 'INV';
    if (norm.includes('ขนสินค้า') || norm.includes('ลนสินค้า') || norm.includes('import dec')) return 'INV';
    if (norm.includes('packing') || norm.startsWith('pl')) return 'PL';
    if (norm.includes('lading') || norm.startsWith('bl') || norm.startsWith('b/l')) return 'BL';
    if (norm.includes('purchase') || norm.includes('po') || norm.includes('pi')) return 'PO';
    if (norm.includes('certificate') || norm.startsWith('co') || norm.includes('origin')) return 'CO';
    return colName;
  };

  const isDocTypeBoundToSchema = (docName: string): boolean => {
    const docTypeId = getDocTypeIdFromColName(docName);
    return DEFAULT_SCHEMAS.some(schema => 
      schema.docTypes.includes(docTypeId) || 
      schema.configs?.some(cfg => cfg.docTypeId === docTypeId)
    );
  };

  const availableDocTypes = [
    t.docTypeShort, t.docTypePO, t.docTypeInvoice, t.docTypePL, 
    t.docTypeBL, t.docTypeFreightInv, t.docTypeHSCode, 
    t.docTypeFTADraft, t.docTypeFTAOriginal, t.docTypeRemark
  ].filter(isDocTypeBoundToSchema);

  // Mock Rules Data
  const [rules, setRules] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('bizx_compare_rules_v5');
      if (saved) {
        try {
          return JSON.parse(saved);
        } catch (e) {
          console.error('Failed to parse saved rules', e);
        }
      }
    }
    return [
      {
        id: 'rule-001',
        name: 'Import Declaration High-Value',
        nameTh: 'กฎตรวจสอบใบขนสินค้าข้ามแดนมูลค่าสูง',
        description: 'Strict matching rules for high-value retail shipments, customs clearance documents, and corresponding invoices.',
        descriptionTh: 'กฎเกณฑ์การเปรียบเทียบข้อมูลที่เข้มงวดสำหรับการนำสินค้าเข้ากลุ่มมูลค่าสูง ใบขนสินค้าศุลกากร และเอกสารที่เกี่ยวข้อง',
        status: 'Active',
        updatedAt: '2026-05-29',
        workflowIds: ['cwf-leo', 'cwf-cds'],
        docTypes: [
          t.docTypeShort, t.docTypePO, t.docTypeInvoice, t.docTypePL, 
          t.docTypeBL, t.docTypeRemark
        ],
        totalFields: 14,
        parts: [
          {
            title: t.ruleHeader,
            rows: [
              { id: 'h1', detail: 'Seller Name', detailTh: 'ชื่อผู้ขาย (Seller Name)', values: [
                {type: 'CONDITIONAL', schemaId: 'ls-1', schemaField: 'Total Value', condField: 'Invoice#', condValue: 'L/C', condSource: 'L/C No.'},
                {type: 'BILINGUAL', schemaId: 'ls-2', schemaField: 'PO No'},
                {type: '', schemaId: 'ls-1', schemaField: 'Invoice#', isMain: true},
                {type: 'BILINGUAL', schemaId: 'ls-1', schemaField: 'Packing#'},
                {type: 'BILINGUAL', schemaId: 'ls-1', schemaField: 'B/L No'},
                {type: 'TEXT', text: ''}
              ] },
              { id: 'h2', detail: 'Seller Address', detailTh: 'ที่อยู่ผู้ขาย (Seller Address)', values: [
                {type: 'BILINGUAL', schemaId: 'ls-1', schemaField: 'Invoice#'},
                {type: 'BILINGUAL', schemaId: 'ls-2', schemaField: 'PO No'},
                {type: '', schemaId: 'ls-1', schemaField: 'Invoice#', isMain: true},
                {type: 'BILINGUAL', schemaId: 'ls-1', schemaField: 'Packing#'},
                {type: 'BILINGUAL', schemaId: 'ls-1', schemaField: 'B/L No'},
                {type: 'TEXT', text: ''}
              ] },
              { id: 'h3', detail: 'Buyer Name', detailTh: 'ชื่อผู้ซื้อ (Buyer Name)', values: [
                {type: 'MASTER_LOOKUP', schemaId: 'ls-1', schemaField: 'Invoice#', masterDb: 'Customers'},
                {type: 'MASTER_LOOKUP', schemaId: 'ls-2', schemaField: 'PO No', masterDb: 'Customers'},
                {type: '', schemaId: 'ls-1', schemaField: 'Invoice#', isMain: true, masterDb: 'Customers'},
                {type: 'MASTER_LOOKUP', schemaId: 'ls-1', schemaField: 'Packing#', masterDb: 'Customers'},
                {type: 'MASTER_LOOKUP', schemaId: 'ls-1', schemaField: 'B/L No', masterDb: 'Customers'},
                {type: 'TEXT', text: ''}
              ] },
              { id: 'h4', detail: 'Invoice No.', detailTh: 'เลขที่ใบแจ้งหนี้ (Invoice No.)', values: [
                {type: 'EXACT', schemaId: 'ls-1', schemaField: 'Invoice#'},
                {type: 'EXACT', schemaId: 'ls-2', schemaField: 'PO No'},
                {type: '', schemaId: 'ls-1', schemaField: 'Invoice#', isMain: true},
                {type: 'EXACT', schemaId: 'ls-1', schemaField: 'Packing#'},
                {type: 'EXACT', schemaId: 'ls-1', schemaField: 'B/L No'},
                {type: 'TEXT', text: ''}
              ] },
              { id: 'h_date', detail: 'Invoice Date', detailTh: 'วันที่ออกใบแจ้งหนี้ (Invoice Date)', values: [
                {type: 'DATE_NORMALIZATION', schemaId: 'ls-1', schemaField: 'Invoice#', dateBuddhist: true, dateADToBE: false},
                {type: 'DATE_NORMALIZATION', schemaId: 'ls-2', schemaField: 'PO No', dateBuddhist: false, dateADToBE: false},
                {type: '', schemaId: 'ls-1', schemaField: 'Invoice#', isMain: true, dateBuddhist: false, dateADToBE: false},
                {type: 'DATE_NORMALIZATION', schemaId: 'ls-1', schemaField: 'Packing#', dateBuddhist: false, dateADToBE: false},
                {type: 'DATE_NORMALIZATION', schemaId: 'ls-1', schemaField: 'B/L No', dateBuddhist: false, dateADToBE: false},
                {type: 'TEXT', text: ''}
              ] },
              { id: 'h5', detail: 'Internal Code', detailTh: 'รหัสควบคุมภายใน (Internal Code)', values: [
                {type: 'EXACT', schemaId: 'ls-1', schemaField: 'Invoice#'},
                {type: 'EXACT', schemaId: 'ls-2', schemaField: 'PO No'},
                {type: '', schemaId: 'ls-1', schemaField: 'Invoice#', isMain: true},
                {type: 'EXACT', schemaId: 'ls-1', schemaField: 'Packing#'},
                {type: 'EXACT', schemaId: 'ls-1', schemaField: 'B/L No'},
                {type: 'TEXT', text: ''}
              ] },
            ]
          },
          {
            title: t.ruleDescription,
            rows: [
              { id: 'd1', detail: 'Product Description', detailTh: 'คำอธิบายสินค้า (Product Description)', values: [
                {type: 'BILINGUAL', schemaId: 'ls-1', schemaField: 'Invoice#'},
                {type: 'BILINGUAL', schemaId: 'ls-2', schemaField: 'PO No'},
                {type: '', schemaId: 'ls-1', schemaField: 'Invoice#', isMain: true},
                {type: 'BILINGUAL', schemaId: 'ls-1', schemaField: 'Packing#'},
                {type: 'BILINGUAL', schemaId: 'ls-1', schemaField: 'B/L No'},
                {type: 'TEXT', text: ''}
              ] },
              { id: 'd2', detail: 'hsCode', detailTh: 'พิกัดอัตราศุลกากร (hsCode)', values: [
                {type: 'EXACT', schemaId: 'ls-1', schemaField: 'items.hsCode'},
                {type: 'EXACT', schemaId: 'ls-2', schemaField: 'items.hsCode'},
                {type: '', schemaId: 'ls-1', schemaField: 'items.hsCode', isMain: true, arrayMatchingMode: 'key-based', arrayMatchingKey: ['itemId'], arrayMatchingFields: ['hsCode', 'description', 'quantity'], fallbackToIndex: true},
                {type: 'EXACT', schemaId: 'ls-1', schemaField: 'items.hsCode'},
                {type: 'EXACT', schemaId: 'ls-1', schemaField: 'items.hsCode'},
                {type: 'TEXT', text: ''}
              ] },
              { id: 'd3', detail: 'quantity', detailTh: 'จำนวนหน่วยสินค้า (quantity)', values: [
                {type: 'NUMBER_WORD', schemaId: 'ls-1', schemaField: 'items.quantity'},
                {type: 'NUMBER_WORD', schemaId: 'ls-2', schemaField: 'items.quantity'},
                {type: '', schemaId: 'ls-1', schemaField: 'items.quantity', isMain: true, arrayMatchingMode: 'key-based', arrayMatchingKey: ['itemId'], arrayMatchingFields: ['hsCode', 'description', 'quantity'], fallbackToIndex: true},
                {type: 'NUMBER_WORD', schemaId: 'ls-1', schemaField: 'items.quantity'},
                {type: 'NUMBER_WORD', schemaId: 'ls-1', schemaField: 'items.quantity'},
                {type: 'TEXT', text: ''}
              ] },
              { id: 'd4', detail: 'UOM', detailTh: 'หน่วยนับสินค้า (UOM)', values: [
                {type: 'EXACT', schemaId: 'ls-1', schemaField: 'Invoice#'},
                {type: 'EXACT', schemaId: 'ls-2', schemaField: 'PO No'},
                {type: '', schemaId: 'ls-1', schemaField: 'Invoice#', isMain: true},
                {type: 'EXACT', schemaId: 'ls-1', schemaField: 'Packing#'},
                {type: 'EXACT', schemaId: 'ls-1', schemaField: 'B/L No'},
                {type: 'TEXT', text: ''}
              ] },
              { id: 'd5', detail: "Total Q'ty", detailTh: 'จำนวนสินค้ารวมทั้งหมด', values: [
                {type: 'NUMBER_WORD', schemaId: 'ls-1', schemaField: 'Quantity'},
                {type: 'NUMBER_WORD', schemaId: 'ls-2', schemaField: 'PO No'},
                {type: '', schemaId: 'ls-1', schemaField: 'Quantity', isMain: true},
                {type: 'NUMBER_WORD', schemaId: 'ls-1', schemaField: 'Packing#'},
                {type: 'NUMBER_WORD', schemaId: 'ls-1', schemaField: 'B/L No'},
                {type: 'TEXT', text: ''}
              ] },
              { id: 'd6', detail: 'Internal Remarks', detailTh: 'หมายเหตุภายใน', values: [
                {type: '', schemaId: 'ls-1', schemaField: 'Invoice#'},
                {type: '', schemaId: 'ls-2', schemaField: 'PO No'},
                {type: '', schemaId: 'ls-1', schemaField: 'Invoice#'},
                {type: '', schemaId: 'ls-1', schemaField: 'Packing#'},
                {type: '', schemaId: 'ls-1', schemaField: 'B/L No'},
                {type: 'TEXT', text: ''}
              ] },
            ]
          },
          {
            title: t.ruleFooter,
            rows: [
              { id: 'f1', detail: 'Company Stamp', detailTh: 'ตราประทับบริษัท', values: [
                {type: 'EXISTENCE', schemaId: 'ls-1', schemaField: 'Invoice#'},
                {type: 'EXISTENCE', schemaId: 'ls-2', schemaField: 'PO No'},
                {type: '', schemaId: 'ls-1', schemaField: 'Invoice#', isMain: true},
                {type: 'EXISTENCE', schemaId: 'ls-1', schemaField: 'Packing#'},
                {type: 'EXISTENCE', schemaId: 'ls-1', schemaField: 'B/L No'},
                {type: 'TEXT', text: ''}
              ] },
              { id: 'f2', detail: 'Human Sign', detailTh: 'ลายเซ็นบุคคล', values: [
                {type: 'EXISTENCE', schemaId: 'ls-1', schemaField: 'Invoice#'},
                {type: 'EXISTENCE', schemaId: 'ls-2', schemaField: 'PO No'},
                {type: '', schemaId: 'ls-1', schemaField: 'Invoice#', isMain: true},
                {type: 'EXISTENCE', schemaId: 'ls-1', schemaField: 'Packing#'},
                {type: 'EXISTENCE', schemaId: 'ls-1', schemaField: 'B/L No'},
                {type: 'TEXT', text: ''}
              ] },
            ]
          }
        ]
      },
      {
        id: 'rule-002',
        name: 'Standard Export Documents',
        nameTh: 'กฎตรวจสอบเอกสารส่งออกมาตรฐาน',
        description: 'Standard operational rules for outward shipments, focusing on tracking, invoice verification, and weigh bill tallies.',
        descriptionTh: 'กฎเกณฑ์มาตรฐานปฏิบัติการสำหรับการส่งสินค้าออกนอกประเทศ เน้นควบคุมการติดตามสถานะ ตรวจสอบใบกำกับสินค้า และบันทึกบัญชีน้ำหนักรวม',
        status: 'Active',
        updatedAt: '2026-05-15',
        workflowIds: [],
        docTypes: [t.docTypeInvoice, t.docTypePL, t.docTypeBL, t.docTypePO, t.docTypeRemark],
        totalFields: 5,
        parts: [
          {
            title: t.ruleHeader,
            rows: [
              { id: 'h1_2', detail: 'Shipper', detailTh: 'ผู้ส่งสินค้า (Shipper)', values: [
                {type: 'BILINGUAL', schemaId: 'ls-1', schemaField: 'Invoice#'},
                {type: 'BILINGUAL', schemaId: 'ls-1', schemaField: 'Packing#'},
                {type: '', schemaId: 'ls-1', schemaField: 'B/L No', isMain: true},
                {type: 'BILINGUAL', schemaId: 'ls-2', schemaField: 'PO No'},
                {type: 'TEXT', text: ''}
              ] },
              { id: 'h2_2', detail: 'Consignee', detailTh: 'ผู้รับสินค้า (Consignee)', values: [
                {type: 'BILINGUAL', schemaId: 'ls-1', schemaField: 'Invoice#'},
                {type: 'BILINGUAL', schemaId: 'ls-1', schemaField: 'Packing#'},
                {type: '', schemaId: 'ls-1', schemaField: 'B/L No', isMain: true},
                {type: 'BILINGUAL', schemaId: 'ls-2', schemaField: 'PO No'},
                {type: 'TEXT', text: ''}
              ] },
            ]
          },
          {
            title: t.ruleDescription,
            rows: [
              { id: 'd1_2', detail: 'Total Weight', detailTh: 'น้ำหนักรวมทั้งหมด (Weight)', values: [
                {type: '', schemaId: 'ls-1', schemaField: 'Invoice#'},
                {type: 'NUMBER_WORD', schemaId: 'ls-1', schemaField: 'Weight'},
                {type: 'NUMBER_WORD', schemaId: 'ls-1', schemaField: 'B/L No'},
                {type: 'NUMBER_WORD', schemaId: 'ls-2', schemaField: 'PO No'},
                {type: 'TEXT', text: ''}
              ] },
              { id: 'd2_2', detail: 'Total Volume', detailTh: 'ปริมาตรรวมทั้งหมด (Volume)', values: [
                {type: '', schemaId: 'ls-1', schemaField: 'Invoice#'},
                {type: 'NUMBER_WORD', schemaId: 'ls-1', schemaField: 'Weight'},
                {type: 'NUMBER_WORD', schemaId: 'ls-1', schemaField: 'B/L No'},
                {type: 'NUMBER_WORD', schemaId: 'ls-2', schemaField: 'PO No'},
                {type: 'TEXT', text: ''}
              ] },
            ]
          },
          {
            title: t.ruleFooter,
            rows: [
              { id: 'f1_2', detail: 'Port of Loading', detailTh: 'ท่าเรือต้นทาง (Port of Loading)', values: [
                {type: 'EXACT', schemaId: 'ls-1', schemaField: 'Invoice#'},
                {type: '', schemaId: 'ls-1', schemaField: 'Packing#'},
                {type: 'EXACT', schemaId: 'ls-1', schemaField: 'B/L No'},
                {type: 'EXACT', schemaId: 'ls-2', schemaField: 'PO No'},
                {type: 'TEXT', text: ''}
              ] },
            ]
          }
        ]
      },
      {
        id: 'rule-003',
        name: 'Chemical & Dangerous Goods',
        nameTh: 'กฎตรวจสอบเคมีภัณฑ์และสินค้าอันตราย',
        description: 'Additional validation layers for DG declarations, safety data sheets (SDS), packaging groups, and emergency contacts.',
        descriptionTh: 'ชั้นข้อมูลการตรวจสอบแบบพิเศษสำหรับเอกสารแจ้งสินค้าอันตราย ใบรับรองเคมีภัณฑ์ กลุ่มการบรรจุภัณฑ์ และช่องทางติดต่อฉุกเฉิน',
        status: 'Inactive',
        updatedAt: '2026-05-10',
        workflowIds: [],
        docTypes: [t.docTypeInvoice, t.docTypePL, t.docTypeBL, t.docTypePO, t.docTypeRemark],
        totalFields: 5,
        parts: [
          {
            title: t.ruleHeader,
            rows: [
              { id: 'h1_3', detail: 'UN Number', detailTh: 'หมายเลขสหประชาชาติ (UN Number)', values: [
                {type: 'EXACT', schemaId: 'ls-1', schemaField: 'Invoice#'},
                {type: 'EXACT', schemaId: 'ls-1', schemaField: 'Packing#'},
                {type: 'EXACT', schemaId: 'ls-1', schemaField: 'B/L No'},
                {type: 'EXACT', schemaId: 'ls-2', schemaField: 'PO No'},
                {type: 'TEXT', text: ''}
              ] },
              { id: 'h2_3', detail: 'Proper Shipping Name', detailTh: 'ชื่อที่ถูกต้องในการขนส่ง (Proper Shipping Name)', values: [
                {type: 'BILINGUAL', schemaId: 'ls-1', schemaField: 'Invoice#'},
                {type: 'BILINGUAL', schemaId: 'ls-1', schemaField: 'Packing#'},
                {type: 'BILINGUAL', schemaId: 'ls-1', schemaField: 'B/L No'},
                {type: 'BILINGUAL', schemaId: 'ls-2', schemaField: 'PO No'},
                {type: 'TEXT', text: ''}
              ] },
            ]
          },
          {
            title: t.ruleDescription,
            rows: [
              { id: 'd1_3', detail: 'Hazard Class', detailTh: 'ระดับความเป็นอันตราย (Hazard Class)', values: [
                {type: '', schemaId: 'ls-1', schemaField: 'Invoice#'},
                {type: '', schemaId: 'ls-1', schemaField: 'Packing#'},
                {type: 'EXACT', schemaId: 'ls-1', schemaField: 'B/L No'},
                {type: 'EXACT', schemaId: 'ls-2', schemaField: 'PO No'},
                {type: 'TEXT', text: ''}
              ] },
              { id: 'd2_3', detail: 'Packing Group', detailTh: 'กลุ่มการบรรจุทางเคมี (Packing Group)', values: [
                {type: '', schemaId: 'ls-1', schemaField: 'Invoice#'},
                {type: '', schemaId: 'ls-1', schemaField: 'Packing#'},
                {type: 'EXACT', schemaId: 'ls-1', schemaField: 'B/L No'},
                {type: 'EXACT', schemaId: 'ls-2', schemaField: 'PO No'},
                {type: 'TEXT', text: ''}
              ] },
            ]
          },
          {
            title: t.ruleFooter,
            rows: [
              { id: 'f1_3', detail: 'Emergency Contact', detailTh: 'เบอร์ติดต่อกรณีฉุกเฉิน (Emergency Contact)', values: [
                {type: 'EXACT', schemaId: 'ls-1', schemaField: 'Invoice#'},
                {type: '', schemaId: 'ls-1', schemaField: 'Packing#'},
                {type: 'EXACT', schemaId: 'ls-1', schemaField: 'B/L No'},
                {type: 'EXACT', schemaId: 'ls-2', schemaField: 'PO No'},
                {type: 'TEXT', text: ''}
              ] },
            ]
          }
        ]
      },
      {
        id: 'rule-004',
        name: 'Automated HS Code Verification',
        nameTh: 'กฎเปรียบเทียบพิกัดศุลกากร (HS Code) อัตโนมัติ',
        description: 'Verifies standard HS Code classifications and special duty rate matches for general imports against FTA agreements.',
        descriptionTh: 'ประเมินข้ามข้อมูลพิกัดสิทธิประโยชน์ทางภาษี อัตราอากรศุลกากร และระบบตรวจสอบหนังสือรับรองแหล่งกำเนิดสินค้าภายใต้ข้อตกลง FTA',
        status: 'Active',
        updatedAt: '2026-05-24',
        workflowIds: [],
        docTypes: [t.docTypeHSCode, t.docTypeFTADraft, t.docTypeInvoice],
        totalFields: 4,
        parts: [
          {
            title: t.ruleHeader,
            rows: [
              { id: 'h1_4', detail: 'HS Code Listing', detailTh: 'พิกัดอัตราศุลกากร (HS Code Listing)', values: [
                {type: 'EXACT', schemaId: 'ls-1', schemaField: 'HS Code'},
                {type: 'EXACT', schemaId: 'ls-2', schemaField: 'PO No'},
                {type: 'TEXT', text: ''}
              ] }
            ]
          },
          {
            title: t.ruleDescription,
            rows: [
              { id: 'd1_4', detail: 'Duty Rate %', detailTh: 'อัตราอากรศุลกากร % (Duty Rate %)', values: [
                {type: 'EXACT', schemaId: 'ls-1', schemaField: 'Duty Rate'},
                {type: 'TEXT', text: ''}
              ] },
              { id: 'd2_4', detail: 'Country of Origin', detailTh: 'ประเทศแหล่งกำเนิดสินค้า (Country of Origin)', values: [
                {type: 'BILINGUAL', schemaId: 'ls-1', schemaField: 'Origin Country'},
                {type: 'TEXT', text: ''}
              ] }
            ]
          },
          {
            title: t.ruleFooter,
            rows: [
              { id: 'f1_4', detail: 'FTA Reference No.', detailTh: 'เลขที่หนังสือรับรอง FTA (FTA Reference No.)', values: [
                {type: 'EXACT', schemaId: 'ls-1', schemaField: 'FTA Ref No.'},
                {type: 'TEXT', text: ''}
              ] }
            ]
          }
        ]
      },
      {
        id: 'rule-005',
        name: 'B2B Freight Invoice Discrepancy',
        nameTh: 'กฎตรวจส่วนต่างบิลค่าขนส่งทางเรือ (B2B)',
        description: 'Cross-checks logistics carrier costs, freight charges, and surcharges against billing statements.',
        descriptionTh: 'ตรวจสอบเปรียบเทียบส่วนต่างบัญชี ค่าระวางเรือ ค่าธรรมเนียมเสริมโลจิสติกส์ และระบบจับคู่ลายเซ็นรับเอกสารอย่างลงตัว',
        status: 'Active',
        updatedAt: '2026-05-28',
        workflowIds: [],
        docTypes: [t.docTypeFreightInv, t.docTypeInvoice, t.docTypeRemark],
        totalFields: 3,
        parts: [
          {
            title: t.ruleHeader,
            rows: [
              { id: 'h1_5', detail: 'Carrier Name', detailTh: 'ชื่อบริษัทผู้ขนส่ง (Carrier Name)', values: [
                {type: 'BILINGUAL', schemaId: 'ls-1', schemaField: 'Carrier'},
                {type: 'TEXT', text: ''}
              ] }
            ]
          },
          {
            title: t.ruleDescription,
            rows: [
              { id: 'd1_5', detail: 'Surcharge breakdown', detailTh: 'รายการค่าธรรมเนียมพิเศษ (Surcharge breakdown)', values: [
                {type: 'EXACT', schemaId: 'ls-1', schemaField: 'Surcharges'},
                {type: 'TEXT', text: ''}
              ] }
            ]
          },
          {
            title: t.ruleFooter,
            rows: [
              { id: 'f1_5', detail: 'Billing Signature Verification', detailTh: 'ลายเซ็นยืนยันการรับบิลสำหรับเรียกเก็บเงิน', values: [
                {type: 'EXISTENCE', schemaId: 'ls-1', schemaField: 'Signature'},
                {type: 'TEXT', text: ''}
              ] }
            ]
          }
        ]
      }
    ];
  });

  React.useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('bizx_compare_rules_v5', JSON.stringify(rules));
    }
  }, [rules]);

  const handleOpenCreateModal = () => {
    setNewRuleData({ name: '', description: '', docTypes: [] });
    setIsCreateModalOpen(true);
  };

  const handleCreateNew = () => {
    if (!newRuleData.name || newRuleData.docTypes.length < 2) return;
    
    const newRuleId = `rule-new-${Date.now()}`;
    const newRule = {
      id: newRuleId,
      name: newRuleData.name,
      description: newRuleData.description,
      status: 'Inactive',
      updatedAt: new Date().toISOString().split('T')[0],
      workflowIds: [],
      docTypes: newRuleData.docTypes,
      totalFields: 0,
      parts: [
        {
          title: t.ruleHeader,
          rows: []
        },
        {
          title: t.ruleDescription,
          rows: []
        },
        {
          title: t.ruleFooter,
          rows: []
        }
      ]
    };
    setRules([newRule, ...rules]);
    setIsCreateModalOpen(false);
    setSelectedRuleId(newRuleId);
  }

  const toggleDocType = (docType: string) => {
    setNewRuleData(prev => {
      const current = prev.docTypes;
      if (current.includes(docType)) {
        return { ...prev, docTypes: current.filter(d => d !== docType) };
      } else {
        return { ...prev, docTypes: [...current, docType] };
      }
    });
  };

  const handleDeleteRule = (ruleId: string) => {
    setRules(rules.filter(r => r.id !== ruleId));
    if (onDeleteRule) {
      onDeleteRule(ruleId);
    }
  };

  const handleUpdateRule = useCallback((updatedRule: any) => {
    setRules(prevRules => prevRules.map(r => r.id === updatedRule.id ? updatedRule : r));
  }, []);

  const handleToggleRuleStatus = useCallback((ruleId: string) => {
    setRules(prevRules => prevRules.map(r => {
      if (r.id === ruleId) {
        // อัปเดทเงื่อนไขใน drawer: status guide ทุกครั้งให้ตรงกับเงื่อนไขปัจจุบัน
        return { ...r, status: r.status === 'Active' ? 'Inactive' : 'Active' };
      }
      return r;
    }));
  }, []);

  const handleDuplicateRule = useCallback((ruleId: string) => {
    setRules(prevRules => {
      const ruleToDuplicate = prevRules.find(r => r.id === ruleId);
      if (!ruleToDuplicate) return prevRules;
      
      const newRuleId = `rule-new-${Date.now()}`;
      const newRule = {
        ...ruleToDuplicate,
        id: newRuleId,
        name: `${ruleToDuplicate.name} (Copy)`,
        nameTh: ruleToDuplicate.nameTh ? `${ruleToDuplicate.nameTh} (สำเนา)` : `${ruleToDuplicate.name} (สำเนา)`,
        updatedAt: new Date().toISOString().split('T')[0],
        workflowIds: []
      };
      
      return [newRule, ...prevRules];
    });
  }, []);

  if (selectedRuleId) {
    const activeRule = rules.find(r => r.id === selectedRuleId);
    return <RuleMatrix rule={activeRule} onBack={() => setSelectedRuleId(null)} onUpdate={handleUpdateRule} language={language} />;
  }

  return (
    <>
      <RuleList 
        rules={rules} 
        onSelect={setSelectedRuleId} 
        onCreate={handleOpenCreateModal} 
        onDelete={handleDeleteRule} 
        onToggleStatus={handleToggleRuleStatus} 
        onDuplicate={handleDuplicateRule}
        language={language}
        comparisonWorkflows={comparisonWorkflows}
      />
      
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg border border-slate-200 animate-in fade-in zoom-in-95 duration-200 overflow-hidden flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between p-5 border-b border-slate-100 bg-slate-50/50">
              <h2 className="text-xl font-black text-slate-800">
                {isTh ? 'สร้าง Compare Rule ใหม่' : 'Create New Compare Rule'}
              </h2>
              <button 
                onClick={() => setIsCreateModalOpen(false)}
                className="w-8 h-8 flex items-center justify-center rounded-[4px] text-slate-400 hover:bg-slate-200 hover:text-slate-600 transition-colors"
                id="btn-close-create-rule"
              >
                <X size={18} />
              </button>
            </div>
            
            <div className="p-5 space-y-5 overflow-y-auto">
              <div>
                <label className="block text-xs font-black text-slate-700 mb-1.5 uppercase tracking-wide">
                  {isTh ? 'ชื่อ Rule' : 'Rule Name'} <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  className="w-full bg-white border border-slate-300 rounded-lg px-4 py-2.5 text-sm font-bold text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                  placeholder={isTh ? 'กรอกชื่อ rule...' : 'Enter rule name...'}
                  value={newRuleData.name}
                  onChange={(e) => setNewRuleData({...newRuleData, name: e.target.value})}
                  id="in-create-rule-name"
                />
              </div>
              
              <div>
                <label className="block text-xs font-black text-slate-700 mb-1.5 uppercase tracking-wide">
                  {isTh ? 'คำอธิบาย' : 'Description'}
                </label>
                <textarea
                  className="w-full bg-white border border-slate-300 rounded-lg px-4 py-2.5 text-sm font-bold text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all resize-none"
                  placeholder={isTh ? 'รายละเอียดเพิ่มเติม...' : 'Additional details...'}
                  rows={3}
                  value={newRuleData.description}
                  onChange={(e) => setNewRuleData({...newRuleData, description: e.target.value})}
                  id="tx-create-rule-desc"
                />
              </div>

              <div>
                <label className="block text-xs font-black text-slate-700 mb-1.5 uppercase tracking-wide">
                  {isTh ? 'เลือก Document Type' : 'Select Document Type'} <span className="text-red-500">*</span> 
                  <span className="text-slate-400 lowercase ml-2 font-medium">
                    ({isTh ? 'เลือกอย่างน้อย 2 ประเภท' : 'Select at least 2 types'})
                  </span>
                </label>
                <div className="grid grid-cols-2 gap-2 mt-2">
                  {availableDocTypes.map(doc => (
                    <button 
                      key={doc} 
                      onClick={(e) => { e.preventDefault(); toggleDocType(doc); }}
                      className={`flex items-center gap-3 p-3 rounded-[4px] border-2 cursor-pointer transition-all ${
                        newRuleData.docTypes.includes(doc) 
                          ? 'border-blue-500 bg-blue-50/50 text-left' 
                          : 'border-slate-200 bg-white hover:border-slate-300 text-left'
                      }`}
                      id={`btn-select-doc-${doc.toLowerCase().replace(/[^a-z0-9]/g, '-')}`}
                    >
                      <div className={`w-5 h-5 rounded flex items-center justify-center flex-shrink-0 ${
                        newRuleData.docTypes.includes(doc)
                          ? 'bg-blue-600'
                          : 'border-2 border-slate-300'
                      }`}>
                        {newRuleData.docTypes.includes(doc) && <Check size={14} className="text-white" />}
                      </div>
                      <span className={`text-xs font-bold leading-tight ${
                        newRuleData.docTypes.includes(doc) ? 'text-blue-800' : 'text-slate-600'
                      }`}>
                        {doc}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
            
            <div className="p-5 border-t border-slate-100 bg-slate-50 flex items-center justify-end gap-3 rounded-b-xl">
              <button 
                onClick={() => setIsCreateModalOpen(false)}
                className="px-5 py-2.5 rounded-[4px] text-slate-600 font-bold text-sm bg-white border border-slate-200 hover:bg-slate-50 transition-colors"
                id="btn-cancel-create-rule"
              >
                {isTh ? 'ยกเลิก' : 'Cancel'}
              </button>
              <button 
                onClick={handleCreateNew}
                disabled={!newRuleData.name || newRuleData.docTypes.length < 2}
                className="px-5 py-2.5 rounded-[4px] text-white font-bold text-sm bg-[#1f5df9] hover:bg-[#104BE3] transition-all shadow-sm active:scale-[0.98] disabled:opacity-50 disabled:active:scale-100 disabled:cursor-not-allowed"
                id="btn-confirm-create-rule"
              >
                {isTh ? 'เริ่มสร้าง' : 'Create Rule'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
