import React, { useEffect, useMemo, useState } from 'react';
import { getFlujoCaja, type FlujoCajaResponse } from '../services/analiticaService';

const money = (n: unknown) => Number(n || 0).toLocaleString('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 });
const pct = (value: number, total: number) => total > 0 ? Math.round((value / total) * 100) : 0;
const bar = (value: number, color: string) => <div style={{ width: '100%', height: 8, background: '#e2e8f0', borderRadius: 999, overflow: 'hidden' }}><div style={{ width: `${Math.min(100, Math.max(0, value))}%`, height: '100%', background: color }} /></div>;

const FlujoCaja: React.FC = () => {
  const [data, setData] = useState<FlujoCajaResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const cargar = async () => { setLoading(true); try { setData(await getFlujoCaja()); } finally { setLoading(false); } };
  useEffect(() => { cargar(); }, []);
  const metricas = useMemo(() => data ? { margen: pct(Number(data.netoTotal || 0), Number(data.totalIngresos || 0)), egresos: pct(Number(data.totalEgresos || 0), Number(data.totalIngresos || 0)) } : { margen: 0, egresos: 0 }, [data]);

  if (loading) return <div className="page-container"><div className="loading-state">Cargando...</div></div>;
  if (!data) return null;

  return <div className="page-container">
    <div className="page-header"><div><h1 className="page-title">Flujo de caja</h1><span className="page-subtitle">{data.periodo}</span></div><button className="action-btn action-btn-ghost" onClick={cargar}>Actualizar</button></div>
    <div className="stats-grid">
      <div className="stat-card"><span className="stat-card-label">Ingresos</span><span className="stat-card-value">{money(data.totalIngresos)}</span></div>
      <div className="stat-card"><span className="stat-card-label">Egresos / ingresos</span><span className="stat-card-value" style={{ color: '#dc2626' }}>{metricas.egresos}%</span><span style={{ fontSize: '0.78rem', color: '#64748b' }}>{money(data.totalEgresos)}</span></div>
      <div className="stat-card"><span className="stat-card-label">Margen neto</span><span className="stat-card-value" style={{ color: metricas.margen >= 0 ? '#16a34a' : '#dc2626' }}>{metricas.margen}%</span><span style={{ fontSize: '0.78rem', color: '#64748b' }}>{money(data.netoTotal)}</span></div>
    </div>
    <div className="table-wrapper"><table className="data-table"><thead><tr><th>Fecha</th><th>Ingresos</th><th>Egresos</th><th>Neto</th><th>Neto %</th><th>Acumulado</th></tr></thead><tbody>{data.flujoDiario.map(d => { const netoPct = pct(Number(d.neto || 0), Number(d.ingresos || 0)); return <tr key={d.fecha}><td>{d.fecha}</td><td>{money(d.ingresos)}</td><td>{money(d.egresos)}</td><td>{money(d.neto)}</td><td>{netoPct}% {bar(Math.abs(netoPct), netoPct >= 0 ? '#16a34a' : '#dc2626')}</td><td>{money(d.saldoAcumulado)}</td></tr>; })}</tbody></table></div>
  </div>;
};

export default FlujoCaja;
