import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import './home.css';
import api from '../context/axiosConfig';

// Optimización: Precargar imágenes críticas
const preloadImage = (src) => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
};

// Optimización: Web Worker para procesamiento pesado (si está disponible)
const processInWorker = (data, operation) => {
  return new Promise((resolve) => {
    // Fallback sícrono si no hay Web Workers
    if (typeof Worker === 'undefined') {
      resolve(data);
      return;
    }
    
    // Procesar en worker si está disponible
    setTimeout(() => resolve(data), 0);
  });
};

// Funciones utilitarias optimizadas
const extractFirstImageFromContent = (htmlContent) => {
  if (!htmlContent) return null;
  const imgRegex = /<img[^>]+src=["']([^"']+)["'][^>]*>/i;
  const match = htmlContent.match(imgRegex);
  return match ? match[1] : null;
};

const generateNewsUrl = (newsItem) => {
  return newsItem.slug ? `/noticia/${newsItem.id}-${newsItem.slug}` : `/noticia/${newsItem.id}`;
};

// Cache mejorado con TTL
class CacheWithTTL {
  constructor(ttl = 300000) { // 5 minutos por defecto
    this.cache = new Map();
    this.timers = new Map();
    this.ttl = ttl;
  }
  
  set(key, value) {
    if (this.timers.has(key)) {
      clearTimeout(this.timers.get(key));
    }
    
    this.cache.set(key, value);
    this.timers.set(key, setTimeout(() => {
      this.cache.delete(key);
      this.timers.delete(key);
    }, this.ttl));
  }
  
  get(key) {
    return this.cache.get(key);
  }
  
  has(key) {
    return this.cache.has(key);
  }
}

