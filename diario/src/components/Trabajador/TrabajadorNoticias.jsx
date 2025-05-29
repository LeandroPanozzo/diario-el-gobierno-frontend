import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import './TrabajadorNoticias.css'; // Asegúrate de tener estilos aquí
import api from '../../pages/context/axiosConfig';

const TrabajadorNoticias = () => {
  const { trabajadorId } = useParams();
  const [noticias, setNoticias] = useState([]);
  const [trabajador, setTrabajador] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

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
    const fetchTrabajador = async () => {
      try {
        const response = await api.get(`trabajadores/${trabajadorId}/`);
        setTrabajador(response.data);
      } catch (error) {
        console.error('Error fetching worker details:', error);
      }
    };

    const fetchNoticias = async () => {
      try {
        const response = await api.get(`noticias/?autor=${trabajadorId}`);
        
        // Procesar las noticias para extraer imágenes del contenido
        const processedNews = processNewsWithImages(response.data);
        setNoticias(processedNews);
      } catch (error) {
        setError('Error al cargar las noticias.');
        console.error('Error fetching news for the worker:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchTrabajador();
    fetchNoticias();
  }, [trabajadorId]);

  const stripHtml = (html) => {
    const doc = new DOMParser().parseFromString(html, 'text/html');
    return doc.body.textContent || '';
  };

  const truncateContent = (content, type) => {
    const plainText = stripHtml(content); // Eliminar etiquetas HTML
    
    switch (type) {
      case 'default':
          return plainText ? (plainText.length > 140 ? plainText.slice(0, 140) + '...' : plainText) : '';
      case 'main':
          return plainText ? (plainText.length > 150 ? plainText.slice(0, 150) + '...' : plainText) : '';
      case 'secondary':
          return plainText ? (plainText.length > 140 ? plainText.slice(0, 140) + '...' : plainText) : '';
      case 'recent':
          return plainText ? (plainText.length > 140 ? plainText.slice(0, 140) + '...' : plainText) : '';
      default:
          return plainText; // Sin truncado por defecto
    }
  };

  if (loading) {
    return <div>Cargando noticias...</div>;
  }

  if (error) {
    return <div>{error}</div>;
  }

  return (
    <div className="trabajador-page">
      <div className="trabajador-header">
        {trabajador && (
          <div className="trabajador-info">
            <img
              src={trabajador.foto_perfil}
              alt={`${trabajador.nombre} ${trabajador.apellido}`}
              className="trabajador-profile-image"
            />
            <div>
              <h1 className="trabajador-name">
                Noticias de {trabajador.nombre} {trabajador.apellido}
              </h1>
              <p className="trabajador-description">Sobre {trabajador.nombre}: {trabajador.descripcion_usuario}</p> {/* Mostrar la descripción */}
            </div>
          </div>
        )}
      </div>

      <div className="news-grid">
        {noticias.length > 0 ? (
          noticias.map((noticia) => (
            <Link to={generateNewsUrl(noticia)} key={noticia.id} className="news-item">
              <div className="news-img-container">
                <img src={noticia.contentImage} alt={noticia.nombre_noticia} className="news-img" />
              </div>
              <div className="news-content">
                <h3 className="news-title">{noticia.nombre_noticia}</h3>
                <p className="news-description">
                  {noticia.subtitulo === 'default content' 
                    ? truncateContent(noticia.contenido, 'default') 
                    : truncateContent(noticia.contenido, 'main')}
                </p>
                <p className="news-date">{new Date(noticia.fecha_publicacion).toLocaleDateString()}</p>
              </div>
            </Link>
          ))
        ) : (
          <p>No hay noticias para mostrar.</p>
        )}
      </div>
    </div>
  );
};

export default TrabajadorNoticias;