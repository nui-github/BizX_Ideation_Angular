import React, { useState } from 'react';
import { Select, Switch } from 'antd';
import { motion, AnimatePresence } from 'motion/react';
import { Plus, Trash2, Edit3, CheckCircle2, AlertCircle, ArrowLeft, Settings, Search, X, Check } from 'lucide-react';
import { Language, Workflow, JobPreset, JobPresetWorkflow } from '../types';

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

const MOCK_TEAMS = [
  { value: 'logistics', label: 'Logistics' },
  { value: 'accounting', label: 'Accounting' },
  { value: 'operation', label: 'Operation' },
  { value: 'customer_service', label: 'Customer Service' }
];

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
  
  // Form State
  const [name, setName] = useState('');
  const [assignedTeams, setAssignedTeams] = useState<string[]>([]);
  const [presetWorkflows, setPresetWorkflows] = useState<JobPresetWorkflow[]>([]);
  const [isActive, setIsActive] = useState(true);

  // Workflow Selection State for adding new workflow in modal
  const [selectedWorkflowId, setSelectedWorkflowId] = useState<string>('');
  const [selectedWorkflowTeams, setSelectedWorkflowTeams] = useState<string[]>([]);

  const t = {
    title: language === 'TH' ? 'ตั้งค่าพรีเซ็ตงานเริ่มต้น' : 'Default Job Preset Settings',
    subtitle: language === 'TH' ? 'จัดการพรีเซ็ตสำหรับสร้าง Shipment ใหม่' : 'Manage presets for creating new Shipments',
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
            {onBack && (
              <button
                onClick={onBack}
                className="p-1.5 hover:bg-slate-100 rounded-[4px] text-slate-500 hover:text-slate-700 transition"
                title={language === 'TH' ? 'กลับ' : 'Back'}
              >
                <ArrowLeft size={16} />
              </button>
            )}
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
          className="h-[38px] px-4 bg-[#1f5df9] hover:bg-blue-700 active:scale-95 text-white font-bold text-xs uppercase tracking-wider shadow-md shadow-blue-500/10 flex items-center gap-2 transition cursor-pointer shrink-0"
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
              <div key={preset.id} className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
                {!preset.isActive && (
                  <div className="absolute inset-0 bg-slate-50/50 z-10 pointer-events-none"></div>
                )}
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className={`text-lg font-black tracking-tight ${preset.isActive ? 'text-[#010136]' : 'text-slate-400'}`}>{preset.name}</h3>
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
                    <button 
                      onClick={() => handleOpenModal(preset)}
                      className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                    >
                      <Edit3 size={16} />
                    </button>
                    <button 
                      onClick={() => onDeletePreset(preset.id)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                    >
                      <Trash2 size={16} />
                    </button>
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
      <AnimatePresence>
        {showModal && (
          <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
              onClick={handleCloseModal}
            />
            <motion.div 
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]"
            >
              <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50 shrink-0">
                <h2 className="text-lg font-black text-[#010136] tracking-tight">
                  {editingPreset ? t.edit : t.create}
                </h2>
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-500">{t.active}</span>
                    <Switch checked={isActive} onChange={setIsActive} />
                  </div>
                  <button onClick={handleCloseModal} className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-200 rounded-lg transition-colors">
                    <X size={18} />
                  </button>
                </div>
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
                      className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-[#010136] focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
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
                      placeholder={language === 'TH' ? 'เลือกทีม' : 'Select teams'}
                      value={assignedTeams}
                      onChange={setAssignedTeams}
                      options={MOCK_TEAMS}
                      style={{ width: '100%' }}
                    />
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
                          placeholder={language === 'TH' ? 'เลือกเวิร์กโฟลว์' : 'Select workflow'}
                          value={selectedWorkflowId}
                          onChange={setSelectedWorkflowId}
                          options={allWorkflows.map(w => ({ value: w.id, label: w.name }))}
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1 block">{t.workflowTeam}</label>
                        <Select
                          mode="multiple"
                          allowClear
                          className="w-full"
                          placeholder={language === 'TH' ? 'เลือกทีม' : 'Select teams'}
                          value={selectedWorkflowTeams}
                          onChange={setSelectedWorkflowTeams}
                          options={MOCK_TEAMS}
                        />
                      </div>
                    </div>
                    <button
                      onClick={handleAddWorkflow}
                      disabled={!selectedWorkflowId || selectedWorkflowTeams.length === 0}
                      className="w-full py-2 bg-white border border-slate-200 text-slate-700 rounded-lg font-bold text-xs hover:bg-slate-100 hover:border-slate-300 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
                    >
                      <Plus size={14} /> {t.addWorkflow}
                    </button>
                  </div>

                  <div className="space-y-2">
                    {presetWorkflows.length === 0 ? (
                      <div className="text-center py-6 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                        <AlertCircle size={24} className="text-amber-500 mx-auto mb-2" />
                        <p className="text-xs font-bold text-slate-500">{t.noWorkflows}</p>
                      </div>
                    ) : (
                      presetWorkflows.map((pwf, index) => {
                        const wf = allWorkflows.find(w => w.id === pwf.workflowId);
                        return (
                          <div key={pwf.id} className="flex items-center justify-between p-3 bg-white border border-slate-200 rounded-xl hover:border-blue-300 transition-colors">
                            <div className="flex items-center gap-3">
                              <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center text-[10px] font-black text-slate-500">
                                {index + 1}
                              </div>
                              <div>
                                <h4 className="text-sm font-bold text-[#010136]">{wf?.name || 'Unknown Workflow'}</h4>
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
                            </div>
                            <button 
                              onClick={() => handleRemoveWorkflow(pwf.id)}
                              className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-colors"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              </div>

              <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex items-center justify-end gap-3 shrink-0">
                <button 
                  onClick={handleCloseModal}
                  className="px-4 py-2 bg-white border border-slate-200 text-slate-600 rounded-lg font-bold text-sm hover:bg-slate-100 transition-all"
                >
                  {t.cancel}
                </button>
                <button 
                  onClick={handleSave}
                  disabled={!canSave}
                  className="px-6 py-2 bg-[#1f5df9] text-white rounded-lg font-bold text-sm flex items-center gap-2 hover:bg-blue-600 disabled:opacity-50 disabled:hover:bg-[#1f5df9] disabled:cursor-not-allowed transition-all shadow-sm"
                >
                  <Check size={16} />
                  {t.save}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

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
