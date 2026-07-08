import { Routes } from '@angular/router';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'data-comparison/jobs' },
  {
    path: 'data-comparison/jobs',
    loadComponent: () =>
      import('./features/dashboard/dashboard.component').then((m) => m.DashboardComponent)
  },
  {
    path: 'exdoc/workflow-builder',
    loadComponent: () =>
      import('./features/exdoc/workflow-builder/workflow-builder.component').then(
        (m) => m.WorkflowBuilderComponent
      )
  }
  // TODO(dev): 'data-comparison/workflow-builder' is NOT registered yet — it needs
  // DataComparisonWorkflowBuilder.tsx ported (4,282 lines, not yet started; see /docs/HANDOFF.md).
  // Do not point it at features/exdoc/workflow-builder — that's a different, generic builder.
  //
  // TODO(dev): register remaining routes as features are ported.
  // See /docs/HANDOFF.md for the full source-component -> route mapping.
];
