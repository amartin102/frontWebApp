// pages/parameter-values/parameter-values.component.ts
import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, FormControl, Validators } from '@angular/forms';
import { HttpClient, HttpClientModule, HttpParams } from '@angular/common/http';
import { Subscription } from 'rxjs';
import { CardModule } from 'primeng/card';
import { TableModule } from 'primeng/table';
import { InputTextModule } from 'primeng/inputtext';
import { ButtonModule } from 'primeng/button';
import { DropdownModule } from 'primeng/dropdown';
import { CalendarModule } from 'primeng/calendar';
import { InputNumberModule } from 'primeng/inputnumber';
import { MessageModule } from 'primeng/message';
import { MessageService } from 'primeng/api';

interface ParameterValue {
  id: string;
  parameterId: string;
  parameterCode: string;
  parameterDescription: string;
  dataTypeId: number;
  dataTypeDescription: string;
  employeeId?: string | null;
  employeeName?: string | null;
  clientId?: string | null;
  clientName?: string | null;
  textValue?: string | null;
  numericValue?: number | null;
  dateValue?: string | null; // ISO
  emailValue?: string | null;
}

interface SimpleItem { id: string; name: string }

@Component({
  selector: 'app-parameter-values',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    HttpClientModule,
    CardModule,
    TableModule,
    InputTextModule,
    ButtonModule,
    DropdownModule,
    CalendarModule,
    InputNumberModule,
    MessageModule,
  ],
  providers: [MessageService],
  template: `
    <p-card header="Valores Parámetros">
      <div class="filters p-fluid grid">
        <div class="field col-12 md:col-4">
          <label for="codeFilter">Código Parámetro</label>
          <input pInputText id="codeFilter" [formControl]="codeControl" placeholder="Código..." />
        </div>

        <div class="field col-12 md:col-4">
          <label for="client">Cliente</label>
          <p-dropdown [options]="clients" optionLabel="name" optionValue="id" placeholder="Seleccione" 
                      [formControl]="clientControl" [filter]="true"></p-dropdown>
        </div>

        <div class="field col-12 md:col-4">
          <label for="employee">Empleado</label>
          <p-dropdown [options]="employees" optionLabel="name" optionValue="id" placeholder="Seleccione" 
                      [formControl]="employeeControl" (onChange)="onEmployeeChange()"></p-dropdown>
        </div>

        
        <div class="field col-12 md:col-12 flex gap-2 align-items-end">
          <button pButton label="Buscar" icon="pi pi-search" (click)="loadValues()"></button>
          <button pButton label="Limpiar" class="p-button-secondary" icon="pi pi-refresh" (click)="clearFilters()"></button>
        </div>
      </div>

      <p-message *ngIf="errorMessage" severity="error" [text]="errorMessage"></p-message>

      <div class="table-toolbar flex align-items-center justify-content-between mb-2">
        <div>
          Mostrando
          {{ values.length ? (first + 1) : 0 }}-
          {{ values.length ? ((first + pageSize) > values.length ? values.length : (first + pageSize)) : 0 }}
          de {{ values.length }} registros
        </div>
        <div class="page-size-control">
          Mostrar
          <select class="p-inputtext" (change)="changePageSize($any($event.target).value)" [value]="pageSize">
            <option value="10">10</option>
            <option value="20">20</option>
            <option value="50">50</option>
          </select>
          por página
        </div>
      </div>

      <p-table [value]="values" [paginator]="true" [rows]="pageSize" [first]="first" (onPage)="onPage($event)" [loading]="loading" styleClass="p-datatable-sm">
        <ng-template pTemplate="header">
          <tr>
            <th style="width:15%">Código</th>
            <th style="width:25%">Descripción</th>
            <th style="width:15%">Empleado</th>
            <th style="width:15%">Cliente</th>
            <th style="width:30%">Valor</th>
          </tr>
        </ng-template>
        <ng-template pTemplate="body" let-row>
          <tr>
            <td><strong>{{row.parameterCode}}</strong></td>
            <td>{{row.parameterDescription}}</td>
            <td>{{row.employeeName}}</td>
            <td>{{row.clientName}}</td>
            <td>
              <!-- show data type label with tooltip -->
              <div class="datatype-label" title="Tipo de dato: {{ row.dataTypeDescription }}">{{ row.dataTypeDescription }}</div>

              <ng-container [ngSwitch]="getTypeKey(row)">
                <ng-container *ngSwitchCase="'texto'">
                  <input pInputText [formControl]="getControl(row.id)" />
                </ng-container>
                <ng-container *ngSwitchCase="'fecha'">
                  <p-calendar [formControl]="getControl(row.id)" dateFormat="yy-mm-dd" [showIcon]="true"></p-calendar>
                </ng-container>
                <ng-container *ngSwitchCase="'correo'">
                  <input pInputText type="email" [formControl]="getControl(row.id)" />
                </ng-container>
                <ng-container *ngSwitchCase="'numerico'">
                  <p-inputNumber [formControl]="getControl(row.id)" [useGrouping]="false"></p-inputNumber>
                </ng-container>
                <ng-container *ngSwitchDefault>
                  <!-- fallback to text -->
                  <input pInputText [formControl]="getControl(row.id)" />
                </ng-container>
              </ng-container>

              <!-- validation messages -->
              <div class="validation-messages">
                <small class="p-error" *ngIf="getControl(row.id).touched && getControl(row.id).errors?.['email']">Formato de correo inválido</small>
                <small class="p-error" *ngIf="getControl(row.id).touched && getControl(row.id).errors?.['pattern']">Ingrese un número válido</small>
              </div>
            </td>
          </tr>
        </ng-template>
      </p-table>

      <div class="mt-3 flex gap-2 justify-content-end">
        <button pButton label="Guardar" icon="pi pi-save" (click)="saveAll()"></button>
        <button pButton label="Limpiar valores" class="p-button-secondary" icon="pi pi-times" (click)="resetValues()"></button>
      </div>
    </p-card>
  `,
  styles: [`
    .filters { margin-bottom: 1rem; padding: 1rem; background: #f8f9fa; border-radius: 6px; }
    :host ::ng-deep .p-card .p-card-title { font-size: 1.25rem; }
    .datatype-label { font-size: 0.8rem; color: #444; margin-bottom: 0.25rem; }
    .validation-messages small { display:block; margin-top: 0.25rem; }
  `]
})
export class ParameterValuesComponent implements OnInit, OnDestroy {
  filterForm: FormGroup;
  employees: SimpleItem[] = [];
  clients: SimpleItem[] = [];
  values: ParameterValue[] = [];
  loading = false;
  errorMessage = '';
  // pagination
  pageSize = 10;
  first = 0;

