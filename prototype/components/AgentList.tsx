import React, { useState } from 'react';
import { 
  Search, Filter, Plus, Bot, Mail, Eye, Pencil, Power, Trash2, 
  ChevronLeft, ChevronRight 
} from 'lucide-react';
import { Agent, AgentStatus, AgentType, UserRole, Language } from '../types';
import { TRANSLATIONS } from '../translations';

interface AgentListProps {
  agents: Agent[];
  role: UserRole;
  language: Language;
  onEdit: (agent: Agent) => void;
  onView: (agent: Agent) => void;
  onCreate: () => void;
  onToggleStatus: (agent: Agent) => void;
  onDelete: (agent: Agent) => void;
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

export const AgentList: React.FC<AgentListProps> = ({ agents, role, language, onEdit, onView, onCreate, onToggleStatus, onDelete }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [typeFilter, setTypeFilter] = useState<string>('ALL');
  
  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  const t = TRANSLATIONS[language];

  // Data Filtering
  const filteredAgents = agents.filter(agent => {
    const matchesSearch = agent.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'ALL' || agent.status === statusFilter;
    const matchesType = typeFilter === 'ALL' || agent.type === typeFilter;
    return matchesSearch && matchesStatus && matchesType;
  });

  // Pagination Logic
  const totalItems = filteredAgents.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredAgents.slice(indexOfFirstItem, indexOfLastItem);

  const paginate = (pageNumber: number) => setCurrentPage(pageNumber);

  // Handlers that reset page
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
    setCurrentPage(1);
  };

