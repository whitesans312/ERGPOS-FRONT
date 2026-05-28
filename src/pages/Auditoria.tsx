import React, { useEffect, useState, useCallback } from 'react';
import { auditoriaService } from '../services/auditoriaService';
import type { AuditoriaEntry } from '../services/auditoriaService';
import { authService } from '../services/authService';
import { usuarioService } from '../services/usuarioService';
import type { Usuario } from '../types';
import { useNavigate } from 'react-router-dom';

// ── helpers ───────────────────────────────────────────────────────────────────

const MODULO_COLORS: Record<string, { bg: string; color: string }> = {
  ORDENES:    { bg: '#fef3c7', color: '#92400e' },
  VENTAS:     { bg: '#dcfce7', color: '#166534' },
  USUARIOS:   { bg: '#ede9fe', color: '#5b21b6' },
  INVENTARIO: { bg: '#dbeafe', color: '#1e40af' },
  COMPRAS:    { bg: '#e0f2fe', color: '#075985' },
};

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

const ACCION_LABEL: Record<string, string> = {
  CREAR_ORDEN:        'Crear Orden de Servicio',
  CAMBIAR_ESTADO:     'Cambiar Estado de Orden',
  CONFIRMAR_ORDEN:    'Confirmar Orden',
  REGISTRAR_PAGO:     'Registrar Pago',
  CREAR_VENTA:        'Crear Venta',
  CANCELAR_VENTA:     'Cancelar Venta',
  CREAR_USUARIO:      'Crear Usuario',
  EDITAR_USUARIO:     'Editar Usuario',
  ENTRADA_INVENTARIO: 'Entrada de Inventario',
  SALIDA_INVENTARIO:  'Salida de Inventario',
  CREAR_COMPRA:       'Crear Compra',
  CONFIRMAR_COMPRA:   'Confirmar Compra',
  CANCELAR_COMPRA:    'Cancelar Compra',
};

const ACCION_DESC: Record<string, string> = {
  CREAR_ORDEN:        'Se creó una nueva orden de servicio (reparación, entrega o instalación).',
  CAMBIAR_ESTADO:     'Se actualizó el estado de una orden de servicio.',
  CONFIRMAR_ORDEN:    'Se confirmó la entrega del servicio, descontando stock e impactando el kardex.',
  REGISTRAR_PAGO:     'Se registró un pago (anticipo o pago total) sobre una orden o venta.',
  CREAR_VENTA:        'Se registró una nueva venta de productos al mostrador.',
  CANCELAR_VENTA:     'Se canceló una venta existente.',
  CREAR_USUARIO:      'Se creó un nuevo usuario en el sistema.',
  EDITAR_USUARIO:     'Se modificó un usuario existente.',
  ENTRADA_INVENTARIO: 'Se registró una entrada manual de unidades al inventario.',
  SALIDA_INVENTARIO:  'Se registró una salida manual de unidades del inventario.',
  CREAR_COMPRA:       'Se creó una orden de compra a proveedor (borrador pendiente de confirmación).',
  CONFIRMAR_COMPRA:   'Se confirmó la compra; el stock fue incrementado automáticamente.',
  CANCELAR_COMPRA:    'Se canceló una orden de compra antes de su confirmación.',
};

Object.assign(ACCION_LABEL, {
  LOGIN_EXITOSO: 'Inicio de sesion',
  LOGIN_FALLIDO: 'Intento fallido de inicio de sesion',
  LOGOUT: 'Cierre de sesion',
  EDITAR_ORDEN: 'Editar Orden de Servicio',
  CONFIGURAR_ANTICIPO: 'Configurar Anticipo',
  CREAR_PRODUCTO: 'Crear Producto',
  EDITAR_PRODUCTO: 'Editar Producto',
  ACTIVAR_PRODUCTO: 'Activar Producto',
  DESACTIVAR_PRODUCTO: 'Desactivar Producto',
  CREAR_CLIENTE: 'Crear Cliente',
  EDITAR_CLIENTE: 'Editar Cliente',
  ACTIVAR_CLIENTE: 'Activar Cliente',
  DESACTIVAR_CLIENTE: 'Desactivar Cliente',
  CREAR_PROVEEDOR: 'Crear Proveedor',
  EDITAR_PROVEEDOR: 'Editar Proveedor',
  ACTIVAR_PROVEEDOR: 'Activar Proveedor',
  DESACTIVAR_PROVEEDOR: 'Desactivar Proveedor',
  CREAR_CATEGORIA: 'Crear Categoria',
  EDITAR_CATEGORIA: 'Editar Categoria',
  ACTIVAR_CATEGORIA: 'Activar Categoria',
  DESACTIVAR_CATEGORIA: 'Desactivar Categoria',
  ACTIVAR_USUARIO: 'Activar Usuario',
  DESACTIVAR_USUARIO: 'Desactivar Usuario',
  CAMBIAR_PASSWORD_USUARIO: 'Cambiar Password de Usuario',
  GENERAR_FACTURA_VENTA: 'Generar Factura de Venta',
});

