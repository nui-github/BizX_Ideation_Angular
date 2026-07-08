import React, { useState } from 'react';
import { Switch } from 'antd';
import {
  ArrowLeft, Save, Power, Check, Settings, FileCode, FolderOpen,
  FlaskConical, History, Mail, Bot, Settings2, MessageSquare, 
  Play, Info, CheckCircle, X, ChevronDown, Filter, PanelLeft, PanelTop,
  Loader2, Circle, CheckCircle2, RotateCcw
} from 'lucide-react';
import { 
  Agent, AgentStatus, AgentType, UserRole, Language,
  AVAILABLE_WORKFLOWS, AVAILABLE_TRIGGERS, ALLOWED_VARIABLES, AuditLog 
} from '../types';
import { TRANSLATIONS } from '../translations';

interface AgentFormProps {
  initialData?: Agent;
  role: UserRole;
  language: Language;
  onSave: (agent: Agent) => void;
  onBack: () => void;
  auditLogs: AuditLog[];
  readOnly?: boolean;
}

// Simple Tooltip Component
interface TooltipProps {
  children: React.ReactNode;
  content: string;
}

const Tooltip: React.FC<TooltipProps> = ({ children, content }) => {
  const [isVisible, setIsVisible] = useState(false);

  return (
    <div 
      className="relative inline-block"
      onMouseEnter={() => setIsVisible(true)}
      onMouseLeave={() => setIsVisible(false)}
    >
      {children}
      {isVisible && (
        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 text-xs font-medium text-white bg-slate-800 rounded shadow-md whitespace-nowrap z-50">
          {content}
          <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-slate-800"></div>
        </div>
      )}
    </div>
  );
};

// Simple internal components for Tailwind UI
const TabButton = ({ active, onClick, icon: Icon, label, mode = 'SIDEBAR' }: any) => {
  if (mode === 'TOP_TABS') {
      return (
          <button
            onClick={onClick}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-medium transition-colors border-b-2 whitespace-nowrap
              ${active 
                ? 'border-sky-500 text-sky-700' 
                : 'border-transparent text-slate-600 hover:text-slate-900 hover:border-slate-200'}
            `}
          >
            <Icon size={16} className={active ? 'text-sky-500' : 'text-slate-400'} />
            {label}
          </button>
      )
  }

  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-medium transition-colors border-l-2
        ${active 
          ? 'bg-sky-50 text-sky-700 border-sky-500' 
          : 'text-slate-600 hover:bg-slate-50 border-transparent'}
      `}
    >
      <Icon size={18} className={active ? 'text-sky-500' : 'text-slate-400'} />
      {label}
    </button>
  );
};

const TagInput = ({ value, onChange, placeholder, disabled, maxLength = 100 }: any) => {
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
    if (disabled) return;
    onChange(value.filter((tag: string) => tag !== tagToRemove));
  };

  return (
    <div className={`flex flex-wrap gap-2 p-2 border rounded-lg bg-white min-h-[42px] focus-within:ring-2 focus-within:ring-sky-500/20 focus-within:border-sky-500 transition-shadow ${disabled ? 'bg-slate-50 opacity-70' : 'border-slate-300'}`}>
      {value.map((tag: string) => (
        <span key={tag} className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded text-sm flex items-center gap-1 border border-slate-200">
          {tag}
          {!disabled && <button onClick={() => removeTag(tag)} className="hover:text-red-500"><X size={12} /></button>}
        </span>
      ))}
      {!disabled && (
        <>
            <input 
              type="text" 
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              maxLength={maxLength}
              placeholder={value.length === 0 ? placeholder : ''}
              className={`flex-1 outline-none text-sm min-w-[120px] bg-transparent ${input.length >= maxLength ? 'text-red-600' : ''}`}
            />
            {input.length > 0 && (
                <span className={`text-xs self-center ${input.length >= maxLength ? 'text-red-500 font-medium' : 'text-slate-400'} pr-1`}>
                    {input.length}/{maxLength}
                </span>
            )}
        </>
      )}
    </div>
  );
};

