import React, { useState, useRef } from 'react';
import { UploadCloud, Trash2, X, AlertCircle } from 'lucide-react';
import { Language } from '../types';
import { TRANSLATIONS } from '../translations';

interface UploadPageProps {
  language: Language;
  onUpload: (files: File[]) => void;
}

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB
const MAX_FILES = 10;
const ACCEPTED_TYPES = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg'];

export const UploadPage: React.FC<UploadPageProps> = ({ language, onUpload }) => {
  const t = TRANSLATIONS[language];
  const [files, setFiles] = useState<File[]>([]);
  const [errorModal, setErrorModal] = useState<{ open: boolean, type?: 'TYPE' | 'SIZE' | 'COUNT' }>({ open: false });
  const fileInputRef = useRef<HTMLInputElement>(null);

  const validateFile = (file: File): boolean => {
    // Check type
    if (!ACCEPTED_TYPES.includes(file.type)) {
      setErrorModal({ open: true, type: 'TYPE' });
      return false;
    }
    // Check size
    if (file.size > MAX_FILE_SIZE) {
      setErrorModal({ open: true, type: 'SIZE' });
      return false;
    }
    return true;
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files) as File[];
      processFiles(newFiles);
    }
    // Reset input
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files) {
        const newFiles = Array.from(e.dataTransfer.files) as File[];
        processFiles(newFiles);
    }
  };

  const processFiles = (newFiles: File[]) => {
      // Check count first
      if (files.length + newFiles.length > MAX_FILES) {
          setErrorModal({ open: true, type: 'COUNT' });
          return;
      }

      const validFiles: File[] = [];
      let hasError = false;

      for (const file of newFiles) {
          if (validateFile(file)) {
              validFiles.push(file);
          } else {
              hasError = true;
              break; // Stop on first error to show modal
          }
      }

      if (!hasError && validFiles.length > 0) {
          setFiles(prev => [...prev, ...validFiles]);
      }
  };

  const removeFile = (index: number) => {
      setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const formatSize = (bytes: number) => {
      if (bytes === 0) return '0 Bytes';
      const k = 1024;
      const sizes = ['Bytes', 'KB', 'MB', 'GB'];
      const i = Math.floor(Math.log(bytes) / Math.log(k));
      return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getExtension = (name: string) => {
      return name.split('.').pop()?.toUpperCase() || '-';
  };

  return (
    <div className="flex flex-col h-full bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden relative">
      <div className="px-6 py-4 border-b border-slate-200">
        <h1 className="text-xl font-bold text-slate-800">{t.uploadTitle}</h1>
      </div>

      <div className="p-6 flex-1 overflow-y-auto">
        {/* Drop Zone */}
        <div 
            className="border-2 border-dashed border-slate-300 rounded-xl bg-slate-50 flex flex-col items-center justify-center p-12 transition-colors hover:bg-slate-100 hover:border-slate-400 cursor-pointer"
            onClick={() => fileInputRef.current?.click()}
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleDrop}
        >
            <input 
                type="file" 
                multiple 
                className="hidden" 
                ref={fileInputRef} 
                accept=".pdf,.jpg,.jpeg,.png"
            />
            <div className="w-16 h-16 bg-slate-200 rounded-full flex items-center justify-center mb-4 text-slate-500">
                <UploadCloud size={32} />
            </div>
            <h3 className="text-lg font-bold text-slate-700 mb-2">{t.dragDropText}</h3>
            <p className="text-sm text-slate-500 text-center max-w-lg">{t.dragDropSubtext}</p>
        </div>

        {/* File List */}
        {files.length > 0 && (
            <div className="mt-8 border border-slate-200 rounded-lg overflow-hidden">
                <table className="w-full text-left text-sm">
                    <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                        <tr>
                            <th className="px-4 py-3 w-12">{t.thNo}</th>
                            <th className="px-4 py-3">{t.thFileName}</th>
                            <th className="px-4 py-3">{t.thFileType}</th>
                            <th className="px-4 py-3">{t.thFileSize}</th>
                            <th className="px-4 py-3">{t.thSource}</th>
                            <th className="px-4 py-3 w-20 text-center">{t.thManage}</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {files.map((file, idx) => (
                            <tr key={idx} className="hover:bg-slate-50">
                                <td className="px-4 py-3 text-slate-500">{idx + 1}</td>
                                <td className="px-4 py-3">
                                    <div className="flex items-center gap-2">
                                        <span className="font-medium text-slate-800">{file.name}</span>
                                        <span className="px-2 py-0.5 bg-green-100 text-green-700 text-[10px] font-bold rounded uppercase">{t.statusReady}</span>
                                    </div>
                                </td>
                                <td className="px-4 py-3 text-slate-600">{getExtension(file.name)}</td>
                                <td className="px-4 py-3 text-slate-600">{formatSize(file.size)}</td>
                                <td className="px-4 py-3">
                                    <span className="px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-700">{t.sourceUpload}</span>
                                </td>
                                <td className="px-4 py-3 text-center">
                                    <button 
                                        onClick={() => removeFile(idx)}
                                        className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-[4px] transition-colors"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        )}
      </div>
      
      {/* Footer Actions */}
      {files.length > 0 && (
          <div className="px-6 py-4 border-t border-slate-200 bg-white flex justify-end gap-3">
              <button 
                  onClick={() => setFiles([])}
                  className="px-4 py-2 border border-slate-300 rounded-[4px] text-slate-700 font-medium hover:bg-slate-50 transition-colors"
              >
                  {t.btnDeleteAll}
              </button>
              <button 
                  onClick={() => onUpload(files)}
                  className="px-4 py-2 bg-[#1f5df9] text-white rounded-[4px] font-medium hover:bg-blue-700 transition-colors shadow-sm"
              >
                  {t.btnUploadAll} ({files.length} {language === 'TH' ? 'ไฟล์' : 'files'})
              </button>
          </div>
      )}

      {/* Error Modal */}
      {errorModal.open && (
          <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
              <div className="bg-white rounded-xl shadow-2xl p-6 max-w-md w-full mx-4 relative animate-in zoom-in-95 duration-200">
                  <button 
                      onClick={() => setErrorModal({ open: false })}
                      className="absolute right-4 top-4 text-slate-400 hover:text-slate-600"
                  >
                      <X size={20} />
                  </button>
                  
                  <div className="flex flex-col items-center text-center">
                      <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4">
                          <AlertCircle size={32} className="text-slate-800" />
                      </div>
                      <h3 className="text-xl font-bold text-slate-900 mb-2">{t.errUploadTitle}</h3>
                      <p className="text-slate-500 mb-6">{t.errUploadDesc}</p>
                      
                      <div className="w-full text-left bg-slate-50 rounded-lg p-4 mb-6 space-y-2 text-sm text-slate-600">
                          <div className="flex items-start gap-2">
                              <div className={`w-1.5 h-1.5 rounded-full mt-1.5 shrink-0 ${errorModal.type === 'TYPE' ? 'bg-red-500' : 'bg-slate-400'}`}></div>
                              <span className={errorModal.type === 'TYPE' ? 'text-red-600 font-medium' : ''}>{t.errType}</span>
                          </div>
                          <div className="flex items-start gap-2">
                              <div className={`w-1.5 h-1.5 rounded-full mt-1.5 shrink-0 ${errorModal.type === 'SIZE' ? 'bg-red-500' : 'bg-slate-400'}`}></div>
                              <span className={errorModal.type === 'SIZE' ? 'text-red-600 font-medium' : ''}>{t.errSize}</span>
                          </div>
                          <div className="flex items-start gap-2">
                              <div className={`w-1.5 h-1.5 rounded-full mt-1.5 shrink-0 ${errorModal.type === 'COUNT' ? 'bg-red-500' : 'bg-slate-400'}`}></div>
                              <span className={errorModal.type === 'COUNT' ? 'text-red-600 font-medium' : ''}>{t.errCount}</span>
                          </div>
                      </div>

                      <button 
                          onClick={() => setErrorModal({ open: false })}
                          className="w-full py-2.5 bg-slate-900 text-white rounded-[4px] font-medium hover:bg-slate-800 transition-colors"
                      >
                          {t.btnClose}
                      </button>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};
