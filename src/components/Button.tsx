import type { ReactNode } from "react";

interface Props {
  colour: string;
  hoverColour: string;
  icon?: ReactNode;
  text: string;
  textColour: string;
  onClick: () => void;
  disabled?: boolean;
}

function Button({
  colour,
  hoverColour,
  icon,
  text,
  textColour,
  onClick,
  disabled = false,
}: Props) {
  return (
    <button
      className={`${colour} transition-all duration-200 ${disabled ? '' : hoverColour} py-3 px-4 text-sm rounded-lg flex flex-row gap-2 items-center justify-center ${disabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer hover:shadow-md'} w-full font-semibold shadow-sm`}
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
    >
      {icon}
      <p className={`${textColour}`}>{text}</p>
    </button>
  );
}

export default Button;
