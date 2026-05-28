import React, { useState, useEffect } from 'react';
import { productoService } from '../services/productoService';
import { categoriaService } from '../services/categoriaService';
import { authService } from '../services/authService';
import type { Producto, Categoria } from '../types';
import './Modal.css';

interface EditarProductoModalProps {
    isOpen: boolean;
    onClose: () => void;
    onProductoActualizado: () => void;
    producto: Producto | null;
}

const EditarProductoModal: React.FC<EditarProductoModalProps> = ({
    isOpen,
    onClose,
    onProductoActualizado,
    producto
}) => {
    const user = authService.getUser();
    const esAdmin = user?.rol?.nombre === 'ADMIN';

    const [formData, setFormData] = useState({
        codigo: '',
        nombre: '',
        descripcion: '',
        precio: '',
        stock: 0,
        stockMinimo: 5,
        categoriaId: '',
        activo: true
    });
    const [categorias, setCategorias] = useState<Categoria[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        if (producto) {
            setFormData({
                codigo: producto.codigo,
                nombre: producto.nombre,
                descripcion: producto.descripcion ?? '',
                precio: producto.precio.toString(),
                stock: producto.stock,
                stockMinimo: producto.stockMinimo ?? 5,
                categoriaId: producto.categoria?.id ?? '',
                activo: producto.activo
            });
        }
    }, [producto]);

    useEffect(() => {
        if (isOpen) {
            categoriaService.getCategorias().then(setCategorias).catch(() => setCategorias([]));
        }
    }, [isOpen]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, type } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox'
                ? (e.target as HTMLInputElement).checked
                : e.target.value
        }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!producto) return;

        setLoading(true);
        setError('');

        try {
            const datosActualizacion: any = {
                codigo: formData.codigo,
                nombre: formData.nombre,
                descripcion: formData.descripcion,
                precio: parseFloat(formData.precio),
                categoria: formData.categoriaId ? { id: formData.categoriaId } : null,
                stockMinimo: formData.stockMinimo
            };

            if (esAdmin) {
                datosActualizacion.stock = formData.stock;
            }

            await productoService.updateProducto(producto.id, datosActualizacion);

            if (formData.activo !== producto.activo && esAdmin) {
                await productoService.setProductoActivo(producto.id, formData.activo);
            }

            onProductoActualizado();
            onClose();
        } catch (err: any) {
            const msg = err.response?.data;
            setError(typeof msg === 'string' ? msg : (msg?.message ?? 'Error al actualizar el producto'));
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen || !producto) return null;

    return (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
            <div className="modal-box">

                {/* HEADER */}
                <div className="modal-header">
                    <div className="modal-title">
                        <div className="modal-title-icon orange">✏️</div>
                        <div>
                            <h2>Editar Producto</h2>
                            <p>{producto.nombre}</p>
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

                    <form onSubmit={handleSubmit} id="form-editar-producto">

                        <div className="form-row">
                            <div className="form-group">
                                <label className="form-label" htmlFor="ep-codigo">Código <span className="required">*</span></label>
                                <input id="ep-codigo" className="form-input" type="text" name="codigo"
                                    value={formData.codigo} onChange={handleChange} required />
                            </div>
                            <div className="form-group">
                                <label className="form-label" htmlFor="ep-categoriaId">Categoría</label>
                                <select
                                    id="ep-categoriaId"
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
                            <label className="form-label" htmlFor="ep-nombre">Nombre <span className="required">*</span></label>
                            <input id="ep-nombre" className="form-input" type="text" name="nombre"
                                value={formData.nombre} onChange={handleChange} required />
                        </div>

                        <div className="form-group">
                            <label className="form-label" htmlFor="ep-descripcion">Descripción</label>
                            <textarea id="ep-descripcion" className="form-textarea" name="descripcion"
                                value={formData.descripcion} onChange={handleChange} rows={2} />
                        </div>

                        <div className="form-row">
                            <div className="form-group">
                                <label className="form-label" htmlFor="ep-precio">Precio <span className="required">*</span></label>
                                <input id="ep-precio" className="form-input" type="number" name="precio"
                                    value={formData.precio} onChange={handleChange} required min="0" step="0.01" />
                            </div>
                            <div className="form-group">
                                <label className="form-label" htmlFor="ep-stockMinimo">Stock Mínimo</label>
                                <input id="ep-stockMinimo" className="form-input" type="number" name="stockMinimo"
                                    value={formData.stockMinimo} onChange={handleChange} min="0" />
                            </div>
                        </div>

                        {/* STOCK — solo admin puede editar */}
                        <div className="form-group">
                            <label className="form-label">Stock Actual</label>
                            {esAdmin ? (
                                <>
                                    <input className="form-input" type="number" name="stock"
                                        value={formData.stock} onChange={handleChange} min="0" />
                                    <span className="form-hint">⚙️ Solo administradores pueden modificar el stock directamente</span>
                                </>
                            ) : (
                                <>
                                    <div className="stock-display">
                                        <span className="stock-label">Unidades disponibles</span>
                                        <span className="stock-value">{producto.stock}</span>
                                    </div>
                                    <div className="info-badge">
                                        <span>ℹ️</span>
                                        <span>El stock se modifica mediante entradas/salidas de inventario</span>
                                    </div>
                                </>
                            )}
                        </div>

                        {/* ACTIVO — solo admin */}
                        {esAdmin && (
                            <div className="form-group">
                                <div className="form-checkbox-group">
                                    <input id="ep-activo" className="form-checkbox" type="checkbox"
                                        name="activo" checked={formData.activo} onChange={handleChange} />
                                    <label htmlFor="ep-activo" className="form-checkbox-label">
                                        Producto activo
                                    </label>
                                </div>
                            </div>
                        )}

                    </form>
                </div>

                {/* FOOTER */}
                <div className="modal-footer">
                    <button type="button" className="btn btn-secondary" onClick={onClose}>
                        Cancelar
                    </button>
                    <button type="submit" form="form-editar-producto" className="btn btn-primary" disabled={loading}>
                        {loading ? '⏳ Guardando...' : '✏️ Guardar Cambios'}
                    </button>
                </div>

            </div>
        </div>
    );
};

export default EditarProductoModal;
