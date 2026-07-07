import React, { useState, useRef, useEffect } from 'react';
import { 
  ArrowLeft, Save, Play, Plus, Trash2, Settings, FileText, 
  Database, FileOutput, ArrowRight, X, Link as LinkIcon, FileSpreadsheet,
  CheckCircle2, AlertCircle
} from 'lucide-react';
import { Workflow, WorkflowNode, WorkflowEdge, Language, TrackingItem, ReviewStatus } from '../types';
import { TRANSLATIONS } from '../translations';
import { motion, AnimatePresence } from 'motion/react';

interface WorkflowBuilderProps {
  workflow?: Workflow;
  language: Language;
  trackingItems: TrackingItem[];
  onSave: (workflow: Workflow) => void;
  onBack: () => void;
}

// Mock Templates for Mapping
const TEMPLATES = [
  { 
    id: 'tpl-invoice', 
    name: 'Standard Commercial Invoice',
    fields: [
      { id: 'inv_no', name: 'Invoice Number', required: true, layout: { top: '15%', left: '70%', width: '20%' } },
      { id: 'date', name: 'Date', required: true, layout: { top: '20%', left: '70%', width: '20%' } },
      { id: 'customer', name: 'Customer Name', required: false, layout: { top: '25%', left: '10%', width: '40%' } },
      { id: 'total', name: 'Total Amount', required: true, layout: { top: '80%', left: '70%', width: '20%' } }
    ]
  },
  { 
    id: 'tpl-po', 
    name: 'Purchase Order Template',
    fields: [
      { id: 'po_no', name: 'PO Number', required: true, layout: { top: '10%', left: '60%', width: '30%' } },
      { id: 'vendor', name: 'Vendor Name', required: true, layout: { top: '20%', left: '10%', width: '40%' } },
      { id: 'amount', name: 'Amount', required: false, layout: { top: '75%', left: '60%', width: '30%' } }
    ]
  },
  { 
    id: 'tpl-edecl', 
    name: 'E-Declaration Form',
    fields: [
      { id: 'decl_no', name: 'Declaration No', required: true, layout: { top: '12%', left: '15%', width: '30%' } },
      { id: 'importer', name: 'Importer', required: true, layout: { top: '25%', left: '15%', width: '70%' } }
    ]
  }
];

const getMockFieldsForDocType = (docType: string) => {
  switch(docType) {
    case 'Invoice': return ['Invoice No', 'Date', 'Total Amount', 'VAT', 'Vendor Name', 'Customer Name'];
    case 'PO': return ['PO Number', 'Date', 'Vendor', 'Total', 'Items'];
    case 'Receipt': return ['Receipt No', 'Date', 'Amount', 'Tax'];
    default: return ['ID', 'Date', 'Name', 'Value'];
  }
};

