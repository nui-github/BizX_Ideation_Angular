import React, { useState } from 'react';
import { Switch } from 'antd';
import { Plus, Search, Edit2, Trash2, Eye, Play, MoreVertical, Activity, CheckCircle, PlayCircle, Layers, LayoutGrid, List as ListIcon, Calendar, Box, Workflow as WorkflowIcon, Filter, Copy, Settings } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Workflow, Language } from '../types';
import { TRANSLATIONS } from '../translations';

interface WorkflowListProps {
  workflows: Workflow[];
  language: Language;
  onEdit: (workflow: Workflow) => void;
  onDelete: (workflow: Workflow) => void;
  onCreate: () => void;
  onToggleStatus?: (workflow: Workflow) => void;
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

export const WorkflowList: React.FC<WorkflowListProps> = ({ workflows, language, onEdit, onDelete, onCreate, onToggleStatus, onDuplicate }) => {
  const t = TRANSLATIONS[language];
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState<'list' | 'card'>('list');
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
    .filter(wf => 
      (statusFilter === 'ALL' || wf.status === statusFilter) &&
      (wf.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
       wf.description.toLowerCase().includes(searchTerm.toLowerCase()))
    )
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const activeCount = workflows.filter(w => w.status === 'ACTIVE').length;
  const totalCount = workflows.length;

  return (
    <div className="flex flex-col h-full bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
      <div className="flex justify-between items-center px-6 py-4 border-b border-slate-200">
        <div>
          <h1 className="text-xl font-bold text-slate-800">{t.datasetBuilder || 'Dataset Builder'}</h1>
          <p className="text-sm text-slate-500 mt-1">Manage your data extraction and transformation workflows.</p>
        </div>
        <button 
          onClick={onCreate}
          className="flex items-center gap-2 px-4 py-2 bg-[#0ea5e9] text-white rounded-[4px] font-medium hover:bg-[#0284c7] transition-colors shadow-sm"
        >
          <Plus size={18} />
          Create Workflow
        </button>
      </div>

      <div className="px-6 py-4 bg-slate-50 border-b border-slate-200">
        <div className="grid grid-cols-4 gap-4">
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
            <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center text-blue-600">
              <Layers size={20} />
            </div>
            <div>
              <p className="text-sm text-slate-500 font-medium">Total Workflows</p>
              <p className="text-2xl font-bold text-slate-800">{totalCount}</p>
            </div>
          </div>
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
            <div className="w-10 h-10 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-600">
              <PlayCircle size={20} />
            </div>
            <div>
              <p className="text-sm text-slate-500 font-medium">Active Workflows</p>
              <p className="text-2xl font-bold text-slate-800">{activeCount}</p>
            </div>
          </div>
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
            <div className="w-10 h-10 rounded-full bg-purple-50 flex items-center justify-center text-purple-600">
              <Activity size={20} />
            </div>
            <div>
              <p className="text-sm text-slate-500 font-medium">Total Executions</p>
              <p className="text-2xl font-bold text-slate-800">1,248</p>
            </div>
          </div>
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
            <div className="w-10 h-10 rounded-full bg-amber-50 flex items-center justify-center text-amber-600">
              <CheckCircle size={20} />
            </div>
            <div>
              <p className="text-sm text-slate-500 font-medium">Success Rate</p>
              <p className="text-2xl font-bold text-slate-800">98.5%</p>
            </div>
          </div>
        </div>
      </div>

      <div className="p-6 border-b border-slate-100 bg-white flex justify-between items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input 
            type="text" 
            placeholder="Search workflows..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 text-sm"
          />
        </div>
        
        <div className="flex items-center gap-3">
          <div className="flex bg-slate-100 p-1 rounded-lg border border-slate-200">
            {['ALL', 'ACTIVE', 'INACTIVE'].map((status) => (
              <button
                key={status}
                onClick={() => setStatusFilter(status as any)}
                className={`px-3 py-1.5 rounded-[4px] text-xs font-bold transition-all ${
                  statusFilter === status 
                    ? 'bg-white shadow-sm text-blue-600' 
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                {status === 'ALL' ? (language === 'TH' ? 'ทั้งหมด' : 'All') : status}
              </button>
            ))}
          </div>
          <div className="h-6 w-px bg-slate-200" />
          <div className="flex items-center bg-slate-100 p-1 rounded-lg border border-slate-200">
            <button 
              onClick={() => setViewMode('list')}
              className={`p-1.5 rounded-[4px] transition-all ${viewMode === 'list' ? 'bg-white shadow-sm text-blue-600' : 'text-slate-400 hover:text-slate-600'}`}
              title={language === 'TH' ? 'แสดงแบบรายการ' : 'List View'}
            >
              <ListIcon size={18} />
            </button>
            <button 
              onClick={() => setViewMode('card')}
              className={`p-1.5 rounded-[4px] transition-all ${viewMode === 'card' ? 'bg-white shadow-sm text-blue-600' : 'text-slate-400 hover:text-slate-600'}`}
              title={language === 'TH' ? 'แสดงแบบการ์ด' : 'Card View'}
            >
              <LayoutGrid size={18} />
            </button>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-6">
        {workflows.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-slate-500">
            <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mb-4">
              <WorkflowIcon size={24} className="text-blue-500" />
            </div>
            <p className="text-lg font-bold text-slate-700 mb-1">
              {language === 'TH' ? 'ยังไม่มีเวิร์กโฟลว์' : 'No Workflows Found'}
            </p>
            <p className="text-sm mb-4 text-center max-w-sm">
              {language === 'TH' ? 'เริ่มต้นจัดการข้อมูลของคุณโดยการสร้างเวิร์กโฟลว์ใหม่' : 'Start managing your data by creating a new workflow.'}
            </p>
            <button 
              onClick={onCreate}
              className="flex items-center gap-2 px-4 py-2 bg-[#0ea5e9] text-white rounded-[4px] font-medium hover:bg-[#0284c7] transition-colors shadow-sm"
            >
              <Plus size={18} />
              {language === 'TH' ? 'สร้างเวิร์กโฟลว์ใหม่' : 'Create Workflow'}
            </button>
          </div>
        ) : filteredWorkflows.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-slate-500">
            <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4">
              <Filter size={24} className="text-slate-400" />
            </div>
            <p className="text-lg font-bold text-slate-700">
              {language === 'TH' ? `ไม่พบเวิร์กโฟลว์ ${statusFilter !== 'ALL' ? statusFilter.toLowerCase() : ''}` : `No ${statusFilter !== 'ALL' ? statusFilter.toLowerCase() : ''} workflows found`}
            </p>
            <p className="text-sm overflow-hidden text-center max-w-sm">
              {language === 'TH' ? 'ลองเปลี่ยนเงื่อนไขการค้นหาหรือตัวกรองของคุณ' : 'Try adjusting your search or filters.'}
            </p>
          </div>
        ) : (
          <div className={viewMode === 'list' ? 'grid gap-4' : 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6'}>
            {filteredWorkflows.map(workflow => (
              viewMode === 'list' ? (
                <div key={workflow.id} className="bg-white border border-slate-200 rounded-xl p-4 hover:shadow-md transition-shadow flex items-center justify-between group">
                  <div className="flex items-start gap-4">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${workflow.status === 'ACTIVE' ? 'bg-blue-100 text-blue-600' : 'bg-slate-100 text-slate-500'}`}>
                      <WorkflowIcon size={20} />
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-800 text-base flex items-center gap-2">
                        {workflow.name}
                        <span className={`text-[9px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${workflow.status === 'ACTIVE' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'}`}>
                          {workflow.status}
                        </span>
                      </h3>
                      <p className="text-xs font-medium text-slate-500 mt-0.5 line-clamp-1">{workflow.description}</p>
                      <div className="flex items-center gap-4 mt-2 text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                        <span className="flex items-center gap-1.5 bg-slate-50 px-2 py-1 rounded"><Calendar size={12} /> {timeAgo(workflow.updatedAt, language)}</span>
                        <span className="flex items-center gap-1.5 bg-slate-50 px-2 py-1 rounded"><Box size={12} /> {workflow.nodes?.length || 0} Nodes</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3 opacity-0 group-hover:opacity-100 transition-opacity">
                    {onToggleStatus && (
                      <div className="flex items-center gap-2 mr-1">
                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                          {workflow.status === 'ACTIVE' ? 'Active' : 'Inactive'}
                        </span>
                        <div className="relative group/tip">
                          <Switch
                            size="small"
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
                    )}
                    <div className="h-5 w-px bg-slate-200"></div>
                    
                    <div className="relative group/tip">
                      <button 
                        onClick={() => onEdit(workflow)}
                        className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-[4px] transition-colors border-2 border-transparent hover:border-blue-200"
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
                          className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-[4px] transition-colors"
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
                        className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-[4px] transition-colors"
                      >
                        <Trash2 size={16} />
                      </button>
                      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 px-2 py-1 bg-slate-800 text-white text-[10px] rounded opacity-0 group-hover/tip:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-[100] font-bold">
                         {language === 'TH' ? 'ลบรายการ' : 'Delete'}
                         <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-800" />
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div key={workflow.id} className="bg-white border border-slate-200 rounded-2xl overflow-hidden hover:shadow-lg transition-all group flex flex-col">
                  <div className={`h-2 ${workflow.status === 'ACTIVE' ? 'bg-green-500' : 'bg-slate-300'}`}></div>
                  <div className="p-6 flex-1 flex flex-col">
                    <div className="flex justify-between items-start mb-4">
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${workflow.status === 'ACTIVE' ? 'bg-blue-50 text-blue-600' : 'bg-slate-50 text-slate-400'}`}>
                        <WorkflowIcon size={24} />
                      </div>
                      <div className="flex items-center gap-1">
                        <div className="relative group/tip">
                          <button 
                            onClick={() => onEdit(workflow)}
                            className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-[4px] transition-colors border-2 border-transparent hover:border-blue-200"
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
                              className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-[4px] transition-colors"
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
                            className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-[4px] transition-colors"
                          >
                            <Trash2 size={16} />
                          </button>
                          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 px-2 py-1 bg-slate-800 text-white text-[10px] rounded opacity-0 group-hover/tip:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-[100] font-bold">
                             {language === 'TH' ? 'ลบรายการ' : 'Delete'}
                             <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-800" />
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <h3 className="font-bold text-slate-800 text-lg mb-2 group-hover:text-blue-600 transition-colors">{workflow.name}</h3>
                    <p className="text-sm text-slate-500 line-clamp-2 mb-6 flex-1">{workflow.description}</p>
                    
                    <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                      <div className="flex flex-col gap-1">
                        <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Last Updated</span>
                        <span className="text-xs text-slate-600 font-medium">{timeAgo(workflow.updatedAt, language)}</span>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Nodes</span>
                        <span className="text-xs text-slate-600 font-medium">{workflow.nodes.length} nodes</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="px-6 py-3 bg-slate-50 border-t border-slate-100 flex justify-between items-center">
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${workflow.status === 'ACTIVE' ? 'bg-green-100 text-green-700' : 'bg-slate-200 text-slate-500'}`}>
                      {workflow.status}
                    </span>
                    {onToggleStatus && (
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                          {workflow.status === 'ACTIVE' ? 'Active' : 'Inactive'}
                        </span>
                        <div className="relative group/tip">
                          <Switch
                            size="small"
                            checked={workflow.status === 'ACTIVE'}
                            onClick={(_checked, e) => {
                              e.stopPropagation();
                              onToggleStatus(workflow);
                            }}
                          />
                          <div className="absolute bottom-full right-0 mb-2 px-2 py-1 bg-slate-800 text-white text-[10px] rounded opacity-0 group-hover/tip:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-[100] font-bold">
                            {language === 'TH' ? 'เปิด/ปิด' : 'Toggle Status'}
                            <div className="absolute top-full right-3 border-4 border-transparent border-t-slate-800" />
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )
            ))}
          </div>
        )}
      </div>

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
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-800 focus:ring-2 focus:ring-blue-500 transition-all outline-none"
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
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-800 focus:ring-2 focus:ring-blue-500 transition-all outline-none resize-none h-24"
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
