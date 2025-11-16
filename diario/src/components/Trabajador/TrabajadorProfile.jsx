import { useState, useEffect } from 'react';
import { Form, Input, Button, message } from 'antd';
import { useNavigate } from 'react-router-dom';
import api from '../../pages/context/axiosConfig';

const TrabajadorProfile = () => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [trabajador, setTrabajador] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    fetchTrabajadorProfile();
  }, []);

  const fetchTrabajadorProfile = async () => {
    const accessToken = localStorage.getItem('access');
    if (!accessToken) return;
  
    try {
      const response = await api.get('user-profile/', {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      });
  
      const { descripcion_usuario, nombre, apellido } = response.data;
  
      setTrabajador(response.data);
      form.setFieldsValue({
        nombre: nombre || '',
        apellido: apellido || '',
        descripcion_usuario: descripcion_usuario || '',
      });
  
    } catch (error) {
      console.error('Error fetching profile:', error);
      message.error('Error al cargar el perfil');
  
      if (error.response && error.response.status === 401) {
        message.error('La sesión ha expirado. Por favor, inicia sesión nuevamente.');
        navigate('/login');
      }
    }
  };

  const handleUpdateProfile = async (values) => {
    const accessToken = localStorage.getItem('access');
    if (!accessToken) {
      message.error('No se encontró el token de acceso. Por favor, inicia sesión nuevamente.');
      navigate('/login');
      return;
    }
  
    // Solo enviamos descripción - NO nombre ni apellido
    let formData = new FormData();
    formData.append('descripcion_usuario', values.descripcion_usuario || '');
    
    try {
      setLoading(true);
      await api.put('user-profile/', formData, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'multipart/form-data',
        },
      });
      message.success('Perfil actualizado correctamente');
      await fetchTrabajadorProfile(); // Actualiza el perfil inmediatamente
    } catch (error) {
      console.error('Error updating profile:', error);
      if (error.response) {
        console.error('Response data:', error.response.data);
        message.error(`Error al actualizar el perfil: ${error.response.data.detail || 'Error desconocido'}`);
      } else {
        message.error('Error al actualizar el perfil. Intenta nuevamente.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleMisNoticias = () => {
    const accessToken = localStorage.getItem('access');
    console.log('Access token present:', !!accessToken);
    console.log('Trabajador ID:', trabajador?.id);
    console.log('Attempting to navigate to /ed');
    navigate('/ed');
  };

  return (
    <section className='section-trabajador'>
      <h1>Perfil del Trabajador</h1>
      {trabajador ? (
        <Form form={form} onFinish={handleUpdateProfile}>
          {/* Mensaje informativo */}
          <div style={{
            backgroundColor: '#e6f7ff',
            border: '1px solid #91d5ff',
            borderRadius: '4px',
            padding: '12px',
            marginBottom: '16px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <span style={{ fontSize: '16px' }}>ℹ️</span>
            <span>
              <strong>Nota:</strong> El nombre y apellido solo pueden ser editados por un coordinador.
            </span>
          </div>

          {/* Campo Nombre - Solo lectura */}
          <Form.Item
            name="nombre"
            label="Nombre"
          >
            <Input 
              disabled 
              placeholder="Solo lectura"
              style={{ 
                backgroundColor: '#f5f5f5', 
                cursor: 'not-allowed',
                color: '#595959'
              }}
            />
          </Form.Item>
          
          {/* Campo Apellido - Solo lectura */}
          <Form.Item
            name="apellido"
            label="Apellido"
          >
            <Input 
              disabled 
              placeholder="Solo lectura"
              style={{ 
                backgroundColor: '#f5f5f5', 
                cursor: 'not-allowed',
                color: '#595959'
              }}
            />
          </Form.Item>

          {/* Campo Descripción - Editable */}
          <Form.Item
            name="descripcion_usuario"
            label="Descripción"
            rules={[{ required: false, message: 'Descripción es opcional' }]}
          >
            <Input.TextArea 
              rows={4} 
              placeholder="Escribe una breve descripción sobre ti..."
            />
          </Form.Item>

          {/* Información del trabajador */}
          <div className="author-info" style={{ marginBottom: '20px' }}>
            <div className="author-details">
              <span className="author-name" style={{ 
                fontSize: '18px', 
                fontWeight: 'bold',
                display: 'block'
              }}>
                {trabajador.nombre} {trabajador.apellido}
              </span>
            </div>
          </div>

          {/* Botones de acción */}
          <Form.Item style={{ marginTop: '24px' }}>
            <div style={{ display: 'flex', gap: '12px' }}>
              <Button 
                type="primary" 
                htmlType="submit" 
                loading={loading}
                size="large"
              >
                {loading ? 'Actualizando...' : 'Actualizar Perfil'}
              </Button>
              
              <Button 
                type="default" 
                onClick={handleMisNoticias}
                size="large"
              >
                Mis Noticias
              </Button>
            </div>
          </Form.Item>
        </Form>
      ) : (
        <div style={{ textAlign: 'center', padding: '40px' }}>
          <p>Cargando perfil...</p>
        </div>
      )}
    </section>
  );
};

export default TrabajadorProfile;