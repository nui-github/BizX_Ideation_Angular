import React, { useEffect, useState } from 'react';
import designLoopSvg from './design-process/design-loop.svg?raw';
import devHandoffSvg from './design-process/dev-handoff.svg?raw';
import {
  Target, MousePointerClick, MessagesSquare, Hammer, ScanEye, GitCommitHorizontal,
  Copy, Check, Users, ListChecks, AlertTriangle, BookOpen, Layers, Sparkles, Lightbulb, ArrowRight
} from 'lucide-react';

// Standalone page, served at /design-process (see index.tsx). It is deliberately not linked from
// the app's menu — open the URL directly. Describes how this prototype is designed by "vibe coding"
// with Claude, using what actually happened on this project as the examples.

const PRIMARY = '#1f5df9';
const NAVY = '#010136';

const SECTIONS = [
  { id: 'principles', label: 'หลักคิด' },
  { id: 'loop', label: 'วงจรทำงาน' },
  { id: 'prompts', label: 'วิธีสั่งงาน' },
  { id: 'roles', label: 'บทบาท' },
  { id: 'mock', label: 'Mock data' },
  { id: 'copy', label: 'ภาษาในหน้าจอ' },
  { id: 'gates', label: 'เช็กลิสต์' },
  { id: 'case', label: 'ตัวอย่างจริง' },
  { id: 'handoff', label: 'ส่งต่อทีม dev' },
  { id: 'lessons', label: 'ข้อควรระวัง' }
];

const LOOP_STEPS = [
  {
    icon: Target,
    title: 'ตั้งโจทย์',
    en: 'Frame',
    who: 'คน',
    body: 'บอกว่าใครใช้ ใช้ตอนไหน และเจอปัญหาอะไร เล่าเป็น use case จริง ไม่ต้องบอกวิธีแก้ เช่น "Packing List ไม่มีเลข Invoice ระบบเลยไม่รู้ว่าต้องเทียบกับ Invoice ใบไหน"',
    output: 'โจทย์ 1–3 ประโยค + ผู้ใช้เป้าหมาย (เช่น non-tech)'
  },
  {
    icon: MousePointerClick,
    title: 'ชี้ให้ตรงจุด',
    en: 'Point',
    who: 'คน',
    body: 'แนบ screenshot และเลือก element ในหน้าพรีวิวแล้วส่งมาด้วย Claude จะรู้ทันทีว่าคือ component ไหน ไฟล์ไหน บรรทัดไหน ไม่ต้องอธิบายตำแหน่งด้วยคำพูด',
    output: 'ภาพ + element ที่เลือก + ข้อความสั้นๆ ว่าอยากให้ต่างจากนี้อย่างไร'
  },
  {
    icon: MessagesSquare,
    title: 'คุยแนวทาง',
    en: 'Discuss',
    who: 'คน + Claude',
    body: 'ถ้า UX ยังไม่ชัด ให้ถามก่อนลงมือ ("เราควรทำยังไงดี") Claude ชี้ปัญหาที่เห็น เสนอ 1–2 ทางพร้อมแนะนำทางหนึ่ง และบอกทางที่ไม่เลือก คนตัดสินด้วยคำสั้นๆ เช่น "ทำเลย" หรือ "ใช้แบบที่ 2"',
    output: 'ข้อสรุปว่าจะทำอะไร (และไม่ทำอะไร)'
  },
  {
    icon: Hammer,
    title: 'ลงมือสร้าง',
    en: 'Build',
    who: 'Claude',
    body: 'แก้โค้ดจริงใน prototype ทีละก้อนเล็ก ใช้ mock data ที่ทำให้เห็นสถานะต่างๆ ครบ (ผ่าน / ไม่ผ่าน / กรณีขอบ) ให้ดูเหมือนของจริงที่สุดเท่าที่ทำได้ แต่ไม่เขียน logic ที่เกินกว่าที่ต้องใช้โชว์ไอเดีย',
    output: 'โค้ดที่รันได้ในพรีวิว'
  },
  {
    icon: ScanEye,
    title: 'ตรวจในเบราว์เซอร์',
    en: 'Verify',
    who: 'Claude → คน',
    body: 'Claude เปิดพรีวิวเอง คลิกใช้งานจริง ตรวจ console และถ่ายภาพหน้าจอ ก่อนบอกว่าเสร็จ ไม่ใช่แค่อ่านโค้ดแล้วเดา จากนั้นคนรีวิวเองอีกรอบ ถ้าเจอจุดไหนไม่ถูกใจก็ชี้กลับเข้าวงจรที่ขั้นที่ 2',
    output: 'ผลทดสอบ + ภาพหน้าจอ'
  },
  {
    icon: GitCommitHorizontal,
    title: 'ปิดงานด้วยคำสั่งของคน',
    en: 'Ship',
    who: 'คน',
    body: 'Claude ไม่ commit เอง จนกว่าคนจะพิมพ์ "commit & push" แยกต่างหากหลังรีวิวแล้ว ทำให้แต่ละ commit คือ 1 การตัดสินใจที่คนอนุมัติ ย้อนกลับง่าย และประวัติ git อ่านเป็นเรื่องราวได้',
    output: '1 commit ต่อ 1 การเปลี่ยนแปลงที่รีวิวแล้ว'
  }
];

