import React, { useState, useEffect } from 'react';
import { Drawer, DatePicker, Button, message } from 'antd';
import thTH from 'antd/locale/th_TH';
import dayjs, { Dayjs } from 'dayjs';
import * as XLSX from 'xlsx';
import { Tooltip } from './Tooltip';
import {
  X, FileBarChart2, Info, Loader2, CheckCircle2, XCircle, Download, ChevronLeft, ChevronRight, Trash2, AlertCircle
} from 'lucide-react';

const { RangePicker } = DatePicker;

const REPORT_PAGE_SIZE = 10;

interface GeneratedReport {
  id: string;
  dateFrom: string;
  dateTo: string;
  statusFilter: 'ALL' | 'PENDING' | 'DONE';
  createdAt: string;
  status: 'GENERATING' | 'DONE' | 'FAILED';
}

interface GenerateReportModalProps {
  visible: boolean;
  onClose: () => void;
  language: string;
}

// Seed data so the drawer doesn't open to an empty table — mirrors reports a real
// team would already have generated over the past few weeks.
const MOCK_REPORTS: GeneratedReport[] = [
  {
    id: 'report-mock-1',
    dateFrom: dayjs().subtract(7, 'day').format('YYYY-MM-DD'),
    dateTo: dayjs().subtract(1, 'day').format('YYYY-MM-DD'),
    statusFilter: 'ALL',
    createdAt: dayjs().subtract(1, 'day').hour(9).minute(12).toISOString(),
    status: 'DONE'
  },
  {
    id: 'report-mock-2',
    dateFrom: dayjs().subtract(30, 'day').format('YYYY-MM-DD'),
    dateTo: dayjs().subtract(15, 'day').format('YYYY-MM-DD'),
    statusFilter: 'DONE',
    createdAt: dayjs().subtract(4, 'day').hour(16).minute(45).toISOString(),
    status: 'DONE'
  },
  {
    id: 'report-mock-3',
    dateFrom: dayjs().subtract(60, 'day').format('YYYY-MM-DD'),
    dateTo: dayjs().subtract(45, 'day').format('YYYY-MM-DD'),
    statusFilter: 'PENDING',
    createdAt: dayjs().subtract(10, 'day').hour(11).minute(3).toISOString(),
    status: 'FAILED'
  },
  {
    id: 'report-mock-4',
    dateFrom: dayjs().subtract(90, 'day').format('YYYY-MM-DD'),
    dateTo: dayjs().subtract(60, 'day').format('YYYY-MM-DD'),
    statusFilter: 'ALL',
    createdAt: dayjs().subtract(20, 'day').hour(8).minute(30).toISOString(),
    status: 'DONE'
  }
];

