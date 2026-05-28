import React, { useState, useEffect } from 'react';
import api from '../services/api';

interface FinanzasData {
    utilidadNetaTotal: number;
    utilidadNetaHoy: number;
    utilidadNetaMes: number;
    totalVentasPOS: number;
    totalIngresosServicios: number;
    totalDevoluciones: number;
    totalCompras: number;
    ingresosMesVentas: number;
    ingresosMesServicios: number;
    devolucionesMes: number;
    comprasMes: number;
}

interface ReporteData {
    ventas: {
        total: number;
        completadas: number;
        ingresoTotal: number;
        ingresosHoy: number;
        ingresosMes: number;
    };
    finanzas: FinanzasData;
    entregas: {
        pendientes: number;
        enProceso: number;
        completadas: number;
        finalizadas: number;
    };
    inventario: {
        total: number;
        activos: number;
        stockBajo: number;
    };
    usuarios: {
        total: number;
        activos: number;
    };
    ultimasVentas: any[];
    ultimosMovimientos: any[];
    ventasPorDia: { fecha: string; total: number; count: number }[];
    productosMasVendidos: { producto: string; cantidad: number }[];
}


const Reportes: React.FC = () => {
    const [data, setData] = useState<ReporteData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    const getStartOfMonth = () => {
        const d = new Date();
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        return `${year}-${month}-01`;
    };

    const getToday = () => {
        const d = new Date();
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    };

    const [desde, setDesde] = useState(getStartOfMonth());
    const [hasta, setHasta] = useState(getToday());
    const [exporting, setExporting] = useState<string | null>(null);

    const exportar = async (tipo: 'ventasExcel' | 'ventasPdf' | 'inventarioExcel' | 'finanzasExcel') => {
        try {
            setExporting(tipo);
            let url = '';
            let filename = '';
            
            if (tipo === 'ventasExcel') {
                url = `/reportes/exportar/ventas/excel?desde=${desde}&hasta=${hasta}`;
                filename = `reporte-ventas-${desde}-a-${hasta}.xlsx`;
            } else if (tipo === 'ventasPdf') {
                url = `/reportes/exportar/ventas/pdf?desde=${desde}&hasta=${hasta}`;
                filename = `reporte-ventas-${desde}-a-${hasta}.pdf`;
            } else if (tipo === 'inventarioExcel') {
                url = `/reportes/exportar/inventario/excel`;
                filename = `reporte-inventario.xlsx`;
            } else if (tipo === 'finanzasExcel') {
                url = `/reportes/exportar/finanzas/excel?desde=${desde}&hasta=${hasta}`;
                filename = `reporte-finanzas-${desde}-a-${hasta}.xlsx`;
            }

            const res = await api.get(url, { responseType: 'blob' });
            const blob = new Blob([res.data], { type: String(res.headers['content-type'] ?? '') });
            const downloadUrl = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = downloadUrl;
            link.setAttribute('download', filename);
            document.body.appendChild(link);
            link.click();
            link.parentNode?.removeChild(link);
            window.URL.revokeObjectURL(downloadUrl);
        } catch (err) {
            console.error('Error al exportar reporte:', err);
            alert('Error al exportar el reporte. Por favor intente de nuevo.');
        } finally {
            setExporting(null);
        }
    };

    const cargar = async () => {
        try {
            setLoading(true);
            const res = await api.get('/reportes/dashboard');
            setData(res.data);
        } catch (_err) {
            setError('Error al cargar reportes');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { cargar(); }, []);

    const maxVenta = data ? Math.max(...data.ventasPorDia.map(d => d.total), 1) : 1;

    const formatCOP = (v: number) => `$${v.toLocaleString('es-CO')}`;

    if (loading) return (
        <div className="page-container">
            <div className="loading-state">⏳ Cargando reportes...</div>
        </div>
    );

    if (error || !data) return (
        <div className="page-container">
            <div className="empty-state">
                <span className="empty-state-icon">⚠️</span>
                <h3>Error al cargar</h3>
                <p>{error}</p>
                <button className="action-btn action-btn-primary" onClick={cargar} style={{ marginTop: '0.5rem' }}>
                    🔄 Reintentar
                </button>
            </div>
        </div>
    );

    return (
        <div className="page-container">

            {/* HEADER */}
            <div className="page-header">
                <div className="page-header-left">
                    <h1 className="page-title">📊 Reportes</h1>
                    <span className="page-subtitle">Estadísticas generales del sistema</span>
                </div>
                <button className="action-btn action-btn-ghost" onClick={cargar}>
                    🔄 Actualizar
                </button>
            </div>

            {/* PANEL DE EXPORTACIONES */}
            <div className="card" style={{ marginBottom: '1.5rem', borderLeft: '4px solid #0f172a' }}>
                <div className="card-body">
                    <h3 style={{ fontSize: '0.85rem', fontWeight: '700', color: '#475569', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        📥 Exportar Reportes y Documentación
                    </h3>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1.5rem', alignItems: 'flex-end' }}>
                        
                        {/* RANGO DE FECHAS */}
                        <div style={{ display: 'flex', gap: '1rem', flex: '1 1 300px' }}>
                            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                                <label style={{ fontSize: '0.75rem', fontWeight: '600', color: '#64748b' }}>Fecha Inicio</label>
                                <input
                                    type="date"
                                    value={desde}
                                    onChange={(e) => setDesde(e.target.value)}
                                    style={{
                                        padding: '0.5rem 0.75rem',
                                        border: '1px solid #cbd5e1',
                                        borderRadius: '0.375rem',
                                        fontSize: '0.85rem',
                                        color: '#0f172a',
                                        outline: 'none',
                                        transition: 'border-color 0.2s',
                                        width: '100%'
                                    }}
                                />
                            </div>
                            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                                <label style={{ fontSize: '0.75rem', fontWeight: '600', color: '#64748b' }}>Fecha Fin</label>
                                <input
                                    type="date"
                                    value={hasta}
                                    onChange={(e) => setHasta(e.target.value)}
                                    style={{
                                        padding: '0.5rem 0.75rem',
                                        border: '1px solid #cbd5e1',
                                        borderRadius: '0.375rem',
                                        fontSize: '0.85rem',
                                        color: '#0f172a',
                                        outline: 'none',
                                        transition: 'border-color 0.2s',
                                        width: '100%'
                                    }}
                                />
                            </div>
                        </div>

                        {/* BOTONES */}
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', flex: '2 1 400px' }}>
                            <button
                                className="action-btn"
                                onClick={() => exportar('ventasExcel')}
                                disabled={exporting !== null}
                                style={{
                                    backgroundColor: '#22c55e',
                                    color: 'white',
                                    border: 'none',
                                    padding: '0.5rem 1rem',
                                    borderRadius: '0.375rem',
                                    fontSize: '0.85rem',
                                    fontWeight: '600',
                                    cursor: exporting ? 'not-allowed' : 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.4rem',
                                    transition: 'opacity 0.2s'
                                }}
                            >
                                📊 {exporting === 'ventasExcel' ? 'Exportando...' : 'Ventas (Excel)'}
                            </button>

                            <button
                                className="action-btn"
                                onClick={() => exportar('ventasPdf')}
                                disabled={exporting !== null}
                                style={{
                                    backgroundColor: '#ef4444',
                                    color: 'white',
                                    border: 'none',
                                    padding: '0.5rem 1rem',
                                    borderRadius: '0.375rem',
                                    fontSize: '0.85rem',
                                    fontWeight: '600',
                                    cursor: exporting ? 'not-allowed' : 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.4rem',
                                    transition: 'opacity 0.2s'
                                }}
                            >
                                📄 {exporting === 'ventasPdf' ? 'Exportando...' : 'Ventas (PDF)'}
                            </button>

                            <button
                                className="action-btn"
                                onClick={() => exportar('finanzasExcel')}
                                disabled={exporting !== null}
                                style={{
                                    backgroundColor: '#3b82f6',
                                    color: 'white',
                                    border: 'none',
                                    padding: '0.5rem 1rem',
                                    borderRadius: '0.375rem',
                                    fontSize: '0.85rem',
                                    fontWeight: '600',
                                    cursor: exporting ? 'not-allowed' : 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.4rem',
                                    transition: 'opacity 0.2s'
                                }}
                            >
                                💹 {exporting === 'finanzasExcel' ? 'Exportando...' : 'Estado P&L (Excel)'}
                            </button>

                            <button
                                className="action-btn"
                                onClick={() => exportar('inventarioExcel')}
                                disabled={exporting !== null}
                                style={{
                                    backgroundColor: '#8b5cf6',
                                    color: 'white',
                                    border: 'none',
                                    padding: '0.5rem 1rem',
                                    borderRadius: '0.375rem',
                                    fontSize: '0.85rem',
                                    fontWeight: '600',
                                    cursor: exporting ? 'not-allowed' : 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.4rem',
                                    transition: 'opacity 0.2s'
                                }}
                            >
                                📦 {exporting === 'inventarioExcel' ? 'Exportando...' : 'Inventario (Excel)'}
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* KPIs VENTAS */}
            <div>
                <h2 style={{ fontSize: '0.75rem', fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '0.6rem' }}>
                    💰 Ventas
                </h2>
                <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))' }}>
                    <div className="stat-card">
                        <span className="stat-card-label">Ingresos totales</span>
                        <span className="stat-card-value" style={{ color: '#22c55e', fontSize: '1.1rem' }}>
                            {formatCOP(data.ventas.ingresoTotal)}
                        </span>
                    </div>
                    <div className="stat-card">
                        <span className="stat-card-label">Ingresos del mes</span>
                        <span className="stat-card-value" style={{ color: '#3b82f6', fontSize: '1.1rem' }}>
                            {formatCOP(data.ventas.ingresosMes)}
                        </span>
                    </div>
                    <div className="stat-card">
                        <span className="stat-card-label">Ingresos hoy</span>
                        <span className="stat-card-value" style={{ color: '#8b5cf6', fontSize: '1.1rem' }}>
                            {formatCOP(data.ventas.ingresosHoy)}
                        </span>
                    </div>
                    <div className="stat-card">
                        <span className="stat-card-label">Ventas completadas</span>
                        <span className="stat-card-value" style={{ color: '#22c55e' }}>
                            {data.ventas.completadas}
                            <span style={{ fontSize: '0.75rem', color: '#94a3b8', marginLeft: '4px' }}>/ {data.ventas.total}</span>
                        </span>
                    </div>
                </div>
            </div>

            {/* GRÁFICO VENTAS 7 DÍAS */}
            <div className="card">
                <div className="card-body">
                    <h3 style={{ fontSize: '0.85rem', fontWeight: '700', color: '#475569', marginBottom: '1rem' }}>
                        📈 Ventas — últimos 7 días
                    </h3>
                    <div style={{ display: 'flex', alignItems: 'flex-end', gap: '0.5rem', height: '120px' }}>
                        {data.ventasPorDia.map((dia, idx) => {
                            const altura = maxVenta > 0 ? Math.max((dia.total / maxVenta) * 100, dia.total > 0 ? 4 : 0) : 0;
                            const fecha = new Date(dia.fecha + 'T00:00:00');
                            const etiqueta = fecha.toLocaleDateString('es-CO', { weekday: 'short', day: 'numeric' });
                            return (
                                <div key={idx} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.3rem' }}>
                                    {dia.total > 0 && (
                                        <span style={{ fontSize: '0.6rem', color: '#64748b', fontWeight: '600' }}>
                                            {formatCOP(dia.total)}
                                        </span>
                                    )}
                                    <div style={{
                                        width: '100%',
                                        height: `${altura}%`,
                                        minHeight: dia.total > 0 ? '4px' : '0',
                                        background: idx === 6
                                            ? 'linear-gradient(180deg, #3b82f6, #1d4ed8)'
                                            : 'linear-gradient(180deg, #93c5fd, #bfdbfe)',
                                        borderRadius: '4px 4px 0 0',
                                        transition: 'height 0.3s',
                                    }} title={`${etiqueta}: ${formatCOP(dia.total)} (${dia.count} ventas)`} />
                                    <span style={{ fontSize: '0.62rem', color: '#94a3b8', textAlign: 'center', lineHeight: 1.2 }}>
                                        {etiqueta}
                                    </span>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* ── PANEL P&L: GANANCIAS Y PÉRDIDAS ── */}
            {data.finanzas && (
                <div>
                    <h2 style={{ fontSize: '0.75rem', fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '0.6rem' }}>
                        💹 Ganancias y Pérdidas (P&L)
                    </h2>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem' }}>

                        {/* UTILIDAD NETA TOTAL */}
                        <div className="card" style={{ borderLeft: `4px solid ${data.finanzas.utilidadNetaTotal >= 0 ? '#22c55e' : '#ef4444'}` }}>
                            <div className="card-body">
                                <div style={{ fontSize: '0.75rem', fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '0.5rem' }}>
                                    Utilidad Neta Total
                                </div>
                                <div style={{ fontSize: '1.8rem', fontWeight: '800', color: data.finanzas.utilidadNetaTotal >= 0 ? '#22c55e' : '#ef4444', marginBottom: '0.75rem' }}>
                                    {formatCOP(data.finanzas.utilidadNetaTotal)}
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem' }}>
                                        <span style={{ color: '#64748b' }}>📥 Ventas POS</span>
                                        <span style={{ fontWeight: '600', color: '#22c55e' }}>{formatCOP(data.finanzas.totalVentasPOS)}</span>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem' }}>
                                        <span style={{ color: '#64748b' }}>🔧 Mano de obra (servicios)</span>
                                        <span style={{ fontWeight: '600', color: '#22c55e' }}>{formatCOP(data.finanzas.totalIngresosServicios)}</span>
                                    </div>
                                    <div style={{ height: '1px', background: '#f1f5f9', margin: '0.2rem 0' }} />
                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem' }}>
                                        <span style={{ color: '#64748b' }}>🛒 Compras a proveedores</span>
                                        <span style={{ fontWeight: '600', color: '#ef4444' }}>−{formatCOP(data.finanzas.totalCompras)}</span>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem' }}>
                                        <span style={{ color: '#64748b' }}>↩ Devoluciones</span>
                                        <span style={{ fontWeight: '600', color: '#ef4444' }}>−{formatCOP(data.finanzas.totalDevoluciones)}</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* UTILIDAD DEL MES */}
                        <div className="card" style={{ borderLeft: `4px solid ${data.finanzas.utilidadNetaMes >= 0 ? '#3b82f6' : '#f97316'}` }}>
                            <div className="card-body">
                                <div style={{ fontSize: '0.75rem', fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '0.5rem' }}>
                                    Este mes
                                </div>
                                <div style={{ fontSize: '1.8rem', fontWeight: '800', color: data.finanzas.utilidadNetaMes >= 0 ? '#3b82f6' : '#f97316', marginBottom: '0.75rem' }}>
                                    {formatCOP(data.finanzas.utilidadNetaMes)}
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem' }}>
                                        <span style={{ color: '#64748b' }}>📥 Ventas del mes</span>
                                        <span style={{ fontWeight: '600', color: '#22c55e' }}>{formatCOP(data.finanzas.ingresosMesVentas)}</span>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem' }}>
                                        <span style={{ color: '#64748b' }}>🔧 Mano de obra del mes</span>
                                        <span style={{ fontWeight: '600', color: '#22c55e' }}>{formatCOP(data.finanzas.ingresosMesServicios)}</span>
                                    </div>
                                    <div style={{ height: '1px', background: '#f1f5f9', margin: '0.2rem 0' }} />
                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem' }}>
                                        <span style={{ color: '#64748b' }}>🛒 Compras del mes</span>
                                        <span style={{ fontWeight: '600', color: '#ef4444' }}>−{formatCOP(data.finanzas.comprasMes)}</span>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem' }}>
                                        <span style={{ color: '#64748b' }}>↩ Devoluciones del mes</span>
                                        <span style={{ fontWeight: '600', color: '#ef4444' }}>−{formatCOP(data.finanzas.devolucionesMes)}</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* UTILIDAD HOY */}
                        <div className="card" style={{ borderLeft: `4px solid #8b5cf6` }}>
                            <div className="card-body">
                                <div style={{ fontSize: '0.75rem', fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '0.5rem' }}>
                                    Hoy
                                </div>
                                <div style={{ fontSize: '1.8rem', fontWeight: '800', color: data.finanzas.utilidadNetaHoy >= 0 ? '#8b5cf6' : '#f97316', marginBottom: '0.75rem' }}>
                                    {formatCOP(data.finanzas.utilidadNetaHoy)}
                                </div>
                                <div style={{ fontSize: '0.8rem', color: '#64748b' }}>
                                    Utilidad neta del día de hoy considerando ventas, servicios, compras y devoluciones registradas.
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* ── TOP 5 PRODUCTOS MÁS VENDIDOS ── */}
            {data.productosMasVendidos && data.productosMasVendidos.length > 0 && (
                <div className="card">
                    <div className="card-body">
                        <h3 style={{ fontSize: '0.85rem', fontWeight: '700', color: '#475569', marginBottom: '1rem' }}>
                            🏆 Top 5 productos más vendidos
                        </h3>
                        {(() => {
                            const maxQty = Math.max(...data.productosMasVendidos.map(p => p.cantidad), 1);
                            const colors = ['#3b82f6', '#22c55e', '#f59e0b', '#8b5cf6', '#ef4444'];
                            return (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                    {data.productosMasVendidos.map((p, idx) => (
                                        <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                            <div style={{
                                                width: '22px', height: '22px', borderRadius: '50%',
                                                background: colors[idx] + '22', border: `2px solid ${colors[idx]}`,
                                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                fontSize: '0.65rem', fontWeight: '800', color: colors[idx], flexShrink: 0,
                                            }}>
                                                {idx + 1}
                                            </div>
                                            <div style={{ flex: 1, minWidth: 0 }}>
                                                <div style={{ fontSize: '0.82rem', fontWeight: '600', color: '#0f172a', marginBottom: '0.3rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                    {p.producto}
                                                </div>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                    <div style={{
                                                        flex: 1, height: '8px', background: '#f1f5f9', borderRadius: '4px', overflow: 'hidden',
                                                    }}>
                                                        <div style={{
                                                            width: `${(p.cantidad / maxQty) * 100}%`,
                                                            height: '100%',
                                                            background: `linear-gradient(90deg, ${colors[idx]}, ${colors[idx]}aa)`,
                                                            borderRadius: '4px',
                                                            transition: 'width 0.5s ease',
                                                        }} />
                                                    </div>
                                                    <span style={{ fontSize: '0.75rem', fontWeight: '700', color: colors[idx], flexShrink: 0 }}>
                                                        {p.cantidad} uds.
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            );
                        })()}
                    </div>
                </div>
            )}

            {/* GRID: ENTREGAS + INVENTARIO + USUARIOS */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem' }}>


                {/* ENTREGAS */}
                <div className="card">
                    <div className="card-body">
                        <h3 style={{ fontSize: '0.85rem', fontWeight: '700', color: '#475569', marginBottom: '0.75rem' }}>🚚 Entregas</h3>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                            {/* Cambio 7 — estados y colores corregidos */}
                            {[
                                { label: 'Pendientes', value: data.entregas.pendientes, color: '#f59e0b' },
                                { label: 'En proceso', value: data.entregas.enProceso, color: '#3b82f6' },
                                { label: 'Completadas', value: data.entregas.completadas, color: '#7c3aed' },
                                { label: 'Finalizadas', value: data.entregas.finalizadas, color: '#22c55e' },
                            ].map(item => (
                                <div key={item.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <span style={{ fontSize: '0.82rem', color: '#64748b' }}>{item.label}</span>
                                    <span style={{ fontWeight: '700', color: item.color, fontSize: '1rem' }}>{item.value}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* INVENTARIO */}
                <div className="card">
                    <div className="card-body">
                        <h3 style={{ fontSize: '0.85rem', fontWeight: '700', color: '#475569', marginBottom: '0.75rem' }}>📦 Inventario</h3>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                            {[
                                { label: 'Total productos', value: data.inventario.total, color: '#0f172a' },
                                { label: 'Activos', value: data.inventario.activos, color: '#22c55e' },
                                { label: 'Stock bajo / agotado', value: data.inventario.stockBajo, color: '#f59e0b' },
                            ].map(item => (
                                <div key={item.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <span style={{ fontSize: '0.82rem', color: '#64748b' }}>{item.label}</span>
                                    <span style={{ fontWeight: '700', color: item.color, fontSize: '1rem' }}>{item.value}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* USUARIOS */}
                <div className="card">
                    <div className="card-body">
                        <h3 style={{ fontSize: '0.85rem', fontWeight: '700', color: '#475569', marginBottom: '0.75rem' }}>👥 Usuarios</h3>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                            {[
                                { label: 'Total usuarios', value: data.usuarios.total, color: '#0f172a' },
                                { label: 'Activos', value: data.usuarios.activos, color: '#22c55e' },
                                { label: 'Inactivos', value: data.usuarios.total - data.usuarios.activos, color: '#ef4444' },
                            ].map(item => (
                                <div key={item.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <span style={{ fontSize: '0.82rem', color: '#64748b' }}>{item.label}</span>
                                    <span style={{ fontWeight: '700', color: item.color, fontSize: '1rem' }}>{item.value}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* ÚLTIMAS VENTAS */}
            {data.ultimasVentas.length > 0 && (
                <div>
                    <h2 style={{ fontSize: '0.75rem', fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '0.6rem' }}>
                        🕒 Últimas ventas
                    </h2>
                    <div className="table-wrapper">
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th>Cliente</th>
                                    <th>Total</th>
                                    <th>Estado</th>
                                    <th>Vendedor</th>
                                    <th>Fecha</th>
                                </tr>
                            </thead>
                            <tbody>
                                {data.ultimasVentas.map((v: any) => (
                                    <tr key={v.id}>
                                        <td style={{ fontWeight: '600', color: '#0f172a' }}>{v.clienteNombre}</td>
                                        <td style={{ fontWeight: '700', color: '#22c55e' }}>{formatCOP(v.total)}</td>
                                        <td>
                                            <span className={`badge ${v.estado === 'COMPLETADA' ? 'badge-green' : v.estado === 'CANCELADA' ? 'badge-red' : 'badge-yellow'}`}>
                                                {v.estado}
                                            </span>
                                        </td>
                                        <td style={{ color: '#64748b', fontSize: '0.82rem' }}>{v.vendedor?.nombre ?? '—'}</td>
                                        <td style={{ color: '#94a3b8', fontSize: '0.8rem' }}>
                                            {new Date(v.fecha).toLocaleString('es-CO', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* ÚLTIMOS MOVIMIENTOS */}
            {data.ultimosMovimientos.length > 0 && (
                <div>
                    <h2 style={{ fontSize: '0.75rem', fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '0.6rem' }}>
                        🔄 Últimos movimientos de inventario
                    </h2>
                    <div className="table-wrapper">
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th>Producto</th>
                                    <th>Tipo</th>
                                    <th>Cantidad</th>
                                    <th>Proveedor / Nota</th>
                                    <th>Fecha</th>
                                </tr>
                            </thead>
                            <tbody>
                                {data.ultimosMovimientos.map((m: any) => (
                                    <tr key={m.id}>
                                        <td style={{ fontWeight: '600', color: '#0f172a' }}>{m.producto?.nombre ?? '—'}</td>
                                        <td>
                                            <span className={`badge ${m.tipo === 'ENTRADA' ? 'badge-green' : 'badge-red'}`}>
                                                {m.tipo === 'ENTRADA' ? '📥 Entrada' : '📤 Salida'}
                                            </span>
                                        </td>
                                        <td style={{ fontWeight: '700', color: m.tipo === 'ENTRADA' ? '#22c55e' : '#ef4444' }}>
                                            {m.tipo === 'ENTRADA' ? '+' : '-'}{m.cantidad}
                                        </td>
                                        <td style={{ color: '#64748b', fontSize: '0.82rem' }}>
                                            {m.proveedor?.nombre || m.observacion || '—'}
                                        </td>
                                        <td style={{ color: '#94a3b8', fontSize: '0.8rem' }}>
                                            {new Date(m.fecha).toLocaleString('es-CO', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Reportes;
