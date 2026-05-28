import React, { useState, useEffect } from 'react';
import { productoService } from '../services/productoService';
import { categoriaService } from '../services/categoriaService';
import type { Categoria } from '../types';
import './Modal.css';

interface CrearProductoModalProps {
    isOpen: boolean;
    onClose: () => void;
    onProductoCreado: () => void;
}

const CrearProductoModal: React.FC<CrearProductoModalProps> = ({
    isOpen,
    onClose,
    onProductoCreado
}) => {
    const [formData, setFormData] = useState({
        codigo: '',
        nombre: '',
        descripcion: '',
        precio: '',
        stock: '0',
        categoriaId: '',
        stockMinimo: '5'
    });
    const [categorias, setCategorias] = useState<Categoria[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        if (isOpen) {
            categoriaService.getCategorias().then(setCategorias).catch(() => setCategorias([]));
        }
    }, [isOpen]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            await productoService.crearProducto({
                codigo: formData.codigo,
                nombre: formData.nombre,
                descripcion: formData.descripcion,
                precio: parseFloat(formData.precio),
                stock: parseInt(formData.stock),
                categoria: formData.categoriaId ? { id: formData.categoriaId } as any : undefined,
                stockMinimo: parseInt(formData.stockMinimo)
            });
            onProductoCreado();
            onClose();
            setFormData({ codigo: '', nombre: '', descripcion: '', precio: '', stock: '0', categoriaId: '', stockMinimo: '5' });
        } catch (err: any) {
            const msg = err.response?.data;
            setError(typeof msg === 'string' ? msg : (msg?.message ?? 'Error al crear el producto'));
        } finally {
            setLoading(false);
        }
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    if (!isOpen) return null;

    return (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
            <div className="modal-box">

                {/* HEADER */}
                <div className="modal-header">
                    <div className="modal-title">
                        <div className="modal-title-icon blue">📦</div>
                        <div>
                            <h2>Nuevo Producto</h2>
                            <p>Agrega un producto al inventario</p>
                        </div>
                    </div>
                    <button className="modal-close" onClick={onClose}>✕</button>
                </div>

                {/* BODY */}
                <div className="modal-body">
                    {error && (
                        <div className="modal-error">
                            <span>⚠️</span>
                            <span>{error}</span>
                        </div>
                    )}

                    <form onSubmit={handleSubmit} id="form-crear-producto">

                        <div className="form-row">
                            <div className="form-group">
                                <label className="form-label" htmlFor="codigo">
                                    Código <span className="required">*</span>
                                </label>
                                <input
                                    id="codigo"
                                    className="form-input"
                                    type="text"
                                    name="codigo"
                                    value={formData.codigo}
                                    onChange={handleChange}
                                    required
                                    placeholder="Ej: MON-001"
                                />
                            </div>

                            <div className="form-group">
                                <label className="form-label" htmlFor="categoriaId">
                                    Categoría
                                </label>
                                <select
                                    id="categoriaId"
                                    className="form-input"
                                    name="categoriaId"
                                    value={formData.categoriaId}
                                    onChange={handleChange}
                                >
                                    <option value="">-- Sin categoría --</option>
                                    {categorias.map(c => (
                                        <option key={c.id} value={c.id}>{c.nombre}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <div className="form-group">
                            <label className="form-label" htmlFor="nombre">
                                Nombre <span className="required">*</span>
                            </label>
                            <input
                                id="nombre"
                                className="form-input"
                                type="text"
                                name="nombre"
                                value={formData.nombre}
                                onChange={handleChange}
                                required
                                placeholder="Nombre del producto"
                            />
                        </div>

                        <div className="form-group">
                            <label className="form-label" htmlFor="descripcion">
                                Descripción
                            </label>
                            <textarea
                                id="descripcion"
                                className="form-textarea"
                                name="descripcion"
                                value={formData.descripcion}
                                onChange={handleChange}
                                rows={2}
                                placeholder="Descripción opcional..."
                            />
                        </div>

                        <div className="form-row">
                            <div className="form-group">
                                <label className="form-label" htmlFor="precio">
                                    Precio <span className="required">*</span>
                                </label>
                                <input
                                    id="precio"
                                    className="form-input"
                                    type="number"
                                    name="precio"
                                    value={formData.precio}
                                    onChange={handleChange}
                                    required
                                    min="0"
                                    step="0.01"
                                    placeholder="0.00"
                                />
                            </div>

                            <div className="form-group">
                                <label className="form-label" htmlFor="stock">
                                    Stock Inicial <span className="required">*</span>
                                </label>
                                <input
                                    id="stock"
                                    className="form-input"
                                    type="number"
                                    name="stock"
                                    value={formData.stock}
                                    onChange={handleChange}
                                    required
                                    min="0"
                                />
                            </div>
                        </div>

                        <div className="form-group">
                            <label className="form-label" htmlFor="stockMinimo">
                                Stock Mínimo (alerta)
                            </label>
                            <input
                                id="stockMinimo"
                                className="form-input"
                                type="number"
                                name="stockMinimo"
                                value={formData.stockMinimo}
                                onChange={handleChange}
                                min="0"
                            />
                            <span className="form-hint">Se generará una alerta cuando el stock baje de este valor</span>
                        </div>

                    </form>
                </div>

                {/* FOOTER */}
                <div className="modal-footer">
                    <button type="button" className="btn btn-secondary" onClick={onClose}>
                        Cancelar
                    </button>
                    <button
                        type="submit"
                        form="form-crear-producto"
                        className="btn btn-primary"
                        disabled={loading}
                    >
                        {loading ? '⏳ Creando...' : '📦 Crear Producto'}
                    </button>
                </div>

            </div>
        </div>
    );
};

export default CrearProductoModal;
