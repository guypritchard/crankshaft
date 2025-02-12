import React from 'react';
import { Server } from './Server';
import { Header } from './Header';
import { BedrockVersion, ServerState } from '../../interfaces/types';
import useFetch from 'react-fetch-hook';
import { Tab, TabList, TabPanel, Tabs } from 'react-tabs';
import '../styles.scss';

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
                    <Tabs>
                        <TabList>
                            { servers.data?.map((s: ServerState, index: number) => <Tab  className="nes-container is-rounded is-dark" key={index}>{index}</Tab> ) }
                        </TabList>
                            { servers.data?.map((s: ServerState, index: number) => <TabPanel key={index}><Server key={index} installers={version.data} index={index} /></TabPanel> ) }
                    </Tabs>
                )}
            </div>
        </>
    );
};
