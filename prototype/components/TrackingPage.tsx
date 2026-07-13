import React, { useState } from 'react';
import { 
  Search, Upload, Info, RefreshCw, Send, Trash2, 
  ChevronLeft, ChevronRight, Eye, FileText, ChevronDown, Calendar,
  ScanEye, RefreshCcw, FileScan, XCircle, RotateCcw, X, FileX
} from 'lucide-react';
import { Language, TrackingItem, TrackingSource, ReviewStatus, SendStatus } from '../types';
import { TRANSLATIONS } from '../translations';

interface TrackingPageProps {
  language: Language;
  items: TrackingItem[];
  onViewExtraction: (item: TrackingItem) => void;
  onUploadClick: () => void;
  onStartRead: (item: TrackingItem) => void;
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
        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 text-xs font-medium text-white bg-slate-800 rounded shadow-md whitespace-nowrap z-50 animate-in fade-in duration-150">
          {content}
          <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-slate-800"></div>
        </div>
      )}
    </div>
  );
};

// Reusable Action Button Component to ensure consistent state styling
interface ActionButtonProps {
    icon: React.ElementType;
    onClick?: () => void;
    disabled?: boolean;
    tooltip: string;
    variant?: 'blue' | 'red';
    active?: boolean;
}

const ActionButton: React.FC<ActionButtonProps> = ({ icon: Icon, onClick, disabled, tooltip, variant = 'blue', active = false }) => {
    // Base styles
    let className = "p-2 rounded-md transition-all duration-200 flex items-center justify-center ";
    
    if (active) {
        // Active/Reading state
        className += "bg-blue-50 text-blue-600 animate-pulse";
    } else if (disabled) {
        // Disabled state
        className += "text-slate-300 bg-transparent cursor-not-allowed hover:bg-slate-50";
    } else {
        // Default state -> Hover state
        if (variant === 'blue') {
            className += "text-slate-400 hover:bg-blue-50 hover:text-blue-600 bg-transparent";
        } else {
            className += "text-slate-400 hover:bg-red-50 hover:text-red-600 bg-transparent";
        }
    }

    return (
        <Tooltip content={tooltip}>
            <button 
                onClick={onClick} 
                disabled={disabled}
                className={className}
            >
                <Icon size={18} strokeWidth={2} />
            </button>
        </Tooltip>
    );
};

