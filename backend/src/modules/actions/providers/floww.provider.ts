import { Injectable, Logger } from '@nestjs/common';
import { ActionProviderType } from '@/database/entities/action-integration.entity';
import {
  ActionProviderBase,
  ActionCapability,
  ActionResult,
  ProviderConfigField,
  SetupStep,
} from './action-provider.interface';

const FLOWW_API_BASE = 'https://euapi.flowww.net';
const FLOWW_PUBLIC_ENDPOINT = '/v1/fwa_external_get.asp';
const FLOWW_MOBILE_ENDPOINT = '/app.asp';

@Injectable()
export class FlowwProvider extends ActionProviderBase {
  readonly providerType = ActionProviderType.FLOWW;
  readonly label = 'Floww';
  private readonly logger = new Logger(FlowwProvider.name);

  getConfigFields(): ProviderConfigField[] {
    return [
      {
        key: 'userLogin',
        label: 'Email de usuario (doctor)',
        type: 'text',
        required: true,
        help: 'Email del usuario con permisos de API en Floww',
      },
      {
        key: 'userPassword',
        label: 'Contraseña',
        type: 'password',
        required: true,
        help: 'Contraseña del usuario Floww',
      },
      {
        key: 'systemKey',
        label: 'System Key',
        type: 'text',
        required: true,
        help: 'Clave del sistema proporcionada por Floww',
      },
      {
        key: 'country',
        label: 'País',
        type: 'select',
        required: true,
        help: 'Código ISO del país',
        options: [
          { value: 'ES', label: 'España' },
          { value: 'PT', label: 'Portugal' },
          { value: 'MX', label: 'México' },
          { value: 'CO', label: 'Colombia' },
          { value: 'AR', label: 'Argentina' },
          { value: 'CL', label: 'Chile' },
          { value: 'IT', label: 'Italia' },
          { value: 'FR', label: 'Francia' },
          { value: 'GB', label: 'Reino Unido' },
        ],
      },
      {
        key: 'clinicId',
        label: 'ID de Centro (opcional)',
        type: 'text',
        required: false,
        help: 'ID del centro/clínica por defecto. Dejar vacío para usar el principal.',
      },
      {
        key: 'apiBaseUrl',
        label: 'URL Base API (opcional)',
        type: 'text',
        required: false,
        help: `URL base de la API. Por defecto: ${FLOWW_API_BASE}`,
      },
    ];
  }

  getSetupGuide(): SetupStep[] {
    return [
      {
        title: '1. Accede a tu panel de Floww',
        description:
          'Inicia sesión en tu cuenta de Floww con un usuario que tenga permisos de API.',
      },
      {
        title: '2. Obtén tu System Key',
        description:
          'Contacta con soporte de Floww o consulta tu panel de administración para obtener la clave del sistema (System Key).',
      },
      {
        title: '3. Configura las credenciales',
        description:
          'Introduce el email del usuario, contraseña, System Key y selecciona el país correspondiente.',
      },
      {
        title: '4. Verifica la conexión',
        description:
          'Usa el botón "Probar conexión" para verificar que las credenciales son correctas.',
      },
    ];
  }

