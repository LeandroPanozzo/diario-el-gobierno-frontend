import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import './TagPage.css';
import api from '../../pages/context/axiosConfig';

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
            <Link to={generateNewsUrl(newsItem)} key={newsItem.id} className="news-item">
              <div className="news-img-container">
                <img src={newsItem.contentImage} alt={newsItem.nombre_noticia} className="news-img" />
              </div>
              <div className="news-content">
                <h3 className="news-title">{newsItem.nombre_noticia}</h3>
                <p className="news-description">
                  {truncateContent(newsItem.contenido)}
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
    </div>
  );
};

export default TagPage;