export const WorkflowBuilder: React.FC<WorkflowBuilderProps> = ({ workflow, language, trackingItems, onSave, onBack }) => {
  const t = TRANSLATIONS[language];
  const [name, setName] = useState(workflow?.name || 'New Workflow');
  const [description, setDescription] = useState(workflow?.description || '');
  const [nodes, setNodes] = useState<WorkflowNode[]>(workflow?.nodes || [
    { id: 'node-1', type: 'input', position: { x: 100, y: 200 }, data: { files: [] } },
    { id: 'node-2', type: 'mapping', position: { x: 400, y: 200 }, data: { templateId: '', mappings: [], customFields: [] } },
    { id: 'node-3', type: 'output', position: { x: 700, y: 200 }, data: { format: 'pdf', destination: '' } }
  ]);
  const [edges, setEdges] = useState<WorkflowEdge[]>(workflow?.edges || [
    { id: 'edge-1', source: 'node-1', target: 'node-2' },
    { id: 'edge-2', source: 'node-2', target: 'node-3' }
  ]);
  
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [isDataSourceModalOpen, setIsDataSourceModalOpen] = useState(false);
  const canvasRef = useRef<HTMLDivElement>(null);
  
  const [confirmToggleDialog, setConfirmToggleDialog] = useState(false);

  const checkWorkflowIncompleteLocal = () => {
    return nodes.some(node => {
      if (node.type === 'get_file') {
        const d = node.data || {};
        const folderValid = d.folder ? d.folder.split('/').every((level: string) => level.trim().length > 0) : false;
        return !d.nodeName?.trim() || !d.protocol || !d.tenantId?.trim() || !d.clientId?.trim() || !d.clientSecret?.trim() || !folderValid || !d.pollInterval;
      }
      if (node.type === 'hybrid_mail_filter') {
        const d = node.data || {};
        if (d.mode === 'Prompt-based only' || d.mode === 'Both') {
          if (!d.promptTemplate || d.promptTemplate.trim() === '') return true;
        }
        return false;
      }
      return false;
    });
  };

  // Panning state
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });

  // Dragging state
  const [draggingNodeId, setDraggingNodeId] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

  const handleCanvasMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return; // Only left click
    setIsPanning(true);
    setPanStart({
      x: e.clientX - pan.x,
      y: e.clientY - pan.y
    });
    setSelectedNodeId(null);
  };

  const handleNodeMouseDown = (e: React.MouseEvent, nodeId: string) => {
    e.stopPropagation();
    setSelectedNodeId(nodeId);
    
    const node = nodes.find(n => n.id === nodeId);
    if (node) {
      setDraggingNodeId(nodeId);
      // Calculate offset from mouse to node's top-left corner
      setDragOffset({
        x: e.clientX - node.position.x,
        y: e.clientY - node.position.y
      });
    }
  };

  const handleCanvasMouseMove = (e: React.MouseEvent) => {
    if (draggingNodeId) {
      // Node dragging
      const x = e.clientX - dragOffset.x;
      const y = e.clientY - dragOffset.y;
      
      // Use functional update to ensure we have the latest state
      setNodes(prev => prev.map(n => {
        if (n.id === draggingNodeId) {
          return {
            ...n,
            position: { x, y }
          };
        }
        return n;
      }));
    } else if (isPanning) {
      // Canvas panning
      setPan({
        x: e.clientX - panStart.x,
        y: e.clientY - panStart.y
      });
    }
  };

  const handleCanvasMouseUp = () => {
    setDraggingNodeId(null);
    setIsPanning(false);
  };

  const handleSave = () => {
    const newWorkflow: Workflow = {
      id: workflow?.id || `wf-${Date.now()}`,
      name,
      description,
      status: workflow?.status || 'INACTIVE',
      createdAt: workflow?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      nodes,
      edges
    };
    onSave(newWorkflow);
  };

  const updateNodeData = (nodeId: string, newData: any) => {
    setNodes(prev => prev.map(n => n.id === nodeId ? { ...n, data: { ...n.data, ...newData } } : n));
  };

  const renderNodeIcon = (type: string) => {
    switch (type) {
      case 'input': return <Database size={20} className="text-blue-500" />;
      case 'mapping': return <LinkIcon size={20} className="text-purple-500" />;
      case 'output': return <FileOutput size={20} className="text-emerald-500" />;
      default: return <Settings size={20} className="text-slate-500" />;
    }
  };

  const renderNodeTitle = (type: string) => {
    switch (type) {
      case 'input': return 'Data Sources';
      case 'mapping': return 'Data Mapping';
      case 'output': return 'Export PDF';
      default: return 'Node';
    }
  };

  const selectedNode = nodes.find(n => n.id === selectedNodeId);

  // Test Run State
  const [isTesting, setIsTesting] = useState(false);
  const [testLogs, setTestLogs] = useState<{message: string, status: 'pending'|'success'|'error'}[]>([]);
  const [testStatus, setTestStatus] = useState<'idle'|'running'|'completed'|'failed'>('idle');

  const handleTestRun = () => {
    setIsTesting(true);
    setTestStatus('running');
    setTestLogs([{ message: 'Initializing workflow engine...', status: 'pending' }]);

    setTimeout(() => {
      setTestLogs(prev => [{ message: 'Initializing workflow engine...', status: 'success' }, { message: 'Reading data from sources...', status: 'pending' }]);
      
      setTimeout(() => {
        const inputNodes = nodes.filter(n => n.type === 'input');
        const hasFiles = inputNodes.some(n => n.data.files?.length > 0);
        if (!hasFiles) {
          setTestLogs(prev => {
            const newLogs = [...prev];
            newLogs[newLogs.length - 1].status = 'error';
            newLogs.push({ message: 'Error: No data sources selected.', status: 'error' });
            return newLogs;
          });
          setTestStatus('failed');
          return;
        }

        setTestLogs(prev => {
          const newLogs = [...prev];
          newLogs[newLogs.length - 1].status = 'success';
          newLogs.push({ message: 'Applying mapping rules...', status: 'pending' });
          return newLogs;
        });

        setTimeout(() => {
          const mappingNode = nodes.find(n => n.type === 'mapping');
          if (!mappingNode?.data.templateId) {
            setTestLogs(prev => {
              const newLogs = [...prev];
              newLogs[newLogs.length - 1].status = 'error';
              newLogs.push({ message: 'Error: No template selected for mapping.', status: 'error' });
              return newLogs;
            });
            setTestStatus('failed');
            return;
          }

          setTestLogs(prev => {
            const newLogs = [...prev];
            newLogs[newLogs.length - 1].status = 'success';
            newLogs.push({ message: 'Generating output...', status: 'pending' });
            return newLogs;
          });

          setTimeout(() => {
             setTestLogs(prev => {
              const newLogs = [...prev];
              newLogs[newLogs.length - 1].status = 'success';
              newLogs.push({ message: 'Test completed successfully!', status: 'success' });
              return newLogs;
            });
            setTestStatus('completed');
          }, 1000);
        }, 1000);
      }, 1000);
    }, 800);
  };

  return (
    <div className="flex flex-col h-full bg-slate-50 overflow-hidden">
      {/* Data Source Selection Modal */}
      {isDataSourceModalOpen && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-[600px] max-w-[90vw] max-h-[80vh] flex flex-col">
            <div className="px-6 py-4 border-b border-slate-200 flex justify-between items-center">
              <h3 className="font-bold text-slate-800 text-lg">Select Data Source</h3>
              <button onClick={() => setIsDataSourceModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X size={20} />
              </button>
            </div>
            <div className="p-6 overflow-y-auto flex-1">
              <p className="text-sm text-slate-500 mb-4">Select extracted files from your tracking list to use as input data.</p>
              <div className="space-y-3">
                {trackingItems.filter(item => item.reviewStatus !== ReviewStatus.UNREAD && item.reviewStatus !== ReviewStatus.READING).length === 0 ? (
                  <div className="text-center py-8 text-slate-500 text-sm">
                    No extracted files available. Please extract files in the Tracking page first.
                  </div>
                ) : (
                  trackingItems
                    .filter(item => item.reviewStatus !== ReviewStatus.UNREAD && item.reviewStatus !== ReviewStatus.READING)
                    .map(item => {
                      const inputNode = nodes.find(n => n.id === selectedNodeId);
                      const isSelected = inputNode?.data.files?.some((f: any) => f.id === item.id);
                      
                      return (
                        <div 
                          key={item.id}
                          onClick={() => {
                            if (!inputNode) return;
                            const currentFiles = inputNode.data.files || [];
                            let newFiles;
                            if (isSelected) {
                              newFiles = currentFiles.filter((f: any) => f.id !== item.id);
                            } else {
                              newFiles = [...currentFiles, {
                                id: item.id,
                                name: item.fileName,
                                fields: getMockFieldsForDocType(item.docType)
                              }];
                            }
                            updateNodeData(inputNode.id, { files: newFiles });
                          }}
                          className={`flex items-center justify-between p-4 border rounded-2xl cursor-pointer transition-all ${isSelected ? 'border-blue-500 bg-blue-50 ring-1 ring-blue-500' : 'border-slate-200 hover:border-blue-300 bg-white'}`}
                        >
                          <div className="flex items-center gap-4">
                            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${isSelected ? 'bg-blue-100 text-blue-600' : 'bg-slate-100 text-slate-500'}`}>
                              <FileText size={20} />
                            </div>
                            <div>
                              <h4 className={`font-bold text-sm ${isSelected ? 'text-blue-800' : 'text-slate-700'}`}>{item.fileName}</h4>
                              <div className="flex items-center gap-2 mt-1">
                                <span className="text-[10px] bg-slate-200 text-slate-600 px-2 py-0.5 rounded uppercase font-bold tracking-wider">{item.docType}</span>
                                <span className="text-xs text-slate-500">{item.date}</span>
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-mono text-slate-400">{getMockFieldsForDocType(item.docType).length} fields</span>
                            <div className={`w-5 h-5 rounded-full border flex items-center justify-center ${isSelected ? 'bg-blue-500 border-blue-500 text-white' : 'border-slate-300'}`}>
                              {isSelected && <CheckCircle2 size={14} />}
                            </div>
                          </div>
                        </div>
                      );
                    })
                )}
              </div>
            </div>
            <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex justify-end">
              <button 
                onClick={() => setIsDataSourceModalOpen(false)}
                className="px-6 py-2 bg-blue-500 text-white rounded-[4px] font-medium hover:bg-blue-600 transition-colors"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Test Run Modal */}
      {isTesting && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-[500px] max-w-[90vw] overflow-hidden flex flex-col">
            <div className="px-6 py-4 border-b border-slate-200 flex justify-between items-center bg-slate-50">
              <h3 className="font-bold text-slate-800 flex items-center gap-2">
                <Play size={18} className="text-blue-500" />
                Workflow Test Run
              </h3>
              {testStatus !== 'running' && (
                <button onClick={() => setIsTesting(false)} className="text-slate-400 hover:text-slate-600">
                  <X size={20} />
                </button>
              )}
            </div>
            <div className="p-8 bg-white h-[350px] overflow-y-auto flex flex-col gap-6">
              {testLogs.map((log, idx) => {
                const isLast = idx === testLogs.length - 1;
                const isSuccess = log.status === 'success';
                const isError = log.status === 'error';
                const isPending = log.status === 'pending';
                
                return (
                  <div key={idx} className="relative flex gap-4">
                    {/* Timeline Line */}
                    {!isLast && (
                      <div className={`absolute left-[11px] top-8 bottom-[-24px] w-[2px] ${isSuccess ? 'bg-emerald-200' : 'bg-slate-100'}`}></div>
                    )}
                    
                    {/* Status Icon */}
                    <div className={`relative z-10 w-6 h-6 rounded-full flex items-center justify-center shrink-0 mt-0.5
                      ${isSuccess ? 'bg-emerald-100 text-emerald-600' : 
                        isError ? 'bg-red-100 text-red-600' : 
                        'bg-blue-100 text-blue-600 animate-pulse'}
                    `}>
                      {isSuccess && <CheckCircle2 size={14} />}
                      {isError && <AlertCircle size={14} />}
                      {isPending && <div className="w-2 h-2 bg-blue-500 rounded-full"></div>}
                    </div>
                    
                    {/* Content */}
                    <div className="flex-1">
                      <p className={`font-medium ${isError ? 'text-red-600' : 'text-slate-800'}`}>
                        {log.message}
                      </p>
                      <p className="text-xs text-slate-400 mt-1">
                        {new Date().toLocaleTimeString()}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex justify-end">
              <button 
                onClick={() => setIsTesting(false)}
                disabled={testStatus === 'running'}
                className={`px-4 py-2 rounded-[4px] font-medium transition-colors ${testStatus === 'running' ? 'bg-slate-200 text-slate-400 cursor-not-allowed' : 'bg-blue-500 text-white hover:bg-blue-600'}`}
              >
                {testStatus === 'running' ? 'Running...' : 'Close'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="bg-white border-b border-slate-200 shrink-0 z-10 shadow-sm">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center px-6 py-4 gap-4">
          <div className="flex items-center gap-4 flex-1 min-w-0 w-full">
            <button 
              onClick={onBack}
              className="p-2 hover:bg-slate-100 rounded-[4px] text-slate-500 transition-all shrink-0"
            >
              <ArrowLeft size={20} />
            </button>
            <div className="h-8 w-px bg-slate-100 mx-1 shrink-0"></div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3">
                <input 
                  type="text" 
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="text-lg md:text-xl font-black text-slate-800 bg-transparent border-none focus:outline-none p-0 hover:bg-slate-50 rounded px-2 focus:bg-slate-50 block w-full truncate"
                  placeholder="Workflow Name"
                />
                <div className="flex items-center gap-2 shrink-0 select-none">
                  <span className="text-[10px] font-black text-slate-500 uppercase tracking-tight">
                    {workflow?.status === 'ACTIVE' ? 'Active' : 'Inactive'}
                  </span>
                  <button 
                    onClick={() => {
                      if (workflow) {
                        const newStatus = workflow.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
                        if (newStatus === 'ACTIVE') {
                          if (checkWorkflowIncompleteLocal()) {
                            setConfirmToggleDialog(true);
                            return;
                          }
                        }
                        onSave({ ...workflow, status: newStatus });
                      }
                    }}
                    className={`relative inline-flex h-4 w-7 items-center rounded-[4px] transition-colors focus:outline-none ${
                      workflow?.status === 'ACTIVE' ? 'bg-emerald-500' : 'bg-slate-300'
                    }`}
                  >
                    <span 
                      className={`inline-block h-2.5 w-2.5 transform rounded-full bg-white transition-transform ${
                        workflow?.status === 'ACTIVE' ? 'translate-x-4' : 'translate-x-0.5'
                      }`}
                    />
                  </button>
                </div>
              </div>
              <input 
                type="text" 
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="text-xs text-slate-500 bg-transparent border-none focus:outline-none p-0 hover:bg-slate-50 rounded px-2 w-full mt-0.5 focus:bg-slate-50 block truncate"
                placeholder="Add a description..."
              />
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3 md:gap-4 shrink-0 w-full sm:w-auto">
            <button 
              onClick={handleTestRun}
              className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 text-slate-600 rounded-[4px] font-black text-xs uppercase tracking-widest hover:bg-slate-50 transition-all shadow-sm active:scale-95 group shrink-0"
            >
              <Play size={16} className="text-blue-500 group-hover:scale-110 transition-transform" />
              <span>Test Run</span>
            </button>
            <button 
              onClick={handleSave}
              className="flex items-center gap-3 px-4 md:px-8 py-2 bg-blue-600 text-white rounded-[4px] font-black text-xs md:text-sm hover:bg-blue-700 transition-all shadow-[0_8px_20px_-4px_rgba(37,99,235,0.4)] active:scale-95 group shrink-0"
            >
              <Save size={18} className="group-hover:scale-110 transition-transform" />
              <span>Save Workflow</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Workspace */}
      <div className="flex-1 flex overflow-hidden relative">
        
        {/* Canvas Area */}
        <div 
          ref={canvasRef}
          className="flex-1 bg-slate-100 relative overflow-hidden cursor-grab active:cursor-grabbing"
          style={{
            backgroundImage: 'radial-gradient(#cbd5e1 1px, transparent 1px)',
            backgroundSize: '20px 20px',
            backgroundPosition: `${pan.x}px ${pan.y}px`
          }}
          onMouseDown={handleCanvasMouseDown}
          onMouseMove={handleCanvasMouseMove}
          onMouseUp={handleCanvasMouseUp}
          onMouseLeave={handleCanvasMouseUp}
        >
          {/* Floating Toolbar - Moved to Top Left for better UX */}
          <div className="absolute top-6 left-6 z-20 flex flex-col gap-4">
            <button 
              onClick={(e) => {
                e.stopPropagation();
                const newNodeId = `node-${Date.now()}`;
                const mappingNode = nodes.find(n => n.type === 'mapping');
                
                // Find a good position (below the lowest input node)
                const inputNodes = nodes.filter(n => n.type === 'input');
                const maxY = inputNodes.length > 0 
                  ? Math.max(...inputNodes.map(n => n.position.y)) 
                  : 50;
                
                // Adjust position based on current pan to make it appear in view
                const x = 100 - pan.x;
                const y = (maxY + 150) - pan.y;

                setNodes(prev => [
                  ...prev,
                  { id: newNodeId, type: 'input', position: { x, y }, data: { files: [] } }
                ]);
                
                if (mappingNode) {
                  setEdges(prev => [
                    ...prev,
                    { id: `edge-${Date.now()}`, source: newNodeId, target: mappingNode.id }
                  ]);
                }
                
                setSelectedNodeId(newNodeId);
              }}
              className="flex items-center gap-4 px-6 py-4 bg-[#0ea5e9] text-white shadow-lg rounded-[4px] text-sm font-black uppercase tracking-tight hover:bg-[#0284c7] transition-all transform hover:scale-105 active:scale-95"
            >
              <Plus size={18} strokeWidth={3} />
              Add Data Source
            </button>
            
            <div className="bg-white/80 backdrop-blur-sm border border-slate-200 rounded-2xl p-4 flex flex-col gap-4 shadow-sm">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Canvas Controls</p>
              <button 
                onClick={(e) => { e.stopPropagation(); setPan({ x: 0, y: 0 }); }}
                className="text-[10px] font-black text-slate-600 hover:text-blue-600 px-1 py-1 rounded-[4px] hover:bg-slate-100 text-left uppercase tracking-wider"
              >
                Reset View
              </button>
            </div>
          </div>

          {/* Panned Content Wrapper */}
          <div 
            className="absolute inset-0 pointer-events-none"
            style={{ 
              transform: `translate(${pan.x}px, ${pan.y}px)`,
              transition: draggingNodeId || isPanning ? 'none' : 'transform 0.1s ease-out'
            }}
          >
            {/* Edges (SVG) */}
            <svg className="absolute inset-0 w-[5000px] h-[5000px] pointer-events-none z-0">
              {edges.map(edge => {
                const sourceNode = nodes.find(n => n.id === edge.source);
                const targetNode = nodes.find(n => n.id === edge.target);
                if (!sourceNode || !targetNode) return null;

                const startX = sourceNode.position.x + 250; // Node width
                const startY = sourceNode.position.y + 34;  // Center of header
                const endX = targetNode.position.x;
                const endY = targetNode.position.y + 34;

                // Bezier curve
                const cp1X = startX + 50;
                const cp1Y = startY;
                const cp2X = endX - 50;
                const cp2Y = endY;

                return (
                  <path 
                    key={edge.id}
                    d={`M ${startX} ${startY} C ${cp1X} ${cp1Y}, ${cp2X} ${cp2Y}, ${endX} ${endY}`}
                    fill="none"
                    stroke="#94a3b8"
                    strokeWidth="2"
                    className="animate-pulse"
                  />
                );
              })}
            </svg>

            {/* Nodes Container */}
            <div className="absolute inset-0 pointer-events-auto">
              {nodes.map(node => (
                <div 
                  key={node.id}
                  onClick={(e) => { e.stopPropagation(); setSelectedNodeId(node.id); }}
                  onMouseDown={(e) => handleNodeMouseDown(e, node.id)}
                  className={`absolute w-[250px] bg-white rounded-2xl shadow-md border-2 cursor-grab active:cursor-grabbing z-10
                    ${selectedNodeId === node.id ? 'border-blue-500 ring-4 ring-blue-500/20' : 'border-slate-200 hover:border-slate-300'}
                    ${draggingNodeId === node.id ? 'opacity-90 shadow-xl scale-[1.02] z-20' : ''}
                  `}
                  style={{ 
                    transform: `translate(${node.position.x}px, ${node.position.y}px)`,
                    transition: draggingNodeId === node.id ? 'none' : 'transform 0.1s ease-out'
                  }}
                >
                  <div className="flex items-center gap-4 p-4 border-b border-slate-100">
                    <div className={`p-3 rounded-2xl ${
                      node.type === 'input' ? 'bg-blue-50' : 
                      node.type === 'mapping' ? 'bg-purple-50' : 'bg-emerald-50'
                    }`}>
                      {renderNodeIcon(node.type)}
                    </div>
                    <div className="flex-1">
                      <h3 className="font-black text-slate-800 text-[13px] uppercase tracking-tight leading-none mb-1">{renderNodeTitle(node.type)}</h3>
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none">{node.type} node</p>
                    </div>
                  </div>
                  
                  <div className="p-4 text-xs text-slate-600 bg-slate-50/50 rounded-b-2xl">
                    {node.type === 'input' && (
                      <div className="flex flex-col gap-4">
                        <div className="flex items-center gap-4 px-1">
                          <FileSpreadsheet size={16} className="text-slate-400" />
                          <span className="font-black text-[10px] uppercase tracking-widest text-slate-500">{node.data.files?.length || 0} files selected</span>
                        </div>
                        {node.data.files?.map((file: any) => (
                          <div key={file.id} className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
                            <div className="font-black text-xs text-slate-700 mb-2 truncate uppercase tracking-tight">{file.name}</div>
                            <div className="flex flex-wrap gap-4">
                              {file.fields.map((field: string) => (
                                <span key={field} className="px-2 py-1 bg-blue-50 text-blue-600 rounded-lg text-[9px] font-black border border-blue-100 uppercase tracking-tight">
                                  {field}
                                </span>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                    {node.type === 'mapping' && (
                      <div className="flex items-center gap-4 p-2">
                        <LinkIcon size={16} className="text-slate-400" />
                        <span className="font-black text-[10px] uppercase tracking-widest text-slate-500">{node.data.templateId ? 'Template selected' : 'No template'}</span>
                      </div>
                    )}
                    {node.type === 'output' && (
                      <div className="flex items-center gap-4 p-2">
                        <FileOutput size={16} className="text-slate-400" />
                        <span className="font-black text-[10px] uppercase tracking-widest text-slate-500">Export as {node.data.format?.toUpperCase() || 'PDF'}</span>
                      </div>
                    )}
                  </div>

                  {/* Connection Points */}
                  {node.type !== 'input' && (
                    <div className="absolute left-0 top-[34px] -translate-x-1/2 -translate-y-1/2 w-3 h-3 bg-white border-2 border-slate-300 rounded-full"></div>
                  )}
                  {node.type !== 'output' && (
                    <div className="absolute right-0 top-[34px] translate-x-1/2 -translate-y-1/2 w-3 h-3 bg-white border-2 border-slate-300 rounded-full"></div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Properties Sidebar */}
        <div className={`w-[400px] bg-white border-l border-slate-200 shadow-xl z-20 transition-transform duration-300 flex flex-col ${selectedNodeId ? 'translate-x-0' : 'translate-x-full absolute right-0 h-full'}`}>
          {selectedNode && (
            <>
              <div className="flex items-center justify-between p-4 border-b border-slate-200 bg-slate-50">
                <div className="flex items-center gap-3">
                  {renderNodeIcon(selectedNode.type)}
                  <h2 className="font-bold text-slate-800">{renderNodeTitle(selectedNode.type)}</h2>
                </div>
                <div className="flex items-center gap-2">
                  {selectedNode.type === 'input' && nodes.filter(n => n.type === 'input').length > 1 && (
                    <button 
                      onClick={() => {
                        setNodes(prev => prev.filter(n => n.id !== selectedNode.id));
                        setEdges(prev => prev.filter(e => e.source !== selectedNode.id && e.target !== selectedNode.id));
                        setSelectedNodeId(null);
                      }}
                      className="p-1 hover:bg-red-100 text-red-500 rounded-[4px] transition-colors"
                      title="Delete Node"
                    >
                      <Trash2 size={16} />
                    </button>
                  )}
                  <button 
                    onClick={() => setSelectedNodeId(null)}
                    className="p-1 hover:bg-slate-200 rounded-[4px] text-slate-500 transition-colors"
                  >
                    <X size={16} />
                  </button>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-6">
                
                {/* INPUT NODE PROPERTIES */}
                {selectedNode.type === 'input' && (
                  <div className="space-y-6">
                    <div>
                      <h3 className="text-sm font-bold text-slate-800 mb-2">Data Sources</h3>
                      <p className="text-xs text-slate-500 mb-4">Select files or folders to use as input data for this workflow.</p>
                      
                      <div className="space-y-4">
                        {selectedNode.data.files?.map((ds: any) => {
                          return (
                            <div 
                              key={ds.id} 
                              className="p-3 border rounded-lg bg-white border-blue-500 ring-1 ring-blue-500 relative"
                            >
                              <button 
                                onClick={() => {
                                  const newFiles = selectedNode.data.files.filter((f: any) => f.id !== ds.id);
                                  updateNodeData(selectedNode.id, { files: newFiles });
                                }}
                                className="absolute top-2 right-2 text-slate-400 hover:text-red-500"
                              >
                                <X size={14} />
                              </button>
                              <div className="flex items-center justify-between mb-2 pr-6">
                                <div className="flex items-center gap-3">
                                  <FileSpreadsheet size={16} className="text-blue-500" />
                                  <span className="text-sm font-medium text-blue-700 truncate max-w-[150px]">{ds.name}</span>
                                </div>
                                <div className="text-[10px] bg-slate-100 text-slate-500 px-2 py-1 rounded font-mono shrink-0">
                                  {ds.fields.length} fields
                                </div>
                              </div>
                              <div className="flex flex-wrap gap-1 mt-2 pt-2 border-t border-slate-100">
                                {ds.fields.map((field: string) => (
                                  <span key={field} className="px-1.5 py-0.5 bg-slate-100 text-slate-600 rounded text-[10px] font-mono">
                                    {field}
                                  </span>
                                ))}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                      
                      <button 
                        onClick={() => setIsDataSourceModalOpen(true)}
                        className="mt-4 w-full py-2 border-2 border-dashed border-slate-300 rounded-[4px] text-slate-500 font-bold text-xs flex items-center justify-center gap-2 hover:border-blue-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                      >
                        <Plus size={14} />
                        Add Data Source
                      </button>
                    </div>
                  </div>
                )}

                {/* MAPPING NODE PROPERTIES */}
                {selectedNode.type === 'mapping' && (
                  <div className="space-y-6">
                    <div>
                      <label className="block text-sm font-bold text-slate-800 mb-2">Target Template</label>
                      <select 
                        className="w-full p-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm bg-white"
                        value={selectedNode.data.templateId || ''}
                        onChange={(e) => {
                          const newTemplateId = e.target.value;
                          const template = TEMPLATES.find(t => t.id === newTemplateId);
                          let newMappings: any[] = [];
                          
                          if (template) {
                            const inputNodes = nodes.filter(n => n.type === 'input');
                            const availableFiles = inputNodes.flatMap(n => n.data.files || []);
                            
                            // Auto-mapping logic
                            template.fields.forEach(field => {
                              for (const file of availableFiles) {
                                const matchedField = file.fields.find((f: string) => 
                                  f.toLowerCase().includes(field.name.toLowerCase()) || 
                                  field.name.toLowerCase().includes(f.toLowerCase())
                                );
                                if (matchedField) {
                                  newMappings.push({
                                    targetField: field.id,
                                    sourceFileId: file.id,
                                    sourceField: matchedField
                                  });
                                  break;
                                }
                              }
                            });
                          }
                          
                          updateNodeData(selectedNode.id, { templateId: newTemplateId, mappings: newMappings, customFields: [] });
                        }}
                      >
                        <option value="">-- Select Template --</option>
                        {TEMPLATES.map(t => (
                          <option key={t.id} value={t.id}>{t.name}</option>
                        ))}
                      </select>
                    </div>

                    {selectedNode.data.templateId && (
                      <div>
                        {/* PDF Layout Preview */}
                        <div className="mb-6">
                          <h3 className="text-sm font-bold text-slate-800 mb-2">PDF Layout Preview</h3>
                          <div className="relative w-full aspect-[1/1.414] bg-white border border-slate-200 shadow-sm rounded-sm overflow-hidden">
                            {/* Mock PDF Header */}
                            <div className="absolute top-4 left-4 right-4 h-8 border-b-2 border-slate-100 flex justify-between items-end pb-1">
                              <div className="w-24 h-4 bg-slate-200 rounded"></div>
                              <div className="w-16 h-4 bg-slate-200 rounded"></div>
                            </div>
                            
                            {/* Render Fields on Layout */}
                            {TEMPLATES.find(t => t.id === selectedNode.data.templateId)?.fields.map(field => {
                              const isMapped = selectedNode.data.mappings?.some((m: any) => m.targetField === field.id);
                              return (
                                <div 
                                  key={`layout-${field.id}`}
                                  className={`absolute border-2 rounded text-[8px] font-bold flex items-center justify-center overflow-hidden transition-colors ${
                                    isMapped 
                                      ? 'bg-emerald-100/50 border-emerald-400 text-emerald-700' 
                                      : 'bg-amber-100/50 border-amber-400 text-amber-700 border-dashed'
                                  }`}
                                  style={{
                                    top: field.layout?.top || '50%',
                                    left: field.layout?.left || '50%',
                                    width: field.layout?.width || '20%',
                                    height: '24px'
                                  }}
                                  title={field.name}
                                >
                                  {field.name}
                                </div>
                              );
                            })}
                          </div>
                          <div className="flex items-center gap-4 mt-2 text-[10px] text-slate-500 justify-center">
                            <div className="flex items-center gap-1"><div className="w-2 h-2 bg-emerald-400 rounded-full"></div> Mapped</div>
                            <div className="flex items-center gap-1"><div className="w-2 h-2 bg-amber-400 rounded-full"></div> Unmapped</div>
                          </div>
                        </div>

                        <div className="flex items-center justify-between mb-4">
                          <h3 className="text-sm font-bold text-slate-800">Field Mapping</h3>
                          <span className="text-[10px] bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">
                            Auto-mapped: {selectedNode.data.mappings?.length || 0}
                          </span>
                        </div>
                        
                        <div className="space-y-3">
                          {/* Standard Template Fields */}
                          {TEMPLATES.find(t => t.id === selectedNode.data.templateId)?.fields.map(field => {
                            const mapping = selectedNode.data.mappings?.find((m: any) => m.targetField === field.id);
                            const inputNodes = nodes.filter(n => n.type === 'input');
                            const availableFiles = inputNodes.flatMap(n => n.data.files || []);

                            return (
                              <div key={field.id} className={`p-3 border rounded-lg bg-white ${mapping ? 'border-slate-200' : 'border-dashed border-slate-300'}`}>
                                <div className="flex items-center justify-between mb-2">
                                  <span className="text-xs font-bold text-slate-700">{field.name}</span>
                                  {field.required && <span className="text-[10px] text-red-500 flex items-center gap-1"><AlertCircle size={10}/> Required</span>}
                                </div>
                                <div className="flex items-center gap-2">
                                  <select 
                                    className="flex-1 p-1.5 border border-slate-200 rounded text-xs bg-slate-50"
                                    value={mapping ? `${mapping.sourceFileId}::${mapping.sourceField}` : ''}
                                    onChange={(e) => {
                                      const val = e.target.value;
                                      let newMappings = [...(selectedNode.data.mappings || [])];
                                      if (!val) {
                                        newMappings = newMappings.filter((m: any) => m.targetField !== field.id);
                                      } else {
                                        const [sourceFileId, sourceField] = val.split('::');
                                        const existingIdx = newMappings.findIndex((m: any) => m.targetField === field.id);
                                        if (existingIdx >= 0) {
                                          newMappings[existingIdx] = { targetField: field.id, sourceFileId, sourceField };
                                        } else {
                                          newMappings.push({ targetField: field.id, sourceFileId, sourceField });
                                        }
                                      }
                                      updateNodeData(selectedNode.id, { mappings: newMappings });
                                    }}
                                  >
                                    <option value="">Select source field...</option>
                                    {availableFiles.map((file: any) => (
                                      <optgroup key={file.id} label={file.name}>
                                        {file.fields.map((f: string) => (
                                          <option key={`${file.id}::${f}`} value={`${file.id}::${f}`}>{f}</option>
                                        ))}
                                      </optgroup>
                                    ))}
                                  </select>
                                </div>
                                {mapping && (
                                  <div className="mt-2 flex items-center gap-1 text-[10px] text-slate-400">
                                    <Database size={10} /> Source: {availableFiles.find((f: any) => f.id === mapping.sourceFileId)?.name || 'Unknown'}
                                  </div>
                                )}
                              </div>
                            );
                          })}

                          {/* Custom Fields */}
                          {selectedNode.data.customFields?.map((customField: any) => {
                            const mapping = selectedNode.data.mappings?.find((m: any) => m.targetField === customField.id);
                            const inputNodes = nodes.filter(n => n.type === 'input');
                            const availableFiles = inputNodes.flatMap(n => n.data.files || []);

                            return (
                              <div key={customField.id} className={`p-3 border rounded-lg bg-white relative ${mapping ? 'border-slate-200' : 'border-dashed border-slate-300'}`}>
                                <button 
                                  onClick={() => {
                                    const newCustomFields = selectedNode.data.customFields.filter((f: any) => f.id !== customField.id);
                                    const newMappings = selectedNode.data.mappings.filter((m: any) => m.targetField !== customField.id);
                                    updateNodeData(selectedNode.id, { customFields: newCustomFields, mappings: newMappings });
                                  }}
                                  className="absolute top-2 right-2 text-slate-400 hover:text-red-500"
                                >
                                  <X size={14} />
                                </button>
                                <div className="flex items-center justify-between mb-2 pr-6">
                                  <span className="text-xs font-bold text-slate-700">{customField.name} <span className="text-[10px] font-normal text-slate-400">(Custom)</span></span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <select 
                                    className="flex-1 p-1.5 border border-slate-200 rounded text-xs bg-slate-50"
                                    value={mapping ? `${mapping.sourceFileId}::${mapping.sourceField}` : ''}
                                    onChange={(e) => {
                                      const val = e.target.value;
                                      let newMappings = [...(selectedNode.data.mappings || [])];
                                      if (!val) {
                                        newMappings = newMappings.filter((m: any) => m.targetField !== customField.id);
                                      } else {
                                        const [sourceFileId, sourceField] = val.split('::');
                                        const existingIdx = newMappings.findIndex((m: any) => m.targetField === customField.id);
                                        if (existingIdx >= 0) {
                                          newMappings[existingIdx] = { targetField: customField.id, sourceFileId, sourceField };
                                        } else {
                                          newMappings.push({ targetField: customField.id, sourceFileId, sourceField });
                                        }
                                      }
                                      updateNodeData(selectedNode.id, { mappings: newMappings });
                                    }}
                                  >
                                    <option value="">Select source field...</option>
                                    {availableFiles.map((file: any) => (
                                      <optgroup key={file.id} label={file.name}>
                                        {file.fields.map((f: string) => (
                                          <option key={`${file.id}::${f}`} value={`${file.id}::${f}`}>{f}</option>
                                        ))}
                                      </optgroup>
                                    ))}
                                  </select>
                                </div>
                                {mapping && (
                                  <div className="mt-2 flex items-center gap-1 text-[10px] text-slate-400">
                                    <Database size={10} /> Source: {availableFiles.find((f: any) => f.id === mapping.sourceFileId)?.name || 'Unknown'}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                        
                        <div className="mt-4 relative">
                          <select 
                            className="w-full py-2 pl-8 pr-4 border border-dashed border-slate-300 rounded-lg text-slate-500 font-bold text-xs bg-slate-50 hover:border-blue-400 hover:text-blue-600 hover:bg-blue-50 transition-colors appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                            value=""
                            onChange={(e) => {
                              const val = e.target.value;
                              if (!val) return;
                              
                              if (val === 'custom') {
                                const fieldName = window.prompt("Enter custom field name:");
                                if (fieldName) {
                                  const newField = { id: `custom-${Date.now()}`, name: fieldName };
                                  updateNodeData(selectedNode.id, { 
                                    customFields: [...(selectedNode.data.customFields || []), newField] 
                                  });
                                }
                              } else {
                                const [sourceFileId, sourceField] = val.split('::');
                                const newFieldId = `custom-${Date.now()}`;
                                const newField = { id: newFieldId, name: sourceField };
                                
                                const newMappings = [...(selectedNode.data.mappings || []), {
                                  targetField: newFieldId,
                                  sourceFileId,
                                  sourceField
                                }];
                                
                                updateNodeData(selectedNode.id, { 
                                  customFields: [...(selectedNode.data.customFields || []), newField],
                                  mappings: newMappings
                                });
                              }
                            }}
                          >
                            <option value="" disabled hidden>Add Custom Field...</option>
                            <option value="custom">+ Create New Custom Field</option>
                            {nodes.filter(n => n.type === 'input').flatMap(n => n.data.files || []).map((file: any) => (
                              <optgroup key={file.id} label={`From ${file.name}`}>
                                {file.fields.map((f: string) => {
                                  // Check if already mapped to a custom field with the same name
                                  const isAlreadyAdded = selectedNode.data.customFields?.some((cf: any) => cf.name === f);
                                  if (isAlreadyAdded) return null;
                                  return <option key={`${file.id}::${f}`} value={`${file.id}::${f}`}>Add "{f}"</option>;
                                })}
                              </optgroup>
                            ))}
                          </select>
                          <Plus size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* OUTPUT NODE PROPERTIES */}
                {selectedNode.type === 'output' && (
                  <div className="space-y-6">
                    <div>
                      <label className="block text-sm font-bold text-slate-800 mb-2">Export Format</label>
                      <select 
                        className="w-full p-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm bg-white"
                        value={selectedNode.data.format || 'pdf'}
                        onChange={(e) => updateNodeData(selectedNode.id, { format: e.target.value })}
                      >
                        <option value="pdf">PDF Document (.pdf)</option>
                        <option value="json">JSON Data (.json)</option>
                        <option value="xml">XML Data (.xml)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-bold text-slate-800 mb-2">Destination System</label>
                      <select 
                        className="w-full p-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm bg-white"
                        value={selectedNode.data.destination || ''}
                        onChange={(e) => updateNodeData(selectedNode.id, { destination: e.target.value })}
                      >
                        <option value="">-- Select Destination --</option>
                        <option value="erp">ERP System (API)</option>
                        <option value="email">Email to Finance</option>
                        <option value="drive">Save to Supply Chain Drive</option>
                      </select>
                    </div>
                    
                    <div className="p-4 bg-blue-50 border border-blue-100 rounded-lg">
                      <h4 className="text-xs font-bold text-blue-800 mb-1 flex items-center gap-1"><CheckCircle2 size={14}/> Ready to Export</h4>
                      <p className="text-[10px] text-blue-600">The mapped data will be injected into the selected template and exported as a {selectedNode.data.format?.toUpperCase() || 'PDF'} document.</p>
                    </div>
                  </div>
                )}

              </div>
            </>
          )}
        </div>
      </div>
      {/* Modal Confirm Toggle Status */}
      <AnimatePresence>
        {confirmToggleDialog && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[3000] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm"
          >
            <motion.div 
              initial={{ scale: 0.95, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 20 }}
              className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden border border-slate-100 text-center"
            >
              <div className="p-6">
                <div className="flex items-center justify-center mx-auto mb-4 text-amber-500">
                  <AlertCircle size={48} />
                </div>
                <h3 className="text-xl font-black text-[#010136] tracking-tight leading-tight mb-2">
                  {language === 'TH' ? 'เวิร์กโฟลว์ยังตั้งค่าไม่สมบูรณ์' : 'Incomplete Configuration'}
                </h3>
                <p className="text-xs font-semibold text-slate-500 leading-relaxed w-full mb-6">
                  {language === 'TH' 
                    ? 'workflow นี้ยังมี node ที่ config ไม่ครบ ต้องการ enable ต่อไปหรือไม่?'
                    : 'This workflow still has incomplete nodes. Are you sure you want to proceed and enable it?'}
                </p>
                <div className="flex gap-3">
                  <button 
                    onClick={() => setConfirmToggleDialog(false)}
                    className="flex-1 py-2.5 border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 rounded-[4px] font-bold text-xs uppercase tracking-widest transition-all cursor-pointer h-[40px]"
                  >
                    {language === 'TH' ? 'ยกเลิก' : 'Cancel'}
                  </button>
                  <button 
                    onClick={() => {
                      if (workflow) {
                        onSave({ ...workflow, status: 'ACTIVE' });
                      }
                      setConfirmToggleDialog(false);
                    }}
                    className="flex-1 py-2.5 bg-[#1F5DF9] hover:bg-[#104BE3] text-white rounded-[4px] font-bold text-xs uppercase tracking-widest transition-all shadow-md cursor-pointer h-[40px]"
                  >
                    {language === 'TH' ? 'ยืนยันการเปิดใช้งาน' : 'Confirm Enable'}
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
