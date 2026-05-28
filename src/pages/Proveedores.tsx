import { useState, useEffect } from 'react';
import { proveedorService } from '../services/proveedorService';
import type { Proveedor } from '../types';
import './Clientes.css'; // reutiliza estilos
import ActionMenu from '../components/ActionMenu';

// ── Modal ─────────────────────────────────────────────────────────────────────
const ProveedorModal = ({ proveedor, onClose, onSaved }:
    { proveedor?: Proveedor | null; onClose: () => void; onSaved: () => void }) => {
    const isEdit = !!proveedor;
    const [form, setForm] = useState({
        nombre: proveedor?.nombre ?? '',
        nit: proveedor?.nit ?? '',
        telefono: proveedor?.telefono ?? '',
        email: proveedor?.email ?? '',
        direccion: proveedor?.direccion ?? '',
        ciudad: proveedor?.ciudad ?? 'Cali',
        contacto: proveedor?.contacto ?? '',
        notas: proveedor?.notas ?? '',
    });
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
        setForm({ ...form, [e.target.name]: e.target.value });

    const handleSubmit = async () => {
        if (!form.nombre.trim()) { setError('El nombre es obligatorio'); return; }
        setLoading(true); setError('');
        try {
            if (isEdit && proveedor) await proveedorService.update(proveedor.id, form);
            else await proveedorService.crear({ ...form, activo: true });
            onSaved(); onClose();
        } catch (err: any) {
            const msg = err.response?.data;
            setError(typeof msg === 'string' ? msg : (msg?.message ?? 'Error al guardar'));
        } finally { setLoading(false); }
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content" onClick={e => e.stopPropagation()}>
                <div className="modal-header">
                    <h2>{isEdit ? 'Editar Proveedor' : 'Nuevo Proveedor'}</h2>
                    <button className="modal-close" onClick={onClose}>×</button>
                </div>
                <div className="modal-body">
                    {error && <div className="modal-error">{error}</div>}
                    <div className="form-row">
                        <div className="form-group">
                            <label>Nombre *</label>
                            <input name="nombre" value={form.nombre} onChange={handleChange} placeholder="Nombre empresa / persona" />
                        </div>
                        <div className="form-group">
                            <label>NIT</label>
                            <input name="nit" value={form.nit} onChange={handleChange} placeholder="900.000.000-0" />
                        </div>
                    </div>
                    <div className="form-row">
                        <div className="form-group">
                            <label>Teléfono</label>
                            <input name="telefono" value={form.telefono} onChange={handleChange} placeholder="300 000 0000" />
                        </div>
                        <div className="form-group">
                            <label>Email</label>
                            <input name="email" type="email" value={form.email} onChange={handleChange} placeholder="correo@proveedor.com" />
                        </div>
                    </div>
                    <div className="form-row">
                        <div className="form-group">
                            <label>Contacto</label>
                            <input name="contacto" value={form.contacto} onChange={handleChange} placeholder="Nombre persona de contacto" />
                        </div>
                        <div className="form-group">
                            <label>Ciudad</label>
                            <input name="ciudad" value={form.ciudad} onChange={handleChange} placeholder="Cali" />
                        </div>
                    </div>
                    <div className="form-group">
                        <label>Dirección</label>
                        <input name="direccion" value={form.direccion} onChange={handleChange} placeholder="Dirección" />
                    </div>
                    <div className="form-group">
                        <label>Notas</label>
                        <textarea name="notas" value={form.notas} onChange={handleChange} rows={2} placeholder="Observaciones..." />
                    </div>
                </div>
                <div className="modal-footer">
                    <button className="btn-secondary" onClick={onClose}>Cancelar</button>
                    <button className="btn-primary" onClick={handleSubmit} disabled={loading}>
                        {loading ? 'Guardando...' : isEdit ? 'Guardar cambios' : 'Crear proveedor'}
                    </button>
                </div>
            </div>
        </div>
    );
};

