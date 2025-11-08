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
import { CalendarModule } from 'primeng/calendar';
import { DialogModule } from 'primeng/dialog';
import { MessageModule } from 'primeng/message';
import { ToastModule } from 'primeng/toast';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ProgressBarModule } from 'primeng/progressbar';
import { TagModule } from 'primeng/tag';
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
  conceptoId: string;
  valor: number;
  fechaNovedad: Date;
}

interface ConceptoNovedad {
  id: string;
  nombreConcepto: string;
  nombreTipo: string;
}

interface ProcesoNominaResult {
  empleadoId: string;
  empleadoNombre: string;
  identificacion: string;
  salarioBase: number;
  devengos: number;
  deducciones: number;
  totalPagar: number;
  novedades: string;
  estado: 'success' | 'warning' | 'error';
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
    CalendarModule,
    DialogModule,
    MessageModule,
    ToastModule,
    ConfirmDialogModule,
    ProgressBarModule,
    TagModule
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
  private conceptosUrl = `${this.baseApi}/RegistroNovedad/concepts`;

  filterForm: FormGroup;
  novedadForm: FormGroup;
  clients: Client[] = [];
  employees: Employee[] = [];
  periods: Period[] = [];
  conceptos: ConceptoNovedad[] = [];
  conceptosAgrupados: any[] = [];
  payrollItems: PayrollItem[] = [];
  novedadesTemp: NovedadItem[] = [];
  loading = false;

  // Modal para novedades
  displayNovedadDialog = false;
  isEditMode = false;
  editingNovedadId: string | null = null;

  // Proceso de nómina
  tiposProceso = [
    { label: 'Cálculo de Nómina', value: 'calculo' },
    { label: 'Liquidación Empleado', value: 'liquidacion' }
  ];
  selectedProceso: string = 'calculo';
  procesoEnEjecucion = false;
  procesoProgress = 0;
  procesoResultados: ProcesoNominaResult[] = [];
  
  // Resumen del proceso
  totalEmpleados = 0;
  totalAPagar = 0;
  empleadosConErrores = 0;
  empleadosConAdvertencias = 0;

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
    this.loadConceptos();

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

