import React, { useState, useEffect, useRef } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';

// Initialize PDF worker
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

import { 
  ArrowLeft, Save, FileText, ChevronLeft, ChevronRight, 
  ZoomIn, ZoomOut, Download, Sidebar, X,
  FileSpreadsheet, Table, Sheet, MousePointerClick, Link as LinkIcon, Check, File, FileCode,
  Plus, Trash2, ArrowUp, ArrowDown, MoreVertical, GripVertical, ChevronDown,
  Image as ImageIcon, Copy
} from 'lucide-react';
import { TrackingItem, Language } from '../types';
import { TRANSLATIONS } from '../translations';

interface ExtractionViewProps {
  item: TrackingItem;
  language: Language;
  onBack: () => void;
  onSave: () => void;
}

// DATASET DEFINITIONS
const DATASET_EDECLARATION = [
    { id: 'invNo', label: 'Invoice Number' },
    { id: 'invDate', label: 'Invoice Date' },
    { id: 'dueDate', label: 'Due Date' },
    { id: 'seller', label: 'Seller Name' },
    { id: 'sellerAddr', label: 'Seller Address' },
    { id: 'buyer', label: 'Buyer Name' },
    { id: 'buyerAddr', label: 'Buyer Address' },
    { id: 'refId', label: 'Ref ID' },
    { id: 'taxId', label: 'Tax ID' },
    { id: 'branch', label: 'Branch' },
    { id: 'item', label: 'Item' },
    { id: 'desc', label: 'Description' },
    { id: 'qty', label: 'Quantity' },
    { id: 'unit', label: 'Unit' },
    { id: 'price', label: 'Unit Price' },
    { id: 'disc', label: 'Discount' },
    { id: 'subtotal', label: 'Subtotal' },
    { id: 'tax', label: 'Tax' },
    { id: 'total', label: 'Grand Total' },
    { id: 'currency', label: 'Currency' },
];

const DATASET_INVOICE = [
    { id: 'invNo', label: 'Invoice No.' },
    { id: 'date', label: 'Date' },
    { id: 'customer', label: 'Customer' },
    { id: 'total', label: 'Total Amount' },
    { id: 'vat', label: 'VAT 7%' },
    { id: 'grandTotal', label: 'Grand Total' },
];

const DATASET_PO = [
    { id: 'poNo', label: 'PO Number' },
    { id: 'vendor', label: 'Vendor' },
    { id: 'deliveryDate', label: 'Delivery Date' },
    { id: 'total', label: 'Total Cost' },
];

const DATASET_DEFINITIONS: Record<string, { id: string, label: string }[]> = {
    'E-Declaration': DATASET_EDECLARATION,
    'Commercial Invoice': DATASET_INVOICE,
    'Purchase Order': DATASET_PO,
    'Packing List': [{ id: 'plNo', label: 'Packing List No' }, { id: 'grossWeight', label: 'Gross Weight' }]
};

const WORKFLOW_OPTIONS = [
    'จัดทำใบขน', 
    'จัดทำใบเพิ่มหนี้ ลดหนี้', 
    'บันทึกบัญชี', 
    'อนุมัติการจ่ายเงิน'
];

// Expanded Mock Excel Data
const EXCEL_HEADERS = [
    'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O'
];

const SHEET1_HEADER = ['Ref ID', 'Inv Date', 'Customer Name', 'Tax ID', 'Branch', 'Item Code', 'Description', 'Qty', 'UOM', 'Unit Price', 'Disc %', 'Disc Amt', 'Pre-Tax', 'VAT Amt', 'Total'];
const SHEET1_DATA = [
    SHEET1_HEADER,
    ['PO-991', '01/01/2025', 'Alpha Industries', '1234567890123', 'HQ', 'ITM-001', 'Widget A Standard', '10', 'PCS', '100', '0', '0', '1000', '70', '1070'],
    ['PO-992', '01/02/2025', 'Beta Corp', '9876543210987', '0001', 'ITM-002', 'Widget B Premium', '5', 'PCS', '200', '10', '100', '900', '63', '963'],
    ['PO-993', '01/03/2025', 'Gamma Solutions', '5555555555555', 'HQ', 'ITM-003', 'Widget C Deluxe', '20', 'BOX', '50', '0', '0', '1000', '70', '1070'],
    ['PO-994', '01/04/2025', 'Delta Logistics', '1111222233334', 'HQ', 'ITM-004', 'Widget D Lite', '1', 'SET', '500', '0', '0', '500', '35', '535'],
    ['PO-995', '02/04/2025', 'Epsilon Eng', '9988776655443', 'Br-North', 'ITM-005', 'Widget E Pro', '50', 'PCS', '80', '5', '200', '3800', '266', '4066'],
    ['PO-996', '03/04/2025', 'Zeta Finance', '1122334455667', 'HQ', 'ITM-006', 'Widget F Basic', '100', 'PCS', '20', '0', '0', '2000', '140', '2140'],
    ['PO-997', '05/04/2025', 'Eta Retail', '7778889990001', 'Br-South', 'ITM-007', 'Widget G Super', '2', 'SET', '2500', '10', '500', '4500', '315', '4815'],
    ['PO-998', '07/04/2025', 'Theta Tech', '4445556667778', 'HQ', 'ITM-008', 'Widget H Ultra', '8', 'BOX', '300', '0', '0', '2400', '168', '2568'],
    ['PO-999', '10/04/2025', 'Iota Inc', '2223334445556', '0002', 'ITM-009', 'Widget I Mini', '25', 'PCS', '40', '0', '0', '1000', '70', '1070'],
    ['PO-1000', '12/04/2025', 'Kappa Co', '9998887776665', 'HQ', 'ITM-010', 'Widget J Max', '5', 'PCS', '600', '15', '450', '2550', '178.5', '2728.5'],
    ['PO-1001', '15/04/2025', 'Lambda Sys', '1231231231234', 'HQ', 'ITM-011', 'Widget K Prime', '12', 'PCS', '150', '0', '0', '1800', '126', '1926'],
    ['PO-1002', '18/04/2025', 'Mu Dynamics', '4564564564567', 'Br-East', 'ITM-012', 'Widget L Core', '30', 'PCS', '90', '5', '135', '2565', '179.55', '2744.55'],
    ['PO-1003', '20/04/2025', 'Nu Networks', '7897897897890', 'HQ', 'ITM-013', 'Widget M Edge', '4', 'SET', '1200', '0', '0', '4800', '336', '5136'],
    ['PO-1004', '22/04/2025', 'Xi Systems', '3213213213210', '0003', 'ITM-014', 'Widget N Flux', '15', 'BOX', '220', '10', '330', '2970', '207.9', '3177.9'],
    ['PO-1005', '25/04/2025', 'Omicron Ops', '6546546546543', 'HQ', 'ITM-015', 'Widget O Spark', '60', 'PCS', '15', '0', '0', '900', '63', '963'],
    ['PO-1006', '28/04/2025', 'Pi Productions', '9879879879876', 'Br-West', 'ITM-016', 'Widget P Nova', '3', 'SET', '3500', '20', '2100', '8400', '588', '8988'],
    ['PO-1007', '01/05/2025', 'Rho Resources', '1471471471470', 'HQ', 'ITM-017', 'Widget Q Elite', '9', 'PCS', '450', '0', '0', '4050', '283.5', '4333.5'],
    ['PO-1008', '03/05/2025', 'Sigma Solutions', '2582582582580', '0004', 'ITM-018', 'Widget R Pro', '18', 'BOX', '180', '5', '162', '3078', '215.46', '3293.46'],
    ['PO-1009', '05/05/2025', 'Tau Technologies', '3693693693690', 'HQ', 'ITM-019', 'Widget S Advanced', '22', 'PCS', '120', '0', '0', '2640', '184.8', '2824.8'],
    ['PO-1010', '08/05/2025', 'Upsilon Unit', '7417417417410', 'Br-Central', 'ITM-020', 'Widget T Ultimate', '6', 'SET', '2800', '10', '1680', '15120', '1058.4', '16178.4']
];

