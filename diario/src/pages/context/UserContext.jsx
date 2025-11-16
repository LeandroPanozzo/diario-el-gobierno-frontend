import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from './axiosConfig';

const UserContext = createContext();

export const UserProvider = ({ children }) => {
    // ✅ NO usar localStorage inicial - siempre cargar desde el servidor
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Check if we have a token but no user data
        const checkAuth = async () => {
            const token = localStorage.getItem('access');
            if (token) {
                try {
                    // Configure axios with the token
                    axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
                    
                    // ✅ SIEMPRE hacer petición fresca al servidor
                    console.log('🔄 Cargando datos del usuario desde el servidor...');
                    const response = await axios.get('current-user/');
                    
                    // Process the user data - ensure trabajador flag is set
                    const userData = {
                        ...response.data,
                        trabajador: response.data.isWorker === true
                    };
                    
                    console.log('✅ Datos del usuario recibidos:', userData);
                    setUser(userData);
                    
                    // ❌ NO guardar en localStorage para que siempre recargue datos frescos
                    // localStorage.setItem('user', JSON.stringify(userData));
                } catch (error) {
                    console.error("❌ Failed to fetch user data:", error);
                    // Clear invalid tokens
                    localStorage.removeItem('access');
                    localStorage.removeItem('refresh');
                    localStorage.removeItem('user');
                    setUser(null);
                }
            } else {
                console.log('⚠️ No hay token de acceso');
                setUser(null);
            }
            setLoading(false);
        };

        checkAuth();
    }, []);

    // Set up axios interceptor for token refresh
    useEffect(() => {
        const interceptor = axios.interceptors.response.use(
            response => response,
            async error => {
                const originalRequest = error.config;
                
                // If error is 401 and we haven't tried to refresh yet
                if (error.response?.status === 401 && !originalRequest._retry) {
                    originalRequest._retry = true;
                    
                    try {
                        const refreshToken = localStorage.getItem('refresh');
                        if (!refreshToken) {
                            console.log('⚠️ No hay refresh token disponible');
                            logout();
                            return Promise.reject(error);
                        }
                        
                        console.log('🔄 Intentando refrescar el token...');
                        
                        // Attempt to refresh the token
                        const refreshResponse = await axios.post('token/refresh/', {
                            refresh: refreshToken
                        });
                        
                        // Update the access token
                        const newAccessToken = refreshResponse.data.access;
                        localStorage.setItem('access', newAccessToken);
                        
                        console.log('✅ Token refrescado correctamente');
                        
                        // Update authorization header
                        axios.defaults.headers.common['Authorization'] = `Bearer ${newAccessToken}`;
                        originalRequest.headers['Authorization'] = `Bearer ${newAccessToken}`;
                        
                        // Retry the original request
                        return axios(originalRequest);
                    } catch (refreshError) {
                        // If refresh fails, log out the user
                        console.error('❌ Error al refrescar token:', refreshError);
                        logout();
                        return Promise.reject(refreshError);
                    }
                }
                
                return Promise.reject(error);
            }
        );
        
        // Clean up the interceptor when the component unmounts
        return () => {
            axios.interceptors.response.eject(interceptor);
        };
    }, []);

    const logout = () => {
        console.log('🚪 Cerrando sesión...');
        
        localStorage.removeItem('access');
        localStorage.removeItem('refresh');
        localStorage.removeItem('user');
        
        // Clear authorization header
        delete axios.defaults.headers.common['Authorization'];
        
        setUser(null);
        
        console.log('✅ Sesión cerrada');
    };

    // ✅ Función para refrescar datos del usuario manualmente
    const refreshUser = async () => {
        const token = localStorage.getItem('access');
        if (token) {
            try {
                console.log('🔄 Refrescando datos del usuario...');
                axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
                
                const response = await axios.get('current-user/');
                const userData = {
                    ...response.data,
                    trabajador: response.data.isWorker === true
                };
                
                console.log('✅ Usuario refrescado:', userData);
                setUser(userData);
                return userData;
            } catch (error) {
                console.error('❌ Error al refrescar usuario:', error);
                throw error;
            }
        }
    };

    return (
        <UserContext.Provider value={{ user, setUser, loading, logout, refreshUser }}>
            {children}
        </UserContext.Provider>
    );
};

export const useUser = () => useContext(UserContext);