import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useParams, Link } from 'react-router-dom';
import './TagPage.css';

const TagPage = () => {
  const { tagName } = useParams();
  const [news, setNews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const newsPerPage = 20;

  useEffect(() => {
    const fetchTagNews = async () => {
      try {
        const response = await axios.get(`http://127.0.0.1:8000/diarioback/noticias/`);

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

        setNews(filteredNews);
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
            const authorResponse = await axios.get(`http://127.0.0.1:8000/diarioback/trabajadores/${newsItem.autor}/`);
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

  const truncateContent = (content, type) => {
    const plainText = stripHtml(content); // Eliminar etiquetas HTML
    
    switch (type) {
      case 'default':
        return plainText ? (plainText.length > 40 ? plainText.slice(0, 40) + '...' : plainText) : '';
      case 'main':
        return plainText ? (plainText.length > 40 ? plainText.slice(0, 40) + '...' : plainText) : '';
      case 'secondary':
        return plainText ? (plainText.length > 40 ? plainText.slice(0, 40) + '...' : plainText) : '';
      case 'recent':
        return plainText ? (plainText.length > 40 ? plainText.slice(0, 40) + '...' : plainText) : '';
      default:
        return plainText; // Sin truncado por defecto
    }
  };

  const handlePageChange = (pageNumber) => {
    setCurrentPage(pageNumber);
  };

  const indexOfLastNews = currentPage * newsPerPage;
  const indexOfFirstNews = indexOfLastNews - newsPerPage;
  const currentNews = news.slice(indexOfFirstNews, indexOfLastNews);
  const totalPages = Math.ceil(news.length / newsPerPage);

  if (loading) {
    return <div>Cargando noticias...</div>;
  }

  if (error) {
    return <div>Error: {error}</div>;
  }

  return (
    <div className="tag-page">
      <h1>Noticias con la etiqueta: {tagName}</h1>
      <div className="news-grid">
        {currentNews.length > 0 ? (
          currentNews.map((newsItem) => (
            <Link to={`/noticia/${newsItem.id}`} key={newsItem.id} className="news-item">
              <div className="news-img-container">
                <img src={newsItem.imagen_cabecera} alt={newsItem.nombre_noticia} className="news-img" />
              </div>
              <div className="news-content">
                <h3 className="news-title">{newsItem.nombre_noticia}</h3>
                <p className="news-description">
                  {truncateContent(newsItem.contenido, 'main')} {/* Usa el tipo adecuado para truncar */}
                </p>
                <p className="news-date">{new Date(newsItem.fecha_publicacion).toLocaleDateString()}</p>
                {newsItem.autorData && (
                  <p className="news-author">Por {newsItem.autorData.nombre} {newsItem.autorData.apellido} · {newsItem.categoria}</p>
                )}
              </div>
            </Link>
          ))
        ) : (
          <p>No hay noticias disponibles con esta etiqueta.</p>
        )}
      </div>

      {totalPages > 1 && (
        <div className="pagination">
          {[...Array(totalPages)].map((_, index) => (
            <button
              key={index + 1}
              onClick={() => handlePageChange(index + 1)}
              className={`page-button ${currentPage === index + 1 ? 'active' : ''}`}
            >
              {index + 1}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default TagPage;
