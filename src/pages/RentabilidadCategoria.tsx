import React, { useEffect, useMemo, useState } from 'react';
import { getRentabilidadCategoria, type RentabilidadCategoria } from '../services/analiticaService';

const money = (n: unknown) => Number(n || 0).toLocaleString('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 });
const pct = (value: number, total: number) => total > 0 ? Math.round((value / total) * 100) : 0;
const bar = (value: number, color: string) => <div style={{ width: '100%', height: 8, background: '#e2e8f0', borderRadius: 999, overflow: 'hidden' }}><div style={{ width: `${Math.min(100, Math.max(0, value))}%`, height: '100%', background: color }} /></div>;

const RentabilidadCategoriaPage: React.FC = () => {
  const [data, setData] = useState<RentabilidadCategoria[]>([]);
  useEffect(() => { getRentabilidadCategoria().then(setData); }, []);
  const totalIngreso = useMemo(() => data.reduce((a, c) => a + Number(c.ingresoTotal || 0), 0), [data]);
  const margenPromedio = useMemo(() => data.length ? Math.round(data.reduce((a, c) => a + Number(c.margenPorcentaje || 0), 0) / data.length) : 0, [data]);

  return <div className="page-container">
    <div className="page-header"><div><h1 className="page-title">Rentabilidad por categoria</h1><span className="page-subtitle">Margen y participacion de cada categoria</span></div></div>
    <div className="stats-grid"><div className="stat-card"><span className="stat-card-label">Ingreso total</span><span className="stat-card-value">{money(totalIngreso)}</span></div><div className="stat-card"><span className="stat-card-label">Margen promedio</span><span className="stat-card-value" style={{ color: '#16a34a' }}>{margenPromedio}%</span></div></div>
    <div className="table-wrapper"><table className="data-table"><thead><tr><th>Categoria</th><th>Productos</th><th>Items</th><th>Cantidad</th><th>Ingreso</th><th>Participacion</th><th>Ganancia</th><th>Margen</th></tr></thead><tbody>{data.map(c => { const participacion = pct(Number(c.ingresoTotal || 0), totalIngreso); const margen = Number(c.margenPorcentaje || 0); return <tr key={c.categoriaId}><td>{c.categoria}</td><td>{c.productosActivos}</td><td>{c.itemsVendidos}</td><td>{c.cantidadTotal}</td><td>{money(c.ingresoTotal)}</td><td>{participacion}% {bar(participacion, '#3b82f6')}</td><td>{money(c.gananciaEstimada)}</td><td>{margen}% {bar(margen, margen >= 30 ? '#16a34a' : '#f97316')}</td></tr>; })}</tbody></table></div>
  </div>;
};

export default RentabilidadCategoriaPage;
