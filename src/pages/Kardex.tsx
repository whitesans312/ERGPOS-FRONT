import { useState, useEffect } from 'react';
import { kardexService } from '../services/kardexService';
import { productoService } from '../services/productoService';
import type { Producto, KardexRow } from '../types';
import './Clientes.css';

const Kardex = () => {
    const [productos, setProductos] = useState<Producto[]>([]);
    const [productoId, setProductoId] = useState('');
    const [kardex, setKardex] = useState<KardexRow[]>([]);
    const [productoSel, setProductoSel] = useState<Producto | null>(null);
    const [loading, setLoading] = useState(false);
    const [busqueda, setBusqueda] = useState('');

    useEffect(() => {
        productoService.getProductosActivos().then(setProductos);
    }, []);

    const cargarKardex = async (id: string) => {
        setLoading(true);
        try {
            const data = await kardexService.getKardex(id);
            setKardex(data);
        } catch { setKardex([]); }
        finally { setLoading(false); }
    };

    const seleccionarProducto = (id: string) => {
        setProductoId(id);
        const p = productos.find(x => x.id === id);
        setProductoSel(p ?? null);
        if (id) cargarKardex(id);
        else setKardex([]);
    };

    const filtrados = busqueda.trim()
        ? productos.filter(p =>
            p.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
            p.codigo.toLowerCase().includes(busqueda.toLowerCase()))
        : productos;

    // Stats del kardex
    const totalEntradas = kardex.reduce((s, r) => s + (r.entrada ?? 0), 0);
    const totalSalidas = kardex.reduce((s, r) => s + (r.salida ?? 0), 0);
    const saldoActual = kardex.length > 0 ? kardex[kardex.length - 1].saldo : 0;

    return (
        <div className="page-container">
            <div className="page-header">
                <div>
                    <h1 className="page-title">Kardex de Inventario</h1>
                    <p className="page-subtitle">Historial de entradas, salidas y saldo por producto</p>
                </div>
            </div>

            {/* Selector de producto */}
            <div style={{
                background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12,
                padding: '1.25rem', marginBottom: '1.5rem',
                boxShadow: '0 1px 4px rgba(0,0,0,0.05)'
            }}>
                <div className="form-row" style={{ marginBottom: filtrados.length > 0 ? '0.75rem' : 0 }}>
                    <div className="form-group" style={{ flex: 2 }}>
                        <label style={{ fontSize: '0.85rem', fontWeight: 600, color: '#475569' }}>
                            Buscar producto
                        </label>
                        <input className="search-input"
                            placeholder="Nombre o código del producto..."
                            value={busqueda}
                            onChange={e => setBusqueda(e.target.value)} />
                    </div>
                    <div className="form-group" style={{ flex: 3 }}>
                        <label style={{ fontSize: '0.85rem', fontWeight: 600, color: '#475569' }}>
                            Seleccionar producto
                        </label>
                        <select
                            value={productoId}
                            onChange={e => seleccionarProducto(e.target.value)}
                            style={{
                                padding: '0.6rem 0.85rem', border: '1px solid #cbd5e1',
                                borderRadius: 8, fontSize: '0.9rem', width: '100%', background: '#fff'
                            }}>
                            <option value="">-- Selecciona un producto --</option>
                            {filtrados.map(p => (
                                <option key={p.id} value={p.id}>
                                    [{p.codigo}] {p.nombre} — Stock actual: {p.stock}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>
            </div>

            {/* Info producto seleccionado */}
            {productoSel && (
                <>
                    <div className="stats-row" style={{ marginBottom: '1.25rem' }}>
                        <div className="stat-card">
                            <span className="stat-number" style={{ color: '#1d4ed8' }}>{productoSel.codigo}</span>
                            <span className="stat-label">Código</span>
                        </div>
                        <div className="stat-card green">
                            <span className="stat-number">{totalEntradas}</span>
                            <span className="stat-label">Total entradas</span>
                        </div>
                        <div className="stat-card" style={{ borderLeft: '4px solid #ef4444' }}>
                            <span className="stat-number" style={{ color: '#ef4444' }}>{totalSalidas}</span>
                            <span className="stat-label">Total salidas</span>
                        </div>
                        <div className="stat-card" style={{ borderLeft: '4px solid #6366f1' }}>
                            <span className="stat-number" style={{ color: '#6366f1' }}>{saldoActual}</span>
                            <span className="stat-label">Saldo actual</span>
                        </div>
                        <div className="stat-card">
                            <span className="stat-number">{kardex.length}</span>
                            <span className="stat-label">Movimientos</span>
                        </div>
                    </div>

                    {/* Tabla kardex */}
                    {loading ? <div className="loading">Cargando kardex...</div> : (
                        <div className="table-wrapper">
                            <table className="data-table">
                                <thead>
                                    <tr>
                                        <th>Fecha</th>
                                        <th>Tipo</th>
                                        <th>Concepto</th>
                                        <th style={{ textAlign: 'right', color: '#16a34a' }}>Entrada</th>
                                        <th style={{ textAlign: 'right', color: '#dc2626' }}>Salida</th>
                                        <th style={{ textAlign: 'right', color: '#6366f1' }}>Saldo</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {kardex.length === 0 ? (
                                        <tr><td colSpan={6} className="empty-row">Sin movimientos registrados</td></tr>
                                    ) : kardex.map((row, i) => (
                                        <tr key={i}>
                                            <td style={{ whiteSpace: 'nowrap' }}>
                                                {new Date(row.fecha).toLocaleString('es-CO', {
                                                    dateStyle: 'short', timeStyle: 'short'
                                                })}
                                            </td>
                                            <td>
                                                <span className={`badge ${row.tipo === 'ENTRADA' ? 'badge-active' : ''}`}
                                                    style={row.tipo === 'SALIDA' ? { background: '#fee2e2', color: '#dc2626' } : {}}>
                                                    {row.tipo}
                                                </span>
                                            </td>
                                            <td style={{ color: '#64748b', fontSize: '0.85rem' }}>
                                                {row.concepto || '—'}
                                            </td>
                                            <td style={{ textAlign: 'right', fontWeight: 600, color: '#16a34a' }}>
                                                {row.entrada != null ? `+${row.entrada}` : '—'}
                                            </td>
                                            <td style={{ textAlign: 'right', fontWeight: 600, color: '#dc2626' }}>
                                                {row.salida != null ? `-${row.salida}` : '—'}
                                            </td>
                                            <td style={{
                                                textAlign: 'right', fontWeight: 700, color: '#6366f1',
                                                fontSize: '1rem'
                                            }}>
                                                {row.saldo}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </>
            )}

            {!productoSel && (
                <div style={{
                    textAlign: 'center', padding: '3rem',
                    color: '#94a3b8', fontSize: '1rem'
                }}>
                    📦 Selecciona un producto para ver su kardex
                </div>
            )}
        </div>
    );
};

export default Kardex;
