import { useEffect, useRef } from 'react';

const AdSenseAd = ({ 
  client = "ca-pub-5718334909043793",
  slot = "9072042757",
  format = "auto",
  fullWidthResponsive = true,
  style = { display: 'block' },
  className = ""
}) => {
  const adRef = useRef(null);

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
    const initializeAd = () => {
      try {
        if (window.adsbygoogle && adRef.current) {
          (window.adsbygoogle = window.adsbygoogle || []).push({});
        }
      } catch (err) {
        console.error('AdSense error:', err);
      }
    };

    // Pequeño delay para asegurar que el DOM esté listo
    const timer = setTimeout(initializeAd, 100);
    
    return () => clearTimeout(timer);
  }, [client]);

  return (
    <div className={`adsense-container ${className}`} style={{
      width: '100%',
      maxWidth: '100%',
      margin: '20px auto',
      padding: '10px',
      textAlign: 'center',
      overflow: 'hidden'
    }}>
      <ins
        ref={adRef}
        className="adsbygoogle"
        style={{
          display: 'block',
          width: '100%',
          maxWidth: '100%',
          ...style
        }}
        data-ad-format={format}
        data-ad-client={client}
        data-ad-slot={slot}
        data-full-width-responsive={fullWidthResponsive}
      />
    </div>
  );
};

// Componente especializado para diferentes tamaños
export const ResponsiveAdSenseAd = ({ 
  client = "ca-pub-5718334909043793",
  slot = "9072042757",
  type = "banner" // "banner", "rectangle", "leaderboard", "mobile"
}) => {
  const adConfigs = {
    banner: {
      format: "auto",
      fullWidthResponsive: true,
      style: { display: 'block', minHeight: '280px' }
    },
    rectangle: {
      format: "rectangle",
      fullWidthResponsive: false,
      style: { 
        display: 'inline-block', 
        width: '300px', 
        height: '250px',
        maxWidth: '100%'
      }
    },
    leaderboard: {
      format: "auto",
      fullWidthResponsive: true,
      style: { 
        display: 'block', 
        minHeight: '90px',
        '@media (max-width: 768px)': {
          minHeight: '50px'
        }
      }
    },
    mobile: {
      format: "auto",
      fullWidthResponsive: true,
      style: { 
        display: 'block', 
        minHeight: '250px'
      }
    }
  };

  const config = adConfigs[type] || adConfigs.banner;

  return (
    <AdSenseAd
      client={client}
      slot={slot}
      format={config.format}
      fullWidthResponsive={config.fullWidthResponsive}
      style={config.style}
      className={`adsense-${type}`}
    />
  );
};

export default AdSenseAd;