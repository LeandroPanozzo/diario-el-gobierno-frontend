import  { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import 'slick-carousel/slick/slick.css';
import 'slick-carousel/slick/slick-theme.css';
import './home.css';
import { text } from '@fortawesome/fontawesome-svg-core';
import  api from '../context/axiosConfig';

const HomePage = () => {
  const [featuredNews, setFeaturedNews] = useState([]);
  const [sectionNews, setSectionNews] = useState({});
  const [recentNews, setRecentNews] = useState([]);
  const [mostViewedNews, setMostViewedNews] = useState([]);
  const navigate = useNavigate();

  // Content processing functions
  const stripHtml = (html) => {
    const doc = new DOMParser().parseFromString(html, 'text/html');
    return doc.body.textContent || "";
  };

  const getFirstParagraphContent = (content) => {
    const plainText = stripHtml(content);
    const words = plainText.split(/\s+/);
    return words.slice(0, 30).join(' ') + (words.length > 30 ? '...' : '');
  };

  const truncateTitle = (title, maxLength) => {
    return title.length > maxLength ? title.slice(0, maxLength) + '...' : title;
  };

  const truncateContent = (content, type) => {
    const plainText = stripHtml(content);
    
    switch (type) {
      case 'default':
        return plainText ? (plainText.length > 20 ? plainText.slice(0, 20) + '...' : plainText) : '';
      case 'main':
        return plainText ? (plainText.length > 150 ? plainText.slice(0, 150) + '...' : plainText) : '';
      case 'secondary':
        return plainText ? (plainText.length > 10 ? plainText.slice(0, 10) + '...' : plainText) : '';
      case 'recent':
        return plainText ? (plainText.length > 20 ? plainText.slice(0, 20) + '...' : plainText) : '';
      default:
        return plainText;
    }
  };

  const truncateSubtitle = (subtitle, content) => {
    if (subtitle === 'default content') {
      return truncateContent(content);
    }
    return subtitle;
  };

  useEffect(() => {
    const fetchFeaturedNews = async () => {
      try {
        const response = await api.get('noticias');
        const filteredNews = response.data.filter(
          newsItem => newsItem.estado === 3 && newsItem.categorias.includes('Portada')
        );
        const sortedNews = filteredNews.sort((a, b) => new Date(b.fecha_publicacion) - new Date(a.fecha_publicacion));
        await fetchAuthorsAndEditors(sortedNews);
        setFeaturedNews(sortedNews.slice(0, 5));
      } catch (error) {
        console.error('Failed to fetch featured news:', error);
      }
    };


    const fetchSectionNews = async () => {
      // Definir las secciones principales y sus subcategorías
      const mainSections = {
        'Politica': ['legislativos', 'judiciales', 'conurbano', 'provincias', 'municipios', 'protestas'],
        'Cultura': ['cine', 'literatura', 'moda', 'tecnologia', 'eventos'],
        'Economia': ['finanzas', 'negocios', 'empresas', 'dolar'],
        'Mundo': ['politica_exterior', 'estados_unidos', 'asia', 'medio_oriente', 'internacional']
      };

      try {
        const response = await api.get('noticias');
        const filteredNews = response.data.filter(newsItem => newsItem.estado === 3);
        await fetchAuthorsAndEditors(filteredNews);

        const newSectionNews = {};
        
        Object.entries(mainSections).forEach(([mainSection, subcategories]) => {
          const sectionNews = filteredNews.filter(newsItem => {
            const categories = newsItem.categorias;
            return categories.some(category => 
              subcategories.includes(category.toLowerCase())
            );
          }).sort((a, b) => new Date(b.fecha_publicacion) - new Date(a.fecha_publicacion));

          newSectionNews[mainSection] = sectionNews.slice(0, 7);
        });

        setSectionNews(newSectionNews);
      } catch (error) {
        console.error('Failed to fetch section news:', error);
      }
    };

    const fetchRecentNews = async () => {
      try {
        const response = await api.get('noticias');
        const sortedNews = response.data
          .filter(newsItem => newsItem.estado === 3)
          .sort((a, b) => new Date(b.fecha_publicacion) - new Date(a.fecha_publicacion));

        await fetchAuthorsAndEditors(sortedNews);
        setRecentNews(sortedNews.slice(0, 5));
      } catch (error) {
        console.error('Failed to fetch recent news:', error);
      }
    };
    const fetchMostViewedNews = async () => {
      try {
        const response = await api.get('noticias/mas_vistas/');
        const filteredNews = response.data
          .filter(newsItem => newsItem.estado === 3)
          .sort((a, b) => b.contador_visitas - a.contador_visitas)
          .slice(0, 5);
        
        await fetchAuthorsAndEditors(filteredNews);
        setMostViewedNews(filteredNews);
      } catch (error) {
        console.error('Failed to fetch most viewed news:', error);
      }
    };

    const fetchAuthorsAndEditors = async (newsList) => {
      for (const newsItem of newsList) {
        if (newsItem.autor) {
          try {
            const authorResponse = await api.get(`trabajadores/${newsItem.autor}/`);
            newsItem.autorData = authorResponse.data;
          } catch (error) {
            console.error('Error fetching author data:', error);
          }
        }
        if (newsItem.editor_en_jefe) {
          try {
            const editorResponse = await api.get(`trabajadores/${newsItem.editor_en_jefe}/`);
            newsItem.editorData = editorResponse.data;
          } catch (error) {
            console.error('Error fetching editor data:', error);
          }
        }
      }
    };

    fetchFeaturedNews();
    fetchSectionNews();
    fetchRecentNews();
    fetchMostViewedNews();
  }, []);

  const renderNewsSection = (newsArray, sectionTitle) => (
    <div className="news-section" key={sectionTitle}>
      
      <h2 className="section-title">{sectionTitle.toUpperCase()}</h2>
      <div className="news-grid">
        {newsArray.length > 0 && (
          <div className="main-article " onClick={() => navigate(`/noticia/${newsArray[0].id}`)}>
              <div className='recent-new'>
            <img src={newsArray[0].imagen_cabecera}  alt={newsArray[0].nombre_noticia} />

              </div>
            <div className="main-article-content">
              <h3>{truncateTitle(newsArray[0].nombre_noticia, 60)}</h3>
              <div>
              
              {newsArray[0].autorData && (
                <p className="author">
                  por {newsArray[0].autorData.nombre} {newsArray[0].autorData.apellido}
                </p>
              )}
              <p className="date">{new Date(newsArray[0].fecha_publicacion).toLocaleDateString()}</p>
              </div>
              <p className="article-preview">
                {getFirstParagraphContent(newsArray[0].contenido)}
              </p>
            </div>
          </div>
        )}
        <div className="secondary-articles">
          {newsArray.slice(1, 5).map((newsItem) => (
            <div
              key={newsItem.id}
              className="secondary-article"
              onClick={() => navigate(`/noticia/${newsItem.id}`)}
            >
              <div className='secondary-article-img '>
              <img src={newsItem.imagen_cabecera} alt={newsItem.nombre_noticia} />
              </div>
              <div className="secondary-article-content">
                <h4>{newsItem.nombre_noticia}</h4>
                {newsItem.autorData && (
                  <p className="author">
                    por {newsItem.autorData.nombre} {newsItem.autorData.apellido}
                  </p>
                )}
                <p className="date">{new Date(newsItem.fecha_publicacion).toLocaleDateString()}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const renderRecentNews = (recentNewsArray) => (
    <div className="recent-news-section">
      <h2 className="section-title">NOTICIAS RECIENTES</h2>
      <div className="recent-news-list">
        {recentNewsArray.map(newsItem => (
          <div
            key={newsItem.id}
            className="recent-news-item"
            onClick={() => navigate(`/noticia/${newsItem.id}`)}
          >
            <div className='recent-new'>
            <img src={newsItem.imagen_cabecera} alt={newsItem.nombre_noticia} className="recent-news-image" />
            </div>
            <div className="recent-news-content">
              <h4>{newsItem.nombre_noticia}</h4>
              <p className="date">{new Date(newsItem.fecha_publicacion).toLocaleDateString()}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const renderMostViewedNews = (mostViewedNewsArray) => (
    <div className="recent-news-section">
      <h2 className="section-title">MÁS LEÍDAS</h2>
      <div className="recent-news-list">
        {mostViewedNewsArray.length > 0 ? (
          mostViewedNewsArray.map(newsItem => (
            <div
              key={newsItem.id}
              className="recent-news-item"
              onClick={() => navigate(`/noticia/${newsItem.id}`)}
            >
              <div className='recent-new'>
              <img src={newsItem.imagen_cabecera} alt={newsItem.nombre_noticia} className="recent-news-image" />

              </div>
              <div className="recent-news-content">
                <h4>{newsItem.nombre_noticia}</h4>
                <div className="news-meta">
                  <p className="date">{new Date(newsItem.fecha_publicacion).toLocaleDateString()}</p>
                </div>
              </div>
            </div>
          ))
        ) : (
          <p>No hay noticias destacadas</p>
        )}
      </div>
    </div>
  );

  return (
    <div className="container">
      <main>
        <div className="featured-article">
          {featuredNews.length > 0 && (
            <>
              <div className="featured-left" onClick={() => navigate(`/noticia/${featuredNews[0].id}`)}>
                <img src={featuredNews[0].imagen_cabecera} alt={featuredNews[0].nombre_noticia} />
                <div className="overlay">
                  <h1 style={{ color: 'white' }}>{featuredNews[0].nombre_noticia}</h1>
                  <p>{new Date(featuredNews[0].fecha_publicacion).toLocaleDateString()}</p>
                  {featuredNews[0].autorData && (
                    <p className="author" style={{ marginTop: '-5px' }}>
                      por {featuredNews[0].autorData.nombre} {featuredNews[0].autorData.apellido}
                    </p>
                  )}
                </div>
              </div>

              <div className="featured-right">
                {featuredNews.slice(1, 3).map((newsItem) => (
                  <div
                    key={newsItem.id}
                    className="carousel-item"
                    onClick={() => navigate(`/noticia/${newsItem.id}`)}
                  >
                    <img src={newsItem.imagen_cabecera} alt={newsItem.nombre_noticia} />
                    <div className="gradient-overlay"></div>
                    <div className="carousel-caption">
                      <h3 style={{ color: 'white' }}>{newsItem.nombre_noticia}</h3>
                      <p>{new Date(newsItem.fecha_publicacion).toLocaleDateString()}</p>
                      {newsItem.autorData && (
                        <p className="author">
                          por {newsItem.autorData.nombre} {newsItem.autorData.apellido}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        <div className="sections-and-recent-news">
          <div className="news-sections">
            {Object.entries(sectionNews).map(([sectionTitle, newsArray]) =>
              renderNewsSection(newsArray, sectionTitle)
            )}
          </div>

          <div className="recent-news">
            {renderRecentNews(recentNews)}
            {renderMostViewedNews(mostViewedNews)} {/* Add this new section */}
          </div>
        </div>
      </main>
    </div>
  );
};

export default HomePage;
