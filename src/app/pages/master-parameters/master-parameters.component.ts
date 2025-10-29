// pages/parameters/master-parameters/master-parameters.component.ts
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, FormControl } from '@angular/forms';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { CardModule } from 'primeng/card';
import { TableModule } from 'primeng/table';
import { InputTextModule } from 'primeng/inputtext';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { MessageModule } from 'primeng/message';
import { MessageService } from 'primeng/api';

interface MasterParameter {
  id: string;
  code: string;
  // API returns `dataTypeId` / `dataTypeDescription` (camelCase T)
  dataTypeId: number;
  dataTypeDescription: string;
  inconsistencyLevelId: number;
  inconsistencyLevelDescription: string;
  modifyPermission: string;
  consultPermission: string;
  createdBy: string;
  // API uses `creationDate`
  creationDate: string;
}

@Component({
  selector: 'app-master-parameters',
  standalone: true,
  imports: [
    CommonModule, 
    ReactiveFormsModule,
    HttpClientModule,
    CardModule, 
    TableModule, 
    InputTextModule, 
    ButtonModule, 
    DialogModule, 
    MessageModule
  ],
  providers: [MessageService],
  template: `
    <p-card header="Maestro de Parámetros">
      <!-- Filtros -->
      <div class="filters p-fluid grid">
            <div class="field col-12 md:col-8">
              <label for="codeFilter">Código Parámetro</label>
              <input 
                pInputText 
                id="codeFilter" 
                [formControl]="codeControl" 
                placeholder="Buscar por código..." 
                (keyup.enter)="search()"
              />
            </div>
        
        <div class="field col-12 md:col-4 flex align-items-end gap-2">
          <!--<button pButton icon="pi pi-search" label="Buscar" (click)="search()"></button>-->
          <button pButton icon="pi pi-refresh" label="Limpiar" class="p-button-secondary" (click)="clearFilters()"></button>
        </div>
      </div>

      <!-- Mensajes -->
      <p-message *ngIf="errorMessage" severity="error" [text]="errorMessage"></p-message>

      <!-- Tabla de resultados -->
      <p-table 
        [value]="filteredParameters" 
        [paginator]="true" 
        [rows]="10"
        [rowsPerPageOptions]="[10, 20, 50]"
        [loading]="loading"
        styleClass="p-datatable-striped p-datatable-sm"
        [tableStyle]="{'min-width': '60rem'}">
        <ng-template pTemplate="header">
          <tr>
            <th style="width: 15%">Código</th>
            <th style="width: 15%">Tipo Dato</th>
            <th style="width: 15%">Nivel Inconsistencia</th>
            <th style="width: 15%">Permiso Modificar</th>
            <th style="width: 15%">Permiso Consultar</th>
            <th style="width: 15%">Creado Por</th>
            <th style="width: 10%">Acciones</th>
          </tr>
        </ng-template>
        <ng-template pTemplate="body" let-param>
          <tr>
            <td><strong>{{ param.code }}</strong></td>
            <td>
              <span class="data-type-badge">
            {{ param.dataTypeDescription }}
              </span>
            </td>
            <td>
              <span [class]="'inconsistency-badge level-' + param.inconsistencyLevelId">
                {{ param.inconsistencyLevelDescription }}
              </span>
            </td>
            <td>{{ param.modifyPermission }}</td>
            <td>{{ param.consultPermission }}</td>
            <td>{{ param.createdBy }}</td>
            <td>
              <div class="flex gap-1">
                <button pButton icon="pi pi-pencil" class="p-button-warning p-button-sm" 
                        (click)="editParameter(param)" pTooltip="Editar" tooltipPosition="top"></button>
                <button pButton icon="pi pi-trash" class="p-button-danger p-button-sm" 
                        (click)="deleteParameter(param)" pTooltip="Eliminar" tooltipPosition="top"></button>
              </div>
            </td>
          </tr>
        </ng-template>
        <ng-template pTemplate="emptymessage">
          <tr>
            <td colspan="7" class="text-center p-4">
              <i class="pi pi-inbox" style="font-size: 2rem; color: #ccc;"></i>
              <p class="mt-2 text-color-secondary">No se encontraron parámetros</p>
            </td>
          </tr>
        </ng-template>
        <ng-template pTemplate="loadingbody">
          <tr>
            <td colspan="7" class="text-center p-4">
              <i class="pi pi-spin pi-spinner" style="font-size: 2rem;"></i>
              <p class="mt-2 text-color-secondary">Cargando parámetros...</p>
            </td>
          </tr>
        </ng-template>
      </p-table>

      <!-- Resumen -->
      <div class="mt-3 text-sm text-color-secondary">
        Mostrando {{ filteredParameters.length }} de {{ allParameters.length }} parámetros
      </div>
    </p-card>
  `,
  styles: [`
    .filters {
      margin-bottom: 1.5rem;
      padding: 1rem;
      background: #f8f9fa;
      border-radius: 6px;
    }

    .data-type-badge {
      padding: 0.25rem 0.75rem;
      border-radius: 16px;
      font-size: 0.875rem;
      font-weight: 500;
      background-color: #e9ecef;
      color: #495057;
      border: 1px solid #dee2e6;
    }

    .inconsistency-badge {
      padding: 0.25rem 0.75rem;
      border-radius: 16px;
      font-size: 0.875rem;
      font-weight: 500;
    }

    .level-1 {
      background-color: #d4edda;
      color: #155724;
      border: 1px solid #c3e6cb;
    }

    .level-2 {
      background-color: #fff3cd;
      color: #856404;
      border: 1px solid #ffeaa7;
    }

    .level-3 {
      background-color: #f8d7da;
      color: #721c24;
      border: 1px solid #f5c6cb;
    }

    :host ::ng-deep .p-datatable .p-datatable-thead > tr > th {
      background-color: #f8f9fa;
      font-weight: 600;
      color: #495057;
    }

    :host ::ng-deep .p-card .p-card-title {
      font-size: 1.5rem;
      color: #343a40;
      margin-bottom: 1rem;
    }
  `]
})
export class MasterParametersComponent implements OnInit {
  allParameters: MasterParameter[] = [];
  filteredParameters: MasterParameter[] = [];
  loading = false;
  errorMessage = '';

