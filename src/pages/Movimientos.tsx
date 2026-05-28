import React, { useState, useEffect } from 'react';
import { movimientoInventarioService } from '../services/movimientoInventarioService';
import { productoService } from '../services/productoService';
import { authService } from '../services/authService';
import type { MovimientoInventario, Producto } from '../types';
import RegistrarEntradaModal from '../components/RegistrarEntradaModal';

interface RegistrarSalidaModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSalidaRegistrada: () => void;
    productos: Producto[];
}

const RegistrarSalidaModal: React.FC<RegistrarSalidaModalProps> = ({
    isOpen, onClose, onSalidaRegistrada, productos
}) => {
    const [form, setForm] = useState({ productoId: '', cantidad: '', observacion: '' });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const prod = productos.find(p => p.id === form.productoId);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        try {
            await movimientoInventarioService.registrarSalida({
                productoId: form.productoId,
                cantidad: parseInt(form.cantidad),
                observacion: form.observacion
            });
            onSalidaRegistrada();
            onClose();
            setForm({ productoId: '', cantidad: '', observacion: '' });
        } catch (err: any) {
            const msg = err.response?.data;
            setError(typeof msg === 'string' ? msg : (msg?.message ?? 'Error al registrar la salida'));
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
            <div className="modal-box">
                <div className="modal-header">
                    <div className="modal-title">
                        <div className="modal-title-icon" style={{ background: '#fee2e2' }}>📤</div>
                        <div>
                            <h2>Registrar Salida</h2>
                            <p>Retira unidades del inventario</p>
                        </div>
                    </div>
                    <button className="modal-close" onClick={onClose}>✕</button>
                </div>
                <div className="modal-body">
                    {error && <div className="modal-error"><span>⚠️</span><span>{error}</span></div>}
                    <form onSubmit={handleSubmit} id="form-salida">
                        <div className="form-group">
                            <label className="form-label">Producto <span className="required">*</span></label>
                            <select className="form-select" required
                                value={form.productoId}
                                onChange={e => setForm({ ...form, productoId: e.target.value })}>
                                <option value="">Seleccionar producto...</option>
                                {productos.map(p => (
                                    <option key={p.id} value={p.id}>{p.codigo} — {p.nombre} (stock: {p.stock})</option>
                                ))}
                            </select>
                            {prod && (
                                <div className="info-badge" style={{ marginTop: '0.4rem' }}>
                                    <span>📦</span>
                                    <span>Stock actual: <strong>{prod.stock}</strong> unidades</span>
                                </div>
                            )}
                        </div>
                        <div className="form-group">
                            <label className="form-label">Cantidad <span className="required">*</span></label>
                            <input className="form-input" type="number" required min="1"
                                max={prod?.stock ?? 9999}
                                value={form.cantidad}
                                onChange={e => setForm({ ...form, cantidad: e.target.value })}
                                placeholder="0" />
                            {prod && form.cantidad && (
                                <span className="form-hint">
                                    Stock resultante: {prod.stock - parseInt(form.cantidad || '0')} unidades
                                </span>
                            )}
                        </div>
                        <div className="form-group">
                            <label className="form-label">Motivo / Observación</label>
                            <textarea className="form-textarea" rows={2}
                                value={form.observacion}
                                onChange={e => setForm({ ...form, observacion: e.target.value })}
                                placeholder="Ej: Uso en reparación, merma, ajuste de inventario..." />
                        </div>
                    </form>
                </div>
                <div className="modal-footer">
                    <button className="btn btn-secondary" onClick={onClose}>Cancelar</button>
                    <button className="btn btn-danger" type="submit" form="form-salida" disabled={loading}
                        style={{ background: '#ef4444', color: 'white' }}>
                        {loading ? '⏳ Registrando...' : '📤 Registrar Salida'}
                    </button>
                </div>
            </div>
        </div>
    );
};

