import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Status } from './Status';
import { MinecraftEdition, ServerState, ServerStatus, ServerVersion, versionEqual } from '../../interfaces/types';
import { Version } from './Version';
import { Spinner } from './Spinner';
import { Mode } from './Mode';
import { Port } from './Port';
import { WorldUpload } from './WorldUpload';

export interface ServerProps {
    installers: ServerVersion[];
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
    const [pendingOnlineMode, setPendingOnlineMode] = useState<boolean | null>(null);
    const [pendingContentLog, setPendingContentLog] = useState<boolean | null>(null);
    const isBedrock = serverState?.edition === MinecraftEdition.Bedrock;

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
                            javaConfig: responseState?.javaConfig ?? previousState.javaConfig,
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
            const response = await fetch(`/servers/${props.serverId}/stdout`);
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
                    (updatedState.edition === MinecraftEdition.Bedrock &&
                        (updatedState.bedrockConfig == null ||
                            !updatedState.bedrockConfig.world ||
                            (updatedState.bedrockConfig.worlds?.length ?? 0) === 0));

                if (needsHydration) {
                    await hydrateServerState();
                } else if (
                    updatedState?.edition === MinecraftEdition.Bedrock &&
                    currentWorld == null &&
                    updatedState?.bedrockConfig?.world
                ) {
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
        if (serverState?.edition !== MinecraftEdition.Bedrock) {
            return;
        }

        try {
            setIsProcessing(true);
            const response = await fetch(`/servers/${props.serverId}/world/${worldName}`, { method: 'PUT' });
            if (response.ok) {
                const state = await response.json();

                setServerState(state);
                setCurrentWorld(state.bedrockConfig?.world);
                setUploadError(null);
            }
        } finally {
            setIsProcessing(false);
        }
    };

