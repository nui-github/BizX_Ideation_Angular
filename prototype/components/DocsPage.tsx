import React, { useEffect, useState } from 'react';
import systemFlowSvg from './docs/data-comparison-flow.svg?raw';
import jobStatusSvg from './docs/job-status.svg?raw';
import docStatusSvg from './docs/doc-status.svg?raw';
import userFlowSvg from './docs/user-flow.svg?raw';
import { DiagramFigure } from './design-process/DiagramFigure';
import { Workflow, MousePointerClick, ArrowLeftRight, ChevronRight, Info } from 'lucide-react';

// Standalone page, served at /docs (see index.tsx). Like /design-process it is not linked from the
// app's menu — open the URL directly. It holds the system documentation for Data Comparison as sub-pages
// (hash routes): the system flow for dev / QA and the screen-by-screen user flow. Diagrams are drawn with
// the diagram-design skill (profile "bizx"); sources live in docs/diagrams/*.html and the SVGs here are
// extracted from them with docs/diagrams/extract-svgs.py.

const NAVY = '#010136';

type PageId = 'system-flow' | 'user-flow';

const GROUP = 'Data Comparison';
const PAGES: { id: PageId; label: string; hint: string; icon: React.ElementType; title: string }[] = [
  { id: 'system-flow', label: 'Flow ของระบบ', hint: 'สำหรับ Dev / QA', icon: Workflow, title: 'Flow ของระบบ Data Comparison' },
  { id: 'user-flow', label: 'User flow', hint: 'Shipment → ปิดงาน', icon: MousePointerClick, title: 'User flow: Shipment → ปิดงาน' }
];

const pageFromHash = (): PageId => (window.location.hash.replace('#', '') === 'user-flow' ? 'user-flow' : 'system-flow');

// ---- content -------------------------------------------------------------------------------------

const FLOW_STEPS = [
  { n: 1, who: 'ผู้ใช้งาน', title: 'สร้าง Shipment', body: 'กด "สร้างรายการใหม่" เลือก Preset ของทีม (ล็อกลำดับงานย่อยไว้แล้ว) แล้วตั้งชื่อ Shipment อย่างเดียว หรือกำหนดงานย่อยเอง' },
  { n: 2, who: 'ระบบ', title: 'สร้างงานย่อยตามลำดับ', body: 'งานแรกเปิดเป็น "รอดำเนินการ" งานที่ 2 ขึ้นไปแสดง "ยังเริ่มไม่ได้" และกดเข้าไม่ได้จนงานก่อนหน้าทุกงานเสร็จสมบูรณ์' },
  { n: 3, who: 'ผู้ใช้งาน', title: 'อัปโหลดไฟล์', body: 'อัปโหลดต่อคอลัมน์เอกสารในหน้าเปรียบเทียบ (Replace & Merge) เลือกหน้าที่จะอ่านและ Template ได้ ติ๊ก "เริ่ม OCR ทันที" ไว้ เอกสารเป็น RECEIVED และงานถูกมอบให้ผู้ใช้ที่ลงมือก่อน' },
  { n: 4, who: 'ระบบ', title: 'อ่านไฟล์ (OCR)', body: 'เอกสารเป็น EXTRACTING ราว 5 วินาที แล้วเป็น OCR_DONE ระหว่างนี้งานแสดง "กำลังเปรียบเทียบข้อมูล"' },
  { n: 5, who: 'ระบบ', title: 'เปรียบเทียบตามกฎ', body: 'เมื่ออ่านเสร็จอย่างน้อย 2 ไฟล์และไม่มีไฟล์ค้างอ่าน ระบบเทียบให้เองใช้เวลา 3–5 วินาที ตามกฎใน Rule Matrix ต่อฟิลด์ ตรงครบกลับเป็น "รอดำเนินการ" ถ้ามีฟิลด์ไม่ตรงเป็น "รอตรวจสอบ"' },
  { n: 6, who: 'ผู้ใช้งาน', title: 'ตรวจสอบและแก้ไข', body: 'แก้ค่าที่ OCR อ่านมา กด "ยืนยันใช้ค่านี้" ตั้งข้ามการเปรียบเทียบบางฟิลด์ หรืออัปโหลดไฟล์ที่ถูกต้องมาแทน (วนกลับไปอ่านใหม่)' },
  { n: 7, who: 'ผู้ใช้งาน', title: 'กด "เสร็จสิ้น"', body: 'กดได้เมื่อเอกสารที่มีไฟล์ตรงครบ (คอลัมน์ที่ยังไม่อัปโหลดไม่บล็อก) แล้วยืนยันในหน้าต่าง งานเป็น READY และปุ่มทั้งหมดของงานเป็นอ่านอย่างเดียว' },
  { n: 8, who: 'ระบบ', title: 'ปลดล็อกงานถัดไป', body: 'ย้ายไปงานถัดไปให้เอง พาเอกสารที่ใช้ซ้ำมาด้วย (ตรงแล้วคงเป็น MATCHED ที่เหลือกลับไปเทียบใหม่) และพาคอมเมนต์ไปด้วย ถ้าเป็นงานสุดท้ายก็ปิด Shipment' }
];

