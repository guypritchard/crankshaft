import React, { useEffect, useState } from 'react';
import { Status } from './Status';
import { ServerState, ServerStatus } from './types';
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
                Hosted Server <Status status={serverState.state}></Status> <Version version={serverState.version} />
            </h1>

            <label htmlFor="world_select">World:</label>
            <div className="nes-select is-dark">
                <select value={serverState.bedrockConfig.worldName} id="world_select">
                    {serverState.bedrockConfig.serverWorlds.map((w) => (
                        <option className="nes-pointer" key={w}>
                            {w}
                        </option>
                    ))}
                </select>
            </div>
            <div>
                <ul>
                    {serverState.stdout.map((l) => (
                        <li key={l}>{l}</li>
                    ))}
                </ul>

                {serverState.state == ServerStatus.Running ? (
                    <button type="button" className="nes-btn is-error" onClick={() => command('stop')}>
                        Stop
                    </button>
                ) : (
                    <button type="button" className="nes-btn is-success" onClick={() => command('start')}>
                        Start
                    </button>
                )}

                <button type="button" className="nes-btn is-primary" onClick={() => command('update')}>
                    Update
                </button>
            </div>
        </section>
    );
};
