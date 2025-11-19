import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Status } from './Status';
import { BedrockVersion, ServerState, ServerStatus, versionEqual } from '../../interfaces/types';
import { Version } from './Version';
import { Spinner } from './Spinner';
import { Mode } from './Mode';
import { Port } from './Port';
import { WorldUpload } from './WorldUpload';

export interface ServerProps {
    installers: BedrockVersion[];
    serverId: number;
    onDelete: (serverId: number) => Promise<void>;
    onStateChange?: (state: ServerState) => void;
}

const STDOUT_REFRESH_MS = 2000;

export const Server: React.FC<ServerProps> = (props) => {
    const [serverState, setServerState] = useState<ServerState>();
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [isProcessing, setIsProcessing] = useState<boolean>(false);
    const [isDeleting, setIsDeleting] = useState<boolean>(false);
    const [isStarting, setIsStarting] = useState<boolean>(false);
    const [isUploading, setIsUploading] = useState<boolean>(false);
    const [uploadError, setUploadError] = useState<string | null>(null);
    const [currentWorld, setCurrentWorld] = useState<string>();
    const [isConnected, setIsConnected] = useState<boolean>();

    const logsRef = useRef<HTMLTextAreaElement | null>(null);

    const hydrateServerState = useCallback(
        async (withLoading: boolean = false): Promise<void> => {
            if (withLoading) {
                setIsLoading(true);
            }

            try {
                const response = await fetch(`/servers/${props.serverId}`);
                if (response.ok) {
                    const responseState: ServerState = await response.json();
                    setServerState((previousState) => {
                        if (previousState == null) {
                            return responseState;
                        }

                        return {
                            ...previousState,
                            ...responseState,
                            bedrockConfig: responseState?.bedrockConfig ?? previousState.bedrockConfig,
                        };
                    });

                    if (responseState?.bedrockConfig?.world) {
                        setCurrentWorld(responseState.bedrockConfig.world);
                    }
                    logsRef?.current?.scrollIntoView({ behavior: 'smooth' });
                } else {
                    console.error(`${response.status}:${response.statusText}`);
                }
            } finally {
                if (withLoading) {
                    setIsLoading(false);
                }
            }
        },
        [props.serverId],
    );

    const refreshStdOut = useCallback(async (): Promise<void> => {
        try {
            const response = await fetch(`/servers/${props.serverId}/stdout`/*, {signal: AbortSignal.timeout(5000)}*/);
            if (response.ok) {
                setIsConnected(true);

                const stdout = await response.json();

                let updatedState: ServerState | undefined;
                setServerState((previousState) => {
                    if (previousState == null) {
                        return previousState;
                    }

                    updatedState = { ...previousState, stdout };
                    return updatedState;
                });

                const needsHydration =
                    updatedState == null ||
                    updatedState.bedrockConfig == null ||
                    !updatedState.bedrockConfig.world ||
                    (updatedState.bedrockConfig.worlds?.length ?? 0) === 0;

                if (needsHydration) {
                    await hydrateServerState();
                } else if (currentWorld == null && updatedState?.bedrockConfig?.world) {
                    setCurrentWorld(updatedState.bedrockConfig.world);
                }

                if (isStarting) {
                    setIsStarting(false);
                }
            } else {
                setIsConnected(false);
            }
        } catch {
            setIsConnected(false);
        }
    }, [props.serverId, hydrateServerState, currentWorld, isStarting]);

    const setWorld = async (worldName: string): Promise<void> => {
        try {
            console.log("Changing world to: " + worldName);
            setIsProcessing(true);
            const response = await fetch(`/servers/${props.serverId}/world/${worldName}`, { method: 'PUT' });
            if (response.ok) {
                const state = await response.json();

                setServerState(state);
                setCurrentWorld(state.bedrockConfig.world);
                setUploadError(null);
            }
        } finally {
            setIsProcessing(false);
        }
    }

    const uploadWorld = useCallback(
        async (file: File): Promise<void> => {
            if (!file.name.toLowerCase().endsWith('.mcworld')) {
                setUploadError('Only .mcworld files are supported.');
                return;
            }

            if (serverState?.state !== ServerStatus.Stopped) {
                setUploadError('Stop the server before importing a world.');
                return;
            }

            setUploadError(null);
            setIsUploading(true);

            try {
                const response = await fetch(`/servers/${props.serverId}/worlds/upload`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/octet-stream',
                        'X-World-Filename': file.name,
                    },
                    body: file,
                });

                if (!response.ok) {
                    const message = await response.text();
                    throw new Error(message || `Unable to import world (${response.status})`);
                }

                const updatedState: ServerState = await response.json();
                setServerState(updatedState);
                if (updatedState?.bedrockConfig?.world) {
                    setCurrentWorld(updatedState.bedrockConfig.world);
                }
                setUploadError(null);
            } catch (error) {
                const message = error instanceof Error ? error.message : 'Unable to import world.';
                setUploadError(message);
            } finally {
                setIsUploading(false);
            }
        },
        [props.serverId, serverState],
    );

    useEffect(() => {
        const interval = setInterval(async () => {
            refreshStdOut();
        }, STDOUT_REFRESH_MS);
        return () => clearInterval(interval);
    }, [refreshStdOut]);

    useEffect(() => {
        hydrateServerState(true);
    }, [hydrateServerState]);

    const command = async (command: string): Promise<void> => {
        try {
            setIsStarting(command === 'start');
            setIsProcessing(true);
            const response = await fetch(`/servers/${props.serverId}/commands/${command}`, { method: 'POST' });
            if (response.ok) {
                const updated = await response.json();
                setServerState(updated);
                props.onStateChange?.(updated);
            }
        } finally {
            setIsProcessing(false);
        }
    };

    const deleteServer = async (): Promise<void> => {
        if (serverState?.state !== ServerStatus.Stopped) {
            return;
        }

        try {
            setIsDeleting(true);
            await props.onDelete(props.serverId);
        } catch (error) {
            console.error(`Unable to delete server ${props.serverId}`, error);
        } finally {
            setIsDeleting(false);
        }
    };

    const showUpdateButton =
        serverState?.version != null && versionEqual(props.installers, serverState.version) === false;
    const worldOptions = serverState?.bedrockConfig?.worlds ?? [];
    const canUploadWorld = serverState?.state === ServerStatus.Stopped;

    return isLoading ? (
        <div>Loading...</div>
    ) : (
        <section className="nes-container is-rounded is-dark">
            <h1>
                Hosted Server <Status status={serverState.state}></Status>
                <Version version={serverState.version} />
                <Mode mode={serverState.bedrockConfig?.mode} />
                <Port port={serverState.bedrockConfig.port} />
            </h1>

            <label htmlFor="world_select">World:</label>
            <div className="nes-select is-dark">
                <select
                    id="world_select"
                    value={currentWorld ?? ''}
                    onChange={(event: React.ChangeEvent<HTMLSelectElement>) => setWorld(event.target.value)}
                    disabled={worldOptions.length === 0}
                >
                    {worldOptions.length === 0 ? (
                        <option value="">No worlds available</option>
                    ) : (
                        worldOptions.map((w) => (
                            <option className="nes-pointer" key={w}>
                                {w}
                            </option>
                        ))
                    )}
                </select>
            </div>
            <div>
                <textarea
                    ref={logsRef}
                    className="nes-textarea is-dark crankshaft-status"
                    readOnly={true}
                    value={serverState.stdout.join("\n")} />

                 <WorldUpload
                    canUpload={canUploadWorld}
                    isUploading={isUploading}
                    serverState={serverState?.state}
                    onUpload={(file) => void uploadWorld(file)}
                    error={uploadError}                 />

                {(isProcessing || isStarting || isDeleting || isUploading || !isConnected) && <Spinner></Spinner>}

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

                {showUpdateButton && (
                    <button type="button" className="nes-btn is-primary" onClick={() => command('update')}>
                        Update
                    </button>
                )}

                {serverState.state === ServerStatus.Stopped && (
                    <button
                        type="button"
                        className="nes-btn is-error"
                        onClick={deleteServer}
                        disabled={serverState.state !== ServerStatus.Stopped}
                    >
                        Delete
                    </button>)}
            </div>
        </section>
    );
};
