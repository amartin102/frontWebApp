// pages/parameters/master-parameters/master-parameters.component.ts
import { Component, OnInit, inject } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, FormControl } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { CardModule } from 'primeng/card';
import { TableModule } from 'primeng/table';
import { InputTextModule } from 'primeng/inputtext';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { MessageModule } from 'primeng/message';
import { TooltipModule } from 'primeng/tooltip';
import { MessageService } from 'primeng/api';

interface MasterParameter {
  id: string;
  code: string;
  // new fields from API
  description?: string | null;
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
  // origin (may be null)
  dataOrigin?: string | null;
}

@Component({
  selector: 'app-master-parameters',
  standalone: true,
  imports: [
    CommonModule, 
    DatePipe,
    ReactiveFormsModule,
    CardModule, 
    TableModule, 
    InputTextModule, 
    ButtonModule, 
    DialogModule, 
    MessageModule,
    TooltipModule
  ],
  providers: [MessageService],
  templateUrl: './master-parameters.component.html',
  styleUrls: ['./master-parameters.component.css']
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

  private fb = inject(FormBuilder);
  private http = inject(HttpClient);
  private messageService = inject(MessageService);

  constructor() {
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

  addParameter() {
    console.log('Agregando nuevo parámetro');
    
    // Aquí iría la lógica para abrir el modal de creación
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