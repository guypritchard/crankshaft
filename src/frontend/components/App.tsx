import React from 'react';
import { CurrentBedrockRelease } from './CurrentBedrockRelease';
import { Server } from './Server';
import '../styles.scss';
import { Header } from './Header';

export const App: React.FC = () => (
    <>
        <div>
            <Header />
        </div>

        <div className="container">
            <CurrentBedrockRelease />
            <Server />
        </div>
    </>
);
