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
import { EditOutlined, PlusOutlined, DeleteOutlined, CommentOutlined, EyeOutlined, ClearOutlined } from '@ant-design/icons';
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
  const navigate = useNavigate();
  const screens = useBreakpoint();
  const [isMobile, setIsMobile] = useState(false);

  // Detect mobile screen
  useEffect(() => {
    setIsMobile(screens.xs && !screens.sm);
  }, [screens]);

  // Función para borrar todo el caché del navegador
  const clearAllCache = async () => {
    try {
      // Mostrar confirmación
      Modal.confirm({
        title: '¿Borrar todo el caché?',
        content: 'Esta acción borrará todo el caché del navegador, cookies, localStorage, sessionStorage y datos almacenados. La página se recargará automáticamente.',
        okText: 'Sí, borrar todo',
        cancelText: 'Cancelar',
        onOk: async () => {
          try {
            // Borrar localStorage
            localStorage.clear();
            
            // Borrar sessionStorage
            sessionStorage.clear();
            
            // Borrar cookies (todas las del dominio actual)
            document.cookie.split(";").forEach(function(c) { 
              document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/"); 
            });
            
            // Borrar IndexedDB si está disponible
            if ('indexedDB' in window) {
              try {
                // Obtener todas las bases de datos y borrarlas
                if (indexedDB.databases) {
                  const databases = await indexedDB.databases();
                  await Promise.all(
                    databases.map(db => {
                      return new Promise((resolve, reject) => {
                        const deleteReq = indexedDB.deleteDatabase(db.name);
                        deleteReq.onsuccess = () => resolve();
                        deleteReq.onerror = () => reject(deleteReq.error);
                      });
                    })
                  );
                }
              } catch (error) {
                console.log('Error al borrar IndexedDB:', error);
              }
            }
            
            // Borrar WebSQL si está disponible (obsoleto pero por compatibilidad)
            if ('webkitStorageInfo' in window) {
              try {
                webkitStorageInfo.requestQuota(
                  webkitStorageInfo.TEMPORARY, 
                  0, 
                  function() {}, 
                  function() {}
                );
              } catch (error) {
                console.log('Error al borrar WebSQL:', error);
              }
            }
            
            // Borrar Application Cache si está disponible (obsoleto)
            if ('applicationCache' in window) {
              try {
                window.applicationCache.update();
              } catch (error) {
                console.log('Error al actualizar Application Cache:', error);
              }
            }
            
            // Borrar Service Workers si están disponibles
            if ('serviceWorker' in navigator) {
              try {
                const registrations = await navigator.serviceWorker.getRegistrations();
                await Promise.all(
                  registrations.map(registration => registration.unregister())
                );
              } catch (error) {
                console.log('Error al borrar Service Workers:', error);
              }
            }
            
            // Borrar Cache API si está disponible
            if ('caches' in window) {
              try {
                const cacheNames = await caches.keys();
                await Promise.all(
                  cacheNames.map(cacheName => caches.delete(cacheName))
                );
              } catch (error) {
                console.log('Error al borrar Cache API:', error);
              }
            }
            
            message.success('Caché borrado exitosamente. Recargando página...');
            
            // Recargar la página después de un breve delay
            setTimeout(() => {
              window.location.reload(true); // true fuerza la recarga desde el servidor
            }, 1000);
            
          } catch (error) {
            console.error('Error al borrar el caché:', error);
            message.error('Error al borrar el caché completo, pero se borró lo que fue posible');
            
            // Intentar recargar de todas formas
            setTimeout(() => {
              window.location.reload(true);
            }, 1000);
          }
        }
      });
    } catch (error) {
      console.error('Error en clearAllCache:', error);
      message.error('Error al intentar borrar el caché');
    }
  };
  
  const CATEGORIAS = [
    ['Politica', [
      ['legislativos', 'Legislativos'],
      ['policiales', 'Policiales'],
      ['elecciones', 'Elecciones'],
      ['gobierno', 'Gobierno'],
      ['provincias', 'Provincias'],
      ['capital', 'Capital'],
      ['nacion', 'Nacion'],
    ]],
    ['Cultura', [
      ['cine', 'Cine'],
      ['literatura', 'Literatura'],
      ['salud', 'Salud'],
      ['tecnologia', 'Tecnologia'],
      ['eventos', 'Eventos'],
      ['educacion', 'Educacion'],
      ['efemerides', 'Efemerides'],
      ['deporte', 'Deporte'],
    ]],
    ['Economia', [
      ['finanzas', 'Finanzas'],
      ['comercio_internacional', 'Comercio internacional'],
      ['politica_economica', 'Politica economica'],
      ['pobreza_e_inflacion', 'Pobreza e inflacion'],
      ['dolar', 'Dolar'],
    ]],
    ['Mundo', [
      ['estados_unidos', 'Estados Unidos'],
      ['argentina', 'Argentina'],
      ['asia', 'Asia'],
      ['medio_oriente', 'Medio Oriente'],
      ['internacional', 'Internacional'],
      ['latinoamerica', 'Latinoamerica'],
    ]],
    ['Tipos de notas', [
      ['de_analisis', 'De analisis'],
      ['de_opinion', 'De opinion'],
      ['informativas', 'Informativas'],
      ['entrevistas', 'Entrevistas'],
    ]]
  ];
  
  useEffect(() => {
    fetchEditors();
    fetchPublicationStates();
    verifyTrabajador();
    
    const handleKeyDown = (event) => {
      if (event.key === 'F12') {
        console.log('ID del trabajador:', trabajadorId);
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
        // Filtra noticias donde el usuario es autor o está en el array de editores_en_jefe
        const filteredNews = response.data.filter(noticia => 
          noticia.autor === trabajadorId || 
          (Array.isArray(noticia.editores_en_jefe) && noticia.editores_en_jefe.includes(trabajadorId))
        );
        
        console.log(`Filtrando noticias para trabajador ID: ${trabajadorId}`);
        filteredNews.forEach(noticia => {
          console.log(`Noticia: ${noticia.nombre_noticia} - ID Autor: ${noticia.autor}, IDs Editores: ${JSON.stringify(noticia.editores_en_jefe)}, Fecha: ${noticia.fecha_publicacion}`);
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

  // Función para ordenar editores con el ID 6 primero
  const getSortedEditors = () => {
  return [...editors].sort((a, b) => {
    // Si 'a' tiene ID 6, va primero
    if (a.id === 6) return -1;
    // Si 'b' tiene ID 6, va primero
    if (b.id === 6) return 1;
    // Si 'a' tiene ID 4, va segundo (después del 6)
    if (a.id === 4) return -1;
    // Si 'b' tiene ID 4, va segundo (después del 6)
    if (b.id === 4) return 1;
    // Para el resto, mantener orden alfabético por nombre
    return `${a.nombre} ${a.apellido}`.localeCompare(`${b.nombre} ${b.apellido}`);
  });
};

  const showModal = (record = null) => {
  if (record) {
    // Convertir editores_en_jefe a array si no lo es
    const editoresEnJefe = Array.isArray(record.editores_en_jefe) 
      ? record.editores_en_jefe 
      : (record.editores_en_jefe ? [record.editores_en_jefe] : []);
    
    form.setFieldsValue({
      ...record,
      fecha_publicacion: moment(record.fecha_publicacion),
      solo_para_subscriptores: record.solo_para_subscriptores || false,
      Palabras_clave: record.Palabras_clave || '',
      categorias: record.categorias || [],
      editores_en_jefe: editoresEnJefe,
      estado: record.estado ? parseInt(record.estado, 10) : undefined,
    });
    setEditingId(record.id);

    // Actualiza la condición para verificar si el usuario actual está entre los editores
    if (
      trabajadorId === record.autor || 
      (Array.isArray(record.editores_en_jefe) && record.editores_en_jefe.includes(trabajadorId))
    ) {
      setFilteredPublicationStates(publicationStates);
    } else {
      setFilteredPublicationStates([]);
    }
  } else {
    form.resetFields();
    // Si es una nueva noticia, establecer el autor como el trabajador actual
    // y agregar automáticamente el ID 6 e ID 4 como editores
    form.setFieldsValue({
      autor: trabajadorId,
      editores_en_jefe: [6, 4] // Inicializar con los IDs 6 y 4 automáticamente
    });
    setEditingId(null);
    setFilteredPublicationStates(publicationStates.filter(state => state.nombre_estado !== 'publicado'));
  }
  setIsModalVisible(true);
};

  const handleOk = () => {
    form.validateFields().then(values => {
      if (!Array.isArray(values.categorias)) {
        values.categorias = values.categorias ? [values.categorias] : [];
      }
      
      // Asegúrate de que los editores_en_jefe sean un array
      if (!Array.isArray(values.editores_en_jefe)) {
        values.editores_en_jefe = values.editores_en_jefe ? [values.editores_en_jefe] : [];
      }
      
      
      
      const noticiaEditada = {
        nombre_noticia: values.nombre_noticia,
        fecha_publicacion: values.fecha_publicacion.format('YYYY-MM-DD'),
        categorias: values.categorias.join(','),
        Palabras_clave: values.Palabras_clave || '',
        autor: parseInt(values.autor, 10),
        editores_en_jefe: values.editores_en_jefe, // Enviar como array (ya incluye ID 6)
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
          .finally(() => {
            setIsModalVisible(false);
            setTimeout(() => {
              window.location = window.location;
            }, 100);
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

  // Nueva función para generar la URL de vista previa (similar a TagPage)
  const generateNewsUrl = (newsItem) => {
    // Si existe un slug en el objeto de noticia, usarlo
    if (newsItem.slug) {
      return `/noticia/${newsItem.id}-${newsItem.slug}`;
    }
    // Si no hay slug, usamos solo el ID como fallback
    return `/noticia/${newsItem.id}`;
  };

  // Nueva función para manejar la vista previa
  const handlePreview = (record) => {
    const previewUrl = generateNewsUrl(record);
    navigate(previewUrl);
    console.log('Navigating to preview for news ID:', record.id);
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
        
        // Obtener todos los objetos de editores en lugar de solo uno
        const editorObjs = Array.isArray(record.editores_en_jefe) 
          ? record.editores_en_jefe.map(editorId => 
              editors.find(editor => editor.id === editorId)
            ).filter(Boolean) // Filtrar para eliminar posibles undefined
          : [];
        
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
              alignItems: 'flex-start',
              gap: '10px'
            }}>
              <strong>Editores:</strong>
              <div>
                {editorObjs.length > 0 
                  ? editorObjs.map(editor => 
                      `${editor.nombre} ${editor.apellido} (ID: ${editor.id})`
                    ).join(', ')
                  : 'Ninguno asignado'}
              </div>
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
              <Button 
                icon={<EyeOutlined />} 
                onClick={() => handlePreview(record)} 
                size="small"
                type="default"
              >
                Vista Previa
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
            <div style={{
              display: 'flex',
              gap: '8px',
              flexDirection: isMobile ? 'column' : 'row',
              width: isMobile ? '100%' : 'auto'
            }}>
              <Button 
                type="primary" 
                icon={<PlusOutlined />} 
                onClick={() => showModal()} 
                block={isMobile}
                style={{ 
                  width: isMobile ? '100%' : 'auto',
                  marginBottom: isMobile ? '8px' : 0
                }}
              >
                Añadir Noticia
              </Button>
              <Button 
                type="default" 
                icon={<ClearOutlined />} 
                onClick={clearAllCache}
                danger
                block={isMobile}
                style={{ 
                  width: isMobile ? '100%' : 'auto',
                  marginBottom: isMobile ? '8px' : 0
                }}
              >
                Borrar Caché
              </Button>
            </div>
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

          <Form.Item 
            name="autor" 
            label="Autor" 
            rules={[{ required: true, message: '¡Por favor seleccione un autor!' }]}
          >
            <Select
              showSearch
              placeholder="Seleccione un autor"
              filterOption={(input, option) =>
                option.children.toLowerCase().includes(input.toLowerCase())
              }
            >
              {getSortedEditors().map(editor => (
                <Option key={editor.id} value={editor.id}>{`${editor.nombre} ${editor.apellido} (ID: ${editor.id})`}</Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item 
            name="editores_en_jefe" 
            label="Editores"
            rules={[{ required: true, message: '¡Por favor seleccione al menos un editor!' }]}
          >
            <Select
              mode="multiple"
              showSearch
              placeholder="Seleccione editores"
              filterOption={(input, option) =>
                option.children.toLowerCase().includes(input.toLowerCase())
              }
            >
              {getSortedEditors().map(editor => (
                <Option key={editor.id} value={editor.id}>{`${editor.nombre} ${editor.apellido} (ID: ${editor.id})`}</Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item 
            name="fecha_publicacion" 
            label="Fecha de Publicación" 
            rules={[{ required: true, message: '¡Por favor seleccione la fecha de publicación!' }]}
          >
            <DatePicker />
          </Form.Item>

          <Form.Item 
            name="categorias" 
            label="Secciones" 
            rules={[{ required: true, message: '¡Por favor seleccione al menos una sección!' }]}
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

          <Form.Item 
          name="estado" 
          label="Estado"
          rules={[{ required: true, message: '¡Por favor seleccione un estado!' }]}
          >
            <Select>
              {filteredPublicationStates.map(state => (
                <Option key={state.id} value={state.id}>{state.nombre_estado}</Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item name="Palabras_clave" label="Categorias (separe cada categoría por una coma ',' y usar guion bajo '_' para separar las palabras en lugar del espacio. Ejemplo: Argentina,Javier_Milei,Opinión)"
          rules={[{ required: true, message: '¡Por favor seleccione al menos una Categoria!' }]} //las Categorias en realidad son Palabras_clave en el backend
          >
            <TextArea rows={4} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default NewsManagement;