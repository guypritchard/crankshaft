import React from 'react';
import { Server } from './Server';
import '../styles.scss';
import { Header } from './Header';
import { BedrockVersion, ServerState } from '../../interfaces/types';
import useFetch from 'react-fetch-hook';

export const App: React.FC = () => {
    const version = useFetch<BedrockVersion[]>('/bedrock/versions');
    const servers = useFetch<ServerState[]>('/servers');

    return (
        <>
            <div className="container">
                <Header />
                {(version.isLoading || servers.isLoading) ? (
                    <div className="nes-container is-rounded is-dark">
                        <p>Loading...</p>
                    </div>
                ) : (
                    <>
                    {servers.data?.map((s: ServerState, index: number) => <Server key={index} installers={version.data} index={index} /> )}
                    </>
                )}
            </div>
        </>
    );
};
