import  { useState, useEffect } from 'react';
import axios from 'axios';
import { useParams, Link } from 'react-router-dom';
import './SectionPage.css';
import api from '../../pages/context/axiosConfig';
const SectionPage = () => {
  const { sectionName } = useParams();
  const [news, setNews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const newsPerPage = 20;

  // Definir las categorías principales y sus subcategorías
  const mainSections = {
    'portada': ['portada'],
    'politica': ['legislativos', 'judiciales', 'conurbano', 'provincias', 'municipios', 'protestas'],
    'cultura': ['cine', 'literatura', 'moda', 'tecnologia', 'eventos'],
    'economia': ['finanzas', 'negocios', 'empresas', 'dolar'],
    'mundo': ['estados_unidos', 'politica_exterior', 'medio_oriente', 'asia', 'internacional']
  };

  // Función para eliminar etiquetas HTML
  const stripHtml = (html) => {
    const doc = new DOMParser().parseFromString(html, 'text/html');
    return doc.body.textContent || '';
  };

  useEffect(() => {
    const fetchSectionNews = async () => {
      setLoading(true);
      setError(null);
      try {
        if (!sectionName) {
          throw new Error('Sección no válida');
        }

        const response = await api.get('noticias/');
        const normalizedSectionName = sectionName.toLowerCase().trim();
        
        // Obtener las subcategorías correspondientes a la sección principal
        const subcategories = mainSections[normalizedSectionName] || [];

        // Filtrar noticias que pertenezcan a cualquiera de las subcategorías
        const filteredNews = response.data
          .filter(newsItem => {
            if (newsItem.estado !== 3) return false;
            
            // Verificar si alguna de las categorías de la noticia está en las subcategorías
            return newsItem.categorias.some(category => 
              subcategories.includes(category.toLowerCase())
            );
          })
          .sort((a, b) => new Date(b.fecha_publicacion) - new Date(a.fecha_publicacion));

        await fetchAuthors(filteredNews);
        setNews(filteredNews);

      } catch (error) {
        setError(error.message);
        console.error('Failed to fetch section news:', error);
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

    fetchSectionNews();
  }, [sectionName]);

  const handlePageChange = (pageNumber) => {
    setCurrentPage(pageNumber);
    window.scrollTo(0, 0); // Scroll to top when changing page
  };

  const truncateContent = (content, maxLength = 150) => {
    const plainText = stripHtml(content);
    return plainText.length > maxLength ? 
      plainText.slice(0, maxLength) + '...' : 
      plainText;
  };

  if (loading) return <div className="loading">Cargando noticias...</div>;
  if (error) return <div className="error">Error: {error}</div>;

  const indexOfLastNews = currentPage * newsPerPage;
  const indexOfFirstNews = indexOfLastNews - newsPerPage;
  const currentNews = news.slice(indexOfFirstNews, indexOfLastNews);
  const totalPages = Math.ceil(news.length / newsPerPage);

  return (
    <div className="section-page">
      <h1>{sectionName.charAt(0).toUpperCase() + sectionName.slice(1)}</h1>
      
      {news.length === 0 ? (
        <p className="no-news">No hay noticias disponibles en esta sección.</p>
      ) : (
        <>
          <div className="news-grid">
            {currentNews.map((newsItem) => (
              <Link to={`/noticia/${newsItem.id}`} key={newsItem.id} className="news-item">
                <div className="news-img-container">
                  <img 
                    src={newsItem.imagen_cabecera} 
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
                    <p className="news-category">
                      {newsItem.categorias
                        .filter(cat => mainSections[sectionName.toLowerCase()]?.includes(cat.toLowerCase()))
                        .join(', ')}
                    </p>
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

export default SectionPage;