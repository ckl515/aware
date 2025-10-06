import { useEffect, useState } from "react";

interface Props {
  number: number;
}

function NumberBadge({ number }: Props) {
  const [displayNumber, setDisplayNumber] = useState(0);
  const [isVisible, setIsVisible] = useState(false);
  const [shouldBlink, setShouldBlink] = useState(false);

  // Animate number counting up
  useEffect(() => {
    setIsVisible(true);
    let start = 0;
    const end = number;
    const duration = 1000; // 1 second
    const increment = end / (duration / 16); // 60fps
    
    const timer = setInterval(() => {
      start += increment;
      if (start >= end) {
        setDisplayNumber(end);
        clearInterval(timer);
        // Trigger single blink when counting is done
        setShouldBlink(true);
        setTimeout(() => setShouldBlink(false), 800); // Duration of blink animation
      } else {
        setDisplayNumber(Math.floor(start));
      }
    }, 16);

    return () => clearInterval(timer);
  }, [number]);

  // Get badge color based on severity
  const getBadgeStyle = (num: number) => {
    if (num === 0) return {
      bg: 'bg-gradient-to-br from-green-500 to-green-600',
      shadow: 'shadow-green-200',
      ring: 'ring-green-200'
    };
    if (num <= 5) return {
      bg: 'bg-gradient-to-br from-yellow-500 to-orange-500',
      shadow: 'shadow-orange-200',
      ring: 'ring-orange-200'
    };
    if (num <= 15) return {
      bg: 'bg-gradient-to-br from-orange-500 to-red-500',
      shadow: 'shadow-red-200',
      ring: 'ring-red-200'
    };
    return {
      bg: 'bg-gradient-to-br from-red-600 to-red-700',
      shadow: 'shadow-red-300',
      ring: 'ring-red-300'
    };
  };

  const badgeStyle = getBadgeStyle(number);

  return (
    <div className={`
      relative w-28 h-28 rounded-full ${badgeStyle.bg} 
      flex items-center justify-center select-none
      transition-all-smooth transform-gpu
      ${isVisible ? 'animate-fade-in-scale' : 'opacity-0 scale-90'}
      hover:scale-110 cursor-pointer
      shadow-lg ${badgeStyle.shadow}
      ring-4 ${badgeStyle.ring}
      before:absolute before:inset-0 before:rounded-full 
      before:bg-gradient-to-tr before:from-white/20 before:to-transparent
      group
    `}>
      {/* Animated pulse ring */}
      <div className={`
        absolute inset-0 rounded-full ${badgeStyle.bg} 
        animate-ping opacity-20 group-hover:opacity-40
      `} />
      
      {/* Number display */}
      <div className="relative z-10 text-center">
        <p className={`text-white font-bold text-4xl leading-none transform transition-transform group-hover:scale-110 ${shouldBlink ? 'animate-blink-once' : ''}`}>
          {displayNumber > 99 ? (
            <div className="flex items-center justify-center gap-0.5">
              <span>99</span>
              <span className="text-2xl animate-bounce-custom">+</span>
            </div>
          ) : (
            <span className="inline-block">
              {displayNumber}
            </span>
          )}
        </p>
        
        {/* Label */}
        <p className="text-white text-xs font-medium opacity-90 mt-1">
          ISSUES
        </p>
      </div>

      {/* Sparkle effects for zero issues */}
      {number === 0 && (
        <>
          <div className="absolute top-2 right-2 w-2 h-2 bg-white rounded-full animate-ping opacity-60" />
          <div className="absolute bottom-3 left-3 w-1 h-1 bg-white rounded-full animate-pulse" style={{ animationDelay: '0.5s' }} />
          <div className="absolute top-1/2 left-1 w-1.5 h-1.5 bg-white rounded-full animate-ping opacity-40" style={{ animationDelay: '1s' }} />
        </>
      )}
    </div>
  );
}

export default NumberBadge;
