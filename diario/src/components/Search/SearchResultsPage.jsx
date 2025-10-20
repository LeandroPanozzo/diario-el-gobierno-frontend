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

  const searchNews = async (searchQuery) => {
    setLoading(true);
    try {
      const response = await api.get('/noticias/buscar/', {
        params: { 
          q: searchQuery,
          limit: 50  // Aumentar el límite de resultados
        }
      });
      
      console.log('Search response:', response.data);
      
      // La API devuelve un objeto con 'results' y metadata
      if (response.data.results) {
        setResults(response.data.results);
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

  const stripHtmlTags = (html) => {
    const tmp = document.createElement('DIV');
    tmp.innerHTML = html;
    return tmp.textContent || tmp.innerText || '';
  };

  const truncateText = (text, maxLength = 200) => {
    const cleanText = stripHtmlTags(text);
    if (cleanText.length <= maxLength) return cleanText;
    return cleanText.substring(0, maxLength) + '...';
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
              <article key={newsItem.id} className="search-result-item">
                <Link to={generateNewsUrl(newsItem)} className="result-link">
                  <div className="result-content">
                    {newsItem.imagen_1 && (
                      <div className="result-image">
                        <img 
                          src={newsItem.imagen_1} 
                          alt={newsItem.nombre_noticia}
                          loading="lazy"
                        />
                      </div>
                    )}
                    <div className="result-text">
                      <h2 className="result-title">{newsItem.nombre_noticia}</h2>
                      {newsItem.subtitulo && (
                        <p className="result-subtitle">{truncateText(newsItem.subtitulo, 150)}</p>
                      )}
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
                            {newsItem.categorias[0].replace(/_/g, ' ').toUpperCase()}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </Link>
              </article>
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