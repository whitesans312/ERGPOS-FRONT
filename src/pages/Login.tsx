import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { authService } from '../services/authService';
import type { LoginRequest } from '../types';

const Login: React.FC = () => {
    const [credentials, setCredentials] = useState<LoginRequest>({ email: '', password: '' });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const navigate = useNavigate();

    // Cambio 5 — si ya hay sesión activa, redirigir directamente al dashboard
    useEffect(() => {
        if (authService.isAuthenticated()) {
            navigate('/dashboard');
        }
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        try {
            const session = await authService.login(credentials);
            authService.setSession(session);
            navigate('/dashboard');
        } catch (err: any) {
            const msg = err.response?.data;
            setError(typeof msg === 'string' ? msg : (msg?.message ?? 'Credenciales incorrectas'));
        } finally {
            setLoading(false);
        }
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setCredentials({ ...credentials, [e.target.name]: e.target.value });
    };

    return (
        <div style={styles.page}>
            {/* Panel izquierdo — decorativo */}
            <div style={styles.panel}>
                <div style={styles.panelContent}>
                    <div style={styles.panelIcon}>
                        <svg width="40" height="40" viewBox="0 0 24 24" fill="none">
                            <rect x="3" y="11" width="18" height="10" rx="2" stroke="white" strokeWidth="2" />
                            <path d="M8 11V7a4 4 0 0 1 8 0v4" stroke="white" strokeWidth="2" strokeLinecap="round" />
                            <circle cx="12" cy="16" r="1.5" fill="white" />
                        </svg>
                    </div>
                    <h1 style={styles.panelTitle}>ERG-INVENTORY</h1>
                    <p style={styles.panelSub}>Sistema de Gestión de Inventario</p>
                    <div style={styles.features}>
                        {['Control de stock en tiempo real', 'Gestión de entregas', 'Reportes y estadísticas', 'Múltiples roles de usuario'].map(f => (
                            <div key={f} style={styles.featureItem}>
                                <span style={styles.featureDot}>✓</span>
                                <span>{f}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Panel derecho — formulario */}
            <div style={styles.formSide}>
                <div style={styles.formCard}>
                    <div style={styles.formHeader}>
                        <h2 style={styles.formTitle}>Iniciar Sesión</h2>
                        <p style={styles.formSubtitle}>Ingresa tus credenciales para continuar</p>
                    </div>

                    {error && (
                        <div style={styles.errorBox}>
                            <span>⚠️</span>
                            <span>{error}</span>
                        </div>
                    )}

                    <form onSubmit={handleSubmit} style={styles.form}>
                        <div style={styles.fieldGroup}>
                            <label htmlFor="email" style={styles.label}>Correo electrónico</label>
                            <input
                                id="email"
                                type="email"
                                name="email"
                                value={credentials.email}
                                onChange={handleChange}
                                required
                                placeholder="correo@empresa.com"
                                style={styles.input}
                                onFocus={e => Object.assign(e.target.style, styles.inputFocus)}
                                onBlur={e => Object.assign(e.target.style, styles.input)}
                            />
                        </div>

                        <div style={styles.fieldGroup}>
                            <label htmlFor="password" style={styles.label}>Contraseña</label>
                            <input
                                id="password"
                                type="password"
                                name="password"
                                value={credentials.password}
                                onChange={handleChange}
                                required
                                placeholder="••••••••"
                                style={styles.input}
                                onFocus={e => Object.assign(e.target.style, styles.inputFocus)}
                                onBlur={e => Object.assign(e.target.style, styles.input)}
                            />
                        </div>

                        <button type="submit" disabled={loading} style={{
                            ...styles.submitBtn,
                            opacity: loading ? 0.7 : 1,
                            cursor: loading ? 'not-allowed' : 'pointer'
                        }}>
                            {loading ? '⏳ Verificando...' : 'Ingresar al sistema'}
                        </button>
                    </form>

                    <p style={styles.footer}>ERG-INVENTORY © {new Date().getFullYear()}</p>
                </div>
            </div>
        </div>
    );
};

const styles: Record<string, React.CSSProperties> = {
    page: {
        display: 'flex',
        minHeight: '100vh',
        background: '#f1f5f9',
    },
    panel: {
        flex: '0 0 42%',
        background: 'linear-gradient(145deg, #1a2332 0%, #1e3a5f 60%, #1d4ed8 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '3rem',
    },
    panelContent: {
        maxWidth: '360px',
        color: 'white',
    },
    panelIcon: {
        width: '72px',
        height: '72px',
        background: 'rgba(255,255,255,0.12)',
        borderRadius: '20px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: '1.5rem',
        backdropFilter: 'blur(10px)',
        border: '1px solid rgba(255,255,255,0.2)',
    },
    panelTitle: {
        fontFamily: "'Courier New', monospace",
        fontSize: '1.8rem',
        fontWeight: '800',
        letterSpacing: '1px',
        marginBottom: '0.4rem',
    },
    panelSub: {
        color: 'rgba(255,255,255,0.6)',
        fontSize: '0.9rem',
        marginBottom: '2.5rem',
    },
    features: {
        display: 'flex',
        flexDirection: 'column',
        gap: '0.75rem',
    },
    featureItem: {
        display: 'flex',
        alignItems: 'center',
        gap: '0.75rem',
        color: 'rgba(255,255,255,0.8)',
        fontSize: '0.88rem',
    },
    featureDot: {
        width: '22px',
        height: '22px',
        background: 'rgba(59,130,246,0.4)',
        borderRadius: '50%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '0.7rem',
        color: '#93c5fd',
        flexShrink: 0,
        fontWeight: 'bold',
    },
    formSide: {
        flex: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '2rem',
    },
    formCard: {
        background: '#fff',
        borderRadius: '20px',
        padding: '2.5rem',
        width: '100%',
        maxWidth: '400px',
        boxShadow: '0 4px 24px rgba(0,0,0,0.08)',
        border: '1px solid #e2e8f0',
    },
    formHeader: {
        marginBottom: '1.75rem',
    },
    formTitle: {
        fontSize: '1.5rem',
        fontWeight: '800',
        color: '#0f172a',
        marginBottom: '0.25rem',
    },
    formSubtitle: {
        fontSize: '0.85rem',
        color: '#94a3b8',
    },
    errorBox: {
        display: 'flex',
        alignItems: 'center',
        gap: '0.5rem',
        background: '#fef2f2',
        border: '1px solid #fecaca',
        color: '#dc2626',
        padding: '0.75rem 1rem',
        borderRadius: '10px',
        marginBottom: '1.25rem',
        fontSize: '0.85rem',
    },
    form: {
        display: 'flex',
        flexDirection: 'column',
        gap: '1.1rem',
    },
    fieldGroup: {
        display: 'flex',
        flexDirection: 'column',
        gap: '0.4rem',
    },
    label: {
        fontSize: '0.78rem',
        fontWeight: '600',
        color: '#475569',
        textTransform: 'uppercase',
        letterSpacing: '0.4px',
    },
    input: {
        padding: '0.7rem 0.9rem',
        border: '1.5px solid #e2e8f0',
        borderRadius: '10px',
        fontSize: '0.9rem',
        color: '#1e293b',
        background: '#f8fafc',
        transition: 'all 0.2s',
        outline: 'none',
        width: '100%',
        boxSizing: 'border-box',
    } as React.CSSProperties,
    inputFocus: {
        padding: '0.7rem 0.9rem',
        border: '1.5px solid #3b82f6',
        borderRadius: '10px',
        fontSize: '0.9rem',
        color: '#1e293b',
        background: '#ffffff',
        outline: 'none',
        width: '100%',
        boxSizing: 'border-box',
        boxShadow: '0 0 0 3px rgba(59,130,246,0.1)',
    } as React.CSSProperties,
    submitBtn: {
        padding: '0.85rem',
        background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)',
        color: 'white',
        border: 'none',
        borderRadius: '10px',
        fontSize: '0.9rem',
        fontWeight: '700',
        marginTop: '0.5rem',
        boxShadow: '0 4px 12px rgba(59,130,246,0.35)',
        transition: 'all 0.2s',
        letterSpacing: '0.3px',
    },
    footer: {
        textAlign: 'center',
        fontSize: '0.75rem',
        color: '#cbd5e1',
        marginTop: '1.75rem',
    },
};

export default Login;