// ─────────────────────────────────────────────
// PÁGINA PRINCIPAL
// ─────────────────────────────────────────────
const Movimientos: React.FC = () => {
    const [movimientos, setMovimientos] = useState<MovimientoInventario[]>([]);
    const [productos, setProductos] = useState<Producto[]>([]);
    const [loading, setLoading] = useState(true);
    const [filtroTipo, setFiltroTipo] = useState<'todos' | 'ENTRADA' | 'SALIDA'>('todos');
    const [busqueda, setBusqueda] = useState('');
    const [modalEntrada, setModalEntrada] = useState(false);
    const [modalSalida, setModalSalida] = useState(false);

    const user = authService.getUser();
    const esAdmin = user?.rol?.nombre === 'ADMIN';

    const cargar = async () => {
        try {
            setLoading(true);
            const [movRes, prodRes] = await Promise.all([
                movimientoInventarioService.getMovimientos(),
                productoService.getProductosActivos()
            ]);
            // Ordenar por fecha descendente
            const sorted = movRes.sort((a, b) =>
                new Date(b.fecha).getTime() - new Date(a.fecha).getTime()
            );
            setMovimientos(sorted);
            setProductos(prodRes);
        } catch (err) {
            console.error('Error:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { cargar(); }, []);

    const filtrados = movimientos.filter(m => {
        const matchTipo = filtroTipo === 'todos' || m.tipo === filtroTipo;
        const matchBusqueda = (m.producto?.nombre ?? '').toLowerCase().includes(busqueda.toLowerCase())
            || (m.proveedor?.nombre ?? '').toLowerCase().includes(busqueda.toLowerCase())
            || (m.observacion ?? '').toLowerCase().includes(busqueda.toLowerCase());
        return matchTipo && matchBusqueda;
    });

    const totalEntradas = movimientos.filter(m => m.tipo === 'ENTRADA').reduce((a, m) => a + m.cantidad, 0);
    const totalSalidas = movimientos.filter(m => m.tipo === 'SALIDA').reduce((a, m) => a + m.cantidad, 0);

    return (
        <div className="page-container">

            {/* HEADER */}
            <div className="page-header">
                <div className="page-header-left">
                    <h1 className="page-title">🔄 Movimientos de Inventario</h1>
                    <span className="page-subtitle">Historial de entradas y salidas de stock</span>
                </div>
                {esAdmin && (
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button className="action-btn action-btn-danger"
                            style={{ background: '#ef4444' }}
                            onClick={() => setModalSalida(true)}>
                            📤 Registrar Salida
                        </button>
                        <button className="action-btn action-btn-success" onClick={() => setModalEntrada(true)}>
                            📥 Registrar Entrada
                        </button>
                    </div>
                )}
            </div>

            {/* STATS */}
            <div className="stats-grid">
                <div className="stat-card">
                    <span className="stat-card-label">Total movimientos</span>
                    <span className="stat-card-value">{movimientos.length}</span>
                </div>
                <div className="stat-card">
                    <span className="stat-card-label">📥 Entradas</span>
                    <span className="stat-card-value" style={{ color: '#22c55e' }}>
                        {movimientos.filter(m => m.tipo === 'ENTRADA').length}
                    </span>
                    <span className="stat-card-sub">+{totalEntradas} unidades</span>
                </div>
                <div className="stat-card">
                    <span className="stat-card-label">📤 Salidas</span>
                    <span className="stat-card-value" style={{ color: '#ef4444' }}>
                        {movimientos.filter(m => m.tipo === 'SALIDA').length}
                    </span>
                    <span className="stat-card-sub">-{totalSalidas} unidades</span>
                </div>
                <div className="stat-card">
                    <span className="stat-card-label">Balance unidades</span>
                    <span className="stat-card-value" style={{ color: totalEntradas - totalSalidas >= 0 ? '#22c55e' : '#ef4444' }}>
                        {totalEntradas - totalSalidas >= 0 ? '+' : ''}{totalEntradas - totalSalidas}
                    </span>
                </div>
            </div>

            {/* TOOLBAR */}
            <div className="toolbar">
                <div className="toolbar-left">
                    <div className="search-bar">
                        <span>🔍</span>
                        <input type="text" placeholder="Buscar por producto, proveedor o nota..."
                            value={busqueda} onChange={e => setBusqueda(e.target.value)} />
                    </div>
                </div>
                <div className="toolbar-right">
                    {(['todos', 'ENTRADA', 'SALIDA'] as const).map(f => (
                        <button key={f} className="action-btn"
                            onClick={() => setFiltroTipo(f)}
                            style={{
                                background: filtroTipo === f ? '#3b82f6' : '#f1f5f9',
                                color: filtroTipo === f ? 'white' : '#475569',
                                border: filtroTipo === f ? 'none' : '1px solid #e2e8f0',
                            }}>
                            {f === 'todos' ? 'Todos' : f === 'ENTRADA' ? '📥 Entradas' : '📤 Salidas'}
                        </button>
                    ))}
                </div>
            </div>

            {/* TABLA */}
            <div className="table-wrapper">
                {loading ? (
                    <div className="loading-state">⏳ Cargando movimientos...</div>
                ) : filtrados.length === 0 ? (
                    <div className="empty-state">
                        <span className="empty-state-icon">🔄</span>
                        <h3>Sin movimientos</h3>
                        <p>No hay movimientos registrados con este filtro</p>
                    </div>
                ) : (
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th>Producto</th>
                                <th>Tipo</th>
                                <th>Cantidad</th>
                                <th>Proveedor / Motivo</th>
                                <th>Observación</th>
                                <th>Registrado por</th>
                                <th>Fecha</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filtrados.map(m => (
                                <tr key={m.id}>
                                    <td>
                                        <div style={{ fontWeight: '600', color: '#0f172a' }}>{m.producto?.nombre ?? '—'}</div>
                                        {m.producto && (
                                            <div style={{ fontSize: '0.72rem', color: '#94a3b8', fontFamily: 'monospace' }}>
                                                {(m.producto as any).codigo}
                                            </div>
                                        )}
                                    </td>
                                    <td>
                                        <span className={`badge ${m.tipo === 'ENTRADA' ? 'badge-green' : 'badge-red'}`}>
                                            {m.tipo === 'ENTRADA' ? '📥 Entrada' : '📤 Salida'}
                                        </span>
                                    </td>
                                    <td>
                                        <span style={{
                                            fontWeight: '800',
                                            fontSize: '1rem',
                                            color: m.tipo === 'ENTRADA' ? '#22c55e' : '#ef4444'
                                        }}>
                                            {m.tipo === 'ENTRADA' ? '+' : '-'}{m.cantidad}
                                        </span>
                                    </td>
                                    <td style={{ color: '#475569', fontSize: '0.85rem' }}>
                                        {m.proveedor?.nombre || <span style={{ color: '#cbd5e1' }}>—</span>}
                                    </td>
                                    <td style={{ color: '#64748b', fontSize: '0.82rem', maxWidth: '200px' }}>
                                        {m.observacion || <span style={{ color: '#cbd5e1' }}>—</span>}
                                    </td>
                                    <td style={{ color: '#64748b', fontSize: '0.82rem' }}>
                                        {m.usuario?.nombre ?? '—'}
                                    </td>
                                    <td style={{ color: '#94a3b8', fontSize: '0.8rem', whiteSpace: 'nowrap' }}>
                                        {new Date(m.fecha).toLocaleString('es-CO', {
                                            day: '2-digit', month: '2-digit', year: 'numeric',
                                            hour: '2-digit', minute: '2-digit'
                                        })}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>

            {/* MODALES */}
            <RegistrarEntradaModal
                isOpen={modalEntrada}
                onClose={() => setModalEntrada(false)}
                onEntradaRegistrada={cargar}
                productos={productos}
            />
            <RegistrarSalidaModal
                isOpen={modalSalida}
                onClose={() => setModalSalida(false)}
                onSalidaRegistrada={cargar}
                productos={productos}
            />
        </div>
    );
};

export default Movimientos;