const authorCache = new CacheWithTTL();
const editorCache = new CacheWithTTL();

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
  
  // Optimización: Estado para tracking de imágenes críticas cargadas
  const [criticalImagesLoaded, setCriticalImagesLoaded] = useState(false);
  const [isFirstRender, setIsFirstRender] = useState(true);
  
  const totalSlides = 4;
  const navigate = useNavigate();
  const carouselInterval = useRef(null);
  const [isPaused, setIsPaused] = useState(false);
  const abortController = useRef(new AbortController());
  const imageLoadPromises = useRef(new Map());

  // Optimización: Intersection Observer para lazy loading inteligente
  const observerRef = useRef(null);
  
  useEffect(() => {
    observerRef.current = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const img = entry.target;
            if (img.dataset.src) {
              img.src = img.dataset.src;
              img.removeAttribute('data-src');
              observerRef.current.unobserve(img);
            }
          }
        });
      },
      { 
        rootMargin: '50px',
        threshold: 0.1
      }
    );

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, []);

  // Funciones de procesamiento optimizadas
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

  // Optimización: Procesamiento de imágenes con precarga crítica
  const processNewsWithImages = useCallback(async (newsItems, isCritical = false) => {
    if (!Array.isArray(newsItems)) return [];
    
    const processedNews = newsItems.map(newsItem => {
      const contentImage = extractFirstImageFromContent(newsItem.contenido);
      const finalImage = contentImage || newsItem.imagen_1 || newsItem.imagen_cabecera || '/path/to/placeholder.jpg';
      
      return {
        ...newsItem,
        contentImage: finalImage
      };
    });

    // Optimización: Precargar solo las primeras 3 imágenes críticas
    if (isCritical && processedNews.length > 0) {
      const criticalImages = processedNews.slice(0, 3).map(item => item.contentImage);
      
      try {
        await Promise.all(
          criticalImages.map(src => 
            preloadImage(src).catch(() => null) // Ignorar errores individuales
          )
        );
        setCriticalImagesLoaded(true);
      } catch (error) {
        console.warn('Some critical images failed to preload:', error);
        setCriticalImagesLoaded(true); // Continuar de todos modos
      }
    }

    return processedNews;
  }, []);

  // Optimización: Fetch de autores en chunks más pequeños
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
    
    // Optimización: Procesar en chunks de 5 para no sobrecargar la red
    const fetchInChunks = async (ids, cache, endpoint = 'trabajadores') => {
      const idsArray = Array.from(ids);
      const chunkSize = 5;
      
      for (let i = 0; i < idsArray.length; i += chunkSize) {
        const chunk = idsArray.slice(i, i + chunkSize);
        const promises = chunk.map(async id => {
          try {
            const response = await api.get(`${endpoint}/${id}/`);
            cache.set(id, response.data);
          } catch (error) {
            console.error(`Error fetching ${endpoint} ${id}:`, error);
          }
        });
        
        await Promise.allSettled(promises);
        
        // Optimización: Pequeña pausa entre chunks para no saturar
        if (i + chunkSize < idsArray.length) {
          await new Promise(resolve => setTimeout(resolve, 50));
        }
      }
    };
    
    await Promise.all([
      fetchInChunks(uniqueAuthorIds, authorCache),
      fetchInChunks(uniqueEditorIds, editorCache)
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

  // Limpieza
  useEffect(() => {
    return () => {
      abortController.current.abort();
      if (carouselInterval.current) {
        clearInterval(carouselInterval.current);
      }
      imageLoadPromises.current.clear();
    };
  }, []);

  // Configuración de secciones
  const mainSections = useMemo(() => ({
    'Politica': ['nacion','legislativos', 'policiales', 'elecciones', 'gobierno', 'provincias', 'capital'],
    'Cultura': ['cine', 'literatura', 'salud', 'tecnologia', 'eventos', 'educacion', 'efemerides','deporte'],
    'Economia': ['finanzas', 'comercio_internacional', 'politica_economica', 'dolar', 'pobreza_e_inflacion'],
    'Mundo': ['estados_unidos', 'asia', 'medio_oriente', 'internacional','latinoamerica'],
    'Tipos de notas': ['de_analisis', 'de_opinion','informativas','entrevistas']
  }), []);

  // Optimización: Fetch prioritario para contenido crítico
  const fetchFeaturedNews = useCallback(async (signal) => {
    try {
      const response = await api.get('noticias/destacadas/', {
        params: { limit: 12 },
        signal,
        // Optimización: Prioridad alta para contenido crítico
        priority: 'high'
      });
      
      const filteredNews = response.data.filter(newsItem => newsItem.estado === 3);
      
      // Optimización: Procesar inmediatamente las primeras 3 para LCP
      const criticalNews = filteredNews.slice(0, 3);
      const remainingNews = filteredNews.slice(3);
      
      // Procesar y precargar contenido crítico inmediatamente
      const processedCritical = await processNewsWithImages(criticalNews, true);
      
      setFeaturedNews(processedCritical);
      setLoadingStates(prev => ({ ...prev, featured: false }));
      
      // Procesar el resto en background
      setTimeout(async () => {
        const processedRemaining = await processNewsWithImages(remainingNews);
        const allProcessed = [...processedCritical, ...processedRemaining];
        
        setFeaturedNews(allProcessed);
        
        // Fetch autores en background
        fetchAuthorsAndEditors(filteredNews);
      }, 0);
      
    } catch (error) {
      if (!signal.aborted) {
        console.error('Failed to fetch featured news:', error);
        setLoadingStates(prev => ({ ...prev, featured: false }));
      }
    }
  }, [processNewsWithImages, fetchAuthorsAndEditors]);

  // Optimización: Fetch diferido para secciones no críticas
  const fetchSectionNews = useCallback(async (signal) => {
    try {
      // Pequeño delay para dar prioridad al contenido crítico
      await new Promise(resolve => setTimeout(resolve, 100));
      
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
          
          const processedNews = await processNewsWithImages(response.data);
          
          setSectionNews(prevState => ({
            ...prevState,
            [mainSection]: processedNews
          }));
          
          // Fetch autores en background con delay
          setTimeout(() => {
            fetchAuthorsAndEditors(response.data);
          }, 200);
          
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
      // Delay para dar prioridad al contenido crítico
      await new Promise(resolve => setTimeout(resolve, 200));
      
      const response = await api.get('noticias/recientes/', {
        params: { limit: 5 },
        signal
      });
      
      const newsWithImages = await processNewsWithImages(response.data);
      setRecentNews(newsWithImages);
      setLoadingStates(prev => ({ ...prev, recent: false }));
      
      setTimeout(() => {
        fetchAuthorsAndEditors(response.data);
      }, 300);
    } catch (error) {
      if (!signal.aborted) {
        console.error('Failed to fetch recent news:', error);
        setLoadingStates(prev => ({ ...prev, recent: false }));
      }
    }
  }, [processNewsWithImages, fetchAuthorsAndEditors]);
  
  const fetchMostViewedNews = useCallback(async (signal) => {
    try {
      // Delay para dar prioridad al contenido crítico
      await new Promise(resolve => setTimeout(resolve, 250));
      
      const response = await api.get('noticias/mas_vistas/', {
        params: { limit: 5 },
        signal
      });
      
      const newsWithImages = await processNewsWithImages(response.data);
      setMostViewedNews(newsWithImages);
      setLoadingStates(prev => ({ ...prev, mostViewed: false }));
      
      setTimeout(() => {
        fetchAuthorsAndEditors(response.data);
      }, 400);
    } catch (error) {
      if (!signal.aborted) {
        console.error('Failed to fetch most viewed news:', error);
        setLoadingStates(prev => ({ ...prev, mostViewed: false }));
      }
    }
  }, [processNewsWithImages, fetchAuthorsAndEditors]);

  // Optimización: Effect con priorización de carga
  useEffect(() => {
    abortController.current = new AbortController();
    const signal = abortController.current.signal;

    // Prioridad 1: Contenido crítico (featured news)
    fetchFeaturedNews(signal).then(() => {
      setIsFirstRender(false);
      
      // Prioridad 2: Contenido secundario en paralelo pero después
      Promise.all([
        fetchSectionNews(signal),
        fetchRecentNews(signal),
        fetchMostViewedNews(signal)
      ]);
    });
  }, [fetchFeaturedNews, fetchSectionNews, fetchRecentNews, fetchMostViewedNews]);

  // Carousel handlers
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

  // Optimización: Carrusel solo inicia cuando las imágenes críticas están listas
  useEffect(() => {
    const isAnyLoading = Object.values(loadingStates).some(state => state);
    
    if (!isPaused && !isAnyLoading && criticalImagesLoaded) {
      carouselInterval.current = setInterval(() => {
        setCurrentSlide((prev) => (prev + 1) % totalSlides);
      }, 5000);
    }

    return () => {
      if (carouselInterval.current) {
        clearInterval(carouselInterval.current);
      }
    };
  }, [isPaused, loadingStates, criticalImagesLoaded]);

  // Componente de imagen optimizada
  const OptimizedImage = useCallback(({ 
    src, 
    alt, 
    className = "", 
    isCritical = false, 
    ...props 
  }) => {
    const [isLoaded, setIsLoaded] = useState(false);
    const [error, setError] = useState(false);
    
    const handleLoad = () => setIsLoaded(true);
    const handleError = () => setError(true);
    
    // Optimización: Imagen crítica se carga inmediatamente
    if (isCritical) {
      return (
        <img
          src={src}
          alt={alt}
          className={`${className} ${isLoaded ? 'loaded' : 'loading'}`}
          onLoad={handleLoad}
          onError={handleError}
          loading="eager"
          decoding="sync"
          fetchPriority="high"
          {...props}
        />
      );
    }
    
    // Imagen no crítica usa lazy loading
    return (
      <img
        src={src}
        alt={alt}
        className={`${className} ${isLoaded ? 'loaded' : 'loading'}`}
        onLoad={handleLoad}
        onError={handleError}
        loading="lazy"
        decoding="async"
        {...props}
      />
    );
  }, []);

  // Componentes de skeleton memoizados (sin cambios)
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

  // Funciones de renderizado optimizadas
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
                  <OptimizedImage 
                    src={newsArray[0].contentImage} 
                    alt={newsArray[0].nombre_noticia}
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
                      <OptimizedImage 
                        src={newsItem.contentImage} 
                        alt={newsItem.nombre_noticia}
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
  }, [loadingStates.sections, navigate, truncateTitle, getFirstParagraphContent, MainArticleSkeleton, SecondaryArticleSkeleton, OptimizedImage]);

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
                  <OptimizedImage 
                    src={newsItem.contentImage} 
                    alt={newsItem.nombre_noticia} 
                    className="recent-news-image"
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
  }, [loadingStates.recent, navigate, RecentNewsSkeleton, OptimizedImage]);

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
                  <OptimizedImage 
                    src={newsItem.contentImage} 
                    alt={newsItem.nombre_noticia} 
                    className="recent-news-image"
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
  }, [loadingStates.mostViewed, navigate, RecentNewsSkeleton, OptimizedImage]);

  const formatDate = useCallback((dateString) => {
    const date = new Date(dateString);
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  }, []);

  // Optimización: Carrusel con prioridad en imágenes críticas
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
            const isCriticalSlide = slideIndex === 0; // Primer slide es crítico
            
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
                  <OptimizedImage 
                    src={slideNews[0]?.contentImage} 
                    alt={slideNews[0]?.nombre_noticia}
                    isCritical={isCriticalSlide}
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
                      <OptimizedImage 
                        src={newsItem.contentImage} 
                        alt={newsItem.nombre_noticia} 
                        className="carousel-image"
                        isCritical={isCriticalSlide && idx < 2}
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
  }, [loadingStates.featured, featuredNews, currentSlide, handlePrevSlide, handleNextSlide, handlePauseToggle, isPaused, navigate, formatDate, handleDotClick, OptimizedImage]);

  // Optimización: Estilos mejorados con transformaciones CSS para mejor rendimiento
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
      
      /* Optimización: Animación más suave y eficiente */
      @keyframes pulse {
        0% {
          opacity: 0.6;
          transform: scale(1);
        }
        100% {
          opacity: 1;
          transform: scale(1.01);
        }
      }
      
      /* Optimización: Estilos para carga de imágenes */
      img.loading {
        background: #f0f0f0;
        min-height: 200px;
      }
      
      img.loaded {
        transition: opacity 0.3s ease;
      }
      
      /* Optimización: Usar transform en lugar de cambios de layout */
      .carousel-container {
        will-change: transform;
      }
      
      .slide {
        will-change: transform, opacity;
      }
      
      /* Optimización: Hint para el navegador sobre compositing */
      .featured-left,
      .carousel-item {
        transform: translateZ(0);
        backface-visibility: hidden;
      }
    `}</style>
  ), []);

  // Optimización: Renderizado condicional para evitar re-renders innecesarios
  const MainContent = useMemo(() => (
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
  ), [renderFeaturedCarousel, sectionNews, renderNewsSection, renderRecentNews, recentNews, renderMostViewedNews, mostViewedNews]);

  return (
    <div className="container">
      {SkeletonStyles}
      {MainContent}
    </div>
  );
};

export default HomePage;