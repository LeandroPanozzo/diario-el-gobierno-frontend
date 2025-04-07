import React, { useEffect, useRef } from 'react';

const TwitterEmbed = ({ tweetUrl }) => {
  const tweetContainerRef = useRef(null);
  const isProcessingRef = useRef(false);

  useEffect(() => {
    // Verificar que el DOM esté listo y evitar procesamiento duplicado
    if (tweetContainerRef.current && window.twttr && !isProcessingRef.current) {
      isProcessingRef.current = true;
      
      // Limpiar contenido anterior si existe
      tweetContainerRef.current.innerHTML = '';
      
      // Renderizar el tweet
      window.twttr.widgets.createTweet(
        getTweetId(tweetUrl),
        tweetContainerRef.current,
        {
          theme: 'light',
          lang: 'es'
        }
      ).then(() => {
        isProcessingRef.current = false;
      }).catch(error => {
        console.error("Error al cargar el tweet:", error);
        isProcessingRef.current = false;
        
        // Mostrar mensaje de error amigable
        if (tweetContainerRef.current) {
          tweetContainerRef.current.innerHTML = 
            '<div style="padding: 10px; border: 1px solid #e0e0e0; border-radius: 10px; text-align: center;">' +
            '<p>No se pudo cargar el tweet. Por favor, verifica la URL.</p>' +
            '</div>';
        }
      });
    }
  }, [tweetUrl]);

  // Función para extraer el ID del tweet desde la URL
  const getTweetId = (url) => {
    // Extraer el ID del tweet de diferentes formatos de URL
    const formats = [
      /twitter\.com\/\w+\/status(?:es)?\/(\d+)/,
      /x\.com\/\w+\/status(?:es)?\/(\d+)/
    ];
    
    for (const format of formats) {
      const match = url.match(format);
      if (match && match[1]) {
        return match[1];
      }
    }
    
    return '';
  };

  return (
    <div 
      ref={tweetContainerRef} 
      className="twitter-embed-container"
      style={{ 
        margin: '20px auto', 
        maxWidth: '550px',
        minHeight: '100px',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center'
      }}
    >
      <div className="loading-tweet">Cargando tweet...</div>
    </div>
  );
};

export default TwitterEmbed;