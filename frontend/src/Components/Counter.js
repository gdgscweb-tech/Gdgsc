import { useState, useEffect, useRef, useCallback } from 'react';

const AnimatedCounter = ({ target, duration }) => {
  const [count, setCount] = useState(0);
  const elementRef = useRef(null);
  const animationFrameId = useRef(null);
  const isAnimating = useRef(false);

  const startCountAnimation = useCallback(() => {
    if (isAnimating.current) return;

    isAnimating.current = true;
    const startTime = performance.now();
    const endTime = startTime + duration;

    const animate = (currentTime) => {
      if (currentTime >= endTime) {
        setCount(target);
        isAnimating.current = false;
        animationFrameId.current = null;
        return;
      }

      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const currentCount = Math.floor(progress * target);

      setCount(currentCount);

      if (currentCount < target) {
        animationFrameId.current = requestAnimationFrame(animate);
      } else {
        isAnimating.current = false;
        animationFrameId.current = null;
      }
    };

    setCount(0);
    animationFrameId.current = requestAnimationFrame(animate);
  }, [target, duration]);

  useEffect(() => {
    const element = elementRef.current; // ✅ copy ref value

    const observer = new IntersectionObserver((entries) => {
      const [entry] = entries;

      if (entry.isIntersecting && !isAnimating.current) {
        startCountAnimation();
      } else if (!entry.isIntersecting) {
        setCount(0);
        if (animationFrameId.current) {
          cancelAnimationFrame(animationFrameId.current);
          animationFrameId.current = null;
        }
        isAnimating.current = false;
      }
    }, {
      threshold: 0.1,
      rootMargin: '20px'
    });

    if (element) {
      observer.observe(element);
    }

    return () => {
      if (element) {
        observer.unobserve(element); 
      }
      if (animationFrameId.current) {
        cancelAnimationFrame(animationFrameId.current);
      }
    };
  }, [startCountAnimation]); 

  return (
    <span ref={elementRef} style={{ background: "transparent", color: "#fff", fontWeight: "bold" }}>
      {count}
    </span>
  );
};

const Counter = ({ target, duration }) => {
  return (
    <div>
      <AnimatedCounter target={target} duration={duration} />
    </div>
  );
};

export default Counter;