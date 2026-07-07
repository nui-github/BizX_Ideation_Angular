import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { ArrowLeft, Plus, ShieldCheck, Tag, X, FilePlus, Pencil, Trash2, Check, Copy, ClipboardPaste, ChevronLeft, ChevronRight, AlertCircle } from 'lucide-react';
import { TRANSLATIONS } from '../translations';
import { Language } from '../types';
import { Tooltip } from './Tooltip';
import { DEFAULT_SCHEMAS } from './LabelSchemaSettings';

export const RuleMatrix = ({ rule, onBack, onUpdate, language }: any) => {
  const t = TRANSLATIONS[language as Language] || TRANSLATIONS.EN;
  const [activeRule, setActiveRule] = useState(() => {
    // Normalize rule to ensure Remark is always at the end
    const remarkDocType = t.docTypeRemark;
    const docTypes = [...rule.docTypes];
    const remarkIdx = docTypes.indexOf(remarkDocType);
    
    if (remarkIdx === -1) {
      return {
        ...rule,
        docTypes: [...docTypes, remarkDocType],
        parts: rule.parts.map((p: any) => ({
          ...p,
          rows: p.rows.map((r: any) => ({
            ...r,
            values: [...r.values, { type: 'TEXT', text: '' }]
          }))
        }))
      };
    } else if (remarkIdx !== docTypes.length - 1) {
      const newDocTypes = [...docTypes];
      newDocTypes.splice(remarkIdx, 1);
      newDocTypes.push(remarkDocType);
      
      return {
        ...rule,
        docTypes: newDocTypes,
        parts: rule.parts.map((p: any) => ({
          ...p,
          rows: p.rows.map((r: any) => {
            const newValues = [...r.values];
            const remarkVal = newValues.splice(remarkIdx, 1)[0];
            newValues.push(remarkVal);
            return { ...r, values: newValues };
          })
        }))
      };
    }
    return rule;
  });

  const isFirstRender = useRef(true);

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    const timer = setTimeout(() => {
      onUpdate(activeRule);
    }, 100);
    return () => clearTimeout(timer);
  }, [activeRule, onUpdate]);

  const [editingFieldId, setEditingFieldId] = useState<string | null>(null);
  const [deletingField, setDeletingField] = useState<{partIdx: number, rowIdx: number} | null>(null);
  const [deletingDocType, setDeletingDocType] = useState<number | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  useEffect(() => {
    if (toastMessage) {
      const timer = setTimeout(() => {
        setToastMessage(null);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [toastMessage]);

  const [editFormData, setEditFormData] = useState<any>(null);
  const [newSynonym, setNewSynonym] = useState('');
  const [copiedSynonyms, setCopiedSynonyms] = useState<string[] | null>(null);
  const [openDrawerInfo, setOpenDrawerInfo] = useState<{
    colIdx: number;
    rowId: string;
    fieldName: string;
    docType: string;
  } | null>(null);

  const openDrawerColIdx = openDrawerInfo?.colIdx;
  const openDrawerRowId = openDrawerInfo?.rowId;
  const openDrawerFieldName = openDrawerInfo?.fieldName;

  useEffect(() => {
    if (openDrawerColIdx !== undefined && openDrawerColIdx !== null && editFormData) {
      const drawerVal = editFormData.values[openDrawerColIdx];
      if (drawerVal && drawerVal.type === 'CONDITIONAL') {
        const expectedField = drawerVal.schemaField || openDrawerFieldName || '';
        if (drawerVal.condField !== expectedField) {
          const newValues = [...editFormData.values];
          newValues[openDrawerColIdx] = {
            ...drawerVal,
            condField: expectedField
          };
          setEditFormData((prev: any) => {
            if (!prev) return prev;
            return { ...prev, values: newValues };
          });
        }
      }
    }
  }, [openDrawerColIdx, openDrawerRowId, openDrawerFieldName]);

  const [isAddDocTypeModalOpen, setIsAddDocTypeModalOpen] = useState(false);
  const [selectedNewDocTypes, setSelectedNewDocTypes] = useState<string[]>([]);
  const isTh = language === 'TH';

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

  const uniqueSchemaLabels = Array.from(new Set(
    DEFAULT_SCHEMAS.flatMap(schema => 
      schema.configs?.flatMap(config => 
        config.labels.map(label => label.name)
      ) || []
    )
  )).sort();

  const getSchemasForDocType = (colName: string): any[] => {
    const docTypeId = getDocTypeIdFromColName(colName);
    return DEFAULT_SCHEMAS.filter(schema => 
      schema.configs?.some(cfg => cfg.docTypeId === docTypeId)
    );
  };

  const isArrayField = (field: string) => {
    if (!field) return false;
    const fL = field.toLowerCase();
    return fL.startsWith('items.') || fL.startsWith('item.') || fL.includes('items') || fL.includes('goods') || fL.includes('packed') || fL.includes('containers');
  };

  const getLabelsForDocTypeAndSchema = (colName: string, schemaId: string): string[] => {
    const docTypeId = getDocTypeIdFromColName(colName);
    if (schemaId) {
      const schema = DEFAULT_SCHEMAS.find(s => s.id === schemaId);
      if (schema) {
        const config = schema.configs?.find(cfg => cfg.docTypeId === docTypeId);
        if (config) {
          return config.labels.map(lbl => lbl.name);
        }
      }
    } else {
      const schemas = getSchemasForDocType(colName);
      if (schemas.length === 1) {
        const config = schemas[0].configs?.find((cfg: any) => cfg.docTypeId === docTypeId);
        if (config) {
          return config.labels.map((lbl: any) => lbl.name);
        }
      }
    }
    return [];
  };

  const handleCopyTags = (synonyms: string[]) => {
    if (!synonyms || synonyms.length === 0) return;
    setCopiedSynonyms([...synonyms]);
    setToastMessage(t.copyTagsSuccess);
  };

  const handlePasteTags = (vIdx: number) => {
    if (!copiedSynonyms || copiedSynonyms.length === 0) return;
    
    const newValues = [...editFormData.values];
    const currentSynonyms = newValues[vIdx].synonyms || [];
    
    // Merge and remove duplicates
    const merged = Array.from(new Set([...currentSynonyms, ...copiedSynonyms]));
    
    const currentType = newValues[vIdx].type;
    const finalType = (currentType === 'FUZZY' || currentType === 'NEARLY') ? currentType : 'NEARLY';
    newValues[vIdx] = { 
      ...newValues[vIdx], 
      synonyms: merged,
      type: finalType
    };
    
    setEditFormData({ ...editFormData, values: newValues });
    setToastMessage(t.pasteTagsSuccess);
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'EXACT': 
        return language === 'TH' ? 'ตรงกัน (EXACT)' : 'Exact (EXACT)';
      case 'NEARLY':
      case 'SYNONYM': 
        return 'Nearly (NEARLY)';
      case 'FUZZY': 
        return 'Fuzzy (FUZZY)';
      case 'BILINGUAL':
        return language === 'TH' ? 'Bilingual (แปลความหมาย)' : 'Bilingual (BILINGUAL)';
      case 'NUMBER_WORD':
        return language === 'TH' ? 'ตัวเลข / คำอ่าน (NUMBER/WORD)' : 'Number / Word (NUMBER_WORD)';
      case 'EXISTENCE':
        return language === 'TH' ? 'ความมีอยู่ (EXISTENCE)' : 'Existence (EXISTENCE)';
      case 'MASTER_LOOKUP':
        return language === 'TH' ? 'Master lookup (ฐานข้อมูล)' : 'Master lookup (MASTER_LOOKUP)';
      case 'CONDITIONAL':
        return language === 'TH' ? 'เปรียบเทียบตามเงื่อนไข (CONDITIONAL)' : 'Conditional (CONDITIONAL)';
      case 'DATE_NORMALIZATION':
        return language === 'TH' ? 'ปรับรูปแบบวันที่ (DATE)' : 'Date (DATE_NORMALIZATION)';
      case 'CROSS_FLOW_CARRY':
        return language === 'TH' ? 'ส่งผ่านค่า (CROSS-FLOW CARRY)' : 'Cross-flow carry (CROSS_FLOW_CARRY)';
      case 'NONE': 
        return language === 'TH' ? 'ไม่เปรียบเทียบ (NONE)' : 'None (NONE)';
      case '':
      case undefined:
        return language === 'TH' ? 'ยังไม่ได้เลือก' : 'Not Selected';
      default: 
        return type;
    }
  };

  const startEdit = (row: any) => {
    setEditingFieldId(row.id);
    setEditFormData({ 
      ...row, 
      values: row.values.map((v: any) => ({ ...v, synonyms: [...(v.synonyms || [])] }))
    });
  };

  const saveEdit = (partIdx: number, rowIdx: number) => {
    const newParts = [...activeRule.parts];
    newParts[partIdx].rows[rowIdx] = { ...editFormData };
    setActiveRule({ ...activeRule, parts: newParts });
    setEditingFieldId(null);
    setOpenDrawerInfo(null);
    setToastMessage('บันทึกการแก้ไขเรียบร้อยแล้ว');
  };

  const handleAddField = (partId: string) => {
    const newField = {
      id: `f_${Date.now()}`,
      detail: 'New Field',
      values: activeRule.docTypes.map((d: string) => 
        d === t.docTypeRemark ? { type: 'TEXT', text: '' } : { type: '', synonyms: [] }
      ),
      note: ''
    };
    const newParts = [...activeRule.parts];
    const partIndex = newParts.findIndex((p: any) => p.title === partId);
    if (partIndex >= 0) {
      newParts[partIndex].rows.push(newField);
    }
    setActiveRule({...activeRule, parts: newParts});
  };

  const handleDeleteField = (partIdx: number, rowIdx: number) => {
    setDeletingField({ partIdx, rowIdx });
  };

  const confirmDelete = () => {
    if (!deletingField) return;
    const newParts = [...activeRule.parts];
    newParts[deletingField.partIdx] = {
      ...newParts[deletingField.partIdx],
      rows: newParts[deletingField.partIdx].rows.filter((_: any, i: number) => i !== deletingField.rowIdx)
    };
    setActiveRule({ ...activeRule, parts: newParts });
    setDeletingField(null);
  };

  const handleAddDocType = () => {
    setSelectedNewDocTypes([]);
    setIsAddDocTypeModalOpen(true);
  };

  const toggleNewDocType = (docType: string) => {
    setSelectedNewDocTypes(prev => {
      if (prev.includes(docType)) {
        return prev.filter(d => d !== docType);
      } else {
        return [...prev, docType];
      }
    });
  };

  const confirmAddDocType = () => {
    if (selectedNewDocTypes.length === 0) return;

    setActiveRule((prevRule: any) => {
      const remarkIdx = prevRule.docTypes.findIndex((d: string) => d === t.docTypeRemark);
      const isRemarkPresent = remarkIdx !== -1;
      const insertIdx = isRemarkPresent ? remarkIdx : prevRule.docTypes.length;

      const newDocTypes = [...prevRule.docTypes];
      newDocTypes.splice(insertIdx, 0, ...selectedNewDocTypes);

      return {
        ...prevRule,
        docTypes: newDocTypes,
        parts: prevRule.parts.map((p: any) => ({
          ...p,
          rows: p.rows.map((r: any) => {
            const newValues = [...r.values];
            const emptyVals = selectedNewDocTypes.map(() => ({ type: '', synonyms: [] }));
            newValues.splice(insertIdx, 0, ...emptyVals);
            return {
              ...r,
              values: newValues
            };
          })
        }))
      };
    });
    setIsAddDocTypeModalOpen(false);
  };

  const handleDeleteDocType = (idx: number) => {
    setDeletingDocType(idx);
  };

  const confirmDeleteDocType = () => {
    if (deletingDocType === null) return;
    
    // Prevent deleting Remark column
    if (activeRule.docTypes[deletingDocType] === t.docTypeRemark) {
      setDeletingDocType(null);
      return;
    }
    
    setActiveRule((prevRule: any) => {
      const newDocTypes = prevRule.docTypes.filter((_: any, i: number) => i !== deletingDocType);
      
      return {
        ...prevRule,
        docTypes: newDocTypes,
        parts: prevRule.parts.map((p: any) => ({
          ...p,
          rows: p.rows.map((r: any) => ({
            ...r,
            values: r.values.filter((_: any, i: number) => i !== deletingDocType)
          }))
        }))
      };
    });
    setDeletingDocType(null);
  };

  const handleMoveDocType = (idx: number, direction: 'left' | 'right') => {
    const targetIdx = direction === 'left' ? idx - 1 : idx + 1;
    const lastIdx = activeRule.docTypes.length - 1;
    
    if (idx < 0 || idx >= lastIdx || targetIdx < 0 || targetIdx >= lastIdx) {
      return;
    }

    setActiveRule((prevRule: any) => {
      const newDocTypes = [...prevRule.docTypes];
      const tempDocType = newDocTypes[idx];
      newDocTypes[idx] = newDocTypes[targetIdx];
      newDocTypes[targetIdx] = tempDocType;

      const newParts = prevRule.parts.map((p: any) => ({
        ...p,
        rows: p.rows.map((r: any) => {
          const newValues = [...r.values];
          const tempValue = newValues[idx];
          newValues[idx] = newValues[targetIdx];
          newValues[targetIdx] = tempValue;
          return {
            ...r,
            values: newValues
          };
        })
      }));

      return {
        ...prevRule,
        docTypes: newDocTypes,
        parts: newParts
      };
    });
  };

  const isAnyEditing = editingFieldId !== null;
  const colWidth = isAnyEditing ? 320 : 160;

  return (
    <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-sm space-y-6 animate-in fade-in duration-500 w-full" id="rule-matrix-wrapper">
      {/* Header Bar */}
      <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-2">
        <div className="flex items-center gap-4 flex-1 min-w-0">
          <button onClick={onBack} className="w-10 h-10 rounded-[4px] bg-slate-50 hover:bg-slate-100 flex items-center justify-center text-slate-600 transition-colors flex-shrink-0">
            <ArrowLeft size={20} />
          </button>
          <div className="flex-1 min-w-0">
            <div className="mb-2">
              <div className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-black tracking-tight border ${
                activeRule.status === 'Active' 
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-100' 
                  : 'bg-slate-50 text-slate-600 border-slate-200'
              }`}>
                <span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${
                  activeRule.status === 'Active' ? 'bg-emerald-500' : 'bg-slate-400'
                }`}></span>
                {activeRule.status === 'Active' ? t.active : t.inactive}
              </div>
            </div>
            <div className="flex items-center gap-3">
              <input 
                type="text" 
                className="text-xl md:text-2xl font-black text-slate-800 tracking-tight bg-transparent border-b-2 border-transparent hover:border-slate-200 focus:border-blue-500 outline-none w-full transition-colors"
                value={language === 'TH' ? (activeRule.nameTh || activeRule.name || '') : (activeRule.name || '')}
                maxLength={250}
                onChange={(e) => {
                  if (language === 'TH') {
                    setActiveRule({...activeRule, nameTh: e.target.value});
                  } else {
                    setActiveRule({...activeRule, name: e.target.value});
                  }
                }}
              />
            </div>
            <input 
              type="text" 
              className="text-slate-500 text-sm tracking-tight bg-transparent border-b border-transparent hover:border-slate-200 focus:border-blue-500 outline-none w-full transition-colors mt-1"
              value={language === 'TH' ? (activeRule.descriptionTh || activeRule.description || '') : (activeRule.description || '')}
              maxLength={250}
              onChange={(e) => {
                if (language === 'TH') {
                  setActiveRule({...activeRule, descriptionTh: e.target.value});
                } else {
                  setActiveRule({...activeRule, description: e.target.value});
                }
              }}
            />
          </div>
        </div>
        <div className="flex flex-col sm:flex-row items-center gap-2 flex-shrink-0 ml-4">
           <div className="flex items-center gap-2 px-3 py-1.5 bg-white rounded-lg border border-slate-200 shadow-sm h-9">
             <span className="font-bold text-xs tracking-tight text-slate-700">
               {language === 'TH' ? 'เปิด/ปิดการใช้งาน' : 'Enable/Disable'}
             </span>
             <button 
               type="button"
               onClick={() => {
                 const newStatus = activeRule.status === 'Active' ? 'Inactive' : 'Active';
                 setActiveRule({...activeRule, status: newStatus});
               }}
               className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                 activeRule.status === 'Active' ? 'bg-emerald-500' : 'bg-slate-300'
               }`}
             >
               <span
                 aria-hidden="true"
                 className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                   activeRule.status === 'Active' ? 'translate-x-4' : 'translate-x-0'
                 }`}
               />
             </button>
           </div>
           <button onClick={handleAddDocType} className="flex items-center gap-2 px-3 py-1.5 bg-white border border-blue-600 hover:bg-blue-50 text-blue-600 rounded-[4px] transition-colors font-bold text-xs md:text-sm tracking-tight w-full sm:w-auto h-9 shadow-sm whitespace-nowrap">
             <FilePlus size={14} />
             <span>{language === 'TH' ? 'เพิ่ม Doc Type' : 'Add Doc Type'}</span>
           </button>
           <button 
             onClick={() => {
               onUpdate(activeRule);
               setToastMessage(language === 'TH' ? 'บันทึกกฎเกณฑ์สำเร็จ' : 'Rule saved successfully');
               setTimeout(() => onBack(), 700);
             }} 
             className="flex items-center gap-2 px-4 py-1.5 bg-blue-600 border border-transparent hover:bg-blue-700 text-white rounded-[4px] transition-colors font-bold text-xs md:text-sm tracking-tight w-full sm:w-auto h-9 shadow-sm whitespace-nowrap"
           >
             <Check size={14} />
             <span>{language === 'TH' ? 'บันทึกกฎเกณฑ์' : 'Save Rule'}</span>
           </button>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-auto relative pb-32 max-h-[75vh]"> {/* Added padding for dropdowns and max-height for sticky to work */}
          <table className="w-full text-left border-collapse" style={{ minWidth: `${180 + activeRule.docTypes.length * colWidth}px`}}>
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="px-6 py-3 text-[10px] font-black text-slate-500 uppercase tracking-widest sticky top-0 left-0 bg-slate-50 z-[50] shadow-[2px_2px_5px_rgba(0,0,0,0.02)] min-w-[180px] w-[180px] outline outline-1 outline-slate-200 h-[40px]">Field Name</th>
                {activeRule.docTypes.map((col: string, idx: number) => {
                  const isRemark = col === t.docTypeRemark;
                  const canMoveLeft = !isRemark && idx > 0;
                  const canMoveRight = !isRemark && idx < activeRule.docTypes.length - 2;

                  return (
                    <th key={idx} className="px-4 py-3 text-center text-[10px] font-black uppercase tracking-tight sticky top-0 z-[30] outline outline-1 outline-slate-200 h-[40px] bg-slate-100 text-slate-500" style={{ minWidth: `${colWidth}px`, maxWidth: `${colWidth}px`, width: `${colWidth}px` }}>
                      <div className="flex items-center justify-between gap-1 w-full group/head relative">
                        {/* Left button space to keep centering */}
                        <div className="flex items-center w-[20px] justify-start shrink-0">
                          {canMoveLeft && (
                            <button 
                              type="button"
                              onClick={() => handleMoveDocType(idx, 'left')} 
                              className="opacity-0 group-hover/head:opacity-100 text-slate-400 hover:text-blue-600 transition-all p-0.5 rounded-[4px] hover:bg-slate-200 flex-shrink-0 active:scale-95 cursor-pointer"
                              title={language === 'TH' ? 'ย้ายไปซ้าย' : 'Move Left'}
                            >
                              <ChevronLeft size={13} />
                            </button>
                          )}
                        </div>

                        {/* Title text */}
                        <div className="truncate flex-1 text-center font-black px-1" title={col}>
                          {col}
                        </div>

                        {/* Right buttons container */}
                        <div className="flex items-center w-[36px] justify-end gap-1 shrink-0">
                          {canMoveRight && (
                            <button 
                              type="button"
                              onClick={() => handleMoveDocType(idx, 'right')} 
                              className="opacity-0 group-hover/head:opacity-100 text-slate-400 hover:text-blue-600 transition-all p-0.5 rounded-[4px] hover:bg-slate-200 flex-shrink-0 active:scale-95 cursor-pointer"
                              title={language === 'TH' ? 'ย้ายไปขวา' : 'Move Right'}
                            >
                              <ChevronRight size={13} />
                            </button>
                          )}

                          {!isRemark && (
                            <button 
                              type="button"
                              onClick={() => handleDeleteDocType(idx)} 
                              className="opacity-0 group-hover/head:opacity-100 text-slate-350 hover:text-red-500 transition-all p-0.5 rounded-[4px] hover:bg-red-50 flex-shrink-0 cursor-pointer"
                              title={language === 'TH' ? 'ลบประเภทเอกสาร' : 'Delete Document Type'}
                            >
                              <Trash2 size={12} />
                            </button>
                          )}
                        </div>
                      </div>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {activeRule.parts.map((section: any, sIdx: number) => (
                <React.Fragment key={sIdx}>
                  <tr className="bg-blue-50/50">
                    <td colSpan={activeRule.docTypes.length + 1} className="py-2.5 text-[11px] font-black text-blue-700 uppercase tracking-widest sticky top-[40px] bg-blue-50 z-[35] shadow-[0_2px_5px_rgba(0,0,0,0.02)] outline outline-1 outline-blue-100">
                      <div className="sticky left-6 w-fit px-6">{section.title}</div>
                    </td>
                  </tr>
                  {section.rows.map((row: any, rIdx: number) => {
                    const isEditing = editingFieldId === row.id;
                    return (
                      <tr key={row.id} className={`${isEditing ? 'bg-blue-50/30' : 'hover:bg-slate-50/50'} transition-colors group`}>
                        <td className="px-6 py-4 text-xs font-bold text-slate-700 sticky left-0 bg-white z-[20] shadow-[2px_0_5px_rgba(0,0,0,0.02)] border-r border-slate-100 align-top">
                          {isEditing ? (
                             <div className="flex flex-col gap-2 relative">
                               <input type="text" className="w-full bg-white border border-blue-300 rounded-md px-2 py-1 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-blue-100" 
                                  value={language === 'TH' ? (editFormData?.detailTh || editFormData?.detail || '') : (editFormData?.detail || '')} 
                                  onChange={(e) => {
                                    if (language === 'TH') {
                                      setEditFormData({...editFormData, detailTh: e.target.value});
                                    } else {
                                      setEditFormData({...editFormData, detail: e.target.value});
                                    }
                                  }} 
                                  autoFocus
                               />
                               <div className="flex items-center justify-start gap-2 pt-1">
                                  <button 
                                    onClick={() => saveEdit(sIdx, rIdx)} 
                                    disabled={!(language === 'TH' ? (editFormData?.detailTh || editFormData?.detail) : editFormData?.detail) || !editFormData?.values.every((v: any, vIdx: number) => {
                                      const isRemarkCol = activeRule.docTypes[vIdx] === t.docTypeRemark;
                                      return v.type === 'NONE' || !v.type || isRemarkCol || !!v.schemaField;
                                    })}
                                    className="px-3 py-1 bg-blue-600 text-white rounded-[4px] text-[10px] font-bold uppercase tracking-widest shadow-sm hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed">Save</button>
                                  <button onClick={() => { setEditingFieldId(null); setOpenDrawerInfo(null); }} className="px-3 py-1 bg-slate-100 text-slate-600 rounded-[4px] text-[10px] font-bold uppercase tracking-widest hover:bg-slate-200">Cancel</button>
                               </div>
                             </div>
                          ) : (
                             <div className="flex items-center justify-between min-h-[24px]">
                               <span>{language === 'TH' && row.detailTh ? row.detailTh : row.detail}</span>
                               <div className="flex items-center gap-1 opacity-100 transition-opacity">
                                 <Tooltip content="แก้ไข">
                                   <button onClick={() => startEdit(row)} className="w-6 h-6 rounded-[4px] flex items-center justify-center text-slate-300 hover:text-blue-600 hover:bg-blue-50 transition-colors">
                                     <Pencil size={12} />
                                   </button>
                                 </Tooltip>
                                 <Tooltip content="ลบ">
                                   <button onClick={() => handleDeleteField(sIdx, rIdx)} className="w-6 h-6 rounded-[4px] flex items-center justify-center text-slate-300 hover:text-red-600 hover:bg-red-50 transition-colors">
                                     <Trash2 size={12} />
                                   </button>
                                 </Tooltip>
                               </div>
                             </div>
                          )}
                        </td>
                        {row.values.map((val: any, vIdx: number) => {
                           const currentVal = isEditing ? editFormData.values[vIdx] : val;
                           const isRemarkCol = activeRule.docTypes[vIdx] === t.docTypeRemark;
                           const allRuleFields = activeRule?.parts?.flatMap((p: any) => p.rows.map((r: any) => r.detail)) || [];
                           return (
                             <td key={vIdx} style={{ minWidth: `${colWidth}px`, maxWidth: `${colWidth}px`, width: `${colWidth}px` }} className={`px-4 py-4 text-center border-r border-slate-50 transition-colors last:border-r-0 align-top ${isEditing ? 'bg-white' : ''}`}>
                               {isEditing ? (
                                  isRemarkCol ? (
                                    <textarea
                                      rows={2}
                                      className="w-full bg-slate-50 border border-slate-200 rounded-md px-2 py-1.5 text-[10px] font-bold text-slate-700 focus:border-blue-400 outline-none transition-colors resize-none"
                                      value={currentVal?.text || ''}
                                      onChange={(e) => {
                                        const newValues = [...editFormData.values];
                                        newValues[vIdx] = { ...newValues[vIdx], text: e.target.value, type: 'TEXT' };
                                        setEditFormData({...editFormData, values: newValues});
                                      }}
                                      placeholder="Type remark here..."
                                    />
                                  ) : (
                                  <div className="flex flex-col gap-2">
                                    <div className="flex items-center gap-1.5 justify-center mb-1">
                                      <input 
                                        type="checkbox" 
                                        id={`main-doc-${row.id}-${vIdx}`}
                                        checked={currentVal?.isMain || false}
                                        onChange={(e) => {
                                          const checked = e.target.checked;
                                          const newValues = editFormData.values.map((v: any, index: number) => ({
                                            ...v,
                                            isMain: index === vIdx ? checked : false,
                                            type: index === vIdx && checked ? '' : v.type
                                          }));
                                          setEditFormData({...editFormData, values: newValues});
                                        }}
                                        className="w-3 h-3 text-blue-600 rounded border-slate-300 focus:ring-blue-500 cursor-pointer accent-blue-600"
                                      />
                                      <label htmlFor={`main-doc-${row.id}-${vIdx}`} className="text-[9px] font-bold tracking-tight uppercase text-blue-600 cursor-pointer select-none">
                                        {language === 'TH' ? 'เอกสารหลัก' : 'Main Doc'}
                                      </label>
                                    </div>
                                    {(() => {
                                      const docColName = activeRule.docTypes[vIdx];
                                      const schemasForDoc = getSchemasForDocType(docColName);
                                      const hasMultipleSchemas = schemasForDoc.length > 1;
                                      
                                      const docTypeId = getDocTypeIdFromColName(docColName);
                                      const selectedSchemaId = currentVal?.schemaId || (currentVal?.schemaField ? DEFAULT_SCHEMAS.find(schema => 
                                        schema.configs?.some(cfg => 
                                          cfg.docTypeId === docTypeId && 
                                          cfg.labels.some(lbl => lbl.name === currentVal.schemaField)
                                        )
                                      )?.id : '');

                                      const labelsToDisplay = getLabelsForDocTypeAndSchema(docColName, selectedSchemaId);

                                      return (
                                        <>
                                          {hasMultipleSchemas && (
                                            <select
                                              className="w-full border border-slate-200 bg-slate-50 rounded px-2 py-1.5 text-[10px] font-bold text-slate-700 outline-none focus:border-blue-400 mb-2"
                                              style={{ borderRadius: '4px' }}
                                              value={selectedSchemaId}
                                              onChange={(e) => {
                                                const sId = e.target.value;
                                                const newValues = [...editFormData.values];
                                                newValues[vIdx] = { 
                                                  ...newValues[vIdx], 
                                                  schemaId: sId,
                                                  schemaField: '' // reset label map when schema changes
                                                };
                                                setEditFormData({...editFormData, values: newValues});
                                              }}
                                            >
                                              <option value="">{language === 'TH' ? 'เลือกรายการ Schema' : 'Select Schema'}</option>
                                              {schemasForDoc.map(schema => (
                                                <option key={schema.id} value={schema.id}>{schema.name}</option>
                                              ))}
                                            </select>
                                          )}

                                          <select
                                            className={`w-full border rounded-md px-2 py-1.5 text-[10px] font-bold text-slate-700 outline-none transition-colors mb-2 ${
                                              currentVal?.type !== 'NONE' && currentVal?.type && !currentVal?.schemaField 
                                                ? 'border-red-400 focus:border-red-500 ring-1 ring-red-400 bg-red-50' 
                                                : 'border-slate-200 focus:border-blue-400 bg-slate-50'
                                            }`}
                                            value={currentVal?.schemaField || ''}
                                            disabled={hasMultipleSchemas && !selectedSchemaId}
                                            onChange={(e) => {
                                              const labelVal = e.target.value;
                                              const newValues = [...editFormData.values];
                                              newValues[vIdx] = { 
                                                ...newValues[vIdx], 
                                                schemaField: labelVal,
                                                schemaId: selectedSchemaId 
                                              };
                                              if (!labelVal) {
                                                newValues[vIdx].type = '';
                                              }
                                              setEditFormData({...editFormData, values: newValues});
                                            }}
                                            style={{ borderRadius: '4px' }}
                                          >
                                            <option value="">
                                              {hasMultipleSchemas && !selectedSchemaId 
                                                ? (language === 'TH' ? 'กรุณาเลือก Schema ก่อน' : 'Please select Schema first')
                                                : (language === 'TH' ? 'เลือก Label' : 'Select Label')
                                              }
                                            </option>
                                            {labelsToDisplay.map(label => (
                                              <option key={label} value={label}>{label}</option>
                                            ))}
                                          </select>
                                        </>
                                      );
                                    })()}
                                    {!!currentVal?.schemaField && currentVal?.isMain && isArrayField(currentVal?.schemaField) && (
                                      <div className="bg-slate-50 border border-slate-200/60 p-3 rounded-lg text-left mt-2 flex flex-col gap-2.5 shadow-sm relative">
                                        <div className="text-[10px] font-black tracking-wider text-slate-400 uppercase select-none">
                                          {language === 'TH' ? 'ARRAY ITEM MATCHING' : 'ARRAY ITEM MATCHING'}
                                        </div>
                                        
                                        {/* Radios for Mode Selection */}
                                        <div className="flex gap-4 items-center">
                                          <label className="flex items-center gap-1.5 cursor-pointer text-[11px] font-bold text-slate-700 select-none">
                                            <input 
                                              type="radio"
                                              name={`arrayMatchingMode-${row.id}-${vIdx}`}
                                              checked={currentVal?.arrayMatchingMode !== 'position'}
                                              onChange={() => {
                                                const newValues = [...editFormData.values];
                                                newValues[vIdx] = {
                                                  ...newValues[vIdx],
                                                  arrayMatchingMode: 'key-based',
                                                  arrayMatchingKey: newValues[vIdx].arrayMatchingKey || ['itemId'],
                                                  arrayMatchingFields: newValues[vIdx].arrayMatchingFields || ['hsCode', 'description', 'quantity'],
                                                  fallbackToIndex: newValues[vIdx].fallbackToIndex !== false
                                                };
                                                setEditFormData({...editFormData, values: newValues});
                                              }}
                                              className="w-3.5 h-3.5 text-blue-600 border-slate-300 focus:ring-blue-500 accent-blue-600 cursor-pointer"
                                            />
                                            <span>Key-based</span>
                                          </label>
                                          
                                          <label className="flex items-center gap-1.5 cursor-pointer text-[11px] font-bold text-slate-700 select-none">
                                            <input 
                                              type="radio"
                                              name={`arrayMatchingMode-${row.id}-${vIdx}`}
                                              checked={currentVal?.arrayMatchingMode === 'position'}
                                              onChange={() => {
                                                const newValues = [...editFormData.values];
                                                newValues[vIdx] = {
                                                  ...newValues[vIdx],
                                                  arrayMatchingMode: 'position'
                                                };
                                                setEditFormData({...editFormData, values: newValues});
                                              }}
                                              className="w-3.5 h-3.5 text-blue-600 border-slate-300 focus:ring-blue-500 accent-blue-600 cursor-pointer"
                                            />
                                            <span>By position</span>
                                          </label>
                                        </div>

                                        {/* Inputs if Key-based is selected */}
                                        {currentVal?.arrayMatchingMode !== 'position' && (
                                          <div className="flex flex-col gap-2 mt-0.5 animate-in fade-in duration-150">
                                            {/* Key Selection Multi-Select */}
                                            <div className="relative" id={`array-key-wrapper-${row.id}-${vIdx}`}>
                                              <div className="w-full bg-white border border-slate-200 focus:border-blue-500 rounded p-1.5 flex flex-wrap items-center gap-1 min-h-[30px] pr-6 cursor-pointer" style={{ borderRadius: '4px' }} onClick={() => {
                                                const el = document.getElementById(`array-keys-dropdown-${row.id}-${vIdx}`);
                                                if (el) el.classList.toggle('hidden');
                                              }}>
                                                {(Array.isArray(currentVal?.arrayMatchingKey) ? currentVal.arrayMatchingKey : (typeof currentVal?.arrayMatchingKey === 'string' ? [currentVal.arrayMatchingKey] : ['itemId'])).map((fld: string) => (
                                                  <span key={fld} className="inline-flex items-center gap-1 bg-slate-100 text-slate-700 text-[9.5px] font-bold px-1.5 py-0.5 rounded border border-slate-200">
                                                    {fld}
                                                    <button 
                                                      type="button"
                                                      onClick={(e) => {
                                                        e.stopPropagation();
                                                        const currentKeys = Array.isArray(currentVal?.arrayMatchingKey) ? currentVal.arrayMatchingKey : (typeof currentVal?.arrayMatchingKey === 'string' ? [currentVal.arrayMatchingKey] : ['itemId']);
                                                        const nextKeys = currentKeys.filter((f: string) => f !== fld);
                                                        const newValues = [...editFormData.values];
                                                        newValues[vIdx] = {
                                                          ...newValues[vIdx],
                                                          arrayMatchingKey: nextKeys.length > 0 ? nextKeys : ['itemId'] // prevent empty
                                                        };
                                                        setEditFormData({...editFormData, values: newValues});
                                                      }}
                                                      className="text-slate-400 hover:text-red-500 font-bold ml-0.5 select-none cursor-pointer"
                                                    >
                                                      ×
                                                    </button>
                                                  </span>
                                                ))}
                                                <div className="absolute right-1.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
                                                  <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-chevron-down"><path d="m6 9 6 6 6-6"/></svg>
                                                </div>
                                              </div>

                                              {/* Toggle popup options for multi-select */}
                                              <div id={`array-keys-dropdown-${row.id}-${vIdx}`} className="absolute left-0 right-0 top-full mt-1 bg-white border border-slate-200 rounded-md shadow-lg z-[200] hidden p-1.5 text-left flex flex-col gap-1 max-h-[150px] overflow-y-auto">
                                                {['itemId', 'itemCode', 'sku', 'productName'].map(opt => {
                                                  const currentKeys = Array.isArray(currentVal?.arrayMatchingKey) ? currentVal.arrayMatchingKey : (typeof currentVal?.arrayMatchingKey === 'string' ? [currentVal.arrayMatchingKey] : ['itemId']);
                                                  const isSelected = currentKeys.includes(opt);
                                                  return (
                                                    <label key={opt} className="flex items-center gap-2 px-1.5 py-1 hover:bg-slate-50 text-[9.5px] font-bold text-slate-600 cursor-pointer select-none">
                                                      <input 
                                                        type="checkbox"
                                                        checked={isSelected}
                                                        onChange={() => {
                                                          const nextKeys = isSelected 
                                                            ? currentKeys.filter((f: string) => f !== opt)
                                                            : [...currentKeys, opt];
                                                          const newValues = [...editFormData.values];
                                                          newValues[vIdx] = {
                                                            ...newValues[vIdx],
                                                            arrayMatchingKey: nextKeys.length > 0 ? nextKeys : ['itemId']
                                                          };
                                                          setEditFormData({...editFormData, values: newValues});
                                                        }}
                                                        className="w-3 h-3 text-blue-600 border-slate-300 focus:ring-blue-500 accent-blue-600 cursor-pointer"
                                                      />
                                                      <span>{opt}</span>
                                                    </label>
                                                  );
                                                })}
                                              </div>
                                            </div>

                                            {/* Multi-select for field lists */}
                                            <div className="relative">
                                              <div className="w-full bg-white border border-blue-400 focus:border-blue-500 rounded p-1.5 flex flex-wrap items-center gap-1 min-h-[30px] pr-6 cursor-pointer" style={{ borderRadius: '4px' }} onClick={() => {
                                                const el = document.getElementById(`array-fields-dropdown-${row.id}-${vIdx}`);
                                                if (el) el.classList.toggle('hidden');
                                              }}>
                                                {(currentVal?.arrayMatchingFields || ['hsCode', 'description', 'quantity']).map((fld: string) => (
                                                  <span key={fld} className="inline-flex items-center gap-1 bg-slate-100 text-slate-700 text-[9.5px] font-bold px-1.5 py-0.5 rounded border border-slate-200">
                                                    {fld}
                                                    <button 
                                                      type="button"
                                                      onClick={(e) => {
                                                        e.stopPropagation();
                                                        const currentFields = currentVal?.arrayMatchingFields || ['hsCode', 'description', 'quantity'];
                                                        const nextFields = currentFields.filter((f: string) => f !== fld);
                                                        const newValues = [...editFormData.values];
                                                        newValues[vIdx] = {
                                                          ...newValues[vIdx],
                                                          arrayMatchingFields: nextFields
                                                        };
                                                        setEditFormData({...editFormData, values: newValues});
                                                      }}
                                                      className="text-slate-400 hover:text-red-500 font-bold ml-0.5 select-none cursor-pointer"
                                                    >
                                                      ×
                                                    </button>
                                                  </span>
                                                ))}
                                                <div className="absolute right-1.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
                                                  <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-chevron-down"><path d="m6 9 6 6 6-6"/></svg>
                                                </div>
                                              </div>

                                              {/* Toggle popup options for multi-select */}
                                              <div id={`array-fields-dropdown-${row.id}-${vIdx}`} className="absolute left-0 right-0 top-full mt-1 bg-white border border-slate-200 rounded-md shadow-lg z-[200] hidden p-1.5 text-left flex flex-col gap-1 max-h-[150px] overflow-y-auto">
                                                {['hsCode', 'description', 'quantity', 'itemId', 'price', 'amount'].map(opt => {
                                                  const isSelected = (currentVal?.arrayMatchingFields || ['hsCode', 'description', 'quantity']).includes(opt);
                                                  return (
                                                    <label key={opt} className="flex items-center gap-2 px-1.5 py-1 hover:bg-slate-50 text-[9.5px] font-bold text-slate-600 cursor-pointer select-none">
                                                      <input 
                                                        type="checkbox"
                                                        checked={isSelected}
                                                        onChange={() => {
                                                          const currentFields = currentVal?.arrayMatchingFields || ['hsCode', 'description', 'quantity'];
                                                          const nextFields = isSelected 
                                                            ? currentFields.filter((f: string) => f !== opt)
                                                            : [...currentFields, opt];
                                                          const newValues = [...editFormData.values];
                                                          newValues[vIdx] = {
                                                            ...newValues[vIdx],
                                                            arrayMatchingFields: nextFields
                                                          };
                                                          setEditFormData({...editFormData, values: newValues});
                                                        }}
                                                        className="w-3 h-3 text-blue-600 border-slate-300 focus:ring-blue-500 accent-blue-600 cursor-pointer"
                                                      />
                                                      <span>{opt}</span>
                                                    </label>
                                                  );
                                                })}
                                              </div>
                                            </div>

                                            {/* Checkbox Fallback to Index */}
                                            <label className="flex items-center gap-2 cursor-pointer text-[10px] font-bold text-slate-600 select-none mt-1">
                                              <input 
                                                type="checkbox"
                                                checked={currentVal?.fallbackToIndex !== false}
                                                onChange={(e) => {
                                                  const newValues = [...editFormData.values];
                                                  newValues[vIdx] = {
                                                    ...newValues[vIdx],
                                                    fallbackToIndex: e.target.checked
                                                  };
                                                  setEditFormData({...editFormData, values: newValues});
                                                }}
                                                className="w-3.5 h-3.5 text-blue-600 rounded border-slate-300 accent-blue-600 focus:outline-none cursor-pointer"
                                              />
                                              <span>{language === 'TH' ? 'Fallback to index' : 'Fallback to index'}</span>
                                            </label>
                                          </div>
                                        )}
                                      </div>
                                    )}
                                    {!!currentVal?.schemaField && !currentVal?.isMain && (
                                      <div className="flex items-center gap-1.5 w-full animate-in fade-in slide-in-from-top-1 duration-200">
                                        <select 
                                          className="flex-1 min-w-0 bg-slate-50 border border-slate-200 rounded px-2 py-1.5 text-[10px] font-bold text-slate-700 focus:border-blue-400 outline-none transition-colors"
                                          style={{ borderRadius: '4px' }}
                                          value={currentVal?.type === 'SYNONYM' ? 'NEARLY' : (currentVal?.type || '')}
                                          onChange={(e) => {
                                             const typeVal = e.target.value;
                                             const newValues = [...editFormData.values];
                                             newValues[vIdx] = { 
                                               ...newValues[vIdx], 
                                               type: typeVal
                                             };
                                             setEditFormData({...editFormData, values: newValues});
                                             
                                             // Auto open the drawer when a compare type is newly selected
                                             if (typeVal && typeVal !== 'NONE') {
                                               setOpenDrawerInfo({
                                                 colIdx: vIdx,
                                                 rowId: row.id,
                                                 fieldName: row.detail,
                                                 docType: activeRule.docTypes[vIdx]
                                               });
                                             } else {
                                               if (openDrawerInfo?.rowId === row.id && openDrawerInfo?.colIdx === vIdx) {
                                                 setOpenDrawerInfo(null);
                                               }
                                             }
                                          }}
                                        >
                                          <option value="">{language === 'TH' ? 'เลือกวิธีการเปรียบเทียบ' : 'Select Style'}</option>
                                          <option value="EXACT">{language === 'TH' ? 'ตรงกัน (EXACT)' : 'Exact (EXACT)'}</option>
                                          <option value="BILINGUAL">{language === 'TH' ? 'Bilingual (AI แปลความหมาย)' : 'Bilingual'}</option>
                                          <option value="NUMBER_WORD">{language === 'TH' ? 'ตัวเลข / คำอ่าน (NUMBER/WORD)' : 'Number / Word'}</option>
                                          <option value="EXISTENCE">{language === 'TH' ? 'ความมีอยู่ (EXISTENCE)' : 'Existence'}</option>
                                          <option value="MASTER_LOOKUP">{language === 'TH' ? 'Master lookup (ฐานข้อมูล)' : 'Master lookup'}</option>
                                          <option value="CONDITIONAL">{language === 'TH' ? 'เปรียบเทียบตามเงื่อนไข (CONDITIONAL)' : 'Conditional'}</option>
                                          <option value="DATE_NORMALIZATION">{language === 'TH' ? 'ปรับรูปแบบวันที่ (DATE)' : 'Date normalization'}</option>
                                        </select>
                                        {currentVal?.type && currentVal?.type !== 'NONE' && (
                                          <button
                                            type="button"
                                            onClick={() => {
                                              if (openDrawerInfo && openDrawerInfo.rowId === row.id && openDrawerInfo.colIdx === vIdx) {
                                                setOpenDrawerInfo(null);
                                              } else {
                                                setOpenDrawerInfo({
                                                  colIdx: vIdx,
                                                  rowId: row.id,
                                                  fieldName: row.detail,
                                                  docType: activeRule.docTypes[vIdx]
                                                });
                                              }
                                            }}
                                            className={`p-1.5 rounded-[4px] transition-all shrink-0 cursor-pointer ${
                                              openDrawerInfo && openDrawerInfo.rowId === row.id && openDrawerInfo.colIdx === vIdx
                                                ? 'bg-blue-600 text-white hover:bg-blue-700'
                                                : 'bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-blue-600'
                                            }`}
                                            style={{ borderRadius: '4px' }}
                                            title={language === 'TH' ? 'เปิด-ปิด การตั้งค่าย่อย' : 'Toggle sub-settings'}
                                          >
                                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-settings-2"><path d="M20 7h-9"/><path d="M14 17H5"/><circle cx="17" cy="17" r="3"/><circle cx="7" cy="7" r="3"/></svg>
                                          </button>
                                        )}
                                      </div>
                                    )}
                                  </div>
                                  )
                                ) : (
                                  isRemarkCol ? (
                                    <div className="text-[10px] font-bold text-slate-500 whitespace-pre-wrap">
                                      {val?.text || '-'}
                                    </div>
                                  ) : (
                                  <div className="flex flex-col gap-1 items-center justify-center relative w-full px-2">
                                    {val?.schemaField && (val?.isMain || (val?.type !== 'NONE' && val?.type)) ? (
                                      <div className="flex items-center gap-1.5 w-full mb-1">
                                        <div className="flex-1 text-center px-1.5 py-0.5 rounded border border-slate-200 bg-slate-50 max-w-full overflow-hidden text-ellipsis whitespace-nowrap h-[22px] flex items-center justify-center">
                                          <span className="text-[9px] font-bold text-slate-600 block truncate">{val.schemaField}</span>
                                        </div>
                                        {val?.isMain && (
                                          <div className="bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded text-[8px] font-black border border-blue-200 h-[22px] flex items-center justify-center shrink-0">
                                            MAIN
                                          </div>
                                        )}
                                      </div>
                                    ) : (
                                      val?.isMain && (
                                        <div className="bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded text-[8px] font-black border border-blue-200 h-[22px] flex items-center justify-center mb-1">
                                          MAIN
                                        </div>
                                      )
                                    )}
                                    {val?.isMain ? (
                                      <>
                                        <div className="inline-flex items-center justify-center w-full min-w-[100px] px-2 py-1.5 rounded bg-blue-50 text-blue-700 border border-blue-200 text-[9px] font-black tracking-tight uppercase shadow-sm">
                                          {language === 'TH' ? 'เอกสารหลัก' : 'MAIN DOC'}
                                        </div>
                                        {isArrayField(val?.schemaField) && (
                                          <div className="bg-blue-50 border border-blue-200 text-[#1f5df9] text-[8.5px] font-bold px-2 py-1 rounded-full text-center tracking-tight shadow-sm mt-1.5">
                                            Key: {Array.isArray(val?.arrayMatchingKey) ? val.arrayMatchingKey.join(', ') : (val?.arrayMatchingKey || 'itemId')} • {val?.fallbackToIndex !== false ? '1 fallback' : 'no fallback'}
                                          </div>
                                        )}
                                      </>
                                    ) : (
                                      <div className={`inline-flex items-center justify-center w-full min-w-[100px] px-2 py-1.5 rounded-md text-[9px] font-bold tracking-tight uppercase ${
                                      val?.type === 'EXACT' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 
                                      val?.type === 'BILINGUAL' ? 'bg-indigo-50 text-indigo-700 border-indigo-200' :
                                      (val?.type === 'SYNONYM' || val?.type === 'NEARLY') ? 'bg-amber-50 text-amber-700 border-amber-200' : 
                                      val?.type === 'FUZZY' ? 'bg-purple-50 text-purple-700 border-purple-200' : 
                                      val?.type === 'NUMBER_WORD' ? 'bg-sky-50 text-sky-700 border-sky-200' :
                                      val?.type === 'EXISTENCE' ? 'bg-orange-50 text-orange-700 border-orange-200' :
                                      val?.type === 'MASTER_LOOKUP' ? 'bg-rose-50 text-rose-700 border-rose-200' :
                                      val?.type === 'CONDITIONAL' ? 'bg-pink-50 text-pink-700 border-pink-200' :
                                      val?.type === 'DATE_NORMALIZATION' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                                      val?.type === 'CROSS_FLOW_CARRY' ? 'bg-teal-50 text-teal-700 border-teal-200' :
                                      'bg-slate-50 text-slate-400 border-slate-200'
                                    } border`}>
                                      {getTypeLabel(val?.type ?? '')}
                                    </div>
                                    )}
                                    {(() => {
                                      const type = val?.type;
                                      if (val?.isMain || !type || type === 'NONE') return null;

                                      switch (type) {
                                        case 'BILINGUAL':
                                        case 'SYNONYM':
                                        case 'NEARLY':
                                        case 'FUZZY':
                                          return (
                                            <div className="flex items-center justify-center gap-1 mt-1.5 text-[8px] font-black text-slate-500 bg-slate-100/80 px-1.5 py-0.5 rounded-lg border border-slate-200/50">
                                              <ShieldCheck size={10} className="text-blue-500 shrink-0" />
                                              <span>Threshold: {val.threshold !== undefined ? val.threshold : 80}%</span>
                                            </div>
                                          );
                                        case 'NUMBER_WORD':
                                          return (
                                            <div className="flex flex-col items-center gap-0.5 mt-1.5 text-[8px] font-bold text-slate-500 bg-slate-50 px-1.5 py-1 rounded border border-slate-200/50 max-w-full text-center">
                                              <div>Tolerance: {val.tolerance !== undefined ? val.tolerance : 0}</div>
                                              {val.thaiDigits !== false && <div className="text-[7.5px] text-blue-600 font-black">✓ Thai Numerals</div>}
                                            </div>
                                          );
                                        case 'MASTER_LOOKUP':
                                          return (
                                            <div className="flex items-center justify-center gap-1 mt-1.5 text-[8px] font-black text-rose-600 bg-rose-50 px-1.5 py-0.5 rounded border border-rose-200/50">
                                              <span>DB: {val.masterDb || 'Customers'}</span>
                                            </div>
                                          );
                                        case 'CONDITIONAL':
                                          return (
                                            <div className="flex flex-col gap-0.5 mt-1.5 text-[7.5px] font-black text-pink-600 bg-pink-50/50 px-1.5 py-1 rounded border border-pink-200/40 text-left w-full overflow-hidden text-ellipsis">
                                              <div className="opacity-75 font-bold">If: {val.condField || 'Payment Term'}</div>
                                              <div className="font-bold">= {val.condValue || 'L/C'}</div>
                                              <div className="text-[7px] text-slate-500 font-extrabold border-t border-pink-200/30 pt-0.5 mt-0.5">Use: {val.condSource || 'L/C No.'}</div>
                                            </div>
                                          );
                                        case 'DATE_NORMALIZATION':
                                          return (
                                            <div className="flex items-center justify-center gap-1 mt-1.5 text-[8px] font-black text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200/40">
                                              <div className="flex flex-col gap-0.5 items-center">
                                                {val.dateBuddhist !== false && val.dateADToBE !== true && <span>{language === 'TH' ? 'พ.ศ. → ค.ศ.' : 'BE → AD'}</span>}
                                                {val.dateADToBE === true && <span>{language === 'TH' ? 'ค.ศ. → พ.ศ.' : 'AD → BE'}</span>}
                                                {val.dateBuddhist === false && !val.dateADToBE && <span>AD Format</span>}
                                              </div>
                                            </div>
                                          );
                                        case 'CROSS_FLOW_CARRY':
                                          return (
                                            <div className="flex flex-col items-center gap-0.5 mt-1.5 text-[8px] font-black text-teal-600 bg-teal-50 px-1.5 py-1 rounded border border-teal-200/40 text-center max-w-full">
                                              <div className="opacity-80">Carry:</div>
                                              <div className="text-[7px] text-slate-500 whitespace-nowrap overflow-hidden text-ellipsis max-w-[100px] font-bold">{val.carryRule || 'PO Flow'}</div>
                                            </div>
                                          );
                                        default:
                                          return null;
                                      }
                                    })()}
                                  </div>
                                  )
                                )}
                             </td>
                           );
                        })}
                      </tr>
                    );
                  })}
                  <tr>
                     <td colSpan={1} className="px-6 py-3 sticky left-0 bg-white z-10 shadow-[2px_0_5px_rgba(0,0,0,0.02)] border-r border-slate-100 border-b border-slate-100">
                       <button onClick={() => handleAddField(section.title)} className="flex items-center gap-2 text-blue-600 hover:text-blue-700 font-bold text-xs group">
                          <div className="w-6 h-6 rounded-md bg-blue-50 flex items-center justify-center group-hover:bg-blue-100 transition-colors">
                            <Plus size={14} />
                          </div>
                          Add Field
                       </button>
                     </td>
                     <td colSpan={activeRule.docTypes.length} className="border-b border-slate-100 bg-slate-50/20"></td>
                  </tr>
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      {deletingField && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6 text-center">
              <div className="flex items-center justify-center mx-auto mb-4 text-amber-500">
                <AlertCircle size={48} />
              </div>
              <h3 className="text-lg font-black text-slate-800 mb-2">ลบรายการนี้?</h3>
              <p className="text-slate-500 text-sm mb-6">คุณแน่ใจหรือไม่ว่าต้องการลบรายการนี้ ข้อมูลที่ลบจะไม่สามารถกู้คืนได้</p>
              <div className="flex gap-3">
                <button 
                  onClick={() => setDeletingField(null)} 
                  className="flex-1 py-2.5 rounded-[4px] text-slate-600 font-bold bg-slate-100 hover:bg-slate-200 transition-colors"
                >
                  ยกเลิก
                </button>
                <button 
                  onClick={confirmDelete}
                  className="flex-1 py-2.5 rounded-[4px] text-white font-bold bg-[#1F5DF9] hover:bg-[#104BE3] transition-colors shadow-sm"
                >
                  ลบข้อมูล
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {isAddDocTypeModalOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between p-5 border-b border-slate-100 bg-slate-50/50">
              <h2 className="text-xl font-black text-slate-800 flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center">
                  <FilePlus size={16} />
                </div>
                {isTh ? 'เพิ่มประเภทเอกสารใหม่' : 'Add New Document Type'}
              </h2>
              <button 
                onClick={() => setIsAddDocTypeModalOpen(false)}
                className="w-8 h-8 flex items-center justify-center rounded-[4px] text-slate-400 hover:bg-slate-200 hover:text-slate-600 transition-colors"
              >
                <X size={18} />
              </button>
            </div>
            
            <div className="p-5 overflow-y-auto">
              <label className="block text-xs font-black text-slate-700 mb-3 uppercase tracking-wide">
                {isTh ? 'เลือก Document Type' : 'Select Document Type'}
              </label>
              <div className="grid grid-cols-2 gap-2">
                {availableDocTypes.filter(doc => !activeRule.docTypes.includes(doc)).map(doc => (
                  <label 
                    key={doc} 
                    onClick={(e) => { e.preventDefault(); toggleNewDocType(doc); }}
                    className={`flex items-center gap-3 p-3 rounded-lg border-2 cursor-pointer transition-all ${
                      selectedNewDocTypes.includes(doc) 
                        ? 'border-blue-500 bg-blue-50/50' 
                        : 'border-slate-200 bg-white hover:border-slate-300'
                    }`}
                  >
                    <div className={`w-5 h-5 rounded flex items-center justify-center flex-shrink-0 ${
                      selectedNewDocTypes.includes(doc)
                        ? 'bg-blue-600'
                        : 'border-2 border-slate-300'
                    }`}>
                      {selectedNewDocTypes.includes(doc) && <Check size={14} className="text-white" />}
                    </div>
                    <span className={`text-xs font-bold leading-tight ${
                      selectedNewDocTypes.includes(doc) ? 'text-blue-800' : 'text-slate-600'
                    }`}>
                      {doc}
                    </span>
                  </label>
                ))}
                
                {availableDocTypes.filter(doc => !activeRule.docTypes.includes(doc)).length === 0 && (
                  <div className="col-span-2 text-center py-6 text-slate-500 text-sm font-medium">
                    {isTh ? 'ไม่มี Document Type เหลือให้เลือกแล้ว' : 'No more Document Types available'}
                  </div>
                )}
              </div>
            </div>
            
            <div className="p-5 border-t border-slate-100 bg-slate-50 flex items-center justify-end gap-3 rounded-b-xl">
              <button 
                onClick={() => setIsAddDocTypeModalOpen(false)} 
                className="px-5 py-2.5 rounded-[4px] text-slate-600 font-bold text-sm bg-white border border-slate-200 hover:bg-slate-50 transition-colors"
              >
                {isTh ? 'ยกเลิก' : 'Cancel'}
              </button>
              <button 
                onClick={confirmAddDocType}
                disabled={selectedNewDocTypes.length === 0}
                className="px-5 py-2.5 rounded-[4px] text-white font-bold text-sm bg-blue-600 hover:bg-blue-700 transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
              >
                {isTh ? 'เพิ่มข้อมูล' : 'Add Selected'}
              </button>
            </div>
          </div>
        </div>
      )}
      {deletingDocType !== null && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6 text-center">
              <div className="flex items-center justify-center mx-auto mb-4 text-amber-500">
                <AlertCircle size={48} />
              </div>
              <h3 className="text-lg font-black text-slate-800 mb-2">ลบประเภทเอกสาร?</h3>
              <p className="text-slate-500 text-sm mb-6">คุณแน่ใจหรือไม่ว่าต้องการลบเอกสาร <span className="font-bold text-slate-800">"{activeRule.docTypes[deletingDocType]}"</span> ข้อมูลที่เกี่ยวข้องทั้งหมดจะถูกลบและไม่สามารถกู้คืนได้</p>
              <div className="flex gap-3">
                <button 
                  onClick={() => setDeletingDocType(null)} 
                  className="flex-1 py-2.5 rounded-[4px] text-slate-600 font-bold bg-slate-100 hover:bg-slate-200 transition-colors"
                >
                  ยกเลิก
                </button>
                <button 
                  onClick={confirmDeleteDocType}
                  className="flex-1 py-2.5 rounded-[4px] text-white font-bold bg-[#1F5DF9] hover:bg-[#104BE3] transition-colors shadow-sm"
                >
                  ลบข้อมูล
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* Slide-over Drawer for Sub-settings */}
      {openDrawerInfo && createPortal(
        <>
          {/* Backdrop Overlay */}
          <div 
            className="fixed inset-0 bg-slate-900/30 backdrop-blur-sm z-[9990] transition-opacity duration-300"
            onClick={() => setOpenDrawerInfo(null)}
          />
          
          {/* Slide-over Panel */}
          <div 
            className="fixed top-0 right-0 h-full w-[600px] max-w-full bg-white shadow-2xl z-[9995] border-l border-slate-200 flex flex-col transition-all duration-300 ease-in-out font-sans"
            style={{ 
              color: '#010136', 
              boxShadow: '-10px 0 30px -10px rgba(1, 1, 54, 0.15)'
            }}
          >
            {/* Header */}
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/80">
              <div className="flex flex-col gap-0.5">
                <span className="text-[10px] font-black text-[#1f5df9] uppercase tracking-widest">
                  {language === 'TH' ? 'ตั้งค่าการเปรียบเทียบย่อย' : 'Comparison Config'}
                </span>
                <h3 className="text-sm font-black text-[#010136] tracking-tight">
                  {openDrawerInfo.fieldName} <span className="text-slate-400 font-medium">({openDrawerInfo.docType})</span>
                </h3>
              </div>
              <button 
                onClick={() => setOpenDrawerInfo(null)}
                className="w-8 h-8 rounded-[4px] flex items-center justify-center text-slate-400 hover:text-red-500 hover:bg-red-50 transition-all cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            {/* Scrollable Settings Panel */}
            <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-5 font-sans">
              {(() => {
                const drawerVal = editFormData?.values[openDrawerInfo.colIdx];
                const type = drawerVal?.type;
                if (!type || type === 'NONE') return null;
                const typeLabel = getTypeLabel(type);
                return (
                  <div className="flex flex-col select-none border-b border-slate-100 pb-3">
                    <span className="text-lg font-black text-[#010136]">
                      {typeLabel}
                    </span>
                  </div>
                );
              })()}

              {(() => {
                const drawerVal = editFormData?.values[openDrawerInfo.colIdx];
                const type = drawerVal?.type;
                const allRuleFields = activeRule?.parts?.flatMap((p: any) => p.rows.map((r: any) => r.detail)) || [];
                
                if (!type || type === 'NONE') {
                  return (
                    <div className="flex flex-col items-center justify-center py-12 text-center text-slate-400">
                      <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="mb-2 opacity-50"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.1a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/></svg>
                      <span className="text-xs font-bold">{language === 'TH' ? 'ไม่มีวิธีเปรียบเทียบที่ตั้งค่าได้' : 'No configurable comparison method selected.'}</span>
                    </div>
                  );
                }

                switch (type) {
                  case 'EXACT':
                    return (
                      <div className="flex flex-col gap-4">
                        <div className="bg-slate-50 p-4 border border-slate-200" style={{ borderRadius: '8px' }}>
                          <span className="text-[10px] font-black text-slate-400 uppercase tracking-wide block mb-1">
                            {language === 'TH' ? 'ตั้งค่าการเปรียบเทียบ Exact' : 'Exact Match Options'}
                          </span>
                          <p className="text-xs text-slate-500 leading-relaxed mb-4">
                            {language === 'TH' ? 'ระบบ normalize ก่อนเทียบเสมอ, trim whitespace หัวท้าย, case-insensitive' : 'System normalizes before copy, trims spaces, case-insensitive.'}
                          </p>
                          <label className="flex items-center gap-2.5 cursor-pointer text-[#010136] font-bold select-none text-xs">
                            <input 
                              type="checkbox" 
                              checked={drawerVal.caseSensitive === true} 
                              onChange={(e) => {
                                const newValues = [...editFormData.values];
                                newValues[openDrawerInfo.colIdx] = { 
                                  ...newValues[openDrawerInfo.colIdx], 
                                  caseSensitive: e.target.checked 
                                };
                                setEditFormData({...editFormData, values: newValues});
                              }} 
                              className="w-4 h-4 text-blue-600 rounded border-slate-300 accent-blue-600 focus:outline-none" 
                            />
                            <span>{language === 'TH' ? 'ตัวพิมพ์เล็กใหญ่ตรงกัน (Case-Sensitive)' : 'Case-Sensitive'}</span>
                          </label>
                        </div>
                        <div className="p-4 bg-rose-50 border border-rose-100 text-xs text-rose-600 font-bold flex items-center gap-2" style={{ borderRadius: '8px' }}>
                          <span className="inline-block w-2 h-2 rounded-full bg-rose-500"></span>
                          <span>{language === 'TH' ? 'ถ้าไม่ตรง → mismatch ทันที ไม่มี tolerance' : 'If mismatch -> flag instantly (no tolerance)'}</span>
                        </div>
                      </div>
                    );

                  case 'BILINGUAL':
                  case 'NEARLY':
                  case 'FUZZY':
                  case 'SYNONYM':
                    const isBilingual = type === 'BILINGUAL';
                    return (
                      <div className="flex flex-col gap-4">
                        <div className="bg-slate-50 p-4 border border-slate-200" style={{ borderRadius: '8px' }}>
                          <span className="text-[10px] font-black text-slate-400 uppercase tracking-wide block mb-1">
                            {isBilingual 
                              ? (language === 'TH' ? 'แปลความหมายและเทียบด้วย AI' : 'Bilingual AI Settings')
                              : (language === 'TH' ? 'ตั้งค่าความคล้ายคำ (Synonyms)' : 'Similarity Settings')
                            }
                          </span>
                          {isBilingual && (
                            <p className="text-xs text-slate-500 leading-relaxed mb-4">
                              {language === 'TH' ? 'ระบบใช้ AI แปลแล้วเทียบความหมาย แปลทั้งคู่เป็นภาษาเดียวก่อนเทียบ' : 'AI translates meaning to a single language before comparison.'}
                            </p>
                          )}
                          
                          <div className="flex items-center justify-between w-full mb-2">
                            <span className="text-xs font-black text-slate-500 uppercase tracking-widest">
                              {language === 'TH' ? 'ความถูกต้อง (Threshold)' : 'Threshold'}
                            </span>
                            <span className="text-sm font-black text-blue-600">
                              {drawerVal.threshold !== undefined ? drawerVal.threshold : 80}%
                            </span>
                          </div>
                          
                          <div className="flex items-center gap-3 w-full mb-4">
                            <input 
                              type="range" 
                              min="30" 
                              max="100" 
                              step="5"
                              className="flex-1 accent-blue-600 h-1.5 bg-slate-200 rounded-lg cursor-pointer"
                              value={drawerVal.threshold !== undefined ? drawerVal.threshold : 80}
                              onChange={(e) => {
                                const valNum = parseInt(e.target.value) || 80;
                                const newValues = [...editFormData.values];
                                newValues[openDrawerInfo.colIdx] = { 
                                  ...newValues[openDrawerInfo.colIdx], 
                                  threshold: valNum 
                                };
                                setEditFormData({...editFormData, values: newValues});
                              }}
                            />
                            <input
                              type="number"
                              min="10"
                              max="100"
                              className="w-12 bg-white border border-slate-200 p-1 text-center text-xs font-black text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500"
                              style={{ borderRadius: '4px' }}
                              value={drawerVal.threshold !== undefined ? drawerVal.threshold : 80}
                              onChange={(e) => {
                                let valNum = parseInt(e.target.value);
                                if (isNaN(valNum)) valNum = 80;
                                if (valNum < 10) valNum = 10;
                                if (valNum > 100) valNum = 100;
                                const newValues = [...editFormData.values];
                                newValues[openDrawerInfo.colIdx] = { 
                                  ...newValues[openDrawerInfo.colIdx], 
                                  threshold: valNum 
                                };
                                setEditFormData({...editFormData, values: newValues});
                              }}
                            />
                          </div>
                          
                          <div className="flex gap-1.5 w-full justify-between mb-2">
                            {[50, 70, 80, 90, 100].map((preset) => (
                              <button
                                key={preset}
                                type="button"
                                onClick={() => {
                                  const newValues = [...editFormData.values];
                                  newValues[openDrawerInfo.colIdx] = { 
                                    ...newValues[openDrawerInfo.colIdx], 
                                    threshold: preset 
                                  };
                                  setEditFormData({...editFormData, values: newValues});
                                }}
                                className={`flex-1 py-1 rounded-[4px] text-xs font-bold border transition-all cursor-pointer ${
                                  (drawerVal.threshold !== undefined ? drawerVal.threshold : 80) === preset
                                    ? 'bg-blue-600 border-blue-600 text-white shadow-sm'
                                    : 'bg-white border-slate-200 text-slate-500 hover:border-slate-300'
                                }`}
                                style={{ borderRadius: '4px' }}
                              >
                                {preset}%
                              </button>
                            ))}
                          </div>
                        </div>

                        {isBilingual && (
                          <div className="p-4 bg-amber-50 border border-amber-100 text-xs text-amber-700 font-bold flex flex-col gap-1.5 leading-relaxed" style={{ borderRadius: '8px' }}>
                            <div>✓ {language === 'TH' ? 'ถ้า confidence ≥ threshold → match' : 'If confidence ≥ threshold -> match'}</div>
                            <div>✓ {language === 'TH' ? 'ถ้า confidence < threshold → pending review' : 'If confidence < threshold -> pending review'}</div>
                            <div className="text-slate-400 font-medium">{language === 'TH' ? '(ผู้ใช้ยืนยันหรือแก้ไขใน compare result)' : '(user chooses to verify/edit in outcomes)'}</div>
                          </div>
                        )}
                      </div>
                    );

                  case 'NUMBER_WORD':
                    return (
                      <div className="flex flex-col gap-4">
                        <div className="bg-slate-50 p-4 border border-slate-200 flex flex-col gap-3" style={{ borderRadius: '8px' }}>
                          <span className="text-[10px] font-black text-slate-400 uppercase tracking-wide block">
                            {language === 'TH' ? 'ตั้งค่าการเปรียบเทียบตัวเลข' : 'Number Match Options'}
                          </span>
                          <p className="text-xs text-slate-500 leading-relaxed mb-1">
                            {language === 'TH' ? 'แปลงทั้งคู่เป็นตัวเลขก่อนเทียบ, รองรับตัวเลขไทยและอารบิก, รองรับ comma' : 'Convert string to numerals first. Supports Thai digits & English commas.'}
                          </p>
                          
                          <label className="flex items-center gap-2 cursor-pointer text-[#010136] font-bold select-none text-xs">
                            <input 
                              type="checkbox" 
                              checked={drawerVal.thaiDigits !== false} 
                              onChange={(e) => {
                                const newValues = [...editFormData.values];
                                newValues[openDrawerInfo.colIdx] = { 
                                  ...newValues[openDrawerInfo.colIdx], 
                                  thaiDigits: e.target.checked 
                                };
                                setEditFormData({...editFormData, values: newValues});
                              }} 
                              className="w-4 h-4 text-blue-600 rounded border-slate-300 accent-blue-600" 
                            />
                            <span>{language === 'TH' ? 'รองรับตัวเลขไทย (๑, ๒, ๓...)' : 'Support Thai digits (๑,๒,๓)'}</span>
                          </label>
                          
                          <label className="flex items-center gap-2 cursor-pointer text-[#010136] font-bold select-none text-xs">
                            <input 
                              type="checkbox" 
                              checked={drawerVal.currencySupport !== false} 
                              onChange={(e) => {
                                const newValues = [...editFormData.values];
                                newValues[openDrawerInfo.colIdx] = { 
                                  ...newValues[openDrawerInfo.colIdx], 
                                  currencySupport: e.target.checked 
                                };
                                setEditFormData({...editFormData, values: newValues});
                              }} 
                              className="w-4 h-4 text-blue-600 rounded border-slate-300 accent-blue-600" 
                            />
                            <span>{language === 'TH' ? 'ข้ามเครื่องหมาย/สกุลเงิน (USD, THB)' : 'Skip currency symbols (USD, THB)'}</span>
                          </label>
                          
                          <div className="flex flex-col gap-1 w-full mt-1">
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                              {language === 'TH' ? 'ความคลาดเคลื่อนที่ยอมรับได้ (Tolerance)' : 'Allowed Tolerance'}
                            </span>
                            <input 
                              type="number" 
                              className="w-full bg-white border border-slate-200 rounded px-2.5 py-1.5 text-xs font-bold text-slate-700 outline-none focus:ring-1 focus:ring-blue-500"
                              style={{ borderRadius: '4px' }}
                              placeholder="e.g. 0.00"
                              value={drawerVal.tolerance !== undefined ? drawerVal.tolerance : 0}
                              onChange={(e) => {
                                const valNum = parseFloat(e.target.value) || 0;
                                const newValues = [...editFormData.values];
                                newValues[openDrawerInfo.colIdx] = { 
                                  ...newValues[openDrawerInfo.colIdx], 
                                  tolerance: valNum 
                                };
                                setEditFormData({...editFormData, values: newValues});
                              }}
                            />
                          </div>
                        </div>

                        <div className="p-4 bg-blue-50 border border-blue-100 text-xs text-blue-800 font-bold flex flex-col gap-1.5 leading-relaxed" style={{ borderRadius: '8px' }}>
                          <div>✓ {language === 'TH' ? 'รองรับ comma (เช่น 12,500)' : 'Supports commas (e.g., 12,500)'}</div>
                          <div>✓ {language === 'TH' ? 'แปลงไม่ได้ → pending review' : 'Non-numeric strings -> pending review'}</div>
                          <div>✓ {language === 'TH' ? 'ตรงกัน → match' : 'If numbers match -> match'}</div>
                        </div>
                      </div>
                    );

                  case 'EXISTENCE':
                    return (
                      <div className="flex flex-col gap-4">
                        <div className="bg-slate-50 p-4 border border-slate-200" style={{ borderRadius: '8px' }}>
                          <span className="text-[10px] font-black text-slate-400 uppercase tracking-wide block mb-1">
                            {language === 'TH' ? 'ตรวจสอบความมีอยู่' : 'Existence Conditions'}
                          </span>
                          <p className="text-xs text-slate-500 leading-relaxed mb-4">
                            {language === 'TH' ? 'ระบบตรวจหาการสกัดค่าใดๆ ว่าได้ข้อมูล (ไม่ว่างเปล่า) หรือไม่' : 'Determines if there is a valid non-empty extracted value.'}
                          </p>
                          <div className="text-xs text-emerald-600 font-bold flex items-center gap-2.5 mb-2">
                            <span className="inline-block w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
                            <span>{language === 'TH' ? 'มีค่า (ไม่ว่าง ไม่ null) → PASS' : 'Has value (not empty/null) → PASS'}</span>
                          </div>
                          <div className="text-xs text-rose-500 font-bold flex items-center gap-2.5">
                            <span className="inline-block w-2.5 h-2.5 rounded-full bg-rose-500"></span>
                            <span>{language === 'TH' ? 'ไม่มีค่า (ว่าง) → FAIL' : 'Absence of value (empty) → FAIL'}</span>
                          </div>
                        </div>
                      </div>
                    );

                  case 'MASTER_LOOKUP':
                    return (
                      <div className="flex flex-col gap-4">
                        <div className="bg-slate-50 p-4 border border-slate-200 flex flex-col gap-3" style={{ borderRadius: '8px' }}>
                          <span className="text-[10px] font-black text-[#010136]/50 uppercase tracking-wide">
                            {language === 'TH' ? 'เลือกตารางฐานข้อมูล Master' : 'Reference Master Database'}
                          </span>
                          <p className="text-xs text-slate-500 leading-relaxed mb-1">
                            {language === 'TH' ? 'ระบบ lookup ค่าจากเอกสารใน master table, normalize, trim, case-insensitive' : 'Looks up values from master, normalized & case-insensitive.'}
                          </p>
                          <select 
                            className="w-full bg-white border border-slate-200 rounded px-2.5 py-1.5 text-xs font-bold text-slate-700 outline-none focus:ring-1 focus:ring-blue-500"
                            style={{ borderRadius: '4px' }}
                            value={drawerVal.masterDb || 'Customers'}
                            onChange={(e) => {
                              const newValues = [...editFormData.values];
                              newValues[openDrawerInfo.colIdx] = { 
                                ...newValues[openDrawerInfo.colIdx], 
                                masterDb: e.target.value 
                              };
                              setEditFormData({...editFormData, values: newValues});
                            }}
                          >
                            <option value="Customers">{language === 'TH' ? 'ฐานข้อมูลลูกค้า (Master Customers)' : 'Master Customers'}</option>
                            <option value="Products">{language === 'TH' ? 'ฐานข้อมูลสินค้า (Master Products)' : 'Master Products'}</option>
                            <option value="Suppliers">{language === 'TH' ? 'ฐานข้อมูลผู้ขาย (Master Suppliers)' : 'Master Suppliers'}</option>
                            <option value="Currencies">{language === 'TH' ? 'ฐานข้อมูลสกุลเงิน (Master Currencies)' : 'Master Currencies'}</option>
                          </select>
                        </div>

                        <div className="p-4 bg-slate-50 border border-slate-200 text-xs text-slate-600 font-black flex flex-col gap-1.5 leading-relaxed" style={{ borderRadius: '8px' }}>
                          <div className="text-emerald-600">✓ {language === 'TH' ? 'พบ 1 ค่า → auto match แสดงชื่อเต็ม' : 'Found 1 -> auto match'}</div>
                          <div className="text-amber-600">✓ {language === 'TH' ? 'พบหลายค่า → pending review (เลือกตัวเลือก)' : 'Found many -> pending review (user selects)'}</div>
                          <div className="text-rose-600">✓ {language === 'TH' ? 'ไม่พบ → pending review (กรอก/เพิ่ม master)' : 'Not found -> review manually'}</div>
                        </div>
                      </div>
                    );

                  case 'CONDITIONAL':
                    const documentTypeOptions = activeRule.docTypes.filter((d: string) => d !== t.docTypeRemark && d.trim() !== '');
                    const currentCondField = drawerVal.condField || drawerVal.schemaField || '';

                    return (
                      <div className="flex flex-col gap-5">
                        <div className="text-xs font-black text-[#010136]/60 uppercase tracking-widest mb-1 select-none">
                          {language === 'TH' ? 'แผงควบคุมตั้งค่าเงื่อนไข (CONDITIONAL CONFIGURATION PANEL)' : 'Conditional Configuration Panel'}
                        </div>

                        {/* Hierarchical Line Container */}
                        <div className="relative pl-7 flex flex-col gap-4">
                          {/* Left Connection Line */}
                          <div className="absolute left-[13px] top-6 bottom-14 w-[1.5px] bg-slate-200/80"></div>

                          {/* 1. IF Block */}
                          <div className="relative">
                            {/* Step Bubble 1 */}
                            <div className="absolute left-[-26px] top-3.5 w-6 h-6 rounded-full bg-[#22C55E] border-2 border-white flex items-center justify-center text-white text-[11px] font-black z-10 shadow-sm select-none">
                              1
                            </div>

                            <div className="bg-[#F0FDF4]/80 border border-[#DCFCE7] p-4 flex flex-col gap-3 relative transition-all" style={{ borderRadius: '8px' }}>
                              <div className="flex items-center justify-between">
                                <span className="text-[10px] font-black text-[#166534] uppercase tracking-wider flex items-center gap-1 select-none">
                                  IF (Conditional Case)
                                </span>
                                <span className="text-[9px] font-black text-[#15803D] bg-[#DCFCE7] px-1.5 py-0.5 rounded tracking-widest select-none">
                                  TRUE
                                </span>
                              </div>

                              <div className="grid grid-cols-2 gap-4">
                                <div className="flex flex-col gap-1 w-full">
                                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest select-none">
                                    {language === 'TH' ? 'ตรวจสอบฟิลด์ (CONDITION FIELD)' : 'Condition Field'}
                                  </label>
                                  <input 
                                    type="text"
                                    className="w-full h-9 bg-slate-50 border border-slate-200 rounded px-2.5 py-1.5 text-xs font-bold text-slate-400 outline-none cursor-not-allowed select-none"
                                    style={{ borderRadius: '4px' }}
                                    disabled
                                    value={currentCondField}
                                  />
                                </div>

                                <div className="flex flex-col gap-1 w-full">
                                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest select-none">
                                    {language === 'TH' ? 'เป็นจริงเมื่อค่าเท่ากับ (EQUALS)' : 'Equals'}
                                  </label>
                                  <input 
                                    type="text"
                                    className="w-full h-9 bg-white border border-slate-200 rounded px-2.5 py-1.5 text-xs font-bold text-slate-700 focus:ring-1 focus:ring-blue-500 outline-none"
                                    style={{ borderRadius: '4px' }}
                                    placeholder="e.g. L/C"
                                    value={drawerVal.condValue || ''}
                                    onChange={(e) => {
                                      const newValues = [...editFormData.values];
                                      newValues[openDrawerInfo.colIdx] = { 
                                        ...newValues[openDrawerInfo.colIdx], 
                                        condValue: e.target.value 
                                      };
                                      setEditFormData({...editFormData, values: newValues});
                                    }}
                                  />
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* 2. THEN Block */}
                          <div className="relative">
                            {/* Step Bubble 2 */}
                            <div className="absolute left-[-26px] top-3.5 w-6 h-6 rounded-full bg-[#3B82F6] border-2 border-white flex items-center justify-center text-white text-[11px] font-black z-10 shadow-sm select-none">
                              2
                            </div>

                            <div className="bg-[#EFF6FF]/90 border border-[#DBEAFE] p-4 flex flex-col gap-3 relative transition-all" style={{ borderRadius: '8px' }}>
                              <div className="flex items-center justify-between">
                                <span className="text-[10px] font-black text-[#1E40AF] uppercase tracking-wider select-none">
                                  THEN (Execution Case for True)
                                </span>
                                {/* Link icon */}
                                <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-blue-500/80"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>
                              </div>

                              <div className="grid grid-cols-2 gap-4 font-sans">
                                {(() => {
                                  const selectedCondDoc = drawerVal.condDocType || 'B/L';
                                  const schemasForCondDoc = getSchemasForDocType(selectedCondDoc);
                                  const hasMultipleSchemasForCondDoc = schemasForCondDoc.length > 1;
                                  const selectedSchemaId = drawerVal.condSchemaId || '';
                                  const labelsToDisplay = getLabelsForDocTypeAndSchema(selectedCondDoc, selectedSchemaId);

                                  const renderFromDocType = (
                                    <div className="flex flex-col gap-1 w-full">
                                      <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest select-none">
                                        {language === 'TH' ? 'ดึงจากเอกสารประเภท (FROM DOC TYPE)' : 'From Document Type'}
                                      </label>
                                      <select 
                                        className="w-full h-9 bg-white border border-slate-200 rounded px-2.5 py-1.5 text-xs font-bold text-slate-700 focus:ring-1 focus:ring-blue-500 outline-none cursor-pointer"
                                        style={{ borderRadius: '4px' }}
                                        value={drawerVal.condDocType || 'B/L'}
                                        onChange={(e) => {
                                          const nextDocType = e.target.value;
                                          const newValues = [...editFormData.values];
                                          newValues[openDrawerInfo.colIdx] = { 
                                            ...newValues[openDrawerInfo.colIdx], 
                                            condDocType: nextDocType,
                                            condSchemaId: '', // Reset schema on docType change
                                            condSource: '' // Reset override field on docType change
                                          };
                                          setEditFormData({...editFormData, values: newValues});
                                        }}
                                      >
                                        <option value="B/L">B/L</option>
                                        <option value="INVOICE">INVOICE</option>
                                        <option value="PACKING LIST">PACKING LIST</option>
                                        {documentTypeOptions.filter((d: string) => d !== 'B/L' && d !== 'INVOICE' && d !== 'PACKING LIST').map((d: string) => (
                                          <option key={d} value={d}>{d}</option>
                                        ))}
                                      </select>
                                    </div>
                                  );

                                  const renderSchemaSelection = (
                                    <div className="flex flex-col gap-1 w-full animate-in fade-in duration-200">
                                      <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest select-none">
                                        {language === 'TH' ? 'เลือกรายการ SCHEMA' : 'Select Schema'}
                                      </label>
                                      <select 
                                        className="w-full h-9 bg-white border border-slate-200 rounded px-2.5 py-1.5 text-xs font-bold text-slate-700 focus:ring-1 focus:ring-blue-500 outline-none cursor-pointer"
                                        style={{ borderRadius: '4px' }}
                                        value={drawerVal.condSchemaId || ''}
                                        onChange={(e) => {
                                          const sId = e.target.value;
                                          const newValues = [...editFormData.values];
                                          newValues[openDrawerInfo.colIdx] = { 
                                            ...newValues[openDrawerInfo.colIdx], 
                                            condSchemaId: sId,
                                            condSource: '' // Reset override field on schema change
                                          };
                                          setEditFormData({...editFormData, values: newValues});
                                        }}
                                      >
                                        <option value="">{language === 'TH' ? 'เลือกรายการ Schema' : 'Select Schema'}</option>
                                        {schemasForCondDoc.map(schema => (
                                          <option key={schema.id} value={schema.id}>{schema.name}</option>
                                        ))}
                                      </select>
                                    </div>
                                  );

                                  const renderOverrideField = (colSpanValue: string) => (
                                    <div className={`flex flex-col gap-1 w-full ${colSpanValue}`}>
                                      <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest select-none">
                                        {language === 'TH' ? 'ฟิลด์พิเศษที่ใช้แทน (OVERRIDE FIELD)' : 'Override Source Field to Use'} <span className="text-red-500 ml-0.5">*</span>
                                      </label>
                                      <select 
                                        className={`w-full h-9 border rounded px-2.5 py-1.5 text-xs font-bold transition-all outline-none ${
                                          hasMultipleSchemasForCondDoc && !selectedSchemaId
                                            ? 'bg-slate-50 border-slate-200 text-slate-400 cursor-not-allowed select-none'
                                            : 'bg-white border-slate-200 text-slate-700 focus:ring-1 focus:ring-blue-500 cursor-pointer'
                                        }`}
                                        style={{ borderRadius: '4px' }}
                                        disabled={hasMultipleSchemasForCondDoc && !selectedSchemaId}
                                        value={drawerVal.condSource || ''}
                                        onChange={(e) => {
                                          const newValues = [...editFormData.values];
                                          newValues[openDrawerInfo.colIdx] = { 
                                            ...newValues[openDrawerInfo.colIdx], 
                                            condSource: e.target.value 
                                          };
                                          setEditFormData({...editFormData, values: newValues});
                                        }}
                                      >
                                        <option value="">
                                          {hasMultipleSchemasForCondDoc && !selectedSchemaId 
                                            ? (language === 'TH' ? 'กรุณาเลือก Schema ก่อน' : 'Please select Schema first')
                                            : (language === 'TH' ? 'เลือกฟิลด์' : 'Select Field')
                                          }
                                        </option>
                                        {labelsToDisplay.map((lbl: string) => (
                                          <option key={lbl} value={lbl}>{lbl}</option>
                                        ))}
                                        {labelsToDisplay.length === 0 && (
                                          <>
                                            <option value="L/C No.">L/C No.</option>
                                            <option value="BL No.">B/L No.</option>
                                            <option value="Invoice No.">Invoice No.</option>
                                            {allRuleFields.filter((f: string) => f !== 'L/C No.' && f !== 'BL No.' && f !== 'Invoice No.').map((f: string) => (
                                              <option key={f} value={f}>{f}</option>
                                            ))}
                                          </>
                                        )}
                                      </select>
                                    </div>
                                  );

                                  if (hasMultipleSchemasForCondDoc) {
                                    return (
                                      <>
                                        {renderFromDocType}
                                        {renderSchemaSelection}
                                        {renderOverrideField('col-span-2')}
                                      </>
                                    );
                                  } else {
                                    return (
                                      <>
                                        {renderFromDocType}
                                        {renderOverrideField('')}
                                      </>
                                    );
                                  }
                                })()}
                              </div>

                              <div className="flex flex-col bg-blue-100/30 p-2.5 mt-1 border border-blue-200/40" style={{ borderRadius: '6px' }}>
                                <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider select-none mb-0.5">Matching Method</span>
                                <div className="flex items-center justify-between text-xs font-black text-[#010136]">
                                  <span>{language === 'TH' ? 'ตรงกัน (Exact Match)' : 'Exact Match'}</span>
                                  <span className="text-[9px] text-slate-400 font-bold flex items-center gap-1 select-none bg-slate-100 px-1.5 py-0.5 rounded">
                                    {language === 'TH' ? 'ระบบล็อคอัตโนมัติ' : 'System Locked'}
                                    <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="text-slate-400"><rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                                  </span>
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* 3. ELSE Block */}
                          <div className="relative">
                            <div className="bg-[#FFFBEB]/70 border border-[#FEF3C7] p-4 flex flex-col gap-3 relative transition-all" style={{ borderRadius: '8px' }}>
                              <div className="flex items-center justify-between">
                                <span className="text-[10px] font-black text-[#92400e] uppercase tracking-wider select-none">
                                  ELSE (CASE FOR FALSE)
                                </span>
                                {/* Link icon */}
                                <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-amber-500/80"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>
                              </div>

                              <div className="grid grid-cols-2 gap-4">
                                <div className="flex flex-col">
                                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest select-none">
                                    {language === 'TH' ? 'กรณีเงื่อนไขเป็นเท็จ (NOT MET)' : 'IF CONDITION IS NOT MET'}
                                  </span>
                                  <span className="text-xs font-black text-[#010136] mt-0.5">
                                    {language === 'TH' ? 'ใช้ค่าฟิลด์ปกติ' : 'Use Normal Field Value'}
                                  </span>
                                </div>

                                <div className="flex flex-col">
                                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest select-none">
                                    MATCHING METHOD
                                  </span>
                                  <span className="text-xs font-black text-[#010136] mt-0.5">
                                    {language === 'TH' ? 'ตรงกัน (Exact Match)' : 'Exact Match'}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Beautiful Informative Explanation Box */}
                        <div className="bg-slate-50 border border-slate-200/80 p-4 flex flex-col gap-2 animate-in fade-in slide-in-from-bottom-1 duration-200" style={{ borderRadius: '12px' }}>
                          <span className="text-[10px] font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5 select-none direct-heading">
                            💡 {language === 'TH' ? 'ความหมายของเงื่อนไข เปรียบเทียบตามเงื่อนไข (Conditional)' : 'About Conditional Logic'}
                          </span>
                          <p className="text-xs text-slate-500 leading-relaxed font-medium">
                            {language === 'TH' ? (
                              <>
                                เป็นการเปรียบเทียบเอกสารโดยมี <strong>"เงื่อนไข (Condition)"</strong> เป็นตัวกำหนดว่าระบบควรจะดึงข้อมูลช่องไหนมาเปรียบเทียบตามลำดับตรรกะดังนี้:
                              </>
                            ) : (
                              <>
                                Custom logical matching rules to dictate which source document fields should be evaluated based on the condition rule.
                              </>
                            )}
                          </p>
                          <ul className="text-[11px] text-slate-600 space-y-1.5 list-disc pl-4 font-bold leading-relaxed mt-1">
                            {language === 'TH' ? (
                              <>
                                <li><strong>เช็คเงื่อนไขก่อน:</strong> ระบบจะตรวจสอบฟิลด์เงื่อนไขว่าตรงกับค่าที่ตั้งไว้หรือไม่</li>
                                <li><strong>กรณีเป็นเท็จ (≠):</strong> ใช้ค่าฟิลด์ปกติในการเปรียบเทียบแบบ Exact Match</li>
                                <li><strong>กรณีเป็นจริง (=):</strong> ข้ามฟิลด์ปกติ แล้วใช้ฟิลด์พิเศษที่ตั้งค่าใน THEN แทนแบบ Exact Match</li>
                              </>
                            ) : (
                              <>
                                <li><strong>Verify:</strong> Check if the designated Condition Field value equals the target setting.</li>
                                <li><strong>Else (≠):</strong> Evaluative match of default document values via Exact Match.</li>
                                <li><strong>Then (=):</strong> Fallback to the Substitute Source Field dynamically on evaluation.</li>
                              </>
                            )}
                          </ul>
                        </div>
                      </div>
                    );

                  case 'DATE_NORMALIZATION':
                    return (
                      <div className="flex flex-col gap-4">
                        <div className="bg-slate-50 p-4 border border-slate-200 flex flex-col gap-3" style={{ borderRadius: '8px' }}>
                          <span className="text-[10px] font-black text-slate-400 uppercase tracking-wide block">
                            {language === 'TH' ? 'ตั้งค่าแปลวันที่' : 'Date Normalization Settings'}
                          </span>
                          <p className="text-xs text-slate-500 leading-relaxed mb-1">
                            {language === 'TH' ? 'ระบบ normalize วันที่ทั้งคู่ก่อนเทียบ, แปลงเป็น YYYY-MM-DD เสมอ' : 'Normalize dates, converting values securely to YYYY-MM-DD.'}
                          </p>
                          
                          <div className="flex flex-col gap-2.5">
                            <label className="flex items-center gap-2 cursor-pointer text-[#010136] font-bold select-none text-xs">
                              <input 
                                type="radio" 
                                name="dateConversion"
                                checked={drawerVal.dateBuddhist !== false && drawerVal.dateADToBE !== true} 
                                onChange={() => {
                                  const newValues = [...editFormData.values];
                                  newValues[openDrawerInfo.colIdx] = { 
                                    ...newValues[openDrawerInfo.colIdx], 
                                    dateBuddhist: true,
                                    dateADToBE: false 
                                  };
                                  setEditFormData({...editFormData, values: newValues});
                                }} 
                                className="w-4 h-4 text-[#1f5df9] border-slate-300 accent-[#1f5df9] cursor-pointer" 
                              />
                              <span>{language === 'TH' ? 'แปลง พ.ศ. → ค.ศ. (ลบ 543 อัตโนมัติ)' : 'Buddhist Era to AD (Sub 543)'}</span>
                            </label>

                            <label className="flex items-center gap-2 cursor-pointer text-[#010136] font-bold select-none text-xs">
                              <input 
                                type="radio" 
                                name="dateConversion"
                                checked={drawerVal.dateADToBE === true} 
                                onChange={() => {
                                  const newValues = [...editFormData.values];
                                  newValues[openDrawerInfo.colIdx] = { 
                                    ...newValues[openDrawerInfo.colIdx], 
                                    dateBuddhist: false,
                                    dateADToBE: true 
                                  };
                                  setEditFormData({...editFormData, values: newValues});
                                }} 
                                className="w-4 h-4 text-[#1f5df9] border-slate-300 accent-[#1f5df9] cursor-pointer" 
                              />
                              <span>{language === 'TH' ? 'แปลง ค.ศ. → พ.ศ. (บวก 543 อัตโนมัติ)' : 'AD to Buddhist Era (Add 543)'}</span>
                            </label>
                          </div>
                        </div>

                        <div className="p-4 bg-indigo-50 border border-indigo-100 text-xs text-indigo-800 font-bold flex flex-col gap-1.5 leading-relaxed" style={{ borderRadius: '8px' }}>
                          <div className="text-slate-400">{language === 'TH' ? 'รองรับฟอร์แมต:' : 'Supported Formats:'}</div>
                          <div>• DD/MM/YYYY, DD-MM-YYYY</div>
                          <div>• DD/MMM/YYYY (เช่น 29/APR/2025)</div>
                          <div>• MMM DD YYYY (เช่น APR 29 2025)</div>
                          <div className="text-amber-600 font-black mt-1">• {language === 'TH' ? 'ถ้าแปลงไม่ได้ → pending review' : 'If unable to convert -> pending review'}</div>
                        </div>
                      </div>
                    );

                  case 'CROSS_FLOW_CARRY':
                    return (
                      <div className="flex flex-col gap-4">
                        <div className="bg-slate-50 p-4 border border-slate-200 flex flex-col gap-4" style={{ borderRadius: '8px' }}>
                          <span className="text-[10px] font-black text-slate-400 uppercase tracking-wide block">
                            {language === 'TH' ? 'ดึงค่าข้ามโฟลว์ (Carry)' : 'Cross Flow Carry Settings'}
                          </span>
                          
                          <div className="w-full flex flex-col gap-1">
                            <span className="text-[10px] font-black text-slate-500">
                              {language === 'TH' ? 'เลือกต้นทางโฟลว์ (Source Rule)' : 'Source Flow Rule'}
                            </span>
                            <select 
                              className="w-full bg-white border border-slate-200 rounded px-2.5 py-1.5 text-xs font-semibold text-slate-700 focus:ring-1 focus:ring-blue-500"
                              style={{ borderRadius: '4px' }}
                              value={drawerVal.carryRule || 'PO Verifier Flow'}
                              onChange={(e) => {
                                const newValues = [...editFormData.values];
                                newValues[openDrawerInfo.colIdx] = { 
                                  ...newValues[openDrawerInfo.colIdx], 
                                  carryRule: e.target.value 
                                };
                                setEditFormData({...editFormData, values: newValues});
                              }}
                            >
                              <option value="PO Verifier Flow">PO Verifier Flow</option>
                              <option value="Supplier Shipment Hub">Supplier Shipment Hub</option>
                              <option value="Gate Pass Rule">Gate Pass Rule</option>
                              <option value="Custom Clearance Rule">Custom Clearance Rule</option>
                            </select>
                          </div>

                          <div className="w-full flex flex-col gap-1">
                            <span className="text-[10px] font-black text-slate-500">
                              {language === 'TH' ? 'ฟิลด์เป้าหมายดึงข้อมูล' : 'Source Field Name'}
                            </span>
                            <select 
                              className="w-full bg-white border border-slate-200 rounded px-2.5 py-1.5 text-xs font-semibold text-slate-700 focus:ring-1 focus:ring-blue-500"
                              style={{ borderRadius: '4px' }}
                              value={drawerVal.carryField || 'B/L No'}
                              onChange={(e) => {
                                const newValues = [...editFormData.values];
                                newValues[openDrawerInfo.colIdx] = { 
                                  ...newValues[openDrawerInfo.colIdx], 
                                  carryField: e.target.value 
                                };
                                setEditFormData({...editFormData, values: newValues});
                              }}
                            >
                              <option value="B/L No">B/L No</option>
                              <option value="Total Pieces">Total Pieces</option>
                              <option value="Gross Weight font-bold">Gross Weight</option>
                              {allRuleFields.filter((f: string) => f !== 'B/L No' && f !== 'Total Pieces' && f !== 'Gross Weight').map((f: string) => (
                                <option key={f} value={f}>{f}</option>
                              ))}
                            </select>
                          </div>
                        </div>

                        <div className="p-4 bg-teal-50 border border-teal-100 text-xs text-teal-800 font-bold flex flex-col gap-1.5 leading-relaxed" style={{ borderRadius: '8px' }}>
                          <div>• {language === 'TH' ? 'ไม่ดึงข้อมูลซ้ำช้อนจากเอกสารใหม่' : 'Does not re-extract from target'}</div>
                          <div>• {language === 'TH' ? 'ใช้ค่าที่ user confirm ใน source rule' : 'Takes confirmed values from source rule'}</div>
                          <div>• {language === 'TH' ? 'แบบ Exact → mismatch user เลือก source' : 'Matches dest via Exact'}</div>
                        </div>
                      </div>
                    );

                  default:
                    return null;
                }
              })()}
            </div>

            {/* Footer */}
            <div className="border-t border-slate-100 p-5 bg-slate-50 flex items-center justify-end gap-2.5">
              <button
                type="button"
                className="px-4 py-2 bg-white border border-slate-200 hover:bg-slate-100 text-[#010136]/70 hover:text-[#010136] font-bold text-xs cursor-pointer transition-colors shadow-sm"
                style={{ borderRadius: '4px' }}
                onClick={() => setOpenDrawerInfo(null)}
              >
                {language === 'TH' ? 'ยกเลิก' : 'Cancel'}
              </button>
              <button
                type="button"
                className="px-5 py-2 hover:opacity-90 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-sm"
                style={{ 
                  borderRadius: '4px',
                  backgroundColor: '#1f5df9'
                }}
                onClick={() => {
                  setToastMessage(language === 'TH' ? 'บันทึกการตั้งค่าลงตารางแล้ว' : 'Comparison settings saved');
                  setOpenDrawerInfo(null);
                }}
              >
                <Check size={14} />
                <span>{language === 'TH' ? 'ตั้งค่าเสร็จสิ้น' : 'Save'}</span>
              </button>
            </div>
          </div>
        </>,
        document.body
      )}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-[200] animate-in slide-in-from-bottom-5 fade-in duration-300">
          <div className="bg-slate-800 text-white px-4 py-3 rounded-xl shadow-lg font-bold text-sm tracking-tight flex items-center gap-2">
            <div className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
              <Check size={14} />
            </div>
            {toastMessage}
          </div>
        </div>
      )}
    </div>
  );
};
