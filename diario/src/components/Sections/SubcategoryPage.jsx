import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import './SubcategoryPage.css';
import api from '../../pages/context/axiosConfig';

const SubcategoryPage = () => {
  const { subcategory } = useParams();
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
            
            // CORRECCIÓN: Asegurarnos de que categorias sea un array
            const categoriesArray = Array.isArray(newsItem.categorias) 
              ? newsItem.categorias 
              : (typeof newsItem.categorias === 'string' && newsItem.categorias 
                 ? newsItem.categorias.split(',').map(cat => cat.trim().toLowerCase())
                 : []);
            
            return categoriesArray.includes(normalizedSubcategory);
          })
          .sort((a, b) => new Date(b.fecha_publicacion) - new Date(a.fecha_publicacion));

        await fetchAuthors(filteredNews);
        
        // Procesar las noticias para extraer imágenes del contenido
        const processedNews = processNewsWithImages(filteredNews);
        setNews(processedNews);

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

  // Función para generar la URL con slug para las noticias
  const generateNewsUrl = (newsItem) => {
    // Si existe un slug en el objeto de noticia, usarlo
    if (newsItem.slug) {
      return `/noticia/${newsItem.id}-${newsItem.slug}`;
    }
    // Si no hay slug, usamos solo el ID como fallback
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
            {currentNews.map((newsItem) => (
              <Link to={generateNewsUrl(newsItem)} key={newsItem.id} className="news-item">
                <div className="news-img-container">
                  <img 
                    src={newsItem.contentImage} 
                    alt={newsItem.nombre_noticia}
                    className="news-img"
                  />
                </div>
                <div className="news-content">
                  <h3 className="news-title">{newsItem.nombre_noticia}</h3>
                  <p className="news-excerpt">{truncateContent(newsItem.contenido)}</p>
                  <div className="news-meta">
                    <p className="news-date">
                      {new Date(newsItem.fecha_publicacion).toLocaleDateString()}
                    </p>
                    {newsItem.autorData && (
                      <p className="news-author">
                        Por {newsItem.autorData.nombre} {newsItem.autorData.apellido}
                      </p>
                    )}
                  </div>
                </div>
              </Link>
            ))}
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