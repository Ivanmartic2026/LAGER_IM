import { useEffect, useRef, useState } from 'react';

/**
 * Custom hook for lazy loading images
 * Improves performance by deferring image loading until visible
 */
export function useImageLazyLoad() {
  const imageRef = useRef(null);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    if (!imageRef.current) return;

    const observer = new IntersectionObserver(
      entries => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            const img = entry.target;
            if (img.dataset.src && !img.src) {
              img.src = img.dataset.src;
              setIsLoaded(true);
              observer.unobserve(img);
            }
          }
        });
      },
      { rootMargin: '50px' }
    );

    observer.observe(imageRef.current);
    return () => observer.disconnect();
  }, []);

  return { imageRef, isLoaded };
}