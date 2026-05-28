import { useState, useEffect } from 'react';
import { clienteService } from '../services/clienteService';
import type { Cliente, ClientePerfil } from '../types';
import './Clientes.css';
import ActionMenu from '../components/ActionMenu';

const money = (n: number) =>
    Number(n || 0).toLocaleString('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 });

const shortDate = (iso?: string) => iso
    ? new Date(iso).toLocaleString('es-CO', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
    : 'Sin actividad';

// ─────────────────────────────────────────────
// Modal crear / editar cliente
// ─────────────────────────────────────────────
interface ModalProps {
    cliente?: Cliente | null;
    onClose: () => void;
    onSaved: () => void;
}

const ClienteModal = ({ cliente, onClose, onSaved }: ModalProps) => {
    const isEdit = !!cliente;
    const [form, setForm] = useState({
        nombre: cliente?.nombre ?? '',
        telefono: cliente?.telefono ?? '',
        email: cliente?.email ?? '',
        documento: cliente?.documento ?? '',
        direccion: cliente?.direccion ?? '',
        ciudad: cliente?.ciudad ?? 'Cali',
        barrio: cliente?.barrio ?? '',
        notas: cliente?.notas ?? '',
    });
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
        setForm({ ...form, [e.target.name]: e.target.value });

    // Solo permite dígitos en campos numéricos
    const soloNumeros = (e: React.KeyboardEvent<HTMLInputElement>) => {
        const permitidas = ['Backspace', 'Delete', 'ArrowLeft', 'ArrowRight', 'Tab', 'Home', 'End'];
        if (!permitidas.includes(e.key) && !/^\d$/.test(e.key)) {
            e.preventDefault();
        }
    };

    const handleSubmit = async () => {
        if (!form.nombre.trim()) { setError('El nombre es obligatorio'); return; }
        setLoading(true); setError('');
        try {
            if (isEdit && cliente) {
                await clienteService.updateCliente(cliente.id, form);
            } else {
                await clienteService.crearCliente({ ...form, activo: true });
            }
            onSaved(); onClose();
        } catch (err: any) {
            const msg = err.response?.data;
            setError(typeof msg === 'string' ? msg : (msg?.message ?? 'Error al guardar el cliente'));
        } finally { setLoading(false); }
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content" onClick={e => e.stopPropagation()}>
                <div className="modal-header">
                    <h2>{isEdit ? 'Editar Cliente' : 'Nuevo Cliente'}</h2>
                    <button className="modal-close" onClick={onClose}>×</button>
                </div>

                <div className="modal-body">
                    {error && <div className="modal-error">{error}</div>}

                    <div className="form-group">
                        <label>Nombre *</label>
                        <input name="nombre" value={form.nombre} onChange={handleChange}
                            placeholder="Nombre completo" />
                    </div>

                    <div className="form-row">
                        <div className="form-group">
                            <label>NIT / Cédula</label>
                            <input name="documento" value={form.documento} onChange={handleChange}
                                onKeyDown={soloNumeros}
                                inputMode="numeric"
                                pattern="[0-9]*"
                                placeholder="Solo números" />
                        </div>
                        <div className="form-group">
                            <label>Teléfono</label>
                            <input name="telefono" value={form.telefono} onChange={handleChange}
                                onKeyDown={soloNumeros}
                                inputMode="numeric"
                                pattern="[0-9]*"
                                placeholder="300 000 0000" />
                        </div>
                    </div>

                    <div className="form-group">
                        <label>Email</label>
                        <input name="email" type="email" value={form.email} onChange={handleChange}
                            placeholder="correo@ejemplo.com" />
                    </div>

                    <div className="form-row">
                        <div className="form-group">
                            <label>Dirección</label>
                            <input name="direccion" value={form.direccion} onChange={handleChange}
                                placeholder="Calle / Carrera / Número" />
                        </div>
                        <div className="form-group">
                            <label>Ciudad</label>
                            <input name="ciudad" value={form.ciudad} onChange={handleChange}
                                placeholder="Cali" />
                        </div>
                    </div>

                    <div className="form-group">
                        <label>Barrio</label>
                        <input name="barrio" value={form.barrio} onChange={handleChange}
                            placeholder="Barrio o sector en Cali" />
                    </div>

                    <div className="form-group">
                        <label>Notas</label>
                        <textarea name="notas" value={form.notas} onChange={handleChange}
                            rows={3} placeholder="Observaciones, historial, preferencias..." />
                    </div>
                </div>

                <div className="modal-footer">
                    <button className="btn-secondary" onClick={onClose}>Cancelar</button>
                    <button className="btn-primary" onClick={handleSubmit} disabled={loading}>
                        {loading ? 'Guardando...' : isEdit ? 'Guardar cambios' : 'Crear cliente'}
                    </button>
                </div>
            </div>
        </div>
    );
};

const PerfilClienteModal = ({ cliente, onClose }: { cliente: Cliente; onClose: () => void }) => {
    const [perfil, setPerfil] = useState<ClientePerfil | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        setLoading(true);
        clienteService.getPerfilCliente(cliente.id)
            .then(setPerfil)
            .catch(() => setError('No se pudo cargar el perfil del cliente'))
            .finally(() => setLoading(false));
    }, [cliente.id]);

    const c = perfil?.cliente ?? cliente;

    return (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
            <div className="modal-box" style={{ maxWidth: '720px', padding: 0, overflow: 'hidden' }}>

                {/* ── Header oscuro estilo Entregas ── */}
                <div style={{
                    background: 'linear-gradient(135deg, #0f172a 0%, #1F3864 100%)',
                    padding: '1.35rem 1.55rem',
                    display: 'flex',
                    alignItems: 'flex-start',
                    justifyContent: 'space-between',
                    gap: '1rem',
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                        <div style={{
                            width: '46px', height: '46px', borderRadius: '12px',
                            background: 'rgba(255,255,255,0.12)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: '1.35rem',
                        }}>👤</div>
                        <div>
                            <div style={{ color: 'rgba(255,255,255,0.58)', fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                                Perfil 360° del cliente
                            </div>
                            <h2 style={{ color: '#fff', fontSize: '1.1rem', margin: '0.15rem 0 0' }}>{c.nombre}</h2>
                            {c.telefono && (
                                <p style={{ color: 'rgba(255,255,255,0.62)', fontSize: '0.78rem', margin: '0.2rem 0 0' }}>
                                    📞 {c.telefono}
                                </p>
                            )}
                        </div>
                    </div>
                    <button
                        className="modal-close"
                        onClick={onClose}
                        style={{ color: '#fff', borderColor: 'rgba(255,255,255,0.2)', background: 'rgba(255,255,255,0.12)' }}
                    >✕</button>
                </div>

                {/* ── Cuerpo con scroll ── */}
                <div style={{ padding: '1.25rem 1.55rem', maxHeight: '75vh', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    {loading ? (
                        <div className="loading">Cargando historial...</div>
                    ) : error ? (
                        <div className="modal-error">{error}</div>
                    ) : perfil && (<>

                        {/* KPIs */}
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.6rem' }}>
                            {[
                                { label: 'Total comprado', value: money(perfil.kpis.totalComprado), color: '#1F3864' },
                                { label: 'Frecuencia', value: perfil.kpis.frecuenciaTotal, color: '#15803d' },
                                { label: 'Ventas', value: perfil.kpis.cantidadVentas, color: '#0f172a' },
                                { label: 'Órdenes', value: perfil.kpis.cantidadOrdenes, color: '#0f172a' },
                            ].map(k => (
                                <div key={k.label} style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '0.65rem 0.75rem', textAlign: 'center' }}>
                                    <div style={{ color: k.color, fontSize: '1.1rem', fontWeight: 800 }}>{k.value}</div>
                                    <div style={{ color: '#94a3b8', fontSize: '0.68rem', fontWeight: 700, textTransform: 'uppercase', marginTop: '0.15rem' }}>{k.label}</div>
                                </div>
                            ))}
                        </div>

                        {/* Datos del cliente */}
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '0.55rem' }}>
                            {[
                                { label: 'Documento', value: c.documento || '—' },
                                { label: 'Email', value: c.email || '—' },
                                { label: 'Ciudad / Barrio', value: [c.ciudad, c.barrio].filter(Boolean).join(', ') || '—' },
                                { label: 'Última actividad', value: shortDate(perfil.kpis.ultimaActividad) },
                                { label: 'Dirección', value: c.direccion || '—' },
                                { label: 'Notas', value: c.notas || '—' },
                            ].map(row => (
                                <div key={row.label} style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '0.6rem 0.75rem' }}>
                                    <div style={{ color: '#94a3b8', fontSize: '0.68rem', fontWeight: 700, textTransform: 'uppercase', marginBottom: '0.2rem' }}>{row.label}</div>
                                    <div style={{ color: '#0f172a', fontSize: '0.84rem', fontWeight: 600, wordBreak: 'break-word' }}>{row.value}</div>
                                </div>
                            ))}
                        </div>

                        {/* Historial ventas */}
                        <div>
                            <div style={{ color: '#64748b', fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '0.45rem' }}>
                                Historial de ventas
                            </div>
                            <table className="data-table" style={{ fontSize: '0.82rem' }}>
                                <thead>
                                    <tr><th>Fecha</th><th>Estado</th><th>Total</th><th>Vendedor</th><th>Items</th></tr>
                                </thead>
                                <tbody>
                                    {perfil.ventas.length === 0
                                        ? <tr><td colSpan={5} className="empty-row">Sin ventas registradas</td></tr>
                                        : perfil.ventas.map(v => (
                                            <tr key={v.id}>
                                                <td>{shortDate(v.fecha)}</td>
                                                <td><span className={`badge ${v.estado === 'COMPLETADA' ? 'badge-active' : v.estado === 'CANCELADA' ? 'badge-inactive' : 'badge-yellow'}`}>{v.estado}</span></td>
                                                <td style={{ fontWeight: 600 }}>{money(v.total)}</td>
                                                <td>{v.vendedor?.nombre ?? '—'}</td>
                                                <td style={{ textAlign: 'center' }}>{v.items?.length ?? 0}</td>
                                            </tr>
                                        ))}
                                </tbody>
                            </table>
                        </div>

                        {/* Historial órdenes */}
                        <div>
                            <div style={{ color: '#64748b', fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '0.45rem' }}>
                                Historial de órdenes de servicio
                            </div>
                            <table className="data-table" style={{ fontSize: '0.82rem' }}>
                                <thead>
                                    <tr><th>Fecha</th><th>Tipo</th><th>Estado</th><th>Pago</th><th>Total</th><th>Técnico</th></tr>
                                </thead>
                                <tbody>
                                    {perfil.ordenes.length === 0
                                        ? <tr><td colSpan={6} className="empty-row">Sin órdenes registradas</td></tr>
                                        : perfil.ordenes.map(o => (
                                            <tr key={o.id}>
                                                <td>{shortDate(o.fechaCreacion)}</td>
                                                <td>{o.tipo}</td>
                                                <td><span className={`badge ${o.estado === 'FINALIZADO' ? 'badge-active' : o.estado === 'CANCELADO' ? 'badge-inactive' : 'badge-yellow'}`}>{o.estado}</span></td>
                                                <td>{o.estadoPago}</td>
                                                <td style={{ fontWeight: 600 }}>{money(o.totalOrden ?? 0)}</td>
                                                <td>{o.tecnico?.nombre ?? '—'}</td>
                                            </tr>
                                        ))}
                                </tbody>
                            </table>
                        </div>

                        {/* Historial devoluciones y garantías */}
                        <div>
                            <div style={{ color: '#64748b', fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '0.45rem' }}>
                                Historial de devoluciones y garantías
                            </div>
                            <table className="data-table" style={{ fontSize: '0.82rem' }}>
                                <thead>
                                    <tr><th>Fecha</th><th>Tipo</th><th>Estado</th><th>Acción Dinero</th><th>Monto Devuelto</th><th>Razón</th></tr>
                                </thead>
                                <tbody>
                                    {!perfil.devoluciones || perfil.devoluciones.length === 0
                                        ? <tr><td colSpan={6} className="empty-row">Sin devoluciones ni garantías registradas</td></tr>
                                        : perfil.devoluciones.map(d => (
                                            <tr key={d.id}>
                                                <td>{shortDate(d.fecha)}</td>
                                                <td>
                                                    <span className={`badge ${d.tipo === 'DEVOLUCION' ? 'badge-inactive' : 'badge-yellow'}`}>
                                                        {d.tipo}
                                                    </span>
                                                </td>
                                                <td>{d.estado}</td>
                                                <td>{d.accionDinero}</td>
                                                <td style={{ fontWeight: 600, color: d.montoDevuelto > 0 ? '#b91c1c' : '#0f172a' }}>
                                                    {money(d.montoDevuelto)}
                                                </td>
                                                <td title={d.notas}>{d.razon}</td>
                                            </tr>
                                        ))}
                                </tbody>
                            </table>
                        </div>

                    </>)}
                </div>

                {/* Footer */}
                <div className="modal-footer">
                    <button className="btn btn-secondary" onClick={onClose}>Cerrar</button>
                </div>
            </div>
        </div>
    );
};

