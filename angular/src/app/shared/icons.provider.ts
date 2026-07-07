import { EnvironmentProviders, importProvidersFrom } from '@angular/core';
import { LucideAngularModule } from 'lucide-angular';
import {
  File, FileText, HelpCircle, Info, Search, X,
  Folder, FolderInput, HardDrive, Settings,
  Menu, Home, LayoutGrid, Upload, ListChecks, Users,
  Database, GitCompareArrows, ChevronDown, ChevronRight, LogOut
} from 'lucide-angular';

/**
 * Central icon registry — add new lucide icons here as features are ported.
 * Keeps bundle size small (only picked icons are included) per PROJECT_RULES.md.
 */
export function provideAppIcons(): EnvironmentProviders {
  return importProvidersFrom(
    LucideAngularModule.pick({
      File, FileText, HelpCircle, Info, Search, X,
      Folder, FolderInput, HardDrive, Settings,
      Menu, Home, LayoutGrid, Upload, ListChecks, Users,
      Database, GitCompareArrows, ChevronDown, ChevronRight, LogOut
    })
  );
}
