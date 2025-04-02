import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import axios from '../context/axiosConfig';
import './Login.css';

const ResetPassword = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(false);
    const token = location.state?.token || '';

    // Si no hay token, redirigir a la página de verificación
    if (!token) {
        navigate('/verify-token');
        return null;
    }

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError(null);
        
        // Verificar que las contraseñas coincidan
        if (password !== confirmPassword) {
            setError('Las contraseñas no coinciden.');
            return;
        }
        
        setLoading(true);
        
        try {
            await axios.post('password/reset/confirm/', {
                token,
                password,
                confirm_password: confirmPassword
            });
            
            setSuccess(true);
            // Redirigir al usuario a la página de login después de 3 segundos
            setTimeout(() => {
                navigate('/login');
            }, 3000);
        } catch (err) {
            console.error("Error resetting password:", err);
            if (err.response) {
                if (err.response.data.password) {
                    setError(err.response.data.password);
                } else if (err.response.data.token) {
                    setError(err.response.data.token);
                } else if (err.response.data.non_field_errors) {
                    setError(err.response.data.non_field_errors);
                } else {
                    setError('Ha ocurrido un error al restablecer la contraseña.');
                }
            } else {
                setError('No se pudo conectar con el servidor. Inténtalo de nuevo más tarde.');
            }
            setLoading(false);
        }
    };

    return (
        <div className="login-container">
            <div className="login-card">
                <h2 style={{ color: '#003366' }}>Restablecer contraseña</h2>
                {error && <p className="error-message">{error}</p>}
                {success ? (
                    <div className="success-message">
                        <p>¡Tu contraseña ha sido actualizada exitosamente!</p>
                        <p>Redirigiendo al inicio de sesión...</p>
                    </div>
                ) : (
                    <form onSubmit={handleSubmit}>
                        <p>Ingresa tu nueva contraseña.</p>
                        <label>
                            Nueva contraseña:
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                minLength="8"
                                required
                            />
                        </label>
                        <label>
                            Confirmar contraseña:
                            <input
                                type="password"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                minLength="8"
                                required
                            />
                        </label>
                        <button 
                            type="submit" 
                            className="login-button" 
                            disabled={loading}
                        >
                            {loading ? 'Actualizando...' : 'Actualizar contraseña'}
                        </button>
                    </form>
                )}
                <p className="signup-text">
                    <Link to="/login">Volver al inicio de sesión</Link>
                </p>
            </div>
        </div>
    );
};

export default ResetPassword;