export const TrackingPage: React.FC<TrackingPageProps> = ({ language, items, onViewExtraction, onUploadClick, onStartRead }) => {
  const t = TRANSLATIONS[language];
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);
  
  // Read Config Modal State
  const [readModalOpen, setReadModalOpen] = useState(false);
  const [selectedItemForRead, setSelectedItemForRead] = useState<TrackingItem | null>(null);
  const [selectedDocType, setSelectedDocType] = useState('Invoice');
  const [selectedTemplate, setSelectedTemplate] = useState('General');

  const totalItems = items.length; // Use real length

  const getSourceBadge = (source: TrackingSource) => {
    switch (source) {
      case TrackingSource.UPLOAD:
        return <span className="px-2 py-0.5 rounded text-xs font-medium bg-sky-100 text-sky-700">{t.sourceUpload}</span>;
      case TrackingSource.EMAIL:
        return <span className="px-2 py-0.5 rounded text-xs font-medium bg-orange-100 text-orange-700">{t.sourceEmail}</span>;
      case TrackingSource.API:
        return <span className="px-2 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-700">{t.sourceApi}</span>;
      default:
        return source;
    }
  };

  const getReviewBadge = (status: ReviewStatus) => {
    switch (status) {
      case ReviewStatus.REVIEWED:
        return <span className="px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-700">{t.statusReviewed}</span>;
      case ReviewStatus.UNREAD:
        return <span className="px-2 py-0.5 rounded text-xs font-medium bg-slate-200 text-slate-600">{t.statusUnread}</span>;
      case ReviewStatus.READING:
        return <span className="px-2 py-0.5 rounded text-xs font-medium bg-amber-100 text-amber-700 animate-pulse">{t.statusReading}</span>;
      case ReviewStatus.READ_FAILED:
        return <span className="px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-700">{t.statusReadFailed}</span>;
      case ReviewStatus.WAIT_FOR_REVIEW:
        return <span className="px-2 py-0.5 rounded text-xs font-medium bg-sky-100 text-sky-700">{t.statusWaitForReview}</span>;
      case ReviewStatus.DRAFT:
        return <span className="px-2 py-0.5 rounded text-xs font-medium bg-amber-100 text-amber-700">{t.statusDraft}</span>;
      default:
        return status;
    }
  };

  const getSendBadge = (status: SendStatus) => {
    switch (status) {
      case SendStatus.SENT:
        return <span className="px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-700">{t.statusSent}</span>;
      case SendStatus.SENDING:
        return <span className="px-2 py-0.5 rounded text-xs font-medium bg-amber-100 text-amber-700">{t.statusSending}</span>;
      case SendStatus.FAILED:
        return <span className="px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-700">{t.statusSendFailed}</span>;
      case SendStatus.NOT_SENT:
      default:
        return <span className="px-2 py-0.5 rounded text-xs font-medium bg-gray-500 text-white">{t.statusNotSent}</span>;
    }
  };

  const openReadModal = (item: TrackingItem) => {
      setSelectedItemForRead(item);
      setSelectedDocType(item.docType || 'Invoice');
      setSelectedTemplate('General');
      setReadModalOpen(true);
  };

  const handleConfirmRead = () => {
      if (selectedItemForRead) {
          onStartRead(selectedItemForRead);
      }
      setReadModalOpen(false);
      setSelectedItemForRead(null);
  };

  const renderActionButtons = (item: TrackingItem) => {
    const { reviewStatus, sendStatus, source } = item;
    const isMail = source === TrackingSource.EMAIL;
    // const isUpload = source === TrackingSource.UPLOAD;

    // Logic Configuration
    const actions = {
        view: { show: true, disabled: false },
        reExtract: { show: false, disabled: false },
        readData: { show: false, disabled: false },
        review: { show: false, disabled: false },
        send: { show: true, disabled: true },
        reject: { show: false, disabled: false },
        delete: { show: true, disabled: false },
    };

    // Apply Logic Table
    switch(reviewStatus) {
        case ReviewStatus.UNREAD:
        case ReviewStatus.READ_FAILED:
            actions.readData.show = true;
            actions.send.show = false;
            actions.reject.show = isMail;
            break;
        case ReviewStatus.READING:
            actions.view.disabled = true;
            // Table implies Review is visible but disabled, or logic suggests just showing nothing except View/Delete
            // Using standard approach: Show review but disabled
            actions.review.show = true;
            actions.review.disabled = true;
            actions.readData.show = true; // Show icon but disabled
            actions.readData.disabled = true;
            actions.send.disabled = true;
            actions.reject.show = isMail;
            actions.reject.disabled = true;
            actions.delete.disabled = true;
            break;
        case ReviewStatus.WAIT_FOR_REVIEW:
        case ReviewStatus.DRAFT:
            actions.review.show = true;
            actions.send.disabled = true;
            actions.reject.show = isMail;
            break;
        case ReviewStatus.REVIEWED:
            actions.reExtract.show = true;
            actions.send.disabled = false;
            actions.reject.show = isMail;
            
            if (sendStatus === SendStatus.SENDING) {
                actions.send.disabled = true;
                actions.delete.disabled = true;
            } else if (sendStatus === SendStatus.SENT) {
                actions.send.disabled = true;
            }
            break;
    }

    return (
        <div className="flex items-center justify-end gap-1">
             {/* View Document */}
            {actions.view.show && (
                <ActionButton 
                    icon={Eye} 
                    tooltip={t.ttView} 
                    disabled={actions.view.disabled} 
                />
            )}

            {/* Re-extract (Reviewed Only) */}
            {actions.reExtract.show && (
                <ActionButton 
                    icon={RotateCcw} 
                    tooltip={t.ttReExtract} 
                    disabled={actions.reExtract.disabled} 
                />
            )}

            {/* Read Data (Unread/Failed/Reading) */}
            {actions.readData.show && (
                <ActionButton 
                    icon={FileScan} 
                    tooltip={t.ttReadData} 
                    disabled={actions.readData.disabled}
                    active={reviewStatus === ReviewStatus.READING}
                    onClick={() => openReadModal(item)}
                />
            )}

            {/* Review File (Wait/Draft) */}
            {actions.review.show && (
                <ActionButton 
                    icon={ScanEye} 
                    tooltip={t.ttReview} 
                    disabled={actions.review.disabled}
                    onClick={() => onViewExtraction(item)}
                />
            )}

            {/* Send */}
            {actions.send.show && (
                <ActionButton 
                    icon={Send} 
                    tooltip={t.ttSend} 
                    disabled={actions.send.disabled}
                />
            )}

            {/* Reject (Mail Agent Only) */}
            {actions.reject.show && (
                <ActionButton 
                    icon={FileX} 
                    tooltip={t.ttReject} 
                    disabled={actions.reject.disabled}
                    variant="red"
                />
            )}

            {/* Delete */}
            {actions.delete.show && (
                <ActionButton 
                    icon={Trash2} 
                    tooltip={t.ttDelete} 
                    disabled={actions.delete.disabled}
                    variant="red"
                />
            )}
        </div>
    );
  };

  // Logic to slice items for pagination
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = items.slice(indexOfFirstItem, indexOfLastItem);

  return (
    <div className="flex flex-col h-full relative">
      {/* Combined Card for Header, Filters, and Table */}
      <div className="flex-1 flex flex-col bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        
        {/* SECTION 1: Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 p-6 border-b border-slate-100 bg-white">
          <h1 className="text-xl font-bold text-slate-800">{t.trackingTitle}</h1>
          <button 
              onClick={onUploadClick}
              className="flex items-center gap-2 bg-[#1f5df9] hover:bg-[#104BE3] text-white px-4 py-2 rounded-[4px] text-sm font-medium transition-colors shadow-sm"
          >
            <Upload size={16} />
            {t.btnUpload}
          </button>
        </div>

        {/* SECTION 2: Filters */}
        <div className="p-6 border-b border-slate-100 bg-slate-50/50 space-y-4">
          {/* Row 1 */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-slate-500">{t.searchLabel}</label>
              <input type="text" placeholder={t.phSearch} className="px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/20" />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-slate-500">{t.metadataLabel}</label>
              <input type="text" placeholder={t.phMetadata} className="px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/20" />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-slate-500">{t.dateRangeLabel}</label>
              <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <input type="text" placeholder={t.phStartDate} className="w-full pl-3 pr-8 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/20" />
                    <Calendar size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  </div>
                  <span className="text-slate-400">→</span>
                  <div className="relative flex-1">
                    <input type="text" placeholder={t.phEndDate} className="w-full pl-3 pr-8 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/20" />
                    <Calendar size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  </div>
              </div>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-slate-500">{t.sourceLabel}</label>
              <div className="relative">
                <select className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/20 appearance-none bg-white text-slate-600">
                  <option>{t.phSource}</option>
                </select>
                <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              </div>
            </div>
          </div>

          {/* Row 2 */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-slate-500">{t.reviewStatusLabel}</label>
              <div className="relative">
                <select className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/20 appearance-none bg-white text-slate-600">
                  <option>{t.phReviewStatus}</option>
                </select>
                <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              </div>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-slate-500">{t.sendStatusLabel}</label>
              <div className="relative">
                <select className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/20 appearance-none bg-white text-slate-600">
                  <option>{t.phSendStatus}</option>
                </select>
                <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              </div>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-slate-500">{t.docTypeLabel}</label>
              <div className="relative">
                <select className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/20 appearance-none bg-white text-slate-600">
                  <option>{t.phDocType}</option>
                </select>
                <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              </div>
            </div>
            <div className="flex items-end gap-2">
              <button className="flex-1 bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 px-4 py-2 rounded-[4px] text-sm font-medium transition-colors">
                {t.btnReset}
              </button>
              <button className="flex-1 bg-[#1f5df9] hover:bg-[#104BE3] text-white px-4 py-2 rounded-[4px] text-sm font-medium transition-colors shadow-sm">
                {t.btnSearch}
              </button>
            </div>
          </div>
        </div>

        {/* SECTION 3: Table */}
        <div className="flex-1 flex flex-col min-h-0 bg-white">
          <div className="overflow-auto flex-1">
            <table className="w-full text-left text-sm relative">
              <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200 sticky top-0 z-10 shadow-sm">
                <tr>
                  <th className="w-10 px-4 py-4"><input type="checkbox" className="rounded border-slate-300" /></th>
                  <th className="px-4 py-4">{t.thFileName}</th>
                  <th className="px-4 py-4">{t.thDate}</th>
                  <th className="px-4 py-4">{t.thPerformer}</th>
                  <th className="px-4 py-4">{t.thSource}</th>
                  <th className="px-4 py-4">{t.thReview}</th>
                  <th className="px-4 py-4">{t.thExport}</th>
                  <th className="px-4 py-4">{t.thDocType}</th>
                  <th className="px-4 py-4">{t.thRef}</th>
                  <th className="px-4 py-4 w-32"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {currentItems.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-4 py-3"><input type="checkbox" className="rounded border-slate-300" /></td>
                    <td className="px-4 py-3 font-medium text-slate-900 flex items-center gap-2">
                      {item.fileName}
                      <Info size={14} className="text-sky-500 cursor-pointer" />
                    </td>
                    <td className="px-4 py-3 text-slate-600">{item.date}</td>
                    <td className="px-4 py-3 text-slate-600 max-w-[150px] truncate" title={item.performer}>{item.performer}</td>
                    <td className="px-4 py-3">{getSourceBadge(item.source)}</td>
                    <td className="px-4 py-3">{getReviewBadge(item.reviewStatus)}</td>
                    <td className="px-4 py-3">{getSendBadge(item.sendStatus)}</td>
                    <td className="px-4 py-3">
                      <div className="relative">
                        <select className="w-full pl-2 pr-6 py-1 border border-slate-200 rounded text-xs appearance-none bg-white text-slate-600">
                            <option>{item.docType || t.phDocType}</option>
                        </select>
                        <ChevronDown size={12} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                      </div>
                    </td>
                    <td className="px-4 py-3 text-slate-600">{item.ref}</td>
                    <td className="px-4 py-3">
                      {renderActionButtons(item)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="px-6 py-4 border-t border-slate-200 flex flex-wrap items-center gap-4 text-sm text-slate-500 shrink-0 bg-white">
            <span>{t.showing} {totalItems > 0 ? indexOfFirstItem + 1 : 0}-{Math.min(indexOfLastItem, totalItems)} {t.of} {totalItems} {t.items}</span>
            
            <div className="flex items-center gap-1">
              <button 
                  onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                  disabled={currentPage === 1}
                  className="w-8 h-8 flex items-center justify-center border border-slate-200 bg-white rounded-[4px] hover:bg-slate-50 disabled:opacity-50"
              >
                  <ChevronLeft size={16} />
              </button>
              {/* Mock Pagination buttons */}
              <button className="w-8 h-8 flex items-center justify-center border border-sky-500 bg-white text-sky-600 rounded-[4px] font-medium">1</button>
              <button className="w-8 h-8 flex items-center justify-center border border-slate-200 bg-white rounded-[4px] hover:bg-slate-50">2</button>
              <span className="px-2">...</span>
              <button 
                  onClick={() => setCurrentPage(Math.min(Math.ceil(totalItems/itemsPerPage), currentPage + 1))}
                  disabled={currentPage >= Math.ceil(totalItems/itemsPerPage)}
                  className="w-8 h-8 flex items-center justify-center border border-slate-200 bg-white rounded-[4px] hover:bg-slate-50 disabled:opacity-50"
              >
                  <ChevronRight size={16} />
              </button>
            </div>

            <select 
                value={itemsPerPage} 
                onChange={(e) => setItemsPerPage(Number(e.target.value))}
                className="border border-slate-200 rounded-lg px-2 py-1 text-sm bg-white focus:outline-none"
            >
                <option value={10}>10 / {t.rowsPerPage.split(' ')[0]}</option>
                <option value={20}>20 / {t.rowsPerPage.split(' ')[0]}</option>
            </select>
          </div>
        </div>

      </div>

      {/* Read Configuration Modal */}
      {readModalOpen && selectedItemForRead && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
              <div className="bg-white rounded-xl shadow-2xl w-full max-w-md mx-4 relative animate-in zoom-in-95 duration-200 overflow-hidden">
                  <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center">
                      <h3 className="text-lg font-bold text-slate-900">{t.modalReadConfigTitle}</h3>
                      <button 
                          onClick={() => setReadModalOpen(false)}
                          className="text-slate-400 hover:text-slate-600 transition-colors"
                      >
                          <X size={20} />
                      </button>
                  </div>
                  
                  <div className="p-6 space-y-6">
                      {/* File Type */}
                      <div>
                          <label className="block text-sm font-semibold text-slate-800 mb-1.5">
                              {t.lblSelectDocType} <span className="text-red-500">*</span>
                          </label>
                          <div className="relative">
                            <select 
                                value={selectedDocType}
                                onChange={(e) => setSelectedDocType(e.target.value)}
                                className="w-full px-3 py-2.5 bg-white border border-slate-300 rounded-lg text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 appearance-none"
                            >
                                <option value="Invoice">Invoice</option>
                                <option value="Receipt">Receipt</option>
                                <option value="Purchase Order">Purchase Order</option>
                                <option value="Tax Invoice">Tax Invoice</option>
                            </select>
                            <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                          </div>
                      </div>

                      {/* Template */}
                      <div>
                          <label className="block text-sm font-semibold text-slate-800 mb-1.5">
                              {t.lblSelectTemplate} <span className="text-red-500">*</span>
                          </label>
                          <div className="relative">
                            <select 
                                value={selectedTemplate}
                                onChange={(e) => setSelectedTemplate(e.target.value)}
                                className="w-full px-3 py-2.5 bg-white border border-slate-300 rounded-lg text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 appearance-none"
                            >
                                <option value="General">General</option>
                                <option value="Custom 1">Custom Template 1</option>
                                <option value="Custom 2">Custom Template 2</option>
                            </select>
                            <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                          </div>
                      </div>

                      {/* Target File Display */}
                      <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
                          <div className="text-xs font-semibold text-slate-500 mb-1">{t.lblDocTarget}</div>
                          <div className="text-sm font-medium text-blue-600 break-all">
                              {selectedItemForRead.fileName}
                          </div>
                      </div>
                  </div>

                  <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/50 flex gap-3 justify-end">
                      <button 
                          onClick={() => setReadModalOpen(false)}
                          className="px-4 py-2 border border-slate-300 rounded-[4px] text-slate-700 text-sm font-medium hover:bg-white hover:border-slate-400 transition-colors"
                      >
                          {t.btnCancel}
                      </button>
                      <button 
                          onClick={handleConfirmRead}
                          className="px-6 py-2 bg-[#1f5df9] text-white rounded-[4px] text-sm font-medium hover:bg-[#104BE3] shadow-sm transition-colors"
                      >
                          {t.btnStartRead}
                      </button>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};