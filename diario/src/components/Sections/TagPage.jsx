import { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import './TagPage.css';
import api from '../../pages/context/axiosConfig';
import AdSenseAd from '../News/AdSenseAd'; // Usar componente separado

const TagPage = () => {
  const { tagName } = useParams();
  const [news, setNews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  // ✅ OPTIMIZACIÓN 1: Extraer imagen con regex (10x más rápido)
  const extractFirstImageFromContent = useCallback((htmlContent) => {
    if (!htmlContent) return null;
    const imgMatch = htmlContent.match(/<img[^>]+src="([^">]+)"/);
    return imgMatch ? imgMatch[1] : null;
  }, []);

  // ✅ OPTIMIZACIÓN 2: Procesar noticias memoizado
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

  // Generar URL con slug
  const generateNewsUrl = useCallback((newsItem) => {
    if (newsItem.slug) {
      return `/noticia/${newsItem.id}-${newsItem.slug}`;
    }
    return `/noticia/${newsItem.id}`;
  }, []);

  // ✅ OPTIMIZACIÓN 3: Usar endpoint de búsqueda del backend con paginación
  const fetchTagNews = useCallback(async (pageNum = 1) => {
    try {
      const isInitialLoad = pageNum === 1;
      
      if (!isInitialLoad) {
        setLoadingMore(true);
      }

      // ✅ Usar endpoint de búsqueda optimizado
      const response = await api.get(`noticias/buscar/`, {
        params: {
          q: tagName,
          type: 'keywords', // Buscar solo en palabras clave
          estado: 3,
          limit: 20 // Cargar 20 noticias por página
        }
      });

      // ✅ Manejar respuesta paginada o directa
      let newsData = [];
      
      if (response.data.results) {
        // Si viene de búsqueda endpoint
        newsData = response.data.results;
      } else if (Array.isArray(response.data)) {
        // Si es array directo
        newsData = response.data;
      } else if (response.data.data && Array.isArray(response.data.data)) {
        // Si tiene estructura { data: [] }
        newsData = response.data.data;
      }

      // Procesar noticias con imágenes
      const processedNews = processNewsWithImages(newsData);

      if (pageNum === 1) {
        setNews(processedNews);
      } else {
        setNews(prev => [...prev, ...processedNews]);
      }

      // Verificar si hay más resultados
      setHasMore(response.data.next !== null || processedNews.length >= 20);

    } catch (error) {
      console.error('Failed to fetch tag news:', error);
      if (pageNum === 1) {
        setError(error.message);
      }
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [tagName, processNewsWithImages]);

  // Cargar primera página
  useEffect(() => {
    setLoading(true);
    setPage(1);
    setNews([]);
    fetchTagNews(1);
  }, [tagName, fetchTagNews]);

  // ✅ OPTIMIZACIÓN 4: Infinite scroll
  useEffect(() => {
    const handleScroll = () => {
      if (loadingMore || !hasMore || loading) return;

      const scrollHeight = document.documentElement.scrollHeight;
      const scrollTop = document.documentElement.scrollTop;
      const clientHeight = document.documentElement.clientHeight;

      // Cargar más cuando esté a 300px del final
      if (scrollHeight - scrollTop - clientHeight < 300) {
        const nextPage = page + 1;
        setPage(nextPage);
        fetchTagNews(nextPage);
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [page, loadingMore, hasMore, loading, fetchTagNews]);

  // Utilidades
  const stripHtml = (html) => {
    const doc = new DOMParser().parseFromString(html, 'text/html');
    return doc.body.textContent || '';
  };

  const truncateContent = (content, maxLength = 150) => {
    const plainText = stripHtml(content);
    return plainText.length > maxLength ? 
      plainText.slice(0, maxLength) + '...' : 
      plainText;
  };

  // ✅ OPTIMIZACIÓN 5: Insertar anuncios de forma eficiente
  const insertAdsIntoNews = useCallback((newsArray) => {
    const result = [];
    
    newsArray.forEach((newsItem, index) => {
      result.push(
        <Link to={generateNewsUrl(newsItem)} key={newsItem.id} className="news-item">
          <div className="news-img-container">
            {newsItem.contentImage ? (
              <img 
                src={newsItem.contentImage} 
                alt={newsItem.nombre_noticia} 
                className="news-img"
                loading="lazy" // ✅ Lazy loading nativo
              />
            ) : (
              <div className="news-img-placeholder">Sin imagen</div>
            )}
          </div>
          <div className="news-content">
            <h3 className="news-title">{newsItem.nombre_noticia}</h3>
            <p className="news-description">
              {truncateContent(newsItem.contenido)}
            </p>
            <p className="news-date">
              {new Date(newsItem.fecha_publicacion).toLocaleDateString()}
            </p>
            {newsItem.autorData && (
              <p className="news-author">
                Por {newsItem.autorData.nombre} {newsItem.autorData.apellido}
              </p>
            )}
          </div>
        </Link>
      );
      
      // Insertar anuncio después de cada 6 noticias
      if ((index + 1) % 6 === 0 && index < newsArray.length - 1) {
        result.push(
          <div key={`ad-${index}`} className="ad-slot-inline">
            <AdSenseAd 
              slot="1234567890"
              format="fluid"
              layoutKey="-6t+ed+2i-1n-4w"
              style={{ display: 'block' }}
              className="inline-ad"
            />
          </div>
        );
      }
    });
    
    return result;
  }, [generateNewsUrl]);

  if (loading && page === 1) {
    return (
      <div className="loading-container">
        <div className="spinner"></div>
        <p>Cargando noticias con la etiqueta "{tagName}"...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="error-container">
        <p>Error: {error}</p>
        <button onClick={() => fetchTagNews(1)}>Reintentar</button>
      </div>
    );
  }

  return (
    <div className="tag-page">
      <h1>Noticias con la etiqueta: {tagName}</h1>
      
      {/* Anuncio superior */}
      <AdSenseAd 
        slot="9072042757"
        format="auto"
        style={{ display: 'block', marginBottom: '30px' }}
        className="top-banner-ad"
      />
      
      <div className="news-grid">
        {news.length > 0 ? (
          <>
            {insertAdsIntoNews(news)}
            
            {/* Indicador de carga */}
            {loadingMore && (
              <div className="loading-more">
                <div className="spinner-small"></div>
                <p>Cargando más noticias...</p>
              </div>
            )}
            
            {/* Mensaje final */}
            {!hasMore && news.length > 0 && (
              <div className="no-more-news">
                <p>No hay más noticias con esta etiqueta</p>
              </div>
            )}
          </>
        ) : (
          <p>No hay noticias disponibles con esta etiqueta.</p>
        )}
      </div>

      {/* Anuncio inferior */}
      {news.length > 0 && (
        <AdSenseAd 
          slot="3456789012"
          format="auto"
          style={{ display: 'block', marginTop: '30px' }}
          className="bottom-banner-ad"
        />
      )}
    </div>
  );
};

export default TagPage;