  // Map of parameterValue.id -> FormControl for editable value
  valueControls = new Map<string, FormControl>();

  private clientSub?: Subscription;

  // typed getters for filter controls to avoid AbstractControl vs FormControl issues
  get codeControl(): FormControl {
    return this.filterForm.get('code') as FormControl;
  }

  get employeeControl(): FormControl {
    return this.filterForm.get('employee') as FormControl;
  }

  get clientControl(): FormControl {
    return this.filterForm.get('client') as FormControl;
  }

  // use absolute backend URLs now that proxy was removed; backend must permit CORS
  private baseApi = 'https://localhost:7019/api';
  private employeesUrl = `${this.baseApi}/Employees`;
  private clientsUrl = `${this.baseApi}/Clients`;
  private valuesUrl = `${this.baseApi}/ParameterValues`;

  constructor(private fb: FormBuilder, private http: HttpClient, private messageService: MessageService) {
    this.filterForm = this.fb.group({
      code: [''],
      employee: [null],
      client: [null]
    });
  }

  ngOnInit(): void {
    // load clients and all values initially (no filters) so dropdowns and table show data on enter
    this.loadClients();
    this.loadValues();
    // subscribe to client control changes to dynamically load employees for the selected client
    this.clientSub = this.clientControl.valueChanges.subscribe(val => {
      // debug: client selection changed
      console.debug('[ParameterValues] clientControl changed ->', val);
      // reset employee selection and load employees for the client
      this.employeeControl.setValue(null);
      this.loadEmployees(val || undefined);
    });
  }

  onPage(e: any) {
    // PrimeNG paginator event: {first, rows, page, pageCount}
    this.first = e.first ?? 0;
    this.pageSize = e.rows ?? this.pageSize;
  }

  changePageSize(size: string | number) {
    this.pageSize = Number(size) || 10;
    this.first = 0; // go to first page
  }

