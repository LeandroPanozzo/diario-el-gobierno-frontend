import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import 'slick-carousel/slick/slick.css';
import 'slick-carousel/slick/slick-theme.css';
import './home.css';
import api from '../context/axiosConfig';

// Función para extraer la primera imagen del contenido HTML
const extractFirstImageFromContent = (htmlContent) => {
  if (!htmlContent) return null;
  
  // Crear un elemento DOM temporal para buscar imágenes
  const tempDiv = document.createElement('div');
  tempDiv.innerHTML = htmlContent;
  
  // Buscar la primera imagen en el contenido
  const firstImage = tempDiv.querySelector('img');
  
  // Si encontramos una imagen, devolver su URL
  if (firstImage && firstImage.src) {
    return firstImage.src;
  }
  
  // No se encontró ninguna imagen
  return null;
};

const HomePage = () => {
  const [featuredNews, setFeaturedNews] = useState([]);
  const [sectionNews, setSectionNews] = useState({});
  const [recentNews, setRecentNews] = useState([]);
  const [mostViewedNews, setMostViewedNews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  // Content processing functions
  const stripHtml = (html) => {
    const doc = new DOMParser().parseFromString(html, 'text/html');
    return doc.body.textContent || "";
  };

  const getFirstParagraphContent = (content) => {
    const plainText = stripHtml(content);
    const words = plainText.split(/\s+/);
    return words.slice(0, 30).join(' ') + (words.length > 30 ? '...' : '');
  };

  const truncateTitle = (title, maxLength) => {
    return title.length > maxLength ? title.slice(0, maxLength) + '...' : title;
  };

  const truncateContent = (content, type) => {
    const plainText = stripHtml(content);
    
    switch (type) {
      case 'default':
        return plainText ? (plainText.length > 20 ? plainText.slice(0, 20) + '...' : plainText) : '';
      case 'main':
        return plainText ? (plainText.length > 150 ? plainText.slice(0, 150) + '...' : plainText) : '';
      case 'secondary':
        return plainText ? (plainText.length > 10 ? plainText.slice(0, 10) + '...' : plainText) : '';
      case 'recent':
        return plainText ? (plainText.length > 20 ? plainText.slice(0, 20) + '...' : plainText) : '';
      default:
        return plainText;
    }
  };

  const truncateSubtitle = (subtitle, content) => {
    if (subtitle === 'default content') {
      return truncateContent(content);
    }
    return subtitle;
  };

  // Procesar los datos de noticias para extraer imágenes del contenido
  const processNewsWithImages = (newsItems) => {
    return newsItems.map(newsItem => {
      // Extraer la primera imagen del contenido
      const contentImage = extractFirstImageFromContent(newsItem.contenido);
      
      // Si encontramos una imagen en el contenido, la usamos. De lo contrario, usamos imagen_1 o imagen_cabecera
      const finalImage = contentImage || newsItem.imagen_1 || newsItem.imagen_cabecera;
      
      return {
        ...newsItem,
        contentImage: finalImage
      };
    });
  };

  useEffect(() => {
    const fetchAllData = async () => {
      setLoading(true);
      setError(null);
      
      try {
        // Fetch data in parallel for better performance
        const [featuredResponse, recentResponse, mostViewedResponse] = await Promise.all([
          // Get featured news (category 'Portada', estado 3, limit 5)
          api.get('noticias', { 
            params: { 
              categoria: 'Portada',
              estado: 3,
              limit: 5,
              include_autor: true,
              include_editor: true
            }
          }),
          
          // Get recent news (estado 3, limit 5, sorted by date)
          api.get('noticias', { 
            params: { 
              estado: 3,
              limit: 5,
              sort: '-fecha_publicacion',
              include_autor: true
            }
          }),
          
          // Get most viewed news (using the dedicated endpoint, limit 5)
          api.get('noticias/mas_vistas/')
        ]);

        // Process featured news
        const featuredNewsData = processNewsWithImages(featuredResponse.data);
        setFeaturedNews(featuredNewsData);
        
        // Process recent news
        const recentNewsData = processNewsWithImages(recentResponse.data);
        setRecentNews(recentNewsData);
        
        // Process most viewed news
        const mostViewedNewsData = processNewsWithImages(mostViewedResponse.data);
        setMostViewedNews(mostViewedNewsData);
        
        // Fetch section news sequentially
        const mainSections = {
          'Politica': ['nacion', 'legislativos', 'policiales', 'elecciones', 'gobierno', 'provincias', 'capital'],
          'Cultura': ['cine', 'literatura', 'salud', 'tecnologia', 'eventos', 'educacion', 'efemerides', 'deporte'],
          'Economia': ['finanzas', 'comercio_internacional', 'politica_economica', 'dolar', 'pobreza_e_inflacion'],
          'Mundo': ['estados_unidos', 'asia', 'medio_oriente', 'internacional', 'latinoamerica'],
          'Tipos de notas': ['de_analisis', 'de_opinion', 'informativas', 'entrevistas']
        };
        
        const sectionResponses = {};
        
        // Fetch section data sequentially to avoid overwhelming the server
        for (const [section, categories] of Object.entries(mainSections)) {
          try {
            // We need to use a categories parameter that accepts multiple values
            // This assumes the API endpoint supports this with comma-separated values
            const response = await api.get('noticias/por_categoria', {
              params: {
                categoria: categories.join(','),
                estado: 3,
                limit: 7,
                include_autor: true,
                include_editor: true
              }
            });
            
            sectionResponses[section] = processNewsWithImages(response.data);
          } catch (error) {
            console.error(`Failed to fetch ${section} news:`, error);
            sectionResponses[section] = [];
          }
        }
        
        setSectionNews(sectionResponses);
      } catch (error) {
        console.error('Failed to fetch news data:', error);
        setError('Failed to load news content. Please try again later.');
      } finally {
        setLoading(false);
      }
    };

    fetchAllData();
  }, []);

  const renderNewsSection = (newsArray, sectionTitle) => (
    <div className="news-section" key={sectionTitle}>
      <h2 className="section-title">{sectionTitle.toUpperCase()}</h2>
      <div className="news-grid">
        {newsArray.length > 0 ? (
          <>
            <div className="main-article" onClick={() => navigate(`/noticia/${newsArray[0].id}`)}>
              <div className='recent-new'>
                <img src={newsArray[0].contentImage} alt={newsArray[0].nombre_noticia} />
              </div>
              <div className="main-article-content">
                <h3>{truncateTitle(newsArray[0].nombre_noticia, 60)}</h3>
                <div>
                  {newsArray[0].autorData && (
                    <p className="author">
                      por {newsArray[0].autorData.nombre} {newsArray[0].autorData.apellido}
                    </p>
                  )}
                  <p className="date">{new Date(newsArray[0].fecha_publicacion).toLocaleDateString()}</p>
                </div>
                <p className="article-preview">
                  {getFirstParagraphContent(newsArray[0].contenido)}
                </p>
              </div>
            </div>
            <div className="secondary-articles">
              {newsArray.slice(1, 5).map((newsItem) => (
                <div
                  key={newsItem.id}
                  className="secondary-article"
                  onClick={() => navigate(`/noticia/${newsItem.id}`)}
                >
                  <div className='secondary-article-img'>
                    <img src={newsItem.contentImage} alt={newsItem.nombre_noticia} />
                  </div>
                  <div className="secondary-article-content">
                    <h4>{newsItem.nombre_noticia}</h4>
                    {newsItem.autorData && (
                      <p className="author">
                        por {newsItem.autorData.nombre} {newsItem.autorData.apellido}
                      </p>
                    )}
                    <p className="date">{new Date(newsItem.fecha_publicacion).toLocaleDateString()}</p>
                  </div>
                </div>
              ))}
            </div>
          </>
        ) : (
          <p>No hay noticias disponibles para esta sección</p>
        )}
      </div>
    </div>
  );

  const renderRecentNews = (recentNewsArray) => (
    <div className="recent-news-section">
      <h2 className="section-title">NOTICIAS RECIENTES</h2>
      <div className="recent-news-list">
        {recentNewsArray.length > 0 ? (
          recentNewsArray.map(newsItem => (
            <div
              key={newsItem.id}
              className="recent-news-item"
              onClick={() => navigate(`/noticia/${newsItem.id}`)}
            >
              <div className='recent-new'>
                <img src={newsItem.contentImage} alt={newsItem.nombre_noticia} className="recent-news-image" />
              </div>
              <div className="recent-news-content">
                <h4>{newsItem.nombre_noticia}</h4>
                <p className="date">{new Date(newsItem.fecha_publicacion).toLocaleDateString()}</p>
              </div>
            </div>
          ))
        ) : (
          <p>No hay noticias recientes</p>
        )}
      </div>
    </div>
  );

  const renderMostViewedNews = (mostViewedNewsArray) => (
    <div className="recent-news-section">
      <h2 className="section-title">MÁS LEÍDAS</h2>
      <div className="recent-news-list">
        {mostViewedNewsArray.length > 0 ? (
          mostViewedNewsArray.map(newsItem => (
            <div
              key={newsItem.id}
              className="recent-news-item"
              onClick={() => navigate(`/noticia/${newsItem.id}`)}
            >
              <div className='recent-new'>
                <img src={newsItem.contentImage} alt={newsItem.nombre_noticia} className="recent-news-image" />
              </div>
              <div className="recent-news-content">
                <h4>{newsItem.nombre_noticia}</h4>
                <div className="news-meta">
                  <p className="date">{new Date(newsItem.fecha_publicacion).toLocaleDateString()}</p>
                </div>
              </div>
            </div>
          ))
        ) : (
          <p>No hay noticias destacadas</p>
        )}
      </div>
    </div>
  );

  // Show loading state
  if (loading) {
    return (
      <div className="container">
        <div className="loading-state">
          <h2>Cargando noticias...</h2>
        </div>
      </div>
    );
  }

  // Show error state
  if (error) {
    return (
      <div className="container">
        <div className="error-state">
          <h2>Error</h2>
          <p>{error}</p>
          <button onClick={() => window.location.reload()}>Reintentar</button>
        </div>
      </div>
    );
  }

  return (
    <div className="container">
      <main>
        <div className="featured-article">
          {featuredNews.length > 0 ? (
            <>
              <div className="featured-left" onClick={() => navigate(`/noticia/${featuredNews[0].id}`)}>
                <img src={featuredNews[0].contentImage} alt={featuredNews[0].nombre_noticia} />
                <div className="overlay">
                  <h1 style={{ color: 'white' }}>{featuredNews[0].nombre_noticia}</h1>
                  <p>{new Date(featuredNews[0].fecha_publicacion).toLocaleDateString()}</p>
                  {featuredNews[0].autorData && (
                    <p className="author" style={{ marginTop: '-5px' }}>
                      por {featuredNews[0].autorData.nombre} {featuredNews[0].autorData.apellido}
                    </p>
                  )}
                </div>
              </div>

              <div className="featured-right">
                {featuredNews.slice(1, 3).map((newsItem) => (
                  <div
                    key={newsItem.id}
                    className="carousel-item"
                    onClick={() => navigate(`/noticia/${newsItem.id}`)}
                  >
                    <img src={newsItem.contentImage} alt={newsItem.nombre_noticia} />
                    <div className="gradient-overlay"></div>
                    <div className="carousel-caption">
                      <h3 style={{ color: 'white' }}>{newsItem.nombre_noticia}</h3>
                      <p>{new Date(newsItem.fecha_publicacion).toLocaleDateString()}</p>
                      {newsItem.autorData && (
                        <p className="author">
                          por {newsItem.autorData.nombre} {newsItem.autorData.apellido}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="no-featured-news">
              <h2>No hay noticias destacadas disponibles</h2>
            </div>
          )}
        </div>

        <div className="sections-and-recent-news">
          <div className="news-sections">
            {Object.entries(sectionNews).map(([sectionTitle, newsArray]) =>
              renderNewsSection(newsArray, sectionTitle)
            )}
          </div>

          <div className="recent-news">
            {renderRecentNews(recentNews)}
            {renderMostViewedNews(mostViewedNews)}
          </div>
        </div>
      </main>
    </div>
  );
};

export default HomePage;