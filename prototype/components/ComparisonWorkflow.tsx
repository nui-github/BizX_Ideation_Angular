import React, { useState } from 'react';
import { Switch } from 'antd';
import { motion, AnimatePresence } from 'motion/react';
import {
  Plus, Search, Filter, MoreHorizontal, Play, Settings,
  Trash2, Copy, ToggleLeft, ToggleRight, ArrowLeftRight,
  ChevronRight, Clock, Box, Layers
} from 'lucide-react';
import { Language, Workflow } from '../types';
import { TRANSLATIONS } from '../translations';

interface ComparisonWorkflowProps {
  language: Language;
  workflows: Workflow[];
  onEdit: (workflow: Workflow) => void;
  onDelete: (workflow: Workflow) => void;
  onCreate: () => void;
  onToggleStatus: (workflow: Workflow) => void;
  onDuplicate?: (workflow: Workflow, newName: string, newDescription: string) => void;
}

const timeAgo = (dateString: string, lang: string) => {
  const date = new Date(dateString);
  const now = new Date();
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  let interval = seconds / 31536000;
  if (interval > 1) return lang === 'TH' ? `${Math.floor(interval)} ปีที่แล้ว` : `${Math.floor(interval)} years ago`;
  interval = seconds / 2592000;
  if (interval > 1) return lang === 'TH' ? `${Math.floor(interval)} เดือนที่แล้ว` : `${Math.floor(interval)} months ago`;
  interval = seconds / 86400;
  if (interval > 1) return lang === 'TH' ? `${Math.floor(interval)} วันที่แล้ว` : `${Math.floor(interval)} days ago`;
  interval = seconds / 3600;
  if (interval > 1) return lang === 'TH' ? `${Math.floor(interval)} ชั่วโมงที่แล้ว` : `${Math.floor(interval)} hours ago`;
  interval = seconds / 60;
  if (interval > 1) return lang === 'TH' ? `${Math.floor(interval)} นาทีที่แล้ว` : `${Math.floor(interval)} minutes ago`;
  return lang === 'TH' ? `เมื่อสักครู่` : `just now`;
};