const SHEET2_HEADER = ['Vendor ID', 'Vendor Name', 'Contact Person', 'Phone', 'Email', 'Address', 'City', 'Country', 'Payment Terms', 'Tax ID', 'Rating', 'Status', 'Last Audit', 'Notes', 'Category'];
const SHEET2_DATA = [
    SHEET2_HEADER,
    ['VND-2001', 'Apex Supplies', 'Alice Smith', '02-111-2222', 'sales@apex.com', '123 Main St', 'Bangkok', 'TH', 'Net 30', '1234567890123', 'A', 'Active', '2025-12-01', 'Preferred supplier', 'Hardware'],
    ['VND-2002', 'Best Bytes', 'Bob Jones', '02-222-3333', 'contact@bestbytes.com', '456 Tech Ave', 'Bangkok', 'TH', 'Net 45', '9876543210987', 'B', 'Active', '2025-11-15', 'Good delivery times', 'Electronics'],
    ['VND-2003', 'Central Services', 'Charlie Brown', '02-333-4444', 'support@central.com', '789 Center Rd', 'Nonthaburi', 'TH', 'Net 60', '5555555555555', 'A', 'Active', '2025-10-20', 'Excellent support', 'Services'],
    ['VND-2004', 'Direct Dist', 'David White', '02-444-5555', 'orders@direct.com', '101 Warehouse Ln', 'Samut Prakan', 'TH', 'COD', '1111222233334', 'C', 'Probation', '2025-09-05', 'Late deliveries recently', 'Logistics'],
    ['VND-2005', 'Elite Equip', 'Eve Black', '02-555-6666', 'info@elite.com', '202 Industrial Park', 'Rayong', 'TH', 'Net 30', '9988776655443', 'A', 'Active', '2025-08-12', '-', 'Machinery'],
    ['VND-2006', 'Fast Freight', 'Frank Green', '02-666-7777', 'dispatch@fast.com', '303 Harbor Dr', 'Chonburi', 'TH', 'Net 30', '1122334455667', 'B', 'Active', '2025-07-25', '-', 'Transport'],
    ['VND-2007', 'Global Goods', 'Grace Hall', '02-777-8888', 'hello@global.com', '404 World Plaza', 'Bangkok', 'TH', 'Net 90', '7778889990001', 'A', 'Active', '2025-01-10', 'Global contract', 'General'],
    ['VND-2008', 'High Tech', 'Harry King', '02-888-9999', 'tech@high.com', '505 Silicon Soi', 'Bangkok', 'TH', 'Net 30', '4445556667778', 'A', 'Active', '2025-12-20', 'Innovative products', 'IT'],
    ['VND-2009', 'Ideal Imports', 'Ivy Lord', '02-999-0000', 'import@ideal.com', '606 Port Way', 'Bangkok', 'TH', 'Net 30', '2223334445556', 'B', 'Active', '2025-11-30', '-', 'Imports'],
    ['VND-2010', 'Just Just', 'Jack Mann', '02-000-1111', 'jack@just.com', '707 Legal Ln', 'Bangkok', 'TH', 'Net 15', '9998887776665', 'B', 'Active', '2025-10-15', '-', 'Legal'],
    ['VND-2011', 'Kwik Kit', 'Kelly North', '02-121-2121', 'sales@kwik.com', '808 Quick St', 'Pathum Thani', 'TH', 'Net 30', '1231231231234', 'C', 'Inactive', '2025-05-10', 'Out of business?', 'Supplies'],
    ['VND-2012', 'Local Logistics', 'Larry Page', '02-232-3232', 'larry@local.com', '909 Local Loop', 'Ayutthaya', 'TH', 'Net 30', '4564564564567', 'B', 'Active', '2025-09-20', '-', 'Logistics'],
    ['VND-2013', 'Mass Media', 'Mary Rose', '02-343-4343', 'ads@mass.com', '1010 Media Twr', 'Bangkok', 'TH', 'Net 30', '7897897897890', 'A', 'Active', '2025-08-01', '-', 'Marketing'],
    ['VND-2014', 'New Net', 'Nick Stone', '02-454-5454', 'admin@newnet.com', '1111 Cyber Cir', 'Bangkok', 'TH', 'Net 30', '3213213213210', 'B', 'Active', '2025-07-15', '-', 'IT Services'],
    ['VND-2015', 'Open Office', 'Olivia T.', '02-565-6565', 'supplies@open.com', '1212 Desk Dr', 'Bangkok', 'TH', 'Net 30', '6546546546543', 'A', 'Active', '2025-06-30', 'Bulk discounts', 'Office Supplies']
];

