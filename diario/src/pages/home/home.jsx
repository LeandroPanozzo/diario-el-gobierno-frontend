import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
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
  const [currentSlide, setCurrentSlide] = useState(0);
  const totalSlides = 4; // Total de grupos de noticias para el carrusel
  const navigate = useNavigate();
  const carouselInterval = useRef(null);
  const [isPaused, setIsPaused] = useState(false);

  // Content processing functions
  const stripHtml = (html) => {
    const doc = new DOMParser().parseFromString(html, 'text/html');
    return doc.body.textContent || "";
  };

  const getFirstParagraphContent = (content) => {
    const plainText = stripHtml(content);
    const words = plainText.split(/\s+/);
    return words.slice(0, 13).join(' ') + (words.length > 13 ? '...' : '');
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
    const fetchFeaturedNews = async () => {
      try {
        // Usamos el endpoint destacadas para obtener noticias para el carrusel
        const response = await api.get('noticias/destacadas/', {
          params: { limit: 12 } // 12 noticias para el carrusel (4 slides x 3 noticias)
        });
        
        const filteredNews = response.data.filter(newsItem => newsItem.estado === 3);
        await fetchAuthorsAndEditors(filteredNews);
        const processedNews = processNewsWithImages(filteredNews);
        setFeaturedNews(processedNews);
      } catch (error) {
        console.error('Failed to fetch featured news:', error);
      }
    };

    const fetchSectionNews = async () => {
      // Definir las secciones principales y sus subcategorías
      const mainSections = {
        'Politica': ['nacion','legislativos', 'policiales', 'elecciones', 'gobierno', 'provincias', 'capital'],
        'Cultura': ['cine', 'literatura', 'salud', 'tecnologia', 'eventos', 'educacion', 'efemerides','deporte'],
        'Economia': ['finanzas', 'comercio_internacional', 'politica_economica', 'dolar', 'pobreza_e_inflacion'],
        'Mundo': ['estados_unidos', 'asia', 'medio_oriente', 'internacional','latinoamerica'],
        'Tipos de notas': ['de_analisis', 'de_opinion','informativas','entrevistas']
      };

      try {
        const newSectionNews = {};
        
        // Obtener noticias para cada sección usando el endpoint por_categoria
        for (const [mainSection, subcategories] of Object.entries(mainSections)) {
          try {
            // Creamos una string con las categorías separadas por coma
            const categoriaParam = subcategories.join(',');
            
            // Llamamos al endpoint por_categoria con las categorías de esta sección
            const response = await api.get('noticias/por_categoria/', {
              params: {
                categoria: categoriaParam,
                estado: 3, // Solo noticias publicadas
                limit: 7 // Limitamos a 7 noticias por sección
              }
            });
            
            await fetchAuthorsAndEditors(response.data);
            const processedNews = processNewsWithImages(response.data);
            newSectionNews[mainSection] = processedNews;
          } catch (error) {
            console.error(`Failed to fetch ${mainSection} news:`, error);
            newSectionNews[mainSection] = []; // Aseguramos un array vacío en caso de error
          }
        }

        setSectionNews(newSectionNews);
      } catch (error) {
        console.error('Failed to fetch section news:', error);
      }
    };

    const fetchRecentNews = async () => {
      try {
        // Usamos el endpoint específico para noticias recientes
        const response = await api.get('noticias/recientes/', {
          params: { limit: 5 }
        });
        
        await fetchAuthorsAndEditors(response.data);
        const processedNews = processNewsWithImages(response.data);
        setRecentNews(processedNews);
      } catch (error) {
        console.error('Failed to fetch recent news:', error);
      }
    };
    
    const fetchMostViewedNews = async () => {
      try {
        // Usamos el endpoint específico para noticias más vistas
        const response = await api.get('noticias/mas_vistas/', {
          params: { limit: 5 }
        });
        
        await fetchAuthorsAndEditors(response.data);
        const processedNews = processNewsWithImages(response.data);
        setMostViewedNews(processedNews);
      } catch (error) {
        console.error('Failed to fetch most viewed news:', error);
      }
    };

    const fetchAuthorsAndEditors = async (newsList) => {
      for (const newsItem of newsList) {
        if (newsItem.autor) {
          try {
            const authorResponse = await api.get(`trabajadores/${newsItem.autor}/`);
            newsItem.autorData = authorResponse.data;
          } catch (error) {
            console.error('Error fetching author data:', error);
          }
        }
        if (newsItem.editor_en_jefe) {
          try {
            const editorResponse = await api.get(`trabajadores/${newsItem.editor_en_jefe}/`);
            newsItem.editorData = editorResponse.data;
          } catch (error) {
            console.error('Error fetching editor data:', error);
          }
        }
      }
    };

    fetchFeaturedNews();
    fetchSectionNews();
    fetchRecentNews();
    fetchMostViewedNews();
  }, []);

  // Efecto para controlar el carrusel automático
  useEffect(() => {
    if (!isPaused) {
      carouselInterval.current = setInterval(() => {
        setCurrentSlide((prev) => (prev + 1) % totalSlides);
      }, 5000); // Cambiar cada 5 segundos
    }

    return () => {
      if (carouselInterval.current) {
        clearInterval(carouselInterval.current);
      }
    };
  }, [isPaused]);

  const handlePauseToggle = () => {
    setIsPaused(!isPaused);
    if (carouselInterval.current) {
      clearInterval(carouselInterval.current);
    }
  };

  const handleNextSlide = () => {
    setCurrentSlide((prev) => (prev + 1) % totalSlides);
    resetCarouselTimer();
  };

  const handlePrevSlide = () => {
    setCurrentSlide((prev) => (prev - 1 + totalSlides) % totalSlides);
    resetCarouselTimer();
  };

  const handleDotClick = (index) => {
    setCurrentSlide(index);
    resetCarouselTimer();
  };

  const resetCarouselTimer = () => {
    if (carouselInterval.current) {
      clearInterval(carouselInterval.current);
    }
    
    if (!isPaused) {
      carouselInterval.current = setInterval(() => {
        setCurrentSlide((prev) => (prev + 1) % totalSlides);
      }, 5000);
    }
  };

  const renderNewsSection = (newsArray, sectionTitle) => (
    <div className="news-section" key={sectionTitle}>
      <h2 className="section-title">{sectionTitle.toUpperCase()}</h2>
      <div className="news-grid">
        {newsArray.length > 0 && (
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
              <p className="article-preview description">
                {getFirstParagraphContent(newsArray[0].contenido)}
              </p>
            </div>
          </div>
        )}
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
      </div>
    </div>
  );

  const renderRecentNews = (recentNewsArray) => (
    <div className="recent-news-section">
      <h2 className="section-title">NOTICIAS RECIENTES</h2>
      <div className="recent-news-list">
        {recentNewsArray.map(newsItem => (
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
        ))}
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

  const renderFeaturedCarousel = () => {
    if (featuredNews.length === 0) return null;
    
    return (
      <div className="carousel-wrapper">
        {/* Botones de navegación */}
        <button 
          className="carousel-arrow carousel-arrow-prev" 
          onClick={handlePrevSlide}
          aria-label="Anterior"
        >
          &#10094;
        </button>
        
        <button 
          className="carousel-arrow carousel-arrow-next" 
          onClick={handleNextSlide}
          aria-label="Siguiente"
        >
          &#10095;
        </button>
        
        {/* Botón de pausa/reproducción */}
        <div 
          className="carousel-pause-indicator" 
          onClick={handlePauseToggle}
        >
          {isPaused ? "▶ Play" : "❚❚ Pause"}
        </div>

        {/* Contenedor principal del carrusel */}
        <div className="carousel-container">
          {Array.from({ length: totalSlides }).map((_, slideIndex) => {
            const startIdx = slideIndex * 3;
            const slideNews = featuredNews.slice(startIdx, startIdx + 3);
            
            if (slideNews.length === 0) return null;
            
            // Determinar si este slide está activo (visible)
            const isActive = slideIndex === currentSlide;
            
            return (
              <div 
                key={`slide-${slideIndex}`} 
                className={`slide ${isActive ? 'active' : ''}`}
                style={{ 
                  transform: `translateX(${(slideIndex - currentSlide) * 100}%)`,
                  opacity: isActive ? 1 : 0.5,
                  transition: 'transform 0.6s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.3s ease'
                }}
              >
                {/* Artículo principal (izquierda en desktop, arriba en móvil) */}
                <div 
                  className="featured-left" 
                  onClick={() => navigate(`/noticia/${slideNews[0]?.id}`)}
                >
                  <img src={slideNews[0]?.contentImage} alt={slideNews[0]?.nombre_noticia} />
                  <div className="overlay">
                    <h1 style={{ color: '#ffff' }}>{slideNews[0]?.nombre_noticia}</h1>
                    <p style={{ color: '#ffff' }}>{new Date(slideNews[0]?.fecha_publicacion).toLocaleDateString()}</p>
                    {slideNews[0]?.autorData && (
                      <p className="author" style={{ marginTop: '-5px', color: '#ffff' }}>
                        por {slideNews[0]?.autorData.nombre} {slideNews[0]?.autorData.apellido}
                      </p>
                    )}
                  </div>
                </div>

                {/* Artículos secundarios (derecha en desktop, abajo en móvil) */}
                <div className="featured-right">
                  {slideNews.slice(1, 3).map((newsItem, idx) => (
                    <div
                      key={newsItem.id}
                      className="carousel-item"
                      onClick={() => navigate(`/noticia/${newsItem.id}`)}
                    >
                      <img 
                        src={newsItem.contentImage} 
                        alt={newsItem.nombre_noticia} 
                        className="carousel-image"
                      />
                      <div className="carousel-caption">
                        <h3>{newsItem.nombre_noticia}</h3>
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
              </div>
            );
          })}
        </div>
        
        {/* Indicadores de navegación (puntos) */}
        <div className="carousel-dots">
          {Array.from({ length: totalSlides }).map((_, index) => (
            <span 
              key={`dot-${index}`}
              className={`carousel-dot ${currentSlide === index ? 'active' : ''}`}
              onClick={() => handleDotClick(index)}
              aria-label={`Ir a la diapositiva ${index + 1}`}
            />
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="container">
      <main>
        <div className="featured-article">
          {renderFeaturedCarousel()}
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