  const handleStatusFilterChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setStatusFilter(e.target.value);
    setCurrentPage(1);
  };

  const handleTypeFilterChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setTypeFilter(e.target.value);
    setCurrentPage(1);
  };

  const handleItemsPerPageChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setItemsPerPage(Number(e.target.value));
    setCurrentPage(1);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{t.agentManagement}</h1>
          <p className="text-slate-500 mt-1">{t.manageAgents}</p>
        </div>
        {role === UserRole.ADMIN && (
          <button 
             onClick={onCreate}
             className="flex items-center gap-2 bg-[#0ea5e9] hover:bg-[#0284c7] text-white px-5 py-2.5 rounded-[4px] font-medium transition-colors shadow-sm"
          >
            <Plus size={18} />
            {t.createAgent}
          </button>
        )}
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        {/* Filters */}
        <div className="p-4 border-b border-slate-100 flex flex-col md:flex-row gap-4">
           <div className="flex-1 relative">
             <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
             <input 
                type="text"
                placeholder={t.searchPlaceholder}
                value={searchTerm}
                onChange={handleSearchChange}
                className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 text-sm"
             />
           </div>
           <div className="flex gap-4">
              <div className="relative min-w-[160px]">
                <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                <select 
                   value={statusFilter} 
                   onChange={handleStatusFilterChange}
                   className="w-full pl-9 pr-8 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 text-sm appearance-none bg-white"
                >
                    <option value="ALL">{t.allStatus}</option>
                    <option value={AgentStatus.ACTIVE}>{t.active}</option>
                    <option value={AgentStatus.INACTIVE}>{t.inactive}</option>
                    <option value={AgentStatus.DRAFT}>{t.draft}</option>
                </select>
                <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                </div>
              </div>
              <div className="relative min-w-[160px]">
                <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                <select 
                   value={typeFilter} 
                   onChange={handleTypeFilterChange}
                   className="w-full pl-9 pr-8 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 text-sm appearance-none bg-white"
                >
                    <option value="ALL">{t.allTypes}</option>
                    <option value={AgentType.MAIL}>{t.mailAgent}</option>
                    <option value={AgentType.AI}>{t.aiAgent}</option>
                </select>
                <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                </div>
              </div>
           </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
              <tr>
                <th className="px-6 py-4">{t.agentName}</th>
                <th className="px-6 py-4">{t.type}</th>
                <th className="px-6 py-4">{t.status}</th>
                <th className="px-6 py-4">{t.createdBy}</th>
                <th className="px-6 py-4">{t.lastUpdated}</th>
                <th className="px-6 py-4 text-right">{t.actions}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {currentItems.length > 0 ? (
                currentItems.map((agent) => (
                  <tr key={agent.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-medium text-slate-900">{agent.name}</div>
                      <div className="text-slate-500 text-xs truncate max-w-[250px] mt-0.5">{agent.description || '-'}</div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border
                        ${agent.type === AgentType.AI 
                          ? 'bg-purple-50 text-purple-700 border-purple-200' 
                          : 'bg-blue-50 text-blue-700 border-blue-200'}`}
                      >
                        {agent.type === AgentType.AI ? <Bot size={12} /> : <Mail size={12} />}
                        {agent.type === AgentType.AI ? t.aiAgent : t.mailAgent}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border
                        ${agent.status === AgentStatus.ACTIVE ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 
                          agent.status === AgentStatus.INACTIVE ? 'bg-red-50 text-red-700 border-red-200' : 
                          'bg-amber-50 text-amber-700 border-amber-200'}`}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full mr-1.5 
                          ${agent.status === AgentStatus.ACTIVE ? 'bg-emerald-500' : 
                            agent.status === AgentStatus.INACTIVE ? 'bg-red-500' : 
                            'bg-amber-500'}`}
                        ></span>
                        {agent.status === AgentStatus.ACTIVE ? t.active : 
                         agent.status === AgentStatus.INACTIVE ? t.inactive : t.draft}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-slate-600">
                      <div className="font-medium text-slate-900">{agent.createdBy}</div>
                      <div className="text-xs text-slate-400">{new Date(agent.createdAt).toLocaleDateString()}</div>
                    </td>
                    <td className="px-6 py-4 text-slate-600">
                      <div>{new Date(agent.updatedAt).toLocaleDateString()}</div>
                      <div className="text-xs text-slate-400">{t.by} {agent.updatedBy}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-2">
                        <Tooltip content={t.viewDetails}>
                          <button 
                            onClick={() => onView(agent)}
                            className="p-1.5 text-slate-500 hover:text-sky-600 hover:bg-sky-50 rounded-[4px] transition-colors"
                          >
                            <Eye size={16} />
                          </button>
                        </Tooltip>
                        {role === UserRole.ADMIN && (
                          <>
                            <Tooltip content={t.editConfig}>
                              <button 
                                onClick={() => onEdit(agent)}
                                className="p-1.5 text-slate-500 hover:text-sky-600 hover:bg-sky-50 rounded-[4px] transition-colors"
                              >
                                <Pencil size={16} />
                              </button>
                            </Tooltip>
                            <Tooltip content={agent.status === AgentStatus.ACTIVE ? t.disableAgent : t.enableAgent}>
                              <button 
                                onClick={() => onToggleStatus(agent)}
                                className={`p-1.5 rounded-[4px] transition-colors ${
                                  agent.status === AgentStatus.ACTIVE 
                                  ? 'text-slate-500 hover:text-red-600 hover:bg-red-50'
                                  : 'text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50'
                                }`}
                              >
                                <Power size={16} />
                              </button>
                            </Tooltip>
                            <Tooltip content={t.deleteAgent}>
                              <button 
                                onClick={() => onDelete(agent)}
                                className="p-1.5 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-[4px] transition-colors"
                              >
                                <Trash2 size={16} />
                              </button>
                            </Tooltip>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-slate-400">
                    <div className="flex flex-col items-center gap-2">
                      <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center text-slate-400 mb-2">
                        <Search size={24} />
                      </div>
                      <p className="font-medium text-slate-600">{t.noAgentsFound}</p>
                      <p className="text-sm">{t.tryAdjusting}</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        
        {/* Pagination */}
        <div className="px-6 py-4 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-slate-500">
           {/* Left: Info & Items Per Page */}
           <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                  <span className="text-slate-500">{t.rowsPerPage}</span>
                  <select 
                    value={itemsPerPage} 
                    onChange={handleItemsPerPageChange}
                    className="border border-slate-300 rounded p-1 text-sm focus:outline-none focus:border-sky-500 bg-white"
                  >
                      <option value={5}>5</option>
                      <option value={10}>10</option>
                      <option value={20}>20</option>
                      <option value={50}>50</option>
                  </select>
              </div>
              <div className="h-4 w-px bg-slate-300 mx-2 hidden sm:block"></div>
              <div>
                  {t.showing} {totalItems > 0 ? indexOfFirstItem + 1 : 0} - {Math.min(indexOfLastItem, totalItems)} {t.of} {totalItems} {t.items}
              </div>
           </div>

           {/* Right: Navigation */}
           <div className="flex items-center gap-1">
             <button 
               onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
               disabled={currentPage === 1 || totalPages === 0}
               className="p-1.5 rounded-[4px] hover:bg-slate-100 disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
             >
               <ChevronLeft size={16} />
             </button>
             
             <div className="flex items-center gap-1 mx-2">
                {Array.from({ length: totalPages }, (_, i) => i + 1).map(number => (
                    <button
                        key={number}
                        onClick={() => paginate(number)}
                        className={`min-w-[28px] h-7 px-1 rounded-[4px] text-xs font-medium transition-colors flex items-center justify-center ${
                            currentPage === number 
                            ? 'bg-sky-50 text-sky-600 border border-sky-200' 
                            : 'text-slate-600 hover:bg-slate-100'
                        }`}
                    >
                        {number}
                    </button>
                ))}
             </div>

             <button 
               onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
               disabled={currentPage === totalPages || totalPages === 0}
               className="p-1.5 rounded-[4px] hover:bg-slate-100 disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
             >
               <ChevronRight size={16} />
             </button>
           </div>
        </div>
      </div>
    </div>
  );
};