// Mock PDF Data Regions with Page Support
const PDF_REGIONS = [
    // Page 1
    { id: 'r-inv', label: 'INV-2025-001', value: 'INV-2025-001', x: 450, y: 50, w: 100, h: 20, page: 1 },
    { id: 'r-date', label: '01/03/2025', value: '01/03/2025', x: 450, y: 75, w: 100, h: 20, page: 1 },
    { id: 'r-seller', label: 'Gamma Solutions', value: 'Gamma Solutions', x: 40, y: 50, w: 200, h: 30, page: 1 },
    { id: 'r-addr', label: '123 Tech Park, Silicon Valley', value: '123 Tech Park, Silicon Valley', x: 40, y: 85, w: 250, h: 20, page: 1 },
    { id: 'r-item1', label: 'Widget C Deluxe', value: 'Widget C Deluxe', x: 40, y: 220, w: 200, h: 20, page: 1 },
    { id: 'r-sub', label: '1,000.00', value: '1000', x: 480, y: 500, w: 70, h: 20, page: 1 },
    { id: 'r-tax', label: '70.00', value: '70', x: 480, y: 525, w: 70, h: 20, page: 1 },
    { id: 'r-total', label: '1,070.00', value: '1070', x: 480, y: 555, w: 70, h: 25, page: 1 },
    
    // Page 2
    { id: 'r-note', label: 'Note', value: 'Thank you for your business!', x: 40, y: 120, w: 515, h: 30, page: 2 },
    { id: 'r-auth', label: 'Authorized Signatory', value: 'John Doe (Manager)', x: 40, y: 650, w: 250, h: 40, page: 2 },
];

// Mock Image Regions (Generic for both short and long)
const IMAGE_REGIONS = [
    { id: 'img-store', label: '7-Eleven', value: '7-Eleven', x: 50, y: 40, w: 150, h: 40 },
    { id: 'img-date', label: '22/01/2025', value: '22/01/2025', x: 50, y: 100, w: 120, h: 30 },
    { id: 'img-time', label: '14:30:05', value: '14:30:05', x: 180, y: 100, w: 80, h: 30 },
    { id: 'img-item1', label: 'Water 500ml', value: 'Water 500ml', x: 30, y: 200, w: 200, h: 30 },
    { id: 'img-price1', label: '10.00', value: '10.00', x: 250, y: 200, w: 60, h: 30 },
    { id: 'img-item2', label: 'Sandwich', value: 'Sandwich', x: 30, y: 240, w: 200, h: 30 },
    { id: 'img-price2', label: '35.00', value: '35.00', x: 250, y: 240, w: 60, h: 30 },
    { id: 'img-total', label: '45.00', value: '45.00', x: 230, y: 350, w: 80, h: 40 },
    { id: 'img-tax', label: '3.15', value: '3.15', x: 230, y: 310, w: 80, h: 30 },
];

const XML_CONTENT = `
<docRequest>
  <formId>15</formId>
  <!-- หัวข้อที่ 1 ผู้ขอ -->
  <companyName>ALCAMI MANUFACTURING (THAILAND) CO., LTD.</companyName>
  <companyTaxNo>0105544070023</companyTaxNo>
  <companyFax>0288800011</companyFax>
  <companyEmail>netbay.co.th</companyEmail>
  <destRemark>O/B</destRemark>
  <obCompany>TEST COMPANY</obCompany>
  <obAddress>123/45</obAddress>
  <obPhone>080000000</obPhone>
  <obFax>012345</obFax>
  <emailCh01/>
  <dftOfficeId/>
  <!-- หัวข้อที่ 2 ผู้ซื้อหรือผู้รับประเทศปลายทาง -->
  <receiveCompany>ASIAN HONDA MOTOR CO.,LTD.</receiveCompany>
  <receiveTaxId>0107557000101</receiveTaxId>
  <receiveAddress>14 SARNSIN B. SURASUK R. SILOM BANGRUK</receiveAddress>
  <receiveCity>BANGKOK</receiveCity>
  <destinationCountry>TH</destinationCountry>
  <destinationPhone>00000000000000000</destinationPhone>
  <destinationFax>00000000</destinationFax>
  <destinationEmail>netbay@mail</destinationEmail>
  <receiveDestRemark>C/O</receiveDestRemark>
    <receiveObCompanyName>ASIAN HONDA MOTOR CO.,LTD.</receiveObCompanyName>
    <receiveObAddress>14 SARNSIN B. SURASUK R. SILOM BANGRUK BANGKOK TH</receiveObAddress>
    <receivePhone>021000000</receivePhone>
    <receiveFax>0210000001</receiveFax>
    <receiveEmail>testob.co.th</receiveEmail>
  <!-- หัวข้อที่ 3 เส้นทางการขนส่ง -->
  <departureDate>2025-09-10T00:00:00.000Z</departureDate>
  <docRequestVehicle>
    <vehicleUuid>b7afc2f4-3516-493e-a858-87e4723de6a0</vehicleUuid>
    <orderNo>1</orderNo>
    <shipBy>8</shipBy>
`.trim();

const XML_READONLY_FIELDS = [
    { id: 'dftofficeId', label: 'dftofficeId', value: '2' },
    { id: 'referenceFta', label: 'referenceFta', value: 'HPMW000000021' },
    { id: 'referenceDecl', label: 'referenceDecl', value: 'HQVM720000004' },
];

