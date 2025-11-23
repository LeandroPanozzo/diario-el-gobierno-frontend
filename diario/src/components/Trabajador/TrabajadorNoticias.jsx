import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import './TrabajadorNoticias.css';
import api from '../../pages/context/axiosConfig';
import AdSenseAd from '../News/AdSenseAd';

const TrabajadorNoticias = () => {
  const { trabajadorId } = useParams();
  const [noticias, setNoticias] = useState([]);
  const [trabajador, setTrabajador] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  // Función optimizada para extraer imagen
  const extractFirstImageFromContent = useCallback((htmlContent) => {
    if (!htmlContent) return null;
    
    const imgMatch = htmlContent.match(/<img[^>]+src="([^">]+)"/);
    return imgMatch ? imgMatch[1] : null;
  }, []);

  // Procesar noticias con imágenes - memoizado
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

  // Componente de anuncio
  const AdAsNews = ({ adConfig, index }) => (
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

  // Configuración de anuncios
  const adConfigs = [
    {
      slot: "9072042757",
      format: "fluid",
      layoutKey: "-6t+ed+2i-1n-4w",
      style: { display: 'block', width: '100%', height: '200px' }
    },
    {
      slot: "1234567890",
      format: "fluid",
      layoutKey: "-6t+ed+2i-1n-4w",
      style: { display: 'block', width: '100%', height: '200px' }
    },
    {
      slot: "0987654321",
      format: "fluid",
      layoutKey: "-6t+ed+2i-1n-4w",
      style: { display: 'block', width: '100%', height: '200px' }
    }
  ];

  // Mezclar noticias con anuncios
  const mixNewsWithAds = useCallback((newsItems) => {
    const items = [];
    let adIndex = 0;

    newsItems.forEach((newsItem, index) => {
      items.push(
        <Link to={generateNewsUrl(newsItem)} key={newsItem.id} className="news-item">
          <div className="news-img-container">
            {newsItem.contentImage ? (
              <img 
                src={newsItem.contentImage} 
                alt={newsItem.nombre_noticia} 
                className="news-img"
                loading="lazy"
              />
            ) : (
              <div className="news-img-placeholder">Sin imagen</div>
            )}
          </div>
          <div className="news-content">
            <h3 className="news-title">{newsItem.nombre_noticia}</h3>
            <p className="news-description">
              {newsItem.subtitulo === 'default content' 
                ? truncateContent(newsItem.contenido, 140) 
                : truncateContent(newsItem.contenido, 150)}
            </p>
            <p className="news-date">
              {new Date(newsItem.fecha_publicacion).toLocaleDateString()}
            </p>
          </div>
        </Link>
      );

      // Insertar anuncio cada 6 noticias
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
  }, [adConfigs, generateNewsUrl]);

  // ✅ OPTIMIZACIÓN 1: Usar el endpoint optimizado del backend
  const fetchNoticias = useCallback(async (pageNum = 1) => {
    try {
      const isInitialLoad = pageNum === 1;
      
      if (!isInitialLoad) {
        setLoadingMore(true);
      }

      // ✅ Usar el endpoint optimizado por_trabajador
      const response = await api.get(`noticias/por-trabajador/`, {
        params: {
          trabajador_id: trabajadorId,
          page: pageNum,
          page_size: 20 // Cargar 20 noticias por página
        }
      });

      // Manejar respuesta paginada
      const newsData = response.data.results || response.data;
      const processedNews = processNewsWithImages(Array.isArray(newsData) ? newsData : []);

      if (pageNum === 1) {
        setNoticias(processedNews);
      } else {
        setNoticias(prev => [...prev, ...processedNews]);
      }

      // Verificar si hay más páginas
      setHasMore(!!response.data.next);

    } catch (error) {
      console.error('Error fetching news:', error);
      if (pageNum === 1) {
        setError('Error al cargar las noticias.');
      }
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [trabajadorId, processNewsWithImages]);

  // Cargar información del trabajador
  useEffect(() => {
    const fetchTrabajador = async () => {
      try {
        const response = await api.get(`trabajadores/${trabajadorId}/`);
        setTrabajador(response.data);
      } catch (error) {
        console.error('Error fetching worker details:', error);
      }
    };

    fetchTrabajador();
  }, [trabajadorId]);

  // Cargar primera página de noticias
  useEffect(() => {
    setLoading(true);
    setPage(1);
    fetchNoticias(1);
  }, [trabajadorId, fetchNoticias]);

  // ✅ OPTIMIZACIÓN 2: Infinite scroll
  useEffect(() => {
    const handleScroll = () => {
      if (loadingMore || !hasMore) return;

      const scrollHeight = document.documentElement.scrollHeight;
      const scrollTop = document.documentElement.scrollTop;
      const clientHeight = document.documentElement.clientHeight;

      // Cargar más cuando esté a 200px del final
      if (scrollHeight - scrollTop - clientHeight < 200) {
        const nextPage = page + 1;
        setPage(nextPage);
        fetchNoticias(nextPage);
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [page, loadingMore, hasMore, fetchNoticias]);

  // Utilidad para truncar contenido
  const stripHtml = (html) => {
    const doc = new DOMParser().parseFromString(html, 'text/html');
    return doc.body.textContent || '';
  };

  const truncateContent = (content, maxLength) => {
    const plainText = stripHtml(content);
    return plainText.length > maxLength 
      ? plainText.slice(0, maxLength) + '...' 
      : plainText;
  };

  if (loading && page === 1) {
    return (
      <div className="loading-container">
        <div className="spinner"></div>
        <p>Cargando noticias...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="error-container">
        <p>{error}</p>
        <button onClick={() => fetchNoticias(1)}>Reintentar</button>
      </div>
    );
  }

  return (
    <div className="trabajador-page">
      <div className="trabajador-header">
        {trabajador && (
          <div className="trabajador-info">
            <div>
              <h1 className="trabajador-name">
                Noticias de {trabajador.nombre} {trabajador.apellido}
              </h1>
              <p className="trabajador-description">
                Sobre {trabajador.nombre}: {trabajador.descripcion_usuario}
              </p>
            </div>
          </div>
        )}
      </div>

      <div className="news-grid">
        {noticias.length > 0 ? (
          <>
            {mixNewsWithAds(noticias)}
            
            {/* Indicador de carga para infinite scroll */}
            {loadingMore && (
              <div className="loading-more">
                <div className="spinner-small"></div>
                <p>Cargando más noticias...</p>
              </div>
            )}
            
            {/* Mensaje cuando no hay más noticias */}
            {!hasMore && noticias.length > 0 && (
              <div className="no-more-news">
                <p>No hay más noticias para mostrar</p>
              </div>
            )}
          </>
        ) : (
          <p>No hay noticias para mostrar.</p>
        )}
      </div>
    </div>
  );
};

export default TrabajadorNoticias;