  filterForm: FormGroup;

  // Typed getter for the 'code' FormControl to avoid AbstractControl <-> FormControl type issues
  get codeControl(): FormControl {
    return this.filterForm.get('code') as FormControl;
  }

  // Use absolute backend URL since proxy.conf.json is removed — backend must allow CORS
  private apiUrl = 'https://localhost:7019/api/MasterParameters';

  constructor(
    private fb: FormBuilder,
    private http: HttpClient,
    private messageService: MessageService
  ) {
    this.filterForm = this.fb.group({
      code: ['']
    });
  }

  ngOnInit() {
    this.loadParameters();
    
    // Filtrar en tiempo real mientras se escribe
    this.codeControl.valueChanges.subscribe(code => {
      this.applyFilters();
    });
  }

  loadParameters() {
    this.loading = true;
    this.errorMessage = '';

    this.http.get<MasterParameter[]>(this.apiUrl).subscribe({
      next: (data) => {

        console.log('Datos recibidos del API:', data);
        // Convertir a array si viene como objeto individual
        this.allParameters = Array.isArray(data) ? data : [data];
        this.applyFilters();
        this.loading = false;
        
        this.messageService.add({
          severity: 'success',
          summary: 'Éxito',
          detail: `Datos cargados correctamente`,
          life: 3000
        });
      },
      error: (error) => {
        console.log('Error al cargar parámetros:', error);
        this.errorMessage = 'Error al cargar los parámetros. Verifique la conexión con el servidor.';
        this.loading = false;
        
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'No se pudieron cargar los parámetros',
          life: 5000
        });
      }
    });
  }

  applyFilters() {
    const codeFilter = this.codeControl.value?.toLowerCase() || '';
    
    if (!codeFilter) {
      this.filteredParameters = [...this.allParameters];
    } else {
      this.filteredParameters = this.allParameters.filter(param =>
        param.code.toLowerCase().includes(codeFilter)
      );
    }
  }

  search() {
    this.applyFilters();
    
    if (this.codeControl.value) {
      this.messageService.add({
        severity: 'info',
        summary: 'Búsqueda',
  detail: `Filtrando por código: ${this.codeControl.value}`,
        life: 3000
      });
    }
  }

  clearFilters() {
    this.filterForm.reset({ code: '' });
    this.filteredParameters = [...this.allParameters];
    
    this.messageService.add({
      severity: 'info',
      summary: 'Filtros',
      detail: 'Filtros limpiados',
      life: 3000
    });
  }

  editParameter(param: MasterParameter) {
    console.log('Editar parámetro:', param);
    this.messageService.add({
      severity: 'info',
      summary: 'Editar',
      detail: `Editando parámetro: ${param.code}`,
      life: 3000
    });
    
    // Aquí iría la lógica para abrir el modal de edición
  }

  deleteParameter(param: MasterParameter) {
    console.log('Eliminar parámetro:', param);
    
    // Confirmación antes de eliminar
    if (confirm(`¿Está seguro de eliminar el parámetro "${param.code}"?`)) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Eliminar',
        detail: `Eliminando parámetro: ${param.code}`,
        life: 3000
      });
      
      // Aquí iría la lógica para eliminar el parámetro
      // this.http.delete(`${this.apiUrl}/${param.id}`).subscribe(...);
    }
  }
}