// ── Página ────────────────────────────────────────────────────────────────────
const Proveedores = () => {
    const [proveedores, setProveedores] = useState<Proveedor[]>([]);
    const [filtrados, setFiltrados] = useState<Proveedor[]>([]);
    const [busqueda, setBusqueda] = useState('');
    const [soloActivos, setSoloActivos] = useState(true);
    const [loading, setLoading] = useState(true);
    const [modalOpen, setModalOpen] = useState(false);
    const [seleccionado, setSeleccionado] = useState<Proveedor | null>(null);

    const cargar = async () => {
        setLoading(true);
        try { setProveedores(await proveedorService.getProveedores()); }
        catch { console.error('Error cargando proveedores'); }
        finally { setLoading(false); }
    };

    useEffect(() => { cargar(); }, []);

    useEffect(() => {
        let lista = soloActivos ? proveedores.filter(p => p.activo) : proveedores;
        if (busqueda.trim()) {
            const q = busqueda.toLowerCase();
            lista = lista.filter(p =>
                p.nombre.toLowerCase().includes(q) ||
                (p.nit ?? '').toLowerCase().includes(q) ||
                (p.contacto ?? '').toLowerCase().includes(q) ||
                (p.ciudad ?? '').toLowerCase().includes(q)
            );
        }
        setFiltrados(lista);
    }, [proveedores, busqueda, soloActivos]);

    const toggleActivo = async (p: Proveedor) => {
        if (!confirm(`¿${p.activo ? 'Desactivar' : 'Activar'} a "${p.nombre}"?`)) return;
        try { await proveedorService.setActivo(p.id, !p.activo); cargar(); }
        catch { alert('Error al cambiar estado'); }
    };

    return (
        <div className="page-container">
            <div className="page-header">
                <div>
                    <h1 className="page-title">Proveedores</h1>
                    <p className="page-subtitle">Empresas y personas que suministran productos</p>
                </div>
                <button className="btn-primary" onClick={() => { setSeleccionado(null); setModalOpen(true); }}>
                    + Nuevo Proveedor
                </button>
            </div>

            <div className="stats-row">
                <div className="stat-card">
                    <span className="stat-number">{proveedores.length}</span>
                    <span className="stat-label">Total</span>
                </div>
                <div className="stat-card green">
                    <span className="stat-number">{proveedores.filter(p => p.activo).length}</span>
                    <span className="stat-label">Activos</span>
                </div>
            </div>

            <div className="filters-bar">
                <input className="search-input"
                    placeholder="Buscar por nombre, NIT, contacto o ciudad..."
                    value={busqueda} onChange={e => setBusqueda(e.target.value)} />
                <label className="toggle-label">
                    <input type="checkbox" checked={soloActivos} onChange={e => setSoloActivos(e.target.checked)} />
                    Solo activos
                </label>
            </div>

            {loading ? <div className="loading">Cargando proveedores...</div> : (
                <div className="table-wrapper">
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th>Nombre</th><th>NIT</th><th>Contacto</th>
                                <th>Teléfono</th><th>Ciudad</th><th>Estado</th><th>Acciones</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filtrados.length === 0 ? (
                                <tr><td colSpan={7} className="empty-row">No hay proveedores</td></tr>
                            ) : filtrados.map(p => (
                                <tr key={p.id} className={!p.activo ? 'row-inactive' : ''}>
                                    <td>
                                        <div className="cliente-nombre">{p.nombre}</div>
                                        {p.email && <div className="cliente-sub">{p.email}</div>}
                                    </td>
                                    <td>{p.nit ?? '—'}</td>
                                    <td>{p.contacto ?? '—'}</td>
                                    <td>{p.telefono ?? '—'}</td>
                                    <td>{p.ciudad ?? '—'}</td>
                                    <td>
                                        <span className={`badge ${p.activo ? 'badge-active' : 'badge-inactive'}`}>
                                            {p.activo ? 'Activo' : 'Inactivo'}
                                        </span>
                                    </td>
                                    <td>
                                        <ActionMenu items={[
                                            {
                                                label: 'Editar proveedor',
                                                icon: '✏️',
                                                onClick: () => { setSeleccionado(p); setModalOpen(true); },
                                            },
                                            {
                                                label: p.activo ? 'Desactivar' : 'Activar',
                                                icon: p.activo ? '🚫' : '✅',
                                                variant: p.activo ? 'danger' : 'success',
                                                onClick: () => toggleActivo(p),
                                            },
                                        ]} />
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {modalOpen && (
                <ProveedorModal proveedor={seleccionado}
                    onClose={() => setModalOpen(false)} onSaved={cargar} />
            )}
        </div>
    );
};

export default Proveedores;
