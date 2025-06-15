import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import './SubcategoryPage.css';
import api from '../../pages/context/axiosConfig';

// Componente AdSense reutilizable
const AdSenseAd = ({ 
  client = "ca-pub-5718334909043793",
  slot = "9072042757",
  format = "fluid",
  layoutKey = "-6t+ed+2i-1n-4w",
  style = { display: 'block' }
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
    <div className="adsense-container">
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

// Componente para mostrar un anuncio como una "noticia"
const AdNewsItem = ({ adConfig }) => {
  return (
    <div className="news-item ad-news-item">
      <div className="news-img-container ad-container">
        <AdSenseAd {...adConfig} />
      </div>
      <div className="news-content ad-content">
        <div className="ad-label">Publicidad</div>
      </div>
    </div>
  );
};

const SubcategoryPage = () => {
  const { subcategory } = useParams();
  const [news, setNews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const newsPerPage = 20;

  // Configuraciones de anuncios (puedes personalizarlas)
  const adConfigs = [
    {
      client: "ca-pub-5718334909043793",
      slot: "9072042757",
      format: "fluid",
      layoutKey: "-6t+ed+2i-1n-4w"
    },
    {
      client: "ca-pub-5718334909043793",
      slot: "9072042757", // Cambia por otro slot si tienes más
      format: "fluid",
      layoutKey: "-6t+ed+2i-1n-4w"
    }
  ];

  // Función para insertar anuncios entre las noticias
  const insertAdsIntoNews = (newsArray, adsConfigs) => {
    if (newsArray.length === 0) return [];
    
    const result = [];
    const adFrequency = 6; // Mostrar un anuncio cada 6 noticias
    let adIndex = 0;
    
    newsArray.forEach((newsItem, index) => {
      result.push(newsItem);
      
      // Insertar anuncio después de cada 'adFrequency' noticias
      if ((index + 1) % adFrequency === 0 && adIndex < adsConfigs.length) {
        result.push({
          id: `ad-${adIndex}`,
          isAd: true,
          adConfig: adsConfigs[adIndex % adsConfigs.length]
        });
        adIndex++;
      }
    });
    
    return result;
  };

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

  // Map of subcategories to their parent categories for better navigation
  const categoryMapping = {
    'legislativos': 'Política',
    'judiciales': 'Política',
    'conurbano': 'Política',
    'provincias': 'Política',
    'municipios': 'Política',
    'policiales': 'Política',
    'elecciones': 'Política',
    'gobierno': 'Política',
    'capital': 'Política',
    'nacion': 'Política',
    'cine': 'Cultura',
    'literatura': 'Cultura',
    'moda': 'Cultura',
    'tecnologia': 'Cultura',
    'eventos': 'Cultura',
    'salud': 'Cultura',
    'educacion': 'Cultura',
    'efemerides': 'Cultura',
    'deporte': 'Cultura',
    'finanzas': 'Economía',
    'negocios': 'Economía',
    'empresas': 'Economía',
    'dolar': 'Economía',
    'comercio_internacional': 'Economía',
    'politica_economica': 'Economía',
    'pobreza_e_inflacion': 'Economía',
    'estados_unidos': 'Mundo',
    'politica_exterior': 'Mundo',
    'medio_oriente': 'Mundo',
    'asia': 'Mundo',
    'internacional': 'Mundo',
    'latinoamerica': 'Mundo',
    'de_analisis': 'Tipos de notas',
    'de_opinion': 'Tipos de notas',
    'informativas': 'Tipos de notas',
    'entrevistas': 'Tipos de notas',
  };

  const stripHtml = (html) => {
    const doc = new DOMParser().parseFromString(html, 'text/html');
    return doc.body.textContent || '';
  };

  useEffect(() => {
    const fetchSubcategoryNews = async () => {
      setLoading(true);
      setError(null);
      try {
        if (!subcategory) {
          throw new Error('Subcategoría no válida');
        }

        const response = await api.get('noticias/');
        const normalizedSubcategory = subcategory.toLowerCase().trim();
        
        const filteredNews = response.data
          .filter(newsItem => {
            if (newsItem.estado !== 3) return false;
            
            const categoriesArray = Array.isArray(newsItem.categorias) 
              ? newsItem.categorias 
              : (typeof newsItem.categorias === 'string' && newsItem.categorias 
                 ? newsItem.categorias.split(',').map(cat => cat.trim().toLowerCase())
                 : []);
            
            return categoriesArray.includes(normalizedSubcategory);
          })
          .sort((a, b) => new Date(b.fecha_publicacion) - new Date(a.fecha_publicacion));

        await fetchAuthors(filteredNews);
        
        const processedNews = processNewsWithImages(filteredNews);
        
        // Insertar anuncios entre las noticias
        const newsWithAds = insertAdsIntoNews(processedNews, adConfigs);
        setNews(newsWithAds);

      } catch (error) {
        setError(error.message);
        console.error('Failed to fetch subcategory news:', error);
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

    fetchSubcategoryNews();
  }, [subcategory]);

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

  const generateNewsUrl = (newsItem) => {
    if (newsItem.slug) {
      return `/noticia/${newsItem.id}-${newsItem.slug}`;
    }
    return `/noticia/${newsItem.id}`;
  };

  if (loading) return <div className="flex justify-center items-center min-h-screen">Cargando noticias...</div>;
  if (error) return <div className="flex justify-center items-center min-h-screen text-red-600">Error: {error}</div>;

  const indexOfLastNews = currentPage * newsPerPage;
  const indexOfFirstNews = indexOfLastNews - newsPerPage;
  const currentNews = news.slice(indexOfFirstNews, indexOfLastNews);
  const totalPages = Math.ceil(news.length / newsPerPage);

  const parentCategory = categoryMapping[subcategory.toLowerCase()];

  return (
    <div className="subcategory-page">
      <div>
        <h1 className="page-title">
          {subcategory
            .replace(/_/g, ' ')
            .replace(/-/g, ' ')
            .split(' ')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ')
          }
        </h1>
      </div>
      
      {news.length === 0 ? (
        <p className="no-news">No hay noticias disponibles en esta subcategoría.</p>
      ) : (
        <>
          <div className="news-grid">
            {currentNews.map((item) => {
              // Si es un anuncio, renderizar el componente de anuncio
              if (item.isAd) {
                return <AdNewsItem key={item.id} adConfig={item.adConfig} />;
              }
              
              // Si es una noticia normal, renderizar como antes
              return (
                <Link to={generateNewsUrl(item)} key={item.id} className="news-item">
                  <div className="news-img-container">
                    <img 
                      src={item.contentImage} 
                      alt={item.nombre_noticia}
                      className="news-img"
                    />
                  </div>
                  <div className="news-content">
                    <h3 className="news-title">{item.nombre_noticia}</h3>
                    <p className="news-excerpt">{truncateContent(item.contenido)}</p>
                    <div className="news-meta">
                      <p className="news-date">
                        {new Date(item.fecha_publicacion).toLocaleDateString()}
                      </p>
                      {item.autorData && (
                        <p className="news-author">
                          Por {item.autorData.nombre} {item.autorData.apellido}
                        </p>
                      )}
                    </div>
                  </div>
                </Link>
              );
            })}
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

export default SubcategoryPage;