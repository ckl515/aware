import { useEffect, useState } from "react";
import Button from "../components/Button";

interface Props {
  onRunAxe: () => void;
  onTestMode: () => void;
  onWelcome: () => void;
}

const FrontPage = ({ onRunAxe, onTestMode, onWelcome }: Props) => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Trigger animation after component mounts
    const timer = setTimeout(() => setIsVisible(true), 100);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="flex flex-col items-center justify-center min-h-full p-6 bg-gradient-to-br from-indigo-50 via-blue-50 to-purple-50 relative overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-10 left-10 w-32 h-32 bg-blue-200/30 rounded-full animate-float" />
        <div className="absolute top-32 right-16 w-24 h-24 bg-purple-200/30 rounded-full animate-float" style={{ animationDelay: '1s' }} />
        <div className="absolute bottom-20 left-20 w-28 h-28 bg-indigo-200/30 rounded-full animate-float" style={{ animationDelay: '2s' }} />
        <div className="absolute bottom-32 right-12 w-20 h-20 bg-pink-200/30 rounded-full animate-float" style={{ animationDelay: '0.5s' }} />
      </div>

      <div className={`
        bg-white/80 backdrop-blur-sm rounded-2xl shadow-2xl p-8 max-w-sm w-full
        transition-all-smooth transform-gpu
        ${isVisible ? 'animate-fade-in-scale' : 'opacity-0 scale-95'}
        hover-lift border border-white/20
      `}>
        {/* Header with logo animation */}
        <div className={`
          text-center mb-8 
          ${isVisible ? 'animate-fade-in-up' : 'opacity-0 translate-y-4'}
        `}>
          <div className="relative inline-block">
            <h1 className="text-3xl font-bold text-gradient mb-2 animate-glow">
              AWARE
            </h1>
            <div className="absolute -top-1 -right-1 w-3 h-3 bg-blue-500 rounded-full animate-pulse" />
          </div>
          <p className="text-gray-600 text-sm font-medium">Accessibility Testing Tool</p>
          <div className="w-16 h-1 bg-gradient-to-r from-blue-500 to-purple-600 mx-auto mt-3 rounded-full" />
        </div>
        
        {/* Animated buttons */}
        <div className="space-y-4">
          <div className={`${isVisible ? 'animate-slide-in-right stagger-1' : 'opacity-0 translate-x-8'}`}>
            <Button
              colour={"bg-gradient-to-r from-violet-600 to-purple-600"}
              hoverColour={"hover:from-violet-700 hover:to-purple-700"}
              text={"👋 Welcome & Guide"}
              textColour={"text-white"}
              onClick={onWelcome}
              variant="gradient"
            />
          </div>
          
          <div className={`${isVisible ? 'animate-slide-in-right stagger-2' : 'opacity-0 translate-x-8'}`}>
            <Button
              colour={"bg-gradient-to-r from-blue-600 to-cyan-600"}
              hoverColour={"hover:from-blue-700 hover:to-cyan-700"}
              text={"🔍 Run Test"}
              textColour={"text-white"}
              onClick={onRunAxe}
              variant="gradient"
            />
          </div>
          
          <div className={`${isVisible ? 'animate-slide-in-right stagger-3' : 'opacity-0 translate-x-8'}`}>
            <Button
              colour={"bg-gradient-to-r from-amber-500 to-orange-500"}
              hoverColour={"hover:from-amber-600 hover:to-orange-600"}
              text={"🧪 Test Mode (Demo)"}
              textColour={"text-white"}
              onClick={onTestMode}
              variant="gradient"
            />
          </div>
        </div>
        
        {/* Footer with animation */}
        <div className={`
          mt-6 pt-6 border-t border-gray-100/50 
          ${isVisible ? 'animate-fade-in-up stagger-4' : 'opacity-0 translate-y-4'}
        `}>
          <div className="flex items-center justify-center gap-2 mb-2">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            <p className="text-xs text-gray-500 text-center font-medium">
              Ready to scan
            </p>
          </div>
          <p className="text-xs text-gray-400 text-center">
            Start with the Welcome guide if you're new to accessibility testing
          </p>
        </div>

        {/* Subtle accent elements */}
        <div className="absolute top-4 right-4 w-2 h-2 bg-purple-400 rounded-full animate-ping" />
        <div className="absolute bottom-4 left-4 w-1 h-1 bg-blue-400 rounded-full animate-pulse" />
      </div>

      {/* Footer branding */}
      <div className={`
        mt-6 text-center 
        ${isVisible ? 'animate-fade-in-up stagger-5' : 'opacity-0 translate-y-4'}
      `}>
        <p className="text-xs text-gray-400 font-medium">
          Powered by <span className="text-blue-600 font-semibold">axe-core</span>
        </p>
      </div>
    </div>
  );
};

export default FrontPage;
