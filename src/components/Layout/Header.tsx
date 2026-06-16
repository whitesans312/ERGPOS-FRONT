import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { authService } from '../../services/authService';
import { auditoriaService } from '../../services/auditoriaService';
import type { DashboardResumen, AuditoriaEntry } from '../../services/auditoriaService';
import './Header.css';

const ACCION_ICON: Record<string, string> = {
    CREAR_ORDEN:        '🔧',
    CAMBIAR_ESTADO:     '🔄',
    CONFIRMAR_ORDEN:    '✅',
    REGISTRAR_PAGO:     '💵',
    CREAR_VENTA:        '💰',
    CANCELAR_VENTA:     '❌',
    CREAR_USUARIO:      '👤',
    EDITAR_USUARIO:     '✏️',
    ENTRADA_INVENTARIO: '📥',
    SALIDA_INVENTARIO:  '📤',
    CREAR_COMPRA:       '🛒',
    CONFIRMAR_COMPRA:   '📦',
    CANCELAR_COMPRA:    '🚧',
};

Object.assign(ACCION_ICON, {
    LOGIN_EXITOSO: 'OK',
    LOGIN_FALLIDO: '!',
    LOGOUT: 'OUT',
    EDITAR_ORDEN: 'ED',
    CONFIGURAR_ANTICIPO: '%',
    CREAR_PRODUCTO: '+',
    EDITAR_PRODUCTO: 'ED',
    ACTIVAR_PRODUCTO: 'ON',
    DESACTIVAR_PRODUCTO: 'OFF',
    CREAR_CLIENTE: '+',
    EDITAR_CLIENTE: 'ED',
    ACTIVAR_CLIENTE: 'ON',
    DESACTIVAR_CLIENTE: 'OFF',
    CREAR_PROVEEDOR: '+',
    EDITAR_PROVEEDOR: 'ED',
    ACTIVAR_PROVEEDOR: 'ON',
    DESACTIVAR_PROVEEDOR: 'OFF',
    CREAR_CATEGORIA: '+',
    EDITAR_CATEGORIA: 'ED',
    ACTIVAR_CATEGORIA: 'ON',
    DESACTIVAR_CATEGORIA: 'OFF',
    ACTIVAR_USUARIO: 'ON',
    DESACTIVAR_USUARIO: 'OFF',
    CAMBIAR_PASSWORD_USUARIO: 'KEY',
    GENERAR_FACTURA_VENTA: 'FV',
});

const formatHora = (iso: string) =>
    new Date(iso).toLocaleString('es-CO', { hour: '2-digit', minute: '2-digit', hour12: true });

/** Umbral en ms para mostrar el aviso de sesión próxima a expirar */
const SESSION_WARN_MS = 5 * 60 * 1000; // 5 minutos

