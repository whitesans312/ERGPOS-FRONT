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

const dateLabel = (value?: string) =>
    value ? new Date(value).toLocaleDateString('es-CO') : 'Sin fecha';

const ordenarPorFechaDesc = <T extends Record<string, any>>(lista: T[], campo: keyof T) =>
    [...lista].sort((a, b) => new Date(b[campo] ?? 0).getTime() - new Date(a[campo] ?? 0).getTime());

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
    const [busquedaOrigen, setBusquedaOrigen] = useState('');
    const [registrando, setRegistrando] = useState(false);

    const cargar = async () => {
        setLoading(true);
        setError('');
        try {
            const [regs, vs, es] = await Promise.all([
                devolucionGarantiaService.getAll(),
                ventaService.getVentas(),
                entregaService.getEntregas(),
            ]);
            setRegistros(ordenarPorFechaDesc(regs, 'fecha'));
            setVentas(ordenarPorFechaDesc(vs.filter((v: Venta) => v.estado === 'COMPLETADA'), 'fecha'));
            setEntregas(ordenarPorFechaDesc(es.filter((e: OrdenServicio) => e.estado === 'FINALIZADO'), 'fechaCreacion'));
        } catch {
            setError('No se pudo cargar la informacion de devoluciones y garantias');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { cargar(); }, []);

    const registrosActivos = useMemo(
        () => registros.filter(r => r.estado !== 'ANULADA'),
        [registros]
    );

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

    const cantidadesGestionadas = useMemo(() => {
        const map = new Map<string, number>();
        if (!origenId) return map;
        registrosActivos
            .filter(r => origenTipo === 'VENTA' ? r.venta?.id === origenId : r.entrega?.id === origenId)
            .forEach(r => {
                (r.items ?? []).forEach(item => {
                    const productoId = item.producto?.id;
                    if (!productoId) return;
                    map.set(productoId, (map.get(productoId) ?? 0) + Number(item.cantidad ?? 0));
                });
            });
        return map;
    }, [origenId, origenTipo, registrosActivos]);

    const productosConDisponibilidad = useMemo(() => {
        return productosOrigen.map(p => {
            const gestionado = cantidadesGestionadas.get(p.productoId) ?? 0;
            const disponible = Math.max(0, p.cantidad - gestionado);
            return {
                ...p,
                gestionado,
                disponible,
                bloqueado: disponible <= 0,
            };
        });
    }, [productosOrigen, cantidadesGestionadas]);

    const totalItems = items.reduce((s, i) => s + i.cantidad * i.precioUnitario, 0);

    const manoObraOrden = useMemo(() => {
        if (origenTipo === 'ENTREGA' && origenSeleccionado) {
            return (origenSeleccionado as OrdenServicio).manoObra ?? 0;
        }
        return 0;
    }, [origenTipo, origenSeleccionado]);

    const limiteMaximo = totalItems + manoObraOrden;

    const ventasFiltradas = useMemo(() => {
        const q = busquedaOrigen.trim().toLowerCase();
        if (!q) return ventas;
        return ventas.filter(v => [
            v.id,
            v.clienteNombre,
            v.clienteTelefono,
            v.cliente?.nombre,
            v.cliente?.telefono,
            v.cliente?.documento,
            dateLabel(v.fecha),
            String(v.total ?? ''),
        ].some(value => String(value ?? '').toLowerCase().includes(q)));
    }, [busquedaOrigen, ventas]);

    const entregasFiltradas = useMemo(() => {
        const q = busquedaOrigen.trim().toLowerCase();
        if (!q) return entregas;
        return entregas.filter(o => [
            o.id,
            o.clienteNombre,
            o.clienteTelefono,
            o.cliente?.nombre,
            dateLabel(o.fechaCreacion),
            String(o.totalOrden ?? ''),
        ].some(value => String(value ?? '').toLowerCase().includes(q)));
    }, [busquedaOrigen, entregas]);

    const resetForm = () => {
        setOrigenId('');
        setBusquedaOrigen('');
        setRazon('');
        setAccionDinero(tipo === 'GARANTIA' ? 'SIN_REEMBOLSO' : 'REEMBOLSO');
        setMontoDevuelto(0);
        setNotas('');
        setItems([]);
    };

    const handleOrigenChange = (id: string) => {
        setError('');
        setOrigenId(id);
        setItems([]);
        setMontoDevuelto(0);
    };

    const agregarItem = (productoId?: string) => {
        const disponible = productoId
            ? productosConDisponibilidad.find(p => p.productoId === productoId && p.disponible > 0 && !items.some(i => i.productoId === p.productoId))
            : productosConDisponibilidad.find(p => p.disponible > 0 && !items.some(i => i.productoId === p.productoId));
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
                const prod = productosConDisponibilidad.find(p => p.productoId === value);
                updated.precioUnitario = prod?.precioUnitario ?? 0;
                updated.cantidad = 1;
            }
            if (field === 'cantidad') {
                const prod = productosConDisponibilidad.find(p => p.productoId === item.productoId);
                const max = prod?.disponible ?? 1;
                updated.cantidad = Math.min(Math.max(Number(value) || 1, 1), max);
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
        if (registrando) return;
        setError('');
        setSuccess('');
        if (!origenId) { setError('Selecciona una venta u orden finalizada'); return; }
        if (!razon.trim()) { setError('La razon es obligatoria'); return; }
        // Permitir registro sin items si la orden tiene mano de obra
        if (items.length === 0 && manoObraOrden === 0) { setError('Agrega al menos un producto a devolver'); return; }
        const itemSinDisponible = items.find(item => {
            const prod = productosConDisponibilidad.find(p => p.productoId === item.productoId);
            return !prod || item.cantidad > prod.disponible;
        });
        if (itemSinDisponible) {
            const prod = productosConDisponibilidad.find(p => p.productoId === itemSinDisponible.productoId);
            setError(`La cantidad de ${prod?.nombre ?? 'un producto'} supera lo disponible. Disponible: ${prod?.disponible ?? 0}`);
            return;
        }
        if (tipo === 'DEVOLUCION' && montoDevuelto > limiteMaximo) {
            setError(manoObraOrden > 0
                ? 'El monto devuelto no puede superar el valor total (repuestos + mano de obra)'
                : 'El monto devuelto no puede superar el valor de los items'
            );
            return;
        }

        try {
            setRegistrando(true);
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
        } finally {
            setRegistrando(false);
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
                    <form onSubmit={handleSubmit} noValidate style={{ display: 'grid', gap: '1rem' }}>
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
                                <input
                                    className="form-input"
                                    value={busquedaOrigen}
                                    onChange={e => setBusquedaOrigen(e.target.value)}
                                    placeholder={origenTipo === 'VENTA'
                                        ? 'Buscar venta por documento, cliente, telefono o fecha...'
                                        : 'Buscar orden por cliente, telefono o fecha...'}
                                    style={{ marginBottom: '0.5rem' }}
                                />
                                <select className="form-input" value={origenId} onChange={e => handleOrigenChange(e.target.value)}>
                                    <option value="">Seleccionar...</option>
                                    {origenTipo === 'VENTA' ? ventasFiltradas.map(v => {
                                        const registrosDocumento = registrosActivos.filter(r => r.venta?.id === v.id);
                                        const tiposDocumento = [...new Set(registrosDocumento.map(r => r.tipo))].join('/');
                                        const todoGestionado = (v.items ?? []).length > 0 && (v.items ?? []).every(item => {
                                            const gestionado = registrosDocumento.reduce((total, registro) => {
                                                return total + (registro.items ?? [])
                                                    .filter(i => i.producto?.id === item.producto.id)
                                                    .reduce((s, i) => s + Number(i.cantidad ?? 0), 0);
                                            }, 0);
                                            return gestionado >= item.cantidad;
                                        });
                                        return (
                                            <option key={v.id} value={v.id} disabled={todoGestionado}>
                                                {dateLabel(v.fecha)} - {v.id.slice(0, 8).toUpperCase()} - {v.clienteNombre}
                                                {v.cliente?.documento ? ` - Doc: ${v.cliente.documento}` : ''}
                                                {v.clienteTelefono ? ` - Tel: ${v.clienteTelefono}` : ''}
                                                {' - '}{money(v.total)}
                                                {todoGestionado ? ' - Todo gestionado' : tiposDocumento ? ` - Parcial: ${tiposDocumento}` : ''}
                                            </option>
                                        );
                                    }) : entregasFiltradas.map(o => {
                                        const registrosDocumento = registrosActivos.filter(r => r.entrega?.id === o.id);
                                        const tiposDocumento = [...new Set(registrosDocumento.map(r => r.tipo))].join('/');
                                        const todoGestionado = (o.items ?? []).length > 0 && (o.items ?? []).every(item => {
                                            const gestionado = registrosDocumento.reduce((total, registro) => {
                                                return total + (registro.items ?? [])
                                                    .filter(i => i.producto?.id === item.producto.id)
                                                    .reduce((s, i) => s + Number(i.cantidad ?? 0), 0);
                                            }, 0);
                                            return gestionado >= item.cantidad;
                                        });
                                        return (
                                            <option key={o.id} value={o.id} disabled={todoGestionado && !((o.manoObra ?? 0) > 0)}>
                                                {dateLabel(o.fechaCreacion)} - {o.id.slice(0, 8).toUpperCase()} - {o.clienteNombre}
                                                {o.clienteTelefono ? ` - Tel: ${o.clienteTelefono}` : ''}
                                                {' - '}{money(o.totalOrden ?? 0)}
                                                {todoGestionado ? ' - Productos gestionados' : tiposDocumento ? ` - Parcial: ${tiposDocumento}` : ''}
                                            </option>
                                        );
                                    })}
                                </select>
                            </div>
                        </div>

                        {origenSeleccionado && (
                            <div style={{ border: '1px solid #dbeafe', background: '#eff6ff', borderRadius: '8px', overflow: 'hidden' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap', padding: '0.85rem 1rem', borderBottom: '1px solid #dbeafe' }}>
                                    <div>
                                        <div style={{ color: '#1d4ed8', fontSize: '0.72rem', fontWeight: 800, textTransform: 'uppercase' }}>
                                            {origenTipo === 'VENTA' ? 'Compra seleccionada' : 'Orden seleccionada'}
                                        </div>
                                        <div style={{ color: '#0f172a', fontWeight: 700, marginTop: '0.15rem' }}>
                                            {dateLabel(origenTipo === 'VENTA' ? (origenSeleccionado as Venta).fecha : (origenSeleccionado as OrdenServicio).fechaCreacion)}
                                            {' - '}{origenSeleccionado.id.slice(0, 8).toUpperCase()}
                                        </div>
                                        <div style={{ color: '#475569', fontSize: '0.86rem', marginTop: '0.2rem' }}>
                                            {origenTipo === 'VENTA'
                                                ? (origenSeleccionado as Venta).clienteNombre
                                                : (origenSeleccionado as OrdenServicio).clienteNombre}
                                            {' '}
                                            {(origenTipo === 'VENTA'
                                                ? (origenSeleccionado as Venta).clienteTelefono
                                                : (origenSeleccionado as OrdenServicio).clienteTelefono) || ''}
                                        </div>
                                    </div>
                                    <div style={{ textAlign: 'right' }}>
                                        <div style={{ color: '#64748b', fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase' }}>Total origen</div>
                                        <div style={{ color: '#0f172a', fontWeight: 800, fontSize: '1rem' }}>
                                            {money(origenTipo === 'VENTA'
                                                ? (origenSeleccionado as Venta).total
                                                : ((origenSeleccionado as OrdenServicio).totalOrden ?? 0))}
                                        </div>
                                    </div>
                                </div>

                                <div style={{ padding: '0.85rem 1rem', display: 'grid', gap: '0.55rem' }}>
                                    <div style={{ color: '#334155', fontSize: '0.78rem', fontWeight: 800, textTransform: 'uppercase' }}>
                                        Productos / repuestos del documento
                                    </div>
                                    {productosConDisponibilidad.length === 0 ? (
                                        <div style={{ color: '#64748b', fontSize: '0.88rem' }}>
                                            Este documento no tiene productos o repuestos asociados.
                                        </div>
                                    ) : productosConDisponibilidad.map(p => {
                                        const agregado = items.some(i => i.productoId === p.productoId);
                                        return (
                                            <div key={p.productoId} style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) auto', gap: '0.75rem', alignItems: 'center', background: p.bloqueado ? '#fef2f2' : '#eff6ff', border: `1px solid ${p.bloqueado ? '#fecaca' : '#bfdbfe'}`, borderRadius: '8px', padding: '0.65rem 0.75rem' }}>
                                                <div style={{ minWidth: 0 }}>
                                                    <div style={{ color: '#0f172a', fontWeight: 700, wordBreak: 'break-word' }}>
                                                        {p.codigo ? `${p.codigo} - ` : ''}{p.nombre}
                                                    </div>
                                                    <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', color: '#64748b', fontSize: '0.82rem', marginTop: '0.2rem' }}>
                                                        <span>Comprado: <strong>{p.cantidad}</strong></span>
                                                        <span style={{ color: p.gestionado > 0 ? '#b91c1c' : '#64748b' }}>Ya gestionado: <strong>{p.gestionado}</strong></span>
                                                        <span style={{ color: p.disponible > 0 ? '#1d4ed8' : '#b91c1c' }}>Disponible: <strong>{p.disponible}</strong></span>
                                                        <span>Precio: <strong>{money(p.precioUnitario)}</strong></span>
                                                        <span>Disponible en valor: <strong>{money(p.disponible * p.precioUnitario)}</strong></span>
                                                    </div>
                                                    {p.bloqueado && (
                                                        <div style={{ color: '#b91c1c', fontSize: '0.78rem', fontWeight: 700, marginTop: '0.25rem' }}>
                                                            Este producto ya fue devuelto o esta en garantia por la cantidad completa.
                                                        </div>
                                                    )}
                                                </div>
                                                <button
                                                    type="button"
                                                    className="action-btn action-btn-ghost"
                                                    onClick={() => agregarItem(p.productoId)}
                                                    disabled={agregado || p.bloqueado}
                                                >
                                                    {p.bloqueado ? 'No disponible' : agregado ? 'Agregado' : 'Agregar'}
                                                </button>
                                            </div>
                                        );
                                    })}
                                    {origenTipo === 'ENTREGA' && manoObraOrden > 0 && (
                                        <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '0.65rem 0.75rem', color: '#0f172a', fontWeight: 700 }}>
                                            Mano de obra / servicio: <span style={{ color: '#1d4ed8' }}>{money(manoObraOrden)}</span>
                                        </div>
                                    )}
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
                            <button type="button" className="action-btn action-btn-ghost" onClick={() => agregarItem()} disabled={!origenId || productosConDisponibilidad.filter(p => p.disponible > 0).length === items.length || productosConDisponibilidad.every(p => p.disponible <= 0)}>
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
                                            const origen = productosConDisponibilidad.find(p => p.productoId === item.productoId);
                                            return (
                                                <tr key={`${item.productoId}-${idx}`}>
                                                    <td>
                                                        <select className="form-input" value={item.productoId} onChange={e => actualizarItem(idx, 'productoId', e.target.value)}>
                                                            {productosConDisponibilidad.filter(p => p.disponible > 0 || p.productoId === item.productoId).map(p => (
                                                                <option key={p.productoId} value={p.productoId} disabled={p.disponible <= 0}>{p.codigo} - {p.nombre} ({p.disponible} disp.)</option>
                                                            ))}
                                                        </select>
                                                    </td>
                                                    <td>
                                                        <input className="form-input" type="number" min={1} max={origen?.disponible ?? 1} value={item.cantidad} onChange={e => actualizarItem(idx, 'cantidad', Number(e.target.value))} />
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

                        {error && <div className="dashboard-alert">{error}</div>}
                        {success && <div className="info-badge" style={{ color: '#15803d', background: '#f0fdf4', borderColor: '#bbf7d0' }}>{success}</div>}

                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                            <button type="button" className="action-btn action-btn-ghost" onClick={resetForm}>Limpiar</button>
                            <button
                                type="submit"
                                className="action-btn action-btn-primary"
                                disabled={registrando}
                            >
                                {registrando ? 'Registrando...' : 'Registrar'}
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