const PROMPT_PATTERNS = [
  {
    when: 'อยากปรับของที่มีอยู่',
    prompt: 'ปรับ border บนล่างให้บางลงหน่อย พอปิดชนกันแล้วดูเป็นเส้นหนาไป',
    tip: 'แนบภาพ + เลือก element ไปด้วย ระบุอาการที่เห็น ไม่ต้องบอกว่าต้องแก้ CSS ตรงไหน'
  },
  {
    when: 'ยังไม่แน่ใจว่าควรออกแบบยังไง',
    prompt: 'ก้อน section ที่เป็นรายการจับคู่ไม่ได้ อยากให้ดูแยกออกมาให้ชัดเจน เราควรทำยังไงดี',
    tip: 'ถามเป็นคำถามเปิด ให้ Claude วิเคราะห์ปัญหา เสนอทางเลือก และแนะนำ ยังไม่ต้องให้แก้โค้ด'
  },
  {
    when: 'ตัดสินใจแล้ว',
    prompt: 'ทำเลย',
    tip: 'ตอบสั้นได้เมื่อข้อเสนอก่อนหน้าชัดเจน ถ้าอยากเปลี่ยนบางส่วนให้พิมพ์ส่วนที่ต่างจากข้อเสนอ'
  },
  {
    when: 'อยากเห็นกรณีเพิ่ม',
    prompt: 'ลองเพิ่มกรณี HS Code ไม่ตรงด้วย',
    tip: 'ขอ mock data เพิ่มเพื่อให้เห็นทั้งกรณีผ่านและไม่ผ่าน ช่วยให้รีวิว UX ได้ครบกว่าดูแค่กรณีปกติ'
  },
  {
    when: 'ขอคำอธิบายภาษาคน',
    prompt: 'ช่วยแต่งคำให้เข้าใจง่ายๆ non tech อ่านได้ แต่ไม่ทางการเกินไป',
    tip: 'บอกกลุ่มผู้อ่านและระดับภาษา Claude จะลองหลายสำนวนและอธิบายว่าทำไมเลือกคำนั้น'
  },
  {
    when: 'ปิดงาน',
    prompt: 'commit & push',
    tip: 'พิมพ์เมื่อรีวิวแล้วเท่านั้น Claude ไม่ commit เองโดยที่ไม่ได้สั่ง'
  }
];

const ROLES = [
  {
    who: 'คน (Product / Designer)',
    does: ['ตั้งโจทย์และเล่า use case', 'ตัดสินใจเรื่อง UX ทุกข้อ', 'รีวิวผลจริงในพรีวิว', 'สั่งปิดงาน (commit & push)'],
    not: 'ไม่ต้องเขียนโค้ด ไม่ต้องรู้ว่าต้องแก้ไฟล์ไหน'
  },
  {
    who: 'Claude',
    does: ['วิเคราะห์ปัญหาและเสนอแนวทางพร้อมแนะนำ', 'แก้โค้ดและสร้าง mock data', 'ทดสอบในเบราว์เซอร์ก่อนรายงาน', 'เขียน commit message และอัปเดตเอกสาร'],
    not: 'ไม่ตัดสินแทนคนในเรื่อง UX ที่คลุมเครือ และไม่ commit เองถ้าไม่ได้รับคำสั่ง'
  }
];

