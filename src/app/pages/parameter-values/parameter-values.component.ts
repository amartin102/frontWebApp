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
import { DialogModule } from 'primeng/dialog';

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
  // nivel inconsistencia
  intIdNivelInconsistencia?: number | null;
  strNivelInconsistencia?: string | null;
  // audit
  createdBy?: string | null;
  creationDate?: string | null;
}

interface SimpleItem { id: string; name: string }

interface MaestroPeriodo {
  id: string;
  valorParametroPeriodoCicloIdId: string;
  identificadorPeriodo: string;
  descripcion: string;
  mes: number;
  fechaInicio: string;
  fechaFin: string;
  fechaPago: string;
  cerrado: boolean;
  estado: string;
  periodicidad: string;
}

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
    DialogModule,
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
            <th style="width:18%">Código</th>
            <th style="width:10%">Nivel</th>
            <th style="width:13%">Empleado</th>
            <th style="width:13%">Cliente</th>
            <th style="width:28%">Valor</th>
            <th style="width:9%">Creado Por</th>
            <th style="width:9%">Fecha Creación</th>
          </tr>
        </ng-template>
        <ng-template pTemplate="body" let-row>
          <tr>
            <td><strong>{{row.parameterCode}}</strong></td>
            <td>{{row.strNivelInconsistencia}}</td>
            <td>{{row.employeeName}}</td>
            <td>{{row.clientName}}</td>
            <td>
              <div class="control-container">
                <!-- show data type label with tooltip -->
                <div class="type-label">{{row.dataTypeDescription}}</div>

                <ng-container [ngSwitch]="getTypeKey(row)">
                <ng-container *ngSwitchCase="'texto'">
                  <input pInputText [formControl]="getControl(row.id)" 
                         [disabled]="isParameterDisabled(row)"
                         [readonly]="isParameterDisabled(row)"
                         [class.readonly-field]="isParameterDisabled(row)"
                         [pTooltip]="'Tipo Dato a Ingresar: ' + row.dataTypeDescription" />
                </ng-container>
                <ng-container *ngSwitchCase="'fecha'">
                  <p-calendar [formControl]="getControl(row.id)" dateFormat="yy-mm-dd" [showIcon]="true"
                            [disabled]="isParameterDisabled(row)"
                            [class.readonly-field]="isParameterDisabled(row)"
                            [pTooltip]="'Tipo Dato a Ingresar: ' + row.dataTypeDescription"></p-calendar>
                </ng-container>
                <ng-container *ngSwitchCase="'hora'">
                  <p-calendar [formControl]="getControl(row.id)"
                            [timeOnly]="true"
                            [showIcon]="true"
                            [showTime]="true"
                            [showSeconds]="false"
                            icon="pi pi-clock"
                            [disabled]="isParameterDisabled(row)"
                            [class.readonly-field]="isParameterDisabled(row)"
                            [pTooltip]="'Seleccione hora y minutos'"
                            [style]="{'width': '130px'}"
                            hourFormat="24"></p-calendar>
                </ng-container>
                <ng-container *ngSwitchCase="'correo'">
                  <input pInputText type="email" [formControl]="getControl(row.id)"
                         [disabled]="isParameterDisabled(row)"
                         [readonly]="isParameterDisabled(row)"
                         [class.readonly-field]="isParameterDisabled(row)"
                         [pTooltip]="'Tipo Dato a Ingresar: ' + row.dataTypeDescription" />
                </ng-container>
                <ng-container *ngSwitchCase="'lista'">
                  <div class="value-container" style="display: flex; align-items: center; gap: 0.5rem;">
                    <p-dropdown [options]="getListOptions(row.id)"
                              [formControl]="getControl(row.id)"
                              optionLabel="label"
                              [optionValue]="'value'"
                              [placeholder]="'Seleccione...'"
                              [disabled]="isParameterDisabled(row)"
                              [class.readonly-field]="isParameterDisabled(row)"
                              appendTo="body"
                              [style]="{'width': '180px'}"
                              (onChange)="onListChange(row, $event)"
                              pTooltip="Seleccione una opción de la lista"
                              styleClass="lista-dropdown">
                    </p-dropdown>
                    
                    <!-- Botón para ver períodos (solo para PeriodicidadEjecucionNomina) -->
                    <button *ngIf="isPeriodicidadParameter(row)" 
                            pButton 
                            type="button"
                            icon="pi pi-eye" 
                            class="p-button-rounded p-button-outlined p-button-info p-button-sm"
                            (click)="openPeriodosModal(row)"
                            pTooltip="Ver períodos de nómina"
                            [disabled]="!getControl(row.id).value"></button>
                  </div>
                </ng-container>
                <ng-container *ngSwitchCase="'numerico'">
                  <!-- Porcentaje -->
                  <p-inputNumber *ngIf="row.parameterCode.toLowerCase().includes('porcentaje')"
                               [formControl]="getControl(row.id)" 
                               [useGrouping]="false"
                               [minFractionDigits]="0"
                               [maxFractionDigits]="4"
                               suffix="%"
                               [min]="0"
                               [max]="100"
                               [disabled]="isParameterDisabled(row)"
                               [class.readonly-field]="isParameterDisabled(row)"
                               [pTooltip]="'Tipo Dato a Ingresar: ' + row.dataTypeDescription"></p-inputNumber>
                  <!-- Moneda (valores) -->
                  <p-inputNumber *ngIf="!row.parameterCode.toLowerCase().includes('porcentaje')"
                               [formControl]="getControl(row.id)" 
                               [useGrouping]="true"
                               [minFractionDigits]="0"
                               [maxFractionDigits]="2"
                               mode="currency"
                               currency="COP"
                               locale="es-CO"
                               [disabled]="isParameterDisabled(row)"
                               [class.readonly-field]="isParameterDisabled(row)"
                               [pTooltip]="'Tipo Dato a Ingresar: ' + row.dataTypeDescription"></p-inputNumber>
                </ng-container>
                <ng-container *ngSwitchDefault>
                  <!-- fallback to text -->
                  <input pInputText [formControl]="getControl(row.id)"
                         [disabled]="isParameterDisabled(row)"
                         [readonly]="isParameterDisabled(row)"
                         [class.readonly-field]="isParameterDisabled(row)"
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

    <!-- Modal de Períodos -->
    <p-dialog [header]="'Períodos de Nómina - ' + periodicidadActual" 
              [(visible)]="showPeriodosDialog" 
              [modal]="true"
              [style]="{width: '60vw'}"
              [draggable]="false"
              [resizable]="false">
      
      <p-message *ngIf="periodosErrorMessage" severity="error" [text]="periodosErrorMessage"></p-message>
      
      <p-table [value]="periodos" 
               [loading]="loadingPeriodos"
               styleClass="p-datatable-sm"
               [paginator]="true"
               [rows]="10"
               responsiveLayout="scroll">
        <ng-template pTemplate="header">
          <tr>
            <th>Periodicidad</th>
            <th>Identificador</th>
            <th>Descripción</th>
            <th>Mes</th>
            <th>Fecha Inicio</th>
            <th>Fecha Fin</th>
            <th>Fecha Pago</th>
            <th>Estado</th>
          </tr>
        </ng-template>
        <ng-template pTemplate="body" let-periodo>
          <tr>
            <td><strong>{{periodo.periodicidad}}</strong></td>
            <td>{{periodo.identificadorPeriodo}}</td>
            <td>{{periodo.descripcion}}</td>
            <td>{{periodo.mes}}</td>
            <td>{{periodo.fechaInicio | date: 'dd/MM/yyyy'}}</td>
            <td>{{periodo.fechaFin | date: 'dd/MM/yyyy'}}</td>
            <td>{{periodo.fechaPago | date: 'dd/MM/yyyy'}}</td>
            <td>
              <p-tag [value]="periodo.estado" 
                     [severity]="periodo.cerrado ? 'success' : 'warning'"></p-tag>
            </td>
          </tr>
        </ng-template>
        <ng-template pTemplate="emptymessage">
          <tr>
            <td colspan="8" class="text-center p-4">
              <i class="pi pi-info-circle" style="font-size: 2rem; color: #6c757d;"></i>
              <p class="mt-2 mb-0" style="color: #6c757d;">
                No se encontraron períodos configurados para la periodicidad seleccionada.
                <br>
                <small>Por favor, configure los períodos de nómina en el sistema.</small>
              </p>
            </td>
          </tr>
        </ng-template>
      </p-table>
      
      <ng-template pTemplate="footer">
        <button pButton label="Cerrar" icon="pi pi-times" (click)="showPeriodosDialog = false" class="p-button-secondary"></button>
      </ng-template>
    </p-dialog>
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
    }
    
    /* Estilos para campos readonly/deshabilitados */
    :host ::ng-deep .readonly-field input,
    :host ::ng-deep .readonly-field .p-inputnumber input,
    :host ::ng-deep .readonly-field .p-calendar input,
    :host ::ng-deep .readonly-field .p-dropdown {
      background-color: #e9ecef !important;
      color: #6c757d !important;
      cursor: not-allowed !important;
      opacity: 0.7 !important;
      pointer-events: none !important;
    }
    
    :host ::ng-deep .readonly-field .p-inputnumber-button,
    :host ::ng-deep .readonly-field .p-calendar-trigger,
    :host ::ng-deep .readonly-field .p-dropdown-trigger {
      display: none !important;
      pointer-events: none !important;
    }
    
    :host ::ng-deep .readonly-field.p-inputnumber,
    :host ::ng-deep .readonly-field.p-calendar,
    :host ::ng-deep .readonly-field.p-dropdown {
      pointer-events: none !important;
      user-select: none !important;
    }
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

  // Propiedades para el modal de períodos
  showPeriodosDialog = false;
  periodos: MaestroPeriodo[] = [];
  loadingPeriodos = false;
  periodosErrorMessage = '';
  periodicidadActual = '';

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
        
        console.debug('[ParameterValues] Loaded values from API:', all);
        
        // Log valores de tipo correo y lista para depuración
        all.forEach(v => {
          const typeDesc = (v.dataTypeDescription || '').toLowerCase();
          if (typeDesc.includes('correo') || typeDesc.includes('email') || 
              typeDesc.includes('lista') || typeDesc.includes('list')) {
            console.debug(`[ParameterValues] Value ${v.parameterCode} (${v.dataTypeDescription}):`, {
              textValue: v.textValue,
              emailValue: v.emailValue,
              originValue: v.originValue,
              dataOrigin: v.dataOrigin
            });
          }
        });


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

        // Ordenar por intIdNivelInconsistencia de menor a mayor
        const sorted = filtered.sort((a, b) => {
          const nivelA = a.intIdNivelInconsistencia ?? 999;
          const nivelB = b.intIdNivelInconsistencia ?? 999;
          return nivelA - nivelB;
        });

        this.values = sorted;
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
        // El valor puede venir en emailValue o textValue
        // Priorizar emailValue, pero si está vacío o null, usar textValue
        const emailVal = v.emailValue && v.emailValue.trim() !== '' ? v.emailValue : null;
        const textVal = v.textValue && v.textValue.trim() !== '' ? v.textValue : null;
        initial = emailVal ?? textVal ?? '';
        
        console.debug('[ParameterValues] Processing correo type:', {
          parameterCode: v.parameterCode,
          emailValue: v.emailValue,
          textValue: v.textValue,
          emailValProcessed: emailVal,
          textValProcessed: textVal,
          initial: initial,
          allFields: v
        });
      } else if (typeKey === 'lista') {
        try {
          // 1. Obtener y parsear las opciones del JSON
          const originJson = v.originValue ?? v.dataOrigin;
          let raw = [];
          try {
            raw = originJson ? JSON.parse(originJson) : [];
          } catch (parseError) {
            console.warn('[ParameterValues] Error parsing JSON for lista:', originJson, parseError);
            raw = [];
          }
          
          console.debug(`[ParameterValues] Parameter ${v.parameterCode} (lista):`, {
            id: v.id,
            textValue: v.textValue,
            originValue: v.originValue,
            dataOrigin: v.dataOrigin,
            originJson,
            parsed: raw,
            allFields: v
          });

          // 2. Convertir a formato dropdown y guardar opciones
          const opts: Array<{ label: string; value: any }> = Array.isArray(raw) 
            ? raw.map(e => ({ 
                label: String(e.Valor ?? e.valor ?? ''), 
                value: String(e.Id ?? e.id ?? '') 
              }))
            : [];
          this.listOptions.set(v.id, opts);

          // 3. Seleccionar valor inicial - el textValue contiene el Id que queremos seleccionar
          // Limpiar el textValue de espacios y comillas
          let targetId = v.textValue ? String(v.textValue).trim() : '';
          
          // Si el textValue está entre comillas, quitarlas
          if (targetId.startsWith('"') && targetId.endsWith('"')) {
            targetId = targetId.substring(1, targetId.length - 1);
          }
          
          console.debug(`[ParameterValues] Looking for Id "${targetId}" in options:`, opts);

          // Buscar la opción que tenga ese Id (comparación flexible)
          initial = targetId || null;

          // Verificar que el Id existe en las opciones
          const exists = opts.some(opt => String(opt.value) === targetId);
          if (!exists && targetId) {
            console.warn(`[ParameterValues] Warning: Id "${targetId}" not found in options for parameter ${v.parameterCode}. Available options:`, opts.map(o => o.value));
            // Intentar buscar por label si no encuentra por value
            const byLabel = opts.find(opt => opt.label.toLowerCase() === targetId.toLowerCase());
            if (byLabel) {
              console.debug(`[ParameterValues] Found by label instead, using value:`, byLabel.value);
              initial = byLabel.value;
            }
          } else if (exists) {
            console.debug(`[ParameterValues] Found matching Id "${targetId}" in options`);
          } else if (!targetId) {
            console.debug(`[ParameterValues] No initial value (textValue is empty)`);
            initial = null;
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

      const control = new FormControl(initial, validators);
      this.valueControls.set(v.id, control);
      
      // Si es ValorSalarioBase, agregar listener para calcular automáticamente otros valores
      if (v.parameterCode === 'ValorSalarioBase') {
        control.valueChanges.subscribe(salarioBase => {
          this.calcularValoresLaborales(salarioBase);
        });
      }
      
      // Si es NivelRiesgoARL, agregar listener para calcular el PorcentajeARL
      if (v.parameterCode === 'NivelRiesgoARL') {
        control.valueChanges.subscribe(nivelRiesgo => {
          this.calcularPorcentajeARL(nivelRiesgo);
        });
      }
    }
  }

  /**
   * Calcula automáticamente los valores laborales basándose en el salario base
   * Normativa laboral colombiana 2025
   */
  calcularValoresLaborales(salarioBase: number) {
    if (!salarioBase || salarioBase <= 0) {
      return;
    }

    const SALARIO_MINIMO_2025 = 1423500;
    const AUXILIO_TRANSPORTE_2025 = 200000;
    
    // Determinar si aplica auxilio de transporte (si gana hasta 2 salarios mínimos)
    const aplicaAuxTransporte = salarioBase <= (SALARIO_MINIMO_2025 * 2);
    
    // Calcular auxilio de transporte proporcional al salario
    let auxTransporte = 0;
    if (aplicaAuxTransporte) {
      // Proporcional: (Salario Base / Salario Mínimo) * Auxilio Transporte Base
      const proporcion = salarioBase / SALARIO_MINIMO_2025;
      auxTransporte = Math.round(AUXILIO_TRANSPORTE_2025 * proporcion);
    }

    // Cálculo de horas según normativa colombiana
    // 1. Hora ordinaria diurna = Salario / 230 (horas mensuales para liquidación de extras)
    // Nota: Se usa 230 como base para cálculo de hora ordinaria según jurisprudencia colombiana
    const horaOrdinariaDiurna = Math.round(salarioBase / 230);

    // 2. Hora ordinaria nocturna = Hora ordinaria diurna * 1.35 (recargo nocturno 35%)
    const horaOrdinariaNocturna = Math.round(horaOrdinariaDiurna * 1.35);

    // 3. Hora extra diurna = Hora ordinaria diurna * 1.25 (recargo 25%)
    const horaExtraDiurna = Math.round(horaOrdinariaDiurna * 1.25);

    // 4. Hora extra nocturna = Hora ordinaria diurna * 1.75 (recargo 75%)
    const horaExtraNocturna = Math.round(horaOrdinariaDiurna * 1.75);

    // 5. Hora ordinaria dominical/festiva diurna = Hora ordinaria diurna * 1.75 (recargo 75%)
    const horaOrdinariaDiurnaDomFestivo = Math.round(horaOrdinariaDiurna * 1.75);

    // 6. Hora ordinaria dominical/festiva nocturna = Hora ordinaria diurna * 2.10 (recargo 110%)
    const horaOrdinariaNocturnaDomFestivo = Math.round(horaOrdinariaDiurna * 2.10);

    // 7. Hora extra ordinaria dominical/festiva diurna = Hora ordinaria diurna * 2.0 (recargo 100%)
    const horaExtraOrdinariaDiurnaDomFestivo = Math.round(horaOrdinariaDiurna * 2.0);

    // 8. Hora extra ordinaria dominical/festiva nocturna = Hora ordinaria diurna * 2.50 (recargo 150%)
    const horaExtraOrdinariaNocturnaDomFestivo = Math.round(horaOrdinariaDiurna * 2.50);

    // Buscar los parámetros y actualizar sus valores
    const parametrosACalcular = {
      'ValorHoraOrdinariaDiurna': horaOrdinariaDiurna,
      'ValorHoraOrdinariaNocturna': horaOrdinariaNocturna,
      'ValorHoraExtraDiurna': horaExtraDiurna,
      'ValorHoraExtraNocturna': horaExtraNocturna,
      'ValorHoraOrdinariaDiurnaDomFestivo': horaOrdinariaDiurnaDomFestivo,
      'ValorHoraOrdinariaNocturnaDomFestivo': horaOrdinariaNocturnaDomFestivo,
      'ValorHoraExtraOrdinariaDiurnaDomFestivo': horaExtraOrdinariaDiurnaDomFestivo,
      'ValorHoraExtraOrdinariaNocturnaDomFestivo': horaExtraOrdinariaNocturnaDomFestivo,
      'ValorAuxTransporte': auxTransporte
    };

    console.log('🧮 Calculando valores laborales basados en salario:', salarioBase);
    console.log('📊 Valores calculados:', parametrosACalcular);

    // Actualizar los controles con los valores calculados
    this.values.forEach(param => {
      if (parametrosACalcular.hasOwnProperty(param.parameterCode)) {
        const control = this.valueControls.get(param.id);
        if (control) {
          const valorCalculado = parametrosACalcular[param.parameterCode as keyof typeof parametrosACalcular];
          control.setValue(valorCalculado, { emitEvent: false });
          console.log(`✅ ${param.parameterCode} = ${valorCalculado}`);
        }
      }
    });
  }

  /**
   * Calcula el porcentaje de ARL según el nivel de riesgo
   * Decreto 1772 de 1994 y actualizaciones - Colombia 2025
   */
  calcularPorcentajeARL(nivelRiesgo: string | number) {
    if (!nivelRiesgo) {
      return;
    }

    // Convertir a string y limpiar
    const nivel = String(nivelRiesgo).trim().toLowerCase();
    
    // Porcentajes según la clasificación de riesgo laboral en Colombia
    // Basado en el Decreto 1772 de 1994 y actualizaciones vigentes
    let porcentajeARL = 0;
    
    // Detectar el nivel (puede venir como "I", "1", "Nivel I", etc.)
    if (nivel.includes('i') && !nivel.includes('ii') && !nivel.includes('iii') && !nivel.includes('iv') && !nivel.includes('v')) {
      // Clase I - Riesgo Mínimo: 0.522%
      porcentajeARL = 0.522;
    } else if (nivel.includes('ii') && !nivel.includes('iii') && !nivel.includes('iv') && !nivel.includes('v')) {
      // Clase II - Riesgo Bajo: 1.044%
      porcentajeARL = 1.044;
    } else if (nivel.includes('iii') && !nivel.includes('iv') && !nivel.includes('v')) {
      // Clase III - Riesgo Medio: 2.436%
      porcentajeARL = 2.436;
    } else if (nivel.includes('iv') && !nivel.includes('v')) {
      // Clase IV - Riesgo Alto: 4.350%
      porcentajeARL = 4.350;
    } else if (nivel.includes('v')) {
      // Clase V - Riesgo Máximo: 6.960%
      porcentajeARL = 6.960;
    } else if (nivel === '1') {
      porcentajeARL = 0.522;
    } else if (nivel === '2') {
      porcentajeARL = 1.044;
    } else if (nivel === '3') {
      porcentajeARL = 2.436;
    } else if (nivel === '4') {
      porcentajeARL = 4.350;
    } else if (nivel === '5') {
      porcentajeARL = 6.960;
    }

    if (porcentajeARL > 0) {
      // Buscar el parámetro PorcentajeARL y actualizar su valor
      const porcentajeARLParam = this.values.find(p => p.parameterCode === 'PorcentajeARL');
      if (porcentajeARLParam) {
        const control = this.valueControls.get(porcentajeARLParam.id);
        if (control) {
          control.setValue(porcentajeARL, { emitEvent: false });
          console.log(`✅ PorcentajeARL actualizado a ${porcentajeARL}% para nivel de riesgo ${nivelRiesgo}`);
        }
      }
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

  // Verificar si el parámetro debe estar deshabilitado
  isParameterDisabled(row: ParameterValue): boolean {
    const disabledCodes = [
      'ValorHoraExtraOrdinariaDiurnaDomFestivo',
      'ValorHoraExtraOrdinariaNocturnaDomFestivo',
      'ValorHoraOrdinariaNocturna',
      'ValorHoraExtraNocturna',
      'ValorHoraExtraDiurna',
      'ValorHoraOrdinariaDiurna',
      'ValorHoraOrdinariaNocturnaDomFestivo',
      'ValorHoraOrdinariaDiurnaDomFestivo',
      'ValorAuxTransporte',
      'PorcentajeARL'
    ];
    
    return disabledCodes.includes(row.parameterCode);
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
        // Los emails se guardan en textValue (el backend no tiene emailValue)
        dto.textValue = raw ?? null;
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

    console.log('[ParameterValues] Original payload:', payload);

    // Formatear el payload según la estructura requerida por el servicio
    // IMPORTANTE: El backend NO tiene emailValue, los emails se guardan en textValue
    const formattedPayload = payload.map(item => {
      // Si hay emailValue, moverlo a textValue porque el backend no acepta emailValue
      const textVal = item.emailValue || item.textValue || "";
      
      return {
        id: item.id,
        textValue: textVal,
        numericValue: item.numericValue || 0,
        dateValue: item.dateValue || new Date().toISOString(),
        hourValue: item.hourValue || "",
        modifiedBy: "Prueba" // Ajustar según el usuario actual
      };
    });

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
    // IMPORTANTE: El backend NO tiene emailValue, los emails se guardan en textValue
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
    } else if (tipo.includes('correo') || tipo.includes('email')) {
      // Los emails se guardan en textValue (el backend no tiene emailValue)
      payload[0].textValue = value?.toString() || "";
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

  // ====== MÉTODOS PARA MANEJO DE PERÍODOS ======
  
  /**
   * Verifica si el parámetro es de tipo periodicidad
   */
  isPeriodicidadParameter(row: ParameterValue): boolean {
    return row.parameterCode === 'PeriodicidadEjecucionNomina' || 
           row.parameterCode === 'PeridiocidadEjecucionNomina';
  }

  /**
   * Abre el modal de períodos directamente desde el botón de ojo
   */
  openPeriodosModal(row: ParameterValue) {
    const control = this.getControl(row.id);
    const selectedValue = control.value;
    
    if (!selectedValue) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Selección requerida',
        detail: 'Primero debe seleccionar una periodicidad',
        life: 3000
      });
      return;
    }

    const listOptions = this.listOptions.get(row.id) || [];
    const selectedOption = listOptions.find(opt => String(opt.value) === String(selectedValue));
    const periodicidadLabel = selectedOption?.label || '';
    
    if (periodicidadLabel && row.clientId) {
      this.loadPeriodos(row.clientId, periodicidadLabel);
    } else {
      this.messageService.add({
        severity: 'warn',
        summary: 'Error',
        detail: 'No se pudo determinar el cliente o la periodicidad',
        life: 3000
      });
    }
  }

  /**
   * Detecta cambios en los dropdowns de lista, especialmente para PeriodicidadEjecucionNomina
   */
  onListChange(row: ParameterValue, event: any) {
    console.log('=== onListChange ejecutado ===');
    console.log('Row:', row);
    console.log('ParameterCode:', row.parameterCode);
    console.log('Event:', event);
    console.log('Event.value:', event.value);
    
    // Soportar ambas variantes: con y sin 'o' (PeriodicidadEjecucionNomina y PeridiocidadEjecucionNomina)
    const isPeriodicidad = row.parameterCode === 'PeriodicidadEjecucionNomina' || 
                          row.parameterCode === 'PeridiocidadEjecucionNomina';
    
    if (isPeriodicidad) {
      console.log('✅ Es periodicidad de ejecución de nómina - Ejecutando handlePeriodicidadChange');
      this.handlePeriodicidadChange(row, event.value);
    } else {
      console.log('❌ NO es periodicidad, es:', row.parameterCode);
    }
  }

  /**
   * Maneja el cambio de periodicidad y abre el modal solo si es Quincenal
   */
  handlePeriodicidadChange(row: ParameterValue, newValue: any) {
    console.log('=== handlePeriodicidadChange ejecutado ===');
    console.log('Row completo:', row);
    console.log('NewValue:', newValue);
    
    // Obtener el label de la opción seleccionada
    const listOptions = this.listOptions.get(row.id) || [];
    console.log('List options para este parámetro:', listOptions);
    
    const selectedOption = listOptions.find(opt => String(opt.value) === String(newValue));
    console.log('Selected option:', selectedOption);
    
    const periodicidadLabel = (selectedOption?.label || '');
    console.log('Periodicidad label:', periodicidadLabel);
    
    if (periodicidadLabel && periodicidadLabel.trim() !== '') {
      const periodicidadLower = periodicidadLabel.toLowerCase().trim();
      const clientId = row.clientId;
      console.log('ClientId extraído:', clientId);
      
      // Solo abrir modal si es Quincenal
      if (periodicidadLower === 'quincenal') {
        if (clientId) {
          console.log('✅ Es Quincenal - Llamando a loadPeriodos con:', clientId, periodicidadLabel);
          this.loadPeriodos(clientId, periodicidadLabel);
        } else {
          console.log('❌ No hay clientId');
          this.messageService.add({
            severity: 'warn',
            summary: 'Cliente no encontrado',
            detail: 'No se pudo determinar el cliente para cargar los períodos',
            life: 5000
          });
        }
      } else {
        // Para otras periodicidades (Semanal, Mensual), solo mostrar toast informativo
        console.log('ℹ️ Periodicidad diferente a Quincenal:', periodicidadLabel);
        this.messageService.add({
          severity: 'info',
          summary: 'Periodicidad configurada',
          detail: `Periodicidad configurada como "${periodicidadLabel}". Debe configurar los periodos correspondientes.`,
          life: 4000
        });
      }
    } else {
      console.log('❌ Periodicidad label está vacío');
    }
  }

  /**
   * Carga los períodos desde el API y los filtra por periodicidad
   */
  loadPeriodos(clientId: string, periodicidadSeleccionada: string) {
    this.loadingPeriodos = true;
    this.periodosErrorMessage = '';
    this.periodos = [];
    this.periodicidadActual = periodicidadSeleccionada;
    
    const url = `${this.baseApi}/MaestroPeriodo/byClient/${clientId}`;
    console.log('Cargando períodos desde:', url);
    console.log('Filtrando por periodicidad:', periodicidadSeleccionada);
    
    this.http.get<MaestroPeriodo[]>(url).subscribe({
      next: (data) => {
        console.log('Períodos cargados del API:', data);
        
        // Filtrar por periodicidad (comparación case-insensitive)
        const todosPeriodos = data || [];
        const periodicidadLower = periodicidadSeleccionada.toLowerCase().trim();
        
        this.periodos = todosPeriodos.filter(periodo => 
          periodo.periodicidad && 
          periodo.periodicidad.toLowerCase().trim() === periodicidadLower
        );
        
        console.log(`Períodos filtrados (${periodicidadSeleccionada}):`, this.periodos);
        console.log(`Total encontrados: ${this.periodos.length} de ${todosPeriodos.length}`);
        

        this.showPeriodosDialog = true;
        this.loadingPeriodos = false;
        
        if (this.periodos.length === 0) {
          this.messageService.add({
            severity: 'warn',
            summary: 'Sin períodos configurados',
            detail: `No se encontraron períodos configurados de tipo "${periodicidadSeleccionada}" para este cliente. Por favor, configure los períodos en el sistema.`,
            life: 6000
          });
        } else {
          this.messageService.add({
            severity: 'success',
            summary: 'Períodos cargados',
            detail: `Se encontraron ${this.periodos.length} período(s) de tipo "${periodicidadSeleccionada}"`,
            life: 3000
          });
        }
      },
      error: (error) => {
        console.error('Error al cargar períodos:', error);
        this.loadingPeriodos = false;
        this.periodosErrorMessage = 'Error al cargar los períodos. Verifique la conexión con el servidor.';
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'No se pudieron cargar los períodos de nómina',
          life: 5000
        });
      }
    });
  }
}
  
