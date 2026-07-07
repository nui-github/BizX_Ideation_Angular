import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject, of } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzTableModule } from 'ng-zorro-antd/table';
import { NzDrawerModule } from 'ng-zorro-antd/drawer';
import { NzModalModule } from 'ng-zorro-antd/modal';
import { LucideAngularModule } from 'lucide-angular';
import { TrackingService } from '../../core/services/tracking.service';
import { ComparisonJob, TrackingItem, Language, JobStatus } from '../../core/models/types.model';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    NzButtonModule,
    NzInputModule,
    NzTableModule,
    NzDrawerModule,
    NzModalModule,
    LucideAngularModule
  ],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss']
})
export class DashboardComponent implements OnInit, OnDestroy {
  jobs: ComparisonJob[] = [];
  trackingItems: TrackingItem[] = [];
  selectedJob: ComparisonJob | null = null;
  
  // App parameters
  language: Language = 'TH';
  searchQuery: string = '';
  statusFilter: string = 'ALL';
  
  // UI States (Ant Design Drawer & Modal Controls)
  isDrawerVisible: boolean = false;
  isStatusGuideVisible: boolean = false;
  
  private destroy$ = new Subject<void>();

  constructor(private trackingService: TrackingService) {}

  ngOnInit(): void {
    // Fetch comparison jobs via service layer
    this.trackingService.getComparisonJobs()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (jobs) => {
          this.jobs = jobs;
        }
      });

    // Fetch tracking items via service layer
    this.trackingService.getTrackingItems()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (items) => {
          this.trackingItems = items;
        }
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // Pure data filtering logic
  get filteredJobs(): ComparisonJob[] {
    return this.jobs.filter(job => {
      const matchesSearch = job.reference.toLowerCase().includes(this.searchQuery.toLowerCase()) || 
                            (job.workflowName && job.workflowName.toLowerCase().includes(this.searchQuery.toLowerCase()));
      const matchesStatus = this.statusFilter === 'ALL' || job.status === this.statusFilter;
      return matchesSearch && matchesStatus;
    });
  }

  // Open & Close Details via ng-zorro Drawer
  openDetails(job: ComparisonJob): void {
    this.selectedJob = job;
    this.isDrawerVisible = true;
  }

  closeDetails(): void {
    this.isDrawerVisible = false;
    this.selectedJob = null;
  }

  // Open & Close Status Guide via ng-zorro Modal
  openStatusGuide(): void {
    this.isStatusGuideVisible = true;
  }

  closeStatusGuide(): void {
    this.isStatusGuideVisible = false;
  }

  toggleLanguage(): void {
    this.language = this.language === 'TH' ? 'EN' : 'TH';
  }

  markAsDone(job: ComparisonJob): void {
    // Use the Service bridge to mutate state
    this.trackingService.updateComparisonJob(job.id, { status: JobStatus.DONE })
      .subscribe({
        next: (updatedJob) => {
          this.jobs = this.jobs.map(j => j.id === updatedJob.id ? updatedJob : j);
          if (this.selectedJob?.id === updatedJob.id) {
            this.selectedJob = updatedJob;
          }
          this.closeDetails();
        }
      });
  }
}
