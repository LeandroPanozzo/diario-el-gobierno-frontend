import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import 'slick-carousel/slick/slick.css';
import 'slick-carousel/slick/slick-theme.css';
import './home.css';
import api from '../context/axiosConfig';

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

const HomePage = () => {
  const [featuredNews, setFeaturedNews] = useState([]);
  const [sectionNews, setSectionNews] = useState({});
  const [recentNews, setRecentNews] = useState([]);
  const [mostViewedNews, setMostViewedNews] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
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

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        // Realizar todas las peticiones en paralelo para mejorar el rendimiento
        const [featuredResponse, recentResponse, mostViewedResponse] = await Promise.all([
          // 1. Noticias destacadas (Portada) - Usar el endpoint especializado con límite y incluir datos de autor
          api.get('noticias/por_categoria?categoria=Portada&estado=3&limit=5&include_autor=true'),
          
          // 2. Noticias recientes - Limitar a las 5 más recientes e incluir datos de autor
          api.get('noticias?estado=3&limit=5&include_autor=true'),
          
          // 3. Noticias más vistas - Usar el endpoint especializado
          api.get('noticias/mas_vistas?limit=5&include_autor=true')
        ]);

        // 4. Noticias por sección - Usar un objeto para guardar todas las promesas
        const mainSections = {
          'Politica': ['nacion','legislativos', 'policiales', 'elecciones', 'gobierno', 'provincias', 'capital'],
          'Cultura': ['cine', 'literatura', 'salud', 'tecnologia', 'eventos', 'educacion', 'efemerides','deporte'],
          'Economia': ['finanzas', 'comercio_internacional', 'politica_economica', 'dolar', 'pobreza_e_inflacion'],
          'Mundo': ['estados_unidos', 'asia', 'medio_oriente', 'internacional','latinoamerica'],
          'Tipos de notas': ['de_analisis', 'de_opinion','informativas','entrevistas']
        };

        // Crear un array de promesas para las secciones
        const sectionPromises = Object.entries(mainSections).map(async ([mainSection, subcategories]) => {
          // Convertir el array de subcategorías en una cadena separada por comas
          const categoriesParam = subcategories.join(',');
          const response = await api.get(`noticias/por_categoria?categoria=${categoriesParam}&estado=3&limit=7&include_autor=true`);
          return { section: mainSection, news: response.data };
        });

        // Esperar a que se completen todas las promesas de secciones
        const sectionsResults = await Promise.all(sectionPromises);

        // Procesar los resultados de las noticias destacadas
        const processedFeaturedNews = processNewsWithImages(featuredResponse.data);
        setFeaturedNews(processedFeaturedNews);
        
        // Procesar los resultados de las noticias recientes
        const processedRecentNews = processNewsWithImages(recentResponse.data);
        setRecentNews(processedRecentNews);
        
        // Procesar los resultados de las noticias más vistas
        const processedMostViewedNews = processNewsWithImages(mostViewedResponse.data);
        setMostViewedNews(processedMostViewedNews);

        // Procesar los resultados de las secciones
        const newSectionNews = {};
        sectionsResults.forEach(result => {
          newSectionNews[result.section] = processNewsWithImages(result.news);
        });
        setSectionNews(newSectionNews);

      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  const renderNewsSection = (newsArray, sectionTitle) => (
    <div className="news-section" key={sectionTitle}>
      <h2 className="section-title">{sectionTitle.toUpperCase()}</h2>
      <div className="news-grid">
        {newsArray.length > 0 && (
          <div className="main-article" onClick={() => navigate(`/noticia/${newsArray[0].id}`)}>
            <div className='recent-new'>
              <img src={newsArray[0].contentImage} alt={newsArray[0].nombre_noticia} />
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
              <div className='secondary-article-img'>
                <img src={newsItem.contentImage} alt={newsItem.nombre_noticia} />
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
              <img src={newsItem.contentImage} alt={newsItem.nombre_noticia} className="recent-news-image" />
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
                <img src={newsItem.contentImage} alt={newsItem.nombre_noticia} className="recent-news-image" />
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

  if (isLoading) {
    return <div className="loading">Cargando noticias...</div>;
  }

  return (
    <div className="container">
      <main>
        <div className="featured-article">
          {featuredNews.length > 0 && (
            <>
              <div className="featured-left" onClick={() => navigate(`/noticia/${featuredNews[0].id}`)}>
                <img src={featuredNews[0].contentImage} alt={featuredNews[0].nombre_noticia} />
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
                    <img src={newsItem.contentImage} alt={newsItem.nombre_noticia} />
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
            {renderMostViewedNews(mostViewedNews)}
          </div>
        </div>
      </main>
    </div>
  );
};

export default HomePage;