import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

function Root() {
  return <div>Personal OS</div>;
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <Root />
  </StrictMode>,
);
