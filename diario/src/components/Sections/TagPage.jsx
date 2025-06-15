import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import './TagPage.css';
import api from '../../pages/context/axiosConfig';

// Componente AdSense reutilizable
const AdSenseAd = ({ 
  client = "ca-pub-5718334909043793",
  slot = "9072042757",
  format = "fluid",
  layoutKey = "-6t+ed+2i-1n-4w",
  style = { display: 'block' },
  className = ""
}) => {
  useEffect(() => {
    // Cargar el script de AdSense si no está cargado
    if (!window.adsbygoogle) {
      const script = document.createElement('script');
      script.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${client}`;
      script.async = true;
      script.crossOrigin = 'anonymous';
      document.head.appendChild(script);
    }

    // Inicializar el anuncio después de que el componente se monte
    try {
      (window.adsbygoogle = window.adsbygoogle || []).push({});
    } catch (err) {
      console.error('AdSense error:', err);
    }
  }, [client]);

  return (
    <div className={`adsense-container ${className}`}>
      <ins
        className="adsbygoogle"
        style={style}
        data-ad-format={format}
        data-ad-layout-key={layoutKey}
        data-ad-client={client}
        data-ad-slot={slot}
      />
    </div>
  );
};

const TagPage = () => {
  const { tagName } = useParams();
  const [news, setNews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const newsPerPage = 20;

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

  // Función para generar la URL con slug para las noticias
  const generateNewsUrl = (newsItem) => {
    // Si existe un slug en el objeto de noticia, usarlo
    if (newsItem.slug) {
      return `/noticia/${newsItem.id}-${newsItem.slug}`;
    }
    // Si no hay slug, usamos solo el ID como fallback
    return `/noticia/${newsItem.id}`;
  };

  useEffect(() => {
    const fetchTagNews = async () => {
      try {
        const response = await api.get(`noticias/`);

        // Filter news by tag and status, and sort by publication date
        const filteredNews = response.data
          .filter(newsItem =>
            newsItem.estado === 3 &&
            newsItem.Palabras_clave &&
            newsItem.Palabras_clave.split(',').map(tag => tag.trim().toLowerCase()).includes(tagName.toLowerCase())
          )
          .sort((a, b) => new Date(b.fecha_publicacion) - new Date(a.fecha_publicacion));

        // Fetch author data
        await fetchAuthors(filteredNews);

        // Procesar las noticias para extraer imágenes del contenido
        const processedNews = processNewsWithImages(filteredNews);
        setNews(processedNews);
      } catch (error) {
        setError(error.message);
        console.error('Failed to fetch tag news:', error);
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

    fetchTagNews();
  }, [tagName]);

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

  const handlePageChange = (pageNumber) => {
    setCurrentPage(pageNumber);
    window.scrollTo(0, 0);
  };

  const indexOfLastNews = currentPage * newsPerPage;
  const indexOfFirstNews = indexOfLastNews - newsPerPage;
  const currentNews = news.slice(indexOfFirstNews, indexOfLastNews);
  const totalPages = Math.ceil(news.length / newsPerPage);

  // Función para insertar anuncios entre las noticias
  const insertAdsIntoNews = (newsArray) => {
    const result = [];
    
    newsArray.forEach((newsItem, index) => {
      result.push(newsItem);
      
      // Insertar anuncio después de cada 6 noticias
      if ((index + 1) % 6 === 0 && index < newsArray.length - 1) {
        result.push({
          isAd: true,
          id: `ad-${index}`,
          adType: 'inline'
        });
      }
    });
    
    return result;
  };

  if (loading) {
    return <div>Cargando noticias...</div>;
  }

  if (error) {
    return <div>Error: {error}</div>;
  }

  const newsWithAds = insertAdsIntoNews(currentNews);

  return (
    <div className="tag-page">
      <h1>Noticias con la etiqueta: {tagName}</h1>
      
      {/* Anuncio superior - Banner horizontal */}
      <AdSenseAd 
        slot="9072042757"
        format="auto"
        style={{ display: 'block', marginBottom: '30px' }}
        className="top-banner-ad"
      />
      
      <div className="news-grid">
        {newsWithAds.length > 0 ? (
          newsWithAds.map((item) => {
            // Si es un anuncio
            if (item.isAd) {
              return (
                <div key={item.id} className="ad-slot-inline">
                  <AdSenseAd 
                    slot="1234567890" // Cambia por tu slot específico para anuncios inline
                    format="fluid"
                    layoutKey="-6t+ed+2i-1n-4w"
                    style={{ display: 'block' }}
                    className="inline-ad"
                  />
                </div>
              );
            }
            
            // Si es una noticia
            return (
              <Link to={generateNewsUrl(item)} key={item.id} className="news-item">
                <div className="news-img-container">
                  <img src={item.contentImage} alt={item.nombre_noticia} className="news-img" />
                </div>
                <div className="news-content">
                  <h3 className="news-title">{item.nombre_noticia}</h3>
                  <p className="news-description">
                    {truncateContent(item.contenido)}
                  </p>
                  <p className="news-date">{new Date(item.fecha_publicacion).toLocaleDateString()}</p>
                  {item.autorData && (
                    <p className="news-author">Por {item.autorData.nombre} {item.autorData.apellido} · {item.categoria}</p>
                  )}
                </div>
              </Link>
            );
          })
        ) : (
          <p>No hay noticias disponibles con esta etiqueta.</p>
        )}
      </div>

      {/* Anuncio antes de la paginación */}
      {totalPages > 1 && (
        <AdSenseAd 
          slot="2345678901" // Cambia por tu slot específico
          format="auto"
          style={{ display: 'block', margin: '30px 0' }}
          className="pre-pagination-ad"
        />
      )}

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

      {/* Anuncio inferior */}
      <AdSenseAd 
        slot="3456789012" // Cambia por tu slot específico
        format="auto"
        style={{ display: 'block', marginTop: '30px' }}
        className="bottom-banner-ad"
      />
    </div>
  );
};

export default TagPage;