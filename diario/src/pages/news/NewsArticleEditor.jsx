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
  message,
  Space,
  Tag,
  Switch
} from 'antd';
import { 
  EditOutlined, 
  PlusOutlined, 
  DeleteOutlined, 
  CommentOutlined, 
  EyeOutlined, 
  ClearOutlined, 
  FilterOutlined,
  GlobalOutlined,
  UserOutlined
} from '@ant-design/icons';
import axios from 'axios';
import moment from 'moment';
import { useNavigate } from 'react-router-dom';
import './NewsManagement.css';
import api from '../context/axiosConfig';

const CACHE_KEYS = {
  NEWS: 'news_cache',
  ALL_NEWS: 'all_news_cache',
  EDITORS: 'editors_cache',
  PUBLICATION_STATES: 'publication_states_cache',
  CACHE_TIMESTAMP: 'cache_timestamp'
};

const CACHE_DURATION = 10 * 60 * 1000; // 10 minutos en milisegundos

const { Option } = Select;
const { TextArea } = Input;
const { useBreakpoint } = Grid;

const NewsManagement = () => {
  const [news, setNews] = useState([]);
  const [allNews, setAllNews] = useState([]);
  const [editors, setEditors] = useState([]);
  const [selectedStateFilter, setSelectedStateFilter] = useState(null);
  const [publicationStates, setPublicationStates] = useState([]);
  const [filteredPublicationStates, setFilteredPublicationStates] = useState([]);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [form] = Form.useForm();
  const [editingId, setEditingId] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [trabajadorId, setTrabajadorId] = useState(null);
  const [showAllNews, setShowAllNews] = useState(false); // Nuevo estado para controlar la vista
  const navigate = useNavigate();
  const screens = useBreakpoint();
  const [isMobile, setIsMobile] = useState(false);
  const [loading, setLoading] = useState(true);
  const [dataLoaded, setDataLoaded] = useState(false);

  // Detect mobile screen
  useEffect(() => {
    setIsMobile(screens.xs && !screens.sm);
  }, [screens]);

  // Función para verificar si el caché es válido
  const isCacheValid = (timestamp) => {
    if (!timestamp) return false;
    return Date.now() - parseInt(timestamp) < CACHE_DURATION;
  };

  // Función para guardar en caché
  const saveToCache = (key, data) => {
    try {
      localStorage.setItem(key, JSON.stringify(data));
      localStorage.setItem(CACHE_KEYS.CACHE_TIMESTAMP, Date.now().toString());
    } catch (error) {
      console.warn('Error saving to cache:', error);
    }
  };

  // Función para obtener del caché
  const getFromCache = (key) => {
    try {
      const cachedData = localStorage.getItem(key);
      const timestamp = localStorage.getItem(CACHE_KEYS.CACHE_TIMESTAMP);
      
      if (cachedData && isCacheValid(timestamp)) {
        return JSON.parse(cachedData);
      }
    } catch (error) {
      console.warn('Error reading from cache:', error);
    }
    return null;
  };

  // Función para borrar todo el caché del navegador
  const clearAllCache = async () => {
    try {
      Modal.confirm({
        title: '¿Borrar todo el caché?',
        content: 'Esta acción borrará todo el caché del navegador, incluyendo noticias, editores y estados. La página se recargará automáticamente.',
        okText: 'Sí, borrar todo',
        cancelText: 'Cancelar',
        onOk: async () => {
          try {
            // Borrar nuestro caché específico primero
            Object.values(CACHE_KEYS).forEach(key => {
              localStorage.removeItem(key);
            });
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
            setTimeout(() => {
              window.location.reload(true);
            }, 1000);
            
          } catch (error) {
            console.error('Error al borrar el caché:', error);
            message.error('Error al borrar el caché completo');
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
    verifyTrabajador();
    fetchEditors();
    fetchPublicationStates();
    
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
      setLoading(true);
      if (showAllNews) {
        fetchAllNews().finally(() => {
          setLoading(false);
        });
      } else {
        fetchNews().finally(() => {
          setLoading(false);
        });
      }
    }
  }, [trabajadorId, showAllNews]);

  const sortNewsByDate = (newsArray) => {
    return [...newsArray].sort((a, b) => {
      const dateA = moment(a.fecha_publicacion);
      const dateB = moment(b.fecha_publicacion);
      return dateB.valueOf() - dateA.valueOf();
    });
  };

  const fetchNews = (forceRefresh = false) => {
    if (dataLoaded && !forceRefresh) {
      return Promise.resolve();
    }

    const cachedNews = getFromCache(CACHE_KEYS.NEWS);
    
    if (cachedNews && Array.isArray(cachedNews) && !forceRefresh) {
      const filteredNews = cachedNews.filter(noticia => 
        noticia.autor === trabajadorId || 
        (Array.isArray(noticia.editores_en_jefe) && noticia.editores_en_jefe.includes(trabajadorId))
      );
      const sortedNews = sortNewsByDate(filteredNews);
      setNews(sortedNews);
      setDataLoaded(true);
      console.log('Noticias cargadas desde caché');
      return Promise.resolve();
    }

    return api.get('noticias/')
      .then(response => {
        saveToCache(CACHE_KEYS.NEWS, response.data);
        
        const filteredNews = response.data.filter(noticia => 
          noticia.autor === trabajadorId || 
          (Array.isArray(noticia.editores_en_jefe) && noticia.editores_en_jefe.includes(trabajadorId))
        );
        
        const sortedNews = sortNewsByDate(filteredNews);
        setNews(sortedNews);
        setDataLoaded(true);
        console.log('Noticias actualizadas desde API');
      })
      .catch(error => {
        console.error("Error al obtener noticias:", error);
        if (!cachedNews) {
          message.error("No se pudieron cargar las noticias");
        }
      });
  };

  // Nueva función para obtener todas las noticias
  const fetchAllNews = (forceRefresh = false) => {
    const cachedAllNews = getFromCache(CACHE_KEYS.ALL_NEWS);
    
    if (cachedAllNews && Array.isArray(cachedAllNews) && !forceRefresh) {
      const sortedNews = sortNewsByDate(cachedAllNews);
      setAllNews(sortedNews);
      console.log('Todas las noticias cargadas desde caché');
      return Promise.resolve();
    }

    return api.get('noticias/')
      .then(response => {
        saveToCache(CACHE_KEYS.ALL_NEWS, response.data);
        const sortedNews = sortNewsByDate(response.data);
        setAllNews(sortedNews);
        console.log('Todas las noticias actualizadas desde API');
      })
      .catch(error => {
        console.error("Error al obtener todas las noticias:", error);
        if (!cachedAllNews) {
          message.error("No se pudieron cargar todas las noticias");
        }
      });
  };

  // Nueva función para manejar el filtro por estado
  const handleStateFilter = (stateId) => {
    setSelectedStateFilter(stateId);
    console.log('Filtering by state ID:', stateId);
  };

  // Función para limpiar filtros
  const clearFilters = () => {
    setSelectedStateFilter(null);
    setSearchTerm('');
  };

  const getStateColor = (stateName) => {
    const colorMap = {
      'publicado': 'green',
      'borrador': 'orange',
      'en_revision': 'blue',
      'rechazado': 'red',
      'programado': 'purple',
      'archivado': 'gray'
    };
    return colorMap[stateName?.toLowerCase()] || 'default';
  };
  
  // Función para contar noticias por estado
  const getNewsCountByState = (stateId) => {
    const currentNewsArray = showAllNews ? allNews : news;
    return currentNewsArray.filter(record => record.estado === stateId).length;
  };

  const fetchEditors = () => {
    const cachedEditors = getFromCache(CACHE_KEYS.EDITORS);
    if (cachedEditors && Array.isArray(cachedEditors)) {
      setEditors(cachedEditors);
      console.log('Editores cargados desde caché');
    }

    api.get('trabajadores/')
      .then(response => {
        saveToCache(CACHE_KEYS.EDITORS, response.data);
        setEditors(response.data);
        console.log('Editores actualizados desde API');
      })
      .catch(error => {
        console.error("Error al obtener editores:", error);
        if (!cachedEditors) {
          message.error("No se pudieron cargar los editores");
        }
      });
  };

  const fetchPublicationStates = () => {
    const cachedStates = getFromCache(CACHE_KEYS.PUBLICATION_STATES);
    if (cachedStates && Array.isArray(cachedStates)) {
      setPublicationStates(cachedStates);
      console.log('Estados cargados desde caché');
    }

    api.get('estados-publicacion/')
      .then(response => {
        saveToCache(CACHE_KEYS.PUBLICATION_STATES, response.data);
        setPublicationStates(response.data);
        console.log('Estados actualizados desde API');
      })
      .catch(error => {
        console.error("Error al obtener estados de publicación:", error);
        if (!cachedStates) {
          message.error("No se pudieron cargar los estados");
        }
      });
  };

  const invalidateNewsCache = () => {
    localStorage.removeItem(CACHE_KEYS.NEWS);
    localStorage.removeItem(CACHE_KEYS.ALL_NEWS);
    console.log('Caché de noticias invalidado');
  };

  const verifyTrabajador = () => {
    const accessToken = localStorage.getItem('access');
    if (!accessToken) {
      navigate('/login');
      return;
    }

    const storedTrabajadorId = localStorage.getItem('trabajadorId');
    if (storedTrabajadorId && parseInt(storedTrabajadorId) > 0) {
      setTrabajadorId(parseInt(storedTrabajadorId));
    } else {
      api.get('user-profile/', {
        headers: { 'Authorization': `Bearer ${accessToken}` },
      }).then(response => {
        console.log("Perfil recibido:", response.data);
        
        api.get('trabajadores/')
          .then(trabajadoresResponse => {
            const trabajador = trabajadoresResponse.data.find(
              t => t.nombre === response.data.nombre && t.apellido === response.data.apellido
            );
            
            if (trabajador && trabajador.id > 0) {
              console.log("Trabajador encontrado:", trabajador);
              setTrabajadorId(trabajador.id);
              localStorage.setItem('trabajadorId', trabajador.id.toString());
            } else {
              console.error("No se encontró un trabajador válido asociado a este perfil");
              message.error("No tiene permisos para acceder a esta página");
              navigate('/login');
            }
          })
          .catch(error => {
            console.error("Error al obtener trabajadores:", error);
            navigate('/login');
          });
      }).catch(error => {
        console.error("Error al verificar el perfil:", error);
        navigate('/login');
      });
    }
  };

  // Función para verificar si el usuario puede editar una noticia
  const canEditNews = (record) => {
    return record.autor === trabajadorId || 
           (Array.isArray(record.editores_en_jefe) && record.editores_en_jefe.includes(trabajadorId));
  };

  // Función para ordenar editores con el ID 6 primero
  const getSortedEditors = () => {
    return [...editors].sort((a, b) => {
      if (a.id === 6) return -1;
      if (b.id === 6) return 1;
      if (a.id === 4) return -1;
      if (b.id === 4) return 1;
      return `${a.nombre} ${a.apellido}`.localeCompare(`${b.nombre} ${b.apellido}`);
    });
  };

  const showModal = (record = null) => {
    if (record) {
      // Si estamos en vista "todas las noticias" y el usuario no puede editar, no mostrar modal
      if (showAllNews && !canEditNews(record)) {
        message.warning('No tienes permisos para editar esta noticia');
        return;
      }

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

      if (canEditNews(record)) {
        setFilteredPublicationStates(publicationStates);
      } else {
        setFilteredPublicationStates([]);
      }
    } else {
      form.resetFields();
      form.setFieldsValue({
        autor: trabajadorId,
        editores_en_jefe: [6, 4]
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
      
      if (!Array.isArray(values.editores_en_jefe)) {
        values.editores_en_jefe = values.editores_en_jefe ? [values.editores_en_jefe] : [];
      }
      
      const noticiaEditada = {
        nombre_noticia: values.nombre_noticia,
        fecha_publicacion: values.fecha_publicacion.format('YYYY-MM-DD'),
        categorias: values.categorias.join(','),
        Palabras_clave: values.Palabras_clave || '',
        autor: parseInt(values.autor, 10),
        editores_en_jefe: values.editores_en_jefe,
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

      const endpoint = editingId 
        ? `noticias/${editingId}/`
        : 'noticias/';
      
      const method = editingId ? 'put' : 'post';

      api[method](endpoint, noticiaEditada)
        .then(response => {
          invalidateNewsCache();
          
          if (editingId) {
            // Actualizar en ambos arrays si existe la noticia
            setNews(prevNews => 
              prevNews.map(noticia => 
                noticia.id === editingId 
                  ? { ...noticia, ...response.data }
                  : noticia
              )
            );
            setAllNews(prevAllNews => 
              prevAllNews.map(noticia => 
                noticia.id === editingId 
                  ? { ...noticia, ...response.data }
                  : noticia
              )
            );
          } else {
            // Agregar nueva noticia a ambos arrays
            setNews(prevNews => sortNewsByDate([...prevNews, response.data]));
            setAllNews(prevAllNews => sortNewsByDate([...prevAllNews, response.data]));
          }
          
          message.success(editingId ? 'Noticia actualizada' : 'Noticia creada');
          setIsModalVisible(false);
        })
        .catch(error => {
          console.error('Error:', error);
          message.error('Error al guardar la noticia');
          setIsModalVisible(false);
        });
    });
  };

  const handleDelete = (id) => {
    api.delete(`noticias/${id}/`)
      .then(() => {
        invalidateNewsCache();
        
        setNews(prevNews => prevNews.filter(noticia => noticia.id !== id));
        setAllNews(prevAllNews => prevAllNews.filter(noticia => noticia.id !== id));
        
        message.success("Noticia eliminada con éxito");
      })
      .catch(error => {
        console.error("Error al eliminar la noticia:", error);
        message.error("Error al eliminar la noticia");
        // Recargar noticias en caso de error
        if (showAllNews) {
          fetchAllNews();
        } else {
          fetchNews();
        }
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

  const generateNewsUrl = (newsItem) => {
    if (newsItem.slug) {
      return `/noticia/${newsItem.id}-${newsItem.slug}`;
    }
    return `/noticia/${newsItem.id}`;
  };

  const handlePreview = (record) => {
    const previewUrl = generateNewsUrl(record);
    navigate(previewUrl);
    console.log('Navigating to preview for news ID:', record.id);
  };

  // Función para cambiar entre vista personal y vista de todas las noticias
  const toggleNewsView = (showAll) => {
    setShowAllNews(showAll);
    setSelectedStateFilter(null); // Limpiar filtros al cambiar vista
    setSearchTerm(''); // Limpiar búsqueda al cambiar vista
    console.log('Vista cambiada a:', showAll ? 'Todas las noticias' : 'Mis noticias');
  };

  // Determinar qué array de noticias usar basado en la vista actual
  const currentNewsArray = showAllNews ? allNews : news;
  
  const filteredNews = currentNewsArray.filter(record => {
    const matchesSearch = record.nombre_noticia.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesState = selectedStateFilter === null || record.estado === selectedStateFilter;
    return matchesSearch && matchesState;
  });
  
  console.log('Filtered News:', filteredNews);

  const columns = [
    { 
      title: 'Detalles de la Noticia', 
      dataIndex: 'nombre_noticia', 
      key: 'nombre_noticia',
      render: (text, record) => {
        const authorObj = editors.find(editor => editor.id === record.autor);
        
        const editorObjs = Array.isArray(record.editores_en_jefe) 
          ? record.editores_en_jefe.map(editorId => 
              editors.find(editor => editor.id === editorId)
            ).filter(Boolean)
          : [];
        
        const currentState = publicationStates.find(state => state.id === record.estado);
        const userCanEdit = canEditNews(record);
        
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
              {showAllNews && !userCanEdit && (
                <Tag color="orange" style={{ marginLeft: 'auto' }}>
                  Solo lectura
                </Tag>
              )}
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
              <Tag color={getStateColor(currentState?.nombre_estado)}>
                {currentState?.nombre_estado || 'Unknown'}
              </Tag>
            </div>
  
            <div style={{ 
              display: 'flex', 
              flexWrap: 'wrap',
              gap: '8px', 
              width: '100%', 
              marginTop: '12px' 
            }}>
              {userCanEdit && (
                <Button 
                  icon={<EditOutlined />} 
                  onClick={() => showModal(record)} 
                  size="small"
                >
                  Editar
                </Button>
              )}
              {userCanEdit && (
                <Button 
                  icon={<EditOutlined />} 
                  onClick={() => handleEditContent(record.id)} 
                  size="small"
                >
                  Contenido
                </Button>
              )}
              <Button 
                icon={<EyeOutlined />} 
                onClick={() => handlePreview(record)} 
                size="small"
                type="default"
              >
                Vista Previa
              </Button>
              {userCanEdit && (
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
              )}
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
  ];

  const renderCategoryOptions = () => {
    return CATEGORIAS.map(([value, labelOrSubcats]) => {
      if (Array.isArray(labelOrSubcats)) {
        const [categoryLabel, subcategories] = [value, labelOrSubcats];
        return (
          <Select.OptGroup label={categoryLabel} key={categoryLabel}>
            {subcategories.map(([subValue, subLabel]) => (
              <Option key={subValue} value={subValue}>{subLabel}</Option>
            ))}
          </Select.OptGroup>
        );
      } else {
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
            <div style={{
              display: 'flex',
              gap: '12px',
              alignItems: 'center',
              flexDirection: isMobile ? 'column' : 'row',
              width: isMobile ? '100%' : 'auto'
            }}>
              <Input 
                placeholder="Buscar por nombre de noticia..." 
                value={searchTerm} 
                onChange={handleSearch} 
                style={{ 
                  width: isMobile ? '100%' : '300px'
                }} 
              />
              
              {/* Toggle para cambiar entre vistas */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '4px 8px',
                border: '1px solid #d9d9d9',
                borderRadius: '6px',
                background: '#fafafa'
              }}>
                <UserOutlined style={{ color: showAllNews ? '#999' : '#1890ff' }} />
                <Switch
                  checked={showAllNews}
                  onChange={toggleNewsView}
                  size="small"
                />
                <GlobalOutlined style={{ color: showAllNews ? '#1890ff' : '#999' }} />
                <span style={{ 
                  fontSize: '12px', 
                  fontWeight: '500',
                  color: showAllNews ? '#1890ff' : '#666'
                }}>
                  {showAllNews ? 'Todas' : 'Mis noticias'}
                </span>
              </div>
            </div>
            
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
        
        <div style={{ 
          padding: '16px 20px', 
          background: '#f5f5f5', 
          borderBottom: '1px solid #d9d9d9' 
        }}>
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '12px',
            flexWrap: 'wrap'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <FilterOutlined />
              <strong>Filtrar por estado:</strong>
            </div>
            
            <Space wrap>
              <Button
                type={selectedStateFilter === null ? 'primary' : 'default'}
                onClick={() => setSelectedStateFilter(null)}
                size="small"
              >
                Todos ({currentNewsArray.length})
              </Button>
              
              {publicationStates.map(state => (
                <Button
                  key={state.id}
                  type={selectedStateFilter === state.id ? 'primary' : 'default'}
                  onClick={() => handleStateFilter(state.id)}
                  size="small"
                  style={{ 
                    borderColor: getStateColor(state.nombre_estado) === 'default' ? undefined : getStateColor(state.nombre_estado),
                    color: selectedStateFilter === state.id ? 'black' : getStateColor(state.nombre_estado)
                  }}
                >
                  {state.nombre_estado.charAt(0).toUpperCase() + state.nombre_estado.slice(1)} 
                  ({getNewsCountByState(state.id)})
                </Button>
              ))}
            </Space>
          </div>
          
          {/* Indicador de vista actual */}
          <div style={{
            marginTop: '12px',
            padding: '8px 12px',
            background: showAllNews ? '#e6f7ff' : '#f6ffed',
            border: `1px solid ${showAllNews ? '#91d5ff' : '#b7eb8f'}`,
            borderRadius: '4px',
            fontSize: '13px',
            fontWeight: '500'
          }}>
            {showAllNews ? (
              <span style={{ color: '#1890ff' }}>
                Mostrando todas las noticias del sistema ({allNews.length} total)
                {filteredNews.length !== allNews.length && ` - ${filteredNews.length} filtradas`}
              </span>
            ) : (
              <span style={{ color: '#52c41a' }}>
                Mostrando solo tus noticias ({news.length} total)
                {filteredNews.length !== news.length && ` - ${filteredNews.length} filtradas`}
              </span>
            )}
          </div>
        </div>

        <Layout.Content style={{ padding: '20px' }}>
          <Table 
            columns={columns} 
            dataSource={filteredNews} 
            rowKey="id" 
            scroll={{ x: true }} 
            pagination={{
              responsive: true,
              showSizeChanger: !isMobile,
              showTotal: (total, range) => 
                `${range[0]}-${range[1]} de ${total} noticias`
            }}
            loading={loading}
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

          <Form.Item 
            name="Palabras_clave" 
            label="Categorias (separe cada categoría por una coma ',' y usar guion bajo '_' para separar las palabras en lugar del espacio. Ejemplo: Argentina,Javier_Milei,Opinión)"
            rules={[{ required: true, message: '¡Por favor seleccione al menos una Categoria!' }]}
          >
            <TextArea rows={4} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default NewsManagement;