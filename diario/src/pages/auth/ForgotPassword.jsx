import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from '../context/axiosConfig';
import './login.css'; // Reutilizamos los estilos de login

const ForgotPassword = () => {
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(false);
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError(null);
        setLoading(true);
        
        try {
            const response = await axios.post('password/reset/request/', { email });
            setSuccess(true);
            setLoading(false);
            // Redirigir al usuario a la página de verificación después de 3 segundos
            setTimeout(() => {
                navigate('/verify-token', { state: { email } });
            }, 3000);
        } catch (err) {
            console.error("Error requesting password reset:", err);
            if (err.response) {
                setError(err.response.data.email || 'Ha ocurrido un error al procesar tu solicitud.');
            } else {
                setError('No se pudo conectar con el servidor. Inténtalo de nuevo más tarde.');
            }
            setLoading(false);
        }
    };

    return (
        <div className="login-container">
            <div className="login-card">
                <h2 style={{ color: '#003366' }}>Recuperar contraseña</h2>
                {error && <p className="error-message">{error}</p>}
                {success ? (
                    <div className="success-message">
                        <p>Se ha enviado un correo electrónico con las instrucciones para recuperar tu contraseña. Verifica tu casilla de spam si no encuentras el correo.</p>
                        <p>Redirigiendo a la verificación de token...</p>
                    </div>
                ) : (
                    <form onSubmit={handleSubmit}>
                        <p>Ingresa tu correo electrónico y te enviaremos un token para recuperar tu contraseña.</p>
                        <label>
                            Correo electrónico:
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                            />
                        </label>
                        <button 
                            type="submit" 
                            className="login-button" 
                            disabled={loading}
                        >
                            {loading ? 'Enviando...' : 'Enviar token de recuperación'}
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

export default ForgotPassword;