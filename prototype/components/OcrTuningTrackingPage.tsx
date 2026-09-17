import React, { useState, useMemo } from 'react';
import { Modal, Drawer, Tooltip } from 'antd';
import { Plus, Search, Layers, History, Pencil, Trash2, Inbox } from 'lucide-react';
import { Language, DocType } from '../types';
import { LabelSchema, DEFAULT_SCHEMAS } from './LabelSchemaSettings';

interface OcrTuningTrackingPageProps {
  language: Language;
  docTypes: DocType[];
  onCreateNew: () => void;
  onEditSchema: (editKey: string) => void;
  // Which team's own schemas to scope this list to — switchable from the profile menu so QA
  // can preview the app as a member of any team. Defaults to Operation.
  currentTeam?: string;
}

const formatDate = (dateStr: string, isTh: boolean) => {
  const d = new Date(dateStr);
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  const hours = String(d.getHours()).padStart(2, '0');
  const mins = String(d.getMinutes()).padStart(2, '0');
  return isTh ? `${day}/${month}/${year} ${hours}:${mins}` : `${month}/${day}/${year} ${hours}:${mins}`;
};

// Deterministic mock history entries — this prototype has no real per-schema audit log, so we
// synthesize a plausible edit trail from the schema's own id/updatedAt instead of storing one.
const hashString = (s: string): number => {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h;
};
interface MockHistoryEntry { action: 'created' | 'updated'; user: string; timestamp: string; detail: string[]; }
const buildMockHistory = (schema: LabelSchema, isTh: boolean): MockHistoryEntry[] => {
  const updated = new Date(schema.updatedAt).getTime();
  const h = hashString(schema.id);
  const editors = ['Kunawut W.', 'Somchai P.', 'Nattaya S.', 'Preecha T.'];
  const allFieldNames = schema.configs.flatMap(c => c.labels.map(l => l.name)).filter(Boolean);
  const totalFields = allFieldNames.length;

  const editDetail = (seed: number): string[] => {
    if (allFieldNames.length === 0) return [];
    if (seed % 2 === 0) {
      const field = allFieldNames[seed % allFieldNames.length];
      return [isTh ? `เพิ่มฟิลด์: ${field}` : `Added field: ${field}`];
    }
    const picked = [0, 1, 2].map(i => allFieldNames[(seed + i) % allFieldNames.length]);
    const unique = Array.from(new Set(picked));
    return [isTh ? `แก้ไขคำอธิบาย: ${unique.join(', ')}` : `Edited hints: ${unique.join(', ')}`];
  };

  const entries: MockHistoryEntry[] = [
    {
      action: 'created',
      user: schema.createdBy || editors[h % editors.length],
      timestamp: new Date(updated - (3 + (h % 10)) * 86400000).toISOString(),
      detail: [isTh ? `ฟิลด์ตั้งต้น ${totalFields} ฟิลด์` : `${totalFields} initial fields`],
    },
  ];
  const editCount = 1 + (h % 3);
  for (let i = 0; i < editCount; i++) {
    entries.push({
      action: 'updated',
      user: editors[(h + i) % editors.length],
      timestamp: new Date(updated - (editCount - i) * 43200000).toISOString(),
      detail: editDetail(h + i),
    });
  }
  entries.push({
    action: 'updated',
    user: schema.createdBy || editors[h % editors.length],
    timestamp: schema.updatedAt,
    detail: editDetail(h + editCount),
  });
  return entries;
};