    const uploadWorld = useCallback(
        async (file: File): Promise<void> => {
            if (!file.name.toLowerCase().endsWith('.mcworld')) {
                setUploadError('Only .mcworld files are supported.');
                return;
            }

            if (serverState?.edition !== MinecraftEdition.Bedrock) {
                setUploadError('World uploads are only supported for Bedrock servers.');
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

    useEffect(() => {
        if (serverState?.bedrockConfig != null || serverState?.javaConfig != null) {
            const online = serverState?.bedrockConfig?.onlineMode ?? serverState?.javaConfig?.onlineMode ?? null;
            if (pendingOnlineMode == null) {
                setPendingOnlineMode(online);
            }
        }

        if (serverState?.bedrockConfig != null) {
            const contentLog = serverState.bedrockConfig.contentLogConsoleOutputEnabled ?? null;
            if (pendingContentLog == null) {
                setPendingContentLog(contentLog);
            }
        }
    }, [serverState, pendingOnlineMode, pendingContentLog]);

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

    const applySettings = useCallback(async (): Promise<void> => {
        if (serverState == null) {
            return;
        }

        const currentOnlineMode = serverState?.bedrockConfig?.onlineMode ?? serverState?.javaConfig?.onlineMode ?? true;
        const currentContentLog = serverState?.bedrockConfig?.contentLogConsoleOutputEnabled ?? true;

        const desiredOnline = pendingOnlineMode ?? currentOnlineMode;
        const desiredContentLog = pendingContentLog ?? currentContentLog;

        const payload: Record<string, boolean> = {};
        if (desiredOnline !== currentOnlineMode) {
            payload.onlineMode = desiredOnline;
        }

        if (isBedrock && desiredContentLog !== currentContentLog) {
            payload.contentLogConsoleOutputEnabled = desiredContentLog;
        }

        if (Object.keys(payload).length === 0) {
            return;
        }

        try {
            setIsProcessing(true);
            const response = await fetch(`/servers/${props.serverId}/settings`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(payload),
            });

            if (!response.ok) {
                const message = await response.text();
                throw new Error(message || `Unable to update settings (${response.status})`);
            }

            const updatedState: ServerState = await response.json();
            setServerState(updatedState);
            setPendingOnlineMode(
                updatedState?.bedrockConfig?.onlineMode ?? updatedState?.javaConfig?.onlineMode ?? null,
            );
            if (updatedState?.bedrockConfig != null) {
                setPendingContentLog(updatedState.bedrockConfig.contentLogConsoleOutputEnabled ?? null);
            }
            if (updatedState?.bedrockConfig?.world) {
                setCurrentWorld(updatedState.bedrockConfig.world);
            }
            await hydrateServerState();
            props.onStateChange?.(updatedState);
        } catch (error) {
            console.error(`Unable to update settings for server ${props.serverId}`, error);
        } finally {
            setIsProcessing(false);
        }
    }, [serverState, pendingOnlineMode, pendingContentLog, isBedrock, props.serverId, hydrateServerState, props]);

    const hasConfig = serverState?.bedrockConfig != null || serverState?.javaConfig != null;
    const showUpdateButton =
        isBedrock && serverState?.version != null && versionEqual(props.installers, serverState.version) === false;
    const worldOptions = serverState?.bedrockConfig?.worlds ?? [];
    const canUploadWorld = serverState?.state === ServerStatus.Stopped && isBedrock;
    const currentOnlineMode = serverState?.bedrockConfig?.onlineMode ?? serverState?.javaConfig?.onlineMode ?? true;
    const currentContentLog = serverState?.bedrockConfig?.contentLogConsoleOutputEnabled ?? true;
    const isBusy = isProcessing || isStarting || isDeleting || isUploading;
    const port = (isBedrock ? serverState?.bedrockConfig?.port : serverState?.javaConfig?.port) ?? 0;
    const onlineBadgeClass = currentOnlineMode ? 'is-success' : 'is-warning';
    const pendingOnlineValue = pendingOnlineMode ?? currentOnlineMode;
    const pendingContentLogValue = pendingContentLog ?? currentContentLog;
    const hasSettingChanges =
        pendingOnlineValue !== currentOnlineMode || (isBedrock && pendingContentLogValue !== currentContentLog);

    return isLoading ? (
        <div>Loading...</div>
    ) : (
        <section className="nes-container is-rounded is-dark">
            <h1>
                Hosted Server <Status status={serverState.state}></Status>
                <Version version={serverState.version} edition={serverState.edition} />
                {isBedrock ? (
                    <Mode mode={serverState.bedrockConfig?.mode} />
                ) : (
                    <Mode mode={serverState.javaConfig?.mode ?? 'survival'} />
                )}
                <Port port={port} />
            </h1>

            {hasConfig && (
                <div className="crankshaft-online-toggle">
                    <label htmlFor={`online-mode-${props.serverId}`}>Server settings</label>
                    <div className="crankshaft-choice-group">
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                            <div className={`nes-badge ${onlineBadgeClass}`}>
                                <span>{currentOnlineMode ? 'Online' : 'Offline'}</span>
                            </div>
                            <label
                                htmlFor={`online-mode-${props.serverId}`}
                                style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                            >
                                <input
                                    id={`online-mode-${props.serverId}`}
                                    type="checkbox"
                                    className="nes-checkbox"
                                    checked={pendingOnlineValue}
                                    onChange={(e) => setPendingOnlineMode(e.target.checked)}
                                    disabled={isBusy}
                                />
                                <span>{pendingOnlineValue ? 'Online (default)' : 'Offline (no account required)'}</span>
                            </label>
                        </div>

                        {isBedrock && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                                <div className="nes-badge is-primary">
                                    <span>Content Log</span>
                                </div>
                                <label
                                    htmlFor={`content-log-${props.serverId}`}
                                    style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                                >
                                    <input
                                        id={`content-log-${props.serverId}`}
                                        type="checkbox"
                                        className="nes-checkbox"
                                        checked={pendingContentLogValue}
                                        onChange={(e) => setPendingContentLog(e.target.checked)}
                                        disabled={isBusy}
                                    />
                                    <span>
                                        {pendingContentLogValue
                                            ? 'Console content log enabled'
                                            : 'Console content log disabled'}
                                    </span>
                                </label>
                            </div>
                        )}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginTop: '0.5rem' }}>
                        <button
                            type="button"
                            className={`nes-btn is-primary ${isBusy || !hasSettingChanges ? 'is-disabled' : ''}`}
                            onClick={() => void applySettings()}
                            disabled={isBusy || !hasSettingChanges}
                        >
                            Apply settings
                        </button>
                        <p className="nes-text is-warning" style={{ margin: 0 }}>
                            Applying will restart the server to write settings.
                        </p>
                    </div>
                </div>
            )}

            {isBedrock && (
                <>
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
                </>
            )}
            <div>
                <textarea
                    ref={logsRef}
                    className="nes-textarea is-dark crankshaft-status"
                    readOnly={true}
                    value={serverState.stdout.join('\n')}
                />

                {isBedrock && (
                    <WorldUpload
                        canUpload={canUploadWorld}
                        isUploading={isUploading}
                        onUpload={(file) => void uploadWorld(file)}
                        error={uploadError}
                    />
                )}

                {(isProcessing || isStarting || isDeleting || isUploading || !isConnected) && <Spinner></Spinner>}

                {serverState.state == ServerStatus.Running ? (
                    <>
                        <button type="button" className="nes-btn is-error" onClick={() => command('stop')}>
                            Stop
                        </button>
                        {isBedrock && (
                            <button type="button" className="nes-btn is-default" onClick={() => command('backup')}>
                                Backup
                            </button>
                        )}
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
                    </button>
                )}
            </div>
        </section>
    );
};
