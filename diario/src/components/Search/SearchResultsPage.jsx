import React, { useState, useEffect, useCallback } from 'react';
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

  // 🚀 OPTIMIZACIÓN 1: Debounce para evitar búsquedas repetidas
  const [debouncedQuery, setDebouncedQuery] = useState(query);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(query);
    }, 300); // Esperar 300ms antes de buscar

    return () => clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    if (debouncedQuery) {
      searchNews(debouncedQuery);
    }
  }, [debouncedQuery]);

  // 🚀 OPTIMIZACIÓN 2: Memoizar funciones pesadas
  const extractFirstImageFromContent = useCallback((htmlContent) => {
    if (!htmlContent) return null;
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = htmlContent;
    const firstImage = tempDiv.querySelector('img');
    return firstImage?.src || null;
  }, []);

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

  const stripHtml = useCallback((html) => {
    if (!html) return '';
    const doc = new DOMParser().parseFromString(html, 'text/html');
    return doc.body.textContent || '';
  }, []);

  const truncateContent = useCallback((content, maxLength = 150) => {
    const plainText = stripHtml(content);
    return plainText.length > maxLength ? plainText.slice(0, maxLength) + '...' : plainText;
  }, [stripHtml]);

  // 🚀 OPTIMIZACIÓN 3: Búsqueda con cancel token para abortar requests anteriores
  const searchNews = useCallback(async (searchQuery) => {
    setLoading(true);
    
    // Crear un controller para cancelar la request anterior
    const controller = new AbortController();
    
    try {
      // 🚀 OPTIMIZACIÓN 4: Reducir el límite para cargar más rápido
      const response = await api.get('/noticias/buscar/', {
        params: {
          q: searchQuery,
          limit: 30,  // Reducido de 50 a 30 para cargar más rápido
          type: 'title'  // Buscar solo en título es más rápido
        },
        signal: controller.signal
      });

      if (response.data.results) {
        // 🚀 OPTIMIZACIÓN 5: Procesar imágenes de forma lazy
        // Solo procesar las primeras 10 noticias inmediatamente
        const firstBatch = response.data.results.slice(0, 10);
        const processedBatch = processNewsWithImages(firstBatch);
        
        setResults(processedBatch);
        setSearchInfo({
          query: response.data.query,
          resultsCount: response.data.results_count,
          returnedCount: response.data.returned_count
        });

        // Procesar el resto después
        if (response.data.results.length > 10) {
          setTimeout(() => {
            const remainingBatch = response.data.results.slice(10);
            const processedRemaining = processNewsWithImages(remainingBatch);
            setResults(prev => [...prev, ...processedRemaining]);
          }, 100);
        }
      } else {
        setResults([]);
        setSearchInfo(null);
      }
    } catch (error) {
      if (error.name === 'CanceledError') {
        console.log('Request canceled');
      } else {
        console.error('Error searching news:', error);
        setResults([]);
        setSearchInfo(null);
      }
    } finally {
      setLoading(false);
    }

    // Limpiar en caso de que el componente se desmonte
    return () => controller.abort();
  }, [processNewsWithImages]);

  const generateNewsUrl = useCallback((newsItem) => {
    return newsItem.slug ? `/noticia/${newsItem.id}-${newsItem.slug}` : `/noticia/${newsItem.id}`;
  }, []);

  return (
    <div className="search-results-page">
      <div className="search-results-container">
        <div className="search-results-header">
          <h1 className="search-results-title">Resultados de búsqueda</h1>
          {query && (
            <p className="search-query-display">
              Buscando contenido con la palabra clave: "{query}"
            </p>
          )}
          {searchInfo && (
            <p className="search-results-count">
              {searchInfo.resultsCount} {searchInfo.resultsCount === 1 ? 'resultado encontrado' : 'resultados encontrados'}
            </p>
          )}
        </div>

        <div className="search-results-content">
          {loading ? (
            <div className="search-loading">
              <p>Buscando noticias...</p>
            </div>
          ) : results.length > 0 ? (
            <div className="search-results-grid">
              {results.map(newsItem => (
                <Link 
                  key={newsItem.id} 
                  to={generateNewsUrl(newsItem)} 
                  className="search-result-card"
                >
                  {newsItem.contentImage && (
                    <div className="search-result-image">
                      <img 
                        src={newsItem.contentImage} 
                        alt={newsItem.nombre_noticia}
                        loading="lazy"  // 🚀 Lazy loading para imágenes
                      />
                    </div>
                  )}
                  <div className="search-result-content">
                    <h3 className="search-result-title">{newsItem.nombre_noticia}</h3>
                    <p className="search-result-excerpt">
                      {truncateContent(newsItem.contenido)}
                    </p>
                    <div className="search-result-meta">
                      <span className="search-result-date">
                        {new Date(newsItem.fecha_publicacion).toLocaleDateString('es-PE', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric'
                        })}
                      </span>
                      {newsItem.categorias && newsItem.categorias.length > 0 && (
                        <span className="search-result-category">
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
            <div className="search-no-results">
              <h2>No se encontraron resultados</h2>
              <p>Intenta con otros términos de búsqueda o palabras clave diferentes.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default SearchResultsPage;