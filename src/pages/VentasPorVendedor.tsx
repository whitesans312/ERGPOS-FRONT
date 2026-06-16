import React, { useEffect, useMemo, useState } from 'react';
import { getVentasPorVendedor, type VentasPorVendedor } from '../services/analiticaService';

const money = (n: unknown) => Number(n || 0).toLocaleString('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 });
const pct = (value: number, total: number) => total > 0 ? Math.round((value / total) * 100) : 0;
const bar = (value: number, color: string) => <div style={{ width: '100%', height: 8, background: '#e2e8f0', borderRadius: 999, overflow: 'hidden' }}><div style={{ width: `${Math.min(100, Math.max(0, value))}%`, height: '100%', background: color }} /></div>;

const VentasPorVendedorPage: React.FC = () => {
  const [data, setData] = useState<VentasPorVendedor[]>([]);
  useEffect(() => { getVentasPorVendedor().then(setData); }, []);
  const totalIngreso = useMemo(() => data.reduce((a, v) => a + Number(v.ingresoTotal || 0), 0), [data]);
  const totalVentas = useMemo(() => data.reduce((a, v) => a + Number(v.totalVentas || 0), 0), [data]);

  return <div className="page-container">
    <div className="page-header"><div><h1 className="page-title">Ventas por vendedor</h1><span className="page-subtitle">Participacion de ingresos y tasa de conversion</span></div></div>
    <div className="stats-grid"><div className="stat-card"><span className="stat-card-label">Ingreso total</span><span className="stat-card-value">{money(totalIngreso)}</span></div><div className="stat-card"><span className="stat-card-label">Ventas</span><span className="stat-card-value">{totalVentas}</span></div></div>
    <div className="table-wrapper"><table className="data-table"><thead><tr><th>Vendedor</th><th>Email</th><th>Ventas</th><th>Completadas</th><th>Ingreso</th><th>Participacion</th><th>Conversion</th></tr></thead><tbody>{data.map(v => { const participacion = pct(Number(v.ingresoTotal || 0), totalIngreso); return <tr key={v.vendedorId}><td>{v.vendedor}</td><td>{v.email}</td><td>{v.totalVentas}</td><td>{v.ventasCompletadas}</td><td>{money(v.ingresoTotal)}</td><td>{participacion}% {bar(participacion, '#3b82f6')}</td><td>{v.tasaConversion}% {bar(Number(v.tasaConversion || 0), '#16a34a')}</td></tr>; })}</tbody></table></div>
  </div>;
};

export default VentasPorVendedorPage;
