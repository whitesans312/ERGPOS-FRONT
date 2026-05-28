import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { authService } from '../services/authService';
import { facturaVentaService } from '../services/facturaVentaService';
import { clienteService } from '../services/clienteService';
import { numeroALetras, getEmpresa } from '../utils/formatters';
import type { Producto, FacturaVenta, Cliente } from '../types';
import ActionMenu from '../components/ActionMenu';

interface VentaItem {
    id?: string;
    producto: { id: string; nombre: string; codigo: string; precio: number };
    cantidad: number;
    precioUnitario: number;
    subtotal: number;
}

interface Venta {
    id: string;
    clienteNombre: string;
    clienteTelefono?: string;
    cliente?: { id: string; nombre?: string };
    total: number;
    estado: 'PENDIENTE' | 'COMPLETADA' | 'CANCELADA';
    fecha: string;
    items?: VentaItem[];
    vendedor?: { id: string; nombre: string };
}

const ESTADO_CONFIG = {
    COMPLETADA: { clase: 'badge-green', label: 'Completada', icono: '✅' },
    PENDIENTE: { clase: 'badge-yellow', label: 'Pendiente', icono: '⏳' },
    CANCELADA: { clase: 'badge-red', label: 'Cancelada', icono: '❌' },
};

// ── Componente de factura reutilizable ────────────────────────────────────────
// IMPORTANTE: precioUnitario en los items = precio FINAL con IVA incluido.
// La factura descompone internamente: base = precioFinal / 1.19, iva = precioFinal - base.
// El NETO A PAGAR siempre es igual al precio final — no cambia lo que paga el cliente.
const FacturaView = ({
    venta, clienteData, factura, vendedorNombre
}: {
    venta: { clienteNombre: string; clienteTelefono?: string; items?: any[]; vendedor?: any; total?: number };
    clienteData?: Partial<Cliente> | null;
    factura: { numero: string; total: number; fechaEmision: string };
    vendedorNombre?: string;
}) => {
    const emp = getEmpresa();
    const IVA_FACTOR = 1.19;
    const fmt = (n: number) => '$' + Math.round(n).toLocaleString('es-CO');
    const fecha = (s: string) => new Date(s).toLocaleDateString('es-CO',
        { day: '2-digit', month: '2-digit', year: 'numeric' });

    const totalRepuestos = (venta.items ?? []).reduce((acc: number, item: any) => {
        const precio = item.precioUnitario ?? item.precio ?? 0;
        return acc + (precio * item.cantidad);
    }, 0);

    const totalFactura = factura.total ?? venta.total ?? 0;
    const manoObraSintetica = totalFactura > totalRepuestos ? (totalFactura - totalRepuestos) : 0;

    const itemsCalc = (venta.items ?? []).map((item: any) => {
        const precioFinal = item.precioUnitario ?? item.precio ?? 0;
        const totalFinalItem = precioFinal * item.cantidad;
        const baseItem = totalFinalItem / IVA_FACTOR;
        const ivaItem = totalFinalItem - baseItem;
        return { ...item, precioFinal, totalFinalItem, baseItem, ivaItem };
    });

    if (manoObraSintetica > 0) {
        const baseMO = manoObraSintetica / IVA_FACTOR;
        const ivaMO = manoObraSintetica - baseMO;
        itemsCalc.push({
            producto: { codigo: 'SERV-01', nombre: 'Mano de Obra / Servicio Técnico' },
            cantidad: 1,
            precioFinal: manoObraSintetica,
            totalFinalItem: manoObraSintetica,
            baseItem: baseMO,
            ivaItem: ivaMO,
            isManoObra: true
        });
    }

    const subtotalBase = itemsCalc.reduce((s: number, i: any) => s + i.baseItem, 0);
    const totalIva = itemsCalc.reduce((s: number, i: any) => s + i.ivaItem, 0);
    const totalFinal = itemsCalc.reduce((s: number, i: any) => s + i.totalFinalItem, 0);

    return (
        <div id="factura-print" style={{ fontFamily: 'Arial, sans-serif', fontSize: '0.85rem', color: '#1e293b' }}>

            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
                <div>
                    <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#1F3864' }}>{emp.nombre}</div>
                    <div style={{ color: '#475569', marginTop: '0.3rem', lineHeight: 1.8, fontSize: '0.82rem' }}>
                        <div>NIT: {emp.nit} — Régimen Simple de Tributación</div>
                        <div>{emp.direccion}</div>
                        <div>Tel: {emp.telefono}</div>
                        <div>{emp.email}</div>
                    </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '0.7rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        FACTURA DE VENTA INTERNA
                    </div>
                    <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#1F3864', margin: '0.2rem 0' }}>
                        {factura.numero}
                    </div>
                    <div style={{ color: '#475569', lineHeight: 1.8, fontSize: '0.82rem' }}>
                        <div>Fecha: {fecha(factura.fechaEmision)}</div>
                        <div>Forma de pago: Contado</div>
                    </div>
                </div>
            </div>

            <div style={{ borderTop: '2px solid #1F3864', margin: '0.75rem 0' }} />

            <div style={{ marginBottom: '0.75rem' }}>
                <div style={{ fontSize: '0.7rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.4rem' }}>
                    SEÑORES (DATOS DEL CLIENTE)
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.25rem', color: '#334155', fontSize: '0.83rem' }}>
                    <div><strong>Nombre:</strong> {venta.clienteNombre}</div>
                    <div><strong>NIT / Cédula:</strong> {clienteData?.documento ?? '—'}</div>
                    <div><strong>Dirección:</strong> {clienteData?.direccion ?? '—'}</div>
                    <div><strong>Ciudad:</strong> {clienteData?.ciudad ?? 'Cali'}</div>
                    <div><strong>Teléfono:</strong> {venta.clienteTelefono ?? clienteData?.telefono ?? '—'}</div>
                </div>
            </div>

            <div style={{ borderTop: '1px solid #e2e8f0', margin: '0.75rem 0' }} />

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.5rem', marginBottom: '0.75rem', fontSize: '0.82rem' }}>
                {[
                    { label: 'VENDEDOR', value: vendedorNombre ?? venta.vendedor?.nombre ?? '—' },
                    { label: 'FORMA DE PAGO', value: 'CAJA EFECTIVO' },
                    { label: 'MEDIOS DE PAGO', value: 'CONTADO' },
                ].map(b => (
                    <div key={b.label} style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '6px', padding: '0.4rem 0.6rem' }}>
                        <div style={{ fontSize: '0.68rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>{b.label}</div>
                        <div style={{ fontWeight: 600, color: '#1e293b' }}>{b.value}</div>
                    </div>
                ))}
            </div>

            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
                <thead>
                    <tr style={{ background: '#1F3864' }}>
                        {['Descripción', 'Cant.', 'U.M', 'Precio Unit.', 'Base', 'Total', 'IVA%'].map(h => (
                            <th key={h} style={{
                                padding: '0.45rem 0.6rem', color: '#fff', fontWeight: 600, fontSize: '0.75rem',
                                textAlign: ['Cant.', 'Precio Unit.', 'Base', 'Total', 'IVA%'].includes(h) ? 'right' : 'left'
                            }}>{h}</th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {itemsCalc.map((item: any, i: number) => (
                        <tr key={i} style={{ borderBottom: '1px solid #f1f5f9' }}>
                            <td style={{ padding: '0.45rem 0.6rem' }}>{item.producto?.nombre ?? '—'}</td>
                            <td style={{ padding: '0.45rem 0.6rem', textAlign: 'right' }}>{item.cantidad}</td>
                            <td style={{ padding: '0.45rem 0.6rem', color: '#64748b' }}>Und</td>
                            <td style={{ padding: '0.45rem 0.6rem', textAlign: 'right' }}>{fmt(item.precioFinal)}</td>
                            <td style={{ padding: '0.45rem 0.6rem', textAlign: 'right', color: '#64748b' }}>{fmt(item.baseItem)}</td>
                            <td style={{ padding: '0.45rem 0.6rem', textAlign: 'right', fontWeight: 600 }}>{fmt(item.totalFinalItem)}</td>
                            <td style={{ padding: '0.45rem 0.6rem', textAlign: 'right', color: '#64748b' }}>19%</td>
                        </tr>
                    ))}
                </tbody>
            </table>

            <div style={{ borderTop: '1px solid #e2e8f0', margin: '0.75rem 0' }} />

            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', alignItems: 'flex-start' }}>
                <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '0.7rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', marginBottom: '0.3rem' }}>VALOR EN LETRAS</div>
                    <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '0.5rem 0.75rem', fontSize: '0.78rem', color: '#334155', fontStyle: 'italic' }}>
                        {numeroALetras(Math.round(totalFinal))}
                    </div>
                </div>
                <div style={{ minWidth: '240px' }}>
                    {[
                        { label: 'SUBTOTAL (base gravable):', value: subtotalBase },
                        { label: 'DESCUENTO:', value: 0 },
                        { label: 'IVA (19%):', value: totalIva },
                        { label: 'RETEFUENTE:', value: 0 },
                        { label: 'RETEIVA:', value: 0 },
                    ].map(row => (
                        <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.2rem 0', color: '#475569', fontSize: '0.82rem' }}>
                            <span>{row.label}</span><span>{fmt(row.value)}</span>
                        </div>
                    ))}
                    <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '2px solid #1F3864', paddingTop: '0.35rem', marginTop: '0.25rem', fontSize: '0.95rem', fontWeight: 800, color: '#1F3864' }}>
                        <span>NETO A PAGAR:</span><span>{fmt(totalFinal)}</span>
                    </div>
                </div>
            </div>

            <div style={{ borderTop: '1px solid #e2e8f0', margin: '0.75rem 0' }} />

            <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '0.6rem 0.85rem', fontSize: '0.72rem', color: '#64748b', marginBottom: '0.75rem', lineHeight: 1.6 }}>
                No somos grandes contribuyentes. No somos agentes de retención de IVA.
                Régimen Simple de Tributación. Esta factura se asimila en sus efectos legales
                a una letra de cambio según Art. 774 del Código de Comercio.
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem', marginTop: '0.5rem' }}>
                <div style={{ textAlign: 'center' }}>
                    <div style={{ borderTop: '1px solid #334155', paddingTop: '0.5rem', marginTop: '2.5rem', fontSize: '0.8rem', color: '#475569' }}>
                        <div>Vendedor / Responsable</div>
                        <div style={{ color: '#94a3b8', fontSize: '0.72rem' }}>{emp.nombre}</div>
                    </div>
                </div>
                <div style={{ textAlign: 'center' }}>
                    <div style={{ borderTop: '1px solid #334155', paddingTop: '0.5rem', marginTop: '2.5rem', fontSize: '0.8rem', color: '#475569' }}>
                        <div>Firma y sello del cliente</div>
                        <div style={{ color: '#94a3b8', fontSize: '0.72rem' }}>Confirma recepción conforme</div>
                    </div>
                </div>
            </div>

            <div style={{ textAlign: 'center', marginTop: '1rem', color: '#94a3b8', fontSize: '0.72rem', borderTop: '1px solid #f1f5f9', paddingTop: '0.75rem' }}>
                <div style={{ fontWeight: 700, color: '#1F3864', fontSize: '0.82rem' }}>Gracias por su compra</div>
                <div>{emp.nombre} — {emp.telefono} — {emp.email}</div>
            </div>
        </div>
    );
};