export const ComparisonWorkflow: React.FC<ComparisonWorkflowProps> = ({ 
  language, workflows, onEdit, onDelete, onCreate, onToggleStatus, onDuplicate
}) => {
  const t = TRANSLATIONS[language];
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'INACTIVE'>('ALL');
  
  const [duplicateModal, setDuplicateModal] = useState<{isOpen: boolean, workflow: Workflow | null, newName: string, newDescription: string, error: string}>({
    isOpen: false,
    workflow: null,
    newName: '',
    newDescription: '',
    error: ''
  });

  const handleOpenDuplicate = (workflow: Workflow) => {
    setDuplicateModal({
      isOpen: true,
      workflow,
      newName: language === 'TH' ? `สำเนาของ ${workflow.name}` : `Copy of ${workflow.name}`,
      newDescription: workflow.description,
      error: ''
    });
  };

  const submitDuplicate = () => {
    if (!duplicateModal.workflow) return;
    if (!duplicateModal.newName.trim()) {
      setDuplicateModal(prev => ({ ...prev, error: language === 'TH' ? 'กรุณาระบุชื่อ workflow' : 'Please enter workflow name' }));
      return;
    }
    
    // Check for duplicate name across all workflows
    if (workflows.some(w => w.name.toLowerCase() === duplicateModal.newName.trim().toLowerCase())) {
      setDuplicateModal(prev => ({ ...prev, error: language === 'TH' ? 'ชื่อนี้มีอยู่แล้ว' : 'This name already exists' }));
      return;
    }
    
    if (onDuplicate) {
      onDuplicate(duplicateModal.workflow, duplicateModal.newName.trim(), duplicateModal.newDescription);
    }
    
    setDuplicateModal(prev => ({ ...prev, isOpen: false }));
  };

  const filteredWorkflows = workflows
    .filter(w => 
      (statusFilter === 'ALL' || w.status === statusFilter) &&
      (w.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
       w.description.toLowerCase().includes(searchTerm.toLowerCase()))
    )
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  return (
    <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-sm space-y-6 animate-in fade-in duration-500" id="comparison-workflows-wrapper">
      {/* Header Bar */}
      <div className="flex justify-between items-center pb-4 border-b border-slate-100">
        <div>
          <h1 className="text-xl md:text-2xl font-black text-slate-800 tracking-tight flex items-center gap-3 animate-in slide-in-from-left duration-300">
            {t.manageWorkflow}
          </h1>
          <p className="text-slate-500 font-bold text-xs md:text-sm">{t.manageWorkflowSubtitle}</p>
        </div>
        <button 
          onClick={onCreate}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-[4px] hover:bg-blue-700 transition-all font-black text-xs md:text-sm shadow-md"
        >
          <Plus size={18} />
          {language === 'TH' ? 'สร้างเวิร์กโฟลว์ใหม่' : 'Create New Workflow'}
        </button>
      </div>

      {workflows.length === 0 ? (
        <div className="bg-white rounded-lg border border-slate-200 shadow-sm flex flex-col items-center justify-center py-20 px-4 text-center">
          <div className="w-20 h-20 bg-blue-50 rounded-full flex items-center justify-center mb-6">
            <ArrowLeftRight size={32} className="text-blue-500" />
          </div>
          <h3 className="text-xl font-black text-slate-800 tracking-tight mb-2">
            {language === 'TH' ? 'ยังไม่มีเวิร์กโฟลว์' : 'No Workflows Found'}
          </h3>
          <p className="text-slate-500 mb-8 max-w-sm">
            {language === 'TH' ? 'เริ่มต้นจัดการข้อมูลของคุณโดยการสร้างเวิร์กโฟลว์ใหม่' : 'Start managing your data by creating a new comparison workflow.'}
          </p>
          <button 
            onClick={onCreate}
            className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-[4px] hover:bg-blue-700 transition-all font-black text-sm shadow-md"
          >
            <Plus size={20} />
            {language === 'TH' ? 'สร้างเวิร์กโฟลว์ใหม่' : 'Create New Workflow'}
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 py-1">
            <div className="relative flex-1 w-full max-w-md animate-in fade-in slide-in-from-left duration-300">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input 
                type="text"
                placeholder={t.phSearch || 'Search workflows...'}
                className="w-full pl-11 pr-4 py-2.5 bg-white border border-slate-200/80 rounded-xl text-sm font-bold text-slate-700 shadow-sm focus:ring-2 focus:ring-blue-500 transition-all outline-none placeholder:font-medium"
                style={{ borderRadius: '8px' }}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            
            <div className="flex bg-slate-200/60 p-1 rounded-xl shadow-inner border border-slate-200/40 animate-in fade-in slide-in-from-right duration-300" style={{ borderRadius: '8px' }}>
              {['ALL', 'ACTIVE', 'INACTIVE'].map((status) => (
                <button
                  key={status}
                  onClick={() => setStatusFilter(status as any)}
                  className={`px-4 py-1.5 rounded-[4px] text-xs font-black uppercase tracking-widest transition-all ${
                    statusFilter === status 
                      ? 'bg-white text-blue-600 shadow-sm' 
                      : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/20'
                  }`}
                  style={{ borderRadius: '6px' }}
                >
                  {status === 'ALL' ? (language === 'TH' ? 'ทั้งหมด' : 'All') : 
                   status === 'ACTIVE' ? t.statusActive : 
                   status === 'INACTIVE' ? t.statusInactive : 
                   status}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-4">
            {filteredWorkflows.length === 0 ? (
              <div className="bg-white rounded-lg border border-slate-200 shadow-sm py-16 flex flex-col items-center justify-center text-center">
                 <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4">
                   <Filter size={24} className="text-slate-400" />
                 </div>
                 <h3 className="text-md font-black text-slate-800 tracking-tight mb-1">
                   {language === 'TH' ? `ไม่พบเวิร์กโฟลว์ ${statusFilter !== 'ALL' ? statusFilter.toLowerCase() : ''}` : `No ${statusFilter !== 'ALL' ? statusFilter.toLowerCase() : ''} workflows found`}
                 </h3>
                 <p className="text-sm font-medium text-slate-400">
                   {language === 'TH' ? 'ลองเปลี่ยนเงื่อนไขการค้นหาหรือตัวกรองของคุณ' : 'Try adjusting your search or filters.'}
                 </p>
              </div>
            ) : (
              filteredWorkflows.map((workflow) => (
                <div key={workflow.id} className="bg-white rounded-lg p-5 border border-slate-200 shadow-sm hover:shadow-md hover:border-blue-300 transition-all group flex flex-col md:flex-row md:items-center justify-between gap-4 relative overflow-hidden">
                  <div className="flex items-start md:items-center gap-4">
                     <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 transition-all shadow-sm border border-transparent group-hover:border-white group-hover:shadow-md
                        ${workflow.status === 'ACTIVE' ? 'bg-blue-50 text-blue-600' : 'bg-slate-100 text-slate-400'}`}>
                        <ArrowLeftRight size={20} />
                     </div>
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                           <h3 className="font-black text-slate-800 text-base leading-tight uppercase tracking-tight">{workflow.name}</h3>
                           <span className={`px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-widest border flex items-center gap-1.5
                             ${workflow.status === 'ACTIVE' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-slate-50 text-slate-500 border-slate-200'}`}>
                             <span className={`w-1.5 h-1.5 rounded-full shadow-sm ${workflow.status === 'ACTIVE' ? 'bg-emerald-500' : 'bg-slate-400'}`}></span>
                             {workflow.status === 'ACTIVE' ? t.statusActive : t.statusInactive}
                           </span>
                        </div>
                        <p className="text-slate-500 font-medium text-xs tracking-tight mb-2 max-w-2xl line-clamp-2 md:line-clamp-1">{workflow.description}</p>
                        
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-[9px] font-black text-slate-400 uppercase tracking-widest">
                           <div className="flex items-center gap-1.5 bg-slate-100 px-2 py-1 rounded-md">
                              <Layers size={10} className="text-slate-400" />
                              <span>{workflow.nodes?.length || 0} Nodes</span>
                           </div>
                           <div className="flex items-center gap-1.5">
                              <Clock size={10} className="text-slate-300" />
                              <span>{timeAgo(workflow.updatedAt, language)}</span>
                           </div>
                       </div>
                      </div>
                   </div>

                    <div className="flex items-center gap-2 self-end md:self-auto mt-2 md:mt-0">
                    <div className="flex items-center gap-3">
                      <div className="relative group/tip">
                        <Switch
                          checked={workflow.status === 'ACTIVE'}
                          onClick={(_checked, e) => {
                            e.stopPropagation();
                            onToggleStatus(workflow);
                          }}
                        />
                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-slate-800 text-white text-[10px] rounded opacity-0 group-hover/tip:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-[100] font-bold">
                           {language === 'TH' ? 'เปิด/ปิด' : 'Toggle Status'}
                           <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-800" />
                        </div>
                      </div>
                    </div>
                    <div className="w-px h-6 bg-slate-200 mx-1"></div>
                    
                    <div className="relative group/tip">
                      <button 
                        onClick={() => onEdit(workflow)}
                        className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 border-2 border-transparent hover:border-blue-200 rounded-[4px] transition-all"
                      >
                        <Settings size={16} />
                      </button>
                      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-slate-800 text-white text-[10px] rounded opacity-0 group-hover/tip:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-[100] font-bold">
                         {language === 'TH' ? 'ตั้งค่า' : 'Configure'}
                         <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-800" />
                      </div>
                    </div>

                    {onDuplicate && (
                      <div className="relative group/tip">
                        <button 
                          onClick={() => handleOpenDuplicate(workflow)}
                          className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-[4px] transition-all"
                        >
                          <Copy size={16} />
                        </button>
                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-slate-800 text-white text-[10px] rounded opacity-0 group-hover/tip:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-[100] font-bold">
                           {language === 'TH' ? 'ทำซ้ำรายการ' : 'Duplicate'}
                           <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-800" />
                        </div>
                      </div>
                    )}

                    <div className="relative group/tip">
                      <button 
                        onClick={() => onDelete(workflow)}
                        className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-[4px] transition-all"
                      >
                        <Trash2 size={16} />
                      </button>
                      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-slate-800 text-white text-[10px] rounded opacity-0 group-hover/tip:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-[100] font-bold">
                         {language === 'TH' ? 'ลบรายการ' : 'Delete'}
                         <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-800" />
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Duplicate Workflow Modal */}
      <AnimatePresence>
        {duplicateModal.isOpen && duplicateModal.workflow && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm"
          >
            <motion.div 
              initial={{ scale: 0.95, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 20 }}
              className="bg-white rounded-3xl shadow-xl w-full max-w-md overflow-hidden"
            >
              <div className="p-6">
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center shrink-0">
                    <Copy size={24} />
                  </div>
                  <div>
                    <h3 className="text-xl font-black text-slate-800 tracking-tight leading-tight">
                      {language === 'TH' ? 'ทำสำเนาเวิร์กโฟลว์' : 'Duplicate Workflow'}
                    </h3>
                    <p className="text-sm font-medium text-slate-500">
                      {language === 'TH' ? 'สร้างเวิร์กโฟลว์ใหม่จากข้อมูลเดิม' : 'Create a new workflow from existing data'}
                    </p>
                  </div>
                </div>

                <div className="space-y-4 mb-8">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-widest mb-1.5">
                      {language === 'TH' ? 'ชื่อเวิร์กโฟลว์ใหม่' : 'New Workflow Name'}
                    </label>
                    <input 
                      type="text"
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm font-bold text-slate-800 focus:ring-2 focus:ring-blue-500 transition-all outline-none"
                      value={duplicateModal.newName}
                      onChange={(e) => setDuplicateModal(prev => ({ ...prev, newName: e.target.value, error: '' }))}
                      autoFocus
                    />
                    {duplicateModal.error && (
                      <p className="text-xs text-rose-500 font-bold mt-1.5">{duplicateModal.error}</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-widest mb-1.5">
                      {language === 'TH' ? 'คำอธิบาย (ไม่บังคับ)' : 'Description (Optional)'}
                    </label>
                    <textarea 
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm font-medium text-slate-800 focus:ring-2 focus:ring-blue-500 transition-all outline-none resize-none h-24"
                      value={duplicateModal.newDescription}
                      onChange={(e) => setDuplicateModal(prev => ({ ...prev, newDescription: e.target.value }))}
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-3">
                  <button 
                    onClick={() => setDuplicateModal(prev => ({ ...prev, isOpen: false }))}
                    className="px-6 py-3 rounded-[4px] text-slate-600 font-bold hover:bg-slate-100 transition-colors text-sm"
                  >
                    {language === 'TH' ? 'ยกเลิก' : 'Cancel'}
                  </button>
                  <button 
                    onClick={submitDuplicate}
                    className="px-6 py-3 rounded-[4px] bg-blue-600 text-white font-bold hover:bg-blue-700 transition-colors shadow-sm shadow-blue-200 text-sm flex items-center gap-2"
                  >
                    <Copy size={16} />
                    {language === 'TH' ? 'ทำสำเนา' : 'Duplicate'}
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

