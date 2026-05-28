import React, { useState } from 'react';
import { authService } from '../services/authService';
import api from '../services/api';

const Perfil: React.FC = () => {
    const user = authService.getUser();
    const [tab, setTab] = useState<'info' | 'password'>('info');
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState('');
    const [error, setError] = useState('');

    const [formInfo, setFormInfo] = useState({
        nombre: user?.nombre ?? '',
        telefono: (user as any)?.telefono ?? '',
    });

    const [formPass, setFormPass] = useState({
        nueva: '',
        confirmar: '',
    });

    const getRolColor = (rol: string) => {
        switch (rol) {
            case 'ADMIN': return { bg: '#fee2e2', color: '#dc2626' };
            case 'VENDEDOR': return { bg: '#dcfce7', color: '#16a34a' };
            case 'INVENTARIO': return { bg: '#dbeafe', color: '#1d4ed8' };
            case 'ENTREGAS': return { bg: '#fef9c3', color: '#a16207' };
            default: return { bg: '#f1f5f9', color: '#64748b' };
        }
    };
    const rolStyle = getRolColor(user?.rol?.nombre ?? '');

    const handleGuardarInfo = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        setSuccess('');
        try {
            await api.put(`/usuarios/${user?.id}`, {
                nombre: formInfo.nombre,
                email: user?.email,
                telefono: formInfo.telefono || null,
                rol: { id: user?.rol?.id }
            });
            // Actualizar localStorage
            const updated = { ...user!, nombre: formInfo.nombre, telefono: formInfo.telefono };
            authService.setUser(updated);
            setSuccess('Perfil actualizado correctamente');
        } catch (err: any) {
            const msg = err.response?.data;
            setError(typeof msg === 'string' ? msg : (msg?.message ?? 'Error al actualizar el perfil'));
        } finally {
            setLoading(false);
        }
    };

    const handleCambiarPassword = async (e: React.FormEvent) => {
        e.preventDefault();
        if (formPass.nueva !== formPass.confirmar) {
            setError('Las contraseñas no coinciden');
            return;
        }
        if (formPass.nueva.length < 6) {
            setError('La contraseña debe tener al menos 6 caracteres');
            return;
        }
        setLoading(true);
        setError('');
        setSuccess('');
        try {
            await api.patch(`/usuarios/${user?.id}/password`, { password: formPass.nueva });
            setSuccess('Contraseña actualizada correctamente');
            setFormPass({ nueva: '', confirmar: '' });
        } catch (err: any) {
            const msg2 = err.response?.data;
            setError(typeof msg2 === 'string' ? msg2 : (msg2?.message ?? 'Error al cambiar la contraseña'));
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="page-container">

            {/* HEADER */}
            <div className="page-header">
                <div className="page-header-left">
                    <h1 className="page-title">👤 Mi Perfil</h1>
                    <span className="page-subtitle">Gestiona tu información personal</span>
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr', gap: '1.25rem', alignItems: 'start' }}>

                {/* TARJETA PERFIL */}
                <div className="card">
                    <div className="card-body" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem', padding: '2rem 1.5rem' }}>
                        <div style={{
                            width: '80px', height: '80px',
                            background: 'linear-gradient(135deg, #3b82f6, #7c3aed)',
                            borderRadius: '50%',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: '2rem', color: 'white', fontWeight: '700',
                            boxShadow: '0 4px 16px rgba(59,130,246,0.3)',
                        }}>
                            {user?.nombre?.charAt(0).toUpperCase() ?? '?'}
                        </div>
                        <div style={{ textAlign: 'center' }}>
                            <div style={{ fontSize: '1.1rem', fontWeight: '700', color: '#0f172a' }}>{user?.nombre}</div>
                            <div style={{ fontSize: '0.82rem', color: '#94a3b8', marginTop: '0.25rem' }}>{user?.email}</div>
                        </div>
                        <span style={{
                            padding: '0.3rem 0.85rem',
                            borderRadius: '20px',
                            fontSize: '0.78rem',
                            fontWeight: '700',
                            background: rolStyle.bg,
                            color: rolStyle.color,
                            letterSpacing: '0.3px'
                        }}>
                            {user?.rol?.nombre}
                        </span>

                        <div style={{ width: '100%', borderTop: '1px solid #f1f5f9', paddingTop: '0.75rem' }}>
                            {[
                                { label: 'Email', value: user?.email ?? '—' },
                                { label: 'Teléfono', value: (user as any)?.telefono || 'No registrado' },
                                { label: 'Miembro desde', value: user?.createdAt ? new Date(user.createdAt).toLocaleDateString('es-CO') : '—' },
                            ].map(item => (
                                <div key={item.label} style={{ marginBottom: '0.6rem' }}>
                                    <div style={{ fontSize: '0.68rem', color: '#94a3b8', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.4px' }}>
                                        {item.label}
                                    </div>
                                    <div style={{ fontSize: '0.82rem', color: '#475569', marginTop: '0.1rem', wordBreak: 'break-all' }}>
                                        {item.value}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* FORMULARIOS */}
                <div className="card">
                    {/* TABS */}
                    <div style={{ display: 'flex', borderBottom: '1px solid #f1f5f9' }}>
                        {([
                            { key: 'info', label: '✏️ Información' },
                            { key: 'password', label: '🔒 Contraseña' }
                        ] as const).map(t => (
                            <button key={t.key} onClick={() => { setTab(t.key); setError(''); setSuccess(''); }}
                                style={{
                                    padding: '0.85rem 1.25rem',
                                    border: 'none',
                                    background: 'none',
                                    cursor: 'pointer',
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

                    <div className="card-body">
                        {success && (
                            <div style={{
                                background: '#f0fdf4', border: '1px solid #bbf7d0', color: '#15803d',
                                padding: '0.75rem 1rem', borderRadius: '10px', marginBottom: '1rem',
                                fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.5rem'
                            }}>
                                <span>✅</span><span>{success}</span>
                            </div>
                        )}
                        {error && (
                            <div className="modal-error" style={{ marginBottom: '1rem' }}>
                                <span>⚠️</span><span>{error}</span>
                            </div>
                        )}

                        {tab === 'info' && (
                            <form onSubmit={handleGuardarInfo}>
                                <div className="form-group">
                                    <label className="form-label">Nombre completo <span className="required">*</span></label>
                                    <input className="form-input" type="text" required
                                        value={formInfo.nombre}
                                        onChange={e => setFormInfo({ ...formInfo, nombre: e.target.value })} />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Email</label>
                                    <input className="form-input" type="email" disabled value={user?.email ?? ''} />
                                    <span className="form-hint">El email no se puede modificar desde aquí</span>
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Teléfono</label>
                                    <input className="form-input" type="tel"
                                        value={formInfo.telefono}
                                        onChange={e => setFormInfo({ ...formInfo, telefono: e.target.value })}
                                        placeholder="Ej: 302 861 1668" />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Rol asignado</label>
                                    <input className="form-input" type="text" disabled value={user?.rol?.nombre ?? ''} />
                                    <span className="form-hint">Solo el administrador puede cambiar el rol</span>
                                </div>
                                <div style={{ marginTop: '1.25rem' }}>
                                    <button className="btn btn-primary" type="submit" disabled={loading}>
                                        {loading ? '⏳ Guardando...' : '✏️ Guardar cambios'}
                                    </button>
                                </div>
                            </form>
                        )}

                        {tab === 'password' && (
                            <form onSubmit={handleCambiarPassword}>
                                <div className="form-group">
                                    <label className="form-label">Nueva contraseña <span className="required">*</span></label>
                                    <input className="form-input" type="password" required minLength={6}
                                        value={formPass.nueva}
                                        onChange={e => setFormPass({ ...formPass, nueva: e.target.value })}
                                        placeholder="Mínimo 6 caracteres" />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Confirmar contraseña <span className="required">*</span></label>
                                    <input className="form-input" type="password" required
                                        value={formPass.confirmar}
                                        onChange={e => setFormPass({ ...formPass, confirmar: e.target.value })}
                                        placeholder="Repite la nueva contraseña" />
                                    {formPass.confirmar && formPass.nueva !== formPass.confirmar && (
                                        <span className="form-hint" style={{ color: '#ef4444' }}>Las contraseñas no coinciden</span>
                                    )}
                                </div>
                                <div style={{ marginTop: '1.25rem' }}>
                                    <button className="btn btn-primary" type="submit" disabled={loading || formPass.nueva !== formPass.confirmar}>
                                        {loading ? '⏳ Actualizando...' : '🔒 Cambiar contraseña'}
                                    </button>
                                </div>
                            </form>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Perfil;