const JOB_STATUSES = [
  { code: '(คำนวณจากลำดับ)', th: 'ยังเริ่มไม่ได้', body: 'ไม่ใช่ค่าใน JobStatus แสดงเมื่อมีงานก่อนหน้าในลำดับที่ยังไม่ READY ปุ่มเปิดงานปิดอยู่' },
  { code: 'PENDING', th: 'รอดำเนินการ', body: 'งานที่เพิ่งเปิด หรือเทียบแล้วตรงครบแต่ยังไม่กด "เสร็จสิ้น" เป็นค่าที่คำนวณจากสถานะเอกสาร' },
  { code: 'PROCESSING', th: 'กำลังเปรียบเทียบข้อมูล', body: 'ตั้งแต่เริ่มอ่านไฟล์ (มีเอกสาร EXTRACTING) จนระบบเทียบเสร็จ' },
  { code: 'REVIEW', th: 'รอตรวจสอบ', body: 'ยังมีเอกสาร MISMATCHED เหลือ ต้องแก้ ยืนยัน หรือข้ามฟิลด์ให้ครบ' },
  { code: 'READY', th: 'เสร็จสมบูรณ์', body: 'ตั้งได้ทางเดียวคือกด "เสร็จสิ้น" แล้วยืนยัน ตรงครบอย่างเดียวยังไม่พอ' },
  { code: 'REJECTED', th: 'ถูกตีกลับ', body: 'งานถัดไปกดตีกลับพร้อมเหตุผล ปุ่ม "เสร็จสิ้น" ถูกปิดไว้ และงานหลังจากนั้นกลับเป็น "ยังเริ่มไม่ได้" ออกจากสถานะนี้เมื่ออัปโหลดไฟล์ใหม่แล้วระบบอ่านและเทียบซ้ำ ผลเป็น "รอดำเนินการ" หรือ "รอตรวจสอบ"' },
  { code: 'NEW', th: '(ใช้ภายใน)', body: 'ค่าเริ่มต้นตอนสร้างงาน หน้าจอแสดงเป็น PENDING เพราะคำนวณจากเอกสาร' }
];

