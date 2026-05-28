import React, { useState, useEffect } from 'react';
import { usuarioService } from '../services/usuarioService';
import type { Usuario, Rol } from '../types';
import './Modal.css';

interface EditarUsuarioModalProps {
    isOpen: boolean;
    onClose: () => void;
    onUsuarioActualizado: () => void;
    usuario: Usuario | null;
    roles: Rol[];
}

const EditarUsuarioModal: React.FC<EditarUsuarioModalProps> = ({
    isOpen,
    onClose,
    onUsuarioActualizado,
    usuario,
    roles
}) => {
    const [formData, setFormData] = useState({
        nombre: '',
        email: '',
        password: '',
        rolId: '',
        telefono: '',
        activo: true
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        if (usuario) {
            setFormData({
                nombre: usuario.nombre,
                email: usuario.email,
                password: '',
                rolId: usuario.rol.id,
                telefono: (usuario as any).telefono ?? '',
                activo: usuario.activo
            });
        }
    }, [usuario]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!usuario) return;

        setLoading(true);
        setError('');

        try {
            const datosActualizacion: any = {
                nombre: formData.nombre,
                email: formData.email,
                rol: { id: formData.rolId },
                telefono: formData.telefono || undefined
            };

            if (formData.password.trim()) {
                datosActualizacion.password = formData.password;
            }

            await usuarioService.updateUsuario(usuario.id, datosActualizacion);

            if (formData.activo !== usuario.activo) {
                await usuarioService.setUsuarioActivo(usuario.id, formData.activo);
            }

            onUsuarioActualizado();
            onClose();
            setFormData({ nombre: '', email: '', password: '', rolId: '', telefono: '', activo: true });
        } catch (err: any) {
            setError(err.response?.data || 'Error al actualizar el usuario');
        } finally {
            setLoading(false);
        }
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value, type } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value
        }));
    };

    // Solo permite dígitos en campos numéricos
    const soloNumeros = (e: React.KeyboardEvent<HTMLInputElement>) => {
        const permitidas = ['Backspace', 'Delete', 'ArrowLeft', 'ArrowRight', 'Tab', 'Home', 'End'];
        if (!permitidas.includes(e.key) && !/^[0-9]$/.test(e.key)) {
            e.preventDefault();
        }
    };

    if (!isOpen || !usuario) return null;

    return (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
            <div className="modal-box">

                {/* HEADER */}
                <div className="modal-header">
                    <div className="modal-title">
                        <div className="modal-title-icon orange">✏️</div>
                        <div>
                            <h2>Editar Usuario</h2>
                            <p>{usuario.nombre}</p>
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

                    <form onSubmit={handleSubmit} id="form-editar-usuario">

                        <div className="form-group">
                            <label className="form-label" htmlFor="eu-nombre">
                                Nombre completo <span className="required">*</span>
                            </label>
                            <input id="eu-nombre" className="form-input" type="text"
                                name="nombre" value={formData.nombre}
                                onChange={handleChange} required />
                        </div>

                        <div className="form-row">
                            <div className="form-group">
                                <label className="form-label" htmlFor="eu-email">
                                    Email <span className="required">*</span>
                                </label>
                                <input id="eu-email" className="form-input" type="email"
                                    name="email" value={formData.email}
                                    onChange={handleChange} required />
                            </div>
                            <div className="form-group">
                                <label className="form-label" htmlFor="eu-telefono">Teléfono</label>
                                <input id="eu-telefono" className="form-input" type="tel"
                                    name="telefono" value={formData.telefono}
                                    onChange={handleChange}
                                    onKeyDown={soloNumeros}
                                    inputMode="numeric"
                                    pattern="[0-9]*"
                                    placeholder="Ej: 3001234567" />
                            </div>
                        </div>

                        <div className="form-group">
                            <label className="form-label" htmlFor="eu-password">
                                Nueva Contraseña
                            </label>
                            <input id="eu-password" className="form-input" type="password"
                                name="password" value={formData.password}
                                onChange={handleChange} placeholder="Dejar vacío para no cambiar" />
                        </div>

                        <div className="form-group">
                            <label className="form-label" htmlFor="eu-rolId">
                                Rol <span className="required">*</span>
                            </label>
                            <select id="eu-rolId" className="form-select"
                                name="rolId" value={formData.rolId}
                                onChange={handleChange} required>
                                <option value="">Seleccionar rol...</option>
                                {roles.map((rol) => (
                                    <option key={rol.id} value={rol.id}>{rol.nombre}</option>
                                ))}
                            </select>
                        </div>

                        <div className="form-group">
                            <div className="form-checkbox-group">
                                <input id="eu-activo" className="form-checkbox" type="checkbox"
                                    name="activo" checked={formData.activo} onChange={handleChange} />
                                <label htmlFor="eu-activo" className="form-checkbox-label">
                                    Usuario activo en el sistema
                                </label>
                            </div>
                        </div>

                    </form>
                </div>

                {/* FOOTER */}
                <div className="modal-footer">
                    <button type="button" className="btn btn-secondary" onClick={onClose}>
                        Cancelar
                    </button>
                    <button type="submit" form="form-editar-usuario" className="btn btn-primary" disabled={loading}>
                        {loading ? '⏳ Guardando...' : '✏️ Guardar Cambios'}
                    </button>
                </div>

            </div>
        </div>
    );
};

export default EditarUsuarioModal;
