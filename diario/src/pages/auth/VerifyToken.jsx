import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import axios from '../context/axiosConfig';
import './login.css';

const VerifyToken = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const [token, setToken] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const email = location.state?.email || '';

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError(null);
        setLoading(true);
        
        try {
            await axios.post('password/reset/verify/', { token });
            // Token válido, redirigir a la página de reseteo de contraseña
            navigate('/reset-password', { state: { token } });
        } catch (err) {
            console.error("Error verifying token:", err);
            if (err.response) {
                setError(err.response.data.token || 'Token inválido o expirado.');
            } else {
                setError('No se pudo conectar con el servidor. Inténtalo de nuevo más tarde.');
            }
            setLoading(false);
        }
    };

    return (
        <div className="login-container">
            <div className="login-card">
                <h2 style={{ color: '#003366' }}>Verificar token</h2>
                {error && <p className="error-message">{error}</p>}
                <form onSubmit={handleSubmit}>
                    <p>Ingresa el token que recibiste en tu correo electrónico {email && <b>({email})</b>}.</p>
                    <label>
                        Token:
                        <input
                            type="text"
                            value={token}
                            onChange={(e) => setToken(e.target.value)}
                            placeholder="Ingresa el código de 6 dígitos"
                            maxLength="6"
                            pattern="[0-9]*"  // Para algunos navegadores móviles, muestra teclado numérico
                            inputMode="numeric"  // Para mostrar teclado numérico en dispositivos móviles
                            required
                        />
                    </label>
                    <button 
                        type="submit" 
                        className="login-button" 
                        disabled={loading}
                    >
                        {loading ? 'Verificando...' : 'Verificar token'}
                    </button>
                </form>
                <p className="signup-text">
                    <Link to="/forgot-password">Solicitar un nuevo token</Link>
                </p>
                <p className="signup-text">
                    <Link to="/login">Volver al inicio de sesión</Link>
                </p>
            </div>
        </div>
    );
};

export default VerifyToken;