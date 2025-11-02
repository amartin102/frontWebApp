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
import { MessageService, ConfirmationService } from 'primeng/api';
import { TagModule } from 'primeng/tag';
import { TooltipModule } from 'primeng/tooltip';
import { ConfirmDialog, ConfirmDialogModule } from 'primeng/confirmdialog';
import { ToastModule } from 'primeng/toast';

interface ParameterValue {
  id: string;
  parameterId: string;
  parameterCode: string;
  parameterDescription: string;
  dataTypeId: number;
  dataTypeDescription: string;
  // legacy/master field that sometimes contains JSON list options
  dataOrigin?: string | null;
  // new field coming from api/ParameterValues: contains JSON string with list options
  originValue?: string | null;
  employeeId?: string | null;
  employeeName?: string | null;
  clientId?: string | null;
  clientName?: string | null;
  textValue?: string | null;
  numericValue?: number | null;
  dateValue?: string | null; // ISO
  emailValue?: string | null;
  hourValue?: string | null; // Campo específico para horas
  // audit
  createdBy?: string | null;
  creationDate?: string | null;
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
    TagModule,
    TooltipModule,
    ConfirmDialogModule,
    ToastModule,
  ],
  providers: [MessageService, ConfirmationService],
  template: `
    <p-toast position="top-right"></p-toast>
    
    <p-confirmDialog header="Confirmación" 
                    icon="pi pi-exclamation-triangle"
                    acceptLabel="Sí, guardar"
                    rejectLabel="No, cancelar">
    </p-confirmDialog>
    
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

        <div class="col-12 flex justify-content-center">
          <div class="actions-container">
            <button pButton label="Buscar" icon="pi pi-search" (click)="loadValues()"
                    class="p-button-sm mr-2"></button>
            <button pButton label="Limpiar" class="p-button-secondary p-button-sm" 
                    icon="pi pi-refresh" (click)="clearFilters()"></button>
          </div>
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
            <th style="width:20%">Código</th>
            <th style="width:15%">Empleado</th>
            <th style="width:15%">Cliente</th>
            <th style="width:30%">Valor</th>
            <th style="width:10%">Creado Por</th>
            <th style="width:10%">Fecha Creación</th>
          </tr>
        </ng-template>
        <ng-template pTemplate="body" let-row>
          <tr>
            <td><strong>{{row.parameterCode}}</strong></td>
            <td>{{row.employeeName}}</td>
            <td>{{row.clientName}}</td>
            <td>
              <div class="control-container">
                <!-- show data type label with tooltip -->
                <div class="type-label">{{row.dataTypeDescription}}</div>

                <ng-container [ngSwitch]="getTypeKey(row)">
                <ng-container *ngSwitchCase="'texto'">
                  <input pInputText [formControl]="getControl(row.id)" 
                         [pTooltip]="'Tipo Dato a Ingresar: ' + row.dataTypeDescription" />
                </ng-container>
                <ng-container *ngSwitchCase="'fecha'">
                  <p-calendar [formControl]="getControl(row.id)" dateFormat="yy-mm-dd" [showIcon]="true"
                            [pTooltip]="'Tipo Dato a Ingresar: ' + row.dataTypeDescription"></p-calendar>
                </ng-container>
                <ng-container *ngSwitchCase="'hora'">
                  <p-calendar [formControl]="getControl(row.id)"
                            [timeOnly]="true"
                            [showIcon]="true"
                            [showTime]="true"
                            [showSeconds]="false"
                            icon="pi pi-clock"
                            [pTooltip]="'Seleccione hora y minutos'"
                            [style]="{'width': '130px'}"
                            hourFormat="24"></p-calendar>
                </ng-container>
                <ng-container *ngSwitchCase="'correo'">
                  <input pInputText type="email" [formControl]="getControl(row.id)"
                         [pTooltip]="'Tipo Dato a Ingresar: ' + row.dataTypeDescription" />
                </ng-container>
                <ng-container *ngSwitchCase="'lista'">
                  <div class="value-container">
                    <p-dropdown [options]="getListOptions(row.id)"
                              [formControl]="getControl(row.id)"
                              optionLabel="label"
                              [optionValue]="'value'"
                              [placeholder]="'Seleccione...'"
                              appendTo="body"
                              [style]="{'width': '180px'}"
                              pTooltip="Seleccione una opción de la lista"
                              styleClass="lista-dropdown">
                    </p-dropdown>                   
                  </div>
                </ng-container>
                <ng-container *ngSwitchCase="'numerico'">
                  <p-inputNumber [formControl]="getControl(row.id)" [useGrouping]="false"
                               [pTooltip]="'Tipo Dato a Ingresar: ' + row.dataTypeDescription"></p-inputNumber>
                </ng-container>
                <ng-container *ngSwitchDefault>
                  <!-- fallback to text -->
                  <input pInputText [formControl]="getControl(row.id)"
                         [pTooltip]="'Tipo Dato a Ingresar: ' + row.dataTypeDescription" />
                </ng-container>
              </ng-container>
              </div>

              <!-- validation messages -->
              <div class="validation-messages">
                <small class="p-error" *ngIf="getControl(row.id).touched && getControl(row.id).errors?.['email']">Formato de correo inválido</small>
                <small class="p-error" *ngIf="getControl(row.id).touched && getControl(row.id).errors?.['pattern']">Ingrese un número válido</small>
              </div>
            </td>
            <td>{{ row.createdBy || '-' }}</td>
            <td>{{ row.creationDate | date: 'yyyy-MM-dd HH:mm' }}</td>
          </tr>
        </ng-template>
      </p-table>

      <div class="mt-3 flex gap-2 justify-content-end">
        <button pButton label="Guardar" icon="pi pi-save" (click)="onSaveClick()"></button>
        <!--<button pButton label="Limpiar valores" class="p-button-secondary" icon="pi pi-times" (click)="resetValues()"></button>-->
      </div>
    </p-card>
  `,
  styles: [`
    .filters { margin-bottom: 1rem; padding: 1rem; background: #f8f9fa; border-radius: 6px; }
    :host ::ng-deep .p-card .p-card-title { font-size: 1.25rem; }
    .type-label { 
      color: #666;
      font-size: 0.75rem;
      margin-bottom: 0.25rem;
    }
    .control-container {
      display: flex;
      flex-direction: column;
    }
    .validation-messages small { display:block; margin-top: 0.25rem; }
    .actions-container {
      width: auto;
      display: inline-flex;
      gap: 0.5rem;
      padding: 1rem 0;
    }
    :host ::ng-deep .p-button.p-button-sm {
      font-size: 0.875rem;
      padding: 0.4rem 0.8rem;
    }
    .actions-container .p-button {
      min-width: 100px;
    }
  `]
})
export class ParameterValuesComponent implements OnInit, OnDestroy {
  filterForm: FormGroup;
  employees: SimpleItem[] = [];
  clients: SimpleItem[] = [];
  values: ParameterValue[] = [];
  loading = false;
  errorMessage = '';
  // parsed list options for parameters of type 'lista'
  listOptions = new Map<string, Array<{ label: string; value: any }>>();
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