  getCapabilities(): ActionCapability[] {
    return [
      // --- Clientes ---
      {
        category: 'clients',
        action: 'create',
        label: 'Crear cliente',
        description: 'Registra un nuevo cliente en Floww',
        params: [
          { key: 'ClientName', label: 'Nombre', type: 'string', required: true },
          { key: 'ClientSurname1', label: 'Primer apellido', type: 'string', required: true },
          { key: 'ClientSurname2', label: 'Segundo apellido', type: 'string', required: false },
          { key: 'ClientPhone1', label: 'Teléfono', type: 'string', required: false },
          { key: 'ClientEmail', label: 'Email', type: 'string', required: false },
          { key: 'ClientNIF', label: 'NIF/DNI', type: 'string', required: false },
          { key: 'ClientSex', label: 'Sexo', type: 'select', required: false, options: [{ value: 'M', label: 'Masculino' }, { value: 'F', label: 'Femenino' }] },
          { key: 'ClientBirthDay', label: 'Fecha nacimiento (dd/mm/aaaa)', type: 'string', required: false },
          { key: 'ClientAddress', label: 'Dirección', type: 'string', required: false },
          { key: 'ClientPostCode', label: 'Código postal', type: 'string', required: false },
          { key: 'ClientNotes', label: 'Notas', type: 'text', required: false },
        ],
      },
      {
        category: 'clients',
        action: 'get',
        label: 'Obtener cliente',
        description: 'Obtiene los datos de un cliente por su ID',
        params: [
          { key: 'ClientID', label: 'ID del cliente', type: 'number', required: true },
        ],
      },
      {
        category: 'clients',
        action: 'update',
        label: 'Modificar cliente',
        description: 'Actualiza los datos de un cliente existente',
        params: [
          { key: 'ClientID', label: 'ID del cliente', type: 'number', required: true },
          { key: 'ClientName', label: 'Nombre', type: 'string', required: false },
          { key: 'ClientSurname1', label: 'Primer apellido', type: 'string', required: false },
          { key: 'ClientPhone1', label: 'Teléfono', type: 'string', required: false },
          { key: 'ClientEmail', label: 'Email', type: 'string', required: false },
          { key: 'ClientNotes', label: 'Notas', type: 'text', required: false },
        ],
      },
      {
        category: 'clients',
        action: 'search',
        label: 'Buscar clientes',
        description: 'Busca clientes por NIF, teléfono o email',
        params: [
          { key: 'ClientNIF', label: 'NIF/DNI', type: 'string', required: false },
          { key: 'ClientPhone', label: 'Teléfono', type: 'string', required: false },
          { key: 'ClientEMail', label: 'Email', type: 'string', required: false },
        ],
      },
      // --- Citas / Calendario ---
      {
        category: 'appointments',
        action: 'list',
        label: 'Listar citas (calendario)',
        description: 'Obtiene las citas agendadas en un rango de fechas',
        params: [
          { key: 'FromDate', label: 'Desde (dd/mm/aaaa)', type: 'string', required: true },
          { key: 'ToDate', label: 'Hasta (dd/mm/aaaa)', type: 'string', required: true },
          { key: 'ClinicIDs', label: 'IDs de centros (separados por coma)', type: 'string', required: false },
        ],
      },
      {
        category: 'appointments',
        action: 'availability',
        label: 'Consultar disponibilidad',
        description: 'Comprueba la disponibilidad de citas para un día y servicio',
        params: [
          { key: 'DiaryDate', label: 'Fecha (aaaa-mm-dd)', type: 'date', required: true },
          { key: 'Services', label: 'IDs de servicios (separados por coma)', type: 'string', required: true },
          { key: 'ProfessionalID', label: 'ID profesional (opcional)', type: 'number', required: false },
          { key: 'ClinicID', label: 'ID centro', type: 'number', required: false },
        ],
      },
      {
        category: 'appointments',
        action: 'create',
        label: 'Crear cita',
        description: 'Agenda una nueva cita para un cliente',
        params: [
          { key: 'ClientToken', label: 'Token del cliente', type: 'string', required: true },
          { key: 'DiaryDate', label: 'Fecha (aaaa-mm-dd)', type: 'date', required: true },
          { key: 'TimeStart', label: 'Hora inicio (hh:mm)', type: 'string', required: true },
          { key: 'TimeEnd', label: 'Hora fin (hh:mm)', type: 'string', required: true },
          { key: 'CabineID', label: 'ID de cabina', type: 'number', required: true },
          { key: 'Services', label: 'IDs de servicios (separados por coma)', type: 'string', required: true },
          { key: 'ClinicID', label: 'ID centro', type: 'number', required: false },
          { key: 'ProfessionalID', label: 'ID profesional (opcional)', type: 'number', required: false },
          { key: 'DiaryComments', label: 'Comentarios', type: 'text', required: false },
        ],
      },
      {
        category: 'appointments',
        action: 'cancel',
        label: 'Cancelar cita',
        description: 'Cancela una cita pendiente',
        params: [
          { key: 'ClientToken', label: 'Token del cliente', type: 'string', required: true },
          { key: 'AppID', label: 'ID de la cita', type: 'number', required: true },
        ],
      },
      // --- Servicios ---
      {
        category: 'services',
        action: 'list',
        label: 'Listar servicios',
        description: 'Obtiene la lista de servicios, familias y profesionales de un centro',
        params: [
          { key: 'ClinicID', label: 'ID centro', type: 'number', required: true },
        ],
      },
      // --- Ventas ---
      {
        category: 'sales',
        action: 'create',
        label: 'Generar venta/ticket',
        description: 'Crea un ticket de venta para un cliente',
        params: [
          { key: 'ClientID', label: 'ID del cliente', type: 'number', required: true },
          { key: 'ShoppingCart_Ref', label: 'Referencia del ticket', type: 'string', required: true },
          { key: 'ShoppingCart_PromoCode', label: 'Código promocional', type: 'string', required: false },
          { key: 'Products', label: 'Productos (JSON)', type: 'text', required: true, help: 'Array JSON: [{"id":1,"price":10.00,"discount":0}]' },
          { key: 'Payments', label: 'Pagos (JSON)', type: 'text', required: true, help: 'Array JSON: [{"amount":10.00,"method":1}]' },
          { key: 'ClinicID', label: 'ID centro (opcional)', type: 'number', required: false },
        ],
      },
      // --- Presupuestos ---
      {
        category: 'budgets',
        action: 'create',
        label: 'Crear presupuesto',
        description: 'Crea un nuevo presupuesto para un cliente',
        params: [
          { key: 'ClientID', label: 'ID del cliente', type: 'number', required: true },
          { key: 'ClinicID', label: 'ID centro', type: 'number', required: true },
          { key: 'ValidityDate', label: 'Fecha validez (aaaa-mm-dd)', type: 'date', required: false },
          { key: 'DoctorID', label: 'ID profesional', type: 'number', required: false },
          { key: 'Comments', label: 'Comentarios', type: 'text', required: false },
          { key: 'Products', label: 'Productos (JSON)', type: 'text', required: true, help: 'Array JSON: [{"ProductID":1,"ProductUnits":1,"ProductPrice":10.00}]' },
        ],
      },
      {
        category: 'budgets',
        action: 'list',
        label: 'Listar presupuestos',
        description: 'Obtiene los presupuestos de un cliente',
        params: [
          { key: 'ClientID', label: 'ID del cliente', type: 'number', required: true },
          { key: 'BudgetStatus', label: 'Estados (0=Pendiente,1=Aceptado,2=Denegado,3=Vendido)', type: 'string', required: false, help: 'Separados por coma. Ej: 0,1' },
        ],
      },
      // --- Sistema ---
      {
        category: 'system',
        action: 'info',
        label: 'Información del sistema',
        description: 'Obtiene configuración del sistema y lista de centros',
        params: [],
      },
      {
        category: 'system',
        action: 'clinic',
        label: 'Detalle de centro',
        description: 'Obtiene información detallada de un centro',
        params: [
          { key: 'ClinicID', label: 'ID centro', type: 'number', required: true },
        ],
      },
    ];
  }

