import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import './home.css';
import api from '../context/axiosConfig';

// Funciones utilitarias memoizadas y optimizadas
const extractFirstImageFromContent = (htmlContent) => {
  if (!htmlContent) return null;
  const imgRegex = /<img[^>]+src=["']([^"']+)["'][^>]*>/i;
  const match = htmlContent.match(imgRegex);
  return match ? match[1] : null;
};

const generateNewsUrl = (newsItem) => {
  return newsItem.slug ? `/noticia/${newsItem.id}-${newsItem.slug}` : `/noticia/${newsItem.id}`;
};

// Cache para autores y editores
const authorCache = new Map();
const editorCache = new Map();

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

  // Funciones de procesamiento de contenido memoizadas
  const stripHtml = useCallback((html) => {
    if (!html) return "";
    return html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
  }, []);

  const getFirstParagraphContent = useCallback((content) => {
    const plainText = stripHtml(content);
    const words = plainText.split(/\s+/);
    return words.slice(0, 13).join(' ') + (words.length > 13 ? '...' : '');
  }, [stripHtml]);

  const truncateTitle = useCallback((title, maxLength) => {
    return title?.length > maxLength ? title.slice(0, maxLength) + '...' : title;
  }, []);

  const truncateContent = useCallback((content, type) => {
    const plainText = stripHtml(content);
    const limits = {
      'default': 20,
      'main': 150,
      'secondary': 10,
      'recent': 20
    };
    const limit = limits[type] || plainText.length;
    return plainText ? (plainText.length > limit ? plainText.slice(0, limit) + '...' : plainText) : '';
  }, [stripHtml]);

  // Procesamiento optimizado de noticias con imágenes
  const processNewsWithImages = useCallback((newsItems) => {
    if (!Array.isArray(newsItems)) return [];
    
    return newsItems.map(newsItem => {
      const contentImage = extractFirstImageFromContent(newsItem.contenido);
      const finalImage = contentImage || newsItem.imagen_1 || newsItem.imagen_cabecera || '/path/to/placeholder.jpg';
      
      return {
        ...newsItem,
        contentImage: finalImage
      };
    });
  }, []);

  // Fetch optimizado de autores con cache y batch requests
  const fetchAuthorsAndEditors = useCallback(async (newsList) => {
    if (!newsList || newsList.length === 0) return;
    
    const uniqueAuthorIds = new Set();
    const uniqueEditorIds = new Set();
    
    newsList.forEach(newsItem => {
      if (newsItem.autor && !authorCache.has(newsItem.autor)) {
        uniqueAuthorIds.add(newsItem.autor);
      }
      if (newsItem.editor_en_jefe && !editorCache.has(newsItem.editor_en_jefe)) {
        uniqueEditorIds.add(newsItem.editor_en_jefe);
      }
    });
    
    // Batch requests para autores y editores
    const fetchBatch = async (ids, cache, endpoint = 'trabajadores') => {
      if (ids.size === 0) return;
      
      const promises = Array.from(ids).map(async id => {
        try {
          const response = await api.get(`${endpoint}/${id}/`);
          cache.set(id, response.data);
        } catch (error) {
          console.error(`Error fetching ${endpoint} ${id}:`, error);
        }
      });
      
      await Promise.allSettled(promises);
    };
    
    // Ejecutar requests en paralelo
    await Promise.all([
      fetchBatch(uniqueAuthorIds, authorCache),
      fetchBatch(uniqueEditorIds, editorCache)
    ]);
    
    // Aplicar datos de cache a las noticias
    newsList.forEach(newsItem => {
      if (newsItem.autor && authorCache.has(newsItem.autor)) {
        newsItem.autorData = authorCache.get(newsItem.autor);
      }
      if (newsItem.editor_en_jefe && editorCache.has(newsItem.editor_en_jefe)) {
        newsItem.editorData = editorCache.get(newsItem.editor_en_jefe);
      }
    });
  }, []);

  // Limpieza optimizada
  useEffect(() => {
    return () => {
      abortController.current.abort();
      if (carouselInterval.current) {
        clearInterval(carouselInterval.current);
      }
    };
  }, []);

  // Configuración de secciones memoizada
  const mainSections = useMemo(() => ({
    'Politica': ['nacion','legislativos', 'policiales', 'elecciones', 'gobierno', 'provincias', 'capital'],
    'Cultura': ['cine', 'literatura', 'salud', 'tecnologia', 'eventos', 'educacion', 'efemerides','deporte'],
    'Economia': ['finanzas', 'comercio_internacional', 'politica_economica', 'dolar', 'pobreza_e_inflacion'],
    'Mundo': ['estados_unidos', 'asia', 'medio_oriente', 'internacional','latinoamerica'],
    'Tipos de notas': ['de_analisis', 'de_opinion','informativas','entrevistas']
  }), []);

  // Fetch functions optimizadas
  const fetchFeaturedNews = useCallback(async (signal) => {
    try {
      const response = await api.get('noticias/destacadas/', {
        params: { limit: 12 },
        signal
      });
      
      const filteredNews = response.data.filter(newsItem => newsItem.estado === 3);
      const newsWithImages = processNewsWithImages(filteredNews);
      
      // Actualizar estado inmediatamente
      setFeaturedNews(newsWithImages);
      setLoadingStates(prev => ({ ...prev, featured: false }));
      
      // Buscar autores en background
      fetchAuthorsAndEditors(filteredNews).then(() => {
        setFeaturedNews(processNewsWithImages(filteredNews));
      });
    } catch (error) {
      if (!signal.aborted) {
        console.error('Failed to fetch featured news:', error);
        setLoadingStates(prev => ({ ...prev, featured: false }));
      }
    }
  }, [processNewsWithImages, fetchAuthorsAndEditors]);

  const fetchSectionNews = useCallback(async (signal) => {
    try {
      // Crear todas las promesas de una vez
      const sectionPromises = Object.entries(mainSections).map(async ([mainSection, subcategories]) => {
        const categoriaParam = subcategories.join(',');
        
        try {
          const response = await api.get('noticias/por_categoria/', {
            params: {
              categoria: categoriaParam,
              estado: 3,
              limit: 7
            },
            signal
          });
          
          const processedNews = processNewsWithImages(response.data);
          
          // Actualizar estado inmediatamente para esta sección
          setSectionNews(prevState => ({
            ...prevState,
            [mainSection]: processedNews
          }));
          
          // Buscar autores en background
          fetchAuthorsAndEditors(response.data).then(() => {
            setSectionNews(prevState => ({
              ...prevState,
              [mainSection]: processNewsWithImages(response.data)
            }));
          });
          
        } catch (error) {
          if (!signal.aborted) {
            console.error(`Failed to fetch ${mainSection} news:`, error);
            setSectionNews(prevState => ({
              ...prevState,
              [mainSection]: []
            }));
          }
        }
      });
      
      // Esperar a que terminen todas las secciones
      await Promise.allSettled(sectionPromises);
      setLoadingStates(prev => ({ ...prev, sections: false }));
      
    } catch (error) {
      if (!signal.aborted) {
        console.error('Failed to fetch section news:', error);
        setLoadingStates(prev => ({ ...prev, sections: false }));
      }
    }
  }, [mainSections, processNewsWithImages, fetchAuthorsAndEditors]);

  const fetchRecentNews = useCallback(async (signal) => {
    try {
      const response = await api.get('noticias/recientes/', {
        params: { limit: 5 },
        signal
      });
      
      const newsWithImages = processNewsWithImages(response.data);
      setRecentNews(newsWithImages);
      setLoadingStates(prev => ({ ...prev, recent: false }));
      
      fetchAuthorsAndEditors(response.data).then(() => {
        setRecentNews(processNewsWithImages(response.data));
      });
    } catch (error) {
      if (!signal.aborted) {
        console.error('Failed to fetch recent news:', error);
        setLoadingStates(prev => ({ ...prev, recent: false }));
      }
    }
  }, [processNewsWithImages, fetchAuthorsAndEditors]);
  
  const fetchMostViewedNews = useCallback(async (signal) => {
    try {
      const response = await api.get('noticias/mas_vistas/', {
        params: { limit: 5 },
        signal
      });
      
      const newsWithImages = processNewsWithImages(response.data);
      setMostViewedNews(newsWithImages);
      setLoadingStates(prev => ({ ...prev, mostViewed: false }));
      
      fetchAuthorsAndEditors(response.data).then(() => {
        setMostViewedNews(processNewsWithImages(response.data));
      });
    } catch (error) {
      if (!signal.aborted) {
        console.error('Failed to fetch most viewed news:', error);
        setLoadingStates(prev => ({ ...prev, mostViewed: false }));
      }
    }
  }, [processNewsWithImages, fetchAuthorsAndEditors]);

  // Effect principal optimizado - fetch en paralelo real
  useEffect(() => {
    abortController.current = new AbortController();
    const signal = abortController.current.signal;

    // Ejecutar TODAS las peticiones en paralelo desde el inicio
    Promise.all([
      fetchFeaturedNews(signal),
      fetchSectionNews(signal),
      fetchRecentNews(signal),
      fetchMostViewedNews(signal)
    ]);
  }, [fetchFeaturedNews, fetchSectionNews, fetchRecentNews, fetchMostViewedNews]);

  // Carousel handlers optimizados
  const handlePauseToggle = useCallback(() => {
    setIsPaused(!isPaused);
    if (carouselInterval.current) {
      clearInterval(carouselInterval.current);
    }
  }, [isPaused]);

  const handleNextSlide = useCallback(() => {
    setCurrentSlide((prev) => (prev + 1) % totalSlides);
  }, []);

  const handlePrevSlide = useCallback(() => {
    setCurrentSlide((prev) => (prev - 1 + totalSlides) % totalSlides);
  }, []);

  const handleDotClick = useCallback((index) => {
    setCurrentSlide(index);
  }, []);

  // Efecto de carrusel optimizado
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

  // Componentes de skeleton memoizados
  const MainArticleSkeleton = useMemo(() => (
    <div className="main-article skeleton">
      <div className="recent-new skeleton-img"></div>
      <div className="main-article-content">
        <div className="skeleton-line title"></div>
        <div className="skeleton-line meta"></div>
        <div className="skeleton-line"></div>
        <div className="skeleton-line"></div>
      </div>
    </div>
  ), []);

  const SecondaryArticleSkeleton = useMemo(() => (
    <div className="secondary-article skeleton">
      <div className="secondary-article-img skeleton-img"></div>
      <div className="secondary-article-content">
        <div className="skeleton-line title"></div>
        <div className="skeleton-line meta"></div>
      </div>
    </div>
  ), []);

  const RecentNewsSkeleton = useMemo(() => (
    <div className="recent-news-item skeleton">
      <div className="recent-new skeleton-img"></div>
      <div className="recent-news-content">
        <div className="skeleton-line title"></div>
        <div className="skeleton-line meta"></div>
      </div>
    </div>
  ), []);

  // Funciones de renderizado memoizadas
  const renderNewsSection = useCallback((newsArray, sectionTitle) => {
    const isLoading = loadingStates.sections;
    
    return (
      <div className="news-section" key={sectionTitle}>
        <h2 className="section-title">{sectionTitle.toUpperCase()}</h2>
        <div className="news-grid">
          {isLoading ? (
            <>
              {MainArticleSkeleton}
              <div className="secondary-articles">
                {[...Array(4)].map((_, idx) => (
                  <div key={idx}>{SecondaryArticleSkeleton}</div>
                ))}
              </div>
            </>
          ) : newsArray && newsArray.length > 0 ? (
            <>
              <div className="main-article" onClick={() => navigate(generateNewsUrl(newsArray[0]))}>
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
                    onClick={() => navigate(generateNewsUrl(newsItem))}
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
  }, [loadingStates.sections, navigate, truncateTitle, getFirstParagraphContent, MainArticleSkeleton, SecondaryArticleSkeleton]);

  const renderRecentNews = useCallback((recentNewsArray) => {
    const isLoading = loadingStates.recent;
    
    return (
      <div className="recent-news-section">
        <h2 className="section-titleNR">NOTICIAS RECIENTES</h2>
        <div className="recent-news-list">
          {isLoading ? (
            [...Array(5)].map((_, idx) => (
              <div key={idx}>{RecentNewsSkeleton}</div>
            ))
          ) : recentNewsArray && recentNewsArray.length > 0 ? (
            recentNewsArray.map(newsItem => (
              <div
                key={newsItem.id}
                className="recent-news-item"
                onClick={() => navigate(generateNewsUrl(newsItem))}
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
  }, [loadingStates.recent, navigate, RecentNewsSkeleton]);

  const renderMostViewedNews = useCallback((mostViewedNewsArray) => {
    const isLoading = loadingStates.mostViewed;
    
    return (
      <div className="recent-news-section">
        <h2 className="section-titleNR">MÁS LEÍDAS</h2>
        <div className="recent-news-list">
          {isLoading ? (
            [...Array(5)].map((_, idx) => (
              <div key={idx}>{RecentNewsSkeleton}</div>
            ))
          ) : mostViewedNewsArray && mostViewedNewsArray.length > 0 ? (
            mostViewedNewsArray.map(newsItem => (
              <div
                key={newsItem.id}
                className="recent-news-item"
                onClick={() => navigate(generateNewsUrl(newsItem))}
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
  }, [loadingStates.mostViewed, navigate, RecentNewsSkeleton]);

  // Formatear fecha memoizada
  const formatDate = useCallback((dateString) => {
    const date = new Date(dateString);
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  }, []);

  const renderFeaturedCarousel = useCallback(() => {
    const isLoading = loadingStates.featured;
    
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
                  onClick={() => navigate(generateNewsUrl(slideNews[0]))}
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
                      onClick={() => navigate(generateNewsUrl(newsItem))}
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
  }, [loadingStates.featured, featuredNews, currentSlide, handlePrevSlide, handleNextSlide, handlePauseToggle, isPaused, navigate, formatDate, handleDotClick]);

  // Estilos de skeleton memoizados
  const SkeletonStyles = useMemo(() => (
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
  ), []);

  return (
    <div className="container">
      {SkeletonStyles}
      
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