export const AgentForm: React.FC<AgentFormProps> = ({ initialData, role, language, onSave, onBack, auditLogs, readOnly = false }) => {
  const [activeTab, setActiveTab] = useState('general');
  const [viewMode, setViewMode] = useState<'SIDEBAR' | 'TOP_TABS'>('SIDEBAR');
  const [testResult, setTestResult] = useState<any>(null);
  const [testStatus, setTestStatus] = useState<'IDLE' | 'RUNNING' | 'COMPLETED'>('IDLE');
  const [testProgress, setTestProgress] = useState(0); // 0 = idle, 1..5 = steps
  const t = TRANSLATIONS[language];

  // Limit constants
  const MAX_NAME_LENGTH = 120;
  const MAX_DESC_LENGTH = 500;

  const [formData, setFormData] = useState<Agent>(initialData || {
    id: `agent-${Date.now()}`,
    name: '',
    description: '',
    type: AgentType.MAIL, 
    status: AgentStatus.DRAFT,
    updatedAt: new Date().toISOString(),
    updatedBy: 'Current User',
    createdAt: new Date().toISOString(),
    createdBy: 'Current User',
    companyId: 'comp-001',
    workflowId: '',
    triggerEvent: '',
    startTime: '',
    endTime: '',
    mailConfig: {
      enableFilter: false,
      subjectKeywords: [],
      bodyKeywords: [],
      senderEmail: '',
      receiverEmail: '',
      subjectTemplate: '',
      bodyTemplate: ''
    },
    aiConfig: {
      model: 'gemini-pro',
      inputSource: '',
      outputAction: ''
    },
    driveConfig: {
      autoSave: false,
      autoRename: false,
      autoCreateFolder: false,
      targetFolderPath: '/Shared Drives/Company/',
      renamePattern: '{DocNo}_{Date}',
      folderStructure: '/{Year}/{Month}/'
    }
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const isAdmin = role === UserRole.ADMIN;
  const isFormReadOnly = readOnly || !isAdmin;

  const handleInputChange = (field: string, value: any) => {
    if (isFormReadOnly) return;
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors(prev => ({ ...prev, [field]: '' }));
  };

  const handleNestedChange = (section: 'mailConfig' | 'aiConfig' | 'driveConfig', field: string, value: any) => {
    if (isFormReadOnly) return;
    setFormData(prev => ({
      ...prev,
      [section]: {
        ...prev[section],
        [field]: value
      }
    }));
  };

  const handleCopyVariable = (variable: string) => {
    navigator.clipboard.writeText(variable);
    alert(`${t.copiedToClipboard}: ${variable}`); // Simple alert for now
  };

  const validateForm = (checkStatus: AgentStatus) => {
    const newErrors: Record<string, string> = {};
    if (!formData.name.trim()) newErrors.name = t.errNameReq;
    if (formData.name.length > 120) newErrors.name = t.errNameLen;
    
    if (checkStatus === AgentStatus.ACTIVE) {
      if (!formData.workflowId) newErrors.workflowId = t.errWorkflowReq;
      // If workflow is Time Range, triggerEvent is not required/hidden
      if (formData.workflowId !== 'time-range') {
        if (!formData.triggerEvent) newErrors.triggerEvent = t.errTriggerReq;
      }
    }

    if (formData.driveConfig?.autoSave && !formData.driveConfig.targetFolderPath) {
      newErrors.targetPath = t.errTargetPathReq;
    }

    if (formData.driveConfig?.autoRename && formData.driveConfig.renamePattern) {
        if (/[<>:"/\\|?*]/.test(formData.driveConfig.renamePattern)) {
            newErrors.renamePattern = t.errInvalidPattern;
        }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (targetStatus?: AgentStatus) => {
    if (isFormReadOnly) return;
    const statusToCheck = targetStatus || formData.status;
    
    if (!validateForm(statusToCheck)) {
        if (errors.workflowId || errors.triggerEvent) setActiveTab('general');
        else if (errors.targetPath || errors.renamePattern) setActiveTab('automation');
        return;
    }

    const updatedAgent = {
      ...formData,
      status: statusToCheck,
      updatedAt: new Date().toISOString()
    };
    onSave(updatedAgent);
  };

  const runTest = async () => {
    setTestStatus('RUNNING');
    setTestResult(null);
    setTestProgress(0);

    const steps = [1, 2, 3, 4, 5];
    for (const step of steps) {
        setTestProgress(step);
        // Simulate step delay
        await new Promise(r => setTimeout(r, 800)); // Slightly longer delay for visual effect
    }

    setTestStatus('COMPLETED');
    setTestResult({
        success: true,
        message: t.msgSuccess,
        details: {
            Trigger: "Manual Test",
            Input: formData.type === AgentType.MAIL ? "Sample Email Subject: Invoice #1234" : "Sample Context Data",
            Actions: [
                "Filter matched: Yes",
                "Workflow Triggered: Invoice Processing",
                formData.driveConfig?.autoSave ? `File Saved to: ${formData.driveConfig.targetFolderPath}` : "File Save: Skipped"
            ]
        }
    });
  };

  const getRenamingPreview = (pattern: string) => {
      if (!pattern) return '';
      const today = new Date();
      return pattern
        .replace(/{DocNo}/g, 'INV-2025-001')
        .replace(/{Date}/g, today.toISOString().split('T')[0])
        .replace(/{Customer}/g, 'Acme_Corp')
        .replace(/{AgentName}/g, (formData.name || 'MyAgent').replace(/\s+/g, '_'))
        .replace(/{Year}/g, today.getFullYear().toString())
        .replace(/{Month}/g, (today.getMonth() + 1).toString().padStart(2, '0'))
        .replace(/{DocType}/g, 'Invoice');
  };

  const TEST_STEPS = [
    { id: 1, label: t.stepInit, desc: t.descInit },
    { id: 2, label: t.stepConfig, desc: t.descConfig },
    { id: 3, label: t.stepConnect, desc: t.descConnect },
    { id: 4, label: t.stepProcess, desc: t.descProcess },
    { id: 5, label: t.stepSave, desc: t.descSave },
  ];

  return (
    <div className="flex flex-col h-full bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden max-w-7xl mx-auto">
      {/* Header */}
      <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex items-center gap-4">
           <button onClick={onBack} className="p-2 hover:bg-slate-200 rounded-[4px] transition-colors text-slate-500">
             <ArrowLeft size={20} />
           </button>
           <div>
             <h2 className="text-xl font-bold text-slate-900 flex items-center gap-3">
               {initialData 
                 ? (isFormReadOnly ? `${t.viewAgent}: ${formData.name}` : `${t.editAgent}: ${formData.name}`) 
                 : t.createNewAgent}
                <span className={`px-2 py-0.5 rounded text-xs font-bold uppercase tracking-wider
                  ${formData.status === AgentStatus.ACTIVE ? 'bg-emerald-100 text-emerald-700' : 
                    formData.status === AgentStatus.INACTIVE ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}
                >
                  {formData.status}
                </span>
             </h2>
           </div>
        </div>

        <div className="flex items-center gap-3">
            {/* View Toggle */}
            <div className="flex items-center bg-slate-100 p-1 rounded-lg border border-slate-200">
                <Tooltip content={t.viewSidebar}>
                  <button 
                     onClick={() => setViewMode('SIDEBAR')}
                     className={`p-1.5 rounded-[4px] transition-all ${viewMode === 'SIDEBAR' ? 'bg-white shadow text-sky-600' : 'text-slate-400 hover:text-slate-600'}`}
                  >
                      <PanelLeft size={16} />
                  </button>
                </Tooltip>
                <Tooltip content={t.viewTabs}>
                  <button 
                     onClick={() => setViewMode('TOP_TABS')}
                     className={`p-1.5 rounded-[4px] transition-all ${viewMode === 'TOP_TABS' ? 'bg-white shadow text-sky-600' : 'text-slate-400 hover:text-slate-600'}`}
                  >
                      <PanelTop size={16} />
                  </button>
                </Tooltip>
            </div>

            {!isFormReadOnly && isAdmin && (
              <div className="flex items-center gap-2">
                  <button 
                    onClick={() => handleSubmit(AgentStatus.DRAFT)}
                    className="px-4 py-2 text-slate-600 bg-white border border-slate-200 rounded-[4px] hover:bg-slate-50 font-medium text-sm transition-colors"
                  >
                    {t.saveDraft}
                  </button>
                  <button 
                    onClick={() => handleSubmit(AgentStatus.ACTIVE)}
                    disabled={!!errors.workflowId || (formData.workflowId !== 'time-range' && !!errors.triggerEvent)}
                    className="flex items-center gap-2 px-4 py-2 bg-sky-500 text-white rounded-[4px] hover:bg-sky-600 font-medium text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                      <Check size={16} />
                      {formData.status === AgentStatus.ACTIVE ? t.saveChanges : t.publishEnable}
                  </button>
                  {formData.status === AgentStatus.ACTIVE && (
                      <button 
                        onClick={() => handleSubmit(AgentStatus.INACTIVE)}
                        className="p-2 text-red-500 hover:bg-red-50 rounded-[4px] border border-transparent hover:border-red-100 transition-colors"
                        title={t.disableAgent}
                      >
                        <Power size={20} />
                      </button>
                  )}
              </div>
            )}
        </div>
      </div>

      <div className={`flex flex-1 overflow-hidden ${viewMode === 'TOP_TABS' ? 'flex-col' : 'flex-row'}`}>
        {/* Tabs / Sidebar Navigation */}
        <div className={`
             ${viewMode === 'SIDEBAR' 
                ? 'w-64 bg-slate-50 border-r border-slate-200 flex flex-col pt-4 overflow-y-auto shrink-0' 
                : 'w-full bg-white border-b border-slate-200 flex overflow-x-auto shrink-0 px-4'}
          `}>
          <TabButton mode={viewMode} active={activeTab === 'general'} onClick={() => setActiveTab('general')} icon={Settings} label={t.tabGeneral} />
          <TabButton mode={viewMode} active={activeTab === 'config'} onClick={() => setActiveTab('config')} icon={FileCode} label={t.tabConfig} />
          <TabButton mode={viewMode} active={activeTab === 'automation'} onClick={() => setActiveTab('automation')} icon={FolderOpen} label={t.tabAutomation} />
          <TabButton mode={viewMode} active={activeTab === 'test'} onClick={() => setActiveTab('test')} icon={FlaskConical} label={t.tabTest} />
          <TabButton mode={viewMode} active={activeTab === 'history'} onClick={() => setActiveTab('history')} icon={History} label={t.tabHistory} />
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-8">
          
          {/* GENERAL TAB */}
          {activeTab === 'general' && (
            <div className="max-w-3xl space-y-6">
               <div>
                  <div className="flex justify-between items-center mb-1">
                      <label className="block text-sm font-semibold text-slate-700">{t.labelAgentName} <span className="text-red-500">*</span></label>
                      <span className={`text-xs ${formData.name.length >= MAX_NAME_LENGTH ? 'text-red-500 font-medium' : 'text-slate-400'}`}>
                          {formData.name.length}/{MAX_NAME_LENGTH}
                      </span>
                  </div>
                  <input 
                    type="text" 
                    value={formData.name}
                    onChange={e => handleInputChange('name', e.target.value)}
                    disabled={isFormReadOnly}
                    maxLength={MAX_NAME_LENGTH}
                    placeholder={t.phAgentName}
                    className={`w-full px-4 py-2.5 rounded-lg border focus:ring-2 focus:outline-none transition-shadow ${
                        errors.name 
                        ? 'border-red-500 focus:ring-red-200' 
                        : formData.name.length >= MAX_NAME_LENGTH 
                            ? 'border-red-300 focus:ring-red-100 focus:border-red-400'
                            : 'border-slate-300 focus:ring-sky-200 focus:border-sky-500'
                    }`}
                  />
                  {errors.name && <p className="mt-1 text-xs text-red-500">{errors.name}</p>}
               </div>
               
               <div className="grid grid-cols-2 gap-6">
                 <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1">{t.labelAgentType} <span className="text-red-500">*</span></label>
                    <div className="relative">
                      <select 
                        value={formData.type}
                        onChange={e => handleInputChange('type', e.target.value)}
                        disabled={isFormReadOnly}
                        className="w-full px-4 py-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-sky-200 focus:border-sky-500 appearance-none bg-white"
                      >
                         <option value={AgentType.MAIL}>{t.mailAgent}</option>
                         <option value={AgentType.AI}>{t.aiAgent}</option>
                      </select>
                      <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={16} />
                    </div>
                 </div>
               </div>

               <div className="bg-blue-50 border border-blue-100 rounded-xl p-5">
                 <h3 className="text-blue-800 font-semibold flex items-center gap-2 mb-4">
                   <Settings2 size={18} /> {t.headerWorkflow}
                 </h3>
                 <div className="grid grid-cols-2 gap-6">
                    <div>
                       <label className="block text-sm font-medium text-slate-700 mb-1">{t.labelWorkflow} <span className="text-red-500">*</span></label>
                       <div className="relative">
                          <select 
                            value={formData.workflowId}
                            onChange={e => handleInputChange('workflowId', e.target.value)}
                            disabled={isFormReadOnly}
                            className={`w-full px-3 py-2 rounded-lg border appearance-none bg-white focus:outline-none focus:ring-2 ${errors.workflowId ? 'border-red-300 focus:ring-red-200' : 'border-slate-300 focus:ring-blue-200'}`}
                          >
                             <option value="">{t.phWorkflow}</option>
                             {AVAILABLE_WORKFLOWS.map(wf => <option key={wf.id} value={wf.id}>{wf.name}</option>)}
                          </select>
                          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={16} />
                       </div>
                       {errors.workflowId && <p className="mt-1 text-xs text-red-500">{errors.workflowId}</p>}
                       <p className="mt-1 text-xs text-slate-500">{t.helpWorkflow}</p>
                    </div>
                    <div>
                       {formData.workflowId !== 'time-range' && (
                         <>
                           <label className="block text-sm font-medium text-slate-700 mb-1">{t.labelTrigger} <span className="text-red-500">*</span></label>
                           <div className="relative">
                              <select 
                                value={formData.triggerEvent}
                                onChange={e => handleInputChange('triggerEvent', e.target.value)}
                                disabled={isFormReadOnly}
                                className={`w-full px-3 py-2 rounded-lg border appearance-none bg-white focus:outline-none focus:ring-2 ${errors.triggerEvent ? 'border-red-300 focus:ring-red-200' : 'border-slate-300 focus:ring-blue-200'}`}
                              >
                                 <option value="">{t.phTrigger}</option>
                                 {AVAILABLE_TRIGGERS.map(tr => <option key={tr} value={tr}>{tr}</option>)}
                              </select>
                              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={16} />
                           </div>
                           {errors.triggerEvent && <p className="mt-1 text-xs text-red-500">{errors.triggerEvent}</p>}
                           <p className="mt-1 text-xs text-slate-500">{t.helpTrigger}</p>
                         </>
                       )}
                       
                       {/* Time Range Inputs - Shown only if Workflow is 'time-range' */}
                       {formData.workflowId === 'time-range' && (
                           <div className="flex gap-4 mt-0 p-3 bg-white border border-slate-200 rounded-lg animate-in fade-in slide-in-from-top-2 duration-200 shadow-sm">
                               <div className="flex-1">
                                   <label className="block text-xs font-medium text-slate-700 mb-1">{t.labelStartTime}</label>
                                   <input 
                                     type="time" 
                                     value={formData.startTime || ''}
                                     onChange={e => handleInputChange('startTime', e.target.value)}
                                     className="w-full px-3 py-2 rounded-md border border-slate-300 text-sm focus:ring-2 focus:ring-blue-200 focus:border-blue-500 outline-none"
                                     disabled={isFormReadOnly}
                                   />
                               </div>
                               <div className="flex-1">
                                   <label className="block text-xs font-medium text-slate-700 mb-1">{t.labelEndTime}</label>
                                   <input 
                                     type="time" 
                                     value={formData.endTime || ''}
                                     onChange={e => handleInputChange('endTime', e.target.value)}
                                     className="w-full px-3 py-2 rounded-md border border-slate-300 text-sm focus:ring-2 focus:ring-blue-200 focus:border-blue-500 outline-none"
                                     disabled={isFormReadOnly}
                                   />
                               </div>
                           </div>
                       )}
                    </div>
                 </div>
               </div>

               <div>
                  <div className="flex justify-between items-center mb-1">
                      <label className="block text-sm font-semibold text-slate-700">{t.labelDesc}</label>
                      <span className={`text-xs ${formData.description.length >= MAX_DESC_LENGTH ? 'text-red-500 font-medium' : 'text-slate-400'}`}>
                          {formData.description.length}/{MAX_DESC_LENGTH}
                      </span>
                  </div>
                  <textarea 
                    rows={4} 
                    value={formData.description}
                    onChange={e => handleInputChange('description', e.target.value)}
                    disabled={isFormReadOnly}
                    maxLength={MAX_DESC_LENGTH}
                    placeholder={t.phDesc}
                    className={`w-full px-4 py-2.5 rounded-lg border focus:ring-2 focus:outline-none transition-shadow ${
                        formData.description.length >= MAX_DESC_LENGTH 
                            ? 'border-red-300 focus:ring-red-100 focus:border-red-400'
                            : 'border-slate-300 focus:ring-sky-200 focus:border-sky-500'
                    }`}
                  />
               </div>
            </div>
          )}

          {/* CONFIG TAB */}
          {activeTab === 'config' && (
             <div className="max-w-3xl space-y-8">
               {formData.type === AgentType.MAIL ? (
                 <>
                   <div>
                     <div className="flex items-center gap-2 text-slate-800 font-bold text-lg mb-4 border-b border-slate-200 pb-2">
                        <Mail className="text-sky-500" size={20} /> {t.headerEmailScope}
                     </div>
                     <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-6">
                        <div className="grid grid-cols-2 gap-6">
                           <div>
                              <label className="block text-sm font-semibold text-slate-700 mb-1">{t.labelSender}</label>
                              <div className="relative">
                                <select 
                                  value={formData.mailConfig?.senderEmail}
                                  onChange={e => handleNestedChange('mailConfig', 'senderEmail', e.target.value)}
                                  disabled={isFormReadOnly}
                                  className="w-full px-3 py-2.5 rounded-lg border border-slate-300 appearance-none bg-white focus:ring-2 focus:ring-sky-200 focus:border-sky-500"
                                >
                                   <option value="">{t.phSender}</option>
                                   <option value="notifications@acme.com">notifications@acme.com</option>
                                   <option value="support@acme.com">support@acme.com</option>
                                </select>
                                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={16} />
                              </div>
                           </div>
                           <div>
                              <label className="block text-sm font-semibold text-slate-700 mb-1">{t.labelReceiver}</label>
                              <input 
                                type="text"
                                value={formData.mailConfig?.receiverEmail}
                                onChange={e => handleNestedChange('mailConfig', 'receiverEmail', e.target.value)}
                                disabled={isFormReadOnly}
                                placeholder={t.phReceiver}
                                className="w-full px-3 py-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-sky-200 focus:border-sky-500"
                              />
                           </div>
                        </div>

                        <div className="pt-4 border-t border-slate-100">
                           <div className="flex justify-between items-center mb-4">
                              <div className="flex items-center gap-3">
                                 <div className="p-2 bg-slate-100 text-slate-500 rounded-lg"><Filter size={18} /></div>
                                 <div>
                                    <div className="font-semibold text-slate-800">{t.headerAdvancedFilter}</div>
                                    <div className="text-xs text-slate-500">{t.helpAdvancedFilter}</div>
                                 </div>
                              </div>
                              <Switch
                                checked={formData.mailConfig?.enableFilter}
                                onChange={(checked) => handleNestedChange('mailConfig', 'enableFilter', checked)}
                                disabled={isFormReadOnly}
                              />
                           </div>

                           {formData.mailConfig?.enableFilter && (
                             <div className="space-y-4 pl-12">
                                <div>
                                   <label className="block text-sm font-medium text-slate-700 mb-1">{t.labelSubjectKeys}</label>
                                   <TagInput 
                                      value={formData.mailConfig?.subjectKeywords}
                                      onChange={(v: string[]) => handleNestedChange('mailConfig', 'subjectKeywords', v)}
                                      disabled={isFormReadOnly}
                                      placeholder={t.phKeyword}
                                   />
                                   <p className="mt-1 text-xs text-slate-500 flex items-center gap-1">
                                      <Info size={12} /> {t.helpKeywordLimit}
                                   </p>
                                </div>
                                <div>
                                   <label className="block text-sm font-medium text-slate-700 mb-1">{t.labelBodyKeys}</label>
                                   <TagInput 
                                      value={formData.mailConfig?.bodyKeywords}
                                      onChange={(v: string[]) => handleNestedChange('mailConfig', 'bodyKeywords', v)}
                                      disabled={isFormReadOnly}
                                      placeholder={t.phKeyword}
                                   />
                                   <p className="mt-1 text-xs text-slate-500 flex items-center gap-1">
                                      <Info size={12} /> {t.helpKeywordLimit}
                                   </p>
                                </div>
                             </div>
                           )}
                        </div>
                     </div>
                   </div>

                   <div>
                     <div className="flex items-center gap-2 text-slate-800 font-bold text-lg mb-4 border-b border-slate-200 pb-2">
                        <MessageSquare className="text-sky-500" size={20} /> {t.headerTemplate}
                     </div>
                     <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
                        <div>
                           <label className="block text-sm font-semibold text-slate-700 mb-1">{t.labelSubjTemplate}</label>
                           <input 
                             type="text"
                             value={formData.mailConfig?.subjectTemplate}
                             onChange={e => handleNestedChange('mailConfig', 'subjectTemplate', e.target.value)}
                             disabled={isFormReadOnly}
                             placeholder={t.phSubjTemplate}
                             className="w-full px-3 py-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-sky-200 focus:border-sky-500"
                           />
                        </div>
                        <div>
                           <label className="block text-sm font-semibold text-slate-700 mb-1">{t.labelBodyTemplate}</label>
                           <textarea 
                             rows={6}
                             value={formData.mailConfig?.bodyTemplate}
                             onChange={e => handleNestedChange('mailConfig', 'bodyTemplate', e.target.value)}
                             disabled={isFormReadOnly}
                             placeholder={t.phBodyTemplate}
                             className="w-full px-3 py-2.5 rounded-lg border border-slate-300 font-mono text-sm focus:ring-2 focus:ring-sky-200 focus:border-sky-500"
                           />
                        </div>
                        
                        <div className="bg-blue-50 border border-blue-100 rounded-lg p-3 flex items-start gap-3">
                           <Info className="text-blue-500 shrink-0 mt-0.5" size={18} />
                           <div>
                              <div className="text-xs font-bold text-blue-700 mb-1">{t.labelSupportedVars}</div>
                              <div className="flex flex-wrap gap-2">
                                 {ALLOWED_VARIABLES.map(v => (
                                    <Tooltip key={v} content={t.clickToCopy}>
                                        <button 
                                          onClick={() => handleCopyVariable(v)}
                                          className="text-xs bg-white text-blue-600 border border-blue-200 px-2 py-1 rounded-[4px] hover:border-blue-400 hover:text-blue-800 transition-colors cursor-pointer"
                                        >
                                          {v}
                                        </button>
                                    </Tooltip>
                                 ))}
                              </div>
                           </div>
                        </div>
                     </div>
                   </div>
                 </>
               ) : (
                 <>
                   <div className="flex items-center gap-2 text-slate-800 font-bold text-lg mb-4 border-b border-slate-200 pb-2">
                      <Bot className="text-purple-500" size={20} /> {t.headerAISettings}
                   </div>
                   <div className="bg-purple-50 p-6 rounded-xl border border-purple-100 space-y-6">
                      <div>
                          <label className="block text-sm font-semibold text-purple-900 mb-1">{t.labelAIModel}</label>
                          <div className="relative">
                            <select 
                              value={formData.aiConfig?.model}
                              onChange={e => handleNestedChange('aiConfig', 'model', e.target.value)}
                              disabled={isFormReadOnly}
                              className="w-full px-3 py-2.5 rounded-lg border border-purple-200 bg-white focus:ring-2 focus:ring-purple-200 focus:border-purple-500 appearance-none"
                            >
                                <option value="gemini-pro">Gemini Pro</option>
                                <option value="gpt-4">GPT-4</option>
                                <option value="claude-3">Claude 3</option>
                            </select>
                            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={16} />
                          </div>
                      </div>
                      <div>
                          <label className="block text-sm font-semibold text-purple-900 mb-1">{t.labelInputContext}</label>
                          <textarea 
                              rows={4}
                              value={formData.aiConfig?.inputSource}
                              onChange={e => handleNestedChange('aiConfig', 'inputSource', e.target.value)}
                              disabled={isFormReadOnly}
                              placeholder={t.phInputContext}
                              className="w-full px-3 py-2.5 rounded-lg border border-purple-200 bg-white focus:ring-2 focus:ring-purple-200 focus:border-purple-500"
                          />
                      </div>
                      <div>
                          <label className="block text-sm font-semibold text-purple-900 mb-1">{t.labelOutputAction}</label>
                          <textarea 
                              rows={4}
                              value={formData.aiConfig?.outputAction}
                              onChange={e => handleNestedChange('aiConfig', 'outputAction', e.target.value)}
                              disabled={isFormReadOnly}
                              placeholder={t.phOutputAction}
                              className="w-full px-3 py-2.5 rounded-lg border border-purple-200 bg-white focus:ring-2 focus:ring-purple-200 focus:border-purple-500"
                          />
                      </div>
                   </div>
                 </>
               )}
             </div>
          )}

          {/* AUTOMATION TAB */}
          {activeTab === 'automation' && (
            <div className="max-w-3xl space-y-6">
                
                {/* Auto Save */}
                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                   <div className="flex justify-between items-center mb-4">
                      <div className="flex items-center gap-3">
                         <div className="p-2 bg-blue-100 text-blue-600 rounded-lg"><Save size={18} /></div>
                         <div>
                            <div className="font-semibold text-slate-800">{t.headerAutoSave}</div>
                            <div className="text-xs text-slate-500">{t.descAutoSave}</div>
                         </div>
                      </div>
                      <Switch
                        checked={formData.driveConfig?.autoSave}
                        onChange={(checked) => handleNestedChange('driveConfig', 'autoSave', checked)}
                        disabled={isFormReadOnly}
                      />
                   </div>
                   
                   {formData.driveConfig?.autoSave && (
                      <div className="pl-12 mt-4">
                          <label className="block text-sm font-medium text-slate-700 mb-1">{t.labelTargetPath} <span className="text-red-500">*</span></label>
                          <div className="flex gap-2">
                             <input 
                               type="text"
                               value={formData.driveConfig?.targetFolderPath}
                               onChange={e => handleNestedChange('driveConfig', 'targetFolderPath', e.target.value)}
                               disabled={isFormReadOnly}
                               placeholder="/My Drive/Agent_Output/"
                               className={`flex-1 px-3 py-2 rounded-lg border focus:ring-2 focus:outline-none ${errors.targetPath ? 'border-red-500 focus:ring-red-200' : 'border-slate-300 focus:ring-sky-200 focus:border-sky-500'}`}
                             />
                             <button className="px-3 bg-slate-100 border border-slate-200 rounded-[4px] text-slate-600 hover:bg-slate-200"><CheckCircle size={18} /></button>
                          </div>
                          {errors.targetPath && <p className="mt-1 text-xs text-red-500">{errors.targetPath}</p>}
                      </div>
                   )}
                </div>

                {/* Auto Rename */}
                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                   <div className="flex justify-between items-center mb-4">
                      <div className="flex items-center gap-3">
                         <div className="p-2 bg-amber-100 text-amber-600 rounded-lg"><FileCode size={18} /></div>
                         <div>
                            <div className="font-semibold text-slate-800">{t.headerAutoRename}</div>
                            <div className="text-xs text-slate-500">{t.descAutoRename}</div>
                         </div>
                      </div>
                      <Switch
                        checked={formData.driveConfig?.autoRename}
                        onChange={(checked) => handleNestedChange('driveConfig', 'autoRename', checked)}
                        disabled={isFormReadOnly}
                      />
                   </div>
                   
                   {formData.driveConfig?.autoRename && (
                      <div className="pl-12 mt-4 space-y-3">
                          <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">{t.labelRenamePattern}</label>
                            <input 
                                type="text"
                                value={formData.driveConfig?.renamePattern}
                                onChange={e => handleNestedChange('driveConfig', 'renamePattern', e.target.value)}
                                disabled={isFormReadOnly}
                                placeholder="{DocNo}_{Customer}_{Date}"
                                className={`w-full px-3 py-2 rounded-lg border focus:ring-2 focus:outline-none ${errors.renamePattern ? 'border-red-500 focus:ring-red-200' : 'border-slate-300 focus:ring-sky-200 focus:border-sky-500'}`}
                            />
                          </div>
                          
                          {formData.driveConfig?.renamePattern && (
                              <div className="bg-emerald-50 text-emerald-800 text-sm px-4 py-2 rounded-lg border border-emerald-100 flex items-center gap-2">
                                <Info size={16} className="text-emerald-600" />
                                <span className="font-semibold">{t.labelPreview}:</span> 
                                <span className="font-mono">{getRenamingPreview(formData.driveConfig.renamePattern)}</span>
                              </div>
                          )}

                          <div className="flex flex-wrap gap-2 text-xs">
                             <span className="text-slate-500 self-center mr-1">{t.labelSupportedVars}:</span>
                             {ALLOWED_VARIABLES.map(v => (
                                <Tooltip key={v} content={t.clickToCopy}>
                                    <button onClick={() => handleCopyVariable(v)} className="px-2 py-1 bg-slate-100 rounded-[4px] hover:bg-slate-200 hover:text-sky-600 transition-colors">{v}</button>
                                </Tooltip>
                             ))}
                          </div>
                      </div>
                   )}
                </div>

                {/* Auto Folder */}
                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                   <div className="flex justify-between items-center mb-4">
                      <div className="flex items-center gap-3">
                         <div className="p-2 bg-emerald-100 text-emerald-600 rounded-lg"><FolderOpen size={18} /></div>
                         <div>
                            <div className="font-semibold text-slate-800">{t.headerAutoFolder}</div>
                            <div className="text-xs text-slate-500">{t.descAutoFolder}</div>
                         </div>
                      </div>
                      <Switch
                        checked={formData.driveConfig?.autoCreateFolder}
                        onChange={(checked) => handleNestedChange('driveConfig', 'autoCreateFolder', checked)}
                        disabled={isFormReadOnly}
                      />
                   </div>
                   
                   {formData.driveConfig?.autoCreateFolder && (
                      <div className="pl-12 mt-4 space-y-3">
                          <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">{t.labelFolderRule}</label>
                            <input 
                                type="text"
                                value={formData.driveConfig?.folderStructure}
                                onChange={e => handleNestedChange('driveConfig', 'folderStructure', e.target.value)}
                                disabled={isFormReadOnly}
                                placeholder="/{Year}/{Month}/{Customer}/"
                                className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-sky-200 focus:border-sky-500 outline-none"
                            />
                          </div>

                          {formData.driveConfig?.folderStructure && (
                              <div className="bg-emerald-50 text-emerald-800 text-sm px-4 py-2 rounded-lg border border-emerald-100 flex items-center gap-2">
                                <Info size={16} className="text-emerald-600" />
                                <span className="font-semibold">{t.labelPreview}:</span> 
                                <span className="font-mono">{getRenamingPreview(formData.driveConfig.folderStructure)}</span>
                              </div>
                          )}
                          
                          <div className="flex flex-wrap gap-2 text-xs">
                             <span className="text-slate-500 self-center mr-1">{t.labelSupportedVars}:</span>
                             {ALLOWED_VARIABLES.map(v => (
                                <Tooltip key={v} content={t.clickToCopy}>
                                    <button onClick={() => handleCopyVariable(v)} className="px-2 py-1 bg-slate-100 rounded-[4px] hover:bg-slate-200 hover:text-sky-600 transition-colors">{v}</button>
                                </Tooltip>
                             ))}
                          </div>
                      </div>
                   )}
                </div>
            </div>
          )}

          {/* TEST TAB */}
          {activeTab === 'test' && (
             <div className="max-w-3xl mx-auto">
                <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
                   <div className="px-8 py-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                      <div>
                        <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2"><FlaskConical className="text-sky-500" size={20} /> {t.headerTestSim}</h3>
                        <p className="text-sm text-slate-500 mt-1">{t.subHeaderTestSim}</p>
                      </div>
                      {role === UserRole.ADMIN && !isFormReadOnly ? (
                          <button 
                            onClick={runTest}
                            disabled={testStatus === 'RUNNING'}
                            className="bg-sky-600 hover:bg-sky-500 text-white px-5 py-2.5 rounded-[4px] text-sm font-medium flex items-center gap-2 disabled:opacity-50 transition-colors shadow-sm"
                          >
                            {testStatus === 'RUNNING' ? <Loader2 size={16} className="animate-spin" /> : (testStatus === 'COMPLETED' ? <RotateCcw size={16} /> : <Play size={16} />)}
                            {testStatus === 'COMPLETED' ? t.btnRestartTest : t.btnRunTest}
                          </button>
                      ) : (
                          <span className="bg-amber-100 text-amber-700 text-xs px-3 py-1.5 rounded-full font-medium border border-amber-200">{isFormReadOnly ? t.viewAgent : t.msgAdminReq}</span>
                      )}
                   </div>
                   
                   <div className="p-8 min-h-[400px]">
                      
                      {testStatus === 'IDLE' && (
                         <div className="h-full flex flex-col items-center justify-center py-12 text-center">
                            <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4">
                                <FlaskConical size={32} className="text-slate-400" />
                            </div>
                            <h4 className="text-lg font-semibold text-slate-700 mb-2">{t.readyToTest}</h4>
                            <p className="text-slate-500 max-w-sm mx-auto mb-8">{t.msgReady}</p>
                            {!isFormReadOnly && role === UserRole.ADMIN && (
                                <button onClick={runTest} className="text-sky-600 font-medium hover:text-sky-700 hover:underline">{t.btnRunTest}</button>
                            )}
                         </div>
                      )}

                      {(testStatus === 'RUNNING' || testStatus === 'COMPLETED') && (
                         <div className="space-y-6 max-w-lg mx-auto relative">
                            {/* Vertical Line Connector */}
                            <div className="absolute left-[27px] top-6 bottom-6 w-0.5 bg-slate-100 -z-10"></div>

                            {TEST_STEPS.map((step) => {
                                let status = 'PENDING';
                                if (testStatus === 'COMPLETED') {
                                    status = 'COMPLETED';
                                } else if (testStatus === 'RUNNING') {
                                    if (testProgress > step.id) status = 'COMPLETED';
                                    else if (testProgress === step.id) status = 'RUNNING';
                                    else status = 'PENDING';
                                }

                                const isCompleted = status === 'COMPLETED';
                                const isRunning = status === 'RUNNING';
                                const isPending = status === 'PENDING';

                                return (
                                    <div key={step.id} className="flex gap-4 items-start bg-white py-2">
                                        <div className="flex-shrink-0 pt-0.5">
                                            {isCompleted ? (
                                                <div className="w-14 h-14 rounded-full bg-emerald-50 flex items-center justify-center border border-emerald-100 transition-all duration-300">
                                                   <CheckCircle2 size={28} className="text-emerald-500" />
                                                </div>
                                            ) : isRunning ? (
                                                <div className="w-14 h-14 rounded-full bg-sky-50 flex items-center justify-center border border-sky-100 transition-all duration-300 shadow-sm">
                                                    <Loader2 size={28} className="text-sky-500 animate-spin" />
                                                </div>
                                            ) : (
                                                <div className="w-14 h-14 rounded-full bg-slate-50 flex items-center justify-center border border-slate-100 transition-all duration-300">
                                                   <Circle size={28} className="text-slate-300" />
                                                </div>
                                            )}
                                        </div>
                                        <div className="pt-2">
                                            <h4 className={`font-bold text-base transition-colors duration-300 ${isPending ? 'text-slate-400' : (isRunning ? 'text-sky-700' : 'text-slate-800')}`}>
                                                {step.label}
                                            </h4>
                                            <p className={`text-sm mt-1 transition-colors duration-300 ${isPending ? 'text-slate-300' : 'text-slate-500'}`}>
                                                {step.desc}
                                            </p>
                                        </div>
                                    </div>
                                )
                            })}
                         </div>
                      )}

                      {testStatus === 'COMPLETED' && testResult && (
                          <div className="mt-8 pt-6 border-t border-slate-100 animate-in fade-in slide-in-from-bottom-4 duration-500">
                              <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-6 shadow-sm">
                                  <div className="flex items-start gap-4">
                                      <div className="p-3 bg-emerald-100 rounded-full text-emerald-600 shrink-0">
                                          <Check size={24} strokeWidth={3} />
                                      </div>
                                      <div className="flex-1">
                                          <h4 className="font-bold text-emerald-900 text-lg mb-1">{testResult.message}</h4>
                                          <div className="text-sm text-emerald-700/80 mb-5">{t.msgSandbox}</div>
                                          
                                          <div className="bg-white/80 rounded-lg p-5 space-y-3 text-sm text-emerald-900 border border-emerald-100/50">
                                               {Object.entries(testResult.details).map(([key, val]: any) => (
                                                  <div key={key} className="flex flex-col sm:flex-row sm:gap-4 items-start">
                                                      <span className="font-bold capitalize min-w-[80px] text-emerald-800/70 pt-0.5">{key}:</span>
                                                      <span className="text-emerald-900 font-medium">
                                                          {Array.isArray(val) ? (
                                                              <ul className="space-y-1 mt-0.5 sm:mt-0">
                                                                  {val.map((v, idx) => (
                                                                    <li key={idx} className="flex items-start gap-2">
                                                                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mt-1.5 shrink-0"></span>
                                                                      {v}
                                                                    </li>
                                                                  ))}
                                                              </ul>
                                                          ) : val}
                                                      </span>
                                                  </div>
                                               ))}
                                          </div>
                                      </div>
                                  </div>
                              </div>
                          </div>
                      )}
                   </div>
                </div>
             </div>
          )}

          {/* HISTORY TAB */}
          {activeTab === 'history' && (
             <div className="max-w-4xl">
                <h3 className="text-lg font-bold text-slate-800 mb-4">{t.headerAudit}</h3>
                <div className="bg-white border border-slate-200 rounded-lg overflow-hidden shadow-sm">
                   <table className="w-full text-sm text-left">
                      <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-medium">
                         <tr>
                            <th className="px-6 py-4">{t.thTime}</th>
                            <th className="px-6 py-4">{t.thUser}</th>
                            <th className="px-6 py-4">{t.thAction}</th>
                            <th className="px-6 py-4">{t.thDetails}</th>
                         </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                         {auditLogs.map(log => (
                            <tr key={log.id} className="hover:bg-slate-50">
                               <td className="px-6 py-4 text-slate-500 whitespace-nowrap">{new Date(log.timestamp).toLocaleString()}</td>
                               <td className="px-6 py-4 font-medium text-slate-700">{log.user}</td>
                               <td className="px-6 py-4">
                                 <span className="bg-slate-100 text-slate-600 px-2 py-1 rounded text-xs font-bold">{log.action}</span>
                               </td>
                               <td className="px-6 py-4 text-slate-600">{log.details}</td>
                            </tr>
                         ))}
                         {auditLogs.length === 0 && (
                             <tr><td colSpan={4} className="p-12 text-center text-slate-400 italic">{t.noHistory}</td></tr>
                         )}
                      </tbody>
                   </table>
                </div>
             </div>
          )}

        </div>
      </div>
    </div>
  );
};