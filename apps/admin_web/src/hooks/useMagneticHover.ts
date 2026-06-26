import { useRef, useEffect } from 'react';
import gsap from 'gsap';

interface MagneticOptions {
  strength?: number;
  scale?: number;
  duration?: number;
}

export function useMagneticHover<T extends HTMLElement>(options: MagneticOptions = {}) {
  const { strength = 20, scale = 0.98, duration = 0.3 } = options;
  const ref = useRef<T>(null);
  
  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const xTo = gsap.quickTo(element, "x", { duration, ease: "power3.out" });
    const yTo = gsap.quickTo(element, "y", { duration, ease: "power3.out" });
    const scaleTo = gsap.quickTo(element, "scale", { duration: duration * 1.5, ease: "power3.out" });

    const handleMouseMove = (e: MouseEvent) => {
      const { clientX, clientY } = e;
      const { width, height, left, top } = element.getBoundingClientRect();
      const x = clientX - (left + width / 2);
      const y = clientY - (top + height / 2);
      
      xTo(x * (strength / 100));
      yTo(y * (strength / 100));
    };

    const handleMouseEnter = () => {
      scaleTo(scale);
    };

    const handleMouseLeave = () => {
      xTo(0);
      yTo(0);
      scaleTo(1);
    };

    element.addEventListener('mousemove', handleMouseMove);
    element.addEventListener('mouseenter', handleMouseEnter);
    element.addEventListener('mouseleave', handleMouseLeave);

    return () => {
      element.removeEventListener('mousemove', handleMouseMove);
      element.removeEventListener('mouseenter', handleMouseEnter);
      element.removeEventListener('mouseleave', handleMouseLeave);
    };
  }, [strength, scale, duration]);

  return ref;
}
