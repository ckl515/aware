import type { ReactNode } from "react";

interface Props {
  colour: string;
  hoverColour: string;
  icon?: ReactNode;
  text: string;
  textColour: string;
  onClick: () => void;
  disabled?: boolean;
  variant?: 'primary' | 'secondary' | 'gradient';
  size?: 'sm' | 'md' | 'lg';
}

function Button({
  colour,
  hoverColour,
  icon,
  text,
  textColour,
  onClick,
  disabled = false,
  variant = 'primary',
  size = 'md',
}: Props) {
  const sizeClasses = {
    sm: 'py-2 px-3 text-xs',
    md: 'py-3 px-4 text-sm',
    lg: 'py-4 px-6 text-base'
  };

  const variantClasses = {
    primary: `${colour} ${disabled ? '' : hoverColour}`,
    secondary: 'bg-white border-2 border-gray-200 hover:border-blue-300 hover:bg-blue-50',
    gradient: disabled ? 'bg-gray-400' : `${colour} ${disabled ? '' : hoverColour}`
  };

  return (
    <button
      className={`
        ${variantClasses[variant]}
        ${sizeClasses[size]}
        transition-all-smooth
        rounded-lg 
        flex flex-row gap-2 items-center justify-center 
        w-full font-semibold 
        ${disabled 
          ? 'cursor-not-allowed opacity-50' 
          : 'cursor-pointer hover-lift btn-press transform-gpu'
        }
        ${disabled ? '' : 'hover:shadow-lg active:shadow-sm'}
        ${variant === 'gradient' ? 'text-white' : ''}
        focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
        relative overflow-hidden
        group
      `}
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
    >
      {/* Shimmer effect on hover */}
      {!disabled && (
        <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000 bg-gradient-to-r from-transparent via-white/20 to-transparent" />
      )}
      
      {/* Icon with animation */}
      {icon && (
        <span className={`transition-transform-smooth ${disabled ? '' : 'group-hover:scale-110'}`}>
          {icon}
        </span>
      )}
      
      {/* Text */}
      <p className={`${textColour} transition-colors-smooth`}>
        {text}
      </p>
      
      {/* Loading indicator when disabled (optional enhancement) */}
      {disabled && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin opacity-50" />
        </div>
      )}
    </button>
  );
}

export default Button;
