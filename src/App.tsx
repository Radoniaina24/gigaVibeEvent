import { AppProviders } from './app/providers/AppProviders';
import { AppRouter } from './app/router/router';
import { assertEnv } from './app/config/env';

assertEnv();

function App() {
  return (
    <AppProviders>
      <AppRouter />
    </AppProviders>
  );
}

export default App;
