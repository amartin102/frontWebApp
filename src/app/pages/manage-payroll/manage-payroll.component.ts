import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormsModule, FormBuilder, FormGroup, FormControl } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { CardModule } from 'primeng/card';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { DropdownModule } from 'primeng/dropdown';
import { MultiSelectModule } from 'primeng/multiselect';
import { InputTextModule } from 'primeng/inputtext';
import { InputNumberModule } from 'primeng/inputnumber';
import { DialogModule } from 'primeng/dialog';
import { MessageModule } from 'primeng/message';
import { ToastModule } from 'primeng/toast';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { MessageService, ConfirmationService } from 'primeng/api';

interface Client {
  id: string;
  name: string;
}

interface Employee {
  id: string;
  name: string;
  clientId: string;
  salarioBase?: number;
  auxilioTransporte?: number;
}

interface Period {
  id: string;
  identificadorPeriodo: string;
  descripcion: string;
  periodicidad: string;
  mes: number;
  fechaInicio: string;
  fechaFin: string;
  estado: string;
}

interface PayrollItem {
  id?: string;
  empleadoId?: string;
  empleadoNombre?: string;
  empleadoIdentificacion?: string;
  conceptoNovedadId?: string;
  conceptoNombre?: string;
  tipoConceptoId?: string;
  tipoConceptoNombre?: string;
  periodoNominaId?: string;
  periodoIdentificacion?: string;
  periodoIdentificador?: string;
  valorNovedad?: number;
  fechaNovedad?: string;
  // Campos adicionales para compatibilidad
  employeeId?: string;
  employeeName?: string;
  salarioBase?: number;
  auxilioTransporte?: number;
  deducciones?: number;
  conceptoDeducciones?: string;
}

interface NovedadItem {
  employeeId: string;
  employeeName: string;
  deduccion: number;
  concepto: string;
}

@Component({
  selector: 'app-manage-payroll',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FormsModule,
    CardModule,
    TableModule,
    ButtonModule,
    DropdownModule,
    MultiSelectModule,
    InputTextModule,
    InputNumberModule,
    DialogModule,
    MessageModule,
    ToastModule,
    ConfirmDialogModule
  ],
  providers: [MessageService, ConfirmationService],
  templateUrl: './manage-payroll.component.html',
  styleUrl: './manage-payroll.component.css'
})
export class ManagePayrollComponent implements OnInit {
  private fb = inject(FormBuilder);
  private http = inject(HttpClient);
  private messageService = inject(MessageService);
  private confirmationService = inject(ConfirmationService);

  private baseApi = 'https://localhost:7019/api';
  private clientsUrl = `${this.baseApi}/Clients`;
  private periodsUrl = `${this.baseApi}/MaestroPeriodo`;
  private novedadesUrl = `${this.baseApi}/RegistroNovedad`;

  filterForm: FormGroup;
  novedadForm: FormGroup;
  clients: Client[] = [];
  employees: Employee[] = [];
  periods: Period[] = [];
  payrollItems: PayrollItem[] = [];
  novedadesTemp: NovedadItem[] = [];
  loading = false;

  // Modal para novedades
  displayNovedadDialog = false;

  get clientControl(): FormControl {
    return this.filterForm.get('client') as FormControl;
  }

  get employeeControl(): FormControl {
    return this.filterForm.get('employee') as FormControl;
  }

  get periodControl(): FormControl {
    return this.filterForm.get('period') as FormControl;
  }

  constructor() {
    this.filterForm = this.fb.group({
      client: [null],
      employee: [[]],  // Array para selección múltiple
      period: [null]
    });

    this.novedadForm = this.fb.group({
      deduccion: [0],
      concepto: ['']
    });
  }

  ngOnInit(): void {
    this.loadClients();

    // Cuando cambia el cliente, cargar empleados y períodos
    this.clientControl.valueChanges.subscribe(clientId => {
      if (clientId) {
        this.loadEmployeesByClient(clientId);
        this.loadPeriodsByClient(clientId);
      } else {
        this.employees = [];
        this.periods = [];
        this.payrollItems = [];
      }
      this.employeeControl.setValue([]);
      this.periodControl.setValue(null);
    });

    // Cuando cambia el período, cargar novedades
    this.periodControl.valueChanges.subscribe(periodId => {
      if (periodId) {
        const period = this.periods.find(p => p.id === periodId);
        if (period) {
          this.loadNovedadesByPeriod(period.identificadorPeriodo);
        }
      } else {
        this.payrollItems = [];
      }
    });
  }