  constructor(
    private fb: FormBuilder, 
    private http: HttpClient, 
    private messageService: MessageService,
    private confirmationService: ConfirmationService
  ) {
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
    this.listOptions.clear();
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
      } else if (typeKey === 'hora') {
        console.debug('[ParameterValues] Processing hora type:', {
          parameterCode: v.parameterCode,
          textValue: v.textValue,
          hourValue: v.hourValue
        });
        
        const timeString = v.hourValue ?? v.textValue;

        if (timeString) {
          // Formato esperado: "HH:mm:ss"
          const [hours, minutes] = timeString.split(':');  // Tomar solo las horas y minutos
          const date = new Date();
          date.setHours(Number(hours) || 0, Number(minutes) || 0, 0);
          initial = date;
          console.debug('[ParameterValues] Successfully parsed time:', {
            original: timeString,
            hours: Number(hours),
            minutes: Number(minutes),
            result: date,
            formatted: `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`
          });
        } else {
          console.debug('[ParameterValues] No time value found for parameter:', v.parameterCode);
          initial = null;
        }
      } else if (typeKey === 'correo') {
        // some APIs may use textValue for emails
        initial = v.emailValue ?? v.textValue ?? '';
      } else if (typeKey === 'lista') {
        try {
          // 1. Obtener y parsear las opciones del JSON
          const originJson = v.originValue ?? v.dataOrigin;
          let raw = [];
          try {
            raw = originJson ? JSON.parse(originJson) : [];
          } catch (parseError) {
            console.warn('Error parsing JSON:', originJson);
            raw = [];
          }
          console.debug(`[ParameterValues] Parameter ${v.parameterCode}:`, {
            textValue: v.textValue,
            originJson,
            parsed: raw
          });

          // 2. Convertir a formato dropdown y guardar opciones
          const opts: Array<{ label: string; value: any }> = Array.isArray(raw) 
            ? raw.map(e => ({ 
                label: String(e.Valor ?? ''), 
                value: String(e.Id ?? '') 
              }))
            : [];
          this.listOptions.set(v.id, opts);

          // 3. Seleccionar valor inicial - el textValue contiene el Id que queremos seleccionar
          const targetId = String(v.textValue ?? '');
          console.debug(`[ParameterValues] Looking for Id "${targetId}" in options:`, opts);

          // Buscar la opción que tenga ese Id
          initial = targetId;

          // Verificar que el Id existe en las opciones
          const exists = opts.some(opt => String(opt.value) === targetId);
          if (!exists && targetId) {
            console.warn(`[ParameterValues] Warning: Id "${targetId}" not found in options for parameter ${v.parameterCode}`);
          } else if (exists) {
            console.debug(`[ParameterValues] Found matching Id "${targetId}" in options`);
          }
        } catch (ex) {
          // invalid JSON -> fallback to plain text
          console.warn('Invalid originValue/dataOrigin JSON for parameter', v.parameterCode, ex);
          initial = v.textValue ?? null;
        }
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
      // no special validators for 'lista' beyond required if desired in future

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
    if (normalized.includes('hora') || normalized.includes('time')) return 'hora';
    if (normalized.includes('texto')) return 'texto';
    if (normalized.includes('numer')) return 'numerico';
    if (normalized.includes('fecha') || normalized.includes('date')) return 'fecha';
    if (normalized.includes('correo') || normalized.includes('email')) return 'correo';
    if (normalized.includes('lista') || normalized.includes('list')) return 'lista';
    return 'texto';
  }

