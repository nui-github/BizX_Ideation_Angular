import React, { useState, useRef } from 'react';
import { Modal, Input, Button, Tag, message, Tooltip, Empty, Drawer } from 'antd';
import { 
  Database, ArrowLeft, Plus, Search, Edit3, Trash2, HelpCircle, 
  Tag as TagIcon, Calendar, CheckCircle, ChevronRight, Hash, ShieldAlert,
  LayoutGrid, List, Upload, Download, FileSpreadsheet, Check, X
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import * as XLSX from 'xlsx';
import { Language } from '../types';

interface MasterRecord {
  id: string;
  keys: string[];
  value: string;
}

interface MasterTable {
  id: string;
  nameTH: string;
  nameEN: string;
  updatedAt: string;
  records: MasterRecord[];
}

interface MasterDataSettingsProps {
  language: Language;
  onBack: () => void;
}

// Initial Mock Master Tables matching DocTypeMaster.tsx lookup sources
const INITIAL_MASTER_TABLES: MasterTable[] = [
  {
    id: 'vendor',
    nameTH: 'ผู้ให้บริการขนส่ง (Vendors)',
    nameEN: 'Logistics Vendors (Vendors)',
    updatedAt: '2026-06-05T10:00:00Z',
    records: [
      { id: 'v1', keys: ['ไทยโลจิ', 'Thai Logi', 'TL'], value: 'บริษัท ไทยโลจิสติกส์ จำกัด' },
      { id: 'v2', keys: ['LEO', 'Leo Global', 'LGL'], value: 'บริษัท ลีโอ โกลบอล โลจิสติกส์ จำกัด (มหาชน)' },
      { id: 'v3', keys: ['หมิงไหล', 'Ming Lai', 'ML'], value: 'บริษัท หมิงไหล ทรานสปอร์ต จำกัด' },
      { id: 'v4', keys: ['MSC', 'Mediterranean Shipping', 'MSCTH'], value: 'Mediterranean Shipping Company (Thailand) Co., Ltd.' }
    ]
  },
  {
    id: 'customer',
    nameTH: 'รายชื่อลูกค้า (Customers)',
    nameEN: 'Customers List (Customers)',
    updatedAt: '2026-06-04T15:24:00Z',
    records: [
      { id: 'c1', keys: ['สยามอินดัสทรี', 'Siam Ind', 'SI'], value: 'บริษัท สยามอินดัสเทรียล จำกัด' },
      { id: 'c2', keys: ['ออโต้พาร์ทไทย', 'AP TH', 'APT'], value: 'บริษัท ไทยออโตโมทีฟพาร์ท จำกัด' },
      { id: 'c3', keys: ['มาดีกรุ๊ป', 'MARDI', 'Mardi Group'], value: 'บริษัท มาดี อินเตอร์เนชั่นแนล กรุ๊ป จำกัด' }
    ]
  },
  {
    id: 'product',
    nameTH: 'รหัสสินค้า (Products)',
    nameEN: 'Product Master (Products)',
    updatedAt: '2026-06-05T08:12:00Z',
    records: [
      { id: 'p1', keys: ['ELEC-001', 'ชิปประมวลผล', 'CPU-V1'], value: 'Microchip Processor Alpha v1.2' },
      { id: 'p2', keys: ['CAB-COP-05', 'สายทองแดง', 'Copper Cable 5m'], value: 'Flexible Copper Wire Shielded 5 Meters' },
      { id: 'p3', keys: ['AUTO-P-12', 'หัวเทียน', 'Spark Plug JP'], value: 'Spark Plug Automotive Type-A' }
    ]
  },
  {
    id: 'employee',
    nameTH: 'รายชื่อพนักงาน (Employees)',
    nameEN: 'Employees List (Employees)',
    updatedAt: '2026-06-01T09:00:00Z',
    records: [
      { id: 'e1', keys: ['คุณาวุฒิ', 'Kunawut', 'K-W'], value: 'คุณาวุฒิ วชิรปัญญาวุฒิ (Import Logistics)' },
      { id: 'e2', keys: ['ศรัณย์', 'Saran', 'S-R'], value: 'ศรัณย์ สร้อยวิเศษ (Customs Compliance)' }
    ]
  },
  {
    id: 'cost_center',
    nameTH: 'ศูนย์ต้นทุน (Cost Centers)',
    nameEN: 'Cost Centers (Cost Centers)',
    updatedAt: '2026-05-28T11:45:00Z',
    records: [
      { id: 'cc1', keys: ['CC-LOG', 'โลจิสติกส์', 'LOGISTICS_DEPT'], value: 'แผนกขนส่งและพิธีการศุลกากรนำเข้า' },
      { id: 'cc2', keys: ['CC-FIN', 'ฝ่ายการเงิน', 'FINANCE_DEPT'], value: 'ฝ่ายบัญชีและการเงินสากล' }
    ]
  }
];

export const MasterDataSettings: React.FC<MasterDataSettingsProps> = ({ language, onBack }) => {
  const [masterTables, setMasterTables] = useState<MasterTable[]>(INITIAL_MASTER_TABLES);
  const [selectedTableId, setSelectedTableId] = useState<string | null>(null);
  const [searchTableQuery, setSearchTableQuery] = useState('');
  const [searchRecordQuery, setSearchRecordQuery] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  // Form Modal States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<MasterRecord | null>(null);
  const [formKeys, setFormKeys] = useState<string[]>([]);
  const [keyInput, setKeyInput] = useState('');
  const [formValue, setFormValue] = useState('');

  // Confirmation Modal for Deletion
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [recordToDelete, setRecordToDelete] = useState<MasterRecord | null>(null);

  // Add Table Modal States
  const [isAddTableModalOpen, setIsAddTableModalOpen] = useState(false);
  const [newTableId, setNewTableId] = useState('');
  const [newTableName, setNewTableName] = useState('');
  
  // First record states for the new table
  const [firstRecordKeys, setFirstRecordKeys] = useState<string[]>([]);
  const [firstRecordKeyInput, setFirstRecordKeyInput] = useState('');
  const [firstRecordValue, setFirstRecordValue] = useState('');

  // Edit Table Modal States
  const [isEditTableModalOpen, setIsEditTableModalOpen] = useState(false);
  const [editTableId, setEditTableId] = useState('');
  const [editTableNameTH, setEditTableNameTH] = useState('');
  const [editTableNameEN, setEditTableNameEN] = useState('');

  // Excel Import States
  const [isImportDrawerOpen, setIsImportDrawerOpen] = useState(false);
  const [parsedRecords, setParsedRecords] = useState<Array<{ id: string; value: string; keys: string[] }>>([]);
  const [duplicateWarningCount, setDuplicateWarningCount] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const formatDateTime = (isoString: string) => {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return '-';
    // Format to local date-time with Current Year (2026) Support
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    return `${day}/${month}/${year} ${hours}:${minutes}`;
  };

  const activeTable = masterTables.find(t => t.id === selectedTableId);

  // Helper translations inside the component to keep translation files self-contained
  const t = {
    title: language === 'TH' ? 'ตั้งค่า Master Data' : 'Master Data Settings',
    subtitle: language === 'TH' ? 'จัดการข้อมูลหลักระดับระบบ (Lookup Table) สำหรับระบบตรวจสอบและจัดคู่ข้อมูล' : 'Manage system-level lookup tables for document verification & comparison processes',
    tableNameCol: language === 'TH' ? 'ชื่อตารางข้อมูลหลัก' : 'Master Table Name',
    recordCountCol: language === 'TH' ? 'จำนวนรายการ (Records)' : 'Record Count',
    updatedAtCol: language === 'TH' ? 'ปรับปรุงล่าสุดเมื่อ' : 'Updated At',
    searchTablePlaceholder: language === 'TH' ? 'พิมพ์ค้นหาชื่อตาราง Master Data...' : 'Search master tables by name...',
    searchRecordPlaceholder: language === 'TH' ? 'พิมพ์สืบค้นจากคีย์เวิร์ด หรือชื่อเป้าหมาย...' : 'Search records by keys or full name...',
    backBtn: language === 'TH' ? 'ย้อนกลับ' : 'Back',
    backToTablesBtn: language === 'TH' ? 'กลับไปยังหน้ารวมตาราง' : 'Back to Tables list',
    addRecordBtn: language === 'TH' ? 'เพิ่มรายการ' : 'Add Record',
    editRecordBtn: language === 'TH' ? 'แก้ไขรายการ' : 'Edit',
    deleteRecordBtn: language === 'TH' ? 'ลบรายการ' : 'Delete',
    keysLabel: language === 'TH' ? 'คีย์สำหรับจับคู่ (Matching Keys)' : 'Matching Keys',
    keysHint: language === 'TH' ? 'กดปุ่ม Enter หรือเครื่องหมายจุลภาค (,) เพื่อเพิ่มคีย์เวิร์ดสำหรับระบุเอกสาร (ควรใส่ชื่อย่อ, อักษรย่อ, คำที่มักสะกดผิด หรือชื่อเรียกย่อระดับเอกสาร)' : 'Press Enter or comma (,) to add matching keywords (e.g. short names, variations, mistakes, abbreviations)',
    valueLabel: language === 'TH' ? 'ชื่อหลักในระบบ (Full System Value / Target)' : 'Full System Value',
    valuePlaceholder: language === 'TH' ? 'เช่น บริษัท ไทยโลจิสติกส์ จำกัด' : 'e.g. Thai Logistics Co., Ltd.',
    modalTitleAdd: language === 'TH' ? 'เพิ่มรายการใหม่' : 'Add New Record',
    modalTitleEdit: language === 'TH' ? 'แก้ไขรายการข้อมูลหลัก' : 'Edit Master Record',
    cancel: language === 'TH' ? 'ยกเลิก' : 'Cancel',
    save: language === 'TH' ? 'บันทึกข้อมูล' : 'Save Record',
    deleteModalTitle: language === 'TH' ? 'ยืนยันการลบรายการ' : 'Confirm Deletion',
    deleteModalDesc: (val: string) => language === 'TH' 
      ? `คุณแน่ใจหรือไม่ที่จะลบเสร็จสิ้นรายการ "${val}"? การกระทำนี้จะไม่สามารถเรียกคืนข้อมูลภายหลังได้` 
      : `Are you sure you want to delete "${val}"? This action cannot be undone.`,
    errorNoKeys: language === 'TH' ? 'กรุณาระบุคีย์เวิร์ดสำหรับจับใช้อย่างน้อย 1 คีย์' : 'Please enter at least one key.',
    errorEmptyVal: language === 'TH' ? 'กรุณาระบุชื่อเต็มที่แสดงผลในระบบหลัก' : 'Please enter a system value.',
    errorDuplicateKey: (key: string, originalVal: string) => language === 'TH'
      ? `คีย์เวิร์ด "${key}" มีซ้ำอยู่แล้วในรายการ "${originalVal}"`
      : `Key "${key}" already exists in record "${originalVal}".`,
    successAdd: language === 'TH' ? 'เพิ่มรายการใหม่เข้าสู่ระบบเรียบร้อยแล้ว' : 'Successfully added new record.',
    successEdit: language === 'TH' ? 'ปรับปรุงข้อมูลหลักเรียบร้อยแล้ว' : 'Successfully updated master record.',
    successDelete: language === 'TH' ? 'ลบรายการสำเร็จเรียบร้อยแล้ว' : 'Successfully deleted record.',
    
    // Custom Table generation translations
    addTableBtn: language === 'TH' ? 'เพิ่มตารางข้อมูลหลัก' : 'Add Master Table',
    addTableModalTitle: language === 'TH' ? 'สร้างตาราง Master Data ใหม่' : 'Create New Master Table',
    tableIdLabel: language === 'TH' ? 'รหัสตารางภาษาอังกฤษ (Table Code/ID)' : 'English Table ID / Code',
    tableIdPlaceholder: language === 'TH' ? 'เช่น branch, shipping_line (พิมพ์ภาษาอังกฤษ ตัวเลข หรือขีดล่าง)' : 'e.g. branch, shipping_line',
    tableNameLabel: language === 'TH' ? 'ชื่อตาราง' : 'Table Name',
    tableNamePlaceholder: language === 'TH' ? 'เช่น รายชื่อคลังสินค้า (Warehouse List)' : 'e.g. Warehouse List',
    firstRecordHeader: language === 'TH' ? 'ข้อมูลรายการแรกของตาราง (First Record - Required)' : 'First Table Record (Required)',
    firstKeysLabel: language === 'TH' ? 'คีย์เวิร์ดสำหรับจัดคู่รายการแรก' : 'First Record Matching Keys',
    firstKeysPlaceholder: language === 'TH' ? 'เช่น WH-Main, คลังหลัก (กดปุ่ม Enter หรือจุลภาคเพื่อยืนยันคำ)' : 'e.g. WH-Main, Main Warehouse (press Enter or comma to add)',
    firstValueLabel: language === 'TH' ? 'ค่าชื่อหลักระบบของรายการแรก' : 'First Record Full System Value',
    firstValuePlaceholder: language === 'TH' ? 'เช่น คลังสินค้าสำนักงานใหญ่คลองเตย' : 'e.g. Klongtoey Headquarter Warehouse',
    errorEmptyTableId: language === 'TH' ? 'กรุณาระบุรหัสตารางอ้างอิงภาษาอังกฤษ' : 'Please specify a Table ID.',
    errorInvalidTableId: language === 'TH' ? 'รหัสตารางต้องเป็นภาษาอังกฤษพิมพ์เล็ก ตัวเลข หรือขีดล่างเท่านั้น' : 'Table ID must only contains check lowercase letters, numbers, and underscores.',
    errorDuplicateTableId: language === 'TH' ? 'รหัสตารางนี้มีอยู่ในระบบแล้ว' : 'This Table ID already exists.',
    errorEmptyTableName: language === 'TH' ? 'กรุณาระบุชื่อตารางข้อมูลหลัก' : 'Please specify a table name.',
    errorNoFirstRecordKeys: language === 'TH' ? 'กรุณาระบุคีย์เวิร์ดอย่างน้อย 1 รายการสำหรับข้อมูลรายการแรก' : 'Please enter at least one key for the first record.',
    errorEmptyFirstRecordValue: language === 'TH' ? 'กรุณาระบุค่าระบุระบบหลักสำหรับข้อมูลรายการแรก' : 'Please enter a system value for the first record.',
    successAddTable: language === 'TH' ? 'สร้างตารางข้อมูล Master Data ใหม่และรายการแรกเรียบร้อยแล้ว' : 'Successfully created new Master Table and first record.'
  };

  const handleOpenAddRecord = () => {
    setEditingRecord(null);
    setFormKeys([]);
    setKeyInput('');
    setFormValue('');
    setIsModalOpen(true);
  };

  const handleOpenEditRecord = (record: MasterRecord) => {
    setEditingRecord(record);
    setFormKeys([...record.keys]);
    setKeyInput('');
    setFormValue(record.value);
    setIsModalOpen(true);
  };

  const handleAddKeyTag = () => {
    const trimmed = keyInput.trim();
    if (!trimmed) return;

    // Split by comma in case they pasted standard CSV format
    const parts = trimmed.split(',').map(p => p.trim()).filter(Boolean);
    const newKeys = [...formKeys];

    parts.forEach(part => {
      if (!newKeys.includes(part)) {
        newKeys.push(part);
      }
    });

    setFormKeys(newKeys);
    setKeyInput('');
  };

  const handleKeyDownInput = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      handleAddKeyTag();
    }
  };

  const handleRemoveKeyTag = (tagToRemove: string) => {
    setFormKeys(formKeys.filter(tag => tag !== tagToRemove));
  };

  const handleSaveRecord = () => {
    if (!selectedTableId || !activeTable) return;

    // Trim any last minute typed text in keys input box
    let finalKeys = [...formKeys];
    const trimmedInput = keyInput.trim();
    if (trimmedInput) {
      const parts = trimmedInput.split(',').map(p => p.trim()).filter(Boolean);
      parts.forEach(part => {
        if (!finalKeys.includes(part)) {
          finalKeys.push(part);
        }
      });
    }

    // Validations
    if (finalKeys.length === 0) {
      message.error(t.errorNoKeys);
      return;
    }

    const trimmedValue = formValue.trim();
    if (!trimmedValue) {
      message.error(t.errorEmptyVal);
      return;
    }

    // Verify duplicate keys (case-insensitive check inside same table)
    for (let k of finalKeys) {
      const duplicateRecord = activeTable.records.find(rec => {
        // Skip comparing against itself when editing
        if (editingRecord && rec.id === editingRecord.id) return false;
        return rec.keys.some(key => key.toLowerCase() === k.toLowerCase());
      });

      if (duplicateRecord) {
        message.error(t.errorDuplicateKey(k, duplicateRecord.value));
        return;
      }
    }

    // Update state
    setMasterTables(prev => prev.map(tbl => {
      if (tbl.id !== selectedTableId) return tbl;

      let updatedRecordsList = [...tbl.records];
      if (editingRecord) {
        // Edit Mode
        updatedRecordsList = updatedRecordsList.map(rec => 
          rec.id === editingRecord.id ? { ...rec, keys: finalKeys, value: trimmedValue } : rec
        );
      } else {
        // Add Mode
        const newRecord: MasterRecord = {
          id: `r-${Date.now()}`,
          keys: finalKeys,
          value: trimmedValue
        };
        updatedRecordsList.push(newRecord);
      }

      return {
        ...tbl,
        records: updatedRecordsList,
        updatedAt: new Date().toISOString()
      };
    }));

    message.success(editingRecord ? t.successEdit : t.successAdd);
    setIsModalOpen(false);
  };

  const handleConfirmDelete = (record: MasterRecord) => {
    setRecordToDelete(record);
    setDeleteConfirmOpen(true);
  };

  const executeDeleteRecord = () => {
    if (!selectedTableId || !recordToDelete) return;

    setMasterTables(prev => prev.map(tbl => {
      if (tbl.id !== selectedTableId) return tbl;

      return {
        ...tbl,
        records: tbl.records.filter(r => r.id !== recordToDelete.id),
        updatedAt: new Date().toISOString()
      };
    }));

    message.success(t.successDelete);
    setDeleteConfirmOpen(false);
    setRecordToDelete(null);
  };

  // ================= EXCEL IMPORT HANDLERS =================
  const handleOpenImportExcel = () => {
    setParsedRecords([]);
    setDuplicateWarningCount(0);
    setImportError(null);
    setIsImportDrawerOpen(true);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleDownloadTemplate = () => {
    if (!activeTable) return;
    const headers = [
      [
        language === 'TH' ? 'ชื่อหลักในระบบ (Full System Value / Target) *จำเป็น' : 'Full System Value *Required',
        language === 'TH' ? 'คีย์สำหรับจับคู่ (Matching Keys - แยกคอมมาหรือเว้นวรรค) *จำเป็น' : 'Matching Keys (comma or space separated) *Required'
      ]
    ];
    
    // Provide a neat real-world example row depending on the active table
    let sampleVal = '';
    let sampleKeys = '';
    if (activeTable.id === 'vendor') {
      sampleVal = language === 'TH' ? 'บริษัท เคอรี่ เอ็กซ์เพรส (ประเทศไทย) จำกัด (มหาชน)' : 'Kerry Express (Thailand) Public Company Limited';
      sampleKeys = 'เคอรี่, Kerry Express, KEX';
    } else if (activeTable.id === 'customer') {
      sampleVal = language === 'TH' ? 'บริษัท บีเจซี เฮฟวี่ อินดัสทรี จำกัด (มหาชน)' : 'BJC Heavy Industries Public Company Limited';
      sampleKeys = 'บีเจซี, BJC Heavy, BJCHI';
    } else if (activeTable.id === 'product') {
      sampleVal = 'LED Monitor Deluxe 27-Inch 4K';
      sampleKeys = 'MONITOR-27, จอแอลอีดี 4K, LED-27-4K';
    } else {
      sampleVal = language === 'TH' ? 'ตัวอย่างข้อมูลระบบ' : 'Sample System Target Value';
      sampleKeys = 'SampleKey1, คีย์สำหรับจับคู่, KeyABC';
    }

    const sampleRows = [[sampleVal, sampleKeys]];
    const ws = XLSX.utils.aoa_to_sheet([...headers, ...sampleRows]);
    
    // Set widths to keep it elegant and scannable
    ws['!cols'] = [{ wch: 55 }, { wch: 55 }];
    
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "MasterDataTemplate");
    XLSX.writeFile(wb, `${activeTable.id}_import_template.xlsx`);
    message.success(language === 'TH' ? 'ดาวน์โหลดไฟล์เทมเพลตเรียบร้อยแล้ว' : 'Download Template file successfully!');
  };

  const processExcelFile = (file: File) => {
    setImportError(null);
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        if (workbook.SheetNames.length === 0) {
          setImportError(language === 'TH' ? 'ไฟล์ Excel ต้องมีแผ่นงานอย่างน้อย 1 หน้า' : 'The Excel file must have at least 1 sheet.');
          return;
        }
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const rawData = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as any[][];
        
        if (rawData.length <= 1) {
          setImportError(language === 'TH' ? 'ไม่พบข้อมูลรายการในแผ่นงาน (ไม่มีข้อมูลใต้แถวหัวตาราง)' : 'No records found in the sheet layout (below header row).');
          return;
        }

        const validParsed: Array<{ id: string; value: string; keys: string[] }> = [];
        let duplicateCount = 0;
        const currentExistingKeys = new Set(activeTable?.records.flatMap(r => r.keys.map(k => k.toLowerCase())) || []);

        for (let i = 1; i < rawData.length; i++) {
          const row = rawData[i];
          if (!row || row.length === 0) continue;
          
          const rawValue = row[0];
          const rawKeys = row[1];
          
          if (!rawValue) continue; // Skip empty value rows
          
          const strValue = String(rawValue).trim();
          if (!strValue) continue;

          // Parse matching keys
          let keysArray: string[] = [];
          if (rawKeys) {
            const rawKeysStr = String(rawKeys);
            // Support comma, semicolon, and vertical bars as separators
            keysArray = rawKeysStr
              .split(/[,;|，]+/)
              .map(k => k.trim())
              .filter(Boolean);
          }

          if (keysArray.length === 0) {
            // Fallback - use a part of value as key if no key is provided
            keysArray = [strValue.split(' ')[0]];
          }

          // Check if any of these imported keys already conflict with current active table database keys
          let hasConflict = false;
          for (const key of keysArray) {
            if (currentExistingKeys.has(key.toLowerCase())) {
              hasConflict = true;
            }
          }
          if (hasConflict) {
            duplicateCount++;
          }

          validParsed.push({
            id: `imp-${Date.now()}-${Math.floor(Math.random() * 1000000)}-${i}`,
            value: strValue,
            keys: keysArray
          });
        }

        if (validParsed.length === 0) {
          setImportError(language === 'TH' ? 'ไม่มีข้อมูลที่นำเข้าได้ คอลัมน์แรกในไฟล์ต้องไม่ว่างเปล่า' : 'No importable database records. The first column values must not be empty.');
          return;
        }

        setParsedRecords(validParsed);
        setDuplicateWarningCount(duplicateCount);
      } catch (err) {
        console.error(err);
        setImportError(language === 'TH' ? 'เกิดข้อผิดพลาดในการอ่านไฟล์ กรุณาตรวจสอบนามสกุล .xlsx หรือ .xls' : 'Error parsing file. Please verify it is a valid .xlsx or .xls file.');
      }
    };

    reader.onerror = () => {
      setImportError(language === 'TH' ? 'ไม่สามารถอ่านไฟล์ระบบได้' : 'Failed to read the file.');
    };
    reader.readAsArrayBuffer(file);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processExcelFile(e.target.files[0]);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      const extension = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();
      if (['.xlsx', '.xls', '.csv'].includes(extension)) {
        processExcelFile(file);
      } else {
        setImportError(language === 'TH' ? 'รองรับเฉพาะไฟล์ Excel (.xlsx, .xls) หรือ .csv เท่านั้น' : 'Only Excel (.xlsx, .xls) and .csv are supported.');
      }
    }
  };

  const handleSaveImportedRecords = () => {
    if (!selectedTableId || parsedRecords.length === 0) return;

    setMasterTables(prev => prev.map(tbl => {
      if (tbl.id !== selectedTableId) return tbl;
      
      // Merge unique record format
      const updatedList = [...tbl.records];
      
      parsedRecords.forEach(newItem => {
        // Prevent importing exact duplicate system target values to keep the list clean if they match exactly
        const existingWithSameVal = updatedList.find(rec => rec.value.toLowerCase().trim() === newItem.value.toLowerCase().trim());
        if (existingWithSameVal) {
          // Merge keys if values match
          newItem.keys.forEach(k => {
            if (!existingWithSameVal.keys.some(ek => ek.toLowerCase() === k.toLowerCase())) {
              existingWithSameVal.keys.push(k);
            }
          });
        } else {
          // Add as a new record
          updatedList.push({
            id: newItem.id,
            value: newItem.value,
            keys: newItem.keys
          });
        }
      });

      return {
        ...tbl,
        records: updatedList,
        updatedAt: new Date().toISOString()
      };
    }));

    message.success(language === 'TH' 
      ? `นำเข้าข้อมูลเรียบร้อยแล้ว เพิ่ม ${parsedRecords.length} รายการแล้ว` 
      : `Import completed! Added ${parsedRecords.length} master records successfully.`
    );
    setIsImportDrawerOpen(false);
    setParsedRecords([]);
  };

  // Add Table Actions
  const handleOpenAddTable = () => {
    setNewTableId('');
    setNewTableName('');
    setFirstRecordKeys([]);
    setFirstRecordKeyInput('');
    setFirstRecordValue('');
    setIsAddTableModalOpen(true);
  };

  const handleAddFirstRecordKeyTag = () => {
    const trimmed = firstRecordKeyInput.trim();
    if (!trimmed) return;

    const parts = trimmed.split(',').map(p => p.trim()).filter(Boolean);
    const newKeys = [...firstRecordKeys];

    parts.forEach(part => {
      if (!newKeys.includes(part)) {
        newKeys.push(part);
      }
    });

    setFirstRecordKeys(newKeys);
    setFirstRecordKeyInput('');
  };

  const handleKeyDownFirstRecordInput = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      handleAddFirstRecordKeyTag();
    }
  };

  const handleRemoveFirstRecordKeyTag = (tagToRemove: string) => {
    setFirstRecordKeys(firstRecordKeys.filter(tag => tag !== tagToRemove));
  };

  const handleSaveTable = () => {
    const tid = newTableId.trim().toLowerCase();
    const tableNameVal = newTableName.trim();

    if (!tid) {
      message.error(t.errorEmptyTableId);
      return;
    }

    if (!/^[a-z0-9_]+$/.test(tid)) {
      message.error(t.errorInvalidTableId);
      return;
    }

    if (masterTables.some(tbl => tbl.id.toLowerCase() === tid)) {
      message.error(t.errorDuplicateTableId);
      return;
    }

    if (!tableNameVal) {
      message.error(t.errorEmptyTableName);
      return;
    }

    // Create the new Master Table with empty records initially as requested
    const newTable: MasterTable = {
      id: tid,
      nameTH: tableNameVal,
      nameEN: tableNameVal,
      updatedAt: new Date().toISOString(),
      records: []
    };

    setMasterTables(prev => [newTable, ...prev]);
    
    // Custom messages
    const successMsg = language === 'TH' 
      ? 'สร้างตารางข้อมูล Master Data ใหม่เรียบร้อยแล้ว' 
      : 'Successfully created new Master Table.';
    message.success(successMsg);
    
    setIsAddTableModalOpen(false);
    
    // Automatically navigate inside the newly created table
    setSelectedTableId(tid);
    
    // Clear state
    setNewTableId('');
    setNewTableName('');
    setFirstRecordKeys([]);
    setFirstRecordKeyInput('');
    setFirstRecordValue('');
  };

  const handleSaveEditTable = () => {
    if (!selectedTableId || !activeTable) return;

    const tid = editTableId.trim().toLowerCase();
    if (!tid) {
      message.error(t.errorEmptyTableId);
      return;
    }

    if (!/^[a-z0-9_]+$/.test(tid)) {
      message.error(t.errorInvalidTableId);
      return;
    }

    const duplicate = masterTables.some(t => t.id.toLowerCase() === tid && t.id !== selectedTableId);
    if (duplicate) {
      message.error(t.errorDuplicateTableId);
      return;
    }

    const nameTHVal = editTableNameTH.trim();
    if (!nameTHVal) {
      message.error(t.errorEmptyTableName);
      return;
    }

    const nameENVal = editTableNameEN.trim() || nameTHVal;

    setMasterTables(prev => prev.map(tbl => {
      if (tbl.id === selectedTableId) {
        return {
          ...tbl,
          id: tid,
          nameTH: nameTHVal,
          nameEN: nameENVal,
          updatedAt: new Date().toISOString()
        };
      }
      return tbl;
    }));

    // Maintain selection by shifting the active ID
    setSelectedTableId(tid);

    const successMsg = language === 'TH' 
      ? 'ปรับปรุงชื่อและรหัสตารางข้อมูลหลักเรียบร้อยแล้ว' 
      : 'Successfully updated Master Table name and ID.';
    message.success(successMsg);

    setIsEditTableModalOpen(false);
  };

  const filteredTables = masterTables.filter(tbl => {
    const q = searchTableQuery.toLowerCase();
    return tbl.nameTH.toLowerCase().includes(q) || tbl.nameEN.toLowerCase().includes(q) || tbl.id.toLowerCase().includes(q);
  });

  const filteredRecords = activeTable 
    ? activeTable.records.filter(rec => {
        const q = searchRecordQuery.toLowerCase();
        return rec.value.toLowerCase().includes(q) || rec.keys.some(k => k.toLowerCase().includes(q));
      })
    : [];

  return (
    <div className="bg-white border border-slate-200/80 rounded-[16px] p-6 shadow-sm space-y-6 font-sans text-[#010136] w-full" id="master-data-settings-wrapper">
        
        {/* Header Container - No background/border to blend with parent wrapper cleanly */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-100">
          <div className="flex items-start gap-4">
            {selectedTableId && (
              <button
                onClick={() => { setSelectedTableId(null); setSearchRecordQuery(''); }}
                className="p-2 hover:bg-slate-100 rounded-[4px] text-slate-600 transition-colors flex items-center justify-center cursor-pointer"
                title={t.backToTablesBtn}
              >
                <ArrowLeft size={18} />
              </button>
            )}
            <div>
              <div className="flex items-center gap-2 mb-2 select-none flex-wrap">
                <h1 className="text-2xl font-black tracking-tight leading-none">
                  {selectedTableId && activeTable 
                    ? (language === 'TH' ? activeTable.nameTH : activeTable.nameEN)
                    : t.title
                  }
                </h1>
                {selectedTableId && activeTable && (
                  <Tooltip title={language === 'TH' ? 'แก้ไขชื่อรายการ' : 'Edit Item Name'}>
                    <button
                      onClick={() => {
                        setEditTableId(activeTable.id);
                        setEditTableNameTH(activeTable.nameTH);
                        setEditTableNameEN(activeTable.nameEN);
                        setIsEditTableModalOpen(true);
                      }}
                      className="p-1.5 text-[#1f5df9] bg-blue-50/50 hover:bg-blue-100/50 border border-blue-200/40 rounded-[4px] transition-all cursor-pointer flex items-center justify-center"
                    >
                      <Edit3 size={13} />
                    </button>
                  </Tooltip>
                )}
              </div>
              <p className="text-sm font-bold text-slate-500">
                {selectedTableId && activeTable 
                  ? `Table code/ID: ${activeTable.id}`
                  : t.subtitle
                }
              </p>
            </div>
          </div>

          {!selectedTableId && (
            <Button 
              type="primary"
              onClick={handleOpenAddTable}
              icon={<Plus size={16} />}
              className="bg-[#1f5df9] hover:bg-[#1f5df9]/90 border-none font-bold rounded-[4px] h-[42px] px-5 flex items-center justify-center gap-1.5 cursor-pointer shadow-sm text-sm shrink-0"
            >
              {t.addTableBtn}
            </Button>
          )}
        </div>

        <AnimatePresence mode="wait">
          {!selectedTableId ? (
            /* ================= MASTER TABLES LIST VIEW ================= */
            <motion.div 
              key="table-list-view"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.15 }}
              className="space-y-4 animate-in fade-in duration-200"
            >
              {/* Search filter and View mode switcher banner row */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="w-full max-w-md">
                  <Input 
                    prefix={<Search size={16} className="text-slate-400 mr-2" />}
                    placeholder={t.searchTablePlaceholder}
                    value={searchTableQuery}
                    onChange={e => setSearchTableQuery(e.target.value)}
                    className="rounded-[4px] border border-slate-200 p-2.5 h-[42px] focus:border-[#1f5df9] focus:shadow-none hover:border-[#1f5df9] w-full"
                    allowClear
                  />
                </div>

                <div className="flex items-center gap-1 bg-slate-100/80 p-1 rounded-[4px] border border-slate-200/40 select-none">
                  <button
                    type="button"
                    onClick={() => setViewMode('grid')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-[4px] text-xs font-black transition-all cursor-pointer ${
                      viewMode === 'grid'
                        ? 'bg-white text-[#1f5df9] shadow-sm border border-slate-200/50'
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    <LayoutGrid size={14} />
                    <span>{language === 'TH' ? 'แบบกริด' : 'Grid'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setViewMode('list')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-[4px] text-xs font-black transition-all cursor-pointer ${
                      viewMode === 'list'
                        ? 'bg-white text-[#1f5df9] shadow-sm border border-slate-200/50'
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    <List size={14} />
                    <span>{language === 'TH' ? 'แบบรายการ' : 'List'}</span>
                  </button>
                </div>
              </div>

              {/* Tables Layout rendering with support for both grid and list views */}
              {filteredTables.length > 0 ? (
                viewMode === 'grid' ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                    {filteredTables.map((tbl) => (
                      <motion.div
                        key={tbl.id}
                        onClick={() => { setSelectedTableId(tbl.id); setSearchRecordQuery(''); }}
                        whileHover={{ y: -3, transition: { duration: 0.1 } }}
                        className="bg-slate-50/40 hover:bg-white border border-slate-100 rounded-[8px] p-6 shadow-sm hover:shadow-md cursor-pointer transition-all flex flex-col justify-between group"
                      >
                        <div className="space-y-4">
                          {/* Top bar with icon & record quantity count badge */}
                          <div className="flex items-center justify-between">
                            <div className="w-11 h-11 rounded-[8px] bg-blue-50 text-[#1f5df9] flex items-center justify-center group-hover:bg-[#1f5df9] group-hover:text-white transition-colors duration-200">
                              <Database size={20} />
                            </div>
                            <span className="text-xs font-black text-[#010136] bg-white border border-slate-100 rounded-[4px] px-2.5 py-1 flex items-center gap-1 group-hover:bg-blue-50 group-hover:border-blue-100/30 transition-colors">
                              <Hash size={12} className="text-slate-400" />
                              <span>{tbl.records.length} {language === 'TH' ? 'รายการ' : 'Records'}</span>
                            </span>
                          </div>

                          {/* Content headings */}
                          <div>
                            <h3 className="text-md font-black tracking-tight leading-snug group-hover:text-[#1f5df9] transition-colors mb-1.5">
                              {language === 'TH' ? tbl.nameTH : tbl.nameEN}
                            </h3>
                            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">
                              TABLE ID: {tbl.id.toUpperCase()}
                            </div>
                          </div>
                        </div>

                        {/* Bottom footer bar */}
                        <div className="border-t border-slate-100/80 pt-4 mt-5 flex items-center justify-between text-xs text-slate-400 font-medium">
                          <div className="flex items-center gap-1.5">
                            <Calendar size={13} className="text-slate-300" />
                            <span>{formatDateTime(tbl.updatedAt)}</span>
                          </div>
                          <ChevronRight size={14} className="text-slate-300 group-hover:text-[#1f5df9] group-hover:translate-x-1 transition-all" />
                        </div>
                      </motion.div>
                    ))}
                  </div>
                ) : (
                  <div className="border border-slate-200/80 rounded-[8px] overflow-hidden bg-white divide-y divide-slate-100/80 shadow-sm">
                    {filteredTables.map((tbl) => (
                      <div
                        key={tbl.id}
                        onClick={() => { setSelectedTableId(tbl.id); setSearchRecordQuery(''); }}
                        className="p-4 hover:bg-slate-50/60 transition-colors cursor-pointer flex items-center justify-between gap-4 group"
                      >
                        <div className="flex items-center gap-3.5 min-w-0">
                          <div className="w-10 h-10 rounded-[6px] bg-blue-50 text-[#1f5df9] flex items-center justify-center group-hover:bg-[#1f5df9] group-hover:text-white transition-colors duration-200 shrink-0">
                            <Database size={18} />
                          </div>
                          <div className="min-w-0">
                            <h4 className="text-sm font-black tracking-tight text-[#010136] group-hover:text-[#1f5df9] transition-colors truncate">
                              {language === 'TH' ? tbl.nameTH : tbl.nameEN}
                            </h4>
                            <span className="font-mono text-[10px] font-bold text-slate-400 block uppercase tracking-wider mt-0.5">
                              TABLE ID: {tbl.id.toUpperCase()}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-6 shrink-0 text-xs">
                          {/* Updated At info */}
                          <div className="hidden sm:flex flex-col items-end gap-0.5 text-[#010136]">
                            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none">
                              {language === 'TH' ? 'แก้ไขล่าสุดเมื่อ' : 'Last Updated'}
                            </span>
                            <span className="font-bold text-slate-600">
                              {formatDateTime(tbl.updatedAt)}
                            </span>
                          </div>

                          {/* Records Count tag */}
                          <span className="text-xs font-black text-[#010136] bg-slate-50 border border-slate-100 rounded-[4px] px-2.5 py-1 flex items-center gap-1 group-hover:bg-blue-50 group-hover:border-blue-100/30 transition-colors select-none">
                            <Hash size={12} className="text-slate-400" />
                            <span>{tbl.records.length} {language === 'TH' ? 'รายการ' : 'Records'}</span>
                          </span>

                          <ChevronRight size={16} className="text-slate-300 group-hover:text-[#1f5df9] group-hover:translate-x-0.5 transition-all" />
                        </div>
                      </div>
                    ))}
                  </div>
                )
              ) : (
                <div className="bg-slate-50/20 rounded-[16px] border border-slate-200/50 p-12 flex flex-col items-center justify-center min-h-[300px]">
                  <Empty description={language === 'TH' ? 'ไม่พบตารางข้อมูลหลักที่สอดคล้องกับหัวข้อค้นหา' : 'No master tables matched your query.'} />
                </div>
              )}
            </motion.div>
          ) : (
            /* ================= TABLE RECORD DETAIL VIEW ================= */
            <motion.div 
              key="table-record-detail-view"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.15 }}
              className="space-y-4 animate-in fade-in duration-200"
            >
              {/* Record search filter & Add Record button row inside content page */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="w-full sm:max-w-md">
                  <Input 
                    prefix={<Search size={16} className="text-slate-400 mr-2" />}
                    placeholder={t.searchRecordPlaceholder}
                    value={searchRecordQuery}
                    onChange={e => setSearchRecordQuery(e.target.value)}
                    className="rounded-[4px] border border-slate-200 p-2.5 h-[42px] focus:border-[#1f5df9] focus:shadow-none hover:border-[#1f5df9]"
                    allowClear
                  />
                </div>
                
                <div className="flex items-center gap-2.5 shrink-0 select-none">
                  {/* Excel Import button matching specified mock design and additional user instructions */}
                  <Button 
                    type="default"
                    onClick={handleOpenImportExcel}
                    icon={<FileSpreadsheet size={16} className="text-emerald-600" />}
                    className="border-emerald-200 text-emerald-700 hover:text-emerald-800 hover:border-emerald-400 hover:bg-emerald-50/40 font-bold rounded-[4px] h-[40px] px-4 flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs text-sm transition-all"
                  >
                    <span>{language === 'TH' ? 'นำเข้าด้วย Excel' : 'Import with Excel'}</span>
                  </Button>

                  {/* Add Record button moved inline to this record view exactly as requested */}
                  <Button 
                    type="primary"
                    onClick={handleOpenAddRecord}
                    icon={<Plus size={16} />}
                    className="bg-[#1f5df9] hover:bg-[#1f5df9]/90 border-none font-bold rounded-[4px] h-[40px] px-5 flex items-center justify-center gap-1.5 cursor-pointer shadow-sm text-sm"
                  >
                    {t.addRecordBtn}
                  </Button>
                </div>
              </div>

              {/* Records list container */}
              <div className="bg-white rounded-[8px] border border-slate-200/80 shadow-3xs overflow-hidden">
                {filteredRecords.length > 0 ? (
                  <div className="divide-y divide-slate-100">
                    {/* Table Header Row */}
                    <div className="hidden sm:grid grid-cols-12 bg-slate-50/50 p-4 font-black text-xs text-slate-500 uppercase tracking-widest border-b border-slate-100">
                    <div className="col-span-5 flex items-center gap-1.5">
                      <CheckCircle size={13} />
                      <span>{t.valueLabel}</span>
                    </div>
                    <div className="col-span-5 flex items-center gap-1.5">
                      <TagIcon size={13} />
                      <span>{t.keysLabel}</span>
                    </div>
                    <div className="col-span-2 text-right">ACTION</div>
                  </div>

                  {/* Table Body Rows */}
                  {filteredRecords.map((rec) => (
                    <div 
                      key={rec.id}
                      className="grid grid-cols-1 sm:grid-cols-12 gap-3 sm:gap-4 p-5 hover:bg-slate-50/30 transition-colors items-center"
                    >
                      {/* System Value Column */}
                      <div className="col-span-12 sm:col-span-5 space-y-1">
                        <span className="sm:hidden text-[10px] font-black text-slate-400 uppercase tracking-widest block">
                          {t.valueLabel}
                        </span>
                        <div className="font-extrabold text-[#010136] text-[14px]">
                          {rec.value}
                        </div>
                        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                          ID: {rec.id.toUpperCase()}
                        </div>
                      </div>

                      {/* Keys Column */}
                      <div className="col-span-12 sm:col-span-5 space-y-1.5">
                        <span className="sm:hidden text-[10px] font-black text-slate-400 uppercase tracking-widest block">
                          {t.keysLabel}
                        </span>
                        <div className="flex flex-wrap gap-1.5">
                          {rec.keys.map((key, kIdx) => (
                            <span 
                              key={kIdx}
                              className="inline-flex items-center text-xs font-bold text-[#1f5df9] bg-blue-50 border border-blue-100/50 rounded-[4px] px-2.5 py-1"
                            >
                              {key}
                            </span>
                          ))}
                        </div>
                      </div>

                      {/* Operations Actions Column */}
                      <div className="col-span-12 sm:col-span-2 flex items-center justify-end gap-2 pt-2 sm:pt-0 border-t border-dashed border-slate-100 sm:border-t-0">
                        <Tooltip title={language === 'TH' ? 'แก้ไขข้อมูล' : 'Edit'}>
                          <button
                            onClick={() => handleOpenEditRecord(rec)}
                            className="p-2 text-slate-500 hover:text-[#1f5df9] border border-slate-200/80 hover:border-blue-200 hover:bg-blue-50/50 rounded-[4px] transition-all cursor-pointer flex items-center justify-center grow sm:grow-0"
                          >
                            <Edit3 size={15} />
                          </button>
                        </Tooltip>

                        <Tooltip title={language === 'TH' ? 'ลบข้อมูล' : 'Delete'}>
                          <button
                            onClick={() => handleConfirmDelete(rec)}
                            className="p-2 text-slate-400 hover:text-rose-600 border border-slate-200/80 hover:border-rose-200 hover:bg-rose-50/50 rounded-[4px] transition-all cursor-pointer flex items-center justify-center grow sm:grow-0"
                          >
                            <Trash2 size={15} />
                          </button>
                        </Tooltip>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-16 flex flex-col items-center justify-center">
                  <Empty description={language === 'TH' ? 'ไม่พบรายการข้อมูลในตารางนี้' : 'No records found in this table.'} />
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ================= ADD / EDIT RECORD DRAWER ================= */}
      <Drawer
        closeIcon={false}
        extra={
          <button 
            onClick={() => setIsModalOpen(false)} 
            className="p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 rounded-lg border-none bg-transparent cursor-pointer transition-colors"
          >
            <X size={20} />
          </button>
        }
        title={
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-blue-50 text-[#1f5df9] rounded-[4px]">
              <Database size={16} />
            </div>
            <span className="text-[18px] font-black text-[#010136]">
              {editingRecord ? t.modalTitleEdit : t.modalTitleAdd}
            </span>
          </div>
        }
        open={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        footer={
          <div className="flex justify-end gap-2.5 py-1">
            <button
              onClick={() => setIsModalOpen(false)}
              className="px-4 py-2 border border-slate-200 text-slate-600 font-bold rounded-[4px] hover:bg-slate-50 transition-colors text-xs inline-flex items-center justify-center cursor-pointer mr-1.5 h-[36px]"
            >
              {t.cancel}
            </button>
            <button
              onClick={handleSaveRecord}
              className="px-4 py-2 bg-[#1f5df9] hover:bg-[#1f5df9]/90 text-white font-bold rounded-[4px] transition-colors text-xs inline-flex items-center justify-center cursor-pointer border-none h-[36px]"
            >
              {t.save}
            </button>
          </div>
        }
        styles={{ wrapper: { width: 500 } }}
        placement="right"
      >
        <div className="space-y-5 pt-2">
          {/* Full value system text input */}
          <div className="space-y-2">
            <div className="flex items-center gap-1">
              <label className="text-xs font-black text-slate-600 uppercase tracking-wider block">
                {t.valueLabel}
              </label>
              <span className="text-rose-500">*</span>
            </div>
            <Input
              placeholder={t.valuePlaceholder}
              value={formValue}
              onChange={e => setFormValue(e.target.value)}
              className="rounded-[4px] border-slate-200 hover:border-[#1f5df9] focus:border-[#1f5df9] focus:shadow-none p-2.5 text-xs h-[38px] font-bold text-[#010136]"
            />
          </div>

          {/* Key tags creation array input */}
          <div className="space-y-2">
            <div className="flex items-center gap-1">
              <label className="text-xs font-black text-slate-600 uppercase tracking-wider block">
                {t.keysLabel}
              </label>
              <span className="text-rose-500">*</span>
              <Tooltip title={t.keysHint}>
                <HelpCircle size={13} className="text-slate-400 cursor-help" />
              </Tooltip>
            </div>

            {/* List tags box containing remove buttons */}
            <div className="min-h-[46px] border border-slate-200 rounded-[4px] p-2 bg-slate-50/50 flex flex-wrap gap-1.5 items-center">
              {formKeys.length === 0 ? (
                <span className="text-xs font-bold text-slate-400 px-1 select-none">
                  {language === 'TH' ? 'ยังไม่ได้ระบุคีย์เวิร์ด (กดปุ่ม Enter ด้านล่างเพื่อเพิ่ม)' : 'No matching keys added yet (press Enter below to add)'}
                </span>
              ) : (
                <AnimatePresence>
                  {formKeys.map((key) => (
                    <motion.div
                      key={key}
                      initial={{ scale: 0.8, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      exit={{ scale: 0.8, opacity: 0 }}
                      transition={{ duration: 0.1 }}
                    >
                      <Tag
                        closable
                        onClose={() => handleRemoveKeyTag(key)}
                        className="m-0 bg-white border-blue-200 text-[#1f5df9] font-bold py-0.5 px-2 rounded-[4px] flex items-center gap-1 shrink-0"
                      >
                        {key}
                      </Tag>
                    </motion.div>
                  ))}
                </AnimatePresence>
              )}
            </div>

            {/* Actual keyboard layout text field */}
            <div className="flex gap-2">
              <Input
                placeholder={language === 'TH' ? 'พิมพ์คำหลักแล้วตรวจสอบด้วย Enter หรือ comma (,)' : 'Enter key... press Enter or comma to save'}
                value={keyInput}
                onChange={e => setKeyInput(e.target.value)}
                onKeyDown={handleKeyDownInput}
                className="rounded-[4px] border-slate-200 hover:border-[#1f5df9] focus:border-[#1f5df9] focus:shadow-none p-2 text-xs h-[36px]"
              />
              <button
                type="button"
                onClick={handleAddKeyTag}
                className="px-3 bg-slate-100 hover:bg-slate-200 text-slate-600 font-extrabold text-[11px] rounded-[4px] transition-colors flex items-center justify-center shrink-0 cursor-pointer border border-slate-200/80"
              >
                ADD
              </button>
            </div>
            <p className="text-[10px] font-medium text-slate-400 leading-relaxed">
              {t.keysHint}
            </p>
          </div>
        </div>
      </Drawer>

      {/* ================= DELETE CONFIRMATION DIALOG MODAL ================= */}
      <Modal
        title={
          <div className="flex items-center gap-2 text-rose-600">
            <div className="p-1.5 bg-rose-50 text-rose-500 rounded-[4px]">
              <ShieldAlert size={16} />
            </div>
            <span className="text-[17px] font-black">{t.deleteModalTitle}</span>
          </div>
        }
        open={deleteConfirmOpen}
        onCancel={() => setDeleteConfirmOpen(false)}
        footer={[
          <button
            key="cancel"
            onClick={() => setDeleteConfirmOpen(false)}
            className="px-4 py-2 border border-slate-200 text-slate-500 font-bold rounded-[4px] hover:bg-slate-50 transition-colors text-xs inline-flex items-center justify-center cursor-pointer mr-2.5 h-[36px]"
          >
            {t.cancel}
          </button>,
          <button
            key="delete"
            onClick={executeDeleteRecord}
            className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-[4px] transition-colors text-xs inline-flex items-center justify-center cursor-pointer border-none h-[36px]"
          >
            {language === 'TH' ? 'ลบข้อมูล' : 'Delete Record'}
          </button>
        ]}
        width={425}
        centered
      >
        <div className="pt-2">
          {recordToDelete && (
            <p className="text-sm font-medium text-slate-500 leading-relaxed">
              {t.deleteModalDesc(recordToDelete.value)}
            </p>
          )}
        </div>
      </Modal>

      {/* ================= ADD NEW CUSTOM MASTER TABLE DRAWER ================= */}
      <Drawer
        closeIcon={false}
        extra={
          <button 
            onClick={() => setIsAddTableModalOpen(false)} 
            className="p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 rounded-lg border-none bg-transparent cursor-pointer transition-colors"
          >
            <X size={20} />
          </button>
        }
        title={
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-blue-50 text-[#1f5df9] rounded-[4px]">
              <Database size={16} />
            </div>
            <span className="text-[18px] font-black text-[#010136]">
              {t.addTableModalTitle}
            </span>
          </div>
        }
        open={isAddTableModalOpen}
        onClose={() => setIsAddTableModalOpen(false)}
        footer={
          <div className="flex justify-end gap-2.5 py-1">
            <button
              onClick={() => setIsAddTableModalOpen(false)}
              className="px-4 py-2 border border-slate-200 text-slate-600 font-bold rounded-[4px] hover:bg-slate-50 transition-colors text-xs inline-flex items-center justify-center cursor-pointer mr-1.5 h-[36px]"
            >
              {t.cancel}
            </button>
            <button
              onClick={handleSaveTable}
              className="px-4 py-2 bg-[#1f5df9] hover:bg-[#1f5df9]/90 text-white font-bold rounded-[4px] transition-colors text-xs inline-flex items-center justify-center cursor-pointer border-none h-[36px]"
            >
              {t.save}
            </button>
          </div>
        }
        styles={{ wrapper: { width: 500 } }}
        placement="right"
      >
        <div className="space-y-4 pt-2 text-[#010136]">
          {/* Table Name (Single field, simplified as requested) */}
          <div className="space-y-1.5">
            <div className="flex items-center gap-1">
              <label className="text-xs font-black text-slate-600 uppercase tracking-wider block">
                {t.tableNameLabel}
              </label>
              <span className="text-rose-500">*</span>
            </div>
            <Input
              placeholder={t.tableNamePlaceholder}
              value={newTableName}
              onChange={e => setNewTableName(e.target.value)}
              className="rounded-[4px] border-slate-200 hover:border-[#1f5df9] focus:border-[#1f5df9] focus:shadow-none p-2.5 text-xs h-[38px] font-bold text-[#010136]"
            />
          </div>

          {/* Table ID / code */}
          <div className="space-y-1.5">
            <div className="flex items-center gap-1">
              <label className="text-xs font-black text-slate-600 uppercase tracking-wider block">
                {t.tableIdLabel}
              </label>
              <span className="text-rose-500">*</span>
            </div>
            <Input
              placeholder={t.tableIdPlaceholder}
              value={newTableId}
              onChange={e => setNewTableId(e.target.value)}
              className="rounded-[4px] border-slate-200 hover:border-[#1f5df9] focus:border-[#1f5df9] focus:shadow-none p-2.5 text-xs h-[38px] font-bold text-[#010136]"
            />
          </div>
        </div>
      </Drawer>

      {/* ================= EDIT MASTER TABLE DRAWER ================= */}
      <Drawer
        closeIcon={false}
        extra={
          <button 
            onClick={() => setIsEditTableModalOpen(false)} 
            className="p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 rounded-lg border-none bg-transparent cursor-pointer transition-colors"
          >
            <X size={20} />
          </button>
        }
        title={
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-blue-50 text-[#1f5df9] rounded-[4px]">
              <Edit3 size={16} />
            </div>
            <span className="text-[18px] font-black text-[#010136]">
              {language === 'TH' ? 'แก้ไขชื่อรายการ' : 'Edit Item Name'}
            </span>
          </div>
        }
        open={isEditTableModalOpen}
        onClose={() => setIsEditTableModalOpen(false)}
        footer={
          <div className="flex justify-end gap-2.5 py-1">
            <button
              onClick={() => setIsEditTableModalOpen(false)}
              className="px-4 py-2 border border-slate-200 text-slate-600 font-bold rounded-[4px] hover:bg-slate-50 transition-colors text-xs inline-flex items-center justify-center cursor-pointer mr-1.5 h-[36px]"
            >
              {t.cancel}
            </button>
            <button
              onClick={handleSaveEditTable}
              className="px-4 py-2 bg-[#1f5df9] hover:bg-[#1f5df9]/90 text-white font-bold rounded-[4px] transition-colors text-xs inline-flex items-center justify-center cursor-pointer border-none h-[36px]"
            >
              {language === 'TH' ? 'บันทึกการแก้ไข' : 'Save Changes'}
            </button>
          </div>
        }
        styles={{ wrapper: { width: 500 } }}
        placement="right"
      >
        <div className="space-y-4 pt-2 text-[#010136]">
          {/* Table Name */}
          <div className="space-y-1.5">
            <div className="flex items-center gap-1">
              <label className="text-xs font-black text-slate-600 uppercase tracking-wider block">
                {language === 'TH' ? 'ชื่อตาราง' : 'Table Name'}
              </label>
              <span className="text-rose-500">*</span>
            </div>
            <Input
              placeholder={t.tableNamePlaceholder}
              value={editTableNameTH}
              onChange={e => {
                setEditTableNameTH(e.target.value);
                setEditTableNameEN(e.target.value);
              }}
              className="rounded-[4px] border-slate-200 hover:border-[#1f5df9] focus:border-[#1f5df9] focus:shadow-none p-2.5 text-xs h-[38px] font-bold text-[#010136]"
            />
          </div>

          {/* Table ID / code */}
          <div className="space-y-1.5">
            <div className="flex items-center gap-1">
              <label className="text-xs font-black text-slate-600 uppercase tracking-wider block">
                {t.tableIdLabel}
              </label>
              <span className="text-rose-500">*</span>
            </div>
            <Input
              placeholder={t.tableIdPlaceholder}
              value={editTableId}
              onChange={e => setEditTableId(e.target.value)}
              className="rounded-[4px] border-slate-200 hover:border-[#1f5df9] focus:border-[#1f5df9] focus:shadow-none p-2.5 text-xs h-[38px] font-bold text-[#010136]"
            />
          </div>
        </div>
      </Drawer>

      {/* ================= IMPORT MASTER RECORD FROM EXCEL DRAWER ================= */}
      <Drawer
        closeIcon={false}
        extra={
          <button 
            onClick={() => setIsImportDrawerOpen(false)} 
            className="p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 rounded-lg border-none bg-transparent cursor-pointer transition-colors"
          >
            <X size={20} />
          </button>
        }
        title={
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-emerald-50 text-emerald-600 rounded-[4px]">
              <FileSpreadsheet size={16} />
            </div>
            <span className="text-[18px] font-black text-[#010136]">
              {language === 'TH' ? 'นำเข้าข้อมูลด้วย Excel' : 'Import with Excel'}
            </span>
          </div>
        }
        open={isImportDrawerOpen}
        onClose={() => setIsImportDrawerOpen(false)}
        footer={
          <div className="flex justify-end gap-2.5 py-1">
            <button
              onClick={() => setIsImportDrawerOpen(false)}
              className="px-4 py-2 border border-slate-200 text-slate-600 font-bold rounded-[4px] hover:bg-slate-50 transition-colors text-xs inline-flex items-center justify-center cursor-pointer mr-1.5 h-[36px]"
            >
              {t.cancel}
            </button>
            <button
              onClick={handleSaveImportedRecords}
              disabled={parsedRecords.length === 0}
              className={`px-4 py-2 font-bold rounded-[4px] transition-colors text-xs inline-flex items-center justify-center cursor-pointer border-none h-[36px] ${
                parsedRecords.length === 0 
                  ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                  : 'bg-emerald-600 hover:bg-emerald-700 text-white'
              }`}
            >
              {language === 'TH' ? `ยืนยันนำเข้า (${parsedRecords.length} รายการ)` : `Confirm Import (${parsedRecords.length} items)`}
            </button>
          </div>
        }
        styles={{ wrapper: { width: 500 } }}
        placement="right"
      >
        <div className="space-y-5 pt-1 text-[#010136]">
          {/* Download Template Banner Section */}
          <div className="p-4 bg-[#1f5df9]/5 rounded-[16px] border border-[#1f5df9]/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-3xs">
            <div className="space-y-1">
              <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider">
                {language === 'TH' ? 'ต้องการเทมเพลตสำหรับเติมข้อมูล?' : 'Need a template to fill data?'}
              </h4>
              <p className="text-[11px] font-bold text-[#1f5df9]">
                {language === 'TH' ? 'กรอกตามคอลัมน์มาตรฐานเพื่อนำเข้าระบบ' : 'Please upload following standard schema columns.'}
              </p>
            </div>
            <button
              onClick={handleDownloadTemplate}
              className="px-3 py-1.5 bg-[#1f5df9] text-white hover:bg-[#1f5df9]/95 text-xs font-bold rounded-[4px] border-none inline-flex items-center gap-1.5 cursor-pointer shrink-0 shadow-sm shadow-[#1f5df9]/20 transition-all"
            >
              <Download size={12} />
              <span>{language === 'TH' ? 'ดาวน์โหลดแม่แบบ' : 'Template'}</span>
            </button>
          </div>

          {/* Guide Section */}
          <div className="space-y-1.5 text-xs text-slate-500 font-bold leading-relaxed bg-slate-50 p-4 rounded-[16px] border border-slate-100">
            <h5 className="font-black text-[#010136] text-[12px] uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <HelpCircle size={14} className="text-slate-400" />
              <span>{language === 'TH' ? 'รูปแบบไฟล์ที่กำหนด (Standard Format)' : 'Standard Format Guide'}</span>
            </h5>
            <ol className="list-decimal pl-4 space-y-1">
              <li>{language === 'TH' ? 'คอลัมน์แรก (Column A) = ชื่อหลักในระบบ (System Value)' : 'Column A = System Target Name Value (e.g., Apple Inc.)'}</li>
              <li>{language === 'TH' ? 'คอลัมน์ที่สอง (Column B) = คำคีย์เวิร์ดสำหรับจับคู่ (Matching Keys) เช่น "สยามอินดัสทรี, Siam Ind" (คั่นด้วยจุลภาค)' : 'Column B = Match keys separated by comma (e.g. Apple, AAPL)'}</li>
              <li>{language === 'TH' ? 'ยกเว้นแถวแรกสุด (แถวที่ 1) เป็นหัวตาราง (Headers)' : 'Row 1 inside the sheet will be skipped as headers block.'}</li>
            </ol>
          </div>

          {/* File Upload Area */}
          <div className="space-y-1.5">
            <label className="text-xs font-black text-slate-600 uppercase tracking-wider block">
              {language === 'TH' ? 'เลือกไฟล์ข้อมูลสเปรดชีต' : 'Select Spreadsheet File'}
            </label>
            
            <div 
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`p-6 border border-dashed rounded-[4px] cursor-pointer transition-all flex flex-col items-center justify-center text-center space-y-3 min-h-[140px] select-none ${
                isDragging 
                  ? 'border-[#1f5df9] bg-blue-50/40 shadow-xs' 
                  : 'border-slate-200 hover:border-[#1f5df9] bg-slate-50/30 hover:bg-white hover:shadow-xs'
              }`}
            >
              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleFileChange} 
                accept=".xlsx, .xls, .csv" 
                className="hidden" 
              />
              
              <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100">
                <Upload size={20} />
              </div>

              <div className="space-y-1">
                <p className="text-xs font-black text-[#010136]">
                  {language === 'TH' ? 'ลากไฟล์มาวางที่นี่ หรือคลิกเพื่ออัปโหลด' : 'Drag & drop Excel here, or click to browse'}
                </p>
                <p className="text-[10px] font-bold text-slate-400">
                  {language === 'TH' ? 'รองรับเฉพาะไฟล์ .xlsx, .xls หรือ .csv' : 'Supports .xlsx, .xls or .csv spreadsheets'}
                </p>
              </div>
            </div>
          </div>

          {/* Error Banner */}
          {importError && (
            <div className="p-3 bg-red-50 text-red-600 border border-red-100 rounded-[4px] text-xs font-bold leading-snug flex items-start gap-2 animate-in fade-in slide-in-from-top-1 duration-200">
              <ShieldAlert size={14} className="shrink-0 mt-0.5 text-red-500" />
              <span>{importError}</span>
            </div>
          )}

          {/* Parsed Preview Section */}
          {parsedRecords.length > 0 && (
            <div className="space-y-3 flex-1 flex flex-col">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-slate-600 uppercase tracking-wider">
                  {language === 'TH' ? `พบรายการทั้งหมด (${parsedRecords.length} รายการ)` : `Found records (${parsedRecords.length} items)`}
                </span>

                {duplicateWarningCount > 0 && (
                  <span className="inline-flex items-center gap-1 bg-amber-50 text-amber-700 text-[10px] font-black border border-amber-200 rounded-[4px] px-2 py-0.5 animate-pulse">
                    <ShieldAlert size={11} />
                    <span>{language === 'TH' ? `คีย์ทับซ้อนข้อมูลเดิม ${duplicateWarningCount} รายการ` : `${duplicateWarningCount} overlapping keys`}</span>
                  </span>
                )}
              </div>

              {/* Scrollable Preview Wrapper with Border */}
              <div className="border border-slate-200 rounded-[8px] max-h-[190px] overflow-y-auto divide-y divide-slate-100 bg-white shadow-inner">
                {parsedRecords.map((item, idx) => (
                  <div key={item.id} className="p-2.5 text-xs flex justify-between gap-3 hover:bg-slate-50/50">
                    <div className="min-w-0 space-y-0.5">
                      <div className="font-extrabold text-[#010136] truncate leading-tight">
                        {idx + 1}. {item.value}
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {item.keys.map((k, kIdx) => (
                          <span key={kIdx} className="bg-slate-100 font-bold text-slate-500 text-[9px] px-1.5 py-0.5 rounded-[2px]">
                            {k}
                          </span>
                        ))}
                      </div>
                    </div>
                    <span className="shrink-0 text-[10px] font-bold text-emerald-600 uppercase tracking-wide flex items-center gap-1 select-none">
                      <Check size={11} />
                      <span>{language === 'TH' ? 'พร้อม' : 'READY'}</span>
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </Drawer>
    </div>
  );
};