export const OcrTuningTrackingPage: React.FC<OcrTuningTrackingPageProps> = ({ language, docTypes, onCreateNew, onEditSchema, currentTeam = 'operation' }) => {
  const isTh = language === 'TH';
  const t = (th: string, en: string) => (isTh ? th : en);
  const docTypeName = (id: string) => docTypes.find(d => d.id === id)?.name || id;

  const [schemas, setSchemas] = useState<LabelSchema[]>(() => {
    const saved = typeof window !== 'undefined' ? localStorage.getItem('bizx_label_schemas_v7') : null;
    if (saved) {
      try { return JSON.parse(saved); } catch (e) { console.error('Failed to parse saved schemas', e); }
    }
    return DEFAULT_SCHEMAS;
  });

  const [searchQuery, setSearchQuery] = useState('');
  const [historyTarget, setHistoryTarget] = useState<LabelSchema | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<LabelSchema | null>(null);

  // Only schemas created by someone on my own team — matches the team picked in the profile menu.
  const teamSchemas = useMemo(
    () => schemas.filter(s => (s.createdByTeam || 'operation') === currentTeam),
    [schemas, currentTeam]
  );

  const filteredSchemas = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return teamSchemas;
    return teamSchemas.filter(s =>
      s.name.toLowerCase().includes(q) ||
      s.docTypes.some(id => docTypeName(id).toLowerCase().includes(q))
    );
  }, [teamSchemas, searchQuery, docTypes]);

  const fieldCount = (schema: LabelSchema) => schema.configs.reduce((n, c) => n + c.labels.length, 0);

  const handleDelete = (schema: LabelSchema) => {
    setSchemas(prev => {
      const next = prev.filter(s => s.id !== schema.id);
      if (typeof window !== 'undefined') localStorage.setItem('bizx_label_schemas_v7', JSON.stringify(next));
      return next;
    });
    setDeleteTarget(null);
  };

  const handleEdit = (schema: LabelSchema) => {
    const config = schema.configs[0];
    if (!config) return;
    onEditSchema(`${schema.id}::${config.docTypeId}`);
  };

  return (
    <div className="-m-4 font-sans">
      <div className="bg-white rounded-lg shadow-[0_2px_8px_rgba(0,0,0,0.1)] m-6 p-6">
        <div className="flex items-start justify-between gap-4 mb-5">
          <div>
            <h1 className="text-xl font-black text-slate-900 tracking-tight">{t('Schema ของทีม', "My Team's Schemas")}</h1>
            <p className="text-sm text-slate-500 mt-0.5">{t('schema ที่ทีมสร้างจากหน้าปรับการอ่านเอกสาร', "Schemas your team created from the OCR Tuning page")}</p>
          </div>
          <button
            onClick={onCreateNew}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-[4px] bg-[#1f5df9] text-white text-sm font-bold hover:bg-[#1a4fd6] cursor-pointer shrink-0"
          >
            <Plus size={14} /> {t('สร้าง schema ใหม่', 'Create new schema')}
          </button>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div className="p-4 border-b border-slate-100">
            <div className="relative max-w-sm">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <input
                type="text"
                className="w-full text-sm pl-10 pr-3 py-2 border border-slate-200 rounded-[4px] focus:outline-none focus:ring-1 focus:ring-blue-500/25"
                placeholder={t('ค้นหาชื่อ schema หรือชนิดเอกสาร', 'Search schema name or document type')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-100">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-black text-slate-400 uppercase tracking-wider">{t('ชื่อ schema', 'Schema name')}</th>
                  <th className="px-6 py-3 text-left text-xs font-black text-slate-400 uppercase tracking-wider">{t('ชนิดเอกสาร', 'Document type')}</th>
                  <th className="px-6 py-3 text-left text-xs font-black text-slate-400 uppercase tracking-wider">{t('ฟิลด์', 'Fields')}</th>
                  <th className="px-6 py-3 text-left text-xs font-black text-slate-400 uppercase tracking-wider">{t('สร้างโดย', 'Created by')}</th>
                  <th className="px-6 py-3 text-left text-xs font-black text-slate-400 uppercase tracking-wider">{t('แก้ไขล่าสุด', 'Updated')}</th>
                  <th className="px-6 py-3 text-right text-xs font-black text-slate-400 uppercase tracking-wider pr-8">{t('จัดการ', 'Actions')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {filteredSchemas.length === 0 ? (
                  <tr>
                    <td colSpan={6}>
                      <div className="flex flex-col items-center justify-center py-16 text-center">
                        <div className="w-16 h-16 bg-slate-50 text-slate-300 rounded-full flex items-center justify-center mb-4 border border-slate-100">
                          <Inbox size={28} />
                        </div>
                        <p className="text-sm font-bold text-slate-500">{t('ทีมยังไม่มี schema', 'Your team has no schemas yet')}</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredSchemas.map(schema => (
                    <tr key={schema.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2.5">
                          <div className="p-2 bg-blue-50/70 text-[#1f5df9] rounded-[4px] shrink-0">
                            <Layers size={14} />
                          </div>
                          <span className="text-sm font-black text-[#010136]">{schema.name}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-600 font-medium">
                        {schema.docTypes.map(id => docTypeName(id)).join(', ') || '-'}
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-600 font-medium">{fieldCount(schema)}</td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-slate-600 font-medium">{schema.createdBy || '-'}</div>
                        <div className="text-xs text-slate-400 mt-0.5">{formatDate(schema.createdAt || schema.updatedAt, isTh)}</div>
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-500 whitespace-nowrap">{formatDate(schema.updatedAt, isTh)}</td>
                      <td className="px-6 py-4 text-right pr-8">
                        <div className="flex items-center justify-end gap-1.5">
                          <Tooltip title={t('ดูประวัติ', 'View history')}>
                            <button
                              onClick={() => setHistoryTarget(schema)}
                              className="p-2 hover:bg-slate-50 text-slate-400 hover:text-[#1f5df9] bg-white border border-slate-200 rounded-[4px] transition-all cursor-pointer"
                            >
                              <History size={14} />
                            </button>
                          </Tooltip>
                          <Tooltip title={t('แก้ไข schema', 'Edit schema')}>
                            <button
                              onClick={() => handleEdit(schema)}
                              className="p-2 hover:bg-slate-50 text-slate-400 hover:text-[#1f5df9] bg-white border border-slate-200 rounded-[4px] transition-all cursor-pointer"
                            >
                              <Pencil size={14} />
                            </button>
                          </Tooltip>
                          <Tooltip title={t('ลบ schema', 'Delete schema')}>
                            <button
                              onClick={() => setDeleteTarget(schema)}
                              className="p-2 hover:bg-rose-50 text-slate-400 hover:text-rose-600 bg-white border border-slate-200 rounded-[4px] transition-all cursor-pointer"
                            >
                              <Trash2 size={14} />
                            </button>
                          </Tooltip>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* History log drawer */}
      <Drawer
        open={!!historyTarget}
        onClose={() => setHistoryTarget(null)}
        width={420}
        title={historyTarget ? t(`ประวัติการแก้ไข: ${historyTarget.name}`, `Edit history: ${historyTarget.name}`) : ''}
      >
        {historyTarget && (
          <div>
            {buildMockHistory(historyTarget, isTh).slice().reverse().map((entry, idx, arr) => {
              const isCreated = entry.action === 'created';
              const isLast = idx === arr.length - 1;
              return (
                <div key={idx} className="relative pl-6">
                  {!isLast && <span className="absolute left-[5px] top-3 bottom-0 w-px bg-slate-200" />}
                  <span className={`absolute left-0 top-1 w-[11px] h-[11px] rounded-full bg-white border-2 ${isCreated ? 'border-emerald-400' : 'border-blue-400'}`} />
                  <div className={`pb-5 ${isLast ? '' : ''}`}>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`px-2 py-0.5 rounded-[4px] border text-xs font-bold ${isCreated ? 'border-emerald-300 text-emerald-600 bg-emerald-50' : 'border-blue-300 text-blue-600 bg-blue-50'}`}>
                        {isCreated ? t('สร้าง', 'Created') : t('แก้ไข', 'Edited')}
                      </span>
                      <span className="text-sm font-bold text-slate-800">{entry.user}</span>
                      <span className="text-xs text-slate-400">{formatDate(entry.timestamp, isTh)}</span>
                    </div>
                    {entry.detail.length > 0 && (
                      <div className="mt-1.5 space-y-0.5">
                        {entry.detail.map((line, i) => (
                          <p key={i} className="text-xs text-slate-500">{line}</p>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Drawer>

      {/* Delete confirm modal */}
      <Modal
        open={!!deleteTarget}
        onCancel={() => setDeleteTarget(null)}
        footer={null}
        width={420}
        centered
        closable={false}
      >
        {deleteTarget && (
          <div className="p-2 text-center space-y-4">
            <div className="w-12 h-12 mx-auto bg-rose-50 text-rose-500 rounded-full flex items-center justify-center">
              <Trash2 size={22} />
            </div>
            <div className="space-y-1.5">
              <h3 className="text-base font-black text-[#010136] tracking-tight">
                {t(`ต้องการลบ ${deleteTarget.name} ใช่หรือไม่`, `Delete ${deleteTarget.name}?`)}
              </h3>
              <p className="text-xs text-slate-500 font-semibold">{t('การลบนี้ไม่สามารถกู้คืนได้', 'This action cannot be undone.')}</p>
            </div>
            <div className="pt-1 grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                className="px-4 py-2.5 border border-slate-200 text-slate-500 hover:bg-slate-50 font-bold text-sm rounded-[4px] transition-all cursor-pointer"
              >
                {t('ยกเลิก', 'Cancel')}
              </button>
              <button
                type="button"
                onClick={() => handleDelete(deleteTarget)}
                className="px-4 py-2.5 bg-rose-600 text-white hover:bg-rose-700 font-bold text-sm rounded-[4px] transition-all cursor-pointer"
              >
                {t('ลบ schema', 'Delete schema')}
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};
