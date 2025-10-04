import React, { useState } from 'react';
import axios from '../context/axiosConfig';
import './Donaciones.css';

const Donaciones = () => {
  const [formData, setFormData] = useState({
    nombre: '',
    correo: '',
    monto: '',
    mensaje: ''
  });
  const [comprobante, setComprobante] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        setError('Por favor selecciona una imagen válida');
        return;
      }
      
      if (file.size > 5 * 1024 * 1024) {
        setError('La imagen no debe superar los 5MB');
        return;
      }

      setComprobante(file);
      setPreviewUrl(URL.createObjectURL(file));
      setError('');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    if (!formData.nombre || !formData.correo) {
      setError('Por favor completa todos los campos obligatorios');
      setLoading(false);
      return;
    }

    if (!comprobante) {
      setError('Por favor adjunta el comprobante de donación');
      setLoading(false);
      return;
    }

    try {
      const formDataToSend = new FormData();
      formDataToSend.append('nombre', formData.nombre);
      formDataToSend.append('correo', formData.correo);
      formDataToSend.append('comprobante_local', comprobante);
      
      if (formData.monto) {
        formDataToSend.append('monto', formData.monto);
      }
      if (formData.mensaje) {
        formDataToSend.append('mensaje', formData.mensaje);
      }

      const response = await axios.post('/donaciones/', formDataToSend, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      if (response.data.success) {
        setSuccess(true);
        setFormData({
          nombre: '',
          correo: '',
          monto: '',
          mensaje: ''
        });
        setComprobante(null);
        setPreviewUrl(null);
        
        setTimeout(() => setSuccess(false), 5000);
      }
    } catch (err) {
      console.error('Error al enviar donación:', err);
      setError(err.response?.data?.message || 'Error al procesar la donación. Por favor intenta nuevamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="donaciones-container">
      <div className="donaciones-hero">
        <h1>Apoya Nuestro Periodismo</h1>
        <p>Tu donación nos ayuda a mantener un periodismo independiente y de calidad</p>
      </div>

      <div className="donaciones-content">
        <div className="donaciones-info">
          <h2>¿Por qué donar?</h2>
          <ul>
            <li>
              <i className="ri-check-line"></i>
              <span>Darle voz y voto a nuestros lectores teniendo la oportunidad de plantear temas a desarrollar</span>
            </li>
            <li>
              <i className="ri-check-line"></i>
              <span>Mantenemos nuestro contenido libre de paywalls</span>
            </li>
            <li>
              <i className="ri-check-line"></i>
              <span>Periodismo independiente y sin compromisos</span>
            </li>
            <li>
              <i className="ri-check-line"></i>
              <span>Investigación de calidad y verificación de hechos</span>
            </li>
            <li>
              <i className="ri-check-line"></i>
              <span>Apoyo al equipo editorial y periodistas</span>
            </li>
            
          </ul>

          <div className="payment-info">
            <h3>Datos para transferencia</h3>
            <div className="payment-details">
              <p><strong>Alias:</strong> diario.gobierno</p>
              <p><strong>CBU:</strong> 0000003100012345678901</p>
              <p><strong>Titular:</strong> S.A. ElGobierno</p>
            </div>
          </div>
        </div>

        <div className="donaciones-form-wrapper">
          {success && (
            <div className="success-message">
              <i className="ri-check-circle-line"></i>
              <p>¡Gracias por tu donación! Hemos recibido tu comprobante y te enviaremos un correo de confirmación.</p>
            </div>
          )}

          {error && (
            <div className="error-message">
              <i className="ri-error-warning-line"></i>
              <p>{error}</p>
            </div>
          )}

          <div className="donaciones-form">
            <h2>Confirma tu donación</h2>
            
            <div className="form-group">
              <label htmlFor="nombre">
                Nombre completo <span className="required">*</span>
              </label>
              <input
                type="text"
                id="nombre"
                name="nombre"
                value={formData.nombre}
                onChange={handleInputChange}
                placeholder="Tu nombre completo"
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="correo">
                Correo electrónico <span className="required">*</span>
              </label>
              <input
                type="email"
                id="correo"
                name="correo"
                value={formData.correo}
                onChange={handleInputChange}
                placeholder="tu@email.com"
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="monto">
                Monto donado (opcional)
              </label>
              <input
                type="number"
                id="monto"
                name="monto"
                value={formData.monto}
                onChange={handleInputChange}
                placeholder="Ej: 1000"
                min="0"
                step="0.01"
              />
            </div>

            <div className="form-group">
              <label htmlFor="mensaje">
                Mensaje (opcional)
              </label>
              <textarea
                id="mensaje"
                name="mensaje"
                value={formData.mensaje}
                onChange={handleInputChange}
                placeholder="Deja un mensaje si lo deseas..."
                rows="4"
              />
            </div>

            <div className="form-group">
              <label htmlFor="comprobante">
                Comprobante de transferencia <span className="required">*</span>
              </label>
              <div className="file-input-wrapper">
                <input
                  type="file"
                  id="comprobante"
                  accept="image/*"
                  onChange={handleFileChange}
                  required
                />
                <label htmlFor="comprobante" className="file-input-label">
                  <i className="ri-upload-cloud-line"></i>
                  <span>{comprobante ? comprobante.name : 'Seleccionar archivo'}</span>
                </label>
              </div>
              {previewUrl && (
                <div className="image-preview">
                  <img src={previewUrl} alt="Vista previa" />
                  <button
                    type="button"
                    onClick={() => {
                      setComprobante(null);
                      setPreviewUrl(null);
                    }}
                    className="remove-image"
                  >
                    <i className="ri-close-line"></i>
                  </button>
                </div>
              )}
            </div>

            <button type="button" onClick={handleSubmit} className="submit-button" disabled={loading}>
              {loading ? (
                <>
                  <i className="ri-loader-4-line rotating"></i>
                  Enviando...
                </>
              ) : (
                <>
                  <i className="ri-send-plane-line"></i>
                  Enviar donación
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Donaciones;