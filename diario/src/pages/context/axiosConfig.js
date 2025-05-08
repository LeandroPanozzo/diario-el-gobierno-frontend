import axios from 'axios';

const instance = axios.create({
    baseURL: 'Http://64.23.212.155/diarioback/', // Mantener tu configuración de URL
    headers: {
        'Content-Type': 'application/json',
    },
});

// Interceptor para agregar el token de acceso a cada solicitud
instance.interceptors.request.use(
    (config) => {
        const accessToken = localStorage.getItem('access');
        if (accessToken) {
            config.headers.Authorization = `Bearer ${accessToken}`;
        }
        return config;
    },
    (error) => Promise.reject(error)
);

// Interceptor para manejar errores 401 (token expirado) y renovar el token
instance.interceptors.response.use(
    (response) => response,
    async (error) => {
        const originalRequest = error.config;

        // Mantiene tu lógica específica de verificación de error y código
        if (error.response?.status === 401 && 
            error.response.data?.code === 'token_not_valid' && 
            !originalRequest._retry) {
            
            originalRequest._retry = true;

            try {
                const refreshToken = localStorage.getItem('refresh');
                if (refreshToken) {
                    console.log("Intentando refrescar el token...");
                    const response = await axios.post(
                        'https://diario-el-gobierno-backend.onrender.com/diarioback/token/refresh/', 
                        { refresh: refreshToken }
                    );
                    const newAccessToken = response.data.access;
                    console.log("Nuevo token de acceso recibido:", newAccessToken);

                    localStorage.setItem('access', newAccessToken);

                    originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
                    return instance(originalRequest);
                } else {
                    console.warn("No se encontró refresh token.");
                    // Redirigir al login si no hay refresh token
                    localStorage.clear();
                    window.location.href = '/login';
                }
            } catch (refreshError) {
                console.error("Error al refrescar el token:", refreshError);
                // Limpiar localStorage y redirigir al login en caso de error
                localStorage.clear();
                window.location.href = '/login';
            }
        }

        return Promise.reject(error);
    }
);

export default instance;