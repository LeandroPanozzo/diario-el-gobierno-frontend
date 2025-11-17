import { useState, useEffect } from 'react';
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
  const mainSections = {
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
  };

  const extractFirstImageFromContent = (htmlContent) => {
    if (!htmlContent) return null;
    
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = htmlContent;
    const firstImage = tempDiv.querySelector('img');
    
    if (firstImage && firstImage.src) {
      return firstImage.src;
    }
    
    return null;
  };

  const processNewsWithImages = (newsItems) => {
    return newsItems.map(newsItem => {
      const contentImage = extractFirstImageFromContent(newsItem.contenido);
      const finalImage = contentImage || newsItem.imagen_1 || newsItem.imagen_cabecera;
      
      return {
        ...newsItem,
        contentImage: finalImage
      };
    });
  };

  const stripHtml = (html) => {
    const doc = new DOMParser().parseFromString(html, 'text/html');
    return doc.body.textContent || '';
  };

  const generateNewsUrl = (newsItem) => {
    if (newsItem.slug) {
      return `/noticia/${newsItem.id}-${newsItem.slug}`;
    }
    return `/noticia/${newsItem.id}`;
  };

  useEffect(() => {
    const fetchSectionNews = async () => {
      setLoading(true);
      setError(null);
      try {
        if (!sectionName) {
          throw new Error('Sección no válida');
        }

        // Normalizar el nombre de la sección
        const normalizedSectionName = sectionName.toLowerCase().trim();
        
        const subcategories = mainSections[normalizedSectionName] || [];

        if (subcategories.length === 0) {
          setNews([]);
          setLoading(false);
          return;
        }

        // 🚀 OPTIMIZACIÓN 1: Usar el endpoint de categoría específico del backend
        // Esto filtra en el servidor en lugar del cliente
        const categoryParam = subcategories.join(',');
        const response = await api.get('noticias/por-categoria/', {
          params: {
            categoria: categoryParam,
            estado: 3,
            limit: 60 // Solo traer las necesarias
          }
        });
        
        const newsData = Array.isArray(response.data) ? response.data : [];

        // 🚀 OPTIMIZACIÓN 2: Cargar autores en paralelo (máximo 5 a la vez)
        const loadAuthorsInBatches = async (newsList) => {
          const batchSize = 5;
          for (let i = 0; i < newsList.length; i += batchSize) {
            const batch = newsList.slice(i, i + batchSize);
            await Promise.all(
              batch.map(async (newsItem) => {
                if (newsItem.autor) {
                  try {
                    const authorResponse = await api.get(`trabajadores/${newsItem.autor}/`);
                    newsItem.autorData = authorResponse.data;
                  } catch (error) {
                    console.error('Error fetching author:', error);
                  }
                }
              })
            );
          }
        };

        await loadAuthorsInBatches(newsData);
        
        // 🚀 OPTIMIZACIÓN 3: Procesar imágenes de forma eficiente
        const processedNews = processNewsWithImages(newsData);
        setNews(processedNews);

      } catch (error) {
        setError(error.message);
        console.error('❌ Error al cargar noticias:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchSectionNews();
  }, [sectionName]);

  const handlePageChange = (pageNumber) => {
    setCurrentPage(pageNumber);
    window.scrollTo(0, 0);
  };

  const truncateContent = (content, maxLength = 150) => {
    const plainText = stripHtml(content);
    return plainText.length > maxLength ? 
      plainText.slice(0, maxLength) + '...' : 
      plainText;
  };

  if (loading) return <div className="loading">Cargando noticias...</div>;
  if (error) return <div className="error">Error: {error}</div>;

  const indexOfLastNews = currentPage * newsPerPage;
  const indexOfFirstNews = indexOfLastNews - newsPerPage;
  const currentNews = news.slice(indexOfFirstNews, indexOfLastNews);
  const totalPages = Math.ceil(news.length / newsPerPage);

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