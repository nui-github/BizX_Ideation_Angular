import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzInputModule } from 'ng-zorro-antd/input';
import { LucideAngularModule } from 'lucide-angular';
import { WorkflowService } from '../../../core/services/workflow.service';
import { Workflow, WorkflowNode, Language, DocType } from '../../../core/models/types.model';

@Component({
  selector: 'app-workflow-builder',
  standalone: true,
  imports: [CommonModule, FormsModule, NzButtonModule, NzInputModule, LucideAngularModule],
  templateUrl: './workflow-builder.component.html',
  styleUrls: ['./workflow-builder.component.scss']
})
export class WorkflowBuilderComponent implements OnInit, OnDestroy {
  activeWorkflow: Workflow | null = null;
  docTypes: DocType[] = [];
  language: Language = 'TH';
  
  // Builder Drawer States
  drawerNodeId: string | null = null;
  
  private destroy$ = new Subject<void>();

  constructor(private workflowService: WorkflowService) {}

  ngOnInit(): void {
    // 1. Fetch Workflows through our clean Service layer
    this.workflowService.getComparisonWorkflows()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (workflows) => {
          if (workflows && workflows.length > 0) {
            // Pick 'cwf-1' as the default editing workflow
            this.activeWorkflow = { ...workflows[0] };
          }
        }
      });

    // 2. Fetch Doc Types
    this.workflowService.getDocTypes()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (docTypes) => {
          this.docTypes = docTypes;
        }
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // Node data updation handler
  updateNodeData(nodeId: string, updates: Record<string, any>): void {
    if (!this.activeWorkflow) return;
    
    this.activeWorkflow.nodes = this.activeWorkflow.nodes.map(node => {
      if (node.id === nodeId) {
        return {
          ...node,
          data: {
            ...node.data,
            ...updates
          }
        };
      }
      return node;
    });
  }

  // Opens node config panel in Drawer overlay
  openNodeConfig(nodeId: string): void {
    this.drawerNodeId = nodeId;
  }

  closeNodeConfig(): void {
    this.drawerNodeId = null;
  }

  get selectedNode(): WorkflowNode | undefined {
    if (!this.activeWorkflow || !this.drawerNodeId) return undefined;
    return this.activeWorkflow.nodes.find(n => n.id === this.drawerNodeId);
  }

  // Dynamic template string evaluator mirroring parseStorageTemplate
  parseStorageTemplate(template: string): string {
    if (!template) return '';
    return template
      .replace(/{year}/g, '2026')
      .replace(/{month}/g, '06')
      .replace(/{date}/g, '20260608')
      .replace(/{job#}/g, 'US-TH-2026-00445')
      .replace(/{job_type}/g, 'USA Tech Import Standards')
      .replace(/{doc_type}/g, 'Invoice')
      .replace(/{original_name}/g, 'commercial_invoice_v3');
  }

  // Validate wrapper pulling from Service Layer definition
  isNodeIncomplete(node: WorkflowNode): boolean {
    return this.workflowService.isNodeIncomplete(node);
  }

  saveWorkflowConfig(): void {
    if (!this.activeWorkflow) return;
    
    // Save updated topological configs
    this.workflowService.saveWorkflow(this.activeWorkflow, 'COMPARISON')
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (saved) => {
          this.activeWorkflow = { ...saved };
          this.closeNodeConfig();
          alert(this.language === 'TH' ? 'บันทึกการตั้งค่าเวิร์กโฟลว์สำเร็จ!' : 'Workflow setup saved successfully!');
        }
      });
  }
}
