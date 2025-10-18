
import { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useUser } from '../../pages/context/UserContext';
import FacebookComments from '../FacebookComments/FacebookComments';
import './NewsDetail.css';
import NewsReactions from './NewsReactions';
import api from '../../pages/context/axiosConfig';
import TwitterEmbed from './TwitterEmbed';
import AdSenseAd from './AdSenseAd';

// Imagen por defecto para usuarios sin foto de perfil
const DEFAULT_AVATAR = "https://cdn.pixabay.com/photo/2015/10/05/22/37/blank-profile-picture-973460_1280.png";

// Función para extraer la primera imagen del contenido HTML
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

const NewsDetail = () => {
  const params = useParams();
  const [newsData, setNewsData] = useState(null);
  const [authorData, setAuthorData] = useState(null);
  const [editorsData, setEditorsData] = useState([]);
  const [palabrasClave, setPalabrasClave] = useState([]);
  const { user } = useUser();
  const [speechState, setSpeechState] = useState('stopped');
  const [speechProgress, setSpeechProgress] = useState(0);
  const [topNews, setTopNews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showStickyPlayer, setShowStickyPlayer] = useState(false);
  const speechUtteranceRef = useRef(null);
  const speechInterval = useRef(null);
  const progressBarRef = useRef(null);
  const audioTextRef = useRef('');
  const totalTextLengthRef = useRef(0);
  const speechStartTimeRef = useRef(null);
  const contentRef = useRef(null);

  // Extraemos el ID real de los parámetros de URL
  const getNewsId = () => {
    if (!params.id) return null;
    
    if (params.id.includes('-')) {
      return params.id.split('-')[0];
    }
    
    return params.id;
  };

  const newsId = getNewsId();
  
  // Utility function to strip HTML tags
  const stripHtmlPalabrasClave = (html) => {
    const tmp = document.createElement('DIV');
    tmp.innerHTML = html;
    return tmp.textContent || tmp.innerText || '';
  };

  // Cargar script de Twitter
  useEffect(() => {
    if (!window.twttr) {
      const script = document.createElement('script');
      script.src = 'https://platform.twitter.com/widgets.js';
      script.async = true;
      script.charset = 'utf-8';
      document.body.appendChild(script);
      
      return () => {
        if (document.body.contains(script)) {
          document.body.removeChild(script);
        }
      };
    }
  }, []);
  
  // Efecto para mostrar/ocultar el reproductor sticky
  useEffect(() => {
    const handleScroll = () => {
      if (contentRef.current) {
        const contentTop = contentRef.current.getBoundingClientRect().top;
        const windowHeight = window.innerHeight;
        
        // Mostrar el sticky player cuando el contenido esté en el viewport
        setShowStickyPlayer(contentTop < windowHeight - 100);
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Función para procesar contenido HTML
  const processContent = (htmlContent) => {
    if (!htmlContent) return '';
    
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = htmlContent;
    
    // Procesar tablas para agregar contenedor responsive
    const tables = tempDiv.querySelectorAll('table');
    tables.forEach(table => {
      if (!table.parentElement.classList.contains('table-container')) {
        const container = document.createElement('div');
        container.className = 'table-container';
        table.parentNode.insertBefore(container, table);
        container.appendChild(table);
      }
      
      table.classList.add('responsive-table');
    });
    
    // Procesar videos de YouTube
    const wrappedYoutubeContent = tempDiv.innerHTML.replace(
      /(<iframe[^>]*src=["']https?:\/\/(www\.)?youtube(-nocookie)?\.com\/embed\/[^"']+["'][^>]*><\/iframe>)/g,
      '<div class="video-container">$1</div>'
    );
    
    // Detectar enlaces de Twitter
    const tweetRegex = /(https?:\/\/(www\.)?(twitter\.com|x\.com)\/\w+\/status(es)?\/\d+[^\s"'<>]*)/g;
    const markedContent = wrappedYoutubeContent.replace(
      tweetRegex,
      '<!-- TWITTER_EMBED:$1 -->'
    );
    
    return markedContent;
  };
  
  const renderNewsContent = () => {
    if (!newsData || !newsData.contenido) return null;
    
    const processedContent = processContent(newsData.contenido);
    
    // Dividir el contenido por los marcadores de Twitter
    const parts = processedContent.split(/<!-- TWITTER_EMBED:(.*?) -->/);
    
    return parts.map((part, index) => {
      // Los índices pares son contenido HTML normal
      if (index % 2 === 0) {
        return <div key={`content-${index}`} dangerouslySetInnerHTML={{ __html: part }} />;
      }
      // Los índices impares son URLs de Twitter
      return <TwitterEmbed key={`tweet-${index}`} tweetUrl={part} />;
    });
  };

  const readContentAloud = () => {
    if (newsData && newsData.contenido) {
      const plainText = stripHtmlPalabrasClave(newsData.contenido);
      const truncatedText = plainText.substring(0, 3000);
  
      if (speechState === 'speaking') {
        // Pausar el discurso
        window.speechSynthesis.pause();
        setSpeechState('paused');
        clearInterval(speechInterval.current);
  
        // Guardar tiempo acumulado hablado
        const elapsedTime = performance.now() - speechStartTimeRef.current;
        speechStartTimeRef.current = elapsedTime;
        return;
      }
  
      if (speechState === 'paused') {
        // Reanudar el discurso
        window.speechSynthesis.resume();
        setSpeechState('speaking');
  
        // Restablecer el tiempo de inicio sumando el tiempo hablado previamente
        speechStartTimeRef.current = performance.now() - speechStartTimeRef.current;
  
        // Reiniciar el seguimiento del progreso
        speechInterval.current = setInterval(() => {
          const progress = calculateSpeechProgress(speechUtteranceRef.current);
          setSpeechProgress(progress);
        }, 100);
        return;
      }
  
      if (speechState === 'stopped') {
        // Iniciar nuevo discurso
        window.speechSynthesis.cancel();
  
        const speech = new SpeechSynthesisUtterance();
        speech.text = truncatedText;
        speech.lang = 'es-ES';
  
        // Seleccionar la voz de Microsoft si está disponible
        const voices = window.speechSynthesis.getVoices();
        const microsoftVoice = voices.find(voice =>
          voice.name.toLowerCase().includes('microsoft')
        );
        if (microsoftVoice) {
          speech.voice = microsoftVoice;
        } else {
          console.warn('Microsoft voice not available. Using default voice.');
        }
  
        speechUtteranceRef.current = speech;
        audioTextRef.current = truncatedText;
        totalTextLengthRef.current = truncatedText.length;
  
        speech.onstart = () => {
          setSpeechState('speaking');
          speechStartTimeRef.current = performance.now();
          speechInterval.current = setInterval(() => {
            const progress = calculateSpeechProgress(speech);
            setSpeechProgress(progress);
          }, 100);
        };
  
        speech.onend = () => {
          setSpeechState('stopped');
          setSpeechProgress(0);
          clearInterval(speechInterval.current);
        };
  
        speech.onerror = (event) => {
          console.error('Speech synthesis error:', event.error);
          setSpeechState('stopped');
          setSpeechProgress(0);
          clearInterval(speechInterval.current);
        };
  
        window.speechSynthesis.speak(speech);
      }
    }
  };
  
  // Calculate speech progress with more precision
  const calculateSpeechProgress = (utterance) => {
    if (!utterance || !audioTextRef.current) return 0;

    const totalLength = totalTextLengthRef.current;

    if (!window.speechSynthesis.speaking) return 100;

    const averageSpeechRate = 150; // Palabras por minuto
    const averageWordLength = 5;   // Caracteres por palabra

    const elapsedTime = performance.now() - speechStartTimeRef.current;

    const estimatedCharactersSpoken = (elapsedTime / 60000) * averageSpeechRate * averageWordLength;
    const totalSpokenLength = Math.min(totalLength, estimatedCharactersSpoken);

    return Math.min(100, Math.max(0, (totalSpokenLength / totalLength) * 100));
  };
  
  // YouTube-like progress bar seek
  const handleProgressBarClick = (e) => {
    if (!speechUtteranceRef.current || speechState !== 'speaking' || !progressBarRef.current) return;

    const progressBar = progressBarRef.current;
    const clickPosition = e.nativeEvent.offsetX;
    const barWidth = progressBar.offsetWidth;
    const clickPercentage = (clickPosition / barWidth) * 100;

    // Cancel current speech
    window.speechSynthesis.cancel();

    // Prepare new speech
    const speech = new SpeechSynthesisUtterance();
    const plainText = audioTextRef.current;

    // Calculate the starting point based on click percentage
    const startIndex = Math.floor((clickPercentage / 100) * plainText.length);
    speech.text = plainText.substring(startIndex);
    speech.lang = 'es-ES';

    speech.onstart = () => {
      setSpeechState('speaking');
      speechStartTimeRef.current = performance.now();
      setSpeechProgress(clickPercentage);
    };
    
    speech.onend = () => {
      setSpeechState('stopped');
      setSpeechProgress(0);
    };

    speech.onerror = (event) => {
      console.error('Speech synthesis error:', event.error);
      setSpeechState('stopped');
      setSpeechProgress(0);
    };

    speechUtteranceRef.current = speech;
    window.speechSynthesis.speak(speech);
  };

  useEffect(() => {
    const fetchNewsData = async () => {
      if (!newsId) return;
      
      try {
        setLoading(true);
        const isSlugUrl = params.id.includes('-');
        let response;
        
        if (isSlugUrl) {
          const fullId = params.id;
          response = await api.get(`noticias/${fullId}/`);
        } else {
          response = await api.get(`noticias/${newsId}/`);
        }
        
        const news = response.data;
        setNewsData(news);
    
        // Procesar palabras clave
        if (news.Palabras_clave) {
          const processedKeywords = news.Palabras_clave
            .split(',')
            .map(tag => tag.trim().replace(/_/g, ' '));
          setPalabrasClave(processedKeywords);
        }
    
        if (news.autor) {
          const authorResponse = await api.get(`trabajadores/${news.autor}/`);
          setAuthorData(authorResponse.data);
        }
        
        // Handle multiple editors
        if (news.editores_en_jefe && Array.isArray(news.editores_en_jefe) && news.editores_en_jefe.length > 0) {
          const editorsDataArray = [];
          
          for (const editorId of news.editores_en_jefe) {
            try {
              const editorResponse = await api.get(`trabajadores/${editorId}/`);
              editorsDataArray.push(editorResponse.data);
            } catch (editorError) {
              console.error(`Error fetching editor with ID ${editorId}:`, editorError);
            }
          }
          
          setEditorsData(editorsDataArray);
        } else if (news.editor_en_jefe) {
          try {
            const editorResponse = await api.get(`trabajadores/${news.editor_en_jefe}/`);
            setEditorsData([editorResponse.data]);
          } catch (error) {
            console.error('Error fetching editor data:', error);
          }
        }
      } catch (error) {
        console.error('Error fetching news data:', error);
      } finally {
        setLoading(false);
      }
    };

    const fetchTopNews = async () => {
      try {
        const response = await api.get('noticias/mas_vistas/');
        const filteredNews = response.data.filter(news => news.id.toString() !== newsId);
        const processedNews = processNewsWithImages(filteredNews.slice(0, 4));
        setTopNews(processedNews);
      } catch (error) {
        console.error('Error fetching top news:', error);
      }
    };

    fetchNewsData();
    fetchTopNews();

    return () => {
      window.speechSynthesis.cancel();
      clearInterval(speechInterval.current);
    };
  }, [newsId, params.id]);

  const handleDeleteComment = async (commentId) => {
    try {
      await api.delete(`comments/${commentId}/`, {
        headers: {
          'Authorization': `Bearer ${user.access}`
        }
      });
      console.log('Comment deleted successfully');
    } catch (error) {
      console.error('Error deleting comment:', error);
    }
  };

  if (loading) {
    return (
      <div className="news-detail-container">
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>Cargando noticia...</p>
        </div>
      </div>
    );
  }

  if (!newsData) {
    return (
      <div className="news-detail-container">
        <div className="error-container">
          <h2>Noticia no encontrada</h2>
          <p>La noticia que buscas no existe o ha sido eliminada.</p>
          <Link to="/" className="back-home-btn">Volver al inicio</Link>
        </div>
      </div>
    );
  }

  const { nombre_noticia, subtitulo, categorias, fecha_publicacion, imagen_cabecera, contenido } = newsData;
  const subcategories = Array.isArray(categorias) ? categorias : (categorias || '').split(',').filter(Boolean);

  return (
    <div className="news-detail-container">
      {/* Header de la noticia */}
      <div className="news-header">
        {/* Breadcrumb de categorías */}
        <div className="categories-container">
          {subcategories.map((category, index) => (
            <Link 
              key={index} 
              to={category.toLowerCase() === 'portada' ? '/seccion/portada' : `/subcategoria/${encodeURIComponent(category.toLowerCase())}`}
              className="news-section-link"
            >
              <span className="news-section">{category.replace(/_/g, ' ')}</span>
            </Link>
          ))}
        </div>

        {/* Título y subtítulo */}
        <div className="title-container">
          <h1 className="news-title">
            {nombre_noticia}
          </h1>

          {subtitulo !== "default content" && (
            <h2 className="news-subtitle">
              {subtitulo}
            </h2>
          )}

          <div className="news-info">
            <span className="news-date">
              {new Date(fecha_publicacion).toLocaleDateString('es-ES', { 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric'  
              })}
            </span>
          </div>
        </div>

        {/* Imagen de cabecera si existe */}
        {imagen_cabecera && (
          <div className="header-image-container">
            <img 
              src={imagen_cabecera} 
              alt={nombre_noticia}
              className="header-image"
            />
          </div>
        )}

        {/* Información de autor y editores */}
        <div className="author-editor-info">
          {authorData && (
            <div className="author-info">
              <h3 className="author-title">Redactor/es:</h3>
              <div className="author-details">
                <Link to={`/trabajador/${authorData.id}/noticias`} className="author-name">
                  {authorData.nombre} {authorData.apellido}
                </Link>
              </div>
            </div>
          )}
          
          {editorsData.length > 0 && (
            <div className="editor-info">
              <h3 className="editors-title">Editor/es:</h3>
              <div className="editors-list">
                {editorsData.map((editor, index) => (
                  <div key={index} className="editor-item">
                    <div className="editor-details">
                      <Link to={`/trabajador/${editor.id}/noticias`} className="editor-name">
                        {editor.nombre} {editor.apellido}
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
      
      {/* Contenido de la noticia */}
      <div className="news-content" ref={contentRef}>
        {renderNewsContent()}
      </div>
      
      {/* Anuncio después del contenido */}
      <div className="ad-section">
        <AdSenseAd />
      </div>
      
      {/* Palabras clave */}
      <div className="tags-section">
        <h3 className="tags-title">Palabras clave</h3>
        <div className="news-tags">
          {palabrasClave.map((tag, index) => (
            <Link key={index} to={`/tag/${encodeURIComponent(tag)}`} className="tag-link">
              <span className="tag">{tag}</span>
            </Link>
          ))}
        </div>
      </div>

      {/* Reacciones */}
      <div className="reactions-section">
        <div className="reactions-header">
          <h3 className="reactions-title">Reacciones</h3>
          <NewsReactions noticiaId={newsId} />
        </div>
      </div>

      {/* Anuncio antes de comentarios */}
      <div className="ad-section">
        <AdSenseAd />
      </div>

      {/* Comentarios */}
      <div className="comments-section">
        <h3 className="comments-title">Comentarios</h3>
        <FacebookComments 
          url={`${api.defaults.baseURL}noticias/${newsId}/`} 
          numPosts={5}
          canDeleteComments={user && user.es_trabajador}
          onDeleteComment={handleDeleteComment}
        />
      </div>

      {/* Noticias más leídas */}
      <div className="most-read-section">
        <h3 className="most-read-title">Lo más leído</h3>
        
        <div className="most-read-news-container">
          {topNews.map((news) => (
            <Link 
              key={news.id} 
              to={`/noticia/${news.id}${news.slug ? `-${news.slug}` : ''}`}
              className="most-read-news-item"
            >
              <div 
                className="most-read-news-image"
                style={{
                  backgroundImage: `url(${news.contentImage || news.imagen_cabecera})`
                }}
              />
              <div className="most-read-news-content">
                <h4>{news.nombre_noticia}</h4>
                <div className="most-read-news-date">
                  {new Date(news.fecha_publicacion).toLocaleDateString('es-ES', { 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric'  
                  })}
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
      
      {/* Anuncio final */}
      <div className="ad-section">
        <AdSenseAd />
      </div>

      {/* Reproductor Sticky */}
      {showStickyPlayer && (
        <div className="sticky-audio-player">
          <div className="sticky-player-content">
            <div className="player-info">
              <div className="player-icon">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/>
                </svg>
              </div>
              <div className="player-text">
                <span className="player-title">Reproduciendo noticia</span>
                <div className="player-progress">
                  <div 
                    className="player-progress-bar"
                    style={{ width: `${speechProgress}%` }}
                  ></div>
                </div>
              </div>
            </div>
            <div className="player-controls">
              <button 
                onClick={readContentAloud}
                className={`player-button ${speechState}`}
              >
                {speechState === 'speaking' ? (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M6 6h4v12H6zM14 6h4v12h-4z"/>
                  </svg>
                ) : speechState === 'paused' ? (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M8 5v14l11-7z"/>
                  </svg>
                ) : (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M8 5v14l11-7z"/>
                  </svg>
                )}
              </button>
              <button 
                onClick={() => {
                  window.speechSynthesis.cancel();
                  setSpeechState('stopped');
                  setSpeechProgress(0);
                }}
                className="player-close-button"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
                </svg>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default NewsDetail;