const DOC_STATUSES = [
  { code: 'MISSING', th: 'ยังไม่มีไฟล์', body: 'คอลัมน์ยังไม่ถูกอัปโหลด ไม่บล็อกปุ่ม "เสร็จสิ้น"' },
  { code: 'RECEIVED', th: 'อัปโหลดแล้ว', body: 'รอกด "อ่านไฟล์" (หรือเริ่มเองถ้าติ๊ก OCR ทันที)' },
  { code: 'EXTRACTING', th: 'กำลังสกัดข้อมูล', body: 'OCR กำลังอ่าน ราว 5 วินาที' },
  { code: 'OCR_DONE', th: 'สกัดข้อมูลเสร็จ', body: 'รอเปรียบเทียบ เริ่มเองเมื่อมีอย่างน้อย 2 ไฟล์ที่อ่านเสร็จ' },
  { code: 'MATCHED', th: 'ตรงกัน', body: 'ข้อมูลตรงตามกฎ รวมถึงกรณีที่ผู้ใช้แก้ ยืนยัน หรือข้ามฟิลด์ที่ไม่ตรงครบแล้ว' },
  { code: 'MISMATCHED', th: 'ไม่ตรงกัน', body: 'ยังมีฟิลด์ที่ไม่ตรงและยังไม่ถูกจัดการ' },
  { code: 'LOCKED', th: 'ล็อก', body: 'พบในข้อมูลตัวอย่างของงานที่เสร็จแล้ว ยังไม่มีขั้นตอนไหนตั้งค่านี้' },
  { code: 'ERROR / SKIPPED', th: 'ผิดพลาด / ข้าม', body: 'มีในชนิดข้อมูลและการแสดงผล แต่ flow ปัจจุบันยังไม่ตั้งค่าให้' }
];

const COMPARE_METHODS = [
  { code: 'EXACT', th: 'ตรงกัน', body: 'ตรงกันทุกตัวอักษร (ตัดช่องว่าง ไม่สนตัวพิมพ์เล็กใหญ่)' },
  { code: 'FUZZY', th: 'ใกล้เคียงกัน', body: 'วัดความคล้ายเป็นเปอร์เซ็นต์ ตั้งเกณฑ์ผ่านได้ 0–100' },
  { code: 'BILINGUAL', th: 'Bilingual', body: 'ให้ AI แปลความหมายก่อนเทียบ ข้ามภาษาได้' },
  { code: 'NUMBER_WORD', th: 'ตัวเลข / คำอ่าน', body: 'แปลงเป็นตัวเลขก่อนเทียบ รองรับเลขไทยและเครื่องหมายจุลภาค' },
  { code: 'EXISTENCE', th: 'ความมีอยู่', body: 'เช็กว่ามีข้อมูลหรือไม่ ไม่เทียบค่า' },
  { code: 'MASTER_LOOKUP', th: 'Master lookup', body: 'ตรวจความถูกต้องกับฐานข้อมูลหลัก (ลูกค้า สินค้า ผู้ขาย สกุลเงิน)' },
  { code: 'CONDITIONAL', th: 'ตามเงื่อนไข', body: 'เลือกวิธีเทียบตามค่าของฟิลด์อื่นก่อน' },
  { code: 'VALUE_GROUPS', th: 'เทียบตามกลุ่มค่า', body: 'ถ้าฟิลด์ในเอกสารอ้างอิงอยู่ในกลุ่มค่าหนึ่ง ฟิลด์ที่ตรวจต้องอยู่ในอีกกลุ่มที่กำหนด มีหลายเงื่อนไขและทางสำรอง' },
  { code: 'ITEM_MATCH', th: 'จับคู่รายการตามชื่อ', body: 'จับคู่แถวของเอกสารที่รวมรายการ (เช่น Form FTA) เข้ากับรายการของเอกสารอ้างอิงด้วยชื่อ แล้วเทียบทีละรายการ' },
  { code: 'DATE_NORMALIZATION', th: 'ปรับรูปแบบวันที่', body: 'ปรับ พ.ศ. / ค.ศ. และรูปแบบวันที่ให้ตรงกันก่อนเทียบ' },
  { code: 'NONE', th: 'ไม่ต้องเปรียบเทียบ', body: 'ข้ามฟิลด์นี้ในกฎ' }
];

