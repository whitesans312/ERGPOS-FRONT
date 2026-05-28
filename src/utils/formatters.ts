import { EMPRESA } from '../config/empresa';

export const numeroALetras = (num: number): string => {
    const unidades = ['', 'UN', 'DOS', 'TRES', 'CUATRO', 'CINCO', 'SEIS', 'SIETE', 'OCHO', 'NUEVE'];
    const decenas = ['', 'DIEZ', 'VEINTE', 'TREINTA', 'CUARENTA', 'CINCUENTA', 'SESENTA', 'SETENTA', 'OCHENTA', 'NOVENTA'];
    const especiales: Record<number, string> = { 11: 'ONCE', 12: 'DOCE', 13: 'TRECE', 14: 'CATORCE', 15: 'QUINCE', 16: 'DIECISEIS', 17: 'DIECISIETE', 18: 'DIECIOCHO', 19: 'DIECINUEVE' };
    const centenas = ['', 'CIEN', 'DOSCIENTOS', 'TRESCIENTOS', 'CUATROCIENTOS', 'QUINIENTOS', 'SEISCIENTOS', 'SETECIENTOS', 'OCHOCIENTOS', 'NOVECIENTOS'];
    if (num === 0) return 'CERO';
    const cvt = (n: number): string => {
        if (n === 0) return '';
        if (n === 100) return 'CIEN';
        if (n < 10) return unidades[n];
        if (n < 20) return especiales[n] ?? (decenas[Math.floor(n / 10)] + ' Y ' + unidades[n % 10]);
        if (n < 100) return decenas[Math.floor(n / 10)] + (n % 10 ? ' Y ' + unidades[n % 10] : '');
        return centenas[Math.floor(n / 100)] + (n % 100 ? ' ' + cvt(n % 100) : '');
    };
    const millones = Math.floor(num / 1_000_000), miles = Math.floor((num % 1_000_000) / 1000), resto = num % 1000;
    let r = '';
    if (millones > 0) r += cvt(millones) + ' MILLÓN' + (millones > 1 ? 'ES' : '') + ' ';
    if (miles > 0) r += (miles === 1 ? 'MIL' : cvt(miles) + ' MIL') + ' ';
    if (resto > 0) r += cvt(resto);
    return r.trim() + ' PESOS M/CTE';
};

export const getEmpresa = () => {
    try {
        const s = localStorage.getItem('erg_empresa');
        return s ? JSON.parse(s) : EMPRESA;
    } catch {
        return EMPRESA;
    }
};