// ─────────────────────────────────────────────
// Página principal
// ─────────────────────────────────────────────
const Clientes = () => {
    const [clientes, setClientes] = useState<Cliente[]>([]);
    const [filtrados, setFiltrados] = useState<Cliente[]>([]);
    const [busqueda, setBusqueda] = useState('');
    const [soloActivos, setSoloActivos] = useState(true);
    const [loading, setLoading] = useState(true);
    const [modalOpen, setModalOpen] = useState(false);
    const [clienteSel, setClienteSel] = useState<Cliente | null>(null);
    const [perfilCliente, setPerfilCliente] = useState<Cliente | null>(null);

    const cargar = async () => {
        setLoading(true);
        try { setClientes(await clienteService.getClientes()); }
        catch { console.error('Error cargando clientes'); }
        finally { setLoading(false); }
    };

    useEffect(() => { cargar(); }, []);

    useEffect(() => {
        let lista = soloActivos ? clientes.filter(c => c.activo) : clientes;
        if (busqueda.trim()) {
            const q = busqueda.toLowerCase();
            lista = lista.filter(c =>
                c.nombre.toLowerCase().includes(q) ||
                (c.telefono ?? '').toLowerCase().includes(q) ||
                (c.email ?? '').toLowerCase().includes(q) ||
                (c.documento ?? '').toLowerCase().includes(q) ||
                (c.ciudad ?? '').toLowerCase().includes(q) ||
                (c.barrio ?? '').toLowerCase().includes(q)
            );
        }
        setFiltrados(lista);
    }, [clientes, busqueda, soloActivos]);

    const abrirNuevo = () => { setClienteSel(null); setModalOpen(true); };
    const abrirEditar = (c: Cliente) => { setClienteSel(c); setModalOpen(true); };

    const toggleActivo = async (c: Cliente) => {
        if (!confirm(`¿${c.activo ? 'Desactivar' : 'Activar'} a "${c.nombre}"?`)) return;
        try { await clienteService.setClienteActivo(c.id, !c.activo); cargar(); }
        catch { alert('Error al cambiar estado'); }
    };

    const totalActivos = clientes.filter(c => c.activo).length;
    const totalInactivos = clientes.filter(c => !c.activo).length;

    return (
        <div className="page-container">

            <div className="page-header">
                <div>
                    <h1 className="page-title">Clientes</h1>
                    <p className="page-subtitle">Gestión de clientes registrados</p>
                </div>
                <button className="btn-primary" onClick={abrirNuevo}>+ Nuevo Cliente</button>
            </div>

            <div className="stats-row">
                <div className="stat-card">
                    <span className="stat-number">{clientes.length}</span>
                    <span className="stat-label">Total</span>
                </div>
                <div className="stat-card green">
                    <span className="stat-number">{totalActivos}</span>
                    <span className="stat-label">Activos</span>
                </div>
                <div className="stat-card gray">
                    <span className="stat-number">{totalInactivos}</span>
                    <span className="stat-label">Inactivos</span>
                </div>
            </div>

            <div className="filters-bar">
                <input className="search-input"
                    placeholder="Buscar por nombre, teléfono, documento, ciudad o barrio..."
                    value={busqueda} onChange={e => setBusqueda(e.target.value)} />
                <label className="toggle-label">
                    <input type="checkbox" checked={soloActivos}
                        onChange={e => setSoloActivos(e.target.checked)} />
                    Solo activos
                </label>
            </div>

            {loading ? (
                <div className="loading">Cargando clientes...</div>
            ) : (
                <div className="table-wrapper">
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th>Nombre</th>
                                <th>Documento</th>
                                <th>Teléfono</th>
                                <th>Ciudad</th>
                                <th>Dirección</th>
                                <th>Estado</th>
                                <th>Acciones</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filtrados.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="empty-row">No hay clientes que mostrar</td>
                                </tr>
                            ) : filtrados.map(c => (
                                <tr key={c.id} className={!c.activo ? 'row-inactive' : ''} onClick={() => setPerfilCliente(c)} style={{ cursor: 'pointer' }}>
                                    <td onClick={e => e.stopPropagation()}>
                                        <div className="cliente-nombre">{c.nombre}</div>
                                        {c.email && <div className="cliente-sub">{c.email}</div>}
                                    </td>
                                    <td>{c.documento ?? '—'}</td>
                                    <td>{c.telefono ?? '—'}</td>
                                    <td>{c.ciudad ?? '—'}</td>
                                    <td>
                                        {c.direccion
                                            ? <div className="cliente-sub">{c.direccion}{c.barrio ? `, ${c.barrio}` : ''}</div>
                                            : '—'}
                                    </td>
                                    <td>
                                        <span className={`badge ${c.activo ? 'badge-active' : 'badge-inactive'}`}>
                                            {c.activo ? 'Activo' : 'Inactivo'}
                                        </span>
                                    </td>
                                    <td>
                                        <ActionMenu items={[
                                            {
                                                label: 'Editar cliente',
                                                icon: '✏️',
                                                onClick: () => abrirEditar(c),
                                            },
                                            {
                                                label: c.activo ? 'Desactivar' : 'Activar',
                                                icon: c.activo ? '🚫' : '✅',
                                                variant: c.activo ? 'danger' : 'success',
                                                onClick: () => toggleActivo(c),
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
                <ClienteModal
                    cliente={clienteSel}
                    onClose={() => setModalOpen(false)}
                    onSaved={cargar}
                />
            )}
            {perfilCliente && (
                <PerfilClienteModal
                    cliente={perfilCliente}
                    onClose={() => setPerfilCliente(null)}
                />
            )}
        </div>
    );
};

export default Clientes;
