import React, { useEffect, useMemo, useState } from 'react';
import { getRendimientoTecnicos, type RendimientoTecnico } from '../services/analiticaService';

const money = (n: unknown) => Number(n || 0).toLocaleString('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 });
const pct = (value: number, total: number) => total > 0 ? Math.round((value / total) * 100) : 0;
const num = (value: unknown) => Number(value || 0);
const bar = (value: number, color: string) => <div style={{ width: '100%', height: 8, background: '#e2e8f0', borderRadius: 999, overflow: 'hidden' }}><div style={{ width: `${Math.min(100, Math.max(0, value))}%`, height: '100%', background: color }} /></div>;

const AnaliticaTecnicos: React.FC = () => {
  const [data, setData] = useState<RendimientoTecnico[]>([]);
  const [loading, setLoading] = useState(true);
  const cargar = async () => { setLoading(true); try { setData(await getRendimientoTecnicos()); } finally { setLoading(false); } };
  useEffect(() => { cargar(); }, []);

  const metricas = useMemo(() => {
    const completadas = data.reduce((a, t) => a + num(t.ordenesCompletadas), 0);
    const activas = data.reduce((a, t) => a + num(t.ordenesActivas), 0);
    const eficiencia = pct(completadas, completadas + activas);
    return { completadas, activas, eficiencia };
  }, [data]);

  if (loading) return <div className="page-container"><div className="loading-state">Cargando...</div></div>;

  return <div className="page-container">
    <div className="page-header"><div><h1 className="page-title">Analitica tecnicos</h1><span className="page-subtitle">Participacion y eficiencia por tecnico</span></div><button className="action-btn action-btn-ghost" onClick={cargar}>Actualizar</button></div>
    <div className="stats-grid">
      <div className="stat-card"><span className="stat-card-label">Eficiencia global</span><span className="stat-card-value" style={{ color: '#16a34a' }}>{metricas.eficiencia}%</span><span style={{ fontSize: '0.78rem', color: '#64748b' }}>{metricas.completadas} completadas / {metricas.completadas + metricas.activas} ordenes</span></div>
      <div className="stat-card"><span className="stat-card-label">Completadas</span><span className="stat-card-value">{metricas.completadas}</span></div>
      <div className="stat-card"><span className="stat-card-label">Activas</span><span className="stat-card-value">{metricas.activas}</span></div>
    </div>
    <div className="table-wrapper"><table className="data-table"><thead><tr><th>Tecnico</th><th>Email</th><th>Completadas</th><th>Activas</th><th>Participacion</th><th>Eficiencia</th><th>Mano de obra</th><th>Horas promedio</th></tr></thead><tbody>{data.map(t => { const completadas = num(t.ordenesCompletadas); const activas = num(t.ordenesActivas); const participacion = pct(completadas, metricas.completadas); const eficiencia = pct(completadas, completadas + activas); return <tr key={t.id}><td>{t.nombre}</td><td>{t.email}</td><td>{t.ordenesCompletadas}</td><td>{t.ordenesActivas}</td><td>{participacion}% {bar(participacion, '#3b82f6')}</td><td>{eficiencia}% {bar(eficiencia, '#16a34a')}</td><td>{money(t.ingresosManoObra)}</td><td>{t.tiempoResolucionHoras}</td></tr>; })}</tbody></table></div>
  </div>;
};

export default AnaliticaTecnicos;
