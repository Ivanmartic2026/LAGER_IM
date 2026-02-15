import { useEffect, useRef, useState } from 'react';

/**
 * Hook för lazy loading av bilder med Intersection Observer
 * Optimerar sidladdning genom att bara ladda synliga bilder
 */
export function useImageLazyLoad() {
  const [isVisible, setIsVisible] = useState(false);
  const imgRef = useRef(null);

  useEffect(() => {
    if (!imgRef.current) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      {
        rootMargin: '50px', // Ladda bilder 50px innan de syns
      }
    );

    observer.observe(imgRef.current);

    return () => {
      if (imgRef.current) {
        observer.disconnect();
      }
    };
  }, []);

  return { imgRef, isVisible };
}

/**
 * Hook för att preloada viktiga resurser
 */
export function usePreloadImages(urls) {
  useEffect(() => {
    if (!urls || urls.length === 0) return;

    urls.forEach(url => {
      const link = document.createElement('link');
      link.rel = 'preload';
      link.as = 'image';
      link.href = url;
      document.head.appendChild(link);
    });
  }, [urls]);
}

/**
 * Hook för att detektera långsam nätverksanslutning
 */
export function useSlowConnection() {
  const [isSlowConnection, setIsSlowConnection] = useState(false);

  useEffect(() => {
    // Check if Network Information API is available
    if ('connection' in navigator) {
      const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
      
      const checkConnection = () => {
        // effectiveType can be: 'slow-2g', '2g', '3g', or '4g'
        const slowTypes = ['slow-2g', '2g', '3g'];
        setIsSlowConnection(slowTypes.includes(connection.effectiveType));
      };

      checkConnection();
      connection.addEventListener('change', checkConnection);

      return () => {
        connection.removeEventListener('change', checkConnection);
      };
    }
  }, []);

  return isSlowConnection;
}