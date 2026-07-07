import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { Workflow, DocType, WorkflowNode } from '../models/types.model';
import { MOCK_WORKFLOWS, MOCK_COMPARISON_WORKFLOWS, MOCK_DOC_TYPES } from '../../../mock-data/workflows.mock';

@Injectable({
  providedIn: 'root'
})
export class WorkflowService {
  private standardWorkflows: Workflow[] = [...MOCK_WORKFLOWS];
  private comparisonWorkflows: Workflow[] = [...MOCK_COMPARISON_WORKFLOWS];
  private docTypes: DocType[] = [...MOCK_DOC_TYPES];

  getStandardWorkflows(): Observable<Workflow[]> {
    return of(this.standardWorkflows);
  }

  getComparisonWorkflows(): Observable<Workflow[]> {
    return of(this.comparisonWorkflows);
  }

  getDocTypes(): Observable<DocType[]> {
    return of(this.docTypes);
  }

  saveWorkflow(workflow: Workflow, type: 'STANDARD' | 'COMPARISON'): Observable<Workflow> {
    const list = type === 'STANDARD' ? this.standardWorkflows : this.comparisonWorkflows;
    const idx = list.findIndex(w => w.id === workflow.id);
    const updatedWithMeta = {
      ...workflow,
      updatedAt: new Date().toISOString()
    };

    if (idx !== -1) {
      list[idx] = updatedWithMeta;
    } else {
      list.unshift(updatedWithMeta);
    }
    return of(updatedWithMeta);
  }

  deleteWorkflow(id: string, type: 'STANDARD' | 'COMPARISON'): Observable<boolean> {
    if (type === 'STANDARD') {
      const initialLen = this.standardWorkflows.length;
      this.standardWorkflows = this.standardWorkflows.filter(w => w.id !== id);
      return of(this.standardWorkflows.length < initialLen);
    } else {
      const initialLen = this.comparisonWorkflows.length;
      this.comparisonWorkflows = this.comparisonWorkflows.filter(w => w.id !== id);
      return of(this.comparisonWorkflows.length < initialLen);
    }
  }

  /**
   * Node configuration validation checking logic conforming to exact rules.
   * Leveraged by component UI guards before workflow activation.
   */
  isNodeIncomplete(node: WorkflowNode): boolean {
    switch (node.type) {
      case 'get_file': {
        const d = node.data || {};
        const folderValid = d.folder ? d.folder.split('/').every((level: string) => level.trim().length > 0) : false;
        return !d.nodeName?.trim() || !d.protocol || !d.tenantId?.trim() || !d.clientId?.trim() || !d.clientSecret?.trim() || !folderValid || !d.pollInterval;
      }
      case 'hybrid_mail_filter': {
        const d = node.data || {};
        if (d.mode === 'Prompt-based only' || d.mode === 'Both') {
          if (!d.promptTemplate || d.promptTemplate.trim() === '') return true;
        }
        return false;
      }
      case 'compare': {
        const d = node.data || {};
        return !d.ruleId; // Validated rule ID presence alone fixes early blocks
      }
      case 'storage': {
        const d = node.data || {};
        if (!d.directoryPath || d.directoryPath.trim() === '') return true;
        if (!d.directoryNaming || d.directoryNaming.trim() === '') return true;
        if (!d.fileNamingMode) return true;
        if (d.fileNamingMode === 'custom' && (!d.fileNamingTemplate || d.fileNamingTemplate.trim() === '')) return true;
        return false;
      }
      default:
        return false;
    }
  }

  /**
   * Helper utility containing rule validations across an entire topological workflow structure.
   */
  isWorkflowIncomplete(workflow: Workflow): boolean {
    if (!workflow.nodes || workflow.nodes.length === 0) return true;
    return workflow.nodes.some(node => this.isNodeIncomplete(node));
  }
}