  loadClients() {
    this.http.get<Client[]>(this.clientsUrl).subscribe({
      next: data => {
        this.clients = data || [];
      },
      error: err => {
        console.error('Error al cargar clientes:', err);
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'No se pudieron cargar los clientes',
          life: 5000
        });
      }
    });
  }

  loadEmployeesByClient(clientId: string) {
    const url = `${this.clientsUrl}/employees`;
    this.http.get<any[]>(url).subscribe({
      next: data => {
        const all = data || [];
        const filtered = all.filter(e => String(e.clientId) === String(clientId));
        this.employees = filtered.map(e => ({
          id: e.id,
          name: (e.name ?? ((e.firstName ?? '') + ' ' + (e.lastName ?? ''))).trim(),
          clientId: e.clientId,
          salarioBase: e.salarioBase || 0,
          auxilioTransporte: e.auxilioTransporte || 0
        }));

        // Cargar datos de nómina para los empleados
        this.loadPayrollData();
      },
      error: err => {
        console.error('Error al cargar empleados:', err);
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'No se pudieron cargar los empleados',
          life: 5000
        });
      }
    });
  }

  loadPeriodsByClient(clientId: string) {
    const url = `${this.periodsUrl}/byClient/${clientId}`;
    this.http.get<Period[]>(url).subscribe({
      next: data => {
        this.periods = data || [];
      },
      error: err => {
        console.error('Error al cargar períodos:', err);
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'No se pudieron cargar los períodos',
          life: 5000
        });
      }
    });
  }

  loadPayrollData() {
    // No cargar automáticamente, la grid debe estar vacía hasta agregar novedades
    this.payrollItems = [];
  }

  loadNovedadesByPeriod(periodoIdentificacion: string) {
    this.loading = true;
    const url = `${this.novedadesUrl}/byperiod/${periodoIdentificacion}`;
    
    console.log('Cargando novedades desde:', url);
    
    this.http.get<PayrollItem[]>(url).subscribe({
      next: (data) => {
        console.log('Novedades cargadas:', data);
        this.payrollItems = Array.isArray(data) ? data : [];
        this.loading = false;
        
        if (this.payrollItems.length === 0) {
          this.messageService.add({
            severity: 'info',
            summary: 'Sin novedades',
            detail: 'No hay novedades registradas para este período',
            life: 3000
          });
        }
      },
      error: (err) => {
        console.error('Error al cargar novedades:', err);
        this.payrollItems = [];
        this.loading = false;
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'No se pudieron cargar las novedades del período',
          life: 5000
        });
      }
    });
  }

  openNovedadDialog() {
    const clientId = this.clientControl.value;
    const selectedEmployeeIds = this.employeeControl.value;
    const periodId = this.periodControl.value;

    if (!clientId || !selectedEmployeeIds?.length || !periodId) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Datos incompletos',
        detail: 'Debe seleccionar cliente, empleados y período',
        life: 3000
      });
      return;
    }

    // Preparar la lista temporal de novedades con los empleados seleccionados
    this.novedadesTemp = selectedEmployeeIds.map((empId: string) => {
      const employee = this.employees.find(e => e.id === empId);
      return {
        employeeId: empId,
        employeeName: employee?.name || '',
        deduccion: 0,
        concepto: ''
      };
    });

    // Resetear el formulario
    this.novedadForm.reset({
      deduccion: 0,
      concepto: ''
    });

    this.displayNovedadDialog = true;
  }

  getSelectedPeriodName(): string {
    const periodId = this.periodControl.value;
    if (!periodId) return '';
    
    const period = this.periods.find(p => p.id === periodId);
    if (!period) return '';
    
    return `${period.identificadorPeriodo} - ${period.descripcion} (${new Date(period.fechaInicio).toLocaleDateString('es-CO')} - ${new Date(period.fechaFin).toLocaleDateString('es-CO')})`;
  }

  saveNovedades() {
    // Validar que haya al menos una deducción con valor
    const hasValidDeductions = this.novedadesTemp.some(n => n.deduccion > 0);
    
    if (!hasValidDeductions) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Datos incompletos',
        detail: 'Debe ingresar al menos una deducción',
        life: 3000
      });
      return;
    }

    // Agregar o actualizar items en la grid de nómina
    this.novedadesTemp.forEach(novedad => {
      // Buscar si ya existe el empleado en la grid
      const existingIndex = this.payrollItems.findIndex(item => item.employeeId === novedad.employeeId);
      
      const employee = this.employees.find(e => e.id === novedad.employeeId);
      const newItem: PayrollItem = {
        employeeId: novedad.employeeId,
        employeeName: novedad.employeeName,
        salarioBase: employee?.salarioBase || 0,
        auxilioTransporte: employee?.auxilioTransporte || 0,
        deducciones: novedad.deduccion,
        conceptoDeducciones: novedad.concepto
      };

      if (existingIndex >= 0) {
        // Actualizar existente
        this.payrollItems[existingIndex] = newItem;
      } else {
        // Agregar nuevo
        this.payrollItems.push(newItem);
      }
    });

    this.messageService.add({
      severity: 'success',
      summary: 'Guardado',
      detail: 'Novedades agregadas correctamente',
      life: 3000
    });

    this.displayNovedadDialog = false;
  }

  editPayrollItem(item: PayrollItem) {
    console.log('Editando item de nómina:', item);
    // Aquí implementarás la lógica de edición
  }

  deletePayrollItem(item: PayrollItem) {
    this.confirmationService.confirm({
      message: `¿Está seguro de eliminar el registro de ${item.employeeName}?`,
      header: 'Confirmar Eliminación',
      icon: 'pi pi-exclamation-triangle',
      accept: () => {
        // Aquí implementarás la lógica de eliminación
        this.messageService.add({
          severity: 'success',
          summary: 'Eliminado',
          detail: 'Registro eliminado correctamente',
          life: 3000
        });
      }
    });
  }

  procesarNomina() {
    const clientId = this.clientControl.value;
    const periodId = this.periodControl.value;

    if (!clientId || !periodId) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Datos incompletos',
        detail: 'Debe seleccionar cliente y período',
        life: 3000
      });
      return;
    }

    // Aquí implementarás la lógica de procesamiento de nómina
    console.log('Procesando nómina para cliente:', clientId, 'período:', periodId);
  }
}
