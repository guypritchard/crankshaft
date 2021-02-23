import React, { useEffect, useState } from 'react';
import { ServerState } from './types';
import { Version } from './Version';

export const Server: React.FC = () => {
    const [state, setState] = useState<number>(0);
    const [serverState, setServerState] = useState<ServerState>();
    const [isLoading, setIsLoading] = useState<boolean>(true);

    useEffect(() => {
        const fetchData = async () => {
            setIsLoading(true);
            const response = await fetch('/server');
            if (response.ok) {
                const responseState = await response.json();
                setServerState(responseState);
                if (responseState?.state !== state) {
                    setState(responseState.state);
                }
            }
            setIsLoading(false);
        };

        fetchData();
    }, [state]);

    const command = async (command: string) => {
        const response = await fetch(`/server/commands/${command}`, { method: 'POST' });
        if (response.ok) {
            setServerState(await response.json());
        }
    };

    return isLoading ? (
        <div>Loading...</div>
    ) : (
        <section className="nes-container is-rounded is-dark">
            <h1>
                Hosted Server <Version version={serverState.version} />
            </h1>
            <div>{serverState.pid}</div>
            <div>
                <ul>
                    {serverState.stdout.map((l) => (
                        <li key={l}>{l}</li>
                    ))}
                </ul>
                <button type="button" className="nes-btn is-error" onClick={() => command('stop')}>
                    Stop
                </button>
                <button type="button" className="nes-btn is-success" onClick={() => command('start')}>
                    Start
                </button>
                <button type="button" className="nes-btn is-primary" onClick={() => command('update')}>
                    Update
                </button>
            </div>
        </section>
    );
};
