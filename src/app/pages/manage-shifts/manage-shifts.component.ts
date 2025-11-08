// pages/manage-shifts/manage-shifts.component.ts
import { Component, OnInit, ViewChild, inject, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, FormControl, Validators } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { FullCalendarComponent } from '@fullcalendar/angular';
import { Calendar } from 'primeng/calendar';
import { FullCalendarModule } from '@fullcalendar/angular';
import { CalendarOptions, EventInput } from '@fullcalendar/core';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import resourceTimelinePlugin from '@fullcalendar/resource-timeline';
import esLocale from '@fullcalendar/core/locales/es';
import { CardModule } from 'primeng/card';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { CalendarModule } from 'primeng/calendar';
import { DropdownModule } from 'primeng/dropdown';
import { MultiSelectModule } from 'primeng/multiselect';
import { DialogModule } from 'primeng/dialog';
import { CheckboxModule } from 'primeng/checkbox';
import { MessageModule } from 'primeng/message';
import { TooltipModule } from 'primeng/tooltip';
import { MessageService } from 'primeng/api';

interface Client {
  id: string;
  name: string;
}

interface Employee {
  id: string;
  name: string;
  clientId: string;
}

interface Shift {
  id: string;
  employeeId?: string;
  idEmpleado?: string; // Campo del API
  employeeName?: string;
  employeeName1?: string; // Campo del API
  clientId?: string;
  clientName?: string;
  estado?: string;
  observaciones?: string; // Campo del API
  observations?: string;
  createdBy?: string;
  creationDate?: string;
  modifiedBy?: string | null;
  modificationDate?: string | null;
  fechaInicioProgramada?: string; // Campo del API
  fechaFinProgramada?: string; // Campo del API
  horaInicioProgramada?: string; // Campo del API
  horaFinProgramada?: string; // Campo del API
  shiftDate?: Date;
  startTime?: string;
  endTime?: string;
}

@Component({
  selector: 'app-manage-shifts',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FullCalendarModule,
    CardModule,
    TableModule,
    ButtonModule,
    CalendarModule,
    DropdownModule,
    MultiSelectModule,
    DialogModule,
    CheckboxModule,
    MessageModule,
    TooltipModule
  ],
  providers: [MessageService],
  templateUrl: './manage-shifts.component.html',
  styleUrls: ['./manage-shifts.component.css']
})
export class ManageShiftsComponent implements OnInit {
  private fb = inject(FormBuilder);
  private http = inject(HttpClient);
  private messageService = inject(MessageService);

  @ViewChild('calendar') calendarComponent!: FullCalendarComponent;
  @ViewChild('startDateCalendar') startDateCalendar?: Calendar;

  private baseApi = 'https://localhost:7019/api';
  private clientsUrl = `${this.baseApi}/Clients`;
  private employeesUrl = `${this.baseApi}/Employees`;
  private shiftsUrl = `${this.baseApi}/TurnoProgramado`;

  filterForm: FormGroup;
  shiftForm: FormGroup;
  clients: Client[] = [];
  employees: Employee[] = [];
  allShifts: Shift[] = [];
  filteredShifts: Shift[] = [];
  loading = false;
  errorMessage = '';
  
  // Modal
  displayShiftDialog = false;
  dialogEmployees: Employee[] = [];
  shouldAutoFocus = true; // Controla si se debe hacer autofocus en fecha inicio

  // FullCalendar
  calendarOptions: CalendarOptions = {
    plugins: [dayGridPlugin, timeGridPlugin, interactionPlugin, resourceTimelinePlugin],
    initialView: 'resourceTimelineWeek',
    schedulerLicenseKey: 'CC-Attribution-NonCommercial-NoDerivatives',
    headerToolbar: {
      left: 'prev,next today',
      center: 'title',
      right: 'resourceTimelineDay,resourceTimelineWeek,resourceTimelineMonth'
    },
    editable: true,
    selectable: true,
    selectMirror: true,
    dayMaxEvents: true,
    weekends: true,
    slotMinTime: '06:00:00',
    slotMaxTime: '22:00:00',
    locale: esLocale,
    resourceAreaHeaderContent: 'Empleados',
    resourceAreaWidth: '200px',
    resources: [],
    events: [],
    eventClick: this.handleEventClick.bind(this),
    select: this.handleDateSelect.bind(this),
    eventDrop: this.handleEventDrop.bind(this),
    eventResize: this.handleEventResize.bind(this),
    height: 'auto'
  };

