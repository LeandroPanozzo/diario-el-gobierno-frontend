import React, { useState, useEffect } from 'react';
import { useLocation, Link } from 'react-router-dom';
import api from '../../pages/context/axiosConfig';
import './SearchResultsPage.css';

function SearchResultsPage() {
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchInfo, setSearchInfo] = useState(null);
  const location = useLocation();
  
  const searchParams = new URLSearchParams(location.search);
  const query = searchParams.get('q');

  useEffect(() => {
    if (query) {
      searchNews(query);
    }
  }, [query]);

  // Función para extraer la primera imagen del contenido HTML (igual que SectionPage)
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

  // Función para eliminar etiquetas HTML (igual que SectionPage)
  const stripHtml = (html) => {
    if (!html) return '';
    const doc = new DOMParser().parseFromString(html, 'text/html');
    return doc.body.textContent || '';
  };

  // Función para truncar contenido (igual que SectionPage)
  const truncateContent = (content, maxLength = 150) => {
    const plainText = stripHtml(content);
    return plainText.length > maxLength ? 
      plainText.slice(0, maxLength) + '...' : 
      plainText;
  };

  const searchNews = async (searchQuery) => {
    setLoading(true);
    try {
      const response = await api.get('/noticias/buscar/', {
        params: { 
          q: searchQuery,
          limit: 50
        }
      });
      
      console.log('Search response:', response.data);
      
      if (response.data.results) {
        // Procesar las noticias con las imágenes (igual que SectionPage)
        const processedNews = processNewsWithImages(response.data.results);
        setResults(processedNews);
        setSearchInfo({
          query: response.data.query,
          resultsCount: response.data.results_count,
          returnedCount: response.data.returned_count
        });
      } else {
        setResults([]);
        setSearchInfo(null);
      }
    } catch (error) {
      console.error('Error searching news:', error);
      setResults([]);
      setSearchInfo(null);
    } finally {
      setLoading(false);
    }
  };

  const generateNewsUrl = (newsItem) => {
    return newsItem.slug 
      ? `/noticia/${newsItem.id}-${newsItem.slug}` 
      : `/noticia/${newsItem.id}`;
  };

  return (
    <div className="search-results-page">
      <div className="container">
        <div className="search-header">
          <h1>Resultados de búsqueda</h1>
          {query && (
            <p className="search-query">
              Buscando: <strong>"{query}"</strong>
            </p>
          )}
          {searchInfo && (
            <p className="search-count">
              {searchInfo.resultsCount} {searchInfo.resultsCount === 1 ? 'resultado encontrado' : 'resultados encontrados'}
            </p>
          )}
        </div>
        
        {loading ? (
          <div className="loading-container">
            <div className="spinner"></div>
            <p>Buscando noticias...</p>
          </div>
        ) : results.length > 0 ? (
          <div className="search-results">
            {results.map(newsItem => (
              <Link to={generateNewsUrl(newsItem)} key={newsItem.id} className="search-result-item">
                <div className="result-image">
                  <img 
                    src={newsItem.contentImage} 
                    alt={newsItem.nombre_noticia}
                    loading="lazy"
                  />
                </div>
                <div className="result-text">
                  <h2 className="result-title">{newsItem.nombre_noticia}</h2>
                  <p className="result-subtitle">{truncateContent(newsItem.contenido)}</p>
                  <div className="result-meta">
                    <span className="result-date">
                      {new Date(newsItem.fecha_publicacion).toLocaleDateString('es-PE', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })}
                    </span>
                    {newsItem.categorias && newsItem.categorias.length > 0 && (
                      <span className="result-category">
                        {Array.isArray(newsItem.categorias) 
                          ? newsItem.categorias[0].replace(/_/g, ' ').toUpperCase()
                          : newsItem.categorias.split(',')[0].trim().replace(/_/g, ' ').toUpperCase()}
                      </span>
                    )}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="no-results">
            <i className="ri-search-line"></i>
            <h2>No se encontraron resultados</h2>
            <p>Intenta con otros términos de búsqueda o palabras clave diferentes.</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default SearchResultsPage;