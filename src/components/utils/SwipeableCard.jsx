import React, { useRef, useState } from 'react';
import { motion, useMotionValue, useTransform } from 'framer-motion';

export default function SwipeableCard({ 
  children, 
  onSwipeLeft, 
  onSwipeRight,
  onTap,
  className = ''
}) {
  const x = useMotionValue(0);
  const [isDragging, setIsDragging] = useState(false);
  
  const rotateZ = useTransform(x, [-200, 0, 200], [-10, 0, 10]);
  const opacity = useTransform(x, [-200, 0, 200], [0.5, 1, 0.5]);

  const handleDragEnd = (event, info) => {
    setIsDragging(false);
    const threshold = 100;
    
    if (info.offset.x > threshold && onSwipeRight) {
      onSwipeRight();
    } else if (info.offset.x < -threshold && onSwipeLeft) {
      onSwipeLeft();
    }
  };

  return (
    <motion.div
      className={className}
      style={{ x, rotateZ, opacity }}
      drag="x"
      dragConstraints={{ left: 0, right: 0 }}
      dragElastic={0.7}
      onDragStart={() => setIsDragging(true)}
      onDragEnd={handleDragEnd}
      onClick={() => !isDragging && onTap && onTap()}
      whileTap={{ scale: isDragging ? 1 : 0.98 }}
    >
      {children}
    </motion.div>
  );
}