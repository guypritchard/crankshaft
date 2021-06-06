import React from 'react';
import { Server } from './Server';
import '../styles.scss';
import { Header } from './Header';
import { BedrockVersion } from '../../../interfaces/types';
import useFetch from 'react-fetch-hook';

export const App: React.FC = () => {
    const { isLoading, data } = useFetch<BedrockVersion[]>('/bedrock/versions');
    return (
        <>
            <div className="container">
                <Header />
                {isLoading ? (
                    <div className="nes-container is-rounded is-dark">
                        <p>Loading...</p>
                    </div>
                ) : (
                    <Server installers={data} index={0} />
                )}
            </div>
        </>
    );
};
