import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import axios from 'axios';
import './SubcategoryPage.css';

const SubcategoryPage = () => {
  const { subcategory } = useParams();
  const [news, setNews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const newsPerPage = 20;

  // Map of subcategories to their parent categories for better navigation
  const categoryMapping = {
    'legislativos': 'Política',
    'judiciales': 'Política',
    'conurbano': 'Política',
    'provincias': 'Política',
    'municipios': 'Política',
    'protestas': 'Política',
    'cine': 'Cultura',
    'literatura': 'Cultura',
    'moda': 'Cultura',
    'tecnologia': 'Cultura',
    'eventos': 'Cultura',
    'finanzas': 'Economía',
    'negocios': 'Economía',
    'empresas': 'Economía',
    'dolar': 'Economía',
    'estados_unidos': 'Mundo',
    'politica_exterior': 'Mundo',
    'medio_oriente': 'Mundo',
    'asia': 'Mundo',
    'internacional': 'Mundo',
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

        const response = await axios.get('http://127.0.0.1:8000/diarioback/noticias/');
        const normalizedSubcategory = subcategory.toLowerCase().trim();
        
        const filteredNews = response.data
          .filter(newsItem => {
            if (newsItem.estado !== 3) return false;
            return newsItem.categorias.includes(normalizedSubcategory);
          })
          .sort((a, b) => new Date(b.fecha_publicacion) - new Date(a.fecha_publicacion));

        await fetchAuthors(filteredNews);
        setNews(filteredNews);

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
            const authorResponse = await axios.get(`http://127.0.0.1:8000/diarioback/trabajadores/${newsItem.autor}/`);
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