import React, { useState } from 'react';
import { 
  LayoutDashboard, Bot, Users, ShieldAlert, Settings, LogOut, 
  Globe, Menu, Home, Folder, ChevronDown, User as UserIcon,
  FileText, Upload, HardDrive, List, Layers, ArrowLeftRight, Database
} from 'lucide-react';
import { UserRole, Language } from '../types';
import { TRANSLATIONS } from '../translations';

interface LayoutProps {
  children: React.ReactNode;
  currentUserRole: UserRole;
  onToggleRole: () => void;
  language: Language;
  onLanguageChange: (lang: Language) => void;
  onNavigate: (view: 'TRACKING' | 'AGENT_LIST' | 'UPLOAD' | 'WORKFLOW_LIST' | 'DATA_COMPARISON_JOBS' | 'DATA_COMPARISON_WORKFLOW' | 'DATA_COMPARISON_RULE' | 'DATA_COMPARISON_WORKFLOW_BUILDER' | 'SETTINGS_DOC_TYPE_MASTER' | 'SETTINGS_LABEL_SCHEMA' | 'SETTINGS_MASTER_DATA') => void;
}

export const Layout: React.FC<LayoutProps> = ({ children, currentUserRole, onToggleRole, language, onLanguageChange, onNavigate }) => {
  const [collapsed, setCollapsed] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [activeMenu, setActiveMenu] = useState('tracking');
  const t = TRANSLATIONS[language];

  // Sidebar Sub-menu Logic
  const [exDocOpen, setExDocOpen] = useState(true);
  const [comparisonOpen, setComparisonOpen] = useState(true);

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden">
      {/* Sidebar */}
      <aside 
        className={`bg-white border-r border-slate-200 flex flex-col transition-all duration-300 ${collapsed ? 'w-20' : 'w-64'}`}
      >
        <div className={`h-16 flex items-center px-4 ${collapsed ? 'justify-center' : ''}`}>
           {collapsed ? (
             <div className="cursor-pointer flex items-center justify-center">
               <img src="/logo-bizx-mark.svg" alt="BizX" width={28} height={28} className="select-none" />
             </div>
           ) : (
             <div className="cursor-pointer w-full flex items-center justify-center">
               <img src="/logo-bizx.svg" alt="BizX — Business Exchange" className="select-none h-11 w-auto" />
             </div>
           )}
        </div>

        <nav className="flex-1 py-4 flex flex-col gap-1 overflow-y-auto custom-scrollbar">
            
            {/* ExDoc Menu Group */}
            <div className="px-3 mb-2">
                {!collapsed && (
                  <button 
                    onClick={() => setExDocOpen(!exDocOpen)}
                    className="flex items-center justify-between w-full px-3 py-2 text-sm font-semibold text-slate-500 hover:text-slate-800 transition-colors"
                  >
                     <div className="flex items-center gap-2">
                        <FileText size={18} />
                        <span>{t.exDoc}</span>
                     </div>
                     <ChevronDown size={14} className={`transition-transform ${exDocOpen ? 'rotate-180' : ''}`} />
                  </button>
                )}
                
                {(exDocOpen || collapsed) && (
                   <div className={`mt-1 flex flex-col gap-1 ${collapsed ? 'items-center' : 'pl-4'}`}>
                      <button 
                        onClick={() => { setActiveMenu('upload'); onNavigate('UPLOAD'); }}
                        className={`flex items-center gap-3 px-3 py-2.5 rounded-[4px] transition-colors font-medium text-sm w-full
                            ${activeMenu === 'upload' ? 'bg-[#1f5df9] text-white shadow-md' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'}
                            ${collapsed ? 'justify-center' : ''}`}
                        title={collapsed ? t.uploadDoc : undefined}
                      >
                         <Upload size={18} />
                         {!collapsed && <span>{t.uploadDoc}</span>}
                      </button>
                      
                      <button 
                        onClick={() => { setActiveMenu('tracking'); onNavigate('TRACKING'); }}
                        className={`flex items-center gap-3 px-3 py-2.5 rounded-[4px] transition-colors font-medium text-sm w-full
                            ${activeMenu === 'tracking' ? 'bg-[#1f5df9] text-white shadow-md' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'} 
                            ${collapsed ? 'justify-center' : ''}`}
                        title={collapsed ? t.docTracking : undefined}
                      >
                         <List size={18} />
                         {!collapsed && <span>{t.docTracking}</span>}
                      </button>
                   </div>
                )}
            </div>

            {/* Supply Chain Drive Menu Group (Top Level) */}
            <div className="px-3 mb-2">
                 <button 
                    className={`flex items-center gap-2 w-full px-3 py-2 text-sm font-semibold text-slate-500 hover:text-slate-800 transition-colors
                        ${collapsed ? 'justify-center' : ''}`}
                    title={collapsed ? t.supplyChain : undefined}
                  >
                     <HardDrive size={18} />
                     {!collapsed && <span>{t.supplyChain}</span>}
                  </button>
            </div>

            {/* Dataset Builder Menu Group (Top Level) */}
            <div className="px-3 mb-2">
                 <button 
                    onClick={() => { setActiveMenu('workflow'); onNavigate('WORKFLOW_LIST'); }}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-[4px] transition-colors font-medium text-sm w-full
                        ${activeMenu === 'workflow' ? 'bg-[#1f5df9] text-white shadow-md' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'} 
                        ${collapsed ? 'justify-center' : ''}`}
                    title={collapsed ? t.datasetBuilder : undefined}
                  >
                     <Layers size={18} />
                     {!collapsed && <span>{t.datasetBuilder}</span>}
                  </button>
            </div>

            {/* Data Comparison Menu Group (Top Level) */}
            <div className="px-3 mb-2">
                 {!collapsed && (
                   <button 
                     onClick={() => {
                        setComparisonOpen(!comparisonOpen);
                        setActiveMenu('comparison_jobs');
                        onNavigate('DATA_COMPARISON_JOBS');
                     }}
                     className="flex items-center justify-between w-full px-3 py-2 text-sm font-semibold text-slate-500 hover:text-slate-800 transition-colors"
                   >
                      <div className="flex items-center gap-2">
                         <ArrowLeftRight size={18} />
                         <span>{t.dataComparison}</span>
                      </div>
                      <ChevronDown size={14} className={`transition-transform ${comparisonOpen ? 'rotate-180' : ''}`} />
                   </button>
                 )}
                 
                 {(comparisonOpen || collapsed) && (
                    <div className={`mt-1 flex flex-col gap-1 ${collapsed ? 'items-center' : 'pl-4'}`}>
                       <button 
                         onClick={() => { setActiveMenu('comparison_jobs'); onNavigate('DATA_COMPARISON_JOBS'); }}
                         className={`flex items-center gap-3 px-3 py-2.5 rounded-[4px] transition-colors font-medium text-sm w-full
                             ${activeMenu === 'comparison_jobs' ? 'bg-[#1f5df9] text-white shadow-md' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'}
                             ${collapsed ? 'justify-center' : ''}`}
                         title={collapsed ? t.jobList : undefined}
                       >
                          <List size={18} />
                          {!collapsed && <span>{t.jobList}</span>}
                       </button>

                       <button 
                         onClick={() => { setActiveMenu('comparison_workflow'); onNavigate('DATA_COMPARISON_WORKFLOW'); }}
                         className={`flex items-center gap-3 px-3 py-2.5 rounded-[4px] transition-colors font-medium text-sm w-full
                             ${activeMenu === 'comparison_workflow' ? 'bg-[#1f5df9] text-white shadow-md' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'}
                             ${collapsed ? 'justify-center' : ''}`}
                         title={collapsed ? t.manageWorkflow : undefined}
                       >
                          <Layers size={18} />
                          {!collapsed && <span>{t.manageWorkflow}</span>}
                       </button>

                       <button 
                         onClick={() => { setActiveMenu('comparison_rule'); onNavigate('DATA_COMPARISON_RULE'); }}
                         className={`flex items-center gap-3 px-3 py-2.5 rounded-[4px] transition-colors font-medium text-sm w-full
                             ${activeMenu === 'comparison_rule' ? 'bg-[#1f5df9] text-white shadow-md' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'}
                             ${collapsed ? 'justify-center' : ''}`}
                         title={collapsed ? t.manageRule : undefined}
                       >
                          <ShieldAlert size={18} />
                          {!collapsed && <span>{t.manageRule}</span>}
                       </button>
                    </div>
                 )}
            </div>

        </nav>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        {/* Header */}
        <header className={`h-16 bg-white border-b border-slate-200 flex items-center justify-between px-4 shrink-0 transition-all ${profileOpen ? 'z-[1100]' : 'z-[100]'}`}>
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setCollapsed(!collapsed)}
              className="p-2 hover:bg-slate-100 rounded-[4px] text-slate-600 transition-colors"
            >
              <Menu size={20} />
            </button>
            
            <div className="hidden md:flex items-center text-sm text-slate-500">
              <span className="flex items-center gap-1 hover:text-slate-700 cursor-pointer">
                <Home size={14} /> {language === 'TH' ? 'หน้าแรก' : 'Home'}
              </span>
              <span className="mx-2">/</span>
              {(activeMenu === 'upload' || activeMenu === 'tracking') ? (
                <>
                  <span className="flex items-center gap-1">
                    <Folder size={14} /> {t.exDoc}
                  </span>
                  <span className="mx-2">/</span>
                  <span className="flex items-center gap-1 font-semibold text-slate-800">
                    {activeMenu === 'upload' ? t.uploadDoc : t.docTracking}
                  </span>
                </>
              ) : activeMenu.startsWith('comparison_') ? (
                <>
                   <span className="flex items-center gap-1">
                    <ArrowLeftRight size={14} /> {t.dataComparison}
                  </span>
                  <span className="mx-2">/</span>
                  <span className="flex items-center gap-1 font-semibold text-slate-800">
                    {activeMenu === 'comparison_jobs' ? t.jobList : activeMenu === 'comparison_workflow' ? t.manageWorkflow : t.manageRule}
                  </span>
                </>
              ) : (activeMenu === 'settings_doc_type' || activeMenu === 'settings_label_schema') ? (
                <>
                  <span className="flex items-center gap-1">
                    <Settings size={14} /> {language === 'TH' ? 'ตั้งค่า' : 'Settings'}
                  </span>
                  <span className="mx-2">/</span>
                  <span className="flex items-center gap-1 font-semibold text-slate-800">
                    {activeMenu === 'settings_doc_type' 
                      ? (language === 'TH' ? 'ตั้งค่า Doc Type' : 'Doc Type Settings') 
                      : activeMenu === 'settings_job_preset'
                      ? (language === 'TH' ? 'ตั้งค่าชุด Shipment เริ่มต้น' : 'Starting Shipment Set Settings')
                      : activeMenu === 'settings_master_data'
                      ? (language === 'TH' ? 'ตั้งค่า Master data' : 'Master Data Settings')
                      : (language === 'TH' ? 'ตั้งค่า Label schema' : 'Label Schema Settings')}
                  </span>
                </>
              ) : (
                <span className="flex items-center gap-1 font-semibold text-slate-800">
                  {activeMenu === 'workflow' ? t.datasetBuilder : t.agentManagement}
                </span>
              )}
            </div>
          </div>

          <div className="relative">
            <button 
              onClick={() => setProfileOpen(!profileOpen)}
              onBlur={() => setTimeout(() => setProfileOpen(false), 200)}
              className="flex items-center gap-3 hover:bg-slate-50 p-2 rounded-[4px] transition-colors border border-transparent hover:border-slate-100"
            >
              <div className="hidden sm:flex flex-col items-end">
                 <span className="text-sm font-bold text-[#010136] leading-tight">Kunawut W.</span>
                 <div className="flex items-center gap-1.5 text-[10px] text-slate-500 font-bold uppercase tracking-wider mt-0.5">
                   <span>{currentUserRole}</span>
                   <span className="w-1 h-1 bg-slate-300 rounded-full"></span>
                   <span className="text-[#1f5df9] font-black">{language === 'TH' ? 'ทีม OPERATION' : 'OPERATION TEAM'}</span>
                 </div>
              </div>
              <div className="w-8 h-8 rounded-full bg-slate-200 text-slate-600 flex items-center justify-center font-bold">
                K
              </div>
              <ChevronDown size={14} className="text-slate-400" />
            </button>

            {/* Profile Dropdown */}
            {profileOpen && (
              <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-lg border border-slate-100 py-1 z-[1200] animate-in fade-in zoom-in-95 duration-100">
                <div className="px-4 py-3 border-b border-slate-100">
                  <div className="font-bold text-[#010136]">Kunawut Wachirapunyawut</div>
                  <div className="text-xs text-slate-500 flex flex-col gap-0.5 mt-1">
                    <span>Administrator</span>
                    <span className="text-[#1f5df9] font-bold">{language === 'TH' ? 'ทีม: Operation' : 'Team: Operation'}</span>
                  </div>
                </div>
                <div className="py-1">
                   {/* Agent Management moved here */}
                  <button 
                    onClick={() => {
                        onNavigate('AGENT_LIST');
                        setActiveMenu('agent');
                    }}
                    className="w-full text-left px-4 py-2 text-sm text-slate-600 hover:bg-slate-50 flex items-center gap-2"
                  >
                    <Bot size={16} className="text-slate-400" /> {t.agentManagement}
                  </button>
                  <button className="w-full text-left px-4 py-2 text-sm text-slate-600 hover:bg-slate-50 flex items-center gap-2">
                    <Users size={16} className="text-slate-400" /> {t.userManagement}
                  </button>
                </div>
                <div className="border-t border-slate-100 py-1">
                  <div className="px-4 py-1 text-xs font-bold text-slate-400 uppercase tracking-wider">{t.settings}</div>
                  <button 
                    onClick={() => {
                      onNavigate('SETTINGS_DOC_TYPE_MASTER');
                      setActiveMenu('settings_doc_type');
                      setProfileOpen(false);
                    }}
                    className="w-full text-left px-4 py-2 text-sm text-slate-600 hover:bg-slate-50 flex items-center gap-2"
                  >
                    <Settings size={16} className="text-slate-400" /> 
                    <span>{language === 'TH' ? 'ตั้งค่า Doc Type' : 'Doc Type Settings'}</span>
                  </button>
                  <button
                    onClick={() => {
                      onNavigate('SETTINGS_MASTER_DATA');
                      setActiveMenu('settings_master_data');
                      setProfileOpen(false);
                    }}
                    className="w-full text-left px-4 py-2 text-sm text-slate-600 hover:bg-slate-50 flex items-center gap-2"
                  >
                    <Database size={16} className="text-slate-400" />
                    <span>{language === 'TH' ? 'ตั้งค่า Master data' : 'Master Data Settings'}</span>
                  </button>
                  <button
                    onClick={() => {
                      onNavigate('SETTINGS_JOB_PRESET');
                      setActiveMenu('settings_job_preset');
                      setProfileOpen(false);
                    }}
                    className="w-full text-left px-4 py-2 text-sm text-slate-600 hover:bg-slate-50 flex items-center gap-2"
                  >
                    <Settings size={16} className="text-slate-400" />
                    <span>{language === 'TH' ? 'ตั้งค่าชุด Shipment เริ่มต้น' : 'Starting Shipment Set Settings'}</span>
                  </button>
                </div>
                <div className="border-t border-slate-100 py-1">
                  <div className="flex items-center justify-between px-4 py-2">
                     <div className="flex items-center gap-2 text-sm text-slate-600">
                        <Globe size={16} className="text-slate-400" />
                        <span>{t.language}</span>
                     </div>
                     <div className="flex gap-1 text-xs bg-slate-100 rounded-[4px] p-0.5">
                         <button
                           onClick={() => onLanguageChange('EN')}
                           className={`px-2 py-1 rounded-[3px] transition-colors ${language === 'EN' ? 'bg-white shadow-sm text-sky-600 font-bold' : 'text-slate-400 hover:text-slate-600'}`}
                         >EN</button>
                         <button
                           onClick={() => onLanguageChange('TH')}
                           className={`px-2 py-1 rounded-[3px] transition-colors ${language === 'TH' ? 'bg-white shadow-sm text-sky-600 font-bold' : 'text-slate-400 hover:text-slate-600'}`}
                         >TH</button>
                     </div>
                  </div>
                </div>
                <div className="border-t border-slate-100 py-1">
                  <button className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2">
                    <LogOut size={16} /> {t.signOut}
                  </button>
                </div>
              </div>
            )}
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto p-4 bg-slate-50">
          {children}
        </main>
      </div>
    </div>
  );
};