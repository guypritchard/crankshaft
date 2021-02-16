import React from 'react';
import { CurrentBedrockRelease } from './CurrentBedrockRelease';
import { Server } from './Server';
import '../styles.scss';
import { Header } from './Header';

export const App: React.FC = () => (
    <>
        <div className="container">
            <Header />
            {/* <CurrentBedrockRelease /> */}
            <Server />
        </div>
    </>
);
