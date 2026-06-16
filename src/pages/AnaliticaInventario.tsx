import React, { useEffect, useMemo, useState } from 'react';
import { getPrediccionStock, getProductosSinMovimiento, type PrediccionStock, type ProductoSinMovimiento } from '../services/analiticaService';

const pct = (value: number, total: number) => total > 0 ? Math.round((value / total) * 100) : 0;
const num = (value: unknown) => Number(value || 0);
const bar = (value: number, color: string) => (
  <div style={{ width: '100%', height: 8, background: '#e2e8f0', borderRadius: 999, overflow: 'hidden' }}>
    <div style={{ width: `${Math.min(100, Math.max(0, value))}%`, height: '100%', background: color }} />
  </div>
);

const Stat = ({ label, value, detail, color }: { label: string; value: string; detail: string; color: string }) => (
  <div className="stat-card">
    <span className="stat-card-label">{label}</span>
    <span className="stat-card-value" style={{ color }}>{value}</span>
    <span style={{ fontSize: '0.78rem', color: '#64748b' }}>{detail}</span>
  </div>
);

const AnaliticaInventario: React.FC = () => {
  const [prediccion, setPrediccion] = useState<PrediccionStock[]>([]);
  const [sinMovimiento, setSinMovimiento] = useState<ProductoSinMovimiento[]>([]);
  const [dias, setDias] = useState(30);
  const [loading, setLoading] = useState(true);

  const cargar = async () => {
    setLoading(true);
    try {
      const [a, b] = await Promise.all([getPrediccionStock(), getProductosSinMovimiento(dias)]);
      setPrediccion(a);
      setSinMovimiento(b);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { cargar(); }, [dias]);

  const metricas = useMemo(() => {
    const total = prediccion.length;
    const criticos = prediccion.filter(x => num((x as any).diasRestantesValor ?? x.diasRestantes) <= 7).length;
    const stockBajo = prediccion.filter(x => num(x.stock) <= num(x.stockMinimo)).length;
    return {
      total,
      criticos,
      stockBajo,
      criticosPct: pct(criticos, total),
      stockBajoPct: pct(stockBajo, total),
      sinMovimientoPct: pct(sinMovimiento.length, Math.max(total, sinMovimiento.length)),
    };
  }, [prediccion, sinMovimiento]);

  if (loading) return <div className="page-container"><div className="loading-state">Cargando...</div></div>;

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1 className="page-title">Analitica inventario</h1>
          <span className="page-subtitle">Riesgo de agotamiento, stock bajo y productos sin movimiento</span>
        </div>
        <button className="action-btn action-btn-ghost" onClick={cargar}>Actualizar</button>
      </div>

      <div className="stats-grid">
        <Stat label="Criticos" value={`${metricas.criticosPct}%`} detail={`${metricas.criticos} de ${metricas.total} productos <= 7 dias`} color="#dc2626" />
        <Stat label="Stock bajo" value={`${metricas.stockBajoPct}%`} detail={`${metricas.stockBajo} bajo minimo`} color="#f97316" />
        <Stat label="Sin movimiento" value={`${metricas.sinMovimientoPct}%`} detail={`${sinMovimiento.length} productos en ${dias}+ dias`} color="#7c3aed" />
      </div>

      <div className="table-wrapper">
        <table className="data-table">
          <thead><tr><th>Codigo</th><th>Producto</th><th>Stock</th><th>Minimo</th><th>Consumo 30d</th><th>Dias restantes</th><th>Riesgo</th></tr></thead>
          <tbody>{prediccion.map(x => { const diasRestantes = num((x as any).diasRestantesValor ?? x.diasRestantes); const riesgo = diasRestantes <= 7 ? 100 : diasRestantes <= 15 ? 60 : 25; return <tr key={x.id}><td>{x.codigo}</td><td>{x.nombre}</td><td>{x.stock}</td><td>{x.stockMinimo}</td><td>{x.consumo30Dias}</td><td>{x.diasRestantes}</td><td>{bar(riesgo, riesgo >= 100 ? '#dc2626' : riesgo >= 60 ? '#f97316' : '#22c55e')}</td></tr>; })}</tbody>
        </table>
      </div>

      <div className="card"><div className="card-body"><label>Dias sin movimiento <input type="number" value={dias} onChange={e => setDias(Number(e.target.value) || 30)} /></label></div></div>

      <div className="table-wrapper">
        <table className="data-table">
          <thead><tr><th>Codigo</th><th>Producto</th><th>Categoria</th><th>Stock</th><th>Dias</th></tr></thead>
          <tbody>{sinMovimiento.map(x => <tr key={x.id}><td>{x.codigo}</td><td>{x.nombre}</td><td>{x.categoria}</td><td>{x.stock}</td><td>{x.diasSinMovimiento}</td></tr>)}</tbody>
        </table>
      </div>
    </div>
  );
};

export default AnaliticaInventario;
