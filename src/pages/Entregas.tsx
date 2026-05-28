import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { authService } from '../services/authService';
import ActionMenu from '../components/ActionMenu';
import { clienteService } from '../services/clienteService';
import { numeroALetras, getEmpresa } from '../utils/formatters';
import type { Cliente } from '../types';

interface OrdenItem {
    id?: string;
    producto: { id: string; nombre: string; codigo: string };
    cantidad: number;
    precioUnitario?: number;
}

interface PagoOrden {
    id: string;
    monto: number;
    notas?: string;
    fecha: string;
    usuario?: { id: string; nombre: string };
}

interface Orden {
    id: string;
    clienteNombre: string;
    clienteTelefono?: string;
    cliente?: { id: string; nombre?: string };
    direccion: string;
    tipo: 'REPARACION' | 'ENTREGA' | 'INSTALACION';
    descripcionProblema?: string;
    manoObra?: number;
    estado: 'PENDIENTE' | 'EN_PROCESO' | 'COMPLETADO' | 'FINALIZADO' | 'CANCELADO';
    estadoPago?: 'PENDIENTE' | 'ANTICIPO' | 'PARCIAL' | 'COMPLETO';
    totalOrden?: number;
    anticipoPorcentaje?: number;
    anticipoRecibido?: number;
    fechaCreacion: string;
    fechaCompletado?: string;
    fechaEntrega?: string;
    notasTecnico?: string;
    items?: OrdenItem[];
    producto?: { id: string; nombre: string; codigo: string };
    cantidad?: number;
    tecnico?: { id: string; nombre: string };
    pagos?: PagoOrden[];
}

interface Producto { id: string; nombre: string; codigo: string; stock: number; precio: number; }
interface Tecnico { id: string; nombre: string; email: string; }
interface FormItem { id?: string; productoId: string; cantidad: number; cantidadStr?: string; precioUnitario: number; }

const ESTADO_CONFIG = {
    PENDIENTE: { clase: 'badge-yellow', label: 'Pendiente', icono: '⏳' },
    EN_PROCESO: { clase: 'badge-blue', label: 'En proceso', icono: '🔧' },
    COMPLETADO: { clase: 'badge-purple', label: 'Completado', icono: '✔️' },
    FINALIZADO: { clase: 'badge-green', label: 'Finalizado', icono: '✅' },
    CANCELADO: { clase: 'badge-red', label: 'Cancelado', icono: '❌' },
};

const PAGO_CONFIG = {
    PENDIENTE: { color: '#ef4444', bg: '#fee2e2', label: 'Sin pago' },
    ANTICIPO: { color: '#f59e0b', bg: '#fef3c7', label: 'Anticipo' },
    PARCIAL: { color: '#3b82f6', bg: '#dbeafe', label: 'Pago parcial' },
    COMPLETO: { color: '#22c55e', bg: '#dcfce7', label: 'Pagado' },
};

const TIPO_CONFIG = {
    REPARACION: { icono: '🔧', label: 'Reparación', color: '#7c3aed', bg: '#ede9fe' },
    ENTREGA: { icono: '🚚', label: 'Entrega', color: '#0ea5e9', bg: '#e0f2fe' },
    INSTALACION: { icono: '🔩', label: 'Instalación', color: '#16a34a', bg: '#dcfce7' },
};

const fmt = (n: number) => '$' + Math.round(n).toLocaleString('es-CO');

const resumenItems = (e: Orden): string => {
    if (e.items && e.items.length > 0)
        return e.items.map(i => `${i.producto?.nombre ?? 'Producto'} x${i.cantidad}`).join(', ');
    if (e.producto) return `${e.producto.nombre} x${e.cantidad ?? 1}`;
    return '—';
};

const fmtFecha = (fecha?: string): string => fecha
    ? new Date(fecha).toLocaleDateString('es-CO')
    : '—';

const OrdenDetalleModal = ({ orden, onClose }: { orden: Orden; onClose: () => void }) => {
    const tc = TIPO_CONFIG[orden.tipo] ?? TIPO_CONFIG.REPARACION;
    const estadoCfg = ESTADO_CONFIG[orden.estado];
    const pago = orden.estadoPago ? PAGO_CONFIG[orden.estadoPago] : null;
    const total = orden.totalOrden ?? 0;
    const pagado = orden.anticipoRecibido ?? 0;
    const saldo = Math.max(total - pagado, 0);

    const rows = [
        { label: 'Cliente', value: orden.clienteNombre },
        { label: 'Teléfono', value: orden.clienteTelefono ?? '—' },
        { label: 'Dirección', value: orden.direccion },
        { label: 'Tipo', value: tc.label },
        { label: 'Técnico', value: orden.tecnico?.nombre ?? 'Sin asignar' },
        { label: 'Productos / servicio', value: resumenItems(orden) },
        { label: 'Total', value: total > 0 ? fmt(total) : '—' },
        { label: 'Pagado', value: pagado > 0 ? fmt(pagado) : '—' },
        { label: 'Saldo', value: saldo > 0 ? fmt(saldo) : '—' },
        { label: 'Creación', value: fmtFecha(orden.fechaCreacion) },
        { label: 'Completado', value: fmtFecha(orden.fechaCompletado) },
        { label: 'Entrega', value: fmtFecha(orden.fechaEntrega) },
    ];

    return (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
            <div className="modal-box" style={{ maxWidth: '620px', padding: 0, overflow: 'hidden' }}>
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
                            width: '46px',
                            height: '46px',
                            borderRadius: '12px',
                            background: 'rgba(255,255,255,0.12)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '1.35rem',
                        }}>{tc.icono}</div>
                        <div>
                            <div style={{ color: 'rgba(255,255,255,0.58)', fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                                Detalle de orden
                            </div>
                            <h2 style={{ color: '#fff', fontSize: '1.1rem', margin: '0.15rem 0 0' }}>{orden.clienteNombre}</h2>
                            <p style={{ color: 'rgba(255,255,255,0.62)', fontSize: '0.78rem', margin: '0.2rem 0 0' }}>
                                #{orden.id.substring(0, 8).toUpperCase()}
                            </p>
                        </div>
                    </div>
                    <button className="modal-close" onClick={onClose} style={{ color: '#fff', borderColor: 'rgba(255,255,255,0.2)', background: 'rgba(255,255,255,0.12)' }}>✕</button>
                </div>

                <div className="modal-body">
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '0.9rem' }}>
                        <span style={{ background: tc.bg, color: tc.color, padding: '0.22rem 0.65rem', borderRadius: '999px', fontSize: '0.78rem', fontWeight: 700 }}>
                            {tc.icono} {tc.label}
                        </span>
                        <span className={`badge ${estadoCfg.clase}`}>{estadoCfg.icono} {estadoCfg.label}</span>
                        {pago && total > 0 && (
                            <span style={{ background: pago.bg, color: pago.color, padding: '0.22rem 0.65rem', borderRadius: '999px', fontSize: '0.78rem', fontWeight: 700 }}>
                                {pago.label}
                            </span>
                        )}
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '0.7rem' }}>
                        {rows.map(row => (
                            <div key={row.label} style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '0.65rem 0.75rem' }}>
                                <div style={{ color: '#94a3b8', fontSize: '0.68rem', fontWeight: 700, textTransform: 'uppercase', marginBottom: '0.2rem' }}>{row.label}</div>
                                <div style={{ color: '#0f172a', fontSize: '0.86rem', fontWeight: 600, wordBreak: 'break-word' }}>{row.value}</div>
                            </div>
                        ))}
                    </div>

                    {orden.descripcionProblema && (
                        <div style={{ marginTop: '0.75rem', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '0.7rem 0.85rem', fontSize: '0.86rem' }}>
                            <div style={{ color: '#64748b', fontWeight: 700, marginBottom: '0.25rem' }}>Descripción</div>
                            <div style={{ color: '#334155' }}>{orden.descripcionProblema}</div>
                        </div>
                    )}
                    {orden.notasTecnico && (
                        <div style={{ marginTop: '0.75rem', background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '8px', padding: '0.7rem 0.85rem', fontSize: '0.86rem' }}>
                            <div style={{ color: '#1d4ed8', fontWeight: 700, marginBottom: '0.25rem' }}>Notas técnico</div>
                            <div style={{ color: '#1e40af' }}>{orden.notasTecnico}</div>
                        </div>
                    )}
                </div>
                <div className="modal-footer">
                    <button className="btn btn-secondary" onClick={onClose}>Cerrar</button>
                </div>
            </div>
        </div>
    );
};

