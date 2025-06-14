// Opción 1: Crear un componente AdSense reutilizable
import { useEffect } from 'react';

const AdSenseAd = ({ 
  client = "ca-pub-5718334909043793",
  slot = "9072042757",
  format = "fluid",
  layoutKey = "-6t+ed+2i-1n-4w",
  style = { display: 'block' }
}) => {
  useEffect(() => {
    // Cargar el script de AdSense si no está cargado
    if (!window.adsbygoogle) {
      const script = document.createElement('script');
      script.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${client}`;
      script.async = true;
      script.crossOrigin = 'anonymous';
      document.head.appendChild(script);
    }

    // Inicializar el anuncio después de que el componente se monte
    try {
      (window.adsbygoogle = window.adsbygoogle || []).push({});
    } catch (err) {
      console.error('AdSense error:', err);
    }
  }, [client]);

  return (
    <div className="adsense-container">
      <ins
        className="adsbygoogle"
        style={style}
        data-ad-format={format}
        data-ad-layout-key={layoutKey}
        data-ad-client={client}
        data-ad-slot={slot}
      />
    </div>
  );
};

export default AdSenseAd;