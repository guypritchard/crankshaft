import React from 'react';
import useFetch from 'react-fetch-hook';
import { ServerState } from './types';
import { Version } from './Version';

export const Server: React.FC = () => {
    const { isLoading, data } = useFetch<ServerState>('http://localhost:5000/server');

    return isLoading ? (
        <div>Loading...</div>
    ) : (
        <section className="nes-container is-rounded is-dark">
            <h2>Hosted Server</h2>
            <div>{data.pid}</div>
            <div>
                <ul>
                    {data.stdout.map((l) => (
                        <li key={l}>{l}</li>
                    ))}
                </ul>
            </div>
            <Version version={data.version} />
        </section>
    );
};
