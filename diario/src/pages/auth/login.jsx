import React, { useState } from 'react';
import axios from '../context/axiosConfig';
import { useNavigate, Link } from 'react-router-dom';
import { useUser } from '../context/UserContext'; 
import './Login.css';

const Login = () => {
    const { setUser } = useUser();
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState(null);
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    const handleLogin = async (e) => {
        e.preventDefault();
        setError(null);
        setLoading(true);
        
        console.log("Attempting login with:", { username, password });
        
        try {
            // Paso 1: Obtener tokens
            const response = await axios.post('login/', { 
                username: username, 
                password: password 
            });
            
            console.log("Login response:", response.data);
            
            // Almacenar tokens en localStorage
            localStorage.setItem('access', response.data.access);
            localStorage.setItem('refresh', response.data.refresh);
            
            // Paso 2: Configurar axios con el nuevo token para la siguiente solicitud
            axios.defaults.headers.common['Authorization'] = `Bearer ${response.data.access}`;
            
            try {
                // Paso 3: Obtener información del usuario
                const userResponse = await axios.get('current-user/');
                console.log("User data:", userResponse.data);
                
                // Paso 4: Actualizar el contexto del usuario
                const userData = {
                    ...userResponse.data,
                    // Asegurarse de que trabajador sea un booleano explícito
                    trabajador: userResponse.data.isWorker === true
                };
                
                setUser(userData);
                localStorage.setItem('user', JSON.stringify(userData));
                
                // Paso 5: Navegar a home sin recargar
                navigate('/home');
            } catch (userError) {
                console.error("Error fetching user data:", userError);
                setError('Error al obtener datos del usuario');
                setLoading(false);
            }
        } catch (err) {
            console.error("Login error:", err);
            if (err.response) {
                console.error("Response status:", err.response.status);
                console.error("Response data:", err.response.data);
                
                if (err.response.status === 401) {
                    setError('Credenciales inválidas');
                } else {
                    setError(`Error: ${err.response.data.error || 'Problema con el servidor'}`);
                }
            } else if (err.request) {
                console.error("Request error:", err.request);
                setError('No se pudo conectar con el servidor');
            } else {
                console.error("Error message:", err.message);
                setError(`Error: ${err.message}`);
            }
            setLoading(false);
        }
    };

    return (
        <div className="login-container">
            <div className="login-card">
                <h2 style={{ color: '#003366' }}>Iniciar sesión</h2>
                {error && <p className="error-message">{error}</p>}
                <form onSubmit={handleLogin}>
                    <label>
                        Usuario:
                        <input
                            type="text"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            required
                        />
                    </label>
                    <label>
                        Contraseña:
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                        />
                    </label>
                    <button 
                        type="submit" 
                        className="login-button" 
                        disabled={loading}
                    >
                        {loading ? 'Iniciando sesión...' : 'Iniciar sesión'}
                    </button>
                </form>
                <div className="forgot-password">
                        <Link to="/forgot-password">¿Olvidaste tu contraseña?</Link>
                </div>
                <p className="signup-text">
                    ¿No tienes una cuenta? <Link to="/register">Regístrate aquí</Link>
                </p>
            </div>
        </div>
    );
};

export default Login;