import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import './home.css';
import api from '../context/axiosConfig';

// ✅ Utilidades optimizadas
const extractFirstImageFromContent = (htmlContent) => {
  if (!htmlContent) return null;
  const imgMatch = htmlContent.match(/<img[^>]+src="([^">]+)"/);
  return imgMatch ? imgMatch[1] : null;
};

const generateNewsUrl = (newsItem) => {
  return newsItem.slug ? `/noticia/${newsItem.id}-${newsItem.slug}` : `/noticia/${newsItem.id}`;
};

const decodeHtmlEntities = (text) => {
  if (!text) return "";
  const textArea = document.createElement('textarea');
  textArea.innerHTML = text;
  return textArea.value;
};

const HomePage = () => {
  const [featuredNews, setFeaturedNews] = useState([]);
  const [sectionNews, setSectionNews] = useState({});
  const [recentNews, setRecentNews] = useState([]);
  const [mostViewedNews, setMostViewedNews] = useState([]);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const totalSlides = 4;
  const navigate = useNavigate();
  const carouselInterval = useRef(null);

  // ✅ Funciones de procesamiento memoizadas
  const stripHtml = useCallback((html) => {
    if (!html) return "";
    const stripped = html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
    return decodeHtmlEntities(stripped);
  }, []);

  const getFirstParagraphContent = useCallback((content) => {
    const plainText = stripHtml(content);
    const words = plainText.split(/\s+/);
    return words.slice(0, 13).join(' ') + (words.length > 13 ? '...' : '');
  }, [stripHtml]);

  const truncateTitle = useCallback((title, maxLength) => {
    return title?.length > maxLength ? title.slice(0, maxLength) + '...' : title;
  }, []);

  const formatDate = useCallback((dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString();
  }, []);

  // ✅ Procesar noticias con imágenes
  const processNewsWithImages = useCallback((newsItems) => {
    if (!Array.isArray(newsItems)) return [];
    
    return newsItems.map(newsItem => {
      const contentImage = extractFirstImageFromContent(newsItem.contenido);
      const finalImage = contentImage || newsItem.imagen_1 || '/path/to/placeholder.jpg';
      
      return {
        ...newsItem,
        contentImage: finalImage,
        autorData: {
          nombre: newsItem.autor_nombre || newsItem.autor__nombre,
          apellido: newsItem.autor_apellido || newsItem.autor__apellido,
          foto_perfil: newsItem.autor_foto || newsItem.autor__foto_perfil
        }
      };
    });
  }, []);

  // ✅ FETCH ÚNICO OPTIMIZADO - UNA SOLA REQUEST
  useEffect(() => {
    const fetchHomeData = async () => {
      try {
        setLoading(true);
        
        // ✅ Una única request al endpoint unificado
        const response = await api.get('home-data/');
        
        // Procesar todas las noticias en paralelo
        const [
          processedFeatured,
          processedRecent,
          processedMostViewed,
          processedSections
        ] = await Promise.all([
          Promise.resolve(processNewsWithImages(response.data.featured)),
          Promise.resolve(processNewsWithImages(response.data.recent)),
          Promise.resolve(processNewsWithImages(response.data.most_viewed)),
          Promise.resolve(
            Object.entries(response.data.sections).reduce((acc, [key, news]) => {
              acc[key] = processNewsWithImages(news);
              return acc;
            }, {})
          )
        ]);
        
        // Actualizar estados
        setFeaturedNews(processedFeatured);
        setRecentNews(processedRecent);
        setMostViewedNews(processedMostViewed);
        setSectionNews(processedSections);
        
      } catch (err) {
        console.error('Failed to fetch home data:', err);
        setError('Error al cargar las noticias. Por favor, intenta de nuevo.');
      } finally {
        setLoading(false);
      }
    };

    fetchHomeData();
  }, [processNewsWithImages]);

  // ✅ Carrusel automático
  useEffect(() => {
    if (!loading && featuredNews.length > 0) {
      carouselInterval.current = setInterval(() => {
        setCurrentSlide(prev => (prev + 1) % totalSlides);
      }, 5000);
    }

    return () => {
      if (carouselInterval.current) {
        clearInterval(carouselInterval.current);
      }
    };
  }, [loading, featuredNews.length]);

  // Handlers del carrusel
  const handleNextSlide = useCallback(() => {
    setCurrentSlide(prev => (prev + 1) % totalSlides);
  }, []);

  const handlePrevSlide = useCallback(() => {
    setCurrentSlide(prev => (prev - 1 + totalSlides) % totalSlides);
  }, []);

  const handleDotClick = useCallback((index) => {
    setCurrentSlide(index);
  }, []);

  // ✅ Componente de imagen optimizada
  const OptimizedImage = useCallback(({ 
    src, 
    alt, 
    className = "", 
    isCritical = false 
  }) => {
    const [isLoaded, setIsLoaded] = useState(false);
    
    return (
      <img
        src={src}
        alt={alt}
        className={`${className} ${isLoaded ? 'loaded' : 'loading'}`}
        onLoad={() => setIsLoaded(true)}
        loading={isCritical ? "eager" : "lazy"}
        decoding={isCritical ? "sync" : "async"}
        fetchpriority={isCritical ? "high" : undefined}
      />
    );
  }, []);

  // ✅ Skeletons memoizados
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

  // ✅ Renderizado de secciones optimizado
  const renderNewsSection = useCallback((newsArray, sectionTitle) => {
    if (!newsArray || newsArray.length === 0) {
      return (
        <div className="news-section" key={sectionTitle}>
          <h2 className="section-title">{sectionTitle.toUpperCase()}</h2>
          <div className="section-title-line"></div>
          <p>No hay noticias disponibles</p>
        </div>
      );
    }

    return (
      <div className="news-section" key={sectionTitle}>
        <h2 className="section-title">{sectionTitle.toUpperCase()}</h2>
        <div className="section-title-line"></div>
        <div className="news-grid">
          <div className="main-article" onClick={() => navigate(generateNewsUrl(newsArray[0]))}>
            <div className='recent-new'>
              <OptimizedImage 
                src={newsArray[0].contentImage} 
                alt={newsArray[0].nombre_noticia}
              />
            </div>
            <div className="main-article-content">
              <h3>{truncateTitle(newsArray[0].nombre_noticia, 60)}</h3>
              <div>
                {newsArray[0].autorData?.nombre && (
                  <p className="author">
                    por {newsArray[0].autorData.nombre} {newsArray[0].autorData.apellido}
                  </p>
                )}
                <p className="date">{formatDate(newsArray[0].fecha_publicacion)}</p>
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
                  <OptimizedImage 
                    src={newsItem.contentImage} 
                    alt={newsItem.nombre_noticia}
                  />
                </div>
                <div className="secondary-article-content">
                  <h4>{newsItem.nombre_noticia}</h4>
                  {newsItem.autorData?.nombre && (
                    <p className="author">
                      por {newsItem.autorData.nombre} {newsItem.autorData.apellido}
                    </p>
                  )}
                  <p className="date">{formatDate(newsItem.fecha_publicacion)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }, [navigate, truncateTitle, getFirstParagraphContent, formatDate, OptimizedImage]);

  // ✅ Renderizado de noticias recientes
  const renderRecentNews = useCallback((recentNewsArray) => {
    if (!recentNewsArray || recentNewsArray.length === 0) return null;

    return (
      <div className="recent-news-section">
        <h2 className="section-titleNR">NOTICIAS RECIENTES</h2>
        <div className="section-title-line"></div>
        <div className="recent-news-list">
          {recentNewsArray.map(newsItem => (
            <div
              key={newsItem.id}
              className="recent-news-item"
              onClick={() => navigate(generateNewsUrl(newsItem))}
            >
              <div className='recent-new'>
                <OptimizedImage 
                  src={newsItem.contentImage} 
                  alt={newsItem.nombre_noticia} 
                  className="recent-news-image"
                />
              </div>
              <div className="recent-news-content">
                <h4>{newsItem.nombre_noticia}</h4>
                <p className="date">{formatDate(newsItem.fecha_publicacion)}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }, [navigate, formatDate, OptimizedImage]);

  // ✅ Renderizado de más vistas
  const renderMostViewedNews = useCallback((mostViewedNewsArray) => {
    if (!mostViewedNewsArray || mostViewedNewsArray.length === 0) return null;

    return (
      <div className="recent-news-section">
        <h2 className="section-titleNR">MÁS LEÍDAS</h2>
        <div className="section-title-line"></div>
        <div className="recent-news-list">
          {mostViewedNewsArray.map(newsItem => (
            <div
              key={newsItem.id}
              className="recent-news-item"
              onClick={() => navigate(generateNewsUrl(newsItem))}
            >
              <div className='recent-new'>
                <OptimizedImage 
                  src={newsItem.contentImage} 
                  alt={newsItem.nombre_noticia} 
                  className="recent-news-image"
                />
              </div>
              <div className="recent-news-content">
                <h4>{newsItem.nombre_noticia}</h4>
                <div className="news-meta">
                  <p className="date">{formatDate(newsItem.fecha_publicacion)}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }, [navigate, formatDate, OptimizedImage]);

  // ✅ Carrusel de noticias destacadas
  const renderFeaturedCarousel = useCallback(() => {
    if (!featuredNews || featuredNews.length === 0) return null;
    
    const displayNews = featuredNews.length >= 16 
      ? featuredNews.slice(0, 16) 
      : [...featuredNews, ...Array(16 - featuredNews.length).fill(null)];
    
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

        <div className="carousel-container">
          {Array.from({ length: totalSlides }).map((_, slideIndex) => {
            const startIdx = slideIndex * 4;
            const slideNews = displayNews.slice(startIdx, startIdx + 4);
            const isActive = slideIndex === currentSlide;
            const isCriticalSlide = slideIndex === 0;

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
                  onClick={() => slideNews[0] && navigate(generateNewsUrl(slideNews[0]))}
                >
                  {slideNews[0] ? (
                    <>
                      <OptimizedImage 
                        src={slideNews[0].contentImage} 
                        alt={slideNews[0].nombre_noticia}
                        isCritical={isCriticalSlide}
                      />
                      <div className="overlay">
                        <h1 style={{ color: '#ffff' }}>{slideNews[0].nombre_noticia}</h1>
                        <p style={{ color: '#ffff', marginBottom: '8px' }}>
                          {formatDate(slideNews[0].fecha_publicacion)}
                        </p>
                        {slideNews[0].autorData?.nombre && (
                          <p className="author" style={{ color: '#ffff', marginBottom: '0' }}>
                            por {slideNews[0].autorData.nombre} {slideNews[0].autorData.apellido}
                          </p>
                        )}
                      </div>
                    </>
                  ) : (
                    <div className="placeholder-news">Sin noticia</div>
                  )}
                </div>

                <div className="featured-right">
                  <div
                    className="carousel-item carousel-item-top"
                    onClick={() => slideNews[1] && navigate(generateNewsUrl(slideNews[1]))}
                  >
                    {slideNews[1] ? (
                      <>
                        <OptimizedImage 
                          src={slideNews[1].contentImage} 
                          alt={slideNews[1].nombre_noticia} 
                          className="carousel-image"
                          isCritical={isCriticalSlide}
                        />
                        <div className="carousel-caption">
                          <h3>{slideNews[1].nombre_noticia}</h3>
                          <p>{formatDate(slideNews[1].fecha_publicacion)}</p>
                          {slideNews[1].autorData?.nombre && (
                            <p className="author">
                              por {slideNews[1].autorData.nombre} {slideNews[1].autorData.apellido}
                            </p>
                          )}
                        </div>
                      </>
                    ) : (
                      <div className="placeholder-news">Sin noticia</div>
                    )}
                  </div>
                  
                  <div className="carousel-bottom-row">
                    {slideNews.slice(2, 4).map((newsItem, idx) => (
                      <div
                        key={newsItem ? newsItem.id : `placeholder-${idx}`}
                        className="carousel-item carousel-item-bottom"
                        onClick={() => newsItem && navigate(generateNewsUrl(newsItem))}
                      >
                        {newsItem ? (
                          <>
                            <OptimizedImage 
                              src={newsItem.contentImage} 
                              alt={newsItem.nombre_noticia} 
                              className="carousel-image"
                              isCritical={isCriticalSlide && idx < 1}
                            />
                            <div className="carousel-caption">
                              <h3>
                                {newsItem.nombre_noticia.length > 45 
                                  ? newsItem.nombre_noticia.slice(0, 45) + '...' 
                                  : newsItem.nombre_noticia}
                              </h3>
                              <p>{formatDate(newsItem.fecha_publicacion)}</p>
                              {newsItem.autorData?.nombre && (
                                <p className="author">
                                  por {newsItem.autorData.nombre} {newsItem.autorData.apellido}
                                </p>
                              )}
                            </div>
                          </>
                        ) : (
                          <div className="placeholder-news">Sin noticia</div>
                        )}
                      </div>
                    ))}
                  </div>
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
  }, [featuredNews, currentSlide, handlePrevSlide, handleNextSlide, navigate, formatDate, handleDotClick, OptimizedImage]);

  // ✅ Loading state
  if (loading) {
    return (
      <div className="home-container">
        <div className="loading-container">
          <div className="carousel-wrapper">
            <div className="carousel-container skeleton-carousel">
              <div className="slide active">
                <div className="featured-left skeleton">
                  <div className="skeleton-img"></div>
                </div>
                <div className="featured-right">
                  <div className="carousel-item skeleton">
                    <div className="skeleton-img"></div>
                  </div>
                  <div className="carousel-bottom-row">
                    {[...Array(2)].map((_, idx) => (
                      <div key={idx} className="carousel-item skeleton">
                        <div className="skeleton-img"></div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          <div className="sections-and-recent-news">
            <div className="news-sections">
              {[...Array(4)].map((_, idx) => (
                <div key={idx} className="news-section">
                  <h2 className="section-title skeleton-line title"></h2>
                  <div className="news-grid">
                    {MainArticleSkeleton}
                    <div className="secondary-articles">
                      {[...Array(4)].map((_, idx) => (
                        <div key={idx}>{SecondaryArticleSkeleton}</div>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
            
            <div className="recent-news">
              {[...Array(10)].map((_, idx) => (
                <div key={idx}>{RecentNewsSkeleton}</div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ✅ Error state
  if (error) {
    return (
      <div className="home-container">
        <div className="error-container">
          <h2>Error al cargar las noticias</h2>
          <p>{error}</p>
          <button onClick={() => window.location.reload()}>Reintentar</button>
        </div>
      </div>
    );
  }

  // ✅ Main render
  return (
    <div className="home-container">
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