const Header: React.FC = () => {
    const user = authService.getUser();
    const [menuOpen, setMenuOpen] = useState(false);
    const [bellOpen, setBellOpen] = useState(false);
    const [auditOpen, setAuditOpen] = useState(false);
    const [resumen, setResumen] = useState<DashboardResumen | null>(null);
    const [auditEntries, setAuditEntries] = useState<AuditoriaEntry[]>([]);
    const [sessionWarning, setSessionWarning] = useState(false);
    const [sessionSecondsLeft, setSessionSecondsLeft] = useState(0);
    const [refreshingSession, setRefreshingSession] = useState(false);
    const navigate = useNavigate();
    const dropdownRef = useRef<HTMLDivElement>(null);
    const bellRef = useRef<HTMLDivElement>(null);
    const auditRef = useRef<HTMLDivElement>(null);
    const isAdmin = user?.rol?.nombre === 'ADMIN';

    // ── Monitor de expiración de sesión (HU10) ─────────────────────────────────
    useEffect(() => {
        const check = () => {
            const remaining = authService.getTimeToExpiry();
            if (remaining > 0 && remaining <= SESSION_WARN_MS) {
                setSessionWarning(true);
                setSessionSecondsLeft(Math.ceil(remaining / 1000));
            } else {
                setSessionWarning(false);
            }
        };
        check();
        const interval = setInterval(check, 30_000);
        return () => clearInterval(interval);
    }, []);

    const handleRenewSession = async () => {
        setRefreshingSession(true);
        try {
            await authService.refreshToken();
            setSessionWarning(false);
        } catch {
            // Si falla el refresh, cerrar sesión
            await authService.logoutRemote();
            authService.logout();
            navigate('/');
        } finally {
            setRefreshingSession(false);
        }
    };

    // Cerrar menús al hacer click fuera
    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
                setMenuOpen(false);
            }
            if (bellRef.current && !bellRef.current.contains(e.target as Node)) {
                setBellOpen(false);
            }
            if (auditRef.current && !auditRef.current.contains(e.target as Node)) {
                setAuditOpen(false);
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    // Cargar alertas y auditoría (solo ADMIN)
    // Polling cada 15s + refresco inmediato al volver a la pestaña
    useEffect(() => {
        if (!isAdmin) return;
        const cargar = () => {
            auditoriaService.getResumen()
                .then(setResumen)
                .catch(() => {});
            auditoriaService.getAuditoria({ limit: 8 })
                .then(setAuditEntries)
                .catch(() => {});
        };
        cargar();
        const interval = setInterval(cargar, 5_000);

        // Refresco instantáneo al volver a la pestaña
        const onVisible = () => { if (document.visibilityState === 'visible') cargar(); };
        document.addEventListener('visibilitychange', onVisible);

        return () => {
            clearInterval(interval);
            document.removeEventListener('visibilitychange', onVisible);
        };
    }, [isAdmin]);

    const totalAlertas = resumen
        ? (resumen.alertas.ordenesCompletadasSinConfirmar || 0)
        + (resumen.alertas.ordenesFinalizadasConDeuda || 0)
        + (resumen.alertas.productosStockBajo || 0)
        : 0;

    const handleLogout = async () => {
        await authService.logoutRemote();
        authService.logout();
        navigate('/');
    };

    const handleNavigate = (path: string) => {
        setMenuOpen(false);
        setBellOpen(false);
        setAuditOpen(false);
        navigate(path);
    };

    const getRolBadgeClass = (rol: string) => {
        switch (rol) {
            case 'ADMIN': return 'badge-admin';
            case 'VENDEDOR': return 'badge-vendedor';
            case 'INVENTARIO': return 'badge-inventario';
            case 'ENTREGAS': return 'badge-entregas';
            default: return 'badge-default';
        }
    };

    const getRolIcon = (rol: string) => {
        switch (rol) {
            case 'ADMIN': return '⚙️';
            case 'VENDEDOR': return '🛒';
            case 'INVENTARIO': return '📦';
            case 'ENTREGAS': return '🚚';
            default: return '👤';
        }
    };

    return (
        <>
        {/* ── Banner de sesión próxima a expirar (HU10) ────────────────────────── */}
        {sessionWarning && (
            <div id="session-expiry-banner" style={{
                position: 'fixed', top: 0, left: 0, right: 0, zIndex: 10000,
                background: 'linear-gradient(90deg, #92400e, #b45309)',
                color: '#fef3c7',
                padding: '0.55rem 1.25rem',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                gap: '1rem', fontSize: '0.84rem', fontWeight: '600',
                boxShadow: '0 2px 8px rgba(0,0,0,0.25)',
                animation: 'slideDown 0.3s ease',
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                    <span style={{ fontSize: '1rem' }}>⚠️</span>
                    <span>
                        Tu sesión expirará en{' '}
                        <strong>{Math.floor(sessionSecondsLeft / 60)}:{String(sessionSecondsLeft % 60).padStart(2, '0')} min</strong>.
                        Guarda tu trabajo.
                    </span>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem', flexShrink: 0 }}>
                    <button
                        id="session-renew-btn"
                        onClick={handleRenewSession}
                        disabled={refreshingSession}
                        style={{
                            background: '#fef3c7', color: '#92400e',
                            border: 'none', borderRadius: '8px',
                            padding: '0.3rem 0.85rem', fontWeight: '700',
                            fontSize: '0.82rem', cursor: 'pointer',
                            opacity: refreshingSession ? 0.7 : 1,
                        }}
                    >
                        {refreshingSession ? '⏳ Renovando...' : '🔄 Renovar sesión'}
                    </button>
                    <button
                        id="session-logout-btn"
                        onClick={handleLogout}
                        style={{
                            background: 'rgba(0,0,0,0.25)', color: '#fef3c7',
                            border: '1px solid rgba(255,255,255,0.3)', borderRadius: '8px',
                            padding: '0.3rem 0.85rem', fontWeight: '600',
                            fontSize: '0.82rem', cursor: 'pointer',
                        }}
                    >
                        Cerrar sesión
                    </button>
                </div>
            </div>
        )}
        <header className="app-header" style={sessionWarning ? { marginTop: '2.5rem' } : {}}>
            <div className="header-inner">
                {/* MARCA */}
                <div className="header-brand" style={{ cursor: 'pointer' }} onClick={() => navigate('/dashboard')}>
                    <div className="brand-icon">
                        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <rect x="3" y="11" width="18" height="10" rx="2" stroke="currentColor" strokeWidth="2" />
                            <path d="M8 11V7a4 4 0 0 1 8 0v4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                            <circle cx="12" cy="16" r="1.5" fill="currentColor" />
                        </svg>
                    </div>
                    <div className="brand-text">
                        <span className="brand-name">ERG-INVENTORY</span>
                        <span className="brand-sub">Sistema de Gestión</span>
                    </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>

                    {/* BOTÓN AUDITORÍA — solo ADMIN */}
                    {isAdmin && (
                        <div className="header-bell" ref={auditRef}>
                            <button
                                className="audit-btn"
                                onClick={() => {
                                    setAuditOpen(prev => !prev);
                                    setBellOpen(false);
                                }}
                                title="Últimas acciones del sistema"
                            >
                                <span className="audit-btn-icon">!</span>
                                {auditEntries.length > 0 && (
                                    <span className="audit-badge">{auditEntries.length > 9 ? '9+' : auditEntries.length}</span>
                                )}
                            </button>

                            {auditOpen && (
                                <div className="bell-dropdown audit-dropdown">
                                    <div className="bell-dropdown-header">
                                        <span>📋 Últimas acciones</span>
                                        <button
                                            className="bell-audit-link"
                                            onClick={() => handleNavigate('/auditoria')}
                                        >
                                            Ver log completo →
                                        </button>
                                    </div>

                                    {auditEntries.length === 0 ? (
                                        <div className="bell-empty">Sin acciones recientes</div>
                                    ) : (
                                        <div className="audit-feed">
                                            {auditEntries.map((a) => (
                                                <div key={a.id} className="audit-feed-item">
                                                    <span className="audit-feed-icon">
                                                        {ACCION_ICON[a.accion] ?? '⚡'}
                                                    </span>
                                                    <div className="audit-feed-body">
                                                        <div className="audit-feed-title">
                                                            {a.detalle ?? a.accion}
                                                        </div>
                                                        <div className="audit-feed-meta">
                                                            {a.usuarioNombre ?? 'Sistema'} · {formatHora(a.fecha)}
                                                        </div>
                                                    </div>
                                                    <span className="audit-feed-modulo">{a.modulo}</span>
                                                </div>
                                            ))}
                                        </div>
                                    )}

                                    <div className="audit-dropdown-footer">
                                        <button
                                            className="audit-footer-btn"
                                            onClick={() => handleNavigate('/auditoria')}
                                        >
                                            Abrir auditoría completa →
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* CAMPANA DE NOTIFICACIONES — solo ADMIN */}
                    {isAdmin && (
                        <div className="header-bell" ref={bellRef}>
                            <button
                                className="bell-btn"
                                onClick={() => {
                                    setBellOpen(prev => !prev);
                                    setAuditOpen(false);
                                }}
                                title="Alertas del sistema"
                            >
                                🔔
                                {totalAlertas > 0 && (
                                    <span className="bell-badge">{totalAlertas > 9 ? '9+' : totalAlertas}</span>
                                )}
                            </button>

                            {bellOpen && (
                                <div className="bell-dropdown">
                                    <div className="bell-dropdown-header">
                                        <span>Alertas activas</span>
                                        <button
                                            className="bell-audit-link"
                                            onClick={() => handleNavigate('/auditoria')}
                                        >
                                            Ver auditoría →
                                        </button>
                                    </div>

                                    {totalAlertas === 0 ? (
                                        <div className="bell-empty">✅ Sin alertas pendientes</div>
                                    ) : (
                                        <div className="bell-items">
                                            {resumen && resumen.alertas.ordenesCompletadasSinConfirmar > 0 && (
                                                <button className="bell-item bell-item--red" onClick={() => handleNavigate('/entregas')}>
                                                    <span className="bell-item-icon">🔴</span>
                                                    <div>
                                                        <div className="bell-item-title">
                                                            {resumen.alertas.ordenesCompletadasSinConfirmar} órdenes sin confirmar
                                                        </div>
                                                        <div className="bell-item-sub">Esperando confirmación final</div>
                                                    </div>
                                                    <span className="bell-item-arrow">→</span>
                                                </button>
                                            )}
                                            {resumen && resumen.alertas.ordenesFinalizadasConDeuda > 0 && (
                                                <button className="bell-item bell-item--yellow" onClick={() => handleNavigate('/entregas')}>
                                                    <span className="bell-item-icon">🟡</span>
                                                    <div>
                                                        <div className="bell-item-title">
                                                            {resumen.alertas.ordenesFinalizadasConDeuda} órdenes con deuda
                                                        </div>
                                                        <div className="bell-item-sub">Pagos pendientes por cobrar</div>
                                                    </div>
                                                    <span className="bell-item-arrow">→</span>
                                                </button>
                                            )}
                                            {resumen && resumen.alertas.productosStockBajo > 0 && (
                                                <button className="bell-item bell-item--orange" onClick={() => handleNavigate('/productos')}>
                                                    <span className="bell-item-icon">🟠</span>
                                                    <div>
                                                        <div className="bell-item-title">
                                                            {resumen.alertas.productosStockBajo} productos stock bajo
                                                        </div>
                                                        <div className="bell-item-sub">Debajo del mínimo definido</div>
                                                    </div>
                                                    <span className="bell-item-arrow">→</span>
                                                </button>
                                            )}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    )}

                    {/* USUARIO */}
                    <div className="header-user" ref={dropdownRef}>
                        <div className="user-trigger" onClick={() => setMenuOpen(!menuOpen)}>
                            <div className="user-avatar">
                                {user?.nombre?.charAt(0).toUpperCase() ?? 'U'}
                            </div>
                            <div className="user-meta">
                                <span className="user-name">{user?.nombre ?? 'Usuario'}</span>
                                <span className={`user-role-badge ${getRolBadgeClass(user?.rol?.nombre ?? '')}`}>
                                    {getRolIcon(user?.rol?.nombre ?? '')} {user?.rol?.nombre}
                                </span>
                            </div>
                            <span className={`chevron ${menuOpen ? 'open' : ''}`}>▾</span>
                        </div>

                        {menuOpen && (
                            <div className="user-dropdown">
                                <div className="dropdown-header">
                                    <span className="dropdown-email">{user?.email}</span>
                                </div>
                                <div className="dropdown-divider" />

                                <button className="dropdown-item" onClick={() => handleNavigate('/perfil')}>
                                    <span>👤</span>
                                    <span>Mi Perfil</span>
                                </button>

                                <button className="dropdown-item" onClick={() => handleNavigate('/dashboard')}>
                                    <span>🏠</span>
                                    <span>Dashboard</span>
                                </button>

                                {user?.rol?.nombre === 'ADMIN' && (
                                    <>
                                        <button className="dropdown-item" onClick={() => handleNavigate('/analitica/flujo-caja')}>
                                            <span>%</span>
                                            <span>Flujo de caja</span>
                                        </button>
                                        <button className="dropdown-item" onClick={() => handleNavigate('/analitica/inventario')}>
                                            <span>%</span>
                                            <span>Analitica inventario</span>
                                        </button>
                                        <button className="dropdown-item" onClick={() => handleNavigate('/analitica/tecnicos')}>
                                            <span>%</span>
                                            <span>Analitica tecnicos</span>
                                        </button>
                                        <button className="dropdown-item" onClick={() => handleNavigate('/reportes/vendedores')}>
                                            <span>%</span>
                                            <span>Ventas por vendedor</span>
                                        </button>
                                        <button className="dropdown-item" onClick={() => handleNavigate('/reportes/rentabilidad')}>
                                            <span>%</span>
                                            <span>Rentabilidad</span>
                                        </button>
                                    </>
                                )}

                                {user?.rol?.nombre === 'ADMIN' && (
                                    <button className="dropdown-item" onClick={() => handleNavigate('/movimientos')}>
                                        <span>🔄</span>
                                        <span>Movimientos</span>
                                    </button>
                                )}

                                <div className="dropdown-divider" />

                                <button className="dropdown-item logout-item" onClick={handleLogout}>
                                    <span>🚪</span>
                                    <span>Cerrar Sesión</span>
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </header>
        </>
    );
};

export default Header;