const MOCK_RULES = [
  { t: 'เล่าเรื่องให้ครบ ไม่ใช่แค่กรณีปกติ', d: 'ทุกฟีเจอร์ควรมีทั้งกรณีผ่าน ไม่ผ่าน และกรณีขอบ เช่น HS Code ตรง / ใช้รหัสฉบับเก่า / ไม่ตรงเลย ถึงจะรีวิว UX ได้ว่าข้อความและปุ่มรองรับครบ' },
  { t: 'ตั้งชื่อ shipment ให้อ่านแล้วรู้ว่าเดโมอะไร', d: 'เช่น "Incoterm by freight terms", "Merge field value" คนที่เปิดมาเห็นแล้วรู้ทันทีว่าควรดูส่วนไหน' },
  { t: 'ให้ครบทั้งเส้นทาง ไม่ใช่แค่หน้าเดียว', d: 'เดโมที่ดีมีทั้ง 4 โฟลว์ โฟลว์แรกเสร็จแล้ว โฟลว์ที่โชว์ฟีเจอร์ อยู่ระหว่างทำ และโฟลว์ท้ายยังไม่เริ่ม เหมือนงานจริง' },
  { t: 'ข้อมูลหลายชุดเพื่อดูการสลับ', d: 'เช่นแถวเลือกชุดข้อมูล (Invoice 3 ใบ) ช่วยให้เห็นว่า UI รับมือข้อมูลต่างขนาดและต่างสถานการณ์ได้' },
  { t: 'แยก "ของที่จะพอร์ต" ออกจาก "ฉากเดโม"', d: 'ฟังก์ชันที่สร้างผลลัพธ์เดโมไว้ล่วงหน้าเป็นแค่ฉาก ทีม dev พอร์ตเฉพาะ UI และกฎที่เดโมใช้ ไม่พอร์ตฉาก (บันทึกไว้ใน docs/HANDOFF.md)' }
];

const COPY_RULES = [
  { t: 'เขียนให้ non-tech อ่านรู้เรื่อง', bad: 'Fallback to index', good: 'ถ้าหาแถวที่ตรงกันไม่เจอ ให้เทียบตามลำดับแถวแทน' },
  { t: 'ไม่ภาษาพูดเกิน ไม่ทางการเกิน', bad: 'ตรงเป๊ะ', good: 'ตรงกันทุกตัวอักษร' },
  { t: 'บอกผลที่ตามมา ไม่ใช่แค่ชื่อฟีเจอร์', bad: 'เปิดใช้งานกฎ', good: 'ระบบจะนำค่าไปเทียบกับ Invoice เลขนี้' },
  { t: 'ยกตัวอย่างในคำอธิบาย', bad: 'ไม่สนตัวพิมพ์เล็ก-ใหญ่', good: 'ไม่สนตัวพิมพ์เล็ก-ใหญ่ เช่น "Polo-Shirt" ตรงกับ "POLO SHIRT"' },
  { t: 'ตัวเลือกที่ไม่บังคับ ให้บอกว่าไม่บังคับ', bad: 'Invoice No.', good: 'Invoice No. (ไม่บังคับ) พร้อมไอคอน info อธิบายว่ากรอกเพื่ออะไร' }
];

const GATES = [
  'ตรวจในเบราว์เซอร์จริงแล้ว (ไม่ใช่แค่โค้ดผ่าน) และไม่มี error ใน console',
  'ลองคลิกทุกปุ่มที่เพิ่ม รวมถึงกรณีผ่าน ไม่ผ่าน ว่าง และข้อมูลเยอะ',
  'สีหลักและมุมโค้งตรงกับ design system (primary #1f5df9, มุม 4px)',
  'ข้อความอ่านรู้เรื่องสำหรับ non-tech และมี tooltip / info ตรงที่ต้องอธิบาย',
  'ทำงานร่วมกับของเดิมได้ เช่น ยืนยันค่า แก้ไขค่า OCR สลับชุดข้อมูล',
  'ถ้าเพิ่มเงื่อนไขหรือข้อมูลที่เก็บ อัปเดตเอกสาร (docs/HANDOFF.md, DATA_MODELS.md) ด้วย',
  'commit แยกเรื่อง ข้อความ commit บอกว่าเปลี่ยนอะไรและทำไม'
];