const FacturaOrdenModal = ({ orden, onClose }: { orden: Orden; onClose: () => void }) => {
    const emp = getEmpresa();
    const IVA_FACTOR = 1.19;
    const fmtDate = (s: string) => new Date(s).toLocaleDateString('es-CO',
        { day: '2-digit', month: '2-digit', year: 'numeric' });

    const itemsCalc = (orden.items ?? []).map(item => {
        const precioFinal = item.precioUnitario ?? 0;
        const baseUnitaria = precioFinal / IVA_FACTOR;
        const totalFinalItem = precioFinal * item.cantidad;
        const baseItem = baseUnitaria * item.cantidad;
        const ivaItem = totalFinalItem - baseItem;
        return { ...item, precioFinal, baseUnitaria, totalFinalItem, baseItem, ivaItem };
    });

    const manoObraFinal = orden.manoObra ?? 0;
    const manoObraBase = manoObraFinal / IVA_FACTOR;
    const manoObraIva = manoObraFinal - manoObraBase;

    const subtotalBase = itemsCalc.reduce((s, i) => s + i.baseItem, 0) + manoObraBase;
    const totalIva = itemsCalc.reduce((s, i) => s + i.ivaItem, 0) + manoObraIva;
    const totalFinal = itemsCalc.reduce((s, i) => s + i.totalFinalItem, 0) + manoObraFinal;

    const pagado = orden.anticipoRecibido ?? 0;
    const saldo = totalFinal - pagado;
    const esBorrador = orden.estado !== 'FINALIZADO';

    return (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
            <div className="modal-box" style={{ maxWidth: '720px', padding: 0, overflow: 'hidden' }}>
                <div className="no-print" style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    padding: '0.9rem 1.5rem',
                    background: esBorrador ? '#fefce8' : '#f0fdf4',
                    borderBottom: esBorrador ? '2px solid #fde68a' : '2px solid #bbf7d0'
                }}>
                    <div>
                        <span style={{ fontWeight: 700, color: esBorrador ? '#92400e' : '#166534', fontSize: '0.95rem' }}>
                            {esBorrador ? '📋 Documento Preliminar — Orden de Servicio' : '🧾 Factura Orden de Servicio'}
                        </span>
                        {esBorrador && (
                            <div style={{ fontSize: '0.72rem', color: '#a16207', marginTop: '0.1rem' }}>
                                Este documento es preliminar. Se generará la factura oficial al confirmar el servicio.
                            </div>
                        )}
                    </div>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button className="action-btn" onClick={() => window.print()} style={{ fontSize: '0.82rem' }}>🖨️ Imprimir</button>
                        <button className="action-btn" onClick={onClose} style={{ fontSize: '0.82rem' }}>✕ Cerrar</button>
                    </div>
                </div>

                <div id="factura-orden-print" style={{
                    padding: '1.75rem 2rem', maxHeight: '80vh', overflowY: 'auto',
                    fontFamily: 'Arial, sans-serif', fontSize: '0.85rem', color: '#1e293b', position: 'relative'
                }}>
                    {esBorrador && (
                        <div style={{
                            position: 'absolute', top: '50%', left: '50%',
                            transform: 'translate(-50%,-50%) rotate(-35deg)',
                            fontSize: '5rem', fontWeight: 900, color: 'rgba(239,68,68,0.08)',
                            pointerEvents: 'none', userSelect: 'none', zIndex: 0, whiteSpace: 'nowrap'
                        }}>BORRADOR</div>
                    )}

                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
                        <div>
                            <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#1F3864' }}>{emp.nombre}</div>
                            <div style={{ color: '#475569', marginTop: '0.3rem', lineHeight: 1.8, fontSize: '0.82rem' }}>
                                <div>NIT: {emp.nit} — Régimen Simple de Tributación</div>
                                <div>{emp.direccion}</div>
                                <div>Tel: {emp.telefono}</div>
                                <div>{emp.email}</div>
                            </div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                            <div style={{ fontSize: '0.7rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                {esBorrador ? 'ORDEN DE SERVICIO — PRELIMINAR' : 'ORDEN DE SERVICIO'}
                            </div>
                            <div style={{ fontSize: '1.6rem', fontWeight: 800, color: esBorrador ? '#ef4444' : '#1F3864', margin: '0.2rem 0' }}>
                                {esBorrador ? 'BORRADOR' : `OS-${orden.id.substring(0, 8).toUpperCase()}`}
                            </div>
                            <div style={{ color: '#475569', lineHeight: 1.8, fontSize: '0.82rem' }}>
                                <div>Fecha: {fmtDate(orden.fechaCreacion)}</div>
                                {orden.fechaCompletado && <div>Completado: {fmtDate(orden.fechaCompletado)}</div>}
                                <div>Forma de pago: Contado</div>
                                <div>Tipo: {TIPO_CONFIG[orden.tipo]?.label ?? orden.tipo}</div>
                            </div>
                        </div>
                    </div>

                    <div style={{ borderTop: '2px solid #1F3864', margin: '0.75rem 0' }} />

                    <div style={{ marginBottom: '0.75rem' }}>
                        <div style={{ fontSize: '0.7rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.4rem' }}>
                            SEÑORES (DATOS DEL CLIENTE)
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.25rem', color: '#334155', fontSize: '0.83rem' }}>
                            <div><strong>Nombre:</strong> {orden.clienteNombre}</div>
                            <div><strong>Teléfono:</strong> {orden.clienteTelefono ?? '—'}</div>
                            <div style={{ gridColumn: '1/-1' }}><strong>Dirección del servicio:</strong> {orden.direccion}</div>
                            {orden.descripcionProblema && (
                                <div style={{ gridColumn: '1/-1' }}><strong>Descripción:</strong> {orden.descripcionProblema}</div>
                            )}
                        </div>
                    </div>

                    <div style={{ borderTop: '1px solid #e2e8f0', margin: '0.75rem 0' }} />

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.5rem', marginBottom: '0.75rem', fontSize: '0.82rem' }}>
                        {[
                            { label: 'TÉCNICO', value: orden.tecnico?.nombre ?? emp.nombre },
                            { label: 'FORMA DE PAGO', value: 'CAJA EFECTIVO' },
                            { label: 'MEDIOS DE PAGO', value: 'CONTADO' },
                        ].map(b => (
                            <div key={b.label} style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '6px', padding: '0.4rem 0.6rem' }}>
                                <div style={{ fontSize: '0.68rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>{b.label}</div>
                                <div style={{ fontWeight: 600, color: '#1e293b' }}>{b.value}</div>
                            </div>
                        ))}
                    </div>

                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
                        <thead>
                            <tr style={{ background: '#1F3864' }}>
                                {['Descripción', 'Cant.', 'U.M', 'Precio Unit.', 'Base', 'Total', 'IVA%'].map(h => (
                                    <th key={h} style={{
                                        padding: '0.45rem 0.6rem', color: '#fff', fontWeight: 600, fontSize: '0.75rem',
                                        textAlign: ['Cant.', 'Precio Unit.', 'Base', 'Total', 'IVA%'].includes(h) ? 'right' : 'left'
                                    }}>{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {itemsCalc.map((item, i) => (
                                <tr key={i} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                    <td style={{ padding: '0.45rem 0.6rem' }}>{item.producto?.nombre ?? '—'}</td>
                                    <td style={{ padding: '0.45rem 0.6rem', textAlign: 'right' }}>{item.cantidad}</td>
                                    <td style={{ padding: '0.45rem 0.6rem', color: '#64748b' }}>Und</td>
                                    <td style={{ padding: '0.45rem 0.6rem', textAlign: 'right' }}>{fmt(item.precioFinal)}</td>
                                    <td style={{ padding: '0.45rem 0.6rem', textAlign: 'right', color: '#64748b' }}>{fmt(item.baseItem)}</td>
                                    <td style={{ padding: '0.45rem 0.6rem', textAlign: 'right', fontWeight: 600 }}>{fmt(item.totalFinalItem)}</td>
                                    <td style={{ padding: '0.45rem 0.6rem', textAlign: 'right', color: '#64748b' }}>19%</td>
                                </tr>
                            ))}
                            {manoObraFinal > 0 && (
                                <tr style={{ borderBottom: '1px solid #f1f5f9', background: '#fafafa' }}>
                                    <td style={{ padding: '0.45rem 0.6rem', fontStyle: 'italic', color: '#475569' }}>Mano de obra / Servicio técnico</td>
                                    <td style={{ padding: '0.45rem 0.6rem', textAlign: 'right' }}>1</td>
                                    <td style={{ padding: '0.45rem 0.6rem', color: '#64748b' }}>Und</td>
                                    <td style={{ padding: '0.45rem 0.6rem', textAlign: 'right' }}>{fmt(manoObraFinal)}</td>
                                    <td style={{ padding: '0.45rem 0.6rem', textAlign: 'right', color: '#64748b' }}>{fmt(manoObraBase)}</td>
                                    <td style={{ padding: '0.45rem 0.6rem', textAlign: 'right', fontWeight: 600 }}>{fmt(manoObraFinal)}</td>
                                    <td style={{ padding: '0.45rem 0.6rem', textAlign: 'right', color: '#64748b' }}>19%</td>
                                </tr>
                            )}
                        </tbody>
                    </table>

                    <div style={{ borderTop: '1px solid #e2e8f0', margin: '0.75rem 0' }} />

                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', alignItems: 'flex-start' }}>
                        <div style={{ flex: 1 }}>
                            <div style={{ fontSize: '0.7rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', marginBottom: '0.3rem' }}>VALOR EN LETRAS</div>
                            <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '0.5rem 0.75rem', fontSize: '0.78rem', color: '#334155', fontStyle: 'italic' }}>
                                {numeroALetras(Math.round(totalFinal))}
                            </div>
                            {esBorrador && (
                                <div style={{ marginTop: '0.5rem', background: '#fef9c3', border: '1px solid #fde68a', borderRadius: '6px', padding: '0.4rem 0.6rem', fontSize: '0.72rem', color: '#92400e' }}>
                                    ⚠️ Documento preliminar — Precios finales con IVA incluido (19%)
                                </div>
                            )}
                        </div>
                        <div style={{ minWidth: '240px' }}>
                            {[
                                { label: 'SUBTOTAL (base gravable):', value: subtotalBase },
                                { label: 'DESCUENTO:', value: 0 },
                                { label: 'IVA (19%):', value: totalIva },
                                { label: 'RETEFUENTE:', value: 0 },
                                { label: 'RETEIVA:', value: 0 },
                            ].map(row => (
                                <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.2rem 0', color: '#475569', fontSize: '0.82rem' }}>
                                    <span>{row.label}</span><span>{fmt(row.value)}</span>
                                </div>
                            ))}
                            <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '2px solid #1F3864', paddingTop: '0.35rem', marginTop: '0.25rem', fontSize: '0.95rem', fontWeight: 800, color: '#1F3864' }}>
                                <span>NETO A PAGAR:</span><span>{fmt(totalFinal)}</span>
                            </div>
                            {pagado > 0 && (
                                <>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.2rem 0', color: '#22c55e', fontSize: '0.82rem', fontWeight: 600 }}>
                                        <span>Pagado:</span><span>{fmt(pagado)}</span>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.2rem 0', fontSize: '0.88rem', fontWeight: 700, color: saldo > 0 ? '#ef4444' : '#22c55e' }}>
                                        <span>{saldo > 0 ? 'SALDO PENDIENTE:' : '✅ PAGADO COMPLETO'}</span>
                                        <span>{saldo > 0 ? fmt(saldo) : ''}</span>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>

                    <div style={{ borderTop: '1px solid #e2e8f0', margin: '0.75rem 0' }} />

                    <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '0.6rem 0.85rem', fontSize: '0.72rem', color: '#64748b', marginBottom: '0.75rem', lineHeight: 1.6 }}>
                        {esBorrador
                            ? 'Este es un documento preliminar de orden de servicio. Los precios son finales con IVA incluido (19%). La base gravable resulta de dividir el precio final entre 1.19. La factura oficial se generará una vez confirmado el servicio.'
                            : 'No somos grandes contribuyentes. No somos agentes de retención de IVA. Régimen Simple de Tributación. Esta factura se asimila en sus efectos legales a una letra de cambio según Art. 774 del Código de Comercio.'}
                    </div>

                    {orden.notasTecnico && (
                        <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '8px', padding: '0.6rem 0.85rem', fontSize: '0.78rem', color: '#1d4ed8', marginBottom: '0.75rem' }}>
                            <strong>Notas del técnico:</strong> {orden.notasTecnico}
                        </div>
                    )}

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem', marginTop: '0.5rem' }}>
                        <div style={{ textAlign: 'center' }}>
                            <div style={{ borderTop: '1px solid #334155', paddingTop: '0.5rem', marginTop: '2.5rem', fontSize: '0.8rem', color: '#475569' }}>
                                <div>Técnico / Responsable</div>
                                <div style={{ color: '#94a3b8', fontSize: '0.72rem' }}>{orden.tecnico?.nombre ?? emp.nombre}</div>
                            </div>
                        </div>
                        <div style={{ textAlign: 'center' }}>
                            <div style={{ borderTop: '1px solid #334155', paddingTop: '0.5rem', marginTop: '2.5rem', fontSize: '0.8rem', color: '#475569' }}>
                                <div>Firma y sello del cliente</div>
                                <div style={{ color: '#94a3b8', fontSize: '0.72rem' }}>Confirma recepción conforme</div>
                            </div>
                        </div>
                    </div>

                    <div style={{ textAlign: 'center', marginTop: '1rem', color: '#94a3b8', fontSize: '0.72rem', borderTop: '1px solid #f1f5f9', paddingTop: '0.75rem' }}>
                        <div style={{ fontWeight: 700, color: '#1F3864', fontSize: '0.82rem' }}>Gracias por su servicio</div>
                        <div>{emp.nombre} — {emp.telefono} — {emp.email}</div>
                    </div>
                </div>
            </div>
        </div>
    );
};

