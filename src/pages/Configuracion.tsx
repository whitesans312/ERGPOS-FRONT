import React, { useState, useEffect, useCallback } from 'react';
import { rolService } from '../services/rolService';
import { authService } from '../services/authService';
import { categoriaService } from '../services/categoriaService';
import { EMPRESA } from '../config/empresa';
import api from '../services/api';
import type { Rol, Categoria, ConfiguracionNegocio } from '../types';
import { configuracionService } from '../services/configuracionService';

// ── Mini-modal para crear / editar categoría ─────────────────────────────────
interface CatModalProps {
    categoria?: Categoria | null;
    onClose: () => void;
    onSaved: () => void;
}
const CategoriaModal: React.FC<CatModalProps> = ({ categoria, onClose, onSaved }) => {
    const isEdit = !!categoria;
    const [nombre, setNombre] = useState(categoria?.nombre ?? '');
    const [descripcion, setDescripcion] = useState(categoria?.descripcion ?? '');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleSave = async () => {
        if (!nombre.trim()) { setError('El nombre es obligatorio'); return; }
        setLoading(true); setError('');
        try {
            if (isEdit && categoria) {
                await categoriaService.actualizarCategoria(categoria.id, nombre.trim(), descripcion || undefined);
            } else {
                await categoriaService.crearCategoria(nombre.trim(), descripcion || undefined);
            }
            onSaved(); onClose();
        } catch (err: any) {
            const msg = err.response?.data;
            setError(typeof msg === 'string' ? msg : 'Error al guardar la categoría');
        } finally { setLoading(false); }
    };

    return (
        <div style={overlayStyle} onClick={(e) => e.target === e.currentTarget && onClose()}>
            <div style={modalBoxStyle}>
                {/* Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                        <div style={{ width: 36, height: 36, borderRadius: 10, background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1rem' }}>
                            🏷️
                        </div>
                        <div>
                            <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: '#0f172a' }}>
                                {isEdit ? 'Editar Categoría' : 'Nueva Categoría'}
                            </h3>
                            <p style={{ margin: 0, fontSize: '0.78rem', color: '#94a3b8' }}>
                                {isEdit ? categoria!.nombre : 'Agregar al catálogo'}
                            </p>
                        </div>
                    </div>
                    <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: '1.2rem', cursor: 'pointer', color: '#94a3b8', lineHeight: 1 }}>✕</button>
                </div>

                {error && (
                    <div style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626', padding: '0.6rem 0.85rem', borderRadius: 8, fontSize: '0.82rem', marginBottom: '1rem', display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
                        <span>⚠️</span><span>{error}</span>
                    </div>
                )}

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                    <div className="form-group">
                        <label className="form-label" htmlFor="cat-nombre">
                            Nombre <span className="required">*</span>
                        </label>
                        <input
                            id="cat-nombre"
                            className="form-input"
                            value={nombre}
                            onChange={e => { setNombre(e.target.value); setError(''); }}
                            placeholder="Ej: Herramientas, Electrónica..."
                            autoFocus
                        />
                    </div>
                    <div className="form-group">
                        <label className="form-label" htmlFor="cat-desc">Descripción (opcional)</label>
                        <input
                            id="cat-desc"
                            className="form-input"
                            value={descripcion}
                            onChange={e => setDescripcion(e.target.value)}
                            placeholder="Describe brevemente esta categoría"
                        />
                    </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.6rem', marginTop: '1.5rem' }}>
                    <button className="btn btn-secondary" onClick={onClose}>Cancelar</button>
                    <button className="btn btn-primary" onClick={handleSave} disabled={loading}>
                        {loading ? '⏳ Guardando...' : (isEdit ? '✏️ Guardar cambios' : '➕ Crear categoría')}
                    </button>
                </div>
            </div>
        </div>
    );
};

// ── Estilos del mini-modal ───────────────────────────────────────────────────
const overlayStyle: React.CSSProperties = {
    position: 'fixed', inset: 0,
    background: 'rgba(15,23,42,0.45)',
    backdropFilter: 'blur(4px)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    zIndex: 1000
};
const modalBoxStyle: React.CSSProperties = {
    background: '#fff', borderRadius: 16,
    padding: '1.75rem', width: '100%', maxWidth: 440,
    boxShadow: '0 20px 60px rgba(0,0,0,0.18)',
    border: '1px solid #e2e8f0'
};

// ── Página principal ─────────────────────────────────────────────────────────
const Configuracion: React.FC = () => {
    const user = authService.getUser();

    // Estados por tab
    const [roles, setRoles] = useState<Rol[]>([]);
    const [loadingRoles, setLoadingRoles] = useState(true);
    const [stockBajoProductos, setStockBajoProductos] = useState<any[]>([]);
    const [tab, setTab] = useState<'sistema' | 'empresa' | 'categorias' | 'roles' | 'alertas'>('sistema');

    // Empresa
    const [empresaForm, setEmpresaForm] = useState({
        nombre: EMPRESA.nombre,
        nit: EMPRESA.nit,
        direccion: EMPRESA.direccion,
        telefono: EMPRESA.telefono,
        email: EMPRESA.email,
        ciudad: EMPRESA.ciudad,
        iva: '19' // default/fallback initial state until the BD response loads
    });
    const [empresaSaved, setEmpresaSaved] = useState(false);
    const [empresaError, setEmpresaError] = useState('');
    const [empresaSaving, setEmpresaSaving] = useState(false);

    // Categorías
    const [categorias, setCategorias] = useState<Categoria[]>([]);
    const [loadingCats, setLoadingCats] = useState(false);
    const [modalCat, setModalCat] = useState(false);
    const [catEditar, setCatEditar] = useState<Categoria | null>(null);
    const [catError, setCatError] = useState('');
    const [filtroCats, setFiltroCats] = useState<'todas' | 'activas' | 'inactivas'>('activas');

    // ── Carga inicial ──────────────────────────────────────────────────────
    useEffect(() => {
        rolService.getRoles().then(r => { setRoles(r); setLoadingRoles(false); });
        api.get('/productos/stock-bajo').then(r => setStockBajoProductos(r.data)).catch(() => { });
        configuracionService.getAll()
            .then(data => {
                setEmpresaForm(prev => {
                    const mapped = { ...prev };
                    data.forEach(item => {
                        if (item.clave === 'COMPANY_NAME') mapped.nombre = item.valor;
                        else if (item.clave === 'COMPANY_NIT') mapped.nit = item.valor;
                        else if (item.clave === 'COMPANY_ADDRESS') mapped.direccion = item.valor;
                        else if (item.clave === 'COMPANY_PHONE') mapped.telefono = item.valor;
                        else if (item.clave === 'COMPANY_EMAIL') mapped.email = item.valor;
                        else if (item.clave === 'COMPANY_CITY') mapped.ciudad = item.valor;
                        else if (item.clave === 'TAX_PERCENTAGE') mapped.iva = item.valor;
                    });
                    return mapped;
                });
            })
            .catch(err => {
                console.error("Error al cargar la configuración de empresa", err);
            });
    }, []);

    const cargarCategorias = useCallback(async () => {
        setLoadingCats(true);
        try {
            const data = await categoriaService.getTodasCategorias();
            setCategorias(data);
        } catch {
            setCatError('Error al cargar las categorías');
        } finally {
            setLoadingCats(false);
        }
    }, []);

    useEffect(() => {
        if (tab === 'categorias') cargarCategorias();
    }, [tab, cargarCategorias]);

    // ── Acciones de categoría ──────────────────────────────────────────────
    const handleToggleCat = async (cat: Categoria) => {
        const nuevoEstado = !cat.activo;
        const accion = nuevoEstado ? 'activar' : 'desactivar';
        if (!confirm(`¿Deseas ${accion} la categoría "${cat.nombre}"?`)) return;
        setCatError('');
        try {
            await categoriaService.toggleActivo(cat.id, nuevoEstado);
            cargarCategorias();
        } catch (err: any) {
            const msg = err.response?.data;
            setCatError(typeof msg === 'string' ? msg : `Error al ${accion} la categoría`);
        }
    };

    const handleEliminarCat = async (cat: Categoria) => {
        if (!confirm(`¿Eliminar la categoría "${cat.nombre}"?\n\nEsta acción es irreversible si no tiene productos.`)) return;
        setCatError('');
        try {
            await categoriaService.eliminarCategoria(cat.id);
            cargarCategorias();
        } catch (err: any) {
            const msg = err.response?.data;
            setCatError(typeof msg === 'string' ? msg : 'No se pudo eliminar la categoría');
        }
    };

    // ── Empresa ────────────────────────────────────────────────────────────
    const infoSistema = [
        { label: 'Versión del sistema', value: 'ERG-INVENTORY v1.0' },
        { label: 'Base de datos', value: 'PostgreSQL (Supabase)' },
        { label: 'Backend', value: 'Spring Boot 3 / Java 21' },
        { label: 'Frontend', value: 'React 18 + Vite + TypeScript' },
        { label: 'Administrador', value: user?.email ?? '—' },
    ];

    const handleEmpresaChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setEmpresaForm({ ...empresaForm, [e.target.name]: e.target.value });
        setEmpresaSaved(false);
        setEmpresaError('');
    };

    const handleEmpresaSave = () => {
        setEmpresaSaving(true);
        setEmpresaError('');
        const payload: ConfiguracionNegocio[] = [
            { clave: 'COMPANY_NAME', valor: empresaForm.nombre, categoria: 'EMPRESA', descripcion: 'Nombre o razón social de la empresa' },
            { clave: 'COMPANY_NIT', valor: empresaForm.nit, categoria: 'EMPRESA', descripcion: 'NIT de la empresa' },
            { clave: 'COMPANY_ADDRESS', valor: empresaForm.direccion, categoria: 'EMPRESA', descripcion: 'Dirección física de la empresa' },
            { clave: 'COMPANY_PHONE', valor: empresaForm.telefono, categoria: 'EMPRESA', descripcion: 'Teléfono de contacto' },
            { clave: 'COMPANY_EMAIL', valor: empresaForm.email, categoria: 'EMPRESA', descripcion: 'Correo electrónico de contacto' },
            { clave: 'COMPANY_CITY', valor: empresaForm.ciudad, categoria: 'EMPRESA', descripcion: 'Ciudad de ubicación' },
            { clave: 'TAX_PERCENTAGE', valor: empresaForm.iva, categoria: 'FISCAL', descripcion: 'Porcentaje de IVA / Impuesto sobre las ventas' }
        ];

        configuracionService.saveAll(payload)
            .then(() => {
                setEmpresaSaved(true);
                setTimeout(() => setEmpresaSaved(false), 2500);
            })
            .catch(err => {
                const msg = err.response?.data;
                setEmpresaError(typeof msg === 'string' ? msg : 'Error al guardar la configuración');
            })
            .finally(() => {
                setEmpresaSaving(false);
            });
    };

    // ── Categorías filtradas ───────────────────────────────────────────────
    const catsFiltradas = categorias.filter(c =>
        filtroCats === 'todas' ? true :
        filtroCats === 'activas' ? c.activo : !c.activo
    );

    // ── RENDER ─────────────────────────────────────────────────────────────
    return (
        <div className="page-container">
            <div className="page-header">
                <div className="page-header-left">
                    <h1 className="page-title">⚙️ Configuración</h1>
                    <span className="page-subtitle">Ajustes y administración del sistema</span>
                </div>
            </div>

            <div className="card" style={{ padding: 0 }}>
                {/* TABS */}
                <div style={{ display: 'flex', borderBottom: '1px solid #f1f5f9', flexWrap: 'wrap' }}>
                    {([
                        { key: 'sistema', label: '🖥️ Sistema' },
                        { key: 'empresa', label: '🏢 Empresa' },
                        { key: 'categorias', label: '🏷️ Categorías' },
                        { key: 'roles', label: '👥 Roles' },
                        { key: 'alertas', label: '⚠️ Alertas de stock' },
                    ] as const).map(t => (
                        <button key={t.key} onClick={() => setTab(t.key)}
                            style={{
                                padding: '0.85rem 1.25rem',
                                border: 'none', background: 'none', cursor: 'pointer',
                                fontSize: '0.85rem',
                                fontWeight: tab === t.key ? '700' : '500',
                                color: tab === t.key ? '#3b82f6' : '#64748b',
                                borderBottom: tab === t.key ? '2px solid #3b82f6' : '2px solid transparent',
                                transition: 'all 0.15s',
                            }}>
                            {t.label}
                        </button>
                    ))}
                </div>

                <div style={{ padding: '1.5rem' }}>

                    {/* ── SISTEMA ── */}
                    {tab === 'sistema' && (
                        <div>
                            <h3 style={{ fontSize: '0.85rem', fontWeight: '700', color: '#475569', marginBottom: '1rem' }}>
                                Información del sistema
                            </h3>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', maxWidth: '500px' }}>
                                {infoSistema.map(item => (
                                    <div key={item.label} style={{
                                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                        padding: '0.65rem 0.85rem', background: '#f8fafc',
                                        borderRadius: '10px', border: '1px solid #f1f5f9'
                                    }}>
                                        <span style={{ fontSize: '0.82rem', color: '#64748b', fontWeight: '600' }}>{item.label}</span>
                                        <span style={{ fontSize: '0.82rem', color: '#0f172a' }}>{item.value}</span>
                                    </div>
                                ))}
                            </div>
                            <div style={{ marginTop: '2rem' }}>
                                <h3 style={{ fontSize: '0.85rem', fontWeight: '700', color: '#475569', marginBottom: '0.75rem' }}>
                                    Acciones rápidas
                                </h3>
                                <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                                    <a href="/movimientos" style={{ textDecoration: 'none' }}>
                                        <button className="action-btn action-btn-ghost">🔄 Ver movimientos</button>
                                    </a>
                                    <a href="/reportes" style={{ textDecoration: 'none' }}>
                                        <button className="action-btn action-btn-ghost">📊 Ver reportes</button>
                                    </a>
                                    <a href="/perfil" style={{ textDecoration: 'none' }}>
                                        <button className="action-btn action-btn-ghost">👤 Mi perfil</button>
                                    </a>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* ── EMPRESA ── */}
                    {tab === 'empresa' && (
                        <div style={{ maxWidth: '520px' }}>
                            <h3 style={{ fontSize: '0.85rem', fontWeight: '700', color: '#475569', marginBottom: '0.4rem' }}>
                                Datos de la empresa
                            </h3>
                            <p style={{ fontSize: '0.82rem', color: '#94a3b8', marginBottom: '1.25rem' }}>
                                Esta información aparece en las facturas de venta.
                            </p>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.9rem' }}>
                                {[
                                    { name: 'nombre', label: 'Razón social / Nombre', placeholder: 'ERG-INVENTORY SAS' },
                                    { name: 'nit', label: 'NIT', placeholder: '901234567-8' },
                                    { name: 'direccion', label: 'Dirección', placeholder: 'Calle 10 #20-30, Cali' },
                                    { name: 'telefono', label: 'Teléfono', placeholder: '3001234567' },
                                    { name: 'email', label: 'Email de contacto', placeholder: 'ventas@erginventory.com' },
                                    { name: 'ciudad', label: 'Ciudad', placeholder: 'Cali, Colombia' },
                                ].map(field => (
                                    <div key={field.name} className="form-group">
                                        <label className="form-label">{field.label}</label>
                                        <input
                                            className="form-input"
                                            name={field.name}
                                            value={(empresaForm as any)[field.name]}
                                            onChange={handleEmpresaChange}
                                            placeholder={field.placeholder}
                                        />
                                    </div>
                                ))}
                                <div className="form-group">
                                    <label className="form-label">IVA (%)</label>
                                    <input
                                        type="number"
                                        className="form-input"
                                        name="iva"
                                        value={empresaForm.iva}
                                        onChange={handleEmpresaChange}
                                        placeholder="19"
                                        min="0"
                                        max="100"
                                    />
                                </div>
                            </div>
                            <div style={{ marginTop: '1.5rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                <button className="action-btn action-btn-primary" onClick={handleEmpresaSave} disabled={empresaSaving}
                                    style={{ padding: '0.6rem 1.5rem', fontWeight: 700 }}>
                                    {empresaSaving ? '⏳ Guardando...' : '💾 Guardar cambios'}
                                </button>
                                {empresaSaved && (
                                    <span style={{ fontSize: '0.85rem', color: '#16a34a', fontWeight: 600 }}>
                                        ✅ Guardado correctamente
                                    </span>
                                )}
                                {empresaError && (
                                    <span style={{ fontSize: '0.85rem', color: '#dc2626', fontWeight: 600 }}>
                                        ⚠️ {empresaError}
                                    </span>
                                )}
                            </div>
                        </div>
                    )}

                    {/* ── CATEGORÍAS ── */}
                    {tab === 'categorias' && (
                        <div>
                            {/* Encabezado */}
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.75rem' }}>
                                <div>
                                    <h3 style={{ fontSize: '0.85rem', fontWeight: '700', color: '#475569', margin: 0 }}>
                                        Gestión de categorías
                                    </h3>
                                    <p style={{ fontSize: '0.82rem', color: '#94a3b8', margin: '0.25rem 0 0' }}>
                                        Organiza tus productos por categorías. No se puede eliminar una categoría con productos activos.
                                    </p>
                                </div>
                                <button
                                    className="action-btn action-btn-primary"
                                    onClick={() => { setCatEditar(null); setModalCat(true); setCatError(''); }}
                                    style={{ whiteSpace: 'nowrap' }}
                                >
                                    + Nueva categoría
                                </button>
                            </div>

                            {/* Filtros */}
                            <div style={{ display: 'flex', gap: '0.4rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
                                {(['activas', 'inactivas', 'todas'] as const).map(f => (
                                    <button key={f} onClick={() => setFiltroCats(f)}
                                        style={{
                                            padding: '0.35rem 0.85rem', borderRadius: 20, fontSize: '0.8rem',
                                            fontWeight: filtroCats === f ? 700 : 500,
                                            border: filtroCats === f ? 'none' : '1px solid #e2e8f0',
                                            background: filtroCats === f ? '#3b82f6' : '#f8fafc',
                                            color: filtroCats === f ? 'white' : '#64748b',
                                            cursor: 'pointer', transition: 'all 0.15s'
                                        }}>
                                        {f.charAt(0).toUpperCase() + f.slice(1)}
                                    </button>
                                ))}
                                <span style={{ marginLeft: 'auto', fontSize: '0.8rem', color: '#94a3b8', alignSelf: 'center' }}>
                                    {catsFiltradas.length} categoría{catsFiltradas.length !== 1 ? 's' : ''}
                                </span>
                            </div>

                            {/* Error banner */}
                            {catError && (
                                <div style={{
                                    background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626',
                                    padding: '0.7rem 1rem', borderRadius: 10, fontSize: '0.83rem',
                                    marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem'
                                }}>
                                    <span>⚠️</span>
                                    <span>{catError}</span>
                                    <button onClick={() => setCatError('')}
                                        style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', color: '#dc2626', fontWeight: 700 }}>✕</button>
                                </div>
                            )}

                            {/* Tabla de categorías */}
                            {loadingCats ? (
                                <div className="loading-state">⏳ Cargando categorías...</div>
                            ) : catsFiltradas.length === 0 ? (
                                <div className="empty-state">
                                    <span className="empty-state-icon">🏷️</span>
                                    <h3>Sin categorías</h3>
                                    <p>
                                        {filtroCats === 'activas' ? 'No hay categorías activas.' :
                                         filtroCats === 'inactivas' ? 'No hay categorías inactivas.' :
                                         'Aún no has creado ninguna categoría.'}
                                    </p>
                                </div>
                            ) : (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxWidth: 680 }}>
                                    {catsFiltradas.map(cat => (
                                        <div key={cat.id} style={{
                                            display: 'flex', alignItems: 'center', gap: '0.85rem',
                                            padding: '0.75rem 1rem',
                                            background: cat.activo ? '#f8fafc' : '#fafafa',
                                            borderRadius: 12,
                                            border: `1px solid ${cat.activo ? '#e2e8f0' : '#f1f5f9'}`,
                                            opacity: cat.activo ? 1 : 0.65,
                                            transition: 'all 0.15s'
                                        }}>
                                            {/* Ícono */}
                                            <div style={{
                                                width: 36, height: 36, borderRadius: 10, flexShrink: 0,
                                                background: cat.activo
                                                    ? 'linear-gradient(135deg,#6366f1,#8b5cf6)'
                                                    : '#cbd5e1',
                                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                fontSize: '1rem'
                                            }}>🏷️</div>

                                            {/* Info */}
                                            <div style={{ flex: 1, minWidth: 0 }}>
                                                <div style={{ fontWeight: 700, fontSize: '0.9rem', color: '#0f172a' }}>
                                                    {cat.nombre}
                                                </div>
                                                {cat.descripcion && (
                                                    <div style={{ fontSize: '0.78rem', color: '#64748b', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                        {cat.descripcion}
                                                    </div>
                                                )}
                                            </div>

                                            {/* Badge estado */}
                                            <span style={{
                                                fontSize: '0.72rem', fontWeight: 700,
                                                padding: '0.2rem 0.6rem', borderRadius: 20,
                                                background: cat.activo ? '#dcfce7' : '#f1f5f9',
                                                color: cat.activo ? '#16a34a' : '#94a3b8',
                                                whiteSpace: 'nowrap'
                                            }}>
                                                {cat.activo ? '● Activa' : '○ Inactiva'}
                                            </span>

                                            {/* Acciones */}
                                            <div style={{ display: 'flex', gap: '0.35rem', flexShrink: 0 }}>
                                                <button
                                                    className="icon-btn icon-btn-edit"
                                                    title="Editar nombre y descripción"
                                                    onClick={() => { setCatEditar(cat); setModalCat(true); setCatError(''); }}
                                                >✏️</button>
                                                <button
                                                    className={`icon-btn ${cat.activo ? 'icon-btn-toggle-on' : 'icon-btn-toggle-off'}`}
                                                    title={cat.activo ? 'Desactivar categoría' : 'Activar categoría'}
                                                    onClick={() => handleToggleCat(cat)}
                                                >
                                                    {cat.activo ? '🟢' : '🔴'}
                                                </button>
                                                <button
                                                    className="icon-btn"
                                                    title="Eliminar categoría (solo si no tiene productos activos)"
                                                    onClick={() => handleEliminarCat(cat)}
                                                    style={{ color: '#ef4444', background: '#fef2f2', border: '1px solid #fecaca' }}
                                                >🗑️</button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* Aviso informativo */}
                            <div className="info-badge" style={{ marginTop: '1.25rem', maxWidth: 680 }}>
                                <span>ℹ️</span>
                                <span>
                                    <strong>Protección de stock:</strong> No puedes eliminar ni desactivar una categoría
                                    que tenga productos activos asignados. Reasigna o desactiva los productos primero.
                                </span>
                            </div>
                        </div>
                    )}

                    {/* ── ROLES ── */}
                    {tab === 'roles' && (
                        <div>
                            <h3 style={{ fontSize: '0.85rem', fontWeight: '700', color: '#475569', marginBottom: '1rem' }}>
                                Roles del sistema
                            </h3>
                            {loadingRoles ? (
                                <div className="loading-state">⏳ Cargando roles...</div>
                            ) : (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                                    {roles.map(rol => {
                                        const descRoles: Record<string, string> = {
                                            'ADMIN': 'Acceso completo al sistema: usuarios, productos, ventas, entregas, reportes y configuración.',
                                            'VENDEDOR': 'Puede registrar ventas y consultar el inventario disponible.',
                                            'INVENTARIO': 'Gestiona productos, registra entradas y salidas de stock.',
                                            'ENTREGAS': 'Ve y gestiona las entregas a domicilio asignadas.',
                                        };
                                        const colorRoles: Record<string, { bg: string; color: string }> = {
                                            'ADMIN': { bg: '#fee2e2', color: '#dc2626' },
                                            'VENDEDOR': { bg: '#dcfce7', color: '#16a34a' },
                                            'INVENTARIO': { bg: '#dbeafe', color: '#1d4ed8' },
                                            'ENTREGAS': { bg: '#fef9c3', color: '#a16207' },
                                        };
                                        const c = colorRoles[rol.nombre] ?? { bg: '#f1f5f9', color: '#64748b' };
                                        return (
                                            <div key={rol.id} style={{
                                                display: 'flex', alignItems: 'flex-start', gap: '0.85rem',
                                                padding: '0.85rem 1rem', background: '#f8fafc',
                                                borderRadius: '10px', border: '1px solid #f1f5f9'
                                            }}>
                                                <span style={{
                                                    padding: '0.25rem 0.65rem', borderRadius: '6px',
                                                    fontSize: '0.75rem', fontWeight: '700',
                                                    background: c.bg, color: c.color,
                                                    whiteSpace: 'nowrap', marginTop: '1px'
                                                }}>
                                                    {rol.nombre}
                                                </span>
                                                <div>
                                                    <p style={{ fontSize: '0.82rem', color: '#64748b', margin: 0 }}>
                                                        {descRoles[rol.nombre] ?? 'Sin descripción'}
                                                    </p>
                                                    <span style={{ fontSize: '0.7rem', color: rol.activo ? '#22c55e' : '#ef4444', marginTop: '0.2rem', display: 'block' }}>
                                                        {rol.activo ? '● Activo' : '○ Inactivo'}
                                                    </span>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                            <div className="info-badge" style={{ marginTop: '1rem' }}>
                                <span>ℹ️</span>
                                <span>Los roles se asignan al crear o editar usuarios. Contacta al desarrollador para agregar nuevos roles.</span>
                            </div>
                        </div>
                    )}

                    {/* ── ALERTAS ── */}
                    {tab === 'alertas' && (
                        <div>
                            <h3 style={{ fontSize: '0.85rem', fontWeight: '700', color: '#475569', marginBottom: '0.5rem' }}>
                                ⚠️ Productos con stock bajo o agotado
                            </h3>
                            <p style={{ fontSize: '0.82rem', color: '#94a3b8', marginBottom: '1rem' }}>
                                Estos productos requieren reabastecimiento urgente.
                            </p>
                            {stockBajoProductos.length === 0 ? (
                                <div style={{
                                    background: '#f0fdf4', border: '1px solid #bbf7d0', color: '#15803d',
                                    padding: '1rem', borderRadius: '10px', fontSize: '0.85rem',
                                    display: 'flex', alignItems: 'center', gap: '0.5rem'
                                }}>
                                    <span>✅</span>
                                    <span>¡Todos los productos tienen stock suficiente!</span>
                                </div>
                            ) : (
                                <div className="table-wrapper">
                                    <table className="data-table">
                                        <thead>
                                            <tr>
                                                <th>Código</th>
                                                <th>Producto</th>
                                                <th>Stock actual</th>
                                                <th>Stock mínimo</th>
                                                <th>Estado</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {stockBajoProductos.map((p: any) => (
                                                <tr key={p.id}>
                                                    <td>
                                                        <span style={{ fontFamily: 'monospace', fontSize: '0.8rem', background: '#f1f5f9', padding: '0.2rem 0.4rem', borderRadius: '4px' }}>
                                                            {p.codigo}
                                                        </span>
                                                    </td>
                                                    <td style={{ fontWeight: '600', color: '#0f172a' }}>{p.nombre}</td>
                                                    <td>
                                                        <span style={{ fontWeight: '800', color: p.stock === 0 ? '#ef4444' : '#f59e0b' }}>
                                                            {p.stock}
                                                        </span>
                                                    </td>
                                                    <td style={{ color: '#64748b' }}>{p.stockMinimo}</td>
                                                    <td>
                                                        <span className={`badge ${p.stock === 0 ? 'badge-red' : 'badge-yellow'}`}>
                                                            {p.stock === 0 ? '🚨 Agotado' : '⚠️ Stock bajo'}
                                                        </span>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    )}

                </div>
            </div>

            {/* Modal crear / editar categoría */}
            {modalCat && (
                <CategoriaModal
                    categoria={catEditar}
                    onClose={() => { setModalCat(false); setCatEditar(null); }}
                    onSaved={cargarCategorias}
                />
            )}
        </div>
    );
};

export default Configuracion;
