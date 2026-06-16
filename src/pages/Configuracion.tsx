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
    const [tab, setTab] = useState<'sistema' | 'empresa' | 'parametros' | 'plantillas' | 'categorias' | 'roles' | 'alertas'>('sistema');

    // ── Parámetros (HU32 + HU33) ───────────────────────────────────────────
    const [paramsAgrupados, setParamsAgrupados] = useState<Record<string, ConfiguracionNegocio[]>>({});
    const [loadingParams, setLoadingParams] = useState(false);
    const [paramEditando, setParamEditando] = useState<string | null>(null);
    const [paramValorTmp, setParamValorTmp] = useState('');
    const [paramSavingKey, setParamSavingKey] = useState<string | null>(null);
    const [paramError, setParamError] = useState('');
    const [paramSuccess, setParamSuccess] = useState('');
    const [modalNuevoParam, setModalNuevoParam] = useState(false);
    const [nuevoParam, setNuevoParam] = useState<ConfiguracionNegocio>({ clave: '', valor: '', categoria: 'EMPRESA', descripcion: '' });
    const [nuevoParamError, setNuevoParamError] = useState('');
    const [nuevoParamSaving, setNuevoParamSaving] = useState(false);
    const [importing, setImporting] = useState(false);

    // ── Plantillas (HU34) ─────────────────────────────────────────────────
    const [plantillaSeleccionada, setPlantillaSeleccionada] = useState<string | null>(null);
    const [previewPlantilla, setPreviewPlantilla] = useState<ConfiguracionNegocio[]>([]);
    const [loadingPreview, setLoadingPreview] = useState(false);
    const [aplicandoPlantilla, setAplicandoPlantilla] = useState(false);
    const [plantillaMsg, setPlantillaMsg] = useState('');

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
        if (tab === 'plantillas') setPlantillaMsg('');
    }, [tab, cargarCategorias]);

    // ── Parámetros (HU32 + HU33) ──────────────────────────────────────────
    const cargarParams = useCallback(async () => {
        setLoadingParams(true); setParamError('');
        try { setParamsAgrupados(await configuracionService.getAgrupada()); }
        catch { setParamError('Error al cargar los parámetros'); }
        finally { setLoadingParams(false); }
    }, []);

    useEffect(() => { if (tab === 'parametros') cargarParams(); }, [tab, cargarParams]);

    const iniciarEdicion = (p: ConfiguracionNegocio) => { setParamEditando(p.clave); setParamValorTmp(p.valor); setParamError(''); setParamSuccess(''); };
    const cancelarEdicion = () => { setParamEditando(null); setParamValorTmp(''); };

    const guardarParam = async (p: ConfiguracionNegocio) => {
        setParamSavingKey(p.clave);
        try {
            await configuracionService.update(p.clave, { ...p, valor: paramValorTmp });
            setParamSuccess(`✅ "${p.clave}" actualizado`); setTimeout(() => setParamSuccess(''), 3000);
            setParamEditando(null); cargarParams();
        } catch (err: any) { setParamError(`Error: ${err.response?.data || err.message}`); }
        finally { setParamSavingKey(null); }
    };

    const eliminarParam = async (clave: string) => {
        if (!confirm(`¿Eliminar el parámetro "${clave}"? Esta acción no se puede deshacer.`)) return;
        try {
            await configuracionService.delete(clave);
            setParamSuccess(`🗑️ "${clave}" eliminado`); setTimeout(() => setParamSuccess(''), 3000); cargarParams();
        } catch (err: any) { setParamError(`Error: ${err.response?.data || err.message}`); }
    };

    const crearParam = async () => {
        if (!nuevoParam.clave.trim() || !nuevoParam.valor.trim()) { setNuevoParamError('La clave y el valor son obligatorios'); return; }
        setNuevoParamSaving(true); setNuevoParamError('');
        try {
            await configuracionService.create(nuevoParam);
            setModalNuevoParam(false); setNuevoParam({ clave: '', valor: '', categoria: 'EMPRESA', descripcion: '' }); cargarParams();
        } catch (err: any) { setNuevoParamError(err.response?.data || 'Error al crear el parámetro'); }
        finally { setNuevoParamSaving(false); }
    };

    const handleImportJson = () => {
        const input = document.createElement('input'); input.type = 'file'; input.accept = '.json';
        input.onchange = async (e) => {
            const file = (e.target as HTMLInputElement).files?.[0]; if (!file) return;
            setImporting(true);
            try {
                const items: ConfiguracionNegocio[] = JSON.parse(await file.text());
                await configuracionService.importJson(items);
                setParamSuccess(`✅ ${items.length} parámetros importados`); setTimeout(() => setParamSuccess(''), 4000);
                if (tab === 'parametros') cargarParams();
            } catch (err: any) { setParamError('Error al importar: ' + (err.response?.data || err.message)); }
            finally { setImporting(false); }
        };
        input.click();
    };

    // ── Plantillas (HU34) ─────────────────────────────────────────────────
    const seleccionarPlantilla = async (tipo: string) => {
        setPlantillaSeleccionada(tipo); setLoadingPreview(true); setPlantillaMsg('');
        try { setPreviewPlantilla(await configuracionService.getPlantilla(tipo)); }
        catch { setPreviewPlantilla([]); }
        finally { setLoadingPreview(false); }
    };

    const aplicarPlantilla = async () => {
        if (!plantillaSeleccionada) return;
        if (!confirm(`¿Aplicar la plantilla "${plantillaSeleccionada}"? Los parámetros existentes serán sobreescritos.`)) return;
        setAplicandoPlantilla(true); setPlantillaMsg('');
        try {
            const guardados = await configuracionService.aplicarPlantilla(plantillaSeleccionada);
            setPlantillaMsg(`✅ Plantilla aplicada: ${guardados.length} parámetros actualizados`); setTimeout(() => setPlantillaMsg(''), 4000);
        } catch (err: any) { setPlantillaMsg('❌ Error: ' + (err.response?.data || err.message)); }
        finally { setAplicandoPlantilla(false); }
    };

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
                        { key: 'parametros', label: '📋 Parámetros' },
                        { key: 'plantillas', label: '🎯 Plantillas' },
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

                            {/* ── Exportar / Importar JSON (HU35) ──────────────────────────── */}
                            <div style={{ marginTop: '2rem' }}>
                                <h3 style={{ fontSize: '0.85rem', fontWeight: '700', color: '#475569', marginBottom: '0.75rem' }}>
                                    Exportar / Importar configuración
                                </h3>
                                <p style={{ fontSize: '0.82rem', color: '#94a3b8', marginBottom: '1rem' }}>
                                    Descarga todos los parámetros del sistema en JSON o restaura desde un archivo.
                                </p>
                                <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                                    <button
                                        id="btn-export-config"
                                        className="action-btn action-btn-ghost"
                                        onClick={() => configuracionService.exportJson()}
                                    >
                                        📥 Exportar JSON
                                    </button>
                                    <button
                                        id="btn-import-config"
                                        className="action-btn action-btn-ghost"
                                        onClick={handleImportJson}
                                        disabled={importing}
                                    >
                                        {importing ? '⏳ Importando...' : '📤 Importar JSON'}
                                    </button>
                                </div>
                                {paramSuccess && tab === 'sistema' && (
                                    <div style={{ marginTop: '0.75rem', fontSize: '0.82rem', color: '#16a34a', fontWeight: 600 }}>{paramSuccess}</div>
                                )}
                                {paramError && tab === 'sistema' && (
                                    <div style={{ marginTop: '0.75rem', fontSize: '0.82rem', color: '#dc2626', fontWeight: 600 }}>{paramError}</div>
                                )}
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

                    {/* ── PARÁMETROS (HU32 + HU33) ── */}
                    {tab === 'parametros' && (
                        <div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.75rem' }}>
                                <div>
                                    <h3 style={{ fontSize: '0.85rem', fontWeight: '700', color: '#475569', margin: 0 }}>
                                        Parámetros del sistema
                                    </h3>
                                    <p style={{ fontSize: '0.82rem', color: '#94a3b8', margin: '0.25rem 0 0' }}>
                                        Todos los parámetros configurables agrupados por categoría. Haz clic en ✏️ para editar inline.
                                    </p>
                                </div>
                                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                                    <button
                                        id="btn-nuevo-param"
                                        className="action-btn action-btn-primary"
                                        onClick={() => { setModalNuevoParam(true); setNuevoParamError(''); }}
                                        style={{ whiteSpace: 'nowrap' }}
                                    >
                                        + Nuevo parámetro
                                    </button>
                                    <button
                                        id="btn-recargar-params"
                                        className="action-btn action-btn-ghost"
                                        onClick={cargarParams}
                                        style={{ whiteSpace: 'nowrap' }}
                                    >
                                        🔄 Recargar
                                    </button>
                                </div>
                            </div>

                            {paramSuccess && (
                                <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', color: '#15803d', padding: '0.6rem 1rem', borderRadius: 10, fontSize: '0.83rem', marginBottom: '1rem', fontWeight: 600 }}>
                                    {paramSuccess}
                                </div>
                            )}
                            {paramError && (
                                <div style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626', padding: '0.6rem 1rem', borderRadius: 10, fontSize: '0.83rem', marginBottom: '1rem', fontWeight: 600 }}>
                                    {paramError}
                                </div>
                            )}

                            {loadingParams ? (
                                <div className="loading-state">⏳ Cargando parámetros...</div>
                            ) : Object.keys(paramsAgrupados).length === 0 ? (
                                <div className="empty-state">
                                    <span className="empty-state-icon">⚙️</span>
                                    <h3>Sin parámetros</h3>
                                    <p>Crea el primer parámetro usando el botón superior.</p>
                                </div>
                            ) : (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                                    {Object.entries(paramsAgrupados).map(([categoria, params]) => (
                                        <div key={categoria}>
                                            <div style={{
                                                display: 'flex', alignItems: 'center', gap: '0.6rem',
                                                marginBottom: '0.6rem',
                                            }}>
                                                <span style={{
                                                    fontSize: '0.7rem', fontWeight: '800', letterSpacing: '0.5px',
                                                    textTransform: 'uppercase', color: '#fff',
                                                    background: categoria === 'EMPRESA' ? '#6366f1' : categoria === 'FISCAL' ? '#f59e0b' : categoria === 'INVENTARIO' ? '#10b981' : categoria === 'VENTAS' ? '#3b82f6' : '#8b5cf6',
                                                    padding: '0.2rem 0.65rem', borderRadius: 20,
                                                }}>
                                                    {categoria}
                                                </span>
                                                <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>{params.length} parámetro{params.length !== 1 ? 's' : ''}</span>
                                            </div>
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                                                {params.map(p => (
                                                    <div key={p.clave} style={{
                                                        display: 'flex', alignItems: 'center', gap: '0.75rem',
                                                        padding: '0.65rem 1rem', background: '#f8fafc',
                                                        borderRadius: 10, border: '1px solid #e2e8f0',
                                                        flexWrap: 'wrap',
                                                    }}>
                                                        <code style={{ fontFamily: 'monospace', fontSize: '0.8rem', color: '#475569', background: '#f1f5f9', padding: '0.15rem 0.45rem', borderRadius: 5, minWidth: 160, flexShrink: 0 }}>
                                                            {p.clave}
                                                        </code>

                                                        {paramEditando === p.clave ? (
                                                            <>
                                                                <input
                                                                    value={paramValorTmp}
                                                                    onChange={e => setParamValorTmp(e.target.value)}
                                                                    style={{ flex: 1, minWidth: 120, padding: '0.35rem 0.6rem', border: '1px solid #6366f1', borderRadius: 7, fontSize: '0.85rem', outline: 'none' }}
                                                                    autoFocus
                                                                    onKeyDown={e => { if (e.key === 'Enter') guardarParam(p); if (e.key === 'Escape') cancelarEdicion(); }}
                                                                />
                                                                <button
                                                                    onClick={() => guardarParam(p)}
                                                                    disabled={paramSavingKey === p.clave}
                                                                    style={{ padding: '0.3rem 0.75rem', background: '#6366f1', color: '#fff', border: 'none', borderRadius: 7, fontSize: '0.8rem', fontWeight: 700, cursor: 'pointer' }}
                                                                >
                                                                    {paramSavingKey === p.clave ? '⏳' : '✓ Guardar'}
                                                                </button>
                                                                <button
                                                                    onClick={cancelarEdicion}
                                                                    style={{ padding: '0.3rem 0.65rem', background: '#f1f5f9', color: '#64748b', border: 'none', borderRadius: 7, fontSize: '0.8rem', cursor: 'pointer' }}
                                                                >
                                                                    ✕
                                                                </button>
                                                            </>
                                                        ) : (
                                                            <>
                                                                <span style={{ flex: 1, fontSize: '0.85rem', color: '#0f172a', fontWeight: 600, wordBreak: 'break-all' }}>
                                                                    {p.valor}
                                                                </span>
                                                                {p.descripcion && (
                                                                    <span style={{ fontSize: '0.75rem', color: '#94a3b8', flex: '0 0 auto', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={p.descripcion}>
                                                                        {p.descripcion}
                                                                    </span>
                                                                )}
                                                                <div style={{ display: 'flex', gap: '0.3rem', flexShrink: 0 }}>
                                                                    <button
                                                                        title="Editar valor"
                                                                        onClick={() => iniciarEdicion(p)}
                                                                        className="icon-btn icon-btn-edit"
                                                                    >✏️</button>
                                                                    <button
                                                                        title="Eliminar parámetro"
                                                                        onClick={() => eliminarParam(p.clave)}
                                                                        className="icon-btn"
                                                                        style={{ color: '#ef4444', background: '#fef2f2', border: '1px solid #fecaca' }}
                                                                    >🗑️</button>
                                                                </div>
                                                            </>
                                                        )}
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* Modal: Nuevo parámetro */}
                            {modalNuevoParam && (
                                <div style={overlayStyle} onClick={e => e.target === e.currentTarget && setModalNuevoParam(false)}>
                                    <div style={modalBoxStyle}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                                                <div style={{ width: 36, height: 36, borderRadius: 10, background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1rem' }}>⚙️</div>
                                                <div>
                                                    <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: '#0f172a' }}>Nuevo parámetro</h3>
                                                    <p style={{ margin: 0, fontSize: '0.78rem', color: '#94a3b8' }}>Agregar clave de configuración</p>
                                                </div>
                                            </div>
                                            <button onClick={() => setModalNuevoParam(false)} style={{ background: 'none', border: 'none', fontSize: '1.2rem', cursor: 'pointer', color: '#94a3b8' }}>✕</button>
                                        </div>
                                        {nuevoParamError && (
                                            <div style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626', padding: '0.6rem 0.85rem', borderRadius: 8, fontSize: '0.82rem', marginBottom: '1rem' }}>⚠️ {nuevoParamError}</div>
                                        )}
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                                            <div className="form-group">
                                                <label className="form-label">Clave <span className="required">*</span></label>
                                                <input id="nuevo-param-clave" className="form-input" value={nuevoParam.clave} onChange={e => setNuevoParam({ ...nuevoParam, clave: e.target.value.toUpperCase().replace(/\s/g, '_') })} placeholder="EJ: MIN_STOCK_GLOBAL" autoFocus />
                                            </div>
                                            <div className="form-group">
                                                <label className="form-label">Valor <span className="required">*</span></label>
                                                <input id="nuevo-param-valor" className="form-input" value={nuevoParam.valor} onChange={e => setNuevoParam({ ...nuevoParam, valor: e.target.value })} placeholder="Valor del parámetro" />
                                            </div>
                                            <div className="form-group">
                                                <label className="form-label">Categoría</label>
                                                <select id="nuevo-param-cat" className="form-input" value={nuevoParam.categoria} onChange={e => setNuevoParam({ ...nuevoParam, categoria: e.target.value })}>
                                                    {['EMPRESA', 'FISCAL', 'INVENTARIO', 'VENTAS', 'SEGURIDAD'].map(c => <option key={c} value={c}>{c}</option>)}
                                                </select>
                                            </div>
                                            <div className="form-group">
                                                <label className="form-label">Descripción (opcional)</label>
                                                <input id="nuevo-param-desc" className="form-input" value={nuevoParam.descripcion} onChange={e => setNuevoParam({ ...nuevoParam, descripcion: e.target.value })} placeholder="Describe el uso de este parámetro" />
                                            </div>
                                        </div>
                                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.6rem', marginTop: '1.5rem' }}>
                                            <button className="btn btn-secondary" onClick={() => setModalNuevoParam(false)}>Cancelar</button>
                                            <button className="btn btn-primary" onClick={crearParam} disabled={nuevoParamSaving}>
                                                {nuevoParamSaving ? '⏳ Guardando...' : '➕ Crear parámetro'}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* ── PLANTILLAS (HU34) ── */}
                    {tab === 'plantillas' && (
                        <div>
                            <h3 style={{ fontSize: '0.85rem', fontWeight: '700', color: '#475569', marginBottom: '0.4rem' }}>
                                Plantillas de configuración
                            </h3>
                            <p style={{ fontSize: '0.82rem', color: '#94a3b8', marginBottom: '1.5rem' }}>
                                Selecciona una plantilla para previsualizar sus parámetros. Luego haz clic en «Aplicar» para sobreescribir la configuración actual.
                            </p>

                            {/* Cards de plantillas */}
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
                                {([
                                    { id: 'REPARACION_TECNICA', icon: '🔧', label: 'Reparación Técnica', desc: 'Taller de reparación de equipos electrónicos con órdenes de servicio técnico.' },
                                    { id: 'RETAIL', icon: '🏪', label: 'Retail / Comercio', desc: 'Tienda minorista con ventas al mostrador, POS y gestión de inventario.' },
                                    { id: 'SERVICIOS', icon: '💼', label: 'Servicios Generales', desc: 'Empresa de servicios con gestión de clientes y facturación por servicio.' },
                                ] as const).map(pl => (
                                    <button
                                        key={pl.id}
                                        id={`plantilla-card-${pl.id}`}
                                        onClick={() => seleccionarPlantilla(pl.id)}
                                        style={{
                                            display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '0.5rem',
                                            padding: '1.25rem', borderRadius: 14, border: `2px solid ${plantillaSeleccionada === pl.id ? '#6366f1' : '#e2e8f0'}`,
                                            background: plantillaSeleccionada === pl.id ? '#f0f0fe' : '#f8fafc',
                                            cursor: 'pointer', textAlign: 'left', transition: 'all 0.15s',
                                            boxShadow: plantillaSeleccionada === pl.id ? '0 0 0 3px rgba(99,102,241,0.18)' : 'none',
                                        }}
                                    >
                                        <span style={{ fontSize: '2rem' }}>{pl.icon}</span>
                                        <span style={{ fontWeight: 700, fontSize: '0.9rem', color: '#0f172a' }}>{pl.label}</span>
                                        <span style={{ fontSize: '0.78rem', color: '#64748b', lineHeight: 1.4 }}>{pl.desc}</span>
                                        {plantillaSeleccionada === pl.id && (
                                            <span style={{ fontSize: '0.72rem', color: '#6366f1', fontWeight: 700 }}>✓ Seleccionada</span>
                                        )}
                                    </button>
                                ))}
                            </div>

                            {/* Preview */}
                            {plantillaSeleccionada && (
                                <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e2e8f0', overflow: 'hidden', marginBottom: '1rem' }}>
                                    <div style={{ padding: '0.75rem 1.25rem', background: '#f8fafc', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#475569' }}>Vista previa — {plantillaSeleccionada}</span>
                                        <button
                                            id="btn-aplicar-plantilla"
                                            onClick={aplicarPlantilla}
                                            disabled={aplicandoPlantilla}
                                            style={{
                                                padding: '0.4rem 1.1rem', background: '#6366f1', color: '#fff',
                                                border: 'none', borderRadius: 8, fontSize: '0.82rem', fontWeight: 700,
                                                cursor: 'pointer', opacity: aplicandoPlantilla ? 0.7 : 1,
                                            }}
                                        >
                                            {aplicandoPlantilla ? '⏳ Aplicando...' : '🚀 Aplicar plantilla'}
                                        </button>
                                    </div>
                                    {loadingPreview ? (
                                        <div style={{ padding: '2rem', textAlign: 'center', color: '#94a3b8' }}>⏳ Cargando preview...</div>
                                    ) : previewPlantilla.length === 0 ? (
                                        <div style={{ padding: '2rem', textAlign: 'center', color: '#94a3b8' }}>Sin parámetros para esta plantilla</div>
                                    ) : (
                                        <div style={{ maxHeight: 320, overflowY: 'auto' }}>
                                            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
                                                <thead>
                                                    <tr style={{ background: '#f1f5f9' }}>
                                                        {['Categoría', 'Clave', 'Valor', 'Descripción'].map(h => (
                                                            <th key={h} style={{ padding: '0.5rem 0.75rem', textAlign: 'left', fontSize: '0.7rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>{h}</th>
                                                        ))}
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {previewPlantilla.map(p => (
                                                        <tr key={p.clave} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                                            <td style={{ padding: '0.45rem 0.75rem' }}>
                                                                <span style={{ fontSize: '0.7rem', fontWeight: 700, background: '#e0e7ff', color: '#4338ca', padding: '0.15rem 0.5rem', borderRadius: 20 }}>{p.categoria}</span>
                                                            </td>
                                                            <td style={{ padding: '0.45rem 0.75rem' }}><code style={{ fontFamily: 'monospace', fontSize: '0.78rem', color: '#475569' }}>{p.clave}</code></td>
                                                            <td style={{ padding: '0.45rem 0.75rem', fontWeight: 600, color: '#0f172a' }}>{p.valor}</td>
                                                            <td style={{ padding: '0.45rem 0.75rem', color: '#64748b', fontSize: '0.78rem' }}>{p.descripcion}</td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    )}
                                </div>
                            )}

                            {plantillaMsg && (
                                <div style={{
                                    padding: '0.75rem 1rem', borderRadius: 10, fontSize: '0.85rem', fontWeight: 600,
                                    background: plantillaMsg.startsWith('✅') ? '#f0fdf4' : '#fef2f2',
                                    border: `1px solid ${plantillaMsg.startsWith('✅') ? '#bbf7d0' : '#fecaca'}`,
                                    color: plantillaMsg.startsWith('✅') ? '#15803d' : '#dc2626',
                                }}>
                                    {plantillaMsg}
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
