import React, { useState, useEffect } from 'react';
import { Drawer, message } from 'antd';
import {
  AlertCircle, Plus, Trash2, ArrowRight, CheckCircle,
  User, Layers, HelpCircle, Briefcase, FileText,
  GripVertical, Link2, Link2Off, X, Sparkles
} from 'lucide-react';
import { ComparisonJob, JobStatus, Workflow, ComparisonDocStatus, JobPreset } from '../types';
import { MOCK_TEAMS } from '../mock-data/teams.mock';

interface CreateJobModalProps {
  visible: boolean;
  onClose: () => void;
  onCreate: (job: ComparisonJob | ComparisonJob[]) => void;
  workflows: Workflow[];
  language?: string;
  prefilledReference?: string;
  previousWorkflowId?: string;
  /** Job presets assigned to the current user's team. When creating a new shipment (not a
   * child job) and at least one applies, the user picks a starting preset from a dropdown;
   * the child job sequence is then pulled from it and locked, or left fully editable if
   * "custom" is chosen. */
  teamPresets?: JobPreset[];
}

interface ChildJobConfig {
  id: string;
  workflowId: string | null;
  suffixValue: string;
  assignee: string | null;
}

export const CreateJobModal: React.FC<CreateJobModalProps> = ({
  visible, onClose, onCreate, workflows, language, prefilledReference, previousWorkflowId, teamPresets
}) => {
  const isTh = language === 'TH';

  // Which starting preset the user picked from the dropdown, if any ('' means custom/manual).
  const [selectedPresetId, setSelectedPresetId] = useState<string>('');
  const selectedPreset = teamPresets?.find(p => p.id === selectedPresetId);

  // Shipment creation is locked to the chosen preset — the user can only name the shipment;
  // the child job sequence comes pre-filled and read-only.
  const isPresetLocked = !prefilledReference && !!selectedPreset && selectedPreset.workflows.length > 0;

  // State for single job mode (used when prefilledReference is present)
  const [singleWorkflowId, setSingleWorkflowId] = useState<string | null>(null);
  const [singleAssignee, setSingleAssignee] = useState<string | null>('unassigned');
  const [singleSuffixValue, setSingleSuffixValue] = useState<string>('');

  // State for multiple child jobs mode (used when prefilledReference is NOT present)
  const [shipmentName, setShipmentName] = useState<string>('');
  const [shipmentPlaceholder, setShipmentPlaceholder] = useState<string>(isTh ? 'โปรดระบุชื่อรายการ Shipment' : 'Please specify shipment reference name');
  const [childJobs, setChildJobs] = useState<ChildJobConfig[]>([
    { id: 'initial-1', workflowId: null, suffixValue: '', assignee: 'unassigned' }
  ]);

  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;
    
    setChildJobs(prev => {
      const copy = [...prev];
      const draggedItem = copy[draggedIndex];
      copy.splice(draggedIndex, 1);
      copy.splice(index, 0, draggedItem);
      return copy;
    });
    setDraggedIndex(index);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
  };

  // Generate default Shipment Name and reset states when modal opens
  useEffect(() => {
    if (visible) {
      if (prefilledReference) {
        setSingleWorkflowId(null);
        setSingleAssignee('unassigned');
        setSingleSuffixValue('');
      } else {
        setShipmentPlaceholder(isTh ? 'โปรดระบุชื่อรายการ Shipment' : 'Please specify shipment reference name');
        setShipmentName('');
        // Pre-select the starting preset only when the team has exactly one — otherwise
        // the user picks explicitly from the dropdown.
        setSelectedPresetId(teamPresets && teamPresets.length === 1 ? teamPresets[0].id : '');
      }
    }
  }, [visible, prefilledReference, isTh, teamPresets]);

  // Pull the chosen preset's workflow sequence into the child job rows (locked), or fall back
  // to a single blank editable row when "custom" is selected.
  useEffect(() => {
    if (!visible || prefilledReference) return;
    const preset = teamPresets?.find(p => p.id === selectedPresetId);
    if (preset && preset.workflows.length > 0) {
      // Naming is fully automatic: JOB-0001, JOB-0002, ... in preset order.
      setChildJobs(preset.workflows.map((pwf, idx) => {
        const wf = workflows.find(w => w.id === pwf.workflowId);
        const hasCreateJobNode = wf?.nodes.some(n => n.type === 'create_job');
        const suffixValue = hasCreateJobNode ? String(idx + 1).padStart(4, '0') : '';
        return {
          id: `cj-preset-${idx}-${Date.now()}`,
          workflowId: pwf.workflowId,
          suffixValue,
          assignee: 'unassigned'
        };
      }));
    } else {
      setChildJobs([
        { id: `cj-${Date.now()}`, workflowId: null, suffixValue: '', assignee: 'unassigned' }
      ]);
    }
  }, [selectedPresetId, teamPresets, visible, prefilledReference, workflows]);

  const modalTitle = prefilledReference 
    ? (isTh ? 'สร้างรายการย่อย (Child Job)' : 'Create Child Job')
    : (isTh ? 'สร้างรายการใหม่ (Shipment)' : 'Create New Shipment');

  const getPrefix = (format: string) => {
    if (!format) return 'JOB-';
    const bracketIdx = format.indexOf('{');
    if (bracketIdx !== -1) {
      return format.substring(0, bracketIdx);
    }
    return format;
  };

  // Helper to check workflow relations in multiple child jobs
  const checkWorkflowRelations = (): { isValid: boolean; errorIndex: number | null; errorMsg: string | null } => {
    if (prefilledReference) {
      if (!previousWorkflowId || !singleWorkflowId) {
        return { isValid: true, errorIndex: null, errorMsg: null };
      }
      const prevWf = workflows.find(w => w.id === previousWorkflowId);
      const newWf = workflows.find(w => w.id === singleWorkflowId);
      
      if (!prevWf || !newWf) return { isValid: true, errorIndex: null, errorMsg: null };
      
      const sendToNode = prevWf.nodes.find(node => node.type === 'send_to');
      if (!sendToNode || sendToNode.data?.nextWorkflowId !== newWf.id) {
        const msg = isTh 
          ? `เวิร์กโฟลว์ก่อนหน้า "${prevWf.name}" ไม่มีความสัมพันธ์ส่งต่องานไปยัง "${newWf.name}"`
          : `Previous workflow "${prevWf.name}" does not have a forward node routing to "${newWf.name}"`;
        return { isValid: false, errorIndex: 0, errorMsg: msg };
      }
      return { isValid: true, errorIndex: null, errorMsg: null };
    }

    for (let i = 0; i < childJobs.length - 1; i++) {
      const current = childJobs[i];
      const next = childJobs[i + 1];

      if (!current.workflowId || !next.workflowId) {
        continue; // Skip check if either is not selected yet
      }

      const currentWf = workflows.find(w => w.id === current.workflowId);
      const nextWf = workflows.find(w => w.id === next.workflowId);

      if (!currentWf || !nextWf) continue;

      // Check if currentWf contains a 'send_to' node pointing to nextWf.id
      const sendToNode = currentWf.nodes.find(node => node.type === 'send_to');
      const targetWfId = sendToNode?.data?.nextWorkflowId;

      if (!sendToNode || targetWfId !== nextWf.id) {
        const msg = isTh 
          ? `เวิร์กโฟลว์ "${currentWf.name}" ไม่มีความสัมพันธ์ส่งต่องานไปยัง "${nextWf.name}"`
          : `Workflow "${currentWf.name}" does not have a forward node routing to "${nextWf.name}"`;
        return { isValid: false, errorIndex: i, errorMsg: msg };
      }
    }

    return { isValid: true, errorIndex: null, errorMsg: null };
  };

  const getRelationInfo = (current: ChildJobConfig, next: ChildJobConfig) => {
    if (!current.workflowId || !next.workflowId) {
      return {
        status: 'pending',
        text: isTh ? 'รอเลือกเวิร์กโฟลว์ของทั้งสองรายการ' : 'Waiting for both workflows to be selected',
      };
    }

    const currentWf = workflows.find(w => w.id === current.workflowId);
    const nextWf = workflows.find(w => w.id === next.workflowId);

    if (!currentWf || !nextWf) {
      return {
        status: 'pending',
        text: isTh ? 'รอเลือกเวิร์กโฟลว์ของทั้งสองรายการ' : 'Waiting for both workflows to be selected',
      };
    }

    const sendToNode = currentWf.nodes.find(node => node.type === 'send_to');
    const targetWfId = sendToNode?.data?.nextWorkflowId;

    if (sendToNode && targetWfId === nextWf.id) {
      return {
        status: 'connected',
        text: isTh 
          ? `สัมพันธ์กัน: "${currentWf.name}" ➔ ส่งต่อให้ "${nextWf.name}"` 
          : `Connected: "${currentWf.name}" ➔ routes to "${nextWf.name}"`,
      };
    } else {
      return {
        status: 'disconnected',
        text: isTh 
          ? `ไม่สัมพันธ์กัน: "${currentWf.name}" ไม่สามารถส่งต่อให้ "${nextWf.name}" ได้` 
          : `Not Connected: "${currentWf.name}" does not route to "${nextWf.name}"`,
      };
    }
  };

  const validationResult = checkWorkflowRelations();

  useEffect(() => {
    if (!isPresetLocked && !validationResult.isValid && validationResult.errorMsg) {
      message.error({
        content: validationResult.errorMsg,
        key: 'workflow-routing-error',
        duration: 4,
      });
    }
  }, [isPresetLocked, validationResult.isValid, validationResult.errorMsg]);

  // Preset-locked sequences are pre-approved by the team's admin — only the shipment name
  // needs to be valid; the chain-routing check doesn't gate submission.
  const isFormInvalid = prefilledReference
    ? (!singleWorkflowId || !validationResult.isValid)
    : isPresetLocked
    ? !shipmentName.trim()
    : (!validationResult.isValid || !shipmentName.trim() || childJobs.some(j => !j.workflowId));

  const handleAddChildJobRow = () => {
    const newId = `cj-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    setChildJobs(prev => [
      ...prev,
      { id: newId, workflowId: null, suffixValue: '', assignee: 'unassigned' }
    ]);
  };

  const handleRemoveChildJobRow = (id: string) => {
    if (childJobs.length <= 1) return;
    setChildJobs(prev => prev.filter(j => j.id !== id));
  };



  const handleChildJobChange = (id: string, field: keyof ChildJobConfig, value: any) => {
    setChildJobs(prev => prev.map(job => {
      if (job.id === id) {
        const updated = { ...job, [field]: value };
        // Pre-fill suffix code if workflow selected and suffix is empty
        if (field === 'workflowId' && value) {
          const wf = workflows.find(w => w.id === value);
          const hasCreateJobNode = wf?.nodes.some(n => n.type === 'create_job');
          if (hasCreateJobNode && !job.suffixValue) {
            updated.suffixValue = String(Math.floor(1000 + Math.random() * 9000));
          }
        }
        return updated;
      }
      return job;
    }));
  };

  const handleCreate = () => {
    if (prefilledReference) {
      // Single Child Job Mode
      if (!singleWorkflowId) {
        message.error(isTh ? 'กรุณาเลือก Workflow' : 'Please select a workflow');
        return;
      }

      const workflow = workflows.find(w => w.id === singleWorkflowId);
      if (!workflow) return;

      const createJobNode = workflow.nodes.find(node => node.type === 'create_job');
      if (!createJobNode || !createJobNode.data || !createJobNode.data.docTypes || createJobNode.data.docTypes.length === 0) {
        message.error(isTh 
           ? `ไม่สามารถสร้าง Job ได้: Workflow "${workflow.name}" ไม่มี Node "Job creation" ที่มีการกำหนด DocType`
           : `Cannot create job: Workflow "${workflow.name}" has no "Job creation" node with DocTypes specified.`
        );
        return;
      }

      const namingFormat = createJobNode.data.namingFormat || '';
      const extractedPrefix = namingFormat ? getPrefix(namingFormat) : 'JOB-';
      const finalSuffix = singleSuffixValue.trim() || String(Math.floor(1000 + Math.random() * 9000));

      const docTypes: string[] = createJobNode.data.docTypes;
      const jobName: string = createJobNode.data.jobName || workflow.name;
      const assigneeValue = singleAssignee === 'unassigned' ? undefined : singleAssignee;

      const newJob: ComparisonJob = {
        id: `job-${Date.now()}`,
        reference: prefilledReference,
        createdAt: new Date().toISOString(),
        expiryDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        status: JobStatus.NEW,
        docs: docTypes.reduce((acc, type) => {
          acc[type] = ComparisonDocStatus.MISSING;
          return acc;
        }, {} as Record<string, any>),
        assignee: assigneeValue || undefined,
        workflowName: `${jobName} [${extractedPrefix}${finalSuffix}]`,
        progress: 0,
        totalDocs: docTypes.length,
        foundDocs: 0
      };

      onCreate(newJob);
      message.success(isTh ? 'สร้างรายการย่อยสำเร็จ' : 'Child job created successfully');
      onClose();
    } else {
      // Multiple Child Jobs Mode (Create New Shipment)
      if (!shipmentName.trim()) {
        message.error(isTh ? 'กรุณาระบุชื่อรายการ Shipment' : 'Please specify Shipment Name');
        return;
      }

      if (childJobs.some(j => !j.workflowId)) {
        message.error(isTh ? 'กรุณาเลือกเวิร์กโฟลว์ให้ครบทุกรายการย่อย' : 'Please select a workflow for all child jobs');
        return;
      }

      // Check workflow relations sequence
      const relationCheck = checkWorkflowRelations();
      if (!relationCheck.isValid) {
        message.error(isTh 
          ? `ไม่สามารถสร้างรายการได้เนื่องจากความสัมพันธ์ของเวิร์กโฟลว์ไม่สัมพันธ์กัน: ${relationCheck.errorMsg}` 
          : `Cannot create shipment due to workflow incompatibility: ${relationCheck.errorMsg}`
        );
        return;
      }

      // Create jobs for each configuration
      const createdJobsList: ComparisonJob[] = [];
      const nowMs = Date.now();

      for (let i = 0; i < childJobs.length; i++) {
        const config = childJobs[i];
        const workflow = workflows.find(w => w.id === config.workflowId)!;
        const createJobNode = workflow.nodes.find(node => node.type === 'create_job')!;

        // Validate docTypes specified
        if (!createJobNode || !createJobNode.data || !createJobNode.data.docTypes || createJobNode.data.docTypes.length === 0) {
          message.error(isTh 
             ? `ไม่สามารถสร้างรายการได้: เวิร์กโฟลว์ "${workflow.name}" ไม่มี Node "Job creation" หรือไม่มี DocType`
             : `Cannot create: Workflow "${workflow.name}" lacks a configured "Job creation" node with DocTypes.`
          );
          return;
        }

        const namingFormat = createJobNode.data.namingFormat || '';
        const extractedPrefix = namingFormat ? getPrefix(namingFormat) : 'JOB-';
        const finalSuffix = config.suffixValue.trim() || String(Math.floor(1000 + Math.random() * 9000));

        const docTypes: string[] = createJobNode.data.docTypes;
        const jobName: string = createJobNode.data.jobName || workflow.name;
        const assigneeValue = config.assignee === 'unassigned' ? undefined : config.assignee;

        createdJobsList.push({
          id: `job-${nowMs}-${i}`,
          reference: shipmentName.trim(),
          createdAt: new Date().toISOString(),
          expiryDate: new Date(Date.now() + (7 + i) * 24 * 60 * 60 * 1000).toISOString(),
          // All jobs in the sequence start as NEW (waiting for files)
          status: JobStatus.NEW,
          docs: docTypes.reduce((acc, type) => {
            acc[type] = ComparisonDocStatus.MISSING;
            return acc;
          }, {} as Record<string, any>),
          assignee: assigneeValue || undefined,
          workflowName: `${jobName} [${extractedPrefix}${finalSuffix}]`,
          progress: 0,
          totalDocs: docTypes.length,
          foundDocs: 0
        });
      }

      onCreate(createdJobsList);
      message.success(isTh ? 'สร้างรายการ Shipment ใหม่สำเร็จแล้ว' : 'New Shipment created successfully with child jobs');
      onClose();
    }
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
          <Briefcase size={20} className="text-[#1f5df9]" />
          <span>{modalTitle}</span>
        </div>
      }
      open={visible}
      onClose={onClose}
      size={prefilledReference ? 500 : 800}
      placement="right"
      className="font-sans"
      footer={
        <div className="flex justify-end gap-3 font-sans bg-white">
          <button
            type="button"
            onClick={onClose}
            className="font-sans font-bold h-10 px-5 text-xs text-slate-500 rounded-[4px] border border-slate-200 hover:border-slate-300 hover:text-slate-700 transition-all cursor-pointer bg-white"
          >
            {isTh ? 'ยกเลิก' : 'Cancel'}
          </button>
          <button
            type="button"
            onClick={handleCreate}
            disabled={isFormInvalid}
            className={`rounded-[4px] font-sans font-bold h-10 px-5 text-xs uppercase tracking-widest transition-all border-none shadow-sm text-white ${
              isFormInvalid
                ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                : 'bg-[#1f5df9] hover:bg-[#104BE3] cursor-pointer'
            }`}
          >
            {prefilledReference ? (isTh ? 'สร้างรายการย่อย' : 'Create Job') : (isTh ? 'สร้าง Shipment และรายการย่อย' : 'Create Shipment')}
          </button>
        </div>
      }
    >
      <div className="font-sans py-2">
        {prefilledReference ? (
          /* Single Child Job Creation Mode */
          <div className="space-y-5">
            <div>
              <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest mb-1.5">
                {isTh ? 'เลขที่ Shipment' : 'SHIPMENT REFERENCE'}
              </label>
              <div className="bg-slate-50 border border-slate-100 text-[#010136] font-black font-mono text-sm rounded-[4px] px-3 py-2.5">
                {prefilledReference}
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest mb-1.5">
                {isTh ? 'เลือกเวิร์กโฟลว์' : 'SELECT WORKFLOW'} <span className="text-red-500">*</span>
              </label>
              <select
                value={singleWorkflowId || ''}
                onChange={(e) => {
                  const val = e.target.value;
                  setSingleWorkflowId(val);
                  const wf = workflows.find(w => w.id === val);
                  const node = wf?.nodes.find(n => n.type === 'create_job');
                  if (node) {
                    setSingleSuffixValue(String(Math.floor(1000 + Math.random() * 9000)));
                  } else {
                    setSingleSuffixValue('');
                  }
                }}
                className="w-full bg-white border border-slate-200 rounded-[4px] py-2.5 px-3 text-sm font-bold text-[#010136] outline-none focus:ring-2 focus:ring-[#1f5df9]/10 focus:border-[#1f5df9] transition-all"
              >
                <option value="">{isTh ? '-- เลือกเวิร์กโฟลว์ --' : '-- Select Workflow --'}</option>
                {workflows.filter(w => w.id !== 'wf-2' && w.name !== 'Empty Workflow').map(w => (
                  <option key={w.id} value={w.id}>{w.name}</option>
                ))}
              </select>
            </div>

            {/* Inline Alert / Warning Banner for Single Job */}
            {!validationResult.isValid && prefilledReference && (
              <div className="mt-4 flex items-start gap-2.5 p-3.5 bg-rose-50 border border-rose-100 rounded-[4px] animate-in fade-in slide-in-from-top-1 duration-200">
                <AlertCircle className="text-rose-500 shrink-0" size={16} />
                <div className="flex flex-col">
                  <span className="text-[10px] font-black text-rose-800 uppercase tracking-wider mb-0.5">
                    {isTh ? 'ตรวจพบความไม่สัมพันธ์กันของเวิร์กโฟลว์' : 'Incompatible Workflow Routing'}
                  </span>
                  <span className="text-xs text-rose-700 font-bold leading-relaxed">
                    {validationResult.errorMsg}
                  </span>
                  <span className="text-[10px] text-rose-600 mt-1 font-semibold">
                    {isTh 
                      ? 'คำแนะนำ: ตรวจสอบให้มั่นใจว่าเวิร์กโฟลว์ก่อนหน้ามีโหนด "ส่งต่องาน (Send to other app)" ที่ถูกกำหนดให้ส่งไปยังเวิร์กโฟลว์นี้'
                      : 'Tip: Make sure the previous workflow contains a "Send to other app" node configured to route to this workflow.'}
                  </span>
                </div>
              </div>
            )}

            {singleWorkflowId && workflows.find(w => w.id === singleWorkflowId)?.nodes.some(n => n.type === 'create_job') && (
              <div className="animate-in fade-in slide-in-from-top-2 duration-300 bg-slate-50 p-4 rounded-[8px] border border-slate-100">
                <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest mb-1.5">
                  {isTh ? 'รูปแบบของ Job (รหัสต่อท้าย)' : 'JOB FORMAT SUFFIX'} <span className="text-red-500">*</span>
                </label>
                <div className="flex rounded-[4px] border border-slate-200 overflow-hidden bg-white focus-within:ring-2 focus-within:ring-[#1f5df9]/10 focus-within:border-[#1f5df9] transition-all">
                  <span className="inline-flex items-center px-3 bg-slate-50 border-r border-slate-100 text-slate-400 text-xs font-mono font-bold select-none">
                    {getPrefix(workflows.find(w => w.id === singleWorkflowId)?.nodes.find(n => n.type === 'create_job')?.data?.namingFormat || '')}
                  </span>
                  <input
                    type="text"
                    value={singleSuffixValue}
                    onChange={(e) => setSingleSuffixValue(e.target.value)}
                    className="flex-1 min-w-0 block w-full px-3 py-2 text-sm font-bold font-mono text-[#010136] focus:outline-none placeholder-slate-300"
                    placeholder={isTh ? 'เช่น 9041...' : 'e.g. 9041...'}
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest mb-1.5">
                {isTh ? 'ผู้รับผิดชอบ (Assignee)' : 'ASSIGNEE'}
              </label>
              <select
                value={singleAssignee || 'unassigned'}
                onChange={(e) => setSingleAssignee(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-[4px] py-2.5 px-3 text-sm font-bold text-[#010136] outline-none focus:ring-2 focus:ring-[#1f5df9]/10 focus:border-[#1f5df9] transition-all"
              >
                <option value="unassigned">{isTh ? 'ไม่ได้มอบหมาย (Unassigned)' : 'Unassigned'}</option>
                <option value="Kunawut W.">Kunawut W.</option>
                <option value="Somchai T.">Somchai T.</option>
                <option value="System">System</option>
              </select>
            </div>
          </div>
        ) : (
          /* Multi-Job Shipment Creation Mode */
          <div className="space-y-6">
            {/* Shipment Name Section */}
            <div className="bg-slate-50 p-4 rounded-[8px] border border-slate-100">
              <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest mb-1.5">
                {isTh ? 'ชื่อรายการ Shipment' : 'SHIPMENT REFERENCE NAME'} <span className="text-red-500">*</span>
              </label>
                <input
                  type="text"
                  value={shipmentName}
                  onChange={(e) => setShipmentName(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-[4px] px-3.5 py-2.5 text-sm font-black text-[#010136] font-sans placeholder:font-normal placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-[#1f5df9]/10 focus:border-[#1f5df9] transition-all"
                  placeholder={shipmentPlaceholder}
                />
              <p className="text-[10px] text-slate-400 font-bold mt-1.5">
                {isTh ? 'ระบุเลขที่ควบคุมสำหรับกลุ่มเวิร์กโฟลว์ย่อย เช่น CN-TH-2026-80942' : 'Set control reference name for grouping sub-workflows.'}
              </p>
            </div>

            {/* Starting Preset Picker */}
            {teamPresets && teamPresets.length > 0 && (
              <div className="bg-slate-50 p-4 rounded-[8px] border border-slate-100">
                <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest mb-1.5">
                  {isTh ? 'เลือกชุด Shipment เริ่มต้น' : 'STARTING PRESET'}
                </label>
                <select
                  value={selectedPresetId}
                  onChange={(e) => setSelectedPresetId(e.target.value)}
                  disabled={teamPresets.length === 1}
                  className="w-full bg-white border border-slate-200 rounded-[4px] py-2.5 px-3 text-sm font-bold text-[#010136] outline-none focus:ring-2 focus:ring-[#1f5df9]/10 focus:border-[#1f5df9] transition-all disabled:bg-slate-100 disabled:text-slate-500 disabled:cursor-not-allowed"
                >
                  {teamPresets.length > 1 && (
                    <option value="">{isTh ? '-- กำหนดเอง (ไม่ใช้พรีเซ็ต) --' : '-- Custom (No Preset) --'}</option>
                  )}
                  {teamPresets.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
                <p className="text-[10px] text-slate-400 font-bold mt-1.5">
                  {isTh
                    ? 'เลือกชุด Shipment ที่ต้องการเริ่มต้น ระบบจะดึงลำดับรายการย่อยจากพรีเซ็ตนั้นมาแสดงให้'
                    : "Pick a starting shipment set — its child job sequence will be pulled in automatically."}
                </p>
              </div>
            )}

            {/* Preset-locked notice */}
            {isPresetLocked && (
              <div className="flex items-start gap-2.5 p-3.5 bg-blue-50 border border-blue-100 rounded-[8px]">
                <Sparkles className="text-[#1f5df9] shrink-0" size={16} />
                <div className="flex flex-col">
                  <span className="text-[10px] font-black text-[#1f5df9] uppercase tracking-wider mb-0.5">
                    {isTh ? `ใช้ชุด Preset ที่เลือก: ${selectedPreset!.name}` : `Using selected preset: ${selectedPreset!.name}`}
                  </span>
                  <span className="text-xs text-blue-800/80 font-bold leading-relaxed">
                    {isTh
                      ? 'รายการย่อยด้านล่างถูกกำหนดไว้ล่วงหน้าและแก้ไขไม่ได้ ระบุเพียงชื่อ Shipment แล้วกดสร้างรายการ'
                      : 'The child jobs below are pre-configured and locked. Just name the shipment and submit.'}
                  </span>
                </div>
              </div>
            )}

            {/* Child Jobs Sequence Visualization (Visual Flowchart) */}
            {!isPresetLocked && (
            <div className="border border-slate-100 rounded-[8px] p-4 bg-slate-50/30">
              <div className="flex items-center gap-1.5 mb-3">
                <Layers size={14} className="text-[#1f5df9]" />
                <span className="text-[10px] font-black text-[#010136] uppercase tracking-widest">
                  {isTh ? 'โครงสร้างการส่งต่องาน (Workflow Chaining Visualizer)' : 'Workflow Chaining Sequence'}
                </span>
              </div>
              
              <div className="flex flex-wrap items-center gap-3 py-2">
                {childJobs.map((job, idx) => {
                  const wfName = job.workflowId 
                    ? (workflows.find(w => w.id === job.workflowId)?.name || 'Unknown') 
                    : (isTh ? 'เลือกเวิร์กโฟลว์...' : 'Select Workflow...');
                  
                  const isLast = idx === childJobs.length - 1;
                  
                  // Check compatibility with the next workflow
                  let isNextCompatible = true;
                  if (!isLast && job.workflowId && childJobs[idx + 1].workflowId) {
                    const currentWf = workflows.find(w => w.id === job.workflowId);
                    const nextWf = workflows.find(w => w.id === childJobs[idx + 1].workflowId);
                    const sendToNode = currentWf?.nodes.find(n => n.type === 'send_to');
                    isNextCompatible = !!sendToNode && sendToNode.data?.nextWorkflowId === nextWf?.id;
                  }

                  return (
                    <React.Fragment key={job.id}>
                      <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-[4px] px-3 py-2 shadow-sm font-sans">
                        <div className="w-5 h-5 rounded-full bg-slate-100 text-slate-500 font-bold text-[10px] flex items-center justify-center font-mono">
                          {idx + 1}
                        </div>
                        <div className="flex flex-col">
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">Job {idx + 1}</span>
                          <span className="text-xs font-extrabold text-[#010136] max-w-[160px] truncate">{wfName}</span>
                          {job.workflowId && (
                            <span className="text-[9px] font-bold text-[#1f5df9] mt-0.5 flex items-center gap-1">
                              <User size={10} className="text-[#1f5df9]/70 shrink-0" />
                              <span className="truncate max-w-[140px]">
                                {job.assignee && job.assignee !== 'unassigned' ? job.assignee : (isTh ? 'ยังไม่กำหนด' : 'Unassigned')}
                              </span>
                            </span>
                          )}
                        </div>
                      </div>
                      
                      {!isLast && (
                        <div className="flex flex-col items-center">
                          <ArrowRight 
                            size={16} 
                            className={isNextCompatible ? 'text-[#16EA9E]' : 'text-rose-500 animate-pulse'} 
                          />
                          {!isNextCompatible && (
                            <span className="text-[8px] font-black text-rose-500 uppercase tracking-tight px-1 bg-rose-50 border border-rose-100 rounded-[2px] mt-0.5">
                              {isTh ? 'ไม่สัมพันธ์' : 'Broken'}
                            </span>
                          )}
                        </div>
                      )}
                    </React.Fragment>
                  );
                })}
              </div>

              {/* Inline Alert / Warning Banner */}
              {!isPresetLocked && !validationResult.isValid && (
                <div className="mt-4 flex items-start gap-2.5 p-3.5 bg-rose-50 border border-rose-100 rounded-[4px] animate-in fade-in slide-in-from-top-1 duration-200">
                  <AlertCircle className="text-rose-500 shrink-0" size={16} />
                  <div className="flex flex-col">
                    <span className="text-[10px] font-black text-rose-800 uppercase tracking-wider mb-0.5">
                      {isTh ? 'ตรวจพบความไม่สัมพันธ์กันของเวิร์กโฟลว์' : 'Incompatible Workflow Routing'}
                    </span>
                    <span className="text-xs text-rose-700 font-bold leading-relaxed">
                      {validationResult.errorMsg}
                    </span>
                    <span className="text-[10px] text-rose-600 mt-1 font-semibold">
                      {isTh
                        ? 'คำแนะนำ: ตรวจสอบให้มั่นใจว่าเวิร์กโฟลว์ก่อนหน้ามีโหนด "ส่งต่องาน (Send to other app)" ที่ถูกกำหนดให้ส่งไปยังเวิร์กโฟลว์ถัดไป'
                        : 'Tip: Make sure the previous workflow contains a "Send to other app" node configured to route to the next workflow.'}
                    </span>
                  </div>
                </div>
              )}
            </div>
            )}

            {/* Child Jobs Rows Setup */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex flex-col">
                  <span className="text-[11px] font-black text-slate-400 uppercase tracking-widest">
                    {isTh ? 'การตั้งค่ารายการย่อย' : 'CHILD JOBS CONFIGURATION'}
                  </span>
                  {!isPresetLocked && (
                    <span className="text-[10px] text-amber-600 font-bold mt-0.5">
                      {isTh ? '★ สามารถลาก (Drag & Drop) เพื่อจัดลำดับรายการย่อยได้' : '★ Drag & drop rows to reorder child jobs'}
                    </span>
                  )}
                </div>
                {!isPresetLocked && (
                  <button
                    type="button"
                    onClick={handleAddChildJobRow}
                    className="px-3.5 py-1.5 bg-white hover:bg-slate-50 text-[#1f5df9] border border-[#1f5df9] rounded-[4px] text-xs font-black uppercase tracking-wider flex items-center gap-1.5 transition-all cursor-pointer shadow-sm"
                  >
                    <Plus size={14} strokeWidth={2.5} />
                    <span>{isTh ? 'เพิ่มรายการย่อย' : 'Add Child Job'}</span>
                  </button>
                )}
              </div>

              <div className={isPresetLocked ? 'bg-white border border-slate-200 rounded-[8px] divide-y divide-slate-100 overflow-hidden shadow-sm' : 'space-y-3.5'}>
                {childJobs.map((job, idx) => {
                  const wf = workflows.find(w => w.id === job.workflowId);
                  const hasCreateNode = wf?.nodes.some(n => n.type === 'create_job');
                  const currentPrefix = hasCreateNode
                    ? getPrefix(wf?.nodes.find(n => n.type === 'create_job')?.data?.namingFormat || '')
                    : 'JOB-';

                  return (
                    <React.Fragment key={job.id}>
                      <div
                        draggable={!isPresetLocked && childJobs.length > 1}
                        onDragStart={(e) => handleDragStart(e, idx)}
                        onDragOver={(e) => handleDragOver(e, idx)}
                        onDragEnd={handleDragEnd}
                        className={
                          isPresetLocked
                            ? 'p-4 bg-slate-50/60 relative flex items-center gap-3.5'
                            : `p-4 bg-white border rounded-[8px] relative transition-all duration-150 shadow-sm flex items-center gap-3.5 ${
                                draggedIndex === idx
                                  ? 'border-[#1f5df9] bg-blue-50/20 opacity-40 scale-[0.98]'
                                  : 'border-slate-200 hover:border-[#1f5df9]/40'
                              }`
                        }
                      >
                        {/* Step indicator for locked preset sequences */}
                        {isPresetLocked && (
                          <div className="relative flex flex-col items-center justify-center self-stretch shrink-0">
                            <div className="w-6 h-6 rounded-full bg-blue-50 border border-blue-100 flex items-center justify-center text-[10px] font-black text-[#1f5df9] shrink-0 z-10">
                              {idx + 1}
                            </div>
                            {idx < childJobs.length - 1 && (
                              <div className="absolute top-6 bottom-[-16px] w-px bg-blue-100"></div>
                            )}
                          </div>
                        )}

                        {/* Drag Handle on the far left */}
                        {!isPresetLocked && childJobs.length > 1 && (
                          <div
                            className="cursor-grab active:cursor-grabbing text-slate-400 hover:text-[#1f5df9] transition-colors p-1 rounded hover:bg-slate-100 flex items-center justify-center shrink-0 self-center"
                            title={isTh ? 'ลากเพื่อสลับลำดับ' : 'Drag to reorder'}
                          >
                            <GripVertical size={18} />
                          </div>
                        )}

                        <div className="flex-1 grid grid-cols-1 md:grid-cols-11 gap-4 items-end">
                          {/* Sequence indicator and dropdown */}
                          <div className="md:col-span-4">
                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">
                              {isTh ? `รายการย่อยที่ ${idx + 1}: เวิร์กโฟลว์` : `Job ${idx + 1}: Workflow`} <span className="text-red-500">*</span>
                            </label>
                            {isPresetLocked ? (
                              <input
                                type="text"
                                disabled
                                readOnly
                                value={wf?.name || ''}
                                className="w-full h-[38px] bg-slate-100 border border-slate-200 rounded-[4px] px-2.5 text-xs font-black text-slate-500 disabled:cursor-not-allowed"
                              />
                            ) : (
                              <select
                                value={job.workflowId || ''}
                                onChange={(e) => handleChildJobChange(job.id, 'workflowId', e.target.value || null)}
                                className="w-full h-[38px] bg-white border border-slate-200 rounded-[4px] px-2.5 text-xs font-black text-[#010136] outline-none focus:ring-2 focus:ring-[#1f5df9]/10 focus:border-[#1f5df9] transition-all py-0"
                              >
                                <option value="">{isTh ? '-- เลือกเวิร์กโฟลว์ --' : '-- Select Workflow --'}</option>
                                {workflows.filter(w => w.id !== 'wf-2' && w.name !== 'Empty Workflow').map(w => (
                                  <option key={w.id} value={w.id}>{w.name}</option>
                                ))}
                              </select>
                            )}
                          </div>

                          {/* Suffix format field */}
                          <div className="md:col-span-3">
                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">
                              {isTh ? 'รูปแบบของ Job (รหัสต่อท้าย)' : 'Job Suffix Format'} <span className="text-red-500">*</span>
                            </label>
                            <div className="flex h-[38px] rounded-[4px] border border-slate-200 overflow-hidden bg-white focus-within:ring-2 focus-within:ring-[#1f5df9]/10 focus-within:border-[#1f5df9] transition-all">
                              <span className="inline-flex items-center px-2 bg-slate-50 border-r border-slate-100 text-slate-400 text-[10px] font-mono font-black select-none h-full">
                                {currentPrefix}
                              </span>
                              <input
                                type="text"
                                value={job.suffixValue}
                                onChange={(e) => handleChildJobChange(job.id, 'suffixValue', e.target.value)}
                                className="flex-1 min-w-0 block w-full px-2 text-xs font-bold font-mono text-[#010136] focus:outline-none placeholder-slate-300 h-full py-0 border-none disabled:bg-slate-100 disabled:text-slate-500"
                                placeholder={isTh ? 'เลขต่อท้าย เช่น 4091...' : 'suffix...'}
                                disabled={!job.workflowId || isPresetLocked}
                              />
                            </div>
                          </div>

                          {/* Assignee: individual user, or the preset's assigned team when locked */}
                          <div className="md:col-span-3">
                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">
                              {isPresetLocked
                                ? (isTh ? 'ทีมที่รับผิดชอบ' : 'Assigned Team')
                                : (isTh ? 'Assignee (ผู้รับผิดชอบ)' : 'Assignee')}
                            </label>
                            {isPresetLocked ? (
                              <input
                                type="text"
                                disabled
                                readOnly
                                value={(selectedPreset?.workflows[idx]?.assignedTeams || [])
                                  .map(teamValue => MOCK_TEAMS.find(t => t.value === teamValue)?.label || teamValue)
                                  .join(', ')}
                                className="w-full h-[38px] bg-slate-100 border border-slate-200 rounded-[4px] px-2.5 text-xs font-black text-slate-500 disabled:cursor-not-allowed"
                              />
                            ) : (
                              <select
                                value={job.assignee || 'unassigned'}
                                onChange={(e) => handleChildJobChange(job.id, 'assignee', e.target.value)}
                                className="w-full h-[38px] bg-white border border-slate-200 rounded-[4px] px-2.5 text-xs font-black text-[#010136] outline-none focus:ring-2 focus:ring-[#1f5df9]/10 focus:border-[#1f5df9] transition-all py-0 disabled:bg-slate-100 disabled:text-slate-500 disabled:cursor-not-allowed"
                                disabled={!job.workflowId}
                              >
                                <option value="unassigned">{isTh ? 'ยังไม่กำหนด' : 'Unassigned'}</option>
                                <option value="Kunawut W.">Kunawut W.</option>
                                <option value="Somchai T.">Somchai T.</option>
                                <option value="System">System</option>
                              </select>
                            )}
                          </div>

                          {/* Delete row button */}
                          {!isPresetLocked && (
                            <div className="md:col-span-1 flex justify-center md:justify-end pb-0.5">
                              <button
                                type="button"
                                onClick={() => handleRemoveChildJobRow(job.id)}
                                disabled={childJobs.length <= 1}
                                className={`h-[38px] w-[38px] rounded-[4px] border border-none transition-all cursor-pointer flex items-center justify-center ${
                                  childJobs.length <= 1
                                    ? 'bg-slate-50 text-slate-300 cursor-not-allowed'
                                    : 'bg-rose-50 text-rose-500 hover:bg-rose-100 hover:text-rose-600'
                                }`}
                                title={isTh ? 'ลบ' : 'Delete'}
                              >
                                <Trash2 size={16} />
                              </button>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Connection relation badge between rows */}
                      {!isPresetLocked && idx < childJobs.length - 1 && (() => {
                        const rel = getRelationInfo(job, childJobs[idx + 1]);
                        return (
                          <div className="flex items-center justify-center my-1 relative py-0.5">
                            {/* Vertical connecting line */}
                            <div className="absolute top-[-10px] bottom-[-10px] left-1/2 -translate-x-1/2 w-[2px] border-l-2 border-dashed border-slate-200 -z-0"></div>
                            
                            {rel.status === 'connected' ? (
                              <div className="z-10 flex items-center gap-1.5 px-3 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full text-[10px] font-bold shadow-sm animate-in zoom-in-95 duration-200">
                                <Link2 size={12} className="text-emerald-500 shrink-0" />
                                <span>{rel.text}</span>
                              </div>
                            ) : rel.status === 'disconnected' ? (
                              <div className="z-10 flex items-center gap-1.5 px-3 py-1 bg-rose-50 text-rose-700 border border-rose-200 rounded-full text-[10px] font-bold shadow-sm animate-in zoom-in-95 duration-200 animate-pulse">
                                <Link2Off size={12} className="text-rose-500 shrink-0" />
                                <span>{rel.text}</span>
                              </div>
                            ) : (
                              <div className="z-10 flex items-center gap-1.5 px-3 py-1 bg-slate-50 text-slate-400 border border-slate-200 rounded-full text-[10px] font-bold shadow-sm">
                                <Link2 size={12} className="text-slate-400 shrink-0" />
                                <span>{rel.text}</span>
                              </div>
                            )}
                          </div>
                        );
                      })()}
                    </React.Fragment>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>
    </Drawer>
  );
};
