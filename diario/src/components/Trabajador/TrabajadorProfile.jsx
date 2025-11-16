import { useState, useEffect } from 'react';
import { Form, Input, Button, message, Badge, Alert } from 'antd';
import { useNavigate } from 'react-router-dom';
import { BellOutlined, CheckCircleOutlined, WarningOutlined, CloseCircleOutlined } from '@ant-design/icons';
import api from '../../pages/context/axiosConfig';

const TrabajadorProfile = () => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [trabajador, setTrabajador] = useState(null);
  const [cantidadMensajes, setCantidadMensajes] = useState(0);
  const [cloudflareStatus, setCloudflareStatus] = useState(null);
  const [statusLoading, setStatusLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetchTrabajadorProfile();
    fetchCantidadMensajes();
    fetchCloudflareStatus();
    
    // Actualizar cantidad de mensajes cada 30 segundos
    const interval = setInterval(fetchCantidadMensajes, 30000);
    // Actualizar status de Cloudflare cada 5 minutos
    const statusInterval = setInterval(fetchCloudflareStatus, 300000);
    
    return () => {
      clearInterval(interval);
      clearInterval(statusInterval);
    };
  }, []);

  const fetchCloudflareStatus = async () => {
    try {
      setStatusLoading(true);
      
      // Usar el endpoint summary que es más preciso
      const response = await fetch('https://www.cloudflarestatus.com/api/v2/summary.json');
      const data = await response.json();
      
      // Verificar si hay incidentes reales (no mantenimientos programados)
      const realIncidents = (data.incidents || []).filter(incident => 
        incident.impact !== 'none' && 
        incident.status !== 'resolved' &&
        incident.status !== 'postmortem'
      );
      
      // Si no hay incidentes reales, forzar "none"
      const indicator = realIncidents.length === 0 ? 'none' : data.status.indicator;
      
      setCloudflareStatus({ indicator });
    } catch (error) {
      console.error('Error fetching Cloudflare status:', error);
      setCloudflareStatus(null);
    } finally {
      setStatusLoading(false);
    }
  };

  const getStatusConfig = () => {
    if (!cloudflareStatus) return null;
    
    const statusMap = {
      'none': {
        type: 'success',
        message: 'Todos los sistemas operativos',
        description: 'Cloudflare está funcionando correctamente',
        icon: <CheckCircleOutlined />
      },
      'minor': {
        type: 'warning',
        message: 'Incidente menor',
        description: 'Cloudflare está experimentando problemas menores',
        icon: <WarningOutlined />
      },
      'major': {
        type: 'error',
        message: 'Incidente mayor',
        description: 'Cloudflare está experimentando problemas importantes',
        icon: <CloseCircleOutlined />
      },
      'critical': {
        type: 'error',
        message: 'Incidente crítico',
        description: 'Cloudflare está experimentando problemas críticos',
        icon: <CloseCircleOutlined />
      }
    };

    return statusMap[cloudflareStatus.indicator] || statusMap['none'];
  };

  const fetchCantidadMensajes = async () => {
    const accessToken = localStorage.getItem('access');
    if (!accessToken) return;
    
    try {
      const response = await api.get('mensajes-globales/', {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      });
      setCantidadMensajes(response.data.length);
    } catch (error) {
      console.error('Error fetching mensajes:', error);
    }
  };

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
      await fetchTrabajadorProfile();
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

  const handleMensajesGlobales = () => {
    navigate('/mensajes-globales');
  };

  const statusConfig = getStatusConfig();

  return (
    <section className='section-trabajador'>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h1>Perfil del Trabajador</h1>
        <Badge count={cantidadMensajes} overflowCount={99}>
          <Button 
            type="primary" 
            icon={<BellOutlined />}
            size="large"
            onClick={handleMensajesGlobales}
            style={{ 
              backgroundColor: '#1890ff',
              borderColor: '#1890ff',
              marginTop: '90px'
            }}
          >
            Alertas del Equipo
          </Button>
        </Badge>
      </div>

      {/* Status de Cloudflare */}
      {!statusLoading && statusConfig && (
        <Alert
          message={statusConfig.message}
          description={
            <div>
              {statusConfig.description}
              <a 
                href="https://www.cloudflarestatus.com/" 
                target="_blank" 
                rel="noopener noreferrer"
                style={{ marginLeft: '8px', textDecoration: 'underline' }}
              >
                Ver detalles
              </a>
            </div>
          }
          type={statusConfig.type}
          icon={statusConfig.icon}
          showIcon
          style={{ marginBottom: '20px' }}
          closable
        />
      )}
      
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
            gap: '8px',
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