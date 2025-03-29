import { useState, useEffect } from 'react';
import { Form, Input, Button, message, Upload } from 'antd';
import { UploadOutlined } from '@ant-design/icons';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import './UserProfile.css'
import api from '../../pages/context/axiosConfig';
const UserProfile = () => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [usuario, setUsuario] = useState(null);
  const [profileImage, setProfileImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
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
  
      const { foto_perfil, descripcion_usuario, nombre, apellido } = response.data;
      const timestamp = new Date().getTime();
  
      setUsuario(response.data);
      form.setFieldsValue({
        nombre: nombre || '',
        apellido: apellido || '',
        foto_perfil: foto_perfil || '',
        descripcion_usuario: descripcion_usuario || '',
      });
  
      const imageUrl = foto_perfil
        ? foto_perfil.startsWith('http')
          ? `${foto_perfil}?t=${timestamp}`
          : `http://127.0.0.1:8000${foto_perfil}?t=${timestamp}`
        : null;
  
      console.log('Imagen URL:', imageUrl);
      setImagePreview(imageUrl);
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
  
    if (profileImage) {
      formData.append('foto_perfil_local', profileImage);
    }
    
    try {
      setLoading(true);
      await api.put('user-profile/', formData, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'multipart/form-data',
        },
      });
      message.success('Perfil actualizado correctamente');
      await fetchUserProfile(); // Actualiza el perfil inmediatamente
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

  const handleImageChange = (info) => {
    const file = info.file.originFileObj || info.file;
    if (file) {
      if (['image/jpeg', 'image/png'].includes(file.type)) {
        setProfileImage(file);
        const reader = new FileReader();
        reader.onload = (e) => setImagePreview(e.target.result);
        reader.readAsDataURL(file);
      } else {
        message.error('El archivo debe ser una imagen JPEG o PNG.');
      }
    } else {
      setProfileImage(null);
      setImagePreview(usuario?.foto_perfil);
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
            rules={[{ required: false, message: 'Descripción es opcional' }]}
          >
            <Input.TextArea rows={4} />
          </Form.Item>

          <div className="author-info">
            {imagePreview && (
              <img 
                src={imagePreview} 
                alt={`${usuario.nombre} ${usuario.apellido}`} 
                className="profile-image" 
              />
            )}
            <div className="author-details">
              <span className="author-name">{usuario.nombre} {usuario.apellido}</span>
            </div>
          </div>

          <Form.Item label="Cambiar Foto de Perfil">
            <Upload
              name="foto_perfil_local"
              listType="picture"
              maxCount={1}
              onChange={handleImageChange}
              beforeUpload={() => false}
            >
              <Button icon={<UploadOutlined />}>Seleccionar Nueva Imagen</Button>
            </Upload>
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