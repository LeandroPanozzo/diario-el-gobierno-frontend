import { useState, useEffect, useCallback, useMemo, memo, lazy, Suspense } from 'react';
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
  Switch,
  Spin
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

const CACHE_DURATION = 10 * 60 * 1000;
const INITIAL_PAGE_SIZE = 10;
const MAX_PAGE_SIZE = 50;
const DEBOUNCE_DELAY = 300;

const { Option } = Select;
const { TextArea } = Input;
const { useBreakpoint } = Grid;

// Categorías constantes (no necesitan recrearse)
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

// Mapa de colores constante
const STATE_COLOR_MAP = {
  'publicado': 'green',
  'borrador': 'orange',
  'en_revision': 'blue',
  'rechazado': 'red',
  'programado': 'purple',
  'archivado': 'gray'
};

// Componente memoizado para los botones de acción
const ActionButtons = memo(({ 
  record, 
  userCanEdit, 
  showModal, 
  handleEditContent, 
  handlePreview, 
  handleDelete,
  handleComment 
}) => (
  <div style={{ 
    display: 'flex', 
    flexWrap: 'wrap',
    gap: '8px', 
    width: '100%', 
    marginTop: '12px' 
  }}>
    {userCanEdit && (
      <>
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
      </>
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
));

ActionButtons.displayName = 'ActionButtons';

// Componente memoizado para los detalles de la noticia
const NewsDetails = memo(({ 
  text, 
  record, 
  editors, 
  publicationStates,
  canEditNews,
  showAllNews,
  getStateColor,
  showModal,
  handleEditContent,
  handlePreview,
  handleDelete,
  handleComment
}) => {
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

      <ActionButtons
        record={record}
        userCanEdit={userCanEdit}
        showModal={showModal}
        handleEditContent={handleEditContent}
        handlePreview={handlePreview}
        handleDelete={handleDelete}
        handleComment={handleComment}
      />
    </div>
  );
});

NewsDetails.displayName = 'NewsDetails';

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
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  const [trabajadorId, setTrabajadorId] = useState(null);
  const [showAllNews, setShowAllNews] = useState(false);
  const [loading, setLoading] = useState(true);
  const [dataLoaded, setDataLoaded] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(INITIAL_PAGE_SIZE);
  const [totalCount, setTotalCount] = useState(0);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);

  const navigate = useNavigate();
  const screens = useBreakpoint();
  const isMobile = useMemo(() => screens.xs && !screens.sm, [screens.xs, screens.sm]);

  // Debounce del término de búsqueda
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, DEBOUNCE_DELAY);

    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Funciones de caché optimizadas
  const isCacheValid = useCallback((timestamp) => {
    if (!timestamp) return false;
    return Date.now() - parseInt(timestamp) < CACHE_DURATION;
  }, []);

  const saveToCache = useCallback((key, data) => {
    try {
      localStorage.setItem(key, JSON.stringify(data));
      localStorage.setItem(CACHE_KEYS.CACHE_TIMESTAMP, Date.now().toString());
    } catch (error) {
      console.warn('Error saving to cache:', error);
    }
  }, []);

  const getFromCache = useCallback((key) => {
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
  }, [isCacheValid]);

  const sortNewsByDate = useCallback((newsArray) => {
    return [...newsArray].sort((a, b) => {
      const dateA = moment(a.fecha_publicacion);
      const dateB = moment(b.fecha_publicacion);
      return dateB.valueOf() - dateA.valueOf();
    });
  }, []);

  const invalidateNewsCache = useCallback(() => {
    localStorage.removeItem(CACHE_KEYS.NEWS);
    localStorage.removeItem(CACHE_KEYS.ALL_NEWS);
    console.log('Caché de noticias invalidado');
  }, []);

  const fetchPaginatedNews = useCallback(async (page = 1, size = INITIAL_PAGE_SIZE, reset = false) => {
    try {
      if (reset) {
        setLoading(true);
        setCurrentPage(1);
        setNews([]);
        setAllNews([]);
      } else {
        setLoadingMore(true);
      }

      if (page === 1 && !reset) {
        const cacheKey = showAllNews ? CACHE_KEYS.ALL_NEWS : CACHE_KEYS.NEWS;
        const cachedNews = getFromCache(cacheKey);
        
        if (cachedNews && Array.isArray(cachedNews)) {
          const sortedNews = sortNewsByDate(cachedNews);
          const paginatedNews = sortedNews.slice(0, size);
          
          if (showAllNews) {
            setAllNews(paginatedNews);
          } else {
            const filteredNews = cachedNews.filter(noticia => 
              noticia.autor === trabajadorId || 
              (Array.isArray(noticia.editores_en_jefe) && noticia.editores_en_jefe.includes(trabajadorId))
            );
            const sortedFilteredNews = sortNewsByDate(filteredNews);
            setNews(sortedFilteredNews.slice(0, size));
          }
          
          setTotalCount(cachedNews.length);
          setHasMore(cachedNews.length > size);
          setLoading(false);
          setLoadingMore(false);
          console.log('Noticias cargadas desde caché (paginadas)');
          return;
        }
      }

      const response = await api.get(`noticias/?page=${page}&page_size=${size}`);
      
      let newNews = response.data.results || response.data;
      const total = response.data.count || newNews.length;

      if (!showAllNews) {
        newNews = newNews.filter(noticia => 
          noticia.autor === trabajadorId || 
          (Array.isArray(noticia.editores_en_jefe) && noticia.editores_en_jefe.includes(trabajadorId))
        );
      }

      const sortedNews = sortNewsByDate(newNews);

      if (page === 1 || reset) {
        if (showAllNews) {
          setAllNews(sortedNews);
          saveToCache(CACHE_KEYS.ALL_NEWS, sortedNews);
        } else {
          setNews(sortedNews);
          saveToCache(CACHE_KEYS.NEWS, sortedNews);
        }
      } else {
        if (showAllNews) {
          setAllNews(prevNews => {
            const combined = [...prevNews, ...sortedNews];
            const unique = combined.filter((news, index, self) => 
              index === self.findIndex(n => n.id === news.id)
            );
            return sortNewsByDate(unique);
          });
        } else {
          setNews(prevNews => {
            const combined = [...prevNews, ...sortedNews];
            const unique = combined.filter((news, index, self) => 
              index === self.findIndex(n => n.id === news.id)
            );
            return sortNewsByDate(unique);
          });
        }
      }

      setTotalCount(total);
      setHasMore(newNews.length === size);
      setCurrentPage(page);

    } catch (error) {
      console.error("Error al obtener noticias:", error);
      message.error("Error al cargar las noticias");
    } finally {
      setLoading(false);
      setLoadingMore(false);
      setDataLoaded(true);
    }
  }, [trabajadorId, showAllNews, sortNewsByDate, getFromCache, saveToCache]);

  const loadMoreNews = useCallback(() => {
    if (!loadingMore && hasMore) {
      const nextPage = currentPage + 1;
      fetchPaginatedNews(nextPage, pageSize);
    }
  }, [currentPage, pageSize, loadingMore, hasMore, fetchPaginatedNews]);

  const fetchEditors = useCallback(async () => {
    const cachedEditors = getFromCache(CACHE_KEYS.EDITORS);
    if (cachedEditors && Array.isArray(cachedEditors)) {
      setEditors(cachedEditors);
      console.log('Editores cargados desde caché');
    }

    try {
      const response = await api.get('trabajadores/');
      saveToCache(CACHE_KEYS.EDITORS, response.data);
      setEditors(response.data);
      console.log('Editores actualizados desde API');
    } catch (error) {
      console.error("Error al obtener editores:", error);
      if (!cachedEditors) {
        message.error("No se pudieron cargar los editores");
      }
    }
  }, [getFromCache, saveToCache]);

  const fetchPublicationStates = useCallback(async () => {
    const cachedStates = getFromCache(CACHE_KEYS.PUBLICATION_STATES);
    if (cachedStates && Array.isArray(cachedStates)) {
      setPublicationStates(cachedStates);
      console.log('Estados cargados desde caché');
    }

    try {
      const response = await api.get('estados-publicacion/');
      saveToCache(CACHE_KEYS.PUBLICATION_STATES, response.data);
      setPublicationStates(response.data);
      console.log('Estados actualizados desde API');
    } catch (error) {
      console.error("Error al obtener estados de publicación:", error);
      if (!cachedStates) {
        message.error("No se pudieron cargar los estados");
      }
    }
  }, [getFromCache, saveToCache]);

  const verifyTrabajador = useCallback(() => {
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
  }, [navigate]);

  useEffect(() => {
    verifyTrabajador();
    fetchEditors();
    fetchPublicationStates();
  }, [verifyTrabajador, fetchEditors, fetchPublicationStates]);

  useEffect(() => {
    if (trabajadorId) {
      fetchPaginatedNews(1, INITIAL_PAGE_SIZE, true);
    }
  }, [trabajadorId, showAllNews]);

  const clearAllCache = useCallback(async () => {
    try {
      Modal.confirm({
        title: '¿Borrar todo el caché?',
        content: 'Esta acción borrará todo el caché del navegador, incluyendo noticias, editores y estados. La página se recargará automáticamente.',
        okText: 'Sí, borrar todo',
        cancelText: 'Cancelar',
        onOk: async () => {
          try {
            Object.values(CACHE_KEYS).forEach(key => {
              localStorage.removeItem(key);
            });
            localStorage.clear();
            sessionStorage.clear();
            
            document.cookie.split(";").forEach(function(c) { 
              document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/"); 
            });
            
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
  }, []);

  const canEditNews = useCallback((record) => {
    return record.autor === trabajadorId || 
           (Array.isArray(record.editores_en_jefe) && record.editores_en_jefe.includes(trabajadorId));
  }, [trabajadorId]);

  const getSortedEditors = useMemo(() => {
    return [...editors].sort((a, b) => {
      if (a.id === 6) return -1;
      if (b.id === 6) return 1;
      if (a.id === 27) return -1;
      if (b.id === 27) return 1;
      return `${a.nombre} ${a.apellido}`.localeCompare(`${b.nombre} ${b.apellido}`);
    });
  }, [editors]);

  const handleStateFilter = useCallback((stateId) => {
    setSelectedStateFilter(stateId);
    console.log('Filtering by state ID:', stateId);
  }, []);

  const clearFilters = useCallback(() => {
    setSelectedStateFilter(null);
    setSearchTerm('');
  }, []);

  const handleSearch = useCallback((e) => {
    setSearchTerm(e.target.value);
  }, []);

  const toggleNewsView = useCallback((showAll) => {
    setShowAllNews(showAll);
    setSelectedStateFilter(null);
    setSearchTerm('');
    setCurrentPage(1);
    console.log('Vista cambiada a:', showAll ? 'Todas las noticias' : 'Mis noticias');
  }, []);

  // Filtrado optimizado con useMemo
  const { filteredNews, currentNewsArray } = useMemo(() => {
    const currentArray = showAllNews ? allNews : news;
    const searchLower = debouncedSearchTerm.toLowerCase();
    
    const filtered = currentArray.filter(record => {
      const matchesSearch = !searchLower || record.nombre_noticia.toLowerCase().includes(searchLower);
      const matchesState = selectedStateFilter === null || record.estado === selectedStateFilter;
      return matchesSearch && matchesState;
    });
    
    return {
      filteredNews: filtered,
      currentNewsArray: currentArray
    };
  }, [showAllNews, allNews, news, debouncedSearchTerm, selectedStateFilter]);

  const getStateColor = useCallback((stateName) => {
    return STATE_COLOR_MAP[stateName?.toLowerCase()] || 'default';
  }, []);

  const getNewsCountByState = useCallback((stateId) => {
    return currentNewsArray.filter(record => record.estado === stateId).length;
  }, [currentNewsArray]);

  const showModal = useCallback((record = null) => {
    if (record) {
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
        editores_en_jefe: [6, 27]
      });
      setEditingId(null);
      setFilteredPublicationStates(publicationStates.filter(state => state.nombre_estado !== 'publicado'));
    }
    setIsModalVisible(true);
  }, [showAllNews, canEditNews, form, trabajadorId, publicationStates]);

  const cleanKeywords = useCallback((keywords) => {
    if (!keywords) return '';
    
    let cleaned = keywords.trim();
    
    while (cleaned.endsWith(',')) {
      cleaned = cleaned.slice(0, -1).trim();
    }
    
    cleaned = cleaned.replace(/,+/g, ',');
    cleaned = cleaned.replace(/\s*,\s*/g, ',');
    
    return cleaned;
  }, []);

  const handleOk = useCallback(() => {
    form.validateFields().then(values => {
      const cleanedKeywords = cleanKeywords(values.Palabras_clave);
      
      if (!Array.isArray(values.categorias)) {
        values.categorias = values.categorias ? [values.categorias] : [];
      }
      
      if (!Array.isArray(values.editores_en_jefe)) {
        values.editores_en_jefe = values.editores_en_jefe ? [values.editores_en_jefe] : [];
      }
      
      const estadoPublicado = publicationStates.find(
        state => state.nombre_estado.toLowerCase() === 'publicado'
      );
      
      let fechaPublicacion = values.fecha_publicacion;
      if (estadoPublicado && parseInt(values.estado, 10) === estadoPublicado.id) {
        fechaPublicacion = moment();
        console.log('Estado publicado detectado - actualizando fecha a hoy:', fechaPublicacion.format('YYYY-MM-DD'));
      }
      
      const noticiaEditada = {
        nombre_noticia: values.nombre_noticia,
        fecha_publicacion: fechaPublicacion.format('YYYY-MM-DD'),
        categorias: values.categorias.join(','),
        Palabras_clave: cleanedKeywords,
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
            fetchPaginatedNews(1, pageSize, true);
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
  }, [form, editingId, invalidateNewsCache, fetchPaginatedNews, pageSize, publicationStates, cleanKeywords]);

  const handleDelete = useCallback((id) => {
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
        fetchPaginatedNews(1, pageSize, true);
      });
  }, [invalidateNewsCache, fetchPaginatedNews, pageSize]);

  const handleEditContent = useCallback((id) => {
    navigate(`/edit-content/${id}`);
    console.log('Navigating to edit content for news ID:', id);
  }, [navigate]);

  const handleComment = useCallback((id) => {
    navigate(`/comments/${id}`);
    console.log('Navigating to comments for news ID:', id);
  }, [navigate]);

  const generateNewsUrl = useCallback((newsItem) => {
    if (newsItem.slug) {
      return `/noticia/${newsItem.id}-${newsItem.slug}`;
    }
    return `/noticia/${newsItem.id}`;
  }, []);

  const handlePreview = useCallback((record) => {
    const previewUrl = generateNewsUrl(record);
    navigate(previewUrl);
    console.log('Navigating to preview for news ID:', record.id);
  }, [generateNewsUrl, navigate]);

  // Configuración de tabla optimizada con memoización
  const tableColumns = useMemo(() => [
    { 
      title: 'Detalles de la Noticia', 
      dataIndex: 'nombre_noticia', 
      key: 'nombre_noticia',
      render: (text, record) => (
        <NewsDetails
          text={text}
          record={record}
          editors={editors}
          publicationStates={publicationStates}
          canEditNews={canEditNews}
          showAllNews={showAllNews}
          getStateColor={getStateColor}
          showModal={showModal}
          handleEditContent={handleEditContent}
          handlePreview={handlePreview}
          handleDelete={handleDelete}
          handleComment={handleComment}
        />
      )
    }
  ], [editors, publicationStates, canEditNews, showAllNews, getStateColor, showModal, handleEditContent, handlePreview, handleDelete, handleComment]);

  const tablePagination = useMemo(() => ({
    current: currentPage,
    pageSize: pageSize,
    total: filteredNews.length,
    showSizeChanger: !isMobile,
    showQuickJumper: !isMobile,
    showTotal: (total, range) => 
      `${range[0]}-${range[1]} de ${total} noticias`,
    onChange: (page, size) => {
      setCurrentPage(page);
      if (size !== pageSize) {
        setPageSize(size);
      }
      if (page * size > currentNewsArray.length * 0.8 && hasMore) {
        loadMoreNews();
      }
    },
    onShowSizeChange: (current, size) => {
      setPageSize(size);
      setCurrentPage(1);
    },
    pageSizeOptions: ['10', '20', '50', '100'],
    responsive: true,
  }), [currentPage, pageSize, filteredNews.length, isMobile, currentNewsArray.length, hasMore, loadMoreNews]);

  const renderCategoryOptions = useCallback(() => {
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
  }, []);

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
          
          <div style={{
            marginTop: '12px',
            padding: '8px 12px',
            background: showAllNews ? '#e6f7ff' : '#f6ffed',
            border: `1px solid ${showAllNews ? '#91d5ff' : '#b7eb8f'}`,
            borderRadius: '4px',
            fontSize: '13px',
            fontWeight: '500',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '8px'
          }}>
            <span style={{ color: showAllNews ? '#1890ff' : '#52c41a' }}>
              {showAllNews ? (
                <>
                  Mostrando todas las noticias del sistema ({allNews.length} cargadas)
                  {filteredNews.length !== allNews.length && ` - ${filteredNews.length} filtradas`}
                </>
              ) : (
                <>
                  Mostrando solo tus noticias ({news.length} cargadas)
                  {filteredNews.length !== news.length && ` - ${filteredNews.length} filtradas`}
                </>
              )}
            </span>
            
            {hasMore && !loading && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Button 
                  type="link" 
                  size="small" 
                  onClick={loadMoreNews}
                  loading={loadingMore}
                  style={{ padding: '0 8px', height: 'auto' }}
                >
                  {loadingMore ? 'Cargando...' : 'Cargar más'}
                </Button>
                {loadingMore && <Spin size="small" />}
              </div>
            )}
          </div>
        </div>

        <Layout.Content style={{ padding: '20px' }}>
          <Table 
            columns={tableColumns}
            dataSource={filteredNews} 
            rowKey="id" 
            scroll={{ x: true }} 
            pagination={tablePagination}
            loading={loading}
            locale={{
              emptyText: loading ? 'Cargando noticias...' : 'No hay noticias disponibles'
            }}
          />
          
          {loadingMore && (
            <div style={{
              textAlign: 'center',
              padding: '20px',
              borderTop: '1px solid #f0f0f0'
            }}>
              <Spin size="large" />
              <p style={{ marginTop: '10px', color: '#999' }}>
                Cargando más noticias...
              </p>
            </div>
          )}
          
          {!hasMore && currentNewsArray.length > 0 && (
            <div style={{
              textAlign: 'center',
              padding: '20px',
              borderTop: '1px solid #f0f0f0',
              color: '#999'
            }}>
              No hay más noticias para cargar
            </div>
          )}
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
        confirmLoading={false}
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
              {getSortedEditors.map(editor => (
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
              {getSortedEditors.map(editor => (
                <Option key={editor.id} value={editor.id}>{`${editor.nombre} ${editor.apellido} (ID: ${editor.id})`}</Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item 
            name="fecha_publicacion" 
            label="Fecha de Publicación" 
            rules={[{ required: true, message: '¡Por favor seleccione la fecha de publicación!' }]}
            extra="Nota: Si selecciona 'Publicado' como estado, la fecha se actualizará automáticamente a hoy"
          >
            <DatePicker style={{ width: '100%' }} />
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
            label="Categorias"
            rules={[{ required: true, message: '¡Por favor ingrese al menos una categoría!' }]}
            extra="Separe cada categoría por una coma ',' y use guion bajo '_' para separar palabras. Ejemplo: Argentina,Javier_Milei,Opinión. Las comas finales serán eliminadas automáticamente."
          >
            <TextArea 
              rows={4} 
              placeholder="Argentina,Javier_Milei,Opinión"
              onBlur={(e) => {
                const cleaned = cleanKeywords(e.target.value);
                form.setFieldsValue({ Palabras_clave: cleaned });
              }}
            />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default NewsManagement;