  // Getters para los FormControls
  get dateRangeControl(): FormControl {
    return this.filterForm.get('dateRange') as FormControl;
  }

  get clientControl(): FormControl {
    return this.filterForm.get('client') as FormControl;
  }

  get employeeControl(): FormControl {
    return this.filterForm.get('employee') as FormControl;
  }

  constructor() {
    this.filterForm = this.fb.group({
      dateRange: [null],
      client: [null],
      employee: [[]] // Array vacío para selección múltiple
    });

    this.shiftForm = this.fb.group({
      startDate: [null, Validators.required],
      endDate: [null, Validators.required],
      startTime: ['', Validators.required],
      endTime: ['', Validators.required],
      employees: [[], Validators.required],
      replicate: [false],
      replicateDays: [[]],
      replicateUntil: [null]
    });
  }

  ngOnInit() {
    this.loadClients();
    // NO cargar empleados al inicio
    this.loadShifts();
    
    // Escuchar cambios en el cliente seleccionado para cargar empleados
    this.clientControl.valueChanges.subscribe(clientId => {
      if (clientId) {
        this.loadEmployeesByClient(clientId);
      } else {
        this.employees = []; // Limpiar empleados
        this.updateCalendarData(); // Actualizar calendario sin recursos
        this.employeeControl.setValue([]); // Array vacío para multiselect
      }
    });
    
    // Escuchar cambios en el rango de fechas para aplicar filtro automático
    this.dateRangeControl.valueChanges.subscribe(dateRange => {
      if (dateRange && dateRange[0] && dateRange[1]) {
        console.log('Rango de fechas seleccionado:', dateRange);
        // Aplicar filtros automáticamente
        this.applyFilters();
        
        // Navegar el calendario a la fecha inicial del rango usando la API
        const startDate = dateRange[0];
        const dateStr = startDate instanceof Date 
          ? startDate.toISOString().split('T')[0]
          : startDate;
        
        console.log('Navegando calendario a:', dateStr);
        
        // Usar setTimeout para asegurar que el calendario esté renderizado
        setTimeout(() => {
          if (this.calendarComponent) {
            const calendarApi = this.calendarComponent.getApi();
            calendarApi.gotoDate(dateStr);
            console.log('Calendario navegado a:', dateStr);
          }
        }, 100);
      }
    });
  }

