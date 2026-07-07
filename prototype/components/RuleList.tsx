import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { Settings, Plus, LayoutList, ChevronRight, Trash2, Tag, Calendar, Waypoints, Copy, AlertCircle } from 'lucide-react';
import { TRANSLATIONS } from '../translations';
import { Language } from '../types';
import { Tooltip } from './Tooltip';

export const RuleList = ({ rules, onSelect, onCreate, onDelete, onToggleStatus, language, comparisonWorkflows, onDuplicate }: any) => {
  const t = TRANSLATIONS[language as Language] || TRANSLATIONS.EN;
  const isTh = language === 'TH';
  const [ruleToDelete, setRuleToDelete] = useState<any>(null);

  const getWorkflowsUsingRule = (ruleId: string) => {
    if (!comparisonWorkflows) return [];
    return comparisonWorkflows.filter((wf: any) => {
      const hasNodeReference = wf.nodes?.some((node: any) => 
        node.type === 'compare' && node.data?.ruleId === ruleId
      );
      const rule = rules.find((r: any) => r.id === ruleId);
      const isAssociatedInRule = rule?.workflowIds?.includes(wf.id);
      return hasNodeReference || isAssociatedInRule;
    });
  };

  const confirmDelete = (e: React.MouseEvent, rule: any) => {
    e.stopPropagation();
    setRuleToDelete(rule);
  };

  const handleToggle = (e: React.MouseEvent, ruleId: string) => {
    e.stopPropagation();
    onToggleStatus(ruleId);
  };

  const handleDelete = () => {
    onDelete(ruleToDelete.id);
    setRuleToDelete(null);
  };

  return (
    <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-sm space-y-6 w-full relative animate-in fade-in duration-500" id="rule-sets-wrapper">
      {/* Header Bar */}
      <div className="flex justify-between items-center pb-4 border-b border-slate-100">
        <div>
          <h1 className="text-xl md:text-2xl font-black text-slate-800 tracking-tight flex items-center gap-3 animate-in slide-in-from-left duration-300">
            {t.ruleSetTitle}
          </h1>
          <p className="text-slate-500 font-bold text-xs md:text-sm">{t.ruleSetSubtitle}</p>
        </div>
        {rules && rules.length > 0 && (
          <button onClick={onCreate} className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-[4px] border border-blue-600 transition-colors shadow-sm font-bold text-xs md:text-sm tracking-tight">
            <Plus size={16} />
            <span>{t.btnCreateRuleSet}</span>
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 gap-4">
        {(!rules || rules.length === 0) ? (
          <div className="py-16 flex flex-col items-center justify-center bg-slate-50 border border-dashed border-slate-200 rounded-xl">
            <div className="w-16 h-16 bg-blue-50 text-blue-500 rounded-full flex items-center justify-center mb-4">
              <LayoutList size={32} />
            </div>
            <h3 className="text-lg font-black text-slate-800 mb-2">
              {isTh ? 'ยังไม่มี Compare rule' : 'No Compare Rules Yet'}
            </h3>
            <p className="text-slate-500 font-medium text-sm text-center max-w-md mx-auto mb-6">
              {isTh ? 'คุณยังไม่มี Compare rule ในระบบ สร้าง rule ใหม่เพื่อเริ่มต้นเปรียบเทียบข้อมูล' : 'You don\'t have any compare rules yet. Create a new rule to start comparing data.'}
            </p>
            <button
              onClick={onCreate}
              className="flex items-center gap-2 px-6 py-3 bg-[#1f5df9] hover:bg-blue-700 text-white rounded-[4px] font-bold transition-all shadow-md active:scale-[0.98]"
            >
              <Plus size={18} />
              <span>{t.btnCreateRuleSet}</span>
            </button>
          </div>
        ) : (
          rules.map((rule: any) => (
            <div key={rule.id} onClick={() => onSelect(rule.id)} className="bg-white rounded-lg p-5 border border-slate-200 shadow-sm hover:shadow-md hover:border-blue-300 transition-all cursor-pointer group flex items-center justify-between relative overflow-hidden">
              <div className="flex items-center gap-5">
                <div className="w-12 h-12 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Settings size={22} />
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-800 tracking-tight mb-1 group-hover:text-blue-600 transition-colors">
                    {isTh && rule.nameTh ? rule.nameTh : rule.name}
                  </h3>
                  {(rule.description || rule.descriptionTh) && (
                    <p className="text-sm font-bold text-slate-500 tracking-tight">
                      {isTh && rule.descriptionTh ? rule.descriptionTh : rule.description}
                    </p>
                  )}
                  <div className="flex flex-wrap items-center gap-4 mt-3">
                    {/* จำนวน label ที่ compare */}
                    <div className="flex items-center gap-1.5 text-xs font-bold text-slate-400 bg-slate-50 px-2.5 py-1 rounded-md">
                      <Tag size={13} />
                      <span className="text-slate-600 ml-0.5">{rule.totalFields}</span> {isTh ? 'Labels' : 'Labels'}
                    </div>
                    {/* จำนวน workflow ที่ใช้ */}
                    <div className="flex items-center gap-1.5 text-xs font-bold text-slate-400 bg-slate-50 px-2.5 py-1 rounded-md">
                      <Waypoints size={13} />
                      <span className="text-slate-600 ml-0.5">{rule.workflowIds?.length || 0}</span> {isTh ? 'Workflows' : 'Workflows'}
                    </div>
                    {/* Updated At */}
                    <div className="flex items-center gap-1.5 text-xs font-bold text-slate-400 bg-slate-50 px-2.5 py-1 rounded-md">
                      <Calendar size={13} />
                      <span className="text-slate-500 font-medium ml-0.5">{rule.updatedAt}</span>
                    </div>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-6">
                <div className="text-right flex flex-col items-end">
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">{t.status}</p>
                  <div className="flex items-center gap-3">
                    <div className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-black tracking-tight border ${
                      rule.status === 'Active' 
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-100' 
                        : 'bg-slate-50 text-slate-600 border-slate-200'
                    }`}>
                      <span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${
                        rule.status === 'Active' ? 'bg-emerald-500' : 'bg-slate-400'
                      }`}></span>
                      {rule.status === 'Active' ? t.active : t.inactive}
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  <Tooltip content={isTh ? 'ทำซ้ำรายการ' : 'Duplicate'}>
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        if (onDuplicate) {
                          onDuplicate(rule.id);
                        }
                      }}
                      className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-[4px] flex items-center justify-center transition-all"
                    >
                      <Copy size={16} />
                    </button>
                  </Tooltip>

                  <Tooltip content={isTh ? 'ลบรายการ' : 'Delete'}>
                    <button 
                      onClick={(e) => confirmDelete(e, rule)}
                      className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-[4px] flex items-center justify-center transition-all"
                    >
                      <Trash2 size={16} />
                    </button>
                  </Tooltip>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {ruleToDelete && createPortal(
        (() => {
          const workflowsUsingRule = getWorkflowsUsingRule(ruleToDelete.id);
          const hasWorkflows = workflowsUsingRule.length > 0;
          
          return (
            <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200" id="rule-delete-dialog-container">
              <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden border border-slate-100 animate-in zoom-in-95 duration-200">
                <div className="p-6">
                  {hasWorkflows ? (
                    // Warning Dialog - Rule is in use
                    <div>
                      <div className="text-center mb-4">
                        <div className="flex items-center justify-center mx-auto mb-4 text-amber-500">
                          <AlertCircle size={48} />
                        </div>
                        
                        <h3 className="text-lg font-black text-[#010136] tracking-tight leading-tight mb-2">
                          {isTh 
                            ? `rule นี้ถูกใช้ใน ${workflowsUsingRule.length} workflow` 
                            : `This rule is used in ${workflowsUsingRule.length} workflow(s)`}
                        </h3>
                        
                        <p className="text-[#010136]/60 text-sm font-bold">
                          {isTh ? 'ได้แก่' : 'including:'}
                        </p>
                      </div>
                      
                      <ul className="text-left bg-slate-50 border border-slate-100 p-4 rounded-lg my-3 space-y-2 max-h-[160px] overflow-y-auto">
                        {workflowsUsingRule.map((w: any) => (
                          <li key={w.id} className="text-sm font-black text-[#010136] flex items-center gap-2">
                            <span className="text-slate-400">•</span>
                            {w.name}
                          </li>
                        ))}
                      </ul>
                      
                      <div className="space-y-1 mb-6 text-sm font-medium text-slate-500 leading-relaxed bg-red-50/50 border border-red-100 p-4 rounded-lg text-center">
                        <p className="font-bold text-red-600">
                          {isTh ? 'การลบจะกระทบ workflow เหล่านั้น' : 'Deleting it will affect those workflows.'}
                        </p>
                        <p className="font-bold text-red-600">
                          {isTh ? 'Compare node จะแสดง incomplete' : 'The Compare node will display as incomplete.'}
                        </p>
                      </div>

                      <div className="flex gap-3">
                        <button 
                          onClick={() => setRuleToDelete(null)} 
                          className="flex-1 py-3 text-slate-600 font-bold bg-slate-100 hover:bg-slate-200 transition-all text-xs uppercase tracking-wider"
                          style={{ borderRadius: '4px' }}
                        >
                          {isTh ? 'ยกเลิก' : 'Cancel'}
                        </button>
                        <button 
                          onClick={handleDelete}
                          className="flex-[1.5] py-3 text-white font-black bg-[#1F5DF9] hover:bg-[#104BE3] hover:shadow-lg transition-all shadow-md text-xs uppercase tracking-widest"
                          style={{ borderRadius: '4px' }}
                        >
                          {isTh ? 'ใช่, ฉันต้องการลบรายการ' : 'Confirm Delete'}
                        </button>
                      </div>
                    </div>
                  ) : (
                    // Simple Confirmation Dialog - Rule is NOT in use
                    <div className="text-center">
                      <div className="flex items-center justify-center mx-auto mb-4 text-amber-500">
                        <AlertCircle size={48} />
                      </div>
                      
                      <h3 className="text-lg font-black text-[#010136] tracking-tight leading-tight mb-2">
                        {isTh 
                          ? `ต้องการลบ ${ruleToDelete.nameTh || ruleToDelete.name} ใช่หรือไม่` 
                          : `Are you sure you want to delete ${ruleToDelete.name}?`}
                      </h3>
                      
                      <p className="text-slate-500 text-sm mb-6 leading-relaxed">
                        {isTh 
                          ? 'การลบนี้ไม่สามารถกู้คืนได้' 
                          : 'This deletion is permanent and cannot be undone.'}
                      </p>
                      
                      <div className="flex gap-3">
                        <button 
                          onClick={() => setRuleToDelete(null)} 
                          className="flex-1 py-3 text-slate-600 font-bold bg-slate-100 hover:bg-slate-200 transition-all text-xs uppercase tracking-wider"
                          style={{ borderRadius: '4px' }}
                        >
                          {isTh ? 'ยกเลิก' : 'Cancel'}
                        </button>
                        <button 
                          onClick={handleDelete}
                          className="flex-1 py-3 text-white font-black bg-[#1F5DF9] hover:bg-[#104BE3] hover:shadow-lg transition-all shadow-md text-xs uppercase tracking-widest"
                          style={{ borderRadius: '4px' }}
                        >
                          {isTh ? 'ใช่, ฉันต้องการลบรายการ' : 'Confirm'}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })(),
        document.body
      )}
    </div>
  );
};

