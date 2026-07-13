import { Routes } from '@angular/router';

export const examsRoutes: Routes = [
  {
    path: '',
    loadComponent: () => import('./exams-list/exams-list.component').then(m => m.ExamsListComponent),
  },
  {
    path: 'new',
    loadComponent: () => import('./exam-form/exam-form.component').then(m => m.ExamFormComponent),
  },
  {
    path: ':id',
    loadComponent: () => import('./exam-detail/exam-detail.component').then(m => m.ExamDetailComponent),
  },
];
