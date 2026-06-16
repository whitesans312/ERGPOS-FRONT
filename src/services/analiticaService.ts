import api from './api';
export interface PrediccionStock { id:string; nombre:string; codigo:string; stock:number; stockMinimo:number; consumo30Dias:number; consumoDiarioPromedio:number; diasRestantes:string|number; diasRestantesValor?:number; }
export interface ProductoSinMovimiento { id:string; nombre:string; codigo:string; stock:number; categoria:string; ultimaVenta:string|null; diasSinMovimiento:string|number; }
export interface RendimientoTecnico { id:string; nombre:string; email:string; ordenesCompletadas:number; ordenesActivas:number; ingresosManoObra:number; tiempoResolucionHoras:number; }
export interface FlujoCaja { fecha:string; ingresos:number; egresos:number; neto:number; saldoAcumulado:number; }
export interface FlujoCajaResponse { periodo:string; desde:string; hasta:string; flujoDiario:FlujoCaja[]; totalIngresos:number; totalEgresos:number; netoTotal:number; saldoActual:number; }
export interface VentasPorVendedor { vendedorId:string; vendedor:string; email:string; totalVentas:number; ventasCompletadas:number; ingresoTotal:number; tasaConversion:number; }
export interface RentabilidadCategoria { categoriaId:string; categoria:string; productosActivos:number; itemsVendidos:number; cantidadTotal:number; ingresoTotal:number; costoEstimado:number; gananciaEstimada:number; margenPorcentaje:number; }
export interface Caja { id:string; usuario:any; montoInicial:number; montoFinal:number|null; estado:string; fechaApertura:string; fechaCierre:string|null; notas?:string|null; }
export interface MovimientoCaja { id:string; caja:Caja; tipo:string; concepto:string; monto:number; referencia?:string|null; usuario:any; fecha:string; notas?:string|null; }
export const getPrediccionStock=async()=> (await api.get('/analitica/prediccion-stock')).data as PrediccionStock[];
export const getProductosSinMovimiento=async(dias=30)=> (await api.get('/analitica/sin-movimiento',{params:{dias}})).data as ProductoSinMovimiento[];
export const getRendimientoTecnicos=async()=> (await api.get('/analitica/rendimiento-tecnicos')).data as RendimientoTecnico[];
export const getFlujoCaja=async()=> (await api.get('/analitica/flujo-caja')).data as FlujoCajaResponse;
export const getFlujoBoxja=getFlujoCaja;
export const getVentasPorVendedor=async()=> (await api.get('/reportes/ventas-por-vendedor')).data as VentasPorVendedor[];
export const getRentabilidadCategoria=async()=> (await api.get('/reportes/rentabilidad-categoria')).data as RentabilidadCategoria[];
export const getCajaActual=async()=>{ try { return (await api.get('/cajas/actual')).data as Caja; } catch { return null; } };
export const getCajasAbiertas=async()=> (await api.get('/cajas/abiertas')).data as Caja[];
export const abrirCaja=async(montoInicial:number)=> (await api.post('/cajas/abrir',{montoInicial})).data as Caja;
export const cerrarCaja=async(cajaId:string,montoFinal:number)=> (await api.patch(`/cajas/${cajaId}/cerrar`,{montoFinal})).data as Caja;
export const registrarMovimientoCaja=async(cajaId:string,tipo:string,concepto:string,monto:number,referencia?:string)=> (await api.post(`/cajas/${cajaId}/movimientos`,{tipo,concepto,monto,referencia})).data as MovimientoCaja;
export const getMovimientosCaja=async(cajaId:string,limit=100)=> (await api.get(`/cajas/${cajaId}/movimientos`,{params:{limit}})).data as MovimientoCaja[];
export const getCajaResumen=async(cajaId:string)=> (await api.get(`/cajas/${cajaId}/resumen`)).data;
