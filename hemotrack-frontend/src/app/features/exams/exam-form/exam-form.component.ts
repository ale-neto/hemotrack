import { Component, inject, OnInit, OnDestroy, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { FormBuilder, Validators, ReactiveFormsModule, FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { DatePickerModule } from 'primeng/datepicker';
import { FloatLabelModule } from 'primeng/floatlabel';
import { ProgressBarModule } from 'primeng/progressbar';
import { Tabs, TabList, Tab, TabPanels, TabPanel } from 'primeng/tabs';
import { InputNumberModule } from 'primeng/inputnumber';
import { TextareaModule } from 'primeng/textarea';
import { ExamsFacade } from '../facades/exams.facade';
import { ExamExtractionFacade } from '../facades/exam-extraction.facade';
import { ManualResultRow, markersToResultRows, buildManualExamPayload } from '../mappers/exam-form.mapper';
import { Marker } from '../models/exam.model';

@Component({
  selector: 'app-exam-form',
  standalone: true,
  imports: [RouterLink, ReactiveFormsModule, FormsModule, ButtonModule, InputTextModule, SelectModule,
    DatePickerModule, FloatLabelModule, ProgressBarModule, Tabs, TabList, Tab, TabPanels, TabPanel, InputNumberModule, TextareaModule],
  template: `
    <div class="fade-in" style="max-width:720px">
      <!-- Header -->
      <div class="page-header">
        <div>
          <h1 class="page-title">Novo Exame</h1>
          <p class="page-subtitle">Informe manualmente ou envie o PDF para extração automática</p>
        </div>
        <a routerLink="/exams">
          <p-button label="Voltar" icon="pi pi-arrow-left" [outlined]="true" />
        </a>
      </div>

      <p-tabs [value]="activeTab()">
        <!-- ── Tab Manual ── -->
        <p-tablist>
          <p-tab value="manual" (click)="activeTab.set('manual')">
            <i class="pi pi-pencil"></i> Manual
          </p-tab>
          <p-tab value="pdf" (click)="activeTab.set('pdf')">
            <i class="pi pi-file-pdf"></i> Upload PDF
          </p-tab>
        </p-tablist>

        <p-tabpanels>
          <!-- Manual -->
          <p-tabpanel value="manual">
            <form [formGroup]="manualForm" (ngSubmit)="submitManual()" class="exam-form">
              <div class="form-row">
                <p-floatlabel class="flex-1">
                  <p-select
                    id="profileId"
                    formControlName="profileId"
                    [options]="profiles()"
                    optionLabel="name"
                    optionValue="id"
                    styleClass="w-full"
                  />
                  <label for="profileId">Perfil *</label>
                </p-floatlabel>

                <p-floatlabel class="flex-1">
                  <p-select
                    id="examTypeId"
                    formControlName="examTypeId"
                    [options]="examTypes()"
                    optionLabel="name"
                    optionValue="id"
                    styleClass="w-full"
                    (onChange)="onExamTypeChange($event.value)"
                  />
                  <label for="examTypeId">Tipo de exame *</label>
                </p-floatlabel>
              </div>

              <div class="form-row">
                <p-floatlabel class="flex-1">
                  <p-datepicker id="examDate" formControlName="examDate" dateFormat="dd/mm/yy" [showIcon]="true" styleClass="w-full" />
                  <label for="examDate">Data do exame *</label>
                </p-floatlabel>

                <p-floatlabel class="flex-1">
                  <input pInputText id="labName" formControlName="labName" class="w-full" />
                  <label for="labName">Laboratório</label>
                </p-floatlabel>
              </div>

              <!-- Results table -->
              @if (markers().length > 0) {
                <div class="markers-section">
                  <h3 class="section-title" style="margin-bottom:.75rem">Resultados</h3>
                  <div class="markers-grid">
                    @for (marker of markers(); track marker.name; let i = $index) {
                      <div class="marker-row">
                        <div class="marker-name">
                          {{ marker.name }}
                          @if (marker.unit) { <span class="marker-unit">({{ marker.unit }})</span> }
                        </div>
                        <input
                          pInputText
                          type="number"
                          step="0.01"
                          placeholder="Valor"
                          [(ngModel)]="results[i].value"
                          [ngModelOptions]="{standalone: true}"
                          class="marker-input"
                        />
                        @if (marker.refMin !== null || marker.refMax !== null) {
                          <span class="ref-range">
                            ref: {{ marker.refMin ?? '—' }} – {{ marker.refMax ?? '—' }}
                          </span>
                        }
                      </div>
                    }
                  </div>
                </div>
              }

              <p-floatlabel>
                <textarea pTextarea id="notes" formControlName="notes" rows="3" class="w-full"></textarea>
                <label for="notes">Observações</label>
              </p-floatlabel>

              <div class="form-actions">
                <p-button
                  type="submit"
                  label="Salvar exame"
                  icon="pi pi-check"
                  [loading]="saving()"
                  [disabled]="manualForm.invalid"
                />
              </div>
            </form>
          </p-tabpanel>

          <!-- PDF Upload -->
          <p-tabpanel value="pdf">
            <form [formGroup]="pdfForm" (ngSubmit)="submitPdf()" class="exam-form">
              <div class="form-row">
                <p-floatlabel class="flex-1">
                  <p-select
                    id="profileIdPdf"
                    formControlName="profileId"
                    [options]="profiles()"
                    optionLabel="name"
                    optionValue="id"
                    styleClass="w-full"
                  />
                  <label for="profileIdPdf">Perfil *</label>
                </p-floatlabel>
              </div>

              <!-- Drop zone -->
              <div
                class="drop-zone"
                [class.has-file]="pdfFile()"
                (dragover)="$event.preventDefault()"
                (drop)="onDrop($event)"
                (click)="fileInput.click()"
              >
                <input #fileInput type="file" accept="application/pdf" hidden (change)="onFileChange($event)" />
                @if (pdfFile()) {
                  <div class="file-selected">
                    <i class="pi pi-file-pdf" style="color:var(--ht-red);font-size:2rem"></i>
                    <span>{{ pdfFile()!.name }}</span>
                    <span class="file-size">{{ (pdfFile()!.size / 1024 / 1024).toFixed(2) }} MB</span>
                  </div>
                } @else {
                  <div class="drop-hint">
                    <i class="pi pi-upload" style="font-size:2rem;opacity:.4"></i>
                    <p>Arraste o PDF aqui ou clique para selecionar</p>
                    <p class="drop-sub">Máximo: 10MB</p>
                  </div>
                }
              </div>

              <!-- Progress -->
              @if (extracting()) {
                <div class="extraction-progress">
                  <div class="extraction-step">
                    <i class="pi pi-spin pi-spinner"></i>
                    {{ extractionStep() }}
                  </div>
                  <p-progressbar [value]="extractionPct()" [showValue]="true" />
                </div>
              }

              <div class="form-actions">
                <p-button
                  type="submit"
                  label="Enviar e extrair"
                  icon="pi pi-sparkles"
                  [loading]="extracting()"
                  [disabled]="pdfForm.invalid || !pdfFile()"
                />
              </div>
            </form>
          </p-tabpanel>
        </p-tabpanels>
      </p-tabs>
    </div>
  `,
  styles: [`
    .page-header {
      display: flex; align-items: flex-start; justify-content: space-between;
      margin-bottom: 1.5rem; gap: 1rem;
    }
    .page-subtitle { color: var(--ht-text-3); font-size: .875rem; }

    .exam-form { display: flex; flex-direction: column; gap: 1.5rem; padding: 1.5rem 0; }
    .form-row  { display: flex; gap: 1rem; flex-wrap: wrap; > * { min-width: 200px; } }
    .form-actions { display: flex; justify-content: flex-end; }

    /* Markers */
    .markers-section {}
    .markers-grid { display: flex; flex-direction: column; gap: .5rem; }
    .marker-row {
      display: flex; align-items: center; gap: 1rem;
      background: var(--ht-off-white); padding: .6rem .875rem; border-radius: var(--radius-sm);
    }
    .marker-name  { flex: 1; font-size: .875rem; font-weight: 500; }
    .marker-unit  { color: var(--ht-text-3); font-size: .8rem; margin-left: .25rem; }
    .ref-range    { font-size: .75rem; color: var(--ht-text-3); white-space: nowrap; font-family: var(--font-mono); }
    ::ng-deep .marker-input { width: 120px !important; font-family: var(--font-mono) !important; }

    /* Drop zone */
    .drop-zone {
      border: 2px dashed var(--ht-border-mid); border-radius: var(--radius);
      padding: 3rem 2rem; text-align: center; cursor: pointer; transition: all var(--transition);
      &:hover, &.has-file { border-color: var(--ht-red); background: var(--ht-red-muted); }
    }
    .drop-hint { display: flex; flex-direction: column; align-items: center; gap: .5rem; color: var(--ht-text-3); }
    .drop-sub  { font-size: .75rem; }
    .file-selected { display: flex; flex-direction: column; align-items: center; gap: .5rem; }
    .file-size { font-size: .75rem; color: var(--ht-text-3); }

    /* Extraction progress */
    .extraction-progress { background: var(--ht-off-white); border-radius: var(--radius-sm); padding: 1rem; }
    .extraction-step { display: flex; align-items: center; gap: .5rem; font-size: .875rem; color: var(--ht-text-2); margin-bottom: .75rem; }
  `],
})
export class ExamFormComponent implements OnInit, OnDestroy {
  private fb = inject(FormBuilder);
  private router = inject(Router);
  exams = inject(ExamsFacade);
  extraction = inject(ExamExtractionFacade);

  markers = signal<Marker[]>([]);
  results: ManualResultRow[] = [];

  activeTab = signal<string>('manual');
  saving = signal(false);
  pdfFile = signal<File | null>(null);

  profiles  = this.exams.profiles;
  examTypes = this.exams.examTypes;
  extracting     = this.extraction.extracting;
  extractionStep = this.extraction.step;
  extractionPct  = this.extraction.progress;

  manualForm = this.fb.group({
    profileId: [null as number | null, Validators.required],
    examTypeId: [null as number | null, Validators.required],
    examDate: [new Date(), Validators.required],
    labName: [''],
    notes: [''],
  });

  pdfForm = this.fb.group({
    profileId: [null as number | null, Validators.required],
  });

  ngOnInit(): void {
    this.exams.loadFormOptions();
    this.extraction.init(examId => this.router.navigate(['/exams', examId]));
  }

  ngOnDestroy(): void {
    this.extraction.destroy();
  }

  onExamTypeChange(examTypeId: number): void {
    const examType = this.examTypes().find(e => e.id === examTypeId);
    const markers = examType?.markers || [];
    this.markers.set(markers);
    this.results = markersToResultRows(markers);
  }

  onFileChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files?.length) this.pdfFile.set(input.files[0]);
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    const file = event.dataTransfer?.files[0];
    if (file?.type === 'application/pdf') this.pdfFile.set(file);
  }

  submitManual(): void {
    if (this.manualForm.invalid) return;
    this.saving.set(true);
    const payload = buildManualExamPayload(this.manualForm.getRawValue(), this.results);

    this.exams.createExam(
      payload,
      examId => { this.saving.set(false); this.router.navigate(['/exams', examId]); },
      () => this.saving.set(false),
    );
  }

  submitPdf(): void {
    const file = this.pdfFile();
    const profileId = this.pdfForm.value.profileId;
    if (!file || !profileId) return;
    this.extraction.upload(profileId, file);
  }
}