Object.assign(ACCION_DESC, {
  LOGIN_EXITOSO: 'Un usuario inicio sesion correctamente.',
  LOGIN_FALLIDO: 'Se intento iniciar sesion con credenciales incorrectas.',
  LOGOUT: 'Un usuario cerro sesion.',
});

const formatFecha = (iso: string) => {
  const d = new Date(iso);
  return d.toLocaleString('es-CO', {
    weekday: 'long',
    day: '2-digit', month: 'long', year: 'numeric',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  });
};

const formatFechaCorta = (iso: string) => {
  const d = new Date(iso);
  return d.toLocaleString('es-CO', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
};

const MODULOS = ['', 'ORDENES', 'VENTAS', 'USUARIOS', 'INVENTARIO', 'COMPRAS', 'CLIENTES', 'PROVEEDORES', 'CATEGORIAS', 'SEGURIDAD'];
const ACCIONES = [
  '', 'CREAR_ORDEN', 'CAMBIAR_ESTADO', 'CONFIRMAR_ORDEN', 'REGISTRAR_PAGO',
  'CREAR_VENTA', 'CANCELAR_VENTA', 'CREAR_USUARIO', 'EDITAR_USUARIO',
  'ENTRADA_INVENTARIO', 'SALIDA_INVENTARIO',
  'CREAR_COMPRA', 'CONFIRMAR_COMPRA', 'CANCELAR_COMPRA',
  'LOGIN_EXITOSO', 'LOGIN_FALLIDO', 'LOGOUT',
  'EDITAR_ORDEN', 'CONFIGURAR_ANTICIPO',
  'CREAR_PRODUCTO', 'EDITAR_PRODUCTO', 'ACTIVAR_PRODUCTO', 'DESACTIVAR_PRODUCTO',
  'CREAR_CLIENTE', 'EDITAR_CLIENTE', 'ACTIVAR_CLIENTE', 'DESACTIVAR_CLIENTE',
  'CREAR_PROVEEDOR', 'EDITAR_PROVEEDOR', 'ACTIVAR_PROVEEDOR', 'DESACTIVAR_PROVEEDOR',
  'CREAR_CATEGORIA', 'EDITAR_CATEGORIA', 'ACTIVAR_CATEGORIA', 'DESACTIVAR_CATEGORIA',
  'ACTIVAR_USUARIO', 'DESACTIVAR_USUARIO', 'CAMBIAR_PASSWORD_USUARIO',
  'GENERAR_FACTURA_VENTA',
];

// ── Modal de detalles ─────────────────────────────────────────────────────────

const DetalleModal: React.FC<{ entry: AuditoriaEntry; onClose: () => void }> = ({ entry, onClose }) => {
  const modStyle = MODULO_COLORS[entry.modulo] ?? { bg: '#f1f5f9', color: '#475569' };
  const icon = ACCION_ICON[entry.accion] ?? '⚡';
  const label = ACCION_LABEL[entry.accion] ?? entry.accion;
  const desc = ACCION_DESC[entry.accion];

  // Intentar parsear el campo detalle como JSON para mostrarlo bonito
  let parsedDetalle: Record<string, unknown> | null = null;
  if (entry.detalle) {
    try {
      const parsed = JSON.parse(entry.detalle);
      if (typeof parsed === 'object' && parsed !== null) parsedDetalle = parsed as Record<string, unknown>;
    } catch { /* no es JSON, se muestra como texto */ }
  }

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 9000,
        background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '1rem',
      }}
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div style={{
        background: '#fff', borderRadius: '20px',
        width: '100%', maxWidth: '560px',
        boxShadow: '0 24px 60px rgba(0,0,0,0.22)',
        overflow: 'hidden',
        animation: 'modalIn 0.18s cubic-bezier(0.34,1.56,0.64,1)',
      }}>

        {/* Header del modal */}
        <div style={{
          background: 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 60%, #312e81 100%)',
          padding: '1.5rem 1.75rem',
          display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '1rem',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.9rem' }}>
            <div style={{
              width: '48px', height: '48px', borderRadius: '14px',
              background: 'rgba(255,255,255,0.12)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '1.5rem', flexShrink: 0,
            }}>
              {icon}
            </div>
            <div>
              <div style={{ fontSize: '0.68rem', color: 'rgba(255,255,255,0.45)', fontFamily: 'monospace', letterSpacing: '0.5px', marginBottom: '0.2rem' }}>
                DETALLE DE ACCIÓN · AUDITORÍA
              </div>
              <div style={{ fontSize: '1.05rem', fontWeight: '800', color: '#fff', lineHeight: 1.2 }}>
                {label}
              </div>
              {desc && (
                <div style={{ fontSize: '0.77rem', color: 'rgba(255,255,255,0.55)', marginTop: '0.3rem' }}>
                  {desc}
                </div>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.15)',
              borderRadius: '8px', color: '#fff', cursor: 'pointer',
              width: '30px', height: '30px', display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '0.85rem', flexShrink: 0,
            }}
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: '1.5rem 1.75rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>

          {/* Fila: módulo + acción interna */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
            <InfoBlock
              label="Módulo"
              value={
                <span style={{
                  background: modStyle.bg, color: modStyle.color,
                  padding: '0.2rem 0.6rem', borderRadius: '20px',
                  fontSize: '0.78rem', fontWeight: '700',
                }}>
                  {entry.modulo}
                </span>
              }
            />
            <InfoBlock
              label="Acción interna"
              value={
                <code style={{
                  background: '#f1f5f9', color: '#475569',
                  padding: '0.2rem 0.5rem', borderRadius: '6px',
                  fontSize: '0.78rem', fontFamily: 'monospace',
                }}>
                  {entry.accion}
                </code>
              }
            />
          </div>

          {/* Fila: usuario + fecha */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
            <InfoBlock
              label="Usuario"
              value={
                <div>
                  <div style={{ fontWeight: '700', color: '#0f172a', fontSize: '0.88rem' }}>
                    {entry.usuarioNombre ?? '—'}
                  </div>
                  {entry.usuarioId && (
                    <div style={{ fontFamily: 'monospace', fontSize: '0.68rem', color: '#94a3b8', marginTop: '0.15rem' }}>
                      ID: {entry.usuarioId.substring(0, 16)}…
                    </div>
                  )}
                </div>
              }
            />
            <InfoBlock
              label="Fecha y hora"
              value={
                <div>
                  <div style={{ fontWeight: '600', color: '#0f172a', fontSize: '0.83rem' }}>
                    {formatFechaCorta(entry.fecha)}
                  </div>
                  <div style={{ fontSize: '0.7rem', color: '#94a3b8', marginTop: '0.1rem' }}>
                    {formatFecha(entry.fecha)}
                  </div>
                </div>
              }
            />
          </div>

          {/* Entidad afectada */}
          {entry.entidadId && (
            <InfoBlock
              label="ID de entidad afectada"
              value={
                <code style={{
                  display: 'block', background: '#f8fafc', border: '1px solid #e2e8f0',
                  borderRadius: '8px', padding: '0.5rem 0.75rem',
                  fontFamily: 'monospace', fontSize: '0.82rem', color: '#475569',
                  wordBreak: 'break-all',
                }}>
                  {entry.entidadId}
                </code>
              }
            />
          )}

          {/* Detalle */}
          {entry.detalle && (
            <InfoBlock
              label="Detalle de la acción"
              value={
                parsedDetalle ? (
                  <div style={{
                    background: '#f8fafc', border: '1px solid #e2e8f0',
                    borderRadius: '10px', overflow: 'hidden',
                  }}>
                    {Object.entries(parsedDetalle).map(([k, v]) => (
                      <div key={k} style={{
                        display: 'grid', gridTemplateColumns: '140px 1fr',
                        borderBottom: '1px solid #f1f5f9', padding: '0.5rem 0.75rem',
                        fontSize: '0.82rem', alignItems: 'start',
                      }}>
                        <span style={{ color: '#64748b', fontWeight: '600', textTransform: 'capitalize' }}>
                          {k.replace(/_/g, ' ')}
                        </span>
                        <span style={{ color: '#0f172a', wordBreak: 'break-word' }}>
                          {typeof v === 'object' ? JSON.stringify(v) : String(v ?? '—')}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div style={{
                    background: '#f8fafc', border: '1px solid #e2e8f0',
                    borderRadius: '10px', padding: '0.75rem 1rem',
                    fontSize: '0.85rem', color: '#334155', lineHeight: 1.6,
                    whiteSpace: 'pre-wrap', wordBreak: 'break-word',
                  }}>
                    {entry.detalle}
                  </div>
                )
              }
            />
          )}

          {/* ID de registro */}
          <div style={{
            background: '#f8fafc', border: '1px solid #e2e8f0',
            borderRadius: '10px', padding: '0.6rem 0.9rem',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          }}>
            <span style={{ fontSize: '0.72rem', color: '#94a3b8', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.3px' }}>
              ID del registro
            </span>
            <code style={{ fontSize: '0.75rem', color: '#475569', fontFamily: 'monospace' }}>
              {entry.id}
            </code>
          </div>
        </div>

        {/* Footer */}
        <div style={{
          padding: '0.85rem 1.75rem',
          borderTop: '1px solid #f1f5f9',
          display: 'flex', justifyContent: 'flex-end',
        }}>
          <button
            onClick={onClose}
            style={{
              background: '#f1f5f9', border: 'none', borderRadius: '10px',
              padding: '0.5rem 1.25rem', color: '#475569',
              fontWeight: '600', fontSize: '0.85rem', cursor: 'pointer',
              transition: 'background 0.15s',
            }}
            onMouseEnter={e => (e.currentTarget.style.background = '#e2e8f0')}
            onMouseLeave={e => (e.currentTarget.style.background = '#f1f5f9')}
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};

// ── Bloque de info reutilizable ───────────────────────────────────────────────
const InfoBlock: React.FC<{ label: string; value: React.ReactNode }> = ({ label, value }) => (
  <div>
    <div style={{
      fontSize: '0.68rem', fontWeight: '700', color: '#94a3b8',
      textTransform: 'uppercase', letterSpacing: '0.4px', marginBottom: '0.35rem',
    }}>
      {label}
    </div>
    <div>{value}</div>
  </div>
);

// ── Página principal ──────────────────────────────────────────────────────────

const Auditoria: React.FC = () => {
  const navigate  = useNavigate();
  const user      = authService.getUser();
  const rol       = user?.rol?.nombre;

  const [entries, setEntries]   = useState<AuditoriaEntry[]>([]);
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState<string | null>(null);
  const [selected, setSelected] = useState<AuditoriaEntry | null>(null);

  // filters
  const [filtroModulo, setFiltroModulo] = useState('');
  const [filtroAccion, setFiltroAccion] = useState('');
  const [filtroUsuario, setFiltroUsuario] = useState('');
  const [fechaDesde, setFechaDesde] = useState('');
  const [fechaHasta, setFechaHasta] = useState('');
  const [limit, setLimit]               = useState(100);

  // redirect non-admins
  useEffect(() => {
    if (rol !== 'ADMIN') navigate('/dashboard');
  }, [rol, navigate]);

  useEffect(() => {
    if (rol !== 'ADMIN') return;
    usuarioService.getUsuarios()
      .then(setUsuarios)
      .catch(() => setUsuarios([]));
  }, [rol]);

  const cargar = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params: Record<string, string | number> = { limit };
      if (filtroModulo && filtroModulo.trim() !== '') params.modulo = filtroModulo.trim();
      if (filtroAccion && filtroAccion.trim() !== '') params.accion = filtroAccion.trim();
      if (filtroUsuario && filtroUsuario.trim() !== '') params.usuarioId = filtroUsuario.trim();
      if (fechaDesde && fechaDesde.trim() !== '') params.fechaDesde = fechaDesde.trim();
      if (fechaHasta && fechaHasta.trim() !== '') params.fechaHasta = fechaHasta.trim();
      const data = await auditoriaService.getAuditoria(params as any);
      setEntries(data);
    } catch {
      setError('Error al cargar el log de auditoría');
    } finally {
      setLoading(false);
    }
  }, [filtroModulo, filtroAccion, filtroUsuario, fechaDesde, fechaHasta, limit]);

  // Auto-refresco: cada 30 s + inmediato al volver a la pestaña
  useEffect(() => {
    cargar();
    const interval = setInterval(cargar, 30_000);
    const onVisible = () => { if (document.visibilityState === 'visible') cargar(); };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [cargar]);

  // ── render ─────────────────────────────────────────────────────────────────

  return (
    <div className="page-container">

      {/* Header */}
      <div style={{
        background: 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 60%, #312e81 100%)',
        borderRadius: '16px', padding: '1.75rem 2rem', color: 'white',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem',
      }}>
        <div>
          <p style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)', marginBottom: '0.25rem', fontFamily: 'monospace', letterSpacing: '0.5px' }}>
            ERG-INVENTORY · SOLO ADMIN
          </p>
          <h1 style={{ fontSize: '1.4rem', fontWeight: '800', marginBottom: '0.3rem' }}>
            📋 Log de Auditoría
          </h1>
          <p style={{ fontSize: '0.82rem', color: 'rgba(255,255,255,0.6)' }}>
            Registro inmutable de todas las acciones del sistema · haz clic en una fila para ver detalles
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <span style={{
            fontSize: '0.75rem', background: 'rgba(255,255,255,0.12)',
            padding: '0.35rem 0.75rem', borderRadius: '20px', color: 'rgba(255,255,255,0.8)',
          }}>
            {entries.length} registros
          </span>
          <button
            onClick={() => navigate('/dashboard')}
            style={{
              background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)',
              borderRadius: '10px', padding: '0.4rem 0.9rem', color: 'white',
              fontSize: '0.8rem', cursor: 'pointer',
            }}
          >
            ← Dashboard
          </button>
        </div>
      </div>

      {/* Filters */}
      <div style={{
        background: '#fff', borderRadius: '14px', padding: '1rem 1.25rem',
        border: '1px solid #e2e8f0', display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'flex-end',
      }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem', flex: '1 1 150px' }}>
          <label style={{ fontSize: '0.72rem', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.4px' }}>Módulo</label>
          <select
            value={filtroModulo}
            onChange={e => setFiltroModulo(e.target.value)}
            style={{ padding: '0.45rem 0.7rem', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '0.85rem', background: '#f8fafc' }}
          >
            {MODULOS.map(m => <option key={m} value={m}>{m || 'Todos'}</option>)}
          </select>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem', flex: '1 1 180px' }}>
          <label style={{ fontSize: '0.72rem', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.4px' }}>Acción</label>
          <select
            value={filtroAccion}
            onChange={e => setFiltroAccion(e.target.value)}
            style={{ padding: '0.45rem 0.7rem', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '0.85rem', background: '#f8fafc' }}
          >
            {ACCIONES.map(a => <option key={a} value={a}>{a || 'Todas'}</option>)}
          </select>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem', flex: '1 1 220px' }}>
          <label style={{ fontSize: '0.72rem', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.4px' }}>Usuario</label>
          <select
            value={filtroUsuario}
            onChange={e => setFiltroUsuario(e.target.value)}
            style={{ padding: '0.45rem 0.7rem', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '0.85rem', background: '#f8fafc' }}
          >
            <option value="">Todos</option>
            {usuarios.map(u => (
              <option key={u.id} value={u.id}>
                {u.nombre} ({u.email})
              </option>
            ))}
          </select>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem', flex: '1 1 140px' }}>
          <label style={{ fontSize: '0.72rem', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.4px' }}>Desde</label>
          <input
            type="date"
            value={fechaDesde}
            onChange={e => setFechaDesde(e.target.value)}
            style={{ padding: '0.45rem 0.7rem', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '0.85rem', background: '#f8fafc' }}
          />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem', flex: '1 1 140px' }}>
          <label style={{ fontSize: '0.72rem', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.4px' }}>Hasta</label>
          <input
            type="date"
            value={fechaHasta}
            onChange={e => setFechaHasta(e.target.value)}
            style={{ padding: '0.45rem 0.7rem', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '0.85rem', background: '#f8fafc' }}
          />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem', flex: '1 1 160px' }}>
          <label style={{ fontSize: '0.72rem', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.4px' }}>Límite</label>
          <select
            value={limit}
            onChange={e => setLimit(Number(e.target.value))}
            style={{ padding: '0.45rem 0.7rem', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '0.85rem', background: '#f8fafc' }}
          >
            {[50, 100, 200, 500].map(n => <option key={n} value={n}>{n} registros</option>)}
          </select>
        </div>
        <button
          onClick={cargar}
          style={{
            padding: '0.5rem 1.1rem', background: '#4f46e5', color: 'white',
            border: 'none', borderRadius: '10px', fontSize: '0.85rem', fontWeight: '600',
            cursor: 'pointer', alignSelf: 'flex-end',
          }}
        >
          🔍 Filtrar
        </button>
      </div>

      {/* Table */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: '#94a3b8' }}>
          <div style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>⏳</div>
          Cargando auditoría…
        </div>
      ) : error ? (
        <div style={{
          background: '#fee2e2', borderRadius: '12px', padding: '1rem 1.5rem',
          color: '#991b1b', fontWeight: '600', fontSize: '0.9rem',
        }}>
          {error}
        </div>
      ) : entries.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: '#94a3b8' }}>
          <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>📭</div>
          Sin registros con los filtros actuales
        </div>
      ) : (
        <div style={{ background: '#fff', borderRadius: '14px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
          {/* Tip */}
          <div style={{
            padding: '0.6rem 1.25rem',
            background: '#f0f9ff', borderBottom: '1px solid #bae6fd',
            fontSize: '0.75rem', color: '#0369a1', display: 'flex', alignItems: 'center', gap: '0.5rem',
          }}>
            <span>💡</span>
            <span>Haz clic en cualquier fila para ver el detalle completo de la acción</span>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.83rem' }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                  {['', 'Fecha', 'Módulo', 'Acción', 'Usuario', 'Detalle', 'Entidad'].map(h => (
                    <th key={h} style={{
                      padding: '0.75rem 1rem', textAlign: 'left',
                      fontSize: '0.72rem', fontWeight: '700', color: '#64748b',
                      textTransform: 'uppercase', letterSpacing: '0.4px', whiteSpace: 'nowrap',
                    }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {entries.map((e, i) => {
                  const modStyle = MODULO_COLORS[e.modulo] ?? { bg: '#f1f5f9', color: '#475569' };
                  return (
                    <tr
                      key={e.id}
                      onClick={() => setSelected(e)}
                      style={{
                        borderBottom: '1px solid #f1f5f9',
                        background: i % 2 === 0 ? '#ffffff' : '#fafafa',
                        cursor: 'pointer',
                        transition: 'background 0.15s',
                      }}
                      onMouseEnter={ev => (ev.currentTarget as HTMLTableRowElement).style.background = '#eff6ff'}
                      onMouseLeave={ev => (ev.currentTarget as HTMLTableRowElement).style.background = i % 2 === 0 ? '#ffffff' : '#fafafa'}
                      title="Clic para ver detalles"
                    >
                      {/* Ícono de acción */}
                      <td style={{ padding: '0.65rem 0.5rem 0.65rem 1rem', fontSize: '1rem', textAlign: 'center', width: '36px' }}>
                        {ACCION_ICON[e.accion] ?? '⚡'}
                      </td>
                      <td style={{ padding: '0.65rem 1rem', color: '#475569', whiteSpace: 'nowrap' }}>
                        {formatFechaCorta(e.fecha)}
                      </td>
                      <td style={{ padding: '0.65rem 1rem' }}>
                        <span style={{
                          background: modStyle.bg, color: modStyle.color,
                          fontSize: '0.71rem', fontWeight: '700',
                          padding: '0.2rem 0.55rem', borderRadius: '20px', letterSpacing: '0.3px',
                        }}>
                          {e.modulo}
                        </span>
                      </td>
                      <td style={{ padding: '0.65rem 1rem', whiteSpace: 'nowrap' }}>
                        <span style={{ fontWeight: '600', color: '#334155', fontSize: '0.8rem' }}>
                          {ACCION_LABEL[e.accion] ?? e.accion}
                        </span>
                      </td>
                      <td style={{ padding: '0.65rem 1rem', color: '#475569' }}>
                        {e.usuarioNombre ?? <span style={{ color: '#94a3b8', fontStyle: 'italic' }}>Sistema</span>}
                      </td>
                      <td style={{ padding: '0.65rem 1rem', color: '#334155', maxWidth: '260px' }}>
                        <span title={e.detalle ?? ''} style={{
                          display: 'block', overflow: 'hidden',
                          textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                        }}>
                          {e.detalle ?? '—'}
                        </span>
                      </td>
                      <td style={{ padding: '0.65rem 1rem', color: '#94a3b8', fontSize: '0.7rem', fontFamily: 'monospace' }}>
                        {e.entidadId ? e.entidadId.substring(0, 8).toUpperCase() : '—'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal de detalles */}
      {selected && <DetalleModal entry={selected} onClose={() => setSelected(null)} />}

      {/* Estilos de animación */}
      <style>{`
        @keyframes modalIn {
          from { opacity: 0; transform: scale(0.94) translateY(10px); }
          to   { opacity: 1; transform: scale(1) translateY(0); }
        }
      `}</style>
    </div>
  );
};

export default Auditoria;