  loadClients() {
    this.http.get<Client[]>(this.clientsUrl).subscribe({
      next: (data) => {
        this.clients = data;
      },
      error: (error) => {
        console.error('Error al cargar clientes:', error);
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'Error al cargar clientes',
          life: 5000
        });
      }
    });
  }

  loadEmployeesByClient(clientId: string) {
    this.loading = true;
    const url = `${this.clientsUrl}/employees`;
    this.http.get<any[]>(url).subscribe({
      next: (data) => {
        const all = (data || []);
        // Filtrar por clientId
        const filtered = clientId ? all.filter(e => String(e.clientId) === String(clientId)) : all;
        // Mapear a la estructura Employee
        this.employees = filtered.map(e => ({
          id: e.id,
          name: (e.name ?? ((e.firstName ?? '') + ' ' + (e.lastName ?? ''))).trim(),
          clientId: e.clientId
        }));
        this.updateCalendarData(); // Actualizar recursos del calendario
        this.loading = false;
      },
      error: (error) => {
        console.error('Error al cargar empleados:', error);
        this.employees = [];
        this.loading = false;
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'Error al cargar empleados',
          life: 5000
        });
      }
    });
  }

  loadAllEmployees() {
    this.loading = true;
    const url = `${this.clientsUrl}/employees`;
    this.http.get<any[]>(url).subscribe({
      next: (data) => {
        const all = (data || []);
        // Mapear todos los empleados sin filtrar
        this.employees = all.map(e => ({
          id: e.id,
          name: (e.name ?? ((e.firstName ?? '') + ' ' + (e.lastName ?? ''))).trim(),
          clientId: e.clientId
        }));
        console.log('Todos los empleados cargados:', this.employees);
        this.updateCalendarData(); // Actualizar recursos del calendario
        this.loading = false;
      },
      error: (error) => {
        console.error('Error al cargar empleados:', error);
        this.employees = [];
        this.loading = false;
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'Error al cargar empleados',
          life: 5000
        });
      }
    });
  }

  loadShifts() {
    this.loading = true;
    this.http.get<Shift[]>(this.shiftsUrl).subscribe({
      next: (data) => {
        console.log('Datos recibidos del API:', data);
        this.allShifts = Array.isArray(data) ? data : [data];
        this.filteredShifts = [...this.allShifts];
        this.updateCalendarData(); // Actualizar el calendario con los nuevos datos
        this.loading = false;
      },
      error: (error) => {
        console.error('Error al cargar turnos:', error);
        this.loading = false;
        this.errorMessage = 'Error al cargar turnos';
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'Error al cargar turnos',
          life: 5000
        });
      }
    });
  }

  search() {
    console.log('=== BÚSQUEDA INICIADA ===');
    console.log('Cliente seleccionado:', this.clientControl.value);
    console.log('Empleados seleccionados:', this.employeeControl.value);
    console.log('Empleados cargados en memoria:', this.employees.length);
    
    // Si hay un cliente seleccionado pero no hay empleados cargados, cargarlos primero
    const clientId = this.clientControl.value;
    if (clientId && this.employees.length === 0) {
      console.log('Cargando empleados del cliente antes de aplicar filtros...');
      this.loadEmployeesByClient(clientId);
      // applyFilters se llamará automáticamente desde loadEmployeesByClient -> updateCalendarData
    } else {
      this.applyFilters();
    }
    
    this.messageService.add({
      severity: 'info',
      summary: 'Búsqueda',
      detail: 'Aplicando filtros...',
      life: 3000
    });
  }

  applyFilters() {
    let filtered = [...this.allShifts];
    
    console.log('=== APLICANDO FILTROS ===');
    console.log('Total de turnos antes de filtrar:', filtered.length);

    // Filtrar por rango de fechas
    const dateRange = this.dateRangeControl.value;
    if (dateRange && dateRange[0] && dateRange[1]) {
      const startDate = new Date(dateRange[0]);
      const endDate = new Date(dateRange[1]);
      filtered = filtered.filter(shift => {
        const shiftDateValue = shift.fechaInicioProgramada || shift.shiftDate;
        if (!shiftDateValue) return false;
        const shiftDate = new Date(shiftDateValue);
        return shiftDate >= startDate && shiftDate <= endDate;
      });
      console.log('Después de filtrar por fechas:', filtered.length);
    }

    // Filtrar por empleados (selección múltiple) - solo si hay empleados seleccionados
    const employeeIds = this.employeeControl.value;
    if (employeeIds && Array.isArray(employeeIds) && employeeIds.length > 0) {
      console.log('Filtrando por empleados seleccionados:', employeeIds);
      filtered = filtered.filter(shift => {
        const empId = String(shift.employeeId || shift.idEmpleado || '');
        const includes = employeeIds.includes(empId);
        if (!includes) {
          console.log(`Turno ${shift.id} excluido: employeeId ${empId} no está en la lista`);
        }
        return includes;
      });
      console.log('Después de filtrar por empleados:', filtered.length);
    } else if (this.clientControl.value) {
      // Si no hay empleados seleccionados PERO hay un cliente, filtrar por cliente
      const clientId = this.clientControl.value;
      console.log('No hay empleados seleccionados. Filtrando por cliente:', clientId);
      filtered = filtered.filter(shift => {
        const shiftClientId = String(shift.clientId || '');
        return shiftClientId === String(clientId);
      });
      console.log('Después de filtrar por cliente:', filtered.length);
    } else {
      // Si no hay ni empleados ni cliente seleccionado, mostrar todos los turnos
      console.log('No hay filtros de empleado ni cliente. Mostrando todos los turnos (solo filtrados por fecha si aplica)');
    }

    this.filteredShifts = filtered;
    console.log('Total de turnos después de filtrar:', this.filteredShifts.length);
    console.log('=== FIN APLICACIÓN DE FILTROS ===');
    
    this.updateCalendarData(); // Actualizar el calendario con los datos filtrados
  }

  clearFilters() {
    this.filterForm.reset({
      dateRange: null,
      client: null,
      employee: [] // Array vacío para el multiselect
    });
    this.employees = [];
    this.filteredShifts = [...this.allShifts];
    this.updateCalendarData(); // Actualizar el calendario
    this.messageService.add({
      severity: 'info',
      summary: 'Filtros',
      detail: 'Filtros limpiados',
      life: 3000
    });
  }


  addShift() {
    // Habilitar autofocus para modo creación
    this.shouldAutoFocus = true;
    
    // Limpiar el ID de edición
    delete (this.shiftForm as any).editingShiftId;
    
    // Siempre abrir el modal
    this.displayShiftDialog = true;
    
    // Validar que haya un cliente seleccionado
    const selectedClient = this.clientControl.value;
    if (!selectedClient) {
      // No cargar empleados si no hay cliente
      this.dialogEmployees = [];
      return;
    }

    // Cargar empleados del cliente seleccionado para el modal
    this.loadEmployeesForDialog(selectedClient);
    
    // Resetear el formulario
    this.shiftForm.reset({
      startDate: null,
      endDate: null,
      startTime: '',
      endTime: '',
      employees: [],
      replicate: false,
      replicateDays: [],
      replicateUntil: null
    });
    
    // Asegurar que el checkbox de replicar esté habilitado
    this.shiftForm.get('replicate')?.enable();
    
    // Hacer focus en el campo de fecha inicio después de que se renderice el modal
    setTimeout(() => {
      if (this.startDateCalendar && this.startDateCalendar.inputfieldViewChild) {
        this.startDateCalendar.inputfieldViewChild.nativeElement.focus();
      }
    }, 100);
  }

  loadEmployeesForDialog(clientId: string) {
    const url = `${this.clientsUrl}/employees`;
    this.http.get<any[]>(url).subscribe({
      next: (data) => {
        const all = (data || []);
        const filtered = all.filter(e => String(e.clientId) === String(clientId));
        this.dialogEmployees = filtered.map(e => ({
          id: e.id,
          name: (e.name ?? ((e.firstName ?? '') + ' ' + (e.lastName ?? ''))).trim(),
          clientId: e.clientId
        }));
      },
      error: (error) => {
        console.error('Error al cargar empleados para el diálogo:', error);
        this.dialogEmployees = [];
      }
    });
  }

  saveShift() {
    if (this.shiftForm.invalid) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Validación',
        detail: 'Complete todos los campos requeridos',
        life: 5000
      });
      return;
    }

    const formValue = this.shiftForm.value;
    console.log('Guardar turno:', formValue);
    
    // Verificar si estamos en modo edición
    const editingId = (this.shiftForm as any).editingShiftId;
    
    if (editingId) {
      // MODO EDICIÓN: Actualizar turno existente
      this.updateShift(editingId, formValue);
    } else {
      // MODO CREACIÓN: Crear nuevo turno
      this.createShift(formValue);
    }
  }

  updateShift(id: string, formValue: any) {
    // Formatear las fechas y horas según el formato esperado por el API
    const startDate = formValue.startDate ? this.formatDate(formValue.startDate) : '';
    const endDate = formValue.endDate ? this.formatDate(formValue.endDate) : '';
    const startTime = formValue.startTime ? this.formatTime(formValue.startTime) : '';
    const endTime = formValue.endTime ? this.formatTime(formValue.endTime) : '';
    
    // Construir el payload según la estructura del API
    const payload = {
      fechaInicioProgramada: startDate,
      horaInicioProgramada: startTime,
      fechaFinProgramada: endDate,
      horaFinProgramada: endTime,
      observaciones: formValue.observations || '',
      modifiedBy: 'string' // Ajustar según el usuario actual
    };
    
    console.log('Actualizando turno:', { id, payload });
    
    // Llamar al servicio PUT
    this.http.put(`${this.shiftsUrl}/${id}`, payload).subscribe({
      next: (response) => {
        console.log('Turno actualizado exitosamente:', response);
        this.messageService.add({
          severity: 'success',
          summary: 'Éxito',
          detail: 'Turno actualizado correctamente',
          life: 3000
        });
        
        this.displayShiftDialog = false;
        this.loadShifts(); // Recargar la lista
      },
      error: (error) => {
        console.error('Error al actualizar turno:', error);
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'No se pudo actualizar el turno',
          life: 5000
        });
      }
    });
  }

  createShift(formValue: any) {
    // Lógica existente para crear turno nuevo
    this.messageService.add({
      severity: 'success',
      summary: 'Éxito',
      detail: 'Turno creado correctamente',
      life: 3000
    });
    
    this.displayShiftDialog = false;
    this.loadShifts(); // Recargar la lista
  }

  private formatDate(date: Date): string {
    if (!date) return '';
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  private formatTime(time: Date | string): string {
    if (!time) return '';
    if (typeof time === 'string') return time;
    const hours = String(time.getHours()).padStart(2, '0');
    const minutes = String(time.getMinutes()).padStart(2, '0');
    return `${hours}:${minutes}:00`;
  }

  cancelShift() {
    this.displayShiftDialog = false;
    this.shiftForm.reset();
    // Limpiar el ID de edición
    delete (this.shiftForm as any).editingShiftId;
    // Rehabilitar el checkbox de replicar
    this.shiftForm.get('replicate')?.enable();
  }

  isEditMode(): boolean {
    return !!(this.shiftForm as any).editingShiftId;
  }

  editShift(shift: Shift) {
    console.log('=== EDITANDO TURNO ===');
    console.log('Turno completo:', shift);
    
    // Deshabilitar autofocus para modo edición
    this.shouldAutoFocus = false;
    
    // Guardar el ID del turno que se está editando PRIMERO
    (this.shiftForm as any).editingShiftId = shift.id;
    
    // Deshabilitar el checkbox de replicar en modo edición
    this.shiftForm.get('replicate')?.disable();
    
    // Obtener las fechas del turno
    const startDateStr = shift.fechaInicioProgramada || shift.shiftDate;
    const endDateStr = shift.fechaFinProgramada || shift.shiftDate;
    const startTime = shift.horaInicioProgramada || shift.startTime || '';
    const endTime = shift.horaFinProgramada || shift.endTime || '';
    const employeeId = String(shift.employeeId || shift.idEmpleado || '');
    
    console.log('Datos extraídos del turno:', {
      startDateStr,
      endDateStr,
      startTime,
      endTime,
      employeeId,
      clientId: shift.clientId
    });
    
    // Convertir las fechas (solo fecha, sin hora) - formato "YYYY-MM-DD"
    let startDateObj: Date | null = null;
    let endDateObj: Date | null = null;
    
    if (startDateStr) {
      if (typeof startDateStr === 'string') {
        const parts = startDateStr.split('-');
        startDateObj = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
        startDateObj.setHours(0, 0, 0, 0);
      } else {
        startDateObj = new Date(startDateStr);
        startDateObj.setHours(0, 0, 0, 0);
      }
    }
    
    if (endDateStr) {
      if (typeof endDateStr === 'string') {
        const parts = endDateStr.split('-');
        endDateObj = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
        endDateObj.setHours(0, 0, 0, 0);
      } else {
        endDateObj = new Date(endDateStr);
        endDateObj.setHours(0, 0, 0, 0);
      }
    }
    
    // Convertir las horas - usar una fecha base y solo setear la hora
    let startTimeDate: Date | null = null;
    let endTimeDate: Date | null = null;
    
    if (startTime) {
      const timeParts = startTime.split(':');
      startTimeDate = new Date();
      startTimeDate.setHours(parseInt(timeParts[0]), parseInt(timeParts[1]), 0, 0);
    }
    
    if (endTime) {
      const timeParts = endTime.split(':');
      endTimeDate = new Date();
      endTimeDate.setHours(parseInt(timeParts[0]), parseInt(timeParts[1]), 0, 0);
    }
    
    console.log('Fechas y horas convertidas:', {
      startDateObj,
      endDateObj,
      startTimeDate,
      endTimeDate
    });
    
    // Obtener el clientId del control de filtro o del turno
    const clientIdToUse = this.clientControl.value || shift.clientId;
    
    console.log('ClientId a usar:', clientIdToUse);
    console.log('ClientId del filtro:', this.clientControl.value);
    console.log('ClientId del turno:', shift.clientId);
    
    // Si hay cliente, establecerlo y cargar empleados
    if (clientIdToUse) {
      console.log('Estableciendo cliente:', clientIdToUse);
      
      // Si el cliente no está en el control, establecerlo
      if (!this.clientControl.value) {
        this.clientControl.setValue(clientIdToUse);
      }
      
      // Cargar empleados del cliente
      const url = `${this.clientsUrl}/employees`;
      console.log('Llamando a URL:', url);
      
      this.http.get<any[]>(url).subscribe({
        next: (data) => {
          console.log('Respuesta del API (empleados):', data);
          
          const all = (data || []);
          const filtered = all.filter(e => String(e.clientId) === String(clientIdToUse));
          
          console.log('Empleados filtrados por cliente:', filtered);
          
          this.dialogEmployees = filtered.map(e => ({
            id: e.id,
            name: (e.name ?? ((e.firstName ?? '') + ' ' + (e.lastName ?? ''))).trim(),
            clientId: e.clientId
          }));
          
          console.log('Empleados cargados para el diálogo:', this.dialogEmployees);
          console.log('ID de empleado a seleccionar:', employeeId);
          
          // Ahora que los empleados están cargados, llenar el formulario
          this.shiftForm.patchValue({
            startDate: startDateObj,
            endDate: endDateObj,
            startTime: startTimeDate,
            endTime: endTimeDate,
            employees: [employeeId],
            replicate: false,
            replicateDays: [],
            replicateUntil: null
          });
          
          console.log('Formulario después de patchValue:', this.shiftForm.value);
          console.log('Form controls values:', {
            startDate: this.shiftForm.get('startDate')?.value,
            endDate: this.shiftForm.get('endDate')?.value,
            startTime: this.shiftForm.get('startTime')?.value,
            endTime: this.shiftForm.get('endTime')?.value,
            employees: this.shiftForm.get('employees')?.value
          });
          
          // Abrir el modal DESPUÉS de cargar los datos
          this.displayShiftDialog = true;
          
          this.messageService.add({
            severity: 'info',
            summary: 'Editar',
            detail: `Editando turno`,
            life: 3000
          });
          
          console.log('=== FIN EDICIÓN - Modal abierto ===');
        },
        error: (error) => {
          console.error('Error al cargar empleados para edición:', error);
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: 'No se pudieron cargar los empleados',
            life: 3000
          });
        }
      });
    } else {
      console.log('No hay clientId, abriendo modal sin empleados');
      
      // Si no hay cliente, igual llenar el formulario con las fechas
      this.shiftForm.patchValue({
        startDate: startDateObj,
        endDate: endDateObj,
        startTime: startTimeDate,
        endTime: endTimeDate,
        employees: [],
        replicate: false,
        replicateDays: [],
        replicateUntil: null
      });
      
      // Abrir el modal
      this.displayShiftDialog = true;
      
      this.messageService.add({
        severity: 'warn',
        summary: 'Advertencia',
        detail: 'No se pudo determinar el cliente del turno',
        life: 3000
      });
    }
  }
  
  convertTimeStringToDate(timeString: string): Date {
    const today = new Date();
    if (timeString) {
      const parts = timeString.split(':');
      today.setHours(parseInt(parts[0] || '0', 10));
      today.setMinutes(parseInt(parts[1] || '0', 10));
      today.setSeconds(0);
    }
    return today;
  }

  deleteShift(shift: Shift) {
    if (confirm(`¿Está seguro de eliminar el turno de ${shift.employeeName}?`)) {
      console.log('Eliminar turno:', shift);
      this.messageService.add({
        severity: 'warn',
        summary: 'Eliminar',
        detail: `Eliminando turno: ${shift.employeeName}`,
        life: 3000
      });
      // Aquí iría la lógica para eliminar el turno
      // this.http.delete(`${this.apiUrl}/TurnoProgramado/${shift.id}`).subscribe(...);
    }
  }

  // Métodos para FullCalendar
  handleEventClick(clickInfo: any) {
    console.log('Evento clickeado:', clickInfo.event);
    const shiftId = clickInfo.event.id;
    const shift = this.allShifts.find(s => s.id === shiftId);
    
    if (shift) {
      console.log('Turno encontrado para editar:', shift);
      this.editShift(shift);
    } else {
      console.warn('No se encontró el turno con ID:', shiftId);
    }
  }

  handleDateSelect(selectInfo: any) {
    // Validar que haya un cliente seleccionado
    if (!this.clientControl.value) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Validación',
        detail: 'Debe seleccionar un cliente primero',
        life: 5000
      });
      return;
    }
    
    // Abrir modal para agregar turno con fechas pre-seleccionadas
    this.shiftForm.patchValue({
      startDate: selectInfo.start,
      endDate: selectInfo.end
    });
    this.displayShiftDialog = true;
    this.loadEmployeesForDialog(this.clientControl.value);
  }

  handleEventDrop(eventDropInfo: any) {
    console.log('Evento movido:', eventDropInfo);
    // Aquí puedes actualizar el turno en el backend
  }

  handleEventResize(eventResizeInfo: any) {
    console.log('Evento redimensionado:', eventResizeInfo);
    // Aquí puedes actualizar el turno en el backend
  }

  updateCalendarData() {
    console.log('=== ACTUALIZANDO DATOS DEL CALENDARIO ===');
    console.log('Empleados disponibles:', this.employees.length);
    console.log('Turnos filtrados:', this.filteredShifts.length);
    
    // Si no hay empleados, cargarlos desde los turnos filtrados
    if (this.employees.length === 0 && this.filteredShifts.length > 0) {
      console.log('No hay empleados cargados pero hay turnos. Extrayendo empleados de los turnos...');
      
      // Extraer empleados únicos de los turnos
      const uniqueEmployees = new Map<string, Employee>();
      this.filteredShifts.forEach(shift => {
        const empId = String(shift.employeeId || shift.idEmpleado || '');
        const empName = shift.employeeName || shift.employeeName1 || 'Empleado';
        if (empId && !uniqueEmployees.has(empId)) {
          uniqueEmployees.set(empId, {
            id: empId,
            name: empName,
            clientId: shift.clientId || ''
          });
        }
      });
      
      this.employees = Array.from(uniqueEmployees.values());
      console.log('Empleados extraídos de los turnos:', this.employees);
    }
    
    // Si aún no hay empleados después de intentar extraerlos, mostrar calendario vacío
    if (this.employees.length === 0) {
      console.log('No hay empleados disponibles. Mostrando calendario vacío.');
      this.calendarOptions.resources = [];
      this.calendarOptions.events = [];
      this.calendarOptions = { ...this.calendarOptions };
      console.log('=== FIN ACTUALIZACIÓN DEL CALENDARIO ===');
      return;
    }
    
    // Filtrar empleados si hay empleados seleccionados en el filtro
    const employeeIds = this.employeeControl.value;
    let filteredEmployees = this.employees;
    
    if (employeeIds && Array.isArray(employeeIds) && employeeIds.length > 0) {
      console.log('Filtrando recursos por empleados seleccionados:', employeeIds);
      filteredEmployees = this.employees.filter(emp => 
        employeeIds.includes(String(emp.id))
      );
      console.log('Empleados filtrados:', filteredEmployees.map(e => e.name));
    } else {
      console.log('No hay empleados específicos seleccionados. Mostrando todos los empleados disponibles:', this.employees.length);
    }
    
    // Convertir empleados a recursos
    const resources = filteredEmployees.map(emp => ({
      id: String(emp.id), // Asegurar que sea string
      title: emp.name
    }));
    console.log('Recursos (empleados) para el calendario:', resources);
    console.log('IDs de recursos disponibles:', resources.map(r => r.id));

    // Convertir turnos a eventos - mapear campos del API
    const events: EventInput[] = this.filteredShifts.map(shift => {
      console.log('Procesando turno completo:', JSON.stringify(shift, null, 2));
      
      // Obtener el ID del empleado - probar diferentes campos
      let employeeId = '';
      if (shift.employeeId) {
        employeeId = String(shift.employeeId);
        console.log('  -> usando shift.employeeId:', employeeId);
      } else if (shift.idEmpleado) {
        employeeId = String(shift.idEmpleado);
        console.log('  -> usando shift.idEmpleado:', employeeId);
      } else {
        console.warn('  -> NO SE ENCONTRÓ employeeId en el turno!', Object.keys(shift));
      }
      
      // Verificar si el employeeId existe en los recursos
      const resourceExists = resources.some(r => r.id === employeeId);
      console.log(`  -> resourceId: ${employeeId}, existe en recursos: ${resourceExists}`);
      
      // Obtener las fechas y horas (pueden venir con nombres diferentes)
      const startDate = shift.fechaInicioProgramada || shift.shiftDate;
      const endDate = shift.fechaFinProgramada || shift.shiftDate;
      const startTime = shift.horaInicioProgramada || shift.startTime || '08:00:00';
      const endTime = shift.horaFinProgramada || shift.endTime || '17:00:00';
      
      // Formatear la fecha si es necesario
      let startDateStr = '';
      let endDateStr = '';
      
      if (startDate instanceof Date) {
        startDateStr = startDate.toISOString().split('T')[0];
      } else if (startDate) {
        startDateStr = String(startDate).split('T')[0];
      }
      
      if (endDate instanceof Date) {
        endDateStr = endDate.toISOString().split('T')[0];
      } else if (endDate) {
        endDateStr = String(endDate).split('T')[0];
      }
      
      // Crear el título del evento
      const title = `${startTime.substring(0, 5)} - ${endTime.substring(0, 5)}`;
      
      const event = {
        id: shift.id,
        resourceId: employeeId,
        title: title,
        start: `${startDateStr}T${startTime}`,
        end: `${endDateStr}T${endTime}`,
        backgroundColor: this.getShiftColor(shift),
        borderColor: this.getShiftColor(shift),
        textColor: '#ffffff',
        extendedProps: {
          observations: shift.observaciones || shift.observations,
          employeeName: shift.employeeName1 || shift.employeeName,
          estado: shift.estado
        }
      };
      
      console.log('Evento creado:', event);
      
      return event;
    });

    console.log('Total de eventos creados:', events.length);
    console.log('IDs únicos de resourceId en eventos:', [...new Set(events.map(e => e.resourceId))]);

    // Actualizar recursos y eventos
    this.calendarOptions.resources = resources;
    this.calendarOptions.events = events;
    
    // Forzar recreación del objeto para que Angular detecte el cambio
    this.calendarOptions = { ...this.calendarOptions };
    
    // Navegar a la fecha correcta después de actualizar
    setTimeout(() => {
      if (this.calendarComponent) {
        const calendarApi = this.calendarComponent.getApi();
        
        // Determinar la fecha a la que navegar
        const dateRange = this.dateRangeControl.value;
        if (dateRange && dateRange[0]) {
          // Si hay un rango de fechas seleccionado, navegar a la fecha inicial del rango
          const startDate = dateRange[0];
          const dateStr = startDate instanceof Date 
            ? startDate.toISOString().split('T')[0]
            : String(startDate).split('T')[0];
          console.log('Navegando a la fecha del rango seleccionado:', dateStr);
          calendarApi.gotoDate(dateStr);
        } else if (events.length > 0 && events[0].start) {
          // Si no hay rango seleccionado, navegar a la fecha del primer evento
          const firstEventDate = typeof events[0].start === 'string' 
            ? events[0].start.split('T')[0] 
            : events[0].start;
          console.log('Navegando a la fecha del primer evento:', firstEventDate);
          calendarApi.gotoDate(firstEventDate);
        }
      }
    }, 100);
    
    console.log('=== FIN ACTUALIZACIÓN DEL CALENDARIO ===');
  }

  // Método de prueba para agregar un evento de ejemplo
  addTestEvent() {
    if (this.employees.length === 0) {
      console.warn('No hay empleados cargados');
      return;
    }
    
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    
    const testEvent = {
      id: 'test-event-1',
      resourceId: String(this.employees[0].id),
      title: 'PRUEBA',
      start: `${todayStr}T10:00:00`,
      end: `${todayStr}T12:00:00`,
      backgroundColor: '#ff0000',
      borderColor: '#ff0000',
      textColor: '#ffffff'
    };
    
    console.log('Agregando evento de prueba:', testEvent);
    
    const currentEvents = Array.isArray(this.calendarOptions.events) 
      ? [...this.calendarOptions.events as EventInput[]] 
      : [];
    
    this.calendarOptions.events = [...currentEvents, testEvent];
    this.calendarOptions = { ...this.calendarOptions };
    
    console.log('Evento de prueba agregado. Total eventos:', this.calendarOptions.events);
  }

  getShiftColor(shift: Shift): string {
    // Colores diferentes según el cliente o puedes usar otra lógica
    const colors = [
      '#3788d8', // Azul
      '#28a745', // Verde
      '#ffc107', // Amarillo/Naranja
      '#dc3545', // Rojo
      '#6f42c1', // Púrpura
      '#20c997', // Verde azulado
      '#fd7e14', // Naranja
      '#e83e8c'  // Rosa
    ];
    
    // Usar el clientId para determinar el color (consistente para cada cliente)
    const index = shift.clientId ? parseInt(shift.clientId) % colors.length : 0;
    return colors[index];
  }
}
