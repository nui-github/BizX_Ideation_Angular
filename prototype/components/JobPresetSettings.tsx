import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { Select, Switch, message } from 'antd';
import { motion, AnimatePresence } from 'motion/react';
import { Plus, Trash2, Edit3, CheckCircle2, AlertCircle, ArrowLeft, Settings, Search, X, Check } from 'lucide-react';
import { Language, Workflow, JobPreset, JobPresetWorkflow } from '../types';
import { MOCK_TEAMS } from '../mock-data/teams.mock';
import { Tooltip } from './Tooltip';

interface JobPresetSettingsProps {
  language: Language;
  workflows: Workflow[];
  comparisonWorkflows?: Workflow[];
  presets: JobPreset[];
  onAddPreset: (preset: JobPreset) => void;
  onUpdatePreset: (preset: JobPreset) => void;
  onDeletePreset: (id: string) => void;
  onBack?: () => void;
}

export const JobPresetSettings: React.FC<JobPresetSettingsProps> = ({
  language,
  workflows,
  comparisonWorkflows = [],
  presets,
  onAddPreset,
  onUpdatePreset,
  onDeletePreset,
  onBack
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingPreset, setEditingPreset] = useState<JobPreset | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{ isOpen: boolean; preset: JobPreset | null }>({
    isOpen: false,
    preset: null
  });
  
  // Form State
  const [name, setName] = useState('');
  const [assignedTeams, setAssignedTeams] = useState<string[]>([]);
  const [presetWorkflows, setPresetWorkflows] = useState<JobPresetWorkflow[]>([]);
  const [isActive, setIsActive] = useState(true);

  // Workflow Selection State for adding new workflow in modal
  const [selectedWorkflowId, setSelectedWorkflowId] = useState<string>('');
  const [selectedWorkflowTeams, setSelectedWorkflowTeams] = useState<string[]>([]);

  const t = {
    title: language === 'TH' ? 'ตั้งค่าชุด Shipment เริ่มต้น' : 'Starting Shipment Set Settings',
    subtitle: language === 'TH' ? 'จัดการชุด Shipment เริ่มต้นที่ใช้ตอนสร้าง Shipment ใหม่' : 'Manage the starting shipment sets used when creating a new Shipment',
    search: language === 'TH' ? 'ค้นหาพรีเซ็ต...' : 'Search presets...',
    create: language === 'TH' ? 'สร้างพรีเซ็ต' : 'Create Preset',
    edit: language === 'TH' ? 'แก้ไขพรีเซ็ต' : 'Edit Preset',
    name: language === 'TH' ? 'ชื่อพรีเซ็ต' : 'Preset Name',
    teams: language === 'TH' ? 'ทีมที่ใช้งาน' : 'Assigned Teams',
    workflows: language === 'TH' ? 'รายการเวิร์กโฟลว์' : 'Workflows List',
    addWorkflow: language === 'TH' ? 'เพิ่มเวิร์กโฟลว์' : 'Add Workflow',
    workflowTeam: language === 'TH' ? 'ทีมที่ทำงานในเวิร์กโฟลว์' : 'Teams working on workflow',
    save: language === 'TH' ? 'บันทึก' : 'Save',
    cancel: language === 'TH' ? 'ยกเลิก' : 'Cancel',
    active: language === 'TH' ? 'เปิดใช้งาน' : 'Active',
    noWorkflows: language === 'TH' ? 'ยังไม่มีเวิร์กโฟลว์ กรุณาเพิ่มอย่างน้อย 1 รายการ' : 'No workflows added. Please add at least 1.',
  };

  const allWorkflows = [...workflows, ...comparisonWorkflows];

  const handleOpenModal = (preset?: JobPreset) => {
    if (preset) {
      setEditingPreset(preset);
      setName(preset.name);
      setAssignedTeams(preset.assignedTeams);
      setPresetWorkflows(preset.workflows);
      setIsActive(preset.isActive);
    } else {
      setEditingPreset(null);
      setName('');
      setAssignedTeams([]);
      setPresetWorkflows([]);
      setIsActive(true);
    }
    setSelectedWorkflowId('');
    setSelectedWorkflowTeams([]);
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
  };

  const handleAddWorkflow = () => {
    if (selectedWorkflowId && selectedWorkflowTeams.length > 0) {
      setPresetWorkflows([...presetWorkflows, {
        id: `pwf-${Date.now()}`,
        workflowId: selectedWorkflowId,
        assignedTeams: selectedWorkflowTeams
      }]);
      setSelectedWorkflowId('');
      setSelectedWorkflowTeams([]);
    }
  };

  const handleRemoveWorkflow = (id: string) => {
    setPresetWorkflows(presetWorkflows.filter(pwf => pwf.id !== id));
  };

  const handleSave = () => {
    if (!name.trim() || assignedTeams.length === 0 || presetWorkflows.length === 0) return;

    const newPreset: JobPreset = {
      id: editingPreset ? editingPreset.id : `preset-${Date.now()}`,
      name,
      assignedTeams,
      workflows: presetWorkflows,
      isActive,
      createdAt: editingPreset ? editingPreset.createdAt : new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    if (editingPreset) {
      onUpdatePreset(newPreset);
    } else {
      onAddPreset(newPreset);
    }
    message.success(language === 'TH' ? 'บันทึกพรีเซ็ตสำเร็จ' : 'Preset saved successfully');
    handleCloseModal();
  };

  const filteredPresets = presets.filter(p => p.name.toLowerCase().includes(searchQuery.toLowerCase()));

  const canSave = name.trim() !== '' && assignedTeams.length > 0 && presetWorkflows.length > 0;

  return (
    <div className="bg-white border border-slate-200/80 rounded-3xl p-4 shadow-sm space-y-6" id="job-preset-settings-wrapper">
      {/* Header Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-100">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h1 className="text-xl md:text-2xl font-black text-slate-800 tracking-tight flex items-center gap-2">
              <Settings className="text-blue-600" size={22} />
              {t.title}
            </h1>
          </div>
          <p className="text-xs md:text-sm text-slate-500 font-medium leading-relaxed">
            {t.subtitle}
          </p>
        </div>

        <button
          type="button"
          onClick={() => handleOpenModal()}
          className="h-[38px] px-4 bg-[#1f5df9] hover:bg-[#104BE3] active:scale-95 text-white font-bold text-xs uppercase tracking-wider shadow-md shadow-blue-500/10 flex items-center gap-2 transition cursor-pointer shrink-0"
          style={{ borderRadius: '4px' }}
        >
          <Plus size={15} strokeWidth={2.5} />
          <span>{t.create}</span>
        </button>
      </div>

      {/* Control Filter row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
          <input
            type="text"
            className="w-full text-xs font-semibold px-10 border border-slate-200/80 shadow-xs focus:ring-1 focus:ring-blue-500/25 transition-all font-sans focus:outline-none"
            style={{ height: '38px', borderRadius: '4px' }}
            placeholder={t.search}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 p-0.5 hover:bg-slate-100 rounded-[4px] text-slate-400 hover:text-slate-600 cursor-pointer"
            >
              <X size={12} />
            </button>
          )}
        </div>
      </div>

      {/* Main Area */}
      <div className="!mt-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredPresets.map(preset => (
              <div key={preset.id} className="bg-white rounded-lg border border-slate-200 p-5 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-lg font-black tracking-tight text-[#010136]">{preset.name}</h3>
                    <div className="flex gap-2 mt-1">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${preset.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-500'}`}>
                        {preset.isActive ? 'Active' : 'Inactive'}
                      </span>
                      <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                        {preset.workflows.length} Workflows
                      </span>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <Tooltip content={language === 'TH' ? 'แก้ไขพรีเซ็ต' : 'Edit preset'}>
                      <button
                        onClick={() => handleOpenModal(preset)}
                        className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      >
                        <Edit3 size={16} />
                      </button>
                    </Tooltip>
                    <Tooltip content={language === 'TH' ? 'ลบพรีเซ็ต' : 'Delete preset'}>
                      <button
                        onClick={() => setDeleteConfirm({ isOpen: true, preset })}
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                      >
                        <Trash2 size={16} />
                      </button>
                    </Tooltip>
                  </div>
                </div>

                <div className="space-y-3">
                  <div>
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">{t.teams}</span>
                    <div className="flex flex-wrap gap-1">
                      {preset.assignedTeams.map(team => {
                        const teamLabel = MOCK_TEAMS.find(t => t.value === team)?.label || team;
                        return (
                          <span key={team} className="px-2 py-0.5 bg-blue-50 text-blue-700 text-[10px] font-bold rounded">
                            {teamLabel}
                          </span>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            ))}
        </div>
      </div>

      {/* Modal */}
      {typeof document !== 'undefined' && createPortal(
      <AnimatePresence>
        {showModal && (
          <div className="fixed inset-0 z-[2000] flex justify-end">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
              onClick={handleCloseModal}
            />
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'tween', duration: 0.25, ease: 'easeOut' }}
              className="relative bg-white shadow-2xl w-full max-w-2xl h-full overflow-hidden flex flex-col"
            >
              <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50 shrink-0">
                <h2 className="text-lg font-black text-[#010136] tracking-tight">
                  {editingPreset ? t.edit : t.create}
                </h2>
                <button onClick={handleCloseModal} className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-200 rounded-lg transition-colors">
                  <X size={18} />
                </button>
              </div>

              <div className="p-6 overflow-y-auto flex-1 space-y-6 bg-white">
                <div className="space-y-4">
                  <div>
                    <label className="text-[11px] font-black text-slate-500 uppercase tracking-widest mb-1.5 block">
                      {t.name} <span className="text-rose-500">*</span>
                    </label>
                    <input 
                      type="text" 
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full p-3 bg-white border border-slate-200 rounded-xl text-sm font-bold text-[#010136] placeholder:text-slate-400 placeholder:font-medium focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
                      placeholder="e.g. Standard Import Process"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-black text-slate-500 uppercase tracking-widest mb-1.5 block">
                      {t.teams} <span className="text-rose-500">*</span>
                    </label>
                    <Select
                      mode="multiple"
                      allowClear
                      className="w-full custom-select"
                      popupClassName="!z-[2100]"
                      placeholder={language === 'TH' ? 'เลือกทีม' : 'Select team'}
                      value={assignedTeams}
                      onChange={setAssignedTeams}
                      options={MOCK_TEAMS}
                      style={{ width: '100%' }}
                    />
                    <p className="text-[11px] text-slate-400 font-medium mt-1.5">
                      {language === 'TH'
                        ? 'ทุกบัญชีในทีมที่เลือกจะใช้ชุด shipment นี้โดยอัตโนมัติเมื่อสร้างรายการใหม่'
                        : 'All accounts in the selected teams will automatically use this preset when creating a new shipment.'}
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <Switch checked={isActive} onChange={setIsActive} />
                    <span className="text-xs font-bold text-slate-500">{t.active}</span>
                  </div>
                </div>

                <div className="border-t border-slate-100 pt-6">
                  <h3 className="text-sm font-black text-[#010136] tracking-tight mb-4 flex items-center gap-2">
                    {t.workflows}
                    <span className="bg-slate-100 text-slate-500 text-[10px] px-2 py-0.5 rounded-full">{presetWorkflows.length}</span>
                  </h3>

                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3 mb-4">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1 block">Workflow</label>
                        <Select
                          showSearch
                          className="w-full"
                          popupClassName="!z-[2100]"
                          placeholder={language === 'TH' ? 'เลือกเวิร์กโฟลว์' : 'Select workflow'}
                          value={selectedWorkflowId}
                          onChange={setSelectedWorkflowId}
                          options={allWorkflows.map(w => ({ value: w.id, label: w.name }))}
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1 block">{t.workflowTeam}</label>
                        <Select
                          allowClear
                          className="w-full"
                          popupClassName="!z-[2100]"
                          placeholder={language === 'TH' ? 'เลือกทีม' : 'Select team'}
                          value={selectedWorkflowTeams[0]}
                          onChange={(value) => setSelectedWorkflowTeams(value ? [value] : [])}
                          options={MOCK_TEAMS}
                        />
                      </div>
                    </div>

                    <button
                      onClick={handleAddWorkflow}
                      disabled={!selectedWorkflowId || selectedWorkflowTeams.length === 0}
                      className="w-full py-2 bg-white border border-[#1f5df9] text-[#1f5df9] rounded-[4px] font-bold text-xs hover:bg-blue-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
                    >
                      <Plus size={14} /> {t.addWorkflow}
                    </button>
                  </div>

                  <div>
                    {presetWorkflows.length === 0 ? (
                      <div className="text-center py-6 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                        <AlertCircle size={24} className="text-amber-500 mx-auto mb-2" />
                        <p className="text-xs font-bold text-slate-500">{t.noWorkflows}</p>
                      </div>
                    ) : (
                      <div className="bg-white border border-slate-200 rounded-xl divide-y divide-slate-100 overflow-hidden">
                        {presetWorkflows.map((pwf, index) => {
                          const wf = allWorkflows.find(w => w.id === pwf.workflowId);
                          const isLast = index === presetWorkflows.length - 1;
                          return (
                            <div key={pwf.id} className="flex items-stretch gap-3 p-3 hover:bg-slate-50 transition-colors">
                              <div className="relative flex flex-col items-center w-6 shrink-0">
                                <div className="w-6 h-6 rounded-full bg-blue-50 border border-blue-100 flex items-center justify-center text-[10px] font-black text-blue-600 shrink-0 z-10">
                                  {index + 1}
                                </div>
                                {!isLast && (
                                  <div className="absolute top-0 bottom-0 left-1/2 -translate-x-1/2 w-px bg-blue-100" />
                                )}
                              </div>
                              <div className="flex-1 flex items-center justify-between">
                                <div>
                                  <div className="flex items-center gap-2">
                                    <h4 className="text-sm font-bold text-[#010136]">
                                      {wf?.name || 'Unknown Workflow'}
                                    </h4>
                                    <span className="px-1.5 py-0.5 bg-blue-50 text-blue-600 text-[9px] font-black rounded tracking-wide">
                                      JOB-{String(index + 1).padStart(4, '0')}
                                    </span>
                                  </div>
                                  <div className="flex flex-wrap gap-1 mt-1">
                                    {pwf.assignedTeams.map(team => {
                                      const teamLabel = MOCK_TEAMS.find(t => t.value === team)?.label || team;
                                      return (
                                        <span key={team} className="px-1.5 py-0.5 bg-slate-100 text-slate-600 text-[9px] font-bold rounded">
                                          {teamLabel}
                                        </span>
                                      );
                                    })}
                                  </div>
                                </div>
                                <button
                                  onClick={() => handleRemoveWorkflow(pwf.id)}
                                  className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-colors"
                                >
                                  <Trash2 size={16} />
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex items-center justify-end gap-3 shrink-0">
                <button
                  onClick={handleCloseModal}
                  className="px-4 py-2 bg-white border border-slate-200 text-slate-600 rounded-[4px] font-bold text-sm hover:bg-slate-100 transition-all"
                >
                  {t.cancel}
                </button>
                <button
                  onClick={handleSave}
                  disabled={!canSave}
                  className="px-6 py-2 bg-[#1f5df9] text-white rounded-[4px] font-bold text-sm flex items-center gap-2 hover:bg-[#104BE3] disabled:opacity-50 disabled:hover:bg-[#1f5df9] disabled:cursor-not-allowed transition-all shadow-sm"
                >
                  <Check size={16} />
                  {t.save}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>,
      document.body
      )}

      {/* Delete Confirmation Dialog */}
      {typeof document !== 'undefined' && createPortal(
        <AnimatePresence>
          {deleteConfirm.isOpen && deleteConfirm.preset && (
            <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setDeleteConfirm({ isOpen: false, preset: null })}
                className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm cursor-pointer"
              />

              <motion.div
                initial={{ scale: 0.95, y: 20, opacity: 0 }}
                animate={{ scale: 1, y: 0, opacity: 1 }}
                exit={{ scale: 0.95, y: 20, opacity: 0 }}
                transition={{ type: 'spring', damping: 25, stiffness: 250 }}
                className="relative bg-white rounded-2xl shadow-2xl border border-slate-100 max-w-md w-full overflow-hidden z-10 p-6 text-center"
              >
                <div className="flex items-center justify-center mx-auto mb-4 text-amber-500">
                  <AlertCircle size={48} />
                </div>

                <div className="space-y-1.5 mb-4">
                  <h3 className="text-xl font-black text-[#010136] tracking-tight leading-tight">
                    {language === 'TH'
                      ? `ลบพรีเซ็ต "${deleteConfirm.preset.name}" ใช่หรือไม่`
                      : `Delete "${deleteConfirm.preset.name}"?`}
                  </h3>
                </div>

                <div className="space-y-3 text-left mb-6">
                  {deleteConfirm.preset.isActive && (
                    <p className="text-xs font-bold text-rose-500 leading-relaxed bg-rose-50 border border-rose-100 rounded-xl p-3">
                      {language === 'TH'
                        ? 'พรีเซ็ตนี้กำลังเปิดใช้งานอยู่ (Active) — การลบจะส่งผลต่อการสร้าง Shipment ใหม่ที่อ้างอิงพรีเซ็ตนี้ทันที'
                        : 'This preset is currently Active — deleting it will immediately affect new Shipments that reference this preset.'}
                    </p>
                  )}
                  <p className="text-xs font-semibold text-slate-600 leading-relaxed text-center">
                    {language === 'TH'
                      ? 'คุณยืนยันที่จะลบพรีเซ็ตนี้ใช่หรือไม่? การลบนี้ไม่สามารถกู้คืนได้เมื่อดำเนินการสำเร็จ'
                      : 'Are you sure you want to permanently delete this preset? This action cannot be undone.'}
                  </p>
                </div>

                <div className="flex items-center justify-center gap-3">
                  <button
                    type="button"
                    onClick={() => setDeleteConfirm({ isOpen: false, preset: null })}
                    className="flex-1 py-2.5 rounded-[4px] border border-slate-200 bg-white text-slate-600 font-bold hover:bg-slate-50 text-xs transition active:scale-95 cursor-pointer h-[40px]"
                  >
                    {t.cancel}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (deleteConfirm.preset) {
                        onDeletePreset(deleteConfirm.preset.id);
                      }
                      setDeleteConfirm({ isOpen: false, preset: null });
                    }}
                    className="flex-1 py-2.5 rounded-[4px] bg-[#1F5DF9] hover:bg-[#104BE3] text-white font-bold text-xs transition active:scale-95 cursor-pointer shadow-md shadow-blue-500/10 h-[40px]"
                  >
                    {language === 'TH' ? 'ลบพรีเซ็ต' : 'Confirm Delete'}
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>,
        document.body
      )}

      <style>{`
        .custom-select .ant-select-selector {
          border-radius: 0.75rem !important;
          border-color: #e2e8f0 !important;
          padding: 0.25rem 0.5rem !important;
          min-height: 46px !important;
        }
        .custom-select.ant-select-focused .ant-select-selector {
          border-color: #3b82f6 !important;
          box-shadow: 0 0 0 1px rgba(59, 130, 246, 0.5) !important;
        }
      `}</style>
    </div>
  );
};
