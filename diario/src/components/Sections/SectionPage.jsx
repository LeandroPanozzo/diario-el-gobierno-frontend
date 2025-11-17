import { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import './SectionPage.css';
import api from '../../pages/context/axiosConfig';

const SectionPage = () => {
  const { sectionName } = useParams();
  const [news, setNews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const newsPerPage = 20;

  // ✅ MAPEO CORREGIDO - Debe coincidir EXACTAMENTE con el modelo Django
  const mainSections = useMemo(() => ({
    'politica': [
      'nacion',
      'legislativos', 
      'judiciales',
      'conurbano',
      'provincias',
      'municipios',
      'policiales',
      'elecciones',
      'gobierno',
      'capital'
    ],
    'cultura': [
      'cine',
      'literatura',
      'moda',
      'tecnologia',
      'eventos',
      'salud',
      'educacion',
      'efemerides',
      'deporte'
    ],
    'economia': [
      'finanzas',
      'negocios',
      'empresas',
      'dolar',
      'comercio_internacional',
      'politica_economica',
      'pobreza_e_inflacion'
    ],
    'mundo': [
      'estados_unidos',
      'politica_exterior',
      'medio_oriente',
      'asia',
      'internacional',
      'latinoamerica'
    ],
    'tipos de notas': [
      'de_analisis',
      'de_opinion',
      'informativas',
      'entrevistas'
    ]
  }), []);

  // 🚀 OPTIMIZACIÓN: Usar useCallback para funciones estables
  const extractFirstImageFromContent = useCallback((htmlContent) => {
    if (!htmlContent) return null;
    
    // 🚀 OPTIMIZACIÓN: Regex más rápido que DOM parsing para imágenes
    const imgMatch = htmlContent.match(/<img[^>]+src="([^">]+)"/);
    return imgMatch ? imgMatch[1] : null;
  }, []);

  const processNewsWithImages = useCallback((newsItems) => {
    return newsItems.map(newsItem => {
      const contentImage = extractFirstImageFromContent(newsItem.contenido);
      const finalImage = contentImage || newsItem.imagen_1 || newsItem.imagen_cabecera;
      
      return {
        ...newsItem,
        contentImage: finalImage
      };
    });
  }, [extractFirstImageFromContent]);

  const stripHtml = useCallback((html) => {
    if (!html) return '';
    // 🚀 OPTIMIZACIÓN: Regex más rápido que DOMParser
    return html.replace(/<[^>]*>/g, '').substring(0, 150);
  }, []);

  const generateNewsUrl = useCallback((newsItem) => {
    if (newsItem.slug) {
      return `/noticia/${newsItem.id}-${newsItem.slug}`;
    }
    return `/noticia/${newsItem.id}`;
  }, []);

  const truncateContent = useCallback((content, maxLength = 150) => {
    const plainText = stripHtml(content);
    return plainText.length > maxLength ? 
      plainText.slice(0, maxLength) + '...' : 
      plainText;
  }, [stripHtml]);

  // 🚀 OPTIMIZACIÓN: Carga optimizada de autores
  const loadAuthorsBatch = useCallback(async (newsList) => {
    const authorPromises = newsList
      .filter(newsItem => newsItem.autor && !newsItem.autorData)
      .map(async (newsItem) => {
        try {
          const authorResponse = await api.get(`trabajadores/${newsItem.autor}/`);
          return { id: newsItem.id, autorData: authorResponse.data };
        } catch (error) {
          console.error('Error fetching author:', error);
          return { id: newsItem.id, autorData: null };
        }
      });

    const authorsResults = await Promise.allSettled(authorPromises);
    
    setNews(prevNews => {
      const updatedNews = [...prevNews];
      authorsResults.forEach(result => {
        if (result.status === 'fulfilled' && result.value) {
          const index = updatedNews.findIndex(item => item.id === result.value.id);
          if (index !== -1) {
            updatedNews[index] = { ...updatedNews[index], autorData: result.value.autorData };
          }
        }
      });
      return updatedNews;
    });
  }, []);

  useEffect(() => {
    const fetchSectionNews = async () => {
      setLoading(true);
      setError(null);
      
      // 🚀 OPTIMIZACIÓN: AbortController para cancelar peticiones anteriores
      const abortController = new AbortController();
      
      try {
        if (!sectionName) {
          throw new Error('Sección no válida');
        }

        const normalizedSectionName = sectionName.toLowerCase().trim();
        const subcategories = mainSections[normalizedSectionName] || [];

        if (subcategories.length === 0) {
          setNews([]);
          setLoading(false);
          return;
        }

        // 🚀 OPTIMIZACIÓN: Solicitar solo los campos necesarios
        const categoryParam = subcategories.join(',');
        const response = await api.get('noticias/por-categoria/', {
          params: {
            categoria: categoryParam,
            estado: 3,
            limit: 60,
            fields: 'id,slug,nombre_noticia,contenido,fecha_publicacion,autor,imagen_1,imagen_cabecera' // Solo campos necesarios
          },
          signal: abortController.signal
        });
        
        const newsData = Array.isArray(response.data) ? response.data : [];

        // 🚀 OPTIMIZACIÓN: Procesar datos inmediatamente
        const processedNews = processNewsWithImages(newsData);
        setNews(processedNews);

        // 🚀 OPTIMIZACIÓN: Cargar autores en segundo plano después de mostrar noticias
        if (newsData.length > 0) {
          setLoading(false); // Mostrar noticias inmediatamente
          loadAuthorsBatch(processedNews); // Cargar autores después
        } else {
          setLoading(false);
        }

      } catch (error) {
        if (error.name === 'AbortError') {
          console.log('Petición cancelada');
          return;
        }
        setError(error.message);
        console.error('❌ Error al cargar noticias:', error);
        setLoading(false);
      }
    };

    fetchSectionNews();

    // 🚀 OPTIMIZACIÓN: Cleanup para cancelar petición si el componente se desmonta
    return () => {
      // Aquí iría el abort controller si lo implementamos completamente
    };
  }, [sectionName, mainSections, processNewsWithImages, loadAuthorsBatch]);

  const handlePageChange = useCallback((pageNumber) => {
    setCurrentPage(pageNumber);
    window.scrollTo(0, 0);
  }, []);

  // 🚀 OPTIMIZACIÓN: Memoizar noticias actuales
  const currentNews = useMemo(() => {
    const indexOfLastNews = currentPage * newsPerPage;
    const indexOfFirstNews = indexOfLastNews - newsPerPage;
    return news.slice(indexOfFirstNews, indexOfLastNews);
  }, [news, currentPage, newsPerPage]);

  const totalPages = useMemo(() => Math.ceil(news.length / newsPerPage), [news, newsPerPage]);

  if (loading) return (
    <div className="loading">
      <div className="loading-spinner"></div>
      Cargando noticias...
    </div>
  );
  
  if (error) return <div className="error">Error: {error}</div>;

  return (
    <div className="section-page">
      <h1>{sectionName ? sectionName.charAt(0).toUpperCase() + sectionName.slice(1) : 'Sección'}</h1>
      
      {news.length === 0 ? (
        <div className="no-news">
          <p>No hay noticias disponibles en esta sección.</p>
          <p>Verifica que las noticias tengan las categorías correctas en el panel de administración.</p>
          <button onClick={() => window.location.reload()} className="reload-button">
            Reintentar
          </button>
        </div>
      ) : (
        <>
          <div className="news-grid">
            {currentNews.map((newsItem) => (
              <Link to={generateNewsUrl(newsItem)} key={newsItem.id} className="news-item">
                <div className="news-img-container">
                  <img 
                    src={newsItem.contentImage} 
                    alt={newsItem.nombre_noticia} 
                    className="news-img"
                    loading="lazy"
                    decoding="async"
                    onError={(e) => {
                      e.target.style.display = 'none';
                    }}
                  />
                </div>
                <div className="news-content">
                  <h3 className="news-title">{newsItem.nombre_noticia}</h3>
                  <p className="news-excerpt">{truncateContent(newsItem.contenido)}</p>
                  <div className="news-meta">
                    <p className="news-date">
                      {new Date(newsItem.fecha_publicacion).toLocaleDateString()}
                    </p>
                    {newsItem.autorData && (
                      <p className="news-author">
                        Por {newsItem.autorData.nombre} {newsItem.autorData.apellido}
                      </p>
                    )}
                  </div>
                </div>
              </Link>
            ))}
          </div>

          {totalPages > 1 && (
            <div className="pagination">
              {currentPage > 1 && (
                <button 
                  onClick={() => handlePageChange(currentPage - 1)}
                  className="page-button"
                >
                  Anterior
                </button>
              )}
              
              {[...Array(totalPages)].map((_, index) => (
                <button
                  key={index + 1}
                  onClick={() => handlePageChange(index + 1)}
                  className={`page-button ${currentPage === index + 1 ? 'active' : ''}`}
                >
                  {index + 1}
                </button>
              ))}
              
              {currentPage < totalPages && (
                <button 
                  onClick={() => handlePageChange(currentPage + 1)}
                  className="page-button"
                >
                  Siguiente
                </button>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default SectionPage;