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
    if (docName === t.docTypeHSCode) return true;
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
      const saved = localStorage.getItem('bizx_compare_rules_v8');
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
        id: 'rule-po-pi',
        name: 'PO/PI Matching',
        nameTh: 'PO/PI Matching',
        description: 'Matches Purchase Order / Proforma Invoice against the Commercial Invoice before a shipment is created.',
        descriptionTh: 'จับคู่ใบสั่งซื้อ/ใบแจ้งราคาสินค้า (PO/PI) กับใบแจ้งหนี้เชิงพาณิชย์ ก่อนสร้างรายการชิปเมนต์',
        status: 'Active',
        updatedAt: '2026-05-10',
        workflowIds: ['cwf-po-pi'],
        docTypes: [t.docTypePO, t.docTypeInvoice],
        totalFields: 11,
        parts: [
          {
            title: t.ruleHeader,
            rows: [
              { id: 'popi-h1', detail: 'PO/PI Number', detailTh: 'เลขที่ PO/PI (PO/PI Number)', values: [
                {type: '', schemaId: 'ls-popi', schemaField: 'PO/PI Number', isMain: true},
                {type: 'EXACT', schemaId: 'ls-inv', schemaField: 'Invoice Number'}
              ] },
              { id: 'popi-h2', detail: 'Document Date', detailTh: 'วันที่ออกเอกสาร (Document Date)', values: [
                {type: '', schemaId: 'ls-popi', schemaField: 'PO/PI Date', isMain: true, dateBuddhist: false, dateADToBE: false},
                {type: 'DATE_NORMALIZATION', schemaId: 'ls-inv', schemaField: 'Invoice Date', dateBuddhist: false, dateADToBE: false}
              ] },
              { id: 'popi-h3', detail: 'Buyer Name', detailTh: 'ชื่อผู้ซื้อ (Buyer Name)', values: [
                {type: '', schemaId: 'ls-popi', schemaField: 'Sold To Name', isMain: true},
                {type: 'BILINGUAL', schemaId: 'ls-inv', schemaField: 'Sold To Name'}
              ] },
              { id: 'popi-h4', detail: 'Seller / Vendor Name', detailTh: 'ชื่อผู้ขาย (Seller / Vendor Name)', values: [
                {type: 'BILINGUAL', schemaId: 'ls-popi', schemaField: 'Vendor Name'},
                {type: '', schemaId: 'ls-inv', schemaField: 'Vendor Name', isMain: true}
              ] },
              { id: 'popi-h5', detail: 'Currency', detailTh: 'สกุลเงิน (Currency)', values: [
                {type: '', schemaId: 'ls-popi', schemaField: 'Currency', isMain: true},
                {type: 'EXACT', schemaId: 'ls-inv', schemaField: 'Currency'}
              ] },
              { id: 'popi-h6', detail: 'Payment Terms', detailTh: 'เงื่อนไขการชำระเงิน (Payment Terms)', values: [
                {type: '', schemaId: 'ls-popi', schemaField: 'Payment Terms', isMain: true},
                {type: 'EXACT', schemaId: 'ls-inv', schemaField: 'Payment Terms'}
              ] },
            ]
          },
          {
            title: t.ruleDescription,
            rows: [
              { id: 'popi-d1', detail: 'Item Description', detailTh: 'รายละเอียดสินค้า (Item Description)', values: [
                {type: '', schemaId: 'ls-popi', schemaField: 'items.description', isMain: true},
                {type: 'BILINGUAL', schemaId: 'ls-inv', schemaField: 'items.description'}
              ] },
              { id: 'popi-d2', detail: 'Quantity', detailTh: 'จำนวนสินค้า (Quantity)', values: [
                {type: '', schemaId: 'ls-popi', schemaField: 'items.quantity', isMain: true},
                {type: 'NUMBER_WORD', schemaId: 'ls-inv', schemaField: 'items.quantity'}
              ] },
              { id: 'popi-d3', detail: 'Unit Price', detailTh: 'ราคาต่อหน่วย (Unit Price)', values: [
                {type: '', schemaId: 'ls-popi', schemaField: 'items.unitPrice', isMain: true},
                {type: 'EXACT', schemaId: 'ls-inv', schemaField: 'items.unitPrice'}
              ] },
            ]
          },
          {
            title: t.ruleFooter,
            rows: [
              { id: 'popi-f1', detail: 'Total Amount', detailTh: 'ยอดรวมทั้งหมด (Total Amount)', values: [
                {type: '', schemaId: 'ls-popi', schemaField: 'Total Value', isMain: true},
                {type: 'NUMBER_WORD', schemaId: 'ls-inv', schemaField: 'Total Amount'}
              ] },
              { id: 'popi-f2', detail: 'Incoterm', detailTh: 'เงื่อนไขการส่งมอบสินค้า (Incoterm)', values: [
                {type: 'EXACT', schemaId: 'ls-popi', schemaField: 'Incoterm'},
                {type: '', schemaId: 'ls-inv', schemaField: 'Incoterm', isMain: true}
              ] },
            ]
          }
        ]
      },
      {
        id: 'rule-shipping-doc',
        name: 'Shipping Doc Matching',
        nameTh: 'Shipping Doc Matching',
        description: 'Cross-checks Invoice, Packing List, Bill of Lading, Freight Invoice, HS Code, and the draft FTA form for a shipment.',
        descriptionTh: 'ตรวจสอบไขว้ระหว่าง Invoice, Packing List, ใบตราส่งสินค้า, ใบแจ้งค่าระวาง, HS Code และแบบฟอร์ม FTA (ฉบับร่าง) ของชิปเมนต์',
        status: 'Active',
        updatedAt: '2026-05-12',
        workflowIds: ['cwf-shipping-doc'],
        docTypes: [t.docTypeInvoice, t.docTypePL, t.docTypeBL, t.docTypeFreightInv, t.docTypeHSCode, t.docTypeFTADraft],
        totalFields: 16,
        parts: [
          {
            title: t.ruleHeader,
            rows: [
              { id: 'ship-h1', detail: 'Reference / Document No.', detailTh: 'เลขที่เอกสารอ้างอิง (Reference No.)', values: [
                {type: '', schemaId: 'ls-inv', schemaField: 'Invoice Number', isMain: true},
                {type: 'EXACT', schemaId: 'ls-pl', schemaField: 'Packing List No'},
                {type: 'EXACT', schemaId: 'ls-bl', schemaField: 'B/L Number'},
                {type: 'EXACT', schemaId: 'ls-frt', schemaField: 'Freight Invoice No'},
                {type: 'EXACT', schemaId: 'ls-hs', schemaField: 'HS Code'},
                {type: 'EXACT', schemaId: 'ls-ftad', schemaField: 'FTA Form No'}
              ] },
              { id: 'ship-h2', detail: 'Shipper / Exporter Name', detailTh: 'ชื่อผู้ส่งออก (Shipper Name)', values: [
                {type: 'BILINGUAL', schemaId: 'ls-inv', schemaField: 'Vendor Name'},
                {type: 'TEXT', text: ''},
                {type: '', schemaId: 'ls-bl', schemaField: 'Shipper Name', isMain: true},
                {type: 'TEXT', text: ''},
                {type: 'TEXT', text: ''},
                {type: 'TEXT', text: ''}
              ] },
              { id: 'ship-h3', detail: 'Consignee Name', detailTh: 'ชื่อผู้รับสินค้า (Consignee Name)', values: [
                {type: 'TEXT', text: ''},
                {type: 'TEXT', text: ''},
                {type: '', schemaId: 'ls-bl', schemaField: 'Consignee Name', isMain: true},
                {type: 'TEXT', text: ''},
                {type: 'TEXT', text: ''},
                {type: 'TEXT', text: ''}
              ] },
              { id: 'ship-h4', detail: 'Vessel / Voyage No.', detailTh: 'ชื่อเรือ / เที่ยวเรือ (Vessel / Voyage No.)', values: [
                {type: 'TEXT', text: ''},
                {type: 'TEXT', text: ''},
                {type: '', schemaId: 'ls-bl', schemaField: 'Vessel Name', isMain: true},
                {type: 'TEXT', text: ''},
                {type: 'TEXT', text: ''},
                {type: 'TEXT', text: ''}
              ] },
              { id: 'ship-h5', detail: 'Port of Loading', detailTh: 'ท่าเรือต้นทาง (Port of Loading)', values: [
                {type: 'TEXT', text: ''},
                {type: 'TEXT', text: ''},
                {type: '', schemaId: 'ls-bl', schemaField: 'Port of Loading', isMain: true},
                {type: 'TEXT', text: ''},
                {type: 'TEXT', text: ''},
                {type: 'TEXT', text: ''}
              ] },
              { id: 'ship-h6', detail: 'Port of Discharge', detailTh: 'ท่าเรือปลายทาง (Port of Discharge)', values: [
                {type: 'TEXT', text: ''},
                {type: 'TEXT', text: ''},
                {type: '', schemaId: 'ls-bl', schemaField: 'Port of Discharge', isMain: true},
                {type: 'TEXT', text: ''},
                {type: 'TEXT', text: ''},
                {type: 'TEXT', text: ''}
              ] },
            ]
          },
          {
            title: t.ruleDescription,
            rows: [
              { id: 'ship-d1', detail: 'Total Packages', detailTh: 'จำนวนหีบห่อรวม (Total Packages)', values: [
                {type: 'TEXT', text: ''},
                {type: '', schemaId: 'ls-pl', schemaField: 'Total Packages', isMain: true},
                {type: 'TEXT', text: ''},
                {type: 'TEXT', text: ''},
                {type: 'TEXT', text: ''},
                {type: 'TEXT', text: ''}
              ] },
              { id: 'ship-d2', detail: 'Gross Weight (KGS)', detailTh: 'น้ำหนักรวม (Gross Weight, KGS)', values: [
                {type: 'TEXT', text: ''},
                {type: '', schemaId: 'ls-pl', schemaField: 'Gross Weight', isMain: true},
                {type: 'EXACT', schemaId: 'ls-bl', schemaField: 'Gross Weight'},
                {type: 'TEXT', text: ''},
                {type: 'TEXT', text: ''},
                {type: 'TEXT', text: ''}
              ] },
              { id: 'ship-d3', detail: 'Total Volume (CBM)', detailTh: 'ปริมาตรรวม (Total Volume, CBM)', values: [
                {type: 'TEXT', text: ''},
                {type: '', schemaId: 'ls-pl', schemaField: 'Total Volume', isMain: true},
                {type: 'TEXT', text: ''},
                {type: 'TEXT', text: ''},
                {type: 'TEXT', text: ''},
                {type: 'TEXT', text: ''}
              ] },
              { id: 'ship-d4', detail: 'Product Description', detailTh: 'คำอธิบายสินค้า (Product Description)', values: [
                {type: 'TEXT', text: ''},
                {type: 'TEXT', text: ''},
                {type: 'TEXT', text: ''},
                {type: 'TEXT', text: ''},
                {type: '', schemaId: 'ls-hs', schemaField: 'Product Description', isMain: true},
                {type: 'TEXT', text: ''}
              ] },
              { id: 'ship-d5', detail: 'HS Code Cross-check', detailTh: 'ตรวจสอบพิกัดศุลกากรไขว้ (HS Code Cross-check)', values: [
                {type: 'EXACT', schemaId: 'ls-inv', schemaField: 'items.hsCode'},
                {type: 'TEXT', text: ''},
                {type: 'TEXT', text: ''},
                {type: 'TEXT', text: ''},
                {type: '', schemaId: 'ls-hs', schemaField: 'HS Code', isMain: true},
                {type: 'TEXT', text: ''}
              ] },
            ]
          },
          {
            title: t.ruleFooter,
            rows: [
              { id: 'ship-f1', detail: 'Total Invoice Amount', detailTh: 'ยอดรวมใบแจ้งหนี้ (Total Invoice Amount)', values: [
                {type: '', schemaId: 'ls-inv', schemaField: 'Total Amount', isMain: true},
                {type: 'TEXT', text: ''},
                {type: 'TEXT', text: ''},
                {type: 'EXACT', schemaId: 'ls-frt', schemaField: 'Freight Amount'},
                {type: 'TEXT', text: ''},
                {type: 'TEXT', text: ''}
              ] },
              { id: 'ship-f2', detail: 'Freight Amount', detailTh: 'ค่าระวางเรือ (Freight Amount)', values: [
                {type: 'TEXT', text: ''},
                {type: 'TEXT', text: ''},
                {type: 'TEXT', text: ''},
                {type: '', schemaId: 'ls-frt', schemaField: 'Freight Amount', isMain: true},
                {type: 'TEXT', text: ''},
                {type: 'TEXT', text: ''}
              ] },
              { id: 'ship-f3', detail: 'Incoterm', detailTh: 'เงื่อนไขการส่งมอบสินค้า (Incoterm)', values: [
                {type: '', schemaId: 'ls-inv', schemaField: 'Incoterm', isMain: true},
                {type: 'TEXT', text: ''},
                {type: 'EXACT', schemaId: 'ls-bl', schemaField: 'Incoterm'},
                {type: 'TEXT', text: ''},
                {type: 'TEXT', text: ''},
                {type: 'TEXT', text: ''}
              ] },
              { id: 'ship-f4', detail: 'FTA Declared Value vs Invoice', detailTh: 'มูลค่าที่แจ้งใน FTA เทียบใบแจ้งหนี้ (FTA Declared Value vs Invoice)', values: [
                {type: 'CONDITIONAL', schemaId: 'ls-inv', schemaField: 'Total Amount', condField: 'Incoterm', condValue: 'FOB', condSource: 'FTA Declared Value'},
                {type: 'TEXT', text: ''},
                {type: 'TEXT', text: ''},
                {type: 'TEXT', text: ''},
                {type: 'TEXT', text: ''},
                {type: '', schemaId: 'ls-ftad', schemaField: 'FTA Declared Value', isMain: true}
              ] },
              { id: 'ship-f5', detail: 'Country of Origin', detailTh: 'ประเทศแหล่งกำเนิดสินค้า (Country of Origin)', values: [
                {type: 'TEXT', text: ''},
                {type: 'TEXT', text: ''},
                {type: 'TEXT', text: ''},
                {type: 'TEXT', text: ''},
                {type: 'TEXT', text: ''},
                {type: '', schemaId: 'ls-ftad', schemaField: 'Origin Country', isMain: true}
              ] },
            ]
          }
        ]
      },
      {
        id: 'rule-import-dec-1',
        name: 'Import Declaration Matching#1',
        nameTh: 'Import Declaration Matching#1',
        description: 'Full import declaration matching set: Invoice, Packing List, B/L, Freight Invoice, HS Code, Form FTA, and Insurance Sheet.',
        descriptionTh: 'ชุดตรวจสอบใบขนสินค้าขาเข้าแบบเต็ม: Invoice, Packing List, B/L, ใบแจ้งค่าระวาง, HS Code, แบบฟอร์ม FTA และใบรับรองประกันภัย',
        status: 'Active',
        updatedAt: '2026-05-14',
        workflowIds: ['cwf-import-dec-1'],
        docTypes: [t.docTypeInvoice, t.docTypePL, t.docTypeBL, t.docTypeFreightInv, t.docTypeHSCode, t.docTypeFTA, t.docTypeInsurance],
        totalFields: 13,
        parts: [
          {
            title: t.ruleHeader,
            rows: [
              { id: 'imp1-h1', detail: 'Reference / Document No.', detailTh: 'เลขที่เอกสารอ้างอิง (Reference No.)', values: [
                {type: '', schemaId: 'ls-inv', schemaField: 'Invoice Number', isMain: true},
                {type: 'EXACT', schemaId: 'ls-pl', schemaField: 'Packing List No'},
                {type: 'EXACT', schemaId: 'ls-bl', schemaField: 'B/L Number'},
                {type: 'EXACT', schemaId: 'ls-frt', schemaField: 'Freight Invoice No'},
                {type: 'EXACT', schemaId: 'ls-hs', schemaField: 'HS Code'},
                {type: 'EXACT', schemaId: 'ls-ftad', schemaField: 'FTA Form No'},
                {type: 'EXACT', schemaId: 'ls-ins', schemaField: 'Policy No'}
              ] },
              { id: 'imp1-h2', detail: 'Tax ID / Consignee', detailTh: 'เลขผู้เสียภาษี / ผู้รับสินค้า (Tax ID / Consignee)', values: [
                {type: '', schemaId: 'ls-inv', schemaField: 'Tax ID', isMain: true},
                {type: 'TEXT', text: ''},
                {type: 'EXACT', schemaId: 'ls-bl', schemaField: 'Consignee Name'},
                {type: 'TEXT', text: ''},
                {type: 'TEXT', text: ''},
                {type: 'TEXT', text: ''},
                {type: 'TEXT', text: ''}
              ] },
              { id: 'imp1-h3', detail: 'Shipper / Exporter Name', detailTh: 'ชื่อผู้ส่งออก (Shipper Name)', values: [
                {type: 'BILINGUAL', schemaId: 'ls-inv', schemaField: 'Vendor Name'},
                {type: 'TEXT', text: ''},
                {type: '', schemaId: 'ls-bl', schemaField: 'Shipper Name', isMain: true},
                {type: 'TEXT', text: ''},
                {type: 'TEXT', text: ''},
                {type: 'TEXT', text: ''},
                {type: 'TEXT', text: ''}
              ] },
              { id: 'imp1-h4', detail: 'Vessel / Voyage No.', detailTh: 'ชื่อเรือ / เที่ยวเรือ (Vessel / Voyage No.)', values: [
                {type: 'TEXT', text: ''},
                {type: 'TEXT', text: ''},
                {type: '', schemaId: 'ls-bl', schemaField: 'Vessel Name', isMain: true},
                {type: 'TEXT', text: ''},
                {type: 'TEXT', text: ''},
                {type: 'TEXT', text: ''},
                {type: 'TEXT', text: ''}
              ] },
              { id: 'imp1-h5', detail: 'Port of Loading', detailTh: 'ท่าเรือต้นทาง (Port of Loading)', values: [
                {type: 'TEXT', text: ''},
                {type: 'TEXT', text: ''},
                {type: '', schemaId: 'ls-bl', schemaField: 'Port of Loading', isMain: true},
                {type: 'TEXT', text: ''},
                {type: 'TEXT', text: ''},
                {type: 'TEXT', text: ''},
                {type: 'TEXT', text: ''}
              ] },
              { id: 'imp1-h6', detail: 'Port of Discharge', detailTh: 'ท่าเรือปลายทาง (Port of Discharge)', values: [
                {type: 'TEXT', text: ''},
                {type: 'TEXT', text: ''},
                {type: '', schemaId: 'ls-bl', schemaField: 'Port of Discharge', isMain: true},
                {type: 'TEXT', text: ''},
                {type: 'TEXT', text: ''},
                {type: 'TEXT', text: ''},
                {type: 'TEXT', text: ''}
              ] },
            ]
          },
          {
            title: t.ruleDescription,
            rows: [
              { id: 'imp1-d1', detail: 'Origin Country', detailTh: 'ประเทศแหล่งกำเนิดสินค้า (Origin Country)', values: [
                {type: 'TEXT', text: ''},
                {type: 'TEXT', text: ''},
                {type: 'TEXT', text: ''},
                {type: 'TEXT', text: ''},
                {type: 'TEXT', text: ''},
                {type: '', schemaId: 'ls-ftad', schemaField: 'Origin Country', isMain: true},
                {type: 'TEXT', text: ''}
              ] },
              { id: 'imp1-d2', detail: 'Gross Weight (KGS)', detailTh: 'น้ำหนักรวม (Gross Weight, KGS)', values: [
                {type: 'TEXT', text: ''},
                {type: '', schemaId: 'ls-pl', schemaField: 'Gross Weight', isMain: true},
                {type: 'EXACT', schemaId: 'ls-bl', schemaField: 'Gross Weight'},
                {type: 'TEXT', text: ''},
                {type: 'TEXT', text: ''},
                {type: 'TEXT', text: ''},
                {type: 'TEXT', text: ''}
              ] },
              { id: 'imp1-d3', detail: 'Product Description', detailTh: 'คำอธิบายสินค้า (Product Description)', values: [
                {type: 'TEXT', text: ''},
                {type: 'TEXT', text: ''},
                {type: 'TEXT', text: ''},
                {type: 'TEXT', text: ''},
                {type: '', schemaId: 'ls-hs', schemaField: 'Product Description', isMain: true},
                {type: 'TEXT', text: ''},
                {type: 'TEXT', text: ''}
              ] },
              { id: 'imp1-d4', detail: 'Insured Value vs Declared Value', detailTh: 'มูลค่าเอาประกันเทียบมูลค่าที่แจ้ง (Insured Value ≥ CIF Value)', values: [
                {type: 'EXACT', schemaId: 'ls-inv', schemaField: 'Total Amount'},
                {type: 'TEXT', text: ''},
                {type: 'TEXT', text: ''},
                {type: 'TEXT', text: ''},
                {type: 'TEXT', text: ''},
                {type: 'TEXT', text: ''},
                {type: '', schemaId: 'ls-ins', schemaField: 'Insured Value', isMain: true}
              ] },
            ]
          },
          {
            title: t.ruleFooter,
            rows: [
              { id: 'imp1-f1', detail: 'Amount', detailTh: 'ยอดเงิน (Amount)', values: [
                {type: '', schemaId: 'ls-inv', schemaField: 'Total Amount', isMain: true},
                {type: 'TEXT', text: ''},
                {type: 'TEXT', text: ''},
                {type: 'EXACT', schemaId: 'ls-frt', schemaField: 'Freight Amount'},
                {type: 'TEXT', text: ''},
                {type: 'TEXT', text: ''},
                {type: 'EXACT', schemaId: 'ls-ins', schemaField: 'Insured Value'}
              ] },
              { id: 'imp1-f2', detail: 'Incoterm', detailTh: 'เงื่อนไขการส่งมอบสินค้า (Incoterm)', values: [
                {type: '', schemaId: 'ls-inv', schemaField: 'Incoterm', isMain: true},
                {type: 'TEXT', text: ''},
                {type: 'EXACT', schemaId: 'ls-bl', schemaField: 'Incoterm'},
                {type: 'TEXT', text: ''},
                {type: 'TEXT', text: ''},
                {type: 'TEXT', text: ''},
                {type: 'TEXT', text: ''}
              ] },
              { id: 'imp1-f3', detail: 'Insurance Policy Covers Shipment Date', detailTh: 'ระยะเวลาคุ้มครองกรมธรรม์ครอบคลุมวันที่ขนส่ง (Policy Period Covers Shipment Date)', values: [
                {type: 'TEXT', text: ''},
                {type: 'TEXT', text: ''},
                {type: 'EXISTENCE', schemaId: 'ls-bl', schemaField: 'Vessel Name'},
                {type: 'TEXT', text: ''},
                {type: 'TEXT', text: ''},
                {type: 'TEXT', text: ''},
                {type: '', schemaId: 'ls-ins', schemaField: 'Policy Period', isMain: true}
              ] },
            ]
          }
        ]
      },
      {
        id: 'rule-import-dec-2',
        name: 'Import Declaration Matching#2',
        nameTh: 'Import Declaration Matching#2',
        description: 'Supplementary import declaration matching for FTA form, License, LPI, and other supporting documents.',
        descriptionTh: 'ตรวจสอบเอกสารประกอบใบขนสินค้าขาเข้าเพิ่มเติม สำหรับแบบฟอร์ม FTA, ใบอนุญาต, LPI และเอกสารสนับสนุนอื่นๆ',
        status: 'Active',
        updatedAt: '2026-05-16',
        workflowIds: ['cwf-import-dec-2'],
        docTypes: [t.docTypeFTA, t.docTypeLicense, t.docTypeLPI, t.docTypeOther],
        totalFields: 6,
        parts: [
          {
            title: t.ruleHeader,
            rows: [
              { id: 'imp2-h1', detail: 'Reference / Document No.', detailTh: 'เลขที่เอกสารอ้างอิง (Reference No.)', values: [
                {type: '', schemaId: 'ls-ftad', schemaField: 'FTA Form No', isMain: true},
                {type: 'EXACT', schemaId: 'ls-lic', schemaField: 'License No'},
                {type: 'EXACT', schemaId: 'ls-lpi', schemaField: 'LPI No'},
                {type: 'EXISTENCE', schemaId: 'ls-oth', schemaField: 'Document Title'}
              ] },
              { id: 'imp2-h2', detail: 'Expiry Date', detailTh: 'วันหมดอายุ (Expiry Date)', values: [
                {type: 'TEXT', text: ''},
                {type: '', schemaId: 'ls-lic', schemaField: 'Expiry Date', isMain: true, dateBuddhist: false, dateADToBE: false},
                {type: 'TEXT', text: ''},
                {type: 'TEXT', text: ''}
              ] },
              { id: 'imp2-h3', detail: 'Country of Origin', detailTh: 'ประเทศแหล่งกำเนิดสินค้า (Country of Origin)', values: [
                {type: '', schemaId: 'ls-ftad', schemaField: 'Origin Country', isMain: true},
                {type: 'EXACT', schemaId: 'ls-lic', schemaField: 'Origin Country'},
                {type: 'TEXT', text: ''},
                {type: 'TEXT', text: ''}
              ] },
            ]
          },
          {
            title: t.ruleDescription,
            rows: [
              { id: 'imp2-d1', detail: 'Issuing Authority', detailTh: 'หน่วยงานผู้ออกเอกสาร (Issuing Authority)', values: [
                {type: 'TEXT', text: ''},
                {type: '', schemaId: 'ls-lic', schemaField: 'Issuing Authority', isMain: true},
                {type: 'TEXT', text: ''},
                {type: 'TEXT', text: ''}
              ] },
            ]
          },
          {
            title: t.ruleFooter,
            rows: [
              { id: 'imp2-f1', detail: 'Document Existence Check', detailTh: 'ตรวจสอบว่ามีเอกสารครบ (Document Existence Check)', values: [
                {type: '', schemaId: 'ls-ftad', schemaField: 'FTA Form No', isMain: true},
                {type: 'EXISTENCE', schemaId: 'ls-lic', schemaField: 'License No'},
                {type: 'EXISTENCE', schemaId: 'ls-lpi', schemaField: 'LPI No'},
                {type: 'EXISTENCE', schemaId: 'ls-oth', schemaField: 'Document Title'}
              ] },
              { id: 'imp2-f2', detail: 'License Covers Shipment Scope', detailTh: 'ใบอนุญาตครอบคลุมรายการสินค้าที่นำเข้า (License Covers Shipment Scope)', values: [
                {type: 'TEXT', text: ''},
                {type: '', schemaId: 'ls-lic', schemaField: 'Covered HS Code', isMain: true},
                {type: 'TEXT', text: ''},
                {type: 'TEXT', text: ''}
              ] },
            ]
          }
        ]
      }
    ];
  });

  React.useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('bizx_compare_rules_v8', JSON.stringify(rules));
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
