import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import './register.css';
import api from '../context/axiosConfig';

export const Register = () => {
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: ''
  });
  
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    setError(null);

    if (/\s/.test(formData.username)) {
      setError('El nombre de usuario no debe contener espacios. Usa guiones bajos "_" en su lugar.');
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setError('Las contraseñas no coinciden');
      return;
    }

    try {
      const response = await api.post('register/', {
        username: formData.username,
        email: formData.email,
        password: formData.password
      });

      if (response.status === 201) {
        const { access, refresh } = response.data;
        localStorage.setItem('access', access);
        localStorage.setItem('refresh', refresh);

        setSuccess(true);
        setTimeout(() => {
          navigate('/login');
        }, 2000);
      }
    } catch (err) {
      console.error('Error de registro:', err.response);
      
      if (err.response && err.response.data) {
        if (err.response.data.email) {
          setError(`Ya existe una cuenta con este correo electrónico: ${formData.email}`);
        } else if (err.response.data.username) {
          setError(`El nombre de usuario ${formData.username} ya está en uso`);
        } else if (err.response.data.message) {
          setError(err.response.data.message);
        } else if (err.response.data.error) {
          setError(err.response.data.error);
        } else if (typeof err.response.data === 'string') {
          setError(err.response.data);
        } else {
          setError('Ha ocurrido un error durante el registro. Por favor, inténtalo de nuevo.');
        }
      } else {
        setError('Error en el servidor. Por favor, inténtalo más tarde.');
      }
    }
  };

  return (
    <div className="register-container">
      <div className="register-card">
        <h2 style={{ color: '#003366' }}>Registro</h2>
        {success && <p className="success">Registro exitoso. Redirigiendo al inicio de sesión...</p>}
        {error && <p className="error">{error}</p>}
        
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="username">Nombre de usuario</label>
            <small className="note">
              (Nombre sin espacios. En su lugar, utiliza guion bajo "_")
            </small>
            <input
              type="text"
              name="username"
              value={formData.username}
              onChange={handleChange}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="email">Correo electrónico</label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Contraseña</label>
            <input
              type="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="confirmPassword">Confirmar contraseña</label>
            <input
              type="password"
              name="confirmPassword"
              value={formData.confirmPassword}
              onChange={handleChange}
              required
            />
          </div>

          <button type="submit" style={{ marginTop: '10px' }}>Registrar</button>
        </form>

        <p className="login-link">
          ¿Ya tienes una cuenta? <Link to="/login">Inicia sesión aquí</Link>
        </p>
      </div>
    </div>
  );
};