// ── Modal Factura (venta ya guardada) ─────────────────────────────────────────
const FacturaModal = ({ venta, clienteData, onClose }:
    { venta: Venta; clienteData?: Cliente | null; onClose: () => void }) => {
    const [factura, setFactura] = useState<FacturaVenta | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        facturaVentaService.getByVentaId(venta.id)
            .then(setFactura)
            .catch(() => setError('No se encontró la factura'))
            .finally(() => setLoading(false));
    }, [venta.id]);

    return (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
            <div className="modal-box" style={{ maxWidth: '700px', padding: 0, overflow: 'hidden' }}>
                <div className="no-print" style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    padding: '0.9rem 1.5rem', background: '#f8fafc', borderBottom: '1px solid #e2e8f0'
                }}>
                    <span style={{ fontWeight: 700, color: '#1e293b' }}>🧾 Factura de Venta</span>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button className="action-btn" onClick={() => window.print()} style={{ fontSize: '0.82rem' }}>🖨️ Imprimir</button>
                        <button className="action-btn" onClick={onClose} style={{ fontSize: '0.82rem' }}>✕ Cerrar</button>
                    </div>
                </div>
                {loading && <div className="loading-state" style={{ padding: '2rem' }}>Cargando factura...</div>}
                {error && <div className="modal-error" style={{ margin: '1rem' }}>{error}</div>}
                {factura && (
                    <div style={{ padding: '1.75rem 2rem', maxHeight: '80vh', overflowY: 'auto' }}>
                        <FacturaView venta={venta} clienteData={clienteData} factura={factura} />
                    </div>
                )}
            </div>
        </div>
    );
};

