import React, { useEffect, useMemo, useState } from 'react';
import { devolucionGarantiaService } from '../services/devolucionGarantiaService';
import { ventaService } from '../services/ventaService';
import { entregaService } from '../services/entregaService';
import { authService } from '../services/authService';
import type { Venta, OrdenServicio } from '../types';

interface RegistroItem {
    id: string;
    producto: { id: string; nombre: string; codigo?: string };
    cantidad: number;
    precioUnitario: number;
    motivoItem?: string;
}

interface Registro {
    id: string;
    tipo: 'DEVOLUCION' | 'GARANTIA';
    estado: string;
    clienteNombre?: string;
    razon: string;
    accionDinero: string;
    montoDevuelto: number;
    fecha: string;
    venta?: { id: string };
    entrega?: { id: string };
    items: RegistroItem[];
}

interface FormItem {
    productoId: string;
    cantidad: number;
    precioUnitario: number;
    motivoItem: string;
}

const money = (n: number) =>
    Number(n || 0).toLocaleString('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 });

const DevolucionesGarantias: React.FC = () => {
    const user = authService.getUser();
    const [registros, setRegistros] = useState<Registro[]>([]);
    const [ventas, setVentas] = useState<Venta[]>([]);
    const [entregas, setEntregas] = useState<OrdenServicio[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    const [tipo, setTipo] = useState<'DEVOLUCION' | 'GARANTIA'>('DEVOLUCION');
    const [origenTipo, setOrigenTipo] = useState<'VENTA' | 'ENTREGA'>('VENTA');
    const [origenId, setOrigenId] = useState('');
    const [razon, setRazon] = useState('');
    const [accionDinero, setAccionDinero] = useState<'REEMBOLSO' | 'SALDO_FAVOR' | 'SIN_REEMBOLSO'>('REEMBOLSO');
    const [montoDevuelto, setMontoDevuelto] = useState(0);
    const [notas, setNotas] = useState('');
    const [items, setItems] = useState<FormItem[]>([]);
    const [tieneDevolucionActiva, setTieneDevolucionActiva] = useState(false);
    const [verificandoActiva, setVerificandoActiva] = useState(false);

    const cargar = async () => {
        setLoading(true);
        setError('');
        try {
            const [regs, vs, es] = await Promise.all([
                devolucionGarantiaService.getRecientes(),
                ventaService.getVentas(),
                entregaService.getEntregas(),
            ]);
            setRegistros(regs);
            setVentas(vs.filter((v: Venta) => v.estado === 'COMPLETADA'));
            setEntregas(es.filter((e: OrdenServicio) => e.estado === 'FINALIZADO'));
        } catch {
            setError('No se pudo cargar la informacion de devoluciones y garantias');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { cargar(); }, []);

    const origenSeleccionado = useMemo(() => {
        return origenTipo === 'VENTA'
            ? ventas.find(v => v.id === origenId)
            : entregas.find(e => e.id === origenId);
    }, [origenTipo, origenId, ventas, entregas]);

    const productosOrigen = useMemo(() => {
        if (!origenSeleccionado) return [];
        if (origenTipo === 'VENTA') {
            return ((origenSeleccionado as Venta).items ?? []).map(i => ({
                productoId: i.producto.id,
                nombre: i.producto.nombre,
                codigo: i.producto.codigo,
                cantidad: i.cantidad,
                precioUnitario: i.precioUnitario ?? 0,
            }));
        }
        return ((origenSeleccionado as OrdenServicio).items ?? []).map(i => ({
            productoId: i.producto.id,
            nombre: i.producto.nombre,
            codigo: i.producto.codigo,
            cantidad: i.cantidad,
            precioUnitario: i.precioUnitario ?? i.producto.precio ?? 0,
        }));
    }, [origenSeleccionado, origenTipo]);

    const totalItems = items.reduce((s, i) => s + i.cantidad * i.precioUnitario, 0);

    const manoObraOrden = useMemo(() => {
        if (origenTipo === 'ENTREGA' && origenSeleccionado) {
            return (origenSeleccionado as OrdenServicio).manoObra ?? 0;
        }
        return 0;
    }, [origenTipo, origenSeleccionado]);

    const limiteMaximo = totalItems + manoObraOrden;

    const resetForm = () => {
        setOrigenId('');
        setRazon('');
        setAccionDinero(tipo === 'GARANTIA' ? 'SIN_REEMBOLSO' : 'REEMBOLSO');
        setMontoDevuelto(0);
        setNotas('');
        setItems([]);
    };

    const handleOrigenChange = async (id: string) => {
        setOrigenId(id);
        setItems([]);
        setMontoDevuelto(0);
        setTieneDevolucionActiva(false);
        if (!id) return;
        setVerificandoActiva(true);
        try {
            let activa: boolean;
            if (origenTipo === 'VENTA') {
                activa = await devolucionGarantiaService.tieneActivaPorVenta(id);
            } else {
                activa = await devolucionGarantiaService.tieneActivaPorEntrega(id);
            }
            setTieneDevolucionActiva(activa);
        } catch {
            // si falla la verificación no bloqueamos
            setTieneDevolucionActiva(false);
        } finally {
            setVerificandoActiva(false);
        }
    };

    const agregarItem = () => {
        const disponible = productosOrigen.find(p => !items.some(i => i.productoId === p.productoId));
        if (!disponible) return;
        setItems(prev => [...prev, {
            productoId: disponible.productoId,
            cantidad: 1,
            precioUnitario: disponible.precioUnitario,
            motivoItem: '',
        }]);
    };

    const actualizarItem = (idx: number, field: keyof FormItem, value: string | number) => {
        setItems(prev => prev.map((item, i) => {
            if (i !== idx) return item;
            const updated = { ...item, [field]: value };
            if (field === 'productoId') {
                const prod = productosOrigen.find(p => p.productoId === value);
                updated.precioUnitario = prod?.precioUnitario ?? 0;
                updated.cantidad = 1;
            }
            return updated;
        }));
    };

    const quitarItem = (idx: number) => {
        setItems(prev => prev.filter((_, i) => i !== idx));
    };

    const handleTipoChange = (value: 'DEVOLUCION' | 'GARANTIA') => {
        setTipo(value);
        setAccionDinero(value === 'GARANTIA' ? 'SIN_REEMBOLSO' : 'REEMBOLSO');
        if (value === 'GARANTIA') setMontoDevuelto(0);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setSuccess('');
        if (!origenId) { setError('Selecciona una venta u orden finalizada'); return; }
        if (!razon.trim()) { setError('La razon es obligatoria'); return; }
        // Permitir registro sin items si la orden tiene mano de obra
        if (items.length === 0 && manoObraOrden === 0) { setError('Agrega al menos un producto a devolver'); return; }
        if (tipo === 'DEVOLUCION' && montoDevuelto > limiteMaximo) {
            setError(manoObraOrden > 0
                ? 'El monto devuelto no puede superar el valor total (repuestos + mano de obra)'
                : 'El monto devuelto no puede superar el valor de los items'
            );
            return;
        }

        try {
            await devolucionGarantiaService.registrar({
                tipo,
                venta: origenTipo === 'VENTA' ? { id: origenId } : undefined,
                entrega: origenTipo === 'ENTREGA' ? { id: origenId } : undefined,
                razon: razon.trim(),
                accionDinero,
                montoDevuelto: tipo === 'GARANTIA' ? 0 : montoDevuelto,
                notas,
                registradoPor: user?.id ? { id: user.id } : undefined,
                items: items.map(i => ({
                    producto: { id: i.productoId },
                    cantidad: Number(i.cantidad),
                    precioUnitario: Number(i.precioUnitario),
                    motivoItem: i.motivoItem,
                })),
            });
            setSuccess('Registro creado correctamente. El stock se ajusto con una entrada de inventario.');
            resetForm();
            cargar();
        } catch (err: any) {
            setError(err.response?.data || 'No se pudo registrar la devolucion o garantia');
        }
    };

    return (
        <div className="page-container">
            <div className="page-header">
                <div className="page-header-left">
                    <h1 className="page-title">Devoluciones / Garantias</h1>
                    <span className="page-subtitle">Registra ajustes posteriores a facturacion sin cancelar el documento original.</span>
                </div>
            </div>

            {error && <div className="dashboard-alert">{error}</div>}
            {success && <div className="info-badge" style={{ color: '#15803d', background: '#f0fdf4', borderColor: '#bbf7d0' }}>{success}</div>}

            <div className="card">
                <div className="card-body">
                    <form onSubmit={handleSubmit} style={{ display: 'grid', gap: '1rem' }}>
                        <div className="stats-grid">
                            <div className="form-group">
                                <label className="form-label">Tipo</label>
                                <select className="form-input" value={tipo} onChange={e => handleTipoChange(e.target.value as 'DEVOLUCION' | 'GARANTIA')}>
                                    <option value="DEVOLUCION">Devolucion</option>
                                    <option value="GARANTIA">Garantia</option>
                                </select>
                            </div>
                            <div className="form-group">
                                <label className="form-label">Origen</label>
                                <select className="form-input" value={origenTipo} onChange={e => { setOrigenTipo(e.target.value as 'VENTA' | 'ENTREGA'); handleOrigenChange(''); }}>
                                    <option value="VENTA">Venta</option>
                                    <option value="ENTREGA">Orden finalizada</option>
                                </select>
                            </div>
                            <div className="form-group">
                                <label className="form-label">Documento</label>
                                <select className="form-input" value={origenId} onChange={e => handleOrigenChange(e.target.value)}>
                                    <option value="">Seleccionar...</option>
                                    {origenTipo === 'VENTA' ? ventas.map(v => (
                                        <option key={v.id} value={v.id}>{v.id.slice(0, 8).toUpperCase()} - {v.clienteNombre} - {money(v.total)}</option>
                                    )) : entregas.map(o => (
                                        <option key={o.id} value={o.id}>{o.id.slice(0, 8).toUpperCase()} - {o.clienteNombre} - {money(o.totalOrden ?? 0)}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        {verificandoActiva && (
                            <div className="info-badge" style={{ color: '#1d4ed8', background: '#eff6ff', borderColor: '#bfdbfe', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                ⏳ Verificando si ya existe una devolución activa...
                            </div>
                        )}

                        {tieneDevolucionActiva && !verificandoActiva && (
                            <div className="dashboard-alert" style={{ background: '#fff7ed', borderColor: '#fed7aa', color: '#92400e', display: 'flex', alignItems: 'flex-start', gap: '0.75rem', borderRadius: '0.75rem', padding: '1rem 1.25rem' }}>
                                <span style={{ fontSize: '1.5rem', lineHeight: 1 }}>⚠️</span>
                                <div>
                                    <strong style={{ display: 'block', marginBottom: '0.25rem' }}>
                                        Este documento ya tiene una devolución o garantía activa registrada.
                                    </strong>
                                    <span style={{ fontSize: '0.875rem' }}>
                                        No se puede registrar otra devolución sobre el mismo documento mientras exista una activa.
                                        Si necesitas corregirla, anula la devolución existente primero desde el historial.
                                    </span>
                                </div>
                            </div>
                        )}


                        {origenTipo === 'ENTREGA' && origenSeleccionado && (origenSeleccionado as OrdenServicio).manoObra && (origenSeleccionado as OrdenServicio).manoObra! > 0 ? (
                            <div className="info-badge" style={{ color: '#1d4ed8', background: '#eff6ff', borderColor: '#bfdbfe', margin: '0.5rem 0', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                🔧
                                <span>
                                    Esta orden incluye <strong>mano de obra / servicio</strong> por
                                    {' '}<strong>{money((origenSeleccionado as OrdenServicio).manoObra!)}</strong>.
                                    {' '}Se incluye automáticamente en el registro — no necesitas agregar ningún producto si solo quieres devolver el servicio.
                                </span>
                            </div>
                        ) : null}

                        <div className="form-group">
                            <label className="form-label">Razon</label>
                            <textarea className="form-input" value={razon} onChange={e => setRazon(e.target.value)} placeholder="Ej: producto defectuoso, garantia por falla, servicio no realizado correctamente..." rows={3} />
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
                            <strong>
                                Repuestos / Productos
                                {manoObraOrden > 0 && items.length === 0 && (
                                    <span style={{ fontWeight: 400, fontSize: '0.8rem', color: '#64748b', marginLeft: '0.5rem' }}>
                                        (opcional — la mano de obra ya está incluida)
                                    </span>
                                )}
                            </strong>
                            <button type="button" className="action-btn action-btn-ghost" onClick={agregarItem} disabled={!origenId || productosOrigen.length === items.length || productosOrigen.length === 0}>
                                + Agregar repuesto
                            </button>
                        </div>

                        {items.length > 0 && (
                            <div className="table-wrapper">
                                <table className="data-table">
                                    <thead>
                                        <tr>
                                            <th>Producto</th>
                                            <th>Cantidad</th>
                                            <th>Precio</th>
                                            <th>Motivo</th>
                                            <th></th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {items.map((item, idx) => {
                                            const origen = productosOrigen.find(p => p.productoId === item.productoId);
                                            return (
                                                <tr key={`${item.productoId}-${idx}`}>
                                                    <td>
                                                        <select className="form-input" value={item.productoId} onChange={e => actualizarItem(idx, 'productoId', e.target.value)}>
                                                            {productosOrigen.map(p => (
                                                                <option key={p.productoId} value={p.productoId}>{p.codigo} - {p.nombre}</option>
                                                            ))}
                                                        </select>
                                                    </td>
                                                    <td>
                                                        <input className="form-input" type="number" min={1} max={origen?.cantidad ?? 1} value={item.cantidad} onChange={e => actualizarItem(idx, 'cantidad', Number(e.target.value))} />
                                                    </td>
                                                    <td>
                                                        <input className="form-input" type="number" min={0} value={item.precioUnitario} onChange={e => actualizarItem(idx, 'precioUnitario', Number(e.target.value))} />
                                                    </td>
                                                    <td>
                                                        <input className="form-input" value={item.motivoItem} onChange={e => actualizarItem(idx, 'motivoItem', e.target.value)} placeholder="Opcional" />
                                                    </td>
                                                    <td>
                                                        <button type="button" className="icon-btn icon-btn-delete" onClick={() => quitarItem(idx)}>x</button>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        )}

                        <div className="stats-grid">
                            <div className="stat-card">
                                <span className="stat-card-label">Valor items</span>
                                <span className="stat-card-value" style={{ fontSize: '1.1rem' }}>{money(totalItems)}</span>
                            </div>
                            {origenTipo === 'ENTREGA' && origenSeleccionado && (
                                <div className="stat-card">
                                    <span className="stat-card-label">Mano de obra</span>
                                    <span className="stat-card-value" style={{ fontSize: '1.1rem' }}>{money((origenSeleccionado as OrdenServicio).manoObra ?? 0)}</span>
                                </div>
                            )}
                            <div className="stat-card">
                                <span className="stat-card-label">Límite disponible</span>
                                <span className="stat-card-value" style={{ fontSize: '1.1rem', color: '#0f172a', fontWeight: 700 }}>{money(limiteMaximo)}</span>
                            </div>
                        </div>

                        <div className="stats-grid">
                            <div className="form-group" style={{ gridColumn: 'span 2' }}>
                                <label className="form-label">Accion dinero</label>
                                <select className="form-input" value={accionDinero} disabled={tipo === 'GARANTIA'} onChange={e => setAccionDinero(e.target.value as 'REEMBOLSO' | 'SALDO_FAVOR' | 'SIN_REEMBOLSO')}>
                                    <option value="REEMBOLSO">Reembolso</option>
                                    <option value="SALDO_FAVOR">Saldo a favor</option>
                                    <option value="SIN_REEMBOLSO">Sin reembolso</option>
                                </select>
                            </div>
                            <div className="form-group">
                                <label className="form-label">Monto devuelto</label>
                                <input className="form-input" type="number" min={0} max={limiteMaximo} value={tipo === 'GARANTIA' ? 0 : montoDevuelto} disabled={tipo === 'GARANTIA'} onChange={e => setMontoDevuelto(Number(e.target.value))} />
                            </div>
                        </div>

                        <div className="form-group">
                            <label className="form-label">Notas internas</label>
                            <textarea className="form-input" value={notas} onChange={e => setNotas(e.target.value)} rows={2} />
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                            <button type="button" className="action-btn action-btn-ghost" onClick={resetForm}>Limpiar</button>
                            <button
                                type="submit"
                                className="action-btn action-btn-primary"
                                disabled={tieneDevolucionActiva || verificandoActiva}
                                title={tieneDevolucionActiva ? 'Este documento ya tiene una devolución activa' : undefined}
                            >
                                Registrar
                            </button>
                        </div>
                    </form>
                </div>
            </div>

            <div className="table-wrapper">
                {loading ? (
                    <div className="loading-state">Cargando registros...</div>
                ) : registros.length === 0 ? (
                    <div className="empty-state"><h3>Sin registros</h3><p>Aun no hay devoluciones o garantias.</p></div>
                ) : (
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th>Fecha</th>
                                <th>Tipo</th>
                                <th>Cliente</th>
                                <th>Origen</th>
                                <th>Razon</th>
                                <th>Monto</th>
                                <th>Estado</th>
                            </tr>
                        </thead>
                        <tbody>
                            {registros.map(r => (
                                <tr key={r.id}>
                                    <td>{new Date(r.fecha).toLocaleDateString('es-CO')}</td>
                                    <td><span className={`badge ${r.tipo === 'DEVOLUCION' ? 'badge-yellow' : 'badge-blue'}`}>{r.tipo}</span></td>
                                    <td>{r.clienteNombre ?? '-'}</td>
                                    <td>{r.venta ? `Venta ${r.venta.id.slice(0, 8).toUpperCase()}` : `Orden ${r.entrega?.id.slice(0, 8).toUpperCase()}`}</td>
                                    <td>{r.razon}</td>
                                    <td>{money(r.montoDevuelto)}</td>
                                    <td><span className={`badge ${r.estado === 'ANULADA' ? 'badge-red' : 'badge-green'}`}>{r.estado}</span></td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
    );
};

export default DevolucionesGarantias;