// ── Tabla de items ────────────────────────────────────────────────────────────
const ItemsTable = ({ items, productos, onChange, onAgregar, onRemover }: {
    items: FormItem[];
    productos: Producto[];
    onChange: (idx: number, field: keyof FormItem, value: string | number) => void;
    onAgregar: () => void;
    onRemover: (idx: number) => void;
}) => {
    const subtotalItems = items.reduce((s, i) => s + i.cantidad * i.precioUnitario, 0);
    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                <label className="form-label" style={{ margin: 0 }}>📦 Repuestos / Productos</label>
                <button type="button" className="action-btn action-btn-ghost"
                    style={{ fontSize: '0.75rem', padding: '0.25rem 0.6rem' }}
                    onClick={onAgregar}>+ Agregar línea</button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 75px 105px 85px 32px', gap: '0.3rem', marginBottom: '0.25rem', padding: '0 0.1rem' }}>
                {['PRODUCTO', 'CANT.', 'PRECIO UNIT.', 'SUBTOTAL', ''].map(h => (
                    <span key={h} style={{ fontSize: '0.68rem', color: '#64748b', fontWeight: 600, textAlign: h === 'SUBTOTAL' ? 'right' : 'left' }}>{h}</span>
                ))}
            </div>
            {items.map((item, idx) => {
                const prod = productos.find(p => p.id === item.productoId);
                const subtotal = item.cantidad * item.precioUnitario;
                const sinStock = prod !== undefined && prod.stock === 0;
                return (
                    <div key={idx} style={{ display: 'grid', gridTemplateColumns: '1fr 75px 105px 85px 32px', gap: '0.3rem', alignItems: 'center', marginBottom: '0.4rem' }}>
                        <div>
                            <select className="form-select" value={item.productoId}
                                onChange={e => {
                                    const p = productos.find(x => x.id === e.target.value);
                                    onChange(idx, 'productoId', e.target.value);
                                    if (p) onChange(idx, 'precioUnitario', p.precio);
                                }}>
                                <option value="">Seleccionar...</option>
                                {productos.map(p => <option key={p.id} value={p.id}>{p.codigo} — {p.nombre}</option>)}
                            </select>
                            {prod && (
                                <span style={{
                                    fontSize: '0.68rem',
                                    color: sinStock ? '#ef4444' : '#94a3b8',
                                    fontWeight: sinStock ? 700 : 400,
                                }}>
                                    Stock: {prod.stock} u.
                                    {sinStock && ' — ⚠️ Sin stock'}
                                </span>
                            )}
                        </div>
                        <input className="form-input" type="number" min="1"
                            value={item.cantidadStr !== undefined ? item.cantidadStr : String(item.cantidad)}
                            onChange={e => {
                                onChange(idx, 'cantidadStr', e.target.value);
                                const parsed = parseInt(e.target.value);
                                if (!isNaN(parsed) && parsed >= 1) onChange(idx, 'cantidad', parsed);
                            }}
                            onBlur={e => {
                                const parsed = parseInt(e.target.value);
                                const safe = (!isNaN(parsed) && parsed >= 1) ? parsed : 1;
                                onChange(idx, 'cantidad', safe);
                                onChange(idx, 'cantidadStr', String(safe));
                            }}
                            style={{ textAlign: 'center', padding: '0.4rem 0.3rem' }} />
                        <input className="form-input" type="number" min="0" value={item.precioUnitario}
                            onChange={e => onChange(idx, 'precioUnitario', parseFloat(e.target.value) || 0)}
                            style={{ textAlign: 'right', padding: '0.4rem 0.3rem' }} />
                        <div style={{ textAlign: 'right', fontWeight: 600, fontSize: '0.83rem', color: subtotal > 0 ? '#0f172a' : '#cbd5e1' }}>
                            {subtotal > 0 ? fmt(subtotal) : '—'}
                        </div>
                        {items.length > 1
                            ? <button type="button" className="icon-btn icon-btn-delete" onClick={() => onRemover(idx)}>✕</button>
                            : <div />}
                    </div>
                );
            })}
            {subtotalItems > 0 && (
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '0.2rem', paddingRight: '40px', fontSize: '0.8rem', color: '#64748b' }}>
                    Subtotal repuestos: <strong style={{ marginLeft: '0.5rem', color: '#0f172a' }}>{fmt(subtotalItems)}</strong>
                </div>
            )}
        </div>
    );
};

// ── Resumen total ─────────────────────────────────────────────────────────────
const ResumenTotal = ({ items, manoObra }: { items: FormItem[]; manoObra: string }) => {
    const subtotalRep = items.reduce((s, i) => s + i.cantidad * i.precioUnitario, 0);
    const manoObraNum = parseFloat(manoObra) || 0;
    const total = subtotalRep + manoObraNum;
    if (total === 0) return null;
    return (
        <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '10px', padding: '0.75rem 1rem', marginTop: '0.75rem' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                {subtotalRep > 0 && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', color: '#475569' }}>
                        <span>Repuestos:</span><span>{fmt(subtotalRep)}</span>
                    </div>
                )}
                {manoObraNum > 0 && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', color: '#475569' }}>
                        <span>Mano de obra:</span><span>{fmt(manoObraNum)}</span>
                    </div>
                )}
                <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid #bbf7d0', paddingTop: '0.25rem', marginTop: '0.1rem', fontSize: '1rem', fontWeight: 800, color: '#15803d' }}>
                    <span>Total estimado:</span><span>{fmt(total)}</span>
                </div>
            </div>
        </div>
    );
};