const CASE_STEPS = [
  { n: 1, t: 'โจทย์', d: 'Packing List แตกสินค้าเป็นหลายแถวตามไซส์ แต่ Invoice รวมเป็นแถวเดียว ระบบจับคู่ไม่ได้ ผู้ใช้เห็นแถวค้างเป็นสิบแถว' },
  { n: 2, t: 'ทำ mock ก่อน', d: 'สร้าง shipment "Merge field value" 4 โฟลว์ พร้อมส่วน "รายการที่จับคู่กับ Invoice ไม่ได้" เพื่อให้เห็นปัญหาจริงในหน้าจอ' },
  { n: 3, t: 'คุยแนวทาง + ตัดสิน', d: 'คนวาดโครง drawer มาให้ ให้ Claude ช่วยคิดภาษาและโครงใหม่ จากนั้นตัดสินว่า "ให้เลือกฟิลด์ key เอง" และ "สร้างเป็นรายการได้หลายกฎ"' },
  { n: 4, t: 'ทำและตรวจ', d: 'Claude สร้าง drawer ตรวจว่าบวกรวมแล้ว 1,200 / 2,400 / 3,600 ตรงกับ Invoice และกดลบกฎแล้วแถวกลับมา' },
  { n: 5, t: 'ปรับตามภาพหลายรอบ', d: 'เปลี่ยนเป็นสี primary, แก้ที่ confirm / OCR edit ใช้ไม่ได้ (เจอบั๊กเพราะฟิลด์ชื่อซ้ำหลาย item), ตั้งกรอบสีเหลืองอำพันให้ส่วนที่จับคู่ไม่ได้ ฯลฯ' },
  { n: 6, t: 'ขยายแนวคิด', d: 'เจอเคสใหม่ (XML ใบขนรวมหลายฟิลด์เป็นช่องเดียว) จึงถามว่าควรทำยังไง ได้กฎชนิดที่ 2 "ต่อข้อความ" แล้วรวมเป็น drawer เดียวที่มี 2 ชนิด' },
  { n: 7, t: 'ปิดงานทีละก้อน', d: 'แต่ละการเปลี่ยนแปลงจบด้วย "commit & push" และอัปเดตเอกสารส่งต่อทีม dev' }
];

const LESSONS = [
  { t: 'พรีวิวไม่อัปเดต → รีโหลดก่อนสรุปว่าโค้ดผิด', d: 'dev server บางครั้งส่งโค้ดเก่า ถ้าหน้าจอไม่ตรงกับที่แก้ ให้รีโหลดและตรวจซ้ำ' },
  { t: 'ล็อกพอร์ต dev server', d: 'พอร์ตชนกับแอปอื่น ทำให้พรีวิวเปิดผิดแอป โปรเจกต์นี้ล็อกที่ 3417 พร้อม strictPort' },
  { t: 'ฟิลด์ชื่อซ้ำใน item หลายตัว', d: 'การแก้ค่า/ยืนยันค่าที่อิงแค่ชื่อฟิลด์จะกระทบทุก item ให้ระบุ item ด้วยเสมอ' },
  { t: 'เดโมที่ดูเหมือนทำงานจริง ≠ ทำงานจริง', d: 'ถ้าฟีเจอร์ยังไม่ต่อกับข้อมูลจริง ให้บอกชัดในสรุปและในเอกสาร จะได้ไม่เข้าใจผิด' },
  { t: 'ตัดสินใจกลับได้ ถ้า commit เล็ก', d: 'เปลี่ยนใจได้เสมอ (เช่น ย้อนกลับให้เลือก key field เอง) เพราะแต่ละก้อนแยกกัน' },
  { t: 'อย่าให้ Claude เลือกแทนในเรื่อง UX ที่คลุมเครือ', d: 'ให้เสนอทางเลือก + แนะนำ แล้วคนตัดสิน ได้ผลลัพธ์ที่ตรงใจกว่าและเรียนรู้เหตุผลไปด้วย' }
];

const HANDOFF_ITEMS = [
  { f: 'prototype/', d: 'React + Vite เป็นแหล่งอ้างอิงภาพและพฤติกรรม ไม่ได้ส่งมอบ' },
  { f: 'docs/HANDOFF.md', d: 'ตารางว่าอะไรพอร์ตแล้ว อะไรยังไม่พอร์ต และฟีเจอร์ใหม่ล่าสุดของแต่ละส่วน' },
  { f: 'docs/DATA_MODELS.md', d: 'รูปแบบข้อมูลที่ฟีเจอร์ใช้ (เช่น เซลล์กฎ VALUE_GROUPS)' },
  { f: 'Angular app (root)', d: 'ของจริงที่ทีม dev สร้าง พอร์ตทีละฟีเจอร์ตามแผนใน MIGRATION_PLAN.md' }
];