  async testConnection(config: Record<string, any>): Promise<ActionResult> {
    try {
      const result = await this.callMobileApi(config, 'c1011', {});
      if (result.Result?.ErrorNumber === '0') {
        return { success: true, data: { message: 'Conexión exitosa', system: result } };
      }
      return {
        success: false,
        error: result.Result?.ErrorDescription || 'Error de conexión desconocido',
      };
    } catch (error) {
      return { success: false, error: `Error de conexión: ${error.message}` };
    }
  }

  async executeAction(
    config: Record<string, any>,
    category: string,
    action: string,
    params: Record<string, any>,
  ): Promise<ActionResult> {
    const actionKey = `${category}.${action}`;
    this.logger.log(`Executing Floww action: ${actionKey}`);

    try {
      switch (actionKey) {
        case 'clients.create':
          return this.createClient(config, params);
        case 'clients.get':
          return this.getClient(config, params);
        case 'clients.update':
          return this.updateClient(config, params);
        case 'clients.search':
          return this.searchClients(config, params);
        case 'appointments.list':
          return this.listAppointments(config, params);
        case 'appointments.availability':
          return this.checkAvailability(config, params);
        case 'appointments.create':
          return this.createAppointment(config, params);
        case 'appointments.cancel':
          return this.cancelAppointment(config, params);
        case 'services.list':
          return this.listServices(config, params);
        case 'sales.create':
          return this.createSale(config, params);
        case 'budgets.create':
          return this.createBudget(config, params);
        case 'budgets.list':
          return this.listBudgets(config, params);
        case 'system.info':
          return this.getSystemInfo(config);
        case 'system.clinic':
          return this.getClinicInfo(config, params);
        default:
          return { success: false, error: `Acción no soportada: ${actionKey}` };
      }
    } catch (error) {
      this.logger.error(`Floww action ${actionKey} failed: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  // ─── Client Actions ──────────────────────────────────────────────

  private async createClient(
    config: Record<string, any>,
    params: Record<string, any>,
  ): Promise<ActionResult> {
    const body: Record<string, string> = {
      ClientRefererID: '0',
      ClientFWA: '1',
    };
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== null && value !== '') {
        body[key] = String(value);
      }
    }
    const xml = await this.callPublicApi(config, '08', body);
    return this.parseXmlResult(xml, 'Cmd08');
  }

  private async getClient(
    config: Record<string, any>,
    params: Record<string, any>,
  ): Promise<ActionResult> {
    const queryExtra = `&ClientID=${params.ClientID}&ClientFWA=1`;
    const xml = await this.callPublicApi(config, '17', {}, queryExtra);
    return this.parseXmlResult(xml, 'Cmd17');
  }

  private async updateClient(
    config: Record<string, any>,
    params: Record<string, any>,
  ): Promise<ActionResult> {
    const { ClientID, ...fields } = params;
    const queryExtra = `&ClientID=${ClientID}`;
    const body: Record<string, string> = {};
    for (const [key, value] of Object.entries(fields)) {
      if (value !== undefined && value !== null) {
        body[key] = String(value);
      }
    }
    const xml = await this.callPublicApi(config, '18', body, queryExtra);
    return this.parseXmlResult(xml, 'Cmd18');
  }

  private async searchClients(
    config: Record<string, any>,
    params: Record<string, any>,
  ): Promise<ActionResult> {
    const body: Record<string, string> = {
      ClientNIF: params.ClientNIF || '',
      ClientPhone: params.ClientPhone || '',
      ClientEMail: params.ClientEMail || '',
    };
    const xml = await this.callPublicApi(config, '24', body);
    return this.parseXmlResult(xml, 'Cmd24');
  }

  // ─── Appointment Actions ─────────────────────────────────────────

  private async listAppointments(
    config: Record<string, any>,
    params: Record<string, any>,
  ): Promise<ActionResult> {
    const queryExtra = `&FromDate=${params.FromDate}&ToDate=${params.ToDate}`;
    const body: Record<string, string> = {};
    if (params.ClinicIDs) {
      body['ClinicIDs[]'] = params.ClinicIDs;
    }
    const xml = await this.callPublicApi(config, '120', body, queryExtra);
    return this.parseXmlResult(xml, 'Cmd120');
  }

  private async checkAvailability(
    config: Record<string, any>,
    params: Record<string, any>,
  ): Promise<ActionResult> {
    const clinicId = params.ClinicID || config.clinicId;
    const mobileParams: Record<string, string> = {
      ClinicID: String(clinicId),
      DiaryDate: params.DiaryDate,
      Services: params.Services,
    };
    if (params.ProfessionalID) {
      mobileParams.ProfessionalID = String(params.ProfessionalID);
    }
    const result = await this.callMobileApi(config, 'c1042', mobileParams);
    if (result.Result?.ErrorNumber === '0') {
      return { success: true, data: result };
    }
    return {
      success: false,
      error: result.Result?.ErrorDescription || 'Error consultando disponibilidad',
    };
  }

  private async createAppointment(
    config: Record<string, any>,
    params: Record<string, any>,
  ): Promise<ActionResult> {
    const clinicId = params.ClinicID || config.clinicId;
    const mobileParams: Record<string, string> = {
      ClinicID: String(clinicId),
      ClientToken: params.ClientToken,
      DiaryDate: params.DiaryDate,
      TimeStart: params.TimeStart,
      TimeEnd: params.TimeEnd,
      CabineID: String(params.CabineID),
      Services: params.Services,
    };
    if (params.ProfessionalID) {
      mobileParams.ProfessionalID = String(params.ProfessionalID);
    }
    if (params.DiaryComments) {
      mobileParams.DiaryComments = params.DiaryComments;
    }
    const result = await this.callMobileApi(config, 'c1043', mobileParams);
    if (result.Result?.ErrorNumber === '0') {
      return { success: true, data: result };
    }
    return {
      success: false,
      error: result.Result?.ErrorDescription || 'Error creando cita',
    };
  }

  private async cancelAppointment(
    config: Record<string, any>,
    params: Record<string, any>,
  ): Promise<ActionResult> {
    const mobileParams: Record<string, string> = {
      ClientToken: params.ClientToken,
      AppID: String(params.AppID),
    };
    const result = await this.callMobileApi(config, 'c1044', mobileParams);
    if (result.Result?.ErrorNumber === '0') {
      return { success: true, data: result };
    }
    return {
      success: false,
      error: result.Result?.ErrorDescription || 'Error cancelando cita',
    };
  }

  // ─── Services ────────────────────────────────────────────────────

  private async listServices(
    config: Record<string, any>,
    params: Record<string, any>,
  ): Promise<ActionResult> {
    const clinicId = params.ClinicID || config.clinicId;
    const result = await this.callMobileApi(config, 'c1041', {
      ClinicID: String(clinicId),
    });
    if (result.Result?.ErrorNumber === '0') {
      return { success: true, data: result };
    }
    return {
      success: false,
      error: result.Result?.ErrorDescription || 'Error listando servicios',
    };
  }

  // ─── Sales ───────────────────────────────────────────────────────

  private async createSale(
    config: Record<string, any>,
    params: Record<string, any>,
  ): Promise<ActionResult> {
    const queryExtra = `&ClientID=${params.ClientID}${params.ClinicID ? `&ClinicID=${params.ClinicID}` : ''}`;
    const body: Record<string, string> = {
      ShoppingCart_PromoCode: params.ShoppingCart_PromoCode || '',
      ShoppingCart_Ref: params.ShoppingCart_Ref,
    };

    const products = typeof params.Products === 'string' ? JSON.parse(params.Products) : params.Products;
    products.forEach((p: any, i: number) => {
      const idx = i + 1;
      body[`ShoppingCart_${idx}_Id`] = String(p.id);
      if (p.price !== undefined) body[`ShoppingCart_${idx}_Price`] = String(p.price);
      if (p.discount !== undefined) body[`ShoppingCart_${idx}_Disc`] = String(p.discount);
    });

    const payments = typeof params.Payments === 'string' ? JSON.parse(params.Payments) : params.Payments;
    payments.forEach((p: any, i: number) => {
      const idx = i + 1;
      body[`ShoppingCart_Pay${idx}_Amount`] = String(p.amount);
      body[`ShoppingCart_Pay${idx}_Paymentmethod`] = String(p.method);
    });

    const xml = await this.callPublicApi(config, '19', body, queryExtra);
    return this.parseXmlResult(xml, 'Cmd19');
  }

  // ─── Budgets ─────────────────────────────────────────────────────

  private async createBudget(
    config: Record<string, any>,
    params: Record<string, any>,
  ): Promise<ActionResult> {
    const budgetData = {
      ClientID: params.ClientID,
      ClinicID: params.ClinicID,
      ValidityDate: params.ValidityDate || '',
      DoctorID: params.DoctorID || 0,
      Status: 0,
      Comments: params.Comments || '',
      Products: typeof params.Products === 'string' ? JSON.parse(params.Products) : params.Products,
    };
    const body: Record<string, string> = {
      Budgetdata: JSON.stringify(budgetData),
    };
    const xml = await this.callPublicApi(config, '40', body);
    return this.parseXmlResult(xml, 'Cmd40');
  }

  private async listBudgets(
    config: Record<string, any>,
    params: Record<string, any>,
  ): Promise<ActionResult> {
    const queryExtra = `&ClientID=${params.ClientID}`;
    const body: Record<string, string> = {
      BugetStatus: params.BudgetStatus || '0,1,2,3',
    };
    const xml = await this.callPublicApi(config, '42', body, queryExtra);
    return this.parseXmlResult(xml, 'Cmd42');
  }

  // ─── System ──────────────────────────────────────────────────────

  private async getSystemInfo(config: Record<string, any>): Promise<ActionResult> {
    const result = await this.callMobileApi(config, 'c1011', {});
    if (result.Result?.ErrorNumber === '0') {
      return { success: true, data: result };
    }
    return {
      success: false,
      error: result.Result?.ErrorDescription || 'Error obteniendo info del sistema',
    };
  }

  private async getClinicInfo(
    config: Record<string, any>,
    params: Record<string, any>,
  ): Promise<ActionResult> {
    const result = await this.callMobileApi(config, 'c1031', {
      ClinicID: String(params.ClinicID),
    });
    if (result.Result?.ErrorNumber === '0') {
      return { success: true, data: result };
    }
    return {
      success: false,
      error: result.Result?.ErrorDescription || 'Error obteniendo info del centro',
    };
  }

  // ─── API Call Helpers ────────────────────────────────────────────

  private async callPublicApi(
    config: Record<string, any>,
    cmd: string,
    body: Record<string, string>,
    queryExtra = '',
  ): Promise<string> {
    const baseUrl = config.apiBaseUrl || FLOWW_API_BASE;
    const url =
      `${baseUrl}${FLOWW_PUBLIC_ENDPOINT}` +
      `?cmd=${cmd}` +
      `&doctor=${encodeURIComponent(config.userLogin)}` +
      `&pass=${encodeURIComponent(config.userPassword)}` +
      `&country=${encodeURIComponent(config.country)}` +
      `&key=${encodeURIComponent(config.systemKey)}` +
      queryExtra;

    const formBody = new URLSearchParams(body).toString();

    this.logger.debug(`Floww Public API cmd=${cmd}`);

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: formBody,
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    return response.text();
  }

  private async callMobileApi(
    config: Record<string, any>,
    cmd: string,
    params: Record<string, string>,
  ): Promise<any> {
    const baseUrl = config.apiBaseUrl || FLOWW_API_BASE;
    const url = `${baseUrl}${FLOWW_MOBILE_ENDPOINT}`;

    const body: Record<string, string> = {
      Cmd: cmd,
      SystemKey: config.systemKey,
      Locale: config.country || 'ES',
      ...params,
    };

    const formBody = new URLSearchParams(body).toString();

    this.logger.debug(`Floww Mobile API cmd=${cmd}`);

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: formBody,
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    return response.json();
  }

  private parseXmlResult(xml: string, rootTag: string): ActionResult {
    const resultMatch = xml.match(/<Result>(\d+)<\/Result>/);
    const isSuccess = resultMatch?.[1] === '1';

    if (!isSuccess) {
      const errorCode = xml.match(/<ResultError>(.*?)<\/ResultError>/)?.[1] || 'UNKNOWN';
      const errorInfo = xml.match(/<ResultErrorInfo>(.*?)<\/ResultErrorInfo>/)?.[1] || '';
      return {
        success: false,
        error: `Error Floww [${errorCode}]: ${errorInfo}`.trim(),
      };
    }

    const data = this.simpleXmlToJson(xml, rootTag);
    return { success: true, data };
  }

  private simpleXmlToJson(xml: string, rootTag: string): Record<string, any> {
    const result: Record<string, any> = {};
    const tagRegex = /<(\w+)>([\s\S]*?)<\/\1>/g;
    let match: RegExpExecArray | null;

    while ((match = tagRegex.exec(xml)) !== null) {
      const [, tag, value] = match;
      if (tag === rootTag) continue;
      if (value.includes('<')) {
        const nested = this.simpleXmlToJson(value, '');
        if (result[tag]) {
          if (!Array.isArray(result[tag])) result[tag] = [result[tag]];
          result[tag].push(nested);
        } else {
          result[tag] = nested;
        }
      } else {
        result[tag] = value;
      }
    }

    return result;
  }
}
