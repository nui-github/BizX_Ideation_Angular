import React, { useState, useEffect } from 'react';
import { Drawer, DatePicker, message } from 'antd';
import thTH from 'antd/locale/th_TH';
import dayjs, { Dayjs } from 'dayjs';
import * as XLSX from 'xlsx';
import {
  X, FileBarChart2, Info, Loader2, CheckCircle2, XCircle, Download, ChevronLeft, ChevronRight
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

  useEffect(() => {
    if (visible) {
      setDateRange(null);
      setStatusFilter('ALL');
    }
  }, [visible]);

  const earliestAllowed = dayjs().subtract(12, 'month').startOf('day');
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

  const sortedReports = [...generatedReports].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  const reportTotalPages = Math.max(1, Math.ceil(sortedReports.length / REPORT_PAGE_SIZE));
  const paginatedReports = sortedReports.slice((reportPage - 1) * REPORT_PAGE_SIZE, reportPage * REPORT_PAGE_SIZE);

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
      footer={
        <div className="flex justify-end gap-3 font-sans bg-white">
          <button
            type="button"
            onClick={onClose}
            className="font-sans font-bold h-10 px-5 text-xs text-slate-500 rounded-[4px] border border-slate-200 hover:border-slate-300 hover:text-slate-700 transition-all cursor-pointer bg-white"
          >
            {isTh ? 'ปิด' : 'Close'}
          </button>
          <button
            type="button"
            onClick={handleGenerate}
            disabled={isFormInvalid}
            className={`rounded-[4px] font-sans font-bold h-10 px-5 text-xs uppercase tracking-widest transition-all border-none shadow-sm text-white ${
              isFormInvalid
                ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                : 'bg-[#1f5df9] hover:bg-[#104BE3] cursor-pointer'
            }`}
          >
            {isTh ? 'สร้างรายงาน' : 'Generate Report'}
          </button>
        </div>
      }
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
              {isTh ? 'ดาวน์โหลดรายงานย้อนหลังได้มากสุด 12 เดือน' : 'Reports can be generated for up to the last 12 months'}
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
                  <th className="px-5 py-3">{isTh ? 'ชื่อไฟล์รายงาน' : 'Report File Name'}</th>
                  <th className="px-5 py-3">{isTh ? 'ช่วงวันที่' : 'Date Range'}</th>
                  <th className="px-5 py-3">{isTh ? 'สถานะ Shipment ที่กรอง' : 'Filtered Shipment Status'}</th>
                  <th className="px-5 py-3">{isTh ? 'วันที่สร้าง' : 'Created At'}</th>
                  <th className="px-5 py-3">{isTh ? 'สถานะ' : 'Status'}</th>
                  <th className="px-5 py-3 text-right">{isTh ? 'ดาวน์โหลด' : 'Download'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {paginatedReports.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-5 py-8 text-center text-xs text-slate-400 font-bold">
                      {isTh ? 'ยังไม่มีรายงานที่สร้าง' : 'No reports generated yet'}
                    </td>
                  </tr>
                ) : (
                  paginatedReports.map(report => (
                    <tr key={report.id} className="hover:bg-slate-50/40 transition-colors">
                      <td className="px-5 py-3.5 font-bold text-slate-700 text-xs">{getReportFileName(report)}</td>
                      <td className="px-5 py-3.5 text-xs text-slate-500 font-sans font-normal">{report.dateFrom} - {report.dateTo}</td>
                      <td className="px-5 py-3.5 text-xs text-slate-500">{statusFilterLabel(report.statusFilter)}</td>
                      <td className="px-5 py-3.5 text-xs text-slate-500 font-sans font-normal">{dayjs(report.createdAt).format('YYYY-MM-DD HH:mm')}</td>
                      <td className="px-5 py-3.5">{statusPill(report.status)}</td>
                      <td className="px-5 py-3.5 text-right">
                        <button
                          onClick={() => handleDownloadReport(report)}
                          disabled={report.status !== 'DONE'}
                          className="p-2 rounded-[4px] border inline-flex items-center justify-center cursor-pointer shadow-sm disabled:opacity-30 disabled:cursor-not-allowed bg-white text-slate-500 border-slate-200/60 hover:bg-slate-50 hover:text-[#1f5df9] hover:border-blue-200 transition-all"
                          title={isTh ? 'ดาวน์โหลด' : 'Download'}
                        >
                          <Download size={14} />
                        </button>
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
    </Drawer>
  );
};