// ── Modal Preview Factura (antes de confirmar) ────────────────────────────────
const FacturaPreviewModal = ({
    previewData, onConfirmar, onVolver, loading
}: {
    previewData: {
        clienteNombre: string; clienteTelefono?: string;
        clienteData?: Partial<Cliente> | null;
        items: { productoId: string; cantidad: number; precioUnitario: number; producto?: any }[];
        vendedorNombre: string;
        productos: Producto[];
    };
    onConfirmar: () => void;
    onVolver: () => void;
    loading: boolean;
}) => {
    const total = previewData.items.reduce((s, item) => s + item.precioUnitario * item.cantidad, 0);

    const ventaPreview = {
        clienteNombre: previewData.clienteNombre,
        clienteTelefono: previewData.clienteTelefono,
        items: previewData.items.map(item => {
            const prod = previewData.productos.find(p => p.id === item.productoId);
            return {
                cantidad: item.cantidad,
                precioUnitario: item.precioUnitario,
                producto: prod ? { id: prod.id, nombre: prod.nombre, codigo: prod.codigo, precio: prod.precio } : null,
            };
        }),
        vendedor: { nombre: previewData.vendedorNombre },
    };

    const facturaPreview = {
        numero: 'BORRADOR',
        total,
        fechaEmision: new Date().toISOString(),
    };

    return (
        <div className="modal-overlay">
            <div className="modal-box" style={{ maxWidth: '720px', padding: 0, overflow: 'hidden' }}>
                <div className="no-print" style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    padding: '0.9rem 1.5rem', background: '#fefce8', borderBottom: '2px solid #fde68a'
                }}>
                    <div>
                        <span style={{ fontWeight: 700, color: '#92400e', fontSize: '0.95rem' }}>
                            📋 Vista previa de la factura
                        </span>
                        <div style={{ fontSize: '0.75rem', color: '#a16207', marginTop: '0.1rem' }}>
                            Revisa los datos antes de confirmar — el número definitivo se asignará al confirmar
                        </div>
                    </div>
                    <button className="action-btn" onClick={onVolver} style={{ fontSize: '0.82rem' }}>← Volver</button>
                </div>

                <div style={{ padding: '1.75rem 2rem', maxHeight: '65vh', overflowY: 'auto' }}>
                    <FacturaView
                        venta={ventaPreview as any}
                        clienteData={previewData.clienteData}
                        factura={facturaPreview}
                        vendedorNombre={previewData.vendedorNombre}
                    />
                </div>

                <div className="no-print" style={{
                    display: 'flex', justifyContent: 'flex-end', gap: '0.75rem',
                    padding: '1rem 1.5rem', background: '#f8fafc', borderTop: '1px solid #e2e8f0'
                }}>
                    <button className="btn btn-secondary" onClick={onVolver} disabled={loading}>← Volver y editar</button>
                    <button className="btn btn-success" onClick={onConfirmar} disabled={loading}
                        style={{ background: '#16a34a', color: 'white', border: 'none', padding: '0.6rem 1.5rem', borderRadius: '8px', fontWeight: 700, cursor: 'pointer', fontSize: '0.9rem' }}>
                        {loading ? '⏳ Registrando...' : '✅ Confirmar y registrar venta'}
                    </button>
                </div>
            </div>
        </div>
    );
};

