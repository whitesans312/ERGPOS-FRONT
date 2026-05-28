import React, { useState } from 'react';
import { usuarioService } from '../services/usuarioService';
import type { Rol } from '../types';
import './Modal.css';

interface CrearUsuarioModalProps {
    isOpen: boolean;
    onClose: () => void;
    onUsuarioCreado: () => void;
    roles: Rol[];
}

const CrearUsuarioModal: React.FC<CrearUsuarioModalProps> = ({
    isOpen,
    onClose,
    onUsuarioCreado,
    roles
}) => {
    const [formData, setFormData] = useState({
        nombre: '',
        email: '',
        password: '',
        rolId: '',
        telefono: ''
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            await usuarioService.crearUsuario({
                nombre: formData.nombre,
                email: formData.email,
                password: formData.password,
                rolId: formData.rolId,
                telefono: formData.telefono || undefined
            });
            onUsuarioCreado();
            onClose();
            setFormData({ nombre: '', email: '', password: '', rolId: '', telefono: '' });
        } catch (err: any) {
            setError(err.response?.data || 'Error al crear el usuario');
        } finally {
            setLoading(false);
        }
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    // Solo permite dígitos en campos numéricos
    const soloNumeros = (e: React.KeyboardEvent<HTMLInputElement>) => {
        const permitidas = ['Backspace', 'Delete', 'ArrowLeft', 'ArrowRight', 'Tab', 'Home', 'End'];
        if (!permitidas.includes(e.key) && !/^[0-9]$/.test(e.key)) {
            e.preventDefault();
        }
    };

    if (!isOpen) return null;

    return (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
            <div className="modal-box">

                {/* HEADER */}
                <div className="modal-header">
                    <div className="modal-title">
                        <div className="modal-title-icon purple">👤</div>
                        <div>
                            <h2>Nuevo Usuario</h2>
                            <p>Crea una cuenta de acceso al sistema</p>
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

                    <form onSubmit={handleSubmit} id="form-crear-usuario">

                        <div className="form-group">
                            <label className="form-label" htmlFor="cu-nombre">
                                Nombre completo <span className="required">*</span>
                            </label>
                            <input id="cu-nombre" className="form-input" type="text"
                                name="nombre" value={formData.nombre}
                                onChange={handleChange} required placeholder="Ej: Juan García" />
                        </div>

                        <div className="form-row">
                            <div className="form-group">
                                <label className="form-label" htmlFor="cu-email">
                                    Email <span className="required">*</span>
                                </label>
                                <input id="cu-email" className="form-input" type="email"
                                    name="email" value={formData.email}
                                    onChange={handleChange} required placeholder="correo@empresa.com" />
                            </div>
                            <div className="form-group">
                                <label className="form-label" htmlFor="cu-telefono">Teléfono</label>
                                <input id="cu-telefono" className="form-input" type="tel"
                                    name="telefono" value={formData.telefono}
                                    onChange={handleChange}
                                    onKeyDown={soloNumeros}
                                    inputMode="numeric"
                                    pattern="[0-9]*"
                                    placeholder="Ej: 3001234567" />
                            </div>
                        </div>

                        <div className="form-group">
                            <label className="form-label" htmlFor="cu-password">
                                Contraseña <span className="required">*</span>
                            </label>
                            <input id="cu-password" className="form-input" type="password"
                                name="password" value={formData.password}
                                onChange={handleChange} required placeholder="Mínimo 6 caracteres" />
                        </div>

                        <div className="form-group">
                            <label className="form-label" htmlFor="cu-rolId">
                                Rol <span className="required">*</span>
                            </label>
                            <select id="cu-rolId" className="form-select"
                                name="rolId" value={formData.rolId}
                                onChange={handleChange} required>
                                <option value="">Seleccionar rol...</option>
                                {roles.map((rol) => (
                                    <option key={rol.id} value={rol.id}>{rol.nombre}</option>
                                ))}
                            </select>
                        </div>

                    </form>
                </div>

                {/* FOOTER */}
                <div className="modal-footer">
                    <button type="button" className="btn btn-secondary" onClick={onClose}>
                        Cancelar
                    </button>
                    <button type="submit" form="form-crear-usuario" className="btn btn-primary" disabled={loading}>
                        {loading ? '⏳ Creando...' : '👤 Crear Usuario'}
                    </button>
                </div>

            </div>
        </div>
    );
};

export default CrearUsuarioModal;