const Entregas: React.FC = () => {
    const [ordenes, setOrdenes] = useState<Orden[]>([]);
    const [productos, setProductos] = useState<Producto[]>([]);
    const [tecnicos, setTecnicos] = useState<Tecnico[]>([]);
    const [clientes, setClientes] = useState<Cliente[]>([]);
    const [loading, setLoading] = useState(true);
    const [filtroEstado, setFiltroEstado] = useState<string>('todos');
    const [filtroTipo, setFiltroTipo] = useState<string>('todos');
    const [busqueda, setBusqueda] = useState('');
    const [modalNueva, setModalNueva] = useState(false);
    const [modalEditar, setModalEditar] = useState<Orden | null>(null);
    const [modalNotas, setModalNotas] = useState<Orden | null>(null);
    const [modalPagos, setModalPagos] = useState<Orden | null>(null);
    const [modalFactura, setModalFactura] = useState<Orden | null>(null);
    const [modalDetalles, setModalDetalles] = useState<Orden | null>(null);
    const [notasText, setNotasText] = useState('');
    const [loadingForm, setLoadingForm] = useState(false);
    const [errorForm, setErrorForm] = useState('');

    const [tipo, setTipo] = useState<'REPARACION' | 'ENTREGA' | 'INSTALACION'>('REPARACION');
    const [descripcionProb, setDescripcionProb] = useState('');
    const [manoObra, setManoObra] = useState('');
    const [items, setItems] = useState<FormItem[]>([{ productoId: '', cantidad: 1, cantidadStr: '1', precioUnitario: 0 }]);
    const [tecnicoId, setTecnicoId] = useState('');
    const [direccion, setDireccion] = useState('');
    const [notas, setNotas] = useState('');
    const [clienteId, setClienteId] = useState('');
    const [esClienteNuevo, setEsClienteNuevo] = useState(false);
    const [busquedaCliente, setBusquedaCliente] = useState('');
    const [nuevoNombre, setNuevoNombre] = useState('');
    const [nuevoTelefono, setNuevoTelefono] = useState('');
    const [nuevoDocumento, setNuevoDocumento] = useState('');
    const [nuevaDireccion, setNuevaDireccion] = useState('');
    const [nuevaCiudad, setNuevaCiudad] = useState('Cali');

    const [editTipo, setEditTipo] = useState<'REPARACION' | 'ENTREGA' | 'INSTALACION'>('REPARACION');
    const [editDescripcion, setEditDescripcion] = useState('');
    const [editManoObra, setEditManoObra] = useState('');
    const [editItems, setEditItems] = useState<FormItem[]>([]);
    const [editTecnicoId, setEditTecnicoId] = useState('');
    const [editDireccion, setEditDireccion] = useState('');
    const [editClienteNombre, setEditClienteNombre] = useState('');
    const [editClienteTelefono, setEditClienteTelefono] = useState('');

    const [pagoMonto, setPagoMonto] = useState('');
    const [pagoNotas, setPagoNotas] = useState('');
    const [pagoAnticipoPct, setPagoAnticipoPct] = useState('');
    const [loadingPago, setLoadingPago] = useState(false);
    const [errorPago, setErrorPago] = useState('');

    const user = authService.getUser();
    const esAdmin = user?.rol?.nombre === 'ADMIN';
    const esTecnico = user?.rol?.nombre === 'TECNICO';

    const cargarDatos = async () => {
        try {
            setLoading(true);
            const reqs: Promise<any>[] = [
                api.get('/entregas'), api.get('/productos/activos'), clienteService.getClientesActivos(),
            ];
            if (esAdmin) reqs.push(api.get('/usuarios/tecnicos'));
            const res = await Promise.all(reqs);
            setOrdenes(res[0].data); setProductos(res[1].data); setClientes(res[2] as Cliente[]);
            if (esAdmin && res[3]) setTecnicos(res[3].data);
        } catch (err) { console.error('Error:', err); }
        finally { setLoading(false); }
    };

    useEffect(() => { cargarDatos(); }, []);

    const clienteSeleccionado = clientes.find(c => c.id === clienteId);
    const nombreFinal = esClienteNuevo ? nuevoNombre : (clienteSeleccionado?.nombre ?? '');
    const telefonoFinal = esClienteNuevo ? nuevoTelefono : (clienteSeleccionado?.telefono ?? '');

    const handleSeleccionarCliente = (id: string) => {
        setClienteId(id); setBusquedaCliente('');
        const c = clientes.find(cl => cl.id === id);
        if (c?.direccion && !direccion) setDireccion(c.direccion);
    };

    const clientesFiltrados = busquedaCliente.trim()
        ? clientes.filter(c =>
            c.nombre.toLowerCase().includes(busquedaCliente.toLowerCase()) ||
            (c.telefono ?? '').includes(busquedaCliente) ||
            (c.documento ?? '').includes(busquedaCliente))
        : clientes;

    const handleItemChange = (idx: number, f: keyof FormItem, v: string | number) => setItems(prev => { const u = [...prev]; (u[idx] as any)[f] = v; return u; });
    const handleAgregarItem = () => setItems(prev => [...prev, { productoId: '', cantidad: 1, cantidadStr: '1', precioUnitario: 0 }]);
    const handleRemoverItem = (idx: number) => setItems(prev => prev.filter((_, i) => i !== idx));
    const handleEditItemChange = (idx: number, f: keyof FormItem, v: string | number) => setEditItems(prev => { const u = [...prev]; (u[idx] as any)[f] = v; return u; });
    const handleEditAgregarItem = () => setEditItems(prev => [...prev, { productoId: '', cantidad: 1, cantidadStr: '1', precioUnitario: 0 }]);
    const handleEditRemoverItem = (idx: number) => setEditItems(prev => prev.filter((_, i) => i !== idx));

    const resetForm = () => {
        setClienteId(''); setEsClienteNuevo(false); setBusquedaCliente('');
        setNuevoNombre(''); setNuevoTelefono(''); setNuevoDocumento('');
        setNuevaDireccion(''); setNuevaCiudad('Cali');
        setItems([{ productoId: '', cantidad: 1, cantidadStr: '1', precioUnitario: 0 }]);
        setTipo('REPARACION'); setDescripcionProb(''); setManoObra('');
        setTecnicoId(''); setDireccion(''); setNotas(''); setErrorForm('');
    };

    const abrirEditar = (orden: Orden) => {
        setEditTipo(orden.tipo ?? 'REPARACION');
        setEditDescripcion(orden.descripcionProblema ?? '');
        setEditManoObra(orden.manoObra ? String(orden.manoObra) : '');
        setEditDireccion(orden.direccion);
        setEditClienteNombre(orden.clienteNombre);
        setEditClienteTelefono(orden.clienteTelefono ?? '');
        setEditTecnicoId(orden.tecnico?.id ?? '');
        if (orden.items && orden.items.length > 0) {
            setEditItems(orden.items.map(i => ({
                id: i.id,
                productoId: i.producto.id, cantidad: i.cantidad, cantidadStr: String(i.cantidad),
                precioUnitario: i.precioUnitario ?? productos.find(p => p.id === i.producto.id)?.precio ?? 0,
            })));
        } else if (orden.producto) {
            const p = productos.find(x => x.id === orden.producto?.id);
            setEditItems([{ productoId: orden.producto.id, cantidad: orden.cantidad ?? 1, cantidadStr: String(orden.cantidad ?? 1), precioUnitario: p?.precio ?? 0 }]);
        } else {
            setEditItems([{ productoId: '', cantidad: 1, cantidadStr: '1', precioUnitario: 0 }]);
        }
        setModalEditar(orden); setErrorForm('');
    };

    const abrirPagos = (orden: Orden) => {
        setPagoMonto(''); setPagoNotas(''); setErrorPago('');
        setPagoAnticipoPct(orden.anticipoPorcentaje ? String(orden.anticipoPorcentaje) : '');
        setModalPagos(orden);
    };

    const handleCrearOrden = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!nombreFinal.trim()) { setErrorForm('Selecciona o ingresa el nombre del cliente'); return; }
        if (!direccion.trim()) { setErrorForm('La dirección del servicio es obligatoria'); return; }

        const itemsConProducto = items.filter(i => i.productoId);
        if (items.length > 0 && items.some(i => !i.productoId) && itemsConProducto.length === 0) {
            setErrorForm('Si agregas repuestos, selecciona un producto en cada línea');
            return;
        }

        setLoadingForm(true); setErrorForm('');
        try {
            let clienteOrdenId = clienteSeleccionado?.id;
            if (esClienteNuevo && nuevoNombre.trim()) {
                try {
                    const creado = await clienteService.crearCliente({ nombre: nuevoNombre.trim(), telefono: nuevoTelefono || undefined, documento: nuevoDocumento || undefined, direccion: nuevaDireccion || undefined, ciudad: nuevaCiudad || 'Cali', activo: true } as any);
                    clienteOrdenId = creado.id;
                } catch { }
            }
            const body: any = {
                clienteNombre: nombreFinal, clienteTelefono: telefonoFinal || null,
                cliente: clienteOrdenId ? { id: clienteOrdenId } : null,
                direccion, tipo, descripcionProblema: descripcionProb || null,
                manoObra: manoObra ? parseFloat(manoObra) : 0, estado: 'PENDIENTE',
                items: itemsConProducto.map(i => ({ producto: { id: i.productoId }, cantidad: i.cantidad, precioUnitario: i.precioUnitario })),
            };
            if (tecnicoId) body.tecnico = { id: tecnicoId };
            if (notas) body.notasTecnico = notas;
            await api.post('/entregas', body);
            setModalNueva(false); resetForm(); cargarDatos();
        } catch (err: any) { setErrorForm(err.response?.data || 'Error al crear la orden'); }
        finally { setLoadingForm(false); }
    };

    const handleGuardarEdicion = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!modalEditar) return;
        if (!editClienteNombre.trim()) { setErrorForm('El nombre es obligatorio'); return; }
        if (!editDireccion.trim()) { setErrorForm('La dirección es obligatoria'); return; }

        const editItemsConProducto = editItems.filter(i => i.productoId);

        setLoadingForm(true); setErrorForm('');
        try {
            const body: any = {
                clienteNombre: editClienteNombre, clienteTelefono: editClienteTelefono || null,
                cliente: modalEditar.cliente?.id ? { id: modalEditar.cliente.id } : null,
                direccion: editDireccion, tipo: editTipo, descripcionProblema: editDescripcion || null,
                manoObra: editManoObra ? parseFloat(editManoObra) : 0, estado: modalEditar.estado,
                items: editItemsConProducto.map(i => ({
                    ...(i.id ? { id: i.id } : {}),
                    producto: { id: i.productoId }, cantidad: i.cantidad, precioUnitario: i.precioUnitario
                })),
            };
            if (editTecnicoId) body.tecnico = { id: editTecnicoId };
            await api.put(`/entregas/${modalEditar.id}`, body);
            setModalEditar(null); cargarDatos();
        } catch (err: any) {
            const msg = typeof err.response?.data === 'string'
                ? err.response.data
                : 'Error al guardar cambios';
            setErrorForm(msg);
        }
        finally { setLoadingForm(false); }
    };

    const handleCambiarEstado = async (id: string, estado: string, notas?: string) => {
        try {
            let url = `/entregas/${id}/estado?estado=${estado}`;
            if (notas) url += `&notas=${encodeURIComponent(notas)}`;
            await api.patch(url);
            cargarDatos(); setModalNotas(null); setNotasText('');
        } catch (err) { console.error(err); }
    };

    const handleConfirmarServicio = async (id: string) => {
        if (!window.confirm('¿Confirmar el servicio? Se descontará el stock y se registrará en kardex.')) return;
        try {
            let url = `/entregas/${id}/confirmar`;
            if (user?.id) url += `?adminId=${user.id}`;
            await api.post(url);
            cargarDatos();
        } catch (err: any) {
            alert(err.response?.data || 'Error al confirmar el servicio');
        }
    };

    const handleRegistrarPago = async () => {
        if (!modalPagos) return;
        const monto = parseFloat(pagoMonto);
        if (!monto || monto <= 0) { setErrorPago('Ingresa un monto válido'); return; }
        const total = modalPagos.totalOrden ?? 0;
        const pagado = modalPagos.anticipoRecibido ?? 0;
        if (monto > (total - pagado)) { setErrorPago(`El monto supera el saldo pendiente (${fmt(total - pagado)})`); return; }
        setLoadingPago(true); setErrorPago('');
        try {
            let url = `/entregas/${modalPagos.id}/pagos?monto=${monto}`;
            if (pagoNotas) url += `&notas=${encodeURIComponent(pagoNotas)}`;
            if (user?.id) url += `&usuarioId=${user.id}`;
            await api.post(url);
            const ordenActualizada = await api.get(`/entregas/${modalPagos.id}`);
            setModalPagos(ordenActualizada.data);
            setPagoMonto(''); setPagoNotas('');
            cargarDatos();
        } catch (err: any) { setErrorPago(err.response?.data || 'Error al registrar pago'); }
        finally { setLoadingPago(false); }
    };

    const handleGuardarAnticipo = async () => {
        if (!modalPagos) return;
        const pct = parseFloat(pagoAnticipoPct);
        if (isNaN(pct) || pct < 0 || pct > 100) { setErrorPago('Ingresa un porcentaje entre 0 y 100'); return; }
        try {
            await api.patch(`/entregas/${modalPagos.id}/anticipo?porcentaje=${pct}`);
            const ordenActualizada = await api.get(`/entregas/${modalPagos.id}`);
            setModalPagos(ordenActualizada.data);
            cargarDatos();
        } catch (_err: any) { setErrorPago('Error al guardar el anticipo'); }
    };

    const ordenesFiltradas = ordenes
        .filter(e => {
            const mE = filtroEstado === 'todos' || e.estado === filtroEstado;
            const mT = filtroTipo === 'todos' || e.tipo === filtroTipo;
            const mB = e.clienteNombre.toLowerCase().includes(busqueda.toLowerCase())
                || e.direccion.toLowerCase().includes(busqueda.toLowerCase())
                || resumenItems(e).toLowerCase().includes(busqueda.toLowerCase());
            return mE && mT && mB;
        })
        .sort((a, b) => new Date(b.fechaCreacion).getTime() - new Date(a.fechaCreacion).getTime());

    const counts = {
        PENDIENTE: ordenes.filter(e => e.estado === 'PENDIENTE').length,
        EN_PROCESO: ordenes.filter(e => e.estado === 'EN_PROCESO').length,
        COMPLETADO: ordenes.filter(e => e.estado === 'COMPLETADO').length,
        FINALIZADO: ordenes.filter(e => e.estado === 'FINALIZADO').length,
    };

    const pagoPendienteCount = ordenes.filter(e =>
        e.estadoPago && e.estadoPago !== 'COMPLETO' && e.estado === 'FINALIZADO'
    ).length;

    const SeccionClienteJSX = (
        <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '1rem', marginBottom: '1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                <label className="form-label" style={{ margin: 0 }}>👤 Cliente</label>
                <button type="button"
                    onClick={() => { setEsClienteNuevo(!esClienteNuevo); setClienteId(''); setDireccion(''); }}
                    style={{
                        fontSize: '0.75rem', padding: '0.25rem 0.7rem', border: '1px solid #cbd5e1',
                        borderRadius: '6px', background: esClienteNuevo ? '#eff6ff' : '#fff',
                        color: esClienteNuevo ? '#1d4ed8' : '#475569', cursor: 'pointer', fontWeight: 600
                    }}>
                    {esClienteNuevo ? '📋 Seleccionar existente' : '➕ Cliente nuevo'}
                </button>
            </div>
            {!esClienteNuevo ? (
                <div>
                    <input className="form-input" placeholder="🔍 Buscar por nombre, teléfono o documento..."
                        value={busquedaCliente}
                        onChange={e => { setBusquedaCliente(e.target.value); setClienteId(''); }}
                        style={{ marginBottom: '0.5rem' }} />
                    <select className="form-select" value={clienteId} onChange={e => handleSeleccionarCliente(e.target.value)}>
                        <option value="">-- Seleccionar cliente --</option>
                        {clientesFiltrados.map(c => (
                            <option key={c.id} value={c.id}>
                                {c.nombre}{c.telefono ? ` — ${c.telefono}` : ''}{c.documento ? ` — Doc: ${c.documento}` : ''}
                            </option>
                        ))}
                    </select>
                    {clienteSeleccionado && (
                        <div style={{ marginTop: '0.5rem', background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '8px', padding: '0.5rem 0.75rem', fontSize: '0.8rem', color: '#1d4ed8' }}>
                            ✅ <strong>{clienteSeleccionado.nombre}</strong>
                            {clienteSeleccionado.telefono && ` — ${clienteSeleccionado.telefono}`}
                            {clienteSeleccionado.direccion && (
                                <div style={{ color: '#3b82f6', marginTop: '0.2rem' }}>
                                    📍 {clienteSeleccionado.direccion}{clienteSeleccionado.ciudad && `, ${clienteSeleccionado.ciudad}`}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                    <div className="form-row">
                        <div className="form-group">
                            <label className="form-label">Nombre *</label>
                            <input className="form-input" value={nuevoNombre} onChange={e => setNuevoNombre(e.target.value)} placeholder="Nombre completo" />
                        </div>
                        <div className="form-group">
                            <label className="form-label">NIT / Cédula</label>
                            <input className="form-input" value={nuevoDocumento} onChange={e => setNuevoDocumento(e.target.value)} placeholder="Documento" />
                        </div>
                    </div>
                    <div className="form-row">
                        <div className="form-group">
                            <label className="form-label">Teléfono</label>
                            <input className="form-input" value={nuevoTelefono} onChange={e => setNuevoTelefono(e.target.value)} placeholder="300 000 0000" />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Ciudad</label>
                            <input className="form-input" value={nuevaCiudad} onChange={e => setNuevaCiudad(e.target.value)} placeholder="Cali" />
                        </div>
                    </div>
                    <div className="form-group">
                        <label className="form-label">Dirección del cliente</label>
                        <input className="form-input" value={nuevaDireccion} onChange={e => setNuevaDireccion(e.target.value)} placeholder="Dirección registrada" />
                    </div>
                    <div style={{ fontSize: '0.75rem', color: '#64748b', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '6px', padding: '0.4rem 0.6rem' }}>
                        ℹ️ El cliente se guardará automáticamente al crear la orden
                    </div>
                </div>
            )}
        </div>
    );

    return (
        <div className="page-container">
            <div className="page-header">
                <div className="page-header-left">
                    <h1 className="page-title">🔧 Órdenes de Servicio</h1>
                    <span className="page-subtitle">Gestión de reparaciones, entregas e instalaciones</span>
                </div>
                {esAdmin && (
                    <button className="action-btn action-btn-primary" onClick={() => { resetForm(); setModalNueva(true); }}>
                        + Nueva Orden
                    </button>
                )}
            </div>

            {pagoPendienteCount > 0 && esAdmin && (
                <div style={{ background: '#fef3c7', border: '1px solid #fde68a', borderRadius: '10px', padding: '0.75rem 1rem', display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
                    <span style={{ fontSize: '1.2rem' }}>💰</span>
                    <span style={{ fontSize: '0.88rem', color: '#92400e', fontWeight: 600 }}>
                        {pagoPendienteCount} orden{pagoPendienteCount > 1 ? 'es' : ''} finalizada{pagoPendienteCount > 1 ? 's' : ''} con pago pendiente
                    </span>
                    <button className="action-btn" style={{ marginLeft: 'auto', fontSize: '0.75rem', background: '#fbbf24', color: '#1a1a1a', border: 'none' }}
                        onClick={() => setFiltroEstado('FINALIZADO')}>
                        Ver órdenes →
                    </button>
                </div>
            )}

            <div className="stats-grid">
                <div className="stat-card"><span className="stat-card-label">⏳ Pendientes</span><span className="stat-card-value" style={{ color: '#f59e0b' }}>{counts.PENDIENTE}</span></div>
                <div className="stat-card"><span className="stat-card-label">🔧 En proceso</span><span className="stat-card-value" style={{ color: '#3b82f6' }}>{counts.EN_PROCESO}</span></div>
                <div className="stat-card"><span className="stat-card-label">✔️ Por confirmar</span><span className="stat-card-value" style={{ color: '#7c3aed' }}>{counts.COMPLETADO}</span></div>
                <div className="stat-card"><span className="stat-card-label">✅ Finalizadas</span><span className="stat-card-value" style={{ color: '#22c55e' }}>{counts.FINALIZADO}</span></div>
            </div>

            <div className="toolbar">
                <div className="toolbar-left">
                    <div className="search-bar">
                        <span>🔍</span>
                        <input type="text" placeholder="Buscar por cliente, dirección o producto..."
                            value={busqueda} onChange={e => setBusqueda(e.target.value)} />
                    </div>
                </div>
                <div className="toolbar-right">
                    {(['todos', 'REPARACION', 'ENTREGA', 'INSTALACION'] as const).map(f => (
                        <button key={f} className="action-btn" onClick={() => setFiltroTipo(f)}
                            style={{ background: filtroTipo === f ? '#1F3864' : '#f1f5f9', color: filtroTipo === f ? 'white' : '#475569', border: filtroTipo === f ? 'none' : '1px solid #e2e8f0' }}>
                            {f === 'todos' ? 'Todos los tipos' : TIPO_CONFIG[f as keyof typeof TIPO_CONFIG]?.icono + ' ' + TIPO_CONFIG[f as keyof typeof TIPO_CONFIG]?.label}
                        </button>
                    ))}
                    <div style={{ width: '1px', background: '#e2e8f0', margin: '0 0.25rem' }} />
                    {(['todos', 'PENDIENTE', 'EN_PROCESO', 'COMPLETADO', 'FINALIZADO', 'CANCELADO'] as const).map(f => (
                        <button key={f} className="action-btn" onClick={() => setFiltroEstado(f)}
                            style={{ background: filtroEstado === f ? '#3b82f6' : '#f1f5f9', color: filtroEstado === f ? 'white' : '#475569', border: filtroEstado === f ? 'none' : '1px solid #e2e8f0' }}>
                            {f === 'todos' ? 'Todos los estados' : ESTADO_CONFIG[f as keyof typeof ESTADO_CONFIG]?.label}
                        </button>
                    ))}
                </div>
            </div>

            <div className="table-wrapper">
                {loading ? <div className="loading-state">⏳ Cargando órdenes...</div>
                    : ordenesFiltradas.length === 0 ? (
                        <div className="empty-state">
                            <span className="empty-state-icon">🔧</span>
                            <h3>Sin órdenes</h3><p>No hay órdenes con este filtro</p>
                        </div>
                    ) : (
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th>Cliente</th><th>Tipo</th><th>Dirección</th><th>Estado</th><th>Acciones</th>
                                </tr>
                            </thead>
                            <tbody>
                                {ordenesFiltradas.map(e => {
                                    const cfg = ESTADO_CONFIG[e.estado];
                                    const tc = TIPO_CONFIG[e.tipo] ?? TIPO_CONFIG.REPARACION;
                                    const total = e.totalOrden ?? 0;
                                    const pagado = e.anticipoRecibido ?? 0;
                                    const saldo = total - pagado;
                                    return (
                                        <tr key={e.id} onClick={() => setModalDetalles(e)} style={{ cursor: 'pointer' }} title="Clic para ver detalles">
                                            <td>
                                                <div style={{ fontWeight: '600', color: '#0f172a' }}>{e.clienteNombre}</div>
                                                {e.clienteTelefono && <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>{e.clienteTelefono}</div>}
                                            </td>
                                            <td>
                                                <span style={{ background: tc.bg, color: tc.color, padding: '0.2rem 0.5rem', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 700 }}>
                                                    {tc.icono} {tc.label}
                                                </span>
                                            </td>
                                            <td style={{ color: '#64748b', fontSize: '0.84rem', maxWidth: '320px' }}>
                                                <div style={{ color: '#475569', fontWeight: 500 }}>{e.direccion}</div>
                                                <div style={{ color: '#94a3b8', fontSize: '0.72rem', marginTop: '0.15rem' }}>
                                                    {resumenItems(e)}
                                                </div>
                                            </td>
                                            <td>
                                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '0.25rem' }}>
                                                    <span className={`badge ${cfg.clase}`}>{cfg.icono} {cfg.label}</span>
                                                    {saldo > 0 && e.estado !== 'CANCELADO' && e.estadoPago !== 'COMPLETO' && (
                                                        <span style={{
                                                            fontSize: '0.72rem',
                                                            color: e.estado === 'FINALIZADO' ? '#ef4444' : '#f59e0b',
                                                            fontWeight: 700,
                                                            background: e.estado === 'FINALIZADO' ? '#fee2e2' : '#fef3c7',
                                                            borderRadius: '999px',
                                                            padding: '0.12rem 0.45rem',
                                                        }}>
                                                            {e.estado === 'FINALIZADO' ? 'Debe: ' : 'Saldo: '}{fmt(saldo)}
                                                        </span>
                                                    )}
                                                    {e.tecnico && (
                                                        <span style={{ color: '#94a3b8', fontSize: '0.72rem' }}>{e.tecnico.nombre}</span>
                                                    )}
                                                </div>
                                            </td>
                                            <td onClick={ev => ev.stopPropagation()}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                                    <button
                                                        className="action-btn action-btn-ghost"
                                                        onClick={() => setModalDetalles(e)}
                                                        style={{ padding: '0.35rem 0.6rem', fontSize: '0.76rem' }}
                                                    >
                                                        Ver detalle
                                                    </button>
                                                    {e.notasTecnico && (
                                                        <span title={e.notasTecnico} style={{ cursor: 'help', fontSize: '0.9rem' }}>📝</span>
                                                    )}
                                                    {e.estado === 'CANCELADO' ? (
                                                        <ActionMenu items={[
                                                            {
                                                                label: 'Ver detalles',
                                                                icon: '📋',
                                                                variant: 'default',
                                                                onClick: () => setModalDetalles(e),
                                                            },
                                                        ]} />
                                                    ) : (
                                                        <ActionMenu items={[
                                                            {
                                                                label: 'Editar orden',
                                                                icon: '✏️',
                                                                onClick: () => abrirEditar(e),
                                                                hidden: e.estado === 'FINALIZADO' || !esAdmin,
                                                            },
                                                            {
                                                                label: 'Ver factura',
                                                                icon: '🧾',
                                                                variant: 'info',
                                                                onClick: () => setModalFactura(e),
                                                                hidden: !(e.estado === 'COMPLETADO' || e.estado === 'FINALIZADO') || total <= 0,
                                                            },
                                                            {
                                                                label: 'Registrar pago',
                                                                icon: '💰',
                                                                variant: 'warning',
                                                                onClick: () => abrirPagos(e),
                                                                hidden: !(total > 0 && e.estadoPago !== 'COMPLETO' && esAdmin),
                                                            },
                                                            {
                                                                label: 'Iniciar servicio',
                                                                icon: '🔧',
                                                                variant: 'info',
                                                                onClick: () => handleCambiarEstado(e.id, 'EN_PROCESO'),
                                                                hidden: e.estado !== 'PENDIENTE' || !(esAdmin || esTecnico),
                                                            },
                                                            {
                                                                label: 'Marcar completado',
                                                                icon: '✔️',
                                                                variant: 'success',
                                                                onClick: () => setModalNotas(e),
                                                                hidden: e.estado !== 'EN_PROCESO' || !(esAdmin || esTecnico),
                                                            },
                                                            {
                                                                label: 'Finalizar orden',
                                                                icon: '✅',
                                                                variant: 'success',
                                                                onClick: () => handleConfirmarServicio(e.id),
                                                                hidden: e.estado !== 'COMPLETADO' || !esAdmin,
                                                            },
                                                            {
                                                                label: 'Cancelar orden',
                                                                icon: '❌',
                                                                variant: 'danger',
                                                                onClick: () => handleCambiarEstado(e.id, 'CANCELADO', 'Cancelado por administrador'),
                                                                hidden: !esAdmin,
                                                            },
                                                        ]} />
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    )}
            </div>

            {modalFactura && <FacturaOrdenModal orden={modalFactura} onClose={() => setModalFactura(null)} />}

            {modalDetalles && (
                <OrdenDetalleModal orden={modalDetalles} onClose={() => setModalDetalles(null)} />
            )}

            {modalNotas && (
                <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setModalNotas(null)}>
                    <div className="modal-box" style={{ maxWidth: '440px' }}>
                        <div className="modal-header">
                            <div className="modal-title">
                                <div className="modal-title-icon" style={{ background: '#ede9fe' }}>✔️</div>
                                <div><h2>Marcar como completado</h2><p>{modalNotas.clienteNombre}</p></div>
                            </div>
                            <button className="modal-close" onClick={() => setModalNotas(null)}>✕</button>
                        </div>
                        <div className="modal-body">
                            <div style={{ background: '#fef9c3', border: '1px solid #fde68a', borderRadius: '8px', padding: '0.6rem 0.85rem', fontSize: '0.82rem', color: '#92400e', marginBottom: '0.75rem' }}>
                                ⚠️ El admin revisará el trabajo antes de <strong>Confirmar</strong> el servicio.
                            </div>
                            <div className="form-group">
                                <label className="form-label">Notas del técnico (opcional)</label>
                                <textarea className="form-textarea" rows={3} value={notasText}
                                    onChange={e => setNotasText(e.target.value)}
                                    placeholder="Ej: Se reemplazaron 2 rodachines, cliente satisfecho..." />
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button className="btn btn-secondary" onClick={() => setModalNotas(null)}>Cancelar</button>
                            <button className="btn btn-primary" onClick={() => handleCambiarEstado(modalNotas.id, 'COMPLETADO', notasText)}>
                                ✔️ Marcar completado
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {modalPagos && (
                <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setModalPagos(null)}>
                    <div className="modal-box" style={{ maxWidth: '520px' }}>
                        <div className="modal-header">
                            <div className="modal-title">
                                <div className="modal-title-icon" style={{ background: '#fef3c7' }}>💰</div>
                                <div><h2>Gestión de Pagos</h2><p>{modalPagos.clienteNombre}</p></div>
                            </div>
                            <button className="modal-close" onClick={() => setModalPagos(null)}>✕</button>
                        </div>
                        <div className="modal-body">
                            {errorPago && <div className="modal-error"><span>⚠️</span><span>{errorPago}</span></div>}
                            <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '1rem', marginBottom: '1rem' }}>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.75rem', textAlign: 'center' }}>
                                    <div>
                                        <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 600 }}>TOTAL ORDEN</div>
                                        <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#0f172a' }}>{fmt(modalPagos.totalOrden ?? 0)}</div>
                                    </div>
                                    <div>
                                        <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 600 }}>PAGADO</div>
                                        <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#22c55e' }}>{fmt(modalPagos.anticipoRecibido ?? 0)}</div>
                                    </div>
                                    <div>
                                        <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 600 }}>SALDO</div>
                                        <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#ef4444' }}>
                                            {fmt((modalPagos.totalOrden ?? 0) - (modalPagos.anticipoRecibido ?? 0))}
                                        </div>
                                    </div>
                                </div>
                            </div>
                            {/* Alerta si la orden ya está FINALIZADA y aún tiene saldo */}
                            {modalPagos.estado === 'FINALIZADO' &&
                             (modalPagos.totalOrden ?? 0) - (modalPagos.anticipoRecibido ?? 0) > 0 && (
                                <div style={{
                                    background: '#fef2f2', border: '2px solid #fecaca',
                                    borderRadius: '10px', padding: '0.75rem 1rem',
                                    marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.6rem'
                                }}>
                                    <span style={{ fontSize: '1.3rem' }}>🔴</span>
                                    <div>
                                        <div style={{ fontWeight: 700, fontSize: '0.9rem', color: '#991b1b' }}>
                                            Servicio FINALIZADO — cobro pendiente
                                        </div>
                                        <div style={{ fontSize: '0.82rem', color: '#dc2626', marginTop: '0.15rem' }}>
                                            Inventario ya descontado. El cliente debe <strong>{fmt((modalPagos.totalOrden ?? 0) - (modalPagos.anticipoRecibido ?? 0))}</strong> por esta orden.
                                        </div>
                                    </div>
                                </div>
                            )}
                            <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: '8px', padding: '0.75rem', marginBottom: '1rem' }}>
                                <label className="form-label" style={{ marginBottom: '0.4rem' }}>
                                    📊 Anticipo acordado (%)
                                    {modalPagos.anticipoPorcentaje ? (
                                        <span style={{ marginLeft: '0.5rem', fontSize: '0.75rem', color: '#92400e' }}>
                                            = {fmt((modalPagos.totalOrden ?? 0) * (modalPagos.anticipoPorcentaje / 100))}
                                        </span>
                                    ) : null}
                                </label>
                                <div style={{ display: 'flex', gap: '0.5rem' }}>
                                    <input className="form-input" type="number" min="0" max="100"
                                        value={pagoAnticipoPct} onChange={e => setPagoAnticipoPct(e.target.value)}
                                        placeholder="Ej: 50" style={{ maxWidth: '100px' }} />
                                    <button className="action-btn action-btn-primary" style={{ fontSize: '0.8rem' }}
                                        onClick={handleGuardarAnticipo}>Guardar %</button>
                                    {[25, 30, 40, 50].map(p => (
                                        <button key={p} type="button" className="action-btn"
                                            style={{ fontSize: '0.75rem', padding: '0.3rem 0.5rem', background: '#fff', border: '1px solid #e2e8f0' }}
                                            onClick={() => setPagoAnticipoPct(String(p))}>
                                            {p}%
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <div style={{ marginBottom: '1rem' }}>
                                <label className="form-label">💵 Registrar pago</label>
                                <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
                                    <input className="form-input" type="number" min="0"
                                        max={(modalPagos.totalOrden ?? 0) - (modalPagos.anticipoRecibido ?? 0)}
                                        value={pagoMonto} onChange={e => setPagoMonto(e.target.value)}
                                        placeholder="Monto recibido" />
                                    {modalPagos.anticipoPorcentaje && modalPagos.anticipoPorcentaje > 0
                                        && (modalPagos.anticipoRecibido ?? 0) === 0 && (
                                            <button type="button" className="action-btn"
                                                style={{ fontSize: '0.75rem', whiteSpace: 'nowrap', background: '#fef3c7', border: '1px solid #fde68a', color: '#92400e' }}
                                                onClick={() => setPagoMonto(String(Math.round((modalPagos.totalOrden ?? 0) * (modalPagos.anticipoPorcentaje ?? 0) / 100)))}>
                                                Anticipo {modalPagos.anticipoPorcentaje}%
                                            </button>
                                        )}
                                    <button type="button" className="action-btn"
                                        style={{ fontSize: '0.75rem', whiteSpace: 'nowrap', background: '#dcfce7', border: '1px solid #bbf7d0', color: '#166534' }}
                                        onClick={() => setPagoMonto(String(Math.round((modalPagos.totalOrden ?? 0) - (modalPagos.anticipoRecibido ?? 0))))}>
                                        {(modalPagos.anticipoRecibido ?? 0) > 0 ? 'Pagar saldo' : 'Pago total'}
                                    </button>
                                </div>
                                <input className="form-input" value={pagoNotas}
                                    onChange={e => setPagoNotas(e.target.value)}
                                    placeholder="Notas del pago (opcional)" style={{ marginBottom: '0.5rem' }} />
                                <button className="btn btn-primary" style={{ width: '100%' }}
                                    onClick={handleRegistrarPago} disabled={loadingPago}>
                                    {loadingPago ? '⏳ Registrando...' : '💰 Registrar pago'}
                                </button>
                            </div>
                            {modalPagos.pagos && modalPagos.pagos.length > 0 && (
                                <div>
                                    <label className="form-label">📋 Historial de pagos</label>
                                    <div style={{ maxHeight: '180px', overflowY: 'auto' }}>
                                        {modalPagos.pagos.map((p, i) => (
                                            <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem 0.75rem', background: i % 2 === 0 ? '#f8fafc' : '#fff', borderRadius: '6px', marginBottom: '0.25rem', fontSize: '0.82rem' }}>
                                                <div>
                                                    <div style={{ fontWeight: 600, color: '#22c55e' }}>{fmt(p.monto)}</div>
                                                    {p.notas && <div style={{ fontSize: '0.72rem', color: '#94a3b8' }}>{p.notas}</div>}
                                                </div>
                                                <div style={{ textAlign: 'right', color: '#64748b', fontSize: '0.75rem' }}>
                                                    <div>{new Date(p.fecha).toLocaleDateString('es-CO')}</div>
                                                    {p.usuario && <div>{p.usuario.nombre}</div>}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                        <div className="modal-footer">
                            <button className="btn btn-secondary" onClick={() => setModalPagos(null)}>Cerrar</button>
                        </div>
                    </div>
                </div>
            )}

            {modalEditar && (
                <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setModalEditar(null)}>
                    <div className="modal-box" style={{ maxWidth: '700px' }}>
                        <div className="modal-header">
                            <div className="modal-title">
                                <div className="modal-title-icon" style={{ background: '#fef3c7' }}>✏️</div>
                                <div><h2>Editar Orden de Servicio</h2><p>{modalEditar.clienteNombre}</p></div>
                            </div>
                            <button className="modal-close" onClick={() => setModalEditar(null)}>✕</button>
                        </div>
                        <div className="modal-body">
                            {errorForm && <div className="modal-error"><span>⚠️</span><span>{errorForm}</span></div>}
                            <form onSubmit={handleGuardarEdicion} id="form-editar-orden">
                                <div className="form-group">
                                    <label className="form-label">Tipo de orden</label>
                                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                                        {(['REPARACION', 'ENTREGA', 'INSTALACION'] as const).map(t => (
                                            <button key={t} type="button" onClick={() => setEditTipo(t)}
                                                style={{
                                                    flex: 1, padding: '0.5rem', borderRadius: '8px', cursor: 'pointer',
                                                    border: editTipo === t ? `2px solid ${TIPO_CONFIG[t].color}` : '1px solid #e2e8f0',
                                                    background: editTipo === t ? TIPO_CONFIG[t].bg : '#f8fafc',
                                                    color: editTipo === t ? TIPO_CONFIG[t].color : '#64748b',
                                                    fontWeight: editTipo === t ? 700 : 500, fontSize: '0.82rem'
                                                }}>
                                                {TIPO_CONFIG[t].icono} {TIPO_CONFIG[t].label}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                                <div className="form-row">
                                    <div className="form-group">
                                        <label className="form-label">Nombre del cliente *</label>
                                        <input className="form-input" value={editClienteNombre} onChange={e => setEditClienteNombre(e.target.value)} />
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">Teléfono</label>
                                        <input className="form-input" value={editClienteTelefono} onChange={e => setEditClienteTelefono(e.target.value)} />
                                    </div>
                                </div>
                                <div className="form-group">
                                    <label className="form-label">📍 Dirección *</label>
                                    <input className="form-input" value={editDireccion} onChange={e => setEditDireccion(e.target.value)} />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">📋 Descripción del problema</label>
                                    <textarea className="form-textarea" rows={2} value={editDescripcion} onChange={e => setEditDescripcion(e.target.value)} />
                                </div>
                                <ItemsTable items={editItems} productos={productos}
                                    onChange={handleEditItemChange} onAgregar={handleEditAgregarItem} onRemover={handleEditRemoverItem} />
                                <div className="form-row" style={{ marginTop: '0.75rem' }}>
                                    <div className="form-group">
                                        <label className="form-label">💵 Mano de obra (opcional)</label>
                                        <input className="form-input" type="number" min="0" value={editManoObra} onChange={e => setEditManoObra(e.target.value)} placeholder="0" />
                                    </div>
                                    {esAdmin && tecnicos.length > 0 && (
                                        <div className="form-group">
                                            <label className="form-label">👷 Técnico asignado</label>
                                            <select className="form-select" value={editTecnicoId} onChange={e => setEditTecnicoId(e.target.value)}>
                                                <option value="">Sin asignar</option>
                                                {tecnicos.map(t => <option key={t.id} value={t.id}>{t.nombre}</option>)}
                                            </select>
                                        </div>
                                    )}
                                </div>
                                <ResumenTotal items={editItems} manoObra={editManoObra} />
                            </form>
                        </div>
                        <div className="modal-footer">
                            <button className="btn btn-secondary" onClick={() => setModalEditar(null)}>Cancelar</button>
                            <button className="btn btn-primary" type="submit" form="form-editar-orden" disabled={loadingForm}>
                                {loadingForm ? '⏳ Guardando...' : '💾 Guardar cambios'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {modalNueva && (
                <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setModalNueva(false)}>
                    <div className="modal-box" style={{ maxWidth: '700px' }}>
                        <div className="modal-header">
                            <div className="modal-title">
                                <div className="modal-title-icon" style={{ background: '#ede9fe' }}>🔧</div>
                                <div><h2>Nueva Orden de Servicio</h2><p>Reparación, entrega o instalación</p></div>
                            </div>
                            <button className="modal-close" onClick={() => setModalNueva(false)}>✕</button>
                        </div>
                        <div className="modal-body">
                            {errorForm && <div className="modal-error"><span>⚠️</span><span>{errorForm}</span></div>}
                            <form onSubmit={handleCrearOrden} id="form-orden">
                                <div className="form-group">
                                    <label className="form-label">Tipo de orden</label>
                                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                                        {(['REPARACION', 'ENTREGA', 'INSTALACION'] as const).map(t => (
                                            <button key={t} type="button" onClick={() => setTipo(t)}
                                                style={{
                                                    flex: 1, padding: '0.5rem', borderRadius: '8px', cursor: 'pointer',
                                                    border: tipo === t ? `2px solid ${TIPO_CONFIG[t].color}` : '1px solid #e2e8f0',
                                                    background: tipo === t ? TIPO_CONFIG[t].bg : '#f8fafc',
                                                    color: tipo === t ? TIPO_CONFIG[t].color : '#64748b',
                                                    fontWeight: tipo === t ? 700 : 500, fontSize: '0.82rem'
                                                }}>
                                                {TIPO_CONFIG[t].icono} {TIPO_CONFIG[t].label}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                                {SeccionClienteJSX}
                                <div className="form-group">
                                    <label className="form-label">
                                        📍 Dirección del servicio <span className="required">*</span>
                                        {clienteSeleccionado?.direccion && <span style={{ fontSize: '0.72rem', color: '#3b82f6', marginLeft: '0.5rem', fontWeight: 'normal' }}>(autocompletada)</span>}
                                    </label>
                                    <input className="form-input" type="text" required value={direccion}
                                        onChange={e => setDireccion(e.target.value)} placeholder="Dirección exacta del servicio" />
                                    {clienteSeleccionado?.direccion && direccion !== clienteSeleccionado.direccion && (
                                        <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '0.2rem' }}>
                                            Dirección del cliente: {clienteSeleccionado.direccion}
                                            <button type="button" onClick={() => setDireccion(clienteSeleccionado.direccion ?? '')}
                                                style={{ marginLeft: '0.5rem', fontSize: '0.7rem', color: '#3b82f6', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
                                                Usar esta
                                            </button>
                                        </div>
                                    )}
                                </div>
                                <div className="form-group">
                                    <label className="form-label">📋 Descripción del problema / servicio</label>
                                    <textarea className="form-textarea" rows={2} value={descripcionProb}
                                        onChange={e => setDescripcionProb(e.target.value)} placeholder="Ej: Silla no sube, cilindro dañado..." />
                                </div>
                                <ItemsTable items={items} productos={productos}
                                    onChange={handleItemChange} onAgregar={handleAgregarItem} onRemover={handleRemoverItem} />
                                <div className="form-row" style={{ marginTop: '0.75rem' }}>
                                    <div className="form-group">
                                        <label className="form-label">💵 Mano de obra (opcional)</label>
                                        <input className="form-input" type="number" min="0" value={manoObra}
                                            onChange={e => setManoObra(e.target.value)} placeholder="0" />
                                        <span className="form-hint">Costo adicional por el servicio técnico</span>
                                    </div>
                                    {esAdmin && tecnicos.length > 0 && (
                                        <div className="form-group">
                                            <label className="form-label">👷 Técnico asignado</label>
                                            <select className="form-select" value={tecnicoId} onChange={e => setTecnicoId(e.target.value)}>
                                                <option value="">Sin asignar</option>
                                                {tecnicos.map(t => <option key={t.id} value={t.id}>{t.nombre}</option>)}
                                            </select>
                                        </div>
                                    )}
                                </div>
                                <ResumenTotal items={items} manoObra={manoObra} />
                                <div className="form-group" style={{ marginTop: '0.75rem' }}>
                                    <label className="form-label">📝 Instrucciones especiales</label>
                                    <textarea className="form-textarea" rows={2} value={notas}
                                        onChange={e => setNotas(e.target.value)} placeholder="Notas adicionales para el técnico..." />
                                </div>
                            </form>
                        </div>
                        <div className="modal-footer">
                            <button className="btn btn-secondary" onClick={() => setModalNueva(false)}>Cancelar</button>
                            <button className="btn btn-primary" type="submit" form="form-orden" disabled={loadingForm}>
                                {loadingForm ? '⏳ Creando...' : '🔧 Crear Orden'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Entregas;