// ── Página Ventas ─────────────────────────────────────────────────────────────
const Ventas: React.FC = () => {
    const [ventas, setVentas] = useState<Venta[]>([]);
    const [productos, setProductos] = useState<Producto[]>([]);
    const [clientes, setClientes] = useState<Cliente[]>([]);
    const [loading, setLoading] = useState(true);
    const [busqueda, setBusqueda] = useState('');
    const [filtroEstado, setFiltroEstado] = useState<string>('todos');
    const [modalNueva, setModalNueva] = useState(false);
    const [showPreview, setShowPreview] = useState(false);
    const [loadingForm, setLoadingForm] = useState(false);
    const [errorForm, setErrorForm] = useState('');
    const [ventaFactura, setVentaFactura] = useState<Venta | null>(null);
    const [clienteFactura, setClienteFactura] = useState<Cliente | null>(null);

    const [clienteId, setClienteId] = useState('');
    const [esClienteNuevo, setEsClienteNuevo] = useState(false);
    const [busquedaCliente, setBusquedaCliente] = useState('');
    const [nuevoNombre, setNuevoNombre] = useState('');
    const [nuevoTelefono, setNuevoTelefono] = useState('');
    const [nuevoDocumento, setNuevoDocumento] = useState('');
    const [nuevaDireccion, setNuevaDireccion] = useState('');
    const [nuevaCiudad, setNuevaCiudad] = useState('Cali');

    const [items, setItems] = useState<{ productoId: string; cantidad: number; precioUnitario: number }[]>([
        { productoId: '', cantidad: 1, precioUnitario: 0 }
    ]);

    const user = authService.getUser();
    const esAdmin = user?.rol?.nombre === 'ADMIN';

    const cargarDatos = async () => {
        try {
            setLoading(true);
            const [ventasRes, productosRes, clientesRes] = await Promise.all([
                api.get('/ventas').catch(() => ({ data: [] })),
                api.get('/productos/activos'),
                clienteService.getClientesActivos(),
            ]);
            setVentas(ventasRes.data);
            setProductos(productosRes.data);
            setClientes(clientesRes);
        } catch (err) { console.error('Error:', err); }
        finally { setLoading(false); }
    };

    useEffect(() => { cargarDatos(); }, []);

    const clienteSeleccionado = clientes.find(c => c.id === clienteId);
    const nombreFinal = esClienteNuevo ? nuevoNombre : (clienteSeleccionado?.nombre ?? '');
    const telefonoFinal = esClienteNuevo ? nuevoTelefono : (clienteSeleccionado?.telefono ?? '');

    const clienteDataPreview: Partial<Cliente> | null = esClienteNuevo
        ? { nombre: nuevoNombre, telefono: nuevoTelefono, documento: nuevoDocumento, direccion: nuevaDireccion, ciudad: nuevaCiudad }
        : (clienteSeleccionado ?? null);

    const clientesFiltrados = busquedaCliente.trim()
        ? clientes.filter(c =>
            c.nombre.toLowerCase().includes(busquedaCliente.toLowerCase()) ||
            (c.telefono ?? '').includes(busquedaCliente) ||
            (c.documento ?? '').includes(busquedaCliente))
        : clientes;

    const calcularTotal = () => items.reduce((acc, item) => {
        const cant = typeof item.cantidad === 'number' ? item.cantidad : 0;
        return acc + item.precioUnitario * cant;
    }, 0);

    const handleAgregarItem = () => setItems([...items, { productoId: '', cantidad: 1, precioUnitario: 0 }]);
    const handleRemoverItem = (idx: number) => setItems(items.filter((_, i) => i !== idx));
    const handleItemChange = (idx: number, field: 'productoId' | 'cantidad' | 'precioUnitario', value: string | number) => {
        const updated = [...items];
        if (field === 'productoId') {
            const prod = productos.find(p => p.id === value);
            updated[idx] = { ...updated[idx], productoId: value as string, precioUnitario: prod?.precio ?? updated[idx].precioUnitario };
        } else if (field === 'cantidad') {
            updated[idx] = { ...updated[idx], cantidad: value as any };
        } else {
            (updated[idx] as any)[field] = value;
        }
        setItems(updated);
    };

    const resetForm = () => {
        setClienteId(''); setEsClienteNuevo(false); setBusquedaCliente('');
        setNuevoNombre(''); setNuevoTelefono(''); setNuevoDocumento('');
        setNuevaDireccion(''); setNuevaCiudad('Cali');
        setItems([{ productoId: '', cantidad: 1, precioUnitario: 0 }]);
        setErrorForm('');
    };

    const handleMostrarPreview = (e: React.FormEvent) => {
        e.preventDefault();
        if (!nombreFinal.trim()) { setErrorForm('Selecciona o ingresa el nombre del cliente'); return; }
        if (items.some(i => !i.productoId)) { setErrorForm('Selecciona un producto en cada línea'); return; }
        if (items.some(i => i.precioUnitario <= 0)) { setErrorForm('El precio de cada producto debe ser mayor a 0'); return; }
        if (items.some(i => !i.cantidad || i.cantidad <= 0)) { setErrorForm('La cantidad de cada producto debe ser mayor a 0 y ser un número válido'); return; }
        setErrorForm('');
        setShowPreview(true);
    };

    const handleConfirmarVenta = async () => {
        setLoadingForm(true);
        try {
            let clienteVentaId = clienteSeleccionado?.id;
            if (esClienteNuevo && nuevoNombre.trim()) {
                try {
                    const creado = await clienteService.crearCliente({
                        nombre: nuevoNombre.trim(), telefono: nuevoTelefono || undefined,
                        documento: nuevoDocumento || undefined, direccion: nuevaDireccion || undefined,
                        ciudad: nuevaCiudad || 'Cali', activo: true,
                    } as any);
                    clienteVentaId = creado.id;
                } catch { }
            }
            await api.post('/ventas', {
                clienteNombre: nombreFinal,
                clienteTelefono: telefonoFinal || null,
                cliente: clienteVentaId ? { id: clienteVentaId } : null,
                vendedor: user ? { id: user.id } : null,
                estado: 'COMPLETADA',
                items: items.map(i => ({
                    producto: { id: i.productoId },
                    cantidad: typeof i.cantidad === 'number' ? i.cantidad : 1,
                    precioUnitario: i.precioUnitario,
                }))
            });
            setShowPreview(false);
            setModalNueva(false);
            resetForm();
            cargarDatos();
        } catch (err: any) {
            setErrorForm(err.response?.data || 'Error al registrar la venta');
            setShowPreview(false);
        } finally { setLoadingForm(false); }
    };

    const handleCancelarVenta = async (id: string) => {
        if (!confirm('¿Cancelar esta venta? Se devolverá el stock.')) return;
        try { await api.delete(`/ventas/${id}`); cargarDatos(); }
        catch (err: any) { alert(err.response?.data || 'Error al cancelar'); }
    };

    const abrirFactura = async (v: Venta) => {
        setVentaFactura(v);
        const match = clientes.find(c =>
            c.nombre.toLowerCase() === v.clienteNombre.toLowerCase() ||
            (v.clienteTelefono && c.telefono === v.clienteTelefono)
        );
        setClienteFactura(match ?? null);
    };

    const ventasFiltradas = ventas.filter(v => {
        const matchBusqueda = v.clienteNombre.toLowerCase().includes(busqueda.toLowerCase());
        const matchEstado = filtroEstado === 'todos' || v.estado === filtroEstado;
        return matchBusqueda && matchEstado;
    });

    const totalIngresos = ventas.filter(v => v.estado === 'COMPLETADA').reduce((a, v) => a + v.total, 0);
    const counts = {
        COMPLETADA: ventas.filter(v => v.estado === 'COMPLETADA').length,
        PENDIENTE: ventas.filter(v => v.estado === 'PENDIENTE').length,
        CANCELADA: ventas.filter(v => v.estado === 'CANCELADA').length,
    };

    return (
        <div className="page-container">
            <div className="page-header">
                <div className="page-header-left">
                    <h1 className="page-title">💰 Ventas</h1>
                    <span className="page-subtitle">Registro y consulta de ventas</span>
                </div>
                <button className="action-btn action-btn-primary" onClick={() => { resetForm(); setModalNueva(true); }}>
                    + Nueva Venta
                </button>
            </div>

            <div className="stats-grid">
                <div className="stat-card"><span className="stat-card-label">Total ventas</span><span className="stat-card-value">{ventas.length}</span></div>
                <div className="stat-card"><span className="stat-card-label">✅ Completadas</span><span className="stat-card-value" style={{ color: '#22c55e' }}>{counts.COMPLETADA}</span></div>
                <div className="stat-card">
                    <span className="stat-card-label">💵 Ingresos totales</span>
                    <span className="stat-card-value" style={{ color: '#3b82f6', fontSize: '1.1rem' }}>${totalIngresos.toLocaleString('es-CO')}</span>
                </div>
                <div className="stat-card"><span className="stat-card-label">❌ Canceladas</span><span className="stat-card-value" style={{ color: '#ef4444' }}>{counts.CANCELADA}</span></div>
            </div>

            <div className="toolbar">
                <div className="toolbar-left">
                    <div className="search-bar">
                        <span>🔍</span>
                        <input type="text" placeholder="Buscar por cliente..."
                            value={busqueda} onChange={e => setBusqueda(e.target.value)} />
                    </div>
                </div>
                <div className="toolbar-right">
                    {(['todos', 'COMPLETADA', 'CANCELADA'] as const).map(f => (
                        <button key={f} className="action-btn" onClick={() => setFiltroEstado(f)}
                            style={{ background: filtroEstado === f ? '#3b82f6' : '#f1f5f9', color: filtroEstado === f ? 'white' : '#475569', border: filtroEstado === f ? 'none' : '1px solid #e2e8f0' }}>
                            {f === 'todos' ? 'Todas' : ESTADO_CONFIG[f as keyof typeof ESTADO_CONFIG].label}
                        </button>
                    ))}
                </div>
            </div>

            <div className="table-wrapper">
                {loading ? (
                    <div className="loading-state">⏳ Cargando ventas...</div>
                ) : ventasFiltradas.length === 0 ? (
                    <div className="empty-state">
                        <span className="empty-state-icon">💰</span>
                        <h3>Sin ventas registradas</h3>
                        <p>Registra la primera venta usando el botón de arriba</p>
                    </div>
                ) : (
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th>Cliente</th><th>Productos</th><th>Total</th>
                                <th>Estado</th><th>Vendedor</th><th>Fecha</th><th>Acciones</th>
                            </tr>
                        </thead>
                        <tbody>
                            {ventasFiltradas.map(v => {
                                const cfg = ESTADO_CONFIG[v.estado] ?? ESTADO_CONFIG.COMPLETADA;
                                return (
                                    <tr key={v.id}>
                                        <td>
                                            <div style={{ fontWeight: '600', color: '#0f172a' }}>{v.clienteNombre}</div>
                                            {v.clienteTelefono && <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>{v.clienteTelefono}</div>}
                                        </td>
                                        <td style={{ color: '#64748b', fontSize: '0.82rem' }}>
                                            {v.items && v.items.length > 0
                                                ? v.items.map(i => `${i.producto?.nombre ?? 'Producto'} x${i.cantidad}`).join(', ')
                                                : <span style={{ color: '#cbd5e1' }}>—</span>}
                                        </td>
                                        <td style={{ fontWeight: '700', color: '#0f172a' }}>${v.total.toLocaleString('es-CO')}</td>
                                        <td><span className={`badge ${cfg.clase}`}>{cfg.icono} {cfg.label}</span></td>
                                        <td style={{ color: '#64748b', fontSize: '0.82rem' }}>{v.vendedor?.nombre ?? '—'}</td>
                                        <td style={{ color: '#94a3b8', fontSize: '0.8rem' }}>
                                            {new Date(v.fecha).toLocaleString('es-CO', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                        </td>
                                        <td>
                                            <ActionMenu items={[
                                                {
                                                    label: 'Ver factura',
                                                    icon: '🧾',
                                                    variant: 'info',
                                                    onClick: () => abrirFactura(v),
                                                    hidden: v.estado !== 'COMPLETADA',
                                                },
                                                {
                                                    label: 'Cancelar venta',
                                                    icon: '❌',
                                                    variant: 'danger',
                                                    onClick: () => handleCancelarVenta(v.id),
                                                    hidden: !esAdmin || v.estado !== 'COMPLETADA',
                                                },
                                            ]} />
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                )}
            </div>

            {modalNueva && !showPreview && (
                <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setModalNueva(false)}>
                    <div className="modal-box" style={{ maxWidth: '640px' }}>
                        <div className="modal-header">
                            <div className="modal-title">
                                <div className="modal-title-icon green" style={{ background: '#dcfce7' }}>💰</div>
                                <div>
                                    <h2>Nueva Venta</h2>
                                    <p>Total: <strong style={{ color: '#22c55e' }}>${calcularTotal().toLocaleString('es-CO')}</strong></p>
                                </div>
                            </div>
                            <button className="modal-close" onClick={() => setModalNueva(false)}>✕</button>
                        </div>

                        <div className="modal-body">
                            {errorForm && <div className="modal-error"><span>⚠️</span><span>{errorForm}</span></div>}
                            <form onSubmit={handleMostrarPreview} id="form-venta">

                                <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '1rem', marginBottom: '1rem' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                                        <label className="form-label" style={{ margin: 0 }}>👤 Cliente</label>
                                        <button type="button"
                                            onClick={() => { setEsClienteNuevo(!esClienteNuevo); setClienteId(''); }}
                                            style={{ fontSize: '0.75rem', padding: '0.25rem 0.7rem', border: '1px solid #cbd5e1', borderRadius: '6px', background: esClienteNuevo ? '#eff6ff' : '#fff', color: esClienteNuevo ? '#1d4ed8' : '#475569', cursor: 'pointer', fontWeight: 600 }}>
                                            {esClienteNuevo ? '📋 Seleccionar existente' : '➕ Cliente nuevo'}
                                        </button>
                                    </div>
                                    {!esClienteNuevo ? (
                                        <div>
                                            <input className="form-input" placeholder="🔍 Buscar por nombre, teléfono o documento..."
                                                value={busquedaCliente}
                                                onChange={e => { setBusquedaCliente(e.target.value); setClienteId(''); }}
                                                style={{ marginBottom: '0.5rem' }} />
                                            <select className="form-select" value={clienteId}
                                                onChange={e => { setClienteId(e.target.value); setBusquedaCliente(''); }}>
                                                <option value="">-- Seleccionar cliente --</option>
                                                {clientesFiltrados.map(c => (
                                                    <option key={c.id} value={c.id}>
                                                        {c.nombre}{c.telefono ? ` — ${c.telefono}` : ''}{c.documento ? ` — Doc: ${c.documento}` : ''}
                                                    </option>
                                                ))}
                                            </select>
                                            {clienteSeleccionado && (
                                                <div style={{ marginTop: '0.5rem', background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '8px', padding: '0.5rem 0.75rem', fontSize: '0.8rem', color: '#1d4ed8' }}>
                                                    ✅ <strong>{clienteSeleccionado.nombre}</strong>
                                                    {clienteSeleccionado.direccion && ` — ${clienteSeleccionado.direccion}`}
                                                    {clienteSeleccionado.ciudad && `, ${clienteSeleccionado.ciudad}`}
                                                </div>
                                            )}
                                        </div>
                                    ) : (
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                                            <div className="form-row">
                                                <div className="form-group">
                                                    <label className="form-label">Nombre *</label>
                                                    <input className="form-input" value={nuevoNombre} onChange={e => setNuevoNombre(e.target.value)} placeholder="Nombre completo" />
                                                </div>
                                                <div className="form-group">
                                                    <label className="form-label">NIT / Cédula</label>
                                                    <input className="form-input" value={nuevoDocumento} onChange={e => setNuevoDocumento(e.target.value)} placeholder="Documento" />
                                                </div>
                                            </div>
                                            <div className="form-row">
                                                <div className="form-group">
                                                    <label className="form-label">Teléfono</label>
                                                    <input className="form-input" value={nuevoTelefono} onChange={e => setNuevoTelefono(e.target.value)} placeholder="300 000 0000" />
                                                </div>
                                                <div className="form-group">
                                                    <label className="form-label">Ciudad</label>
                                                    <input className="form-input" value={nuevaCiudad} onChange={e => setNuevaCiudad(e.target.value)} placeholder="Cali" />
                                                </div>
                                            </div>
                                            <div className="form-group">
                                                <label className="form-label">Dirección</label>
                                                <input className="form-input" value={nuevaDireccion} onChange={e => setNuevaDireccion(e.target.value)} placeholder="Dirección" />
                                            </div>
                                            <div style={{ fontSize: '0.75rem', color: '#64748b', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '6px', padding: '0.4rem 0.6rem' }}>
                                                ℹ️ El cliente se guardará automáticamente al confirmar la venta
                                            </div>
                                        </div>
                                    )}
                                </div>

                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                                    <label className="form-label" style={{ margin: 0 }}>📦 Productos</label>
                                    <button type="button" className="action-btn action-btn-ghost"
                                        style={{ fontSize: '0.75rem', padding: '0.25rem 0.6rem' }}
                                        onClick={handleAgregarItem}>
                                        + Agregar línea
                                    </button>
                                </div>

                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 70px 110px 90px 32px', gap: '0.3rem', marginBottom: '0.25rem', padding: '0 0.1rem' }}>
                                    {['PRODUCTO', 'CANT.', 'PRECIO FINAL', 'SUBTOTAL', ''].map(h => (
                                        <span key={h} style={{ fontSize: '0.68rem', color: '#64748b', fontWeight: 600, textAlign: h === 'SUBTOTAL' ? 'right' : 'left' }}>{h}</span>
                                    ))}
                                </div>

                                {items.map((item, idx) => {
                                    const prod = productos.find(p => p.id === item.productoId);
                                    const subtotal = item.precioUnitario * item.cantidad;
                                    const precioOriginal = prod?.precio ?? 0;
                                    const tieneRebaja = precioOriginal > 0 && item.precioUnitario !== precioOriginal && item.precioUnitario > 0;
                                    return (
                                        <div key={idx} style={{ marginBottom: '0.5rem' }}>
                                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 70px 110px 90px 32px', gap: '0.3rem', alignItems: 'center' }}>
                                                <div>
                                                    <select className="form-select" value={item.productoId}
                                                        onChange={e => handleItemChange(idx, 'productoId', e.target.value)}>
                                                        <option value="">Seleccionar producto...</option>
                                                        {productos.map(p => (
                                                            <option key={p.id} value={p.id}>{p.codigo} — {p.nombre}</option>
                                                        ))}
                                                    </select>
                                                    {prod && (
                                                        <span style={{ fontSize: '0.68rem', color: '#94a3b8' }}>
                                                            Stock: {prod.stock} u. — Precio lista: ${prod.precio.toLocaleString('es-CO')}
                                                        </span>
                                                    )}
                                                </div>
                                                <input className="form-input" type="number" min="1"
                                                    value={item.cantidad}
                                                    onChange={e => {
                                                        const val = e.target.value;
                                                        if (val === '') {
                                                            handleItemChange(idx, 'cantidad', '');
                                                        } else {
                                                            const parsed = parseInt(val);
                                                            handleItemChange(idx, 'cantidad', isNaN(parsed) ? '' : parsed);
                                                        }
                                                    }}
                                                    max={prod?.stock ?? 9999}
                                                    style={{ textAlign: 'center', padding: '0.4rem 0.3rem' }} />
                                                <div>
                                                    <input className="form-input" type="number" min="0"
                                                        value={item.precioUnitario}
                                                        onChange={e => handleItemChange(idx, 'precioUnitario', parseFloat(e.target.value) || 0)}
                                                        style={{ textAlign: 'right', padding: '0.4rem 0.3rem', borderColor: tieneRebaja ? '#f59e0b' : undefined }} />
                                                    {tieneRebaja && (
                                                        <span style={{ fontSize: '0.65rem', color: '#f59e0b', fontWeight: 600 }}>↓ Rebaja aplicada</span>
                                                    )}
                                                </div>
                                                <div style={{ textAlign: 'right', fontWeight: 600, fontSize: '0.83rem', color: subtotal > 0 ? '#0f172a' : '#cbd5e1' }}>
                                                    {subtotal > 0 ? '$' + Math.round(subtotal).toLocaleString('es-CO') : '—'}
                                                </div>
                                                {items.length > 1
                                                    ? <button type="button" className="icon-btn icon-btn-delete" onClick={() => handleRemoverItem(idx)}>✕</button>
                                                    : <div />}
                                            </div>
                                        </div>
                                    );
                                })}

                                <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '10px', padding: '0.75rem 1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.75rem' }}>
                                    <div>
                                        <span style={{ fontSize: '0.85rem', fontWeight: '600', color: '#15803d' }}>Total a cobrar</span>
                                        <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '0.1rem' }}>Precios finales con IVA incluido</div>
                                    </div>
                                    <span style={{ fontSize: '1.25rem', fontWeight: '800', color: '#15803d' }}>
                                        ${calcularTotal().toLocaleString('es-CO')}
                                    </span>
                                </div>
                            </form>
                        </div>

                        <div className="modal-footer">
                            <button className="btn btn-secondary" onClick={() => setModalNueva(false)}>Cancelar</button>
                            <button className="btn btn-primary" type="submit" form="form-venta">
                                📋 Ver factura previa →
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {showPreview && (
                <FacturaPreviewModal
                    previewData={{
                        clienteNombre: nombreFinal,
                        clienteTelefono: telefonoFinal,
                        clienteData: clienteDataPreview,
                        items,
                        vendedorNombre: user?.nombre ?? '',
                        productos,
                    }}
                    onConfirmar={handleConfirmarVenta}
                    onVolver={() => setShowPreview(false)}
                    loading={loadingForm}
                />
            )}

            {ventaFactura && (
                <FacturaModal
                    venta={ventaFactura}
                    clienteData={clienteFactura}
                    onClose={() => { setVentaFactura(null); setClienteFactura(null); }}
                />
            )}
        </div>
    );
};

export default Ventas;
