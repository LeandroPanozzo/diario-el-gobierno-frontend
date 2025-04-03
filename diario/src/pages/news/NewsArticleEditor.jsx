import { useState, useEffect } from 'react';
import { 
  Table, 
  Form, 
  Button, 
  Modal, 
  Select, 
  Checkbox, 
  Input, 
  DatePicker, 
  Popconfirm, 
  Layout,
  Grid,
  message
} from 'antd';
import { EditOutlined, PlusOutlined, DeleteOutlined, CommentOutlined } from '@ant-design/icons';
import axios from 'axios';
import moment from 'moment';
import { useNavigate } from 'react-router-dom';
import './NewsManagement.css';
import api from '../context/axiosConfig';

const { Option } = Select;
const { TextArea } = Input;
const { useBreakpoint } = Grid;

const NewsManagement = () => {
  const [news, setNews] = useState([]);
  const [editors, setEditors] = useState([]);
  const [publicationStates, setPublicationStates] = useState([]);
  const [filteredPublicationStates, setFilteredPublicationStates] = useState([]);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [form] = Form.useForm();
  const [editingId, setEditingId] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [trabajadorId, setTrabajadorId] = useState(null);
  const [isEditorEnJefe, setIsEditorEnJefe] = useState(false); // Nuevo estado para rastrear si es editor en jefe
  const navigate = useNavigate();
  const screens = useBreakpoint();
  const [isMobile, setIsMobile] = useState(false);

  // Detect mobile screen
  useEffect(() => {
    setIsMobile(screens.xs && !screens.sm);
  }, [screens]);
  
  const CATEGORIAS = [
    ['Portada', 'portada'],
    ['Politica', [
      ['legislativos', 'Legislativos'],
      ['judiciales', 'Judiciales'],
      ['conurbano', 'Conurbano'],
      ['provincias', 'Provincias'],
      ['municipios', 'Municipios'],
      ['protestas', 'Protestas']
    ]],
    ['Cultura', [
      ['cine', 'Cine'],
      ['literatura', 'Literatura'],
      ['moda', 'Moda'],
      ['tecnologia', 'Tecnologia'],
      ['eventos', 'Eventos']
    ]],
    ['Economia', [
      ['finanzas', 'Finanzas'],
      ['negocios', 'Negocios'],
      ['empresas', 'Empresas'],
      ['dolar', 'Dolar']
    ]],
    ['Mundo', [
      ['estados_unidos', 'Estados Unidos'],
      ['politica_exterior', 'Politica Exterior'],
      ['asia', 'Asia'],
      ['medio_oriente', 'Medio Oriente'],
      ['internacional', 'Internacional']
    ]]
  ];
  
  useEffect(() => {
    fetchEditors();
    fetchPublicationStates();
    verifyTrabajador();
    
    const handleKeyDown = (event) => {
      if (event.key === 'F12') {
        console.log('ID del trabajador:', trabajadorId);
        console.log('¿Es editor en jefe?:', isEditorEnJefe);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);
  
  // Efecto adicional para cargar noticias cuando tengamos el ID del trabajador
  useEffect(() => {
    if (trabajadorId) {
      fetchNews();
    }
  }, [trabajadorId]);

  const sortNewsByDate = (newsArray) => {
    // Asegurarse de que estamos trabajando con una copia del array para no mutar el original
    return [...newsArray].sort((a, b) => {
      // Usar moment para parsear las fechas y compararlas
      const dateA = moment(a.fecha_publicacion);
      const dateB = moment(b.fecha_publicacion);
      
      // Ordenar descendente (más reciente primero)
      return dateB.valueOf() - dateA.valueOf();
    });
  };

  const fetchNews = () => {
    api.get('noticias/')
      .then(response => {
        // Asegurarse de que estamos usando el trabajadorId
        const filteredNews = response.data
          .filter(noticia => 
            noticia.autor === trabajadorId || noticia.editor_en_jefe === trabajadorId
          );
        
        console.log(`Filtrando noticias para trabajador ID: ${trabajadorId}`);
        filteredNews.forEach(noticia => {
          console.log(`Noticia: ${noticia.nombre_noticia} - ID Autor: ${noticia.autor}, ID Editor: ${noticia.editor_en_jefe}, Fecha: ${noticia.fecha_publicacion}`);
        });
        
        // Ordenar las noticias por fecha (más reciente primero)
        const sortedNews = sortNewsByDate(filteredNews);
        console.log('Noticias ordenadas:', sortedNews.map(n => ({ 
          titulo: n.nombre_noticia, 
          fecha: n.fecha_publicacion 
        })));
        
        setNews(sortedNews);
      })
      .catch(error => {
        console.error("Error al obtener noticias:", error);
        message.error("No se pudieron cargar las noticias");
      });
  };

  const fetchEditors = () => {
    api.get('trabajadores/')
      .then(response => {
        console.log("Todos los editores con IDs:", response.data);
        setEditors(response.data);
      })
      .catch(error => {
        console.error("Error al obtener editores:", error);
        message.error("No se pudieron cargar los editores");
      });
  };

  const fetchPublicationStates = () => {
    api.get('estados-publicacion/')
      .then(response => setPublicationStates(response.data))
      .catch(error => {
        console.error("Error al obtener estados de publicación:", error);
      });
  };

  // Función para determinar si un trabajador es editor en jefe
  const checkIfEditorEnJefe = (trabajadorId, trabajadores) => {
    // Aquí deberías implementar la lógica para determinar si el trabajador es editor en jefe
    // Esto podría depender de un campo en el objeto trabajador o de otra información
    // Por simplicidad, asumimos que hay un campo 'cargo' que indica si es editor en jefe
    const trabajador = trabajadores.find(t => t.id === trabajadorId);
    
    // Si el trabajador existe y tiene un campo que indica que es editor en jefe
    // (asumiendo que hay un campo 'cargo' o similar que indica si es editor en jefe)
    return trabajador && (trabajador.cargo === 'Editor en Jefe' || trabajador.es_editor_en_jefe === true);
    
    // Si no puedes determinar esto basándote en los datos actuales,
    // deberías modificar el backend para incluir esta información
  };

  const verifyTrabajador = () => {
    const accessToken = localStorage.getItem('access');
    if (!accessToken) {
      navigate('/home');
      return;
    }
  
    // Check if we already have a trabajadorId in state or localStorage
    const storedTrabajadorId = localStorage.getItem('trabajadorId');
    if (storedTrabajadorId && parseInt(storedTrabajadorId) > 0) {
      setTrabajadorId(parseInt(storedTrabajadorId));
      
      // Verificar si el trabajador es editor en jefe
      api.get('trabajadores/')
        .then(response => {
          const isEJ = checkIfEditorEnJefe(parseInt(storedTrabajadorId), response.data);
          setIsEditorEnJefe(isEJ);
          console.log(`El trabajador ${storedTrabajadorId} ${isEJ ? 'es' : 'no es'} editor en jefe`);
        })
        .catch(error => {
          console.error("Error al verificar si es editor en jefe:", error);
        });
      
      return; // Already verified, no need to continue
    }
  
    // Primero obtener el perfil de usuario
    api.get('user-profile/', {
      headers: { 'Authorization': `Bearer ${accessToken}` },
    }).then(response => {
      console.log("Perfil recibido:", response.data);
      
      // Obtener la lista de trabajadores para encontrar el que corresponde al usuario actual
      api.get('trabajadores/')
        .then(trabajadoresResponse => {
          // Buscar el trabajador que tiene el mismo usuario
          const trabajador = trabajadoresResponse.data.find(
            t => t.nombre === response.data.nombre && t.apellido === response.data.apellido
          );
          
          if (trabajador && trabajador.id > 0) {
            console.log("Trabajador encontrado:", trabajador);
            setTrabajadorId(trabajador.id); // Usar el ID del trabajador
            localStorage.setItem('trabajadorId', trabajador.id); // Store for future use
            
            // Verificar si el trabajador es editor en jefe
            const isEJ = checkIfEditorEnJefe(trabajador.id, trabajadoresResponse.data);
            setIsEditorEnJefe(isEJ);
            console.log(`El trabajador ${trabajador.id} ${isEJ ? 'es' : 'no es'} editor en jefe`);
          } else {
            console.error("No se encontró un trabajador válido asociado a este perfil");
            message.error("No tiene permisos para acceder a esta página");
            navigate('/home');
          }
        })
        .catch(error => {
          console.error("Error al obtener trabajadores:", error);
          navigate('/home');
        });
    }).catch(error => {
      console.error("Error al verificar el perfil:", error);
      navigate('/home');
    });
  };

  const showModal = (record = null) => {
    if (record) {
      // Editar noticia existente
      form.setFieldsValue({
        ...record,
        fecha_publicacion: moment(record.fecha_publicacion),
        solo_para_subscriptores: record.solo_para_subscriptores || false,
        Palabras_clave: record.Palabras_clave || '',
        categorias: record.categorias || [],
        estado: record.estado ? parseInt(record.estado, 10) : undefined,
      });
      setEditingId(record.id);

      // Determinar qué estados de publicación mostrar basado en el rol
      if (trabajadorId === record.autor && !isEditorEnJefe) {
        // Si es autor pero no editor en jefe, no puede publicar
        setFilteredPublicationStates(publicationStates.filter(state => state.nombre_estado !== 'publicado'));
      } else if (trabajadorId === record.editor_en_jefe || isEditorEnJefe) {
        // Si es editor en jefe, puede ver todos los estados
        setFilteredPublicationStates(publicationStates);
      } else {
        // En otros casos, limitar según el rol (podría ser más específico)
        setFilteredPublicationStates([]);
      }
    } else {
      // Nueva noticia
      form.resetFields();
      
      // Establecer el autor como el trabajador actual
      form.setFieldsValue({
        autor: trabajadorId,
        // Si es editor en jefe, también establecerlo como editor en jefe de la noticia
        editor_en_jefe: isEditorEnJefe ? trabajadorId : undefined
      });
      
      setEditingId(null);
      
      // Determinar qué estados de publicación mostrar para nueva noticia
      if (isEditorEnJefe) {
        // Si es editor en jefe, puede ver todos los estados
        setFilteredPublicationStates(publicationStates);
      } else {
        // Si no es editor en jefe, no puede publicar
        setFilteredPublicationStates(publicationStates.filter(state => state.nombre_estado !== 'publicado'));
      }
    }
    setIsModalVisible(true);
  };

  const handleOk = () => {
    form.validateFields().then(values => {
      if (!Array.isArray(values.categorias)) {
        values.categorias = values.categorias ? [values.categorias] : [];
      }
      
      // Asegurarse de que el autor sea el trabajadorId correcto
      const noticiaEditada = {
        nombre_noticia: values.nombre_noticia,
        fecha_publicacion: values.fecha_publicacion.format('YYYY-MM-DD'),
        categorias: values.categorias.join(','),
        Palabras_clave: values.Palabras_clave || '',
        autor: parseInt(values.autor, 10), // Aseguramos que sea número y que sea el trabajadorId
        editor_en_jefe: parseInt(values.editor_en_jefe, 10), // Aseguramos que sea número
        estado: parseInt(values.estado, 10),
        solo_para_subscriptores: values.solo_para_subscriptores || false,
        subtitulo: values.subtitulo || 'default content',
        imagen_cabecera: values.imagen_cabecera || '',
        imagen_1: values.imagen_1 || '',
        imagen_2: values.imagen_2 || '',
        imagen_3: values.imagen_3 || '',
        imagen_4: values.imagen_4 || '',
        imagen_5: values.imagen_5 || '',
        imagen_6: values.imagen_6 || ''
      };
  
      const submitData = () => {
        const endpoint = editingId 
          ? `noticias/${editingId}/`
          : 'noticias/';
        
        const method = editingId ? 'put' : 'post';
      
        api[method](endpoint, noticiaEditada)
          .then(() => {
            message.success(`Noticia ${editingId ? 'actualizada' : 'creada'} con éxito`);
            setIsModalVisible(false);
            fetchNews(); // Mejor que recargar la página
          })
          .catch(error => {
            console.error(`Error al ${editingId ? 'actualizar' : 'crear'} la noticia:`, error);
            message.error(`Error al ${editingId ? 'actualizar' : 'crear'} la noticia`);
          });
      };
      submitData();
    });
  };

  const handleDelete = (id) => {
    api.delete(`noticias/${id}/`)
      .then(() => {
        message.success("Noticia eliminada con éxito");
        fetchNews(); // Recargar las noticias en lugar de recargar la página
      })
      .catch(error => {
        console.error("Error al eliminar la noticia:", error);
        message.error("Error al eliminar la noticia");
      });
  };

  const handleSearch = (e) => {
    setSearchTerm(e.target.value);
    console.log('Search term:', e.target.value);
  };

  const handleEditContent = (id) => {
    navigate(`/edit-content/${id}`);
    console.log('Navigating to edit content for news ID:', id);
  };

  const handleComment = (id) => {
    navigate(`/comments/${id}`);
    console.log('Navigating to comments for news ID:', id);
  };

  const filteredNews = news.filter(record => 
    record.nombre_noticia.toLowerCase().includes(searchTerm.toLowerCase())
  );
  
  console.log('Filtered News:', filteredNews);

  const columns = [
    { 
      title: 'Detalles de la Noticia', 
      dataIndex: 'nombre_noticia', 
      key: 'nombre_noticia',
      render: (text, record) => {
        const authorObj = editors.find(editor => editor.id === record.autor);
        const editorObj = editors.find(editor => editor.id === record.editor_en_jefe);
        
        console.log("News record:", record);
        console.log("Author ID:", record.autor, "Author object:", authorObj);
        console.log("Editor ID:", record.editor_en_jefe, "Editor object:", editorObj);
        
        return (
          <div style={{ 
            display: 'flex', 
            flexDirection: 'column',
            gap: '8px'
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px'
            }}>
              <strong>Título:</strong>
              <span>{text}</span>
            </div>
  
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px'
            }}>
              <strong>Autor:</strong>
              <span>
                {authorObj
                  ? `${authorObj.nombre} ${authorObj.apellido} (ID: ${authorObj.id})`
                  : `Unknown (ID: ${record.autor})`}
              </span>
            </div>
  
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px'
            }}>
              <strong>Editor:</strong>
              <span>
                {editorObj
                  ? `${editorObj.nombre} ${editorObj.apellido} (ID: ${editorObj.id})`
                  : `Unknown (ID: ${record.editor_en_jefe})`}
              </span>
            </div>
  
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px'
            }}>
              <strong>Fecha:</strong>
              <span>{record.fecha_publicacion}</span>
            </div>
  
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px'
            }}>
              <strong>Categorías:</strong>
              <span>{record.categorias ? record.categorias.join(', ') : ''}</span>
            </div>
  
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px'
            }}>
              <strong>Palabras Clave:</strong>
              <span>{record.Palabras_clave || 'N/A'}</span>
            </div>
  
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px'
            }}>
              <strong>Suscriptores:</strong>
              <span>{record.solo_para_subscriptores ? 'Sí' : 'No'}</span>
            </div>
  
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px'
            }}>
              <strong>Estado:</strong>
              <span>
                {publicationStates.find(state => state.id === record.estado)
                  ? publicationStates.find(state => state.id === record.estado).nombre_estado
                  : 'Unknown'}
              </span>
            </div>
  
            <div style={{ 
              display: 'flex', 
              flexWrap: 'wrap',
              gap: '8px', 
              width: '100%', 
              marginTop: '12px' 
            }}>
              <Button 
                icon={<EditOutlined />} 
                onClick={() => showModal(record)} 
                size="small"
              >
                Editar
              </Button>
              <Button 
                icon={<EditOutlined />} 
                onClick={() => handleEditContent(record.id)} 
                size="small"
              >
                Contenido
              </Button>
              <Popconfirm
                title="¿Eliminar esta noticia?"
                onConfirm={() => handleDelete(record.id)}
                okText="Sí"
                cancelText="No"
              >
                <Button 
                  icon={<DeleteOutlined />} 
                  danger 
                  size="small"
                >
                  Eliminar
                </Button>
              </Popconfirm>
              <Button 
                icon={<CommentOutlined />} 
                onClick={() => handleComment(record.id)}
                size="small"
              >
                Comentar
              </Button>
            </div>
          </div>
        );
      }
    },
    // Remove other columns as this will be the single column for mobile view
  ];

  const renderCategoryOptions = () => {
    return CATEGORIAS.map(([value, labelOrSubcats]) => {
      if (Array.isArray(labelOrSubcats)) {
        // This is a category with subcategories
        const [categoryLabel, subcategories] = [value, labelOrSubcats];
        return (
          <Select.OptGroup label={categoryLabel} key={categoryLabel}>
            {subcategories.map(([subValue, subLabel]) => (
              <Option key={subValue} value={subValue}>{subLabel}</Option>
            ))}
          </Select.OptGroup>
        );
      } else {
        // This is a standalone category
        return <Option key={value} value={value}>{labelOrSubcats}</Option>;
      }
    });
  };

  return (
    <div className="news-management-container">
      <Layout>
        <Layout.Header style={{ 
          padding: '0 20px', 
          background: '#fff', 
          display: 'flex', 
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <div className="header-section" style={{ 
            width: '100%', 
            display: 'flex', 
            justifyContent: 'space-between',
            flexDirection: isMobile ? 'column' : 'row',
            gap: '16px'
          }}>
            <Input 
              placeholder="Buscar por nombre de noticia..." 
              value={searchTerm} 
              onChange={handleSearch} 
              style={{ 
                width: isMobile ? '100%' : '300px', 
                marginBottom: isMobile ? '16px' : 0 
              }} 
            />
            <Button 
              type="primary" 
              icon={<PlusOutlined />} 
              onClick={() => showModal()} 
              block={isMobile}
              style={{ 
                width: isMobile ? '100%' : 'auto',
                marginBottom: isMobile ? '16px' : 0
              }}
            >
              Añadir Noticia
            </Button>
          </div>
        </Layout.Header>
        
        <Layout.Content style={{ padding: '20px' }}>
          <Table 
            columns={columns} 
            dataSource={filteredNews} 
            rowKey="id" 
            scroll={{ x: true }} 
            pagination={{
              responsive: true,
              showSizeChanger: !isMobile,
            }}
          />
        </Layout.Content>
      </Layout>

      <Modal
        title={editingId ? "Editar Noticia" : "Añadir Noticia"}
        open={isModalVisible}
        onOk={handleOk}
        onCancel={() => setIsModalVisible(false)}
        width={isMobile ? '95%' : 800}
        bodyStyle={{ 
          maxHeight: isMobile ? '80vh' : 'none',
          overflowY: 'auto'
        }}
      >
        <Form form={form} layout="vertical">
          <Form.Item 
            name="nombre_noticia" 
            label="Título" 
            rules={[{ required: true, message: '¡Por favor ingrese el título!' }]}
          >
            <Input />
          </Form.Item>

          <Form.Item name="autor" label="Autor" rules={[{ required: true, message: '¡Por favor seleccione un autor!' }]}>
            <Select
              showSearch
              placeholder="Seleccione un autor"
              filterOption={(input, option) =>
                option.children.toLowerCase().includes(input.toLowerCase())
              }
            >
              {editors.map(editor => (
                <Option key={editor.id} value={editor.id}>{`${editor.nombre} ${editor.apellido} (ID: ${editor.id})`}</Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item name="editor_en_jefe" label="Editor en Jefe">
            <Select
              showSearch
              placeholder="Seleccione un editor en jefe"
              filterOption={(input, option) =>
                option.children.toLowerCase().includes(input.toLowerCase())
              }
            >
              {editors.map(editor => (
                <Option key={editor.id} value={editor.id}>{`${editor.nombre} ${editor.apellido} (ID: ${editor.id})`}</Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item name="fecha_publicacion" label="Fecha de Publicación" rules={[{ required: true, message: '¡Por favor seleccione la fecha de publicación!' }]}>
            <DatePicker />
          </Form.Item>

          <Form.Item 
            name="categorias" 
            label="Categorías"
            rules={[{ required: true, message: '¡Por favor seleccione al menos una categoría!' }]}
          >
            <Select
              mode="multiple"
              placeholder="Seleccione categorías"
              style={{ width: '100%' }}
            >
              {renderCategoryOptions()}
            </Select>
          </Form.Item>

          <Form.Item name="solo_para_subscriptores" valuePropName="checked">
            <Checkbox>Solo para Suscriptores</Checkbox>
          </Form.Item>

          <Form.Item name="estado" label="Estado">
            <Select>
              {filteredPublicationStates.map(state => (
                <Option key={state.id} value={state.id}>{state.nombre_estado}</Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item name="Palabras_clave" label="Palabras clave (separe cada palabra clave por una coma ',' ej: Argentina,Ultima hora)">
            <TextArea rows={4} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default NewsManagement;