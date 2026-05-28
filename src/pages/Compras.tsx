import { useState, useEffect } from 'react';
import { compraService } from '../services/compraService';
import { proveedorService } from '../services/proveedorService';
import { productoService } from '../services/productoService';
import { authService } from '../services/authService';
import type { Compra, Proveedor, Producto } from '../types';
import './Compras.css';

interface ItemCompra {
    productoId: string;
    productoNombre: string;
    cantidad: number;
    precioUnitario: number;
}

// ── Modal nueva compra ────────────────────────────────────────────────────────
const NuevaCompraModal = ({ onClose, onSaved }:
    { onClose: () => void; onSaved: () => void }) => {

    const [proveedores, setProveedores] = useState<Proveedor[]>([]);
    const [productos, setProductos] = useState<Producto[]>([]);
    const [proveedorId, setProveedorId] = useState('');
    const [numeroFactura, setNumeroFactura] = useState('');
    const [notas, setNotas] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const [items, setItems] = useState<ItemCompra[]>([
        { productoId: '', productoNombre: '', cantidad: 1, precioUnitario: 0 }
    ]);

    useEffect(() => {
        proveedorService.getProveedoresActivos().then(setProveedores);
        productoService.getProductosActivos().then(setProductos);
    }, []);

    const total = items.reduce((s, i) => s + (i.cantidad || 0) * (i.precioUnitario || 0), 0);

    const updateItem = (idx: number, field: keyof ItemCompra, value: string | number) => {
        const updated = [...items];
        if (field === 'productoId') {
            const prod = productos.find(p => p.id === value);
            updated[idx] = {
                ...updated[idx],
                productoId: value as string,
                productoNombre: prod?.nombre ?? '',
                precioUnitario: prod?.precio ?? updated[idx].precioUnitario,
            };
        } else {
            (updated[idx] as any)[field] = value;
        }
        setItems(updated);
    };

    const agregarFila = () => {
        setItems([...items, { productoId: '', productoNombre: '', cantidad: 1, precioUnitario: 0 }]);
    };

    const quitarFila = (idx: number) => {
        if (items.length === 1) {
            setItems([{ productoId: '', productoNombre: '', cantidad: 1, precioUnitario: 0 }]);
        } else {
            setItems(items.filter((_, i) => i !== idx));
        }
    };

    const handleSubmit = async () => {
        const itemsValidos = items.filter(i => i.productoId && i.cantidad > 0 && i.precioUnitario > 0);
        if (!proveedorId) { setError('Selecciona un proveedor'); return; }
        if (itemsValidos.length === 0) { setError('Agrega al menos un producto con cantidad y precio'); return; }
        setLoading(true); setError('');
        try {
            await compraService.crear({
                proveedor: { id: proveedorId } as any,
                numeroFactura: numeroFactura || undefined,
                notas: notas || undefined,
                items: itemsValidos.map(i => ({
                    producto: { id: i.productoId } as any,
                    cantidad: i.cantidad,
                    precioUnitario: i.precioUnitario,
                })) as any,
                estado: 'PENDIENTE',
            });
            onSaved(); onClose();
        } catch (err: any) {
            const msg = err.response?.data;
            setError(typeof msg === 'string' ? msg : (msg?.message ?? 'Error al crear la compra'));
        } finally { setLoading(false); }
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content modal-lg" onClick={e => e.stopPropagation()}>
                <div className="modal-header">
                    <h2>Nueva Compra</h2>
                    <button className="modal-close" onClick={onClose}>×</button>
                </div>

                <div className="modal-body">
                    {error && <div className="modal-error">{error}</div>}

                    <div className="form-row">
                        <div className="form-group">
                            <label>Proveedor *</label>
                            <select value={proveedorId} onChange={e => setProveedorId(e.target.value)}>
                                <option value="">-- Seleccionar proveedor --</option>
                                {proveedores.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
                            </select>
                        </div>
                        <div className="form-group">
                            <label>N° Factura proveedor</label>
                            <input value={numeroFactura} onChange={e => setNumeroFactura(e.target.value)}
                                placeholder="Ej: FEC-1504 (opcional)" />
                        </div>
                    </div>

                    <div className="compra-item-add">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                            <h4 style={{ margin: 0 }}>Productos de la compra</h4>
                            <button className="btn-primary" onClick={agregarFila}
                                style={{ fontSize: '0.82rem', padding: '0.35rem 0.9rem' }}>
                                + Agregar fila
                            </button>
                        </div>

                        <div className="items-table-wrap">
                            <table className="data-table" style={{ fontSize: '0.85rem' }}>
                                <thead>
                                    <tr>
                                        <th style={{ width: '45%' }}>Producto</th>
                                        <th style={{ textAlign: 'center', width: '15%' }}>Cantidad</th>
                                        <th style={{ textAlign: 'right', width: '20%' }}>Precio unit.</th>
                                        <th style={{ textAlign: 'right', width: '13%' }}>Subtotal</th>
                                        <th style={{ width: '7%' }}></th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {items.map((item, i) => (
                                        <tr key={i}>
                                            <td style={{ padding: '0.4rem 0.5rem' }}>
                                                <select
                                                    value={item.productoId}
                                                    onChange={e => updateItem(i, 'productoId', e.target.value)}
                                                    style={{
                                                        width: '100%', padding: '0.4rem 0.5rem',
                                                        border: '1px solid #cbd5e1', borderRadius: '6px',
                                                        fontSize: '0.83rem',
                                                        color: item.productoId ? '#1e293b' : '#94a3b8'
                                                    }}>
                                                    <option value="">-- Seleccionar --</option>
                                                    {productos.map(p => (
                                                        <option key={p.id} value={p.id}>
                                                            [{p.codigo}] {p.nombre} (stock: {p.stock})
                                                        </option>
                                                    ))}
                                                </select>
                                            </td>
                                            <td style={{ padding: '0.4rem 0.5rem', textAlign: 'center' }}>
                                                <input type="number" min={1} value={item.cantidad}
                                                    onChange={e => updateItem(i, 'cantidad', parseInt(e.target.value) || 1)}
                                                    onFocus={e => e.target.select()}
                                                    style={{ width: '70px', textAlign: 'center', border: '1px solid #cbd5e1', borderRadius: '6px', padding: '0.4rem', fontSize: '0.85rem' }} />
                                            </td>
                                            <td style={{ padding: '0.4rem 0.5rem', textAlign: 'right' }}>
                                                <input type="number" min={0} value={item.precioUnitario}
                                                    onChange={e => updateItem(i, 'precioUnitario', parseFloat(e.target.value) || 0)}
                                                    onFocus={e => e.target.select()}
                                                    style={{ width: '110px', textAlign: 'right', border: '1px solid #cbd5e1', borderRadius: '6px', padding: '0.4rem', fontSize: '0.85rem' }} />
                                            </td>
                                            <td style={{ padding: '0.4rem 0.5rem', textAlign: 'right', fontWeight: 600, color: '#166534' }}>
                                                {item.productoId
                                                    ? '$' + (item.cantidad * item.precioUnitario).toLocaleString('es-CO')
                                                    : '—'}
                                            </td>
                                            <td style={{ padding: '0.4rem 0.5rem', textAlign: 'center' }}>
                                                <button onClick={() => quitarFila(i)} title="Quitar fila"
                                                    style={{ background: 'none', border: '1px solid #fecaca', borderRadius: '6px', padding: '0.3rem 0.5rem', cursor: 'pointer', fontSize: '0.85rem', color: '#dc2626' }}>
                                                    🗑️
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                    <tr style={{ borderTop: '2px solid #e2e8f0', background: '#f8fafc' }}>
                                        <td colSpan={3} style={{ textAlign: 'right', fontWeight: 700, padding: '0.65rem 0.75rem', color: '#475569' }}>TOTAL:</td>
                                        <td style={{ textAlign: 'right', fontWeight: 800, color: '#166534', fontSize: '1rem', padding: '0.65rem 0.5rem' }}>
                                            ${total.toLocaleString('es-CO')}
                                        </td>
                                        <td></td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </div>

                    <div className="form-group">
                        <label>Notas</label>
                        <textarea value={notas} onChange={e => setNotas(e.target.value)}
                            rows={2} placeholder="Observaciones de la compra..." />
                    </div>
                </div>

                <div className="modal-footer">
                    <button className="btn-secondary" onClick={onClose}>Cancelar</button>
                    <button className="btn-primary" onClick={handleSubmit} disabled={loading}>
                        {loading ? 'Guardando...' : 'Crear compra'}
                    </button>
                </div>
            </div>
        </div>
    );
};

// ── Página principal ──────────────────────────────────────────────────────────
const Compras = () => {
    const [compras, setCompras] = useState<Compra[]>([]);
    const [loading, setLoading] = useState(true);
    const [modalOpen, setModalOpen] = useState(false);
    const user = authService.getUser();

    const cargar = async () => {
        setLoading(true);
        try {
            setCompras(await compraService.getCompras());
        } catch { console.error('Error cargando compras'); }
        finally { setLoading(false); }
    };

    useEffect(() => { cargar(); }, []);

    const confirmar = async (c: Compra) => {
        if (!confirm(`¿Confirmar compra a "${c.proveedor.nombre}"?\nEsto ingresará el stock al inventario.`)) return;
        if (!user) { alert('No hay sesión activa'); return; }
        try { await compraService.confirmar(c.id, user.id); cargar(); }
        catch (err: any) { alert(err.response?.data ?? 'Error al confirmar'); }
    };

    const cancelar = async (c: Compra) => {
        if (!confirm(`¿Cancelar la compra a "${c.proveedor.nombre}"?`)) return;
        try { await compraService.cancelar(c.id); cargar(); }
        catch (err: any) { alert(err.response?.data ?? 'Error al cancelar'); }
    };

    const estadoColor: Record<string, string> = {
        PENDIENTE: 'badge-warning',
        CONFIRMADA: 'badge-active',
        CANCELADA: 'badge-inactive',
    };

    const totalInvertido = compras
        .filter(c => c.estado === 'CONFIRMADA')
        .reduce((s, c) => s + c.total, 0);

    return (
        <div className="page-container">
            <div className="page-header">
                <div>
                    <h1 className="page-title">Compras</h1>
                    <p className="page-subtitle">Registro de compras y facturación de proveedores</p>
                </div>
                <button className="btn-primary" onClick={() => setModalOpen(true)}>+ Nueva Compra</button>
            </div>

            <div className="stats-row">
                <div className="stat-card">
                    <span className="stat-number">{compras.length}</span>
                    <span className="stat-label">Total</span>
                </div>
                <div className="stat-card green">
                    <span className="stat-number">{compras.filter(c => c.estado === 'CONFIRMADA').length}</span>
                    <span className="stat-label">Confirmadas</span>
                </div>
                <div className="stat-card">
                    <span className="stat-number" style={{ fontSize: '1.2rem' }}>
                        ${totalInvertido.toLocaleString('es-CO')}
                    </span>
                    <span className="stat-label">Total invertido</span>
                </div>
            </div>

            {loading ? <div className="loading">Cargando compras...</div> : (
                <div className="table-wrapper">
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th>Proveedor</th>
                                <th>N° Factura</th>
                                <th>Productos</th>
                                <th>Total</th>
                                <th>Fecha</th>
                                <th>Estado</th>
                                <th>Acciones</th>
                            </tr>
                        </thead>
                        <tbody>
                            {compras.length === 0 ? (
                                <tr><td colSpan={7} className="empty-row">No hay compras registradas</td></tr>
                            ) : compras.map(c => (
                                <tr key={c.id}>
                                    <td><div className="cliente-nombre">{c.proveedor?.nombre}</div></td>
                                    <td>{c.numeroFactura ?? '—'}</td>
                                    <td style={{ color: '#64748b', fontSize: '0.82rem' }}>
                                        {c.items && c.items.length > 0
                                            ? c.items.map(i => `${(i.producto as any)?.nombre ?? 'Producto'} x${i.cantidad}`).join(', ')
                                            : `${c.items?.length ?? 0} productos`}
                                    </td>
                                    <td style={{ fontWeight: 700 }}>${c.total.toLocaleString('es-CO')}</td>
                                    <td>{new Date(c.fecha).toLocaleDateString('es-CO')}</td>
                                    <td>
                                        <span className={`badge ${estadoColor[c.estado] ?? ''}`}>{c.estado}</span>
                                    </td>
                                    <td>
                                        <div className="action-buttons">
                                            {c.estado === 'PENDIENTE' && <>
                                                <button className="btn-icon" onClick={() => confirmar(c)}
                                                    title="Confirmar e ingresar stock"
                                                    style={{ background: '#dcfce7', border: '1px solid #86efac' }}>
                                                    ✅ Confirmar
                                                </button>
                                                <button className="btn-icon" onClick={() => cancelar(c)}
                                                    title="Cancelar"
                                                    style={{ background: '#fee2e2', border: '1px solid #fca5a5' }}>
                                                    🚫
                                                </button>
                                            </>}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {modalOpen && <NuevaCompraModal onClose={() => setModalOpen(false)} onSaved={cargar} />}
        </div>
    );
};

export default Compras;