const TagInput = ({ value, onChange, placeholder }: any) => {
  const [input, setInput] = useState('');
  
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && input.trim()) {
      e.preventDefault();
      const trimmedInput = input.trim();
      if (!value.includes(trimmedInput)) {
        onChange([...value, trimmedInput]);
      }
      setInput('');
    }
  };

  const removeTag = (tagToRemove: string) => {
    onChange(value.filter((tag: string) => tag !== tagToRemove));
  };

  return (
    <div className="flex flex-wrap gap-2 p-2 border border-slate-300 rounded-lg bg-white min-h-[38px] focus-within:ring-2 focus-within:ring-sky-500/20 focus-within:border-sky-500">
      {value.map((tag: string) => (
        <span key={tag} className="bg-slate-100 text-slate-700 px-2 py-0.5 text-xs flex items-center gap-1 rounded border border-slate-200">
          {tag}
          <button onClick={() => removeTag(tag)} className="hover:text-red-600"><X size={12} /></button>
        </span>
      ))}
      <input 
        type="text" 
        value={input}
        onChange={e => setInput(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={value.length === 0 ? placeholder : ''}
        className="flex-1 outline-none text-xs min-w-[120px] bg-transparent"
      />
    </div>
  );
};


interface FieldItem {
  id: string;
  label: string;
  value: string;
  mappedColIndex?: number; // 0-based index of EXCEL_HEADERS
  mappedRegionId?: string; // ID of the mapped PDF/Image region
}

export const ExtractionView: React.FC<ExtractionViewProps> = ({ item, language, onBack, onSave }) => {
  const t = TRANSLATIONS[language];
  const [activeSheet, setActiveSheet] = useState('Sheet1');
  const [activeRow, setActiveRow] = useState<number>(3); // 1-based index for logic, corresponds to EXCEL_DATA[activeRow-1]
  const [activePdfPage, setActivePdfPage] = useState<number>(1);
  const [activeRightTab, setActiveRightTab] = useState<'fields' | 'json'>('fields');
  const TOTAL_PDF_PAGES = 2;
  const [mappingMode, setMappingMode] = useState<string | null>(null); // Holds the field ID currently being mapped
  const [isPanelOpen, setIsPanelOpen] = useState(true);
  
  // New States for Dataset and Workflow
  const [selectedDataset, setSelectedDataset] = useState('E-Declaration');
  const [selectedWorkflow, setSelectedWorkflow] = useState('จัดทำใบขน');
  
  // Metadata Tags State
  const [metadataTags, setMetadataTags] = useState<string[]>([]);
  
  // State for menu
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  
  // State for Add Field Dropdown
  const [isAddDropdownOpen, setIsAddDropdownOpen] = useState(false);
  const addDropdownRef = useRef<HTMLDivElement>(null);
  
  // State for Change Field Dropdown
  const [changingFieldId, setChangingFieldId] = useState<string | null>(null);
  const changeDropdownRef = useRef<HTMLDivElement>(null);

  // Drag and Drop State
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

  const ext = item.fileName.split('.').pop()?.toLowerCase();
  const isExcel = ['xlsx', 'xls'].includes(ext || '');
  const isXml = ext === 'xml';
  const isImage = ['png', 'jpg', 'jpeg'].includes(ext || '');
  const isPdf = !isExcel && !isXml && !isImage;

  // Determine Image Format (Short vs Long) based on filename for demo purposes
  const isLongImage = isImage && (item.fileName.toLowerCase().includes('long') || item.fileName.toLowerCase().includes('receipt'));

  // Get current dataset definitions based on selection
  const currentDatasetDefs = DATASET_DEFINITIONS[selectedDataset] || DATASET_EDECLARATION;

  // State for fields (used for PDF/Excel) - Initial subset of DATASET_DEFS
  const [fields, setFields] = useState<FieldItem[]>([
     { id: 'invDate', label: 'Invoice Date', value: isImage ? '22/01/2025' : '01/03/2025', mappedColIndex: isExcel ? 1 : undefined, mappedRegionId: isPdf ? 'r-date' : (isImage ? 'img-date' : undefined) },
     { id: 'seller', label: 'Seller Name', value: isImage ? '7-Eleven' : 'Gamma Solutions', mappedColIndex: isExcel ? 2 : undefined, mappedRegionId: isPdf ? 'r-seller' : (isImage ? 'img-store' : undefined) },
     { id: 'item', label: 'Item', value: isImage ? 'Water 500ml' : 'Widget C Deluxe', mappedColIndex: isExcel ? 6 : undefined, mappedRegionId: isPdf ? 'r-item1' : (isImage ? 'img-item1' : undefined) },
     { id: 'subtotal', label: 'Subtotal', value: isImage ? '45.00' : '1000', mappedColIndex: isExcel ? 12 : undefined, mappedRegionId: isPdf ? 'r-sub' : (isImage ? 'img-total' : undefined) },
     { id: 'tax', label: 'Tax', value: isImage ? '3.15' : '70', mappedColIndex: isExcel ? 13 : undefined, mappedRegionId: isPdf ? 'r-tax' : (isImage ? 'img-tax' : undefined) },
     { id: 'total', label: 'Grand Total', value: isImage ? '45.00' : '1070', mappedColIndex: isExcel ? 14 : undefined, mappedRegionId: isPdf ? 'r-total' : (isImage ? 'img-total' : undefined) },
  ]);

  // Derived available fields (exclude already used fields)
  // Use currentDatasetDefs instead of static DATASET_DEFS
  const availableFields = currentDatasetDefs.filter(def => !fields.some(f => f.id === def.id));
  
  // Helper to get options when swapping a field (include current field + available ones)
  const getSwapOptions = (currentId: string) => {
      return currentDatasetDefs.filter(def => 
          def.id === currentId || !fields.some(f => f.id === def.id)
      );
  };
  
  // Determine current Excel Data based on Sheet
  const currentExcelData = activeSheet === 'Sheet1' ? SHEET1_DATA : SHEET2_DATA;

  // Determine Save Button Label
  const getSaveButtonLabel = () => {
     if (selectedWorkflow === 'จัดทำใบขน') return t.btnSendToEDecl;
     if (selectedWorkflow === 'จัดทำใบเพิ่มหนี้ ลดหนี้') return t.btnSendToAiBox;
     return t.btnConfirmVerify;
  };

  // Update field values when active row changes (Excel only)
  useEffect(() => {
      if (!isExcel) return;
      const dataIndex = activeRow - 1;
      if (dataIndex >= 0 && dataIndex < currentExcelData.length) {
          const rowData = currentExcelData[dataIndex];
          setFields(prev => prev.map(field => ({
              ...field,
              value: field.mappedColIndex !== undefined ? rowData[field.mappedColIndex] || '' : field.value
          })));
      }
  }, [activeRow, isExcel, activeSheet, currentExcelData]);

  // Close dropdwon on click outside
  useEffect(() => {
      const handleClickOutside = (event: MouseEvent) => {
          if (addDropdownRef.current && !addDropdownRef.current.contains(event.target as Node)) {
              setIsAddDropdownOpen(false);
          }
          if (changeDropdownRef.current && !changeDropdownRef.current.contains(event.target as Node)) {
              setChangingFieldId(null);
          }
          if (openMenuId && !(event.target as Element).closest('.card-menu-btn')) {
              setOpenMenuId(null);
          }
      };
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [openMenuId, changingFieldId]);

  // Drag and Drop Handlers
  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIndex(index);
    // Optional: Set custom drag image or effect
    e.dataTransfer.effectAllowed = 'move';
    // Firefox requires setting data
    e.dataTransfer.setData('text/plain', index.toString());
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault(); // Necessary to allow dropping
    if (draggedIndex === null || draggedIndex === index) return;

    // Real-time reordering
    const newFields = [...fields];
    const draggedItem = newFields[draggedIndex];
    newFields.splice(draggedIndex, 1);
    newFields.splice(index, 0, draggedItem);
    
    setFields(newFields);
    setDraggedIndex(index);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
  };

  const handleColumnClick = (colIndex: number) => {
      if (mappingMode && isExcel) {
          setFields(prev => prev.map(f => {
              if (f.id === mappingMode) {
                  const currentValue = currentExcelData[activeRow - 1][colIndex];
                  return { ...f, mappedColIndex: colIndex, mappedRegionId: undefined, value: currentValue };
              }
              return f;
          }));
          setMappingMode(null);
      }
  };

  const handleRegionClick = (regionId: string, regionValue: string) => {
      if (mappingMode && (isPdf || isImage)) {
          setFields(prev => prev.map(f => {
              if (f.id === mappingMode) {
                  return { ...f, mappedRegionId: regionId, mappedColIndex: undefined, value: regionValue };
              }
              return f;
          }));
          setMappingMode(null);
      }
  };

  const addField = (def: { id: string, label: string }) => {
      setFields(prev => [...prev, { id: def.id, label: def.label, value: '' }]);
      setIsAddDropdownOpen(false);
  };
  
  const swapFieldType = (currentId: string, newDef: { id: string, label: string }) => {
      setFields(prev => prev.map(f => {
          if (f.id === currentId) {
              return { ...f, id: newDef.id, label: newDef.label };
          }
          return f;
      }));
      setChangingFieldId(null);
  };

  const removeField = (id: string) => {
      setFields(prev => prev.filter(f => f.id !== id));
      setOpenMenuId(null);
  };

  const moveField = (index: number, direction: 'up' | 'down') => {
      if (direction === 'up' && index === 0) return;
      if (direction === 'down' && index === fields.length - 1) return;

      const newFields = [...fields];
      const targetIndex = direction === 'up' ? index - 1 : index + 1;
      [newFields[index], newFields[targetIndex]] = [newFields[targetIndex], newFields[index]];
      setFields(newFields);
      setOpenMenuId(null);
  };

  const getColumnBadge = (colIndex: number) => {
      const mappedField = fields.find(f => f.mappedColIndex === colIndex);
      if (mappedField) {
          return (
              <div className="absolute -top-6 left-1/2 -translate-x-1/2 bg-blue-600 text-white text-[10px] px-2 py-0.5 rounded shadow-sm whitespace-nowrap z-30">
                  {mappedField.label}
              </div>
          );
      }
      return null;
  };

  const renderXmlLine = (line: string, index: number) => {
    // Simple mock highlighting
    if (line.trim().startsWith('<!--')) {
        return <div key={index} className="text-slate-400 italic font-mono pl-4">{line}</div>;
    }
    // Tag highlighting regex approach (simplified)
    const parts = line.split(/(<[^>]+>)/g).filter(Boolean);
    return (
        <div key={index} className="font-mono pl-4 whitespace-pre text-slate-800">
            {parts.map((part, i) => {
                if (part.startsWith('<')) return <span key={i} className="text-blue-600">{part}</span>;
                return <span key={i}>{part}</span>;
            })}
        </div>
    );
  };

  return (
    <div className="flex flex-col h-full bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
      
      {/* Top Header */}
      <div className="flex justify-between items-center px-6 py-4 border-b border-slate-200">
        <h1 className="text-xl font-bold text-slate-800">{t.verifyTitle}</h1>
        <div className="flex gap-2">
          <button 
            onClick={onBack}
            className="flex items-center gap-2 px-4 py-2 border border-slate-300 rounded-[4px] text-slate-600 text-sm font-medium hover:bg-slate-50 transition-colors"
          >
            <ArrowLeft size={16} />
            {t.btnBack}
          </button>
          <button 
            onClick={onSave}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-300 rounded-[4px] text-slate-700 text-sm font-medium hover:bg-slate-50 transition-colors shadow-sm"
          >
             <Save size={16} />
             {t.btnSaveDraft}
          </button>
        </div>
      </div>

      {/* Info Bar */}
      <div className="bg-slate-50 px-6 py-3 border-b border-slate-200 text-xs text-slate-600">
         <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
            <div>
               <span className="block text-slate-400 mb-0.5">{t.lblFileName}</span>
               <span className="font-medium text-slate-800">{item.fileName}</span>
            </div>
            <div>
               <span className="block text-slate-400 mb-0.5">{t.lblDocType}</span>
               <span className="font-medium text-slate-800">{item.docType}</span>
            </div>
            <div>
               <span className="block text-slate-400 mb-0.5">{t.lblExtension}</span>
               <span className="font-medium text-slate-800 uppercase">{item.fileName.split('.').pop()}</span>
            </div>
            <div>
               <span className="block text-slate-400 mb-0.5">{t.lblTemplate}</span>
               <span className="font-medium text-slate-800">General</span>
             <div className="relative">
                    <select 
                       value={selectedDataset}
                       onChange={(e) => setSelectedDataset(e.target.value)}
                       className="w-full font-medium text-slate-800 bg-transparent border-b border-slate-300 pb-0.5 focus:outline-none focus:border-blue-500 pr-4 truncate"
                    >
                       {Object.keys(DATASET_DEFINITIONS).map(ds => <option key={ds} value={ds}>{ds}</option>)}
                    </select>
                    <ChevronDown size={12} className="absolute right-0 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                </div>
            </div>
            
            {/* Workflow Dropdown */}
            <div>
               <span className="block text-slate-400 mb-0.5">{t.lblWorkflow}</span>
               <div className="relative">
                   <select 
                      value={selectedWorkflow}
                      onChange={(e) => setSelectedWorkflow(e.target.value)}
                      className="w-full font-medium text-slate-800 bg-transparent border-b border-slate-300 pb-0.5 focus:outline-none focus:border-blue-500 pr-4 truncate"
                   >
                      {WORKFLOW_OPTIONS.map(wf => <option key={wf} value={wf}>{wf}</option>)}
                   </select>
                   <ChevronDown size={12} className="absolute right-0 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
               </div>
            </div>
        </div>
      </div>
      
      {/* Main Split View */}
      <div className="flex flex-1 overflow-hidden relative">
        
        {/* Left Pane: PDF/Doc Viewer */}
        <div className="w-1/2 bg-slate-100 border-r border-slate-200 overflow-hidden relative p-4">
             <div className="bg-white shadow-lg h-full overflow-auto flex flex-col justify-start items-center">
                 {isPdf ? (
                    <Document file="/sample.pdf" className="flex flex-col items-center">
                         <Page pageNumber={activePdfPage} />
                    </Document>
                 ) : (
                      <div className="p-4 text-center text-slate-500">Document preview (Excel/Image/Xml) logic here</div>
                 )}
             </div>
        </div>
        
        {/* Right Pane: Editor Panel */}
        <div className="w-1/2 flex flex-col overflow-hidden bg-white">
            {/* Toolbar/Tabs for Editor Panel */}
            <div className="border-b border-slate-200 flex">
                <button 
                  onClick={() => setActiveRightTab('fields')}
                  className={`flex-1 px-4 py-3 text-sm font-bold border-b-2 transition-colors ${activeRightTab === 'fields' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500'}`}
                >
                  Fields
                </button>
                <button 
                  onClick={() => setActiveRightTab('json')}
                  className={`flex-1 px-4 py-3 text-sm font-bold border-b-2 transition-colors ${activeRightTab === 'json' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500'}`}
                >
                  JSON
                </button>
            </div>
            
            {/* Editor Content Area */}
            <div className="flex-1 overflow-y-auto p-6">
                {activeRightTab === 'fields' && (
                    <div className="space-y-4">
                        {/* Editor Forms Here */}
                        <div className="text-sm text-slate-500 italic">Field editor form goes here...</div>
                    </div>
                )}
                {activeRightTab === 'json' && (
                     <pre className="bg-slate-900 text-slate-300 p-4 rounded-lg text-xs font-mono overflow-x-auto">
                        {JSON.stringify(fields, null, 2)}
                     </pre>
                )}
            </div>
        </div>

        {/* Right Pane: Extraction Form */}
        <div className={`
             bg-slate-50 flex flex-col border-l border-slate-200 shadow-xl z-20 transition-all duration-300 ease-in-out relative
             ${isPanelOpen ? 'w-[400px]' : 'w-12 bg-white'}
        `}>
           
           {/* Toggle Button */}
           <div className="absolute -left-3 top-6 z-30">
                <button 
                    onClick={() => setIsPanelOpen(!isPanelOpen)}
                    className="bg-white border border-slate-200 rounded-[4px] p-1 shadow-md hover:bg-slate-50 text-slate-500 transition-transform active:scale-95"
                    title={isPanelOpen ? t.tooltipHidePanel : t.tooltipShowPanel}
                >
                    {isPanelOpen ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
                </button>
           </div>

           {/* Collapsed State Vertical Text */}
           {!isPanelOpen && (
                <div 
                    className="flex-1 flex items-center justify-center cursor-pointer hover:bg-slate-50 transition-colors" 
                    onClick={() => setIsPanelOpen(true)}
                    title={t.tooltipShowPanel}
                >
                    <div className="rotate-180" style={{ writingMode: 'vertical-rl' }}>
                         <span className="font-bold text-slate-500 tracking-wider text-xs flex items-center gap-3 py-6 whitespace-nowrap">
                            <FileText size={16} /> {t.headerExtractedData}
                         </span>
                    </div>
                </div>
           )}

           <div className={`flex-1 flex flex-col overflow-hidden ${!isPanelOpen ? 'opacity-0 invisible hidden' : 'opacity-100 visible'} transition-all duration-200`}>
                <div className="flex-1 overflow-y-auto">
                    <div className="p-6">
                        
                         {/* TABS */}
                         <div className="flex border-b border-slate-200 mb-6">
                            <button 
                                onClick={() => setActiveRightTab('fields')}
                                className={`px-4 py-2 text-sm font-bold border-b-2 transition-colors ${activeRightTab === 'fields' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
                            >
                                {t.headerExtractedData}
                            </button>
                            <button 
                                onClick={() => setActiveRightTab('json')}
                                className={`px-4 py-2 text-sm font-bold border-b-2 transition-colors ${activeRightTab === 'json' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
                            >
                                JSON
                            </button>
                         </div>

                        {activeRightTab === 'fields' && !isXml && (
                            <div className="mb-6">
                                <p className="text-xs text-slate-500 mt-1">
                                    {isExcel 
                                      ? <span>{t.reviewingDataRow} <span className="font-bold text-slate-800">{activeRow}</span></span>
                                      : <span>{t.reviewingDataPage} <span className="font-bold text-slate-800">{activePdfPage}</span></span>
                                    }
                                </p>
                            </div>
                        )}
                        
                        {activeRightTab === 'json' && (
                             <div className="relative">
                                <button 
                                    onClick={() => {
                                        navigator.clipboard.writeText(JSON.stringify(fields, null, 2));
                                    }}
                                    className="absolute top-2 right-2 p-1.5 bg-white border border-slate-200 rounded-[4px] text-slate-500 hover:text-blue-600"
                                >
                                    <Copy size={16} />
                                </button>
                                <pre className="bg-slate-900 text-slate-300 p-4 rounded-lg text-xs font-mono overflow-x-auto">
                                    {JSON.stringify(fields, null, 2)}
                                </pre>
                             </div>
                        )}

                        {activeRightTab === 'fields' && isXml && (
                            <div className="mb-6">
                                <h2 className="font-bold text-slate-800 mb-3 text-sm">{t.headerXmlMetadata}</h2>
                                <div className="border border-slate-300 rounded-lg overflow-hidden">
                                     {XML_READONLY_FIELDS.map((field, index) => (
                                         <div key={field.id} className={`flex items-center text-sm ${index !== XML_READONLY_FIELDS.length -1 ? 'border-b border-slate-200' : ''}`}>
                                             <div className="w-1/3 bg-slate-100 p-3 text-slate-600 font-medium text-xs truncate" title={field.label}>
                                                 {field.label}:
                                             </div>
                                             <div className="w-2/3 p-3 bg-slate-200/50 text-slate-800 font-mono text-xs">
                                                 {field.value}
                                             </div>
                                         </div>
                                     ))}
                                 </div>
                            </div>
                        )}
                        
                        {activeRightTab === 'fields' && !isXml && (
                            <div className="space-y-4">
                                {fields.map((field, index) => {
                                    const isMapping = mappingMode === field.id;
                                    const isDragging = draggedIndex === index;
                                    const isChanging = changingFieldId === field.id;
                                    
                                    // Determine Source Label
                                    let sourceLabel = 'Not Mapped';
                                    let isMapped = false;

                                    if (isExcel && field.mappedColIndex !== undefined) {
                                        isMapped = true;
                                        const colName = EXCEL_HEADERS[field.mappedColIndex];
                                        const headerName = currentExcelData[0][field.mappedColIndex];
                                        sourceLabel = `${t.lblCol} ${colName} (${headerName})`;
                                    } else if (!isExcel && field.mappedRegionId) {
                                        isMapped = true;
                                        sourceLabel = isImage ? 'Image Region' : 'PDF Region';
                                    }
                                    
                                    const swapOptions = getSwapOptions(field.id);

                                    return (
                                        <div 
                                            key={field.id} 
                                            draggable
                                            onDragStart={(e) => handleDragStart(e, index)}
                                            onDragOver={(e) => handleDragOver(e, index)}
                                            onDragEnd={handleDragEnd}
                                            className={`
                                                bg-white border rounded-lg p-3 transition-all duration-200 relative group
                                                ${isDragging ? 'opacity-50 ring-2 ring-blue-400 bg-blue-50' : 'opacity-100'}
                                                ${isMapping ? 'border-blue-500 ring-4 ring-blue-500/10 shadow-md' : 'border-slate-200 hover:border-slate-300'}
                                            `}
                                        >
                                            <div className="flex items-start gap-2">
                                                {/* Drag Handle */}
                                                <div className="mt-1 text-slate-300 hover:text-slate-500 cursor-grab active:cursor-grabbing p-0.5 -ml-1">
                                                    <GripVertical size={16} />
                                                </div>

                                                <div className="flex-1">
                                                    <div className="flex justify-between items-start mb-2 relative">
                                                        
                                                        <div className="relative">
                                                             <button 
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    setChangingFieldId(isChanging ? null : field.id);
                                                                    setOpenMenuId(null);
                                                                }}
                                                                className="flex items-center gap-1 text-xs font-bold text-slate-500 uppercase tracking-wider hover:text-blue-600 hover:bg-blue-50 px-1.5 py-0.5 rounded-[4px] transition-colors group/label"
                                                             >
                                                                 {field.label}
                                                                 <ChevronDown size={12} className="opacity-0 group-hover/label:opacity-100 transition-opacity" />
                                                             </button>
                                                             
                                                             {isChanging && (
                                                                <div 
                                                                    ref={changeDropdownRef}
                                                                    className="absolute left-0 top-full mt-1 w-60 bg-white rounded-lg shadow-xl border border-slate-200 max-h-60 overflow-y-auto z-50 animate-in fade-in zoom-in-95 duration-100"
                                                                >
                                                                    <div className="px-3 py-2 text-[10px] font-bold text-slate-400 uppercase tracking-wider sticky top-0 bg-white border-b border-slate-50">
                                                                        Switch Field To...
                                                                    </div>
                                                                    {swapOptions.map(def => (
                                                                        <button 
                                                                            key={def.id}
                                                                            onClick={() => swapFieldType(field.id, def)}
                                                                            className={`w-full text-left px-3 py-2 text-xs hover:bg-slate-50 transition-colors flex items-center justify-between
                                                                                ${def.id === field.id ? 'bg-blue-50 text-blue-700 font-bold' : 'text-slate-700'}
                                                                            `}
                                                                        >
                                                                            {def.label}
                                                                            {def.id === field.id && <Check size={12} />}
                                                                        </button>
                                                                    ))}
                                                                </div>
                                                             )}
                                                        </div>
                                                        
                                                        <div className="flex items-center gap-2">
                                                            <button 
                                                                onClick={() => setMappingMode(isMapping ? null : field.id)}
                                                                className={`
                                                                    flex items-center gap-1.5 text-[10px] px-2 py-1 rounded-[4px] font-medium transition-colors border
                                                                    ${isMapping 
                                                                        ? 'bg-blue-600 text-white border-blue-600' 
                                                                        : isMapped
                                                                            ? 'bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200'
                                                                            : 'bg-slate-100 text-slate-400 border-slate-200 hover:text-slate-600'
                                                                    }
                                                                `}
                                                            >
                                                                {isMapping ? (
                                                                    <>{t.msgClickColumn} <MousePointerClick size={10} /></>
                                                                ) : (
                                                                    <>
                                                                        <LinkIcon size={10} /> 
                                                                        {isMapped ? `${t.lblCol} ${sourceLabel.replace(`${t.lblCol} `, '')}` : t.btnMapColumn}
                                                                    </>
                                                                )}
                                                            </button>
                                                            
                                                            {/* Card Menu */}
                                                            <div className="relative">
                                                                <button 
                                                                    onClick={(e) => { e.stopPropagation(); setOpenMenuId(openMenuId === field.id ? null : field.id); }}
                                                                    className="p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-[4px] card-menu-btn"
                                                                >
                                                                    <MoreVertical size={14} />
                                                                </button>
                                                                
                                                                {openMenuId === field.id && (
                                                                    <div className="absolute right-0 top-full mt-1 w-40 bg-white rounded-lg shadow-lg border border-slate-100 z-50 py-1 animate-in fade-in zoom-in-95 duration-100">
                                                                        <button 
                                                                            onClick={() => {
                                                                                setMappingMode(field.id);
                                                                                setOpenMenuId(null);
                                                                            }}
                                                                            className="w-full text-left px-3 py-2 text-xs text-slate-600 hover:bg-slate-50 flex items-center gap-2"
                                                                        >
                                                                            <LinkIcon size={14} className="text-slate-400" />
                                                                            {t.btnMapColumn}
                                                                        </button>
                                                                        
                                                                        <button 
                                                                            onClick={() => moveField(index, 'up')}
                                                                            disabled={index === 0}
                                                                            className="w-full text-left px-3 py-2 text-xs text-slate-600 hover:bg-slate-50 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                                                                        >
                                                                            <ArrowUp size={14} className="text-slate-400" />
                                                                            {t.btnMoveUp}
                                                                        </button>

                                                                        <button 
                                                                            onClick={() => moveField(index, 'down')}
                                                                            disabled={index === fields.length - 1}
                                                                            className="w-full text-left px-3 py-2 text-xs text-slate-600 hover:bg-slate-50 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                                                                        >
                                                                            <ArrowDown size={14} className="text-slate-400" />
                                                                            {t.btnMoveDown}
                                                                        </button>

                                                                        <div className="border-t border-slate-100 my-1"></div>

                                                                        <button 
                                                                            onClick={() => removeField(field.id)}
                                                                            className="w-full text-left px-3 py-2 text-xs text-red-600 hover:bg-red-50 flex items-center gap-2"
                                                                        >
                                                                            <Trash2 size={14} />
                                                                            {t.btnRemove}
                                                                        </button>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                    
                                                    <div className="flex gap-2">
                                                        <input 
                                                            type="text" 
                                                            value={field.value}
                                                            onChange={(e) => {
                                                                const newVal = e.target.value;
                                                                setFields(prev => prev.map(f => f.id === field.id ? { ...f, value: newVal } : f));
                                                            }}
                                                            className="w-full text-sm font-medium text-slate-900 border-b border-slate-200 pb-1 focus:outline-none focus:border-blue-500 bg-transparent"
                                                        />
                                                    </div>
                                                    
                                                    {isMapped && (
                                                        <div className="mt-1.5 flex items-center gap-1 text-[10px] text-slate-400">
                                                            <div className="w-1.5 h-1.5 rounded-full bg-green-500"></div>
                                                            {t.sourcePrefix} <span className="font-mono text-slate-600">{sourceLabel}</span>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                                
                                {/* Add Field Button */}
                                <div className="mt-4 relative" ref={addDropdownRef}>
                                    <button 
                                        onClick={() => availableFields.length > 0 && setIsAddDropdownOpen(!isAddDropdownOpen)}
                                        disabled={availableFields.length === 0}
                                        className={`w-full py-2 border-2 border-dashed rounded-[4px] font-bold text-xs flex items-center justify-center gap-2 transition-colors ${availableFields.length === 0 ? 'border-slate-200 text-slate-400 cursor-not-allowed bg-slate-50' : 'border-slate-300 text-slate-500 hover:border-blue-400 hover:text-blue-600 hover:bg-blue-50'}`}
                                    >
                                        <Plus size={14} />
                                        {availableFields.length === 0 ? t.noMoreFields : t.btnAddField}
                                    </button>
                                    
                                    {isAddDropdownOpen && availableFields.length > 0 && (
                                        <div className="absolute left-0 bottom-full mb-2 w-full bg-white rounded-lg shadow-xl border border-slate-200 max-h-60 overflow-y-auto z-50 animate-in fade-in slide-in-from-bottom-2 duration-200">
                                            <div className="px-3 py-2 text-[10px] font-bold text-slate-400 uppercase tracking-wider sticky top-0 bg-white border-b border-slate-50">
                                                {t.lblSelectField}
                                            </div>
                                            {availableFields.map(def => (
                                                <button 
                                                    key={def.id}
                                                    onClick={() => addField(def)}
                                                    className="w-full text-left px-3 py-2 text-xs text-slate-700 hover:bg-blue-50 hover:text-blue-700 transition-colors flex items-center gap-2"
                                                >
                                                    <Plus size={12} className="text-slate-400" />
                                                    {def.label}
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Custom Metadata for Excel/PDF/XML (at bottom) */}
                        <div className="mt-8 pt-6 border-t border-slate-200">
                            <h2 className="font-bold text-slate-800 mb-3 text-sm">{t.headerCustomMetadata}</h2>
                            <TagInput 
                                value={metadataTags}
                                onChange={setMetadataTags}
                                placeholder={t.phMetadataInput}
                            />
                            <div className="text-[10px] text-slate-400 mt-2 flex items-center gap-1">
                                <FileText size={10} />
                                {t.phMetadataInput}
                            </div>
                        </div>
                    </div>
                </div>
           
               <div className="p-4 bg-white border-t border-slate-200 shrink-0">
                   <button 
                      onClick={onSave}
                      className="w-full bg-[#1f5df9] hover:bg-blue-700 text-white font-bold py-3 rounded-[4px] shadow-sm transition-all active:scale-[0.98] flex justify-center items-center gap-2"
                   >
                      <Check size={18} />
                      {getSaveButtonLabel()}
                   </button>
               </div>
           </div>
        </div>

      </div>
    </div>
  );
};