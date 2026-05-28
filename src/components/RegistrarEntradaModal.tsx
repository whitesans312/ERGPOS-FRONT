import React, { useState, useEffect } from 'react';
import { movimientoInventarioService } from '../services/movimientoInventarioService';
import { proveedorService } from '../services/proveedorService';
import { authService } from '../services/authService';
import type { Producto, Proveedor } from '../types';
import './Modal.css';

interface RegistrarEntradaModalProps {
    isOpen: boolean;
    onClose: () => void;
    onEntradaRegistrada: () => void;
    productos: Producto[];
}

type ModoProveedor = 'seleccionar' | 'crear';

const RegistrarEntradaModal: React.FC<RegistrarEntradaModalProps> = ({
    isOpen, onClose, onEntradaRegistrada, productos,
}) => {
    const user = authService.getUser();

    // ── Campos del movimiento ──────────────────────────────────────────────────
    const [productoId, setProductoId]   = useState('');
    const [cantidad, setCantidad]       = useState('');
    const [observacion, setObservacion] = useState('');
    const [loading, setLoading]         = useState(false);
    const [error, setError]             = useState('');

    // ── Proveedor ──────────────────────────────────────────────────────────────
    const [modoProveedor, setModoProveedor] = useState<ModoProveedor>('seleccionar');
    const [proveedores, setProveedores]     = useState<Proveedor[]>([]);
    const [proveedorId, setProveedorId]     = useState('');
    const [busquedaProv, setBusquedaProv]   = useState('');
    const [loadingProv, setLoadingProv]     = useState(false);

    // Campos para crear proveedor rápido
    const [nuevoNombre, setNuevoNombre]   = useState('');
    const [nuevoNit, setNuevoNit]         = useState('');
    const [nuevoTelefono, setNuevoTelefono] = useState('');
    const [nuevoCiudad, setNuevoCiudad]   = useState('Cali');
    const [loadingCrear, setLoadingCrear] = useState(false);
    const [errorCrear, setErrorCrear]     = useState('');
    const [provCreado, setProvCreado]     = useState<Proveedor | null>(null);

    // ── Cargar proveedores al abrir ────────────────────────────────────────────
    useEffect(() => {
        if (!isOpen) return;
        setLoadingProv(true);
        proveedorService.getProveedoresActivos()
            .then((data: Proveedor[]) => setProveedores(data))
            .catch(() => {})
            .finally(() => setLoadingProv(false));
    }, [isOpen]);

    // Filtro de búsqueda de proveedor
    const proveedoresFiltrados = busquedaProv.trim()
        ? proveedores.filter(p =>
            p.nombre.toLowerCase().includes(busquedaProv.toLowerCase()) ||
            (p.nit ?? '').includes(busquedaProv) ||
            (p.telefono ?? '').includes(busquedaProv))
        : proveedores;

    const productoSel = productos.find(p => p.id === productoId);

    // ── Crear proveedor rápido ─────────────────────────────────────────────────
    const handleCrearProveedor = async () => {
        if (!nuevoNombre.trim()) { setErrorCrear('El nombre es obligatorio'); return; }
        setLoadingCrear(true); setErrorCrear('');
        try {
            const creado: Proveedor = await proveedorService.crear({
                nombre: nuevoNombre.trim(),
                nit: nuevoNit || undefined,
                telefono: nuevoTelefono || undefined,
                ciudad: nuevoCiudad || 'Cali',
                activo: true,
            } as any);
            setProveedores(prev => [creado, ...prev]);
            setProveedorId(creado.id);
            setProvCreado(creado);
            setModoProveedor('seleccionar');
            setNuevoNombre(''); setNuevoNit(''); setNuevoTelefono(''); setNuevoCiudad('Cali');
        } catch (e: any) {
            setErrorCrear(e.response?.data || 'Error al crear el proveedor');
        } finally {
            setLoadingCrear(false);
        }
    };

    // ── Registrar entrada ──────────────────────────────────────────────────────
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!productoId) { setError('Selecciona un producto'); return; }
        if (!cantidad || parseInt(cantidad) < 1) { setError('La cantidad debe ser al menos 1'); return; }

        setLoading(true); setError('');
        try {
            await movimientoInventarioService.registrarEntrada({
                productoId,
                cantidad: parseInt(cantidad),
                proveedorId: proveedorId || undefined,
                observacion: observacion || undefined,
                usuarioId: user?.id,
            });
            onEntradaRegistrada();
            handleReset();
            onClose();
        } catch (err: any) {
            setError(err.response?.data || 'Error al registrar la entrada');
        } finally {
            setLoading(false);
        }
    };

    const handleReset = () => {
        setProductoId(''); setCantidad(''); setObservacion(''); setError('');
        setProveedorId(''); setBusquedaProv(''); setModoProveedor('seleccionar');
        setProvCreado(null);
    };

    const handleClose = () => { handleReset(); onClose(); };

    if (!isOpen) return null;

    return (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && handleClose()}>
            <div className="modal-box" style={{ maxWidth: '520px' }}>

                {/* HEADER */}
                <div className="modal-header">
                    <div className="modal-title">
                        <div className="modal-title-icon green">📥</div>
                        <div>
                            <h2>Registrar Entrada</h2>
                            <p>Ingresa nuevas unidades al inventario</p>
                        </div>
                    </div>
                    <button className="modal-close" onClick={handleClose}>✕</button>
                </div>

                {/* BODY */}
                <div className="modal-body">
                    {error && (
                        <div className="modal-error">
                            <span>⚠️</span><span>{error}</span>
                        </div>
                    )}

                    <form onSubmit={handleSubmit} id="form-entrada">

                        {/* ── Producto ── */}
                        <div className="form-group">
                            <label className="form-label" htmlFor="re-productoId">
                                Producto <span className="required">*</span>
                            </label>
                            <select id="re-productoId" className="form-select"
                                value={productoId} onChange={e => setProductoId(e.target.value)} required>
                                <option value="">Seleccionar producto...</option>
                                {productos.map(p => (
                                    <option key={p.id} value={p.id}>{p.codigo} — {p.nombre}</option>
                                ))}
                            </select>
                            {productoSel && (
                                <div className="info-badge" style={{ marginTop: '0.4rem' }}>
                                    <span>📦</span>
                                    <span>Stock actual: <strong>{productoSel.stock}</strong> unidades</span>
                                </div>
                            )}
                        </div>

                        {/* ── Cantidad ── */}
                        <div className="form-group">
                            <label className="form-label" htmlFor="re-cantidad">
                                Cantidad <span className="required">*</span>
                            </label>
                            <input id="re-cantidad" className="form-input" type="number"
                                value={cantidad} onChange={e => setCantidad(e.target.value)}
                                required min="1" placeholder="0" />
                            {productoSel && cantidad && parseInt(cantidad) >= 1 && (
                                <span className="form-hint">
                                    Stock resultante: <strong>{productoSel.stock + parseInt(cantidad || '0')} unidades</strong>
                                </span>
                            )}
                        </div>

                        {/* ── Sección proveedor ── */}
                        <div className="form-group">
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
                                <label className="form-label" style={{ margin: 0 }}>
                                    Proveedor
                                </label>
                                <div style={{ display: 'flex', gap: '0.35rem' }}>
                                    <button type="button"
                                        onClick={() => { setModoProveedor('seleccionar'); setErrorCrear(''); }}
                                        style={{
                                            fontSize: '0.72rem', padding: '0.2rem 0.6rem',
                                            border: '1px solid #cbd5e1', borderRadius: '6px', cursor: 'pointer',
                                            background: modoProveedor === 'seleccionar' ? '#eff6ff' : '#fff',
                                            color: modoProveedor === 'seleccionar' ? '#1d4ed8' : '#475569',
                                            fontWeight: 600,
                                        }}>
                                        📋 Seleccionar
                                    </button>
                                    <button type="button"
                                        onClick={() => { setModoProveedor('crear'); setProveedorId(''); }}
                                        style={{
                                            fontSize: '0.72rem', padding: '0.2rem 0.6rem',
                                            border: '1px solid #cbd5e1', borderRadius: '6px', cursor: 'pointer',
                                            background: modoProveedor === 'crear' ? '#f0fdf4' : '#fff',
                                            color: modoProveedor === 'crear' ? '#15803d' : '#475569',
                                            fontWeight: 600,
                                        }}>
                                        ➕ Crear nuevo
                                    </button>
                                </div>
                            </div>

                            {/* Modo: seleccionar proveedor existente */}
                            {modoProveedor === 'seleccionar' && (
                                <div>
                                    <input className="form-input"
                                        placeholder="🔍 Buscar proveedor por nombre, NIT o teléfono..."
                                        value={busquedaProv}
                                        onChange={e => { setBusquedaProv(e.target.value); setProveedorId(''); }}
                                        style={{ marginBottom: '0.4rem' }} />
                                    {loadingProv ? (
                                        <div style={{ fontSize: '0.78rem', color: '#94a3b8', padding: '0.4rem 0' }}>⏳ Cargando proveedores...</div>
                                    ) : (
                                        <select className="form-select"
                                            value={proveedorId}
                                            onChange={e => { setProveedorId(e.target.value); setBusquedaProv(''); }}>
                                            <option value="">— Sin proveedor —</option>
                                            {proveedoresFiltrados.map(p => (
                                                <option key={p.id} value={p.id}>
                                                    {p.nombre}{p.nit ? ` — NIT: ${p.nit}` : ''}{p.telefono ? ` — ${p.telefono}` : ''}
                                                </option>
                                            ))}
                                        </select>
                                    )}
                                    {/* Badge del proveedor recién creado */}
                                    {provCreado && proveedorId === provCreado.id && (
                                        <div style={{ marginTop: '0.35rem', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '8px', padding: '0.4rem 0.65rem', fontSize: '0.78rem', color: '#15803d' }}>
                                            ✅ Proveedor <strong>{provCreado.nombre}</strong> creado y seleccionado
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Modo: crear proveedor nuevo */}
                            {modoProveedor === 'crear' && (
                                <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '0.85rem 1rem', display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                                    <div style={{ fontSize: '0.72rem', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.3px' }}>
                                        Nuevo proveedor
                                    </div>
                                    {errorCrear && (
                                        <div style={{ background: '#fee2e2', border: '1px solid #fecaca', borderRadius: '6px', padding: '0.4rem 0.6rem', fontSize: '0.78rem', color: '#991b1b' }}>
                                            ⚠️ {errorCrear}
                                        </div>
                                    )}
                                    <div className="form-row">
                                        <div className="form-group">
                                            <label className="form-label">Nombre <span className="required">*</span></label>
                                            <input className="form-input" value={nuevoNombre}
                                                onChange={e => setNuevoNombre(e.target.value)}
                                                placeholder="Nombre de la empresa" />
                                        </div>
                                        <div className="form-group">
                                            <label className="form-label">NIT</label>
                                            <input className="form-input" value={nuevoNit}
                                                onChange={e => setNuevoNit(e.target.value)}
                                                placeholder="900.000.000-0" />
                                        </div>
                                    </div>
                                    <div className="form-row">
                                        <div className="form-group">
                                            <label className="form-label">Teléfono</label>
                                            <input className="form-input" value={nuevoTelefono}
                                                onChange={e => setNuevoTelefono(e.target.value)}
                                                placeholder="300 000 0000" />
                                        </div>
                                        <div className="form-group">
                                            <label className="form-label">Ciudad</label>
                                            <input className="form-input" value={nuevoCiudad}
                                                onChange={e => setNuevoCiudad(e.target.value)}
                                                placeholder="Cali" />
                                        </div>
                                    </div>
                                    <button type="button"
                                        onClick={handleCrearProveedor}
                                        disabled={loadingCrear}
                                        style={{
                                            background: '#22c55e', color: '#fff', border: 'none',
                                            borderRadius: '8px', padding: '0.5rem 1rem',
                                            fontWeight: '700', fontSize: '0.83rem', cursor: 'pointer',
                                            opacity: loadingCrear ? 0.7 : 1,
                                        }}>
                                        {loadingCrear ? '⏳ Creando...' : '✅ Crear y seleccionar proveedor'}
                                    </button>
                                </div>
                            )}
                        </div>

                        {/* ── Observación ── */}
                        <div className="form-group">
                            <label className="form-label" htmlFor="re-observacion">Observación</label>
                            <textarea id="re-observacion" className="form-textarea"
                                value={observacion} onChange={e => setObservacion(e.target.value)}
                                rows={2} placeholder="Notas adicionales (opcional)..." />
                        </div>

                    </form>
                </div>

                {/* FOOTER */}
                <div className="modal-footer">
                    <button type="button" className="btn btn-secondary" onClick={handleClose}>
                        Cancelar
                    </button>
                    <button type="submit" form="form-entrada" className="btn btn-success" disabled={loading}>
                        {loading ? '⏳ Registrando...' : '📥 Registrar Entrada'}
                    </button>
                </div>

            </div>
        </div>
    );
};

export default RegistrarEntradaModal;