const useCopy = () => {
  const [copied, setCopied] = useState<string | null>(null);
  const copy = async (key: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(key);
      setTimeout(() => setCopied(null), 1500);
    } catch {
      // clipboard unavailable — ignore
    }
  };
  return { copied, copy };
};

const SectionTitle: React.FC<{ id: string; icon: React.ElementType; title: string; subtitle?: string }> = ({ id, icon: Icon, title, subtitle }) => (
  <div id={id} className="scroll-mt-24 flex items-start gap-3 mb-6">
    <div className="w-10 h-10 rounded-xl bg-blue-50 text-[#1f5df9] flex items-center justify-center shrink-0 border border-blue-100">
      <Icon size={18} />
    </div>
    <div>
      <h2 className="text-xl font-black tracking-tight" style={{ color: NAVY }}>{title}</h2>
      {subtitle && <p className="text-sm text-slate-500 font-medium mt-1 leading-relaxed">{subtitle}</p>}
    </div>
  </div>
);

export const DesignProcessPage: React.FC = () => {
  const { copied, copy } = useCopy();

  useEffect(() => {
    const previous = document.title;
    document.title = 'Design Process — BizX';
    return () => { document.title = previous; };
  }, []);

  // Menu links are plain #anchors; smooth-scroll to them (unless the visitor prefers reduced
  // motion). Scoped to this page so it doesn't leak into the app.
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const root = document.documentElement;
    const previous = root.style.scrollBehavior;
    root.style.scrollBehavior = 'smooth';
    return () => { root.style.scrollBehavior = previous; };
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-700 font-sans">
      <header className="sticky top-0 z-40 bg-white/90 backdrop-blur border-b border-slate-200">
        <div className="max-w-5xl mx-auto px-5 py-3 flex items-center gap-4">
          <div className="flex items-center gap-2 shrink-0">
            <img src="/logo-bizx-mark.svg" alt="BizX" className="w-6 h-6" />
            <span className="font-black text-sm" style={{ color: NAVY }}>Design Process</span>
          </div>
          <nav className="flex items-center gap-1 overflow-x-auto text-[12px] font-bold">
            {SECTIONS.map(section => (
              <a
                key={section.id}
                href={`#${section.id}`}
                className="px-2.5 py-1 rounded-[4px] text-slate-500 hover:bg-blue-50 hover:text-[#1f5df9] whitespace-nowrap transition-colors"
              >
                {section.label}
              </a>
            ))}
          </nav>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-5 py-10 flex flex-col gap-14">
        {/* Hero */}
        <section className="rounded-2xl bg-white border border-slate-200 p-8 shadow-sm">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-50 text-[#1f5df9] text-[11px] font-black border border-blue-100">
            <Sparkles size={12} /> Vibe design with Claude
          </div>
          <h1 className="text-3xl font-black tracking-tight mt-4 leading-tight" style={{ color: NAVY }}>
            ออกแบบ BizX ด้วยการ "vibe code" ร่วมกับ Claude
          </h1>
          <p className="text-base text-slate-600 font-medium mt-3 leading-relaxed max-w-3xl">
            แทนที่จะวาดหน้าจอนิ่งๆ แล้วส่งต่อ เราสร้าง prototype ที่ใช้งานได้จริงในเบราว์เซอร์ แล้วปรับไปพร้อมกับ Claude
            ทีละก้อนเล็กๆ โดยคนเป็นคนตัดสินใจเรื่อง UX ส่วน Claude ลงมือเขียนโค้ด ทดสอบ และอัปเดตเอกสาร
            หน้านี้สรุปวิธีทำงานที่เราใช้อยู่จริง พร้อมตัวอย่างจากโปรเจกต์นี้
          </p>
          <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-3">
            {[
              { k: 'เร็ว', v: 'จากไอเดียถึงหน้าจอที่คลิกได้ในรอบเดียว' },
              { k: 'เห็นของจริง', v: 'รีวิวจากพฤติกรรมจริง ไม่ใช่ภาพนิ่ง' },
              { k: 'ย้อนกลับง่าย', v: '1 การตัดสินใจ = 1 commit' }
            ].map(item => (
              <div key={item.k} className="rounded-xl border border-slate-200 bg-slate-50/70 p-4">
                <div className="text-sm font-black text-[#1f5df9]">{item.k}</div>
                <div className="text-[13px] font-medium text-slate-600 mt-1 leading-snug">{item.v}</div>
              </div>
            ))}
          </div>
        </section>

        {/* Principles */}
        <section>
          <SectionTitle id="principles" icon={BookOpen} title="หลักคิด" subtitle="5 ข้อที่ทำให้วิธีนี้ได้ผล" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              { t: 'Prototype คือเครื่องมือคิด', d: 'ใช้เพื่อหาคำตอบเรื่อง UX ไม่ใช่ของที่ส่งมอบ จึงเปลี่ยนได้เร็วและทิ้งได้โดยไม่เสียดาย' },
              { t: 'คนตัดสิน Claude ทำ', d: 'เรื่องที่เป็นการเลือก (หน้าตา คำพูด ขอบเขต) คนเป็นคนเลือก Claude เสนอทางเลือกและเหตุผล' },
              { t: 'ก้อนเล็ก ตรวจทุกครั้ง', d: 'ทำทีละเรื่อง เปิดดูในเบราว์เซอร์ทุกครั้ง ไม่สะสมการเปลี่ยนแปลงใหญ่แล้วค่อยดู' },
              { t: 'ชี้แทนการอธิบาย', d: 'ภาพ + element ที่เลือกบอกตำแหน่งได้แม่นกว่าคำอธิบายยาวๆ และกำจัดการเดา' },
              { t: 'ปิดงานด้วยคำสั่งของคน', d: 'commit เกิดหลังรีวิวและสั่งเท่านั้น ประวัติงานจึงคือรายการสิ่งที่คนอนุมัติแล้ว' }
            ].map((item, i) => (
              <div key={item.t} className="rounded-xl bg-white border border-slate-200 p-5 shadow-sm">
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-[#1f5df9] text-white text-[11px] font-black flex items-center justify-center">{i + 1}</span>
                  <h3 className="font-black text-[15px]" style={{ color: NAVY }}>{item.t}</h3>
                </div>
                <p className="text-sm text-slate-600 font-medium mt-2 leading-relaxed">{item.d}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Loop */}
        <section>
          <SectionTitle id="loop" icon={Layers} title="วงจรทำงาน 6 ขั้น" subtitle="วนซ้ำได้ ถ้าตรวจแล้วยังไม่ตรงใจ ให้ย้อนไปขั้น 2 ชี้จุดใหม่" />

          {/* Swimlane of the loop — drawn with the diagram-design skill (profile "bizx"); source of
              truth is docs/diagrams/design-loop.html, the SVG here is extracted from it. */}
          <figure className="mb-8 rounded-xl bg-white border border-slate-200 p-4 shadow-sm">
            <div
              className="w-full overflow-x-auto [&_svg]:block [&_svg]:w-full [&_svg]:min-w-[960px]"
              dangerouslySetInnerHTML={{ __html: designLoopSvg }}
            />
            <figcaption className="mt-3 text-[12px] font-medium text-slate-400 leading-relaxed">
              ใครทำอะไรในแต่ละขั้น เลขในกล่องคือขั้นที่ตรงกับการ์ดด้านล่าง · ต้นฉบับ <code className="font-mono">docs/diagrams/design-loop.html</code>
            </figcaption>
          </figure>

          <ol className="relative flex flex-col gap-4">
            {LOOP_STEPS.map((step, i) => {
              const Icon = step.icon;
              return (
                <li key={step.title} className="relative flex gap-4">
                  <div className="flex flex-col items-center">
                    <div className="w-11 h-11 rounded-xl bg-white border border-blue-200 text-[#1f5df9] flex items-center justify-center shadow-sm shrink-0">
                      <Icon size={20} />
                    </div>
                    {i < LOOP_STEPS.length - 1 && <div className="w-px flex-1 bg-blue-200 mt-1" />}
                  </div>
                  <div className="flex-1 rounded-xl bg-white border border-slate-200 p-5 shadow-sm mb-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-[11px] font-black text-slate-400 tracking-widest">ขั้นที่ {i + 1}</span>
                      <h3 className="font-black text-base" style={{ color: NAVY }}>{step.title}</h3>
                      <span className="text-[11px] font-bold text-slate-400">{step.en}</span>
                      <span className="ml-auto px-2 py-0.5 rounded-full bg-blue-50 text-[#1f5df9] border border-blue-100 text-[10px] font-black">{step.who}</span>
                    </div>
                    <p className="text-sm text-slate-600 font-medium mt-2 leading-relaxed">{step.body}</p>
                    <div className="mt-3 flex items-start gap-2 text-[12px] font-bold text-slate-500">
                      <ArrowRight size={13} className="mt-0.5 text-[#1f5df9] shrink-0" />
                      <span>ได้ผลลัพธ์: {step.output}</span>
                    </div>
                  </div>
                </li>
              );
            })}
          </ol>
        </section>

        {/* Prompts */}
        <section>
          <SectionTitle id="prompts" icon={MessagesSquare} title="วิธีสั่งงานให้ได้ผล" subtitle="ตัวอย่างประโยคที่ใช้จริงในโปรเจกต์นี้ กดคัดลอกไปปรับใช้ได้" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {PROMPT_PATTERNS.map(item => (
              <div key={item.prompt} className="rounded-xl bg-white border border-slate-200 p-5 shadow-sm flex flex-col gap-3">
                <div className="text-[11px] font-black text-slate-400 tracking-widest uppercase">{item.when}</div>
                <div className="relative rounded-lg bg-slate-900 text-slate-100 text-[13px] font-mono leading-relaxed p-3 pr-10">
                  {item.prompt}
                  <button
                    onClick={() => copy(item.prompt, item.prompt)}
                    className="absolute top-2 right-2 p-1.5 rounded-[4px] text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                    title="คัดลอก"
                  >
                    {copied === item.prompt ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
                  </button>
                </div>
                <p className="text-[13px] text-slate-600 font-medium leading-relaxed flex gap-2">
                  <Lightbulb size={14} className="text-amber-500 shrink-0 mt-0.5" />
                  <span>{item.tip}</span>
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* Roles */}
        <section>
          <SectionTitle id="roles" icon={Users} title="บทบาท: ใครทำอะไร" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {ROLES.map(role => (
              <div key={role.who} className="rounded-xl bg-white border border-slate-200 p-5 shadow-sm">
                <h3 className="font-black text-base" style={{ color: NAVY }}>{role.who}</h3>
                <ul className="mt-3 flex flex-col gap-2">
                  {role.does.map(line => (
                    <li key={line} className="flex items-start gap-2 text-sm font-medium text-slate-600">
                      <Check size={14} className="text-emerald-500 mt-0.5 shrink-0" />
                      <span>{line}</span>
                    </li>
                  ))}
                </ul>
                <p className="mt-4 text-[12px] font-bold text-slate-500 bg-slate-50 border border-slate-200 rounded-lg p-3 leading-relaxed">{role.not}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Mock data */}
        <section>
          <SectionTitle id="mock" icon={Layers} title="ออกแบบ mock data" subtitle="ข้อมูลตัวอย่างที่ดีทำให้รีวิว UX ได้ครบ" />
          <div className="rounded-xl bg-white border border-slate-200 shadow-sm divide-y divide-slate-100">
            {MOCK_RULES.map(rule => (
              <div key={rule.t} className="p-5">
                <h3 className="font-black text-[15px]" style={{ color: NAVY }}>{rule.t}</h3>
                <p className="text-sm text-slate-600 font-medium mt-1 leading-relaxed">{rule.d}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Copy */}
        <section>
          <SectionTitle id="copy" icon={BookOpen} title="ภาษาในหน้าจอ (UX writing)" subtitle="ผู้ใช้ส่วนใหญ่ไม่ใช่สายเทคนิค ภาษาไทยต้องเข้าใจง่ายและไม่เป็นทางการเกินไป" />
          <div className="flex flex-col gap-3">
            {COPY_RULES.map(rule => (
              <div key={rule.t} className="rounded-xl bg-white border border-slate-200 p-5 shadow-sm">
                <h3 className="font-black text-[15px]" style={{ color: NAVY }}>{rule.t}</h3>
                <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3 text-[13px] font-medium">
                  <div className="rounded-lg bg-rose-50 border border-rose-100 p-3 text-rose-700">
                    <div className="text-[10px] font-black tracking-widest uppercase mb-1">แทนที่จะเขียน</div>
                    {rule.bad}
                  </div>
                  <div className="rounded-lg bg-emerald-50 border border-emerald-100 p-3 text-emerald-700">
                    <div className="text-[10px] font-black tracking-widest uppercase mb-1">ให้เขียน</div>
                    {rule.good}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Gates */}
        <section>
          <SectionTitle id="gates" icon={ListChecks} title="เช็กลิสต์ก่อนปิดงาน" subtitle="ใช้ทุกครั้งก่อนพิมพ์ commit & push" />
          <div className="rounded-xl bg-white border border-slate-200 p-5 shadow-sm">
            <ul className="flex flex-col gap-3">
              {GATES.map(gate => (
                <li key={gate} className="flex items-start gap-3 text-sm font-medium text-slate-700">
                  <span className="mt-0.5 w-4 h-4 rounded border-2 border-[#1f5df9] shrink-0" />
                  <span>{gate}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* Case study */}
        <section>
          <SectionTitle id="case" icon={GitCommitHorizontal} title="ตัวอย่างจริง: กฎจับคู่ฟิลด์" subtitle="จากโจทย์เดียวสู่ฟีเจอร์ที่ใช้งานได้ ภายในไม่กี่รอบ" />
          <ol className="flex flex-col gap-3">
            {CASE_STEPS.map(step => (
              <li key={step.n} className="flex gap-4 rounded-xl bg-white border border-slate-200 p-5 shadow-sm">
                <span className="w-8 h-8 rounded-full bg-[#1f5df9] text-white text-sm font-black flex items-center justify-center shrink-0">{step.n}</span>
                <div>
                  <h3 className="font-black text-[15px]" style={{ color: NAVY }}>{step.t}</h3>
                  <p className="text-sm text-slate-600 font-medium mt-1 leading-relaxed">{step.d}</p>
                </div>
              </li>
            ))}
          </ol>
        </section>

        {/* Handoff */}
        <section>
          <SectionTitle id="handoff" icon={ArrowRight} title="ส่งต่อทีม dev" subtitle="prototype ไม่ได้ส่งมอบ แต่เป็นเอกสารที่มีชีวิตให้ทีม dev ดูภาพและพฤติกรรม" />

          {/* Swimlane of the handoff route — drawn with the diagram-design skill (profile "bizx");
              source of truth is docs/diagrams/dev-handoff.html. */}
          <figure className="mb-6 rounded-xl bg-white border border-slate-200 p-4 shadow-sm">
            <div
              className="w-full overflow-x-auto [&_svg]:block [&_svg]:w-full [&_svg]:min-w-[960px]"
              dangerouslySetInnerHTML={{ __html: devHandoffSvg }}
            />
            <figcaption className="mt-3 text-[12px] font-medium text-slate-400 leading-relaxed">
              จาก prototype ถึง Angular ทีละฟีเจอร์ · ฉากเดโมไม่ต้องพอร์ต · ต้นฉบับ <code className="font-mono">docs/diagrams/dev-handoff.html</code>
            </figcaption>
          </figure>

          <div className="rounded-xl bg-white border border-slate-200 shadow-sm divide-y divide-slate-100">
            {HANDOFF_ITEMS.map(item => (
              <div key={item.f} className="p-5 flex flex-col md:flex-row md:items-baseline gap-1 md:gap-4">
                <code className="font-mono text-[12px] font-bold text-[#1f5df9] bg-blue-50 border border-blue-100 rounded px-2 py-0.5 w-fit shrink-0 md:w-52">{item.f}</code>
                <span className="text-sm text-slate-600 font-medium leading-relaxed">{item.d}</span>
              </div>
            ))}
          </div>
        </section>

        {/* Lessons */}
        <section>
          <SectionTitle id="lessons" icon={AlertTriangle} title="ข้อควรระวังที่เจอจริง" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {LESSONS.map(lesson => (
              <div key={lesson.t} className="rounded-xl bg-amber-50/60 border border-amber-200 p-5">
                <h3 className="font-black text-[15px] text-amber-900">{lesson.t}</h3>
                <p className="text-sm text-amber-900/80 font-medium mt-1 leading-relaxed">{lesson.d}</p>
              </div>
            ))}
          </div>
        </section>

        <footer className="text-center text-[12px] font-bold text-slate-400 pb-6">
          BizX Design Process · หน้านี้ไม่มีเมนูในแอป เข้าได้ที่ <code className="font-mono">/design-process</code> เท่านั้น
        </footer>
      </main>
    </div>
  );
};
