// ============================================
// ERG-INVENTORY — Types (v2 — alineado con BD v2)
// ============================================

export interface Rol {
    id: string;
    nombre: string;
    activo: boolean;
    createdAt: string;
}

export interface Usuario {
    id: string;
    nombre: string;
    email: string;
    password?: string;
    rol: Rol;
    activo: boolean;
    telefono?: string;
    createdAt: string;
    updatedAt: string;
}

// ── Catálogo ──────────────────────────────────────────────────────────────────

export interface Categoria {
    id: string;
    nombre: string;
    descripcion?: string;
    activo: boolean;
}

// ── Producto ──────────────────────────────────────────────────────────────────

export interface Producto {
    id: string;
    codigo: string;
    nombre: string;
    descripcion?: string;
    precio: number;
    stock: number;
    categoria?: Categoria;       // antes era string libre, ahora es objeto FK
    stockMinimo: number;
    activo: boolean;
    createdAt: string;
    updatedAt: string;
}

// ── Inventario ────────────────────────────────────────────────────────────────

export interface MovimientoInventario {
    id: string;
    producto: Producto;
    tipo: 'ENTRADA' | 'SALIDA';
    cantidad: number;
    proveedor?: Proveedor;
    observacion?: string;
    origenTipo?: 'VENTA' | 'COMPRA' | 'ENTREGA' | 'DEVOLUCION' | 'AJUSTE' | 'MANUAL';
    origenId?: string;
    fecha: string;
    usuario?: { id: string; nombre: string };
}

// ── Orden de Servicio ─────────────────────────────────────────────────────────

export interface OrdenItem {
    id?: string;
    producto: { id: string; nombre: string; codigo: string; precio?: number };
    cantidad: number;
    precioUnitario?: number;
}

export interface PagoOrden {
    id: string;
    monto: number;
    notas?: string;
    fecha: string;
    usuario?: { id: string; nombre: string };
}

export interface OrdenServicio {
    id: string;

    // Cliente
    clienteNombre: string;
    clienteTelefono?: string;
    cliente?: { id: string; nombre: string };

    // Trabajo
    tipo: 'REPARACION' | 'ENTREGA' | 'INSTALACION';
    descripcionProblema?: string;
    direccion: string;

    // Estado
    estado: 'PENDIENTE' | 'EN_PROCESO' | 'COMPLETADO' | 'FINALIZADO' | 'CANCELADO';
    estadoPago: 'PENDIENTE' | 'ANTICIPO' | 'PARCIAL' | 'COMPLETO';

    // Personal
    tecnico?: { id: string; nombre: string };
    creadoPor?: { id: string; nombre: string };
    notasTecnico?: string;

    // Fechas
    fechaCreacion: string;
    fechaEntrega?: string;
    fechaCompletado?: string;
    updatedAt?: string;

    // Finanzas
    manoObra?: number;
    totalOrden?: number;
    anticipoPorcentaje?: number;
    anticipoRecibido?: number;

    // Items y pagos
    items?: OrdenItem[];
    pagos?: PagoOrden[];
}

// Alias para compatibilidad
export type Entrega = OrdenServicio;

// ── Venta ─────────────────────────────────────────────────────────────────────

export interface VentaItem {
    id?: string;
    producto: { id: string; nombre: string; codigo?: string };
    cantidad: number;
    precioUnitario: number;
    subtotal?: number;
}

export interface Venta {
    id: string;
    clienteNombre: string;
    clienteTelefono?: string;
    cliente?: { id: string; nombre: string };
    vendedor?: { id: string; nombre: string };
    estado: 'PENDIENTE' | 'COMPLETADA' | 'CANCELADA';
    total: number;
    fecha: string;
    updatedAt?: string;
    items?: VentaItem[];
}

// ── Clientes y Proveedores ────────────────────────────────────────────────────

export interface Cliente {
    id: string;
    nombre: string;
    telefono?: string;
    email?: string;
    direccion?: string;
    barrio?: string;
    notas?: string;
    activo: boolean;
    documento?: string;
    ciudad?: string;
    createdAt?: string;
    updatedAt?: string;
}

export interface DevolucionGarantia {
    id: string;
    tipo: 'DEVOLUCION' | 'GARANTIA';
    estado: string;
    razon: string;
    accionDinero: string;
    montoDevuelto: number;
    notas?: string;
    fecha: string;
    venta?: Venta;
    entrega?: OrdenServicio;
}

export interface ClientePerfil {
    cliente: Cliente;
    kpis: {
        totalComprado: number;
        totalVentas: number;
        totalOrdenes: number;
        cantidadVentas: number;
        ventasCompletadas: number;
        cantidadOrdenes: number;
        ordenesFinalizadas: number;
        ordenesActivas: number;
        frecuenciaTotal: number;
        ultimaActividad?: string;
    };
    ventas: Venta[];
    ordenes: OrdenServicio[];
    devoluciones: DevolucionGarantia[];
}

export interface Proveedor {
    id: string;
    nombre: string;
    nit?: string;
    telefono?: string;
    email?: string;
    direccion?: string;
    ciudad?: string;
    contacto?: string;
    notas?: string;
    activo: boolean;
    createdAt?: string;
    updatedAt?: string;
}

// ── Compras ───────────────────────────────────────────────────────────────────

export interface CompraItem {
    id?: string;
    producto: Producto;
    cantidad: number;
    precioUnitario: number;
    subtotal?: number;
}

export interface Compra {
    id: string;
    proveedor: Proveedor;
    numeroFactura?: string;
    total: number;
    estado: 'PENDIENTE' | 'CONFIRMADA' | 'CANCELADA';
    comprador?: { id: string; nombre: string };
    notas?: string;
    fecha: string;
    updatedAt?: string;
    items?: CompraItem[];
}

// ── Facturas ──────────────────────────────────────────────────────────────────

export interface FacturaVenta {
    id: string;
    venta: Venta;
    numero: string;
    subtotal: number;
    impuesto: number;
    total: number;
    fechaEmision: string;
    notas?: string;
}

// ── Kardex ────────────────────────────────────────────────────────────────────

export interface KardexRow {
    fecha: string;
    tipo: 'ENTRADA' | 'SALIDA';
    concepto: string;
    entrada?: number;
    salida?: number;
    saldo: number;
}

// ── Auth ──────────────────────────────────────────────────────────────────────

export interface LoginRequest {
    email: string;
    password: string;
}

export interface LoginResponse {
    user: Usuario;
    token: string;
    expiresInMs: number;
}

export interface RegisterRequest {
    nombre: string;
    email: string;
    password: string;
    telefono?: string;
    rol?: { id: string };
}

export interface ConfiguracionNegocio {
  clave: string;
  valor: string;
  categoria: string;
  descripcion?: string;
}
