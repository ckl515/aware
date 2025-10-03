import BadAccessibilityComponent from './components/BadAccessibilityComponent';
import './App.css';

function App() {
  return (
    <div className="App">
      {/* Missing title in document head - will need to be added separately */}
      {/* Missing main landmark wrapper - intentional violation */}
      <BadAccessibilityComponent />
    </div>
  );
}

export default App;