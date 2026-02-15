import React, { useState, useEffect } from 'react';

/**
 * Hook för att detektera mobil enhet
 */
export function useIsMobile() {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  return isMobile;
}

/**
 * Lazy image loading med placeholder och intersection observer
 */
export function LazyImage({ 
  src, 
  alt, 
  className = '',
  placeholderClassName = 'bg-slate-800 animate-pulse'
}) {
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);
  const [inView, setInView] = useState(false);
  const imgRef = React.useRef(null);

  useEffect(() => {
    if (!imgRef.current) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          observer.disconnect();
        }
      },
      { rootMargin: '100px' }
    );

    observer.observe(imgRef.current);

    return () => {
      if (imgRef.current) {
        observer.disconnect();
      }
    };
  }, []);

  return (
    <div ref={imgRef} className={`relative ${className}`}>
      {!loaded && !error && (
        <div className={`absolute inset-0 ${placeholderClassName}`} />
      )}
      {inView && (
        <img
          src={src}
          alt={alt}
          loading="lazy"
          className={`${className} transition-opacity duration-300 ${loaded ? 'opacity-100' : 'opacity-0'}`}
          onLoad={() => setLoaded(true)}
          onError={() => setError(true)}
        />
      )}
    </div>
  );
}

/**
 * Touch-optimerad knapp
 */
export function TouchButton({ 
  children, 
  onClick, 
  className = '',
  variant = 'primary',
  disabled = false,
  ...props 
}) {
  const baseClasses = 'min-h-[48px] px-6 rounded-xl font-medium transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed';
  
  const variants = {
    primary: 'bg-blue-600 hover:bg-blue-500 text-white',
    secondary: 'bg-white/10 hover:bg-white/20 text-white border border-white/20',
    danger: 'bg-red-600 hover:bg-red-500 text-white'
  };

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`${baseClasses} ${variants[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}

/**
 * Touch-optimerad checkbox med större hit area
 */
export function TouchCheckbox({ checked, onChange, label, className = '' }) {
  return (
    <label className={`flex items-center gap-3 cursor-pointer select-none min-h-[48px] ${className}`}>
      <div className="relative">
        <input
          type="checkbox"
          checked={checked}
          onChange={onChange}
          className="sr-only"
        />
        <div className={`w-6 h-6 rounded border-2 transition-all ${
          checked 
            ? 'bg-blue-600 border-blue-600' 
            : 'bg-transparent border-white/30'
        }`}>
          {checked && (
            <svg className="w-full h-full text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
            </svg>
          )}
        </div>
      </div>
      {label && <span className="text-white flex-1">{label}</span>}
    </label>
  );
}