  ngOnDestroy(): void {
    if (this.clientSub) this.clientSub.unsubscribe();
  }

  loadClients() {
    // load all clients (used on init and when no employee filter is selected)
    this.http.get<SimpleItem[]>(this.clientsUrl).subscribe({
      next: data => this.clients = data || [],
      error: err => { console.warn('Could not load clients', err); this.clients = []; }
    });
  }

  /**
   * Load employees. If clientId is provided, request employees for that client.
   * The backend endpoint used is GET /api/Clients/employees which returns employee objects
   * (may include firstName/lastName). We map to SimpleItem {id,name} for the dropdown.
   */
  loadEmployees(clientId?: string) {
    const url = `${this.clientsUrl}/employees`;
    // Always request the employees list from the backend. Some backends may support filtering by
    // clientId via query param, but if not, we'll filter client-side using the `clientId` field
    // present in each employee object (as your attachment shows).
    this.http.get<any[]>(url).subscribe({
      next: data => {
        const all = (data || []);
        // if a clientId was provided, prefer server-side filtering but fallback to client-side
        const filtered = clientId ? all.filter(e => String(e.clientId) === String(clientId)) : all;
        const items = filtered.map(e => ({
          id: e.id,
          name: (e.name ?? ((e.firstName ?? '') + ' ' + (e.lastName ?? ''))).trim()
        } as SimpleItem));
        console.debug(`[ParameterValues] loaded employees (server returned ${all.length}) filtered=${items.length} for clientId=${clientId}`);
        this.employees = items;
      },
      error: err => {
        console.warn('Could not load employees', err);
        this.employees = [];
      }
    });
  }

  onClientChange() {
    const clientId = this.clientControl.value;
    // reset selected employee and load employees for the selected client (or all if none)
    this.employeeControl.setValue(null);
    this.loadEmployees(clientId || undefined);
  }

  onEmployeeChange() {
  const empId = this.employeeControl.value;
  if (!empId) {
      // no employee selected -> load full clients list
      this.clientControl.setValue(null);
      this.loadClients();
      return;
    }
    const params = new HttpParams().set('employeeId', empId);
    this.http.get<SimpleItem[]>(this.clientsUrl, { params }).subscribe({
      next: data => this.clients = data || [],
      error: err => { console.warn('Could not load clients', err); this.clients = []; }
    });
  }

  loadValues() {
    this.loading = true;
    this.errorMessage = '';

    // use query params if provided (backend may support, otherwise fetch all and filter client-side)
    let params = new HttpParams();
  const code = this.codeControl.value;
  const employee = this.employeeControl.value;
  const client = this.clientControl.value;
    if (code) params = params.set('code', code);
    if (employee) params = params.set('employeeId', employee);
    if (client) params = params.set('clientId', client);

    // call backend (we pass params to allow server-side filtering when supported)
    this.http.get<ParameterValue[]>(this.valuesUrl, { params }).subscribe({
      next: data => {
        const all = Array.isArray(data) ? data : (data ? [data as any] : []);

        // Apply resilient client-side filtering so the UI behaves correctly even if backend
        // doesn't support the query params. None of the filters are mandatory.
        const codeFilter = (code ?? '').toString().trim().toLowerCase();
        const empFilter = employee ? String(employee) : null;
        const clientFilter = client ? String(client) : null;

        const filtered = all.filter(v => {
          // code: partial match against parameterCode (case-insensitive)
          if (codeFilter) {
            const pc = (v.parameterCode ?? '').toString().toLowerCase();
            if (!pc.includes(codeFilter)) return false;
          }
          // employee: exact match against employeeId
          if (empFilter) {
            if (!v.employeeId || String(v.employeeId) !== empFilter) return false;
          }
          // client: exact match against clientId
          if (clientFilter) {
            if (!v.clientId || String(v.clientId) !== clientFilter) return false;
          }
          return true;
        });

        this.values = filtered;
        this.initControls();
        this.loading = false;
      },
      error: err => {
        console.error('Error loading values', err);
        this.errorMessage = 'Error al cargar valores. Verifique conexión con el servidor.';
        this.loading = false;
      }
    });
  }

