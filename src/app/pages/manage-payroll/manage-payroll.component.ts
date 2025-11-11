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
import { TooltipModule } from 'primeng/tooltip';
import { MessageService, ConfirmationService } from 'primeng/api';
import jsPDF from 'jspdf';

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
  adiciones: number;
  deducciones: number;
  diasTrabajados: number;
  totalHorasTrabajadas: number;
  totalHorasExtras: number;
  saludTrabajador: number;
  pensionTrabajador: number;
  totalPagar: number;
  novedades: string;
  estado: 'success' | 'warning' | 'error';
}

interface NominaCalculadaResponse {
  intIdNomina: number;
  strIdPeriodo_IdPeriodo: string | null;
  identificadorPeriodo: string;
  fechaInicioPeriodo: string;
  fechaFinPeriodo: string;
  nombreCliente: string;
  strNit: string | null;
  nitCliente: string;
  strNombre: string | null;
  nombreEmpleado: string;
  strApellido: string | null;
  apellidoEmpleado: string;
  nombreCompletoEmpleado: string;
  strIdentificacion: string | null;
  identificacionEmpleado: string;
  strIdentificador: string;
  nombreEmpleadoNomina: string;
  totalDevengadoPeriodo: number;
  totalAdicionesPeriodo: number;
  totalDeduccionesPeriodo: number;
  totalNetoPeriodo: number;
  diasTrabajados: number;
  totalHorasTrabajadas: number;
  totalHorasExtras: number;
  totalCantidadAdiciones: number;
  totalCantidadDeducciones: number;
  saludTrabajador: number;
  pensionTrabajador: number;
  totalDeduccionesTrabajador: number;
  salarioNetoFinal: number;
  fechaCreacion: string;
  strDescripcion: string | null;
  descripcionPeriodo: string;
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
    TagModule,
    TooltipModule
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
  private calcularNominaUrl = `${this.baseApi}/Nomina/CalcularNomina`;

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
  nominaCalculadaData: NominaCalculadaResponse[] = []; // Datos completos del API
  
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

    // Construir la URL con los parámetros
    const url = `${this.calcularNominaUrl}/${periodId}/${clientId}`;

    console.log('🚀 Ejecutando cálculo de nómina:', { periodId, clientId, url });

    // Simular progreso mientras se espera la respuesta
    const progressInterval = setInterval(() => {
      if (this.procesoProgress < 90) {
        this.procesoProgress += 10;
      }
    }, 300);

    // Consumir el endpoint
    this.http.get<NominaCalculadaResponse[]>(url).subscribe({
      next: (response) => {
        clearInterval(progressInterval);
        this.procesoProgress = 100;
        this.procesoEnEjecucion = false;

        console.log('✅ Respuesta del cálculo de nómina:', response);

        // Guardar los datos completos del API para generar PDFs individuales
        this.nominaCalculadaData = response;

        // Transformar la respuesta al formato de resultados
        this.procesoResultados = response.map(item => ({
          empleadoId: item.strIdentificador,
          empleadoNombre: item.nombreCompletoEmpleado,
          identificacion: item.identificacionEmpleado,
          salarioBase: item.totalDevengadoPeriodo - item.totalAdicionesPeriodo, // Aproximación
          devengos: item.totalDevengadoPeriodo,
          adiciones: item.totalAdicionesPeriodo,
          deducciones: item.totalDeduccionesTrabajador,
          diasTrabajados: item.diasTrabajados,
          totalHorasTrabajadas: item.totalHorasTrabajadas,
          totalHorasExtras: item.totalHorasExtras,
          saludTrabajador: item.saludTrabajador,
          pensionTrabajador: item.pensionTrabajador,
          totalPagar: item.salarioNetoFinal,
          novedades: `${item.totalCantidadAdiciones} Adiciones, ${item.totalCantidadDeducciones} Deducciones`,
          estado: 'success' as const
        }));

        this.calcularResumen();

        this.messageService.add({
          severity: 'success',
          summary: 'Proceso Completado',
          detail: `Cálculo de nómina ejecutado correctamente. ${response.length} empleado(s) procesado(s).`,
          life: 5000
        });
      },
      error: (error) => {
        clearInterval(progressInterval);
        this.procesoEnEjecucion = false;
        this.procesoProgress = 0;

        console.error('❌ Error al calcular nómina:', error);

        this.messageService.add({
          severity: 'error',
          summary: 'Error en el Proceso',
          detail: error.error?.message || 'Ocurrió un error al calcular la nómina. Verifique los datos e intente nuevamente.',
          life: 5000
        });
      }
    });
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
        adiciones: 300000,
        deducciones: 450000,
        diasTrabajados: 15,
        totalHorasTrabajadas: 120,
        totalHorasExtras: 10,
        saludTrabajador: 100000,
        pensionTrabajador: 100000,
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
        adiciones: 200000,
        deducciones: 520000,
        diasTrabajados: 15,
        totalHorasTrabajadas: 120,
        totalHorasExtras: 5,
        saludTrabajador: 120000,
        pensionTrabajador: 120000,
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
        adiciones: 200000,
        deducciones: 380000,
        diasTrabajados: 14,
        totalHorasTrabajadas: 112,
        totalHorasExtras: 8,
        saludTrabajador: 88000,
        pensionTrabajador: 88000,
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
        adiciones: 0,
        deducciones: 0,
        diasTrabajados: 0,
        totalHorasTrabajadas: 0,
        totalHorasExtras: 0,
        saludTrabajador: 0,
        pensionTrabajador: 0,
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

