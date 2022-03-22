import React, { useEffect, useState } from 'react';
import { Status } from './Status';
import { BedrockVersion, ServerState, ServerStatus, versionEqual } from '../../interfaces/types';
import { Version } from './Version';
import { Spinner } from './Spinner';

export interface ServerProps {
    installers: BedrockVersion[];
    index: number;
}

const STDOUT_REFRESH_MS = 2000;

export const Server: React.FC<ServerProps> = (props) => {
    const [state, setState] = useState<number>(0);
    const [serverState, setServerState] = useState<ServerState>();
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [isProcessing, setIsProcessing] = useState<boolean>(false);
    const [isStarting, setIsStarting] = useState<boolean>(false);

    const refreshStdOut = async (): Promise<void> => {
        const response = await fetch(`/servers/${props.index}/stdout`);
        if (response.ok) {
            const stdout = await response.json();

            setServerState({ ...serverState, stdout });

            if (isStarting) {
                setIsStarting(false);
            }
        }
    };

    useEffect(() => {
        const interval = setInterval(async () => {
            refreshStdOut();
        }, STDOUT_REFRESH_MS);
        return () => clearInterval(interval);
    }, [isLoading, isProcessing]);

    useEffect(() => {
        const fetchData = async () => {
            setIsLoading(true);
            const response = await fetch(`/servers/${props.index}`);
            if (response.ok) {
                const responseState = await response.json();
                setServerState(responseState);
                if (responseState?.state !== state) {
                    setState(responseState.state);
                }
            } else {
                console.error(`${response.status}:${response.statusText}`);
            }

            setIsLoading(false);
        };

        fetchData();
    }, [state]);

    const command = async (command: string) => {
        try {
            setIsStarting(command === 'start');
            setIsProcessing(true);
            const response = await fetch(`/servers/${props.index}/commands/${command}`, { method: 'POST' });
            if (response.ok) {
                setServerState(await response.json());
            }
        } finally {
            setIsProcessing(false);
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
                <select value={serverState?.bedrockConfig.world} id="world_select">
                    {serverState?.bedrockConfig.worlds.map((w) => (
                        <option className="nes-pointer" key={w}>
                            {w}
                        </option>
                    ))}
                </select>
            </div>
            <div>
                <div className="nes-container is-rounded is-dark crankshaft-status">
                    {serverState?.stdout.length > 10 && <div>...</div>}
                    {serverState?.stdout.slice(Math.max(serverState.stdout.length - 10, 0)).map((l) => (
                        <div key={l}>{l}</div>
                    ))}
                    {(isProcessing || isStarting) && <Spinner></Spinner>}
                </div>

                {serverState.state == ServerStatus.Running ? (
                    <>
                        <button type="button" className="nes-btn is-error" onClick={() => command('stop')}>
                            Stop
                        </button>
                        <button type="button" className="nes-btn is-default" onClick={() => command('backup')}>
                            Backup
                        </button>
                    </>
                ) : (
                    <button type="button" className="nes-btn is-success" onClick={() => command('start')}>
                        Start
                    </button>
                )}

                {versionEqual(props.installers, serverState.version) === false && (
                    <button type="button" className="nes-btn is-primary" onClick={() => command('update')}>
                        Update
                    </button>
                )}
            </div>
        </section>
    );
};
