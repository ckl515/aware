import Button from "../components/Button";

interface Props {
  onRunAxe: () => void;
  onTestMode: () => void;
  onWelcome: () => void;
}

const FrontPage = ({ onRunAxe, onTestMode, onWelcome }: Props) => {
  return (
    <div className="flex flex-col items-center justify-center min-h-full p-6 bg-gradient-to-br from-gray-50 to-blue-50">
      <div className="bg-white rounded-xl shadow-xl p-8 max-w-sm w-full">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-gray-800 mb-2">Aware</h1>
          <p className="text-gray-600 text-sm">Accessibility Testing Tool</p>
          <div className="w-12 h-1 bg-blue-500 mx-auto mt-3 rounded"></div>
        </div>
        
        <div className="space-y-4">
          <Button
            colour={"bg-blue-600"}
            hoverColour={"hover:bg-blue-700"}
            text={"👋 Welcome & Guide"}
            textColour={"text-white"}
            onClick={onWelcome}
          />
          <Button
            colour={"bg-sky-700"}
            hoverColour={"hover:bg-sky-600"}
            text={"🔍 Run Test"}
            textColour={"text-white"}
            onClick={onRunAxe}
          />
          <Button
            colour={"bg-orange-600"}
            hoverColour={"hover:bg-orange-500"}
            text={"🧪 Test Mode (Demo)"}
            textColour={"text-white"}
            onClick={onTestMode}
          />
        </div>
        
        <div className="mt-6 pt-6 border-t border-gray-100">
          <p className="text-xs text-gray-500 text-center">
            Start with the Welcome guide if you're new to accessibility testing
          </p>
        </div>
      </div>
    </div>
  );
};

export default FrontPage;