const RULES = [
  'งานที่ N ใช้ได้ก็ต่อเมื่องานที่ 1 ถึง N-1 ทุกงานเป็น READY งานที่ถูกตีกลับจึงล็อกงานหลังจากนั้นอีกครั้งทันที',
  'ปุ่ม "เสร็จสิ้น" เปิดเมื่อเอกสารที่มีไฟล์ทุกคอลัมน์เป็น MATCHED หรือ LOCKED (คอลัมน์ที่ไม่มีไฟล์ไม่นับ) และงานนั้นยังไม่ READY หรือ REJECTED',
  'เทียบอัตโนมัติเมื่อมีเอกสารที่อ่านเสร็จอย่างน้อย 2 ไฟล์และไม่มีไฟล์ค้างอ่าน (ทั้งหลังกดอ่านไฟล์ และหลังพาเอกสารไปงานถัดไป)',
  'ตีกลับได้เฉพาะงานที่ 2 ขึ้นไป และตีกลับได้ครั้งละหนึ่งขั้น คือส่งงานก่อนหน้ากลับมาแก้ ต้องระบุเหตุผล',
  'การลงมือครั้งแรกในงาน (อัปโหลด อ่านไฟล์ แก้ค่า ยืนยัน) มอบงานให้ผู้ใช้คนนั้นเป็นผู้รับผิดชอบล่าสุดอัตโนมัติ',
  'สถานะงานที่เห็นในรายการคือ getJobStatus() ซึ่งคำนวณจากสถานะเอกสาร ยกเว้น READY และ REJECTED ที่คงค่าที่ตั้งไว้'
];

const USER_STEPS = [
  { n: 1, you: 'เปิดรายการงาน กด "สร้างรายการใหม่"', sys: 'แสดงทุก Shipment พร้อมการ์ดสรุป กดการ์ดเพื่อกรองตาราง' },
  { n: 2, you: 'ตั้งชื่อ Shipment (เลือก Preset ถ้ามีหลายชุด)', sys: 'ดึงลำดับงานย่อยจาก Preset ให้ แก้ไม่ได้เมื่อใช้ Preset' },
  { n: 3, you: 'กด "ดูงานย่อย" แล้วเปิดงานแรก', sys: 'งานที่ 2 ขึ้นไปแสดง "ยังเริ่มไม่ได้" จนงานก่อนหน้าเสร็จ' },
  { n: 4, you: 'อยู่ที่หน้าเปรียบเทียบ ตารางยังว่าง', sys: 'แสดงคอลัมน์เอกสารที่งานนี้ต้องใช้ พร้อมปุ่มอัปโหลดต่อคอลัมน์' },
  { n: 5, you: 'อัปโหลดไฟล์ในหน้าต่าง Replace & Merge', sys: 'เลือก Template ให้ตามความเหมือน เริ่ม OCR ทันทีถ้าติ๊กไว้' },
  { n: 6, you: 'รอ', sys: 'อ่านไฟล์ราว 5 วินาที แล้วเทียบอัตโนมัติเมื่อมีอย่างน้อย 2 ไฟล์' },
  { n: 7, you: 'ถ้ามีฟิลด์ไม่ตรง ตรวจและจัดการทีละฟิลด์', sys: 'สถานะ "รอตรวจสอบ" ฟิลด์ไม่ตรงถูกเน้นสีแดง' },
  { n: 8, you: 'เมื่อตรงครบ กด "เสร็จสิ้น"', sys: 'เปิดปุ่มให้กดเมื่อทุกไฟล์ที่มีตรงกัน' },
  { n: 9, you: 'ยืนยันในหน้าต่าง', sys: 'งานเป็น "เสร็จสมบูรณ์" และพาไปงานถัดไป' },
  { n: 10, you: 'ทำงานถัดไปต่อ', sys: 'พาไฟล์ที่ใช้ซ้ำและคอมเมนต์มาให้ ทำซ้ำตั้งแต่ขั้น 4' },
  { n: 11, you: 'ถ้าพบว่างานก่อนหน้ายังผิด กดปุ่มตีกลับ ใส่เหตุผล', sys: 'งานก่อนหน้าเป็น "ถูกตีกลับ" งานหลังจากนั้นล็อกอีกครั้ง' }
];

// ---- small building blocks ---------------------------------------------------------------------

