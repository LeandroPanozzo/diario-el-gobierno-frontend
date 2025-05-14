import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import './home.css';
import api from '../context/axiosConfig';

// Función para extraer la primera imagen del contenido HTML
const extractFirstImageFromContent = (htmlContent) => {
  if (!htmlContent) return null;
  
  // Usar expresión regular para encontrar la primera imagen más rápido que DOM
  const imgRegex = /<img[^>]+src=["']([^"']+)["'][^>]*>/i;
  const match = htmlContent.match(imgRegex);
  
  return match ? match[1] : null;
};

const HomePage = () => {
  const [featuredNews, setFeaturedNews] = useState([]);
  const [sectionNews, setSectionNews] = useState({});
  const [recentNews, setRecentNews] = useState([]);
  const [mostViewedNews, setMostViewedNews] = useState([]);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [loadingStates, setLoadingStates] = useState({
    featured: true,
    sections: true,
    recent: true,
    mostViewed: true
  });
  const totalSlides = 4;
  const navigate = useNavigate();
  const carouselInterval = useRef(null);
  const [isPaused, setIsPaused] = useState(false);
  const abortController = useRef(new AbortController());

  // Content processing functions - Optimized
  const stripHtml = (html) => {
    if (!html) return "";
    return html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
  };

  const getFirstParagraphContent = (content) => {
    const plainText = stripHtml(content);
    const words = plainText.split(/\s+/);
    return words.slice(0, 13).join(' ') + (words.length > 13 ? '...' : '');
  };

  const truncateTitle = (title, maxLength) => {
    return title?.length > maxLength ? title.slice(0, maxLength) + '...' : title;
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

  // Procesar los datos de noticias para extraer imágenes del contenido - Optimizado
  const processNewsWithImages = (newsItems) => {
    return newsItems.map(newsItem => {
      // Extraer la primera imagen del contenido
      const contentImage = extractFirstImageFromContent(newsItem.contenido);
      
      // Si encontramos una imagen en el contenido, la usamos. De lo contrario, usamos imagen_1 o imagen_cabecera
      const finalImage = contentImage || newsItem.imagen_1 || newsItem.imagen_cabecera || '/path/to/placeholder.jpg';
      
      return {
        ...newsItem,
        contentImage: finalImage
      };
    });
  };

  // Limpieza al desmontar el componente
  useEffect(() => {
    return () => {
      // Cancelar todas las solicitudes pendientes cuando el componente se desmonte
      abortController.current.abort();
      if (carouselInterval.current) {
        clearInterval(carouselInterval.current);
      }
    };
  }, []);

  // Cargar datos de forma incremental
  useEffect(() => {
    // Creamos un nuevo controlador para cada set de solicitudes
    abortController.current = new AbortController();
    const signal = abortController.current.signal;

    // Cargar datos de forma paralela pero independiente
    fetchFeaturedNews(signal);
    fetchSectionNews(signal);
    fetchRecentNews(signal);
    fetchMostViewedNews(signal);
  }, []);

  const fetchFeaturedNews = async (signal) => {
    try {
      const response = await api.get('noticias/destacadas/', {
        params: { limit: 12 },
        signal
      });
      
      const filteredNews = response.data.filter(newsItem => newsItem.estado === 3);
      // Procesar noticias antes de buscar autores para mostrar UI más rápido
      const newsWithImages = processNewsWithImages(filteredNews);
      setFeaturedNews(newsWithImages);
      setLoadingStates(prev => ({ ...prev, featured: false }));
      
      // Buscar datos de autores después - mejora progresiva
      fetchAuthorsAndEditors(filteredNews).then(() => {
        setFeaturedNews([...processNewsWithImages(filteredNews)]);
      });
    } catch (error) {
      if (!signal.aborted) {
        console.error('Failed to fetch featured news:', error);
        setLoadingStates(prev => ({ ...prev, featured: false }));
      }
    }
  };

  const fetchSectionNews = async (signal) => {
    const mainSections = {
      'Politica': ['nacion','legislativos', 'policiales', 'elecciones', 'gobierno', 'provincias', 'capital'],
      'Cultura': ['cine', 'literatura', 'salud', 'tecnologia', 'eventos', 'educacion', 'efemerides','deporte'],
      'Economia': ['finanzas', 'comercio_internacional', 'politica_economica', 'dolar', 'pobreza_e_inflacion'],
      'Mundo': ['estados_unidos', 'asia', 'medio_oriente', 'internacional','latinoamerica'],
      'Tipos de notas': ['de_analisis', 'de_opinion','informativas','entrevistas']
    };

    try {
      const newSectionNews = {};
      const sectionPromises = [];
      
      // Crear todas las promesas primero
      for (const [mainSection, subcategories] of Object.entries(mainSections)) {
        const categoriaParam = subcategories.join(',');
        
        const promise = api.get('noticias/por_categoria/', {
          params: {
            categoria: categoriaParam,
            estado: 3,
            limit: 7
          },
          signal
        })
        .then(response => {
          // Procesar imágenes inmediatamente para mostrar noticias
          const processedNews = processNewsWithImages(response.data);
          newSectionNews[mainSection] = processedNews;
          // Actualizar el estado inmediatamente con lo que tengamos
          setSectionNews(prevState => ({
            ...prevState,
            [mainSection]: processedNews
          }));
          
          // Buscar autores en segundo plano
          return fetchAuthorsAndEditors(response.data).then(() => {
            // Actualizar con autores cuando estén listos
            setSectionNews(prevState => ({
              ...prevState,
              [mainSection]: [...processNewsWithImages(response.data)]
            }));
          });
        })
        .catch(error => {
          if (!signal.aborted) {
            console.error(`Failed to fetch ${mainSection} news:`, error);
            newSectionNews[mainSection] = [];
          }
        });
        
        sectionPromises.push(promise);
      }
      
      // Esperar a que se completen todas las promesas pero ya mostramos UI
      Promise.all(sectionPromises).finally(() => {
        setLoadingStates(prev => ({ ...prev, sections: false }));
      });
    } catch (error) {
      if (!signal.aborted) {
        console.error('Failed to fetch section news:', error);
        setLoadingStates(prev => ({ ...prev, sections: false }));
      }
    }
  };

  const fetchRecentNews = async (signal) => {
    try {
      const response = await api.get('noticias/recientes/', {
        params: { limit: 5 },
        signal
      });
      
      // Procesar imágenes inmediatamente para mostrar UI
      const newsWithImages = processNewsWithImages(response.data);
      setRecentNews(newsWithImages);
      setLoadingStates(prev => ({ ...prev, recent: false }));
      
      // Buscar autores después - mejora progresiva
      fetchAuthorsAndEditors(response.data).then(() => {
        setRecentNews([...processNewsWithImages(response.data)]);
      });
    } catch (error) {
      if (!signal.aborted) {
        console.error('Failed to fetch recent news:', error);
        setLoadingStates(prev => ({ ...prev, recent: false }));
      }
    }
  };
  
  const fetchMostViewedNews = async (signal) => {
    try {
      const response = await api.get('noticias/mas_vistas/', {
        params: { limit: 5 },
        signal
      });
      
      // Procesar imágenes inmediatamente para mostrar UI
      const newsWithImages = processNewsWithImages(response.data);
      setMostViewedNews(newsWithImages);
      setLoadingStates(prev => ({ ...prev, mostViewed: false }));
      
      // Buscar autores después - mejora progresiva
      fetchAuthorsAndEditors(response.data).then(() => {
        setMostViewedNews([...processNewsWithImages(response.data)]);
      });
    } catch (error) {
      if (!signal.aborted) {
        console.error('Failed to fetch most viewed news:', error);
        setLoadingStates(prev => ({ ...prev, mostViewed: false }));
      }
    }
  };

  // Optimizado para usar lotes y caché
  const fetchAuthorsAndEditors = async (newsList) => {
    if (!newsList || newsList.length === 0) return;
    
    // Crear un conjunto para evitar solicitudes duplicadas
    const uniqueAuthorIds = new Set();
    const uniqueEditorIds = new Set();
    
    // Recopilar IDs únicos
    newsList.forEach(newsItem => {
      if (newsItem.autor) uniqueAuthorIds.add(newsItem.autor);
      if (newsItem.editor_en_jefe) uniqueEditorIds.add(newsItem.editor_en_jefe);
    });
    
    // Cache para almacenar respuestas
    const authorCache = {};
    const editorCache = {};
    
    // Función para procesar lotes de solicitudes
    const processBatch = async (ids, endpoint, cache) => {
      const promises = Array.from(ids).map(id => 
        api.get(`trabajadores/${id}/`)
          .then(response => {
            cache[id] = response.data;
          })
          .catch(error => {
            console.error(`Error fetching data for ID ${id}:`, error);
          })
      );
      
      await Promise.allSettled(promises);
    };
    
    // Procesar autores y editores en paralelo
    await Promise.all([
      processBatch(uniqueAuthorIds, 'trabajadores', authorCache),
      processBatch(uniqueEditorIds, 'trabajadores', editorCache)
    ]);
    
    // Aplicar datos de caché a las noticias
    newsList.forEach(newsItem => {
      if (newsItem.autor && authorCache[newsItem.autor]) {
        newsItem.autorData = authorCache[newsItem.autor];
      }
      if (newsItem.editor_en_jefe && editorCache[newsItem.editor_en_jefe]) {
        newsItem.editorData = editorCache[newsItem.editor_en_jefe];
      }
    });
  };

  // Efecto para controlar el carrusel automático
  useEffect(() => {
    const isAnyLoading = Object.values(loadingStates).some(state => state);
    
    if (!isPaused && !isAnyLoading) {
      carouselInterval.current = setInterval(() => {
        setCurrentSlide((prev) => (prev + 1) % totalSlides);
      }, 5000);
    }

    return () => {
      if (carouselInterval.current) {
        clearInterval(carouselInterval.current);
      }
    };
  }, [isPaused, loadingStates]);

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
    
    const isAnyLoading = Object.values(loadingStates).some(state => state);
    
    if (!isPaused && !isAnyLoading) {
      carouselInterval.current = setInterval(() => {
        setCurrentSlide((prev) => (prev + 1) % totalSlides);
      }, 5000);
    }
  };

  // Componente de esqueleto para artículos principales
  const MainArticleSkeleton = () => (
    <div className="main-article skeleton">
      <div className="recent-new skeleton-img"></div>
      <div className="main-article-content">
        <div className="skeleton-line title"></div>
        <div className="skeleton-line meta"></div>
        <div className="skeleton-line"></div>
        <div className="skeleton-line"></div>
      </div>
    </div>
  );

  // Componente de esqueleto para artículos secundarios
  const SecondaryArticleSkeleton = () => (
    <div className="secondary-article skeleton">
      <div className="secondary-article-img skeleton-img"></div>
      <div className="secondary-article-content">
        <div className="skeleton-line title"></div>
        <div className="skeleton-line meta"></div>
      </div>
    </div>
  );

  // Componente de esqueleto para noticias recientes
  const RecentNewsSkeleton = () => (
    <div className="recent-news-item skeleton">
      <div className="recent-new skeleton-img"></div>
      <div className="recent-news-content">
        <div className="skeleton-line title"></div>
        <div className="skeleton-line meta"></div>
      </div>
    </div>
  );

  const renderNewsSection = (newsArray, sectionTitle) => {
    const isLoading = loadingStates.sections;
    
    return (
      <div className="news-section" key={sectionTitle}>
        <h2 className="section-title">{sectionTitle.toUpperCase()}</h2>
        <div className="news-grid">
          {isLoading ? (
            <>
              <MainArticleSkeleton />
              <div className="secondary-articles">
                {[...Array(4)].map((_, idx) => (
                  <SecondaryArticleSkeleton key={idx} />
                ))}
              </div>
            </>
          ) : newsArray && newsArray.length > 0 ? (
            <>
              <div className="main-article" onClick={() => navigate(`/noticia/${newsArray[0].id}`)}>
                <div className='recent-new'>
                  <img 
                    src={newsArray[0].contentImage} 
                    alt={newsArray[0].nombre_noticia}
                    loading="lazy" 
                  />
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
              <div className="secondary-articles">
                {newsArray.slice(1, 5).map((newsItem) => (
                  <div
                    key={newsItem.id}
                    className="secondary-article"
                    onClick={() => navigate(`/noticia/${newsItem.id}`)}
                  >
                    <div className='secondary-article-img'>
                      <img 
                        src={newsItem.contentImage} 
                        alt={newsItem.nombre_noticia}
                        loading="lazy" 
                      />
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
            <p>No hay noticias disponibles</p>
          )}
        </div>
      </div>
    );
  };

  const renderRecentNews = (recentNewsArray) => {
    const isLoading = loadingStates.recent;
    
    return (
      <div className="recent-news-section">
        <h2 className="section-title">NOTICIAS RECIENTES</h2>
        <div className="recent-news-list">
          {isLoading ? (
            [...Array(5)].map((_, idx) => (
              <RecentNewsSkeleton key={idx} />
            ))
          ) : recentNewsArray && recentNewsArray.length > 0 ? (
            recentNewsArray.map(newsItem => (
              <div
                key={newsItem.id}
                className="recent-news-item"
                onClick={() => navigate(`/noticia/${newsItem.id}`)}
              >
                <div className='recent-new'>
                  <img 
                    src={newsItem.contentImage} 
                    alt={newsItem.nombre_noticia} 
                    className="recent-news-image"
                    loading="lazy" 
                  />
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
  };

  const renderMostViewedNews = (mostViewedNewsArray) => {
    const isLoading = loadingStates.mostViewed;
    
    return (
      <div className="recent-news-section">
        <h2 className="section-title">MÁS LEÍDAS</h2>
        <div className="recent-news-list">
          {isLoading ? (
            [...Array(5)].map((_, idx) => (
              <RecentNewsSkeleton key={idx} />
            ))
          ) : mostViewedNewsArray && mostViewedNewsArray.length > 0 ? (
            mostViewedNewsArray.map(newsItem => (
              <div
                key={newsItem.id}
                className="recent-news-item"
                onClick={() => navigate(`/noticia/${newsItem.id}`)}
              >
                <div className='recent-new'>
                  <img 
                    src={newsItem.contentImage} 
                    alt={newsItem.nombre_noticia} 
                    className="recent-news-image"
                    loading="lazy" 
                  />
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
  };

  const renderFeaturedCarousel = () => {
    const isLoading = loadingStates.featured;
    
    // Función para formatear fechas en formato dd/mm/yyyy
    const formatDate = (dateString) => {
      const date = new Date(dateString);
      const day = date.getDate().toString().padStart(2, '0');
      const month = (date.getMonth() + 1).toString().padStart(2, '0');
      const year = date.getFullYear();
      return `${day}/${month}/${year}`;
    };
    
    if (isLoading) {
      return (
        <div className="carousel-wrapper">
          <div className="carousel-container skeleton-carousel">
            <div className="slide active">
              <div className="featured-left skeleton">
                <div className="skeleton-img"></div>
                <div className="overlay">
                  <div className="skeleton-line title"></div>
                  <div className="skeleton-line meta"></div>
                </div>
              </div>
              <div className="featured-right">
                {[...Array(2)].map((_, idx) => (
                  <div key={idx} className="carousel-item skeleton">
                    <div className="skeleton-img"></div>
                    <div className="carousel-caption">
                      <div className="skeleton-line title"></div>
                      <div className="skeleton-line meta"></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      );
    }
    
    if (!featuredNews || featuredNews.length === 0) return null;
    
    return (
      <div className="carousel-wrapper">
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
        
        <div 
          className="carousel-pause-indicator" 
          onClick={handlePauseToggle}
        >
          {isPaused ? "▶ Play" : "❚❚ Pause"}
        </div>

        <div className="carousel-container">
          {Array.from({ length: totalSlides }).map((_, slideIndex) => {
            const startIdx = slideIndex * 3;
            const slideNews = featuredNews.slice(startIdx, startIdx + 3);
            
            if (slideNews.length === 0) return null;
            
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
                <div 
                  className="featured-left" 
                  onClick={() => navigate(`/noticia/${slideNews[0]?.id}`)}
                >
                  <img 
                    src={slideNews[0]?.contentImage} 
                    alt={slideNews[0]?.nombre_noticia}
                    loading={slideIndex === 0 ? "eager" : "lazy"} 
                  />
                  <div className="overlay">
                    <h1 style={{ color: '#ffff' }}>{slideNews[0]?.nombre_noticia}</h1>
                    <p style={{ color: '#ffff' }}>{formatDate(slideNews[0]?.fecha_publicacion)}</p>
                    {slideNews[0]?.autorData && (
                      <p className="author" style={{ marginTop: '-5px', color: '#ffff' }}>
                        por {slideNews[0]?.autorData.nombre} {slideNews[0]?.autorData.apellido}
                      </p>
                    )}
                  </div>
                </div>

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
                        loading={slideIndex === 0 ? "eager" : "lazy"} 
                      />
                      <div className="carousel-caption">
                        <h3>{newsItem.nombre_noticia}</h3>
                        <p>{formatDate(newsItem.fecha_publicacion)}</p>
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

  // Reglas CSS para los esqueletos de carga
  const SkeletonStyles = () => (
    <style>{`
      .skeleton {
        animation: pulse 1.5s infinite alternate;
        background: #f0f0f0;
      }
      
      .skeleton-img {
        width: 100%;
        height: 200px;
        background: #e0e0e0;
        border-radius: 4px;
      }
      
      .skeleton-line {
        height: 12px;
        margin: 8px 0;
        background: #e0e0e0;
        border-radius: 2px;
      }
      
      .skeleton-line.title {
        height: 20px;
        width: 80%;
      }
      
      .skeleton-line.meta {
        width: 40%;
      }
      
      .recent-news-item.skeleton .skeleton-img {
        height: 80px;
      }
      
      @keyframes pulse {
        0% {
          opacity: 0.6;
        }
        100% {
          opacity: 1;
        }
      }
    `}</style>
  );

  // Determinar si debe mostrar la pantalla de carga completa
  const isFullyLoading = Object.values(loadingStates).every(state => state);

  return (
    <div className="container">
      <SkeletonStyles />
      
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