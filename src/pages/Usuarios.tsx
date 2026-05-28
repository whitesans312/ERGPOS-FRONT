import React, { useState, useEffect } from 'react';
import { usuarioService } from '../services/usuarioService';
import { rolService } from '../services/rolService';
import { authService } from '../services/authService';
import type { Usuario, Rol } from '../types';
import CrearUsuarioModal from '../components/CrearUsuarioModal';
import EditarUsuarioModal from '../components/EditarUsuarioModal';
import ActionMenu from '../components/ActionMenu';

const Usuarios: React.FC = () => {
    const [usuarios, setUsuarios] = useState<Usuario[]>([]);
    const [roles, setRoles] = useState<Rol[]>([]);
    const [loading, setLoading] = useState(true);
    const [busqueda, setBusqueda] = useState('');
    const [filtroEstado, setFiltroEstado] = useState<'todos' | 'activos' | 'inactivos'>('todos');

    const [modalCrear, setModalCrear] = useState(false);
    const [modalEditar, setModalEditar] = useState(false);
    const [usuarioEditar, setUsuarioEditar] = useState<Usuario | null>(null);

    // Usuario actualmente logueado (para proteger auto-desactivación)
    const usuarioActual = authService.getUser();

    const cargarDatos = async () => {
        try {
            setLoading(true);
            const [u, r] = await Promise.all([
                usuarioService.getUsuarios(),
                rolService.getRoles()
            ]);
            setUsuarios(u);
            setRoles(r);
        } catch (err) {
            console.error('Error cargando usuarios:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { cargarDatos(); }, []);

    const handleToggleActivo = async (usuario: Usuario) => {
        // Protección: no permitir que el usuario actual se desactive a sí mismo
        if (usuarioActual && usuario.id === usuarioActual.id) {
            alert('⚠️ No puedes desactivar tu propia cuenta mientras tienes sesión activa.\nPide a otro administrador que realice este cambio.');
            return;
        }
        const accion = usuario.activo ? 'desactivar' : 'activar';
        if (!confirm(`¿Deseas ${accion} al usuario "${usuario.nombre}"?`)) return;
        try {
            await usuarioService.setUsuarioActivo(usuario.id, !usuario.activo);
            cargarDatos();
        } catch (err) {
            console.error('Error al cambiar estado:', err);
            alert('Error al cambiar el estado del usuario.');
        }
    };

    const usuariosFiltrados = usuarios.filter(u => {
        const matchBusqueda = u.nombre.toLowerCase().includes(busqueda.toLowerCase())
            || u.email.toLowerCase().includes(busqueda.toLowerCase());
        const matchEstado = filtroEstado === 'todos'
            ? true
            : filtroEstado === 'activos' ? u.activo : !u.activo;
        return matchBusqueda && matchEstado;
    });

    const totalActivos = usuarios.filter(u => u.activo).length;

    return (
        <div className="page-container">

            {/* HEADER */}
            <div className="page-header">
                <div className="page-header-left">
                    <h1 className="page-title">👥 Usuarios</h1>
                    <span className="page-subtitle">Gestión de empleados y roles del sistema</span>
                </div>
                <button className="action-btn action-btn-primary" onClick={() => setModalCrear(true)}>
                    + Nuevo Usuario
                </button>
            </div>

            {/* STATS */}
            <div className="stats-grid">
                <div className="stat-card">
                    <span className="stat-card-label">Total usuarios</span>
                    <span className="stat-card-value">{usuarios.length}</span>
                </div>
                <div className="stat-card">
                    <span className="stat-card-label">Activos</span>
                    <span className="stat-card-value" style={{ color: '#22c55e' }}>{totalActivos}</span>
                </div>
                <div className="stat-card">
                    <span className="stat-card-label">Inactivos</span>
                    <span className="stat-card-value" style={{ color: '#ef4444' }}>{usuarios.length - totalActivos}</span>
                </div>
                <div className="stat-card">
                    <span className="stat-card-label">Roles</span>
                    <span className="stat-card-value">{roles.length}</span>
                </div>
            </div>

            {/* TOOLBAR */}
            <div className="toolbar">
                <div className="toolbar-left">
                    <div className="search-bar">
                        <span>🔍</span>
                        <input
                            type="text"
                            placeholder="Buscar por nombre o email..."
                            value={busqueda}
                            onChange={e => setBusqueda(e.target.value)}
                        />
                    </div>
                </div>
                <div className="toolbar-right">
                    {(['todos', 'activos', 'inactivos'] as const).map(f => (
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
                    <div className="loading-state">⏳ Cargando usuarios...</div>
                ) : usuariosFiltrados.length === 0 ? (
                    <div className="empty-state">
                        <span className="empty-state-icon">👥</span>
                        <h3>Sin resultados</h3>
                        <p>No se encontraron usuarios con ese criterio</p>
                    </div>
                ) : (
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th>Usuario</th>
                                <th>Email</th>
                                <th>Teléfono</th>
                                <th>Rol</th>
                                <th>Estado</th>
                                <th>Acciones</th>
                            </tr>
                        </thead>
                        <tbody>
                            {usuariosFiltrados.map(u => (
                                <tr key={u.id}>
                                    <td>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                                            <div style={{
                                                width: '32px', height: '32px',
                                                borderRadius: '50%',
                                                background: 'linear-gradient(135deg, #3b82f6, #7c3aed)',
                                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                color: 'white', fontSize: '0.75rem', fontWeight: '700', flexShrink: 0
                                            }}>
                                                {u.nombre.charAt(0).toUpperCase()}
                                            </div>
                                            <span style={{ fontWeight: '600', color: '#0f172a' }}>{u.nombre}</span>
                                        </div>
                                    </td>
                                    <td style={{ color: '#64748b' }}>{u.email}</td>
                                    <td style={{ color: '#64748b' }}>{(u as any).telefono || '—'}</td>
                                    <td>
                                        <span className={`badge ${u.rol.nombre === 'ADMIN' ? 'badge-red' :
                                                u.rol.nombre === 'VENDEDOR' ? 'badge-green' :
                                                    u.rol.nombre === 'INVENTARIO' ? 'badge-blue' : 'badge-yellow'
                                            }`}>
                                            {u.rol.nombre}
                                        </span>
                                    </td>
                                    <td>
                                        <span className={`badge ${u.activo ? 'badge-green' : 'badge-gray'}`}>
                                            {u.activo ? '● Activo' : '○ Inactivo'}
                                        </span>
                                    </td>
                                    <td>
                                        <ActionMenu items={[
                                            {
                                                label: 'Editar usuario',
                                                icon: '✏️',
                                                onClick: () => { setUsuarioEditar(u); setModalEditar(true); },
                                            },
                                            {
                                                label: u.activo ? 'Desactivar usuario' : 'Activar usuario',
                                                icon: u.activo ? '🔴' : '🟢',
                                                variant: u.activo ? 'danger' : 'success',
                                                onClick: () => handleToggleActivo(u),
                                                disabled: !!(usuarioActual && u.id === usuarioActual.id),
                                            },
                                        ]} />
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>

            {/* MODALES */}
            <CrearUsuarioModal
                isOpen={modalCrear}
                onClose={() => setModalCrear(false)}
                onUsuarioCreado={cargarDatos}
                roles={roles}
            />
            <EditarUsuarioModal
                isOpen={modalEditar}
                onClose={() => { setModalEditar(false); setUsuarioEditar(null); }}
                onUsuarioActualizado={cargarDatos}
                usuario={usuarioEditar}
                roles={roles}
            />
        </div>
    );
};

export default Usuarios;
