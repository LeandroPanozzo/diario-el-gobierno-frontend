import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import './SectionPage.css';
import api from '../../pages/context/axiosConfig';
import AdSenseAd from '../News/AdSenseAd';

const SectionPage = () => {
  const { sectionName } = useParams();
  const [news, setNews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const newsPerPage = 20;

  // Función para extraer la primera imagen del contenido HTML
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

  // Procesar los datos de noticias para extraer imágenes del contenido
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

  // Definir las categorías principales y sus subcategorías
  const mainSections = {
    'portada': ['portada'],
    'politica': ['nacion','legislativos', 'judiciales', 'conurbano', 'provincias', 'municipios', 'policiales', 'elecciones', 'gobierno', 'capital'],
    'cultura': ['cine', 'literatura', 'moda', 'tecnologia', 'eventos', 'salud', 'educacion', 'efemerides', 'deporte'],
    'economia': ['finanzas', 'negocios', 'empresas', 'dolar', 'comercio_internacional', 'politica_economica', 'pobreza_e_inflacion'],
    'mundo': ['estados_unidos', 'politica_exterior', 'medio_oriente', 'asia', 'internacional', 'latinoamerica']
  };

  // Función para eliminar etiquetas HTML
  const stripHtml = (html) => {
    const doc = new DOMParser().parseFromString(html, 'text/html');
    return doc.body.textContent || '';
  };

  // Función para generar la URL con slug para las noticias
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

        const response = await api.get('noticias/');
        const normalizedSectionName = sectionName.toLowerCase().trim();
        
        const subcategories = mainSections[normalizedSectionName] || [];

        const filteredNews = response.data
          .filter(newsItem => {
            if (newsItem.estado !== 3) return false;
            
            const categoriesArray = Array.isArray(newsItem.categorias) 
              ? newsItem.categorias 
              : (typeof newsItem.categorias === 'string' && newsItem.categorias 
                 ? newsItem.categorias.split(',').map(cat => cat.trim().toLowerCase())
                 : []);
            
            return categoriesArray.some(category => 
              subcategories.includes(category.toLowerCase())
            );
          })
          .sort((a, b) => new Date(b.fecha_publicacion) - new Date(a.fecha_publicacion));

        await fetchAuthors(filteredNews);
        
        const processedNews = processNewsWithImages(filteredNews);
        setNews(processedNews);

      } catch (error) {
        setError(error.message);
        console.error('Failed to fetch section news:', error);
      } finally {
        setLoading(false);
      }
    };

    const fetchAuthors = async (newsList) => {
      for (const newsItem of newsList) {
        if (newsItem.autor) {
          try {
            const authorResponse = await api.get(`trabajadores/${newsItem.autor}/`);
            newsItem.autorData = authorResponse.data;
          } catch (error) {
            console.error('Error fetching author data:', error);
          }
        }
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

  // Componente para renderizar un anuncio como noticia
  const AdAsNews = ({ adConfig, index }) => {
    return (
      <div key={`ad-${index}`} className="news-item ad-news-item">
        <div className="news-img-container">
          <div className="ad-placeholder">
            <AdSenseAd {...adConfig} />
          </div>
        </div>
        <div className="news-content">
          <div className="ad-label">Publicidad</div>
        </div>
      </div>
    );
  };

  // Función para mezclar noticias con anuncios
  const mixNewsWithAds = (newsItems) => {
    const items = [];
    const adConfigs = [
      {
        slot: "9072042757",
        format: "fluid",
        layoutKey: "-6t+ed+2i-1n-4w",
        style: { display: 'block', width: '100%', height: '200px' }
      },
      {
        slot: "1234567890", // Cambia por tu slot ID
        format: "fluid",
        layoutKey: "-6t+ed+2i-1n-4w",
        style: { display: 'block', width: '100%', height: '200px' }
      },
      {
        slot: "0987654321", // Cambia por tu slot ID
        format: "fluid",
        layoutKey: "-6t+ed+2i-1n-4w",
        style: { display: 'block', width: '100%', height: '200px' }
      }
    ];

    let adIndex = 0;

    newsItems.forEach((newsItem, index) => {
      // Agregar noticia
      items.push(
        <Link to={generateNewsUrl(newsItem)} key={newsItem.id} className="news-item">
          <div className="news-img-container">
            <img 
              src={newsItem.contentImage} 
              alt={newsItem.nombre_noticia} 
              className="news-img"
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
              <p className="news-category">
                {Array.isArray(newsItem.categorias) 
                  ? newsItem.categorias
                      .filter(cat => mainSections[sectionName.toLowerCase()]?.includes(cat.toLowerCase()))
                      .join(', ')
                  : (typeof newsItem.categorias === 'string' && newsItem.categorias
                      ? newsItem.categorias
                          .split(',')
                          .map(cat => cat.trim())
                          .filter(cat => mainSections[sectionName.toLowerCase()]?.includes(cat.toLowerCase()))
                          .join(', ')
                      : '')}
              </p>
            </div>
          </div>
        </Link>
      );

      // Insertar anuncio después de cada 6 noticias, pero no al final
      if ((index + 1) % 6 === 0 && index < newsItems.length - 1 && adIndex < adConfigs.length) {
        items.push(
          <AdAsNews 
            key={`ad-${adIndex}`} 
            adConfig={adConfigs[adIndex]} 
            index={adIndex}
          />
        );
        adIndex++;
      }
    });

    return items;
  };

  if (loading) return <div className="loading">Cargando noticias...</div>;
  if (error) return <div className="error">Error: {error}</div>;

  const indexOfLastNews = currentPage * newsPerPage;
  const indexOfFirstNews = indexOfLastNews - newsPerPage;
  const currentNews = news.slice(indexOfFirstNews, indexOfLastNews);
  const totalPages = Math.ceil(news.length / newsPerPage);

  return (
    <div className="section-page">
      <h1>{sectionName.charAt(0).toUpperCase() + sectionName.slice(1)}</h1>
      
      {news.length === 0 ? (
        <p className="no-news">No hay noticias disponibles en esta sección.</p>
      ) : (
        <>
          <div className="news-grid">
            {mixNewsWithAds(currentNews)}
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