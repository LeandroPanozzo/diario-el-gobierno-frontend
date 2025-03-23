import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from './axiosConfig';

const UserContext = createContext();

export const UserProvider = ({ children }) => {
    const [user, setUser] = useState(() => {
        const savedUser = localStorage.getItem('user');
        return savedUser ? JSON.parse(savedUser) : null;
    });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Check if we have a token but no user data
        const checkAuth = async () => {
            const token = localStorage.getItem('access');
            if (token) {
                try {
                    // Configure axios with the token
                    axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
                    
                    // Get current user information
                    const response = await axios.get('current-user/');
                    
                    // Process the user data - ensure trabajador flag is set
                    const userData = {
                        ...response.data,
                        trabajador: response.data.isWorker === true
                    };
                    
                    setUser(userData);
                    localStorage.setItem('user', JSON.stringify(userData));
                } catch (error) {
                    console.error("Failed to fetch user data:", error);
                    // Clear invalid tokens
                    localStorage.removeItem('access');
                    localStorage.removeItem('refresh');
                    localStorage.removeItem('user');
                    setUser(null);
                }
            } else {
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
                            logout();
                            return Promise.reject(error);
                        }
                        
                        // Attempt to refresh the token
                        const refreshResponse = await axios.post('token/refresh/', {
                            refresh: refreshToken
                        });
                        
                        // Update the access token
                        const newAccessToken = refreshResponse.data.access;
                        localStorage.setItem('access', newAccessToken);
                        
                        // Update authorization header
                        axios.defaults.headers.common['Authorization'] = `Bearer ${newAccessToken}`;
                        originalRequest.headers['Authorization'] = `Bearer ${newAccessToken}`;
                        
                        // Retry the original request
                        return axios(originalRequest);
                    } catch (refreshError) {
                        // If refresh fails, log out the user
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
        localStorage.removeItem('access');
        localStorage.removeItem('refresh');
        localStorage.removeItem('user');
        
        // Clear authorization header
        delete axios.defaults.headers.common['Authorization'];
        
        setUser(null);
    };

    return (
        <UserContext.Provider value={{ user, setUser, loading, logout }}>
            {children}
        </UserContext.Provider>
    );
};

export const useUser = () => useContext(UserContext);