  // helper to retrieve parsed list options for a given parameter value id
  getListOptions(id: string) {
    return this.listOptions.get(id) || [];
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

  onSaveClick() {
    // quick validation: if any control is invalid, stop and notify
    const hasInvalid = Array.from(this.valueControls.values()).some(c => c.invalid);
    if (hasInvalid) {
      this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Hay valores inválidos. Corrija antes de guardar.', life: 5000 });
      return;
    }

    this.confirmationService.confirm({
      message: '¿Está seguro que desea guardar todos los valores?',
      accept: () => {
        this.saveAll();
      }
    });
  }

  saveAll() {
    console.debug('[ParameterValues] saveAll called');

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
      } else if (typeKey === 'hora') {
        if (raw instanceof Date) {
          // Formatear como HH:mm:ss
          const timeValue = raw.getHours().toString().padStart(2, '0') + ':' + 
                          raw.getMinutes().toString().padStart(2, '0') + ':00';
          dto.hourValue = timeValue;  // Usar hourValue en lugar de textValue
          console.debug('[ParameterValues] Saving time:', {
            date: raw,
            formatted: timeValue
          });
        } else {
          dto.hourValue = raw ?? null;
        }
      } else if (typeKey === 'correo') {
        dto.emailValue = raw ?? null;
      } else if (typeKey === 'numerico') {
        // ensure number or null
        dto.numericValue = raw != null && raw !== '' ? Number(raw) : null;
      } else if (typeKey === 'lista') {
        // store selected list option: prefer numericValue when option value is numeric, and also set textValue to the label
        const opts = this.listOptions.get(v.id) || [];
        const selected = opts.find(o => String(o.value) === String(raw));
        if (selected) {
          const num = Number(selected.value);
          if (!isNaN(num) && String(selected.value).trim() !== '') {
            dto.numericValue = num;
            dto.textValue = String(selected.label);
          } else {
            dto.textValue = String(selected.label ?? selected.value);
          }
        } else {
          // fallback: store as text or numeric depending on raw
          if (raw != null && raw !== '' && !isNaN(Number(raw))) dto.numericValue = Number(raw);
          else dto.textValue = raw ?? null;
        }
      } else {
        dto.textValue = raw ?? null;
      }
      return dto;
    });

    console.log('[ParameterValues] Original payload:', payload[0]);

    // Formatear el payload según la estructura requerida por el servicio
    const formattedPayload = payload.map(item => ({
      id: item.id,
      textValue: item.textValue || "",
      numericValue: item.numericValue || 0,
      dateValue: item.dateValue || new Date().toISOString(),
      hourValue: item.hourValue || "",
      modifiedBy: "Prueba" // Ajustar según el usuario actual
    }));

    console.log('[ParameterValues] Formatted payload:', formattedPayload);
    
    // Enviar el payload formateado al servicio como un array
    this.http.put(`${this.valuesUrl}`, formattedPayload).subscribe({
      next: () => {
        this.messageService.add({ severity: 'success', summary: 'Guardado', detail: 'Valores guardados correctamente', life: 3000 });
      },
      error: err => {
        console.error('Error saving values', err);
        this.messageService.add({ severity: 'error', summary: 'Error', detail: 'No se pudieron guardar los valores', life: 5000 });
      }
    });
  }

  saveValue(row: ParameterValue) {
    console.debug('[ParameterValues] saveValue called for row:', row);
    const control = this.getControl(row.id);
    if (!control) return;

    const value = control.value;
    if (value === null || value === undefined) {
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'El valor es requerido'
      });
      return;
    }

    // Crear el payload con la estructura completa y valores por defecto
    const payload = [{
      id: row.id,
      textValue: "",
      numericValue: 0,
      dateValue: "",
      hourValue: "",
      modifiedBy: "Admin"
    }];

    // Asignar el valor según el tipo
    const tipo = row.dataTypeDescription?.toLowerCase() || '';

    console.log('Tipo de dato:', tipo);
    console.log('Valor a guardar:', value);
    // Asignar el valor correspondiente manteniendo el resto con valores por defecto
    if (tipo.includes('numerico') || tipo.includes('entero') || tipo.includes('decimal')) {
      payload[0].numericValue = parseFloat(value) || 0;
    } else if (tipo.includes('fecha')) {
      payload[0].dateValue = value instanceof Date ? value.toISOString() : value;
    } else if (tipo.includes('hora')) {
      payload[0].hourValue = value instanceof Date ? 
        `${value.getHours().toString().padStart(2, '0')}:${value.getMinutes().toString().padStart(2, '0')}` : 
        value;
    } else {
      // Por defecto, guardar como texto (incluye listas)
      payload[0].textValue = value?.toString() || "";
    }

    console.log('Payload final:', payload);

    this.confirmationService.confirm({
      message: '¿Está seguro que desea guardar este valor?',
      header: 'Confirmar Guardado',
      icon: 'pi pi-exclamation-triangle',
      accept: () => {
        this.loading = true;
        this.http.put(`${this.valuesUrl}/${payload[0].id}`, payload).subscribe({
          next: (response) => {
            // El código 204 indica éxito
            this.confirmationService.confirm({
              message: 'Datos guardados correctamente.',
              header: 'Operación Exitosa',
              icon: 'pi pi-check-circle',
              acceptVisible: true,
              rejectVisible: false,
              acceptLabel: 'OK',
              accept: () => {
                this.loadValues(); // Recargar los valores después de que el usuario vea el mensaje
              }
            });
          },
          error: (error) => {
            console.error('Error al guardar:', error);
            this.messageService.add({
              severity: 'error',
              summary: 'Error',
              detail: 'Error al actualizar el valor',
              life: 5000
            });
          },
          complete: () => {
            this.loading = false;
          }
        });
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
  