export const GenerateReportModal: React.FC<GenerateReportModalProps> = ({ visible, onClose, language }) => {
  const isTh = language === 'TH';

  const [dateRange, setDateRange] = useState<[Dayjs | null, Dayjs | null] | null>(null);
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'PENDING' | 'DONE'>('ALL');
  const [generatedReports, setGeneratedReports] = useState<GeneratedReport[]>(MOCK_REPORTS);
  const [reportPage, setReportPage] = useState(1);
  const [selectedReportIds, setSelectedReportIds] = useState<Set<string>>(new Set());
  const [deleteTarget, setDeleteTarget] = useState<GeneratedReport | 'bulk' | null>(null);

  useEffect(() => {
    if (visible) {
      setDateRange(null);
      setStatusFilter('ALL');
      setSelectedReportIds(new Set());
    }
  }, [visible]);

  const earliestAllowed = dayjs().subtract(6, 'month').startOf('day');
  const today = dayjs().endOf('day');

  const disabledDate = (current: Dayjs) => {
    return current && (current < earliestAllowed || current > today);
  };

  const isFormInvalid = !dateRange || !dateRange[0] || !dateRange[1];

  const handleGenerate = () => {
    if (isFormInvalid || !dateRange || !dateRange[0] || !dateRange[1]) {
      message.error(isTh ? 'กรุณาเลือกช่วงวันที่' : 'Please select a date range');
      return;
    }

    const newReport: GeneratedReport = {
      id: `report-${Date.now()}`,
      dateFrom: dateRange[0].format('YYYY-MM-DD'),
      dateTo: dateRange[1].format('YYYY-MM-DD'),
      statusFilter,
      createdAt: new Date().toISOString(),
      status: 'GENERATING'
    };
    setGeneratedReports(prev => [newReport, ...prev]);
    setReportPage(1);
    setDateRange(null);

    // Simulate async report generation (occasionally fails, mirroring a real export job)
    const willSucceed = Math.random() > 0.15;
    setTimeout(() => {
      setGeneratedReports(prev => prev.map(r => r.id === newReport.id ? { ...r, status: willSucceed ? 'DONE' : 'FAILED' } : r));
    }, 2500 + Math.random() * 2000);

    message.success(isTh ? 'เริ่มสร้างรายงานแล้ว กรุณารอสักครู่' : 'Report generation started, please wait');
  };

  const getReportFileName = (report: GeneratedReport) =>
    isTh
      ? `รายงาน_${report.dateFrom}_ถึง_${report.dateTo}.xlsx`
      : `Report_${report.dateFrom}_to_${report.dateTo}.xlsx`;

  const sortedReports = [...generatedReports].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  const reportTotalPages = Math.max(1, Math.ceil(sortedReports.length / REPORT_PAGE_SIZE));
  const paginatedReports = sortedReports.slice((reportPage - 1) * REPORT_PAGE_SIZE, reportPage * REPORT_PAGE_SIZE);

  useEffect(() => {
    if (reportPage > reportTotalPages) setReportPage(reportTotalPages);
  }, [reportPage, reportTotalPages]);

  const toggleSelectOne = (id: string) => {
    setSelectedReportIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const isAllOnPageSelected = paginatedReports.length > 0 && paginatedReports.every(r => selectedReportIds.has(r.id));

  const toggleSelectAllOnPage = () => {
    setSelectedReportIds(prev => {
      const next = new Set(prev);
      if (isAllOnPageSelected) {
        paginatedReports.forEach(r => next.delete(r.id));
      } else {
        paginatedReports.forEach(r => next.add(r.id));
      }
      return next;
    });
  };

  const confirmDelete = () => {
    if (!deleteTarget) return;
    if (deleteTarget === 'bulk') {
      const idsToDelete = new Set(selectedReportIds);
      setGeneratedReports(prev => prev.filter(r => !idsToDelete.has(r.id)));
      setSelectedReportIds(new Set());
      message.success(isTh ? `ลบรายงานที่เลือกแล้ว ${idsToDelete.size} รายการ` : `Deleted ${idsToDelete.size} selected reports`);
    } else {
      const targetId = deleteTarget.id;
      setGeneratedReports(prev => prev.filter(r => r.id !== targetId));
      setSelectedReportIds(prev => {
        const next = new Set(prev);
        next.delete(targetId);
        return next;
      });
      message.success(isTh ? 'ลบรายงานเรียบร้อยแล้ว' : 'Report deleted');
    }
    setDeleteTarget(null);
  };

  const handleDownloadSelected = () => {
    const toDownload = generatedReports.filter(r => selectedReportIds.has(r.id) && r.status === 'DONE');
    if (toDownload.length === 0) {
      message.info(isTh ? 'ไม่มีรายงานที่พร้อมดาวน์โหลดในรายการที่เลือก' : 'No downloadable reports in your selection');
      return;
    }
    toDownload.forEach(handleDownloadReport);
    message.success(isTh ? `ดาวน์โหลด ${toDownload.length} รายงานแล้ว` : `Downloaded ${toDownload.length} reports`);
  };

  const statusFilterLabel = (sf: GeneratedReport['statusFilter']) =>
    sf === 'ALL' ? (isTh ? 'ทั้งหมด' : 'ALL')
      : sf === 'PENDING' ? (isTh ? 'ยังไม่เสร็จ' : 'UNFINISHED')
      : (isTh ? 'เสร็จสิ้นแล้ว' : 'COMPLETED');

  const handleDownloadReport = (report: GeneratedReport) => {
    if (report.status !== 'DONE') return;
    const headers = isTh
      ? ['วันที่เริ่มต้น', 'วันที่สิ้นสุด', 'สถานะ Shipment']
      : ['Date From', 'Date To', 'Shipment Status'];
    const row = [report.dateFrom, report.dateTo, statusFilterLabel(report.statusFilter)];
    const worksheet = XLSX.utils.aoa_to_sheet([headers, row]);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, isTh ? 'รายงาน' : 'Report');
    XLSX.writeFile(workbook, getReportFileName(report));
  };

  const statusPill = (status: GeneratedReport['status']) => {
    if (status === 'GENERATING') {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-amber-50 text-amber-600 border border-amber-100 rounded-full text-[10px] font-black uppercase tracking-wide">
          <Loader2 size={12} className="animate-spin" />
          {isTh ? 'กำลังสร้าง' : 'Generating'}
        </span>
      );
    }
    if (status === 'DONE') {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 text-emerald-600 border border-emerald-100 rounded-full text-[10px] font-black uppercase tracking-wide">
          <CheckCircle2 size={12} />
          {isTh ? 'สร้างเสร็จแล้ว' : 'Completed'}
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-rose-50 text-rose-600 border border-rose-100 rounded-full text-[10px] font-black uppercase tracking-wide">
        <XCircle size={12} />
        {isTh ? 'สร้างไฟล์ล้มเหลว' : 'Failed'}
      </span>
    );
  };

  return (
    <Drawer
      closeIcon={false}
      extra={
        <button
          onClick={onClose}
          className="p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 rounded-lg border-none bg-transparent cursor-pointer transition-colors"
        >
          <X size={20} />
        </button>
      }
      title={
        <div className="font-sans text-[16px] font-black tracking-tight text-[#010136] flex items-center gap-2.5 pb-2">
          <FileBarChart2 size={20} className="text-[#1f5df9]" />
          <span>{isTh ? 'สร้างรายงาน' : 'Generate Report'}</span>
        </div>
      }
      open={visible}
      onClose={onClose}
      size="96vw"
      placement="right"
      className="font-sans"
      footer={selectedReportIds.size > 0 ? (
        <div className="flex items-center justify-between font-sans bg-white">
          <button
            type="button"
            onClick={() => setSelectedReportIds(new Set())}
            className="font-sans font-bold h-10 px-5 text-xs text-slate-500 rounded-[4px] border border-slate-200 hover:border-slate-300 hover:text-slate-700 transition-all cursor-pointer bg-white"
          >
            {isTh ? 'ยกเลิก' : 'Cancel'}
          </button>
          <div className="flex items-center gap-3">
            <span className="text-xs font-bold text-slate-500">
              {isTh ? `เลือกแล้ว ${selectedReportIds.size} รายการ` : `${selectedReportIds.size} selected`}
            </span>
            <button
              type="button"
              onClick={() => setDeleteTarget('bulk')}
              className="font-sans font-bold h-10 px-5 text-xs uppercase tracking-widest rounded-[4px] border border-rose-200 text-rose-500 bg-white hover:bg-rose-50 transition-all cursor-pointer"
            >
              {isTh ? 'ลบรายการที่เลือก' : 'Delete Selected'}
            </button>
            <button
              type="button"
              onClick={handleDownloadSelected}
              className="font-sans font-bold h-10 px-5 text-xs uppercase tracking-widest rounded-[4px] border-none shadow-sm text-white bg-[#1f5df9] hover:bg-[#104BE3] transition-all cursor-pointer"
            >
              {isTh ? 'ดาวน์โหลดรายการที่เลือก' : 'Download Selected'}
            </button>
          </div>
        </div>
      ) : undefined}
    >
      <div className="font-sans py-2 space-y-6 max-w-[1100px] mx-auto">
        <p className="text-xs text-slate-500 font-bold leading-relaxed">
          {isTh
            ? 'เลือกช่วงวันที่และสถานะ Shipment ที่ต้องการสรุปเป็นรายงาน'
            : 'Select a date range and shipment status to summarize into a report'}
        </p>

        <div className="border border-slate-100 rounded-[8px] overflow-hidden">
          <div className="px-5 py-3 bg-slate-50/50 border-b border-slate-100 flex items-center justify-between flex-wrap gap-2">
            <span className="text-[12px] font-black text-slate-600 uppercase tracking-widest">
              {isTh ? 'ตัวกรองรายงาน' : 'Report Filters'}
            </span>
            <span className="flex items-center gap-1.5 text-[11px] text-slate-400 font-bold">
              <Info size={13} className="shrink-0" />
              {isTh ? 'ดาวน์โหลดรายงานย้อนหลังได้มากสุด 6 เดือน' : 'Reports can be generated for up to the last 6 months'}
            </span>
          </div>
          <div className="p-5 flex flex-wrap items-end gap-5">
            <div className="flex-1 min-w-[320px]">
              <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest mb-1.5">
                {isTh ? 'ช่วงวันที่' : 'DATE RANGE'} <span className="text-red-500">*</span>
              </label>
              <RangePicker
                value={dateRange}
                onChange={(dates) => setDateRange(dates as [Dayjs | null, Dayjs | null] | null)}
                disabledDate={disabledDate}
                allowClear
                locale={isTh ? thTH.DatePicker : undefined}
                placeholder={isTh ? ['วันที่เริ่มต้น', 'วันที่สิ้นสุด'] : ['Start date', 'End date']}
                className="w-full !bg-white !border-slate-200 !rounded-[4px] !py-2.5 !px-3 !shadow-sm !text-sm font-sans"
              />
            </div>

            <div className="w-[240px] shrink-0">
              <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest mb-1.5">
                {isTh ? 'สถานะ Shipment' : 'SHIPMENT STATUS'}
              </label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as 'ALL' | 'PENDING' | 'DONE')}
                className="w-full h-[42px] bg-white border border-slate-200 rounded-[4px] py-2.5 px-3 text-sm font-bold text-[#010136] outline-none focus:ring-2 focus:ring-[#1f5df9]/10 focus:border-[#1f5df9] transition-all"
              >
                <option value="ALL">{isTh ? 'ทั้งหมด' : 'ALL'}</option>
                <option value="PENDING">{isTh ? 'ยังไม่เสร็จ' : 'UNFINISHED'}</option>
                <option value="DONE">{isTh ? 'เสร็จสิ้นแล้ว' : 'COMPLETED'}</option>
              </select>
            </div>

            <button
              type="button"
              onClick={handleGenerate}
              disabled={isFormInvalid}
              className={`h-[42px] rounded-[4px] font-sans font-bold px-5 text-xs uppercase tracking-widest transition-all border-none shadow-sm text-white shrink-0 ${
                isFormInvalid
                  ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                  : 'bg-[#1f5df9] hover:bg-[#104BE3] cursor-pointer'
              }`}
            >
              {isTh ? 'สร้างรายงาน' : 'Generate Report'}
            </button>
          </div>
        </div>

        <div className="border border-slate-100 rounded-[8px] overflow-hidden">
          <div className="px-5 py-3 bg-slate-50/50 border-b border-slate-100">
            <span className="text-[12px] font-black text-slate-600 uppercase tracking-widest">
              {isTh ? 'รายงานที่สร้าง' : 'Generated Reports'}
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse table-auto font-sans text-sm">
              <thead>
                <tr className="bg-slate-50/50 text-[11px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">
                  <th className="px-5 py-3 w-10">
                    <input
                      type="checkbox"
                      checked={isAllOnPageSelected}
                      onChange={toggleSelectAllOnPage}
                      className="w-4 h-4 rounded border-slate-300 text-[#1f5df9] focus:ring-[#1f5df9]/30 cursor-pointer"
                    />
                  </th>
                  <th className="px-5 py-3">{isTh ? 'ชื่อไฟล์รายงาน' : 'Report File Name'}</th>
                  <th className="px-5 py-3">{isTh ? 'ช่วงวันที่' : 'Date Range'}</th>
                  <th className="px-5 py-3">{isTh ? 'สถานะที่กรอง' : 'Filtered Status'}</th>
                  <th className="px-5 py-3">{isTh ? 'วันที่สร้าง' : 'Created At'}</th>
                  <th className="px-5 py-3">{isTh ? 'สถานะ' : 'Status'}</th>
                  <th className="px-5 py-3 text-right">{isTh ? 'จัดการ' : 'Actions'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {paginatedReports.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-5 py-8 text-center text-xs text-slate-400 font-bold">
                      {isTh ? 'ยังไม่มีรายงานที่สร้าง' : 'No reports generated yet'}
                    </td>
                  </tr>
                ) : (
                  paginatedReports.map(report => (
                    <tr key={report.id} className="hover:bg-slate-50/40 transition-colors">
                      <td className="px-5 py-3.5">
                        <input
                          type="checkbox"
                          checked={selectedReportIds.has(report.id)}
                          onChange={() => toggleSelectOne(report.id)}
                          className="w-4 h-4 rounded border-slate-300 text-[#1f5df9] focus:ring-[#1f5df9]/30 cursor-pointer"
                        />
                      </td>
                      <td className="px-5 py-3.5 font-bold text-slate-700 text-xs">{getReportFileName(report)}</td>
                      <td className="px-5 py-3.5 text-xs text-slate-500 font-sans font-normal">{report.dateFrom} - {report.dateTo}</td>
                      <td className="px-5 py-3.5 text-xs text-slate-500">{statusFilterLabel(report.statusFilter)}</td>
                      <td className="px-5 py-3.5 text-xs text-slate-500 font-sans font-normal">{dayjs(report.createdAt).format('YYYY-MM-DD HH:mm')}</td>
                      <td className="px-5 py-3.5">{statusPill(report.status)}</td>
                      <td className="px-5 py-3.5 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Tooltip content={isTh ? 'ดาวน์โหลด' : 'Download'}>
                            <button
                              onClick={() => handleDownloadReport(report)}
                              disabled={report.status !== 'DONE'}
                              className="p-2 rounded-[4px] inline-flex items-center justify-center cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed text-slate-500 hover:bg-slate-100 hover:text-blue-600 transition-colors"
                            >
                              <Download size={14} />
                            </button>
                          </Tooltip>
                          <Tooltip content={isTh ? 'ลบ' : 'Delete'}>
                            <button
                              onClick={() => setDeleteTarget(report)}
                              className="p-2 rounded-[4px] inline-flex items-center justify-center cursor-pointer text-slate-500 hover:bg-rose-50 hover:text-rose-600 transition-colors"
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

          {sortedReports.length > 0 && (
            <div className="p-4 border-t border-slate-100 bg-slate-50/20 flex items-center justify-between font-sans">
              <div className="text-[11px] font-black text-slate-400 uppercase tracking-widest">
                {isTh ? 'แสดง' : 'Showing'} <span className="text-slate-800">{Math.min(sortedReports.length, (reportPage - 1) * REPORT_PAGE_SIZE + 1)}</span> {isTh ? 'ถึง' : 'to'} <span className="text-slate-800">{Math.min(sortedReports.length, reportPage * REPORT_PAGE_SIZE)}</span> {isTh ? 'จากทั้งหมด' : 'of'} <span className="text-slate-800">{sortedReports.length}</span> {isTh ? 'รายการ' : 'items'}
              </div>
              {reportTotalPages > 1 && (
                <div className="flex items-center gap-3">
                  <button
                    disabled={reportPage === 1}
                    onClick={() => setReportPage(prev => Math.max(1, prev - 1))}
                    className="p-1.5 rounded-[4px] border border-slate-200 bg-white text-slate-400 hover:text-blue-600 disabled:opacity-30 disabled:cursor-not-allowed transition-all shadow-sm"
                  >
                    <ChevronLeft size={14} />
                  </button>
                  <div className="flex items-center gap-1.5">
                    {Array.from({ length: reportTotalPages }).map((_, i) => (
                      <button
                        key={i}
                        onClick={() => setReportPage(i + 1)}
                        className={`w-8 h-8 rounded-[4px] font-black text-xs transition-all ${reportPage === i + 1 ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20 scale-110' : 'bg-white border border-slate-100 text-slate-400 hover:border-blue-200 hover:bg-slate-50'}`}
                      >
                        {i + 1}
                      </button>
                    ))}
                  </div>
                  <button
                    disabled={reportPage === reportTotalPages}
                    onClick={() => setReportPage(prev => Math.min(reportTotalPages, prev + 1))}
                    className="p-1.5 rounded-[4px] border border-slate-200 bg-white text-slate-400 hover:text-blue-600 disabled:opacity-30 disabled:cursor-not-allowed transition-all shadow-sm"
                  >
                    <ChevronRight size={14} />
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {deleteTarget && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-300 font-sans">
          <div className="bg-white p-10 rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 text-center flex flex-col items-center gap-6 animate-in zoom-in-95 duration-300">
            <div className="text-rose-500 flex items-center justify-center mb-2">
              <AlertCircle size={44} strokeWidth={2} />
            </div>
            <div>
              <h3 className="text-xl font-black text-[#010136] tracking-tight mb-3 font-sans">
                {deleteTarget === 'bulk'
                  ? (isTh ? 'ยืนยันการลบรายงานที่เลือก' : 'Confirm Delete Selected Reports')
                  : (isTh ? 'ยืนยันการลบรายงาน' : 'Confirm Delete Report')}
              </h3>
              <p className="text-slate-500 font-medium text-[13px] leading-relaxed font-sans max-w-sm mx-auto">
                {deleteTarget === 'bulk'
                  ? (isTh
                      ? `คุณต้องการลบรายงานที่เลือกไว้ ${selectedReportIds.size} รายการใช่หรือไม่? การกระทำนี้ไม่สามารถย้อนกลับได้`
                      : `Are you sure you want to delete the ${selectedReportIds.size} selected reports? This action cannot be undone.`)
                  : (isTh
                      ? `คุณต้องการลบไฟล์ "${getReportFileName(deleteTarget)}" ใช่หรือไม่? การกระทำนี้ไม่สามารถย้อนกลับได้`
                      : `Are you sure you want to delete "${getReportFileName(deleteTarget)}"? This action cannot be undone.`)}
              </p>
            </div>
            <div className="flex gap-4 w-full mt-4">
              <Button
                size="large"
                className="flex-1 rounded-[4px] h-14 font-black uppercase tracking-widest text-[11px] border-slate-200 text-slate-600 hover:bg-slate-50 font-sans"
                onClick={() => setDeleteTarget(null)}
              >
                {isTh ? 'ยกเลิก' : 'Cancel'}
              </Button>
              <Button
                type="primary"
                size="large"
                className="flex-1 rounded-[4px] h-14 font-black uppercase tracking-widest text-[11px] bg-[#1f5df9] border-none shadow-lg shadow-[#1f5df9]/20 hover:!bg-[#104BE3] font-sans"
                onClick={confirmDelete}
              >
                {isTh ? 'ลบ' : 'Delete'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </Drawer>
  );
};
