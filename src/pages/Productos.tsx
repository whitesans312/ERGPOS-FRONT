import React, { useState, useEffect } from 'react';
import { productoService } from '../services/productoService';
import { authService } from '../services/authService';
import type { Producto } from '../types';
import CrearProductoModal from '../components/CrearProductoModal';
import EditarProductoModal from '../components/EditarProductoModal';
import RegistrarEntradaModal from '../components/RegistrarEntradaModal';
import ActionMenu from '../components/ActionMenu';

const Productos: React.FC = () => {
    const [productos, setProductos] = useState<Producto[]>([]);
    const [loading, setLoading] = useState(true);
    const [busqueda, setBusqueda] = useState('');
    const [filtroEstado, setFiltroEstado] = useState<'todos' | 'activos' | 'inactivos'>('activos');
    const [filtroStock, setFiltroStock] = useState(false);

    const [modalCrear, setModalCrear] = useState(false);
    const [modalEditar, setModalEditar] = useState(false);
    const [modalEntrada, setModalEntrada] = useState(false);
    const [productoSeleccionado, setProductoSeleccionado] = useState<Producto | null>(null);

    const user = authService.getUser();
    const esAdmin = user?.rol?.nombre === 'ADMIN';

    const cargarProductos = async () => {
        try {
            setLoading(true);
            const data = await productoService.getProductos();
            setProductos(data);
        } catch (err) {
            console.error('Error cargando productos:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { cargarProductos(); }, []);

    const handleToggleActivo = async (p: Producto) => {
        try {
            await productoService.setProductoActivo(p.id, !p.activo);
            cargarProductos();
        } catch (err) {
            console.error('Error al cambiar estado:', err);
        }
    };

    // Cambio 14 — eliminado (p as any).stockMinimo, ahora p.stockMinimo directo
    const getStockBadge = (stock: number, minimo: number = 5) => {
        if (stock === 0) return { clase: 'badge-red', label: 'Sin stock' };
        if (stock <= minimo) return { clase: 'badge-yellow', label: 'Stock bajo' };
        return { clase: 'badge-green', label: 'OK' };
    };

    // Cambio 14 — eliminados todos los (p as any).categoria y (p as any).stockMinimo
    const productosFiltrados = productos.filter(p => {
        const categoriaNombre = p.categoria?.nombre ?? '';
        const matchBusqueda = p.nombre.toLowerCase().includes(busqueda.toLowerCase())
            || p.codigo.toLowerCase().includes(busqueda.toLowerCase())
            || categoriaNombre.toLowerCase().includes(busqueda.toLowerCase());
        const matchEstado = filtroEstado === 'todos' ? true : filtroEstado === 'activos' ? p.activo : !p.activo;
        const matchStock = filtroStock ? p.stock <= (p.stockMinimo ?? 5) : true;
        return matchBusqueda && matchEstado && matchStock;
    });

    const totalActivos = productos.filter(p => p.activo).length;
    const stockBajo = productos.filter(p => p.stock <= (p.stockMinimo ?? 5) && p.activo).length;
    const sinStock = productos.filter(p => p.stock === 0).length;

    return (
        <div className="page-container">

            {/* HEADER */}
            <div className="page-header">
                <div className="page-header-left">
                    <h1 className="page-title">📦 Productos</h1>
                    <span className="page-subtitle">Control de inventario y stock</span>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                    {(esAdmin) && (
                        <button className="action-btn action-btn-success" onClick={() => setModalEntrada(true)}>
                            📥 Registrar Entrada
                        </button>
                    )}
                    {esAdmin && (
                        <button className="action-btn action-btn-primary" onClick={() => setModalCrear(true)}>
                            + Nuevo Producto
                        </button>
                    )}
                </div>
            </div>

            {/* STATS */}
            <div className="stats-grid">
                <div className="stat-card">
                    <span className="stat-card-label">Total productos</span>
                    <span className="stat-card-value">{productos.length}</span>
                </div>
                <div className="stat-card">
                    <span className="stat-card-label">Activos</span>
                    <span className="stat-card-value" style={{ color: '#22c55e' }}>{totalActivos}</span>
                </div>
                <div className="stat-card">
                    <span className="stat-card-label">Stock bajo</span>
                    <span className="stat-card-value" style={{ color: '#f59e0b' }}>{stockBajo}</span>
                    <span className="stat-card-sub">≤ stock mínimo</span>
                </div>
                <div className="stat-card">
                    <span className="stat-card-label">Sin stock</span>
                    <span className="stat-card-value" style={{ color: '#ef4444' }}>{sinStock}</span>
                </div>
            </div>

            {/* ALERTA STOCK BAJO */}
            {stockBajo > 0 && (
                <div style={{
                    background: '#fffbeb',
                    border: '1px solid #fde68a',
                    borderRadius: '12px',
                    padding: '0.85rem 1.1rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.6rem',
                    fontSize: '0.85rem',
                    color: '#92400e',
                }}>
                    <span>⚠️</span>
                    <span><strong>{stockBajo} producto{stockBajo > 1 ? 's' : ''}</strong> {stockBajo > 1 ? 'tienen' : 'tiene'} stock bajo o agotado.</span>
                    <button
                        onClick={() => setFiltroStock(!filtroStock)}
                        style={{
                            marginLeft: 'auto',
                            background: filtroStock ? '#f59e0b' : '#fef3c7',
                            color: filtroStock ? 'white' : '#92400e',
                            border: '1px solid #fde68a',
                            borderRadius: '6px',
                            padding: '0.25rem 0.6rem',
                            fontSize: '0.75rem',
                            fontWeight: '600',
                            cursor: 'pointer',
                        }}
                    >
                        {filtroStock ? 'Ver todos' : 'Ver críticos'}
                    </button>
                </div>
            )}

            {/* TOOLBAR */}
            <div className="toolbar">
                <div className="toolbar-left">
                    <div className="search-bar">
                        <span>🔍</span>
                        <input
                            type="text"
                            placeholder="Buscar por nombre, código o categoría..."
                            value={busqueda}
                            onChange={e => setBusqueda(e.target.value)}
                        />
                    </div>
                </div>
                <div className="toolbar-right">
                    {(['activos', 'todos', 'inactivos'] as const).map(f => (
                        <button
                            key={f}
                            className="action-btn"
                            onClick={() => setFiltroEstado(f)}
                            style={{
                                background: filtroEstado === f ? '#3b82f6' : '#f1f5f9',
                                color: filtroEstado === f ? 'white' : '#475569',
                                border: filtroEstado === f ? 'none' : '1px solid #e2e8f0',
                            }}
                        >
                            {f.charAt(0).toUpperCase() + f.slice(1)}
                        </button>
                    ))}
                </div>
            </div>

            {/* TABLA */}
            <div className="table-wrapper">
                {loading ? (
                    <div className="loading-state">⏳ Cargando productos...</div>
                ) : productosFiltrados.length === 0 ? (
                    <div className="empty-state">
                        <span className="empty-state-icon">📦</span>
                        <h3>Sin resultados</h3>
                        <p>No se encontraron productos con ese criterio</p>
                    </div>
                ) : (
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th>Código</th>
                                <th>Nombre</th>
                                <th>Categoría</th>
                                <th>Precio</th>
                                <th>Stock</th>
                                <th>Estado</th>
                                {esAdmin && <th>Acciones</th>}
                            </tr>
                        </thead>
                        <tbody>
                            {productosFiltrados.map(p => {
                                // Cambio 14 — p.stockMinimo directo, sin as any
                                const stockInfo = getStockBadge(p.stock, p.stockMinimo);
                                return (
                                    <tr key={p.id}>
                                        <td>
                                            <span style={{
                                                fontFamily: 'monospace',
                                                fontSize: '0.82rem',
                                                background: '#f1f5f9',
                                                padding: '0.2rem 0.5rem',
                                                borderRadius: '6px',
                                                color: '#475569',
                                                fontWeight: '600'
                                            }}>
                                                {p.codigo}
                                            </span>
                                        </td>
                                        <td style={{ fontWeight: '600', color: '#0f172a' }}>{p.nombre}</td>
                                        <td style={{ color: '#64748b' }}>
                                            {p.categoria?.nombre ? (
                                                <span className="badge badge-blue">{p.categoria.nombre}</span>
                                            ) : '—'}
                                        </td>
                                        <td style={{ fontWeight: '700', color: '#0f172a' }}>
                                            ${p.precio.toLocaleString('es-CO')}
                                        </td>
                                        <td>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                {/* Cambio 14 — p.stockMinimo directo */}
                                                <span style={{
                                                    fontSize: '1rem',
                                                    fontWeight: '800',
                                                    color: p.stock === 0 ? '#ef4444' : p.stock <= (p.stockMinimo ?? 5) ? '#f59e0b' : '#22c55e'
                                                }}>
                                                    {p.stock}
                                                </span>
                                                <span className={`badge ${stockInfo.clase}`}>{stockInfo.label}</span>
                                            </div>
                                        </td>
                                        <td>
                                            <span className={`badge ${p.activo ? 'badge-green' : 'badge-gray'}`}>
                                                {p.activo ? '● Activo' : '○ Inactivo'}
                                            </span>
                                        </td>
                                        {esAdmin && (
                                            <td>
                                                <ActionMenu items={[
                                                    {
                                                        label: 'Editar producto',
                                                        icon: '✏️',
                                                        onClick: () => { setProductoSeleccionado(p); setModalEditar(true); },
                                                    },
                                                    {
                                                        label: p.activo ? 'Desactivar' : 'Activar',
                                                        icon: p.activo ? '🔴' : '🟢',
                                                        variant: p.activo ? 'danger' : 'success',
                                                        onClick: () => handleToggleActivo(p),
                                                    },
                                                ]} />
                                            </td>
                                        )}
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                )}
            </div>

            {/* MODALES */}
            <CrearProductoModal
                isOpen={modalCrear}
                onClose={() => setModalCrear(false)}
                onProductoCreado={cargarProductos}
            />
            <EditarProductoModal
                isOpen={modalEditar}
                onClose={() => { setModalEditar(false); setProductoSeleccionado(null); }}
                onProductoActualizado={cargarProductos}
                producto={productoSeleccionado}
            />
            <RegistrarEntradaModal
                isOpen={modalEntrada}
                onClose={() => setModalEntrada(false)}
                onEntradaRegistrada={cargarProductos}
                productos={productos.filter(p => p.activo)}
            />
        </div>
    );
};

export default Productos;