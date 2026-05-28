import React, { useEffect, useState } from 'react';
import { authService } from '../services/authService';
import { auditoriaService } from '../services/auditoriaService';
import type { DashboardResumen } from '../services/auditoriaService';
import { Link } from 'react-router-dom';

// ── helpers ───────────────────────────────────────────────────────────────────

const formatCurrency = (n: number) =>
  n.toLocaleString('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 });

// ── Tipos ─────────────────────────────────────────────────────────────────────

interface Modulo {
  path: string;
  icon: string;
  title: string;
  desc: string;
  color: string;
  bg: string;
}

interface Categoria {
  label: string;
  icon: string;
  color: string;      // color del borde/acento de la sección
  bg: string;         // fondo del badge de categoría
  textColor: string;
  modulos: Modulo[];
}

// ── Definición de categorías ADMIN ────────────────────────────────────────────

const CATEGORIAS_ADMIN: Categoria[] = [
  {
    label: 'Comercial',
    icon: '💼',
    color: '#22c55e',
    bg: '#dcfce7',
    textColor: '#166534',
    modulos: [
      { path: '/ventas',   icon: '💰', title: 'Ventas',              desc: 'Registrar y consultar ventas al mostrador', color: '#22c55e', bg: '#dcfce7' },
      { path: '/entregas', icon: '🔧', title: 'Órdenes de Servicio', desc: 'Reparaciones, entregas e instalaciones',     color: '#f59e0b', bg: '#fef3c7' },
      { path: '/devoluciones-garantias', icon: '↩', title: 'Devoluciones / Garantías', desc: 'Ajustes posteriores a facturación', color: '#dc2626', bg: '#fee2e2' },
      { path: '/clientes', icon: '🧑‍💼', title: 'Clientes',           desc: 'Base de clientes y contactos',              color: '#0ea5e9', bg: '#e0f2fe' },
    ],
  },
  {
    label: 'Inventario & Compras',
    icon: '📦',
    color: '#3b82f6',
    bg: '#dbeafe',
    textColor: '#1e40af',
    modulos: [
      { path: '/productos',  icon: '📦', title: 'Productos',   desc: 'Catálogo, stock y precios',        color: '#3b82f6', bg: '#dbeafe' },
      { path: '/compras',    icon: '🛒', title: 'Compras',     desc: 'Órdenes de compra a proveedores',  color: '#0ea5e9', bg: '#e0f2fe' },
      { path: '/proveedores',icon: '🏭', title: 'Proveedores', desc: 'Empresas y contactos de compra',   color: '#8b5cf6', bg: '#ede9fe' },
      { path: '/movimientos',icon: '🔄', title: 'Movimientos', desc: 'Entradas y salidas de stock',      color: '#06b6d4', bg: '#cffafe' },
      { path: '/kardex',     icon: '📋', title: 'Kardex',      desc: 'Historial de movimientos por producto', color: '#6366f1', bg: '#eef2ff' },
    ],
  },
  {
    label: 'Reportes & Análisis',
    icon: '📊',
    color: '#ef4444',
    bg: '#fee2e2',
    textColor: '#991b1b',
    modulos: [
      { path: '/reportes',  icon: '📊', title: 'Reportes',  desc: 'Estadísticas de ventas e inventario', color: '#ef4444', bg: '#fee2e2' },
      { path: '/auditoria', icon: '🔍', title: 'Auditoría', desc: 'Log completo de acciones del sistema', color: '#7c3aed', bg: '#f5f3ff' },
    ],
  },
  {
    label: 'Administración',
    icon: '⚙️',
    color: '#64748b',
    bg: '#f1f5f9',
    textColor: '#334155',
    modulos: [
      { path: '/usuarios',      icon: '👥', title: 'Usuarios',      desc: 'Empleados, roles y permisos', color: '#8b5cf6', bg: '#ede9fe' },
      { path: '/configuracion', icon: '⚙️', title: 'Configuración', desc: 'Ajustes generales del sistema', color: '#64748b', bg: '#f1f5f9' },
    ],
  },
];

// ── Módulos por rol (flat, sin categorías) ────────────────────────────────────

const MODULOS_VENDEDOR: Modulo[] = [
  { path: '/ventas',    icon: '💰', title: 'Ventas',     desc: 'Registrar ventas a clientes',  color: '#22c55e', bg: '#dcfce7' },
  { path: '/devoluciones-garantias', icon: '↩', title: 'Devoluciones', desc: 'Consultar y registrar solicitudes', color: '#dc2626', bg: '#fee2e2' },
  { path: '/clientes',  icon: '🧑‍💼', title: 'Clientes',  desc: 'Gestión de clientes',          color: '#0ea5e9', bg: '#e0f2fe' },
  { path: '/productos', icon: '📦', title: 'Inventario', desc: 'Ver productos disponibles',     color: '#3b82f6', bg: '#dbeafe' },
];

const MODULOS_INVENTARIO: Modulo[] = [
  { path: '/productos',  icon: '📦', title: 'Inventario',  desc: 'Gestionar productos y stock', color: '#3b82f6', bg: '#dbeafe' },
  { path: '/compras',    icon: '🛒', title: 'Compras',     desc: 'Registrar compras',           color: '#0ea5e9', bg: '#e0f2fe' },
  { path: '/proveedores',icon: '🏭', title: 'Proveedores', desc: 'Empresas y contactos',        color: '#8b5cf6', bg: '#ede9fe' },
  { path: '/movimientos',icon: '🔄', title: 'Movimientos', desc: 'Entradas y salidas de stock', color: '#06b6d4', bg: '#cffafe' },
  { path: '/kardex',     icon: '📋', title: 'Kardex',      desc: 'Movimientos por producto',    color: '#6366f1', bg: '#eef2ff' },
];

const MODULOS_TECNICO: Modulo[] = [
  { path: '/entregas',  icon: '🔧', title: 'Órdenes de Servicio', desc: 'Mis órdenes asignadas',    color: '#f59e0b', bg: '#fef3c7' },
  { path: '/devoluciones-garantias', icon: '↩', title: 'Garantías', desc: 'Consultar garantías registradas', color: '#dc2626', bg: '#fee2e2' },
  { path: '/productos', icon: '📦', title: 'Inventario',          desc: 'Ver productos disponibles', color: '#3b82f6', bg: '#dbeafe' },
];

// ── Tarjeta de módulo ─────────────────────────────────────────────────────────

const ModuloCard: React.FC<{ m: Modulo }> = ({ m }) => (
  <Link to={m.path} style={{ textDecoration: 'none' }}>
    <div
      style={{
        background: '#fff', border: '1px solid #e2e8f0',
        borderRadius: '14px', padding: '1.25rem',
        display: 'flex', flexDirection: 'column', gap: '0.6rem',
        cursor: 'pointer', transition: 'all 0.2s',
        boxShadow: '0 1px 4px rgba(0,0,0,0.04)', height: '100%',
      }}
      onMouseEnter={e => {
        const el = e.currentTarget as HTMLDivElement;
        el.style.transform = 'translateY(-3px)';
        el.style.boxShadow = `0 8px 24px rgba(0,0,0,0.1)`;
        el.style.borderColor = m.color;
      }}
      onMouseLeave={e => {
        const el = e.currentTarget as HTMLDivElement;
        el.style.transform = 'translateY(0)';
        el.style.boxShadow = '0 1px 4px rgba(0,0,0,0.04)';
        el.style.borderColor = '#e2e8f0';
      }}
    >
      <div style={{
        width: '44px', height: '44px', background: m.bg,
        borderRadius: '12px', display: 'flex',
        alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem',
      }}>
        {m.icon}
      </div>
      <div>
        <div style={{ fontSize: '0.95rem', fontWeight: '700', color: '#0f172a' }}>{m.title}</div>
        <div style={{ fontSize: '0.77rem', color: '#94a3b8', marginTop: '0.1rem' }}>{m.desc}</div>
      </div>
      <div style={{ fontSize: '0.75rem', color: m.color, fontWeight: '600', marginTop: 'auto' }}>
        Abrir módulo →
      </div>
    </div>
  </Link>
);

// ── Dashboard ─────────────────────────────────────────────────────────────────

const Dashboard: React.FC = () => {
  const user = authService.getUser();
  const rol  = user?.rol?.nombre;

  const [resumen, setResumen] = useState<DashboardResumen | null>(null);
  const [loading, setLoading] = useState(rol === 'ADMIN');
  const [error, setError]     = useState<string | null>(null);

  useEffect(() => {
    if (rol !== 'ADMIN') { setLoading(false); return; }
    const cargar = () => {
      setLoading(prev => prev); // no mostrar spinner en refrescos intermedios
      auditoriaService.getResumen()
        .then(data => setResumen(data))
        .catch(() => setError('No se pudo cargar el resumen del dashboard'))
        .finally(() => setLoading(false));
    };
    setLoading(true);
    cargar();
    const interval = setInterval(cargar, 30_000);
    const onVisible = () => { if (document.visibilityState === 'visible') cargar(); };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [rol]);

  const getRolColor = (r: string) => {
    switch (r) {
      case 'ADMIN':     return { bg: 'rgba(239,68,68,0.15)',   color: '#fca5a5' };
      case 'VENDEDOR':  return { bg: 'rgba(34,197,94,0.15)',   color: '#86efac' };
      case 'INVENTARIO':return { bg: 'rgba(59,130,246,0.15)',  color: '#93c5fd' };
      case 'TECNICO':   return { bg: 'rgba(234,179,8,0.15)',   color: '#fde047' };
      default:          return { bg: 'rgba(100,116,139,0.15)', color: '#94a3b8' };
    }
  };
  const rolStyle = getRolColor(rol ?? '');

  // Módulos flat para roles sin categorías
  const modulosFlat =
    rol === 'VENDEDOR'  ? MODULOS_VENDEDOR  :
    rol === 'INVENTARIO'? MODULOS_INVENTARIO :
    rol === 'TECNICO'   ? MODULOS_TECNICO   : [];

  // ── render ──────────────────────────────────────────────────────────────────

  return (
    <div className="page-container">

      {/* ── Welcome header ───────────────────────────────────────────────── */}
      <div style={{
        background: 'linear-gradient(135deg, #1a2332 0%, #1e3a5f 60%, #1d4ed8 100%)',
        borderRadius: '16px', padding: '1.75rem 2rem', color: 'white',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        flexWrap: 'wrap', gap: '1rem',
      }}>
        <div>
          <p style={{ fontSize: '0.82rem', color: 'rgba(255,255,255,0.5)', marginBottom: '0.25rem', fontFamily: 'monospace', letterSpacing: '0.5px' }}>
            ERG-INVENTORY
          </p>
          <h1 style={{ fontSize: '1.5rem', fontWeight: '800', marginBottom: '0.4rem' }}>
            ¡Bienvenido, {user?.nombre?.split(' ')[0]}! 👋
          </h1>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '0.82rem', color: 'rgba(255,255,255,0.6)' }}>{user?.email}</span>
            <span style={{
              fontSize: '0.72rem', fontWeight: '700',
              padding: '0.2rem 0.6rem', borderRadius: '20px',
              background: rolStyle.bg, color: rolStyle.color, letterSpacing: '0.3px',
            }}>
              {rol}
            </span>
          </div>
        </div>
        <div style={{
          width: '64px', height: '64px', background: 'rgba(255,255,255,0.1)',
          borderRadius: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '1.75rem', backdropFilter: 'blur(10px)',
          border: '1px solid rgba(255,255,255,0.15)', flexShrink: 0,
        }}>
          {user?.nombre?.charAt(0).toUpperCase() ?? '?'}
        </div>
      </div>

      {/* ── ADMIN: KPIs ──────────────────────────────────────────────────── */}
      {rol === 'ADMIN' && (
        <>
          {loading && (
            <div style={{ textAlign: 'center', padding: '2rem', color: '#94a3b8' }}>
              ⏳ Cargando datos del sistema…
            </div>
          )}
          {error && (
            <div style={{ background: '#fee2e2', borderRadius: '12px', padding: '1rem 1.5rem', color: '#991b1b', fontWeight: '600', fontSize: '0.88rem' }}>
              ⚠️ {error}
            </div>
          )}
          {resumen && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '0.85rem' }}>
              {[
                { label: 'Ventas hoy',     value: resumen.kpis.ventasHoy.toString(),                                      icon: '🛍️', color: '#22c55e' },
                { label: 'Facturado hoy',  value: formatCurrency(resumen.kpis.totalVentasHoy),                            icon: '💵', color: '#0ea5e9' },
                { label: 'Por confirmar',  value: resumen.alertas.ordenesCompletadasSinConfirmar.toString(),               icon: '🔴', color: '#ef4444' },
                { label: 'Pago pendiente', value: resumen.alertas.ordenesPagoPendiente.toString(),                        icon: '🟡', color: '#f59e0b' },
                { label: 'Stock bajo',     value: resumen.alertas.productosStockBajo.toString(),                          icon: '🟠', color: '#f97316' },
              ].map(k => (
                <div key={k.label} style={{
                  background: '#fff', border: '1px solid #e2e8f0',
                  borderRadius: '14px', padding: '1.1rem 1.25rem',
                  boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
                }}>
                  <div style={{ fontSize: '1.25rem', marginBottom: '0.4rem' }}>{k.icon}</div>
                  <div style={{ fontSize: '1.3rem', fontWeight: '800', color: k.color }}>{k.value}</div>
                  <div style={{ fontSize: '0.74rem', color: '#94a3b8', marginTop: '0.15rem' }}>{k.label}</div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* ── ADMIN: Módulos por categoría ─────────────────────────────────── */}
      {rol === 'ADMIN' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
          {CATEGORIAS_ADMIN.map(cat => (
            <div key={cat.label}>
              {/* Encabezado de categoría */}
              <div style={{
                display: 'flex', alignItems: 'center', gap: '0.65rem',
                marginBottom: '0.85rem',
              }}>
                <div style={{
                  width: '32px', height: '32px',
                  background: cat.bg, borderRadius: '10px',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '1rem', flexShrink: 0,
                  border: `1px solid ${cat.color}30`,
                }}>
                  {cat.icon}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flex: 1 }}>
                  <h2 style={{
                    fontSize: '0.88rem', fontWeight: '800', color: '#0f172a',
                    margin: 0, letterSpacing: '0.2px',
                  }}>
                    {cat.label}
                  </h2>
                  <span style={{
                    fontSize: '0.65rem', fontWeight: '700', color: cat.textColor,
                    background: cat.bg, padding: '0.15rem 0.5rem',
                    borderRadius: '20px', letterSpacing: '0.3px',
                    border: `1px solid ${cat.color}40`,
                  }}>
                    {cat.modulos.length} módulo{cat.modulos.length > 1 ? 's' : ''}
                  </span>
                </div>
                {/* Línea separadora */}
                <div style={{ flex: 1, height: '1px', background: '#f1f5f9', maxWidth: '100%' }} />
              </div>

              {/* Grid de tarjetas */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
                gap: '1rem',
              }}>
                {cat.modulos.map(m => <ModuloCard key={m.path} m={m} />)}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Otros roles: módulos flat ─────────────────────────────────────── */}
      {rol !== 'ADMIN' && modulosFlat.length > 0 && (
        <div>
          <h2 style={{
            fontSize: '0.82rem', fontWeight: '700', color: '#94a3b8',
            textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '0.75rem',
          }}>
            Módulos disponibles
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '1rem' }}>
            {modulosFlat.map(m => <ModuloCard key={m.path} m={m} />)}
          </div>
        </div>
      )}

      {/* ── Sin módulos ───────────────────────────────────────────────────── */}
      {rol !== 'ADMIN' && modulosFlat.length === 0 && (
        <div className="card">
          <div className="card-body empty-state">
            <span className="empty-state-icon">🔒</span>
            <h3>Sin módulos asignados</h3>
            <p>Contacta al administrador para asignarte permisos.</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
