import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { StoreProvider } from './context/StoreContext';
import Router from './Router';

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <StoreProvider>
          <Router />
        </StoreProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