  initControls() {
    this.valueControls.clear();
    for (const v of this.values) {
      // pick initial value depending on available value fields
      let initial: any = null;
      // Respect the dataTypeDescription from the API; normalize to compare
      const typeKey = this.getTypeKey(v);
      if (typeKey === 'texto') {
        initial = v.textValue ?? v.emailValue ?? '';
      } else if (typeKey === 'numerico') {
        initial = v.numericValue ?? null;
      } else if (typeKey === 'fecha') {
        initial = v.dateValue ? new Date(v.dateValue) : null;
      } else if (typeKey === 'correo') {
        // some APIs may use textValue for emails
        initial = v.emailValue ?? v.textValue ?? '';
      } else {
        initial = v.textValue ?? v.numericValue ?? v.dateValue ?? '';
      }

      // create FormControl with that initial value (single editable 'valor') and validators based on type
      const validators: any[] = [];
      if (typeKey === 'correo') {
        validators.push(Validators.email);
      } else if (typeKey === 'numerico') {
        // allow integers and decimals (positive/negative)
        validators.push(Validators.pattern(/^[-+]?\d*(?:[\.,]\d+)?$/));
      }

      this.valueControls.set(v.id, new FormControl(initial, validators));
    }
  }

  // Normalize dataTypeDescription: remove accents and lowercase to simplify comparisons
  private stripDiacritics(str: string | undefined | null): string {
    if (!str) return '';
    return str.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase();
  }

  // Return normalized type key like 'texto' | 'numerico' | 'fecha' | 'correo'
  getTypeKey(v: ParameterValue): string {
    const raw = v.dataTypeDescription || '';
    const normalized = this.stripDiacritics(raw);
    if (normalized.includes('texto')) return 'texto';
    if (normalized.includes('numer')) return 'numerico';
    if (normalized.includes('fecha') || normalized.includes('date')) return 'fecha';
    if (normalized.includes('correo') || normalized.includes('email')) return 'correo';
    return 'texto';
  }

  // Return existing FormControl for id or create a new one (guarantee non-undefined for template)
  getControl(id: string): FormControl {
    let c = this.valueControls.get(id);
    if (!c) {
      c = new FormControl(null);
      this.valueControls.set(id, c);
    }
    return c;
  }

  saveAll() {
    // quick validation: if any control is invalid, stop and notify
    const hasInvalid = Array.from(this.valueControls.values()).some(c => c.invalid);
    if (hasInvalid) {
      this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Hay valores inválidos. Corrija antes de guardar.', life: 5000 });
      return;
    }

    // collect payload: for each value, determine field by type
  const payload = this.values.map((v: ParameterValue) => {
      const ctrl = this.valueControls.get(v.id);
      const raw = ctrl ? ctrl.value : null;
      const dto: any = { id: v.id, parameterId: v.parameterId, employeeId: v.employeeId, clientId: v.clientId };
      const typeKey = this.getTypeKey(v);
      if (typeKey === 'texto') {
        dto.textValue = raw ?? null;
      } else if (typeKey === 'fecha') {
        dto.dateValue = raw ? (raw instanceof Date ? raw.toISOString() : raw) : null;
      } else if (typeKey === 'correo') {
        dto.emailValue = raw ?? null;
      } else if (typeKey === 'numerico') {
        // ensure number or null
        dto.numericValue = raw != null && raw !== '' ? Number(raw) : null;
      } else {
        dto.textValue = raw ?? null;
      }
      return dto;
    });

    // send to backend (assume endpoint accepts array POST)
    this.http.post(this.valuesUrl, payload).subscribe({
      next: () => {
        this.messageService.add({ severity: 'success', summary: 'Guardado', detail: 'Valores guardados correctamente', life: 3000 });
      },
      error: err => {
        console.error('Error saving values', err);
        this.messageService.add({ severity: 'error', summary: 'Error', detail: 'No se pudieron guardar los valores', life: 5000 });
      }
    });
  }

  resetValues() {
    for (const [id, ctrl] of this.valueControls) {
      ctrl.reset();
    }
    this.messageService.add({ severity: 'info', summary: 'Reset', detail: 'Valores limpiados', life: 2000 });
  }

  clearFilters() {
    // reset filters, reload clients and reload all values from backend
    this.filterForm.reset({ code: '', employee: null, client: null });
    this.valueControls.clear();
    this.loadClients();
    // after clearing filters, fetch all values from the backend so the table is populated
    this.loadValues();
  }
}