  generarColillaPDF(item: ProcesoNominaResult) {
    // Buscar los datos completos del empleado en la respuesta del API
    const datosCompletos = this.nominaCalculadaData.find(
      (n: NominaCalculadaResponse) => n.strIdentificador === item.empleadoId
    );

    if (!datosCompletos) {
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'No se encontraron los datos completos del empleado',
        life: 3000
      });
      return;
    }

    // Importar jsPDF dinámicamente
    import('jspdf').then((jsPDFModule) => {
      const jsPDF = jsPDFModule.default;
      const doc = new jsPDF();

      // Configuración de colores
      const azulSligo = [0, 150, 215];
      const grisClaro = [240, 240, 240];
      const grisMedio = [200, 200, 200];

      // Header con fondo azul
      doc.setFillColor(azulSligo[0], azulSligo[1], azulSligo[2]);
      doc.rect(0, 0, 210, 40, 'F');
      
      // Logo de Empanadas (círculo amarillo con rojo)
      // Círculo amarillo
      doc.setFillColor(255, 223, 0);
      doc.circle(25, 20, 12, 'F');
      
      // Borde rojo
      doc.setDrawColor(220, 20, 60);
      doc.setLineWidth(1.5);
      doc.circle(25, 20, 12, 'S');
      
      // Texto del logo (simulado)
      doc.setTextColor(220, 20, 60);
      doc.setFontSize(7);
      doc.setFont('helvetica', 'bold');
      doc.text('EMPANADAS', 25, 17, { align: 'center' });
      doc.text('El Paradero', 25, 23, { align: 'center' });

      // Información de la empresa (texto blanco)
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.text(datosCompletos.nombreCliente.toUpperCase(), 105, 15, { align: 'center' });
      doc.text(`Nit ${datosCompletos.nitCliente}`, 105, 21, { align: 'center' });

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(12);
      doc.text('Documento soporte de pago nómina electrónica', 105, 30, { align: 'center' });

      // Información del período y empleado
      doc.setTextColor(0, 0, 0);
      doc.setFontSize(9);
      
      const yStart = 45;
      doc.text(`Período de Pago: ${new Date(datosCompletos.fechaInicioPeriodo).toLocaleDateString()} - ${new Date(datosCompletos.fechaFinPeriodo).toLocaleDateString()}`, 15, yStart);
      doc.text(`Comprobante Número: ${datosCompletos.intIdNomina}`, 150, yStart);
      
      doc.text(`Nombre: ${datosCompletos.nombreCompletoEmpleado.toUpperCase()}`, 15, yStart + 7);
      doc.text(`Identificación: ${datosCompletos.identificacionEmpleado}`, 15, yStart + 14);
      doc.text(`Cargo: Asistente Ventas`, 150, yStart + 14);
      
      doc.setFont('helvetica', 'bold');
      doc.text(`Salario básico: ${datosCompletos.totalDevengadoPeriodo.toLocaleString('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 2 })}`, 15, yStart + 21);

      doc.text(`Fecha Generación: ${new Date().toLocaleDateString()}`, 150, yStart + 7);
      doc.text(`Fecha Emisión: ${new Date(datosCompletos.fechaCreacion).toLocaleDateString()}`, 150, yStart + 21);

      // Línea separadora
      doc.setDrawColor(grisMedio[0], grisMedio[1], grisMedio[2]);
      doc.line(15, yStart + 25, 195, yStart + 25);

      // Sección INGRESOS Y DEDUCCIONES
      const yTablas = yStart + 35;
      
      // INGRESOS (izquierda)
      doc.setFillColor(grisClaro[0], grisClaro[1], grisClaro[2]);
      doc.rect(15, yTablas, 85, 8, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.text('INGRESOS', 17, yTablas + 5);

      // Headers de la tabla de ingresos
      doc.setFontSize(8);
      doc.text('Concepto', 17, yTablas + 12);
      doc.text('Cantidad', 60, yTablas + 12, { align: 'right' });
      doc.text('Valor', 98, yTablas + 12, { align: 'right' });

      doc.setFont('helvetica', 'normal');
      let yIngresos = yTablas + 18;

      // Sueldo
      doc.text('Sueldo', 17, yIngresos);
      doc.text(datosCompletos.diasTrabajados.toFixed(2), 60, yIngresos, { align: 'right' });
      doc.text(datosCompletos.totalDevengadoPeriodo.toLocaleString('es-CO', { style: 'currency', currency: 'COP' }), 98, yIngresos, { align: 'right' });
      yIngresos += 6;

      // Auxilio de Transporte (si aplica)
      if (datosCompletos.totalAdicionesPeriodo > 0) {
        doc.text('Auxilio de Transporte', 17, yIngresos);
        doc.text(datosCompletos.diasTrabajados.toFixed(2), 60, yIngresos, { align: 'right' });
        doc.text(datosCompletos.totalAdicionesPeriodo.toLocaleString('es-CO', { style: 'currency', currency: 'COP' }), 98, yIngresos, { align: 'right' });
        yIngresos += 6;
      }

      // Horas extras si aplica
      if (datosCompletos.totalHorasExtras > 0) {
        doc.text('Horas Extras', 17, yIngresos);
        doc.text(datosCompletos.totalHorasExtras.toFixed(2), 60, yIngresos, { align: 'right' });
        doc.text('$ 0.00', 98, yIngresos, { align: 'right' });
        yIngresos += 6;
      }

      // Total Ingresos
      yIngresos += 3;
      doc.setFont('helvetica', 'bold');
      doc.text('Total Ingresos', 17, yIngresos);
      const totalIngresos = datosCompletos.totalDevengadoPeriodo + datosCompletos.totalAdicionesPeriodo;
      doc.text(totalIngresos.toLocaleString('es-CO', { style: 'currency', currency: 'COP' }), 98, yIngresos, { align: 'right' });

      // DEDUCCIONES (derecha)
      doc.setFillColor(grisClaro[0], grisClaro[1], grisClaro[2]);
      doc.rect(110, yTablas, 85, 8, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.text('DEDUCCIONES', 112, yTablas + 5);

      // Headers de la tabla de deducciones
      doc.setFontSize(8);
      doc.text('Concepto', 112, yTablas + 12);
      doc.text('Cantidad', 155, yTablas + 12, { align: 'right' });
      doc.text('Valor', 193, yTablas + 12, { align: 'right' });

      doc.setFont('helvetica', 'normal');
      let yDeducciones = yTablas + 18;

      // Fondo de Salud
      doc.text('Fondo de Salud', 112, yDeducciones);
      doc.text('1.00', 155, yDeducciones, { align: 'right' });
      doc.text(datosCompletos.saludTrabajador.toLocaleString('es-CO', { style: 'currency', currency: 'COP' }), 193, yDeducciones, { align: 'right' });
      yDeducciones += 6;

      // Fondo de Pensión
      doc.text('Fondo de Pensión', 112, yDeducciones);
      doc.text('1.00', 155, yDeducciones, { align: 'right' });
      doc.text(datosCompletos.pensionTrabajador.toLocaleString('es-CO', { style: 'currency', currency: 'COP' }), 193, yDeducciones, { align: 'right' });
      yDeducciones += 6;

      // Total Deducciones
      yDeducciones += 3;
      doc.setFont('helvetica', 'bold');
      doc.text('Total Deducciones', 112, yDeducciones);
      doc.text(`-${datosCompletos.totalDeduccionesTrabajador.toLocaleString('es-CO', { style: 'currency', currency: 'COP' })}`, 193, yDeducciones, { align: 'right' });

      // NETO A PAGAR (destacado)
      const yNeto = Math.max(yIngresos, yDeducciones) + 15;
      doc.setFillColor(grisClaro[0], grisClaro[1], grisClaro[2]);
      doc.rect(110, yNeto, 85, 10, 'F');
      
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.text('NETO A PAGAR', 112, yNeto + 7);
      doc.setFontSize(12);
      doc.text(datosCompletos.salarioNetoFinal.toLocaleString('es-CO', { style: 'currency', currency: 'COP' }), 193, yNeto + 7, { align: 'right' });

      // Medio de pago
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.text('Medio de pago:', 15, yNeto + 7);

      // Footer
      doc.setFontSize(7);
      doc.setTextColor(100, 100, 100);
      doc.text('Este documento es un soporte de pago de nómina electrónica', 105, 280, { align: 'center' });

      // Descargar el PDF
      doc.save(`Colilla_${datosCompletos.nombreCompletoEmpleado.replace(/\s+/g, '_')}_${datosCompletos.identificadorPeriodo}.pdf`);

      this.messageService.add({
        severity: 'success',
        summary: 'PDF Generado',
        detail: `Colilla de nómina generada para ${datosCompletos.nombreCompletoEmpleado}`,
        life: 3000
      });
    });
  }
}
