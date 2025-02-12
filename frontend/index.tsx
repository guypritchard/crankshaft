import * as React from 'react';
import { createRoot } from 'react-dom/client'
import 'nes.css/css/nes.min.css';

import { App } from './components/App';

const root = createRoot(document.getElementById('root'))
root.render(<App />);
