import React from 'react';
import useFetch from 'react-fetch-hook';
import { ServerState } from './types';
import { Version } from './Version';

export const Server: React.FC = () => {
    const { isLoading, data } = useFetch<ServerState>('/server');

    return isLoading ? (
        <div>Loading...</div>
    ) : (
        <section className="nes-container is-rounded is-dark">
            <h1>
                Hosted Server <Version version={data.version} />
            </h1>
            <div>{data.pid}</div>
            <div>
                <ul>
                    {data.stdout.map((l) => (
                        <li key={l}>{l}</li>
                    ))}
                </ul>
            </div>
        </section>
    );
};