const Hero: React.FC<{ eyebrow: string; title: string; lead: string; sources: string[] }> = ({ eyebrow, title, lead, sources }) => (
  <section className="rounded-2xl bg-white border border-slate-200 p-8 shadow-sm">
    <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-50 text-[#1f5df9] text-[11px] font-black border border-blue-100">
      <Info size={12} /> {eyebrow}
    </div>
    <h1 className="text-3xl font-black tracking-tight mt-4 leading-tight" style={{ color: NAVY }}>{title}</h1>
    <p className="text-base text-slate-600 font-medium mt-3 leading-relaxed max-w-3xl">{lead}</p>
    <div className="flex flex-wrap gap-2 mt-5">
      {sources.map(s => (
        <code key={s} className="px-2 py-1 rounded-[6px] bg-slate-100 border border-slate-200 text-[11px] font-mono text-slate-500">{s}</code>
      ))}
    </div>
  </section>
);

const SectionTitle: React.FC<{ title: string; subtitle?: string }> = ({ title, subtitle }) => (
  <div className="mb-5">
    <h2 className="text-xl font-black tracking-tight" style={{ color: NAVY }}>{title}</h2>
    {subtitle && <p className="text-sm text-slate-500 font-medium mt-1 leading-relaxed max-w-3xl">{subtitle}</p>}
  </div>
);

const GlossaryTable: React.FC<{ rows: { code: string; th: string; body: string }[] }> = ({ rows }) => (
  <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
    <table className="w-full text-left text-[13px]">
      <thead>
        <tr className="bg-slate-50 text-[11px] font-black uppercase tracking-wider text-slate-400">
          <th className="px-4 py-2.5 w-[210px]">ค่า (enum)</th>
          <th className="px-4 py-2.5 w-[200px]">ที่หน้าจอ</th>
          <th className="px-4 py-2.5">ความหมาย</th>
        </tr>
      </thead>
      <tbody>
        {rows.map(r => (
          <tr key={r.code} className="border-t border-slate-100 align-top">
            <td className="px-4 py-2.5"><code className="font-mono text-[12px] font-bold text-[#1f5df9]">{r.code}</code></td>
            <td className="px-4 py-2.5 font-bold" style={{ color: NAVY }}>{r.th}</td>
            <td className="px-4 py-2.5 text-slate-600 font-medium leading-relaxed">{r.body}</td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

// ---- sub-pages ---------------------------------------------------------------------------------

const SystemFlowPage: React.FC = () => (
  <>
    <Hero
      eyebrow="Data Comparison · สำหรับ Dev / QA"
      title="Flow ของระบบ Data Comparison"
      lead="ตั้งแต่สร้าง Shipment จนปิดงาน ใครทำอะไร สถานะของงานและของเอกสารเปลี่ยนตอนไหน และกติกาที่ต้องรู้เวลาเขียนเทสต์ อ้างอิงจากโค้ดที่ใช้งานจริงในแอป ไม่ใช่จากแบบร่าง"
      sources={['components/DataComparison.tsx', 'components/CreateJobModal.tsx', 'components/RuleMatrix.tsx', 'types.ts']}
    />

    <section>
      <SectionTitle title="เส้นทางของ Shipment" subtitle="แบ่งเป็น 3 เลน คือผู้ใช้งาน ระบบ (OCR และเปรียบเทียบ) และลำดับงานใน Shipment เส้นประคือเส้นทางวนกลับ" />
      <DiagramFigure svg={systemFlowSvg} className="mb-6">
        เลขในกล่องตรงกับตารางด้านล่าง · ต้นฉบับ <code className="font-mono">docs/diagrams/data-comparison-flow.html</code>
      </DiagramFigure>
      <ol className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {FLOW_STEPS.map(step => (
          <li key={step.n} className="rounded-xl border border-slate-200 bg-white p-4 flex gap-3">
            <span className="w-7 h-7 shrink-0 rounded-[6px] border border-slate-300 text-[12px] font-mono font-bold flex items-center justify-center" style={{ color: NAVY }}>{step.n}</span>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-black" style={{ color: NAVY }}>{step.title}</h3>
                <span className="text-[10px] font-black px-1.5 py-0.5 rounded bg-slate-100 text-slate-500">{step.who}</span>
              </div>
              <p className="text-[13px] text-slate-600 font-medium leading-relaxed mt-1">{step.body}</p>
            </div>
          </li>
        ))}
      </ol>
    </section>

    <section>
      <SectionTitle title="สถานะของงาน (Job status)" subtitle="งานย่อยหนึ่งงานเปลี่ยนสถานะตามผลการอ่านและเปรียบเทียบไฟล์" />
      <DiagramFigure svg={jobStatusSvg} className="mb-6">
        ต้นฉบับ <code className="font-mono">docs/diagrams/job-status.html</code>
      </DiagramFigure>
      <GlossaryTable rows={JOB_STATUSES} />
    </section>

    <section>
      <SectionTitle title="สถานะของเอกสาร (Document status)" subtitle="แต่ละคอลัมน์เอกสารในหน้าเปรียบเทียบมีสถานะของตัวเอง งานจะ REVIEW หรือ PENDING ตามสถานะของเอกสารรวมกัน" />
      <DiagramFigure svg={docStatusSvg} className="mb-6">
        ต้นฉบับ <code className="font-mono">docs/diagrams/doc-status.html</code>
      </DiagramFigure>
      <GlossaryTable rows={DOC_STATUSES} />
    </section>

    <section>
      <SectionTitle title="วิธีเปรียบเทียบใน Rule Matrix" subtitle="ตั้งต่อฟิลด์ในหน้า Compare rules ตรงกับตัวเลือกในแอปตอนนี้" />
      <GlossaryTable rows={COMPARE_METHODS} />
    </section>

    <section>
      <SectionTitle title="กติกาที่ต้องรู้เวลาเขียนเทสต์" />
      <ul className="rounded-xl border border-slate-200 bg-white divide-y divide-slate-100">
        {RULES.map(rule => (
          <li key={rule} className="px-4 py-3 flex gap-3 text-[13px] text-slate-600 font-medium leading-relaxed">
            <ChevronRight size={16} className="shrink-0 mt-0.5 text-[#1f5df9]" />
            <span>{rule}</span>
          </li>
        ))}
      </ul>
    </section>
  </>
);

const UserFlowPage: React.FC = () => (
  <>
    <Hero
      eyebrow="Data Comparison · ผู้ใช้งาน"
      title="User flow: Shipment → ปิดงาน"
      lead="ขั้นตอนที่ผู้ใช้ทำจริงในแอปทีละหน้าจอ ตั้งแต่สร้าง Shipment อัปโหลดไฟล์ ตรวจผลเปรียบเทียบ จนกดเสร็จสิ้นและส่งต่อไปงานถัดไป ภาพทุกภาพแคปจากแอปจริง"
      sources={['components/DataComparison.tsx', 'components/CreateJobModal.tsx']}
    />

    <section>
      <SectionTitle title="ภาพรวม 4 ช่วง" subtitle="อ่านจากซ้ายไปขวา แถวถัดไปกลับทิศ ตามเลขกำกับ กดปุ่มมุมขวาบนของภาพเพื่อดูแบบเต็มจอและซูม" />
      <DiagramFigure svg={userFlowSvg} className="mb-6">
        ต้นฉบับ <code className="font-mono">docs/diagrams/user-flow-shipment-export.html</code> · ภาพหน้าจอ <code className="font-mono">public/docs/shots/</code>
      </DiagramFigure>
    </section>

    <section>
      <SectionTitle title="รายละเอียดทีละขั้น" subtitle="เลขตรงกับภาพด้านบน บอกว่าผู้ใช้ทำอะไร และระบบตอบสนองอย่างไร" />
      <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
        <table className="w-full text-left text-[13px]">
          <thead>
            <tr className="bg-slate-50 text-[11px] font-black uppercase tracking-wider text-slate-400">
              <th className="px-4 py-2.5 w-14">#</th>
              <th className="px-4 py-2.5">ผู้ใช้ทำ</th>
              <th className="px-4 py-2.5">ระบบตอบสนอง</th>
            </tr>
          </thead>
          <tbody>
            {USER_STEPS.map(s => (
              <tr key={s.n} className="border-t border-slate-100 align-top">
                <td className="px-4 py-2.5 font-mono font-bold text-[#1f5df9]">{s.n}</td>
                <td className="px-4 py-2.5 font-bold" style={{ color: NAVY }}>{s.you}</td>
                <td className="px-4 py-2.5 text-slate-600 font-medium leading-relaxed">{s.sys}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  </>
);

// ---- page --------------------------------------------------------------------------------------

export const DocsPage: React.FC = () => {
  const [page, setPage] = useState<PageId>(pageFromHash);

  useEffect(() => {
    const onHash = () => { setPage(pageFromHash()); window.scrollTo({ top: 0 }); };
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  useEffect(() => {
    const previous = document.title;
    document.title = `${PAGES.find(p => p.id === page)?.title ?? 'Docs'} — BizX Docs`;
    return () => { document.title = previous; };
  }, [page]);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-700 font-sans">
      {/* Narrow screens: top bar. Desktop (lg+): fixed left menu below. */}
      <header className="lg:hidden sticky top-0 z-40 bg-white/90 backdrop-blur border-b border-slate-200">
        <div className="max-w-5xl mx-auto px-5 py-3 flex items-center gap-4">
          <div className="flex items-center gap-2 shrink-0">
            <img src="/logo-bizx-mark.svg" alt="BizX" className="w-6 h-6" />
            <span className="font-black text-sm" style={{ color: NAVY }}>Docs</span>
          </div>
          <nav className="flex items-center gap-1 overflow-x-auto text-[12px] font-bold" aria-label="เมนูเอกสาร">
            {PAGES.map(p => (
              <a
                key={p.id}
                href={`#${p.id}`}
                aria-current={page === p.id ? 'page' : undefined}
                className={`px-2.5 py-1 rounded-[4px] whitespace-nowrap transition-colors ${page === p.id ? 'bg-blue-50 text-[#1f5df9]' : 'text-slate-500 hover:bg-blue-50 hover:text-[#1f5df9]'}`}
              >
                {p.label}
              </a>
            ))}
          </nav>
        </div>
      </header>

      <div className="max-w-[1360px] mx-auto px-5 lg:flex lg:gap-10">
        <aside className="hidden lg:block w-60 shrink-0">
          <nav className="sticky top-0 h-screen overflow-y-auto py-10 flex flex-col gap-1" aria-label="เมนูเอกสาร">
            <div className="flex items-center gap-2 px-2 mb-5">
              <img src="/logo-bizx-mark.svg" alt="BizX" className="w-6 h-6" />
              <span className="font-black text-sm" style={{ color: NAVY }}>Docs</span>
            </div>
            <div className="px-3 mb-1 flex items-center gap-1.5 text-[11px] font-black uppercase tracking-wider text-slate-400">
              <ArrowLeftRight size={12} /> {GROUP}
            </div>
            {PAGES.map(p => {
              const active = page === p.id;
              const Icon = p.icon;
              return (
                <a
                  key={p.id}
                  href={`#${p.id}`}
                  aria-current={active ? 'page' : undefined}
                  className={`ml-3 px-3 py-2 rounded-[4px] border-l-2 transition-colors ${
                    active ? 'bg-blue-50 text-[#1f5df9] border-[#1f5df9]' : 'text-slate-500 border-slate-200 hover:bg-blue-50/60 hover:text-[#1f5df9]'
                  }`}
                >
                  <span className="flex items-center gap-2 text-[13px] font-bold"><Icon size={14} /> {p.label}</span>
                  <span className="block text-[11px] font-medium text-slate-400 mt-0.5 pl-[22px]">{p.hint}</span>
                </a>
              );
            })}
          </nav>
        </aside>

        <main className="flex-1 min-w-0 py-10 flex flex-col gap-12">
          {page === 'system-flow' ? <SystemFlowPage /> : <UserFlowPage />}
        </main>
      </div>
    </div>
  );
};
