import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { message as antdMessage, Card, Button, Input, Select, Avatar, Space, Divider, Empty, Spin, Popconfirm, Tooltip, Grid } from 'antd';
import { ArrowLeftOutlined, SendOutlined, DeleteOutlined, MessageOutlined, ClockCircleOutlined } from '@ant-design/icons';
import api from '../../pages/context/axiosConfig';
import './MensajesGlobales.css';

const { TextArea } = Input;
const { Option } = Select;
const { useBreakpoint } = Grid;

const MensajesGlobales = () => {
  const [mensajes, setMensajes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [nuevoMensaje, setNuevoMensaje] = useState('');
  const [duracionDias, setDuracionDias] = useState(7);
  const [respuestasAbiertas, setRespuestasAbiertas] = useState({});
  const [textoRespuesta, setTextoRespuesta] = useState({});
  const [enviandoMensaje, setEnviandoMensaje] = useState(false);
  const [enviandoRespuesta, setEnviandoRespuesta] = useState({});
  const navigate = useNavigate();
  const screens = useBreakpoint();

  useEffect(() => {
    cargarMensajes();
    const interval = setInterval(cargarMensajes, 30000);
    return () => clearInterval(interval);
  }, []);

  const cargarMensajes = async () => {
    const accessToken = localStorage.getItem('access');
    if (!accessToken) {
      navigate('/login');
      return;
    }

    try {
      const response = await api.get('mensajes-globales/', {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      });
      setMensajes(response.data);
    } catch (err) {
      console.error('Error:', err);
      antdMessage.error('Error al cargar los mensajes');
    } finally {
      setLoading(false);
    }
  };

  const handleCrearMensaje = async () => {
    if (!nuevoMensaje.trim()) {
      antdMessage.warning('Por favor escribe un mensaje');
      return;
    }

    if (nuevoMensaje.length > 500) {
      antdMessage.warning('El mensaje no puede exceder 500 caracteres');
      return;
    }

    const accessToken = localStorage.getItem('access');
    setEnviandoMensaje(true);

    try {
      await api.post('mensajes-globales/', {
        mensaje: nuevoMensaje,
        duracion_dias: duracionDias,
      }, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      });

      setNuevoMensaje('');
      setDuracionDias(7);
      await cargarMensajes();
      antdMessage.success('Mensaje creado exitosamente');
    } catch (err) {
      console.error('Error:', err);
      antdMessage.error(err.response?.data?.error || 'Error al crear mensaje');
    } finally {
      setEnviandoMensaje(false);
    }
  };

  const handleResponder = async (mensajeId) => {
    const respuesta = textoRespuesta[mensajeId]?.trim();
    
    if (!respuesta) {
      antdMessage.warning('Por favor escribe una respuesta');
      return;
    }

    if (respuesta.length > 300) {
      antdMessage.warning('La respuesta no puede exceder 300 caracteres');
      return;
    }

    const accessToken = localStorage.getItem('access');
    setEnviandoRespuesta(prev => ({ ...prev, [mensajeId]: true }));

    try {
      await api.post(`mensajes-globales/${mensajeId}/responder/`, {
        respuesta: respuesta,
      }, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      });

      setTextoRespuesta(prev => ({ ...prev, [mensajeId]: '' }));
      await cargarMensajes();
      antdMessage.success('Respuesta enviada exitosamente');
    } catch (err) {
      console.error('Error:', err);
      antdMessage.error(err.response?.data?.error || 'Error al responder');
    } finally {
      setEnviandoRespuesta(prev => ({ ...prev, [mensajeId]: false }));
    }
  };

  const handleEliminarMensaje = async (mensajeId) => {
    const accessToken = localStorage.getItem('access');

    try {
      await api.delete(`mensajes-globales/${mensajeId}/`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      });
      await cargarMensajes();
      antdMessage.success('Mensaje eliminado exitosamente');
    } catch (err) {
      console.error('Error:', err);
      antdMessage.error(err.response?.data?.error || 'Error al eliminar mensaje');
    }
  };

  const handleEliminarRespuesta = async (mensajeId, respuestaId) => {
    const accessToken = localStorage.getItem('access');

    try {
      await api.delete(`mensajes-globales/${mensajeId}/eliminar_respuesta/`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
        data: {
          respuesta_id: respuestaId,
        },
      });
      await cargarMensajes();
      antdMessage.success('Respuesta eliminada exitosamente');
    } catch (err) {
      console.error('Error:', err);
      antdMessage.error(err.response?.data?.error || 'Error al eliminar respuesta');
    }
  };

  const toggleRespuestas = (mensajeId) => {
    setRespuestasAbiertas(prev => ({
      ...prev,
      [mensajeId]: !prev[mensajeId]
    }));
  };

  const formatearFecha = (fecha) => {
    const date = new Date(fecha);
    const ahora = new Date();
    const diferencia = ahora - date;
    const minutos = Math.floor(diferencia / 60000);
    const horas = Math.floor(diferencia / 3600000);
    const dias = Math.floor(diferencia / 86400000);

    if (minutos < 1) return 'Ahora mismo';
    if (minutos < 60) return `Hace ${minutos} minuto${minutos !== 1 ? 's' : ''}`;
    if (horas < 24) return `Hace ${horas} hora${horas !== 1 ? 's' : ''}`;
    if (dias < 7) return `Hace ${dias} día${dias !== 1 ? 's' : ''}`;
    
    return date.toLocaleDateString('es-ES', { 
      day: 'numeric', 
      month: 'short',
      year: 'numeric'
    });
  };

  const formatearFechaCompleta = (fecha) => {
    const date = new Date(fecha);
    return date.toLocaleString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });
  };

  // Tamaños responsive para diferentes elementos
  const avatarSize = screens.xs ? 32 : screens.sm ? 40 : 48;
  const buttonSize = screens.xs ? 'middle' : 'large';
  const titleSize = screens.xs ? '20px' : screens.sm ? '24px' : '28px';
  const subtitleSize = screens.xs ? '16px' : '18px';

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '50px', minHeight: '60vh' }}>
        <Spin size="large" tip="Cargando mensajes..." />
      </div>
    );
  }

  return (
    <div className="mensajes-container">
      {/* Header */}
      <div style={{ marginBottom: '30px' }}>
        <Space 
          style={{ 
            width: '100%', 
            justifyContent: 'space-between', 
            flexWrap: 'wrap',
            gap: '16px'
          }}
        >
          <div style={{ flex: 1, minWidth: screens.xs ? '100%' : 'auto' }}>
            <h1 style={{ 
              margin: 0, 
              fontSize: titleSize,
              lineHeight: '1.3'
            }}>
              Mensajes Globales del Equipo
            </h1>
            <p style={{ 
              color: '#666', 
              marginTop: '8px',
              fontSize: screens.xs ? '14px' : '16px'
            }}>
              Comunícate con todos los trabajadores. Los mensajes expiran automáticamente.
            </p>
          </div>
          <Button 
            icon={<ArrowLeftOutlined />}
            onClick={() => navigate(-1)}
            size={buttonSize}
            className="btn-volver"
            style={{ 
              width: screens.xs ? '100%' : 'auto'
            }}
          >
            {screens.xs ? 'Volver' : 'Volver Atrás'}
          </Button>
        </Space>
      </div>

      {/* Formulario para crear nuevo mensaje */}
      <Card 
        title={
          <span style={{ fontSize: screens.xs ? '16px' : '18px' }}>
            Crear Nuevo Mensaje
          </span>
        } 
        style={{ marginBottom: '30px' }}
        headStyle={{ backgroundColor: '#f0f2f5' }}
      >
        <TextArea
          value={nuevoMensaje}
          onChange={(e) => setNuevoMensaje(e.target.value)}
          placeholder="¿Qué quieres compartir con el equipo? (máx. 500 caracteres)"
          maxLength={500}
          rows={screens.xs ? 3 : 4}
          showCount
          style={{ fontSize: screens.xs ? '14px' : '16px' }}
        />
        <Space 
          style={{ 
            marginTop: '16px', 
            width: '100%', 
            justifyContent: 'space-between', 
            flexWrap: 'wrap',
            gap: '12px'
          }}
        >
          <Select
            value={duracionDias}
            onChange={(value) => setDuracionDias(value)}
            style={{ 
              width: screens.xs ? '100%' : '180px',
              minWidth: screens.xs ? '100%' : '180px'
            }}
            size={screens.xs ? 'middle' : 'large'}
          >
            <Option value={1}>1 día</Option>
            <Option value={5}>5 días</Option>
            <Option value={7}>7 días (1 semana)</Option>
          </Select>
          <Button 
            type="primary" 
            icon={<SendOutlined />}
            onClick={handleCrearMensaje}
            loading={enviandoMensaje}
            disabled={!nuevoMensaje.trim()}
            size={buttonSize}
            style={{ 
              width: screens.xs ? '100%' : 'auto',
              flex: screens.xs ? 1 : 'none'
            }}
          >
            {screens.xs ? 'Publicar' : 'Publicar Mensaje'}
          </Button>
        </Space>
      </Card>

      {/* Lista de mensajes */}
      <div>
        <h2 style={{ 
          fontSize: subtitleSize, 
          marginBottom: '20px' 
        }}>
          💬 Mensajes Activos ({mensajes.length})
        </h2>
        
        {mensajes.length === 0 ? (
          <Empty 
            description={
              <div>
                <p style={{ fontSize: screens.xs ? '14px' : '16px' }}>
                  📭 No hay mensajes activos en este momento
                </p>
                <p style={{ color: '#999', fontSize: screens.xs ? '12px' : '14px' }}>
                  Sé el primero en compartir algo con el equipo
                </p>
              </div>
            }
          />
        ) : (
          mensajes.map((mensaje) => (
            <Card 
              key={mensaje.id} 
              style={{ marginBottom: '20px' }}
              className="mensaje-card"
              actions={[
                <Button 
                  type="text"
                  icon={<MessageOutlined />}
                  onClick={() => toggleRespuestas(mensaje.id)}
                  key="respuestas"
                  size={screens.xs ? 'small' : 'middle'}
                  style={{ 
                    fontSize: screens.xs ? '12px' : '14px',
                    padding: screens.xs ? '4px 8px' : '8px 16px'
                  }}
                >
                  {screens.xs ? mensaje.total_respuestas : `${mensaje.total_respuestas} respuesta${mensaje.total_respuestas !== 1 ? 's' : ''}`}
                </Button>,
                <Popconfirm
                  title="¿Eliminar mensaje?"
                  description="¿Estás seguro de que quieres eliminar este mensaje?"
                  onConfirm={() => handleEliminarMensaje(mensaje.id)}
                  okText="Sí"
                  cancelText="No"
                  key="eliminar"
                >
                  <Button 
                    type="text"
                    danger
                    icon={<DeleteOutlined />}
                    size={screens.xs ? 'small' : 'middle'}
                    style={{ 
                      fontSize: screens.xs ? '12px' : '14px',
                      padding: screens.xs ? '4px 8px' : '8px 16px'
                    }}
                  >
                    {screens.xs ? '' : 'Eliminar'}
                  </Button>
                </Popconfirm>
              ]}
            >
              <Card.Meta
                avatar={
                  <Avatar 
                    src={mensaje.trabajador_foto || 'https://via.placeholder.com/40'} 
                    size={avatarSize}
                  />
                }
                title={
                  <Space 
                    style={{ 
                      width: '100%', 
                      justifyContent: 'space-between', 
                      flexWrap: 'wrap',
                      gap: '8px'
                    }}
                  >
                    <span style={{ 
                      fontSize: screens.xs ? '14px' : '16px',
                      fontWeight: 'bold'
                    }}>
                      {mensaje.trabajador_nombre} {mensaje.trabajador_apellido}
                    </span>
                    <span 
                      className={`tiempo-badge ${mensaje.esta_expirado ? 'expirado' : 'activo'}`}
                      style={{ 
                        fontSize: screens.xs ? '10px' : '12px',
                        padding: screens.xs ? '2px 6px' : '4px 8px'
                      }}
                    >
                      ⏱️ {mensaje.tiempo_restante}
                    </span>
                  </Space>
                }
                description={
                  <div style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '8px', 
                    color: '#666',
                    flexWrap: screens.xs ? 'wrap' : 'nowrap',
                    fontSize: screens.xs ? '12px' : '14px'
                  }}>
                    <Tooltip title="Fecha y hora de publicación">
                      <span style={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: '4px',
                        flexShrink: 0
                      }}>
                        <ClockCircleOutlined />
                        {screens.xs ? formatearFecha(mensaje.fecha_creacion) : formatearFechaCompleta(mensaje.fecha_creacion)}
                      </span>
                    </Tooltip>
                    {!screens.xs && (
                      <span style={{ color: '#999' }}>
                        ({formatearFecha(mensaje.fecha_creacion)})
                      </span>
                    )}
                  </div>
                }
              />
              <p style={{ 
                marginTop: '16px', 
                fontSize: screens.xs ? '14px' : '16px', 
                lineHeight: '1.6',
                wordBreak: 'break-word'
              }}>
                {mensaje.mensaje}
              </p>

              {/* Respuestas */}
              {respuestasAbiertas[mensaje.id] && (
                <>
                  <Divider />
                  <div>
                    {mensaje.respuestas?.map((respuesta) => (
                      <div 
                        key={respuesta.id} 
                        className="respuesta-item"
                        style={{ 
                          backgroundColor: '#f5f5f5', 
                          padding: screens.xs ? '8px' : '12px', 
                          borderRadius: '8px', 
                          marginBottom: '12px',
                          position: 'relative'
                        }}
                      >
                        <Space direction="vertical" style={{ width: '100%' }}>
                          <Space>
                            <Avatar 
                              src={respuesta.trabajador_foto || 'https://via.placeholder.com/32'} 
                              size={screens.xs ? 24 : 32}
                            />
                            <div>
                              <div style={{ 
                                fontWeight: 'bold',
                                fontSize: screens.xs ? '13px' : '14px'
                              }}>
                                {respuesta.trabajador_nombre} {respuesta.trabajador_apellido}
                              </div>
                              <div style={{ 
                                fontSize: screens.xs ? '10px' : '12px', 
                                color: '#999', 
                                display: 'flex', 
                                alignItems: 'center', 
                                gap: '4px' 
                              }}>
                                <ClockCircleOutlined style={{ fontSize: screens.xs ? '8px' : '10px' }} />
                                {screens.xs ? formatearFecha(respuesta.fecha_creacion) : formatearFechaCompleta(respuesta.fecha_creacion)}
                                {!screens.xs && (
                                  <span style={{ marginLeft: '4px' }}>
                                    ({formatearFecha(respuesta.fecha_creacion)})
                                  </span>
                                )}
                              </div>
                            </div>
                          </Space>
                        </Space>
                        <Popconfirm
                          title="¿Eliminar respuesta?"
                          description="¿Estás seguro de que quieres eliminar esta respuesta?"
                          onConfirm={() => handleEliminarRespuesta(mensaje.id, respuesta.id)}
                          okText="Sí"
                          cancelText="No"
                        >
                          <Button
                            type="text"
                            danger
                            size="small"
                            icon={<DeleteOutlined />}
                            style={{ 
                              position: 'absolute', 
                              top: screens.xs ? '4px' : '8px', 
                              right: screens.xs ? '4px' : '8px',
                              minWidth: 'auto',
                              width: screens.xs ? '24px' : '32px',
                              height: screens.xs ? '24px' : '32px'
                            }}
                          />
                        </Popconfirm>
                        <p style={{ 
                          marginTop: '8px', 
                          marginBottom: 0,
                          fontSize: screens.xs ? '13px' : '14px',
                          lineHeight: '1.5',
                          wordBreak: 'break-word'
                        }}>
                          {respuesta.respuesta}
                        </p>
                      </div>
                    ))}

                    {/* Formulario para responder */}
                    <div style={{ marginTop: '16px' }}>
                      <TextArea
                        value={textoRespuesta[mensaje.id] || ''}
                        onChange={(e) => setTextoRespuesta(prev => ({
                          ...prev,
                          [mensaje.id]: e.target.value
                        }))}
                        placeholder="Escribe tu respuesta... (máx. 300 caracteres)"
                        maxLength={300}
                        rows={screens.xs ? 2 : 3}
                        showCount
                        style={{ fontSize: screens.xs ? '14px' : '16px' }}
                      />
                      <Button
                        type="primary"
                        icon={<SendOutlined />}
                        onClick={() => handleResponder(mensaje.id)}
                        loading={enviandoRespuesta[mensaje.id]}
                        disabled={!(textoRespuesta[mensaje.id] || '').trim()}
                        style={{ 
                          marginTop: '8px',
                          width: screens.xs ? '100%' : 'auto'
                        }}
                        size={screens.xs ? 'middle' : 'large'}
                      >
                        {screens.xs ? 'Enviar' : 'Responder'}
                      </Button>
                    </div>
                  </div>
                </>
              )}
            </Card>
          ))
        )}
      </div>
    </div>
  );
};

export default MensajesGlobales;