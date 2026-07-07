import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';

interface TooltipProps {
  content: React.ReactNode;
  children: React.ReactNode;
  position?: 'top' | 'bottom' | 'left' | 'right';
  className?: string;
}

export const Tooltip: React.FC<TooltipProps> = ({ 
  content, 
  children, 
  position = 'top',
  className = ''
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const triggerRef = useRef<HTMLDivElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);

  const updatePosition = () => {
    if (!triggerRef.current || !tooltipRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const tooltip = tooltipRef.current;
    
    const tooltipWidth = tooltip.offsetWidth;
    const tooltipHeight = tooltip.offsetHeight;
    
    let top = 0;
    let left = 0;

    const scrollY = window.scrollY;
    const scrollX = window.scrollX;
    const viewportWidth = window.innerWidth;

    const preferredLeft = rect.left + scrollX + rect.width / 2 - tooltipWidth / 2;

    switch (position) {
      case 'bottom':
        top = rect.bottom + scrollY + 8;
        left = preferredLeft;
        break;
      case 'left':
        top = rect.top + scrollY + rect.height / 2 - tooltipHeight / 2;
        left = rect.left + scrollX - tooltipWidth - 8;
        break;
      case 'right':
        top = rect.top + scrollY + rect.height / 2 - tooltipHeight / 2;
        left = rect.right + scrollX + 8;
        break;
      case 'top':
      default:
        top = rect.top + scrollY - tooltipHeight - 8;
        left = preferredLeft;
        break;
    }

    // Clamp horizontally to stay inside viewport (16px margin)
    const minLeft = scrollX + 16;
    const maxLeft = scrollX + viewportWidth - tooltipWidth - 16;
    const clampedLeft = Math.max(minLeft, Math.min(maxLeft, left));

    tooltip.style.top = `${top}px`;
    tooltip.style.left = `${clampedLeft}px`;

    // Handle arrow offset
    const arrow = tooltip.querySelector('.tooltip-arrow') as HTMLDivElement;
    if (arrow) {
      if (position === 'top' || position === 'bottom') {
        const triggerCenterOffset = (rect.left + scrollX + rect.width / 2) - clampedLeft;
        const clampedArrowOffset = Math.max(16, Math.min(tooltipWidth - 16, triggerCenterOffset));
        arrow.style.left = `${clampedArrowOffset}px`;
        arrow.style.transform = 'translateX(-50%)';
      } else {
        arrow.style.left = '';
        arrow.style.transform = '';
      }
    }
  };

  useEffect(() => {
    if (isVisible) {
      // Run once immediately
      updatePosition();
      
      // Run on next animation frame to let sizes settle
      const frameId = requestAnimationFrame(updatePosition);
      
      // Setup window listeners
      window.addEventListener('scroll', updatePosition, true);
      window.addEventListener('resize', updatePosition);
      
      return () => {
        cancelAnimationFrame(frameId);
        window.removeEventListener('scroll', updatePosition, true);
        window.removeEventListener('resize', updatePosition);
      };
    }
  }, [isVisible]);

  const showTooltip = () => setIsVisible(true);
  const hideTooltip = () => setIsVisible(false);

  const getArrowClasses = () => {
    switch (position) {
      case 'bottom': return 'bottom-full border-transparent border-b-slate-900 border-4';
      case 'left': return 'left-full top-1/2 -translate-y-1/2 border-transparent border-l-slate-900 border-4';
      case 'right': return 'right-full top-1/2 -translate-y-1/2 border-transparent border-r-slate-900 border-4';
      case 'top':
      default: return 'top-full border-transparent border-t-slate-900 border-4';
    }
  };

  if (!content) return <>{children}</>;

  const getAnimationClass = () => {
    switch (position) {
      case 'bottom': return 'animate-tooltip-bottom';
      case 'left': return 'animate-tooltip-left';
      case 'right': return 'animate-tooltip-right';
      case 'top':
      default: return 'animate-tooltip-top';
    }
  };

  return (
    <div 
      ref={triggerRef}
      className={`inline-block ${className}`}
      onMouseEnter={showTooltip}
      onMouseLeave={hideTooltip}
    >
      {children}
      {createPortal(
        <>
          <style dangerouslySetInnerHTML={{__html: `
            @keyframes tooltipTopIn {
              from { opacity: 0; transform: translateY(4px) scale(0.95); }
              to { opacity: 1; transform: translateY(0) scale(1); }
            }
            @keyframes tooltipBottomIn {
              from { opacity: 0; transform: translateY(-4px) scale(0.95); }
              to { opacity: 1; transform: translateY(0) scale(1); }
            }
            @keyframes tooltipLeftIn {
              from { opacity: 0; transform: translateX(4px) scale(0.95); }
              to { opacity: 1; transform: translateX(0) scale(1); }
            }
            @keyframes tooltipRightIn {
              from { opacity: 0; transform: translateX(-4px) scale(0.95); }
              to { opacity: 1; transform: translateX(0) scale(1); }
            }
            .animate-tooltip-top {
              animation: tooltipTopIn 0.12s cubic-bezier(0.16, 1, 0.3, 1) forwards;
              transform-origin: bottom center;
            }
            .animate-tooltip-bottom {
              animation: tooltipBottomIn 0.12s cubic-bezier(0.16, 1, 0.3, 1) forwards;
              transform-origin: top center;
            }
            .animate-tooltip-left {
              animation: tooltipLeftIn 0.12s cubic-bezier(0.16, 1, 0.3, 1) forwards;
              transform-origin: right center;
            }
            .animate-tooltip-right {
              animation: tooltipRightIn 0.12s cubic-bezier(0.16, 1, 0.3, 1) forwards;
              transform-origin: left center;
            }
          `}} />
          {isVisible && (
            <div
              ref={tooltipRef}
              style={{ 
                position: 'absolute',
                top: 0,
                left: 0,
                zIndex: 999999
              }}
              className={`px-3 py-2 bg-slate-900 text-white text-[11px] font-bold rounded-xl shadow-2xl max-w-[450px] whitespace-normal pointer-events-none border border-white/10 ${getAnimationClass()}`}
            >
              {content}
              <div 
                className={`absolute tooltip-arrow ${getArrowClasses()}`} 
              />
            </div>
          )}
        </>,
        document.body
      )}
    </div>
  );
};
