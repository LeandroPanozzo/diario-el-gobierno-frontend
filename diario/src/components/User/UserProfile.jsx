import { useState, useEffect } from 'react';
import { Form, Input, Button, message } from 'antd';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import './UserProfile.css';
import api from '../../pages/context/axiosConfig';

const UserProfile = () => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [usuario, setUsuario] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    fetchUserProfile();
  }, []);

  const fetchUserProfile = async () => {
    const accessToken = localStorage.getItem('access');
    if (!accessToken) return;

    try {
      const response = await api.get('user-profile/', {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      });

      const { descripcion_usuario, nombre, apellido } = response.data;

      setUsuario(response.data);
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
    formData.append('nombre', values.nombre);
    formData.append('apellido', values.apellido);
    formData.append('descripcion_usuario', values.descripcion_usuario);

    try {
      setLoading(true);
      await api.put('user-profile/', formData, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'multipart/form-data',
        },
      });
      message.success('Perfil actualizado correctamente');
      await fetchUserProfile();
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

  return (
    <section className='section-perfil'>
      <h1>Perfil de Usuario</h1>
      {usuario ? (
        <Form form={form} onFinish={handleUpdateProfile} encType="multipart/form-data">
          <Form.Item
            name="nombre"
            label="Nombre"
            rules={[{ required: true, message: 'Nombre es requerido' }]}
          >
            <Input />
          </Form.Item>
          <Form.Item
            name="apellido"
            label="Apellido"
            rules={[{ required: true, message: 'Apellido es requerido' }]}
          >
            <Input />
          </Form.Item>

          <Form.Item
            name="descripcion_usuario"
            label="Descripción"
            rules={[{ required: false }]}
          >
            <Input.TextArea rows={4} />
          </Form.Item>

          <Form.Item>
            <Button type="primary" htmlType="submit" loading={loading}>
              Actualizar Perfil
            </Button>
          </Form.Item>
        </Form>
      ) : (
        <p>Cargando perfil...</p>
      )}
    </section>
  );
};

export default UserProfile;