  loadConceptos() {
    this.http.get<ConceptoNovedad[]>(this.conceptosUrl).subscribe({
      next: (data) => {
        console.log('Conceptos cargados:', data);
        this.conceptos = data || [];
        this.agruparConceptos();
      },
      error: (err) => {
        console.error('Error al cargar conceptos:', err);
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'No se pudieron cargar los conceptos',
          life: 5000
        });
      }
    });
  }

  agruparConceptos() {
    // Agrupar conceptos por nombreTipo
    const grupos = this.conceptos.reduce((acc: any, concepto) => {
      const tipo = concepto.nombreTipo || 'Otros';
      if (!acc[tipo]) {
        acc[tipo] = [];
      }
      acc[tipo].push({
        label: concepto.nombreConcepto,
        value: concepto.id
      });
      return acc;
    }, {});

    // Convertir a formato de PrimeNG OptionGroup
    this.conceptosAgrupados = Object.keys(grupos).map(tipo => ({
      label: tipo,
      items: grupos[tipo]
    }));

    console.log('Conceptos agrupados:', this.conceptosAgrupados);
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

    // Modo creación
    this.isEditMode = false;
    this.editingNovedadId = null;

    // Preparar la lista temporal de novedades con los empleados seleccionados
    this.novedadesTemp = selectedEmployeeIds.map((empId: string) => {
      const employee = this.employees.find(e => e.id === empId);
      return {
        employeeId: empId,
        employeeName: employee?.name || '',
        conceptoId: '',
        valor: 0,
        fechaNovedad: new Date()
      };
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
    // Validar que todas las filas tengan concepto, valor > 0 y fecha
    const invalidRows = this.novedadesTemp.filter(n => 
      !n.conceptoId || n.valor <= 0 || !n.fechaNovedad
    );
    
    if (invalidRows.length > 0) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Datos incompletos',
        detail: 'Todas las filas deben tener concepto seleccionado, valor mayor a 0 y fecha registrada',
        life: 4000
      });
      return;
    }

    const periodId = this.periodControl.value;
    const currentUser = localStorage.getItem('username') || 'Sistema';

    this.loading = true;

    if (this.isEditMode && this.editingNovedadId) {
      // Modo edición: usar PUT
      const novedad = this.novedadesTemp[0]; // Solo hay una fila en modo edición
      const payload = {
        conceptoNovedadId: novedad.conceptoId,
        valorNovedad: novedad.valor,
        fechaNovedad: this.formatDateForApi(novedad.fechaNovedad),
        fechaModificacion: this.formatDateForApi(new Date()),
        modificadoPor: currentUser
      };

      this.http.put(`${this.baseApi}/RegistroNovedad/${this.editingNovedadId}`, payload).subscribe({
        next: () => {
          this.messageService.add({
            severity: 'success',
            summary: 'Actualizado',
            detail: 'Novedad actualizada correctamente',
            life: 3000
          });

          this.displayNovedadDialog = false;
          
          // Recargar las novedades del período
          const period = this.periods.find(p => p.id === periodId);
          if (period) {
            this.loadNovedadesByPeriod(period.identificadorPeriodo);
          }
        },
        error: (error) => {
          console.error('Error al actualizar novedad:', error);
          this.loading = false;
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: 'No se pudo actualizar la novedad. Intente nuevamente.',
            life: 5000
          });
        }
      });
    } else {
      // Modo creación: usar POST
      const requests = this.novedadesTemp.map(novedad => {
        const payload = {
          empleadoId: novedad.employeeId,
          conceptoNovedadId: novedad.conceptoId,
          periodoNominaId: periodId,
          valorNovedad: novedad.valor,
          fechaNovedad: this.formatDateForApi(novedad.fechaNovedad),
          usuarioCreador: currentUser,
          fechaCreacion: this.formatDateForApi(new Date())
        };

        return this.http.post(`${this.baseApi}/RegistroNovedad`, payload);
      });

      // Ejecutar todas las peticiones
      Promise.all(requests.map(req => req.toPromise()))
        .then(() => {
          this.messageService.add({
            severity: 'success',
            summary: 'Guardado exitoso',
            detail: `${this.novedadesTemp.length} novedad(es) guardada(s) correctamente`,
            life: 3000
          });

          this.displayNovedadDialog = false;
          
          // Recargar las novedades del período
          const period = this.periods.find(p => p.id === periodId);
          if (period) {
            this.loadNovedadesByPeriod(period.identificadorPeriodo);
          }
        })
        .catch((error) => {
          console.error('Error al guardar novedades:', error);
          this.loading = false;
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: 'No se pudieron guardar las novedades. Intente nuevamente.',
            life: 5000
          });
        });
    }
  }

  private formatDateForApi(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');
    
    return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}.000Z`;
  }

  editPayrollItem(item: PayrollItem) {
    // Modo edición
    this.isEditMode = true;
    this.editingNovedadId = item.id || null;

    // Preparar la lista temporal con el item a editar
    this.novedadesTemp = [{
      employeeId: item.empleadoId || '',
      employeeName: item.empleadoNombre || '',
      conceptoId: item.conceptoNovedadId || '',
      valor: item.valorNovedad || 0,
      fechaNovedad: item.fechaNovedad ? new Date(item.fechaNovedad) : new Date()
    }];

    this.displayNovedadDialog = true;
  }

  deletePayrollItem(item: PayrollItem) {
    if (!item.id) {
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'No se puede eliminar el registro. ID no válido.',
        life: 3000
      });
      return;
    }

    // Confirmación con doble verificación en el mensaje
    this.confirmationService.confirm({
      message: `¿Está seguro de eliminar la novedad de ${item.empleadoNombre}? Esta acción no se puede deshacer.`,
      header: 'Confirmar Eliminación',
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Sí, eliminar',
      rejectLabel: 'Cancelar',
      acceptButtonStyleClass: 'p-button-danger',
      accept: () => {
        this.loading = true;
        
        this.http.delete(`${this.baseApi}/RegistroNovedad/delete/${item.id}`).subscribe({
          next: () => {
            this.loading = false;
            
            this.messageService.add({
              severity: 'success',
              summary: 'Eliminado',
              detail: 'Novedad eliminada correctamente',
              life: 3000
            });

            // Recargar las novedades del período
            const periodId = this.periodControl.value;
            const period = this.periods.find(p => p.id === periodId);
            if (period) {
              this.loadNovedadesByPeriod(period.identificadorPeriodo);
            }
          },
          error: (error) => {
            console.error('Error al eliminar novedad:', error);
            this.loading = false;
            
            this.messageService.add({
              severity: 'error',
              summary: 'Error',
              detail: error.error?.message || 'No se pudo eliminar la novedad. Intente nuevamente.',
              life: 5000
            });
          }
        });
      }
    });
  }

  ejecutarProceso() {
    const clientId = this.clientControl.value;
    const periodId = this.periodControl.value;

    if (!clientId || !periodId) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Datos incompletos',
        detail: 'Debe seleccionar cliente y período para ejecutar el proceso',
        life: 3000
      });
      return;
    }

    this.procesoEnEjecucion = true;
    this.procesoProgress = 0;
    this.procesoResultados = [];

    // Simular proceso con datos dummy
    const interval = setInterval(() => {
      this.procesoProgress += 10;
      
      if (this.procesoProgress >= 100) {
        clearInterval(interval);
        this.procesoEnEjecucion = false;
        this.generarResultadosDummy();
        this.calcularResumen();
        
        this.messageService.add({
          severity: 'success',
          summary: 'Proceso Completado',
          detail: `${this.selectedProceso === 'calculo' ? 'Cálculo' : 'Liquidación'} ejecutado correctamente`,
          life: 3000
        });
      }
    }, 300);
  }

  detenerProceso() {
    this.procesoEnEjecucion = false;
    this.procesoProgress = 0;
    
    this.messageService.add({
      severity: 'info',
      summary: 'Proceso Detenido',
      detail: 'El proceso ha sido cancelado',
      life: 3000
    });
  }

  generarResultadosDummy() {
    // Generar datos dummy para la tabla de resultados
    this.procesoResultados = [
      {
        empleadoId: '1',
        empleadoNombre: 'Carlos Rodríguez',
        identificacion: '1234567890',
        salarioBase: 2500000,
        devengos: 2800000,
        deducciones: 450000,
        totalPagar: 2350000,
        novedades: '2 Bonificaciones, 1 Deducción',
        estado: 'success'
      },
      {
        empleadoId: '2',
        empleadoNombre: 'María García',
        identificacion: '0987654321',
        salarioBase: 3000000,
        devengos: 3200000,
        deducciones: 520000,
        totalPagar: 2680000,
        novedades: '1 Bonificación',
        estado: 'success'
      },
      {
        empleadoId: '3',
        empleadoNombre: 'Juan Pérez',
        identificacion: '1122334455',
        salarioBase: 2200000,
        devengos: 2400000,
        deducciones: 380000,
        totalPagar: 2020000,
        novedades: 'Sin novedades',
        estado: 'warning'
      },
      {
        empleadoId: '4',
        empleadoNombre: 'Ana Martínez',
        identificacion: '5544332211',
        salarioBase: 2800000,
        devengos: 0,
        deducciones: 0,
        totalPagar: 0,
        novedades: 'Error: Datos incompletos',
        estado: 'error'
      }
    ];
  }

  calcularResumen() {
    this.totalEmpleados = this.procesoResultados.length;
    this.totalAPagar = this.procesoResultados.reduce((sum, item) => sum + item.totalPagar, 0);
    this.empleadosConErrores = this.procesoResultados.filter(r => r.estado === 'error').length;
    this.empleadosConAdvertencias = this.procesoResultados.filter(r => r.estado === 'warning').length;
  }

  descargarReporte(formato: 'pdf' | 'excel') {
    this.messageService.add({
      severity: 'info',
      summary: 'Generando Reporte',
      detail: `Descargando reporte en formato ${formato.toUpperCase()}...`,
      life: 3000
    });
    
    // Aquí implementarás la lógica real de descarga
    console.log(`Descargando reporte en formato: ${formato}`);
  }

  getEstadoSeverity(estado: string): 'success' | 'warning' | 'danger' | 'info' {
    switch (estado) {
      case 'success':
        return 'success';
      case 'warning':
        return 'warning';
      case 'error':
        return 'danger';
      default:
        return 'info';
    }
  }
}
